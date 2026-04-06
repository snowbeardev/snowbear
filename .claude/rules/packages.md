# Package Rules

- This is a pnpm monorepo with workspace protocol (`workspace:*`)
- Each package under `packages/` has its own `package.json` and `tsconfig.json`
- Cross-package dependencies use `@snowbear/<name>` with `workspace:*` version
- Build order is managed by TypeScript project references in root `tsconfig.json`
- Always run `pnpm build` after changing package exports or types
- New packages must be added to `pnpm-workspace.yaml` and root `tsconfig.json` references
