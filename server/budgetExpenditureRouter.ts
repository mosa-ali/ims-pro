/**
 * Budget Expenditure Tracking Router
 * Links budget lines to actual expenditures for variance analysis
 */

import { z } from "zod";
import { protectedProcedure, router, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { budgets, budgetLines, expenses, budgetItems as budgetItemsTable, budgetMonthlyAllocations, budgetAnalysisExpenses } from "../drizzle/schema";
import { eq, and, sql, isNull, gte, lte, sum } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const budgetExpenditureRouter = router({
  /**
   * Get budget utilization summary for a budget
   */
  getBudgetUtilization: scopedProcedure
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

      // Get budget header
      const [budget] = await db
        .select()
        .from(budgets)
        .where(and(eq(budgets.id, budgetId), eq(budgets.organizationId, organizationId)));

      if (!budget) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Budget not found" });
      }

      // Get budget lines
      const lines = await db
        .select()
        .from(budgetLines)
        .where(and(eq(budgetLines.budgetId, budgetId), isNull(budgetLines.deletedAt)));

      // Get total expenses for this budget's project
      const expenseData = await db
        .select({
          totalExpenses: sql<string>`COALESCE(SUM(${expenses.amount}), 0)`,
        })
        .from(expenses)
        .where(
          and(
            eq(expenses.projectId, budget.projectId),
            eq(expenses.organizationId, organizationId),
            eq(expenses.status, "approved")
          )
        );

      const totalBudgeted = lines.reduce((sum: number, line: any) => sum + parseFloat(line.totalAmount || "0"), 0);
      const totalExpenses = parseFloat(expenseData[0]?.totalExpenses || "0");
      const variance = totalBudgeted - totalExpenses;
      const utilizationRate = totalBudgeted > 0 ? (totalExpenses / totalBudgeted) * 100 : 0;

      return {
        budgetId,
        budgetCode: budget.budgetCode,
        fiscalYear: budget.fiscalYear,
        currency: budget.currency,
        totalBudgeted,
        totalExpenses,
        variance,
        utilizationRate,
        status: utilizationRate > 100 ? "over_budget" : utilizationRate > 90 ? "warning" : "on_track",
        lineCount: lines.length,
      };
    }),

  /**
   * Get line-level variance analysis
   */
  getLineVarianceAnalysis: scopedProcedure
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

      // Get budget header
      const [budget] = await db
        .select()
        .from(budgets)
        .where(and(eq(budgets.id, budgetId), eq(budgets.organizationId, organizationId)));

      if (!budget) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Budget not found" });
      }

      // Get budget lines with their linked budget items
      const lines = await db
        .select()
        .from(budgetLines)
        .where(and(eq(budgetLines.budgetId, budgetId), isNull(budgetLines.deletedAt)));

      // Get all budget items for this project to fetch actualSpent
      const budgetItemsList = await db
        .select()
        .from(budgetItemsTable)
        .where(and(eq(budgetItemsTable.projectId, budget.projectId), eq(budgetItemsTable.isDeleted, 0)));

      // Create a map of budget items by ID for quick lookup
      const budgetItemMap = new Map(
        budgetItemsList.map((bi) => [bi.id, parseFloat(bi.actualSpent || "0")])
      );

      // Calculate variance for each line using actualSpent from linked budget_item
      const lineAnalysis = lines.map((line) => {
        const budgeted = parseFloat(line.totalAmount || "0");
        // Get actual spent from the linked budget_item
        const actual = line.budgetItemId ? (budgetItemMap.get(line.budgetItemId) || 0) : 0;
        const variance = budgeted - actual;
        const utilizationRate = budgeted > 0 ? (actual / budgeted) * 100 : 0;

        return {
          lineId: line.id,
          lineCode: line.lineCode,
          description: line.description,
          descriptionAr: line.descriptionAr,
          categoryId: line.categoryId,
          budgetItemId: line.budgetItemId,
          budgeted,
          actual,
          variance,
          utilizationRate,
          status: utilizationRate > 100 ? "over_budget" : utilizationRate > 90 ? "warning" : "on_track",
        };
      });

      // Calculate totals
      const totals = lineAnalysis.reduce(
        (acc: any, line: any) => ({
          budgeted: acc.budgeted + line.budgeted,
          actual: acc.actual + line.actual,
          variance: acc.variance + line.variance,
        }),
        { budgeted: 0, actual: 0, variance: 0 }
      );
      


      return {
        budgetId,
        budgetCode: budget.budgetCode,
        fiscalYear: budget.fiscalYear,
        currency: budget.currency,
        lines: lineAnalysis,
        totals: {
          ...totals,
          utilizationRate: totals.budgeted > 0 ? (totals.actual / totals.budgeted) * 100 : 0,
        },
      };
    }),

  /**
   * Get monthly variance analysis
   */
  getMonthlyVarianceAnalysis: scopedProcedure
    .input(
      z.object({
        budgetId: z.number(),
        fiscalYear: z.string(),
      })
    )
    .query(async ({ ctx, input }: any) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { budgetId, fiscalYear } = input;

      // Get budget header
      const [budget] = await db
        .select()
        .from(budgets)
        .where(and(eq(budgets.id, budgetId), eq(budgets.organizationId, organizationId)));

      if (!budget) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Budget not found" });
      }

      // Get monthly allocations
      const allocations = await db
        .select()
        .from(budgetMonthlyAllocations)
        .where(and(eq(budgetMonthlyAllocations.budgetId, budgetId), eq(budgetMonthlyAllocations.fiscalYear, fiscalYear)));

      // Get monthly expenses
      const monthlyExpenses = await db
        .select({
          month: expenses.month,
          totalExpenses: sql<string>`SUM(${expenses.amount})`,
        })
        .from(expenses)
        .where(
          and(
            eq(expenses.projectId, budget.projectId),
            eq(expenses.organizationId, organizationId),
            eq(expenses.fiscalYear, fiscalYear),
            eq(expenses.status, "approved")
          )
        )
        .groupBy(expenses.month);

      // Create expense map by month
      const expenseMap = new Map(monthlyExpenses.map((e) => [e.month, parseFloat(e.totalExpenses || "0")]));

      // Calculate monthly variance
      const monthlyAnalysis = Array.from({ length: 12 }, (_, i) => {
        const monthNumber = i + 1;
        const monthAllocations = allocations.filter((a) => a.monthNumber === monthNumber);
        const planned = monthAllocations.reduce((sum: number, a: any) => sum + parseFloat(a.plannedAmount || "0"), 0);
        const actual = expenseMap.get(monthNumber) || 0;
        const variance = planned - actual;
        const utilizationRate = planned > 0 ? (actual / planned) * 100 : 0;

        return {
          month: monthNumber,
          planned,
          actual,
          variance,
          utilizationRate,
          status: utilizationRate > 100 ? "over_budget" : utilizationRate > 90 ? "warning" : "on_track",
        };
      });

      // Calculate quarterly summaries
      const quarterlySummary = [1, 2, 3, 4].map((quarter) => {
        const startMonth = (quarter - 1) * 3;
        const quarterMonths = monthlyAnalysis.slice(startMonth, startMonth + 3);
        return {
          quarter,
          planned: quarterMonths.reduce((sum: number, m: any) => sum + m.planned, 0),
          actual: quarterMonths.reduce((sum: number, m: any) => sum + m.actual, 0),
          variance: quarterMonths.reduce((sum: number, m: any) => sum + m.variance, 0),
        };
      });

      // Calculate annual totals
      const annualTotals = {
        planned: monthlyAnalysis.reduce((sum: number, m: any) => sum + m.planned, 0),
        actual: monthlyAnalysis.reduce((sum: number, m: any) => sum + m.actual, 0),
        variance: monthlyAnalysis.reduce((sum: number, m: any) => sum + m.variance, 0),
      };

      return {
        budgetId,
        budgetCode: budget.budgetCode,
        fiscalYear,
        currency: budget.currency,
        monthly: monthlyAnalysis,
        quarterly: quarterlySummary,
        annual: {
          ...annualTotals,
          utilizationRate: annualTotals.planned > 0 ? (annualTotals.actual / annualTotals.planned) * 100 : 0,
        },
      };
    }),

  /**
   * Get variance alerts for a budget
   */
  getVarianceAlerts: scopedProcedure
    .input(
      z.object({
        budgetId: z.number(),
        thresholdPercent: z.number().default(90),
      })
    )
    .query(async ({ ctx, input }: any) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { budgetId, thresholdPercent } = input;

      // Get budget header
      const [budget] = await db
        .select()
        .from(budgets)
        .where(and(eq(budgets.id, budgetId), eq(budgets.organizationId, organizationId)));

      if (!budget) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Budget not found" });
      }

      // Get budget lines
      const lines = await db
        .select()
        .from(budgetLines)
        .where(and(eq(budgetLines.budgetId, budgetId), isNull(budgetLines.deletedAt)));

      // Get all budget items for this project
      const budgetItemsList = await db
        .select()
        .from(budgetItemsTable)
        .where(and(eq(budgetItemsTable.projectId, budget.projectId), eq(budgetItemsTable.isDeleted, 0)));

      // Create a map of budget items by ID
      const budgetItemMap = new Map(
        budgetItemsList.map((bi) => [bi.id, parseFloat(bi.actualSpent || "0")])
      );

      // Calculate variance for each line and identify alerts
      const alerts = lines
        .map((line) => {
          const budgeted = parseFloat(line.totalAmount || "0");
          const actual = line.budgetItemId ? (budgetItemMap.get(line.budgetItemId) || 0) : 0;
          const variance = budgeted - actual;
          const utilizationRate = budgeted > 0 ? (actual / budgeted) * 100 : 0;

          return {
            lineId: line.id,
            lineCode: line.lineCode,
            description: line.description,
            budgeted,
            actual,
            variance,
            utilizationRate,
            severity: utilizationRate > 100 ? "critical" : utilizationRate > thresholdPercent ? "warning" : "normal",
          };
        })
        .filter((line) => line.severity !== "normal");

      return {
        budgetId,
        budgetCode: budget.budgetCode,
        fiscalYear: budget.fiscalYear,
        thresholdPercent,
        alertCount: alerts.length,
        alerts,
      };
    }),

  /**
   * Get budget analysis expenses
   */
  getAnalysisExpenses: scopedProcedure
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

      // Verify budget exists
      const [budget] = await db
        .select()
        .from(budgets)
        .where(and(eq(budgets.id, budgetId), eq(budgets.organizationId, organizationId)));

      if (!budget) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Budget not found" });
      }

      // Get all expenses for this budget
      const expensesList = await db
        .select()
        .from(budgetAnalysisExpenses)
        .where(
          and(
            eq(budgetAnalysisExpenses.budgetId, budgetId),
            eq(budgetAnalysisExpenses.organizationId, organizationId),
            eq(budgetAnalysisExpenses.isDeleted, 0)
          )
        )
        .orderBy(budgetAnalysisExpenses.expenseDate);

      // Group by budget line
      const expensesByLine = new Map();
      expensesList.forEach((expense) => {
        const lineId = expense.budgetLineId;
        if (!expensesByLine.has(lineId)) {
          expensesByLine.set(lineId, []);
        }
        expensesByLine.get(lineId).push(expense);
      });

      // Get budget lines with their expenses
      const lines = await db
        .select()
        .from(budgetLines)
        .where(and(eq(budgetLines.budgetId, budgetId), isNull(budgetLines.deletedAt)));

      const linesWithExpenses = lines.map((line) => ({
        ...line,
        expenses: expensesByLine.get(line.id) || [],
        totalExpenses: (expensesByLine.get(line.id) || []).reduce(
          (sum: number, e: any) => sum + parseFloat(e.expenseAmount || "0"),
          0
        ),
      }));

      return {
        budgetId,
        lines: linesWithExpenses,
        totalExpenses: expensesList.reduce((sum: number, e: any) => sum + parseFloat(e.expenseAmount || "0"), 0),
      };
    }),

  /**
   * Create a new budget analysis expense
   */
  createAnalysisExpense: scopedProcedure
    .input(
      z.object({
        budgetId: z.number(),
        budgetLineId: z.number(),
        budgetItemId: z.number().optional(),
        expenseAmount: z.number().positive(),
        expenseDate: z.string().optional(),
        description: z.string(),
        category: z.string().optional(),
        reference: z.string().optional(),
        status: z.enum(["pending", "approved", "rejected"]).default("pending"),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }: any) => {
      const { organizationId, userId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Verify budget exists
      const [budget] = await db
        .select()
        .from(budgets)
        .where(and(eq(budgets.id, input.budgetId), eq(budgets.organizationId, organizationId)));

      if (!budget) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Budget not found" });
      }

      // Create expense
      const [newExpense] = await db
        .insert(budgetAnalysisExpenses)
        .values({
          budgetId: input.budgetId,
          budgetLineId: input.budgetLineId,
          budgetItemId: input.budgetItemId || null,
          organizationId,
          expenseAmount: input.expenseAmount.toString(),
          expenseDate: input.expenseDate || new Date().toISOString().split('T')[0],
          description: input.description,
          category: input.category,
          reference: input.reference,
          status: input.status,
          notes: input.notes,
          createdBy: userId,
          updatedBy: userId,
          isDeleted: 0,
        })
        .returning();

      return newExpense;
    }),

  /**
   * Update a budget analysis expense
   */
  updateAnalysisExpense: scopedProcedure
    .input(
      z.object({
        id: z.number(),
        expenseAmount: z.number().positive().optional(),
        expenseDate: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        reference: z.string().optional(),
        status: z.enum(["pending", "approved", "rejected"]).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }: any) => {
      const { organizationId, userId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Get expense and verify ownership
      const [expense] = await db
        .select()
        .from(budgetAnalysisExpenses)
        .where(eq(budgetAnalysisExpenses.id, input.id));

      if (!expense) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Expense not found" });
      }

      // Verify budget ownership
      const [budget] = await db
        .select()
        .from(budgets)
        .where(and(eq(budgets.id, expense.budgetId), eq(budgets.organizationId, organizationId)));

      if (!budget) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to update this expense" });
      }

      // Update expense
      const [updated] = await db
        .update(budgetAnalysisExpenses)
        .set({
          expenseAmount: input.expenseAmount?.toString(),
          expenseDate: input.expenseDate || undefined,
          description: input.description,
          category: input.category,
          reference: input.reference,
          status: input.status,
          notes: input.notes,
          updatedBy: userId,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(budgetAnalysisExpenses.id, input.id))
        .returning();

      return updated;
    }),

  /**
   * Delete a budget analysis expense (soft delete)
   */
  deleteAnalysisExpense: scopedProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async ({ ctx, input }: any) => {
      const { organizationId, userId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Get expense and verify ownership
      const [expense] = await db
        .select()
        .from(budgetAnalysisExpenses)
        .where(eq(budgetAnalysisExpenses.id, input.id));

      if (!expense) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Expense not found" });
      }

      // Verify budget ownership
      const [budget] = await db
        .select()
        .from(budgets)
        .where(and(eq(budgets.id, expense.budgetId), eq(budgets.organizationId, organizationId)));

      if (!budget) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to delete this expense" });
      }

      // Soft delete
      const [deleted] = await db
        .update(budgetAnalysisExpenses)
        .set({
          isDeleted: 1,
          updatedBy: userId,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(budgetAnalysisExpenses.id, input.id))
        .returning();

      return deleted;
    }),
});
