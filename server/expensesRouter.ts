import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, sql, desc, gte, lte } from "drizzle-orm";
import { getDb } from "./db";
import { expenses, budgetItems, projects } from "../drizzle/schema";
import { protectedProcedure, scopedProcedure, router } from "./_core/trpc";

/**
 * Expenses Router
 * Handles all expense tracking operations
 * 
 * PLATFORM-LEVEL ISOLATION: Uses scopedProcedure to automatically inject
 * organizationId and operatingUnitId from HTTP headers via ctx.scope
 */

export const expensesRouter = router({
  /**
   * Get all expenses for a project
   * Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
   */
  getByProject: scopedProcedure
    .input(z.object({
      projectId: z.number(),
      status: z.enum(["pending", "approved", "rejected"]).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { projectId, status, startDate, endDate } = input;
      const { organizationId, operatingUnitId } = ctx.scope;

      // Verify project belongs to current scope
      const project = await db
        .select()
        .from(projects)
        .where(and(
          eq(projects.id, projectId),
          eq(projects.organizationId, organizationId),
          eq(projects.operatingUnitId, operatingUnitId),
          eq(projects.isDeleted, false)
        ))
        .limit(1);

      if (!project || project.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      const conditions = [
        eq(expenses.projectId, projectId),
        eq(expenses.organizationId, organizationId),
        eq(expenses.operatingUnitId, operatingUnitId),
      ];

      if (status) {
        conditions.push(eq(expenses.status, status));
      }

      if (startDate) {
        conditions.push(gte(expenses.expenseDate, startDate));
      }

      if (endDate) {
        conditions.push(lte(expenses.expenseDate, endDate));
      }

      const expenseRecords = await db
        .select()
        .from(expenses)
        .where(and(...conditions))
        .orderBy(desc(expenses.expenseDate));

      return expenseRecords;
    }),

  /**
   * Get expenses for a specific budget item
   * Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
   */
  getByBudgetItem: scopedProcedure
    .input(z.object({
      budgetItemId: z.number(),
      fiscalYear: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { budgetItemId, fiscalYear } = input;
      const { organizationId, operatingUnitId } = ctx.scope;

      const conditions = [
        eq(expenses.budgetItemId, budgetItemId),
        eq(expenses.organizationId, organizationId),
        eq(expenses.operatingUnitId, operatingUnitId),
      ];

      if (fiscalYear) {
        conditions.push(eq(expenses.fiscalYear, fiscalYear));
      }

      const expenseRecords = await db
        .select()
        .from(expenses)
        .where(and(...conditions))
        .orderBy(desc(expenses.expenseDate));

      return expenseRecords;
    }),

  /**
   * Create a new expense
   * Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
   */
  create: scopedProcedure
    .input(z.object({
      budgetItemId: z.number(),
      projectId: z.number(),
      expenseDate: z.string(),
      amount: z.number().positive(),
      reference: z.string().optional(),
      description: z.string().optional(),
      documentUrl: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const userId = ctx.user.id;
      const { organizationId, operatingUnitId } = ctx.scope;

      const budgetItem = await db
        .select()
        .from(budgetItems)
        .where(eq(budgetItems.id, input.budgetItemId))
        .limit(1);

      if (!budgetItem || budgetItem.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Budget item not found" });
      }

      const item = budgetItem[0];

      // Verify project belongs to current scope
      const project = await db
        .select()
        .from(projects)
        .where(and(
          eq(projects.id, input.projectId),
          eq(projects.organizationId, organizationId),
          eq(projects.operatingUnitId, operatingUnitId)
        ))
        .limit(1);

      if (!project || project.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      const proj = project[0];

      const expenseDate = new Date(input.expenseDate);
      const fiscalYear = `FY${expenseDate.getFullYear()}`;
      const month = expenseDate.getMonth() + 1;

      const projectStart = new Date(proj.startDate);
      const projectEnd = new Date(proj.endDate);

      if (expenseDate < projectStart || expenseDate > projectEnd) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Expense date must be within project period (${proj.startDate} to ${proj.endDate})`,
        });
      }

      const existingExpenses = await db
        .select()
        .from(expenses)
        .where(
          and(
            eq(expenses.budgetItemId, input.budgetItemId),
            eq(expenses.status, "approved")
          )
        );

      const totalExpenses = existingExpenses.reduce(
        (sum, exp) => sum + parseFloat(exp.amount.toString()),
        0
      );

      const newTotal = totalExpenses + input.amount;
      const budgetLimit = parseFloat(item.totalBudgetLine.toString());

      if (newTotal > budgetLimit) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Total expenses ($${newTotal.toFixed(2)}) would exceed budget line ($${budgetLimit.toFixed(2)})`,
        });
      }

      const [newExpense] = await db.insert(expenses).values({
        budgetItemId: input.budgetItemId,
        projectId: input.projectId,
        organizationId,
        operatingUnitId,
        expenseDate: input.expenseDate,
        amount: input.amount.toString(),
        fiscalYear,
        month,
        reference: input.reference ?? null,
        description: input.description ?? null,
        documentUrl: input.documentUrl ?? null,
        status: "pending",
        createdBy: userId,
        updatedBy: userId,
      });

      return { success: true, expenseId: newExpense.insertId };
    }),

  /**
   * Calculate total expenses for a budget item
   * Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
   */
  getTotalSpent: scopedProcedure
    .input(z.object({
      budgetItemId: z.number(),
      fiscalYear: z.string().optional(),
      upToDate: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { budgetItemId, fiscalYear, upToDate } = input;
      const { organizationId, operatingUnitId } = ctx.scope;

      const conditions = [
        eq(expenses.budgetItemId, budgetItemId),
        eq(expenses.organizationId, organizationId),
        eq(expenses.operatingUnitId, operatingUnitId),
        eq(expenses.status, "approved"),
      ];

      if (fiscalYear) {
        conditions.push(eq(expenses.fiscalYear, fiscalYear));
      }

      if (upToDate) {
        conditions.push(lte(expenses.expenseDate, upToDate));
      }

      const expenseRecords = await db
        .select()
        .from(expenses)
        .where(and(...conditions));

      const totalSpent = expenseRecords.reduce(
        (sum, exp) => sum + parseFloat(exp.amount.toString()),
        0
      );

      return { totalSpent, count: expenseRecords.length };
    }),
});
