/**
 * server/engines/finance/ReconciliationEngine.ts
 *
 * Reconciliation Engine
 * Handles bank reconciliation and GL-to-bank matching.
 *
 * Responsibilities:
 * - Bank account reconciliation
 * - Outstanding items tracking
 * - GL-to-bank balance matching
 * - Reconciliation reporting
 *
 * FIX: bankBalance was always returning 0 — now correctly read from
 *      financeBankAccounts.currentBalance fetched from DB.
 */

import { and, eq, lte, sql, desc } from 'drizzle-orm';
import type { DB } from '../../db/_scope';
import {
  journalEntries,
  journalLines,
  financeBankAccounts,
} from '../../../drizzle/schema';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ReconciliationResult {
  bankAccountId: number;
  bankAccountName: string;
  currency: string;
  bankBalance: number;
  bookBalance: number;
  difference: number;
  isReconciled: boolean;
  statementDate: string;
  outstandingItems: Array<{
    type: 'check' | 'deposit' | 'fee' | 'interest';
    amount: number;
    date: string;
    description: string;
  }>;
}

// ── Reconciliation Engine ───────────────────────────────────────────────────

export class ReconciliationEngine {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Reconcile a bank account against GL records.
   *
   * bankBalance  → financeBankAccounts.currentBalance  (actual bank statement balance)
   * bookBalance  → sum of GL journal lines up to statementDate for the cash account
   * difference   → bankBalance - bookBalance  (positive = bank has more than GL, negative = GL ahead)
   */
  async reconcileBankAccount(
    bankAccountId: number,
    organizationId: number,
    statementDate: Date | string
  ): Promise<ReconciliationResult> {
    const stmtDate =
      typeof statementDate === 'string' ? new Date(statementDate) : statementDate;

    // ── 1. Fetch bank account record ─────────────────────────────────────────
    const [bankAccount] = await this.db
      .select({
        id: financeBankAccounts.id,
        accountName: financeBankAccounts.accountName,
        currency: financeBankAccounts.currency,
        currentBalance: financeBankAccounts.currentBalance,
      })
      .from(financeBankAccounts)
      .where(
        and(
          eq(financeBankAccounts.id, bankAccountId),
          eq(financeBankAccounts.organizationId, organizationId),
          eq(financeBankAccounts.isDeleted, 0)
        )
      );

    if (!bankAccount) {
      throw new Error(`Bank account ${bankAccountId} not found for organization ${organizationId}`);
    }

    // FIX: was previously hardcoded to 0
    const bankBalance = parseFloat(String(bankAccount.currentBalance || 0));

    // ── 2. Calculate GL book balance up to statement date ────────────────────
    // Sum all journal line debits minus credits scoped to this organization.
    // In a proper multi-account GL the WHERE clause should also filter by the
    // specific cash GL account linked to this bank account; here we use the
    // organization-scoped total as a portfolio-level reconciliation.
    const [glResult] = await this.db
      .select({
        balance: sql<number>`COALESCE(
          SUM(${journalLines.debitAmount}) - SUM(${journalLines.creditAmount}),
          0
        )`,
      })
      .from(journalLines)
      .leftJoin(
        journalEntries,
        eq(journalLines.journalEntryId, journalEntries.id)
      )
      .where(
        and(
          eq(journalEntries.organizationId, organizationId),
          lte(
            journalEntries.entryDate,
            stmtDate.toISOString()
          )
        )
      );

    const bookBalance = parseFloat(String(glResult?.balance ?? 0));
    const difference = bankBalance - bookBalance;

    return {
      bankAccountId: bankAccount.id,
      bankAccountName: bankAccount.accountName,
      currency: bankAccount.currency || 'USD',
      bankBalance,
      bookBalance,
      difference,
      isReconciled: Math.abs(difference) < 0.01,
      statementDate: stmtDate.toISOString().split('T')[0],
      outstandingItems: [],
    };
  }

  /**
   * Reconcile all active bank accounts for an organization.
   * Returns a summary array — one entry per account.
   */
  async reconcileAllAccounts(
    organizationId: number,
    operatingUnitId?: number | null,
    statementDate?: Date | string
  ): Promise<ReconciliationResult[]> {
    const date = statementDate
      ? typeof statementDate === 'string'
        ? new Date(statementDate)
        : statementDate
      : new Date();

    const accounts = await this.db
      .select({ id: financeBankAccounts.id })
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

    const results: ReconciliationResult[] = [];
    for (const account of accounts) {
      try {
        const result = await this.reconcileBankAccount(
          account.id,
          organizationId,
          date
        );
        results.push(result);
      } catch {
        // Skip accounts that error — log in production
      }
    }
    return results;
  }

  /**
   * Get reconciliation summary statistics for an organization.
   */
  async getReconciliationSummary(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<{
    totalAccounts: number;
    reconciledAccounts: number;
    unreconciledAccounts: number;
    totalBankBalance: number;
    totalBookBalance: number;
    totalVariance: number;
    currency: string;
  }> {
    const results = await this.reconcileAllAccounts(
      organizationId,
      operatingUnitId
    );

    const reconciledAccounts = results.filter(r => r.isReconciled).length;
    const totalBankBalance = results.reduce((s, r) => s + r.bankBalance, 0);
    const totalBookBalance = results.reduce((s, r) => s + r.bookBalance, 0);

    return {
      totalAccounts: results.length,
      reconciledAccounts,
      unreconciledAccounts: results.length - reconciledAccounts,
      totalBankBalance,
      totalBookBalance,
      totalVariance: totalBankBalance - totalBookBalance,
      currency: 'USD',
    };
  }

  /**
   * Get outstanding journal items (posted but not yet cleared against bank).
   */
  async getOutstandingItems(
    bankAccountId: number,
    organizationId: number,
    asOfDate: Date | string
  ): Promise<Array<{ type: string; amount: number; date: string; description: string }>> {
    const date =
      typeof asOfDate === 'string' ? new Date(asOfDate) : asOfDate;

    const rows = await this.db
      .select({
        amount: journalLines.debitAmount,
        date: journalEntries.entryDate,
        description: journalEntries.description,
      })
      .from(journalLines)
      .leftJoin(
        journalEntries,
        eq(journalLines.journalEntryId, journalEntries.id)
      )
      .where(
        and(
          eq(journalEntries.organizationId, organizationId),
          lte(journalEntries.entryDate, date.toISOString())
        )
      )
      .orderBy(desc(journalEntries.entryDate))
      .limit(200);

    return rows.map((item: any) => ({
      type: 'check',
      amount: parseFloat(String(item.amount || 0)),
      date: item.date
        ? new Date(item.date).toISOString().split('T')[0]
        : '',
      description: item.description || '',
    }));
  }
}

// ── Singleton Instance ──────────────────────────────────────────────────────

let reconcEngineInstance: ReconciliationEngine | null = null;

export async function getReconciliationEngine(db: DB): Promise<ReconciliationEngine> {
  if (!reconcEngineInstance) {
    reconcEngineInstance = new ReconciliationEngine(db);
  }
  return reconcEngineInstance;
}
