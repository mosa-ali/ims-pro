/**
 * Budget Lines Router (Detail-Level Operations)
 * Donor-compliant budget line management with auto-calculation and validation
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { budgets, budgetLines, budgetMonthlyAllocations, financeBudgetCategories, chartOfAccounts, activities } from "../drizzle/schema";
import { eq, and, isNull, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Helper function to update budget totals after line changes
 */
async function updateBudgetTotals(budgetId: number) {
  const db = await getDb();
  if (!db) return;

  // Calculate totals from all non-deleted lines
  const [totals] = await db
    .select({
      totalApproved: sql<string>`COALESCE(SUM(totalAmount), 0)`,
      totalActual: sql<string>`COALESCE(SUM(actualSpent), 0)`,
    })
    .from(budgetLines)
    .where(and(eq(budgetLines.budgetId, budgetId), isNull(budgetLines.deletedAt)));

  // Update budget header
  await db
    .update(budgets)
    .set({
      totalApprovedAmount: totals?.totalApproved || "0.00",
      totalActualAmount: totals?.totalActual || "0.00",
    })
    .where(eq(budgets.id, budgetId));
}

export const budgetLinesRouter = router({
  /**
   * List all budget lines for a budget
   */
  list: scopedProcedure
    .input(
      z.object({
        budgetId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { budgetId } = input;

      const results = await db
        .select()
        .from(budgetLines)
        .where(
          and(
            eq(budgetLines.budgetId, budgetId),
            eq(budgetLines.organizationId, organizationId),
            isNull(budgetLines.deletedAt)
          )
        )
        .orderBy(budgetLines.lineNumber);

      return results;
    }),

  /**
   * Get budget line by ID
   */
  getById: scopedProcedure
    .input(
      z.object({
        lineId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { lineId } = input;

      const [line] = await db
        .select()
        .from(budgetLines)
        .where(
          and(
            eq(budgetLines.id, lineId),
            eq(budgetLines.organizationId, organizationId),
            isNull(budgetLines.deletedAt)
          )
        );

      if (!line) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Budget line not found",
        });
      }

      return line;
    }),

  /**
   * Create new budget line with auto-calculation
   * Total Amount = Unit Cost × Quantity × Duration Months
   */
  create: scopedProcedure
    .input(
      z.object({
        budgetId: z.number(),
        projectId: z.number(),
        lineCode: z.string(),
        lineNumber: z.number().optional(),
        description: z.string(),
        descriptionAr: z.string().optional(),
        categoryId: z.number().optional(),
        accountId: z.number().optional(),
        activityId: z.number().optional(),
        unitType: z.enum(["staff", "item", "service", "lump_sum"]),
        unitCost: z.number(),
        quantity: z.number(),
        durationMonths: z.number().default(1),
        donorEligibilityPercentage: z.number().default(100),
        ineligibilityReason: z.string().optional(),
        ineligibilityReasonAr: z.string().optional(),
        donorMappingId: z.number().optional(),
        locationId: z.number().optional(),
        locationName: z.string().optional(),
        implementationPeriodStart: z.string().optional(),
        implementationPeriodEnd: z.string().optional(),
        justification: z.string().optional(),
        justificationAr: z.string().optional(),
        notes: z.string().optional(),
        notesAr: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const {
        budgetId,
        projectId,
        lineCode,
        lineNumber,
        description,
        descriptionAr,
        categoryId,
        accountId,
        activityId,
        unitType,
        unitCost,
        quantity,
        durationMonths,
        donorEligibilityPercentage,
        ineligibilityReason,
        ineligibilityReasonAr,
        donorMappingId,
        locationId,
        locationName,
        implementationPeriodStart,
        implementationPeriodEnd,
        justification,
        justificationAr,
        notes,
        notesAr,
      } = input;

      // Check if budget exists and is editable
      const [budget] = await db
        .select()
        .from(budgets)
        .where(and(eq(budgets.id, budgetId), eq(budgets.organizationId, organizationId), isNull(budgets.deletedAt)));

      if (!budget) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Budget not found",
        });
      }

      // Cannot add lines to approved or closed budgets
      if (budget.status === "approved" || budget.status === "closed") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot add lines to approved or closed budgets",
        });
      }

      // Check for duplicate line code
      const [existingLine] = await db
        .select()
        .from(budgetLines)
        .where(
          and(
            eq(budgetLines.budgetId, budgetId),
            eq(budgetLines.lineCode, lineCode),
            isNull(budgetLines.deletedAt)
          )
        );

      if (existingLine) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Line code "${lineCode}" already exists in this budget`,
        });
      }

      // Auto-calculate total amount: Unit Cost × Quantity × Duration
      const totalAmount = unitCost * quantity * durationMonths;

      // Calculate donor eligible amount
      const donorEligibleAmount = (totalAmount * donorEligibilityPercentage) / 100;

      // Calculate available balance (initially equals total amount)
      const availableBalance = totalAmount;

      // Get next line number if not provided
      let finalLineNumber = lineNumber;
      if (!finalLineNumber) {
        const [maxLine] = await db
          .select({ maxNum: sql<number>`MAX(lineNumber)` })
          .from(budgetLines)
          .where(eq(budgetLines.budgetId, budgetId));
        finalLineNumber = (maxLine?.maxNum || 0) + 1;
      }

      const [newLine] = await db.insert(budgetLines).values({
        budgetId,
        projectId,
        organizationId,
        operatingUnitId: operatingUnitId || null,
        lineCode,
        lineNumber: finalLineNumber,
        description,
        descriptionAr: descriptionAr || null,
        categoryId: categoryId || null,
        accountId: accountId || null,
        activityId: activityId || null,
        unitType,
        unitCost: unitCost.toFixed(2),
        quantity: quantity.toFixed(2),
        durationMonths,
        totalAmount: totalAmount.toFixed(2),
        donorEligibleAmount: donorEligibleAmount.toFixed(2),
        donorEligibilityPercentage: donorEligibilityPercentage.toFixed(2),
        ineligibilityReason: ineligibilityReason || null,
        ineligibilityReasonAr: ineligibilityReasonAr || null,
        donorMappingId: donorMappingId || null,
        locationId: locationId || null,
        locationName: locationName || null,
        implementationPeriodStart: implementationPeriodStart ? new Date(implementationPeriodStart) : null,
        implementationPeriodEnd: implementationPeriodEnd ? new Date(implementationPeriodEnd) : null,
        actualSpent: "0.00",
        commitments: "0.00",
        availableBalance: availableBalance.toFixed(2),
        justification: justification || null,
        justificationAr: justificationAr || null,
        notes: notes || null,
        notesAr: notesAr || null,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      });

      // Update budget totals
      await updateBudgetTotals(budgetId);

      return newLine;
    }),

  /**
   * Update budget line with auto-calculation
   */
  update: scopedProcedure
    .input(
      z.object({
        lineId: z.number(),
        lineCode: z.string().optional(),
        lineNumber: z.number().optional(),
        description: z.string().optional(),
        descriptionAr: z.string().optional(),
        categoryId: z.number().optional(),
        accountId: z.number().optional(),
        activityId: z.number().optional(),
        unitType: z.enum(["staff", "item", "service", "lump_sum"]).optional(),
        unitCost: z.number().optional(),
        quantity: z.number().optional(),
        durationMonths: z.number().optional(),
        donorEligibilityPercentage: z.number().optional(),
        ineligibilityReason: z.string().optional(),
        ineligibilityReasonAr: z.string().optional(),
        donorMappingId: z.number().optional(),
        locationId: z.number().optional(),
        locationName: z.string().optional(),
        implementationPeriodStart: z.string().optional(),
        implementationPeriodEnd: z.string().optional(),
        actualSpent: z.number().optional(),
        commitments: z.number().optional(),
        justification: z.string().optional(),
        justificationAr: z.string().optional(),
        notes: z.string().optional(),
        notesAr: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { lineId, ...updates } = input;

      // Get existing line
      const [existingLine] = await db
        .select()
        .from(budgetLines)
        .where(
          and(
            eq(budgetLines.id, lineId),
            eq(budgetLines.organizationId, organizationId),
            isNull(budgetLines.deletedAt)
          )
        );

      if (!existingLine) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Budget line not found",
        });
      }

      // Check if budget is editable
      const [budget] = await db
        .select()
        .from(budgets)
        .where(eq(budgets.id, existingLine.budgetId));

      if (budget && (budget.status === "approved" || budget.status === "closed")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot update lines in approved or closed budgets",
        });
      }

      // Check for duplicate line code if updating
      if (updates.lineCode && updates.lineCode !== existingLine.lineCode) {
        const [duplicateLine] = await db
          .select()
          .from(budgetLines)
          .where(
            and(
              eq(budgetLines.budgetId, existingLine.budgetId),
              eq(budgetLines.lineCode, updates.lineCode),
              isNull(budgetLines.deletedAt)
            )
          );

        if (duplicateLine) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Line code "${updates.lineCode}" already exists in this budget`,
          });
        }
      }

      // Prepare update values
      const updateValues: any = {
        updatedBy: ctx.user.id,
      };

      // Get current values for calculation
      const currentUnitCost = updates.unitCost !== undefined ? updates.unitCost : parseFloat(existingLine.unitCost);
      const currentQuantity = updates.quantity !== undefined ? updates.quantity : parseFloat(existingLine.quantity);
      const currentDuration = updates.durationMonths !== undefined ? updates.durationMonths : existingLine.durationMonths;
      const currentEligibility = updates.donorEligibilityPercentage !== undefined 
        ? updates.donorEligibilityPercentage 
        : parseFloat(existingLine.donorEligibilityPercentage || "100");

      // Recalculate if any cost-related fields changed
      if (updates.unitCost !== undefined || updates.quantity !== undefined || updates.durationMonths !== undefined) {
        const totalAmount = currentUnitCost * currentQuantity * currentDuration;
        updateValues.totalAmount = totalAmount.toFixed(2);
        
        // Recalculate donor eligible amount
        const donorEligibleAmount = (totalAmount * currentEligibility) / 100;
        updateValues.donorEligibleAmount = donorEligibleAmount.toFixed(2);
      }

      // Recalculate donor eligible amount if eligibility percentage changed
      if (updates.donorEligibilityPercentage !== undefined) {
        const totalAmount = currentUnitCost * currentQuantity * currentDuration;
        const donorEligibleAmount = (totalAmount * updates.donorEligibilityPercentage) / 100;
        updateValues.donorEligibleAmount = donorEligibleAmount.toFixed(2);
        updateValues.donorEligibilityPercentage = updates.donorEligibilityPercentage.toFixed(2);
      }

      // Calculate available balance if actual spent or commitments changed
      if (updates.actualSpent !== undefined || updates.commitments !== undefined) {
        const totalAmount = currentUnitCost * currentQuantity * currentDuration;
        const actualSpent = updates.actualSpent !== undefined ? updates.actualSpent : parseFloat(existingLine.actualSpent);
        const commitments = updates.commitments !== undefined ? updates.commitments : parseFloat(existingLine.commitments);
        const availableBalance = totalAmount - actualSpent - commitments;
        
        updateValues.actualSpent = actualSpent.toFixed(2);
        updateValues.commitments = commitments.toFixed(2);
        updateValues.availableBalance = availableBalance.toFixed(2);
      }

      // Apply other updates
      if (updates.lineCode !== undefined) updateValues.lineCode = updates.lineCode;
      if (updates.lineNumber !== undefined) updateValues.lineNumber = updates.lineNumber;
      if (updates.description !== undefined) updateValues.description = updates.description;
      if (updates.descriptionAr !== undefined) updateValues.descriptionAr = updates.descriptionAr;
      if (updates.categoryId !== undefined) updateValues.categoryId = updates.categoryId;
      if (updates.accountId !== undefined) updateValues.accountId = updates.accountId;
      if (updates.activityId !== undefined) updateValues.activityId = updates.activityId;
      if (updates.unitType !== undefined) updateValues.unitType = updates.unitType;
      if (updates.unitCost !== undefined) updateValues.unitCost = updates.unitCost.toFixed(2);
      if (updates.quantity !== undefined) updateValues.quantity = updates.quantity.toFixed(2);
      if (updates.durationMonths !== undefined) updateValues.durationMonths = updates.durationMonths;
      if (updates.ineligibilityReason !== undefined) updateValues.ineligibilityReason = updates.ineligibilityReason;
      if (updates.ineligibilityReasonAr !== undefined) updateValues.ineligibilityReasonAr = updates.ineligibilityReasonAr;
      if (updates.donorMappingId !== undefined) updateValues.donorMappingId = updates.donorMappingId;
      if (updates.locationId !== undefined) updateValues.locationId = updates.locationId;
      if (updates.locationName !== undefined) updateValues.locationName = updates.locationName;
      if (updates.implementationPeriodStart !== undefined) {
        updateValues.implementationPeriodStart = updates.implementationPeriodStart ? new Date(updates.implementationPeriodStart) : null;
      }
      if (updates.implementationPeriodEnd !== undefined) {
        updateValues.implementationPeriodEnd = updates.implementationPeriodEnd ? new Date(updates.implementationPeriodEnd) : null;
      }
      if (updates.justification !== undefined) updateValues.justification = updates.justification;
      if (updates.justificationAr !== undefined) updateValues.justificationAr = updates.justificationAr;
      if (updates.notes !== undefined) updateValues.notes = updates.notes;
      if (updates.notesAr !== undefined) updateValues.notesAr = updates.notesAr;

      await db.update(budgetLines).set(updateValues).where(eq(budgetLines.id, lineId));

      // Update budget totals
      await updateBudgetTotals(existingLine.budgetId);

      return { success: true };
    }),

  /**
   * Soft delete budget line
   */
  delete: scopedProcedure
    .input(
      z.object({
        lineId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { lineId } = input;

      // Get existing line
      const [existingLine] = await db
        .select()
        .from(budgetLines)
        .where(
          and(
            eq(budgetLines.id, lineId),
            eq(budgetLines.organizationId, organizationId),
            isNull(budgetLines.deletedAt)
          )
        );

      if (!existingLine) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Budget line not found",
        });
      }

      // Check if budget is editable
      const [budget] = await db
        .select()
        .from(budgets)
        .where(eq(budgets.id, existingLine.budgetId));

      if (budget && (budget.status === "approved" || budget.status === "closed")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot delete lines from approved or closed budgets",
        });
      }

      // Soft delete
      await db
        .update(budgetLines)
        .set({
          deletedAt: new Date(),
          deletedBy: ctx.user.id,
        })
        .where(eq(budgetLines.id, lineId));

      // Update budget totals
      await updateBudgetTotals(existingLine.budgetId);

      return { success: true };
    }),

  /**
   * Bulk create budget lines (for import)
   */
  bulkCreate: scopedProcedure
    .input(
      z.object({
        budgetId: z.number(),
        projectId: z.number(),
        lines: z.array(
          z.object({
            lineCode: z.string(),
            description: z.string(),
            descriptionAr: z.string().optional(),
            categoryId: z.number().optional(),
            accountId: z.number().optional(),
            activityId: z.number().optional(),
            unitType: z.enum(["staff", "item", "service", "lump_sum"]),
            unitCost: z.number(),
            quantity: z.number(),
            durationMonths: z.number().default(1),
            donorEligibilityPercentage: z.number().default(100),
            locationName: z.string().optional(),
            justification: z.string().optional(),
            notes: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { budgetId, projectId, lines } = input;

      // Check if budget exists and is editable
      const [budget] = await db
        .select()
        .from(budgets)
        .where(and(eq(budgets.id, budgetId), eq(budgets.organizationId, organizationId), isNull(budgets.deletedAt)));

      if (!budget) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Budget not found",
        });
      }

      if (budget.status === "approved" || budget.status === "closed") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot add lines to approved or closed budgets",
        });
      }

      // Get existing line codes
      const existingLines = await db
        .select({ lineCode: budgetLines.lineCode })
        .from(budgetLines)
        .where(and(eq(budgetLines.budgetId, budgetId), isNull(budgetLines.deletedAt)));

      const existingCodes = new Set(existingLines.map((l) => l.lineCode));

      // Check for duplicates
      const duplicates = lines.filter((l) => existingCodes.has(l.lineCode));
      if (duplicates.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Duplicate line codes: ${duplicates.map((d) => d.lineCode).join(", ")}`,
        });
      }

      // Get starting line number
      const [maxLine] = await db
        .select({ maxNum: sql<number>`MAX(lineNumber)` })
        .from(budgetLines)
        .where(eq(budgetLines.budgetId, budgetId));
      let lineNumber = (maxLine?.maxNum || 0) + 1;

      // Insert all lines
      const linesToInsert = lines.map((line) => {
        const totalAmount = line.unitCost * line.quantity * line.durationMonths;
        const donorEligibleAmount = (totalAmount * line.donorEligibilityPercentage) / 100;

        return {
          budgetId,
          projectId,
          organizationId,
          operatingUnitId: operatingUnitId || null,
          lineCode: line.lineCode,
          lineNumber: lineNumber++,
          description: line.description,
          descriptionAr: line.descriptionAr || null,
          categoryId: line.categoryId || null,
          accountId: line.accountId || null,
          activityId: line.activityId || null,
          unitType: line.unitType,
          unitCost: line.unitCost.toFixed(2),
          quantity: line.quantity.toFixed(2),
          durationMonths: line.durationMonths,
          totalAmount: totalAmount.toFixed(2),
          donorEligibleAmount: donorEligibleAmount.toFixed(2),
          donorEligibilityPercentage: line.donorEligibilityPercentage.toFixed(2),
          locationName: line.locationName || null,
          actualSpent: "0.00",
          commitments: "0.00",
          availableBalance: totalAmount.toFixed(2),
          justification: line.justification || null,
          notes: line.notes || null,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        };
      });

      await db.insert(budgetLines).values(linesToInsert);

      // Update budget totals
      await updateBudgetTotals(budgetId);

      return { success: true, count: lines.length };
    }),
});
