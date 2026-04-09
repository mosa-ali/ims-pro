import { z } from "zod";
import {
  checkDeletionGovernance,
  performHardDelete,
  performSoftDelete,
} from "../../db/deletionGovernance";

import { publicProcedure, protectedProcedure, router, scopedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { 
  quotationAnalyses, 
  quotationAnalysisSuppliers,
  quotationAnalysisLineItems,
  quotationAnalysisAuditLog,
  purchaseRequests,
  purchaseRequestLineItems,
  rfqVendors,
  rfqVendorItems,
  vendors,
  contracts,
} from "../../../drizzle/schema";
import { isServicesWorkflow } from "./capabilities";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { generateQANumber } from "../../services/procurementNumbering";
import { autoRegisterVendor, recordVendorParticipation } from "../../vendorAutomation";

/**
 * Quotation Analysis (QA) Router
 * 
 * QA is used ONLY for PRs ≤ USD 25,000 (Quotations)
 * Auto-created when PR is approved and total ≤ $25K
 * 
 * Uses standard db.select() queries for TiDB compatibility
 * (db.query.* generates LATERAL JOINs which TiDB doesn't support)
 */

export const quotationAnalysisRouter = router({
  /**
   * Auto-create QA when PR is approved (if total ≤ $25K)
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

      // Get line items
      const lineItems = await db.select()
        .from(purchaseRequestLineItems)
        .where(eq(purchaseRequestLineItems.purchaseRequestId, purchaseRequestId));

      // Check if PR total is ≤ $25,000 (Quotation process)
      const prTotal = parseFloat(pr.prTotalUSD || "0");
      if (prTotal > 25000) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "QA is only for PRs ≤ USD 25,000. This PR requires BA (Bid Analysis).",
        });
      }

      // Check if QA already exists
      const [existingQA] = await db.select()
        .from(quotationAnalyses)
        .where(and(
          eq(quotationAnalyses.purchaseRequestId, purchaseRequestId),
          eq(quotationAnalyses.organizationId, organizationId),
          isNull(quotationAnalyses.deletedAt)
        ))
        .limit(1);

      if (existingQA) {
        return existingQA;
      }

      // Generate QA number
      const qaNumber = await generateQANumber(organizationId, operatingUnitId);

      // Create QA
      const [result] = await db.insert(quotationAnalyses).values({
        organizationId,
        operatingUnitId,
        purchaseRequestId,
        qaNumber,
        title: pr.projectTitle,
        titleAr: pr.projectTitle,
        rfqDate: new Date(),
        status: "draft",
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
        isDeleted: 0,  // Dual-column synchronization
      });

      // Auto-copy PR line items to QA line items
      // Note: QA line items reference PR line items via lineItemId
      // We create placeholder entries for each PR line item
      if (lineItems.length > 0) {
        const qaLineItemsToInsert = lineItems.map((item) => ({
          quotationAnalysisId: Number(result.insertId),
          supplierId: 0, // Placeholder, will be filled when supplier quotes are added
          lineItemId: item.id,
          unitPrice: item.estimatedUnitPrice || "0",
          totalPrice: item.estimatedTotalPrice || "0",
          remarks: item.specifications,
        }));

        await db.insert(quotationAnalysisLineItems).values(qaLineItemsToInsert);
      }

      // Auto-load RFQ suppliers immediately after QA creation
      const qaId = Number(result.insertId);
      const rfqVendorsList = await db.select()
        .from(rfqVendors)
        .where(and(
          eq(rfqVendors.purchaseRequestId, purchaseRequestId),
          eq(rfqVendors.submissionStatus, "submitted")
        ));

      // For each RFQ vendor, add them to QA with their quotes
      for (const rfqVendor of rfqVendorsList) {
        // Get supplier details
        const [supplier] = await db.select()
          .from(vendors)
          .where(eq(vendors.id, rfqVendor.supplierId))
          .limit(1);

        if (!supplier) continue;

        // Get line-item prices for this vendor
        const lineItemPrices = await db.select()
          .from(rfqVendorItems)
          .where(eq(rfqVendorItems.rfqVendorId, rfqVendor.id));

        // Calculate total amount from line items
        let totalAmount = 0;
        for (const item of lineItemPrices) {
          totalAmount += parseFloat(item.quotedTotalPrice.toString());
        }

        // Add supplier to QA
        const [supplierResult] = await db.insert(quotationAnalysisSuppliers).values({
          quotationAnalysisId: qaId,
          supplierId: rfqVendor.supplierId,
          supplierName: supplier.name,
          quoteReference: rfqVendor.supplierQuoteNumber,
          quoteDate: rfqVendor.submissionDate,
          totalAmount: totalAmount.toString(),
          currency: rfqVendor.currency || "USD",
          deliveryDays: rfqVendor.deliveryDays,
          paymentTerms: rfqVendor.notes,
          warrantyMonths: rfqVendor.warrantyMonths,
          technicalExperienceYears: rfqVendor.yearsOfExperience || 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        isDeleted: 0,  // Dual-column synchronization
        });

        // Add line-item prices to QA line items
        for (const lineItemPrice of lineItemPrices) {
          await db.insert(quotationAnalysisLineItems).values({
            quotationAnalysisId: qaId,
            supplierId: Number(supplierResult.insertId),
            lineItemId: lineItemPrice.prLineItemId,
            unitPrice: lineItemPrice.quotedUnitPrice.toString(),
            totalPrice: lineItemPrice.quotedTotalPrice.toString(),
            remarks: lineItemPrice.itemNotes,
        isDeleted: 0,  // Dual-column synchronization
          });
        }
      }

      // Return the created QA
      const [createdQA] = await db.select()
        .from(quotationAnalyses)
        .where(eq(quotationAnalyses.id, qaId))
        .limit(1);

      return createdQA;
    }),

  /**
   * Get QA by ID with all related data
   */
  getById: scopedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const { id } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Get QA
      const [qa] = await db.select()
        .from(quotationAnalyses)
        .where(and(
          eq(quotationAnalyses.id, id),
          eq(quotationAnalyses.organizationId, organizationId),
          isNull(quotationAnalyses.deletedAt)
        ))
        .limit(1);

      if (!qa) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quotation Analysis not found",
        });
      }

      // Get PR
      const [purchaseRequest] = await db.select()
        .from(purchaseRequests)
        .where(eq(purchaseRequests.id, qa.purchaseRequestId))
        .limit(1);

      // Get PR line items
      const prLineItems = await db.select()
        .from(purchaseRequestLineItems)
        .where(eq(purchaseRequestLineItems.purchaseRequestId, qa.purchaseRequestId));

      // Get suppliers
      const qaSuppliers = await db.select()
        .from(quotationAnalysisSuppliers)
        .where(eq(quotationAnalysisSuppliers.quotationAnalysisId, id));

      // Get line item prices
      const qaLineItems = await db.select()
        .from(quotationAnalysisLineItems)
        .where(eq(quotationAnalysisLineItems.quotationAnalysisId, id));

      // Attach line item prices to each supplier
      const suppliersWithOffers = qaSuppliers.map((s) => {
        const lineOffers = qaLineItems.filter((li) => li.supplierId === s.id);
        return { ...s, lineOffers };
      });

      return {
        ...qa,
        purchaseRequest: {
          ...purchaseRequest,
          lineItems: prLineItems,
        },
        suppliers: suppliersWithOffers,
        lineItems: qaLineItems,
      };
    }),

  /**
   * Auto-load suppliers from RFQ vendors into QA
   * Fetches all vendors who submitted quotations for this PR
   * Returns suppliers with their line-item prices ready for QA comparison
   */
  autoLoadRFQSuppliers: scopedProcedure
    .input(z.object({
      quotationAnalysisId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { quotationAnalysisId } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Get QA
      const [qa] = await db.select()
        .from(quotationAnalyses)
        .where(and(
          eq(quotationAnalyses.id, quotationAnalysisId),
          eq(quotationAnalyses.organizationId, organizationId),
          isNull(quotationAnalyses.deletedAt)
        ))
        .limit(1);

      if (!qa) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quotation Analysis not found",
        });
      }

      // Get PR line items for later reference
      const prLineItems = await db.select()
        .from(purchaseRequestLineItems)
        .where(eq(purchaseRequestLineItems.purchaseRequestId, qa.purchaseRequestId));

      // Fetch RFQ vendors who submitted quotations for this PR
      const rfqVendorsList = await db.select()
        .from(rfqVendors)
        .where(and(
          eq(rfqVendors.purchaseRequestId, qa.purchaseRequestId),
          eq(rfqVendors.submissionStatus, "submitted")
        ));

      // For each RFQ vendor, get their supplier details and line-item prices
      const suppliersToAdd = [];
      for (const rfqVendor of rfqVendorsList) {
        // Get supplier details (to fetch supplier NAME)
        const [supplier] = await db.select()
          .from(vendors)
          .where(eq(vendors.id, rfqVendor.supplierId))
          .limit(1);

        if (!supplier) continue;

        // Get line-item prices for this vendor
        const lineItemPrices = await db.select()
          .from(rfqVendorItems)
          .where(eq(rfqVendorItems.rfqVendorId, rfqVendor.id));

        // Calculate total amount from line items
        let totalAmount = 0;
        for (const item of lineItemPrices) {
          totalAmount += parseFloat(item.quotedTotalPrice.toString());
        }

        // Check if supplier already exists in QA
        const [existingSupplier] = await db.select()
          .from(quotationAnalysisSuppliers)
          .where(and(
            eq(quotationAnalysisSuppliers.quotationAnalysisId, quotationAnalysisId),
            eq(quotationAnalysisSuppliers.supplierId, rfqVendor.supplierId)
          ))
          .limit(1);

        if (existingSupplier) {
          continue; // Skip if already added
        }

        // Add supplier to QA
        const [result] = await db.insert(quotationAnalysisSuppliers).values({
          quotationAnalysisId,
          supplierId: rfqVendor.supplierId,
          supplierName: supplier.name, // Use supplier NAME (not code)
          quoteReference: rfqVendor.supplierQuoteNumber,
          quoteDate: rfqVendor.submissionDate,
          totalAmount: totalAmount.toString(),
          currency: rfqVendor.currency || "USD",
          deliveryDays: rfqVendor.deliveryDays,
          paymentTerms: rfqVendor.notes,
          warrantyMonths: rfqVendor.warrantyMonths,
          technicalExperienceYears: rfqVendor.yearsOfExperience || 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        isDeleted: 0,  // Dual-column synchronization
        });

        // Add line-item prices to QA line items
        for (const lineItemPrice of lineItemPrices) {
          await db.insert(quotationAnalysisLineItems).values({
            quotationAnalysisId,
            supplierId: rfqVendor.supplierId,  // Use actual vendor ID, not insertId
            lineItemId: lineItemPrice.prLineItemId,
            unitPrice: lineItemPrice.quotedUnitPrice.toString(),
            totalPrice: lineItemPrice.quotedTotalPrice.toString(),
            remarks: lineItemPrice.itemNotes,
        isDeleted: 0,  // Dual-column synchronization
          });
        }

        suppliersToAdd.push({
          id: Number(result.insertId),
          supplierName: supplier.name,
          totalAmount: totalAmount.toString(),
        });
      }

      return {
        success: true,
        suppliersAdded: suppliersToAdd.length,
        suppliers: suppliersToAdd,
      };
    }),

  /**
   * Get QA by Purchase Request ID
   */
  getByPurchaseRequestId: scopedProcedure
    .input(z.object({
      purchaseRequestId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const { purchaseRequestId } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Get QA
      const [qa] = await db.select()
        .from(quotationAnalyses)
        .where(and(
          eq(quotationAnalyses.purchaseRequestId, purchaseRequestId),
          eq(quotationAnalyses.organizationId, organizationId),
          isNull(quotationAnalyses.deletedAt)
        ))
        .limit(1);

      if (!qa) return null;

      // Get PR
      const [purchaseRequest] = await db.select()
        .from(purchaseRequests)
        .where(eq(purchaseRequests.id, qa.purchaseRequestId))
        .limit(1);

      // Get PR line items
      const prLineItems = await db.select()
        .from(purchaseRequestLineItems)
        .where(eq(purchaseRequestLineItems.purchaseRequestId, qa.purchaseRequestId));

      // Get suppliers
      const qaSuppliers = await db.select()
        .from(quotationAnalysisSuppliers)
        .where(eq(quotationAnalysisSuppliers.quotationAnalysisId, qa.id));

      // Get line item prices
      const qaLineItems = await db.select()
        .from(quotationAnalysisLineItems)
        .where(eq(quotationAnalysisLineItems.quotationAnalysisId, qa.id));

      // Attach line item prices to each supplier for the offer matrix
      // Convert Decimal values to numbers for frontend compatibility
      const suppliersWithOffers = qaSuppliers.map((s) => {
        const lineOffers = qaLineItems.filter((li) => li.supplierId === s.id);
        return {
          ...s,
          lineOffers,
          // Convert Decimal fields to numbers
          priceScore: s.priceScore ? Number(s.priceScore) : null,
          deliveryScore: s.deliveryScore ? Number(s.deliveryScore) : null,
          warrantyScore: s.warrantyScore ? Number(s.warrantyScore) : null,
          technicalCriterionScore: s.technicalCriterionScore ? Number(s.technicalCriterionScore) : null,
          weightedTotalScore: s.weightedTotalScore ? Number(s.weightedTotalScore) : null,
        };
      });

      return {
        ...qa,
        purchaseRequest: {
          ...purchaseRequest,
          lineItems: prLineItems,
        },
        suppliers: suppliersWithOffers,
        lineItems: qaLineItems,
      };
    }),

  /**
   * List all QAs for organization
   */
  list: scopedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      status: z.enum(["draft", "rfq_sent", "quotes_received", "evaluated", "approved", "cancelled"]).optional(),
    }))
    .query(async ({ input, ctx }) => {
      const { limit, offset, status } = input;
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();

      const conditions = [
        eq(quotationAnalyses.organizationId, organizationId),
        isNull(quotationAnalyses.deletedAt),
      ];

      if (operatingUnitId) {
        conditions.push(eq(quotationAnalyses.operatingUnitId, operatingUnitId));
      }

      if (status) {
        conditions.push(eq(quotationAnalyses.status, status));
      }

      const qas = await db.select()
        .from(quotationAnalyses)
        .where(and(...conditions))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(quotationAnalyses.createdAt));

      return qas;
    }),

  /**
   * Add supplier to QA
   */
  addSupplier: scopedProcedure
    .input(z.object({
      quotationAnalysisId: z.number(),
      supplierId: z.number().optional(),
      supplierName: z.string(),
      quoteReference: z.string().optional(),
      quoteDate: z.date().optional(),
      totalAmount: z.number().optional(),
      currency: z.string().default("USD"),
      deliveryDays: z.number().optional(),
      paymentTerms: z.string().optional(),
      warrantyMonths: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { quotationAnalysisId, ...supplierData } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Verify QA exists and belongs to organization
      const [qa] = await db.select()
        .from(quotationAnalyses)
        .where(and(
          eq(quotationAnalyses.id, quotationAnalysisId),
          eq(quotationAnalyses.organizationId, organizationId),
          isNull(quotationAnalyses.deletedAt)
        ))
        .limit(1);

      if (!qa) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quotation Analysis not found",
        });
      }

      // Check if QA is in draft status
      if (qa.status !== "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot add suppliers to QA after it has been submitted",
        });
      }

      // Auto-register vendor if not exists
      let vendorId = supplierData.supplierId;
      if (!vendorId && supplierData.supplierName) {
        const { vendor, isNew } = await autoRegisterVendor({
          organizationId,
          operatingUnitId: ctx.scope.operatingUnitId,
          legalName: supplierData.supplierName,
          primaryCategory: "Quotation Supplier",
          sourceModule: "procurement",
          sourceReferenceId: quotationAnalysisId,
          sourceReferenceType: "quotation_analysis",
          createdBy: ctx.user.id,
        });
        vendorId = vendor.id;

        // Record participation
        await recordVendorParticipation({
          vendorId: vendor.id,
          organizationId,
          operatingUnitId: ctx.scope.operatingUnitId,
          participationType: "quotation",
          purchaseRequestId: qa.purchaseRequestId,
          quotationAnalysisId,
          submissionDate: supplierData.quoteDate,
          submissionStatus: "submitted",
        });
      }

      // Add supplier
      const [result] = await db.insert(quotationAnalysisSuppliers).values({
        quotationAnalysisId,
        ...supplierData,
        supplierId: vendorId,
        totalAmount: supplierData.totalAmount?.toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: 0,  // Dual-column synchronization
      });

      // Return the created supplier
      const [supplier] = await db.select()
        .from(quotationAnalysisSuppliers)
        .where(eq(quotationAnalysisSuppliers.id, Number(result.insertId)))
        .limit(1);

      return supplier;
    }),

  /**
   * Update supplier offer (unit prices per item)
   */
  updateSupplierOffer: scopedProcedure
    .input(z.object({
      supplierId: z.number(),
      lineItemPrices: z.array(z.object({
        lineItemId: z.number(),
        unitPrice: z.number(),
      })),
      technicalScore: z.number().optional(),
      remarks: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { supplierId, lineItemPrices, technicalScore, remarks } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Get supplier
      const [supplier] = await db.select()
        .from(quotationAnalysisSuppliers)
        .where(eq(quotationAnalysisSuppliers.id, supplierId))
        .limit(1);

      if (!supplier) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Supplier not found",
        });
      }

      // Verify QA belongs to organization
      const [qa] = await db.select()
        .from(quotationAnalyses)
        .where(and(
          eq(quotationAnalyses.id, supplier.quotationAnalysisId),
          eq(quotationAnalyses.organizationId, organizationId)
        ))
        .limit(1);

      if (!qa) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quotation Analysis not found",
        });
      }

      // Get PR line items for quantity calculation
      const prLineItems = await db.select()
        .from(purchaseRequestLineItems)
        .where(eq(purchaseRequestLineItems.purchaseRequestId, qa.purchaseRequestId));

      // Calculate total amount (Qty × Unit Price for each item)
      let totalAmount = 0;
      for (const lineItemPrice of lineItemPrices) {
        const lineItem = prLineItems.find(
          (item) => item.id === lineItemPrice.lineItemId
        );
        if (lineItem) {
          totalAmount += parseFloat(lineItem.quantity) * lineItemPrice.unitPrice;
        }
      }

      // Update supplier
      await db.update(quotationAnalysisSuppliers)
        .set({
          totalAmount: totalAmount.toString(),
          technicalScore: technicalScore?.toString(),
          remarks,
          updatedAt: new Date(),
        })
        .where(eq(quotationAnalysisSuppliers.id, supplierId));

      // Store line item prices in quotation_analysis_line_items table
      // Delete existing line item prices for this supplier
      await db.delete(quotationAnalysisLineItems)
        .where(eq(quotationAnalysisLineItems.supplierId, supplierId));
      
      // Insert new line item prices
      for (const lineItemPrice of lineItemPrices) {
        const lineItem = prLineItems.find(
          (item) => item.id === lineItemPrice.lineItemId
        );
        if (lineItem) {
          const qty = parseFloat(lineItem.quantity);
          const unitPrice = lineItemPrice.unitPrice;
          const totalPrice = qty * unitPrice;
          
          await db.insert(quotationAnalysisLineItems).values({
            quotationAnalysisId: supplier.quotationAnalysisId,
            supplierId,
            lineItemId: lineItemPrice.lineItemId,
            unitPrice: unitPrice.toString(),
            totalPrice: totalPrice.toString(),
        isDeleted: 0,  // Dual-column synchronization
          });
        }
      }

      return { success: true, totalAmount };
    }),

  /**
   * Calculate scores for all suppliers
   * Supports two modes:
   * - PRs ≤ $5,000: Cost-only scoring (100 points to lowest bidder)
   * - PRs $5,000-$25,000: Multi-criteria scoring (Price 60% + Delivery 20% + Warranty 10% + Technical 10%)
   */
  calculateScores: scopedProcedure
    .input(z.object({
      quotationAnalysisId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { quotationAnalysisId } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Get QA with PR details
      const [qa] = await db.select()
        .from(quotationAnalyses)
        .where(and(
          eq(quotationAnalyses.id, quotationAnalysisId),
          eq(quotationAnalyses.organizationId, organizationId),
          isNull(quotationAnalyses.deletedAt)
        ))
        .limit(1);

      if (!qa) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quotation Analysis not found",
        });
      }

      // Get PR to determine total amount
      const [pr] = await db.select()
        .from(purchaseRequests)
        .where(eq(purchaseRequests.id, qa.purchaseRequestId!))
        .limit(1);

      if (!pr) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Purchase Request not found",
        });
      }

      const prTotal = parseFloat(pr.prTotalUSD || "0");

      // Get suppliers
      const qaSuppliers = await db.select()
        .from(quotationAnalysisSuppliers)
        .where(eq(quotationAnalysisSuppliers.quotationAnalysisId, quotationAnalysisId));

      if (qaSuppliers.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No suppliers found for scoring",
        });
      }

      // Determine scoring mode based on PR total
      const isCostOnly = prTotal <= 5000;

      if (isCostOnly) {
        // Cost-only scoring: lowest bidder gets 100 points
        const prices = qaSuppliers.map((s) => parseFloat(s.totalAmount || "0")).filter(p => p > 0);
        if (prices.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot calculate scores: no valid supplier prices",
          });
        }

        const lowestPrice = Math.min(...prices);

        for (const supplier of qaSuppliers) {
          const supplierPrice = parseFloat(supplier.totalAmount || "0");
          if (supplierPrice > 0) {
            const totalScore = (lowestPrice / supplierPrice) * 100;
            
            await db.update(quotationAnalysisSuppliers)
              .set({
                financialScore: totalScore.toFixed(2),
                totalScore: totalScore.toFixed(2),
                updatedAt: new Date(),
              })
              .where(eq(quotationAnalysisSuppliers.id, supplier.id));
          }
        }
      } else {
        // Multi-criteria scoring: Price 60% + Delivery 20% + Warranty 10% + Technical 10%
        const prices = qaSuppliers.map((s) => parseFloat(s.totalAmount || "0")).filter(p => p > 0);
        const deliveryTimes = qaSuppliers.map((s) => s.deliveryDays || 0).filter(d => d > 0);
        const warranties = qaSuppliers.map((s) => s.warrantyMonths || 0);

        if (prices.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot calculate scores: no valid supplier prices",
          });
        }

        const lowestPrice = Math.min(...prices);
        const fastestDelivery = deliveryTimes.length > 0 ? Math.min(...deliveryTimes) : 0;
        const longestWarranty = warranties.length > 0 ? Math.max(...warranties) : 0;

        for (const supplier of qaSuppliers) {
          const supplierPrice = parseFloat(supplier.totalAmount || "0");
          const supplierDelivery = supplier.deliveryDays || 0;
          const supplierWarranty = supplier.warrantyMonths || 0;
          const supplierTechnical = parseFloat(supplier.technicalScore || "0");

          // Price score (60%): lowest price gets 60 points
          const priceScore = supplierPrice > 0 ? (lowestPrice / supplierPrice) * 60 : 0;

          // Delivery score (20%): fastest delivery gets 20 points
          const deliveryScore = supplierDelivery > 0 && fastestDelivery > 0
            ? (fastestDelivery / supplierDelivery) * 20
            : 0;

          // Warranty score (10%): longest warranty gets 10 points
          const warrantyScore = longestWarranty > 0
            ? (supplierWarranty / longestWarranty) * 10
            : 0;

          // Technical score (10%): normalized from 1-5 scale to 0-10 points
          const technicalScoreNormalized = (supplierTechnical / 5) * 10;

          // Total score (out of 100)
          const totalScore = priceScore + deliveryScore + warrantyScore + technicalScoreNormalized;

          await db.update(quotationAnalysisSuppliers)
            .set({
              financialScore: priceScore.toFixed(2),
              totalScore: totalScore.toFixed(2),
              updatedAt: new Date(),
            })
            .where(eq(quotationAnalysisSuppliers.id, supplier.id));
        }
      }

      return { success: true, scoringMode: isCostOnly ? "cost-only" : "multi-criteria" };
    }),

  /**
   * Select winning supplier
   */
  selectSupplier: scopedProcedure
    .input(z.object({
      quotationAnalysisId: z.number(),
      supplierId: z.number(),
      justification: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { quotationAnalysisId, supplierId, justification } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Verify QA exists
      const [qa] = await db.select()
        .from(quotationAnalyses)
        .where(and(
          eq(quotationAnalyses.id, quotationAnalysisId),
          eq(quotationAnalyses.organizationId, organizationId),
          isNull(quotationAnalyses.deletedAt)
        ))
        .limit(1);

      if (!qa) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quotation Analysis not found",
        });
      }

      // Get suppliers
      const qaSuppliers = await db.select()
        .from(quotationAnalysisSuppliers)
        .where(eq(quotationAnalysisSuppliers.quotationAnalysisId, quotationAnalysisId));

      // Verify supplier belongs to this QA
      const supplier = qaSuppliers.find((s) => s.id === supplierId);
      if (!supplier) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Supplier not found in this QA",
        });
      }

      // Check if selected supplier is NOT the lowest bidder
      const prices = qaSuppliers.map((s) => parseFloat(s.totalAmount || "0")).filter(p => p > 0);
      const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const selectedPrice = parseFloat(supplier.totalAmount || "0");

      if (selectedPrice > lowestPrice && !justification) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Justification is MANDATORY when selected supplier is not the lowest bidder",
        });
      }

      // Reset all suppliers' isSelected flag
      await db.update(quotationAnalysisSuppliers)
        .set({ isSelected: false })
        .where(eq(quotationAnalysisSuppliers.quotationAnalysisId, quotationAnalysisId));

      // Mark the selected supplier
      await db.update(quotationAnalysisSuppliers)
        .set({ isSelected: true })
        .where(eq(quotationAnalysisSuppliers.id, supplierId));

      // Update QA
      await db.update(quotationAnalyses)
        .set({
          selectedSupplierId: supplierId,
          selectionJustification: justification,
          status: "evaluated",
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(eq(quotationAnalyses.id, quotationAnalysisId));

      return { success: true };
    }),

  /**
   * Update evaluation report
   */
  updateEvaluationReport: scopedProcedure
    .input(z.object({
      qaId: z.number(),
      evaluationReport: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { qaId, evaluationReport } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Verify QA exists
      const [qa] = await db.select()
        .from(quotationAnalyses)
        .where(and(
          eq(quotationAnalyses.id, qaId),
          eq(quotationAnalyses.organizationId, organizationId),
          isNull(quotationAnalyses.deletedAt)
        ))
        .limit(1);

      if (!qa) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quotation Analysis not found",
        });
      }

      // Update evaluation report
      await db.update(quotationAnalyses)
        .set({
          evaluationReport,
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(eq(quotationAnalyses.id, qaId));

      return { success: true };
    }),

  /**
   * Approve QA (final step before PO creation)
   */
  approve: scopedProcedure
    .input(z.object({
      quotationAnalysisId: z.number(),
      evaluationReport: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { quotationAnalysisId } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Get QA
      const [qa] = await db.select()
        .from(quotationAnalyses)
        .where(and(
          eq(quotationAnalyses.id, quotationAnalysisId),
          eq(quotationAnalyses.organizationId, organizationId),
          isNull(quotationAnalyses.deletedAt)
        ))
        .limit(1);

      if (!qa) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quotation Analysis not found",
        });
      }

      // Validation: must have a selected supplier
      const selectedSuppliers = await db.select()
        .from(quotationAnalysisSuppliers)
        .where(and(
          eq(quotationAnalysisSuppliers.quotationAnalysisId, quotationAnalysisId),
          eq(quotationAnalysisSuppliers.isSelected, true)
        ));

      if (selectedSuppliers.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot approve QA: no supplier selected",
        });
      }

      // Update status and evaluation report
      await db.update(quotationAnalyses)
        .set({
          status: "approved",
          evaluationReport: input.evaluationReport || undefined,
          approvedBy: ctx.user.id,
          approvedAt: new Date(),
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(eq(quotationAnalyses.id, quotationAnalysisId));

      // ── Auto-create draft Contract for Services PRs (1k-25k QA path) ──
      let autoCreatedContractId: number | null = null;
      if (qa.purchaseRequestId) {
        const [pr] = await db.select()
          .from(purchaseRequests)
          .where(eq(purchaseRequests.id, qa.purchaseRequestId))
          .limit(1);

        if (pr && isServicesWorkflow(pr.category)) {
          const selectedSupplier = selectedSuppliers[0]; // Already validated above
          // Check if contract already exists for this PR
          const [existingContract] = await db.select()
            .from(contracts)
            .where(and(
              eq(contracts.purchaseRequestId, pr.id),
              isNull(contracts.deletedAt)
            ))
            .limit(1);

          if (!existingContract && selectedSupplier) {
            // Generate proper contract number using the numbering service
            let contractNumber: string;
            try {
              const { generateContractNumber } = await import("../../services/procurementNumbering");
              contractNumber = await generateContractNumber(organizationId, ctx.scope.operatingUnitId);
            } catch {
              contractNumber = `CON-${qa.qaNumber || 'QA'}-001`;
            }

            // Default dates: start = now, end = 1 year from now
            const now = new Date();
            const oneYearLater = new Date(now);
            oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

            const contractResult = await db.insert(contracts).values({
              purchaseRequestId: pr.id,
              contractNumber,
              vendorId: selectedSupplier.supplierId,
              contractValue: selectedSupplier.totalAmount?.toString() || (pr as any).prTotalUsd || (pr as any).prTotalUSD || "0",
              currency: pr.exchangeTo || pr.currency || "USD",
              paymentStructure: "lump_sum",
              retentionPercentage: "0",
              startDate: now,
              endDate: oneYearLater,
              status: "draft",
              organizationId,
              operatingUnitId: ctx.scope.operatingUnitId,
              createdBy: ctx.user.id,
              updatedBy: ctx.user.id,
            }).$returningId();

            autoCreatedContractId = contractResult[0]?.id ?? null;
            console.log(`[QA Approve] Auto-created draft Contract #${contractNumber} (ID: ${autoCreatedContractId}) for services PR #${pr.prNumber}`);
          }
        }
      }

      return { success: true, qaId: quotationAnalysisId, autoCreatedContractId };
    }),

  /**
   * Select winner supplier for QA (manual selection)
   */
  selectWinner: scopedProcedure
    .input(z.object({
      quotationAnalysisId: z.number(),
      supplierId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { quotationAnalysisId, supplierId } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Verify QA exists
      const [qa] = await db.select()
        .from(quotationAnalyses)
        .where(and(
          eq(quotationAnalyses.id, quotationAnalysisId),
          eq(quotationAnalyses.organizationId, organizationId),
          isNull(quotationAnalyses.deletedAt)
        ))
        .limit(1);

      if (!qa) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quotation Analysis not found",
        });
      }

      // Verify supplier exists in this QA
      const [supplier] = await db.select()
        .from(quotationAnalysisSuppliers)
        .where(and(
          eq(quotationAnalysisSuppliers.quotationAnalysisId, quotationAnalysisId),
          eq(quotationAnalysisSuppliers.supplierId, supplierId)
        ))
        .limit(1);

      if (!supplier) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Supplier not found in this QA",
        });
      }

      // Clear all previous winner selections for this QA
      await db.update(quotationAnalysisSuppliers)
        .set({ isSelected: false })
        .where(eq(quotationAnalysisSuppliers.quotationAnalysisId, quotationAnalysisId));

      // Set new winner
      await db.update(quotationAnalysisSuppliers)
        .set({ isSelected: true })
        .where(and(
          eq(quotationAnalysisSuppliers.quotationAnalysisId, quotationAnalysisId),
          eq(quotationAnalysisSuppliers.supplierId, supplierId)
        ));

      // Update QA selectedSupplierId
      await db.update(quotationAnalyses)
        .set({
          selectedSupplierId: supplierId,
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(eq(quotationAnalyses.id, quotationAnalysisId));

      return { success: true };
    }),

  /**
   * Delete QA (soft delete)
   */
  /**
   * Recreate QA - Delete old QA and create a fresh one with latest RFQ suppliers
   */
  recreateQA: scopedProcedure
    .input(z.object({
      quotationAnalysisId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { quotationAnalysisId } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Get existing QA
      const [existingQA] = await db.select()
        .from(quotationAnalyses)
        .where(and(
          eq(quotationAnalyses.id, quotationAnalysisId),
          eq(quotationAnalyses.organizationId, organizationId),
          isNull(quotationAnalyses.deletedAt)
        ))
        .limit(1);

      if (!existingQA) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quotation Analysis not found",
        });
      }

      const purchaseRequestId = existingQA.purchaseRequestId;

      // Soft delete the old QA
      await db.update(quotationAnalyses)
        .set({
          deletedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
          deletedBy: ctx.user.id,
        })
        .where(eq(quotationAnalyses.id, quotationAnalysisId));

      // Create new QA (same logic as autoCreate)
      const qaNumber = await generateQANumber(organizationId);
      const [newQA] = await db.insert(quotationAnalyses).values({
        organizationId,
        purchaseRequestId,
        qaNumber,
        status: "draft",
        createdBy: ctx.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: 0,  // Dual-column synchronization
      });

      // Get PR line items
      const prLineItems = await db.select()
        .from(purchaseRequestLineItems)
        .where(eq(purchaseRequestLineItems.purchaseRequestId, purchaseRequestId));

      // Add PR line items to QA
      for (const prLineItem of prLineItems) {
        await db.insert(quotationAnalysisLineItems).values({
          quotationAnalysisId: newQA.insertId,
          lineItemId: prLineItem.id,
          description: prLineItem.description,
          quantity: prLineItem.quantity.toString(),
          unit: prLineItem.unit,
          unitPrice: prLineItem.unitPrice.toString(),
          totalPrice: (parseFloat(prLineItem.quantity.toString()) * parseFloat(prLineItem.unitPrice.toString())).toString(),
          createdAt: new Date(),
          updatedAt: new Date(),
        isDeleted: 0,  // Dual-column synchronization
        });
      }

      // Auto-load RFQ suppliers
      const rfqVendorsList = await db.select()
        .from(rfqVendors)
        .where(and(
          eq(rfqVendors.purchaseRequestId, purchaseRequestId),
          eq(rfqVendors.submissionStatus, "submitted")
        ));

      for (const rfqVendor of rfqVendorsList) {
        const [supplier] = await db.select()
          .from(vendors)
          .where(eq(vendors.id, rfqVendor.supplierId))
          .limit(1);

        if (!supplier) continue;

        const lineItemPrices = await db.select()
          .from(rfqVendorItems)
          .where(eq(rfqVendorItems.rfqVendorId, rfqVendor.id));

        let totalAmount = 0;
        for (const item of lineItemPrices) {
          totalAmount += parseFloat(item.quotedTotalPrice.toString());
        }

        const [result] = await db.insert(quotationAnalysisSuppliers).values({
          quotationAnalysisId: newQA.insertId,
          supplierId: rfqVendor.supplierId,
          supplierName: supplier.name,
          quoteReference: rfqVendor.supplierQuoteNumber,
          quoteDate: rfqVendor.submissionDate,
          totalAmount: totalAmount.toString(),
          currency: rfqVendor.currency || "USD",
          deliveryDays: rfqVendor.deliveryDays,
          paymentTerms: rfqVendor.notes,
          warrantyMonths: rfqVendor.warrantyMonths,
          createdAt: new Date(),
          updatedAt: new Date(),
        isDeleted: 0,  // Dual-column synchronization
        });

        for (const lineItemPrice of lineItemPrices) {
          await db.insert(quotationAnalysisLineItems).values({
            quotationAnalysisId: newQA.insertId,
            supplierId: result.insertId,
            lineItemId: lineItemPrice.prLineItemId,
            unitPrice: lineItemPrice.quotedUnitPrice.toString(),
            totalPrice: lineItemPrice.quotedTotalPrice.toString(),
            remarks: lineItemPrice.itemNotes || null,
            createdAt: new Date(),
            updatedAt: new Date(),
        isDeleted: 0,  // Dual-column synchronization
          });
        }
      }

      return { success: true, newQAId: newQA.insertId };
    }),

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
   * Update QA line item price with audit trail
   */
  updateLineItemPrice: scopedProcedure
    .input(z.object({
      qaId: z.number(),
      lineItemId: z.number(),
      supplierId: z.number(),
      newUnitPrice: z.string(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { qaId, lineItemId, supplierId, newUnitPrice, reason } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Verify QA exists and belongs to organization
      const [qa] = await db.select()
        .from(quotationAnalyses)
        .where(and(
          eq(quotationAnalyses.id, qaId),
          eq(quotationAnalyses.organizationId, organizationId)
        ))
        .limit(1);

      if (!qa) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quotation Analysis not found",
        });
      }

      // Get current line item
      const [lineItem] = await db.select()
        .from(quotationAnalysisLineItems)
        .where(and(
          eq(quotationAnalysisLineItems.id, lineItemId),
          eq(quotationAnalysisLineItems.quotationAnalysisId, qaId),
          eq(quotationAnalysisLineItems.supplierId, supplierId)
        ))
        .limit(1);

      if (!lineItem) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Line item not found",
        });
      }

      const oldUnitPrice = lineItem.unitPrice?.toString() || "0";
      const newPrice = parseFloat(newUnitPrice);

      if (newPrice < 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Price cannot be negative",
        });
      }

      // Get line item quantity to calculate total
      const [prLineItem] = await db.select()
        .from(purchaseRequestLineItems)
        .where(eq(purchaseRequestLineItems.id, lineItem.lineItemId))
        .limit(1);

      const quantity = prLineItem?.quantity ? parseFloat(prLineItem.quantity.toString()) : 1;
      const newTotalPrice = newPrice * quantity;

      // Update line item price
      await db.update(quotationAnalysisLineItems)
        .set({
          unitPrice: newPrice.toString(),
          totalPrice: newTotalPrice.toString(),
          updatedAt: new Date(),
        })
        .where(eq(quotationAnalysisLineItems.id, lineItemId));

      // Log the change
      await db.insert(quotationAnalysisAuditLog)
        .values({
          quotationAnalysisId: qaId,
          supplierId,
          lineItemId,
          changeType: "price_adjustment",
          fieldName: "unitPrice",
          oldValue: oldUnitPrice,
          newValue: newUnitPrice,
          reason: reason || "Manual price adjustment",
          changedBy: ctx.user.id,
          changedAt: new Date(),
        });

      // Recalculate supplier total
      const [allLineItems] = await db.select({
        totalPrice: sql`SUM(CAST(${quotationAnalysisLineItems.totalPrice} AS DECIMAL(15,2)))`
      })
        .from(quotationAnalysisLineItems)
        .where(and(
          eq(quotationAnalysisLineItems.quotationAnalysisId, qaId),
          eq(quotationAnalysisLineItems.supplierId, supplierId)
        ));

      const newTotal = allLineItems?.totalPrice || "0";

      // Update supplier total amount
      await db.update(quotationAnalysisSuppliers)
        .set({
          totalAmount: newTotal,
          updatedAt: new Date(),
        })
        .where(and(
          eq(quotationAnalysisSuppliers.quotationAnalysisId, qaId),
          eq(quotationAnalysisSuppliers.supplierId, supplierId)
        ));

      return { success: true, newTotal };
    }),

  /**
   * Get audit log for a QA
   */
  getAuditLog: scopedProcedure
    .input(z.object({
      qaId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const { qaId } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Verify QA exists and belongs to organization
      const [qa] = await db.select()
        .from(quotationAnalyses)
        .where(and(
          eq(quotationAnalyses.id, qaId),
          eq(quotationAnalyses.organizationId, organizationId)
        ))
        .limit(1);

      if (!qa) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quotation Analysis not found",
        });
      }

      // Get audit log with user details
      const auditLog = await db.select()
        .from(quotationAnalysisAuditLog)
        .where(eq(quotationAnalysisAuditLog.quotationAnalysisId, qaId))
        .orderBy(desc(quotationAnalysisAuditLog.changedAt));

      return auditLog;
    }),

  /**
   * Calculate multi-criteria scores for extended QA (PRs $5,001-$25,000)
   * Scoring: Price 60%, Delivery 20%, Warranty 10%, Technical 10%
   */
  calculateMultiCriteriaScores: scopedProcedure
    .input(z.object({
      qaId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { qaId } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Get QA and verify it belongs to organization
      const [qa] = await db.select()
        .from(quotationAnalyses)
        .where(and(
          eq(quotationAnalyses.id, qaId),
          eq(quotationAnalyses.organizationId, organizationId)
        ))
        .limit(1);

      if (!qa) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quotation Analysis not found",
        });
      }

      // Get all suppliers for this QA
      const suppliers = await db.select()
        .from(quotationAnalysisSuppliers)
        .where(eq(quotationAnalysisSuppliers.quotationAnalysisId, qaId));

      if (suppliers.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No suppliers found for scoring",
        });
      }

      // Calculate scores for each supplier
      const scoredSuppliers = suppliers.map(supplier => {
        // Price Score (60% weight) - lowest total = 100 points
        const minPrice = Math.min(...suppliers.map(s => parseFloat(s.totalAmount || "0")));
        const priceScore = minPrice > 0 ? (minPrice / parseFloat(supplier.totalAmount || "1")) * 100 : 0;

        // Delivery Score (20% weight) - fastest delivery = 100 points
        const minDelivery = Math.min(...suppliers.map(s => s.deliveryDays || 999));
        const deliveryScore = supplier.deliveryDays ? (minDelivery / supplier.deliveryDays) * 100 : 0;

        // Warranty Score (10% weight) - longest warranty = 100 points
        const maxWarranty = Math.max(...suppliers.map(s => s.warrantyMonths || 0));
        const warrantyScore = maxWarranty > 0 ? (supplier.warrantyMonths || 0) / maxWarranty * 100 : 0;

        // Technical Score (10% weight) - 3+ years experience = 100 points
        const technicalScore = (supplier.technicalExperienceYears || 0) >= 3 ? 100 : ((supplier.technicalExperienceYears || 0) / 3) * 100;

        // Weighted Total Score
        const weightedTotal = 
          (priceScore * 0.6) + 
          (deliveryScore * 0.2) + 
          (warrantyScore * 0.1) + 
          (technicalScore * 0.1);

        return {
          ...supplier,
          priceScore: Math.round(priceScore * 100) / 100,
          deliveryScore: Math.round(deliveryScore * 100) / 100,
          warrantyScore: Math.round(warrantyScore * 100) / 100,
          technicalCriterionScore: Math.round(technicalScore * 100) / 100,
          weightedTotalScore: Math.round(weightedTotal * 100) / 100,
        };
      });

      // Update database with calculated scores
      for (const supplier of scoredSuppliers) {
        await db.update(quotationAnalysisSuppliers)
          .set({
            priceScore: supplier.priceScore,
            deliveryScore: supplier.deliveryScore,
            warrantyScore: supplier.warrantyScore,
            technicalCriterionScore: supplier.technicalCriterionScore,
            weightedTotalScore: supplier.weightedTotalScore,
          })
          .where(eq(quotationAnalysisSuppliers.id, supplier.id));
      }

      // Return scored suppliers sorted by weighted total score
      return scoredSuppliers.sort((a, b) => (b.weightedTotalScore || 0) - (a.weightedTotalScore || 0));
    }),

  /**
   * Generate QA PDF with multi-criteria scoring
   */
  generatePDF: scopedProcedure
    .input(z.object({
      purchaseRequestId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { purchaseRequestId } = input;
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();

      // Get QA with all related data
      const [qa] = await db.select()
        .from(quotationAnalyses)
        .where(and(
          eq(quotationAnalyses.purchaseRequestId, purchaseRequestId),
          eq(quotationAnalyses.organizationId, organizationId)
        ))
        .limit(1);

      if (!qa) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "QA not found",
        });
      }

      // Get PR details
      const [pr] = await db.select()
        .from(purchaseRequests)
        .where(eq(purchaseRequests.id, purchaseRequestId))
        .limit(1);

      if (!pr) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Purchase Request not found",
        });
      }

      // Get line items
      const lineItems = await db.select()
        .from(purchaseRequestLineItems)
        .where(eq(purchaseRequestLineItems.purchaseRequestId, purchaseRequestId))
        .orderBy(purchaseRequestLineItems.lineNumber);

      // Get suppliers with scores
      const qaSuppliers = await db.select()
        .from(quotationAnalysisSuppliers)
        .where(eq(quotationAnalysisSuppliers.quotationAnalysisId, qa.id))
        .orderBy(desc(quotationAnalysisSuppliers.weightedTotalScore));

      // Get supplier names
      const supplierIds = qaSuppliers.map(s => s.supplierId);
      const supplierRecords = await db.select()
        .from(vendors)
        .where(sql`${vendors.id} IN (${sql.join(supplierIds, sql`, `)})`);

      const supplierMap = new Map(supplierRecords.map(v => [v.id, v]));

      // Get line item offers
      const qaLineItems = await db.select()
        .from(quotationAnalysisLineItems)
        .where(eq(quotationAnalysisLineItems.quotationAnalysisId, qa.id));

      // Build supplier offers
      const suppliers = qaSuppliers.map((s, index) => {
        const vendor = supplierMap.get(s.supplierId);
        const lineOffers = qaLineItems
          .filter(li => li.supplierId === s.supplierId)
          .map(li => ({
            lineItemId: li.lineItemId,
            unitPrice: li.unitPrice || "0",
          }));

        return {
          supplierId: s.supplierId,
          supplierName: vendor?.name || `Supplier ${s.supplierId}`,
          totalAmount: s.totalAmount || "0",
          lineOffers,
          priceScore: Number(s.priceScore) || 0,
          deliveryScore: Number(s.deliveryScore) || 0,
          warrantyScore: Number(s.warrantyScore) || 0,
          technicalCriterionScore: Number(s.technicalCriterionScore) || 0,
          weightedTotalScore: Number(s.weightedTotalScore) || 0,
          rank: index + 1,
          isWinner: s.id === qa.selectedSupplierId,
        };
      });

      // Get selected supplier name
      const selectedSupplier = suppliers.find(s => s.isWinner);

      // Build PDF data
      const pdfData = {
        organizationName: pr.organizationName || undefined,
        organizationLogo: undefined, // TODO: Get from organization settings
        qaNumber: qa.qaNumber,
        date: qa.createdAt ? new Date(qa.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
        prNumber: pr.prNumber,
        prTitle: pr.title || "N/A",
        prTotal: pr.totalCost || "0",
        currency: pr.currency || "USD",
        lineItems: lineItems.map(li => ({
          lineNumber: li.lineNumber,
          description: li.description || "N/A",
          quantity: Number(li.quantity) || 0,
          unit: li.unit || "Piece",
          prUnitPrice: li.unitPrice || "0",
        })),
        suppliers,
        selectedSupplierName: selectedSupplier?.supplierName,
        evaluationReport: qa.evaluationReport || undefined,
      };

      return pdfData;
    }),
});
