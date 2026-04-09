ALTER TABLE `meal_dqa_actions` ADD `isDeleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `meal_dqa_actions` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `meal_dqa_actions` ADD `deletedBy` int;--> statement-breakpoint
ALTER TABLE `meal_dqa_findings` ADD `isDeleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `meal_dqa_findings` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `meal_dqa_findings` ADD `deletedBy` int;--> statement-breakpoint
ALTER TABLE `meal_dqa_visits` ADD `isDeleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `meal_dqa_visits` ADD `deletedBy` int;--> statement-breakpoint
ALTER TABLE `meal_indicator_templates` ADD `isDeleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `meal_indicator_templates` ADD `deletedBy` int;--> statement-breakpoint
ALTER TABLE `meal_learning_actions` ADD `isDeleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `meal_learning_actions` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `meal_learning_actions` ADD `deletedBy` int;--> statement-breakpoint
ALTER TABLE `meal_learning_items` ADD `isDeleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `meal_survey_standards` ADD `isDeleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `meal_survey_standards` ADD `deletedBy` int;--> statement-breakpoint
ALTER TABLE `meal_dqa_actions` ADD CONSTRAINT `meal_dqa_actions_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_dqa_findings` ADD CONSTRAINT `meal_dqa_findings_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_dqa_visits` ADD CONSTRAINT `meal_dqa_visits_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_indicator_templates` ADD CONSTRAINT `meal_indicator_templates_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_learning_actions` ADD CONSTRAINT `meal_learning_actions_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_survey_standards` ADD CONSTRAINT `meal_survey_standards_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;