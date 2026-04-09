ALTER TABLE `rfq_vendors` ADD `rfqNumber` varchar(100);--> statement-breakpoint
ALTER TABLE `rfq_vendors` ADD `supplierQuoteNumber` varchar(100);--> statement-breakpoint
ALTER TABLE `rfq_vendors` ADD CONSTRAINT `rfq_vendors_rfqNumber_unique` UNIQUE(`rfqNumber`);