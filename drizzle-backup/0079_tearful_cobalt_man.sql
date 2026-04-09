ALTER TABLE `risks` ADD `projectId` int;--> statement-breakpoint
ALTER TABLE `risks` ADD `activityId` int;--> statement-breakpoint
ALTER TABLE `risks` ADD `budgetItemId` int;--> statement-breakpoint
ALTER TABLE `risks` ADD `indicatorId` int;--> statement-breakpoint
ALTER TABLE `risks` ADD `isSystemGenerated` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `risks` ADD `source` enum('finance','meal','activities','manual') DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `risks` ADD `triggerValue` varchar(255);--> statement-breakpoint
ALTER TABLE `risks` ADD `trendDirection` enum('increasing','improving','stable');--> statement-breakpoint
ALTER TABLE `risks` ADD `lastEvaluatedAt` timestamp;--> statement-breakpoint
ALTER TABLE `risks` ADD `autoMitigationSuggestions` text;--> statement-breakpoint
ALTER TABLE `risks` ADD CONSTRAINT `risks_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `risks` ADD CONSTRAINT `risks_activityId_activities_id_fk` FOREIGN KEY (`activityId`) REFERENCES `activities`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `risks` ADD CONSTRAINT `risks_budgetItemId_budget_items_id_fk` FOREIGN KEY (`budgetItemId`) REFERENCES `budget_items`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `risks` ADD CONSTRAINT `risks_indicatorId_indicators_id_fk` FOREIGN KEY (`indicatorId`) REFERENCES `indicators`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_risks_project` ON `risks` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_risks_activity` ON `risks` (`activityId`);--> statement-breakpoint
CREATE INDEX `idx_risks_source` ON `risks` (`source`);--> statement-breakpoint
CREATE INDEX `idx_risks_system_generated` ON `risks` (`isSystemGenerated`);