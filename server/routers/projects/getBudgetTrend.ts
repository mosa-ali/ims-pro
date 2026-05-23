/**
 * ============================================================================
 * GET BUDGET TREND PROCEDURE
 * ============================================================================
 * 
 * Aggregates monthly budget allocations and expenses for the past 12 months
 * to calculate burn rate, variance, and forecast data for dashboard visualization.
 * 
 * Data source: budgetMonthlyAllocations table with budgetAnalysisExpenses
 * Returns: Array of monthly data points with planned, actual, and forecast values
 * 
 * ============================================================================
 */

import { z } from "zod";
import { scopedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { 
  budgetMonthlyAllocations, 
  budgetAnalysisExpenses,
  budgets,
  budgetLines,
  projects,
} from "drizzle/schema";
import { eq, and, gte, lte, sql, sum, isNull } from "drizzle-orm";

export const getBudgetTrendProcedure = scopedProcedure
  .input(
    z.object({
      organizationId: z.number(),
      operatingUnitId: z.number(),
      months: z.number().default(12),
    })
  )
  .query(async ({ ctx, input }) => {
    const db = await getDb();
    const { organizationId, operatingUnitId } = input;

    // Calculate date range for the past N months
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - input.months + 1, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Fetch all monthly allocations for the period
    const allocations = await db
      .select({
        allocationMonth: budgetMonthlyAllocations.allocationMonth,
        monthNumber: budgetMonthlyAllocations.monthNumber,
        plannedAmount: budgetMonthlyAllocations.plannedAmount,
        forecastAmount: budgetMonthlyAllocations.forecastAmount,
        actualAmount: budgetMonthlyAllocations.actualAmount,
        variance: budgetMonthlyAllocations.variance,
      })
      .from(budgetMonthlyAllocations)
      .leftJoin(budgets, eq(budgetMonthlyAllocations.budgetId, budgets.id))
      .leftJoin(budgetLines, eq(budgetMonthlyAllocations.budgetLineId, budgetLines.id))
      .where(
        and(
          eq(budgetMonthlyAllocations.organizationId, organizationId),
          eq(budgetMonthlyAllocations.operatingUnitId, operatingUnitId),
          gte(budgetMonthlyAllocations.allocationMonth, startDate.toISOString().split('T')[0]),
          lte(budgetMonthlyAllocations.allocationMonth, endDate.toISOString().split('T')[0]),
          isNull(budgetMonthlyAllocations.deletedAt)
        )
      )
      .orderBy(budgetMonthlyAllocations.allocationMonth);

    // Group by month and aggregate
    const monthlyData: Record<string, any> = {};

    allocations.forEach((alloc) => {
      const monthKey = alloc.allocationMonth || '';
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          monthNumber: alloc.monthNumber || 0,
          plannedAmount: 0,
          forecastAmount: 0,
          actualAmount: 0,
          variance: 0,
        };
      }
      
      monthlyData[monthKey].plannedAmount += Number(alloc.plannedAmount || 0);
      monthlyData[monthKey].forecastAmount += Number(alloc.forecastAmount || 0);
      monthlyData[monthKey].actualAmount += Number(alloc.actualAmount || 0);
      monthlyData[monthKey].variance += Number(alloc.variance || 0);
    });

    // Convert to array and calculate cumulative and burn rate metrics
    const monthlyArray = Object.values(monthlyData)
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
      .map((month, idx, arr) => {
        // Calculate cumulative totals
        let cumulativePlanned = 0;
        let cumulativeActual = 0;
        let cumulativeForecast = 0;

        for (let i = 0; i <= idx; i++) {
          cumulativePlanned += arr[i].plannedAmount;
          cumulativeActual += arr[i].actualAmount;
          cumulativeForecast += arr[i].forecastAmount;
        }

        // Calculate burn rate (actual / planned)
        const burnRate = cumulativePlanned > 0 
          ? Math.round((cumulativeActual / cumulativePlanned) * 100) 
          : 0;

        // Format month label (e.g., "Jan 2026")
        const date = new Date(month.month);
        const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

        return {
          month: monthLabel,
          monthNumber: month.monthNumber,
          // Monthly values
          monthlyBudgeted: Math.round(month.plannedAmount),
          monthlySpent: Math.round(month.actualAmount),
          // Cumulative values
          budgeted: Math.round(cumulativePlanned),
          spent: Math.round(cumulativeActual),
          projected: Math.round(cumulativeForecast),
          // Metrics
          variance: Math.round(cumulativeActual - cumulativePlanned),
          burnRate,
        };
      });

    return monthlyArray;
  });
