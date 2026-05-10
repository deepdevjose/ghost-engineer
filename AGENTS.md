# Repository Instructions

Ghost Engineer is an npm-workspaces monorepo. Use `npm`, not pnpm or yarn, unless the workspace is intentionally migrated.

## Layout

- `apps/cli` contains the `ghost` command built with Commander.
- `apps/web` contains the static installer and downloadable `install.sh`.
- `packages/tui` owns the Ink/React terminal workbench launched by `ghost` with no arguments.
- `packages/analyzers` owns deterministic repository scanning and file inspection.
- `packages/artifact-writer` owns `.ghost/` artifact rendering.
- `packages/core` orchestrates commands, isolates IBM Bob execution in `src/bob.ts`, and keeps Bob availability/setup detection in `src/bob-status.ts`.
- `packages/shared` contains cross-package TypeScript contracts.
- `test/` contains `node:test` coverage for the built `dist/` output.

## Working Rules

- Keep deterministic analysis usable without IBM Bob.
- Preserve `ghost` with no arguments as the primary human-facing Workbench TUI; preserve explicit command mode for automation.
- Keep TUI services mapped to `@ghost-engineer/core`; do not duplicate analyzer, artifact, Bob setup, or command orchestration logic inside presentation components.
- Keep Bob behind the adapter boundary in `packages/core/src/bob.ts`.
- Keep Bob setup/status logic separate from Bob execution.
- Present Bob as central to the complete Ghost Engineer workflow, while preserving local-first deterministic analysis.
- Do not imply IBM Bob is bundled with Ghost Engineer, permanently free, or exempt from IBM authentication, usage limits, trials, plans, or licenses.
- Keep `ghost setup bob --install` on the official IBM installer command, but avoid `sudo` and prefer process-local `npm_config_prefix=$HOME/.local` when the active npm global prefix is not user-writable.
- Keep CLI, web, README, and `docs/ghost_engineer.md` consistent when changing Bob setup or workflow copy.
- Use the terminal formatter in `apps/cli/src/terminal.ts` for CLI presentation. Do not scatter raw ANSI escape codes through command handlers, and keep generated `.ghost/` artifacts free of terminal styling.
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
