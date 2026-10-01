CREATE TABLE `evaluation_case_reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`case_id` integer NOT NULL,
	`revision` integer NOT NULL,
	`status` text NOT NULL,
	`expected_level` text,
	`note` text NOT NULL,
	`reviewed_by` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `evaluation_cases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `evaluation_case_reviews_revision_uq` ON `evaluation_case_reviews` (`case_id`,`revision`);--> statement-breakpoint
CREATE TABLE `evaluation_cases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_hash` text NOT NULL,
	`snapshot` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`expected_level` text,
	`review_note` text DEFAULT '' NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`captured_by` integer NOT NULL,
	`reviewed_by` integer,
	`reviewed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`captured_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `evaluation_cases_source_hash_unique` ON `evaluation_cases` (`source_hash`);