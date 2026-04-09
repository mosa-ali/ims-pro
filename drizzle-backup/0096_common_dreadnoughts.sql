ALTER TABLE `quotation_analysis_suppliers` ADD `priceScore` decimal(5,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `quotation_analysis_suppliers` ADD `deliveryScore` decimal(5,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `quotation_analysis_suppliers` ADD `warrantyScore` decimal(5,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `quotation_analysis_suppliers` ADD `technicalExperienceYears` int;--> statement-breakpoint
ALTER TABLE `quotation_analysis_suppliers` ADD `technicalCriterionScore` decimal(5,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `quotation_analysis_suppliers` ADD `weightedTotalScore` decimal(5,2) DEFAULT '0';