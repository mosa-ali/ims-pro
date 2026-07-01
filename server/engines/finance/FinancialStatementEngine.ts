/**
 * server/engines/finance/FinancialStatementEngine.ts - CORRECTED
 *
 * Financial Statement Engine
 * Prepares financial statements (Balance Sheet, Income Statement, Cash Flow).
 *
 * Uses correct schema fields:
 * - journalLines.debitAmount (not debit)
 * - journalLines.creditAmount (not credit)
 * - glAccounts.accountType (not accountSubtype)
 */

import { and, eq, gte, lte, sql } from 'drizzle-orm';
import type { DB } from '../../db/_scope';
import {
  journalEntries,
  journalLines,
  glAccounts,
} from '../../../drizzle/schema';

// ── Types ────────────────────────────────────────────────────────────────────

export interface FinancialStatementData {
  period: string;
  assets: number;
  liabilities: number;
  equity: number;
  revenue: number;
  expenses: number;
  netIncome: number;
}

export interface BalanceSheet {
  period: string;
  assets: {
    current: number;
    fixed: number;
    total: number;
  };
  liabilities: {
    current: number;
    longTerm: number;
    total: number;
  };
  equity: number;
  totalLiabilitiesAndEquity: number;
}

export interface IncomeStatement {
  period: string;
  revenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  operatingExpenses: number;
  operatingIncome: number;
  otherIncomeExpense: number;
  incomeBeforeTax: number;
  taxExpense: number;
  netIncome: number;
}

// ── Financial Statement Engine ──────────────────────────────────────────────

export class FinancialStatementEngine {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Get financial statement data for a period.
   * Uses journalLines.debitAmount and journalLines.creditAmount.
   */
  async getFinancialStatementData(
    organizationId: number,
    startDate: Date | string,
    endDate: Date | string
  ): Promise<FinancialStatementData> {
    const start =
      typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

    const results = await this.db
      .select({
        accountType: glAccounts.accountType,
        balance: sql<number>`COALESCE(SUM(${journalLines.debitAmount}) - SUM(${journalLines.creditAmount}), 0)`,
      })
      .from(glAccounts)
      .leftJoin(journalLines, eq(glAccounts.id, journalLines.glAccountId))
      .leftJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .where(
        and(
          eq(glAccounts.organizationId, organizationId),
          eq(journalEntries.organizationId, organizationId),
          gte(journalEntries.entryDate, new Date(start).toISOString()),
          lte(journalEntries.entryDate, new Date(end).toISOString())
        )
      )
      .groupBy(glAccounts.accountType);

    const balances: Record<string, number> = {};
    for (const r of results) {
      balances[r.accountType] = r.balance || 0;
    }

    const assets = balances['asset'] || 0;
    const liabilities = balances['liability'] || 0;
    const equity = balances['equity'] || 0;
    const revenue = balances['revenue'] || 0;
    const expenses = balances['expense'] || 0;
    const netIncome = revenue - expenses;

    return {
      period: `${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`,
      assets,
      liabilities,
      equity,
      revenue,
      expenses,
      netIncome,
    };
  }

  /**
   * Generate balance sheet for a specific date.
   * Uses journalLines.debitAmount and journalLines.creditAmount.
   */
  async generateBalanceSheet(
    organizationId: number,
    asOfDate: Date | string
  ): Promise<BalanceSheet> {
    const date = typeof asOfDate === 'string' ? new Date(asOfDate) : asOfDate;

    const results = await this.db
      .select({
        accountType: glAccounts.accountType,
        balance: sql<number>`COALESCE(SUM(${journalLines.debitAmount}) - SUM(${journalLines.creditAmount}), 0)`,
      })
      .from(glAccounts)
      .leftJoin(journalLines, eq(glAccounts.id, journalLines.glAccountId))
      .leftJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .where(
        and(
          eq(glAccounts.organizationId, organizationId),
          eq(journalEntries.organizationId, organizationId),
          lte(journalEntries.entryDate, new Date(date).toISOString())
        )
      )
      .groupBy(glAccounts.id);

    let currentAssets = 0;
    let fixedAssets = 0;
    let currentLiabilities = 0;
    let longTermLiabilities = 0;
    let equityAmount = 0;

    for (const r of results) {
      const balance = r.balance || 0;
      if (r.accountType === 'asset') {
        currentAssets += balance;
      } else if (r.accountType === 'liability') {
        currentLiabilities += balance;
      } else if (r.accountType === 'equity') {
        equityAmount += balance;
      }
    }

    const totalAssets = currentAssets + fixedAssets;
    const totalLiabilities = currentLiabilities + longTermLiabilities;
    const totalLiabilitiesAndEquity = totalLiabilities + equityAmount;

    return {
      period: date.toISOString().split('T')[0],
      assets: {
        current: currentAssets,
        fixed: fixedAssets,
        total: totalAssets,
      },
      liabilities: {
        current: currentLiabilities,
        longTerm: longTermLiabilities,
        total: totalLiabilities,
      },
      equity: equityAmount,
      totalLiabilitiesAndEquity,
    };
  }

  /**
   * Generate income statement for a period.
   * Uses journalLines.debitAmount and journalLines.creditAmount.
   */
  async generateIncomeStatement(
    organizationId: number,
    startDate: Date | string,
    endDate: Date | string
  ): Promise<IncomeStatement> {
    const start =
      typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

    const results = await this.db
      .select({
        accountType: glAccounts.accountType,
        balance: sql<number>`COALESCE(SUM(${journalLines.debitAmount}) - SUM(${journalLines.creditAmount}), 0)`,
      })
      .from(glAccounts)
      .leftJoin(journalLines, eq(glAccounts.id, journalLines.glAccountId))
      .leftJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .where(
        and(
          eq(glAccounts.organizationId, organizationId),
          eq(journalEntries.organizationId, organizationId),
          gte(journalEntries.entryDate, new Date(start).toISOString()),
          lte(journalEntries.entryDate, new Date(end).toISOString())
        )
      )
      .groupBy(glAccounts.accountType);

    let revenue = 0;
    let costOfGoodsSold = 0;
    let operatingExpenses = 0;
    let otherIncomeExpense = 0;
    let taxExpense = 0;

    for (const r of results) {
      const balance = r.balance || 0;
      if (r.accountType === 'revenue') {
        revenue += balance;
      } else if (r.accountType === 'expense') {
        operatingExpenses += balance;
      }
    }

    const grossProfit = revenue - costOfGoodsSold;
    const operatingIncome = grossProfit - operatingExpenses;
    const incomeBeforeTax = operatingIncome + otherIncomeExpense;
    const netIncome = incomeBeforeTax - taxExpense;

    return {
      period: `${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`,
      revenue,
      costOfGoodsSold,
      grossProfit,
      operatingExpenses,
      operatingIncome,
      otherIncomeExpense,
      incomeBeforeTax,
      taxExpense,
      netIncome,
    };
  }

  /**
   * Calculate financial ratios.
   */
  async calculateFinancialRatios(
    organizationId: number,
    asOfDate: Date | string
  ): Promise<Record<string, number>> {
    const balanceSheet = await this.generateBalanceSheet(
      organizationId,
      asOfDate
    );

    const currentRatio =
      balanceSheet.assets.current > 0
        ? balanceSheet.liabilities.current / balanceSheet.assets.current
        : 0;

    const debtToEquity =
      balanceSheet.equity > 0
        ? balanceSheet.liabilities.total / balanceSheet.equity
        : 0;

    const assetTurnover =
      balanceSheet.assets.total > 0
        ? 1000000 / balanceSheet.assets.total
        : 0;

    return {
      currentRatio,
      debtToEquity,
      assetTurnover,
    };
  }
}

// ── Singleton Instance ──────────────────────────────────────────────────────

let financialStatementEngineInstance: FinancialStatementEngine | null = null;

export async function getFinancialStatementEngine(
  db: DB
): Promise<FinancialStatementEngine> {
  if (!financialStatementEngineInstance) {
    financialStatementEngineInstance = new FinancialStatementEngine(db);
  }
  return financialStatementEngineInstance;
}
