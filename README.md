# Inflow

**English** | [简体中文](README.zh-CN.md)

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

Automatic transcription, grouping, translation, and generated passages are learning assistance rather than authoritative answers.

## Run the desktop app

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

For development details, repository structure, architecture, and documentation guidance, see [CONTRIBUTING.md](CONTRIBUTING.md).

See [LICENSE](LICENSE) for the project license.
