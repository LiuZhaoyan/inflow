DELETE FROM `learning_progress`
WHERE `rowid` IN (
  SELECT `rowid`
  FROM (
    SELECT
      `rowid`,
      ROW_NUMBER() OVER (
        PARTITION BY `user_id`, `language_code`
        ORDER BY `last_updated` DESC, `rowid` DESC
      ) AS `rn`
    FROM `learning_progress`
  )
  WHERE `rn` > 1
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `learning_progress_user_id_language_code_unique`
ON `learning_progress` (`user_id`, `language_code`);
