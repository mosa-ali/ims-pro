/**
 * server/services/journalPostingService.ts
 *
 * Centralized GL journal entry posting service.
 *
 * ALL financial events that affect the general ledger must flow through
 * this service.  Posting is always called INSIDE a db.transaction() so
 * the financial state change and the GL entry are atomically committed
 * or both rolled back.
 *
 * POSTING MAP (double-entry):
 *
 * Payment completion (vendor payment):
 *   DR  Accounts Payable       (liability decreases)
 *   CR  Bank / Cash Account    (asset decreases)
 *
 * Expenditure approval (direct expense):
 *   DR  Expense Account        (expense increases)
 *   CR  Accounts Payable       (liability increases)
 *
 * Advance issuance:
 *   DR  Staff Advances         (asset increases)
 *   CR  Bank / Cash Account    (asset decreases)
 *
 * Advance settlement:
 *   DR  Expense Account        (actual expense recorded)
 *   CR  Staff Advances         (asset decreases)
 *   DR/CR  Bank/Cash           (refund or additional payment if any)
 *
 * USAGE — always pass the transaction context:
 *
 *   await db.transaction(async (tx) => {
 *     await tx.update(payments).set({ status: 'completed' })...;
 *     const jeId = await postPaymentToGL(tx, payment, userId);
 *     await tx.update(payments).set({ journalEntryId: jeId })...;
 *   });
 */

import { eq, and, sql } from 'drizzle-orm';
import { glAccounts, journalEntries, journalLines } from '../../../drizzle/schema';
import { getNextFinanceSequence } from './sequenceService';

// ── Types ────────────────────────────────────────────────────────────────────

type TX = Parameters<Parameters<Awaited<ReturnType<typeof import('../../db').getDb>>['transaction']>[0]>[0];

interface PaymentRecord {
  id: number;
  organizationId: number;
  operatingUnitId?: number | null;
  paymentNumber?: string | null;
  paymentDate?: string | Date | null;
  totalAmount?: string | number | null;
  amount?: string | number | null;
  vendorId?: number | null;
  projectId?: number | null;
  grantId?: number | null;
  description?: string | null;
  payableId?: number | null;
}

interface ExpenditureRecord {
  id: number;
  organizationId: number;
  operatingUnitId?: number | null;
  expenditureNumber?: string | null;
  expenditureDate?: string | Date | null;
  amount?: string | number | null;
  vendorId?: number | null;
  projectId?: number | null;
  grantId?: number | null;
  budgetLineId?: number | null;
  glAccountId?: number | null;
  description?: string | null;
}

interface AdvanceRecord {
  id: number;
  organizationId: number;
  operatingUnitId?: number | null;
  advanceNumber?: string | null;
  requestDate?: string | Date | null;
  approvedAmount?: string | number | null;
  currency?: string | null;
  projectId?: number | null;
  grantId?: number | null;
  employeeName?: string | null;
}

// ── GL Account Resolution ────────────────────────────────────────────────────

/**
 * Find a GL account by its type tag for a given organization.
 * Falls back to a default account code if the tag is not configured.
 *
 * In production, you would maintain a `finance_gl_account_mappings` table
 * keyed by (organizationId, accountTag) that maps event types to specific
 * GL accounts.  This helper is a pragmatic fallback that uses account type.
 */
async function resolveGLAccount(
  tx: TX,
  organizationId: number,
  accountType: 'bank' | 'cash' | 'payable' | 'expense' | 'advance'
): Promise<number | null> {
  const typeMap: Record<string, string[]> = {
    bank:    ['bank'],
    cash:    ['cash'],
    payable: ['liability'],
    expense: ['expense'],
    advance: ['asset'],
  };

  const accountTypes = typeMap[accountType] ?? [];

  for (const t of accountTypes) {
    const [account] = await (tx as any)
      .select({ id: glAccounts.id })
      .from(glAccounts)
      .where(
        and(
          eq(glAccounts.organizationId, organizationId),
          eq(glAccounts.accountType, t),
          eq(glAccounts.isActive, 1),
          ...(accountType === 'bank'    ? [eq(glAccounts.isBankAccount, 1)] : []),
          ...(accountType === 'cash'    ? [eq(glAccounts.isCashAccount, 1)] : []),
        )
      )
      .limit(1)
      .catch(() => [null]);

    if (account?.id) return account.id;
  }

  return null;
}

// ── Entry Number ─────────────────────────────────────────────────────────────

async function nextJENumber(organizationId: number): Promise<string> {
  return getNextFinanceSequence(organizationId, 'JE');
}

// ── Core Insert ──────────────────────────────────────────────────────────────

interface JELine {
  lineNumber: number;
  glAccountId: number;
  description?: string;
  debitAmount: string;
  creditAmount: string;
  projectId?: number | null;
  grantId?: number | null;
  vendorId?: number | null;
  budgetLineId?: number | null;
}

async function insertJournalEntry(
  tx: TX,
  params: {
    organizationId: number;
    operatingUnitId?: number | null;
    entryNumber: string;
    entryDate: string;
    sourceModule: string;
    sourceDocumentId: number;
    sourceDocumentType: string;
    description: string;
    projectId?: number | null;
    grantId?: number | null;
    createdBy: number;
    lines: JELine[];
  }
): Promise<number> {
  // Validate balance before writing
  const totalDebit  = params.lines.reduce((s, l) => s + parseFloat(l.debitAmount),  0);
  const totalCredit = params.lines.reduce((s, l) => s + parseFloat(l.creditAmount), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.005) {
    throw new Error(
      `Journal entry does not balance. DR=${totalDebit.toFixed(2)} CR=${totalCredit.toFixed(2)}`
    );
  }

  const [result] = await (tx as any).insert(journalEntries).values({
    organizationId:    params.organizationId,
    operatingUnitId:   params.operatingUnitId ?? null,
    entryNumber:       params.entryNumber,
    entryDate:         new Date(params.entryDate),
    entryType:         'standard',
    sourceModule:      params.sourceModule,
    sourceDocumentId:  params.sourceDocumentId,
    sourceDocumentType: params.sourceDocumentType,
    description:       params.description,
    projectId:         params.projectId ?? null,
    grantId:           params.grantId   ?? null,
    status:            'posted',   // Auto-post — manual review via reverse if needed
    postedAt:          new Date(),
    postedBy:          params.createdBy,
    createdBy:         params.createdBy,
  });

  const journalEntryId = Number(result.insertId);

  const lineValues = params.lines.map((line) => ({
    journalEntryId,
    lineNumber:   line.lineNumber,
    glAccountId:  line.glAccountId,
    description:  line.description ?? null,
    debitAmount:  line.debitAmount,
    creditAmount: line.creditAmount,
    projectId:    line.projectId  ?? null,
    grantId:      line.grantId    ?? null,
    vendorId:     line.vendorId   ?? null,
    budgetLineId: line.budgetLineId ?? null,
  }));

  await (tx as any).insert(journalLines).values(lineValues);

  return journalEntryId;
}

// ── PUBLIC API ───────────────────────────────────────────────────────────────

/**
 * Post a payment completion to the GL.
 *
 * DR  Accounts Payable  (liability decreases — we owe less)
 * CR  Bank / Cash       (asset decreases — cash leaves)
 *
 * Called inside paymentsRouter.complete() transaction.
 */
export async function postPaymentToGL(
  tx: TX,
  payment: PaymentRecord,
  userId: number
): Promise<number> {
  const orgId  = payment.organizationId;
  const amount = parseFloat(String(payment.totalAmount ?? payment.amount ?? '0')).toFixed(2);
  const date   = payment.paymentDate
    ? new Date(payment.paymentDate).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const [payableAccountId, bankAccountId] = await Promise.all([
    resolveGLAccount(tx, orgId, 'payable'),
    resolveGLAccount(tx, orgId, 'bank'),
  ]);

  if (!payableAccountId || !bankAccountId) {
    throw new Error(
      `GL accounts not configured for organization ${orgId}. ` +
      `Ensure at least one liability account (payable) and one bank account exist in gl_accounts.`
    );
  }

  const entryNumber = await nextJENumber(orgId);

  return insertJournalEntry(tx, {
    organizationId:    orgId,
    operatingUnitId:   payment.operatingUnitId,
    entryNumber,
    entryDate:         date,
    sourceModule:      'procurement',
    sourceDocumentId:  payment.id,
    sourceDocumentType: 'payment',
    description:       `Payment ${payment.paymentNumber ?? payment.id}`,
    projectId:         payment.projectId,
    grantId:           payment.grantId,
    createdBy:         userId,
    lines: [
      {
        lineNumber:   1,
        glAccountId:  payableAccountId,
        description:  `Clear payable — ${payment.paymentNumber ?? payment.id}`,
        debitAmount:  amount,
        creditAmount: '0.00',
        projectId:    payment.projectId,
        grantId:      payment.grantId,
        vendorId:     payment.vendorId,
      },
      {
        lineNumber:   2,
        glAccountId:  bankAccountId,
        description:  `Bank disbursement — ${payment.paymentNumber ?? payment.id}`,
        debitAmount:  '0.00',
        creditAmount: amount,
        projectId:    payment.projectId,
        grantId:      payment.grantId,
        vendorId:     payment.vendorId,
      },
    ],
  });
}

/**
 * Post an approved expenditure to the GL.
 *
 * DR  Expense Account   (expense incurred)
 * CR  Accounts Payable  (liability created — will be cleared on payment)
 *
 * Called inside expendituresRouter.approve() transaction.
 */
export async function postExpenditureToGL(
  tx: TX,
  expenditure: ExpenditureRecord,
  userId: number
): Promise<number> {
  const orgId  = expenditure.organizationId;
  const amount = parseFloat(String(expenditure.amount ?? '0')).toFixed(2);
  const date   = expenditure.expenditureDate
    ? new Date(expenditure.expenditureDate).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  // Use expenditure's own GL account if specified, otherwise resolve by type
  const expenseAccountId = expenditure.glAccountId
    ?? await resolveGLAccount(tx, orgId, 'expense');
  const payableAccountId = await resolveGLAccount(tx, orgId, 'payable');

  if (!expenseAccountId || !payableAccountId) {
    throw new Error(
      `GL accounts not configured for organization ${orgId}. ` +
      `Ensure expense and liability accounts exist in gl_accounts.`
    );
  }

  const entryNumber = await nextJENumber(orgId);

  return insertJournalEntry(tx, {
    organizationId:    orgId,
    operatingUnitId:   expenditure.operatingUnitId,
    entryNumber,
    entryDate:         date,
    sourceModule:      'expense',
    sourceDocumentId:  expenditure.id,
    sourceDocumentType: 'expenditure',
    description:       `Expenditure approved — ${expenditure.expenditureNumber ?? expenditure.id}`,
    projectId:         expenditure.projectId,
    grantId:           expenditure.grantId,
    createdBy:         userId,
    lines: [
      {
        lineNumber:   1,
        glAccountId:  expenseAccountId,
        description:  expenditure.description ?? 'Expenditure',
        debitAmount:  amount,
        creditAmount: '0.00',
        projectId:    expenditure.projectId,
        grantId:      expenditure.grantId,
        vendorId:     expenditure.vendorId,
        budgetLineId: expenditure.budgetLineId,
      },
      {
        lineNumber:   2,
        glAccountId:  payableAccountId,
        description:  `Payable created — ${expenditure.expenditureNumber ?? expenditure.id}`,
        debitAmount:  '0.00',
        creditAmount: amount,
        projectId:    expenditure.projectId,
        grantId:      expenditure.grantId,
        vendorId:     expenditure.vendorId,
      },
    ],
  });
}

/**
 * Post an approved advance issuance to the GL.
 *
 * DR  Staff Advances Receivable  (asset increases)
 * CR  Bank / Cash                (asset decreases)
 */
export async function postAdvanceToGL(
  tx: TX,
  advance: AdvanceRecord,
  userId: number
): Promise<number> {
  const orgId  = advance.organizationId;
  const amount = parseFloat(String(advance.approvedAmount ?? '0')).toFixed(2);
  const date   = advance.requestDate
    ? new Date(advance.requestDate).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const [advanceAccountId, bankAccountId] = await Promise.all([
    resolveGLAccount(tx, orgId, 'advance'),
    resolveGLAccount(tx, orgId, 'bank'),
  ]);

  if (!advanceAccountId || !bankAccountId) {
    throw new Error(`GL accounts not configured for organization ${orgId}.`);
  }

  const entryNumber = await nextJENumber(orgId);

  return insertJournalEntry(tx, {
    organizationId:    orgId,
    operatingUnitId:   advance.operatingUnitId,
    entryNumber,
    entryDate:         date,
    sourceModule:      'advance',
    sourceDocumentId:  advance.id,
    sourceDocumentType: 'advance',
    description:       `Advance issued — ${advance.advanceNumber ?? advance.id} — ${advance.employeeName ?? ''}`,
    projectId:         advance.projectId,
    grantId:           advance.grantId,
    createdBy:         userId,
    lines: [
      {
        lineNumber:   1,
        glAccountId:  advanceAccountId,
        description:  `Staff advance receivable — ${advance.employeeName ?? advance.id}`,
        debitAmount:  amount,
        creditAmount: '0.00',
        projectId:    advance.projectId,
        grantId:      advance.grantId,
      },
      {
        lineNumber:   2,
        glAccountId:  bankAccountId,
        description:  `Cash disbursed — advance ${advance.advanceNumber ?? advance.id}`,
        debitAmount:  '0.00',
        creditAmount: amount,
        projectId:    advance.projectId,
        grantId:      advance.grantId,
      },
    ],
  });
}

/**
 * Reverse an existing posted journal entry.
 * Creates a new entry with all debits/credits swapped.
 * Marks the original as 'reversed'.
 *
 * Used for: payment voids, expenditure cancellations, period corrections.
 */
export async function reverseJournalEntry(
  tx: TX,
  originalEntryId: number,
  organizationId: number,
  userId: number,
  reason: string
): Promise<number> {
  // Load original entry and lines
  const [original] = await (tx as any)
    .select()
    .from(journalEntries)
    .where(and(
      eq(journalEntries.id, originalEntryId),
      eq(journalEntries.organizationId, organizationId)
    ))
    .limit(1);

  if (!original) {
    throw new Error(`Journal entry ${originalEntryId} not found`);
  }
  if (original.status !== 'posted') {
    throw new Error(`Only posted entries can be reversed. Entry status: ${original.status}`);
  }

  const originalLines = await (tx as any)
    .select()
    .from(journalLines)
    .where(eq(journalLines.journalEntryId, originalEntryId));

  // Mark original as reversed
  await (tx as any)
    .update(journalEntries)
    .set({ status: 'reversed', reversedAt: new Date(), reversedBy: userId })
    .where(eq(journalEntries.id, originalEntryId));

  const entryNumber = await nextJENumber(organizationId);
  const today = new Date().toISOString().slice(0, 10);

  // Insert reversal entry with swapped DR/CR
  return insertJournalEntry(tx, {
    organizationId,
    operatingUnitId:   original.operatingUnitId,
    entryNumber,
    entryDate:         today,
    sourceModule:      original.sourceModule,
    sourceDocumentId:  original.sourceDocumentId,
    sourceDocumentType: original.sourceDocumentType,
    description:       `REVERSAL of ${original.entryNumber} — ${reason}`,
    projectId:         original.projectId,
    grantId:           original.grantId,
    createdBy:         userId,
    lines: originalLines.map((line: any, i: number) => ({
      lineNumber:   i + 1,
      glAccountId:  line.glAccountId,
      description:  `Reversal: ${line.description ?? ''}`,
      debitAmount:  line.creditAmount,   // swap
      creditAmount: line.debitAmount,    // swap
      projectId:    line.projectId,
      grantId:      line.grantId,
      vendorId:     line.vendorId,
      budgetLineId: line.budgetLineId,
    })),
  });
}

// ── Legacy adapter (used by existing autoJournalEntryService import) ─────────
// expendituresRouter and paymentsRouter import `generatePaymentJournalEntry`
// from './services/autoJournalEntryService'.  Provide that export here so
// the existing import does not break while you consolidate services.

export async function generatePaymentJournalEntry(
  payment: PaymentRecord,
  userId: number,
  tx?: TX
): Promise<number> {
  if (!tx) {
    throw new Error(
      'generatePaymentJournalEntry must be called with a transaction context (tx). ' +
      'GL posting outside a transaction is not permitted.'
    );
  }
  return postPaymentToGL(tx, payment, typeof userId === 'number' ? userId : 0);
}

export async function generateExpenseJournalEntry(
  expenditure: ExpenditureRecord,
  userId: number,
  tx?: TX
): Promise<number> {
  if (!tx) {
    throw new Error(
      'generateExpenseJournalEntry must be called with a transaction context (tx).'
    );
  }
  return postExpenditureToGL(tx, expenditure, typeof userId === 'number' ? userId : 0);
}
