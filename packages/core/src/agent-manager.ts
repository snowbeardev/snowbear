import type { AgentConfig, AgentStatus } from './types.js';
import type { EventBus } from './event-bus.js';
import type { Agent, AgentContext, IncomingMessage } from './agent.js';
import { ToolRegistry } from './tool.js';
import { createProvider } from './llm.js';

export interface AgentInstance {
  config: AgentConfig;
  status: AgentStatus;
  agent?: Agent;
}

export class AgentManager {
  private agents = new Map<string, AgentInstance>();
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  load(configs: AgentConfig[]): void {
    for (const config of configs) {
      if (this.agents.has(config.id)) {
        throw new Error(`Duplicate agent id: ${config.id}`);
      }
      this.agents.set(config.id, { config, status: 'stopped' });
    }
  }

  async start(agentId: string): Promise<void> {
    const instance = this.getOrThrow(agentId);
    if (instance.status === 'running') return;

    instance.status = 'starting';
    await this.eventBus.emit({
      type: 'agent:starting',
      source: agentId,
      payload: { config: instance.config },
      timestamp: Date.now(),
    });

    // Instantiate the Agent subclass if agentClass is provided and LLM is configured
    if (instance.config.agentClass && instance.config.llm) {
      const tools = new ToolRegistry();
      const llm = createProvider({
        provider: instance.config.llm.provider,
        model: instance.config.llm.model,
        apiKey: instance.config.llm.apiKey ?? this.resolveApiKey(instance.config.llm.provider),
        baseUrl: instance.config.llm.baseUrl,
        temperature: instance.config.llm.temperature,
        maxTokens: instance.config.llm.maxTokens,
      });

      const ctx: AgentContext = {
        agentId,
        eventBus: this.eventBus,
        tools,
        llm,
        personality: {
          systemPrompt: instance.config.systemPrompt ?? '',
          temperature: instance.config.llm.temperature,
          maxTokens: instance.config.llm.maxTokens,
        },
      };

      const AgentClass = instance.config.agentClass;
      instance.agent = new AgentClass(agentId, ctx);
      await instance.agent.onReady();
    }

    instance.status = 'running';
    await this.eventBus.emit({
      type: 'agent:started',
      source: agentId,
      payload: null,
      timestamp: Date.now(),
    });
  }

  async stop(agentId: string): Promise<void> {
    const instance = this.getOrThrow(agentId);
    if (instance.status === 'stopped') return;

    instance.status = 'stopping';
    await this.eventBus.emit({
      type: 'agent:stopping',
      source: agentId,
      payload: null,
      timestamp: Date.now(),
    });

    instance.agent = undefined;
    instance.status = 'stopped';
    await this.eventBus.emit({
      type: 'agent:stopped',
      source: agentId,
      payload: null,
      timestamp: Date.now(),
    });
  }

  async restart(agentId: string): Promise<void> {
    await this.stop(agentId);
    await this.start(agentId);
  }

  async startAll(): Promise<void> {
    for (const [id, instance] of this.agents) {
      if (instance.config.enabled !== false) {
        await this.start(id);
      }
    }
  }

  async stopAll(): Promise<void> {
    for (const [id, instance] of this.agents) {
      if (instance.status === 'running' || instance.status === 'starting') {
        await this.stop(id);
      }
    }
  }

  async dispatch(agentId: string, message: IncomingMessage): Promise<string | null> {
    const instance = this.getOrThrow(agentId);
    if (!instance.agent) {
      throw new Error(`Agent ${agentId} has no runtime instance (missing agentClass or llm config)`);
    }
    return instance.agent.onMessage(message);
  }

  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId)?.agent;
  }

  getStatus(agentId: string): AgentStatus {
    return this.getOrThrow(agentId).status;
  }

  getAll(): Map<string, AgentInstance> {
    return new Map(this.agents);
  }

  private getOrThrow(agentId: string): AgentInstance {
    const instance = this.agents.get(agentId);
    if (!instance) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    return instance;
  }

  private resolveApiKey(provider: string): string {
    const envKey = provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY';
    const key = process.env[envKey];
    if (!key) {
      throw new Error(`Missing API key: set ${envKey} or provide apiKey in llm config`);
    }
    return key;
  }
}
