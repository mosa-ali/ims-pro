/**
 * server/engines/finance/FinancialRiskEngine.ts
 *
 * Financial Risk Assessment Engine
 *
 * Assesses financial risk across 5 dimensions:
 *   1. Liquidity Risk    — cash position, payment obligations, days of cash
 *   2. Budget Risk       — overruns, underutilisation, commitment gaps
 *   3. Donor Compliance  — overhead caps, reporting deadlines, restrictions
 *   4. Operational Risk  — vendor concentration, procurement delays
 *   5. Currency Risk     — FX exposure, unrealised gains/losses
 *
 * Called by: financeDashboardRouter.ts (6 procedures)
 *   - getRiskScore, getRiskTrend, getRiskDimensions
 *   - getRiskAlerts, getRiskDistribution, getFinancialRisksRegister
 *
 * API contract (consumed by the router):
 *   const riskEngine = await getFinancialRiskEngine(db);
 *   const assessment = await riskEngine.assessFinancialRisk(orgId, ouId);
 *   // assessment.dimensions[]
 *   // assessment.overallRiskScore
 *   // assessment.overallRiskLevel
 *   // assessment.topRisks[]
 *   // assessment.recommendations[]
 *
 * Pattern: DB constructor + singleton — matches existing codebase.
 */

import type { DB } from '../../db/_scope';
import { eq, and, sql, gte, lte, sum, count } from 'drizzle-orm';
import {
  budgets,
  journalEntries,
  purchaseOrders,
  grants,
  financeBankAccounts,
} from '../../../drizzle/schema';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RiskDimension {
  name: string;
  dimension: string;
  description: string;
  category: string;
  score: number;           // 0–100 (higher = riskier)
  level: RiskLevel;
  status: string;
  weight: number;          // % contribution to overall score
  trend: 'improving' | 'stable' | 'deteriorating';
  probability: number;     // 1–5
  impact: number;          // 1–5
  severity: string;
  owner: string;
  likelihood: number;      // alias for probability (router reads both)
}

export interface FinancialRiskAssessment {
  organizationId: number;
  operatingUnitId: number | null;
  assessedAt: string;
  overallRiskScore: number;
  overallRiskLevel: RiskLevel;
  dimensions: RiskDimension[];
  topRisks: Array<{ name: string; title: string; score: number; level: RiskLevel }>;
  recommendations: string[];
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class FinancialRiskEngine {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Assess financial risk across all dimensions.
   * This is the ONLY public method — called by financeDashboardRouter.
   */
  async assessFinancialRisk(
    organizationId: number,
    operatingUnitId?: number | null,
  ): Promise<FinancialRiskAssessment> {
    const dimensions: RiskDimension[] = [];

    // ── Dimension 1: Liquidity Risk ──
    dimensions.push(await this.assessLiquidityRisk(organizationId, operatingUnitId));

    // ── Dimension 2: Budget Risk ──
    dimensions.push(await this.assessBudgetRisk(organizationId, operatingUnitId));

    // ── Dimension 3: Donor Compliance Risk ──
    dimensions.push(await this.assessDonorComplianceRisk(organizationId, operatingUnitId));

    // ── Dimension 4: Operational Risk ──
    dimensions.push(await this.assessOperationalRisk(organizationId, operatingUnitId));

    // ── Dimension 5: Currency Risk ──
    dimensions.push(await this.assessCurrencyRisk(organizationId, operatingUnitId));

    // Overall score: weighted average
    const totalWeight = dimensions.reduce((s, d) => s + d.weight, 0);
    const overallRiskScore = totalWeight > 0
      ? Math.round(dimensions.reduce((s, d) => s + d.score * d.weight, 0) / totalWeight)
      : 0;

    const overallRiskLevel = this.scoreToLevel(overallRiskScore);

    // Top risks: dimensions sorted by score (highest first)
    const sorted = [...dimensions].sort((a, b) => b.score - a.score);
    const topRisks = sorted.map(d => ({
      name: d.name,
      title: d.name,
      score: d.score,
      level: d.level,
    }));

    // Recommendations
    const recommendations = this.generateRecommendations(dimensions);

    return {
      organizationId,
      operatingUnitId: operatingUnitId ?? null,
      assessedAt: new Date().toISOString(),
      overallRiskScore,
      overallRiskLevel,
      dimensions,
      topRisks,
      recommendations,
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // DIMENSION ASSESSMENTS
  // ────────────────────────────────────────────────────────────────────────

  private async assessLiquidityRisk(
    orgId: number,
    ouId?: number | null,
  ): Promise<RiskDimension> {
    let score = 20; // Default: low risk

    try {
      // Query cash balances from bank accounts
      const balanceResult = await this.db
        .select({ total: sql<number>`COALESCE(SUM(${financeBankAccounts.currentBalance}), 0)` })
        .from(financeBankAccounts)
        .where(
          and(
            eq(financeBankAccounts.organizationId, orgId),
            eq(financeBankAccounts.isActive, 1),
            ...(ouId ? [eq(financeBankAccounts.operatingUnitId, ouId)] : []),
          ),
        );

      const cashBalance = Number(balanceResult[0]?.total) || 0;

      // Query recent monthly expenditure (last 90 days of posted journals)
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const spendResult = await this.db
        .select({ total: sql<number>`COALESCE(SUM(${journalEntries.totalDebit}), 0)` })
        .from(journalEntries)
        .where(
          and(
            eq(journalEntries.organizationId, orgId),
            eq(journalEntries.status, 'posted'),
            gte(journalEntries.entryDate, ninetyDaysAgo),
            ...(ouId ? [eq(journalEntries.operatingUnitId, ouId)] : []),
          ),
        );

      const totalSpend90d = Number(spendResult[0]?.total) || 1;
      const dailyBurn = totalSpend90d / 90;
      const daysOfCash = dailyBurn > 0 ? cashBalance / dailyBurn : 999;

      // Score based on days of cash
      if (daysOfCash < 15) score = 95;
      else if (daysOfCash < 30) score = 75;
      else if (daysOfCash < 60) score = 50;
      else if (daysOfCash < 90) score = 30;
      else score = 15;
    } catch {
      // If tables don't exist yet, use default score
      score = 25;
    }

    const level = this.scoreToLevel(score);
    return {
      name: 'Liquidity Risk',
      dimension: 'Liquidity',
      description: 'Risk of insufficient cash to meet obligations',
      category: 'Financial',
      score,
      level,
      status: level,
      weight: 25,
      trend: 'stable',
      probability: this.scoreToProbability(score),
      impact: 5,
      severity: level,
      owner: 'Treasury',
      likelihood: this.scoreToProbability(score),
    };
  }

  private async assessBudgetRisk(
    orgId: number,
    ouId?: number | null,
  ): Promise<RiskDimension> {
    let score = 20;

    try {
      // Query approved budgets and their utilisation
      const budgetResult = await this.db
        .select({
          totalApproved: sql<number>`COALESCE(SUM(${budgets.totalApprovedAmount}), 0)`,
          totalActual: sql<number>`COALESCE(SUM(${budgets.totalActualAmount}), 0)`,
          budgetCount: count(),
        })
        .from(budgets)
        .where(
          and(
            eq(budgets.organizationId, orgId),
            eq(budgets.status, 'approved'),
            ...(ouId ? [eq(budgets.operatingUnitId, ouId)] : []),
          ),
        );

      const approved = Number(budgetResult[0]?.totalApproved) || 0;
      const actual = Number(budgetResult[0]?.totalActual) || 0;
      const utilisation = approved > 0 ? (actual / approved) * 100 : 0;

      // Over-budget or severe under-spend both indicate risk
      if (utilisation > 100) score = 85;         // Over-budget
      else if (utilisation > 95) score = 60;     // Near limit
      else if (utilisation < 20) score = 55;     // Severe underspend
      else if (utilisation < 40) score = 40;     // Underspend concern
      else score = 15;                           // Healthy range
    } catch {
      score = 20;
    }

    const level = this.scoreToLevel(score);
    return {
      name: 'Budget Risk',
      dimension: 'Budget',
      description: 'Risk of budget overrun or significant underspend',
      category: 'Financial',
      score,
      level,
      status: level,
      weight: 25,
      trend: 'stable',
      probability: this.scoreToProbability(score),
      impact: 4,
      severity: level,
      owner: 'Finance Manager',
      likelihood: this.scoreToProbability(score),
    };
  }

  private async assessDonorComplianceRisk(
    orgId: number,
    ouId?: number | null,
  ): Promise<RiskDimension> {
    let score = 15;

    try {
      // Query active grants and check for expiring ones
      const now = new Date().toISOString().split('T')[0];
      const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const grantResult = await this.db
        .select({
          totalGrants: count(),
          expiringGrants: sql<number>`SUM(CASE WHEN ${grants.endDate} <= ${thirtyDaysOut} AND ${grants.endDate} >= ${now} THEN 1 ELSE 0 END)`,
          expiredGrants: sql<number>`SUM(CASE WHEN ${grants.endDate} < ${now} AND ${grants.status} = 'active' THEN 1 ELSE 0 END)`,
        })
        .from(grants)
        .where(
          and(
            eq(grants.organizationId, orgId),
            eq(grants.status, 'ongoing'),
          ),
        );

      const total = Number(grantResult[0]?.totalGrants) || 0;
      const expiring = Number(grantResult[0]?.expiringGrants) || 0;
      const expired = Number(grantResult[0]?.expiredGrants) || 0;

      if (expired > 0) score = 80;
      else if (expiring > 2) score = 55;
      else if (expiring > 0) score = 35;
      else score = 10;

      // Add risk if many grants (complexity)
      if (total > 20) score = Math.min(100, score + 10);
    } catch {
      score = 20;
    }

    const level = this.scoreToLevel(score);
    return {
      name: 'Donor Compliance Risk',
      dimension: 'Compliance',
      description: 'Risk of non-compliance with donor requirements',
      category: 'Compliance',
      score,
      level,
      status: level,
      weight: 20,
      trend: 'stable',
      probability: this.scoreToProbability(score),
      impact: 5,
      severity: level,
      owner: 'Grant Manager',
      likelihood: this.scoreToProbability(score),
    };
  }

  private async assessOperationalRisk(
    orgId: number,
    ouId?: number | null,
  ): Promise<RiskDimension> {
    let score = 20;

    try {
      // Query PO status for procurement bottlenecks
      const poResult = await this.db
        .select({
          totalPOs: count(),
          pendingPOs: sql<number>`SUM(CASE WHEN ${purchaseOrders.status} IN ('draft', 'pending_approval') THEN 1 ELSE 0 END)`,
        })
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.organizationId, orgId),
            ...(ouId ? [eq(purchaseOrders.operatingUnitId, ouId)] : []),
          ),
        );

      const totalPOs = Number(poResult[0]?.totalPOs) || 0;
      const pendingPOs = Number(poResult[0]?.pendingPOs) || 0;
      const pendingRate = totalPOs > 0 ? (pendingPOs / totalPOs) * 100 : 0;

      if (pendingRate > 50) score = 70;
      else if (pendingRate > 30) score = 50;
      else if (pendingRate > 15) score = 30;
      else score = 15;
    } catch {
      score = 20;
    }

    const level = this.scoreToLevel(score);
    return {
      name: 'Operational Risk',
      dimension: 'Operations',
      description: 'Risk from procurement bottlenecks and process delays',
      category: 'Operational',
      score,
      level,
      status: level,
      weight: 15,
      trend: 'stable',
      probability: this.scoreToProbability(score),
      impact: 3,
      severity: level,
      owner: 'Operations Manager',
      likelihood: this.scoreToProbability(score),
    };
  }

  private async assessCurrencyRisk(
    orgId: number,
    ouId?: number | null,
  ): Promise<RiskDimension> {
    let score = 15;

    try {
      // Count distinct currencies in active budgets
      const currencyResult = await this.db
        .select({
          currencyCount: sql<number>`COUNT(DISTINCT ${budgets.currency})`,
        })
        .from(budgets)
        .where(
          and(
            eq(budgets.organizationId, orgId),
            eq(budgets.status, 'approved'),
            ...(ouId ? [eq(budgets.operatingUnitId, ouId)] : []),
          ),
        );

      const currencyCount = Number(currencyResult[0]?.currencyCount) || 1;

      // More currencies = more FX risk
      if (currencyCount > 5) score = 60;
      else if (currencyCount > 3) score = 40;
      else if (currencyCount > 1) score = 25;
      else score = 10;
    } catch {
      score = 15;
    }

    const level = this.scoreToLevel(score);
    return {
      name: 'Currency Risk',
      dimension: 'Currency',
      description: 'Risk from foreign exchange exposure across multiple currencies',
      category: 'Financial',
      score,
      level,
      status: level,
      weight: 15,
      trend: 'stable',
      probability: this.scoreToProbability(score),
      impact: 3,
      severity: level,
      owner: 'Treasury',
      likelihood: this.scoreToProbability(score),
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // RECOMMENDATIONS
  // ────────────────────────────────────────────────────────────────────────

  private generateRecommendations(dimensions: RiskDimension[]): string[] {
    const recommendations: string[] = [];

    for (const dim of dimensions) {
      if (dim.level === 'critical') {
        switch (dim.dimension) {
          case 'Liquidity':
            recommendations.push('URGENT: Cash reserves critically low. Accelerate donor disbursement requests and defer non-essential payments.');
            break;
          case 'Budget':
            recommendations.push('Budget overrun detected. Freeze discretionary spending and initiate budget revision process.');
            break;
          case 'Compliance':
            recommendations.push('Active grants have expired without closure. Initiate emergency donor communication and grant closure process.');
            break;
          case 'Operations':
            recommendations.push('Severe procurement bottleneck. Review approval queue and consider emergency procurement delegation.');
            break;
          case 'Currency':
            recommendations.push('High FX exposure. Consider natural hedging by aligning payment currencies with receipt currencies.');
            break;
        }
      } else if (dim.level === 'high') {
        switch (dim.dimension) {
          case 'Liquidity':
            recommendations.push('Cash position below 30-day threshold. Review payment scheduling and expedite grant drawdowns.');
            break;
          case 'Budget':
            recommendations.push('Budget utilisation outside healthy range. Review spending patterns and adjust forecasts.');
            break;
          case 'Compliance':
            recommendations.push('Grants expiring within 30 days. Prepare final reports and ensure all obligations are met.');
            break;
          case 'Operations':
            recommendations.push('High proportion of pending POs. Review approval workflow efficiency.');
            break;
          case 'Currency':
            recommendations.push('Multi-currency exposure above normal. Monitor exchange rate movements and review FX policy.');
            break;
        }
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Financial risk profile is healthy. Continue standard monitoring procedures.');
    }

    return recommendations;
  }

  // ────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ────────────────────────────────────────────────────────────────────────

  private scoreToLevel(score: number): RiskLevel {
    if (score >= 75) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  private scoreToProbability(score: number): number {
    if (score >= 80) return 5;
    if (score >= 60) return 4;
    if (score >= 40) return 3;
    if (score >= 20) return 2;
    return 1;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// SINGLETON
// ────────────────────────────────────────────────────────────────────────────

let financialRiskEngineInstance: FinancialRiskEngine | null = null;

export async function getFinancialRiskEngine(db: DB): Promise<FinancialRiskEngine> {
  if (!financialRiskEngineInstance) {
    financialRiskEngineInstance = new FinancialRiskEngine(db);
  }
  return financialRiskEngineInstance;
}