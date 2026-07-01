/**
 * server/engines/finance/FinancialHealthEngine.ts
 *
 * Financial Health Engine — REFACTORED
 * Calculates comprehensive financial health scores using 10 dimensions.
 *
 * BEFORE: 8 of 10 dimensions returned hardcoded scores
 *         (cashLiquidity=70, revenueGrowth=65, debtManagement=80,
 *          assetUtilization=72, workingCapital=78, profitability=68,
 *          financialStability=82, complianceStatus=90).
 * AFTER:  All 8 now derive scores from HealthRepository, which queries
 *         real GL, bank account, and expenditure data.
 *
 * budgetCompliance and complianceStatus continue to use existing real
 * sources (projects/budgets, and ComplianceRepository respectively).
 *
 * Dimensions:
 * 1. Budget Compliance - Budget adherence (real — projects/budgets)
 * 2. Cash Liquidity - Cash availability (real — HealthRepository)
 * 3. Expense Control - Spending discipline (real — expenditures trend)
 * 4. Revenue Growth - Income trends (real — HealthRepository)
 * 5. Debt Management - Liability management (real — HealthRepository)
 * 6. Asset Utilization - Asset efficiency (real — HealthRepository)
 * 7. Working Capital - Short-term financial health (real — HealthRepository)
 * 8. Profitability - Net income metrics (real — HealthRepository)
 * 9. Financial Stability - Consistency and predictability (real — HealthRepository)
 * 10. Compliance Status - Regulatory compliance (real — ComplianceRepository)
 */

import { and, eq, sql } from 'drizzle-orm';
import type { DB } from '../../db/_scope';
import { projects, budgets, expenditures, journalEntries } from '../../../drizzle/schema';
import { getHealthRepository } from '../../repositories/finance/HealthRepository';
import { getComplianceRepository } from '../../repositories/finance/ComplianceRepository';

// ── Types ────────────────────────────────────────────────────────────────────

export interface HealthDimension {
  name: string;
  score: number; // 0-100
  weight: number; // 0-1
  status: 'excellent' | 'good' | 'fair' | 'poor';
  description: string;
  trend: 'improving' | 'stable' | 'declining';
}

export interface FinancialHealth {
  organizationId: number;
  overallScore: number; // 0-100
  status: 'excellent' | 'good' | 'fair' | 'poor';
  dimensions: HealthDimension[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  calculatedAt: Date;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function statusForScore(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
  return score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor';
}

function toNum(v: any): number {
  if (v == null) return 0;
  const n = typeof v === 'object' && 'toNumber' in v ? v.toNumber() : parseFloat(String(v));
  return isNaN(n) ? 0 : n;
}

// ── Financial Health Engine ──────────────────────────────────────────────────

export class FinancialHealthEngine {
  private db: DB;
  private readonly DIMENSION_WEIGHTS = {
    budgetCompliance: 0.15,
    cashLiquidity: 0.15,
    expenseControl: 0.12,
    revenueGrowth: 0.10,
    debtManagement: 0.10,
    assetUtilization: 0.08,
    workingCapital: 0.10,
    profitability: 0.10,
    financialStability: 0.07,
    complianceStatus: 0.03,
  };

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Calculate budget compliance score.
   * Already real — projects.totalBudget vs projects.spent.
   */
  private async calculateBudgetCompliance(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<HealthDimension> {
    const projectsData = await this.db
      .select({
        totalBudget: sql<number>`SUM(${projects.totalBudget})`,
        totalSpent: sql<number>`SUM(${projects.spent})`,
      })
      .from(projects)
      .where(
        and(
          eq(projects.organizationId, organizationId),
          operatingUnitId ? eq(projects.operatingUnitId, operatingUnitId) : undefined
        )
      );

    const budget = toNum(projectsData[0]?.totalBudget);
    const spent = toNum(projectsData[0]?.totalSpent);

    let score = 100;
    if (budget > 0) {
      const variance = ((spent - budget) / budget) * 100;
      if (variance > 0) score = Math.max(0, 100 - variance);
      else score = Math.min(100, 100 + variance * 0.5);
    }

    return {
      name: 'Budget Compliance',
      score: Math.round(score),
      weight: this.DIMENSION_WEIGHTS.budgetCompliance,
      status: statusForScore(score),
      description: `Budget utilization at ${budget > 0 ? ((spent / budget) * 100).toFixed(1) : 0}%`,
      trend: 'stable',
    };
  }

  /**
   * Calculate cash liquidity score.
   * FIX: was hardcoded to 70 — now from HealthRepository.getCashLiquidityData.
   */
  private async calculateCashLiquidity(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<HealthDimension> {
    const healthRepo = await getHealthRepository(this.db);
    const data = await healthRepo.getCashLiquidityData(organizationId, operatingUnitId);

    // Score: 30+ days of cash = 100, scaling down to 0 at 0 days
    const score = Math.max(0, Math.min(100, Math.round((data.daysOfCashAvailable / 30) * 100)));

    return {
      name: 'Cash Liquidity',
      score,
      weight: this.DIMENSION_WEIGHTS.cashLiquidity,
      status: statusForScore(score),
      description: `${data.daysOfCashAvailable} days of cash available (current ratio ${data.currentRatio.toFixed(2)})`,
      trend: 'stable',
    };
  }

  /**
   * Calculate expense control score.
   * Already real — trailing expenditure trend, with refined month-over-month logic.
   */
  private async calculateExpenseControl(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<HealthDimension> {
    const expensesData = await this.db
      .select({
        month: sql<string>`DATE_FORMAT(${expenditures.expenditureDate}, '%Y-%m')`,
        total: sql<number>`SUM(${expenditures.amount})`,
      })
      .from(expenditures)
      .where(
        and(
          eq(expenditures.organizationId, organizationId),
          operatingUnitId ? eq(expenditures.operatingUnitId, operatingUnitId) : undefined
        )
      )
      .groupBy(sql`DATE_FORMAT(${expenditures.expenditureDate}, '%Y-%m')`)
      .orderBy(sql`DATE_FORMAT(${expenditures.expenditureDate}, '%Y-%m')`);

    let score = 85;
    let trend: 'improving' | 'stable' | 'declining' = 'stable';

    if (expensesData.length > 1) {
      const latest = toNum(expensesData[expensesData.length - 1]?.total);
      const previous = toNum(expensesData[expensesData.length - 2]?.total);
      if (previous > 0) {
        const changeRatio = latest / previous;
        if (changeRatio > 1.2) { score = 55; trend = 'declining'; }
        else if (changeRatio > 1.1) { score = 70; trend = 'declining'; }
        else if (changeRatio < 0.9) { score = 90; trend = 'improving'; }
        else { score = 80; trend = 'stable'; }
      }
    }

    return {
      name: 'Expense Control',
      score,
      weight: this.DIMENSION_WEIGHTS.expenseControl,
      status: statusForScore(score),
      description: 'Spending discipline and expense management',
      trend,
    };
  }

  /**
   * Calculate revenue growth score.
   * FIX: was hardcoded to 65 — now from HealthRepository.getRevenueGrowthData.
   */
  private async calculateRevenueGrowth(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<HealthDimension> {
    const healthRepo = await getHealthRepository(this.db);
    const data = await healthRepo.getRevenueGrowthData(organizationId, operatingUnitId);

    // Score: 0% growth = 60 baseline, +/- scaled by growth percent
    const score = Math.max(0, Math.min(100, Math.round(60 + data.growthPercent)));

    return {
      name: 'Revenue Growth',
      score,
      weight: this.DIMENSION_WEIGHTS.revenueGrowth,
      status: statusForScore(score),
      description: `${data.growthPercent >= 0 ? '+' : ''}${data.growthPercent}% vs prior 90-day period`,
      trend: data.growthPercent > 5 ? 'improving' : data.growthPercent < -5 ? 'declining' : 'stable',
    };
  }

  /**
   * Calculate debt management score.
   * FIX: was hardcoded to 80 — now from HealthRepository.getDebtManagementData.
   */
  private async calculateDebtManagement(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<HealthDimension> {
    const healthRepo = await getHealthRepository(this.db);
    const data = await healthRepo.getDebtManagementData(organizationId, operatingUnitId);

    // Score: debt/asset ratio of 0 = 100, ratio of 1+ = 0
    const score = Math.max(0, Math.min(100, Math.round((1 - data.debtToAssetRatio) * 100)));

    return {
      name: 'Debt Management',
      score,
      weight: this.DIMENSION_WEIGHTS.debtManagement,
      status: statusForScore(score),
      description: `Debt-to-asset ratio: ${data.debtToAssetRatio.toFixed(2)}`,
      trend: 'stable',
    };
  }

  /**
   * Calculate asset utilization score.
   * FIX: was hardcoded to 72 — now from HealthRepository.getAssetUtilizationData.
   */
  private async calculateAssetUtilization(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<HealthDimension> {
    const healthRepo = await getHealthRepository(this.db);
    const data = await healthRepo.getAssetUtilizationData(organizationId, operatingUnitId);

    // Score: turnover ratio of 1.0+ = 100, scaling proportionally
    const score = Math.max(0, Math.min(100, Math.round(data.assetTurnoverRatio * 100)));

    return {
      name: 'Asset Utilization',
      score,
      weight: this.DIMENSION_WEIGHTS.assetUtilization,
      status: statusForScore(score),
      description: `Asset turnover ratio: ${data.assetTurnoverRatio.toFixed(2)}`,
      trend: 'stable',
    };
  }

  /**
   * Calculate working capital score.
   * FIX: was hardcoded to 78 — now from HealthRepository.getWorkingCapitalData.
   */
  private async calculateWorkingCapital(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<HealthDimension> {
    const healthRepo = await getHealthRepository(this.db);
    const data = await healthRepo.getWorkingCapitalData(organizationId, operatingUnitId);

    // Score: ratio of 2.0+ = 100 (healthy), 1.0 = 50, below 1.0 = declining
    const score = Math.max(0, Math.min(100, Math.round((data.workingCapitalRatio / 2) * 100)));

    return {
      name: 'Working Capital',
      score,
      weight: this.DIMENSION_WEIGHTS.workingCapital,
      status: statusForScore(score),
      description: `Working capital ratio: ${data.workingCapitalRatio.toFixed(2)}`,
      trend: 'stable',
    };
  }

  /**
   * Calculate profitability score.
   * FIX: was hardcoded to 68 — now from HealthRepository.getProfitabilityData.
   */
  private async calculateProfitability(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<HealthDimension> {
    const healthRepo = await getHealthRepository(this.db);
    const data = await healthRepo.getProfitabilityData(organizationId, operatingUnitId);

    // Score: net margin of 20%+ = 100, 0% = 50, negative scales down
    const score = Math.max(0, Math.min(100, Math.round(50 + data.netMargin * 2.5)));

    return {
      name: 'Profitability',
      score,
      weight: this.DIMENSION_WEIGHTS.profitability,
      status: statusForScore(score),
      description: `Net margin: ${data.netMargin.toFixed(1)}%`,
      trend: 'stable',
    };
  }

  /**
   * Calculate financial stability score.
   * FIX: was hardcoded to 82 — now from HealthRepository.getFinancialStabilityData.
   */
  private async calculateFinancialStability(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<HealthDimension> {
    const healthRepo = await getHealthRepository(this.db);
    const data = await healthRepo.getFinancialStabilityData(organizationId, operatingUnitId);

    // Score: lower variance coefficient = more stable. 0 = 100, 1.0+ = 0
    const score = Math.max(0, Math.min(100, Math.round((1 - data.varianceCoefficient) * 100)));

    return {
      name: 'Financial Stability',
      score,
      weight: this.DIMENSION_WEIGHTS.financialStability,
      status: statusForScore(score),
      description: 'Consistency and predictability of financial performance',
      trend: score >= 70 ? 'improving' : 'stable',
    };
  }

  /**
   * Calculate compliance status score.
   * FIX: was hardcoded to 90 — now from ComplianceRepository.getAuditReadiness.
   */
  private async calculateComplianceStatus(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<HealthDimension> {
    const complianceRepo = await getComplianceRepository(this.db);
    const auditReadiness = await complianceRepo.getAuditReadiness(organizationId, operatingUnitId);

    return {
      name: 'Compliance Status',
      score: auditReadiness.readinessScore,
      weight: this.DIMENSION_WEIGHTS.complianceStatus,
      status: statusForScore(auditReadiness.readinessScore),
      description: 'Regulatory and internal compliance adherence',
      trend: 'stable',
    };
  }

  /**
   * Calculate overall financial health.
   */
  async calculateFinancialHealth(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<FinancialHealth> {
    const dimensions = await Promise.all([
      this.calculateBudgetCompliance(organizationId, operatingUnitId),
      this.calculateCashLiquidity(organizationId, operatingUnitId),
      this.calculateExpenseControl(organizationId, operatingUnitId),
      this.calculateRevenueGrowth(organizationId, operatingUnitId),
      this.calculateDebtManagement(organizationId, operatingUnitId),
      this.calculateAssetUtilization(organizationId, operatingUnitId),
      this.calculateWorkingCapital(organizationId, operatingUnitId),
      this.calculateProfitability(organizationId, operatingUnitId),
      this.calculateFinancialStability(organizationId, operatingUnitId),
      this.calculateComplianceStatus(organizationId, operatingUnitId),
    ]);

    const overallScore = Math.round(
      dimensions.reduce((sum, dim) => sum + dim.score * dim.weight, 0)
    );

    const strengths = dimensions
      .filter(d => d.score >= 80)
      .map(d => `${d.name}: ${d.score}/100`);

    const weaknesses = dimensions
      .filter(d => d.score < 60)
      .map(d => `${d.name}: ${d.score}/100`);

    const recommendations: string[] = [];
    if (weaknesses.length > 0) {
      recommendations.push(`Focus on improving: ${weaknesses.map(w => w.split(':')[0]).join(', ')}`);
    }
    if (overallScore < 70) {
      recommendations.push('Schedule financial review with stakeholders');
    }

    return {
      organizationId,
      overallScore,
      status: statusForScore(overallScore),
      dimensions,
      strengths,
      weaknesses,
      recommendations,
      calculatedAt: new Date(),
    };
  }
}

// ── Singleton Instance ──────────────────────────────────────────────────────

let healthEngineInstance: FinancialHealthEngine | null = null;

export async function getFinancialHealthEngine(db: DB): Promise<FinancialHealthEngine> {
  if (!healthEngineInstance) {
    healthEngineInstance = new FinancialHealthEngine(db);
  }
  return healthEngineInstance;
}
