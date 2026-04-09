import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { documents, purchaseRequests, purchaseOrders, goodsReceiptNotes, deliveryNotes, payments } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { storagePut } from "../storage";
import { generatePRDocument } from "../_core/prDocumentGenerator";

/**
 * PR Document Router
 * Handles document generation, storage, and syncing for purchase requests
 */
export const prDocumentRouter = router({
  /**
   * Generate and store PR document as PDF
   */
  generatePRDocument: protectedProcedure
    .input(
      z.object({
        prId: z.number(),
        documentType: z.enum(["PR", "RFQ", "PO", "GRN", "DELIVERY", "PAYMENT"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const { prId, documentType } = input;

        // Get PR details
        const pr = await db
          .select()
          .from(purchaseRequests)
          .where(
            and(
              eq(purchaseRequests.id, prId),
              eq(purchaseRequests.organizationId, ctx.user.organizationId),
              eq(purchaseRequests.operatingUnitId, ctx.user.operatingUnitId)
            )
          )
          .then((rows) => rows[0]);

        if (!pr) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Purchase request not found",
          });
        }

        // Generate PDF document
        const pdfBuffer = await generatePRDocument(pr, documentType, ctx.user.organizationId);

        // Upload to S3
        const fileName = `PR-${pr.prNumber}-${documentType}-${Date.now()}.pdf`;
        const fileKey = `procurement/${pr.organizationId}/${pr.operatingUnitId}/pr-${prId}/${fileName}`;

        const { url } = await storagePut(fileKey, pdfBuffer, "application/pdf");

        // Store document metadata in database
        const documentId = `pr-${prId}-${documentType}-${Date.now()}`;

        await db.insert(documents).values({
          documentId,
          workspace: "logistics",
          projectId: pr.projectId?.toString(),
          folderCode: `PR_${documentType}`,
          fileName,
          filePath: url,
          fileType: "application/pdf",
          fileSize: pdfBuffer.length,
          uploadedBy: ctx.user.id,
          uploadedAt: new Date().toISOString(),
          syncSource: "pr_workflow",
          syncStatus: "pending",
          version: 1,
          organizationId: ctx.user.organizationId,
          operatingUnitId: ctx.user.operatingUnitId,
          entityType: "purchase_request",
          entityId: prId.toString(),
        });

        return {
          success: true,
          documentId,
          fileName,
          url,
          message: `${documentType} document generated successfully`,
        };
      } catch (error) {
        console.error("Error generating PR document:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate PR document",
        });
      }
    }),

  /**
   * Get all documents for a purchase request
   */
  getPRDocuments: protectedProcedure
    .input(z.object({ prId: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const { prId } = input;

        // Verify PR belongs to user's organization
        const pr = await db
          .select()
          .from(purchaseRequests)
          .where(
            and(
              eq(purchaseRequests.id, prId),
              eq(purchaseRequests.organizationId, ctx.user.organizationId),
              eq(purchaseRequests.operatingUnitId, ctx.user.operatingUnitId)
            )
          )
          .then((rows) => rows[0]);

        if (!pr) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Purchase request not found",
          });
        }

        // Get all documents for this PR
        const docs = await db
          .select()
          .from(documents)
          .where(
            and(
              eq(documents.entityType, "purchase_request"),
              eq(documents.entityId, prId.toString()),
              eq(documents.organizationId, ctx.user.organizationId),
              eq(documents.operatingUnitId, ctx.user.operatingUnitId)
            )
          );

        return docs;
      } catch (error) {
        console.error("Error fetching PR documents:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch PR documents",
        });
      }
    }),

  /**
   * Sync PR documents to Central Documents when payment is completed
   */
  syncDocumentsToCentral: protectedProcedure
    .input(z.object({ prId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const { prId } = input;

        // Verify PR exists and belongs to user
        const pr = await db
          .select()
          .from(purchaseRequests)
          .where(
            and(
              eq(purchaseRequests.id, prId),
              eq(purchaseRequests.organizationId, ctx.user.organizationId),
              eq(purchaseRequests.operatingUnitId, ctx.user.operatingUnitId)
            )
          )
          .then((rows) => rows[0]);

        if (!pr) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Purchase request not found",
          });
        }

        // Check if payment is completed
        const payment = await db
          .select()
          .from(payments)
          .where(
            and(
              eq(payments.purchaseRequestId, prId),
              eq(payments.organizationId, ctx.user.organizationId),
              eq(payments.operatingUnitId, ctx.user.operatingUnitId)
            )
          )
          .then((rows) => rows[0]);

        if (!payment || payment.status !== "paid") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Payment must be completed before syncing documents",
          });
        }

        // Get all PR documents
        const docs = await db
          .select()
          .from(documents)
          .where(
            and(
              eq(documents.entityType, "purchase_request"),
              eq(documents.entityId, prId.toString()),
              eq(documents.organizationId, ctx.user.organizationId),
              eq(documents.operatingUnitId, ctx.user.operatingUnitId)
            )
          );

        // Update sync status to 'synced' for all documents
        let syncedCount = 0;
        for (const doc of docs) {
          await db
            .update(documents)
            .set({
              syncStatus: "synced",
              updatedAt: new Date().toISOString(),
            })
            .where(eq(documents.id, doc.id));
          syncedCount++;
        }

        return {
          success: true,
          syncedCount,
          message: `${syncedCount} documents synced to Central Documents`,
        };
      } catch (error) {
        console.error("Error syncing documents to central:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to sync documents",
        });
      }
    }),

  /**
   * Delete a PR document
   */
  deletePRDocument: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const { documentId } = input;

        // Get document
        const doc = await db
          .select()
          .from(documents)
          .where(eq(documents.documentId, documentId))
          .then((rows) => rows[0]);

        if (!doc) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Document not found",
          });
        }

        // Verify ownership
        if (
          doc.organizationId !== ctx.user.organizationId ||
          doc.operatingUnitId !== ctx.user.operatingUnitId
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to delete this document",
          });
        }

        // Soft delete
        await db
          .update(documents)
          .set({
            deletedAt: new Date().toISOString(),
            deletedBy: ctx.user.id,
          })
          .where(eq(documents.id, doc.id));

        return {
          success: true,
          message: "Document deleted successfully",
        };
      } catch (error) {
        console.error("Error deleting PR document:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete document",
        });
      }
    }),

  /**
   * Get document generation status for a PR
   */
  getDocumentStatus: protectedProcedure
    .input(z.object({ prId: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const { prId } = input;

        // Get all documents for this PR
        const docs = await db
          .select()
          .from(documents)
          .where(
            and(
              eq(documents.entityType, "purchase_request"),
              eq(documents.entityId, prId.toString()),
              eq(documents.organizationId, ctx.user.organizationId),
              eq(documents.operatingUnitId, ctx.user.operatingUnitId)
            )
          );

        const documentTypes = ["PR", "RFQ", "PO", "GRN", "DELIVERY", "PAYMENT"];
        const status: Record<string, { generated: boolean; synced: boolean }> = {};

        for (const type of documentTypes) {
          const doc = docs.find((d) => d.folderCode === `PR_${type}`);
          status[type] = {
            generated: !!doc,
            synced: doc?.syncStatus === "synced",
          };
        }

        return status;
      } catch (error) {
        console.error("Error getting document status:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get document status",
        });
      }
    }),
});
