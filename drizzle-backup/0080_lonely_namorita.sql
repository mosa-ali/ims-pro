CREATE TABLE `mitigation_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`templateName` varchar(255) NOT NULL,
	`templateNameAr` varchar(255),
	`riskCategory` enum('operational','financial','strategic','compliance','reputational','technological','environmental','security','legal','other') NOT NULL,
	`riskType` varchar(100),
	`severity` enum('low','medium','high','critical'),
	`suggestedActions` text NOT NULL,
	`suggestedActionsAr` text,
	`responsibleRole` varchar(100),
	`expectedTimeframe` varchar(100),
	`evidenceRequired` text,
	`evidenceRequiredAr` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	CONSTRAINT `mitigation_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `mitigation_templates` ADD CONSTRAINT `mitigation_templates_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mitigation_templates` ADD CONSTRAINT `mitigation_templates_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_mitigation_templates_org` ON `mitigation_templates` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_mitigation_templates_category` ON `mitigation_templates` (`riskCategory`);--> statement-breakpoint
CREATE INDEX `idx_mitigation_templates_type` ON `mitigation_templates` (`riskType`);