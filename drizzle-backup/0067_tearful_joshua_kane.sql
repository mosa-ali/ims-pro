CREATE TABLE `user_archive_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`action` enum('delete','restore') NOT NULL,
	`userSnapshot` text NOT NULL,
	`previousRoles` text,
	`previousOrganizations` text,
	`previousPermissions` text,
	`reason` text,
	`performedBy` int NOT NULL,
	`performedByName` varchar(255),
	`performedAt` timestamp NOT NULL DEFAULT (now()),
	`restorationMetadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_archive_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `isDeleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `deletedBy` int;--> statement-breakpoint
ALTER TABLE `users` ADD `deletionReason` text;--> statement-breakpoint
ALTER TABLE `user_archive_log` ADD CONSTRAINT `user_archive_log_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_archive_log` ADD CONSTRAINT `user_archive_log_performedBy_users_id_fk` FOREIGN KEY (`performedBy`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ual_user_idx` ON `user_archive_log` (`userId`);--> statement-breakpoint
CREATE INDEX `ual_action_idx` ON `user_archive_log` (`action`);--> statement-breakpoint
CREATE INDEX `ual_performed_at_idx` ON `user_archive_log` (`performedAt`);