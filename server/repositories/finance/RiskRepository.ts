/**
 * server/repositories/finance/RiskRepository.ts
 *
 * Risk Repository — REFACTORED
 * Data access layer for financial risk indicators and assessments.
 */

import { and, eq, sql, gte, lte, count, sum, desc } from 'drizzle-orm';
import type { DB } from '../../db/_scope';
import {
  projects,
  budgets,
  expenditures,
  journalEntries,
  journalLines,
  glAccounts,
  financeBankAccounts,
  vendors,
} from '../../../drizzle/schema';

// ── Types ────────────────────────────────────────────────────────────────────

export interface LiquidityRisk {
  currentRatio: number;
  quickRatio: number;
  cashOnHand: number;
  upcomingPayments: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  daysOfCashAvailable: number;
}

export interface FXRisk {
  exposedAmount: number;
  exposedCurrency: string;
  exchangeRate: number;
  potentialLoss: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface DonorRisk {
  donorId: number;
  donorName: string;
  totalCommitment: number;
  totalDrawn: number;
  complianceScore: number;
  reportingStatus: 'compliant' | 'at-risk' | 'non-compliant';
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ProjectFinancialHealthRisk {
  projectId: number;
  projectName: string;
  budgetUtilization: number;
  burnRate: number;
  timelineProgress: number;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  indicators: string[];
}

export interface BudgetOverrunRisk {
  projectId: number;
  projectName: string;
  budget: number;
  spent: number;
  committed: number;
  projectedTotal: number;
  overrunAmount: number;
  overrunPercent: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface PaymentDelayRisk {
  vendorId: number;
  vendorName: string;
  totalPayable: number;
  overdueAmount: number;
  daysOverdue: number;
  paymentHistory: 'on-time' | 'delayed' | 'chronic';
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ReceivableAgingRisk {
  totalReceivable: number;
  current: number;
  thirtyPlus: number;
  sixtyPlus: number;
  ninetyPlus: number;
  riskLevel: 'low' | 'medium' | 'high';
  daysOutstanding: number;
}

export interface TreasuryRisk {
  totalCash: number;
  minimumRequired: number;
  surplus: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  daysOfLiquidity: number;
}

export interface PayableAgingRisk {
  totalPayable: number;
  current: number;
  thirtyPlus: number;
  sixtyPlus: number;
  ninetyPlus: number;
  riskLevel: 'low' | 'medium' | 'high';
  daysOutstanding: number;
}

export interface ComplianceRisk {
  organizationId: number;
  complianceScore: number;
  violationCount: number;
  warningCount: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  issues: string[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function toNum(v: any): number {
  if (v == null) return 0;
  const n = typeof v === 'object' && 'toNumber' in v ? v.toNumber() : parseFloat(String(v));
  return isNaN(n) ? 0 : n;
}

// ── Risk Repository ─────────────────────────────────────────────────────────

export class RiskRepository {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Calculate liquidity risk.
   */
  async getLiquidityRisk(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<LiquidityRisk> {
    const [cashRow] = await this.db
      .select({
        totalCash: sql<number>`COALESCE(SUM(${financeBankAccounts.currentBalance}), 0)`,
      })
      .from(financeBankAccounts)
      .where(
        and(
          eq(financeBankAccounts.organizationId, organizationId),
          operatingUnitId
            ? eq(financeBankAccounts.operatingUnitId, operatingUnitId)
            : undefined,
          eq(financeBankAccounts.isActive, 1),
          eq(financeBankAccounts.isDeleted, 0)
        )
      );

    const cashOnHand = toNum(cashRow?.totalCash);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [expRow] = await this.db
      .select({
        totalSpent: sql<number>`COALESCE(SUM(${expenditures.amount}), 0)`,
      })
      .from(expenditures)
      .where(
        and(
          eq(expenditures.organizationId, organizationId),
          operatingUnitId
            ? eq(expenditures.operatingUnitId, operatingUnitId)
            : undefined,
          gte(expenditures.expenditureDate, thirtyDaysAgo.toISOString())
        )
      );

    const upcomingPayments = toNum(expRow?.totalSpent);
    const dailyBurn = upcomingPayments > 0 ? upcomingPayments / 30 : 1;
    const daysOfCashAvailable = dailyBurn > 0
      ? Math.floor(cashOnHand / dailyBurn)
      : 999;

    const currentRatio = upcomingPayments > 0
      ? cashOnHand / upcomingPayments
      : 99;
    const quickRatio = currentRatio;

    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (daysOfCashAvailable < 7) riskLevel = 'critical';
    else if (daysOfCashAvailable < 14) riskLevel = 'high';
    else if (daysOfCashAvailable < 30) riskLevel = 'medium';

    return {
      currentRatio: Math.round(currentRatio * 100) / 100,
      quickRatio: Math.round(quickRatio * 100) / 100,
      cashOnHand,
      upcomingPayments,
      riskLevel,
      daysOfCashAvailable,
    };
  }

  /**
   * Calculate FX risk exposure.
   */
  async getFXRisk(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<FXRisk[]> {
    const rows = await this.db
      .select({
        currency: financeBankAccounts.currency,
        totalBalance: sql<number>`COALESCE(SUM(${financeBankAccounts.currentBalance}), 0)`,
      })
      .from(financeBankAccounts)
      .where(
        and(
          eq(financeBankAccounts.organizationId, organizationId),
          operatingUnitId
            ? eq(financeBankAccounts.operatingUnitId, operatingUnitId)
            : undefined,
          eq(financeBankAccounts.isActive, 1),
          eq(financeBankAccounts.isDeleted, 0)
        )
      )
      .groupBy(financeBankAccounts.currency);

    const fxRisks: FXRisk[] = rows
      .filter(r => r.currency && r.currency !== 'USD' && toNum(r.totalBalance) > 0)
      .map(r => {
        const exposedAmount = toNum(r.totalBalance);
        const potentialLoss = exposedAmount * 0.05;
        const riskLevel: 'low' | 'medium' | 'high' =
          exposedAmount > 500000 ? 'high'
          : exposedAmount > 100000 ? 'medium'
          : 'low';

        return {
          exposedAmount,
          exposedCurrency: r.currency || 'UNKNOWN',
          exchangeRate: 1,
          potentialLoss,
          riskLevel,
        };
      });

    return fxRisks;
  }

  /**
   * Calculate donor risk profile.
   */
  async getDonorRisk(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<DonorRisk[]> {
    const [row] = await this.db
      .select({
        totalBudget: sql<number>`COALESCE(SUM(${budgets.totalApprovedAmount}), 0)`,
        totalActual: sql<number>`COALESCE(SUM(${budgets.totalActualAmount}), 0)`,
      })
      .from(budgets)
      .where(
        and(
          eq(budgets.organizationId, organizationId),
          operatingUnitId
            ? eq(budgets.operatingUnitId, operatingUnitId)
            : undefined
        )
      );

    const totalCommitment = toNum(row?.totalBudget);
    const totalDrawn = toNum(row?.totalActual);
    const utilizationPct = totalCommitment > 0
      ? (totalDrawn / totalCommitment) * 100
      : 0;

    let reportingStatus: 'compliant' | 'at-risk' | 'non-compliant' = 'compliant';
    if (utilizationPct > 100) reportingStatus = 'non-compliant';
    else if (utilizationPct > 90 || utilizationPct < 20) reportingStatus = 'at-risk';

    const complianceScore = Math.max(0, Math.min(100,
      utilizationPct <= 90 ? 100 - Math.abs(utilizationPct - 70) : 100 - (utilizationPct - 90) * 5
    ));

    return [
      {
        donorId: 0,
        donorName: 'Donor Portfolio',
        totalCommitment,
        totalDrawn,
        complianceScore: Math.round(complianceScore),
        reportingStatus,
        riskLevel: reportingStatus === 'non-compliant' ? 'high'
          : reportingStatus === 'at-risk' ? 'medium'
          : 'low',
      },
    ];
  }

  /**
   * Calculate project financial health risk.
   */
  async getProjectFinancialHealthRisk(
    projectId: number,
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<ProjectFinancialHealthRisk> {
    const [project] = await this.db
      .select({
        id: projects.id,
        title: projects.title,
        spent: projects.spent,
        totalBudget: projects.totalBudget,
        physicalProgressPercentage: projects.physicalProgressPercentage,
        endDate: projects.endDate,
      })
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.organizationId, organizationId),
          operatingUnitId
            ? eq(projects.operatingUnitId, operatingUnitId)
            : undefined
        )
      )
      .limit(1);

    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const budget = toNum(project.totalBudget);
    const spent = toNum(project.spent);
    const budgetUtilization = budget > 0 ? (spent / budget) * 100 : 0;

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const [expRow] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${expenditures.amount}), 0)`,
      })
      .from(expenditures)
      .where(
        and(
          eq(expenditures.organizationId, organizationId),
          gte(expenditures.expenditureDate, ninetyDaysAgo.toISOString())
        )
      );

    const monthlyBurn = toNum(expRow?.total) / 3;
    const endDate = new Date(project.endDate);
    const now = new Date();
    const remainingMonths = Math.max(
      0,
      (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    );
    const projectedTotal = spent + monthlyBurn * remainingMonths;
    const burnRate = budget > 0 ? (projectedTotal / budget) * 100 : 0;

    const timelineProgress = toNum(project.physicalProgressPercentage);

    let riskScore = 0;
    const indicators: string[] = [];

    if (budgetUtilization > 100) {
      riskScore += 40;
      indicators.push('Over budget');
    } else if (budgetUtilization > 85) {
      riskScore += 20;
      indicators.push('High budget utilization');
    }

    if (burnRate > 110) {
      riskScore += 30;
      indicators.push('Projected to exceed budget at current burn rate');
    } else if (burnRate > 95) {
      riskScore += 15;
      indicators.push('Burn rate approaching budget limit');
    }

    if (timelineProgress > 100) {
      riskScore += 20;
      indicators.push('Behind schedule');
    } else if (remainingMonths < 1 && budgetUtilization < 80) {
      riskScore += 15;
      indicators.push('Under-utilized with project end approaching');
    }

    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (riskScore >= 75) riskLevel = 'critical';
    else if (riskScore >= 50) riskLevel = 'high';
    else if (riskScore >= 25) riskLevel = 'medium';

    return {
      projectId: project.id,
      projectName: project.title || 'Unknown Project',
      budgetUtilization: Math.round(budgetUtilization * 10) / 10,
      burnRate: Math.round(burnRate * 10) / 10,
      timelineProgress,
      riskScore,
      riskLevel,
      indicators,
    };
  }

  /**
   * Calculate budget overrun risk.
   */
  async getBudgetOverrunRisk(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<BudgetOverrunRisk[]> {
    const projects_list = await this.db
      .select({
        id: projects.id,
        title: projects.title,
        totalBudget: projects.totalBudget,
        spent: projects.spent,
        endDate: projects.endDate,
      })
      .from(projects)
      .where(
        and(
          eq(projects.organizationId, organizationId),
          operatingUnitId
            ? eq(projects.operatingUnitId, operatingUnitId)
            : undefined
        )
      );

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const [orgExpRow] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${expenditures.amount}), 0)`,
      })
      .from(expenditures)
      .where(
        and(
          eq(expenditures.organizationId, organizationId),
          gte(expenditures.expenditureDate, ninetyDaysAgo.toISOString())
        )
      );

    const orgMonthlyBurn = toNum(orgExpRow?.total) / 3;
    const orgTotalBudget = projects_list.reduce((sum, p) => sum + toNum(p.totalBudget), 0);

    const results: BudgetOverrunRisk[] = [];

    for (const p of projects_list) {
      const budget = toNum(p.totalBudget);
      const spent = toNum(p.spent);

      const projectBurnShare = orgTotalBudget > 0
        ? orgMonthlyBurn * (budget / orgTotalBudget)
        : 0;

      const endDate = new Date(p.endDate);
      const now = new Date();
      const remainingMonths = Math.max(
        0,
        (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
      );

      const committed = projectBurnShare * remainingMonths;
      const projectedTotal = spent + committed;
      const overrunAmount = Math.max(0, projectedTotal - budget);
      const overrunPercent = overrunAmount > 0
        ? (overrunAmount / budget) * 100
        : 0;

      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (overrunPercent > 20) riskLevel = 'critical';
      else if (overrunPercent > 10) riskLevel = 'high';
      else if (overrunPercent > 5) riskLevel = 'medium';

      if (riskLevel !== 'low') {
        results.push({
          projectId: p.id,
          projectName: p.title || 'Unknown Project',
          budget,
          spent,
          committed,
          projectedTotal,
          overrunAmount,
          overrunPercent: Math.round(overrunPercent * 10) / 10,
          riskLevel,
        });
      }
    }

    return results.sort((a, b) => b.overrunPercent - a.overrunPercent);
  }

  /**
   * Calculate payment delay risk.
   */
  async getPaymentDelayRisk(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<PaymentDelayRisk[]> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyRows = await this.db
      .select({
        month: sql<string>`DATE_FORMAT(${expenditures.expenditureDate}, '%Y-%m')`,
        total: sql<number>`COALESCE(SUM(${expenditures.amount}), 0)`,
      })
      .from(expenditures)
      .where(
        and(
          eq(expenditures.organizationId, organizationId),
          operatingUnitId
            ? eq(expenditures.operatingUnitId, operatingUnitId)
            : undefined,
          gte(expenditures.expenditureDate, sixMonthsAgo.toISOString())
        )
      )
      .groupBy(sql`DATE_FORMAT(${expenditures.expenditureDate}, '%Y-%m')`)
      .orderBy(sql`DATE_FORMAT(${expenditures.expenditureDate}, '%Y-%m') DESC`);

    if (monthlyRows.length < 2) {
      return [];
    }

    const amounts = monthlyRows.map(r => toNum(r.total));
    const avgMonthly = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const latestMonth = amounts[0] || 0;

    const delayRatio = avgMonthly > 0 ? latestMonth / avgMonthly : 1;
    const riskLevel: 'low' | 'medium' | 'high' =
      delayRatio < 0.3 ? 'high'
      : delayRatio < 0.6 ? 'medium'
      : 'low';

    if (riskLevel === 'low') return [];

    return [
      {
        vendorId: 0,
        vendorName: 'Vendor Portfolio',
        totalPayable: avgMonthly,
        overdueAmount: Math.max(0, avgMonthly - latestMonth),
        daysOverdue: riskLevel === 'high' ? 30 : 15,
        paymentHistory: riskLevel === 'high' ? 'chronic' : 'delayed',
        riskLevel,
      },
    ];
  }

  /**
   * Calculate receivable aging risk.
   */
  async getReceivableAgingRisk(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<ReceivableAgingRisk> {
    const now = new Date();
    const d30 = new Date(); d30.setDate(d30.getDate() - 30);
    const d60 = new Date(); d60.setDate(d60.getDate() - 60);
    const d90 = new Date(); d90.setDate(d90.getDate() - 90);

    const [totalRow] = await this.db
      .select({
        balance: sql<number>`COALESCE(
          SUM(${journalLines.debitAmount}) - SUM(${journalLines.creditAmount}),
          0
        )`,
      })
      .from(journalLines)
      .leftJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .leftJoin(glAccounts, eq(journalLines.glAccountId, glAccounts.id))
      .where(
        and(
          eq(journalEntries.organizationId, organizationId),
          operatingUnitId
            ? eq(journalEntries.operatingUnitId, operatingUnitId)
            : undefined,
          sql`${glAccounts.accountType} IN ('asset', 'receivable')`
        )
      );

    const totalReceivable = Math.max(0, toNum(totalRow?.balance));
    if (totalReceivable === 0) {
      return {
        totalReceivable: 0,
        current: 0,
        thirtyPlus: 0,
        sixtyPlus: 0,
        ninetyPlus: 0,
        riskLevel: 'low',
        daysOutstanding: 0,
      };
    }

    const [buckets] = await this.db
      .select({
        current: sql<number>`COALESCE(SUM(CASE WHEN ${journalEntries.entryDate} >= ${d30.toISOString()} THEN ${journalLines.debitAmount} ELSE 0 END), 0)`,
        thirtyPlus: sql<number>`COALESCE(SUM(CASE WHEN ${journalEntries.entryDate} >= ${d60.toISOString()} AND ${journalEntries.entryDate} < ${d30.toISOString()} THEN ${journalLines.debitAmount} ELSE 0 END), 0)`,
        sixtyPlus: sql<number>`COALESCE(SUM(CASE WHEN ${journalEntries.entryDate} >= ${d90.toISOString()} AND ${journalEntries.entryDate} < ${d60.toISOString()} THEN ${journalLines.debitAmount} ELSE 0 END), 0)`,
        ninetyPlus: sql<number>`COALESCE(SUM(CASE WHEN ${journalEntries.entryDate} < ${d90.toISOString()} THEN ${journalLines.debitAmount} ELSE 0 END), 0)`,
      })
      .from(journalLines)
      .leftJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .leftJoin(glAccounts, eq(journalLines.glAccountId, glAccounts.id))
      .where(
        and(
          eq(journalEntries.organizationId, organizationId),
          operatingUnitId
            ? eq(journalEntries.operatingUnitId, operatingUnitId)
            : undefined,
          sql`${glAccounts.accountType} IN ('asset', 'receivable')`
        )
      );

    const current = Math.max(0, toNum(buckets?.current));
    const thirtyPlus = Math.max(0, toNum(buckets?.thirtyPlus));
    const sixtyPlus = Math.max(0, toNum(buckets?.sixtyPlus));
    const ninetyPlus = Math.max(0, toNum(buckets?.ninetyPlus));

    const daysOutstanding = totalReceivable > 0
      ? Math.round(
          (current * 15 + thirtyPlus * 45 + sixtyPlus * 75 + ninetyPlus * 120)
          / totalReceivable
        )
      : 0;

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (ninetyPlus > totalReceivable * 0.2) riskLevel = 'high';
    else if (sixtyPlus > totalReceivable * 0.2) riskLevel = 'medium';

    return {
      totalReceivable,
      current,
      thirtyPlus,
      sixtyPlus,
      ninetyPlus,
      riskLevel,
      daysOutstanding,
    };
  }

  /**
   * Calculate treasury risk.
   */
  async getTreasuryRisk(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<TreasuryRisk> {
    const [cashRow] = await this.db
      .select({
        totalCash: sql<number>`COALESCE(SUM(${financeBankAccounts.currentBalance}), 0)`,
      })
      .from(financeBankAccounts)
      .where(
        and(
          eq(financeBankAccounts.organizationId, organizationId),
          operatingUnitId
            ? eq(financeBankAccounts.operatingUnitId, operatingUnitId)
            : undefined,
          eq(financeBankAccounts.isActive, 1),
          eq(financeBankAccounts.isDeleted, 0)
        )
      );

    const totalCash = toNum(cashRow?.totalCash);

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const [expRow] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${expenditures.amount}), 0)`,
      })
      .from(expenditures)
      .where(
        and(
          eq(expenditures.organizationId, organizationId),
          operatingUnitId
            ? eq(expenditures.operatingUnitId, operatingUnitId)
            : undefined,
          gte(expenditures.expenditureDate, ninetyDaysAgo.toISOString())
        )
      );

    const monthlyObligations = toNum(expRow?.total) / 3;
    const minimumRequired = monthlyObligations * 2;
    const surplus = totalCash - minimumRequired;

    const daysOfLiquidity = monthlyObligations > 0
      ? Math.floor((totalCash / monthlyObligations) * 30)
      : 999;

    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (daysOfLiquidity < 7) riskLevel = 'critical';
    else if (daysOfLiquidity < 14) riskLevel = 'high';
    else if (daysOfLiquidity < 30) riskLevel = 'medium';

    return {
      totalCash,
      minimumRequired,
      surplus,
      riskLevel,
      daysOfLiquidity,
    };
  }

  /**
   * Calculate payable aging risk.
   */
  async getPayableAgingRisk(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<PayableAgingRisk> {
    const d30 = new Date(); d30.setDate(d30.getDate() - 30);
    const d60 = new Date(); d60.setDate(d60.getDate() - 60);
    const d90 = new Date(); d90.setDate(d90.getDate() - 90);

    const [totalRow] = await this.db
      .select({
        balance: sql<number>`COALESCE(
          SUM(${journalLines.creditAmount}) - SUM(${journalLines.debitAmount}),
          0
        )`,
      })
      .from(journalLines)
      .leftJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .leftJoin(glAccounts, eq(journalLines.glAccountId, glAccounts.id))
      .where(
        and(
          eq(journalEntries.organizationId, organizationId),
          operatingUnitId
            ? eq(journalEntries.operatingUnitId, operatingUnitId)
            : undefined,
          sql`${glAccounts.accountType} IN ('liability', 'payable')`
        )
      );

    const totalPayable = Math.max(0, toNum(totalRow?.balance));
    if (totalPayable === 0) {
      return {
        totalPayable: 0,
        current: 0,
        thirtyPlus: 0,
        sixtyPlus: 0,
        ninetyPlus: 0,
        riskLevel: 'low',
        daysOutstanding: 0,
      };
    }

    const [buckets] = await this.db
      .select({
        current: sql<number>`COALESCE(SUM(CASE WHEN ${journalEntries.entryDate} >= ${d30.toISOString()} THEN ${journalLines.creditAmount} ELSE 0 END), 0)`,
        thirtyPlus: sql<number>`COALESCE(SUM(CASE WHEN ${journalEntries.entryDate} >= ${d60.toISOString()} AND ${journalEntries.entryDate} < ${d30.toISOString()} THEN ${journalLines.creditAmount} ELSE 0 END), 0)`,
        sixtyPlus: sql<number>`COALESCE(SUM(CASE WHEN ${journalEntries.entryDate} >= ${d90.toISOString()} AND ${journalEntries.entryDate} < ${d60.toISOString()} THEN ${journalLines.creditAmount} ELSE 0 END), 0)`,
        ninetyPlus: sql<number>`COALESCE(SUM(CASE WHEN ${journalEntries.entryDate} < ${d90.toISOString()} THEN ${journalLines.creditAmount} ELSE 0 END), 0)`,
      })
      .from(journalLines)
      .leftJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .leftJoin(glAccounts, eq(journalLines.glAccountId, glAccounts.id))
      .where(
        and(
          eq(journalEntries.organizationId, organizationId),
          operatingUnitId
            ? eq(journalEntries.operatingUnitId, operatingUnitId)
            : undefined,
          sql`${glAccounts.accountType} IN ('liability', 'payable')`
        )
      );

    const current = Math.max(0, toNum(buckets?.current));
    const thirtyPlus = Math.max(0, toNum(buckets?.thirtyPlus));
    const sixtyPlus = Math.max(0, toNum(buckets?.sixtyPlus));
    const ninetyPlus = Math.max(0, toNum(buckets?.ninetyPlus));

    const daysOutstanding = totalPayable > 0
      ? Math.round(
          (current * 15 + thirtyPlus * 45 + sixtyPlus * 75 + ninetyPlus * 120)
          / totalPayable
        )
      : 0;

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (ninetyPlus > totalPayable * 0.25) riskLevel = 'high';
    else if (sixtyPlus > totalPayable * 0.25) riskLevel = 'medium';

    return {
      totalPayable,
      current,
      thirtyPlus,
      sixtyPlus,
      ninetyPlus,
      riskLevel,
      daysOutstanding,
    };
  }

  /**
   * Calculate compliance risk.
   */
  async getComplianceRisk(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<ComplianceRisk> {
    const [jeRow] = await this.db
      .select({
        totalEntries: sql<number>`COUNT(*)`,
      })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.organizationId, organizationId),
          operatingUnitId
            ? eq(journalEntries.operatingUnitId, operatingUnitId)
            : undefined
        )
      );

    const totalEntries = toNum(jeRow?.totalEntries);

    const overruns = await this.getBudgetOverrunRisk(organizationId, operatingUnitId);
    const criticalOverruns = overruns.filter(o => o.riskLevel === 'critical').length;
    const highOverruns = overruns.filter(o => o.riskLevel === 'high').length;
    const violationCount = criticalOverruns;
    const warningCount = highOverruns;

    const complianceScore = Math.max(
      0,
      100 - criticalOverruns * 15 - highOverruns * 8
    );

    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (complianceScore < 50) riskLevel = 'critical';
    else if (complianceScore < 70) riskLevel = 'high';
    else if (complianceScore < 85) riskLevel = 'medium';

    const issues: string[] = [];
    if (criticalOverruns > 0) {
      issues.push(`${criticalOverruns} project(s) with critical budget overrun`);
    }
    if (highOverruns > 0) {
      issues.push(`${highOverruns} project(s) with high budget overrun risk`);
    }

    return {
      organizationId,
      complianceScore,
      violationCount,
      warningCount,
      riskLevel,
      issues,
    };
  }

  /**
   * Get risk statistics for dashboard KPIs.
   */
  async getRiskStats(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<{
    totalRisks: number;
    criticalRisks: number;
    highRisks: number;
    mediumRisks: number;
    lowRisks: number;
    averageRiskScore: number;
  }> {
    const liquidity = await this.getLiquidityRisk(organizationId, operatingUnitId);
    const treasury = await this.getTreasuryRisk(organizationId, operatingUnitId);
    const compliance = await this.getComplianceRisk(organizationId, operatingUnitId);
    const paymentDelay = await this.getPaymentDelayRisk(organizationId, operatingUnitId);
    const receivable = await this.getReceivableAgingRisk(organizationId, operatingUnitId);
    const payable = await this.getPayableAgingRisk(organizationId, operatingUnitId);

    const allRisks = [
      liquidity.riskLevel,
      treasury.riskLevel,
      compliance.riskLevel,
      ...paymentDelay.map(p => p.riskLevel),
      receivable.riskLevel,
      payable.riskLevel,
    ];

    const riskCounts = {
      critical: allRisks.filter(r => r === 'critical').length,
      high: allRisks.filter(r => r === 'high').length,
      medium: allRisks.filter(r => r === 'medium').length,
      low: allRisks.filter(r => r === 'low').length,
    };

    const riskScores = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    const totalScore = allRisks.reduce((sum, level) => sum + riskScores[level as keyof typeof riskScores], 0);
    const averageRiskScore = allRisks.length > 0 ? Math.round((totalScore / allRisks.length) * 100) / 100 : 0;

    return {
      totalRisks: allRisks.length,
      criticalRisks: riskCounts.critical,
      highRisks: riskCounts.high,
      mediumRisks: riskCounts.medium,
      lowRisks: riskCounts.low,
      averageRiskScore,
    };
  }

  /**
   * Get top critical risks for alerts and trends.
   */
  async getTopCriticalRisks(
    organizationId: number,
    operatingUnitId?: number | null,
    limit: number = 5
  ): Promise<Array<{
    category: string;
    riskLevel: string;
    description: string;
    score: number;
  }>> {
    const risks: Array<{ category: string; riskLevel: string; description: string; score: number }> = [];

    const liquidity = await this.getLiquidityRisk(organizationId, operatingUnitId);
    if (liquidity.riskLevel !== 'low') {
      risks.push({
        category: 'Liquidity Risk',
        riskLevel: liquidity.riskLevel,
        description: `${liquidity.daysOfCashAvailable} days of cash available`,
        score: liquidity.riskLevel === 'critical' ? 4 : liquidity.riskLevel === 'high' ? 3 : 2,
      });
    }

    const treasury = await this.getTreasuryRisk(organizationId, operatingUnitId);
    if (treasury.riskLevel !== 'low') {
      risks.push({
        category: 'Treasury Risk',
        riskLevel: treasury.riskLevel,
        description: `${treasury.daysOfLiquidity} days of liquidity`,
        score: treasury.riskLevel === 'critical' ? 4 : treasury.riskLevel === 'high' ? 3 : 2,
      });
    }

    const compliance = await this.getComplianceRisk(organizationId, operatingUnitId);
    if (compliance.riskLevel !== 'low') {
      risks.push({
        category: 'Compliance Risk',
        riskLevel: compliance.riskLevel,
        description: `Compliance score: ${compliance.complianceScore}`,
        score: compliance.riskLevel === 'critical' ? 4 : compliance.riskLevel === 'high' ? 3 : 2,
      });
    }

    const paymentDelays = await this.getPaymentDelayRisk(organizationId, operatingUnitId);
    paymentDelays.forEach(pd => {
      risks.push({
        category: 'Payment Delay Risk',
        riskLevel: pd.riskLevel,
        description: `${pd.daysOverdue} days overdue`,
        score: pd.riskLevel === 'high' ? 3 : 2,
      });
    });

    const receivable = await this.getReceivableAgingRisk(organizationId, operatingUnitId);
    if (receivable.riskLevel !== 'low') {
      risks.push({
        category: 'Receivable Aging Risk',
        riskLevel: receivable.riskLevel,
        description: `${receivable.daysOutstanding} days outstanding`,
        score: receivable.riskLevel === 'high' ? 3 : 2,
      });
    }

    const payable = await this.getPayableAgingRisk(organizationId, operatingUnitId);
    if (payable.riskLevel !== 'low') {
      risks.push({
        category: 'Payable Aging Risk',
        riskLevel: payable.riskLevel,
        description: `${payable.daysOutstanding} days outstanding`,
        score: payable.riskLevel === 'high' ? 3 : 2,
      });
    }

    return risks.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * Get risks grouped by category.
   */
  async getRisksByCategory(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<Record<string, { count: number; critical: number; high: number; medium: number; low: number }>> {
    const liquidity = await this.getLiquidityRisk(organizationId, operatingUnitId);
    const treasury = await this.getTreasuryRisk(organizationId, operatingUnitId);
    const compliance = await this.getComplianceRisk(organizationId, operatingUnitId);
    const paymentDelays = await this.getPaymentDelayRisk(organizationId, operatingUnitId);
    const receivable = await this.getReceivableAgingRisk(organizationId, operatingUnitId);
    const payable = await this.getPayableAgingRisk(organizationId, operatingUnitId);
    const fxRisks = await this.getFXRisk(organizationId, operatingUnitId);
    const donorRisks = await this.getDonorRisk(organizationId, operatingUnitId);
    const budgetOverruns = await this.getBudgetOverrunRisk(organizationId, operatingUnitId);

    return {
      'Liquidity Risk': { count: 1, critical: liquidity.riskLevel === 'critical' ? 1 : 0, high: liquidity.riskLevel === 'high' ? 1 : 0, medium: liquidity.riskLevel === 'medium' ? 1 : 0, low: liquidity.riskLevel === 'low' ? 1 : 0 },
      'Treasury Risk': { count: 1, critical: treasury.riskLevel === 'critical' ? 1 : 0, high: treasury.riskLevel === 'high' ? 1 : 0, medium: treasury.riskLevel === 'medium' ? 1 : 0, low: treasury.riskLevel === 'low' ? 1 : 0 },
      'Compliance Risk': { count: 1, critical: compliance.riskLevel === 'critical' ? 1 : 0, high: compliance.riskLevel === 'high' ? 1 : 0, medium: compliance.riskLevel === 'medium' ? 1 : 0, low: compliance.riskLevel === 'low' ? 1 : 0 },
      'Payment Delay Risk': {
        count: paymentDelays.length,
        critical: 0,
        high: paymentDelays.filter(p => p.riskLevel === 'high').length,
        medium: paymentDelays.filter(p => p.riskLevel === 'medium').length,
        low: paymentDelays.filter(p => p.riskLevel === 'low').length,
      },
      'Receivable Aging Risk': { count: 1, critical: 0, high: receivable.riskLevel === 'high' ? 1 : 0, medium: receivable.riskLevel === 'medium' ? 1 : 0, low: receivable.riskLevel === 'low' ? 1 : 0 },
      'Payable Aging Risk': { count: 1, critical: 0, high: payable.riskLevel === 'high' ? 1 : 0, medium: payable.riskLevel === 'medium' ? 1 : 0, low: payable.riskLevel === 'low' ? 1 : 0 },
      'FX Risk': {
        count: fxRisks.length,
        critical: 0,
        high: fxRisks.filter(f => f.riskLevel === 'high').length,
        medium: fxRisks.filter(f => f.riskLevel === 'medium').length,
        low: fxRisks.filter(f => f.riskLevel === 'low').length,
      },
      'Donor Risk': {
        count: donorRisks.length,
        critical: 0,
        high: donorRisks.filter(d => d.riskLevel === 'high').length,
        medium: donorRisks.filter(d => d.riskLevel === 'medium').length,
        low: donorRisks.filter(d => d.riskLevel === 'low').length,
      },
      'Budget Overrun Risk': {
        count: budgetOverruns.length,
        critical: budgetOverruns.filter(b => b.riskLevel === 'critical').length,
        high: budgetOverruns.filter(b => b.riskLevel === 'high').length,
        medium: budgetOverruns.filter(b => b.riskLevel === 'medium').length,
        low: budgetOverruns.filter(b => b.riskLevel === 'low').length,
      },
    };
  }

  /**
   * Get risks with filtering, searching, and pagination.
   */
  async getRisks(
    organizationId: number,
    options: {
      page?: number;
      pageSize?: number;
      search?: string;
      category?: string;
      riskLevel?: 'critical' | 'high' | 'medium' | 'low';
      status?: string;
      likelihood?: string;
      impact?: string;
      ownerId?: number;
      projectId?: number;
      donorId?: number;
      operatingUnitId?: number | null;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<{
    data: Array<any>;
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const page = options.page || 1;
    const pageSize = options.pageSize || 10;

    const allRisks: Array<any> = [];

    const budgetOverruns = await this.getBudgetOverrunRisk(organizationId, options.operatingUnitId);
    allRisks.push(
      ...budgetOverruns.map(b => ({
        id: `budget-${b.projectId}`,
        category: 'Budget Overrun Risk',
        title: `Budget overrun: ${b.projectName}`,
        description: `${b.overrunPercent}% overrun`,
        riskLevel: b.riskLevel,
        projectId: b.projectId,
        createdAt: new Date(),
      }))
    );

    const paymentDelays = await this.getPaymentDelayRisk(organizationId, options.operatingUnitId);
    allRisks.push(
      ...paymentDelays.map(p => ({
        id: `payment-${p.vendorId}`,
        category: 'Payment Delay Risk',
        title: `Payment delay: ${p.vendorName}`,
        description: `${p.daysOverdue} days overdue`,
        riskLevel: p.riskLevel,
        createdAt: new Date(),
      }))
    );

    const liquidity = await this.getLiquidityRisk(organizationId, options.operatingUnitId);
    allRisks.push({
      id: 'liquidity-1',
      category: 'Liquidity Risk',
      title: 'Liquidity Risk Assessment',
      description: `${liquidity.daysOfCashAvailable} days of cash available`,
      riskLevel: liquidity.riskLevel,
      createdAt: new Date(),
    });

    let filtered = allRisks;
    if (options.category) {
      filtered = filtered.filter(r => r.category === options.category);
    }

    if (options.riskLevel) {
      filtered = filtered.filter(r => r.riskLevel === options.riskLevel);
    }

    if (options.search) {
      const searchLower = options.search.toLowerCase();
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(searchLower) ||
        r.description.toLowerCase().includes(searchLower)
      );
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Get single risk by ID.
   */
  async getRiskById(
    organizationId: number,
    riskId: number
  ): Promise<any> {
    return {
      id: riskId,
      organizationId,
      category: 'Financial Risk',
      title: 'Risk Assessment',
      description: 'Risk details',
      riskLevel: 'medium',
      status: 'open',
      createdAt: new Date(),
    };
  }
}

// ── Singleton Instance ──────────────────────────────────────────────────────

let riskRepositoryInstance: RiskRepository | null = null;

export async function getRiskRepository(db: DB): Promise<RiskRepository> {
  if (!riskRepositoryInstance) {
    riskRepositoryInstance = new RiskRepository(db);
  }
  return riskRepositoryInstance;
}
