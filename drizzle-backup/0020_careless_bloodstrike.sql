ALTER TABLE `organizations` ADD `organizationCode` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `organizations` ADD `tenantId` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `organizations` ADD `primaryAdminId` int;--> statement-breakpoint
ALTER TABLE `organizations` ADD CONSTRAINT `organizations_organizationCode_unique` UNIQUE(`organizationCode`);--> statement-breakpoint
ALTER TABLE `organizations` ADD CONSTRAINT `organizations_tenantId_unique` UNIQUE(`tenantId`);--> statement-breakpoint
ALTER TABLE `organizations` ADD CONSTRAINT `organizations_primaryAdminId_users_id_fk` FOREIGN KEY (`primaryAdminId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;