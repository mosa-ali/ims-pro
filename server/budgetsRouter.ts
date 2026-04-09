/**
 * Budgets Router (Header-Level Operations)
 * Donor-compliant budget management with project/grant linkage, version control, and approval workflow
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { budgets, budgetLines, budgetMonthlyAllocations, projects, grants } from "../drizzle/schema";
import { eq, and, isNull, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const budgetsRouter = router({
  /**
   * List all budgets for an organization/operating unit
   * Supports filtering by project, grant, fiscal year, status
   */
  list: scopedProcedure
    .input(
      z.object({
        projectId: z.number().optional(),
        grantId: z.number().optional(),
        fiscalYear: z.string().optional(),
        status: z.enum(["draft", "submitted", "approved", "revised", "closed", "rejected"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const { projectId, grantId, fiscalYear, status } = input;
      console.log('[budgetsRouter.list] Query called with:', { organizationId, operatingUnitId, projectId, grantId, fiscalYear, status });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Build where conditions
      // Filter by organizationId for data isolation (required)
      // Do NOT filter by operatingUnitId - budgets belong to organization, not operating unit
      const conditions: any[] = [
        eq(budgets.organizationId, organizationId),
        isNull(budgets.deletedAt),
      ];

      if (projectId) {
        conditions.push(eq(budgets.projectId, projectId));
      }

      if (grantId) {
        conditions.push(eq(budgets.grantId, grantId));
      }

      if (fiscalYear) {
        conditions.push(eq(budgets.fiscalYear, fiscalYear));
      }

      if (status) {
        conditions.push(eq(budgets.status, status));
      }

      const results = await db
        .select()
        .from(budgets)
        .where(and(...conditions))
        .orderBy(desc(budgets.createdAt));

      console.log('[budgetsRouter.list] Query results:', { count: results.length, results: results.map(r => ({ id: r.id, projectId: r.projectId, status: r.status })) });
      
      // Log full budget details for debugging
      if (results.length > 0) {
        console.log('[budgetsRouter.list] Full budget details:', JSON.stringify(results[0], null, 2));
      }
      
      return results;
    }),

  /**
   * Get budget by ID with all budget lines
   */
  getById: scopedProcedure
    .input(
      z.object({
        budgetId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const { budgetId } = input;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Get budget header
      const conditions: any[] = [
        eq(budgets.id, budgetId),
        eq(budgets.organizationId, organizationId),
        isNull(budgets.deletedAt),
      ];

      if (operatingUnitId) {
        conditions.push(eq(budgets.operatingUnitId, operatingUnitId));
      }

      const [budget] = await db
        .select()
        .from(budgets)
        .where(and(...conditions));

      if (!budget) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Budget not found",
        });
      }

      // Get all budget lines for this budget
      const lines = await db
        .select()
        .from(budgetLines)
        .where(and(eq(budgetLines.budgetId, budgetId), isNull(budgetLines.deletedAt)))
        .orderBy(budgetLines.lineNumber);

      return {
        ...budget,
        lines,
      };
    }),

  /**
   * Create new budget header
   * MANDATORY: projectId required, grantId conditional
   */
  create: scopedProcedure
    .input(
      z.object({
        projectId: z.number({ required_error: "Project is required for donor compliance" }),
        grantId: z.number().optional(),
        budgetTitle: z.string().optional(),
        budgetTitleAr: z.string().optional(),
        fiscalYear: z.string(),
        currency: z.string().default("USD"),
        baseCurrency: z.string().default("USD"),
        exchangeRate: z.number().default(1.0),
        periodStart: z.string(),
        periodEnd: z.string(),
        notes: z.string().optional(),
        notesAr: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const {
        projectId,
        grantId,
        budgetTitle,
        budgetTitleAr,
        fiscalYear,
        currency,
        baseCurrency,
        exchangeRate,
        periodStart,
        periodEnd,
        notes,
        notesAr,
      } = input;

      // Generate unique budget code
      const budgetCode = `BDG-${fiscalYear}-${Date.now().toString().slice(-6)}`;

      const [newBudget] = await db.insert(budgets).values({
        projectId,
        grantId: grantId || null,
        organizationId,
        operatingUnitId: operatingUnitId || null,
        budgetCode,
        budgetTitle: budgetTitle || null,
        budgetTitleAr: budgetTitleAr || null,
        fiscalYear,
        currency,
        baseCurrency,
        exchangeRate: exchangeRate.toString(),
        totalApprovedAmount: "0.00",
        totalForecastAmount: "0.00",
        totalActualAmount: "0.00",
        versionNumber: 1,
        status: "draft",
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        notes: notes || null,
        notesAr: notesAr || null,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      });

      return newBudget;
    }),

  /**
   * Update budget header
   */
  update: scopedProcedure
    .input(
      z.object({
        budgetId: z.number(),
        budgetTitle: z.string().optional(),
        budgetTitleAr: z.string().optional(),
        fiscalYear: z.string().optional(),
        currency: z.string().optional(),
        baseCurrency: z.string().optional(),
        exchangeRate: z.number().optional(),
        periodStart: z.string().optional(),
        periodEnd: z.string().optional(),
        notes: z.string().optional(),
        notesAr: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { budgetId, ...updates } = input;

      // Check if budget exists and belongs to organization
      const [existingBudget] = await db
        .select()
        .from(budgets)
        .where(and(eq(budgets.id, budgetId), eq(budgets.organizationId, organizationId), isNull(budgets.deletedAt)));

      if (!existingBudget) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Budget not found",
        });
      }

      // Cannot update approved or closed budgets
      if (existingBudget.status === "approved" || existingBudget.status === "closed") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot update approved or closed budgets. Create a revision instead.",
        });
      }

      // Prepare update values
      const updateValues: any = {
        updatedBy: ctx.user.id,
      };

      if (updates.budgetTitle !== undefined) updateValues.budgetTitle = updates.budgetTitle;
      if (updates.budgetTitleAr !== undefined) updateValues.budgetTitleAr = updates.budgetTitleAr;
      if (updates.fiscalYear !== undefined) updateValues.fiscalYear = updates.fiscalYear;
      if (updates.currency !== undefined) updateValues.currency = updates.currency;
      if (updates.baseCurrency !== undefined) updateValues.baseCurrency = updates.baseCurrency;
      if (updates.exchangeRate !== undefined) updateValues.exchangeRate = updates.exchangeRate.toString();
      if (updates.periodStart !== undefined) updateValues.periodStart = new Date(updates.periodStart);
      if (updates.periodEnd !== undefined) updateValues.periodEnd = new Date(updates.periodEnd);
      if (updates.notes !== undefined) updateValues.notes = updates.notes;
      if (updates.notesAr !== undefined) updateValues.notesAr = updates.notesAr;

      await db.update(budgets).set(updateValues).where(eq(budgets.id, budgetId));

      return { success: true };
    }),

  /**
   * Soft delete budget
   */
  delete: scopedProcedure
    .input(
      z.object({
        budgetId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { budgetId } = input;

      // Check if budget exists and belongs to organization
      const [existingBudget] = await db
        .select()
        .from(budgets)
        .where(and(eq(budgets.id, budgetId), eq(budgets.organizationId, organizationId), isNull(budgets.deletedAt)));

      if (!existingBudget) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Budget not found",
        });
      }

      // Cannot delete approved or closed budgets
      if (existingBudget.status === "approved" || existingBudget.status === "closed") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot delete approved or closed budgets",
        });
      }

      // Soft delete
      await db
        .update(budgets)
        .set({
          deletedAt: new Date(),
          deletedBy: ctx.user.id,
        })
        .where(eq(budgets.id, budgetId));

      return { success: true };
    }),

  /**
   * Submit budget for approval
   */
  submitForApproval: scopedProcedure
    .input(
      z.object({
        budgetId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { budgetId } = input;

      // Check if budget exists
      const [existingBudget] = await db
        .select()
        .from(budgets)
        .where(and(eq(budgets.id, budgetId), eq(budgets.organizationId, organizationId), isNull(budgets.deletedAt)));

      if (!existingBudget) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Budget not found",
        });
      }

      // Can only submit draft budgets
      if (existingBudget.status !== "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot submit budget with status: ${existingBudget.status}`,
        });
      }

      // Check if budget has at least one line
      const lineCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(budgetLines)
        .where(and(eq(budgetLines.budgetId, budgetId), isNull(budgetLines.deletedAt)));

      if (!lineCount[0] || lineCount[0].count === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot submit budget without budget lines",
        });
      }

      // Update status to submitted
      await db
        .update(budgets)
        .set({
          status: "submitted",
          submittedAt: new Date(),
          submittedBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .where(eq(budgets.id, budgetId));

      return { success: true };
    }),

  /**
   * Approve budget
   */
  approve: scopedProcedure
    .input(
      z.object({
        budgetId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { generatePDFEvidence } = await import('./evidenceGeneration');
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { budgetId } = input;

      // Check if budget exists
      const [existingBudget] = await db
        .select()
        .from(budgets)
        .where(and(eq(budgets.id, budgetId), eq(budgets.organizationId, organizationId), isNull(budgets.deletedAt)));

      if (!existingBudget) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Budget not found",
        });
      }

      // Can only approve submitted budgets
      if (existingBudget.status !== "submitted") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot approve budget with status: ${existingBudget.status}`,
        });
      }

      // Update status to approved
      const approvedAt = new Date();
      await db
        .update(budgets)
        .set({
          status: "approved",
          approvedAt,
          approvedBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .where(eq(budgets.id, budgetId));

      // Generate evidence document
      try {
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Budget Approval</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #16a34a; }
              .header { background-color: #f0fdf4; padding: 15px; margin-bottom: 20px; border: 2px solid #16a34a; }
              .approval-badge { background-color: #16a34a; color: white; padding: 5px 10px; border-radius: 4px; }
              .field { margin: 10px 0; }
              .label { font-weight: bold; color: #666; }
              .value { color: #333; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Budget Approval <span class="approval-badge">APPROVED</span></h1>
              <p><strong>Budget ID:</strong> ${budgetId}</p>
              <p><strong>Approved:</strong> ${approvedAt.toLocaleString()}</p>
              <p><strong>Approved By:</strong> User ${ctx.user.id}</p>
            </div>
            <div class="field">
              <div class="label">Budget Name:</div>
              <div class="value">${existingBudget.budgetName || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="label">Fiscal Year:</div>
              <div class="value">${existingBudget.fiscalYear || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="label">Total Amount:</div>
              <div class="value">$${existingBudget.totalAmount || '0.00'}</div>
            </div>
          </body>
          </html>
        `;
        
        await generatePDFEvidence({
          module: 'finance',
          screen: 'budgets',
          triggerEvent: 'approve',
          entityType: 'Budget',
          entityId: String(budgetId),
          htmlContent,
          variables: { budgetId: String(budgetId), entityId: String(budgetId), fiscalYear: existingBudget.fiscalYear },
          context: {
            organizationId,
            operatingUnitId: ctx.scope.operatingUnitId,
            userId: ctx.user.id,
          },
        });
      } catch (error) {
        console.error('Failed to generate budget approval evidence:', error);
      }

      return { success: true };
    }),

  /**
   * Reject budget
   */
  reject: scopedProcedure
    .input(
      z.object({
        budgetId: z.number(),
        rejectionReason: z.string(),
        rejectionReasonAr: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { budgetId, rejectionReason, rejectionReasonAr } = input;

      // Check if budget exists
      const [existingBudget] = await db
        .select()
        .from(budgets)
        .where(and(eq(budgets.id, budgetId), eq(budgets.organizationId, organizationId), isNull(budgets.deletedAt)));

      if (!existingBudget) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Budget not found",
        });
      }

      // Can only reject submitted budgets
      if (existingBudget.status !== "submitted") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot reject budget with status: ${existingBudget.status}`,
        });
      }

      // Update status to rejected
      await db
        .update(budgets)
        .set({
          status: "rejected",
          rejectedAt: new Date(),
          rejectedBy: ctx.user.id,
          rejectionReason,
          rejectionReasonAr: rejectionReasonAr || null,
          updatedBy: ctx.user.id,
        })
        .where(eq(budgets.id, budgetId));

      return { success: true };
    }),

  /**
   * Create revision from existing budget
   */
  createRevision: scopedProcedure
    .input(
      z.object({
        budgetId: z.number(),
        revisionNotes: z.string(),
        revisionNotesAr: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { budgetId, revisionNotes, revisionNotesAr } = input;

      // Get existing budget
      const [existingBudget] = await db
        .select()
        .from(budgets)
        .where(and(eq(budgets.id, budgetId), eq(budgets.organizationId, organizationId), isNull(budgets.deletedAt)));

      if (!existingBudget) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Budget not found",
        });
      }

      // Can only create revision from approved budgets
      if (existingBudget.status !== "approved") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only create revision from approved budgets",
        });
      }

      // Generate new budget code
      const newBudgetCode = `${existingBudget.budgetCode}-v${existingBudget.versionNumber + 1}`;

      // Create new budget (revision)
      const [newBudget] = await db.insert(budgets).values({
        projectId: existingBudget.projectId,
        grantId: existingBudget.grantId,
        organizationId: existingBudget.organizationId,
        operatingUnitId: existingBudget.operatingUnitId,
        budgetCode: newBudgetCode,
        budgetTitle: existingBudget.budgetTitle,
        budgetTitleAr: existingBudget.budgetTitleAr,
        fiscalYear: existingBudget.fiscalYear,
        currency: existingBudget.currency,
        baseCurrency: existingBudget.baseCurrency,
        exchangeRate: existingBudget.exchangeRate,
        totalApprovedAmount: existingBudget.totalApprovedAmount,
        totalForecastAmount: existingBudget.totalForecastAmount,
        totalActualAmount: existingBudget.totalActualAmount,
        versionNumber: existingBudget.versionNumber + 1,
        parentBudgetId: budgetId,
        revisionNotes,
        revisionNotesAr: revisionNotesAr || null,
        status: "draft",
        periodStart: existingBudget.periodStart,
        periodEnd: existingBudget.periodEnd,
        notes: existingBudget.notes,
        notesAr: existingBudget.notesAr,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      });

      // Copy all budget lines
      const existingLines = await db
        .select()
        .from(budgetLines)
        .where(and(eq(budgetLines.budgetId, budgetId), isNull(budgetLines.deletedAt)));

      if (existingLines.length > 0) {
        const newBudgetId = (newBudget as any).insertId;
        await db.insert(budgetLines).values(
          existingLines.map((line) => ({
            budgetId: newBudgetId,
            projectId: line.projectId,
            organizationId: line.organizationId,
            operatingUnitId: line.operatingUnitId,
            lineCode: line.lineCode,
            lineNumber: line.lineNumber,
            description: line.description,
            descriptionAr: line.descriptionAr,
            categoryId: line.categoryId,
            accountId: line.accountId,
            activityId: line.activityId,
            unitType: line.unitType,
            unitCost: line.unitCost,
            quantity: line.quantity,
            durationMonths: line.durationMonths,
            totalAmount: line.totalAmount,
            donorEligibleAmount: line.donorEligibleAmount,
            donorEligibilityPercentage: line.donorEligibilityPercentage,
            ineligibilityReason: line.ineligibilityReason,
            ineligibilityReasonAr: line.ineligibilityReasonAr,
            donorMappingId: line.donorMappingId,
            locationId: line.locationId,
            locationName: line.locationName,
            implementationPeriodStart: line.implementationPeriodStart,
            implementationPeriodEnd: line.implementationPeriodEnd,
            actualSpent: line.actualSpent,
            commitments: line.commitments,
            availableBalance: line.availableBalance,
            justification: line.justification,
            justificationAr: line.justificationAr,
            notes: line.notes,
            notesAr: line.notesAr,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          }))
        );
      }

      return { budgetId: (newBudget as any).insertId, versionNumber: existingBudget.versionNumber + 1 };
    }),

  /**
   * Test procedure to verify tRPC connectivity
   */
  test: publicProcedure
    .query(async () => {
      console.log('[budgetsRouter.test] Test query called');
      return { status: 'ok', message: 'budgetsRouter is connected' };
    }),
});
