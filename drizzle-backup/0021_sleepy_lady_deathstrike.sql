ALTER TABLE `organizations` MODIFY COLUMN `organizationCode` varchar(50);--> statement-breakpoint
ALTER TABLE `organizations` MODIFY COLUMN `tenantId` varchar(36);