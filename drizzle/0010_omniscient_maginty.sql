CREATE TABLE `project_scope_dimensions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`dimension` integer NOT NULL,
	`status` text DEFAULT 'needs_info' NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_scope_dimensions_uq` ON `project_scope_dimensions` (`project_id`,`dimension`);--> statement-breakpoint
ALTER TABLE `project_items` ADD `dimension_ids` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `project_items` ADD `assessment` text;