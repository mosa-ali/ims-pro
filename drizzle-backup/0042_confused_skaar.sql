CREATE TABLE `hr_annual_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`planYear` int NOT NULL,
	`planName` varchar(255) NOT NULL,
	`existingWorkforce` text,
	`plannedStaffing` text,
	`recruitmentPlan` text,
	`budgetEstimate` text,
	`trainingPlan` text,
	`hrRisks` text,
	`totalPlannedPositions` int,
	`existingStaff` int,
	`newPositionsRequired` int,
	`estimatedHrCost` decimal(15,2),
	`status` enum('draft','pending_review','pending_approval','approved','rejected') NOT NULL DEFAULT 'draft',
	`preparedBy` int,
	`preparedAt` timestamp,
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`approvedBy` int,
	`approvedAt` timestamp,
	`notes` text,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hr_annual_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hr_attendance_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`employeeId` int NOT NULL,
	`date` date NOT NULL,
	`checkIn` timestamp,
	`checkOut` timestamp,
	`status` enum('present','absent','late','half_day','on_leave','holiday','weekend') NOT NULL DEFAULT 'present',
	`workHours` decimal(5,2),
	`overtimeHours` decimal(5,2),
	`location` varchar(255),
	`notes` text,
	`periodLocked` boolean NOT NULL DEFAULT false,
	`lockedBy` int,
	`lockedAt` timestamp,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hr_attendance_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `hr_attendance_records_employeeId_date_unique` UNIQUE(`employeeId`,`date`)
);
--> statement-breakpoint
CREATE TABLE `hr_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`employeeId` int,
	`documentCode` varchar(50),
	`documentName` varchar(255) NOT NULL,
	`documentNameAr` varchar(255),
	`documentType` enum('policy','template','form','contract','certificate','id_document','other') NOT NULL,
	`category` varchar(100),
	`fileUrl` text,
	`fileSize` int,
	`mimeType` varchar(100),
	`version` varchar(50),
	`effectiveDate` date,
	`expiryDate` date,
	`description` text,
	`tags` text,
	`isPublic` boolean NOT NULL DEFAULT false,
	`accessRoles` text,
	`status` enum('draft','active','archived','expired') NOT NULL DEFAULT 'active',
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`uploadedBy` int,
	CONSTRAINT `hr_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hr_employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`employeeCode` varchar(50) NOT NULL,
	`firstName` varchar(100) NOT NULL,
	`lastName` varchar(100) NOT NULL,
	`firstNameAr` varchar(100),
	`lastNameAr` varchar(100),
	`email` varchar(320),
	`phone` varchar(50),
	`dateOfBirth` date,
	`gender` enum('male','female','other'),
	`nationality` varchar(100),
	`nationalId` varchar(100),
	`passportNumber` varchar(100),
	`employmentType` enum('full_time','part_time','contract','consultant','intern') DEFAULT 'full_time',
	`staffCategory` enum('national','international','expatriate') DEFAULT 'national',
	`department` varchar(100),
	`position` varchar(100),
	`jobTitle` varchar(255),
	`gradeLevel` varchar(50),
	`reportingTo` int,
	`hireDate` date,
	`contractStartDate` date,
	`contractEndDate` date,
	`probationEndDate` date,
	`terminationDate` date,
	`status` enum('active','on_leave','suspended','terminated','resigned') NOT NULL DEFAULT 'active',
	`address` text,
	`city` varchar(100),
	`country` varchar(100),
	`emergencyContactName` varchar(255),
	`emergencyContactPhone` varchar(50),
	`emergencyContactRelation` varchar(100),
	`bankName` varchar(255),
	`bankAccountNumber` varchar(100),
	`bankIban` varchar(100),
	`photoUrl` text,
	`notes` text,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `hr_employees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hr_leave_balances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`employeeId` int NOT NULL,
	`year` int NOT NULL,
	`leaveType` enum('annual','sick','maternity','paternity','unpaid','compassionate','study','other') NOT NULL,
	`entitlement` decimal(5,1) NOT NULL DEFAULT '0',
	`carriedOver` decimal(5,1) NOT NULL DEFAULT '0',
	`used` decimal(5,1) NOT NULL DEFAULT '0',
	`pending` decimal(5,1) NOT NULL DEFAULT '0',
	`remaining` decimal(5,1) NOT NULL DEFAULT '0',
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hr_leave_balances_id` PRIMARY KEY(`id`),
	CONSTRAINT `hr_leave_balances_employeeId_year_leaveType_unique` UNIQUE(`employeeId`,`year`,`leaveType`)
);
--> statement-breakpoint
CREATE TABLE `hr_leave_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`employeeId` int NOT NULL,
	`leaveType` enum('annual','sick','maternity','paternity','unpaid','compassionate','study','other') NOT NULL,
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`totalDays` decimal(5,1) NOT NULL,
	`reason` text,
	`attachmentUrl` text,
	`status` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
	`approvedBy` int,
	`approvedAt` timestamp,
	`rejectionReason` text,
	`balanceBefore` decimal(5,1),
	`balanceAfter` decimal(5,1),
	`notes` text,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hr_leave_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hr_payroll_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`employeeId` int NOT NULL,
	`payrollMonth` int NOT NULL,
	`payrollYear` int NOT NULL,
	`basicSalary` decimal(15,2) NOT NULL,
	`housingAllowance` decimal(15,2) DEFAULT '0',
	`transportAllowance` decimal(15,2) DEFAULT '0',
	`otherAllowances` decimal(15,2) DEFAULT '0',
	`overtimePay` decimal(15,2) DEFAULT '0',
	`bonus` decimal(15,2) DEFAULT '0',
	`grossSalary` decimal(15,2) NOT NULL,
	`taxDeduction` decimal(15,2) DEFAULT '0',
	`socialSecurityDeduction` decimal(15,2) DEFAULT '0',
	`loanDeduction` decimal(15,2) DEFAULT '0',
	`otherDeductions` decimal(15,2) DEFAULT '0',
	`totalDeductions` decimal(15,2) DEFAULT '0',
	`netSalary` decimal(15,2) NOT NULL,
	`currency` varchar(10) DEFAULT 'USD',
	`status` enum('draft','pending_approval','approved','paid','cancelled') NOT NULL DEFAULT 'draft',
	`approvedBy` int,
	`approvedAt` timestamp,
	`paidAt` timestamp,
	`paymentMethod` enum('bank_transfer','cash','check') DEFAULT 'bank_transfer',
	`paymentReference` varchar(255),
	`notes` text,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hr_payroll_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `hr_payroll_records_employeeId_payrollMonth_payrollYear_unique` UNIQUE(`employeeId`,`payrollMonth`,`payrollYear`)
);
--> statement-breakpoint
CREATE TABLE `hr_recruitment_candidates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`jobId` int NOT NULL,
	`firstName` varchar(100) NOT NULL,
	`lastName` varchar(100) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(50),
	`resumeUrl` text,
	`coverLetterUrl` text,
	`portfolioUrl` text,
	`linkedinUrl` text,
	`education` text,
	`experience` text,
	`skills` text,
	`source` enum('website','referral','job_board','linkedin','agency','other') DEFAULT 'website',
	`referredBy` varchar(255),
	`rating` int,
	`evaluationNotes` text,
	`interviewDate` timestamp,
	`interviewNotes` text,
	`interviewers` text,
	`status` enum('new','screening','shortlisted','interview_scheduled','interviewed','offer_pending','offer_sent','hired','rejected','withdrawn') NOT NULL DEFAULT 'new',
	`rejectionReason` text,
	`offerDate` date,
	`offerSalary` decimal(15,2),
	`offerAccepted` boolean,
	`startDate` date,
	`notes` text,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hr_recruitment_candidates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hr_recruitment_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`jobCode` varchar(50),
	`jobTitle` varchar(255) NOT NULL,
	`jobTitleAr` varchar(255),
	`department` varchar(100),
	`employmentType` enum('full_time','part_time','contract','consultant','intern') DEFAULT 'full_time',
	`gradeLevel` varchar(50),
	`salaryRange` varchar(100),
	`description` text,
	`requirements` text,
	`responsibilities` text,
	`benefits` text,
	`location` varchar(255),
	`isRemote` boolean DEFAULT false,
	`openings` int DEFAULT 1,
	`postingDate` date,
	`closingDate` date,
	`status` enum('draft','open','on_hold','closed','filled','cancelled') NOT NULL DEFAULT 'draft',
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	CONSTRAINT `hr_recruitment_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hr_salary_grades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`gradeCode` varchar(50) NOT NULL,
	`gradeName` varchar(100) NOT NULL,
	`gradeNameAr` varchar(100),
	`minSalary` decimal(15,2) NOT NULL,
	`maxSalary` decimal(15,2) NOT NULL,
	`midSalary` decimal(15,2),
	`currency` varchar(10) DEFAULT 'USD',
	`steps` text,
	`housingAllowance` decimal(15,2),
	`transportAllowance` decimal(15,2),
	`otherAllowances` text,
	`effectiveDate` date,
	`expiryDate` date,
	`status` enum('active','inactive','draft') NOT NULL DEFAULT 'active',
	`notes` text,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hr_salary_grades_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hr_sanctions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`employeeId` int NOT NULL,
	`sanctionCode` varchar(50),
	`sanctionType` enum('verbal_warning','written_warning','final_warning','suspension','demotion','termination','other') NOT NULL,
	`severity` enum('minor','moderate','major','critical') NOT NULL DEFAULT 'minor',
	`incidentDate` date NOT NULL,
	`reportedDate` date,
	`description` text NOT NULL,
	`evidence` text,
	`investigatedBy` int,
	`investigationNotes` text,
	`investigationDate` date,
	`decisionDate` date,
	`decisionBy` int,
	`decision` text,
	`appealDate` date,
	`appealOutcome` enum('upheld','modified','overturned'),
	`appealNotes` text,
	`status` enum('reported','under_investigation','pending_decision','decided','appealed','closed') NOT NULL DEFAULT 'reported',
	`effectiveDate` date,
	`expiryDate` date,
	`notes` text,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hr_sanctions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `hr_annual_plans` ADD CONSTRAINT `hr_annual_plans_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_annual_plans` ADD CONSTRAINT `hr_annual_plans_preparedBy_users_id_fk` FOREIGN KEY (`preparedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_annual_plans` ADD CONSTRAINT `hr_annual_plans_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_annual_plans` ADD CONSTRAINT `hr_annual_plans_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_annual_plans` ADD CONSTRAINT `hr_annual_plans_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_attendance_records` ADD CONSTRAINT `hr_attendance_records_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_attendance_records` ADD CONSTRAINT `hr_attendance_records_employeeId_hr_employees_id_fk` FOREIGN KEY (`employeeId`) REFERENCES `hr_employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_attendance_records` ADD CONSTRAINT `hr_attendance_records_lockedBy_users_id_fk` FOREIGN KEY (`lockedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_attendance_records` ADD CONSTRAINT `hr_attendance_records_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_documents` ADD CONSTRAINT `hr_documents_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_documents` ADD CONSTRAINT `hr_documents_employeeId_hr_employees_id_fk` FOREIGN KEY (`employeeId`) REFERENCES `hr_employees`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_documents` ADD CONSTRAINT `hr_documents_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_documents` ADD CONSTRAINT `hr_documents_uploadedBy_users_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_employees` ADD CONSTRAINT `hr_employees_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_employees` ADD CONSTRAINT `hr_employees_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_employees` ADD CONSTRAINT `hr_employees_reportingTo_hr_employees_id_fk` FOREIGN KEY (`reportingTo`) REFERENCES `hr_employees`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_employees` ADD CONSTRAINT `hr_employees_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_employees` ADD CONSTRAINT `hr_employees_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_employees` ADD CONSTRAINT `hr_employees_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_leave_balances` ADD CONSTRAINT `hr_leave_balances_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_leave_balances` ADD CONSTRAINT `hr_leave_balances_employeeId_hr_employees_id_fk` FOREIGN KEY (`employeeId`) REFERENCES `hr_employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_leave_balances` ADD CONSTRAINT `hr_leave_balances_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_leave_requests` ADD CONSTRAINT `hr_leave_requests_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_leave_requests` ADD CONSTRAINT `hr_leave_requests_employeeId_hr_employees_id_fk` FOREIGN KEY (`employeeId`) REFERENCES `hr_employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_leave_requests` ADD CONSTRAINT `hr_leave_requests_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_leave_requests` ADD CONSTRAINT `hr_leave_requests_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_payroll_records` ADD CONSTRAINT `hr_payroll_records_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_payroll_records` ADD CONSTRAINT `hr_payroll_records_employeeId_hr_employees_id_fk` FOREIGN KEY (`employeeId`) REFERENCES `hr_employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_payroll_records` ADD CONSTRAINT `hr_payroll_records_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_payroll_records` ADD CONSTRAINT `hr_payroll_records_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_recruitment_candidates` ADD CONSTRAINT `hr_recruitment_candidates_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_recruitment_candidates` ADD CONSTRAINT `hr_recruitment_candidates_jobId_hr_recruitment_jobs_id_fk` FOREIGN KEY (`jobId`) REFERENCES `hr_recruitment_jobs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_recruitment_candidates` ADD CONSTRAINT `hr_recruitment_candidates_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_recruitment_jobs` ADD CONSTRAINT `hr_recruitment_jobs_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_recruitment_jobs` ADD CONSTRAINT `hr_recruitment_jobs_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_recruitment_jobs` ADD CONSTRAINT `hr_recruitment_jobs_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_recruitment_jobs` ADD CONSTRAINT `hr_recruitment_jobs_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_salary_grades` ADD CONSTRAINT `hr_salary_grades_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_salary_grades` ADD CONSTRAINT `hr_salary_grades_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_sanctions` ADD CONSTRAINT `hr_sanctions_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_sanctions` ADD CONSTRAINT `hr_sanctions_employeeId_hr_employees_id_fk` FOREIGN KEY (`employeeId`) REFERENCES `hr_employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_sanctions` ADD CONSTRAINT `hr_sanctions_investigatedBy_users_id_fk` FOREIGN KEY (`investigatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_sanctions` ADD CONSTRAINT `hr_sanctions_decisionBy_users_id_fk` FOREIGN KEY (`decisionBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_sanctions` ADD CONSTRAINT `hr_sanctions_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;