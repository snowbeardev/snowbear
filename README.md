# snowbear

Self-learning AI agents for communication channels like Slack.

## Packages

| Package | Description |
|---------|-------------|
| `@snowbear/core` | Core runtime — agent lifecycle, event bus, tool system, REST API |
| `@snowbear/cli` | CLI for running and managing snowbear agents |
| `@snowbear/slack-adapter` | Slack channel adapter |
| `@snowbear/ui` | Web dashboard — React + Tailwind CSS |

## Getting Started

```bash
pnpm install
pnpm build
pnpm test
```

## Running the Dashboard

The dashboard lets you monitor agents, view tasks, and manage the system from a browser.

### Development Mode (with hot reload)

Start the snowbear server first, then run the dashboard dev server:

```bash
# Terminal 1: start the snowbear server (uses your snowbear.config.ts)
cd examples/ceo-agent
npx snowbear start

# Terminal 2: start the dashboard dev server (proxies API to localhost:3000)
cd packages/ui
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. The Vite dev server proxies `/api` and `/ws` requests to the snowbear server on port 3000.

### Production Mode

Build the dashboard, then start the server — it serves the built UI automatically:

```bash
# Build the dashboard
pnpm --filter @snowbear/ui build

# Build all packages
pnpm build

# Start the server (auto-serves UI from packages/ui/dist)
cd examples/ceo-agent
npx snowbear start
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The Fastify server serves the built dashboard as static files alongside the API.

### Dashboard Pages

- **Dashboard** (`/`) — overview stats: agent count, task counts by status
- **Agents** (`/agents`) — list all agents, see status, click to manage
- **Agent Detail** (`/agents/:id`) — view config, start/stop/restart agent
- **Tasks** (`/tasks`) — list tasks with status filter (pending, running, done, failed)
- **Task Detail** (`/tasks/:id`) — task info, result/error, subtasks

### REST API

The server exposes a REST API used by the dashboard:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agents` | GET | List all agents |
| `/api/agents/:id` | GET | Get agent detail |
| `/api/agents/:id` | POST | Agent action (`{ "action": "start\|stop\|restart" }`) |
| `/api/tasks` | GET | List tasks (optional `?status=pending,done`) |
| `/api/tasks/:id` | GET | Get task with subtasks |
| `/api/stats` | GET | System-wide stats |
| `/health` | GET | Health check |
| `/ws` | WS | Real-time event stream |

### Custom UI Directory

You can point the server at a custom UI build directory via config:

```ts
const config: ServerConfig = {
  port: 3000,
  uiDir: '/path/to/custom/ui/dist',
  agents: [/* ... */],
};
```

## Development

- **Build:** `pnpm build`
- **Test:** `pnpm test`
- **Lint:** `pnpm lint`
- **Format:** `pnpm format`
- **Typecheck:** `pnpm typecheck`

## License

MIT
