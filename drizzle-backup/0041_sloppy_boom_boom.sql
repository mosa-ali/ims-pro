CREATE TABLE `meal_accountability_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`projectId` int,
	`recordCode` varchar(50) NOT NULL,
	`recordType` enum('complaint','feedback','suggestion') NOT NULL DEFAULT 'feedback',
	`category` varchar(100),
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`status` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
	`subject` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`submittedVia` varchar(100),
	`isAnonymous` boolean NOT NULL DEFAULT false,
	`isSensitive` boolean NOT NULL DEFAULT false,
	`complainantName` varchar(255),
	`complainantGender` enum('male','female','other','prefer_not_to_say'),
	`complainantAgeGroup` varchar(50),
	`complainantContact` varchar(255),
	`complainantLocation` varchar(255),
	`resolution` text,
	`resolvedAt` timestamp,
	`resolvedBy` int,
	`assignedTo` int,
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	`dueDate` date,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `meal_accountability_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meal_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`projectId` int,
	`documentCode` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`titleAr` varchar(255),
	`description` text,
	`descriptionAr` text,
	`documentType` enum('report','assessment','evaluation','tool','template','guideline','sop','training_material','other') NOT NULL DEFAULT 'other',
	`category` enum('indicators','surveys','reports','accountability','other') NOT NULL DEFAULT 'other',
	`fileName` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileSize` int,
	`mimeType` varchar(100),
	`version` varchar(20) NOT NULL DEFAULT '1.0',
	`parentDocumentId` int,
	`sourceModule` varchar(100),
	`sourceRecordId` int,
	`isSystemGenerated` boolean NOT NULL DEFAULT false,
	`isPublic` boolean NOT NULL DEFAULT false,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `meal_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meal_indicator_data_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`indicatorId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`projectId` int,
	`reportingPeriod` varchar(50) NOT NULL,
	`periodStartDate` date NOT NULL,
	`periodEndDate` date NOT NULL,
	`achievedValue` decimal(15,2) NOT NULL,
	`disaggregation` json,
	`dataSource` text,
	`evidenceFiles` json,
	`notes` text,
	`isVerified` boolean NOT NULL DEFAULT false,
	`verifiedAt` timestamp,
	`verifiedBy` int,
	`verificationNotes` text,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `meal_indicator_data_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meal_survey_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`surveyId` int NOT NULL,
	`questionCode` varchar(50) NOT NULL,
	`questionText` text NOT NULL,
	`questionTextAr` text,
	`helpText` text,
	`helpTextAr` text,
	`questionType` enum('text','textarea','number','email','phone','date','time','datetime','select','multiselect','radio','checkbox','rating','scale','file','image','signature','location','matrix') NOT NULL DEFAULT 'text',
	`isRequired` boolean NOT NULL DEFAULT false,
	`order` int NOT NULL DEFAULT 0,
	`sectionId` varchar(50),
	`sectionTitle` varchar(255),
	`sectionTitleAr` varchar(255),
	`options` json,
	`validationRules` json,
	`skipLogic` json,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meal_survey_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meal_survey_submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`surveyId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`projectId` int,
	`submissionCode` varchar(50) NOT NULL,
	`respondentName` varchar(255),
	`respondentEmail` varchar(320),
	`respondentPhone` varchar(50),
	`responses` json NOT NULL,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`submittedBy` int,
	`validationStatus` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`validatedAt` timestamp,
	`validatedBy` int,
	`validationNotes` text,
	`latitude` decimal(10,8),
	`longitude` decimal(11,8),
	`locationName` varchar(255),
	`deviceInfo` json,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meal_survey_submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meal_surveys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`projectId` int,
	`surveyCode` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`titleAr` varchar(255),
	`description` text,
	`descriptionAr` text,
	`surveyType` enum('baseline','endline','monitoring','assessment','feedback','custom') NOT NULL DEFAULT 'custom',
	`status` enum('draft','published','closed','archived') NOT NULL DEFAULT 'draft',
	`isAnonymous` boolean NOT NULL DEFAULT false,
	`allowMultipleSubmissions` boolean NOT NULL DEFAULT false,
	`requiresApproval` boolean NOT NULL DEFAULT false,
	`startDate` date,
	`endDate` date,
	`formConfig` json,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `meal_surveys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `meal_accountability_records` ADD CONSTRAINT `meal_accountability_records_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_accountability_records` ADD CONSTRAINT `meal_accountability_records_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_accountability_records` ADD CONSTRAINT `meal_accountability_records_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_accountability_records` ADD CONSTRAINT `meal_accountability_records_resolvedBy_users_id_fk` FOREIGN KEY (`resolvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_accountability_records` ADD CONSTRAINT `meal_accountability_records_assignedTo_users_id_fk` FOREIGN KEY (`assignedTo`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_accountability_records` ADD CONSTRAINT `meal_accountability_records_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_accountability_records` ADD CONSTRAINT `meal_accountability_records_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_accountability_records` ADD CONSTRAINT `meal_accountability_records_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_documents` ADD CONSTRAINT `meal_documents_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_documents` ADD CONSTRAINT `meal_documents_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_documents` ADD CONSTRAINT `meal_documents_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_documents` ADD CONSTRAINT `meal_documents_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_documents` ADD CONSTRAINT `meal_documents_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_documents` ADD CONSTRAINT `meal_documents_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_indicator_data_entries` ADD CONSTRAINT `meal_indicator_data_entries_indicatorId_indicators_id_fk` FOREIGN KEY (`indicatorId`) REFERENCES `indicators`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_indicator_data_entries` ADD CONSTRAINT `meal_indicator_data_entries_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_indicator_data_entries` ADD CONSTRAINT `meal_indicator_data_entries_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_indicator_data_entries` ADD CONSTRAINT `meal_indicator_data_entries_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_indicator_data_entries` ADD CONSTRAINT `meal_indicator_data_entries_verifiedBy_users_id_fk` FOREIGN KEY (`verifiedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_indicator_data_entries` ADD CONSTRAINT `meal_indicator_data_entries_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_indicator_data_entries` ADD CONSTRAINT `meal_indicator_data_entries_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_indicator_data_entries` ADD CONSTRAINT `meal_indicator_data_entries_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_survey_questions` ADD CONSTRAINT `meal_survey_questions_surveyId_meal_surveys_id_fk` FOREIGN KEY (`surveyId`) REFERENCES `meal_surveys`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_survey_questions` ADD CONSTRAINT `meal_survey_questions_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_survey_submissions` ADD CONSTRAINT `meal_survey_submissions_surveyId_meal_surveys_id_fk` FOREIGN KEY (`surveyId`) REFERENCES `meal_surveys`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_survey_submissions` ADD CONSTRAINT `meal_survey_submissions_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_survey_submissions` ADD CONSTRAINT `meal_survey_submissions_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_survey_submissions` ADD CONSTRAINT `meal_survey_submissions_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_survey_submissions` ADD CONSTRAINT `meal_survey_submissions_submittedBy_users_id_fk` FOREIGN KEY (`submittedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_survey_submissions` ADD CONSTRAINT `meal_survey_submissions_validatedBy_users_id_fk` FOREIGN KEY (`validatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_survey_submissions` ADD CONSTRAINT `meal_survey_submissions_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_surveys` ADD CONSTRAINT `meal_surveys_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_surveys` ADD CONSTRAINT `meal_surveys_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_surveys` ADD CONSTRAINT `meal_surveys_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_surveys` ADD CONSTRAINT `meal_surveys_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_surveys` ADD CONSTRAINT `meal_surveys_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_surveys` ADD CONSTRAINT `meal_surveys_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;