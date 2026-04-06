import { Command } from 'commander';
import { resolve } from 'node:path';
import { loadTsConfig } from '../config-loader.js';
import { createServer } from '@snowbear/core';

export const startCommand = new Command('start')
  .description('Load config, boot the server, and start agents')
  .option('-c, --config <path>', 'Path to config file', 'snowbear.config.ts')
  .action(async (opts: { config: string }) => {
    const configPath = resolve(opts.config);
    const ext = configPath.split('.').pop();

    let server;
    if (ext === 'ts' || ext === 'mts') {
      const config = await loadTsConfig(configPath);
      server = await createServer(config);
    } else {
      // YAML / JSON handled by core's loadConfig
      server = await createServer(configPath);
    }

    const address = await server.start();
    console.log(`snowbear server listening at ${address}`);
  });
