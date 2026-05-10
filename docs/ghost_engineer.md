# Ghost Engineer
**AI-Powered Software Recovery & Evolution Platform**

Powered by IBM Bob

## Overview

Ghost Engineer is a Unix-first, AI-native developer platform that helps engineers recover, understand, document, and evolve complex software systems using IBM Bob.

The platform combines:

- a CLI-first workflow
- repository-wide AI reasoning
- architectural reconstruction
- contextual code understanding
- autonomous engineering assistance

Ghost Engineer is designed primarily for:

- Linux
- macOS

Windows support is planned through WSL2.

## Core Idea

Ghost Engineer acts as an AI-powered software cognition and recovery system.

Instead of functioning as a simple code assistant, Ghost Engineer analyzes complete repositories and reconstructs the architectural intelligence behind the system.

It helps developers:

- understand unfamiliar projects faster
- reduce onboarding friction
- recover undocumented systems
- detect technical debt
- safely evolve software using IBM Bob

## Problem

Modern repositories often become difficult to maintain because:

- documentation is incomplete
- architecture is unclear
- onboarding takes too long
- technical debt accumulates
- critical knowledge exists only in developers' heads

When developers leave projects, systems become risky to modify.

Ghost Engineer addresses this problem by recovering engineering knowledge directly from the repository itself.

## Solution

Ghost Engineer transforms repositories into navigable software intelligence systems.

Using IBM Bob, the platform can:

- reconstruct architecture
- explain execution flow
- analyze dependencies
- detect bottlenecks
- generate documentation
- create tests
- suggest refactors
- generate contextual patch plans

## Product Architecture

### 1. Web Installer

Ghost Engineer provides a lightweight installation website that simplifies setup.

The installer:

- detects the user environment
- provides guided installation
- verifies dependencies
- installs the Ghost CLI globally from the source checkout for Release 0.1
- directs users into IBM Bob Shell setup for the complete Bob-powered workflow

Example installation:

```bash
curl -fsSL https://ghost-engineer.pages.dev/install.sh | bash
```

The installer verifies Node.js `22.15.0` or newer and prints concrete next-step commands when Node.js is missing or below baseline.

For local source installation:

```bash
git clone https://github.com/deepdevjose/ghost-engineer.git
cd ghost-engineer
npm install
npm run build
mkdir -p ~/.local/bin
cat > ~/.local/bin/ghost <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
INSTALL_DIR="${GHOST_ENGINEER_HOME:-${HOME}/.ghost-engineer/source}"
exec node "${INSTALL_DIR}/apps/cli/dist/index.js" "$@"
EOF
chmod +x ~/.local/bin/ghost
export PATH="$HOME/.local/bin:$PATH"
ghost --version
```

After installation, the `ghost` command becomes globally available on the system by adding `~/.local/bin` to your shell's PATH (automatic on most modern Unix systems after terminal restart).

IBM Bob Shell is set up separately:

```bash
ghost setup bob
```

Ghost Engineer shows the official IBM Bob Shell installer command when Bob is missing:

```bash
curl -fsSL https://bob.ibm.com/download/bobshell.sh | bash
```

Ghost Engineer does not install external software silently. Users can explicitly request installer execution with:

```bash
ghost setup bob --install
```

Before executing the official installer, Ghost checks `npm prefix -g`. If the configured npm global prefix is not writable by the current user, Ghost keeps the IBM installer command but runs it with a process-local user-owned npm environment:

```bash
npm_config_prefix=$HOME/.local PATH=$HOME/.local/bin:$PATH curl -fsSL https://bob.ibm.com/download/bobshell.sh | bash
```

This avoids `sudo`, does not permanently rewrite npm configuration by default, and lets Ghost print shell-specific PATH guidance when `~/.local/bin` is not available from the current shell.

Bob Shell requires Node.js 22.15.0 or later, and Ghost Engineer aligns to the same runtime baseline for the complete workflow. Interactive Bob Shell sessions use IBMid authentication by default. IBM Bob is a separate IBM product and is not bundled with Ghost Engineer.

### 2. Ghost CLI (Core Platform)

The CLI is the main product experience.

Developers enter a repository and execute:

```bash
cd Vision-Language-Runtime
ghost analyze .
```

Ghost Engineer then:

- scans the repository
- indexes the project
- reconstructs architecture
- analyzes dependencies
- builds a cognitive map
- prepares structured context for IBM Bob
- guides Bob setup when Bob is missing
- uses IBM Bob for repository-wide reasoning in the complete workflow

## Example Commands

### Analyze Repository

```bash
ghost analyze .
```

### Explain System

```bash
ghost explain
```

### Explain File

```bash
ghost explain src/runtime/webgpuAdapter.ts
```

### Generate Documentation

```bash
ghost docs
```

### Generate Tests

```bash
ghost testgen
```

### Generate Optimization Patch

```bash
ghost patch --goal "reduce memory overhead"
```

### Generate Final Report

```bash
ghost report
```

### Set Up IBM Bob

```bash
ghost setup bob
```

## Repository Intelligence

Ghost Engineer analyzes:

- project structure
- frameworks
- dependencies
- execution flow
- runtime architecture
- critical modules

Example output:

| Field | Value |
| --- | --- |
| Project Type | Web-native Vision-Language Runtime |
| Core Pipeline | Camera -> Tensor Preprocessing -> WebGPU -> Decoder -> Caption Output |
| Risk Areas | High tensor allocation frequency; GPU synchronization bottlenecks; weak test coverage |

## AI Software Intelligence

IBM Bob acts as the reasoning engine behind the platform.

Ghost Engineer uses Bob to:

- understand complete repository context
- explain complex code
- reconstruct architecture
- detect risky patterns
- suggest improvements
- generate patch strategies
- automate engineering workflows

Bob is deeply integrated into the complete platform workflow and serves as the core reasoning partner after Ghost reconstructs deterministic local context.

## AI Patch Generation

Ghost Engineer can generate contextual engineering improvements.

Example:

```bash
ghost patch --goal "optimize frame processing pipeline"
```

Release 0.1 generated result:

- identifies files to inspect
- proposes implementation steps
- recommends tests and rollback notes
- preserves the plan for human review without applying code automatically

## Local Intelligence Workspace

Ghost Engineer creates a local `.ghost/` workspace inside the repository.

Example structure:

```text
.ghost/
├── architecture.json
├── dependency-map.json
├── project-summary.md
├── bob-analysis.md
├── patches/
├── docs/
├── reports/
│   ├── initial-analysis.md
│   └── final-report.md
└── dashboard/
```

This workspace stores all generated software intelligence artifacts.

## Optional Local Dashboard

Ghost Engineer can launch a local dashboard server.

Command:

```bash
ghost serve
```

Release 0.1 opens a browser-based workspace that shows:

- project classification
- repository metrics
- language distribution
- entry points
- risk findings

Richer architecture graphs, dependency-map visualization, and Bob reasoning views are deferred after 0.1.

## Supported Platforms

| Platform | Status |
| --- | --- |
| Linux | Primary support |
| macOS | Primary support |
| Windows | Planned / WSL2 |

Ghost Engineer is optimized for Unix-based engineering environments due to its CLI-first workflow and systems-engineering focus.

## Example Use Case

Ghost Engineer analyzes the Vision-Language Runtime repository and can:

- reconstructs the multimodal inference pipeline
- explains WebGPU execution flow
- detects runtime bottlenecks
- generate optimization patch plans
- creates onboarding documentation
- produces a complete software recovery report

## Vision

Ghost Engineer aims to become an AI-native software intelligence platform capable of:

- preserving engineering knowledge
- accelerating onboarding
- reducing software maintenance risk
- enabling safe software evolution at scale

## Short Pitch

Ghost Engineer is a Unix-first AI-powered software recovery platform that uses IBM Bob to reconstruct, explain, document, and guide the evolution of complex repositories.

## Tagline

Recover software intelligence. Evolve systems with confidence.

## Release Delivery Cut

The first release is a CLI-first product that proves the workflow end to end and integrates with the installed IBM Bob CLI.

### Release 0.1

- `apps/web` provides the web installer with platform hints, install commands, source setup commands, and a downloadable `install.sh`.
- `ghost analyze .` scans a repository and writes `.ghost/architecture.json`, `.ghost/dependency-map.json`, `.ghost/project-summary.md`, `.ghost/bob-analysis.md`, onboarding docs, `.ghost/reports/initial-analysis.md`, a final report, and a dashboard page. If Bob is missing, it completes local work and points the user to `ghost setup bob`.
- `ghost setup bob` checks Bob Shell availability, checks Node.js against Bob Shell's 22.15.0 minimum requirement, shows the official IBM Bob Shell installer command, explains IBMid sign-in, and makes clear that IBM Bob is a separate IBM product.
- `ghost setup bob --install` runs the official IBM Bob Shell installer only when explicitly requested, and uses a temporary user-owned npm prefix when the default global prefix would fail with permissions errors.
- `ghost analyze . --bob` sends the structured repository context to IBM Bob and writes prompt/response artifacts under `.ghost/bob/`.
- `ghost explain` summarizes the detected repository architecture.
- `ghost explain <file>` summarizes imports, exports, declarations, and basic file-level notes.
- `ghost explain <file> --bob` adds IBM Bob reasoning for the selected file.
- `ghost docs` regenerates onboarding documentation.
- `ghost testgen` creates a risk-driven test plan.
- `ghost patch --goal "<goal>"` creates a reviewable patch plan.
- `ghost patch --goal "<goal>" --bob` asks IBM Bob for a deeper implementation strategy without applying code automatically.
- `ghost report` regenerates the final report.
- `ghost bob --task architecture` runs Bob directly against Ghost's repository intelligence context.
- `ghost serve` serves the local dashboard from `.ghost/dashboard`.
- CLI output uses restrained terminal hierarchy, success/warning/error markers, color when interactive, and plain readable output when `NO_COLOR`, `--no-color`, or redirected streams disable color.
- `npm test` runs real `node:test` coverage across the CLI, analyzer, artifact writer, core orchestration, Bob adapter path, and shared package entry.
- GitHub Actions runs install, build, and test checks.

### Deferred After 0.1

- Automated code patch generation
- Global npm publishing
- Richer dashboard graph visualization
