/**
 * server/engines/finance/GeneralLedgerEngine.ts
 *
 * General Ledger Engine
 * Handles GL account resolution, posting, and account balance management.
 *
 * Responsibilities:
 * - GL account resolution and validation
 * - GL entry posting with double-entry validation
 * - Account balance calculations
 * - Audit trail management
 */

import { and, eq, gte, lte, sql, desc } from 'drizzle-orm';
import type { DB } from '../../db/_scope';
import {
  journalEntries,
  journalLines,
  glAccounts,
  glPostingEvents,
} from '../../../drizzle/schema';
import { nowSql } from '../../db/_time';

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

export interface AuditTrailEntry {
  entryDate: Date;
  description: string;
  debit?: number;
  credit?: number;
  reference?: string;
  createdBy: number;
}

// ── General Ledger Engine ────────────────────────────────────────────────────

export class GeneralLedgerEngine {
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
        balance: sql<number>`COALESCE(SUM(${journalLines.debitAmount}) - SUM(${journalLines.creditAmount}), 0)`,
      })
      .from(journalLines)
      .leftJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .where(
        and(
          eq(journalLines.glAccountId, glAccountId),
          eq(journalEntries.organizationId, organizationId),
          lte(journalEntries.entryDate, new Date().toISOString())
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
  ): Promise<AuditTrailEntry[]> {
    return await this.db
      .select({
        entryDate: journalEntries.entryDate,
        description: journalEntries.description,
        debit: journalLines.debitAmount,
        credit: journalLines.debitAmount,
        reference: journalLines.reference,
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

let glEngineInstance: GeneralLedgerEngine | null = null;

export async function getGeneralLedgerEngine(db: DB): Promise<GeneralLedgerEngine> {
  if (!glEngineInstance) {
    glEngineInstance = new GeneralLedgerEngine(db);
  }
  return glEngineInstance;
}
