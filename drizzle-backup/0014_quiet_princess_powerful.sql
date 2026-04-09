CREATE INDEX `idx_projects_org_status` ON `projects` (`organizationId`,`isDeleted`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_projects_ou` ON `projects` (`operatingUnitId`,`isDeleted`);--> statement-breakpoint
CREATE INDEX `idx_projects_manager` ON `projects` (`managerId`,`isDeleted`);