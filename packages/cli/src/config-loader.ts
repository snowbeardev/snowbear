import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import type { ServerConfig } from '@snowbear/core';

export async function loadTsConfig(absolutePath: string): Promise<ServerConfig> {
  if (!existsSync(absolutePath)) {
    throw new Error(`Config file not found: ${absolutePath}`);
  }

  // Try tsx / ts-node register or native TS strip support (Node 22.6+)
  // Dynamic import with file:// URL works when a TS loader is active
  const url = pathToFileURL(absolutePath).href;

  let mod: Record<string, unknown>;
  try {
    mod = (await import(url)) as Record<string, unknown>;
  } catch (err) {
    throw new Error(
      `Failed to load TypeScript config at ${absolutePath}.\n` +
        `Make sure you run snowbear with a TS loader, e.g.:\n` +
        `  node --import tsx ./node_modules/.bin/snowbear start\n` +
        `  or: npx tsx node_modules/.bin/snowbear start\n` +
        `Original error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const config = (mod.default ?? mod.config) as ServerConfig | undefined;
  if (!config || typeof config !== 'object' || !Array.isArray(config.agents)) {
    throw new Error(
      `Config file must export a default ServerConfig with an "agents" array.`,
    );
  }

  return config;
}
