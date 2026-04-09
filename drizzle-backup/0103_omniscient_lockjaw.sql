CREATE TABLE `delivery_note_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dnId` int NOT NULL,
	`poLineItemId` int NOT NULL,
	`lineNumber` int NOT NULL,
	`deliveredQty` decimal(10,2) NOT NULL,
	`unit` varchar(50) DEFAULT 'Piece',
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `delivery_note_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `delivery_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`dnNumber` varchar(50) NOT NULL,
	`poId` int NOT NULL,
	`grnId` int NOT NULL,
	`vendorId` int,
	`deliveryDate` timestamp NOT NULL DEFAULT (now()),
	`status` enum('delivered') NOT NULL DEFAULT 'delivered',
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	CONSTRAINT `delivery_notes_id` PRIMARY KEY(`id`),
	CONSTRAINT `delivery_notes_dnNumber_unique` UNIQUE(`dnNumber`)
);
--> statement-breakpoint
ALTER TABLE `delivery_note_lines` ADD CONSTRAINT `delivery_note_lines_dnId_delivery_notes_id_fk` FOREIGN KEY (`dnId`) REFERENCES `delivery_notes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_note_lines` ADD CONSTRAINT `delivery_note_lines_poLineItemId_purchase_order_line_items_id_fk` FOREIGN KEY (`poLineItemId`) REFERENCES `purchase_order_line_items`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_notes` ADD CONSTRAINT `delivery_notes_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_notes` ADD CONSTRAINT `delivery_notes_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_notes` ADD CONSTRAINT `delivery_notes_poId_purchase_orders_id_fk` FOREIGN KEY (`poId`) REFERENCES `purchase_orders`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_notes` ADD CONSTRAINT `delivery_notes_grnId_goods_receipt_notes_id_fk` FOREIGN KEY (`grnId`) REFERENCES `goods_receipt_notes`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_notes` ADD CONSTRAINT `delivery_notes_vendorId_vendors_id_fk` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_notes` ADD CONSTRAINT `delivery_notes_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;