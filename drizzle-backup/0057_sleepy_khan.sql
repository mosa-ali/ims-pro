CREATE TABLE `bid_opening_minutes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`purchaseRequestId` int NOT NULL,
	`bidAnalysisId` int,
	`minutesNumber` varchar(50) NOT NULL,
	`openingDate` timestamp NOT NULL,
	`openingLocation` varchar(255),
	`chairpersonId` int,
	`chairpersonName` varchar(255),
	`member1Id` int,
	`member1Name` varchar(255),
	`member2Id` int,
	`member2Name` varchar(255),
	`member3Id` int,
	`member3Name` varchar(255),
	`totalBidsReceived` int DEFAULT 0,
	`bidsOpenedCount` int DEFAULT 0,
	`openingNotes` text,
	`irregularities` text,
	`status` enum('draft','finalized','approved') NOT NULL DEFAULT 'draft',
	`finalizedAt` timestamp,
	`finalizedBy` int,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `bid_opening_minutes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `procurement_number_sequences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int NOT NULL,
	`documentType` enum('PR','RFQ','PO','GRN','BA','QA') NOT NULL,
	`year` int NOT NULL,
	`currentSequence` int NOT NULL DEFAULT 0,
	`lastGeneratedNumber` varchar(50),
	`lastGeneratedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `procurement_number_sequences_id` PRIMARY KEY(`id`),
	CONSTRAINT `procurement_seq_unique` UNIQUE(`organizationId`,`operatingUnitId`,`documentType`,`year`)
);
--> statement-breakpoint
CREATE TABLE `procurement_workflow_tracker` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`purchaseRequestId` int NOT NULL,
	`prStatus` enum('pending','in_progress','completed','skipped') NOT NULL DEFAULT 'pending',
	`prCompletedAt` timestamp,
	`prCompletedBy` int,
	`prNotes` text,
	`rfqStatus` enum('pending','in_progress','completed','skipped') NOT NULL DEFAULT 'pending',
	`rfqCompletedAt` timestamp,
	`rfqCompletedBy` int,
	`rfqNotes` text,
	`evaluationStatus` enum('pending','in_progress','completed','skipped') NOT NULL DEFAULT 'pending',
	`evaluationCompletedAt` timestamp,
	`evaluationCompletedBy` int,
	`evaluationNotes` text,
	`poStatus` enum('pending','in_progress','completed','skipped') NOT NULL DEFAULT 'pending',
	`poCompletedAt` timestamp,
	`poCompletedBy` int,
	`poNotes` text,
	`grnStatus` enum('pending','in_progress','completed','skipped') NOT NULL DEFAULT 'pending',
	`grnCompletedAt` timestamp,
	`grnCompletedBy` int,
	`grnNotes` text,
	`paymentStatus` enum('pending','in_progress','completed','skipped') NOT NULL DEFAULT 'pending',
	`paymentCompletedAt` timestamp,
	`paymentCompletedBy` int,
	`paymentNotes` text,
	`closureStatus` enum('pending','in_progress','completed','skipped') NOT NULL DEFAULT 'pending',
	`closureCompletedAt` timestamp,
	`closureCompletedBy` int,
	`closureNotes` text,
	`overallStatus` enum('not_started','in_progress','completed','cancelled') NOT NULL DEFAULT 'not_started',
	`workspaceActivated` boolean NOT NULL DEFAULT false,
	`workspaceActivatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `procurement_workflow_tracker_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rfq_vendors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`purchaseRequestId` int NOT NULL,
	`quotationAnalysisId` int,
	`supplierId` int NOT NULL,
	`invitationSentDate` timestamp,
	`invitationMethod` enum('email','portal','hand_delivery','mail') DEFAULT 'email',
	`submissionDate` timestamp,
	`submissionMethod` enum('email','portal','hand_delivery','mail'),
	`quotedAmount` decimal(15,2),
	`currency` varchar(10) DEFAULT 'USD',
	`deliveryDays` int,
	`warrantyMonths` int,
	`invitationStatus` enum('invited','declined','no_response') NOT NULL DEFAULT 'invited',
	`submissionStatus` enum('pending','submitted','late','withdrawn') NOT NULL DEFAULT 'pending',
	`quotationAttachment` text,
	`notes` text,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `rfq_vendors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `bid_opening_minutes` ADD CONSTRAINT `bid_opening_minutes_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_opening_minutes` ADD CONSTRAINT `bid_opening_minutes_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_opening_minutes` ADD CONSTRAINT `bid_opening_minutes_purchaseRequestId_purchase_requests_id_fk` FOREIGN KEY (`purchaseRequestId`) REFERENCES `purchase_requests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_opening_minutes` ADD CONSTRAINT `bid_opening_minutes_bidAnalysisId_bid_analyses_id_fk` FOREIGN KEY (`bidAnalysisId`) REFERENCES `bid_analyses`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_opening_minutes` ADD CONSTRAINT `bid_opening_minutes_chairpersonId_users_id_fk` FOREIGN KEY (`chairpersonId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_opening_minutes` ADD CONSTRAINT `bid_opening_minutes_member1Id_users_id_fk` FOREIGN KEY (`member1Id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_opening_minutes` ADD CONSTRAINT `bid_opening_minutes_member2Id_users_id_fk` FOREIGN KEY (`member2Id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_opening_minutes` ADD CONSTRAINT `bid_opening_minutes_member3Id_users_id_fk` FOREIGN KEY (`member3Id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_opening_minutes` ADD CONSTRAINT `bid_opening_minutes_finalizedBy_users_id_fk` FOREIGN KEY (`finalizedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_opening_minutes` ADD CONSTRAINT `bid_opening_minutes_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_opening_minutes` ADD CONSTRAINT `bid_opening_minutes_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_opening_minutes` ADD CONSTRAINT `bid_opening_minutes_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `procurement_number_sequences` ADD CONSTRAINT `procurement_number_sequences_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `procurement_number_sequences` ADD CONSTRAINT `procurement_number_sequences_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `procurement_workflow_tracker` ADD CONSTRAINT `procurement_workflow_tracker_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `procurement_workflow_tracker` ADD CONSTRAINT `procurement_workflow_tracker_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `procurement_workflow_tracker` ADD CONSTRAINT `procurement_workflow_tracker_purchaseRequestId_purchase_requests_id_fk` FOREIGN KEY (`purchaseRequestId`) REFERENCES `purchase_requests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `procurement_workflow_tracker` ADD CONSTRAINT `procurement_workflow_tracker_prCompletedBy_users_id_fk` FOREIGN KEY (`prCompletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `procurement_workflow_tracker` ADD CONSTRAINT `procurement_workflow_tracker_rfqCompletedBy_users_id_fk` FOREIGN KEY (`rfqCompletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `procurement_workflow_tracker` ADD CONSTRAINT `procurement_workflow_tracker_evaluationCompletedBy_users_id_fk` FOREIGN KEY (`evaluationCompletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `procurement_workflow_tracker` ADD CONSTRAINT `procurement_workflow_tracker_poCompletedBy_users_id_fk` FOREIGN KEY (`poCompletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `procurement_workflow_tracker` ADD CONSTRAINT `procurement_workflow_tracker_grnCompletedBy_users_id_fk` FOREIGN KEY (`grnCompletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `procurement_workflow_tracker` ADD CONSTRAINT `procurement_workflow_tracker_paymentCompletedBy_users_id_fk` FOREIGN KEY (`paymentCompletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `procurement_workflow_tracker` ADD CONSTRAINT `procurement_workflow_tracker_closureCompletedBy_users_id_fk` FOREIGN KEY (`closureCompletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `procurement_workflow_tracker` ADD CONSTRAINT `procurement_workflow_tracker_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `procurement_workflow_tracker` ADD CONSTRAINT `procurement_workflow_tracker_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rfq_vendors` ADD CONSTRAINT `rfq_vendors_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rfq_vendors` ADD CONSTRAINT `rfq_vendors_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rfq_vendors` ADD CONSTRAINT `rfq_vendors_purchaseRequestId_purchase_requests_id_fk` FOREIGN KEY (`purchaseRequestId`) REFERENCES `purchase_requests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rfq_vendors` ADD CONSTRAINT `rfq_vendors_quotationAnalysisId_quotation_analyses_id_fk` FOREIGN KEY (`quotationAnalysisId`) REFERENCES `quotation_analyses`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rfq_vendors` ADD CONSTRAINT `rfq_vendors_supplierId_suppliers_id_fk` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rfq_vendors` ADD CONSTRAINT `rfq_vendors_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rfq_vendors` ADD CONSTRAINT `rfq_vendors_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rfq_vendors` ADD CONSTRAINT `rfq_vendors_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;