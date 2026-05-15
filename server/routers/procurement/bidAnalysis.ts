import { z } from "zod";
import { router, scopedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { 
  bidAnalyses, 
  bidAnalysisBidders,
  bidEvaluationCriteria,
  bidEvaluationScores,
  purchaseRequests,
  purchaseRequestLineItems,
  cbaApprovalSignatures,
  budgetLines,
  contracts,
  bidderAcknowledgementSignatures,
  supplierQuotationHeaders,
  supplierQuotationLines,
  bidAnalysisLineItems,
  vendorQualificationScores,
} from "../../../drizzle/schema";
import { storagePut } from "../../storage";
import { nanoid } from "nanoid";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { generateBANumber } from "../../services/procurementNumbering";
import { autoRegisterVendor, recordVendorParticipation } from "../../vendorAutomation";
import { createProcurementBaseline } from "../../vendorBaselineAutomation";

/**
 * Bid Analysis (BA/CBA) Router
 * 
 * BA is used ONLY for PRs > USD 25,000 (Tenders)
 * Uses standard db.select() queries for TiDB compatibility
 */

const formatSqlDate = (dateValue?: string | Date | null) => {
  if (!dateValue) return null;

  return new Date(dateValue)
    .toISOString()
    .split("T")[0]; // YYYY-MM-DD
};

const nowSql = new Date().toISOString().slice(0, 19).replace('T', ' ');

export const bidAnalysisRouter = router({
  /**
   * Auto-create BA when PR is approved (if total > $25K)
   */
  autoCreate: scopedProcedure
    .input(z.object({
      purchaseRequestId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { purchaseRequestId } = input;
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();

      // Get PR details
      const [pr] = await db.select()
        .from(purchaseRequests)
        .where(and(
          eq(purchaseRequests.id, purchaseRequestId),
          eq(purchaseRequests.organizationId, organizationId)
        ))
        .limit(1);

      if (!pr) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Purchase Request not found",
        });
      }

      // Check if PR total is > $25,000 (Tender process)
      // Use prTotalUsd (correct field name) if available, otherwise use total or totalBudgetLine
      const prTotal = parseFloat(pr.prTotalUsd || pr.total || pr.totalBudgetLine || "0");
      if (prTotal <= 25000) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "BA is only for PRs > USD 25,000. This PR requires QA (Quotation Analysis).",
        });
      }

      // Check if BA already exists
      const [existingBA] = await db.select()
        .from(bidAnalyses)
        .where(and(
          eq(bidAnalyses.purchaseRequestId, purchaseRequestId),
          eq(bidAnalyses.organizationId, organizationId),
          isNull(bidAnalyses.deletedAt)
        ))
        .limit(1);

      if (existingBA) {
        return existingBA;
      }

      // Generate BA number
      const baNumber = await generateBANumber(organizationId, operatingUnitId);

      // Create BA
      const [result] = await db.insert(bidAnalyses).values({
        organizationId,
        operatingUnitId,
        purchaseRequestId,
        cbaNumber: baNumber,
        title: pr.projectTitle,
        titleAr: pr.projectTitle,
        status: "draft",
        technicalWeight: "70",
        financialWeight: "30",
        minimumTechnicalScore: "70",
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
        isDeleted: 0,  // Dual-column synchronization
      });

      const [createdBA] = await db.select()
        .from(bidAnalyses)
        .where(eq(bidAnalyses.id, Number(result.insertId)))
        .limit(1);

      return createdBA;
    }),

  /**
   * Update Tender Information Tab (Announcement Details)
   */
  updateTenderInformation: scopedProcedure
    .input(z.object({
      bidAnalysisId: z.number(),
      announcementStartDate: z.coerce.date(),
      announcementEndDate: z.coerce.date(),
      announcementChannel: z.enum(["website", "newspaper", "donor_portal", "other"]),
      announcementLink: z.string().optional(),
      announcementReference: z.string().optional(),
      numberOfBidders: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { bidAnalysisId, ...tenderInfo } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Verify BA exists
      const [ba] = await db.select()
        .from(bidAnalyses)
        .where(and(
          eq(bidAnalyses.id, bidAnalysisId),
          eq(bidAnalyses.organizationId, organizationId),
          isNull(bidAnalyses.deletedAt)
        ))
        .limit(1);

      if (!ba) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bid Analysis not found",
        });
      }

      // Update tender information
      await db.update(bidAnalyses)
        .set({
          ...tenderInfo,
          updatedAt: nowSql,
          updatedBy: ctx.user.id,
        })
        .where(eq(bidAnalyses.id, bidAnalysisId));

      return { success: true };
    }),

  /**
   * Add bidder to BA
   */
  addBidder: scopedProcedure
    .input(z.object({
      bidAnalysisId: z.number(),
      supplierId: z.number().optional(),
      bidderName: z.string(),
      submissionDate: z.coerce.date(),
      submissionStatus: z.enum(["received", "valid", "disqualified"]).default("received"),
      bidReference: z.string().optional(),
      totalBidAmount: z.number().optional(),
      currency: z.string().default("USD"),
    }))
    .mutation(async ({ input, ctx }) => {
      const { bidAnalysisId, ...bidderData } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Verify BA exists
      const [ba] = await db.select()
        .from(bidAnalyses)
        .where(and(
          eq(bidAnalyses.id, bidAnalysisId),
          eq(bidAnalyses.organizationId, organizationId),
          isNull(bidAnalyses.deletedAt)
        ))
        .limit(1);

      if (!ba) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bid Analysis not found",
        });
      }

      // Check if announcement has closed (hard lock)
      if (ba.announcementEndDate && nowSql < ba.announcementEndDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot add bidders before announcement end date. This is a hard lock to ensure compliance.",
        });
      }

      // Auto-register vendor if not exists
      let vendorId = bidderData.supplierId;
      if (!vendorId) {
        const vendor = await autoRegisterVendor({
          name: bidderData.bidderName,
          legalName: bidderData.bidderName,
          vendorType: "supplier",
          source: "bid_submission",
          sourceReferenceId: bidAnalysisId.toString(),
          organizationId,
          operatingUnitId: ctx.scope.operatingUnitId,
        });
        vendorId = vendorId;
      }

      // Check if supplier already exists in this tender
      const [existingBidder] = await db.select()
        .from(bidAnalysisBidders)
        .where(and(
          eq(bidAnalysisBidders.bidAnalysisId, bidAnalysisId),
          eq(bidAnalysisBidders.supplierId, vendorId)
        ))
        .limit(1);

      if (existingBidder) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Supplier "${bidderData.bidderName}" has already been added to this tender. Duplicate bidders are not allowed.`,
        });
      }

      // Add bidder with org/ou context
      const [result] = await db.insert(bidAnalysisBidders).values({
        bidAnalysisId,
        organizationId: organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
        ...bidderData,
        supplierId: vendorId,
        totalBidAmount: bidderData.totalBidAmount?.toString(),
        createdAt: nowSql,
        updatedAt: nowSql,
      });

      // Record participation in vendor history (optional - operatingUnitId may be undefined)
      try {
        await recordVendorParticipation({
          vendorId: vendorId!,
          participationType: "bid",
          bidAnalysisId,
          submissionDate: bidderData.submissionDate,
          submissionStatus: "submitted",
          organizationId,
          operatingUnitId: ctx.scope?.operatingUnitId,
        });
      } catch (error) {
        // Log but don't fail - vendor participation is optional
        console.error("Failed to record vendor participation:", error);
      }

      // Update number of bidders
      const biddersList = await db.select()
        .from(bidAnalysisBidders)
        .where(eq(bidAnalysisBidders.bidAnalysisId, bidAnalysisId));

      await db.update(bidAnalyses)
        .set({
          numberOfBidders: biddersList.length,
          updatedAt: nowSql,
        })
        .where(eq(bidAnalyses.id, bidAnalysisId));

      // ✅ Auto-sync: Check if there's an existing supplier quotation for this bidder
      // and auto-populate totalBidAmount from quotation data
      const newBidderId = Number(result.insertId);
      
      // Look for supplier quotation headers linked to this vendor for this PR
      const matchingQuotations = await db.select()
        .from(supplierQuotationHeaders)
        .where(and(
          eq(supplierQuotationHeaders.purchaseRequestId, ba.purchaseRequestId),
          eq(supplierQuotationHeaders.organizationId, organizationId),
          isNull(supplierQuotationHeaders.deletedAt),
          vendorId ? eq(supplierQuotationHeaders.vendorId, vendorId) : sql`1=0`
        ));

      let autoSyncedFromQuotation = false;
      if (matchingQuotations.length > 0) {
        // Use the most recent quotation with a non-zero total
        const bestQuotation = matchingQuotations
          .filter(q => q.totalAmount && parseFloat(q.totalAmount) > 0)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

        if (bestQuotation) {
          const quotationTotal = parseFloat(bestQuotation.totalAmount!);
          // Update bidder's totalBidAmount from quotation
          await db.update(bidAnalysisBidders)
            .set({
              totalBidAmount: quotationTotal.toString(),
              updatedAt: nowSql,
            })
            .where(eq(bidAnalysisBidders.id, newBidderId));

          // Link the quotation header to this bidder
          await db.update(supplierQuotationHeaders)
            .set({
              bidAnalysisBidderId: newBidderId,
              updatedAt: nowSql,
            })
            .where(eq(supplierQuotationHeaders.id, bestQuotation.id));

          autoSyncedFromQuotation = true;
        }
      }

      const [createdBidder] = await db.select()
        .from(bidAnalysisBidders)
        .where(eq(bidAnalysisBidders.id, newBidderId))
        .limit(1);

      return { ...createdBidder, autoSyncedFromQuotation };
    }),

  /**
   * Update bidder technical score
   */
  updateBidderTechnicalScore: scopedProcedure
    .input(z.object({
      bidderId: z.number(),
      technicalScore: z.number().min(0).max(100),
    }))
    .mutation(async ({ input, ctx }) => {
      const { bidderId, technicalScore } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Get bidder
      const [bidder] = await db.select()
        .from(bidAnalysisBidders)
        .where(eq(bidAnalysisBidders.id, bidderId))
        .limit(1);

      if (!bidder) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bidder not found",
        });
      }

      // Verify BA belongs to organization
      const [ba] = await db.select()
        .from(bidAnalyses)
        .where(and(
          eq(bidAnalyses.id, bidder.bidAnalysisId),
          eq(bidAnalyses.organizationId, organizationId)
        ))
        .limit(1);

      if (!ba) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bid Analysis not found",
        });
      }

      // Update technical score
      await db.update(bidAnalysisBidders)
        .set({
          technicalScore: technicalScore.toString(),
          updatedAt: nowSql,
        })
        .where(eq(bidAnalysisBidders.id, bidderId));

      return { success: true };
    }),

  /**
   * Calculate financial scores for all bidders
   */
  calculateFinancialScores: scopedProcedure
    .input(z.object({
      bidAnalysisId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { bidAnalysisId } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Get BA
      const [ba] = await db.select()
        .from(bidAnalyses)
        .where(and(
          eq(bidAnalyses.id, bidAnalysisId),
          eq(bidAnalyses.organizationId, organizationId),
          isNull(bidAnalyses.deletedAt)
        ))
        .limit(1);

      if (!ba) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bid Analysis not found",
        });
      }

      // Get bidders
      const bidders = await db.select()
        .from(bidAnalysisBidders)
        .where(eq(bidAnalysisBidders.bidAnalysisId, bidAnalysisId));

      const minimumTechnicalScore = parseFloat(ba.minimumTechnicalScore || "70");
      const technicalWeight = parseFloat(ba.technicalWeight || "70");
      const financialWeight = parseFloat(ba.financialWeight || "30");

      // Filter bidders who passed technical threshold
      const qualifiedBidders = bidders.filter(
        (b) => parseFloat(b.technicalScore || "0") >= minimumTechnicalScore
      );

      if (qualifiedBidders.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No bidders passed the 70% technical threshold.",
        });
      }

      // Find lowest bid among qualified bidders
      const qualifiedPrices = qualifiedBidders.map((b) => parseFloat(b.totalBidAmount || "0")).filter(p => p > 0);
      if (qualifiedPrices.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot calculate financial scores: no valid bid amounts",
        });
      }
      const lowestBid = Math.min(...qualifiedPrices);

      // Calculate financial and combined scores
      for (const bidder of bidders) {
        const technicalScore = parseFloat(bidder.technicalScore || "0");
        
        if (technicalScore >= minimumTechnicalScore) {
          const bidAmount = parseFloat(bidder.totalBidAmount || "0");
          const financialScore = bidAmount > 0 ? (lowestBid / bidAmount) * 100 : 0;
          const combinedScore = 
            (technicalScore * technicalWeight / 100) + 
            (financialScore * financialWeight / 100);
          
          await db.update(bidAnalysisBidders)
            .set({
              financialScore: financialScore.toFixed(2),
              combinedScore: combinedScore.toFixed(2),
              updatedAt: nowSql,
            })
            .where(eq(bidAnalysisBidders.id, bidder.id));
        } else {
          await db.update(bidAnalysisBidders)
            .set({
              financialScore: "0",
              combinedScore: "0",
              isResponsive: 0,
              nonResponsiveReason: `Failed to meet minimum technical score of ${minimumTechnicalScore}%`,
              updatedAt: nowSql,
            })
            .where(eq(bidAnalysisBidders.id, bidder.id));
        }
      }

      // Rank bidders by combined score (descending)
      const rankedBidders = await db.select()
        .from(bidAnalysisBidders)
        .where(eq(bidAnalysisBidders.bidAnalysisId, bidAnalysisId))
        .orderBy(desc(bidAnalysisBidders.combinedScore));

      for (let i = 0; i < rankedBidders.length; i++) {
        await db.update(bidAnalysisBidders)
          .set({ rank: i + 1 })
          .where(eq(bidAnalysisBidders.id, rankedBidders[i].id));
      }

      return { success: true };
    }),

  /**
   * Select winning bidder
   */
  selectBidder: scopedProcedure
    .input(z.object({
      bidAnalysisId: z.number(),
      bidderId: z.number(),
      justification: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { bidAnalysisId, bidderId, justification } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Verify BA exists
      const [ba] = await db.select()
        .from(bidAnalyses)
        .where(and(
          eq(bidAnalyses.id, bidAnalysisId),
          eq(bidAnalyses.organizationId, organizationId),
          isNull(bidAnalyses.deletedAt)
        ))
        .limit(1);

      if (!ba) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bid Analysis not found",
        });
      }

      // Get bidders
      const bidders = await db.select()
        .from(bidAnalysisBidders)
        .where(eq(bidAnalysisBidders.bidAnalysisId, bidAnalysisId));

      // Verify bidder belongs to this BA
      const bidder = bidders.find((b) => b.id === bidderId);
      if (!bidder) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Bidder not found in this BA",
        });
      }

      // Check if selected bidder is NOT the lowest bidder
      const prices = bidders.map((b) => parseFloat(b.totalBidAmount || "0")).filter(p => p > 0);
      const lowestBid = prices.length > 0 ? Math.min(...prices) : 0;
      const selectedBid = parseFloat(bidder.totalBidAmount || "0");

      if (selectedBid > lowestBid && !justification) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Justification is MANDATORY when selected bidder is not the lowest bidder",
        });
      }

      // Update BA - store the bidder ROW ID (bid_analysis_bidders.id)
      // The CBA finalize and contract auto-creation code uses this to look up the bidder row
      await db.update(bidAnalyses)
        .set({
          selectedBidderId: bidderId,
          selectionJustification: justification,
          status: "awarded",
          updatedAt: nowSql,
          updatedBy: ctx.user.id,
        })
        .where(eq(bidAnalyses.id, bidAnalysisId));

      // Mark selected bidder
      await db.update(bidAnalysisBidders)
        .set({ isSelected: 1 })
        .where(eq(bidAnalysisBidders.id, bidderId));

      // Auto-create procurement baseline for the awarded vendor
      if (bidder.supplierId) {
        try {
          await createProcurementBaseline({
            vendorId: bidder.supplierId,
            organizationId: organizationId,
            operatingUnitId: ctx.scope.operatingUnitId || null,
            bidAnalysisId: bidAnalysisId,
            purchaseRequestId: ba.purchaseRequestId || null,
            prNumber: ba.prNumber || null,
            cbaNumber: ba.cbaNumber || null,
            bidderId: bidderId,
            totalBidAmount: bidder.totalBidAmount,
            currency: bidder.currency || null,
            createdBy: ctx.user.id,
          });
        } catch (err) {
          console.error('[selectBidder] Baseline creation failed (non-blocking):', err);
        }
      }

      return { success: true };
    }),

  /**
   * Approve BA
   */
  approve: scopedProcedure
    .input(z.object({
      bidAnalysisId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { bidAnalysisId } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      const [ba] = await db.select()
        .from(bidAnalyses)
        .where(and(
          eq(bidAnalyses.id, bidAnalysisId),
          eq(bidAnalyses.organizationId, organizationId),
          isNull(bidAnalyses.deletedAt)
        ))
        .limit(1);

      if (!ba) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bid Analysis not found",
        });
      }

      if (!ba.selectedBidderId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot approve BA: no bidder selected",
        });
      }

      await db.update(bidAnalyses)
        .set({
          approvedBy: ctx.user.id,
          approvedAt: nowSql,
          updatedAt: nowSql,
          updatedBy: ctx.user.id,
        })
        .where(eq(bidAnalyses.id, bidAnalysisId));

      return { success: true };
    }),

  /**
   * Get BA by ID with all related data
   */
  getById: scopedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const { id } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      const [ba] = await db.select()
        .from(bidAnalyses)
        .where(and(
          eq(bidAnalyses.id, id),
          eq(bidAnalyses.organizationId, organizationId),
          isNull(bidAnalyses.deletedAt)
        ))
        .limit(1);

      if (!ba) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bid Analysis not found",
        });
      }

      // Get PR
      const [purchaseRequest] = await db.select()
        .from(purchaseRequests)
        .where(eq(purchaseRequests.id, ba.purchaseRequestId))
        .limit(1);

      // Get PR line items
      const prLineItems = await db.select()
        .from(purchaseRequestLineItems)
        .where(eq(purchaseRequestLineItems.purchaseRequestId, ba.purchaseRequestId));

      // Get budget line details from PR's budgetLineId
      let budgetLineData: { description: string | null; availableBalance: string | null; currency: string | null } | null = null;
      if (purchaseRequest?.budgetLineId) {
        const [bl] = await db.select({
          description: budgetLines.description,
          availableBalance: budgetLines.availableBalance,
        })
          .from(budgetLines)
          .where(eq(budgetLines.id, purchaseRequest.budgetLineId))
          .limit(1);
        if (bl) {
          budgetLineData = {
            description: bl.description,
            availableBalance: bl.availableBalance,
            currency: purchaseRequest.currency || "USD",
          };
        }
      }
      // Fallback: use budgetTitle stored on the PR itself
      if (!budgetLineData && purchaseRequest?.budgetTitle) {
        budgetLineData = {
          description: purchaseRequest.budgetTitle,
          availableBalance: purchaseRequest.totalBudgetLine ?? null,
          currency: purchaseRequest.currency || "USD",
        };
      }

      // Get bidders
      const bidders = await db.select()
        .from(bidAnalysisBidders)
        .where(eq(bidAnalysisBidders.bidAnalysisId, id));

      // Get evaluation criteria
      const criteria = await db.select()
        .from(bidEvaluationCriteria)
        .where(eq(bidEvaluationCriteria.bidAnalysisId, id));

      // Resolve the actual vendor/supplier ID from the selected bidder row
      let selectedVendorId: number | null = null;
      if (ba.selectedBidderId) {
        const selectedBidder = bidders.find((b) => b.id === ba.selectedBidderId);
        if (selectedBidder) {
          selectedVendorId = selectedBidder.supplierId || null;
        }
      }

      return {
        ...ba,
        selectedVendorId,
        purchaseRequest: {
          ...purchaseRequest,
          lineItems: prLineItems,
        },
        budgetLineData,
        bidders,
        evaluationCriteria: criteria,
      };
    }),

  /**
   * Get BA by Purchase Request ID
   */
  getByPurchaseRequestId: scopedProcedure
    .input(z.object({
      purchaseRequestId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const { purchaseRequestId } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      const [ba] = await db.select()
        .from(bidAnalyses)
        .where(and(
          eq(bidAnalyses.purchaseRequestId, purchaseRequestId),
          eq(bidAnalyses.organizationId, organizationId),
          isNull(bidAnalyses.deletedAt)
        ))
        .limit(1);

      if (!ba) return null;

      // Get PR
      const [purchaseRequest] = await db.select()
        .from(purchaseRequests)
        .where(eq(purchaseRequests.id, ba.purchaseRequestId))
        .limit(1);

      // Get PR line items
      const prLineItems = await db.select()
        .from(purchaseRequestLineItems)
        .where(eq(purchaseRequestLineItems.purchaseRequestId, ba.purchaseRequestId));

      // Get bidders
      const bidders = await db.select()
        .from(bidAnalysisBidders)
        .where(eq(bidAnalysisBidders.bidAnalysisId, ba.id));

      // Get evaluation criteria
      const criteria = await db.select()
        .from(bidEvaluationCriteria)
        .where(eq(bidEvaluationCriteria.bidAnalysisId, ba.id));

      // Resolve the actual vendor/supplier ID from the selected bidder row
      // selectedBidderId in bid_analyses stores the bidder ROW ID (bid_analysis_bidders.id)
      let selectedVendorId: number | null = null;
      if (ba.selectedBidderId) {
        const selectedBidder = bidders.find((b) => b.id === ba.selectedBidderId);
        if (selectedBidder) {
          selectedVendorId = selectedBidder.supplierId || null;
        }
      }

      return {
        ...ba,
        selectedVendorId,
        purchaseRequest: {
          ...purchaseRequest,
          lineItems: prLineItems,
        },
        bidders,
        evaluationCriteria: criteria,
      };
    }),

  /**
   * List all BAs for organization
   */
  list: scopedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      status: z.enum(["draft", "published", "bids_received", "technical_evaluation", "financial_evaluation", "awarded", "cancelled"]).optional(),
    }))
    .query(async ({ input, ctx }) => {
      const { limit, offset, status } = input;
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();

      const conditions = [
        eq(bidAnalyses.organizationId, organizationId),
        isNull(bidAnalyses.deletedAt),
      ];

      if (operatingUnitId) {
        conditions.push(eq(bidAnalyses.operatingUnitId, operatingUnitId));
      }

      if (status) {
        conditions.push(eq(bidAnalyses.status, status));
      }

      const bas = await db.select()
        .from(bidAnalyses)
        .where(and(...conditions))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(bidAnalyses.createdAt));

      return bas;
    }),

  /**
   * Delete BA (soft delete)
   */
  delete: scopedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      const [ba] = await db.select()
        .from(bidAnalyses)
        .where(and(
          eq(bidAnalyses.id, id),
          eq(bidAnalyses.organizationId, organizationId),
          isNull(bidAnalyses.deletedAt)
        ))
        .limit(1);

      if (!ba) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bid Analysis not found",
        });
      }

      if (ba.status !== "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete BA after it has been published",
        });
      }

      await db.update(bidAnalyses)
        .set({
          deletedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
          deletedBy: ctx.user.id,
        })
        .where(eq(bidAnalyses.id, id));

      return { success: true };
    }),

  /**
   * Update Tender Information (announcement details)
   */
  updateTenderInfo: scopedProcedure
    .input(z.object({
      id: z.number(),
      announcementStartDate: z.date(),
      announcementEndDate: z.date(),
      announcementChannel: z.enum(["website", "newspaper", "donor_portal", "other"]),
      announcementLink: z.string().optional(),
      announcementReference: z.string().optional(),
      numberOfBidders: z.number().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Verify BA exists and belongs to organization
      const [ba] = await db.select()
        .from(bidAnalyses)
        .where(and(
          eq(bidAnalyses.id, id),
          eq(bidAnalyses.organizationId, organizationId),
          isNull(bidAnalyses.deletedAt)
        ))
        .limit(1);

      if (!ba) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bid Analysis not found",
        });
      }

      // Update tender information
      await db.update(bidAnalyses)
        .set({
          announcementStartDate: formatSqlDate(data.announcementStartDate),
          announcementEndDate: formatSqlDate(data.announcementEndDate),
          announcementChannel: data.announcementChannel,
          announcementLink: data.announcementLink,
          announcementReference: data.announcementReference,
          numberOfBidders: data.numberOfBidders,
          updatedBy: ctx.user.id,
        })
        .where(eq(bidAnalyses.id, id));

      return { success: true };
    }),

  /**
   * Get bidders for a BA
   */
  getBidders: scopedProcedure
    .input(z.object({
      bidAnalysisId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const { bidAnalysisId } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Verify BA exists
      const [ba] = await db.select()
        .from(bidAnalyses)
        .where(and(
          eq(bidAnalyses.id, bidAnalysisId),
          eq(bidAnalyses.organizationId, organizationId),
          isNull(bidAnalyses.deletedAt)
        ))
        .limit(1);

      if (!ba) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bid Analysis not found",
        });
      }

      // Get bidders filtered by org/ou scope
      const bidders = await db.select()
        .from(bidAnalysisBidders)
        .where(and(
          eq(bidAnalysisBidders.bidAnalysisId, bidAnalysisId),
          eq(bidAnalysisBidders.organizationId, organizationId),
          eq(bidAnalysisBidders.operatingUnitId, ctx.scope.operatingUnitId)
        ))
        .orderBy(desc(bidAnalysisBidders.submissionDate));

      return bidders;
    }),

  /**
   * Add bidder to BA
   */
  //   addBidder: scopedProcedure
  //     .input(z.object({
  //       bidAnalysisId: z.number(),
  //       bidderName: z.string(),
  //       submissionDate: z.date(),
  //       status: z.enum(["received", "valid", "disqualified"]).default("received"),
  //       totalOfferCost: z.number().optional(),
  //       currency: z.string().default("USD"),
  //     }))
  //     .mutation(async ({ input, ctx }) => {
  //       const { bidAnalysisId, ...data } = input;
  //       const { organizationId } = ctx.scope;
  //       const db = await getDb();
  // 
  //       // Verify BA exists
  //       const [ba] = await db.select()
  //         .from(bidAnalyses)
  //         .where(and(
  //           eq(bidAnalyses.id, bidAnalysisId),
  //           eq(bidAnalyses.organizationId, organizationId),
  //           isNull(bidAnalyses.deletedAt)
  //         ))
  //         .limit(1);
  // 
  //       if (!ba) {
  //         throw new TRPCError({
  //           code: "NOT_FOUND",
  //           message: "Bid Analysis not found",
  //         });
  //       }
  // 
  //       // Add bidder
  //       const [result] = await db.insert(bidAnalysisBidders).values({
  //         bidAnalysisId,
  //         organizationId,
  //         bidderName: data.bidderName,
  //         submissionDate: data.submissionDate,
  //         submissionStatus: data.status,
  //         totalBidAmount: data.totalOfferCost?.toString(),
  //         currency: data.currency,
  //         createdAt: nowSql,
  //         updatedAt: nowSql,
  //       });
  // 
  //       const [createdBidder] = await db.select()
  //         .from(bidAnalysisBidders)
  //         .where(eq(bidAnalysisBidders.id, Number(result.insertId)))
  //         .limit(1);
  // 
  //       return createdBidder;
  //     }),
  // 
  // /**
  //  * Update bidder status
  //  */
  updateBidder: scopedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["received", "valid", "disqualified"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, status } = input;
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();

      // Verify scope context
      if (!organizationId || !operatingUnitId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Organization or Operating Unit context not found",
        });
      }

      // Verify bidder exists and belongs to the current scope
      const [bidder] = await db.select()
        .from(bidAnalysisBidders)
        .where(and(
          eq(bidAnalysisBidders.id, id),
          eq(bidAnalysisBidders.organizationId, organizationId),
          eq(bidAnalysisBidders.operatingUnitId, operatingUnitId)
        ))
        .limit(1);

      if (!bidder) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bidder not found or access denied",
        });
      }

      // Update status with proper scoping
      await db.update(bidAnalysisBidders)
        .set({
          submissionStatus: status,
          updatedAt: nowSql,
        })
        .where(and(
          eq(bidAnalysisBidders.id, id),
          eq(bidAnalysisBidders.organizationId, organizationId),
          eq(bidAnalysisBidders.operatingUnitId, operatingUnitId)
        ));

      return { success: true };
    }),

  /**
   * Delete bidder
   */
  deleteBidder: scopedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Verify bidder exists and belongs to current scope
      const [bidder] = await db.select()
        .from(bidAnalysisBidders)
        .where(and(
          eq(bidAnalysisBidders.id, id),
          eq(bidAnalysisBidders.organizationId, organizationId),
          eq(bidAnalysisBidders.operatingUnitId, ctx.scope.operatingUnitId)
        ))
        .limit(1);

      if (!bidder) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bidder not found",
        });
      }

      // Delete bidder with proper scoping
      await db.delete(bidAnalysisBidders)
        .where(and(
          eq(bidAnalysisBidders.id, id),
          eq(bidAnalysisBidders.organizationId, organizationId),
          eq(bidAnalysisBidders.operatingUnitId, ctx.scope.operatingUnitId)
        ));

      return { success: true };
    }),

  /**
   * Get evaluation criteria for BA
   */
  getCriteria: scopedProcedure
    .input(z.object({
      bidAnalysisId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const { bidAnalysisId } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Verify BA exists
      const [ba] = await db.select()
        .from(bidAnalyses)
        .where(and(
          eq(bidAnalyses.id, bidAnalysisId),
          eq(bidAnalyses.organizationId, organizationId),
          isNull(bidAnalyses.deletedAt)
        ))
        .limit(1);

      if (!ba) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bid Analysis not found",
        });
      }

      // Get criteria
      const criteria = await db.select()
        .from(bidEvaluationCriteria)
        .where(eq(bidEvaluationCriteria.bidAnalysisId, bidAnalysisId))
        .orderBy(bidEvaluationCriteria.sectionNumber, bidEvaluationCriteria.sortOrder);

      return criteria;
    }),

  /**
   * Get evaluation scores for BA
   */
  getScores: scopedProcedure
    .input(z.object({
      bidAnalysisId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const { bidAnalysisId } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Verify BA exists
      const [ba] = await db.select()
        .from(bidAnalyses)
        .where(and(
          eq(bidAnalyses.id, bidAnalysisId),
          eq(bidAnalyses.organizationId, organizationId),
          isNull(bidAnalyses.deletedAt)
        ))
        .limit(1);

      if (!ba) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bid Analysis not found",
        });
      }

      // Get scores
      const scores = await db.select()
        .from(bidEvaluationScores)
        .where(eq(bidEvaluationScores.bidAnalysisId, bidAnalysisId));

      return scores;
    }),

  /**
   * Initialize standard evaluation criteria (5 sections, 50 points total)
   */
  initializeCriteria: scopedProcedure
    .input(z.object({
      bidAnalysisId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { bidAnalysisId } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Verify BA exists
      const [ba] = await db.select()
        .from(bidAnalyses)
        .where(and(
          eq(bidAnalyses.id, bidAnalysisId),
          eq(bidAnalyses.organizationId, organizationId),
          isNull(bidAnalyses.deletedAt)
        ))
        .limit(1);

      if (!ba) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bid Analysis not found",
        });
      }

      // Use the same official criteria template as bidEvaluation.addDefaultCriteria
      const defaultCriteria = [
        // Section 1: Legal & Administrative (subtotal = 12)
        { sectionNumber: 1, sectionName: "Legal & Administrative", sectionNameAr: "القانونية والإدارية", criteriaType: "technical" as const, name: "Company Registration", nameAr: "تسجيل الشركة", requirementLabel: "Valid company registration", requirementLabelAr: "تسجيل شركة ساري", detailsText: "Submission of valid and current commercial registration document.", detailsTextAr: "تقديم وثيقة تسجيل تجاري سارية وحالية.", stage: "MUST be Submitted with the Bid", stageAr: "يجب تقديمه مع العطاء", maxScore: "2", weight: "1", sortOrder: 1, isMandatoryHardStop: 1 },
        { sectionNumber: 1, sectionName: "Legal & Administrative", sectionNameAr: "القانونية والإدارية", criteriaType: "technical" as const, name: "Tax Card", nameAr: "البطاقة الضريبية", requirementLabel: "Tax Card", requirementLabelAr: "البطاقة الضريبية", detailsText: "Submission of valid tax registration card.", detailsTextAr: "تقديم بطاقة ضريبية سارية.", stage: "MUST be Submitted with the Bid", stageAr: "يجب تقديمه مع العطاء", maxScore: "2", weight: "1", sortOrder: 2, isMandatoryHardStop: 1 },
        { sectionNumber: 1, sectionName: "Legal & Administrative", sectionNameAr: "القانونية والإدارية", criteriaType: "technical" as const, name: "Insurance Card", nameAr: "بطاقة التأمين", requirementLabel: "Insurance Card", requirementLabelAr: "بطاقة التأمين", detailsText: "Submission of valid insurance coverage documentation.", detailsTextAr: "تقديم وثائق تغطية تأمينية سارية.", stage: "MUST be Submitted with the Bid", stageAr: "يجب تقديمه مع العطاء", maxScore: "2", weight: "1", sortOrder: 3 },
        { sectionNumber: 1, sectionName: "Legal & Administrative", sectionNameAr: "القانونية والإدارية", criteriaType: "technical" as const, name: "Signed Declarations", nameAr: "الإقرارات الموقعة", requirementLabel: "Signed declarations", requirementLabelAr: "إقرارات موقعة", detailsText: "Submission of all required signed declarations regarding debarment, anti-corruption, and conflict of interest.", detailsTextAr: "تقديم جميع الإقرارات الموقعة المطلوبة بشأن الحرمان ومكافحة الفساد وتضارب المصالح.", stage: "MUST be Submitted with the Bid", stageAr: "يجب تقديمه مع العطاء", maxScore: "3", weight: "1", sortOrder: 4, isMandatoryHardStop: 1 },
        { sectionNumber: 1, sectionName: "Legal & Administrative", sectionNameAr: "القانونية والإدارية", criteriaType: "technical" as const, name: "Sanctions / Screening", nameAr: "الفحص / العقوبات", requirementLabel: "Sanctions screening", requirementLabelAr: "فحص العقوبات", detailsText: "Successful clearance from terrorism and sanctions screening checks.", detailsTextAr: "الحصول على تصريح ناجح من فحوصات الإرهاب والعقوبات.", stage: "MUST be Submitted with the Bid", stageAr: "يجب تقديمه مع العطاء", maxScore: "3", weight: "1", sortOrder: 5, isScreening: true, isMandatoryHardStop: 1 },

        // Section 2: Experience & Technical Capacity (subtotal = 10)
        { sectionNumber: 2, sectionName: "Experience & Technical Capacity", sectionNameAr: "الخبرة والقدرة الفنية", criteriaType: "technical" as const, name: "Company Profile", nameAr: "ملف الشركة", requirementLabel: "Company profile document", requirementLabelAr: "وثيقة ملف الشركة", detailsText: "Submission of a complete and up-to-date company profile and annual report.", detailsTextAr: "تقديم ملف شركة كامل ومحدث وتقرير سنوي.", stage: "MUST be Submitted with the Bid", stageAr: "يجب تقديمه مع العطاء", maxScore: "3", weight: "1", sortOrder: 1 },
        { sectionNumber: 2, sectionName: "Experience & Technical Capacity", sectionNameAr: "الخبرة والقدرة الفنية", criteriaType: "technical" as const, name: "Years of Experience", nameAr: "سنوات الخبرة", requirementLabel: "Years of Experience", requirementLabelAr: "سنوات الخبرة", detailsText: "More than 3 years of experience with documented proof (registration and contracts).", detailsTextAr: "أكثر من 3 سنوات خبرة مع إثبات موثق (تسجيل وعقود).", stage: "MUST be Submitted with the Bid", stageAr: "يجب تقديمه مع العطاء", maxScore: "4", weight: "1", sortOrder: 2, isMandatoryHardStop: 1 },
        { sectionNumber: 2, sectionName: "Experience & Technical Capacity", sectionNameAr: "الخبرة والقدرة الفنية", criteriaType: "technical" as const, name: "INGO Experience", nameAr: "خبرة المنظمات الدولية", requirementLabel: "I/NGO experience", requirementLabelAr: "خبرة المنظمات الدولية", detailsText: "Verifiable experience with at least two I/NGOs on similar projects.", detailsTextAr: "خبرة يمكن التحقق منها مع منظمتين دوليتين/غير حكوميتين على الأقل في مشاريع مماثلة.", stage: "MUST be Submitted with the Bid", stageAr: "يجب تقديمه مع العطاء", maxScore: "3", weight: "1", sortOrder: 3 },

        // Section 3: Operational & Financial Capacity (subtotal = 20)
        { sectionNumber: 3, sectionName: "Operational & Financial Capacity", sectionNameAr: "القدرة التشغيلية والمالية", criteriaType: "technical" as const, name: "Target Geography Presence", nameAr: "التواجد في المنطقة المستهدفة", requirementLabel: "Target geography presence", requirementLabelAr: "التواجد الجغرافي", detailsText: "Registered and operational office with verifiable proof of presence in the target area.", detailsTextAr: "مكتب مسجل وعامل مع إثبات يمكن التحقق منه للتواجد في المنطقة المستهدفة.", stage: "MUST be Submitted with the Bid", stageAr: "يجب تقديمه مع العطاء", maxScore: "1", weight: "1", sortOrder: 1 },
        { sectionNumber: 3, sectionName: "Operational & Financial Capacity", sectionNameAr: "القدرة التشغيلية والمالية", criteriaType: "technical" as const, name: "Work & Safety Plan", nameAr: "خطة العمل والسلامة", requirementLabel: "Work & Safety Plan", requirementLabelAr: "خطة العمل والسلامة", detailsText: "For Activity include building, construction, infrastructure maintenance, rehabilitation.", detailsTextAr: "للأنشطة التي تشمل البناء والتشييد وصيانة البنية التحتية وإعادة التأهيل.", stage: "MUST be Submitted with the Bid", stageAr: "يجب تقديمه مع العطاء", maxScore: "5", weight: "1", sortOrder: 2 },
        { sectionNumber: 3, sectionName: "Operational & Financial Capacity", sectionNameAr: "القدرة التشغيلية والمالية", criteriaType: "technical" as const, name: "Delivery Time", nameAr: "وقت التسليم", requirementLabel: "Delivery Time", requirementLabelAr: "وقت التسليم", detailsText: "Proposing a delivery time of 15 days or less from the purchase order date.", detailsTextAr: "اقتراح وقت تسليم 15 يومًا أو أقل من تاريخ أمر الشراء.", stage: "MUST be Submitted with the Bid", stageAr: "يجب تقديمه مع العطاء", maxScore: "2", weight: "1", sortOrder: 3 },
        { sectionNumber: 3, sectionName: "Operational & Financial Capacity", sectionNameAr: "القدرة التشغيلية والمالية", criteriaType: "technical" as const, name: "Validity of Offer", nameAr: "صلاحية العرض", requirementLabel: "Validity of Offer", requirementLabelAr: "صلاحية العرض", detailsText: "Offer is valid for at least 90 days.", detailsTextAr: "العرض صالح لمدة 90 يومًا على الأقل.", stage: "MUST be Submitted with the Bid", stageAr: "يجب تقديمه مع العطاء", maxScore: "2", weight: "1", sortOrder: 4 },
        { sectionNumber: 3, sectionName: "Operational & Financial Capacity", sectionNameAr: "القدرة التشغيلية والمالية", criteriaType: "technical" as const, name: "Replacement Period", nameAr: "فترة الاستبدال", requirementLabel: "Replacement Period", requirementLabelAr: "فترة الاستبدال", detailsText: "Supplier commits to replacing rejected items within 7 days at their own cost.", detailsTextAr: "يلتزم المورد باستبدال العناصر المرفوضة خلال 7 أيام على نفقته.", stage: "MUST be Submitted with the Bid", stageAr: "يجب تقديمه مع العطاء", maxScore: "2", weight: "1", sortOrder: 5 },
        { sectionNumber: 3, sectionName: "Operational & Financial Capacity", sectionNameAr: "القدرة التشغيلية والمالية", criteriaType: "technical" as const, name: "Payment Terms A", nameAr: "شروط الدفع أ", requirementLabel: "Payment Terms", requirementLabelAr: "شروط الدفع", detailsText: "0% upfront, 100% after delivery", detailsTextAr: "0% مقدمًا، 100% بعد التسليم", stage: "MUST be Submitted with the Bid", stageAr: "يجب تقديمه مع العطاء", maxScore: "3", weight: "1", sortOrder: 6, optionGroup: "payment_terms" },
        { sectionNumber: 3, sectionName: "Operational & Financial Capacity", sectionNameAr: "القدرة التشغيلية والمالية", criteriaType: "technical" as const, name: "Payment Terms B", nameAr: "شروط الدفع ب", requirementLabel: "Payment Terms", requirementLabelAr: "شروط الدفع", detailsText: "30% upfront, 70% after delivery", detailsTextAr: "30% مقدمًا، 70% بعد التسليم", stage: "MUST be Submitted with the Bid", stageAr: "يجب تقديمه مع العطاء", maxScore: "2", weight: "1", sortOrder: 7, optionGroup: "payment_terms" },
        { sectionNumber: 3, sectionName: "Operational & Financial Capacity", sectionNameAr: "القدرة التشغيلية والمالية", criteriaType: "technical" as const, name: "Payment Terms C", nameAr: "شروط الدفع ج", requirementLabel: "Payment Terms", requirementLabelAr: "شروط الدفع", detailsText: "50% upfront, 50% after delivery", detailsTextAr: "50% مقدمًا، 50% بعد التسليم", stage: "MUST be Submitted with the Bid", stageAr: "يجب تقديمه مع العطاء", maxScore: "1", weight: "1", sortOrder: 8, optionGroup: "payment_terms" },
        { sectionNumber: 3, sectionName: "Operational & Financial Capacity", sectionNameAr: "القدرة التشغيلية والمالية", criteriaType: "technical" as const, name: "Bank Guarantee", nameAr: "الضمان البنكي", requirementLabel: "Bank Guarantee", requirementLabelAr: "ضمان بنكي", detailsText: "Submission of an original and verifiable bank guarantee.", detailsTextAr: "تقديم ضمان بنكي أصلي وقابل للتحقق.", stage: "Mandatory before contract signature", stageAr: "إلزامي قبل توقيع العقد", maxScore: "1", weight: "1", sortOrder: 9, isMandatoryHardStop: 1 },
        { sectionNumber: 3, sectionName: "Operational & Financial Capacity", sectionNameAr: "القدرة التشغيلية والمالية", criteriaType: "technical" as const, name: "Bank Account Details", nameAr: "تفاصيل الحساب البنكي", requirementLabel: "Bank account details", requirementLabelAr: "تفاصيل الحساب البنكي", detailsText: "Submission of complete and verified bank account details.", detailsTextAr: "تقديم تفاصيل حساب بنكي كاملة ومتحقق منها.", stage: "Verification process, mandatory before award", stageAr: "عملية التحقق، إلزامية قبل الترسية", maxScore: "1", weight: "1", sortOrder: 10 },

        // Section 4: Samples (if relevant) (subtotal = 5, conditional)
        { sectionNumber: 4, sectionName: "Samples (if relevant)", sectionNameAr: "العينات (إن وجدت)", criteriaType: "technical" as const, name: "Samples", nameAr: "العينات", requirementLabel: "Samples", requirementLabelAr: "العينات", detailsText: "Verification process, mandatory before award.", detailsTextAr: "عملية التحقق، إلزامية قبل الترسية.", stage: "Verification process, mandatory before award", stageAr: "عملية التحقق، إلزامية قبل الترسية", maxScore: "5", weight: "1", sortOrder: 1, isConditional: 1 },

        // Section 5: References (subtotal = 6)
        { sectionNumber: 5, sectionName: "References", sectionNameAr: "المراجع", criteriaType: "technical" as const, name: "References", nameAr: "المراجع", requirementLabel: "References", requirementLabelAr: "المراجع", detailsText: "Contact details / letters, ideally from UN/INGOs or local NGOs.", detailsTextAr: "تفاصيل الاتصال / خطابات، يفضل من المنظمات الدولية أو المحلية.", stage: "MUST be Submitted with the Bid", stageAr: "يجب تقديمه مع العطاء", maxScore: "6", weight: "1", sortOrder: 1, isMandatoryHardStop: 1 },

        // Section 6: Total Offer Price (Financial) (subtotal = 50)
        { sectionNumber: 6, sectionName: "Total Offer Price", sectionNameAr: "إجمالي سعر العرض", criteriaType: "financial" as const, name: "Total Offer Price", nameAr: "إجمالي سعر العرض", requirementLabel: "Total bidder offer", requirementLabelAr: "إجمالي عرض مقدم العطاء", detailsText: "Financial Score (auto calculated)", detailsTextAr: "الدرجة المالية (محسوبة تلقائيًا)", stage: "Financial Evaluation", stageAr: "التقييم المالي", maxScore: "50", weight: "1", sortOrder: 1, isMandatoryHardStop: 1 },
      ];

      for (const c of defaultCriteria) {
        await db.insert(bidEvaluationCriteria).values({
          bidAnalysisId,
          ...c,
          isDeleted: false,
        });
      }

      return { success: true };
    }),

  /**
   * Update evaluation score
   */
  updateScore: scopedProcedure
    .input(z.object({
      bidAnalysisId: z.number(),
      criterionId: z.number(),
      bidderId: z.number(),
      score: z.number(),
      status: z.enum(["scored", "none", "na", "not_yet_completed"]).default("scored"),
    }))
    .mutation(async ({ input, ctx }) => {
      const { bidAnalysisId, criterionId, bidderId, score, status } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Verify BA exists
      const [ba] = await db.select()
        .from(bidAnalyses)
        .where(and(
          eq(bidAnalyses.id, bidAnalysisId),
          eq(bidAnalyses.organizationId, organizationId),
          isNull(bidAnalyses.deletedAt)
        ))
        .limit(1);

      if (!ba) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bid Analysis not found",
        });
      }

      // Check if score already exists
      const [existingScore] = await db.select()
        .from(bidEvaluationScores)
        .where(and(
          eq(bidEvaluationScores.bidAnalysisId, bidAnalysisId),
          eq(bidEvaluationScores.criterionId, criterionId),
          eq(bidEvaluationScores.bidderId, bidderId)
        ))
        .limit(1);

      if (existingScore) {
        // Update existing score
        await db.update(bidEvaluationScores)
          .set({
            score: score.toString(),
            status,
            updatedAt: nowSql,
          })
          .where(eq(bidEvaluationScores.id, existingScore.id));
      } else {
        // Insert new score
        await db.insert(bidEvaluationScores).values({
          bidAnalysisId,
          criterionId,
          bidderId,
          score: score.toString(),
          status,
        isDeleted: 0,  // Dual-column synchronization
        });
      }

      return { success: true };
    }),

  /**
   * Bulk sync vendor qualification scores into BEC evaluation matrix
   * Maps vendor qualification fields → BEC criteria rows (only fills 0-score rows)
   */
  bulkSyncQualificationScores: scopedProcedure
    .input(z.object({ bidAnalysisId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const { bidAnalysisId } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Verify BA exists
      const [ba] = await db.select()
        .from(bidAnalyses)
        .where(and(
          eq(bidAnalyses.id, bidAnalysisId),
          eq(bidAnalyses.organizationId, organizationId),
          isNull(bidAnalyses.deletedAt)
        ))
        .limit(1);
      if (!ba) throw new TRPCError({ code: 'NOT_FOUND', message: 'Bid Analysis not found' });

      // Get all bidders with their supplierId
      const bidders = await db.select()
        .from(bidAnalysisBidders)
        .where(eq(bidAnalysisBidders.bidAnalysisId, bidAnalysisId));

      // Get all criteria for this BA
      const criteria = await db.select()
        .from(bidEvaluationCriteria)
        .where(eq(bidEvaluationCriteria.bidAnalysisId, bidAnalysisId));

      // Get existing scores
      const existingScores = await db.select()
        .from(bidEvaluationScores)
        .where(eq(bidEvaluationScores.bidAnalysisId, bidAnalysisId));

      // Build existing score lookup: "criterionId-bidderId" -> score value
      const existingScoreMap = new Map<string, number>();
      for (const s of existingScores) {
        existingScoreMap.set(`${s.criterionId}-${s.bidderId}`, parseFloat(s.score || '0'));
      }

      // Mapping: BEC criterion name → vendorQualificationScores field
      const CRITERIA_TO_QUAL_FIELD: Record<string, string> = {
        'Company Registration': 's1_companyRegistration',
        'Tax Card': 's1_taxCard',
        'Insurance Card': 's1_insuranceCard',
        'Signed Declarations': 's1_signedDeclarations',
        'Sanctions / Screening': 's1_sanctionsScreening',
        'Company Profile': 's2_companyProfile',
        'Years of Experience': 's2_yearsExperience',
        'INGO Experience': 's2_ingoExperience',
        'Target Geography Presence': 's3_targetGeography',
        'Bank Account Details': 's3_bankAccountDetails',
        'References': 's4_references',
      };

      // Get vendor IDs from bidders
      const vendorIds = bidders
        .filter(b => b.supplierId)
        .map(b => b.supplierId as number);

      if (vendorIds.length === 0) return { synced: 0 };

      // Fetch qualification scores for all vendors
      const qualScores = await db.select()
        .from(vendorQualificationScores)
        .where(and(
          eq(vendorQualificationScores.organizationId, organizationId),
          eq(vendorQualificationScores.isDeleted, 0),
          sql`${vendorQualificationScores.vendorId} IN (${sql.join(vendorIds.map(id => sql`${id}`), sql`, `)})`
        ));

      // Build latest qualification map: vendorId -> qual record
      const qualMap = new Map<number, typeof qualScores[0]>();
      for (const q of qualScores) {
        const existing = qualMap.get(q.vendorId);
        if (!existing || q.version > existing.version) {
          qualMap.set(q.vendorId, q);
        }
      }

      let synced = 0;
      const upserts: Array<{ criterionId: number; bidderId: number; score: string }> = [];

      for (const bidder of bidders) {
        if (!bidder.supplierId) continue;
        const qual = qualMap.get(bidder.supplierId);
        if (!qual) continue;

        for (const criterion of criteria) {
          const qualField = CRITERIA_TO_QUAL_FIELD[criterion.name];
          if (!qualField) continue;

          const scoreKey = `${criterion.id}-${bidder.id}`;
          const existingScore = existingScoreMap.get(scoreKey) ?? 0;

          // Only auto-fill if no score has been entered yet (score = 0)
          if (existingScore === 0) {
            const qualScore = parseFloat((qual as any)[qualField] || '0');
            if (qualScore > 0) {
              upserts.push({
                criterionId: criterion.id,
                bidderId: bidder.id,
                score: qualScore.toString(),
              });
            }
          }
        }
      }

      // Upsert all scores
      for (const u of upserts) {
        const existingRow = existingScores.find(
          s => s.criterionId === u.criterionId && s.bidderId === u.bidderId
        );
        if (existingRow) {
          await db.update(bidEvaluationScores)
            .set({ score: u.score, status: 'scored', updatedAt: nowSql })
            .where(eq(bidEvaluationScores.id, existingRow.id));
        } else {
          await db.insert(bidEvaluationScores).values({
            bidAnalysisId,
            criterionId: u.criterionId,
            bidderId: u.bidderId,
            score: u.score,
            status: 'scored',
            isDeleted: 0,
          });
        }
        synced++;
      }

      return { synced };
    }),

  /**
   * Update CBA (Competitive Bid Analysis) with justification and selected winner
   */
  updateCBA: scopedProcedure
    .input(z.object({
      id: z.number(),
      justification: z.string().optional(),
      selectedWinnerId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, justification, selectedWinnerId } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Verify BA exists
      const [ba] = await db.select()
        .from(bidAnalyses)
        .where(and(
          eq(bidAnalyses.id, id),
          eq(bidAnalyses.organizationId, organizationId),
          isNull(bidAnalyses.deletedAt)
        ))
        .limit(1);

      if (!ba) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bid Analysis not found",
        });
      }

      // Update BA
      await db.update(bidAnalyses)
        .set({
          selectionJustification: justification,
          selectedBidderId: selectedWinnerId,
          updatedAt: nowSql,
        })
        .where(eq(bidAnalyses.id, id));

      return { success: true };
    }),

  /**
   * Save Bid Opening Minutes (BOM)
   */
  saveBOM: scopedProcedure
    .input(z.object({
      bidAnalysisId: z.number(),
      meetingDate: z.string(),
      meetingTime: z.string(),
      location: z.string(),
      attendees: z.array(z.object({
        name: z.string(),
        title: z.string(),
        organization: z.string().optional(),
      })),
      notes: z.string().optional(),
      signatures: z.array(z.object({
        name: z.string(),
        title: z.string(),
        date: z.string().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const { bidAnalysisId, meetingDate, meetingTime, location, attendees, notes, signatures } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Verify BA exists
      const [ba] = await db.select()
        .from(bidAnalyses)
        .where(and(
          eq(bidAnalyses.id, bidAnalysisId),
          eq(bidAnalyses.organizationId, organizationId),
          isNull(bidAnalyses.deletedAt)
        ))
        .limit(1);

      if (!ba) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bid Analysis not found",
        });
      }

      // Update BA with BOM data
      await db.update(bidAnalyses)
        .set({
          bomMeetingDate: meetingDate,
          bomMeetingTime: meetingTime,
          bomLocation: location,
          bomAttendees: JSON.stringify(attendees),
          bomNotes: notes,
          bomSignatures: JSON.stringify(signatures),
          bomCompleted: 1,
          updatedAt: nowSql,
        })
        .where(eq(bidAnalyses.id, bidAnalysisId));

      return { success: true };
    }),

  /**
   * Lock scoring — set scoringLockedAt timestamp to prevent further edits
   */
  lockScoring: scopedProcedure
    .input(z.object({ bidAnalysisId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const { bidAnalysisId } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await db.update(bidAnalyses)
        .set({ scoringLockedAt: now, scoringLockedBy: ctx.user.id, updatedAt: now })
        .where(and(
          eq(bidAnalyses.id, bidAnalysisId),
          eq(bidAnalyses.organizationId, organizationId),
          isNull(bidAnalyses.deletedAt)
        ));
      return { success: true, lockedAt: now };
    }),

  /**
   * Unlock scoring — clear scoringLockedAt to allow edits again
   */
  unlockScoring: scopedProcedure
    .input(z.object({ bidAnalysisId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const { bidAnalysisId } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();
      await db.update(bidAnalyses)
        .set({ scoringLockedAt: null, scoringLockedBy: null, updatedAt: nowSql })
        .where(and(
          eq(bidAnalyses.id, bidAnalysisId),
          eq(bidAnalyses.organizationId, organizationId),
          isNull(bidAnalyses.deletedAt)
        ));
      return { success: true };
    }),

  /**
   * Get CBA approval signatures
   */
  getCBASignatures: scopedProcedure
    .input(z.object({ bidAnalysisId: z.number() }))
    .query(async ({ input, ctx }) => {
      const { bidAnalysisId } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();
      const sigs = await db.select()
        .from(cbaApprovalSignatures)
        .where(and(
          eq(cbaApprovalSignatures.bidAnalysisId, bidAnalysisId),
          eq(cbaApprovalSignatures.organizationId, organizationId)
        ))
        .orderBy(cbaApprovalSignatures.sortOrder);
      return sigs;
    }),

  /**
   * Save CBA approval signatures (upsert all members)
   */
  saveCBASignatures: scopedProcedure
    .input(z.object({
      bidAnalysisId: z.number(),
      members: z.array(z.object({
        id: z.number().optional(),
        sortOrder: z.number(),
        role: z.string().optional(),
        roleAr: z.string().optional(),
        memberName: z.string().optional(),
        signatureDataUrl: z.string().optional(),
        signedAt: z.string().optional(),
        verificationCode: z.string().optional(),
        qrCodeDataUrl: z.string().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const { bidAnalysisId, members } = input;
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();

      // Verify BA exists
      const [ba] = await db.select()
        .from(bidAnalyses)
        .where(and(
          eq(bidAnalyses.id, bidAnalysisId),
          eq(bidAnalyses.organizationId, organizationId),
          isNull(bidAnalyses.deletedAt)
        ))
        .limit(1);

      if (!ba) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bid Analysis not found",
        });
      }

      // Delete existing signatures for this BA
      await db.delete(cbaApprovalSignatures)
        .where(and(
          eq(cbaApprovalSignatures.bidAnalysisId, bidAnalysisId),
          eq(cbaApprovalSignatures.organizationId, organizationId)
        ));

      // Insert new signatures
      if (members.length > 0) {
        await db.insert(cbaApprovalSignatures).values(
          members.map((m) => ({
            bidAnalysisId,
            organizationId,
            operatingUnitId: operatingUnitId || null,
            sortOrder: m.sortOrder,
            role: m.role || null,
            roleAr: m.roleAr || null,
            memberName: m.memberName || null,
            signatureDataUrl: m.signatureDataUrl || null,
            signedAt: m.signedAt || null,
            signedByUserId: ctx.user?.id || null,
            verificationCode: m.verificationCode || null,
            qrCodeDataUrl: m.qrCodeDataUrl || null,
          }))
        );
      }

      return { success: true };
    }),

  /**
   * Finalize CBA - locks the CBA and sets BA status to 'awarded'
   * Prerequisites: a winner must be selected and at least one signature must be saved
   */
  finalizeCba: scopedProcedure
    .input(z.object({
      bidAnalysisId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { bidAnalysisId } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Verify BA exists and belongs to organization
      const [ba] = await db.select()
        .from(bidAnalyses)
        .where(and(
          eq(bidAnalyses.id, bidAnalysisId),
          eq(bidAnalyses.organizationId, organizationId),
          isNull(bidAnalyses.deletedAt)
        ))
        .limit(1);

      if (!ba) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bid Analysis not found",
        });
      }

      // Guard: already finalized
      if ((ba as any).cbaFinalizedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "CBA has already been finalized",
        });
      }

      // Guard: a winner must be selected
      if (!ba.selectedBidderId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A winning bidder must be selected before finalizing the CBA",
        });
      }

      // Guard: at least one signature must exist
      const sigs = await db.select()
        .from(cbaApprovalSignatures)
        .where(and(
          eq(cbaApprovalSignatures.bidAnalysisId, bidAnalysisId),
          eq(cbaApprovalSignatures.organizationId, organizationId)
        ))
        .limit(1);

      if (sigs.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "At least one committee member signature is required before finalizing",
        });
      }

      const now = new Date();
      const nowStr = now.toISOString().slice(0, 19).replace('T', ' ');

      // Set BA status to 'awarded' and record finalization
      await db.update(bidAnalyses)
        .set({
          status: "awarded",
          cbaFinalizedAt: nowStr,
          cbaFinalizedBy: ctx.user.id,
          approvedBy: ctx.user.id,
          approvedAt: nowSql,
          updatedAt: nowSql,
          updatedBy: ctx.user.id,
        })
        .where(eq(bidAnalyses.id, bidAnalysisId));

      // ── Auto-create draft Contract for Services PRs (Contract → SAC → Invoice → Payment) ──
      let autoCreatedContractId: number | null = null;
      if (ba.purchaseRequestId) {
        const [pr] = await db.select()
          .from(purchaseRequests)
          .where(eq(purchaseRequests.id, ba.purchaseRequestId))
          .limit(1);

        if (pr && pr.category === 'services') {
          // Get the winning bidder's data (totalBidAmount, currency)
          // ba.selectedBidderId stores the bidder ROW ID (bid_analysis_bidders.id), not the supplierId
          const [winnerBidder] = await db.select()
            .from(bidAnalysisBidders)
            .where(and(
              eq(bidAnalysisBidders.bidAnalysisId, bidAnalysisId),
              eq(bidAnalysisBidders.id, ba.selectedBidderId!)
            ))
            .limit(1);

          const contractValue = winnerBidder?.totalBidAmount || pr.total || '0';
          const currency = winnerBidder?.currency || pr.currency || 'USD';
          // Use the actual supplier/vendor ID from the winning bidder row
          const winnerVendorId = winnerBidder?.supplierId || ba.selectedBidderId!;

          // Generate contract number: CON-{CBA#}-001
          const contractNumber = `CON-${ba.cbaNumber}-001`;

          // Check if contract already exists for this PR
          const [existingContract] = await db.select({ id: contracts.id })
            .from(contracts)
            .where(and(
              eq(contracts.purchaseRequestId, pr.id),
              eq(contracts.organizationId, organizationId),
              sql`${contracts.isDeleted} = 0`
            ))
            .limit(1);

          if (!existingContract) {
            // Create draft contract
            const sixMonthsFromNow = new Date(now);
            sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

            const [contractResult] = await db.insert(contracts).values({
              organizationId,
              operatingUnitId: ba.operatingUnitId || null,
              purchaseRequestId: pr.id,
              vendorId: winnerVendorId,
              contractNumber,
              contractValue: contractValue,
              currency,
              paymentStructure: 'lump_sum',
              startDate: nowStr,
              endDate: sixMonthsFromNow.toISOString().slice(0, 19).replace('T', ' '),
              status: 'draft',
              createdBy: ctx.user.id,
              updatedBy: ctx.user.id,
            }).$returningId();

            autoCreatedContractId = contractResult.id;
            console.log(`[CBA Finalize] Auto-created draft Contract #${contractNumber} (ID: ${autoCreatedContractId}) for services PR #${pr.prNumber}`);
          }
        }
      }

      return { success: true, finalizedAt: nowStr, autoCreatedContractId };
    }),

  /**
   * Generate CBA PDF - server-side PDF generation with RTL support
   */
  generateCBAPdf: scopedProcedure
    .input(z.object({
      bidAnalysisId: z.number(),
      language: z.enum(["en", "ar"]).default("en"),
      htmlContent: z.string(),
    }))
    .mutation(async ({ input }) => {
      return {
        success: true,
        html: input.htmlContent,
      };
    }),

  // ═══════════════════════════════════════════════════════════════════
  // Digital Signature for Bid Receipt Acknowledgement
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Save digital signature for logistics responsible on a bid receipt acknowledgement
   */
  saveAcknowledgementSignature: scopedProcedure
    .input(z.object({
      bidAnalysisId: z.number(),
      bidderId: z.number(),
      signerName: z.string().min(1),
      signerTitle: z.string().optional(),
      signatureDataUrl: z.string().min(1), // Base64 data URL from canvas
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      // Verify BA exists and belongs to this org
      const [ba] = await db.select()
        .from(bidAnalyses)
        .where(and(
          eq(bidAnalyses.id, input.bidAnalysisId),
          eq(bidAnalyses.organizationId, organizationId)
        ))
        .limit(1);

      if (!ba) throw new TRPCError({ code: "NOT_FOUND", message: "Bid Analysis not found" });

      // Verify bidder exists
      const [bidder] = await db.select()
        .from(bidAnalysisBidders)
        .where(and(
          eq(bidAnalysisBidders.id, input.bidderId),
          eq(bidAnalysisBidders.bidAnalysisId, input.bidAnalysisId)
        ))
        .limit(1);

      if (!bidder) throw new TRPCError({ code: "NOT_FOUND", message: "Bidder not found" });

      // Convert data URL to buffer and upload to S3
      const base64Data = input.signatureDataUrl.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const fileKey = `signatures/ack-${input.bidAnalysisId}-${input.bidderId}-${nanoid(8)}.png`;
      const { url: signatureImageUrl } = await storagePut(fileKey, buffer, "image/png");

      // Generate verification code
      const verificationCode = `ACK-${input.bidAnalysisId}-${input.bidderId}-${nanoid(12)}`;

      // Check if signature already exists (update) or create new
      const [existing] = await db.select()
        .from(bidderAcknowledgementSignatures)
        .where(and(
          eq(bidderAcknowledgementSignatures.bidAnalysisId, input.bidAnalysisId),
          eq(bidderAcknowledgementSignatures.bidderId, input.bidderId)
        ))
        .limit(1);

      if (existing) {
        await db.update(bidderAcknowledgementSignatures)
          .set({
            signerName: input.signerName,
            signerTitle: input.signerTitle || null,
            signatureImageUrl,
            signatureDataUrl: input.signatureDataUrl,
            signedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
            signedByUserId: ctx.user.id,
            verificationCode,
          })
          .where(eq(bidderAcknowledgementSignatures.id, existing.id));
      } else {
        await db.insert(bidderAcknowledgementSignatures).values({
          bidAnalysisId: input.bidAnalysisId,
          bidderId: input.bidderId,
          organizationId,
          operatingUnitId,
          signerName: input.signerName,
          signerTitle: input.signerTitle || null,
          signatureImageUrl,
          signatureDataUrl: input.signatureDataUrl,
          signedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
          signedByUserId: ctx.user.id,
          verificationCode,
        });
      }

      return { success: true, verificationCode, signatureImageUrl };
    }),

  /**
   * Get existing signature for a bid receipt acknowledgement
   */
  getAcknowledgementSignature: scopedProcedure
    .input(z.object({
      bidAnalysisId: z.number(),
      bidderId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;

      const [sig] = await db.select()
        .from(bidderAcknowledgementSignatures)
        .where(and(
          eq(bidderAcknowledgementSignatures.bidAnalysisId, input.bidAnalysisId),
          eq(bidderAcknowledgementSignatures.bidderId, input.bidderId),
          eq(bidderAcknowledgementSignatures.organizationId, organizationId)
        ))
        .limit(1);

      return sig || null;
    }),

  /**
   * Verify a signature by verification code (public endpoint concept)
   */
  /**
   * Get signature statuses for all bidders in a bid analysis (for showing checkmarks)
   */
  getBidderSignatureStatuses: scopedProcedure
    .input(z.object({
      bidAnalysisId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;

      const sigs = await db.select({
        bidderId: bidderAcknowledgementSignatures.bidderId,
        signerName: bidderAcknowledgementSignatures.signerName,
        signedAt: bidderAcknowledgementSignatures.signedAt,
        verificationCode: bidderAcknowledgementSignatures.verificationCode,
      })
        .from(bidderAcknowledgementSignatures)
        .where(and(
          eq(bidderAcknowledgementSignatures.bidAnalysisId, input.bidAnalysisId),
          eq(bidderAcknowledgementSignatures.organizationId, organizationId)
        ));

      // Return a map of bidderId -> signature info
      const statusMap: Record<number, { signerName: string; verificationCode: string }> = {};
      for (const sig of sigs) {
        statusMap[sig.bidderId] = {
          signerName: sig.signerName,
          signedAt: nowSql,
          verificationCode: sig.verificationCode,
        };
      }
      return statusMap;
    }),

  /**
   * Get supplier quotation totals per bidder for a PR
   * Returns a map of bidAnalysisBidderId -> { totalAmount, quotationRef, quotationDate, lineCount }
   * Used by the CBA tab to show quotation-sourced prices
   */
  getQuotationTotals: scopedProcedure
    .input(z.object({
      purchaseRequestId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const { purchaseRequestId } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Get all non-deleted supplier quotation headers for this PR
      const headers = await db.select()
        .from(supplierQuotationHeaders)
        .where(and(
          eq(supplierQuotationHeaders.purchaseRequestId, purchaseRequestId),
          eq(supplierQuotationHeaders.organizationId, organizationId),
          isNull(supplierQuotationHeaders.deletedAt)
        ));

      // Build a map of bidAnalysisBidderId -> quotation data
      const quotationMap: Record<number, {
        totalAmount: string;
        quotationReference: string | null;
        quotationDate: string | null;
        lineCount: number;
        quotationHeaderId: number;
        status: string | null;
      }> = {};

      for (const header of headers) {
        if (!header.bidAnalysisBidderId) continue;

        // Count lines
        const [lineCountResult] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(supplierQuotationLines)
          .where(eq(supplierQuotationLines.quotationHeaderId, header.id));

        quotationMap[header.bidAnalysisBidderId] = {
          totalAmount: header.totalAmount || "0",
          quotationReference: header.quotationReference,
          quotationDate: header.quotationDate,
          lineCount: lineCountResult?.count || 0,
          quotationHeaderId: header.id,
          status: header.status,
        };
      }

      return quotationMap;
    }),

  /**
   * Get line-item level quotation comparison across all bidders for a PR
   * Returns a matrix: prLineItemId -> { itemDescription, unit, quantity, bidders: { bidderId -> { unitPrice, lineTotal } } }
   * Used by the CBA tab to show per-line-item price breakdown
   */
  getQuotationLineComparison: scopedProcedure
    .input(z.object({
      purchaseRequestId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const { purchaseRequestId } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Get all non-deleted supplier quotation headers for this PR
      const headers = await db.select()
        .from(supplierQuotationHeaders)
        .where(and(
          eq(supplierQuotationHeaders.purchaseRequestId, purchaseRequestId),
          eq(supplierQuotationHeaders.organizationId, organizationId),
          isNull(supplierQuotationHeaders.deletedAt)
        ));

      // Get all quotation lines for these headers
      const headerIds = headers.map(h => h.id);
      if (headerIds.length === 0) return { lineItems: [], bidderMap: {} };

      const allLines = await db.select()
        .from(supplierQuotationLines)
        .where(sql`${supplierQuotationLines.quotationHeaderId} IN (${sql.join(headerIds.map(id => sql`${id}`), sql`, `)})`);

      // Build bidder map: headerId -> bidderId
      const headerToBidder: Record<number, number> = {};
      for (const h of headers) {
        if (h.bidAnalysisBidderId) {
          headerToBidder[h.id] = h.bidAnalysisBidderId;
        }
      }

      // Build the comparison matrix
      // Group by prLineItemId
      const lineItemMap: Record<number, {
        prLineItemId: number;
        itemDescription: string;
        unit: string;
        quantity: string;
        bidders: Record<number, { unitPrice: string; lineTotal: string }>;
      }> = {};

      for (const line of allLines) {
        const bidderId = headerToBidder[line.quotationHeaderId];
        if (!bidderId) continue;

        if (!lineItemMap[line.prLineItemId]) {
          lineItemMap[line.prLineItemId] = {
            prLineItemId: line.prLineItemId,
            itemDescription: line.itemDescriptionSnapshot,
            unit: line.unit || "Piece",
            quantity: line.quantity,
            bidders: {},
          };
        }

        lineItemMap[line.prLineItemId].bidders[bidderId] = {
          unitPrice: line.unitPrice || "0",
          lineTotal: line.lineTotal || "0",
        };
      }

      // Build bidder name map
      const bidderIds = [...new Set(Object.values(headerToBidder))];
      const bidderMap: Record<number, string> = {};
      if (bidderIds.length > 0) {
        const bidders = await db.select({
          id: bidAnalysisBidders.id,
          bidderName: bidAnalysisBidders.bidderName,
        })
          .from(bidAnalysisBidders)
          .where(sql`${bidAnalysisBidders.id} IN (${sql.join(bidderIds.map(id => sql`${id}`), sql`, `)})`);
        for (const b of bidders) {
          bidderMap[b.id] = b.bidderName;
        }
      }

      return {
        lineItems: Object.values(lineItemMap),
        bidderMap,
      };
    }),

  /**
   * Sync bidder totalBidAmount from supplier quotation totals
   * Reads supplier_quotation_headers.totalAmount for each bidder and updates
   * bid_analysis_bidders.totalBidAmount accordingly
   */
  syncFromQuotations: scopedProcedure
    .input(z.object({
      bidAnalysisId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { bidAnalysisId } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Verify BA exists
      const [ba] = await db.select()
        .from(bidAnalyses)
        .where(and(
          eq(bidAnalyses.id, bidAnalysisId),
          eq(bidAnalyses.organizationId, organizationId),
          isNull(bidAnalyses.deletedAt)
        ))
        .limit(1);

      if (!ba) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bid Analysis not found",
        });
      }

      if (ba.status === "awarded") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot sync quotations: BA is already awarded",
        });
      }

      // Get all bidders for this BA
      const bidders = await db.select()
        .from(bidAnalysisBidders)
        .where(eq(bidAnalysisBidders.bidAnalysisId, bidAnalysisId));

      // Get all supplier quotation headers for this PR
      const headers = await db.select()
        .from(supplierQuotationHeaders)
        .where(and(
          eq(supplierQuotationHeaders.purchaseRequestId, ba.purchaseRequestId),
          eq(supplierQuotationHeaders.organizationId, organizationId),
          isNull(supplierQuotationHeaders.deletedAt)
        ));

      let syncedCount = 0;

      for (const bidder of bidders) {
        // Find matching quotation header by bidAnalysisBidderId
        const matchingQuotation = headers.find(
          (h) => h.bidAnalysisBidderId === bidder.id
        );

        if (matchingQuotation && matchingQuotation.totalAmount) {
          const quotationTotal = parseFloat(matchingQuotation.totalAmount);
          if (quotationTotal > 0) {
            await db.update(bidAnalysisBidders)
              .set({
                totalBidAmount: quotationTotal.toString(),
                updatedAt: nowSql,
              })
              .where(eq(bidAnalysisBidders.id, bidder.id));
            syncedCount++;
          }
        }
      }

      return { success: true, syncedCount, totalBidders: bidders.length };
    }),

  verifyAcknowledgementSignature: scopedProcedure
    .input(z.object({
      verificationCode: z.string().min(1),
    }))
    .query(async ({ input }) => {
      const db = await getDb();

      const [sig] = await db.select()
        .from(bidderAcknowledgementSignatures)
        .where(eq(bidderAcknowledgementSignatures.verificationCode, input.verificationCode))
        .limit(1);

      if (!sig) return { valid: false, message: "Signature not found" };

      return {
        valid: true,
        signerName: sig.signerName,
        signerTitle: sig.signerTitle,
        signedAt: sig.signedAt,
        bidAnalysisId: sig.bidAnalysisId,
        bidderId: sig.bidderId,
      };
    }),

  /**
   * PCE: Get Supplier Offer Matrix for CBA
   * Returns per-item prices for all bidders in a bid analysis,
   * sourced from bid_analysis_line_items (populated by Supplier Quotation Entry).
   * Shape mirrors the QA Supplier Offer Matrix for UI consistency.
   */
  getSupplierOfferMatrix: scopedProcedure
    .input(z.object({ bidAnalysisId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();

      // Get all bidders for this BA
      const bidders = await db
        .select()
        .from(bidAnalysisBidders)
        .where(
          and(
            eq(bidAnalysisBidders.bidAnalysisId, input.bidAnalysisId),
            eq(bidAnalysisBidders.organizationId, ctx.scope.organizationId)
          )
        );

      // Get the BA to find the PR
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
        throw new TRPCError({ code: "NOT_FOUND", message: "Bid Analysis not found" });
      }

      // Get PR line items (canonical item list + estimated unit cost)
      const prLineItems = await db
        .select()
        .from(purchaseRequestLineItems)
        .where(eq(purchaseRequestLineItems.purchaseRequestId, ba.purchaseRequestId));

      // Get all bid_analysis_line_items for this BA
      const baliRows = await db
        .select()
        .from(bidAnalysisLineItems)
        .where(eq(bidAnalysisLineItems.bidAnalysisId, input.bidAnalysisId));

      // Build a map: bidderId -> prLineItemId -> { unitPrice, lineTotal }
      const priceMap = new Map<number, Map<number, { unitPrice: string; lineTotal: string }>>();
      for (const row of baliRows) {
        if (!priceMap.has(row.bidderId)) {
          priceMap.set(row.bidderId, new Map());
        }
        priceMap.get(row.bidderId)!.set(row.prLineItemId, {
          unitPrice: row.unitPrice,
          lineTotal: row.lineTotal,
        });
      }

      // Build matrix rows
      const matrixRows = prLineItems.map((item) => {
        const bidderPrices = bidders.map((bidder) => {
          const priceEntry = priceMap.get(bidder.id)?.get(item.id);
          return {
            bidderId: bidder.id,
            bidderName: bidder.bidderName,
            unitPrice: priceEntry ? parseFloat(priceEntry.unitPrice) : null,
            lineTotal: priceEntry ? parseFloat(priceEntry.lineTotal) : null,
          };
        });
        return {
          prLineItemId: item.id,
          description: item.description,
          quantity: parseFloat(String(item.quantity || 0)),
          unit: item.unit || "",
          estimatedUnitCost: parseFloat(String(item.unitPrice || 0)),
          bidderPrices,
        };
      });

      // Compute per-bidder totals
      const bidderTotals = bidders.map((bidder) => {
        const total = matrixRows.reduce((sum, row) => {
          const price = row.bidderPrices.find((bp) => bp.bidderId === bidder.id);
          return sum + (price?.lineTotal ?? 0);
        }, 0);
        return { bidderId: bidder.id, bidderName: bidder.bidderName, total };
      });

      return {
        bidAnalysisId: input.bidAnalysisId,
        purchaseRequestId: ba.purchaseRequestId,
        bidders: bidders.map((b) => ({ id: b.id, name: b.bidderName, isSelected: b.isSelected ?? false })),
        matrixRows,
        bidderTotals,
        hasData: baliRows.length > 0,
      };
    }),

  /**
   * PCE: Backfill bid_analysis_line_items from existing supplier_quotation_lines.
   * One-time migration helper for CBAs created before the PCE was deployed.
   * Safe to run multiple times (upsert logic: delete + re-insert per bidder).
   * Returns a summary of how many rows were created.
   */
  backfillLineItems: scopedProcedure
    .input(z.object({ bidAnalysisId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      // Verify BA exists and belongs to org
      const [ba] = await db
        .select()
        .from(bidAnalyses)
        .where(
          and(
            eq(bidAnalyses.id, input.bidAnalysisId),
            eq(bidAnalyses.organizationId, organizationId),
            isNull(bidAnalyses.deletedAt)
          )
        )
        .limit(1);

      if (!ba) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Bid Analysis not found" });
      }

      // Get all bidders for this BA
      const bidders = await db
        .select()
        .from(bidAnalysisBidders)
        .where(
          and(
            eq(bidAnalysisBidders.bidAnalysisId, input.bidAnalysisId),
            eq(bidAnalysisBidders.organizationId, organizationId)
          )
        );

      let totalRowsCreated = 0;
      let biddersProcessed = 0;

      for (const bidder of bidders) {
        // Find the supplier quotation for this bidder (linked by bidAnalysisBidderId)
        const [sqHeader] = await db
          .select()
          .from(supplierQuotationHeaders)
          .where(
            and(
              eq(supplierQuotationHeaders.purchaseRequestId, ba.purchaseRequestId),
              eq(supplierQuotationHeaders.bidAnalysisBidderId, bidder.id),
              eq(supplierQuotationHeaders.organizationId, organizationId),
              isNull(supplierQuotationHeaders.deletedAt)
            )
          )
          .limit(1);

        // If not found by bidderId, try matching by vendorId/supplierId
        let sqHeaderFallback = sqHeader;
        if (!sqHeaderFallback && bidder.supplierId) {
          const [fallback] = await db
            .select()
            .from(supplierQuotationHeaders)
            .where(
              and(
                eq(supplierQuotationHeaders.purchaseRequestId, ba.purchaseRequestId),
                eq(supplierQuotationHeaders.vendorId, bidder.supplierId),
                eq(supplierQuotationHeaders.organizationId, organizationId),
                isNull(supplierQuotationHeaders.deletedAt)
              )
            )
            .limit(1);
          sqHeaderFallback = fallback;
        }

        if (!sqHeaderFallback) continue;

        // Get quotation lines
        const sqLines = await db
          .select()
          .from(supplierQuotationLines)
          .where(eq(supplierQuotationLines.quotationHeaderId, sqHeaderFallback.id));

        if (sqLines.length === 0) continue;

        // Delete existing entries for this bidder in this BA (safe re-run)
        await db
          .delete(bidAnalysisLineItems)
          .where(
            and(
              eq(bidAnalysisLineItems.bidAnalysisId, input.bidAnalysisId),
              eq(bidAnalysisLineItems.bidderId, bidder.id)
            )
          );

        // Re-insert from quotation lines
        await db.insert(bidAnalysisLineItems).values(
          sqLines.map((line) => ({
            bidAnalysisId: input.bidAnalysisId,
            bidderId: bidder.id,
            prLineItemId: line.prLineItemId,
            organizationId: ctx.scope.organizationId,
            operatingUnitId: ctx.scope.operatingUnitId,
            unitPrice: line.unitPrice,
            lineTotal: line.lineTotal,
            createdBy: ctx.user.id,
          }))
        );

        totalRowsCreated += sqLines.length;
        biddersProcessed++;
      }

      return {
        success: true,
        biddersProcessed,
        totalRowsCreated,
        message: `Backfilled ${totalRowsCreated} line items for ${biddersProcessed} bidder(s).`,
      };
    }),
});