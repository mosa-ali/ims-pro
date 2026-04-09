/**
 * Budget Items Router
 * 
 * REFACTORED TO USE SHARED IMPORT FRAMEWORK + PLATFORM-LEVEL ISOLATION
 * 
 * This router now uses the system-wide import framework for consistent validation
 * and error handling across all modules.
 * 
 * PLATFORM-LEVEL ISOLATION: Uses scopedProcedure to automatically inject
 * organizationId and operatingUnitId from HTTP headers via ctx.scope
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, scopedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { budgetItems, projects, importHistory, activities } from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { 
  validateRow, 
  ValidationError,
  ParsedRow,
  ImportResult 
} from "../shared/importFramework";
import { 
  FINANCIAL_OVERVIEW_CONFIG,
  FINANCIAL_OVERVIEW_COLUMNS,
  SUPPORTED_CURRENCIES 
} from "../shared/importConfigs/financialOverview";
import { syncProjectSpent } from "./helpers/syncProjectSpent";
import { syncActivitySpent } from "./helpers/syncActivitySpent";

/**
 * Legacy import error type (for backward compatibility)
 */
interface ImportError {
  row: number;
  field: string;
  message: string;
  suggestedFix?: string;
  data?: any;
}

/**
 * Convert ValidationError to legacy ImportError format
 */
function toLegacyError(error: ValidationError): ImportError {
  return {
    row: error.row,
    field: error.field,
    message: error.message,
    suggestedFix: error.suggestedFix,
    data: error.originalData,
  };
}

export const budgetItemsRouter = router({
  /**
   * List budget items for a project
   * Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
   */
  list: scopedProcedure
    .input(
      z.object({
        projectId: z.number(),
        limit: z.number().min(1).max(1000).default(100),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { projectId, limit, offset } = input;
      const { organizationId, operatingUnitId } = ctx.scope;

      // Verify project belongs to current scope
      const [project] = await db
        .select()
        .from(projects)
        .where(and(
          eq(projects.id, projectId),
          eq(projects.organizationId, organizationId),
          eq(projects.operatingUnitId, operatingUnitId)
        ))
        .limit(1);

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      const items = await db
        .select()
        .from(budgetItems)
        .where(and(
          eq(budgetItems.projectId, projectId),
          eq(budgetItems.organizationId, organizationId),
          eq(budgetItems.operatingUnitId, operatingUnitId),
          eq(budgetItems.isDeleted, false)
        ))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(budgetItems.createdAt));

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(budgetItems)
        .where(and(
          eq(budgetItems.projectId, projectId),
          eq(budgetItems.organizationId, organizationId),
          eq(budgetItems.operatingUnitId, operatingUnitId),
          eq(budgetItems.isDeleted, false)
        ));

      return {
        items,
        total: countResult.count,
        limit,
        offset,
      };
    }),

  /**
   * Get a single budget item by ID
   * Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
   */
  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { organizationId, operatingUnitId } = ctx.scope;

      const [item] = await db
        .select()
        .from(budgetItems)
        .where(and(
          eq(budgetItems.id, input.id),
          eq(budgetItems.organizationId, organizationId),
          eq(budgetItems.operatingUnitId, operatingUnitId),
          eq(budgetItems.isDeleted, false)
        ))
        .limit(1);

      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Budget item not found" });
      }

      return item;
    }),

  /**
   * Get all budget items for a project (non-paginated)
   * Used by Financial Overview tab
   * Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
   */
  getByProject: scopedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

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
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      const items = await db
        .select()
        .from(budgetItems)
        .leftJoin(activities, eq(budgetItems.activityId, activities.id))
        .where(and(
          eq(budgetItems.projectId, input.projectId),
          eq(budgetItems.organizationId, organizationId),
          eq(budgetItems.operatingUnitId, operatingUnitId),
          eq(budgetItems.isDeleted, false)
        ))
        .orderBy(desc(budgetItems.createdAt));

      // Transform the result to include activity as a nested object
      const transformedItems = items.map(row => ({
        ...row.budget_items,
        activity: row.activities,
      }));

      return transformedItems;
    }),

  /**
   * Create a new budget item
   * Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
   */
  create: scopedProcedure
    .input(
      z.object({
        projectId: z.number(),
        category: z.string().optional(),
        budgetCode: z.string(),
        subBudgetLine: z.string().optional(),
        activityId: z.number().nullable().optional(),
        activityName: z.string().optional(),
        budgetItem: z.string(),
        qty: z.number(),
        unitType: z.string(),
        unitCost: z.number(),
        recurrence: z.number(),
        currency: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const userId = ctx.user.id;
      const { organizationId, operatingUnitId } = ctx.scope;

      try {
        // Fetch project to verify it belongs to current scope and get dates
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
          throw new TRPCError({ 
            code: "NOT_FOUND", 
            message: "Project not found. Please refresh and try again."
          });
        }

        // Validate currency
        if (!SUPPORTED_CURRENCIES.includes(input.currency)) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: `Currency "${input.currency}" is not supported. Allowed values: ${SUPPORTED_CURRENCIES.join(', ')}.`
          });
        }

        // Calculate total budget line
        const totalBudgetLine = input.qty * input.unitCost * input.recurrence;

        // Convert dates to proper format for Drizzle date fields
        const startDate = typeof project.startDate === 'string' ? project.startDate : project.startDate?.toISOString?.()?.split('T')[0] || project.startDate;
        const endDate = typeof project.endDate === 'string' ? project.endDate : project.endDate?.toISOString?.()?.split('T')[0] || project.endDate;

        // Insert with scope from context
        const result = await db.insert(budgetItems).values({
          projectId: input.projectId,
          organizationId,
          operatingUnitId,
          budgetCode: input.budgetCode,
          subBL: input.subBudgetLine || null,
          subBudgetLine: input.subBudgetLine || null,
          activityId: input.activityId || null,
          activityName: input.activityName || null,
          budgetItem: input.budgetItem,
          category: input.category || null,
          quantity: input.qty.toString(),
          unitType: input.unitType,
          unitCost: input.unitCost.toString(),
          recurrence: input.recurrence,
          totalBudgetLine: totalBudgetLine.toString(),
          currency: input.currency,
          startDate: startDate,
          endDate: endDate,
          notes: input.notes || null,
          createdBy: userId,
          updatedBy: userId,
        });

        const insertId = (result[0] as any).insertId;
        const [newItem] = await db
          .select()
          .from(budgetItems)
          .where(eq(budgetItems.id, insertId))
          .limit(1);

        // Sync project spent amount
        await syncProjectSpent(input.projectId);
        
        // Sync activity spent if this budget item is linked to an activity
        if (input.activityId) {
          await syncActivitySpent(input.activityId);
        }

        return newItem;
      } catch (error: any) {
        // Wrap database errors in user-friendly messages
        if (error instanceof TRPCError) {
          throw error; // Re-throw TRPCErrors as-is
        }
        
        // Handle database constraint errors
        if (error.message?.includes('foreign key constraint')) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "Invalid project or organization reference. Please refresh and try again."
          });
        }
        
        if (error.message?.includes('Duplicate entry')) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "A budget item with this code already exists."
          });
        }
        
        if (error.message?.includes('cannot be null')) {
          const fieldMatch = error.message.match(/Column '(\w+)' cannot be null/);
          const fieldName = fieldMatch ? fieldMatch[1] : 'required field';
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: `Missing required field: ${fieldName}. Please fill in all required fields.`
          });
        }
        
        // Generic error for unexpected issues
        console.error('[Budget Item Create Error]', error);
        throw new TRPCError({ 
          code: "INTERNAL_SERVER_ERROR", 
          message: "Failed to create budget item. Please try again or contact support if the problem persists."
        });
      }
    }),

  /**
   * Update an existing budget item
   * Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
   */
  update: scopedProcedure
    .input(
      z.object({
        id: z.number(),
        category: z.string().optional(),
        budgetCode: z.string().optional(),
        subBudgetLine: z.string().optional(),
        activityId: z.number().nullable().optional(),
        activityName: z.string().optional(),
        budgetItem: z.string().optional(),
        qty: z.number().optional(),
        unitType: z.string().optional(),
        unitCost: z.number().optional(),
        recurrence: z.number().optional(),
        currency: z.string().optional(),
        notes: z.string().optional(),
        spent: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const userId = ctx.user.id;
      const { organizationId, operatingUnitId } = ctx.scope;
      const { id, ...updates } = input;

      // Validate currency if provided
      if (updates.currency && !SUPPORTED_CURRENCIES.includes(updates.currency)) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: `Currency "${updates.currency}" is not supported. Allowed values: ${SUPPORTED_CURRENCIES.join(', ')}.`
        });
      }

      // Get current item and verify it belongs to current scope
      const [currentItem] = await db
        .select()
        .from(budgetItems)
        .where(and(
          eq(budgetItems.id, id),
          eq(budgetItems.organizationId, organizationId),
          eq(budgetItems.operatingUnitId, operatingUnitId)
        ))
        .limit(1);

      if (!currentItem) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Budget item not found" });
      }

      // Calculate new total if numeric fields changed
      const qty = updates.qty ?? parseFloat(currentItem.qty);
      const unitCost = updates.unitCost ?? parseFloat(currentItem.unitCost);
      const recurrence = updates.recurrence ?? currentItem.recurrence;
      const totalBudgetLine = qty * unitCost * recurrence;

      // Map frontend field names to database columns
      const dbUpdates: any = {};
      if (updates.subBudgetLine !== undefined) {
        dbUpdates.subBL = updates.subBudgetLine;
        dbUpdates.subBudgetLine = updates.subBudgetLine;
      }
      if (updates.activityId !== undefined) dbUpdates.activityId = updates.activityId;
      if (updates.activityName !== undefined) dbUpdates.activityName = updates.activityName;
      if (updates.budgetItem !== undefined) dbUpdates.budgetItem = updates.budgetItem;
      if (updates.budgetCode !== undefined) dbUpdates.budgetCode = updates.budgetCode;
      if (updates.currency !== undefined) dbUpdates.currency = updates.currency;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.unitType !== undefined) dbUpdates.unitType = updates.unitType;
      if (updates.qty !== undefined) dbUpdates.quantity = updates.qty.toString();
      if (updates.unitCost !== undefined) dbUpdates.unitCost = updates.unitCost.toString();
      if (updates.recurrence !== undefined) dbUpdates.recurrence = updates.recurrence;
      if (updates.spent !== undefined) dbUpdates.actualSpent = updates.spent.toString();
      
      await db
        .update(budgetItems)
        .set({
          ...dbUpdates,
          totalBudgetLine: totalBudgetLine.toString(),
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(and(
          eq(budgetItems.id, id),
          eq(budgetItems.organizationId, organizationId),
          eq(budgetItems.operatingUnitId, operatingUnitId)
        ));

      const [updatedItem] = await db
        .select()
        .from(budgetItems)
        .where(eq(budgetItems.id, id))
        .limit(1);

      // Sync project spent amount
      await syncProjectSpent(currentItem.projectId);
      
      // Sync activity spent if this budget item is linked to an activity
      if (currentItem.activityId) {
        await syncActivitySpent(currentItem.activityId);
      }

      // Check variance if actualSpent was updated
      if (updates.spent !== undefined) {
        try {
          // Import varianceAlertsRouter to trigger variance check
          // Note: This is a fire-and-forget operation - we don't want to block the update
          const { varianceAlertsRouter } = await import('./varianceAlertsRouter');
          const caller = varianceAlertsRouter.createCaller({ user: { id: userId } } as any);
          await caller.checkVariance({ budgetItemId: id }).catch((error) => {
            console.warn('[Variance Check] Failed to check variance:', error.message);
          });
        } catch (error) {
          console.warn('[Variance Check] Error importing variance alerts router:', error);
        }
      }

      return updatedItem;
    }),

  /**
   * Delete a budget item (hard delete)
   * Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
   */
  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { organizationId, operatingUnitId } = ctx.scope;

      // Get project ID and activity ID before deleting and verify it belongs to current scope
      const [item] = await db
        .select({ projectId: budgetItems.projectId, activityId: budgetItems.activityId })
        .from(budgetItems)
        .where(and(
          eq(budgetItems.id, input.id),
          eq(budgetItems.organizationId, organizationId),
          eq(budgetItems.operatingUnitId, operatingUnitId)
        ))
        .limit(1);

      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Budget item not found" });
      }

      // Soft delete
      await db
        .update(budgetItems)
        .set({ isDeleted: true, deletedAt: new Date(), deletedBy: ctx.user?.id ?? null })
        .where(and(
          eq(budgetItems.id, input.id),
          eq(budgetItems.organizationId, organizationId),
          eq(budgetItems.operatingUnitId, operatingUnitId)
        ));

      // Sync project spent amount
      await syncProjectSpent(item.projectId);
      
      // Sync activity spent if this budget item was linked to an activity
      if (item.activityId) {
        await syncActivitySpent(item.activityId);
      }

      return { success: true };
    }),

  /**
   * Bulk delete budget items
   * Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
   */
  bulkDelete: scopedProcedure
    .input(
      z.object({
        ids: z.array(z.number()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { organizationId, operatingUnitId } = ctx.scope;
      const { ids } = input;

      let deleted = 0;
      const errors: string[] = [];
      const projectIds = new Set<number>();

      for (const id of ids) {
        try {
          // Get project ID before deleting and verify it belongs to current scope
          const [item] = await db
            .select({ projectId: budgetItems.projectId })
            .from(budgetItems)
            .where(and(
              eq(budgetItems.id, id),
              eq(budgetItems.organizationId, organizationId),
              eq(budgetItems.operatingUnitId, operatingUnitId)
            ))
            .limit(1);

          if (item) {
            projectIds.add(item.projectId);
            await db
              .update(budgetItems)
              .set({ isDeleted: true, deletedAt: new Date(), deletedBy: ctx.user?.id ?? null })
              .where(and(
                eq(budgetItems.id, id),
                eq(budgetItems.organizationId, organizationId),
                eq(budgetItems.operatingUnitId, operatingUnitId)
              ));
            deleted++;
          }
        } catch (error: any) {
          errors.push(`Failed to delete budget item ${id}: ${error.message}`);
        }
      }

      // Sync all affected projects
      for (const projectId of projectIds) {
        await syncProjectSpent(projectId);
      }

      return { deleted, errors: errors.length, errorMessages: errors };
    }),

  /**
   * Bulk import budget items from Excel
   * Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
   */
  bulkImport: scopedProcedure
    .input(
      z.object({
        projectId: z.number(),
        items: z.array(
          z.object({
            budgetCode: z.string(),
            subBudgetLine: z.string(),
            activityName: z.string(),
            budgetItem: z.string(),
            qty: z.number(),
            unitType: z.string(),
            unitCost: z.number(),
            recurrence: z.number(),
            currency: z.string(),
            notes: z.string().optional(),
          })
        ),
        allowDuplicates: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const userId = ctx.user.id;
      const { organizationId, operatingUnitId } = ctx.scope;
      const { projectId, items, allowDuplicates } = input;

      // Verify project exists and belongs to current scope
      const project = await db
        .select()
        .from(projects)
        .where(and(
          eq(projects.id, projectId),
          eq(projects.organizationId, organizationId),
          eq(projects.operatingUnitId, operatingUnitId)
        ))
        .limit(1);

      if (!project || project.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      const organizationCurrency = project[0].currency || 'USD';

      const imported: any[] = [];
      const skipped: any[] = [];
      const allErrors: ValidationError[] = [];

      // Validate and import each row using shared framework
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const rowNumber = i + 2; // Excel row number (row 1 is headers)

        // LAYER 1-4: Synchronous validation using shared framework with organization currency context
        const validationResult = validateRow(
          item,
          rowNumber,
          FINANCIAL_OVERVIEW_CONFIG,
          undefined, // referenceData
          { organizationCurrency } // context
        );

        if (!validationResult.isValid) {
          // Row has validation errors - skip and record
          allErrors.push(...validationResult.errors);
          skipped.push({ budgetCode: item.budgetCode, reason: "Validation failed" });
          continue;
        }

        // LAYER 5: Business rules (async, backend only)
        try {
          // Check for duplicates if not allowed
          if (!allowDuplicates) {
            const existing = await db
              .select()
              .from(budgetItems)
              .where(
                and(
                  eq(budgetItems.projectId, projectId),
                  eq(budgetItems.budgetCode, item.budgetCode),
                  eq(budgetItems.organizationId, organizationId),
                  eq(budgetItems.operatingUnitId, operatingUnitId)
                )
              )
              .limit(1);

            if (existing && existing.length > 0) {
              allErrors.push({
                row: rowNumber,
                field: 'Budget Code',
                value: item.budgetCode,
                errorType: 'business',
                message: `Budget Code "${item.budgetCode}" already exists in this project.`,
                suggestedFix: `Use a unique Budget Code or enable "Allow Duplicates" option.`,
                originalData: item,
              });
              skipped.push({ budgetCode: item.budgetCode, reason: "Duplicate budget code" });
              continue;
            }
          }

          // Calculate total budget line
          const totalBudgetLine = item.qty * item.unitCost * item.recurrence;

          // Insert budget item with scope from context
          const result = await db
            .insert(budgetItems)
            .values({
              projectId,
              organizationId,
              operatingUnitId,
              budgetCode: item.budgetCode,
              subBL: item.subBudgetLine || null,
              subBudgetLine: item.subBudgetLine || null,
              activityName: item.activityName,
              budgetItem: item.budgetItem,
              quantity: item.qty.toString(),
              unitType: item.unitType,
              unitCost: item.unitCost.toString(),
              recurrence: item.recurrence,
              totalBudgetLine: totalBudgetLine.toString(),
              currency: item.currency,
              startDate: project[0].startDate,
              endDate: project[0].endDate,
              notes: item.notes || null,
              createdBy: userId,
              updatedBy: userId,
            });

          // Get the inserted item
          const insertId = (result[0] as any).insertId;
          const [newItem] = await db
            .select()
            .from(budgetItems)
            .where(eq(budgetItems.id, insertId))
            .limit(1);

          imported.push(newItem);
        } catch (error: any) {
          // Database error - treat as system error
          allErrors.push({
            row: rowNumber,
            field: 'System',
            value: null,
            errorType: 'business',
            message: `Database error: ${error.message}`,
            suggestedFix: `Contact system administrator if the problem persists.`,
            originalData: item,
          });
          skipped.push({ budgetCode: item.budgetCode, reason: "Database error" });
        }
      }

      // Log import history with scope from context
      const projectData = project[0];
      await db.insert(importHistory).values({
        projectId,
        organizationId,
        operatingUnitId,
        userId,
        fileName: 'budget_items_import.xlsx',
        importType: 'budget_items',
        recordsImported: imported.length,
        recordsSkipped: skipped.length,
        recordsErrors: allErrors.length,
        status: allErrors.length > 0 ? 'partial' : 'completed',
        errorDetails: allErrors.length > 0 ? JSON.stringify(allErrors.map(toLegacyError)) : null,
        allowedDuplicates: allowDuplicates,
      });

      // Sync project spent amount after import
      if (imported.length > 0) {
        await syncProjectSpent(projectId);
      }

      return {
        success: true,
        imported: imported.length,
        skipped: skipped.length,
        errors: allErrors.length,
        details: { 
          imported, 
          skipped, 
          errors: allErrors.map(toLegacyError) // Convert to legacy format for backward compatibility
        },
      };
    }),

  /**
   * Get import history for a project
   * Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
   */
  getImportHistory: scopedProcedure
    .input(
      z.object({
        projectId: z.number(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { organizationId, operatingUnitId } = ctx.scope;
      const { projectId, limit, offset } = input;

      // Verify project belongs to current scope
      const [project] = await db
        .select()
        .from(projects)
        .where(and(
          eq(projects.id, projectId),
          eq(projects.organizationId, organizationId),
          eq(projects.operatingUnitId, operatingUnitId)
        ))
        .limit(1);

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      const history = await db
        .select()
        .from(importHistory)
        .where(
          and(
            eq(importHistory.projectId, projectId),
            eq(importHistory.organizationId, organizationId),
            eq(importHistory.operatingUnitId, operatingUnitId),
            eq(importHistory.importType, 'budget_items')
          )
        )
        .limit(limit)
        .offset(offset)
        .orderBy(desc(importHistory.createdAt));

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(importHistory)
        .where(
          and(
            eq(importHistory.projectId, projectId),
            eq(importHistory.organizationId, organizationId),
            eq(importHistory.operatingUnitId, operatingUnitId),
            eq(importHistory.importType, 'budget_items')
          )
        );

      return {
        history,
        total: countResult.count,
        limit,
        offset,
      };
    }),
});
