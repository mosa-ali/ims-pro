CREATE TABLE `vendor_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendorId` int NOT NULL,
	`organizationId` int NOT NULL,
	`documentType` enum('registration_certificate','tax_certificate','bank_statement','insurance_certificate','quality_certification','framework_agreement','contract','compliance_document','other') NOT NULL,
	`documentName` varchar(255) NOT NULL,
	`documentNumber` varchar(100),
	`documentUrl` varchar(500),
	`issueDate` date,
	`expiryDate` date,
	`isExpired` boolean DEFAULT false,
	`isVerified` boolean DEFAULT false,
	`verifiedBy` int,
	`verifiedAt` timestamp,
	`notes` text,
	`uploadedBy` int,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vendor_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendor_participation_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendorId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`participationType` enum('rfq','tender','quotation','bid') NOT NULL,
	`purchaseRequestId` int,
	`quotationAnalysisId` int,
	`bidAnalysisId` int,
	`submissionDate` timestamp,
	`submissionStatus` enum('invited','submitted','withdrawn','disqualified') DEFAULT 'invited',
	`technicalScore` decimal(5,2),
	`financialScore` decimal(5,2),
	`totalScore` decimal(5,2),
	`ranking` int,
	`isWinner` boolean DEFAULT false,
	`awardedContractValue` decimal(15,2),
	`currency` varchar(10) DEFAULT 'USD',
	`evaluationNotes` text,
	`disqualificationReason` text,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vendor_participation_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendor_performance_evaluations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendorId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`evaluationDate` timestamp NOT NULL,
	`evaluationPeriodStart` timestamp,
	`evaluationPeriodEnd` timestamp,
	`qualityScore` decimal(5,2),
	`deliveryScore` decimal(5,2),
	`complianceScore` decimal(5,2),
	`communicationScore` decimal(5,2),
	`overallScore` decimal(5,2),
	`totalOrdersInPeriod` int DEFAULT 0,
	`onTimeDeliveries` int DEFAULT 0,
	`lateDeliveries` int DEFAULT 0,
	`qualityIssues` int DEFAULT 0,
	`strengths` text,
	`weaknesses` text,
	`recommendations` text,
	`evaluatedBy` int,
	`approvedBy` int,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vendor_performance_evaluations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `vendors` ADD `blacklistDate` timestamp;--> statement-breakpoint
ALTER TABLE `vendors` ADD `legalName` varchar(255);--> statement-breakpoint
ALTER TABLE `vendors` ADD `legalNameAr` varchar(255);--> statement-breakpoint
ALTER TABLE `vendors` ADD `tradeName` varchar(255);--> statement-breakpoint
ALTER TABLE `vendors` ADD `sanctionsScreened` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `vendors` ADD `sanctionsScreenedDate` timestamp;--> statement-breakpoint
ALTER TABLE `vendors` ADD `sanctionsScreenedBy` int;--> statement-breakpoint
ALTER TABLE `vendors` ADD `hasFrameworkAgreement` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `vendors` ADD `frameworkAgreementExpiry` timestamp;--> statement-breakpoint
ALTER TABLE `vendors` ADD `frameworkAgreementReference` varchar(100);--> statement-breakpoint
ALTER TABLE `vendors` ADD `performanceRating` decimal(5,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `vendors` ADD `totalPRParticipations` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `vendors` ADD `totalContractsAwarded` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `vendors` ADD `totalContractsValue` decimal(15,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `vendors` ADD `totalPurchaseOrders` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `vendors` ADD `totalPurchaseOrdersValue` decimal(15,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `vendors` ADD `onTimeDeliveryRate` decimal(5,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `vendors` ADD `qualityRating` decimal(5,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `vendors` ADD `lastEvaluationDate` timestamp;--> statement-breakpoint
ALTER TABLE `vendors` ADD `lastEvaluationScore` decimal(5,2);--> statement-breakpoint
ALTER TABLE `vendors` ADD `procurementCategories` json;--> statement-breakpoint
ALTER TABLE `vendors` ADD `primaryCategory` varchar(100);--> statement-breakpoint
ALTER TABLE `vendors` ADD `riskLevel` enum('low','medium','high','critical') DEFAULT 'low';--> statement-breakpoint
ALTER TABLE `vendors` ADD `riskFlags` json;--> statement-breakpoint
ALTER TABLE `vendors` ADD `complianceStatus` enum('compliant','pending','non_compliant','under_review') DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `vendors` ADD `lastComplianceCheck` timestamp;--> statement-breakpoint
ALTER TABLE `vendors` ADD `isFinanciallyActive` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `vendors` ADD `financialActivationDate` timestamp;--> statement-breakpoint
ALTER TABLE `vendors` ADD `financialActivatedBy` int;--> statement-breakpoint
ALTER TABLE `vendors` ADD `approvalStatus` enum('draft','pending_approval','approved','rejected') DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `vendors` ADD `approvedBy` int;--> statement-breakpoint
ALTER TABLE `vendors` ADD `approvedAt` timestamp;--> statement-breakpoint
ALTER TABLE `vendors` ADD `sourceModule` enum('finance','procurement','logistics','manual') DEFAULT 'manual';--> statement-breakpoint
ALTER TABLE `vendors` ADD `sourceReferenceId` int;--> statement-breakpoint
ALTER TABLE `vendors` ADD `sourceReferenceType` varchar(50);--> statement-breakpoint
ALTER TABLE `vendor_documents` ADD CONSTRAINT `vendor_documents_vendorId_vendors_id_fk` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_documents` ADD CONSTRAINT `vendor_documents_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_documents` ADD CONSTRAINT `vendor_documents_verifiedBy_users_id_fk` FOREIGN KEY (`verifiedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_documents` ADD CONSTRAINT `vendor_documents_uploadedBy_users_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_participation_history` ADD CONSTRAINT `vendor_participation_history_vendorId_vendors_id_fk` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_participation_history` ADD CONSTRAINT `vendor_participation_history_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_participation_history` ADD CONSTRAINT `vendor_participation_history_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_participation_history` ADD CONSTRAINT `vendor_participation_history_purchaseRequestId_purchase_requests_id_fk` FOREIGN KEY (`purchaseRequestId`) REFERENCES `purchase_requests`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_performance_evaluations` ADD CONSTRAINT `vendor_performance_evaluations_vendorId_vendors_id_fk` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_performance_evaluations` ADD CONSTRAINT `vendor_performance_evaluations_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_performance_evaluations` ADD CONSTRAINT `vendor_performance_evaluations_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_performance_evaluations` ADD CONSTRAINT `vendor_performance_evaluations_evaluatedBy_users_id_fk` FOREIGN KEY (`evaluatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_performance_evaluations` ADD CONSTRAINT `vendor_performance_evaluations_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;