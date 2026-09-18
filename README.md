# Inflow

移动端优先的韩语精听页：导入音频或视频 → 自动切句 → 按意群揭晓 → 倍速／循环 → 查看中文译文。

当前实现使用本地模型，完整验收记录随测试写入 `docs/`；自动内容不是标准答案。原型中的底部扩展位用于译文。

## 启动（Linux / WSL）

需要 Node.js 20.9+ 和 Python 3.12。无需 API Key、账号或数据库。Python worker 由 Next.js 的 Node API 调用，不需要另外启动 Desktop 服务。

```bash
npm ci
python3 -m venv .venv
.venv/bin/pip install -r scripts/requirements-media.txt
.venv/bin/python scripts/setup_models.py
npm run dev
```

打开 http://localhost:3000。生产运行使用 `npm run build` 后执行 `npm start`。

首次安装会从 PyPI 和 Hugging Face 下载依赖、Whisper base 和 Argos 翻译权重，模型和 Python 环境共约 1 GB。后续处理使用本地文件，无第三方推理费用。安装脚本固定了翻译模型镜像版本和 SHA-256；官方 Argos 下载端点在本次准备期间返回 403，因此使用公开镜像。模型及环境分别位于被 Git 忽略的 `.models/` 和 `.venv/`。

**处理位置：**浏览器把选定媒体发送到当前 Inflow / Next.js 服务所在机器，Python 在该机器转写与翻译，不把媒体或原文发送给第三方。临时媒体在请求结束后清理。手机访问电脑上的 Inflow 时，处理发生在电脑上，不是手机内推理。

此版本针对本地单用户 Linux / WSL 运行验证。需要可用 Python 子进程和本地模型目录；普通静态托管或短时限 Serverless 环境不能直接使用这套处理路径。

## 使用

1. 点击 `＋` 或“选择媒体”，选择浏览器支持的音频或视频；可先试听。
2. 点击“开始处理”。当前限制为 50 MB、10 分钟以内，处理失败仍可播放原媒体并重试。
3. 用上一句／下一句定位当前范围。默认隐藏原文；播放到句尾停止，开启循环则重播当前句。
4. 长按 **reveal**，滑向少量意群／更多意群／全句后松开；滑出选项松开取消。桌面可点击选择，也支持键盘。
5. 可隐藏原文、调整 0.5–2 倍速，或独立展开底部中文译文。切句后原文和译文都隐藏。

本轮不保存进度、媒体处理结果或笔记；刷新需要重新导入和处理。不包含回听列表、PWA、Desktop 服务或账号。

## 本地处理与局限

- **转写／时间：** faster-whisper base，CPU int8，韩语识别，按真实词时间戳、句末标点及停顿切分。老录音、噪声、人名和连读可能识别错误。
- **意群：** Kiwi 韩语词法分析，在助词及标点边界切出完整语法短语，不按固定词数截断。它不是完整语义理解，对习语、歧义和错误转写仍有限制。
- **译文：** Argos 韩→英→中模型经 CTranslate2 本地推理，经过英语中转可能丢失细节。
- **资源：** 每次处理有 10 分钟超时；API 同进程内一次执行一项推理，繁忙时提示稍后重试。没有账号或多用户任务系统。
- **材料与模型：**项目代码许可不自动适用于媒体或模型。FSI 录音条件见[素材来源](public/materials/SOURCE.md)；模型来源、镜像与校验值见[安装脚本](scripts/setup_models.py)及下载目录里的上游 README。英中模型包注明原始 OPUS 模型为 CC-BY 4.0；韩英包的 README 列出语料来源，本项目不代替上游作再分发授权承诺。

## 验证

```bash
npm test
.venv/bin/python -m unittest discover -s scripts -p 'test_*.py'
npm run lint
npm run typecheck
npm run build
```

主要验收必须用无字幕音频与视频走完真实处理链路。`lesson.json` 及旧听写逻辑保留为历史代码，当前页面不读取它们生成文本或译文。

## 文档与代码

- [本次任务与验收标准](docs/INTENSIVE_LISTENING_TASK.md)
- [产品 Spec](docs/PRODUCT_SPEC.md) · [ROADMAP](docs/ROADMAP.md) · [历史 MVP](docs/STRUCTURED_INTENSIVE_LISTENING_MVP.md)
- `src/listening/Practice.tsx`：媒体与学习交互；`RevealMenu.tsx`：触摸与键盘菜单。
- `src/app/api/`：转写与翻译入口；`src/listening/processing.ts`：处理结果校验。
- `scripts/media_processor.py`：本地转写、意群和翻译；`scripts/setup_models.py`：模型安装。

后续任务文档统一放在 `docs/` 并纳入 Git。代码许可见 [LICENSE](LICENSE)。
