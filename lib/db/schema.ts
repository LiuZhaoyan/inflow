import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

// ───────── 用户表 ─────────
export const users = sqliteTable('users', {
  id:                  text('id').primaryKey(),
  email:               text('email').notNull().unique(),
  passwordHash:        text('password_hash').notNull(),
  username:            text('username').notNull().default(''),
  nativeLanguage:      text('native_language').notNull().default('en'),
  targetLanguage:      text('target_language').notNull().default('ko'),
  currentLanguageCode: text('current_language_code').default('ko'),
  isOnboarded:         integer('is_onboarded', { mode: 'boolean' }).default(false),
  createdAt:           integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt:           integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// ───────── 词汇表 ─────────
export const vocabulary = sqliteTable('vocabulary', {
  id:              text('id').primaryKey(),
  userId:          text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  word:            text('word').notNull(),
  definition:      text('definition').notNull().default(''),
  contextSentence: text('context_sentence'),
  translation:     text('translation'),
  imagePath:       text('image_path'),
  audioPath:       text('audio_path'),
  language:        text('language'),
  createdAt:       integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ───────── 学习进度（每用户每语言一条） ─────────
export const learningProgress = sqliteTable(
  'learning_progress',
  {
    id:                     text('id').primaryKey(),
    userId:                 text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    languageCode:           text('language_code').notNull(),
    currentDifficultyLevel: integer('current_difficulty_level').default(3),
    initialDifficultyLevel: integer('initial_difficulty_level').default(3),
    placementCompleted:     integer('placement_completed', { mode: 'boolean' }).default(false),
    learningProfile:        text('learning_profile', { mode: 'json' }),
    performanceMetrics:     text('performance_metrics', { mode: 'json' }),
    lastUpdated:            integer('last_updated', { mode: 'timestamp' }),
  },
  (table) => ({
    userLanguageUnique: uniqueIndex('learning_progress_user_id_language_code_unique').on(
      table.userId,
      table.languageCode,
    ),
  }),
);

// ───────── 掌握句子 ─────────
export const masteredSentences = sqliteTable('mastered_sentences', {
  id:              text('id').primaryKey(),
  userId:          text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content:         text('content').notNull(),
  translation:     text('translation'),
  context:         text('context'),
  languageCode:    text('language_code'),
  difficultyLevel: integer('difficulty_level'),
  audioPath:       text('audio_path'),
  messageId:       text('message_id'),
  masteredAt:      integer('mastered_at', { mode: 'timestamp' }).notNull(),
  reviewCount:     integer('review_count').default(0),
  lastReviewedAt:  integer('last_reviewed_at', { mode: 'timestamp' }),
});

// ───────── 聊天记录 ─────────
export const chatMessages = sqliteTable('chat_messages', {
  id:                 text('id').primaryKey(),
  userId:             text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  languageCode:       text('language_code').notNull(),
  context:            text('context').notNull(),
  role:               text('role').notNull(),
  requestId:          text('request_id'),
  content:            text('content').notNull(),
  messageType:        text('message_type'),
  originalSentence:   text('original_sentence'),
  difficultyEstimate: integer('difficulty_estimate'),
  createdAt:          integer('created_at', { mode: 'timestamp' }).notNull(),
},
  (table) => ({
    userRequestUnique: uniqueIndex('chat_messages_user_id_request_id_unique').on(table.userId, table.requestId),
  }),
);

// ───────── 故事 ─────────
export const stories = sqliteTable('stories', {
  id:                  text('id').primaryKey(),
  userId:              text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content:             text('content').notNull(),
  translation:         text('translation'),
  words:               text('words', { mode: 'json' }).$type<string[]>(),
  language:            text('language'),
  translationLanguage: text('translation_language'),
  audioPath:           text('audio_path'),
  createdAt:           integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ───────── 书籍（nullable userId = 公共） ─────────
export const books = sqliteTable('books', {
  id:          text('id').primaryKey(),
  userId:      text('user_id').references(() => users.id, { onDelete: 'set null' }),
  title:       text('title').notNull(),
  level:       text('level'),
  language:    text('language'),
  metadata:    text('metadata', { mode: 'json' }),
  contentPath: text('content_path'),
  preview:     text('preview', { mode: 'json' }).$type<string[]>(),
  createdAt:   integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ───────── 阅读进度 ─────────
export const readingProgress = sqliteTable('reading_progress', {
  id:            text('id').primaryKey(),
  userId:        text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  bookId:        text('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  chapterIndex:  integer('chapter_index').default(0),
  sentenceIndex: integer('sentence_index').default(0),
  completedAt:   integer('completed_at', { mode: 'timestamp' }),
  lastReadAt:    integer('last_read_at', { mode: 'timestamp' }),
});
