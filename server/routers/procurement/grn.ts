/**
 * Goods Receipt Note (GRN) Router
 * 
 * Manages delivery verification, quality inspection, and goods receipt
 * Auto-generates GRN numbers in format: GRN-[PONumber]-[Seq]
 */

import { z } from "zod";
import {
  checkDeletionGovernance,
  performHardDelete,
  performSoftDelete,
} from "../../db/deletionGovernance";

import { router, scopedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { goodsReceiptNotes, grnLineItems, purchaseOrders, purchaseOrderLineItems, procurementPayables, purchaseRequests, deliveryNotes } from "../../../drizzle/schema";
import { eq, and, desc, isNull, inArray } from 'drizzle-orm';
import { TRPCError } from "@trpc/server";
import { generateGRNNumber } from "../../services/procurementNumbering";
import { grnApprovalProcedures } from "./grn-approvals";
import { generateGRNPDF } from "../../_core/grnPDF";

export const grnRouter = router({
  /**
   * Auto-create GRN from PO (triggered when PO is approved)
   */
  autoCreateFromPO: scopedProcedure
    .input(
      z.object({
        purchaseOrderId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Get PO details
      const [po] = await db
        .select()
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.id, input.purchaseOrderId),
            eq(purchaseOrders.organizationId, ctx.scope.organizationId)
          )
        )
        .limit(1);

      if (!po) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Purchase Order not found",
        });
      }

      // Check if GRN already exists for this PO
      const [existingGRN] = await db
        .select()
        .from(goodsReceiptNotes)
        .where(
          and(
            eq(goodsReceiptNotes.purchaseOrderId, input.purchaseOrderId),
            isNull(goodsReceiptNotes.deletedAt)
          )
        )
        .limit(1);

      if (existingGRN) {
        return existingGRN; // Return existing GRN
      }

      // Generate GRN number
      const grnNumber = await generateGRNNumber(
        ctx.scope.organizationId,
        ctx.scope.operatingUnitId || 0,
        po.poNumber
      );

      // Create GRN with default values
      const [result] = await db.insert(goodsReceiptNotes).values({
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
        purchaseOrderId: input.purchaseOrderId,
        supplierId: po.supplierId,
        grnNumber,
        receivedBy: ctx.user.name || ctx.user.email,
        status: "pending_inspection",
        createdBy: ctx.user.id,
        isDeleted: 0,  // Dual-column synchronization
      });

      const grnId = result.insertId;

      // Auto-copy PO line items to GRN line items
      const poLineItems = await db
        .select()
        .from(purchaseOrderLineItems)
        .where(eq(purchaseOrderLineItems.purchaseOrderId, input.purchaseOrderId));

      if (poLineItems.length > 0) {
        const grnLineItemsToInsert = poLineItems.map((item, index) => ({
          grnId,
          poLineItemId: item.id,
          lineNumber: index + 1,
          description: item.description || "",
          orderedQty: String(item.quantity || "0"),
          receivedQty: "0",
          acceptedQty: "0",
          rejectedQty: "0",
          unit: item.unit || "Piece",
          remarks: "",
        }));

        await db.insert(grnLineItems).values(grnLineItemsToInsert);
      }

      return { id: grnId, grnNumber, success: true };
    }),

  /**
   * Create GRN from PO 
   */
  createFromPO: scopedProcedure
    .input(
      z.object({
        purchaseOrderId: z.number(),
        grnDate: z.string().optional(),
        receivedBy: z.string(),
        deliveryNoteNumber: z.string().optional(),
        invoiceNumber: z.string().optional(),
        warehouse: z.string().optional(),
        remarks: z.string().optional(),
        lineItems: z.array(
          z.object({
            lineNumber: z.number(),
            description: z.string(),
            orderedQty: z.union([z.string(), z.number()]),
            receivedQty: z.union([z.string(), z.number()]),
            acceptedQty: z.union([z.string(), z.number()]),
            rejectedQty: z.union([z.string(), z.number()]).optional(),
            unit: z.string().default("Piece"),
            remarks: z.string().optional(),
          })
        ).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Get PO details
      const [po] = await db
        .select()
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.id, input.purchaseOrderId),
            eq(purchaseOrders.organizationId, ctx.scope.organizationId)
          )
        )
        .limit(1);

      if (!po) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Purchase Order not found",
        });
      }

      // Check if PO is acknowledged before allowing GRN creation
      if (po.status !== "acknowledged") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `GRN can only be created for acknowledged POs. Current status: ${po.status}`,
        });
      }

      // Generate GRN number
      const grnNumber = await generateGRNNumber(
        ctx.scope.organizationId,
        ctx.scope.operatingUnitId || 0,
        po.poNumber
      );

      // Create GRN
      const [result] = await db.insert(goodsReceiptNotes).values({
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
        purchaseOrderId: input.purchaseOrderId,
        supplierId: po.supplierId,
        grnNumber,
        grnDate: input.grnDate || new Date().toISOString(),
        receivedBy: input.receivedBy,
        deliveryNoteNumber: input.deliveryNoteNumber,
        invoiceNumber: input.invoiceNumber,
        warehouse: input.warehouse,
        remarks: input.remarks,
        status: "pending_inspection",
        isDeleted: 0,
        createdBy: ctx.user.id,
      });

      const grnId = result.insertId;

      // Auto-copy PO line items if not provided
      let lineItemsToInsert = input.lineItems;

      if (!lineItemsToInsert || lineItemsToInsert.length === 0) {
        // Fetch PO line items and auto-copy
        const poLineItems = await db
          .select()
          .from(purchaseOrderLineItems)
          .where(eq(purchaseOrderLineItems.purchaseOrderId, input.purchaseOrderId));

        lineItemsToInsert = poLineItems.map((item, index) => ({
          lineNumber: index + 1,
          description: item.description || "",
          orderedQty: String(item.quantity || "0"),
          receivedQty: String(item.quantity || "0"),
          acceptedQty: String(item.quantity || "0"),
          rejectedQty: "0",
          unit: item.unit || "Piece",
          remarks: item.specifications || undefined,
        }));
      }

      // Create line items
      if (lineItemsToInsert && lineItemsToInsert.length > 0) {
        await db.insert(grnLineItems).values(
          lineItemsToInsert.map((item) => ({
            grnId,
            lineNumber: item.lineNumber,
            description: item.description,
            orderedQty: String(item.orderedQty || "0"),
            receivedQty: String(item.receivedQty || "0"),
            acceptedQty: String(item.acceptedQty || "0"),
            rejectedQty: String(item.rejectedQty || "0"),
            unit: item.unit || "Piece",
            remarks: item.remarks,
          }))
        );
      }

      return { id: grnId, grnNumber, success: true };
    }),

  /**
   * Get GRN by ID with line items
   */
  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();

      const [grn] = await db
        .select()
        .from(goodsReceiptNotes)
        .where(
          and(
            eq(goodsReceiptNotes.id, input.id),
            eq(goodsReceiptNotes.organizationId, ctx.scope.organizationId),
            isNull(goodsReceiptNotes.deletedAt)
          )
        )
        .limit(1);

      if (!grn) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "GRN not found",
        });
      }

      // Get PO number by joining with purchaseOrders
      let poNumber: string | null = null;
      if (grn.purchaseOrderId) {
        const [po] = await db
          .select({ poNumber: purchaseOrders.poNumber })
          .from(purchaseOrders)
          .where(eq(purchaseOrders.id, grn.purchaseOrderId))
          .limit(1);
        poNumber = po?.poNumber || null;
      }

      // Get line items
      const lineItems = await db
        .select()
        .from(grnLineItems)
        .where(eq(grnLineItems.grnId, input.id));

      return { ...grn, poNumber, lineItems };
    }),

  /**
   * Get GRN by PO
   */
  getByPO: scopedProcedure
    .input(z.object({ purchaseOrderId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();

      const grns = await db
        .select()
        .from(goodsReceiptNotes)
        .where(
          and(
            eq(goodsReceiptNotes.purchaseOrderId, input.purchaseOrderId),
            eq(goodsReceiptNotes.organizationId, ctx.scope.organizationId),
            isNull(goodsReceiptNotes.deletedAt)
          )
        )
        .orderBy(desc(goodsReceiptNotes.createdAt));

      return grns;
    }),

  /**
   * Update inspection status
   */
  updateInspection: scopedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending_inspection", "inspected", "accepted", "partially_accepted", "rejected"]),
        inspectedBy: z.string().optional(),
        remarks: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      await db
        .update(goodsReceiptNotes)
        .set({
          status: input.status,
          inspectedBy: input.inspectedBy,
          remarks: input.remarks,
          updatedBy: ctx.user.id,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(goodsReceiptNotes.id, input.id),
            eq(goodsReceiptNotes.organizationId, ctx.scope.organizationId)
          )
        );

      return { success: true };
    }),

  /**
   * Approve GRN (finalize)
   */
  approve: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Get GRN details
      const [grn] = await db
        .select()
        .from(goodsReceiptNotes)
        .where(
          and(
            eq(goodsReceiptNotes.id, input.id),
            eq(goodsReceiptNotes.organizationId, ctx.scope.organizationId)
          )
        )
        .limit(1);

      if (!grn) {
        throw new TRPCError({ code: "NOT_FOUND", message: "GRN not found" });
      }

      // Get GRN line items
      const grnItems = await db
        .select()
        .from(grnLineItems)
        .where(eq(grnLineItems.grnId, input.id));

      // Import QA ceiling validation
      const { validateGRNReceivingAgainstQACeiling } = await import("../../db");

      // Validate receiving quantities don't exceed PO quantities
      for (const grnItem of grnItems) {
        const receivedQty = parseFloat(String(grnItem.receivedQty || "0"));
        const orderedQty = parseFloat(String(grnItem.orderedQty || "0"));

        if (receivedQty > orderedQty) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Line ${grnItem.lineNumber}: Received quantity (${receivedQty}) exceeds ordered quantity (${orderedQty})`,
          });
        }
      }

      // Approve GRN
      await db
        .update(goodsReceiptNotes)
        .set({
          status: "accepted",
          approvedBy: ctx.user.id,
          approvedAt: new Date().toISOString(),
          updatedBy: ctx.user.id,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(goodsReceiptNotes.id, input.id),
            eq(goodsReceiptNotes.organizationId, ctx.scope.organizationId)
          )
        );

      // ============================================================================
      // PR-FINANCE INTEGRATION: Update Payable Status After GRN
      // ============================================================================

      // Get PO to find PR
      if (grn.purchaseOrderId) {
        const [poForPayable] = await db
          .select()
          .from(purchaseOrders)
          .where(eq(purchaseOrders.id, grn.purchaseOrderId))
          .limit(1);

        if (poForPayable?.purchaseRequestId) {
          // Update payable status to pending_invoice
          await db
            .update(procurementPayables)
            .set({
              status: "pending_invoice",
              updatedAt: new Date().toISOString(),
            })
            .where(
              and(
                eq(procurementPayables.purchaseRequestId, poForPayable.purchaseRequestId),
                eq(procurementPayables.status, "pending_grn")
              )
            );
        }
      }

      return {
        success: true,
        message: "GRN approved - payable ready for invoice matching",
      };
    }),

  /**
   * List all GRNs
   */
  list: scopedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        status: z.enum(["pending_inspection", "inspected", "accepted", "partially_accepted", "rejected"]).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();

      let conditions = [
        eq(goodsReceiptNotes.organizationId, ctx.scope.organizationId),
        isNull(goodsReceiptNotes.deletedAt),
      ];

      if (input.status) {
        conditions.push(eq(goodsReceiptNotes.status, input.status));
      }

      const grns = await db
        .select()
        .from(goodsReceiptNotes)
        .where(and(...conditions))
        .orderBy(desc(goodsReceiptNotes.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return grns;
    }),

  /**
   * Create GRN from Purchase Request (wrapper around createFromPO)
   * Finds the acknowledged PO for the PR and creates GRN from it
   */
  createFromPR: scopedProcedure
    .input(
      z.object({
        purchaseRequestId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Find acknowledged PO for this PR
      const [po] = await db
        .select()
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.purchaseRequestId, input.purchaseRequestId),
            eq(purchaseOrders.status, "acknowledged"),
            eq(purchaseOrders.organizationId, ctx.scope.organizationId)
          )
        )
        .limit(1);

      if (!po) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No acknowledged PO found for this purchase request",
        });
      }

      // Duplicate prevention: Check if a GRN already exists for this PO
      const existingGrns = await db
        .select({ id: goodsReceiptNotes.id, grnNumber: goodsReceiptNotes.grnNumber })
        .from(goodsReceiptNotes)
        .where(
          and(
            eq(goodsReceiptNotes.purchaseOrderId, po.id),
            eq(goodsReceiptNotes.organizationId, ctx.scope.organizationId),
            isNull(goodsReceiptNotes.deletedAt)
          )
        );

      if (existingGrns.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `A GRN already exists for this PO (${existingGrns[0].grnNumber}). Cannot create duplicate.`,
        });
      }

      // Type 2 Guard: Block GRN creation for consultancy PRs
      const [prForGuard] = await db
        .select({ category: purchaseRequests.category })
        .from(purchaseRequests)
        .where(eq(purchaseRequests.id, input.purchaseRequestId))
        .limit(1);
      if (prForGuard?.category === 'services') {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "GRN cannot be created for service/consultancy procurement. Use the Contract → SAC → Invoice flow instead.",
          });
        }

      // Generate GRN number
      const grnNumber = await generateGRNNumber(
        ctx.scope.organizationId,
        ctx.scope.operatingUnitId || 0,
        po.poNumber
      );

      // Create GRN
      const [result] = await db.insert(goodsReceiptNotes).values({
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
        purchaseOrderId: po.id,
        supplierId: po.supplierId,
        grnNumber,
        receivedBy: ctx.user.name || ctx.user.email,
        status: "pending_inspection",
        createdBy: ctx.user.id,
        isDeleted: 0,  // Dual-column synchronization
      });

      const grnId = result.insertId;

      // Auto-copy PO line items to GRN line items
      const poLineItems = await db
        .select()
        .from(purchaseOrderLineItems)
        .where(eq(purchaseOrderLineItems.purchaseOrderId, po.id));

      if (poLineItems.length > 0) {
        const grnLineItemsToInsert = poLineItems.map((item, index) => ({
          grnId,
          poLineItemId: item.id,
          lineNumber: index + 1,
          description: item.description || "",
          orderedQty: String(item.quantity || "0"),
          receivedQty: "0",
          acceptedQty: "0",
          rejectedQty: "0",
          unit: item.unit || "Piece",
          remarks: "",
        }));

        await db.insert(grnLineItems).values(grnLineItemsToInsert);
      }

      return { id: grnId, grnNumber, success: true };
    }),

  /**
   * Get GRNs by Purchase Request
   */
  getByPR: scopedProcedure
    .input(z.object({ purchaseRequestId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();

      // Find all non-deleted POs for this PR
      const pos = await db
        .select()
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.purchaseRequestId, input.purchaseRequestId),
            eq(purchaseOrders.organizationId, ctx.scope.organizationId),
            isNull(purchaseOrders.deletedAt)
          )
        )
        .orderBy(desc(purchaseOrders.createdAt));

      if (pos.length === 0) {
        return []; // No PO yet
      }

      // Get GRNs for all non-deleted POs of this PR
      const poIds = pos.map(p => p.id);
      const grns = await db
        .select()
        .from(goodsReceiptNotes)
        .where(
          and(
            inArray(goodsReceiptNotes.purchaseOrderId, poIds),
            eq(goodsReceiptNotes.organizationId, ctx.scope.organizationId),
            isNull(goodsReceiptNotes.deletedAt)
          )
        )
        .orderBy(desc(goodsReceiptNotes.createdAt));

      // Get line items and PO number for each GRN
      const grnsWithLineItems = await Promise.all(
        grns.map(async (grn) => {
          const lineItems = await db
            .select()
            .from(grnLineItems)
            .where(eq(grnLineItems.grnId, grn.id));
          
          let poNumber: string | null = null;
          if (grn.purchaseOrderId) {
            const [poData] = await db
              .select({ poNumber: purchaseOrders.poNumber })
              .from(purchaseOrders)
              .where(eq(purchaseOrders.id, grn.purchaseOrderId))
              .limit(1);
            poNumber = poData?.poNumber || null;
          }
          
          return { ...grn, lineItems, poNumber };
        })
      );

      return grnsWithLineItems;
    }),

  /**
   * Update GRN line item (received/accepted quantities, condition, remarks)
   */
  updateLineItem: scopedProcedure
    .input(
      z.object({
        id: z.number(),
        receivedQty: z.union([z.string(), z.number()]).optional(),
        acceptedQty: z.union([z.string(), z.number()]).optional(),
        rejectedQty: z.union([z.string(), z.number()]).optional(),
        rejectionReason: z.string().optional(),
        remarks: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Get the line item to verify it exists and get GRN details
      const [lineItem] = await db
        .select()
        .from(grnLineItems)
        .where(eq(grnLineItems.id, input.id))
        .limit(1);

      if (!lineItem) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "GRN line item not found",
        });
      }

      // Verify GRN belongs to the user's organization
      const [grn] = await db
        .select()
        .from(goodsReceiptNotes)
        .where(
          and(
            eq(goodsReceiptNotes.id, lineItem.grnId),
            eq(goodsReceiptNotes.organizationId, ctx.scope.organizationId)
          )
        )
        .limit(1);

      if (!grn) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to update this GRN line item",
        });
      }

      // Validate quantities
      const receivedQty = parseFloat(
          String(input.receivedQty ?? lineItem.receivedQty ?? "0")
        );

        const acceptedQty = parseFloat(
          String(input.acceptedQty ?? lineItem.acceptedQty ?? "0")
        );

        const rejectedQty = parseFloat(
          String(input.rejectedQty ?? lineItem.rejectedQty ?? "0")
        );

        const orderedQty = parseFloat(
          String(lineItem.orderedQty ?? "0")
        );

      if (receivedQty > orderedQty) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Received quantity (${receivedQty}) cannot exceed ordered quantity (${orderedQty})`,
        });
      }

      if (acceptedQty > receivedQty) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Accepted quantity (${acceptedQty}) cannot exceed received quantity (${receivedQty})`,
        });
      }

      // Update line item
      const updateData: any = {};
      if (input.receivedQty !== undefined) updateData.receivedQty = String(input.receivedQty);
      if (input.acceptedQty !== undefined) updateData.acceptedQty = String(input.acceptedQty);
      if (input.rejectedQty !== undefined) updateData.rejectedQty = String(input.rejectedQty);
      if (input.rejectionReason !== undefined) updateData.rejectionReason = input.rejectionReason;
      if (input.remarks !== undefined) updateData.remarks = input.remarks;
      updateData.updatedAt = new Date().toISOString();

      await db
        .update(grnLineItems)
        .set(updateData)
        .where(eq(grnLineItems.id, input.id));

      // 🔄 CRITICAL FIX: If GRN is already accepted and acceptedQty was changed, recalculate payable
      if (grn.status === "accepted" && input.acceptedQty !== undefined) {
        // Get all GRN line items to recalculate total
        const updatedGrnLines = await db
          .select()
          .from(grnLineItems)
          .where(eq(grnLineItems.grnId, lineItem.grnId));
        
        // Get PO to access line items and prices
        if (grn.purchaseOrderId) {
          const [po] = await db
            .select()
            .from(purchaseOrders)
            .where(eq(purchaseOrders.id, grn.purchaseOrderId))
            .limit(1);
          
          if (po) {
            // Get PO line items for price lookup
            const poLines = await db
              .select()
              .from(purchaseOrderLineItems)
              .where(eq(purchaseOrderLineItems.purchaseOrderId, po.id));
            
            // Recalculate total payable amount based on NEW acceptedQty values
            let newTotalAmount = 0;
            for (const grnLine of updatedGrnLines) {
              const poLine = poLines.find(pl => pl.lineNumber === grnLine.lineNumber);
              if (poLine) {
                const acceptedQtyForLine = parseFloat(String(grnLine.acceptedQty || "0"));
                const unitPrice = parseFloat(String(poLine.unitPrice || "0"));
                newTotalAmount += acceptedQtyForLine * unitPrice;
              }
            }
            
            // Update payable with new amount
            const [existingPayable] = await db
              .select()
              .from(procurementPayables)
              .where(eq(procurementPayables.purchaseOrderId, grn.purchaseOrderId))
              .limit(1);
            
            if (existingPayable && newTotalAmount !== parseFloat(String(existingPayable.totalAmount || "0"))) {
              await db
                .update(procurementPayables)
                .set({
                  totalAmount: String(newTotalAmount),
                  updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
                })
                .where(eq(procurementPayables.id, existingPayable.id));
            }
          }
        }
      }

      return { success: true };
    }),

  /**
   * Update GRN status (pending_inspection -> inspected -> accepted/rejected)
   */
  updateStatus: scopedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending_inspection", "inspected", "accepted", "partially_accepted", "rejected"]),
        remarks: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Get GRN
      const [grn] = await db
        .select()
        .from(goodsReceiptNotes)
        .where(
          and(
            eq(goodsReceiptNotes.id, input.id),
            eq(goodsReceiptNotes.organizationId, ctx.scope.organizationId)
          )
        )
        .limit(1);

      if (!grn) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "GRN not found",
        });
      }

      // Validate status transition
      const validTransitions: Record<string, string[]> = {
        pending_inspection: ["inspected", "accepted", "rejected"],
        inspected: ["accepted", "rejected"],
        accepted: [],
        rejected: [],
      };

      if (!validTransitions[grn.status]?.includes(input.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot transition from ${grn.status} to ${input.status}`,
        });
      }

      // Update GRN status
      await db
        .update(goodsReceiptNotes)
        .set({
          status: input.status,
          remarks: input.remarks || grn.remarks,
          inspectedBy: input.status !== "pending_inspection" ? (ctx.user.name || ctx.user.email) : grn.inspectedBy,
          updatedBy: ctx.user.id,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(goodsReceiptNotes.id, input.id),
            eq(goodsReceiptNotes.organizationId, ctx.scope.organizationId)
          )
        );

      // If accepted, create stock batches and Delivery Note
      if (input.status === "accepted") {
        // Create stock batches for partial issuance support
        try {
          const { createStockBatchesFromGRN } = await import("../../db/stockBatchCreation");
          const batchResult = await createStockBatchesFromGRN(
            input.id,
            ctx.scope.organizationId,
            grn.operatingUnitId,
            ctx.user.id
          );
          console.log(`[GRN] ${batchResult.batchCount} stock batches created`);
        } catch (error) {
          console.error(`[GRN] Error creating stock batches:`, error);
        }
        
        // Update inventory (legacy)
        const { updateInventoryFromGRNAcceptance } = await import("../../db");
        try {
          const result = await updateInventoryFromGRNAcceptance(input.id, ctx.scope.organizationId, ctx.user.id);
          console.log(`[GRN] Inventory updated: ${result.itemsUpdated} items`);
        } catch (error) {
          console.error(`[GRN] Error updating inventory:`, error);
        }
        
        // Auto-create Delivery Note
        try {
          const { createDeliveryNoteFromGRN } = await import("../../db");
          const dnResult = await createDeliveryNoteFromGRN(input.id, ctx.scope.organizationId, ctx.user.id);
          console.log(`[GRN] Delivery Note created: ${dnResult.dnNumber}`);
        } catch (error) {
          console.error(`[GRN] Error creating Delivery Note:`, error);
        }
        
        // Auto-create Payable from GRN
        try {
          const { createPayableFromGRN } = await import("../../db");
          const payableResult = await createPayableFromGRN(input.id, ctx.scope.organizationId, ctx.user.id);
          console.log(`[GRN] Payable created: ${payableResult.payableNumber}`);
        } catch (error) {
          console.error(`[GRN] Error creating Payable:`, error);
        }
      }

      return { success: true };
    }),

  /**
   * Delete GRN line item
   */
  deleteLineItem: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Get the line item
      const [lineItem] = await db
        .select()
        .from(grnLineItems)
        .where(eq(grnLineItems.id, input.id))
        .limit(1);

      if (!lineItem) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "GRN line item not found",
        });
      }

      // Verify GRN belongs to the user's organization
      const [grn] = await db
        .select()
        .from(goodsReceiptNotes)
        .where(
          and(
            eq(goodsReceiptNotes.id, lineItem.grnId),
            eq(goodsReceiptNotes.organizationId, ctx.scope.organizationId)
          )
        )
        .limit(1);

      if (!grn) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to delete this GRN line item",
        });
      }

      // Delete line item
      await db
        .delete(grnLineItems)
        .where(eq(grnLineItems.id, input.id));

      return { success: true };
    }),

  /**
   * Soft delete GRN
   */
    delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Get document to check status
      const [doc] = await db
        .select()
        .from(goodsReceiptNotes)
        .where(
          and(
            eq(goodsReceiptNotes.id, input.id),
            eq(goodsReceiptNotes.organizationId, ctx.scope.organizationId)
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
        "GRN",
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
          "GRN",
          input.id,
          ctx.scope.organizationId
        );
      } else {
        await performSoftDelete(
          db,
          "GRN",
          input.id,
          ctx.scope.organizationId,
          String(ctx.user.id),
          "User initiated deletion"
        );
      }

      // Cascade: soft-delete related payables and delivery notes
      try {
        await db
          .update(procurementPayables)
          .set({ deletedAt: new Date().toISOString(), deletedBy: ctx.user.id })
          .where(
            and(
              eq(procurementPayables.grnId, input.id),
              isNull(procurementPayables.deletedAt)
            )
          );
        await db
          .update(deliveryNotes)
          .set({ isDeleted: 1 })
          .where(
            and(
              eq(deliveryNotes.grnId, input.id),
              eq(deliveryNotes.isDeleted, 0)
            )
          );
        console.log(`[GRN] Cascade soft-deleted payables and delivery notes for GRN ${input.id}`);
      } catch (cascadeError) {
        console.error(`[GRN] Error cascade-deleting related records:`, cascadeError);
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
   * Export GRN as PDF
   */
  exportPDF: scopedProcedure
    .input(
      z.object({
        grnId: z.number(),
        language: z.enum(["en", "ar"]).optional().default("en"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const pdfBuffer = await generateGRNPDF({
          grnId: input.grnId,
          organizationId: ctx.scope.organizationId,
          language: input.language,
          includeQR: true,
        });

        return {
          success: true,
          pdf: pdfBuffer.toString("base64"),
          filename: `GRN-${input.grnId}-${new Date().toISOString().split("T")[0]}.pdf`,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to generate PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  ...grnApprovalProcedures,
});
