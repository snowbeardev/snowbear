import type { AgentConfig, AgentStatus } from './types.js';
import type { EventBus } from './event-bus.js';

export interface AgentInstance {
  config: AgentConfig;
  status: AgentStatus;
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
}
