/**
 * server/engines/LiquidityAnalysisEngine.ts
 *
 * Liquidity Analysis Engine
 * Handles liquidity ratio calculations, working capital analysis, and stress testing.
 *
 * Responsibilities:
 * - Calculate current, quick, and cash ratios
 * - Analyze working capital and operating cycle
 * - Perform liquidity stress testing scenarios
 * - Track liquidity trends over time
 * - Generate liquidity health scores
 * - Identify liquidity risks and constraints
 */

import { and, eq, sum, gte, lte, desc, sql, isNull } from 'drizzle-orm';
import type { DB } from '../db/_scope';
import {
  financeBankAccounts,
  payments,
  financeExpenditures,
  journalEntries,
  budgetLines,
  procurementPayables,
  financeAdvances,
} from '../../drizzle/schema';
import { getDb } from '../db';

// ── Types ────────────────────────────────────────────────────────────────────

export interface LiquidityRatios {
  currentRatio: number;
  quickRatio: number;
  cashRatio: number;
  workingCapital: number;
  operatingCycle: number;
  cashConversionCycle: number;
}

export interface WorkingCapitalAnalysis {
  currentAssets: number;
  currentLiabilities: number;
  workingCapital: number;
  workingCapitalRatio: number;
  daysInventoryOutstanding: number;
  daysSalesOutstanding: number;
  daysPayableOutstanding: number;
}

export interface LiquidityStressTest {
  scenarioName: string;
  description: string;
  currentRatioAfterStress: number;
  quickRatioAfterStress: number;
  cashRatioAfterStress: number;
  workingCapitalAfterStress: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

export interface LiquidityTrend {
  date: string;
  currentRatio: number;
  quickRatio: number;
  cashRatio: number;
  workingCapital: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface LiquidityHealthScore {
  overallScore: number; // 0-100
  ratioScore: number;
  trendScore: number;
  stressTestScore: number;
  healthStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  riskFactors: string[];
}

// ── Liquidity Analysis Engine ────────────────────────────────────────────────

export class LiquidityAnalysisEngine {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Calculate liquidity ratios for an organization.
   */
  async calculateLiquidityRatios(
    organizationId: number,
    asOfDate: string
  ): Promise<LiquidityRatios> {
    // Get current assets (cash + bank accounts)
    const [cashResult] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${financeBankAccounts.currentBalance}), 0)`,
      })
      .from(financeBankAccounts)
      .where(
        and(
          eq(financeBankAccounts.organizationId, organizationId),
          lte(financeBankAccounts.createdAt, asOfDate)
        )
      );

    const cashAssets = Number(cashResult?.total) || 0;

    // Get current liabilities (unpaid invoices, payables)
    const [liabilitiesResult] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${procurementPayables.totalAmount}), 0)`,
      })
      .from(procurementPayables)
      .where(
        and(
          eq(procurementPayables.organizationId, organizationId),
          eq(procurementPayables.status, 'pending_invoice'),
          lte(procurementPayables.createdAt, asOfDate)
        )
      );

    const currentLiabilities = Number(liabilitiesResult?.total) || 0;

    // Get quick assets (cash + receivables)
    const quickAssets = cashAssets;

    // Get total current assets (cash + advances + receivables)
    const [advancesResult] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${financeAdvances.approvedAmount}), 0)`,
      })
      .from(financeAdvances)
      .where(
        and(
          eq(financeAdvances.organizationId, organizationId),
          eq(financeAdvances.status, 'PENDING'),
          lte(financeAdvances.createdAt, asOfDate)
        )
      );

    const advances = Number(advancesResult?.total) || 0;
    const currentAssets = cashAssets + advances;

    // Calculate ratios
    const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;
    const quickRatio = currentLiabilities > 0 ? quickAssets / currentLiabilities : 0;
    const cashRatio = currentLiabilities > 0 ? cashAssets / currentLiabilities : 0;
    const workingCapital = currentAssets - currentLiabilities;

    // Operating cycle and cash conversion cycle (simplified)
    const operatingCycle = 45; // TODO: Calculate from actual inventory and receivables data
    const cashConversionCycle = 30; // TODO: Calculate from payables data

    return {
      currentRatio,
      quickRatio,
      cashRatio,
      workingCapital,
      operatingCycle,
      cashConversionCycle,
    };
  }

  /**
   * Analyze working capital.
   */
  async analyzeWorkingCapital(
    organizationId: number,
    asOfDate: string
  ): Promise<WorkingCapitalAnalysis> {
    const ratios = await this.calculateLiquidityRatios(organizationId, asOfDate);

    // Get current assets and liabilities
    const [assetsResult] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${financeBankAccounts.currentBalance}), 0)`,
      })
      .from(financeBankAccounts)
      .where(
        and(
          eq(financeBankAccounts.organizationId, organizationId),
          lte(financeBankAccounts.createdAt, asOfDate)
        )
      );

    const currentAssets = Number(assetsResult?.total) || 0;

    const [liabilitiesResult] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${procurementPayables.totalAmount}), 0)`,
      })
      .from(procurementPayables)
      .where(
        and(
          eq(procurementPayables.organizationId, organizationId),
          eq(procurementPayables.status, 'pending_invoice'),
          lte(procurementPayables.createdAt, asOfDate)
        )
      );

    const currentLiabilities = Number(liabilitiesResult?.total) || 0;

    const workingCapital = currentAssets - currentLiabilities;
    const workingCapitalRatio = currentLiabilities > 0 ? workingCapital / currentLiabilities : 0;

    return {
      currentAssets,
      currentLiabilities,
      workingCapital,
      workingCapitalRatio,
      daysInventoryOutstanding: 30, // TODO: Calculate from inventory data
      daysSalesOutstanding: 45, // TODO: Calculate from receivables data
      daysPayableOutstanding: 60, // TODO: Calculate from payables data
    };
  }

  /**
   * Perform liquidity stress testing.
   */
  async performStressTest(
    organizationId: number,
    asOfDate: string
  ): Promise<LiquidityStressTest[]> {
    const baseRatios = await this.calculateLiquidityRatios(organizationId, asOfDate);

    const stressTests: LiquidityStressTest[] = [];

    // Scenario 1: 20% revenue decline
    stressTests.push({
      scenarioName: 'Revenue Decline (20%)',
      description: 'Simulate 20% reduction in cash inflows',
      currentRatioAfterStress: baseRatios.currentRatio * 0.8,
      quickRatioAfterStress: baseRatios.quickRatio * 0.8,
      cashRatioAfterStress: baseRatios.cashRatio * 0.8,
      workingCapitalAfterStress: baseRatios.workingCapital * 0.8,
      riskLevel: baseRatios.currentRatio * 0.8 < 1 ? 'high' : 'medium',
      recommendations: [
        'Accelerate receivables collection',
        'Negotiate extended payment terms with suppliers',
        'Consider short-term financing',
      ],
    });

    // Scenario 2: 30% expense increase
    stressTests.push({
      scenarioName: 'Expense Increase (30%)',
      description: 'Simulate 30% increase in cash outflows',
      currentRatioAfterStress: baseRatios.currentRatio * 0.7,
      quickRatioAfterStress: baseRatios.quickRatio * 0.7,
      cashRatioAfterStress: baseRatios.cashRatio * 0.7,
      workingCapitalAfterStress: baseRatios.workingCapital * 0.7,
      riskLevel: baseRatios.currentRatio * 0.7 < 1 ? 'critical' : 'high',
      recommendations: [
        'Reduce discretionary spending',
        'Defer non-essential projects',
        'Secure additional credit facilities',
      ],
    });

    // Scenario 3: Major supplier payment due
    stressTests.push({
      scenarioName: 'Large Payment Obligation',
      description: 'Simulate large one-time payment obligation',
      currentRatioAfterStress: baseRatios.currentRatio * 0.6,
      quickRatioAfterStress: baseRatios.quickRatio * 0.6,
      cashRatioAfterStress: baseRatios.cashRatio * 0.6,
      workingCapitalAfterStress: baseRatios.workingCapital * 0.6,
      riskLevel: baseRatios.currentRatio * 0.6 < 1 ? 'critical' : 'high',
      recommendations: [
        'Negotiate payment schedule',
        'Seek vendor financing',
        'Arrange bridge financing',
      ],
    });

    return stressTests;
  }

  /**
   * Get liquidity trends over time.
   */
  async getLiquidityTrends(
    organizationId: number,
    months: number = 12
  ): Promise<LiquidityTrend[]> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const trends: LiquidityTrend[] = [];

    // TODO: Implement historical trend calculation
    // For now, return placeholder
    for (let i = months; i > 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const dateStr = date.toISOString().split('T')[0];

      trends.push({
        date: dateStr,
        currentRatio: 1.5 + Math.random() * 0.5,
        quickRatio: 1.2 + Math.random() * 0.4,
        cashRatio: 0.8 + Math.random() * 0.3,
        workingCapital: 100000 + Math.random() * 50000,
        trend: Math.random() > 0.5 ? 'improving' : 'stable',
      });
    }

    return trends;
  }

  /**
   * Calculate liquidity health score.
   */
  async calculateHealthScore(
    organizationId: number,
    asOfDate: string
  ): Promise<LiquidityHealthScore> {
    const ratios = await this.calculateLiquidityRatios(organizationId, asOfDate);
    const stressTests = await this.performStressTest(organizationId, asOfDate);

    // Ratio score (0-100)
    let ratioScore = 50;
    if (ratios.currentRatio >= 2) ratioScore = 100;
    else if (ratios.currentRatio >= 1.5) ratioScore = 85;
    else if (ratios.currentRatio >= 1) ratioScore = 70;
    else if (ratios.currentRatio >= 0.5) ratioScore = 40;
    else ratioScore = 20;

    // Stress test score
    const criticalTests = stressTests.filter((t) => t.riskLevel === 'critical').length;
    const stressTestScore = Math.max(0, 100 - criticalTests * 30);

    // Trend score (placeholder)
    const trendScore = 75;

    // Overall score
    const overallScore = (ratioScore + stressTestScore + trendScore) / 3;

    // Risk factors
    const riskFactors: string[] = [];
    if (ratios.currentRatio < 1) riskFactors.push('Current ratio below 1.0');
    if (ratios.quickRatio < 0.8) riskFactors.push('Quick ratio below 0.8');
    if (ratios.workingCapital < 0) riskFactors.push('Negative working capital');
    if (criticalTests > 0) riskFactors.push('Critical stress test scenarios');

    // Health status
    let healthStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'critical' = 'fair';
    if (overallScore >= 85) healthStatus = 'excellent';
    else if (overallScore >= 70) healthStatus = 'good';
    else if (overallScore >= 50) healthStatus = 'fair';
    else if (overallScore >= 30) healthStatus = 'poor';
    else healthStatus = 'critical';

    return {
      overallScore,
      ratioScore,
      trendScore,
      stressTestScore,
      healthStatus,
      riskFactors,
    };
  }
}

// ── Singleton Instance ──────────────────────────────────────────────────────

let liquidityAnalysisEngineInstance: LiquidityAnalysisEngine | null = null;

export async function getLiquidityAnalysisEngine(): Promise<LiquidityAnalysisEngine> {
  if (!liquidityAnalysisEngineInstance) {
    const db = await getDb();
    liquidityAnalysisEngineInstance = new LiquidityAnalysisEngine(db);
  }
  return liquidityAnalysisEngineInstance;
}

export const liquidityAnalysisEngine = {
  calculateLiquidityRatios: async (organizationId: number, asOfDate: string) => {
    const engine = await getLiquidityAnalysisEngine();
    return engine.calculateLiquidityRatios(organizationId, asOfDate);
  },
  analyzeWorkingCapital: async (organizationId: number, asOfDate: string) => {
    const engine = await getLiquidityAnalysisEngine();
    return engine.analyzeWorkingCapital(organizationId, asOfDate);
  },
  performStressTest: async (organizationId: number, asOfDate: string) => {
    const engine = await getLiquidityAnalysisEngine();
    return engine.performStressTest(organizationId, asOfDate);
  },
  getLiquidityTrends: async (organizationId: number, months?: number) => {
    const engine = await getLiquidityAnalysisEngine();
    return engine.getLiquidityTrends(organizationId, months);
  },
  calculateHealthScore: async (organizationId: number, asOfDate: string) => {
    const engine = await getLiquidityAnalysisEngine();
    return engine.calculateHealthScore(organizationId, asOfDate);
  },
};
