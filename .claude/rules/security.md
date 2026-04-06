# Security Rules

- Never commit secrets, API keys, or tokens — use environment variables
- `.env` files are gitignored; use `.env.example` for documentation
- Validate all external input at adapter boundaries (Slack events, HTTP requests)
- Use parameterized queries if/when database layer is added
- Review LLM prompt injection risks when handling user messages
