/**
 * ============================================================================
 * GET BUDGET TREND FROM BUDGET ITEMS PROCEDURE
 * ============================================================================
 * 
 * Aggregates monthly budget burn from budgetItems table
 * Calculates burn rate based on budgetItems.updatedAt and actualSpent field
 * 
 * Data source: budgetItems table with updatedAt tracking
 * Returns: Array of monthly data points with planned, actual, and burn rate
 * 
 * ============================================================================
 */

import { z } from "zod";
import { scopedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { budgetItems, projects } from "drizzle/schema";
import { eq, and, gte, lte, sql, sum, isNull } from "drizzle-orm";

export const getBudgetTrendFromBudgetItemsProcedure = scopedProcedure
  .input(
    z.object({
      organizationId: z.number(),
      operatingUnitId: z.number().optional(),
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

    // Build conditions
    const conditions = [
      eq(budgetItems.organizationId, organizationId),
      ...(operatingUnitId ? [eq(budgetItems.operatingUnitId, operatingUnitId)] : []),
      isNull(budgetItems.isDeleted),
    ];

    // Fetch all budget items with their update history
    const items = await db
      .select({
        id: budgetItems.id,
        totalBudgetLine: budgetItems.totalBudgetLine,
        actualSpent: budgetItems.actualSpent,
        currency: budgetItems.currency,
        updatedAt: budgetItems.updatedAt,
        startDate: budgetItems.startDate,
        endDate: budgetItems.endDate,
      })
      .from(budgetItems)
      .where(and(...conditions));

    // Group by month based on updatedAt
    const monthlyData: Record<string, {
      month: string;
      totalBudgeted: number;
      totalSpent: number;
      itemCount: number;
      updates: number;
    }> = {};

    items.forEach((item) => {
      // Use updatedAt to determine which month this item was last updated
      const updateDate = item.updatedAt ? new Date(item.updatedAt) : new Date();
      const monthKey = updateDate.toISOString().slice(0, 7); // YYYY-MM

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          totalBudgeted: 0,
          totalSpent: 0,
          itemCount: 0,
          updates: 0,
        };
      }

      monthlyData[monthKey].totalBudgeted += Number(item.totalBudgetLine || 0);
      monthlyData[monthKey].totalSpent += Number(item.actualSpent || 0);
      monthlyData[monthKey].itemCount += 1;
      monthlyData[monthKey].updates += 1;
    });

    // Convert to array and calculate cumulative metrics
    const monthlyArray = Object.values(monthlyData)
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
      .map((month, idx, arr) => {
        // Calculate cumulative totals
        let cumulativeBudgeted = 0;
        let cumulativeSpent = 0;

        for (let i = 0; i <= idx; i++) {
          cumulativeBudgeted += arr[i].totalBudgeted;
          cumulativeSpent += arr[i].totalSpent;
        }

        // Calculate burn rate (actual / budgeted)
        const burnRate = cumulativeBudgeted > 0
          ? Math.round((cumulativeSpent / cumulativeBudgeted) * 100)
          : 0;

        // Format month label (e.g., "Jan 2026")
        const date = new Date(month.month + '-01');
        const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

        // Calculate variance
        const variance = cumulativeBudgeted - cumulativeSpent;

        return {
          month: monthLabel,
          monthKey: month.month,
          // Monthly values
          monthlyBudgeted: Math.round(month.totalBudgeted),
          monthlySpent: Math.round(month.totalSpent),
          // Cumulative values
          budgeted: Math.round(cumulativeBudgeted),
          spent: Math.round(cumulativeSpent),
          projected: Math.round(cumulativeSpent), // Use actual as projection for past months
          // Metrics
          variance: Math.round(variance),
          burnRate,
          itemsUpdated: month.updates,
        };
      });

    // If no data, return empty array with proper structure
    if (monthlyArray.length === 0) {
      return [];
    }

    return monthlyArray;
  });