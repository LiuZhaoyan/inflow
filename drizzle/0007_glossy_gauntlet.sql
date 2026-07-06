PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_mastered_sentences` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`content` text NOT NULL,
	`content_hash` text NOT NULL,
	`translation` text,
	`context` text,
	`context_hash` text NOT NULL,
	`language_code` text DEFAULT 'unknown' NOT NULL,
	`difficulty_level` integer,
	`audio_path` text,
	`message_id` text,
	`mastered_at` integer NOT NULL,
	`review_count` integer DEFAULT 0,
	`last_reviewed_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_mastered_sentences` (
	`id`,
	`user_id`,
	`content`,
	`content_hash`,
	`translation`,
	`context`,
	`context_hash`,
	`language_code`,
	`difficulty_level`,
	`audio_path`,
	`message_id`,
	`mastered_at`,
	`review_count`,
	`last_reviewed_at`,
	`updated_at`
)
WITH normalized AS (
	SELECT
		`id`,
		`user_id`,
		`content`,
		lower(trim(replace(replace(replace(replace(replace(replace(replace(replace(coalesce(`content`, ''), char(13), ' '), char(10), ' '), char(9), ' '), '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '))) AS `content_hash`,
		`translation`,
		`context`,
		lower(trim(replace(replace(replace(replace(replace(replace(replace(replace(coalesce(`context`, ''), char(13), ' '), char(10), ' '), char(9), ' '), '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '))) AS `context_hash`,
		coalesce(nullif(trim(lower(`language_code`)), ''), 'unknown') AS `language_code`,
		`difficulty_level`,
		`audio_path`,
		`message_id`,
		`mastered_at`,
		`review_count`,
		`last_reviewed_at`,
		`updated_at`
	FROM `mastered_sentences`
),
ranked AS (
	SELECT
		*,
		row_number() OVER (
			PARTITION BY `user_id`, `language_code`, `content_hash`, `context_hash`
			ORDER BY `mastered_at` DESC, `id` DESC
		) AS `rn`
	FROM normalized
)
SELECT
	`id`,
	`user_id`,
	`content`,
	`content_hash`,
	`translation`,
	`context`,
	`context_hash`,
	`language_code`,
	`difficulty_level`,
	`audio_path`,
	`message_id`,
	`mastered_at`,
	`review_count`,
	`last_reviewed_at`,
	`updated_at`
FROM ranked
WHERE `rn` = 1;--> statement-breakpoint
DROP TABLE `mastered_sentences`;--> statement-breakpoint
ALTER TABLE `__new_mastered_sentences` RENAME TO `mastered_sentences`;--> statement-breakpoint
CREATE INDEX `mastered_sentences_user_id_language_code_idx` ON `mastered_sentences` (`user_id`,`language_code`);--> statement-breakpoint
CREATE INDEX `mastered_sentences_user_language_mastered_at_idx` ON `mastered_sentences` (`user_id`,`language_code`,`mastered_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `mastered_sentences_user_language_content_context_unique` ON `mastered_sentences` (`user_id`,`language_code`,`content_hash`,`context_hash`);--> statement-breakpoint
CREATE TABLE `__new_vocabulary` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`word` text NOT NULL,
	`definition` text DEFAULT '' NOT NULL,
	`context_sentence` text,
	`translation` text,
	`image_path` text,
	`audio_path` text,
	`language` text DEFAULT 'unknown' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_vocabulary` (
	`id`,
	`user_id`,
	`word`,
	`definition`,
	`context_sentence`,
	`translation`,
	`image_path`,
	`audio_path`,
	`language`,
	`created_at`,
	`updated_at`
)
WITH normalized AS (
	SELECT
		`id`,
		`user_id`,
		`word`,
		coalesce(`definition`, '') AS `definition`,
		`context_sentence`,
		`translation`,
		`image_path`,
		`audio_path`,
		coalesce(nullif(trim(lower(`language`)), ''), 'unknown') AS `language`,
		`created_at`,
		`updated_at`
	FROM `vocabulary`
),
ranked AS (
	SELECT
		*,
		row_number() OVER (
			PARTITION BY `user_id`, `word`, `language`
			ORDER BY `created_at` DESC, `id` DESC
		) AS `rn`
	FROM normalized
)
SELECT
	`id`,
	`user_id`,
	`word`,
	`definition`,
	`context_sentence`,
	`translation`,
	`image_path`,
	`audio_path`,
	`language`,
	`created_at`,
	`updated_at`
FROM ranked
WHERE `rn` = 1;--> statement-breakpoint
DROP TABLE `vocabulary`;--> statement-breakpoint
ALTER TABLE `__new_vocabulary` RENAME TO `vocabulary`;--> statement-breakpoint
CREATE UNIQUE INDEX `vocabulary_user_id_word_language_unique` ON `vocabulary` (`user_id`,`word`,`language`);--> statement-breakpoint
CREATE INDEX `vocabulary_user_id_idx` ON `vocabulary` (`user_id`);--> statement-breakpoint
CREATE INDEX `vocabulary_user_language_created_at_idx` ON `vocabulary` (`user_id`,`language`,`created_at`);--> statement-breakpoint
CREATE INDEX `vocabulary_user_created_at_idx` ON `vocabulary` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `chat_messages_user_created_at_idx` ON `chat_messages` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `stories_user_created_at_idx` ON `stories` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `users_created_at_idx` ON `users` (`created_at`);--> statement-breakpoint
PRAGMA foreign_keys=ON;
