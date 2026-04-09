/**
 * Budget Monthly Allocations Router
 * Monthly distribution tracking for cash flow planning
 */

import { z } from "zod";
import { protectedProcedure, scopedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { budgetMonthlyAllocations, budgetLines, budgets } from "../drizzle/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const budgetMonthlyAllocationsRouter = router({
  /**
   * List all monthly allocations for a budget line
   */
  listByLine: scopedProcedure
    .input(
      z.object({
        budgetLineId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { budgetLineId } = input;

      const results = await db
        .select()
        .from(budgetMonthlyAllocations)
        .where(and(eq(budgetMonthlyAllocations.budgetLineId, budgetLineId), eq(budgetMonthlyAllocations.isDeleted, false)))
        .orderBy(budgetMonthlyAllocations.allocationMonth);

      return results;
    }),

  /**
   * List all monthly allocations for a budget (all lines)
   */
  listByBudget: scopedProcedure
    .input(
      z.object({
        budgetId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { budgetId } = input;

      const results = await db
        .select()
        .from(budgetMonthlyAllocations)
        .where(and(eq(budgetMonthlyAllocations.budgetId, budgetId), eq(budgetMonthlyAllocations.isDeleted, false)))
        .orderBy(budgetMonthlyAllocations.budgetLineId, budgetMonthlyAllocations.allocationMonth);

      return results;
    }),

  /**
   * Get quarterly summary for a budget
   */
  getQuarterlySummary: scopedProcedure
    .input(
      z.object({
        budgetId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { budgetId } = input;

      const results = await db
        .select({
          quarterNumber: budgetMonthlyAllocations.quarterNumber,
          fiscalYear: budgetMonthlyAllocations.fiscalYear,
          totalPlanned: sql<string>`SUM(plannedAmount)`,
          totalForecast: sql<string>`SUM(forecastAmount)`,
          totalActual: sql<string>`SUM(actualAmount)`,
          totalVariance: sql<string>`SUM(variance)`,
        })
        .from(budgetMonthlyAllocations)
        .where(and(eq(budgetMonthlyAllocations.budgetId, budgetId), eq(budgetMonthlyAllocations.isDeleted, false)))
        .groupBy(budgetMonthlyAllocations.quarterNumber, budgetMonthlyAllocations.fiscalYear)
        .orderBy(budgetMonthlyAllocations.fiscalYear, budgetMonthlyAllocations.quarterNumber);

      return results;
    }),

  /**
   * Create or update monthly allocation
   */
  upsert: scopedProcedure
    .input(
      z.object({
        budgetLineId: z.number(),
        budgetId: z.number(),
        allocationMonth: z.string(),
        monthNumber: z.number().min(1).max(12),
        quarterNumber: z.number().min(1).max(4),
        fiscalYear: z.string(),
        plannedAmount: z.number().default(0),
        forecastAmount: z.number().default(0),
        actualAmount: z.number().default(0),
        notes: z.string().optional(),
        notesAr: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const {
        budgetLineId,
        budgetId,
        allocationMonth,
        monthNumber,
        quarterNumber,
        fiscalYear,
        plannedAmount,
        forecastAmount,
        actualAmount,
        notes,
        notesAr,
      } = input;

      // Calculate variance
      const variance = forecastAmount - actualAmount;

      // Check if allocation already exists
      const [existing] = await db
        .select()
        .from(budgetMonthlyAllocations)
        .where(
          and(
            eq(budgetMonthlyAllocations.budgetLineId, budgetLineId),
            eq(budgetMonthlyAllocations.allocationMonth, new Date(allocationMonth))
          )
        );

      if (existing) {
        // Update existing
        await db
          .update(budgetMonthlyAllocations)
          .set({
            plannedAmount: plannedAmount.toFixed(2),
            forecastAmount: forecastAmount.toFixed(2),
            actualAmount: actualAmount.toFixed(2),
            variance: variance.toFixed(2),
            notes: notes || null,
            notesAr: notesAr || null,
            updatedBy: ctx.user.id,
          })
          .where(eq(budgetMonthlyAllocations.id, existing.id));

        return { id: existing.id, action: "updated" };
      } else {
        // Create new
        const [newAllocation] = await db.insert(budgetMonthlyAllocations).values({
          budgetLineId,
          budgetId,
          allocationMonth: new Date(allocationMonth),
          monthNumber,
          quarterNumber,
          fiscalYear,
          plannedAmount: plannedAmount.toFixed(2),
          forecastAmount: forecastAmount.toFixed(2),
          actualAmount: actualAmount.toFixed(2),
          variance: variance.toFixed(2),
          notes: notes || null,
          notesAr: notesAr || null,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        });

        return { id: (newAllocation as any).insertId, action: "created" };
      }
    }),

  /**
   * Bulk upsert monthly allocations for a budget line
   */
  bulkUpsert: scopedProcedure
    .input(
      z.object({
        budgetLineId: z.number(),
        budgetId: z.number(),
        fiscalYear: z.string(),
        allocations: z.array(
          z.object({
            monthNumber: z.number().min(1).max(12),
            plannedAmount: z.number().default(0),
            forecastAmount: z.number().default(0),
            actualAmount: z.number().default(0),
            notes: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { budgetLineId, budgetId, fiscalYear, allocations } = input;

      // Process each month
      for (const alloc of allocations) {
        // Calculate quarter number
        const quarterNumber = Math.ceil(alloc.monthNumber / 3);

        // Calculate allocation month (first day of month)
        const year = parseInt(fiscalYear.replace("FY", ""));
        const allocationMonth = new Date(year, alloc.monthNumber - 1, 1);

        // Calculate variance
        const variance = alloc.forecastAmount - alloc.actualAmount;

        // Check if exists
        const [existing] = await db
          .select()
          .from(budgetMonthlyAllocations)
          .where(
            and(
              eq(budgetMonthlyAllocations.budgetLineId, budgetLineId),
              eq(budgetMonthlyAllocations.monthNumber, alloc.monthNumber),
              eq(budgetMonthlyAllocations.fiscalYear, fiscalYear)
            )
          );

        if (existing) {
          await db
            .update(budgetMonthlyAllocations)
            .set({
              plannedAmount: alloc.plannedAmount.toFixed(2),
              forecastAmount: alloc.forecastAmount.toFixed(2),
              actualAmount: alloc.actualAmount.toFixed(2),
              variance: variance.toFixed(2),
              notes: alloc.notes || null,
              updatedBy: ctx.user.id,
            })
            .where(eq(budgetMonthlyAllocations.id, existing.id));
        } else {
          await db.insert(budgetMonthlyAllocations).values({
            budgetLineId,
            budgetId,
            allocationMonth,
            monthNumber: alloc.monthNumber,
            quarterNumber,
            fiscalYear,
            plannedAmount: alloc.plannedAmount.toFixed(2),
            forecastAmount: alloc.forecastAmount.toFixed(2),
            actualAmount: alloc.actualAmount.toFixed(2),
            variance: variance.toFixed(2),
            notes: alloc.notes || null,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          });
        }
      }

      return { success: true, count: allocations.length };
    }),

  /**
   * Auto-distribute budget line total across months
   */
  autoDistribute: scopedProcedure
    .input(
      z.object({
        budgetLineId: z.number(),
        budgetId: z.number(),
        fiscalYear: z.string(),
        startMonth: z.number().min(1).max(12),
        endMonth: z.number().min(1).max(12),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { budgetLineId, budgetId, fiscalYear, startMonth, endMonth } = input;

      // Get budget line total
      const [line] = await db
        .select()
        .from(budgetLines)
        .where(and(eq(budgetLines.id, budgetLineId), isNull(budgetLines.deletedAt)));

      if (!line) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Budget line not found",
        });
      }

      const totalAmount = parseFloat(line.totalAmount);
      const monthCount = endMonth >= startMonth ? endMonth - startMonth + 1 : 12 - startMonth + 1 + endMonth;
      const monthlyAmount = totalAmount / monthCount;

      // Create allocations for each month
      const year = parseInt(fiscalYear.replace("FY", ""));
      let currentMonth = startMonth;

      for (let i = 0; i < monthCount; i++) {
        const quarterNumber = Math.ceil(currentMonth / 3);
        const allocationMonth = new Date(year, currentMonth - 1, 1);

        // Check if exists
        const [existing] = await db
          .select()
          .from(budgetMonthlyAllocations)
          .where(
            and(
              eq(budgetMonthlyAllocations.budgetLineId, budgetLineId),
              eq(budgetMonthlyAllocations.monthNumber, currentMonth),
              eq(budgetMonthlyAllocations.fiscalYear, fiscalYear)
            )
          );

        if (existing) {
          await db
            .update(budgetMonthlyAllocations)
            .set({
              plannedAmount: monthlyAmount.toFixed(2),
              forecastAmount: monthlyAmount.toFixed(2),
              updatedBy: ctx.user.id,
            })
            .where(eq(budgetMonthlyAllocations.id, existing.id));
        } else {
          await db.insert(budgetMonthlyAllocations).values({
            budgetLineId,
            budgetId,
            allocationMonth,
            monthNumber: currentMonth,
            quarterNumber,
            fiscalYear,
            plannedAmount: monthlyAmount.toFixed(2),
            forecastAmount: monthlyAmount.toFixed(2),
            actualAmount: "0.00",
            variance: monthlyAmount.toFixed(2),
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          });
        }

        currentMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      }

      return { success: true, monthlyAmount, monthCount };
    }),

  /**
   * Delete all allocations for a budget line
   */
  deleteByLine: scopedProcedure
    .input(
      z.object({
        budgetLineId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { budgetLineId } = input;

      await db
        .update(budgetMonthlyAllocations)
        .set({ isDeleted: true, deletedAt: new Date(), deletedBy: ctx.user?.id ?? null })
        .where(eq(budgetMonthlyAllocations.budgetLineId, budgetLineId));

      return { success: true };
    }),
});
