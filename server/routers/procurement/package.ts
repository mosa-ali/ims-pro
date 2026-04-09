import { router, scopedProcedure } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../db";
import { 
  purchaseRequests, 
  purchaseRequestLineItems,
  rfqs,
  quotationAnalyses,
  quotationAnalysisLineItems,
  quotationAnalysisSuppliers,
  bidAnalyses,
  bidAnalysisBidders,
  bidEvaluationCriteria,
  purchaseOrders,
  purchaseOrderLineItems,
  goodsReceiptNotes,
  grnLineItems
} from "../../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Procurement Package Router
 * Fetches all related procurement documents for consolidated printing
 */
export const packageRouter = router({
  /**
   * Get complete procurement package for printing
   * Returns all documents: PR → RFQ/Tender → QA/BA → PO → GRN
   */
  getForPrint: scopedProcedure
    .input(z.object({
      purchaseRequestId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const orgId = ctx.scope.organizationId;

      // Fetch PR
      const pr = await db
        .select()
        .from(purchaseRequests)
        .where(eq(purchaseRequests.id, input.purchaseRequestId))
        .limit(1);

      if (pr.length === 0) {
        throw new Error("Purchase Request not found");
      }

      // Fetch PR line items
      const prLineItems = await db
        .select()
        .from(purchaseRequestLineItems)
        .where(eq(purchaseRequestLineItems.purchaseRequestId, input.purchaseRequestId));

      // Fetch RFQ (for quotations ≤ $25K)
      const rfq = await db
        .select()
        .from(rfqs)
        .where(eq(rfqs.purchaseRequestId, input.purchaseRequestId))
        .limit(1);

      // Note: Tender process uses Bid Analysis directly, no separate tender table

      // Fetch Quotation Analysis
      const qa = await db
        .select()
        .from(quotationAnalyses)
        .where(eq(quotationAnalyses.purchaseRequestId, input.purchaseRequestId))
        .limit(1);

      let qaLineItems: any[] = [];
      let qaSuppliers: any[] = [];
      if (qa.length > 0) {
        qaLineItems = await db
          .select()
          .from(quotationAnalysisLineItems)
          .where(eq(quotationAnalysisLineItems.quotationAnalysisId, qa[0].id));

        qaSuppliers = await db
          .select()
          .from(quotationAnalysisSuppliers)
          .where(eq(quotationAnalysisSuppliers.quotationAnalysisId, qa[0].id));
      }

      // Fetch Bid Analysis
      const ba = await db
        .select()
        .from(bidAnalyses)
        .where(eq(bidAnalyses.purchaseRequestId, input.purchaseRequestId))
        .limit(1);

      let baBidders: any[] = [];
      let baCriteria: any[] = [];
      if (ba.length > 0) {
        baBidders = await db
          .select()
          .from(bidAnalysisBidders)
          .where(eq(bidAnalysisBidders.bidAnalysisId, ba[0].id));

        baCriteria = await db
          .select()
          .from(bidEvaluationCriteria)
          .where(eq(bidEvaluationCriteria.bidAnalysisId, ba[0].id));
      }

      // Fetch Purchase Order
      const po = await db
        .select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.purchaseRequestId, input.purchaseRequestId))
        .limit(1);

      let poLineItems: any[] = [];
      if (po.length > 0) {
        poLineItems = await db
          .select()
          .from(purchaseOrderLineItems)
          .where(eq(purchaseOrderLineItems.purchaseOrderId, po[0].id));
      }

      // Fetch Goods Receipt Note
      let grn: any[] = [];
      let grnLineItems: any[] = [];
      if (po.length > 0) {
        grn = await db
          .select()
          .from(goodsReceiptNotes)
          .where(eq(goodsReceiptNotes.purchaseOrderId, po[0].id))
          .limit(1);

        if (grn.length > 0) {
          grnLineItems = await db
            .select()
            .from(grnLineItems)
            .where(eq(grnLineItems.grnId, grn[0].id));
        }
      }

      return {
        pr: pr[0],
        prLineItems,
        rfq: rfq[0] || null,
        qa: qa[0] || null,
        qaLineItems,
        qaSuppliers,
        ba: ba[0] || null,
        baBidders,
        baCriteria,
        po: po[0] || null,
        poLineItems,
        grn: grn[0] || null,
        grnLineItems,
      };
    }),
});
