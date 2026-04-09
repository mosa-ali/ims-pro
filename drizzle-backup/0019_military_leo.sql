ALTER TABLE `opportunities` ADD `fundingId` varchar(36);--> statement-breakpoint
ALTER TABLE `pipeline_opportunities` ADD `fundingId` varchar(36);--> statement-breakpoint
ALTER TABLE `proposals` ADD `fundingId` varchar(36);