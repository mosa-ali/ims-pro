ALTER TABLE `beneficiaries` MODIFY COLUMN `serviceType` enum('TRAINING','WORKSHOP','ITEMS_DISTRIBUTION','PSS','OTHER');--> statement-breakpoint
ALTER TABLE `beneficiaries` ADD `identificationType` enum('ID_CARD','PASSPORT','FAMILY_CARD','OTHER');--> statement-breakpoint
ALTER TABLE `beneficiaries` ADD `identificationTypeOther` varchar(255);--> statement-breakpoint
ALTER TABLE `beneficiaries` ADD `identificationNumber` varchar(100);--> statement-breakpoint
ALTER TABLE `beneficiaries` ADD `identificationAttachment` varchar(500);--> statement-breakpoint
ALTER TABLE `beneficiaries` ADD `country` varchar(100);--> statement-breakpoint
ALTER TABLE `beneficiaries` ADD `communityType` enum('IDP','REFUGEE','HOST_COMMUNITY','RETURNEE','OTHER');--> statement-breakpoint
ALTER TABLE `beneficiaries` ADD `communityTypeOther` varchar(255);--> statement-breakpoint
ALTER TABLE `beneficiaries` ADD `vulnerabilityOther` varchar(255);--> statement-breakpoint
ALTER TABLE `beneficiaries` ADD `activityId` int;--> statement-breakpoint
ALTER TABLE `beneficiaries` ADD `serviceTypeOther` varchar(255);--> statement-breakpoint
ALTER TABLE `beneficiaries` ADD `verificationStatus` enum('VERIFIED','NOT_ELIGIBLE','PENDING') DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE `beneficiaries` ADD `verifiedBy` varchar(255);--> statement-breakpoint
ALTER TABLE `beneficiaries` ADD `verificationDate` date;--> statement-breakpoint
ALTER TABLE `beneficiaries` ADD CONSTRAINT `beneficiaries_activityId_activities_id_fk` FOREIGN KEY (`activityId`) REFERENCES `activities`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `beneficiaries` DROP COLUMN `nationalId`;