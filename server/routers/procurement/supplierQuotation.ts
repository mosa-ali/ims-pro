import { z } from "zod";
import { router, scopedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import {
  supplierQuotationHeaders,
  supplierQuotationLines,
  purchaseRequests,
  purchaseRequestLineItems,
  bidAnalysisBidders,
  bidAnalyses,
  vendors,
  bidAnalysisLineItems,
} from "../../../drizzle/schema";
import { eq, and, isNull, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { storagePut } from "../../storage";

/**
 * Supplier Quotation Entry Router
 *
 * For Goods PRs > $25,000 (Tender flow)
 * Records supplier offers per PR line item before Bid Evaluation
 * Flow: PR → Tender Info → BOM → Supplier Quotation Entry → Eval → CBA → PO
 */
export const supplierQuotationRouter = router({
  /**
   * List all quotations for a PR
   */
  listByPR: scopedProcedure
    .input(z.object({ purchaseRequestId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const headers = await db
        .select()
        .from(supplierQuotationHeaders)
        .where(
          and(
            eq(supplierQuotationHeaders.purchaseRequestId, input.purchaseRequestId),
            eq(supplierQuotationHeaders.organizationId, ctx.scope.organizationId),
            isNull(supplierQuotationHeaders.deletedAt)
          )
        )
        .orderBy(desc(supplierQuotationHeaders.createdAt));

      // Enrich with vendor name and line count
      const enriched = await Promise.all(
        headers.map(async (h) => {
          let vendorName = "";
          if (h.vendorId) {
            const [v] = await db
              .select({ name: vendors.name })
              .from(vendors)
              .where(eq(vendors.id, h.vendorId))
              .limit(1);
            vendorName = v?.name || "";
          }
          if (!vendorName && h.bidAnalysisBidderId) {
            const [b] = await db
              .select({ bidderName: bidAnalysisBidders.bidderName })
              .from(bidAnalysisBidders)
              .where(eq(bidAnalysisBidders.id, h.bidAnalysisBidderId))
              .limit(1);
            vendorName = b?.bidderName || "";
          }
          const [lineCount] = await db
            .select({ count: sql<number>`COUNT(*)` })
            .from(supplierQuotationLines)
            .where(eq(supplierQuotationLines.quotationHeaderId, h.id));
          return {
            ...h,
            vendorName,
            lineCount: lineCount?.count || 0,
          };
        })
      );
      return enriched;
    }),

  /**
   * Get a single quotation with its lines
   */
  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const [header] = await db
        .select()
        .from(supplierQuotationHeaders)
        .where(
          and(
            eq(supplierQuotationHeaders.id, input.id),
            eq(supplierQuotationHeaders.organizationId, ctx.scope.organizationId),
            isNull(supplierQuotationHeaders.deletedAt)
          )
        )
        .limit(1);
      if (!header) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quotation not found" });
      }
      const lines = await db
        .select()
        .from(supplierQuotationLines)
        .where(eq(supplierQuotationLines.quotationHeaderId, header.id));

      let vendorName = "";
      if (header.vendorId) {
        const [v] = await db
          .select({ name: vendors.name })
          .from(vendors)
          .where(eq(vendors.id, header.vendorId))
          .limit(1);
        vendorName = v?.name || "";
      }
      if (!vendorName && header.bidAnalysisBidderId) {
        const [b] = await db
          .select({ bidderName: bidAnalysisBidders.bidderName })
          .from(bidAnalysisBidders)
          .where(eq(bidAnalysisBidders.id, header.bidAnalysisBidderId))
          .limit(1);
        vendorName = b?.bidderName || "";
      }
      return { ...header, vendorName, lines };
    }),

  /**
   * Create a new supplier quotation with auto-loaded PR line items
   */
  create: scopedProcedure
    .input(
      z.object({
        purchaseRequestId: z.number(),
        vendorId: z.number().optional(),
        bidAnalysisBidderId: z.number().optional(),
        quotationReference: z.string().optional(),
        quotationDate: z.string().optional(),
        currency: z.string().optional(),
        notes: z.string().optional(),
        lines: z.array(
          z.object({
            prLineItemId: z.number(),
            itemDescriptionSnapshot: z.string(),
            specificationsSnapshot: z.string().optional(),
            quantity: z.number(),
            unit: z.string().optional(),
            unitPrice: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      // Verify PR exists
      const [pr] = await db
        .select()
        .from(purchaseRequests)
        .where(
          and(
            eq(purchaseRequests.id, input.purchaseRequestId),
            eq(purchaseRequests.organizationId, organizationId)
          )
        )
        .limit(1);
      if (!pr) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Purchase Request not found" });
      }

      // Calculate totals
      const lineItems = input.lines.map((line) => ({
        ...line,
        lineTotal: line.quantity * line.unitPrice,
      }));
      const totalAmount = lineItems.reduce((sum, l) => sum + l.lineTotal, 0);

      // Create header
      const [result] = await db.insert(supplierQuotationHeaders).values({
        purchaseRequestId: input.purchaseRequestId,
        vendorId: input.vendorId || null,
        bidAnalysisBidderId: input.bidAnalysisBidderId || null,
        organizationId,
        operatingUnitId,
        quotationReference: input.quotationReference || null,
        quotationDate: input.quotationDate || null,
        currency: input.currency || pr.currency || "USD",
        totalAmount: totalAmount.toFixed(2),
        status: "draft",
        notes: input.notes || null,
        createdBy: ctx.user.id,
      });
      const headerId = result.insertId;

      // Insert lines
      if (lineItems.length > 0) {
        await db.insert(supplierQuotationLines).values(
          lineItems.map((line) => ({
            quotationHeaderId: headerId,
            prLineItemId: line.prLineItemId,
            itemDescriptionSnapshot: line.itemDescriptionSnapshot,
            specificationsSnapshot: line.specificationsSnapshot || null,
            quantity: line.quantity.toFixed(2),
            unit: line.unit || "Piece",
            unitPrice: line.unitPrice.toFixed(2),
            lineTotal: line.lineTotal.toFixed(2),
          }))
        );
      }

      return { id: headerId, totalAmount };
    }),

  /**
   * Update quotation lines (prices) and header metadata.
   * When status transitions to "submitted", also upserts bid_analysis_line_items
   * so the CBA Supplier Offer Matrix and PO creation have reliable per-item prices.
   */
  update: scopedProcedure
    .input(
      z.object({
        id: z.number(),
        quotationReference: z.string().optional(),
        quotationDate: z.string().optional(),
        currency: z.string().optional(),
        notes: z.string().optional(),
        status: z.enum(["draft", "submitted"]).optional(),
        lines: z.array(
          z.object({
            id: z.number().optional(),
            prLineItemId: z.number(),
            itemDescriptionSnapshot: z.string(),
            specificationsSnapshot: z.string().optional(),
            quantity: z.number(),
            unit: z.string().optional(),
            unitPrice: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Verify header exists and belongs to org
      const [header] = await db
        .select()
        .from(supplierQuotationHeaders)
        .where(
          and(
            eq(supplierQuotationHeaders.id, input.id),
            eq(supplierQuotationHeaders.organizationId, ctx.scope.organizationId),
            isNull(supplierQuotationHeaders.deletedAt)
          )
        )
        .limit(1);
      if (!header) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quotation not found" });
      }

      // Calculate totals
      const lineItems = input.lines.map((line) => ({
        ...line,
        lineTotal: line.quantity * line.unitPrice,
      }));
      const totalAmount = lineItems.reduce((sum, l) => sum + l.lineTotal, 0);
      const newStatus = input.status ?? header.status;

      // Update header
      await db
        .update(supplierQuotationHeaders)
        .set({
          quotationReference: input.quotationReference ?? header.quotationReference,
          quotationDate: input.quotationDate ?? header.quotationDate,
          currency: input.currency ?? header.currency,
          totalAmount: totalAmount.toFixed(2),
          status: newStatus,
          notes: input.notes ?? header.notes,
        })
        .where(eq(supplierQuotationHeaders.id, input.id));

      // Delete old lines and re-insert
      await db
        .delete(supplierQuotationLines)
        .where(eq(supplierQuotationLines.quotationHeaderId, input.id));

      if (lineItems.length > 0) {
        await db.insert(supplierQuotationLines).values(
          lineItems.map((line) => ({
            quotationHeaderId: input.id,
            prLineItemId: line.prLineItemId,
            itemDescriptionSnapshot: line.itemDescriptionSnapshot,
            specificationsSnapshot: line.specificationsSnapshot || null,
            quantity: line.quantity.toFixed(2),
            unit: line.unit || "Piece",
            unitPrice: line.unitPrice.toFixed(2),
            lineTotal: line.lineTotal.toFixed(2),
          }))
        );
      }

      // ── PCE: Sync bid_analysis_line_items whenever lines are saved ──
      // This keeps the CBA Supplier Offer Matrix always up to date,
      // regardless of whether the status is draft or submitted.
      // Only applies when the quotation is linked to a bid analysis bidder.
      const bidderId = header.bidAnalysisBidderId;
      if (bidderId && lineItems.length > 0) {
        // Resolve the bidAnalysisId from the bidder record
        const [bidder] = await db
          .select({ bidAnalysisId: bidAnalysisBidders.bidAnalysisId })
          .from(bidAnalysisBidders)
          .where(eq(bidAnalysisBidders.id, bidderId))
          .limit(1);

        if (bidder?.bidAnalysisId) {
          const { bidAnalysisId } = bidder;
          const { organizationId, operatingUnitId } = ctx.scope;

          // Delete existing entries for this bidder in this BA and re-insert
          await db
            .delete(bidAnalysisLineItems)
            .where(
              and(
                eq(bidAnalysisLineItems.bidAnalysisId, bidAnalysisId),
                eq(bidAnalysisLineItems.bidderId, bidderId)
              )
            );

          await db.insert(bidAnalysisLineItems).values(
            lineItems.map((line) => ({
              bidAnalysisId,
              bidderId,
              prLineItemId: line.prLineItemId,
              organizationId,
              operatingUnitId: operatingUnitId || null,
              unitPrice: line.unitPrice.toFixed(2),
              lineTotal: line.lineTotal.toFixed(2),
              createdBy: ctx.user.id,
            }))
          );
        }
      }

      return { id: input.id, totalAmount };
    }),

  /**
   * Upload attachment for a quotation
   */
  uploadAttachment: scopedProcedure
    .input(
      z.object({
        id: z.number(),
        fileName: z.string(),
        fileData: z.string(), // base64
        mimeType: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      const [header] = await db
        .select()
        .from(supplierQuotationHeaders)
        .where(
          and(
            eq(supplierQuotationHeaders.id, input.id),
            eq(supplierQuotationHeaders.organizationId, ctx.scope.organizationId),
            isNull(supplierQuotationHeaders.deletedAt)
          )
        )
        .limit(1);
      if (!header) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quotation not found" });
      }

      const buffer = Buffer.from(input.fileData, "base64");
      const suffix = Math.random().toString(36).substring(2, 10);
      const fileKey = `supplier-quotations/${ctx.scope.organizationId}/${header.purchaseRequestId}/${input.id}-${suffix}-${input.fileName}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);

      await db
        .update(supplierQuotationHeaders)
        .set({
          attachmentUrl: url,
          attachmentName: input.fileName,
        })
        .where(eq(supplierQuotationHeaders.id, input.id));

      return { url, fileName: input.fileName };
    }),

  /**
   * Soft delete a quotation
   */
  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      const [header] = await db
        .select()
        .from(supplierQuotationHeaders)
        .where(
          and(
            eq(supplierQuotationHeaders.id, input.id),
            eq(supplierQuotationHeaders.organizationId, ctx.scope.organizationId),
            isNull(supplierQuotationHeaders.deletedAt)
          )
        )
        .limit(1);
      if (!header) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quotation not found" });
      }

      await db
        .update(supplierQuotationHeaders)
        .set({
          deletedAt: new Date().toISOString(),
          deletedBy: ctx.user.id,
        })
        .where(eq(supplierQuotationHeaders.id, input.id));

      return { success: true };
    }),

  /**
   * Get summary/count for the workspace card
   */
  getSummary: scopedProcedure
    .input(z.object({ purchaseRequestId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const headers = await db
        .select()
        .from(supplierQuotationHeaders)
        .where(
          and(
            eq(supplierQuotationHeaders.purchaseRequestId, input.purchaseRequestId),
            eq(supplierQuotationHeaders.organizationId, ctx.scope.organizationId),
            isNull(supplierQuotationHeaders.deletedAt)
          )
        );

      const count = headers.length;
      const submitted = headers.filter((h) => h.status === "submitted").length;
      const latestVendorId = headers[0]?.vendorId;
      let latestVendorName = "";
      if (latestVendorId) {
        const [v] = await db
          .select({ name: vendors.name })
          .from(vendors)
          .where(eq(vendors.id, latestVendorId))
          .limit(1);
        latestVendorName = v?.name || "";
      }
      if (!latestVendorName && headers[0]?.bidAnalysisBidderId) {
        const [b] = await db
          .select({ bidderName: bidAnalysisBidders.bidderName })
          .from(bidAnalysisBidders)
          .where(eq(bidAnalysisBidders.id, headers[0].bidAnalysisBidderId))
          .limit(1);
        latestVendorName = b?.bidderName || "";
      }

      return {
        count,
        submitted,
        latestVendorName,
        hasQuotations: count > 0,
        allSubmitted: count > 0 && submitted === count,
      };
    }),

  /**
   * Get quotation lines for a specific bidder (used by CBA/PO)
   */
  getByBidder: scopedProcedure
    .input(
      z.object({
        purchaseRequestId: z.number(),
        bidAnalysisBidderId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const [header] = await db
        .select()
        .from(supplierQuotationHeaders)
        .where(
          and(
            eq(supplierQuotationHeaders.purchaseRequestId, input.purchaseRequestId),
            eq(supplierQuotationHeaders.bidAnalysisBidderId, input.bidAnalysisBidderId),
            eq(supplierQuotationHeaders.organizationId, ctx.scope.organizationId),
            isNull(supplierQuotationHeaders.deletedAt)
          )
        )
        .limit(1);
      if (!header) return null;

      const lines = await db
        .select()
        .from(supplierQuotationLines)
         .where(eq(supplierQuotationLines.quotationHeaderId, header.id));
      return { ...header, lines };
    }),

  /**
   * Auto-initialize quotation headers for all bidders from Tender Information.
   * Creates one draft quotation per bidder with PR line items pre-loaded.
   * Skips bidders that already have a quotation for this PR.
   */
  initializeForBidders: scopedProcedure
    .input(z.object({ purchaseRequestId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      // Verify PR exists
      const [pr] = await db
        .select()
        .from(purchaseRequests)
        .where(
          and(
            eq(purchaseRequests.id, input.purchaseRequestId),
            eq(purchaseRequests.organizationId, organizationId)
          )
        )
        .limit(1);
      if (!pr) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Purchase Request not found" });
      }

      // Get PR line items
      const prLines = await db
        .select()
        .from(purchaseRequestLineItems)
        .where(eq(purchaseRequestLineItems.purchaseRequestId, input.purchaseRequestId));

      if (prLines.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No PR line items found" });
      }

      // Get bid analysis for this PR
      const [ba] = await db
        .select()
        .from(bidAnalyses)
        .where(
          and(
            eq(bidAnalyses.purchaseRequestId, input.purchaseRequestId),
            eq(bidAnalyses.organizationId, organizationId)
          )
        )
        .limit(1);

      if (!ba) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No Bid Analysis found. Please create Tender Information first." });
      }

      // Get all bidders
      const allBidders = await db
        .select()
        .from(bidAnalysisBidders)
        .where(eq(bidAnalysisBidders.bidAnalysisId, ba.id));

      if (allBidders.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No bidders found in Tender Information" });
      }

      // Get existing quotations for this PR to skip already-created ones
      const existingQuotations = await db
        .select({
          bidAnalysisBidderId: supplierQuotationHeaders.bidAnalysisBidderId,
          vendorId: supplierQuotationHeaders.vendorId,
        })
        .from(supplierQuotationHeaders)
        .where(
          and(
            eq(supplierQuotationHeaders.purchaseRequestId, input.purchaseRequestId),
            eq(supplierQuotationHeaders.organizationId, organizationId),
            isNull(supplierQuotationHeaders.deletedAt)
          )
        );

      const existingBidderIds = new Set(
        existingQuotations
          .filter((q) => q.bidAnalysisBidderId)
          .map((q) => q.bidAnalysisBidderId!)
      );
      const existingVendorIds = new Set(
        existingQuotations
          .filter((q) => q.vendorId)
          .map((q) => q.vendorId!)
      );

      let created = 0;
      let skipped = 0;

      for (const bidder of allBidders) {
        // Skip if already has a quotation
        if (existingBidderIds.has(bidder.id)) {
          skipped++;
          continue;
        }
        if (bidder.vendorId && existingVendorIds.has(bidder.vendorId)) {
          skipped++;
          continue;
        }

        // Create header for this bidder
        const [result] = await db.insert(supplierQuotationHeaders).values({
          purchaseRequestId: input.purchaseRequestId,
          vendorId: bidder.vendorId || null,
          bidAnalysisBidderId: bidder.id,
          organizationId,
          operatingUnitId,
          quotationReference: null,
          quotationDate: null,
          currency: pr.currency || "USD",
          totalAmount: "0.00",
          status: "draft",
          notes: null,
          createdBy: ctx.user.id,
        });
        const headerId = result.insertId;

        // Insert PR line items with zero prices
        await db.insert(supplierQuotationLines).values(
          prLines.map((line) => ({
            quotationHeaderId: headerId,
            prLineItemId: line.id,
            itemDescriptionSnapshot: line.description || "",
            specificationsSnapshot: line.specifications || null,
            quantity: line.quantity || "0",
            unit: line.unit || "Piece",
            unitPrice: "0.00",
            lineTotal: "0.00",
          }))
        );

        created++;
      }

      return { created, skipped, total: allBidders.length };
    }),
});
