ALTER TABLE `codices` RENAME COLUMN "canonical_list" TO "normalized_decklist";--> statement-breakpoint
CREATE TABLE `codex_keywords` (
	`codex_id` text NOT NULL,
	`keyword` text NOT NULL,
	`count` integer NOT NULL,
	PRIMARY KEY(`codex_id`, `keyword`),
	FOREIGN KEY (`codex_id`) REFERENCES `codices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `codex_keywords_codex_id_idx` ON `codex_keywords` (`codex_id`);--> statement-breakpoint
ALTER TABLE `codices` ADD `link` text;--> statement-breakpoint
ALTER TABLE `codices` ADD `primer` text;--> statement-breakpoint
ALTER TABLE `codices` DROP COLUMN `summary_json`;