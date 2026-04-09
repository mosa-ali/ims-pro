ALTER TABLE `budget_items` ADD `isDeleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `budget_items` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `budget_items` ADD `deletedBy` int;--> statement-breakpoint
ALTER TABLE `budget_lines` ADD `isDeleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `budget_monthly_allocations` ADD `organizationId` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `budget_monthly_allocations` ADD `operatingUnitId` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `budget_monthly_allocations` ADD `isDeleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `budget_monthly_allocations` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `budget_monthly_allocations` ADD `deletedBy` int;--> statement-breakpoint
ALTER TABLE `budget_reallocation_lines` ADD `operatingUnitId` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `budget_reallocation_lines` ADD `isDeleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `budget_reallocation_lines` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `budget_reallocation_lines` ADD `deletedBy` int;--> statement-breakpoint
ALTER TABLE `budget_reallocations` ADD `isDeleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `budget_reallocations` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `budget_reallocations` ADD `deletedBy` int;--> statement-breakpoint
ALTER TABLE `budgets` ADD `isDeleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `expenses` ADD `isDeleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `forecast_plan` ADD `isDeleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `forecast_plan` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `forecast_plan` ADD `deletedBy` int;--> statement-breakpoint
ALTER TABLE `variance_alert_config` ADD `isDeleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `variance_alert_config` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `variance_alert_config` ADD `deletedBy` int;--> statement-breakpoint
ALTER TABLE `variance_alert_history` ADD `isDeleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `variance_alert_history` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `variance_alert_history` ADD `deletedBy` int;--> statement-breakpoint
ALTER TABLE `variance_alert_thresholds` ADD `isDeleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `variance_alert_thresholds` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `variance_alert_thresholds` ADD `deletedBy` int;--> statement-breakpoint
ALTER TABLE `variance_alerts` ADD `isDeleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `variance_alerts` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `variance_alerts` ADD `deletedBy` int;--> statement-breakpoint
ALTER TABLE `budget_items` ADD CONSTRAINT `budget_items_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_monthly_allocations` ADD CONSTRAINT `budget_monthly_allocations_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forecast_plan` ADD CONSTRAINT `forecast_plan_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variance_alert_config` ADD CONSTRAINT `variance_alert_config_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variance_alert_history` ADD CONSTRAINT `variance_alert_history_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variance_alert_thresholds` ADD CONSTRAINT `variance_alert_thresholds_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variance_alerts` ADD CONSTRAINT `variance_alerts_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;