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
	`grantId` int,
	`projectId` int,
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
ALTER TABLE `proposals` ADD CONSTRAINT `proposals_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposals` ADD CONSTRAINT `proposals_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposals` ADD CONSTRAINT `proposals_pipelineOpportunityId_pipeline_opportunities_id_fk` FOREIGN KEY (`pipelineOpportunityId`) REFERENCES `pipeline_opportunities`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposals` ADD CONSTRAINT `proposals_grantId_grants_id_fk` FOREIGN KEY (`grantId`) REFERENCES `grants`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposals` ADD CONSTRAINT `proposals_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposals` ADD CONSTRAINT `proposals_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposals` ADD CONSTRAINT `proposals_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposals` ADD CONSTRAINT `proposals_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;