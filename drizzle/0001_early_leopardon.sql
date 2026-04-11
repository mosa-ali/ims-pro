ALTER TABLE `meal_survey_questions` ADD `organizationId` int;--> statement-breakpoint
ALTER TABLE `meal_survey_questions` ADD `operatingUnitId` int;--> statement-breakpoint
ALTER TABLE `meal_survey_questions` ADD `projectId` int;--> statement-breakpoint
ALTER TABLE `meal_survey_questions` ADD `createdBy` int;--> statement-breakpoint
ALTER TABLE `meal_survey_questions` ADD `updatedBy` int;--> statement-breakpoint
CREATE INDEX `idx_meal_survey_questions_scope_deleted` ON `meal_survey_questions` (`organizationId`,`operatingUnitId`,`isDeleted`);--> statement-breakpoint
CREATE INDEX `idx_meal_survey_questions_survey_scope` ON `meal_survey_questions` (`surveyId`,`organizationId`,`operatingUnitId`);--> statement-breakpoint
CREATE INDEX `idx_meal_survey_questions_project` ON `meal_survey_questions` (`projectId`,`organizationId`);