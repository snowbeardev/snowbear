import { describe, it, expect, vi } from 'vitest';
import { EventBus } from './event-bus.js';
import type { EventMessage } from './types.js';

function makeMessage(type: string, source = 'test'): EventMessage {
  return { type, source, payload: null, timestamp: Date.now() };
}

describe('EventBus', () => {
  it('delivers messages to registered handlers', async () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('ping', handler);

    const msg = makeMessage('ping');
    await bus.emit(msg);

    expect(handler).toHaveBeenCalledWith(msg);
  });

  it('does not deliver to unregistered handlers', async () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('ping', handler);
    bus.off('ping', handler);

    await bus.emit(makeMessage('ping'));
    expect(handler).not.toHaveBeenCalled();
  });

  it('handles async handlers', async () => {
    const bus = new EventBus();
    const order: number[] = [];
    bus.on('test', async () => {
      await new Promise((r) => setTimeout(r, 10));
      order.push(1);
    });
    bus.on('test', async () => {
      order.push(2);
    });

    await bus.emit(makeMessage('test'));
    expect(order).toEqual([2, 1]);
  });

  it('ignores events with no handlers', async () => {
    const bus = new EventBus();
    await expect(bus.emit(makeMessage('nope'))).resolves.toBeUndefined();
  });

  it('removeAll clears all handlers', async () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('a', handler);
    bus.on('b', handler);
    bus.removeAll();

    await bus.emit(makeMessage('a'));
    await bus.emit(makeMessage('b'));
    expect(handler).not.toHaveBeenCalled();
  });
});
