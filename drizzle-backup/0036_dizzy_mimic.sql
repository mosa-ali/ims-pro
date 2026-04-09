CREATE TABLE `project_plan_activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`resultId` int,
	`activityTabId` int,
	`department` enum('Program','MEAL','Logistics','Finance','HR','Security','Other') NOT NULL DEFAULT 'Program',
	`code` varchar(50) NOT NULL,
	`title` text NOT NULL,
	`titleAr` text,
	`description` text,
	`responsible` varchar(255),
	`startDate` date,
	`endDate` date,
	`status` enum('Not Started','Ongoing','Completed') NOT NULL DEFAULT 'Not Started',
	`isSynced` boolean NOT NULL DEFAULT false,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `project_plan_activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_plan_objectives` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`code` varchar(50) NOT NULL,
	`title` text NOT NULL,
	`titleAr` text,
	`description` text,
	`status` enum('Not Started','Ongoing','Completed') NOT NULL DEFAULT 'Not Started',
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `project_plan_objectives_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_plan_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`objectiveId` int NOT NULL,
	`code` varchar(50) NOT NULL,
	`title` text NOT NULL,
	`titleAr` text,
	`description` text,
	`status` enum('Not Started','Ongoing','Completed') NOT NULL DEFAULT 'Not Started',
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `project_plan_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_plan_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`planActivityId` int NOT NULL,
	`taskTabId` int,
	`code` varchar(50) NOT NULL,
	`title` text NOT NULL,
	`titleAr` text,
	`responsible` varchar(255),
	`startDate` date,
	`endDate` date,
	`status` enum('Not Started','Ongoing','Completed') NOT NULL DEFAULT 'Not Started',
	`isSynced` boolean NOT NULL DEFAULT false,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `project_plan_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `project_plan_activities` ADD CONSTRAINT `project_plan_activities_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_plan_activities` ADD CONSTRAINT `project_plan_activities_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_plan_activities` ADD CONSTRAINT `project_plan_activities_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_plan_activities` ADD CONSTRAINT `project_plan_activities_resultId_project_plan_results_id_fk` FOREIGN KEY (`resultId`) REFERENCES `project_plan_results`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_plan_activities` ADD CONSTRAINT `project_plan_activities_activityTabId_activities_id_fk` FOREIGN KEY (`activityTabId`) REFERENCES `activities`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_plan_activities` ADD CONSTRAINT `project_plan_activities_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_plan_activities` ADD CONSTRAINT `project_plan_activities_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_plan_activities` ADD CONSTRAINT `project_plan_activities_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_plan_objectives` ADD CONSTRAINT `project_plan_objectives_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_plan_objectives` ADD CONSTRAINT `project_plan_objectives_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_plan_objectives` ADD CONSTRAINT `project_plan_objectives_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_plan_objectives` ADD CONSTRAINT `project_plan_objectives_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_plan_objectives` ADD CONSTRAINT `project_plan_objectives_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_plan_objectives` ADD CONSTRAINT `project_plan_objectives_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_plan_results` ADD CONSTRAINT `project_plan_results_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_plan_results` ADD CONSTRAINT `project_plan_results_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_plan_results` ADD CONSTRAINT `project_plan_results_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_plan_results` ADD CONSTRAINT `project_plan_results_objectiveId_project_plan_objectives_id_fk` FOREIGN KEY (`objectiveId`) REFERENCES `project_plan_objectives`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_plan_results` ADD CONSTRAINT `project_plan_results_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_plan_results` ADD CONSTRAINT `project_plan_results_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_plan_results` ADD CONSTRAINT `project_plan_results_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_plan_tasks` ADD CONSTRAINT `project_plan_tasks_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_plan_tasks` ADD CONSTRAINT `project_plan_tasks_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_plan_tasks` ADD CONSTRAINT `project_plan_tasks_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_plan_tasks` ADD CONSTRAINT `project_plan_tasks_planActivityId_project_plan_activities_id_fk` FOREIGN KEY (`planActivityId`) REFERENCES `project_plan_activities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_plan_tasks` ADD CONSTRAINT `project_plan_tasks_taskTabId_tasks_id_fk` FOREIGN KEY (`taskTabId`) REFERENCES `tasks`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_plan_tasks` ADD CONSTRAINT `project_plan_tasks_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_plan_tasks` ADD CONSTRAINT `project_plan_tasks_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_plan_tasks` ADD CONSTRAINT `project_plan_tasks_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;