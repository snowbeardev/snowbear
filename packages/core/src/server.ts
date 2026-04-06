import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import type { FastifyInstance } from 'fastify';
import type { ServerConfig, Adapter } from './types.js';
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
