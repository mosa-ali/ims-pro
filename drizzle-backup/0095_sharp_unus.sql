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
	`changedBy` int NOT NULL,
	`changedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quotation_analysis_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `quotation_analysis_audit_log` ADD CONSTRAINT `quotation_analysis_audit_log_quotationAnalysisId_quotation_analyses_id_fk` FOREIGN KEY (`quotationAnalysisId`) REFERENCES `quotation_analyses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotation_analysis_audit_log` ADD CONSTRAINT `quotation_analysis_audit_log_changedBy_users_id_fk` FOREIGN KEY (`changedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;