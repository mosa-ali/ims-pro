/**
 * Procurement Document Router
 * 
 * Automatically routes documents through the 13-stage procurement lifecycle
 * as Purchase Requests progress through their workflow.
 * 
 * Procurement Lifecycle:
 * 1. Purchase Requests (PR Created)
 * 2. RFQ / Tender Documents (RFQs Issued)
 * 3. Bid Opening Minutes (Bid Opening Closed)
 * 4. Supplier Quotations / Offer Matrix (Quotations Received)
 * 5. Bid Evaluation (Evaluation Started)
 * 6. Quotation Analysis / Competitive Bid Analysis (CBA Published)
 * 7. Contracts (Contract Finalized)
 * 8. Purchase Orders (PO Approved)
 * 9. Goods Receipt Notes (GRN Approved)
 * 10. Delivery Notes (DN Approved)
 * 11. Service Acceptance Certificates (SAC Approved)
 * 12. Payments / Supporting Finance Documents (Payment Approved)
 * 13. Audit Logs / Supporting Attachments (Audit Published)
 */

import { getDb } from "../db";
import { documents, purchaseRequests } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

export type ProcurementStage = 
  | "purchase_requests"
  | "rfqs"
  | "bid_opening_minutes"
  | "quotations"
  | "bid_evaluation"
  | "competitive_bid_analysis"
  | "contracts"
  | "purchase_orders"
  | "goods_receipt_notes"
  | "delivery_notes"
  | "service_acceptance_certificates"
  | "payments"
  | "audit_logs";

/**
 * Maps procurement status to document folder stage
 */
export const procurementStatusToDocumentStage = (procurementStatus: string): ProcurementStage | null => {
  const mapping: Record<string, ProcurementStage> = {
    "rfqs": "rfqs",
    "quotations_analysis": "quotations",
    "tender_invitation": "rfqs",
    "bids_analysis": "bid_evaluation",
    "purchase_order": "purchase_orders",
    "delivery": "delivery_notes",
    "grn": "goods_receipt_notes",
    "payment": "payments",
    "completed": "audit_logs",
  };
  return mapping[procurementStatus] || null;
};

/**
 * Get the document folder key for a procurement stage
 */
export const getDocumentFolderKey = (stage: ProcurementStage): string => {
  const folderKeys: Record<ProcurementStage, string> = {
    "purchase_requests": "01_Purchase_Requests",
    "rfqs": "02_RFQ_Tender_Documents",
    "bid_opening_minutes": "03_Bid_Opening_Minutes",
    "quotations": "04_Supplier_Quotations",
    "bid_evaluation": "05_Bid_Evaluation",
    "competitive_bid_analysis": "06_Competitive_Bid_Analysis",
    "contracts": "07_Contracts",
    "purchase_orders": "08_Purchase_Orders",
    "goods_receipt_notes": "09_Goods_Receipt_Notes",
    "delivery_notes": "10_Delivery_Notes",
    "service_acceptance_certificates": "11_Service_Acceptance_Certificates",
    "payments": "12_Payments",
    "audit_logs": "13_Audit_Logs",
  };
  return folderKeys[stage];
};

/**
 * Automatically route documents when PR status changes
 * Called when PR procurement status is updated
 */
export async function routeProcurementDocuments(
  prId: number,
  organizationId: number,
  operatingUnitId: number,
  newProcurementStatus: string
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    // Get the target stage for this procurement status
    const targetStage = procurementStatusToDocumentStage(newProcurementStatus);
    if (!targetStage) return;

    const targetFolderKey = getDocumentFolderKey(targetStage);

    // Find all documents linked to this PR
    const prDocuments = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.relatedPrId, prId),
          eq(documents.organizationId, organizationId),
          eq(documents.operatingUnitId, operatingUnitId)
        )
      );

    // Update each document's folder to the new stage
    for (const doc of prDocuments) {
      await db
        .update(documents)
        .set({
          folderPath: targetFolderKey,
          updatedAt: new Date(),
        })
        .where(eq(documents.id, doc.id));

      // Log the routing action in audit trail
      await logDocumentRouting(
        doc.id,
        prId,
        organizationId,
        operatingUnitId,
        targetStage,
        targetFolderKey
      );
    }
  } catch (error) {
    console.error("[Procurement Document Router] Error routing documents:", error);
    // Don't throw - document routing should not block PR status updates
  }
}

/**
 * Log document routing action in audit trail
 */
async function logDocumentRouting(
  documentId: number,
  prId: number,
  organizationId: number,
  operatingUnitId: number,
  stage: ProcurementStage,
  folderKey: string
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    // This would be logged to document_audit_logs table
    // Implementation depends on your audit logging setup
    console.log(`[Document Router] Document ${documentId} routed to ${stage} (${folderKey}) for PR ${prId}`);
  } catch (error) {
    console.error("[Document Router] Error logging routing:", error);
  }
}

/**
 * Get all procurement stages for a PR
 * Returns the complete document discovery path
 */
export async function getProcurementDocumentPath(
  prId: number,
  organizationId: number,
  operatingUnitId: number
): Promise<{ stage: ProcurementStage; folderKey: string; documentCount: number }[]> {
  try {
    const db = await getDb();
    if (!db) return [];

    // Get the PR to see its current procurement status
    const [pr] = await db
      .select()
      .from(purchaseRequests)
      .where(
        and(
          eq(purchaseRequests.id, prId),
          eq(purchaseRequests.organizationId, organizationId),
          eq(purchaseRequests.operatingUnitId, operatingUnitId)
        )
      );

    if (!pr) return [];

    // Get all documents for this PR grouped by stage
    const prDocuments = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.relatedPrId, prId),
          eq(documents.organizationId, organizationId),
          eq(documents.operatingUnitId, operatingUnitId)
        )
      );

    // Group documents by folder path
    const stageMap = new Map<string, number>();
    for (const doc of prDocuments) {
      const count = stageMap.get(doc.folderPath) || 0;
      stageMap.set(doc.folderPath, count + 1);
    }

    // Convert to response format
    const stages: { stage: ProcurementStage; folderKey: string; documentCount: number }[] = [];
    for (const [folderKey, documentCount] of stageMap) {
      // Find the stage that matches this folder key
      const stage = Object.entries({
        "purchase_requests": "01_Purchase_Requests",
        "rfqs": "02_RFQ_Tender_Documents",
        "bid_opening_minutes": "03_Bid_Opening_Minutes",
        "quotations": "04_Supplier_Quotations",
        "bid_evaluation": "05_Bid_Evaluation",
        "competitive_bid_analysis": "06_Competitive_Bid_Analysis",
        "contracts": "07_Contracts",
        "purchase_orders": "08_Purchase_Orders",
        "goods_receipt_notes": "09_Goods_Receipt_Notes",
        "delivery_notes": "10_Delivery_Notes",
        "service_acceptance_certificates": "11_Service_Acceptance_Certificates",
        "payments": "12_Payments",
        "audit_logs": "13_Audit_Logs",
      }).find(([_, key]) => key === folderKey)?.[0] as ProcurementStage | undefined;

      if (stage) {
        stages.push({ stage, folderKey, documentCount });
      }
    }

    return stages;
  } catch (error) {
    console.error("[Procurement Document Router] Error getting document path:", error);
    return [];
  }
}

/**
 * Initialize documents for a new PR
 * Creates the initial PR document entry
 */
export async function initializePRDocuments(
  prId: number,
  prNumber: string,
  organizationId: number,
  operatingUnitId: number,
  createdBy: number
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    // Create initial PR document entry
    await db.insert(documents).values({
      documentName: `PR-${prNumber}-Initial`,
      documentType: "purchase_request",
      fileKey: `pr/${prNumber}/initial`,
      fileUrl: "",
      folderPath: "01_Purchase_Requests",
      relatedPrId: prId,
      organizationId,
      operatingUnitId,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("[Procurement Document Router] Error initializing PR documents:", error);
  }
}
