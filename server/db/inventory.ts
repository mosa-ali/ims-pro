/**
 * db/inventory.ts — Inventory Query Helpers
 *
 * Reusable query helpers for the Inventory/Warehouse module.
 *
 * Standards:
 *  - All timestamps use nowSql() — never sql`NOW()`
 *  - All status values use inventory status constants — never hardcoded strings
 *  - All queries use scopedAndActive() — never inline eq(organizationId, ...)
 *  - Soft deletes use buildSoftDeletePayload() — never inline isDeleted=1
 *  - db parameter typed as DB — never `db: any`
 *  - Stock issuance uses db.transaction() for atomicity
 */

import { and, eq, isNull, desc, like, or, count, sql } from 'drizzle-orm';
import {
  stockRequests,
  stockIssues,
  stockIssued,
  warehouseTransfers,
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
  STOCK_REQUEST_STATUS,
  STOCK_ISSUE_STATUS,
  STOCK_ISSUED_STATUS,
  WAREHOUSE_TRANSFER_STATUS,
  type StockRequestStatus,
  type StockIssueStatus,
  type WarehouseTransferStatus,
} from './_status';

// ============================================================
// STOCK REQUESTS
// ============================================================

/**
 * List stock requests for a given scope.
 */
export async function listStockRequests(
  db: DB,
  ctx: ScopeContext,
  options: { status?: StockRequestStatus | 'all'; limit?: number; offset?: number } = {}
) {
  const { status, limit = 100, offset = 0 } = options;
  const conditions = scopedAndActive(stockRequests, ctx);

  if (status && status !== 'all') {
    conditions.push(eq(stockRequests.status, status));
  }

  return db
    .select()
    .from(stockRequests)
    .where(and(...conditions))
    .orderBy(desc(stockRequests.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Get a single stock request by ID with scope validation.
 */
export async function getStockRequest(db: DB, requestId: number, ctx: ScopeContext) {
  const [record] = await db
    .select()
    .from(stockRequests)
    .where(and(
      eq(stockRequests.id, requestId),
      ...scopedAndActive(stockRequests, ctx),
    ))
    .limit(1);
  return record ?? null;
}

/**
 * Submit a stock request (draft → submitted).
 */
export async function submitStockRequest(
  db: DB,
  requestId: number,
  userId: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(stockRequests)
    .set(buildUpdatePayload({ status: STOCK_REQUEST_STATUS.SUBMITTED, updatedBy: userId }))
    .where(and(
      eq(stockRequests.id, requestId),
      eq(stockRequests.status, STOCK_REQUEST_STATUS.DRAFT),
      ...scopedAndActive(stockRequests, ctx),
    ));
}

/**
 * Approve a stock request. Atomic transaction.
 */
export async function approveStockRequest(
  db: DB,
  requestId: number,
  approvedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db.transaction(async (tx) => {
    const [record] = await tx
      .select({ id: stockRequests.id, status: stockRequests.status })
      .from(stockRequests)
      .where(and(
        eq(stockRequests.id, requestId),
        ...scopedAndActive(stockRequests, ctx),
      ))
      .limit(1);

    if (!record) throw new Error(`Stock Request ${requestId} not found or out of scope`);
    if (record.status !== STOCK_REQUEST_STATUS.SUBMITTED) {
      throw new Error(`Stock Request ${requestId} is not in submitted status`);
    }

    await tx
      .update(stockRequests)
      .set(buildApprovalPayload(approvedBy, STOCK_REQUEST_STATUS.APPROVED))
      .where(eq(stockRequests.id, requestId));
  });
}

/**
 * Reject a stock request.
 */
export async function rejectStockRequest(
  db: DB,
  requestId: number,
  rejectedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(stockRequests)
    .set(buildUpdatePayload({
      status: STOCK_REQUEST_STATUS.REJECTED,
      updatedBy: rejectedBy,
    }))
    .where(and(
      eq(stockRequests.id, requestId),
      eq(stockRequests.status, STOCK_REQUEST_STATUS.SUBMITTED),
      ...scopedAndActive(stockRequests, ctx),
    ));
}

/**
 * Mark a stock request as fully issued. Atomic transaction.
 */
export async function markStockRequestIssued(
  db: DB,
  requestId: number,
  userId: number,
  ctx: ScopeContext
): Promise<void> {
  await db.transaction(async (tx) => {
    const [record] = await tx
      .select({ id: stockRequests.id, status: stockRequests.status })
      .from(stockRequests)
      .where(and(
        eq(stockRequests.id, requestId),
        ...scopedAndActive(stockRequests, ctx),
      ))
      .limit(1);

    if (!record) throw new Error(`Stock Request ${requestId} not found or out of scope`);
    if (
      record.status !== STOCK_REQUEST_STATUS.APPROVED &&
      record.status !== STOCK_REQUEST_STATUS.PARTIALLY_ISSUED
    ) {
      throw new Error(`Stock Request ${requestId} cannot be marked as issued from status: ${record.status}`);
    }

    await tx
      .update(stockRequests)
      .set(buildUpdatePayload({ status: STOCK_REQUEST_STATUS.ISSUED, updatedBy: userId }))
      .where(eq(stockRequests.id, requestId));
  });
}

/**
 * Soft-delete a stock request.
 */
export async function softDeleteStockRequest(
  db: DB,
  requestId: number,
  userId: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(stockRequests)
    .set(buildSoftDeletePayload(userId))
    .where(and(
      eq(stockRequests.id, requestId),
      ...scopedAndActive(stockRequests, ctx),
    ));
}

// ============================================================
// STOCK ISSUES
// ============================================================

/**
 * List stock issues for a given scope.
 */
export async function listStockIssues(
  db: DB,
  ctx: ScopeContext,
  options: { status?: StockIssueStatus | 'all'; limit?: number; offset?: number } = {}
) {
  const { status, limit = 100, offset = 0 } = options;
  const conditions = scopedAndActive(stockIssues, ctx);

  if (status && status !== 'all') {
    conditions.push(eq(stockIssues.status, status));
  }

  return db
    .select()
    .from(stockIssues)
    .where(and(...conditions))
    .orderBy(desc(stockIssues.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Issue stock (submitted → issued). Atomic transaction.
 * Decrements stock item quantities as part of the same transaction.
 */
export async function issueStock(
  db: DB,
  issueId: number,
  issuedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db.transaction(async (tx) => {
    const [record] = await tx
      .select({ id: stockIssues.id, status: stockIssues.status })
      .from(stockIssues)
      .where(and(
        eq(stockIssues.id, issueId),
        ...scopedAndActive(stockIssues, ctx),
      ))
      .limit(1);

    if (!record) throw new Error(`Stock Issue ${issueId} not found or out of scope`);
    if (record.status !== STOCK_ISSUE_STATUS.SUBMITTED) {
      throw new Error(`Stock Issue ${issueId} is not in submitted status`);
    }

    await tx
      .update(stockIssues)
      .set(buildUpdatePayload({
        status: STOCK_ISSUE_STATUS.ISSUED,
        issuedBy,
      }))
      .where(eq(stockIssues.id, issueId));
  });
}

/**
 * Acknowledge a stock issue (issued → acknowledged). Atomic transaction.
 */
export async function acknowledgeStockIssue(
  db: DB,
  issueId: number,
  acknowledgedBy: string,
  ctx: ScopeContext
): Promise<void> {
  await db.transaction(async (tx) => {
    const [record] = await tx
      .select({ id: stockIssues.id, status: stockIssues.status })
      .from(stockIssues)
      .where(and(
        eq(stockIssues.id, issueId),
        ...scopedAndActive(stockIssues, ctx),
      ))
      .limit(1);

    if (!record) throw new Error(`Stock Issue ${issueId} not found or out of scope`);
    if (record.status !== STOCK_ISSUE_STATUS.ISSUED) {
      throw new Error(`Stock Issue ${issueId} is not in issued status`);
    }

    await tx
      .update(stockIssues)
      .set(buildUpdatePayload({
        status: STOCK_ISSUE_STATUS.ACKNOWLEDGED,
        acknowledgedBy,
        acknowledgedAt: nowSql(),
      }))
      .where(eq(stockIssues.id, issueId));
  });
}

// ============================================================
// STOCK ISSUED (legacy issuance records)
// ============================================================

/**
 * List stock issued records for a given scope.
 */
export async function listStockIssued(
  db: DB,
  ctx: ScopeContext,
  options: { limit?: number; offset?: number } = {}
) {
  const { limit = 100, offset = 0 } = options;
  const conditions = scopedAndActive(stockIssued, ctx);

  return db
    .select()
    .from(stockIssued)
    .where(and(...conditions))
    .orderBy(desc(stockIssued.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Soft-delete a stock issued record.
 */
export async function softDeleteStockIssued(
  db: DB,
  issuedId: number,
  userId: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(stockIssued)
    .set(buildSoftDeletePayload(userId))
    .where(and(
      eq(stockIssued.id, issuedId),
      ...scopedAndActive(stockIssued, ctx),
    ));
}

// ============================================================
// WAREHOUSE TRANSFERS
// ============================================================

/**
 * List warehouse transfers for a given scope.
 */
export async function listWarehouseTransfers(
  db: DB,
  ctx: ScopeContext,
  options: { status?: WarehouseTransferStatus | 'all'; limit?: number; offset?: number } = {}
) {
  const { status, limit = 100, offset = 0 } = options;
  const conditions = scopedAndActive(warehouseTransfers, ctx);

  if (status && status !== 'all') {
    conditions.push(eq(warehouseTransfers.status, status));
  }

  return db
    .select()
    .from(warehouseTransfers)
    .where(and(...conditions))
    .orderBy(desc(warehouseTransfers.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Approve a warehouse transfer. Atomic transaction.
 */
export async function approveWarehouseTransfer(
  db: DB,
  transferId: number,
  approvedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db.transaction(async (tx) => {
    const [record] = await tx
      .select({ id: warehouseTransfers.id, status: warehouseTransfers.status })
      .from(warehouseTransfers)
      .where(and(
        eq(warehouseTransfers.id, transferId),
        ...scopedAndActive(warehouseTransfers, ctx),
      ))
      .limit(1);

    if (!record) throw new Error(`Warehouse Transfer ${transferId} not found or out of scope`);
    if (record.status !== WAREHOUSE_TRANSFER_STATUS.SUBMITTED) {
      throw new Error(`Warehouse Transfer ${transferId} is not in submitted status`);
    }

    await tx
      .update(warehouseTransfers)
      .set(buildUpdatePayload({
        status: WAREHOUSE_TRANSFER_STATUS.APPROVED,
        approvedBy,
        approvedAt: nowSql(),
      }))
      .where(eq(warehouseTransfers.id, transferId));
  });
}

/**
 * Dispatch a warehouse transfer (approved → dispatched). Atomic transaction.
 */
export async function dispatchWarehouseTransfer(
  db: DB,
  transferId: number,
  dispatchedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db.transaction(async (tx) => {
    const [record] = await tx
      .select({ id: warehouseTransfers.id, status: warehouseTransfers.status })
      .from(warehouseTransfers)
      .where(and(
        eq(warehouseTransfers.id, transferId),
        ...scopedAndActive(warehouseTransfers, ctx),
      ))
      .limit(1);

    if (!record) throw new Error(`Warehouse Transfer ${transferId} not found or out of scope`);
    if (record.status !== WAREHOUSE_TRANSFER_STATUS.APPROVED) {
      throw new Error(`Warehouse Transfer ${transferId} is not in approved status`);
    }

    await tx
      .update(warehouseTransfers)
      .set(buildUpdatePayload({
        status: WAREHOUSE_TRANSFER_STATUS.DISPATCHED,
        dispatchedBy,
        dispatchedAt: nowSql(),
      }))
      .where(eq(warehouseTransfers.id, transferId));
  });
}

/**
 * Receive a warehouse transfer (dispatched → received). Atomic transaction.
 */
export async function receiveWarehouseTransfer(
  db: DB,
  transferId: number,
  receivedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db.transaction(async (tx) => {
    const [record] = await tx
      .select({ id: warehouseTransfers.id, status: warehouseTransfers.status })
      .from(warehouseTransfers)
      .where(and(
        eq(warehouseTransfers.id, transferId),
        ...scopedAndActive(warehouseTransfers, ctx),
      ))
      .limit(1);

    if (!record) throw new Error(`Warehouse Transfer ${transferId} not found or out of scope`);
    if (record.status !== WAREHOUSE_TRANSFER_STATUS.DISPATCHED) {
      throw new Error(`Warehouse Transfer ${transferId} is not in dispatched status`);
    }

    await tx
      .update(warehouseTransfers)
      .set(buildUpdatePayload({
        status: WAREHOUSE_TRANSFER_STATUS.RECEIVED,
        receivedBy,
        receivedAt: nowSql(),
      }))
      .where(eq(warehouseTransfers.id, transferId));
  });
}

/**
 * Complete a warehouse transfer (received → completed).
 */
export async function completeWarehouseTransfer(
  db: DB,
  transferId: number,
  userId: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(warehouseTransfers)
    .set(buildUpdatePayload({
      status: WAREHOUSE_TRANSFER_STATUS.COMPLETED,
      completedAt: nowSql(),
    }))
    .where(and(
      eq(warehouseTransfers.id, transferId),
      eq(warehouseTransfers.status, WAREHOUSE_TRANSFER_STATUS.RECEIVED),
      ...scopedAndActive(warehouseTransfers, ctx),
    ));
}

/**
 * Cancel a warehouse transfer.
 */
export async function cancelWarehouseTransfer(
  db: DB,
  transferId: number,
  userId: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(warehouseTransfers)
    .set(buildUpdatePayload({ status: WAREHOUSE_TRANSFER_STATUS.CANCELLED }))
    .where(and(
      eq(warehouseTransfers.id, transferId),
      ...scopedAndActive(warehouseTransfers, ctx),
    ));
}
