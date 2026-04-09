CREATE TABLE `hr_salary_scale` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`employeeId` int NOT NULL,
	`staffId` varchar(50) NOT NULL,
	`staffFullName` varchar(255) NOT NULL,
	`position` varchar(100),
	`department` varchar(100),
	`contractType` varchar(50),
	`gradeId` int,
	`gradeCode` varchar(50) NOT NULL,
	`step` varchar(50) NOT NULL,
	`minSalary` decimal(15,2) DEFAULT '0',
	`maxSalary` decimal(15,2) DEFAULT '0',
	`approvedGrossSalary` decimal(15,2) NOT NULL,
	`housingAllowance` decimal(15,2) DEFAULT '0',
	`housingAllowanceType` enum('value','percentage') DEFAULT 'value',
	`transportAllowance` decimal(15,2) DEFAULT '0',
	`transportAllowanceType` enum('value','percentage') DEFAULT 'value',
	`representationAllowance` decimal(15,2) DEFAULT '0',
	`representationAllowanceType` enum('value','percentage') DEFAULT 'value',
	`annualAllowance` decimal(15,2) DEFAULT '0',
	`bonus` decimal(15,2) DEFAULT '0',
	`otherAllowances` decimal(15,2) DEFAULT '0',
	`currency` varchar(10) DEFAULT 'USD',
	`version` int NOT NULL DEFAULT 1,
	`effectiveStartDate` date NOT NULL,
	`effectiveEndDate` date,
	`status` enum('draft','active','superseded') NOT NULL DEFAULT 'draft',
	`isLocked` boolean NOT NULL DEFAULT false,
	`usedInPayroll` boolean NOT NULL DEFAULT false,
	`lastApprovedBy` int,
	`lastApprovedAt` timestamp,
	`createdBy` int,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hr_salary_scale_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `hr_salary_scale` ADD CONSTRAINT `hr_salary_scale_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_salary_scale` ADD CONSTRAINT `hr_salary_scale_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_salary_scale` ADD CONSTRAINT `hr_salary_scale_employeeId_hr_employees_id_fk` FOREIGN KEY (`employeeId`) REFERENCES `hr_employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_salary_scale` ADD CONSTRAINT `hr_salary_scale_gradeId_hr_salary_grades_id_fk` FOREIGN KEY (`gradeId`) REFERENCES `hr_salary_grades`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_salary_scale` ADD CONSTRAINT `hr_salary_scale_lastApprovedBy_users_id_fk` FOREIGN KEY (`lastApprovedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_salary_scale` ADD CONSTRAINT `hr_salary_scale_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_salary_scale` ADD CONSTRAINT `hr_salary_scale_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;