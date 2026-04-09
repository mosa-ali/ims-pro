ALTER TABLE `grants` MODIFY COLUMN `startDate` date;--> statement-breakpoint
ALTER TABLE `grants` MODIFY COLUMN `endDate` date;--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `startDate` date NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `endDate` date NOT NULL;