# Code Style Rules

- Formatting is enforced by Prettier: single quotes, semicolons, trailing commas, 100 char width
- Run `pnpm format` to auto-fix, `pnpm format:check` to verify
- ESLint config is in `eslint.config.js` — prefix unused args with `_`
- Run `pnpm lint` before committing
- CI runs typecheck, build, test, lint, and format:check — all must pass
