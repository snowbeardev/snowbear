# TypeScript Rules

- Always use `.js` extensions in import paths (Node16 module resolution requires this even for .ts files)
- Use `export type {}` for type-only exports, separate from value exports
- Prefer `interface` over `type` for object shapes that may be extended
- Use strict mode — no `any` unless absolutely necessary, prefer `unknown`
- All new code must pass `pnpm typecheck` before committing
