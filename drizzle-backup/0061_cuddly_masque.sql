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
ALTER TABLE `bid_evaluation_scores` ADD CONSTRAINT `bid_evaluation_scores_bidAnalysisId_bid_analyses_id_fk` FOREIGN KEY (`bidAnalysisId`) REFERENCES `bid_analyses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_evaluation_scores` ADD CONSTRAINT `bid_evaluation_scores_criterionId_bid_evaluation_criteria_id_fk` FOREIGN KEY (`criterionId`) REFERENCES `bid_evaluation_criteria`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_evaluation_scores` ADD CONSTRAINT `bid_evaluation_scores_bidderId_bid_analysis_bidders_id_fk` FOREIGN KEY (`bidderId`) REFERENCES `bid_analysis_bidders`(`id`) ON DELETE cascade ON UPDATE no action;