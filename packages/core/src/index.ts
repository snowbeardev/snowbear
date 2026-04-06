export const VERSION = '0.0.1';

export { EventBus } from './event-bus.js';
export { AgentManager } from './agent-manager.js';
export { createServer } from './server.js';
export { loadConfig } from './config.js';
export { Agent } from './agent.js';
export { ToolRegistry } from './tool.js';
export { TaskQueue } from './task-queue.js';
export { OpenAiProvider, AnthropicProvider, createProvider } from './llm.js';
export type {
  AgentClassConstructor,
  AgentConfig,
  AgentLlmConfig,
  ServerConfig,
  EventMessage,
  EventHandler,
  AgentStatus,
  Task,
  TaskStatus,
  TaskSource,
} from './types.js';
export type { EnqueueOptions } from './task-queue.js';
export type { AgentInstance } from './agent-manager.js';
export type { SnowbearServer } from './server.js';
export type { AgentPersonality, AgentContext, IncomingMessage } from './agent.js';
export type { ToolDefinition, ToolParameter } from './tool.js';
export type { LlmProvider, LlmProviderConfig, LlmMessage, LlmResponse, LlmToolCall } from './llm.js';
