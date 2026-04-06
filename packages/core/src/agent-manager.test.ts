import { describe, it, expect, vi } from 'vitest';
import { AgentManager } from './agent-manager.js';
import { EventBus } from './event-bus.js';
import type { AgentConfig } from './types.js';

function makeConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return { id: 'bot-1', name: 'Bot One', adapter: 'slack', ...overrides };
}

describe('AgentManager', () => {
  it('loads agent configs', () => {
    const bus = new EventBus();
    const mgr = new AgentManager(bus);
    mgr.load([makeConfig()]);

    expect(mgr.getStatus('bot-1')).toBe('stopped');
  });

  it('rejects duplicate agent ids', () => {
    const bus = new EventBus();
    const mgr = new AgentManager(bus);
    expect(() => mgr.load([makeConfig(), makeConfig()])).toThrow('Duplicate agent id');
  });

  it('starts and stops agents', async () => {
    const bus = new EventBus();
    const mgr = new AgentManager(bus);
    mgr.load([makeConfig()]);

    await mgr.start('bot-1');
    expect(mgr.getStatus('bot-1')).toBe('running');

    await mgr.stop('bot-1');
    expect(mgr.getStatus('bot-1')).toBe('stopped');
  });

  it('emits lifecycle events on start', async () => {
    const bus = new EventBus();
    const events: string[] = [];
    bus.on('agent:starting', () => { events.push('starting'); });
    bus.on('agent:started', () => { events.push('started'); });

    const mgr = new AgentManager(bus);
    mgr.load([makeConfig()]);
    await mgr.start('bot-1');

    expect(events).toEqual(['starting', 'started']);
  });

  it('restarts an agent', async () => {
    const bus = new EventBus();
    const events: string[] = [];
    bus.on('agent:stopped', () => { events.push('stopped'); });
    bus.on('agent:started', () => { events.push('started'); });

    const mgr = new AgentManager(bus);
    mgr.load([makeConfig()]);
    await mgr.start('bot-1');
    events.length = 0;

    await mgr.restart('bot-1');
    expect(events).toEqual(['stopped', 'started']);
    expect(mgr.getStatus('bot-1')).toBe('running');
  });

  it('startAll skips disabled agents', async () => {
    const bus = new EventBus();
    const mgr = new AgentManager(bus);
    mgr.load([
      makeConfig({ id: 'a', enabled: true }),
      makeConfig({ id: 'b', enabled: false }),
    ]);

    await mgr.startAll();
    expect(mgr.getStatus('a')).toBe('running');
    expect(mgr.getStatus('b')).toBe('stopped');
  });

  it('throws on unknown agent id', () => {
    const bus = new EventBus();
    const mgr = new AgentManager(bus);
    expect(() => mgr.getStatus('nope')).toThrow('Agent not found');
  });
});
