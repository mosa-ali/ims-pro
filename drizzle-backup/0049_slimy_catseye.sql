CREATE TABLE `allocation_bases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`allocationPeriodId` int NOT NULL,
	`projectId` int NOT NULL,
	`allocationKeyId` int NOT NULL,
	`basisValue` decimal(15,2) DEFAULT '0.00',
	`basisPercentage` decimal(5,2) DEFAULT '0.00',
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `allocation_bases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `allocation_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`keyCode` varchar(50) NOT NULL,
	`keyName` varchar(255) NOT NULL,
	`keyType` enum('headcount','budget_percentage','direct_costs','custom','equal','revenue') DEFAULT 'budget_percentage',
	`description` text,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` varchar(255),
	`updatedBy` varchar(255),
	CONSTRAINT `allocation_keys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `allocation_periods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`periodCode` varchar(50) NOT NULL,
	`periodName` varchar(255) NOT NULL,
	`periodType` enum('monthly','quarterly','annual','custom') DEFAULT 'monthly',
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`fiscalYearId` int,
	`status` enum('draft','in_progress','completed','reversed') DEFAULT 'draft',
	`executedAt` timestamp,
	`executedBy` varchar(255),
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` varchar(255),
	`updatedBy` varchar(255),
	CONSTRAINT `allocation_periods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `allocation_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`allocationPeriodId` int NOT NULL,
	`costPoolId` int NOT NULL,
	`projectId` int NOT NULL,
	`allocationKeyId` int NOT NULL,
	`totalPoolAmount` decimal(15,2) DEFAULT '0.00',
	`allocationPercentage` decimal(5,2) DEFAULT '0.00',
	`allocatedAmount` decimal(15,2) DEFAULT '0.00',
	`journalEntryId` int,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `allocation_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `allocation_reversals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`allocationPeriodId` int NOT NULL,
	`reversalDate` date NOT NULL,
	`reversalReason` text,
	`reversalReasonAr` text,
	`originalJournalEntryIds` text,
	`reversalJournalEntryIds` text,
	`totalReversedAmount` decimal(15,2) DEFAULT '0.00',
	`reversedAt` timestamp DEFAULT (now()),
	`reversedBy` int,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `allocation_reversals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `allocation_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`costPoolId` int NOT NULL,
	`allocationKeyId` int NOT NULL,
	`effectiveFrom` date NOT NULL,
	`effectiveTo` date,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` varchar(255),
	`updatedBy` varchar(255),
	CONSTRAINT `allocation_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `allocation_template_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`templateId` int NOT NULL,
	`costPoolId` int NOT NULL,
	`allocationKeyId` int NOT NULL,
	`priority` int DEFAULT 1,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `allocation_template_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `allocation_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`templateCode` varchar(50) NOT NULL,
	`templateName` varchar(255) NOT NULL,
	`templateNameAr` varchar(255),
	`description` text,
	`descriptionAr` text,
	`periodType` enum('monthly','quarterly','annual','custom') DEFAULT 'monthly',
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `allocation_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `asset_depreciation_schedule` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`assetId` int NOT NULL,
	`fiscalYearId` int,
	`fiscalPeriodId` int,
	`periodDate` date NOT NULL,
	`periodNumber` int NOT NULL,
	`openingBookValue` decimal(15,2) NOT NULL,
	`depreciationAmount` decimal(15,2) NOT NULL,
	`accumulatedDepreciation` decimal(15,2) NOT NULL,
	`closingBookValue` decimal(15,2) NOT NULL,
	`depreciationMethod` enum('straight_line','declining_balance','units_of_production') DEFAULT 'straight_line',
	`isPosted` boolean DEFAULT false,
	`journalEntryId` int,
	`postedAt` timestamp,
	`postedBy` int,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `asset_depreciation_schedule_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bank_reconciliations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`bankAccountId` int NOT NULL,
	`reconciliationNumber` varchar(50) NOT NULL,
	`reconciliationDate` date NOT NULL,
	`statementDate` date NOT NULL,
	`statementBalance` decimal(15,2) NOT NULL,
	`bookBalance` decimal(15,2) NOT NULL,
	`adjustedBookBalance` decimal(15,2),
	`outstandingDeposits` decimal(15,2) DEFAULT '0.00',
	`outstandingCheques` decimal(15,2) DEFAULT '0.00',
	`difference` decimal(15,2) DEFAULT '0.00',
	`status` enum('draft','in_progress','completed','approved') DEFAULT 'draft',
	`notes` text,
	`completedAt` timestamp,
	`completedBy` int,
	`approvedAt` timestamp,
	`approvedBy` int,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `bank_reconciliations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bank_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`bankAccountId` int NOT NULL,
	`transactionDate` date NOT NULL,
	`valueDate` date,
	`transactionType` enum('credit','debit') NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`currencyId` int,
	`exchangeRate` decimal(15,6) DEFAULT '1.000000',
	`amountInBaseCurrency` decimal(15,2),
	`reference` varchar(255),
	`description` text,
	`descriptionAr` text,
	`counterpartyName` varchar(255),
	`counterpartyAccount` varchar(100),
	`statementReference` varchar(100),
	`importBatchId` int,
	`isReconciled` boolean DEFAULT false,
	`reconciledAt` timestamp,
	`reconciledBy` int,
	`reconciliationId` int,
	`matchedTransactionType` varchar(50),
	`matchedTransactionId` int,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `bank_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `budget_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`budgetId` int NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`lineCode` varchar(100) NOT NULL,
	`lineNumber` int,
	`description` text NOT NULL,
	`descriptionAr` text,
	`categoryId` int,
	`accountId` int,
	`activityId` int,
	`unitType` enum('staff','item','service','lump_sum') NOT NULL,
	`unitCost` decimal(15,2) NOT NULL,
	`quantity` decimal(15,2) NOT NULL,
	`durationMonths` int NOT NULL DEFAULT 1,
	`totalAmount` decimal(15,2) NOT NULL,
	`donorEligibleAmount` decimal(15,2),
	`donorEligibilityPercentage` decimal(5,2) DEFAULT '100.00',
	`ineligibilityReason` text,
	`ineligibilityReasonAr` text,
	`donorMappingId` int,
	`locationId` int,
	`locationName` varchar(255),
	`implementationPeriodStart` date,
	`implementationPeriodEnd` date,
	`actualSpent` decimal(15,2) NOT NULL DEFAULT '0.00',
	`commitments` decimal(15,2) NOT NULL DEFAULT '0.00',
	`availableBalance` decimal(15,2) NOT NULL DEFAULT '0.00',
	`justification` text,
	`justificationAr` text,
	`notes` text,
	`notesAr` text,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `budget_lines_id` PRIMARY KEY(`id`),
	CONSTRAINT `budget_lines_budgetId_lineCode_unique` UNIQUE(`budgetId`,`lineCode`)
);
--> statement-breakpoint
CREATE TABLE `budget_monthly_allocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`budgetLineId` int NOT NULL,
	`budgetId` int NOT NULL,
	`allocationMonth` date NOT NULL,
	`monthNumber` int NOT NULL,
	`quarterNumber` int NOT NULL,
	`fiscalYear` varchar(20) NOT NULL,
	`plannedAmount` decimal(15,2) NOT NULL DEFAULT '0.00',
	`forecastAmount` decimal(15,2) NOT NULL DEFAULT '0.00',
	`actualAmount` decimal(15,2) NOT NULL DEFAULT '0.00',
	`variance` decimal(15,2) NOT NULL DEFAULT '0.00',
	`notes` text,
	`notesAr` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `budget_monthly_allocations_id` PRIMARY KEY(`id`),
	CONSTRAINT `budget_monthly_allocations_budgetLineId_allocationMonth_unique` UNIQUE(`budgetLineId`,`allocationMonth`)
);
--> statement-breakpoint
CREATE TABLE `budget_reallocation_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`reallocationId` int NOT NULL,
	`lineNumber` int NOT NULL,
	`lineType` enum('source','destination') NOT NULL,
	`projectId` int NOT NULL,
	`budgetItemId` int,
	`glAccountId` int,
	`amount` decimal(15,2) DEFAULT '0.00',
	`currency` varchar(10) DEFAULT 'USD',
	`exchangeRate` decimal(15,6) DEFAULT '1.000000',
	`baseCurrencyAmount` decimal(15,2) DEFAULT '0.00',
	`description` text,
	`descriptionAr` text,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `budget_reallocation_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `budget_reallocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`reallocationCode` varchar(50) NOT NULL,
	`reallocationDate` date NOT NULL,
	`description` text,
	`descriptionAr` text,
	`totalAmount` decimal(15,2) DEFAULT '0.00',
	`currency` varchar(10) DEFAULT 'USD',
	`exchangeRate` decimal(15,6) DEFAULT '1.000000',
	`baseCurrencyAmount` decimal(15,2) DEFAULT '0.00',
	`status` enum('draft','pending_approval','approved','rejected','executed','cancelled') DEFAULT 'draft',
	`justification` text,
	`justificationAr` text,
	`submittedAt` timestamp,
	`submittedBy` int,
	`approvedAt` timestamp,
	`approvedBy` int,
	`rejectedAt` timestamp,
	`rejectedBy` int,
	`rejectionReason` text,
	`rejectionReasonAr` text,
	`executedAt` timestamp,
	`executedBy` int,
	`journalEntryId` int,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `budget_reallocations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `budgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`grantId` int,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`budgetCode` varchar(100),
	`budgetTitle` varchar(500),
	`budgetTitleAr` varchar(500),
	`fiscalYear` varchar(20) NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'USD',
	`baseCurrency` varchar(10) NOT NULL DEFAULT 'USD',
	`exchangeRate` decimal(15,6) DEFAULT '1.000000',
	`totalApprovedAmount` decimal(15,2) NOT NULL DEFAULT '0.00',
	`totalForecastAmount` decimal(15,2) NOT NULL DEFAULT '0.00',
	`totalActualAmount` decimal(15,2) NOT NULL DEFAULT '0.00',
	`versionNumber` int NOT NULL DEFAULT 1,
	`parentBudgetId` int,
	`revisionNotes` text,
	`revisionNotesAr` text,
	`status` enum('draft','submitted','approved','revised','closed','rejected') NOT NULL DEFAULT 'draft',
	`submittedAt` timestamp,
	`submittedBy` int,
	`approvedAt` timestamp,
	`approvedBy` int,
	`rejectedAt` timestamp,
	`rejectedBy` int,
	`rejectionReason` text,
	`rejectionReasonAr` text,
	`periodStart` date NOT NULL,
	`periodEnd` date NOT NULL,
	`notes` text,
	`notesAr` text,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `budgets_id` PRIMARY KEY(`id`),
	CONSTRAINT `budgets_budgetCode_unique` UNIQUE(`budgetCode`)
);
--> statement-breakpoint
CREATE TABLE `cost_centers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`code` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`descriptionAr` text,
	`parentId` int,
	`level` int DEFAULT 1,
	`managerId` int,
	`projectId` int,
	`grantId` int,
	`isActive` boolean DEFAULT true,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `cost_centers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cost_pool_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`costPoolId` int NOT NULL,
	`transactionDate` date NOT NULL,
	`amount` decimal(15,2) DEFAULT '0.00',
	`description` text,
	`sourceModule` enum('manual','expense','payment','journal_entry','import') DEFAULT 'manual',
	`sourceDocumentId` int,
	`sourceDocumentType` varchar(50),
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` varchar(255),
	`updatedBy` varchar(255),
	CONSTRAINT `cost_pool_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cost_pools` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`poolCode` varchar(50) NOT NULL,
	`poolName` varchar(255) NOT NULL,
	`description` text,
	`poolType` enum('overhead','shared_service','administrative','facility','other') DEFAULT 'overhead',
	`glAccountId` int,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` varchar(255),
	`updatedBy` varchar(255),
	`deletedAt` timestamp,
	`deletedBy` varchar(255),
	CONSTRAINT `cost_pools_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `donor_budget_mapping` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`internalCategoryId` int NOT NULL,
	`internalCategoryCode` varchar(50),
	`internalCategoryName` varchar(255),
	`donorId` int,
	`donorName` varchar(255),
	`donorCategoryCode` varchar(100) NOT NULL,
	`donorCategoryName` varchar(500) NOT NULL,
	`donorCategoryNameAr` varchar(500),
	`mappingRules` json,
	`donorReportingLevel` int DEFAULT 1,
	`donorSortOrder` int DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`notes` text,
	`notesAr` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `donor_budget_mapping_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fiscal_periods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`fiscalYearId` int NOT NULL,
	`periodNumber` int NOT NULL,
	`periodName` varchar(50) NOT NULL,
	`periodNameAr` varchar(50),
	`periodType` enum('month','quarter') DEFAULT 'month',
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`status` enum('open','closed','locked') DEFAULT 'open',
	`closedAt` timestamp,
	`closedBy` int,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fiscal_periods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gl_account_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`code` varchar(20) NOT NULL,
	`name` varchar(255) NOT NULL,
	`parentId` int,
	`level` int DEFAULT 1,
	`accountType` enum('asset','liability','equity','revenue','expense') NOT NULL,
	`normalBalance` enum('debit','credit') NOT NULL,
	`isActive` boolean DEFAULT true,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `gl_account_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gl_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`categoryId` int,
	`accountCode` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`descriptionAr` text,
	`accountType` enum('asset','liability','equity','revenue','expense') NOT NULL,
	`normalBalance` enum('debit','credit') NOT NULL,
	`parentAccountId` int,
	`level` int DEFAULT 1,
	`isControlAccount` boolean DEFAULT false,
	`isBankAccount` boolean DEFAULT false,
	`isCashAccount` boolean DEFAULT false,
	`isReceivable` boolean DEFAULT false,
	`isPayable` boolean DEFAULT false,
	`currencyId` int,
	`openingBalance` decimal(15,2) DEFAULT '0.00',
	`currentBalance` decimal(15,2) DEFAULT '0.00',
	`isActive` boolean DEFAULT true,
	`isPostable` boolean DEFAULT true,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `gl_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`organizationId` int NOT NULL,
	`role` enum('org_admin','program_manager','finance_manager','meal_officer','case_worker','viewer') NOT NULL,
	`token` varchar(255) NOT NULL,
	`status` enum('pending','accepted','expired','cancelled') NOT NULL DEFAULT 'pending',
	`expiresAt` timestamp NOT NULL,
	`invitedBy` int NOT NULL,
	`acceptedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `invitations_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `journal_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`entryNumber` varchar(50) NOT NULL,
	`entryDate` date NOT NULL,
	`fiscalYearId` int,
	`fiscalPeriodId` int,
	`entryType` enum('standard','adjusting','closing','reversing','opening') DEFAULT 'standard',
	`sourceModule` enum('manual','expense','advance','settlement','cash_transaction','asset','payroll','procurement','budget') DEFAULT 'manual',
	`sourceDocumentId` int,
	`sourceDocumentType` varchar(50),
	`description` text,
	`descriptionAr` text,
	`totalDebit` decimal(15,2) DEFAULT '0.00',
	`totalCredit` decimal(15,2) DEFAULT '0.00',
	`currencyId` int,
	`exchangeRateId` int,
	`status` enum('draft','posted','reversed','void') DEFAULT 'draft',
	`postedAt` timestamp,
	`postedBy` int,
	`reversedAt` timestamp,
	`reversedBy` int,
	`reversalEntryId` int,
	`projectId` int,
	`grantId` int,
	`attachments` text,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `journal_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `journal_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`journalEntryId` int NOT NULL,
	`lineNumber` int NOT NULL,
	`glAccountId` int NOT NULL,
	`description` text,
	`descriptionAr` text,
	`debitAmount` decimal(15,2) DEFAULT '0.00',
	`creditAmount` decimal(15,2) DEFAULT '0.00',
	`currencyId` int,
	`exchangeRate` decimal(15,6) DEFAULT '1.000000',
	`debitAmountBase` decimal(15,2) DEFAULT '0.00',
	`creditAmountBase` decimal(15,2) DEFAULT '0.00',
	`projectId` int,
	`grantId` int,
	`activityId` int,
	`budgetLineId` int,
	`costCenterId` int,
	`reference` varchar(255),
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `journal_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`paymentId` int NOT NULL,
	`lineNumber` int NOT NULL,
	`sourceType` enum('expense','invoice','advance','settlement','other') NOT NULL,
	`sourceId` int,
	`description` text,
	`descriptionAr` text,
	`amount` decimal(15,2) NOT NULL,
	`currencyId` int,
	`exchangeRate` decimal(15,6) DEFAULT '1.000000',
	`amountInBaseCurrency` decimal(15,2),
	`projectId` int,
	`grantId` int,
	`activityId` int,
	`budgetLineId` int,
	`glAccountId` int,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`paymentNumber` varchar(50) NOT NULL,
	`paymentDate` date NOT NULL,
	`paymentType` enum('vendor','staff','advance','settlement','refund','other') NOT NULL,
	`paymentMethod` enum('cash','bank_transfer','cheque','mobile_money','wire') NOT NULL,
	`payeeType` enum('vendor','employee','other') NOT NULL,
	`payeeId` int,
	`payeeName` varchar(255) NOT NULL,
	`payeeNameAr` varchar(255),
	`bankAccountId` int,
	`chequeNumber` varchar(50),
	`chequeDate` date,
	`amount` decimal(15,2) NOT NULL,
	`currencyId` int,
	`exchangeRateId` int,
	`amountInBaseCurrency` decimal(15,2),
	`description` text,
	`descriptionAr` text,
	`projectId` int,
	`grantId` int,
	`status` enum('draft','pending_approval','approved','paid','cancelled','void') DEFAULT 'draft',
	`approvedBy` int,
	`approvedAt` timestamp,
	`paidBy` int,
	`paidAt` timestamp,
	`glAccountId` int,
	`journalEntryId` int,
	`postingStatus` enum('unposted','posted','reversed') DEFAULT 'unposted',
	`attachments` text,
	`version` int NOT NULL DEFAULT 1,
	`parentId` int,
	`revisionReason` text,
	`isLatestVersion` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_reporting_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`reportType` enum('monthly','quarterly','semi_annual','annual','final','ad_hoc') NOT NULL,
	`reportTitle` varchar(500),
	`reportTitleAr` varchar(500),
	`description` text,
	`descriptionAr` text,
	`frequency` enum('once','monthly','quarterly','semi_annual','annual') NOT NULL,
	`dueDate` timestamp NOT NULL,
	`reminderDays` int DEFAULT 7,
	`status` enum('pending','in_progress','submitted','approved','rejected','overdue') NOT NULL DEFAULT 'pending',
	`submittedDate` timestamp,
	`approvedDate` timestamp,
	`submittedBy` int,
	`approvedBy` int,
	`notes` text,
	`notesAr` text,
	`attachments` json,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	CONSTRAINT `project_reporting_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settlement_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`settlementId` int NOT NULL,
	`lineNumber` int NOT NULL,
	`description` text NOT NULL,
	`descriptionAr` text,
	`amount` decimal(15,2) NOT NULL,
	`currencyId` int,
	`exchangeRate` decimal(15,6) DEFAULT '1.000000',
	`amountInBaseCurrency` decimal(15,2),
	`expenseDate` date,
	`categoryId` int,
	`budgetLineId` int,
	`projectId` int,
	`grantId` int,
	`activityId` int,
	`glAccountId` int,
	`receiptNumber` varchar(100),
	`receiptDate` date,
	`vendorId` int,
	`vendorName` varchar(255),
	`attachments` text,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settlement_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `variance_alert_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`warningThreshold` decimal(5,2) NOT NULL DEFAULT '10.00',
	`criticalThreshold` decimal(5,2) NOT NULL DEFAULT '20.00',
	`isEnabled` boolean NOT NULL DEFAULT true,
	`notifyProjectManager` boolean NOT NULL DEFAULT true,
	`notifyFinanceTeam` boolean NOT NULL DEFAULT true,
	`notifyOwner` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `variance_alert_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `variance_alert_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`budgetItemId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`budgetCode` varchar(100) NOT NULL,
	`budgetItem` text NOT NULL,
	`totalBudget` decimal(15,2) NOT NULL,
	`actualSpent` decimal(15,2) NOT NULL,
	`varianceAmount` decimal(15,2) NOT NULL,
	`variancePercentage` decimal(5,2) NOT NULL,
	`alertLevel` enum('warning','critical') NOT NULL,
	`notificationSent` boolean NOT NULL DEFAULT false,
	`notificationError` text,
	`acknowledgedAt` timestamp,
	`acknowledgedBy` int,
	`acknowledgedNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `variance_alert_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `variance_alert_thresholds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`name` varchar(200) NOT NULL,
	`description` text,
	`scope` enum('organization','project','grant','category') NOT NULL DEFAULT 'organization',
	`projectId` int,
	`grantId` int,
	`category` varchar(100),
	`threshold_percentage` decimal(5,2) NOT NULL DEFAULT '5.00',
	`alert_type` enum('budget_exceeded','threshold_exceeded','forecast_variance') NOT NULL DEFAULT 'threshold_exceeded',
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`notifyOwner` boolean NOT NULL DEFAULT true,
	`notifyProjectManager` boolean NOT NULL DEFAULT true,
	`notifyFinanceTeam` boolean NOT NULL DEFAULT true,
	`emailNotification` boolean NOT NULL DEFAULT true,
	`inAppNotification` boolean NOT NULL DEFAULT true,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `variance_alert_thresholds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `variance_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`projectId` int,
	`grantId` int,
	`budgetId` int,
	`category` varchar(100),
	`alert_type` enum('budget_exceeded','threshold_exceeded','forecast_variance') NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`budget_amount` decimal(15,2) NOT NULL,
	`actual_amount` decimal(15,2) NOT NULL,
	`variance` decimal(15,2) NOT NULL,
	`variance_percentage` decimal(5,2) NOT NULL,
	`threshold_percentage` decimal(5,2) NOT NULL,
	`status` enum('active','acknowledged','resolved','dismissed') NOT NULL DEFAULT 'active',
	`acknowledgedBy` int,
	`acknowledgedAt` timestamp,
	`resolvedBy` int,
	`resolvedAt` timestamp,
	`notificationSent` boolean NOT NULL DEFAULT false,
	`notificationSentAt` timestamp,
	`description` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `variance_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`vendorCode` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`vendorType` enum('supplier','contractor','service_provider','consultant','other') DEFAULT 'supplier',
	`taxId` varchar(50),
	`registrationNumber` varchar(100),
	`contactPerson` varchar(255),
	`email` varchar(255),
	`phone` varchar(50),
	`mobile` varchar(50),
	`fax` varchar(50),
	`website` varchar(255),
	`addressLine1` varchar(255),
	`addressLine2` varchar(255),
	`city` varchar(100),
	`state` varchar(100),
	`country` varchar(100),
	`postalCode` varchar(20),
	`bankName` varchar(255),
	`bankBranch` varchar(255),
	`bankAccountNumber` varchar(100),
	`bankAccountName` varchar(255),
	`iban` varchar(50),
	`swiftCode` varchar(20),
	`currencyId` int,
	`paymentTerms` varchar(100),
	`creditLimit` decimal(15,2),
	`currentBalance` decimal(15,2) DEFAULT '0.00',
	`glAccountId` int,
	`isActive` boolean DEFAULT true,
	`isPreferred` boolean DEFAULT false,
	`isBlacklisted` boolean DEFAULT false,
	`blacklistReason` text,
	`notes` text,
	`attachments` text,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `vendors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `grants` DROP INDEX `grants_grantNumber_unique`;--> statement-breakpoint
ALTER TABLE `projects` DROP INDEX `projects_code_unique`;--> statement-breakpoint
ALTER TABLE `drivers` DROP FOREIGN KEY `drivers_updatedBy_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `purchase_requests` DROP FOREIGN KEY `purchase_requests_organizationId_organizations_id_fk`;
--> statement-breakpoint
ALTER TABLE `purchase_requests` DROP FOREIGN KEY `purchase_requests_operatingUnitId_operating_units_id_fk`;
--> statement-breakpoint
ALTER TABLE `purchase_requests` DROP FOREIGN KEY `purchase_requests_approvedBy_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `purchase_requests` DROP FOREIGN KEY `purchase_requests_deletedBy_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `purchase_requests` DROP FOREIGN KEY `purchase_requests_createdBy_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `purchase_requests` DROP FOREIGN KEY `purchase_requests_updatedBy_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `stock_items` DROP FOREIGN KEY `stock_items_updatedBy_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `suppliers` DROP FOREIGN KEY `suppliers_organizationId_organizations_id_fk`;
--> statement-breakpoint
ALTER TABLE `suppliers` DROP FOREIGN KEY `suppliers_deletedBy_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `suppliers` DROP FOREIGN KEY `suppliers_createdBy_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `suppliers` DROP FOREIGN KEY `suppliers_updatedBy_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `vehicles` DROP FOREIGN KEY `vehicles_updatedBy_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `budget_items` MODIFY COLUMN `activityName` text;--> statement-breakpoint
ALTER TABLE `drivers` MODIFY COLUMN `status` enum('active','inactive','on_leave','terminated') NOT NULL DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `grants` MODIFY COLUMN `grantNumber` varchar(100);--> statement-breakpoint
ALTER TABLE `grants` MODIFY COLUMN `grantName` text;--> statement-breakpoint
ALTER TABLE `grants` MODIFY COLUMN `grantAmount` decimal(15,2);--> statement-breakpoint
ALTER TABLE `grants` MODIFY COLUMN `currency` varchar(10) NOT NULL DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE `grants` MODIFY COLUMN `startDate` timestamp;--> statement-breakpoint
ALTER TABLE `grants` MODIFY COLUMN `endDate` timestamp;--> statement-breakpoint
ALTER TABLE `grants` MODIFY COLUMN `status` enum('planned','ongoing','closed','draft','submitted','under_review','approved','rejected') NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `grants` MODIFY COLUMN `reportingStatus` enum('on_track','due','overdue') DEFAULT 'on_track';--> statement-breakpoint
ALTER TABLE `grants` MODIFY COLUMN `reportingFrequency` enum('monthly','quarterly','semi_annually','annually') DEFAULT 'quarterly';--> statement-breakpoint
ALTER TABLE `grants` MODIFY COLUMN `coFunding` boolean;--> statement-breakpoint
ALTER TABLE `grants` MODIFY COLUMN `createdBy` int NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `code` varchar(100);--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `title` text;--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `titleAr` varchar(500);--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `status` enum('planning','active','on_hold','completed','cancelled') NOT NULL DEFAULT 'planning';--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `startDate` timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `endDate` timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `totalBudget` decimal(15,2);--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `spent` decimal(15,2);--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `currency` enum('USD','EUR','GBP','CHF');--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `physicalProgressPercentage` decimal(5,2);--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `sectors` json;--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `createdBy` int NOT NULL;--> statement-breakpoint
ALTER TABLE `purchase_requests` MODIFY COLUMN `deliveryLocation` varchar(255);--> statement-breakpoint
ALTER TABLE `purchase_requests` MODIFY COLUMN `procurementLadder` enum('one_quotation','three_quotations','public_tender','tender') DEFAULT 'three_quotations';--> statement-breakpoint
ALTER TABLE `purchase_requests` MODIFY COLUMN `status` enum('draft','submitted','validated_by_logistic','rejected_by_logistic','validated_by_finance','rejected_by_finance','approved','rejected_by_pm') DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `stock_items` MODIFY COLUMN `minimumQuantity` decimal(15,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('platform_admin','organization_admin','user','admin','manager') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `vehicles` MODIFY COLUMN `status` enum('active','under_maintenance','retired','disposed') NOT NULL DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `activities` ADD `target` decimal(15,2);--> statement-breakpoint
ALTER TABLE `activities` ADD `unitType` varchar(100);--> statement-breakpoint
ALTER TABLE `activities` ADD `achievedValue` decimal(15,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `budget_items` ADD `actualSpent` decimal(15,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `drivers` ADD `driverId` varchar(50);--> statement-breakpoint
ALTER TABLE `drivers` ADD `fullName` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `drivers` ADD `fullNameAr` varchar(255);--> statement-breakpoint
ALTER TABLE `drivers` ADD `staffId` int;--> statement-breakpoint
ALTER TABLE `drivers` ADD `licenseExpiry` date;--> statement-breakpoint
ALTER TABLE `drivers` ADD `licenseIssuingCountry` varchar(100);--> statement-breakpoint
ALTER TABLE `finance_advances` ADD `version` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `finance_advances` ADD `parentId` int;--> statement-breakpoint
ALTER TABLE `finance_advances` ADD `revisionReason` text;--> statement-breakpoint
ALTER TABLE `finance_advances` ADD `isLatestVersion` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `finance_budget_categories` ADD `level` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `grants` ADD `donorId` int;--> statement-breakpoint
ALTER TABLE `grants` ADD `grantCode` varchar(100);--> statement-breakpoint
ALTER TABLE `grants` ADD `title` varchar(500) NOT NULL;--> statement-breakpoint
ALTER TABLE `grants` ADD `titleAr` varchar(500);--> statement-breakpoint
ALTER TABLE `grants` ADD `amount` decimal(15,2) NOT NULL;--> statement-breakpoint
ALTER TABLE `grants` ADD `totalBudget` decimal(15,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `grants` ADD `submissionDate` timestamp;--> statement-breakpoint
ALTER TABLE `grants` ADD `approvalDate` timestamp;--> statement-breakpoint
ALTER TABLE `grants` ADD `objectives` text;--> statement-breakpoint
ALTER TABLE `grants` ADD `objectivesAr` text;--> statement-breakpoint
ALTER TABLE `grants` ADD `proposalDocumentUrl` text;--> statement-breakpoint
ALTER TABLE `grants` ADD `approvalDocumentUrl` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `grantId` int;--> statement-breakpoint
ALTER TABLE `projects` ADD `projectCode` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `titleEn` varchar(500) NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `objectives` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `objectivesAr` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `beneficiaryCount` int;--> statement-breakpoint
ALTER TABLE `projects` ADD `projectManager` int;--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `projectId` int;--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `donorId` int;--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `donorName` varchar(255);--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `exchangeRateToUSD` decimal(10,4) DEFAULT '1';--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `totalBudgetLineUSD` decimal(15,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `prTotalUSD` decimal(15,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `requesterId` int;--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `prDate` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `neededBy` timestamp;--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `procurementStatus` enum('rfqs','quotations_analysis','tender_invitation','bids_analysis','purchase_order','delivery','grn','payment','completed');--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `logValidatedBy` int;--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `logValidatedOn` timestamp;--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `logValidatorEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `finValidatedBy` int;--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `finValidatedOn` timestamp;--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `finValidatorEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `approvedOn` timestamp;--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `approverEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `rejectReason` text;--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `rejectionStage` enum('logistic','finance','pm');--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `pmRejectedBy` int;--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `pmRejectedOn` timestamp;--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `logRejectedBy` int;--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `logRejectedOn` timestamp;--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `finRejectedBy` int;--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `finRejectedOn` timestamp;--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `quotationAnalysisNumber` varchar(50);--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `bidsAnalysisNumber` varchar(50);--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `purchaseOrderNumber` varchar(50);--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `grnNumber` varchar(50);--> statement-breakpoint
ALTER TABLE `stock_items` ADD `itemCode` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `stock_items` ADD `itemName` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `stock_items` ADD `itemNameAr` varchar(255);--> statement-breakpoint
ALTER TABLE `stock_items` ADD `unitType` varchar(50) DEFAULT 'Piece';--> statement-breakpoint
ALTER TABLE `stock_items` ADD `currentQuantity` decimal(15,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `stock_items` ADD `maximumQuantity` decimal(15,2);--> statement-breakpoint
ALTER TABLE `stock_items` ADD `reorderLevel` decimal(15,2);--> statement-breakpoint
ALTER TABLE `stock_items` ADD `warehouseLocation` varchar(255);--> statement-breakpoint
ALTER TABLE `stock_items` ADD `binLocation` varchar(100);--> statement-breakpoint
ALTER TABLE `stock_items` ADD `expiryDate` timestamp;--> statement-breakpoint
ALTER TABLE `stock_items` ADD `batchNumber` varchar(100);--> statement-breakpoint
ALTER TABLE `stock_items` ADD `serialNumber` varchar(100);--> statement-breakpoint
ALTER TABLE `stock_items` ADD `unitCost` decimal(15,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `stock_items` ADD `currency` varchar(10) DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE `stock_items` ADD `isDamaged` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `stock_items` ADD `isExpired` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `supplierCode` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `legalName` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `legalNameAr` varchar(255);--> statement-breakpoint
ALTER TABLE `suppliers` ADD `tradeName` varchar(255);--> statement-breakpoint
ALTER TABLE `suppliers` ADD `taxId` varchar(100);--> statement-breakpoint
ALTER TABLE `suppliers` ADD `registrationNumber` varchar(100);--> statement-breakpoint
ALTER TABLE `suppliers` ADD `bankIban` varchar(50);--> statement-breakpoint
ALTER TABLE `suppliers` ADD `isBlacklisted` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `blacklistReason` text;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `blacklistDate` timestamp;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `sanctionsScreened` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `sanctionsScreenedDate` timestamp;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `performanceRating` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `totalOrders` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `hasFrameworkAgreement` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `frameworkAgreementExpiry` timestamp;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `documents` text;--> statement-breakpoint
ALTER TABLE `users` ADD `organizationId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `currentOrganizationId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `languagePreference` varchar(10);--> statement-breakpoint
ALTER TABLE `vehicles` ADD `vehicleId` varchar(50);--> statement-breakpoint
ALTER TABLE `vehicles` ADD `vehicleType` varchar(100);--> statement-breakpoint
ALTER TABLE `vehicles` ADD `brand` varchar(100);--> statement-breakpoint
ALTER TABLE `vehicles` ADD `chassisNumber` varchar(100);--> statement-breakpoint
ALTER TABLE `vehicles` ADD `engineNumber` varchar(100);--> statement-breakpoint
ALTER TABLE `vehicles` ADD `ownership` enum('owned','leased','rented') DEFAULT 'owned';--> statement-breakpoint
ALTER TABLE `vehicles` ADD `purchaseDate` timestamp;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `purchaseValue` decimal(15,2);--> statement-breakpoint
ALTER TABLE `vehicles` ADD `currency` varchar(10);--> statement-breakpoint
ALTER TABLE `vehicles` ADD `assignedProjectId` int;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `assignedProject` varchar(255);--> statement-breakpoint
ALTER TABLE `vehicles` ADD `assignedDriverId` int;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `assignedDriverName` varchar(255);--> statement-breakpoint
ALTER TABLE `vehicles` ADD `currentOdometer` decimal(15,2);--> statement-breakpoint
ALTER TABLE `vehicles` ADD `insuranceExpiry` timestamp;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `licenseExpiry` timestamp;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `inspectionExpiry` timestamp;--> statement-breakpoint
ALTER TABLE `bank_reconciliations` ADD CONSTRAINT `bank_reconciliations_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bank_transactions` ADD CONSTRAINT `bank_transactions_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_lines` ADD CONSTRAINT `budget_lines_budgetId_budgets_id_fk` FOREIGN KEY (`budgetId`) REFERENCES `budgets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_lines` ADD CONSTRAINT `budget_lines_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_lines` ADD CONSTRAINT `budget_lines_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_lines` ADD CONSTRAINT `budget_lines_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_lines` ADD CONSTRAINT `budget_lines_categoryId_finance_budget_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `finance_budget_categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_lines` ADD CONSTRAINT `budget_lines_accountId_chart_of_accounts_id_fk` FOREIGN KEY (`accountId`) REFERENCES `chart_of_accounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_lines` ADD CONSTRAINT `budget_lines_activityId_activities_id_fk` FOREIGN KEY (`activityId`) REFERENCES `activities`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_lines` ADD CONSTRAINT `budget_lines_donorMappingId_donor_budget_mapping_id_fk` FOREIGN KEY (`donorMappingId`) REFERENCES `donor_budget_mapping`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_lines` ADD CONSTRAINT `budget_lines_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_lines` ADD CONSTRAINT `budget_lines_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_lines` ADD CONSTRAINT `budget_lines_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_monthly_allocations` ADD CONSTRAINT `budget_monthly_allocations_budgetLineId_budget_lines_id_fk` FOREIGN KEY (`budgetLineId`) REFERENCES `budget_lines`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_monthly_allocations` ADD CONSTRAINT `budget_monthly_allocations_budgetId_budgets_id_fk` FOREIGN KEY (`budgetId`) REFERENCES `budgets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_monthly_allocations` ADD CONSTRAINT `budget_monthly_allocations_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_monthly_allocations` ADD CONSTRAINT `budget_monthly_allocations_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_grantId_grants_id_fk` FOREIGN KEY (`grantId`) REFERENCES `grants`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_parentBudgetId_budgets_id_fk` FOREIGN KEY (`parentBudgetId`) REFERENCES `budgets`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_submittedBy_users_id_fk` FOREIGN KEY (`submittedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_rejectedBy_users_id_fk` FOREIGN KEY (`rejectedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donor_budget_mapping` ADD CONSTRAINT `donor_budget_mapping_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donor_budget_mapping` ADD CONSTRAINT `donor_budget_mapping_internalCategoryId_finance_budget_categories_id_fk` FOREIGN KEY (`internalCategoryId`) REFERENCES `finance_budget_categories`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donor_budget_mapping` ADD CONSTRAINT `donor_budget_mapping_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donor_budget_mapping` ADD CONSTRAINT `donor_budget_mapping_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_reporting_schedules` ADD CONSTRAINT `project_reporting_schedules_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_reporting_schedules` ADD CONSTRAINT `project_reporting_schedules_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_reporting_schedules` ADD CONSTRAINT `project_reporting_schedules_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_reporting_schedules` ADD CONSTRAINT `project_reporting_schedules_submittedBy_users_id_fk` FOREIGN KEY (`submittedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_reporting_schedules` ADD CONSTRAINT `project_reporting_schedules_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_reporting_schedules` ADD CONSTRAINT `project_reporting_schedules_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variance_alert_config` ADD CONSTRAINT `variance_alert_config_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variance_alert_config` ADD CONSTRAINT `variance_alert_config_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variance_alert_config` ADD CONSTRAINT `variance_alert_config_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variance_alert_config` ADD CONSTRAINT `variance_alert_config_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variance_alert_config` ADD CONSTRAINT `variance_alert_config_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variance_alert_history` ADD CONSTRAINT `variance_alert_history_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variance_alert_history` ADD CONSTRAINT `variance_alert_history_budgetItemId_budget_items_id_fk` FOREIGN KEY (`budgetItemId`) REFERENCES `budget_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variance_alert_history` ADD CONSTRAINT `variance_alert_history_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variance_alert_history` ADD CONSTRAINT `variance_alert_history_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variance_alert_history` ADD CONSTRAINT `variance_alert_history_acknowledgedBy_users_id_fk` FOREIGN KEY (`acknowledgedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variance_alert_thresholds` ADD CONSTRAINT `variance_alert_thresholds_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variance_alert_thresholds` ADD CONSTRAINT `variance_alert_thresholds_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variance_alert_thresholds` ADD CONSTRAINT `variance_alert_thresholds_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variance_alert_thresholds` ADD CONSTRAINT `variance_alert_thresholds_grantId_grants_id_fk` FOREIGN KEY (`grantId`) REFERENCES `grants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variance_alert_thresholds` ADD CONSTRAINT `variance_alert_thresholds_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variance_alerts` ADD CONSTRAINT `variance_alerts_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variance_alerts` ADD CONSTRAINT `variance_alerts_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variance_alerts` ADD CONSTRAINT `variance_alerts_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variance_alerts` ADD CONSTRAINT `variance_alerts_grantId_grants_id_fk` FOREIGN KEY (`grantId`) REFERENCES `grants`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variance_alerts` ADD CONSTRAINT `variance_alerts_budgetId_budgets_id_fk` FOREIGN KEY (`budgetId`) REFERENCES `budgets`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variance_alerts` ADD CONSTRAINT `variance_alerts_acknowledgedBy_users_id_fk` FOREIGN KEY (`acknowledgedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variance_alerts` ADD CONSTRAINT `variance_alerts_resolvedBy_users_id_fk` FOREIGN KEY (`resolvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_grantId_grants_id_fk` FOREIGN KEY (`grantId`) REFERENCES `grants`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_projectManager_users_id_fk` FOREIGN KEY (`projectManager`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_evaluation_criteria` DROP COLUMN `nameAr`;--> statement-breakpoint
ALTER TABLE `drivers` DROP COLUMN `code`;--> statement-breakpoint
ALTER TABLE `drivers` DROP COLUMN `name`;--> statement-breakpoint
ALTER TABLE `drivers` DROP COLUMN `nameAr`;--> statement-breakpoint
ALTER TABLE `drivers` DROP COLUMN `licenseExpiryDate`;--> statement-breakpoint
ALTER TABLE `drivers` DROP COLUMN `dateOfBirth`;--> statement-breakpoint
ALTER TABLE `drivers` DROP COLUMN `nationalId`;--> statement-breakpoint
ALTER TABLE `drivers` DROP COLUMN `address`;--> statement-breakpoint
ALTER TABLE `drivers` DROP COLUMN `emergencyContact`;--> statement-breakpoint
ALTER TABLE `drivers` DROP COLUMN `emergencyPhone`;--> statement-breakpoint
ALTER TABLE `drivers` DROP COLUMN `hireDate`;--> statement-breakpoint
ALTER TABLE `drivers` DROP COLUMN `notes`;--> statement-breakpoint
ALTER TABLE `drivers` DROP COLUMN `updatedBy`;--> statement-breakpoint
ALTER TABLE `finance_approval_thresholds` DROP COLUMN `nameAr`;--> statement-breakpoint
ALTER TABLE `finance_asset_categories` DROP COLUMN `nameAr`;--> statement-breakpoint
ALTER TABLE `finance_assets` DROP COLUMN `nameAr`;--> statement-breakpoint
ALTER TABLE `finance_budget_categories` DROP COLUMN `nameAr`;--> statement-breakpoint
ALTER TABLE `finance_currencies` DROP COLUMN `nameAr`;--> statement-breakpoint
ALTER TABLE `finance_fiscal_years` DROP COLUMN `nameAr`;--> statement-breakpoint
ALTER TABLE `finance_permissions` DROP COLUMN `nameAr`;--> statement-breakpoint
ALTER TABLE `finance_roles` DROP COLUMN `nameAr`;--> statement-breakpoint
ALTER TABLE `purchase_requests` DROP COLUMN `projectTitleAr`;--> statement-breakpoint
ALTER TABLE `purchase_requests` DROP COLUMN `donor`;--> statement-breakpoint
ALTER TABLE `purchase_requests` DROP COLUMN `exchangeRate`;--> statement-breakpoint
ALTER TABLE `purchase_requests` DROP COLUMN `requestDate`;--> statement-breakpoint
ALTER TABLE `purchase_requests` DROP COLUMN `neededByDate`;--> statement-breakpoint
ALTER TABLE `purchase_requests` DROP COLUMN `deliveryLocationAr`;--> statement-breakpoint
ALTER TABLE `purchase_requests` DROP COLUMN `justificationAr`;--> statement-breakpoint
ALTER TABLE `purchase_requests` DROP COLUMN `totalAmount`;--> statement-breakpoint
ALTER TABLE `purchase_requests` DROP COLUMN `approvedAt`;--> statement-breakpoint
ALTER TABLE `purchase_requests` DROP COLUMN `rejectionReason`;--> statement-breakpoint
ALTER TABLE `purchase_requests` DROP COLUMN `updatedBy`;--> statement-breakpoint
ALTER TABLE `stock_items` DROP COLUMN `code`;--> statement-breakpoint
ALTER TABLE `stock_items` DROP COLUMN `name`;--> statement-breakpoint
ALTER TABLE `stock_items` DROP COLUMN `nameAr`;--> statement-breakpoint
ALTER TABLE `stock_items` DROP COLUMN `unit`;--> statement-breakpoint
ALTER TABLE `stock_items` DROP COLUMN `warehouse`;--> statement-breakpoint
ALTER TABLE `stock_items` DROP COLUMN `warehouseAr`;--> statement-breakpoint
ALTER TABLE `stock_items` DROP COLUMN `quantity`;--> statement-breakpoint
ALTER TABLE `stock_items` DROP COLUMN `unitPrice`;--> statement-breakpoint
ALTER TABLE `stock_items` DROP COLUMN `status`;--> statement-breakpoint
ALTER TABLE `stock_items` DROP COLUMN `lastRestockDate`;--> statement-breakpoint
ALTER TABLE `stock_items` DROP COLUMN `updatedBy`;--> statement-breakpoint
ALTER TABLE `suppliers` DROP COLUMN `code`;--> statement-breakpoint
ALTER TABLE `suppliers` DROP COLUMN `name`;--> statement-breakpoint
ALTER TABLE `suppliers` DROP COLUMN `nameAr`;--> statement-breakpoint
ALTER TABLE `suppliers` DROP COLUMN `addressAr`;--> statement-breakpoint
ALTER TABLE `suppliers` DROP COLUMN `taxRegistration`;--> statement-breakpoint
ALTER TABLE `suppliers` DROP COLUMN `businessLicense`;--> statement-breakpoint
ALTER TABLE `suppliers` DROP COLUMN `category`;--> statement-breakpoint
ALTER TABLE `suppliers` DROP COLUMN `rating`;--> statement-breakpoint
ALTER TABLE `suppliers` DROP COLUMN `notes`;--> statement-breakpoint
ALTER TABLE `suppliers` DROP COLUMN `updatedBy`;--> statement-breakpoint
ALTER TABLE `vehicles` DROP COLUMN `code`;--> statement-breakpoint
ALTER TABLE `vehicles` DROP COLUMN `make`;--> statement-breakpoint
ALTER TABLE `vehicles` DROP COLUMN `type`;--> statement-breakpoint
ALTER TABLE `vehicles` DROP COLUMN `tankCapacity`;--> statement-breakpoint
ALTER TABLE `vehicles` DROP COLUMN `currentMileage`;--> statement-breakpoint
ALTER TABLE `vehicles` DROP COLUMN `currentDriverId`;--> statement-breakpoint
ALTER TABLE `vehicles` DROP COLUMN `insuranceExpiryDate`;--> statement-breakpoint
ALTER TABLE `vehicles` DROP COLUMN `registrationExpiryDate`;--> statement-breakpoint
ALTER TABLE `vehicles` DROP COLUMN `lastServiceDate`;--> statement-breakpoint
ALTER TABLE `vehicles` DROP COLUMN `nextServiceDue`;--> statement-breakpoint
ALTER TABLE `vehicles` DROP COLUMN `updatedBy`;