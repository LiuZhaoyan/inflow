# Inflow

**English** | [简体中文](README.zh-CN.md)

Inflow is a Korean learning desktop application built around one learning loop:

```text
Media → Listening → Vocabulary → Generated Artifact → Vocabulary
```

Import Korean audio or video, practice it sentence by sentence, reveal only as much source text or translation as you need, collect unfamiliar vocabulary with its original context, and reuse selected words in generated Korean reading passages.

The project currently targets personal use on Windows. The desktop implementation is runnable from the repository; packaging it as a self-contained installed application is still future work.

English learning support is [specified](.scratch/english-learning/spec.md) for the same listening, vocabulary and reading cycle. The current runtime supports Korean; English implementation and acceptance remain future work.

## What can I do with it?

Inflow helps you turn Korean audio and video into an active learning workflow:

- listen to media sentence by sentence and reveal the Korean text or translation only when needed;
- collect and manage unfamiliar vocabulary together with its source and learning context, whether it came from media or generated artifacts;
- generate personalized Korean reading passages that reuse words you are learning;
- discover new vocabulary from those passages and continue the learning loop.

Transcriptions, translations, and generated content are learning aids rather than authoritative answers.

## Set up the LLM API key

Inflow uses DeepSeek for opt-in, context-aware Chinese translation and vocabulary meaning suggestions, and for generating Korean reading passages from selected vocabulary. Configure `DEEPSEEK_API_KEY` in the environment, `.env`, or `.env.local` before using these features.

LLM use is deliberately narrow to keep token consumption to a minimum. Translation and vocabulary lookup are requested only on explicit user action, send only the small amount of context needed for the task, and reuse successful results instead of making repeated requests. Ordinary transcription, sentence grouping, Korean word analysis, and dictionary lookup remain local; vocabulary lookup uses the bundled Korean-Chinese dictionary first and calls the LLM only when explicitly requested.

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

Local processing uses resources under `.models/` and the Windows Python environment under `.venv-win/`. These directories are not committed to Git.

For development details, repository structure, architecture, and documentation guidance, see [CONTRIBUTING.md](CONTRIBUTING.md).

See [LICENSE](LICENSE) for the project license.
