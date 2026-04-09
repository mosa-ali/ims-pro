CREATE TABLE `globalSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`defaultLanguage` varchar(10) NOT NULL DEFAULT 'en',
	`defaultTimezone` varchar(100) NOT NULL DEFAULT 'UTC',
	`defaultCurrency` varchar(10) NOT NULL DEFAULT 'USD',
	`environmentLabel` enum('production','staging','test') NOT NULL DEFAULT 'production',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `globalSettings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `globalSettings` ADD CONSTRAINT `globalSettings_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;