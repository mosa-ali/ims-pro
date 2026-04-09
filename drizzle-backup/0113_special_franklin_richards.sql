CREATE TABLE `finance_expenditure_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`categoryName` varchar(100) NOT NULL,
	`categoryNameAr` varchar(100),
	`description` text,
	`descriptionAr` text,
	`glAccountId` int,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `finance_expenditure_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_expenditures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`projectId` int,
	`budgetLineId` int,
	`payeeId` int,
	`payeeType` enum('employee','vendor','other') NOT NULL,
	`payeeName` varchar(255) NOT NULL,
	`payeeNameAr` varchar(255),
	`expenditureNumber` varchar(50) NOT NULL,
	`expenditureDate` date NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`currencyId` int,
	`amountInBaseCurrency` decimal(15,2),
	`exchangeRateId` int,
	`categoryId` int,
	`description` text,
	`descriptionAr` text,
	`referenceNumber` varchar(100),
	`status` enum('draft','pending_approval','approved','rejected','paid','cancelled') DEFAULT 'draft',
	`approvalStatus` enum('pending','approved','rejected') DEFAULT 'pending',
	`approvedBy` int,
	`approvedAt` timestamp,
	`rejectionReason` text,
	`rejectionReasonAr` text,
	`glAccountId` int,
	`journalEntryId` int,
	`postingStatus` enum('unposted','posted','reversed') DEFAULT 'unposted',
	`receiptUrl` varchar(500),
	`attachments` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	`updatedBy` int,
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedBy` int,
	`deletedAt` timestamp,
	CONSTRAINT `finance_expenditures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `finance_expenditure_categories` ADD CONSTRAINT `finance_expenditure_categories_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_expenditure_categories` ADD CONSTRAINT `finance_expenditure_categories_glAccountId_chart_of_accounts_id_fk` FOREIGN KEY (`glAccountId`) REFERENCES `chart_of_accounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_expenditures` ADD CONSTRAINT `finance_expenditures_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_expenditures` ADD CONSTRAINT `finance_expenditures_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_expenditures` ADD CONSTRAINT `finance_expenditures_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_expenditures` ADD CONSTRAINT `finance_expenditures_budgetLineId_budget_lines_id_fk` FOREIGN KEY (`budgetLineId`) REFERENCES `budget_lines`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_expenditures` ADD CONSTRAINT `finance_expenditures_currencyId_finance_currencies_id_fk` FOREIGN KEY (`currencyId`) REFERENCES `finance_currencies`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_expenditures` ADD CONSTRAINT `finance_expenditures_exchangeRateId_finance_exchange_rates_id_fk` FOREIGN KEY (`exchangeRateId`) REFERENCES `finance_exchange_rates`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_expenditures` ADD CONSTRAINT `finance_expenditures_categoryId_finance_expenditure_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `finance_expenditure_categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_expenditures` ADD CONSTRAINT `finance_expenditures_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_expenditures` ADD CONSTRAINT `finance_expenditures_glAccountId_chart_of_accounts_id_fk` FOREIGN KEY (`glAccountId`) REFERENCES `chart_of_accounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_expenditures` ADD CONSTRAINT `finance_expenditures_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_expenditures` ADD CONSTRAINT `finance_expenditures_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_expenditures` ADD CONSTRAINT `finance_expenditures_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;