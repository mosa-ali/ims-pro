ALTER TABLE `procurement_payables` MODIFY COLUMN `status` enum('draft','pending_grn','pending_invoice','pending_approval','pending_payment','partially_paid','fully_paid','cancelled') DEFAULT 'pending_invoice';--> statement-breakpoint
ALTER TABLE `procurement_payables` ADD `grnId` int;--> statement-breakpoint
ALTER TABLE `procurement_payables` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `procurement_payables` ADD `deletedBy` int;