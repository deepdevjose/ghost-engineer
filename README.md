# Ghost Engineer

Ghost Engineer is a Unix-first repository intelligence CLI powered by IBM Bob. It scans a project, reconstructs local architecture signals, writes a `.ghost/` workspace, and can hand that structured context to the Bob CLI for repository-wide reasoning.

## Setup

```bash
npm install
npm run build
npm test
```

Run the web installer locally:

```bash
c
npm run preview -w @ghost-engineer/web
```

Bob is optional for local scanning, but required for AI reasoning:

```bash
bob --help
```

## Commands

Run from the workspace during development:

```bash
npm run dev -w @ghost-engineer/cli -- analyze .
npm run dev -w @ghost-engineer/cli -- explain
npm run dev -w @ghost-engineer/cli -- explain packages/core/src/index.ts
npm run dev -w @ghost-engineer/cli -- docs
npm run dev -w @ghost-engineer/cli -- testgen
npm run dev -w @ghost-engineer/cli -- patch --goal "improve test coverage"
npm run dev -w @ghost-engineer/cli -- report
npm run dev -w @ghost-engineer/cli -- serve
```

Use Bob-backed commands by adding `--bob`:

```bash
npm run dev -w @ghost-engineer/cli -- analyze . --bob
npm run dev -w @ghost-engineer/cli -- explain packages/core/src/bob.ts --bob
npm run dev -w @ghost-engineer/cli -- report . --bob
npm run dev -w @ghost-engineer/cli -- patch . --goal "prepare release" --bob
npm run dev -w @ghost-engineer/cli -- bob . --task architecture
```

Useful Bob options:

```bash
--bob-command bob
--bob-model <model>
--bob-max-coins <coins>
--bob-trust
--bob-accept-license
```

After a build, the binary entry is `apps/cli/dist/index.js`.

## Generated Workspace

```text
.ghost/
├── architecture.json
├── dependency-map.json
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
│   └── final-report.md
└── dashboard/
    └── index.html
```

## Release Scope

- Static web installer with environment hints, install commands, and downloadable `install.sh`
- Repository scanning with ignored build/vendor directories
- Language, framework, package, script, entry point, and dependency detection
- Risk findings for missing tests, placeholder test scripts, thin README files, missing CI, and code TODO markers
- Markdown and JSON artifact generation
- IBM Bob CLI adapter with prompt/response artifacts
- Local static dashboard
- File-level explanation using imports, exports, declarations, and notes
- `node:test` coverage and GitHub Actions CI

## Planned

- Published npm package
- Web installer and install script
- Optional automatic patch application flow
- Richer dashboard graph visualization
