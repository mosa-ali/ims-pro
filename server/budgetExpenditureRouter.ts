/**
 * Budget Expenditure Tracking Router
 * Links budget lines to actual expenditures for variance analysis
 */

import { z } from "zod";
import { protectedProcedure, router, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { budgets, budgetLines, expenses, budgetItems, budgetMonthlyAllocations } from "../drizzle/schema";
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
    .query(async ({ ctx, input }) => {
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

      const totalBudgeted = lines.reduce((sum, line) => sum + parseFloat(line.totalAmount || "0"), 0);
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
    .query(async ({ ctx, input }) => {
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

      // Get expenses grouped by budget item (linked through budgetItemId)
      // Note: We need to map budget lines to budget items for expense tracking
      const expensesByItem = await db
        .select({
          budgetItemId: expenses.budgetItemId,
          totalExpenses: sql<string>`SUM(${expenses.amount})`,
          expenseCount: sql<number>`COUNT(*)`,
        })
        .from(expenses)
        .where(
          and(
            eq(expenses.projectId, budget.projectId),
            eq(expenses.organizationId, organizationId),
            eq(expenses.status, "approved")
          )
        )
        .groupBy(expenses.budgetItemId);

      // Create a map of expenses by budget item
      const expenseMap = new Map(
        expensesByItem.map((e) => [e.budgetItemId, { total: parseFloat(e.totalExpenses || "0"), count: e.expenseCount }])
      );

      // Calculate variance for each line
      const lineAnalysis = lines.map((line) => {
        const budgeted = parseFloat(line.totalAmount || "0");
        // Try to find matching expenses (would need budgetItemId linkage)
        const expenseInfo = expenseMap.get(line.id) || { total: 0, count: 0 };
        const actual = expenseInfo.total;
        const variance = budgeted - actual;
        const utilizationRate = budgeted > 0 ? (actual / budgeted) * 100 : 0;

        return {
          lineId: line.id,
          lineCode: line.lineCode,
          description: line.description,
          descriptionAr: line.descriptionAr,
          categoryId: line.categoryId,
          budgeted,
          actual,
          variance,
          utilizationRate,
          expenseCount: expenseInfo.count,
          status: utilizationRate > 100 ? "over_budget" : utilizationRate > 90 ? "warning" : "on_track",
        };
      });

      // Calculate totals
      const totals = lineAnalysis.reduce(
        (acc, line) => ({
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
    .query(async ({ ctx, input }) => {
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
        const planned = monthAllocations.reduce((sum, a) => sum + parseFloat(a.plannedAmount || "0"), 0);
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
          planned: quarterMonths.reduce((sum, m) => sum + m.planned, 0),
          actual: quarterMonths.reduce((sum, m) => sum + m.actual, 0),
          variance: quarterMonths.reduce((sum, m) => sum + m.variance, 0),
        };
      });

      // Calculate annual totals
      const annualTotals = {
        planned: monthlyAnalysis.reduce((sum, m) => sum + m.planned, 0),
        actual: monthlyAnalysis.reduce((sum, m) => sum + m.actual, 0),
        variance: monthlyAnalysis.reduce((sum, m) => sum + m.variance, 0),
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
    .query(async ({ ctx, input }) => {
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

      // Get expenses by budget item
      const expensesByItem = await db
        .select({
          budgetItemId: expenses.budgetItemId,
          totalExpenses: sql<string>`SUM(${expenses.amount})`,
        })
        .from(expenses)
        .where(
          and(
            eq(expenses.projectId, budget.projectId),
            eq(expenses.organizationId, organizationId),
            eq(expenses.status, "approved")
          )
        )
        .groupBy(expenses.budgetItemId);

      const expenseMap = new Map(expensesByItem.map((e) => [e.budgetItemId, parseFloat(e.totalExpenses || "0")]));

      // Find lines exceeding threshold
      const alerts = lines
        .map((line) => {
          const budgeted = parseFloat(line.totalAmount || "0");
          const actual = expenseMap.get(line.id) || 0;
          const utilizationRate = budgeted > 0 ? (actual / budgeted) * 100 : 0;

          if (utilizationRate >= thresholdPercent) {
            return {
              lineId: line.id,
              lineCode: line.lineCode,
              description: line.description,
              descriptionAr: line.descriptionAr,
              budgeted,
              actual,
              variance: budgeted - actual,
              utilizationRate,
              alertLevel: utilizationRate > 100 ? "critical" : "warning",
              message:
                utilizationRate > 100
                  ? `Over budget by ${(utilizationRate - 100).toFixed(1)}%`
                  : `${utilizationRate.toFixed(1)}% utilized - approaching limit`,
            };
          }
          return null;
        })
        .filter(Boolean);

      return {
        budgetId,
        budgetCode: budget.budgetCode,
        thresholdPercent,
        alertCount: alerts.length,
        criticalCount: alerts.filter((a: any) => a?.alertLevel === "critical").length,
        warningCount: alerts.filter((a: any) => a?.alertLevel === "warning").length,
        alerts,
      };
    }),
});
