export const VERSION = '0.0.1';

export { EventBus } from './event-bus.js';
export { AgentManager } from './agent-manager.js';
export { createServer } from './server.js';
export { loadConfig } from './config.js';
export type {
  AgentConfig,
  ServerConfig,
  EventMessage,
  EventHandler,
  AgentStatus,
} from './types.js';
export type { AgentInstance } from './agent-manager.js';
export type { SnowbearServer } from './server.js';
