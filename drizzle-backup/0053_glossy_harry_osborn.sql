CREATE TABLE `meal_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int NOT NULL,
	`moduleName` varchar(50) NOT NULL DEFAULT 'MEAL',
	`entityType` varchar(100) NOT NULL,
	`entityId` int NOT NULL,
	`actionType` enum('create','update','delete','approve','export','print') NOT NULL,
	`actorUserId` int,
	`diff` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `meal_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meal_dqa_actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dqaFindingId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int NOT NULL,
	`actionText` text NOT NULL,
	`ownerUserId` int,
	`dueDate` timestamp,
	`status` enum('open','in_progress','closed') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meal_dqa_actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meal_dqa_findings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dqaVisitId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int NOT NULL,
	`severity` enum('low','medium','high') NOT NULL,
	`category` enum('completeness','accuracy','timeliness','integrity','validity') NOT NULL,
	`findingText` text NOT NULL,
	`recommendationText` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meal_dqa_findings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meal_dqa_visits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int NOT NULL,
	`projectId` int NOT NULL,
	`dqaCode` varchar(50) NOT NULL,
	`visitDate` timestamp NOT NULL,
	`verifierUserIds` json,
	`locationIds` json,
	`dataSource` enum('survey','indicator','accountability','mixed') NOT NULL,
	`samplingMethod` text,
	`recordsCheckedCount` int DEFAULT 0,
	`accurateCount` int DEFAULT 0,
	`discrepanciesCount` int DEFAULT 0,
	`missingFieldsCount` int DEFAULT 0,
	`duplicatesCount` int DEFAULT 0,
	`summary` text,
	`status` enum('draft','submitted','approved','closed') NOT NULL DEFAULT 'draft',
	`createdBy` int,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `meal_dqa_visits_id` PRIMARY KEY(`id`),
	CONSTRAINT `meal_dqa_visits_dqaCode_unique` UNIQUE(`dqaCode`)
);
--> statement-breakpoint
CREATE TABLE `meal_indicator_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`name` varchar(500) NOT NULL,
	`code` varchar(100),
	`unitOfMeasure` varchar(100),
	`calculationMethod` text,
	`frequency` varchar(50),
	`disaggregationFields` json,
	`defaultTargets` json,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `meal_indicator_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meal_learning_actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`learningItemId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int NOT NULL,
	`actionText` text NOT NULL,
	`ownerUserId` int,
	`dueDate` timestamp,
	`status` enum('open','in_progress','closed') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meal_learning_actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meal_learning_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int NOT NULL,
	`projectId` int NOT NULL,
	`type` enum('lesson','best_practice','product') NOT NULL,
	`title` varchar(500) NOT NULL,
	`context` text,
	`rootCause` text,
	`whatWorked` text,
	`whatDidnt` text,
	`recommendations` text,
	`moduleSource` enum('indicator','survey','accountability','cross_cutting') NOT NULL,
	`visibility` enum('internal','donor') NOT NULL DEFAULT 'internal',
	`status` enum('draft','submitted','validated','published','archived') NOT NULL DEFAULT 'draft',
	`tags` json,
	`locationIds` json,
	`createdBy` int,
	`updatedBy` int,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `meal_learning_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meal_survey_standards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`standardName` varchar(500) NOT NULL,
	`validationRules` json,
	`requiredFields` json,
	`gpsRequired` boolean NOT NULL DEFAULT false,
	`photoRequired` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `meal_survey_standards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `meal_audit_log` ADD CONSTRAINT `meal_audit_log_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_dqa_actions` ADD CONSTRAINT `meal_dqa_actions_dqaFindingId_meal_dqa_findings_id_fk` FOREIGN KEY (`dqaFindingId`) REFERENCES `meal_dqa_findings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_dqa_actions` ADD CONSTRAINT `meal_dqa_actions_ownerUserId_users_id_fk` FOREIGN KEY (`ownerUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_dqa_findings` ADD CONSTRAINT `meal_dqa_findings_dqaVisitId_meal_dqa_visits_id_fk` FOREIGN KEY (`dqaVisitId`) REFERENCES `meal_dqa_visits`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_dqa_visits` ADD CONSTRAINT `meal_dqa_visits_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_dqa_visits` ADD CONSTRAINT `meal_dqa_visits_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_learning_actions` ADD CONSTRAINT `meal_learning_actions_learningItemId_meal_learning_items_id_fk` FOREIGN KEY (`learningItemId`) REFERENCES `meal_learning_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_learning_actions` ADD CONSTRAINT `meal_learning_actions_ownerUserId_users_id_fk` FOREIGN KEY (`ownerUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_learning_items` ADD CONSTRAINT `meal_learning_items_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_learning_items` ADD CONSTRAINT `meal_learning_items_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_learning_items` ADD CONSTRAINT `meal_learning_items_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;