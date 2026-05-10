# Ghost Engineer

Ghost Engineer is a Unix-first repository intelligence CLI powered by IBM Bob. It deterministically scans a project first, writes a local `.ghost/` workspace, and only then hands structured repository context to Bob for higher-level reasoning when you opt in with `--bob`.

The MVP is CLI-first: analyze, explain, document, plan tests, plan patches, report, and serve a local dashboard without requiring Bob for the deterministic core.

## Install

Ghost Engineer 0.1 is installed from source because npm package publishing is intentionally deferred.

```bash
curl -fsSL https://ghost-engineer.dev/install.sh | bash
```

The installer clones or updates the repository at `${HOME}/.ghost-engineer/source`, runs `npm ci`, builds the monorepo, and links the CLI globally with `npm link` from `apps/cli`. After that, open any repository and run:

```bash
ghost analyze .
```

Manual source install:

```bash
git clone https://github.com/deepdevjose/ghost-engineer.git
cd ghost-engineer
npm install
npm run build
cd apps/cli
npm link
cd ../..
ghost --version
```

IBM Bob is optional for local scanning, but required for `--bob` reasoning:

```bash
bob --help
```

## Development

```bash
npm install
npm run build
npm test
```

Run the web installer locally:

```bash
npm run build -w @ghost-engineer/web
npm run preview -w @ghost-engineer/web
```

Run the CLI from the workspace without linking:

```bash
npm run dev -w @ghost-engineer/cli -- analyze .
```

## Commands

```bash
ghost analyze .
ghost explain
ghost explain packages/core/src/index.ts
ghost docs
ghost testgen
ghost patch --goal "improve test coverage"
ghost report
ghost serve
```

Bob-backed commands preserve prompts and responses under `.ghost/bob/`:

```bash
ghost analyze . --bob
ghost explain packages/core/src/bob.ts --bob
ghost report . --bob
ghost patch --goal "prepare release" --bob
ghost bob . --task architecture
```

Useful Bob options:

```bash
--bob-command bob
--bob-model <model>
--bob-max-coins <coins>
--bob-trust
--bob-accept-license
```

## Generated Workspace

`ghost analyze .` writes deterministic artifacts without Bob:

```text
.ghost/
├── architecture.json
├── dependency-map.json
├── project-summary.md
├── bob-analysis.md
├── bob/
│   ├── architecture-prompt.md
│   └── architecture-response.md
├── patches/
│   └── patch-plan.md
├── docs/
│   ├── onboarding.md
│   └── test-plan.md
├── reports/
│   ├── initial-analysis.md
│   └── final-report.md
└── dashboard/
    └── index.html
```

The `bob/`, `patches/patch-plan.md`, and `docs/test-plan.md` files appear when the matching Bob, patch, or test-generation commands run. The deterministic baseline is `architecture.json`, `dependency-map.json`, `project-summary.md`, `bob-analysis.md`, `docs/onboarding.md`, `reports/initial-analysis.md`, `reports/final-report.md`, and `dashboard/index.html`.

## What Bob Adds

Ghost Engineer owns repository scanning, artifact generation, file inspection, risk detection, and the `.ghost/` workspace. IBM Bob is isolated behind `packages/core/src/bob.ts` and receives the reconstructed context for architecture explanations, file reasoning, report enrichment, test strategy, and patch strategy.

If Bob is unavailable, `ghost analyze .`, `ghost explain`, `ghost docs`, `ghost testgen`, `ghost patch --goal "..."`, `ghost report`, and `ghost serve` still work locally. Commands run with `--bob` fail clearly if the Bob executable cannot run, while preserving the deterministic artifacts and Bob prompt/response files that were produced before the failure.

## Release Scope

Implemented in 0.1:

- Static web installer with platform hints, source install commands, and downloadable `install.sh`
- Source-backed global CLI install through `npm link`
- Repository scanning with ignored build, dependency, cache, vendor, and `.ghost/` directories
- Language, framework, package manifest, script, entry point, dependency, and risk detection
- File-level explanation using imports, exports, declarations, and notes
- Markdown and JSON artifact generation under `.ghost/`
- IBM Bob CLI adapter with prompt/response artifacts
- Reviewable patch plans without automatic code edits
- Risk-driven test-plan generation
- Local static dashboard
- `node:test` coverage and GitHub Actions CI

Deferred after 0.1:

- Published npm package
- Automatic patch application
- Rich dashboard graph visualization
- Windows support outside WSL2
