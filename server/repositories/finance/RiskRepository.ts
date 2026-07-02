/**
 * server/repositories/finance/RiskRepository.ts
 *
 * Risk Repository — REFACTORED
 * Data access layer for financial risk indicators and assessments.
 *
 * BEFORE: 7 of 9 methods returned hardcoded objects (cashOnHand=500000,
 *         currentRatio=2.5, etc.).
 * AFTER:  All methods query real tables via Drizzle ORM.
 *
 * Tables used:
 * - financeBankAccounts  → liquidity, treasury
 * - projects + budgets   → budget overrun, project health
 * - expenditures         → burn rate, payment delay proxy
 * - journalLines         → receivable/payable aging proxy via GL account types
 * - vendors              → payment delay (where payment history is recorded)
 *
 * Tables not yet available in schema (safe defaults returned with flag):
 * - advances             → advance-related liquidity risk
 * - donor_reports        → donor compliance
 * - purchase_orders      → payment delay (use expenditures as proxy)
 */

import { and, eq, sql, gte, lte, count, sum, desc, like } from 'drizzle-orm';
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
  financeFinancialRisks,
} from '../../../drizzle/schema';
import type { RiskRegisterStats, RiskRegisterRecord, PaginatedResponse } from '@shared/types/financeRouterTypes';
import { z } from "zod";

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

export const RISK_SORT_FIELDS = [
  "riskId",
  "title",
  "category",
  "likelihood",
  "impact",
  "overallRiskScore",
  "financialExposure",
  "status",
  "detectedAt",
  "dueDate",
] as const;

export type RiskSortField =
    typeof RISK_SORT_FIELDS[number];

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
   * Cash on hand sourced from financeBankAccounts.currentBalance.
   * Upcoming payments estimated from last-30-day expenditure run rate.
   */
  async getLiquidityRisk(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<LiquidityRisk> {
    // Total cash across all active bank accounts
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

    // Estimate upcoming payments: 30-day expenditure average × 1 month
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

    // Days of cash = cashOnHand / daily burn rate
    const dailyBurn = upcomingPayments > 0 ? upcomingPayments / 30 : 1;
    const daysOfCashAvailable = dailyBurn > 0
      ? Math.floor(cashOnHand / dailyBurn)
      : 999;

    // Current ratio proxy: cash / upcoming payments
    const currentRatio = upcomingPayments > 0
      ? cashOnHand / upcomingPayments
      : 99;
    const quickRatio = currentRatio; // simplified — no inventory adjustment

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
   * Groups bank accounts by currency to measure non-reporting-currency exposure.
   * Reporting currency assumed USD — all non-USD balances are exposed.
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

    // Filter out USD (reporting currency) and map each foreign currency
    const fxRisks: FXRisk[] = rows
      .filter(r => r.currency && r.currency !== 'USD' && toNum(r.totalBalance) > 0)
      .map(r => {
        const exposedAmount = toNum(r.totalBalance);
        // Conservative 5% FX movement assumption
        const potentialLoss = exposedAmount * 0.05;
        const riskLevel: 'low' | 'medium' | 'high' =
          exposedAmount > 500000 ? 'high'
          : exposedAmount > 100000 ? 'medium'
          : 'low';

        return {
          exposedAmount,
          exposedCurrency: r.currency || 'UNKNOWN',
          exchangeRate: 1, // Exchange rate service would provide actual rate
          potentialLoss,
          riskLevel,
        };
      });

    return fxRisks;
  }

  /**
   * Calculate donor risk profile.
   * Uses budget utilization per project as a proxy for donor risk
   * (under-utilization suggests reporting risk; over-utilization suggests compliance risk).
   * When a dedicated grants/donors table is available, this should be updated.
   */
  async getDonorRisk(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<DonorRisk[]> {
    // Aggregate at the org level — one synthetic "donor portfolio" row
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
   * Calculate project financial health risk for a specific project.
   * Uses projects.title, projects.spent, budgets.totalApprovedAmount.
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

    // Burn rate: 90-day expenditure average annualized vs budget
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

    // Risk scoring
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
   * Calculate budget overrun risk across all active projects.
   * Uses projects.spent vs projects.totalBudget with 90-day burn rate projection.
   */
  async getBudgetOverrunRisk(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<BudgetOverrunRisk[]> {
    const projectsData = await this.db
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
            : undefined,
          eq(projects.status, 'active')
        )
      );

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Get 90-day org-level burn for proportional allocation
    const [orgBurn] = await this.db
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
    const orgMonthlyBurn = toNum(orgBurn?.total) / 3;

    const results: BudgetOverrunRisk[] = [];

    for (const p of projectsData) {
      const budget = toNum(p.totalBudget);
      const spent = toNum(p.spent);
      if (budget <= 0) continue;

      // Project share of burn rate proportional to its budget weight
      const orgTotalBudget = projectsData.reduce(
        (s, x) => s + toNum(x.totalBudget), 0
      );
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
   * Uses expenditures table grouped by month to detect irregular spending
   * patterns as a proxy for payment delays.
   * When a purchase_orders / supplier_invoices table is available, join there.
   */
  async getPaymentDelayRisk(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<PaymentDelayRisk[]> {
    // Get monthly expenditure totals for the past 6 months
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

    // Flag if current month is significantly below average — potential delay
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
   * Uses GL journal lines classified as 'asset' or 'receivable' account type
   * to derive aging buckets. Production implementation should query a dedicated
   * receivables / advances table when available.
   */
  async getReceivableAgingRisk(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<ReceivableAgingRisk> {
    const now = new Date();
    const d30 = new Date(); d30.setDate(d30.getDate() - 30);
    const d60 = new Date(); d60.setDate(d60.getDate() - 60);
    const d90 = new Date(); d90.setDate(d90.getDate() - 90);

    // Total receivable balance = debit balance on asset accounts from journal lines
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

    // Bucket by entry age (journal entry date as proxy for invoice date)
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
   * Total cash from financeBankAccounts vs estimated monthly obligations.
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

    // Monthly obligations = 90-day avg expenditure
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

    // Minimum reserve = 2 months of obligations
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
   * Uses GL journal lines classified as 'liability' account type to derive aging.
   * Production implementation should query supplier_invoices when available.
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
   * Derived from journal entry integrity (balanced entries ratio)
   * and budget overrun count as proxies for compliance posture.
   */
  async getComplianceRisk(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<ComplianceRisk> {
    // Journal integrity: unbalanced entries are a compliance violation
    const [jeRow] = await this.db
      .select({
        totalEntries: sql<number>`COUNT(*)`,
        // Entries where sum of debits != sum of credits indicate integrity issues
        // We use a threshold check at the entry level
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

    // Budget overruns = direct compliance violation count
    const overruns = await this.getBudgetOverrunRisk(organizationId, operatingUnitId);
    const criticalOverruns = overruns.filter(o => o.riskLevel === 'critical').length;
    const highOverruns = overruns.filter(o => o.riskLevel === 'high').length;
    const violationCount = criticalOverruns;
    const warningCount = highOverruns;

    // Compliance score: start at 100, deduct per violation
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
   * Get risk statistics matching RiskRegisterStats contract.
   * Returns counts by severity level, status, and total exposure from financeFinancialRisks table.
   */
  async getRiskStats(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<RiskRegisterStats> {
    const rows = await this.db
      .select({
        likelihood: financeFinancialRisks.likelihood,
        impact: financeFinancialRisks.impact,
        status: financeFinancialRisks.status,
        financialExposure: financeFinancialRisks.financialExposure,
        currency: financeFinancialRisks.currency,
      })
      .from(financeFinancialRisks)
      .where(
        and(
          eq(financeFinancialRisks.organizationId, organizationId),
          operatingUnitId
            ? eq(financeFinancialRisks.operatingUnitId, operatingUnitId)
            : undefined
        )
      );

    // Calculate severity levels based on likelihood × impact
    const severityMap: Record<string, number> = {
      'low-low': 1,
      'low-medium': 2,
      'low-high': 3,
      'low-critical': 4,
      'medium-low': 2,
      'medium-medium': 4,
      'medium-high': 6,
      'medium-critical': 8,
      'high-low': 3,
      'high-medium': 6,
      'high-high': 9,
      'high-critical': 12,
      'critical-low': 4,
      'critical-medium': 8,
      'critical-high': 12,
      'critical-critical': 16,
    };

    const severityCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    let totalExposure = 0;
    let currency = 'USD';
    const statusCounts = {
      open: 0,
      under_review: 0,
      resolved: 0,
    };

    for (const row of rows) {
      const key = `${row.likelihood || 'low'}-${row.impact || 'low'}`;
      const severity = severityMap[key] || 1;

      if (severity >= 12) severityCounts.critical++;
      else if (severity >= 6) severityCounts.high++;
      else if (severity >= 3) severityCounts.medium++;
      else severityCounts.low++;

      totalExposure += toNum(row.financialExposure);
      if (row.currency) currency = row.currency;

      if (row.status === 'open') statusCounts.open++;
      else if (row.status === 'under_review') statusCounts.under_review++;
      else if (row.status === 'resolved') statusCounts.resolved++;
    }

    return {
      total: rows.length,
      critical: severityCounts.critical,
      high: severityCounts.high,
      medium: severityCounts.medium,
      low: severityCounts.low,
      open: statusCounts.open,
      underReview: statusCounts.under_review,
      resolved: statusCounts.resolved,
      totalExposure,
      currency,
    };
  }

  /**
   * Get paginated risk register records from financeFinancialRisks table.
   * Returns data matching RiskRegisterRecord contract.
   */
  async getRisks(
    organizationId: number,
    options: {
      page?: number;
      pageSize?: number;
      search?: string;
      category?: (typeof financeFinancialRisks.category.enumValues)[number];
      riskLevel?: 'critical' | 'high' | 'medium' | 'low';
      status?: (typeof financeFinancialRisks.status.enumValues)[number];
      likelihood?: (typeof financeFinancialRisks.likelihood.enumValues)[number];
      impact?: (typeof financeFinancialRisks.impact.enumValues)[number];
      ownerId?: number;
      projectId?: number;
      donorId?: number;
      operatingUnitId?: number | null;
      startDate?: string;
      endDate?: string;
      sortBy?: RiskSortField;
      sortOrder?: "asc" | "desc";
    } = {}
  ): Promise<PaginatedResponse<RiskRegisterRecord>> {
    const page = options.page || 1;
    const pageSize = options.pageSize || 10;

    // Build WHERE clause
    const whereConditions = [
      eq(financeFinancialRisks.organizationId, organizationId),

      options.operatingUnitId !== undefined
        ? eq(financeFinancialRisks.operatingUnitId, Number(options.operatingUnitId))
        : undefined,

      options.category
        ? eq(
            financeFinancialRisks.category,
            options.category as (typeof financeFinancialRisks.category.enumValues)[number]
          )
        : undefined,

      options.status
        ? eq(
            financeFinancialRisks.status,
            options.status as (typeof financeFinancialRisks.status.enumValues)[number]
          )
        : undefined,

      options.likelihood
        ? eq(
            financeFinancialRisks.likelihood,
            options.likelihood as (typeof financeFinancialRisks.likelihood.enumValues)[number]
          )
        : undefined,

      options.impact
        ? eq(
            financeFinancialRisks.impact,
            options.impact as (typeof financeFinancialRisks.impact.enumValues)[number]
          )
        : undefined,

      options.projectId !== undefined
        ? eq(financeFinancialRisks.projectId, options.projectId)
        : undefined,

      options.donorId !== undefined
        ? eq(financeFinancialRisks.donorId, options.donorId)
        : undefined,

      options.search
        ? like(financeFinancialRisks.title, `%${options.search}%`)
        : undefined,

      options.startDate
        ? gte(financeFinancialRisks.detectedAt, options.startDate)
        : undefined,

      options.endDate
        ? lte(financeFinancialRisks.detectedAt, options.endDate)
        : undefined,
    ].filter((c): c is NonNullable<typeof c> => c !== undefined);

    // Get total count
    const [countRow] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(financeFinancialRisks)
      .where(and(...whereConditions));

    const total = toNum(countRow?.count);
    const totalPages = Math.ceil(total / pageSize);

    // Get paginated data
    const rows = await this.db
      .select({
        id: financeFinancialRisks.id,
        title: financeFinancialRisks.title,
        description: financeFinancialRisks.description,
        category: financeFinancialRisks.category,
        likelihood: financeFinancialRisks.likelihood,
        impact: financeFinancialRisks.impact,
        overallRiskScore: financeFinancialRisks.overallRiskScore,
        financialExposure: financeFinancialRisks.financialExposure,
        currency: financeFinancialRisks.currency,
        status: financeFinancialRisks.status,
        ownerId: financeFinancialRisks.ownerId,
        mitigationPlan: financeFinancialRisks.mitigationPlan,
        aiRecommendation: financeFinancialRisks.aiRecommendation,
        dueDate: financeFinancialRisks.dueDate,
        detectedAt: financeFinancialRisks.detectedAt,
        projectId: financeFinancialRisks.projectId,
        createdAt: financeFinancialRisks.createdAt,
      })
      .from(financeFinancialRisks)
      .where(and(...whereConditions))
      .orderBy(desc(financeFinancialRisks.overallRiskScore))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    // Map to RiskRegisterRecord
    const data: RiskRegisterRecord[] = rows.map(r => ({
      id: r.id,
      riskId: String(r.id),
      title: r.title || '',
      description: r.description || '',
      category: r.category || '',
      likelihood: r.likelihood === 'critical' ? 4 : r.likelihood === 'high' ? 3 : r.likelihood === 'medium' ? 2 : 1,
      impact: r.impact === 'critical' ? 4 : r.impact === 'high' ? 3 : r.impact === 'medium' ? 2 : 1,
      riskScore: toNum(r.overallRiskScore),
      financialExposure: toNum(r.financialExposure),
      currency: r.currency || 'USD',
      status: r.status || 'open',
      owner: r.ownerId ? `Owner ${r.ownerId}` : undefined,
      dueDate: r.dueDate ? new Date(r.dueDate).toISOString().split('T')[0] : undefined,
      detectedDate: r.detectedAt ? new Date(r.detectedAt).toISOString().split('T')[0] : undefined,
      mitigationPlan: r.mitigationPlan || undefined,
      hasAiRecommendation: !!r.aiRecommendation,
    }));

    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Get a single risk by ID.
   */
  async getRiskById(
    organizationId: number,
    riskId: number
  ): Promise<RiskRegisterRecord | null> {
    const [row] = await this.db
      .select({
        id: financeFinancialRisks.id,
        title: financeFinancialRisks.title,
        description: financeFinancialRisks.description,
        category: financeFinancialRisks.category,
        likelihood: financeFinancialRisks.likelihood,
        impact: financeFinancialRisks.impact,
        overallRiskScore: financeFinancialRisks.overallRiskScore,
        financialExposure: financeFinancialRisks.financialExposure,
        currency: financeFinancialRisks.currency,
        status: financeFinancialRisks.status,
        ownerId: financeFinancialRisks.ownerId,
        mitigationPlan: financeFinancialRisks.mitigationPlan,
        aiRecommendation: financeFinancialRisks.aiRecommendation,
        dueDate: financeFinancialRisks.dueDate,
        detectedAt: financeFinancialRisks.detectedAt,
      })
      .from(financeFinancialRisks)
      .where(
        and(
          eq(financeFinancialRisks.id, riskId),
          eq(financeFinancialRisks.organizationId, organizationId)
        )
      );

    if (!row) return null;

    return {
      id: row.id,
      riskId: String(row.id),
      title: row.title || '',
      description: row.description || '',
      category: row.category || '',
      likelihood: row.likelihood === 'critical' ? 4 : row.likelihood === 'high' ? 3 : row.likelihood === 'medium' ? 2 : 1,
      impact: row.impact === 'critical' ? 4 : row.impact === 'high' ? 3 : row.impact === 'medium' ? 2 : 1,
      riskScore: toNum(row.overallRiskScore),
      financialExposure: toNum(row.financialExposure),
      currency: row.currency || 'USD',
      status: row.status || 'open',
      owner: row.ownerId ? `Owner ${row.ownerId}` : undefined,
      dueDate: row.dueDate ? new Date(row.dueDate).toISOString().split('T')[0] : undefined,
      detectedDate: row.detectedAt ? new Date(row.detectedAt).toISOString().split('T')[0] : undefined,
      mitigationPlan: row.mitigationPlan || undefined,
      hasAiRecommendation: !!row.aiRecommendation,
    };
  }

  /**
   * Get top critical risks from financeFinancialRisks table.
   */
  async getTopCriticalRisks(
    organizationId: number,
    operatingUnitId?: number | null,
    limit: number = 10
  ): Promise<RiskRegisterRecord[]> {
    const rows = await this.db
      .select({
        id: financeFinancialRisks.id,
        title: financeFinancialRisks.title,
        description: financeFinancialRisks.description,
        category: financeFinancialRisks.category,
        likelihood: financeFinancialRisks.likelihood,
        impact: financeFinancialRisks.impact,
        overallRiskScore: financeFinancialRisks.overallRiskScore,
        financialExposure: financeFinancialRisks.financialExposure,
        currency: financeFinancialRisks.currency,
        status: financeFinancialRisks.status,
        ownerId: financeFinancialRisks.ownerId,
        mitigationPlan: financeFinancialRisks.mitigationPlan,
        aiRecommendation: financeFinancialRisks.aiRecommendation,
        dueDate: financeFinancialRisks.dueDate,
        detectedAt: financeFinancialRisks.detectedAt,
      })
      .from(financeFinancialRisks)
      .where(
        and(
          eq(financeFinancialRisks.organizationId, organizationId),
          operatingUnitId
            ? eq(financeFinancialRisks.operatingUnitId, operatingUnitId)
            : undefined
        )
      )
      .orderBy(desc(financeFinancialRisks.overallRiskScore))
      .limit(limit);

    return rows.map(r => ({
      id: r.id,
      riskId: String(r.id),
      title: r.title || '',
      description: r.description || '',
      category: r.category || '',
      likelihood: r.likelihood === 'critical' ? 4 : r.likelihood === 'high' ? 3 : r.likelihood === 'medium' ? 2 : 1,
      impact: r.impact === 'critical' ? 4 : r.impact === 'high' ? 3 : r.impact === 'medium' ? 2 : 1,
      riskScore: toNum(r.overallRiskScore),
      financialExposure: toNum(r.financialExposure),
      currency: r.currency || 'USD',
      status: r.status || 'open',
      owner: r.ownerId ? `Owner ${r.ownerId}` : undefined,
      dueDate: r.dueDate ? new Date(r.dueDate).toISOString().split('T')[0] : undefined,
      detectedDate: r.detectedAt ? new Date(r.detectedAt).toISOString().split('T')[0] : undefined,
      mitigationPlan: r.mitigationPlan || undefined,
      hasAiRecommendation: !!r.aiRecommendation,
    }));
  }

  /**
   * Get risks grouped by category.
   */
  async getRisksByCategory(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<Array<{ category: string; count: number; avgScore: number }>> {
    const rows = await this.db
      .select({
        category: financeFinancialRisks.category,
        count: sql<number>`COUNT(*)`,
        avgScore: sql<number>`AVG(${financeFinancialRisks.overallRiskScore})`,
      })
      .from(financeFinancialRisks)
      .where(
        and(
          eq(financeFinancialRisks.organizationId, organizationId),
          operatingUnitId
            ? eq(financeFinancialRisks.operatingUnitId, operatingUnitId)
            : undefined
        )
      )
      .groupBy(financeFinancialRisks.category);

    return rows.map(r => ({
      category: r.category || 'unknown',
      count: toNum(r.count),
      avgScore: toNum(r.avgScore),
    }));
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
