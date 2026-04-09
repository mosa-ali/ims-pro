CREATE INDEX `idx_grants_org_status` ON `grants` (`organizationId`,`isDeleted`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_grants_ou` ON `grants` (`operatingUnitId`,`isDeleted`);--> statement-breakpoint
CREATE INDEX `idx_grants_project` ON `grants` (`projectId`,`isDeleted`);--> statement-breakpoint
CREATE INDEX `idx_pipeline_org_stage` ON `pipeline_opportunities` (`organizationId`,`isDeleted`,`stage`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_pipeline_ou` ON `pipeline_opportunities` (`operatingUnitId`,`isDeleted`);--> statement-breakpoint
CREATE INDEX `idx_proposals_org_status` ON `proposals` (`organizationId`,`isDeleted`,`proposalStatus`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_proposals_ou` ON `proposals` (`operatingUnitId`,`isDeleted`);--> statement-breakpoint
CREATE INDEX `idx_proposals_pipeline` ON `proposals` (`pipelineOpportunityId`,`isDeleted`);