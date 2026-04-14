ALTER TABLE `meal_survey_questions` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `meal_survey_questions` MODIFY COLUMN `createdBy` int NOT NULL;--> statement-breakpoint
ALTER TABLE `meal_survey_questions` MODIFY COLUMN `updatedBy` int NOT NULL;--> statement-breakpoint
ALTER TABLE `meal_survey_standards` ADD `operatingUnitId` int;--> statement-breakpoint
ALTER TABLE `meal_survey_standards` ADD `createdBy` int NOT NULL;--> statement-breakpoint
ALTER TABLE `meal_survey_standards` ADD `updatedBy` int NOT NULL;