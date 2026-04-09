ALTER TABLE `goods_receipt_notes` MODIFY COLUMN `createdBy` int;--> statement-breakpoint
ALTER TABLE `goods_receipt_notes` DROP COLUMN `inspectionStatus`;--> statement-breakpoint
ALTER TABLE `goods_receipt_notes` DROP COLUMN `inspectionNotes`;