export interface AgentLlmConfig {
  provider: 'openai' | 'anthropic';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export type AgentClassConstructor = new (
  id: string,
  ctx: import('./agent.js').AgentContext,
) => import('./agent.js').Agent;

export interface AgentConfig {
  id: string;
  name: string;
  adapter: string;
  enabled?: boolean;
  systemPrompt?: string;
  llm?: AgentLlmConfig;
  agentClass?: AgentClassConstructor;
  settings?: Record<string, unknown>;
}

export interface ServerConfig {
  host?: string;
  port?: number;
  agents: AgentConfig[];
  adapters?: Record<string, AdapterFactory>;
}

export interface EventMessage {
  type: string;
  source: string;
  target?: string;
  payload: unknown;
  timestamp: number;
}

export type EventHandler = (message: EventMessage) => void | Promise<void>;

export interface Adapter {
  readonly name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export type AdapterFactory = (
  taskQueue: import('./task-queue.js').TaskQueue,
  eventBus: import('./event-bus.js').EventBus,
) => Adapter;

export type AgentStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'error';

export type TaskStatus = 'pending' | 'running' | 'done' | 'failed';

export interface TaskSource {
  channel: string;
  threadId?: string;
}

export interface Task {
  id: string;
  source: TaskSource;
  description: string;
  status: TaskStatus;
  result?: unknown;
  error?: string;
  parentTaskId?: string;
  createdAt: number;
  updatedAt: number;
}
