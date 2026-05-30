/**
 * Deletion Governance Helper - Option A (Hard Delete in Draft Only)
 * 
 * Enforces mandatory deletion governance across procurement workflow:
 * PR → RFQ → PO → GRN → DN → Payment
 * 
 * Rule:
 * - Draft Status: Hard delete allowed (no soft delete record)
 * - After Status Change: Soft delete only (set deletedAt, deletedBy)
 * - Cross-Document Safety: Hard delete blocked if downstream documents exist
 * - Ledger Impact: Hard delete blocked if ledger entries exist
 */

import { TRPCError } from "@trpc/server";
import { and, eq, gt } from "drizzle-orm";
import type { Database } from "../_core/db";
import {
  purchaseRequests,
  quotationAnalyses,
  purchaseOrders,
  goodsReceiptNotes,
  deliveryNotes,
  purchaseRequestLineItems,
  quotationAnalysisLineItems,
  purchaseOrderLineItems,
  grnLineItems,
  deliveryNoteLines,
} from "../../drizzle/schema";

export type DeletionMode = "hard" | "soft";
export type DocumentType = "PR" | "RFQ" | "PO" | "GRN" | "DN" | "Payment";

interface DeletionCheckResult {
  allowed: boolean;
  mode: DeletionMode;
  reason?: string;
}

/**
 * Check if a document can be hard deleted
 * Hard delete is allowed ONLY if:
 * 1. Document status is "Draft"
 * 2. No downstream documents exist
 * 3. No ledger entries exist
 * 4. No issued/received quantities recorded
 */
export async function checkDeletionGovernance(
  db: Database,
  docType: DocumentType,
  docId: number,
  docStatus: string,
  organizationId: number,
  operatingUnitId: number
): Promise<DeletionCheckResult> {
  // Rule 1: Only Draft status allows hard delete
  const isDraft = docStatus === "Draft" || docStatus === "draft";
  
  if (!isDraft) {
    return {
      allowed: true,
      mode: "soft",
      reason: `Document status is "${docStatus}". Only soft delete allowed.`,
    };
  }

  // Rule 2: Check for downstream documents
  const downstreamCheck = await checkDownstreamDocuments(
    db,
    docType,
    docId,
    organizationId,
    operatingUnitId
  );

  if (!downstreamCheck.allowed) {
    return {
      allowed: false,
      mode: "soft",
      reason: downstreamCheck.reason,
    };
  }

  // Rule 3: Check for ledger impacts
  const ledgerCheck = await checkLedgerImpacts(
    db,
    docType,
    docId,
    organizationId,
    operatingUnitId
  );

  if (!ledgerCheck.allowed) {
    return {
      allowed: false,
      mode: "soft",
      reason: ledgerCheck.reason,
    };
  }

  // All checks passed - hard delete allowed
  return {
    allowed: true,
    mode: "hard",
    reason: "Draft document with no downstream dependencies or ledger impacts. Hard delete allowed.",
  };
}

/**
 * Check if downstream documents exist
 * Prevents deletion if child documents exist:
 * PR → RFQ → PO → GRN → DN → Payment
 */
async function checkDownstreamDocuments(
  db: Database,
  docType: DocumentType,
  docId: number,
  organizationId: number,
  operatingUnitId: number
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    switch (docType) {
      case "PR": {
        // Check if RFQ exists for this PR
        const rfqs = await db
          .select({ id: quotationAnalyses.id })
          .from(quotationAnalyses)
          .where(
            and(
              eq(quotationAnalyses.purchaseRequestId, docId),
              eq(quotationAnalyses.isDeleted, false),
              eq(quotationAnalyses.organizationId, organizationId)
            )
          )
          .limit(1);

        if (rfqs.length > 0) {
          return {
            allowed: false,
            reason: "Cannot hard delete PR: RFQ documents exist for this PR",
          };
        }
        break;
      }

      case "RFQ": {
        // Check if PO exists for this RFQ
        const pos = await db
          .select({ id: purchaseOrders.id })
          .from(purchaseOrders)
          .where(
            and(
              eq(purchaseOrders.quotationAnalysisId, docId),
              eq(purchaseOrders.isDeleted, false),
              eq(purchaseOrders.organizationId, organizationId)
            )
          )
          .limit(1);

        if (pos.length > 0) {
          return {
            allowed: false,
            reason: "Cannot hard delete RFQ: Purchase Orders exist for this RFQ",
          };
        }
        break;
      }

      case "PO": {
        // Check if GRN exists for this PO
        const grns = await db
          .select({ id: goodsReceiptNotes.id })
          .from(goodsReceiptNotes)
          .where(
            and(
              eq(goodsReceiptNotes.purchaseOrderId, docId),
              eq(goodsReceiptNotes.isDeleted, false),
              eq(goodsReceiptNotes.organizationId, organizationId)
            )
          )
          .limit(1);

        if (grns.length > 0) {
          return {
            allowed: false,
            reason: "Cannot hard delete PO: Goods Receipt Notes exist for this PO",
          };
        }
        break;
      }

      case "GRN": {
        // Check if DN exists for this GRN
        const dns = await db
          .select({ id: deliveryNotes.id })
          .from(deliveryNotes)
          .where(
            and(
              eq(deliveryNotes.grnId, docId),
              eq(deliveryNotes.isDeleted, false),
              eq(deliveryNotes.organizationId, organizationId)
            )
          )
          .limit(1);

        if (dns.length > 0) {
          return {
            allowed: false,
            reason: "Cannot hard delete GRN: Delivery Notes exist for this GRN",
          };
        }
        break;
      }

      case "DN": {
        // Check if Payment exists for this DN
        // TODO: Implement when payment module is added
        break;
      }

      case "Payment": {
        // Payment is final document - no downstream checks needed
        break;
      }
    }

    return { allowed: true };
  } catch (error) {
    console.error("[DeletionGovernance] Error checking downstream documents:", error);
    // On error, default to soft delete for safety
    return {
      allowed: false,
      reason: "Error checking downstream documents. Soft delete enforced.",
    };
  }
}

/**
 * Check for ledger impacts
 * Prevents hard delete if:
 * - Stock ledger entries exist
 * - Financial ledger entries exist
 * - Issued/received quantities recorded
 */
async function checkLedgerImpacts(
  db: Database,
  docType: DocumentType,
  docId: number,
  organizationId: number,
  operatingUnitId: number
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    switch (docType) {
      case "GRN": {
        // Check if GRN has received quantities
        const receivedItems = await db
          .select({ id: grnLineItems.id })
          .from(grnLineItems)
          .where(
            and(
              eq(grnLineItems.grnId, docId),
              gt(grnLineItems.receivedQty, 0)
            )
          )
          .limit(1);

        if (receivedItems.length > 0) {
          return {
            allowed: false,
            reason: "Cannot hard delete GRN: Received quantities recorded. Stock ledger affected.",
          };
        }

        // Check if GRN has accepted quantities
        const acceptedItems = await db
          .select({ id: grnLineItems.id })
          .from(grnLineItems)
          .where(
            and(
              eq(grnLineItems.grnId, docId),
              gt(grnLineItems.acceptedQty, 0)
            )
          )
          .limit(1);

        if (acceptedItems.length > 0) {
          return {
            allowed: false,
            reason: "Cannot hard delete GRN: Accepted quantities recorded. Stock ledger affected.",
          };
        }
        break;
      }

      case "DN": {
        // Check if DN has delivered quantities
        const deliveredItems = await db
          .select({ id: deliveryNoteLines.id })
          .from(deliveryNoteLines)
          .where(
            and(
              eq(deliveryNoteLines.dnId, docId),
              gt(deliveryNoteLines.deliveredQty, 0)
            )
          )
          .limit(1);

        if (deliveredItems.length > 0) {
          return {
            allowed: false,
            reason: "Cannot hard delete DN: Delivered quantities recorded.",
          };
        }
        break;
      }

      case "Payment": {
        // Check if payment has financial ledger entries
        // TODO: Implement when payment module is added
        break;
      }

      // For PR, RFQ, PO - check if line items have quantities
      case "PR":
      case "RFQ":
      case "PO": {
        // These are typically safe to hard delete if in Draft
        // Ledger impacts only occur at GRN/Payment level
        break;
      }
    }

    return { allowed: true };
  } catch (error) {
    console.error("[DeletionGovernance] Error checking ledger impacts:", error);
    // On error, default to soft delete for safety
    return {
      allowed: false,
      reason: "Error checking ledger impacts. Soft delete enforced.",
    };
  }
}

/**
 * Perform hard delete (actual database record removal)
 * WARNING: This is irreversible. Only call after all governance checks pass.
 */
export async function performHardDelete(
  db: Database,
  docType: DocumentType,
  docId: number,
  organizationId: number
): Promise<void> {
  try {
    switch (docType) {
      case "PR":
        // Delete PR and all line items
        await db
          .delete(purchaseRequestLineItems)
          .where(
            and(
              eq(purchaseRequestLineItems.purchaseRequestId, docId),
              eq(purchaseRequestLineItems.organizationId, organizationId)
            )
          );

        await db
          .delete(purchaseRequests)
          .where(
            and(
              eq(purchaseRequests.id, docId),
              eq(purchaseRequests.organizationId, organizationId)
            )
          );
        break;

      case "RFQ":
        // Delete RFQ and all line items
        await db
          .delete(quotationAnalysisLineItems)
          .where(
            and(
              eq(quotationAnalysisLineItems.quotationAnalysisId, docId),
              eq(quotationAnalysisLineItems.organizationId, organizationId)
            )
          );

        await db
          .delete(quotationAnalyses)
          .where(
            and(
              eq(quotationAnalyses.id, docId),
              eq(quotationAnalyses.organizationId, organizationId)
            )
          );
        break;

      case "PO":
        // Delete PO and all line items
        await db
          .delete(purchaseOrderLineItems)
          .where(
            and(
              eq(purchaseOrderLineItems.purchaseOrderId, docId),
              eq(purchaseOrderLineItems.organizationId, organizationId)
            )
          );

        await db
          .delete(purchaseOrders)
          .where(
            and(
              eq(purchaseOrders.id, docId),
              eq(purchaseOrders.organizationId, organizationId)
            )
          );
        break;

      case "GRN":
        // Delete GRN and all line items
        await db
          .delete(grnLineItems)
          .where(
            and(
              eq(grnLineItems.grnId, docId),
              eq(grnLineItems.organizationId, organizationId)
            )
          );

        await db
          .delete(goodsReceiptNotes)
          .where(
            and(
              eq(goodsReceiptNotes.id, docId),
              eq(goodsReceiptNotes.organizationId, organizationId)
            )
          );
        break;

      case "DN":
        // Delete DN and all line items
        await db
          .delete(deliveryNoteLines)
          .where(
            and(
              eq(deliveryNoteLines.dnId, docId),
              eq(deliveryNoteLines.organizationId, organizationId)
            )
          );

        await db
          .delete(deliveryNotes)
          .where(
            and(
              eq(deliveryNotes.id, docId),
              eq(deliveryNotes.organizationId, organizationId)
            )
          );
        break;

      case "Payment":
        // TODO: Implement when payment module is added
        break;
    }

    console.log(
      `[DeletionGovernance] Hard delete completed for ${docType} ID: ${docId}`
    );
  } catch (error) {
    console.error(
      `[DeletionGovernance] Error performing hard delete for ${docType} ID: ${docId}:`,
      error
    );
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to delete ${docType}: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }
}

/**
 * Perform soft delete (mark as deleted, preserve record)
 */
export async function performSoftDelete(
  db: Database,
  docType: DocumentType,
  docId: number,
  organizationId: number,
  deletedBy: string,
  deletionReason?: string
): Promise<void> {
  try {
    const now = new Date();

    switch (docType) {
      case "PR":
        await db
          .update(purchaseRequests)
          .set({
            isDeleted: true,
            deletedAt: now,
            deletedBy: deletedBy,
          })
          .where(
            and(
              eq(purchaseRequests.id, docId),
              eq(purchaseRequests.organizationId, organizationId)
            )
          );
        break;

      case "RFQ":
        await db
          .update(quotationAnalyses)
          .set({
            isDeleted: true,
            deletedAt: now,
            deletedBy: deletedBy,
          })
          .where(
            and(
              eq(quotationAnalyses.id, docId),
              eq(quotationAnalyses.organizationId, organizationId)
            )
          );
        break;

      case "PO":
        await db
          .update(purchaseOrders)
          .set({
            isDeleted: true,
            deletedAt: now,
            deletedBy: deletedBy,
          })
          .where(
            and(
              eq(purchaseOrders.id, docId),
              eq(purchaseOrders.organizationId, organizationId)
            )
          );
        break;

      case "GRN":
        await db
          .update(goodsReceiptNotes)
          .set({
            isDeleted: true,
            deletedAt: now,
            deletedBy: deletedBy,
          })
          .where(
            and(
              eq(goodsReceiptNotes.id, docId),
              eq(goodsReceiptNotes.organizationId, organizationId)
            )
          );
        break;

      case "DN":
        await db
          .update(deliveryNotes)
          .set({
            isDeleted: true,
            deletedAt: now,
            deletedBy: deletedBy,
          })
          .where(
            and(
              eq(deliveryNotes.id, docId),
              eq(deliveryNotes.organizationId, organizationId)
            )
          );
        break;

      case "Payment":
        // TODO: Implement when payment module is added
        break;
    }

    console.log(
      `[DeletionGovernance] Soft delete completed for ${docType} ID: ${docId}. Reason: ${deletionReason || "Not provided"}`
    );
  } catch (error) {
    console.error(
      `[DeletionGovernance] Error performing soft delete for ${docType} ID: ${docId}:`,
      error
    );
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to delete ${docType}: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }
}
