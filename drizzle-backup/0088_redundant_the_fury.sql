ALTER TABLE `bid_analysis_bidders` ADD `bidReceiptAcknowledgementPrinted` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `bid_analysis_bidders` ADD `acknowledgementPrintedAt` timestamp;--> statement-breakpoint
ALTER TABLE `bid_analysis_bidders` ADD `acknowledgementPrintedBy` int;--> statement-breakpoint
ALTER TABLE `bid_analysis_bidders` ADD CONSTRAINT `bid_analysis_bidders_acknowledgementPrintedBy_users_id_fk` FOREIGN KEY (`acknowledgementPrintedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;