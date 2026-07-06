# Database Optimization Plan

目标：优化数据库信息管理，让数据按需获取、约束可靠、查询路径清晰，并为后续数据增长留出稳定演进空间。

## 当前状态

项目使用 Drizzle ORM + SQLite。当前业务表：

- `users`
- `vocabulary`
- `learning_progress`
- `mastered_sentences`
- `chat_messages`
- `stories`

书籍功能已经移除，因此本计划不再覆盖：

- `books`
- `reading_progress`
- 上传解析
- 书籍正文文件

## 优先级

| 优先级 | 主题 | 目标 |
| --- | --- | --- |
| P0 | 查询下推 | 避免全量取出后在内存过滤或统计 |
| P0 | 索引优化 | 让索引匹配真实 `WHERE + ORDER BY` 查询 |
| P1 | NULL 唯一约束 | 避免 `NULL` 导致唯一约束失效 |
| P1 | 掌握句去重 | 用数据库唯一约束兜底，避免并发重复 |
| P2 | JSON 字段治理 | 保留灵活性，但拆出高频查询字段 |

## 1. 查询下推

### 问题

部分接口先取用户全部数据，再在 JS 内存中过滤或统计：

- `/api/vocabulary`：先取全部词汇，再按 `languageCode` 过滤。
- `/api/mastered-sentences`：通过 `getProgress()` 拿完整进度和全部掌握句，再过滤语言。
- `/api/profile/stats`：拉取完整词汇、故事、进度，只为计算数量。

### 计划

新增数据库层方法：

```text
getVocabularyByUser(userId, { languageCode, limit, cursor })
getVocabularyStatsByUser(userId)
getMasteredSentencesByUser(userId, { languageCode, limit, cursor })
getMasteredSentenceStatsByUser(userId)
getStoryStatsByUser(userId)
```

修改 API：

- `/api/vocabulary` 将语言过滤传给 DB 层。
- `/api/mastered-sentences` 直接查询掌握句列表。
- `/api/profile/stats` 使用 SQL 统计，不再加载完整列表。

### 验收标准

- 列表接口 SQL 中包含对应 `WHERE`。
- 统计接口使用 `count()` / `groupBy()`。
- 大数据量下响应时间随分页大小增长，而不是随用户总数据量增长。

## 2. 索引优化

### 问题

当前部分索引只覆盖 `user_id`，没有覆盖语言过滤和排序字段。

常见查询：

```sql
where user_id = ? and language = ?
order by created_at desc
```

### 计划

新增复合索引：

```sql
CREATE INDEX vocabulary_user_language_created_at_idx
ON vocabulary (user_id, language, created_at);

CREATE INDEX vocabulary_user_created_at_idx
ON vocabulary (user_id, created_at);

CREATE INDEX mastered_sentences_user_language_mastered_at_idx
ON mastered_sentences (user_id, language_code, mastered_at);

CREATE INDEX stories_user_created_at_idx
ON stories (user_id, created_at);

CREATE INDEX chat_messages_user_created_at_idx
ON chat_messages (user_id, created_at);

CREATE INDEX users_created_at_idx
ON users (created_at);
```

### 验收标准

- 高频列表查询都有匹配 `WHERE + ORDER BY` 的复合索引。
- 使用 `EXPLAIN QUERY PLAN` 检查关键查询能命中索引。
- 没有为了“看起来完整”添加低价值索引。

## 3. 修复 NULL 唯一约束

### 问题

`vocabulary` 当前有唯一约束：

```sql
UNIQUE (user_id, word, language)
```

但 SQLite 中多个 `NULL` 可以同时存在，因此同一用户可以插入多条：

```text
word = "hello", language = NULL
```

### 计划

1. 迁移历史数据：把 `vocabulary.language IS NULL` 更新为 `'unknown'`。
2. 修改 schema：`language` 改为 `notNull().default('unknown')`。
3. API 写入前规范化语言码，检测失败时写 `'unknown'`。
4. 清理重复数据后重建唯一索引。

### 验收标准

- `vocabulary.language` 不再出现 `NULL`。
- 同一用户、同一语言、同一词不能重复插入。
- 未知语言有稳定值 `'unknown'`。

## 4. 掌握句数据库级去重

### 问题

当前 `saveMasteredSentenceByUser()` 先查是否存在，再插入。并发请求可能同时查到“不存在”，然后重复插入。

### 计划

新增字段：

- `content_hash`
- `context_hash`

新增唯一索引：

```sql
CREATE UNIQUE INDEX mastered_sentences_user_language_content_context_unique
ON mastered_sentences (user_id, language_code, content_hash, context_hash);
```

写入逻辑：

- 句子内容 trim、压缩空白、按规则归一化后生成 hash。
- context 为空时使用固定空值 hash。
- 使用 `insert ... onConflictDoNothing()`。
- 冲突时读取已有记录或直接返回。

### 验收标准

- 并发保存同一句掌握句，只产生一条记录。
- 去重由数据库唯一索引保证。
- 历史重复数据在迁移前被合并或删除。

## 5. JSON 字段治理

### 现状

当前 JSON/text 字段：

- `learning_progress.learning_profile`
- `learning_progress.performance_metrics`
- `stories.words`

JSON 适合结构灵活的数据，但不适合高频筛选、排序、统计。

### 计划

短期保留 JSON，只拆出已经明确需要查询的字段。

如果要做学习分析，可新增：

```text
learning_metric_daily
- id
- user_id
- language_code
- date
- understood_count
- explain_count
- translate_count
- mastered_count
- avg_difficulty
```

如果要按词查故事，可新增：

```text
story_words
- story_id
- user_id
- word
- language
```

### 判断规则

- 只展示、不筛选、不排序：可以放 JSON。
- 经常 `WHERE` / `ORDER BY` / `GROUP BY`：拆列或拆表。
- 数据结构还不稳定：先放 JSON，等查询需求稳定后再拆。

## 实施顺序

1. 查询下推：改 db 层方法和 API。
2. 增加索引迁移。
3. 修复 `vocabulary.language` 空值和唯一约束。
4. 给掌握句增加 hash 字段和唯一索引。
5. 根据真实统计需求拆出 JSON 中的高频查询字段。
6. 补数据库层测试，覆盖去重、分页、语言过滤和统计。

## 基础知识

- **过滤下推**：让数据库用 `WHERE` 找数据，而不是把全部数据拿到 JS 里过滤。
- **分页**：用 `LIMIT` 和 cursor/时间戳控制每次读取数量。
- **复合索引**：多个字段组成的索引，字段顺序应贴合查询条件。
- **唯一约束**：数据库层面的“不能重复”，比应用层先查再插入更可靠。
- **NULL**：表示未知或缺失；在 SQLite 唯一约束中，多个 NULL 可以同时存在。
- **JSON 字段**：适合灵活结构，不适合高频筛选和统计。

## 实施记录

### 2026-07-06

- **1. 查询下推**：已完成。`/api/vocabulary` 将 `languageCode`、`limit`、`cursor` 传入 `getVocabularyByUser()`，不再全量取出后过滤；`/api/mastered-sentences` 改为直接调用 `getMasteredSentencesByUser()`；`/api/profile/stats` 改为使用 `getVocabularyStatsByUser()`、`getMasteredSentenceStatsByUser()`、`getStoryStatsByUser()` 的 SQL `count()` / `groupBy()` 统计。
- **2. 索引优化**：已完成。`schema.ts` 和 `drizzle/0007_glossy_gauntlet.sql` 新增词汇、掌握句、故事、聊天消息、用户创建时间相关复合索引；迁移 SQL 已用内存 SQLite 验证索引可创建。
- **3. 修复 `vocabulary.language` 空值唯一约束**：已完成。`vocabulary.language` 改为 `notNull().default('unknown')`；写入前统一归一化语言码；迁移会把历史 `NULL` / 空字符串语言改为 `unknown`，并按 `(user_id, word, language)` 保留最新记录后重建唯一索引。
- **4. 掌握句数据库级去重**：已完成。`mastered_sentences` 新增 `content_hash`、`context_hash` 字段和 `(user_id, language_code, content_hash, context_hash)` 唯一索引；保存逻辑改为归一化内容/语境后 `onConflictDoNothing()`；冲突时回读已有记录，避免并发重复插入。
- **5. JSON 字段治理**：已评估。当前改动没有新增高频 JSON 查询需求，`learning_profile`、`performance_metrics`、`stories.words` 暂时保留 JSON/text 形态；本次只把明确高频的列表和统计路径下推到 SQL。
- **6. 测试与验证**：已完成基础验证。`npm run lint` 通过，仅保留项目既有 warning；迁移 SQL 已在内存 SQLite 中验证历史空语言归一化、重复数据清理和索引创建。`npx tsc --noEmit` 当前被 `.next/types/validator.ts` 中缺失的 `src/app/docs/page.js` 阻塞，未暴露本次改动相关类型错误。
