import { Command } from 'commander';
import { resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { spawn, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const thisDir = dirname(fileURLToPath(import.meta.url));

function findUiDir(): string | undefined {
  // Walk up from cli/src/commands → cli → packages → repo root → packages/ui
  const candidate = resolve(thisDir, '../../../ui');
  if (existsSync(resolve(candidate, 'package.json'))) return candidate;
  return undefined;
}

function prefix(name: string, color: string): (data: Buffer) => void {
  const code = color === 'blue' ? '\x1b[34m' : color === 'green' ? '\x1b[32m' : '\x1b[33m';
  const reset = '\x1b[0m';
  const tag = `${code}[${name}]${reset}`;
  return (data: Buffer) => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      if (line.length > 0) {
        process.stdout.write(`${tag} ${line}\n`);
      }
    }
  };
}

export const devCommand = new Command('dev')
  .description('Start the API server, bot, and dashboard in development mode')
  .option('-c, --config <path>', 'Path to config file', 'snowbear.config.ts')
  .option('--no-ui', 'Skip starting the dashboard dev server')
  .option('--ui-port <port>', 'Port for the dashboard dev server', '5173')
  .action(async (opts: { config: string; ui: boolean; uiPort: string }) => {
    const configPath = resolve(opts.config);
    if (!existsSync(configPath)) {
      console.error(`Config file not found: ${configPath}`);
      process.exit(1);
    }

    const children: ChildProcess[] = [];

    const shutdown = () => {
      for (const child of children) {
        child.kill('SIGTERM');
      }
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    // 1. Start the API + bot server with tsx --watch for auto-reload
    // Resolve the .ts source for tsx; falls back to .js dist for compiled usage
    const tsSrc = resolve(thisDir, '../main.ts');
    const jsDist = resolve(thisDir, '../main.js');
    const startFile = existsSync(tsSrc) ? tsSrc : jsDist;
    const apiProc = spawn('npx', ['tsx', '--watch', startFile, 'start', '-c', configPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'development' },
    });
    apiProc.stdout?.on('data', prefix('api', 'blue'));
    apiProc.stderr?.on('data', prefix('api', 'blue'));
    children.push(apiProc);

    console.log('\x1b[34m[api]\x1b[0m Starting server with tsx --watch...');

    // 2. Start the Vite UI dev server (unless --no-ui)
    if (opts.ui) {
      const uiDir = findUiDir();
      if (uiDir) {
        const uiProc = spawn('npx', ['vite', '--port', opts.uiPort], {
          cwd: uiDir,
          stdio: ['ignore', 'pipe', 'pipe'],
          env: { ...process.env, NODE_ENV: 'development' },
        });
        uiProc.stdout?.on('data', prefix('ui', 'green'));
        uiProc.stderr?.on('data', prefix('ui', 'green'));
        children.push(uiProc);

        console.log(`\x1b[32m[ui]\x1b[0m Starting Vite dev server on port ${opts.uiPort}...`);
      } else {
        console.warn('\x1b[33m[ui]\x1b[0m @snowbear/ui package not found — skipping dashboard.');
      }
    }

    // Wait for any child to exit
    await Promise.race(
      children.map(
        (child) =>
          new Promise<void>((res) => {
            child.on('exit', (code) => {
              console.log(`Process exited with code ${code}`);
              shutdown();
              res();
            });
          }),
      ),
    );

    process.exit(0);
  });
