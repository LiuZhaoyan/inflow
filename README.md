# Inflow

**English** | [简体中文](README.zh-CN.md)

Inflow is a Korean and English learning desktop application built around one learning loop:

```text
Media → Listening → Vocabulary → Generated Artifact → Vocabulary
```

Import Korean or English audio or video, practice it sentence by sentence, mask complete meaning groups, collect unfamiliar vocabulary with its original context, and reuse selected words in reading passages in the same language. Meanings and translations use Chinese.

The project targets personal use on Windows. A Windows x64 package includes the Electron application and standalone processing worker; the learner does not need Node.js, Python, a development checkout, or a running web server.

Each import confirms its source language and remembers the last confirmed choice, even if the file cannot be imported. Media, vocabulary and saved stories have independent All/Korean/English filters; filtering preserves selected targets. Generation requires all targets to use one language.

## What can I do with it?

Inflow helps you turn Korean and English audio and video into an active learning workflow:

- listen to media sentence by sentence, mask source phrases and request Chinese translation when needed;
- collect and manage unfamiliar vocabulary together with its source and learning context, whether it came from media or generated artifacts;
- generate personalized Korean or English reading passages that reuse words you are learning;
- discover new vocabulary from those passages and continue the learning loop.

Transcriptions, translations, and generated content are learning aids rather than authoritative answers.

## Set up the LLM API key

Inflow uses DeepSeek for opt-in, context-aware Chinese translation and vocabulary meaning suggestions, and for generating reading passages from selected vocabulary. In the installed app, open Settings → LLM, enter your API key, and Save. The key is encrypted locally and is never displayed again. Development checkouts can also use `DEEPSEEK_API_KEY` in the environment, `.env`, or `.env.local`.

LLM use is deliberately narrow to keep token consumption to a minimum. Translation and vocabulary lookup are requested only on explicit user action, send only the small amount of context needed for the task, and reuse successful results instead of making repeated requests. Ordinary transcription, sentence grouping, word analysis, and dictionary lookup remain local. Korean analysis uses Kiwi; English uses a prepared spaCy pipeline. Bundled Korean-Chinese and English-Chinese dictionaries provide sense candidates first. Their separate licenses and provenance are in [the dictionary notices](resources/dictionaries/NOTICE.md).

## Install the Windows package

Keep `install-desktop.ps1` beside the complete `Inflow-win32-x64` folder, then run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install-desktop.ps1
```

This personal-use installer copies the app to `%LOCALAPPDATA%\Programs\Inflow` and creates a Start menu shortcut, without administrator access. Open Inflow, go to Settings → Processing models, and choose Download missing models. Initial preparation requires internet access and about 1.8 GB of model downloads. Ordinary transcription, grouping and dictionary lookup then run offline. Online translations, contextual meanings and new stories require the configured DeepSeek key and a connection.

Learning data, managed media, models and the encrypted key live under `%APPDATA%\Inflow`, separately from the application folder. To reinstall, close Inflow and remove the old application folder first; leave this data directory intact. The installer intentionally refuses to overwrite an existing directory. Uninstall by removing the application folder and its Start menu shortcut; delete the data directory only if you also intend to erase learning records.

Import predominantly Korean or English media of at most 10 minutes. MP3, MP4, M4A, WAV, OGG, WebM, MOV, FLAC and AAC appear in the picker, but decoding and playback depend on the actual codec; every extension/codec combination has not been accepted. Chinese/spaced paths, a real 155.775-second Korean WebM, sentence seeking and looping have been exercised. Moving the original does not affect the managed copy. Missing managed media offers relinking; cancellation and failed generation retain earlier learning material.

The observed runtime is Windows 11 x64 (build 26200), Electron 44.5.1 and bundled Python 3.12.14. The package includes Python and Visual C++ runtime DLLs. Acceptance removes development tools from PATH and starts in the installed directory, but this is not a clean virtual-machine qualification or a claim that every Windows version/codec works. Transcription and sentence boundaries can be wrong; local Korean-to-Chinese reference translation uses an English pivot. See the [delivery report](.scratch/archive/desktop-learning/windows-packaging-acceptance.md) for evidence and limits.

## Build the Windows package

Prepare the development environment below, then install PyInstaller in the native Windows environment and build:

```powershell
.\.venv-win\python.exe -m pip install pyinstaller
npm run desktop:package
```

The package and installer script are written to `build/package/`. Model weights are prepared in the learner's profile rather than bundled with the app. This is an unsigned personal installation, with no public release or automatic update infrastructure.

## Run from a development checkout

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
