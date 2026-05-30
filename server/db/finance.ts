/**
 * db/finance.ts — Finance Query Helpers
 *
 * Reusable query helpers for the Finance module.
 *
 * Standards:
 *  - All timestamps use nowSql() — never sql`NOW()`
 *  - All status values use finance status constants — never hardcoded strings
 *  - All queries use scopedAndActive() — never inline eq(organizationId, ...)
 *  - Soft deletes use buildSoftDeletePayload() — never inline isDeleted=1
 *  - db parameter typed as DB — never `db: any`
 *  - Approval/rejection/payment workflows use db.transaction() for atomicity
 */

import { and, eq, isNull, desc, gte, lte, count, sql } from 'drizzle-orm';
import {
  budgets,
  budgetLines,
  financeExpenditures,
  financePeriods,
  payments,
  glPostingEvents,
  chartOfAccounts,
} from '../../drizzle/schema';
import type { DB, ScopeContext } from './_scope';
import {
  scopedAndActive,
  withScope,
  onlyDeleted,
  buildUpdatePayload,
  buildSoftDeletePayload,
  buildRestorePayload,
  buildApprovalPayload,
  buildRejectionPayload,
} from './_scope';
import { nowSql } from './_time';
import {
  BUDGET_STATUS,
  EXPENDITURE_STATUS,
  PAYMENT_STATUS,
  FINANCE_PERIOD_STATUS,
  GL_POSTING_STATUS,
  POSTING_STATUS,
  type BudgetStatus,
  type ExpenditureStatus,
  type PaymentStatus,
  type FinancePeriodStatus,
} from './_status';

// ============================================================
// BUDGETS
// ============================================================

/**
 * List budgets for a given scope.
 */
export async function listBudgets(
  db: DB,
  ctx: ScopeContext,
  options: { status?: BudgetStatus | 'all'; limit?: number; offset?: number } = {}
) {
  const { status, limit = 100, offset = 0 } = options;
  const conditions = scopedAndActive(budgets, ctx);

  if (status && status !== 'all') {
    conditions.push(eq(budgets.status, status));
  }

  return db
    .select()
    .from(budgets)
    .where(and(...conditions))
    .orderBy(desc(budgets.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Get a single budget by ID with scope validation.
 */
export async function getBudget(db: DB, budgetId: number, ctx: ScopeContext) {
  const [budget] = await db
    .select()
    .from(budgets)
    .where(and(
      eq(budgets.id, budgetId),
      ...scopedAndActive(budgets, ctx),
    ))
    .limit(1);
  return budget ?? null;
}

/**
 * Submit a budget for approval (draft → submitted).
 */
export async function submitBudget(
  db: DB,
  budgetId: number,
  userId: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(budgets)
    .set(buildUpdatePayload({
      status: BUDGET_STATUS.SUBMITTED,
      submittedAt: nowSql(),
      submittedBy: userId,
      updatedBy: userId,
    }))
    .where(and(
      eq(budgets.id, budgetId),
      eq(budgets.status, BUDGET_STATUS.DRAFT),
      ...scopedAndActive(budgets, ctx),
    ));
}

/**
 * Approve a budget (submitted → approved). Atomic transaction.
 */
export async function approveBudget(
  db: DB,
  budgetId: number,
  approvedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db.transaction(async (tx) => {
    const [record] = await tx
      .select({ id: budgets.id, status: budgets.status })
      .from(budgets)
      .where(and(
        eq(budgets.id, budgetId),
        ...scopedAndActive(budgets, ctx),
      ))
      .limit(1);

    if (!record) throw new Error(`Budget ${budgetId} not found or out of scope`);
    if (record.status !== BUDGET_STATUS.SUBMITTED) {
      throw new Error(`Budget ${budgetId} is not in submitted status`);
    }

    await tx
      .update(budgets)
      .set(buildApprovalPayload(approvedBy, BUDGET_STATUS.APPROVED))
      .where(eq(budgets.id, budgetId));
  });
}

/**
 * Reject a budget.
 */
export async function rejectBudget(
  db: DB,
  budgetId: number,
  rejectedBy: number,
  reason: string,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(budgets)
    .set(buildRejectionPayload(rejectedBy, BUDGET_STATUS.REJECTED, reason))
    .where(and(
      eq(budgets.id, budgetId),
      eq(budgets.status, BUDGET_STATUS.SUBMITTED),
      ...scopedAndActive(budgets, ctx),
    ));
}

/**
 * Soft-delete a budget.
 */
export async function softDeleteBudget(
  db: DB,
  budgetId: number,
  userId: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(budgets)
    .set(buildSoftDeletePayload(userId))
    .where(and(
      eq(budgets.id, budgetId),
      ...scopedAndActive(budgets, ctx),
    ));
}

// ============================================================
// EXPENDITURES
// ============================================================

/**
 * List expenditures for a given scope.
 */
export async function listExpenditures(
  db: DB,
  ctx: ScopeContext,
  options: { status?: ExpenditureStatus | 'all'; limit?: number; offset?: number } = {}
) {
  const { status, limit = 100, offset = 0 } = options;
  const conditions = scopedAndActive(financeExpenditures, ctx);

  if (status && status !== 'all') {
    conditions.push(eq(financeExpenditures.status, status));
  }

  return db
    .select()
    .from(financeExpenditures)
    .where(and(...conditions))
    .orderBy(desc(financeExpenditures.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Approve an expenditure. Atomic transaction.
 */
export async function approveExpenditure(
  db: DB,
  expenditureId: number,
  approvedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db.transaction(async (tx) => {
    const [record] = await tx
      .select({ id: financeExpenditures.id, status: financeExpenditures.status })
      .from(financeExpenditures)
      .where(and(
        eq(financeExpenditures.id, expenditureId),
        ...scopedAndActive(financeExpenditures, ctx),
      ))
      .limit(1);

    if (!record) throw new Error(`Expenditure ${expenditureId} not found or out of scope`);
    if (record.status !== EXPENDITURE_STATUS.PENDING_APPROVAL) {
      throw new Error(`Expenditure ${expenditureId} is not in pending_approval status`);
    }

    await tx
      .update(financeExpenditures)
      .set(buildApprovalPayload(approvedBy, EXPENDITURE_STATUS.APPROVED))
      .where(eq(financeExpenditures.id, expenditureId));
  });
}

/**
 * Reject an expenditure.
 */
export async function rejectExpenditure(
  db: DB,
  expenditureId: number,
  rejectedBy: number,
  reason: string,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(financeExpenditures)
    .set(buildRejectionPayload(rejectedBy, EXPENDITURE_STATUS.REJECTED, reason))
    .where(and(
      eq(financeExpenditures.id, expenditureId),
      eq(financeExpenditures.status, EXPENDITURE_STATUS.PENDING_APPROVAL),
      ...scopedAndActive(financeExpenditures, ctx),
    ));
}

/**
 * Mark an expenditure as paid. Atomic transaction.
 */
export async function markExpenditurePaid(
  db: DB,
  expenditureId: number,
  paidBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db.transaction(async (tx) => {
    const [record] = await tx
      .select({ id: financeExpenditures.id, status: financeExpenditures.status })
      .from(financeExpenditures)
      .where(and(
        eq(financeExpenditures.id, expenditureId),
        ...scopedAndActive(financeExpenditures, ctx),
      ))
      .limit(1);

    if (!record) throw new Error(`Expenditure ${expenditureId} not found or out of scope`);
    if (record.status !== EXPENDITURE_STATUS.APPROVED) {
      throw new Error(`Expenditure ${expenditureId} is not in approved status`);
    }

    await tx
      .update(financeExpenditures)
      .set(buildUpdatePayload({ status: EXPENDITURE_STATUS.PAID, updatedBy: paidBy }))
      .where(eq(financeExpenditures.id, expenditureId));
  });
}

/**
 * Soft-delete an expenditure.
 */
export async function softDeleteExpenditure(
  db: DB,
  expenditureId: number,
  userId: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(financeExpenditures)
    .set(buildSoftDeletePayload(userId))
    .where(and(
      eq(financeExpenditures.id, expenditureId),
      ...scopedAndActive(financeExpenditures, ctx),
    ));
}

// ============================================================
// PAYMENTS
// ============================================================

/**
 * List payments for a given scope.
 */
export async function listPayments(
  db: DB,
  ctx: ScopeContext,
  options: { status?: PaymentStatus | 'all'; limit?: number; offset?: number } = {}
) {
  const { status, limit = 100, offset = 0 } = options;
  const conditions = scopedAndActive(payments, ctx);

  if (status && status !== 'all') {
    conditions.push(eq(payments.status, status));
  }

  return db
    .select()
    .from(payments)
    .where(and(...conditions))
    .orderBy(desc(payments.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Approve a payment. Atomic transaction.
 */
export async function approvePayment(
  db: DB,
  paymentId: number,
  approvedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db.transaction(async (tx) => {
    const [record] = await tx
      .select({ id: payments.id, status: payments.status })
      .from(payments)
      .where(and(
        eq(payments.id, paymentId),
        ...scopedAndActive(payments, ctx),
      ))
      .limit(1);

    if (!record) throw new Error(`Payment ${paymentId} not found or out of scope`);
    if (record.status !== PAYMENT_STATUS.PENDING_APPROVAL) {
      throw new Error(`Payment ${paymentId} is not in pending_approval status`);
    }

    await tx
      .update(payments)
      .set(buildApprovalPayload(approvedBy, PAYMENT_STATUS.APPROVED))
      .where(eq(payments.id, paymentId));
  });
}

/**
 * Mark a payment as paid. Atomic transaction.
 */
export async function markPaymentPaid(
  db: DB,
  paymentId: number,
  paidBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db.transaction(async (tx) => {
    const [record] = await tx
      .select({ id: payments.id, status: payments.status })
      .from(payments)
      .where(and(
        eq(payments.id, paymentId),
        ...scopedAndActive(payments, ctx),
      ))
      .limit(1);

    if (!record) throw new Error(`Payment ${paymentId} not found or out of scope`);
    if (record.status !== PAYMENT_STATUS.APPROVED) {
      throw new Error(`Payment ${paymentId} is not in approved status`);
    }

    await tx
      .update(payments)
      .set(buildUpdatePayload({
        status: PAYMENT_STATUS.PAID,
        paidBy,
        paidAt: nowSql(),
        updatedBy: paidBy,
      }))
      .where(eq(payments.id, paymentId));
  });
}

/**
 * Void a payment.
 */
export async function voidPayment(
  db: DB,
  paymentId: number,
  userId: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(payments)
    .set(buildUpdatePayload({ status: PAYMENT_STATUS.VOID, updatedBy: userId }))
    .where(and(
      eq(payments.id, paymentId),
      ...scopedAndActive(payments, ctx),
    ));
}

/**
 * Soft-delete a payment.
 */
export async function softDeletePayment(
  db: DB,
  paymentId: number,
  userId: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(payments)
    .set(buildSoftDeletePayload(userId))
    .where(and(
      eq(payments.id, paymentId),
      ...scopedAndActive(payments, ctx),
    ));
}

// ============================================================
// FINANCE PERIODS
// ============================================================

/**
 * List finance periods for a given scope.
 */
export async function listFinancePeriods(
  db: DB,
  ctx: ScopeContext,
  options: { status?: FinancePeriodStatus | 'all'; limit?: number; offset?: number } = {}
) {
  const { status, limit = 100, offset = 0 } = options;
  const conditions = [
    eq(financePeriods.organizationId, ctx.organizationId),
    isNull(financePeriods.deletedAt),
  ];

  if (ctx.operatingUnitId != null) {
    conditions.push(eq(financePeriods.operatingUnitId, ctx.operatingUnitId));
  }

  if (status && status !== 'all') {
    conditions.push(eq(financePeriods.status, status));
  }

  return db
    .select()
    .from(financePeriods)
    .where(and(...conditions))
    .orderBy(desc(financePeriods.startDate))
    .limit(limit)
    .offset(offset);
}

/**
 * Lock a finance period. Atomic transaction.
 */
export async function lockFinancePeriod(
  db: DB,
  periodId: number,
  lockedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db.transaction(async (tx) => {
    const [record] = await tx
      .select({ id: financePeriods.id, status: financePeriods.status })
      .from(financePeriods)
      .where(and(
        eq(financePeriods.id, periodId),
        eq(financePeriods.organizationId, ctx.organizationId),
        isNull(financePeriods.deletedAt),
      ))
      .limit(1);

    if (!record) throw new Error(`Finance period ${periodId} not found or out of scope`);
    if (record.status === FINANCE_PERIOD_STATUS.LOCKED) {
      throw new Error(`Finance period ${periodId} is already locked`);
    }

    await tx
      .update(financePeriods)
      .set(buildUpdatePayload({
        status: FINANCE_PERIOD_STATUS.LOCKED,
        lockedAt: nowSql(),
        lockedBy,
        updatedBy: lockedBy,
      }))
      .where(eq(financePeriods.id, periodId));
  });
}

/**
 * Reopen a locked finance period.
 */
export async function reopenFinancePeriod(
  db: DB,
  periodId: number,
  reopenedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(financePeriods)
    .set(buildUpdatePayload({
      status: FINANCE_PERIOD_STATUS.REOPENED,
      reopenedAt: nowSql(),
      reopenedBy,
      updatedBy: reopenedBy,
    }))
    .where(and(
      eq(financePeriods.id, periodId),
      eq(financePeriods.status, FINANCE_PERIOD_STATUS.LOCKED),
      eq(financePeriods.organizationId, ctx.organizationId),
    ));
}

// ============================================================
// GL POSTING EVENTS
// ============================================================

/**
 * List GL posting events for a given scope.
 */
export async function listGlPostingEvents(
  db: DB,
  ctx: ScopeContext,
  options: { limit?: number; offset?: number } = {}
) {
  const { limit = 100, offset = 0 } = options;
  const conditions = scopedAndActive(glPostingEvents, ctx);

  return db
    .select()
    .from(glPostingEvents)
    .where(and(...conditions))
    .orderBy(desc(glPostingEvents.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Mark a GL posting event as posted.
 */
export async function markGlEventPosted(
  db: DB,
  eventId: number,
  updatedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(glPostingEvents)
    .set(buildUpdatePayload({
      postingStatus: GL_POSTING_STATUS.POSTED,
      postedAt: nowSql(),
      updatedBy,
    }))
    .where(and(
      eq(glPostingEvents.id, eventId),
      eq(glPostingEvents.postingStatus, GL_POSTING_STATUS.PENDING),
      ...scopedAndActive(glPostingEvents, ctx),
    ));
}

/**
 * Mark a GL posting event as failed.
 */
export async function markGlEventFailed(
  db: DB,
  eventId: number,
  updatedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(glPostingEvents)
    .set(buildUpdatePayload({
      postingStatus: GL_POSTING_STATUS.FAILED,
      updatedBy,
    }))
    .where(and(
      eq(glPostingEvents.id, eventId),
      ...scopedAndActive(glPostingEvents, ctx),
    ));
}
