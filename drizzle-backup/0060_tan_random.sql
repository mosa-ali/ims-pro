ALTER TABLE `bid_evaluation_criteria` ADD `sectionNumber` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `bid_evaluation_criteria` ADD `sectionName` varchar(255);--> statement-breakpoint
ALTER TABLE `bid_evaluation_criteria` ADD `sectionNameAr` varchar(255);--> statement-breakpoint
ALTER TABLE `bid_evaluation_criteria` ADD `nameAr` varchar(255);--> statement-breakpoint
ALTER TABLE `bid_evaluation_criteria` ADD `stage` varchar(255) DEFAULT 'MUST be Submitted with the Bid';--> statement-breakpoint
ALTER TABLE `bid_evaluation_criteria` ADD `stageAr` varchar(255);--> statement-breakpoint
ALTER TABLE `bid_evaluation_criteria` ADD `isScreening` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `bid_evaluation_criteria` ADD `isApplicable` boolean DEFAULT true;