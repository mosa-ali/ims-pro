CREATE TABLE `purge_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recordId` int NOT NULL,
	`recordType` varchar(100) NOT NULL,
	`scope` enum('platform','organization') NOT NULL,
	`organizationId` int,
	`operatingUnitId` int,
	`scheduledPurgeDate` bigint NOT NULL,
	`notificationSentAt` bigint,
	`notificationStatus` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
	`createdAt` bigint NOT NULL,
	CONSTRAINT `purge_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(255) NOT NULL,
	`settingValue` text,
	`updatedAt` bigint NOT NULL,
	`updatedBy` int,
	CONSTRAINT `system_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_settings_settingKey_unique` UNIQUE(`settingKey`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `passwordResetToken` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `passwordResetExpiry` bigint;--> statement-breakpoint
ALTER TABLE `system_settings` ADD CONSTRAINT `system_settings_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_scheduled_purge` ON `purge_notifications` (`scheduledPurgeDate`);--> statement-breakpoint
CREATE INDEX `idx_notification_status` ON `purge_notifications` (`notificationStatus`);--> statement-breakpoint
CREATE INDEX `idx_scope_org` ON `purge_notifications` (`scope`,`organizationId`,`operatingUnitId`);--> statement-breakpoint
CREATE INDEX `idx_setting_key` ON `system_settings` (`settingKey`);