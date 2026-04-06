export const VERSION = '0.0.1';

export { EventBus } from './event-bus.js';
export { AgentManager } from './agent-manager.js';
export { createServer } from './server.js';
export { loadConfig } from './config.js';
export { Agent } from './agent.js';
export { ToolRegistry } from './tool.js';
export { OpenAiProvider, AnthropicProvider, createProvider } from './llm.js';
export type {
  AgentConfig,
  AgentLlmConfig,
  ServerConfig,
  EventMessage,
  EventHandler,
  AgentStatus,
} from './types.js';
export type { AgentInstance } from './agent-manager.js';
export type { SnowbearServer } from './server.js';
export type { AgentPersonality, AgentContext, IncomingMessage } from './agent.js';
export type { ToolDefinition, ToolParameter } from './tool.js';
export type { LlmProvider, LlmProviderConfig, LlmMessage, LlmResponse, LlmToolCall } from './llm.js';
