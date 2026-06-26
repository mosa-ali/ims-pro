import { getDb } from "../../db";
import { 
  budgets, 
  budgetLines, 
  expenses, 
  grants, 
  projects, 
  beneficiaries, 
  reportingSchedules, 
  risks, 
  donors 
} from "drizzle/schema";
import { eq, and, sql, sum, count, or, isNull, gte, lte, desc } from "drizzle-orm";
import { BUDGET_STATUS, GRANT_STATUS, PROJECT_STATUS, RISK_STATUS } from "../../db/_status";
import { todaySqlDate, daysFromNow } from "../../db/_time";

/**
 * FinancialAnalyticsService
 * 
 * THE SINGLE SOURCE OF TRUTH for financial metrics across the ERP.
 * Ensures Executive, Finance, and Program dashboards show identical numbers
 * by querying the core finance tables (budgets, budget_lines, expenses).
 */
export class FinancialAnalyticsService {
  
  static async getPortfolioFinancials(organizationId: number, operatingUnitId?: number | null) {
    const db = await getDb();
    
    // Scoped filters
    const baseFilter = and(
      eq(budgets.organizationId, organizationId),
      operatingUnitId ? eq(budgets.operatingUnitId, operatingUnitId) : undefined,
      eq(budgets.isDeleted, 0),
      or(eq(budgets.status, 'approved'), eq(budgets.status, 'revised'))
    );

    // 1. Total Budget & Actuals from Approved Budgets
    const budgetRes = await db
      .select({
        totalBudget: sum(budgets.totalApprovedAmount),
        totalActual: sum(budgets.totalActualAmount),
        totalRemaining: sum(budgets.totalRemainingAmount),
      })
      .from(budgets)
      .where(baseFilter);

    const totalBudget = Number(budgetRes[0]?.totalBudget || 0);
    const totalActual = Number(budgetRes[0]?.totalActual || 0);
    const totalRemaining = Number(budgetRes[0]?.totalRemaining || 0);
    const burnRate = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

    return {
      totalBudget,
      totalActual,
      totalRemaining,
      burnRate: Math.round(burnRate * 100) / 100,
      utilizationRate: Math.round(burnRate)
    };
  }

  static async getMonthlySpendingTrend(organizationId: number, months = 12) {
    const db = await getDb();
    
    // Direct query on expenses for actual cash outflow trend
    const sqlQuery = sql`
      SELECT 
        DATE_FORMAT(expenseDate, '%b %y') as month,
        SUM(amount) as spent
      FROM expenses
      WHERE organizationId = ${organizationId}
        AND isDeleted = 0
        AND expenseDate >= DATE_SUB(NOW(), INTERVAL ${months} MONTH)
      GROUP BY month
      ORDER BY MIN(expenseDate)
    `;

    const result = await db.execute(sqlQuery);
    return (result as any[]).map((row: any) => ({
      month: row.month,
      spent: Number(row.spent || 0),
      budgeted: Number(row.budgeted ?? 0)
    }));
  }
}

/**
 * ExecutiveAlertsService
 * 
 * Dynamically generates operational alerts based on live data thresholds.
 */
export class ExecutiveAlertsService {
  static async getActiveAlerts(organizationId: number, operatingUnitId?: number | null) {
    const db = await getDb();
    const alerts: any[] = [];
    const today = todaySqlDate();
    const thirtyDays = daysFromNow(30);

    // 1. Check for Expiring Grants
    const expiringGrants = await db
      .select({ id: grants.id, name: grants.grantName, endDate: grants.endDate })
      .from(grants)
      .where(and(
        eq(grants.organizationId, organizationId),
        eq(grants.status, 'ongoing'),
        lte(grants.endDate, thirtyDays),
        gte(grants.endDate, today)
      ));

    expiringGrants.forEach(g => {
      alerts.push({
        id: `grant-exp-${g.id}`,
        type: 'warning',
        category: 'grant',
        message: `Grant "${g.name}" expires in less than 30 days (${g.endDate}).`,
        date: 'Action Required'
      });
    });

    // 2. Check for High Burn Rate Projects (>95% utilization with time remaining)
    const highBurnBudgets = await db
      .select({ id: budgets.id, title: budgets.budgetTitle, utilization: budgets.totalActualAmount })
      .from(budgets)
      .where(and(
        eq(budgets.organizationId, organizationId),
        sql`(${budgets.totalActualAmount} / ${budgets.totalApprovedAmount}) > 0.95`
      ));

    highBurnBudgets.forEach(b => {
      alerts.push({
        id: `budget-burn-${b.id}`,
        type: 'critical',
        category: 'budget',
        message: `Critical Burn Rate: Budget "${b.title}" has utilized over 95% of funds.`,
        date: 'Immediate'
      });
    });

    return alerts;
  }
}

/**
 * DonorAnalyticsService
 * 
 * Real-time donor performance and concentration metrics.
 */
export class DonorAnalyticsService {
  static async getTopDonors(organizationId: number) {
    const db = await getDb();
    return await db
      .select({
        id: donors.id,
        name: donors.name,
        totalValue: sum(grants.grantAmount),
        grantCount: count(grants.id)
      })
      .from(donors)
      .leftJoin(grants, eq(donors.id, grants.donorId))
      .where(and(eq(donors.organizationId, organizationId), eq(donors.isActive, 1)))
      .groupBy(donors.id)
      .orderBy(desc(sql`totalValue`))
      .limit(5);
  }
}