# Learn Chat UI Handoff

更新时间：2026-08-10

## 最新交接（以本节为准）

### `/vocabulary` 最新交接（2026-08-10）

本页已按 Learn Chat 的视觉语言做试点，当前修改已直接落地代码。后续继续修改前，先保持以下边界：只改用户点名的区域，不重做 Story 展开抽屉。

#### 已确认的页面结构

- Header 使用 Learn 风格紧凑白色工具条，高度约 `52px`，标题为 `Vocabulary`，副标题为 `STUDY COLLECTION`。
- 删除 `Your Space`、页面主标题和描述文案。
- 语言筛选标签与 Story 入口移动到 Header 下方的 sticky 区域，滚动时持续显示。
- 标签保留原来的白底、边框、阴影和文字样式，只旋转为垂直悬挂标签：顶部平接 Header，下方圆弧收尾。
- Story 展开态/抽屉内容未修改。
- 删除词汇页旧的装饰性页面背景；当前恢复为原先阅读页的暖白紫画布 `var(--paper-0)`（`#faf5ff`）。不要改共享 `--learn-canvas`，它仍属于 Learn/Profile 的暖灰紫画布。
- 桌面端 WordCard 增加 `lg:max-w-[190px]`，移动端宽度保持原样。

#### 操作按钮约定

`src/components/vocabulary/VocabularyToolbar.tsx` 中 `Select to Practice` 与 `Add Word` 已适配 Learn Chat `ControlButtons` 风格：

- 两者统一为 `140px × 52px`。
- 次要按钮：暖白纸面、细边框、底部 `2px` 压边。
- 主按钮：紫色填充、深紫边框、底部 `4px` 压边。
- 保留清晰的 focus-visible 和 hover 状态；不要恢复旧的渐变大阴影 `paper-btn-primary` / `paper-btn-ghost`。

#### 当前代码落点

- `src/app/vocabulary/page.tsx`
- `src/components/Header.tsx`
- `src/components/vocabulary/LanguageFilterRail.tsx`
- `src/components/vocabulary/StorySidebar.tsx`
- `src/components/vocabulary/VocabularyToolbar.tsx`
- `src/components/vocabulary/WordCard.tsx`

#### 最近验证

- `npm run typecheck` 通过（授权运行，Next route types 正常生成）。
- `git diff --check` 通过。
- 已检查桌面和移动端垂直标签截图：`vocabulary-vertical-tabs-desktop.png`、`vocabulary-vertical-tabs-mobile.png`，位于 `C:\Users\123\.codex\visualizations\2026\08\10\019feaeb-7aac-7d21-8bba-dff722b90f0d`。

#### 后续工作方式

若继续调整 Vocabulary：先读 `docs/APP_UI_VISUAL_CONTRACT.md` 和本节，再出桌面/移动静态稿；用户确认后再改代码。移动端不要重新引入边缘 rail/tab，除非用户明确要求。

### UI 协作方式：先静态稿，后改代码

这是本任务必须遵守的方式。不要在项目代码中连续试色、试布局来探索方向。

1. 先阅读现有页面、`HANDOFF.md` 与用户截图，明确本轮只改哪个区域。
2. 先制作 2-3 个视觉差异足够大的静态方向，并同时覆盖桌面和手机尺寸。静态稿存放在 `C:\Users\123\.codex\visualizations\2026\08\10\019fea22-be13-7582-9bb5-e67ff95fc619`。
3. 让用户在静态稿中选择；涉及关键交互时补充展开态/悬停态静态稿。未获确认前不要修改项目代码。
4. 只落地获选方向，再用真实页面截图检查桌面与窄屏。
5. 每轮只修改用户点名的区域。不要“顺手”加边线、纹理、阴影或额外装饰；用户已明确指出不需要的元素要直接删除。

本轮 Header 静态稿参考：

- `header-subject-menu-desktop.png`
- `header-subject-menu-mobile.png`
- `learn-header-directions.html`

它们都在上述 visualizations 目录。用户选中的是 **Subject First**：当前学习主题是 Header 视觉中心，也是主题切换入口。

### 已确认的视觉决策

- `/learn` 是连续学习笔记，不是通用 IM 聊天；保持中轴对称，宽屏不把 `Current Sentence` 和按钮改成左右并列。
- 用户选中 B「archival ring binder」方向：灰紫装订板、六个金属环、暖紫规则纸。
- 聊天消息不使用独立卡片或传统气泡；按 `sentence`、`explanation`、`translation` 在同一张纸页中呈现，相邻消息用较粗虚线分隔。
- 纸感来自版式、页边线、色面和内容层级；不要加入贴纸、胶带、明显横线纹理或伪手写正文字体。
- AI 回复采用轻量 Markdown 渲染，支持粗体、斜体、行内代码、换行；不新增依赖，也不解析 HTML。
- Header 目前为纯白、约 52px 高的紧凑工具条。此前的 Notebook Tab 纹理已按用户要求移除。
- Header 不再展示 `AI Tutor`；中央是当前主题，右侧难度功能收纳为省略号按钮。
- 固定 `Current Sentence` 区不添加上分隔线或其他装饰。

### 当前 Header、滚动和层级实现

涉及：`src/app/learn/page.tsx`、`src/components/learn/ContextSwitcher.tsx`、`src/components/learn/DifficultyIndicator.tsx`、`src/components/learn/ChatArea.tsx`。

- `ContextSwitcher variant="header"` 显示当前主题、箭头与 `LEARNING` 标签；菜单居中显示在标题下方，选中项淡紫高亮且有勾选图标。
- Header 外层为 `z-30`，菜单不会再被聊天笔记纸或装订环盖住。
- 右侧学习工作区使用单一滚动容器；`ChatArea` 自身不再拥有独立滚动条。
- 向下滚过 Header 后，Header 通过位移动画收起；滚回顶部或鼠标进入页面顶部 40px 会再次显示。
- `Current Sentence` 与底部操作按钮是工作区底部绝对定位的 `z-20` 固定层，始终留在页面中，不随聊天滚走。
- 固定层使用不透明 `--learn-canvas` 背景，使滑到其下方的聊天笔记完全隐藏。不要把背景改透明，也不要加刚被删除的浅上边界。
- `ChatArea` 有 `pb-64` 作为底部安全区，确保最后一条消息不会被固定学习区挡住。

### 数据与代码约束

- `userAction` 和 `messageType` 不能合并：前者是用户学习动作/隐藏动作气泡依据，后者是 AI 内容类型与笔记样式依据。
- 不要简单隐藏所有 `role === 'user'` 消息；未来自由输入仍应显示。
- 当前工作区未提交，且 `src/app/learn/page.tsx` 同时存在暂存和未暂存修改。不要 reset、checkout 或覆盖现有改动；编辑前先读 diff。

### 最近验证

- `npm run typecheck` 通过。
- `git diff --check` 通过。
- Header/布局本轮之前，`npm test` 通过，34 项成功；之后为纯布局/层级变更。
- 最近桌面布局截图：`learn-fixed-controls-global-scroll.png`，位于 visualizations 目录。

### 下一步

先用真实多轮聊天记录在桌面和手机宽度验证 Header 收起/唤醒、主题菜单层级、底部安全区和固定学习区的遮盖效果。若继续调整视觉，必须先补静态稿并获得选择，再改代码。

## 历史背景（已合并）

继续打磨 `/learn` 的 Learn Chat UI。用户希望它像一张连续的学习笔记，而不是通用即时聊天界面；视觉需温和、有个性，但不能靠装饰填充空白。

## 用户已确认的设计方向

- 保持页面中轴对称。不要把 `Current Sentence` 与控制按钮在宽屏做左右并列。
- 聊天区的按钮动作消息（`Explain please`、`Translate please`、`I got it!`）没有阅读价值：视觉上隐藏，但数据与数据库记录必须保留。
- 聊天区应是“学习笔记流”，不是传统 IM 气泡：解释、翻译和历史句子应按内容类型呈现。
- 聊天、当前句子和控制区属于同一张学习纸面。内容层通过暖灰紫画布、暖白笔记和淡紫练习纸页建立层级，不使用冷灰背景或内容卡片阴影。
- 不用明显横线纸纹、胶带、贴纸或伪手写正文字体。纸感应来自排版、页边线、色面和内容层级。
- 当前句子卡右侧的教练角色是延后功能，不能用于填补短句空白。详见 `docs/LEARN_CHAT_COACH_TODO.md`；`docs/` 被 `.gitignore` 忽略，仅本地维护。

## 当前实现

### 共享学习色面

`src/app/globals.css` 新增：

```css
--learn-canvas: #f4f0f5;
--learn-note: #fbf8fb;
--learn-surface: #f6f0fb;
--learn-line: #dfd3e3;
```

- `src/app/learn/page.tsx` 的主内容容器使用 `--learn-canvas`。
- `ChatArea` 使用相同画布；AI 内容没有投影，只用页边标记和色面区分。
- `CurrentSentenceCard` 使用 `--learn-surface`，保留左侧强调线，不再有整卡投影。
- 只有可点击按钮保留实体按压感。

### 聊天笔记页脊

`src/components/learn/ChatArea.tsx`：

- 聊天列为居中的 `max-w-3xl`，内部有一条淡页脊线。
- 消息间距是 `16px`。
- `sentence`：Alegreya 字体、紫色页边标记、半透明暖白底。
- `explanation`：浅紫页边标记与 `Explanation` 标签。
- `translation`：绿色页边标记与 `Translation` 标签。
- 未知类型采用中性笔记样式；未来自由输入仍保留紫色用户气泡。
- loading 状态也是页边笔记，不再是带阴影的气泡。

### 消息数据语义

`userAction` 与 `messageType` 不要合并：

| 字段 | 用途 | 示例 |
| --- | --- | --- |
| `userAction` | 用户触发的学习动作、数据库记录、隐藏动作气泡 | `understand` |
| `messageType` | AI 回复的内容类型和笔记样式 | `sentence` |

关键链路：

- `src/lib/types/learnTypes.ts`：`Msg` 有可选 `userAction` 与 `messageType`。
- `src/hooks/learn/useLearnChat.ts`：实时 AI 回复写入 `userAction` 和 `viewModel.normalizedType`。
- `src/hooks/learn/services/learnChatMapper.ts`：历史行保留 `messageType`；AI 行从前一条用户动作继承 `userAction`，以便隐藏固定动作气泡。
- `ChatArea` 根据 `userAction` 隐藏动作型 user message，根据 `messageType` 选择笔记视觉。
- 不要简单隐藏所有 `role === 'user'`，未来自由输入必须可见。
