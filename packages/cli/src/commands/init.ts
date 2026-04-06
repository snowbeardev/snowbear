import { Command } from 'commander';
import { writeFile, mkdir, access } from 'node:fs/promises';
import { join } from 'node:path';

const CONFIG_TEMPLATE = `import type { ServerConfig } from '@snowbear/core';

const config: ServerConfig = {
  port: 3000,
  agents: [
    {
      id: 'assistant',
      name: 'Assistant',
      adapter: 'slack',
      systemPrompt: 'You are a helpful assistant.',
      llm: {
        provider: 'anthropic',
        model: 'claude-sonnet-4-6',
      },
    },
  ],
};

export default config;
`;

const AGENT_TEMPLATE = `import { Agent } from '@snowbear/core';
import type { IncomingMessage } from '@snowbear/core';

export class MyAgent extends Agent {
  override async onMessage(message: IncomingMessage): Promise<string> {
    return this.chatSimple(message.text);
  }
}
`;

export const initCommand = new Command('init')
  .description('Scaffold a snowbear.config.ts and example agent')
  .option('-d, --dir <path>', 'Target directory', '.')
  .action(async (opts: { dir: string }) => {
    const dir = opts.dir;

    const configPath = join(dir, 'snowbear.config.ts');
    const agentDir = join(dir, 'agents');
    const agentPath = join(agentDir, 'my-agent.ts');

    const exists = async (p: string) => {
      try {
        await access(p);
        return true;
      } catch {
        return false;
      }
    };

    if (await exists(configPath)) {
      console.log('snowbear.config.ts already exists, skipping.');
    } else {
      await writeFile(configPath, CONFIG_TEMPLATE, 'utf-8');
      console.log('Created snowbear.config.ts');
    }

    if (await exists(agentPath)) {
      console.log('agents/my-agent.ts already exists, skipping.');
    } else {
      await mkdir(agentDir, { recursive: true });
      await writeFile(agentPath, AGENT_TEMPLATE, 'utf-8');
      console.log('Created agents/my-agent.ts');
    }

    console.log('\nDone! Edit snowbear.config.ts then run: snowbear start');
  });
