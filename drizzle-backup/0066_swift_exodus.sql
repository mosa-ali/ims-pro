CREATE TABLE `permission_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`organizationId` int NOT NULL,
	`moduleId` varchar(100) NOT NULL,
	`screenId` varchar(100),
	`reviewedBy` int NOT NULL,
	`reviewedAt` timestamp NOT NULL DEFAULT (now()),
	`outcome` enum('approved','revoked') NOT NULL DEFAULT 'approved',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `permission_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `permission_reviews` ADD CONSTRAINT `permission_reviews_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `permission_reviews` ADD CONSTRAINT `permission_reviews_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `permission_reviews` ADD CONSTRAINT `permission_reviews_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `pr_user_org_idx` ON `permission_reviews` (`userId`,`organizationId`);--> statement-breakpoint
CREATE INDEX `pr_reviewed_at_idx` ON `permission_reviews` (`reviewedAt`);