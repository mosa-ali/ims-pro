ALTER TABLE `proposals` ADD `grantId` int;--> statement-breakpoint
ALTER TABLE `proposals` ADD `projectId` int;--> statement-breakpoint
ALTER TABLE `proposals` ADD CONSTRAINT `proposals_grantId_grants_id_fk` FOREIGN KEY (`grantId`) REFERENCES `grants`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposals` ADD CONSTRAINT `proposals_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;