CREATE TABLE `case_activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`activityType` varchar(50) NOT NULL,
	`activityDate` date NOT NULL,
	`provider` varchar(255),
	`notes` text,
	`linkedActivityId` int,
	`linkedIndicatorId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`isDeleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `case_activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `case_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`caseCode` varchar(50) NOT NULL,
	`beneficiaryCode` varchar(50) NOT NULL,
	`firstName` varchar(100),
	`lastName` varchar(100),
	`dateOfBirth` date,
	`gender` varchar(20),
	`age` int,
	`nationality` varchar(100),
	`idNumber` varchar(100),
	`hasDisability` boolean DEFAULT false,
	`location` varchar(255),
	`district` varchar(100),
	`community` varchar(100),
	`householdSize` int,
	`vulnerabilityCategory` varchar(100),
	`phoneNumber` varchar(50),
	`email` varchar(320),
	`address` text,
	`caseType` varchar(50) NOT NULL,
	`riskLevel` varchar(20) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'open',
	`openedAt` timestamp NOT NULL DEFAULT (now()),
	`closedAt` timestamp,
	`referralSource` varchar(255),
	`intakeDate` date,
	`identifiedNeeds` text,
	`riskFactors` text,
	`immediateConcerns` text,
	`informedConsentObtained` boolean NOT NULL DEFAULT false,
	`consentDate` date,
	`assignedPssOfficerId` int,
	`assignedCaseWorkerId` int,
	`assignedTo` varchar(255),
	`plannedInterventions` text,
	`responsiblePerson` varchar(255),
	`expectedOutcomes` text,
	`timeline` varchar(255),
	`reviewDate` date,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `case_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `case_referrals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`referralDate` date NOT NULL,
	`referralType` varchar(20) NOT NULL,
	`serviceRequired` varchar(255) NOT NULL,
	`receivingOrganization` varchar(255) NOT NULL,
	`focalPoint` varchar(255),
	`focalPointContact` varchar(255),
	`status` varchar(20) NOT NULL DEFAULT 'pending',
	`followUpDate` date,
	`feedbackReceived` boolean DEFAULT false,
	`feedbackNotes` text,
	`consentObtained` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`isDeleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `case_referrals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `child_safe_spaces` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`cssName` varchar(255) NOT NULL,
	`cssCode` varchar(50) NOT NULL,
	`location` varchar(255) NOT NULL,
	`operatingPartner` varchar(255),
	`capacity` int,
	`ageGroupsServed` varchar(100),
	`genderSegregation` boolean DEFAULT false,
	`operatingDays` varchar(100),
	`operatingHours` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`isDeleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `child_safe_spaces_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `css_activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cssId` int NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`activityType` varchar(50) NOT NULL,
	`activityDate` date NOT NULL,
	`facilitatorId` int,
	`facilitatorName` varchar(255),
	`participantsCount` int NOT NULL DEFAULT 0,
	`maleCount` int DEFAULT 0,
	`femaleCount` int DEFAULT 0,
	`notes` text,
	`linkedCaseId` int,
	`linkedIndicatorId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`isDeleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `css_activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pss_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`sessionDate` date NOT NULL,
	`sessionType` varchar(20) NOT NULL,
	`pssApproach` varchar(50),
	`facilitatorId` int,
	`facilitatorName` varchar(255),
	`duration` int,
	`keyObservations` text,
	`beneficiaryResponse` text,
	`nextSessionDate` date,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`isDeleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `pss_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `case_activities` ADD CONSTRAINT `case_activities_caseId_case_records_id_fk` FOREIGN KEY (`caseId`) REFERENCES `case_records`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_activities` ADD CONSTRAINT `case_activities_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_activities` ADD CONSTRAINT `case_activities_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_activities` ADD CONSTRAINT `case_activities_linkedActivityId_activities_id_fk` FOREIGN KEY (`linkedActivityId`) REFERENCES `activities`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_activities` ADD CONSTRAINT `case_activities_linkedIndicatorId_indicators_id_fk` FOREIGN KEY (`linkedIndicatorId`) REFERENCES `indicators`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_activities` ADD CONSTRAINT `case_activities_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_records` ADD CONSTRAINT `case_records_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_records` ADD CONSTRAINT `case_records_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_records` ADD CONSTRAINT `case_records_assignedPssOfficerId_users_id_fk` FOREIGN KEY (`assignedPssOfficerId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_records` ADD CONSTRAINT `case_records_assignedCaseWorkerId_users_id_fk` FOREIGN KEY (`assignedCaseWorkerId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_records` ADD CONSTRAINT `case_records_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_records` ADD CONSTRAINT `case_records_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_records` ADD CONSTRAINT `case_records_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_referrals` ADD CONSTRAINT `case_referrals_caseId_case_records_id_fk` FOREIGN KEY (`caseId`) REFERENCES `case_records`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_referrals` ADD CONSTRAINT `case_referrals_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_referrals` ADD CONSTRAINT `case_referrals_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_referrals` ADD CONSTRAINT `case_referrals_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `child_safe_spaces` ADD CONSTRAINT `child_safe_spaces_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `child_safe_spaces` ADD CONSTRAINT `child_safe_spaces_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `child_safe_spaces` ADD CONSTRAINT `child_safe_spaces_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `css_activities` ADD CONSTRAINT `css_activities_cssId_child_safe_spaces_id_fk` FOREIGN KEY (`cssId`) REFERENCES `child_safe_spaces`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `css_activities` ADD CONSTRAINT `css_activities_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `css_activities` ADD CONSTRAINT `css_activities_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `css_activities` ADD CONSTRAINT `css_activities_facilitatorId_users_id_fk` FOREIGN KEY (`facilitatorId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `css_activities` ADD CONSTRAINT `css_activities_linkedCaseId_case_records_id_fk` FOREIGN KEY (`linkedCaseId`) REFERENCES `case_records`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `css_activities` ADD CONSTRAINT `css_activities_linkedIndicatorId_indicators_id_fk` FOREIGN KEY (`linkedIndicatorId`) REFERENCES `indicators`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `css_activities` ADD CONSTRAINT `css_activities_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pss_sessions` ADD CONSTRAINT `pss_sessions_caseId_case_records_id_fk` FOREIGN KEY (`caseId`) REFERENCES `case_records`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pss_sessions` ADD CONSTRAINT `pss_sessions_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pss_sessions` ADD CONSTRAINT `pss_sessions_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pss_sessions` ADD CONSTRAINT `pss_sessions_facilitatorId_users_id_fk` FOREIGN KEY (`facilitatorId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pss_sessions` ADD CONSTRAINT `pss_sessions_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;