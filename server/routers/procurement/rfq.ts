/**
 * RFQ (Request for Quotation) Router
 * 
 * Manages vendor invitations and quotation submissions for procurement requests
 * Auto-generates RFQ numbers in format: RFQ-PR-[PRNumber]-[Seq]
 */

import { z } from "zod";
import {
  checkDeletionGovernance,
  performHardDelete,
  performSoftDelete,
} from "../../db/deletionGovernance";

import { router, scopedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { rfqs, rfqVendors, purchaseRequests, suppliers, rfqVendorItems, purchaseRequestLineItems } from "../../../drizzle/schema";
import { eq, and, desc, leftJoin, isNull } from 'drizzle-orm';
import { TRPCError } from "@trpc/server";
import { generateRFQPDFOfficial } from "../../_core/rfqPDFOfficial";
// RFQ number generation helper
const generateRFQNumber = async (orgId: number, ouId: number): Promise<string> => {
  const db = await getDb();
  const [lastRfq] = await db
    .select()
    .from(rfqs)
    .where(and(eq(rfqs.organizationId, orgId), isNull(rfqs.deletedAt)))
    .orderBy(desc(rfqs.id))
    .limit(1);

  const lastNum = lastRfq?.rfqNumber.match(/\d+$/)?.[0] || "0";
  const nextNum = (parseInt(lastNum) + 1).toString().padStart(3, "0");
  return `RFQ-${new Date().getFullYear()}-${nextNum}`;
};

export const rfqRouter = router({
  /**
   * Auto-create RFQ when PR is approved (for PR ≤ $25K)
   * Called automatically by PR approval workflow
   */
  autoCreate: scopedProcedure
    .input(z.object({ purchaseRequestId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Check if RFQ already exists
      const [existing] = await db
        .select()
        .from(rfqs)
        .where(
          and(
            eq(rfqs.purchaseRequestId, input.purchaseRequestId),
            eq(rfqs.organizationId, ctx.scope.organizationId),
            isNull(rfqs.deletedAt)
          )
        )
        .limit(1);

      if (existing) {
        return { id: existing.id, rfqNumber: existing.rfqNumber, alreadyExists: true };
      }

      // Get PR details for RFQ number generation
      const [pr] = await db
        .select()
        .from(purchaseRequests)
        .where(eq(purchaseRequests.id, input.purchaseRequestId))
        .limit(1);

      if (!pr) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Purchase Request not found",
        });
      }

      // Generate RFQ number
      const rfqNumber = await generateRFQNumber(ctx.scope.organizationId, ctx.scope.operatingUnitId || 0);

      // Create RFQ
      const [result] = await db.insert(rfqs).values({
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
        purchaseRequestId: input.purchaseRequestId,
        rfqNumber,
        status: "active",
        issueDate: new Date(),
        createdBy: ctx.user.id,
        isDeleted: 0,  // Dual-column synchronization
      });

      const rfqId = result.insertId;

      // Copy PR line items to RFQ (for vendor reference)
      // Get all line items from the PR
      const prLineItems = await db
        .select()
        .from(purchaseRequestLineItems)
        .where(
          eq(purchaseRequestLineItems.purchaseRequestId, input.purchaseRequestId)
        );

      // Note: Line items are stored in purchase_request_line_items table
      // They are linked to RFQ through purchaseRequestId
      // Vendors will see these items when submitting quotations
      // No need to duplicate data - we reference PR line items directly

      return { id: rfqId, rfqNumber, alreadyExists: false, lineItemsCount: prLineItems.length };
    }),

  /**
   * Get RFQ by Purchase Request ID
   * Returns RFQ with suppliers array for workspace card logic
   */
  getByPR: scopedProcedure
    .input(z.object({ purchaseRequestId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const [rfq] = await db
        .select()
        .from(rfqs)
        .where(
          and(
            eq(rfqs.purchaseRequestId, input.purchaseRequestId),
            eq(rfqs.organizationId, ctx.scope.organizationId),
            isNull(rfqs.deletedAt)
          )
        )
        .limit(1);

      if (!rfq) return null;

      // Get invited suppliers count
      const suppliers = await db
        .select()
        .from(rfqVendors)
        .where(
          and(
            eq(rfqVendors.purchaseRequestId, input.purchaseRequestId),
            eq(rfqVendors.organizationId, ctx.scope.organizationId),
            isNull(rfqVendors.deletedAt)
          )
        );

      return { ...rfq, suppliers };
    }),

  /**
   * List all RFQ vendors for a PR with RFQ number from linked rfq record
   */
  listByPR: scopedProcedure
    .input(z.object({ purchaseRequestId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const vendors = await db
        .select({
          ...rfqVendors,
          rfqNumber: rfqs.rfqNumber, // Get RFQ number from linked rfq record
        })
        .from(rfqVendors)
        .leftJoin(rfqs, eq(rfqVendors.rfqId, rfqs.id))
        .where(
          and(
            eq(rfqVendors.purchaseRequestId, input.purchaseRequestId),
            eq(rfqVendors.organizationId, ctx.scope.organizationId),
            isNull(rfqVendors.deletedAt)
          )
        )
        .orderBy(desc(rfqVendors.createdAt));

      return vendors;
    }),

  /**
   * Invite vendor to submit quotation
   */
  inviteVendor: scopedProcedure
    .input(
      z.object({
        purchaseRequestId: z.number(),
        supplierId: z.number(),
        invitationMethod: z.enum(["email", "portal", "hand_delivery", "mail"]).default("email"),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Check if vendor already invited
      const [existing] = await db
        .select()
        .from(rfqVendors)
        .where(
          and(
            eq(rfqVendors.purchaseRequestId, input.purchaseRequestId),
            eq(rfqVendors.supplierId, input.supplierId),
            eq(rfqVendors.organizationId, ctx.scope.organizationId),
            isNull(rfqVendors.deletedAt)
          )
        )
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Vendor already invited for this PR",
        });
      }

      // Get or create RFQ for this PR (one RFQ per PR)
      const [existingRfq] = await db
        .select()
        .from(rfqs)
        .where(
          and(
            eq(rfqs.purchaseRequestId, input.purchaseRequestId),
            eq(rfqs.organizationId, ctx.scope.organizationId),
            isNull(rfqs.deletedAt)
          )
        )
        .limit(1);

      let rfqId: number;
      if (existingRfq) {
        rfqId = existingRfq.id;
      } else {
        const [pr] = await db
          .select()
          .from(purchaseRequests)
          .where(eq(purchaseRequests.id, input.purchaseRequestId))
          .limit(1);

        if (!pr) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Purchase Request not found",
          });
        }

        const rfqNumber = await generateRFQNumber(ctx.scope.organizationId, ctx.scope.operatingUnitId || 0);
        const [rfqResult] = await db.insert(rfqs).values({
          organizationId: ctx.scope.organizationId,
          operatingUnitId: ctx.scope.operatingUnitId,
          purchaseRequestId: input.purchaseRequestId,
          rfqNumber,
          status: "draft",
          issueDate: new Date(),
          createdBy: ctx.user.id,
        isDeleted: 0,  // Dual-column synchronization
        });
        rfqId = rfqResult.insertId;
      }

      // Create RFQ vendor invitation (linked to RFQ)
      const [result] = await db.insert(rfqVendors).values({
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId || null,
        purchaseRequestId: input.purchaseRequestId,
        rfqId, // Link to parent RFQ
        quotationAnalysisId: null, // Linked after quotation analysis
        supplierId: input.supplierId,
        invitationSentDate: new Date(),
        invitationMethod: input.invitationMethod,
        invitationStatus: "invited",
        submissionStatus: "pending",
        notes: input.notes || null,
        createdBy: ctx.user.id,
        isDeleted: 0,  // Dual-column synchronization
      });

      return { id: result.insertId, success: true };
    }),

  /**
   * Record vendor quotation submission with line-item prices
   */
  submitQuotation: scopedProcedure
    .input(
      z.object({
        rfqVendorId: z.number(),
        quotedAmount: z.number(), // Grand total (calculated from line items)
        currency: z.string().default("USD"),
        deliveryDays: z.number().optional(),
        warrantyMonths: z.number().optional(),
        yearsOfExperience: z.number().optional(),
        supplierQuoteNumber: z.string().optional(),
        quotationAttachment: z.string().optional(),
        notes: z.string().optional(),
        lineItems: z.array(
          z.object({
            prLineItemId: z.number(),
            quotedUnitPrice: z.number(),
            quotedTotalPrice: z.number(),
            itemNotes: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { rfqVendorItems } = await import("../../../drizzle/schema");

      // Update RFQ vendor record with summary data
      await db
        .update(rfqVendors)
        .set({
          submissionDate: new Date(),
          submissionMethod: "portal",
          quotedAmount: input.quotedAmount.toString(),
          currency: input.currency,
          deliveryDays: input.deliveryDays,
          warrantyMonths: input.warrantyMonths,
          yearsOfExperience: input.yearsOfExperience,
          supplierQuoteNumber: input.supplierQuoteNumber,
          quotationAttachment: input.quotationAttachment,
          submissionStatus: "submitted",
          notes: input.notes,
          updatedBy: ctx.user.id,
        })
        .where(
          and(
            eq(rfqVendors.id, input.rfqVendorId),
            eq(rfqVendors.organizationId, ctx.scope.organizationId)
          )
        );

      // Delete old line items for this vendor (to replace with new ones on edit)
      await db.delete(rfqVendorItems).where(
        eq(rfqVendorItems.rfqVendorId, input.rfqVendorId)
      );

      // Insert line-item quotations
      if (input.lineItems.length > 0) {
        await db.insert(rfqVendorItems).values(
          input.lineItems.map((item) => ({
            rfqVendorId: input.rfqVendorId,
            prLineItemId: item.prLineItemId,
            quotedUnitPrice: item.quotedUnitPrice.toString(),
            quotedTotalPrice: item.quotedTotalPrice.toString(),
            itemNotes: item.itemNotes || null,
          }))
        );
      }

      // Get the RFQ ID for this vendor
      const [updatedVendor] = await db
        .select({ rfqId: rfqVendors.rfqId })
        .from(rfqVendors)
        .where(eq(rfqVendors.id, input.rfqVendorId))
        .limit(1);

      if (updatedVendor?.rfqId) {
        // Check if all vendors for this RFQ have submitted
        const allVendors = await db
          .select()
          .from(rfqVendors)
          .where(
            and(
              eq(rfqVendors.rfqId, updatedVendor.rfqId),
              isNull(rfqVendors.deletedAt)
            )
          );

        const allSubmitted = allVendors.every((v) => v.submissionStatus === "submitted");

        // If all vendors have submitted, update RFQ status to 'received'
        if (allSubmitted && allVendors.length > 0) {
          await db
            .update(rfqs)
            .set({
              status: "received",
              updatedBy: ctx.user.id,
            })
            .where(eq(rfqs.id, updatedVendor.rfqId));
        }
      }

      return { success: true };
    }),

  /**
   * Update invitation status (declined, no_response)
   */
  updateInvitationStatus: scopedProcedure
    .input(
      z.object({
        rfqVendorId: z.number(),
        invitationStatus: z.enum(["invited", "declined", "no_response"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      await db
        .update(rfqVendors)
        .set({
          invitationStatus: input.invitationStatus,
          notes: input.notes,
          updatedBy: ctx.user.id,
        })
        .where(
          and(
            eq(rfqVendors.id, input.rfqVendorId),
            eq(rfqVendors.organizationId, ctx.scope.organizationId)
          )
        );

      return { success: true };
    }),

  /**
   * Get RFQ summary for a PR
   */
  getSummary: scopedProcedure
    .input(z.object({ purchaseRequestId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();

      const allVendors = await db
        .select()
        .from(rfqVendors)
        .where(
          and(
            eq(rfqVendors.purchaseRequestId, input.purchaseRequestId),
            eq(rfqVendors.organizationId, ctx.scope.organizationId),
            isNull(rfqVendors.deletedAt)
          )
        );

      return {
        totalInvited: allVendors.length,
        submitted: allVendors.filter((v) => v.submissionStatus === "submitted").length,
        pending: allVendors.filter((v) => v.submissionStatus === "pending").length,
        declined: allVendors.filter((v) => v.invitationStatus === "declined").length,
        noResponse: allVendors.filter((v) => v.invitationStatus === "no_response").length,
        lowestQuote: allVendors
          .filter((v) => v.quotedAmount)
          .reduce((min, v) => {
            const amount = parseFloat(v.quotedAmount || "0");
            return amount < min ? amount : min;
          }, Infinity),
      };
    }),

  /**
   * Get existing quotation details for update
   * Returns quotation summary and line-item prices
   */
  getQuotationDetails: scopedProcedure
    .input(z.object({ rfqVendorId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const { rfqVendorItems } = await import("../../../drizzle/schema");

      // Get quotation summary
      const [quotation] = await db
        .select()
        .from(rfqVendors)
        .where(
          and(
            eq(rfqVendors.id, input.rfqVendorId),
            eq(rfqVendors.organizationId, ctx.scope.organizationId),
            isNull(rfqVendors.deletedAt)
          )
        )
        .limit(1);

      if (!quotation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quotation not found",
        });
      }

      // Get line-item prices
      const lineItems = await db
        .select()
        .from(rfqVendorItems)
        .where(eq(rfqVendorItems.rfqVendorId, input.rfqVendorId));

      return {
        quotation,
        lineItems,
      };
    }),

  /**
   * Get PR line items for quotation form
   * Returns all items from the purchase request to populate quotation table
   */
  getPRLineItems: scopedProcedure
    .input(z.object({ purchaseRequestId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const { purchaseRequestLineItems } = await import("../../../drizzle/schema");

      const items = await db
        .select()
        .from(purchaseRequestLineItems)
        .where(
          eq(purchaseRequestLineItems.purchaseRequestId, input.purchaseRequestId)
        );

      return items;
    }),

  /**
   * Delete vendor invitation
   */
  deleteVendorInvitation: scopedProcedure
    .input(z.object({ rfqVendorId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      await db
        .update(rfqVendors)
        .set({
          deletedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
          deletedBy: ctx.user.id,
        })
        .where(
          and(
            eq(rfqVendors.id, input.rfqVendorId),
            eq(rfqVendors.organizationId, ctx.scope.organizationId)
          )
        );

      return { success: true };
    }),

  /**
   * Update RFQ status (draft → sent → received)
   * Auto-creates QA when status changes to 'received'
   */
  updateStatus: scopedProcedure
    .input(
      z.object({
        rfqId: z.number(),
        status: z.enum(["draft", "sent", "received", "cancelled"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Get RFQ details
      const [rfq] = await db
        .select()
        .from(rfqs)
        .where(
          and(
            eq(rfqs.id, input.rfqId),
            eq(rfqs.organizationId, ctx.scope.organizationId),
            isNull(rfqs.deletedAt)
          )
        )
        .limit(1);

      if (!rfq) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "RFQ not found",
        });
      }

      // Update RFQ status
      await db
        .update(rfqs)
        .set({
          status: input.status,
          updatedBy: ctx.user.id,
        })
        .where(eq(rfqs.id, input.rfqId));

      // Auto-create QA when RFQ is marked as received
      if (input.status === "received") {
        const { quotationAnalysisRouter } = await import("./quotationAnalysis");
        try {
          await quotationAnalysisRouter
            .createCaller({ user: ctx.user, scope: ctx.scope })
            .autoCreate({
              purchaseRequestId: rfq.purchaseRequestId,
            });
        } catch (error: any) {
          // QA might already exist, that's OK
          if (!error.message?.includes("already exists")) {
            console.error("Failed to auto-create QA:", error);
          }
        }
      }

      return { success: true };
    }),

  /**
   * Generate official RFQ PDF document
   */
  generatePDF: scopedProcedure
    .input(z.object({ rfqVendorId: z.number(), language: z.enum(['en', 'ar']).optional() }))
    .query(async ({ input, ctx }) => {
      const { rfqVendorId, language } = input;
      const result = await generateRFQPDFOfficial(rfqVendorId, ctx.scope.organizationId, language || 'en');
      return result;
    }),

  /**
   * Soft delete RFQ vendor
   */
  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Get document to check status
      const [doc] = await db
        .select()
        .from(quotationAnalyses)
        .where(
          and(
            eq(quotationAnalyses.id, input.id),
            eq(quotationAnalyses.organizationId, ctx.scope.organizationId)
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
        "RFQ",
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
          "RFQ",
          input.id,
          ctx.scope.organizationId
        );
      } else {
        await performSoftDelete(
          db,
          "RFQ",
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
   * Generate RFQ PDF document
   * Returns HTML that can be converted to PDF
   */
  // TEMP UNBLOCK PATCH: Duplicate generatePDF procedure
  //   generatePDF: scopedProcedure
  // TEMP UNBLOCK PATCH: Duplicate generatePDF procedure
  //     .input(z.object({ rfqVendorId: z.number() }))
  // TEMP UNBLOCK PATCH: Duplicate generatePDF procedure
  //     .query(async ({ input, ctx }) => {
  // TEMP UNBLOCK PATCH: Duplicate generatePDF procedure
  //       try {
  // TEMP UNBLOCK PATCH: Duplicate generatePDF procedure
  //         const html = await generateRFQPDF({
  // TEMP UNBLOCK PATCH: Duplicate generatePDF procedure
  //           rfqVendorId: input.rfqVendorId,
  // TEMP UNBLOCK PATCH: Duplicate generatePDF procedure
  //           organizationId: ctx.scope.organizationId,
  // TEMP UNBLOCK PATCH: Duplicate generatePDF procedure
  //           operatingUnitId: ctx.scope.operatingUnitId,
  // TEMP UNBLOCK PATCH: Duplicate generatePDF procedure
  //         });
  // TEMP UNBLOCK PATCH: Duplicate generatePDF procedure
  //         return { html };
  // TEMP UNBLOCK PATCH: Duplicate generatePDF procedure
  //       } catch (error) {
  // TEMP UNBLOCK PATCH: Duplicate generatePDF procedure
  //         throw new TRPCError({
  // TEMP UNBLOCK PATCH: Duplicate generatePDF procedure
  //           code: "INTERNAL_SERVER_ERROR",
  // TEMP UNBLOCK PATCH: Duplicate generatePDF procedure
  //           message: error instanceof Error ? error.message : "Failed to generate RFQ PDF",
  // TEMP UNBLOCK PATCH: Duplicate generatePDF procedure
  //         });
  // TEMP UNBLOCK PATCH: Duplicate generatePDF procedure
  //       }
  // TEMP UNBLOCK PATCH: Duplicate generatePDF procedure
  //     }),
  // TEMP UNBLOCK PATCH: Duplicate generatePDF procedure
  // });
});
