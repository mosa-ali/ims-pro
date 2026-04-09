import { z } from "zod";
import { publicProcedure, protectedProcedure, scopedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { activities, projects } from "../drizzle/schema";
import { eq, and, desc, isNull, or } from "drizzle-orm";

/**
 * Activities Router - Project Activities Management
 * MANDATORY: All queries filter isDeleted = false
 * MANDATORY: Delete operations use soft delete only (no hard delete)
 * 
 * PLATFORM-LEVEL ISOLATION: Uses scopedProcedure to automatically inject
 * organizationId and operatingUnitId from HTTP headers via ctx.scope
 */
export const activitiesRouter = router({
  // Get all activities for a project (excludes soft-deleted)
  // Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
  getByProject: scopedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
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
      
      const results = await db
        .select()
        .from(activities)
        .where(
          and(
            eq(activities.projectId, input.projectId),
            eq(activities.organizationId, organizationId),
            eq(activities.operatingUnitId, operatingUnitId),
            eq(activities.isDeleted, false) // MANDATORY: Filter soft-deleted records
          )
        )
        .orderBy(desc(activities.createdAt));
      
      // Date serialization is handled by global middleware
      return results;
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
      
      const allActivities = await db
        .select()
        .from(activities)
        .where(
          and(
            eq(activities.projectId, input.projectId),
            eq(activities.organizationId, organizationId),
            eq(activities.operatingUnitId, operatingUnitId),
            eq(activities.isDeleted, false) // MANDATORY: Filter soft-deleted records
          )
        );
      
      const completed = allActivities.filter(a => a.status === 'COMPLETED').length;
      const inProgress = allActivities.filter(a => a.status === 'IN_PROGRESS').length;
      const notStarted = allActivities.filter(a => a.status === 'NOT_STARTED').length;
      
      return {
        total: allActivities.length,
        completed,
        inProgress,
        notStarted,
      };
    }),

  // Create activity
  // Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
  create: scopedProcedure
    .input(z.object({
      projectId: z.number(),
      activityCode: z.string(), // Required: Unique code per project (e.g., ACT-001)
      activityName: z.string(),
      activityNameAr: z.string().optional(),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
      plannedStartDate: z.string(),
      plannedEndDate: z.string(),
      actualStartDate: z.string().optional(),
      actualEndDate: z.string().optional(),
      status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED']).default('NOT_STARTED'),
      progressPercentage: z.string().default('0.00'),
      target: z.string().optional(),
      unitType: z.string().optional(),
      achievedValue: z.string().optional(),
      budgetAllocated: z.string().default('0.00'),
      actualSpent: z.string().default('0.00'),
      currency: z.enum(['USD', 'EUR', 'GBP', 'CHF']).default('USD'),
      location: z.string().optional(),
      locationAr: z.string().optional(),
      responsiblePerson: z.string().optional(),
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
      
      // Validate: activityCode must be unique per project
      const existing = await db
        .select()
        .from(activities)
        .where(
          and(
            eq(activities.projectId, input.projectId),
            eq(activities.activityCode, input.activityCode),
            eq(activities.organizationId, organizationId),
            eq(activities.operatingUnitId, operatingUnitId),
            eq(activities.isDeleted, false)
          )
        )
        .limit(1);
      
      if (existing.length > 0) {
        throw new Error(`Activity code "${input.activityCode}" already exists in this project`);
      }
      
      const result = await db.insert(activities).values({
        ...input,
        organizationId,
        operatingUnitId,
        createdBy: ctx.user?.id,
        updatedBy: ctx.user?.id,
      });
      
      return { success: true, id: result[0].insertId };
    }),

  // Update activity
  // Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
  update: scopedProcedure
    .input(z.object({
      id: z.number(),
      activityCode: z.string().optional(), // Optional: Update activity code
      activityName: z.string().optional(),
      activityNameAr: z.string().optional(),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
      plannedStartDate: z.string().optional(),
      plannedEndDate: z.string().optional(),
      actualStartDate: z.string().optional(),
      actualEndDate: z.string().optional(),
      status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED']).optional(),
      progressPercentage: z.string().optional(),
      target: z.string().optional(),
      unitType: z.string().optional(),
      achievedValue: z.string().optional(),
      budgetAllocated: z.string().optional(),
      actualSpent: z.string().optional(),
      currency: z.enum(['USD', 'EUR', 'GBP', 'CHF']).optional(),
      location: z.string().optional(),
      locationAr: z.string().optional(),
      responsiblePerson: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { organizationId, operatingUnitId } = ctx.scope;
      const { id, ...updateData } = input;
      
      // Verify activity belongs to current scope
      const [activity] = await db
        .select()
        .from(activities)
        .where(and(
          eq(activities.id, id),
          eq(activities.organizationId, organizationId),
          eq(activities.operatingUnitId, operatingUnitId)
        ))
        .limit(1);
      
      if (!activity) {
        throw new Error("Activity not found");
      }
      
      // Auto-calculate progressPercentage from target and achievedValue if both provided
      // This calculation takes precedence over manual progressPercentage input
      if (updateData.target && updateData.achievedValue) {
        const target = parseFloat(updateData.target);
        const achieved = parseFloat(updateData.achievedValue);
        if (target > 0) {
          const percentage = Math.min((achieved / target) * 100, 100);
          updateData.progressPercentage = percentage.toFixed(2);
        }
      }
      
      // Auto-sync progressPercentage with status if not explicitly provided and no target-based calculation
      if (updateData.status && !updateData.progressPercentage) {
        if (updateData.status === 'COMPLETED') {
          updateData.progressPercentage = '100.00';
        } else if (updateData.status === 'NOT_STARTED') {
          updateData.progressPercentage = '0.00';
        }
        // For IN_PROGRESS, ON_HOLD, CANCELLED: keep existing progressPercentage
      }
      
      await db
        .update(activities)
        .set({
          ...updateData,
          updatedBy: ctx.user?.id,
        })
        .where(and(
          eq(activities.id, id),
          eq(activities.organizationId, organizationId),
          eq(activities.operatingUnitId, operatingUnitId)
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
      const { ACTIVITIES_CONFIG } = await import('../shared/importConfigs/activities');

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
        const rowNumber = i + 2; // Excel row (header is row 1)

        try {
          // Validate row using shared framework (Layers 1-4)
          const validation = validateRow(rowData, rowNumber, { ...ACTIVITIES_CONFIG, language: 'en' });

          if (!validation.isValid) {
            // Collect all validation errors for this row
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

          // Layer 5: Business Rules (Backend-specific validation)
          // Check for duplicates if needed
          // (Activities allow duplicates, so skip this check)

          // Insert validated row with scope from context
          await db.insert(activities).values({
            projectId: input.projectId,
            organizationId,
            operatingUnitId,
            activityCode: validation.data.activityCode || `ACT-${Date.now()}`, // Generate if missing
            activityName: validation.data.activityName,
            activityNameAr: validation.data.activityNameAr,
            description: validation.data.description,
            descriptionAr: validation.data.descriptionAr,
            plannedStartDate: validation.data.plannedStartDate,
            plannedEndDate: validation.data.plannedEndDate,
            actualStartDate: validation.data.actualStartDate,
            actualEndDate: validation.data.actualEndDate,
            status: validation.data.status || 'NOT_STARTED',
            progressPercentage: validation.data.progressPercentage?.toString() || '0.00',
            budgetAllocated: validation.data.budgetAllocated?.toString() || '0.00',
            actualSpent: validation.data.actualSpent?.toString() || '0.00',
            currency: validation.data.currency || 'USD',
            location: validation.data.location,
            locationAr: validation.data.locationAr,
            responsiblePerson: validation.data.responsiblePerson,
            createdBy: ctx.user?.id,
            updatedBy: ctx.user?.id,
          });

          results.imported++;
        } catch (error: any) {
          // System error (database, unexpected issues)
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
      
      // Verify activity belongs to current scope
      const [activity] = await db
        .select()
        .from(activities)
        .where(and(
          eq(activities.id, input.id),
          eq(activities.organizationId, organizationId),
          eq(activities.operatingUnitId, operatingUnitId)
        ))
        .limit(1);
      
      if (!activity) {
        throw new Error("Activity not found");
      }
      
      // MANDATORY: Soft delete only - set isDeleted = true
      await db
        .update(activities)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user?.id,
        })
        .where(and(
          eq(activities.id, input.id),
          eq(activities.organizationId, organizationId),
          eq(activities.operatingUnitId, operatingUnitId)
        ));
      
      return { success: true };
    }),

  // Get dropdown list for UI (Activity Code + Name)
  // Returns activityCode and activityName as expected by frontend components
  // Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
  getDropdownList: scopedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { organizationId, operatingUnitId } = ctx.scope;
      
      const result = await db
        .select({
          id: activities.id,
          activityCode: activities.activityCode,
          activityName: activities.activityName,
        })
        .from(activities)
        .where(
          and(
            eq(activities.projectId, input.projectId),
            eq(activities.organizationId, organizationId),
            eq(activities.operatingUnitId, operatingUnitId),
            eq(activities.isDeleted, false)
          )
        )
        .orderBy(activities.activityCode);
      
      return result;
    }),
});
