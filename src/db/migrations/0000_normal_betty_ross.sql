CREATE TABLE `cards` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`data_json` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cards_name_unique` ON `cards` (`name`);--> statement-breakpoint
CREATE INDEX `cards_name_idx` ON `cards` (`name`);--> statement-breakpoint
CREATE TABLE `codices` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`canonical_list` text NOT NULL,
	`summary_json` text NOT NULL,
	`created_at` text NOT NULL,
	`last_accessed_at` text NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `codices_owner_id_idx` ON `codices` (`owner_id`);--> statement-breakpoint
CREATE INDEX `codices_expires_at_idx` ON `codices` (`expires_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`provider_user_id` text NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`avatar_url` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_provider_user_id_unique` ON `users` (`provider_user_id`);