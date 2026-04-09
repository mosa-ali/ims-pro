/**
 * System Reports Router (Platform Governance)
 * 
 * Handles import error reports submitted by users for platform admin review.
 * This is a mandatory governance feature for humanitarian/donor accountability.
 * 
 * Purpose:
 * - User escalation: Users can report import issues without manual support contact
 * - Platform oversight: Admins track repeated failures, validation issues, policy mismatches
 * - Audit readiness: All import failures are traceable, logged, reviewable, actionable
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { systemImportReports } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { storagePut } from "./storage";
import ExcelJS from "exceljs";

// Validation schemas
const importErrorSchema = z.object({
  row: z.number(),
  field: z.string(),
  errorType: z.string(),
  message: z.string(),
  suggestedFix: z.string().optional(),
});

const importSummarySchema = z.object({
  rowsProcessed: z.number(),
  rowsImported: z.number(),
  rowsSkipped: z.number(),
  rowsWithErrors: z.number(),
});

export const systemReportsRouter = router({
  /**
   * Submit import error report to platform admin
   * 
   * This procedure:
   * 1. Generates error report Excel file
   * 2. Uploads to S3
   * 3. Stores report metadata in database
   * 4. NO email sent (reports viewed in admin panel)
   */
  submitImportErrorReport: scopedProcedure
    .input(
      z.object({
        projectId: z.number().optional(),
        module: z.string(), // e.g., "Financial Overview", "Activities", "Procurement"
        importType: z.enum(["create", "update"]).default("create"),
        importSummary: importSummarySchema,
        errorDetails: z.array(importErrorSchema),
        dataColumns: z.array(
          z.object({
            header: z.string(),
            key: z.string(),
            width: z.number().optional(),
          })
        ).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const userId = ctx.user.id;
      const userName = ctx.user.name || "Unknown User";
      const userRole = ctx.user.role || "user";

      // Generate error report Excel file
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Import Errors');

      // Define all columns (error info + original data if provided)
      const errorColumnHeaders = ['Row', 'Field', 'Error Type', 'Error Message', 'Suggested Fix'];
      const dataColumnHeaders = input.dataColumns?.map(col => col.header) || [];
      const allHeaders = [...errorColumnHeaders, ...dataColumnHeaders];

      // Define column widths
      const columnWidths = [
        10, // Row
        20, // Field
        15, // Error Type
        40, // Error Message
        40, // Suggested Fix
        ...(input.dataColumns?.map(col => col.width || 15) || []),
      ];

      // Set column widths FIRST (before adding any rows)
      columnWidths.forEach((width, index) => {
        const column = worksheet.getColumn(index + 1);
        column.width = width;
      });

      // Add header row manually with blue styling
      const headerRow = worksheet.addRow(allHeaders);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }, // Blue header
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 20;

      // Add error rows manually with red highlighting
      input.errorDetails.forEach((error) => {
        const errorData = [
          error.row,
          error.field,
          error.errorType,
          error.message,
          error.suggestedFix || 'Check data format and try again',
        ];

        const row = worksheet.addRow(errorData);

        // Highlight error rows in red
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFC7CE' }, // Light red background
          };
          cell.font = { color: { argb: 'FF9C0006' } }; // Dark red text
        });
      });

      // Add autoFilter for dropdown filters on header row
      const lastRow = worksheet.rowCount;
      const lastCol = allHeaders.length;
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: lastRow, column: lastCol },
      };

      // Generate Excel buffer
      const excelBuffer = await workbook.xlsx.writeBuffer();
      // Convert to Uint8Array for S3 upload compatibility
      const buffer = new Uint8Array(excelBuffer);

      // Upload to S3
      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `${input.module.replace(/\s+/g, '_')}_ERRORS_${timestamp}_${Date.now()}.xlsx`;
      const s3Key = `import-error-reports/${organizationId}/${fileName}`;
      
      const { url: errorFileUrl } = await storagePut(s3Key, buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

      // Store report in database
      const [report] = await db
        .insert(systemImportReports)
        .values({
          organizationId,
          operatingUnitId,
          projectId: input.projectId,
          module: input.module,
          importType: input.importType,
          userId,
          userName,
          userRole,
          importSummary: input.importSummary,
          errorDetails: input.errorDetails,
          errorFilePath: errorFileUrl,
          status: 'open',
        })
        .$returningId();

      return {
        success: true,
        reportId: report.id,
        message: 'Error report submitted successfully to Platform Admin',
      };
    }),

  /**
   * List all import error reports (Platform Admin only)
   * Uses scopedProcedure - organizationId comes from ctx.scope
   */
  listImportErrorReports: scopedProcedure
    .input(
      z.object({
        status: z.enum(["open", "reviewed", "resolved"]).optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Only platform admins can view reports
      if (ctx.user.role !== "platform_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only platform admins can view import error reports" });
      }

      const conditions = [eq(systemImportReports.organizationId, organizationId)];
      if (input.status) conditions.push(eq(systemImportReports.status, input.status));

      const reports = await db
        .select()
        .from(systemImportReports)
        .where(and(...conditions))
        .orderBy(desc(systemImportReports.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return reports;
    }),

  /**
   * Update report status (Platform Admin only)
   */
  updateReportStatus: scopedProcedure
    .input(
      z.object({
        reportId: z.number(),
        status: z.enum(["open", "reviewed", "resolved"]),
        resolutionNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Only platform admins can update report status
      if (ctx.user.role !== "platform_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only platform admins can update report status" });
      }

      await db
        .update(systemImportReports)
        .set({
          status: input.status,
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
          resolutionNotes: input.resolutionNotes,
        })
        .where(eq(systemImportReports.id, input.reportId));

      return { success: true };
    }),
});
