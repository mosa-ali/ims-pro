ALTER TABLE `tasks` ADD `assignedByEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `tasks` ADD `assignedByName` varchar(255);--> statement-breakpoint
ALTER TABLE `tasks` ADD `assignedToEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `tasks` ADD `assignmentDate` timestamp;