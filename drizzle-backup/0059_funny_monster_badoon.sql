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
ALTER TABLE `quotation_analysis_line_items` ADD CONSTRAINT `quotation_analysis_line_items_quotationAnalysisId_quotation_analyses_id_fk` FOREIGN KEY (`quotationAnalysisId`) REFERENCES `quotation_analyses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotation_analysis_line_items` ADD CONSTRAINT `quotation_analysis_line_items_lineItemId_purchase_request_line_items_id_fk` FOREIGN KEY (`lineItemId`) REFERENCES `purchase_request_line_items`(`id`) ON DELETE cascade ON UPDATE no action;