import type { ServerConfig } from '@snowbear/core';
import { SlackAdapter } from '@snowbear/slack-adapter';
import { CeoAgent } from './ceo-agent.js';

const config: ServerConfig = {
  port: 3000,
  agents: [
    {
      id: 'ceo',
      name: 'CEO Agent',
      adapter: 'slack',
      agentClass: CeoAgent,
      systemPrompt: [
        'You are a CEO agent — a general-purpose assistant that helps teams triage and manage requests.',
        'You can create tasks to delegate work and check the task queue status.',
        'When a request is complex, break it into smaller tasks using the create_task tool.',
        'Be concise, helpful, and action-oriented.',
      ].join('\n'),
      llm: {
        provider: 'openai',
        model: 'gpt-4o-mini',
      },
    },
  ],
  adapters: {
    slack: (taskQueue, eventBus) =>
      new SlackAdapter(
        {
          botToken: process.env.SLACK_BOT_TOKEN!,
          appToken: process.env.SLACK_APP_TOKEN!,
          signingSecret: process.env.SLACK_SIGNING_SECRET,
        },
        taskQueue,
        eventBus,
      ),
  },
};

export default config;
