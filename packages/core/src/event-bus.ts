import type { EventHandler, EventMessage } from './types.js';

export class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  on(eventType: string, handler: EventHandler): void {
    let set = this.handlers.get(eventType);
    if (!set) {
      set = new Set();
      this.handlers.set(eventType, set);
    }
    set.add(handler);
  }

  off(eventType: string, handler: EventHandler): void {
    this.handlers.get(eventType)?.delete(handler);
  }

  async emit(message: EventMessage): Promise<void> {
    const handlers = this.handlers.get(message.type);
    if (!handlers) return;
    const promises: Promise<void>[] = [];
    for (const handler of handlers) {
      const result = handler(message);
      if (result instanceof Promise) {
        promises.push(result);
      }
    }
    if (promises.length > 0) {
      await Promise.all(promises);
    }
  }

  removeAll(): void {
    this.handlers.clear();
  }
}
