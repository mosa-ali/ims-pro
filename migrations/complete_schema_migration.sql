-- Complete Database Schema Migration
-- Generated from IMS_SCHEMA_DEFINITIONS.json
-- Approach: CREATE _new tables → MIGRATE data → DROP old → RENAME new

SET FOREIGN_KEY_CHECKS = 0;

-- STEP 1: CREATE NEW TABLES WITH CORRECT TYPES

-- Create activities_new
CREATE TABLE IF NOT EXISTS `activities_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `projectId` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `activityCode` varchar(50) NOT NULL,
  `activityName` text NOT NULL,
  `activityNameAr` text NULL,
  `description` text NULL,
  `descriptionAr` text NULL,
  `plannedStartDate` date NOT NULL,
  `plannedEndDate` date NOT NULL,
  `actualStartDate` date NULL,
  `actualEndDate` date NULL,
  `status` enum('not_started','in_progress','completed','on_hold','cancelled') NOT NULL DEFAULT NOT_STARTED,
  `progressPercentage` decimal(5,2) NOT NULL DEFAULT 0.00,
  `budgetAllocated` decimal(15,2) NOT NULL DEFAULT 0.00,
  `actualSpent` decimal(15,2) NOT NULL DEFAULT 0.00,
  `currency` enum('usd','eur','gbp','chf') NOT NULL DEFAULT USD,
  `location` varchar(255) NULL,
  `locationAr` varchar(255) NULL,
  `responsiblePerson` varchar(255) NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  `target` decimal(15,2) NULL,
  `unitType` varchar(100) NULL,
  `achievedValue` decimal(15,2) NULL DEFAULT 0.00,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create allocation_bases_new
CREATE TABLE IF NOT EXISTS `allocation_bases_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `allocationPeriodId` int(11) NOT NULL,
  `projectId` int(11) NOT NULL,
  `allocationKeyId` int(11) NOT NULL,
  `basisValue` decimal(15,2) NOT NULL DEFAULT 0.00,
  `basisPercentage` decimal(5,2) NOT NULL DEFAULT 0.00,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create allocation_keys_new
CREATE TABLE IF NOT EXISTS `allocation_keys_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `keyCode` varchar(50) NOT NULL,
  `keyName` varchar(255) NOT NULL,
  `keyNameAr` varchar(255) NULL,
  `keyType` enum('headcount','budget_percentage','direct_costs','custom','equal','revenue') NULL DEFAULT budget_percentage,
  `description` text NULL,
  `descriptionAr` text NULL,
  `isActive` tinyint(1) NULL DEFAULT 1,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` varchar(255) NULL,
  `updatedBy` varchar(255) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create allocation_periods_new
CREATE TABLE IF NOT EXISTS `allocation_periods_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `periodCode` varchar(50) NOT NULL,
  `periodName` varchar(255) NOT NULL,
  `periodNameAr` varchar(255) NULL,
  `periodType` enum('monthly','quarterly','annual','custom') NULL DEFAULT monthly,
  `startDate` date NOT NULL,
  `endDate` date NOT NULL,
  `fiscalYearId` int(11) NULL,
  `fiscalPeriodId` int(11) NULL,
  `status` enum('draft','in_progress','completed','reversed') NULL DEFAULT draft,
  `executedAt` timestamp NULL,
  `executedBy` varchar(255) NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` varchar(255) NULL,
  `updatedBy` varchar(255) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create allocation_results_new
CREATE TABLE IF NOT EXISTS `allocation_results_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `allocationPeriodId` int(11) NOT NULL,
  `costPoolId` int(11) NOT NULL,
  `projectId` int(11) NOT NULL,
  `allocationKeyId` int(11) NOT NULL,
  `totalPoolAmount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `allocationPercentage` decimal(5,2) NOT NULL DEFAULT 0.00,
  `allocatedAmount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `journalEntryId` int(11) NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create allocation_reversals_new
CREATE TABLE IF NOT EXISTS `allocation_reversals_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `allocationPeriodId` int(11) NOT NULL,
  `reversalDate` date NOT NULL,
  `reversalReason` text NULL,
  `reversalReasonAr` text NULL,
  `originalJournalEntryIds` text NULL,
  `reversalJournalEntryIds` text NULL,
  `totalReversedAmount` decimal(15,2) NULL DEFAULT 0.00,
  `reversedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `reversedBy` int(11) NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create allocation_rules_new
CREATE TABLE IF NOT EXISTS `allocation_rules_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `costPoolId` int(11) NOT NULL,
  `allocationKeyId` int(11) NOT NULL,
  `effectiveFrom` date NOT NULL,
  `effectiveTo` date NULL,
  `isActive` tinyint(1) NULL DEFAULT 1,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` varchar(255) NULL,
  `updatedBy` varchar(255) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create allocation_template_rules_new
CREATE TABLE IF NOT EXISTS `allocation_template_rules_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `templateId` int(11) NOT NULL,
  `costPoolId` int(11) NOT NULL,
  `allocationKeyId` int(11) NOT NULL,
  `priority` int(11) NULL DEFAULT 1,
  `isActive` tinyint(1) NULL DEFAULT 1,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create allocation_templates_new
CREATE TABLE IF NOT EXISTS `allocation_templates_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `templateCode` varchar(50) NOT NULL,
  `templateName` varchar(255) NOT NULL,
  `templateNameAr` varchar(255) NULL,
  `description` text NULL,
  `descriptionAr` text NULL,
  `periodType` enum('monthly','quarterly','annual','custom') NULL DEFAULT monthly,
  `isActive` tinyint(1) NULL DEFAULT 1,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create asset_depreciation_schedule_new
CREATE TABLE IF NOT EXISTS `asset_depreciation_schedule_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `assetId` int(11) NOT NULL,
  `fiscalYearId` int(11) NULL,
  `fiscalPeriodId` int(11) NULL,
  `periodDate` date NOT NULL,
  `periodNumber` int(11) NOT NULL,
  `openingBookValue` decimal(15,2) NOT NULL,
  `depreciationAmount` decimal(15,2) NOT NULL,
  `accumulatedDepreciation` decimal(15,2) NOT NULL,
  `closingBookValue` decimal(15,2) NOT NULL,
  `depreciationMethod` enum('straight_line','declining_balance','units_of_production') NULL DEFAULT straight_line,
  `isPosted` tinyint(1) NULL DEFAULT 0,
  `journalEntryId` int(11) NULL,
  `postedAt` timestamp NULL,
  `postedBy` int(11) NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create audit_log_export_history_new
CREATE TABLE IF NOT EXISTS `audit_log_export_history_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `scheduleId` int(11) NULL,
  `exportDate` bigint(20) NOT NULL,
  `recordCount` int(11) NOT NULL,
  `filePath` text NOT NULL,
  `fileSize` bigint(20) NOT NULL,
  `recipients` text NOT NULL,
  `status` enum('pending','completed','failed') NOT NULL DEFAULT pending,
  `errorMessage` text NULL,
  `triggeredBy` int(11) NULL,
  `createdAt` bigint(20) NOT NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create audit_log_export_schedules_new
CREATE TABLE IF NOT EXISTS `audit_log_export_schedules_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `scheduleName` varchar(255) NOT NULL,
  `frequency` enum('weekly','monthly') NOT NULL,
  `dayOfExecution` int(11) NOT NULL,
  `recipients` text NOT NULL,
  `lastRunAt` bigint(20) NULL,
  `nextRunAt` bigint(20) NOT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdBy` int(11) NULL,
  `createdAt` bigint(20) NOT NULL,
  `updatedAt` bigint(20) NOT NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create audit_logs_new
CREATE TABLE IF NOT EXISTS `audit_logs_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NULL,
  `organizationId` int(11) NULL,
  `operatingUnitId` int(11) NULL,
  `action` varchar(100) NOT NULL,
  `entityType` varchar(100) NULL,
  `entityId` int(11) NULL,
  `details` text NULL,
  `ipAddress` varchar(45) NULL,
  `userAgent` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create bank_reconciliations_new
CREATE TABLE IF NOT EXISTS `bank_reconciliations_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `bankAccountId` int(11) NOT NULL,
  `reconciliationNumber` varchar(50) NOT NULL,
  `reconciliationDate` date NOT NULL,
  `statementDate` date NOT NULL,
  `statementBalance` decimal(15,2) NOT NULL,
  `bookBalance` decimal(15,2) NOT NULL,
  `adjustedBookBalance` decimal(15,2) NULL,
  `outstandingDeposits` decimal(15,2) NULL DEFAULT 0.00,
  `outstandingCheques` decimal(15,2) NULL DEFAULT 0.00,
  `difference` decimal(15,2) NULL DEFAULT 0.00,
  `status` enum('draft','in_progress','completed','approved') NULL DEFAULT draft,
  `notes` text NULL,
  `completedAt` timestamp NULL,
  `completedBy` int(11) NULL,
  `approvedAt` timestamp NULL,
  `approvedBy` int(11) NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create bank_transactions_new
CREATE TABLE IF NOT EXISTS `bank_transactions_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `bankAccountId` int(11) NOT NULL,
  `transactionDate` date NOT NULL,
  `valueDate` date NULL,
  `transactionType` enum('credit','debit') NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `currencyId` int(11) NULL,
  `exchangeRate` decimal(15,6) NULL DEFAULT 1.000000,
  `amountInBaseCurrency` decimal(15,2) NULL,
  `reference` varchar(255) NULL,
  `description` text NULL,
  `descriptionAr` text NULL,
  `counterpartyName` varchar(255) NULL,
  `counterpartyAccount` varchar(100) NULL,
  `statementReference` varchar(100) NULL,
  `importBatchId` int(11) NULL,
  `isReconciled` tinyint(1) NULL DEFAULT 0,
  `reconciledAt` timestamp NULL,
  `reconciledBy` int(11) NULL,
  `reconciliationId` int(11) NULL,
  `matchedTransactionType` varchar(50) NULL,
  `matchedTransactionId` int(11) NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create beneficiaries_new
CREATE TABLE IF NOT EXISTS `beneficiaries_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `projectId` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `fullName` varchar(255) NOT NULL,
  `fullNameAr` varchar(255) NULL,
  `dateOfBirth` date NULL,
  `identificationType` enum('id_card','passport','family_card','other') NULL,
  `identificationTypeOther` varchar(255) NULL,
  `identificationNumber` varchar(100) NULL,
  `identificationAttachment` varchar(500) NULL,
  `gender` enum('male','female','other') NOT NULL,
  `ageGroup` enum('0-5','6-12','13-17','18-35','36-60','60+') NULL,
  `nationality` varchar(100) NULL,
  `phoneNumber` varchar(50) NULL,
  `email` varchar(320) NULL,
  `country` varchar(100) NULL,
  `governorate` varchar(255) NULL,
  `district` varchar(255) NULL,
  `village` varchar(255) NULL,
  `address` text NULL,
  `addressAr` text NULL,
  `communityType` enum('idp','refugee','host_community','returnee','other') NULL,
  `communityTypeOther` varchar(255) NULL,
  `householdSize` int(11) NULL,
  `dependents` int(11) NULL,
  `vulnerabilityCategory` varchar(255) NULL,
  `vulnerabilityOther` varchar(255) NULL,
  `disabilityStatus` tinyint(1) NOT NULL DEFAULT 0,
  `disabilityType` varchar(255) NULL,
  `activityId` int(11) NULL,
  `serviceType` enum('training','workshop','items_distribution','pss','other') NULL,
  `serviceTypeOther` varchar(255) NULL,
  `serviceStatus` enum('registered','active','completed','suspended') NOT NULL DEFAULT REGISTERED,
  `registrationDate` date NOT NULL,
  `verificationStatus` enum('verified','not_eligible','pending') NULL DEFAULT PENDING,
  `verifiedBy` varchar(255) NULL,
  `verificationDate` date NULL,
  `notes` text NULL,
  `notesAr` text NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create bid_analyses_new
CREATE TABLE IF NOT EXISTS `bid_analyses_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `purchaseRequestId` int(11) NULL,
  `cbaNumber` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `titleAr` varchar(255) NULL,
  `tenderDate` timestamp NULL,
  `closingDate` timestamp NULL,
  `openingDate` timestamp NULL,
  `evaluationMethod` enum('lowest_price','best_value','quality_cost_based') NULL DEFAULT lowest_price,
  `technicalWeight` decimal(5,2) NULL DEFAULT 70,
  `financialWeight` decimal(5,2) NULL DEFAULT 30,
  `minimumTechnicalScore` decimal(5,2) NULL DEFAULT 70,
  `selectedBidderId` int(11) NULL,
  `selectionJustification` text NULL,
  `status` enum('draft','published','bids_received','technical_evaluation','financial_evaluation','awarded','cancelled') NOT NULL DEFAULT draft,
  `approvedBy` int(11) NULL,
  `approvedAt` timestamp NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  `announcementStartDate` timestamp NULL,
  `announcementEndDate` timestamp NULL,
  `announcementChannel` enum('website','newspaper','donor_portal','other') NULL,
  `announcementLink` text NULL,
  `announcementReference` varchar(100) NULL,
  `numberOfBidders` int(11) NULL DEFAULT 0,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create bid_analysis_bidders_new
CREATE TABLE IF NOT EXISTS `bid_analysis_bidders_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `bidAnalysisId` int(11) NOT NULL,
  `supplierId` int(11) NULL,
  `bidderName` varchar(255) NULL,
  `submissionDate` timestamp NULL,
  `submissionStatus` enum('received','valid','disqualified') NULL DEFAULT received,
  `bidReference` varchar(100) NULL,
  `bidDate` timestamp NULL,
  `totalBidAmount` decimal(15,2) NULL DEFAULT 0,
  `currency` varchar(10) NULL DEFAULT USD,
  `technicalScore` decimal(5,2) NULL,
  `financialScore` decimal(5,2) NULL,
  `combinedScore` decimal(5,2) NULL,
  `rank` int(11) NULL,
  `isResponsive` tinyint(1) NULL DEFAULT 1,
  `nonResponsiveReason` text NULL,
  `isSelected` tinyint(1) NULL DEFAULT 0,
  `remarks` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create bid_evaluation_criteria_new
CREATE TABLE IF NOT EXISTS `bid_evaluation_criteria_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `bidAnalysisId` int(11) NOT NULL,
  `criteriaType` enum('technical','financial') NOT NULL DEFAULT technical,
  `name` varchar(255) NOT NULL,
  `nameAr` varchar(255) NULL,
  `description` text NULL,
  `maxScore` decimal(5,2) NOT NULL,
  `weight` decimal(5,2) NULL DEFAULT 1,
  `sortOrder` int(11) NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `sectionNumber` int(11) NULL DEFAULT 1,
  `sectionName` varchar(255) NULL,
  `sectionNameAr` varchar(255) NULL,
  `stage` varchar(255) NULL DEFAULT MUST be Submitted with the Bid,
  `stageAr` varchar(255) NULL,
  `isScreening` tinyint(1) NULL DEFAULT 0,
  `isApplicable` tinyint(1) NULL DEFAULT 1,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create bid_evaluation_scores_new
CREATE TABLE IF NOT EXISTS `bid_evaluation_scores_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `bidAnalysisId` int(11) NOT NULL,
  `criterionId` int(11) NOT NULL,
  `bidderId` int(11) NOT NULL,
  `score` decimal(5,2) NULL DEFAULT 0,
  `status` enum('scored','none','na','not_yet_completed') NULL DEFAULT scored,
  `notes` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create bid_opening_minutes_new
CREATE TABLE IF NOT EXISTS `bid_opening_minutes_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `purchaseRequestId` int(11) NOT NULL,
  `bidAnalysisId` int(11) NULL,
  `minutesNumber` varchar(50) NOT NULL,
  `openingDate` timestamp NOT NULL,
  `openingTime` varchar(10) NULL,
  `openingVenue` varchar(255) NULL,
  `openingMode` enum('physical','online','hybrid') NULL DEFAULT physical,
  `openingLocation` varchar(255) NULL,
  `chairpersonId` int(11) NULL,
  `chairpersonName` varchar(255) NULL,
  `member1Id` int(11) NULL,
  `member1Name` varchar(255) NULL,
  `member2Id` int(11) NULL,
  `member2Name` varchar(255) NULL,
  `member3Id` int(11) NULL,
  `member3Name` varchar(255) NULL,
  `totalBidsReceived` int(11) NULL DEFAULT 0,
  `bidsOpenedCount` int(11) NULL DEFAULT 0,
  `openingNotes` text NULL,
  `irregularities` text NULL,
  `status` enum('draft','finalized','approved') NOT NULL DEFAULT draft,
  `finalizedAt` timestamp NULL,
  `finalizedBy` int(11) NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create budget_items_new
CREATE TABLE IF NOT EXISTS `budget_items_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `projectId` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `activityId` int(11) NULL,
  `fiscalYear` varchar(20) NULL,
  `budgetCode` varchar(100) NOT NULL,
  `subBL` varchar(100) NULL,
  `subBudgetLine` varchar(100) NULL,
  `activityName` text NULL,
  `budgetItem` text NOT NULL,
  `category` varchar(255) NULL,
  `quantity` decimal(15,2) NOT NULL,
  `unitType` varchar(100) NULL,
  `unitCost` decimal(15,2) NOT NULL,
  `recurrence` int(11) NOT NULL DEFAULT 1,
  `totalBudgetLine` decimal(15,2) NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT USD,
  `actualSpent` decimal(15,2) NOT NULL DEFAULT 0,
  `startDate` date NOT NULL,
  `endDate` date NOT NULL,
  `notes` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create budget_lines_new
CREATE TABLE IF NOT EXISTS `budget_lines_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `budgetId` int(11) NOT NULL,
  `projectId` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `lineCode` varchar(100) NOT NULL,
  `lineNumber` int(11) NULL,
  `description` text NOT NULL,
  `descriptionAr` text NULL,
  `categoryId` int(11) NULL,
  `accountId` int(11) NULL,
  `activityId` int(11) NULL,
  `unitType` enum('staff','item','service','lump_sum') NOT NULL,
  `unitCost` decimal(15,2) NOT NULL,
  `quantity` decimal(15,2) NOT NULL,
  `durationMonths` int(11) NOT NULL DEFAULT 1,
  `totalAmount` decimal(15,2) NOT NULL,
  `donorEligibleAmount` decimal(15,2) NULL,
  `donorEligibilityPercentage` decimal(5,2) NULL DEFAULT 100.00,
  `ineligibilityReason` text NULL,
  `ineligibilityReasonAr` text NULL,
  `donorMappingId` int(11) NULL,
  `locationId` int(11) NULL,
  `locationName` varchar(255) NULL,
  `implementationPeriodStart` date NULL,
  `implementationPeriodEnd` date NULL,
  `actualSpent` decimal(15,2) NOT NULL DEFAULT 0.00,
  `commitments` decimal(15,2) NOT NULL DEFAULT 0.00,
  `availableBalance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `justification` text NULL,
  `justificationAr` text NULL,
  `notes` text NULL,
  `notesAr` text NULL,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create budget_monthly_allocations_new
CREATE TABLE IF NOT EXISTS `budget_monthly_allocations_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `budgetLineId` int(11) NOT NULL,
  `budgetId` int(11) NOT NULL,
  `allocationMonth` date NOT NULL,
  `monthNumber` int(11) NOT NULL,
  `quarterNumber` int(11) NOT NULL,
  `fiscalYear` varchar(20) NOT NULL,
  `plannedAmount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `forecastAmount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `actualAmount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `variance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `notes` text NULL,
  `notesAr` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  `organizationId` int(11) NOT NULL DEFAULT 0,
  `operatingUnitId` int(11) NOT NULL DEFAULT 0,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create budget_reallocation_lines_new
CREATE TABLE IF NOT EXISTS `budget_reallocation_lines_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `reallocationId` int(11) NOT NULL,
  `lineNumber` int(11) NOT NULL,
  `lineType` enum('source','destination') NOT NULL,
  `projectId` int(11) NOT NULL,
  `budgetItemId` int(11) NULL,
  `glAccountId` int(11) NULL,
  `amount` decimal(15,2) NULL DEFAULT 0.00,
  `currency` varchar(10) NULL DEFAULT USD,
  `exchangeRate` decimal(15,6) NULL DEFAULT 1.000000,
  `baseCurrencyAmount` decimal(15,2) NULL DEFAULT 0.00,
  `description` text NULL,
  `descriptionAr` text NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `operatingUnitId` int(11) NOT NULL DEFAULT 0,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create budget_reallocations_new
CREATE TABLE IF NOT EXISTS `budget_reallocations_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `reallocationCode` varchar(50) NOT NULL,
  `reallocationDate` date NOT NULL,
  `description` text NULL,
  `descriptionAr` text NULL,
  `totalAmount` decimal(15,2) NULL DEFAULT 0.00,
  `currency` varchar(10) NULL DEFAULT USD,
  `exchangeRate` decimal(15,6) NULL DEFAULT 1.000000,
  `baseCurrencyAmount` decimal(15,2) NULL DEFAULT 0.00,
  `status` enum('draft','pending_approval','approved','rejected','executed','cancelled') NULL DEFAULT draft,
  `justification` text NULL,
  `justificationAr` text NULL,
  `submittedAt` timestamp NULL,
  `submittedBy` int(11) NULL,
  `approvedAt` timestamp NULL,
  `approvedBy` int(11) NULL,
  `rejectedAt` timestamp NULL,
  `rejectedBy` int(11) NULL,
  `rejectionReason` text NULL,
  `rejectionReasonAr` text NULL,
  `executedAt` timestamp NULL,
  `executedBy` int(11) NULL,
  `journalEntryId` int(11) NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  `operatingUnitId` int(11) NOT NULL DEFAULT 0,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create budgets_new
CREATE TABLE IF NOT EXISTS `budgets_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `projectId` int(11) NOT NULL,
  `grantId` int(11) NULL,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `budgetCode` varchar(100) NULL,
  `budgetTitle` varchar(500) NULL,
  `budgetTitleAr` varchar(500) NULL,
  `fiscalYear` varchar(20) NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT USD,
  `baseCurrency` varchar(10) NOT NULL DEFAULT USD,
  `exchangeRate` decimal(15,6) NULL DEFAULT 1.000000,
  `totalApprovedAmount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `totalForecastAmount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `totalActualAmount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `versionNumber` int(11) NOT NULL DEFAULT 1,
  `parentBudgetId` int(11) NULL,
  `revisionNotes` text NULL,
  `revisionNotesAr` text NULL,
  `status` enum('draft','submitted','approved','revised','closed','rejected') NOT NULL DEFAULT draft,
  `submittedAt` timestamp NULL,
  `submittedBy` int(11) NULL,
  `approvedAt` timestamp NULL,
  `approvedBy` int(11) NULL,
  `rejectedAt` timestamp NULL,
  `rejectedBy` int(11) NULL,
  `rejectionReason` text NULL,
  `rejectionReasonAr` text NULL,
  `periodStart` date NOT NULL,
  `periodEnd` date NOT NULL,
  `notes` text NULL,
  `notesAr` text NULL,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create case_activities_new
CREATE TABLE IF NOT EXISTS `case_activities_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `caseId` int(11) NOT NULL,
  `projectId` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `activityType` varchar(50) NOT NULL,
  `activityDate` date NOT NULL,
  `provider` varchar(255) NULL,
  `notes` text NULL,
  `linkedActivityId` int(11) NULL,
  `linkedIndicatorId` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create case_records_new
CREATE TABLE IF NOT EXISTS `case_records_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `projectId` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `caseCode` varchar(50) NOT NULL,
  `beneficiaryCode` varchar(50) NOT NULL,
  `firstName` varchar(100) NULL,
  `lastName` varchar(100) NULL,
  `dateOfBirth` date NULL,
  `gender` varchar(20) NULL,
  `age` int(11) NULL,
  `nationality` varchar(100) NULL,
  `idNumber` varchar(100) NULL,
  `hasDisability` tinyint(1) NULL DEFAULT 0,
  `location` varchar(255) NULL,
  `district` varchar(100) NULL,
  `community` varchar(100) NULL,
  `householdSize` int(11) NULL,
  `vulnerabilityCategory` varchar(100) NULL,
  `phoneNumber` varchar(50) NULL,
  `email` varchar(320) NULL,
  `address` text NULL,
  `caseType` varchar(50) NOT NULL,
  `riskLevel` varchar(20) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT open,
  `openedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `closedAt` timestamp NULL,
  `referralSource` varchar(255) NULL,
  `intakeDate` date NULL,
  `identifiedNeeds` text NULL,
  `riskFactors` text NULL,
  `immediateConcerns` text NULL,
  `informedConsentObtained` tinyint(1) NOT NULL DEFAULT 0,
  `consentDate` date NULL,
  `assignedPssOfficerId` int(11) NULL,
  `assignedCaseWorkerId` int(11) NULL,
  `assignedTo` varchar(255) NULL,
  `plannedInterventions` text NULL,
  `responsiblePerson` varchar(255) NULL,
  `expectedOutcomes` text NULL,
  `timeline` varchar(255) NULL,
  `reviewDate` date NULL,
  `notes` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create case_referrals_new
CREATE TABLE IF NOT EXISTS `case_referrals_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `caseId` int(11) NOT NULL,
  `projectId` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `referralDate` date NOT NULL,
  `referralType` varchar(20) NOT NULL,
  `serviceRequired` varchar(255) NOT NULL,
  `receivingOrganization` varchar(255) NOT NULL,
  `focalPoint` varchar(255) NULL,
  `focalPointContact` varchar(255) NULL,
  `status` varchar(20) NOT NULL DEFAULT pending,
  `followUpDate` date NULL,
  `feedbackReceived` tinyint(1) NULL DEFAULT 0,
  `feedbackNotes` text NULL,
  `consentObtained` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create chart_of_accounts_new
CREATE TABLE IF NOT EXISTS `chart_of_accounts_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `accountCode` varchar(50) NOT NULL,
  `accountNameEn` varchar(255) NOT NULL,
  `accountNameAr` varchar(255) NULL,
  `accountType` enum('asset','liability','equity','income','expense') NOT NULL,
  `parentAccountCode` varchar(50) NULL,
  `description` text NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create child_safe_spaces_new
CREATE TABLE IF NOT EXISTS `child_safe_spaces_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `projectId` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `cssName` varchar(255) NOT NULL,
  `cssCode` varchar(50) NOT NULL,
  `location` varchar(255) NOT NULL,
  `operatingPartner` varchar(255) NULL,
  `capacity` int(11) NULL,
  `ageGroupsServed` varchar(100) NULL,
  `genderSegregation` tinyint(1) NULL DEFAULT 0,
  `operatingDays` varchar(100) NULL,
  `operatingHours` varchar(100) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create cost_centers_new
CREATE TABLE IF NOT EXISTS `cost_centers_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `nameAr` varchar(255) NULL,
  `description` text NULL,
  `descriptionAr` text NULL,
  `parentId` int(11) NULL,
  `level` int(11) NULL DEFAULT 1,
  `managerId` int(11) NULL,
  `projectId` int(11) NULL,
  `grantId` int(11) NULL,
  `isActive` tinyint(1) NULL DEFAULT 1,
  `sortOrder` int(11) NULL DEFAULT 0,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create cost_pool_transactions_new
CREATE TABLE IF NOT EXISTS `cost_pool_transactions_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `costPoolId` int(11) NOT NULL,
  `transactionDate` date NOT NULL,
  `amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `description` text NULL,
  `descriptionAr` text NULL,
  `sourceModule` enum('manual','expense','payment','journal_entry','import') NULL DEFAULT manual,
  `sourceDocumentId` int(11) NULL,
  `sourceDocumentType` varchar(50) NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` varchar(255) NULL,
  `updatedBy` varchar(255) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create cost_pools_new
CREATE TABLE IF NOT EXISTS `cost_pools_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `poolCode` varchar(50) NOT NULL,
  `poolName` varchar(255) NOT NULL,
  `poolNameAr` varchar(255) NULL,
  `description` text NULL,
  `descriptionAr` text NULL,
  `poolType` enum('overhead','shared_service','administrative','facility','other') NULL DEFAULT overhead,
  `glAccountId` int(11) NULL,
  `isActive` tinyint(1) NULL DEFAULT 1,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` varchar(255) NULL,
  `updatedBy` varchar(255) NULL,
  `deletedAt` timestamp NULL,
  `deletedBy` varchar(255) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create css_activities_new
CREATE TABLE IF NOT EXISTS `css_activities_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cssId` int(11) NOT NULL,
  `projectId` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `activityType` varchar(50) NOT NULL,
  `activityDate` date NOT NULL,
  `facilitatorId` int(11) NULL,
  `facilitatorName` varchar(255) NULL,
  `participantsCount` int(11) NOT NULL DEFAULT 0,
  `maleCount` int(11) NULL DEFAULT 0,
  `femaleCount` int(11) NULL DEFAULT 0,
  `notes` text NULL,
  `linkedCaseId` int(11) NULL,
  `linkedIndicatorId` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create donor_budget_mapping_new
CREATE TABLE IF NOT EXISTS `donor_budget_mapping_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `internalCategoryId` int(11) NOT NULL,
  `internalCategoryCode` varchar(50) NULL,
  `internalCategoryName` varchar(255) NULL,
  `donorId` int(11) NULL,
  `donorName` varchar(255) NULL,
  `donorCategoryCode` varchar(100) NOT NULL,
  `donorCategoryName` varchar(500) NOT NULL,
  `donorCategoryNameAr` varchar(500) NULL,
  `mappingRules` json NULL,
  `donorReportingLevel` int(11) NULL DEFAULT 1,
  `donorSortOrder` int(11) NULL DEFAULT 0,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `notes` text NULL,
  `notesAr` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create donor_communications_new
CREATE TABLE IF NOT EXISTS `donor_communications_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `donorId` int(11) NOT NULL,
  `date` timestamp NOT NULL,
  `channel` enum('email','meeting','call','visit','letter','video_call','other') NOT NULL DEFAULT email,
  `subject` varchar(500) NOT NULL,
  `subjectAr` varchar(500) NULL,
  `summary` text NOT NULL,
  `summaryAr` text NULL,
  `participants` text NULL,
  `contactPerson` varchar(255) NULL,
  `nextActionDate` timestamp NULL,
  `nextActionDescription` text NULL,
  `attachments` text NULL,
  `status` enum('completed','pending','cancelled') NULL DEFAULT completed,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create donor_projects_new
CREATE TABLE IF NOT EXISTS `donor_projects_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `donorId` int(11) NOT NULL,
  `projectId` int(11) NOT NULL,
  `relationshipType` enum('primary_funder','co_funder','in_kind','technical_partner','potential','past') NOT NULL DEFAULT primary_funder,
  `status` enum('active','pending','completed','cancelled') NOT NULL DEFAULT active,
  `fundingAmount` decimal(15,2) NULL,
  `currency` varchar(10) NULL DEFAULT USD,
  `fundingPercentage` decimal(5,2) NULL,
  `startDate` timestamp NULL,
  `endDate` timestamp NULL,
  `notes` text NULL,
  `notesAr` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create donor_reports_new
CREATE TABLE IF NOT EXISTS `donor_reports_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `donorId` int(11) NULL,
  `projectId` int(11) NULL,
  `grantId` int(11) NULL,
  `reportType` enum('donor_summary','funding_history','pipeline_status','budget_vs_actual','grant_performance','communication_log','custom') NOT NULL DEFAULT donor_summary,
  `title` varchar(500) NOT NULL,
  `titleAr` varchar(500) NULL,
  `periodStart` timestamp NULL,
  `periodEnd` timestamp NULL,
  `parametersJSON` text NULL,
  `generatedByUserId` int(11) NULL,
  `generatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('draft','final','archived') NULL DEFAULT final,
  `fileUrl` text NULL,
  `pdfUrl` text NULL,
  `excelUrl` text NULL,
  `documentId` int(11) NULL,
  `reportDataJSON` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create donors_new
CREATE TABLE IF NOT EXISTS `donors_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `nameAr` varchar(255) NULL,
  `type` enum('bilateral','multilateral','foundation','corporate','individual','government','ngo','other') NULL DEFAULT other,
  `category` varchar(100) NULL,
  `contactPersonName` varchar(255) NULL,
  `contactPersonTitle` varchar(255) NULL,
  `email` varchar(255) NULL,
  `phone` varchar(50) NULL,
  `website` varchar(255) NULL,
  `address` text NULL,
  `city` varchar(100) NULL,
  `country` varchar(100) NULL,
  `postalCode` varchar(20) NULL,
  `notes` text NULL,
  `notesAr` text NULL,
  `logoUrl` text NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create drivers_new
CREATE TABLE IF NOT EXISTS `drivers_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `driverCode` varchar(50) NOT NULL,
  `firstName` varchar(100) NULL,
  `lastName` varchar(100) NULL,
  `firstNameAr` varchar(100) NULL,
  `lastNameAr` varchar(100) NULL,
  `fullName` varchar(255) NOT NULL,
  `fullNameAr` varchar(255) NULL,
  `staffId` int(11) NULL,
  `licenseNumber` varchar(100) NULL,
  `licenseType` varchar(50) NULL,
  `licenseExpiry` date NULL,
  `licenseExpiryDate` date NULL,
  `licenseIssuingCountry` varchar(100) NULL,
  `phone` varchar(50) NULL,
  `email` varchar(320) NULL,
  `status` enum('active','inactive','on_leave','terminated') NOT NULL DEFAULT active,
  `photoUrl` text NULL,
  `notes` text NULL,
  `operatingUnitId` int(11) NULL,
  `employeeId` int(11) NULL,
  `organizationId` int(11) NOT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create email_provider_settings_new
CREATE TABLE IF NOT EXISTS `email_provider_settings_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `providerType` enum('m365','smtp','disabled') NOT NULL DEFAULT disabled,
  `tenantId` varchar(255) NULL,
  `clientId` varchar(255) NULL,
  `authType` enum('secret','certificate') NULL,
  `secretRef` text NULL,
  `certificateRef` text NULL,
  `senderMode` enum('shared_mailbox','user_mailbox') NULL,
  `smtpHost` varchar(255) NULL,
  `smtpPort` int(11) NULL,
  `smtpUsername` varchar(255) NULL,
  `smtpPassword` text NULL,
  `smtpEncryption` enum('tls','ssl','none') NULL DEFAULT tls,
  `fromEmail` varchar(320) NULL,
  `fromName` varchar(255) NULL,
  `replyToEmail` varchar(320) NULL,
  `defaultCc` text NULL,
  `defaultBcc` text NULL,
  `allowedDomains` text NULL,
  `isConnected` tinyint(1) NOT NULL DEFAULT 0,
  `lastSuccessfulSend` timestamp NULL,
  `lastError` text NULL,
  `lastTestedAt` timestamp NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create email_templates_new
CREATE TABLE IF NOT EXISTS `email_templates_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `templateKey` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `nameAr` varchar(255) NULL,
  `subject` varchar(500) NULL,
  `subjectAr` varchar(500) NULL,
  `bodyHtml` text NULL,
  `bodyHtmlAr` text NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create expenditures_new
CREATE TABLE IF NOT EXISTS `expenditures_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `expenditureNumber` varchar(50) NOT NULL,
  `expenditureDate` date NOT NULL,
  `vendorId` int(11) NULL,
  `vendorName` varchar(255) NOT NULL,
  `vendorNameAr` varchar(255) NULL,
  `expenditureType` enum('operational','project','administrative','travel','procurement','other') NOT NULL,
  `category` varchar(100) NULL,
  `description` text NOT NULL,
  `descriptionAr` text NULL,
  `amount` decimal(15,2) NOT NULL,
  `currencyId` int(11) NULL,
  `exchangeRateId` int(11) NULL,
  `amountInBaseCurrency` decimal(15,2) NULL,
  `projectId` int(11) NULL,
  `grantId` int(11) NULL,
  `budgetLineId` int(11) NULL,
  `glAccountId` int(11) NULL,
  `accountCode` varchar(50) NULL,
  `journalEntryId` int(11) NULL,
  `postingStatus` enum('unposted','posted','reversed') NULL DEFAULT unposted,
  `status` enum('draft','pending_approval','approved','rejected','paid','cancelled') NOT NULL DEFAULT DRAFT,
  `submittedBy` int(11) NULL,
  `submittedAt` timestamp NULL,
  `approvedBy` int(11) NULL,
  `approvedAt` timestamp NULL,
  `rejectionReason` text NULL,
  `paymentId` int(11) NULL,
  `paidAt` timestamp NULL,
  `attachments` text NULL,
  `version` int(11) NOT NULL DEFAULT 1,
  `parentId` int(11) NULL,
  `revisionReason` text NULL,
  `isLatestVersion` tinyint(1) NOT NULL DEFAULT 1,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create expenses_new
CREATE TABLE IF NOT EXISTS `expenses_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `budgetItemId` int(11) NOT NULL,
  `projectId` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `expenseDate` date NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `fiscalYear` varchar(20) NOT NULL,
  `month` int(11) NOT NULL,
  `reference` varchar(255) NULL,
  `description` text NULL,
  `documentUrl` text NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT pending,
  `approvedBy` int(11) NULL,
  `approvedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  `grantId` int(11) NULL,
  `currencyId` int(11) NULL,
  `exchangeRateId` int(11) NULL,
  `amountInBaseCurrency` decimal(15,2) NULL,
  `vendorId` int(11) NULL,
  `payeeName` varchar(255) NULL,
  `paymentMethod` enum('cash','bank','mobile','cheque') NULL,
  `bankAccountId` int(11) NULL,
  `isReimbursable` tinyint(1) NULL DEFAULT 0,
  `glAccountId` int(11) NULL,
  `journalEntryId` int(11) NULL,
  `postingStatus` enum('unposted','posted','reversed') NULL DEFAULT unposted,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create finance_advances_new
CREATE TABLE IF NOT EXISTS `finance_advances_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `advanceNumber` varchar(50) NOT NULL,
  `employeeId` int(11) NULL,
  `employeeName` varchar(255) NOT NULL,
  `employeeNameAr` varchar(255) NULL,
  `department` varchar(100) NULL,
  `advanceType` enum('travel','project','operational','salary','other') NOT NULL,
  `purpose` text NOT NULL,
  `purposeAr` text NULL,
  `requestedAmount` decimal(15,2) NOT NULL,
  `approvedAmount` decimal(15,2) NULL,
  `currency` varchar(10) NOT NULL DEFAULT USD,
  `requestDate` timestamp NOT NULL,
  `expectedSettlementDate` timestamp NULL,
  `actualSettlementDate` timestamp NULL,
  `status` enum('draft','pending','approved','rejected','partially_settled','fully_settled','cancelled') NOT NULL DEFAULT DRAFT,
  `approvedBy` int(11) NULL,
  `approvedAt` timestamp NULL,
  `rejectionReason` text NULL,
  `settledAmount` decimal(15,2) NULL DEFAULT 0,
  `outstandingBalance` decimal(15,2) NULL,
  `projectId` int(11) NULL,
  `accountCode` varchar(50) NULL,
  `notes` text NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedBy` int(11) NULL,
  `grantId` int(11) NULL,
  `currencyId` int(11) NULL,
  `exchangeRateId` int(11) NULL,
  `amountInBaseCurrency` decimal(15,2) NULL,
  `glAccountId` int(11) NULL,
  `journalEntryId` int(11) NULL,
  `postingStatus` enum('unposted','posted','reversed') NULL DEFAULT unposted,
  `disbursementDate` timestamp NULL,
  `cashAccountId` int(11) NULL,
  `bankAccountId` int(11) NULL,
  `version` int(11) NOT NULL DEFAULT 1,
  `parentId` int(11) NULL,
  `revisionReason` text NULL,
  `isLatestVersion` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create finance_approval_thresholds_new
CREATE TABLE IF NOT EXISTS `finance_approval_thresholds_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `nameAr` varchar(255) NULL,
  `category` enum('expense','advance','procurement','budget_transfer','asset_disposal','payment','journal_entry') NULL DEFAULT expense,
  `minAmount` decimal(15,2) NULL DEFAULT 0.00,
  `maxAmount` decimal(15,2) NULL,
  `currency` varchar(10) NULL DEFAULT USD,
  `approverRole` varchar(100) NULL,
  `approverUserId` int(11) NULL,
  `requiresMultipleApprovers` tinyint(1) NOT NULL DEFAULT 0,
  `approverCount` int(11) NULL DEFAULT 1,
  `sequentialApproval` tinyint(1) NOT NULL DEFAULT 0,
  `autoApproveBelow` decimal(15,2) NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `notes` text NULL,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `appliesToModule` enum('expenses','advances','cash_transactions','assets','procurement','budget_revision') NULL,
  `appliesToTransactionType` varchar(50) NULL,
  `currencyId` int(11) NULL,
  `isAmountInBaseCurrency` tinyint(1) NULL DEFAULT 1,
  `effectiveFrom` date NULL,
  `effectiveTo` date NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create finance_asset_categories_new
CREATE TABLE IF NOT EXISTS `finance_asset_categories_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `nameAr` varchar(255) NULL,
  `description` text NULL,
  `parentId` int(11) NULL,
  `depreciationRate` decimal(5,2) NULL DEFAULT 0.00,
  `defaultUsefulLife` int(11) NULL DEFAULT 5,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `assetAccountId` int(11) NULL,
  `accumulatedDepAccountId` int(11) NULL,
  `depreciationExpenseAccountId` int(11) NULL,
  `defaultDepreciationMethod` enum('straight_line','declining_balance','units_of_production') NULL DEFAULT straight_line,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create finance_asset_disposals_new
CREATE TABLE IF NOT EXISTS `finance_asset_disposals_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `disposalCode` varchar(50) NOT NULL,
  `assetId` int(11) NOT NULL,
  `disposalType` enum('sale','donation','scrap','theft','loss','transfer_out','write_off') NULL DEFAULT sale,
  `proposedDate` date NULL,
  `actualDate` date NULL,
  `bookValue` decimal(15,2) NULL DEFAULT 0.00,
  `proposedValue` decimal(15,2) NULL DEFAULT 0.00,
  `actualValue` decimal(15,2) NULL DEFAULT 0.00,
  `currency` varchar(10) NULL DEFAULT USD,
  `reason` text NULL,
  `status` enum('draft','pending_approval','approved','rejected','completed','cancelled') NULL DEFAULT draft,
  `buyerInfo` text NULL,
  `recipientInfo` text NULL,
  `approvedBy` int(11) NULL,
  `approvalDate` timestamp NULL,
  `rejectionReason` text NULL,
  `notes` text NULL,
  `attachments` json NULL,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `disposalCommitteeMembers` text NULL,
  `disposalDocumentId` int(11) NULL,
  `journalEntryId` int(11) NULL,
  `buyerVendorId` int(11) NULL,
  `paymentReference` varchar(100) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create finance_asset_maintenance_new
CREATE TABLE IF NOT EXISTS `finance_asset_maintenance_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `assetId` int(11) NOT NULL,
  `maintenanceType` enum('preventive','corrective','inspection','upgrade','repair') NULL DEFAULT preventive,
  `description` text NULL,
  `cost` decimal(15,2) NULL DEFAULT 0.00,
  `currency` varchar(10) NULL DEFAULT USD,
  `performedBy` varchar(255) NULL,
  `vendorName` varchar(255) NULL,
  `performedDate` date NULL,
  `nextDueDate` date NULL,
  `notes` text NULL,
  `attachments` json NULL,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `vendorId` int(11) NULL,
  `workOrderNumber` varchar(50) NULL,
  `documentId` int(11) NULL,
  `expenseId` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create finance_asset_transfers_new
CREATE TABLE IF NOT EXISTS `finance_asset_transfers_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `transferCode` varchar(50) NOT NULL,
  `assetId` int(11) NOT NULL,
  `fromLocation` varchar(255) NULL,
  `toLocation` varchar(255) NULL,
  `fromAssignee` varchar(255) NULL,
  `toAssignee` varchar(255) NULL,
  `fromAssigneeUserId` int(11) NULL,
  `toAssigneeUserId` int(11) NULL,
  `transferDate` date NULL,
  `reason` text NULL,
  `status` enum('pending','approved','rejected','completed','cancelled') NULL DEFAULT pending,
  `approvedBy` int(11) NULL,
  `approvalDate` timestamp NULL,
  `rejectionReason` text NULL,
  `notes` text NULL,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fromOperatingUnitId` int(11) NULL,
  `toOperatingUnitId` int(11) NULL,
  `journalEntryId` int(11) NULL,
  `attachments` text NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create finance_assets_new
CREATE TABLE IF NOT EXISTS `finance_assets_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `assetCode` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `nameAr` varchar(255) NULL,
  `description` text NULL,
  `categoryId` int(11) NULL,
  `subcategory` varchar(100) NULL,
  `acquisitionDate` date NULL,
  `acquisitionCost` decimal(15,2) NULL DEFAULT 0.00,
  `currency` varchar(10) NULL DEFAULT USD,
  `depreciationMethod` enum('straight_line','declining_balance','units_of_production','none') NULL DEFAULT straight_line,
  `usefulLifeYears` int(11) NULL DEFAULT 5,
  `salvageValue` decimal(15,2) NULL DEFAULT 0.00,
  `accumulatedDepreciation` decimal(15,2) NULL DEFAULT 0.00,
  `currentValue` decimal(15,2) NULL DEFAULT 0.00,
  `status` enum('active','in_maintenance','disposed','lost','transferred','pending_disposal') NULL DEFAULT active,
  `condition` enum('excellent','good','fair','poor','non_functional') NULL DEFAULT good,
  `location` varchar(255) NULL,
  `assignedTo` varchar(255) NULL,
  `assignedToUserId` int(11) NULL,
  `donorId` int(11) NULL,
  `donorName` varchar(255) NULL,
  `grantId` int(11) NULL,
  `grantCode` varchar(100) NULL,
  `projectId` int(11) NULL,
  `serialNumber` varchar(100) NULL,
  `manufacturer` varchar(255) NULL,
  `model` varchar(255) NULL,
  `warrantyExpiry` date NULL,
  `lastMaintenanceDate` date NULL,
  `nextMaintenanceDate` date NULL,
  `disposalDate` date NULL,
  `disposalMethod` enum('sale','donation','scrap','theft','loss','transfer') NULL,
  `disposalValue` decimal(15,2) NULL,
  `disposalReason` text NULL,
  `disposalApprovedBy` int(11) NULL,
  `insurancePolicy` varchar(100) NULL,
  `insuranceExpiry` date NULL,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `assetTag` varchar(50) NULL,
  `purchaseOrderId` int(11) NULL,
  `invoiceId` int(11) NULL,
  `supplierId` int(11) NULL,
  `assetGlAccountCode` varchar(50) NULL,
  `depreciationExpenseGlAccountCode` varchar(50) NULL,
  `accumulatedDepreciationGlAccountCode` varchar(50) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create finance_bank_accounts_new
CREATE TABLE IF NOT EXISTS `finance_bank_accounts_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `accountNumber` varchar(50) NOT NULL,
  `accountName` varchar(255) NOT NULL,
  `accountNameAr` varchar(255) NULL,
  `bankName` varchar(255) NOT NULL,
  `bankNameAr` varchar(255) NULL,
  `bankCode` varchar(50) NULL,
  `branchName` varchar(255) NULL,
  `branchCode` varchar(50) NULL,
  `accountType` enum('checking','savings','money_market','petty_cash','safe') NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT USD,
  `openingBalance` decimal(15,2) NOT NULL DEFAULT 0,
  `currentBalance` decimal(15,2) NOT NULL DEFAULT 0,
  `lastReconciliationDate` timestamp NULL,
  `lastReconciliationBalance` decimal(15,2) NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `isPrimary` tinyint(1) NOT NULL DEFAULT 0,
  `glAccountCode` varchar(50) NULL,
  `contactPerson` varchar(255) NULL,
  `contactPhone` varchar(50) NULL,
  `notes` text NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedBy` int(11) NULL,
  `iban` varchar(50) NULL,
  `swiftCode` varchar(20) NULL,
  `openingBalanceDate` date NULL,
  `glAccountId` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create finance_budget_categories_new
CREATE TABLE IF NOT EXISTS `finance_budget_categories_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `nameAr` varchar(255) NULL,
  `description` text NULL,
  `parentId` int(11) NULL,
  `accountId` int(11) NULL,
  `accountCode` varchar(50) NULL,
  `categoryType` enum('expense','income','both') NULL DEFAULT expense,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `sortOrder` int(11) NULL DEFAULT 0,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `level` int(11) NULL DEFAULT 1,
  `donorCategoryCode` varchar(50) NULL,
  `isEligibleCost` tinyint(1) NULL DEFAULT 1,
  `maxCapPercent` decimal(5,2) NULL,
  `requiresSupportingDocs` tinyint(1) NULL DEFAULT 0,
  `isDirectCost` tinyint(1) NULL DEFAULT 1,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create finance_cash_transactions_new
CREATE TABLE IF NOT EXISTS `finance_cash_transactions_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `transactionNumber` varchar(50) NOT NULL,
  `bankAccountId` int(11) NOT NULL,
  `transactionType` enum('deposit','withdrawal','transfer_in','transfer_out','bank_charge','interest','adjustment') NOT NULL,
  `transactionDate` timestamp NOT NULL,
  `valueDate` timestamp NULL,
  `amount` decimal(15,2) NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT USD,
  `exchangeRate` decimal(10,6) NULL DEFAULT 1,
  `amountInBaseCurrency` decimal(15,2) NULL,
  `balanceAfter` decimal(15,2) NULL,
  `transferToAccountId` int(11) NULL,
  `transferFromAccountId` int(11) NULL,
  `referenceNumber` varchar(100) NULL,
  `payee` varchar(255) NULL,
  `payer` varchar(255) NULL,
  `description` text NULL,
  `descriptionAr` text NULL,
  `category` varchar(100) NULL,
  `accountCode` varchar(50) NULL,
  `projectId` int(11) NULL,
  `isReconciled` tinyint(1) NOT NULL DEFAULT 0,
  `reconciledAt` timestamp NULL,
  `reconciledBy` int(11) NULL,
  `status` enum('draft','pending','approved','rejected','posted') NOT NULL DEFAULT POSTED,
  `approvedBy` int(11) NULL,
  `approvedAt` timestamp NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedBy` int(11) NULL,
  `grantId` int(11) NULL,
  `currencyId` int(11) NULL,
  `exchangeRateId` int(11) NULL,
  `glAccountId` int(11) NULL,
  `journalEntryId` int(11) NULL,
  `postingStatus` enum('unposted','posted','reversed') NULL DEFAULT unposted,
  `counterpartyType` enum('vendor','staff','donor','other') NULL,
  `counterpartyId` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create finance_currencies_new
CREATE TABLE IF NOT EXISTS `finance_currencies_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(10) NOT NULL,
  `name` varchar(100) NOT NULL,
  `nameAr` varchar(100) NULL,
  `symbol` varchar(10) NULL,
  `exchangeRateToUSD` decimal(15,6) NULL DEFAULT 1.000000,
  `isBaseCurrency` tinyint(1) NOT NULL DEFAULT 0,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `decimalPlaces` int(11) NULL DEFAULT 2,
  `organizationId` int(11) NOT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create finance_exchange_rates_new
CREATE TABLE IF NOT EXISTS `finance_exchange_rates_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fromCurrencyId` int(11) NULL,
  `fromCurrencyCode` varchar(10) NOT NULL,
  `toCurrencyId` int(11) NULL,
  `toCurrencyCode` varchar(10) NOT NULL,
  `rate` decimal(15,6) NOT NULL,
  `effectiveDate` date NOT NULL,
  `expiryDate` date NULL,
  `source` varchar(100) NULL,
  `notes` text NULL,
  `organizationId` int(11) NOT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `rateType` enum('official','market','bank','internal') NULL DEFAULT official,
  `enteredBy` int(11) NULL,
  `approvedBy` int(11) NULL,
  `approvedAt` timestamp NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create finance_fiscal_years_new
CREATE TABLE IF NOT EXISTS `finance_fiscal_years_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `nameAr` varchar(100) NULL,
  `code` varchar(20) NULL,
  `startDate` date NOT NULL,
  `endDate` date NOT NULL,
  `status` enum('planning','open','closed','locked') NULL DEFAULT planning,
  `isCurrent` tinyint(1) NOT NULL DEFAULT 0,
  `closedAt` timestamp NULL,
  `closedBy` int(11) NULL,
  `notes` text NULL,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `lockStatus` enum('open','locked','closed') NULL DEFAULT open,
  `lockedAt` timestamp NULL,
  `lockedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create finance_fund_balances_new
CREATE TABLE IF NOT EXISTS `finance_fund_balances_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `fundCode` varchar(50) NOT NULL,
  `fundName` varchar(255) NOT NULL,
  `fundNameAr` varchar(255) NULL,
  `fundType` enum('restricted','unrestricted','temporarily_restricted','donor_designated') NOT NULL,
  `donorId` int(11) NULL,
  `donorName` varchar(255) NULL,
  `grantNumber` varchar(100) NULL,
  `currency` varchar(10) NOT NULL DEFAULT USD,
  `totalBudget` decimal(15,2) NOT NULL DEFAULT 0,
  `totalReceived` decimal(15,2) NOT NULL DEFAULT 0,
  `totalExpended` decimal(15,2) NOT NULL DEFAULT 0,
  `currentBalance` decimal(15,2) NOT NULL DEFAULT 0,
  `startDate` timestamp NULL,
  `endDate` timestamp NULL,
  `bankAccountId` int(11) NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `notes` text NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedBy` int(11) NULL,
  `projectId` int(11) NULL,
  `baseCurrencyId` int(11) NULL,
  `amountInBaseCurrency` decimal(15,2) NULL,
  `status` enum('active','closed','suspended') NULL DEFAULT active,
  `restrictedType` enum('restricted','unrestricted') NULL DEFAULT restricted,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create finance_permissions_new
CREATE TABLE IF NOT EXISTS `finance_permissions_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `nameAr` varchar(255) NULL,
  `module` enum('chart_of_accounts','budgets','expenditures','advances','treasury','assets','reports','settings') NULL DEFAULT budgets,
  `action` enum('view','create','edit','delete','approve','export','import','admin') NULL DEFAULT view,
  `description` text NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `organizationId` int(11) NOT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create finance_role_permissions_new
CREATE TABLE IF NOT EXISTS `finance_role_permissions_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `roleId` int(11) NOT NULL,
  `permissionId` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create finance_roles_new
CREATE TABLE IF NOT EXISTS `finance_roles_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `nameAr` varchar(255) NULL,
  `description` text NULL,
  `level` int(11) NULL DEFAULT 1,
  `isSystemRole` tinyint(1) NOT NULL DEFAULT 0,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `organizationId` int(11) NOT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create finance_settlements_new
CREATE TABLE IF NOT EXISTS `finance_settlements_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `settlementNumber` varchar(50) NOT NULL,
  `advanceId` int(11) NOT NULL,
  `settlementDate` timestamp NOT NULL,
  `settledAmount` decimal(15,2) NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT USD,
  `receiptNumber` varchar(100) NULL,
  `description` text NULL,
  `descriptionAr` text NULL,
  `expenseCategory` varchar(100) NULL,
  `accountCode` varchar(50) NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT PENDING,
  `approvedBy` int(11) NULL,
  `approvedAt` timestamp NULL,
  `refundAmount` decimal(15,2) NULL DEFAULT 0,
  `refundDate` timestamp NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedBy` int(11) NULL,
  `projectId` int(11) NULL,
  `grantId` int(11) NULL,
  `currencyId` int(11) NULL,
  `exchangeRateId` int(11) NULL,
  `amountInBaseCurrency` decimal(15,2) NULL,
  `glAccountId` int(11) NULL,
  `journalEntryId` int(11) NULL,
  `postingStatus` enum('unposted','posted','reversed') NULL DEFAULT unposted,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create finance_user_roles_new
CREATE TABLE IF NOT EXISTS `finance_user_roles_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `roleId` int(11) NOT NULL,
  `effectiveFrom` date NULL,
  `effectiveTo` date NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `organizationId` int(11) NOT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create fiscal_periods_new
CREATE TABLE IF NOT EXISTS `fiscal_periods_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `fiscalYearId` int(11) NOT NULL,
  `periodNumber` int(11) NOT NULL,
  `periodName` varchar(50) NOT NULL,
  `periodNameAr` varchar(50) NULL,
  `periodType` enum('month','quarter') NULL DEFAULT month,
  `startDate` date NOT NULL,
  `endDate` date NOT NULL,
  `status` enum('open','closed','locked') NULL DEFAULT open,
  `closedAt` timestamp NULL,
  `closedBy` int(11) NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create forecast_audit_log_new
CREATE TABLE IF NOT EXISTS `forecast_audit_log_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `forecastId` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `action` enum('create','update','delete') NOT NULL,
  `fieldChanged` varchar(100) NULL,
  `beforeValue` text NULL,
  `afterValue` text NULL,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create forecast_plan_new
CREATE TABLE IF NOT EXISTS `forecast_plan_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `budgetItemId` int(11) NOT NULL,
  `projectId` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `fiscalYear` varchar(20) NOT NULL,
  `yearNumber` int(11) NOT NULL,
  `m1` decimal(15,2) NOT NULL DEFAULT 0.00,
  `m2` decimal(15,2) NOT NULL DEFAULT 0.00,
  `m3` decimal(15,2) NOT NULL DEFAULT 0.00,
  `m4` decimal(15,2) NOT NULL DEFAULT 0.00,
  `m5` decimal(15,2) NOT NULL DEFAULT 0.00,
  `m6` decimal(15,2) NOT NULL DEFAULT 0.00,
  `m7` decimal(15,2) NOT NULL DEFAULT 0.00,
  `m8` decimal(15,2) NOT NULL DEFAULT 0.00,
  `m9` decimal(15,2) NOT NULL DEFAULT 0.00,
  `m10` decimal(15,2) NOT NULL DEFAULT 0.00,
  `m11` decimal(15,2) NOT NULL DEFAULT 0.00,
  `m12` decimal(15,2) NOT NULL DEFAULT 0.00,
  `totalForecast` decimal(15,2) NOT NULL DEFAULT 0.00,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create fuel_logs_new
CREATE TABLE IF NOT EXISTS `fuel_logs_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `vehicleId` int(11) NOT NULL,
  `driverId` int(11) NULL,
  `fuelLogNumber` varchar(50) NOT NULL,
  `fuelDate` timestamp NOT NULL,
  `fuelType` enum('petrol','diesel','electric') NULL DEFAULT petrol,
  `quantity` decimal(8,2) NOT NULL,
  `unitPrice` decimal(8,2) NULL,
  `totalCost` decimal(10,2) NULL,
  `currency` varchar(10) NULL DEFAULT USD,
  `mileageAtFill` decimal(10,2) NULL,
  `station` varchar(255) NULL,
  `receiptNumber` varchar(100) NULL,
  `projectCode` varchar(50) NULL,
  `remarks` text NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create gl_account_categories_new
CREATE TABLE IF NOT EXISTS `gl_account_categories_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `code` varchar(20) NOT NULL,
  `name` varchar(255) NOT NULL,
  `nameAr` varchar(255) NULL,
  `parentId` int(11) NULL,
  `level` int(11) NULL DEFAULT 1,
  `accountType` enum('asset','liability','equity','revenue','expense') NOT NULL,
  `normalBalance` enum('debit','credit') NOT NULL,
  `isActive` tinyint(1) NULL DEFAULT 1,
  `sortOrder` int(11) NULL DEFAULT 0,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create gl_accounts_new
CREATE TABLE IF NOT EXISTS `gl_accounts_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `categoryId` int(11) NULL,
  `accountCode` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `nameAr` varchar(255) NULL,
  `description` text NULL,
  `descriptionAr` text NULL,
  `accountType` enum('asset','liability','equity','revenue','expense') NOT NULL,
  `normalBalance` enum('debit','credit') NOT NULL,
  `parentAccountId` int(11) NULL,
  `level` int(11) NULL DEFAULT 1,
  `isControlAccount` tinyint(1) NULL DEFAULT 0,
  `isBankAccount` tinyint(1) NULL DEFAULT 0,
  `isCashAccount` tinyint(1) NULL DEFAULT 0,
  `isReceivable` tinyint(1) NULL DEFAULT 0,
  `isPayable` tinyint(1) NULL DEFAULT 0,
  `currencyId` int(11) NULL,
  `openingBalance` decimal(15,2) NULL DEFAULT 0.00,
  `currentBalance` decimal(15,2) NULL DEFAULT 0.00,
  `isActive` tinyint(1) NULL DEFAULT 1,
  `isPostable` tinyint(1) NULL DEFAULT 1,
  `sortOrder` int(11) NULL DEFAULT 0,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create globalSettings_new
CREATE TABLE IF NOT EXISTS `globalSettings_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `defaultLanguage` varchar(10) NOT NULL DEFAULT en,
  `defaultTimezone` varchar(100) NOT NULL DEFAULT UTC,
  `defaultCurrency` varchar(10) NOT NULL DEFAULT USD,
  `environmentLabel` enum('production','staging','test') NOT NULL DEFAULT production,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create goods_receipt_notes_new
CREATE TABLE IF NOT EXISTS `goods_receipt_notes_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `purchaseOrderId` int(11) NULL,
  `supplierId` int(11) NULL,
  `grnNumber` varchar(50) NOT NULL,
  `grnDate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deliveryNoteNumber` varchar(100) NULL,
  `invoiceNumber` varchar(100) NULL,
  `warehouse` varchar(255) NULL,
  `warehouseAr` varchar(255) NULL,
  `receivedBy` varchar(255) NULL,
  `inspectedBy` varchar(255) NULL,
  `totalReceived` int(11) NULL DEFAULT 0,
  `totalAccepted` int(11) NULL DEFAULT 0,
  `totalRejected` int(11) NULL DEFAULT 0,
  `remarks` text NULL,
  `remarksAr` text NULL,
  `status` enum('pending_inspection','inspected','accepted','partially_accepted','rejected') NOT NULL DEFAULT pending_inspection,
  `approvedBy` int(11) NULL,
  `approvedAt` timestamp NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create grant_documents_new
CREATE TABLE IF NOT EXISTS `grant_documents_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `grantId` int(11) NOT NULL,
  `fileName` varchar(255) NOT NULL,
  `fileUrl` text NOT NULL,
  `fileKey` varchar(500) NOT NULL,
  `fileSize` int(11) NULL,
  `mimeType` varchar(100) NULL,
  `category` enum('contractual','financial','programmatic','reporting','other') NOT NULL DEFAULT other,
  `status` enum('draft','pending','approved','rejected','final') NOT NULL DEFAULT draft,
  `description` text NULL,
  `uploadedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `uploadedBy` int(11) NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create grants_new
CREATE TABLE IF NOT EXISTS `grants_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `donorId` int(11) NULL,
  `projectId` int(11) NULL,
  `grantCode` varchar(100) NULL,
  `title` varchar(500) NULL,
  `titleAr` varchar(500) NULL,
  `grantNumber` varchar(100) NULL,
  `grantName` text NULL,
  `grantNameAr` text NULL,
  `donorName` varchar(255) NULL,
  `donorReference` varchar(255) NULL,
  `grantAmount` decimal(15,2) NULL,
  `amount` decimal(15,2) NULL DEFAULT 0,
  `totalBudget` decimal(15,2) NULL DEFAULT 0,
  `currency` varchar(10) NOT NULL DEFAULT USD,
  `status` enum('planned','ongoing','closed','draft','submitted','under_review','approved','rejected','pending') NOT NULL DEFAULT draft,
  `reportingStatus` enum('on_track','due','overdue') NULL DEFAULT on_track,
  `submissionDate` timestamp NULL,
  `approvalDate` timestamp NULL,
  `startDate` timestamp NULL,
  `endDate` timestamp NULL,
  `description` text NULL,
  `descriptionAr` text NULL,
  `objectives` text NULL,
  `objectivesAr` text NULL,
  `proposalDocumentUrl` text NULL,
  `approvalDocumentUrl` text NULL,
  `sector` varchar(255) NULL,
  `responsible` varchar(255) NULL,
  `reportingFrequency` enum('monthly','quarterly','semi_annually','annually') NULL DEFAULT quarterly,
  `coFunding` tinyint(1) NULL DEFAULT 0,
  `coFunderName` varchar(255) NULL,
  `createdBy` int(11) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedBy` int(11) NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create grn_line_items_new
CREATE TABLE IF NOT EXISTS `grn_line_items_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `grnId` int(11) NOT NULL,
  `poLineItemId` int(11) NULL,
  `lineNumber` int(11) NOT NULL,
  `description` text NOT NULL,
  `unit` varchar(50) NULL DEFAULT Piece,
  `orderedQty` decimal(10,2) NULL DEFAULT 0,
  `receivedQty` decimal(10,2) NULL DEFAULT 0,
  `acceptedQty` decimal(10,2) NULL DEFAULT 0,
  `rejectedQty` decimal(10,2) NULL DEFAULT 0,
  `rejectionReason` text NULL,
  `remarks` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create hr_annual_plans_new
CREATE TABLE IF NOT EXISTS `hr_annual_plans_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `planYear` int(11) NOT NULL,
  `planName` varchar(255) NOT NULL,
  `existingWorkforce` text NULL,
  `plannedStaffing` text NULL,
  `recruitmentPlan` text NULL,
  `budgetEstimate` text NULL,
  `trainingPlan` text NULL,
  `hrRisks` text NULL,
  `totalPlannedPositions` int(11) NULL,
  `existingStaff` int(11) NULL,
  `newPositionsRequired` int(11) NULL,
  `estimatedHrCost` decimal(15,2) NULL,
  `status` enum('draft','pending_review','pending_approval','approved','rejected') NOT NULL DEFAULT draft,
  `preparedBy` int(11) NULL,
  `preparedAt` timestamp NULL,
  `reviewedBy` int(11) NULL,
  `reviewedAt` timestamp NULL,
  `approvedBy` int(11) NULL,
  `approvedAt` timestamp NULL,
  `notes` text NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create hr_attendance_records_new
CREATE TABLE IF NOT EXISTS `hr_attendance_records_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `employeeId` int(11) NOT NULL,
  `date` date NOT NULL,
  `checkIn` timestamp NULL,
  `checkOut` timestamp NULL,
  `status` enum('present','absent','late','half_day','on_leave','holiday','weekend') NOT NULL DEFAULT present,
  `workHours` decimal(5,2) NULL,
  `overtimeHours` decimal(5,2) NULL,
  `location` varchar(255) NULL,
  `notes` text NULL,
  `periodLocked` tinyint(1) NOT NULL DEFAULT 0,
  `lockedBy` int(11) NULL,
  `lockedAt` timestamp NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create hr_documents_new
CREATE TABLE IF NOT EXISTS `hr_documents_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `employeeId` int(11) NULL,
  `documentCode` varchar(50) NULL,
  `documentName` varchar(255) NOT NULL,
  `documentNameAr` varchar(255) NULL,
  `documentType` enum('policy','template','form','contract','certificate','id_document','other') NOT NULL,
  `category` varchar(100) NULL,
  `fileUrl` text NULL,
  `fileSize` int(11) NULL,
  `mimeType` varchar(100) NULL,
  `version` varchar(50) NULL,
  `effectiveDate` date NULL,
  `expiryDate` date NULL,
  `description` text NULL,
  `tags` text NULL,
  `isPublic` tinyint(1) NOT NULL DEFAULT 0,
  `accessRoles` text NULL,
  `status` enum('draft','active','archived','expired') NOT NULL DEFAULT active,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `uploadedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create hr_employees_new
CREATE TABLE IF NOT EXISTS `hr_employees_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `employeeCode` varchar(50) NOT NULL,
  `firstName` varchar(100) NOT NULL,
  `lastName` varchar(100) NOT NULL,
  `firstNameAr` varchar(100) NULL,
  `lastNameAr` varchar(100) NULL,
  `email` varchar(320) NULL,
  `phone` varchar(50) NULL,
  `dateOfBirth` date NULL,
  `gender` enum('male','female','other') NULL,
  `nationality` varchar(100) NULL,
  `nationalId` varchar(100) NULL,
  `passportNumber` varchar(100) NULL,
  `employmentType` enum('full_time','part_time','contract','consultant','intern') NULL DEFAULT full_time,
  `staffCategory` enum('national','international','expatriate') NULL DEFAULT national,
  `department` varchar(100) NULL,
  `position` varchar(100) NULL,
  `jobTitle` varchar(255) NULL,
  `gradeLevel` varchar(50) NULL,
  `reportingTo` int(11) NULL,
  `hireDate` date NULL,
  `contractStartDate` date NULL,
  `contractEndDate` date NULL,
  `probationEndDate` date NULL,
  `terminationDate` date NULL,
  `status` enum('active','on_leave','suspended','terminated','resigned') NOT NULL DEFAULT active,
  `address` text NULL,
  `city` varchar(100) NULL,
  `country` varchar(100) NULL,
  `emergencyContactName` varchar(255) NULL,
  `emergencyContactPhone` varchar(50) NULL,
  `emergencyContactRelation` varchar(100) NULL,
  `bankName` varchar(255) NULL,
  `bankAccountNumber` varchar(100) NULL,
  `bankIban` varchar(100) NULL,
  `photoUrl` text NULL,
  `notes` text NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create hr_leave_balances_new
CREATE TABLE IF NOT EXISTS `hr_leave_balances_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `employeeId` int(11) NOT NULL,
  `year` int(11) NOT NULL,
  `leaveType` enum('annual','sick','maternity','paternity','unpaid','compassionate','study','other') NOT NULL,
  `entitlement` decimal(5,1) NOT NULL DEFAULT 0,
  `carriedOver` decimal(5,1) NOT NULL DEFAULT 0,
  `used` decimal(5,1) NOT NULL DEFAULT 0,
  `pending` decimal(5,1) NOT NULL DEFAULT 0,
  `remaining` decimal(5,1) NOT NULL DEFAULT 0,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create hr_leave_requests_new
CREATE TABLE IF NOT EXISTS `hr_leave_requests_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `employeeId` int(11) NOT NULL,
  `leaveType` enum('annual','sick','maternity','paternity','unpaid','compassionate','study','other') NOT NULL,
  `startDate` date NOT NULL,
  `endDate` date NOT NULL,
  `totalDays` decimal(5,1) NOT NULL,
  `reason` text NULL,
  `attachmentUrl` text NULL,
  `status` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT pending,
  `approvedBy` int(11) NULL,
  `approvedAt` timestamp NULL,
  `rejectionReason` text NULL,
  `balanceBefore` decimal(5,1) NULL,
  `balanceAfter` decimal(5,1) NULL,
  `notes` text NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create hr_payroll_records_new
CREATE TABLE IF NOT EXISTS `hr_payroll_records_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `employeeId` int(11) NOT NULL,
  `payrollMonth` int(11) NOT NULL,
  `payrollYear` int(11) NOT NULL,
  `basicSalary` decimal(15,2) NOT NULL,
  `housingAllowance` decimal(15,2) NULL DEFAULT 0,
  `transportAllowance` decimal(15,2) NULL DEFAULT 0,
  `otherAllowances` decimal(15,2) NULL DEFAULT 0,
  `overtimePay` decimal(15,2) NULL DEFAULT 0,
  `bonus` decimal(15,2) NULL DEFAULT 0,
  `grossSalary` decimal(15,2) NOT NULL,
  `taxDeduction` decimal(15,2) NULL DEFAULT 0,
  `socialSecurityDeduction` decimal(15,2) NULL DEFAULT 0,
  `loanDeduction` decimal(15,2) NULL DEFAULT 0,
  `otherDeductions` decimal(15,2) NULL DEFAULT 0,
  `totalDeductions` decimal(15,2) NULL DEFAULT 0,
  `netSalary` decimal(15,2) NOT NULL,
  `currency` varchar(10) NULL DEFAULT USD,
  `status` enum('draft','pending_approval','approved','paid','cancelled') NOT NULL DEFAULT draft,
  `approvedBy` int(11) NULL,
  `approvedAt` timestamp NULL,
  `paidAt` timestamp NULL,
  `paymentMethod` enum('bank_transfer','cash','check') NULL DEFAULT bank_transfer,
  `paymentReference` varchar(255) NULL,
  `notes` text NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create hr_recruitment_candidates_new
CREATE TABLE IF NOT EXISTS `hr_recruitment_candidates_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `jobId` int(11) NOT NULL,
  `firstName` varchar(100) NOT NULL,
  `lastName` varchar(100) NOT NULL,
  `email` varchar(320) NOT NULL,
  `phone` varchar(50) NULL,
  `resumeUrl` text NULL,
  `coverLetterUrl` text NULL,
  `portfolioUrl` text NULL,
  `linkedinUrl` text NULL,
  `education` text NULL,
  `experience` text NULL,
  `skills` text NULL,
  `source` enum('website','referral','job_board','linkedin','agency','other') NULL DEFAULT website,
  `referredBy` varchar(255) NULL,
  `rating` int(11) NULL,
  `evaluationNotes` text NULL,
  `interviewDate` timestamp NULL,
  `interviewNotes` text NULL,
  `interviewers` text NULL,
  `status` enum('new','screening','shortlisted','interview_scheduled','interviewed','offer_pending','offer_sent','hired','rejected','withdrawn') NOT NULL DEFAULT new,
  `rejectionReason` text NULL,
  `offerDate` date NULL,
  `offerSalary` decimal(15,2) NULL,
  `offerAccepted` tinyint(1) NULL,
  `startDate` date NULL,
  `notes` text NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create hr_recruitment_jobs_new
CREATE TABLE IF NOT EXISTS `hr_recruitment_jobs_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `jobCode` varchar(50) NULL,
  `jobTitle` varchar(255) NOT NULL,
  `jobTitleAr` varchar(255) NULL,
  `department` varchar(100) NULL,
  `employmentType` enum('full_time','part_time','contract','consultant','intern') NULL DEFAULT full_time,
  `gradeLevel` varchar(50) NULL,
  `salaryRange` varchar(100) NULL,
  `description` text NULL,
  `requirements` text NULL,
  `responsibilities` text NULL,
  `benefits` text NULL,
  `location` varchar(255) NULL,
  `isRemote` tinyint(1) NULL DEFAULT 0,
  `openings` int(11) NULL DEFAULT 1,
  `postingDate` date NULL,
  `closingDate` date NULL,
  `status` enum('draft','open','on_hold','closed','filled','cancelled') NOT NULL DEFAULT draft,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create hr_salary_grades_new
CREATE TABLE IF NOT EXISTS `hr_salary_grades_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `gradeCode` varchar(50) NOT NULL,
  `gradeName` varchar(100) NOT NULL,
  `gradeNameAr` varchar(100) NULL,
  `minSalary` decimal(15,2) NOT NULL,
  `maxSalary` decimal(15,2) NOT NULL,
  `midSalary` decimal(15,2) NULL,
  `currency` varchar(10) NULL DEFAULT USD,
  `steps` text NULL,
  `housingAllowance` decimal(15,2) NULL,
  `transportAllowance` decimal(15,2) NULL,
  `otherAllowances` text NULL,
  `effectiveDate` date NULL,
  `expiryDate` date NULL,
  `status` enum('active','inactive','draft') NOT NULL DEFAULT active,
  `notes` text NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create hr_salary_scale_new
CREATE TABLE IF NOT EXISTS `hr_salary_scale_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `employeeId` int(11) NOT NULL,
  `staffId` varchar(50) NOT NULL,
  `staffFullName` varchar(255) NOT NULL,
  `position` varchar(100) NULL,
  `department` varchar(100) NULL,
  `contractType` varchar(50) NULL,
  `gradeId` int(11) NULL,
  `gradeCode` varchar(50) NOT NULL,
  `step` varchar(50) NOT NULL,
  `minSalary` decimal(15,2) NULL DEFAULT 0,
  `maxSalary` decimal(15,2) NULL DEFAULT 0,
  `approvedGrossSalary` decimal(15,2) NOT NULL,
  `housingAllowance` decimal(15,2) NULL DEFAULT 0,
  `housingAllowanceType` enum('value','percentage') NULL DEFAULT value,
  `transportAllowance` decimal(15,2) NULL DEFAULT 0,
  `transportAllowanceType` enum('value','percentage') NULL DEFAULT value,
  `representationAllowance` decimal(15,2) NULL DEFAULT 0,
  `representationAllowanceType` enum('value','percentage') NULL DEFAULT value,
  `annualAllowance` decimal(15,2) NULL DEFAULT 0,
  `bonus` decimal(15,2) NULL DEFAULT 0,
  `otherAllowances` decimal(15,2) NULL DEFAULT 0,
  `currency` varchar(10) NULL DEFAULT USD,
  `version` int(11) NOT NULL DEFAULT 1,
  `effectiveStartDate` date NOT NULL,
  `effectiveEndDate` date NULL,
  `status` enum('draft','active','superseded') NOT NULL DEFAULT draft,
  `isLocked` tinyint(1) NOT NULL DEFAULT 0,
  `usedInPayroll` tinyint(1) NOT NULL DEFAULT 0,
  `lastApprovedBy` int(11) NULL,
  `lastApprovedAt` timestamp NULL,
  `createdBy` int(11) NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create hr_sanctions_new
CREATE TABLE IF NOT EXISTS `hr_sanctions_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `employeeId` int(11) NOT NULL,
  `sanctionCode` varchar(50) NULL,
  `sanctionType` enum('verbal_warning','written_warning','final_warning','suspension','demotion','termination','other') NOT NULL,
  `severity` enum('minor','moderate','major','critical') NOT NULL DEFAULT minor,
  `incidentDate` date NOT NULL,
  `reportedDate` date NULL,
  `description` text NOT NULL,
  `evidence` text NULL,
  `investigatedBy` int(11) NULL,
  `investigationNotes` text NULL,
  `investigationDate` date NULL,
  `decisionDate` date NULL,
  `decisionBy` int(11) NULL,
  `decision` text NULL,
  `appealDate` date NULL,
  `appealOutcome` enum('upheld','modified','overturned') NULL,
  `appealNotes` text NULL,
  `status` enum('reported','under_investigation','pending_decision','decided','appealed','closed') NOT NULL DEFAULT reported,
  `effectiveDate` date NULL,
  `expiryDate` date NULL,
  `notes` text NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create import_history_new
CREATE TABLE IF NOT EXISTS `import_history_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `project_id` int(11) NOT NULL,
  `organization_id` int(11) NOT NULL,
  `operating_unit_id` int(11) NULL,
  `user_id` int(11) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `import_type` varchar(50) NOT NULL,
  `records_imported` int(11) NOT NULL DEFAULT 0,
  `records_skipped` int(11) NOT NULL DEFAULT 0,
  `records_errors` int(11) NOT NULL DEFAULT 0,
  `status` varchar(20) NOT NULL DEFAULT completed,
  `error_details` text NULL,
  `allowed_duplicates` tinyint(1) NOT NULL DEFAULT 0,
  `imported_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create indicators_new
CREATE TABLE IF NOT EXISTS `indicators_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `projectId` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `activityId` int(11) NULL,
  `indicatorName` text NOT NULL,
  `indicatorNameAr` text NULL,
  `description` text NULL,
  `descriptionAr` text NULL,
  `type` enum('output','outcome','impact') NOT NULL DEFAULT OUTPUT,
  `category` varchar(255) NULL,
  `unit` varchar(100) NOT NULL,
  `baseline` decimal(15,2) NOT NULL DEFAULT 0.00,
  `target` decimal(15,2) NOT NULL,
  `achievedValue` decimal(15,2) NOT NULL DEFAULT 0.00,
  `targetDate` date NULL,
  `dataSource` text NULL,
  `verificationMethod` text NULL,
  `status` enum('on_track','at_risk','off_track','achieved') NOT NULL DEFAULT ON_TRACK,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  `reportingFrequency` enum('monthly','quarterly','bi_annually','annually','end_of_project') NULL DEFAULT quarterly,
  `reporting_frequency` enum('monthly','quarterly','bi_annually','annually','end_of_project') NULL DEFAULT quarterly,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create invitations_new
CREATE TABLE IF NOT EXISTS `invitations_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(320) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `role` enum('org_admin','program_manager','finance_manager','meal_officer','case_worker','viewer') NOT NULL,
  `token` varchar(255) NOT NULL,
  `status` enum('pending','accepted','expired','cancelled') NOT NULL DEFAULT pending,
  `expiresAt` timestamp NOT NULL,
  `invitedBy` int(11) NOT NULL,
  `acceptedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create journal_entries_new
CREATE TABLE IF NOT EXISTS `journal_entries_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `entryNumber` varchar(50) NOT NULL,
  `entryDate` date NOT NULL,
  `fiscalYearId` int(11) NULL,
  `fiscalPeriodId` int(11) NULL,
  `entryType` enum('standard','adjusting','closing','reversing','opening') NULL DEFAULT standard,
  `sourceModule` enum('manual','expense','advance','settlement','cash_transaction','asset','payroll','procurement','budget') NULL DEFAULT manual,
  `sourceDocumentId` int(11) NULL,
  `sourceDocumentType` varchar(50) NULL,
  `description` text NULL,
  `descriptionAr` text NULL,
  `totalDebit` decimal(15,2) NULL DEFAULT 0.00,
  `totalCredit` decimal(15,2) NULL DEFAULT 0.00,
  `currencyId` int(11) NULL,
  `exchangeRateId` int(11) NULL,
  `status` enum('draft','posted','reversed','void') NULL DEFAULT draft,
  `postedAt` timestamp NULL,
  `postedBy` int(11) NULL,
  `reversedAt` timestamp NULL,
  `reversedBy` int(11) NULL,
  `reversalEntryId` int(11) NULL,
  `projectId` int(11) NULL,
  `grantId` int(11) NULL,
  `attachments` text NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create journal_lines_new
CREATE TABLE IF NOT EXISTS `journal_lines_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `journalEntryId` int(11) NOT NULL,
  `lineNumber` int(11) NOT NULL,
  `glAccountId` int(11) NOT NULL,
  `description` text NULL,
  `descriptionAr` text NULL,
  `debitAmount` decimal(15,2) NULL DEFAULT 0.00,
  `creditAmount` decimal(15,2) NULL DEFAULT 0.00,
  `currencyId` int(11) NULL,
  `exchangeRate` decimal(15,6) NULL DEFAULT 1.000000,
  `debitAmountBase` decimal(15,2) NULL DEFAULT 0.00,
  `creditAmountBase` decimal(15,2) NULL DEFAULT 0.00,
  `projectId` int(11) NULL,
  `grantId` int(11) NULL,
  `activityId` int(11) NULL,
  `budgetLineId` int(11) NULL,
  `costCenterId` int(11) NULL,
  `reference` varchar(255) NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create landing_settings_new
CREATE TABLE IF NOT EXISTS `landing_settings_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `heroTitle` varchar(500) NULL,
  `heroTitleAr` varchar(500) NULL,
  `heroSubtitle` text NULL,
  `heroSubtitleAr` text NULL,
  `heroImageUrl` text NULL,
  `showQuickStats` tinyint(1) NOT NULL DEFAULT 1,
  `showAnnouncements` tinyint(1) NOT NULL DEFAULT 1,
  `showRecentActivity` tinyint(1) NOT NULL DEFAULT 1,
  `welcomeMessage` text NULL,
  `welcomeMessageAr` text NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create meal_accountability_records_new
CREATE TABLE IF NOT EXISTS `meal_accountability_records_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `projectId` int(11) NULL,
  `recordCode` varchar(50) NOT NULL,
  `recordType` enum('complaint','feedback','suggestion') NOT NULL DEFAULT feedback,
  `category` varchar(100) NULL,
  `severity` enum('low','medium','high','critical') NOT NULL DEFAULT medium,
  `status` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT open,
  `subject` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `submittedVia` varchar(100) NULL,
  `isAnonymous` tinyint(1) NOT NULL DEFAULT 0,
  `isSensitive` tinyint(1) NOT NULL DEFAULT 0,
  `complainantName` varchar(255) NULL,
  `complainantGender` enum('male','female','other','prefer_not_to_say') NULL,
  `complainantAgeGroup` varchar(50) NULL,
  `complainantContact` varchar(255) NULL,
  `complainantLocation` varchar(255) NULL,
  `resolution` text NULL,
  `resolvedAt` timestamp NULL,
  `resolvedBy` int(11) NULL,
  `assignedTo` int(11) NULL,
  `receivedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `dueDate` date NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create meal_audit_log_new
CREATE TABLE IF NOT EXISTS `meal_audit_log_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NOT NULL,
  `moduleName` varchar(50) NOT NULL DEFAULT MEAL,
  `entityType` varchar(100) NOT NULL,
  `entityId` int(11) NOT NULL,
  `actionType` enum('create','update','delete','approve','export','print') NOT NULL,
  `actorUserId` int(11) NULL,
  `diff` json NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create meal_documents_new
CREATE TABLE IF NOT EXISTS `meal_documents_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `projectId` int(11) NULL,
  `documentCode` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `titleAr` varchar(255) NULL,
  `description` text NULL,
  `descriptionAr` text NULL,
  `documentType` enum('report','assessment','evaluation','tool','template','guideline','sop','training_material','other') NOT NULL DEFAULT other,
  `category` enum('indicators','surveys','reports','accountability','other') NOT NULL DEFAULT other,
  `fileName` varchar(255) NOT NULL,
  `fileUrl` text NOT NULL,
  `fileSize` int(11) NULL,
  `mimeType` varchar(100) NULL,
  `version` varchar(20) NOT NULL DEFAULT 1.0,
  `parentDocumentId` int(11) NULL,
  `sourceModule` varchar(100) NULL,
  `sourceRecordId` int(11) NULL,
  `isSystemGenerated` tinyint(1) NOT NULL DEFAULT 0,
  `isPublic` tinyint(1) NOT NULL DEFAULT 0,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create meal_dqa_actions_new
CREATE TABLE IF NOT EXISTS `meal_dqa_actions_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `dqaFindingId` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NOT NULL,
  `actionText` text NOT NULL,
  `ownerUserId` int(11) NULL,
  `dueDate` timestamp NULL,
  `status` enum('open','in_progress','closed') NOT NULL DEFAULT open,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create meal_dqa_findings_new
CREATE TABLE IF NOT EXISTS `meal_dqa_findings_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `dqaVisitId` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NOT NULL,
  `severity` enum('low','medium','high') NOT NULL,
  `category` enum('completeness','accuracy','timeliness','integrity','validity') NOT NULL,
  `findingText` text NOT NULL,
  `recommendationText` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create meal_dqa_visits_new
CREATE TABLE IF NOT EXISTS `meal_dqa_visits_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NOT NULL,
  `projectId` int(11) NOT NULL,
  `dqaCode` varchar(50) NOT NULL,
  `visitDate` timestamp NOT NULL,
  `verifierUserIds` json NULL,
  `locationIds` json NULL,
  `dataSource` enum('survey','indicator','accountability','mixed') NOT NULL,
  `samplingMethod` text NULL,
  `recordsCheckedCount` int(11) NULL DEFAULT 0,
  `accurateCount` int(11) NULL DEFAULT 0,
  `discrepanciesCount` int(11) NULL DEFAULT 0,
  `missingFieldsCount` int(11) NULL DEFAULT 0,
  `duplicatesCount` int(11) NULL DEFAULT 0,
  `summary` text NULL,
  `status` enum('draft','submitted','approved','closed') NOT NULL DEFAULT draft,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deletedAt` timestamp NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create meal_indicator_data_entries_new
CREATE TABLE IF NOT EXISTS `meal_indicator_data_entries_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `indicatorId` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `projectId` int(11) NULL,
  `reportingPeriod` varchar(50) NOT NULL,
  `periodStartDate` date NOT NULL,
  `periodEndDate` date NOT NULL,
  `achievedValue` decimal(15,2) NOT NULL,
  `disaggregation` json NULL,
  `dataSource` text NULL,
  `evidenceFiles` json NULL,
  `notes` text NULL,
  `isVerified` tinyint(1) NOT NULL DEFAULT 0,
  `verifiedAt` timestamp NULL,
  `verifiedBy` int(11) NULL,
  `verificationNotes` text NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create meal_indicator_templates_new
CREATE TABLE IF NOT EXISTS `meal_indicator_templates_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `name` varchar(500) NOT NULL,
  `code` varchar(100) NULL,
  `unitOfMeasure` varchar(100) NULL,
  `calculationMethod` text NULL,
  `frequency` varchar(50) NULL,
  `disaggregationFields` json NULL,
  `defaultTargets` json NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deletedAt` timestamp NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create meal_learning_actions_new
CREATE TABLE IF NOT EXISTS `meal_learning_actions_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `learningItemId` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NOT NULL,
  `actionText` text NOT NULL,
  `ownerUserId` int(11) NULL,
  `dueDate` timestamp NULL,
  `status` enum('open','in_progress','closed') NOT NULL DEFAULT open,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create meal_learning_items_new
CREATE TABLE IF NOT EXISTS `meal_learning_items_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NOT NULL,
  `projectId` int(11) NOT NULL,
  `type` enum('lesson','best_practice','product') NOT NULL,
  `title` varchar(500) NOT NULL,
  `context` text NULL,
  `rootCause` text NULL,
  `whatWorked` text NULL,
  `whatDidnt` text NULL,
  `recommendations` text NULL,
  `moduleSource` enum('indicator','survey','accountability','cross_cutting') NOT NULL,
  `visibility` enum('internal','donor') NOT NULL DEFAULT internal,
  `status` enum('draft','submitted','validated','published','archived') NOT NULL DEFAULT draft,
  `tags` json NULL,
  `locationIds` json NULL,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deletedAt` timestamp NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create meal_survey_questions_new
CREATE TABLE IF NOT EXISTS `meal_survey_questions_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `surveyId` int(11) NOT NULL,
  `questionCode` varchar(50) NOT NULL,
  `questionText` text NOT NULL,
  `questionTextAr` text NULL,
  `helpText` text NULL,
  `helpTextAr` text NULL,
  `questionType` enum('text','textarea','number','email','phone','date','time','datetime','select','multiselect','radio','checkbox','rating','scale','file','image','signature','location','matrix') NOT NULL DEFAULT text,
  `isRequired` tinyint(1) NOT NULL DEFAULT 0,
  `order` int(11) NOT NULL DEFAULT 0,
  `sectionId` varchar(50) NULL,
  `sectionTitle` varchar(255) NULL,
  `sectionTitleAr` varchar(255) NULL,
  `options` json NULL,
  `validationRules` json NULL,
  `skipLogic` json NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create meal_survey_standards_new
CREATE TABLE IF NOT EXISTS `meal_survey_standards_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `standardName` varchar(500) NOT NULL,
  `validationRules` json NULL,
  `requiredFields` json NULL,
  `gpsRequired` tinyint(1) NOT NULL DEFAULT 0,
  `photoRequired` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deletedAt` timestamp NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create meal_survey_submissions_new
CREATE TABLE IF NOT EXISTS `meal_survey_submissions_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `surveyId` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `projectId` int(11) NULL,
  `submissionCode` varchar(50) NOT NULL,
  `respondentName` varchar(255) NULL,
  `respondentEmail` varchar(320) NULL,
  `respondentPhone` varchar(50) NULL,
  `responses` json NOT NULL,
  `submittedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `submittedBy` int(11) NULL,
  `validationStatus` enum('pending','approved','rejected') NOT NULL DEFAULT pending,
  `validatedAt` timestamp NULL,
  `validatedBy` int(11) NULL,
  `validationNotes` text NULL,
  `latitude` decimal(10,8) NULL,
  `longitude` decimal(11,8) NULL,
  `locationName` varchar(255) NULL,
  `deviceInfo` json NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create meal_surveys_new
CREATE TABLE IF NOT EXISTS `meal_surveys_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `projectId` int(11) NULL,
  `surveyCode` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `titleAr` varchar(255) NULL,
  `description` text NULL,
  `descriptionAr` text NULL,
  `surveyType` enum('baseline','endline','monitoring','assessment','feedback','custom') NOT NULL DEFAULT custom,
  `status` enum('draft','published','closed','archived') NOT NULL DEFAULT draft,
  `isAnonymous` tinyint(1) NOT NULL DEFAULT 0,
  `allowMultipleSubmissions` tinyint(1) NOT NULL DEFAULT 0,
  `requiresApproval` tinyint(1) NOT NULL DEFAULT 0,
  `startDate` date NULL,
  `endDate` date NULL,
  `formConfig` json NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create microsoft_integrations_new
CREATE TABLE IF NOT EXISTS `microsoft_integrations_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `entraIdEnabled` tinyint(1) NOT NULL DEFAULT 0,
  `entraIdTenantId` varchar(255) NULL,
  `sharepointEnabled` tinyint(1) NOT NULL DEFAULT 0,
  `sharepointSiteUrl` text NULL,
  `oneDriveEnabled` tinyint(1) NOT NULL DEFAULT 0,
  `outlookEnabled` tinyint(1) NOT NULL DEFAULT 0,
  `teamsEnabled` tinyint(1) NOT NULL DEFAULT 0,
  `powerBiEnabled` tinyint(1) NOT NULL DEFAULT 0,
  `lastSyncedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create monthly_report_audit_history_new
CREATE TABLE IF NOT EXISTS `monthly_report_audit_history_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `monthlyReportId` int(11) NOT NULL,
  `projectId` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `action` enum('created','updated','finalized','deleted','restored') NOT NULL,
  `fieldChanged` varchar(100) NULL,
  `previousValue` text NULL,
  `newValue` text NULL,
  `changeReason` text NULL,
  `performedBy` int(11) NULL,
  `performedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ipAddress` varchar(45) NULL,
  `userAgent` text NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create monthly_reports_new
CREATE TABLE IF NOT EXISTS `monthly_reports_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `projectId` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `reportCode` varchar(50) NOT NULL,
  `reportType` enum('monthly','period','quarterly','annual') NOT NULL DEFAULT monthly,
  `reportMonth` int(11) NOT NULL,
  `reportYear` int(11) NOT NULL,
  `periodStartDate` date NOT NULL,
  `periodEndDate` date NOT NULL,
  `status` enum('editable','finalized') NOT NULL DEFAULT editable,
  `generatedDate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `editWindowEndDate` timestamp NOT NULL,
  `finalizedDate` timestamp NULL,
  `implementationProgress` text NULL,
  `implementationProgressAr` text NULL,
  `projectSummary` text NULL,
  `projectSummaryAr` text NULL,
  `keyAchievements` text NULL,
  `keyAchievementsAr` text NULL,
  `nextPlan` text NULL,
  `nextPlanAr` text NULL,
  `challengesMitigation` text NULL,
  `challengesMitigationAr` text NULL,
  `lessonsLearned` text NULL,
  `lessonsLearnedAr` text NULL,
  `activitiesSnapshot` json NULL,
  `indicatorsSnapshot` json NULL,
  `financialSnapshot` json NULL,
  `casesSnapshot` json NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create notification_event_settings_new
CREATE TABLE IF NOT EXISTS `notification_event_settings_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `eventKey` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `category` varchar(50) NOT NULL,
  `description` varchar(500) NULL,
  `emailEnabled` tinyint(1) NOT NULL DEFAULT 1,
  `inAppEnabled` tinyint(1) NOT NULL DEFAULT 1,
  `recipientsMode` enum('role','explicit_emails','workflow_assignees','mixed') NOT NULL DEFAULT role,
  `roleIds` text NULL,
  `explicitEmails` text NULL,
  `templateId` int(11) NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create notification_outbox_new
CREATE TABLE IF NOT EXISTS `notification_outbox_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `eventKey` varchar(100) NOT NULL,
  `channel` enum('email','inapp') NOT NULL,
  `payloadJson` text NULL,
  `recipients` text NULL,
  `subject` varchar(500) NULL,
  `status` enum('queued','sending','sent','failed','dead_letter') NOT NULL DEFAULT queued,
  `attemptCount` int(11) NOT NULL DEFAULT 0,
  `lastError` text NULL,
  `nextRetryAt` timestamp NULL,
  `sentAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create notification_preferences_new
CREATE TABLE IF NOT EXISTS `notification_preferences_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `category` varchar(50) NOT NULL,
  `eventKey` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `nameAr` varchar(255) NULL,
  `emailEnabled` tinyint(1) NOT NULL DEFAULT 1,
  `inAppEnabled` tinyint(1) NOT NULL DEFAULT 1,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create operating_units_new
CREATE TABLE IF NOT EXISTS `operating_units_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `code` varchar(50) NULL,
  `type` enum('hq','country','regional','field') NOT NULL,
  `country` varchar(100) NULL,
  `city` varchar(100) NULL,
  `currency` varchar(10) NULL DEFAULT USD,
  `timezone` varchar(100) NULL DEFAULT UTC,
  `status` enum('active','inactive') NOT NULL DEFAULT active,
  `officeAdminName` varchar(255) NULL,
  `officeAdminEmail` varchar(320) NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create opportunities_new
CREATE TABLE IF NOT EXISTS `opportunities_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `donorName` varchar(255) NOT NULL,
  `donorType` enum('un','eu','ingo','foundation','government','other') NOT NULL,
  `cfpLink` text NULL,
  `interestArea` json NOT NULL,
  `geographicAreas` varchar(500) NOT NULL,
  `applicationDeadline` date NOT NULL,
  `allocatedBudget` decimal(15,2) NULL,
  `currency` varchar(10) NOT NULL DEFAULT USD,
  `isCoFunding` tinyint(1) NOT NULL DEFAULT 0,
  `applicationLink` text NULL,
  `fundingId` varchar(36) NULL,
  `projectManagerName` varchar(255) NULL,
  `projectManagerEmail` varchar(255) NULL,
  `notes` text NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create option_set_values_new
CREATE TABLE IF NOT EXISTS `option_set_values_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `optionSetId` int(11) NOT NULL,
  `label` varchar(255) NOT NULL,
  `labelAr` varchar(255) NULL,
  `value` varchar(255) NOT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `sortOrder` int(11) NOT NULL DEFAULT 0,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create option_sets_new
CREATE TABLE IF NOT EXISTS `option_sets_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `nameAr` varchar(255) NULL,
  `description` text NULL,
  `descriptionAr` text NULL,
  `systemKey` varchar(100) NULL,
  `isSystem` tinyint(1) NOT NULL DEFAULT 0,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create organization_branding_new
CREATE TABLE IF NOT EXISTS `organization_branding_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `logoUrl` text NULL,
  `faviconUrl` text NULL,
  `primaryColor` varchar(20) NULL,
  `secondaryColor` varchar(20) NULL,
  `headerText` varchar(255) NULL,
  `footerText` text NULL,
  `customCss` text NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `systemName` varchar(255) NULL,
  `systemNameAr` varchar(255) NULL,
  `accentColor` varchar(50) NULL,
  `footerTextAr` text NULL,
  `updatedBy` int(11) NULL,
  `organizationName` varchar(255) NULL,
  `organizationNameAr` varchar(255) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create organizations_new
CREATE TABLE IF NOT EXISTS `organizations_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `nameAr` varchar(255) NULL,
  `organizationCode` varchar(50) NULL,
  `shortCode` varchar(20) NULL,
  `tenantId` varchar(36) NULL,
  `primaryAdminId` int(11) NULL,
  `secondaryAdminId` int(11) NULL,
  `domain` varchar(255) NULL,
  `status` enum('active','suspended','inactive') NOT NULL DEFAULT active,
  `country` varchar(100) NULL,
  `timezone` varchar(100) NULL DEFAULT UTC,
  `currency` varchar(10) NULL DEFAULT USD,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create payment_lines_new
CREATE TABLE IF NOT EXISTS `payment_lines_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `paymentId` int(11) NOT NULL,
  `lineNumber` int(11) NOT NULL,
  `sourceType` enum('expense','invoice','advance','settlement','other') NOT NULL,
  `sourceId` int(11) NULL,
  `description` text NULL,
  `descriptionAr` text NULL,
  `amount` decimal(15,2) NOT NULL,
  `currencyId` int(11) NULL,
  `exchangeRate` decimal(15,6) NULL DEFAULT 1.000000,
  `amountInBaseCurrency` decimal(15,2) NULL,
  `projectId` int(11) NULL,
  `grantId` int(11) NULL,
  `activityId` int(11) NULL,
  `budgetLineId` int(11) NULL,
  `glAccountId` int(11) NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create payments_new
CREATE TABLE IF NOT EXISTS `payments_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `paymentNumber` varchar(50) NOT NULL,
  `paymentDate` date NOT NULL,
  `paymentType` enum('vendor','staff','advance','settlement','refund','other') NOT NULL,
  `paymentMethod` enum('cash','bank_transfer','cheque','mobile_money','wire') NOT NULL,
  `payeeType` enum('vendor','employee','other') NOT NULL,
  `payeeId` int(11) NULL,
  `payeeName` varchar(255) NOT NULL,
  `payeeNameAr` varchar(255) NULL,
  `bankAccountId` int(11) NULL,
  `chequeNumber` varchar(50) NULL,
  `chequeDate` date NULL,
  `amount` decimal(15,2) NOT NULL,
  `currencyId` int(11) NULL,
  `exchangeRateId` int(11) NULL,
  `amountInBaseCurrency` decimal(15,2) NULL,
  `description` text NULL,
  `descriptionAr` text NULL,
  `projectId` int(11) NULL,
  `grantId` int(11) NULL,
  `status` enum('draft','pending_approval','approved','paid','cancelled','void') NULL DEFAULT draft,
  `approvedBy` int(11) NULL,
  `approvedAt` timestamp NULL,
  `paidBy` int(11) NULL,
  `paidAt` timestamp NULL,
  `glAccountId` int(11) NULL,
  `journalEntryId` int(11) NULL,
  `postingStatus` enum('unposted','posted','reversed') NULL DEFAULT unposted,
  `attachments` text NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `version` int(11) NOT NULL DEFAULT 1,
  `parentId` int(11) NULL,
  `revisionReason` text NULL,
  `isLatestVersion` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create permission_reviews_new
CREATE TABLE IF NOT EXISTS `permission_reviews_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `moduleId` varchar(100) NOT NULL,
  `screenId` varchar(100) NULL,
  `reviewedBy` int(11) NOT NULL,
  `reviewedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `outcome` enum('approved','revoked') NOT NULL DEFAULT approved,
  `notes` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create pipeline_opportunities_new
CREATE TABLE IF NOT EXISTS `pipeline_opportunities_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `title` text NOT NULL,
  `donorName` varchar(255) NOT NULL,
  `donorType` enum('un','eu','ingo','foundation','government','other') NOT NULL,
  `fundingWindow` varchar(255) NULL,
  `deadline` date NOT NULL,
  `indicativeBudgetMin` decimal(15,2) NOT NULL,
  `indicativeBudgetMax` decimal(15,2) NOT NULL,
  `sectors` json NOT NULL,
  `country` varchar(100) NOT NULL,
  `governorate` varchar(255) NULL,
  `type` enum('opportunity','pipeline','proposal') NOT NULL DEFAULT pipeline,
  `stage` enum('identified','under review','go decision','no-go','concept requested','proposal requested','proposal development','approved','rejected') NOT NULL DEFAULT Identified,
  `probability` int(11) NOT NULL DEFAULT 50,
  `statusHistory` json NULL,
  `fundingId` varchar(36) NULL,
  `focalPoint` varchar(255) NULL,
  `projectManagerName` varchar(255) NULL,
  `projectManagerEmail` varchar(255) NULL,
  `notes` text NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create procurement_number_sequences_new
CREATE TABLE IF NOT EXISTS `procurement_number_sequences_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NOT NULL,
  `documentType` enum('pr','rfq','po','grn','ba','qa') NOT NULL,
  `year` int(11) NOT NULL,
  `currentSequence` int(11) NOT NULL DEFAULT 0,
  `lastGeneratedNumber` varchar(50) NULL,
  `lastGeneratedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create procurement_payments_new
CREATE TABLE IF NOT EXISTS `procurement_payments_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `purchaseOrderId` int(11) NULL,
  `supplierId` int(11) NULL,
  `paymentNumber` varchar(50) NOT NULL,
  `paymentDate` timestamp NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `currency` varchar(10) NULL DEFAULT USD,
  `paymentMethod` enum('bank_transfer','check','cash','letter_of_credit') NULL DEFAULT bank_transfer,
  `referenceNumber` varchar(100) NULL,
  `invoiceNumber` varchar(100) NULL,
  `description` text NULL,
  `status` enum('pending','processed','completed','cancelled') NOT NULL DEFAULT pending,
  `processedBy` int(11) NULL,
  `processedAt` timestamp NULL,
  `remarks` text NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create procurement_plan_new
CREATE TABLE IF NOT EXISTS `procurement_plan_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `projectId` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `activityId` int(11) NULL,
  `itemName` text NOT NULL,
  `itemNameAr` text NULL,
  `description` text NULL,
  `descriptionAr` text NULL,
  `category` enum('goods','services','works','consultancy') NOT NULL DEFAULT GOODS,
  `subcategory` varchar(255) NULL,
  `quantity` decimal(15,2) NOT NULL,
  `unit` varchar(100) NOT NULL,
  `estimatedCost` decimal(15,2) NOT NULL,
  `actualCost` decimal(15,2) NOT NULL DEFAULT 0.00,
  `currency` enum('usd','eur','gbp','chf') NOT NULL DEFAULT USD,
  `plannedProcurementDate` date NOT NULL,
  `actualProcurementDate` date NULL,
  `deliveryDate` date NULL,
  `recurrence` enum('one_time','recurring') NOT NULL DEFAULT ONE_TIME,
  `procurementMethod` enum('one_quotation','three_quotation','negotiable_quotation','tender','direct_purchase','other') NOT NULL DEFAULT ONE_QUOTATION,
  `status` enum('planned','requested','approved','in_procurement','ordered','delivered','cancelled') NOT NULL DEFAULT PLANNED,
  `supplierName` varchar(255) NULL,
  `supplierContact` varchar(255) NULL,
  `budgetLine` varchar(255) NULL,
  `notes` text NULL,
  `notesAr` text NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create project_plan_activities_new
CREATE TABLE IF NOT EXISTS `project_plan_activities_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `projectId` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `resultId` int(11) NULL,
  `activityTabId` int(11) NULL,
  `department` enum('program','meal','logistics','finance','hr','security','other') NOT NULL DEFAULT Program,
  `code` varchar(50) NOT NULL,
  `title` text NOT NULL,
  `titleAr` text NULL,
  `description` text NULL,
  `responsible` varchar(255) NULL,
  `startDate` date NULL,
  `endDate` date NULL,
  `status` enum('not started','ongoing','completed') NOT NULL DEFAULT Not Started,
  `isSynced` tinyint(1) NOT NULL DEFAULT 0,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create project_plan_objectives_new
CREATE TABLE IF NOT EXISTS `project_plan_objectives_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `projectId` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `code` varchar(50) NOT NULL,
  `title` text NOT NULL,
  `titleAr` text NULL,
  `description` text NULL,
  `status` enum('not started','ongoing','completed') NOT NULL DEFAULT Not Started,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create project_plan_results_new
CREATE TABLE IF NOT EXISTS `project_plan_results_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `projectId` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `objectiveId` int(11) NOT NULL,
  `code` varchar(50) NOT NULL,
  `title` text NOT NULL,
  `titleAr` text NULL,
  `description` text NULL,
  `status` enum('not started','ongoing','completed') NOT NULL DEFAULT Not Started,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create project_plan_tasks_new
CREATE TABLE IF NOT EXISTS `project_plan_tasks_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `projectId` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `planActivityId` int(11) NOT NULL,
  `taskTabId` int(11) NULL,
  `code` varchar(50) NOT NULL,
  `title` text NOT NULL,
  `titleAr` text NULL,
  `responsible` varchar(255) NULL,
  `startDate` date NULL,
  `endDate` date NULL,
  `status` enum('not started','ongoing','completed') NOT NULL DEFAULT Not Started,
  `isSynced` tinyint(1) NOT NULL DEFAULT 0,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create project_reporting_schedules_new
CREATE TABLE IF NOT EXISTS `project_reporting_schedules_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `projectId` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `reportType` enum('monthly','quarterly','semi_annual','annual','final','ad_hoc') NOT NULL,
  `reportTitle` varchar(500) NULL,
  `reportTitleAr` varchar(500) NULL,
  `description` text NULL,
  `descriptionAr` text NULL,
  `frequency` enum('once','monthly','quarterly','semi_annual','annual') NOT NULL,
  `dueDate` timestamp NOT NULL,
  `reminderDays` int(11) NULL DEFAULT 7,
  `status` enum('pending','in_progress','submitted','approved','rejected','overdue') NOT NULL DEFAULT pending,
  `submittedDate` timestamp NULL,
  `approvedDate` timestamp NULL,
  `submittedBy` int(11) NULL,
  `approvedBy` int(11) NULL,
  `notes` text NULL,
  `notesAr` text NULL,
  `attachments` json NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create projects_new
CREATE TABLE IF NOT EXISTS `projects_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `grantId` int(11) NULL,
  `code` varchar(100) NULL,
  `projectCode` varchar(100) NULL,
  `title` text NULL,
  `titleEn` varchar(500) NULL,
  `titleAr` varchar(500) NULL,
  `description` text NULL,
  `descriptionAr` text NULL,
  `objectives` text NULL,
  `objectivesAr` text NULL,
  `status` enum('planning','active','on_hold','completed','cancelled') NOT NULL DEFAULT planning,
  `startDate` timestamp NOT NULL,
  `endDate` timestamp NOT NULL,
  `totalBudget` decimal(15,2) NULL,
  `spent` decimal(15,2) NULL,
  `currency` enum('usd','eur','gbp','chf') NULL,
  `physicalProgressPercentage` decimal(5,2) NULL,
  `sectors` json NULL,
  `donor` varchar(255) NULL,
  `implementingPartner` varchar(255) NULL,
  `location` varchar(255) NULL,
  `locationAr` varchar(255) NULL,
  `beneficiaryCount` int(11) NULL,
  `projectManager` int(11) NULL,
  `managerId` int(11) NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NOT NULL,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create proposals_new
CREATE TABLE IF NOT EXISTS `proposals_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `pipelineOpportunityId` int(11) NULL,
  `proposalTitle` text NOT NULL,
  `donorName` varchar(255) NOT NULL,
  `callReference` varchar(255) NULL,
  `proposalType` enum('concept note','full proposal','expression of interest') NOT NULL,
  `country` varchar(100) NOT NULL,
  `governorate` varchar(255) NULL,
  `sectors` json NOT NULL,
  `projectDuration` int(11) NOT NULL,
  `totalRequestedBudget` decimal(15,2) NOT NULL,
  `currency` enum('usd','eur','gbp','chf') NOT NULL DEFAULT USD,
  `submissionDeadline` date NOT NULL,
  `proposalStatus` enum('draft','under internal review','submitted','approved','rejected','withdrawn') NOT NULL DEFAULT Draft,
  `completionPercentage` int(11) NOT NULL DEFAULT 0,
  `executiveSummary` text NULL,
  `problemStatement` text NULL,
  `objectives` json NULL,
  `activities` json NULL,
  `budget` json NULL,
  `logframe` json NULL,
  `fundingId` varchar(36) NULL,
  `leadWriter` varchar(255) NULL,
  `reviewers` json NULL,
  `projectManagerName` varchar(255) NULL,
  `projectManagerEmail` varchar(255) NULL,
  `grantId` int(11) NULL,
  `projectId` int(11) NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create pss_sessions_new
CREATE TABLE IF NOT EXISTS `pss_sessions_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `caseId` int(11) NOT NULL,
  `projectId` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `sessionDate` date NOT NULL,
  `sessionType` varchar(20) NOT NULL,
  `pssApproach` varchar(50) NULL,
  `facilitatorId` int(11) NULL,
  `facilitatorName` varchar(255) NULL,
  `duration` int(11) NULL,
  `keyObservations` text NULL,
  `beneficiaryResponse` text NULL,
  `nextSessionDate` date NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create purchase_order_line_items_new
CREATE TABLE IF NOT EXISTS `purchase_order_line_items_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `purchaseOrderId` int(11) NOT NULL,
  `lineNumber` int(11) NOT NULL,
  `description` text NOT NULL,
  `descriptionAr` text NULL,
  `specifications` text NULL,
  `quantity` decimal(10,2) NOT NULL,
  `unit` varchar(50) NULL DEFAULT Piece,
  `unitPrice` decimal(15,2) NULL DEFAULT 0,
  `totalPrice` decimal(15,2) NULL DEFAULT 0,
  `deliveredQty` decimal(10,2) NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create purchase_orders_new
CREATE TABLE IF NOT EXISTS `purchase_orders_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `purchaseRequestId` int(11) NULL,
  `quotationAnalysisId` int(11) NULL,
  `bidAnalysisId` int(11) NULL,
  `supplierId` int(11) NULL,
  `poNumber` varchar(50) NOT NULL,
  `poDate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deliveryDate` timestamp NULL,
  `deliveryLocation` text NULL,
  `deliveryLocationAr` text NULL,
  `paymentTerms` varchar(255) NULL,
  `currency` varchar(10) NULL DEFAULT USD,
  `subtotal` decimal(15,2) NULL DEFAULT 0,
  `taxAmount` decimal(15,2) NULL DEFAULT 0,
  `totalAmount` decimal(15,2) NULL DEFAULT 0,
  `termsAndConditions` text NULL,
  `status` enum('draft','sent','acknowledged','partially_delivered','delivered','completed','cancelled') NOT NULL DEFAULT draft,
  `sentAt` timestamp NULL,
  `acknowledgedAt` timestamp NULL,
  `approvedBy` int(11) NULL,
  `approvedAt` timestamp NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create purchase_request_line_items_new
CREATE TABLE IF NOT EXISTS `purchase_request_line_items_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `purchaseRequestId` int(11) NOT NULL,
  `lineNumber` int(11) NOT NULL,
  `budgetLine` varchar(50) NULL,
  `description` text NOT NULL,
  `descriptionAr` text NULL,
  `specifications` text NULL,
  `specificationsAr` text NULL,
  `quantity` decimal(10,2) NOT NULL,
  `unit` varchar(50) NULL DEFAULT Piece,
  `unitPrice` decimal(15,2) NULL DEFAULT 0,
  `totalPrice` decimal(15,2) NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create purchase_requests_new
CREATE TABLE IF NOT EXISTS `purchase_requests_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `prNumber` varchar(50) NOT NULL,
  `category` enum('goods','services','works','consultancy') NOT NULL DEFAULT goods,
  `projectId` int(11) NULL,
  `projectTitle` varchar(255) NOT NULL,
  `donorId` int(11) NULL,
  `donorName` varchar(255) NULL,
  `budgetCode` varchar(50) NULL,
  `subBudgetLine` varchar(255) NULL,
  `activityName` varchar(255) NULL,
  `totalBudgetLine` decimal(15,2) NULL DEFAULT 0,
  `exchangeRateToUSD` decimal(15,6) NULL,
  `totalBudgetLineUSD` decimal(15,2) NULL,
  `currency` varchar(10) NULL DEFAULT USD,
  `prTotalUSD` decimal(15,2) NULL DEFAULT 0,
  `department` varchar(255) NULL,
  `requesterName` varchar(255) NOT NULL,
  `requesterEmail` varchar(320) NULL,
  `requesterId` int(11) NULL,
  `prDate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `urgency` enum('low','normal','high','critical') NOT NULL DEFAULT normal,
  `neededBy` timestamp NULL,
  `deliveryLocation` varchar(255) NULL,
  `justification` text NULL,
  `procurementLadder` enum('one_quotation','three_quotations','public_tender','tender') NULL DEFAULT three_quotations,
  `status` enum('draft','submitted','validated_by_logistic','rejected_by_logistic','validated_by_finance','rejected_by_finance','approved','rejected_by_pm') NULL DEFAULT draft,
  `procurementStatus` enum('rfqs','quotations_analysis','tender_invitation','bids_analysis','purchase_order','delivery','grn','payment','completed') NULL,
  `logValidatedBy` int(11) NULL,
  `logValidatedOn` timestamp NULL,
  `logValidatorEmail` varchar(255) NULL,
  `finValidatedBy` int(11) NULL,
  `finValidatedOn` timestamp NULL,
  `finValidatorEmail` varchar(255) NULL,
  `approvedBy` int(11) NULL,
  `approvedOn` timestamp NULL,
  `approverEmail` varchar(255) NULL,
  `rejectReason` text NULL,
  `rejectionStage` varchar(50) NULL,
  `pmRejectedBy` int(11) NULL,
  `pmRejectedOn` timestamp NULL,
  `logRejectedBy` int(11) NULL,
  `logRejectedOn` timestamp NULL,
  `finRejectedBy` int(11) NULL,
  `finRejectedOn` timestamp NULL,
  `quotationAnalysisNumber` varchar(100) NULL,
  `bidsAnalysisNumber` varchar(100) NULL,
  `purchaseOrderNumber` varchar(100) NULL,
  `grnNumber` varchar(100) NULL,
  `operatingUnitId` int(11) NULL,
  `organizationId` int(11) NOT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create purge_notifications_new
CREATE TABLE IF NOT EXISTS `purge_notifications_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `recordId` int(11) NOT NULL,
  `recordType` varchar(100) NOT NULL,
  `scope` enum('platform','organization') NOT NULL,
  `organizationId` int(11) NULL,
  `operatingUnitId` int(11) NULL,
  `scheduledPurgeDate` bigint(20) NOT NULL,
  `notificationSentAt` bigint(20) NULL,
  `notificationStatus` enum('pending','sent','failed') NULL DEFAULT pending,
  `createdAt` bigint(20) NOT NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create quotation_analyses_new
CREATE TABLE IF NOT EXISTS `quotation_analyses_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `purchaseRequestId` int(11) NULL,
  `qaNumber` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `titleAr` varchar(255) NULL,
  `rfqDate` timestamp NULL,
  `closingDate` timestamp NULL,
  `selectedSupplierId` int(11) NULL,
  `selectionJustification` text NULL,
  `status` enum('draft','rfq_sent','quotes_received','evaluated','approved','cancelled') NOT NULL DEFAULT draft,
  `approvedBy` int(11) NULL,
  `approvedAt` timestamp NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create quotation_analysis_line_items_new
CREATE TABLE IF NOT EXISTS `quotation_analysis_line_items_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `quotationAnalysisId` int(11) NOT NULL,
  `supplierId` int(11) NOT NULL,
  `lineItemId` int(11) NOT NULL,
  `unitPrice` decimal(15,2) NULL DEFAULT 0,
  `totalPrice` decimal(15,2) NULL DEFAULT 0,
  `remarks` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create quotation_analysis_suppliers_new
CREATE TABLE IF NOT EXISTS `quotation_analysis_suppliers_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `quotationAnalysisId` int(11) NOT NULL,
  `supplierId` int(11) NULL,
  `supplierName` varchar(255) NULL,
  `quoteReference` varchar(100) NULL,
  `quoteDate` timestamp NULL,
  `totalAmount` decimal(15,2) NULL DEFAULT 0,
  `currency` varchar(10) NULL DEFAULT USD,
  `deliveryDays` int(11) NULL,
  `paymentTerms` varchar(255) NULL,
  `warrantyMonths` int(11) NULL,
  `technicalScore` decimal(5,2) NULL,
  `financialScore` decimal(5,2) NULL,
  `totalScore` decimal(5,2) NULL,
  `isSelected` tinyint(1) NULL DEFAULT 0,
  `remarks` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create rbac_roles_new
CREATE TABLE IF NOT EXISTS `rbac_roles_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `nameAr` varchar(255) NULL,
  `description` text NULL,
  `descriptionAr` text NULL,
  `permissions` text NOT NULL,
  `isSystem` tinyint(1) NOT NULL DEFAULT 0,
  `isLocked` tinyint(1) NOT NULL DEFAULT 0,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create rbac_user_permissions_new
CREATE TABLE IF NOT EXISTS `rbac_user_permissions_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `roleId` int(11) NULL,
  `permissions` text NOT NULL,
  `screenPermissions` text NULL,
  `tabPermissions` text NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create reporting_schedules_new
CREATE TABLE IF NOT EXISTS `reporting_schedules_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `projectId` int(11) NOT NULL,
  `grantId` int(11) NULL,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `reportType` enum('narrative','financial','progress','final','interim','quarterly','annual','other') NOT NULL,
  `reportTypeOther` varchar(255) NULL,
  `periodFrom` date NOT NULL,
  `periodTo` date NOT NULL,
  `reportStatus` enum('not_started','planned','under_preparation','under_review','submitted_to_hq','submitted_to_donor') NOT NULL DEFAULT PLANNED,
  `reportDeadline` date NOT NULL,
  `notes` text NULL,
  `isLocked` tinyint(1) NOT NULL DEFAULT 0,
  `lockedAt` timestamp NULL,
  `lockedBy` int(11) NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create retention_policies_new
CREATE TABLE IF NOT EXISTS `retention_policies_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `entityType` varchar(100) NOT NULL,
  `retentionDays` int(11) NULL,
  `description` text NULL,
  `updatedAt` bigint(20) NOT NULL,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create returned_item_line_items_new
CREATE TABLE IF NOT EXISTS `returned_item_line_items_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `returnedItemId` int(11) NOT NULL,
  `stockItemId` int(11) NULL,
  `lineNumber` int(11) NOT NULL,
  `description` text NOT NULL,
  `returnedQty` decimal(10,2) NOT NULL,
  `acceptedQty` decimal(10,2) NULL DEFAULT 0,
  `condition` enum('good','damaged','expired','defective') NULL DEFAULT good,
  `unit` varchar(50) NULL DEFAULT Piece,
  `remarks` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create returned_items_new
CREATE TABLE IF NOT EXISTS `returned_items_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `returnNumber` varchar(50) NOT NULL,
  `returnDate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `returnedBy` varchar(255) NOT NULL,
  `department` varchar(255) NULL,
  `reason` text NULL,
  `reasonAr` text NULL,
  `status` enum('draft','submitted','inspected','accepted','rejected') NOT NULL DEFAULT draft,
  `inspectedBy` varchar(255) NULL,
  `inspectedAt` timestamp NULL,
  `remarks` text NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create settlement_lines_new
CREATE TABLE IF NOT EXISTS `settlement_lines_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `settlementId` int(11) NOT NULL,
  `lineNumber` int(11) NOT NULL,
  `description` text NOT NULL,
  `descriptionAr` text NULL,
  `amount` decimal(15,2) NOT NULL,
  `currencyId` int(11) NULL,
  `exchangeRate` decimal(15,6) NULL DEFAULT 1.000000,
  `amountInBaseCurrency` decimal(15,2) NULL,
  `expenseDate` date NULL,
  `categoryId` int(11) NULL,
  `budgetLineId` int(11) NULL,
  `projectId` int(11) NULL,
  `grantId` int(11) NULL,
  `activityId` int(11) NULL,
  `glAccountId` int(11) NULL,
  `receiptNumber` varchar(100) NULL,
  `receiptDate` date NULL,
  `vendorId` int(11) NULL,
  `vendorName` varchar(255) NULL,
  `attachments` text NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create stock_issued_new
CREATE TABLE IF NOT EXISTS `stock_issued_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `stockRequestId` int(11) NULL,
  `issueNumber` varchar(50) NOT NULL,
  `issueDate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `issuedTo` varchar(255) NOT NULL,
  `issuedBy` varchar(255) NULL,
  `department` varchar(255) NULL,
  `remarks` text NULL,
  `status` enum('draft','issued','acknowledged','cancelled') NOT NULL DEFAULT draft,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create stock_issued_line_items_new
CREATE TABLE IF NOT EXISTS `stock_issued_line_items_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `stockIssuedId` int(11) NOT NULL,
  `stockItemId` int(11) NULL,
  `lineNumber` int(11) NOT NULL,
  `description` text NOT NULL,
  `issuedQty` decimal(10,2) NOT NULL,
  `unit` varchar(50) NULL DEFAULT Piece,
  `remarks` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create stock_items_new
CREATE TABLE IF NOT EXISTS `stock_items_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `itemCode` varchar(50) NOT NULL,
  `itemName` varchar(255) NOT NULL,
  `itemNameAr` varchar(255) NULL,
  `description` text NULL,
  `category` varchar(100) NULL,
  `unitType` varchar(50) NULL DEFAULT Piece,
  `currentQuantity` decimal(15,2) NULL DEFAULT 0,
  `minimumQuantity` decimal(15,2) NULL DEFAULT 0,
  `maximumQuantity` decimal(15,2) NULL,
  `reorderLevel` decimal(15,2) NULL,
  `warehouseLocation` varchar(255) NULL,
  `binLocation` varchar(100) NULL,
  `expiryDate` timestamp NULL,
  `batchNumber` varchar(100) NULL,
  `serialNumber` varchar(100) NULL,
  `unitCost` decimal(15,2) NULL DEFAULT 0,
  `totalValue` decimal(15,2) NULL DEFAULT 0,
  `currency` varchar(10) NULL DEFAULT USD,
  `isDamaged` tinyint(1) NULL DEFAULT 0,
  `isExpired` tinyint(1) NULL DEFAULT 0,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create stock_request_line_items_new
CREATE TABLE IF NOT EXISTS `stock_request_line_items_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `stockRequestId` int(11) NOT NULL,
  `stockItemId` int(11) NULL,
  `lineNumber` int(11) NOT NULL,
  `description` text NOT NULL,
  `requestedQty` decimal(10,2) NOT NULL,
  `approvedQty` decimal(10,2) NULL DEFAULT 0,
  `issuedQty` decimal(10,2) NULL DEFAULT 0,
  `unit` varchar(50) NULL DEFAULT Piece,
  `remarks` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create stock_requests_new
CREATE TABLE IF NOT EXISTS `stock_requests_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `requestNumber` varchar(50) NOT NULL,
  `requestDate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `requesterName` varchar(255) NOT NULL,
  `requesterDepartment` varchar(255) NULL,
  `purpose` text NULL,
  `purposeAr` text NULL,
  `neededByDate` timestamp NULL,
  `status` enum('draft','submitted','approved','partially_issued','issued','rejected','cancelled') NOT NULL DEFAULT draft,
  `approvedBy` int(11) NULL,
  `approvedAt` timestamp NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create suppliers_new
CREATE TABLE IF NOT EXISTS `suppliers_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `supplierCode` varchar(50) NOT NULL,
  `legalName` varchar(255) NOT NULL,
  `legalNameAr` varchar(255) NULL,
  `tradeName` varchar(255) NULL,
  `contactPerson` varchar(255) NULL,
  `email` varchar(320) NULL,
  `phone` varchar(50) NULL,
  `address` text NULL,
  `city` varchar(100) NULL,
  `country` varchar(100) NULL,
  `taxId` varchar(100) NULL,
  `registrationNumber` varchar(100) NULL,
  `bankName` varchar(255) NULL,
  `bankAccountNumber` varchar(100) NULL,
  `bankSwiftCode` varchar(50) NULL,
  `bankIban` varchar(50) NULL,
  `isBlacklisted` tinyint(1) NULL DEFAULT 0,
  `blacklistReason` text NULL,
  `blacklistDate` timestamp NULL,
  `sanctionsScreened` tinyint(1) NULL DEFAULT 0,
  `sanctionsScreenedDate` timestamp NULL,
  `performanceRating` int(11) NULL DEFAULT 0,
  `totalOrders` int(11) NULL DEFAULT 0,
  `hasFrameworkAgreement` tinyint(1) NULL DEFAULT 0,
  `frameworkAgreementExpiry` timestamp NULL,
  `documents` text NULL,
  `status` enum('active','inactive','pending_approval','blacklisted') NOT NULL DEFAULT active,
  `organizationId` int(11) NOT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create systemImportReports_new
CREATE TABLE IF NOT EXISTS `systemImportReports_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `projectId` int(11) NULL,
  `module` varchar(100) NOT NULL,
  `importType` enum('create','update') NOT NULL DEFAULT create,
  `userId` int(11) NULL,
  `userName` varchar(255) NULL,
  `userRole` varchar(50) NULL,
  `importSummary` json NOT NULL,
  `errorDetails` json NOT NULL,
  `errorFilePath` varchar(500) NULL,
  `originalFilePath` varchar(500) NULL,
  `status` enum('open','reviewed','resolved') NOT NULL DEFAULT open,
  `reviewedBy` int(11) NULL,
  `reviewedAt` timestamp NULL,
  `resolutionNotes` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create system_settings_new
CREATE TABLE IF NOT EXISTS `system_settings_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `settingKey` varchar(255) NOT NULL,
  `settingValue` text NULL,
  `updatedAt` bigint(20) NOT NULL,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create tasks_new
CREATE TABLE IF NOT EXISTS `tasks_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `projectId` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `taskName` text NOT NULL,
  `taskNameAr` text NULL,
  `description` text NULL,
  `descriptionAr` text NULL,
  `status` enum('todo','in_progress','review','done','blocked') NOT NULL DEFAULT TODO,
  `priority` enum('low','medium','high','urgent') NOT NULL DEFAULT MEDIUM,
  `dueDate` date NULL,
  `startDate` date NULL,
  `completedDate` date NULL,
  `assignedByEmail` varchar(320) NULL,
  `assignedByName` varchar(255) NULL,
  `assignedToEmail` varchar(320) NULL,
  `assignedToName` varchar(255) NULL,
  `assignmentDate` timestamp NULL,
  `assignedTo` int(11) NULL,
  `progressPercentage` decimal(5,2) NOT NULL DEFAULT 0.00,
  `tags` json NULL,
  `category` varchar(255) NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create trip_logs_new
CREATE TABLE IF NOT EXISTS `trip_logs_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `vehicleId` int(11) NOT NULL,
  `driverId` int(11) NULL,
  `tripNumber` varchar(50) NOT NULL,
  `tripDate` timestamp NOT NULL,
  `purpose` text NULL,
  `purposeAr` text NULL,
  `startLocation` varchar(255) NULL,
  `endLocation` varchar(255) NULL,
  `startMileage` decimal(10,2) NULL,
  `endMileage` decimal(10,2) NULL,
  `distanceTraveled` decimal(10,2) NULL,
  `startTime` timestamp NULL,
  `endTime` timestamp NULL,
  `passengers` text NULL,
  `projectCode` varchar(50) NULL,
  `status` enum('planned','in_progress','completed','cancelled') NOT NULL DEFAULT planned,
  `remarks` text NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create user_archive_log_new
CREATE TABLE IF NOT EXISTS `user_archive_log_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `action` enum('delete','restore') NOT NULL,
  `userSnapshot` text NOT NULL,
  `previousRoles` text NULL,
  `previousOrganizations` text NULL,
  `previousPermissions` text NULL,
  `reason` text NULL,
  `performedBy` int(11) NOT NULL,
  `performedByName` varchar(255) NULL,
  `performedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `restorationMetadata` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create user_operating_units_new
CREATE TABLE IF NOT EXISTS `user_operating_units_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `operatingUnitId` int(11) NOT NULL,
  `role` enum('organization_admin','user') NOT NULL DEFAULT user,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create user_organizations_new
CREATE TABLE IF NOT EXISTS `user_organizations_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `tenantId` varchar(36) NULL,
  `platformRole` enum('platform_admin','organization_admin','user') NOT NULL DEFAULT user,
  `orgRoles` text NULL,
  `permissions` text NULL,
  `modulePermissions` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `role` varchar(50) NULL DEFAULT user,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create user_permission_overrides_new
CREATE TABLE IF NOT EXISTS `user_permission_overrides_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `moduleId` varchar(100) NOT NULL,
  `screenId` varchar(100) NULL,
  `action` varchar(50) NOT NULL,
  `overrideType` enum('grant','revoke') NOT NULL,
  `reason` text NULL,
  `expiresAt` timestamp NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdBy` int(11) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create users_new
CREATE TABLE IF NOT EXISTS `users_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `openId` varchar(64) NULL,
  `name` text NULL,
  `email` varchar(320) NULL,
  `loginMethod` varchar(64) NULL,
  `authenticationProvider` varchar(64) NULL DEFAULT email,
  `externalIdentityId` varchar(255) NULL,
  `role` enum('platform_super_admin','platform_admin','platform_auditor','organization_admin','user','admin','manager') NOT NULL DEFAULT user,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `lastSignedIn` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `organizationId` int(11) NULL,
  `currentOrganizationId` int(11) NULL,
  `languagePreference` varchar(10) NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `deletionReason` text NULL,
  `passwordResetToken` varchar(255) NULL,
  `passwordResetExpiry` bigint(20) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create variance_alert_config_new
CREATE TABLE IF NOT EXISTS `variance_alert_config_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `projectId` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `warningThreshold` decimal(5,2) NOT NULL DEFAULT 10.00,
  `criticalThreshold` decimal(5,2) NOT NULL DEFAULT 20.00,
  `isEnabled` tinyint(1) NOT NULL DEFAULT 1,
  `notifyProjectManager` tinyint(1) NOT NULL DEFAULT 1,
  `notifyFinanceTeam` tinyint(1) NOT NULL DEFAULT 1,
  `notifyOwner` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create variance_alert_history_new
CREATE TABLE IF NOT EXISTS `variance_alert_history_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `projectId` int(11) NOT NULL,
  `budgetItemId` int(11) NOT NULL,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `budgetCode` varchar(100) NOT NULL,
  `budgetItem` text NOT NULL,
  `totalBudget` decimal(15,2) NOT NULL,
  `actualSpent` decimal(15,2) NOT NULL,
  `varianceAmount` decimal(15,2) NOT NULL,
  `variancePercentage` decimal(5,2) NOT NULL,
  `alertLevel` enum('warning','critical') NOT NULL,
  `notificationSent` tinyint(1) NOT NULL DEFAULT 0,
  `notificationError` text NULL,
  `acknowledgedAt` timestamp NULL,
  `acknowledgedBy` int(11) NULL,
  `acknowledgedNotes` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create variance_alert_thresholds_new
CREATE TABLE IF NOT EXISTS `variance_alert_thresholds_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `name` varchar(200) NOT NULL,
  `nameAr` varchar(200) NULL,
  `description` text NULL,
  `scope` enum('organization','project','grant','category') NOT NULL DEFAULT organization,
  `projectId` int(11) NULL,
  `grantId` int(11) NULL,
  `category` varchar(100) NULL,
  `thresholdPercentage` decimal(5,2) NOT NULL DEFAULT 5.00,
  `alertType` enum('budget_exceeded','threshold_exceeded','forecast_variance') NOT NULL DEFAULT threshold_exceeded,
  `severity` enum('low','medium','high','critical') NOT NULL DEFAULT medium,
  `notifyOwner` tinyint(1) NOT NULL DEFAULT 1,
  `notifyProjectManager` tinyint(1) NOT NULL DEFAULT 1,
  `notifyFinanceTeam` tinyint(1) NOT NULL DEFAULT 1,
  `emailNotification` tinyint(1) NOT NULL DEFAULT 1,
  `inAppNotification` tinyint(1) NOT NULL DEFAULT 1,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdBy` int(11) NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create variance_alerts_new
CREATE TABLE IF NOT EXISTS `variance_alerts_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `projectId` int(11) NULL,
  `grantId` int(11) NULL,
  `budgetId` int(11) NULL,
  `category` varchar(100) NULL,
  `alertType` enum('budget_exceeded','threshold_exceeded','forecast_variance') NOT NULL,
  `severity` enum('low','medium','high','critical') NOT NULL DEFAULT medium,
  `budgetAmount` decimal(15,2) NOT NULL,
  `actualAmount` decimal(15,2) NOT NULL,
  `variance` decimal(15,2) NOT NULL,
  `variancePercentage` decimal(5,2) NOT NULL,
  `thresholdPercentage` decimal(5,2) NOT NULL,
  `status` enum('active','acknowledged','resolved','dismissed') NOT NULL DEFAULT active,
  `acknowledgedBy` int(11) NULL,
  `acknowledgedAt` datetime NULL,
  `resolvedBy` int(11) NULL,
  `resolvedAt` datetime NULL,
  `notificationSent` tinyint(1) NOT NULL DEFAULT 0,
  `notificationSentAt` datetime NULL,
  `description` text NULL,
  `notes` text NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create vehicle_assignments_new
CREATE TABLE IF NOT EXISTS `vehicle_assignments_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `vehicleId` int(11) NOT NULL,
  `driverId` int(11) NOT NULL,
  `assignedFrom` timestamp NOT NULL,
  `assignedTo` timestamp NULL,
  `isPrimary` tinyint(1) NULL DEFAULT 0,
  `status` enum('active','ended') NOT NULL DEFAULT active,
  `notes` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create vehicle_compliance_new
CREATE TABLE IF NOT EXISTS `vehicle_compliance_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `vehicleId` int(11) NOT NULL,
  `complianceType` enum('insurance','registration','inspection','permit','other') NOT NULL,
  `documentNumber` varchar(100) NULL,
  `issueDate` timestamp NULL,
  `expiryDate` timestamp NULL,
  `issuingAuthority` varchar(255) NULL,
  `cost` decimal(10,2) NULL,
  `currency` varchar(10) NULL DEFAULT USD,
  `documentUrl` text NULL,
  `status` enum('valid','expiring_soon','expired','pending') NOT NULL DEFAULT valid,
  `remarks` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create vehicle_maintenance_new
CREATE TABLE IF NOT EXISTS `vehicle_maintenance_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `vehicleId` int(11) NOT NULL,
  `maintenanceNumber` varchar(50) NOT NULL,
  `maintenanceType` enum('scheduled','unscheduled','repair','inspection') NULL DEFAULT scheduled,
  `description` text NULL,
  `descriptionAr` text NULL,
  `scheduledDate` timestamp NULL,
  `completedDate` timestamp NULL,
  `mileageAtService` decimal(10,2) NULL,
  `vendor` varchar(255) NULL,
  `laborCost` decimal(10,2) NULL DEFAULT 0,
  `partsCost` decimal(10,2) NULL DEFAULT 0,
  `totalCost` decimal(10,2) NULL DEFAULT 0,
  `currency` varchar(10) NULL DEFAULT USD,
  `invoiceNumber` varchar(100) NULL,
  `status` enum('scheduled','in_progress','completed','cancelled') NOT NULL DEFAULT scheduled,
  `remarks` text NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create vehicles_new
CREATE TABLE IF NOT EXISTS `vehicles_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `vehicleId` varchar(50) NULL,
  `plateNumber` varchar(50) NOT NULL,
  `vehicleType` varchar(100) NULL,
  `brand` varchar(100) NULL,
  `model` varchar(100) NULL,
  `year` int(11) NULL,
  `color` varchar(50) NULL,
  `chassisNumber` varchar(100) NULL,
  `engineNumber` varchar(100) NULL,
  `fuelType` enum('petrol','diesel','electric','hybrid') NULL DEFAULT petrol,
  `ownership` enum('owned','leased','rented') NULL DEFAULT owned,
  `purchaseDate` timestamp NULL,
  `purchaseValue` decimal(15,2) NULL,
  `currency` varchar(10) NULL,
  `assignedProjectId` int(11) NULL,
  `assignedProject` varchar(255) NULL,
  `assignedDriverId` int(11) NULL,
  `assignedDriverName` varchar(255) NULL,
  `status` enum('active','under_maintenance','retired','disposed') NOT NULL DEFAULT active,
  `currentOdometer` decimal(15,2) NULL,
  `insuranceExpiry` timestamp NULL,
  `licenseExpiry` timestamp NULL,
  `inspectionExpiry` timestamp NULL,
  `notes` text NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create vendors_new
CREATE TABLE IF NOT EXISTS `vendors_new` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organizationId` int(11) NOT NULL,
  `operatingUnitId` int(11) NULL,
  `vendorCode` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `nameAr` varchar(255) NULL,
  `vendorType` enum('supplier','contractor','service_provider','consultant','other') NULL DEFAULT supplier,
  `taxId` varchar(50) NULL,
  `registrationNumber` varchar(100) NULL,
  `contactPerson` varchar(255) NULL,
  `email` varchar(255) NULL,
  `phone` varchar(50) NULL,
  `mobile` varchar(50) NULL,
  `fax` varchar(50) NULL,
  `website` varchar(255) NULL,
  `addressLine1` varchar(255) NULL,
  `addressLine2` varchar(255) NULL,
  `city` varchar(100) NULL,
  `state` varchar(100) NULL,
  `country` varchar(100) NULL,
  `postalCode` varchar(20) NULL,
  `bankName` varchar(255) NULL,
  `bankBranch` varchar(255) NULL,
  `bankAccountNumber` varchar(100) NULL,
  `bankAccountName` varchar(255) NULL,
  `iban` varchar(50) NULL,
  `swiftCode` varchar(20) NULL,
  `currencyId` int(11) NULL,
  `paymentTerms` varchar(100) NULL,
  `creditLimit` decimal(15,2) NULL,
  `currentBalance` decimal(15,2) NULL DEFAULT 0.00,
  `glAccountId` int(11) NULL,
  `isActive` tinyint(1) NULL DEFAULT 1,
  `isPreferred` tinyint(1) NULL DEFAULT 0,
  `isBlacklisted` tinyint(1) NULL DEFAULT 0,
  `blacklistReason` text NULL,
  `notes` text NULL,
  `attachments` text NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NULL,
  `updatedBy` int(11) NULL,
  `deletedAt` timestamp NULL,
  `deletedBy` int(11) NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- STEP 2: MIGRATE DATA WITH TYPE CONVERSIONS

-- Migrate activities
INSERT INTO `activities_new` (`id`, `projectId`, `organizationId`, `operatingUnitId`, `activityCode`, `activityName`, `activityNameAr`, `description`, `descriptionAr`, `plannedStartDate`, `plannedEndDate`, `actualStartDate`, `actualEndDate`, `status`, `progressPercentage`, `budgetAllocated`, `actualSpent`, `currency`, `location`, `locationAr`, `responsiblePerson`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `target`, `unitType`, `achievedValue`)
SELECT CAST(id AS int(11)) as id, CAST(projectId AS int(11)) as projectId, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, activityCode, activityName, activityNameAr, description, descriptionAr, plannedStartDate, plannedEndDate, actualStartDate, actualEndDate, status, CAST(progressPercentage AS decimal(5,2)) as progressPercentage, CAST(budgetAllocated AS decimal(15,2)) as budgetAllocated, CAST(actualSpent AS decimal(15,2)) as actualSpent, currency, location, locationAr, responsiblePerson, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy, CAST(target AS decimal(15,2)) as target, unitType, CAST(achievedValue AS decimal(15,2)) as achievedValue
FROM `activities`;

-- Migrate allocation_bases
INSERT INTO `allocation_bases_new` (`id`, `organizationId`, `allocationPeriodId`, `projectId`, `allocationKeyId`, `basisValue`, `basisPercentage`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(allocationPeriodId AS int(11)) as allocationPeriodId, CAST(projectId AS int(11)) as projectId, CAST(allocationKeyId AS int(11)) as allocationKeyId, CAST(basisValue AS decimal(15,2)) as basisValue, CAST(basisPercentage AS decimal(5,2)) as basisPercentage, createdAt, updatedAt
FROM `allocation_bases`;

-- Migrate allocation_keys
INSERT INTO `allocation_keys_new` (`id`, `organizationId`, `keyCode`, `keyName`, `keyNameAr`, `keyType`, `description`, `descriptionAr`, `isActive`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, keyCode, keyName, keyNameAr, keyType, description, descriptionAr, CAST(isActive AS tinyint(1)) as isActive, createdAt, updatedAt, createdBy, updatedBy
FROM `allocation_keys`;

-- Migrate allocation_periods
INSERT INTO `allocation_periods_new` (`id`, `organizationId`, `periodCode`, `periodName`, `periodNameAr`, `periodType`, `startDate`, `endDate`, `fiscalYearId`, `fiscalPeriodId`, `status`, `executedAt`, `executedBy`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, periodCode, periodName, periodNameAr, periodType, startDate, endDate, CAST(fiscalYearId AS int(11)) as fiscalYearId, CAST(fiscalPeriodId AS int(11)) as fiscalPeriodId, status, executedAt, executedBy, createdAt, updatedAt, createdBy, updatedBy
FROM `allocation_periods`;

-- Migrate allocation_results
INSERT INTO `allocation_results_new` (`id`, `organizationId`, `allocationPeriodId`, `costPoolId`, `projectId`, `allocationKeyId`, `totalPoolAmount`, `allocationPercentage`, `allocatedAmount`, `journalEntryId`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(allocationPeriodId AS int(11)) as allocationPeriodId, CAST(costPoolId AS int(11)) as costPoolId, CAST(projectId AS int(11)) as projectId, CAST(allocationKeyId AS int(11)) as allocationKeyId, CAST(totalPoolAmount AS decimal(15,2)) as totalPoolAmount, CAST(allocationPercentage AS decimal(5,2)) as allocationPercentage, CAST(allocatedAmount AS decimal(15,2)) as allocatedAmount, CAST(journalEntryId AS int(11)) as journalEntryId, createdAt, updatedAt
FROM `allocation_results`;

-- Migrate allocation_reversals
INSERT INTO `allocation_reversals_new` (`id`, `organizationId`, `allocationPeriodId`, `reversalDate`, `reversalReason`, `reversalReasonAr`, `originalJournalEntryIds`, `reversalJournalEntryIds`, `totalReversedAmount`, `reversedAt`, `reversedBy`, `createdAt`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(allocationPeriodId AS int(11)) as allocationPeriodId, reversalDate, reversalReason, reversalReasonAr, originalJournalEntryIds, reversalJournalEntryIds, CAST(totalReversedAmount AS decimal(15,2)) as totalReversedAmount, reversedAt, CAST(reversedBy AS int(11)) as reversedBy, createdAt
FROM `allocation_reversals`;

-- Migrate allocation_rules
INSERT INTO `allocation_rules_new` (`id`, `organizationId`, `costPoolId`, `allocationKeyId`, `effectiveFrom`, `effectiveTo`, `isActive`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(costPoolId AS int(11)) as costPoolId, CAST(allocationKeyId AS int(11)) as allocationKeyId, effectiveFrom, effectiveTo, CAST(isActive AS tinyint(1)) as isActive, createdAt, updatedAt, createdBy, updatedBy
FROM `allocation_rules`;

-- Migrate allocation_template_rules
INSERT INTO `allocation_template_rules_new` (`id`, `organizationId`, `templateId`, `costPoolId`, `allocationKeyId`, `priority`, `isActive`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(templateId AS int(11)) as templateId, CAST(costPoolId AS int(11)) as costPoolId, CAST(allocationKeyId AS int(11)) as allocationKeyId, CAST(priority AS int(11)) as priority, CAST(isActive AS tinyint(1)) as isActive, createdAt, updatedAt
FROM `allocation_template_rules`;

-- Migrate allocation_templates
INSERT INTO `allocation_templates_new` (`id`, `organizationId`, `templateCode`, `templateName`, `templateNameAr`, `description`, `descriptionAr`, `periodType`, `isActive`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, templateCode, templateName, templateNameAr, description, descriptionAr, periodType, CAST(isActive AS tinyint(1)) as isActive, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy
FROM `allocation_templates`;

-- Migrate asset_depreciation_schedule
INSERT INTO `asset_depreciation_schedule_new` (`id`, `organizationId`, `operatingUnitId`, `assetId`, `fiscalYearId`, `fiscalPeriodId`, `periodDate`, `periodNumber`, `openingBookValue`, `depreciationAmount`, `accumulatedDepreciation`, `closingBookValue`, `depreciationMethod`, `isPosted`, `journalEntryId`, `postedAt`, `postedBy`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(assetId AS int(11)) as assetId, CAST(fiscalYearId AS int(11)) as fiscalYearId, CAST(fiscalPeriodId AS int(11)) as fiscalPeriodId, periodDate, CAST(periodNumber AS int(11)) as periodNumber, CAST(openingBookValue AS decimal(15,2)) as openingBookValue, CAST(depreciationAmount AS decimal(15,2)) as depreciationAmount, CAST(accumulatedDepreciation AS decimal(15,2)) as accumulatedDepreciation, CAST(closingBookValue AS decimal(15,2)) as closingBookValue, depreciationMethod, CAST(isPosted AS tinyint(1)) as isPosted, CAST(journalEntryId AS int(11)) as journalEntryId, postedAt, CAST(postedBy AS int(11)) as postedBy, createdAt, updatedAt
FROM `asset_depreciation_schedule`;

-- Migrate audit_log_export_history
INSERT INTO `audit_log_export_history_new` (`id`, `scheduleId`, `exportDate`, `recordCount`, `filePath`, `fileSize`, `recipients`, `status`, `errorMessage`, `triggeredBy`, `createdAt`)
SELECT CAST(id AS int(11)) as id, CAST(scheduleId AS int(11)) as scheduleId, CAST(exportDate AS bigint(20)) as exportDate, CAST(recordCount AS int(11)) as recordCount, filePath, CAST(fileSize AS bigint(20)) as fileSize, recipients, status, errorMessage, CAST(triggeredBy AS int(11)) as triggeredBy, CAST(createdAt AS bigint(20)) as createdAt
FROM `audit_log_export_history`;

-- Migrate audit_log_export_schedules
INSERT INTO `audit_log_export_schedules_new` (`id`, `scheduleName`, `frequency`, `dayOfExecution`, `recipients`, `lastRunAt`, `nextRunAt`, `isActive`, `createdBy`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, scheduleName, frequency, CAST(dayOfExecution AS int(11)) as dayOfExecution, recipients, CAST(lastRunAt AS bigint(20)) as lastRunAt, CAST(nextRunAt AS bigint(20)) as nextRunAt, CAST(isActive AS tinyint(1)) as isActive, CAST(createdBy AS int(11)) as createdBy, CAST(createdAt AS bigint(20)) as createdAt, CAST(updatedAt AS bigint(20)) as updatedAt
FROM `audit_log_export_schedules`;

-- Migrate audit_logs
INSERT INTO `audit_logs_new` (`id`, `userId`, `organizationId`, `operatingUnitId`, `action`, `entityType`, `entityId`, `details`, `ipAddress`, `userAgent`, `createdAt`)
SELECT CAST(id AS int(11)) as id, CAST(userId AS int(11)) as userId, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, action, entityType, CAST(entityId AS int(11)) as entityId, details, ipAddress, userAgent, createdAt
FROM `audit_logs`;

-- Migrate bank_reconciliations
INSERT INTO `bank_reconciliations_new` (`id`, `organizationId`, `operatingUnitId`, `bankAccountId`, `reconciliationNumber`, `reconciliationDate`, `statementDate`, `statementBalance`, `bookBalance`, `adjustedBookBalance`, `outstandingDeposits`, `outstandingCheques`, `difference`, `status`, `notes`, `completedAt`, `completedBy`, `approvedAt`, `approvedBy`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `isDeleted`, `deletedAt`, `deletedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(bankAccountId AS int(11)) as bankAccountId, reconciliationNumber, reconciliationDate, statementDate, CAST(statementBalance AS decimal(15,2)) as statementBalance, CAST(bookBalance AS decimal(15,2)) as bookBalance, CAST(adjustedBookBalance AS decimal(15,2)) as adjustedBookBalance, CAST(outstandingDeposits AS decimal(15,2)) as outstandingDeposits, CAST(outstandingCheques AS decimal(15,2)) as outstandingCheques, CAST(difference AS decimal(15,2)) as difference, status, notes, completedAt, CAST(completedBy AS int(11)) as completedBy, approvedAt, CAST(approvedBy AS int(11)) as approvedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy
FROM `bank_reconciliations`;

-- Migrate bank_transactions
INSERT INTO `bank_transactions_new` (`id`, `organizationId`, `operatingUnitId`, `bankAccountId`, `transactionDate`, `valueDate`, `transactionType`, `amount`, `currencyId`, `exchangeRate`, `amountInBaseCurrency`, `reference`, `description`, `descriptionAr`, `counterpartyName`, `counterpartyAccount`, `statementReference`, `importBatchId`, `isReconciled`, `reconciledAt`, `reconciledBy`, `reconciliationId`, `matchedTransactionType`, `matchedTransactionId`, `createdAt`, `updatedAt`, `isDeleted`, `deletedAt`, `deletedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(bankAccountId AS int(11)) as bankAccountId, transactionDate, valueDate, transactionType, CAST(amount AS decimal(15,2)) as amount, CAST(currencyId AS int(11)) as currencyId, CAST(exchangeRate AS decimal(15,6)) as exchangeRate, CAST(amountInBaseCurrency AS decimal(15,2)) as amountInBaseCurrency, reference, description, descriptionAr, counterpartyName, counterpartyAccount, statementReference, CAST(importBatchId AS int(11)) as importBatchId, CAST(isReconciled AS tinyint(1)) as isReconciled, reconciledAt, CAST(reconciledBy AS int(11)) as reconciledBy, CAST(reconciliationId AS int(11)) as reconciliationId, matchedTransactionType, CAST(matchedTransactionId AS int(11)) as matchedTransactionId, createdAt, updatedAt, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy
FROM `bank_transactions`;

-- Migrate beneficiaries
INSERT INTO `beneficiaries_new` (`id`, `projectId`, `organizationId`, `operatingUnitId`, `fullName`, `fullNameAr`, `dateOfBirth`, `identificationType`, `identificationTypeOther`, `identificationNumber`, `identificationAttachment`, `gender`, `ageGroup`, `nationality`, `phoneNumber`, `email`, `country`, `governorate`, `district`, `village`, `address`, `addressAr`, `communityType`, `communityTypeOther`, `householdSize`, `dependents`, `vulnerabilityCategory`, `vulnerabilityOther`, `disabilityStatus`, `disabilityType`, `activityId`, `serviceType`, `serviceTypeOther`, `serviceStatus`, `registrationDate`, `verificationStatus`, `verifiedBy`, `verificationDate`, `notes`, `notesAr`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(projectId AS int(11)) as projectId, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, fullName, fullNameAr, dateOfBirth, identificationType, identificationTypeOther, identificationNumber, identificationAttachment, gender, ageGroup, nationality, phoneNumber, email, country, governorate, district, village, address, addressAr, communityType, communityTypeOther, CAST(householdSize AS int(11)) as householdSize, CAST(dependents AS int(11)) as dependents, vulnerabilityCategory, vulnerabilityOther, CAST(disabilityStatus AS tinyint(1)) as disabilityStatus, disabilityType, CAST(activityId AS int(11)) as activityId, serviceType, serviceTypeOther, serviceStatus, registrationDate, verificationStatus, verifiedBy, verificationDate, notes, notesAr, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy
FROM `beneficiaries`;

-- Migrate bid_analyses
INSERT INTO `bid_analyses_new` (`id`, `organizationId`, `operatingUnitId`, `purchaseRequestId`, `cbaNumber`, `title`, `titleAr`, `tenderDate`, `closingDate`, `openingDate`, `evaluationMethod`, `technicalWeight`, `financialWeight`, `minimumTechnicalScore`, `selectedBidderId`, `selectionJustification`, `status`, `approvedBy`, `approvedAt`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `announcementStartDate`, `announcementEndDate`, `announcementChannel`, `announcementLink`, `announcementReference`, `numberOfBidders`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(purchaseRequestId AS int(11)) as purchaseRequestId, cbaNumber, title, titleAr, tenderDate, closingDate, openingDate, evaluationMethod, CAST(technicalWeight AS decimal(5,2)) as technicalWeight, CAST(financialWeight AS decimal(5,2)) as financialWeight, CAST(minimumTechnicalScore AS decimal(5,2)) as minimumTechnicalScore, CAST(selectedBidderId AS int(11)) as selectedBidderId, selectionJustification, status, CAST(approvedBy AS int(11)) as approvedBy, approvedAt, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy, announcementStartDate, announcementEndDate, announcementChannel, announcementLink, announcementReference, CAST(numberOfBidders AS int(11)) as numberOfBidders
FROM `bid_analyses`;

-- Migrate bid_analysis_bidders
INSERT INTO `bid_analysis_bidders_new` (`id`, `bidAnalysisId`, `supplierId`, `bidderName`, `submissionDate`, `submissionStatus`, `bidReference`, `bidDate`, `totalBidAmount`, `currency`, `technicalScore`, `financialScore`, `combinedScore`, `rank`, `isResponsive`, `nonResponsiveReason`, `isSelected`, `remarks`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(bidAnalysisId AS int(11)) as bidAnalysisId, CAST(supplierId AS int(11)) as supplierId, bidderName, submissionDate, submissionStatus, bidReference, bidDate, CAST(totalBidAmount AS decimal(15,2)) as totalBidAmount, currency, CAST(technicalScore AS decimal(5,2)) as technicalScore, CAST(financialScore AS decimal(5,2)) as financialScore, CAST(combinedScore AS decimal(5,2)) as combinedScore, CAST(rank AS int(11)) as rank, CAST(isResponsive AS tinyint(1)) as isResponsive, nonResponsiveReason, CAST(isSelected AS tinyint(1)) as isSelected, remarks, createdAt, updatedAt
FROM `bid_analysis_bidders`;

-- Migrate bid_evaluation_criteria
INSERT INTO `bid_evaluation_criteria_new` (`id`, `bidAnalysisId`, `criteriaType`, `name`, `nameAr`, `description`, `maxScore`, `weight`, `sortOrder`, `createdAt`, `updatedAt`, `sectionNumber`, `sectionName`, `sectionNameAr`, `stage`, `stageAr`, `isScreening`, `isApplicable`)
SELECT CAST(id AS int(11)) as id, CAST(bidAnalysisId AS int(11)) as bidAnalysisId, criteriaType, name, nameAr, description, CAST(maxScore AS decimal(5,2)) as maxScore, CAST(weight AS decimal(5,2)) as weight, CAST(sortOrder AS int(11)) as sortOrder, createdAt, updatedAt, CAST(sectionNumber AS int(11)) as sectionNumber, sectionName, sectionNameAr, stage, stageAr, CAST(isScreening AS tinyint(1)) as isScreening, CAST(isApplicable AS tinyint(1)) as isApplicable
FROM `bid_evaluation_criteria`;

-- Migrate bid_evaluation_scores
INSERT INTO `bid_evaluation_scores_new` (`id`, `bidAnalysisId`, `criterionId`, `bidderId`, `score`, `status`, `notes`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(bidAnalysisId AS int(11)) as bidAnalysisId, CAST(criterionId AS int(11)) as criterionId, CAST(bidderId AS int(11)) as bidderId, CAST(score AS decimal(5,2)) as score, status, notes, createdAt, updatedAt
FROM `bid_evaluation_scores`;

-- Migrate bid_opening_minutes
INSERT INTO `bid_opening_minutes_new` (`id`, `organizationId`, `operatingUnitId`, `purchaseRequestId`, `bidAnalysisId`, `minutesNumber`, `openingDate`, `openingTime`, `openingVenue`, `openingMode`, `openingLocation`, `chairpersonId`, `chairpersonName`, `member1Id`, `member1Name`, `member2Id`, `member2Name`, `member3Id`, `member3Name`, `totalBidsReceived`, `bidsOpenedCount`, `openingNotes`, `irregularities`, `status`, `finalizedAt`, `finalizedBy`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(purchaseRequestId AS int(11)) as purchaseRequestId, CAST(bidAnalysisId AS int(11)) as bidAnalysisId, minutesNumber, openingDate, openingTime, openingVenue, openingMode, openingLocation, CAST(chairpersonId AS int(11)) as chairpersonId, chairpersonName, CAST(member1Id AS int(11)) as member1Id, member1Name, CAST(member2Id AS int(11)) as member2Id, member2Name, CAST(member3Id AS int(11)) as member3Id, member3Name, CAST(totalBidsReceived AS int(11)) as totalBidsReceived, CAST(bidsOpenedCount AS int(11)) as bidsOpenedCount, openingNotes, irregularities, status, finalizedAt, CAST(finalizedBy AS int(11)) as finalizedBy, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy
FROM `bid_opening_minutes`;

-- Migrate budget_items
INSERT INTO `budget_items_new` (`id`, `projectId`, `organizationId`, `operatingUnitId`, `activityId`, `fiscalYear`, `budgetCode`, `subBL`, `subBudgetLine`, `activityName`, `budgetItem`, `category`, `quantity`, `unitType`, `unitCost`, `recurrence`, `totalBudgetLine`, `currency`, `actualSpent`, `startDate`, `endDate`, `notes`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `isDeleted`, `deletedAt`, `deletedBy`)
SELECT CAST(id AS int(11)) as id, CAST(projectId AS int(11)) as projectId, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(activityId AS int(11)) as activityId, fiscalYear, budgetCode, subBL, subBudgetLine, activityName, budgetItem, category, CAST(quantity AS decimal(15,2)) as quantity, unitType, CAST(unitCost AS decimal(15,2)) as unitCost, CAST(recurrence AS int(11)) as recurrence, CAST(totalBudgetLine AS decimal(15,2)) as totalBudgetLine, currency, CAST(actualSpent AS decimal(15,2)) as actualSpent, startDate, endDate, notes, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy
FROM `budget_items`;

-- Migrate budget_lines
INSERT INTO `budget_lines_new` (`id`, `budgetId`, `projectId`, `organizationId`, `operatingUnitId`, `lineCode`, `lineNumber`, `description`, `descriptionAr`, `categoryId`, `accountId`, `activityId`, `unitType`, `unitCost`, `quantity`, `durationMonths`, `totalAmount`, `donorEligibleAmount`, `donorEligibilityPercentage`, `ineligibilityReason`, `ineligibilityReasonAr`, `donorMappingId`, `locationId`, `locationName`, `implementationPeriodStart`, `implementationPeriodEnd`, `actualSpent`, `commitments`, `availableBalance`, `justification`, `justificationAr`, `notes`, `notesAr`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `isDeleted`)
SELECT CAST(id AS int(11)) as id, CAST(budgetId AS int(11)) as budgetId, CAST(projectId AS int(11)) as projectId, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, lineCode, CAST(lineNumber AS int(11)) as lineNumber, description, descriptionAr, CAST(categoryId AS int(11)) as categoryId, CAST(accountId AS int(11)) as accountId, CAST(activityId AS int(11)) as activityId, unitType, CAST(unitCost AS decimal(15,2)) as unitCost, CAST(quantity AS decimal(15,2)) as quantity, CAST(durationMonths AS int(11)) as durationMonths, CAST(totalAmount AS decimal(15,2)) as totalAmount, CAST(donorEligibleAmount AS decimal(15,2)) as donorEligibleAmount, CAST(donorEligibilityPercentage AS decimal(5,2)) as donorEligibilityPercentage, ineligibilityReason, ineligibilityReasonAr, CAST(donorMappingId AS int(11)) as donorMappingId, CAST(locationId AS int(11)) as locationId, locationName, implementationPeriodStart, implementationPeriodEnd, CAST(actualSpent AS decimal(15,2)) as actualSpent, CAST(commitments AS decimal(15,2)) as commitments, CAST(availableBalance AS decimal(15,2)) as availableBalance, justification, justificationAr, notes, notesAr, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy, CAST(isDeleted AS tinyint(1)) as isDeleted
FROM `budget_lines`;

-- Migrate budget_monthly_allocations
INSERT INTO `budget_monthly_allocations_new` (`id`, `budgetLineId`, `budgetId`, `allocationMonth`, `monthNumber`, `quarterNumber`, `fiscalYear`, `plannedAmount`, `forecastAmount`, `actualAmount`, `variance`, `notes`, `notesAr`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `organizationId`, `operatingUnitId`, `isDeleted`, `deletedAt`, `deletedBy`)
SELECT CAST(id AS int(11)) as id, CAST(budgetLineId AS int(11)) as budgetLineId, CAST(budgetId AS int(11)) as budgetId, allocationMonth, CAST(monthNumber AS int(11)) as monthNumber, CAST(quarterNumber AS int(11)) as quarterNumber, fiscalYear, CAST(plannedAmount AS decimal(15,2)) as plannedAmount, CAST(forecastAmount AS decimal(15,2)) as forecastAmount, CAST(actualAmount AS decimal(15,2)) as actualAmount, CAST(variance AS decimal(15,2)) as variance, notes, notesAr, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy
FROM `budget_monthly_allocations`;

-- Migrate budget_reallocation_lines
INSERT INTO `budget_reallocation_lines_new` (`id`, `organizationId`, `reallocationId`, `lineNumber`, `lineType`, `projectId`, `budgetItemId`, `glAccountId`, `amount`, `currency`, `exchangeRate`, `baseCurrencyAmount`, `description`, `descriptionAr`, `createdAt`, `updatedAt`, `operatingUnitId`, `isDeleted`, `deletedAt`, `deletedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(reallocationId AS int(11)) as reallocationId, CAST(lineNumber AS int(11)) as lineNumber, lineType, CAST(projectId AS int(11)) as projectId, CAST(budgetItemId AS int(11)) as budgetItemId, CAST(glAccountId AS int(11)) as glAccountId, CAST(amount AS decimal(15,2)) as amount, currency, CAST(exchangeRate AS decimal(15,6)) as exchangeRate, CAST(baseCurrencyAmount AS decimal(15,2)) as baseCurrencyAmount, description, descriptionAr, createdAt, updatedAt, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy
FROM `budget_reallocation_lines`;

-- Migrate budget_reallocations
INSERT INTO `budget_reallocations_new` (`id`, `organizationId`, `reallocationCode`, `reallocationDate`, `description`, `descriptionAr`, `totalAmount`, `currency`, `exchangeRate`, `baseCurrencyAmount`, `status`, `justification`, `justificationAr`, `submittedAt`, `submittedBy`, `approvedAt`, `approvedBy`, `rejectedAt`, `rejectedBy`, `rejectionReason`, `rejectionReasonAr`, `executedAt`, `executedBy`, `journalEntryId`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `operatingUnitId`, `isDeleted`, `deletedAt`, `deletedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, reallocationCode, reallocationDate, description, descriptionAr, CAST(totalAmount AS decimal(15,2)) as totalAmount, currency, CAST(exchangeRate AS decimal(15,6)) as exchangeRate, CAST(baseCurrencyAmount AS decimal(15,2)) as baseCurrencyAmount, status, justification, justificationAr, submittedAt, CAST(submittedBy AS int(11)) as submittedBy, approvedAt, CAST(approvedBy AS int(11)) as approvedBy, rejectedAt, CAST(rejectedBy AS int(11)) as rejectedBy, rejectionReason, rejectionReasonAr, executedAt, CAST(executedBy AS int(11)) as executedBy, CAST(journalEntryId AS int(11)) as journalEntryId, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy
FROM `budget_reallocations`;

-- Migrate budgets
INSERT INTO `budgets_new` (`id`, `projectId`, `grantId`, `organizationId`, `operatingUnitId`, `budgetCode`, `budgetTitle`, `budgetTitleAr`, `fiscalYear`, `currency`, `baseCurrency`, `exchangeRate`, `totalApprovedAmount`, `totalForecastAmount`, `totalActualAmount`, `versionNumber`, `parentBudgetId`, `revisionNotes`, `revisionNotesAr`, `status`, `submittedAt`, `submittedBy`, `approvedAt`, `approvedBy`, `rejectedAt`, `rejectedBy`, `rejectionReason`, `rejectionReasonAr`, `periodStart`, `periodEnd`, `notes`, `notesAr`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `isDeleted`)
SELECT CAST(id AS int(11)) as id, CAST(projectId AS int(11)) as projectId, CAST(grantId AS int(11)) as grantId, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, budgetCode, budgetTitle, budgetTitleAr, fiscalYear, currency, baseCurrency, CAST(exchangeRate AS decimal(15,6)) as exchangeRate, CAST(totalApprovedAmount AS decimal(15,2)) as totalApprovedAmount, CAST(totalForecastAmount AS decimal(15,2)) as totalForecastAmount, CAST(totalActualAmount AS decimal(15,2)) as totalActualAmount, CAST(versionNumber AS int(11)) as versionNumber, CAST(parentBudgetId AS int(11)) as parentBudgetId, revisionNotes, revisionNotesAr, status, submittedAt, CAST(submittedBy AS int(11)) as submittedBy, approvedAt, CAST(approvedBy AS int(11)) as approvedBy, rejectedAt, CAST(rejectedBy AS int(11)) as rejectedBy, rejectionReason, rejectionReasonAr, periodStart, periodEnd, notes, notesAr, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy, CAST(isDeleted AS tinyint(1)) as isDeleted
FROM `budgets`;

-- Migrate case_activities
INSERT INTO `case_activities_new` (`id`, `caseId`, `projectId`, `organizationId`, `activityType`, `activityDate`, `provider`, `notes`, `linkedActivityId`, `linkedIndicatorId`, `createdAt`, `updatedAt`, `createdBy`, `isDeleted`)
SELECT CAST(id AS int(11)) as id, CAST(caseId AS int(11)) as caseId, CAST(projectId AS int(11)) as projectId, CAST(organizationId AS int(11)) as organizationId, activityType, activityDate, provider, notes, CAST(linkedActivityId AS int(11)) as linkedActivityId, CAST(linkedIndicatorId AS int(11)) as linkedIndicatorId, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(isDeleted AS tinyint(1)) as isDeleted
FROM `case_activities`;

-- Migrate case_records
INSERT INTO `case_records_new` (`id`, `projectId`, `organizationId`, `caseCode`, `beneficiaryCode`, `firstName`, `lastName`, `dateOfBirth`, `gender`, `age`, `nationality`, `idNumber`, `hasDisability`, `location`, `district`, `community`, `householdSize`, `vulnerabilityCategory`, `phoneNumber`, `email`, `address`, `caseType`, `riskLevel`, `status`, `openedAt`, `closedAt`, `referralSource`, `intakeDate`, `identifiedNeeds`, `riskFactors`, `immediateConcerns`, `informedConsentObtained`, `consentDate`, `assignedPssOfficerId`, `assignedCaseWorkerId`, `assignedTo`, `plannedInterventions`, `responsiblePerson`, `expectedOutcomes`, `timeline`, `reviewDate`, `notes`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `isDeleted`, `deletedAt`, `deletedBy`)
SELECT CAST(id AS int(11)) as id, CAST(projectId AS int(11)) as projectId, CAST(organizationId AS int(11)) as organizationId, caseCode, beneficiaryCode, firstName, lastName, dateOfBirth, gender, CAST(age AS int(11)) as age, nationality, idNumber, CAST(hasDisability AS tinyint(1)) as hasDisability, location, district, community, CAST(householdSize AS int(11)) as householdSize, vulnerabilityCategory, phoneNumber, email, address, caseType, riskLevel, status, openedAt, closedAt, referralSource, intakeDate, identifiedNeeds, riskFactors, immediateConcerns, CAST(informedConsentObtained AS tinyint(1)) as informedConsentObtained, consentDate, CAST(assignedPssOfficerId AS int(11)) as assignedPssOfficerId, CAST(assignedCaseWorkerId AS int(11)) as assignedCaseWorkerId, assignedTo, plannedInterventions, responsiblePerson, expectedOutcomes, timeline, reviewDate, notes, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy
FROM `case_records`;

-- Migrate case_referrals
INSERT INTO `case_referrals_new` (`id`, `caseId`, `projectId`, `organizationId`, `referralDate`, `referralType`, `serviceRequired`, `receivingOrganization`, `focalPoint`, `focalPointContact`, `status`, `followUpDate`, `feedbackReceived`, `feedbackNotes`, `consentObtained`, `createdAt`, `updatedAt`, `createdBy`, `isDeleted`)
SELECT CAST(id AS int(11)) as id, CAST(caseId AS int(11)) as caseId, CAST(projectId AS int(11)) as projectId, CAST(organizationId AS int(11)) as organizationId, referralDate, referralType, serviceRequired, receivingOrganization, focalPoint, focalPointContact, status, followUpDate, CAST(feedbackReceived AS tinyint(1)) as feedbackReceived, feedbackNotes, CAST(consentObtained AS tinyint(1)) as consentObtained, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(isDeleted AS tinyint(1)) as isDeleted
FROM `case_referrals`;

-- Migrate chart_of_accounts
INSERT INTO `chart_of_accounts_new` (`id`, `organizationId`, `accountCode`, `accountNameEn`, `accountNameAr`, `accountType`, `parentAccountCode`, `description`, `isActive`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, accountCode, accountNameEn, accountNameAr, accountType, parentAccountCode, description, CAST(isActive AS tinyint(1)) as isActive, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, CAST(createdBy AS int(11)) as createdBy, updatedAt, CAST(updatedBy AS int(11)) as updatedBy
FROM `chart_of_accounts`;

-- Migrate child_safe_spaces
INSERT INTO `child_safe_spaces_new` (`id`, `projectId`, `organizationId`, `cssName`, `cssCode`, `location`, `operatingPartner`, `capacity`, `ageGroupsServed`, `genderSegregation`, `operatingDays`, `operatingHours`, `createdAt`, `updatedAt`, `createdBy`, `isDeleted`)
SELECT CAST(id AS int(11)) as id, CAST(projectId AS int(11)) as projectId, CAST(organizationId AS int(11)) as organizationId, cssName, cssCode, location, operatingPartner, CAST(capacity AS int(11)) as capacity, ageGroupsServed, CAST(genderSegregation AS tinyint(1)) as genderSegregation, operatingDays, operatingHours, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(isDeleted AS tinyint(1)) as isDeleted
FROM `child_safe_spaces`;

-- Migrate cost_centers
INSERT INTO `cost_centers_new` (`id`, `organizationId`, `operatingUnitId`, `code`, `name`, `nameAr`, `description`, `descriptionAr`, `parentId`, `level`, `managerId`, `projectId`, `grantId`, `isActive`, `sortOrder`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `deletedAt`, `deletedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, code, name, nameAr, description, descriptionAr, CAST(parentId AS int(11)) as parentId, CAST(level AS int(11)) as level, CAST(managerId AS int(11)) as managerId, CAST(projectId AS int(11)) as projectId, CAST(grantId AS int(11)) as grantId, CAST(isActive AS tinyint(1)) as isActive, CAST(sortOrder AS int(11)) as sortOrder, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy, deletedAt, CAST(deletedBy AS int(11)) as deletedBy
FROM `cost_centers`;

-- Migrate cost_pool_transactions
INSERT INTO `cost_pool_transactions_new` (`id`, `organizationId`, `costPoolId`, `transactionDate`, `amount`, `description`, `descriptionAr`, `sourceModule`, `sourceDocumentId`, `sourceDocumentType`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(costPoolId AS int(11)) as costPoolId, transactionDate, CAST(amount AS decimal(15,2)) as amount, description, descriptionAr, sourceModule, CAST(sourceDocumentId AS int(11)) as sourceDocumentId, sourceDocumentType, createdAt, updatedAt, createdBy, updatedBy
FROM `cost_pool_transactions`;

-- Migrate cost_pools
INSERT INTO `cost_pools_new` (`id`, `organizationId`, `operatingUnitId`, `poolCode`, `poolName`, `poolNameAr`, `description`, `descriptionAr`, `poolType`, `glAccountId`, `isActive`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `deletedAt`, `deletedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, poolCode, poolName, poolNameAr, description, descriptionAr, poolType, CAST(glAccountId AS int(11)) as glAccountId, CAST(isActive AS tinyint(1)) as isActive, createdAt, updatedAt, createdBy, updatedBy, deletedAt, deletedBy
FROM `cost_pools`;

-- Migrate css_activities
INSERT INTO `css_activities_new` (`id`, `cssId`, `projectId`, `organizationId`, `activityType`, `activityDate`, `facilitatorId`, `facilitatorName`, `participantsCount`, `maleCount`, `femaleCount`, `notes`, `linkedCaseId`, `linkedIndicatorId`, `createdAt`, `updatedAt`, `createdBy`, `isDeleted`)
SELECT CAST(id AS int(11)) as id, CAST(cssId AS int(11)) as cssId, CAST(projectId AS int(11)) as projectId, CAST(organizationId AS int(11)) as organizationId, activityType, activityDate, CAST(facilitatorId AS int(11)) as facilitatorId, facilitatorName, CAST(participantsCount AS int(11)) as participantsCount, CAST(maleCount AS int(11)) as maleCount, CAST(femaleCount AS int(11)) as femaleCount, notes, CAST(linkedCaseId AS int(11)) as linkedCaseId, CAST(linkedIndicatorId AS int(11)) as linkedIndicatorId, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(isDeleted AS tinyint(1)) as isDeleted
FROM `css_activities`;

-- Migrate donor_budget_mapping
INSERT INTO `donor_budget_mapping_new` (`id`, `organizationId`, `internalCategoryId`, `internalCategoryCode`, `internalCategoryName`, `donorId`, `donorName`, `donorCategoryCode`, `donorCategoryName`, `donorCategoryNameAr`, `mappingRules`, `donorReportingLevel`, `donorSortOrder`, `isActive`, `notes`, `notesAr`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(internalCategoryId AS int(11)) as internalCategoryId, internalCategoryCode, internalCategoryName, CAST(donorId AS int(11)) as donorId, donorName, donorCategoryCode, donorCategoryName, donorCategoryNameAr, mappingRules, CAST(donorReportingLevel AS int(11)) as donorReportingLevel, CAST(donorSortOrder AS int(11)) as donorSortOrder, CAST(isActive AS tinyint(1)) as isActive, notes, notesAr, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy
FROM `donor_budget_mapping`;

-- Migrate donor_communications
INSERT INTO `donor_communications_new` (`id`, `organizationId`, `operatingUnitId`, `donorId`, `date`, `channel`, `subject`, `subjectAr`, `summary`, `summaryAr`, `participants`, `contactPerson`, `nextActionDate`, `nextActionDescription`, `attachments`, `status`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `deletedAt`, `deletedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(donorId AS int(11)) as donorId, date, channel, subject, subjectAr, summary, summaryAr, participants, contactPerson, nextActionDate, nextActionDescription, attachments, status, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy, deletedAt, CAST(deletedBy AS int(11)) as deletedBy
FROM `donor_communications`;

-- Migrate donor_projects
INSERT INTO `donor_projects_new` (`id`, `organizationId`, `operatingUnitId`, `donorId`, `projectId`, `relationshipType`, `status`, `fundingAmount`, `currency`, `fundingPercentage`, `startDate`, `endDate`, `notes`, `notesAr`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `deletedAt`, `deletedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(donorId AS int(11)) as donorId, CAST(projectId AS int(11)) as projectId, relationshipType, status, CAST(fundingAmount AS decimal(15,2)) as fundingAmount, currency, CAST(fundingPercentage AS decimal(5,2)) as fundingPercentage, startDate, endDate, notes, notesAr, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy, deletedAt, CAST(deletedBy AS int(11)) as deletedBy
FROM `donor_projects`;

-- Migrate donor_reports
INSERT INTO `donor_reports_new` (`id`, `organizationId`, `operatingUnitId`, `donorId`, `projectId`, `grantId`, `reportType`, `title`, `titleAr`, `periodStart`, `periodEnd`, `parametersJSON`, `generatedByUserId`, `generatedAt`, `status`, `fileUrl`, `pdfUrl`, `excelUrl`, `documentId`, `reportDataJSON`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `deletedAt`, `deletedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(donorId AS int(11)) as donorId, CAST(projectId AS int(11)) as projectId, CAST(grantId AS int(11)) as grantId, reportType, title, titleAr, periodStart, periodEnd, parametersJSON, CAST(generatedByUserId AS int(11)) as generatedByUserId, generatedAt, status, fileUrl, pdfUrl, excelUrl, CAST(documentId AS int(11)) as documentId, reportDataJSON, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy, deletedAt, CAST(deletedBy AS int(11)) as deletedBy
FROM `donor_reports`;

-- Migrate donors
INSERT INTO `donors_new` (`id`, `organizationId`, `operatingUnitId`, `code`, `name`, `nameAr`, `type`, `category`, `contactPersonName`, `contactPersonTitle`, `email`, `phone`, `website`, `address`, `city`, `country`, `postalCode`, `notes`, `notesAr`, `logoUrl`, `isActive`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `deletedAt`, `deletedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, code, name, nameAr, type, category, contactPersonName, contactPersonTitle, email, phone, website, address, city, country, postalCode, notes, notesAr, logoUrl, CAST(isActive AS tinyint(1)) as isActive, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy, deletedAt, CAST(deletedBy AS int(11)) as deletedBy
FROM `donors`;

-- Migrate drivers
INSERT INTO `drivers_new` (`id`, `driverCode`, `firstName`, `lastName`, `firstNameAr`, `lastNameAr`, `fullName`, `fullNameAr`, `staffId`, `licenseNumber`, `licenseType`, `licenseExpiry`, `licenseExpiryDate`, `licenseIssuingCountry`, `phone`, `email`, `status`, `photoUrl`, `notes`, `operatingUnitId`, `employeeId`, `organizationId`, `isDeleted`, `deletedAt`, `deletedBy`, `createdBy`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, driverCode, firstName, lastName, firstNameAr, lastNameAr, fullName, fullNameAr, CAST(staffId AS int(11)) as staffId, licenseNumber, licenseType, licenseExpiry, licenseExpiryDate, licenseIssuingCountry, phone, email, status, photoUrl, notes, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(employeeId AS int(11)) as employeeId, CAST(organizationId AS int(11)) as organizationId, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, CAST(createdBy AS int(11)) as createdBy, createdAt, updatedAt
FROM `drivers`;

-- Migrate email_provider_settings
INSERT INTO `email_provider_settings_new` (`id`, `organizationId`, `providerType`, `tenantId`, `clientId`, `authType`, `secretRef`, `certificateRef`, `senderMode`, `smtpHost`, `smtpPort`, `smtpUsername`, `smtpPassword`, `smtpEncryption`, `fromEmail`, `fromName`, `replyToEmail`, `defaultCc`, `defaultBcc`, `allowedDomains`, `isConnected`, `lastSuccessfulSend`, `lastError`, `lastTestedAt`, `isActive`, `createdBy`, `updatedBy`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, providerType, tenantId, clientId, authType, secretRef, certificateRef, senderMode, smtpHost, CAST(smtpPort AS int(11)) as smtpPort, smtpUsername, smtpPassword, smtpEncryption, fromEmail, fromName, replyToEmail, defaultCc, defaultBcc, allowedDomains, CAST(isConnected AS tinyint(1)) as isConnected, lastSuccessfulSend, lastError, lastTestedAt, CAST(isActive AS tinyint(1)) as isActive, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy, createdAt, updatedAt
FROM `email_provider_settings`;

-- Migrate email_templates
INSERT INTO `email_templates_new` (`id`, `organizationId`, `templateKey`, `name`, `nameAr`, `subject`, `subjectAr`, `bodyHtml`, `bodyHtmlAr`, `isActive`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, templateKey, name, nameAr, subject, subjectAr, bodyHtml, bodyHtmlAr, CAST(isActive AS tinyint(1)) as isActive, createdAt, updatedAt
FROM `email_templates`;

-- Migrate expenditures
INSERT INTO `expenditures_new` (`id`, `organizationId`, `operatingUnitId`, `expenditureNumber`, `expenditureDate`, `vendorId`, `vendorName`, `vendorNameAr`, `expenditureType`, `category`, `description`, `descriptionAr`, `amount`, `currencyId`, `exchangeRateId`, `amountInBaseCurrency`, `projectId`, `grantId`, `budgetLineId`, `glAccountId`, `accountCode`, `journalEntryId`, `postingStatus`, `status`, `submittedBy`, `submittedAt`, `approvedBy`, `approvedAt`, `rejectionReason`, `paymentId`, `paidAt`, `attachments`, `version`, `parentId`, `revisionReason`, `isLatestVersion`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, expenditureNumber, expenditureDate, CAST(vendorId AS int(11)) as vendorId, vendorName, vendorNameAr, expenditureType, category, description, descriptionAr, CAST(amount AS decimal(15,2)) as amount, CAST(currencyId AS int(11)) as currencyId, CAST(exchangeRateId AS int(11)) as exchangeRateId, CAST(amountInBaseCurrency AS decimal(15,2)) as amountInBaseCurrency, CAST(projectId AS int(11)) as projectId, CAST(grantId AS int(11)) as grantId, CAST(budgetLineId AS int(11)) as budgetLineId, CAST(glAccountId AS int(11)) as glAccountId, accountCode, CAST(journalEntryId AS int(11)) as journalEntryId, postingStatus, status, CAST(submittedBy AS int(11)) as submittedBy, submittedAt, CAST(approvedBy AS int(11)) as approvedBy, approvedAt, rejectionReason, CAST(paymentId AS int(11)) as paymentId, paidAt, attachments, CAST(version AS int(11)) as version, CAST(parentId AS int(11)) as parentId, revisionReason, CAST(isLatestVersion AS tinyint(1)) as isLatestVersion, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, CAST(createdBy AS int(11)) as createdBy, updatedAt, CAST(updatedBy AS int(11)) as updatedBy
FROM `expenditures`;

-- Migrate expenses
INSERT INTO `expenses_new` (`id`, `budgetItemId`, `projectId`, `organizationId`, `operatingUnitId`, `expenseDate`, `amount`, `fiscalYear`, `month`, `reference`, `description`, `documentUrl`, `status`, `approvedBy`, `approvedAt`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `grantId`, `currencyId`, `exchangeRateId`, `amountInBaseCurrency`, `vendorId`, `payeeName`, `paymentMethod`, `bankAccountId`, `isReimbursable`, `glAccountId`, `journalEntryId`, `postingStatus`, `deletedAt`, `deletedBy`, `isDeleted`)
SELECT CAST(id AS int(11)) as id, CAST(budgetItemId AS int(11)) as budgetItemId, CAST(projectId AS int(11)) as projectId, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, expenseDate, CAST(amount AS decimal(15,2)) as amount, fiscalYear, CAST(month AS int(11)) as month, reference, description, documentUrl, status, CAST(approvedBy AS int(11)) as approvedBy, approvedAt, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy, CAST(grantId AS int(11)) as grantId, CAST(currencyId AS int(11)) as currencyId, CAST(exchangeRateId AS int(11)) as exchangeRateId, CAST(amountInBaseCurrency AS decimal(15,2)) as amountInBaseCurrency, CAST(vendorId AS int(11)) as vendorId, payeeName, paymentMethod, CAST(bankAccountId AS int(11)) as bankAccountId, CAST(isReimbursable AS tinyint(1)) as isReimbursable, CAST(glAccountId AS int(11)) as glAccountId, CAST(journalEntryId AS int(11)) as journalEntryId, postingStatus, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, CAST(isDeleted AS tinyint(1)) as isDeleted
FROM `expenses`;

-- Migrate finance_advances
INSERT INTO `finance_advances_new` (`id`, `organizationId`, `operatingUnitId`, `advanceNumber`, `employeeId`, `employeeName`, `employeeNameAr`, `department`, `advanceType`, `purpose`, `purposeAr`, `requestedAmount`, `approvedAmount`, `currency`, `requestDate`, `expectedSettlementDate`, `actualSettlementDate`, `status`, `approvedBy`, `approvedAt`, `rejectionReason`, `settledAmount`, `outstandingBalance`, `projectId`, `accountCode`, `notes`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `grantId`, `currencyId`, `exchangeRateId`, `amountInBaseCurrency`, `glAccountId`, `journalEntryId`, `postingStatus`, `disbursementDate`, `cashAccountId`, `bankAccountId`, `version`, `parentId`, `revisionReason`, `isLatestVersion`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, advanceNumber, CAST(employeeId AS int(11)) as employeeId, employeeName, employeeNameAr, department, advanceType, purpose, purposeAr, CAST(requestedAmount AS decimal(15,2)) as requestedAmount, CAST(approvedAmount AS decimal(15,2)) as approvedAmount, currency, requestDate, expectedSettlementDate, actualSettlementDate, status, CAST(approvedBy AS int(11)) as approvedBy, approvedAt, rejectionReason, CAST(settledAmount AS decimal(15,2)) as settledAmount, CAST(outstandingBalance AS decimal(15,2)) as outstandingBalance, CAST(projectId AS int(11)) as projectId, accountCode, notes, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, CAST(createdBy AS int(11)) as createdBy, updatedAt, CAST(updatedBy AS int(11)) as updatedBy, CAST(grantId AS int(11)) as grantId, CAST(currencyId AS int(11)) as currencyId, CAST(exchangeRateId AS int(11)) as exchangeRateId, CAST(amountInBaseCurrency AS decimal(15,2)) as amountInBaseCurrency, CAST(glAccountId AS int(11)) as glAccountId, CAST(journalEntryId AS int(11)) as journalEntryId, postingStatus, disbursementDate, CAST(cashAccountId AS int(11)) as cashAccountId, CAST(bankAccountId AS int(11)) as bankAccountId, CAST(version AS int(11)) as version, CAST(parentId AS int(11)) as parentId, revisionReason, CAST(isLatestVersion AS tinyint(1)) as isLatestVersion
FROM `finance_advances`;

-- Migrate finance_approval_thresholds
INSERT INTO `finance_approval_thresholds_new` (`id`, `name`, `nameAr`, `category`, `minAmount`, `maxAmount`, `currency`, `approverRole`, `approverUserId`, `requiresMultipleApprovers`, `approverCount`, `sequentialApproval`, `autoApproveBelow`, `isActive`, `notes`, `organizationId`, `operatingUnitId`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `appliesToModule`, `appliesToTransactionType`, `currencyId`, `isAmountInBaseCurrency`, `effectiveFrom`, `effectiveTo`)
SELECT CAST(id AS int(11)) as id, name, nameAr, category, CAST(minAmount AS decimal(15,2)) as minAmount, CAST(maxAmount AS decimal(15,2)) as maxAmount, currency, approverRole, CAST(approverUserId AS int(11)) as approverUserId, CAST(requiresMultipleApprovers AS tinyint(1)) as requiresMultipleApprovers, CAST(approverCount AS int(11)) as approverCount, CAST(sequentialApproval AS tinyint(1)) as sequentialApproval, CAST(autoApproveBelow AS decimal(15,2)) as autoApproveBelow, CAST(isActive AS tinyint(1)) as isActive, notes, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, appliesToModule, appliesToTransactionType, CAST(currencyId AS int(11)) as currencyId, CAST(isAmountInBaseCurrency AS tinyint(1)) as isAmountInBaseCurrency, effectiveFrom, effectiveTo
FROM `finance_approval_thresholds`;

-- Migrate finance_asset_categories
INSERT INTO `finance_asset_categories_new` (`id`, `code`, `name`, `nameAr`, `description`, `parentId`, `depreciationRate`, `defaultUsefulLife`, `organizationId`, `operatingUnitId`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `assetAccountId`, `accumulatedDepAccountId`, `depreciationExpenseAccountId`, `defaultDepreciationMethod`)
SELECT CAST(id AS int(11)) as id, code, name, nameAr, description, CAST(parentId AS int(11)) as parentId, CAST(depreciationRate AS decimal(5,2)) as depreciationRate, CAST(defaultUsefulLife AS int(11)) as defaultUsefulLife, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(assetAccountId AS int(11)) as assetAccountId, CAST(accumulatedDepAccountId AS int(11)) as accumulatedDepAccountId, CAST(depreciationExpenseAccountId AS int(11)) as depreciationExpenseAccountId, defaultDepreciationMethod
FROM `finance_asset_categories`;

-- Migrate finance_asset_disposals
INSERT INTO `finance_asset_disposals_new` (`id`, `disposalCode`, `assetId`, `disposalType`, `proposedDate`, `actualDate`, `bookValue`, `proposedValue`, `actualValue`, `currency`, `reason`, `status`, `buyerInfo`, `recipientInfo`, `approvedBy`, `approvalDate`, `rejectionReason`, `notes`, `attachments`, `organizationId`, `operatingUnitId`, `isDeleted`, `deletedAt`, `deletedBy`, `createdBy`, `createdAt`, `updatedAt`, `disposalCommitteeMembers`, `disposalDocumentId`, `journalEntryId`, `buyerVendorId`, `paymentReference`)
SELECT CAST(id AS int(11)) as id, disposalCode, CAST(assetId AS int(11)) as assetId, disposalType, proposedDate, actualDate, CAST(bookValue AS decimal(15,2)) as bookValue, CAST(proposedValue AS decimal(15,2)) as proposedValue, CAST(actualValue AS decimal(15,2)) as actualValue, currency, reason, status, buyerInfo, recipientInfo, CAST(approvedBy AS int(11)) as approvedBy, approvalDate, rejectionReason, notes, attachments, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, CAST(createdBy AS int(11)) as createdBy, createdAt, updatedAt, disposalCommitteeMembers, CAST(disposalDocumentId AS int(11)) as disposalDocumentId, CAST(journalEntryId AS int(11)) as journalEntryId, CAST(buyerVendorId AS int(11)) as buyerVendorId, paymentReference
FROM `finance_asset_disposals`;

-- Migrate finance_asset_maintenance
INSERT INTO `finance_asset_maintenance_new` (`id`, `assetId`, `maintenanceType`, `description`, `cost`, `currency`, `performedBy`, `vendorName`, `performedDate`, `nextDueDate`, `notes`, `attachments`, `organizationId`, `operatingUnitId`, `isDeleted`, `deletedAt`, `deletedBy`, `createdBy`, `createdAt`, `updatedAt`, `vendorId`, `workOrderNumber`, `documentId`, `expenseId`)
SELECT CAST(id AS int(11)) as id, CAST(assetId AS int(11)) as assetId, maintenanceType, description, CAST(cost AS decimal(15,2)) as cost, currency, performedBy, vendorName, performedDate, nextDueDate, notes, attachments, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, CAST(createdBy AS int(11)) as createdBy, createdAt, updatedAt, CAST(vendorId AS int(11)) as vendorId, workOrderNumber, CAST(documentId AS int(11)) as documentId, CAST(expenseId AS int(11)) as expenseId
FROM `finance_asset_maintenance`;

-- Migrate finance_asset_transfers
INSERT INTO `finance_asset_transfers_new` (`id`, `transferCode`, `assetId`, `fromLocation`, `toLocation`, `fromAssignee`, `toAssignee`, `fromAssigneeUserId`, `toAssigneeUserId`, `transferDate`, `reason`, `status`, `approvedBy`, `approvalDate`, `rejectionReason`, `notes`, `organizationId`, `operatingUnitId`, `isDeleted`, `deletedAt`, `deletedBy`, `createdBy`, `createdAt`, `updatedAt`, `fromOperatingUnitId`, `toOperatingUnitId`, `journalEntryId`, `attachments`)
SELECT CAST(id AS int(11)) as id, transferCode, CAST(assetId AS int(11)) as assetId, fromLocation, toLocation, fromAssignee, toAssignee, CAST(fromAssigneeUserId AS int(11)) as fromAssigneeUserId, CAST(toAssigneeUserId AS int(11)) as toAssigneeUserId, transferDate, reason, status, CAST(approvedBy AS int(11)) as approvedBy, approvalDate, rejectionReason, notes, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, CAST(createdBy AS int(11)) as createdBy, createdAt, updatedAt, CAST(fromOperatingUnitId AS int(11)) as fromOperatingUnitId, CAST(toOperatingUnitId AS int(11)) as toOperatingUnitId, CAST(journalEntryId AS int(11)) as journalEntryId, attachments
FROM `finance_asset_transfers`;

-- Migrate finance_assets
INSERT INTO `finance_assets_new` (`id`, `assetCode`, `name`, `nameAr`, `description`, `categoryId`, `subcategory`, `acquisitionDate`, `acquisitionCost`, `currency`, `depreciationMethod`, `usefulLifeYears`, `salvageValue`, `accumulatedDepreciation`, `currentValue`, `status`, `condition`, `location`, `assignedTo`, `assignedToUserId`, `donorId`, `donorName`, `grantId`, `grantCode`, `projectId`, `serialNumber`, `manufacturer`, `model`, `warrantyExpiry`, `lastMaintenanceDate`, `nextMaintenanceDate`, `disposalDate`, `disposalMethod`, `disposalValue`, `disposalReason`, `disposalApprovedBy`, `insurancePolicy`, `insuranceExpiry`, `organizationId`, `operatingUnitId`, `isDeleted`, `deletedAt`, `deletedBy`, `createdBy`, `createdAt`, `updatedAt`, `assetTag`, `purchaseOrderId`, `invoiceId`, `supplierId`, `assetGlAccountCode`, `depreciationExpenseGlAccountCode`, `accumulatedDepreciationGlAccountCode`)
SELECT CAST(id AS int(11)) as id, assetCode, name, nameAr, description, CAST(categoryId AS int(11)) as categoryId, subcategory, acquisitionDate, CAST(acquisitionCost AS decimal(15,2)) as acquisitionCost, currency, depreciationMethod, CAST(usefulLifeYears AS int(11)) as usefulLifeYears, CAST(salvageValue AS decimal(15,2)) as salvageValue, CAST(accumulatedDepreciation AS decimal(15,2)) as accumulatedDepreciation, CAST(currentValue AS decimal(15,2)) as currentValue, CAST(status AS enum('active','in_maintenance','disposed','lost','transferred','pending_disposal')) as status, condition, location, assignedTo, CAST(assignedToUserId AS int(11)) as assignedToUserId, CAST(donorId AS int(11)) as donorId, donorName, CAST(grantId AS int(11)) as grantId, grantCode, CAST(projectId AS int(11)) as projectId, serialNumber, manufacturer, model, warrantyExpiry, lastMaintenanceDate, nextMaintenanceDate, disposalDate, disposalMethod, CAST(disposalValue AS decimal(15,2)) as disposalValue, disposalReason, CAST(disposalApprovedBy AS int(11)) as disposalApprovedBy, insurancePolicy, insuranceExpiry, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, CAST(createdBy AS int(11)) as createdBy, createdAt, updatedAt, assetTag, CAST(purchaseOrderId AS int(11)) as purchaseOrderId, CAST(invoiceId AS int(11)) as invoiceId, CAST(supplierId AS int(11)) as supplierId, assetGlAccountCode, depreciationExpenseGlAccountCode, accumulatedDepreciationGlAccountCode
FROM `finance_assets`;

-- Migrate finance_bank_accounts
INSERT INTO `finance_bank_accounts_new` (`id`, `organizationId`, `operatingUnitId`, `accountNumber`, `accountName`, `accountNameAr`, `bankName`, `bankNameAr`, `bankCode`, `branchName`, `branchCode`, `accountType`, `currency`, `openingBalance`, `currentBalance`, `lastReconciliationDate`, `lastReconciliationBalance`, `isActive`, `isPrimary`, `glAccountCode`, `contactPerson`, `contactPhone`, `notes`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `iban`, `swiftCode`, `openingBalanceDate`, `glAccountId`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, accountNumber, accountName, accountNameAr, bankName, bankNameAr, bankCode, branchName, branchCode, accountType, currency, CAST(openingBalance AS decimal(15,2)) as openingBalance, CAST(currentBalance AS decimal(15,2)) as currentBalance, lastReconciliationDate, CAST(lastReconciliationBalance AS decimal(15,2)) as lastReconciliationBalance, CAST(isActive AS tinyint(1)) as isActive, CAST(isPrimary AS tinyint(1)) as isPrimary, glAccountCode, contactPerson, contactPhone, notes, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, CAST(createdBy AS int(11)) as createdBy, updatedAt, CAST(updatedBy AS int(11)) as updatedBy, iban, swiftCode, openingBalanceDate, CAST(glAccountId AS int(11)) as glAccountId
FROM `finance_bank_accounts`;

-- Migrate finance_budget_categories
INSERT INTO `finance_budget_categories_new` (`id`, `code`, `name`, `nameAr`, `description`, `parentId`, `accountId`, `accountCode`, `categoryType`, `isActive`, `sortOrder`, `organizationId`, `operatingUnitId`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `level`, `donorCategoryCode`, `isEligibleCost`, `maxCapPercent`, `requiresSupportingDocs`, `isDirectCost`)
SELECT CAST(id AS int(11)) as id, code, name, nameAr, description, CAST(parentId AS int(11)) as parentId, CAST(accountId AS int(11)) as accountId, accountCode, categoryType, CAST(isActive AS tinyint(1)) as isActive, CAST(sortOrder AS int(11)) as sortOrder, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(level AS int(11)) as level, donorCategoryCode, CAST(isEligibleCost AS tinyint(1)) as isEligibleCost, CAST(maxCapPercent AS decimal(5,2)) as maxCapPercent, CAST(requiresSupportingDocs AS tinyint(1)) as requiresSupportingDocs, CAST(isDirectCost AS tinyint(1)) as isDirectCost
FROM `finance_budget_categories`;

-- Migrate finance_cash_transactions
INSERT INTO `finance_cash_transactions_new` (`id`, `organizationId`, `operatingUnitId`, `transactionNumber`, `bankAccountId`, `transactionType`, `transactionDate`, `valueDate`, `amount`, `currency`, `exchangeRate`, `amountInBaseCurrency`, `balanceAfter`, `transferToAccountId`, `transferFromAccountId`, `referenceNumber`, `payee`, `payer`, `description`, `descriptionAr`, `category`, `accountCode`, `projectId`, `isReconciled`, `reconciledAt`, `reconciledBy`, `status`, `approvedBy`, `approvedAt`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `grantId`, `currencyId`, `exchangeRateId`, `glAccountId`, `journalEntryId`, `postingStatus`, `counterpartyType`, `counterpartyId`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, transactionNumber, CAST(bankAccountId AS int(11)) as bankAccountId, CAST(transactionType AS enum('deposit','withdrawal','transfer_in','transfer_out','bank_charge','interest','adjustment')) as transactionType, transactionDate, valueDate, CAST(amount AS decimal(15,2)) as amount, currency, CAST(exchangeRate AS decimal(10,6)) as exchangeRate, CAST(amountInBaseCurrency AS decimal(15,2)) as amountInBaseCurrency, CAST(balanceAfter AS decimal(15,2)) as balanceAfter, CAST(transferToAccountId AS int(11)) as transferToAccountId, CAST(transferFromAccountId AS int(11)) as transferFromAccountId, referenceNumber, payee, payer, description, descriptionAr, category, accountCode, CAST(projectId AS int(11)) as projectId, CAST(isReconciled AS tinyint(1)) as isReconciled, reconciledAt, CAST(reconciledBy AS int(11)) as reconciledBy, status, CAST(approvedBy AS int(11)) as approvedBy, approvedAt, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, CAST(createdBy AS int(11)) as createdBy, updatedAt, CAST(updatedBy AS int(11)) as updatedBy, CAST(grantId AS int(11)) as grantId, CAST(currencyId AS int(11)) as currencyId, CAST(exchangeRateId AS int(11)) as exchangeRateId, CAST(glAccountId AS int(11)) as glAccountId, CAST(journalEntryId AS int(11)) as journalEntryId, postingStatus, counterpartyType, CAST(counterpartyId AS int(11)) as counterpartyId
FROM `finance_cash_transactions`;

-- Migrate finance_currencies
INSERT INTO `finance_currencies_new` (`id`, `code`, `name`, `nameAr`, `symbol`, `exchangeRateToUSD`, `isBaseCurrency`, `isActive`, `decimalPlaces`, `organizationId`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, code, name, nameAr, symbol, CAST(exchangeRateToUSD AS decimal(15,6)) as exchangeRateToUSD, CAST(isBaseCurrency AS tinyint(1)) as isBaseCurrency, CAST(isActive AS tinyint(1)) as isActive, CAST(decimalPlaces AS int(11)) as decimalPlaces, CAST(organizationId AS int(11)) as organizationId, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt
FROM `finance_currencies`;

-- Migrate finance_exchange_rates
INSERT INTO `finance_exchange_rates_new` (`id`, `fromCurrencyId`, `fromCurrencyCode`, `toCurrencyId`, `toCurrencyCode`, `rate`, `effectiveDate`, `expiryDate`, `source`, `notes`, `organizationId`, `isDeleted`, `deletedAt`, `deletedBy`, `createdBy`, `createdAt`, `updatedAt`, `rateType`, `enteredBy`, `approvedBy`, `approvedAt`)
SELECT CAST(id AS int(11)) as id, CAST(fromCurrencyId AS int(11)) as fromCurrencyId, fromCurrencyCode, CAST(toCurrencyId AS int(11)) as toCurrencyId, toCurrencyCode, CAST(rate AS decimal(15,6)) as rate, effectiveDate, expiryDate, source, notes, CAST(organizationId AS int(11)) as organizationId, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, CAST(createdBy AS int(11)) as createdBy, createdAt, updatedAt, CAST(rateType AS enum('official','market','bank','internal')) as rateType, CAST(enteredBy AS int(11)) as enteredBy, CAST(approvedBy AS int(11)) as approvedBy, approvedAt
FROM `finance_exchange_rates`;

-- Migrate finance_fiscal_years
INSERT INTO `finance_fiscal_years_new` (`id`, `name`, `nameAr`, `code`, `startDate`, `endDate`, `status`, `isCurrent`, `closedAt`, `closedBy`, `notes`, `organizationId`, `operatingUnitId`, `isDeleted`, `deletedAt`, `deletedBy`, `createdBy`, `createdAt`, `updatedAt`, `lockStatus`, `lockedAt`, `lockedBy`)
SELECT CAST(id AS int(11)) as id, name, nameAr, code, startDate, endDate, status, CAST(isCurrent AS tinyint(1)) as isCurrent, closedAt, CAST(closedBy AS int(11)) as closedBy, notes, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, CAST(createdBy AS int(11)) as createdBy, createdAt, updatedAt, lockStatus, lockedAt, CAST(lockedBy AS int(11)) as lockedBy
FROM `finance_fiscal_years`;

-- Migrate finance_fund_balances
INSERT INTO `finance_fund_balances_new` (`id`, `organizationId`, `operatingUnitId`, `fundCode`, `fundName`, `fundNameAr`, `fundType`, `donorId`, `donorName`, `grantNumber`, `currency`, `totalBudget`, `totalReceived`, `totalExpended`, `currentBalance`, `startDate`, `endDate`, `bankAccountId`, `isActive`, `notes`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `projectId`, `baseCurrencyId`, `amountInBaseCurrency`, `status`, `restrictedType`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, fundCode, fundName, fundNameAr, fundType, CAST(donorId AS int(11)) as donorId, donorName, grantNumber, currency, CAST(totalBudget AS decimal(15,2)) as totalBudget, CAST(totalReceived AS decimal(15,2)) as totalReceived, CAST(totalExpended AS decimal(15,2)) as totalExpended, CAST(currentBalance AS decimal(15,2)) as currentBalance, startDate, endDate, CAST(bankAccountId AS int(11)) as bankAccountId, CAST(isActive AS tinyint(1)) as isActive, notes, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, CAST(createdBy AS int(11)) as createdBy, updatedAt, CAST(updatedBy AS int(11)) as updatedBy, CAST(projectId AS int(11)) as projectId, CAST(baseCurrencyId AS int(11)) as baseCurrencyId, CAST(amountInBaseCurrency AS decimal(15,2)) as amountInBaseCurrency, status, restrictedType
FROM `finance_fund_balances`;

-- Migrate finance_permissions
INSERT INTO `finance_permissions_new` (`id`, `code`, `name`, `nameAr`, `module`, `action`, `description`, `isActive`, `organizationId`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, code, name, nameAr, module, action, description, CAST(isActive AS tinyint(1)) as isActive, CAST(organizationId AS int(11)) as organizationId, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt
FROM `finance_permissions`;

-- Migrate finance_role_permissions
INSERT INTO `finance_role_permissions_new` (`id`, `roleId`, `permissionId`, `organizationId`, `isDeleted`, `deletedAt`, `deletedBy`, `createdBy`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(roleId AS int(11)) as roleId, CAST(permissionId AS int(11)) as permissionId, CAST(organizationId AS int(11)) as organizationId, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, CAST(createdBy AS int(11)) as createdBy, createdAt, updatedAt
FROM `finance_role_permissions`;

-- Migrate finance_roles
INSERT INTO `finance_roles_new` (`id`, `code`, `name`, `nameAr`, `description`, `level`, `isSystemRole`, `isActive`, `organizationId`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, code, name, nameAr, description, CAST(level AS int(11)) as level, CAST(isSystemRole AS tinyint(1)) as isSystemRole, CAST(isActive AS tinyint(1)) as isActive, CAST(organizationId AS int(11)) as organizationId, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt
FROM `finance_roles`;

-- Migrate finance_settlements
INSERT INTO `finance_settlements_new` (`id`, `organizationId`, `operatingUnitId`, `settlementNumber`, `advanceId`, `settlementDate`, `settledAmount`, `currency`, `receiptNumber`, `description`, `descriptionAr`, `expenseCategory`, `accountCode`, `status`, `approvedBy`, `approvedAt`, `refundAmount`, `refundDate`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `projectId`, `grantId`, `currencyId`, `exchangeRateId`, `amountInBaseCurrency`, `glAccountId`, `journalEntryId`, `postingStatus`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, settlementNumber, CAST(advanceId AS int(11)) as advanceId, settlementDate, CAST(settledAmount AS decimal(15,2)) as settledAmount, currency, receiptNumber, description, descriptionAr, expenseCategory, accountCode, status, CAST(approvedBy AS int(11)) as approvedBy, approvedAt, CAST(refundAmount AS decimal(15,2)) as refundAmount, refundDate, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, CAST(createdBy AS int(11)) as createdBy, updatedAt, CAST(updatedBy AS int(11)) as updatedBy, CAST(projectId AS int(11)) as projectId, CAST(grantId AS int(11)) as grantId, CAST(currencyId AS int(11)) as currencyId, CAST(exchangeRateId AS int(11)) as exchangeRateId, CAST(amountInBaseCurrency AS decimal(15,2)) as amountInBaseCurrency, CAST(glAccountId AS int(11)) as glAccountId, CAST(journalEntryId AS int(11)) as journalEntryId, postingStatus
FROM `finance_settlements`;

-- Migrate finance_user_roles
INSERT INTO `finance_user_roles_new` (`id`, `userId`, `roleId`, `effectiveFrom`, `effectiveTo`, `isActive`, `organizationId`, `isDeleted`, `deletedAt`, `deletedBy`, `createdBy`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(userId AS int(11)) as userId, CAST(roleId AS int(11)) as roleId, effectiveFrom, effectiveTo, CAST(isActive AS tinyint(1)) as isActive, CAST(organizationId AS int(11)) as organizationId, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, CAST(createdBy AS int(11)) as createdBy, createdAt, updatedAt
FROM `finance_user_roles`;

-- Migrate fiscal_periods
INSERT INTO `fiscal_periods_new` (`id`, `organizationId`, `operatingUnitId`, `fiscalYearId`, `periodNumber`, `periodName`, `periodNameAr`, `periodType`, `startDate`, `endDate`, `status`, `closedAt`, `closedBy`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(fiscalYearId AS int(11)) as fiscalYearId, CAST(periodNumber AS int(11)) as periodNumber, periodName, periodNameAr, periodType, startDate, endDate, status, closedAt, CAST(closedBy AS int(11)) as closedBy, createdAt, updatedAt
FROM `fiscal_periods`;

-- Migrate forecast_audit_log
INSERT INTO `forecast_audit_log_new` (`id`, `forecastId`, `userId`, `action`, `fieldChanged`, `beforeValue`, `afterValue`, `organizationId`, `operatingUnitId`, `timestamp`)
SELECT CAST(id AS int(11)) as id, CAST(forecastId AS int(11)) as forecastId, CAST(userId AS int(11)) as userId, action, fieldChanged, beforeValue, afterValue, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, timestamp
FROM `forecast_audit_log`;

-- Migrate forecast_plan
INSERT INTO `forecast_plan_new` (`id`, `budgetItemId`, `projectId`, `organizationId`, `operatingUnitId`, `fiscalYear`, `yearNumber`, `m1`, `m2`, `m3`, `m4`, `m5`, `m6`, `m7`, `m8`, `m9`, `m10`, `m11`, `m12`, `totalForecast`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `isDeleted`, `deletedAt`, `deletedBy`)
SELECT CAST(id AS int(11)) as id, CAST(budgetItemId AS int(11)) as budgetItemId, CAST(projectId AS int(11)) as projectId, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, fiscalYear, CAST(yearNumber AS int(11)) as yearNumber, CAST(m1 AS decimal(15,2)) as m1, CAST(m2 AS decimal(15,2)) as m2, CAST(m3 AS decimal(15,2)) as m3, CAST(m4 AS decimal(15,2)) as m4, CAST(m5 AS decimal(15,2)) as m5, CAST(m6 AS decimal(15,2)) as m6, CAST(m7 AS decimal(15,2)) as m7, CAST(m8 AS decimal(15,2)) as m8, CAST(m9 AS decimal(15,2)) as m9, CAST(m10 AS decimal(15,2)) as m10, CAST(m11 AS decimal(15,2)) as m11, CAST(m12 AS decimal(15,2)) as m12, CAST(totalForecast AS decimal(15,2)) as totalForecast, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy
FROM `forecast_plan`;

-- Migrate fuel_logs
INSERT INTO `fuel_logs_new` (`id`, `organizationId`, `operatingUnitId`, `vehicleId`, `driverId`, `fuelLogNumber`, `fuelDate`, `fuelType`, `quantity`, `unitPrice`, `totalCost`, `currency`, `mileageAtFill`, `station`, `receiptNumber`, `projectCode`, `remarks`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(vehicleId AS int(11)) as vehicleId, CAST(driverId AS int(11)) as driverId, fuelLogNumber, fuelDate, fuelType, CAST(quantity AS decimal(8,2)) as quantity, CAST(unitPrice AS decimal(8,2)) as unitPrice, CAST(totalCost AS decimal(10,2)) as totalCost, currency, CAST(mileageAtFill AS decimal(10,2)) as mileageAtFill, station, receiptNumber, projectCode, remarks, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy
FROM `fuel_logs`;

-- Migrate gl_account_categories
INSERT INTO `gl_account_categories_new` (`id`, `organizationId`, `operatingUnitId`, `code`, `name`, `nameAr`, `parentId`, `level`, `accountType`, `normalBalance`, `isActive`, `sortOrder`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `deletedAt`, `deletedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, code, name, nameAr, CAST(parentId AS int(11)) as parentId, CAST(level AS int(11)) as level, accountType, normalBalance, CAST(isActive AS tinyint(1)) as isActive, CAST(sortOrder AS int(11)) as sortOrder, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy, deletedAt, CAST(deletedBy AS int(11)) as deletedBy
FROM `gl_account_categories`;

-- Migrate gl_accounts
INSERT INTO `gl_accounts_new` (`id`, `organizationId`, `operatingUnitId`, `categoryId`, `accountCode`, `name`, `nameAr`, `description`, `descriptionAr`, `accountType`, `normalBalance`, `parentAccountId`, `level`, `isControlAccount`, `isBankAccount`, `isCashAccount`, `isReceivable`, `isPayable`, `currencyId`, `openingBalance`, `currentBalance`, `isActive`, `isPostable`, `sortOrder`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `deletedAt`, `deletedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(categoryId AS int(11)) as categoryId, accountCode, name, nameAr, description, descriptionAr, accountType, normalBalance, CAST(parentAccountId AS int(11)) as parentAccountId, CAST(level AS int(11)) as level, CAST(isControlAccount AS tinyint(1)) as isControlAccount, CAST(isBankAccount AS tinyint(1)) as isBankAccount, CAST(isCashAccount AS tinyint(1)) as isCashAccount, CAST(isReceivable AS tinyint(1)) as isReceivable, CAST(isPayable AS tinyint(1)) as isPayable, CAST(currencyId AS int(11)) as currencyId, CAST(openingBalance AS decimal(15,2)) as openingBalance, CAST(currentBalance AS decimal(15,2)) as currentBalance, CAST(isActive AS tinyint(1)) as isActive, CAST(isPostable AS tinyint(1)) as isPostable, CAST(sortOrder AS int(11)) as sortOrder, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy, deletedAt, CAST(deletedBy AS int(11)) as deletedBy
FROM `gl_accounts`;

-- Migrate globalSettings
INSERT INTO `globalSettings_new` (`id`, `defaultLanguage`, `defaultTimezone`, `defaultCurrency`, `environmentLabel`, `updatedAt`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, defaultLanguage, defaultTimezone, defaultCurrency, environmentLabel, updatedAt, CAST(updatedBy AS int(11)) as updatedBy
FROM `globalSettings`;

-- Migrate goods_receipt_notes
INSERT INTO `goods_receipt_notes_new` (`id`, `organizationId`, `operatingUnitId`, `purchaseOrderId`, `supplierId`, `grnNumber`, `grnDate`, `deliveryNoteNumber`, `invoiceNumber`, `warehouse`, `warehouseAr`, `receivedBy`, `inspectedBy`, `totalReceived`, `totalAccepted`, `totalRejected`, `remarks`, `remarksAr`, `status`, `approvedBy`, `approvedAt`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(purchaseOrderId AS int(11)) as purchaseOrderId, CAST(supplierId AS int(11)) as supplierId, grnNumber, grnDate, deliveryNoteNumber, invoiceNumber, warehouse, warehouseAr, receivedBy, inspectedBy, CAST(totalReceived AS int(11)) as totalReceived, CAST(totalAccepted AS int(11)) as totalAccepted, CAST(totalRejected AS int(11)) as totalRejected, remarks, remarksAr, status, CAST(approvedBy AS int(11)) as approvedBy, approvedAt, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy
FROM `goods_receipt_notes`;

-- Migrate grant_documents
INSERT INTO `grant_documents_new` (`id`, `grantId`, `fileName`, `fileUrl`, `fileKey`, `fileSize`, `mimeType`, `category`, `status`, `description`, `uploadedAt`, `uploadedBy`, `isDeleted`, `deletedAt`, `deletedBy`)
SELECT CAST(id AS int(11)) as id, CAST(grantId AS int(11)) as grantId, fileName, fileUrl, fileKey, CAST(fileSize AS int(11)) as fileSize, mimeType, category, status, description, uploadedAt, CAST(uploadedBy AS int(11)) as uploadedBy, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy
FROM `grant_documents`;

-- Migrate grants
INSERT INTO `grants_new` (`id`, `organizationId`, `operatingUnitId`, `donorId`, `projectId`, `grantCode`, `title`, `titleAr`, `grantNumber`, `grantName`, `grantNameAr`, `donorName`, `donorReference`, `grantAmount`, `amount`, `totalBudget`, `currency`, `status`, `reportingStatus`, `submissionDate`, `approvalDate`, `startDate`, `endDate`, `description`, `descriptionAr`, `objectives`, `objectivesAr`, `proposalDocumentUrl`, `approvalDocumentUrl`, `sector`, `responsible`, `reportingFrequency`, `coFunding`, `coFunderName`, `createdBy`, `createdAt`, `updatedAt`, `updatedBy`, `isDeleted`, `deletedAt`, `deletedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(donorId AS int(11)) as donorId, CAST(projectId AS int(11)) as projectId, grantCode, title, titleAr, grantNumber, grantName, grantNameAr, donorName, donorReference, CAST(grantAmount AS decimal(15,2)) as grantAmount, CAST(amount AS decimal(15,2)) as amount, CAST(totalBudget AS decimal(15,2)) as totalBudget, currency, status, reportingStatus, submissionDate, approvalDate, startDate, endDate, description, descriptionAr, objectives, objectivesAr, proposalDocumentUrl, approvalDocumentUrl, sector, responsible, reportingFrequency, CAST(coFunding AS tinyint(1)) as coFunding, coFunderName, CAST(createdBy AS int(11)) as createdBy, createdAt, updatedAt, CAST(updatedBy AS int(11)) as updatedBy, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy
FROM `grants`;

-- Migrate grn_line_items
INSERT INTO `grn_line_items_new` (`id`, `grnId`, `poLineItemId`, `lineNumber`, `description`, `unit`, `orderedQty`, `receivedQty`, `acceptedQty`, `rejectedQty`, `rejectionReason`, `remarks`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(grnId AS int(11)) as grnId, CAST(poLineItemId AS int(11)) as poLineItemId, CAST(lineNumber AS int(11)) as lineNumber, description, unit, CAST(orderedQty AS decimal(10,2)) as orderedQty, CAST(receivedQty AS decimal(10,2)) as receivedQty, CAST(acceptedQty AS decimal(10,2)) as acceptedQty, CAST(rejectedQty AS decimal(10,2)) as rejectedQty, rejectionReason, remarks, createdAt, updatedAt
FROM `grn_line_items`;

-- Migrate hr_annual_plans
INSERT INTO `hr_annual_plans_new` (`id`, `organizationId`, `operatingUnitId`, `planYear`, `planName`, `existingWorkforce`, `plannedStaffing`, `recruitmentPlan`, `budgetEstimate`, `trainingPlan`, `hrRisks`, `totalPlannedPositions`, `existingStaff`, `newPositionsRequired`, `estimatedHrCost`, `status`, `preparedBy`, `preparedAt`, `reviewedBy`, `reviewedAt`, `approvedBy`, `approvedAt`, `notes`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(planYear AS int(11)) as planYear, planName, existingWorkforce, plannedStaffing, recruitmentPlan, budgetEstimate, trainingPlan, hrRisks, CAST(totalPlannedPositions AS int(11)) as totalPlannedPositions, CAST(existingStaff AS int(11)) as existingStaff, CAST(newPositionsRequired AS int(11)) as newPositionsRequired, CAST(estimatedHrCost AS decimal(15,2)) as estimatedHrCost, status, CAST(preparedBy AS int(11)) as preparedBy, preparedAt, CAST(reviewedBy AS int(11)) as reviewedBy, reviewedAt, CAST(approvedBy AS int(11)) as approvedBy, approvedAt, notes, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt
FROM `hr_annual_plans`;

-- Migrate hr_attendance_records
INSERT INTO `hr_attendance_records_new` (`id`, `organizationId`, `operatingUnitId`, `employeeId`, `date`, `checkIn`, `checkOut`, `status`, `workHours`, `overtimeHours`, `location`, `notes`, `periodLocked`, `lockedBy`, `lockedAt`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(employeeId AS int(11)) as employeeId, date, checkIn, checkOut, status, CAST(workHours AS decimal(5,2)) as workHours, CAST(overtimeHours AS decimal(5,2)) as overtimeHours, location, notes, CAST(periodLocked AS tinyint(1)) as periodLocked, CAST(lockedBy AS int(11)) as lockedBy, lockedAt, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt
FROM `hr_attendance_records`;

-- Migrate hr_documents
INSERT INTO `hr_documents_new` (`id`, `organizationId`, `operatingUnitId`, `employeeId`, `documentCode`, `documentName`, `documentNameAr`, `documentType`, `category`, `fileUrl`, `fileSize`, `mimeType`, `version`, `effectiveDate`, `expiryDate`, `description`, `tags`, `isPublic`, `accessRoles`, `status`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `uploadedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(employeeId AS int(11)) as employeeId, documentCode, documentName, documentNameAr, documentType, category, fileUrl, CAST(fileSize AS int(11)) as fileSize, mimeType, version, effectiveDate, expiryDate, description, tags, CAST(isPublic AS tinyint(1)) as isPublic, accessRoles, status, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(uploadedBy AS int(11)) as uploadedBy
FROM `hr_documents`;

-- Migrate hr_employees
INSERT INTO `hr_employees_new` (`id`, `organizationId`, `operatingUnitId`, `employeeCode`, `firstName`, `lastName`, `firstNameAr`, `lastNameAr`, `email`, `phone`, `dateOfBirth`, `gender`, `nationality`, `nationalId`, `passportNumber`, `employmentType`, `staffCategory`, `department`, `position`, `jobTitle`, `gradeLevel`, `reportingTo`, `hireDate`, `contractStartDate`, `contractEndDate`, `probationEndDate`, `terminationDate`, `status`, `address`, `city`, `country`, `emergencyContactName`, `emergencyContactPhone`, `emergencyContactRelation`, `bankName`, `bankAccountNumber`, `bankIban`, `photoUrl`, `notes`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, employeeCode, firstName, lastName, firstNameAr, lastNameAr, email, phone, dateOfBirth, gender, nationality, nationalId, passportNumber, CAST(employmentType AS enum('full_time','part_time','contract','consultant','intern')) as employmentType, CAST(staffCategory AS enum('national','international','expatriate')) as staffCategory, department, position, jobTitle, gradeLevel, CAST(reportingTo AS int(11)) as reportingTo, hireDate, contractStartDate, contractEndDate, probationEndDate, terminationDate, status, address, city, country, emergencyContactName, emergencyContactPhone, emergencyContactRelation, bankName, bankAccountNumber, bankIban, photoUrl, notes, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy
FROM `hr_employees`;

-- Migrate hr_leave_balances
INSERT INTO `hr_leave_balances_new` (`id`, `organizationId`, `employeeId`, `year`, `leaveType`, `entitlement`, `carriedOver`, `used`, `pending`, `remaining`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(employeeId AS int(11)) as employeeId, CAST(year AS int(11)) as year, leaveType, CAST(entitlement AS decimal(5,1)) as entitlement, CAST(carriedOver AS decimal(5,1)) as carriedOver, CAST(used AS decimal(5,1)) as used, CAST(pending AS decimal(5,1)) as pending, CAST(remaining AS decimal(5,1)) as remaining, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt
FROM `hr_leave_balances`;

-- Migrate hr_leave_requests
INSERT INTO `hr_leave_requests_new` (`id`, `organizationId`, `operatingUnitId`, `employeeId`, `leaveType`, `startDate`, `endDate`, `totalDays`, `reason`, `attachmentUrl`, `status`, `approvedBy`, `approvedAt`, `rejectionReason`, `balanceBefore`, `balanceAfter`, `notes`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(employeeId AS int(11)) as employeeId, leaveType, startDate, endDate, CAST(totalDays AS decimal(5,1)) as totalDays, reason, attachmentUrl, status, CAST(approvedBy AS int(11)) as approvedBy, approvedAt, rejectionReason, CAST(balanceBefore AS decimal(5,1)) as balanceBefore, CAST(balanceAfter AS decimal(5,1)) as balanceAfter, notes, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt
FROM `hr_leave_requests`;

-- Migrate hr_payroll_records
INSERT INTO `hr_payroll_records_new` (`id`, `organizationId`, `operatingUnitId`, `employeeId`, `payrollMonth`, `payrollYear`, `basicSalary`, `housingAllowance`, `transportAllowance`, `otherAllowances`, `overtimePay`, `bonus`, `grossSalary`, `taxDeduction`, `socialSecurityDeduction`, `loanDeduction`, `otherDeductions`, `totalDeductions`, `netSalary`, `currency`, `status`, `approvedBy`, `approvedAt`, `paidAt`, `paymentMethod`, `paymentReference`, `notes`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(employeeId AS int(11)) as employeeId, CAST(payrollMonth AS int(11)) as payrollMonth, CAST(payrollYear AS int(11)) as payrollYear, CAST(basicSalary AS decimal(15,2)) as basicSalary, CAST(housingAllowance AS decimal(15,2)) as housingAllowance, CAST(transportAllowance AS decimal(15,2)) as transportAllowance, CAST(otherAllowances AS decimal(15,2)) as otherAllowances, CAST(overtimePay AS decimal(15,2)) as overtimePay, CAST(bonus AS decimal(15,2)) as bonus, CAST(grossSalary AS decimal(15,2)) as grossSalary, CAST(taxDeduction AS decimal(15,2)) as taxDeduction, CAST(socialSecurityDeduction AS decimal(15,2)) as socialSecurityDeduction, CAST(loanDeduction AS decimal(15,2)) as loanDeduction, CAST(otherDeductions AS decimal(15,2)) as otherDeductions, CAST(totalDeductions AS decimal(15,2)) as totalDeductions, CAST(netSalary AS decimal(15,2)) as netSalary, currency, status, CAST(approvedBy AS int(11)) as approvedBy, approvedAt, paidAt, paymentMethod, paymentReference, notes, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt
FROM `hr_payroll_records`;

-- Migrate hr_recruitment_candidates
INSERT INTO `hr_recruitment_candidates_new` (`id`, `organizationId`, `jobId`, `firstName`, `lastName`, `email`, `phone`, `resumeUrl`, `coverLetterUrl`, `portfolioUrl`, `linkedinUrl`, `education`, `experience`, `skills`, `source`, `referredBy`, `rating`, `evaluationNotes`, `interviewDate`, `interviewNotes`, `interviewers`, `status`, `rejectionReason`, `offerDate`, `offerSalary`, `offerAccepted`, `startDate`, `notes`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(jobId AS int(11)) as jobId, firstName, lastName, email, phone, resumeUrl, coverLetterUrl, portfolioUrl, linkedinUrl, education, experience, skills, source, referredBy, CAST(rating AS int(11)) as rating, evaluationNotes, interviewDate, interviewNotes, interviewers, CAST(status AS enum('new','screening','shortlisted','interview_scheduled','interviewed','offer_pending','offer_sent','hired','rejected','withdrawn')) as status, rejectionReason, offerDate, CAST(offerSalary AS decimal(15,2)) as offerSalary, CAST(offerAccepted AS tinyint(1)) as offerAccepted, startDate, notes, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt
FROM `hr_recruitment_candidates`;

-- Migrate hr_recruitment_jobs
INSERT INTO `hr_recruitment_jobs_new` (`id`, `organizationId`, `operatingUnitId`, `jobCode`, `jobTitle`, `jobTitleAr`, `department`, `employmentType`, `gradeLevel`, `salaryRange`, `description`, `requirements`, `responsibilities`, `benefits`, `location`, `isRemote`, `openings`, `postingDate`, `closingDate`, `status`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, jobCode, jobTitle, jobTitleAr, department, CAST(employmentType AS enum('full_time','part_time','contract','consultant','intern')) as employmentType, gradeLevel, salaryRange, description, requirements, responsibilities, benefits, location, CAST(isRemote AS tinyint(1)) as isRemote, CAST(openings AS int(11)) as openings, postingDate, closingDate, status, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy
FROM `hr_recruitment_jobs`;

-- Migrate hr_salary_grades
INSERT INTO `hr_salary_grades_new` (`id`, `organizationId`, `gradeCode`, `gradeName`, `gradeNameAr`, `minSalary`, `maxSalary`, `midSalary`, `currency`, `steps`, `housingAllowance`, `transportAllowance`, `otherAllowances`, `effectiveDate`, `expiryDate`, `status`, `notes`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, gradeCode, gradeName, gradeNameAr, CAST(minSalary AS decimal(15,2)) as minSalary, CAST(maxSalary AS decimal(15,2)) as maxSalary, CAST(midSalary AS decimal(15,2)) as midSalary, currency, steps, CAST(housingAllowance AS decimal(15,2)) as housingAllowance, CAST(transportAllowance AS decimal(15,2)) as transportAllowance, otherAllowances, effectiveDate, expiryDate, status, notes, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt
FROM `hr_salary_grades`;

-- Migrate hr_salary_scale
INSERT INTO `hr_salary_scale_new` (`id`, `organizationId`, `operatingUnitId`, `employeeId`, `staffId`, `staffFullName`, `position`, `department`, `contractType`, `gradeId`, `gradeCode`, `step`, `minSalary`, `maxSalary`, `approvedGrossSalary`, `housingAllowance`, `housingAllowanceType`, `transportAllowance`, `transportAllowanceType`, `representationAllowance`, `representationAllowanceType`, `annualAllowance`, `bonus`, `otherAllowances`, `currency`, `version`, `effectiveStartDate`, `effectiveEndDate`, `status`, `isLocked`, `usedInPayroll`, `lastApprovedBy`, `lastApprovedAt`, `createdBy`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(employeeId AS int(11)) as employeeId, staffId, staffFullName, position, department, contractType, CAST(gradeId AS int(11)) as gradeId, gradeCode, step, CAST(minSalary AS decimal(15,2)) as minSalary, CAST(maxSalary AS decimal(15,2)) as maxSalary, CAST(approvedGrossSalary AS decimal(15,2)) as approvedGrossSalary, CAST(housingAllowance AS decimal(15,2)) as housingAllowance, housingAllowanceType, CAST(transportAllowance AS decimal(15,2)) as transportAllowance, transportAllowanceType, CAST(representationAllowance AS decimal(15,2)) as representationAllowance, representationAllowanceType, CAST(annualAllowance AS decimal(15,2)) as annualAllowance, CAST(bonus AS decimal(15,2)) as bonus, CAST(otherAllowances AS decimal(15,2)) as otherAllowances, currency, CAST(version AS int(11)) as version, effectiveStartDate, effectiveEndDate, status, CAST(isLocked AS tinyint(1)) as isLocked, CAST(usedInPayroll AS tinyint(1)) as usedInPayroll, CAST(lastApprovedBy AS int(11)) as lastApprovedBy, lastApprovedAt, CAST(createdBy AS int(11)) as createdBy, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt
FROM `hr_salary_scale`;

-- Migrate hr_sanctions
INSERT INTO `hr_sanctions_new` (`id`, `organizationId`, `operatingUnitId`, `employeeId`, `sanctionCode`, `sanctionType`, `severity`, `incidentDate`, `reportedDate`, `description`, `evidence`, `investigatedBy`, `investigationNotes`, `investigationDate`, `decisionDate`, `decisionBy`, `decision`, `appealDate`, `appealOutcome`, `appealNotes`, `status`, `effectiveDate`, `expiryDate`, `notes`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(employeeId AS int(11)) as employeeId, sanctionCode, sanctionType, severity, incidentDate, reportedDate, description, evidence, CAST(investigatedBy AS int(11)) as investigatedBy, investigationNotes, investigationDate, decisionDate, CAST(decisionBy AS int(11)) as decisionBy, decision, appealDate, appealOutcome, appealNotes, status, effectiveDate, expiryDate, notes, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt
FROM `hr_sanctions`;

-- Migrate import_history
INSERT INTO `import_history_new` (`id`, `project_id`, `organization_id`, `operating_unit_id`, `user_id`, `file_name`, `import_type`, `records_imported`, `records_skipped`, `records_errors`, `status`, `error_details`, `allowed_duplicates`, `imported_at`, `created_at`)
SELECT CAST(id AS int(11)) as id, CAST(project_id AS int(11)) as project_id, CAST(organization_id AS int(11)) as organization_id, CAST(operating_unit_id AS int(11)) as operating_unit_id, CAST(user_id AS int(11)) as user_id, file_name, import_type, CAST(records_imported AS int(11)) as records_imported, CAST(records_skipped AS int(11)) as records_skipped, CAST(records_errors AS int(11)) as records_errors, status, error_details, CAST(allowed_duplicates AS tinyint(1)) as allowed_duplicates, imported_at, created_at
FROM `import_history`;

-- Migrate indicators
INSERT INTO `indicators_new` (`id`, `projectId`, `organizationId`, `operatingUnitId`, `activityId`, `indicatorName`, `indicatorNameAr`, `description`, `descriptionAr`, `type`, `category`, `unit`, `baseline`, `target`, `achievedValue`, `targetDate`, `dataSource`, `verificationMethod`, `status`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `reportingFrequency`, `reporting_frequency`)
SELECT CAST(id AS int(11)) as id, CAST(projectId AS int(11)) as projectId, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(activityId AS int(11)) as activityId, indicatorName, indicatorNameAr, description, descriptionAr, type, category, unit, CAST(baseline AS decimal(15,2)) as baseline, CAST(target AS decimal(15,2)) as target, CAST(achievedValue AS decimal(15,2)) as achievedValue, targetDate, dataSource, verificationMethod, status, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy, reportingFrequency, reporting_frequency
FROM `indicators`;

-- Migrate invitations
INSERT INTO `invitations_new` (`id`, `email`, `organizationId`, `role`, `token`, `status`, `expiresAt`, `invitedBy`, `acceptedAt`, `createdAt`)
SELECT CAST(id AS int(11)) as id, email, CAST(organizationId AS int(11)) as organizationId, role, token, status, expiresAt, CAST(invitedBy AS int(11)) as invitedBy, acceptedAt, createdAt
FROM `invitations`;

-- Migrate journal_entries
INSERT INTO `journal_entries_new` (`id`, `organizationId`, `operatingUnitId`, `entryNumber`, `entryDate`, `fiscalYearId`, `fiscalPeriodId`, `entryType`, `sourceModule`, `sourceDocumentId`, `sourceDocumentType`, `description`, `descriptionAr`, `totalDebit`, `totalCredit`, `currencyId`, `exchangeRateId`, `status`, `postedAt`, `postedBy`, `reversedAt`, `reversedBy`, `reversalEntryId`, `projectId`, `grantId`, `attachments`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `deletedAt`, `deletedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, entryNumber, entryDate, CAST(fiscalYearId AS int(11)) as fiscalYearId, CAST(fiscalPeriodId AS int(11)) as fiscalPeriodId, entryType, sourceModule, CAST(sourceDocumentId AS int(11)) as sourceDocumentId, sourceDocumentType, description, descriptionAr, CAST(totalDebit AS decimal(15,2)) as totalDebit, CAST(totalCredit AS decimal(15,2)) as totalCredit, CAST(currencyId AS int(11)) as currencyId, CAST(exchangeRateId AS int(11)) as exchangeRateId, status, postedAt, CAST(postedBy AS int(11)) as postedBy, reversedAt, CAST(reversedBy AS int(11)) as reversedBy, CAST(reversalEntryId AS int(11)) as reversalEntryId, CAST(projectId AS int(11)) as projectId, CAST(grantId AS int(11)) as grantId, attachments, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy, deletedAt, CAST(deletedBy AS int(11)) as deletedBy
FROM `journal_entries`;

-- Migrate journal_lines
INSERT INTO `journal_lines_new` (`id`, `organizationId`, `journalEntryId`, `lineNumber`, `glAccountId`, `description`, `descriptionAr`, `debitAmount`, `creditAmount`, `currencyId`, `exchangeRate`, `debitAmountBase`, `creditAmountBase`, `projectId`, `grantId`, `activityId`, `budgetLineId`, `costCenterId`, `reference`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(journalEntryId AS int(11)) as journalEntryId, CAST(lineNumber AS int(11)) as lineNumber, CAST(glAccountId AS int(11)) as glAccountId, description, descriptionAr, CAST(debitAmount AS decimal(15,2)) as debitAmount, CAST(creditAmount AS decimal(15,2)) as creditAmount, CAST(currencyId AS int(11)) as currencyId, CAST(exchangeRate AS decimal(15,6)) as exchangeRate, CAST(debitAmountBase AS decimal(15,2)) as debitAmountBase, CAST(creditAmountBase AS decimal(15,2)) as creditAmountBase, CAST(projectId AS int(11)) as projectId, CAST(grantId AS int(11)) as grantId, CAST(activityId AS int(11)) as activityId, CAST(budgetLineId AS int(11)) as budgetLineId, CAST(costCenterId AS int(11)) as costCenterId, reference, createdAt, updatedAt
FROM `journal_lines`;

-- Migrate landing_settings
INSERT INTO `landing_settings_new` (`id`, `organizationId`, `heroTitle`, `heroTitleAr`, `heroSubtitle`, `heroSubtitleAr`, `heroImageUrl`, `showQuickStats`, `showAnnouncements`, `showRecentActivity`, `welcomeMessage`, `welcomeMessageAr`, `updatedAt`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, heroTitle, heroTitleAr, heroSubtitle, heroSubtitleAr, heroImageUrl, CAST(showQuickStats AS tinyint(1)) as showQuickStats, CAST(showAnnouncements AS tinyint(1)) as showAnnouncements, CAST(showRecentActivity AS tinyint(1)) as showRecentActivity, welcomeMessage, welcomeMessageAr, updatedAt, CAST(updatedBy AS int(11)) as updatedBy
FROM `landing_settings`;

-- Migrate meal_accountability_records
INSERT INTO `meal_accountability_records_new` (`id`, `organizationId`, `operatingUnitId`, `projectId`, `recordCode`, `recordType`, `category`, `severity`, `status`, `subject`, `description`, `submittedVia`, `isAnonymous`, `isSensitive`, `complainantName`, `complainantGender`, `complainantAgeGroup`, `complainantContact`, `complainantLocation`, `resolution`, `resolvedAt`, `resolvedBy`, `assignedTo`, `receivedAt`, `dueDate`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(projectId AS int(11)) as projectId, recordCode, CAST(recordType AS enum('complaint','feedback','suggestion')) as recordType, category, severity, status, subject, description, submittedVia, CAST(isAnonymous AS tinyint(1)) as isAnonymous, CAST(isSensitive AS tinyint(1)) as isSensitive, complainantName, complainantGender, complainantAgeGroup, complainantContact, complainantLocation, resolution, resolvedAt, CAST(resolvedBy AS int(11)) as resolvedBy, CAST(assignedTo AS int(11)) as assignedTo, receivedAt, dueDate, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy
FROM `meal_accountability_records`;

-- Migrate meal_audit_log
INSERT INTO `meal_audit_log_new` (`id`, `organizationId`, `operatingUnitId`, `moduleName`, `entityType`, `entityId`, `actionType`, `actorUserId`, `diff`, `createdAt`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, moduleName, entityType, CAST(entityId AS int(11)) as entityId, CAST(actionType AS enum('create','update','delete','approve','export','print')) as actionType, CAST(actorUserId AS int(11)) as actorUserId, diff, createdAt
FROM `meal_audit_log`;

-- Migrate meal_documents
INSERT INTO `meal_documents_new` (`id`, `organizationId`, `operatingUnitId`, `projectId`, `documentCode`, `title`, `titleAr`, `description`, `descriptionAr`, `documentType`, `category`, `fileName`, `fileUrl`, `fileSize`, `mimeType`, `version`, `parentDocumentId`, `sourceModule`, `sourceRecordId`, `isSystemGenerated`, `isPublic`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(projectId AS int(11)) as projectId, documentCode, title, titleAr, description, descriptionAr, documentType, category, fileName, fileUrl, CAST(fileSize AS int(11)) as fileSize, mimeType, version, CAST(parentDocumentId AS int(11)) as parentDocumentId, sourceModule, CAST(sourceRecordId AS int(11)) as sourceRecordId, CAST(isSystemGenerated AS tinyint(1)) as isSystemGenerated, CAST(isPublic AS tinyint(1)) as isPublic, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy
FROM `meal_documents`;

-- Migrate meal_dqa_actions
INSERT INTO `meal_dqa_actions_new` (`id`, `dqaFindingId`, `organizationId`, `operatingUnitId`, `actionText`, `ownerUserId`, `dueDate`, `status`, `createdAt`, `updatedAt`, `isDeleted`, `deletedAt`, `deletedBy`)
SELECT CAST(id AS int(11)) as id, CAST(dqaFindingId AS int(11)) as dqaFindingId, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, actionText, CAST(ownerUserId AS int(11)) as ownerUserId, dueDate, status, createdAt, updatedAt, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy
FROM `meal_dqa_actions`;

-- Migrate meal_dqa_findings
INSERT INTO `meal_dqa_findings_new` (`id`, `dqaVisitId`, `organizationId`, `operatingUnitId`, `severity`, `category`, `findingText`, `recommendationText`, `createdAt`, `updatedAt`, `isDeleted`, `deletedAt`, `deletedBy`)
SELECT CAST(id AS int(11)) as id, CAST(dqaVisitId AS int(11)) as dqaVisitId, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, severity, CAST(category AS enum('completeness','accuracy','timeliness','integrity','validity')) as category, findingText, recommendationText, createdAt, updatedAt, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy
FROM `meal_dqa_findings`;

-- Migrate meal_dqa_visits
INSERT INTO `meal_dqa_visits_new` (`id`, `organizationId`, `operatingUnitId`, `projectId`, `dqaCode`, `visitDate`, `verifierUserIds`, `locationIds`, `dataSource`, `samplingMethod`, `recordsCheckedCount`, `accurateCount`, `discrepanciesCount`, `missingFieldsCount`, `duplicatesCount`, `summary`, `status`, `createdBy`, `updatedBy`, `createdAt`, `updatedAt`, `deletedAt`, `isDeleted`, `deletedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(projectId AS int(11)) as projectId, dqaCode, visitDate, verifierUserIds, locationIds, dataSource, samplingMethod, CAST(recordsCheckedCount AS int(11)) as recordsCheckedCount, CAST(accurateCount AS int(11)) as accurateCount, CAST(discrepanciesCount AS int(11)) as discrepanciesCount, CAST(missingFieldsCount AS int(11)) as missingFieldsCount, CAST(duplicatesCount AS int(11)) as duplicatesCount, summary, status, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy, createdAt, updatedAt, deletedAt, CAST(isDeleted AS tinyint(1)) as isDeleted, CAST(deletedBy AS int(11)) as deletedBy
FROM `meal_dqa_visits`;

-- Migrate meal_indicator_data_entries
INSERT INTO `meal_indicator_data_entries_new` (`id`, `indicatorId`, `organizationId`, `operatingUnitId`, `projectId`, `reportingPeriod`, `periodStartDate`, `periodEndDate`, `achievedValue`, `disaggregation`, `dataSource`, `evidenceFiles`, `notes`, `isVerified`, `verifiedAt`, `verifiedBy`, `verificationNotes`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(indicatorId AS int(11)) as indicatorId, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(projectId AS int(11)) as projectId, reportingPeriod, periodStartDate, periodEndDate, CAST(achievedValue AS decimal(15,2)) as achievedValue, disaggregation, dataSource, evidenceFiles, notes, CAST(isVerified AS tinyint(1)) as isVerified, verifiedAt, CAST(verifiedBy AS int(11)) as verifiedBy, verificationNotes, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy
FROM `meal_indicator_data_entries`;

-- Migrate meal_indicator_templates
INSERT INTO `meal_indicator_templates_new` (`id`, `organizationId`, `name`, `code`, `unitOfMeasure`, `calculationMethod`, `frequency`, `disaggregationFields`, `defaultTargets`, `active`, `createdAt`, `updatedAt`, `deletedAt`, `isDeleted`, `deletedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, name, code, unitOfMeasure, calculationMethod, frequency, disaggregationFields, defaultTargets, CAST(active AS tinyint(1)) as active, createdAt, updatedAt, deletedAt, CAST(isDeleted AS tinyint(1)) as isDeleted, CAST(deletedBy AS int(11)) as deletedBy
FROM `meal_indicator_templates`;

-- Migrate meal_learning_actions
INSERT INTO `meal_learning_actions_new` (`id`, `learningItemId`, `organizationId`, `operatingUnitId`, `actionText`, `ownerUserId`, `dueDate`, `status`, `createdAt`, `updatedAt`, `isDeleted`, `deletedAt`, `deletedBy`)
SELECT CAST(id AS int(11)) as id, CAST(learningItemId AS int(11)) as learningItemId, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, actionText, CAST(ownerUserId AS int(11)) as ownerUserId, dueDate, status, createdAt, updatedAt, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy
FROM `meal_learning_actions`;

-- Migrate meal_learning_items
INSERT INTO `meal_learning_items_new` (`id`, `organizationId`, `operatingUnitId`, `projectId`, `type`, `title`, `context`, `rootCause`, `whatWorked`, `whatDidnt`, `recommendations`, `moduleSource`, `visibility`, `status`, `tags`, `locationIds`, `createdBy`, `updatedBy`, `deletedBy`, `createdAt`, `updatedAt`, `deletedAt`, `isDeleted`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(projectId AS int(11)) as projectId, type, title, context, rootCause, whatWorked, whatDidnt, recommendations, moduleSource, CAST(visibility AS enum('internal','donor')) as visibility, status, tags, locationIds, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, deletedAt, CAST(isDeleted AS tinyint(1)) as isDeleted
FROM `meal_learning_items`;

-- Migrate meal_survey_questions
INSERT INTO `meal_survey_questions_new` (`id`, `surveyId`, `questionCode`, `questionText`, `questionTextAr`, `helpText`, `helpTextAr`, `questionType`, `isRequired`, `order`, `sectionId`, `sectionTitle`, `sectionTitleAr`, `options`, `validationRules`, `skipLogic`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(surveyId AS int(11)) as surveyId, questionCode, questionText, questionTextAr, helpText, helpTextAr, questionType, CAST(isRequired AS tinyint(1)) as isRequired, CAST(order AS int(11)) as order, sectionId, sectionTitle, sectionTitleAr, options, validationRules, skipLogic, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt
FROM `meal_survey_questions`;

-- Migrate meal_survey_standards
INSERT INTO `meal_survey_standards_new` (`id`, `organizationId`, `standardName`, `validationRules`, `requiredFields`, `gpsRequired`, `photoRequired`, `createdAt`, `updatedAt`, `deletedAt`, `isDeleted`, `deletedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, standardName, validationRules, requiredFields, CAST(gpsRequired AS tinyint(1)) as gpsRequired, CAST(photoRequired AS tinyint(1)) as photoRequired, createdAt, updatedAt, deletedAt, CAST(isDeleted AS tinyint(1)) as isDeleted, CAST(deletedBy AS int(11)) as deletedBy
FROM `meal_survey_standards`;

-- Migrate meal_survey_submissions
INSERT INTO `meal_survey_submissions_new` (`id`, `surveyId`, `organizationId`, `operatingUnitId`, `projectId`, `submissionCode`, `respondentName`, `respondentEmail`, `respondentPhone`, `responses`, `submittedAt`, `submittedBy`, `validationStatus`, `validatedAt`, `validatedBy`, `validationNotes`, `latitude`, `longitude`, `locationName`, `deviceInfo`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(surveyId AS int(11)) as surveyId, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(projectId AS int(11)) as projectId, submissionCode, respondentName, respondentEmail, respondentPhone, responses, submittedAt, CAST(submittedBy AS int(11)) as submittedBy, validationStatus, validatedAt, CAST(validatedBy AS int(11)) as validatedBy, validationNotes, CAST(latitude AS decimal(10,8)) as latitude, CAST(longitude AS decimal(11,8)) as longitude, locationName, deviceInfo, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt
FROM `meal_survey_submissions`;

-- Migrate meal_surveys
INSERT INTO `meal_surveys_new` (`id`, `organizationId`, `operatingUnitId`, `projectId`, `surveyCode`, `title`, `titleAr`, `description`, `descriptionAr`, `surveyType`, `status`, `isAnonymous`, `allowMultipleSubmissions`, `requiresApproval`, `startDate`, `endDate`, `formConfig`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(projectId AS int(11)) as projectId, surveyCode, title, titleAr, description, descriptionAr, surveyType, status, CAST(isAnonymous AS tinyint(1)) as isAnonymous, CAST(allowMultipleSubmissions AS tinyint(1)) as allowMultipleSubmissions, CAST(requiresApproval AS tinyint(1)) as requiresApproval, startDate, endDate, formConfig, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy
FROM `meal_surveys`;

-- Migrate microsoft_integrations
INSERT INTO `microsoft_integrations_new` (`id`, `organizationId`, `entraIdEnabled`, `entraIdTenantId`, `sharepointEnabled`, `sharepointSiteUrl`, `oneDriveEnabled`, `outlookEnabled`, `teamsEnabled`, `powerBiEnabled`, `lastSyncedAt`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(entraIdEnabled AS tinyint(1)) as entraIdEnabled, entraIdTenantId, CAST(sharepointEnabled AS tinyint(1)) as sharepointEnabled, sharepointSiteUrl, CAST(oneDriveEnabled AS tinyint(1)) as oneDriveEnabled, CAST(outlookEnabled AS tinyint(1)) as outlookEnabled, CAST(teamsEnabled AS tinyint(1)) as teamsEnabled, CAST(powerBiEnabled AS tinyint(1)) as powerBiEnabled, lastSyncedAt, createdAt, updatedAt
FROM `microsoft_integrations`;

-- Migrate monthly_report_audit_history
INSERT INTO `monthly_report_audit_history_new` (`id`, `monthlyReportId`, `projectId`, `organizationId`, `action`, `fieldChanged`, `previousValue`, `newValue`, `changeReason`, `performedBy`, `performedAt`, `ipAddress`, `userAgent`)
SELECT CAST(id AS int(11)) as id, CAST(monthlyReportId AS int(11)) as monthlyReportId, CAST(projectId AS int(11)) as projectId, CAST(organizationId AS int(11)) as organizationId, action, fieldChanged, previousValue, newValue, changeReason, CAST(performedBy AS int(11)) as performedBy, performedAt, ipAddress, userAgent
FROM `monthly_report_audit_history`;

-- Migrate monthly_reports
INSERT INTO `monthly_reports_new` (`id`, `projectId`, `organizationId`, `operatingUnitId`, `reportCode`, `reportType`, `reportMonth`, `reportYear`, `periodStartDate`, `periodEndDate`, `status`, `generatedDate`, `editWindowEndDate`, `finalizedDate`, `implementationProgress`, `implementationProgressAr`, `projectSummary`, `projectSummaryAr`, `keyAchievements`, `keyAchievementsAr`, `nextPlan`, `nextPlanAr`, `challengesMitigation`, `challengesMitigationAr`, `lessonsLearned`, `lessonsLearnedAr`, `activitiesSnapshot`, `indicatorsSnapshot`, `financialSnapshot`, `casesSnapshot`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(projectId AS int(11)) as projectId, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, reportCode, reportType, CAST(reportMonth AS int(11)) as reportMonth, CAST(reportYear AS int(11)) as reportYear, periodStartDate, periodEndDate, status, generatedDate, editWindowEndDate, finalizedDate, implementationProgress, implementationProgressAr, projectSummary, projectSummaryAr, keyAchievements, keyAchievementsAr, nextPlan, nextPlanAr, challengesMitigation, challengesMitigationAr, lessonsLearned, lessonsLearnedAr, activitiesSnapshot, indicatorsSnapshot, financialSnapshot, casesSnapshot, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy
FROM `monthly_reports`;

-- Migrate notification_event_settings
INSERT INTO `notification_event_settings_new` (`id`, `organizationId`, `eventKey`, `name`, `category`, `description`, `emailEnabled`, `inAppEnabled`, `recipientsMode`, `roleIds`, `explicitEmails`, `templateId`, `isActive`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, eventKey, name, category, description, CAST(emailEnabled AS tinyint(1)) as emailEnabled, CAST(inAppEnabled AS tinyint(1)) as inAppEnabled, recipientsMode, roleIds, explicitEmails, CAST(templateId AS int(11)) as templateId, CAST(isActive AS tinyint(1)) as isActive, createdAt, updatedAt
FROM `notification_event_settings`;

-- Migrate notification_outbox
INSERT INTO `notification_outbox_new` (`id`, `organizationId`, `eventKey`, `channel`, `payloadJson`, `recipients`, `subject`, `status`, `attemptCount`, `lastError`, `nextRetryAt`, `sentAt`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, eventKey, channel, payloadJson, recipients, subject, status, CAST(attemptCount AS int(11)) as attemptCount, lastError, nextRetryAt, sentAt, createdAt, updatedAt
FROM `notification_outbox`;

-- Migrate notification_preferences
INSERT INTO `notification_preferences_new` (`id`, `organizationId`, `category`, `eventKey`, `name`, `nameAr`, `emailEnabled`, `inAppEnabled`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, category, eventKey, name, nameAr, CAST(emailEnabled AS tinyint(1)) as emailEnabled, CAST(inAppEnabled AS tinyint(1)) as inAppEnabled, updatedAt
FROM `notification_preferences`;

-- Migrate operating_units
INSERT INTO `operating_units_new` (`id`, `organizationId`, `name`, `code`, `type`, `country`, `city`, `currency`, `timezone`, `status`, `officeAdminName`, `officeAdminEmail`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, name, code, type, country, city, currency, timezone, status, officeAdminName, officeAdminEmail, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt
FROM `operating_units`;

-- Migrate opportunities
INSERT INTO `opportunities_new` (`id`, `organizationId`, `operatingUnitId`, `donorName`, `donorType`, `cfpLink`, `interestArea`, `geographicAreas`, `applicationDeadline`, `allocatedBudget`, `currency`, `isCoFunding`, `applicationLink`, `fundingId`, `projectManagerName`, `projectManagerEmail`, `notes`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, donorName, donorType, cfpLink, interestArea, geographicAreas, applicationDeadline, CAST(allocatedBudget AS decimal(15,2)) as allocatedBudget, currency, CAST(isCoFunding AS tinyint(1)) as isCoFunding, applicationLink, fundingId, projectManagerName, projectManagerEmail, notes, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy
FROM `opportunities`;

-- Migrate option_set_values
INSERT INTO `option_set_values_new` (`id`, `optionSetId`, `label`, `labelAr`, `value`, `isActive`, `sortOrder`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(optionSetId AS int(11)) as optionSetId, label, labelAr, value, CAST(isActive AS tinyint(1)) as isActive, CAST(sortOrder AS int(11)) as sortOrder, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt
FROM `option_set_values`;

-- Migrate option_sets
INSERT INTO `option_sets_new` (`id`, `organizationId`, `name`, `nameAr`, `description`, `descriptionAr`, `systemKey`, `isSystem`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, name, nameAr, description, descriptionAr, systemKey, CAST(isSystem AS tinyint(1)) as isSystem, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt
FROM `option_sets`;

-- Migrate organization_branding
INSERT INTO `organization_branding_new` (`id`, `organizationId`, `logoUrl`, `faviconUrl`, `primaryColor`, `secondaryColor`, `headerText`, `footerText`, `customCss`, `updatedAt`, `systemName`, `systemNameAr`, `accentColor`, `footerTextAr`, `updatedBy`, `organizationName`, `organizationNameAr`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, logoUrl, faviconUrl, primaryColor, secondaryColor, headerText, footerText, customCss, updatedAt, systemName, systemNameAr, accentColor, footerTextAr, CAST(updatedBy AS int(11)) as updatedBy, organizationName, organizationNameAr
FROM `organization_branding`;

-- Migrate organizations
INSERT INTO `organizations_new` (`id`, `name`, `nameAr`, `organizationCode`, `shortCode`, `tenantId`, `primaryAdminId`, `secondaryAdminId`, `domain`, `status`, `country`, `timezone`, `currency`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, name, nameAr, organizationCode, shortCode, tenantId, CAST(primaryAdminId AS int(11)) as primaryAdminId, CAST(secondaryAdminId AS int(11)) as secondaryAdminId, domain, status, country, timezone, currency, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt
FROM `organizations`;

-- Migrate payment_lines
INSERT INTO `payment_lines_new` (`id`, `organizationId`, `paymentId`, `lineNumber`, `sourceType`, `sourceId`, `description`, `descriptionAr`, `amount`, `currencyId`, `exchangeRate`, `amountInBaseCurrency`, `projectId`, `grantId`, `activityId`, `budgetLineId`, `glAccountId`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(paymentId AS int(11)) as paymentId, CAST(lineNumber AS int(11)) as lineNumber, sourceType, CAST(sourceId AS int(11)) as sourceId, description, descriptionAr, CAST(amount AS decimal(15,2)) as amount, CAST(currencyId AS int(11)) as currencyId, CAST(exchangeRate AS decimal(15,6)) as exchangeRate, CAST(amountInBaseCurrency AS decimal(15,2)) as amountInBaseCurrency, CAST(projectId AS int(11)) as projectId, CAST(grantId AS int(11)) as grantId, CAST(activityId AS int(11)) as activityId, CAST(budgetLineId AS int(11)) as budgetLineId, CAST(glAccountId AS int(11)) as glAccountId, createdAt, updatedAt
FROM `payment_lines`;

-- Migrate payments
INSERT INTO `payments_new` (`id`, `organizationId`, `operatingUnitId`, `paymentNumber`, `paymentDate`, `paymentType`, `paymentMethod`, `payeeType`, `payeeId`, `payeeName`, `payeeNameAr`, `bankAccountId`, `chequeNumber`, `chequeDate`, `amount`, `currencyId`, `exchangeRateId`, `amountInBaseCurrency`, `description`, `descriptionAr`, `projectId`, `grantId`, `status`, `approvedBy`, `approvedAt`, `paidBy`, `paidAt`, `glAccountId`, `journalEntryId`, `postingStatus`, `attachments`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `deletedAt`, `deletedBy`, `version`, `parentId`, `revisionReason`, `isLatestVersion`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, paymentNumber, paymentDate, paymentType, paymentMethod, payeeType, CAST(payeeId AS int(11)) as payeeId, payeeName, payeeNameAr, CAST(bankAccountId AS int(11)) as bankAccountId, chequeNumber, chequeDate, CAST(amount AS decimal(15,2)) as amount, CAST(currencyId AS int(11)) as currencyId, CAST(exchangeRateId AS int(11)) as exchangeRateId, CAST(amountInBaseCurrency AS decimal(15,2)) as amountInBaseCurrency, description, descriptionAr, CAST(projectId AS int(11)) as projectId, CAST(grantId AS int(11)) as grantId, status, CAST(approvedBy AS int(11)) as approvedBy, approvedAt, CAST(paidBy AS int(11)) as paidBy, paidAt, CAST(glAccountId AS int(11)) as glAccountId, CAST(journalEntryId AS int(11)) as journalEntryId, postingStatus, attachments, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, CAST(version AS int(11)) as version, CAST(parentId AS int(11)) as parentId, revisionReason, CAST(isLatestVersion AS tinyint(1)) as isLatestVersion
FROM `payments`;

-- Migrate permission_reviews
INSERT INTO `permission_reviews_new` (`id`, `userId`, `organizationId`, `moduleId`, `screenId`, `reviewedBy`, `reviewedAt`, `outcome`, `notes`, `createdAt`)
SELECT CAST(id AS int(11)) as id, CAST(userId AS int(11)) as userId, CAST(organizationId AS int(11)) as organizationId, moduleId, screenId, CAST(reviewedBy AS int(11)) as reviewedBy, reviewedAt, outcome, notes, createdAt
FROM `permission_reviews`;

-- Migrate pipeline_opportunities
INSERT INTO `pipeline_opportunities_new` (`id`, `organizationId`, `operatingUnitId`, `title`, `donorName`, `donorType`, `fundingWindow`, `deadline`, `indicativeBudgetMin`, `indicativeBudgetMax`, `sectors`, `country`, `governorate`, `type`, `stage`, `probability`, `statusHistory`, `fundingId`, `focalPoint`, `projectManagerName`, `projectManagerEmail`, `notes`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, title, donorName, donorType, fundingWindow, deadline, CAST(indicativeBudgetMin AS decimal(15,2)) as indicativeBudgetMin, CAST(indicativeBudgetMax AS decimal(15,2)) as indicativeBudgetMax, sectors, country, governorate, type, stage, CAST(probability AS int(11)) as probability, statusHistory, fundingId, focalPoint, projectManagerName, projectManagerEmail, notes, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy
FROM `pipeline_opportunities`;

-- Migrate procurement_number_sequences
INSERT INTO `procurement_number_sequences_new` (`id`, `organizationId`, `operatingUnitId`, `documentType`, `year`, `currentSequence`, `lastGeneratedNumber`, `lastGeneratedAt`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, documentType, CAST(year AS int(11)) as year, CAST(currentSequence AS int(11)) as currentSequence, lastGeneratedNumber, lastGeneratedAt, createdAt, updatedAt
FROM `procurement_number_sequences`;

-- Migrate procurement_payments
INSERT INTO `procurement_payments_new` (`id`, `organizationId`, `operatingUnitId`, `purchaseOrderId`, `supplierId`, `paymentNumber`, `paymentDate`, `amount`, `currency`, `paymentMethod`, `referenceNumber`, `invoiceNumber`, `description`, `status`, `processedBy`, `processedAt`, `remarks`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(purchaseOrderId AS int(11)) as purchaseOrderId, CAST(supplierId AS int(11)) as supplierId, paymentNumber, paymentDate, CAST(amount AS decimal(15,2)) as amount, currency, paymentMethod, referenceNumber, invoiceNumber, description, status, CAST(processedBy AS int(11)) as processedBy, processedAt, remarks, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy
FROM `procurement_payments`;

-- Migrate procurement_plan
INSERT INTO `procurement_plan_new` (`id`, `projectId`, `organizationId`, `operatingUnitId`, `activityId`, `itemName`, `itemNameAr`, `description`, `descriptionAr`, `category`, `subcategory`, `quantity`, `unit`, `estimatedCost`, `actualCost`, `currency`, `plannedProcurementDate`, `actualProcurementDate`, `deliveryDate`, `recurrence`, `procurementMethod`, `status`, `supplierName`, `supplierContact`, `budgetLine`, `notes`, `notesAr`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(projectId AS int(11)) as projectId, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(activityId AS int(11)) as activityId, itemName, itemNameAr, description, descriptionAr, category, subcategory, CAST(quantity AS decimal(15,2)) as quantity, unit, CAST(estimatedCost AS decimal(15,2)) as estimatedCost, CAST(actualCost AS decimal(15,2)) as actualCost, currency, plannedProcurementDate, actualProcurementDate, deliveryDate, recurrence, procurementMethod, status, supplierName, supplierContact, budgetLine, notes, notesAr, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy
FROM `procurement_plan`;

-- Migrate project_plan_activities
INSERT INTO `project_plan_activities_new` (`id`, `projectId`, `organizationId`, `operatingUnitId`, `resultId`, `activityTabId`, `department`, `code`, `title`, `titleAr`, `description`, `responsible`, `startDate`, `endDate`, `status`, `isSynced`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(projectId AS int(11)) as projectId, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(resultId AS int(11)) as resultId, CAST(activityTabId AS int(11)) as activityTabId, department, code, title, titleAr, description, responsible, startDate, endDate, status, CAST(isSynced AS tinyint(1)) as isSynced, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy
FROM `project_plan_activities`;

-- Migrate project_plan_objectives
INSERT INTO `project_plan_objectives_new` (`id`, `projectId`, `organizationId`, `operatingUnitId`, `code`, `title`, `titleAr`, `description`, `status`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(projectId AS int(11)) as projectId, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, code, title, titleAr, description, status, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy
FROM `project_plan_objectives`;

-- Migrate project_plan_results
INSERT INTO `project_plan_results_new` (`id`, `projectId`, `organizationId`, `operatingUnitId`, `objectiveId`, `code`, `title`, `titleAr`, `description`, `status`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(projectId AS int(11)) as projectId, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(objectiveId AS int(11)) as objectiveId, code, title, titleAr, description, status, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy
FROM `project_plan_results`;

-- Migrate project_plan_tasks
INSERT INTO `project_plan_tasks_new` (`id`, `projectId`, `organizationId`, `operatingUnitId`, `planActivityId`, `taskTabId`, `code`, `title`, `titleAr`, `responsible`, `startDate`, `endDate`, `status`, `isSynced`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(projectId AS int(11)) as projectId, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(planActivityId AS int(11)) as planActivityId, CAST(taskTabId AS int(11)) as taskTabId, code, title, titleAr, responsible, startDate, endDate, status, CAST(isSynced AS tinyint(1)) as isSynced, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy
FROM `project_plan_tasks`;

-- Migrate project_reporting_schedules
INSERT INTO `project_reporting_schedules_new` (`id`, `projectId`, `organizationId`, `operatingUnitId`, `reportType`, `reportTitle`, `reportTitleAr`, `description`, `descriptionAr`, `frequency`, `dueDate`, `reminderDays`, `status`, `submittedDate`, `approvedDate`, `submittedBy`, `approvedBy`, `notes`, `notesAr`, `attachments`, `isDeleted`, `createdAt`, `updatedAt`, `createdBy`)
SELECT CAST(id AS int(11)) as id, CAST(projectId AS int(11)) as projectId, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, reportType, reportTitle, reportTitleAr, description, descriptionAr, frequency, dueDate, CAST(reminderDays AS int(11)) as reminderDays, status, submittedDate, approvedDate, CAST(submittedBy AS int(11)) as submittedBy, CAST(approvedBy AS int(11)) as approvedBy, notes, notesAr, attachments, CAST(isDeleted AS tinyint(1)) as isDeleted, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy
FROM `project_reporting_schedules`;

-- Migrate projects
INSERT INTO `projects_new` (`id`, `organizationId`, `operatingUnitId`, `grantId`, `code`, `projectCode`, `title`, `titleEn`, `titleAr`, `description`, `descriptionAr`, `objectives`, `objectivesAr`, `status`, `startDate`, `endDate`, `totalBudget`, `spent`, `currency`, `physicalProgressPercentage`, `sectors`, `donor`, `implementingPartner`, `location`, `locationAr`, `beneficiaryCount`, `projectManager`, `managerId`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(grantId AS int(11)) as grantId, code, projectCode, title, titleEn, titleAr, description, descriptionAr, objectives, objectivesAr, status, startDate, endDate, CAST(totalBudget AS decimal(15,2)) as totalBudget, CAST(spent AS decimal(15,2)) as spent, currency, CAST(physicalProgressPercentage AS decimal(5,2)) as physicalProgressPercentage, sectors, donor, implementingPartner, location, locationAr, CAST(beneficiaryCount AS int(11)) as beneficiaryCount, CAST(projectManager AS int(11)) as projectManager, CAST(managerId AS int(11)) as managerId, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy
FROM `projects`;

-- Migrate proposals
INSERT INTO `proposals_new` (`id`, `organizationId`, `operatingUnitId`, `pipelineOpportunityId`, `proposalTitle`, `donorName`, `callReference`, `proposalType`, `country`, `governorate`, `sectors`, `projectDuration`, `totalRequestedBudget`, `currency`, `submissionDeadline`, `proposalStatus`, `completionPercentage`, `executiveSummary`, `problemStatement`, `objectives`, `activities`, `budget`, `logframe`, `fundingId`, `leadWriter`, `reviewers`, `projectManagerName`, `projectManagerEmail`, `grantId`, `projectId`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(pipelineOpportunityId AS int(11)) as pipelineOpportunityId, proposalTitle, donorName, callReference, CAST(proposalType AS enum('concept note','full proposal','expression of interest')) as proposalType, country, governorate, sectors, CAST(projectDuration AS int(11)) as projectDuration, CAST(totalRequestedBudget AS decimal(15,2)) as totalRequestedBudget, currency, submissionDeadline, CAST(proposalStatus AS enum('draft','under internal review','submitted','approved','rejected','withdrawn')) as proposalStatus, CAST(completionPercentage AS int(11)) as completionPercentage, executiveSummary, problemStatement, objectives, activities, budget, logframe, fundingId, leadWriter, reviewers, projectManagerName, projectManagerEmail, CAST(grantId AS int(11)) as grantId, CAST(projectId AS int(11)) as projectId, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy
FROM `proposals`;

-- Migrate pss_sessions
INSERT INTO `pss_sessions_new` (`id`, `caseId`, `projectId`, `organizationId`, `sessionDate`, `sessionType`, `pssApproach`, `facilitatorId`, `facilitatorName`, `duration`, `keyObservations`, `beneficiaryResponse`, `nextSessionDate`, `createdAt`, `updatedAt`, `createdBy`, `isDeleted`)
SELECT CAST(id AS int(11)) as id, CAST(caseId AS int(11)) as caseId, CAST(projectId AS int(11)) as projectId, CAST(organizationId AS int(11)) as organizationId, sessionDate, sessionType, pssApproach, CAST(facilitatorId AS int(11)) as facilitatorId, facilitatorName, CAST(duration AS int(11)) as duration, keyObservations, beneficiaryResponse, nextSessionDate, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(isDeleted AS tinyint(1)) as isDeleted
FROM `pss_sessions`;

-- Migrate purchase_order_line_items
INSERT INTO `purchase_order_line_items_new` (`id`, `purchaseOrderId`, `lineNumber`, `description`, `descriptionAr`, `specifications`, `quantity`, `unit`, `unitPrice`, `totalPrice`, `deliveredQty`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(purchaseOrderId AS int(11)) as purchaseOrderId, CAST(lineNumber AS int(11)) as lineNumber, description, descriptionAr, specifications, CAST(quantity AS decimal(10,2)) as quantity, unit, CAST(unitPrice AS decimal(15,2)) as unitPrice, CAST(totalPrice AS decimal(15,2)) as totalPrice, CAST(deliveredQty AS decimal(10,2)) as deliveredQty, createdAt, updatedAt
FROM `purchase_order_line_items`;

-- Migrate purchase_orders
INSERT INTO `purchase_orders_new` (`id`, `organizationId`, `operatingUnitId`, `purchaseRequestId`, `quotationAnalysisId`, `bidAnalysisId`, `supplierId`, `poNumber`, `poDate`, `deliveryDate`, `deliveryLocation`, `deliveryLocationAr`, `paymentTerms`, `currency`, `subtotal`, `taxAmount`, `totalAmount`, `termsAndConditions`, `status`, `sentAt`, `acknowledgedAt`, `approvedBy`, `approvedAt`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(purchaseRequestId AS int(11)) as purchaseRequestId, CAST(quotationAnalysisId AS int(11)) as quotationAnalysisId, CAST(bidAnalysisId AS int(11)) as bidAnalysisId, CAST(supplierId AS int(11)) as supplierId, poNumber, poDate, deliveryDate, deliveryLocation, deliveryLocationAr, paymentTerms, currency, CAST(subtotal AS decimal(15,2)) as subtotal, CAST(taxAmount AS decimal(15,2)) as taxAmount, CAST(totalAmount AS decimal(15,2)) as totalAmount, termsAndConditions, status, sentAt, acknowledgedAt, CAST(approvedBy AS int(11)) as approvedBy, approvedAt, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy
FROM `purchase_orders`;

-- Migrate purchase_request_line_items
INSERT INTO `purchase_request_line_items_new` (`id`, `purchaseRequestId`, `lineNumber`, `budgetLine`, `description`, `descriptionAr`, `specifications`, `specificationsAr`, `quantity`, `unit`, `unitPrice`, `totalPrice`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(purchaseRequestId AS int(11)) as purchaseRequestId, CAST(lineNumber AS int(11)) as lineNumber, budgetLine, description, descriptionAr, specifications, specificationsAr, CAST(quantity AS decimal(10,2)) as quantity, unit, CAST(unitPrice AS decimal(15,2)) as unitPrice, CAST(totalPrice AS decimal(15,2)) as totalPrice, createdAt, updatedAt
FROM `purchase_request_line_items`;

-- Migrate purchase_requests
INSERT INTO `purchase_requests_new` (`id`, `prNumber`, `category`, `projectId`, `projectTitle`, `donorId`, `donorName`, `budgetCode`, `subBudgetLine`, `activityName`, `totalBudgetLine`, `exchangeRateToUSD`, `totalBudgetLineUSD`, `currency`, `prTotalUSD`, `department`, `requesterName`, `requesterEmail`, `requesterId`, `prDate`, `urgency`, `neededBy`, `deliveryLocation`, `justification`, `procurementLadder`, `status`, `procurementStatus`, `logValidatedBy`, `logValidatedOn`, `logValidatorEmail`, `finValidatedBy`, `finValidatedOn`, `finValidatorEmail`, `approvedBy`, `approvedOn`, `approverEmail`, `rejectReason`, `rejectionStage`, `pmRejectedBy`, `pmRejectedOn`, `logRejectedBy`, `logRejectedOn`, `finRejectedBy`, `finRejectedOn`, `quotationAnalysisNumber`, `bidsAnalysisNumber`, `purchaseOrderNumber`, `grnNumber`, `operatingUnitId`, `organizationId`, `isDeleted`, `deletedAt`, `deletedBy`, `createdBy`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, prNumber, category, CAST(projectId AS int(11)) as projectId, projectTitle, CAST(donorId AS int(11)) as donorId, donorName, budgetCode, subBudgetLine, activityName, CAST(totalBudgetLine AS decimal(15,2)) as totalBudgetLine, CAST(exchangeRateToUSD AS decimal(15,6)) as exchangeRateToUSD, CAST(totalBudgetLineUSD AS decimal(15,2)) as totalBudgetLineUSD, currency, CAST(prTotalUSD AS decimal(15,2)) as prTotalUSD, department, requesterName, requesterEmail, CAST(requesterId AS int(11)) as requesterId, prDate, urgency, neededBy, deliveryLocation, justification, procurementLadder, status, procurementStatus, CAST(logValidatedBy AS int(11)) as logValidatedBy, logValidatedOn, logValidatorEmail, CAST(finValidatedBy AS int(11)) as finValidatedBy, finValidatedOn, finValidatorEmail, CAST(approvedBy AS int(11)) as approvedBy, approvedOn, approverEmail, rejectReason, rejectionStage, CAST(pmRejectedBy AS int(11)) as pmRejectedBy, pmRejectedOn, CAST(logRejectedBy AS int(11)) as logRejectedBy, logRejectedOn, CAST(finRejectedBy AS int(11)) as finRejectedBy, finRejectedOn, quotationAnalysisNumber, bidsAnalysisNumber, purchaseOrderNumber, grnNumber, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(organizationId AS int(11)) as organizationId, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, CAST(createdBy AS int(11)) as createdBy, createdAt, updatedAt
FROM `purchase_requests`;

-- Migrate purge_notifications
INSERT INTO `purge_notifications_new` (`id`, `recordId`, `recordType`, `scope`, `organizationId`, `operatingUnitId`, `scheduledPurgeDate`, `notificationSentAt`, `notificationStatus`, `createdAt`)
SELECT CAST(id AS int(11)) as id, CAST(recordId AS int(11)) as recordId, recordType, scope, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(scheduledPurgeDate AS bigint(20)) as scheduledPurgeDate, CAST(notificationSentAt AS bigint(20)) as notificationSentAt, notificationStatus, CAST(createdAt AS bigint(20)) as createdAt
FROM `purge_notifications`;

-- Migrate quotation_analyses
INSERT INTO `quotation_analyses_new` (`id`, `organizationId`, `operatingUnitId`, `purchaseRequestId`, `qaNumber`, `title`, `titleAr`, `rfqDate`, `closingDate`, `selectedSupplierId`, `selectionJustification`, `status`, `approvedBy`, `approvedAt`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(purchaseRequestId AS int(11)) as purchaseRequestId, qaNumber, title, titleAr, rfqDate, closingDate, CAST(selectedSupplierId AS int(11)) as selectedSupplierId, selectionJustification, status, CAST(approvedBy AS int(11)) as approvedBy, approvedAt, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy
FROM `quotation_analyses`;

-- Migrate quotation_analysis_line_items
INSERT INTO `quotation_analysis_line_items_new` (`id`, `quotationAnalysisId`, `supplierId`, `lineItemId`, `unitPrice`, `totalPrice`, `remarks`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(quotationAnalysisId AS int(11)) as quotationAnalysisId, CAST(supplierId AS int(11)) as supplierId, CAST(lineItemId AS int(11)) as lineItemId, CAST(unitPrice AS decimal(15,2)) as unitPrice, CAST(totalPrice AS decimal(15,2)) as totalPrice, remarks, createdAt, updatedAt
FROM `quotation_analysis_line_items`;

-- Migrate quotation_analysis_suppliers
INSERT INTO `quotation_analysis_suppliers_new` (`id`, `quotationAnalysisId`, `supplierId`, `supplierName`, `quoteReference`, `quoteDate`, `totalAmount`, `currency`, `deliveryDays`, `paymentTerms`, `warrantyMonths`, `technicalScore`, `financialScore`, `totalScore`, `isSelected`, `remarks`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(quotationAnalysisId AS int(11)) as quotationAnalysisId, CAST(supplierId AS int(11)) as supplierId, supplierName, quoteReference, quoteDate, CAST(totalAmount AS decimal(15,2)) as totalAmount, currency, CAST(deliveryDays AS int(11)) as deliveryDays, paymentTerms, CAST(warrantyMonths AS int(11)) as warrantyMonths, CAST(technicalScore AS decimal(5,2)) as technicalScore, CAST(financialScore AS decimal(5,2)) as financialScore, CAST(totalScore AS decimal(5,2)) as totalScore, CAST(isSelected AS tinyint(1)) as isSelected, remarks, createdAt, updatedAt
FROM `quotation_analysis_suppliers`;

-- Migrate rbac_roles
INSERT INTO `rbac_roles_new` (`id`, `organizationId`, `name`, `nameAr`, `description`, `descriptionAr`, `permissions`, `isSystem`, `isLocked`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, name, nameAr, description, descriptionAr, permissions, CAST(isSystem AS tinyint(1)) as isSystem, CAST(isLocked AS tinyint(1)) as isLocked, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy
FROM `rbac_roles`;

-- Migrate rbac_user_permissions
INSERT INTO `rbac_user_permissions_new` (`id`, `userId`, `organizationId`, `roleId`, `permissions`, `screenPermissions`, `tabPermissions`, `isActive`, `createdAt`, `updatedAt`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(userId AS int(11)) as userId, CAST(organizationId AS int(11)) as organizationId, CAST(roleId AS int(11)) as roleId, permissions, screenPermissions, tabPermissions, CAST(isActive AS tinyint(1)) as isActive, createdAt, updatedAt, CAST(updatedBy AS int(11)) as updatedBy
FROM `rbac_user_permissions`;

-- Migrate reporting_schedules
INSERT INTO `reporting_schedules_new` (`id`, `projectId`, `grantId`, `organizationId`, `operatingUnitId`, `reportType`, `reportTypeOther`, `periodFrom`, `periodTo`, `reportStatus`, `reportDeadline`, `notes`, `isLocked`, `lockedAt`, `lockedBy`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(projectId AS int(11)) as projectId, CAST(grantId AS int(11)) as grantId, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(reportType AS enum('narrative','financial','progress','final','interim','quarterly','annual','other')) as reportType, reportTypeOther, periodFrom, periodTo, reportStatus, reportDeadline, notes, CAST(isLocked AS tinyint(1)) as isLocked, lockedAt, CAST(lockedBy AS int(11)) as lockedBy, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy
FROM `reporting_schedules`;

-- Migrate retention_policies
INSERT INTO `retention_policies_new` (`id`, `entityType`, `retentionDays`, `description`, `updatedAt`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, entityType, CAST(retentionDays AS int(11)) as retentionDays, description, CAST(updatedAt AS bigint(20)) as updatedAt, CAST(updatedBy AS int(11)) as updatedBy
FROM `retention_policies`;

-- Migrate returned_item_line_items
INSERT INTO `returned_item_line_items_new` (`id`, `returnedItemId`, `stockItemId`, `lineNumber`, `description`, `returnedQty`, `acceptedQty`, `condition`, `unit`, `remarks`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(returnedItemId AS int(11)) as returnedItemId, CAST(stockItemId AS int(11)) as stockItemId, CAST(lineNumber AS int(11)) as lineNumber, description, CAST(returnedQty AS decimal(10,2)) as returnedQty, CAST(acceptedQty AS decimal(10,2)) as acceptedQty, condition, unit, remarks, createdAt, updatedAt
FROM `returned_item_line_items`;

-- Migrate returned_items
INSERT INTO `returned_items_new` (`id`, `organizationId`, `operatingUnitId`, `returnNumber`, `returnDate`, `returnedBy`, `department`, `reason`, `reasonAr`, `status`, `inspectedBy`, `inspectedAt`, `remarks`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, returnNumber, returnDate, returnedBy, department, reason, reasonAr, status, inspectedBy, inspectedAt, remarks, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy
FROM `returned_items`;

-- Migrate settlement_lines
INSERT INTO `settlement_lines_new` (`id`, `organizationId`, `settlementId`, `lineNumber`, `description`, `descriptionAr`, `amount`, `currencyId`, `exchangeRate`, `amountInBaseCurrency`, `expenseDate`, `categoryId`, `budgetLineId`, `projectId`, `grantId`, `activityId`, `glAccountId`, `receiptNumber`, `receiptDate`, `vendorId`, `vendorName`, `attachments`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(settlementId AS int(11)) as settlementId, CAST(lineNumber AS int(11)) as lineNumber, description, descriptionAr, CAST(amount AS decimal(15,2)) as amount, CAST(currencyId AS int(11)) as currencyId, CAST(exchangeRate AS decimal(15,6)) as exchangeRate, CAST(amountInBaseCurrency AS decimal(15,2)) as amountInBaseCurrency, expenseDate, CAST(categoryId AS int(11)) as categoryId, CAST(budgetLineId AS int(11)) as budgetLineId, CAST(projectId AS int(11)) as projectId, CAST(grantId AS int(11)) as grantId, CAST(activityId AS int(11)) as activityId, CAST(glAccountId AS int(11)) as glAccountId, receiptNumber, receiptDate, CAST(vendorId AS int(11)) as vendorId, vendorName, attachments, createdAt, updatedAt
FROM `settlement_lines`;

-- Migrate stock_issued
INSERT INTO `stock_issued_new` (`id`, `organizationId`, `operatingUnitId`, `stockRequestId`, `issueNumber`, `issueDate`, `issuedTo`, `issuedBy`, `department`, `remarks`, `status`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(stockRequestId AS int(11)) as stockRequestId, issueNumber, issueDate, issuedTo, issuedBy, department, remarks, status, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy
FROM `stock_issued`;

-- Migrate stock_issued_line_items
INSERT INTO `stock_issued_line_items_new` (`id`, `stockIssuedId`, `stockItemId`, `lineNumber`, `description`, `issuedQty`, `unit`, `remarks`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(stockIssuedId AS int(11)) as stockIssuedId, CAST(stockItemId AS int(11)) as stockItemId, CAST(lineNumber AS int(11)) as lineNumber, description, CAST(issuedQty AS decimal(10,2)) as issuedQty, unit, remarks, createdAt, updatedAt
FROM `stock_issued_line_items`;

-- Migrate stock_items
INSERT INTO `stock_items_new` (`id`, `organizationId`, `itemCode`, `itemName`, `itemNameAr`, `description`, `category`, `unitType`, `currentQuantity`, `minimumQuantity`, `maximumQuantity`, `reorderLevel`, `warehouseLocation`, `binLocation`, `expiryDate`, `batchNumber`, `serialNumber`, `unitCost`, `totalValue`, `currency`, `isDamaged`, `isExpired`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, itemCode, itemName, itemNameAr, description, category, unitType, CAST(currentQuantity AS decimal(15,2)) as currentQuantity, CAST(minimumQuantity AS decimal(15,2)) as minimumQuantity, CAST(maximumQuantity AS decimal(15,2)) as maximumQuantity, CAST(reorderLevel AS decimal(15,2)) as reorderLevel, warehouseLocation, binLocation, expiryDate, batchNumber, serialNumber, CAST(unitCost AS decimal(15,2)) as unitCost, CAST(totalValue AS decimal(15,2)) as totalValue, currency, CAST(isDamaged AS tinyint(1)) as isDamaged, CAST(isExpired AS tinyint(1)) as isExpired, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy
FROM `stock_items`;

-- Migrate stock_request_line_items
INSERT INTO `stock_request_line_items_new` (`id`, `stockRequestId`, `stockItemId`, `lineNumber`, `description`, `requestedQty`, `approvedQty`, `issuedQty`, `unit`, `remarks`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(stockRequestId AS int(11)) as stockRequestId, CAST(stockItemId AS int(11)) as stockItemId, CAST(lineNumber AS int(11)) as lineNumber, description, CAST(requestedQty AS decimal(10,2)) as requestedQty, CAST(approvedQty AS decimal(10,2)) as approvedQty, CAST(issuedQty AS decimal(10,2)) as issuedQty, unit, remarks, createdAt, updatedAt
FROM `stock_request_line_items`;

-- Migrate stock_requests
INSERT INTO `stock_requests_new` (`id`, `organizationId`, `operatingUnitId`, `requestNumber`, `requestDate`, `requesterName`, `requesterDepartment`, `purpose`, `purposeAr`, `neededByDate`, `status`, `approvedBy`, `approvedAt`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, requestNumber, requestDate, requesterName, requesterDepartment, purpose, purposeAr, neededByDate, status, CAST(approvedBy AS int(11)) as approvedBy, approvedAt, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy
FROM `stock_requests`;

-- Migrate suppliers
INSERT INTO `suppliers_new` (`id`, `supplierCode`, `legalName`, `legalNameAr`, `tradeName`, `contactPerson`, `email`, `phone`, `address`, `city`, `country`, `taxId`, `registrationNumber`, `bankName`, `bankAccountNumber`, `bankSwiftCode`, `bankIban`, `isBlacklisted`, `blacklistReason`, `blacklistDate`, `sanctionsScreened`, `sanctionsScreenedDate`, `performanceRating`, `totalOrders`, `hasFrameworkAgreement`, `frameworkAgreementExpiry`, `documents`, `status`, `organizationId`, `isDeleted`, `deletedAt`, `deletedBy`, `createdBy`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, supplierCode, legalName, legalNameAr, tradeName, contactPerson, email, phone, address, city, country, taxId, registrationNumber, bankName, bankAccountNumber, bankSwiftCode, bankIban, CAST(isBlacklisted AS tinyint(1)) as isBlacklisted, blacklistReason, blacklistDate, CAST(sanctionsScreened AS tinyint(1)) as sanctionsScreened, sanctionsScreenedDate, CAST(performanceRating AS int(11)) as performanceRating, CAST(totalOrders AS int(11)) as totalOrders, CAST(hasFrameworkAgreement AS tinyint(1)) as hasFrameworkAgreement, frameworkAgreementExpiry, documents, status, CAST(organizationId AS int(11)) as organizationId, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, CAST(createdBy AS int(11)) as createdBy, createdAt, updatedAt
FROM `suppliers`;

-- Migrate systemImportReports
INSERT INTO `systemImportReports_new` (`id`, `organizationId`, `operatingUnitId`, `projectId`, `module`, `importType`, `userId`, `userName`, `userRole`, `importSummary`, `errorDetails`, `errorFilePath`, `originalFilePath`, `status`, `reviewedBy`, `reviewedAt`, `resolutionNotes`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(projectId AS int(11)) as projectId, module, importType, CAST(userId AS int(11)) as userId, userName, userRole, importSummary, errorDetails, errorFilePath, originalFilePath, status, CAST(reviewedBy AS int(11)) as reviewedBy, reviewedAt, resolutionNotes, createdAt, updatedAt
FROM `systemImportReports`;

-- Migrate system_settings
INSERT INTO `system_settings_new` (`id`, `settingKey`, `settingValue`, `updatedAt`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, settingKey, settingValue, CAST(updatedAt AS bigint(20)) as updatedAt, CAST(updatedBy AS int(11)) as updatedBy
FROM `system_settings`;

-- Migrate tasks
INSERT INTO `tasks_new` (`id`, `projectId`, `organizationId`, `operatingUnitId`, `taskName`, `taskNameAr`, `description`, `descriptionAr`, `status`, `priority`, `dueDate`, `startDate`, `completedDate`, `assignedByEmail`, `assignedByName`, `assignedToEmail`, `assignedToName`, `assignmentDate`, `assignedTo`, `progressPercentage`, `tags`, `category`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(projectId AS int(11)) as projectId, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, taskName, taskNameAr, description, descriptionAr, status, priority, dueDate, startDate, completedDate, assignedByEmail, assignedByName, assignedToEmail, assignedToName, assignmentDate, CAST(assignedTo AS int(11)) as assignedTo, CAST(progressPercentage AS decimal(5,2)) as progressPercentage, tags, category, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy
FROM `tasks`;

-- Migrate trip_logs
INSERT INTO `trip_logs_new` (`id`, `organizationId`, `operatingUnitId`, `vehicleId`, `driverId`, `tripNumber`, `tripDate`, `purpose`, `purposeAr`, `startLocation`, `endLocation`, `startMileage`, `endMileage`, `distanceTraveled`, `startTime`, `endTime`, `passengers`, `projectCode`, `status`, `remarks`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(vehicleId AS int(11)) as vehicleId, CAST(driverId AS int(11)) as driverId, tripNumber, tripDate, purpose, purposeAr, startLocation, endLocation, CAST(startMileage AS decimal(10,2)) as startMileage, CAST(endMileage AS decimal(10,2)) as endMileage, CAST(distanceTraveled AS decimal(10,2)) as distanceTraveled, startTime, endTime, passengers, projectCode, status, remarks, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy
FROM `trip_logs`;

-- Migrate user_archive_log
INSERT INTO `user_archive_log_new` (`id`, `userId`, `action`, `userSnapshot`, `previousRoles`, `previousOrganizations`, `previousPermissions`, `reason`, `performedBy`, `performedByName`, `performedAt`, `restorationMetadata`, `createdAt`)
SELECT CAST(id AS int(11)) as id, CAST(userId AS int(11)) as userId, action, userSnapshot, previousRoles, previousOrganizations, previousPermissions, reason, CAST(performedBy AS int(11)) as performedBy, performedByName, performedAt, restorationMetadata, createdAt
FROM `user_archive_log`;

-- Migrate user_operating_units
INSERT INTO `user_operating_units_new` (`id`, `userId`, `operatingUnitId`, `role`, `createdAt`)
SELECT CAST(id AS int(11)) as id, CAST(userId AS int(11)) as userId, CAST(operatingUnitId AS int(11)) as operatingUnitId, role, createdAt
FROM `user_operating_units`;

-- Migrate user_organizations
INSERT INTO `user_organizations_new` (`id`, `userId`, `organizationId`, `tenantId`, `platformRole`, `orgRoles`, `permissions`, `modulePermissions`, `createdAt`, `role`)
SELECT CAST(id AS int(11)) as id, CAST(userId AS int(11)) as userId, CAST(organizationId AS int(11)) as organizationId, tenantId, platformRole, orgRoles, permissions, modulePermissions, createdAt, role
FROM `user_organizations`;

-- Migrate user_permission_overrides
INSERT INTO `user_permission_overrides_new` (`id`, `userId`, `organizationId`, `moduleId`, `screenId`, `action`, `overrideType`, `reason`, `expiresAt`, `isActive`, `createdBy`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(userId AS int(11)) as userId, CAST(organizationId AS int(11)) as organizationId, moduleId, screenId, action, overrideType, reason, expiresAt, CAST(isActive AS tinyint(1)) as isActive, CAST(createdBy AS int(11)) as createdBy, createdAt, updatedAt
FROM `user_permission_overrides`;

-- Migrate users
INSERT INTO `users_new` (`id`, `openId`, `name`, `email`, `loginMethod`, `authenticationProvider`, `externalIdentityId`, `role`, `createdAt`, `updatedAt`, `lastSignedIn`, `organizationId`, `currentOrganizationId`, `languagePreference`, `isDeleted`, `deletedAt`, `deletedBy`, `deletionReason`, `passwordResetToken`, `passwordResetExpiry`)
SELECT CAST(id AS int(11)) as id, openId, name, email, loginMethod, authenticationProvider, externalIdentityId, role, createdAt, updatedAt, lastSignedIn, CAST(organizationId AS int(11)) as organizationId, CAST(currentOrganizationId AS int(11)) as currentOrganizationId, languagePreference, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, deletionReason, passwordResetToken, CAST(passwordResetExpiry AS bigint(20)) as passwordResetExpiry
FROM `users`;

-- Migrate variance_alert_config
INSERT INTO `variance_alert_config_new` (`id`, `projectId`, `organizationId`, `operatingUnitId`, `warningThreshold`, `criticalThreshold`, `isEnabled`, `notifyProjectManager`, `notifyFinanceTeam`, `notifyOwner`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `isDeleted`, `deletedAt`, `deletedBy`)
SELECT CAST(id AS int(11)) as id, CAST(projectId AS int(11)) as projectId, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(warningThreshold AS decimal(5,2)) as warningThreshold, CAST(criticalThreshold AS decimal(5,2)) as criticalThreshold, CAST(isEnabled AS tinyint(1)) as isEnabled, CAST(notifyProjectManager AS tinyint(1)) as notifyProjectManager, CAST(notifyFinanceTeam AS tinyint(1)) as notifyFinanceTeam, CAST(notifyOwner AS tinyint(1)) as notifyOwner, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy
FROM `variance_alert_config`;

-- Migrate variance_alert_history
INSERT INTO `variance_alert_history_new` (`id`, `projectId`, `budgetItemId`, `organizationId`, `operatingUnitId`, `budgetCode`, `budgetItem`, `totalBudget`, `actualSpent`, `varianceAmount`, `variancePercentage`, `alertLevel`, `notificationSent`, `notificationError`, `acknowledgedAt`, `acknowledgedBy`, `acknowledgedNotes`, `createdAt`, `isDeleted`, `deletedAt`, `deletedBy`)
SELECT CAST(id AS int(11)) as id, CAST(projectId AS int(11)) as projectId, CAST(budgetItemId AS int(11)) as budgetItemId, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, budgetCode, budgetItem, CAST(totalBudget AS decimal(15,2)) as totalBudget, CAST(actualSpent AS decimal(15,2)) as actualSpent, CAST(varianceAmount AS decimal(15,2)) as varianceAmount, CAST(variancePercentage AS decimal(5,2)) as variancePercentage, alertLevel, CAST(notificationSent AS tinyint(1)) as notificationSent, notificationError, acknowledgedAt, CAST(acknowledgedBy AS int(11)) as acknowledgedBy, acknowledgedNotes, createdAt, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy
FROM `variance_alert_history`;

-- Migrate variance_alert_thresholds
INSERT INTO `variance_alert_thresholds_new` (`id`, `organizationId`, `operatingUnitId`, `name`, `nameAr`, `description`, `scope`, `projectId`, `grantId`, `category`, `thresholdPercentage`, `alertType`, `severity`, `notifyOwner`, `notifyProjectManager`, `notifyFinanceTeam`, `emailNotification`, `inAppNotification`, `isActive`, `createdBy`, `createdAt`, `updatedAt`, `isDeleted`, `deletedAt`, `deletedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, name, nameAr, description, scope, CAST(projectId AS int(11)) as projectId, CAST(grantId AS int(11)) as grantId, category, CAST(thresholdPercentage AS decimal(5,2)) as thresholdPercentage, alertType, severity, CAST(notifyOwner AS tinyint(1)) as notifyOwner, CAST(notifyProjectManager AS tinyint(1)) as notifyProjectManager, CAST(notifyFinanceTeam AS tinyint(1)) as notifyFinanceTeam, CAST(emailNotification AS tinyint(1)) as emailNotification, CAST(inAppNotification AS tinyint(1)) as inAppNotification, CAST(isActive AS tinyint(1)) as isActive, CAST(createdBy AS int(11)) as createdBy, createdAt, updatedAt, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy
FROM `variance_alert_thresholds`;

-- Migrate variance_alerts
INSERT INTO `variance_alerts_new` (`id`, `organizationId`, `operatingUnitId`, `projectId`, `grantId`, `budgetId`, `category`, `alertType`, `severity`, `budgetAmount`, `actualAmount`, `variance`, `variancePercentage`, `thresholdPercentage`, `status`, `acknowledgedBy`, `acknowledgedAt`, `resolvedBy`, `resolvedAt`, `notificationSent`, `notificationSentAt`, `description`, `notes`, `createdAt`, `updatedAt`, `isDeleted`, `deletedAt`, `deletedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(projectId AS int(11)) as projectId, CAST(grantId AS int(11)) as grantId, CAST(budgetId AS int(11)) as budgetId, category, alertType, severity, CAST(budgetAmount AS decimal(15,2)) as budgetAmount, CAST(actualAmount AS decimal(15,2)) as actualAmount, CAST(variance AS decimal(15,2)) as variance, CAST(variancePercentage AS decimal(5,2)) as variancePercentage, CAST(thresholdPercentage AS decimal(5,2)) as thresholdPercentage, status, CAST(acknowledgedBy AS int(11)) as acknowledgedBy, acknowledgedAt, CAST(resolvedBy AS int(11)) as resolvedBy, resolvedAt, CAST(notificationSent AS tinyint(1)) as notificationSent, notificationSentAt, description, notes, createdAt, updatedAt, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy
FROM `variance_alerts`;

-- Migrate vehicle_assignments
INSERT INTO `vehicle_assignments_new` (`id`, `vehicleId`, `driverId`, `assignedFrom`, `assignedTo`, `isPrimary`, `status`, `notes`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(vehicleId AS int(11)) as vehicleId, CAST(driverId AS int(11)) as driverId, assignedFrom, assignedTo, CAST(isPrimary AS tinyint(1)) as isPrimary, status, notes, createdAt, updatedAt
FROM `vehicle_assignments`;

-- Migrate vehicle_compliance
INSERT INTO `vehicle_compliance_new` (`id`, `vehicleId`, `complianceType`, `documentNumber`, `issueDate`, `expiryDate`, `issuingAuthority`, `cost`, `currency`, `documentUrl`, `status`, `remarks`, `createdAt`, `updatedAt`)
SELECT CAST(id AS int(11)) as id, CAST(vehicleId AS int(11)) as vehicleId, complianceType, documentNumber, issueDate, expiryDate, issuingAuthority, CAST(cost AS decimal(10,2)) as cost, currency, documentUrl, status, remarks, createdAt, updatedAt
FROM `vehicle_compliance`;

-- Migrate vehicle_maintenance
INSERT INTO `vehicle_maintenance_new` (`id`, `organizationId`, `operatingUnitId`, `vehicleId`, `maintenanceNumber`, `maintenanceType`, `description`, `descriptionAr`, `scheduledDate`, `completedDate`, `mileageAtService`, `vendor`, `laborCost`, `partsCost`, `totalCost`, `currency`, `invoiceNumber`, `status`, `remarks`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, CAST(vehicleId AS int(11)) as vehicleId, maintenanceNumber, maintenanceType, description, descriptionAr, scheduledDate, completedDate, CAST(mileageAtService AS decimal(10,2)) as mileageAtService, vendor, CAST(laborCost AS decimal(10,2)) as laborCost, CAST(partsCost AS decimal(10,2)) as partsCost, CAST(totalCost AS decimal(10,2)) as totalCost, currency, invoiceNumber, status, remarks, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy
FROM `vehicle_maintenance`;

-- Migrate vehicles
INSERT INTO `vehicles_new` (`id`, `organizationId`, `operatingUnitId`, `vehicleId`, `plateNumber`, `vehicleType`, `brand`, `model`, `year`, `color`, `chassisNumber`, `engineNumber`, `fuelType`, `ownership`, `purchaseDate`, `purchaseValue`, `currency`, `assignedProjectId`, `assignedProject`, `assignedDriverId`, `assignedDriverName`, `status`, `currentOdometer`, `insuranceExpiry`, `licenseExpiry`, `inspectionExpiry`, `notes`, `isDeleted`, `deletedAt`, `deletedBy`, `createdAt`, `updatedAt`, `createdBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, vehicleId, plateNumber, vehicleType, brand, model, CAST(year AS int(11)) as year, color, chassisNumber, engineNumber, fuelType, ownership, purchaseDate, CAST(purchaseValue AS decimal(15,2)) as purchaseValue, currency, CAST(assignedProjectId AS int(11)) as assignedProjectId, assignedProject, CAST(assignedDriverId AS int(11)) as assignedDriverId, assignedDriverName, CAST(status AS enum('active','under_maintenance','retired','disposed')) as status, CAST(currentOdometer AS decimal(15,2)) as currentOdometer, insuranceExpiry, licenseExpiry, inspectionExpiry, notes, CAST(isDeleted AS tinyint(1)) as isDeleted, deletedAt, CAST(deletedBy AS int(11)) as deletedBy, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy
FROM `vehicles`;

-- Migrate vendors
INSERT INTO `vendors_new` (`id`, `organizationId`, `operatingUnitId`, `vendorCode`, `name`, `nameAr`, `vendorType`, `taxId`, `registrationNumber`, `contactPerson`, `email`, `phone`, `mobile`, `fax`, `website`, `addressLine1`, `addressLine2`, `city`, `state`, `country`, `postalCode`, `bankName`, `bankBranch`, `bankAccountNumber`, `bankAccountName`, `iban`, `swiftCode`, `currencyId`, `paymentTerms`, `creditLimit`, `currentBalance`, `glAccountId`, `isActive`, `isPreferred`, `isBlacklisted`, `blacklistReason`, `notes`, `attachments`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `deletedAt`, `deletedBy`)
SELECT CAST(id AS int(11)) as id, CAST(organizationId AS int(11)) as organizationId, CAST(operatingUnitId AS int(11)) as operatingUnitId, vendorCode, name, nameAr, vendorType, taxId, registrationNumber, contactPerson, email, phone, mobile, fax, website, addressLine1, addressLine2, city, state, country, postalCode, bankName, bankBranch, bankAccountNumber, bankAccountName, iban, swiftCode, CAST(currencyId AS int(11)) as currencyId, paymentTerms, CAST(creditLimit AS decimal(15,2)) as creditLimit, CAST(currentBalance AS decimal(15,2)) as currentBalance, CAST(glAccountId AS int(11)) as glAccountId, CAST(isActive AS tinyint(1)) as isActive, CAST(isPreferred AS tinyint(1)) as isPreferred, CAST(isBlacklisted AS tinyint(1)) as isBlacklisted, blacklistReason, notes, attachments, createdAt, updatedAt, CAST(createdBy AS int(11)) as createdBy, CAST(updatedBy AS int(11)) as updatedBy, deletedAt, CAST(deletedBy AS int(11)) as deletedBy
FROM `vendors`;

-- STEP 3: DROP OLD TABLES

DROP TABLE IF EXISTS `activities`;
DROP TABLE IF EXISTS `allocation_bases`;
DROP TABLE IF EXISTS `allocation_keys`;
DROP TABLE IF EXISTS `allocation_periods`;
DROP TABLE IF EXISTS `allocation_results`;
DROP TABLE IF EXISTS `allocation_reversals`;
DROP TABLE IF EXISTS `allocation_rules`;
DROP TABLE IF EXISTS `allocation_template_rules`;
DROP TABLE IF EXISTS `allocation_templates`;
DROP TABLE IF EXISTS `asset_depreciation_schedule`;
DROP TABLE IF EXISTS `audit_log_export_history`;
DROP TABLE IF EXISTS `audit_log_export_schedules`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `bank_reconciliations`;
DROP TABLE IF EXISTS `bank_transactions`;
DROP TABLE IF EXISTS `beneficiaries`;
DROP TABLE IF EXISTS `bid_analyses`;
DROP TABLE IF EXISTS `bid_analysis_bidders`;
DROP TABLE IF EXISTS `bid_evaluation_criteria`;
DROP TABLE IF EXISTS `bid_evaluation_scores`;
DROP TABLE IF EXISTS `bid_opening_minutes`;
DROP TABLE IF EXISTS `budget_items`;
DROP TABLE IF EXISTS `budget_lines`;
DROP TABLE IF EXISTS `budget_monthly_allocations`;
DROP TABLE IF EXISTS `budget_reallocation_lines`;
DROP TABLE IF EXISTS `budget_reallocations`;
DROP TABLE IF EXISTS `budgets`;
DROP TABLE IF EXISTS `case_activities`;
DROP TABLE IF EXISTS `case_records`;
DROP TABLE IF EXISTS `case_referrals`;
DROP TABLE IF EXISTS `chart_of_accounts`;
DROP TABLE IF EXISTS `child_safe_spaces`;
DROP TABLE IF EXISTS `cost_centers`;
DROP TABLE IF EXISTS `cost_pool_transactions`;
DROP TABLE IF EXISTS `cost_pools`;
DROP TABLE IF EXISTS `css_activities`;
DROP TABLE IF EXISTS `donor_budget_mapping`;
DROP TABLE IF EXISTS `donor_communications`;
DROP TABLE IF EXISTS `donor_projects`;
DROP TABLE IF EXISTS `donor_reports`;
DROP TABLE IF EXISTS `donors`;
DROP TABLE IF EXISTS `drivers`;
DROP TABLE IF EXISTS `email_provider_settings`;
DROP TABLE IF EXISTS `email_templates`;
DROP TABLE IF EXISTS `expenditures`;
DROP TABLE IF EXISTS `expenses`;
DROP TABLE IF EXISTS `finance_advances`;
DROP TABLE IF EXISTS `finance_approval_thresholds`;
DROP TABLE IF EXISTS `finance_asset_categories`;
DROP TABLE IF EXISTS `finance_asset_disposals`;
DROP TABLE IF EXISTS `finance_asset_maintenance`;
DROP TABLE IF EXISTS `finance_asset_transfers`;
DROP TABLE IF EXISTS `finance_assets`;
DROP TABLE IF EXISTS `finance_bank_accounts`;
DROP TABLE IF EXISTS `finance_budget_categories`;
DROP TABLE IF EXISTS `finance_cash_transactions`;
DROP TABLE IF EXISTS `finance_currencies`;
DROP TABLE IF EXISTS `finance_exchange_rates`;
DROP TABLE IF EXISTS `finance_fiscal_years`;
DROP TABLE IF EXISTS `finance_fund_balances`;
DROP TABLE IF EXISTS `finance_permissions`;
DROP TABLE IF EXISTS `finance_role_permissions`;
DROP TABLE IF EXISTS `finance_roles`;
DROP TABLE IF EXISTS `finance_settlements`;
DROP TABLE IF EXISTS `finance_user_roles`;
DROP TABLE IF EXISTS `fiscal_periods`;
DROP TABLE IF EXISTS `forecast_audit_log`;
DROP TABLE IF EXISTS `forecast_plan`;
DROP TABLE IF EXISTS `fuel_logs`;
DROP TABLE IF EXISTS `gl_account_categories`;
DROP TABLE IF EXISTS `gl_accounts`;
DROP TABLE IF EXISTS `globalSettings`;
DROP TABLE IF EXISTS `goods_receipt_notes`;
DROP TABLE IF EXISTS `grant_documents`;
DROP TABLE IF EXISTS `grants`;
DROP TABLE IF EXISTS `grn_line_items`;
DROP TABLE IF EXISTS `hr_annual_plans`;
DROP TABLE IF EXISTS `hr_attendance_records`;
DROP TABLE IF EXISTS `hr_documents`;
DROP TABLE IF EXISTS `hr_employees`;
DROP TABLE IF EXISTS `hr_leave_balances`;
DROP TABLE IF EXISTS `hr_leave_requests`;
DROP TABLE IF EXISTS `hr_payroll_records`;
DROP TABLE IF EXISTS `hr_recruitment_candidates`;
DROP TABLE IF EXISTS `hr_recruitment_jobs`;
DROP TABLE IF EXISTS `hr_salary_grades`;
DROP TABLE IF EXISTS `hr_salary_scale`;
DROP TABLE IF EXISTS `hr_sanctions`;
DROP TABLE IF EXISTS `import_history`;
DROP TABLE IF EXISTS `indicators`;
DROP TABLE IF EXISTS `invitations`;
DROP TABLE IF EXISTS `journal_entries`;
DROP TABLE IF EXISTS `journal_lines`;
DROP TABLE IF EXISTS `landing_settings`;
DROP TABLE IF EXISTS `meal_accountability_records`;
DROP TABLE IF EXISTS `meal_audit_log`;
DROP TABLE IF EXISTS `meal_documents`;
DROP TABLE IF EXISTS `meal_dqa_actions`;
DROP TABLE IF EXISTS `meal_dqa_findings`;
DROP TABLE IF EXISTS `meal_dqa_visits`;
DROP TABLE IF EXISTS `meal_indicator_data_entries`;
DROP TABLE IF EXISTS `meal_indicator_templates`;
DROP TABLE IF EXISTS `meal_learning_actions`;
DROP TABLE IF EXISTS `meal_learning_items`;
DROP TABLE IF EXISTS `meal_survey_questions`;
DROP TABLE IF EXISTS `meal_survey_standards`;
DROP TABLE IF EXISTS `meal_survey_submissions`;
DROP TABLE IF EXISTS `meal_surveys`;
DROP TABLE IF EXISTS `microsoft_integrations`;
DROP TABLE IF EXISTS `monthly_report_audit_history`;
DROP TABLE IF EXISTS `monthly_reports`;
DROP TABLE IF EXISTS `notification_event_settings`;
DROP TABLE IF EXISTS `notification_outbox`;
DROP TABLE IF EXISTS `notification_preferences`;
DROP TABLE IF EXISTS `operating_units`;
DROP TABLE IF EXISTS `opportunities`;
DROP TABLE IF EXISTS `option_set_values`;
DROP TABLE IF EXISTS `option_sets`;
DROP TABLE IF EXISTS `organization_branding`;
DROP TABLE IF EXISTS `organizations`;
DROP TABLE IF EXISTS `payment_lines`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `permission_reviews`;
DROP TABLE IF EXISTS `pipeline_opportunities`;
DROP TABLE IF EXISTS `procurement_number_sequences`;
DROP TABLE IF EXISTS `procurement_payments`;
DROP TABLE IF EXISTS `procurement_plan`;
DROP TABLE IF EXISTS `project_plan_activities`;
DROP TABLE IF EXISTS `project_plan_objectives`;
DROP TABLE IF EXISTS `project_plan_results`;
DROP TABLE IF EXISTS `project_plan_tasks`;
DROP TABLE IF EXISTS `project_reporting_schedules`;
DROP TABLE IF EXISTS `projects`;
DROP TABLE IF EXISTS `proposals`;
DROP TABLE IF EXISTS `pss_sessions`;
DROP TABLE IF EXISTS `purchase_order_line_items`;
DROP TABLE IF EXISTS `purchase_orders`;
DROP TABLE IF EXISTS `purchase_request_line_items`;
DROP TABLE IF EXISTS `purchase_requests`;
DROP TABLE IF EXISTS `purge_notifications`;
DROP TABLE IF EXISTS `quotation_analyses`;
DROP TABLE IF EXISTS `quotation_analysis_line_items`;
DROP TABLE IF EXISTS `quotation_analysis_suppliers`;
DROP TABLE IF EXISTS `rbac_roles`;
DROP TABLE IF EXISTS `rbac_user_permissions`;
DROP TABLE IF EXISTS `reporting_schedules`;
DROP TABLE IF EXISTS `retention_policies`;
DROP TABLE IF EXISTS `returned_item_line_items`;
DROP TABLE IF EXISTS `returned_items`;
DROP TABLE IF EXISTS `settlement_lines`;
DROP TABLE IF EXISTS `stock_issued`;
DROP TABLE IF EXISTS `stock_issued_line_items`;
DROP TABLE IF EXISTS `stock_items`;
DROP TABLE IF EXISTS `stock_request_line_items`;
DROP TABLE IF EXISTS `stock_requests`;
DROP TABLE IF EXISTS `suppliers`;
DROP TABLE IF EXISTS `systemImportReports`;
DROP TABLE IF EXISTS `system_settings`;
DROP TABLE IF EXISTS `tasks`;
DROP TABLE IF EXISTS `trip_logs`;
DROP TABLE IF EXISTS `user_archive_log`;
DROP TABLE IF EXISTS `user_operating_units`;
DROP TABLE IF EXISTS `user_organizations`;
DROP TABLE IF EXISTS `user_permission_overrides`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `variance_alert_config`;
DROP TABLE IF EXISTS `variance_alert_history`;
DROP TABLE IF EXISTS `variance_alert_thresholds`;
DROP TABLE IF EXISTS `variance_alerts`;
DROP TABLE IF EXISTS `vehicle_assignments`;
DROP TABLE IF EXISTS `vehicle_compliance`;
DROP TABLE IF EXISTS `vehicle_maintenance`;
DROP TABLE IF EXISTS `vehicles`;
DROP TABLE IF EXISTS `vendors`;

-- STEP 4: RENAME NEW TABLES TO ORIGINAL NAMES

RENAME TABLE `activities_new` TO `activities`;
RENAME TABLE `allocation_bases_new` TO `allocation_bases`;
RENAME TABLE `allocation_keys_new` TO `allocation_keys`;
RENAME TABLE `allocation_periods_new` TO `allocation_periods`;
RENAME TABLE `allocation_results_new` TO `allocation_results`;
RENAME TABLE `allocation_reversals_new` TO `allocation_reversals`;
RENAME TABLE `allocation_rules_new` TO `allocation_rules`;
RENAME TABLE `allocation_template_rules_new` TO `allocation_template_rules`;
RENAME TABLE `allocation_templates_new` TO `allocation_templates`;
RENAME TABLE `asset_depreciation_schedule_new` TO `asset_depreciation_schedule`;
RENAME TABLE `audit_log_export_history_new` TO `audit_log_export_history`;
RENAME TABLE `audit_log_export_schedules_new` TO `audit_log_export_schedules`;
RENAME TABLE `audit_logs_new` TO `audit_logs`;
RENAME TABLE `bank_reconciliations_new` TO `bank_reconciliations`;
RENAME TABLE `bank_transactions_new` TO `bank_transactions`;
RENAME TABLE `beneficiaries_new` TO `beneficiaries`;
RENAME TABLE `bid_analyses_new` TO `bid_analyses`;
RENAME TABLE `bid_analysis_bidders_new` TO `bid_analysis_bidders`;
RENAME TABLE `bid_evaluation_criteria_new` TO `bid_evaluation_criteria`;
RENAME TABLE `bid_evaluation_scores_new` TO `bid_evaluation_scores`;
RENAME TABLE `bid_opening_minutes_new` TO `bid_opening_minutes`;
RENAME TABLE `budget_items_new` TO `budget_items`;
RENAME TABLE `budget_lines_new` TO `budget_lines`;
RENAME TABLE `budget_monthly_allocations_new` TO `budget_monthly_allocations`;
RENAME TABLE `budget_reallocation_lines_new` TO `budget_reallocation_lines`;
RENAME TABLE `budget_reallocations_new` TO `budget_reallocations`;
RENAME TABLE `budgets_new` TO `budgets`;
RENAME TABLE `case_activities_new` TO `case_activities`;
RENAME TABLE `case_records_new` TO `case_records`;
RENAME TABLE `case_referrals_new` TO `case_referrals`;
RENAME TABLE `chart_of_accounts_new` TO `chart_of_accounts`;
RENAME TABLE `child_safe_spaces_new` TO `child_safe_spaces`;
RENAME TABLE `cost_centers_new` TO `cost_centers`;
RENAME TABLE `cost_pool_transactions_new` TO `cost_pool_transactions`;
RENAME TABLE `cost_pools_new` TO `cost_pools`;
RENAME TABLE `css_activities_new` TO `css_activities`;
RENAME TABLE `donor_budget_mapping_new` TO `donor_budget_mapping`;
RENAME TABLE `donor_communications_new` TO `donor_communications`;
RENAME TABLE `donor_projects_new` TO `donor_projects`;
RENAME TABLE `donor_reports_new` TO `donor_reports`;
RENAME TABLE `donors_new` TO `donors`;
RENAME TABLE `drivers_new` TO `drivers`;
RENAME TABLE `email_provider_settings_new` TO `email_provider_settings`;
RENAME TABLE `email_templates_new` TO `email_templates`;
RENAME TABLE `expenditures_new` TO `expenditures`;
RENAME TABLE `expenses_new` TO `expenses`;
RENAME TABLE `finance_advances_new` TO `finance_advances`;
RENAME TABLE `finance_approval_thresholds_new` TO `finance_approval_thresholds`;
RENAME TABLE `finance_asset_categories_new` TO `finance_asset_categories`;
RENAME TABLE `finance_asset_disposals_new` TO `finance_asset_disposals`;
RENAME TABLE `finance_asset_maintenance_new` TO `finance_asset_maintenance`;
RENAME TABLE `finance_asset_transfers_new` TO `finance_asset_transfers`;
RENAME TABLE `finance_assets_new` TO `finance_assets`;
RENAME TABLE `finance_bank_accounts_new` TO `finance_bank_accounts`;
RENAME TABLE `finance_budget_categories_new` TO `finance_budget_categories`;
RENAME TABLE `finance_cash_transactions_new` TO `finance_cash_transactions`;
RENAME TABLE `finance_currencies_new` TO `finance_currencies`;
RENAME TABLE `finance_exchange_rates_new` TO `finance_exchange_rates`;
RENAME TABLE `finance_fiscal_years_new` TO `finance_fiscal_years`;
RENAME TABLE `finance_fund_balances_new` TO `finance_fund_balances`;
RENAME TABLE `finance_permissions_new` TO `finance_permissions`;
RENAME TABLE `finance_role_permissions_new` TO `finance_role_permissions`;
RENAME TABLE `finance_roles_new` TO `finance_roles`;
RENAME TABLE `finance_settlements_new` TO `finance_settlements`;
RENAME TABLE `finance_user_roles_new` TO `finance_user_roles`;
RENAME TABLE `fiscal_periods_new` TO `fiscal_periods`;
RENAME TABLE `forecast_audit_log_new` TO `forecast_audit_log`;
RENAME TABLE `forecast_plan_new` TO `forecast_plan`;
RENAME TABLE `fuel_logs_new` TO `fuel_logs`;
RENAME TABLE `gl_account_categories_new` TO `gl_account_categories`;
RENAME TABLE `gl_accounts_new` TO `gl_accounts`;
RENAME TABLE `globalSettings_new` TO `globalSettings`;
RENAME TABLE `goods_receipt_notes_new` TO `goods_receipt_notes`;
RENAME TABLE `grant_documents_new` TO `grant_documents`;
RENAME TABLE `grants_new` TO `grants`;
RENAME TABLE `grn_line_items_new` TO `grn_line_items`;
RENAME TABLE `hr_annual_plans_new` TO `hr_annual_plans`;
RENAME TABLE `hr_attendance_records_new` TO `hr_attendance_records`;
RENAME TABLE `hr_documents_new` TO `hr_documents`;
RENAME TABLE `hr_employees_new` TO `hr_employees`;
RENAME TABLE `hr_leave_balances_new` TO `hr_leave_balances`;
RENAME TABLE `hr_leave_requests_new` TO `hr_leave_requests`;
RENAME TABLE `hr_payroll_records_new` TO `hr_payroll_records`;
RENAME TABLE `hr_recruitment_candidates_new` TO `hr_recruitment_candidates`;
RENAME TABLE `hr_recruitment_jobs_new` TO `hr_recruitment_jobs`;
RENAME TABLE `hr_salary_grades_new` TO `hr_salary_grades`;
RENAME TABLE `hr_salary_scale_new` TO `hr_salary_scale`;
RENAME TABLE `hr_sanctions_new` TO `hr_sanctions`;
RENAME TABLE `import_history_new` TO `import_history`;
RENAME TABLE `indicators_new` TO `indicators`;
RENAME TABLE `invitations_new` TO `invitations`;
RENAME TABLE `journal_entries_new` TO `journal_entries`;
RENAME TABLE `journal_lines_new` TO `journal_lines`;
RENAME TABLE `landing_settings_new` TO `landing_settings`;
RENAME TABLE `meal_accountability_records_new` TO `meal_accountability_records`;
RENAME TABLE `meal_audit_log_new` TO `meal_audit_log`;
RENAME TABLE `meal_documents_new` TO `meal_documents`;
RENAME TABLE `meal_dqa_actions_new` TO `meal_dqa_actions`;
RENAME TABLE `meal_dqa_findings_new` TO `meal_dqa_findings`;
RENAME TABLE `meal_dqa_visits_new` TO `meal_dqa_visits`;
RENAME TABLE `meal_indicator_data_entries_new` TO `meal_indicator_data_entries`;
RENAME TABLE `meal_indicator_templates_new` TO `meal_indicator_templates`;
RENAME TABLE `meal_learning_actions_new` TO `meal_learning_actions`;
RENAME TABLE `meal_learning_items_new` TO `meal_learning_items`;
RENAME TABLE `meal_survey_questions_new` TO `meal_survey_questions`;
RENAME TABLE `meal_survey_standards_new` TO `meal_survey_standards`;
RENAME TABLE `meal_survey_submissions_new` TO `meal_survey_submissions`;
RENAME TABLE `meal_surveys_new` TO `meal_surveys`;
RENAME TABLE `microsoft_integrations_new` TO `microsoft_integrations`;
RENAME TABLE `monthly_report_audit_history_new` TO `monthly_report_audit_history`;
RENAME TABLE `monthly_reports_new` TO `monthly_reports`;
RENAME TABLE `notification_event_settings_new` TO `notification_event_settings`;
RENAME TABLE `notification_outbox_new` TO `notification_outbox`;
RENAME TABLE `notification_preferences_new` TO `notification_preferences`;
RENAME TABLE `operating_units_new` TO `operating_units`;
RENAME TABLE `opportunities_new` TO `opportunities`;
RENAME TABLE `option_set_values_new` TO `option_set_values`;
RENAME TABLE `option_sets_new` TO `option_sets`;
RENAME TABLE `organization_branding_new` TO `organization_branding`;
RENAME TABLE `organizations_new` TO `organizations`;
RENAME TABLE `payment_lines_new` TO `payment_lines`;
RENAME TABLE `payments_new` TO `payments`;
RENAME TABLE `permission_reviews_new` TO `permission_reviews`;
RENAME TABLE `pipeline_opportunities_new` TO `pipeline_opportunities`;
RENAME TABLE `procurement_number_sequences_new` TO `procurement_number_sequences`;
RENAME TABLE `procurement_payments_new` TO `procurement_payments`;
RENAME TABLE `procurement_plan_new` TO `procurement_plan`;
RENAME TABLE `project_plan_activities_new` TO `project_plan_activities`;
RENAME TABLE `project_plan_objectives_new` TO `project_plan_objectives`;
RENAME TABLE `project_plan_results_new` TO `project_plan_results`;
RENAME TABLE `project_plan_tasks_new` TO `project_plan_tasks`;
RENAME TABLE `project_reporting_schedules_new` TO `project_reporting_schedules`;
RENAME TABLE `projects_new` TO `projects`;
RENAME TABLE `proposals_new` TO `proposals`;
RENAME TABLE `pss_sessions_new` TO `pss_sessions`;
RENAME TABLE `purchase_order_line_items_new` TO `purchase_order_line_items`;
RENAME TABLE `purchase_orders_new` TO `purchase_orders`;
RENAME TABLE `purchase_request_line_items_new` TO `purchase_request_line_items`;
RENAME TABLE `purchase_requests_new` TO `purchase_requests`;
RENAME TABLE `purge_notifications_new` TO `purge_notifications`;
RENAME TABLE `quotation_analyses_new` TO `quotation_analyses`;
RENAME TABLE `quotation_analysis_line_items_new` TO `quotation_analysis_line_items`;
RENAME TABLE `quotation_analysis_suppliers_new` TO `quotation_analysis_suppliers`;
RENAME TABLE `rbac_roles_new` TO `rbac_roles`;
RENAME TABLE `rbac_user_permissions_new` TO `rbac_user_permissions`;
RENAME TABLE `reporting_schedules_new` TO `reporting_schedules`;
RENAME TABLE `retention_policies_new` TO `retention_policies`;
RENAME TABLE `returned_item_line_items_new` TO `returned_item_line_items`;
RENAME TABLE `returned_items_new` TO `returned_items`;
RENAME TABLE `settlement_lines_new` TO `settlement_lines`;
RENAME TABLE `stock_issued_new` TO `stock_issued`;
RENAME TABLE `stock_issued_line_items_new` TO `stock_issued_line_items`;
RENAME TABLE `stock_items_new` TO `stock_items`;
RENAME TABLE `stock_request_line_items_new` TO `stock_request_line_items`;
RENAME TABLE `stock_requests_new` TO `stock_requests`;
RENAME TABLE `suppliers_new` TO `suppliers`;
RENAME TABLE `systemImportReports_new` TO `systemImportReports`;
RENAME TABLE `system_settings_new` TO `system_settings`;
RENAME TABLE `tasks_new` TO `tasks`;
RENAME TABLE `trip_logs_new` TO `trip_logs`;
RENAME TABLE `user_archive_log_new` TO `user_archive_log`;
RENAME TABLE `user_operating_units_new` TO `user_operating_units`;
RENAME TABLE `user_organizations_new` TO `user_organizations`;
RENAME TABLE `user_permission_overrides_new` TO `user_permission_overrides`;
RENAME TABLE `users_new` TO `users`;
RENAME TABLE `variance_alert_config_new` TO `variance_alert_config`;
RENAME TABLE `variance_alert_history_new` TO `variance_alert_history`;
RENAME TABLE `variance_alert_thresholds_new` TO `variance_alert_thresholds`;
RENAME TABLE `variance_alerts_new` TO `variance_alerts`;
RENAME TABLE `vehicle_assignments_new` TO `vehicle_assignments`;
RENAME TABLE `vehicle_compliance_new` TO `vehicle_compliance`;
RENAME TABLE `vehicle_maintenance_new` TO `vehicle_maintenance`;
RENAME TABLE `vehicles_new` TO `vehicles`;
RENAME TABLE `vendors_new` TO `vendors`;

SET FOREIGN_KEY_CHECKS = 1;

-- Migration complete!