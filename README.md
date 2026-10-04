# Inflow

**English** | [简体中文](README.zh-CN.md)

Inflow is a Korean and English learning desktop application built around one learning loop:

```text
Media → Listening → Vocabulary → Generated Artifact → Vocabulary
```

Import Korean or English audio or video, practice it sentence by sentence, mask complete meaning groups, collect unfamiliar vocabulary with its original context, and reuse selected words in reading passages in the same language. Meanings and translations use Chinese.

The project currently targets personal use on Windows. The desktop implementation is runnable from the repository; packaging it as a self-contained installed application is still future work.

Each import confirms its source language and remembers the last confirmed choice, even if the file cannot be imported. Media, vocabulary and saved stories have independent All/Korean/English filters; filtering preserves selected targets. Generation requires all targets to use one language.

## What can I do with it?

Inflow helps you turn Korean and English audio and video into an active learning workflow:

- listen to media sentence by sentence, mask source phrases and request Chinese translation when needed;
- collect and manage unfamiliar vocabulary together with its source and learning context, whether it came from media or generated artifacts;
- generate personalized Korean or English reading passages that reuse words you are learning;
- discover new vocabulary from those passages and continue the learning loop.

Transcriptions, translations, and generated content are learning aids rather than authoritative answers.

## Set up the LLM API key

Inflow uses DeepSeek for opt-in, context-aware Chinese translation and vocabulary meaning suggestions, and for generating reading passages from selected vocabulary. Configure `DEEPSEEK_API_KEY` in the environment, `.env`, or `.env.local` before using these features.

LLM use is deliberately narrow to keep token consumption to a minimum. Translation and vocabulary lookup are requested only on explicit user action, send only the small amount of context needed for the task, and reuse successful results instead of making repeated requests. Ordinary transcription, sentence grouping, word analysis, and dictionary lookup remain local. Korean analysis uses Kiwi; English uses a prepared spaCy pipeline. Bundled Korean-Chinese and English-Chinese dictionaries provide sense candidates first. Their separate licenses and provenance are in [the dictionary notices](resources/dictionaries/NOTICE.md).

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

Existing checkouts adding English should rerun `scripts/setup_windows.ps1` to install the pinned spaCy dependency and English pipeline. Normal local processing uses only prepared resources and does not download models. English supports complete words, contractions and hyphenated forms; whitespace-containing phrases and frequent multilingual code-switching are outside this feature.

For development details, repository structure, architecture, and documentation guidance, see [CONTRIBUTING.md](CONTRIBUTING.md).

See [LICENSE](LICENSE) for the project license.
