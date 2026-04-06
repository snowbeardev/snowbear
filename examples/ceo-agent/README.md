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
npx tsx node_modules/.bin/snowbear start --config snowbear.config.ts
```

## What it does

- Responds to Slack messages and @mentions
- Can create sub-tasks to break down complex requests
- Can check the task queue status
- Uses GPT-4o-mini for responses
