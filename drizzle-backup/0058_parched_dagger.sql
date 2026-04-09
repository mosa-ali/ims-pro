ALTER TABLE `bid_analyses` ADD `announcementStartDate` timestamp;--> statement-breakpoint
ALTER TABLE `bid_analyses` ADD `announcementEndDate` timestamp;--> statement-breakpoint
ALTER TABLE `bid_analyses` ADD `announcementChannel` enum('website','newspaper','donor_portal','other');--> statement-breakpoint
ALTER TABLE `bid_analyses` ADD `announcementLink` text;--> statement-breakpoint
ALTER TABLE `bid_analyses` ADD `announcementReference` varchar(100);--> statement-breakpoint
ALTER TABLE `bid_analyses` ADD `numberOfBidders` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `bid_analysis_bidders` ADD `submissionDate` timestamp;--> statement-breakpoint
ALTER TABLE `bid_analysis_bidders` ADD `submissionStatus` enum('received','valid','disqualified') DEFAULT 'received';--> statement-breakpoint
ALTER TABLE `bid_opening_minutes` ADD `openingTime` varchar(10);--> statement-breakpoint
ALTER TABLE `bid_opening_minutes` ADD `openingVenue` varchar(255);--> statement-breakpoint
ALTER TABLE `bid_opening_minutes` ADD `openingMode` enum('physical','online','hybrid') DEFAULT 'physical';