CREATE TABLE `donor_projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`donorId` int NOT NULL,
	`projectId` int NOT NULL,
	`relationshipType` enum('primary_funder','co_funder','in_kind','technical_partner','potential','past') NOT NULL DEFAULT 'primary_funder',
	`status` enum('active','pending','completed','cancelled') NOT NULL DEFAULT 'active',
	`fundingAmount` decimal(15,2),
	`currency` varchar(10) DEFAULT 'USD',
	`fundingPercentage` decimal(5,2),
	`startDate` timestamp,
	`endDate` timestamp,
	`notes` text,
	`notesAr` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `donor_projects_id` PRIMARY KEY(`id`),
	CONSTRAINT `donor_projects_donor_project_unique` UNIQUE(`donorId`,`projectId`)
);
--> statement-breakpoint
ALTER TABLE `donor_projects` ADD CONSTRAINT `donor_projects_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donor_projects` ADD CONSTRAINT `donor_projects_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donor_projects` ADD CONSTRAINT `donor_projects_donorId_donors_id_fk` FOREIGN KEY (`donorId`) REFERENCES `donors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donor_projects` ADD CONSTRAINT `donor_projects_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donor_projects` ADD CONSTRAINT `donor_projects_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donor_projects` ADD CONSTRAINT `donor_projects_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donor_projects` ADD CONSTRAINT `donor_projects_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `donor_projects_org_ou_idx` ON `donor_projects` (`organizationId`,`operatingUnitId`);