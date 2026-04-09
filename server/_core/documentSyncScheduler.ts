import { getDb } from "../db";
import { documents, payments, purchaseRequests } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { storagePut } from "../storage";

/**
 * Auto-sync scheduler for PR documents
 * Triggered when payment status changes to 'paid'
 */
export async function syncPRDocumentsOnPaymentCompletion(): Promise<void> {
  try {
    const db = await getDb();

    // Find all payments that are marked as 'paid' but have pending documents
    const paidPayments = await db
      .select()
      .from(payments)
      .where(eq(payments.status, "paid"));

    console.log(`[DocumentSync] Found ${paidPayments.length} paid payments`);

    for (const payment of paidPayments) {
      if (!payment.purchaseRequestId) continue;

      try {
        // Get all pending documents for this PR
        const pendingDocs = await db
          .select()
          .from(documents)
          .where(
            and(
              eq(documents.entityType, "purchase_request"),
              eq(documents.entityId, payment.purchaseRequestId.toString()),
              eq(documents.syncStatus, "pending")
            )
          );

        console.log(
          `[DocumentSync] PR ${payment.purchaseRequestId}: Found ${pendingDocs.length} pending documents`
        );

        // Sync each document to Central Documents
        for (const doc of pendingDocs) {
          try {
            // Update sync status to 'synced'
            await db
              .update(documents)
              .set({
                syncStatus: "synced",
                syncedAt: new Date().toISOString(),
              })
              .where(eq(documents.id, doc.id));

            console.log(
              `[DocumentSync] Successfully synced document ${doc.documentId}`
            );
          } catch (error) {
            console.error(
              `[DocumentSync] Error syncing document ${doc.documentId}:`,
              error
            );

            // Mark as error
            await db
              .update(documents)
              .set({
                syncStatus: "error",
                syncError: (error as Error).message,
              })
              .where(eq(documents.id, doc.id));
          }
        }

        // Mark payment as synced
        await db
          .update(payments)
          .set({
            documentsSynced: true,
            documentsSyncedAt: new Date().toISOString(),
          })
          .where(eq(payments.id, payment.id));

        console.log(
          `[DocumentSync] Completed sync for payment ${payment.id}`
        );
      } catch (error) {
        console.error(
          `[DocumentSync] Error processing payment ${payment.id}:`,
          error
        );
      }
    }
  } catch (error) {
    console.error("[DocumentSync] Scheduler error:", error);
  }
}

/**
 * Sync specific PR documents to Central Documents
 */
export async function syncPRDocumentsToCentral(
  prId: number,
  organizationId: number
): Promise<{ synced: number; failed: number; errors: string[] }> {
  try {
    const db = await getDb();
    const errors: string[] = [];
    let synced = 0;
    let failed = 0;

    // Get all pending documents for this PR
    const pendingDocs = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.entityType, "purchase_request"),
          eq(documents.entityId, prId.toString()),
          eq(documents.organizationId, organizationId),
          eq(documents.syncStatus, "pending")
        )
      );

    console.log(
      `[DocumentSync] Syncing ${pendingDocs.length} documents for PR ${prId}`
    );

    for (const doc of pendingDocs) {
      try {
        // Verify document file exists in S3
        if (!doc.filePath) {
          throw new Error("Document file path not found");
        }

        // Update sync status to 'synced'
        await db
          .update(documents)
          .set({
            syncStatus: "synced",
            syncedAt: new Date().toISOString(),
          })
          .where(eq(documents.id, doc.id));

        synced++;
        console.log(`[DocumentSync] Synced document: ${doc.documentId}`);
      } catch (error) {
        failed++;
        const errorMsg = (error as Error).message;
        errors.push(`${doc.documentId}: ${errorMsg}`);

        // Mark as error
        await db
          .update(documents)
          .set({
            syncStatus: "error",
            syncError: errorMsg,
          })
          .where(eq(documents.id, doc.id));

        console.error(
          `[DocumentSync] Error syncing document ${doc.documentId}:`,
          error
        );
      }
    }

    return { synced, failed, errors };
  } catch (error) {
    console.error("[DocumentSync] Error in syncPRDocumentsToCentral:", error);
    return {
      synced: 0,
      failed: 0,
      errors: [(error as Error).message],
    };
  }
}

/**
 * Check and sync documents for a specific payment
 */
export async function syncDocumentsForPayment(
  paymentId: number
): Promise<boolean> {
  try {
    const db = await getDb();

    // Get payment details
    const payment = await db
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .then((rows) => rows[0]);

    if (!payment || payment.status !== "paid" || !payment.purchaseRequestId) {
      return false;
    }

    // Get PR details for organization context
    const pr = await db
      .select()
      .from(purchaseRequests)
      .where(eq(purchaseRequests.id, payment.purchaseRequestId))
      .then((rows) => rows[0]);

    if (!pr) {
      return false;
    }

    // Sync documents
    const result = await syncPRDocumentsToCentral(
      payment.purchaseRequestId,
      pr.organizationId
    );

    return result.failed === 0 && result.synced > 0;
  } catch (error) {
    console.error("[DocumentSync] Error in syncDocumentsForPayment:", error);
    return false;
  }
}

/**
 * Get sync status for a PR
 */
export async function getPRDocumentSyncStatus(prId: number): Promise<{
  total: number;
  pending: number;
  synced: number;
  error: number;
  lastSyncedAt?: string;
}> {
  try {
    const db = await getDb();

    const docs = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.entityType, "purchase_request"),
          eq(documents.entityId, prId.toString())
        )
      );

    const total = docs.length;
    const pending = docs.filter((d) => d.syncStatus === "pending").length;
    const synced = docs.filter((d) => d.syncStatus === "synced").length;
    const error = docs.filter((d) => d.syncStatus === "error").length;

    // Get last synced date
    const lastSynced = docs
      .filter((d) => d.syncedAt)
      .sort(
        (a, b) =>
          new Date(b.syncedAt!).getTime() - new Date(a.syncedAt!).getTime()
      )[0];

    return {
      total,
      pending,
      synced,
      error,
      lastSyncedAt: lastSynced?.syncedAt,
    };
  } catch (error) {
    console.error("[DocumentSync] Error in getPRDocumentSyncStatus:", error);
    return { total: 0, pending: 0, synced: 0, error: 0 };
  }
}
