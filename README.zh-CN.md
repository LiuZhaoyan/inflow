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

常规开发检查：

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

仓库中仍保留了早期实现阶段使用的浏览器/API 开发路径和验证工具。它们仍可用于开发和回归测试，但上面的 Electron 桌面端路径代表当前的产品方向。

## 接下来应该阅读什么？

仓库文档有三个主要入口：

- [产品规格](docs/PRODUCT_SPEC.md) — **Inflow 应该是什么？** 产品行为、范围和边界。
- [项目状态](docs/PROJECT_STATUS.md) — **Inflow 现在是什么？** 当前架构、已实现能力、持久化、处理流程、验证状态和已知缺口。
- [路线图](docs/ROADMAP.md) — **接下来做什么？** 剩余工作、优先级和依赖关系。

正在进行的实现工作，其任务级规格、研究、工单、决策和验收证据保存在 `.scratch/<effort>/` 下。已经完成的 scratch 记录属于历史任务记忆，不要求继续描述当前系统状态。

仓库中供 Agent 使用的工作流规则位于 [docs/agents](docs/agents/)。

## 代码在哪里？

主要实现区域如下：

```text
src/workspace/       当前学习工作区 UI
src/listening/       听力、渐进显示、词汇以及桌面桥接类型
src/generation/      生成短文的契约与生成逻辑
desktop/             Electron 宿主、操作层、持久化、媒体与凭据
scripts/             本地媒体处理、模型安装与桌面端验证
docs/                产品、项目状态、路线图和 Agent 文档
.scratch/            任务级工作历史与验收证据
```

桌面端架构有意将渲染层与宿主层分开：

```text
React / Next.js 渲染层
        ↓
DesktopBridge / Electron IPC
        ↓
DesktopOperations
        ↓
SQLite        Python worker        DeepSeek API
```

如果你准备在修改代码前了解当前实现，请先阅读 [项目状态](docs/PROJECT_STATUS.md)。

项目许可证见 [LICENSE](LICENSE)。
