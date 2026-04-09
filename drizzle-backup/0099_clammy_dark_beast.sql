CREATE TABLE `grn_approvals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`grnId` int NOT NULL,
	`approvedBy` int NOT NULL,
	`approvalStatus` enum('approved','rejected') NOT NULL,
	`approvalRemarks` text,
	`approvalDate` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `grn_approvals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `grn_approvals` ADD CONSTRAINT `grn_approvals_grnId_goods_receipt_notes_id_fk` FOREIGN KEY (`grnId`) REFERENCES `goods_receipt_notes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `grn_approvals` ADD CONSTRAINT `grn_approvals_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;