# CEO Agent Example

A general-purpose CEO agent that triages requests and delegates work via the task queue.

## Setup

1. Create a Slack app with Socket Mode enabled
2. Set environment variables:

```bash
export SLACK_BOT_TOKEN=xoxb-...
export SLACK_APP_TOKEN=xapp-...
export OPENAI_API_KEY=sk-...
```

3. Run the agent:

```bash
npx snowbear start
```

## What it does

- Responds to Slack messages and @mentions
- Extends the `Agent` base class with custom `CeoAgent` implementation
- Registers tools at startup via `onReady()`: `create_task` and `list_tasks`
- Uses the task queue to delegate and track work
- Uses GPT-4o-mini for responses
