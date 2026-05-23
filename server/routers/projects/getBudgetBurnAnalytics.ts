/**
 * ============================================================================
 * GET BUDGET BURN ANALYTICS PROCEDURE
 * ============================================================================
 * 
 * Aggregates monthly budget burn from budgetItems table
 * Calculates actual spending grouped by month and project
 * Provides fallback to project.spent if no monthly data exists
 * 
 * Data source: budgetItems table with updatedAt tracking
 * Returns: Array of monthly data points with burn metrics
 * 
 * ============================================================================
 */

import { z } from "zod";
import { scopedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { budgetItems, projects } from "drizzle/schema";
import { eq, and, gte, lte, sql, sum, isNull } from "drizzle-orm";

export const getBudgetBurnAnalyticsProcedure = scopedProcedure
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

    // Build conditions for budget items query
    const conditions = [
      eq(budgetItems.organizationId, organizationId),
      ...(operatingUnitId ? [eq(budgetItems.operatingUnitId, operatingUnitId)] : []),
      eq(budgetItems.isDeleted, 0),
    ];

    // Query monthly burn data from budgetItems using updatedAt
    const monthlyBurnData = await db
      .select({
        month: sql<string>`DATE_FORMAT(${budgetItems.updatedAt}, '%Y-%m')`,
        monthNumber: sql<number>`MONTH(${budgetItems.updatedAt})`,
        year: sql<number>`YEAR(${budgetItems.updatedAt})`,
        totalSpent: sql<number>`SUM(CAST(${budgetItems.actualSpent} AS DECIMAL(15,2)))`,
        totalBudgeted: sql<number>`SUM(CAST(${budgetItems.totalBudgetLine} AS DECIMAL(15,2)))`,
        itemCount: sql<number>`COUNT(DISTINCT ${budgetItems.id})`,
        projectCount: sql<number>`COUNT(DISTINCT ${budgetItems.projectId})`,
      })
      .from(budgetItems)
      .where(and(...conditions))
      .groupBy(
        sql`DATE_FORMAT(${budgetItems.updatedAt}, '%Y-%m')`
      )
      .orderBy(
        sql`DATE_FORMAT(${budgetItems.updatedAt}, '%Y-%m')`
      );

    // If no monthly data exists, fallback to project-level aggregation
    if (monthlyBurnData.length === 0) {
      // Get project-level spent data as fallback
      const projectFallback = await db
        .select({
          totalSpent: sum(projects.spent),
          totalBudget: sum(projects.totalBudget),
          projectCount: sql<number>`COUNT(DISTINCT ${projects.id})`,
        })
        .from(projects)
        .where(
          and(
            eq(projects.organizationId, organizationId),
            ...(operatingUnitId ? [eq(projects.operatingUnitId, operatingUnitId)] : []),
            eq(projects.isDeleted, 0)
          )
        );

      // If still no data, return empty array
      if (!projectFallback[0]?.totalSpent) {
        return [];
      }

      // Return single aggregated data point
      return [{
        month: 'Aggregated',
        monthNumber: now.getMonth() + 1,
        year: now.getFullYear(),
        totalSpent: Number(projectFallback[0].totalSpent || 0),
        totalBudgeted: Number(projectFallback[0].totalBudget || 0),
        itemCount: 0,
        projectCount: Number(projectFallback[0].projectCount || 0),
        burnRate: 0,
        burnVelocity: 'stable',
        burnStatus: 'normal',
      }];
    }

    // Process monthly data and calculate burn metrics
    const processedData = monthlyBurnData.map((month, idx, arr) => {
      const totalSpent = Number(month.totalSpent || 0);
      const totalBudgeted = Number(month.totalBudgeted || 0);

      // Calculate cumulative values
      let cumulativeSpent = 0;
      let cumulativeBudgeted = 0;
      for (let i = 0; i <= idx; i++) {
        cumulativeSpent += Number(arr[i].totalSpent || 0);
        cumulativeBudgeted += Number(arr[i].totalBudgeted || 0);
      }

      // Calculate burn rate (actual / budgeted)
      const burnRate = cumulativeBudgeted > 0
        ? Math.round((cumulativeSpent / cumulativeBudgeted) * 100)
        : 0;

      // Calculate burn velocity (month-over-month change)
      let burnVelocity: 'accelerating' | 'stable' | 'decelerating' = 'stable';
      if (idx > 0) {
        const prevBurnRate = cumulativeBudgeted > 0
          ? (Number(arr[idx - 1].totalSpent || 0) / Number(arr[idx - 1].totalBudgeted || 0)) * 100
          : 0;
        const currentRate = totalBudgeted > 0
          ? (totalSpent / totalBudgeted) * 100
          : 0;
        
        if (currentRate > prevBurnRate + 5) {
          burnVelocity = 'accelerating';
        } else if (currentRate < prevBurnRate - 5) {
          burnVelocity = 'decelerating';
        }
      }

      // Determine burn status based on thresholds
      let burnStatus: 'normal' | 'warning' | 'critical' = 'normal';
      if (burnRate > 100) {
        burnStatus = 'critical'; // Over budget
      } else if (burnRate > 85) {
        burnStatus = 'warning'; // High burn rate
      }

      // Format month label (e.g., "Jan 2026")
      const monthDate = new Date(`${month.month}-01`);
      const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      return {
        month: monthLabel,
        monthKey: month.month,
        monthNumber: month.monthNumber,
        year: month.year,
        totalSpent: Math.round(totalSpent),
        totalBudgeted: Math.round(totalBudgeted),
        cumulativeSpent: Math.round(cumulativeSpent),
        cumulativeBudgeted: Math.round(cumulativeBudgeted),
        burnRate,
        burnVelocity,
        burnStatus,
        variance: Math.round(cumulativeBudgeted - cumulativeSpent),
        itemCount: month.itemCount,
        projectCount: month.projectCount,
      };
    });

    return processedData;
  });
