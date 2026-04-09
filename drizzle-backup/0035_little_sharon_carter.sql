ALTER TABLE `budget_items` ADD `activityId` int;--> statement-breakpoint
ALTER TABLE `indicators` ADD `activityId` int;--> statement-breakpoint
ALTER TABLE `procurement_plan` ADD `activityId` int;--> statement-breakpoint
ALTER TABLE `budget_items` ADD CONSTRAINT `budget_items_activityId_activities_id_fk` FOREIGN KEY (`activityId`) REFERENCES `activities`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `indicators` ADD CONSTRAINT `indicators_activityId_activities_id_fk` FOREIGN KEY (`activityId`) REFERENCES `activities`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `procurement_plan` ADD CONSTRAINT `procurement_plan_activityId_activities_id_fk` FOREIGN KEY (`activityId`) REFERENCES `activities`(`id`) ON DELETE set null ON UPDATE no action;