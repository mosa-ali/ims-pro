CREATE TABLE `activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`activityName` text NOT NULL,
	`activityNameAr` text,
	`description` text,
	`descriptionAr` text,
	`plannedStartDate` date NOT NULL,
	`plannedEndDate` date NOT NULL,
	`actualStartDate` date,
	`actualEndDate` date,
	`status` enum('NOT_STARTED','IN_PROGRESS','COMPLETED','ON_HOLD','CANCELLED') NOT NULL DEFAULT 'NOT_STARTED',
	`progressPercentage` decimal(5,2) NOT NULL DEFAULT '0.00',
	`budgetAllocated` decimal(15,2) NOT NULL DEFAULT '0.00',
	`actualSpent` decimal(15,2) NOT NULL DEFAULT '0.00',
	`currency` enum('USD','EUR','GBP','CHF') NOT NULL DEFAULT 'USD',
	`location` varchar(255),
	`locationAr` varchar(255),
	`responsiblePerson` varchar(255),
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `beneficiaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`fullName` varchar(255) NOT NULL,
	`fullNameAr` varchar(255),
	`nationalId` varchar(100),
	`dateOfBirth` date,
	`gender` enum('MALE','FEMALE','OTHER') NOT NULL,
	`ageGroup` enum('0-5','6-12','13-17','18-35','36-60','60+'),
	`nationality` varchar(100),
	`phoneNumber` varchar(50),
	`email` varchar(320),
	`governorate` varchar(255),
	`district` varchar(255),
	`village` varchar(255),
	`address` text,
	`addressAr` text,
	`householdSize` int,
	`dependents` int,
	`vulnerabilityCategory` varchar(255),
	`disabilityStatus` boolean NOT NULL DEFAULT false,
	`disabilityType` varchar(255),
	`registrationDate` date NOT NULL,
	`serviceType` varchar(255),
	`serviceStatus` enum('REGISTERED','ACTIVE','COMPLETED','SUSPENDED') NOT NULL DEFAULT 'REGISTERED',
	`notes` text,
	`notesAr` text,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `beneficiaries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `indicators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`indicatorName` text NOT NULL,
	`indicatorNameAr` text,
	`description` text,
	`descriptionAr` text,
	`type` enum('OUTPUT','OUTCOME','IMPACT') NOT NULL DEFAULT 'OUTPUT',
	`category` varchar(255),
	`unit` varchar(100) NOT NULL,
	`baseline` decimal(15,2) NOT NULL DEFAULT '0.00',
	`target` decimal(15,2) NOT NULL,
	`achievedValue` decimal(15,2) NOT NULL DEFAULT '0.00',
	`targetDate` date,
	`dataSource` text,
	`verificationMethod` text,
	`status` enum('ON_TRACK','AT_RISK','OFF_TRACK','ACHIEVED') NOT NULL DEFAULT 'ON_TRACK',
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `indicators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `procurement_plan` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`itemName` text NOT NULL,
	`itemNameAr` text,
	`description` text,
	`descriptionAr` text,
	`category` enum('GOODS','SERVICES','WORKS','CONSULTANCY') NOT NULL DEFAULT 'GOODS',
	`subcategory` varchar(255),
	`quantity` decimal(15,2) NOT NULL,
	`unit` varchar(100) NOT NULL,
	`estimatedCost` decimal(15,2) NOT NULL,
	`actualCost` decimal(15,2) NOT NULL DEFAULT '0.00',
	`currency` enum('USD','EUR','GBP','CHF') NOT NULL DEFAULT 'USD',
	`plannedProcurementDate` date NOT NULL,
	`actualProcurementDate` date,
	`deliveryDate` date,
	`procurementMethod` enum('DIRECT_PURCHASE','COMPETITIVE_BIDDING','REQUEST_FOR_QUOTATION','FRAMEWORK_AGREEMENT','OTHER') NOT NULL DEFAULT 'DIRECT_PURCHASE',
	`status` enum('PLANNED','REQUESTED','APPROVED','IN_PROCUREMENT','ORDERED','DELIVERED','CANCELLED') NOT NULL DEFAULT 'PLANNED',
	`supplierName` varchar(255),
	`supplierContact` varchar(255),
	`budgetLine` varchar(255),
	`notes` text,
	`notesAr` text,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `procurement_plan_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`taskName` text NOT NULL,
	`taskNameAr` text,
	`description` text,
	`descriptionAr` text,
	`status` enum('TODO','IN_PROGRESS','REVIEW','DONE','BLOCKED') NOT NULL DEFAULT 'TODO',
	`priority` enum('LOW','MEDIUM','HIGH','URGENT') NOT NULL DEFAULT 'MEDIUM',
	`dueDate` date,
	`startDate` date,
	`completedDate` date,
	`assignedTo` int,
	`assignedToName` varchar(255),
	`progressPercentage` decimal(5,2) NOT NULL DEFAULT '0.00',
	`tags` json,
	`category` varchar(255),
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `beneficiaries` ADD CONSTRAINT `beneficiaries_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `beneficiaries` ADD CONSTRAINT `beneficiaries_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `beneficiaries` ADD CONSTRAINT `beneficiaries_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `beneficiaries` ADD CONSTRAINT `beneficiaries_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `beneficiaries` ADD CONSTRAINT `beneficiaries_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `beneficiaries` ADD CONSTRAINT `beneficiaries_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `indicators` ADD CONSTRAINT `indicators_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `indicators` ADD CONSTRAINT `indicators_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `indicators` ADD CONSTRAINT `indicators_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `indicators` ADD CONSTRAINT `indicators_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `indicators` ADD CONSTRAINT `indicators_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `indicators` ADD CONSTRAINT `indicators_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `procurement_plan` ADD CONSTRAINT `procurement_plan_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `procurement_plan` ADD CONSTRAINT `procurement_plan_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `procurement_plan` ADD CONSTRAINT `procurement_plan_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `procurement_plan` ADD CONSTRAINT `procurement_plan_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `procurement_plan` ADD CONSTRAINT `procurement_plan_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `procurement_plan` ADD CONSTRAINT `procurement_plan_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_assignedTo_users_id_fk` FOREIGN KEY (`assignedTo`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;