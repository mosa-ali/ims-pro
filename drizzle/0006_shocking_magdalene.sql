ALTER TABLE `finance_currencies` RENAME COLUMN `exchangeRateToUsd` TO `exchangeRate`;--> statement-breakpoint
ALTER TABLE `purchase_request_line_items` MODIFY COLUMN `recurrence` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `purchase_request_line_items` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `submittedAt` timestamp;--> statement-breakpoint
ALTER TABLE `purchase_request_line_items` ADD CONSTRAINT `purchase_request_line_items_purchaseRequestId_purchase_requests_id_fk` FOREIGN KEY (`purchaseRequestId`) REFERENCES `purchase_requests`(`id`) ON DELETE cascade ON UPDATE no action;