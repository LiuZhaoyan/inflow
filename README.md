# Inflow

韩语结构化精听 MVP：整段盲听 → 分段听写 → 渐进提示 → 理解自评与笔记 → 薄弱片段复习。

## 启动

需要 Node.js 20.9+。无需 API Key、账号或数据库。

```bash
npm ci
npm run dev
```

打开 http://localhost:3000。生产运行使用 `npm run build && npm start`。

## 实现范围

- Next.js 单页、原生音频播放器；分段循环、0.6–1.2 倍速。
- 听写按韩文字块比较，忽略空格、标点；空白也可提交。结果不直接泄露缺失字符。
- 提交后依次开放字数、部分字符、原文、中文参考译文。
- 自主查词、理解自评与笔记。无提示听写全对且自评理解，3 天后复习；其他情况进入薄弱列表，1 天后复习，也可提前练。
- 进度保存在当前浏览器 localStorage；刷新恢复。清理浏览器数据会丢失，没有跨设备同步。
- 背诵和复述由用户自行进行。听写匹配与自评不是客观语义理解测试，也不代表长期掌握。

## 文件

- `src/app/`：页面入口、样式与原 Logo。
- `src/listening/Practice.tsx`：学习页面与播放控制。
- `src/listening/practice.ts`：听写比较、掌握判定和存储校验。
- `src/listening/lesson.json`：首份素材及时间戳。
- `public/materials/`：真实录音节选和来源说明。

首份素材是 FSI 1968 年韩语课程对话 A，约 63 秒、10 个片段，带停顿版接连贯版。来源权威性指原编写机构；下载站是第三方档案镜像。教材年代较早，采用正式语体。参见 [素材来源与核验记录](public/materials/SOURCE.md)。录音元数据带非商业教育用途限制，不能把项目的 Apache-2.0 许可套用于该素材；商业发行前须解决授权或换用许可明确的素材。

只有一份素材用于验证完整流程；上传、自动分段、LLM 和大素材库不在此版中。后续维护素材时同时校对录音、原文和时间戳。

## 验证

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

人工试用：听完整素材，提交一次错误听写，逐级请求提示并自评；刷新确认恢复；从薄弱列表重新练习；完成全部片段后回听全文。

产品边界见 [MVP 定义](STRUCTURED_INTENSIVE_LISTENING_MVP.md)。代码许可见 [LICENSE](LICENSE)。
