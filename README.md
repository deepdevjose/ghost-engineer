# Ghost Engineer

Ghost Engineer is a Unix-first repository intelligence CLI powered by IBM Bob. It reconstructs repository context locally, writes a `.ghost/` workspace, and then hands that structured intelligence to IBM Bob for codebase-wide reasoning, documentation, test planning, refactor guidance, and engineering reports.

Deterministic local analysis works without Bob. The complete Ghost Engineer workflow is Bob-powered.

## Install Ghost Engineer

Ghost Engineer 0.1 is installed from source because npm package publishing is intentionally deferred.

```bash
curl -fsSL https://ghost-engineer.pages.dev/install.sh | bash
```

The installer clones or updates the repository at `${HOME}/.ghost-engineer/source`, runs `npm ci`, builds the monorepo, and links the CLI globally with `npm link` from `apps/cli`.

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

## Connect IBM Bob

IBM Bob Shell is a separate IBM product. It is not bundled with Ghost Engineer and may require its own trial, plan, usage limits, or license.

After installing Ghost Engineer, run:

```bash
ghost setup bob
```

If Bob Shell is missing, Ghost shows the official IBM Bob Shell installer command:

```bash
curl -fsSL https://bob.ibm.com/download/bobshell.sh | bash
```

Ghost does not install external software silently. If you want Ghost to run the official installer explicitly, use:

```bash
ghost setup bob --install
```

Bob Shell requires Node.js 22.15.0 or later. Interactive Bob Shell sessions use IBMid authentication by default, so after installation run:

```bash
bob
```

Sign in with your IBMid when prompted, then return to your repository and run Ghost with Bob.

Official IBM references: [Bob Shell installation](https://bob.ibm.com/docs/shell/getting-started/install-and-setup), [interactive Bob Shell sign-in](https://bob.ibm.com/docs/shell/getting-started/start-bobshell-interactive), and [IBM Bob pricing/trial information](https://bob.ibm.com/pricing).

## Use Ghost After Restarting

Once linked, `ghost` is available from your shell. After restarting your machine, open any repository:

```bash
cd any-repository
ghost analyze .
```

If Bob is not installed yet, Ghost still writes local context and prints the next step:

```text
IBM Bob not detected. Local context is ready. Run `ghost setup bob` to unlock Bob-powered reasoning.
```

Then run the complete Bob-powered path:

```bash
ghost setup bob
ghost analyze . --bob
ghost explain --bob
ghost report . --bob
```

## Commands

Local deterministic commands:

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

Bob-powered commands:

```bash
ghost analyze . --bob
ghost explain packages/core/src/bob.ts --bob
ghost docs . --bob
ghost testgen . --bob
ghost patch --goal "prepare release" --bob
ghost report . --bob
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

`ghost analyze .` writes deterministic artifacts first. Bob-backed commands add prompt and response artifacts under `.ghost/bob/`.

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

## Recommended Hackathon Demo

```bash
ghost analyze .
ghost setup bob
ghost analyze . --bob
ghost explain packages/core/src/bob.ts --bob
ghost testgen . --bob
ghost patch --goal "prepare the MVP for release" --bob
ghost report . --bob
ghost serve
```

This shows the required product story: deterministic recovery first, guided Bob onboarding, and IBM Bob reasoning over Ghost's reconstructed repository intelligence.

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

## Release Scope

Implemented in 0.1:

- Static web installer with platform hints, Ghost install commands, Bob setup guidance, and downloadable `install.sh`
- Source-backed global CLI install through `npm link`
- `ghost setup bob` for Bob Shell detection, Node.js requirement checks, installer guidance, and IBMid sign-in next steps
- Repository scanning with ignored build, dependency, cache, vendor, and `.ghost/` directories
- Language, framework, package manifest, script, entry point, dependency, and risk detection
- File-level explanation using imports, exports, declarations, and notes
- Markdown and JSON artifact generation under `.ghost/`
- IBM Bob CLI adapter with prompt/response artifacts
- Graceful Bob-missing behavior for `--bob` commands
- Reviewable patch plans without automatic code edits
- Risk-driven test-plan generation
- Local static dashboard
- `node:test` coverage and GitHub Actions CI

Deferred after 0.1:

- Published npm package
- Automatic patch application
- Rich dashboard graph visualization
- Windows support outside WSL2
