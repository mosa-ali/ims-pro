import { z } from "zod";
import { publicProcedure, protectedProcedure, scopedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { indicators, projects } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * Indicators Router - Project Indicators Management
 * MANDATORY: All queries filter isDeleted = false
 * MANDATORY: Delete operations use soft delete only (no hard delete)
 * 
 * PLATFORM-LEVEL ISOLATION: Uses scopedProcedure to automatically inject
 * organizationId and operatingUnitId from HTTP headers via ctx.scope
 */
export const indicatorsRouter = router({
  // Get all indicators for a project (excludes soft-deleted)
  // Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
  getByProject: scopedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { organizationId, operatingUnitId } = ctx.scope;
      
      return await db
        .select()
        .from(indicators)
        .where(
          and(
            eq(indicators.projectId, input.projectId),
            eq(indicators.organizationId, organizationId),
            eq(indicators.operatingUnitId, operatingUnitId),
            eq(indicators.isDeleted, false) // MANDATORY: Filter soft-deleted records
          )
        )
        .orderBy(desc(indicators.createdAt));
    }),

  // Get single indicator by ID (excludes soft-deleted)
  getById: scopedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { organizationId } = ctx.scope;
      
      const result = await db
        .select()
        .from(indicators)
        .where(
          and(
            eq(indicators.id, input.id),
            eq(indicators.organizationId, organizationId),
            eq(indicators.isDeleted, false)
          )
        )
        .limit(1);
      
      return result[0] || null;
    }),

  // Get statistics for Overview tab (excludes soft-deleted)
  // Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
  getStatistics: scopedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { organizationId, operatingUnitId } = ctx.scope;
      
      const allIndicators = await db
        .select()
        .from(indicators)
        .where(
          and(
            eq(indicators.projectId, input.projectId),
            eq(indicators.organizationId, organizationId),
            eq(indicators.operatingUnitId, operatingUnitId),
            eq(indicators.isDeleted, false) // MANDATORY: Filter soft-deleted records
          )
        );
      
      const achieved = allIndicators.filter(i => i.status === 'ACHIEVED').length;
      const onTrack = allIndicators.filter(i => i.status === 'ON_TRACK').length;
      const atRisk = allIndicators.filter(i => i.status === 'AT_RISK').length;
      const offTrack = allIndicators.filter(i => i.status === 'OFF_TRACK').length;
      
      return {
        total: allIndicators.length,
        achieved,
        onTrack,
        atRisk,
        offTrack,
      };
    }),

  // Create indicator
  // Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
  create: scopedProcedure
    .input(z.object({
      projectId: z.number(),
      activityId: z.number().optional(), // Activity link (Single Source of Truth)
      indicatorName: z.string(),
      indicatorNameAr: z.string().optional(),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
      type: z.enum(['OUTPUT', 'OUTCOME', 'IMPACT']).default('OUTPUT'),
      category: z.string().optional(),
      unit: z.string(),
      baseline: z.string().default('0.00'),
      target: z.string(),
      achievedValue: z.string().default('0.00'),
      targetDate: z.string().optional(),
      dataSource: z.string().optional(),
      verificationMethod: z.string().optional(),
      reportingFrequency: z.enum(['monthly', 'quarterly', 'bi_annually', 'annually', 'end_of_project']).default('quarterly').optional(),
      status: z.enum(['ON_TRACK', 'AT_RISK', 'OFF_TRACK', 'ACHIEVED']).default('ON_TRACK'),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { organizationId, operatingUnitId } = ctx.scope;
      
      // Verify project belongs to current scope
      const [project] = await db
        .select()
        .from(projects)
        .where(and(
          eq(projects.id, input.projectId),
          eq(projects.organizationId, organizationId),
          eq(projects.operatingUnitId, operatingUnitId)
        ))
        .limit(1);
      
      if (!project) {
        throw new Error("Project not found");
      }
      
      // Auto-calculate status based on achieved/target ratio if not explicitly set
      const target = parseFloat(input.target || '0');
      const achieved = parseFloat(input.achievedValue || '0');
      const baseline = parseFloat(input.baseline || '0');
      let computedStatus = input.status;
      if (target > 0) {
        const range = target - baseline;
        const progress = range > 0 ? ((achieved - baseline) / range) * 100 : 0;
        if (progress >= 100) computedStatus = 'ACHIEVED';
        else if (progress >= 60) computedStatus = 'ON_TRACK';
        else if (progress >= 30) computedStatus = 'AT_RISK';
        else computedStatus = 'OFF_TRACK';
      }
      
      const result = await db.insert(indicators).values({
        ...input,
        status: computedStatus,
        organizationId,
        operatingUnitId,
        createdBy: ctx.user?.id,
        updatedBy: ctx.user?.id,
      });
      
      return { success: true, id: result[0].insertId };
    }),

  // Update indicator
  // Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
  update: scopedProcedure
    .input(z.object({
      id: z.number(),
      activityId: z.number().optional(), // Activity link (Single Source of Truth)
      indicatorName: z.string().optional(),
      indicatorNameAr: z.string().optional(),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
      type: z.enum(['OUTPUT', 'OUTCOME', 'IMPACT']).optional(),
      category: z.string().optional(),
      unit: z.string().optional(),
      baseline: z.string().optional(),
      target: z.string().optional(),
      achievedValue: z.string().optional(),
      targetDate: z.string().optional(),
      dataSource: z.string().optional(),
      verificationMethod: z.string().optional(),
      reportingFrequency: z.enum(['monthly', 'quarterly', 'bi_annually', 'annually', 'end_of_project']).optional(),
      status: z.enum(['ON_TRACK', 'AT_RISK', 'OFF_TRACK', 'ACHIEVED']).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { organizationId, operatingUnitId } = ctx.scope;
      const { id, ...updateData } = input;
      
      // Verify indicator belongs to current scope
      const [indicator] = await db
        .select()
        .from(indicators)
        .where(and(
          eq(indicators.id, id),
          eq(indicators.organizationId, organizationId),
          eq(indicators.operatingUnitId, operatingUnitId)
        ))
        .limit(1);
      
      if (!indicator) {
        throw new Error("Indicator not found");
      }
      
      // Auto-calculate status based on achieved/target ratio
      const effectiveTarget = parseFloat(updateData.target || indicator.target?.toString() || '0');
      const effectiveAchieved = parseFloat(updateData.achievedValue || indicator.achievedValue?.toString() || '0');
      const effectiveBaseline = parseFloat(updateData.baseline || indicator.baseline?.toString() || '0');
      
      let autoStatus = updateData.status;
      if (!autoStatus && effectiveTarget > 0) {
        const range = effectiveTarget - effectiveBaseline;
        const progress = range > 0 ? ((effectiveAchieved - effectiveBaseline) / range) * 100 : 0;
        if (progress >= 100) autoStatus = 'ACHIEVED';
        else if (progress >= 60) autoStatus = 'ON_TRACK';
        else if (progress >= 30) autoStatus = 'AT_RISK';
        else autoStatus = 'OFF_TRACK';
      }
      
      await db
        .update(indicators)
        .set({
          ...updateData,
          ...(autoStatus ? { status: autoStatus } : {}),
          updatedBy: ctx.user?.id,
        })
        .where(and(
          eq(indicators.id, id),
          eq(indicators.organizationId, organizationId),
          eq(indicators.operatingUnitId, operatingUnitId)
        ));
      
      return { success: true };
    }),

  // BULK IMPORT FROM EXCEL
  // Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
  bulkImport: scopedProcedure
    .input(z.object({
      projectId: z.number(),
      rows: z.array(z.record(z.string(), z.any())),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { organizationId, operatingUnitId } = ctx.scope;

      // Verify project belongs to current scope
      const [project] = await db
        .select()
        .from(projects)
        .where(and(
          eq(projects.id, input.projectId),
          eq(projects.organizationId, organizationId),
          eq(projects.operatingUnitId, operatingUnitId)
        ))
        .limit(1);
      
      if (!project) {
        throw new Error("Project not found");
      }

      const { validateRow } = await import('../shared/importFramework');
      const { INDICATORS_CONFIG } = await import('../shared/importConfigs/indicators');

      const results = {
        imported: 0,
        skipped: 0,
        errors: [] as Array<{
          row: number;
          field: string;
          value: any;
          errorType: string;
          message: string;
          suggestedFix?: string;
          originalData: Record<string, any>;
        }>,
      };

      for (let i = 0; i < input.rows.length; i++) {
        const rowData = input.rows[i];
        const rowNumber = i + 2;

        try {
          const validation = validateRow(rowData, rowNumber, { ...INDICATORS_CONFIG, language: 'en' });

          if (!validation.isValid) {
            validation.errors.forEach(error => {
              results.errors.push({
                row: rowNumber,
                field: error.field,
                value: error.value,
                errorType: error.errorType,
                message: error.message,
                suggestedFix: error.suggestedFix,
                originalData: rowData,
              });
            });
            results.skipped++;
            continue;
          }

          await db.insert(indicators).values({
            projectId: input.projectId,
            organizationId,
            operatingUnitId,
            indicatorName: validation.data.indicatorName,
            indicatorNameAr: validation.data.indicatorNameAr,
            description: validation.data.description,
            descriptionAr: validation.data.descriptionAr,
            type: validation.data.type || 'OUTPUT',
            category: validation.data.category,
            unit: validation.data.unit,
            baseline: validation.data.baseline?.toString() || '0.00',
            target: validation.data.target.toString(),
            achievedValue: validation.data.achievedValue?.toString() || '0.00',
            targetDate: validation.data.targetDate,
            dataSource: validation.data.dataSource,
            verificationMethod: validation.data.verificationMethod,
            status: validation.data.status || 'ON_TRACK',
            createdBy: ctx.user?.id,
            updatedBy: ctx.user?.id,
          });

          results.imported++;
        } catch (error: any) {
          results.errors.push({
            row: rowNumber,
            field: 'system',
            value: null,
            errorType: 'system',
            message: 'A system error occurred while processing this record',
            suggestedFix: 'Please contact support if this error persists',
            originalData: rowData,
          });
          results.skipped++;
        }
      }

      return results;
    }),

  // SOFT DELETE ONLY - NO HARD DELETE ALLOWED
  // Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { organizationId, operatingUnitId } = ctx.scope;
      
      // Verify indicator belongs to current scope
      const [indicator] = await db
        .select()
        .from(indicators)
        .where(and(
          eq(indicators.id, input.id),
          eq(indicators.organizationId, organizationId),
          eq(indicators.operatingUnitId, operatingUnitId)
        ))
        .limit(1);
      
      if (!indicator) {
        throw new Error("Indicator not found");
      }
      
      // MANDATORY: Soft delete only - set isDeleted = true
      await db
        .update(indicators)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user?.id,
        })
        .where(and(
          eq(indicators.id, input.id),
          eq(indicators.organizationId, organizationId),
          eq(indicators.operatingUnitId, operatingUnitId)
        ));
      
      return { success: true };
    }),
});
