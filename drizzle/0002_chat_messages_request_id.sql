ALTER TABLE `chat_messages` ADD COLUMN `request_id` text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `chat_messages_user_id_request_id_unique`
ON `chat_messages` (`user_id`, `request_id`);
