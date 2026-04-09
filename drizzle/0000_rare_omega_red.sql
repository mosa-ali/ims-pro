CREATE TABLE `account_recovery_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`organizationId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`recoveryMethod` enum('backup_code','email','support') NOT NULL,
	`recoveryToken` varchar(255) NOT NULL,
	`backupCodeUsed` varchar(255),
	`status` enum('pending','verified','completed','failed','expired') NOT NULL DEFAULT 'pending',
	`attemptCount` int NOT NULL DEFAULT 0,
	`maxAttempts` int NOT NULL DEFAULT 3,
	`expiresAt` timestamp NOT NULL,
	`verifiedAt` timestamp,
	`completedAt` timestamp,
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `account_recovery_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `account_recovery_requests_recoveryToken_unique` UNIQUE(`recoveryToken`)
);
--> statement-breakpoint
CREATE TABLE `activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`activityCode` varchar(50) NOT NULL,
	`activityName` text NOT NULL,
	`activityNameAr` text,
	`description` text,
	`descriptionAr` text,
	`plannedStartDate` date NOT NULL,
	`plannedEndDate` date NOT NULL,
	`actualStartDate` date,
	`actualEndDate` date,
	`status` enum('NOT_STARTED','IN_PROGRESS','COMPLETED','ON_HOLD','CANCELLED') NOT NULL DEFAULT 'NOT_STARTED',
	`progressPercentage` decimal(5,2) NOT NULL DEFAULT '0.00',
	`target` decimal(15,2),
	`unitType` varchar(100),
	`achievedValue` decimal(15,2) DEFAULT '0.00',
	`budgetAllocated` decimal(15,2) NOT NULL DEFAULT '0.00',
	`actualSpent` decimal(15,2) NOT NULL DEFAULT '0.00',
	`currency` enum('USD','EUR','GBP','CHF') NOT NULL DEFAULT 'USD',
	`location` varchar(255),
	`locationAr` varchar(255),
	`responsiblePerson` varchar(255),
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `allocation_bases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`allocationPeriodId` int NOT NULL,
	`projectId` int NOT NULL,
	`allocationKeyId` int NOT NULL,
	`basisValue` decimal(15,2) NOT NULL DEFAULT '0.00',
	`basisPercentage` decimal(5,2) NOT NULL DEFAULT '0.00',
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `allocation_bases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `allocation_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`keyCode` varchar(50) NOT NULL,
	`keyName` varchar(255) NOT NULL,
	`keyNameAr` varchar(255),
	`keyType` enum('headcount','budget_percentage','direct_costs','custom','equal','revenue') DEFAULT 'budget_percentage',
	`description` text,
	`descriptionAr` text,
	`isActive` tinyint DEFAULT 1,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` varchar(255),
	`updatedBy` varchar(255),
	CONSTRAINT `allocation_keys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `allocation_periods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`periodCode` varchar(50) NOT NULL,
	`periodName` varchar(255) NOT NULL,
	`periodNameAr` varchar(255),
	`periodType` enum('monthly','quarterly','annual','custom') DEFAULT 'monthly',
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`fiscalYearId` int,
	`fiscalPeriodId` int,
	`status` enum('draft','in_progress','completed','reversed') DEFAULT 'draft',
	`executedAt` timestamp,
	`executedBy` varchar(255),
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` varchar(255),
	`updatedBy` varchar(255),
	CONSTRAINT `allocation_periods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `allocation_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`allocationPeriodId` int NOT NULL,
	`costPoolId` int NOT NULL,
	`projectId` int NOT NULL,
	`allocationKeyId` int NOT NULL,
	`totalPoolAmount` decimal(15,2) NOT NULL DEFAULT '0.00',
	`allocationPercentage` decimal(5,2) NOT NULL DEFAULT '0.00',
	`allocatedAmount` decimal(15,2) NOT NULL DEFAULT '0.00',
	`journalEntryId` int,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `allocation_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `allocation_reversals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`allocationPeriodId` int NOT NULL,
	`reversalDate` date NOT NULL,
	`reversalReason` text,
	`reversalReasonAr` text,
	`originalJournalEntryIds` text,
	`reversalJournalEntryIds` text,
	`totalReversedAmount` decimal(15,2) DEFAULT '0.00',
	`reversedAt` timestamp DEFAULT (now()),
	`reversedBy` int,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `allocation_reversals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `allocation_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`costPoolId` int NOT NULL,
	`allocationKeyId` int NOT NULL,
	`effectiveFrom` date NOT NULL,
	`effectiveTo` date,
	`isActive` tinyint DEFAULT 1,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` varchar(255),
	`updatedBy` varchar(255),
	CONSTRAINT `allocation_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `allocation_template_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`templateId` int NOT NULL,
	`costPoolId` int NOT NULL,
	`allocationKeyId` int NOT NULL,
	`priority` int DEFAULT 1,
	`isActive` tinyint DEFAULT 1,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `allocation_template_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `allocation_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`templateCode` varchar(50) NOT NULL,
	`templateName` varchar(255) NOT NULL,
	`templateNameAr` varchar(255),
	`description` text,
	`descriptionAr` text,
	`periodType` enum('monthly','quarterly','annual','custom') DEFAULT 'monthly',
	`isActive` tinyint DEFAULT 1,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `allocation_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `asset_depreciation_schedule` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`assetId` int NOT NULL,
	`fiscalYearId` int,
	`fiscalPeriodId` int,
	`periodDate` date NOT NULL,
	`periodNumber` int NOT NULL,
	`openingBookValue` decimal(15,2) NOT NULL,
	`depreciationAmount` decimal(15,2) NOT NULL,
	`accumulatedDepreciation` decimal(15,2) NOT NULL,
	`closingBookValue` decimal(15,2) NOT NULL,
	`depreciationMethod` enum('straight_line','declining_balance','units_of_production') DEFAULT 'straight_line',
	`isPosted` tinyint DEFAULT 0,
	`journalEntryId` int,
	`postedAt` timestamp,
	`postedBy` int,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `asset_depreciation_schedule_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_log_export_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleId` int,
	`exportDate` bigint NOT NULL,
	`recordCount` int NOT NULL,
	`filePath` text NOT NULL,
	`fileSize` bigint NOT NULL,
	`recipients` text NOT NULL,
	`status` enum('pending','completed','failed') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`triggeredBy` int,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `audit_log_export_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_log_export_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleName` varchar(255) NOT NULL,
	`frequency` enum('weekly','monthly') NOT NULL,
	`dayOfExecution` int NOT NULL,
	`recipients` text NOT NULL,
	`lastRunAt` bigint,
	`nextRunAt` bigint NOT NULL,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdBy` int,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `audit_log_export_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`organizationId` int,
	`operatingUnitId` int,
	`action` varchar(100) NOT NULL,
	`entityType` varchar(100),
	`entityId` int,
	`details` text,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bank_reconciliations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`bankAccountId` int NOT NULL,
	`reconciliationNumber` varchar(50) NOT NULL,
	`reconciliationDate` date NOT NULL,
	`statementDate` date NOT NULL,
	`statementBalance` decimal(15,2) NOT NULL,
	`bookBalance` decimal(15,2) NOT NULL,
	`adjustedBookBalance` decimal(15,2),
	`outstandingDeposits` decimal(15,2) DEFAULT '0.00',
	`outstandingCheques` decimal(15,2) DEFAULT '0.00',
	`difference` decimal(15,2) DEFAULT '0.00',
	`status` enum('draft','in_progress','completed','approved') DEFAULT 'draft',
	`notes` text,
	`completedAt` timestamp,
	`completedBy` int,
	`approvedAt` timestamp,
	`approvedBy` int,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `bank_reconciliations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bank_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`bankAccountId` int NOT NULL,
	`transactionDate` date NOT NULL,
	`valueDate` date,
	`transactionType` enum('credit','debit') NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`currencyId` int,
	`exchangeRate` decimal(15,6) DEFAULT '1.000000',
	`amountInBaseCurrency` decimal(15,2),
	`reference` varchar(255),
	`description` text,
	`descriptionAr` text,
	`counterpartyName` varchar(255),
	`counterpartyAccount` varchar(100),
	`statementReference` varchar(100),
	`importBatchId` int,
	`isReconciled` tinyint DEFAULT 0,
	`reconciledAt` timestamp,
	`reconciledBy` int,
	`reconciliationId` int,
	`matchedTransactionType` varchar(50),
	`matchedTransactionId` int,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `bank_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `beneficiaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`fullName` varchar(255) NOT NULL,
	`fullNameAr` varchar(255),
	`dateOfBirth` date,
	`identificationType` enum('ID_CARD','PASSPORT','FAMILY_CARD','OTHER'),
	`identificationTypeOther` varchar(255),
	`identificationNumber` varchar(100),
	`identificationAttachment` varchar(500),
	`gender` enum('MALE','FEMALE','OTHER') NOT NULL,
	`ageGroup` enum('0-5','6-12','13-17','18-35','36-60','60+'),
	`nationality` varchar(100),
	`phoneNumber` varchar(50),
	`email` varchar(320),
	`country` varchar(100),
	`governorate` varchar(255),
	`district` varchar(255),
	`village` varchar(255),
	`address` text,
	`addressAr` text,
	`communityType` enum('IDP','REFUGEE','HOST_COMMUNITY','RETURNEE','OTHER'),
	`communityTypeOther` varchar(255),
	`householdSize` int,
	`dependents` int,
	`vulnerabilityCategory` varchar(255),
	`vulnerabilityOther` varchar(255),
	`disabilityStatus` tinyint NOT NULL DEFAULT 0,
	`disabilityType` varchar(255),
	`activityId` int,
	`serviceType` enum('TRAINING','WORKSHOP','ITEMS_DISTRIBUTION','PSS','OTHER'),
	`serviceTypeOther` varchar(255),
	`serviceStatus` enum('REGISTERED','ACTIVE','COMPLETED','SUSPENDED') NOT NULL DEFAULT 'REGISTERED',
	`registrationDate` date NOT NULL,
	`verificationStatus` enum('VERIFIED','NOT_ELIGIBLE','PENDING') DEFAULT 'PENDING',
	`verifiedBy` varchar(255),
	`verificationDate` date,
	`notes` text,
	`notesAr` text,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `beneficiaries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bid_analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`purchaseRequestId` int,
	`cbaNumber` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`titleAr` varchar(255),
	`tenderDate` timestamp,
	`closingDate` timestamp,
	`openingDate` timestamp,
	`evaluationMethod` enum('lowest_price','best_value','quality_cost_based') DEFAULT 'lowest_price',
	`technicalWeight` decimal(5,2) DEFAULT '70',
	`financialWeight` decimal(5,2) DEFAULT '30',
	`minimumTechnicalScore` decimal(5,2) DEFAULT '70',
	`selectedBidderId` int,
	`selectionJustification` text,
	`status` enum('draft','published','bids_received','technical_evaluation','financial_evaluation','awarded','cancelled') NOT NULL DEFAULT 'draft',
	`approvedBy` int,
	`approvedAt` timestamp,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`announcementStartDate` timestamp,
	`announcementEndDate` timestamp,
	`announcementChannel` enum('website','newspaper','donor_portal','other'),
	`announcementLink` text,
	`announcementReference` varchar(100),
	`numberOfBidders` int DEFAULT 0,
	`bomMeetingDate` varchar(50),
	`bomMeetingTime` varchar(50),
	`bomLocation` varchar(255),
	`bomAttendees` text,
	`bomNotes` text,
	`bomSignatures` text,
	`bomCompleted` tinyint DEFAULT 0,
	`scoringLockedAt` timestamp,
	`scoringLockedBy` int,
	`cbaFinalizedAt` timestamp,
	`cbaFinalizedBy` int,
	CONSTRAINT `bid_analyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bid_analysis_bidders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bidAnalysisId` int NOT NULL,
	`organizationId` int NOT NULL DEFAULT 30002,
	`operatingUnitId` int NOT NULL DEFAULT 30002,
	`supplierId` int,
	`bidderName` varchar(255),
	`submissionDate` timestamp,
	`submissionStatus` enum('received','valid','disqualified') DEFAULT 'received',
	`bidReference` varchar(100),
	`bidDate` timestamp,
	`totalBidAmount` decimal(15,2) DEFAULT '0',
	`currency` varchar(10) DEFAULT 'USD',
	`technicalScore` decimal(5,2),
	`financialScore` decimal(5,2),
	`combinedScore` decimal(5,2),
	`rank` int,
	`isResponsive` tinyint DEFAULT 1,
	`nonResponsiveReason` text,
	`isSelected` tinyint DEFAULT 0,
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`bidReceiptAcknowledgementPrinted` tinyint DEFAULT 0,
	`acknowledgementPrintedAt` timestamp,
	`acknowledgementPrintedBy` int,
	`bidReceiptAcknowledgementRef` varchar(100),
	`bidReceiptAcknowledgementGeneratedAt` timestamp,
	CONSTRAINT `bid_analysis_bidders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bid_analysis_line_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bidAnalysisId` int NOT NULL,
	`bidderId` int NOT NULL,
	`prLineItemId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`unitPrice` decimal(15,2) NOT NULL DEFAULT '0',
	`lineTotal` decimal(15,2) NOT NULL DEFAULT '0',
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bid_analysis_line_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bid_evaluation_criteria` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bidAnalysisId` int NOT NULL,
	`criteriaType` enum('technical','financial') NOT NULL DEFAULT 'technical',
	`name` varchar(255) NOT NULL,
	`nameAr` varchar(255),
	`description` text,
	`maxScore` decimal(5,2) NOT NULL,
	`weight` decimal(5,2) DEFAULT '1',
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`sectionNumber` int DEFAULT 1,
	`sectionName` varchar(255),
	`sectionNameAr` varchar(255),
	`stage` varchar(255) DEFAULT 'MUST be Submitted with the Bid',
	`stageAr` varchar(255),
	`isScreening` tinyint DEFAULT 0,
	`isApplicable` tinyint DEFAULT 1,
	`requirementLabel` text,
	`requirementLabelAr` text,
	`detailsText` text,
	`detailsTextAr` text,
	`isMandatoryHardStop` tinyint DEFAULT 0,
	`isConditional` tinyint DEFAULT 0,
	`optionGroup` varchar(100),
	CONSTRAINT `bid_evaluation_criteria_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bid_evaluation_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bidAnalysisId` int NOT NULL,
	`criterionId` int NOT NULL,
	`bidderId` int NOT NULL,
	`score` decimal(5,2) DEFAULT '0',
	`status` enum('scored','none','na','not_yet_completed') DEFAULT 'scored',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bid_evaluation_scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bid_opening_minutes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`purchaseRequestId` int NOT NULL,
	`bidAnalysisId` int,
	`minutesNumber` varchar(50) NOT NULL,
	`openingDate` timestamp NOT NULL,
	`openingTime` varchar(10),
	`openingVenue` varchar(255),
	`openingMode` enum('physical','online','hybrid') DEFAULT 'physical',
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
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`approvedAt` timestamp,
	`approvedBy` int,
	`approverComments` text,
	`pdfFileUrl` varchar(500),
	CONSTRAINT `bid_opening_minutes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bidder_acknowledgement_signatures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bid_analysis_id` int NOT NULL,
	`bidder_id` int NOT NULL,
	`organization_id` int NOT NULL,
	`operating_unit_id` int,
	`signer_name` varchar(255) NOT NULL,
	`signer_title` varchar(255),
	`signature_image_url` text NOT NULL,
	`signature_data_url` text,
	`signed_at` timestamp NOT NULL,
	`signed_by_user_id` int,
	`verification_code` varchar(100) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bidder_acknowledgement_signatures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blacklist_workflow_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`stages` text NOT NULL,
	`requireSubmitterSignature` tinyint NOT NULL DEFAULT 1,
	`requireApproverSignature` tinyint NOT NULL DEFAULT 1,
	`autoExpiryEnabled` tinyint NOT NULL DEFAULT 1,
	`defaultDurationMonths` int NOT NULL DEFAULT 6,
	`notifyOnSubmission` tinyint NOT NULL DEFAULT 1,
	`notifyOnApproval` tinyint NOT NULL DEFAULT 1,
	`notifyOnRejection` tinyint NOT NULL DEFAULT 1,
	`notifyOnExpiry` tinyint NOT NULL DEFAULT 1,
	`createdBy` int,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `blacklist_workflow_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bom_approval_signatures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bomId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`sortOrder` int NOT NULL DEFAULT 1,
	`role` varchar(255),
	`roleAr` varchar(255),
	`memberName` varchar(255),
	`signatureDataUrl` text,
	`signedAt` timestamp,
	`signedByUserId` int,
	`verificationCode` varchar(100),
	`qrCodeDataUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bom_approval_signatures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `budget_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`activityId` int,
	`fiscalYear` varchar(20),
	`budgetCode` varchar(100) NOT NULL,
	`subBl` varchar(100),
	`subBudgetLine` varchar(100),
	`activityName` text,
	`budgetItem` text NOT NULL,
	`category` varchar(255),
	`quantity` decimal(15,2) NOT NULL,
	`unitType` varchar(100),
	`unitCost` decimal(15,2) NOT NULL,
	`recurrence` int NOT NULL DEFAULT 1,
	`totalBudgetLine` decimal(15,2) NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'USD',
	`actualSpent` decimal(15,2) NOT NULL DEFAULT '0.00',
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `budget_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `budget_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`budgetId` int NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`lineCode` varchar(100) NOT NULL,
	`lineNumber` int,
	`description` text NOT NULL,
	`descriptionAr` text,
	`categoryId` int,
	`accountId` int,
	`activityId` int,
	`unitType` enum('staff','item','service','lump_sum') NOT NULL,
	`unitCost` decimal(15,2) NOT NULL,
	`quantity` decimal(15,2) NOT NULL,
	`durationMonths` int NOT NULL DEFAULT 1,
	`totalAmount` decimal(15,2) NOT NULL,
	`donorEligibleAmount` decimal(15,2),
	`donorEligibilityPercentage` decimal(5,2) DEFAULT '100.00',
	`ineligibilityReason` text,
	`ineligibilityReasonAr` text,
	`donorMappingId` int,
	`locationId` int,
	`locationName` varchar(255),
	`implementationPeriodStart` date,
	`implementationPeriodEnd` date,
	`actualSpent` decimal(15,2) NOT NULL DEFAULT '0.00',
	`commitments` decimal(15,2) NOT NULL DEFAULT '0.00',
	`availableBalance` decimal(15,2) NOT NULL DEFAULT '0.00',
	`justification` text,
	`justificationAr` text,
	`notes` text,
	`notesAr` text,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	CONSTRAINT `budget_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `budget_monthly_allocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`budgetLineId` int NOT NULL,
	`budgetId` int NOT NULL,
	`allocationMonth` date NOT NULL,
	`monthNumber` int NOT NULL,
	`quarterNumber` int NOT NULL,
	`fiscalYear` varchar(20) NOT NULL,
	`plannedAmount` decimal(15,2) NOT NULL DEFAULT '0.00',
	`forecastAmount` decimal(15,2) NOT NULL DEFAULT '0.00',
	`actualAmount` decimal(15,2) NOT NULL DEFAULT '0.00',
	`variance` decimal(15,2) NOT NULL DEFAULT '0.00',
	`notes` text,
	`notesAr` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`organizationId` int NOT NULL DEFAULT 0,
	`operatingUnitId` int NOT NULL DEFAULT 0,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `budget_monthly_allocations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `budget_reallocation_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`reallocationId` int NOT NULL,
	`lineNumber` int NOT NULL,
	`lineType` enum('source','destination') NOT NULL,
	`projectId` int NOT NULL,
	`budgetItemId` int,
	`glAccountId` int,
	`amount` decimal(15,2) DEFAULT '0.00',
	`currency` varchar(10) DEFAULT 'USD',
	`exchangeRate` decimal(15,6) DEFAULT '1.000000',
	`baseCurrencyAmount` decimal(15,2) DEFAULT '0.00',
	`description` text,
	`descriptionAr` text,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`operatingUnitId` int NOT NULL DEFAULT 0,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `budget_reallocation_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `budget_reallocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`reallocationCode` varchar(50) NOT NULL,
	`reallocationDate` date NOT NULL,
	`description` text,
	`descriptionAr` text,
	`totalAmount` decimal(15,2) DEFAULT '0.00',
	`currency` varchar(10) DEFAULT 'USD',
	`exchangeRate` decimal(15,6) DEFAULT '1.000000',
	`baseCurrencyAmount` decimal(15,2) DEFAULT '0.00',
	`status` enum('draft','pending_approval','approved','rejected','executed','cancelled') DEFAULT 'draft',
	`justification` text,
	`justificationAr` text,
	`submittedAt` timestamp,
	`submittedBy` int,
	`approvedAt` timestamp,
	`approvedBy` int,
	`rejectedAt` timestamp,
	`rejectedBy` int,
	`rejectionReason` text,
	`rejectionReasonAr` text,
	`executedAt` timestamp,
	`executedBy` int,
	`journalEntryId` int,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`operatingUnitId` int NOT NULL DEFAULT 0,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `budget_reallocations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `budgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`grantId` int,
	`organizationId` int NOT NULL,
	`operatingUnitId` int NOT NULL,
	`budgetCode` varchar(100),
	`budgetTitle` varchar(500),
	`budgetTitleAr` varchar(500),
	`fiscalYear` varchar(20) NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'USD',
	`baseCurrency` varchar(10) NOT NULL DEFAULT 'USD',
	`exchangeRate` decimal(15,6) DEFAULT '1.000000',
	`totalApprovedAmount` decimal(15,2) NOT NULL DEFAULT '0.00',
	`totalForecastAmount` decimal(15,2) NOT NULL DEFAULT '0.00',
	`totalActualAmount` decimal(15,2) NOT NULL DEFAULT '0.00',
	`versionNumber` int NOT NULL DEFAULT 1,
	`parentBudgetId` int,
	`revisionNotes` text,
	`revisionNotesAr` text,
	`status` enum('draft','submitted','approved','revised','closed','rejected') NOT NULL DEFAULT 'draft',
	`submittedAt` timestamp,
	`submittedBy` int,
	`approvedAt` timestamp,
	`approvedBy` int,
	`rejectedAt` timestamp,
	`rejectedBy` int,
	`rejectionReason` text,
	`rejectionReasonAr` text,
	`periodStart` date NOT NULL,
	`periodEnd` date NOT NULL,
	`notes` text,
	`notesAr` text,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `budgets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `case_activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`activityType` varchar(50) NOT NULL,
	`activityDate` date NOT NULL,
	`provider` varchar(255),
	`notes` text,
	`linkedActivityId` int,
	`linkedIndicatorId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `case_activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `case_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`caseCode` varchar(50) NOT NULL,
	`beneficiaryCode` varchar(50) NOT NULL,
	`firstName` varchar(100),
	`lastName` varchar(100),
	`dateOfBirth` date,
	`gender` varchar(20),
	`age` int,
	`nationality` varchar(100),
	`idNumber` varchar(100),
	`hasDisability` tinyint DEFAULT 0,
	`location` varchar(255),
	`district` varchar(100),
	`community` varchar(100),
	`householdSize` int,
	`vulnerabilityCategory` varchar(100),
	`phoneNumber` varchar(50),
	`email` varchar(320),
	`address` text,
	`caseType` varchar(50) NOT NULL,
	`riskLevel` varchar(20) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'open',
	`openedAt` timestamp NOT NULL DEFAULT (now()),
	`closedAt` timestamp,
	`referralSource` varchar(255),
	`intakeDate` date,
	`identifiedNeeds` text,
	`riskFactors` text,
	`immediateConcerns` text,
	`informedConsentObtained` tinyint NOT NULL DEFAULT 0,
	`consentDate` date,
	`assignedPssOfficerId` int,
	`assignedCaseWorkerId` int,
	`assignedTo` varchar(255),
	`plannedInterventions` text,
	`responsiblePerson` varchar(255),
	`expectedOutcomes` text,
	`timeline` varchar(255),
	`reviewDate` date,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `case_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `case_referrals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`referralDate` date NOT NULL,
	`referralType` varchar(20) NOT NULL,
	`serviceRequired` varchar(255) NOT NULL,
	`receivingOrganization` varchar(255) NOT NULL,
	`focalPoint` varchar(255),
	`focalPointContact` varchar(255),
	`status` varchar(20) NOT NULL DEFAULT 'pending',
	`followUpDate` date,
	`feedbackReceived` tinyint DEFAULT 0,
	`feedbackNotes` text,
	`consentObtained` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `case_referrals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cba_approval_signatures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bidAnalysisId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`sortOrder` int NOT NULL DEFAULT 1,
	`role` varchar(255),
	`roleAr` varchar(255),
	`memberName` varchar(255),
	`signatureDataUrl` text,
	`signedAt` timestamp,
	`signedByUserId` int,
	`verificationCode` varchar(100),
	`qrCodeDataUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cba_approval_signatures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chart_of_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`accountCode` varchar(50) NOT NULL,
	`accountNameEn` varchar(255) NOT NULL,
	`accountNameAr` varchar(255),
	`accountType` enum('ASSET','LIABILITY','EQUITY','INCOME','EXPENSE') NOT NULL,
	`parentAccountCode` varchar(50),
	`description` text,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `chart_of_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `checklist_section_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`templateName` varchar(255) NOT NULL,
	`templateNameAr` varchar(255),
	`description` text,
	`sections` json NOT NULL,
	`isDefault` tinyint DEFAULT 0,
	`createdBy` int,
	`createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `checklist_section_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `child_safe_spaces` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`cssName` varchar(255) NOT NULL,
	`cssCode` varchar(50) NOT NULL,
	`location` varchar(255) NOT NULL,
	`operatingPartner` varchar(255),
	`capacity` int,
	`ageGroupsServed` varchar(100),
	`genderSegregation` tinyint DEFAULT 0,
	`operatingDays` varchar(100),
	`operatingHours` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `child_safe_spaces_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contract_milestones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`contractId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`amount` decimal(15,2),
	`currency` varchar(10) DEFAULT 'USD',
	`dueDate` timestamp,
	`status` enum('pending','in_progress','completed','overdue') NOT NULL DEFAULT 'pending',
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`orderIndex` int DEFAULT 0,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	CONSTRAINT `contract_milestones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contract_payment_schedule` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organization_id` int NOT NULL,
	`operating_unit_id` int,
	`contract_id` int NOT NULL,
	`payment_type` enum('advance','milestone','progress','final') NOT NULL DEFAULT 'milestone',
	`description` text NOT NULL,
	`payment_percentage` decimal(5,2) NOT NULL DEFAULT '0.00',
	`payment_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
	`linked_milestone_id` int,
	`payment_condition` enum('none','sac_required','monitoring_required','sac_and_monitoring') NOT NULL DEFAULT 'none',
	`status` enum('pending','approved','invoiced','paid') NOT NULL DEFAULT 'pending',
	`order_index` int DEFAULT 0,
	`is_deleted` tinyint NOT NULL DEFAULT 0,
	`deleted_at` timestamp,
	`deleted_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_by` int,
	`updated_by` int,
	CONSTRAINT `contract_payment_schedule_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contract_penalties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organization_id` int NOT NULL,
	`operating_unit_id` int,
	`contract_id` int NOT NULL,
	`penalty_description` text NOT NULL,
	`penalty_type` enum('delay','quality','compliance') NOT NULL DEFAULT 'delay',
	`delay_days_threshold` int DEFAULT 0,
	`penalty_percentage` decimal(5,2) NOT NULL DEFAULT '0.00',
	`penalty_base` enum('contract_value','deliverable_amount') NOT NULL DEFAULT 'contract_value',
	`linked_milestone_id` int,
	`max_penalty_limit_pct` decimal(5,2) DEFAULT '10.00',
	`calculated_amount` decimal(15,2) DEFAULT '0.00',
	`actual_delay_days` int DEFAULT 0,
	`remarks` text,
	`status` enum('draft','applied','waived') NOT NULL DEFAULT 'draft',
	`is_deleted` tinyint NOT NULL DEFAULT 0,
	`deleted_at` timestamp,
	`deleted_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_by` int,
	`updated_by` int,
	CONSTRAINT `contract_penalties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contract_retention_terms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organization_id` int NOT NULL,
	`operating_unit_id` int,
	`contract_id` int NOT NULL,
	`retention_enabled` tinyint NOT NULL DEFAULT 1,
	`retention_percentage` decimal(5,2) NOT NULL DEFAULT '0.00',
	`retention_basis` enum('contract_value','payment_stage') NOT NULL DEFAULT 'contract_value',
	`max_retention_amount` decimal(15,2) DEFAULT '0.00',
	`total_retained` decimal(15,2) DEFAULT '0.00',
	`total_released` decimal(15,2) DEFAULT '0.00',
	`release_condition` enum('final_acceptance','final_handover','defect_liability') NOT NULL DEFAULT 'final_acceptance',
	`release_type` enum('full','partial') NOT NULL DEFAULT 'full',
	`status` enum('active','partially_released','released') NOT NULL DEFAULT 'active',
	`released_at` timestamp,
	`released_by` int,
	`remarks` text,
	`is_deleted` tinyint NOT NULL DEFAULT 0,
	`deleted_at` timestamp,
	`deleted_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_by` int,
	`updated_by` int,
	CONSTRAINT `contract_retention_terms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contract_variations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`contractId` int NOT NULL,
	`variationNumber` varchar(100) NOT NULL,
	`variationType` enum('amendment','change_order','extension','reduction') NOT NULL DEFAULT 'amendment',
	`description` text NOT NULL,
	`originalValue` decimal(15,2) NOT NULL DEFAULT '0',
	`variationAmount` decimal(15,2) NOT NULL DEFAULT '0',
	`newContractValue` decimal(15,2) NOT NULL DEFAULT '0',
	`originalEndDate` timestamp,
	`newEndDate` timestamp,
	`reason` text,
	`status` enum('draft','pending_approval','approved','rejected') NOT NULL DEFAULT 'draft',
	`approvedBy` int,
	`approvedAt` timestamp,
	`rejectionReason` text,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `contract_variations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contracts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`purchaseRequestId` int NOT NULL,
	`vendorId` int NOT NULL,
	`contractNumber` varchar(100) NOT NULL,
	`contractValue` decimal(15,2) NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'USD',
	`paymentStructure` enum('lump_sum','percentage_based','fixed_amount','deliverable_based') NOT NULL,
	`retentionPercentage` decimal(5,2) DEFAULT '0',
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`signedFileUrl` text,
	`status` enum('draft','pending_approval','approved','active','completed','terminated') NOT NULL DEFAULT 'draft',
	`approvedBy` int,
	`approvedAt` timestamp,
	`signatureImageUrl` text,
	`signatureTimestamp` timestamp,
	`signatureVerificationCode` varchar(100),
	`signatureQrCodeUrl` text,
	`signerName` varchar(255),
	`signerTitle` varchar(255),
	`rejectionReason` text,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `contracts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cost_centers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`code` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`nameAr` varchar(255),
	`description` text,
	`descriptionAr` text,
	`parentId` int,
	`level` int DEFAULT 1,
	`managerId` int,
	`projectId` int,
	`grantId` int,
	`isActive` tinyint DEFAULT 1,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `cost_centers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cost_pool_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`costPoolId` int NOT NULL,
	`transactionDate` date NOT NULL,
	`amount` decimal(15,2) NOT NULL DEFAULT '0.00',
	`description` text,
	`descriptionAr` text,
	`sourceModule` enum('manual','expense','payment','journal_entry','import') DEFAULT 'manual',
	`sourceDocumentId` int,
	`sourceDocumentType` varchar(50),
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` varchar(255),
	`updatedBy` varchar(255),
	CONSTRAINT `cost_pool_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cost_pools` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`poolCode` varchar(50) NOT NULL,
	`poolName` varchar(255) NOT NULL,
	`poolNameAr` varchar(255),
	`description` text,
	`descriptionAr` text,
	`poolType` enum('overhead','shared_service','administrative','facility','other') DEFAULT 'overhead',
	`glAccountId` int,
	`isActive` tinyint DEFAULT 1,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` varchar(255),
	`updatedBy` varchar(255),
	`deletedAt` timestamp,
	`deletedBy` varchar(255),
	CONSTRAINT `cost_pools_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `css_activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cssId` int NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`activityType` varchar(50) NOT NULL,
	`activityDate` date NOT NULL,
	`facilitatorId` int,
	`facilitatorName` varchar(255),
	`participantsCount` int NOT NULL DEFAULT 0,
	`maleCount` int DEFAULT 0,
	`femaleCount` int DEFAULT 0,
	`notes` text,
	`linkedCaseId` int,
	`linkedIndicatorId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `css_activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `delivery_note_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dnId` int NOT NULL,
	`poLineItemId` int NOT NULL,
	`lineNumber` int NOT NULL,
	`deliveredQty` decimal(10,2) NOT NULL,
	`unit` varchar(50) DEFAULT 'Piece',
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `delivery_note_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `delivery_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int NOT NULL,
	`dnNumber` varchar(50) NOT NULL,
	`poId` int NOT NULL,
	`grnId` int NOT NULL,
	`vendorId` int,
	`deliveryDate` timestamp NOT NULL DEFAULT (now()),
	`status` enum('delivered') NOT NULL DEFAULT 'delivered',
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `delivery_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `document_access_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` varchar(100) NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int NOT NULL,
	`accessType` enum('view','download','print','share','export') NOT NULL,
	`accessReason` varchar(255),
	`accessReasonAr` varchar(255),
	`accessedBy` int NOT NULL,
	`accessedAt` timestamp NOT NULL DEFAULT (now()),
	`userIp` varchar(45),
	`userAgent` text,
	`deviceType` varchar(50),
	`sharedWith` int,
	`viewDurationSeconds` int,
	CONSTRAINT `document_access_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `document_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` varchar(100) NOT NULL,
	`action` enum('created','updated','viewed','downloaded','shared','deleted','restored','moved','renamed','permission_changed','classified','retention_applied','hold_applied','hold_released','exported','printed') NOT NULL,
	`actionDescription` text,
	`actionDescriptionAr` text,
	`previousValue` text,
	`newValue` text,
	`userIp` varchar(45),
	`userAgent` text,
	`performedBy` int NOT NULL,
	`performedAt` timestamp NOT NULL DEFAULT (now()),
	`organizationId` int NOT NULL,
	`operatingUnitId` int NOT NULL,
	CONSTRAINT `document_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `document_classifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` varchar(100) NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int NOT NULL,
	`classificationLevel` enum('public','internal','confidential','restricted','secret') NOT NULL DEFAULT 'internal',
	`sensitivityTags` text,
	`requiresApprovalToView` tinyint NOT NULL DEFAULT 0,
	`requiresApprovalToDownload` tinyint NOT NULL DEFAULT 0,
	`requiresApprovalToShare` tinyint NOT NULL DEFAULT 0,
	`classificationExpiryDate` timestamp,
	`autoDowngradeToPublic` tinyint NOT NULL DEFAULT 0,
	`classifiedBy` int NOT NULL,
	`classificationReason` text,
	`classificationReasonAr` text,
	`classifiedAt` timestamp NOT NULL DEFAULT (now()),
	`reclassifiedBy` int,
	`reclassifiedAt` timestamp,
	`reclassificationReason` text,
	`reclassificationReasonAr` text,
	CONSTRAINT `document_classifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `document_legal_holds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` varchar(100) NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int NOT NULL,
	`holdCode` varchar(100) NOT NULL,
	`holdReason` varchar(255) NOT NULL,
	`holdReasonAr` varchar(255),
	`description` text,
	`descriptionAr` text,
	`holdStartDate` timestamp NOT NULL DEFAULT (now()),
	`holdEndDate` timestamp,
	`holdStatus` enum('active','released','expired') NOT NULL DEFAULT 'active',
	`caseReference` varchar(255),
	`litigationParty` varchar(255),
	`createdBy` int NOT NULL,
	`releasedBy` int,
	`releasedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `document_legal_holds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `document_metadata` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` varchar(100) NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int NOT NULL,
	`title` varchar(500),
	`titleAr` varchar(500),
	`description` text,
	`descriptionAr` text,
	`author` varchar(255),
	`keywords` text,
	`tags` text,
	`customFields` json,
	`language` varchar(10) DEFAULT 'en',
	`pageCount` int,
	`wordCount` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `document_metadata_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `document_retention_policies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`policyCode` varchar(100) NOT NULL,
	`policyName` varchar(255) NOT NULL,
	`policyNameAr` varchar(255),
	`description` text,
	`descriptionAr` text,
	`retentionYears` int NOT NULL,
	`retentionMonths` int NOT NULL DEFAULT 0,
	`retentionDays` int NOT NULL DEFAULT 0,
	`disposalAction` enum('delete','archive','transfer') NOT NULL DEFAULT 'delete',
	`applicableDocumentTypes` text,
	`applicableWorkspaces` text,
	`applicableModules` text,
	`complianceRule` varchar(255),
	`complianceRuleAr` varchar(255),
	`regulatoryRequirement` text,
	`regulatoryRequirementAr` text,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdBy` int,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `document_retention_policies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `document_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` varchar(100) NOT NULL,
	`versionNumber` int NOT NULL,
	`fileName` varchar(500) NOT NULL,
	`filePath` text NOT NULL,
	`fileType` varchar(50) NOT NULL,
	`fileSize` bigint NOT NULL,
	`mimeType` varchar(100),
	`changeDescription` text,
	`changeDescriptionAr` text,
	`changeType` enum('created','updated','restored','archived') NOT NULL DEFAULT 'created',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`organizationId` int NOT NULL,
	`operatingUnitId` int NOT NULL,
	CONSTRAINT `document_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` varchar(100) NOT NULL,
	`workspace` enum('projects','meal','hr','finance','logistics','donor_crm','risk_compliance') NOT NULL DEFAULT 'projects',
	`parentFolderId` varchar(100),
	`isFolder` tinyint NOT NULL DEFAULT 0,
	`projectId` varchar(100),
	`folderCode` varchar(100) NOT NULL,
	`fileName` varchar(500) NOT NULL,
	`filePath` text NOT NULL,
	`fileType` varchar(50) NOT NULL,
	`fileSize` bigint NOT NULL,
	`uploadedBy` int NOT NULL,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	`syncSource` varchar(100) NOT NULL,
	`syncStatus` enum('synced','not_synced','pending','error') NOT NULL DEFAULT 'synced',
	`version` int NOT NULL DEFAULT 1,
	`organizationId` int NOT NULL,
	`operatingUnitId` int NOT NULL,
	`deletedAt` timestamp,
	`deletedBy` int,
	`entityType` varchar(100),
	`entityId` varchar(100),
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `donor_budget_mapping` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`internalCategoryId` int NOT NULL,
	`internalCategoryCode` varchar(50),
	`internalCategoryName` varchar(255),
	`donorId` int,
	`donorName` varchar(255),
	`donorCategoryCode` varchar(100) NOT NULL,
	`donorCategoryName` varchar(500) NOT NULL,
	`donorCategoryNameAr` varchar(500),
	`mappingRules` json,
	`donorReportingLevel` int DEFAULT 1,
	`donorSortOrder` int DEFAULT 0,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`notes` text,
	`notesAr` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `donor_budget_mapping_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `donor_communications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`donorId` int NOT NULL,
	`date` timestamp NOT NULL,
	`channel` enum('email','meeting','call','visit','letter','video_call','other') NOT NULL DEFAULT 'email',
	`subject` varchar(500) NOT NULL,
	`subjectAr` varchar(500),
	`summary` text NOT NULL,
	`summaryAr` text,
	`participants` text,
	`contactPerson` varchar(255),
	`nextActionDate` timestamp,
	`nextActionDescription` text,
	`attachments` text,
	`status` enum('completed','pending','cancelled') DEFAULT 'completed',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `donor_communications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `donor_projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`donorId` int NOT NULL,
	`projectId` int NOT NULL,
	`relationshipType` enum('primary_funder','co_funder','in_kind','technical_partner','potential','past') NOT NULL DEFAULT 'primary_funder',
	`status` enum('active','pending','completed','cancelled') NOT NULL DEFAULT 'active',
	`fundingAmount` decimal(15,2),
	`currency` varchar(10) DEFAULT 'USD',
	`fundingPercentage` decimal(5,2),
	`startDate` timestamp,
	`endDate` timestamp,
	`notes` text,
	`notesAr` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `donor_projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `donor_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`donorId` int,
	`projectId` int,
	`grantId` int,
	`reportType` enum('donor_summary','funding_history','pipeline_status','budget_vs_actual','grant_performance','communication_log','custom') NOT NULL DEFAULT 'donor_summary',
	`title` varchar(500) NOT NULL,
	`titleAr` varchar(500),
	`periodStart` timestamp,
	`periodEnd` timestamp,
	`parametersJson` text,
	`generatedByUserId` int,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`status` enum('draft','final','archived') DEFAULT 'final',
	`fileUrl` text,
	`pdfUrl` text,
	`excelUrl` text,
	`documentId` int,
	`reportDataJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `donor_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `donors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`code` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`nameAr` varchar(255),
	`type` enum('bilateral','multilateral','foundation','corporate','individual','government','ngo','other') DEFAULT 'other',
	`category` varchar(100),
	`contactPersonName` varchar(255),
	`contactPersonTitle` varchar(255),
	`email` varchar(255),
	`phone` varchar(50),
	`website` varchar(255),
	`address` text,
	`city` varchar(100),
	`country` varchar(100),
	`postalCode` varchar(20),
	`notes` text,
	`notesAr` text,
	`logoUrl` text,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `donors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `drivers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`driverCode` varchar(50) NOT NULL,
	`firstName` varchar(100),
	`lastName` varchar(100),
	`firstNameAr` varchar(100),
	`lastNameAr` varchar(100),
	`fullName` varchar(255) NOT NULL,
	`fullNameAr` varchar(255),
	`staffId` int,
	`licenseNumber` varchar(100),
	`licenseType` varchar(50),
	`licenseExpiry` date,
	`licenseExpiryDate` date,
	`licenseIssuingCountry` varchar(100),
	`phone` varchar(50),
	`email` varchar(320),
	`status` enum('active','inactive','on_leave','terminated') NOT NULL DEFAULT 'active',
	`photoUrl` text,
	`notes` text,
	`operatingUnitId` int,
	`employeeId` int,
	`organizationId` int NOT NULL,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `drivers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_dead_letter_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`outboxId` int,
	`templateKey` varchar(100) NOT NULL,
	`recipientEmail` varchar(255) NOT NULL,
	`recipientName` varchar(255),
	`subject` varchar(255) NOT NULL,
	`bodyHtml` longtext NOT NULL,
	`bodyText` longtext,
	`failureReason` text NOT NULL,
	`failureCode` varchar(50),
	`retryCount` int NOT NULL DEFAULT 0,
	`movedAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedAt` timestamp,
	`reviewedBy` int,
	`reviewNotes` text,
	`metadata` json,
	CONSTRAINT `email_dead_letter_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_delivery_status` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`outboxId` int NOT NULL,
	`provider` enum('sendgrid','mailgun','aws_ses','microsoft_365','manus_custom') NOT NULL,
	`currentStatus` enum('queued','sending','sent','delivered','bounced','complained','opened','clicked','failed') NOT NULL DEFAULT 'queued',
	`previousStatus` enum('queued','sending','sent','delivered','bounced','complained','opened','clicked','failed'),
	`bounceType` enum('hard','soft','unknown'),
	`bounceSubtype` varchar(50),
	`complaintType` enum('spam','abuse','auth_failure','not_spam'),
	`deliveredAt` timestamp,
	`openedAt` timestamp,
	`clickedAt` timestamp,
	`lastEventAt` timestamp,
	`lastEventType` varchar(50),
	`eventCount` int NOT NULL DEFAULT 0,
	`metadata` json,
	`statusChangedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_delivery_status_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_outbox` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`templateKey` varchar(100) NOT NULL,
	`recipientEmail` varchar(255) NOT NULL,
	`recipientName` varchar(255),
	`subject` varchar(255) NOT NULL,
	`bodyHtml` longtext NOT NULL,
	`bodyText` longtext,
	`status` enum('pending','sending','sent','failed','dead_letter') NOT NULL DEFAULT 'pending',
	`retryCount` int NOT NULL DEFAULT 0,
	`maxRetries` int NOT NULL DEFAULT 5,
	`lastError` text,
	`errorCode` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`sentAt` timestamp,
	`nextRetryAt` timestamp,
	`completedAt` timestamp,
	`metadata` json,
	CONSTRAINT `email_outbox_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_provider_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`provider` enum('sendgrid','mailgun','aws_ses') NOT NULL,
	`apiKey` text NOT NULL,
	`apiKeyLastRotated` timestamp,
	`mailgunDomain` varchar(255),
	`awsRegion` varchar(50),
	`awsAccessKeyId` text,
	`awsSecretAccessKey` text,
	`webhookUrl` varchar(500),
	`webhookSigningKey` text,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`isVerified` tinyint NOT NULL DEFAULT 0,
	`lastTestAt` timestamp,
	`lastTestStatus` enum('success','failed'),
	`lastTestError` text,
	`createdBy` int NOT NULL,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_provider_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
	`isConnected` tinyint NOT NULL DEFAULT 0,
	`lastSuccessfulSend` timestamp,
	`lastError` text,
	`lastTestedAt` timestamp,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdBy` int,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_provider_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_template_ab_test` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`templateId` int NOT NULL,
	`testName` varchar(255) NOT NULL,
	`testNameAr` varchar(255),
	`testDescription` text,
	`testDescriptionAr` text,
	`versionAId` int NOT NULL,
	`versionBId` int NOT NULL,
	`status` enum('draft','running','completed','cancelled') NOT NULL DEFAULT 'draft',
	`trafficSplitPercentage` decimal(5,2) NOT NULL DEFAULT '50.00',
	`startedAt` timestamp,
	`endedAt` timestamp,
	`winnerId` int,
	`winnerMetric` enum('open_rate','click_rate','conversion_rate','bounce_rate'),
	`versionASentCount` int NOT NULL DEFAULT 0,
	`versionAOpenCount` int NOT NULL DEFAULT 0,
	`versionAClickCount` int NOT NULL DEFAULT 0,
	`versionAConversionCount` int NOT NULL DEFAULT 0,
	`versionBSentCount` int NOT NULL DEFAULT 0,
	`versionBOpenCount` int NOT NULL DEFAULT 0,
	`versionBClickCount` int NOT NULL DEFAULT 0,
	`versionBConversionCount` int NOT NULL DEFAULT 0,
	`confidenceLevel` decimal(5,2),
	`pValue` decimal(10,8),
	`createdBy` int NOT NULL,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_template_ab_test_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_template_version` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`templateId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`templateKey` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`nameAr` varchar(255),
	`subject` varchar(500) NOT NULL,
	`subjectAr` varchar(500),
	`bodyHtml` longtext NOT NULL,
	`bodyHtmlAr` longtext,
	`changeDescription` text,
	`changeDescriptionAr` text,
	`isPublished` tinyint NOT NULL DEFAULT 0,
	`publishedAt` timestamp,
	`publishedBy` int,
	`isABTestVersion` tinyint NOT NULL DEFAULT 0,
	`abTestId` int,
	`trafficPercentage` decimal(5,2),
	`sentCount` int NOT NULL DEFAULT 0,
	`deliveredCount` int NOT NULL DEFAULT 0,
	`openedCount` int NOT NULL DEFAULT 0,
	`clickedCount` int NOT NULL DEFAULT 0,
	`bouncedCount` int NOT NULL DEFAULT 0,
	`complainedCount` int NOT NULL DEFAULT 0,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_template_version_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_verification_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`token` varchar(255) NOT NULL,
	`tokenType` enum('otp','magic_link') NOT NULL,
	`otp` varchar(10),
	`isVerified` tinyint NOT NULL DEFAULT 0,
	`attemptCount` int NOT NULL DEFAULT 0,
	`maxAttempts` int NOT NULL DEFAULT 5,
	`expiresAt` timestamp NOT NULL,
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`deletedAt` timestamp,
	CONSTRAINT `email_verification_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_verification_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `email_webhook_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`provider` enum('sendgrid','mailgun','aws_ses','microsoft_365','manus_custom') NOT NULL,
	`eventType` varchar(50) NOT NULL,
	`outboxId` int,
	`recipientEmail` varchar(255) NOT NULL,
	`messageId` varchar(255),
	`status` enum('processed','failed','pending') NOT NULL DEFAULT 'processed',
	`eventData` json,
	`errorMessage` text,
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_webhook_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenditures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`purchaseOrderNumber` varchar(50) NOT NULL DEFAULT '',
	`expenditureNumber` varchar(50) DEFAULT '',
	`expenditureDate` date NOT NULL,
	`vendorId` int,
	`vendorName` varchar(255) NOT NULL,
	`vendorNameAr` varchar(255),
	`expenditureType` enum('OPERATIONAL','PROJECT','ADMINISTRATIVE','TRAVEL','PROCUREMENT','OTHER') NOT NULL,
	`category` varchar(100),
	`description` text NOT NULL,
	`descriptionAr` text,
	`amount` decimal(15,2) NOT NULL,
	`currencyId` int,
	`exchangeRateId` int,
	`amountInBaseCurrency` decimal(15,2),
	`projectId` int,
	`grantId` int,
	`budgetLineId` int,
	`glAccountId` int,
	`accountCode` varchar(50),
	`journalEntryId` int,
	`postingStatus` enum('unposted','posted','reversed') DEFAULT 'unposted',
	`status` enum('DRAFT','PENDING_APPROVAL','APPROVED','REJECTED','PAID','CANCELLED') NOT NULL DEFAULT 'DRAFT',
	`submittedBy` int,
	`submittedAt` timestamp,
	`approvedBy` int,
	`approvedAt` timestamp,
	`rejectionReason` text,
	`paymentId` int,
	`paidAt` timestamp,
	`attachments` text,
	`version` int NOT NULL DEFAULT 1,
	`parentId` int,
	`revisionReason` text,
	`isLatestVersion` tinyint NOT NULL DEFAULT 1,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `expenditures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`budgetItemId` int NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`expenseDate` date NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`fiscalYear` varchar(20) NOT NULL,
	`month` int NOT NULL,
	`reference` varchar(255),
	`description` text,
	`documentUrl` text,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`approvedBy` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`grantId` int,
	`currencyId` int,
	`exchangeRateId` int,
	`amountInBaseCurrency` decimal(15,2),
	`vendorId` int,
	`payeeName` varchar(255),
	`paymentMethod` enum('cash','bank','mobile','cheque'),
	`bankAccountId` int,
	`isReimbursable` tinyint DEFAULT 0,
	`glAccountId` int,
	`journalEntryId` int,
	`postingStatus` enum('unposted','posted','reversed') DEFAULT 'unposted',
	`deletedAt` timestamp,
	`deletedBy` int,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expiry_alert_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organization_id` int NOT NULL,
	`operating_unit_id` int,
	`alert_type` enum('manual','scheduled') NOT NULL DEFAULT 'manual',
	`threshold_days` int NOT NULL DEFAULT 30,
	`near_expiry_count` int NOT NULL DEFAULT 0,
	`expired_count` int NOT NULL DEFAULT 0,
	`batch_details` text,
	`sent_by` varchar(200),
	`sent_at` bigint NOT NULL,
	`notification_sent` tinyint DEFAULT 1,
	`created_at` bigint NOT NULL,
	CONSTRAINT `expiry_alert_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `final_handover` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organization_id` int NOT NULL,
	`monitoring_id` int NOT NULL,
	`handover_date` timestamp,
	`handover_description` text,
	`received_by` varchar(255),
	`delivered_by` varchar(255),
	`defect_liability_end_date` timestamp,
	`condition_notes` text,
	`attachments_url` text,
	`status` enum('draft','submitted','approved','rejected') NOT NULL DEFAULT 'draft',
	`approved_by` int,
	`approved_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_by` int,
	`updated_by` int,
	CONSTRAINT `final_handover_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_advances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`advanceNumber` varchar(50) NOT NULL,
	`employeeId` int,
	`employeeName` varchar(255) NOT NULL,
	`employeeNameAr` varchar(255),
	`department` varchar(100),
	`advanceType` enum('TRAVEL','PROJECT','OPERATIONAL','SALARY','OTHER') NOT NULL,
	`purpose` text NOT NULL,
	`purposeAr` text,
	`requestedAmount` decimal(15,2) NOT NULL,
	`approvedAmount` decimal(15,2),
	`currency` varchar(10) NOT NULL DEFAULT 'USD',
	`requestDate` timestamp NOT NULL,
	`expectedSettlementDate` timestamp,
	`actualSettlementDate` timestamp,
	`status` enum('DRAFT','PENDING','APPROVED','REJECTED','PARTIALLY_SETTLED','FULLY_SETTLED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
	`approvedBy` int,
	`approvedAt` timestamp,
	`rejectionReason` text,
	`settledAmount` decimal(15,2) DEFAULT '0',
	`outstandingBalance` decimal(15,2),
	`projectId` int,
	`accountCode` varchar(50),
	`notes` text,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	`grantId` int,
	`currencyId` int,
	`exchangeRateId` int,
	`amountInBaseCurrency` decimal(15,2),
	`glAccountId` int,
	`journalEntryId` int,
	`postingStatus` enum('unposted','posted','reversed') DEFAULT 'unposted',
	`disbursementDate` timestamp,
	`cashAccountId` int,
	`bankAccountId` int,
	`version` int NOT NULL DEFAULT 1,
	`parentId` int,
	`revisionReason` text,
	`isLatestVersion` tinyint NOT NULL DEFAULT 1,
	CONSTRAINT `finance_advances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_approval_thresholds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`nameAr` varchar(255),
	`category` enum('expense','advance','procurement','budget_transfer','asset_disposal','payment','journal_entry') DEFAULT 'expense',
	`minAmount` decimal(15,2) DEFAULT '0.00',
	`maxAmount` decimal(15,2),
	`currency` varchar(10) DEFAULT 'USD',
	`approverRole` varchar(100),
	`approverUserId` int,
	`requiresMultipleApprovers` tinyint NOT NULL DEFAULT 0,
	`approverCount` int DEFAULT 1,
	`sequentialApproval` tinyint NOT NULL DEFAULT 0,
	`autoApproveBelow` decimal(15,2),
	`isActive` tinyint NOT NULL DEFAULT 1,
	`notes` text,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`appliesToModule` enum('expenses','advances','cash_transactions','assets','procurement','budget_revision'),
	`appliesToTransactionType` varchar(50),
	`currencyId` int,
	`isAmountInBaseCurrency` tinyint DEFAULT 1,
	`effectiveFrom` date,
	`effectiveTo` date,
	CONSTRAINT `finance_approval_thresholds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_asset_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`nameAr` varchar(255),
	`description` text,
	`parentId` int,
	`depreciationRate` decimal(5,2) DEFAULT '0.00',
	`defaultUsefulLife` int DEFAULT 5,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`assetAccountId` int,
	`accumulatedDepAccountId` int,
	`depreciationExpenseAccountId` int,
	`defaultDepreciationMethod` enum('straight_line','declining_balance','units_of_production') DEFAULT 'straight_line',
	CONSTRAINT `finance_asset_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_asset_disposals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`disposalCode` varchar(50) NOT NULL,
	`assetId` int NOT NULL,
	`disposalType` enum('sale','donation','scrap','theft','loss','transfer_out','write_off') DEFAULT 'sale',
	`proposedDate` date,
	`actualDate` date,
	`bookValue` decimal(15,2) DEFAULT '0.00',
	`proposedValue` decimal(15,2) DEFAULT '0.00',
	`actualValue` decimal(15,2) DEFAULT '0.00',
	`currency` varchar(10) DEFAULT 'USD',
	`reason` text,
	`status` enum('draft','pending_approval','approved','rejected','completed','cancelled') DEFAULT 'draft',
	`buyerInfo` text,
	`recipientInfo` text,
	`approvedBy` int,
	`approvalDate` timestamp,
	`rejectionReason` text,
	`notes` text,
	`attachments` json,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`disposalCommitteeMembers` text,
	`disposalDocumentId` int,
	`journalEntryId` int,
	`buyerVendorId` int,
	`paymentReference` varchar(100),
	CONSTRAINT `finance_asset_disposals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_asset_maintenance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assetId` int NOT NULL,
	`maintenanceType` enum('preventive','corrective','inspection','upgrade','repair') DEFAULT 'preventive',
	`description` text,
	`cost` decimal(15,2) DEFAULT '0.00',
	`currency` varchar(10) DEFAULT 'USD',
	`performedBy` varchar(255),
	`vendorName` varchar(255),
	`performedDate` date,
	`nextDueDate` date,
	`notes` text,
	`attachments` json,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`vendorId` int,
	`workOrderNumber` varchar(50),
	`documentId` int,
	`expenseId` int,
	CONSTRAINT `finance_asset_maintenance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_asset_transfers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transferCode` varchar(50) NOT NULL,
	`assetId` int NOT NULL,
	`fromLocation` varchar(255),
	`toLocation` varchar(255),
	`fromAssignee` varchar(255),
	`toAssignee` varchar(255),
	`fromAssigneeUserId` int,
	`toAssigneeUserId` int,
	`transferDate` date,
	`reason` text,
	`status` enum('pending','approved','rejected','completed','cancelled') DEFAULT 'pending',
	`approvedBy` int,
	`approvalDate` timestamp,
	`rejectionReason` text,
	`notes` text,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`fromOperatingUnitId` int,
	`toOperatingUnitId` int,
	`journalEntryId` int,
	`attachments` text,
	CONSTRAINT `finance_asset_transfers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assetCode` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`nameAr` varchar(255),
	`description` text,
	`categoryId` int,
	`subcategory` varchar(100),
	`acquisitionDate` date,
	`acquisitionCost` decimal(15,2) DEFAULT '0.00',
	`currency` varchar(10) DEFAULT 'USD',
	`depreciationMethod` enum('straight_line','declining_balance','units_of_production','none') DEFAULT 'straight_line',
	`usefulLifeYears` int DEFAULT 5,
	`salvageValue` decimal(15,2) DEFAULT '0.00',
	`accumulatedDepreciation` decimal(15,2) DEFAULT '0.00',
	`currentValue` decimal(15,2) DEFAULT '0.00',
	`status` enum('active','in_maintenance','disposed','lost','transferred','pending_disposal') DEFAULT 'active',
	`condition` enum('excellent','good','fair','poor','non_functional') DEFAULT 'good',
	`location` varchar(255),
	`assignedTo` varchar(255),
	`assignedToUserId` int,
	`donorId` int,
	`donorName` varchar(255),
	`grantId` int,
	`grantCode` varchar(100),
	`projectId` int,
	`serialNumber` varchar(100),
	`manufacturer` varchar(255),
	`model` varchar(255),
	`warrantyExpiry` date,
	`lastMaintenanceDate` date,
	`nextMaintenanceDate` date,
	`disposalDate` date,
	`disposalMethod` enum('sale','donation','scrap','theft','loss','transfer'),
	`disposalValue` decimal(15,2),
	`disposalReason` text,
	`disposalApprovedBy` int,
	`insurancePolicy` varchar(100),
	`insuranceExpiry` date,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`assetTag` varchar(50),
	`purchaseOrderId` int,
	`invoiceId` int,
	`supplierId` int,
	`assetGlAccountCode` varchar(50),
	`depreciationExpenseGlAccountCode` varchar(50),
	`accumulatedDepreciationGlAccountCode` varchar(50),
	CONSTRAINT `finance_assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_bank_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`accountNumber` varchar(50) NOT NULL,
	`accountName` varchar(255) NOT NULL,
	`accountNameAr` varchar(255),
	`bankName` varchar(255) NOT NULL,
	`bankNameAr` varchar(255),
	`bankCode` varchar(50),
	`branchName` varchar(255),
	`branchCode` varchar(50),
	`accountType` enum('CHECKING','SAVINGS','MONEY_MARKET','PETTY_CASH','SAFE') NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'USD',
	`openingBalance` decimal(15,2) NOT NULL DEFAULT '0',
	`currentBalance` decimal(15,2) NOT NULL DEFAULT '0',
	`lastReconciliationDate` timestamp,
	`lastReconciliationBalance` decimal(15,2),
	`isActive` tinyint NOT NULL DEFAULT 1,
	`isPrimary` tinyint NOT NULL DEFAULT 0,
	`glAccountCode` varchar(50),
	`contactPerson` varchar(255),
	`contactPhone` varchar(50),
	`notes` text,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	`iban` varchar(50),
	`swiftCode` varchar(20),
	`openingBalanceDate` date,
	`glAccountId` int,
	CONSTRAINT `finance_bank_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_budget_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`nameAr` varchar(255),
	`description` text,
	`parentId` int,
	`accountId` int,
	`accountCode` varchar(50),
	`categoryType` enum('expense','income','both') DEFAULT 'expense',
	`isActive` tinyint NOT NULL DEFAULT 1,
	`sortOrder` int DEFAULT 0,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`level` int DEFAULT 1,
	`donorCategoryCode` varchar(50),
	`isEligibleCost` tinyint DEFAULT 1,
	`maxCapPercent` decimal(5,2),
	`requiresSupportingDocs` tinyint DEFAULT 0,
	`isDirectCost` tinyint DEFAULT 1,
	CONSTRAINT `finance_budget_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_cash_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`transactionNumber` varchar(50) NOT NULL,
	`bankAccountId` int NOT NULL,
	`transactionType` enum('DEPOSIT','WITHDRAWAL','TRANSFER_IN','TRANSFER_OUT','BANK_CHARGE','INTEREST','ADJUSTMENT') NOT NULL,
	`transactionDate` timestamp NOT NULL,
	`valueDate` timestamp,
	`amount` decimal(15,2) NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'USD',
	`exchangeRate` decimal(10,6) DEFAULT '1',
	`amountInBaseCurrency` decimal(15,2),
	`balanceAfter` decimal(15,2),
	`transferToAccountId` int,
	`transferFromAccountId` int,
	`referenceNumber` varchar(100),
	`payee` varchar(255),
	`payer` varchar(255),
	`description` text,
	`descriptionAr` text,
	`category` varchar(100),
	`accountCode` varchar(50),
	`projectId` int,
	`isReconciled` tinyint NOT NULL DEFAULT 0,
	`reconciledAt` timestamp,
	`reconciledBy` int,
	`status` enum('DRAFT','PENDING','APPROVED','REJECTED','POSTED') NOT NULL DEFAULT 'POSTED',
	`approvedBy` int,
	`approvedAt` timestamp,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	`grantId` int,
	`currencyId` int,
	`exchangeRateId` int,
	`glAccountId` int,
	`journalEntryId` int,
	`postingStatus` enum('unposted','posted','reversed') DEFAULT 'unposted',
	`counterpartyType` enum('vendor','staff','donor','other'),
	`counterpartyId` int,
	CONSTRAINT `finance_cash_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_currencies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(10) NOT NULL,
	`name` varchar(100) NOT NULL,
	`nameAr` varchar(100),
	`symbol` varchar(10),
	`exchangeRateToUsd` decimal(15,6) DEFAULT '1.000000',
	`isBaseCurrency` tinyint NOT NULL DEFAULT 0,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`decimalPlaces` int DEFAULT 2,
	`organizationId` int NOT NULL,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `finance_currencies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_encumbrances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchaseRequestId` int NOT NULL,
	`purchaseOrderId` int,
	`budgetLineId` int NOT NULL,
	`vendorId` int,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`encumbranceNumber` varchar(50),
	`encumbranceDate` timestamp DEFAULT (now()),
	`encumberedAmount` decimal(15,2) NOT NULL,
	`currency` varchar(10) DEFAULT 'USD',
	`exchangeRate` decimal(15,6) DEFAULT '1.000000',
	`baseCurrencyAmount` decimal(15,2),
	`status` enum('active','partially_liquidated','fully_liquidated','cancelled') DEFAULT 'active',
	`liquidatedAmount` decimal(15,2) DEFAULT '0',
	`remainingAmount` decimal(15,2),
	`reservationId` int,
	`createdBy` int,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`closedAt` timestamp,
	CONSTRAINT `finance_encumbrances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_exchange_rates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fromCurrencyId` int,
	`fromCurrencyCode` varchar(10) NOT NULL,
	`toCurrencyId` int,
	`toCurrencyCode` varchar(10) NOT NULL,
	`rate` decimal(15,6) NOT NULL,
	`effectiveDate` date NOT NULL,
	`expiryDate` date,
	`source` varchar(100),
	`notes` text,
	`organizationId` int NOT NULL,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`rateType` enum('official','market','bank','internal') DEFAULT 'official',
	`enteredBy` int,
	`approvedBy` int,
	`approvedAt` timestamp,
	CONSTRAINT `finance_exchange_rates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_expenditure_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`categoryName` varchar(100) NOT NULL,
	`categoryNameAr` varchar(100),
	`description` text,
	`descriptionAr` text,
	`glAccountId` int,
	`isActive` tinyint DEFAULT 1,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `finance_expenditure_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_expenditures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`projectId` int,
	`budgetLineId` int,
	`payeeId` int,
	`payeeType` enum('employee','vendor','other') NOT NULL,
	`payeeName` varchar(255) NOT NULL,
	`payeeNameAr` varchar(255),
	`expenditureNumber` varchar(50) NOT NULL,
	`expenditureDate` date NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`currencyId` int,
	`amountInBaseCurrency` decimal(15,2),
	`exchangeRateId` int,
	`categoryId` int,
	`description` text,
	`descriptionAr` text,
	`referenceNumber` varchar(100),
	`status` enum('draft','pending_approval','approved','rejected','paid','cancelled') DEFAULT 'draft',
	`approvalStatus` enum('pending','approved','rejected') DEFAULT 'pending',
	`approvedBy` int,
	`approvedAt` timestamp,
	`rejectionReason` text,
	`rejectionReasonAr` text,
	`glAccountId` int,
	`journalEntryId` int,
	`postingStatus` enum('unposted','posted','reversed') DEFAULT 'unposted',
	`receiptUrl` varchar(500),
	`attachments` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	`updatedBy` int,
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedBy` int,
	`deletedAt` timestamp,
	CONSTRAINT `finance_expenditures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_fiscal_years` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`nameAr` varchar(100),
	`code` varchar(20),
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`status` enum('planning','open','closed','locked') DEFAULT 'planning',
	`isCurrent` tinyint NOT NULL DEFAULT 0,
	`closedAt` timestamp,
	`closedBy` int,
	`notes` text,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lockStatus` enum('open','locked','closed') DEFAULT 'open',
	`lockedAt` timestamp,
	`lockedBy` int,
	CONSTRAINT `finance_fiscal_years_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_fund_balances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`fundCode` varchar(50) NOT NULL,
	`fundName` varchar(255) NOT NULL,
	`fundNameAr` varchar(255),
	`fundType` enum('RESTRICTED','UNRESTRICTED','TEMPORARILY_RESTRICTED','DONOR_DESIGNATED') NOT NULL,
	`donorId` int,
	`donorName` varchar(255),
	`grantNumber` varchar(100),
	`currency` varchar(10) NOT NULL DEFAULT 'USD',
	`totalBudget` decimal(15,2) NOT NULL DEFAULT '0',
	`totalReceived` decimal(15,2) NOT NULL DEFAULT '0',
	`totalExpended` decimal(15,2) NOT NULL DEFAULT '0',
	`currentBalance` decimal(15,2) NOT NULL DEFAULT '0',
	`startDate` timestamp,
	`endDate` timestamp,
	`bankAccountId` int,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`notes` text,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	`projectId` int,
	`baseCurrencyId` int,
	`amountInBaseCurrency` decimal(15,2),
	`status` enum('active','closed','suspended') DEFAULT 'active',
	`restrictedType` enum('restricted','unrestricted') DEFAULT 'restricted',
	CONSTRAINT `finance_fund_balances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_period_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`periodId` int NOT NULL,
	`action` varchar(50) NOT NULL,
	`actorUserId` int,
	`actorDisplaySnapshot` text,
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `finance_period_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_periods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`fiscalYearId` int NOT NULL,
	`periodCode` varchar(50) NOT NULL,
	`periodNumber` int NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`status` enum('OPEN','SOFT_CLOSED','LOCKED','REOPENED') NOT NULL DEFAULT 'OPEN',
	`lockedAt` timestamp,
	`lockedBy` int,
	`reopenedAt` timestamp,
	`reopenedBy` int,
	`closeReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `finance_periods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`nameAr` varchar(255),
	`module` enum('chart_of_accounts','budgets','expenditures','advances','treasury','assets','reports','settings') DEFAULT 'budgets',
	`action` enum('view','create','edit','delete','approve','export','import','admin') DEFAULT 'view',
	`description` text,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`organizationId` int NOT NULL,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `finance_permissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_role_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roleId` int NOT NULL,
	`permissionId` int NOT NULL,
	`organizationId` int NOT NULL,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `finance_role_permissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`nameAr` varchar(255),
	`description` text,
	`level` int DEFAULT 1,
	`isSystemRole` tinyint NOT NULL DEFAULT 0,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`organizationId` int NOT NULL,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `finance_roles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_settlements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`settlementNumber` varchar(50) NOT NULL,
	`advanceId` int NOT NULL,
	`settlementDate` timestamp NOT NULL,
	`settledAmount` decimal(15,2) NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'USD',
	`receiptNumber` varchar(100),
	`description` text,
	`descriptionAr` text,
	`expenseCategory` varchar(100),
	`accountCode` varchar(50),
	`status` enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
	`approvedBy` int,
	`approvedAt` timestamp,
	`refundAmount` decimal(15,2) DEFAULT '0',
	`refundDate` timestamp,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	`projectId` int,
	`grantId` int,
	`currencyId` int,
	`exchangeRateId` int,
	`amountInBaseCurrency` decimal(15,2),
	`glAccountId` int,
	`journalEntryId` int,
	`postingStatus` enum('unposted','posted','reversed') DEFAULT 'unposted',
	CONSTRAINT `finance_settlements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_user_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`roleId` int NOT NULL,
	`effectiveFrom` date,
	`effectiveTo` date,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`organizationId` int NOT NULL,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `finance_user_roles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fiscal_periods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`fiscalYearId` int NOT NULL,
	`periodNumber` int NOT NULL,
	`periodName` varchar(50) NOT NULL,
	`periodNameAr` varchar(50),
	`periodType` enum('month','quarter') DEFAULT 'month',
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`status` enum('open','closed','locked') DEFAULT 'open',
	`closedAt` timestamp,
	`closedBy` int,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fiscal_periods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `forecast_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`forecastId` int NOT NULL,
	`userId` int NOT NULL,
	`action` enum('create','update','delete') NOT NULL,
	`fieldChanged` varchar(100),
	`beforeValue` text,
	`afterValue` text,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `forecast_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `forecast_plan` (
	`id` int AUTO_INCREMENT NOT NULL,
	`budgetItemId` int NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`fiscalYear` varchar(20) NOT NULL,
	`yearNumber` int NOT NULL,
	`m1` decimal(15,2) NOT NULL DEFAULT '0.00',
	`m2` decimal(15,2) NOT NULL DEFAULT '0.00',
	`m3` decimal(15,2) NOT NULL DEFAULT '0.00',
	`m4` decimal(15,2) NOT NULL DEFAULT '0.00',
	`m5` decimal(15,2) NOT NULL DEFAULT '0.00',
	`m6` decimal(15,2) NOT NULL DEFAULT '0.00',
	`m7` decimal(15,2) NOT NULL DEFAULT '0.00',
	`m8` decimal(15,2) NOT NULL DEFAULT '0.00',
	`m9` decimal(15,2) NOT NULL DEFAULT '0.00',
	`m10` decimal(15,2) NOT NULL DEFAULT '0.00',
	`m11` decimal(15,2) NOT NULL DEFAULT '0.00',
	`m12` decimal(15,2) NOT NULL DEFAULT '0.00',
	`totalForecast` decimal(15,2) NOT NULL DEFAULT '0.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `forecast_plan_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fuel_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`vehicleId` int NOT NULL,
	`driverId` int,
	`fuelLogNumber` varchar(50) NOT NULL,
	`fuelDate` timestamp NOT NULL,
	`fuelType` enum('petrol','diesel','electric') DEFAULT 'petrol',
	`quantity` decimal(8,2) NOT NULL,
	`unitPrice` decimal(8,2),
	`totalCost` decimal(10,2),
	`currency` varchar(10) DEFAULT 'USD',
	`mileageAtFill` decimal(10,2),
	`station` varchar(255),
	`receiptNumber` varchar(100),
	`projectCode` varchar(50),
	`remarks` text,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `fuel_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gl_account_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`code` varchar(20) NOT NULL,
	`name` varchar(255) NOT NULL,
	`nameAr` varchar(255),
	`parentId` int,
	`level` int DEFAULT 1,
	`accountType` enum('asset','liability','equity','revenue','expense') NOT NULL,
	`normalBalance` enum('debit','credit') NOT NULL,
	`isActive` tinyint DEFAULT 1,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `gl_account_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gl_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`categoryId` int,
	`accountCode` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`nameAr` varchar(255),
	`description` text,
	`descriptionAr` text,
	`accountType` enum('asset','liability','equity','revenue','expense') NOT NULL,
	`normalBalance` enum('debit','credit') NOT NULL,
	`parentAccountId` int,
	`level` int DEFAULT 1,
	`isControlAccount` tinyint DEFAULT 0,
	`isBankAccount` tinyint DEFAULT 0,
	`isCashAccount` tinyint DEFAULT 0,
	`isReceivable` tinyint DEFAULT 0,
	`isPayable` tinyint DEFAULT 0,
	`currencyId` int,
	`openingBalance` decimal(15,2) DEFAULT '0.00',
	`currentBalance` decimal(15,2) DEFAULT '0.00',
	`isActive` tinyint DEFAULT 1,
	`isPostable` tinyint DEFAULT 1,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `gl_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gl_posting_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`purchaseRequestId` int,
	`entityType` enum('contract','sac','invoice','payment','retention') NOT NULL,
	`entityId` int NOT NULL,
	`eventType` enum('approval','rejection','payment','retention_hold','retention_release') NOT NULL,
	`glAccount` varchar(50),
	`amount` decimal(15,2),
	`currency` varchar(10) DEFAULT 'USD',
	`fiscalPeriod` varchar(20),
	`postingStatus` enum('pending','posted','failed','reversed') NOT NULL DEFAULT 'pending',
	`postedAt` timestamp,
	`description` text,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdBy` int,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gl_posting_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `globalSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`defaultLanguage` varchar(10) NOT NULL DEFAULT 'en',
	`defaultTimezone` varchar(100) NOT NULL DEFAULT 'UTC',
	`defaultCurrency` varchar(10) NOT NULL DEFAULT 'USD',
	`environmentLabel` enum('production','staging','test') NOT NULL DEFAULT 'production',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `globalSettings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `goods_receipt_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int NOT NULL,
	`purchaseOrderId` int,
	`supplierId` int,
	`grnNumber` varchar(50) NOT NULL,
	`grnDate` timestamp NOT NULL DEFAULT (now()),
	`deliveryNoteNumber` varchar(100),
	`invoiceNumber` varchar(100),
	`warehouse` varchar(255),
	`warehouseAr` varchar(255),
	`receivedBy` varchar(255),
	`inspectedBy` varchar(255),
	`totalReceived` int DEFAULT 0,
	`totalAccepted` int DEFAULT 0,
	`totalRejected` int DEFAULT 0,
	`remarks` text,
	`remarksAr` text,
	`status` enum('pending_inspection','inspected','accepted','partially_accepted','rejected') NOT NULL DEFAULT 'pending_inspection',
	`approvedBy` int,
	`approvedAt` timestamp,
	`stockPosted` tinyint NOT NULL DEFAULT 0,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `goods_receipt_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `grant_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`grantId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileSize` int,
	`mimeType` varchar(100),
	`category` enum('contractual','financial','programmatic','reporting','other') NOT NULL DEFAULT 'other',
	`status` enum('draft','pending','approved','rejected','final') NOT NULL DEFAULT 'draft',
	`description` text,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	`uploadedBy` int,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `grant_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `grants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`donorId` int,
	`projectId` int,
	`grantCode` varchar(100),
	`title` varchar(500),
	`titleAr` varchar(500),
	`grantNumber` varchar(100),
	`grantName` text,
	`grantNameAr` text,
	`donorName` varchar(255),
	`donorReference` varchar(255),
	`grantAmount` decimal(15,2),
	`amount` decimal(15,2) DEFAULT '0',
	`totalBudget` decimal(15,2) DEFAULT '0',
	`currency` varchar(10) NOT NULL DEFAULT 'USD',
	`status` enum('planned','ongoing','closed','draft','submitted','under_review','approved','rejected','pending') NOT NULL DEFAULT 'draft',
	`reportingStatus` enum('on_track','due','overdue') DEFAULT 'on_track',
	`submissionDate` timestamp,
	`approvalDate` timestamp,
	`startDate` timestamp,
	`endDate` timestamp,
	`description` text,
	`descriptionAr` text,
	`objectives` text,
	`objectivesAr` text,
	`proposalDocumentUrl` text,
	`approvalDocumentUrl` text,
	`sector` varchar(255),
	`responsible` varchar(255),
	`reportingFrequency` enum('monthly','quarterly','semi_annually','annually') DEFAULT 'quarterly',
	`coFunding` tinyint DEFAULT 0,
	`coFunderName` varchar(255),
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `grants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `grn_line_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`grnId` int NOT NULL,
	`poLineItemId` int,
	`lineNumber` int NOT NULL,
	`description` text NOT NULL,
	`unit` varchar(50) DEFAULT 'Piece',
	`orderedQty` decimal(10,2) DEFAULT '0',
	`receivedQty` decimal(10,2) DEFAULT '0',
	`acceptedQty` decimal(10,2) DEFAULT '0',
	`rejectedQty` decimal(10,2) DEFAULT '0',
	`rejectionReason` text,
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `grn_line_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hr_annual_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`planYear` int NOT NULL,
	`planName` varchar(255) NOT NULL,
	`existingWorkforce` text,
	`plannedStaffing` text,
	`recruitmentPlan` text,
	`budgetEstimate` text,
	`trainingPlan` text,
	`hrRisks` text,
	`totalPlannedPositions` int,
	`existingStaff` int,
	`newPositionsRequired` int,
	`estimatedHrCost` decimal(15,2),
	`status` enum('draft','pending_review','pending_approval','approved','rejected') NOT NULL DEFAULT 'draft',
	`preparedBy` int,
	`preparedAt` timestamp,
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`approvedBy` int,
	`approvedAt` timestamp,
	`notes` text,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hr_annual_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hr_attendance_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`employeeId` int NOT NULL,
	`date` date NOT NULL,
	`checkIn` timestamp,
	`checkOut` timestamp,
	`status` enum('present','absent','late','half_day','on_leave','holiday','weekend') NOT NULL DEFAULT 'present',
	`workHours` decimal(5,2),
	`overtimeHours` decimal(5,2),
	`location` varchar(255),
	`notes` text,
	`periodLocked` tinyint NOT NULL DEFAULT 0,
	`lockedBy` int,
	`lockedAt` timestamp,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hr_attendance_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hr_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`employeeId` int,
	`documentCode` varchar(50),
	`documentName` varchar(255) NOT NULL,
	`documentNameAr` varchar(255),
	`documentType` enum('policy','template','form','contract','certificate','id_document','other') NOT NULL,
	`category` varchar(100),
	`fileUrl` text,
	`fileSize` int,
	`mimeType` varchar(100),
	`version` varchar(50),
	`effectiveDate` date,
	`expiryDate` date,
	`description` text,
	`tags` text,
	`isPublic` tinyint NOT NULL DEFAULT 0,
	`accessRoles` text,
	`status` enum('draft','active','archived','expired') NOT NULL DEFAULT 'active',
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`uploadedBy` int,
	CONSTRAINT `hr_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hr_employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`employeeCode` varchar(50) NOT NULL,
	`firstName` varchar(100) NOT NULL,
	`lastName` varchar(100) NOT NULL,
	`firstNameAr` varchar(100),
	`lastNameAr` varchar(100),
	`email` varchar(320),
	`phone` varchar(50),
	`dateOfBirth` date,
	`gender` enum('male','female','other'),
	`nationality` varchar(100),
	`nationalId` varchar(100),
	`passportNumber` varchar(100),
	`employmentType` enum('full_time','part_time','contract','consultant','intern') DEFAULT 'full_time',
	`staffCategory` enum('national','international','expatriate') DEFAULT 'national',
	`department` varchar(100),
	`position` varchar(100),
	`jobTitle` varchar(255),
	`gradeLevel` varchar(50),
	`reportingTo` int,
	`hireDate` date,
	`contractStartDate` date,
	`contractEndDate` date,
	`probationEndDate` date,
	`terminationDate` date,
	`status` enum('active','on_leave','suspended','terminated','resigned') NOT NULL DEFAULT 'active',
	`address` text,
	`city` varchar(100),
	`country` varchar(100),
	`emergencyContactName` varchar(255),
	`emergencyContactPhone` varchar(50),
	`emergencyContactRelation` varchar(100),
	`bankName` varchar(255),
	`bankAccountNumber` varchar(100),
	`bankIban` varchar(100),
	`photoUrl` text,
	`notes` text,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `hr_employees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hr_leave_balances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`employeeId` int NOT NULL,
	`year` int NOT NULL,
	`leaveType` enum('annual','sick','maternity','paternity','unpaid','compassionate','study','other') NOT NULL,
	`entitlement` decimal(5,1) NOT NULL DEFAULT '0',
	`carriedOver` decimal(5,1) NOT NULL DEFAULT '0',
	`used` decimal(5,1) NOT NULL DEFAULT '0',
	`pending` decimal(5,1) NOT NULL DEFAULT '0',
	`remaining` decimal(5,1) NOT NULL DEFAULT '0',
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hr_leave_balances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hr_leave_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`employeeId` int NOT NULL,
	`leaveType` enum('annual','sick','maternity','paternity','unpaid','compassionate','study','other') NOT NULL,
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`totalDays` decimal(5,1) NOT NULL,
	`reason` text,
	`attachmentUrl` text,
	`status` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
	`approvedBy` int,
	`approvedAt` timestamp,
	`rejectionReason` text,
	`balanceBefore` decimal(5,1),
	`balanceAfter` decimal(5,1),
	`notes` text,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hr_leave_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hr_payroll_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`employeeId` int NOT NULL,
	`payrollMonth` int NOT NULL,
	`payrollYear` int NOT NULL,
	`basicSalary` decimal(15,2) NOT NULL,
	`housingAllowance` decimal(15,2) DEFAULT '0',
	`transportAllowance` decimal(15,2) DEFAULT '0',
	`otherAllowances` decimal(15,2) DEFAULT '0',
	`overtimePay` decimal(15,2) DEFAULT '0',
	`bonus` decimal(15,2) DEFAULT '0',
	`grossSalary` decimal(15,2) NOT NULL,
	`taxDeduction` decimal(15,2) DEFAULT '0',
	`socialSecurityDeduction` decimal(15,2) DEFAULT '0',
	`loanDeduction` decimal(15,2) DEFAULT '0',
	`otherDeductions` decimal(15,2) DEFAULT '0',
	`totalDeductions` decimal(15,2) DEFAULT '0',
	`netSalary` decimal(15,2) NOT NULL,
	`currency` varchar(10) DEFAULT 'USD',
	`status` enum('draft','pending_approval','approved','paid','cancelled') NOT NULL DEFAULT 'draft',
	`approvedBy` int,
	`approvedAt` timestamp,
	`paidAt` timestamp,
	`paymentMethod` enum('bank_transfer','cash','check') DEFAULT 'bank_transfer',
	`paymentReference` varchar(255),
	`notes` text,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hr_payroll_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hr_recruitment_candidates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`jobId` int NOT NULL,
	`firstName` varchar(100) NOT NULL,
	`lastName` varchar(100) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(50),
	`resumeUrl` text,
	`coverLetterUrl` text,
	`portfolioUrl` text,
	`linkedinUrl` text,
	`education` text,
	`experience` text,
	`skills` text,
	`source` enum('website','referral','job_board','linkedin','agency','other') DEFAULT 'website',
	`referredBy` varchar(255),
	`rating` int,
	`evaluationNotes` text,
	`interviewDate` timestamp,
	`interviewNotes` text,
	`interviewers` text,
	`status` enum('new','screening','shortlisted','interview_scheduled','interviewed','offer_pending','offer_sent','hired','rejected','withdrawn') NOT NULL DEFAULT 'new',
	`rejectionReason` text,
	`offerDate` date,
	`offerSalary` decimal(15,2),
	`offerAccepted` tinyint,
	`startDate` date,
	`notes` text,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hr_recruitment_candidates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hr_recruitment_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`jobCode` varchar(50),
	`jobTitle` varchar(255) NOT NULL,
	`jobTitleAr` varchar(255),
	`department` varchar(100),
	`employmentType` enum('full_time','part_time','contract','consultant','intern') DEFAULT 'full_time',
	`gradeLevel` varchar(50),
	`salaryRange` varchar(100),
	`description` text,
	`requirements` text,
	`responsibilities` text,
	`benefits` text,
	`location` varchar(255),
	`isRemote` tinyint DEFAULT 0,
	`openings` int DEFAULT 1,
	`postingDate` date,
	`closingDate` date,
	`status` enum('draft','open','on_hold','closed','filled','cancelled') NOT NULL DEFAULT 'draft',
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	CONSTRAINT `hr_recruitment_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hr_salary_grades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`gradeCode` varchar(50) NOT NULL,
	`gradeName` varchar(100) NOT NULL,
	`gradeNameAr` varchar(100),
	`minSalary` decimal(15,2) NOT NULL,
	`maxSalary` decimal(15,2) NOT NULL,
	`midSalary` decimal(15,2),
	`currency` varchar(10) DEFAULT 'USD',
	`steps` text,
	`housingAllowance` decimal(15,2),
	`transportAllowance` decimal(15,2),
	`otherAllowances` text,
	`effectiveDate` date,
	`expiryDate` date,
	`status` enum('active','inactive','draft') NOT NULL DEFAULT 'active',
	`notes` text,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hr_salary_grades_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hr_salary_scale` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`employeeId` int NOT NULL,
	`staffId` varchar(50) NOT NULL,
	`staffFullName` varchar(255) NOT NULL,
	`position` varchar(100),
	`department` varchar(100),
	`contractType` varchar(50),
	`gradeId` int,
	`gradeCode` varchar(50) NOT NULL,
	`step` varchar(50) NOT NULL,
	`minSalary` decimal(15,2) DEFAULT '0',
	`maxSalary` decimal(15,2) DEFAULT '0',
	`approvedGrossSalary` decimal(15,2) NOT NULL,
	`housingAllowance` decimal(15,2) DEFAULT '0',
	`housingAllowanceType` enum('value','percentage') DEFAULT 'value',
	`transportAllowance` decimal(15,2) DEFAULT '0',
	`transportAllowanceType` enum('value','percentage') DEFAULT 'value',
	`representationAllowance` decimal(15,2) DEFAULT '0',
	`representationAllowanceType` enum('value','percentage') DEFAULT 'value',
	`annualAllowance` decimal(15,2) DEFAULT '0',
	`bonus` decimal(15,2) DEFAULT '0',
	`otherAllowances` decimal(15,2) DEFAULT '0',
	`currency` varchar(10) DEFAULT 'USD',
	`version` int NOT NULL DEFAULT 1,
	`effectiveStartDate` date NOT NULL,
	`effectiveEndDate` date,
	`status` enum('draft','active','superseded') NOT NULL DEFAULT 'draft',
	`isLocked` tinyint NOT NULL DEFAULT 0,
	`usedInPayroll` tinyint NOT NULL DEFAULT 0,
	`lastApprovedBy` int,
	`lastApprovedAt` timestamp,
	`createdBy` int,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hr_salary_scale_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hr_sanctions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`employeeId` int NOT NULL,
	`sanctionCode` varchar(50),
	`sanctionType` enum('verbal_warning','written_warning','final_warning','suspension','demotion','termination','other') NOT NULL,
	`severity` enum('minor','moderate','major','critical') NOT NULL DEFAULT 'minor',
	`incidentDate` date NOT NULL,
	`reportedDate` date,
	`description` text NOT NULL,
	`evidence` text,
	`investigatedBy` int,
	`investigationNotes` text,
	`investigationDate` date,
	`decisionDate` date,
	`decisionBy` int,
	`decision` text,
	`appealDate` date,
	`appealOutcome` enum('upheld','modified','overturned'),
	`appealNotes` text,
	`status` enum('reported','under_investigation','pending_decision','decided','appealed','closed') NOT NULL DEFAULT 'reported',
	`effectiveDate` date,
	`expiryDate` date,
	`notes` text,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hr_sanctions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `implementation_checklist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organization_id` int NOT NULL,
	`monitoring_id` int NOT NULL,
	`milestone_id` int,
	`item_description` text NOT NULL,
	`is_completed` tinyint NOT NULL DEFAULT 0,
	`completed_at` timestamp,
	`completed_by` int,
	`remarks` text,
	`order_index` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_by` int,
	`updated_by` int,
	CONSTRAINT `implementation_checklist_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `implementation_monitoring` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organization_id` int NOT NULL,
	`operating_unit_id` int,
	`contract_id` int NOT NULL,
	`status` enum('pending','in_progress','completed') NOT NULL DEFAULT 'pending',
	`deliverables_checklist_complete` tinyint NOT NULL DEFAULT 0,
	`primary_handover_complete` tinyint NOT NULL DEFAULT 0,
	`final_handover_complete` tinyint NOT NULL DEFAULT 0,
	`observations_complete` tinyint NOT NULL DEFAULT 0,
	`completed_at` timestamp,
	`completed_by` int,
	`is_deleted` tinyint NOT NULL DEFAULT 0,
	`deleted_at` timestamp,
	`deleted_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_by` int,
	`updated_by` int,
	CONSTRAINT `implementation_monitoring_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `implementation_observations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organization_id` int NOT NULL,
	`monitoring_id` int NOT NULL,
	`observation_date` timestamp NOT NULL DEFAULT (now()),
	`observation_type` enum('positive','negative','neutral') NOT NULL DEFAULT 'neutral',
	`description` text NOT NULL,
	`action_required` text,
	`action_taken` text,
	`reported_by` varchar(255),
	`status` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
	`resolved_at` timestamp,
	`resolved_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_by` int,
	`updated_by` int,
	CONSTRAINT `implementation_observations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `import_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`organization_id` int NOT NULL,
	`operating_unit_id` int,
	`user_id` int NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`import_type` varchar(50) NOT NULL,
	`records_imported` int NOT NULL DEFAULT 0,
	`records_skipped` int NOT NULL DEFAULT 0,
	`records_errors` int NOT NULL DEFAULT 0,
	`status` varchar(20) NOT NULL DEFAULT 'completed',
	`error_details` text,
	`allowed_duplicates` tinyint NOT NULL DEFAULT 0,
	`imported_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `import_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `incidents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`incidentCode` varchar(50),
	`title` varchar(255) NOT NULL,
	`titleAr` varchar(255),
	`description` text NOT NULL,
	`descriptionAr` text,
	`category` enum('safety','security','data_breach','operational','hr','financial','environmental','legal','reputational','other') NOT NULL,
	`severity` enum('minor','moderate','major','critical') NOT NULL,
	`incidentDate` timestamp NOT NULL,
	`reportedDate` timestamp NOT NULL DEFAULT (now()),
	`location` varchar(255),
	`reportedBy` int,
	`affectedParties` text,
	`witnesses` text,
	`investigationStatus` enum('pending','in_progress','completed','closed') NOT NULL DEFAULT 'pending',
	`investigationNotes` text,
	`investigatedBy` int,
	`investigationCompletedAt` timestamp,
	`rootCause` text,
	`rootCauseAr` text,
	`correctiveActions` text,
	`preventiveActions` text,
	`relatedRiskId` int,
	`status` enum('open','under_investigation','resolved','closed') NOT NULL DEFAULT 'open',
	`resolutionDate` timestamp,
	`resolutionNotes` text,
	`attachments` text,
	`notes` text,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	CONSTRAINT `incidents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `indicators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`activityId` int,
	`indicatorName` text NOT NULL,
	`indicatorNameAr` text,
	`description` text,
	`descriptionAr` text,
	`type` enum('OUTPUT','OUTCOME','IMPACT') NOT NULL DEFAULT 'OUTPUT',
	`category` varchar(255),
	`unit` varchar(100) NOT NULL,
	`baseline` decimal(15,2) NOT NULL DEFAULT '0.00',
	`target` decimal(15,2) NOT NULL,
	`achievedValue` decimal(15,2) NOT NULL DEFAULT '0.00',
	`targetDate` date,
	`dataSource` text,
	`verificationMethod` text,
	`status` enum('ON_TRACK','AT_RISK','OFF_TRACK','ACHIEVED') NOT NULL DEFAULT 'ON_TRACK',
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`reporting_frequency` enum('monthly','quarterly','bi_annually','annually','end_of_project') DEFAULT 'quarterly',
	CONSTRAINT `indicators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`organizationId` int NOT NULL,
	`role` enum('org_admin','program_manager','finance_manager','meal_officer','case_worker','viewer') NOT NULL,
	`token` varchar(255) NOT NULL,
	`status` enum('pending','accepted','expired','cancelled') NOT NULL DEFAULT 'pending',
	`expiresAt` timestamp NOT NULL,
	`invitedBy` int NOT NULL,
	`acceptedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invitations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `journal_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int NOT NULL,
	`entryNumber` varchar(50) NOT NULL,
	`entryDate` date NOT NULL,
	`fiscalYearId` int,
	`fiscalPeriodId` int,
	`entryType` enum('standard','adjusting','closing','reversing','opening') DEFAULT 'standard',
	`sourceModule` enum('manual','expense','advance','settlement','cash_transaction','asset','payroll','procurement','budget') DEFAULT 'manual',
	`sourceDocumentId` int,
	`sourceDocumentType` varchar(50),
	`description` text,
	`descriptionAr` text,
	`totalDebit` decimal(15,2) DEFAULT '0.00',
	`totalCredit` decimal(15,2) DEFAULT '0.00',
	`currencyId` int,
	`exchangeRateId` int,
	`status` enum('draft','posted','reversed','void') DEFAULT 'draft',
	`postedAt` timestamp,
	`postedBy` int,
	`reversedAt` timestamp,
	`reversedBy` int,
	`reversalEntryId` int,
	`projectId` int,
	`grantId` int,
	`attachments` text,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `journal_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `journal_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`journalEntryId` int NOT NULL,
	`lineNumber` int NOT NULL,
	`glAccountId` int NOT NULL,
	`description` text,
	`descriptionAr` text,
	`debitAmount` decimal(15,2) DEFAULT '0.00',
	`creditAmount` decimal(15,2) DEFAULT '0.00',
	`currencyId` int,
	`exchangeRate` decimal(15,6) DEFAULT '1.000000',
	`debitAmountBase` decimal(15,2) DEFAULT '0.00',
	`creditAmountBase` decimal(15,2) DEFAULT '0.00',
	`projectId` int,
	`grantId` int,
	`activityId` int,
	`budgetLineId` int,
	`costCenterId` int,
	`reference` varchar(255),
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `journal_lines_id` PRIMARY KEY(`id`)
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
	`showQuickStats` tinyint NOT NULL DEFAULT 1,
	`showAnnouncements` tinyint NOT NULL DEFAULT 1,
	`showRecentActivity` tinyint NOT NULL DEFAULT 1,
	`welcomeMessage` text,
	`welcomeMessageAr` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `landing_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meal_accountability_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`projectId` int,
	`recordCode` varchar(50) NOT NULL,
	`recordType` enum('complaint','feedback','suggestion') NOT NULL DEFAULT 'feedback',
	`category` varchar(100),
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`status` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
	`subject` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`submittedVia` varchar(100),
	`isAnonymous` tinyint NOT NULL DEFAULT 0,
	`isSensitive` tinyint NOT NULL DEFAULT 0,
	`complainantName` varchar(255),
	`complainantGender` enum('male','female','other','prefer_not_to_say'),
	`complainantAgeGroup` varchar(50),
	`complainantContact` varchar(255),
	`complainantLocation` varchar(255),
	`resolution` text,
	`resolvedAt` timestamp,
	`resolvedBy` int,
	`assignedTo` int,
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	`dueDate` date,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `meal_accountability_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meal_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int NOT NULL,
	`moduleName` varchar(50) NOT NULL DEFAULT 'MEAL',
	`entityType` varchar(100) NOT NULL,
	`entityId` int NOT NULL,
	`actionType` enum('create','update','delete','approve','export','print') NOT NULL,
	`actorUserId` int,
	`diff` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `meal_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meal_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`projectId` int,
	`documentCode` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`titleAr` varchar(255),
	`description` text,
	`descriptionAr` text,
	`documentType` enum('report','assessment','evaluation','tool','template','guideline','sop','training_material','other') NOT NULL DEFAULT 'other',
	`category` enum('indicators','surveys','reports','accountability','other') NOT NULL DEFAULT 'other',
	`fileName` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileSize` int,
	`mimeType` varchar(100),
	`version` varchar(20) NOT NULL DEFAULT '1.0',
	`parentDocumentId` int,
	`sourceModule` varchar(100),
	`sourceRecordId` int,
	`isSystemGenerated` tinyint NOT NULL DEFAULT 0,
	`isPublic` tinyint NOT NULL DEFAULT 0,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `meal_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meal_dqa_actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dqaFindingId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int NOT NULL,
	`actionText` text NOT NULL,
	`ownerUserId` int,
	`dueDate` timestamp,
	`status` enum('open','in_progress','closed') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `meal_dqa_actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meal_dqa_findings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dqaVisitId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int NOT NULL,
	`severity` enum('low','medium','high') NOT NULL,
	`category` enum('completeness','accuracy','timeliness','integrity','validity') NOT NULL,
	`findingText` text NOT NULL,
	`recommendationText` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `meal_dqa_findings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meal_dqa_visits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int NOT NULL,
	`projectId` int NOT NULL,
	`dqaCode` varchar(50) NOT NULL,
	`visitDate` timestamp NOT NULL,
	`verifierUserIds` json,
	`locationIds` json,
	`dataSource` enum('survey','indicator','accountability','mixed') NOT NULL,
	`samplingMethod` text,
	`recordsCheckedCount` int DEFAULT 0,
	`accurateCount` int DEFAULT 0,
	`discrepanciesCount` int DEFAULT 0,
	`missingFieldsCount` int DEFAULT 0,
	`duplicatesCount` int DEFAULT 0,
	`summary` text,
	`status` enum('draft','submitted','approved','closed') NOT NULL DEFAULT 'draft',
	`createdBy` int,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedBy` int,
	CONSTRAINT `meal_dqa_visits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meal_indicator_data_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`indicatorId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`projectId` int,
	`reportingPeriod` varchar(50) NOT NULL,
	`periodStartDate` date NOT NULL,
	`periodEndDate` date NOT NULL,
	`achievedValue` decimal(15,2) NOT NULL,
	`disaggregation` json,
	`dataSource` text,
	`evidenceFiles` json,
	`notes` text,
	`isVerified` tinyint NOT NULL DEFAULT 0,
	`verifiedAt` timestamp,
	`verifiedBy` int,
	`verificationNotes` text,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `meal_indicator_data_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meal_indicator_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`name` varchar(500) NOT NULL,
	`code` varchar(100),
	`unitOfMeasure` varchar(100),
	`calculationMethod` text,
	`frequency` varchar(50),
	`disaggregationFields` json,
	`defaultTargets` json,
	`active` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedBy` int,
	CONSTRAINT `meal_indicator_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meal_learning_actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`learningItemId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int NOT NULL,
	`actionText` text NOT NULL,
	`ownerUserId` int,
	`dueDate` timestamp,
	`status` enum('open','in_progress','closed') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `meal_learning_actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meal_learning_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int NOT NULL,
	`projectId` int NOT NULL,
	`type` enum('lesson','best_practice','product') NOT NULL,
	`title` varchar(500) NOT NULL,
	`context` text,
	`rootCause` text,
	`whatWorked` text,
	`whatDidnt` text,
	`recommendations` text,
	`moduleSource` enum('indicator','survey','accountability','cross_cutting') NOT NULL,
	`visibility` enum('internal','donor') NOT NULL DEFAULT 'internal',
	`status` enum('draft','submitted','validated','published','archived') NOT NULL DEFAULT 'draft',
	`tags` json,
	`locationIds` json,
	`createdBy` int,
	`updatedBy` int,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	CONSTRAINT `meal_learning_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meal_survey_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`surveyId` int NOT NULL,
	`questionCode` varchar(50) NOT NULL,
	`questionText` text NOT NULL,
	`questionTextAr` text,
	`helpText` text,
	`helpTextAr` text,
	`questionType` enum('text','textarea','number','email','phone','date','time','datetime','select','multiselect','radio','checkbox','rating','scale','file','image','signature','location','matrix') NOT NULL DEFAULT 'text',
	`isRequired` tinyint NOT NULL DEFAULT 0,
	`order` int NOT NULL DEFAULT 0,
	`sectionId` varchar(50),
	`sectionTitle` varchar(255),
	`sectionTitleAr` varchar(255),
	`options` json,
	`validationRules` json,
	`skipLogic` json,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meal_survey_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meal_survey_standards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`standardName` varchar(500) NOT NULL,
	`validationRules` json,
	`requiredFields` json,
	`gpsRequired` tinyint NOT NULL DEFAULT 0,
	`photoRequired` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedBy` int,
	CONSTRAINT `meal_survey_standards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meal_survey_submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`surveyId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`projectId` int,
	`submissionCode` varchar(50) NOT NULL,
	`respondentName` varchar(255),
	`respondentEmail` varchar(320),
	`respondentPhone` varchar(50),
	`responses` json NOT NULL,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`submittedBy` int,
	`validationStatus` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`validatedAt` timestamp,
	`validatedBy` int,
	`validationNotes` text,
	`latitude` decimal(10,8),
	`longitude` decimal(11,8),
	`locationName` varchar(255),
	`deviceInfo` json,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meal_survey_submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meal_surveys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`projectId` int,
	`surveyCode` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`titleAr` varchar(255),
	`description` text,
	`descriptionAr` text,
	`surveyType` enum('baseline','endline','monitoring','assessment','feedback','custom') NOT NULL DEFAULT 'custom',
	`status` enum('draft','published','closed','archived') NOT NULL DEFAULT 'draft',
	`isAnonymous` tinyint NOT NULL DEFAULT 0,
	`allowMultipleSubmissions` tinyint NOT NULL DEFAULT 0,
	`requiresApproval` tinyint NOT NULL DEFAULT 0,
	`startDate` date,
	`endDate` date,
	`formConfig` json,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `meal_surveys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `microsoft_integrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`entraIdEnabled` tinyint NOT NULL DEFAULT 0,
	`entraIdTenantId` varchar(255),
	`sharepointEnabled` tinyint NOT NULL DEFAULT 0,
	`sharepointSiteUrl` text,
	`oneDriveEnabled` tinyint NOT NULL DEFAULT 0,
	`outlookEnabled` tinyint NOT NULL DEFAULT 0,
	`teamsEnabled` tinyint NOT NULL DEFAULT 0,
	`powerBiEnabled` tinyint NOT NULL DEFAULT 0,
	`lastSyncedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `microsoft_integrations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mitigation_action_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actionId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` varchar(500) NOT NULL,
	`fileSize` int,
	`fileType` varchar(100),
	`description` text,
	`descriptionAr` text,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	`uploadedBy` int NOT NULL,
	CONSTRAINT `mitigation_action_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mitigation_action_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actionId` int NOT NULL,
	`comment` text NOT NULL,
	`commentAr` text,
	`progressUpdate` int,
	`statusChange` enum('pending','in_progress','completed','cancelled','overdue'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	CONSTRAINT `mitigation_action_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mitigation_actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`riskId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`titleAr` varchar(255),
	`description` text,
	`descriptionAr` text,
	`assignedTo` int,
	`assignedBy` int,
	`deadline` date,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`status` enum('pending','in_progress','completed','cancelled','overdue') NOT NULL DEFAULT 'pending',
	`progress` int NOT NULL DEFAULT 0,
	`priority` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`evidenceRequired` text,
	`evidenceRequiredAr` text,
	`evidenceProvided` text,
	`verifiedBy` int,
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	CONSTRAINT `mitigation_actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mitigation_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`templateName` varchar(255) NOT NULL,
	`templateNameAr` varchar(255),
	`riskCategory` enum('operational','financial','strategic','compliance','reputational','technological','environmental','security','legal','other') NOT NULL,
	`riskType` varchar(100),
	`severity` enum('low','medium','high','critical'),
	`suggestedActions` text NOT NULL,
	`suggestedActionsAr` text,
	`responsibleRole` varchar(100),
	`expectedTimeframe` varchar(100),
	`evidenceRequired` text,
	`evidenceRequiredAr` text,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	CONSTRAINT `mitigation_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monthly_report_audit_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`monthlyReportId` int NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`action` enum('created','updated','finalized','deleted','restored') NOT NULL,
	`fieldChanged` varchar(100),
	`previousValue` text,
	`newValue` text,
	`changeReason` text,
	`performedBy` int,
	`performedAt` timestamp NOT NULL DEFAULT (now()),
	`ipAddress` varchar(45),
	`userAgent` text,
	CONSTRAINT `monthly_report_audit_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monthly_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`reportCode` varchar(50) NOT NULL,
	`reportType` enum('monthly','period','quarterly','annual') NOT NULL DEFAULT 'monthly',
	`reportMonth` int NOT NULL,
	`reportYear` int NOT NULL,
	`periodStartDate` date NOT NULL,
	`periodEndDate` date NOT NULL,
	`status` enum('editable','finalized') NOT NULL DEFAULT 'editable',
	`generatedDate` timestamp NOT NULL DEFAULT (now()),
	`editWindowEndDate` timestamp NOT NULL,
	`finalizedDate` timestamp,
	`implementationProgress` text,
	`implementationProgressAr` text,
	`projectSummary` text,
	`projectSummaryAr` text,
	`keyAchievements` text,
	`keyAchievementsAr` text,
	`nextPlan` text,
	`nextPlanAr` text,
	`challengesMitigation` text,
	`challengesMitigationAr` text,
	`lessonsLearned` text,
	`lessonsLearnedAr` text,
	`activitiesSnapshot` json,
	`indicatorsSnapshot` json,
	`financialSnapshot` json,
	`casesSnapshot` json,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `monthly_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_event_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`eventKey` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(50) NOT NULL,
	`description` varchar(500),
	`emailEnabled` tinyint NOT NULL DEFAULT 1,
	`inAppEnabled` tinyint NOT NULL DEFAULT 1,
	`recipientsMode` enum('role','explicit_emails','workflow_assignees','mixed') NOT NULL DEFAULT 'role',
	`roleIds` text,
	`explicitEmails` text,
	`templateId` int,
	`isActive` tinyint NOT NULL DEFAULT 1,
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
CREATE TABLE `notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`category` varchar(50) NOT NULL,
	`eventKey` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`nameAr` varchar(255),
	`emailEnabled` tinyint NOT NULL DEFAULT 1,
	`inAppEnabled` tinyint NOT NULL DEFAULT 1,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_preferences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `operating_units` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('hq','country','regional','field') NOT NULL,
	`country` varchar(100),
	`city` varchar(100),
	`currency` varchar(10) DEFAULT 'USD',
	`timezone` varchar(100) DEFAULT 'UTC',
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`code` varchar(50),
	`officeAdminName` varchar(255),
	`officeAdminEmail` varchar(320),
	`isDeleted` tinyint DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `operating_units_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `opportunities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`donorName` varchar(255) NOT NULL,
	`donorType` enum('UN','EU','INGO','Foundation','Government','Other') NOT NULL,
	`cfpLink` text,
	`interestArea` json NOT NULL,
	`geographicAreas` varchar(500) NOT NULL,
	`applicationDeadline` date NOT NULL,
	`allocatedBudget` decimal(15,2),
	`currency` varchar(10) NOT NULL DEFAULT 'USD',
	`isCoFunding` tinyint NOT NULL DEFAULT 0,
	`applicationLink` text,
	`fundingId` varchar(36),
	`projectManagerName` varchar(255),
	`projectManagerEmail` varchar(255),
	`notes` text,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `opportunities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `option_set_values` (
	`id` int AUTO_INCREMENT NOT NULL,
	`optionSetId` int NOT NULL,
	`label` varchar(255) NOT NULL,
	`labelAr` varchar(255),
	`value` varchar(255) NOT NULL,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
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
	`isSystem` tinyint NOT NULL DEFAULT 0,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
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
	`primaryColor` varchar(20),
	`secondaryColor` varchar(20),
	`headerText` varchar(255),
	`footerText` text,
	`customCss` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`systemName` varchar(255),
	`systemNameAr` varchar(255),
	`accentColor` varchar(50),
	`footerTextAr` text,
	`updatedBy` int,
	`organizationName` varchar(255),
	`organizationNameAr` varchar(255),
	CONSTRAINT `organization_branding_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`domain` varchar(255),
	`status` enum('active','suspended','inactive') NOT NULL DEFAULT 'active',
	`country` varchar(100),
	`timezone` varchar(100) DEFAULT 'UTC',
	`currency` varchar(10) DEFAULT 'USD',
	`notificationEmail` varchar(255),
	`defaultLanguage` varchar(10) NOT NULL DEFAULT 'en',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`nameAr` varchar(255),
	`shortCode` varchar(20),
	`tenantId` varchar(100),
	`primaryAdminId` int,
	`secondaryAdminId` int,
	`isDeleted` tinyint DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`microsoft365Enabled` tinyint NOT NULL DEFAULT 0,
	`onboardingStatus` enum('not_connected','pending_consent','connected','error') NOT NULL DEFAULT 'not_connected',
	`consentGrantedAt` timestamp,
	`connectedBy` int,
	`allowedDomains` text,
	`tenantVerified` tinyint NOT NULL DEFAULT 0,
	`onboardingToken` varchar(255),
	`onboardingTokenExpiry` timestamp,
	`onboardingLinkSentAt` timestamp,
	`onboardingLinkSentTo` varchar(255),
	`approvedEmailDomain` varchar(255),
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
CREATE TABLE `payment_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`paymentId` int NOT NULL,
	`lineNumber` int NOT NULL,
	`sourceType` enum('expense','invoice','advance','settlement','other') NOT NULL,
	`sourceId` int,
	`description` text,
	`descriptionAr` text,
	`amount` decimal(15,2) NOT NULL,
	`currencyId` int,
	`exchangeRate` decimal(15,6) DEFAULT '1.000000',
	`amountInBaseCurrency` decimal(15,2),
	`projectId` int,
	`grantId` int,
	`activityId` int,
	`budgetLineId` int,
	`glAccountId` int,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`operatingUnitId` int,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `payment_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int NOT NULL,
	`paymentNumber` varchar(50) NOT NULL,
	`paymentDate` date NOT NULL,
	`paymentType` enum('vendor','staff','advance','settlement','refund','other') NOT NULL,
	`paymentMethod` enum('cash','bank_transfer','cheque','mobile_money','wire') NOT NULL,
	`payeeType` enum('vendor','employee','other') NOT NULL,
	`payeeId` int,
	`payeeName` varchar(255) NOT NULL,
	`payeeNameAr` varchar(255),
	`bankAccountId` int,
	`chequeNumber` varchar(50),
	`chequeDate` date,
	`amount` decimal(15,2) NOT NULL,
	`currencyId` int,
	`exchangeRateId` int,
	`amountInBaseCurrency` decimal(15,2),
	`description` text,
	`descriptionAr` text,
	`projectId` int,
	`grantId` int,
	`status` enum('draft','pending_approval','approved','paid','cancelled','void') DEFAULT 'draft',
	`approvedBy` int,
	`approvedAt` timestamp,
	`paidBy` int,
	`paidAt` timestamp,
	`glAccountId` int,
	`journalEntryId` int,
	`postingStatus` enum('unposted','posted','reversed') DEFAULT 'unposted',
	`referenceNumber` varchar(100),
	`attachments` text,
	`voucherUrl` varchar(500),
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`deletedAt` timestamp,
	`deletedBy` int,
	`version` int NOT NULL DEFAULT 1,
	`parentId` int,
	`revisionReason` text,
	`isLatestVersion` tinyint NOT NULL DEFAULT 1,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
CREATE TABLE `physical_count_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_id` int NOT NULL,
	`item_id` int,
	`batch_id` int,
	`item_code` varchar(100),
	`item_name` varchar(300),
	`batch_number` varchar(100),
	`system_qty` decimal(15,4) DEFAULT '0',
	`counted_qty` decimal(15,4) DEFAULT '0',
	`variance_qty` decimal(15,4) DEFAULT '0',
	`variance_type` enum('match','surplus','shortage') DEFAULT 'match',
	`unit` varchar(50) DEFAULT 'Piece',
	`unit_cost` decimal(15,4) DEFAULT '0',
	`variance_value` decimal(15,4) DEFAULT '0',
	`notes` text,
	`created_at` bigint NOT NULL,
	CONSTRAINT `physical_count_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `physical_count_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organization_id` int NOT NULL,
	`operating_unit_id` int,
	`session_number` varchar(50) NOT NULL,
	`warehouse` varchar(200),
	`status` enum('draft','in_progress','reviewed','adjustments_generated','completed','cancelled') NOT NULL DEFAULT 'draft',
	`count_date` bigint NOT NULL,
	`counted_by` varchar(200),
	`reviewed_by` varchar(200),
	`reviewed_at` bigint,
	`total_items` int DEFAULT 0,
	`discrepancy_count` int DEFAULT 0,
	`surplus_count` int DEFAULT 0,
	`shortage_count` int DEFAULT 0,
	`adjustment_id` int,
	`notes` text,
	`created_by` varchar(100),
	`created_by_name` varchar(200),
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `physical_count_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pipeline_opportunities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`title` text NOT NULL,
	`donorName` varchar(255) NOT NULL,
	`donorType` enum('UN','EU','INGO','Foundation','Government','Other') NOT NULL,
	`fundingWindow` varchar(255),
	`deadline` date NOT NULL,
	`indicativeBudgetMin` decimal(15,2) NOT NULL,
	`indicativeBudgetMax` decimal(15,2) NOT NULL,
	`sectors` json NOT NULL,
	`country` varchar(100) NOT NULL,
	`governorate` varchar(255),
	`type` enum('opportunity','pipeline','proposal') NOT NULL DEFAULT 'pipeline',
	`stage` enum('Identified','Under Review','Go Decision','No-Go','Concept Requested','Proposal Requested','Proposal Development','Approved','Rejected') NOT NULL DEFAULT 'Identified',
	`probability` int NOT NULL DEFAULT 50,
	`statusHistory` json,
	`fundingId` varchar(36),
	`focalPoint` varchar(255),
	`projectManagerName` varchar(255),
	`projectManagerEmail` varchar(255),
	`notes` text,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `pipeline_opportunities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platform_email_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider_type` enum('m365','smtp','disabled') NOT NULL DEFAULT 'disabled',
	`tenant_id` varchar(255),
	`client_id` varchar(255),
	`client_secret` text,
	`sender_email` varchar(320),
	`sender_name` varchar(255) DEFAULT 'IMS Platform',
	`reply_to_email` varchar(320),
	`smtp_host` varchar(255),
	`smtp_port` int,
	`smtp_username` varchar(255),
	`smtp_password` text,
	`smtp_encryption` enum('tls','ssl','none') DEFAULT 'tls',
	`is_active` tinyint NOT NULL DEFAULT 0,
	`last_tested_at` timestamp,
	`last_test_status` enum('success','failed','pending'),
	`last_test_error` text,
	`created_by` int,
	`updated_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platform_email_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pr_budget_reservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchaseRequestId` int NOT NULL,
	`budgetLineId` int NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`deliveryNoteNumber` varchar(50),
	`reservationNumber` varchar(50),
	`reservationDate` timestamp DEFAULT (now()),
	`reservedAmount` decimal(15,2) NOT NULL,
	`currency` varchar(10) DEFAULT 'USD',
	`exchangeRate` decimal(15,6) DEFAULT '1.000000',
	`baseCurrencyAmount` decimal(15,2),
	`status` enum('active','converted_to_encumbrance','released','expired') DEFAULT 'active',
	`convertedToEncumbranceAt` timestamp,
	`releasedAt` timestamp,
	`expiryDate` timestamp,
	`createdBy` int,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pr_budget_reservations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `primary_handover` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organization_id` int NOT NULL,
	`monitoring_id` int NOT NULL,
	`handover_date` timestamp,
	`handover_description` text,
	`received_by` varchar(255),
	`delivered_by` varchar(255),
	`condition_notes` text,
	`attachments_url` text,
	`status` enum('draft','submitted','approved','rejected') NOT NULL DEFAULT 'draft',
	`approved_by` int,
	`approved_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_by` int,
	`updated_by` int,
	CONSTRAINT `primary_handover_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `procurement_audit_trail` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`documentType` enum('PR','RFQ','QA','BA','PO','GRN','ISSUE','TRANSFER','PAYMENT') NOT NULL,
	`documentId` int NOT NULL,
	`documentNumber` varchar(50),
	`actionType` varchar(100) NOT NULL,
	`fieldChanges` json,
	`userId` int,
	`userName` varchar(255),
	`userRole` varchar(100),
	`ipAddress` varchar(45),
	`userAgent` text,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `procurement_audit_trail_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `procurement_invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchaseRequestId` int NOT NULL,
	`purchaseOrderId` int,
	`contractId` int,
	`sacId` int,
	`grnId` int,
	`vendorId` int NOT NULL,
	`payableId` int,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`invoiceNumber` varchar(100) NOT NULL,
	`vendorInvoiceNumber` varchar(100),
	`invoiceDate` date NOT NULL,
	`invoiceAmount` decimal(15,2) NOT NULL,
	`currency` varchar(10) DEFAULT 'USD',
	`exchangeRate` decimal(15,6) DEFAULT '1.000000',
	`baseCurrencyAmount` decimal(15,2),
	`matchingStatus` enum('pending','matched','variance_detected','rejected') DEFAULT 'pending',
	`prAmount` decimal(15,2),
	`poAmount` decimal(15,2),
	`grnAmount` decimal(15,2),
	`varianceAmount` decimal(15,2),
	`varianceReason` text,
	`approvalStatus` enum('pending','approved','rejected') DEFAULT 'pending',
	`approvedBy` int,
	`approvedAt` timestamp,
	`rejectionReason` text,
	`paymentStatus` enum('unpaid','payment_scheduled','paid') DEFAULT 'unpaid',
	`paymentId` int,
	`paidAt` timestamp,
	`invoiceDocumentUrl` varchar(500),
	`createdBy` int,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `procurement_invoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `procurement_number_sequences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int NOT NULL,
	`documentType` enum('PR','RFQ','PO','GRN','BA','QA','CON') NOT NULL,
	`year` int NOT NULL,
	`currentSequence` int NOT NULL DEFAULT 0,
	`lastGeneratedNumber` varchar(50),
	`lastGeneratedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `procurement_number_sequences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `procurement_payables` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchaseRequestId` int NOT NULL,
	`purchaseOrderId` int,
	`contractId` int,
	`sacId` int,
	`vendorId` int NOT NULL,
	`encumbranceId` int,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`payableNumber` varchar(50),
	`payableDate` timestamp DEFAULT (now()),
	`totalAmount` decimal(15,2) NOT NULL,
	`currency` varchar(10) DEFAULT 'USD',
	`exchangeRate` decimal(15,6) DEFAULT '1.000000',
	`baseCurrencyAmount` decimal(15,2),
	`paymentTerms` varchar(255),
	`dueDate` date,
	`status` enum('draft','pending_grn','pending_invoice','pending_approval','pending_payment','partially_paid','fully_paid','cancelled') DEFAULT 'pending_invoice',
	`paidAmount` decimal(15,2) DEFAULT '0',
	`remainingAmount` decimal(15,2),
	`createdBy` int,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`grnId` int,
	`matching_status` enum('pending','matched','variance_detected') DEFAULT 'pending',
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `procurement_payables_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `procurement_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`purchaseOrderId` int,
	`supplierId` int,
	`paymentNumber` varchar(50) NOT NULL,
	`paymentDate` timestamp NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`currency` varchar(10) DEFAULT 'USD',
	`paymentMethod` enum('bank_transfer','check','cash','letter_of_credit') DEFAULT 'bank_transfer',
	`referenceNumber` varchar(100),
	`invoiceNumber` varchar(100),
	`description` text,
	`status` enum('pending','processed','completed','cancelled') NOT NULL DEFAULT 'pending',
	`processedBy` int,
	`processedAt` timestamp,
	`remarks` text,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `procurement_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `procurement_plan` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`activityId` int,
	`itemName` text NOT NULL,
	`itemNameAr` text,
	`description` text,
	`descriptionAr` text,
	`category` enum('GOODS','SERVICES','WORKS') NOT NULL DEFAULT 'GOODS',
	`subcategory` varchar(255),
	`quantity` decimal(15,2) NOT NULL,
	`unit` varchar(100) NOT NULL,
	`estimatedCost` decimal(15,2) NOT NULL,
	`actualCost` decimal(15,2) NOT NULL DEFAULT '0.00',
	`currency` enum('USD','EUR','GBP','CHF') NOT NULL DEFAULT 'USD',
	`plannedProcurementDate` date NOT NULL,
	`actualProcurementDate` date,
	`deliveryDate` date,
	`recurrence` enum('ONE_TIME','RECURRING') NOT NULL DEFAULT 'ONE_TIME',
	`procurementMethod` enum('ONE_QUOTATION','THREE_QUOTATION','NEGOTIABLE_QUOTATION','TENDER','DIRECT_PURCHASE','OTHER') NOT NULL DEFAULT 'ONE_QUOTATION',
	`status` enum('PLANNED','REQUESTED','APPROVED','IN_PROCUREMENT','ORDERED','DELIVERED','CANCELLED') NOT NULL DEFAULT 'PLANNED',
	`supplierName` varchar(255),
	`supplierContact` varchar(255),
	`budgetLine` varchar(255),
	`notes` text,
	`notesAr` text,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `procurement_plan_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_plan_activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`resultId` int,
	`activityTabId` int,
	`department` enum('Program','MEAL','Logistics','Finance','HR','Security','Other') NOT NULL DEFAULT 'Program',
	`code` varchar(50) NOT NULL,
	`title` text NOT NULL,
	`titleAr` text,
	`description` text,
	`responsible` varchar(255),
	`startDate` date,
	`endDate` date,
	`status` enum('Not Started','Ongoing','Completed') NOT NULL DEFAULT 'Not Started',
	`isSynced` tinyint NOT NULL DEFAULT 0,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `project_plan_activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_plan_objectives` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`code` varchar(50) NOT NULL,
	`title` text NOT NULL,
	`titleAr` text,
	`description` text,
	`status` enum('Not Started','Ongoing','Completed') NOT NULL DEFAULT 'Not Started',
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `project_plan_objectives_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_plan_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`objectiveId` int NOT NULL,
	`code` varchar(50) NOT NULL,
	`title` text NOT NULL,
	`titleAr` text,
	`description` text,
	`status` enum('Not Started','Ongoing','Completed') NOT NULL DEFAULT 'Not Started',
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `project_plan_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_plan_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`planActivityId` int NOT NULL,
	`taskTabId` int,
	`code` varchar(50) NOT NULL,
	`title` text NOT NULL,
	`titleAr` text,
	`responsible` varchar(255),
	`startDate` date,
	`endDate` date,
	`status` enum('Not Started','Ongoing','Completed') NOT NULL DEFAULT 'Not Started',
	`isSynced` tinyint NOT NULL DEFAULT 0,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `project_plan_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_reporting_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`reportType` enum('monthly','quarterly','semi_annual','annual','final','ad_hoc') NOT NULL,
	`reportTitle` varchar(500),
	`reportTitleAr` varchar(500),
	`description` text,
	`descriptionAr` text,
	`frequency` enum('once','monthly','quarterly','semi_annual','annual') NOT NULL,
	`dueDate` timestamp NOT NULL,
	`reminderDays` int DEFAULT 7,
	`status` enum('pending','in_progress','submitted','approved','rejected','overdue') NOT NULL DEFAULT 'pending',
	`submittedDate` timestamp,
	`approvedDate` timestamp,
	`submittedBy` int,
	`approvedBy` int,
	`notes` text,
	`notesAr` text,
	`attachments` json,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `project_reporting_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int NOT NULL,
	`grantId` int,
	`projectCode` varchar(100),
	`title` text,
	`titleEn` varchar(500),
	`titleAr` varchar(500),
	`description` text,
	`descriptionAr` text,
	`objectives` text,
	`objectivesAr` text,
	`status` enum('planning','active','on_hold','completed','cancelled') NOT NULL DEFAULT 'planning',
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`totalBudget` decimal(15,2),
	`spent` decimal(15,2),
	`currency` enum('USD','EUR','GBP','CHF'),
	`physicalProgressPercentage` decimal(5,2),
	`sectors` json,
	`donor` varchar(255),
	`implementingPartner` varchar(255),
	`location` varchar(255),
	`locationAr` varchar(255),
	`beneficiaryCount` int,
	`projectManager` int,
	`managerId` int,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int NOT NULL,
	`updatedBy` int,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `proposals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`pipelineOpportunityId` int,
	`proposalTitle` text NOT NULL,
	`donorName` varchar(255) NOT NULL,
	`callReference` varchar(255),
	`proposalType` enum('Concept Note','Full Proposal','Expression of Interest') NOT NULL,
	`country` varchar(100) NOT NULL,
	`governorate` varchar(255),
	`sectors` json NOT NULL,
	`projectDuration` int NOT NULL,
	`totalRequestedBudget` decimal(15,2) NOT NULL,
	`currency` enum('USD','EUR','GBP','CHF') NOT NULL DEFAULT 'USD',
	`submissionDeadline` date NOT NULL,
	`proposalStatus` enum('Draft','Under Internal Review','Submitted','Approved','Rejected','Withdrawn') NOT NULL DEFAULT 'Draft',
	`completionPercentage` int NOT NULL DEFAULT 0,
	`executiveSummary` text,
	`problemStatement` text,
	`objectives` json,
	`activities` json,
	`budget` json,
	`logframe` json,
	`fundingId` varchar(36),
	`leadWriter` varchar(255),
	`reviewers` json,
	`projectManagerName` varchar(255),
	`projectManagerEmail` varchar(255),
	`grantId` int,
	`projectId` int,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `proposals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pss_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`sessionDate` date NOT NULL,
	`sessionType` varchar(20) NOT NULL,
	`pssApproach` varchar(50),
	`facilitatorId` int,
	`facilitatorName` varchar(255),
	`duration` int,
	`keyObservations` text,
	`beneficiaryResponse` text,
	`nextSessionDate` date,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `pss_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_order_line_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchaseOrderId` int NOT NULL,
	`lineNumber` int NOT NULL,
	`description` text NOT NULL,
	`descriptionAr` text,
	`specifications` text,
	`quantity` decimal(10,2) NOT NULL,
	`unit` varchar(50) DEFAULT 'Piece',
	`unitPrice` decimal(15,2) DEFAULT '0',
	`totalPrice` decimal(15,2) DEFAULT '0',
	`deliveredQty` decimal(10,2) DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`qaLineItemId` int,
	`organizationId` int,
	`operatingUnitId` int,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `purchase_order_line_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int NOT NULL,
	`purchaseRequestId` int,
	`quotationAnalysisId` int,
	`bidAnalysisId` int,
	`supplierId` int,
	`poNumber` varchar(50) NOT NULL,
	`poDate` timestamp NOT NULL DEFAULT (now()),
	`deliveryDate` timestamp,
	`deliveryLocation` text,
	`deliveryLocationAr` text,
	`paymentTerms` varchar(255),
	`currency` varchar(10) DEFAULT 'USD',
	`subtotal` decimal(15,2) DEFAULT '0',
	`taxAmount` decimal(15,2) DEFAULT '0',
	`totalAmount` decimal(15,2) DEFAULT '0',
	`termsAndConditions` text,
	`notes` text,
	`status` enum('draft','sent','acknowledged','partially_delivered','delivered','completed','cancelled') NOT NULL DEFAULT 'draft',
	`sentAt` timestamp,
	`acknowledgedAt` timestamp,
	`approvedBy` int,
	`approvedAt` timestamp,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `purchase_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_request_line_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchaseRequestId` int NOT NULL,
	`lineNumber` int NOT NULL,
	`budgetLine` varchar(50),
	`description` text NOT NULL,
	`descriptionAr` text,
	`specifications` text,
	`specificationsAr` text,
	`quantity` decimal(10,2) NOT NULL,
	`unit` varchar(50) DEFAULT 'Piece',
	`unitPrice` decimal(15,2) DEFAULT '0',
	`totalPrice` decimal(15,2) DEFAULT '0',
	`recurrence` varchar(50) DEFAULT 'one-time',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchase_request_line_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`prNumber` varchar(50) NOT NULL,
	`category` enum('goods','services','works') NOT NULL DEFAULT 'goods',
	`projectId` int,
	`projectTitle` varchar(255) NOT NULL,
	`donorId` int,
	`donorName` varchar(255),
	`budgetId` int,
	`budgetLineId` int,
	`budgetCode` varchar(50),
	`budgetTitle` varchar(500),
	`subBudgetLine` varchar(255),
	`activityName` varchar(255),
	`totalBudgetLine` decimal(15,2) DEFAULT '0',
	`currency` varchar(10) DEFAULT 'USD',
	`exchangeRate` decimal(15,6) DEFAULT '1.000000',
	`exchangeTo` varchar(10) DEFAULT 'USD',
	`total` decimal(15,2) DEFAULT '0',
	`prTotalUsd` decimal(15,2) DEFAULT '0',
	`department` varchar(255),
	`requesterName` varchar(255) NOT NULL,
	`requesterEmail` varchar(320),
	`requesterId` int,
	`prDate` timestamp NOT NULL DEFAULT (now()),
	`urgency` enum('low','normal','high','critical') NOT NULL DEFAULT 'normal',
	`neededBy` timestamp,
	`justification` text,
	`procurementLadder` enum('one_quotation','three_quotations','public_tender','tender') DEFAULT 'three_quotations',
	`status` enum('draft','submitted','validated_by_logistic','rejected_by_logistic','validated_by_finance','rejected_by_finance','approved','rejected_by_pm') DEFAULT 'draft',
	`procurementStatus` enum('rfqs','quotations_analysis','tender_invitation','bids_analysis','purchase_order','delivery','grn','payment','completed'),
	`logValidatedBy` int,
	`logValidatedOn` timestamp,
	`logValidatorEmail` varchar(255),
	`finValidatedBy` int,
	`finValidatedOn` timestamp,
	`finValidatorEmail` varchar(255),
	`approvedBy` int,
	`approvedOn` timestamp,
	`approverEmail` varchar(255),
	`rejectReason` text,
	`rejectionStage` varchar(50),
	`pmRejectedBy` int,
	`pmRejectedOn` timestamp,
	`logRejectedBy` int,
	`logRejectedOn` timestamp,
	`finRejectedBy` int,
	`finRejectedOn` timestamp,
	`operatingUnitId` int NOT NULL,
	`organizationId` int NOT NULL,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`serviceType` varchar(50),
	`serviceTypeOther` varchar(255),
	`categoryLegacy` varchar(50),
	CONSTRAINT `purchase_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purge_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recordId` int NOT NULL,
	`recordType` varchar(100) NOT NULL,
	`scope` enum('platform','organization') NOT NULL,
	`organizationId` int,
	`operatingUnitId` int,
	`scheduledPurgeDate` bigint NOT NULL,
	`notificationSentAt` bigint,
	`notificationStatus` enum('pending','sent','failed') DEFAULT 'pending',
	`createdAt` bigint NOT NULL,
	CONSTRAINT `purge_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotation_analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int NOT NULL,
	`purchaseRequestId` int,
	`qaNumber` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`titleAr` varchar(255),
	`rfqDate` timestamp,
	`closingDate` timestamp,
	`selectedSupplierId` int,
	`selectionJustification` text,
	`evaluationReport` text,
	`status` enum('draft','rfq_sent','quotes_received','evaluated','approved','cancelled') NOT NULL DEFAULT 'draft',
	`approvedBy` int,
	`approvedAt` timestamp,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `quotation_analyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotation_analysis_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quotationAnalysisId` int NOT NULL,
	`supplierId` int,
	`lineItemId` int,
	`changeType` enum('price_adjustment','line_item_edit','total_offer_edit','supplier_edit') NOT NULL,
	`fieldName` varchar(100) NOT NULL,
	`oldValue` text,
	`newValue` text,
	`reason` text,
	`changedBy` int,
	`changedAt` timestamp DEFAULT (now()),
	CONSTRAINT `quotation_analysis_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotation_analysis_line_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quotationAnalysisId` int NOT NULL,
	`supplierId` int NOT NULL,
	`lineItemId` int NOT NULL,
	`unitPrice` decimal(15,2) DEFAULT '0',
	`totalPrice` decimal(15,2) DEFAULT '0',
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quotation_analysis_line_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotation_analysis_suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quotationAnalysisId` int NOT NULL,
	`supplierId` int,
	`supplierName` varchar(255),
	`quoteReference` varchar(100),
	`quoteDate` timestamp,
	`totalAmount` decimal(15,2) DEFAULT '0',
	`currency` varchar(10) DEFAULT 'USD',
	`deliveryDays` int,
	`paymentTerms` varchar(255),
	`warrantyMonths` int,
	`technicalScore` decimal(5,2),
	`financialScore` decimal(5,2),
	`totalScore` decimal(5,2),
	`isSelected` tinyint DEFAULT 0,
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`priceScore` decimal(5,2) DEFAULT '0',
	`deliveryScore` decimal(5,2) DEFAULT '0',
	`warrantyScore` decimal(5,2) DEFAULT '0',
	`technicalExperienceYears` int,
	`technicalCriterionScore` decimal(5,2) DEFAULT '0',
	`weightedTotalScore` decimal(5,2) DEFAULT '0',
	CONSTRAINT `quotation_analysis_suppliers_id` PRIMARY KEY(`id`)
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
	`isSystem` tinyint NOT NULL DEFAULT 0,
	`isLocked` tinyint NOT NULL DEFAULT 0,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
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
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `rbac_user_permissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reporting_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`grantId` int,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`reportType` enum('NARRATIVE','FINANCIAL','PROGRESS','FINAL','INTERIM','QUARTERLY','ANNUAL','OTHER') NOT NULL,
	`reportTypeOther` varchar(255),
	`periodFrom` date NOT NULL,
	`periodTo` date NOT NULL,
	`reportStatus` enum('NOT_STARTED','PLANNED','UNDER_PREPARATION','UNDER_REVIEW','SUBMITTED_TO_HQ','SUBMITTED_TO_DONOR') NOT NULL DEFAULT 'PLANNED',
	`reportDeadline` date NOT NULL,
	`notes` text,
	`isLocked` tinyint NOT NULL DEFAULT 0,
	`lockedAt` timestamp,
	`lockedBy` int,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `reporting_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `request_access_requests` (
	`id` varchar(50) NOT NULL,
	`full_name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`organization_name` varchar(255),
	`operating_unit_name` varchar(255),
	`job_title` varchar(255),
	`reason_for_access` text,
	`phone_number` varchar(50),
	`organization_id` int,
	`operating_unit_id` int,
	`request_type` varchar(50) NOT NULL DEFAULT 'organization_user',
	`requested_auth_provider` varchar(50),
	`requested_account_type` varchar(50),
	`requested_role` varchar(100),
	`provisioning_mode` varchar(50),
	`status` varchar(50) NOT NULL DEFAULT 'new',
	`review_decision` varchar(50),
	`reviewed_by` varchar(100),
	`reviewed_at` datetime,
	`review_notes` text,
	`review_comments` text,
	`routed_to_user_id` int,
	`routed_to_role` varchar(50),
	`routed_at` datetime,
	`fallback_to_platform_admin` tinyint DEFAULT 0,
	`provisioned_user_id` int,
	`provisioned_at` datetime,
	`created_at` datetime NOT NULL,
	`created_by` varchar(100) NOT NULL,
	`updated_at` datetime NOT NULL,
	`updated_by` varchar(100) NOT NULL,
	`deleted_at` datetime,
	`deleted_by` varchar(100),
	CONSTRAINT `request_access_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `retention_policies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` varchar(100) NOT NULL,
	`retentionDays` int,
	`description` text,
	`updatedAt` bigint NOT NULL,
	`updatedBy` int,
	CONSTRAINT `retention_policies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `returned_item_line_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`returnedItemId` int NOT NULL,
	`stockItemId` int,
	`lineNumber` int NOT NULL,
	`description` text NOT NULL,
	`returnedQty` decimal(10,2) NOT NULL,
	`acceptedQty` decimal(10,2) DEFAULT '0',
	`condition` enum('good','damaged','expired','defective') DEFAULT 'good',
	`unit` varchar(50) DEFAULT 'Piece',
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `returned_item_line_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `returned_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`returnNumber` varchar(50) NOT NULL,
	`returnDate` timestamp NOT NULL DEFAULT (now()),
	`returnedBy` varchar(255) NOT NULL,
	`department` varchar(255),
	`reason` text,
	`reasonAr` text,
	`status` enum('draft','submitted','inspected','accepted','rejected') NOT NULL DEFAULT 'draft',
	`inspectedBy` varchar(255),
	`inspectedAt` timestamp,
	`remarks` text,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `returned_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rfq_vendor_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rfqVendorId` int NOT NULL,
	`prLineItemId` int NOT NULL,
	`quotedUnitPrice` decimal(15,2) NOT NULL,
	`quotedTotalPrice` decimal(15,2) NOT NULL,
	`itemNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rfq_vendor_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rfq_vendors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`purchaseRequestId` int NOT NULL,
	`rfqId` int,
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
	`yearsOfExperience` int,
	`invitationStatus` enum('invited','declined','no_response') NOT NULL DEFAULT 'invited',
	`submissionStatus` enum('pending','submitted','late','withdrawn') NOT NULL DEFAULT 'pending',
	`quotationAttachment` text,
	`notes` text,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`supplierQuoteNumber` varchar(100),
	`isLatestSubmission` tinyint NOT NULL DEFAULT 1,
	CONSTRAINT `rfq_vendors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rfqs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`purchaseRequestId` int NOT NULL,
	`rfqNumber` varchar(50) NOT NULL,
	`issueDate` timestamp NOT NULL DEFAULT (now()),
	`dueDate` timestamp,
	`status` enum('draft','active','sent','received','cancelled') NOT NULL DEFAULT 'draft',
	`notes` text,
	`instructions` text,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `rfqs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `risk_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`riskId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`changeType` enum('created','status_changed','owner_changed','assessment_updated','mitigation_updated','closed','reopened','other') NOT NULL,
	`previousValue` text,
	`newValue` text,
	`description` text,
	`descriptionAr` text,
	`changedBy` int,
	`changedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `risk_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `risks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`riskCode` varchar(50),
	`title` varchar(255) NOT NULL,
	`titleAr` varchar(255),
	`description` text,
	`descriptionAr` text,
	`category` enum('operational','financial','strategic','compliance','reputational','technological','environmental','security','legal','other') NOT NULL,
	`likelihood` int NOT NULL,
	`impact` int NOT NULL,
	`score` int NOT NULL,
	`level` enum('low','medium','high','critical') NOT NULL,
	`status` enum('identified','assessed','mitigated','accepted','transferred','closed') NOT NULL DEFAULT 'identified',
	`mitigationPlan` text,
	`mitigationPlanAr` text,
	`mitigationProgress` int NOT NULL DEFAULT 0,
	`owner` int,
	`identifiedDate` date,
	`reviewDate` date,
	`targetClosureDate` date,
	`closedDate` date,
	`attachments` text,
	`notes` text,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`projectId` int,
	`activityId` int,
	`budgetItemId` int,
	`indicatorId` int,
	`isSystemGenerated` tinyint NOT NULL DEFAULT 0,
	`source` enum('finance','meal','activities','manual') NOT NULL DEFAULT 'manual',
	`triggerValue` varchar(255),
	`trendDirection` enum('increasing','improving','stable'),
	`lastEvaluatedAt` timestamp,
	`autoMitigationSuggestions` text,
	CONSTRAINT `risks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saml_idp_configurations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`provider` enum('okta','azure_ad','generic') NOT NULL,
	`name` varchar(255) NOT NULL,
	`entityId` varchar(255) NOT NULL,
	`singleSignOnUrl` varchar(255) NOT NULL,
	`singleLogoutUrl` varchar(255),
	`certificate` text NOT NULL,
	`metadataUrl` varchar(255),
	`oktaDomain` varchar(255),
	`azureTenantId` varchar(255),
	`azureClientId` varchar(255),
	`isEnabled` tinyint NOT NULL DEFAULT 1,
	`autoProvisionUsers` tinyint NOT NULL DEFAULT 1,
	`defaultRole` varchar(64) DEFAULT 'user',
	`attributeMapping` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `saml_idp_configurations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saml_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`organizationId` int NOT NULL,
	`samlProvider` enum('okta','azure_ad','generic') NOT NULL,
	`samlNameId` varchar(255) NOT NULL,
	`samlSessionIndex` varchar(255),
	`samlAttributes` json,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`lastAuthenticatedAt` timestamp,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `saml_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `service_acceptance_certificates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`contractId` int NOT NULL,
	`sacNumber` varchar(100) NOT NULL,
	`milestoneId` int,
	`deliverables` text NOT NULL,
	`acceptance_type` enum('SERVICE','WORKS') NOT NULL DEFAULT 'SERVICE',
	`approvedAmount` decimal(15,2) DEFAULT '0',
	`currency` varchar(10) DEFAULT 'USD',
	`acceptanceDate` timestamp NOT NULL,
	`acceptedBy` int,
	`status` enum('draft','pending_approval','approved','rejected') NOT NULL DEFAULT 'draft',
	`approvedBy` int,
	`approvedAt` timestamp,
	`rejectionReason` text,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`acceptance_text` text,
	`verified_boqs` tinyint NOT NULL DEFAULT 0,
	`verified_contract_terms` tinyint NOT NULL DEFAULT 0,
	`verified_deliverables_received` tinyint NOT NULL DEFAULT 0,
	`prepared_by_role` varchar(255),
	`signature_image_url` text,
	`signature_hash` varchar(255),
	`signed_at` timestamp,
	`signed_by` int,
	`deliverable_statuses` json,
	`submitted_at` timestamp,
	`submitted_by` int,
	`prepared_by_name` varchar(255),
	`verification_code` varchar(100),
	CONSTRAINT `service_acceptance_certificates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settlement_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`settlementId` int NOT NULL,
	`lineNumber` int NOT NULL,
	`description` text NOT NULL,
	`descriptionAr` text,
	`amount` decimal(15,2) NOT NULL,
	`currencyId` int,
	`exchangeRate` decimal(15,6) DEFAULT '1.000000',
	`amountInBaseCurrency` decimal(15,2),
	`expenseDate` date,
	`categoryId` int,
	`budgetLineId` int,
	`projectId` int,
	`grantId` int,
	`activityId` int,
	`glAccountId` int,
	`receiptNumber` varchar(100),
	`receiptDate` date,
	`vendorId` int,
	`vendorName` varchar(255),
	`attachments` text,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settlement_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_adjustment_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adjustmentId` int NOT NULL,
	`itemId` int,
	`batchId` int,
	`itemName` varchar(300),
	`batchNumber` varchar(100),
	`qtyBefore` decimal(15,4) DEFAULT '0',
	`qtyAdjusted` decimal(15,4) NOT NULL DEFAULT '0',
	`qtyAfter` decimal(15,4) DEFAULT '0',
	`unitCost` decimal(15,4) DEFAULT '0',
	`notes` text,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `stock_adjustment_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_adjustments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adjustmentNumber` varchar(50) NOT NULL,
	`type` enum('write_off','physical_count','damage','correction','donation','other') NOT NULL DEFAULT 'correction',
	`status` enum('draft','pending_approval','approved','rejected','cancelled') NOT NULL DEFAULT 'draft',
	`warehouse` varchar(200),
	`reason` text,
	`notes` text,
	`createdBy` varchar(100),
	`createdByName` varchar(200),
	`approvedBy` varchar(100),
	`approvedByName` varchar(200),
	`approvedAt` bigint,
	`rejectionReason` text,
	`organizationId` int,
	`operatingUnitId` int,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `stock_adjustments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_batches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`batchNumber` varchar(100) NOT NULL,
	`grnId` int,
	`grnLineItemId` int,
	`poId` int,
	`vendorId` int,
	`itemId` int NOT NULL,
	`warehouseId` int,
	`warehouseName` varchar(255),
	`receivedQty` decimal(15,2) NOT NULL DEFAULT '0',
	`acceptedQty` decimal(15,2) NOT NULL DEFAULT '0',
	`reservedQty` decimal(15,2) NOT NULL DEFAULT '0',
	`issuedQty` decimal(15,2) NOT NULL DEFAULT '0',
	`lossAdjustments` decimal(15,2) NOT NULL DEFAULT '0',
	`returnsAccepted` decimal(15,2) NOT NULL DEFAULT '0',
	`expiryDate` timestamp,
	`lotNumber` varchar(100),
	`serialNumber` varchar(100),
	`unitCost` decimal(15,2) NOT NULL DEFAULT '0',
	`batchStatus` enum('available','reserved','depleted','expired','quarantined') NOT NULL DEFAULT 'available',
	`receivedDate` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stock_batches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_issue_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`issueId` int NOT NULL,
	`itemId` int NOT NULL,
	`batchId` int NOT NULL,
	`qtyIssued` decimal(15,2) NOT NULL,
	`unit` varchar(50) DEFAULT 'Piece',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stock_issue_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_issued` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`stockRequestId` int,
	`issueNumber` varchar(50) NOT NULL,
	`issueDate` timestamp NOT NULL DEFAULT (now()),
	`issuedTo` varchar(255) NOT NULL,
	`issuedBy` varchar(255),
	`department` varchar(255),
	`remarks` text,
	`status` enum('draft','issued','acknowledged','cancelled') NOT NULL DEFAULT 'draft',
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `stock_issued_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_issued_line_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stockIssuedId` int NOT NULL,
	`stockItemId` int,
	`lineNumber` int NOT NULL,
	`description` text NOT NULL,
	`issuedQty` decimal(10,2) NOT NULL,
	`unit` varchar(50) DEFAULT 'Piece',
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stock_issued_line_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_issues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`issueNumber` varchar(50) NOT NULL,
	`issueDate` timestamp NOT NULL DEFAULT (now()),
	`issuedTo` varchar(255) NOT NULL,
	`issuedToType` enum('person','department','project','activity') NOT NULL DEFAULT 'person',
	`projectId` int,
	`activityId` int,
	`departmentId` int,
	`warehouseId` int,
	`warehouseName` varchar(255),
	`purpose` text,
	`status` enum('draft','submitted','issued','acknowledged','cancelled') NOT NULL DEFAULT 'draft',
	`issuedBy` int,
	`acknowledgedBy` varchar(255),
	`acknowledgedAt` timestamp,
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stock_issues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`itemCode` varchar(50) NOT NULL,
	`itemName` varchar(255) NOT NULL,
	`itemNameAr` varchar(255),
	`description` text,
	`category` varchar(100),
	`unitType` varchar(50) DEFAULT 'Piece',
	`currentQuantity` decimal(15,2) DEFAULT '0',
	`minimumQuantity` decimal(15,2) DEFAULT '0',
	`maximumQuantity` decimal(15,2),
	`reorderLevel` decimal(15,2),
	`warehouseLocation` varchar(255),
	`binLocation` varchar(100),
	`expiryDate` timestamp,
	`batchNumber` varchar(100),
	`serialNumber` varchar(100),
	`unitCost` decimal(15,2) DEFAULT '0',
	`totalValue` decimal(15,2) DEFAULT '0',
	`currency` varchar(10) DEFAULT 'USD',
	`isDamaged` tinyint DEFAULT 0,
	`isExpired` tinyint DEFAULT 0,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	CONSTRAINT `stock_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_ledger` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`movementType` enum('GRN_IN','ISSUE_OUT','TRANSFER_OUT','TRANSFER_IN','ADJUSTMENT_IN','ADJUSTMENT_OUT','RETURN_IN','LOSS') NOT NULL,
	`referenceType` enum('GRN','ISSUE','TRANSFER','ADJUSTMENT','RETURN') NOT NULL,
	`referenceId` int NOT NULL,
	`referenceNumber` varchar(50),
	`warehouseId` int,
	`warehouseName` varchar(255),
	`batchId` int NOT NULL,
	`itemId` int NOT NULL,
	`qtyChange` decimal(15,2) NOT NULL,
	`unit` varchar(50) DEFAULT 'Piece',
	`unitCost` decimal(15,2) DEFAULT '0',
	`totalValue` decimal(15,2) DEFAULT '0',
	`userId` int,
	`notes` text,
	`transactionDate` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stock_ledger_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_request_line_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stockRequestId` int NOT NULL,
	`stockItemId` int,
	`lineNumber` int NOT NULL,
	`description` text NOT NULL,
	`requestedQty` decimal(10,2) NOT NULL,
	`approvedQty` decimal(10,2) DEFAULT '0',
	`issuedQty` decimal(10,2) DEFAULT '0',
	`unit` varchar(50) DEFAULT 'Piece',
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stock_request_line_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`requestNumber` varchar(50) NOT NULL,
	`requestDate` timestamp NOT NULL DEFAULT (now()),
	`requesterName` varchar(255) NOT NULL,
	`requesterDepartment` varchar(255),
	`purpose` text,
	`purposeAr` text,
	`neededByDate` timestamp,
	`status` enum('draft','submitted','approved','partially_issued','issued','rejected','cancelled') NOT NULL DEFAULT 'draft',
	`approvedBy` int,
	`approvedAt` timestamp,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `stock_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_reservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`batchId` int NOT NULL,
	`itemId` int NOT NULL,
	`reservedQty` decimal(15,2) NOT NULL,
	`reservedFor` varchar(255) NOT NULL,
	`reservationType` enum('issue_pending','transfer_pending','project_allocation') NOT NULL DEFAULT 'issue_pending',
	`referenceId` int,
	`reservedBy` int,
	`reservedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	`status` enum('active','fulfilled','expired','cancelled') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stock_reservations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplier_quotation_headers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchaseRequestId` int NOT NULL,
	`vendorId` int,
	`bidAnalysisBidderId` int,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`quotationReference` varchar(100),
	`quotationDate` timestamp,
	`currency` varchar(10) DEFAULT 'USD',
	`totalAmount` decimal(15,2) DEFAULT '0',
	`status` enum('draft','submitted','under_review','accepted','rejected') DEFAULT 'draft',
	`attachmentUrl` text,
	`attachmentName` varchar(255),
	`notes` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `supplier_quotation_headers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplier_quotation_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quotationHeaderId` int NOT NULL,
	`prLineItemId` int NOT NULL,
	`itemDescriptionSnapshot` text NOT NULL,
	`specificationsSnapshot` text,
	`quantity` decimal(10,2) NOT NULL,
	`unit` varchar(50) DEFAULT 'Piece',
	`unitPrice` decimal(15,2) DEFAULT '0',
	`lineTotal` decimal(15,2) DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplier_quotation_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `systemImportReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`projectId` int,
	`module` varchar(100) NOT NULL,
	`importType` enum('create','update') NOT NULL DEFAULT 'create',
	`userId` int,
	`userName` varchar(255),
	`userRole` varchar(50),
	`importSummary` json NOT NULL,
	`errorDetails` json NOT NULL,
	`errorFilePath` varchar(500),
	`originalFilePath` varchar(500),
	`status` enum('open','reviewed','resolved') NOT NULL DEFAULT 'open',
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`resolutionNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `systemImportReports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(255) NOT NULL,
	`settingValue` text,
	`updatedAt` bigint NOT NULL,
	`updatedBy` int,
	CONSTRAINT `system_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`taskName` text NOT NULL,
	`taskNameAr` text,
	`description` text,
	`descriptionAr` text,
	`status` enum('TODO','IN_PROGRESS','REVIEW','DONE','BLOCKED') NOT NULL DEFAULT 'TODO',
	`priority` enum('LOW','MEDIUM','HIGH','URGENT') NOT NULL DEFAULT 'MEDIUM',
	`dueDate` date,
	`startDate` date,
	`completedDate` date,
	`assignedByEmail` varchar(320),
	`assignedByName` varchar(255),
	`assignedToEmail` varchar(320),
	`assignedToName` varchar(255),
	`assignmentDate` timestamp,
	`assignedTo` int,
	`progressPercentage` decimal(5,2) NOT NULL DEFAULT '0.00',
	`tags` json,
	`category` varchar(255),
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trip_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`vehicleId` int NOT NULL,
	`driverId` int,
	`tripNumber` varchar(50) NOT NULL,
	`tripDate` timestamp NOT NULL,
	`purpose` text,
	`purposeAr` text,
	`startLocation` varchar(255),
	`endLocation` varchar(255),
	`startMileage` decimal(10,2),
	`endMileage` decimal(10,2),
	`distanceTraveled` decimal(10,2),
	`startTime` timestamp,
	`endTime` timestamp,
	`passengers` text,
	`projectCode` varchar(50),
	`status` enum('planned','in_progress','completed','cancelled') NOT NULL DEFAULT 'planned',
	`remarks` text,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `trip_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `two_factor_auth` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`organizationId` int NOT NULL,
	`method` enum('totp','sms') NOT NULL,
	`secret` varchar(255) NOT NULL,
	`phoneNumber` varchar(20),
	`isEnabled` tinyint NOT NULL DEFAULT 0,
	`isVerified` tinyint NOT NULL DEFAULT 0,
	`backupCodes` json,
	`lastUsedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `two_factor_auth_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `two_factor_challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`organizationId` int NOT NULL,
	`challengeId` varchar(255) NOT NULL,
	`method` enum('totp','sms') NOT NULL,
	`code` varchar(10),
	`attemptCount` int NOT NULL DEFAULT 0,
	`maxAttempts` int NOT NULL DEFAULT 3,
	`isVerified` tinyint NOT NULL DEFAULT 0,
	`expiresAt` timestamp NOT NULL,
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`deletedAt` timestamp,
	CONSTRAINT `two_factor_challenges_id` PRIMARY KEY(`id`),
	CONSTRAINT `two_factor_challenges_challengeId_unique` UNIQUE(`challengeId`)
);
--> statement-breakpoint
CREATE TABLE `unit_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`nameAr` varchar(100),
	`category` enum('goods','time_based','programmatic') NOT NULL,
	`description` text,
	`descriptionAr` text,
	`active` tinyint NOT NULL DEFAULT 1,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `unit_types_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_active_scope` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int NOT NULL,
	`lastUpdated` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `user_active_scope_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_archive_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`action` enum('delete','restore') NOT NULL,
	`userSnapshot` text NOT NULL,
	`previousRoles` text,
	`previousOrganizations` text,
	`previousPermissions` text,
	`reason` text,
	`performedBy` int NOT NULL,
	`performedByName` varchar(255),
	`performedAt` timestamp NOT NULL DEFAULT (now()),
	`restorationMetadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_archive_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_operating_units` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`operatingUnitId` int NOT NULL,
	`role` enum('organization_admin','user') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_operating_units_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`organizationId` int NOT NULL,
	`tenantId` varchar(36),
	`platformRole` enum('platform_admin','organization_admin','user') NOT NULL DEFAULT 'user',
	`orgRoles` text,
	`permissions` text,
	`modulePermissions` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`role` varchar(50) DEFAULT 'user',
	CONSTRAINT `user_organizations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_permission_overrides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`organizationId` int NOT NULL,
	`moduleId` varchar(100) NOT NULL,
	`screenId` varchar(100),
	`action` varchar(50) NOT NULL,
	`overrideType` enum('grant','revoke') NOT NULL,
	`reason` text,
	`expiresAt` timestamp,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_permission_overrides_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64),
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`authenticationProvider` varchar(64) DEFAULT 'email',
	`externalIdentityId` varchar(255),
	`microsoftObjectId` varchar(255),
	`isActive` tinyint NOT NULL DEFAULT 1,
	`role` enum('platform_super_admin','platform_admin','platform_auditor','organization_admin','user','admin','manager') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	`organizationId` int,
	`currentOrganizationId` int,
	`languagePreference` varchar(10),
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`deletionReason` text,
	`passwordResetToken` varchar(255),
	`passwordResetExpiry` bigint,
	`passwordHash` varchar(255),
	`emailVerified` tinyint NOT NULL DEFAULT 0,
	`emailVerifiedAt` timestamp,
	`failedLoginAttempts` int NOT NULL DEFAULT 0,
	`lockedUntil` timestamp,
	CONSTRAINT `users_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `variance_alert_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`warningThreshold` decimal(5,2) NOT NULL DEFAULT '10.00',
	`criticalThreshold` decimal(5,2) NOT NULL DEFAULT '20.00',
	`isEnabled` tinyint NOT NULL DEFAULT 1,
	`notifyProjectManager` tinyint NOT NULL DEFAULT 1,
	`notifyFinanceTeam` tinyint NOT NULL DEFAULT 1,
	`notifyOwner` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `variance_alert_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `variance_alert_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`budgetItemId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`budgetCode` varchar(100) NOT NULL,
	`budgetItem` text NOT NULL,
	`totalBudget` decimal(15,2) NOT NULL,
	`actualSpent` decimal(15,2) NOT NULL,
	`varianceAmount` decimal(15,2) NOT NULL,
	`variancePercentage` decimal(5,2) NOT NULL,
	`alertLevel` enum('warning','critical') NOT NULL,
	`notificationSent` tinyint NOT NULL DEFAULT 0,
	`notificationError` text,
	`acknowledgedAt` timestamp,
	`acknowledgedBy` int,
	`acknowledgedNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `variance_alert_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `variance_alert_thresholds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`name` varchar(200) NOT NULL,
	`nameAr` varchar(200),
	`description` text,
	`scope` enum('organization','project','grant','category') NOT NULL DEFAULT 'organization',
	`projectId` int,
	`grantId` int,
	`category` varchar(100),
	`thresholdPercentage` decimal(5,2) NOT NULL DEFAULT '5.00',
	`alertType` enum('budget_exceeded','threshold_exceeded','forecast_variance') NOT NULL DEFAULT 'threshold_exceeded',
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`notifyOwner` tinyint NOT NULL DEFAULT 1,
	`notifyProjectManager` tinyint NOT NULL DEFAULT 1,
	`notifyFinanceTeam` tinyint NOT NULL DEFAULT 1,
	`emailNotification` tinyint NOT NULL DEFAULT 1,
	`inAppNotification` tinyint NOT NULL DEFAULT 1,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdBy` int,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `variance_alert_thresholds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `variance_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`projectId` int,
	`grantId` int,
	`budgetId` int,
	`category` varchar(100),
	`alertType` enum('budget_exceeded','threshold_exceeded','forecast_variance') NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`budgetAmount` decimal(15,2) NOT NULL,
	`actualAmount` decimal(15,2) NOT NULL,
	`variance` decimal(15,2) NOT NULL,
	`variancePercentage` decimal(5,2) NOT NULL,
	`thresholdPercentage` decimal(5,2) NOT NULL,
	`status` enum('active','acknowledged','resolved','dismissed') NOT NULL DEFAULT 'active',
	`acknowledgedBy` int,
	`acknowledgedAt` datetime,
	`resolvedBy` int,
	`resolvedAt` datetime,
	`notificationSent` tinyint NOT NULL DEFAULT 0,
	`notificationSentAt` datetime,
	`description` text,
	`notes` text,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `variance_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vehicle_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicleId` int NOT NULL,
	`driverId` int NOT NULL,
	`assignedFrom` timestamp NOT NULL,
	`assignedTo` timestamp,
	`isPrimary` tinyint DEFAULT 0,
	`status` enum('active','ended') NOT NULL DEFAULT 'active',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vehicle_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vehicle_compliance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicleId` int NOT NULL,
	`complianceType` enum('insurance','registration','inspection','permit','other') NOT NULL,
	`documentNumber` varchar(100),
	`issueDate` timestamp,
	`expiryDate` timestamp,
	`issuingAuthority` varchar(255),
	`cost` decimal(10,2),
	`currency` varchar(10) DEFAULT 'USD',
	`documentUrl` text,
	`status` enum('valid','expiring_soon','expired','pending') NOT NULL DEFAULT 'valid',
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vehicle_compliance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vehicle_maintenance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`vehicleId` int NOT NULL,
	`maintenanceNumber` varchar(50) NOT NULL,
	`maintenanceType` enum('scheduled','unscheduled','repair','inspection') DEFAULT 'scheduled',
	`description` text,
	`descriptionAr` text,
	`scheduledDate` timestamp,
	`completedDate` timestamp,
	`mileageAtService` decimal(10,2),
	`vendor` varchar(255),
	`laborCost` decimal(10,2) DEFAULT '0',
	`partsCost` decimal(10,2) DEFAULT '0',
	`totalCost` decimal(10,2) DEFAULT '0',
	`currency` varchar(10) DEFAULT 'USD',
	`invoiceNumber` varchar(100),
	`status` enum('scheduled','in_progress','completed','cancelled') NOT NULL DEFAULT 'scheduled',
	`remarks` text,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `vehicle_maintenance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`vehicleId` varchar(50),
	`plateNumber` varchar(50) NOT NULL,
	`vehicleType` varchar(100),
	`brand` varchar(100),
	`model` varchar(100),
	`year` int,
	`color` varchar(50),
	`chassisNumber` varchar(100),
	`engineNumber` varchar(100),
	`fuelType` enum('petrol','diesel','electric','hybrid') DEFAULT 'petrol',
	`ownership` enum('owned','leased','rented') DEFAULT 'owned',
	`purchaseDate` timestamp,
	`purchaseValue` decimal(15,2),
	`currency` varchar(10),
	`assignedProjectId` int,
	`assignedProject` varchar(255),
	`assignedDriverId` int,
	`assignedDriverName` varchar(255),
	`status` enum('active','under_maintenance','retired','disposed') NOT NULL DEFAULT 'active',
	`currentOdometer` decimal(15,2),
	`insuranceExpiry` timestamp,
	`licenseExpiry` timestamp,
	`inspectionExpiry` timestamp,
	`notes` text,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	CONSTRAINT `vehicles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendor_blacklist_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int NOT NULL,
	`caseId` int NOT NULL,
	`userId` int NOT NULL,
	`userName` varchar(255),
	`actionType` enum('case_created','case_updated','case_submitted','validation_performed','approval_signed','case_approved','case_rejected','case_revoked','case_expired','evidence_uploaded','evidence_removed','signature_added','signature_revoked','comment_added') NOT NULL,
	`previousStatus` varchar(50),
	`newStatus` varchar(50),
	`details` text,
	`ipAddress` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vendor_blacklist_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendor_blacklist_cases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int NOT NULL,
	`vendorId` int NOT NULL,
	`caseNumber` varchar(50) NOT NULL,
	`status` enum('draft','submitted','under_validation','pending_approval','approved','rejected','revoked','expired') NOT NULL DEFAULT 'draft',
	`reasonCategory` enum('fraud_falsified_docs','corruption_bribery','sanctions_screening_failure','repeated_non_performance','contract_abandonment','repeated_delivery_failure','refusal_correct_defects','false_declarations','conflict_of_interest','other') NOT NULL,
	`detailedJustification` text NOT NULL,
	`incidentDate` date,
	`relatedReference` varchar(255),
	`recommendedDuration` varchar(100),
	`blacklistStartDate` date,
	`reviewDate` date,
	`expiryDate` date,
	`additionalComments` text,
	`revocationReason` text,
	`revokedAt` timestamp,
	`revokedBy` int,
	`submittedAt` timestamp,
	`submittedBy` int,
	`validatedAt` timestamp,
	`validatedBy` int,
	`approvedAt` timestamp,
	`approvedBy` int,
	`rejectedAt` timestamp,
	`rejectedBy` int,
	`rejectionReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `vendor_blacklist_cases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendor_blacklist_evidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int NOT NULL,
	`caseId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(500),
	`fileType` varchar(100),
	`fileSize` int,
	`description` text,
	`uploadedBy` int NOT NULL,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `vendor_blacklist_evidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendor_blacklist_signatures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int NOT NULL,
	`caseId` int NOT NULL,
	`signerId` int NOT NULL,
	`signerName` varchar(255) NOT NULL,
	`signerRole` varchar(100) NOT NULL,
	`signatureImageUrl` text,
	`signatureImageKey` varchar(500),
	`signatureHash` varchar(512),
	`ipAddress` varchar(45),
	`userAgent` text,
	`signedAt` timestamp NOT NULL DEFAULT (now()),
	`status` enum('active','revoked') NOT NULL DEFAULT 'active',
	`revocationReason` text,
	`revokedAt` timestamp,
	`revokedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vendor_blacklist_signatures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
	`isExpired` tinyint DEFAULT 0,
	`isVerified` tinyint DEFAULT 0,
	`verifiedBy` int,
	`verifiedAt` timestamp,
	`notes` text,
	`uploadedBy` int,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vendor_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendor_evaluation_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`evaluationId` int NOT NULL,
	`sectionNumber` int NOT NULL,
	`checklistItemKey` varchar(100) NOT NULL,
	`checklistItemLabel` varchar(500) NOT NULL,
	`maxScore` decimal(5,2) NOT NULL,
	`rating` int,
	`score` decimal(5,2),
	`notes` text,
	`documentUrls` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vendor_evaluation_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendor_evaluations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendorId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`evaluatorId` int,
	`evaluationDate` timestamp NOT NULL,
	`totalScore` decimal(7,2),
	`classification` enum('preferred','approved','conditional','rejected'),
	`riskLevel` enum('low','medium','high','critical'),
	`section1Score` decimal(5,2) DEFAULT '0',
	`section2Score` decimal(5,2) DEFAULT '0',
	`section3Score` decimal(5,2) DEFAULT '0',
	`section4Score` decimal(5,2) DEFAULT '0',
	`section5Score` decimal(5,2) DEFAULT '0',
	`section6Score` decimal(5,2) DEFAULT '0',
	`notes` text,
	`justification` text,
	`status` enum('draft','pending_compliance','pending_finance','pending_final','approved','rejected') NOT NULL DEFAULT 'draft',
	`approvedBy` int,
	`approvedAt` timestamp,
	`version` int NOT NULL DEFAULT 1,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `vendor_evaluations_id` PRIMARY KEY(`id`)
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
	`isWinner` tinyint DEFAULT 0,
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
CREATE TABLE `vendor_procurement_baselines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendorId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`bidAnalysisId` int,
	`purchaseRequestId` int,
	`prNumber` varchar(100),
	`cbaNumber` varchar(100),
	`legalAdminScore` decimal(5,2),
	`experienceTechnicalScore` decimal(5,2),
	`operationalFinancialScore` decimal(5,2),
	`referencesScore` decimal(5,2),
	`totalBidAmount` decimal(15,2),
	`currency` varchar(10),
	`qualificationOutcome` enum('qualified','disqualified','conditional') DEFAULT 'qualified',
	`isFirstParticipation` tinyint DEFAULT 1,
	`participationDate` timestamp NOT NULL,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `vendor_procurement_baselines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendor_qualification_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendorId` int NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`evaluatorId` int,
	`evaluationDate` timestamp NOT NULL,
	`s1_companyRegistration` decimal(5,2) DEFAULT '0',
	`s1_taxCard` decimal(5,2) DEFAULT '0',
	`s1_insuranceCard` decimal(5,2) DEFAULT '0',
	`s1_signedDeclarations` decimal(5,2) DEFAULT '0',
	`s1_sanctionsScreening` decimal(5,2) DEFAULT '0',
	`section1Total` decimal(5,2) DEFAULT '0',
	`s2_companyProfile` decimal(5,2) DEFAULT '0',
	`s2_yearsExperience` decimal(5,2) DEFAULT '0',
	`s2_ingoExperience` decimal(5,2) DEFAULT '0',
	`section2Total` decimal(5,2) DEFAULT '0',
	`s3_targetGeography` decimal(5,2) DEFAULT '0',
	`s3_bankAccountDetails` decimal(5,2) DEFAULT '0',
	`section3Total` decimal(5,2) DEFAULT '0',
	`s4_references` decimal(5,2) DEFAULT '0',
	`section4Total` decimal(5,2) DEFAULT '0',
	`totalScore` decimal(5,2) DEFAULT '0',
	`qualificationStatus` enum('qualified','not_qualified','conditional','pending') DEFAULT 'pending',
	`notes` text,
	`custom_sections` json,
	`validity_months` int NOT NULL DEFAULT 12,
	`expiry_date` timestamp,
	`approval_status` enum('draft','pending_procurement','pending_compliance','pending_finance','pending_final','pending_logistics','pending_manager','approved','rejected') NOT NULL DEFAULT 'draft',
	`current_approval_stage` varchar(50),
	`procurement_approved_by` int,
	`procurement_approved_at` timestamp,
	`procurement_notes` text,
	`compliance_approved_by` int,
	`compliance_approved_at` timestamp,
	`compliance_notes` text,
	`finance_approved_by` int,
	`finance_approved_at` timestamp,
	`finance_notes` text,
	`final_approved_by` int,
	`final_approved_at` timestamp,
	`final_notes` text,
	`logistics_approved_by` int,
	`logistics_approved_at` timestamp,
	`logistics_notes` text,
	`logistics_signature_url` text,
	`logistics_signature_hash` varchar(128),
	`manager_approved_by` int,
	`manager_approved_at` timestamp,
	`manager_notes` text,
	`manager_signature_url` text,
	`manager_signature_hash` varchar(128),
	`version` int NOT NULL DEFAULT 1,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `vendor_qualification_scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`vendorCode` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`nameAr` varchar(255),
	`vendorType` enum('supplier','contractor','service_provider','consultant','other') DEFAULT 'supplier',
	`taxId` varchar(50),
	`registrationNumber` varchar(100),
	`contactPerson` varchar(255),
	`email` varchar(255),
	`phone` varchar(50),
	`mobile` varchar(50),
	`fax` varchar(50),
	`website` varchar(255),
	`addressLine1` varchar(255),
	`addressLine2` varchar(255),
	`city` varchar(100),
	`state` varchar(100),
	`country` varchar(100),
	`postalCode` varchar(20),
	`bankName` varchar(255),
	`bankBranch` varchar(255),
	`bankAccountNumber` varchar(100),
	`bankAccountName` varchar(255),
	`iban` varchar(50),
	`swiftCode` varchar(20),
	`currencyId` int,
	`paymentTerms` varchar(100),
	`creditLimit` decimal(15,2),
	`currentBalance` decimal(15,2) DEFAULT '0.00',
	`glAccountId` int,
	`isActive` tinyint DEFAULT 1,
	`isPreferred` tinyint DEFAULT 0,
	`isBlacklisted` tinyint DEFAULT 0,
	`blacklistReason` text,
	`isFinanciallyActive` tinyint DEFAULT 0,
	`approvalStatus` enum('pending','pending_approval','approved','rejected') DEFAULT 'pending',
	`performanceRating` decimal(5,2),
	`legalName` varchar(255),
	`legalNameAr` varchar(255),
	`totalPRParticipations` int DEFAULT 0,
	`totalContractsAwarded` int DEFAULT 0,
	`onTimeDeliveryRate` decimal(5,2),
	`qualityRating` decimal(5,2),
	`notes` text,
	`attachments` text,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `vendors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `warehouse_alert_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organization_id` int NOT NULL,
	`operating_unit_id` int,
	`warehouse_id` int,
	`warehouse_name` varchar(255) NOT NULL,
	`category` varchar(100),
	`threshold_days` int NOT NULL DEFAULT 30,
	`frequency` enum('daily','weekly','biweekly','monthly') NOT NULL DEFAULT 'daily',
	`enabled` tinyint NOT NULL DEFAULT 1,
	`notify_email` tinyint DEFAULT 0,
	`notify_in_app` tinyint DEFAULT 1,
	`last_alert_sent_at` bigint,
	`created_by` varchar(200),
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `warehouse_alert_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `warehouse_transfer_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transferId` int NOT NULL,
	`itemId` int NOT NULL,
	`batchId` int NOT NULL,
	`qtyRequested` decimal(15,2) NOT NULL,
	`qtyDispatched` decimal(15,2) DEFAULT '0',
	`qtyReceived` decimal(15,2) DEFAULT '0',
	`unit` varchar(50) DEFAULT 'Piece',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `warehouse_transfer_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `warehouse_transfers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`transferNumber` varchar(50) NOT NULL,
	`fromWarehouseId` int,
	`fromWarehouseName` varchar(255) NOT NULL,
	`toWarehouseId` int,
	`toWarehouseName` varchar(255) NOT NULL,
	`projectId` int,
	`requestDate` timestamp NOT NULL DEFAULT (now()),
	`status` enum('draft','submitted','approved','dispatched','received','completed','cancelled') NOT NULL DEFAULT 'draft',
	`createdBy` int,
	`approvedBy` int,
	`dispatchedBy` int,
	`receivedBy` int,
	`approvedAt` timestamp,
	`dispatchedAt` timestamp,
	`receivedAt` timestamp,
	`completedAt` timestamp,
	`notes` text,
	`estimated_arrival_date` timestamp,
	`actual_arrival_date` timestamp,
	`tracking_notes` text,
	`carrier_name` varchar(200),
	`tracking_reference` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `warehouse_transfers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_log_export_history` ADD CONSTRAINT `audit_log_export_history_scheduleId_audit_log_export_schedules_id_fk` FOREIGN KEY (`scheduleId`) REFERENCES `audit_log_export_schedules`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_log_export_history` ADD CONSTRAINT `audit_log_export_history_triggeredBy_users_id_fk` FOREIGN KEY (`triggeredBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_log_export_schedules` ADD CONSTRAINT `audit_log_export_schedules_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `beneficiaries` ADD CONSTRAINT `beneficiaries_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `beneficiaries` ADD CONSTRAINT `beneficiaries_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `beneficiaries` ADD CONSTRAINT `beneficiaries_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `beneficiaries` ADD CONSTRAINT `beneficiaries_activityId_activities_id_fk` FOREIGN KEY (`activityId`) REFERENCES `activities`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `beneficiaries` ADD CONSTRAINT `beneficiaries_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `beneficiaries` ADD CONSTRAINT `beneficiaries_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `beneficiaries` ADD CONSTRAINT `beneficiaries_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_analyses` ADD CONSTRAINT `bid_analyses_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_analyses` ADD CONSTRAINT `bid_analyses_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_analyses` ADD CONSTRAINT `bid_analyses_purchaseRequestId_purchase_requests_id_fk` FOREIGN KEY (`purchaseRequestId`) REFERENCES `purchase_requests`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_analyses` ADD CONSTRAINT `bid_analyses_selectedBidderId_vendors_id_fk` FOREIGN KEY (`selectedBidderId`) REFERENCES `vendors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_analyses` ADD CONSTRAINT `bid_analyses_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_analyses` ADD CONSTRAINT `bid_analyses_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_analyses` ADD CONSTRAINT `bid_analyses_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_analyses` ADD CONSTRAINT `bid_analyses_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_analysis_bidders` ADD CONSTRAINT `bid_analysis_bidders_bidAnalysisId_bid_analyses_id_fk` FOREIGN KEY (`bidAnalysisId`) REFERENCES `bid_analyses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_analysis_bidders` ADD CONSTRAINT `bid_analysis_bidders_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_analysis_bidders` ADD CONSTRAINT `bid_analysis_bidders_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_analysis_bidders` ADD CONSTRAINT `bid_analysis_bidders_supplierId_vendors_id_fk` FOREIGN KEY (`supplierId`) REFERENCES `vendors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_analysis_bidders` ADD CONSTRAINT `bid_analysis_bidders_acknowledgementPrintedBy_users_id_fk` FOREIGN KEY (`acknowledgementPrintedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_analysis_line_items` ADD CONSTRAINT `bid_analysis_line_items_bidAnalysisId_bid_analyses_id_fk` FOREIGN KEY (`bidAnalysisId`) REFERENCES `bid_analyses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_analysis_line_items` ADD CONSTRAINT `bid_analysis_line_items_bidderId_bid_analysis_bidders_id_fk` FOREIGN KEY (`bidderId`) REFERENCES `bid_analysis_bidders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_analysis_line_items` ADD CONSTRAINT `bid_analysis_line_items_prLineItemId_purchase_request_line_items_id_fk` FOREIGN KEY (`prLineItemId`) REFERENCES `purchase_request_line_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_analysis_line_items` ADD CONSTRAINT `bid_analysis_line_items_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_analysis_line_items` ADD CONSTRAINT `bid_analysis_line_items_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_analysis_line_items` ADD CONSTRAINT `bid_analysis_line_items_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_evaluation_criteria` ADD CONSTRAINT `bid_evaluation_criteria_bidAnalysisId_bid_analyses_id_fk` FOREIGN KEY (`bidAnalysisId`) REFERENCES `bid_analyses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_evaluation_scores` ADD CONSTRAINT `bid_evaluation_scores_bidAnalysisId_bid_analyses_id_fk` FOREIGN KEY (`bidAnalysisId`) REFERENCES `bid_analyses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_evaluation_scores` ADD CONSTRAINT `bid_evaluation_scores_criterionId_bid_evaluation_criteria_id_fk` FOREIGN KEY (`criterionId`) REFERENCES `bid_evaluation_criteria`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_evaluation_scores` ADD CONSTRAINT `bid_evaluation_scores_bidderId_bid_analysis_bidders_id_fk` FOREIGN KEY (`bidderId`) REFERENCES `bid_analysis_bidders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_opening_minutes` ADD CONSTRAINT `bid_opening_minutes_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_opening_minutes` ADD CONSTRAINT `bid_opening_minutes_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_opening_minutes` ADD CONSTRAINT `bid_opening_minutes_purchaseRequestId_purchase_requests_id_fk` FOREIGN KEY (`purchaseRequestId`) REFERENCES `purchase_requests`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_opening_minutes` ADD CONSTRAINT `bid_opening_minutes_bidAnalysisId_bid_analyses_id_fk` FOREIGN KEY (`bidAnalysisId`) REFERENCES `bid_analyses`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `blacklist_workflow_config` ADD CONSTRAINT `blacklist_workflow_config_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bom_approval_signatures` ADD CONSTRAINT `bom_approval_signatures_bomId_bid_opening_minutes_id_fk` FOREIGN KEY (`bomId`) REFERENCES `bid_opening_minutes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bom_approval_signatures` ADD CONSTRAINT `bom_approval_signatures_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bom_approval_signatures` ADD CONSTRAINT `bom_approval_signatures_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bom_approval_signatures` ADD CONSTRAINT `bom_approval_signatures_signedByUserId_users_id_fk` FOREIGN KEY (`signedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_items` ADD CONSTRAINT `budget_items_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_items` ADD CONSTRAINT `budget_items_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_items` ADD CONSTRAINT `budget_items_activityId_activities_id_fk` FOREIGN KEY (`activityId`) REFERENCES `activities`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_lines` ADD CONSTRAINT `budget_lines_budgetId_budgets_id_fk` FOREIGN KEY (`budgetId`) REFERENCES `budgets`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_lines` ADD CONSTRAINT `budget_lines_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_lines` ADD CONSTRAINT `budget_lines_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_lines` ADD CONSTRAINT `budget_lines_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_lines` ADD CONSTRAINT `budget_lines_categoryId_finance_budget_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `finance_budget_categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_lines` ADD CONSTRAINT `budget_lines_accountId_chart_of_accounts_id_fk` FOREIGN KEY (`accountId`) REFERENCES `chart_of_accounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_lines` ADD CONSTRAINT `budget_lines_activityId_activities_id_fk` FOREIGN KEY (`activityId`) REFERENCES `activities`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_lines` ADD CONSTRAINT `budget_lines_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_lines` ADD CONSTRAINT `budget_lines_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_lines` ADD CONSTRAINT `budget_lines_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_monthly_allocations` ADD CONSTRAINT `budget_monthly_allocations_budgetLineId_budget_lines_id_fk` FOREIGN KEY (`budgetLineId`) REFERENCES `budget_lines`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_monthly_allocations` ADD CONSTRAINT `budget_monthly_allocations_budgetId_budgets_id_fk` FOREIGN KEY (`budgetId`) REFERENCES `budgets`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_monthly_allocations` ADD CONSTRAINT `budget_monthly_allocations_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_monthly_allocations` ADD CONSTRAINT `budget_monthly_allocations_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_activities` ADD CONSTRAINT `case_activities_caseId_case_records_id_fk` FOREIGN KEY (`caseId`) REFERENCES `case_records`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_activities` ADD CONSTRAINT `case_activities_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_activities` ADD CONSTRAINT `case_activities_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_activities` ADD CONSTRAINT `case_activities_linkedActivityId_activities_id_fk` FOREIGN KEY (`linkedActivityId`) REFERENCES `activities`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_activities` ADD CONSTRAINT `case_activities_linkedIndicatorId_indicators_id_fk` FOREIGN KEY (`linkedIndicatorId`) REFERENCES `indicators`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_activities` ADD CONSTRAINT `case_activities_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_records` ADD CONSTRAINT `case_records_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_records` ADD CONSTRAINT `case_records_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_records` ADD CONSTRAINT `case_records_assignedPssOfficerId_users_id_fk` FOREIGN KEY (`assignedPssOfficerId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_records` ADD CONSTRAINT `case_records_assignedCaseWorkerId_users_id_fk` FOREIGN KEY (`assignedCaseWorkerId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_records` ADD CONSTRAINT `case_records_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_records` ADD CONSTRAINT `case_records_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_records` ADD CONSTRAINT `case_records_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_referrals` ADD CONSTRAINT `case_referrals_caseId_case_records_id_fk` FOREIGN KEY (`caseId`) REFERENCES `case_records`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_referrals` ADD CONSTRAINT `case_referrals_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_referrals` ADD CONSTRAINT `case_referrals_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_referrals` ADD CONSTRAINT `case_referrals_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chart_of_accounts` ADD CONSTRAINT `chart_of_accounts_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chart_of_accounts` ADD CONSTRAINT `chart_of_accounts_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chart_of_accounts` ADD CONSTRAINT `chart_of_accounts_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chart_of_accounts` ADD CONSTRAINT `chart_of_accounts_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `child_safe_spaces` ADD CONSTRAINT `child_safe_spaces_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `child_safe_spaces` ADD CONSTRAINT `child_safe_spaces_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `child_safe_spaces` ADD CONSTRAINT `child_safe_spaces_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `css_activities` ADD CONSTRAINT `css_activities_cssId_child_safe_spaces_id_fk` FOREIGN KEY (`cssId`) REFERENCES `child_safe_spaces`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `css_activities` ADD CONSTRAINT `css_activities_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `css_activities` ADD CONSTRAINT `css_activities_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `css_activities` ADD CONSTRAINT `css_activities_facilitatorId_users_id_fk` FOREIGN KEY (`facilitatorId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `css_activities` ADD CONSTRAINT `css_activities_linkedCaseId_case_records_id_fk` FOREIGN KEY (`linkedCaseId`) REFERENCES `case_records`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `css_activities` ADD CONSTRAINT `css_activities_linkedIndicatorId_indicators_id_fk` FOREIGN KEY (`linkedIndicatorId`) REFERENCES `indicators`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `css_activities` ADD CONSTRAINT `css_activities_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_note_lines` ADD CONSTRAINT `delivery_note_lines_dnId_delivery_notes_id_fk` FOREIGN KEY (`dnId`) REFERENCES `delivery_notes`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_note_lines` ADD CONSTRAINT `delivery_note_lines_poLineItemId_purchase_order_line_items_id_fk` FOREIGN KEY (`poLineItemId`) REFERENCES `purchase_order_line_items`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_notes` ADD CONSTRAINT `delivery_notes_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_notes` ADD CONSTRAINT `delivery_notes_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_notes` ADD CONSTRAINT `delivery_notes_poId_purchase_orders_id_fk` FOREIGN KEY (`poId`) REFERENCES `purchase_orders`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_notes` ADD CONSTRAINT `delivery_notes_grnId_goods_receipt_notes_id_fk` FOREIGN KEY (`grnId`) REFERENCES `goods_receipt_notes`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_notes` ADD CONSTRAINT `delivery_notes_vendorId_vendors_id_fk` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_notes` ADD CONSTRAINT `delivery_notes_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donor_budget_mapping` ADD CONSTRAINT `donor_budget_mapping_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donor_budget_mapping` ADD CONSTRAINT `donor_budget_mapping_internalCategoryId_finance_budget_categories_id_fk` FOREIGN KEY (`internalCategoryId`) REFERENCES `finance_budget_categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donor_budget_mapping` ADD CONSTRAINT `donor_budget_mapping_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donor_budget_mapping` ADD CONSTRAINT `donor_budget_mapping_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donor_projects` ADD CONSTRAINT `donor_projects_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donor_projects` ADD CONSTRAINT `donor_projects_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donor_projects` ADD CONSTRAINT `donor_projects_donorId_donors_id_fk` FOREIGN KEY (`donorId`) REFERENCES `donors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donor_projects` ADD CONSTRAINT `donor_projects_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donor_projects` ADD CONSTRAINT `donor_projects_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donor_projects` ADD CONSTRAINT `donor_projects_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donor_projects` ADD CONSTRAINT `donor_projects_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `drivers` ADD CONSTRAINT `drivers_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `drivers` ADD CONSTRAINT `drivers_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `drivers` ADD CONSTRAINT `drivers_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `drivers` ADD CONSTRAINT `drivers_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_dead_letter_queue` ADD CONSTRAINT `email_dead_letter_queue_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_dead_letter_queue` ADD CONSTRAINT `email_dead_letter_queue_outboxId_email_outbox_id_fk` FOREIGN KEY (`outboxId`) REFERENCES `email_outbox`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_delivery_status` ADD CONSTRAINT `email_delivery_status_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_delivery_status` ADD CONSTRAINT `email_delivery_status_outboxId_email_outbox_id_fk` FOREIGN KEY (`outboxId`) REFERENCES `email_outbox`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_outbox` ADD CONSTRAINT `email_outbox_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_provider_config` ADD CONSTRAINT `email_provider_config_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_template_ab_test` ADD CONSTRAINT `email_template_ab_test_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_template_ab_test` ADD CONSTRAINT `email_template_ab_test_templateId_email_templates_id_fk` FOREIGN KEY (`templateId`) REFERENCES `email_templates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_template_ab_test` ADD CONSTRAINT `email_template_ab_test_versionAId_email_template_version_id_fk` FOREIGN KEY (`versionAId`) REFERENCES `email_template_version`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_template_ab_test` ADD CONSTRAINT `email_template_ab_test_versionBId_email_template_version_id_fk` FOREIGN KEY (`versionBId`) REFERENCES `email_template_version`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_template_version` ADD CONSTRAINT `email_template_version_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_template_version` ADD CONSTRAINT `email_template_version_templateId_email_templates_id_fk` FOREIGN KEY (`templateId`) REFERENCES `email_templates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_templates` ADD CONSTRAINT `email_templates_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_webhook_events` ADD CONSTRAINT `email_webhook_events_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_webhook_events` ADD CONSTRAINT `email_webhook_events_outboxId_email_outbox_id_fk` FOREIGN KEY (`outboxId`) REFERENCES `email_outbox`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_budgetItemId_budget_items_id_fk` FOREIGN KEY (`budgetItemId`) REFERENCES `budget_items`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_advances` ADD CONSTRAINT `finance_advances_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_advances` ADD CONSTRAINT `finance_advances_employeeId_hr_employees_id_fk` FOREIGN KEY (`employeeId`) REFERENCES `hr_employees`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_advances` ADD CONSTRAINT `finance_advances_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_advances` ADD CONSTRAINT `finance_advances_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_advances` ADD CONSTRAINT `finance_advances_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_advances` ADD CONSTRAINT `finance_advances_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_advances` ADD CONSTRAINT `finance_advances_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_approval_thresholds` ADD CONSTRAINT `finance_approval_thresholds_approverUserId_users_id_fk` FOREIGN KEY (`approverUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_approval_thresholds` ADD CONSTRAINT `finance_approval_thresholds_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_approval_thresholds` ADD CONSTRAINT `finance_approval_thresholds_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_asset_categories` ADD CONSTRAINT `finance_asset_categories_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_asset_categories` ADD CONSTRAINT `finance_asset_categories_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_asset_disposals` ADD CONSTRAINT `finance_asset_disposals_assetId_finance_assets_id_fk` FOREIGN KEY (`assetId`) REFERENCES `finance_assets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_asset_disposals` ADD CONSTRAINT `finance_asset_disposals_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_asset_disposals` ADD CONSTRAINT `finance_asset_disposals_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_asset_disposals` ADD CONSTRAINT `finance_asset_disposals_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_asset_disposals` ADD CONSTRAINT `finance_asset_disposals_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_asset_maintenance` ADD CONSTRAINT `finance_asset_maintenance_assetId_finance_assets_id_fk` FOREIGN KEY (`assetId`) REFERENCES `finance_assets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_asset_maintenance` ADD CONSTRAINT `finance_asset_maintenance_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_asset_maintenance` ADD CONSTRAINT `finance_asset_maintenance_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_asset_maintenance` ADD CONSTRAINT `finance_asset_maintenance_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_asset_transfers` ADD CONSTRAINT `finance_asset_transfers_assetId_finance_assets_id_fk` FOREIGN KEY (`assetId`) REFERENCES `finance_assets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_asset_transfers` ADD CONSTRAINT `finance_asset_transfers_fromAssigneeUserId_users_id_fk` FOREIGN KEY (`fromAssigneeUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_asset_transfers` ADD CONSTRAINT `finance_asset_transfers_toAssigneeUserId_users_id_fk` FOREIGN KEY (`toAssigneeUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_asset_transfers` ADD CONSTRAINT `finance_asset_transfers_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_asset_transfers` ADD CONSTRAINT `finance_asset_transfers_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_asset_transfers` ADD CONSTRAINT `finance_asset_transfers_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_asset_transfers` ADD CONSTRAINT `finance_asset_transfers_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_assets` ADD CONSTRAINT `finance_assets_categoryId_finance_asset_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `finance_asset_categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_assets` ADD CONSTRAINT `finance_assets_assignedToUserId_users_id_fk` FOREIGN KEY (`assignedToUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_assets` ADD CONSTRAINT `finance_assets_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_assets` ADD CONSTRAINT `finance_assets_disposalApprovedBy_users_id_fk` FOREIGN KEY (`disposalApprovedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_assets` ADD CONSTRAINT `finance_assets_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_expenditure_categories` ADD CONSTRAINT `finance_expenditure_categories_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_expenditure_categories` ADD CONSTRAINT `finance_expenditure_categories_glAccountId_chart_of_accounts_id_fk` FOREIGN KEY (`glAccountId`) REFERENCES `chart_of_accounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_expenditures` ADD CONSTRAINT `finance_expenditures_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_expenditures` ADD CONSTRAINT `finance_expenditures_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_expenditures` ADD CONSTRAINT `finance_expenditures_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_expenditures` ADD CONSTRAINT `finance_expenditures_budgetLineId_budget_lines_id_fk` FOREIGN KEY (`budgetLineId`) REFERENCES `budget_lines`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_expenditures` ADD CONSTRAINT `finance_expenditures_currencyId_finance_currencies_id_fk` FOREIGN KEY (`currencyId`) REFERENCES `finance_currencies`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_expenditures` ADD CONSTRAINT `finance_expenditures_exchangeRateId_finance_exchange_rates_id_fk` FOREIGN KEY (`exchangeRateId`) REFERENCES `finance_exchange_rates`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_expenditures` ADD CONSTRAINT `finance_expenditures_categoryId_finance_expenditure_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `finance_expenditure_categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_expenditures` ADD CONSTRAINT `finance_expenditures_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_expenditures` ADD CONSTRAINT `finance_expenditures_glAccountId_chart_of_accounts_id_fk` FOREIGN KEY (`glAccountId`) REFERENCES `chart_of_accounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_expenditures` ADD CONSTRAINT `finance_expenditures_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_expenditures` ADD CONSTRAINT `finance_expenditures_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_expenditures` ADD CONSTRAINT `finance_expenditures_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `landing_settings` ADD CONSTRAINT `landing_settings_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `landing_settings` ADD CONSTRAINT `landing_settings_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_dqa_actions` ADD CONSTRAINT `meal_dqa_actions_dqaFindingId_meal_dqa_findings_id_fk` FOREIGN KEY (`dqaFindingId`) REFERENCES `meal_dqa_findings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_dqa_findings` ADD CONSTRAINT `meal_dqa_findings_dqaVisitId_meal_dqa_visits_id_fk` FOREIGN KEY (`dqaVisitId`) REFERENCES `meal_dqa_visits`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meal_learning_actions` ADD CONSTRAINT `meal_learning_actions_learningItemId_meal_learning_items_id_fk` FOREIGN KEY (`learningItemId`) REFERENCES `meal_learning_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mitigation_action_attachments` ADD CONSTRAINT `mitigation_action_attachments_actionId_mitigation_actions_id_fk` FOREIGN KEY (`actionId`) REFERENCES `mitigation_actions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mitigation_action_attachments` ADD CONSTRAINT `mitigation_action_attachments_uploadedBy_users_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mitigation_action_comments` ADD CONSTRAINT `mitigation_action_comments_actionId_mitigation_actions_id_fk` FOREIGN KEY (`actionId`) REFERENCES `mitigation_actions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mitigation_action_comments` ADD CONSTRAINT `mitigation_action_comments_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mitigation_actions` ADD CONSTRAINT `mitigation_actions_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mitigation_actions` ADD CONSTRAINT `mitigation_actions_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mitigation_actions` ADD CONSTRAINT `mitigation_actions_riskId_risks_id_fk` FOREIGN KEY (`riskId`) REFERENCES `risks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mitigation_actions` ADD CONSTRAINT `mitigation_actions_assignedTo_users_id_fk` FOREIGN KEY (`assignedTo`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mitigation_actions` ADD CONSTRAINT `mitigation_actions_assignedBy_users_id_fk` FOREIGN KEY (`assignedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mitigation_actions` ADD CONSTRAINT `mitigation_actions_verifiedBy_users_id_fk` FOREIGN KEY (`verifiedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mitigation_actions` ADD CONSTRAINT `mitigation_actions_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mitigation_templates` ADD CONSTRAINT `mitigation_templates_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mitigation_templates` ADD CONSTRAINT `mitigation_templates_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monthly_report_audit_history` ADD CONSTRAINT `monthly_report_audit_history_monthlyReportId_monthly_reports_id_fk` FOREIGN KEY (`monthlyReportId`) REFERENCES `monthly_reports`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monthly_report_audit_history` ADD CONSTRAINT `monthly_report_audit_history_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monthly_report_audit_history` ADD CONSTRAINT `monthly_report_audit_history_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monthly_report_audit_history` ADD CONSTRAINT `monthly_report_audit_history_performedBy_users_id_fk` FOREIGN KEY (`performedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monthly_reports` ADD CONSTRAINT `monthly_reports_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monthly_reports` ADD CONSTRAINT `monthly_reports_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monthly_reports` ADD CONSTRAINT `monthly_reports_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monthly_reports` ADD CONSTRAINT `monthly_reports_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monthly_reports` ADD CONSTRAINT `monthly_reports_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monthly_reports` ADD CONSTRAINT `monthly_reports_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_preferences` ADD CONSTRAINT `notification_preferences_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `operating_units` ADD CONSTRAINT `operating_units_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `option_set_values` ADD CONSTRAINT `option_set_values_optionSetId_option_sets_id_fk` FOREIGN KEY (`optionSetId`) REFERENCES `option_sets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `option_set_values` ADD CONSTRAINT `option_set_values_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `option_sets` ADD CONSTRAINT `option_sets_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `option_sets` ADD CONSTRAINT `option_sets_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payable_approval_history` ADD CONSTRAINT `payable_approval_history_payableId_procurement_payables_id_fk` FOREIGN KEY (`payableId`) REFERENCES `procurement_payables`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payable_approval_history` ADD CONSTRAINT `payable_approval_history_actionBy_users_id_fk` FOREIGN KEY (`actionBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `permission_reviews` ADD CONSTRAINT `permission_reviews_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `permission_reviews` ADD CONSTRAINT `permission_reviews_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `permission_reviews` ADD CONSTRAINT `permission_reviews_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `procurement_audit_trail` ADD CONSTRAINT `procurement_audit_trail_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `procurement_audit_trail` ADD CONSTRAINT `procurement_audit_trail_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `procurement_audit_trail` ADD CONSTRAINT `procurement_audit_trail_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_reporting_schedules` ADD CONSTRAINT `project_reporting_schedules_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_reporting_schedules` ADD CONSTRAINT `project_reporting_schedules_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_reporting_schedules` ADD CONSTRAINT `project_reporting_schedules_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_reporting_schedules` ADD CONSTRAINT `project_reporting_schedules_submittedBy_users_id_fk` FOREIGN KEY (`submittedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_reporting_schedules` ADD CONSTRAINT `project_reporting_schedules_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_reporting_schedules` ADD CONSTRAINT `project_reporting_schedules_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order_line_items` ADD CONSTRAINT `purchase_order_line_items_qaLineItemId_quotation_analysis_line_items_id_fk` FOREIGN KEY (`qaLineItemId`) REFERENCES `quotation_analysis_line_items`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order_line_items` ADD CONSTRAINT `purchase_order_line_items_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order_line_items` ADD CONSTRAINT `purchase_order_line_items_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order_line_items` ADD CONSTRAINT `purchase_order_line_items_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotation_analysis_audit_log` ADD CONSTRAINT `quotation_analysis_audit_log_quotationAnalysisId_quotation_analyses_id_fk` FOREIGN KEY (`quotationAnalysisId`) REFERENCES `quotation_analyses`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotation_analysis_audit_log` ADD CONSTRAINT `quotation_analysis_audit_log_changedBy_users_id_fk` FOREIGN KEY (`changedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotation_analysis_line_items` ADD CONSTRAINT `quotation_analysis_line_items_quotationAnalysisId_quotation_analyses_id_fk` FOREIGN KEY (`quotationAnalysisId`) REFERENCES `quotation_analyses`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotation_analysis_line_items` ADD CONSTRAINT `quotation_analysis_line_items_supplierId_quotation_analysis_suppliers_id_fk` FOREIGN KEY (`supplierId`) REFERENCES `quotation_analysis_suppliers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotation_analysis_line_items` ADD CONSTRAINT `quotation_analysis_line_items_lineItemId_purchase_request_line_items_id_fk` FOREIGN KEY (`lineItemId`) REFERENCES `purchase_request_line_items`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rbac_roles` ADD CONSTRAINT `rbac_roles_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rbac_roles` ADD CONSTRAINT `rbac_roles_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rbac_roles` ADD CONSTRAINT `rbac_roles_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rbac_user_permissions` ADD CONSTRAINT `rbac_user_permissions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rbac_user_permissions` ADD CONSTRAINT `rbac_user_permissions_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rbac_user_permissions` ADD CONSTRAINT `rbac_user_permissions_roleId_rbac_roles_id_fk` FOREIGN KEY (`roleId`) REFERENCES `rbac_roles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rbac_user_permissions` ADD CONSTRAINT `rbac_user_permissions_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rfq_vendor_items` ADD CONSTRAINT `rfq_vendor_items_rfqVendorId_rfq_vendors_id_fk` FOREIGN KEY (`rfqVendorId`) REFERENCES `rfq_vendors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rfq_vendor_items` ADD CONSTRAINT `rfq_vendor_items_prLineItemId_purchase_request_line_items_id_fk` FOREIGN KEY (`prLineItemId`) REFERENCES `purchase_request_line_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rfq_vendors` ADD CONSTRAINT `rfq_vendors_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rfq_vendors` ADD CONSTRAINT `rfq_vendors_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rfq_vendors` ADD CONSTRAINT `rfq_vendors_purchaseRequestId_purchase_requests_id_fk` FOREIGN KEY (`purchaseRequestId`) REFERENCES `purchase_requests`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rfq_vendors` ADD CONSTRAINT `rfq_vendors_supplierId_vendors_id_fk` FOREIGN KEY (`supplierId`) REFERENCES `vendors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rfq_vendors` ADD CONSTRAINT `rfq_vendors_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rfq_vendors` ADD CONSTRAINT `rfq_vendors_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rfq_vendors` ADD CONSTRAINT `rfq_vendors_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rfqs` ADD CONSTRAINT `rfqs_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rfqs` ADD CONSTRAINT `rfqs_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rfqs` ADD CONSTRAINT `rfqs_purchaseRequestId_purchase_requests_id_fk` FOREIGN KEY (`purchaseRequestId`) REFERENCES `purchase_requests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rfqs` ADD CONSTRAINT `rfqs_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rfqs` ADD CONSTRAINT `rfqs_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rfqs` ADD CONSTRAINT `rfqs_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `risk_history` ADD CONSTRAINT `risk_history_riskId_risks_id_fk` FOREIGN KEY (`riskId`) REFERENCES `risks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `risk_history` ADD CONSTRAINT `risk_history_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `risk_history` ADD CONSTRAINT `risk_history_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `risk_history` ADD CONSTRAINT `risk_history_changedBy_users_id_fk` FOREIGN KEY (`changedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_batches` ADD CONSTRAINT `stock_batches_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_batches` ADD CONSTRAINT `stock_batches_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_batches` ADD CONSTRAINT `stock_batches_grnLineItemId_grn_line_items_id_fk` FOREIGN KEY (`grnLineItemId`) REFERENCES `grn_line_items`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_batches` ADD CONSTRAINT `stock_batches_itemId_stock_items_id_fk` FOREIGN KEY (`itemId`) REFERENCES `stock_items`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_issue_lines` ADD CONSTRAINT `stock_issue_lines_issueId_stock_issues_id_fk` FOREIGN KEY (`issueId`) REFERENCES `stock_issues`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_issue_lines` ADD CONSTRAINT `stock_issue_lines_itemId_stock_items_id_fk` FOREIGN KEY (`itemId`) REFERENCES `stock_items`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_issue_lines` ADD CONSTRAINT `stock_issue_lines_batchId_stock_batches_id_fk` FOREIGN KEY (`batchId`) REFERENCES `stock_batches`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_issues` ADD CONSTRAINT `stock_issues_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_issues` ADD CONSTRAINT `stock_issues_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_issues` ADD CONSTRAINT `stock_issues_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_issues` ADD CONSTRAINT `stock_issues_issuedBy_users_id_fk` FOREIGN KEY (`issuedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_ledger` ADD CONSTRAINT `stock_ledger_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_ledger` ADD CONSTRAINT `stock_ledger_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_ledger` ADD CONSTRAINT `stock_ledger_batchId_stock_batches_id_fk` FOREIGN KEY (`batchId`) REFERENCES `stock_batches`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_ledger` ADD CONSTRAINT `stock_ledger_itemId_stock_items_id_fk` FOREIGN KEY (`itemId`) REFERENCES `stock_items`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_ledger` ADD CONSTRAINT `stock_ledger_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_reservations` ADD CONSTRAINT `stock_reservations_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_reservations` ADD CONSTRAINT `stock_reservations_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_reservations` ADD CONSTRAINT `stock_reservations_batchId_stock_batches_id_fk` FOREIGN KEY (`batchId`) REFERENCES `stock_batches`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_reservations` ADD CONSTRAINT `stock_reservations_itemId_stock_items_id_fk` FOREIGN KEY (`itemId`) REFERENCES `stock_items`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_reservations` ADD CONSTRAINT `stock_reservations_reservedBy_users_id_fk` FOREIGN KEY (`reservedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_active_scope` ADD CONSTRAINT `user_active_scope_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_active_scope` ADD CONSTRAINT `user_active_scope_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_active_scope` ADD CONSTRAINT `user_active_scope_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_archive_log` ADD CONSTRAINT `user_archive_log_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_archive_log` ADD CONSTRAINT `user_archive_log_performedBy_users_id_fk` FOREIGN KEY (`performedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_permission_overrides` ADD CONSTRAINT `user_permission_overrides_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_permission_overrides` ADD CONSTRAINT `user_permission_overrides_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_permission_overrides` ADD CONSTRAINT `user_permission_overrides_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variance_alert_config` ADD CONSTRAINT `variance_alert_config_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variance_alert_config` ADD CONSTRAINT `variance_alert_config_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variance_alert_config` ADD CONSTRAINT `variance_alert_config_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variance_alert_config` ADD CONSTRAINT `variance_alert_config_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variance_alert_config` ADD CONSTRAINT `variance_alert_config_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variance_alert_history` ADD CONSTRAINT `variance_alert_history_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variance_alert_history` ADD CONSTRAINT `variance_alert_history_budgetItemId_budget_items_id_fk` FOREIGN KEY (`budgetItemId`) REFERENCES `budget_items`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variance_alert_history` ADD CONSTRAINT `variance_alert_history_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variance_alert_history` ADD CONSTRAINT `variance_alert_history_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variance_alert_history` ADD CONSTRAINT `variance_alert_history_acknowledgedBy_users_id_fk` FOREIGN KEY (`acknowledgedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_documents` ADD CONSTRAINT `vendor_documents_vendorId_vendors_id_fk` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_documents` ADD CONSTRAINT `vendor_documents_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_documents` ADD CONSTRAINT `vendor_documents_verifiedBy_users_id_fk` FOREIGN KEY (`verifiedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_documents` ADD CONSTRAINT `vendor_documents_uploadedBy_users_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_evaluation_items` ADD CONSTRAINT `vendor_evaluation_items_evaluationId_vendor_evaluations_id_fk` FOREIGN KEY (`evaluationId`) REFERENCES `vendor_evaluations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_evaluations` ADD CONSTRAINT `vendor_evaluations_vendorId_vendors_id_fk` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_evaluations` ADD CONSTRAINT `vendor_evaluations_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_evaluations` ADD CONSTRAINT `vendor_evaluations_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_evaluations` ADD CONSTRAINT `vendor_evaluations_evaluatorId_users_id_fk` FOREIGN KEY (`evaluatorId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_evaluations` ADD CONSTRAINT `vendor_evaluations_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_participation_history` ADD CONSTRAINT `vendor_participation_history_vendorId_vendors_id_fk` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_participation_history` ADD CONSTRAINT `vendor_participation_history_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_participation_history` ADD CONSTRAINT `vendor_participation_history_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_participation_history` ADD CONSTRAINT `vendor_participation_history_purchaseRequestId_purchase_requests_id_fk` FOREIGN KEY (`purchaseRequestId`) REFERENCES `purchase_requests`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_performance_evaluations` ADD CONSTRAINT `vendor_performance_evaluations_vendorId_vendors_id_fk` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_performance_evaluations` ADD CONSTRAINT `vendor_performance_evaluations_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_performance_evaluations` ADD CONSTRAINT `vendor_performance_evaluations_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_performance_evaluations` ADD CONSTRAINT `vendor_performance_evaluations_evaluatedBy_users_id_fk` FOREIGN KEY (`evaluatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_performance_evaluations` ADD CONSTRAINT `vendor_performance_evaluations_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_procurement_baselines` ADD CONSTRAINT `vendor_procurement_baselines_vendorId_vendors_id_fk` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_procurement_baselines` ADD CONSTRAINT `vendor_procurement_baselines_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_procurement_baselines` ADD CONSTRAINT `vendor_procurement_baselines_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_qualification_scores` ADD CONSTRAINT `vendor_qualification_scores_vendorId_vendors_id_fk` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_qualification_scores` ADD CONSTRAINT `vendor_qualification_scores_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_qualification_scores` ADD CONSTRAINT `vendor_qualification_scores_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_qualification_scores` ADD CONSTRAINT `vendor_qualification_scores_evaluatorId_users_id_fk` FOREIGN KEY (`evaluatorId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouse_transfer_lines` ADD CONSTRAINT `warehouse_transfer_lines_transferId_warehouse_transfers_id_fk` FOREIGN KEY (`transferId`) REFERENCES `warehouse_transfers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouse_transfer_lines` ADD CONSTRAINT `warehouse_transfer_lines_itemId_stock_items_id_fk` FOREIGN KEY (`itemId`) REFERENCES `stock_items`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouse_transfer_lines` ADD CONSTRAINT `warehouse_transfer_lines_batchId_stock_batches_id_fk` FOREIGN KEY (`batchId`) REFERENCES `stock_batches`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouse_transfers` ADD CONSTRAINT `warehouse_transfers_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouse_transfers` ADD CONSTRAINT `warehouse_transfers_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouse_transfers` ADD CONSTRAINT `warehouse_transfers_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouse_transfers` ADD CONSTRAINT `warehouse_transfers_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouse_transfers` ADD CONSTRAINT `warehouse_transfers_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouse_transfers` ADD CONSTRAINT `warehouse_transfers_dispatchedBy_users_id_fk` FOREIGN KEY (`dispatchedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouse_transfers` ADD CONSTRAINT `warehouse_transfers_receivedBy_users_id_fk` FOREIGN KEY (`receivedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_recovery_user_org` ON `account_recovery_requests` (`userId`,`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_recovery_status` ON `account_recovery_requests` (`status`);--> statement-breakpoint
CREATE INDEX `idx_recovery_token` ON `account_recovery_requests` (`recoveryToken`);--> statement-breakpoint
CREATE INDEX `unique_allocation_base` ON `allocation_bases` (`allocationPeriodId`,`projectId`,`allocationKeyId`);--> statement-breakpoint
CREATE INDEX `idx_organization` ON `allocation_bases` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_period` ON `allocation_bases` (`allocationPeriodId`);--> statement-breakpoint
CREATE INDEX `idx_project` ON `allocation_bases` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_key` ON `allocation_bases` (`allocationKeyId`);--> statement-breakpoint
CREATE INDEX `unique_key_code` ON `allocation_keys` (`organizationId`,`keyCode`);--> statement-breakpoint
CREATE INDEX `idx_organization` ON `allocation_keys` (`organizationId`);--> statement-breakpoint
CREATE INDEX `unique_period_code` ON `allocation_periods` (`organizationId`,`periodCode`);--> statement-breakpoint
CREATE INDEX `idx_organization` ON `allocation_periods` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_dates` ON `allocation_periods` (`startDate`,`endDate`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `allocation_periods` (`status`);--> statement-breakpoint
CREATE INDEX `unique_allocation_result` ON `allocation_results` (`allocationPeriodId`,`costPoolId`,`projectId`);--> statement-breakpoint
CREATE INDEX `idx_organization` ON `allocation_results` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_period` ON `allocation_results` (`allocationPeriodId`);--> statement-breakpoint
CREATE INDEX `idx_cost_pool` ON `allocation_results` (`costPoolId`);--> statement-breakpoint
CREATE INDEX `idx_project` ON `allocation_results` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_journal_entry` ON `allocation_results` (`journalEntryId`);--> statement-breakpoint
CREATE INDEX `idx_organization` ON `allocation_rules` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_cost_pool` ON `allocation_rules` (`costPoolId`);--> statement-breakpoint
CREATE INDEX `idx_allocation_key` ON `allocation_rules` (`allocationKeyId`);--> statement-breakpoint
CREATE INDEX `idx_effective_dates` ON `allocation_rules` (`effectiveFrom`,`effectiveTo`);--> statement-breakpoint
CREATE INDEX `idx_org` ON `asset_depreciation_schedule` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_asset` ON `asset_depreciation_schedule` (`assetId`);--> statement-breakpoint
CREATE INDEX `idx_fiscal` ON `asset_depreciation_schedule` (`fiscalYearId`,`fiscalPeriodId`);--> statement-breakpoint
CREATE INDEX `idx_date` ON `asset_depreciation_schedule` (`periodDate`);--> statement-breakpoint
CREATE INDEX `idx_posted` ON `asset_depreciation_schedule` (`isPosted`);--> statement-breakpoint
CREATE INDEX `idx_export_date` ON `audit_log_export_history` (`exportDate`);--> statement-breakpoint
CREATE INDEX `idx_schedule_id` ON `audit_log_export_history` (`scheduleId`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `audit_log_export_history` (`status`);--> statement-breakpoint
CREATE INDEX `idx_next_run` ON `audit_log_export_schedules` (`nextRunAt`,`isActive`);--> statement-breakpoint
CREATE INDEX `uk_org_number` ON `bank_reconciliations` (`organizationId`,`reconciliationNumber`);--> statement-breakpoint
CREATE INDEX `idx_org` ON `bank_reconciliations` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_bank` ON `bank_reconciliations` (`bankAccountId`);--> statement-breakpoint
CREATE INDEX `idx_date` ON `bank_reconciliations` (`reconciliationDate`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `bank_reconciliations` (`status`);--> statement-breakpoint
CREATE INDEX `idx_org` ON `bank_transactions` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_bank` ON `bank_transactions` (`bankAccountId`);--> statement-breakpoint
CREATE INDEX `idx_date` ON `bank_transactions` (`transactionDate`);--> statement-breakpoint
CREATE INDEX `idx_reconciled` ON `bank_transactions` (`isReconciled`);--> statement-breakpoint
CREATE INDEX `idx_matched` ON `bank_transactions` (`matchedTransactionType`,`matchedTransactionId`);--> statement-breakpoint
CREATE INDEX `idx_bali_ba` ON `bid_analysis_line_items` (`bidAnalysisId`);--> statement-breakpoint
CREATE INDEX `idx_bali_bidder` ON `bid_analysis_line_items` (`bidderId`);--> statement-breakpoint
CREATE INDEX `idx_bali_ba_bidder` ON `bid_analysis_line_items` (`bidAnalysisId`,`bidderId`);--> statement-breakpoint
CREATE INDEX `uq_bali_ba_bidder_prline` ON `bid_analysis_line_items` (`bidAnalysisId`,`bidderId`,`prLineItemId`);--> statement-breakpoint
CREATE INDEX `idx_bes_ba` ON `bid_evaluation_scores` (`bidAnalysisId`);--> statement-breakpoint
CREATE INDEX `idx_bes_criterion` ON `bid_evaluation_scores` (`criterionId`);--> statement-breakpoint
CREATE INDEX `idx_bes_bidder` ON `bid_evaluation_scores` (`bidderId`);--> statement-breakpoint
CREATE INDEX `uq_bes_criterion_bidder` ON `bid_evaluation_scores` (`criterionId`,`bidderId`);--> statement-breakpoint
CREATE INDEX `idx_bas_ba` ON `bidder_acknowledgement_signatures` (`bid_analysis_id`);--> statement-breakpoint
CREATE INDEX `idx_bas_bidder` ON `bidder_acknowledgement_signatures` (`bidder_id`);--> statement-breakpoint
CREATE INDEX `idx_bas_org` ON `bidder_acknowledgement_signatures` (`organization_id`);--> statement-breakpoint
CREATE INDEX `idx_bas_verification` ON `bidder_acknowledgement_signatures` (`verification_code`);--> statement-breakpoint
CREATE INDEX `idx_bwc_org` ON `blacklist_workflow_config` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_bom_sig_bom` ON `bom_approval_signatures` (`bomId`);--> statement-breakpoint
CREATE INDEX `idx_bom_sig_org` ON `bom_approval_signatures` (`organizationId`);--> statement-breakpoint
CREATE INDEX `unique_line_code` ON `budget_lines` (`budgetId`,`lineCode`);--> statement-breakpoint
CREATE INDEX `unique_month_allocation` ON `budget_monthly_allocations` (`budgetLineId`,`allocationMonth`);--> statement-breakpoint
CREATE INDEX `budgetCode` ON `budgets` (`budgetCode`);--> statement-breakpoint
CREATE INDEX `idx_cba_sig_ba` ON `cba_approval_signatures` (`bidAnalysisId`);--> statement-breakpoint
CREATE INDEX `idx_cba_sig_org` ON `cba_approval_signatures` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_milestone_contract` ON `contract_milestones` (`contractId`);--> statement-breakpoint
CREATE INDEX `idx_schedule_contract` ON `contract_payment_schedule` (`contract_id`);--> statement-breakpoint
CREATE INDEX `idx_schedule_org` ON `contract_payment_schedule` (`organization_id`);--> statement-breakpoint
CREATE INDEX `idx_schedule_milestone` ON `contract_payment_schedule` (`linked_milestone_id`);--> statement-breakpoint
CREATE INDEX `idx_penalty_contract` ON `contract_penalties` (`contract_id`);--> statement-breakpoint
CREATE INDEX `idx_penalty_org` ON `contract_penalties` (`organization_id`);--> statement-breakpoint
CREATE INDEX `idx_penalty_milestone` ON `contract_penalties` (`linked_milestone_id`);--> statement-breakpoint
CREATE INDEX `idx_retention_contract` ON `contract_retention_terms` (`contract_id`);--> statement-breakpoint
CREATE INDEX `idx_retention_org` ON `contract_retention_terms` (`organization_id`);--> statement-breakpoint
CREATE INDEX `idx_cv_contract` ON `contract_variations` (`contractId`);--> statement-breakpoint
CREATE INDEX `idx_cv_org` ON `contract_variations` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_contract_pr` ON `contracts` (`purchaseRequestId`);--> statement-breakpoint
CREATE INDEX `idx_contract_vendor` ON `contracts` (`vendorId`);--> statement-breakpoint
CREATE INDEX `idx_contract_org` ON `contracts` (`organizationId`);--> statement-breakpoint
CREATE INDEX `contractNumber` ON `contracts` (`contractNumber`);--> statement-breakpoint
CREATE INDEX `uk_org_code` ON `cost_centers` (`organizationId`,`code`);--> statement-breakpoint
CREATE INDEX `idx_org` ON `cost_centers` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_ou` ON `cost_centers` (`operatingUnitId`);--> statement-breakpoint
CREATE INDEX `idx_parent` ON `cost_centers` (`parentId`);--> statement-breakpoint
CREATE INDEX `idx_project` ON `cost_centers` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_organization` ON `cost_pool_transactions` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_cost_pool` ON `cost_pool_transactions` (`costPoolId`);--> statement-breakpoint
CREATE INDEX `idx_transaction_date` ON `cost_pool_transactions` (`transactionDate`);--> statement-breakpoint
CREATE INDEX `idx_source` ON `cost_pool_transactions` (`sourceModule`,`sourceDocumentId`);--> statement-breakpoint
CREATE INDEX `unique_pool_code` ON `cost_pools` (`organizationId`,`poolCode`);--> statement-breakpoint
CREATE INDEX `idx_organization` ON `cost_pools` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_operating_unit` ON `cost_pools` (`operatingUnitId`);--> statement-breakpoint
CREATE INDEX `dnNumber` ON `delivery_notes` (`dnNumber`);--> statement-breakpoint
CREATE INDEX `idx_access_document_id` ON `document_access_logs` (`documentId`);--> statement-breakpoint
CREATE INDEX `idx_access_accessed_by` ON `document_access_logs` (`accessedBy`);--> statement-breakpoint
CREATE INDEX `idx_access_accessed_at` ON `document_access_logs` (`accessedAt`);--> statement-breakpoint
CREATE INDEX `idx_access_org_ou` ON `document_access_logs` (`organizationId`,`operatingUnitId`);--> statement-breakpoint
CREATE INDEX `idx_audit_document_id` ON `document_audit_logs` (`documentId`);--> statement-breakpoint
CREATE INDEX `idx_audit_action` ON `document_audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `idx_audit_performed_by` ON `document_audit_logs` (`performedBy`);--> statement-breakpoint
CREATE INDEX `idx_audit_performed_at` ON `document_audit_logs` (`performedAt`);--> statement-breakpoint
CREATE INDEX `idx_audit_org_ou` ON `document_audit_logs` (`organizationId`,`operatingUnitId`);--> statement-breakpoint
CREATE INDEX `idx_classification_document_id` ON `document_classifications` (`documentId`);--> statement-breakpoint
CREATE INDEX `idx_classification_level` ON `document_classifications` (`classificationLevel`);--> statement-breakpoint
CREATE INDEX `idx_classification_org_ou` ON `document_classifications` (`organizationId`,`operatingUnitId`);--> statement-breakpoint
CREATE INDEX `idx_hold_document_id` ON `document_legal_holds` (`documentId`);--> statement-breakpoint
CREATE INDEX `idx_hold_status` ON `document_legal_holds` (`holdStatus`);--> statement-breakpoint
CREATE INDEX `idx_hold_org_ou` ON `document_legal_holds` (`organizationId`,`operatingUnitId`);--> statement-breakpoint
CREATE INDEX `idx_metadata_document_id` ON `document_metadata` (`documentId`);--> statement-breakpoint
CREATE INDEX `idx_metadata_org_ou` ON `document_metadata` (`organizationId`,`operatingUnitId`);--> statement-breakpoint
CREATE INDEX `idx_retention_org_ou` ON `document_retention_policies` (`organizationId`,`operatingUnitId`);--> statement-breakpoint
CREATE INDEX `idx_retention_active` ON `document_retention_policies` (`isActive`);--> statement-breakpoint
CREATE INDEX `idx_doc_versions_document_id` ON `document_versions` (`documentId`);--> statement-breakpoint
CREATE INDEX `idx_doc_versions_org_ou` ON `document_versions` (`organizationId`,`operatingUnitId`);--> statement-breakpoint
CREATE INDEX `idx_doc_versions_created_by` ON `document_versions` (`createdBy`);--> statement-breakpoint
CREATE INDEX `idx_documents_project_id` ON `documents` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_documents_folder_code` ON `documents` (`folderCode`);--> statement-breakpoint
CREATE INDEX `idx_documents_organization_id` ON `documents` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_documents_operating_unit_id` ON `documents` (`operatingUnitId`);--> statement-breakpoint
CREATE INDEX `documentId` ON `documents` (`documentId`);--> statement-breakpoint
CREATE INDEX `idx_documents_workspace` ON `documents` (`workspace`);--> statement-breakpoint
CREATE INDEX `idx_documents_parent_folder_id` ON `documents` (`parentFolderId`);--> statement-breakpoint
CREATE INDEX `idx_documents_entity` ON `documents` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `donor_communications_donor_date_idx` ON `donor_communications` (`donorId`,`date`);--> statement-breakpoint
CREATE INDEX `donor_communications_org_ou_idx` ON `donor_communications` (`organizationId`,`operatingUnitId`);--> statement-breakpoint
CREATE INDEX `donor_projects_donor_project_unique` ON `donor_projects` (`donorId`,`projectId`);--> statement-breakpoint
CREATE INDEX `donor_projects_org_ou_idx` ON `donor_projects` (`organizationId`,`operatingUnitId`);--> statement-breakpoint
CREATE INDEX `donor_reports_donor_generated_idx` ON `donor_reports` (`donorId`,`generatedAt`);--> statement-breakpoint
CREATE INDEX `donor_reports_org_ou_idx` ON `donor_reports` (`organizationId`,`operatingUnitId`);--> statement-breakpoint
CREATE INDEX `donors_org_code_unique` ON `donors` (`organizationId`,`code`);--> statement-breakpoint
CREATE INDEX `donors_org_name_idx` ON `donors` (`organizationId`,`name`);--> statement-breakpoint
CREATE INDEX `email_dlq_organization_id_idx` ON `email_dead_letter_queue` (`organizationId`);--> statement-breakpoint
CREATE INDEX `email_dlq_moved_at_idx` ON `email_dead_letter_queue` (`movedAt`);--> statement-breakpoint
CREATE INDEX `email_delivery_status_outbox_id_idx` ON `email_delivery_status` (`outboxId`);--> statement-breakpoint
CREATE INDEX `email_delivery_status_organization_id_idx` ON `email_delivery_status` (`organizationId`);--> statement-breakpoint
CREATE INDEX `email_delivery_status_current_status_idx` ON `email_delivery_status` (`currentStatus`);--> statement-breakpoint
CREATE INDEX `email_delivery_status_status_changed_at_idx` ON `email_delivery_status` (`statusChangedAt`);--> statement-breakpoint
CREATE INDEX `email_outbox_organization_id_idx` ON `email_outbox` (`organizationId`);--> statement-breakpoint
CREATE INDEX `email_outbox_status_idx` ON `email_outbox` (`status`);--> statement-breakpoint
CREATE INDEX `email_outbox_next_retry_at_idx` ON `email_outbox` (`nextRetryAt`);--> statement-breakpoint
CREATE INDEX `email_outbox_created_at_idx` ON `email_outbox` (`createdAt`);--> statement-breakpoint
CREATE INDEX `email_provider_config_org_provider_idx` ON `email_provider_config` (`organizationId`,`provider`);--> statement-breakpoint
CREATE INDEX `email_provider_config_organization_id_idx` ON `email_provider_config` (`organizationId`);--> statement-breakpoint
CREATE INDEX `email_provider_config_provider_idx` ON `email_provider_config` (`provider`);--> statement-breakpoint
CREATE INDEX `uk_email_provider_org` ON `email_provider_settings` (`organizationId`);--> statement-breakpoint
CREATE INDEX `email_template_ab_test_template_id_idx` ON `email_template_ab_test` (`templateId`);--> statement-breakpoint
CREATE INDEX `email_template_ab_test_organization_id_idx` ON `email_template_ab_test` (`organizationId`);--> statement-breakpoint
CREATE INDEX `email_template_ab_test_status_idx` ON `email_template_ab_test` (`status`);--> statement-breakpoint
CREATE INDEX `email_template_ab_test_winner_id_idx` ON `email_template_ab_test` (`winnerId`);--> statement-breakpoint
CREATE INDEX `email_template_version_template_id_version_idx` ON `email_template_version` (`templateId`,`versionNumber`);--> statement-breakpoint
CREATE INDEX `email_template_version_organization_id_idx` ON `email_template_version` (`organizationId`);--> statement-breakpoint
CREATE INDEX `email_template_version_template_id_idx` ON `email_template_version` (`templateId`);--> statement-breakpoint
CREATE INDEX `email_template_version_is_published_idx` ON `email_template_version` (`isPublished`);--> statement-breakpoint
CREATE INDEX `email_template_version_ab_test_id_idx` ON `email_template_version` (`abTestId`);--> statement-breakpoint
CREATE INDEX `idx_email_token_user` ON `email_verification_tokens` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_email_token_email` ON `email_verification_tokens` (`email`);--> statement-breakpoint
CREATE INDEX `idx_email_token_type` ON `email_verification_tokens` (`tokenType`);--> statement-breakpoint
CREATE INDEX `email_webhook_events_organization_id_idx` ON `email_webhook_events` (`organizationId`);--> statement-breakpoint
CREATE INDEX `email_webhook_events_provider_idx` ON `email_webhook_events` (`provider`);--> statement-breakpoint
CREATE INDEX `email_webhook_events_type_idx` ON `email_webhook_events` (`eventType`);--> statement-breakpoint
CREATE INDEX `email_webhook_events_created_at_idx` ON `email_webhook_events` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_organization` ON `expenditures` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_project` ON `expenditures` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `expenditures` (`status`);--> statement-breakpoint
CREATE INDEX `idx_expenditure_date` ON `expenditures` (`expenditureDate`);--> statement-breakpoint
CREATE INDEX `idx_latest_version` ON `expenditures` (`isLatestVersion`);--> statement-breakpoint
CREATE INDEX `idx_not_deleted` ON `expenditures` (`isDeleted`);--> statement-breakpoint
CREATE INDEX `idx_final_handover_monitoring` ON `final_handover` (`monitoring_id`);--> statement-breakpoint
CREATE INDEX `idx_pr_encumbrance` ON `finance_encumbrances` (`purchaseRequestId`);--> statement-breakpoint
CREATE INDEX `idx_po_encumbrance` ON `finance_encumbrances` (`purchaseOrderId`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `finance_encumbrances` (`status`);--> statement-breakpoint
CREATE INDEX `encumbranceNumber` ON `finance_encumbrances` (`encumbranceNumber`);--> statement-breakpoint
CREATE INDEX `unique_category` ON `finance_expenditure_categories` (`organizationId`,`categoryName`);--> statement-breakpoint
CREATE INDEX `idx_org_active` ON `finance_expenditure_categories` (`organizationId`,`isActive`);--> statement-breakpoint
CREATE INDEX `unique_expenditure_number` ON `finance_expenditures` (`organizationId`,`expenditureNumber`);--> statement-breakpoint
CREATE INDEX `idx_org_status` ON `finance_expenditures` (`organizationId`,`status`);--> statement-breakpoint
CREATE INDEX `idx_org_date` ON `finance_expenditures` (`organizationId`,`expenditureDate`);--> statement-breakpoint
CREATE INDEX `idx_project` ON `finance_expenditures` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_category` ON `finance_expenditures` (`categoryId`);--> statement-breakpoint
CREATE INDEX `idx_fpe_org` ON `finance_period_events` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_fpe_period` ON `finance_period_events` (`periodId`);--> statement-breakpoint
CREATE INDEX `idx_finance_periods_org` ON `finance_periods` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_finance_periods_fiscal_year` ON `finance_periods` (`fiscalYearId`);--> statement-breakpoint
CREATE INDEX `uk_fiscal_period` ON `fiscal_periods` (`fiscalYearId`,`periodNumber`);--> statement-breakpoint
CREATE INDEX `idx_org` ON `fiscal_periods` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_fiscal` ON `fiscal_periods` (`fiscalYearId`);--> statement-breakpoint
CREATE INDEX `idx_dates` ON `fiscal_periods` (`startDate`,`endDate`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `fiscal_periods` (`status`);--> statement-breakpoint
CREATE INDEX `idx_org` ON `gl_account_categories` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_ou` ON `gl_account_categories` (`operatingUnitId`);--> statement-breakpoint
CREATE INDEX `idx_parent` ON `gl_account_categories` (`parentId`);--> statement-breakpoint
CREATE INDEX `idx_type` ON `gl_account_categories` (`accountType`);--> statement-breakpoint
CREATE INDEX `uk_org_code` ON `gl_accounts` (`organizationId`,`accountCode`);--> statement-breakpoint
CREATE INDEX `idx_org` ON `gl_accounts` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_ou` ON `gl_accounts` (`operatingUnitId`);--> statement-breakpoint
CREATE INDEX `idx_category` ON `gl_accounts` (`categoryId`);--> statement-breakpoint
CREATE INDEX `idx_parent` ON `gl_accounts` (`parentAccountId`);--> statement-breakpoint
CREATE INDEX `idx_type` ON `gl_accounts` (`accountType`);--> statement-breakpoint
CREATE INDEX `idx_gl_entity` ON `gl_posting_events` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `idx_gl_org` ON `gl_posting_events` (`organizationId`);--> statement-breakpoint
CREATE INDEX `hr_attendance_records_employeeId_date_unique` ON `hr_attendance_records` (`employeeId`,`date`);--> statement-breakpoint
CREATE INDEX `hr_leave_balances_employeeId_year_leaveType_unique` ON `hr_leave_balances` (`employeeId`,`year`,`leaveType`);--> statement-breakpoint
CREATE INDEX `hr_payroll_records_employeeId_payrollMonth_payrollYear_unique` ON `hr_payroll_records` (`employeeId`,`payrollMonth`,`payrollYear`);--> statement-breakpoint
CREATE INDEX `idx_checklist_monitoring` ON `implementation_checklist` (`monitoring_id`);--> statement-breakpoint
CREATE INDEX `idx_checklist_milestone` ON `implementation_checklist` (`milestone_id`);--> statement-breakpoint
CREATE INDEX `idx_monitoring_contract` ON `implementation_monitoring` (`contract_id`);--> statement-breakpoint
CREATE INDEX `idx_monitoring_org` ON `implementation_monitoring` (`organization_id`);--> statement-breakpoint
CREATE INDEX `idx_observations_monitoring` ON `implementation_observations` (`monitoring_id`);--> statement-breakpoint
CREATE INDEX `idx_incidents_org` ON `incidents` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_incidents_ou` ON `incidents` (`operatingUnitId`);--> statement-breakpoint
CREATE INDEX `idx_incidents_status` ON `incidents` (`status`);--> statement-breakpoint
CREATE INDEX `idx_incidents_severity` ON `incidents` (`severity`);--> statement-breakpoint
CREATE INDEX `idx_incidents_date` ON `incidents` (`incidentDate`);--> statement-breakpoint
CREATE INDEX `invitations_token_unique` ON `invitations` (`token`);--> statement-breakpoint
CREATE INDEX `uk_org_entry` ON `journal_entries` (`organizationId`,`entryNumber`);--> statement-breakpoint
CREATE INDEX `idx_org` ON `journal_entries` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_ou` ON `journal_entries` (`operatingUnitId`);--> statement-breakpoint
CREATE INDEX `idx_date` ON `journal_entries` (`entryDate`);--> statement-breakpoint
CREATE INDEX `idx_fiscal` ON `journal_entries` (`fiscalYearId`,`fiscalPeriodId`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `journal_entries` (`status`);--> statement-breakpoint
CREATE INDEX `idx_source` ON `journal_entries` (`sourceModule`,`sourceDocumentId`);--> statement-breakpoint
CREATE INDEX `idx_org` ON `journal_lines` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_journal` ON `journal_lines` (`journalEntryId`);--> statement-breakpoint
CREATE INDEX `idx_account` ON `journal_lines` (`glAccountId`);--> statement-breakpoint
CREATE INDEX `idx_project` ON `journal_lines` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_grant` ON `journal_lines` (`grantId`);--> statement-breakpoint
CREATE INDEX `landing_settings_organizationId_unique` ON `landing_settings` (`organizationId`);--> statement-breakpoint
CREATE INDEX `dqaCode` ON `meal_dqa_visits` (`dqaCode`);--> statement-breakpoint
CREATE INDEX `microsoft_integrations_organizationId_unique` ON `microsoft_integrations` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_mitigation_attachments_action` ON `mitigation_action_attachments` (`actionId`);--> statement-breakpoint
CREATE INDEX `idx_mitigation_comments_action` ON `mitigation_action_comments` (`actionId`);--> statement-breakpoint
CREATE INDEX `idx_mitigation_comments_created` ON `mitigation_action_comments` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_mitigation_actions_org` ON `mitigation_actions` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_mitigation_actions_risk` ON `mitigation_actions` (`riskId`);--> statement-breakpoint
CREATE INDEX `idx_mitigation_actions_assigned` ON `mitigation_actions` (`assignedTo`);--> statement-breakpoint
CREATE INDEX `idx_mitigation_actions_status` ON `mitigation_actions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_mitigation_actions_deadline` ON `mitigation_actions` (`deadline`);--> statement-breakpoint
CREATE INDEX `idx_mitigation_templates_org` ON `mitigation_templates` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_mitigation_templates_category` ON `mitigation_templates` (`riskCategory`);--> statement-breakpoint
CREATE INDEX `idx_mitigation_templates_type` ON `mitigation_templates` (`riskType`);--> statement-breakpoint
CREATE INDEX `unique_project_month_year` ON `monthly_reports` (`projectId`,`reportMonth`,`reportYear`);--> statement-breakpoint
CREATE INDEX `idx_notification_event_org` ON `notification_event_settings` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_notification_event_key` ON `notification_event_settings` (`eventKey`);--> statement-breakpoint
CREATE INDEX `idx_outbox_org` ON `notification_outbox` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_outbox_status` ON `notification_outbox` (`status`);--> statement-breakpoint
CREATE INDEX `idx_outbox_event` ON `notification_outbox` (`eventKey`);--> statement-breakpoint
CREATE INDEX `organizationId` ON `organization_branding` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_org` ON `payment_lines` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_payment` ON `payment_lines` (`paymentId`);--> statement-breakpoint
CREATE INDEX `idx_source` ON `payment_lines` (`sourceType`,`sourceId`);--> statement-breakpoint
CREATE INDEX `idx_project` ON `payment_lines` (`projectId`);--> statement-breakpoint
CREATE INDEX `uk_org_number` ON `payments` (`organizationId`,`paymentNumber`);--> statement-breakpoint
CREATE INDEX `idx_org` ON `payments` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_ou` ON `payments` (`operatingUnitId`);--> statement-breakpoint
CREATE INDEX `idx_date` ON `payments` (`paymentDate`);--> statement-breakpoint
CREATE INDEX `idx_payee` ON `payments` (`payeeType`,`payeeId`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `payments` (`status`);--> statement-breakpoint
CREATE INDEX `idx_project` ON `payments` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_grant` ON `payments` (`grantId`);--> statement-breakpoint
CREATE INDEX `pr_user_org_idx` ON `permission_reviews` (`userId`,`organizationId`);--> statement-breakpoint
CREATE INDEX `pr_reviewed_at_idx` ON `permission_reviews` (`reviewedAt`);--> statement-breakpoint
CREATE INDEX `idx_pr_reservation` ON `pr_budget_reservations` (`purchaseRequestId`);--> statement-breakpoint
CREATE INDEX `idx_budget_line` ON `pr_budget_reservations` (`budgetLineId`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `pr_budget_reservations` (`status`);--> statement-breakpoint
CREATE INDEX `reservationNumber` ON `pr_budget_reservations` (`reservationNumber`);--> statement-breakpoint
CREATE INDEX `idx_primary_handover_monitoring` ON `primary_handover` (`monitoring_id`);--> statement-breakpoint
CREATE INDEX `idx_procurement_audit_org` ON `procurement_audit_trail` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_procurement_audit_document` ON `procurement_audit_trail` (`documentType`,`documentId`);--> statement-breakpoint
CREATE INDEX `idx_procurement_audit_timestamp` ON `procurement_audit_trail` (`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_pr_invoice` ON `procurement_invoices` (`purchaseRequestId`);--> statement-breakpoint
CREATE INDEX `idx_po_invoice` ON `procurement_invoices` (`purchaseOrderId`);--> statement-breakpoint
CREATE INDEX `idx_vendor` ON `procurement_invoices` (`vendorId`);--> statement-breakpoint
CREATE INDEX `idx_matching_status` ON `procurement_invoices` (`matchingStatus`);--> statement-breakpoint
CREATE INDEX `idx_approval_status` ON `procurement_invoices` (`approvalStatus`);--> statement-breakpoint
CREATE INDEX `unique_sequence` ON `procurement_number_sequences` (`organizationId`,`operatingUnitId`,`documentType`,`year`);--> statement-breakpoint
CREATE INDEX `idx_pr_payable` ON `procurement_payables` (`purchaseRequestId`);--> statement-breakpoint
CREATE INDEX `idx_po_payable` ON `procurement_payables` (`purchaseOrderId`);--> statement-breakpoint
CREATE INDEX `idx_vendor` ON `procurement_payables` (`vendorId`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `procurement_payables` (`status`);--> statement-breakpoint
CREATE INDEX `payableNumber` ON `procurement_payables` (`payableNumber`);--> statement-breakpoint
CREATE INDEX `idx_contract_payable` ON `procurement_payables` (`contractId`);--> statement-breakpoint
CREATE INDEX `idx_sac_payable` ON `procurement_payables` (`sacId`);--> statement-breakpoint
CREATE INDEX `idx_matching_status_payable` ON `procurement_payables` (`matching_status`);--> statement-breakpoint
CREATE INDEX `idx_po_line_org_ou` ON `purchase_order_line_items` (`organizationId`,`operatingUnitId`);--> statement-breakpoint
CREATE INDEX `idx_po_line_org_ou_deleted` ON `purchase_order_line_items` (`organizationId`,`operatingUnitId`,`deletedAt`);--> statement-breakpoint
CREATE INDEX `idx_scheduled_purge` ON `purge_notifications` (`scheduledPurgeDate`);--> statement-breakpoint
CREATE INDEX `idx_notification_status` ON `purge_notifications` (`notificationStatus`);--> statement-breakpoint
CREATE INDEX `idx_scope_org` ON `purge_notifications` (`scope`,`organizationId`,`operatingUnitId`);--> statement-breakpoint
CREATE INDEX `idx_qa_id` ON `quotation_analysis_audit_log` (`quotationAnalysisId`);--> statement-breakpoint
CREATE INDEX `idx_supplier_id` ON `quotation_analysis_audit_log` (`supplierId`);--> statement-breakpoint
CREATE INDEX `idx_changed_at` ON `quotation_analysis_audit_log` (`changedAt`);--> statement-breakpoint
CREATE INDEX `unique_qa_supplier_line` ON `quotation_analysis_line_items` (`quotationAnalysisId`,`supplierId`,`lineItemId`);--> statement-breakpoint
CREATE INDEX `rbac_user_permissions_userId_organizationId_unique` ON `rbac_user_permissions` (`userId`,`organizationId`);--> statement-breakpoint
CREATE INDEX `retention_policies_entityType_unique` ON `retention_policies` (`entityType`);--> statement-breakpoint
CREATE INDEX `idx_entity_type` ON `retention_policies` (`entityType`);--> statement-breakpoint
CREATE INDEX `rfqs_rfqNumber_unique` ON `rfqs` (`rfqNumber`);--> statement-breakpoint
CREATE INDEX `rfqNumber` ON `rfqs` (`rfqNumber`);--> statement-breakpoint
CREATE INDEX `idx_risk_history_risk` ON `risk_history` (`riskId`);--> statement-breakpoint
CREATE INDEX `idx_risk_history_org` ON `risk_history` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_risk_history_date` ON `risk_history` (`changedAt`);--> statement-breakpoint
CREATE INDEX `idx_risks_org` ON `risks` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_risks_ou` ON `risks` (`operatingUnitId`);--> statement-breakpoint
CREATE INDEX `idx_risks_status` ON `risks` (`status`);--> statement-breakpoint
CREATE INDEX `idx_risks_level` ON `risks` (`level`);--> statement-breakpoint
CREATE INDEX `idx_risks_project` ON `risks` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_risks_activity` ON `risks` (`activityId`);--> statement-breakpoint
CREATE INDEX `idx_risks_source` ON `risks` (`source`);--> statement-breakpoint
CREATE INDEX `idx_risks_system_generated` ON `risks` (`isSystemGenerated`);--> statement-breakpoint
CREATE INDEX `idx_saml_config_org` ON `saml_idp_configurations` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_saml_config_provider` ON `saml_idp_configurations` (`provider`);--> statement-breakpoint
CREATE INDEX `idx_saml_config_enabled` ON `saml_idp_configurations` (`isEnabled`);--> statement-breakpoint
CREATE INDEX `idx_saml_user_org` ON `saml_sessions` (`userId`,`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_saml_provider` ON `saml_sessions` (`samlProvider`);--> statement-breakpoint
CREATE INDEX `idx_saml_name_id` ON `saml_sessions` (`samlNameId`);--> statement-breakpoint
CREATE INDEX `idx_sac_contract` ON `service_acceptance_certificates` (`contractId`);--> statement-breakpoint
CREATE INDEX `idx_sac_org` ON `service_acceptance_certificates` (`organizationId`);--> statement-breakpoint
CREATE INDEX `sacNumber` ON `service_acceptance_certificates` (`sacNumber`);--> statement-breakpoint
CREATE INDEX `idx_org` ON `settlement_lines` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_settlement` ON `settlement_lines` (`settlementId`);--> statement-breakpoint
CREATE INDEX `idx_project` ON `settlement_lines` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_grant` ON `settlement_lines` (`grantId`);--> statement-breakpoint
CREATE INDEX `idx_category` ON `settlement_lines` (`categoryId`);--> statement-breakpoint
CREATE INDEX `idx_stock_batches_org` ON `stock_batches` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_stock_batches_item` ON `stock_batches` (`itemId`);--> statement-breakpoint
CREATE INDEX `idx_stock_batches_expiry` ON `stock_batches` (`expiryDate`);--> statement-breakpoint
CREATE INDEX `idx_stock_batches_status` ON `stock_batches` (`batchStatus`);--> statement-breakpoint
CREATE INDEX `idx_stock_issue_lines_issue` ON `stock_issue_lines` (`issueId`);--> statement-breakpoint
CREATE INDEX `idx_stock_issue_lines_batch` ON `stock_issue_lines` (`batchId`);--> statement-breakpoint
CREATE INDEX `idx_stock_issues_org` ON `stock_issues` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_stock_issues_number` ON `stock_issues` (`organizationId`,`issueNumber`);--> statement-breakpoint
CREATE INDEX `idx_stock_issues_status` ON `stock_issues` (`status`);--> statement-breakpoint
CREATE INDEX `idx_stock_ledger_org` ON `stock_ledger` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_stock_ledger_batch` ON `stock_ledger` (`batchId`);--> statement-breakpoint
CREATE INDEX `idx_stock_ledger_item` ON `stock_ledger` (`itemId`);--> statement-breakpoint
CREATE INDEX `idx_stock_ledger_date` ON `stock_ledger` (`transactionDate`);--> statement-breakpoint
CREATE INDEX `idx_stock_ledger_movement_type` ON `stock_ledger` (`movementType`);--> statement-breakpoint
CREATE INDEX `idx_stock_reservations_batch` ON `stock_reservations` (`batchId`);--> statement-breakpoint
CREATE INDEX `idx_stock_reservations_status` ON `stock_reservations` (`status`);--> statement-breakpoint
CREATE INDEX `idx_sqh_pr` ON `supplier_quotation_headers` (`purchaseRequestId`);--> statement-breakpoint
CREATE INDEX `idx_sqh_vendor` ON `supplier_quotation_headers` (`vendorId`);--> statement-breakpoint
CREATE INDEX `idx_sqh_bidder` ON `supplier_quotation_headers` (`bidAnalysisBidderId`);--> statement-breakpoint
CREATE INDEX `idx_sqh_org` ON `supplier_quotation_headers` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_sqh_status` ON `supplier_quotation_headers` (`status`);--> statement-breakpoint
CREATE INDEX `idx_sql_header` ON `supplier_quotation_lines` (`quotationHeaderId`);--> statement-breakpoint
CREATE INDEX `idx_sql_prline` ON `supplier_quotation_lines` (`prLineItemId`);--> statement-breakpoint
CREATE INDEX `idx_setting_key` ON `system_settings` (`settingKey`);--> statement-breakpoint
CREATE INDEX `settingKey` ON `system_settings` (`settingKey`);--> statement-breakpoint
CREATE INDEX `idx_2fa_user_org` ON `two_factor_auth` (`userId`,`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_2fa_method` ON `two_factor_auth` (`method`);--> statement-breakpoint
CREATE INDEX `idx_2fa_challenge_user` ON `two_factor_challenges` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_2fa_challenge_id` ON `two_factor_challenges` (`challengeId`);--> statement-breakpoint
CREATE INDEX `idx_category` ON `unit_types` (`category`);--> statement-breakpoint
CREATE INDEX `idx_active` ON `unit_types` (`active`);--> statement-breakpoint
CREATE INDEX `name` ON `unit_types` (`name`);--> statement-breakpoint
CREATE INDEX `user_active_scope_userId` ON `user_active_scope` (`userId`);--> statement-breakpoint
CREATE INDEX `user_active_scope_org_ou` ON `user_active_scope` (`organizationId`,`operatingUnitId`);--> statement-breakpoint
CREATE INDEX `ual_user_idx` ON `user_archive_log` (`userId`);--> statement-breakpoint
CREATE INDEX `ual_action_idx` ON `user_archive_log` (`action`);--> statement-breakpoint
CREATE INDEX `ual_performed_at_idx` ON `user_archive_log` (`performedAt`);--> statement-breakpoint
CREATE INDEX `user_operating_units_userId_operatingUnitId_unique` ON `user_operating_units` (`userId`,`operatingUnitId`);--> statement-breakpoint
CREATE INDEX `user_organizations_userId_organizationId_unique` ON `user_organizations` (`userId`,`organizationId`);--> statement-breakpoint
CREATE INDEX `upo_user_org_idx` ON `user_permission_overrides` (`userId`,`organizationId`);--> statement-breakpoint
CREATE INDEX `upo_expires_idx` ON `user_permission_overrides` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `unique_users_email` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `unique_users_microsoftObjectId` ON `users` (`microsoftObjectId`);--> statement-breakpoint
CREATE INDEX `unique_users_openId` ON `users` (`openId`);--> statement-breakpoint
CREATE INDEX `idx_users_email_verified` ON `users` (`emailVerified`);--> statement-breakpoint
CREATE INDEX `idx_vbal_case` ON `vendor_blacklist_audit_log` (`caseId`);--> statement-breakpoint
CREATE INDEX `idx_vbal_user` ON `vendor_blacklist_audit_log` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_vbal_org` ON `vendor_blacklist_audit_log` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_vbal_action` ON `vendor_blacklist_audit_log` (`actionType`);--> statement-breakpoint
CREATE INDEX `idx_vbc_vendor` ON `vendor_blacklist_cases` (`vendorId`);--> statement-breakpoint
CREATE INDEX `idx_vbc_org` ON `vendor_blacklist_cases` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_vbc_ou` ON `vendor_blacklist_cases` (`operatingUnitId`);--> statement-breakpoint
CREATE INDEX `idx_vbc_status` ON `vendor_blacklist_cases` (`status`);--> statement-breakpoint
CREATE INDEX `idx_vbc_case_number` ON `vendor_blacklist_cases` (`caseNumber`);--> statement-breakpoint
CREATE INDEX `idx_vbe_case` ON `vendor_blacklist_evidence` (`caseId`);--> statement-breakpoint
CREATE INDEX `idx_vbe_org` ON `vendor_blacklist_evidence` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_vbs_case` ON `vendor_blacklist_signatures` (`caseId`);--> statement-breakpoint
CREATE INDEX `idx_vbs_signer` ON `vendor_blacklist_signatures` (`signerId`);--> statement-breakpoint
CREATE INDEX `idx_vbs_org` ON `vendor_blacklist_signatures` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_vbs_status` ON `vendor_blacklist_signatures` (`status`);--> statement-breakpoint
CREATE INDEX `idx_vei_eval` ON `vendor_evaluation_items` (`evaluationId`);--> statement-breakpoint
CREATE INDEX `idx_vei_section` ON `vendor_evaluation_items` (`sectionNumber`);--> statement-breakpoint
CREATE INDEX `idx_ve_vendor` ON `vendor_evaluations` (`vendorId`);--> statement-breakpoint
CREATE INDEX `idx_ve_org` ON `vendor_evaluations` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_ve_ou` ON `vendor_evaluations` (`operatingUnitId`);--> statement-breakpoint
CREATE INDEX `idx_ve_status` ON `vendor_evaluations` (`status`);--> statement-breakpoint
CREATE INDEX `idx_vpb_vendor` ON `vendor_procurement_baselines` (`vendorId`);--> statement-breakpoint
CREATE INDEX `idx_vpb_org` ON `vendor_procurement_baselines` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_vpb_ba` ON `vendor_procurement_baselines` (`bidAnalysisId`);--> statement-breakpoint
CREATE INDEX `idx_vqs_vendor` ON `vendor_qualification_scores` (`vendorId`);--> statement-breakpoint
CREATE INDEX `idx_vqs_org` ON `vendor_qualification_scores` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_vqs_ou` ON `vendor_qualification_scores` (`operatingUnitId`);--> statement-breakpoint
CREATE INDEX `idx_vqs_status` ON `vendor_qualification_scores` (`qualificationStatus`);--> statement-breakpoint
CREATE INDEX `idx_vqs_expiry` ON `vendor_qualification_scores` (`expiry_date`);--> statement-breakpoint
CREATE INDEX `idx_vqs_approval` ON `vendor_qualification_scores` (`approval_status`);--> statement-breakpoint
CREATE INDEX `uk_org_code` ON `vendors` (`organizationId`,`vendorCode`);--> statement-breakpoint
CREATE INDEX `idx_org` ON `vendors` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_ou` ON `vendors` (`operatingUnitId`);--> statement-breakpoint
CREATE INDEX `idx_type` ON `vendors` (`vendorType`);--> statement-breakpoint
CREATE INDEX `idx_active` ON `vendors` (`isActive`);--> statement-breakpoint
CREATE INDEX `idx_wh_alert_configs_org` ON `warehouse_alert_configs` (`organization_id`);--> statement-breakpoint
CREATE INDEX `idx_wh_alert_configs_wh` ON `warehouse_alert_configs` (`warehouse_id`);--> statement-breakpoint
CREATE INDEX `idx_warehouse_transfer_lines_transfer` ON `warehouse_transfer_lines` (`transferId`);--> statement-breakpoint
CREATE INDEX `idx_warehouse_transfer_lines_batch` ON `warehouse_transfer_lines` (`batchId`);--> statement-breakpoint
CREATE INDEX `idx_warehouse_transfers_org` ON `warehouse_transfers` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_warehouse_transfers_number` ON `warehouse_transfers` (`organizationId`,`transferNumber`);--> statement-breakpoint
CREATE INDEX `idx_warehouse_transfers_status` ON `warehouse_transfers` (`status`);