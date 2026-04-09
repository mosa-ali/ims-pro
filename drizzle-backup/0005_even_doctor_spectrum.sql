CREATE TABLE `grants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`projectId` int NOT NULL,
	`grantNumber` varchar(100) NOT NULL,
	`grantName` text NOT NULL,
	`grantNameAr` text,
	`donorName` varchar(255) NOT NULL,
	`donorReference` varchar(255),
	`grantAmount` decimal(15,2) NOT NULL,
	`currency` enum('USD','EUR','GBP','CHF') NOT NULL DEFAULT 'USD',
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`status` enum('active','completed','pending','on_hold') NOT NULL DEFAULT 'pending',
	`reportingStatus` enum('on_track','due','overdue') NOT NULL DEFAULT 'on_track',
	`description` text,
	`descriptionAr` text,
	`sector` varchar(255),
	`responsible` varchar(255),
	`reportingFrequency` enum('monthly','quarterly','semi_annually','annually') NOT NULL DEFAULT 'quarterly',
	`coFunding` boolean NOT NULL DEFAULT false,
	`coFunderName` varchar(255),
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `grants_id` PRIMARY KEY(`id`),
	CONSTRAINT `grants_grantNumber_unique` UNIQUE(`grantNumber`)
);
--> statement-breakpoint
ALTER TABLE `grants` ADD CONSTRAINT `grants_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `grants` ADD CONSTRAINT `grants_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `grants` ADD CONSTRAINT `grants_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `grants` ADD CONSTRAINT `grants_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `grants` ADD CONSTRAINT `grants_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `grants` ADD CONSTRAINT `grants_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;