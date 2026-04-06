import { describe, it, expect, vi } from 'vitest';
import { EventBus } from './event-bus.js';
import { TaskQueue } from './task-queue.js';
import type { EventMessage } from './types.js';

function makeSource(channel = 'general', threadId?: string) {
  return { channel, threadId };
}

describe('TaskQueue', () => {
  it('enqueue creates a pending task and emits task:created', async () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('task:created', handler);

    const queue = new TaskQueue(bus);
    const task = await queue.enqueue({
      source: makeSource('general', 'thread-1'),
      description: 'Say hello',
    });

    expect(task.id).toBeDefined();
    expect(task.status).toBe('pending');
    expect(task.source).toEqual({ channel: 'general', threadId: 'thread-1' });
    expect(task.description).toBe('Say hello');
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].payload.task.id).toBe(task.id);
  });

  it('dequeue returns the oldest pending task and sets it to running', async () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('task:started', handler);

    const queue = new TaskQueue(bus);
    const t1 = await queue.enqueue({ source: makeSource(), description: 'First' });
    await queue.enqueue({ source: makeSource(), description: 'Second' });

    const dequeued = await queue.dequeue();

    expect(dequeued!.id).toBe(t1.id);
    expect(dequeued!.status).toBe('running');
    expect(handler).toHaveBeenCalledOnce();
  });

  it('dequeue returns undefined when queue is empty', async () => {
    const bus = new EventBus();
    const queue = new TaskQueue(bus);
    expect(await queue.dequeue()).toBeUndefined();
  });

  it('complete transitions running → done and emits task:completed', async () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('task:completed', handler);

    const queue = new TaskQueue(bus);
    const task = await queue.enqueue({ source: makeSource(), description: 'Work' });
    await queue.dequeue();

    const done = await queue.complete(task.id, { answer: 42 });

    expect(done.status).toBe('done');
    expect(done.result).toEqual({ answer: 42 });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('fail transitions running → failed and emits task:failed', async () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('task:failed', handler);

    const queue = new TaskQueue(bus);
    const task = await queue.enqueue({ source: makeSource(), description: 'Risky' });
    await queue.dequeue();

    const failed = await queue.fail(task.id, 'Something went wrong');

    expect(failed.status).toBe('failed');
    expect(failed.error).toBe('Something went wrong');
    expect(handler).toHaveBeenCalledOnce();
  });

  it('complete throws if task is not running', async () => {
    const bus = new EventBus();
    const queue = new TaskQueue(bus);
    const task = await queue.enqueue({ source: makeSource(), description: 'Pending' });

    await expect(queue.complete(task.id)).rejects.toThrow('expected "running"');
  });

  it('fail throws if task is not running', async () => {
    const bus = new EventBus();
    const queue = new TaskQueue(bus);
    const task = await queue.enqueue({ source: makeSource(), description: 'Pending' });

    await expect(queue.fail(task.id, 'err')).rejects.toThrow('expected "running"');
  });

  it('complete throws for unknown task', async () => {
    const bus = new EventBus();
    const queue = new TaskQueue(bus);

    await expect(queue.complete('nonexistent')).rejects.toThrow('Task not found');
  });

  it('fail throws for unknown task', async () => {
    const bus = new EventBus();
    const queue = new TaskQueue(bus);

    await expect(queue.fail('nonexistent', 'err')).rejects.toThrow('Task not found');
  });

  it('supports child tasks via parentTaskId', async () => {
    const bus = new EventBus();
    const queue = new TaskQueue(bus);
    const parent = await queue.enqueue({ source: makeSource(), description: 'Parent' });
    const child1 = await queue.enqueue({
      source: makeSource(),
      description: 'Child 1',
      parentTaskId: parent.id,
    });
    const child2 = await queue.enqueue({
      source: makeSource(),
      description: 'Child 2',
      parentTaskId: parent.id,
    });

    const children = queue.getChildren(parent.id);
    expect(children).toHaveLength(2);
    expect(children.map((c) => c.id)).toContain(child1.id);
    expect(children.map((c) => c.id)).toContain(child2.id);
  });

  it('enqueue rejects invalid parentTaskId', async () => {
    const bus = new EventBus();
    const queue = new TaskQueue(bus);

    await expect(
      queue.enqueue({
        source: makeSource(),
        description: 'Orphan',
        parentTaskId: 'nonexistent',
      }),
    ).rejects.toThrow('Parent task not found');
  });

  it('getById returns the task or undefined', async () => {
    const bus = new EventBus();
    const queue = new TaskQueue(bus);
    const task = await queue.enqueue({ source: makeSource(), description: 'Find me' });

    expect(queue.getById(task.id)?.description).toBe('Find me');
    expect(queue.getById('nope')).toBeUndefined();
  });

  it('size tracks pending count, total tracks all tasks', async () => {
    const bus = new EventBus();
    const queue = new TaskQueue(bus);

    expect(queue.size).toBe(0);
    expect(queue.total).toBe(0);

    await queue.enqueue({ source: makeSource(), description: 'A' });
    await queue.enqueue({ source: makeSource(), description: 'B' });

    expect(queue.size).toBe(2);
    expect(queue.total).toBe(2);

    await queue.dequeue();

    expect(queue.size).toBe(1);
    expect(queue.total).toBe(2);
  });

  it('full lifecycle: pending → running → done', async () => {
    const bus = new EventBus();
    const events: string[] = [];
    bus.on('task:created', () => { events.push('created'); });
    bus.on('task:started', () => { events.push('started'); });
    bus.on('task:completed', () => { events.push('completed'); });

    const queue = new TaskQueue(bus);
    const task = await queue.enqueue({ source: makeSource(), description: 'E2E' });
    expect(task.status).toBe('pending');

    const running = await queue.dequeue();
    expect(running!.status).toBe('running');

    const done = await queue.complete(task.id, 'result');
    expect(done.status).toBe('done');

    expect(events).toEqual(['created', 'started', 'completed']);
  });

  it('full lifecycle: pending → running → failed', async () => {
    const bus = new EventBus();
    const events: string[] = [];
    bus.on('task:created', () => { events.push('created'); });
    bus.on('task:started', () => { events.push('started'); });
    bus.on('task:failed', () => { events.push('failed'); });

    const queue = new TaskQueue(bus);
    const task = await queue.enqueue({ source: makeSource(), description: 'E2E fail' });
    await queue.dequeue();
    const failed = await queue.fail(task.id, 'boom');

    expect(failed.status).toBe('failed');
    expect(events).toEqual(['created', 'started', 'failed']);
  });

  it('FIFO ordering is preserved', async () => {
    const bus = new EventBus();
    const queue = new TaskQueue(bus);

    const t1 = await queue.enqueue({ source: makeSource(), description: '1st' });
    const t2 = await queue.enqueue({ source: makeSource(), description: '2nd' });
    const t3 = await queue.enqueue({ source: makeSource(), description: '3rd' });

    expect((await queue.dequeue())!.id).toBe(t1.id);
    expect((await queue.dequeue())!.id).toBe(t2.id);
    expect((await queue.dequeue())!.id).toBe(t3.id);
    expect(await queue.dequeue()).toBeUndefined();
  });
});
