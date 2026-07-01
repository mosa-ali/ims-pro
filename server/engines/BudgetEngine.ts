/**
 * server/engines/BudgetEngine.ts
 *
 * Budget Management Engine
 * Handles budget creation, approval, variance analysis, and forecasting.
 *
 * Responsibilities:
 * - Budget lifecycle management (draft → approved → revised → closed)
 * - Budget line allocation and tracking
 * - Variance analysis (budget vs actual)
 * - Budget utilization forecasting
 * - Budget revision and reallocation
 * - Budget reporting and analytics
 */

import { and, eq, sum, avg, gte, lte, desc, sql } from 'drizzle-orm';
import type { DB } from '../db/_scope';
import {
  budgets,
  budgetLines,
  financeExpenditures,
  projects,
} from '../../drizzle/schema';
import { getDb } from '../db';
import { nowSql } from '../db/_time';

// ── Types ────────────────────────────────────────────────────────────────────

export interface BudgetVariance {
  budgetLineId: number;
  budgetedAmount: number;
  actualSpent: number;
  variance: number;
  variancePercent: number;
  status: 'under' | 'over' | 'on-track';
}

export interface BudgetUtilization {
  budgetId: number;
  totalBudget: number;
  totalSpent: number;
  totalCommitted: number;
  totalAvailable: number;
  utilizationPercent: number;
  commitmentPercent: number;
}

export interface BudgetForecast {
  budgetId: number;
  currentUtilization: number;
  projectedUtilization: number;
  daysRemaining: number;
  dailyBurnRate: number;
  projectedOverage: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface BudgetHealthScore {
  budgetId: number;
  score: number; // 0-100
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
}

// ── Budget Engine ───────────────────────────────────────────────────────────

export class BudgetEngine {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Calculate variance for a budget line.
   */
  async calculateLineVariance(budgetLineId: number): Promise<BudgetVariance> {
    const [budgetLine] = await this.db
      .select()
      .from(budgetLines)
      .where(eq(budgetLines.id, budgetLineId));

    if (!budgetLine) {
      throw new Error(`Budget line ${budgetLineId} not found`);
    }

    // Get actual expenditures for this budget line
    const [result] = await this.db
      .select({
        totalSpent: sql<number>`COALESCE(SUM(${financeExpenditures.amount}), 0)`,
      })
      .from(financeExpenditures)
      .where(
        and(
          eq(financeExpenditures.budgetLineId, budgetLineId),
          eq(financeExpenditures.status, 'paid')
        )
      );

    const actualSpent = result?.totalSpent || 0;
    const budgetedAmount = budgetLine.allocatedAmount || 0;
    const variance = budgetedAmount - actualSpent;
    const variancePercent = budgetedAmount > 0 ? (variance / budgetedAmount) * 100 : 0;

    return {
      budgetLineId,
      budgetedAmount,
      actualSpent,
      variance,
      variancePercent,
      status: variance < 0 ? 'over' : variance > budgetedAmount * 0.1 ? 'under' : 'on-track',
    };
  }

  /**
   * Calculate overall budget utilization.
   */
  async calculateBudgetUtilization(budgetId: number): Promise<BudgetUtilization> {
    const [budget] = await this.db
      .select()
      .from(budgets)
      .where(eq(budgets.id, budgetId));

    if (!budget) {
      throw new Error(`Budget ${budgetId} not found`);
    }

    // Get total allocated from budget lines
    const [allocated] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${budgetLines.allocatedAmount}), 0)`,
      })
      .from(budgetLines)
      .where(eq(budgetLines.budgetId, budgetId));

    const totalBudget = allocated?.total || 0;

    // Get actual spent (paid expenditures)
    const [spent] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${financeExpenditures.amount}), 0)`,
      })
      .from(financeExpenditures)
      .leftJoin(budgetLines, eq(financeExpenditures.budgetLineId, budgetLines.id))
      .where(
        and(
          eq(budgetLines.budgetId, budgetId),
          eq(financeExpenditures.status, 'paid')
        )
      );

    const totalSpent = spent?.total || 0;

    // Get committed (approved but not yet paid)
    const [committed] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${financeExpenditures.amount}), 0)`,
      })
      .from(financeExpenditures)
      .leftJoin(budgetLines, eq(financeExpenditures.budgetLineId, budgetLines.id))
      .where(
        and(
          eq(budgetLines.budgetId, budgetId),
          eq(financeExpenditures.status, 'approved')
        )
      );

    const totalCommitted = committed?.total || 0;
    const totalAvailable = totalBudget - totalSpent - totalCommitted;
    const utilizationPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    const commitmentPercent = totalBudget > 0 ? ((totalSpent + totalCommitted) / totalBudget) * 100 : 0;

    return {
      budgetId,
      totalBudget,
      totalSpent,
      totalCommitted,
      totalAvailable,
      utilizationPercent,
      commitmentPercent,
    };
  }

  /**
   * Forecast budget utilization and detect overages.
   */
  async forecastBudgetUtilization(budgetId: number, daysAhead: number = 30): Promise<BudgetForecast> {
    const utilization = await this.calculateBudgetUtilization(budgetId);

    // Calculate daily burn rate from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [burnResult] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${financeExpenditures.amount}), 0)`,
      })
      .from(financeExpenditures)
      .leftJoin(budgetLines, eq(financeExpenditures.budgetLineId, budgetLines.id))
      .where(
        and(
          eq(budgetLines.budgetId, budgetId),
          eq(financeExpenditures.status, 'paid'),
          gte(financeExpenditures.expenditureDate, thirtyDaysAgo)
        )
      );

    const totalBurn = burnResult?.total || 0;
    const dailyBurnRate = totalBurn / 30;
    const projectedAdditionalSpend = dailyBurnRate * daysAhead;
    const projectedUtilization = utilization.utilizationPercent + (projectedAdditionalSpend / utilization.totalBudget) * 100;
    const projectedOverage = Math.max(0, (utilization.totalSpent + projectedAdditionalSpend) - utilization.totalBudget);

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (projectedUtilization > 100) {
      riskLevel = 'high';
    } else if (projectedUtilization > 85) {
      riskLevel = 'medium';
    }

    return {
      budgetId,
      currentUtilization: utilization.utilizationPercent,
      projectedUtilization,
      daysRemaining: daysAhead,
      dailyBurnRate,
      projectedOverage,
      riskLevel,
    };
  }

  /**
   * Calculate budget health score (0-100).
   */
  async calculateBudgetHealthScore(budgetId: number): Promise<BudgetHealthScore> {
    const utilization = await this.calculateBudgetUtilization(budgetId);
    const forecast = await this.forecastBudgetUtilization(budgetId, 30);

    const issues: string[] = [];
    let score = 100;

    // Check utilization
    if (utilization.utilizationPercent > 100) {
      score -= 30;
      issues.push('Budget exceeded');
    } else if (utilization.utilizationPercent > 90) {
      score -= 15;
      issues.push('Budget nearly exhausted');
    }

    // Check forecast
    if (forecast.riskLevel === 'high') {
      score -= 20;
      issues.push('High risk of overage in next 30 days');
    } else if (forecast.riskLevel === 'medium') {
      score -= 10;
      issues.push('Medium risk of overage in next 30 days');
    }

    // Check commitment
    if (utilization.commitmentPercent > 95) {
      score -= 10;
      issues.push('High commitment level');
    }

    // Ensure score is between 0 and 100
    score = Math.max(0, Math.min(100, score));

    const status = score >= 70 ? 'healthy' : score >= 40 ? 'warning' : 'critical';

    return {
      budgetId,
      score,
      status,
      issues,
    };
  }

  /**
   * Get variance analysis for all lines in a budget.
   */
  async getVarianceAnalysis(budgetId: number): Promise<BudgetVariance[]> {
    const lines = await this.db
      .select({ id: budgetLines.id })
      .from(budgetLines)
      .where(eq(budgetLines.budgetId, budgetId));

    const variances: BudgetVariance[] = [];
    for (const line of lines) {
      const variance = await this.calculateLineVariance(line.id);
      variances.push(variance);
    }

    return variances.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
  }

  /**
   * Get budget analytics dashboard data.
   */
  async getBudgetAnalytics(organizationId: number) {
    const [result] = await this.db
      .select({
        totalBudgets: count(budgets.id),
        totalAllocated: sql<number>`COALESCE(SUM(${budgetLines.allocatedAmount}), 0)`,
        totalSpent: sql<number>`COALESCE(SUM(CASE WHEN ${financeExpenditures.status} = 'paid' THEN ${financeExpenditures.amount} ELSE 0 END), 0)`,
        averageUtilization: avg(sql<number>`(COALESCE(SUM(${financeExpenditures.amount}), 0) / COALESCE(SUM(${budgetLines.allocatedAmount}), 1)) * 100`),
      })
      .from(budgets)
      .leftJoin(budgetLines, eq(budgets.id, budgetLines.budgetId))
      .leftJoin(financeExpenditures, eq(budgetLines.id, financeExpenditures.budgetLineId))
      .where(eq(budgets.organizationId, organizationId));

    return result || {
      totalBudgets: 0,
      totalAllocated: 0,
      totalSpent: 0,
      averageUtilization: 0,
    };
  }
}

// ── Singleton Instance ──────────────────────────────────────────────────────

let budgetEngineInstance: BudgetEngine | null = null;

export async function getBudgetEngine(): Promise<BudgetEngine> {
  if (!budgetEngineInstance) {
    const db = await getDb();
    budgetEngineInstance = new BudgetEngine(db);
  }
  return budgetEngineInstance;
}

export const budgetEngine = {
  calculateLineVariance: async (lineId: number) => {
    const engine = await getBudgetEngine();
    return engine.calculateLineVariance(lineId);
  },
  calculateBudgetUtilization: async (budgetId: number) => {
    const engine = await getBudgetEngine();
    return engine.calculateBudgetUtilization(budgetId);
  },
  forecastBudgetUtilization: async (budgetId: number, daysAhead?: number) => {
    const engine = await getBudgetEngine();
    return engine.forecastBudgetUtilization(budgetId, daysAhead);
  },
  calculateBudgetHealthScore: async (budgetId: number) => {
    const engine = await getBudgetEngine();
    return engine.calculateBudgetHealthScore(budgetId);
  },
  getVarianceAnalysis: async (budgetId: number) => {
    const engine = await getBudgetEngine();
    return engine.getVarianceAnalysis(budgetId);
  },
  getBudgetAnalytics: async (orgId: number) => {
    const engine = await getBudgetEngine();
    return engine.getBudgetAnalytics(orgId);
  },
};
