CREATE TABLE `risk_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`riskId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`changeType` enum('created','status_changed','owner_changed','assessment_updated','mitigation_updated','closed','reopened','other') NOT NULL,
	`previousValue` text,
	`newValue` text,
	`description` text,
	`descriptionAr` text,
	`changedBy` int,
	`changedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `risk_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `risk_history` ADD CONSTRAINT `risk_history_riskId_risks_id_fk` FOREIGN KEY (`riskId`) REFERENCES `risks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `risk_history` ADD CONSTRAINT `risk_history_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `risk_history` ADD CONSTRAINT `risk_history_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `risk_history` ADD CONSTRAINT `risk_history_changedBy_users_id_fk` FOREIGN KEY (`changedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_risk_history_risk` ON `risk_history` (`riskId`);--> statement-breakpoint
CREATE INDEX `idx_risk_history_org` ON `risk_history` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_risk_history_date` ON `risk_history` (`changedAt`);