CREATE TABLE `systemImportReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`projectId` int,
	`module` varchar(100) NOT NULL,
	`importType` enum('create','update') NOT NULL DEFAULT 'create',
	`userId` int,
	`userName` varchar(255),
	`userRole` varchar(50),
	`importSummary` json NOT NULL,
	`errorDetails` json NOT NULL,
	`errorFilePath` varchar(500),
	`originalFilePath` varchar(500),
	`status` enum('open','reviewed','resolved') NOT NULL DEFAULT 'open',
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`resolutionNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `systemImportReports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `systemImportReports` ADD CONSTRAINT `systemImportReports_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `systemImportReports` ADD CONSTRAINT `systemImportReports_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `systemImportReports` ADD CONSTRAINT `systemImportReports_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `systemImportReports` ADD CONSTRAINT `systemImportReports_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `systemImportReports` ADD CONSTRAINT `systemImportReports_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;