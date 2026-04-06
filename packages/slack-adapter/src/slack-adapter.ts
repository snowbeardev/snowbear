import { App } from '@slack/bolt';
import type { Adapter, EventBus, TaskQueue, EnqueueOptions, Task } from '@snowbear/core';

export interface SlackAdapterConfig {
  botToken: string;
  appToken: string;
  signingSecret?: string;
}

export class SlackAdapter implements Adapter {
  readonly name = 'slack';
  private app: App;
  private taskQueue: TaskQueue;
  private eventBus: EventBus;
  private botUserId: string | undefined;

  constructor(config: SlackAdapterConfig, taskQueue: TaskQueue, eventBus: EventBus) {
    this.taskQueue = taskQueue;
    this.eventBus = eventBus;

    this.app = new App({
      token: config.botToken,
      appToken: config.appToken,
      signingSecret: config.signingSecret ?? 'unused-in-socket-mode',
      socketMode: true,
    });

    this.app.message(async ({ message }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = message as any;
      if (msg.subtype || msg.bot_id) return;

      const channel: string = msg.channel;
      const text: string = msg.text ?? '';
      const threadTs: string = msg.thread_ts ?? msg.ts;

      const task = await this.enqueueFromSlack(channel, text, msg.user, threadTs);
      this.processTask(task, channel, threadTs);
    });

    this.app.event('app_mention', async ({ event }) => {
      const channel: string = event.channel;
      const text = this.stripMention(event.text ?? '');
      const threadTs: string = event.thread_ts ?? event.ts ?? '';

      const task = await this.enqueueFromSlack(channel, text, event.user ?? 'unknown', threadTs);
      this.processTask(task, channel, threadTs);
    });
  }

  async start(): Promise<void> {
    await this.app.start();
    const authResult = await this.app.client.auth.test();
    this.botUserId = authResult.user_id as string | undefined;

    this.eventBus.on('task:completed', async (event) => {
      const { task } = event.payload as { task: Task };
      if (task.source.channel && task.result) {
        await this.postToThread(task.source.channel, task.source.threadId, String(task.result));
      }
    });

    this.eventBus.on('task:failed', async (event) => {
      const { task } = event.payload as { task: Task };
      if (task.source.channel) {
        await this.postToThread(
          task.source.channel,
          task.source.threadId,
          `Sorry, something went wrong: ${task.error ?? 'unknown error'}`,
        );
      }
    });
  }

  async stop(): Promise<void> {
    await this.app.stop();
  }

  private async enqueueFromSlack(channel: string, text: string, user: string, threadTs: string): Promise<Task> {
    const options: EnqueueOptions = {
      source: { channel, threadId: threadTs },
      description: text,
    };
    return this.taskQueue.enqueue(options);
  }

  private processTask(task: Task, channel: string, threadTs: string): void {
    void this.eventBus.emit({
      type: 'message',
      source: 'slack',
      target: undefined,
      payload: { taskId: task.id, text: task.description, channel, threadTs },
      timestamp: Date.now(),
    });
  }

  async postToThread(channel: string, threadTs: string | undefined, text: string): Promise<void> {
    await this.app.client.chat.postMessage({
      channel,
      text,
      ...(threadTs ? { thread_ts: threadTs } : {}),
    });
  }

  private stripMention(text: string): string {
    return text.replace(/^<@[A-Z0-9]+>\s*/, '').trim();
  }

  getBotUserId(): string | undefined {
    return this.botUserId;
  }
}
