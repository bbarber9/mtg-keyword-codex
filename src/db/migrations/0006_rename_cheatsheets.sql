ALTER TABLE `codex_keywords` RENAME TO `cheatsheet_keywords`;--> statement-breakpoint
ALTER TABLE `cheatsheet_keywords` RENAME COLUMN `codex_id` TO `cheatsheet_id`;--> statement-breakpoint
ALTER TABLE `codices` RENAME TO `cheatsheets`;--> statement-breakpoint
DROP INDEX `codex_keywords_codex_id_idx`;--> statement-breakpoint
DROP INDEX `codices_owner_id_idx`;--> statement-breakpoint
DROP INDEX `codices_expires_at_idx`;--> statement-breakpoint
CREATE INDEX `cheatsheet_keywords_cheatsheet_id_idx` ON `cheatsheet_keywords` (`cheatsheet_id`);--> statement-breakpoint
CREATE INDEX `cheatsheets_owner_id_idx` ON `cheatsheets` (`owner_id`);--> statement-breakpoint
CREATE INDEX `cheatsheets_expires_at_idx` ON `cheatsheets` (`expires_at`);
