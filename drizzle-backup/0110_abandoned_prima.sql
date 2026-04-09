CREATE TABLE `invoice_audit_trail` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceId` int NOT NULL,
	`payableId` int,
	`organizationId` int NOT NULL,
	`operatingUnitId` int,
	`action` enum('uploaded','matching_triggered','matching_completed','variance_detected','approved','rejected','resubmitted','modified') NOT NULL,
	`actionBy` int NOT NULL,
	`actionByName` varchar(255),
	`actionByEmail` varchar(255),
	`reason` text,
	`details` text,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `invoice_audit_trail_id` PRIMARY KEY(`id`)
);
