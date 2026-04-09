CREATE TABLE `procurement_audit_trail` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`documentType` enum('PR','RFQ','QA','BA','PO','GRN','ISSUE','TRANSFER','PAYMENT') NOT NULL,
	`documentId` int NOT NULL,
	`documentNumber` varchar(50),
	`actionType` varchar(100) NOT NULL,
	`fieldChanges` json,
	`userId` int,
	`userName` varchar(255),
	`userRole` varchar(100),
	`ipAddress` varchar(45),
	`userAgent` text,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `procurement_audit_trail_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_batches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`batchNumber` varchar(100) NOT NULL,
	`grnLineItemId` int,
	`itemId` int NOT NULL,
	`warehouseId` int,
	`warehouseName` varchar(255),
	`receivedQty` decimal(15,2) NOT NULL DEFAULT '0',
	`acceptedQty` decimal(15,2) NOT NULL DEFAULT '0',
	`reservedQty` decimal(15,2) NOT NULL DEFAULT '0',
	`issuedQty` decimal(15,2) NOT NULL DEFAULT '0',
	`lossAdjustments` decimal(15,2) NOT NULL DEFAULT '0',
	`returnsAccepted` decimal(15,2) NOT NULL DEFAULT '0',
	`expiryDate` timestamp,
	`lotNumber` varchar(100),
	`serialNumber` varchar(100),
	`unitCost` decimal(15,2) NOT NULL DEFAULT '0',
	`batchStatus` enum('available','reserved','depleted','expired','quarantined') NOT NULL DEFAULT 'available',
	`receivedDate` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stock_batches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_issue_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`issueId` int NOT NULL,
	`itemId` int NOT NULL,
	`batchId` int NOT NULL,
	`qtyIssued` decimal(15,2) NOT NULL,
	`unit` varchar(50) DEFAULT 'Piece',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stock_issue_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_issues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`issueNumber` varchar(50) NOT NULL,
	`issueDate` timestamp NOT NULL DEFAULT (now()),
	`issuedTo` varchar(255) NOT NULL,
	`issuedToType` enum('person','department','project','activity') NOT NULL DEFAULT 'person',
	`projectId` int,
	`activityId` int,
	`departmentId` int,
	`warehouseId` int,
	`warehouseName` varchar(255),
	`purpose` text,
	`status` enum('draft','submitted','issued','acknowledged','cancelled') NOT NULL DEFAULT 'draft',
	`issuedBy` int,
	`acknowledgedBy` varchar(255),
	`acknowledgedAt` timestamp,
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stock_issues_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_stock_issues_number` UNIQUE(`organizationId`,`issueNumber`)
);
--> statement-breakpoint
CREATE TABLE `stock_ledger` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`movementType` enum('GRN_IN','ISSUE_OUT','TRANSFER_OUT','TRANSFER_IN','ADJUSTMENT_IN','ADJUSTMENT_OUT','RETURN_IN','LOSS') NOT NULL,
	`referenceType` enum('GRN','ISSUE','TRANSFER','ADJUSTMENT','RETURN') NOT NULL,
	`referenceId` int NOT NULL,
	`referenceNumber` varchar(50),
	`warehouseId` int,
	`warehouseName` varchar(255),
	`batchId` int NOT NULL,
	`itemId` int NOT NULL,
	`qtyChange` decimal(15,2) NOT NULL,
	`unit` varchar(50) DEFAULT 'Piece',
	`unitCost` decimal(15,2) DEFAULT '0',
	`totalValue` decimal(15,2) DEFAULT '0',
	`userId` int,
	`notes` text,
	`transactionDate` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stock_ledger_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_reservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`batchId` int NOT NULL,
	`itemId` int NOT NULL,
	`reservedQty` decimal(15,2) NOT NULL,
	`reservedFor` varchar(255) NOT NULL,
	`reservationType` enum('issue_pending','transfer_pending','project_allocation') NOT NULL DEFAULT 'issue_pending',
	`referenceId` int,
	`reservedBy` int,
	`reservedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	`status` enum('active','fulfilled','expired','cancelled') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stock_reservations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `warehouse_transfer_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transferId` int NOT NULL,
	`itemId` int NOT NULL,
	`batchId` int NOT NULL,
	`qtyRequested` decimal(15,2) NOT NULL,
	`qtyDispatched` decimal(15,2) DEFAULT '0',
	`qtyReceived` decimal(15,2) DEFAULT '0',
	`unit` varchar(50) DEFAULT 'Piece',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `warehouse_transfer_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `warehouse_transfers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`transferNumber` varchar(50) NOT NULL,
	`fromWarehouseId` int,
	`fromWarehouseName` varchar(255) NOT NULL,
	`toWarehouseId` int,
	`toWarehouseName` varchar(255) NOT NULL,
	`projectId` int,
	`requestDate` timestamp NOT NULL DEFAULT (now()),
	`status` enum('draft','submitted','approved','dispatched','received','completed','cancelled') NOT NULL DEFAULT 'draft',
	`createdBy` int,
	`approvedBy` int,
	`dispatchedBy` int,
	`receivedBy` int,
	`approvedAt` timestamp,
	`dispatchedAt` timestamp,
	`receivedAt` timestamp,
	`completedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `warehouse_transfers_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_warehouse_transfers_number` UNIQUE(`organizationId`,`transferNumber`)
);
--> statement-breakpoint
ALTER TABLE `procurement_audit_trail` ADD CONSTRAINT `procurement_audit_trail_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `procurement_audit_trail` ADD CONSTRAINT `procurement_audit_trail_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `procurement_audit_trail` ADD CONSTRAINT `procurement_audit_trail_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_batches` ADD CONSTRAINT `stock_batches_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_batches` ADD CONSTRAINT `stock_batches_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_batches` ADD CONSTRAINT `stock_batches_grnLineItemId_grn_line_items_id_fk` FOREIGN KEY (`grnLineItemId`) REFERENCES `grn_line_items`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_batches` ADD CONSTRAINT `stock_batches_itemId_stock_items_id_fk` FOREIGN KEY (`itemId`) REFERENCES `stock_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_issue_lines` ADD CONSTRAINT `stock_issue_lines_issueId_stock_issues_id_fk` FOREIGN KEY (`issueId`) REFERENCES `stock_issues`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_issue_lines` ADD CONSTRAINT `stock_issue_lines_itemId_stock_items_id_fk` FOREIGN KEY (`itemId`) REFERENCES `stock_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_issue_lines` ADD CONSTRAINT `stock_issue_lines_batchId_stock_batches_id_fk` FOREIGN KEY (`batchId`) REFERENCES `stock_batches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_issues` ADD CONSTRAINT `stock_issues_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_issues` ADD CONSTRAINT `stock_issues_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_issues` ADD CONSTRAINT `stock_issues_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_issues` ADD CONSTRAINT `stock_issues_issuedBy_users_id_fk` FOREIGN KEY (`issuedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_ledger` ADD CONSTRAINT `stock_ledger_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_ledger` ADD CONSTRAINT `stock_ledger_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_ledger` ADD CONSTRAINT `stock_ledger_batchId_stock_batches_id_fk` FOREIGN KEY (`batchId`) REFERENCES `stock_batches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_ledger` ADD CONSTRAINT `stock_ledger_itemId_stock_items_id_fk` FOREIGN KEY (`itemId`) REFERENCES `stock_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_ledger` ADD CONSTRAINT `stock_ledger_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_reservations` ADD CONSTRAINT `stock_reservations_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_reservations` ADD CONSTRAINT `stock_reservations_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_reservations` ADD CONSTRAINT `stock_reservations_batchId_stock_batches_id_fk` FOREIGN KEY (`batchId`) REFERENCES `stock_batches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_reservations` ADD CONSTRAINT `stock_reservations_itemId_stock_items_id_fk` FOREIGN KEY (`itemId`) REFERENCES `stock_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_reservations` ADD CONSTRAINT `stock_reservations_reservedBy_users_id_fk` FOREIGN KEY (`reservedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouse_transfer_lines` ADD CONSTRAINT `warehouse_transfer_lines_transferId_warehouse_transfers_id_fk` FOREIGN KEY (`transferId`) REFERENCES `warehouse_transfers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouse_transfer_lines` ADD CONSTRAINT `warehouse_transfer_lines_itemId_stock_items_id_fk` FOREIGN KEY (`itemId`) REFERENCES `stock_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouse_transfer_lines` ADD CONSTRAINT `warehouse_transfer_lines_batchId_stock_batches_id_fk` FOREIGN KEY (`batchId`) REFERENCES `stock_batches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouse_transfers` ADD CONSTRAINT `warehouse_transfers_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouse_transfers` ADD CONSTRAINT `warehouse_transfers_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouse_transfers` ADD CONSTRAINT `warehouse_transfers_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouse_transfers` ADD CONSTRAINT `warehouse_transfers_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouse_transfers` ADD CONSTRAINT `warehouse_transfers_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouse_transfers` ADD CONSTRAINT `warehouse_transfers_dispatchedBy_users_id_fk` FOREIGN KEY (`dispatchedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouse_transfers` ADD CONSTRAINT `warehouse_transfers_receivedBy_users_id_fk` FOREIGN KEY (`receivedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_procurement_audit_org` ON `procurement_audit_trail` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_procurement_audit_document` ON `procurement_audit_trail` (`documentType`,`documentId`);--> statement-breakpoint
CREATE INDEX `idx_procurement_audit_timestamp` ON `procurement_audit_trail` (`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_stock_batches_org` ON `stock_batches` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_stock_batches_item` ON `stock_batches` (`itemId`);--> statement-breakpoint
CREATE INDEX `idx_stock_batches_expiry` ON `stock_batches` (`expiryDate`);--> statement-breakpoint
CREATE INDEX `idx_stock_batches_status` ON `stock_batches` (`batchStatus`);--> statement-breakpoint
CREATE INDEX `idx_stock_issue_lines_issue` ON `stock_issue_lines` (`issueId`);--> statement-breakpoint
CREATE INDEX `idx_stock_issue_lines_batch` ON `stock_issue_lines` (`batchId`);--> statement-breakpoint
CREATE INDEX `idx_stock_issues_org` ON `stock_issues` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_stock_issues_status` ON `stock_issues` (`status`);--> statement-breakpoint
CREATE INDEX `idx_stock_ledger_org` ON `stock_ledger` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_stock_ledger_batch` ON `stock_ledger` (`batchId`);--> statement-breakpoint
CREATE INDEX `idx_stock_ledger_item` ON `stock_ledger` (`itemId`);--> statement-breakpoint
CREATE INDEX `idx_stock_ledger_date` ON `stock_ledger` (`transactionDate`);--> statement-breakpoint
CREATE INDEX `idx_stock_ledger_movement_type` ON `stock_ledger` (`movementType`);--> statement-breakpoint
CREATE INDEX `idx_stock_reservations_batch` ON `stock_reservations` (`batchId`);--> statement-breakpoint
CREATE INDEX `idx_stock_reservations_status` ON `stock_reservations` (`status`);--> statement-breakpoint
CREATE INDEX `idx_warehouse_transfer_lines_transfer` ON `warehouse_transfer_lines` (`transferId`);--> statement-breakpoint
CREATE INDEX `idx_warehouse_transfer_lines_batch` ON `warehouse_transfer_lines` (`batchId`);--> statement-breakpoint
CREATE INDEX `idx_warehouse_transfers_org` ON `warehouse_transfers` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_warehouse_transfers_status` ON `warehouse_transfers` (`status`);