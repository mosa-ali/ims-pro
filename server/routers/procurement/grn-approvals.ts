/**
 * GRN Approval Procedures
 * Add these to the grnRouter object
 */

import { z } from "zod";
import { router, scopedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
// TEMP UNBLOCK PATCH: grnApprovals table missing export from schema.ts
// Commenting out grnApprovals import as it's not exported from schema.ts
// import { grnApprovals } from "../../../drizzle/schema"; // MISSING - causes build failure
import { goodsReceiptNotes, users } from "../../../drizzle/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createPayableFromGRN } from "../../automation/grnToPayableAutomation";
import { processGrnToStock } from "../../automation/grnToStockAutomation";

export const grnApprovalProcedures = {
  /**
   * Approve GRN (manager only)
   */
  approveGRN: scopedProcedure
    .input(
      z.object({
        grnId: z.number(),
        approvalRemarks: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check if user is manager or admin
      if (!ctx.user || (ctx.user.role !== "manager" && ctx.user.role !== "admin" && ctx.user.role !== "platform_admin" && ctx.user.role !== "platform_super_admin")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only managers can approve GRN",
        });
      }

      const db = await getDb();

      // Get GRN
      const [grn] = await db
        .select()
        .from(goodsReceiptNotes)
        .where(
          and(
            eq(goodsReceiptNotes.id, input.grnId),
            eq(goodsReceiptNotes.organizationId, ctx.scope.organizationId),
            isNull(goodsReceiptNotes.deletedAt)  // Soft delete filtering
          )
        )
        .limit(1);

      if (!grn) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "GRN not found",
        });
      }

      // Only allow approval when status is "inspected"
      if (grn.status !== "inspected") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot approve GRN with status ${grn.status}. GRN must be inspected first.`,
        });
      }

      // ✅ MANDATORY CORRECTION: Validate that all GRN line items have acceptedQty defined
      const { grnLineItems } = await import("../../../drizzle/schema");
      const grnLines = await db
        .select()
        .from(grnLineItems)
        .where(eq(grnLineItems.grnId, input.grnId));

      const linesWithoutAcceptedQty = grnLines.filter(
        (line: any) => line.acceptedQty === null || line.acceptedQty === undefined || parseFloat(line.acceptedQty || "0") === 0
      );

      if (linesWithoutAcceptedQty.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot approve GRN. ${linesWithoutAcceptedQty.length} line item(s) have no accepted quantity defined. Accepted quantity must be specified for all line items before approval.`,
        });
      }

      // ✅ MANDATORY CORRECTION: Validate acceptedQty ≤ receivedQty for all lines
      const invalidLines = grnLines.filter(
        (line: any) => parseFloat(line.acceptedQty || "0") > parseFloat(line.receivedQty || "0")
      );

      if (invalidLines.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot approve GRN. ${invalidLines.length} line item(s) have accepted quantity greater than received quantity. Accepted quantity must not exceed received quantity.`,
        });
      }

      // 🔄 ATOMIC TRANSACTION: GRN approval + Payable creation
      // Everything inside one transaction to ensure consistency
      // If payable creation fails, entire transaction rolls back
      const result = await db.transaction(async (trx: any) => {
        // 1. Update GRN status to accepted
        await trx
          .update(goodsReceiptNotes)
          .set({
            status: "accepted",
            approvedBy: ctx.user.id,
            approvedAt: new Date(),
            updatedBy: ctx.user.id,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(goodsReceiptNotes.id, input.grnId),
              eq(goodsReceiptNotes.organizationId, ctx.scope.organizationId)
            )
          );

        // 2. Create approval history record
        await trx.insert(grnApprovals).values({
          grnId: input.grnId,
          approvedBy: ctx.user.id,
          approvalStatus: "approved",
          approvalRemarks: input.approvalRemarks || null,
          approvalDate: new Date(),
        isDeleted: 0,  // Dual-column synchronization
        });

        // 3. Create Payable from GRN (CRITICAL FINANCIAL AUTOMATION)
        // ✅ MANDATORY CORRECTION: Payable amount = SUM(accepted_qty × PO unit_price)
        // Initial status = pending_invoice
        const payable = await createPayableFromGRN(trx, grn, ctx);

        // 4. Create Stock records from GRN (STOCK AUTOMATION)
        // For Goods PRs: auto-create stock items, batches, and ledger entries
        const stockResult = await processGrnToStock(trx, input.grnId, ctx.user.id);
        
        return { 
          grnApproved: true, 
          payableCreated: !!payable,
          stockPosted: stockResult.success,
          stockBatchesCreated: stockResult.batchesCreated,
          stockLedgerEntries: stockResult.ledgerEntriesCreated,
        };
      });

      return { 
        success: true, 
        message: "GRN approved successfully",
        payableCreated: result.payableCreated,
        stockPosted: result.stockPosted,
        stockBatchesCreated: result.stockBatchesCreated,
        stockLedgerEntries: result.stockLedgerEntries,
      };
    }),

  /**
   * Reject GRN (manager only)
   */
  rejectGRN: scopedProcedure
    .input(
      z.object({
        grnId: z.number(),
        rejectionRemarks: z.string().min(1, "Rejection remarks are required"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check if user is manager or admin
      if (!ctx.user || (ctx.user.role !== "manager" && ctx.user.role !== "admin" && ctx.user.role !== "platform_admin" && ctx.user.role !== "platform_super_admin")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only managers can reject GRN",
        });
      }

      const db = await getDb();

      // Get GRN
      const [grn] = await db
        .select()
        .from(goodsReceiptNotes)
        .where(
          and(
            eq(goodsReceiptNotes.id, input.grnId),
            eq(goodsReceiptNotes.organizationId, ctx.scope.organizationId),
            isNull(goodsReceiptNotes.deletedAt)  // Soft delete filtering
          )
        )
        .limit(1);

      if (!grn) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "GRN not found",
        });
      }

      // Only allow rejection when status is "inspected"
      if (grn.status !== "inspected") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot reject GRN with status ${grn.status}. GRN must be inspected first.`,
        });
      }

      // Update GRN status to rejected
      await db
        .update(goodsReceiptNotes)
        .set({
          status: "rejected",
          updatedBy: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(goodsReceiptNotes.id, input.grnId),
            eq(goodsReceiptNotes.organizationId, ctx.scope.organizationId)
          )
        );

      // Create rejection history record
      await db.insert(grnApprovals).values({
        grnId: input.grnId,
        approvedBy: ctx.user.id,
        approvalStatus: "rejected",
        approvalRemarks: input.rejectionRemarks,
        approvalDate: new Date(),
        isDeleted: 0,  // Dual-column synchronization
      });

      return { success: true, message: "GRN rejected successfully" };
    }),

  /**
   * Get GRN approval history
   */
  getApprovalHistory: scopedProcedure
    .input(
      z.object({
        grnId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();

      const approvals = await db
        .select()
        .from(grnApprovals)
        .where(eq(grnApprovals.grnId, input.grnId))
        .orderBy(desc(grnApprovals.approvalDate));

      // Enrich with user details
      const enrichedApprovals = await Promise.all(
        approvals.map(async (approval) => {
          const [approver] = await db
            .select()
            .from(users)
            .where(eq(users.id, approval.approvedBy))
            .limit(1);
          return {
            ...approval,
            approverName: approver?.name || "Unknown",
            approverEmail: approver?.email || "",
          };
        })
      );

      return enrichedApprovals;
    }),
};
