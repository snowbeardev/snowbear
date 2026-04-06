const BASE = '';

export interface AgentInfo {
  id: string;
  name: string;
  adapter: string;
  status: string;
  enabled: boolean;
  systemPrompt?: string;
  llm: { provider: string; model: string } | null;
}

export interface TaskInfo {
  id: string;
  description: string;
  status: string;
  source: { channel: string; threadId?: string };
  result?: unknown;
  error?: string;
  parentTaskId?: string;
  createdAt: number;
  updatedAt: number;
  subtasks?: TaskInfo[];
}

export interface Stats {
  agents: { total: number; running: number };
  tasks: { total: number; pending: number; running: number; done: number; failed: number };
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const api = {
  getAgents: () => get<AgentInfo[]>('/api/agents'),
  getAgent: (id: string) => get<AgentInfo>(`/api/agents/${id}`),
  agentAction: (id: string, action: string) => post(`/api/agents/${id}`, { action }),
  getTasks: (status?: string) =>
    get<TaskInfo[]>(status ? `/api/tasks?status=${status}` : '/api/tasks'),
  getTask: (id: string) => get<TaskInfo>(`/api/tasks/${id}`),
  getStats: () => get<Stats>('/api/stats'),
};
