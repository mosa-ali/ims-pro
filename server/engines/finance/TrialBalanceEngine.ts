/**
 * server/engines/finance/TrialBalanceEngine.ts
 *
 * Trial Balance Engine
 * Generates trial balance reports and validates GL balance.
 *
 * Responsibilities:
 * - Trial balance generation
 * - GL balance validation
 * - Period-based balance calculations
 */

import { and, eq, gte, lte, sql } from 'drizzle-orm';
import type { DB } from '../../db/_scope';
import {
  journalEntries,
  journalLines,
  glAccounts,
} from '../../../drizzle/schema';

// ── Types ────────────────────────────────────────────────────────────────────

export interface TrialBalance {
  accountCode: string;
  accountName: string;
  accountType: string;
  debitBalance: number;
  creditBalance: number;
  balance: number;
}

// ── Trial Balance Engine ─────────────────────────────────────────────────────

export class TrialBalanceEngine {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Generate trial balance for a given period.
   */
  async generateTrialBalance(
    organizationId: number,
    startDate: Date | string,
    endDate: Date | string
  ): Promise<TrialBalance[]> {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

    const results = await this.db
      .select({
        accountCode: glAccounts.accountCode,
        accountName: glAccounts.name,
        accountType: glAccounts.accountType,
        debitBalance: sql<number>`COALESCE(SUM(CASE WHEN ${journalLines.debitAmount} IS NOT NULL THEN ${journalLines.debitAmount} ELSE 0 END), 0)`,
        creditBalance: sql<number>`COALESCE(SUM(CASE WHEN ${journalLines.creditAmount} IS NOT NULL THEN ${journalLines.creditAmount} ELSE 0 END), 0)`,
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
      .groupBy(glAccounts.id);

    return results.map((r: any) => ({
      accountCode: r.accountCode,
      accountName: r.accountName,
      accountType: r.accountType,
      debitBalance: r.debitBalance || 0,
      creditBalance: r.creditBalance || 0,
      balance: (r.debitBalance || 0) - (r.creditBalance || 0),
    }));
  }

  /**
   * Validate trial balance - debits should equal credits.
   */
  async validateTrialBalance(
    organizationId: number,
    startDate: Date | string,
    endDate: Date | string
  ): Promise<{ isValid: boolean; totalDebits: number; totalCredits: number; difference: number }> {
    const trialBalance = await this.generateTrialBalance(organizationId, startDate, endDate);
    
    const totalDebits = trialBalance.reduce((sum, line) => sum + line.debitBalance, 0);
    const totalCredits = trialBalance.reduce((sum, line) => sum + line.creditBalance, 0);
    const difference = Math.abs(totalDebits - totalCredits);

    return {
      isValid: difference < 0.01,
      totalDebits,
      totalCredits,
      difference,
    };
  }
}

// ── Singleton Instance ──────────────────────────────────────────────────────

let tbEngineInstance: TrialBalanceEngine | null = null;

export async function getTrialBalanceEngine(db: DB): Promise<TrialBalanceEngine> {
  if (!tbEngineInstance) {
    tbEngineInstance = new TrialBalanceEngine(db);
  }
  return tbEngineInstance;
}
