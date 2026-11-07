-- Google 登入：新增單次 OAuth 流程與可撤銷的登入工作階段。
CREATE TABLE `auth_requests` (
	`state_hash` text PRIMARY KEY NOT NULL,
	`verifier` text NOT NULL,
	`nonce` text NOT NULL,
	`return_to` text NOT NULL,
	`origin` text NOT NULL,
	`ip_hash` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `auth_requests_expiry_idx` ON `auth_requests` (`expires_at`);--> statement-breakpoint
CREATE INDEX `auth_requests_ip_idx` ON `auth_requests` (`ip_hash`);--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `auth_sessions_expiry_idx` ON `auth_sessions` (`expires_at`);