ALTER TABLE `hr_salary_scale` ADD `updatedBy` int;--> statement-breakpoint
CREATE INDEX `idx_salary_employee_id` ON `hr_salary_scale` (`employeeId`);--> statement-breakpoint
CREATE INDEX `idx_salary_org_id` ON `hr_salary_scale` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_salary_ou_id` ON `hr_salary_scale` (`operatingUnitId`);--> statement-breakpoint
CREATE INDEX `idx_salary_status` ON `hr_salary_scale` (`status`);--> statement-breakpoint
CREATE INDEX `idx_salary_deleted_at` ON `hr_salary_scale` (`deletedAt`);--> statement-breakpoint
CREATE INDEX `idx_salary_effective_start_date` ON `hr_salary_scale` (`effectiveStartDate`);--> statement-breakpoint
CREATE INDEX `idx_salary_org_ou_employee` ON `hr_salary_scale` (`organizationId`,`operatingUnitId`,`employeeId`);