import { describe, it, expect, afterEach } from 'vitest';
import { createServer } from './server.js';
import type { SnowbearServer } from './server.js';
import type { ServerConfig } from './types.js';

const TEST_CONFIG: ServerConfig = {
  host: '127.0.0.1',
  port: 0, // random port
  agents: [
    { id: 'test-bot', name: 'Test Bot', adapter: 'mock' },
  ],
};

describe('createServer', () => {
  let server: SnowbearServer | undefined;

  afterEach(async () => {
    if (server) {
      await server.stop();
      server = undefined;
    }
  });

  it('starts and exposes a health endpoint', async () => {
    server = await createServer(TEST_CONFIG);
    const address = await server.start();

    const res = await fetch(`${address}/health`);
    const body = await res.json() as { status: string; agents: Record<string, string> };

    expect(res.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.agents['test-bot']).toBe('running');
  });

  it('starts all enabled agents', async () => {
    server = await createServer(TEST_CONFIG);
    await server.start();

    expect(server.agentManager.getStatus('test-bot')).toBe('running');
  });

  it('stops cleanly', async () => {
    server = await createServer(TEST_CONFIG);
    await server.start();
    await server.stop();

    expect(server.agentManager.getStatus('test-bot')).toBe('stopped');
    server = undefined; // already stopped
  });
});
