# Repository Instructions

Ghost Engineer is an npm-workspaces monorepo. Use `npm`, not pnpm or yarn, unless the workspace is intentionally migrated.

## Layout

- `apps/cli` contains the `ghost` command built with Commander.
- `apps/web` contains the static installer and downloadable `install.sh`.
- `packages/analyzers` owns deterministic repository scanning and file inspection.
- `packages/artifact-writer` owns `.ghost/` artifact rendering.
- `packages/core` orchestrates commands and isolates IBM Bob in `src/bob.ts`.
- `packages/shared` contains cross-package TypeScript contracts.
- `test/` contains `node:test` coverage for the built `dist/` output.

## Working Rules

- Keep deterministic analysis usable without IBM Bob.
- Keep Bob behind the adapter boundary in `packages/core/src/bob.ts`.
- Preserve prompt and response artifacts under `.ghost/bob/` for every Bob-backed path.
- Treat `.ghost/architecture.json`, `.ghost/dependency-map.json`, `.ghost/project-summary.md`, `.ghost/bob-analysis.md`, `.ghost/docs/onboarding.md`, `.ghost/reports/initial-analysis.md`, `.ghost/reports/final-report.md`, and `.ghost/dashboard/index.html` as the baseline workspace contract.
- Do not commit generated `.ghost/`, `dist/`, `node_modules/`, coverage, or local environment files.

## Verification

Run these before handing off changes:

```bash
npm run build
npm test
```

When command behavior changes, add or update tests in `test/` and remember that tests import built files from `dist/`, so `npm run build` must run first.
