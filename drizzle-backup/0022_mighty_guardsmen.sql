ALTER TABLE `organizations` DROP INDEX `organizations_organizationCode_unique`;--> statement-breakpoint
ALTER TABLE `organizations` DROP INDEX `organizations_tenantId_unique`;--> statement-breakpoint
ALTER TABLE `organizations` DROP FOREIGN KEY `organizations_primaryAdminId_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `organizations` DROP COLUMN `organizationCode`;--> statement-breakpoint
ALTER TABLE `organizations` DROP COLUMN `tenantId`;--> statement-breakpoint
ALTER TABLE `organizations` DROP COLUMN `primaryAdminId`;