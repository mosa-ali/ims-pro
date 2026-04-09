import { z } from "zod";
import { router, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { donorReports, donors, projects, grants, donorCommunications, donorProjects } from "../drizzle/schema";
import { eq, and, isNull, desc, asc, sql, like, or, gte, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { storagePut } from "./storage";
import PDFDocument from "pdfkit";

// Input validation schemas
const createReportSchema = z.object({
  donorId: z.number().optional().nullable(),
  projectId: z.number().optional().nullable(),
  grantId: z.number().optional().nullable(),
  reportType: z.enum([
    "donor_summary",
    "funding_history",
    "pipeline_status",
    "budget_vs_actual",
    "grant_performance",
    "communication_log",
    "custom"
  ]),
  title: z.string().min(1).max(500),
  titleAr: z.string().max(500).optional().nullable(),
  periodStart: z.date().or(z.string().transform(s => new Date(s))).optional().nullable(),
  periodEnd: z.date().or(z.string().transform(s => new Date(s))).optional().nullable(),
  parametersJSON: z.string().optional().nullable(),
  status: z.enum(["draft", "final", "archived"]).optional(),
  reportDataJSON: z.string().optional().nullable(),
});

const updateReportSchema = createReportSchema.partial().extend({
  id: z.number(),
});

const listReportsSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
  donorId: z.number().optional(),
  projectId: z.number().optional(),
  grantId: z.number().optional(),
  reportType: z.enum([
    "donor_summary",
    "funding_history",
    "pipeline_status",
    "budget_vs_actual",
    "grant_performance",
    "communication_log",
    "custom"
  ]).optional(),
  status: z.enum(["draft", "final", "archived"]).optional(),
  search: z.string().optional(),
  dateFrom: z.date().or(z.string().transform(s => new Date(s))).optional(),
  dateTo: z.date().or(z.string().transform(s => new Date(s))).optional(),
  sortBy: z.enum(["generatedAt", "title", "reportType"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  includeDeleted: z.boolean().optional(),
});

export const donorReportsRouter = router({
  // List reports with pagination, search, and filtering
  list: scopedProcedure
    .input(listReportsSchema)
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      console.log('[DonorReports.list] Scope:', ctx.scope);

      const { page, pageSize, donorId, projectId, grantId, reportType, status, search, dateFrom, dateTo, sortBy, sortOrder, includeDeleted } = input;
      const offset = (page - 1) * pageSize;

      // Build where conditions
      const conditions = [
        eq(donorReports.organizationId, ctx.scope.organizationId),
      ];

      if (ctx.scope.operatingUnitId) {
        conditions.push(eq(donorReports.operatingUnitId, ctx.scope.operatingUnitId));
      }

      if (!includeDeleted) {
        conditions.push(isNull(donorReports.deletedAt));
      }

      if (donorId) {
        conditions.push(eq(donorReports.donorId, donorId));
      }

      if (projectId) {
        conditions.push(eq(donorReports.projectId, projectId));
      }

      if (grantId) {
        conditions.push(eq(donorReports.grantId, grantId));
      }

      if (reportType) {
        conditions.push(eq(donorReports.reportType, reportType));
      }

      if (status) {
        conditions.push(eq(donorReports.status, status));
      }

      if (search) {
        conditions.push(
          or(
            like(donorReports.title, `%${search}%`),
            like(donorReports.titleAr, `%${search}%`)
          )!
        );
      }

      if (dateFrom) {
        conditions.push(gte(donorReports.generatedAt, dateFrom));
      }

      if (dateTo) {
        conditions.push(lte(donorReports.generatedAt, dateTo));
      }

      // Get total count
      console.log('[DonorReports.list] Conditions:', conditions.length);
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(donorReports)
        .where(and(...conditions));
      console.log('[DonorReports.list] Count result:', countResult);
      const total = countResult[0]?.count || 0;

      // Build order by
      let orderByClause;
      const order = sortOrder === "asc" ? asc : desc;
      switch (sortBy) {
        case "title":
          orderByClause = order(donorReports.title);
          break;
        case "reportType":
          orderByClause = order(donorReports.reportType);
          break;
        case "generatedAt":
        default:
          orderByClause = desc(donorReports.generatedAt);
      }

      // Fetch reports - simplified query without joins first
      const reportsList = await db
        .select()
        .from(donorReports)
        .where(and(...conditions))
        .orderBy(orderByClause)
        .limit(pageSize)
        .offset(offset);
      
      console.log('[DonorReports.list] Total:', total, 'Reports:', reportsList.length);

      return {
        reports: reportsList,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  // Get single report by ID
  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const report = await db
        .select({
          id: donorReports.id,
          organizationId: donorReports.organizationId,
          operatingUnitId: donorReports.operatingUnitId,
          donorId: donorReports.donorId,
          projectId: donorReports.projectId,
          grantId: donorReports.grantId,
          reportType: donorReports.reportType,
          title: donorReports.title,
          titleAr: donorReports.titleAr,
          periodStart: donorReports.periodStart,
          periodEnd: donorReports.periodEnd,
          parametersJSON: donorReports.parametersJSON,
          generatedByUserId: donorReports.generatedByUserId,
          generatedAt: donorReports.generatedAt,
          status: donorReports.status,
          fileUrl: donorReports.fileUrl,
          pdfUrl: donorReports.pdfUrl,
          excelUrl: donorReports.excelUrl,
          reportDataJSON: donorReports.reportDataJSON,
          createdAt: donorReports.createdAt,
          updatedAt: donorReports.updatedAt,
          deletedAt: donorReports.deletedAt,
          donorName: donors.name,
          donorNameAr: donors.nameAr,
          projectName: projects.name,
          projectNameAr: projects.nameAr,
          grantTitle: grants.title,
          grantTitleAr: grants.titleAr,
        })
        .from(donorReports)
        .leftJoin(donors, eq(donorReports.donorId, donors.id))
        .leftJoin(projects, eq(donorReports.projectId, projects.id))
        .leftJoin(grants, eq(donorReports.grantId, grants.id))
        .where(
          and(
            eq(donorReports.id, input.id),
            eq(donorReports.organizationId, ctx.scope.organizationId),
            isNull(donorReports.deletedAt)
          )
        )
        .limit(1);

      if (!report[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
      }

      return report[0];
    }),

  // Generate/Create new report
  generate: scopedProcedure
    .input(createReportSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify donor if provided
      if (input.donorId) {
        const donor = await db
          .select({ id: donors.id })
          .from(donors)
          .where(
            and(
              eq(donors.id, input.donorId),
              eq(donors.organizationId, ctx.scope.organizationId),
              isNull(donors.deletedAt)
            )
          )
          .limit(1);

        if (!donor[0]) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Donor not found" });
        }
      }

      // Verify project if provided
      if (input.projectId) {
        const project = await db
          .select({ id: projects.id })
          .from(projects)
          .where(
            and(
              eq(projects.id, input.projectId),
              eq(projects.organizationId, ctx.scope.organizationId)
            )
          )
          .limit(1);

        if (!project[0]) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }
      }

      // Verify grant if provided
      if (input.grantId) {
        const grant = await db
          .select({ id: grants.id })
          .from(grants)
          .where(
            and(
              eq(grants.id, input.grantId),
              eq(grants.organizationId, ctx.scope.organizationId)
            )
          )
          .limit(1);

        if (!grant[0]) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Grant not found" });
        }
      }

      const result = await db.insert(donorReports).values({
        ...input,
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
        generatedByUserId: ctx.user.id,
        generatedAt: new Date(),
        createdBy: ctx.user.id,
      });

      const insertId = result[0].insertId;

      return { id: insertId, message: "Report generated successfully" };
    }),

  // Update report
  update: scopedProcedure
    .input(updateReportSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const { id, ...updateData } = input;

      // Verify report exists and belongs to organization
      const existing = await db
        .select({ id: donorReports.id })
        .from(donorReports)
        .where(
          and(
            eq(donorReports.id, id),
            eq(donorReports.organizationId, ctx.scope.organizationId),
            isNull(donorReports.deletedAt)
          )
        )
        .limit(1);

      if (!existing[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
      }

      await db
        .update(donorReports)
        .set({
          ...updateData,
          updatedBy: ctx.user.id,
        })
        .where(eq(donorReports.id, id));

      return { message: "Report updated successfully" };
    }),

  // Soft delete report
  softDelete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const existing = await db
        .select({ id: donorReports.id })
        .from(donorReports)
        .where(
          and(
            eq(donorReports.id, input.id),
            eq(donorReports.organizationId, ctx.scope.organizationId),
            isNull(donorReports.deletedAt)
          )
        )
        .limit(1);

      if (!existing[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
      }

      await db
        .update(donorReports)
        .set({
          deletedAt: new Date(),
          deletedBy: ctx.user.id,
        })
        .where(eq(donorReports.id, input.id));

      return { message: "Report deleted successfully" };
    }),

  // Restore soft-deleted report
  restore: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const existing = await db
        .select({ id: donorReports.id, deletedAt: donorReports.deletedAt })
        .from(donorReports)
        .where(
          and(
            eq(donorReports.id, input.id),
            eq(donorReports.organizationId, ctx.scope.organizationId)
          )
        )
        .limit(1);

      if (!existing[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
      }

      if (!existing[0].deletedAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Report is not deleted" });
      }

      await db
        .update(donorReports)
        .set({
          deletedAt: null,
          deletedBy: null,
          updatedBy: ctx.user.id,
        })
        .where(eq(donorReports.id, input.id));

      return { message: "Report restored successfully" };
    }),

  // Get KPIs
  getKPIs: scopedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const conditions = [
      eq(donorReports.organizationId, ctx.scope.organizationId),
      isNull(donorReports.deletedAt),
    ];

    if (ctx.scope.operatingUnitId) {
      conditions.push(eq(donorReports.operatingUnitId, ctx.scope.operatingUnitId));
    }

    // Total reports
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(donorReports)
      .where(and(...conditions));

    // By type
    const byTypeResult = await db
      .select({
        reportType: donorReports.reportType,
        count: sql<number>`count(*)`,
      })
      .from(donorReports)
      .where(and(...conditions))
      .groupBy(donorReports.reportType);

    // By status
    const byStatusResult = await db
      .select({
        status: donorReports.status,
        count: sql<number>`count(*)`,
      })
      .from(donorReports)
      .where(and(...conditions))
      .groupBy(donorReports.status);

    return {
      totalReports: totalResult[0]?.count || 0,
      byType: byTypeResult,
      byStatus: byStatusResult,
    };
  }),

  // Generate PDF report
  generatePDF: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Get the report with all related data
      const report = await db
        .select({
          id: donorReports.id,
          title: donorReports.title,
          titleAr: donorReports.titleAr,
          reportType: donorReports.reportType,
          periodStart: donorReports.periodStart,
          periodEnd: donorReports.periodEnd,
          status: donorReports.status,
          generatedAt: donorReports.generatedAt,
          donorId: donorReports.donorId,
          projectId: donorReports.projectId,
          grantId: donorReports.grantId,
          donorName: donors.name,
          donorNameAr: donors.nameAr,
          donorCode: donors.code,
          donorType: donors.type,
          donorEmail: donors.email,
          donorPhone: donors.phone,
          donorCountry: donors.country,
          projectTitle: projects.titleEn,
          projectTitleAr: projects.titleAr,
          projectCode: projects.projectCode,
          projectStatus: projects.status,
          projectBudget: projects.totalBudget,
          grantTitle: grants.title,
          grantTitleAr: grants.titleAr,
          grantAmount: grants.amount,
          grantStatus: grants.status,
        })
        .from(donorReports)
        .leftJoin(donors, eq(donorReports.donorId, donors.id))
        .leftJoin(projects, eq(donorReports.projectId, projects.id))
        .leftJoin(grants, eq(donorReports.grantId, grants.id))
        .where(
          and(
            eq(donorReports.id, input.id),
            eq(donorReports.organizationId, ctx.scope.organizationId)
          )
        )
        .limit(1);

      if (!report[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
      }

      const reportData = report[0];

      // Get additional data based on report type
      let communications: any[] = [];
      let linkedProjects: any[] = [];

      if (reportData.donorId) {
        // Get communications for donor
        communications = await db
          .select({
            id: donorCommunications.id,
            date: donorCommunications.date,
            channel: donorCommunications.channel,
            subject: donorCommunications.subject,
            summary: donorCommunications.summary,
            contactPerson: donorCommunications.contactPerson,
            status: donorCommunications.status,
          })
          .from(donorCommunications)
          .where(
            and(
              eq(donorCommunications.donorId, reportData.donorId),
              eq(donorCommunications.organizationId, ctx.scope.organizationId),
              isNull(donorCommunications.deletedAt)
            )
          )
          .orderBy(desc(donorCommunications.date))
          .limit(20);

        // Get linked projects for donor
        linkedProjects = await db
          .select({
            id: donorProjects.id,
            projectId: donorProjects.projectId,
            relationshipType: donorProjects.relationshipType,
            status: donorProjects.status,
            fundingAmount: donorProjects.fundingAmount,
            currency: donorProjects.currency,
            projectTitle: projects.titleEn,
            projectCode: projects.projectCode,
          })
          .from(donorProjects)
          .leftJoin(projects, eq(donorProjects.projectId, projects.id))
          .where(
            and(
              eq(donorProjects.donorId, reportData.donorId),
              eq(donorProjects.organizationId, ctx.scope.organizationId),
              isNull(donorProjects.deletedAt)
            )
          )
          .orderBy(desc(donorProjects.createdAt));
      }

      // Generate HTML content for PDF (kept for future use)
      const htmlContent = generateReportHTML(reportData, communications, linkedProjects);

      // Generate PDF using PDFKit
      const pdfContent = await generateSimplePDF(reportData, communications, linkedProjects);

      // Upload PDF to storage
      const timestamp = Date.now();
      const fileName = `reports/donor-report-${reportData.id}-${timestamp}.pdf`;
      const { url } = await storagePut(fileName, pdfContent, "application/pdf");

      // Update the report with the PDF URL
      await db
        .update(donorReports)
        .set({
          pdfUrl: url,
          updatedBy: ctx.user.id,
        })
        .where(eq(donorReports.id, input.id));

      return { pdfUrl: url, message: "PDF generated successfully" };
    }),

  // Export report data
  exportData: scopedProcedure
    .input(z.object({
      donorId: z.number().optional(),
      projectId: z.number().optional(),
      reportType: z.enum([
        "donor_summary",
        "funding_history",
        "pipeline_status",
        "budget_vs_actual",
        "grant_performance",
        "communication_log",
        "custom"
      ]).optional(),
      status: z.enum(["draft", "final", "archived"]).optional(),
      dateFrom: z.date().or(z.string().transform(s => new Date(s))).optional(),
      dateTo: z.date().or(z.string().transform(s => new Date(s))).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const { donorId, projectId, reportType, status, dateFrom, dateTo } = input;

      const conditions = [
        eq(donorReports.organizationId, ctx.scope.organizationId),
        isNull(donorReports.deletedAt),
      ];

      if (ctx.scope.operatingUnitId) {
        conditions.push(eq(donorReports.operatingUnitId, ctx.scope.operatingUnitId));
      }

      if (donorId) conditions.push(eq(donorReports.donorId, donorId));
      if (projectId) conditions.push(eq(donorReports.projectId, projectId));
      if (reportType) conditions.push(eq(donorReports.reportType, reportType));
      if (status) conditions.push(eq(donorReports.status, status));
      if (dateFrom) conditions.push(gte(donorReports.generatedAt, dateFrom));
      if (dateTo) conditions.push(lte(donorReports.generatedAt, dateTo));

      const reportsList = await db
        .select({
          id: donorReports.id,
          title: donorReports.title,
          reportType: donorReports.reportType,
          generatedAt: donorReports.generatedAt,
          status: donorReports.status,
          periodStart: donorReports.periodStart,
          periodEnd: donorReports.periodEnd,
          donorName: donors.name,
          projectName: projects.name,
          grantTitle: grants.title,
        })
        .from(donorReports)
        .leftJoin(donors, eq(donorReports.donorId, donors.id))
        .leftJoin(projects, eq(donorReports.projectId, projects.id))
        .leftJoin(grants, eq(donorReports.grantId, grants.id))
        .where(and(...conditions))
        .orderBy(desc(donorReports.generatedAt));

      return {
        reports: reportsList,
        exportedAt: new Date().toISOString(),
      };
    }),
});

export type DonorReportsRouter = typeof donorReportsRouter;

// Helper function to generate HTML content for the report
function generateReportHTML(reportData: any, communications: any[], linkedProjects: any[]): string {
  const formatDate = (date: Date | string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number | string | null, currency = 'USD') => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(Number(amount));
  };

  const getReportTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      donor_summary: 'Donor Summary',
      funding_history: 'Funding History',
      pipeline_status: 'Pipeline Status',
      budget_vs_actual: 'Budget vs Actual',
      grant_performance: 'Grant Performance',
      communication_log: 'Communication Log',
      custom: 'Custom Report'
    };
    return labels[type] || type;
  };

  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${reportData.title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    h1 { color: #1a365d; border-bottom: 2px solid #1a365d; padding-bottom: 10px; }
    h2 { color: #2c5282; margin-top: 30px; }
    h3 { color: #4a5568; }
    .header { margin-bottom: 30px; }
    .meta { color: #666; font-size: 14px; }
    .section { margin-bottom: 25px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .info-item { margin-bottom: 10px; }
    .info-label { font-weight: bold; color: #4a5568; }
    .info-value { margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
    th { background-color: #f7fafc; font-weight: bold; }
    tr:nth-child(even) { background-color: #f7fafc; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 12px; }
    .badge-active { background-color: #c6f6d5; color: #276749; }
    .badge-pending { background-color: #feebc8; color: #c05621; }
    .badge-completed { background-color: #e2e8f0; color: #4a5568; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${reportData.title}</h1>
    <div class="meta">
      <p>Report Type: ${getReportTypeLabel(reportData.reportType)}</p>
      <p>Generated: ${formatDate(reportData.generatedAt)}</p>
      ${reportData.periodStart || reportData.periodEnd ? `<p>Period: ${formatDate(reportData.periodStart)} - ${formatDate(reportData.periodEnd)}</p>` : ''}
    </div>
  </div>
`;

  // Donor Information Section
  if (reportData.donorName) {
    html += `
  <div class="section">
    <h2>Donor Information</h2>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Name</div>
        <div class="info-value">${reportData.donorName}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Code</div>
        <div class="info-value">${reportData.donorCode || 'N/A'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Type</div>
        <div class="info-value">${reportData.donorType || 'N/A'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Country</div>
        <div class="info-value">${reportData.donorCountry || 'N/A'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Email</div>
        <div class="info-value">${reportData.donorEmail || 'N/A'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Phone</div>
        <div class="info-value">${reportData.donorPhone || 'N/A'}</div>
      </div>
    </div>
  </div>
`;
  }

  // Project Information Section
  if (reportData.projectTitle) {
    html += `
  <div class="section">
    <h2>Project Information</h2>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Title</div>
        <div class="info-value">${reportData.projectTitle}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Code</div>
        <div class="info-value">${reportData.projectCode || 'N/A'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Status</div>
        <div class="info-value">${reportData.projectStatus || 'N/A'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Budget</div>
        <div class="info-value">${formatCurrency(reportData.projectBudget)}</div>
      </div>
    </div>
  </div>
`;
  }

  // Grant Information Section
  if (reportData.grantTitle) {
    html += `
  <div class="section">
    <h2>Grant Information</h2>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Title</div>
        <div class="info-value">${reportData.grantTitle}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Amount</div>
        <div class="info-value">${formatCurrency(reportData.grantAmount)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Status</div>
        <div class="info-value">${reportData.grantStatus || 'N/A'}</div>
      </div>
    </div>
  </div>
`;
  }

  // Linked Projects Section
  if (linkedProjects.length > 0) {
    html += `
  <div class="section">
    <h2>Linked Projects</h2>
    <table>
      <thead>
        <tr>
          <th>Project</th>
          <th>Code</th>
          <th>Relationship</th>
          <th>Funding</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
`;
    for (const project of linkedProjects) {
      html += `
        <tr>
          <td>${project.projectTitle || 'N/A'}</td>
          <td>${project.projectCode || 'N/A'}</td>
          <td>${project.relationshipType || 'N/A'}</td>
          <td>${formatCurrency(project.fundingAmount, project.currency)}</td>
          <td><span class="badge badge-${project.status}">${project.status || 'N/A'}</span></td>
        </tr>
`;
    }
    html += `
      </tbody>
    </table>
  </div>
`;
  }

  // Communications Section
  if (communications.length > 0) {
    html += `
  <div class="section">
    <h2>Recent Communications</h2>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Channel</th>
          <th>Subject</th>
          <th>Contact</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
`;
    for (const comm of communications) {
      html += `
        <tr>
          <td>${formatDate(comm.date)}</td>
          <td>${comm.channel || 'N/A'}</td>
          <td>${comm.subject || 'N/A'}</td>
          <td>${comm.contactPerson || 'N/A'}</td>
          <td><span class="badge badge-${comm.status}">${comm.status || 'N/A'}</span></td>
        </tr>
`;
    }
    html += `
      </tbody>
    </table>
  </div>
`;
  }

  html += `
  <div class="footer">
    <p>This report was automatically generated by the Integrated Management System (IMS).</p>
    <p>Report ID: ${reportData.id} | Generated on: ${new Date().toISOString()}</p>
  </div>
</body>
</html>
`;

  return html;
}

// Helper function to generate a proper PDF using PDFKit
function generateSimplePDF(reportData: any, communications: any[], linkedProjects: any[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const formatDate = (date: Date | string | null) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      };

      const formatCurrency = (amount: number | string | null, currency = 'USD') => {
        if (!amount) return 'N/A';
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency,
          maximumFractionDigits: 0
        }).format(Number(amount));
      };

      const getReportTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
          donor_summary: 'Donor Summary',
          funding_history: 'Funding History',
          pipeline_status: 'Pipeline Status',
          budget_vs_actual: 'Budget vs Actual',
          grant_performance: 'Grant Performance',
          communication_log: 'Communication Log',
          custom: 'Custom Report'
        };
        return labels[type] || type;
      };

      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: reportData.title || 'Donor Report',
          Author: 'Integrated Management System (IMS)',
          Subject: 'Donor Report',
          CreationDate: new Date()
        }
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Colors
      const primaryColor = '#1e3a5f';
      const secondaryColor = '#4a6fa5';
      const textColor = '#333333';
      const lightGray = '#f5f5f5';

      // Header
      doc.rect(0, 0, doc.page.width, 100).fill(primaryColor);
      doc.fillColor('#ffffff')
         .fontSize(24)
         .text('DONOR REPORT', 50, 35, { align: 'left' });
      doc.fontSize(12)
         .text('Integrated Management System (IMS)', 50, 65, { align: 'left' });

      // Reset position
      doc.fillColor(textColor);
      let yPos = 120;

      // Report Title Section
      doc.fontSize(18)
         .fillColor(primaryColor)
         .text(reportData.title || 'Untitled Report', 50, yPos);
      yPos += 30;

      // Report metadata
      doc.fontSize(10)
         .fillColor(secondaryColor);
      doc.text(`Report Type: ${getReportTypeLabel(reportData.reportType)}`, 50, yPos);
      yPos += 15;
      doc.text(`Generated: ${formatDate(reportData.generatedAt || new Date())}`, 50, yPos);
      yPos += 15;
      if (reportData.periodStart || reportData.periodEnd) {
        doc.text(`Period: ${formatDate(reportData.periodStart)} - ${formatDate(reportData.periodEnd)}`, 50, yPos);
        yPos += 15;
      }
      doc.text(`Status: ${reportData.status || 'N/A'}`, 50, yPos);
      yPos += 25;

      // Divider
      doc.moveTo(50, yPos).lineTo(doc.page.width - 50, yPos).stroke(secondaryColor);
      yPos += 20;

      // Donor Information Section
      if (reportData.donorName) {
        doc.fontSize(14)
           .fillColor(primaryColor)
           .text('DONOR INFORMATION', 50, yPos);
        yPos += 20;

        doc.fontSize(10)
           .fillColor(textColor);
        
        const donorInfo = [
          ['Name:', reportData.donorName],
          ['Code:', reportData.donorCode || 'N/A'],
          ['Type:', reportData.donorType || 'N/A'],
          ['Country:', reportData.donorCountry || 'N/A'],
          ['Email:', reportData.donorEmail || 'N/A'],
          ['Phone:', reportData.donorPhone || 'N/A'],
        ];

        for (const [label, value] of donorInfo) {
          doc.font('Helvetica-Bold').text(label, 50, yPos, { continued: true, width: 80 });
          doc.font('Helvetica').text(` ${value}`, { width: 400 });
          yPos += 15;
        }
        yPos += 10;
      }

      // Project Information Section
      if (reportData.projectTitle) {
        if (yPos > 650) {
          doc.addPage();
          yPos = 50;
        }

        doc.fontSize(14)
           .fillColor(primaryColor)
           .text('PROJECT INFORMATION', 50, yPos);
        yPos += 20;

        doc.fontSize(10)
           .fillColor(textColor);
        
        const projectInfo = [
          ['Title:', reportData.projectTitle],
          ['Code:', reportData.projectCode || 'N/A'],
          ['Status:', reportData.projectStatus || 'N/A'],
          ['Budget:', formatCurrency(reportData.projectBudget)],
        ];

        for (const [label, value] of projectInfo) {
          doc.font('Helvetica-Bold').text(label, 50, yPos, { continued: true, width: 80 });
          doc.font('Helvetica').text(` ${value}`, { width: 400 });
          yPos += 15;
        }
        yPos += 10;
      }

      // Grant Information Section
      if (reportData.grantTitle) {
        if (yPos > 650) {
          doc.addPage();
          yPos = 50;
        }

        doc.fontSize(14)
           .fillColor(primaryColor)
           .text('GRANT INFORMATION', 50, yPos);
        yPos += 20;

        doc.fontSize(10)
           .fillColor(textColor);
        
        const grantInfo = [
          ['Title:', reportData.grantTitle],
          ['Amount:', formatCurrency(reportData.grantAmount)],
          ['Status:', reportData.grantStatus || 'N/A'],
        ];

        for (const [label, value] of grantInfo) {
          doc.font('Helvetica-Bold').text(label, 50, yPos, { continued: true, width: 80 });
          doc.font('Helvetica').text(` ${value}`, { width: 400 });
          yPos += 15;
        }
        yPos += 10;
      }

      // Linked Projects Section
      if (linkedProjects.length > 0) {
        if (yPos > 600) {
          doc.addPage();
          yPos = 50;
        }

        doc.fontSize(14)
           .fillColor(primaryColor)
           .text(`LINKED PROJECTS (${linkedProjects.length})`, 50, yPos);
        yPos += 20;

        for (const project of linkedProjects) {
          if (yPos > 700) {
            doc.addPage();
            yPos = 50;
          }

          doc.fontSize(10)
             .fillColor(textColor);
          doc.font('Helvetica-Bold').text(`• ${project.projectTitle || 'N/A'}`, 50, yPos);
          yPos += 15;
          doc.font('Helvetica')
             .text(`  Code: ${project.projectCode || 'N/A'} | Relationship: ${project.relationshipType || 'N/A'}`, 60, yPos);
          yPos += 12;
          doc.text(`  Funding: ${formatCurrency(project.fundingAmount, project.currency)} | Status: ${project.status || 'N/A'}`, 60, yPos);
          yPos += 18;
        }
        yPos += 5;
      }

      // Communications Section
      if (communications.length > 0) {
        if (yPos > 550) {
          doc.addPage();
          yPos = 50;
        }

        doc.fontSize(14)
           .fillColor(primaryColor)
           .text(`RECENT COMMUNICATIONS (${communications.length})`, 50, yPos);
        yPos += 20;

        for (const comm of communications.slice(0, 10)) { // Limit to 10 communications
          if (yPos > 680) {
            doc.addPage();
            yPos = 50;
          }

          doc.fontSize(10)
             .fillColor(textColor);
          doc.font('Helvetica-Bold').text(`• ${formatDate(comm.date)} - ${comm.channel || 'N/A'}`, 50, yPos);
          yPos += 15;
          doc.font('Helvetica')
             .text(`  Subject: ${comm.subject || 'N/A'}`, 60, yPos);
          yPos += 12;
          doc.text(`  Contact: ${comm.contactPerson || 'N/A'} | Status: ${comm.status || 'N/A'}`, 60, yPos);
          yPos += 12;
          if (comm.summary) {
            const summary = comm.summary.substring(0, 100) + (comm.summary.length > 100 ? '...' : '');
            doc.text(`  Summary: ${summary}`, 60, yPos, { width: 480 });
            yPos += 20;
          }
          yPos += 5;
        }
      }

      // Footer on each page
      const addFooter = () => {
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc.fontSize(8)
             .fillColor('#888888')
             .text(
               `Report ID: ${reportData.id} | Generated: ${new Date().toISOString()} | Page ${i + 1} of ${pages.count}`,
               50,
               doc.page.height - 30,
               { align: 'center', width: doc.page.width - 100 }
             );
        }
      };

      addFooter();
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
