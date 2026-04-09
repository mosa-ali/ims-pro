ALTER TABLE `documents` DROP INDEX `documents_documentId_unique`;--> statement-breakpoint
ALTER TABLE `documents` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `documents` MODIFY COLUMN `projectId` varchar(100);--> statement-breakpoint
ALTER TABLE `documents` ADD PRIMARY KEY(`documentId`);--> statement-breakpoint
ALTER TABLE `documents` ADD `workspace` enum('projects','meal','hr','finance','logistics','donor_crm','risk_compliance') DEFAULT 'projects' NOT NULL;--> statement-breakpoint
ALTER TABLE `documents` ADD `parentFolderId` varchar(100);--> statement-breakpoint
ALTER TABLE `documents` ADD `isFolder` boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_documents_workspace` ON `documents` (`workspace`);--> statement-breakpoint
CREATE INDEX `idx_documents_parent_folder_id` ON `documents` (`parentFolderId`);--> statement-breakpoint
ALTER TABLE `documents` DROP COLUMN `id`;