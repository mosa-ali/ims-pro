/**
 * Purchase Order Router
 * 
 * Manages PO creation, approval, and vendor linkage
 * Auto-generates PO numbers in format: PO-[OU]-[Year]-[Seq]
 */

import { z } from "zod";
import { router, scopedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { purchaseOrders, purchaseOrderLineItems, purchaseRequests, purchaseRequestLineItems, quotationAnalyses, quotationAnalysisSuppliers, quotationAnalysisLineItems, bidAnalyses, bidAnalysisBidders, prBudgetReservations, vendors, procurementAuditTrail, goodsReceiptNotes, grnLineItems, supplierQuotationHeaders, supplierQuotationLines, bidAnalysisLineItems, rfqVendors, rfqVendorItems } from "../../../drizzle/schema";
import { eq, and, desc, asc, isNull } from 'drizzle-orm';
import { TRPCError } from "@trpc/server";
import { generatePONumber } from "../../services/procurementNumbering";
import { isServicesWorkflow } from "./capabilities";
import { createEncumbranceFromReservation, createPayableFromPO } from "../../prFinanceAutomation";
import {
  checkDeletionGovernance,
  performHardDelete,
  performSoftDelete,
} from "../../db/deletionGovernance";

export const purchaseOrderRouter = router({
  /**
   * Create PO from QA (auto-generate when QA is approved)
   */
  createFromQA: scopedProcedure
    .input(
      z.object({
        quotationAnalysisId: z.number(),
        deliveryDate: z.string().optional(),
        paymentTerms: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Get QA details
      const [qa] = await db
        .select()
        .from(quotationAnalyses)
        .where(
          and(
            eq(quotationAnalyses.id, input.quotationAnalysisId),
            eq(quotationAnalyses.organizationId, ctx.scope.organizationId)
          )
        )
        .limit(1);

      if (!qa) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quotation Analysis not found",
        });
      }

      if (qa.status !== "approved") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Quotation Analysis must be approved before creating PO",
        });
      }

      // Get selected supplier
      const [selectedSupplier] = await db
        .select()
        .from(quotationAnalysisSuppliers)
        .where(
          and(
            eq(quotationAnalysisSuppliers.quotationAnalysisId, input.quotationAnalysisId),
            eq(quotationAnalysisSuppliers.isSelected, true)
          )
        )
        .limit(1);

      if (!selectedSupplier) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No supplier selected in QA",
        });
      }

      // Get PR details
      const [pr] = await db
        .select()
        .from(purchaseRequests)
        .where(eq(purchaseRequests.id, qa.purchaseRequestId))
        .limit(1);

      if (!pr) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Purchase Request not found",
        });
      }

      // Services Guard: Block PO creation for Services category
      if (isServicesWorkflow(pr.category)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Purchase Orders are not applicable for Services category. Services use Contract → SAC → Invoice → Payment workflow.",
        });
      }

      // Check if PO already exists for this QA
      const [existingPO] = await db
        .select()
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.purchaseRequestId, qa.purchaseRequestId),
            eq(purchaseOrders.supplierId, selectedSupplier.id)
          )
        )
        .limit(1);

      if (existingPO) {
        return existingPO; // Return existing PO
      }

      // Generate PO number
      const poNumber = await generatePONumber(
        ctx.scope.organizationId,
        ctx.scope.operatingUnitId || 0
      );

      // Create PO
      const [result] = await db.insert(purchaseOrders).values({
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
        purchaseRequestId: qa.purchaseRequestId,
        quotationAnalysisId: qa.id,
        poNumber,
        supplierId: selectedSupplier.supplierId,
        poDate: new Date(),
        deliveryDate: input.deliveryDate ? new Date(input.deliveryDate) : new Date(Date.now() + (selectedSupplier.deliveryDays || 0) * 24 * 60 * 60 * 1000),

        paymentTerms: input.paymentTerms || selectedSupplier.paymentTerms || "",
        notes: input.notes || "",
        currency: pr.currency,
        subtotal: selectedSupplier.totalAmount?.toString() || pr.prTotalUSD,
        taxAmount: "0",
        totalAmount: selectedSupplier.totalAmount?.toString() || pr.prTotalUSD,
        status: "draft",
        createdBy: ctx.user.id,
        isDeleted: 0,  // Dual-column synchronization
      });

      const poId = result.insertId;

      // Auto-copy QA supplier line items to PO line items
      const qaLineItems = await db
        .select()
        .from(quotationAnalysisLineItems)
        .where(
          and(
            eq(quotationAnalysisLineItems.quotationAnalysisId, input.quotationAnalysisId),
            eq(quotationAnalysisLineItems.supplierId, selectedSupplier.id)
          )
        );

      if (qaLineItems.length > 0) {
        const prLineItems = await db
          .select()
          .from(purchaseRequestLineItems)
          .where(eq(purchaseRequestLineItems.purchaseRequestId, qa.purchaseRequestId));

        const prLineItemMap = new Map(
          prLineItems.map((item) => [item.id, item])
        );

        const poLineItemsToInsert = qaLineItems.map((item, index) => {
          const prLineItem = prLineItemMap.get(item.lineItemId);
          const qty = parseFloat(String(prLineItem?.quantity || 0));
          const unitPrice = parseFloat(String(item.unitPrice || 0));
          return {
            purchaseOrderId: poId,
            lineNumber: index + 1,
            description: prLineItem?.description || "",
            quantity: qty.toFixed(2),
            unit: prLineItem?.unit || "",
            unitPrice: unitPrice.toFixed(2),
            totalPrice: (qty * unitPrice).toFixed(2),
          };
        });

        await db.insert(purchaseOrderLineItems).values(poLineItemsToInsert);
      }

      // Create encumbrance and payable
      await createEncumbranceFromReservation(poId, ctx.scope.organizationId);
      await createPayableFromPO(poId, ctx.scope.organizationId);

      return { id: poId, poNumber };
    }),

  /**
   * Create PO from PR (auto-generate from approved PR)
   */
  createFromPR: scopedProcedure
    .input(
      z.object({
        purchaseRequestId: z.number(),
        supplierId: z.number(),
        deliveryDate: z.coerce.date(),
        deliveryLocation: z.string().optional(),
        paymentTerms: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Get PR details
      const [pr] = await db
        .select()
        .from(purchaseRequests)
        .where(
          and(
            eq(purchaseRequests.id, input.purchaseRequestId),
            eq(purchaseRequests.organizationId, ctx.scope.organizationId)
          )
        )
        .limit(1);

      if (!pr) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Purchase Request not found",
        });
      }

      if (pr.status !== "approved") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Purchase Request must be approved before creating PO",
        });
      }

      // Services Guard: Block PO creation for Services category
      if (isServicesWorkflow(pr.category)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Purchase Orders are not applicable for Services category. Services use Contract → SAC → Invoice → Payment workflow.",
        });
      }

      // Generate PO number
      const poNumber = await generatePONumber(
        ctx.scope.organizationId,
        ctx.scope.operatingUnitId || 0
      );

      // Create PO
      const [result] = await db.insert(purchaseOrders).values({
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
        purchaseRequestId: input.purchaseRequestId,
        poNumber,
        supplierId: input.supplierId,
        poDate: new Date(),
        deliveryDate: input.deliveryDate,
        deliveryLocation: input.deliveryLocation,
        paymentTerms: input.paymentTerms,
        currency: pr.currency,
        subtotal: pr.total,   // Use original currency total (not USD equivalent)
        taxAmount: "0",
        totalAmount: pr.total, // Will be recalculated after line items are inserted
        status: "draft",
        createdBy: ctx.user.id,
        isDeleted: 0,  // Dual-column synchronization
      });

      const poId = result.insertId;

      // Auto-copy PR line items to PO line items
      const prLineItems = await db
        .select()
        .from(purchaseRequestLineItems)
        .where(eq(purchaseRequestLineItems.purchaseRequestId, input.purchaseRequestId));

      // ============================================================================
      // LOAD QUOTED PRICES: Try rfqVendorItems first, then supplier_quotation_lines
      // ============================================================================

      // Build a map of prLineItemId -> { qty, unitPrice, totalPrice } from the best available source
      const quotedItemMap = new Map<number, { quantity: string; unitPrice: string; totalPrice: string; unit?: string }>();

      // Source 1: rfqVendorItems (direct RFQ vendor quotation)
      const [rfqVendorRecord] = await db
        .select()
        .from(rfqVendors)
        .where(
          and(
            eq(rfqVendors.purchaseRequestId, input.purchaseRequestId),
            eq(rfqVendors.supplierId, input.supplierId),
            isNull(rfqVendors.deletedAt)
          )
        )
        .limit(1);

      if (rfqVendorRecord) {
        const vendorItems = await db
          .select()
          .from(rfqVendorItems)
          .where(eq(rfqVendorItems.rfqVendorId, rfqVendorRecord.id));
        for (const vi of vendorItems) {
          // rfqVendorItems don't have quantity, so we'll get it from PR line items
          quotedItemMap.set(vi.prLineItemId, {
            quantity: "", // will be filled from PR line item
            unitPrice: vi.quotedUnitPrice,
            totalPrice: vi.quotedTotalPrice,
          });
        }
      }

      // Source 2: supplier_quotation_lines (via bid_analysis_bidders link)
      // This is the primary source for single-quotation PRs where quotations are entered
      // via the Supplier Quotation Entry dialog
      if (quotedItemMap.size === 0) {
        // Find the supplier_quotation_header for this supplier
        // The link is: supplier_quotation_headers.bidAnalysisBidderId → bid_analysis_bidders.id → supplierId
        const matchingBidders = await db
          .select()
          .from(bidAnalysisBidders)
          .where(eq(bidAnalysisBidders.supplierId, input.supplierId));

        const bidderIds = matchingBidders.map(b => b.id);

        if (bidderIds.length > 0) {
          // Find supplier_quotation_header for this PR and this bidder
          for (const bidderId of bidderIds) {
            const [sqHeader] = await db
              .select()
              .from(supplierQuotationHeaders)
              .where(
                and(
                  eq(supplierQuotationHeaders.purchaseRequestId, input.purchaseRequestId),
                  eq(supplierQuotationHeaders.bidAnalysisBidderId, bidderId),
                  isNull(supplierQuotationHeaders.deletedAt)
                )
              )
              .limit(1);

            if (sqHeader) {
              const sqLines = await db
                .select()
                .from(supplierQuotationLines)
                .where(eq(supplierQuotationLines.quotationHeaderId, sqHeader.id));

              for (const line of sqLines) {
                quotedItemMap.set(line.prLineItemId, {
                  quantity: String(line.quantity || ""),
                  unitPrice: String(line.unitPrice || "0"),
                  totalPrice: String(line.lineTotal || "0"),
                  unit: line.unit || undefined,
                });
              }
              break; // Found the matching quotation, stop searching
            }
          }
        }
      }

      if (prLineItems.length > 0) {
        const poLineItemsToInsert = prLineItems.map((item, index) => {
          const quotedItem = quotedItemMap.get(item.id);
          // Quantity: use quoted qty if available, otherwise PR line item qty
          const qty = quotedItem && quotedItem.quantity
            ? parseFloat(String(quotedItem.quantity))
            : parseFloat(String(item.quantity || 0));
          // Unit price: use quoted price if available, otherwise PR estimated cost
          const unitPrice = quotedItem
            ? parseFloat(String(quotedItem.unitPrice || 0))
            : parseFloat(String(item.unitPrice || 0));
          // Total: use quoted total if available, otherwise calculate
          const totalPrice = quotedItem
            ? parseFloat(String(quotedItem.totalPrice || 0))
            : qty * unitPrice;
          // Unit: prefer quoted unit, then PR unit
          const unit = (quotedItem?.unit) || item.unit;
          return {
            purchaseOrderId: poId,
            lineNumber: index + 1,
            description: item.description,
            specifications: item.specifications,
            quantity: qty.toFixed(2),
            unit: unit,
            unitPrice: unitPrice.toFixed(2),
            totalPrice: totalPrice.toFixed(2),
          };
        });

        await db.insert(purchaseOrderLineItems).values(poLineItemsToInsert);

        // Recalculate PO totals from actual inserted line items
        const actualSubtotal = poLineItemsToInsert.reduce((sum, li) => sum + parseFloat(li.totalPrice), 0);
        if (actualSubtotal > 0) {
          await db.update(purchaseOrders)
            .set({ subtotal: actualSubtotal.toFixed(2), totalAmount: actualSubtotal.toFixed(2) })
            .where(eq(purchaseOrders.id, poId));
        }
      }

      // ============================================================================
      // PR-FINANCE INTEGRATION: Create Encumbrance & Payable
      // ============================================================================

      // 1. Find active budget reservation for this PR
      const [reservation] = await db
        .select()
        .from(prBudgetReservations)
        .where(
          and(
            eq(prBudgetReservations.purchaseRequestId, input.purchaseRequestId),
            eq(prBudgetReservations.status, "active")
          )
        )
        .limit(1);

      let encumbranceId: number | undefined;
      let payableId: number | undefined;

      // 2. Convert reservation to encumbrance
      if (reservation) {
        const encumbranceResult = await createEncumbranceFromReservation({
          reservationId: reservation.id,
          purchaseOrderId: poId,
          vendorId: input.supplierId,
          userId: ctx.user.id,
        });

        if (encumbranceResult.success && encumbranceResult.encumbranceId) {
          encumbranceId = encumbranceResult.encumbranceId;

          // 3. Create accounts payable
          const payableResult = await createPayableFromPO({
            purchaseRequestId: input.purchaseRequestId,
            purchaseOrderId: poId,
            vendorId: input.supplierId,
            encumbranceId,
            organizationId: ctx.scope.organizationId,
            operatingUnitId: ctx.scope.operatingUnitId,
            userId: ctx.user.id,
          });

          if (payableResult.success && payableResult.payableId) {
            payableId = payableResult.payableId;
          }
        }
      }

      return { id: poId, poNumber, encumbranceId, payableId };
    }),

  /**
   * Get PO by ID with vendor data
   */
  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();

      const [po] = await db
        .select()
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.id, input.id),
            eq(purchaseOrders.organizationId, ctx.scope.organizationId),
            isNull(purchaseOrders.deletedAt)
          )
        )
        .limit(1);

      if (!po) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Purchase Order not found",
        });
      }

      // Get line items
      const lineItems = await db
        .select()
        .from(purchaseOrderLineItems)
        .where(eq(purchaseOrderLineItems.purchaseOrderId, input.id));

      // Get vendor master data if PO has supplierId
      let vendorData: any = null;
      if (po.supplierId) {
        const [vendor] = await db
          .select()
          .from(vendors)
          .where(eq(vendors.id, po.supplierId))
          .limit(1);
        if (vendor) {
          vendorData = {
            vendorName: vendor.name,
            vendorCode: vendor.vendorCode,
            contactPerson: vendor.contactPerson,
            email: vendor.email,
            phone: vendor.phone,
            address: `${vendor.addressLine1}${vendor.addressLine2 ? ', ' + vendor.addressLine2 : ''}, ${vendor.city}, ${vendor.country}`,
          };
        }
      }

      return { ...po, lineItems, vendorData };
    }),

  /**
   * Get PO line items
   */
  getLineItems: scopedProcedure
    .input(z.object({ purchaseOrderId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      
      // Verify PO belongs to current org
      const po = await db
        .select()
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.id, input.purchaseOrderId),
            eq(purchaseOrders.organizationId, ctx.scope.organizationId)
          )
        )
        .limit(1);
      
      if (po.length === 0) {
        return [];
      }
      
      const lineItems = await db
        .select()
        .from(purchaseOrderLineItems)
        .where(eq(purchaseOrderLineItems.purchaseOrderId, input.purchaseOrderId))
        .orderBy(asc(purchaseOrderLineItems.lineNumber));
      return lineItems;
    }),

  /**
   * Get PO by PR
   */
  getByPR: scopedProcedure
    .input(z.object({ purchaseRequestId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();

      const [po] = await db
        .select()
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.purchaseRequestId, input.purchaseRequestId),
            eq(purchaseOrders.organizationId, ctx.scope.organizationId),
            isNull(purchaseOrders.deletedAt)
          )
        )
        .orderBy(desc(purchaseOrders.createdAt))
        .limit(1);

      if (!po) return null;

      // Get line items
      const lineItems = await db
        .select()
        .from(purchaseOrderLineItems)
        .where(eq(purchaseOrderLineItems.purchaseOrderId, po.id));

      // Calculate total from line items
      const poTotalUSD = lineItems.reduce((sum, item) => sum + (parseFloat(String(item.totalPrice)) || 0), 0);

      // Get vendor master data if PO has supplierId
      let vendorData: any = null;
      if (po.supplierId) {
        const [vendor] = await db
          .select()
          .from(vendors)
          .where(eq(vendors.id, po.supplierId))
          .limit(1);
        if (vendor) {
          vendorData = {
            vendorName: vendor.name,
            vendorCode: vendor.vendorCode,
            contactPerson: vendor.contactPerson,
            email: vendor.email,
            phone: vendor.phone,
            address: `${vendor.addressLine1}${vendor.addressLine2 ? ', ' + vendor.addressLine2 : ''}, ${vendor.city}, ${vendor.country}`,
          };
        }
      }

      return { ...po, lineItems, poTotalUSD, vendorData };
    }),

  /**
   * List all POs for a Purchase Request
   */
  listByPR: scopedProcedure
    .input(z.object({ purchaseRequestId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();

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

      // Enrich with vendor data and line items
      const enrichedPos = await Promise.all(
        pos.map(async (po) => {
          let vendorData: any = null;
          if (po.supplierId) {
            const [vendor] = await db
              .select()
              .from(vendors)
              .where(eq(vendors.id, po.supplierId))
              .limit(1);
            if (vendor) {
              vendorData = {
                vendorName: vendor.name,
                vendorCode: vendor.vendorCode,
                contactPerson: vendor.contactPerson,
                email: vendor.email,
                phone: vendor.phone,
                address: `${vendor.addressLine1}${vendor.addressLine2 ? ', ' + vendor.addressLine2 : ''}, ${vendor.city}, ${vendor.country}`,
              };
            }
          }

          // Get line items
          const lineItems = await db
            .select()
            .from(purchaseOrderLineItems)
            .where(eq(purchaseOrderLineItems.purchaseOrderId, po.id));

          // Calculate total from line items
          const poTotalUSD = lineItems.reduce((sum, item) => sum + (parseFloat(String(item.totalPrice)) || 0), 0);

          return { ...po, lineItems, poTotalUSD, vendorData };
        })
      );

      return enrichedPos;
    }),

  /**
   * Approve PO (draft -> sent)
   */
  approvePO: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      const [po] = await db
        .select()
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.id, input.id),
            eq(purchaseOrders.organizationId, ctx.scope.organizationId)
          )
        )
        .limit(1);

      if (!po) throw new TRPCError({ code: "NOT_FOUND", message: "PO not found" });
      if (po.status !== "draft") throw new TRPCError({ code: "BAD_REQUEST", message: "Only draft POs can be approved" });

      const oldStatus = po.status;

      // Update PO status
      await db
        .update(purchaseOrders)
        .set({
          status: "acknowledged",
          acknowledgedAt: new Date(),
          approvedBy: ctx.user.id,
          approvedAt: new Date(),
          updatedBy: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(purchaseOrders.id, input.id));

      // Log to audit trail
      await db.insert(procurementAuditTrail).values({
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
        documentType: "PO",
        documentId: input.id,
        documentNumber: po.poNumber,
        actionType: "PO Approved",
        fieldChanges: JSON.stringify({ field: "status", oldValue: oldStatus, newValue: "acknowledged" }),
        userId: ctx.user.id,
        userName: ctx.user.name,
        userRole: ctx.user.role,
        timestamp: new Date(),
        isDeleted: 0,  // Dual-column synchronization
      });

      // GRN will be unlocked in the Procurement Workspace when PO status is "acknowledged"

      return { success: true, poId: input.id };
    }),

  /**
   * Send PO to Vendor (sent -> acknowledged)
   */
  sendToVendor: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      const [po] = await db
        .select()
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.id, input.id),
            eq(purchaseOrders.organizationId, ctx.scope.organizationId)
          )
        )
        .limit(1);

      if (!po) throw new TRPCError({ code: "NOT_FOUND", message: "PO not found" });
      if (po.status !== "sent") throw new TRPCError({ code: "BAD_REQUEST", message: "Only approved POs can be sent to vendor" });

      const oldStatus = po.status;

      await db
        .update(purchaseOrders)
        .set({
          status: "acknowledged",
          sentAt: new Date(),
          updatedBy: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(purchaseOrders.id, input.id));

      await db.insert(procurementAuditTrail).values({
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
        documentType: "PO",
        documentId: input.id,
        documentNumber: po.poNumber,
        actionType: "PO Sent to Vendor",
        fieldChanges: JSON.stringify({ field: "status", oldValue: oldStatus, newValue: "acknowledged" }),
        userId: ctx.user.id,
        userName: ctx.user.name,
        userRole: ctx.user.role,
        timestamp: new Date(),
        isDeleted: 0,  // Dual-column synchronization
      });

      // Auto-create GRN when PO is sent to vendor
      const grnNumber = `GRN-${ctx.scope.operatingUnitId}-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;
      
      const [grn] = await db.insert(goodsReceiptNotes).values({
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
        grnNumber,
        purchaseOrderId: input.id,
        status: "draft",
        createdBy: ctx.user.id,
        createdAt: new Date(),
      }).returning();

      // Copy line items from PO to GRN
      const poLineItems = await db
        .select()
        .from(purchaseOrderLineItems)
        .where(eq(purchaseOrderLineItems.purchaseOrderId, input.id));

      for (const poItem of poLineItems) {
        await db.insert(grnLineItems).values({
          grnId: grn.id,
          poLineItemId: poItem.id,
          description: poItem.description,
          quantity: poItem.quantity,
          unit: poItem.unit,
          unitPrice: poItem.unitPrice,
          totalPrice: poItem.totalPrice,
          receivedQuantity: 0,
          status: "pending",
        isDeleted: 0,  // Dual-column synchronization
        });
      }

      return { success: true, poId: input.id, grnId: grn.id };
    }),

  /**
   * Reject PO (any status -> cancelled)
   */
  rejectPO: scopedProcedure
    .input(z.object({ id: z.number(), reason: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      const [po] = await db
        .select()
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.id, input.id),
            eq(purchaseOrders.organizationId, ctx.scope.organizationId)
          )
        )
        .limit(1);

      if (!po) throw new TRPCError({ code: "NOT_FOUND", message: "PO not found" });
      if (["delivered", "completed", "cancelled"].includes(po.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot reject PO in current status" });
      }

      const oldStatus = po.status;

      await db
        .update(purchaseOrders)
        .set({
          status: "cancelled",
          updatedBy: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(purchaseOrders.id, input.id));

      await db.insert(procurementAuditTrail).values({
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
        documentType: "PO",
        documentId: input.id,
        documentNumber: po.poNumber,
        actionType: "PO Rejected",
        fieldChanges: JSON.stringify({ field: "status", oldValue: oldStatus, newValue: "cancelled", reason: input.reason }),
        userId: ctx.user.id,
        userName: ctx.user.name,
        userRole: ctx.user.role,
        timestamp: new Date(),
        isDeleted: 0,  // Dual-column synchronization
      });

      return { success: true, poId: input.id };
    }),

  /**
   * List all POs
   */
  list: scopedProcedure
    .input(
      z.object({
        organizationId: z.number().optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        status: z.enum(["draft", "sent", "acknowledged", "partially_delivered", "delivered", "completed", "cancelled"]).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();

      let conditions = [
        eq(purchaseOrders.organizationId, ctx.scope.organizationId),
        isNull(purchaseOrders.deletedAt),
      ];

      if (input.status) {
        conditions.push(eq(purchaseOrders.status, input.status));
      }

      if (input.search) {
        conditions.push(
          or(
            like(purchaseOrders.poNumber, `%${input.search}%`),
            like(purchaseOrders.notes, `%${input.search}%`)
          )
        );
      }

      const pos = await db
        .select()
        .from(purchaseOrders)
        .where(and(...conditions))
        .orderBy(desc(purchaseOrders.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const enrichedPos = await Promise.all(
        pos.map(async (po) => {
          let supplierName = "";
          if (po.supplierId) {
            const [vendor] = await db
              .select()
              .from(vendors)
              .where(eq(vendors.id, po.supplierId))
              .limit(1);
            supplierName = vendor?.name || "";
          }
          return { ...po, supplierName };
        })
      );

      return { items: enrichedPos, total: enrichedPos.length };
    }),

  /**
   * Soft delete PO
   */
  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      await db
        .update(purchaseOrders)
        .set({
          deletedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
          deletedBy: ctx.user.id,
        })
        .where(
          and(
            eq(purchaseOrders.id, input.id),
            eq(purchaseOrders.organizationId, ctx.scope.organizationId)
          )
        );

      return { success: true, poId: input.id };
    }),

  /**
   * Get all POs for a QA
   */
  getByQA: scopedProcedure
    .input(z.object({ quotationAnalysisId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();

      const pos = await db
        .select()
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.quotationAnalysisId, input.quotationAnalysisId),
            eq(purchaseOrders.organizationId, ctx.scope.organizationId),
            isNull(purchaseOrders.deletedAt)
          )
        )
        .orderBy(desc(purchaseOrders.createdAt));

      return pos;
    }),

  /**
   * Update PO fields (dates, terms, notes, etc.)
   */
  update: scopedProcedure
    .input(
      z.object({
        id: z.number(),
        poDate: z.string().optional(),
        deliveryDate: z.string().optional(),
        deliveryLocation: z.string().optional(),
        paymentTerms: z.string().optional(),
        termsAndConditions: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      const [po] = await db
        .select()
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.id, input.id),
            eq(purchaseOrders.organizationId, ctx.scope.organizationId),
            isNull(purchaseOrders.deletedAt)
          )
        )
        .limit(1);

      if (!po) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Purchase Order not found",
        });
      }

      if (po.status !== "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only draft Purchase Orders can be edited",
        });
      }

      const updateData: Record<string, any> = {
        updatedBy: ctx.user.id,
        updatedAt: new Date(),
      };

      if (input.poDate !== undefined) updateData.poDate = new Date(input.poDate);
      if (input.deliveryDate !== undefined) updateData.deliveryDate = new Date(input.deliveryDate);
      if (input.deliveryLocation !== undefined) updateData.deliveryLocation = input.deliveryLocation;
      if (input.paymentTerms !== undefined) updateData.paymentTerms = input.paymentTerms;
      if (input.termsAndConditions !== undefined) updateData.termsAndConditions = input.termsAndConditions;
      if (input.notes !== undefined) updateData.notes = input.notes;

      await db
        .update(purchaseOrders)
        .set(updateData)
        .where(eq(purchaseOrders.id, input.id));

      return { id: input.id, success: true };
    }),

  /**
   * Create PO from Bid Analysis (when BA is awarded for non-services PRs)
   */
  createFromBA: scopedProcedure
    .input(
      z.object({
        purchaseRequestId: z.number(),
        bidAnalysisId: z.number(),
        deliveryDate: z.string(),
        deliveryLocation: z.string().optional(),
        paymentTerms: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Get BA details
      const [ba] = await db
        .select()
        .from(bidAnalyses)
        .where(
          and(
            eq(bidAnalyses.id, input.bidAnalysisId),
            eq(bidAnalyses.organizationId, ctx.scope.organizationId)
          )
        )
        .limit(1);

      if (!ba) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bid Analysis not found",
        });
      }

      if (ba.status !== "awarded" && ba.status !== "finalized") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Bid Analysis must be awarded or finalized before creating PO",
        });
      }

      // Get PR details
      const [pr] = await db
        .select()
        .from(purchaseRequests)
        .where(
          and(
            eq(purchaseRequests.id, input.purchaseRequestId),
            eq(purchaseRequests.organizationId, ctx.scope.organizationId)
          )
        )
        .limit(1);

      if (!pr) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Purchase Request not found",
        });
      }

      // Services Guard: Block PO creation for Services category
      if (isServicesWorkflow(pr.category)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Purchase Orders are not applicable for Services category. Services use Contract → SAC → Invoice → Payment workflow.",
        });
      }

      // Get selected bidder - selectedBidderId references bidAnalysisBidders.id
      const selectedBidderRecordId = ba.selectedBidderId;
      if (!selectedBidderRecordId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No bidder selected in Bid Analysis",
        });
      }

      // Find the bidder record by its ID (selectedBidderId = bidAnalysisBidders.id)
      const [selectedBidder] = await db
        .select()
        .from(bidAnalysisBidders)
        .where(
          and(
            eq(bidAnalysisBidders.bidAnalysisId, input.bidAnalysisId),
            eq(bidAnalysisBidders.id, selectedBidderRecordId)
          )
        )
        .limit(1);

      if (!selectedBidder) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Selected bidder not found",
        });
      }

      // Generate PO number
      const poNumber = await generatePONumber(
        ctx.scope.organizationId,
        ctx.scope.operatingUnitId || 0
      );

      const totalAmount = selectedBidder.totalBidAmount || pr.prTotalUSD || "0";

      // Create PO
      const [result] = await db.insert(purchaseOrders).values({
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
        purchaseRequestId: input.purchaseRequestId,
        bidAnalysisId: input.bidAnalysisId,
        poNumber,
        supplierId: selectedBidder.supplierId,
        poDate: new Date(),
        deliveryDate: new Date(input.deliveryDate),
        deliveryLocation: input.deliveryLocation,
        paymentTerms: input.paymentTerms,
        notes: input.notes,
        currency: pr.currency,
        subtotal: totalAmount,
        taxAmount: "0",
        totalAmount: totalAmount,
        status: "draft",
        createdBy: ctx.user.id,
        isDeleted: 0,
      });

      const poId = result.insertId;

      // Auto-copy PR line items to PO line items, using supplier quotation prices when available
      const prLineItems = await db
        .select()
        .from(purchaseRequestLineItems)
        .where(eq(purchaseRequestLineItems.purchaseRequestId, input.purchaseRequestId));

      // ── PCE: Read per-item prices from bid_analysis_line_items (populated by Supplier Quotation Entry) ──
      // This is the canonical source for CBA unit prices. It is populated whenever a supplier
      // quotation linked to a bid analysis bidder is saved (draft or submitted).
      let sqLineMap = new Map<number, { unitPrice: string; quantity: string }>();
      if (selectedBidder.id) {
        const baliRows = await db
          .select()
          .from(bidAnalysisLineItems)
          .where(
            and(
              eq(bidAnalysisLineItems.bidAnalysisId, input.bidAnalysisId),
              eq(bidAnalysisLineItems.bidderId, selectedBidder.id)
            )
          );

        if (baliRows.length > 0) {
          // bid_analysis_line_items has unitPrice but not quantity; get quantity from PR line items
          for (const bali of baliRows) {
            sqLineMap.set(bali.prLineItemId, {
              unitPrice: bali.unitPrice,
              quantity: "0", // will be overridden by PR line item quantity below
            });
          }
        } else {
          // Fallback: read directly from supplier_quotation_lines (for quotations saved before PCE)
          // This handles quotations that were created before bid_analysis_line_items was introduced.
          const [sqHeader] = await db
            .select()
            .from(supplierQuotationHeaders)
            .where(
              and(
                eq(supplierQuotationHeaders.purchaseRequestId, input.purchaseRequestId),
                eq(supplierQuotationHeaders.bidAnalysisBidderId, selectedBidder.id),
                eq(supplierQuotationHeaders.organizationId, ctx.scope.organizationId)
              )
            )
            .limit(1);

          // Also try matching by vendorId/supplierId if bidderId match fails
          let sqHeaderResolved = sqHeader;
          if (!sqHeaderResolved && selectedBidder.supplierId) {
            const [fallback] = await db
              .select()
              .from(supplierQuotationHeaders)
              .where(
                and(
                  eq(supplierQuotationHeaders.purchaseRequestId, input.purchaseRequestId),
                  eq(supplierQuotationHeaders.vendorId, selectedBidder.supplierId),
                  eq(supplierQuotationHeaders.organizationId, ctx.scope.organizationId)
                )
              )
              .limit(1);
            sqHeaderResolved = fallback;
          }

          if (sqHeaderResolved) {
            const sqLines = await db
              .select()
              .from(supplierQuotationLines)
              .where(eq(supplierQuotationLines.quotationHeaderId, sqHeaderResolved.id));
            for (const sl of sqLines) {
              sqLineMap.set(sl.prLineItemId, {
                unitPrice: sl.unitPrice,
                quantity: sl.quantity,
              });
            }
          }

          // ── PCE Guardrail: Block PO creation if no quotation line items found for awarded bidder ──
          // This prevents generating a PO with $0.00 unit prices when the supplier has not yet
          // submitted their quotation through the Supplier Quotation Entry form.
          if (sqLineMap.size === 0) {
            const bidderLabel = selectedBidder.bidderName || `Bidder #${selectedBidder.id}`;
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: `Cannot create PO: No quotation line items found for the awarded bidder "${bidderLabel}". ` +
                `Please ensure the supplier has submitted their quotation through the Supplier Quotation Entry form, ` +
                `or use the Backfill action in the CBA Supplier Offer Matrix to sync existing quotation data.`,
            });
          }
        }
      }

      if (prLineItems.length > 0) {
        let poTotal = 0;
        const poLineItemsToInsert = prLineItems.map((item, index) => {
          const sqLine = sqLineMap.get(item.id);
          const qty = parseFloat(String(sqLine?.quantity || item.quantity || 0));
          // Use supplier quotation unit price if available, otherwise fall back to PR estimated cost
          const unitPrice = sqLine
            ? parseFloat(sqLine.unitPrice)
            : parseFloat(String(item.estimatedUnitCost || 0));
          const lineTotal = qty * unitPrice;
          poTotal += lineTotal;
          return {
            purchaseOrderId: poId,
            lineNumber: index + 1,
            description: item.description,
            specifications: item.specifications,
            quantity: qty.toFixed(2),
            unit: item.unit,
            unitPrice: unitPrice.toFixed(2),
            totalPrice: lineTotal.toFixed(2),
          };
        });

        await db.insert(purchaseOrderLineItems).values(poLineItemsToInsert);

        // Update PO total with actual supplier quotation prices if available
        if (sqLineMap.size > 0) {
          await db.update(purchaseOrders)
            .set({
              subtotal: poTotal.toFixed(2),
              totalAmount: poTotal.toFixed(2),
            })
            .where(eq(purchaseOrders.id, poId));
        }
      }

      // PR-FINANCE INTEGRATION
      const [reservation] = await db
        .select()
        .from(prBudgetReservations)
        .where(
          and(
            eq(prBudgetReservations.purchaseRequestId, input.purchaseRequestId),
            eq(prBudgetReservations.status, "active")
          )
        )
        .limit(1);

      let encumbranceId: number | undefined;
      let payableId: number | undefined;

      if (reservation) {
        const encumbranceResult = await createEncumbranceFromReservation({
          reservationId: reservation.id,
          purchaseOrderId: poId,
          vendorId: selectedBidder.supplierId!,
          userId: ctx.user.id,
        });

        if (encumbranceResult.success && encumbranceResult.encumbranceId) {
          encumbranceId = encumbranceResult.encumbranceId;

          const payableResult = await createPayableFromPO({
            purchaseRequestId: input.purchaseRequestId,
            purchaseOrderId: poId,
            vendorId: selectedBidder.supplierId!,
            encumbranceId,
            organizationId: ctx.scope.organizationId,
            operatingUnitId: ctx.scope.operatingUnitId,
            userId: ctx.user.id,
          });

          if (payableResult.success && payableResult.payableId) {
            payableId = payableResult.payableId;
          }
        }
      }

      return { id: poId, poNumber, encumbranceId, payableId };
    }),

  /**
   * Check allocation status for a QA
   * Returns whether all line items have been fully allocated to POs
   */
  checkAllocationStatus: scopedProcedure
    .input(
      z.object({
        quotationAnalysisId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();

      // Get QA line items
      const qaLineItems = await db
        .select()
        .from(quotationAnalysisLineItems)
        .where(
          and(
            eq(quotationAnalysisLineItems.quotationAnalysisId, input.quotationAnalysisId),
            isNull(quotationAnalysisLineItems.deletedAt)
          )
        );

      if (qaLineItems.length === 0) {
        return {
          isFullyAllocated: false,
          message: "No line items found",
          allocationStatus: [],
        };
      }

      // Get all POs for this QA
      const pos = await db
        .select()
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.quotationAnalysisId, input.quotationAnalysisId),
            eq(purchaseOrders.organizationId, ctx.scope.organizationId),
            isNull(purchaseOrders.deletedAt)
          )
        );

      // Get all PO line items for these POs
      const poLineItems = await db
        .select()
        .from(purchaseOrderLineItems)
        .where(
          and(
            isNull(purchaseOrderLineItems.deletedAt)
          )
        );

      // Calculate allocation for each QA line item
      const allocationStatus = qaLineItems.map((qaItem) => {
        const allocatedQuantity = poLineItems
          .filter((poItem) => poItem.qaLineItemId === qaItem.id)
          .reduce((sum, item) => sum + (item.quantity || 0), 0);

        return {
          qaLineItemId: qaItem.id,
          description: qaItem.description || "Item",
          approvedQuantity: qaItem.quantity || 0,
          allocatedQuantity,
          isFullyAllocated: allocatedQuantity >= (qaItem.quantity || 0),
        };
      });

      const isFullyAllocated = allocationStatus.every((item) => item.isFullyAllocated);
      const allocatedCount = allocationStatus.filter((item) => item.isFullyAllocated).length;

      return {
        isFullyAllocated,
        message: isFullyAllocated
          ? `All ${qaLineItems.length} items fully allocated`
          : `${allocatedCount}/${qaLineItems.length} items allocated`,
        allocationStatus,
      };
    }),
});
