import { Command } from 'commander';

interface HealthResponse {
  status: string;
  agents: Record<string, string>;
}

export const agentsCommand = new Command('agents')
  .description('List configured agents and their status')
  .option('-u, --url <url>', 'Server URL', 'http://localhost:3000')
  .action(async (opts: { url: string }) => {
    const url = `${opts.url.replace(/\/$/, '')}/health`;

    let data: HealthResponse;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      data = (await res.json()) as HealthResponse;
    } catch (err) {
      console.error(
        `Failed to reach snowbear server at ${opts.url}.\n` +
          `Is the server running? (snowbear start)\n` +
          `Error: ${err instanceof Error ? err.message : String(err)}`,
      );
      process.exitCode = 1;
      return;
    }

    const entries = Object.entries(data.agents);
    if (entries.length === 0) {
      console.log('No agents configured.');
      return;
    }

    console.log(`Server: ${data.status}\n`);
    console.log('Agents:');
    for (const [id, status] of entries) {
      const icon = status === 'running' ? '\u25cf' : '\u25cb';
      console.log(`  ${icon} ${id}  ${status}`);
    }
  });
