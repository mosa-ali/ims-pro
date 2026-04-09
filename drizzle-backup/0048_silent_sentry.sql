CREATE TABLE `finance_approval_thresholds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`nameAr` varchar(255),
	`category` enum('expense','advance','procurement','budget_transfer','asset_disposal','payment','journal_entry') DEFAULT 'expense',
	`minAmount` decimal(15,2) DEFAULT '0.00',
	`maxAmount` decimal(15,2),
	`currency` varchar(10) DEFAULT 'USD',
	`approverRole` varchar(100),
	`approverUserId` int,
	`requiresMultipleApprovers` boolean NOT NULL DEFAULT false,
	`approverCount` int DEFAULT 1,
	`sequentialApproval` boolean NOT NULL DEFAULT false,
	`autoApproveBelow` decimal(15,2),
	`isActive` boolean NOT NULL DEFAULT true,
	`notes` text,
	`organizationId` int NOT NULL,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `finance_approval_thresholds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_asset_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`nameAr` varchar(255),
	`description` text,
	`parentId` int,
	`depreciationRate` decimal(5,2) DEFAULT '0.00',
	`defaultUsefulLife` int DEFAULT 5,
	`organizationId` int NOT NULL,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `finance_asset_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_asset_disposals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`disposalCode` varchar(50) NOT NULL,
	`assetId` int NOT NULL,
	`disposalType` enum('sale','donation','scrap','theft','loss','transfer_out','write_off') DEFAULT 'sale',
	`proposedDate` date,
	`actualDate` date,
	`bookValue` decimal(15,2) DEFAULT '0.00',
	`proposedValue` decimal(15,2) DEFAULT '0.00',
	`actualValue` decimal(15,2) DEFAULT '0.00',
	`currency` varchar(10) DEFAULT 'USD',
	`reason` text,
	`status` enum('draft','pending_approval','approved','rejected','completed','cancelled') DEFAULT 'draft',
	`buyerInfo` text,
	`recipientInfo` text,
	`approvedBy` int,
	`approvalDate` timestamp,
	`rejectionReason` text,
	`notes` text,
	`attachments` json,
	`organizationId` int NOT NULL,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `finance_asset_disposals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_asset_maintenance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assetId` int NOT NULL,
	`maintenanceType` enum('preventive','corrective','inspection','upgrade','repair') DEFAULT 'preventive',
	`description` text,
	`cost` decimal(15,2) DEFAULT '0.00',
	`currency` varchar(10) DEFAULT 'USD',
	`performedBy` varchar(255),
	`vendorName` varchar(255),
	`performedDate` date,
	`nextDueDate` date,
	`notes` text,
	`attachments` json,
	`organizationId` int NOT NULL,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `finance_asset_maintenance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_asset_transfers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transferCode` varchar(50) NOT NULL,
	`assetId` int NOT NULL,
	`fromLocation` varchar(255),
	`toLocation` varchar(255),
	`fromAssignee` varchar(255),
	`toAssignee` varchar(255),
	`fromAssigneeUserId` int,
	`toAssigneeUserId` int,
	`transferDate` date,
	`reason` text,
	`status` enum('pending','approved','rejected','completed','cancelled') DEFAULT 'pending',
	`approvedBy` int,
	`approvalDate` timestamp,
	`rejectionReason` text,
	`notes` text,
	`organizationId` int NOT NULL,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `finance_asset_transfers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assetCode` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`nameAr` varchar(255),
	`description` text,
	`categoryId` int,
	`subcategory` varchar(100),
	`acquisitionDate` date,
	`acquisitionCost` decimal(15,2) DEFAULT '0.00',
	`currency` varchar(10) DEFAULT 'USD',
	`depreciationMethod` enum('straight_line','declining_balance','units_of_production','none') DEFAULT 'straight_line',
	`usefulLifeYears` int DEFAULT 5,
	`salvageValue` decimal(15,2) DEFAULT '0.00',
	`accumulatedDepreciation` decimal(15,2) DEFAULT '0.00',
	`currentValue` decimal(15,2) DEFAULT '0.00',
	`status` enum('active','in_maintenance','disposed','lost','transferred','pending_disposal') DEFAULT 'active',
	`condition` enum('excellent','good','fair','poor','non_functional') DEFAULT 'good',
	`location` varchar(255),
	`assignedTo` varchar(255),
	`assignedToUserId` int,
	`donorId` int,
	`donorName` varchar(255),
	`grantId` int,
	`grantCode` varchar(100),
	`projectId` int,
	`serialNumber` varchar(100),
	`manufacturer` varchar(255),
	`model` varchar(255),
	`warrantyExpiry` date,
	`lastMaintenanceDate` date,
	`nextMaintenanceDate` date,
	`disposalDate` date,
	`disposalMethod` enum('sale','donation','scrap','theft','loss','transfer'),
	`disposalValue` decimal(15,2),
	`disposalReason` text,
	`disposalApprovedBy` int,
	`insurancePolicy` varchar(100),
	`insuranceExpiry` date,
	`organizationId` int NOT NULL,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `finance_assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_budget_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`nameAr` varchar(255),
	`description` text,
	`parentId` int,
	`accountId` int,
	`accountCode` varchar(50),
	`categoryType` enum('expense','income','both') DEFAULT 'expense',
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int DEFAULT 0,
	`organizationId` int NOT NULL,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `finance_budget_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_currencies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(10) NOT NULL,
	`name` varchar(100) NOT NULL,
	`nameAr` varchar(100),
	`symbol` varchar(10),
	`exchangeRateToUSD` decimal(15,6) DEFAULT '1.000000',
	`isBaseCurrency` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`decimalPlaces` int DEFAULT 2,
	`organizationId` int NOT NULL,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `finance_currencies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_exchange_rates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fromCurrencyId` int,
	`fromCurrencyCode` varchar(10) NOT NULL,
	`toCurrencyId` int,
	`toCurrencyCode` varchar(10) NOT NULL,
	`rate` decimal(15,6) NOT NULL,
	`effectiveDate` date NOT NULL,
	`expiryDate` date,
	`source` varchar(100),
	`notes` text,
	`organizationId` int NOT NULL,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `finance_exchange_rates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_fiscal_years` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`nameAr` varchar(100),
	`code` varchar(20),
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`status` enum('planning','open','closed','locked') DEFAULT 'planning',
	`isCurrent` boolean NOT NULL DEFAULT false,
	`closedAt` timestamp,
	`closedBy` int,
	`notes` text,
	`organizationId` int NOT NULL,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `finance_fiscal_years_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`nameAr` varchar(255),
	`module` enum('chart_of_accounts','budgets','expenditures','advances','treasury','assets','reports','settings') DEFAULT 'budgets',
	`action` enum('view','create','edit','delete','approve','export','import','admin') DEFAULT 'view',
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`organizationId` int NOT NULL,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `finance_permissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_role_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roleId` int NOT NULL,
	`permissionId` int NOT NULL,
	`organizationId` int NOT NULL,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `finance_role_permissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`nameAr` varchar(255),
	`description` text,
	`level` int DEFAULT 1,
	`isSystemRole` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`organizationId` int NOT NULL,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `finance_roles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_user_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`roleId` int NOT NULL,
	`effectiveFrom` date,
	`effectiveTo` date,
	`isActive` boolean NOT NULL DEFAULT true,
	`organizationId` int NOT NULL,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `finance_user_roles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `finance_approval_thresholds` ADD CONSTRAINT `finance_approval_thresholds_approverUserId_users_id_fk` FOREIGN KEY (`approverUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_approval_thresholds` ADD CONSTRAINT `finance_approval_thresholds_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_approval_thresholds` ADD CONSTRAINT `finance_approval_thresholds_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_asset_categories` ADD CONSTRAINT `finance_asset_categories_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_asset_categories` ADD CONSTRAINT `finance_asset_categories_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_asset_disposals` ADD CONSTRAINT `finance_asset_disposals_assetId_finance_assets_id_fk` FOREIGN KEY (`assetId`) REFERENCES `finance_assets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_asset_disposals` ADD CONSTRAINT `finance_asset_disposals_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_asset_disposals` ADD CONSTRAINT `finance_asset_disposals_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_asset_disposals` ADD CONSTRAINT `finance_asset_disposals_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_asset_disposals` ADD CONSTRAINT `finance_asset_disposals_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_asset_maintenance` ADD CONSTRAINT `finance_asset_maintenance_assetId_finance_assets_id_fk` FOREIGN KEY (`assetId`) REFERENCES `finance_assets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_asset_maintenance` ADD CONSTRAINT `finance_asset_maintenance_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_asset_maintenance` ADD CONSTRAINT `finance_asset_maintenance_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_asset_maintenance` ADD CONSTRAINT `finance_asset_maintenance_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_asset_transfers` ADD CONSTRAINT `finance_asset_transfers_assetId_finance_assets_id_fk` FOREIGN KEY (`assetId`) REFERENCES `finance_assets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_asset_transfers` ADD CONSTRAINT `finance_asset_transfers_fromAssigneeUserId_users_id_fk` FOREIGN KEY (`fromAssigneeUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_asset_transfers` ADD CONSTRAINT `finance_asset_transfers_toAssigneeUserId_users_id_fk` FOREIGN KEY (`toAssigneeUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_asset_transfers` ADD CONSTRAINT `finance_asset_transfers_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_asset_transfers` ADD CONSTRAINT `finance_asset_transfers_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_asset_transfers` ADD CONSTRAINT `finance_asset_transfers_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_asset_transfers` ADD CONSTRAINT `finance_asset_transfers_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_assets` ADD CONSTRAINT `finance_assets_categoryId_finance_asset_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `finance_asset_categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_assets` ADD CONSTRAINT `finance_assets_assignedToUserId_users_id_fk` FOREIGN KEY (`assignedToUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_assets` ADD CONSTRAINT `finance_assets_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_assets` ADD CONSTRAINT `finance_assets_disposalApprovedBy_users_id_fk` FOREIGN KEY (`disposalApprovedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_assets` ADD CONSTRAINT `finance_assets_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_assets` ADD CONSTRAINT `finance_assets_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_assets` ADD CONSTRAINT `finance_assets_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_budget_categories` ADD CONSTRAINT `finance_budget_categories_accountId_chart_of_accounts_id_fk` FOREIGN KEY (`accountId`) REFERENCES `chart_of_accounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_budget_categories` ADD CONSTRAINT `finance_budget_categories_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_budget_categories` ADD CONSTRAINT `finance_budget_categories_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_currencies` ADD CONSTRAINT `finance_currencies_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_currencies` ADD CONSTRAINT `finance_currencies_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_exchange_rates` ADD CONSTRAINT `finance_exchange_rates_fromCurrencyId_finance_currencies_id_fk` FOREIGN KEY (`fromCurrencyId`) REFERENCES `finance_currencies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_exchange_rates` ADD CONSTRAINT `finance_exchange_rates_toCurrencyId_finance_currencies_id_fk` FOREIGN KEY (`toCurrencyId`) REFERENCES `finance_currencies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_exchange_rates` ADD CONSTRAINT `finance_exchange_rates_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_exchange_rates` ADD CONSTRAINT `finance_exchange_rates_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_exchange_rates` ADD CONSTRAINT `finance_exchange_rates_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_fiscal_years` ADD CONSTRAINT `finance_fiscal_years_closedBy_users_id_fk` FOREIGN KEY (`closedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_fiscal_years` ADD CONSTRAINT `finance_fiscal_years_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_fiscal_years` ADD CONSTRAINT `finance_fiscal_years_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_fiscal_years` ADD CONSTRAINT `finance_fiscal_years_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_permissions` ADD CONSTRAINT `finance_permissions_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_permissions` ADD CONSTRAINT `finance_permissions_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_role_permissions` ADD CONSTRAINT `finance_role_permissions_roleId_finance_roles_id_fk` FOREIGN KEY (`roleId`) REFERENCES `finance_roles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_role_permissions` ADD CONSTRAINT `finance_role_permissions_permissionId_finance_permissions_id_fk` FOREIGN KEY (`permissionId`) REFERENCES `finance_permissions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_role_permissions` ADD CONSTRAINT `finance_role_permissions_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_role_permissions` ADD CONSTRAINT `finance_role_permissions_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_role_permissions` ADD CONSTRAINT `finance_role_permissions_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_roles` ADD CONSTRAINT `finance_roles_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_roles` ADD CONSTRAINT `finance_roles_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_user_roles` ADD CONSTRAINT `finance_user_roles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_user_roles` ADD CONSTRAINT `finance_user_roles_roleId_finance_roles_id_fk` FOREIGN KEY (`roleId`) REFERENCES `finance_roles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_user_roles` ADD CONSTRAINT `finance_user_roles_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_user_roles` ADD CONSTRAINT `finance_user_roles_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_user_roles` ADD CONSTRAINT `finance_user_roles_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;