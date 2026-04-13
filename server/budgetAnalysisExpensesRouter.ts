/**
 * Budget Analysis Expenses Router
 * Manages detailed expense tracking and analysis for budget lines
 */

import { z } from "zod";
import { protectedProcedure, router, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { budgetAnalysisExpenses, budgetLines, budgets, users } from "../drizzle/schema";
import { eq, and, isNull, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const budgetAnalysisExpensesRouter = router({
  /**
   * List all expenses for a budget
   */
  listByBudget: scopedProcedure
    .input(
      z.object({
        budgetId: z.number(),
      })
    )
    .query(async ({ ctx, input }: any) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { budgetId } = input;

      const results = await db
        .select()
        .from(budgetAnalysisExpenses)
        .where(
          and(
            eq(budgetAnalysisExpenses.budgetId, budgetId),
            eq(budgetAnalysisExpenses.organizationId, organizationId),
            isNull(budgetAnalysisExpenses.deletedAt)
          )
        )
        .orderBy(desc(budgetAnalysisExpenses.createdAt));

      return results;
    }),

  /**
   * List all expenses for a specific budget line
   */
  listByBudgetLine: scopedProcedure
    .input(
      z.object({
        budgetLineId: z.number(),
      })
    )
    .query(async ({ ctx, input }: any) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { budgetLineId } = input;

      const results = await db
        .select()
        .from(budgetAnalysisExpenses)
        .where(
          and(
            eq(budgetAnalysisExpenses.budgetLineId, budgetLineId),
            eq(budgetAnalysisExpenses.organizationId, organizationId),
            isNull(budgetAnalysisExpenses.deletedAt)
          )
        )
        .orderBy(desc(budgetAnalysisExpenses.expenseDate));

      return results;
    }),

  /**
   * Get a single expense by ID
   */
  getById: scopedProcedure
    .input(
      z.object({
        expenseId: z.number(),
      })
    )
    .query(async ({ ctx, input }: any) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { expenseId } = input;

      const [expense] = await db
        .select()
        .from(budgetAnalysisExpenses)
        .where(
          and(
            eq(budgetAnalysisExpenses.id, expenseId),
            eq(budgetAnalysisExpenses.organizationId, organizationId),
            isNull(budgetAnalysisExpenses.deletedAt)
          )
        );

      if (!expense) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Expense not found",
        });
      }

      return expense;
    }),

  /**
   * Create a new expense record
   */
  create: scopedProcedure
    .input(
      z.object({
        budgetId: z.number(),
        budgetLineId: z.number(),
        budgetItemId: z.number().optional(),
        expenseAmount: z.number().or(z.string()),
        expenseDate: z.string(),
        description: z.string(),
        descriptionAr: z.string().optional(),
        category: z.string().optional(),
        reference: z.string().optional(),
        status: z.enum(["pending", "approved", "rejected"]).default("pending"),
        notes: z.string().optional(),
        notesAr: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }: any) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const {
        budgetId,
        budgetLineId,
        budgetItemId,
        expenseAmount,
        expenseDate,
        description,
        descriptionAr,
        category,
        reference,
        status,
        notes,
        notesAr,
      } = input;

      // Verify budget exists and belongs to organization
      const [budget] = await db
        .select()
        .from(budgets)
        .where(
          and(
            eq(budgets.id, budgetId),
            eq(budgets.organizationId, organizationId)
          )
        );

      if (!budget) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Budget not found",
        });
      }

      // Verify budget line exists
      const [line] = await db
        .select()
        .from(budgetLines)
        .where(eq(budgetLines.id, budgetLineId));

      if (!line) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Budget line not found",
        });
      }

      const result = await db.insert(budgetAnalysisExpenses).values({
        budgetId,
        budgetLineId,
        budgetItemId: budgetItemId || null,
        organizationId,
        operatingUnitId: operatingUnitId || null,
        expenseAmount: typeof expenseAmount === "string" ? parseFloat(expenseAmount) : expenseAmount,
        expenseDate,
        description,
        descriptionAr: descriptionAr || null,
        category: category || null,
        reference: reference || null,
        status,
        notes: notes || null,
        notesAr: notesAr || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);

      return result;
    }),

  /**
   * Update an existing expense
   */
  update: scopedProcedure
    .input(
      z.object({
        expenseId: z.number(),
        expenseAmount: z.number().or(z.string()).optional(),
        expenseDate: z.string().optional(),
        description: z.string().optional(),
        descriptionAr: z.string().optional(),
        category: z.string().optional(),
        reference: z.string().optional(),
        status: z.enum(["pending", "approved", "rejected"]).optional(),
        notes: z.string().optional(),
        notesAr: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }: any) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { expenseId, ...updateData } = input;

      // Verify expense exists and belongs to organization
      const [expense] = await db
        .select()
        .from(budgetAnalysisExpenses)
        .where(
          and(
            eq(budgetAnalysisExpenses.id, expenseId),
            eq(budgetAnalysisExpenses.organizationId, organizationId),
            isNull(budgetAnalysisExpenses.deletedAt)
          )
        );

      if (!expense) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Expense not found",
        });
      }

      // Build update object
      const updateObject: any = {
        updatedAt: new Date().toISOString(),
      };

      if (updateData.expenseAmount !== undefined) {
        updateObject.expenseAmount = typeof updateData.expenseAmount === "string" 
          ? parseFloat(updateData.expenseAmount) 
          : updateData.expenseAmount;
      }
      if (updateData.expenseDate !== undefined) updateObject.expenseDate = updateData.expenseDate;
      if (updateData.description !== undefined) updateObject.description = updateData.description;
      if (updateData.descriptionAr !== undefined) updateObject.descriptionAr = updateData.descriptionAr;
      if (updateData.category !== undefined) updateObject.category = updateData.category;
      if (updateData.reference !== undefined) updateObject.reference = updateData.reference;
      if (updateData.status !== undefined) updateObject.status = updateData.status;
      if (updateData.notes !== undefined) updateObject.notes = updateData.notes;
      if (updateData.notesAr !== undefined) updateObject.notesAr = updateData.notesAr;

      await db
        .update(budgetAnalysisExpenses)
        .set(updateObject)
        .where(eq(budgetAnalysisExpenses.id, expenseId));

      return { success: true };
    }),

  /**
   * Delete (soft delete) an expense
   */
  delete: scopedProcedure
    .input(
      z.object({
        expenseId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }: any) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { expenseId } = input;

      // Verify expense exists and belongs to organization
      const [expense] = await db
        .select()
        .from(budgetAnalysisExpenses)
        .where(
          and(
            eq(budgetAnalysisExpenses.id, expenseId),
            eq(budgetAnalysisExpenses.organizationId, organizationId),
            isNull(budgetAnalysisExpenses.deletedAt)
          )
        );

      if (!expense) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Expense not found",
        });
      }

      // Soft delete
      await db
        .update(budgetAnalysisExpenses)
        .set({
          deletedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(budgetAnalysisExpenses.id, expenseId));

      return { success: true };
    }),

  /**
   * Get total expenses for a budget line
   */
  getTotalByLine: scopedProcedure
    .input(
      z.object({
        budgetLineId: z.number(),
      })
    )
    .query(async ({ ctx, input }: any) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { budgetLineId } = input;

      const [result] = await db
        .select({
          totalExpenses: sql<string>`COALESCE(SUM(expenseAmount), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(budgetAnalysisExpenses)
        .where(
          and(
            eq(budgetAnalysisExpenses.budgetLineId, budgetLineId),
            eq(budgetAnalysisExpenses.organizationId, organizationId),
            isNull(budgetAnalysisExpenses.deletedAt)
          )
        );

      return {
        totalExpenses: parseFloat((result?.totalExpenses as string) || "0"),
        count: result?.count || 0,
      };
    }),

  /**
   * Get total expenses for a budget
   */
  getTotalByBudget: scopedProcedure
    .input(
      z.object({
        budgetId: z.number(),
      })
    )
    .query(async ({ ctx, input }: any) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { budgetId } = input;

      const [result] = await db
        .select({
          totalExpenses: sql<string>`COALESCE(SUM(expenseAmount), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(budgetAnalysisExpenses)
        .where(
          and(
            eq(budgetAnalysisExpenses.budgetId, budgetId),
            eq(budgetAnalysisExpenses.organizationId, organizationId),
            isNull(budgetAnalysisExpenses.deletedAt)
          )
        );

      return {
        totalExpenses: parseFloat((result?.totalExpenses as string) || "0"),
        count: result?.count || 0,
      };
    }),
});