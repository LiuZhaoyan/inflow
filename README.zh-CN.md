# Inflow

[English](README.md) | **简体中文** | [GitHub Releases](https://github.com/LiuZhaoyan/inflow/releases)

Inflow 是一款 Windows x64 桌面应用，用于通过本地音视频学习韩语和英语，提供中文释义和翻译。

## 本地开发

将仓库克隆到 Windows 本地磁盘。安装 Node.js 24 和 npm，并确保在 PowerShell 中可用 Conda。

```powershell
git clone https://github.com/LiuZhaoyan/inflow.git
cd inflow
.\scripts\setup_windows.ps1
npm ci
npm run desktop:build
npm run desktop:start
```

初始化脚本在 `.venv-win/` 创建 Python 3.12 环境，并将约 1.8 GB 的模型下载至 `.models/`。
开发基于 DeepSeek 的翻译、词义查询或故事生成功能时，在环境变量、`.env` 或 `.env.local` 中配置 `DEEPSEEK_API_KEY`。参阅[环境配置示例](.env.example)。

## 架构

Electron 负责运行静态构建的 Next.js 和 React 界面、管理本地媒体和 SQLite 数据、调用 Python 处理程序。处理程序使用 faster-whisper 识别语音，使用 Kiwi 分析韩语，使用 spaCy 分析英语。

- [贡献指南](CONTRIBUTING.md)介绍仓库结构和开发检查。
- [产品规格](docs/PRODUCT_SPEC.md)说明功能行为与范围。
- [项目现状](docs/PROJECT_STATUS.md)记录已实现功能和已知问题。
- [路线图](docs/ROADMAP.md)记录后续开发计划。

## 许可证

Inflow 的代码采用 [Apache 2.0 许可证](LICENSE)。内置词典使用[各自的许可证与署名声明](resources/dictionaries/NOTICE.md)。
