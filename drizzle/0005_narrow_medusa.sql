PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_learning_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`language_code` text NOT NULL,
	`current_difficulty_level` integer DEFAULT 3,
	`initial_difficulty_level` integer DEFAULT 1,
	`placement_completed` integer DEFAULT false,
	`learning_profile` text,
	`performance_metrics` text,
	`last_updated` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_learning_progress`("id", "user_id", "language_code", "current_difficulty_level", "initial_difficulty_level", "placement_completed", "learning_profile", "performance_metrics", "last_updated") SELECT "id", "user_id", "language_code", "current_difficulty_level", "initial_difficulty_level", "placement_completed", "learning_profile", "performance_metrics", "last_updated" FROM `learning_progress`;--> statement-breakpoint
DROP TABLE `learning_progress`;--> statement-breakpoint
ALTER TABLE `__new_learning_progress` RENAME TO `learning_progress`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `learning_progress_user_id_language_code_unique` ON `learning_progress` (`user_id`,`language_code`);--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`username` text DEFAULT '' NOT NULL,
	`native_language` text DEFAULT 'en' NOT NULL,
	`target_language` text DEFAULT 'ko' NOT NULL,
	`current_language_code` text DEFAULT 'ko' NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`is_onboarded` integer DEFAULT false,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "email", "password_hash", "username", "native_language", "target_language", "current_language_code", "role", "is_onboarded", "created_at", "updated_at") SELECT "id", "email", "password_hash", "username", "native_language", "target_language", COALESCE("current_language_code", "target_language", 'ko'), "role", "is_onboarded", "created_at", "updated_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
ALTER TABLE `books` ADD `updated_at` integer;--> statement-breakpoint
ALTER TABLE `mastered_sentences` ADD `updated_at` integer;--> statement-breakpoint
CREATE INDEX `mastered_sentences_user_id_language_code_idx` ON `mastered_sentences` (`user_id`,`language_code`);--> statement-breakpoint
ALTER TABLE `reading_progress` ADD `updated_at` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `reading_progress_user_id_book_id_unique` ON `reading_progress` (`user_id`,`book_id`);--> statement-breakpoint
ALTER TABLE `stories` ADD `updated_at` integer;--> statement-breakpoint
CREATE INDEX `stories_user_id_idx` ON `stories` (`user_id`);--> statement-breakpoint
ALTER TABLE `vocabulary` ADD `updated_at` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `vocabulary_user_id_word_language_unique` ON `vocabulary` (`user_id`,`word`,`language`);--> statement-breakpoint
CREATE INDEX `vocabulary_user_id_idx` ON `vocabulary` (`user_id`);--> statement-breakpoint
CREATE INDEX `chat_messages_user_lang_ctx_idx` ON `chat_messages` (`user_id`,`language_code`,`context`,`created_at`);