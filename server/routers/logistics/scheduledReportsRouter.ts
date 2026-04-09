/**
 * Scheduled Reports Router
 * Handles automated report generation and email delivery
 */

import { z } from "zod";
import { publicProcedure, router, scopedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { eq, and, desc } from "drizzle-orm";
// TEMP UNBLOCK PATCH: scheduledReports table missing export from schema.ts
// import { InsertScheduledReport } from "../../../drizzle/schema";
type InsertScheduledReport = Record<string, any>; // Stub type until schema is fixed

export const scheduledReportsRouter = router({
  /**
   * List all scheduled reports
   */
  list: scopedProcedure.query(async ({ ctx }) => {
    const { organizationId, operatingUnitId } = ctx.scope;
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const conditions = [eq(scheduledReports.organizationId, organizationId)];
    if (operatingUnitId) {
      conditions.push(eq(scheduledReports.operatingUnitId, operatingUnitId));
    }

    const reports = await db
      .select()
      .from(scheduledReports)
      .where(and(...conditions))
      .orderBy(desc(scheduledReports.createdAt));

    return reports;
  }),

  /**
   * Get a single scheduled report
   */
  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const report = await db
        .select()
        .from(scheduledReports)
        .where(and(eq(scheduledReports.id, input.id), eq(scheduledReports.organizationId, organizationId)))
        .limit(1);

      return report[0] || null;
    }),

  /**
   * Create a new scheduled report
   */
  create: scopedProcedure
    .input(
      z.object({
        reportType: z.enum([
          "procurement_cycle_time",
          "supplier_performance",
          "po_aging",
          "spending_analysis",
          "inventory_summary",
        ]),
        frequency: z.enum(["weekly", "monthly"]),
        recipients: z.array(z.string().email()),
        dayOfWeek: z.number().min(0).max(6).optional(), // 0 = Sunday, 6 = Saturday
        dayOfMonth: z.number().min(1).max(31).optional(), // 1-31
        enabled: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const newReport: InsertScheduledReport = {
        organizationId,
        operatingUnitId: operatingUnitId || null,
        reportType: input.reportType,
        frequency: input.frequency,
        recipients: JSON.stringify(input.recipients),
        dayOfWeek: input.dayOfWeek || null,
        dayOfMonth: input.dayOfMonth || null,
        enabled: input.enabled,
        lastRunAt: null,
        nextRunAt: calculateNextRun(input.frequency, input.dayOfWeek, input.dayOfMonth),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.insert(scheduledReports).values(newReport);
      return { id: Number(result.insertId), ...newReport };
    }),

  /**
   * Update a scheduled report
   */
  update: scopedProcedure
    .input(
      z.object({
        id: z.number(),
        reportType: z.enum([
          "procurement_cycle_time",
          "supplier_performance",
          "po_aging",
          "spending_analysis",
          "inventory_summary",
        ]).optional(),
        frequency: z.enum(["weekly", "monthly"]).optional(),
        recipients: z.array(z.string().email()).optional(),
        dayOfWeek: z.number().min(0).max(6).optional(),
        dayOfMonth: z.number().min(1).max(31).optional(),
        enabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updates: any = {
        updatedAt: new Date(),
      };

      if (input.reportType !== undefined) updates.reportType = input.reportType;
      if (input.frequency !== undefined) updates.frequency = input.frequency;
      if (input.recipients !== undefined) updates.recipients = JSON.stringify(input.recipients);
      if (input.dayOfWeek !== undefined) updates.dayOfWeek = input.dayOfWeek;
      if (input.dayOfMonth !== undefined) updates.dayOfMonth = input.dayOfMonth;
      if (input.enabled !== undefined) updates.enabled = input.enabled;

      // Recalculate next run if frequency or schedule changed
      if (input.frequency !== undefined || input.dayOfWeek !== undefined || input.dayOfMonth !== undefined) {
        const existing = await db
          .select()
          .from(scheduledReports)
          .where(eq(scheduledReports.id, input.id))
          .limit(1);

        if (existing[0]) {
          updates.nextRunAt = calculateNextRun(
            input.frequency || existing[0].frequency,
            input.dayOfWeek !== undefined ? input.dayOfWeek : existing[0].dayOfWeek,
            input.dayOfMonth !== undefined ? input.dayOfMonth : existing[0].dayOfMonth
          );
        }
      }

      await db
        .update(scheduledReports)
        .set(updates)
        .where(and(eq(scheduledReports.id, input.id), eq(scheduledReports.organizationId, organizationId)));

      return { success: true };
    }),

  /**
   * Delete a scheduled report
   */
  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .delete(scheduledReports)
        .where(and(eq(scheduledReports.id, input.id), eq(scheduledReports.organizationId, organizationId)));

      return { success: true };
    }),
});

/**
 * Calculate next run time based on frequency and schedule
 */
function calculateNextRun(
  frequency: "weekly" | "monthly",
  dayOfWeek?: number | null,
  dayOfMonth?: number | null
): Date {
  const now = new Date();
  const nextRun = new Date(now);

  if (frequency === "weekly") {
    // Weekly: run on specified day of week at 8:00 AM
    const targetDay = dayOfWeek !== null && dayOfWeek !== undefined ? dayOfWeek : 1; // Default to Monday
    const currentDay = now.getDay();
    const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7; // If today, schedule for next week

    nextRun.setDate(now.getDate() + daysUntilTarget);
    nextRun.setHours(8, 0, 0, 0);
  } else {
    // Monthly: run on specified day of month at 8:00 AM
    const targetDate = dayOfMonth !== null && dayOfMonth !== undefined ? dayOfMonth : 1; // Default to 1st
    const currentDate = now.getDate();

    if (currentDate >= targetDate) {
      // Schedule for next month
      nextRun.setMonth(now.getMonth() + 1);
    }

    nextRun.setDate(targetDate);
    nextRun.setHours(8, 0, 0, 0);
  }

  return nextRun;
}
