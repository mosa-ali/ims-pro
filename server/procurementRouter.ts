import { z } from "zod";
import { publicProcedure, protectedProcedure, scopedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { procurementPlan, projects, budgetItems, activities } from "../drizzle/schema";
import { eq, and, desc, isNull } from "drizzle-orm";

/**
 * Procurement Router - Project Procurement Management
 * MANDATORY: All queries filter isDeleted = false
 * MANDATORY: Delete operations use soft delete only (no hard delete)
 * 
 * PLATFORM-LEVEL ISOLATION: Uses scopedProcedure to automatically inject
 * organizationId and operatingUnitId from HTTP headers via ctx.scope
 */
export const procurementRouter = router({
  // Get all procurement items for a project (excludes soft-deleted)
  // Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
  getByProject: scopedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { organizationId, operatingUnitId } = ctx.scope;
      
      return await db.select().from(procurementPlan).where(
          and(
            eq(procurementPlan.projectId, input.projectId),
            eq(procurementPlan.organizationId, organizationId),
            eq(procurementPlan.operatingUnitId, operatingUnitId),
            eq(procurementPlan.isDeleted, false)
          )
        ).orderBy(desc(procurementPlan.createdAt));
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
      
      const all = await db.select().from(procurementPlan).where(
          and(
            eq(procurementPlan.projectId, input.projectId),
            eq(procurementPlan.organizationId, organizationId),
            eq(procurementPlan.operatingUnitId, operatingUnitId),
            eq(procurementPlan.isDeleted, false)
          )
        );
      
      return {
        total: all.length,
        planned: all.filter((p: any) => p.status === 'PLANNED').length,
        inProgress: all.filter((p: any) => p.status === 'IN_PROGRESS').length,
        completed: all.filter((p: any) => p.status === 'COMPLETED').length,
      };
    }),

  // Create procurement item
  // Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
  create: scopedProcedure
    .input(z.object({
      projectId: z.number(),
      activityId: z.number().optional(), // Activity link (Single Source of Truth)
      itemName: z.string(),
      itemNameAr: z.string().optional(),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
      category: z.enum(['GOODS', 'SERVICES', 'WORKS', 'CONSULTANCY']),
      subcategory: z.string().optional(),
      quantity: z.number(),
      unit: z.string(),
      estimatedCost: z.string(),
      actualCost: z.string().optional(),
      currency: z.enum(['USD', 'EUR', 'GBP', 'CHF']).default('USD'),
      plannedProcurementDate: z.string(),
      actualProcurementDate: z.string().optional(),
      deliveryDate: z.string().optional(),
      procurementMethod: z.enum(['ONE_QUOTATION', 'THREE_QUOTATION', 'NEGOTIABLE_QUOTATION', 'TENDER', 'DIRECT_PURCHASE', 'OTHER']).optional(),
      recurrence: z.enum(['ONE_TIME', 'RECURRING']).optional(),
      status: z.enum(['PLANNED', 'REQUESTED', 'APPROVED', 'IN_PROCUREMENT', 'ORDERED', 'DELIVERED', 'CANCELLED']).default('PLANNED'),
      supplierName: z.string().optional(),
      supplierContact: z.string().optional(),
      budgetLine: z.string().optional(),
      notes: z.string().optional(),
      notesAr: z.string().optional(),
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
      
      const result = await db.insert(procurementPlan).values({
        projectId: input.projectId,
        organizationId,
        operatingUnitId,
        activityId: input.activityId,
        itemName: input.itemName,
        itemNameAr: input.itemNameAr,
        description: input.description,
        descriptionAr: input.descriptionAr,
        category: input.category,
        subcategory: input.subcategory,
        quantity: input.quantity.toString(),
        unit: input.unit,
        estimatedCost: input.estimatedCost,
        actualCost: input.actualCost,
        currency: input.currency,
        plannedProcurementDate: input.plannedProcurementDate,
        actualProcurementDate: input.actualProcurementDate,
        deliveryDate: input.deliveryDate,
        procurementMethod: input.procurementMethod,
        recurrence: input.recurrence,
        status: input.status,
        supplierName: input.supplierName,
        supplierContact: input.supplierContact,
        budgetLine: input.budgetLine,
        notes: input.notes,
        notesAr: input.notesAr,
        createdBy: ctx.user?.id,
        updatedBy: ctx.user?.id,
      });
      
      return { success: true, id: result[0].insertId };
    }),

  // Update procurement item
  // Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
  update: scopedProcedure
    .input(z.object({
      id: z.number(),
      activityId: z.number().optional(), // Activity link (Single Source of Truth)
      itemName: z.string().optional(),
      itemNameAr: z.string().optional(),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
      category: z.enum(['GOODS', 'SERVICES', 'WORKS', 'CONSULTANCY']).optional(),
      subcategory: z.string().optional(),
      quantity: z.number().optional(),
      unit: z.string().optional(),
      estimatedCost: z.string().optional(),
      actualCost: z.string().optional(),
      currency: z.enum(['USD', 'EUR', 'GBP', 'CHF']).optional(),
      plannedProcurementDate: z.string().optional(),
      actualProcurementDate: z.string().optional(),
      deliveryDate: z.string().optional(),
      procurementMethod: z.enum(['ONE_QUOTATION', 'THREE_QUOTATION', 'NEGOTIABLE_QUOTATION', 'TENDER', 'DIRECT_PURCHASE', 'OTHER']).optional(),
      recurrence: z.enum(['ONE_TIME', 'RECURRING']).optional(),
      status: z.enum(['PLANNED', 'REQUESTED', 'APPROVED', 'IN_PROCUREMENT', 'ORDERED', 'DELIVERED', 'CANCELLED']).optional(),
      supplierName: z.string().optional(),
      supplierContact: z.string().optional(),
      budgetLine: z.string().optional(),
      notes: z.string().optional(),
      notesAr: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { organizationId, operatingUnitId } = ctx.scope;
      const { id, ...updateData } = input;
      
      // Verify procurement item belongs to current scope
      const [item] = await db
        .select()
        .from(procurementPlan)
        .where(and(
          eq(procurementPlan.id, id),
          eq(procurementPlan.organizationId, organizationId),
          eq(procurementPlan.operatingUnitId, operatingUnitId)
        ))
        .limit(1);
      
      if (!item) {
        throw new Error("Procurement item not found");
      }
      
      await db.update(procurementPlan).set({ ...updateData, updatedBy: ctx.user?.id })
        .where(and(
          eq(procurementPlan.id, id),
          eq(procurementPlan.organizationId, organizationId),
          eq(procurementPlan.operatingUnitId, operatingUnitId)
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

      const { validateRow } = await import('../shared/importFramework');
      const { PROCUREMENT_CONFIG } = await import('../shared/importConfigs/procurement');
      
      // Verify project belongs to current scope and get organization currency
      const project = await db.select().from(projects)
        .where(and(
          eq(projects.id, input.projectId),
          eq(projects.organizationId, organizationId),
          eq(projects.operatingUnitId, operatingUnitId)
        ))
        .limit(1);
      
      if (!project.length) {
        throw new Error("Project not found");
      }
      
      const organizationCurrency = project[0]?.currency || 'USD';

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
          const validation = validateRow(rowData, rowNumber, { ...PROCUREMENT_CONFIG, language: 'en', context: { organizationCurrency } });

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

          await db.insert(procurementPlan).values({
            projectId: input.projectId,
            organizationId,
            operatingUnitId,
            itemName: validation.data.itemName,
            itemNameAr: validation.data.itemNameAr,
            description: validation.data.description,
            descriptionAr: validation.data.descriptionAr,
            category: validation.data.category,
            quantity: validation.data.quantity,
            unit: validation.data.unit,
            estimatedCost: validation.data.estimatedCost.toString(),
            currency: validation.data.currency || 'USD',
            procurementMethod: validation.data.procurementMethod,
            plannedDate: validation.data.plannedDate,
            actualDate: validation.data.actualDate,
            status: validation.data.status || 'PLANNED',
            supplierName: validation.data.supplierName,
            supplierContact: validation.data.supplierContact,
            budgetLine: validation.data.budgetLine,
            notes: validation.data.notes,
            notesAr: validation.data.notesAr,
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
      
      // Verify procurement item belongs to current scope
      const [item] = await db
        .select()
        .from(procurementPlan)
        .where(and(
          eq(procurementPlan.id, input.id),
          eq(procurementPlan.organizationId, organizationId),
          eq(procurementPlan.operatingUnitId, operatingUnitId)
        ))
        .limit(1);
      
      if (!item) {
        throw new Error("Procurement item not found");
      }
      
      await db.update(procurementPlan).set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user?.id,
        }).where(and(
          eq(procurementPlan.id, input.id),
          eq(procurementPlan.organizationId, organizationId),
          eq(procurementPlan.operatingUnitId, operatingUnitId)
        ));
      
      return { success: true };
    }),

  // Generate/Initialize Procurement Plan from Activities with their budget totals
  // Creates ONE row per Activity with Activity Code, Activity Name, and Total Budget
  // All other columns left empty for manual entry
  // Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
  generateProcurementPlan: scopedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { organizationId, operatingUnitId } = ctx.scope;

      // Verify project belongs to current scope and get project details
      const project = await db.select().from(projects)
        .where(and(
          eq(projects.id, input.projectId),
          eq(projects.organizationId, organizationId),
          eq(projects.operatingUnitId, operatingUnitId)
        ))
        .limit(1);
      
      if (!project.length) {
        throw new Error("Project not found");
      }

      // Get all activities for this project within current scope
      const projectActivities = await db
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
        );

      if (!projectActivities.length) {
        throw new Error("No activities found. Please add activities in the Activities tab first.");
      }

      // Get budget totals per activity from budget_items
      // Note: budget_items table doesn't have isDeleted column
      const budgetItemsList = await db
        .select({
          activityId: budgetItems.activityId,
          totalBudgetLine: budgetItems.totalBudgetLine,
          currency: budgetItems.currency,
        })
        .from(budgetItems)
        .where(
          and(
            eq(budgetItems.projectId, input.projectId),
            eq(budgetItems.organizationId, organizationId),
            eq(budgetItems.operatingUnitId, operatingUnitId)
          )
        );

      // Calculate total budget per activity
      const activityBudgets: Record<number, { total: number; currency: string }> = {};
      for (const item of budgetItemsList) {
        if (item.activityId) {
          if (!activityBudgets[item.activityId]) {
            activityBudgets[item.activityId] = { total: 0, currency: item.currency || 'USD' };
          }
          activityBudgets[item.activityId].total += parseFloat(item.totalBudgetLine || '0');
        }
      }

      // Clear existing procurement items for this project (reinitialize)
      await db.update(procurementPlan).set({
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: ctx.user?.id,
      }).where(
        and(
          eq(procurementPlan.projectId, input.projectId),
          eq(procurementPlan.organizationId, organizationId),
          eq(procurementPlan.operatingUnitId, operatingUnitId),
          eq(procurementPlan.isDeleted, false)
        )
      );

      // Create ONE procurement row per Activity with budget total
      // All other fields left empty/default for manual entry
      let created = 0;
      // Use project start date as default planned procurement date
      const defaultDate = project[0].startDate || new Date();
      
      for (const activity of projectActivities) {
        const budget = activityBudgets[activity.id] || { total: 0, currency: project[0].currency || 'USD' };
        
        await db.insert(procurementPlan).values({
          projectId: input.projectId,
          organizationId,
          operatingUnitId,
          activityId: activity.id,
          // Item Description - placeholder for manual entry (NOT NULL field)
          itemName: `[${activity.activityCode}] - Enter item description`,
          description: '',
          // Category - default, user will change
          category: 'GOODS',
          // Quantity - default 1 for manual entry (NOT NULL field)
          quantity: '1',
          unit: 'Unit', // Default unit (NOT NULL field)
          // Estimated Total Cost - from Financial Overview budget
          estimatedCost: budget.total.toFixed(2),
          currency: budget.currency as 'USD' | 'EUR' | 'GBP' | 'CHF',
          // Planned Start Date - use project start date as default (NOT NULL field)
          plannedProcurementDate: defaultDate,
          // Status - default PLANNED
          status: 'PLANNED',
          // Other fields empty
          budgetLine: '',
          createdBy: ctx.user?.id,
          updatedBy: ctx.user?.id,
        });
        created++;
      }

      return { success: true, created, message: `Procurement plan initialized with ${created} activities from budget` };
    }),
});
