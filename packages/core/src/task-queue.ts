import { randomUUID } from 'node:crypto';
import type { EventBus } from './event-bus.js';
import type { Task, TaskSource, TaskStatus } from './types.js';

export interface EnqueueOptions {
  source: TaskSource;
  description: string;
  parentTaskId?: string;
}

export class TaskQueue {
  private tasks = new Map<string, Task>();
  private pending: string[] = [];
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  async enqueue(options: EnqueueOptions): Promise<Task> {
    if (options.parentTaskId && !this.tasks.has(options.parentTaskId)) {
      throw new Error(`Parent task not found: ${options.parentTaskId}`);
    }

    const now = Date.now();
    const task: Task = {
      id: randomUUID(),
      source: options.source,
      description: options.description,
      status: 'pending',
      parentTaskId: options.parentTaskId,
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.set(task.id, task);
    this.pending.push(task.id);

    await this.eventBus.emit({
      type: 'task:created',
      source: 'task-queue',
      payload: { task },
      timestamp: now,
    });

    return task;
  }

  async claim(taskId: string): Promise<Task> {
    const task = this.getOrThrow(taskId);
    this.assertStatus(task, 'pending');

    this.pending = this.pending.filter((id) => id !== taskId);
    task.status = 'running';
    task.updatedAt = Date.now();

    await this.eventBus.emit({
      type: 'task:started',
      source: 'task-queue',
      payload: { task },
      timestamp: task.updatedAt,
    });

    return task;
  }

  async dequeue(): Promise<Task | undefined> {
    const taskId = this.pending.shift();
    if (!taskId) return undefined;

    const task = this.tasks.get(taskId)!;
    task.status = 'running';
    task.updatedAt = Date.now();

    await this.eventBus.emit({
      type: 'task:started',
      source: 'task-queue',
      payload: { task },
      timestamp: task.updatedAt,
    });

    return task;
  }

  async complete(taskId: string, result?: unknown): Promise<Task> {
    const task = this.getOrThrow(taskId);
    this.assertStatus(task, 'running');

    task.status = 'done';
    task.result = result;
    task.updatedAt = Date.now();

    await this.eventBus.emit({
      type: 'task:completed',
      source: 'task-queue',
      payload: { task },
      timestamp: task.updatedAt,
    });

    return task;
  }

  async fail(taskId: string, error: string): Promise<Task> {
    const task = this.getOrThrow(taskId);
    this.assertStatus(task, 'running');

    task.status = 'failed';
    task.error = error;
    task.updatedAt = Date.now();

    await this.eventBus.emit({
      type: 'task:failed',
      source: 'task-queue',
      payload: { task },
      timestamp: task.updatedAt,
    });

    return task;
  }

  getById(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  getChildren(parentTaskId: string): Task[] {
    const children: Task[] = [];
    for (const task of this.tasks.values()) {
      if (task.parentTaskId === parentTaskId) {
        children.push(task);
      }
    }
    return children;
  }

  get size(): number {
    return this.pending.length;
  }

  get total(): number {
    return this.tasks.size;
  }

  listAll(): Task[] {
    return Array.from(this.tasks.values());
  }

  private getOrThrow(taskId: string): Task {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    return task;
  }

  private assertStatus(task: Task, expected: TaskStatus): void {
    if (task.status !== expected) {
      throw new Error(
        `Task ${task.id} is "${task.status}", expected "${expected}"`,
      );
    }
  }
}
