# Testing Rules

- Tests are colocated with source: `foo.ts` has `foo.test.ts` in the same directory
- Use Vitest — tests run with `pnpm test` from the repo root
- Test files must be under `packages/*/src/` to be picked up by vitest config
- Write unit tests for new public APIs and bug fixes
- Run `pnpm test` before committing to verify nothing breaks
