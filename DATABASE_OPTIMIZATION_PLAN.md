# Database Optimization Plan

目标：优化数据库信息管理，让数据按需获取、约束可靠、查询路径清晰，并为后续数据增长留出稳定演进空间。

## 背景

当前项目使用 Drizzle ORM + SQLite。核心数据包括用户、词汇、学习进度、掌握句子、聊天记录和故事。书籍/阅读进度功能已移除，因此本计划不再包含 `books`、`reading_progress`、上传解析和书籍正文文件相关内容。

## 优先级总览

| 优先级 | 主题 | 目标 |
| --- | --- | --- |
| P0 | 查询下推 | 避免全量取出后在内存过滤或统计 |
| P0 | 索引优化 | 让索引匹配真实 `WHERE + ORDER BY` 查询 |
| P1 | NULL 唯一约束 | 避免 `NULL` 导致唯一约束失效 |
| P1 | 掌握句去重 | 用数据库唯一约束兜底，避免并发重复 |
| P2 | JSON 字段治理 | 保留灵活性，但拆出高频查询字段 |

## 1. 避免先全量取出再内存过滤

### 现状

- `GET /api/vocabulary` 先获取用户全部词汇，再按 `languageCode` 在 JS 中过滤。
- `GET /api/mastered-sentences` 通过 `getProgress()` 获取完整进度和全部掌握句，再过滤语言。
- `GET /api/profile/stats` 拉取完整词汇、故事、进度数据，只为了计算数量和分组。

### 修改计划

1. 在 `src/lib/db/vocabulary.ts` 增加按条件查询方法：
   - `getVocabularyByUser(userId, options?)`
   - options 支持 `languageCode`、`limit`、`cursor`。
2. 增加词汇统计方法：
   - `getVocabularyStatsByUser(userId)`
   - 使用 SQL `count()` 和 `groupBy(language)`。
3. 在 `src/lib/db/progress.ts` 拆分掌握句查询：
   - `getMasteredSentencesByUser(userId, options?)`
   - `getMasteredSentenceStatsByUser(userId)`
   - `getProgressByUser()` 只在需要完整学习状态时才加载句子。
4. 在 `src/lib/db/stories.ts` 增加故事计数：
   - `getStoryStatsByUser(userId)` 或 `countStoriesByUser(userId)`。
5. 修改 API：
   - `/api/vocabulary` 将语言过滤传给数据库层。
   - `/api/mastered-sentences` 直接查掌握句列表。
   - `/api/profile/stats` 只调用统计查询，不再拉完整列表。

### 验收标准

- 对列表接口，数据库 SQL 中包含对应 `WHERE` 条件。
- 对统计接口，返回数量时不再加载完整 row。
- 大数据量下接口响应时间随分页大小增长，而不是随用户总数据量增长。

## 2. 让索引服务真实查询

### 现状

当前已有部分索引，但多数只覆盖 `user_id`，没有覆盖排序字段或语言过滤字段。例如词汇列表常见查询是：

```sql
where user_id = ? and language = ?
order by created_at desc
```

只有 `user_id` 索引时，数据库仍可能额外排序。

### 修改计划

新增迁移，添加更贴合真实查询的复合索引：

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

### 注意

- 索引不是越多越好。每个索引都会增加写入成本。
- 上述索引用于当前最明显的列表、分页、统计路径。
- 如果后续增加搜索功能，再考虑 SQLite FTS，而不是给长文本随意加普通索引。

### 验收标准

- 高频列表查询都有与 `WHERE + ORDER BY` 匹配的复合索引。
- 使用 SQLite `EXPLAIN QUERY PLAN` 检查关键查询能命中索引。

## 3. 修复唯一约束遇到 NULL 失效的问题

### 现状

`vocabulary` 目前有唯一约束：

```sql
UNIQUE (user_id, word, language)
```

但 SQLite 中 `NULL` 不等于 `NULL`，因此同一用户可以插入多条：

```text
word = "hello", language = NULL
```

### 修改计划

1. 数据迁移：
   - 将 `vocabulary.language IS NULL` 的数据更新为 `'unknown'` 或用户当前语言。
   - 推荐短期使用 `'unknown'`，避免错误推断。
2. Schema 修改：
   - `language` 改为 `notNull().default('unknown')`。
3. API 写入前规范化：
   - 所有新增词汇都必须写入明确语言码。
   - 语言检测失败时写 `'unknown'`。
4. 迁移唯一索引：
   - 先清理重复数据。
   - 再重建唯一索引。

### 验收标准

- `vocabulary.language` 不再出现 `NULL`。
- 同一用户、同一语言、同一词不能重复插入。
- 语言未知的数据有稳定值 `'unknown'`，而不是空值。

## 4. 掌握句去重交给数据库兜底

### 现状

`saveMasteredSentenceByUser()` 先查询是否存在，再插入。这个做法在单请求下可用，但并发情况下两个请求可能同时查到“不存在”，然后都插入。

### 修改计划

1. 增加两个归一化字段：
   - `content_hash`
   - `context_hash`
2. 写入前生成 hash：
   - 内容先 trim、压缩空白、统一大小写策略，再 hash。
   - context 为空时使用固定空值 hash。
3. 增加唯一索引：

```sql
CREATE UNIQUE INDEX mastered_sentences_user_language_content_context_unique
ON mastered_sentences (user_id, language_code, content_hash, context_hash);
```

4. 写入方式改为：
   - `insert ... onConflictDoNothing()`
   - 插入失败时读取已有记录或直接返回。

### 为什么不直接用 content 建唯一索引

句子可能很长，直接对长文本做复合唯一索引会让索引膨胀。hash 字段更稳定，也更适合唯一判断。

### 验收标准

- 并发调用保存同一句掌握句，只产生一条记录。
- 去重逻辑由数据库唯一索引保证，而不是只靠应用层查询。
- 历史重复数据在迁移前被合并或删除。

## 5. JSON 字段治理

### 现状

项目中有一些 JSON/text 字段：

- `learning_progress.learning_profile`
- `learning_progress.performance_metrics`
- `stories.words`

JSON 字段灵活，但不适合频繁筛选、排序、统计。

### 修改计划

短期保留 JSON，只拆出已经明确需要查询的字段。

1. `learning_profile`
   - 保留整体 JSON。
   - 如果要做后台分析，再新增每日统计表：

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

2. `stories.words`
   - 如果后续要按词查故事，新增关联表：

```text
story_words
- story_id
- user_id
- word
- language
```

3. `performance_metrics`
   - 高频展示字段可拆为列。
   - 低频、复杂结构继续留在 JSON。

### 判断规则

- 只展示、不筛选、不排序：可以放 JSON。
- 经常 `WHERE`、`ORDER BY`、`GROUP BY`：应该拆列或拆表。
- 数据结构还不稳定：先放 JSON，等查询需求稳定后再拆。

### 验收标准

- 高频统计不依赖把 JSON 全部读到应用层处理。
- JSON 字段都有明确用途，不作为“什么都塞进去”的默认选择。

## 实施顺序

1. 完成书籍相关表、API、类型、依赖清理。
2. 增加查询下推方法，并修改对应 API。
3. 增加索引迁移。
4. 修复 `vocabulary.language` 空值和唯一约束。
5. 给掌握句增加 hash 字段和唯一索引。
6. 根据真实统计需求拆出 JSON 中的高频查询字段。
7. 补数据库层测试，覆盖去重、分页、语言过滤和统计。

## 基础知识速记

- **过滤下推**：让数据库用 `WHERE` 找数据，而不是把全部数据拿到 JS 里过滤。
- **分页**：用 `LIMIT` 和 cursor/时间戳控制每次读取的数量。
- **复合索引**：多个字段组成的索引，字段顺序应贴合查询条件。
- **唯一约束**：数据库层面的“不能重复”，比应用层先查再插入更可靠。
- **NULL**：表示未知或缺失；在 SQLite 唯一约束中，多个 NULL 可以同时存在。
- **JSON 字段**：适合灵活结构，不适合高频筛选和统计。
