import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import yaml from 'js-yaml';
import type { ServerConfig } from './types.js';

const DEFAULTS: Pick<ServerConfig, 'host' | 'port'> = {
  host: '0.0.0.0',
  port: 3000,
};

export async function loadConfig(filePath: string): Promise<ServerConfig> {
  const raw = await readFile(filePath, 'utf-8');
  const ext = extname(filePath).toLowerCase();

  let parsed: unknown;
  if (ext === '.yaml' || ext === '.yml') {
    parsed = yaml.load(raw);
  } else if (ext === '.json') {
    parsed = JSON.parse(raw);
  } else {
    throw new Error(`Unsupported config format: ${ext}. Use .yaml, .yml, or .json`);
  }

  return normalizeConfig(parsed);
}

function normalizeConfig(raw: unknown): ServerConfig {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Config must be an object');
  }

  const obj = raw as Record<string, unknown>;

  if (!Array.isArray(obj.agents)) {
    throw new Error('Config must include an "agents" array');
  }

  for (const agent of obj.agents) {
    if (typeof agent !== 'object' || agent === null) {
      throw new Error('Each agent entry must be an object');
    }
    const a = agent as Record<string, unknown>;
    if (typeof a.id !== 'string' || !a.id) {
      throw new Error('Each agent must have a string "id"');
    }
    if (typeof a.name !== 'string' || !a.name) {
      throw new Error('Each agent must have a string "name"');
    }
    if (typeof a.adapter !== 'string' || !a.adapter) {
      throw new Error('Each agent must have a string "adapter"');
    }
  }

  return {
    host: typeof obj.host === 'string' ? obj.host : DEFAULTS.host,
    port: typeof obj.port === 'number' ? obj.port : DEFAULTS.port,
    agents: obj.agents,
  };
}
