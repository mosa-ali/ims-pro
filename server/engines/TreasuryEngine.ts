/**
 * server/engines/TreasuryEngine.ts
 *
 * Treasury Management Engine
 * Handles cash flow management, liquidity analysis, and payment scheduling.
 *
 * Responsibilities:
 * - Cash flow forecasting and analysis
 * - Liquidity position monitoring
 * - Payment scheduling and optimization
 * - Working capital management
 * - Bank account reconciliation
 * - Cash position reporting
 */

import { and, eq, sum, gte, lte, desc, sql } from 'drizzle-orm';
import type { DB } from '../db/_scope';
import {
  payments,
  financeExpenditures,
  financeBankAccounts,
  procurementPayables,
  projects,
} from '../../drizzle/schema';
import { getDb } from '../db';
import { nowSql } from '../db/_time';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CashFlowProjection {
  date: string;
  openingBalance: number;
  inflows: number;
  outflows: number;
  closingBalance: number;
}

export interface LiquidityPosition {
  totalCashOnHand: number;
  totalPayablesOutstanding: number;
  totalReceivablesOutstanding: number;
  netLiquidityPosition: number;
  liquidityRatio: number;
  workingCapital: number;
}

export interface PaymentSchedule {
  paymentId: number;
  payableId?: number;
  amount: number;
  dueDate: string;
  scheduledPaymentDate: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: string;
}

export interface CashFlowGap {
  date: string;
  projectedBalance: number;
  minimumRequired: number;
  gap: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface TreasuryDashboard {
  totalCash: number;
  totalPayables: number;
  totalReceivables: number;
  weeklyOutflow: number;
  monthlyOutflow: number;
  liquidityScore: number;
  criticalPayments: number;
  upcomingPayments: number;
}

// ── Treasury Engine ─────────────────────────────────────────────────────────

export class TreasuryEngine {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Get current liquidity position.
   */
  async getLiquidityPosition(organizationId: number): Promise<LiquidityPosition> {
    // Get total cash on hand
    const [cashResult] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${financeBankAccounts.currentBalance}), 0)`,
      })
      .from(financeBankAccounts)
      .where(eq(financeBankAccounts.organizationId, organizationId));

    const totalCashOnHand = cashResult?.total || 0;

    // Get outstanding payables
    const [payablesResult] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${procurementPayables.totalAmount}), 0)`,
      })
      .from(procurementPayables)
      .where(
        and(
          eq(procurementPayables.organizationId, organizationId),
          sql`${procurementPayables.status} IN ('pending_payment', 'partially_paid')`
        )
      );

    const totalPayablesOutstanding = payablesResult?.total || 0;

    // Get outstanding receivables (if applicable)
    const totalReceivablesOutstanding = 0; // Placeholder

    const netLiquidityPosition = totalCashOnHand - totalPayablesOutstanding;
    const liquidityRatio = totalPayablesOutstanding > 0
      ? totalCashOnHand / totalPayablesOutstanding
      : totalCashOnHand > 0 ? 1 : 0;
    const workingCapital = totalCashOnHand - totalPayablesOutstanding;

    return {
      totalCashOnHand,
      totalPayablesOutstanding,
      totalReceivablesOutstanding,
      netLiquidityPosition,
      liquidityRatio,
      workingCapital,
    };
  }

  /**
   * Project cash flow for the next N days.
   */
  async projectCashFlow(
    organizationId: number,
    startDate: Date | string,
    endDate: Date | string
  ): Promise<CashFlowProjection[]> {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

    // Get opening balance
    const [openingResult] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${financeBankAccounts.currentBalance}), 0)`,
      })
      .from(financeBankAccounts)
      .where(eq(financeBankAccounts.organizationId, organizationId));

    let currentBalance = openingResult?.total || 0;
    const projections: CashFlowProjection[] = [];

    // Generate daily projections
    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];

      // Get inflows for this date
      const [inflowsResult] = await this.db
        .select({
          total: sql<number>`COALESCE(SUM(${payments.amount}), 0)`,
        })
        .from(payments)
        .where(
          and(
            eq(payments.organizationId, organizationId),
            eq(payments.status, 'paid'),
            sql`DATE(${payments.paymentDate}) = ${dateStr}`
          )
        );

      const inflows = inflowsResult?.total || 0;

      // Get outflows for this date
      const [outflowsResult] = await this.db
        .select({
          total: sql<number>`COALESCE(SUM(${financeExpenditures.amount}), 0)`,
        })
        .from(financeExpenditures)
        .where(
          and(
            eq(financeExpenditures.organizationId, organizationId),
            eq(financeExpenditures.status, 'paid'),
            sql`DATE(${financeExpenditures.expenditureDate}) = ${dateStr}`
          )
        );

      const outflows = outflowsResult?.total || 0;
      const openingBalance = currentBalance;
      currentBalance = openingBalance + inflows - outflows;

      projections.push({
        date: dateStr,
        openingBalance,
        inflows,
        outflows,
        closingBalance: currentBalance,
      });

      current.setDate(current.getDate() + 1);
    }

    return projections;
  }

  /**
   * Generate payment schedule for upcoming obligations.
   */
  async generatePaymentSchedule(organizationId: number, daysAhead: number = 30): Promise<PaymentSchedule[]> {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const payables = await this.db
      .select({
        id: procurementPayables.id,
        amount: procurementPayables.totalAmount,
        dueDate: procurementPayables.dueDate,
        status: procurementPayables.status,
      })
      .from(procurementPayables)
      .where(
        and(
          eq(procurementPayables.organizationId, organizationId),
          sql`${procurementPayables.status} IN ('pending_payment', 'partially_paid')`,
          gte(procurementPayables.dueDate, today),
          lte(procurementPayables.dueDate, futureDate)
        )
      )
      .orderBy(procurementPayables.dueDate);

    return payables.map((p: any) => ({
      paymentId: p.id,
      payableId: p.id,
      amount: p.amount || 0,
      dueDate: p.dueDate?.toISOString().split('T')[0] || '',
      scheduledPaymentDate: new Date(p.dueDate).toISOString().split('T')[0],
      priority: this.calculatePaymentPriority(p.dueDate),
      status: p.status,
    }));
  }

  /**
   * Identify cash flow gaps where balance drops below minimum.
   */
  async identifyCashFlowGaps(
    organizationId: number,
    minimumBalance: number = 10000,
    daysAhead: number = 30
  ): Promise<CashFlowGap[]> {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + daysAhead);

    const projections = await this.projectCashFlow(organizationId, today, endDate);
    const gaps: CashFlowGap[] = [];

    for (const proj of projections) {
      if (proj.closingBalance < minimumBalance) {
        const gap = minimumBalance - proj.closingBalance;
        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        if (gap > minimumBalance * 0.5) {
          riskLevel = 'high';
        } else if (gap > minimumBalance * 0.2) {
          riskLevel = 'medium';
        }

        gaps.push({
          date: proj.date,
          projectedBalance: proj.closingBalance,
          minimumRequired: minimumBalance,
          gap,
          riskLevel,
        });
      }
    }

    return gaps;
  }

  /**
   * Get treasury dashboard data.
   */
  async getTreasuryDashboard(organizationId: number): Promise<TreasuryDashboard> {
    const liquidity = await this.getLiquidityPosition(organizationId);

    // Get weekly and monthly outflows
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);

    const [weeklyResult] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${financeExpenditures.amount}), 0)`,
      })
      .from(financeExpenditures)
      .where(
        and(
          eq(financeExpenditures.organizationId, organizationId),
          eq(financeExpenditures.status, 'paid'),
          gte(financeExpenditures.expenditureDate, weekAgo)
        )
      );

    const [monthlyResult] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${financeExpenditures.amount}), 0)`,
      })
      .from(financeExpenditures)
      .where(
        and(
          eq(financeExpenditures.organizationId, organizationId),
          eq(financeExpenditures.status, 'paid'),
          gte(financeExpenditures.expenditureDate, monthAgo)
        )
      );

    const weeklyOutflow = weeklyResult?.total || 0;
    const monthlyOutflow = monthlyResult?.total || 0;

    // Get upcoming critical payments
    const schedule = await this.generatePaymentSchedule(organizationId, 7);
    const criticalPayments = schedule.filter(p => p.priority === 'critical').length;
    const upcomingPayments = schedule.length;

    // Calculate liquidity score (0-100)
    let liquidityScore = 100;
    if (liquidity.liquidityRatio < 0.5) liquidityScore -= 40;
    else if (liquidity.liquidityRatio < 1) liquidityScore -= 20;
    if (liquidity.netLiquidityPosition < 0) liquidityScore -= 30;

    return {
      totalCash: liquidity.totalCashOnHand,
      totalPayables: liquidity.totalPayablesOutstanding,
      totalReceivables: liquidity.totalReceivablesOutstanding,
      weeklyOutflow,
      monthlyOutflow,
      liquidityScore: Math.max(0, liquidityScore),
      criticalPayments,
      upcomingPayments,
    };
  }

  /**
   * Calculate payment priority based on due date.
   */
  private calculatePaymentPriority(dueDate: Date | string | null): 'critical' | 'high' | 'medium' | 'low' {
    if (!dueDate) return 'low';

    const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
    const today = new Date();
    const daysUntilDue = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue <= 0) return 'critical';
    if (daysUntilDue <= 3) return 'high';
    if (daysUntilDue <= 7) return 'medium';
    return 'low';
  }

  /**
   * Get working capital analysis.
   */
  async getWorkingCapitalAnalysis(organizationId: number) {
    const liquidity = await this.getLiquidityPosition(organizationId);
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [historicalResult] = await this.db
      .select({
        avgDailySpend: sql<number>`COALESCE(AVG(daily_spend), 0)`,
      })
      .from(
        sql`(
          SELECT DATE(${financeExpenditures.expenditureDate}) as spend_date, SUM(${financeExpenditures.amount}) as daily_spend
          FROM ${financeExpenditures}
          WHERE ${financeExpenditures.organizationId} = ${organizationId}
            AND ${financeExpenditures.status} = 'paid'
            AND ${financeExpenditures.expenditureDate} >= ${thirtyDaysAgo}
          GROUP BY DATE(${financeExpenditures.expenditureDate})
        ) as daily_spends`
      );

    const avgDailySpend = historicalResult?.avgDailySpend || 0;
    const daysOfCashOnHand = avgDailySpend > 0 ? liquidity.totalCashOnHand / avgDailySpend : 0;

    return {
      workingCapital: liquidity.workingCapital,
      currentRatio: liquidity.liquidityRatio,
      daysOfCashOnHand: Math.round(daysOfCashOnHand),
      avgDailySpend,
      recommendation: this.getWorkingCapitalRecommendation(daysOfCashOnHand),
    };
  }

  /**
   * Get working capital recommendation.
   */
  private getWorkingCapitalRecommendation(daysOfCash: number): string {
    if (daysOfCash < 7) return 'Critical: Immediate action needed to improve cash position';
    if (daysOfCash < 14) return 'Warning: Cash position is tight, consider accelerating receivables';
    if (daysOfCash < 30) return 'Caution: Maintain focus on cash management';
    return 'Healthy: Cash position is adequate';
  }
}

// ── Singleton Instance ──────────────────────────────────────────────────────

let treasuryEngineInstance: TreasuryEngine | null = null;

export async function getTreasuryEngine(): Promise<TreasuryEngine> {
  if (!treasuryEngineInstance) {
    const db = await getDb();
    treasuryEngineInstance = new TreasuryEngine(db);
  }
  return treasuryEngineInstance;
}

export const treasuryEngine = {
  getLiquidityPosition: async (orgId: number) => {
    const engine = await getTreasuryEngine();
    return engine.getLiquidityPosition(orgId);
  },
  projectCashFlow: async (orgId: number, start: Date | string, end: Date | string) => {
    const engine = await getTreasuryEngine();
    return engine.projectCashFlow(orgId, start, end);
  },
  generatePaymentSchedule: async (orgId: number, daysAhead?: number) => {
    const engine = await getTreasuryEngine();
    return engine.generatePaymentSchedule(orgId, daysAhead);
  },
  identifyCashFlowGaps: async (orgId: number, minBalance?: number, daysAhead?: number) => {
    const engine = await getTreasuryEngine();
    return engine.identifyCashFlowGaps(orgId, minBalance, daysAhead);
  },
  getTreasuryDashboard: async (orgId: number) => {
    const engine = await getTreasuryEngine();
    return engine.getTreasuryDashboard(orgId);
  },
  getWorkingCapitalAnalysis: async (orgId: number) => {
    const engine = await getTreasuryEngine();
    return engine.getWorkingCapitalAnalysis(orgId);
  },
};
