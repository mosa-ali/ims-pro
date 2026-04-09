ALTER TABLE `documents` ADD `entityType` varchar(100);--> statement-breakpoint
ALTER TABLE `documents` ADD `entityId` varchar(100);--> statement-breakpoint
CREATE INDEX `idx_documents_entity` ON `documents` (`entityType`,`entityId`);