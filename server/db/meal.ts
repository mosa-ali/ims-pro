/**
 * db/meal.ts — MEAL (Monitoring, Evaluation, Accountability, Learning) Query Helpers
 *
 * Reusable query helpers for the MEAL module.
 *
 * Standards:
 *  - All timestamps use nowSql() — never sql`NOW()`
 *  - All status values use MEAL status constants — never hardcoded strings
 *  - All queries use scopedAndActive() — never inline eq(organizationId, ...)
 *  - Soft deletes use buildSoftDeletePayload() — never inline isDeleted=1
 *  - db parameter typed as DB — never `db: any`
 *  - Approval workflows use db.transaction() for atomicity
 */

import { and, eq, isNull, desc, like, or } from 'drizzle-orm';
import {
  mealAccountabilityRecords,
  mealDqaVisits,
  mealIndicatorDataEntries,
  mealDocuments,
} from '../../drizzle/schema';
import type { DB, ScopeContext } from './_scope';
import {
  scopedAndActive,
  buildUpdatePayload,
  buildSoftDeletePayload,
  buildApprovalPayload,
  buildRejectionPayload,
} from './_scope';
import { nowSql } from './_time';
import {
  MEAL_ACCOUNTABILITY_STATUS,
  MEAL_DQA_STATUS,
  type MealAccountabilityStatus,
  type MealDqaStatus,
} from './_status';

// ============================================================
// MEAL ACCOUNTABILITY RECORDS (Complaints / Feedback)
// ============================================================

/**
 * List accountability records for a given scope.
 */
export async function listAccountabilityRecords(
  db: DB,
  ctx: ScopeContext,
  options: {
    status?: MealAccountabilityStatus | 'all';
    projectId?: number;
    searchTerm?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  const { status, projectId, searchTerm, limit = 100, offset = 0 } = options;
  const conditions = scopedAndActive(mealAccountabilityRecords, ctx);

  if (status && status !== 'all') {
    conditions.push(eq(mealAccountabilityRecords.status, status));
  }

  if (projectId != null) {
    conditions.push(eq(mealAccountabilityRecords.projectId, projectId));
  }

  if (searchTerm) {
    conditions.push(
      or(
        like(mealAccountabilityRecords.recordCode, `%${searchTerm}%`),
        like(mealAccountabilityRecords.subject, `%${searchTerm}%`),
        like(mealAccountabilityRecords.complainantName, `%${searchTerm}%`),
      )!
    );
  }

  return db
    .select()
    .from(mealAccountabilityRecords)
    .where(and(...conditions))
    .orderBy(desc(mealAccountabilityRecords.receivedAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Resolve an accountability record.
 */
export async function resolveAccountabilityRecord(
  db: DB,
  recordId: number,
  resolvedBy: number,
  resolution: string,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(mealAccountabilityRecords)
    .set(buildUpdatePayload({
      status: MEAL_ACCOUNTABILITY_STATUS.RESOLVED,
      resolution,
      resolvedBy,
      resolvedAt: nowSql(),
      updatedBy: resolvedBy,
    }))
    .where(and(
      eq(mealAccountabilityRecords.id, recordId),
      ...scopedAndActive(mealAccountabilityRecords, ctx),
    ));
}

/**
 * Close an accountability record.
 */
export async function closeAccountabilityRecord(
  db: DB,
  recordId: number,
  closedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(mealAccountabilityRecords)
    .set(buildUpdatePayload({
      status: MEAL_ACCOUNTABILITY_STATUS.CLOSED,
      updatedBy: closedBy,
    }))
    .where(and(
      eq(mealAccountabilityRecords.id, recordId),
      ...scopedAndActive(mealAccountabilityRecords, ctx),
    ));
}

/**
 * Soft-delete an accountability record.
 */
export async function softDeleteAccountabilityRecord(
  db: DB,
  recordId: number,
  userId: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(mealAccountabilityRecords)
    .set(buildSoftDeletePayload(userId))
    .where(and(
      eq(mealAccountabilityRecords.id, recordId),
      ...scopedAndActive(mealAccountabilityRecords, ctx),
    ));
}

// ============================================================
// MEAL DQA VISITS (Data Quality Assessments)
// ============================================================

/**
 * List DQA visits for a given scope.
 */
export async function listDqaVisits(
  db: DB,
  ctx: ScopeContext,
  options: {
    status?: MealDqaStatus | 'all';
    projectId?: number;
    limit?: number;
    offset?: number;
  } = {}
) {
  const { status, projectId, limit = 100, offset = 0 } = options;
  const conditions = scopedAndActive(mealDqaVisits, ctx);

  if (status && status !== 'all') {
    conditions.push(eq(mealDqaVisits.status, status));
  }

  if (projectId != null) {
    conditions.push(eq(mealDqaVisits.projectId, projectId));
  }

  return db
    .select()
    .from(mealDqaVisits)
    .where(and(...conditions))
    .orderBy(desc(mealDqaVisits.visitDate))
    .limit(limit)
    .offset(offset);
}

/**
 * Submit a DQA visit (draft → submitted). Atomic transaction.
 */
export async function submitDqaVisit(
  db: DB,
  visitId: number,
  submittedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db.transaction(async (tx) => {
    const [record] = await tx
      .select({ id: mealDqaVisits.id, status: mealDqaVisits.status })
      .from(mealDqaVisits)
      .where(and(
        eq(mealDqaVisits.id, visitId),
        ...scopedAndActive(mealDqaVisits, ctx),
      ))
      .limit(1);

    if (!record) throw new Error(`DQA Visit ${visitId} not found or out of scope`);
    if (record.status !== MEAL_DQA_STATUS.DRAFT) {
      throw new Error(`DQA Visit ${visitId} is not in draft status`);
    }

    await tx
      .update(mealDqaVisits)
      .set(buildUpdatePayload({
        status: MEAL_DQA_STATUS.SUBMITTED,
        updatedBy: submittedBy,
      }))
      .where(eq(mealDqaVisits.id, visitId));
  });
}

/**
 * Approve a DQA visit. Atomic transaction.
 */
export async function approveDqaVisit(
  db: DB,
  visitId: number,
  approvedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db.transaction(async (tx) => {
    const [record] = await tx
      .select({ id: mealDqaVisits.id, status: mealDqaVisits.status })
      .from(mealDqaVisits)
      .where(and(
        eq(mealDqaVisits.id, visitId),
        ...scopedAndActive(mealDqaVisits, ctx),
      ))
      .limit(1);

    if (!record) throw new Error(`DQA Visit ${visitId} not found or out of scope`);
    if (record.status !== MEAL_DQA_STATUS.SUBMITTED) {
      throw new Error(`DQA Visit ${visitId} is not in submitted status`);
    }

    await tx
      .update(mealDqaVisits)
      .set(buildApprovalPayload(approvedBy, MEAL_DQA_STATUS.APPROVED))
      .where(eq(mealDqaVisits.id, visitId));
  });
}

/**
 * Close a DQA visit.
 */
export async function closeDqaVisit(
  db: DB,
  visitId: number,
  userId: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(mealDqaVisits)
    .set(buildUpdatePayload({
      status: MEAL_DQA_STATUS.CLOSED,
      updatedBy: userId,
    }))
    .where(and(
      eq(mealDqaVisits.id, visitId),
      ...scopedAndActive(mealDqaVisits, ctx),
    ));
}

/**
 * Soft-delete a DQA visit.
 */
export async function softDeleteDqaVisit(
  db: DB,
  visitId: number,
  userId: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(mealDqaVisits)
    .set(buildSoftDeletePayload(userId))
    .where(and(
      eq(mealDqaVisits.id, visitId),
      ...scopedAndActive(mealDqaVisits, ctx),
    ));
}

// ============================================================
// MEAL INDICATOR DATA ENTRIES
// ============================================================

/**
 * List indicator data entries for a given scope.
 */
export async function listIndicatorDataEntries(
  db: DB,
  ctx: ScopeContext,
  options: { indicatorId?: number; limit?: number; offset?: number } = {}
) {
  const { indicatorId, limit = 100, offset = 0 } = options;
  const conditions = scopedAndActive(mealIndicatorDataEntries, ctx);

  if (indicatorId != null) {
    conditions.push(eq(mealIndicatorDataEntries.indicatorId, indicatorId));
  }

  return db
    .select()
    .from(mealIndicatorDataEntries)
    .where(and(...conditions))
    .orderBy(desc(mealIndicatorDataEntries.createdAt))
    .limit(limit)
    .offset(offset);
}

// ============================================================
// MEAL DOCUMENTS
// ============================================================

/**
 * List MEAL documents for a given scope.
 */
export async function listMealDocuments(
  db: DB,
  ctx: ScopeContext,
  options: { projectId?: number; limit?: number; offset?: number } = {}
) {
  const { projectId, limit = 100, offset = 0 } = options;
  const conditions = scopedAndActive(mealDocuments, ctx);

  if (projectId != null) {
    conditions.push(eq(mealDocuments.projectId, projectId));
  }

  return db
    .select()
    .from(mealDocuments)
    .where(and(...conditions))
    .orderBy(desc(mealDocuments.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Soft-delete a MEAL document.
 */
export async function softDeleteMealDocument(
  db: DB,
  documentId: number,
  userId: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(mealDocuments)
    .set(buildSoftDeletePayload(userId))
    .where(and(
      eq(mealDocuments.id, documentId),
      ...scopedAndActive(mealDocuments, ctx),
    ));
}
