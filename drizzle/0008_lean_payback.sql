ALTER TABLE `project_item_mandays` ADD `commercial_manday` real;--> statement-breakpoint
ALTER TABLE `project_item_mandays` ADD `actual_manday` real;--> statement-breakpoint
ALTER TABLE `project_item_mandays` ADD `billable` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `project_items` ADD `source_reference` text;--> statement-breakpoint
ALTER TABLE `project_items` ADD `baseline_confirmed` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `project_items` ADD `complexity_facts` text;--> statement-breakpoint
ALTER TABLE `project_items` ADD `count_unit` text;--> statement-breakpoint
ALTER TABLE `project_phases` ADD `delivery_profile` text DEFAULT 'legacy' NOT NULL;