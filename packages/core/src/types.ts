export interface AgentLlmConfig {
  provider: 'openai' | 'anthropic';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AgentConfig {
  id: string;
  name: string;
  adapter: string;
  enabled?: boolean;
  systemPrompt?: string;
  llm?: AgentLlmConfig;
  settings?: Record<string, unknown>;
}

export interface ServerConfig {
  host?: string;
  port?: number;
  agents: AgentConfig[];
}

export interface EventMessage {
  type: string;
  source: string;
  target?: string;
  payload: unknown;
  timestamp: number;
}

export type EventHandler = (message: EventMessage) => void | Promise<void>;

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
