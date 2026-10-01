CREATE TABLE `estimation_reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`suggestion_id` integer NOT NULL,
	`confirmed_level` text NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`reviewed_input_hash` text NOT NULL,
	`reviewed_by` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`suggestion_id`) REFERENCES `estimation_suggestions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `estimation_reviews_suggestion_idx` ON `estimation_reviews` (`suggestion_id`);--> statement-breakpoint
CREATE TABLE `estimation_suggestions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer NOT NULL,
	`input_hash` text NOT NULL,
	`input_snapshot` text NOT NULL,
	`criteria_version` text NOT NULL,
	`criteria_snapshot` text NOT NULL,
	`model` text NOT NULL,
	`suggested_level` text,
	`confidence` real,
	`raw_response` text NOT NULL,
	`requested_by` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `project_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`requested_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `estimation_suggestions_item_idx` ON `estimation_suggestions` (`item_id`);