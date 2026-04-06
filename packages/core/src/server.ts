import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import type { FastifyInstance } from 'fastify';
import type { ServerConfig, Adapter, TaskStatus } from './types.js';
import { EventBus } from './event-bus.js';
import { AgentManager } from './agent-manager.js';
import { TaskQueue } from './task-queue.js';
import { loadConfig } from './config.js';

export interface SnowbearServer {
  app: FastifyInstance;
  eventBus: EventBus;
  agentManager: AgentManager;
  taskQueue: TaskQueue;
  start(): Promise<string>;
  stop(): Promise<void>;
}

function resolveUiDist(): string | undefined {
  try {
    // Try to resolve @snowbear/ui's dist directory relative to this package
    const thisDir = dirname(fileURLToPath(import.meta.url));
    const candidate = resolve(thisDir, '../../ui/dist');
    if (existsSync(candidate)) return candidate;
  } catch {
    // not available
  }
  return undefined;
}

export async function createServer(configOrPath: ServerConfig | string): Promise<SnowbearServer> {
  const config =
    typeof configOrPath === 'string' ? await loadConfig(configOrPath) : configOrPath;

  const eventBus = new EventBus();
  const taskQueue = new TaskQueue(eventBus);
  const agentManager = new AgentManager(eventBus);
  const adapters: Adapter[] = [];

  const app = Fastify({ logger: true });
  await app.register(websocket);

  // Health check
  app.get('/health', async () => {
    const agents: Record<string, string> = {};
    for (const [id, instance] of agentManager.getAll()) {
      agents[id] = instance.status;
    }
    return { status: 'ok', agents };
  });

  // ── REST API routes for dashboard ──

  // List all agents
  app.get('/api/agents', async () => {
    const result: Record<string, unknown>[] = [];
    for (const [id, instance] of agentManager.getAll()) {
      result.push({
        id,
        name: instance.config.name,
        adapter: instance.config.adapter,
        status: instance.status,
        enabled: instance.config.enabled !== false,
        systemPrompt: instance.config.systemPrompt,
        llm: instance.config.llm
          ? { provider: instance.config.llm.provider, model: instance.config.llm.model }
          : null,
      });
    }
    return result;
  });

  // Get single agent
  app.get<{ Params: { id: string } }>('/api/agents/:id', async (request, reply) => {
    const all = agentManager.getAll();
    const instance = all.get(request.params.id);
    if (!instance) {
      return reply.code(404).send({ error: 'Agent not found' });
    }
    return {
      id: request.params.id,
      name: instance.config.name,
      adapter: instance.config.adapter,
      status: instance.status,
      enabled: instance.config.enabled !== false,
      systemPrompt: instance.config.systemPrompt,
      llm: instance.config.llm
        ? { provider: instance.config.llm.provider, model: instance.config.llm.model }
        : null,
    };
  });

  // Start/stop agent
  app.post<{ Params: { id: string }; Body: { action: string } }>(
    '/api/agents/:id',
    async (request, reply) => {
      const { action } = request.body ?? {};
      try {
        if (action === 'start') {
          await agentManager.start(request.params.id);
        } else if (action === 'stop') {
          await agentManager.stop(request.params.id);
        } else if (action === 'restart') {
          await agentManager.restart(request.params.id);
        } else {
          return reply.code(400).send({ error: 'Invalid action. Use start, stop, or restart.' });
        }
        return { ok: true, status: agentManager.getStatus(request.params.id) };
      } catch (err) {
        return reply.code(400).send({ error: err instanceof Error ? err.message : String(err) });
      }
    },
  );

  // List tasks (with optional status filter)
  app.get<{ Querystring: { status?: string } }>('/api/tasks', async (request) => {
    let tasks = taskQueue.listAll();
    if (request.query.status) {
      const statuses = request.query.status.split(',') as TaskStatus[];
      tasks = tasks.filter((t) => statuses.includes(t.status));
    }
    tasks.sort((a, b) => b.createdAt - a.createdAt);
    return tasks;
  });

  // Get single task with subtasks
  app.get<{ Params: { id: string } }>('/api/tasks/:id', async (request, reply) => {
    const task = taskQueue.getById(request.params.id);
    if (!task) {
      return reply.code(404).send({ error: 'Task not found' });
    }
    return { ...task, subtasks: taskQueue.getChildren(task.id) };
  });

  // Stats overview
  app.get('/api/stats', async () => {
    const tasks = taskQueue.listAll();
    const agents: Record<string, string> = {};
    for (const [id, instance] of agentManager.getAll()) {
      agents[id] = instance.status;
    }
    const agentCount = Object.keys(agents).length;
    const runningAgents = Object.values(agents).filter((s) => s === 'running').length;
    return {
      agents: { total: agentCount, running: runningAgents },
      tasks: {
        total: tasks.length,
        pending: tasks.filter((t) => t.status === 'pending').length,
        running: tasks.filter((t) => t.status === 'running').length,
        done: tasks.filter((t) => t.status === 'done').length,
        failed: tasks.filter((t) => t.status === 'failed').length,
      },
    };
  });

  // WebSocket endpoint for event streaming
  app.get('/ws', { websocket: true }, (socket) => {
    const handler = (message: { type: string; source: string; payload: unknown; timestamp: number }) => {
      if (socket.readyState === 1) {
        socket.send(JSON.stringify(message));
      }
    };

    // Forward all agent lifecycle events to WS clients
    eventBus.on('agent:starting', handler);
    eventBus.on('agent:started', handler);
    eventBus.on('agent:stopping', handler);
    eventBus.on('agent:stopped', handler);
    eventBus.on('message', handler);

    socket.on('message', (raw: Buffer | ArrayBuffer | Buffer[]) => {
      try {
        const data = JSON.parse(String(raw)) as Record<string, unknown>;
        if (typeof data.type === 'string' && typeof data.source === 'string') {
          void eventBus.emit({
            type: data.type as string,
            source: data.source as string,
            target: typeof data.target === 'string' ? data.target : undefined,
            payload: data.payload,
            timestamp: Date.now(),
          });
        }
      } catch {
        // ignore malformed messages
      }
    });

    socket.on('close', () => {
      eventBus.off('agent:starting', handler);
      eventBus.off('agent:started', handler);
      eventBus.off('agent:stopping', handler);
      eventBus.off('agent:stopped', handler);
      eventBus.off('message', handler);
    });
  });

  // Serve dashboard static files if the @snowbear/ui build output exists
  const uiDistDir = config.uiDir ?? resolveUiDist();
  if (uiDistDir && existsSync(uiDistDir)) {
    await app.register(fastifyStatic, {
      root: uiDistDir,
      prefix: '/',
      wildcard: false,
    });
    // SPA fallback: serve index.html for non-API/WS routes
    app.setNotFoundHandler((_request, reply) => {
      return reply.sendFile('index.html');
    });
  }

  // Load agent configs
  agentManager.load(config.agents);

  // Build a map of adapter name → first matching agent id for message routing
  const adapterToAgent = new Map<string, string>();
  for (const agentCfg of config.agents) {
    if (agentCfg.adapter && !adapterToAgent.has(agentCfg.adapter)) {
      adapterToAgent.set(agentCfg.adapter, agentCfg.id);
    }
  }

  // Wire message events to agent dispatch and task completion
  eventBus.on('message', async (event) => {
    const payload = event.payload as {
      taskId: string;
      text: string;
      channel: string;
      threadTs?: string;
    };

    const agentId = event.target ?? adapterToAgent.get(event.source);
    if (!agentId) return;

    try {
      await taskQueue.claim(payload.taskId);
      const result = await agentManager.dispatch(agentId, {
        channel: payload.channel,
        user: 'unknown',
        text: payload.text,
        threadId: payload.threadTs,
      });
      await taskQueue.complete(payload.taskId, result);
    } catch (err) {
      const task = taskQueue.getById(payload.taskId);
      if (task && task.status === 'running') {
        await taskQueue.fail(payload.taskId, err instanceof Error ? err.message : String(err));
      }
    }
  });

  // Create adapters from factories
  if (config.adapters) {
    for (const [name, factory] of Object.entries(config.adapters)) {
      adapters.push(factory(taskQueue, eventBus));
    }
  }

  async function start(): Promise<string> {
    await agentManager.startAll();
    for (const adapter of adapters) {
      await adapter.start();
    }
    const address = await app.listen({ host: config.host ?? '0.0.0.0', port: config.port ?? 3000 });
    return address;
  }

  async function stop(): Promise<void> {
    for (const adapter of adapters) {
      await adapter.stop();
    }
    await agentManager.stopAll();
    eventBus.removeAll();
    await app.close();
  }

  // Graceful shutdown on signals
  const shutdown = async () => {
    app.log.info('Shutting down gracefully...');
    await stop();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());

  return { app, eventBus, agentManager, taskQueue, start, stop };
}
