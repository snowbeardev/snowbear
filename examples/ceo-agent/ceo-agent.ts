import { Agent, TaskQueue } from '@snowbear/core';
import type { IncomingMessage, ToolDefinition } from '@snowbear/core';

export class CeoAgent extends Agent {
  private taskQueue: TaskQueue | undefined;

  setTaskQueue(queue: TaskQueue): void {
    this.taskQueue = queue;
  }

  override async onReady(): Promise<void> {
    this.registerTool(this.createTaskTool());
    this.registerTool(this.listTasksTool());
  }

  override async onMessage(message: IncomingMessage): Promise<string> {
    return this.chatSimple(message.text);
  }

  private createTaskTool(): ToolDefinition {
    return {
      name: 'create_task',
      description:
        'Create a new task and add it to the queue. Use this to delegate work or break down a complex request into smaller steps.',
      parameters: [
        {
          name: 'description',
          type: 'string',
          description: 'What needs to be done',
          required: true,
        },
        {
          name: 'channel',
          type: 'string',
          description: 'The channel to report results to',
          required: true,
        },
      ],
      execute: async (params) => {
        if (!this.taskQueue) {
          return { error: 'Task queue not available' };
        }
        const task = await this.taskQueue.enqueue({
          source: {
            channel: params.channel as string,
          },
          description: params.description as string,
        });
        return { taskId: task.id, status: task.status };
      },
    };
  }

  private listTasksTool(): ToolDefinition {
    return {
      name: 'list_tasks',
      description: 'Check how many tasks are pending in the queue.',
      parameters: [],
      execute: async () => {
        if (!this.taskQueue) {
          return { error: 'Task queue not available' };
        }
        return {
          pending: this.taskQueue.size,
          total: this.taskQueue.total,
        };
      },
    };
  }
}
