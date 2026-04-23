DROP INDEX `idx_salary_employee_id` ON `hr_salary_scale`;--> statement-breakpoint
DROP INDEX `idx_salary_org_id` ON `hr_salary_scale`;--> statement-breakpoint
DROP INDEX `idx_salary_ou_id` ON `hr_salary_scale`;--> statement-breakpoint
DROP INDEX `idx_salary_status` ON `hr_salary_scale`;--> statement-breakpoint
DROP INDEX `idx_salary_deleted_at` ON `hr_salary_scale`;--> statement-breakpoint
DROP INDEX `idx_salary_effective_start_date` ON `hr_salary_scale`;--> statement-breakpoint
DROP INDEX `idx_salary_org_ou_employee` ON `hr_salary_scale`;--> statement-breakpoint
ALTER TABLE `hr_payroll_records` MODIFY COLUMN `notes` varchar(1000);--> statement-breakpoint
ALTER TABLE `hr_attendance_records` ADD `staffName` varchar(255);--> statement-breakpoint
ALTER TABLE `hr_attendance_records` ADD `staffId` varchar(50);--> statement-breakpoint
ALTER TABLE `hr_attendance_records` ADD `source` enum('microsoft_teams_shifts','microsoft_teams_presence','manual_hr_entry') DEFAULT 'manual_hr_entry';--> statement-breakpoint
ALTER TABLE `hr_attendance_records` ADD `approvalStatus` enum('pending','approved','rejected') DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `hr_attendance_records` ADD `approvedBy` int;--> statement-breakpoint
ALTER TABLE `hr_attendance_records` ADD `approvedAt` timestamp;--> statement-breakpoint
ALTER TABLE `hr_attendance_records` ADD `rejectionReason` text;--> statement-breakpoint
ALTER TABLE `hr_payroll_records` ADD `salaryScaleId` int;--> statement-breakpoint
ALTER TABLE `hr_payroll_records` ADD `representationAllowance` decimal(15,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `hr_payroll_records` ADD `healthInsuranceAmount` decimal(10,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `hr_payroll_records` ADD `employerSocialSecurity` decimal(15,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `hr_payroll_records` ADD `employeeSocialSecurity` decimal(15,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `hr_salary_scale` ADD `basicSalary` decimal(15,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `hr_salary_scale` ADD `taxPercent` decimal(5,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `hr_salary_scale` ADD `healthInsuranceAmount` decimal(10,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `hr_salary_scale` ADD `employerContribution` decimal(15,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `hr_salary_scale` ADD `employerContributionType` enum('value','percentage') DEFAULT 'value';--> statement-breakpoint
ALTER TABLE `hr_salary_scale` ADD `employeeContribution` decimal(15,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `hr_salary_scale` ADD `employeeContributionType` enum('value','percentage') DEFAULT 'value';--> statement-breakpoint
CREATE INDEX `idx_hr_attendance_source` ON `hr_attendance_records` (`source`);--> statement-breakpoint
CREATE INDEX `idx_hr_attendance_approvalStatus` ON `hr_attendance_records` (`approvalStatus`);--> statement-breakpoint
CREATE INDEX `idx_hr_attendance_staffId` ON `hr_attendance_records` (`staffId`);