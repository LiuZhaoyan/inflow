# Inflow

Inflow is a Korean learning desktop application built around one learning loop:

```text
Media → Listening → Vocabulary → Generated Artifact → Vocabulary
```

Import Korean audio or video, practice it sentence by sentence, reveal only as much source text or translation as you need, collect unfamiliar vocabulary with its original context, and reuse selected words in generated Korean reading passages.

The project currently targets personal use on Windows. The desktop implementation is runnable from the repository; packaging it as a self-contained installed application is still future work.

## What can I do with it?

The current desktop application supports:

- importing and retaining local audio/video;
- local Korean transcription and sentence segmentation;
- full-media and sentence playback, seeking, speed control, and sentence looping;
- progressive Korean text reveal using Kiwi-derived phrase groups;
- on-demand Chinese translation;
- source-linked vocabulary collection and correction;
- persistent learning state, vocabulary, and generated artifacts in SQLite;
- generating short Korean passages from selected vocabulary through DeepSeek;
- collecting new vocabulary from generated passages.

Automatic transcription, grouping, translation, and generated passages are learning assistance rather than authoritative answers.## Run the desktop app

The current development environment uses Node.js, Electron, Python 3.12, and local processing models. On Windows, prepare the local Python/model environment first:

```powershell
.\scripts\setup_windows.ps1
npm ci
```

Then build and launch the desktop application:

```powershell
npm run desktop:build
npm run desktop:start
```

Passage generation additionally requires an owner-configured `DEEPSEEK_API_KEY` in the environment, `.env`, or `.env.local`.

Local transcription and translation use resources under `.models/` and the Windows Python environment under `.venv-win/`. These directories are not committed to Git.

For normal development checks:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

The repository still contains browser/API development paths and verification utilities from earlier implementation work. They are useful for development and regression testing, but the Electron desktop path above represents the current product direction.## Where should I continue reading?

The repository documentation has three primary entry points:

- [Product Specification](docs/PRODUCT_SPEC.md) — **What should Inflow be?** Product behavior, scope, and boundaries.
- [Project Status](docs/PROJECT_STATUS.md) — **What is Inflow now?** Current architecture, implemented capabilities, persistence, processing, verification state, and known gaps.
- [Roadmap](docs/ROADMAP.md) — **What comes next?** Remaining work, priorities, and dependencies.

For active implementation work, task-local specs, research, tickets, decisions, and acceptance evidence live under `.scratch/<effort>/`. Completed scratch records are historical task memory and are not expected to describe the current system.

Repository-agent workflow rules live under [docs/agents](docs/agents/).

## Where is the code?

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

See [LICENSE](LICENSE) for the project license.
