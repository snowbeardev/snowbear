# snowbear

Self-learning AI agents for communication channels (Slack, etc.).

## Project Structure

Monorepo managed with **pnpm workspaces** and **TypeScript project references**.

```
packages/
  core/           @snowbear/core — runtime, agent lifecycle, event bus, tool system, task queue, LLM providers
  cli/            @snowbear/cli — CLI for running/managing agents (commander-based)
  slack-adapter/  @snowbear/slack-adapter — Slack Bolt integration
examples/
  ceo-agent/      Example agent using all packages
```

## Commands

```bash
pnpm install          # Install all dependencies
pnpm build            # Build all packages (tsc -b via each package)
pnpm test             # Run tests (vitest)
pnpm typecheck        # Type-check all packages
pnpm lint             # ESLint
pnpm format           # Prettier (write)
pnpm format:check     # Prettier (check only)
```

## Tech Stack

- **Runtime:** Node.js >= 20, ES2022 target, ESM (`"type": "module"`)
- **Language:** TypeScript 5.7+ with strict mode, `verbatimModuleSyntax`
- **Package manager:** pnpm 9.x with workspace protocol
- **Build:** `tsc -b` (project references)
- **Test:** Vitest — test files colocated as `*.test.ts` in `src/`
- **Server:** Fastify with `@fastify/websocket`
- **LLM:** OpenAI and Anthropic providers (see `packages/core/src/llm.ts`)
- **Slack:** `@slack/bolt`
- **CI:** GitHub Actions on Node 20 + 22

## Code Conventions

- Use `.js` extensions in all TypeScript imports (required by Node16 module resolution)
- Single quotes, semicolons, trailing commas, 100 char print width (Prettier)
- Test files live next to source: `foo.ts` -> `foo.test.ts`
- Prefix unused parameters with `_`
- Export types separately from values using `export type {}`
- All packages export from a single `index.ts` barrel

## Key Interfaces

- `Agent` — base class for all agents (`packages/core/src/agent.ts`)
- `Adapter` / `AdapterFactory` — channel adapters like Slack
- `ToolDefinition` / `ToolRegistry` — agent tool system
- `TaskQueue` / `Task` — background task processing
- `EventBus` / `EventMessage` — internal pub/sub
- `ServerConfig` / `AgentConfig` — configuration types
- `LlmProvider` — pluggable LLM backend interface

## Configuration

Agents are configured via `snowbear.config.ts` files (see `examples/ceo-agent/`).
The CLI loads config with `loadConfig()` from `@snowbear/core`.

## Environment Variables

- `OPENAI_API_KEY` — for OpenAI LLM provider
- `ANTHROPIC_API_KEY` — for Anthropic LLM provider
- `SLACK_BOT_TOKEN` — Slack bot token
- `SLACK_APP_TOKEN` — Slack app-level token (socket mode)

Never commit `.env` files. Use `.env.example` for documentation.
