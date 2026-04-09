import { z } from "zod";
import { publicProcedure, protectedProcedure, router, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { hrAnnualPlans } from "../drizzle/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";

/**
 * HR Annual Plan Router - Strategic Workforce Planning
 * MANDATORY: All queries filter isDeleted = false
 * MANDATORY: Delete operations use soft delete only (no hard delete)
 */
export const hrAnnualPlanRouter = router({
  // Get all annual plans for an organization
  getAll: scopedProcedure
    .input(z.object({
      planYear: z.number().optional(),
      status: z.enum(["draft", "pending_review", "pending_approval", "approved", "rejected"]).optional(),
      limit: z.number().optional().default(100),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const conditions = [
        eq(hrAnnualPlans.organizationId, organizationId),
        eq(hrAnnualPlans.isDeleted, false),
      ];
      
      if (input.planYear) {
        conditions.push(eq(hrAnnualPlans.planYear, input.planYear));
      }
      if (input.status) {
        conditions.push(eq(hrAnnualPlans.status, input.status));
      }
      
      return await db
        .select()
        .from(hrAnnualPlans)
        .where(and(...conditions))
        .orderBy(desc(hrAnnualPlans.planYear))
        .limit(input.limit)
        .offset(input.offset);
    }),

  // Get single annual plan by ID
  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db
        .select()
        .from(hrAnnualPlans)
        .where(
          and(
            eq(hrAnnualPlans.id, input.id),
            eq(hrAnnualPlans.organizationId, organizationId),
            eq(hrAnnualPlans.isDeleted, false)
          )
        )
        .limit(1);
      
      return result[0] || null;
    }),

  // Get annual plan by year
  getByYear: scopedProcedure
    .input(z.object({
      planYear: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db
        .select()
        .from(hrAnnualPlans)
        .where(
          and(
            eq(hrAnnualPlans.organizationId, organizationId),
            eq(hrAnnualPlans.planYear, input.planYear),
            eq(hrAnnualPlans.isDeleted, false)
          )
        )
        .limit(1);
      
      return result[0] || null;
    }),

  // Get statistics
  getStatistics: scopedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const allPlans = await db
        .select()
        .from(hrAnnualPlans)
        .where(
          and(
            eq(hrAnnualPlans.organizationId, organizationId),
            eq(hrAnnualPlans.isDeleted, false)
          )
        );
      
      const draft = allPlans.filter(p => p.status === 'draft').length;
      const pendingReview = allPlans.filter(p => p.status === 'pending_review').length;
      const pendingApproval = allPlans.filter(p => p.status === 'pending_approval').length;
      const approved = allPlans.filter(p => p.status === 'approved').length;
      const rejected = allPlans.filter(p => p.status === 'rejected').length;
      
      // Get years covered
      const years = [...new Set(allPlans.map(p => p.planYear))].sort((a, b) => b - a);
      
      // Total estimated cost across all approved plans
      const totalEstimatedCost = allPlans
        .filter(p => p.status === 'approved')
        .reduce((sum, p) => sum + parseFloat(p.estimatedHrCost?.toString() || "0"), 0);
      
      return {
        total: allPlans.length,
        byStatus: { draft, pendingReview, pendingApproval, approved, rejected },
        years,
        totalEstimatedCost,
      };
    }),

  // Create new annual plan
  create: scopedProcedure
    .input(z.object({
      planYear: z.number(),
      planName: z.string(),
      existingWorkforce: z.string().optional(), // JSON
      plannedStaffing: z.string().optional(), // JSON
      recruitmentPlan: z.string().optional(), // JSON
      budgetEstimate: z.string().optional(), // JSON
      trainingPlan: z.string().optional(), // JSON
      hrRisks: z.string().optional(), // JSON
      totalPlannedPositions: z.number().optional(),
      existingStaff: z.number().optional(),
      newPositionsRequired: z.number().optional(),
      estimatedHrCost: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db.insert(hrAnnualPlans).values({
        organizationId,
        planYear: input.planYear,
        planName: input.planName,
        existingWorkforce: input.existingWorkforce,
        plannedStaffing: input.plannedStaffing,
        recruitmentPlan: input.recruitmentPlan,
        budgetEstimate: input.budgetEstimate,
        trainingPlan: input.trainingPlan,
        hrRisks: input.hrRisks,
        totalPlannedPositions: input.totalPlannedPositions,
        existingStaff: input.existingStaff,
        newPositionsRequired: input.newPositionsRequired,
        estimatedHrCost: input.estimatedHrCost?.toString(),
        notes: input.notes,
        status: "draft",
        preparedBy: ctx.user?.id,
        preparedAt: new Date(),
      });
      
      return { id: result[0].insertId, success: true };
    }),

  // Update annual plan
  update: scopedProcedure
    .input(z.object({
      id: z.number(),
      planName: z.string().optional(),
      existingWorkforce: z.string().optional(),
      plannedStaffing: z.string().optional(),
      recruitmentPlan: z.string().optional(),
      budgetEstimate: z.string().optional(),
      trainingPlan: z.string().optional(),
      hrRisks: z.string().optional(),
      totalPlannedPositions: z.number().optional(),
      existingStaff: z.number().optional(),
      newPositionsRequired: z.number().optional(),
      estimatedHrCost: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, ...updateData } = input;
      
      const processedData: Record<string, unknown> = { ...updateData };
      if (updateData.estimatedHrCost !== undefined) {
        processedData.estimatedHrCost = updateData.estimatedHrCost?.toString();
      }
      
      await db
        .update(hrAnnualPlans)
        .set(processedData)
        .where(and(eq(hrAnnualPlans.id, id), eq(hrAnnualPlans.organizationId, organizationId)));
      
      return { success: true };
    }),

  // Submit for review
  submitForReview: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(hrAnnualPlans)
        .set({ status: "pending_review" })
        .where(and(eq(hrAnnualPlans.id, input.id), eq(hrAnnualPlans.organizationId, organizationId)));
      
      return { success: true };
    }),

  // Complete review
  completeReview: scopedProcedure
    .input(z.object({
      id: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(hrAnnualPlans)
        .set({
          status: "pending_approval",
          reviewedBy: ctx.user?.id,
          reviewedAt: new Date(),
          notes: input.notes,
        })
        .where(and(eq(hrAnnualPlans.id, input.id), eq(hrAnnualPlans.organizationId, organizationId)));
      
      return { success: true };
    }),

  // Approve plan
  approve: scopedProcedure
    .input(z.object({
      id: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(hrAnnualPlans)
        .set({
          status: "approved",
          approvedBy: ctx.user?.id,
          approvedAt: new Date(),
          notes: input.notes,
        })
        .where(and(eq(hrAnnualPlans.id, input.id), eq(hrAnnualPlans.organizationId, organizationId)));
      
      return { success: true };
    }),

  // Reject plan
  reject: scopedProcedure
    .input(z.object({
      id: z.number(),
      notes: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(hrAnnualPlans)
        .set({
          status: "rejected",
          approvedBy: ctx.user?.id,
          approvedAt: new Date(),
          notes: input.notes,
        })
        .where(and(eq(hrAnnualPlans.id, input.id), eq(hrAnnualPlans.organizationId, organizationId)));
      
      return { success: true };
    }),

  // Revert to draft
  revertToDraft: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(hrAnnualPlans)
        .set({
          status: "draft",
          reviewedBy: null,
          reviewedAt: null,
          approvedBy: null,
          approvedAt: null,
        })
        .where(and(eq(hrAnnualPlans.id, input.id), eq(hrAnnualPlans.organizationId, organizationId)));
      
      return { success: true };
    }),

  // Soft delete annual plan
  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(hrAnnualPlans)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user?.id,
        })
        .where(and(eq(hrAnnualPlans.id, input.id), eq(hrAnnualPlans.organizationId, organizationId)));
      
      return { success: true };
    }),
});
