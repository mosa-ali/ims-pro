CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` varchar(100) NOT NULL,
	`projectId` varchar(100) NOT NULL,
	`folderCode` varchar(100) NOT NULL,
	`fileName` varchar(500) NOT NULL,
	`filePath` text NOT NULL,
	`fileType` varchar(50) NOT NULL,
	`fileSize` bigint NOT NULL,
	`uploadedBy` int NOT NULL,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	`syncSource` varchar(100) NOT NULL,
	`syncStatus` enum('synced','not_synced','pending','error') NOT NULL DEFAULT 'synced',
	`version` int NOT NULL DEFAULT 1,
	`organizationId` int NOT NULL,
	`operatingUnitId` int NOT NULL,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`),
	CONSTRAINT `documents_documentId_unique` UNIQUE(`documentId`)
);
--> statement-breakpoint
CREATE INDEX `idx_documents_project_id` ON `documents` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_documents_folder_code` ON `documents` (`folderCode`);--> statement-breakpoint
CREATE INDEX `idx_documents_organization_id` ON `documents` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_documents_operating_unit_id` ON `documents` (`operatingUnitId`);