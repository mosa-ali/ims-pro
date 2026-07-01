/**
 * server/engines/CashForecastEngine.ts
 *
 * Cash Forecast Engine
 * Handles cash flow projections, liquidity analysis, and scenario planning.
 */

import { and, eq, gte, lte, sum, desc, sql } from 'drizzle-orm';
import type { DB } from '../db/_scope';
import {
  financeBankAccounts,
  payments,
  financeExpenditures,
  budgets,
} from '../../drizzle/schema';
import { getDb } from '../db';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CashFlowProjection {
  date: string;
  openingBalance: number;
  inflows: number;
  outflows: number;
  closingBalance: number;
  minimumThreshold: number;
  isAboveThreshold: boolean;
}

export interface CashForecastScenario {
  scenarioName: 'best' | 'worst' | 'expected';
  projections: CashFlowProjection[];
  minimumCash: number;
  maximumCash: number;
  averageCash: number;
  daysAboveThreshold: number;
}

export interface CashPosition {
  bankAccountId: number;
  accountName: string;
  currentBalance: number;
  availableBalance: number;
  reservedBalance: number;
  minimumThreshold: number;
  isAboveThreshold: boolean;
  daysOfCashOnHand: number;
}

export interface LiquidityMetrics {
  totalCash: number;
  totalReceivables: number;
  totalPayables: number;
  workingCapital: number;
  currentRatio: number;
  quickRatio: number;
  cashConversionCycle: number;
}

export interface CashFlowGap {
  gapId: string;
  date: string;
  projectedBalance: number;
  minimumThreshold: number;
  gap: number;
  severity: 'critical' | 'warning' | 'normal';
  recommendedAction: string;
}

// ── Cash Forecast Engine ────────────────────────────────────────────────────

export class CashForecastEngine {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  async projectCashPosition(
    bankAccountId: number,
    days: number = 30,
    scenarioType: 'best' | 'worst' | 'expected' = 'expected'
  ): Promise<CashFlowProjection[]> {
    const projections: CashFlowProjection[] = [];

    const [bankAccount] = await this.db
      .select()
      .from(financeBankAccounts)
      .where(eq(financeBankAccounts.id, bankAccountId));

    let currentBalance = Number(bankAccount?.currentBalance) || 0;
    const minimumThreshold = 0; // No minimumBalance column in schema

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    const upcomingPayments = await this.db
      .select({
        paymentDate: payments.paymentDate,
        amount: sum(payments.amount),
      })
      .from(payments)
      .where(
        and(
          eq(payments.bankAccountId, bankAccountId),
          gte(payments.paymentDate, startDate.toISOString().split('T')[0]),
          lte(payments.paymentDate, endDate.toISOString().split('T')[0])
        )
      )
      .groupBy(payments.paymentDate);

    const upcomingExpenditures = await this.db
      .select({
        expenditureDate: financeExpenditures.expenditureDate,
        amount: sum(financeExpenditures.amount),
      })
      .from(financeExpenditures)
      .where(
        and(
          gte(financeExpenditures.expenditureDate, startDate.toISOString().split('T')[0]),
          lte(financeExpenditures.expenditureDate, endDate.toISOString().split('T')[0])
        )
      )
      .groupBy(financeExpenditures.expenditureDate);

    for (let i = 0; i <= days; i++) {
      const projectionDate = new Date(startDate);
      projectionDate.setDate(projectionDate.getDate() + i);
      const dateStr = projectionDate.toISOString().split('T')[0];

      const dayPayments = upcomingPayments.find(
        p => p.paymentDate === dateStr
      );
      const dayExpenditures = upcomingExpenditures.find(
        e => e.expenditureDate === dateStr
      );

      const inflows = dayPayments ? Number(dayPayments.amount) || 0 : 0;
      const outflows = dayExpenditures ? Number(dayExpenditures.amount) || 0 : 0;

      let adjustedInflows = inflows;
      let adjustedOutflows = outflows;

      if (scenarioType === 'best') {
        adjustedInflows = inflows * 1.2;
        adjustedOutflows = outflows * 0.8;
      } else if (scenarioType === 'worst') {
        adjustedInflows = inflows * 0.8;
        adjustedOutflows = outflows * 1.2;
      }

      const closingBalance = currentBalance + adjustedInflows - adjustedOutflows;

      projections.push({
        date: dateStr,
        openingBalance: currentBalance,
        inflows: adjustedInflows,
        outflows: adjustedOutflows,
        closingBalance,
        minimumThreshold,
        isAboveThreshold: closingBalance >= minimumThreshold,
      });

      currentBalance = closingBalance;
    }

    return projections;
  }

  async generateScenarioAnalysis(
    bankAccountId: number,
    days: number = 30
  ): Promise<CashForecastScenario[]> {
    const scenarios: CashForecastScenario[] = [];

    for (const scenarioType of ['best', 'worst', 'expected'] as const) {
      const projections = await this.projectCashPosition(bankAccountId, days, scenarioType);

      const balances = projections.map(p => p.closingBalance);
      const minimumCash = Math.min(...balances);
      const maximumCash = Math.max(...balances);
      const averageCash = balances.reduce((a, b) => a + b, 0) / balances.length;
      const daysAboveThreshold = projections.filter(p => p.isAboveThreshold).length;

      scenarios.push({
        scenarioName: scenarioType,
        projections,
        minimumCash,
        maximumCash,
        averageCash,
        daysAboveThreshold,
      });
    }

    return scenarios;
  }

  async getCashPosition(bankAccountId: number): Promise<CashPosition> {
    const [bankAccount] = await this.db
      .select()
      .from(financeBankAccounts)
      .where(eq(financeBankAccounts.id, bankAccountId));

    const currentBalance = Number(bankAccount?.currentBalance) || 0;
    const minimumThreshold = 0; // No minimumBalance column
    const reservedBalance = 0; // No reservedAmount column
    const availableBalance = currentBalance - reservedBalance;

    const [dailyBurnResult] = await this.db
      .select({
        avgDailyBurn: sql<number>`AVG(${financeExpenditures.amount})`,
      })
      .from(financeExpenditures)
      .where(
        lte(
          financeExpenditures.expenditureDate,
          new Date().toISOString().split('T')[0]
        )
      );

    const avgDailyBurn = dailyBurnResult?.avgDailyBurn || 1;
    const daysOfCashOnHand = availableBalance / avgDailyBurn;

    return {
      bankAccountId,
      accountName: bankAccount?.accountName || '',
      currentBalance,
      availableBalance,
      reservedBalance,
      minimumThreshold,
      isAboveThreshold: currentBalance >= minimumThreshold,
      daysOfCashOnHand,
    };
  }

  async getLiquidityMetrics(organizationId: number): Promise<LiquidityMetrics> {
    const [cashResult] = await this.db
      .select({
        totalCash: sum(financeBankAccounts.currentBalance),
      })
      .from(financeBankAccounts)
      .where(eq(financeBankAccounts.organizationId, organizationId));

    const totalCash = Number(cashResult?.totalCash) || 0;

    const [receivablesResult] = await this.db
      .select({
        totalReceivables: sum(budgets.totalApprovedAmount)
      })
      .from(budgets)
      .where(
        and(
          eq(budgets.organizationId, organizationId),
          eq(budgets.status, 'approved')
        )
      );

    const totalReceivables = Number(receivablesResult?.totalReceivables) || 0;

    const [payablesResult] = await this.db
      .select({
        totalPayables: sum(payments.amount),
      })
      .from(payments)
      .where(
        and(
          eq(payments.organizationId, organizationId),
          eq(payments.status, 'approved')
        )
      );

    const totalPayables = Number(payablesResult?.totalPayables) || 0;

    const workingCapital = totalCash + totalReceivables - totalPayables;
    const currentRatio = totalReceivables > 0 ? (totalCash + totalReceivables) / totalPayables : 0;
    const quickRatio = totalCash / totalPayables;
    const cashConversionCycle = 30;

    return {
      totalCash,
      totalReceivables,
      totalPayables,
      workingCapital,
      currentRatio,
      quickRatio,
      cashConversionCycle,
    };
  }

  async identifyCashFlowGaps(
    bankAccountId: number,
    days: number = 30
  ): Promise<CashFlowGap[]> {
    const gaps: CashFlowGap[] = [];

    const projections = await this.projectCashPosition(bankAccountId, days, 'expected');

    for (const projection of projections) {
      if (!projection.isAboveThreshold) {
        const gap = projection.minimumThreshold - projection.closingBalance;
        let severity: 'critical' | 'warning' | 'normal' = 'normal';
        let recommendedAction = 'Monitor cash position';

        if (gap > projection.minimumThreshold * 0.5) {
          severity = 'critical';
          recommendedAction = 'Immediately arrange additional funding or defer payments';
        } else if (gap > projection.minimumThreshold * 0.2) {
          severity = 'warning';
          recommendedAction = 'Consider accelerating receivables or deferring non-critical payments';
        }

        gaps.push({
          gapId: `GAP-${bankAccountId}-${projection.date}`,
          date: projection.date,
          projectedBalance: projection.closingBalance,
          minimumThreshold: projection.minimumThreshold,
          gap,
          severity,
          recommendedAction,
        });
      }
    }

    return gaps;
  }

  async getCashFlowVariance(
    bankAccountId: number,
    days: number = 30
  ): Promise<{
    expectedCash: number;
    bestCaseCash: number;
    worstCaseCash: number;
    variance: number;
    riskLevel: 'low' | 'medium' | 'high';
  }> {
    const [expected, best, worst] = await Promise.all([
      this.projectCashPosition(bankAccountId, days, 'expected'),
      this.projectCashPosition(bankAccountId, days, 'best'),
      this.projectCashPosition(bankAccountId, days, 'worst'),
    ]);

    const expectedCash = expected[expected.length - 1]?.closingBalance || 0;
    const bestCaseCash = best[best.length - 1]?.closingBalance || 0;
    const worstCaseCash = worst[worst.length - 1]?.closingBalance || 0;

    const variance = bestCaseCash - worstCaseCash;
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    if (variance > expectedCash * 0.5) {
      riskLevel = 'high';
    } else if (variance > expectedCash * 0.2) {
      riskLevel = 'medium';
    }

    return {
      expectedCash,
      bestCaseCash,
      worstCaseCash,
      variance,
      riskLevel,
    };
  }
}

let cashForecastEngineInstance: CashForecastEngine | null = null;

export async function getCashForecastEngine(): Promise<CashForecastEngine> {
  if (!cashForecastEngineInstance) {
    const db = await getDb();
    cashForecastEngineInstance = new CashForecastEngine(db);
  }
  return cashForecastEngineInstance;
}

export const cashForecastEngine = {
  projectCashPosition: async (bankAccountId: number, days?: number, scenarioType?: 'best' | 'worst' | 'expected') => {
    const engine = await getCashForecastEngine();
    return engine.projectCashPosition(bankAccountId, days, scenarioType);
  },
  generateScenarioAnalysis: async (bankAccountId: number, days?: number) => {
    const engine = await getCashForecastEngine();
    return engine.generateScenarioAnalysis(bankAccountId, days);
  },
  getCashPosition: async (bankAccountId: number) => {
    const engine = await getCashForecastEngine();
    return engine.getCashPosition(bankAccountId);
  },
  getLiquidityMetrics: async (organizationId: number) => {
    const engine = await getCashForecastEngine();
    return engine.getLiquidityMetrics(organizationId);
  },
  identifyCashFlowGaps: async (bankAccountId: number, days?: number) => {
    const engine = await getCashForecastEngine();
    return engine.identifyCashFlowGaps(bankAccountId, days);
  },
  getCashFlowVariance: async (bankAccountId: number, days?: number) => {
    const engine = await getCashForecastEngine();
    return engine.getCashFlowVariance(bankAccountId, days);
  },
};
