ALTER TABLE `user_organizations` MODIFY COLUMN `platformRole` enum('platform_admin','organization_admin','user') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `operating_units` ADD `code` varchar(50);--> statement-breakpoint
ALTER TABLE `organizations` ADD `shortCode` varchar(20);--> statement-breakpoint
ALTER TABLE `operating_units` ADD CONSTRAINT `operating_units_code_unique` UNIQUE(`code`);