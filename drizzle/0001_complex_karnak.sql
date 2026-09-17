CREATE TABLE `draws` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lottery` text NOT NULL,
	`draw_name` text NOT NULL,
	`closes_at` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`result` text,
	`source` text DEFAULT 'super_admin' NOT NULL,
	`updated_at` text NOT NULL
);
