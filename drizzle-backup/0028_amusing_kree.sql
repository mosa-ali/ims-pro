CREATE TABLE `import_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`organization_id` int NOT NULL,
	`operating_unit_id` int,
	`user_id` int NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`import_type` varchar(50) NOT NULL,
	`records_imported` int NOT NULL DEFAULT 0,
	`records_skipped` int NOT NULL DEFAULT 0,
	`records_errors` int NOT NULL DEFAULT 0,
	`status` varchar(20) NOT NULL DEFAULT 'completed',
	`error_details` text,
	`allowed_duplicates` boolean NOT NULL DEFAULT false,
	`imported_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `import_history_id` PRIMARY KEY(`id`)
);
