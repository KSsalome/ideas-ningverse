CREATE TABLE `artworks` (
	`id` text PRIMARY KEY NOT NULL,
	`gallery_id` text NOT NULL,
	`data` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `artworks_gallery_idx` ON `artworks` (`gallery_id`);--> statement-breakpoint
CREATE TABLE `pet_feathers` (
	`actor` text NOT NULL,
	`day` text NOT NULL,
	`acquired_at` integer NOT NULL,
	PRIMARY KEY(`actor`, `day`)
);
