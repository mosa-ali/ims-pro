/**
 * server/engines/FinanceEngine.ts
 *
 * Core Financial Engine
 * Handles GL posting, reconciliation, financial calculations, and reporting.
 *
 * Responsibilities:
 * - GL account resolution and posting
 * - Journal entry creation and validation
 * - Bank reconciliation
 * - Trial balance generation
 * - Financial statement preparation
 * - Audit trail management
 */

import { and, eq, gte, lte, sum, count, desc, sql } from 'drizzle-orm';
import type { DB, ScopeContext } from '../db/_scope';
import {
  journalEntries,
  journalLines,
  glAccounts,
  payments,
  financeExpenditures,
  financeBankAccounts,
  glPostingEvents,
} from '../../drizzle/schema';
import { getDb } from '../db';
import { nowSql } from '../db/_time';

// ── Types ────────────────────────────────────────────────────────────────────

export interface GLPostingRequest {
  organizationId: number;
  operatingUnitId?: number | null;
  transactionDate: Date | string;
  description: string;
  reference?: string;
  entries: Array<{
    glAccountId: number;
    debit?: number | string;
    credit?: number | string;
    lineDescription?: string;
  }>;
  sourceType: 'payment' | 'expenditure' | 'advance' | 'journal' | 'manual';
  sourceId?: number;
}

export interface ReconciliationResult {
  bankBalance: number;
  bookBalance: number;
  difference: number;
  isReconciled: boolean;
  outstandingItems: Array<{
    type: 'check' | 'deposit' | 'fee' | 'interest';
    amount: number;
    date: string;
    description: string;
  }>;
}

export interface TrialBalance {
  accountCode: string;
  accountName: string;
  accountType: string;
  debitBalance: number;
  creditBalance: number;
  balance: number;
}

export interface FinancialStatementData {
  period: string;
  assets: number;
  liabilities: number;
  equity: number;
  revenue: number;
  expenses: number;
  netIncome: number;
}

// ── Finance Engine ──────────────────────────────────────────────────────────

export class FinanceEngine {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Post a GL entry with double-entry validation.
   * All debits must equal all credits.
   */
  async postGLEntry(request: GLPostingRequest, userId: number): Promise<number> {
    return await this.db.transaction(async (tx) => {
      // Validate double-entry: sum(debits) === sum(credits)
      const totalDebits = request.entries.reduce((sum, e) => sum + (parseFloat(String(e.debit || 0))), 0);
      const totalCredits = request.entries.reduce((sum, e) => sum + (parseFloat(String(e.credit || 0))), 0);

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        throw new Error(`GL entry out of balance: DR ${totalDebits} ≠ CR ${totalCredits}`);
      }

      // Create journal entry header
      const [je] = await tx
        .insert(journalEntries)
        .values({
          organizationId: request.organizationId,
          operatingUnitId: request.operatingUnitId,
          entryDate: typeof request.transactionDate === 'string'
            ? new Date(request.transactionDate)
            : request.transactionDate,
          description: request.description,
          reference: request.reference,
          status: 'posted',
          createdBy: userId,
          updatedBy: userId,
          createdAt: nowSql(),
          updatedAt: nowSql(),
        })
        .returning({ id: journalEntries.id });

      // Create journal lines
      for (const entry of request.entries) {
        await tx
          .insert(journalLines)
          .values({
            journalEntryId: je.id,
            glAccountId: entry.glAccountId,
            debit: entry.debit ? parseFloat(String(entry.debit)) : null,
            credit: entry.credit ? parseFloat(String(entry.credit)) : null,
            description: entry.lineDescription || request.description,
            createdBy: userId,
            updatedBy: userId,
            createdAt: nowSql(),
            updatedAt: nowSql(),
          });
      }

      // Log posting event for audit trail
      await tx
        .insert(glPostingEvents)
        .values({
          organizationId: request.organizationId,
          journalEntryId: je.id,
          sourceType: request.sourceType,
          sourceId: request.sourceId,
          eventType: 'posted',
          eventDate: nowSql(),
          createdBy: userId,
        });

      return je.id;
    });
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
        accountName: glAccounts.accountName,
        accountType: glAccounts.accountType,
        debitBalance: sql<number>`COALESCE(SUM(CASE WHEN ${journalLines.debitAmount IS NOT NULL THEN ${journalLines.debitAmount ELSE 0 END), 0)`,
        creditBalance: sql<number>`COALESCE(SUM(CASE WHEN ${journalLines.credit} IS NOT NULL THEN ${journalLines.credit} ELSE 0 END), 0)`,
      })
      .from(glAccounts)
      .leftJoin(journalLines, eq(glAccounts.id, journalLines.glAccountId))
      .leftJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .where(
        and(
          eq(glAccounts.organizationId, organizationId),
          eq(journalEntries.organizationId, organizationId),
          gte(journalEntries.entryDate, start),
          lte(journalEntries.entryDate, end)
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
   * Reconcile bank account with GL records.
   */
  async reconcileBankAccount(
    bankAccountId: number,
    organizationId: number,
    statementDate: Date | string
  ): Promise<ReconciliationResult> {
    const stmtDate = typeof statementDate === 'string' ? new Date(statementDate) : statementDate;

    // Get bank account balance from statement
    const [bankAccount] = await this.db
      .select()
      .from(financeBankAccounts)
      .where(
        and(
          eq(financeBankAccounts.id, bankAccountId),
          eq(financeBankAccounts.organizationId, organizationId)
        )
      );

    if (!bankAccount) {
      throw new Error(`Bank account ${bankAccountId} not found`);
    }

    // Calculate book balance from GL
    const [glBalance] = await this.db
      .select({
        balance: sql<number>`COALESCE(SUM(${journalLines.debitAmount}) - SUM(${journalLines.credit}), 0)`,
      })
      .from(journalLines)
      .leftJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .where(
        and(
          eq(journalEntries.organizationId, organizationId),
          lte(journalEntries.entryDate, stmtDate)
        )
      );

    const bookBalance = glBalance?.balance || 0;
    const bankBalance = bankAccount.currentBalance || 0;
    const difference = bankBalance - bookBalance;

    return {
      bankBalance,
      bookBalance,
      difference,
      isReconciled: Math.abs(difference) < 0.01,
      outstandingItems: [],
    };
  }

  /**
   * Get financial statement data for a period.
   */
  async getFinancialStatementData(
    organizationId: number,
    startDate: Date | string,
    endDate: Date | string
  ): Promise<FinancialStatementData> {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

    const results = await this.db
      .select({
        accountType: glAccounts.accountType,
        balance: sql<number>`COALESCE(SUM(${journalLines.debitAmount}) - SUM(${journalLines.credit}), 0)`,
      })
      .from(glAccounts)
      .leftJoin(journalLines, eq(glAccounts.id, journalLines.glAccountId))
      .leftJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .where(
        and(
          eq(glAccounts.organizationId, organizationId),
          eq(journalEntries.organizationId, organizationId),
          gte(journalEntries.entryDate, start),
          lte(journalEntries.entryDate, end)
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
   * Get GL account balance at a specific date.
   */
  async getAccountBalance(
    glAccountId: number,
    organizationId: number,
    asOfDate: Date | string
  ): Promise<number> {
    const date = typeof asOfDate === 'string' ? new Date(asOfDate) : asOfDate;

    const [result] = await this.db
      .select({
        balance: sql<number>`COALESCE(SUM(${journalLines.debitAmount}) - SUM(${journalLines.credit}), 0)`,
      })
      .from(journalLines)
      .leftJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .where(
        and(
          eq(journalLines.glAccountId, glAccountId),
          eq(journalEntries.organizationId, organizationId),
          lte(journalEntries.entryDate, date)
        )
      );

    return result?.balance || 0;
  }

  /**
   * Get audit trail for a GL account.
   */
  async getAuditTrail(
    glAccountId: number,
    organizationId: number,
    limit: number = 100
  ): Promise<Array<any>> {
    return await this.db
      .select({
        entryDate: journalEntries.entryDate,
        description: journalEntries.description,
        debit: journalLines.debitAmount,
        credit: journalLines.credit,
        reference: journalEntries.reference,
        createdBy: journalEntries.createdBy,
      })
      .from(journalLines)
      .leftJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .where(
        and(
          eq(journalLines.glAccountId, glAccountId),
          eq(journalEntries.organizationId, organizationId)
        )
      )
      .orderBy(desc(journalEntries.entryDate))
      .limit(limit);
  }
}

// ── Singleton Instance ──────────────────────────────────────────────────────

let financeEngineInstance: FinanceEngine | null = null;

export async function getFinanceEngine(): Promise<FinanceEngine> {
  if (!financeEngineInstance) {
    const db = await getDb();
    financeEngineInstance = new FinanceEngine(db);
  }
  return financeEngineInstance;
}

export const financeEngine = {
  postGLEntry: async (req: GLPostingRequest, userId: number) => {
    const engine = await getFinanceEngine();
    return engine.postGLEntry(req, userId);
  },
  generateTrialBalance: async (orgId: number, start: Date | string, end: Date | string) => {
    const engine = await getFinanceEngine();
    return engine.generateTrialBalance(orgId, start, end);
  },
  reconcileBankAccount: async (bankId: number, orgId: number, date: Date | string) => {
    const engine = await getFinanceEngine();
    return engine.reconcileBankAccount(bankId, orgId, date);
  },
  getFinancialStatementData: async (orgId: number, start: Date | string, end: Date | string) => {
    const engine = await getFinanceEngine();
    return engine.getFinancialStatementData(orgId, start, end);
  },
  getAccountBalance: async (glAcctId: number, orgId: number, date: Date | string) => {
    const engine = await getFinanceEngine();
    return engine.getAccountBalance(glAcctId, orgId, date);
  },
  getAuditTrail: async (glAcctId: number, orgId: number, limit?: number) => {
    const engine = await getFinanceEngine();
    return engine.getAuditTrail(glAcctId, orgId, limit);
  },
};
