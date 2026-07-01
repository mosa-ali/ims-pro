/**
 * server/repositories/finance/HealthRepository.ts
 *
 * Health Repository — REWRITTEN
 *
 * BEFORE: This file was a byte-for-byte duplicate of ComplianceRepository.ts
 *         with a different filename and exported the same ComplianceRepository
 *         class — a copy/paste artifact, not an actual health repository.
 *
 * AFTER:  A dedicated repository providing the real data sources that
 *         FinancialHealthEngine's 10 dimensions need: cash liquidity,
 *         revenue growth, debt management, asset utilization, working
 *         capital, profitability, financial stability.
 *
 * This repository is consumed by FinancialHealthEngine, replacing the
 * hardcoded scores (70, 65, 80, 72, 78, 68, 82, 90) that previously lived
 * directly inside the engine's private methods.
 */

import { and, eq, sql, gte, lte } from 'drizzle-orm';
import type { DB } from '../../db/_scope';
import {
  projects,
  budgets,
  expenditures,
  journalEntries,
  journalLines,
  glAccounts,
  financeBankAccounts,
} from '../../../drizzle/schema';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CashLiquidityData {
  totalCash: number;
  monthlyObligations: number;
  currentRatio: number;
  daysOfCashAvailable: number;
}

export interface RevenueGrowthData {
  currentPeriodRevenue: number;
  priorPeriodRevenue: number;
  growthPercent: number;
}

export interface DebtManagementData {
  totalLiabilities: number;
  totalAssets: number;
  debtToAssetRatio: number;
}

export interface AssetUtilizationData {
  totalAssets: number;
  totalRevenue: number;
  assetTurnoverRatio: number;
}

export interface WorkingCapitalData {
  currentAssets: number;
  currentLiabilities: number;
  workingCapital: number;
  workingCapitalRatio: number;
}

export interface ProfitabilityData {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  netMargin: number;
}

export interface FinancialStabilityData {
  monthlyNetIncome: number[];
  varianceCoefficient: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function toNum(v: any): number {
  if (v == null) return 0;
  const n = typeof v === 'object' && 'toNumber' in v ? v.toNumber() : parseFloat(String(v));
  return isNaN(n) ? 0 : n;
}

// ── Health Repository ────────────────────────────────────────────────────────

export class HealthRepository {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Cash liquidity: total bank balance vs 90-day average monthly obligations.
   */
  async getCashLiquidityData(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<CashLiquidityData> {
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
    const currentRatio = monthlyObligations > 0
      ? totalCash / monthlyObligations
      : 99;
    const daysOfCashAvailable = monthlyObligations > 0
      ? Math.floor((totalCash / monthlyObligations) * 30)
      : 999;

    return {
      totalCash,
      monthlyObligations,
      currentRatio: Math.round(currentRatio * 100) / 100,
      daysOfCashAvailable,
    };
  }

  /**
   * Revenue growth: current vs prior 90-day period from GL revenue accounts.
   */
  async getRevenueGrowthData(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<RevenueGrowthData> {
    const now = new Date();
    const ninetyDaysAgo = new Date(); ninetyDaysAgo.setDate(now.getDate() - 90);
    const oneEightyDaysAgo = new Date(); oneEightyDaysAgo.setDate(now.getDate() - 180);

    const [currentRow] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${journalLines.creditAmount}), 0)`,
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
          gte(journalEntries.entryDate, ninetyDaysAgo.toISOString()),
          sql`${glAccounts.accountType} = 'revenue'`
        )
      );

    const [priorRow] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${journalLines.creditAmount}), 0)`,
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
          gte(journalEntries.entryDate, oneEightyDaysAgo.toISOString()),
          lte(journalEntries.entryDate, ninetyDaysAgo.toISOString()),
          sql`${glAccounts.accountType} = 'revenue'`
        )
      );

    const currentPeriodRevenue = toNum(currentRow?.total);
    const priorPeriodRevenue = toNum(priorRow?.total);
    const growthPercent = priorPeriodRevenue > 0
      ? ((currentPeriodRevenue - priorPeriodRevenue) / priorPeriodRevenue) * 100
      : 0;

    return {
      currentPeriodRevenue,
      priorPeriodRevenue,
      growthPercent: Math.round(growthPercent * 10) / 10,
    };
  }

  /**
   * Debt management: liability accounts vs asset accounts from GL.
   */
  async getDebtManagementData(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<DebtManagementData> {
    const rows = await this.db
      .select({
        accountType: glAccounts.accountType,
        balance: sql<number>`COALESCE(
          SUM(${journalLines.debitAmount}) - SUM(${journalLines.creditAmount}),
          0
        )`,
      })
      .from(glAccounts)
      .leftJoin(journalLines, eq(glAccounts.id, journalLines.glAccountId))
      .leftJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .where(
        and(
          eq(glAccounts.organizationId, organizationId),
          eq(journalEntries.organizationId, organizationId),
          operatingUnitId
            ? eq(journalEntries.operatingUnitId, operatingUnitId)
            : undefined
        )
      )
      .groupBy(glAccounts.accountType);

    const map: Record<string, number> = {};
    for (const r of rows) {
      if (r.accountType) map[r.accountType] = toNum(r.balance);
    }

    const totalAssets = map['asset'] || 0;
    // Liabilities carry a credit balance — flip sign for a positive magnitude
    const totalLiabilities = Math.abs(map['liability'] || 0);
    const debtToAssetRatio = totalAssets > 0
      ? totalLiabilities / totalAssets
      : 0;

    return {
      totalLiabilities,
      totalAssets,
      debtToAssetRatio: Math.round(debtToAssetRatio * 100) / 100,
    };
  }

  /**
   * Asset utilization: revenue generated per dollar of assets (turnover ratio).
   */
  async getAssetUtilizationData(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<AssetUtilizationData> {
    const debtData = await this.getDebtManagementData(organizationId, operatingUnitId);

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const [revRow] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${journalLines.creditAmount}), 0)`,
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
          gte(journalEntries.entryDate, oneYearAgo.toISOString()),
          sql`${glAccounts.accountType} = 'revenue'`
        )
      );

    const totalRevenue = toNum(revRow?.total);
    const totalAssets = debtData.totalAssets;
    const assetTurnoverRatio = totalAssets > 0
      ? totalRevenue / totalAssets
      : 0;

    return {
      totalAssets,
      totalRevenue,
      assetTurnoverRatio: Math.round(assetTurnoverRatio * 100) / 100,
    };
  }

  /**
   * Working capital: current assets minus current liabilities.
   * Uses accountSubtype = 'current' classification on gl_accounts.
   */
  async getWorkingCapitalData(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<WorkingCapitalData> {
    const rows = await this.db
      .select({
        accountType: glAccounts.accountType,
        accountSubtype: glAccounts.accountSubtype,
        balance: sql<number>`COALESCE(
          SUM(${journalLines.debitAmount}) - SUM(${journalLines.creditAmount}),
          0
        )`,
      })
      .from(glAccounts)
      .leftJoin(journalLines, eq(glAccounts.id, journalLines.glAccountId))
      .leftJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .where(
        and(
          eq(glAccounts.organizationId, organizationId),
          eq(journalEntries.organizationId, organizationId),
          operatingUnitId
            ? eq(journalEntries.operatingUnitId, operatingUnitId)
            : undefined
        )
      )
      .groupBy(glAccounts.id, glAccounts.accountType, glAccounts.accountSubtype);

    let currentAssets = 0;
    let currentLiabilities = 0;

    for (const r of rows) {
      const balance = toNum(r.balance);
      if (r.accountType === 'asset' && r.accountSubtype === 'current') {
        currentAssets += balance;
      } else if (r.accountType === 'liability' && r.accountSubtype === 'current') {
        currentLiabilities += Math.abs(balance);
      }
    }

    const workingCapital = currentAssets - currentLiabilities;
    const workingCapitalRatio = currentLiabilities > 0
      ? currentAssets / currentLiabilities
      : currentAssets > 0 ? 99 : 0;

    return {
      currentAssets,
      currentLiabilities,
      workingCapital,
      workingCapitalRatio: Math.round(workingCapitalRatio * 100) / 100,
    };
  }

  /**
   * Profitability: net margin from trailing 90-day revenue and expense accounts.
   */
  async getProfitabilityData(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<ProfitabilityData> {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const rows = await this.db
      .select({
        accountType: glAccounts.accountType,
        balance: sql<number>`COALESCE(
          SUM(${journalLines.debitAmount}) - SUM(${journalLines.creditAmount}),
          0
        )`,
      })
      .from(glAccounts)
      .leftJoin(journalLines, eq(glAccounts.id, journalLines.glAccountId))
      .leftJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .where(
        and(
          eq(glAccounts.organizationId, organizationId),
          eq(journalEntries.organizationId, organizationId),
          operatingUnitId
            ? eq(journalEntries.operatingUnitId, operatingUnitId)
            : undefined,
          gte(journalEntries.entryDate, ninetyDaysAgo.toISOString())
        )
      )
      .groupBy(glAccounts.accountType);

    const map: Record<string, number> = {};
    for (const r of rows) {
      if (r.accountType) map[r.accountType] = toNum(r.balance);
    }

    // revenue carries credit balance (negative in debit-credit convention) — flip sign
    const totalRevenue = Math.abs(map['revenue'] || 0);
    const totalExpenses = map['expense'] || 0;
    const netIncome = totalRevenue - totalExpenses;
    const netMargin = totalRevenue > 0
      ? (netIncome / totalRevenue) * 100
      : 0;

    return {
      totalRevenue,
      totalExpenses,
      netIncome,
      netMargin: Math.round(netMargin * 10) / 10,
    };
  }

  /**
   * Financial stability: coefficient of variation of monthly net income
   * over the trailing 6 months. Lower variance = more stable.
   */
  async getFinancialStabilityData(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<FinancialStabilityData> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const rows = await this.db
      .select({
        month: sql<string>`DATE_FORMAT(${journalEntries.entryDate}, '%Y-%m')`,
        accountType: glAccounts.accountType,
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
          gte(journalEntries.entryDate, sixMonthsAgo.toISOString()),
          sql`${glAccounts.accountType} IN ('revenue', 'expense')`
        )
      )
      .groupBy(sql`DATE_FORMAT(${journalEntries.entryDate}, '%Y-%m')`, glAccounts.accountType);

    const monthlyMap: Record<string, { revenue: number; expense: number }> = {};
    for (const r of rows) {
      if (!monthlyMap[r.month]) monthlyMap[r.month] = { revenue: 0, expense: 0 };
      if (r.accountType === 'revenue') monthlyMap[r.month].revenue += Math.abs(toNum(r.balance));
      if (r.accountType === 'expense') monthlyMap[r.month].expense += toNum(r.balance);
    }

    const monthlyNetIncome = Object.values(monthlyMap).map(
      m => m.revenue - m.expense
    );

    if (monthlyNetIncome.length < 2) {
      return { monthlyNetIncome, varianceCoefficient: 0 };
    }

    const mean = monthlyNetIncome.reduce((s, v) => s + v, 0) / monthlyNetIncome.length;
    const variance = monthlyNetIncome.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / monthlyNetIncome.length;
    const stdDev = Math.sqrt(variance);
    const varianceCoefficient = mean !== 0 ? Math.abs(stdDev / mean) : 0;

    return {
      monthlyNetIncome,
      varianceCoefficient: Math.round(varianceCoefficient * 100) / 100,
    };
  }
}

// ── Singleton Instance ──────────────────────────────────────────────────────

let healthRepositoryInstance: HealthRepository | null = null;

export async function getHealthRepository(db: DB): Promise<HealthRepository> {
  if (!healthRepositoryInstance) {
    healthRepositoryInstance = new HealthRepository(db);
  }
  return healthRepositoryInstance;
}
