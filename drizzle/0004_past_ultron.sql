ALTER TABLE `meal_survey_standards` MODIFY COLUMN `operatingUnitId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `meal_survey_submissions` MODIFY COLUMN `operatingUnitId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `meal_surveys` MODIFY COLUMN `operatingUnitId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `meal_indicator_templates` ADD `operatingUnitId` int;--> statement-breakpoint
ALTER TABLE `meal_indicator_templates` ADD `createdBy` int;--> statement-breakpoint
ALTER TABLE `meal_indicator_templates` ADD `updatedBy` int;--> statement-breakpoint
ALTER TABLE `meal_survey_submissions` ADD `createdBy` int;--> statement-breakpoint
ALTER TABLE `meal_survey_submissions` ADD `updatedBy` int;--> statement-breakpoint
CREATE INDEX `idx_meal_indicator_templates_scope_deleted` ON `meal_indicator_templates` (`organizationId`,`operatingUnitId`,`isDeleted`);--> statement-breakpoint
CREATE INDEX `idx_meal_survey_standards_scope_deleted` ON `meal_survey_standards` (`organizationId`,`operatingUnitId`,`isDeleted`);--> statement-breakpoint
CREATE INDEX `idx_meal_survey_submissions_scope_deleted` ON `meal_survey_submissions` (`organizationId`,`operatingUnitId`,`isDeleted`);--> statement-breakpoint
CREATE INDEX `idx_meal_survey_submissions_survey_scope` ON `meal_survey_submissions` (`surveyId`,`organizationId`,`operatingUnitId`);--> statement-breakpoint
CREATE INDEX `idx_meal_surveys_scope_deleted` ON `meal_surveys` (`organizationId`,`operatingUnitId`,`isDeleted`);--> statement-breakpoint
CREATE INDEX `idx_meal_surveys_scope` ON `meal_surveys` (`organizationId`,`operatingUnitId`);