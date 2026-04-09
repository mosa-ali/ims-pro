ALTER TABLE `hr_annual_plans` ADD `operatingUnitId` int;--> statement-breakpoint
ALTER TABLE `hr_documents` ADD `operatingUnitId` int;--> statement-breakpoint
ALTER TABLE `hr_sanctions` ADD `operatingUnitId` int;--> statement-breakpoint
ALTER TABLE `hr_annual_plans` ADD CONSTRAINT `hr_annual_plans_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_documents` ADD CONSTRAINT `hr_documents_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hr_sanctions` ADD CONSTRAINT `hr_sanctions_operatingUnitId_operating_units_id_fk` FOREIGN KEY (`operatingUnitId`) REFERENCES `operating_units`(`id`) ON DELETE cascade ON UPDATE no action;