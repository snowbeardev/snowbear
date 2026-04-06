import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus, TaskQueue } from '@snowbear/core';
import type { Task } from '@snowbear/core';

// We can't easily integration-test @slack/bolt without a real Slack app,
// so we test the message conversion and event flow logic by exercising
// the TaskQueue + EventBus path that the adapter drives.

function makeSource(channel = 'C123', threadId = 'ts-001') {
  return { channel, threadId };
}

describe('SlackAdapter message→task conversion logic', () => {
  let bus: EventBus;
  let queue: TaskQueue;

  beforeEach(() => {
    bus = new EventBus();
    queue = new TaskQueue(bus);
  });

  it('enqueues a task with correct source channel and thread', async () => {
    const task = await queue.enqueue({
      source: makeSource('C-general', '1234567890.123456'),
      description: 'Hello agent',
    });

    expect(task.source.channel).toBe('C-general');
    expect(task.source.threadId).toBe('1234567890.123456');
    expect(task.description).toBe('Hello agent');
    expect(task.status).toBe('pending');
  });

  it('task completion emits event with result for thread reply', async () => {
    const completedTasks: Task[] = [];
    bus.on('task:completed', (event) => {
      completedTasks.push((event.payload as { task: Task }).task);
    });

    const task = await queue.enqueue({
      source: makeSource('C-general', 'thread-123'),
      description: 'Summarize this',
    });

    await queue.dequeue();
    await queue.complete(task.id, 'Here is the summary.');

    expect(completedTasks).toHaveLength(1);
    expect(completedTasks[0].source.channel).toBe('C-general');
    expect(completedTasks[0].source.threadId).toBe('thread-123');
    expect(completedTasks[0].result).toBe('Here is the summary.');
  });

  it('task failure emits event with error for thread reply', async () => {
    const failedTasks: Task[] = [];
    bus.on('task:failed', (event) => {
      failedTasks.push((event.payload as { task: Task }).task);
    });

    const task = await queue.enqueue({
      source: makeSource('C-general', 'thread-456'),
      description: 'Do something impossible',
    });

    await queue.dequeue();
    await queue.fail(task.id, 'LLM rate limited');

    expect(failedTasks).toHaveLength(1);
    expect(failedTasks[0].source.channel).toBe('C-general');
    expect(failedTasks[0].source.threadId).toBe('thread-456');
    expect(failedTasks[0].error).toBe('LLM rate limited');
  });

  it('preserves thread continuity for DMs (no threadId)', async () => {
    const task = await queue.enqueue({
      source: { channel: 'D-dm-channel' },
      description: 'DM message',
    });

    expect(task.source.channel).toBe('D-dm-channel');
    expect(task.source.threadId).toBeUndefined();
  });

  it('child tasks reference parent for sub-task tracking', async () => {
    const parent = await queue.enqueue({
      source: makeSource('C-general', 'thread-789'),
      description: 'Main request',
    });

    const child = await queue.enqueue({
      source: makeSource('C-general', 'thread-789'),
      description: 'Sub-task 1',
      parentTaskId: parent.id,
    });

    expect(child.parentTaskId).toBe(parent.id);
    const children = queue.getChildren(parent.id);
    expect(children).toHaveLength(1);
    expect(children[0].id).toBe(child.id);
  });
});

describe('Slack mention stripping', () => {
  // Test the regex pattern used by the adapter
  const stripMention = (text: string) => text.replace(/^<@[A-Z0-9]+>\s*/, '').trim();

  it('strips leading mention', () => {
    expect(stripMention('<@U12345> hello there')).toBe('hello there');
  });

  it('leaves text without mention unchanged', () => {
    expect(stripMention('just a normal message')).toBe('just a normal message');
  });

  it('strips mention with no trailing space', () => {
    expect(stripMention('<@U12345>hello')).toBe('hello');
  });

  it('only strips first mention', () => {
    expect(stripMention('<@U12345> cc <@U67890>')).toBe('cc <@U67890>');
  });
});
