import { getDb } from "../../db";
import { grants, donors, projects, reportingSchedules, budgets, expenses } from "drizzle/schema";
import { eq, and, sql, sum, count, desc, gte, lte, or, isNull } from "drizzle-orm";
import { todaySqlDate, daysFromNow } from "../../db/_time";

/**
 * GrantAnalyticsService
 * 
 * Logic for calculating strategic grant performance metrics.
 * Integrated with the Executive Intelligence Center.
 */
export class GrantAnalyticsService {
  /**
   * getGrantPortfolioMetrics
   * Returns total value of ongoing grants and counts of expiring agreements.
   */
  static async getGrantPortfolioMetrics(organizationId: number, operatingUnitId?: number | null) {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    
    // Ongoing grants summary: filtered by organization and optional operating unit
    // Note: Grants are often HQ-level, so we use or(isNull(ou), eq(ou)) pattern
    const res = await db
      .select({
        totalValue: sum(grants.grantAmount),
        count: count(grants.id),
      })
      .from(grants)
      .where(and(
        eq(grants.organizationId, organizationId),
        operatingUnitId ? or(isNull(grants.operatingUnitId), eq(grants.operatingUnitId, operatingUnitId)) : undefined,
        eq(grants.status, 'ongoing'),
        eq(grants.isDeleted, 0)
      ));

    // Expiry alerts: find grants ending within the next 90 days
    const today = todaySqlDate();
    const ninetyDays = daysFromNow(90);
    const expiringSoon = await db
      .select({ count: count() })
      .from(grants)
      .where(and(
        eq(grants.organizationId, organizationId),
        eq(grants.status, 'ongoing'),
        gte(grants.endDate, today),
        lte(grants.endDate, ninetyDays),
        eq(grants.isDeleted, 0)
      ));

    return {
      totalGrantValue: Number(res[0]?.totalValue || 0),
      activeGrantsCount: res[0]?.count || 0,
      expiringIn90Days: expiringSoon[0]?.count || 0,
    };
  }
}

/**
 * ForecastingService
 * 
 * Predictive engine for budget exhaustion and spending trends.
 * Uses historical burn rates to project future liquidity.
 */
export class ForecastingService {
  /**
   * getExhaustionForecast
   * Projects how many months of funding remain based on 3-month average burn.
   */
  static async getExhaustionForecast(organizationId: number, operatingUnitId?: number | null) {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    
    // 1. Calculate average burn rate over last 3 months (approved expenses only)
    const threeMonthsAgo = daysFromNow(-90);
    const burnQuery = sql`
      SELECT 
        SUM(amount) / 3 as avgMonthlyBurn
      FROM expenses
      WHERE organizationId = ${organizationId}
        AND expenseDate >= ${threeMonthsAgo}
        AND status = 'approved'
        AND isDeleted = 0
    `;
    
    const burnRes = await db.execute(burnQuery);
    const avgBurn = Number((burnRes[0] as any)[0]?.avgMonthlyBurn || 0);

    // 2. Get current total remaining balance from all active budgets
    const budgetRes = await db
      .select({ remaining: sum(budgets.totalRemainingAmount) })
      .from(budgets)
      .where(and(
        eq(budgets.organizationId, organizationId),
        operatingUnitId ? eq(budgets.operatingUnitId, operatingUnitId) : undefined,
        eq(budgets.isDeleted, 0),
        or(eq(budgets.status, 'approved'), eq(budgets.status, 'revised'))
      ));

    const remaining = Number(budgetRes[0]?.remaining || 0);
    
    // 3. Project exhaustion
    // Logic: monthsRemaining = (Current Balance) / (Avg Monthly Cash Outflow)
    const monthsRemaining = avgBurn > 0 ? (remaining / avgBurn) : 0;

    return {
      avgMonthlyBurn: Math.round(avgBurn),
      remainingBalance: Math.round(remaining),
      projectedExhaustionMonths: Math.round(monthsRemaining * 10) / 10,
      // Status flags for the UI
      forecastStatus: monthsRemaining < 2 ? 'critical' : monthsRemaining < 4 ? 'warning' : 'healthy'
    };
  }
}
