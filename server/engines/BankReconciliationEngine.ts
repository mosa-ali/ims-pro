/**
 * server/engines/BankReconciliationEngine.ts
 *
 * Bank Reconciliation Engine
 * Handles bank statement matching, reconciliation, and variance investigation.
 *
 * Responsibilities:
 * - Match bank statements with GL entries
 * - Identify unmatched transactions
 * - Variance detection and investigation
 * - Reconciliation workflow management
 * - Bank statement import and parsing
 * - Reconciliation history and audit trail
 */

import { and, eq, sum, gte, lte, desc, sql, isNull } from 'drizzle-orm';
import type { DB } from '../db/_scope';
import {
  financeBankAccounts,
  payments,
  financeExpenditures,
  journalEntries,
} from '../../drizzle/schema';
import { getDb } from '../db';

// ── Types ────────────────────────────────────────────────────────────────────

export interface BankStatement {
  statementDate: string;
  openingBalance: number;
  closingBalance: number;
  deposits: number;
  withdrawals: number;
  transactions: BankTransaction[];
}

export interface BankTransaction {
  transactionDate: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  referenceNumber?: string;
  bankTransactionId: string;
}

export interface ReconciliationMatch {
  bankTransactionId: string;
  glTransactionId?: number;
  amount: number;
  matchStatus: 'matched' | 'pending' | 'unmatched';
  matchDate?: string;
  variance: number;
}

export interface ReconciliationReport {
  bankAccountId: number;
  statementDate: string;
  bankBalance: number;
  glBalance: number;
  variance: number;
  matchedTransactions: number;
  unmatchedBankTransactions: number;
  unmatchedGLTransactions: number;
  reconciliationStatus: 'reconciled' | 'in-progress' | 'unreconciled';
}

export interface ReconciliationVariance {
  varianceId: string;
  bankAccountId: number;
  amount: number;
  description: string;
  investigationStatus: 'open' | 'under-investigation' | 'resolved';
  rootCause?: string;
  resolutionDate?: string;
}

// ── Bank Reconciliation Engine ───────────────────────────────────────────────

export class BankReconciliationEngine {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Import and parse bank statement.
   */
  async importBankStatement(
    bankAccountId: number,
    statement: BankStatement
  ): Promise<{ success: boolean; transactionsImported: number }> {
    let importedCount = 0;

    for (const transaction of statement.transactions) {
      // Check if transaction already exists
      const existing = await this.db
        .select()
        .from(payments)
        .where(
          and(
            eq(payments.bankAccountId, bankAccountId),
            eq(payments.referenceNumber, transaction.bankTransactionId || '')
          )
        );

      if (existing.length === 0) {
        // Create new payment record from bank transaction
        await this.db.insert(payments).values({
          organizationId: 1,
          operatingUnitId: 1,
          bankAccountId: bankAccountId,
          paymentNumber: `BANK-${Date.now()}`,
          amount: String(transaction.amount),
          paymentDate: transaction.transactionDate,
          paymentType: 'other',
          paymentMethod: 'bank_transfer',
          payeeType: 'other',
          payeeName: transaction.description,
          referenceNumber: transaction.bankTransactionId,
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        importedCount++;
      }
    }

    return { success: true, transactionsImported: importedCount };
  }

  /**
   * Match bank transactions with GL entries.
   */
  async matchBankTransactions(
    bankAccountId: number,
    tolerance: number = 0.01
  ): Promise<ReconciliationMatch[]> {
    // Get unmatched bank transactions
    const bankTransactions = await this.db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.bankAccountId, bankAccountId),
          eq(payments.status, 'draft')
        )
      );

    const matches: ReconciliationMatch[] = [];

    for (const bankTxn of bankTransactions) {
      // Try to find matching GL entry
      const bankAmount = Number(bankTxn.amount) || 0;
      const glEntries = await this.db
        .select()
        .from(journalEntries)
        .where(
          and(
            eq(journalEntries.organizationId, bankTxn.organizationId || 0),
            sql`ABS(${journalEntries.totalDebit} - ${bankAmount}) <= ${tolerance}`
          )
        );

      if (glEntries.length > 0) {
        const glEntry = glEntries[0];
        const variance = Math.abs(Number(glEntry.totalDebit) - bankAmount);

        // Update GL entry with posting status
        await this.db
          .update(journalEntries)
          .set({
            postedAt: new Date().toISOString(),
            status: 'posted',
          })
          .where(eq(journalEntries.id, glEntry.id));

        // Update payment status
        await this.db
          .update(payments)
          .set({ status: 'paid' })
          .where(eq(payments.id, bankTxn.id));

        matches.push({
          bankTransactionId: bankTxn.referenceNumber || '',
          glTransactionId: glEntry.id,
          amount: bankAmount,
          matchStatus: 'matched',
          matchDate: new Date().toISOString().split('T')[0],
          variance,
        });
      } else {
        matches.push({
          bankTransactionId: bankTxn.referenceNumber || '',
          amount: bankAmount,
          matchStatus: 'unmatched',
          variance: bankAmount,
        });
      }
    }

    return matches;
  }

  /**
   * Generate reconciliation report.
   */
  async generateReconciliationReport(
    bankAccountId: number,
    statementDate: string
  ): Promise<ReconciliationReport> {
    // Get bank account balance
    const [bankAccount] = await this.db
      .select()
      .from(financeBankAccounts)
      .where(eq(financeBankAccounts.id, bankAccountId));

    const bankBalance = Number(bankAccount?.currentBalance) || 0;

    // Get GL balance for this account
    const [glResult] = await this.db
      .select({
        balance: sql<number>`COALESCE(SUM(${journalEntries.totalDebit}) - SUM(${journalEntries.totalCredit}), 0)`,
      })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.organizationId, bankAccountId),
          lte(journalEntries.entryDate, statementDate)
        )
      );

    const glBalance = Number(glResult?.balance) || 0;
    const variance = Number(bankBalance) - glBalance;

    // Get matched/unmatched transaction counts
    const [matchedResult] = await this.db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(payments)
      .where(
        and(
          eq(payments.bankAccountId, bankAccountId),
          eq(payments.status, 'paid')
        )
      );

    const [unmatchedBankResult] = await this.db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(payments)
      .where(
        and(
          eq(payments.bankAccountId, bankAccountId),
          eq(payments.status, 'draft')
        )
      );

    const [unmatchedGLResult] = await this.db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.organizationId, bankAccountId),
          eq(journalEntries.status, 'draft')
        )
      );

    const reconciliationStatus = Math.abs(variance) < 0.01 ? 'reconciled' : 'in-progress';

    return {
      bankAccountId,
      statementDate,
      bankBalance,
      glBalance,
      variance,
      matchedTransactions: Number(matchedResult?.count ?? 0),
      unmatchedBankTransactions: Number(unmatchedBankResult?.count ?? 0),
      unmatchedGLTransactions: Number(unmatchedGLResult?.count ?? 0),
      reconciliationStatus: reconciliationStatus as 'reconciled' | 'in-progress' | 'unreconciled',
    };
  }

  /**
   * Identify reconciliation variances.
   */
  async identifyVariances(bankAccountId: number): Promise<ReconciliationVariance[]> {
    const variances: ReconciliationVariance[] = [];

    // Get unmatched bank transactions
    const unmatchedBank = await this.db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.bankAccountId, bankAccountId),
          eq(payments.status, 'draft')
        )
      );

    for (const txn of unmatchedBank) {
      variances.push({
        varianceId: `VAR-${txn.id}`,
        bankAccountId,
        amount: Number(txn.amount) || 0,
        description: `Unmatched bank transaction: ${txn.description}`,
        investigationStatus: 'open',
      });
    }

    // Get unmatched GL transactions
    const unmatchedGL = await this.db
      .select()
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.organizationId, bankAccountId),
          eq(journalEntries.status, 'draft')
        )
      );

    for (const entry of unmatchedGL) {
      variances.push({
        varianceId: `VAR-GL-${entry.id}`,
        bankAccountId,
        amount: Number(entry.totalDebit) || 0,
        description: `Unmatched GL entry: ${entry.description}`,
        investigationStatus: 'open',
      });
    }

    return variances;
  }

  /**
   * Record variance investigation.
   */
  async recordVarianceInvestigation(
    varianceId: string,
    rootCause: string,
    resolutionAction: string
  ): Promise<void> {
    // This would typically update a variance tracking table
    // For now, we'll just log the investigation
    console.log(`Variance ${varianceId} investigated:`, {
      rootCause,
      resolutionAction,
      investigatedAt: new Date(),
    });
  }

  /**
   * Get reconciliation history.
   */
  async getReconciliationHistory(bankAccountId: number, months: number = 12) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const history = await this.db
      .select({
        postedAt: journalEntries.postedAt,
        count: sql<number>`COUNT(*)`,
        totalAmount: sql<number>`COALESCE(SUM(${journalEntries.totalDebit}), 0)`,
      })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.organizationId, bankAccountId),
          gte(journalEntries.postedAt, startDate.toISOString())
        )
      )
      .groupBy(journalEntries.postedAt)
      .orderBy(desc(journalEntries.postedAt));

    return history;
  }

  /**
   * Get reconciliation status by account.
   */
  async getReconciliationStatus(organizationId: number) {
    const accounts = await this.db
      .select()
      .from(financeBankAccounts)
      .where(eq(financeBankAccounts.organizationId, organizationId));

    const status = [];

    for (const account of accounts) {
      const report = await this.generateReconciliationReport(
        account.id,
        new Date().toISOString().split('T')[0]
      );
      status.push(report);
    }

    return status;
  }
}

// ── Singleton Instance ──────────────────────────────────────────────────────

let bankReconciliationEngineInstance: BankReconciliationEngine | null = null;

export async function getBankReconciliationEngine(): Promise<BankReconciliationEngine> {
  if (!bankReconciliationEngineInstance) {
    const db = await getDb();
    bankReconciliationEngineInstance = new BankReconciliationEngine(db);
  }
  return bankReconciliationEngineInstance;
}

export const bankReconciliationEngine = {
  importBankStatement: async (bankAccountId: number, statement: BankStatement) => {
    const engine = await getBankReconciliationEngine();
    return engine.importBankStatement(bankAccountId, statement);
  },
  matchBankTransactions: async (bankAccountId: number, tolerance?: number) => {
    const engine = await getBankReconciliationEngine();
    return engine.matchBankTransactions(bankAccountId, tolerance);
  },
  generateReconciliationReport: async (bankAccountId: number, statementDate: string) => {
    const engine = await getBankReconciliationEngine();
    return engine.generateReconciliationReport(bankAccountId, statementDate);
  },
  identifyVariances: async (bankAccountId: number) => {
    const engine = await getBankReconciliationEngine();
    return engine.identifyVariances(bankAccountId);
  },
  recordVarianceInvestigation: async (varianceId: string, rootCause: string, resolutionAction: string) => {
    const engine = await getBankReconciliationEngine();
    return engine.recordVarianceInvestigation(varianceId, rootCause, resolutionAction);
  },
  getReconciliationHistory: async (bankAccountId: number, months?: number) => {
    const engine = await getBankReconciliationEngine();
    return engine.getReconciliationHistory(bankAccountId, months);
  },
  getReconciliationStatus: async (organizationId: number) => {
    const engine = await getBankReconciliationEngine();
    return engine.getReconciliationStatus(organizationId);
  },
};
