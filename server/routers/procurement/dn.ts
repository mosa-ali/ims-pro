/**
 * Delivery Note (DN) Router
 * Handles DN operations: list, retrieve, and audit
 * DN is immutable and read-only after creation
 */

import { z } from "zod";
import {
  checkDeletionGovernance,
  performHardDelete,
  performSoftDelete,
} from "../../db/deletionGovernance";

import { scopedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { eq, and, inArray } from 'drizzle-orm';

export const dnRouter = {
  /**
   * Get all DNs for a Purchase Request
   * Returns DNs linked to POs which are linked to the PR
   */
  getByPR: scopedProcedure
    .input(z.object({ purchaseRequestId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const { deliveryNotes, deliveryNoteLines, purchaseOrders, vendors, users } = await import("../../../drizzle/schema");

      try {
        // Get all POs for this PR
        const pos = await db
          .select({ id: purchaseOrders.id })
          .from(purchaseOrders)
          .where(
            and(
              eq(purchaseOrders.purchaseRequestId, input.purchaseRequestId),
              eq(purchaseOrders.organizationId, ctx.scope.organizationId)
            )
          );

        if (pos.length === 0) return [];

        const poIds = pos.map(p => p.id);

        // Get all DNs for these POs (excluding deleted)
        const dns = await db
          .select({
            id: deliveryNotes.id,
            dnNumber: deliveryNotes.dnNumber,
            poId: deliveryNotes.poId,
            grnId: deliveryNotes.grnId,
            vendorId: deliveryNotes.vendorId,
            deliveryDate: deliveryNotes.deliveryDate,
            status: deliveryNotes.status,
            remarks: deliveryNotes.remarks,
            createdAt: deliveryNotes.createdAt,
            createdBy: deliveryNotes.createdBy,
            vendorName: vendors.name,
            createdByName: users.name,
          })
          .from(deliveryNotes)
          .leftJoin(vendors, eq(deliveryNotes.vendorId, vendors.id))
          .leftJoin(users, eq(deliveryNotes.createdBy, users.id))
          .where(
            and(
              eq(deliveryNotes.organizationId, ctx.scope.organizationId),
              inArray(deliveryNotes.poId, poIds),
              eq(deliveryNotes.isDeleted, 0)
            )
          );

        // For each DN, get line items count
        const dnsWithLineItems = await Promise.all(
          dns.map(async (dn) => {
            const lineItems = await db
              .select()
              .from(deliveryNoteLines)
              .where(eq(deliveryNoteLines.dnId, dn.id));
            
            return {
              ...dn,
              lineItemsCount: lineItems.length,
              lineItems,
            };
          })
        );

        return dnsWithLineItems;
      } catch (error) {
        console.error("[DN] Error fetching DNs by PR:", error);
        throw error;
      }
    }),

  /**
   * Delete a Delivery Note (soft delete)
   */
    delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Get document to check status
      const [doc] = await db
        .select()
        .from(deliveryNotes)
        .where(
          and(
            eq(deliveryNotes.id, input.id),
            eq(deliveryNotes.organizationId, ctx.scope.organizationId)
          )
        );

      if (!doc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      // Check deletion governance (Option A: Hard delete in Draft only)
      const governance = await checkDeletionGovernance(
        db,
        "DN",
        input.id,
        doc.status,
        ctx.scope.organizationId,
        ctx.scope.operatingUnitId
      );

      if (!governance.allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: governance.reason || "Deletion not allowed",
        });
      }

      // Execute appropriate deletion based on governance decision
      if (governance.mode === "hard") {
        await performHardDelete(
          db,
          "DN",
          input.id,
          ctx.scope.organizationId
        );
      } else {
        await performSoftDelete(
          db,
          "DN",
          input.id,
          ctx.scope.organizationId,
          ctx.user.id,
          "User initiated deletion"
        );
      }

      return {
        success: true,
        mode: governance.mode,
        message:
          governance.mode === "hard"
            ? "Document hard deleted successfully"
            : "Document soft deleted successfully",
      };
    }),

  /**
   * Get single DN with full details
   */
  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const {
        deliveryNotes,
        deliveryNoteLines,
        purchaseOrders,
        purchaseOrderLineItems,
        vendors,
        users,
        goodsReceiptNotes,
      } = await import("../../../drizzle/schema");

      try {
        // Get DN header
        const [dn] = await db
          .select({
            id: deliveryNotes.id,
            dnNumber: deliveryNotes.dnNumber,
            poId: deliveryNotes.poId,
            grnId: deliveryNotes.grnId,
            vendorId: deliveryNotes.vendorId,
            deliveryDate: deliveryNotes.deliveryDate,
            status: deliveryNotes.status,
            remarks: deliveryNotes.remarks,
            createdAt: deliveryNotes.createdAt,
            createdBy: deliveryNotes.createdBy,
            poNumber: purchaseOrders.poNumber,
            grnNumber: goodsReceiptNotes.grnNumber,
            vendorName: vendors.name,
            createdByName: users.name,
          })
          .from(deliveryNotes)
          .leftJoin(purchaseOrders, eq(deliveryNotes.poId, purchaseOrders.id))
          .leftJoin(goodsReceiptNotes, eq(deliveryNotes.grnId, goodsReceiptNotes.id))
          .leftJoin(vendors, eq(deliveryNotes.vendorId, vendors.id))
          .leftJoin(users, eq(deliveryNotes.createdBy, users.id))
          .where(
            and(
              eq(deliveryNotes.id, input.id),
              eq(deliveryNotes.organizationId, ctx.scope.organizationId)
            )
          );

        if (!dn) {
          throw new Error(`Delivery Note not found: ${input.id}`);
        }

        // Get DN line items with PO item details
        const lineItems = await db
          .select({
            id: deliveryNoteLines.id,
            lineNumber: deliveryNoteLines.lineNumber,
            poLineItemId: deliveryNoteLines.poLineItemId,
            deliveredQty: deliveryNoteLines.deliveredQty,
            unit: deliveryNoteLines.unit,
            remarks: deliveryNoteLines.remarks,
            description: purchaseOrderLineItems.description,
            orderedQty: purchaseOrderLineItems.quantity,
          })
          .from(deliveryNoteLines)
          .leftJoin(purchaseOrderLineItems, eq(deliveryNoteLines.poLineItemId, purchaseOrderLineItems.id))
          .where(eq(deliveryNoteLines.dnId, input.id))
          .orderBy(deliveryNoteLines.lineNumber);

        return {
          ...dn,
          lineItems,
        };
      } catch (error) {
        console.error("[DN] Error fetching DN by ID:", error);
        throw error;
      }
    }),
};
