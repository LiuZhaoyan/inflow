import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id:                  text('id').primaryKey(),
  email:               text('email').notNull().unique(),
  passwordHash:        text('password_hash').notNull(),
  username:            text('username').notNull().default(''),
  nativeLanguage:      text('native_language').notNull().default('en'),
  targetLanguage:      text('target_language').notNull().default('ko'),
  currentLanguageCode: text('current_language_code').notNull().default('ko'),
  role:                text('role', { enum: ['user', 'admin'] }).notNull().default('user'),
  isOnboarded:         integer('is_onboarded', { mode: 'boolean' }).default(false),
  createdAt:           integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt:           integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  createdAtIdx: index('users_created_at_idx').on(table.createdAt),
}));

export const vocabulary = sqliteTable('vocabulary', {
  id:              text('id').primaryKey(),
  userId:          text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  word:            text('word').notNull(),
  definition:      text('definition').notNull().default(''),
  contextSentence: text('context_sentence'),
  translation:     text('translation'),
  imagePath:       text('image_path'),
  audioPath:       text('audio_path'),
  language:        text('language').notNull().default('unknown'),
  createdAt:       integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt:       integer('updated_at', { mode: 'timestamp' }),
}, (table) => ({
  userWordLanguageUnique: uniqueIndex('vocabulary_user_id_word_language_unique').on(
    table.userId,
    table.word,
    table.language,
  ),
  userIdx: index('vocabulary_user_id_idx').on(table.userId),
  userLanguageCreatedAtIdx: index('vocabulary_user_language_created_at_idx').on(
    table.userId,
    table.language,
    table.createdAt,
  ),
  userCreatedAtIdx: index('vocabulary_user_created_at_idx').on(
    table.userId,
    table.createdAt,
  ),
}));

export const learningProgress = sqliteTable(
  'learning_progress',
  {
    id:                     text('id').primaryKey(),
    userId:                 text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    languageCode:           text('language_code').notNull(),
    currentDifficultyLevel: integer('current_difficulty_level').default(3),
    initialDifficultyLevel: integer('initial_difficulty_level').default(1),
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

export const masteredSentences = sqliteTable('mastered_sentences', {
  id:              text('id').primaryKey(),
  userId:          text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content:         text('content').notNull(),
  contentHash:     text('content_hash').notNull(),
  translation:     text('translation'),
  context:         text('context'),
  contextHash:     text('context_hash').notNull(),
  languageCode:    text('language_code').notNull().default('unknown'),
  difficultyLevel: integer('difficulty_level'),
  audioPath:       text('audio_path'),
  messageId:       text('message_id'),
  masteredAt:      integer('mastered_at', { mode: 'timestamp' }).notNull(),
  reviewCount:     integer('review_count').default(0),
  lastReviewedAt:  integer('last_reviewed_at', { mode: 'timestamp' }),
  updatedAt:       integer('updated_at', { mode: 'timestamp' }),
}, (table) => ({
  userIdLanguageIdx: index('mastered_sentences_user_id_language_code_idx').on(
    table.userId,
    table.languageCode,
  ),
  userLanguageMasteredAtIdx: index('mastered_sentences_user_language_mastered_at_idx').on(
    table.userId,
    table.languageCode,
    table.masteredAt,
  ),
  userLanguageContentContextUnique: uniqueIndex('mastered_sentences_user_language_content_context_unique').on(
    table.userId,
    table.languageCode,
    table.contentHash,
    table.contextHash,
  ),
}));

export const chatMessages = sqliteTable('chat_messages', {
  id:                 text('id').primaryKey(),
  userId:             text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  languageCode:       text('language_code').notNull(),
  context:            text('context').notNull(),
  role:               text('role').notNull(),
  requestId:          text('request_id'),
  userAction:         text('user_action'),
  content:            text('content').notNull(),
  messageType:        text('message_type'),
  originalSentence:   text('original_sentence'),
  difficultyEstimate: integer('difficulty_estimate'),
  createdAt:          integer('created_at', { mode: 'timestamp' }).notNull(),
},
  (table) => ({
    userRequestUnique: uniqueIndex('chat_messages_user_id_request_id_unique').on(table.userId, table.requestId),
    userLanguageContextIdx: index('chat_messages_user_lang_ctx_idx').on(
      table.userId,
      table.languageCode,
      table.context,
      table.createdAt,
    ),
    userCreatedAtIdx: index('chat_messages_user_created_at_idx').on(table.userId, table.createdAt),
  }),
);

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
  updatedAt:           integer('updated_at', { mode: 'timestamp' }),
}, (table) => ({
  userIdx: index('stories_user_id_idx').on(table.userId),
  userCreatedAtIdx: index('stories_user_created_at_idx').on(table.userId, table.createdAt),
}));
