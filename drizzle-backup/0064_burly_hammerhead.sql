CREATE TABLE `email_provider_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`providerType` enum('m365','smtp','disabled') NOT NULL DEFAULT 'disabled',
	`tenantId` varchar(255),
	`clientId` varchar(255),
	`authType` enum('secret','certificate'),
	`secretRef` text,
	`certificateRef` text,
	`senderMode` enum('shared_mailbox','user_mailbox'),
	`smtpHost` varchar(255),
	`smtpPort` int,
	`smtpUsername` varchar(255),
	`smtpPassword` text,
	`smtpEncryption` enum('tls','ssl','none') DEFAULT 'tls',
	`fromEmail` varchar(320),
	`fromName` varchar(255),
	`replyToEmail` varchar(320),
	`defaultCc` text,
	`defaultBcc` text,
	`allowedDomains` text,
	`isConnected` boolean NOT NULL DEFAULT false,
	`lastSuccessfulSend` timestamp,
	`lastError` text,
	`lastTestedAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_provider_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_provider_settings_organizationId_unique` UNIQUE(`organizationId`)
);
--> statement-breakpoint
CREATE TABLE `notification_event_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`eventKey` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(50) NOT NULL,
	`description` varchar(500),
	`emailEnabled` boolean NOT NULL DEFAULT true,
	`inAppEnabled` boolean NOT NULL DEFAULT true,
	`recipientsMode` enum('role','explicit_emails','workflow_assignees','mixed') NOT NULL DEFAULT 'role',
	`roleIds` text,
	`explicitEmails` text,
	`templateId` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_event_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_outbox` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`eventKey` varchar(100) NOT NULL,
	`channel` enum('email','inapp') NOT NULL,
	`payloadJson` text,
	`recipients` text,
	`subject` varchar(500),
	`status` enum('queued','sending','sent','failed','dead_letter') NOT NULL DEFAULT 'queued',
	`attemptCount` int NOT NULL DEFAULT 0,
	`lastError` text,
	`nextRetryAt` timestamp,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_outbox_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `email_provider_settings` ADD CONSTRAINT `email_provider_settings_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_event_settings` ADD CONSTRAINT `notification_event_settings_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_outbox` ADD CONSTRAINT `notification_outbox_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_notification_event_org` ON `notification_event_settings` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_notification_event_key` ON `notification_event_settings` (`eventKey`);--> statement-breakpoint
CREATE INDEX `idx_outbox_org` ON `notification_outbox` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_outbox_status` ON `notification_outbox` (`status`);--> statement-breakpoint
CREATE INDEX `idx_outbox_event` ON `notification_outbox` (`eventKey`);