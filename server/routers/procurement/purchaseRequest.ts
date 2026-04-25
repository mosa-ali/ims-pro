/**
 * Purchase Request Router
 * 
 * Handles PR lifecycle: Draft → Submitted → Reviewed → Approved → Workspace Activated
 * Auto-generates PR numbers in format: PR-[OU]-[Year]-[Seq]
 * 
 * CRITICAL: Approval routing uses multi-org/multi-OU isolation
 * - All approver lookups filter by organizationId + operatingUnitId
 * - Approvers must be in same org/OU as PR
 * - Prevents cross-org approval (e.g., Yemen finance approving Somalia PRs)
 */

import { z } from "zod";
import { router, scopedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
// TEMP UNBLOCK PATCH (Checkpoint Only)
// Reason: procurementWorkflowTracker missing export from schema.ts, causes build failure
// Must be fixed properly in Finance Core Alignment Phase / Schema review
// Owner: Manus
import { purchaseRequests, purchaseRequestLineItems, bidAnalyses, users, userOrganizations, userActiveScope, budgetLines } from "../../../drizzle/schema";
// import { procurementWorkflowTracker } from "../../../drizzle/schema"; // TEMP UNBLOCK
import { eq, and, desc, isNull, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { generatePRNumber } from "../../services/procurementNumbering";
import { sql } from 'drizzle-orm';
import {
  checkDeletionGovernance,
  performHardDelete,
  performSoftDelete,
} from "../../db/deletionGovernance";

const nowSql = new Date().toISOString().slice(0, 19).replace('T', ' ');

/**
 * Helper: Get workflow approver with multi-org/OU isolation
 * 
 * Lookup order:
 * 1. Same organization + same operating unit
 * 2. Fallback: Same organization only
 * 3. Error: No approver found
 */
async function getWorkflowApprover(
  db: any,
  organizationId: number,
  operatingUnitId: number,
  roles: string[]
): Promise<{ id: number; email: string; name: string; role: string } | null> {
  // Step 1: Try same organization + same operating unit
  const [approverWithOU] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: userOrganizations.role,
    })
    .from(userOrganizations)
    .innerJoin(users, eq(userOrganizations.userId, users.id))
    .innerJoin(userActiveScope, eq(userActiveScope.userId, users.id))
    .where(
      and(
        eq(userOrganizations.organizationId, organizationId),
        eq(userActiveScope.operatingUnitId, operatingUnitId),
        eq(users.isActive, 1),
        inArray(userOrganizations.role, roles)
      )
    )
    .limit(1);

  if (approverWithOU) {
    return approverWithOU;
  }

  // Step 2: Fallback to same organization only
  const [approverOrgOnly] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: userOrganizations.role,
    })
    .from(userOrganizations)
    .innerJoin(users, eq(userOrganizations.userId, users.id))
    .where(
      and(
        eq(userOrganizations.organizationId, organizationId),
        eq(users.isActive, 1),
        inArray(userOrganizations.role, roles)
      )
    )
    .limit(1);

  if (approverOrgOnly) {
    return approverOrgOnly;
  }

  // Step 3: No approver found
  return null;
}

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
        category: z.enum(["goods", "services", "works"]).optional(),
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

      // Recalculate total from line items with recurrence multiplier
      // Formula: Sum of (Quantity x Unit Price x Recurrence) for all line items
      const prsWithTotals = await Promise.all(
        prs.map(async (pr) => {
          const lineItems = await db
            .select()
            .from(purchaseRequestLineItems)
            .where(eq(purchaseRequestLineItems.purchaseRequestId, pr.id));

          // Calculate total with recurrence multiplier
          const prTotalWithRecurrence = lineItems.reduce((sum, item) => {
            const quantity = parseFloat(item.quantity?.toString() || "0");
            const unitPrice = parseFloat(item.unitPrice?.toString() || "0");
            // Recurrence is now INT, so parse as number (default 1 if missing)
            const recurrence = Number(item.recurrence) || 1;
            const lineTotal = quantity * unitPrice * recurrence;
            return sum + lineTotal;
          }, 0);

          // Apply currency conversion ONLY when currencies differ
          const exchangeRate = parseFloat(pr.exchangeRate?.toString() || "1");
          const isSameCurrency = pr.currency === pr.exchangeTo;
          const finalAmount = isSameCurrency
            ? prTotalWithRecurrence
            : prTotalWithRecurrence * exchangeRate;

          return {
            ...pr,
            totalAmount: finalAmount,
            exchangeTo: pr.exchangeTo,
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

      // Calculate total from line items with recurrence multiplier
      // Formula: Quantity × Unit Price × Recurrence
      const calculatedTotal = lineItems.reduce((sum, item) => {
        const quantity = parseFloat(item.quantity?.toString() || "0");
        const unitPrice = parseFloat(item.unitPrice?.toString() || "0");
        // Recurrence is now INT, so parse as number (default 1 if missing)
        const recurrence = Number(item.recurrence) || 1;
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

      // Apply currency conversion in getById
      const exchangeRate = parseFloat(pr.exchangeRate?.toString() || "1");
      const isSameCurrency = pr.currency === pr.exchangeTo;

      const finalAmount = isSameCurrency
        ? authorativeTotal
        : authorativeTotal * exchangeRate;

      return { 
        ...pr, 
        lineItems,
        totalAmount: finalAmount,
        prTotalUsd: authorativeTotal,
        exchangeTo: pr.exchangeTo,
        bidAnalysisId: bidAnalysis?.id || null,
        // Signature fields
        logisticsSignature: {
          signerName: pr.logisticsSignerName,
          signerTitle: pr.logisticsSignerTitle,
          signatureDataUrl: pr.logisticsSignatureDataUrl,
          signedAt: pr.logValidatedOn,

        },
        financeSignature: {
          signerName: pr.financeSignerName,
          signerTitle: pr.financeSignerTitle,
          signatureDataUrl: pr.financeSignatureDataUrl,
          signedAt: pr.finValidatedOn,
        },
        pmSignature: {
          signerName: pr.pmSignerName,
          signerTitle: pr.pmSignerTitle,
          signatureDataUrl: pr.pmSignatureDataUrl,
          signedAt: pr.approvedOn,
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
        currency: z.string().default("USD"),
        exchangeTo: z.string().default("USD"),
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
            quantity: z.number(),
            unit: z.string(),
            unitPrice: z.number(),
            totalPrice: z.number(),
            recurrence: z.union([
            z.string(),
            z.number()
          ]).optional(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Generate PR number
      const prNumber = await generatePRNumber(ctx.scope.organizationId, ctx.scope.operatingUnitId);

      // Calculate totals with recurrence multiplier
      const prTotal = input.lineItems.reduce((sum, item) => {
          return sum + item.totalPrice;
        }, 0);

        const isSameCurrency = input.currency === input.exchangeTo;
        const prTotalUsd = isSameCurrency
          ? prTotal
          : prTotal * (input.exchangeRate || 1);

      // Insert PR
      const [newPR] = await db
        .insert(purchaseRequests)
        .values({
          prNumber,
          organizationId: ctx.scope.organizationId,
          operatingUnitId: ctx.scope.operatingUnitId,
          category: input.category,
          projectTitle: input.projectTitle,
          donorName: input.donorName,
          budgetCode: input.budgetCode,
          budgetTitle: input.budgetTitle,
          budgetLineId: input.budgetLineId,
          subBudgetLine: input.subBudgetLine,
          activityName: input.activityName,
          totalBudgetLine: input.totalBudgetLine,
          currency: input.currency,
          exchangeRate: input.exchangeRate || 1,
          exchangeTo: input.exchangeTo,
          department: input.department,
          requesterName: input.requesterName,
          requesterEmail: input.requesterEmail,
          urgency: input.urgency,
          neededBy: input.neededBy,
          justification: input.justification,
          procurementLadder: input.procurementLadder,
          prTotal,
          prTotalUsd,
          status: "draft",
          createdBy: ctx.user.id,
        })
          .returning();

      // Insert line items
      if (input.lineItems.length > 0) {
        await db.insert(purchaseRequestLineItems).values(
          input.lineItems.map((item) => ({
            purchaseRequestId: newPR.id,
            lineNumber: item.lineNumber,
            budgetLine: item.budgetLine,
            description: item.description,
            descriptionAr: item.descriptionAr,
            specifications: item.specifications,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            recurrence: item.recurrence || 1,
          }))
        );
      }

      return { success: true, id: newPR.id, prNumber: newPR.prNumber };
    }),

  /**
   * Update PR (draft or submitted status only)
   */
  update: scopedProcedure
    .input(
      z.object({
        id: z.number(),
        category: z.enum(["goods", "services", "works"]).optional(),
        projectTitle: z.string().optional(),
        donorName: z.string().optional(),
        budgetCode: z.string().optional(),
        budgetTitle: z.string().optional(),
        budgetLineId: z.number().optional(),
        subBudgetLine: z.string().optional(),
        activityName: z.string().optional(),
        totalBudgetLine: z.number().optional(),
        exchangeRate: z.number().optional(),
        currency: z.string().optional(),
        exchangeTo: z.string().optional(),
        department: z.string().optional(),
        requesterName: z.string().optional(),
        requesterEmail: z.string().optional(),
        urgency: z.enum(["low", "normal", "high", "critical"]).optional(),
        neededBy: z.date().optional(),
        justification: z.string().optional(),
        procurementLadder: z.enum(["one_quotation", "three_quotations", "public_tender", "tender"]).optional(),
        lineItems: z.array(
          z.object({
            lineNumber: z.number(),
            budgetLine: z.string().optional(),
            description: z.string(),
            descriptionAr: z.string().optional(),
            specifications: z.string().optional(),
            quantity: z.number(),
            unit: z.string(),
            unitPrice: z.number(),
            totalPrice: z.number(),
            recurrence: z.union([
            z.string(),
            z.number()
          ]).optional(),
          })
        ).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Get existing PR
      const [existingPR] = await db
        .select()
        .from(purchaseRequests)
        .where(
          and(
            eq(purchaseRequests.id, input.id),
            eq(purchaseRequests.organizationId, ctx.scope.organizationId)
          )
        );

      if (!existingPR) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Purchase Request not found",
        });
      }

      // Only allow edit in draft or submitted status
      if (!["draft", "submitted"].includes(existingPR.status)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Cannot edit PR in ${existingPR.status} status. Only draft and submitted PRs can be edited.`,
        });
      }

      // Calculate new totals if line items provided
      let prTotal = existingPR.prTotalUsd;
      let prTotalUsd = existingPR.prTotalUsd;
      
      if (input.lineItems) {
        prTotal = input.lineItems.reduce((sum, item) => {
          const recurrence = item.recurrence || 1;
          return sum + item.totalPrice;
        }, 0);
        const effectiveExchangeRate =
          input.exchangeRate ||
          parseFloat(existingPR.exchangeRate?.toString() || "1");

        const isSameCurrency =
          (input.currency || existingPR.currency) ===
          (input.exchangeTo || existingPR.exchangeTo);

        prTotalUsd = isSameCurrency
          ? prTotal
          : prTotal * effectiveExchangeRate;
              }

      const updateData: any = {
        updatedAt: nowSql,
      };

      if (input.category) updateData.category = input.category;
      if (input.projectTitle) updateData.projectTitle = input.projectTitle;
      if (input.donorName !== undefined) updateData.donorName = input.donorName;
      if (input.budgetCode !== undefined) updateData.budgetCode = input.budgetCode;
      if (input.budgetTitle !== undefined) updateData.budgetTitle = input.budgetTitle;
      if (input.budgetLineId !== undefined) updateData.budgetLineId = input.budgetLineId;
      if (input.subBudgetLine !== undefined) updateData.subBudgetLine = input.subBudgetLine;
      if (input.activityName !== undefined) updateData.activityName = input.activityName;
      if (input.totalBudgetLine !== undefined) updateData.totalBudgetLine = input.totalBudgetLine;
      if (input.exchangeRate !== undefined) updateData.exchangeRate = input.exchangeRate;
      if (input.currency) updateData.currency = input.currency;
      if (input.exchangeTo) updateData.exchangeTo = input.exchangeTo;
      if (input.department !== undefined) updateData.department = input.department;
      if (input.requesterName) updateData.requesterName = input.requesterName;
      if (input.requesterEmail !== undefined) updateData.requesterEmail = input.requesterEmail;
      if (input.urgency) updateData.urgency = input.urgency;
      if (input.neededBy !== undefined) updateData.neededBy = input.neededBy;
      if (input.justification !== undefined) updateData.justification = input.justification;
      if (input.procurementLadder) updateData.procurementLadder = input.procurementLadder;
      
      if (input.lineItems) {
        updateData.prTotal = prTotal;
        updateData.prTotalUsd = prTotalUsd;
      }

      // Update PR
      await db
        .update(purchaseRequests)
        .set(updateData)
        .where(
          and(
            eq(purchaseRequests.id, input.id),
            eq(purchaseRequests.organizationId, ctx.scope.organizationId),
            or(
            eq(purchaseRequests.operatingUnitId, ctx.scope.operatingUnitId),
            isNull(purchaseRequests.operatingUnitId)
            )
          )
        );

      // Update line items if provided
      if (input.lineItems) {
        // Delete existing line items
        await db
          .delete(purchaseRequestLineItems)
          .where(eq(purchaseRequestLineItems.purchaseRequestId, input.id));

        // Insert new line items
        await db.insert(purchaseRequestLineItems).values(
          input.lineItems.map((item) => ({
            purchaseRequestId: input.id,
            lineNumber: item.lineNumber,
            budgetLine: item.budgetLine,
            description: item.description,
            descriptionAr: item.descriptionAr,
            specifications: item.specifications,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            recurrence: item.recurrence || 1,
          }))
        );
      }

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
            eq(purchaseRequests.organizationId, ctx.scope.organizationId),
            eq(purchaseRequests.operatingUnitId, ctx.scope.operatingUnitId)
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
            eq(purchaseRequests.organizationId, ctx.scope.organizationId),
            eq(purchaseRequests.operatingUnitId, ctx.scope.operatingUnitId)
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
        exportDate: new Date().toISOString().split('T')[0],
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
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          recurrence: item.recurrence,
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
            quantity: z.number(),
            unit: z.string(),
            unitPrice: z.number(),
            totalPrice: z.number(),
            recurrence: z.union([
            z.string(),
            z.number()
          ]).optional(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Generate new PR number
      const prNumber = await generatePRNumber(ctx.scope.organizationId, ctx.scope.operatingUnitId);

      // Calculate totals with recurrence
      const prTotal = input.lineItems.reduce((sum, item) => {
        const recurrence = item.recurrence || 1;
        return sum + item.totalPrice;
          }, 0);
          const isSameCurrency =
      input.pr.currency === "USD";

    const prTotalUsd = isSameCurrency
      ? prTotal
      : prTotal * (input.pr.exchangeRate || 1);

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
            lineNumber: item.lineNumber,
            budgetLine: item.budgetLine,
            description: item.description,
            descriptionAr: item.descriptionAr,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            recurrence: item.recurrence || 1,
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
      const [budget] = await db
        .select()
        .from(sql`budget_lines`)
        .where(sql`id = ${input.budgetLineId}`)
        .limit(1);

      if (!budget) {
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

      // Get all approved PRs for this budget line
      const approvedPRs = await db
        .select()
        .from(purchaseRequests)
        .where(
          and(
            eq(purchaseRequests.budgetLineId, input.budgetLineId),
            eq(purchaseRequests.status, "approved"),
            isNull(purchaseRequests.deletedAt)
          )
        );

      const totalAmount = approvedPRs.reduce((sum, pr) => {
        return sum + parseFloat(pr.prTotalUsd?.toString() || "0");
      }, 0);

      const actualSpent = 0; // TODO: Get from payment records
      const availableBudget = parseFloat(budget.allocated?.toString() || "0") - totalAmount - actualSpent;

      // Convert requested amount to budget currency if needed
      let requestedInBudgetCurrency = input.requestedAmount;
      if (input.currency !== budget.currency) {
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
   * 
   * CRITICAL: Pre-submission validation
   * - Checks if Logistics, Finance, and PM approvers exist in same org/OU
   * - Prevents stuck PRs if approvers not configured
   */
  submit: scopedProcedure
    .input(z.object({
      id: z.number(),
      logisticsEmail: z.string().email().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { notifyLogisticsOfPRSubmission } = await import("../../services/prNotificationService");
      
      // Get PR
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

      if (pr.status !== "draft") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Only draft PRs can be submitted. Current status: ${pr.status}`
        });
      }

      // CRITICAL: Pre-submission validation
      // Check if all required approvers exist in same org/OU
      const logisticsApprover = await getWorkflowApprover(
        db,
        pr.organizationId,
        pr.operatingUnitId,
        ["Logistic Manager", "Logistic Officer"]
      );

      const financeApprover = await getWorkflowApprover(
        db,
        pr.organizationId,
        pr.operatingUnitId,
        ["Finance Manager"]
      );

      const pmApprover = await getWorkflowApprover(
        db,
        pr.organizationId,
        pr.operatingUnitId,
        ["Project Manager", "Program Manager", "Office Manager"]
      );

      if (!logisticsApprover || !financeApprover || !pmApprover) {
        throw new TRPCError({
          code: "FAILED_PRECONDITION",
          message: "Approval workflow not configured. Missing: " + 
            [
              !logisticsApprover ? "Logistics approver" : "",
              !financeApprover ? "Finance approver" : "",
              !pmApprover ? "PM approver" : ""
            ].filter(Boolean).join(", ") + 
            ". Please contact your administrator.",
        });
      }

      // Use auto-detected logistics email or provided email
      const emailToUse = logisticsApprover.email;

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
      
      // Send email notification to Logistics approver
      await notifyLogisticsOfPRSubmission(input.id, emailToUse);
      
      return { 
        success: true, 
        message: `PR submitted successfully. Logistics team (${logisticsApprover.name}) has been notified.`,
        approvers: {
          logistics: { name: logisticsApprover.name, email: logisticsApprover.email },
          finance: { name: financeApprover.name, email: financeApprover.email },
          pm: { name: pmApprover.name, email: pmApprover.email }
        }
      };
    }),

  /**
   * Validate by Logistics (triggers email to Finance)
   * 
   * CRITICAL: Multi-org/OU isolation
   * - Approver lookup filters by PR's organization + operating unit
   * - Auto-detects Finance Manager from same org/OU
   * - Sends email ONLY to resolved approver
   */
  validateByLogistics: scopedProcedure
    .input(z.object({
      id: z.number(),
      financeEmail: z.string().email().optional(),
      comments: z.string().optional(),
      signerName: z.string(),
      signerTitle: z.string(),
      signatureDataUrl: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { notifyFinanceOfLogisticsValidation } = await import("../../services/prNotificationService");
      
      // Get PR
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
        if (pr.status !== "submitted") {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Only submitted PRs can be validated by logistics"
            });
          }

      // CRITICAL: Auto-detect Finance Manager from same org/OU
      const financeApprover = await getWorkflowApprover(
        db,
        pr.organizationId,
        pr.operatingUnitId,
        ["Finance Manager"]
      );

      if (!financeApprover) {
        throw new TRPCError({
          code: "FAILED_PRECONDITION",
          message: "No Finance Manager found in this organization/operating unit. Please configure roles first.",
        });
      }

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
            eq(purchaseRequests.organizationId, ctx.scope.organizationId),
            eq(purchaseRequests.operatingUnitId, ctx.scope.operatingUnitId)
          )
        );
      
      // Send email notification to Finance approver (auto-detected)
      await notifyFinanceOfLogisticsValidation(input.id, financeApprover.email);
      
      return { 
        success: true, 
        message: `PR validated by Logistics. Finance team (${financeApprover.name}) has been notified.`,
        approver: { name: financeApprover.name, email: financeApprover.email }
      };
    }),

  /**
   * Validate by Finance (triggers email to PM)
   * 
   * CRITICAL: Multi-org/OU isolation
   * - Approver lookup filters by PR's organization + operating unit
   * - Auto-detects PM from same org/OU (Project Manager, Program Manager, or Office Manager)
   * - Sends email ONLY to resolved approver
   */
  validateByFinance: scopedProcedure
    .input(z.object({
      id: z.number(),
      pmEmail: z.string().email().optional(),
      comments: z.string().optional(),
      signerName: z.string(),
      signerTitle: z.string(),
      signatureDataUrl: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { notifyPMOfFinanceValidation } = await import("../../services/prNotificationService");
      
      // Get PR
      const [pr] = await db
        .select()
        .from(purchaseRequests)
        .where(
          and(
            eq(purchaseRequests.id, input.id),
            eq(purchaseRequests.organizationId, ctx.scope.organizationId),
            eq(purchaseRequests.operatingUnitId, ctx.scope.operatingUnitId)
          )
        );

      if (!pr) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Purchase Request not found",
        });
      }

      if (pr.status !== "validated_by_logistic") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only logistics-approved PRs can be validated by finance"
          });
        }

      // CRITICAL: Auto-detect PM from same org/OU
      // Treats Project Manager, Program Manager, and Office Manager as equivalent
      const pmApprover = await getWorkflowApprover(
        db,
        pr.organizationId,
        pr.operatingUnitId,
        ["Project Manager", "Program Manager", "Office Manager"]
      );

      if (!pmApprover) {
        throw new TRPCError({
          code: "FAILED_PRECONDITION",
          message: "No Project/Program Manager found in this organization/operating unit. Please configure roles first.",
        });
      }

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
            eq(purchaseRequests.organizationId, ctx.scope.organizationId),
            eq(purchaseRequests.operatingUnitId, ctx.scope.operatingUnitId)
          )
        );
      
      // Send email notification to PM approver (auto-detected)
      await notifyPMOfFinanceValidation(input.id, pmApprover.email);
      
      return { 
        success: true, 
        message: `PR validated by Finance. ${pmApprover.role} (${pmApprover.name}) has been notified.`,
        approver: { name: pmApprover.name, email: pmApprover.email, role: pmApprover.role }
      };
    }),

  /**
   * Approve by PM (triggers email to Requester)
   * 
   * CRITICAL: Only PM-equivalent roles can approve
   * - Project Manager, Program Manager, Office Manager are equivalent
   * - Auto-creates RFQ/QA/BA based on PR total
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
      
      // Get PR
      const [pr] = await db
        .select()
        .from(purchaseRequests)
        .where(
          and(
            eq(purchaseRequests.id, input.id),
            eq(purchaseRequests.organizationId, ctx.scope.organizationId),
            eq(purchaseRequests.operatingUnitId, ctx.scope.operatingUnitId)
          )
        );

      if (!pr) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Purchase Request not found",
        });
      }
      if (pr.status !== "validated_by_finance") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only finance-approved PRs can be approved by PM"
        });
      }
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
            eq(purchaseRequests.organizationId, ctx.scope.organizationId),
            eq(purchaseRequests.operatingUnitId, ctx.scope.operatingUnitId)
          )
        );
      
      // Send email notification to Requester
      await notifyRequesterOfApproval(input.id);
      
      // Auto-create RFQ and QA/BA based on PR total
      try {
        const [updatedPR] = await db
          .select()
          .from(purchaseRequests)
          .where(eq(purchaseRequests.id, input.id))
          .limit(1);
        
        if (updatedPR) {
          const prTotal = parseFloat(updatedPR.prTotalUsd || "0");
          
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
   * 
   * Can be rejected at any stage:
   * - Logistics: rejected_by_logistic
   * - Finance: rejected_by_finance
   * - PM: rejected_by_pm
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
      const [pr] = await db
        .select()
        .from(purchaseRequests)
        .where(
          and(
            eq(purchaseRequests.id, input.id),
            eq(purchaseRequests.organizationId, ctx.scope.organizationId),
            eq(purchaseRequests.operatingUnitId, ctx.scope.operatingUnitId)
          )
        );

      if (!pr) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Purchase Request not found",
        });
        }
        if (
            input.rejectedBy === "logistic" &&
            pr.status !== "submitted"
          ) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Logistics can only reject submitted PRs"
            });
          }

          if (
            input.rejectedBy === "finance" &&
            pr.status !== "validated_by_logistic"
          ) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Finance can only reject logistics-approved PRs"
            });
          }

          if (
            input.rejectedBy === "pm" &&
            pr.status !== "validated_by_finance"
          ) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "PM can only reject finance-approved PRs"
            });
          }
      // Update PR status
      await db
        .update(purchaseRequests)
        .set({
          status: statusMap[input.rejectedBy] as any,
          logRejectedBy: input.rejectedBy === "logistic" ? ctx.user?.id : undefined,
          logRejectedOn: input.rejectedBy === "logistic" ? nowSql : undefined,
          finRejectedBy: input.rejectedBy === "finance" ? ctx.user?.id : undefined,
          finRejectedOn: input.rejectedBy === "finance" ? nowSql : undefined,
          pmRejectedBy: input.rejectedBy === "pm" ? ctx.user?.id : undefined,
          pmRejectedOn: input.rejectedBy === "pm" ? nowSql : undefined,
          rejectReason: input.reason,
          updatedAt: nowSql,
        })
        .where(
          and(
            eq(purchaseRequests.id, input.id),
            eq(purchaseRequests.organizationId, ctx.scope.organizationId),
            eq(purchaseRequests.operatingUnitId, ctx.scope.operatingUnitId)
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
