CREATE TABLE `budget_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`fiscalYear` varchar(20) NOT NULL,
	`budgetCode` varchar(100) NOT NULL,
	`subBL` varchar(100),
	`budgetItem` text NOT NULL,
	`category` varchar(255),
	`quantity` decimal(15,2) NOT NULL,
	`unitType` varchar(100),
	`unitCost` decimal(15,2) NOT NULL,
	`recurrence` int NOT NULL DEFAULT 1,
	`totalBudgetLine` decimal(15,2) NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'USD',
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `budget_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`budgetItemId` int NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`expenseDate` date NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`fiscalYear` varchar(20) NOT NULL,
	`month` int NOT NULL,
	`reference` varchar(255),
	`description` text,
	`documentUrl` text,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`approvedBy` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `forecast_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`forecastId` int NOT NULL,
	`userId` int NOT NULL,
	`action` enum('create','update','delete') NOT NULL,
	`fieldChanged` varchar(100),
	`beforeValue` text,
	`afterValue` text,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `forecast_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `forecast_plan` (
	`id` int AUTO_INCREMENT NOT NULL,
	`budgetItemId` int NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`fiscalYear` varchar(20) NOT NULL,
	`yearNumber` int NOT NULL,
	`m1` decimal(15,2) NOT NULL DEFAULT '0.00',
	`m2` decimal(15,2) NOT NULL DEFAULT '0.00',
	`m3` decimal(15,2) NOT NULL DEFAULT '0.00',
	`m4` decimal(15,2) NOT NULL DEFAULT '0.00',
	`m5` decimal(15,2) NOT NULL DEFAULT '0.00',
	`m6` decimal(15,2) NOT NULL DEFAULT '0.00',
	`m7` decimal(15,2) NOT NULL DEFAULT '0.00',
	`m8` decimal(15,2) NOT NULL DEFAULT '0.00',
	`m9` decimal(15,2) NOT NULL DEFAULT '0.00',
	`m10` decimal(15,2) NOT NULL DEFAULT '0.00',
	`m11` decimal(15,2) NOT NULL DEFAULT '0.00',
	`m12` decimal(15,2) NOT NULL DEFAULT '0.00',
	`totalForecast` decimal(15,2) NOT NULL DEFAULT '0.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `forecast_plan_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `budget_items` ADD CONSTRAINT `budget_items_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_items` ADD CONSTRAINT `budget_items_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_items` ADD CONSTRAINT `budget_items_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_items` ADD CONSTRAINT `budget_items_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_items` ADD CONSTRAINT `budget_items_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_budgetItemId_budget_items_id_fk` FOREIGN KEY (`budgetItemId`) REFERENCES `budget_items`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forecast_audit_log` ADD CONSTRAINT `forecast_audit_log_forecastId_forecast_plan_id_fk` FOREIGN KEY (`forecastId`) REFERENCES `forecast_plan`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forecast_audit_log` ADD CONSTRAINT `forecast_audit_log_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forecast_audit_log` ADD CONSTRAINT `forecast_audit_log_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forecast_audit_log` ADD CONSTRAINT `forecast_audit_log_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forecast_plan` ADD CONSTRAINT `forecast_plan_budgetItemId_budget_items_id_fk` FOREIGN KEY (`budgetItemId`) REFERENCES `budget_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forecast_plan` ADD CONSTRAINT `forecast_plan_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forecast_plan` ADD CONSTRAINT `forecast_plan_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forecast_plan` ADD CONSTRAINT `forecast_plan_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forecast_plan` ADD CONSTRAINT `forecast_plan_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forecast_plan` ADD CONSTRAINT `forecast_plan_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;