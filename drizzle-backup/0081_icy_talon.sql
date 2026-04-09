CREATE TABLE `mitigation_action_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actionId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` varchar(500) NOT NULL,
	`fileSize` int,
	`fileType` varchar(100),
	`description` text,
	`descriptionAr` text,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	`uploadedBy` int NOT NULL,
	CONSTRAINT `mitigation_action_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mitigation_action_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actionId` int NOT NULL,
	`comment` text NOT NULL,
	`commentAr` text,
	`progressUpdate` int,
	`statusChange` enum('pending','in_progress','completed','cancelled','overdue'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	CONSTRAINT `mitigation_action_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mitigation_actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`riskId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`titleAr` varchar(255),
	`description` text,
	`descriptionAr` text,
	`assignedTo` int,
	`assignedBy` int,
	`deadline` date,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`status` enum('pending','in_progress','completed','cancelled','overdue') NOT NULL DEFAULT 'pending',
	`progress` int NOT NULL DEFAULT 0,
	`priority` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`evidenceRequired` text,
	`evidenceRequiredAr` text,
	`evidenceProvided` text,
	`verifiedBy` int,
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	CONSTRAINT `mitigation_actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `risks` ADD `mitigationProgress` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `mitigation_action_attachments` ADD CONSTRAINT `mitigation_action_attachments_actionId_mitigation_actions_id_fk` FOREIGN KEY (`actionId`) REFERENCES `mitigation_actions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mitigation_action_attachments` ADD CONSTRAINT `mitigation_action_attachments_uploadedBy_users_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mitigation_action_comments` ADD CONSTRAINT `mitigation_action_comments_actionId_mitigation_actions_id_fk` FOREIGN KEY (`actionId`) REFERENCES `mitigation_actions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mitigation_action_comments` ADD CONSTRAINT `mitigation_action_comments_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mitigation_actions` ADD CONSTRAINT `mitigation_actions_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mitigation_actions` ADD CONSTRAINT `mitigation_actions_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mitigation_actions` ADD CONSTRAINT `mitigation_actions_riskId_risks_id_fk` FOREIGN KEY (`riskId`) REFERENCES `risks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mitigation_actions` ADD CONSTRAINT `mitigation_actions_assignedTo_users_id_fk` FOREIGN KEY (`assignedTo`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mitigation_actions` ADD CONSTRAINT `mitigation_actions_assignedBy_users_id_fk` FOREIGN KEY (`assignedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mitigation_actions` ADD CONSTRAINT `mitigation_actions_verifiedBy_users_id_fk` FOREIGN KEY (`verifiedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mitigation_actions` ADD CONSTRAINT `mitigation_actions_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_mitigation_attachments_action` ON `mitigation_action_attachments` (`actionId`);--> statement-breakpoint
CREATE INDEX `idx_mitigation_comments_action` ON `mitigation_action_comments` (`actionId`);--> statement-breakpoint
CREATE INDEX `idx_mitigation_comments_created` ON `mitigation_action_comments` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_mitigation_actions_org` ON `mitigation_actions` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_mitigation_actions_risk` ON `mitigation_actions` (`riskId`);--> statement-breakpoint
CREATE INDEX `idx_mitigation_actions_assigned` ON `mitigation_actions` (`assignedTo`);--> statement-breakpoint
CREATE INDEX `idx_mitigation_actions_status` ON `mitigation_actions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_mitigation_actions_deadline` ON `mitigation_actions` (`deadline`);