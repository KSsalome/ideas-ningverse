CREATE TABLE `bottles` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`x` real NOT NULL,
	`z` real NOT NULL,
	`spawned_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`reward_id` text NOT NULL,
	`claimed_at` integer
);
--> statement-breakpoint
CREATE INDEX `bottles_actor_idx` ON `bottles` (`actor`,`expires_at`);--> statement-breakpoint
CREATE TABLE `explorers` (
	`actor` text PRIMARY KEY NOT NULL,
	`next_spawn_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `inventory` (
	`actor` text NOT NULL,
	`item_id` text NOT NULL,
	`acquired_at` integer NOT NULL,
	PRIMARY KEY(`actor`, `item_id`)
);
--> statement-breakpoint
CREATE TABLE `library_books` (
	`id` text PRIMARY KEY NOT NULL,
	`library_id` text NOT NULL,
	`data` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `library_books_library_idx` ON `library_books` (`library_id`);--> statement-breakpoint
CREATE TABLE `tarot_draws` (
	`actor` text NOT NULL,
	`day` text NOT NULL,
	`data` text NOT NULL,
	PRIMARY KEY(`actor`, `day`)
);
--> statement-breakpoint
CREATE TABLE `wardrobes` (
	`actor` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL
);
