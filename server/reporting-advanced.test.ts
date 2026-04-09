import { describe, it, expect } from "vitest";
import { scheduledReportsRouter } from "./reporting/scheduledReportsRouter";
import { customReportBuilderRouter } from "./reporting/customReportBuilderRouter";
import { reportSharingRouter } from "./reporting/reportSharingRouter";

// ============================================================================
// SCHEDULED REPORTS TESTS
// ============================================================================

describe("Reporting - Scheduled Reports", () => {
  const mockUser = {
    id: "user-001",
    name: "Test User",
    email: "test@example.com",
  };

  const mockCtx = { user: mockUser };

  describe("Create Scheduled Report", () => {
    it("should create a new scheduled report", async () => {
      const input = {
        reportType: "fleet-overview",
        reportName: "Weekly Fleet Overview",
        frequency: "weekly" as const,
        format: "pdf" as const,
        recipients: ["manager@example.com"],
        filters: undefined,
        includeCharts: true,
        includeSummary: true,
        nextRunDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isActive: true,
      };

      const result = await scheduledReportsRouter.createCaller(mockCtx).create(input);

      expect(result).toBeDefined();
      expect(result.reportName).toBe("Weekly Fleet Overview");
      expect(result.frequency).toBe("weekly");
      expect(result.createdBy).toBe("user-001");
    });


  });

  describe("List Scheduled Reports", () => {
    it("should list all scheduled reports", async () => {
      const result = await scheduledReportsRouter.createCaller(mockCtx).list();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("reportName");
      expect(result[0]).toHaveProperty("frequency");
    });

    it("should return reports with execution history", async () => {
      const result = await scheduledReportsRouter.createCaller(mockCtx).list();

      expect(result[0]).toHaveProperty("lastRunAt");
      expect(result[0]).toHaveProperty("nextRunDate");
    });
  });

  describe("Get Scheduled Report", () => {
    it("should retrieve a specific scheduled report", async () => {
      const result = await scheduledReportsRouter.createCaller(mockCtx).getById({
        id: "SR-001",
      });

      expect(result).toBeDefined();
      expect(result.id).toBe("SR-001");
      expect(result).toHaveProperty("filters");
      expect(result).toHaveProperty("recipients");
    });
  });

  describe("Update Scheduled Report", () => {
    it("should update scheduled report settings", async () => {
      const result = await scheduledReportsRouter.createCaller(mockCtx).update({
        id: "SR-001",
        data: {
          reportName: "Updated Fleet Report",
          frequency: "monthly" as const,
          format: "excel" as const,
          recipients: ["new@example.com"],
          nextRunDate: new Date(),
        },
      });

      expect(result.reportName).toBe("Updated Fleet Report");
      expect(result.frequency).toBe("monthly");
    });
  });

  describe("Delete Scheduled Report", () => {
    it("should delete a scheduled report", async () => {
      const result = await scheduledReportsRouter.createCaller(mockCtx).delete({
        id: "SR-001",
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe("SR-001");
    });
  });

  describe("Trigger Report Execution", () => {
    it("should trigger manual report execution", async () => {
      const result = await scheduledReportsRouter.createCaller(mockCtx).triggerNow({
        id: "SR-001",
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe("queued");
      expect(result).toHaveProperty("executedAt");
    });
  });

  describe("Report Execution History", () => {
    it("should retrieve execution history", async () => {
      const result = await scheduledReportsRouter.createCaller(mockCtx).getExecutionHistory({
        id: "SR-001",
        limit: 10,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty("status");
      expect(result[0]).toHaveProperty("fileUrl");
    });
  });

  describe("Upcoming Reports", () => {
    it("should get upcoming scheduled reports", async () => {
      const result = await scheduledReportsRouter.createCaller(mockCtx).getUpcoming({
        days: 30,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty("nextRunDate");
    });
  });

  describe("Email Delivery", () => {
    it("should test email delivery", async () => {
      const result = await scheduledReportsRouter.createCaller(mockCtx).testEmailDelivery({
        id: "SR-001",
        testEmail: "test@example.com",
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("test@example.com");
    });
  });

  describe("Schedule Statistics", () => {
    it("should get schedule statistics", async () => {
      const result = await scheduledReportsRouter.createCaller(mockCtx).getStatistics();

      expect(result).toHaveProperty("totalScheduledReports");
      expect(result).toHaveProperty("activeReports");
      expect(result).toHaveProperty("totalExecutions");
      expect(result.totalScheduledReports).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// CUSTOM REPORT BUILDER TESTS
// ============================================================================

describe("Reporting - Custom Report Builder", () => {
  const mockUser = {
    id: "user-001",
    name: "Test User",
    email: "test@example.com",
  };

  const mockCtx = { user: mockUser };

  describe("Create Custom Report", () => {
    it("should create a new custom report", async () => {
      const input = {
        reportName: "Fleet Status Overview",
        reportDescription: "Custom fleet status report",
        dataSource: "fleet-overview",
        fields: [
          {
            fieldId: "f1",
            fieldName: "vehicleId",
            fieldLabel: "Vehicle ID",
            dataType: "string" as const,
            visible: true,
            sortable: true,
            filterable: true,
          },
        ],
        charts: undefined,
        filters: undefined,
        groupBy: undefined,
        sortBy: undefined,
        isPublic: false,
        isTemplate: false,
      };

      const result = await customReportBuilderRouter.createCaller(mockCtx).create(input);

      expect(result).toBeDefined();
      expect(result.reportName).toBe("Fleet Status Overview");
      expect(result.createdBy).toBe("user-001");
    });

    it("should create custom report with charts", async () => {
      const input = {
        reportName: "Fleet Analytics",
        dataSource: "fleet-overview",
        fields: [
          {
            fieldId: "f1",
            fieldName: "status",
            fieldLabel: "Status",
            dataType: "string" as const,
            visible: true,
            sortable: true,
            filterable: true,
          },
        ],
        charts: [
          {
            chartId: "c1",
            chartType: "pie" as const,
            title: "Vehicle Status",
            xAxis: "status",
            yAxis: "count",
            dataSource: "fleet-overview",
            position: "top" as const,
          },
        ],
      };

      const result = await customReportBuilderRouter.createCaller(mockCtx).create(input);

      expect(result.charts).toBeDefined();
      expect(result.charts?.length).toBe(1);
    });
  });

  describe("List Custom Reports", () => {
    it("should list all custom reports", async () => {
      const result = await customReportBuilderRouter.createCaller(mockCtx).list({
        includeTemplates: false,
        includePublic: true,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("reportName");
      expect(result[0]).toHaveProperty("dataSource");
    });

    it("should filter templates", async () => {
      const result = await customReportBuilderRouter
        .createCaller(mockCtx)
        .list({ includeTemplates: true, includePublic: true });

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Get Custom Report", () => {
    it("should retrieve a specific custom report", async () => {
      const result = await customReportBuilderRouter.createCaller(mockCtx).getById({
        id: "CR-001",
      });

      expect(result).toBeDefined();
      expect(result.id).toBe("CR-001");
      expect(result).toHaveProperty("fields");
      expect(result).toHaveProperty("charts");
    });
  });

  describe("Update Custom Report", () => {
    it("should update custom report", async () => {
      const result = await customReportBuilderRouter.createCaller(mockCtx).update({
        id: "CR-001",
        data: {
          reportName: "Updated Fleet Report",
          reportDescription: "Updated description",
          dataSource: "fleet-overview",
          fields: [],
        },
      });

      expect(result.reportName).toBe("Updated Fleet Report");
    });
  });

  describe("Delete Custom Report", () => {
    it("should delete a custom report", async () => {
      const result = await customReportBuilderRouter.createCaller(mockCtx).delete({
        id: "CR-001",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("Available Data Sources", () => {
    it("should get available data sources", async () => {
      const result = await customReportBuilderRouter
        .createCaller(mockCtx)
        .getAvailableDataSources();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("fields");
    });
  });

  describe("Report Templates", () => {
    it("should get report templates", async () => {
      const result = await customReportBuilderRouter.createCaller(mockCtx).getTemplates();

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty("reportName");
    });
  });

  describe("Clone Report", () => {
    it("should clone a report", async () => {
      const result = await customReportBuilderRouter.createCaller(mockCtx).clone({
        id: "CR-001",
        newName: "Fleet Report Copy",
      });

      expect(result.reportName).toBe("Fleet Report Copy");
      expect(result.clonedFrom).toBe("CR-001");
    });
  });

  describe("Preview Report", () => {
    it("should preview report data", async () => {
      const result = await customReportBuilderRouter.createCaller(mockCtx).preview({
        dataSource: "fleet-overview",
        fields: ["vehicleId", "status"],
      });

      expect(result).toHaveProperty("data");
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.rowCount).toBeGreaterThan(0);
    });
  });

  describe("Publish as Template", () => {
    it("should publish report as template", async () => {
      const result = await customReportBuilderRouter.createCaller(mockCtx).publishAsTemplate({
        id: "CR-001",
      });

      expect(result.success).toBe(true);
      expect(result).toHaveProperty("publishedAt");
    });
  });
});

// ============================================================================
// REPORT SHARING & COLLABORATION TESTS
// ============================================================================

describe("Reporting - Report Sharing & Collaboration", () => {
  const mockUser = {
    id: "user-001",
    name: "Test User",
    email: "test@example.com",
    avatar: "https://example.com/avatar.jpg",
  };

  const mockCtx = { user: mockUser };

  describe("Share Report", () => {
    it("should share report with users", async () => {
      const result = await reportSharingRouter.createCaller(mockCtx).share({
        reportId: "SR-001",
        sharedWith: [
          {
            userId: "user-002",
            email: "ahmed@example.com",
            permissionLevel: "view",
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.sharedWith).toBe(1);
    });

    it("should share with multiple users", async () => {
      const result = await reportSharingRouter.createCaller(mockCtx).share({
        reportId: "SR-001",
        sharedWith: [
          {
            userId: "user-002",
            email: "ahmed@example.com",
            permissionLevel: "view",
          },
          {
            userId: "user-003",
            email: "fatima@example.com",
            permissionLevel: "comment",
          },
        ],
      });

      expect(result.sharedWith).toBe(2);
    });
  });

  describe("Get Sharing Info", () => {
    it("should retrieve sharing information", async () => {
      const result = await reportSharingRouter.createCaller(mockCtx).getSharingInfo({
        reportId: "SR-001",
      });

      expect(result).toHaveProperty("owner");
      expect(result).toHaveProperty("sharedWith");
      expect(Array.isArray(result.sharedWith)).toBe(true);
    });
  });

  describe("Update Permissions", () => {
    it("should update sharing permissions", async () => {
      const result = await reportSharingRouter.createCaller(mockCtx).updatePermission({
        reportId: "SR-001",
        userId: "user-002",
        permissionLevel: "edit",
      });

      expect(result.success).toBe(true);
      expect(result.permissionLevel).toBe("edit");
    });
  });

  describe("Revoke Access", () => {
    it("should revoke user access", async () => {
      const result = await reportSharingRouter.createCaller(mockCtx).revokeAccess({
        reportId: "SR-001",
        userId: "user-002",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("Public Reports", () => {
    it("should make report public", async () => {
      const result = await reportSharingRouter.createCaller(mockCtx).makePublic({
        reportId: "SR-001",
      });

      expect(result.success).toBe(true);
      expect(result).toHaveProperty("publicLink");
    });

    it("should make report private", async () => {
      const result = await reportSharingRouter.createCaller(mockCtx).makePrivate({
        reportId: "SR-001",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("Comments", () => {
    it("should add comment to report", async () => {
      const result = await reportSharingRouter.createCaller(mockCtx).addComment({
        reportId: "SR-001",
        content: "Great report!",
      });

      expect(result).toHaveProperty("id");
      expect(result.content).toBe("Great report!");
      expect(result.author.userId).toBe("user-001");
    });

    it("should get report comments", async () => {
      const result = await reportSharingRouter.createCaller(mockCtx).getComments({
        reportId: "SR-001",
        limit: 20,
        offset: 0,
      });

      expect(Array.isArray(result.comments)).toBe(true);
      expect(result).toHaveProperty("totalComments");
    });

    it("should add reply to comment", async () => {
      const result = await reportSharingRouter.createCaller(mockCtx).addComment({
        reportId: "SR-001",
        content: "Thanks for the feedback!",
        parentCommentId: "comment-001",
      });

      expect(result.parentCommentId).toBe("comment-001");
    });

    it("should update comment", async () => {
      const result = await reportSharingRouter.createCaller(mockCtx).updateComment({
        commentId: "comment-001",
        content: "Updated comment",
      });

      expect(result.content).toBe("Updated comment");
    });

    it("should delete comment", async () => {
      const result = await reportSharingRouter.createCaller(mockCtx).deleteComment({
        commentId: "comment-001",
      });

      expect(result.success).toBe(true);
    });

    it("should like comment", async () => {
      const result = await reportSharingRouter.createCaller(mockCtx).likeComment({
        commentId: "comment-001",
      });

      expect(result.success).toBe(true);
      expect(result.likedBy).toBe("user-001");
    });
  });

  describe("Shared Reports", () => {
    it("should get reports shared with user", async () => {
      const result = await reportSharingRouter.createCaller(mockCtx).getSharedWithMe({
        limit: 20,
        offset: 0,
      });

      expect(Array.isArray(result.reports)).toBe(true);
      expect(result).toHaveProperty("totalShared");
    });
  });

  describe("Collaboration Activity", () => {
    it("should get collaboration activity", async () => {
      const result = await reportSharingRouter.createCaller(mockCtx).getActivity({
        reportId: "SR-001",
        limit: 20,
      });

      expect(Array.isArray(result.activities)).toBe(true);
      expect(result.activities[0]).toHaveProperty("type");
      expect(result.activities[0]).toHaveProperty("timestamp");
    });
  });
});

// ============================================================================
// END-TO-END TESTS
// ============================================================================

describe("Reporting - End-to-End Workflows", () => {
  const mockUser = {
    id: "user-001",
    name: "Test User",
    email: "test@example.com",
  };

  const mockCtx = { user: mockUser };

  it("should create, schedule, and share a custom report", async () => {
    // Create custom report
    const customReport = await customReportBuilderRouter.createCaller(mockCtx).create({
      reportName: "Fleet Performance",
      dataSource: "fleet-overview",
      fields: [
        {
          fieldId: "f1",
          fieldName: "vehicleId",
          fieldLabel: "Vehicle ID",
          dataType: "string" as const,
          visible: true,
          sortable: true,
          filterable: true,
        },
      ],
    });

    expect(customReport).toBeDefined();

    // Share the report
    const shared = await reportSharingRouter.createCaller(mockCtx).share({
      reportId: customReport.id,
      sharedWith: [
        {
          userId: "user-002",
          email: "colleague@example.com",
          permissionLevel: "comment",
        },
      ],
    });

    expect(shared.success).toBe(true);

    // Add comment
    const comment = await reportSharingRouter.createCaller(mockCtx).addComment({
      reportId: customReport.id,
      content: "Please review this report",
    });

    expect(comment).toHaveProperty("id");
  });

  it("should create scheduled report from custom report", async () => {
    // Create custom report
    const customReport = await customReportBuilderRouter.createCaller(mockCtx).create({
      reportName: "Weekly Performance",
      dataSource: "driver-performance",
      fields: [],
    });

    // Create scheduled report based on custom report
    const scheduled = await scheduledReportsRouter.createCaller(mockCtx).create({
      reportType: "driver-performance",
      reportName: "Weekly Driver Performance",
      frequency: "weekly" as const,
      format: "pdf" as const,
      recipients: ["manager@example.com"],
      nextRunDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    expect(scheduled).toBeDefined();
    expect(scheduled.frequency).toBe("weekly");
  });
});
