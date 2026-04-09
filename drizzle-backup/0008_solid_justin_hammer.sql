CREATE TABLE `reporting_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`reportType` enum('NARRATIVE','FINANCIAL','PROGRESS','FINAL','INTERIM','QUARTERLY','ANNUAL','OTHER') NOT NULL,
	`reportTypeOther` varchar(255),
	`periodFrom` date NOT NULL,
	`periodTo` date NOT NULL,
	`reportStatus` enum('NOT_STARTED','PLANNED','UNDER_PREPARATION','UNDER_REVIEW','SUBMITTED_TO_HQ','SUBMITTED_TO_DONOR') NOT NULL DEFAULT 'PLANNED',
	`reportDeadline` date NOT NULL,
	`notes` text,
	`isLocked` boolean NOT NULL DEFAULT false,
	`lockedAt` timestamp,
	`lockedBy` int,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `reporting_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `reporting_schedules` ADD CONSTRAINT `reporting_schedules_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reporting_schedules` ADD CONSTRAINT `reporting_schedules_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reporting_schedules` ADD CONSTRAINT `reporting_schedules_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reporting_schedules` ADD CONSTRAINT `reporting_schedules_lockedBy_users_id_fk` FOREIGN KEY (`lockedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reporting_schedules` ADD CONSTRAINT `reporting_schedules_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reporting_schedules` ADD CONSTRAINT `reporting_schedules_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reporting_schedules` ADD CONSTRAINT `reporting_schedules_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;