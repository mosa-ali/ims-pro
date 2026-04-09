-- Manual creation of risks and incidents tables for Risk & Compliance Module
-- This script creates the tables to match the Drizzle schema definition

-- Create risks table
CREATE TABLE IF NOT EXISTS `risks` (
  `id` int AUTO_INCREMENT NOT NULL,
  `organizationId` int NOT NULL,
  `operatingUnitId` int,
  `riskCode` varchar(50),
  `title` varchar(255) NOT NULL,
  `titleAr` varchar(255),
  `description` text,
  `descriptionAr` text,
  `category` enum('operational','financial','strategic','compliance','reputational','technological','environmental','security','legal','other') NOT NULL,
  `likelihood` int NOT NULL,
  `impact` int NOT NULL,
  `score` int NOT NULL,
  `level` enum('low','medium','high','critical') NOT NULL,
  `status` enum('identified','assessed','mitigated','accepted','transferred','closed') NOT NULL DEFAULT 'identified',
  `mitigationPlan` text,
  `mitigationPlanAr` text,
  `owner` int,
  `identifiedDate` date,
  `reviewDate` date,
  `targetClosureDate` date,
  `closedDate` date,
  `attachments` text,
  `notes` text,
  `isDeleted` boolean NOT NULL DEFAULT false,
  `deletedAt` timestamp,
  `deletedBy` int,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `createdBy` int,
  CONSTRAINT `risks_id` PRIMARY KEY(`id`),
  CONSTRAINT `risks_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action,
  CONSTRAINT `risks_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action,
  CONSTRAINT `risks_owner_users_id_fk` FOREIGN KEY (`owner`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action,
  CONSTRAINT `risks_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action,
  CONSTRAINT `risks_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action
);

CREATE INDEX `idx_risks_org` ON `risks` (`organizationId`);
CREATE INDEX `idx_risks_ou` ON `risks` (`operatingUnitId`);
CREATE INDEX `idx_risks_status` ON `risks` (`status`);
CREATE INDEX `idx_risks_level` ON `risks` (`level`);

-- Create incidents table
CREATE TABLE IF NOT EXISTS `incidents` (
  `id` int AUTO_INCREMENT NOT NULL,
  `organizationId` int NOT NULL,
  `operatingUnitId` int,
  `incidentCode` varchar(50),
  `title` varchar(255) NOT NULL,
  `titleAr` varchar(255),
  `description` text NOT NULL,
  `descriptionAr` text,
  `category` enum('safety','security','data_breach','operational','hr','financial','environmental','legal','reputational','other') NOT NULL,
  `severity` enum('minor','moderate','major','critical') NOT NULL,
  `incidentDate` timestamp NOT NULL,
  `reportedDate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `location` varchar(255),
  `reportedBy` int,
  `affectedParties` text,
  `witnesses` text,
  `investigationStatus` enum('pending','in_progress','completed','closed') NOT NULL DEFAULT 'pending',
  `investigationNotes` text,
  `investigatedBy` int,
  `investigationCompletedAt` timestamp,
  `rootCause` text,
  `rootCauseAr` text,
  `correctiveActions` text,
  `preventiveActions` text,
  `relatedRiskId` int,
  `status` enum('open','under_investigation','resolved','closed') NOT NULL DEFAULT 'open',
  `resolutionDate` timestamp,
  `resolutionNotes` text,
  `attachments` text,
  `notes` text,
  `isDeleted` boolean NOT NULL DEFAULT false,
  `deletedAt` timestamp,
  `deletedBy` int,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `createdBy` int,
  CONSTRAINT `incidents_id` PRIMARY KEY(`id`),
  CONSTRAINT `incidents_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action,
  CONSTRAINT `incidents_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action,
  CONSTRAINT `incidents_reportedBy_users_id_fk` FOREIGN KEY (`reportedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action,
  CONSTRAINT `incidents_investigatedBy_users_id_fk` FOREIGN KEY (`investigatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action,
  CONSTRAINT `incidents_relatedRiskId_risks_id_fk` FOREIGN KEY (`relatedRiskId`) REFERENCES `risks`(`id`) ON DELETE set null ON UPDATE no action,
  CONSTRAINT `incidents_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action,
  CONSTRAINT `incidents_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action
);

CREATE INDEX `idx_incidents_org` ON `incidents` (`organizationId`);
CREATE INDEX `idx_incidents_ou` ON `incidents` (`operatingUnitId`);
CREATE INDEX `idx_incidents_status` ON `incidents` (`status`);
CREATE INDEX `idx_incidents_severity` ON `incidents` (`severity`);
CREATE INDEX `idx_incidents_date` ON `incidents` (`incidentDate`);
