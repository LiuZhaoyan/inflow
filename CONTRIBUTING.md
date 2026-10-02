# Contributing to Inflow

Inflow currently targets personal Windows use, but the repository is structured so implementation work can be understood and verified consistently.

## Development checks

Run the normal checks before considering an implementation complete:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

The repository still contains browser/API development paths and verification utilities from earlier implementation work. They remain useful for development and regression testing, but the Electron desktop path documented in the README represents the current product direction.

## Documentation

The repository documentation has three primary entry points:

- [Product Specification](docs/PRODUCT_SPEC.md) — **What should Inflow be?** Product behavior, scope, and boundaries.
- [Project Status](docs/PROJECT_STATUS.md) — **What is Inflow now?** Current architecture, implemented capabilities, persistence, processing, verification state, and known gaps.
- [Roadmap](docs/ROADMAP.md) — **What comes next?** Remaining work, priorities, and dependencies.

For active implementation work, task-local specs, research, tickets, decisions, and acceptance evidence live under `.scratch/<effort>/`. Completed scratch records are historical task memory and are not expected to describe the current system.

Repository-agent workflow rules live under [docs/agents](docs/agents/).

## Repository structure

The main implementation areas are:

```text
src/workspace/       Current learning workspace UI
src/listening/       Listening, reveal, vocabulary, and desktop bridge types
src/generation/      Generated-passage contracts and generation logic
desktop/             Electron host, operations, persistence, media, credentials
scripts/             Local media processing, model setup, desktop verification
docs/                Product, project-status, roadmap, and agent documentation
.scratch/            Task-level working history and acceptance evidence
```

## Architecture

The desktop architecture is intentionally split between the renderer and host:

```text
React / Next.js renderer
        ↓
DesktopBridge / Electron IPC
        ↓
DesktopOperations
        ↓
SQLite        Python worker        DeepSeek API
```

Start with [Project Status](docs/PROJECT_STATUS.md) if you want to understand the current implementation before changing code.
