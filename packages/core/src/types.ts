export interface AgentConfig {
  id: string;
  name: string;
  adapter: string;
  enabled?: boolean;
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
