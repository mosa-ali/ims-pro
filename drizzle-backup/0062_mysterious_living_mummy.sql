CREATE TABLE `email_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`templateKey` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`nameAr` varchar(255),
	`subject` varchar(500),
	`subjectAr` varchar(500),
	`bodyHtml` text,
	`bodyHtmlAr` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `landing_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`heroTitle` varchar(500),
	`heroTitleAr` varchar(500),
	`heroSubtitle` text,
	`heroSubtitleAr` text,
	`heroImageUrl` text,
	`showQuickStats` boolean NOT NULL DEFAULT true,
	`showAnnouncements` boolean NOT NULL DEFAULT true,
	`showRecentActivity` boolean NOT NULL DEFAULT true,
	`welcomeMessage` text,
	`welcomeMessageAr` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `landing_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `landing_settings_organizationId_unique` UNIQUE(`organizationId`)
);
--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`category` varchar(50) NOT NULL,
	`eventKey` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`nameAr` varchar(255),
	`emailEnabled` boolean NOT NULL DEFAULT true,
	`inAppEnabled` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_preferences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `option_set_values` (
	`id` int AUTO_INCREMENT NOT NULL,
	`optionSetId` int NOT NULL,
	`label` varchar(255) NOT NULL,
	`labelAr` varchar(255),
	`value` varchar(255) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `option_set_values_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `option_sets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`nameAr` varchar(255),
	`description` text,
	`descriptionAr` text,
	`systemKey` varchar(100),
	`isSystem` boolean NOT NULL DEFAULT false,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `option_sets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organization_branding` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`logoUrl` text,
	`faviconUrl` text,
	`systemName` varchar(255),
	`systemNameAr` varchar(255),
	`primaryColor` varchar(20),
	`secondaryColor` varchar(20),
	`accentColor` varchar(20),
	`footerText` text,
	`footerTextAr` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `organization_branding_id` PRIMARY KEY(`id`),
	CONSTRAINT `organization_branding_organizationId_unique` UNIQUE(`organizationId`)
);
--> statement-breakpoint
CREATE TABLE `rbac_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`nameAr` varchar(255),
	`description` text,
	`descriptionAr` text,
	`permissions` text NOT NULL,
	`isSystem` boolean NOT NULL DEFAULT false,
	`isLocked` boolean NOT NULL DEFAULT false,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	CONSTRAINT `rbac_roles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rbac_user_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`organizationId` int NOT NULL,
	`roleId` int,
	`permissions` text NOT NULL,
	`screenPermissions` text,
	`tabPermissions` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `rbac_user_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `rbac_user_permissions_userId_organizationId_unique` UNIQUE(`userId`,`organizationId`)
);
--> statement-breakpoint
ALTER TABLE `email_templates` ADD CONSTRAINT `email_templates_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `landing_settings` ADD CONSTRAINT `landing_settings_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `landing_settings` ADD CONSTRAINT `landing_settings_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_preferences` ADD CONSTRAINT `notification_preferences_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `option_set_values` ADD CONSTRAINT `option_set_values_optionSetId_option_sets_id_fk` FOREIGN KEY (`optionSetId`) REFERENCES `option_sets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `option_set_values` ADD CONSTRAINT `option_set_values_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `option_sets` ADD CONSTRAINT `option_sets_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `option_sets` ADD CONSTRAINT `option_sets_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organization_branding` ADD CONSTRAINT `organization_branding_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organization_branding` ADD CONSTRAINT `organization_branding_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rbac_roles` ADD CONSTRAINT `rbac_roles_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rbac_roles` ADD CONSTRAINT `rbac_roles_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rbac_roles` ADD CONSTRAINT `rbac_roles_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rbac_user_permissions` ADD CONSTRAINT `rbac_user_permissions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rbac_user_permissions` ADD CONSTRAINT `rbac_user_permissions_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rbac_user_permissions` ADD CONSTRAINT `rbac_user_permissions_roleId_rbac_roles_id_fk` FOREIGN KEY (`roleId`) REFERENCES `rbac_roles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rbac_user_permissions` ADD CONSTRAINT `rbac_user_permissions_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;