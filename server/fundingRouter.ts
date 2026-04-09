import { router, protectedProcedure, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { pipelineOpportunities, proposals } from "../drizzle/schema";
import { z } from "zod";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Funding Router - Single Source of Truth (SSOT)
 * Unified procedures for Opportunities, Pipeline, and Proposals
 * 
 * Architecture:
 * - pipelineOpportunities table is the SSOT with `type` field
 * - type: 'opportunity' = Early funding intelligence
 * - type: 'pipeline' = Internal decision/qualification  
 * - type: 'proposal' = Links to proposals table via pipelineOpportunityId
 * 
 * Flow: Opportunity → (transition) → Pipeline → (create proposal) → Proposal
 */

export const fundingRouter = router({
  /**
   * Get all funding records with type filter
   * Replaces: getAllOpportunities, getAllPipelineOpportunities
   */
  getAllFundingRecords: scopedProcedure
    .input(
      z.object({
        type: z.enum(["opportunity", "pipeline", "proposal"]),
        stage: z.enum(["Identified", "Under Review", "Go Decision", "No-Go", "Concept Requested", "Proposal Requested", "Proposal Development", "Approved", "Rejected"]).optional(),
        limit: z.number().min(1).max(1000).default(100),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const conditions = [
        eq(pipelineOpportunities.organizationId, organizationId),
        eq(pipelineOpportunities.operatingUnitId, operatingUnitId),
        eq(pipelineOpportunities.type, input.type),
        eq(pipelineOpportunities.isDeleted, false),
      ];

      if (input.stage) {
        conditions.push(eq(pipelineOpportunities.stage, input.stage));
      }

      const result = await db
        .select()
        .from(pipelineOpportunities)
        .where(and(...conditions))
        .orderBy(desc(pipelineOpportunities.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return result;
    }),

  /**
   * Get single funding record by ID
   */
  getFundingRecordById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const result = await db
        .select()
        .from(pipelineOpportunities)
        .where(
          and(
            eq(pipelineOpportunities.id, input.id),
            eq(pipelineOpportunities.organizationId, organizationId),
            eq(pipelineOpportunities.operatingUnitId, operatingUnitId),
            eq(pipelineOpportunities.isDeleted, false)
          )
        )
        .limit(1);

      if (result.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funding record not found",
        });
      }

      return result[0];
    }),

  /**
   * Create new funding record
   * Replaces: createOpportunity, createPipelineOpportunity
   */
  createFundingRecord: scopedProcedure
    .input(
      z.object({
        type: z.enum(["opportunity", "pipeline"]),
        title: z.string().min(1),
        donorName: z.string().min(1),
        donorType: z.enum(["UN", "EU", "INGO", "Foundation", "Government", "Other"]),
        fundingWindow: z.string().optional(),
        deadline: z.string(),
        indicativeBudgetMin: z.string(),
        indicativeBudgetMax: z.string(),
        sectors: z.array(z.string()),
        country: z.string().min(1),
        governorate: z.string().optional(),
        stage: z.enum(["Identified", "Under Review", "Go Decision", "No-Go", "Concept Requested", "Proposal Requested", "Proposal Development", "Approved", "Rejected"]).default("Identified"),
        probability: z.number().min(0).max(100).default(50),
        focalPoint: z.string().optional(),
        projectManagerName: z.string().optional(),
        projectManagerEmail: z.string().email().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();

      // Initialize status history
      const statusHistory = [{
        timestamp: new Date().toISOString(),
        type: input.type,
        stage: input.stage,
        updatedBy: ctx.user.id,
      }];

      const [result] = await db.insert(pipelineOpportunities).values({
        ...input,
        organizationId,
        operatingUnitId,
        sectors: input.sectors,
        deadline: new Date(input.deadline),
        statusHistory,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      });

      return { id: result.insertId, success: true };
    }),

  /**
   * Update funding record with auto-sync
   * Replaces: updateOpportunity, updatePipelineOpportunity
   */
  updateFundingRecord: scopedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        donorName: z.string().min(1).optional(),
        donorType: z.enum(["UN", "EU", "INGO", "Foundation", "Government", "Other"]).optional(),
        fundingWindow: z.string().optional(),
        deadline: z.string().optional(),
        indicativeBudgetMin: z.string().optional(),
        indicativeBudgetMax: z.string().optional(),
        sectors: z.array(z.string()).optional(),
        country: z.string().min(1).optional(),
        governorate: z.string().optional(),
        stage: z.enum(["Identified", "Under Review", "Go Decision", "No-Go", "Concept Requested", "Proposal Requested", "Proposal Development", "Approved", "Rejected"]).optional(),
        probability: z.number().min(0).max(100).optional(),
        focalPoint: z.string().optional(),
        projectManagerName: z.string().optional(),
        projectManagerEmail: z.string().email().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();

      // Verify ownership
      const existing = await db
        .select()
        .from(pipelineOpportunities)
        .where(
          and(
            eq(pipelineOpportunities.id, input.id),
            eq(pipelineOpportunities.organizationId, organizationId),
            eq(pipelineOpportunities.operatingUnitId, operatingUnitId),
            eq(pipelineOpportunities.isDeleted, false)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funding record not found",
        });
      }

      const record = existing[0];

      // Update status history if stage changed
      let statusHistory = record.statusHistory || [];
      if (input.stage && input.stage !== record.stage) {
        statusHistory = [
          ...statusHistory,
          {
            timestamp: new Date().toISOString(),
            type: record.type,
            stage: input.stage,
            updatedBy: ctx.user.id,
          },
        ];
      }

      // Prepare update data
      const updateData: any = {
        ...input,
        statusHistory,
        updatedBy: ctx.user.id,
      };

      if (input.deadline) {
        updateData.deadline = new Date(input.deadline);
      }

      // Remove id from update
      delete updateData.id;

      await db
        .update(pipelineOpportunities)
        .set(updateData)
        .where(eq(pipelineOpportunities.id, input.id));

      // TODO: Auto-sync to linked proposal if exists
      // If stage changed to "Approved" or "Rejected", update linked proposal status

      return { success: true };
    }),

  /**
   * Transition Opportunity → Pipeline (same record, type changes)
   * CRITICAL: This is the SSOT transition - no duplication
   */
  transitionToPipeline: scopedProcedure
    .input(
      z.object({
        id: z.number(),
        stage: z.enum(["Identified", "Under Review", "Go Decision", "No-Go", "Concept Requested", "Proposal Requested"]).default("Identified"),
        probability: z.number().min(0).max(100).default(50),
        focalPoint: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();

      // Verify record exists and is an opportunity
      const existing = await db
        .select()
        .from(pipelineOpportunities)
        .where(
          and(
            eq(pipelineOpportunities.id, input.id),
            eq(pipelineOpportunities.organizationId, organizationId),
            eq(pipelineOpportunities.operatingUnitId, operatingUnitId),
            eq(pipelineOpportunities.type, "opportunity"),
            eq(pipelineOpportunities.isDeleted, false)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Opportunity not found or already transitioned",
        });
      }

      const record = existing[0];

      // Update status history
      const statusHistory = [
        ...(record.statusHistory || []),
        {
          timestamp: new Date().toISOString(),
          type: "pipeline",
          stage: input.stage,
          updatedBy: ctx.user.id,
        },
      ];

      // Transition: Change type from 'opportunity' to 'pipeline'
      await db
        .update(pipelineOpportunities)
        .set({
          type: "pipeline",
          stage: input.stage,
          probability: input.probability,
          focalPoint: input.focalPoint,
          statusHistory,
          updatedBy: ctx.user.id,
        })
        .where(eq(pipelineOpportunities.id, input.id));

      return { success: true, message: "Opportunity transitioned to Pipeline" };
    }),

  /**
   * Delete funding record (soft delete)
   */
  deleteFundingRecord: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();

      // Verify ownership
      const existing = await db
        .select()
        .from(pipelineOpportunities)
        .where(
          and(
            eq(pipelineOpportunities.id, input.id),
            eq(pipelineOpportunities.organizationId, organizationId),
            eq(pipelineOpportunities.operatingUnitId, operatingUnitId),
            eq(pipelineOpportunities.isDeleted, false)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funding record not found",
        });
      }

      await db
        .update(pipelineOpportunities)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user.id,
        })
        .where(eq(pipelineOpportunities.id, input.id));

      return { success: true };
    }),

  /**
   * Get Pipeline KPIs (real-time calculation)
   */
  getPipelineKPIs: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const conditions = [
        eq(pipelineOpportunities.organizationId, organizationId),
        eq(pipelineOpportunities.operatingUnitId, operatingUnitId),
        eq(pipelineOpportunities.type, "pipeline"),
        eq(pipelineOpportunities.isDeleted, false),
      ];

      // Get all pipeline records
      const records = await db
        .select()
        .from(pipelineOpportunities)
        .where(and(...conditions));

      // Calculate KPIs
      const count = records.length;
      const conceptRequested = records.filter(r => r.stage === "Concept Requested").length;
      const proposalRequested = records.filter(r => r.stage === "Proposal Requested").length;
      const approved = records.filter(r => r.stage === "Approved").length;
      const rejected = records.filter(r => r.stage === "Rejected").length;
      const submitted = approved + rejected;
      const successRate = submitted > 0 ? Math.round((approved / submitted) * 100) : 0;

      // Calculate total pipeline value (exclude rejected)
      const totalValue = records
        .filter(r => r.stage !== "Rejected" && r.stage !== "No-Go")
        .reduce((sum, r) => {
          const max = parseFloat(r.indicativeBudgetMax?.toString() || "0");
          return sum + max;
        }, 0);

      return {
        count,
        conceptRequested,
        proposalRequested,
        totalValue,
        successRate,
        submitted,
        approved,
      };
    }),

  /**
   * Get Opportunities KPIs (real-time calculation)
   */
  getOpportunitiesKPIs: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const conditions = [
        eq(pipelineOpportunities.organizationId, organizationId),
        eq(pipelineOpportunities.operatingUnitId, operatingUnitId),
        eq(pipelineOpportunities.type, "opportunity"),
        eq(pipelineOpportunities.isDeleted, false),
      ];

      // Get all opportunity records
      const records = await db
        .select()
        .from(pipelineOpportunities)
        .where(and(...conditions));

      const today = new Date();
      const fourteenDaysFromNow = new Date();
      fourteenDaysFromNow.setDate(today.getDate() + 14);

      // Calculate KPIs
      const openCount = records.filter(r => new Date(r.deadline) >= today).length;
      const expiringCount = records.filter(r => {
        const deadline = new Date(r.deadline);
        return deadline >= today && deadline <= fourteenDaysFromNow;
      }).length;
      const closedCount = records.filter(r => new Date(r.deadline) < today).length;

      return {
        openCount,
        expiringCount,
        closedCount,
        totalCount: records.length,
      };
    }),

  /**
   * Get Proposals KPIs (real-time calculation)
   */
  getProposalsKPIs: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const conditions = [
        eq(proposals.organizationId, organizationId),
        eq(proposals.operatingUnitId, operatingUnitId),
        eq(proposals.isDeleted, false),
      ];

      // Get all proposal records
      const records = await db
        .select()
        .from(proposals)
        .where(and(...conditions));

      // Calculate status counts
      const draft = records.filter(r => r.proposalStatus === "Draft").length;
      const underReview = records.filter(r => r.proposalStatus === "Under Internal Review").length;
      const submitted = records.filter(r => r.proposalStatus === "Submitted").length;
      const approved = records.filter(r => r.proposalStatus === "Approved").length;
      const rejected = records.filter(r => r.proposalStatus === "Rejected").length;
      const withdrawn = records.filter(r => r.proposalStatus === "Withdrawn").length;

      // Calculate total requested budget
      const totalBudget = records.reduce((sum, r) => {
        return sum + parseFloat(r.totalRequestedBudget?.toString() || "0");
      }, 0);

      return {
        draft,
        underReview,
        submitted,
        approved,
        rejected,
        withdrawn,
        totalCount: records.length,
        totalBudget,
      };
    }),
});
