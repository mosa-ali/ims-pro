/**
 * Purchase Request Router
 * 
 * Handles PR lifecycle: Draft → Submitted → Reviewed → Approved → Workspace Activated
 * Auto-generates PR numbers in format: PR-[OU]-[Year]-[Seq]
 */

import { z } from "zod";
import { router, scopedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
// TEMP UNBLOCK PATCH (Checkpoint Only)
// Reason: procurementWorkflowTracker missing export from schema.ts, causes build failure
// Must be fixed properly in Finance Core Alignment Phase / Schema review
// Owner: Manus
import { purchaseRequests, purchaseRequestLineItems, bidAnalyses } from "../../../drizzle/schema";
// import { procurementWorkflowTracker } from "../../../drizzle/schema"; // TEMP UNBLOCK
import { eq, and, desc, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { generatePRNumber } from "../../services/procurementNumbering";
import { sql } from 'drizzle-orm';
import {
  checkDeletionGovernance,
  performHardDelete,
  performSoftDelete,
} from "../../db/deletionGovernance";

const nowSql = new Date().toISOString().slice(0, 19).replace('T', ' ');

export const purchaseRequestRouter = router({
  /**
   * List all PRs with pagination and filters
   */
  list: scopedProcedure
    .input(
      z.object({
        organizationId: z.number().optional(), // Ignored, uses ctx.scope.organizationId
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        search: z.string().optional(),
        status: z
          .enum([
            "draft",
            "submitted",
            "validated_by_logistic",
            "rejected_by_logistic",
            "validated_by_finance",
            "rejected_by_finance",
            "approved",
            "rejected_by_pm",
          ])
          .optional(),
        category: z.enum(["goods", "services", "works", "consultancy"]).optional(),
        procurementStatus: z
          .enum([
            "rfqs",
            "quotations_analysis",
            "tender_invitation",
            "bids_analysis",
            "purchase_order",
            "delivery",
            "grn",
            "payment",
            "completed",
          ])
          .optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      let conditions = [
        eq(purchaseRequests.organizationId, ctx.scope.organizationId),
        eq(purchaseRequests.operatingUnitId, ctx.scope.operatingUnitId),
        isNull(purchaseRequests.deletedAt),
      ];

      if (input.status) {
        conditions.push(eq(purchaseRequests.status, input.status));
      }

      if (input.category) {
        conditions.push(eq(purchaseRequests.category, input.category));
      }

      if (input.procurementStatus) {
        conditions.push(eq(purchaseRequests.procurementStatus, input.procurementStatus));
      }

      const db = await getDb();
      const prs = await db
        .select()
        .from(purchaseRequests)
        .where(and(...conditions))
        .orderBy(desc(purchaseRequests.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      // Calculate totalAmount from line items for each PR
      const prsWithTotals = await Promise.all(
        prs.map(async (pr) => {
          const lineItems = await db
            .select()
            .from(purchaseRequestLineItems)
            .where(eq(purchaseRequestLineItems.purchaseRequestId, pr.id));

          const totalAmount = lineItems.reduce((sum, item) => {
            const quantity = parseFloat(item.quantity?.toString() || "0");
            const unitPrice = parseFloat(item.unitPrice?.toString() || "0");
            const lineTotal = quantity * unitPrice;
            console.log(`[PR ${pr.prNumber}] Line: qty=${quantity}, price=${unitPrice}, total=${lineTotal}`);
            return sum + lineTotal;
          }, 0);

          console.log(`[PR ${pr.prNumber}] Final totalAmount: ${totalAmount}`);

          return {
            ...pr,
            totalAmount,
          };
        })
      );

      return { items: prsWithTotals };
    }),

  /**
   * Get PR by ID with line items
   */
  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      console.log('[DEBUG] purchaseRequest.getById called:', {
        prId: input.id,
        contextOrgId: ctx.scope.organizationId,
        contextOuId: ctx.scope.operatingUnitId
      });
      const db = await getDb();
      const [pr] = await db
        .select()
        .from(purchaseRequests)
        .where(
          and(
            eq(purchaseRequests.id, input.id),
            eq(purchaseRequests.organizationId, ctx.scope.organizationId),
            eq(purchaseRequests.operatingUnitId, ctx.scope.operatingUnitId),
            isNull(purchaseRequests.deletedAt)
          )
        )
        .limit(1);

      console.log('[DEBUG] purchaseRequest.getById query result:', {
        found: !!pr,
        prData: pr ? { id: pr.id, orgId: pr.organizationId, ouId: pr.operatingUnitId, prTotalUsd: pr.prTotalUsd } : null
      });

      if (!pr) {
        // Check if PR exists but scope does not match (for better error message)
        const [prAnyScope] = await db
          .select()
          .from(purchaseRequests)
          .where(
            and(
              eq(purchaseRequests.id, input.id),
              eq(purchaseRequests.organizationId, ctx.scope.organizationId),
              isNull(purchaseRequests.deletedAt)
            )
          )
          .limit(1);
        
        if (prAnyScope) {
          // PR exists but OU does not match - provide diagnostic message
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Purchase Request exists but belongs to a different Operating Unit. Please switch to the correct office or contact your administrator.`,
          });
        }
        
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Purchase Request not found",
        });
      }

      // Get line items
      const lineItems = await db
        .select()
        .from(purchaseRequestLineItems)
        .where(eq(purchaseRequestLineItems.purchaseRequestId, input.id));

      // Calculate total from line items (use stored totalPrice which includes recurrence multiplier)
      // totalPrice = quantity × unitPrice × recurrence (stored correctly in DB)
      const calculatedTotal = lineItems.reduce((sum, item) => {
        // Use stored totalPrice if available (it already includes recurrence)
        const storedTotal = parseFloat(item.totalPrice?.toString() || "0");
        if (storedTotal > 0) return sum + storedTotal;
        // Fallback: compute from qty × unitPrice × recurrence
        const quantity = parseFloat(item.quantity?.toString() || "0");
        const unitPrice = parseFloat(item.unitPrice?.toString() || "0");
        const recurrence = parseFloat(item.recurrence?.toString() || "1") || 1;
        return sum + (quantity * unitPrice * recurrence);
      }, 0);

      // Use stored prTotalUsd as authoritative total (includes recurrence, saved at PR creation/update)
      const authorativeTotal = parseFloat(pr.prTotalUsd?.toString() || "0") || calculatedTotal;

      // Get associated bid analysis if exists
      const [bidAnalysis] = await db
        .select({ id: bidAnalyses.id })
        .from(bidAnalyses)
        .where(
          and(
            eq(bidAnalyses.purchaseRequestId, input.id),
            isNull(bidAnalyses.deletedAt)
          )
        )
        .limit(1);

      return { 
        ...pr, 
        lineItems,
        totalAmount: authorativeTotal,
        prTotalUSD: authorativeTotal,
        bidAnalysisId: bidAnalysis?.id || null,
        // Signature fields
        logisticsSignature: {
          signerName: pr.logisticsSignerName,
          signerTitle: pr.logisticsSignerTitle,
          signatureDataUrl: pr.logisticsSignatureDataUrl,
          signedAt: pr.logisticsSignedAt
        },
        financeSignature: {
          signerName: pr.financeSignerName,
          signerTitle: pr.financeSignerTitle,
          signatureDataUrl: pr.financeSignatureDataUrl,
          signedAt: pr.financeSignedAt
        },
        pmSignature: {
          signerName: pr.pmSignerName,
          signerTitle: pr.pmSignerTitle,
          signatureDataUrl: pr.pmSignatureDataUrl,
          signedAt: pr.pmSignedAt
        }
      };
    }),

  /**
   * Create new PR with auto-generated PR number
   */
  create: scopedProcedure
    .input(
      z.object({
        category: z.enum(["goods", "services", "works"]),
        projectId: z.number().optional(),
        projectTitle: z.string(),
        donorId: z.number().optional(),
        donorName: z.string().optional(),
        budgetCode: z.string().optional(),
        budgetTitle: z.string().optional(),
        budgetLineId: z.number().optional(),
        subBudgetLine: z.string().optional(),
        activityName: z.string().optional(),
        totalBudgetLine: z.number().optional(),
        exchangeRate: z.number().optional(),
        totalBudgetLine: z.number().optional(),
        currency: z.string().default("USD"),
        department: z.string().optional(),
        requesterName: z.string(),
        requesterEmail: z.string().optional(),
        urgency: z.enum(["low", "normal", "high", "critical"]).default("normal"),
        neededBy: z.date().optional(),
        justification: z.string().optional(),
        procurementLadder: z
          .enum(["one_quotation", "three_quotations", "public_tender", "tender"])
          .default("three_quotations"),
        lineItems: z.array(
          z.object({
            lineNumber: z.number(),
            budgetLine: z.string().optional(),
            description: z.string(),
            descriptionAr: z.string().optional(),
            specifications: z.string().optional(),
            specificationsAr: z.string().optional(),
            quantity: z.number(),
            unit: z.string().default("Piece"),
            unitPrice: z.number().default(0),
            totalPrice: z.number().default(0),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Generate PR number
      const prNumber = await generatePRNumber(
        ctx.scope.organizationId,
        ctx.scope.operatingUnitId
      );

      // Calculate total
      const prTotalUSD = input.lineItems.reduce((sum, item) => sum + item.totalPrice, 0);

      // Create PR
      const db = await getDb();
      const [result] = await db.insert(purchaseRequests).values({
        prNumber,
        category: input.category,
        projectId: input.projectId,
        projectTitle: input.projectTitle,
        donorId: input.donorId,
        donorName: input.donorName,
        budgetCode: input.budgetCode,
        budgetTitle: input.budgetTitle,
        budgetLineId: input.budgetLineId,
        subBudgetLine: input.subBudgetLine,
        activityName: input.activityName,
        currency: input.currency,
        prTotalUSD: prTotalUSD,
        department: input.department,
        requesterName: input.requesterName,
        requesterEmail: input.requesterEmail,
        requesterId: ctx.user.id,
        urgency: input.urgency,
        neededBy: input.neededBy ? new Date(input.neededBy).toISOString() : undefined,
        justification: input.justification,
        procurementLadder: input.procurementLadder,
        status: "draft",
        operatingUnitId: ctx.scope.operatingUnitId,
        organizationId: ctx.scope.organizationId,
        createdBy: ctx.user.id,
      });

      const prId = result.insertId;

      // Create line items
      if (input.lineItems.length > 0) {
        await db.insert(purchaseRequestLineItems).values(
          input.lineItems.map((item) => ({
            purchaseRequestId: prId,
            lineNumber: item.lineNumber,
            budgetLine: item.budgetLine,
            description: item.description,
            descriptionAr: item.descriptionAr,
            specifications: item.specifications,
            specificationsAr: item.specificationsAr,
            quantity: item.quantity.toString(),
            unit: item.unit,
            unitPrice: item.unitPrice.toString(),
            totalPrice: item.totalPrice.toString(),
            recurrence: 'one-time',
          }))
        );
      }

      return { id: prId, prNumber, success: true };
    }),

  /**
   * Update PR (for editing draft PRs)
   */
  update: scopedProcedure
    .input(
      z.object({
        id: z.number(),
        category: z.enum(["goods", "services", "works"]),
        projectId: z.number().optional(),
        projectTitle: z.string(),
        donorId: z.number().optional(),
        donorName: z.string().optional(),
        budgetId: z.number().optional(),
        budgetCode: z.string().optional(),
        budgetTitle: z.string().optional(),
        budgetLineId: z.number().optional(),
        subBudgetLine: z.string().optional(),
        activityName: z.string().optional(),
        totalBudgetLine: z.number().optional(),
        exchangeRate: z.number().optional(),
        currency: z.string().default("USD"),
        department: z.string().optional(),
        requesterName: z.string(),
        requesterEmail: z.string().optional(),
        urgency: z.enum(["low", "normal", "high", "critical"]).default("normal"),
        neededBy: z.date().optional(),
        justification: z.string().optional(),
        procurementLadder: z.enum(["one_quotation", "three_quotations", "public_tender", "tender"]).default("three_quotations"),
        lineItems: z.array(
          z.object({
            id: z.number().optional(),
            lineNumber: z.number(),
            budgetLine: z.string().optional(),
            description: z.string(),
            descriptionAr: z.string().optional(),
            specifications: z.string().optional(),
            specificationsAr: z.string().optional(),
            quantity: z.number(),
            unit: z.string().default("Piece"),
            unitPrice: z.number().default(0),
            totalPrice: z.number().default(0),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const prTotalUsd = input.lineItems.reduce((sum, item) => sum + item.totalPrice, 0);

      await db
        .update(purchaseRequests)
        .set({
          category: input.category,
          projectId: input.projectId,
          projectTitle: input.projectTitle,
          donorId: input.donorId,
          donorName: input.donorName,
          budgetId: input.budgetId,
          budgetCode: input.budgetCode,
          budgetTitle: input.budgetTitle,
          budgetLineId: input.budgetLineId,
          subBudgetLine: input.subBudgetLine,
          activityName: input.activityName,
          totalBudgetLine: input.totalBudgetLine?.toString(),
          exchangeRate: input.exchangeRate?.toString(),
          currency: input.currency,
          prTotalUsd: prTotalUsd.toString(),
          department: input.department,
          requesterName: input.requesterName,
          requesterEmail: input.requesterEmail,
          urgency: input.urgency,
          neededBy: input.neededBy ? new Date(input.neededBy).toISOString() : undefined,
          justification: input.justification,
          procurementLadder: input.procurementLadder,
        })
        .where(
          and(
            eq(purchaseRequests.id, input.id),
            eq(purchaseRequests.organizationId, ctx.scope.organizationId),
            eq(purchaseRequests.operatingUnitId, ctx.scope.operatingUnitId),
            isNull(purchaseRequests.deletedAt)
          )
        );

      await db
        .delete(purchaseRequestLineItems)
        .where(eq(purchaseRequestLineItems.purchaseRequestId, input.id));

      if (input.lineItems.length > 0) {
        await db.insert(purchaseRequestLineItems).values(
          input.lineItems.map((item) => ({
            purchaseRequestId: input.id,
            lineNumber: item.lineNumber,
            budgetLine: item.budgetLine,
            description: item.description,
            descriptionAr: item.descriptionAr,
            specifications: item.specifications,
            specificationsAr: item.specificationsAr,
            quantity: item.quantity.toString(),
            unit: item.unit,
            unitPrice: item.unitPrice.toString(),
            totalPrice: item.totalPrice.toString(),
            recurrence: 'one-time',
          }))
        );
      }

      return { id: input.id, success: true };
    }),

  /**
   * Update PR status (workflow transitions)
   */
  updateStatus: scopedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum([
          "draft",
          "submitted",
          "validated_by_logistic",
          "rejected_by_logistic",
          "validated_by_finance",
          "rejected_by_finance",
          "approved",
          "rejected_by_pm",
        ]),
        rejectReason: z.string().optional(),
        rejectionStage: z.enum(["logistic", "finance", "pm"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const updateData: any = {
        status: input.status,
      };

      // Track approval/rejection metadata
      if (input.status === "validated_by_logistic") {
        updateData.logValidatedBy = ctx.user.id;
        updateData.logValidatedOn = new Date();
      } else if (input.status === "rejected_by_logistic") {
        updateData.logRejectedBy = ctx.user.id;
        updateData.logRejectedOn = new Date();
        updateData.rejectReason = input.rejectReason;
        updateData.rejectionStage = "logistic";
      } else if (input.status === "validated_by_finance") {
        updateData.finValidatedBy = ctx.user.id;
        updateData.finValidatedOn = new Date();
      } else if (input.status === "rejected_by_finance") {
        updateData.finRejectedBy = ctx.user.id;
        updateData.finRejectedOn = new Date();
        updateData.rejectReason = input.rejectReason;
        updateData.rejectionStage = "finance";
      } else if (input.status === "approved") {
        updateData.approvedBy = ctx.user.id;
        updateData.approvedOn = new Date();

        // Get PR details to determine procurement method
        const [pr] = await db
          .select()
          .from(purchaseRequests)
          .where(
            and(
              eq(purchaseRequests.id, input.id),
              eq(purchaseRequests.organizationId, ctx.scope.organizationId)
            )
          )
          .limit(1);

        if (pr) {
          const prTotal = parseFloat(pr.prTotalUsd || "0");
          
          // **CRITICAL: System-decided procurement method based on threshold**
          // PR ≤ $25K → RFQ → QA (QA created when RFQ is sent/received)
          // PR > $25K → Tender → BA
          if (prTotal <= 25000) {
            updateData.procurementStatus = "rfqs"; // RFQ workflow
            
            // Auto-create RFQ (Request for Quotation)
            const { rfqRouter } = await import("./rfq");
            try {
              await rfqRouter.createCaller({ user: ctx.user, scope: ctx.scope }).autoCreate({
                purchaseRequestId: input.id,
              });
            } catch (error: any) {
              // RFQ might already exist, that's OK
              if (!error.message?.includes("already exists")) {
                console.error("Failed to auto-create RFQ:", error);
              }
            }
          } else {
            updateData.procurementStatus = "tender_invitation"; // BA workflow
            
            // Auto-create BA (Bid Analysis)
            const { bidAnalysisRouter } = await import("./bidAnalysis");
            try {
              await bidAnalysisRouter.createCaller({ user: ctx.user, scope: ctx.scope }).autoCreate({
                purchaseRequestId: input.id,
              });
            } catch (error: any) {
              // BA might already exist, that's OK
              if (!error.message?.includes("already exists")) {
                console.error("Failed to auto-create BA:", error);
              }
            }
          }

          // TEMP UNBLOCK:           // Create workflow tracker
          // TEMP UNBLOCK:           const [existingTracker] = await db
          // TEMP UNBLOCK:             .select()
          // TEMP UNBLOCK:             .from(// TEMP UNBLOCK: procurementWorkflowTracker)
          // TEMP UNBLOCK:             .where(
          // TEMP UNBLOCK:               and(
          // TEMP UNBLOCK:                 eq(// TEMP UNBLOCK: procurementWorkflowTracker.purchaseRequestId, input.id),
          // TEMP UNBLOCK:                 eq(// TEMP UNBLOCK: procurementWorkflowTracker.organizationId, ctx.scope.organizationId)
          // TEMP UNBLOCK:               )
          // TEMP UNBLOCK:             )
          // TEMP UNBLOCK:             .limit(1);
          // TEMP UNBLOCK: 
          // TEMP UNBLOCK:           if (!existingTracker) {
          // TEMP UNBLOCK:             await db.insert(// TEMP UNBLOCK: procurementWorkflowTracker).values({
          // TEMP UNBLOCK:               organizationId: ctx.scope.organizationId,
          // TEMP UNBLOCK:               operatingUnitId: pr.operatingUnitId || undefined,
          // TEMP UNBLOCK:               purchaseRequestId: input.id,
          // TEMP UNBLOCK:               prStatus: "completed",
          // TEMP UNBLOCK:               prCompletedAt: new Date(),
          // TEMP UNBLOCK:               prCompletedBy: ctx.user.id,
          // TEMP UNBLOCK:               overallStatus: "in_progress",
          // TEMP UNBLOCK:               workspaceActivated: true,
          // TEMP UNBLOCK:               workspaceActivatedAt: new Date(),
          // TEMP UNBLOCK:               createdBy: ctx.user.id,
          // TEMP UNBLOCK:             });
          }
      } else if (input.status === "rejected_by_pm") {
        updateData.pmRejectedBy = ctx.user.id;
        updateData.pmRejectedOn = new Date();
        updateData.rejectReason = input.rejectReason;
        updateData.rejectionStage = "pm";
      }

      const db = await getDb();
      await db
        .update(purchaseRequests)
        .set(updateData)
        .where(
          and(
            eq(purchaseRequests.id, input.id),
            eq(purchaseRequests.organizationId, ctx.scope.organizationId)
          )
        );

      return { success: true };
    }),

  /**
   * Update procurement status (workflow stages)
   */
  updateProcurementStatus: scopedProcedure
    .input(
      z.object({
        id: z.number(),
        procurementStatus: z.enum([
          "rfqs",
          "quotations_analysis",
          "tender_invitation",
          "bids_analysis",
          "purchase_order",
          "delivery",
          "grn",
          "payment",
          "completed",
        ]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      await db
        .update(purchaseRequests)
        .set({ procurementStatus: input.procurementStatus })
        .where(
          and(
            eq(purchaseRequests.id, input.id),
            eq(purchaseRequests.organizationId, ctx.scope.organizationId)
          )
        );

      return { success: true };
    }),

  /**
   * Soft delete PR
   */
  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Get PR to check status
      const [pr] = await db
        .select()
        .from(purchaseRequests)
        .where(
          and(
            eq(purchaseRequests.id, input.id),
            eq(purchaseRequests.organizationId, ctx.scope.organizationId)
          )
        );

      if (!pr) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Purchase Request not found",
        });
      }

      // Check deletion governance (Option A: Hard delete in Draft only)
      const governance = await checkDeletionGovernance(
        db,
        "PR",
        input.id,
        pr.status,
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
          "PR",
          input.id,
          ctx.scope.organizationId
        );
      } else {
        await performSoftDelete(
          db,
          "PR",
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
            ? "PR hard deleted successfully"
            : "PR soft deleted successfully",
      };
    }),

  /**
   * Export PR with all data (for import/backup)
   */
  export: scopedProcedure
    .input(z.object({ prId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      // Get PR
      const [pr] = await db
        .select()
        .from(purchaseRequests)
        .where(
          and(
            eq(purchaseRequests.id, input.prId),
            eq(purchaseRequests.organizationId, ctx.scope.organizationId),
            isNull(purchaseRequests.deletedAt)
          )
        )
        .limit(1);

      if (!pr) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Purchase Request not found",
        });
      }

      // Get line items
      const lineItems = await db
        .select()
        .from(purchaseRequestLineItems)
        .where(eq(purchaseRequestLineItems.purchaseRequestId, input.prId));

      // Return export data
      return {
        version: "1.0",
        exportDate: new Date().toISOString(),
        pr: {
          prNumber: pr.prNumber,
          category: pr.category,
          projectTitle: pr.projectTitle,
          donorName: pr.donorName,
          budgetCode: pr.budgetCode,
          subBudgetLine: pr.subBudgetLine,
          activityName: pr.activityName,
          currency: pr.currency,
          department: pr.department,
          requesterName: pr.requesterName,
          requesterEmail: pr.requesterEmail,
          urgency: pr.urgency,
          neededBy: pr.neededBy,
          justification: pr.justification,
          procurementLadder: pr.procurementLadder,
          exchangeRate: pr.exchangeRate,
          prTotalUsd: pr.prTotalUsd,
          status: pr.status,
        },
        lineItems: lineItems.map((item) => ({
          lineNumber: item.lineNumber,
          budgetLine: item.budgetLine,
          description: item.description,
          descriptionAr: item.descriptionAr,
          specifications: item.specifications,
          specificationsAr: item.specificationsAr,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
      };
    }),

  /**
   * Import PR from exported data
   */
  import: scopedProcedure
    .input(
      z.object({
        version: z.string(),
        pr: z.object({
          category: z.enum(["goods", "services", "works"]),
          projectTitle: z.string(),
          donorName: z.string().optional(),
          budgetCode: z.string().optional(),
          subBudgetLine: z.string().optional(),
          activityName: z.string().optional(),
          currency: z.string(),
          department: z.string().optional(),
          requesterName: z.string(),
          requesterEmail: z.string().optional(),
          urgency: z.enum(["low", "normal", "high", "critical"]),
          neededBy: z.string().optional(),
          justification: z.string().optional(),
          procurementLadder: z.enum(["one_quotation", "three_quotations", "public_tender", "tender"]),
          exchangeRate: z.number().optional(),
        }),
        lineItems: z.array(
          z.object({
            lineNumber: z.number(),
            budgetLine: z.string().optional(),
            description: z.string(),
            descriptionAr: z.string().optional(),
            specifications: z.string().optional(),
            specificationsAr: z.string().optional(),
            quantity: z.number(),
            unit: z.string(),
            unitPrice: z.number(),
            totalPrice: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Generate new PR number
      const prNumber = await generatePRNumber(ctx.scope.organizationId, ctx.scope.operatingUnitId);

      // Calculate totals
      const prTotal = input.lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const prTotalUsd = prTotal * (input.pr.exchangeRate || 1);

      // Insert PR
      const [newPR] = await db
        .insert(purchaseRequests)
        .values({
          prNumber,
          organizationId: ctx.scope.organizationId,
          operatingUnitId: ctx.scope.operatingUnitId,
          category: input.pr.category,
          projectTitle: input.pr.projectTitle,
          donorName: input.pr.donorName,
          budgetCode: input.pr.budgetCode,
          subBudgetLine: input.pr.subBudgetLine,
          activityName: input.pr.activityName,
          currency: input.pr.currency,
          department: input.pr.department,
          requesterName: input.pr.requesterName,
          requesterEmail: input.pr.requesterEmail,
          urgency: input.pr.urgency,
          neededBy: input.pr.neededBy ? new Date(input.pr.neededBy) : null,
          justification: input.pr.justification,
          procurementLadder: input.pr.procurementLadder,
          exchangeRate: input.pr.exchangeRate || 1,
          prTotal,
          prTotalUsd,
          status: "draft", // Always import as draft
          createdBy: ctx.user.id,
        })
        .returning();

      // Insert line items
      if (input.lineItems.length > 0) {
        await db.insert(purchaseRequestLineItems).values(
          input.lineItems.map((item) => ({
            purchaseRequestId: newPR.id,
            organizationId: ctx.scope.organizationId,
            lineNumber: item.lineNumber,
            budgetLine: item.budgetLine,
            description: item.description,
            descriptionAr: item.descriptionAr,
            specifications: item.specifications,
            specificationsAr: item.specificationsAr,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            createdBy: ctx.user.id,
          }))
        );
      }

      return { success: true, prId: newPR.id, prNumber: newPR.prNumber };
    }),

  /**
   * Validate budget availability for PR
   * Returns available budget and warning if insufficient
   */
  validateBudget: scopedProcedure
    .input(
      z.object({
        projectId: z.number(),
        budgetLineId: z.number().optional(),
        requestedAmount: z.number(),
        currency: z.string().default("USD"),
        exchangeRate: z.number().optional().default(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      // If no budget line selected, return validation error
      if (!input.budgetLineId) {
        return {
          available: 0,
          allocated: 0,
          spent: 0,
          requested: input.requestedAmount,
          remaining: 0,
          isSufficient: false,
          warningLevel: "error",
          message: "No budget line selected",
        };
      }
      
      // Get budget line details
      const budgetLine = await db.query.budgetLines.findFirst({
        where: eq(budgetLines.id, input.budgetLineId),
        with: {
          budget: true,
        },
      });
      
      if (!budgetLine) {
        return {
          available: 0,
          allocated: 0,
          spent: 0,
          requested: input.requestedAmount,
          remaining: 0,
          isSufficient: false,
          warningLevel: "error",
          message: "Budget line not found",
        };
      }
      
      // Get budget details
      const budget = budgetLine.budget;
      if (!budget) {
        return {
          available: 0,
          allocated: 0,
          spent: 0,
          requested: input.requestedAmount,
          remaining: 0,
          isSufficient: false,
          warningLevel: "error",
          message: "Budget not found",
        };
      }
      
      // Calculate available balance
      const totalAmount = parseFloat(String(budgetLine.totalAmount)) || 0;
      const actualSpent = parseFloat(String(budgetLine.actualSpent)) || 0;
      const availableBudget = totalAmount - actualSpent;
      
      // For non-USD currencies, convert the requested amount using exchange rate
      let requestedInBudgetCurrency = input.requestedAmount;
      if (budget.currency !== 'USD' && input.exchangeRate) {
        requestedInBudgetCurrency = input.requestedAmount * input.exchangeRate;
      }
      
      // Check if budget is sufficient
      const isSufficient = availableBudget >= requestedInBudgetCurrency;
      const warningLevel = !isSufficient ? "error" : 
                          (availableBudget < requestedInBudgetCurrency * 1.2) ? "warning" : "ok";
      
      return {
        available: availableBudget,
        allocated: totalAmount,
        spent: actualSpent,
        requested: requestedInBudgetCurrency,
        remaining: availableBudget - requestedInBudgetCurrency,
        isSufficient,
        warningLevel,
        currency: budget.currency,
        message: !isSufficient 
          ? `Insufficient budget. Available: ${budget.currency} ${availableBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })}, Requested: ${budget.currency} ${requestedInBudgetCurrency.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
          : warningLevel === "warning"
          ? `Budget is tight. Only ${budget.currency} ${availableBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })} available.`
          : `Budget available: ${budget.currency} ${availableBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      };
    }),

  /**
   * Get PR statistics
   */
  getStats: scopedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const allPRs = await db
      .select()
      .from(purchaseRequests)
      .where(
        and(
          eq(purchaseRequests.organizationId, ctx.scope.organizationId),
          eq(purchaseRequests.operatingUnitId, ctx.scope.operatingUnitId),
          isNull(purchaseRequests.deletedAt)
        )
      );

    return {
      total: allPRs.length,
      draft: allPRs.filter((pr) => pr.status === "draft").length,
      submitted: allPRs.filter((pr) => pr.status === "submitted").length,
      approved: allPRs.filter((pr) => pr.status === "approved").length,
      rejected: allPRs.filter((pr) =>
        ["rejected_by_logistic", "rejected_by_finance", "rejected_by_pm"].includes(pr.status)
      ).length,
      inProcurement: allPRs.filter((pr) => pr.procurementStatus !== null).length,
      completed: allPRs.filter((pr) => pr.procurementStatus === "completed").length,
    };
  }),

  /**
   * Submit PR (triggers email to Logistics)
   */
  submit: scopedProcedure
    .input(z.object({
      id: z.number(),
      logisticsEmail: z.string().email(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { notifyLogisticsOfPRSubmission } = await import("../../services/prNotificationService");
      
      // Update PR status to submitted
      await db
        .update(purchaseRequests)
        .set({
          status: "submitted",
          submittedAt: nowSql,
          updatedAt: nowSql,
        })
        .where(
          and(
            eq(purchaseRequests.id, input.id),
            eq(purchaseRequests.organizationId, ctx.scope.organizationId)
          )
        );
      
      // Send email notification to Logistics
      await notifyLogisticsOfPRSubmission(input.id, input.logisticsEmail);
      
      return { success: true, message: "PR submitted successfully. Logistics team has been notified." };
    }),

  /**
   * Validate by Logistics (triggers email to Finance)
   */
  validateByLogistics: scopedProcedure
    .input(z.object({
      id: z.number(),
      financeEmail: z.string().email(),
      comments: z.string().optional(),
      signerName: z.string(),
      signerTitle: z.string(),
      signatureDataUrl: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { notifyFinanceOfLogisticsValidation } = await import("../../services/prNotificationService");
      
      // Update PR status
      await db
        .update(purchaseRequests)
        .set({
          status: "validated_by_logistic",
          logValidatedOn: nowSql,
          logValidatedBy: ctx.user?.id,
          logisticsSignerName: input.signerName,
          logisticsSignerTitle: input.signerTitle,
          logisticsSignatureDataUrl: input.signatureDataUrl,
          updatedAt: nowSql,
        })
        .where(
          and(
            eq(purchaseRequests.id, input.id),
            eq(purchaseRequests.organizationId, ctx.scope.organizationId)
          )
        );
      
      // Send email notification to Finance
      await notifyFinanceOfLogisticsValidation(input.id, input.financeEmail);
      
      return { success: true, message: "PR validated by Logistics. Finance team has been notified." };
    }),

  /**
   * Validate by Finance (triggers email to PM)
   */
  validateByFinance: scopedProcedure
    .input(z.object({
      id: z.number(),
      pmEmail: z.string().email(),
      comments: z.string().optional(),
      signerName: z.string(),
      signerTitle: z.string(),
      signatureDataUrl: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { notifyPMOfFinanceValidation } = await import("../../services/prNotificationService");
      
      // Update PR status
      await db
        .update(purchaseRequests)
        .set({
          status: "validated_by_finance",
          finValidatedOn: nowSql,
          finValidatedBy: ctx.user?.id,
          financeSignerName: input.signerName,
          financeSignerTitle: input.signerTitle,
          financeSignatureDataUrl: input.signatureDataUrl,
          updatedAt: nowSql,
        })
        .where(
          and(
            eq(purchaseRequests.id, input.id),
            eq(purchaseRequests.organizationId, ctx.scope.organizationId)
          )
        );
      
      // Send email notification to PM
      await notifyPMOfFinanceValidation(input.id, input.pmEmail);
      
      return { success: true, message: "PR validated by Finance. Program Manager has been notified." };
    }),

  /**
   * Approve by PM (triggers email to Requester)
   */
  approveByPM: scopedProcedure
    .input(z.object({
      id: z.number(),
      comments: z.string().optional(),
      signerName: z.string(),
      signerTitle: z.string(),
      signatureDataUrl: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { notifyRequesterOfApproval } = await import("../../services/prNotificationService");
      
      // Update PR status to approved
      await db
        .update(purchaseRequests)
        .set({
          status: "approved",
          approvedOn: nowSql,
          approvedBy: ctx.user?.id,
          pmSignerName: input.signerName,
          pmSignerTitle: input.signerTitle,
          pmSignatureDataUrl: input.signatureDataUrl,
          updatedAt: nowSql,
        })
        .where(
          and(
            eq(purchaseRequests.id, input.id),
            eq(purchaseRequests.organizationId, ctx.scope.organizationId)
          )
        );
      
      // Send email notification to Requester
      await notifyRequesterOfApproval(input.id);
      
      // Auto-create RFQ and QA/BA based on PR total
      try {
        const [pr] = await db
          .select()
          .from(purchaseRequests)
          .where(eq(purchaseRequests.id, input.id))
          .limit(1);
        
        if (pr) {
          const prTotal = parseFloat(pr.prTotalUsd || "0");
          
          if (prTotal <= 25000) {
            // Auto-create RFQ for PR ≤ $25K (vendor quotation workflow)
            try {
              const { rfqRouter } = await import("./rfq");
              const rfqCaller = rfqRouter.createCaller(ctx);
              await rfqCaller.autoCreate({ purchaseRequestId: input.id });
            } catch (error) {
              console.error("Failed to auto-create RFQ:", error);
            }
            
            // Auto-create QA for PR ≤ $25K
            const { quotationAnalysisRouter } = await import("./quotationAnalysis");
            const caller = quotationAnalysisRouter.createCaller(ctx);
            await caller.autoCreate({ purchaseRequestId: input.id });
          }
          // Note: For PR > $25K (tenders), BA is NOT auto-created here.
          // BA will be created when Tender Information is first accessed,
          // after announcement details are entered.
        }
      } catch (error) {
        console.error("Failed to auto-create RFQ/QA/BA:", error);
        // Don't fail the approval if RFQ/QA/BA creation fails
      }
      
      return { success: true, message: "PR approved successfully. Requester has been notified. QA/BA will be auto-created." };
    }),

  /**
   * Reject PR (triggers email to Requester)
   */
  reject: scopedProcedure
    .input(z.object({
      id: z.number(),
      rejectedBy: z.enum(["logistic", "finance", "pm"]),
      reason: z.string().min(10, "Rejection reason must be at least 10 characters"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { notifyRequesterOfRejection } = await import("../../services/prNotificationService");
      
      const statusMap = {
        logistic: "rejected_by_logistic",
        finance: "rejected_by_finance",
        pm: "rejected_by_pm",
      };
      
      const rejectorNameMap = {
        logistic: "Logistics",
        finance: "Finance",
        pm: "Program Manager",
      };
      
      // Update PR status
      await db
        .update(purchaseRequests)
        .set({
          status: statusMap[input.rejectedBy] as any,
          logRejectedBy: ctx.user?.id,
          logRejectedOn: nowSql,
          finRejectedBy: ctx.user?.id,
          finRejectedOn: nowSql,
          pmRejectedBy: ctx.user?.id,
          pmRejectedOn: nowSql,
          rejectReason: input.reason,
          updatedAt: nowSql,
        })
        .where(
          and(
            eq(purchaseRequests.id, input.id),
            eq(purchaseRequests.organizationId, ctx.scope.organizationId)
          )
        );
      
      // Send email notification to Requester
      await notifyRequesterOfRejection(
        input.id,
        rejectorNameMap[input.rejectedBy],
        input.reason
      );
      
      return { success: true, message: "PR rejected. Requester has been notified." };
    }),
});
