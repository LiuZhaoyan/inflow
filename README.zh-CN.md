# Inflow

[English](README.md) | **简体中文**

Inflow 是一款围绕一个核心学习循环构建的韩语学习桌面应用：

```text
媒体 → 听力 → 词汇 → 生成内容 → 词汇
```

导入韩语音频或视频，逐句进行练习，只在需要时显示适量的原文或翻译，在原始语境中收集陌生词汇，并将选中的词汇重新用于生成个性化的韩语阅读短文。

项目目前面向 Windows 上的个人使用。桌面端已经可以直接从仓库运行；将其打包为可独立安装、自包含的应用仍属于后续工作。

## 我能用它做什么？

当前桌面应用支持：

- 导入并保留本地音频/视频；
- 在本地进行韩语语音识别和句子切分；
- 整段和逐句播放、跳转、播放速度控制以及单句循环；
- 使用 Kiwi 生成的短语分组逐步显示韩语原文；
- 按需提供中文翻译；
- 在保留来源语境的情况下收集和修正词汇；
- 使用 SQLite 持久化学习状态、词汇和生成内容；
- 通过 DeepSeek 使用选中的词汇生成韩语短文；
- 从生成的短文中继续收集新词汇。

自动语音识别、分组、翻译和生成的短文都用于辅助学习，而不是权威答案。

## 运行桌面应用

当前开发环境使用 Node.js、Electron、Python 3.12 和本地处理模型。在 Windows 上，首先准备本地 Python 和模型环境：

```powershell
.\scripts\setup_windows.ps1
npm ci
```

然后构建并启动桌面应用：

```powershell
npm run desktop:build
npm run desktop:start
```

生成短文还需要由应用所有者在系统环境、`.env` 或 `.env.local` 中配置 `DEEPSEEK_API_KEY`。

本地语音识别和翻译使用 `.models/` 下的资源，以及 `.venv-win/` 下的 Windows Python 环境。这些目录不会提交到 Git。

开发检查、仓库结构、架构以及文档维护方式见 [CONTRIBUTING.md](CONTRIBUTING.md)。

项目许可证见 [LICENSE](LICENSE)。
