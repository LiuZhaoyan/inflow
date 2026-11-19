# Inflow

**English** | [简体中文](README.zh-CN.md) | [GitHub Releases](https://github.com/LiuZhaoyan/inflow/releases)

Inflow is a Windows x64 desktop app for learning Korean and English from local audio and video, with Chinese definitions and translations.

## Development

Use a Windows-local checkout with Node.js 24, npm, and Conda available in PowerShell.

```powershell
git clone https://github.com/LiuZhaoyan/inflow.git
cd inflow
.\scripts\setup_windows.ps1
npm ci
npm run desktop:build
npm run desktop:start
```

Setup creates the Python 3.12 environment in `.venv-win/` and downloads about 1.8 GB of models to `.models/`.
To develop DeepSeek-backed translation, vocabulary lookup, or story generation, set `DEEPSEEK_API_KEY` in the environment, `.env`, or `.env.local`. See the [example environment file](.env.example).

## Architecture

Electron serves the static Next.js and React renderer, manages local media and SQLite, and runs the Python worker. The worker uses faster-whisper for transcription, Kiwi for Korean analysis, and spaCy for English analysis.

- [Contributing](CONTRIBUTING.md) includes the repository structure and development checks.
- [Product specification](docs/PRODUCT_SPEC.md) describes behavior and scope.
- [Project status](docs/PROJECT_STATUS.md) records implementation and known gaps.
- [Roadmap](docs/ROADMAP.md) tracks upcoming work.

## License

Inflow's code is licensed under [Apache 2.0](LICENSE). Bundled dictionaries have [separate licenses and attribution](resources/dictionaries/NOTICE.md).
