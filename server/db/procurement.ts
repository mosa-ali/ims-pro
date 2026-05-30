/**
 * db/procurement.ts — Procurement Query Helpers
 *
 * Reusable query helpers for the Procurement module.
 *
 * Standards:
 *  - All timestamps use nowSql() — never sql`NOW()`
 *  - All status values use procurement status constants — never hardcoded strings
 *  - All queries use scopedAndActive() — never inline eq(organizationId, ...)
 *  - Soft deletes use buildSoftDeletePayload() — never inline isDeleted=1
 *  - db parameter typed as DB — never `db: any`
 *  - Approval/rejection use buildApprovalPayload/buildRejectionPayload
 */

import { and, eq, isNull, desc, like, or, count } from 'drizzle-orm';
import {
  purchaseRequests,
  rfqs,
  contracts,
  vendors,
  goodsReceiptNotes,
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
  PR_STATUS,
  CONTRACT_STATUS,
  RFQ_STATUS,
  GRN_STATUS,
  VENDOR_APPROVAL_STATUS,
  type PrStatus,
  type ContractStatus,
  type RfqStatus,
  type GrnStatus,
} from './_status';

// ============================================================
// PURCHASE REQUESTS
// ============================================================

/**
 * List purchase requests for a given scope.
 */
export async function listPurchaseRequests(
  db: DB,
  ctx: ScopeContext,
  options: { status?: PrStatus | 'all'; searchTerm?: string; limit?: number; offset?: number } = {}
) {
  const { status, searchTerm, limit = 100, offset = 0 } = options;
  const conditions = scopedAndActive(purchaseRequests, ctx);

  if (status && status !== 'all') {
    conditions.push(eq(purchaseRequests.status, status));
  }

  if (searchTerm) {
    conditions.push(
      or(
        like(purchaseRequests.prNumber, `%${searchTerm}%`),
        like(purchaseRequests.projectTitle, `%${searchTerm}%`),
        like(purchaseRequests.requesterName, `%${searchTerm}%`),
      )!
    );
  }

  return db
    .select()
    .from(purchaseRequests)
    .where(and(...conditions))
    .orderBy(desc(purchaseRequests.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Get a single purchase request by ID with scope validation.
 */
export async function getPurchaseRequest(db: DB, prId: number, ctx: ScopeContext) {
  const [pr] = await db
    .select()
    .from(purchaseRequests)
    .where(and(
      eq(purchaseRequests.id, prId),
      ...scopedAndActive(purchaseRequests, ctx),
    ))
    .limit(1);
  return pr ?? null;
}

/**
 * Submit a purchase request (draft → submitted).
 */
export async function submitPurchaseRequest(
  db: DB,
  prId: number,
  userId: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(purchaseRequests)
    .set(buildUpdatePayload({
      status: PR_STATUS.SUBMITTED,
      submittedAt: nowSql(),
    }))
    .where(and(
      eq(purchaseRequests.id, prId),
      eq(purchaseRequests.status, PR_STATUS.DRAFT),
      ...scopedAndActive(purchaseRequests, ctx),
    ));
}

/**
 * Logistics validate a purchase request.
 */
export async function logisticsValidatePR(
  db: DB,
  prId: number,
  userId: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(purchaseRequests)
    .set(buildUpdatePayload({
      status: PR_STATUS.VALIDATED_BY_LOGISTIC,
      logValidatedBy: userId,
      logValidatedOn: nowSql(),
    }))
    .where(and(
      eq(purchaseRequests.id, prId),
      eq(purchaseRequests.status, PR_STATUS.SUBMITTED),
      ...scopedAndActive(purchaseRequests, ctx),
    ));
}

/**
 * Logistics reject a purchase request.
 */
export async function logisticsRejectPR(
  db: DB,
  prId: number,
  userId: number,
  reason: string,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(purchaseRequests)
    .set(buildUpdatePayload({
      status: PR_STATUS.REJECTED_BY_LOGISTIC,
      rejectReason: reason,
      rejectionStage: 'logistics',
      logRejectedBy: userId,
      logRejectedOn: nowSql(),
    }))
    .where(and(
      eq(purchaseRequests.id, prId),
      eq(purchaseRequests.status, PR_STATUS.SUBMITTED),
      ...scopedAndActive(purchaseRequests, ctx),
    ));
}

/**
 * Finance validate a purchase request.
 */
export async function financeValidatePR(
  db: DB,
  prId: number,
  userId: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(purchaseRequests)
    .set(buildUpdatePayload({
      status: PR_STATUS.VALIDATED_BY_FINANCE,
      finValidatedBy: userId,
      finValidatedOn: nowSql(),
    }))
    .where(and(
      eq(purchaseRequests.id, prId),
      eq(purchaseRequests.status, PR_STATUS.VALIDATED_BY_LOGISTIC),
      ...scopedAndActive(purchaseRequests, ctx),
    ));
}

/**
 * Finance reject a purchase request.
 */
export async function financeRejectPR(
  db: DB,
  prId: number,
  userId: number,
  reason: string,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(purchaseRequests)
    .set(buildUpdatePayload({
      status: PR_STATUS.REJECTED_BY_FINANCE,
      rejectReason: reason,
      rejectionStage: 'finance',
      finRejectedBy: userId,
      finRejectedOn: nowSql(),
    }))
    .where(and(
      eq(purchaseRequests.id, prId),
      eq(purchaseRequests.status, PR_STATUS.VALIDATED_BY_LOGISTIC),
      ...scopedAndActive(purchaseRequests, ctx),
    ));
}

/**
 * PM approve a purchase request (final approval).
 */
export async function pmApprovePR(
  db: DB,
  prId: number,
  userId: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(purchaseRequests)
    .set(buildUpdatePayload({
      status: PR_STATUS.APPROVED,
      approvedBy: userId,
      approvedOn: nowSql(),
    }))
    .where(and(
      eq(purchaseRequests.id, prId),
      eq(purchaseRequests.status, PR_STATUS.VALIDATED_BY_FINANCE),
      ...scopedAndActive(purchaseRequests, ctx),
    ));
}

/**
 * PM reject a purchase request.
 */
export async function pmRejectPR(
  db: DB,
  prId: number,
  userId: number,
  reason: string,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(purchaseRequests)
    .set(buildUpdatePayload({
      status: PR_STATUS.REJECTED_BY_PM,
      rejectReason: reason,
      rejectionStage: 'pm',
      pmRejectedBy: userId,
      pmRejectedOn: nowSql(),
    }))
    .where(and(
      eq(purchaseRequests.id, prId),
      eq(purchaseRequests.status, PR_STATUS.VALIDATED_BY_FINANCE),
      ...scopedAndActive(purchaseRequests, ctx),
    ));
}

/**
 * Soft-delete a purchase request.
 */
export async function softDeletePurchaseRequest(
  db: DB,
  prId: number,
  userId: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(purchaseRequests)
    .set(buildSoftDeletePayload(userId))
    .where(and(
      eq(purchaseRequests.id, prId),
      ...scopedAndActive(purchaseRequests, ctx),
    ));
}

// ============================================================
// RFQs
// ============================================================

/**
 * List RFQs for a given scope.
 */
export async function listRfqs(
  db: DB,
  ctx: ScopeContext,
  options: { status?: RfqStatus | 'all'; limit?: number; offset?: number } = {}
) {
  const { status, limit = 100, offset = 0 } = options;
  const conditions = scopedAndActive(rfqs, ctx);

  if (status && status !== 'all') {
    conditions.push(eq(rfqs.status, status));
  }

  return db
    .select()
    .from(rfqs)
    .where(and(...conditions))
    .orderBy(desc(rfqs.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Update RFQ status.
 */
export async function updateRfqStatus(
  db: DB,
  rfqId: number,
  status: RfqStatus,
  updatedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(rfqs)
    .set(buildUpdatePayload({ status, updatedBy }))
    .where(and(
      eq(rfqs.id, rfqId),
      ...scopedAndActive(rfqs, ctx),
    ));
}

/**
 * Soft-delete an RFQ.
 */
export async function softDeleteRfq(
  db: DB,
  rfqId: number,
  userId: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(rfqs)
    .set(buildSoftDeletePayload(userId))
    .where(and(
      eq(rfqs.id, rfqId),
      ...scopedAndActive(rfqs, ctx),
    ));
}

// ============================================================
// CONTRACTS
// ============================================================

/**
 * List contracts for a given scope.
 */
export async function listContracts(
  db: DB,
  ctx: ScopeContext,
  options: { status?: ContractStatus | 'all'; limit?: number; offset?: number } = {}
) {
  const { status, limit = 100, offset = 0 } = options;
  const conditions = scopedAndActive(contracts, ctx);

  if (status && status !== 'all') {
    conditions.push(eq(contracts.status, status));
  }

  return db
    .select()
    .from(contracts)
    .where(and(...conditions))
    .orderBy(desc(contracts.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Approve a contract.
 */
export async function approveContract(
  db: DB,
  contractId: number,
  approvedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(contracts)
    .set(buildApprovalPayload(approvedBy, CONTRACT_STATUS.APPROVED))
    .where(and(
      eq(contracts.id, contractId),
      eq(contracts.status, CONTRACT_STATUS.PENDING_APPROVAL),
      ...scopedAndActive(contracts, ctx),
    ));
}

/**
 * Reject a contract.
 */
export async function rejectContract(
  db: DB,
  contractId: number,
  rejectedBy: number,
  reason: string,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(contracts)
    .set(buildRejectionPayload(rejectedBy, CONTRACT_STATUS.DRAFT, reason))
    .where(and(
      eq(contracts.id, contractId),
      eq(contracts.status, CONTRACT_STATUS.PENDING_APPROVAL),
      ...scopedAndActive(contracts, ctx),
    ));
}

/**
 * Terminate a contract.
 */
export async function terminateContract(
  db: DB,
  contractId: number,
  updatedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(contracts)
    .set(buildUpdatePayload({ status: CONTRACT_STATUS.TERMINATED, updatedBy }))
    .where(and(
      eq(contracts.id, contractId),
      ...scopedAndActive(contracts, ctx),
    ));
}

/**
 * Soft-delete a contract.
 */
export async function softDeleteContract(
  db: DB,
  contractId: number,
  userId: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(contracts)
    .set(buildSoftDeletePayload(userId))
    .where(and(
      eq(contracts.id, contractId),
      ...scopedAndActive(contracts, ctx),
    ));
}

// ============================================================
// VENDORS
// ============================================================

/**
 * List vendors for an organization (vendors have no operatingUnitId scope).
 */
export async function listVendors(
  db: DB,
  organizationId: number,
  options: { approvalStatus?: string; searchTerm?: string; limit?: number; offset?: number } = {}
) {
  const { approvalStatus, searchTerm, limit = 100, offset = 0 } = options;
  const conditions = [
    eq(vendors.organizationId, organizationId),
    isNull(vendors.deletedAt),
  ];

  if (approvalStatus) {
    // Cast to the enum type that Drizzle expects for this column
    conditions.push(eq(vendors.approvalStatus, approvalStatus as 'pending' | 'pending_approval' | 'approved' | 'rejected'));
  }

  if (searchTerm) {
    conditions.push(
      or(
        like(vendors.name, `%${searchTerm}%`),
        like(vendors.nameAr, `%${searchTerm}%`),
        like(vendors.email, `%${searchTerm}%`),
      )!
    );
  }

  return db
    .select()
    .from(vendors)
    .where(and(...conditions))
    .orderBy(desc(vendors.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Approve a vendor.
 */
export async function approveVendor(
  db: DB,
  vendorId: number,
  approvedBy: number,
  organizationId: number
): Promise<void> {
  await db
    .update(vendors)
    .set(buildApprovalPayload(approvedBy, VENDOR_APPROVAL_STATUS.APPROVED))
    .where(and(
      eq(vendors.id, vendorId),
      eq(vendors.organizationId, organizationId),
      isNull(vendors.deletedAt),
    ));
}

/**
 * Reject a vendor.
 */
export async function rejectVendor(
  db: DB,
  vendorId: number,
  rejectedBy: number,
  reason: string,
  organizationId: number
): Promise<void> {
  await db
    .update(vendors)
    .set(buildRejectionPayload(rejectedBy, VENDOR_APPROVAL_STATUS.REJECTED, reason))
    .where(and(
      eq(vendors.id, vendorId),
      eq(vendors.organizationId, organizationId),
      isNull(vendors.deletedAt),
    ));
}

// ============================================================
// GOODS RECEIPT NOTES
// ============================================================

/**
 * List GRNs for a given scope.
 */
export async function listGrns(
  db: DB,
  ctx: ScopeContext,
  options: { status?: GrnStatus | 'all'; limit?: number; offset?: number } = {}
) {
  const { status, limit = 100, offset = 0 } = options;
  const conditions = scopedAndActive(goodsReceiptNotes, ctx);

  if (status && status !== 'all') {
    conditions.push(eq(goodsReceiptNotes.status, status));
  }

  return db
    .select()
    .from(goodsReceiptNotes)
    .where(and(...conditions))
    .orderBy(desc(goodsReceiptNotes.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Accept a GRN (inspected → accepted).
 */
export async function acceptGrn(
  db: DB,
  grnId: number,
  updatedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(goodsReceiptNotes)
    .set(buildUpdatePayload({ status: GRN_STATUS.ACCEPTED, updatedBy }))
    .where(and(
      eq(goodsReceiptNotes.id, grnId),
      eq(goodsReceiptNotes.status, GRN_STATUS.INSPECTED),
      ...scopedAndActive(goodsReceiptNotes, ctx),
    ));
}

/**
 * Reject a GRN.
 */
export async function rejectGrn(
  db: DB,
  grnId: number,
  rejectedBy: number,
  reason: string,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(goodsReceiptNotes)
    .set(buildRejectionPayload(rejectedBy, GRN_STATUS.REJECTED, reason))
    .where(and(
      eq(goodsReceiptNotes.id, grnId),
      ...scopedAndActive(goodsReceiptNotes, ctx),
    ));
}

/**
 * Soft-delete a GRN.
 */
export async function softDeleteGrn(
  db: DB,
  grnId: number,
  userId: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(goodsReceiptNotes)
    .set(buildSoftDeletePayload(userId))
    .where(and(
      eq(goodsReceiptNotes.id, grnId),
      ...scopedAndActive(goodsReceiptNotes, ctx),
    ));
}
