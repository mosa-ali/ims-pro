import { z } from "zod";
import { publicProcedure, protectedProcedure, router, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { mealIndicatorDataEntries, indicators } from "../drizzle/schema";
import { eq, and, desc, sum } from "drizzle-orm";

/**
 * MEAL Indicator Data Entries Router - Periodic Data Collection for Indicators
 * MANDATORY: All queries filter isDeleted = false
 * MANDATORY: Delete operations use soft delete only (no hard delete)
 */
export const mealIndicatorDataRouter = router({
  // Get all data entries for an indicator (excludes soft-deleted)
  getByIndicator: scopedProcedure
    .input(z.object({
      indicatorId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      return await db
        .select()
        .from(mealIndicatorDataEntries)
        .where(
          and(
            eq(mealIndicatorDataEntries.indicatorId, input.indicatorId),
            eq(mealIndicatorDataEntries.organizationId, organizationId),
            eq(mealIndicatorDataEntries.isDeleted, false)
          )
        )
        .orderBy(desc(mealIndicatorDataEntries.periodEndDate));
    }),

  // Get all data entries for a project (excludes soft-deleted)
  getByProject: scopedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const conditions = [
        eq(mealIndicatorDataEntries.projectId, input.projectId),
        eq(mealIndicatorDataEntries.organizationId, organizationId),
        eq(mealIndicatorDataEntries.isDeleted, false),
      ];
      
      if (operatingUnitId) {
        conditions.push(eq(mealIndicatorDataEntries.operatingUnitId, operatingUnitId));
      }
      
      return await db
        .select({
          dataEntry: mealIndicatorDataEntries,
          indicator: indicators,
        })
        .from(mealIndicatorDataEntries)
        .leftJoin(indicators, eq(mealIndicatorDataEntries.indicatorId, indicators.id))
        .where(and(...conditions))
        .orderBy(desc(mealIndicatorDataEntries.periodEndDate));
    }),

  // Get single data entry by ID
  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db
        .select()
        .from(mealIndicatorDataEntries)
        .where(
          and(
            eq(mealIndicatorDataEntries.id, input.id),
            eq(mealIndicatorDataEntries.organizationId, organizationId),
            eq(mealIndicatorDataEntries.isDeleted, false)
          )
        )
        .limit(1);
      
      return result[0] || null;
    }),

  // Get statistics for dashboard
  getStatistics: scopedProcedure
    .input(z.object({
      projectId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const conditions = [
        eq(mealIndicatorDataEntries.organizationId, organizationId),
        eq(mealIndicatorDataEntries.isDeleted, false),
      ];
      
      if (operatingUnitId) {
        conditions.push(eq(mealIndicatorDataEntries.operatingUnitId, operatingUnitId));
      }
      if (input.projectId) {
        conditions.push(eq(mealIndicatorDataEntries.projectId, input.projectId));
      }
      
      const allEntries = await db
        .select()
        .from(mealIndicatorDataEntries)
        .where(and(...conditions));
      
      const verified = allEntries.filter(e => e.isVerified).length;
      const pending = allEntries.filter(e => !e.isVerified).length;
      
      // Get unique indicators with data
      const uniqueIndicators = new Set(allEntries.map(e => e.indicatorId));
      
      return {
        total: allEntries.length,
        verified,
        pending,
        indicatorsWithData: uniqueIndicators.size,
      };
    }),

  // Create data entry
  create: scopedProcedure
    .input(z.object({
      indicatorId: z.number(),
      projectId: z.number().optional(),
      reportingPeriod: z.string(),
      periodStartDate: z.string(),
      periodEndDate: z.string(),
      achievedValue: z.string(),
      disaggregation: z.any().optional(),
      dataSource: z.string().optional(),
      evidenceFiles: z.any().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db.insert(mealIndicatorDataEntries).values({
        indicatorId: input.indicatorId,
        organizationId,
        operatingUnitId,
        projectId: input.projectId,
        reportingPeriod: input.reportingPeriod,
        periodStartDate: input.periodStartDate,
        periodEndDate: input.periodEndDate,
        achievedValue: input.achievedValue,
        disaggregation: input.disaggregation,
        dataSource: input.dataSource,
        evidenceFiles: input.evidenceFiles,
        notes: input.notes,
        createdBy: ctx.user?.id,
        updatedBy: ctx.user?.id,
      });
      
      // Also update the indicator's achievedValue in the indicators table
      // so the indicator card reflects the new data immediately
      await db
        .update(indicators)
        .set({
          achievedValue: input.achievedValue,
          updatedBy: ctx.user?.id,
        })
        .where(
          and(
            eq(indicators.id, input.indicatorId),
            eq(indicators.organizationId, organizationId)
          )
        );
      
      return { id: result[0].insertId, success: true };
    }),

  // Update data entry
  update: scopedProcedure
    .input(z.object({
      id: z.number(),
      reportingPeriod: z.string().optional(),
      periodStartDate: z.string().optional(),
      periodEndDate: z.string().optional(),
      achievedValue: z.string().optional(),
      disaggregation: z.any().optional(),
      dataSource: z.string().optional(),
      evidenceFiles: z.any().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, ...updateData } = input;
      
      await db
        .update(mealIndicatorDataEntries)
        .set({
          ...updateData,
          updatedBy: ctx.user?.id,
        })
        .where(and(eq(mealIndicatorDataEntries.id, id), eq(mealIndicatorDataEntries.organizationId, organizationId)));
      
      return { success: true };
    }),

  // SOFT DELETE ONLY - NO HARD DELETE ALLOWED
  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // MANDATORY: Soft delete only - set isDeleted = true
      await db
        .update(mealIndicatorDataEntries)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user?.id,
        })
        .where(and(eq(mealIndicatorDataEntries.id, input.id), eq(mealIndicatorDataEntries.organizationId, organizationId)));
      
      return { success: true };
    }),

  // Verify data entry
  verify: scopedProcedure
    .input(z.object({
      id: z.number(),
      verificationNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(mealIndicatorDataEntries)
        .set({
          isVerified: true,
          verifiedAt: new Date(),
          verifiedBy: ctx.user?.id,
          verificationNotes: input.verificationNotes,
          updatedBy: ctx.user?.id,
        })
        .where(and(eq(mealIndicatorDataEntries.id, input.id), eq(mealIndicatorDataEntries.organizationId, organizationId)));
      
      return { success: true };
    }),

  // Unverify data entry
  unverify: scopedProcedure
    .input(z.object({
      id: z.number(),
      verificationNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(mealIndicatorDataEntries)
        .set({
          isVerified: false,
          verifiedAt: null,
          verifiedBy: null,
          verificationNotes: input.verificationNotes,
          updatedBy: ctx.user?.id,
        })
        .where(and(eq(mealIndicatorDataEntries.id, input.id), eq(mealIndicatorDataEntries.organizationId, organizationId)));
      
      return { success: true };
    }),

  // Get cumulative progress for an indicator
  getCumulativeProgress: scopedProcedure
    .input(z.object({
      indicatorId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get all verified data entries for this indicator
      const entries = await db
        .select()
        .from(mealIndicatorDataEntries)
        .where(
          and(
            eq(mealIndicatorDataEntries.indicatorId, input.indicatorId),
            eq(mealIndicatorDataEntries.organizationId, organizationId),
            eq(mealIndicatorDataEntries.isDeleted, false),
            eq(mealIndicatorDataEntries.isVerified, true)
          )
        )
        .orderBy(mealIndicatorDataEntries.periodEndDate);
      
      // Get indicator details
      const indicatorResult = await db
        .select()
        .from(indicators)
        .where(and(eq(indicators.id, input.indicatorId), eq(indicators.organizationId, organizationId)))
        .limit(1);
      
      const indicator = indicatorResult[0];
      
      // Calculate cumulative value
      const cumulativeValue = entries.reduce((sum, entry) => {
        return sum + parseFloat(entry.achievedValue || '0');
      }, 0);
      
      const target = indicator ? parseFloat(indicator.target || '0') : 0;
      const progressPercentage = target > 0 ? (cumulativeValue / target) * 100 : 0;
      
      return {
        indicatorId: input.indicatorId,
        indicatorName: indicator?.indicatorName || '',
        indicatorNameAr: indicator?.indicatorNameAr || '',
        baseline: indicator?.baseline || '0',
        target: indicator?.target || '0',
        unit: indicator?.unit || '',
        cumulativeValue: cumulativeValue.toFixed(2),
        progressPercentage: Math.min(progressPercentage, 100).toFixed(1),
        entriesCount: entries.length,
        entries: entries.map(e => ({
          id: e.id,
          period: e.reportingPeriod,
          value: e.achievedValue,
          date: e.periodEndDate,
        })),
      };
    }),

  // Sync MEAL indicators data from project indicators table
  // This refreshes the MEAL tracking view to reflect the latest data from the indicators table.
  // The Project Indicators tab is the source of truth for achievedValue.
  // This procedure does NOT modify any data — it simply returns the current state
  // so the frontend can invalidate its cache and re-fetch.
  syncFromProject: scopedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get all indicators for this project (read-only, no writes)
      const conditions: any[] = [
        eq(indicators.projectId, input.projectId),
        eq(indicators.organizationId, organizationId),
        eq(indicators.isDeleted, false),
      ];
      if (operatingUnitId) {
        conditions.push(eq(indicators.operatingUnitId, operatingUnitId));
      }
      
      const projectIndicators = await db
        .select()
        .from(indicators)
        .where(and(...conditions));
      
      // Return the count so the frontend knows how many indicators were refreshed
      // The actual refresh happens via query invalidation on the frontend
      return { success: true, synced: projectIndicators.length, total: projectIndicators.length };
    }),

  // Bulk import indicator data entries from CSV/Excel
  bulkImport: scopedProcedure
    .input(z.object({
      projectId: z.number(),
      entries: z.array(z.object({
        indicatorId: z.number(),
        reportingPeriod: z.string(),
        periodStartDate: z.string(),
        periodEndDate: z.string(),
        achievedValue: z.string(),
        dataSource: z.string().optional(),
        notes: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const results = {
        imported: 0,
        skipped: 0,
        errors: [] as Array<{ row: number; message: string }>,
      };

      // Get valid indicators for this project
      const projectIndicators = await db
        .select()
        .from(indicators)
        .where(
          and(
            eq(indicators.projectId, input.projectId),
            eq(indicators.organizationId, organizationId),
            eq(indicators.isDeleted, false)
          )
        );
      const validIndicatorIds = new Set(projectIndicators.map(i => i.id));

      for (let i = 0; i < input.entries.length; i++) {
        const entry = input.entries[i];
        const rowNumber = i + 2;

        if (!validIndicatorIds.has(entry.indicatorId)) {
          results.errors.push({ row: rowNumber, message: `Indicator ID ${entry.indicatorId} not found in this project` });
          results.skipped++;
          continue;
        }

        if (!entry.achievedValue || isNaN(parseFloat(entry.achievedValue))) {
          results.errors.push({ row: rowNumber, message: `Invalid achieved value: ${entry.achievedValue}` });
          results.skipped++;
          continue;
        }

        try {
          await db.insert(mealIndicatorDataEntries).values({
            indicatorId: entry.indicatorId,
            organizationId,
            operatingUnitId,
            projectId: input.projectId,
            reportingPeriod: entry.reportingPeriod,
            periodStartDate: entry.periodStartDate,
            periodEndDate: entry.periodEndDate,
            achievedValue: entry.achievedValue,
            dataSource: entry.dataSource || null,
            notes: entry.notes || null,
            createdBy: ctx.user?.id,
            updatedBy: ctx.user?.id,
          });

          // Also update the indicator's achievedValue
          await db
            .update(indicators)
            .set({
              achievedValue: entry.achievedValue,
              updatedBy: ctx.user?.id,
            })
            .where(
              and(
                eq(indicators.id, entry.indicatorId),
                eq(indicators.organizationId, organizationId)
              )
            );

          results.imported++;
        } catch (error: any) {
          results.errors.push({ row: rowNumber, message: 'System error processing this entry' });
          results.skipped++;
        }
      }

      return results;
    }),
});
