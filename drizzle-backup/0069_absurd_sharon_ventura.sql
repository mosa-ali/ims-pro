ALTER TABLE `users` DROP INDEX `users_email_unique`;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `email` varchar(320);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('platform_super_admin','platform_admin','platform_auditor','organization_admin','user','admin','manager') NOT NULL DEFAULT 'user';