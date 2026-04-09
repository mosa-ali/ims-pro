CREATE TABLE `grant_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`grantId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileSize` int,
	`mimeType` varchar(100),
	`category` enum('contractual','financial','programmatic','reporting','other') NOT NULL DEFAULT 'other',
	`status` enum('draft','pending','approved','rejected','final') NOT NULL DEFAULT 'draft',
	`description` text,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	`uploadedBy` int,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `grant_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `grant_documents` ADD CONSTRAINT `grant_documents_grantId_grants_id_fk` FOREIGN KEY (`grantId`) REFERENCES `grants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `grant_documents` ADD CONSTRAINT `grant_documents_uploadedBy_users_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `grant_documents` ADD CONSTRAINT `grant_documents_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;