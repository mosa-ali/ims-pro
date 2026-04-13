CREATE TABLE `budget_analysis_expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`budgetId` int NOT NULL,
	`budgetLineId` int NOT NULL,
	`budgetItemId` int,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`expenseAmount` decimal(15,2) NOT NULL,
	`expenseDate` date NOT NULL,
	`description` text NOT NULL,
	`descriptionAr` text,
	`category` varchar(100),
	`reference` varchar(255),
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`notes` text,
	`notesAr` text,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	CONSTRAINT `budget_analysis_expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `budget_analysis_expenses` ADD CONSTRAINT `budget_analysis_expenses_budgetId_budgets_id_fk` FOREIGN KEY (`budgetId`) REFERENCES `budgets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_analysis_expenses` ADD CONSTRAINT `budget_analysis_expenses_budgetLineId_budget_lines_id_fk` FOREIGN KEY (`budgetLineId`) REFERENCES `budget_lines`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_analysis_expenses` ADD CONSTRAINT `budget_analysis_expenses_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_analysis_expenses` ADD CONSTRAINT `budget_analysis_expenses_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_analysis_expenses` ADD CONSTRAINT `budget_analysis_expenses_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_analysis_expenses` ADD CONSTRAINT `budget_analysis_expenses_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_budget_id` ON `budget_analysis_expenses` (`budgetId`);--> statement-breakpoint
CREATE INDEX `idx_budget_line_id` ON `budget_analysis_expenses` (`budgetLineId`);--> statement-breakpoint
CREATE INDEX `idx_organization_id` ON `budget_analysis_expenses` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_expense_date` ON `budget_analysis_expenses` (`expenseDate`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `budget_analysis_expenses` (`status`);