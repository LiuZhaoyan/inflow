CREATE TABLE `books` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`title` text NOT NULL,
	`level` text,
	`language` text,
	`metadata` text,
	`content_path` text,
	`preview` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`language_code` text NOT NULL,
	`context` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`message_type` text,
	`original_sentence` text,
	`difficulty_estimate` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `learning_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`language_code` text NOT NULL,
	`current_difficulty_level` integer DEFAULT 3,
	`initial_difficulty_level` integer DEFAULT 3,
	`placement_completed` integer DEFAULT false,
	`learning_profile` text,
	`performance_metrics` text,
	`last_updated` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `mastered_sentences` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`content` text NOT NULL,
	`translation` text,
	`context` text,
	`language_code` text,
	`difficulty_level` integer,
	`audio_path` text,
	`message_id` text,
	`mastered_at` integer NOT NULL,
	`review_count` integer DEFAULT 0,
	`last_reviewed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `reading_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`book_id` text NOT NULL,
	`chapter_index` integer DEFAULT 0,
	`sentence_index` integer DEFAULT 0,
	`completed_at` integer,
	`last_read_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `stories` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`content` text NOT NULL,
	`translation` text,
	`words` text,
	`language` text,
	`translation_language` text,
	`audio_path` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`username` text DEFAULT '' NOT NULL,
	`native_language` text DEFAULT 'en' NOT NULL,
	`target_language` text DEFAULT 'ko' NOT NULL,
	`current_language_code` text DEFAULT 'ko',
	`is_onboarded` integer DEFAULT false,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `vocabulary` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`word` text NOT NULL,
	`definition` text DEFAULT '' NOT NULL,
	`context_sentence` text,
	`translation` text,
	`image_path` text,
	`audio_path` text,
	`language` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
