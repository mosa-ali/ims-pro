ALTER TABLE `purchase_requests` ADD `logisticsSignerName` varchar(255);--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `logisticsSignerTitle` varchar(255);--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `logisticsSignatureDataUrl` longtext;--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `financeSignerName` varchar(255);--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `financeSignerTitle` varchar(255);--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `financeSignatureDataUrl` longtext;--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `pmSignerName` varchar(255);--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `pmSignerTitle` varchar(255);--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `pmSignatureDataUrl` longtext;