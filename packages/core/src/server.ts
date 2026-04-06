import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import type { FastifyInstance } from 'fastify';
import type { ServerConfig } from './types.js';
import { EventBus } from './event-bus.js';
import { AgentManager } from './agent-manager.js';
import { loadConfig } from './config.js';

export interface SnowbearServer {
  app: FastifyInstance;
  eventBus: EventBus;
  agentManager: AgentManager;
  start(): Promise<string>;
  stop(): Promise<void>;
}

export async function createServer(configOrPath: ServerConfig | string): Promise<SnowbearServer> {
  const config =
    typeof configOrPath === 'string' ? await loadConfig(configOrPath) : configOrPath;

  const eventBus = new EventBus();
  const agentManager = new AgentManager(eventBus);

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

  async function start(): Promise<string> {
    await agentManager.startAll();
    const address = await app.listen({ host: config.host ?? '0.0.0.0', port: config.port ?? 3000 });
    return address;
  }

  async function stop(): Promise<void> {
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

  return { app, eventBus, agentManager, start, stop };
}
