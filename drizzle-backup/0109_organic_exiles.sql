CREATE TABLE `payable_approval_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`payableId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`action` enum('approved','rejected','cancelled') NOT NULL,
	`actionBy` int NOT NULL,
	`actionByName` varchar(255),
	`actionByEmail` varchar(320),
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payable_approval_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `payable_approval_history` ADD CONSTRAINT `payable_approval_history_payableId_procurement_payables_id_fk` FOREIGN KEY (`payableId`) REFERENCES `procurement_payables`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payable_approval_history` ADD CONSTRAINT `payable_approval_history_actionBy_users_id_fk` FOREIGN KEY (`actionBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;