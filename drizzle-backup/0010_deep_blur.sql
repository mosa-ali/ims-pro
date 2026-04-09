CREATE TABLE `pipeline_opportunities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`title` text NOT NULL,
	`donorName` varchar(255) NOT NULL,
	`donorType` enum('UN','EU','INGO','Foundation','Government','Other') NOT NULL,
	`fundingWindow` varchar(255),
	`deadline` date NOT NULL,
	`indicativeBudgetMin` decimal(15,2) NOT NULL,
	`indicativeBudgetMax` decimal(15,2) NOT NULL,
	`sectors` json NOT NULL,
	`country` varchar(100) NOT NULL,
	`governorate` varchar(255),
	`stage` enum('Identified','Under Review','Go Decision','No-Go','Concept Requested','Proposal Requested') NOT NULL DEFAULT 'Identified',
	`probability` int NOT NULL DEFAULT 50,
	`focalPoint` varchar(255),
	`notes` text,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `pipeline_opportunities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `proposals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`pipelineOpportunityId` int,
	`proposalTitle` text NOT NULL,
	`donorName` varchar(255) NOT NULL,
	`callReference` varchar(255),
	`proposalType` enum('Concept Note','Full Proposal','Expression of Interest') NOT NULL,
	`country` varchar(100) NOT NULL,
	`governorate` varchar(255),
	`sectors` json NOT NULL,
	`projectDuration` int NOT NULL,
	`totalRequestedBudget` decimal(15,2) NOT NULL,
	`currency` enum('USD','EUR','GBP','CHF') NOT NULL DEFAULT 'USD',
	`submissionDeadline` date NOT NULL,
	`proposalStatus` enum('Draft','Under Internal Review','Submitted','Approved','Rejected','Withdrawn') NOT NULL DEFAULT 'Draft',
	`completionPercentage` int NOT NULL DEFAULT 0,
	`executiveSummary` text,
	`problemStatement` text,
	`objectives` json,
	`activities` json,
	`budget` json,
	`logframe` json,
	`leadWriter` varchar(255),
	`reviewers` json,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `proposals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `pipeline_opportunities` ADD CONSTRAINT `pipeline_opportunities_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pipeline_opportunities` ADD CONSTRAINT `pipeline_opportunities_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pipeline_opportunities` ADD CONSTRAINT `pipeline_opportunities_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pipeline_opportunities` ADD CONSTRAINT `pipeline_opportunities_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pipeline_opportunities` ADD CONSTRAINT `pipeline_opportunities_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposals` ADD CONSTRAINT `proposals_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposals` ADD CONSTRAINT `proposals_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposals` ADD CONSTRAINT `proposals_pipelineOpportunityId_pipeline_opportunities_id_fk` FOREIGN KEY (`pipelineOpportunityId`) REFERENCES `pipeline_opportunities`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposals` ADD CONSTRAINT `proposals_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposals` ADD CONSTRAINT `proposals_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposals` ADD CONSTRAINT `proposals_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;