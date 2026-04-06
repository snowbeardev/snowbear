import type { ServerConfig } from '@snowbear/core';
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
};

export default config;
