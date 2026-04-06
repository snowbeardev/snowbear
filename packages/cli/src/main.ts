#!/usr/bin/env node

import { Command } from 'commander';
import { VERSION } from '@snowbear/core';
import { initCommand } from './commands/init.js';
import { startCommand } from './commands/start.js';
import { devCommand } from './commands/dev.js';
import { agentsCommand } from './commands/agents.js';

const program = new Command();

program
  .name('snowbear')
  .description('Run self-learning AI agents in communication channels')
  .version(VERSION);

program.addCommand(initCommand);
program.addCommand(startCommand);
program.addCommand(devCommand);
program.addCommand(agentsCommand);

program.parse();
