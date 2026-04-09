CREATE TABLE `donor_communications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`donorId` int NOT NULL,
	`date` timestamp NOT NULL,
	`channel` enum('email','meeting','call','visit','letter','video_call','other') NOT NULL DEFAULT 'email',
	`subject` varchar(500) NOT NULL,
	`subjectAr` varchar(500),
	`summary` text NOT NULL,
	`summaryAr` text,
	`participants` text,
	`contactPerson` varchar(255),
	`nextActionDate` timestamp,
	`nextActionDescription` text,
	`attachments` text,
	`status` enum('completed','pending','cancelled') DEFAULT 'completed',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `donor_communications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `donor_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`donorId` int,
	`projectId` int,
	`grantId` int,
	`reportType` enum('donor_summary','funding_history','pipeline_status','budget_vs_actual','grant_performance','communication_log','custom') NOT NULL DEFAULT 'donor_summary',
	`title` varchar(500) NOT NULL,
	`titleAr` varchar(500),
	`periodStart` timestamp,
	`periodEnd` timestamp,
	`parametersJSON` text,
	`generatedByUserId` int,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`status` enum('draft','final','archived') DEFAULT 'final',
	`fileUrl` text,
	`pdfUrl` text,
	`excelUrl` text,
	`documentId` int,
	`reportDataJSON` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `donor_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `donors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`code` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`nameAr` varchar(255),
	`type` enum('bilateral','multilateral','foundation','corporate','individual','government','ngo','other') DEFAULT 'other',
	`category` varchar(100),
	`contactPersonName` varchar(255),
	`contactPersonTitle` varchar(255),
	`email` varchar(255),
	`phone` varchar(50),
	`website` varchar(255),
	`address` text,
	`city` varchar(100),
	`country` varchar(100),
	`postalCode` varchar(20),
	`notes` text,
	`notesAr` text,
	`logoUrl` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `donors_id` PRIMARY KEY(`id`),
	CONSTRAINT `donors_org_code_unique` UNIQUE(`organizationId`,`code`)
);
--> statement-breakpoint
ALTER TABLE `donor_communications` ADD CONSTRAINT `donor_communications_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donor_communications` ADD CONSTRAINT `donor_communications_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donor_communications` ADD CONSTRAINT `donor_communications_donorId_donors_id_fk` FOREIGN KEY (`donorId`) REFERENCES `donors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donor_communications` ADD CONSTRAINT `donor_communications_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donor_communications` ADD CONSTRAINT `donor_communications_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donor_communications` ADD CONSTRAINT `donor_communications_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donor_reports` ADD CONSTRAINT `donor_reports_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donor_reports` ADD CONSTRAINT `donor_reports_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donor_reports` ADD CONSTRAINT `donor_reports_donorId_donors_id_fk` FOREIGN KEY (`donorId`) REFERENCES `donors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donor_reports` ADD CONSTRAINT `donor_reports_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donor_reports` ADD CONSTRAINT `donor_reports_grantId_grants_id_fk` FOREIGN KEY (`grantId`) REFERENCES `grants`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donor_reports` ADD CONSTRAINT `donor_reports_generatedByUserId_users_id_fk` FOREIGN KEY (`generatedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donor_reports` ADD CONSTRAINT `donor_reports_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donor_reports` ADD CONSTRAINT `donor_reports_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donor_reports` ADD CONSTRAINT `donor_reports_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donors` ADD CONSTRAINT `donors_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donors` ADD CONSTRAINT `donors_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donors` ADD CONSTRAINT `donors_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donors` ADD CONSTRAINT `donors_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donors` ADD CONSTRAINT `donors_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `donor_communications_donor_date_idx` ON `donor_communications` (`donorId`,`date`);--> statement-breakpoint
CREATE INDEX `donor_communications_org_ou_idx` ON `donor_communications` (`organizationId`,`operatingUnitId`);--> statement-breakpoint
CREATE INDEX `donor_reports_donor_generated_idx` ON `donor_reports` (`donorId`,`generatedAt`);--> statement-breakpoint
CREATE INDEX `donor_reports_org_ou_idx` ON `donor_reports` (`organizationId`,`operatingUnitId`);--> statement-breakpoint
CREATE INDEX `donors_org_name_idx` ON `donors` (`organizationId`,`name`);