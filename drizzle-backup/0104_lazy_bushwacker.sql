ALTER TABLE `delivery_notes` DROP FOREIGN KEY `delivery_notes_poId_purchase_orders_id_fk`;
--> statement-breakpoint
ALTER TABLE `delivery_notes` ADD CONSTRAINT `delivery_notes_poId_purchase_orders_id_fk` FOREIGN KEY (`poId`) REFERENCES `purchase_orders`(`id`) ON DELETE cascade ON UPDATE no action;