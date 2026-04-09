CREATE TABLE `finance_advances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`advanceNumber` varchar(50) NOT NULL,
	`employeeId` int,
	`employeeName` varchar(255) NOT NULL,
	`employeeNameAr` varchar(255),
	`department` varchar(100),
	`advanceType` enum('TRAVEL','PROJECT','OPERATIONAL','SALARY','OTHER') NOT NULL,
	`purpose` text NOT NULL,
	`purposeAr` text,
	`requestedAmount` decimal(15,2) NOT NULL,
	`approvedAmount` decimal(15,2),
	`currency` varchar(10) NOT NULL DEFAULT 'USD',
	`requestDate` timestamp NOT NULL,
	`expectedSettlementDate` timestamp,
	`actualSettlementDate` timestamp,
	`status` enum('DRAFT','PENDING','APPROVED','REJECTED','PARTIALLY_SETTLED','FULLY_SETTLED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
	`approvedBy` int,
	`approvedAt` timestamp,
	`rejectionReason` text,
	`settledAmount` decimal(15,2) DEFAULT '0',
	`outstandingBalance` decimal(15,2),
	`projectId` int,
	`accountCode` varchar(50),
	`notes` text,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `finance_advances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_bank_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`accountNumber` varchar(50) NOT NULL,
	`accountName` varchar(255) NOT NULL,
	`accountNameAr` varchar(255),
	`bankName` varchar(255) NOT NULL,
	`bankNameAr` varchar(255),
	`bankCode` varchar(50),
	`branchName` varchar(255),
	`branchCode` varchar(50),
	`accountType` enum('CHECKING','SAVINGS','MONEY_MARKET','PETTY_CASH','SAFE') NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'USD',
	`openingBalance` decimal(15,2) NOT NULL DEFAULT '0',
	`currentBalance` decimal(15,2) NOT NULL DEFAULT '0',
	`lastReconciliationDate` timestamp,
	`lastReconciliationBalance` decimal(15,2),
	`isActive` boolean NOT NULL DEFAULT true,
	`isPrimary` boolean NOT NULL DEFAULT false,
	`glAccountCode` varchar(50),
	`contactPerson` varchar(255),
	`contactPhone` varchar(50),
	`notes` text,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `finance_bank_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_cash_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`transactionNumber` varchar(50) NOT NULL,
	`bankAccountId` int NOT NULL,
	`transactionType` enum('DEPOSIT','WITHDRAWAL','TRANSFER_IN','TRANSFER_OUT','BANK_CHARGE','INTEREST','ADJUSTMENT') NOT NULL,
	`transactionDate` timestamp NOT NULL,
	`valueDate` timestamp,
	`amount` decimal(15,2) NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'USD',
	`exchangeRate` decimal(10,6) DEFAULT '1',
	`amountInBaseCurrency` decimal(15,2),
	`balanceAfter` decimal(15,2),
	`transferToAccountId` int,
	`transferFromAccountId` int,
	`referenceNumber` varchar(100),
	`payee` varchar(255),
	`payer` varchar(255),
	`description` text,
	`descriptionAr` text,
	`category` varchar(100),
	`accountCode` varchar(50),
	`projectId` int,
	`isReconciled` boolean NOT NULL DEFAULT false,
	`reconciledAt` timestamp,
	`reconciledBy` int,
	`status` enum('DRAFT','PENDING','APPROVED','REJECTED','POSTED') NOT NULL DEFAULT 'POSTED',
	`approvedBy` int,
	`approvedAt` timestamp,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `finance_cash_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_fund_balances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`fundCode` varchar(50) NOT NULL,
	`fundName` varchar(255) NOT NULL,
	`fundNameAr` varchar(255),
	`fundType` enum('RESTRICTED','UNRESTRICTED','TEMPORARILY_RESTRICTED','DONOR_DESIGNATED') NOT NULL,
	`donorId` int,
	`donorName` varchar(255),
	`grantNumber` varchar(100),
	`currency` varchar(10) NOT NULL DEFAULT 'USD',
	`totalBudget` decimal(15,2) NOT NULL DEFAULT '0',
	`totalReceived` decimal(15,2) NOT NULL DEFAULT '0',
	`totalExpended` decimal(15,2) NOT NULL DEFAULT '0',
	`currentBalance` decimal(15,2) NOT NULL DEFAULT '0',
	`startDate` timestamp,
	`endDate` timestamp,
	`bankAccountId` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`notes` text,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `finance_fund_balances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_settlements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`settlementNumber` varchar(50) NOT NULL,
	`advanceId` int NOT NULL,
	`settlementDate` timestamp NOT NULL,
	`settledAmount` decimal(15,2) NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'USD',
	`receiptNumber` varchar(100),
	`description` text,
	`descriptionAr` text,
	`expenseCategory` varchar(100),
	`accountCode` varchar(50),
	`status` enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
	`approvedBy` int,
	`approvedAt` timestamp,
	`refundAmount` decimal(15,2) DEFAULT '0',
	`refundDate` timestamp,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `finance_settlements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `finance_advances` ADD CONSTRAINT `finance_advances_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_advances` ADD CONSTRAINT `finance_advances_employeeId_hr_employees_id_fk` FOREIGN KEY (`employeeId`) REFERENCES `hr_employees`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_advances` ADD CONSTRAINT `finance_advances_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_advances` ADD CONSTRAINT `finance_advances_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_advances` ADD CONSTRAINT `finance_advances_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_advances` ADD CONSTRAINT `finance_advances_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_advances` ADD CONSTRAINT `finance_advances_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_bank_accounts` ADD CONSTRAINT `finance_bank_accounts_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_bank_accounts` ADD CONSTRAINT `finance_bank_accounts_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_bank_accounts` ADD CONSTRAINT `finance_bank_accounts_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_bank_accounts` ADD CONSTRAINT `finance_bank_accounts_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_cash_transactions` ADD CONSTRAINT `finance_cash_transactions_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_cash_transactions` ADD CONSTRAINT `finance_cash_transactions_bankAccountId_finance_bank_accounts_id_fk` FOREIGN KEY (`bankAccountId`) REFERENCES `finance_bank_accounts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_cash_transactions` ADD CONSTRAINT `finance_cash_transactions_transferToAccountId_finance_bank_accounts_id_fk` FOREIGN KEY (`transferToAccountId`) REFERENCES `finance_bank_accounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_cash_transactions` ADD CONSTRAINT `finance_cash_transactions_transferFromAccountId_finance_bank_accounts_id_fk` FOREIGN KEY (`transferFromAccountId`) REFERENCES `finance_bank_accounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_cash_transactions` ADD CONSTRAINT `finance_cash_transactions_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_cash_transactions` ADD CONSTRAINT `finance_cash_transactions_reconciledBy_users_id_fk` FOREIGN KEY (`reconciledBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_cash_transactions` ADD CONSTRAINT `finance_cash_transactions_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_cash_transactions` ADD CONSTRAINT `finance_cash_transactions_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_cash_transactions` ADD CONSTRAINT `finance_cash_transactions_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_cash_transactions` ADD CONSTRAINT `finance_cash_transactions_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_fund_balances` ADD CONSTRAINT `finance_fund_balances_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_fund_balances` ADD CONSTRAINT `finance_fund_balances_bankAccountId_finance_bank_accounts_id_fk` FOREIGN KEY (`bankAccountId`) REFERENCES `finance_bank_accounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_fund_balances` ADD CONSTRAINT `finance_fund_balances_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_fund_balances` ADD CONSTRAINT `finance_fund_balances_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_fund_balances` ADD CONSTRAINT `finance_fund_balances_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_settlements` ADD CONSTRAINT `finance_settlements_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_settlements` ADD CONSTRAINT `finance_settlements_advanceId_finance_advances_id_fk` FOREIGN KEY (`advanceId`) REFERENCES `finance_advances`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_settlements` ADD CONSTRAINT `finance_settlements_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_settlements` ADD CONSTRAINT `finance_settlements_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_settlements` ADD CONSTRAINT `finance_settlements_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_settlements` ADD CONSTRAINT `finance_settlements_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;