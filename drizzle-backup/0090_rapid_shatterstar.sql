CREATE TABLE `rfq_vendor_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rfqVendorId` int NOT NULL,
	`prLineItemId` int NOT NULL,
	`quotedUnitPrice` decimal(15,2) NOT NULL,
	`quotedTotalPrice` decimal(15,2) NOT NULL,
	`itemNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rfq_vendor_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP TABLE `suppliers`;--> statement-breakpoint
ALTER TABLE `bid_analyses` DROP FOREIGN KEY `bid_analyses_selectedBidderId_suppliers_id_fk`;
--> statement-breakpoint
ALTER TABLE `bid_analysis_bidders` DROP FOREIGN KEY `bid_analysis_bidders_supplierId_suppliers_id_fk`;
--> statement-breakpoint
ALTER TABLE `goods_receipt_notes` DROP FOREIGN KEY `goods_receipt_notes_supplierId_suppliers_id_fk`;
--> statement-breakpoint
ALTER TABLE `procurement_payments` DROP FOREIGN KEY `procurement_payments_supplierId_suppliers_id_fk`;
--> statement-breakpoint
ALTER TABLE `purchase_orders` DROP FOREIGN KEY `purchase_orders_supplierId_suppliers_id_fk`;
--> statement-breakpoint
ALTER TABLE `quotation_analyses` DROP FOREIGN KEY `quotation_analyses_selectedSupplierId_suppliers_id_fk`;
--> statement-breakpoint
ALTER TABLE `quotation_analysis_suppliers` DROP FOREIGN KEY `quotation_analysis_suppliers_supplierId_suppliers_id_fk`;
--> statement-breakpoint
ALTER TABLE `rfq_vendors` DROP FOREIGN KEY `rfq_vendors_supplierId_suppliers_id_fk`;
--> statement-breakpoint
ALTER TABLE `vendors` ADD `nameAr` varchar(255);--> statement-breakpoint
ALTER TABLE `rfq_vendor_items` ADD CONSTRAINT `rfq_vendor_items_rfqVendorId_rfq_vendors_id_fk` FOREIGN KEY (`rfqVendorId`) REFERENCES `rfq_vendors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rfq_vendor_items` ADD CONSTRAINT `rfq_vendor_items_prLineItemId_purchase_request_line_items_id_fk` FOREIGN KEY (`prLineItemId`) REFERENCES `purchase_request_line_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_analyses` ADD CONSTRAINT `bid_analyses_selectedBidderId_vendors_id_fk` FOREIGN KEY (`selectedBidderId`) REFERENCES `vendors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_analysis_bidders` ADD CONSTRAINT `bid_analysis_bidders_supplierId_vendors_id_fk` FOREIGN KEY (`supplierId`) REFERENCES `vendors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `goods_receipt_notes` ADD CONSTRAINT `goods_receipt_notes_supplierId_vendors_id_fk` FOREIGN KEY (`supplierId`) REFERENCES `vendors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `procurement_payments` ADD CONSTRAINT `procurement_payments_supplierId_vendors_id_fk` FOREIGN KEY (`supplierId`) REFERENCES `vendors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_supplierId_vendors_id_fk` FOREIGN KEY (`supplierId`) REFERENCES `vendors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotation_analyses` ADD CONSTRAINT `quotation_analyses_selectedSupplierId_vendors_id_fk` FOREIGN KEY (`selectedSupplierId`) REFERENCES `vendors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotation_analysis_suppliers` ADD CONSTRAINT `quotation_analysis_suppliers_supplierId_vendors_id_fk` FOREIGN KEY (`supplierId`) REFERENCES `vendors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rfq_vendors` ADD CONSTRAINT `rfq_vendors_supplierId_vendors_id_fk` FOREIGN KEY (`supplierId`) REFERENCES `vendors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendors` DROP COLUMN `blacklistDate`;--> statement-breakpoint
ALTER TABLE `vendors` DROP COLUMN `legalName`;--> statement-breakpoint
ALTER TABLE `vendors` DROP COLUMN `legalNameAr`;--> statement-breakpoint
ALTER TABLE `vendors` DROP COLUMN `tradeName`;--> statement-breakpoint
ALTER TABLE `vendors` DROP COLUMN `sanctionsScreened`;--> statement-breakpoint
ALTER TABLE `vendors` DROP COLUMN `sanctionsScreenedDate`;--> statement-breakpoint
ALTER TABLE `vendors` DROP COLUMN `sanctionsScreenedBy`;--> statement-breakpoint
ALTER TABLE `vendors` DROP COLUMN `hasFrameworkAgreement`;--> statement-breakpoint
ALTER TABLE `vendors` DROP COLUMN `frameworkAgreementExpiry`;--> statement-breakpoint
ALTER TABLE `vendors` DROP COLUMN `frameworkAgreementReference`;--> statement-breakpoint
ALTER TABLE `vendors` DROP COLUMN `performanceRating`;--> statement-breakpoint
ALTER TABLE `vendors` DROP COLUMN `totalPRParticipations`;--> statement-breakpoint
ALTER TABLE `vendors` DROP COLUMN `totalContractsAwarded`;--> statement-breakpoint
ALTER TABLE `vendors` DROP COLUMN `totalContractsValue`;--> statement-breakpoint
ALTER TABLE `vendors` DROP COLUMN `totalPurchaseOrders`;--> statement-breakpoint
ALTER TABLE `vendors` DROP COLUMN `totalPurchaseOrdersValue`;--> statement-breakpoint
ALTER TABLE `vendors` DROP COLUMN `onTimeDeliveryRate`;--> statement-breakpoint
ALTER TABLE `vendors` DROP COLUMN `qualityRating`;--> statement-breakpoint
ALTER TABLE `vendors` DROP COLUMN `lastEvaluationDate`;--> statement-breakpoint
ALTER TABLE `vendors` DROP COLUMN `lastEvaluationScore`;--> statement-breakpoint
ALTER TABLE `vendors` DROP COLUMN `procurementCategories`;--> statement-breakpoint
ALTER TABLE `vendors` DROP COLUMN `primaryCategory`;--> statement-breakpoint
ALTER TABLE `vendors` DROP COLUMN `riskLevel`;--> statement-breakpoint
ALTER TABLE `vendors` DROP COLUMN `riskFlags`;--> statement-breakpoint
ALTER TABLE `vendors` DROP COLUMN `complianceStatus`;--> statement-breakpoint
ALTER TABLE `vendors` DROP COLUMN `lastComplianceCheck`;--> statement-breakpoint
ALTER TABLE `vendors` DROP COLUMN `isFinanciallyActive`;--> statement-breakpoint
ALTER TABLE `vendors` DROP COLUMN `financialActivationDate`;--> statement-breakpoint
ALTER TABLE `vendors` DROP COLUMN `financialActivatedBy`;--> statement-breakpoint
ALTER TABLE `vendors` DROP COLUMN `approvalStatus`;--> statement-breakpoint
ALTER TABLE `vendors` DROP COLUMN `approvedBy`;--> statement-breakpoint
ALTER TABLE `vendors` DROP COLUMN `approvedAt`;--> statement-breakpoint
ALTER TABLE `vendors` DROP COLUMN `sourceModule`;--> statement-breakpoint
ALTER TABLE `vendors` DROP COLUMN `sourceReferenceId`;--> statement-breakpoint
ALTER TABLE `vendors` DROP COLUMN `sourceReferenceType`;