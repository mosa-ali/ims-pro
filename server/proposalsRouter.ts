import { router, protectedProcedure, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { proposals, grants, projects, opportunities, pipelineOpportunities } from "../drizzle/schema";
import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Proposals Router
 * Handles CRUD operations for proposal development and pipeline management
 */

export const proposalsRouter = router({
  /**
   * Get KPIs for Donor CRM Dashboard
   */
  getDonorCRMKPIs: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      
      // Count open opportunities (deadline not passed)
      const opportunitiesCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(opportunities)
        .where(
          and(
            eq(opportunities.organizationId, organizationId),
            eq(opportunities.operatingUnitId, operatingUnitId),
            eq(opportunities.isDeleted, false),
            sql`${opportunities.applicationDeadline} >= CURDATE()`
          )
        );

      // Count active proposals
      const proposalsCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(proposals)
        .where(
          and(
            eq(proposals.organizationId, organizationId),
            eq(proposals.operatingUnitId, operatingUnitId),
            eq(proposals.isDeleted, false),
            sql`${proposals.proposalStatus} IN ('Draft', 'Under Internal Review', 'Submitted')`
          )
        );

      return {
        openOpportunities: Number(opportunitiesCount[0]?.count || 0),
        activeProposals: Number(proposalsCount[0]?.count || 0),
      };
    }),

  /**
   * Get KPIs for Pipeline module
   */
  getPipelineKPIs: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      
      // Count pipeline opportunities
      const pipelineCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(pipelineOpportunities)
        .where(
          and(
            eq(pipelineOpportunities.organizationId, organizationId),
            eq(pipelineOpportunities.operatingUnitId, operatingUnitId),
            eq(pipelineOpportunities.isDeleted, false)
          )
        );

      // Count active proposals
      const proposalsCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(proposals)
        .where(
          and(
            eq(proposals.organizationId, organizationId),
            eq(proposals.operatingUnitId, operatingUnitId),
            eq(proposals.isDeleted, false),
            sql`${proposals.proposalStatus} IN ('Draft', 'Under Internal Review', 'Submitted')`
          )
        );

      // Calculate total pipeline value
      const pipelineValue = await db
        .select({ 
          total: sql<string>`SUM(CAST(${pipelineOpportunities.indicativeBudgetMax} AS DECIMAL(15,2)))` 
        })
        .from(pipelineOpportunities)
        .where(
          and(
            eq(pipelineOpportunities.organizationId, organizationId),
            eq(pipelineOpportunities.operatingUnitId, operatingUnitId),
            eq(pipelineOpportunities.isDeleted, false)
          )
        );

      // Calculate success rate (approved / total submitted)
      const successRate = await db
        .select({ 
          approved: sql<number>`SUM(CASE WHEN ${proposals.proposalStatus} = 'Approved' THEN 1 ELSE 0 END)`,
          submitted: sql<number>`SUM(CASE WHEN ${proposals.proposalStatus} IN ('Submitted', 'Approved', 'Rejected') THEN 1 ELSE 0 END)`
        })
        .from(proposals)
        .where(
          and(
            eq(proposals.organizationId, organizationId),
            eq(proposals.operatingUnitId, operatingUnitId),
            eq(proposals.isDeleted, false),
            sql`${proposals.proposalStatus} IN ('Draft', 'Under Internal Review', 'Submitted')`
          )
        );

      const approved = Number(successRate[0]?.approved || 0);
      const submitted = Number(successRate[0]?.submitted || 0);
      const rate = submitted > 0 ? Math.round((approved / submitted) * 100) : 0;

      return {
        pipelineCount: Number(pipelineCount[0]?.count || 0),
        activeProposals: Number(proposalsCount[0]?.count || 0),
        totalPipelineValue: parseFloat(pipelineValue[0]?.total || '0'),
        successRate: rate,
      };
    }),

  /**
   * Get KPIs for Opportunities module
   */
  getOpportunitiesKPIs: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      
      // Count open opportunities (deadline >= today)
      const openCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(opportunities)
        .where(
          and(
            eq(opportunities.organizationId, organizationId),
            eq(opportunities.operatingUnitId, operatingUnitId),
            eq(opportunities.isDeleted, false),
            sql`${opportunities.applicationDeadline} >= CURDATE()`
          )
        );

      // Count expiring soon (deadline within 14 days)
      const expiringCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(opportunities)
        .where(
          and(
            eq(opportunities.organizationId, organizationId),
            eq(opportunities.operatingUnitId, operatingUnitId),
            eq(opportunities.isDeleted, false),
            sql`${opportunities.applicationDeadline} >= CURDATE() AND ${opportunities.applicationDeadline} <= DATE_ADD(CURDATE(), INTERVAL 14 DAY)`
          )
        );

      // Count closed (deadline passed)
      const closedCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(opportunities)
        .where(
          and(
            eq(opportunities.organizationId, organizationId),
            eq(opportunities.operatingUnitId, operatingUnitId),
            eq(opportunities.isDeleted, false),
            sql`${opportunities.applicationDeadline} < CURDATE()`
          )
        );

      // Total count
      const totalCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(opportunities)
        .where(
          and(
            eq(opportunities.organizationId, organizationId),
            eq(opportunities.operatingUnitId, operatingUnitId),
            eq(opportunities.isDeleted, false),
            sql`${opportunities.applicationDeadline} >= CURDATE()`
          )
        );

      return {
        openCount: Number(openCount[0]?.count || 0),
        expiringCount: Number(expiringCount[0]?.count || 0),
        closedCount: Number(closedCount[0]?.count || 0),
        totalCount: Number(totalCount[0]?.count || 0),
      };
    }),

  /**
   * Get all proposals for the current organization/operating unit
   */
  getAll: scopedProcedure
    .input(
      z.object({
        status: z.enum(["Draft", "Under Internal Review", "Submitted", "Approved", "Rejected", "Withdrawn"]).optional(),
        limit: z.number().min(1).max(1000).default(100),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const conditions = [
        eq(proposals.organizationId, organizationId),
        eq(proposals.operatingUnitId, operatingUnitId),
        eq(proposals.isDeleted, false),
      ];

      if (input.status) {
        conditions.push(eq(proposals.proposalStatus, input.status));
      }

      const result = await db
        .select()
        .from(proposals)
        .where(and(...conditions))
        .orderBy(desc(proposals.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return result;
    }),

  /**
   * Get a single proposal by ID
   */
  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const result = await db
        .select()
        .from(proposals)
        .where(
          and(
            eq(proposals.id, input.id),
            eq(proposals.organizationId, organizationId),
            eq(proposals.operatingUnitId, operatingUnitId),
            eq(proposals.isDeleted, false)
          )
        )
        .limit(1);

      if (result.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Proposal not found",
        });
      }

      return result[0];
    }),

  /**
   * Create a new proposal
   */
  create: scopedProcedure
    .input(
      z.object({
        pipelineOpportunityId: z.number().optional(),
        proposalTitle: z.string().min(1),
        donorName: z.string().min(1),
        callReference: z.string().optional(),
        proposalType: z.enum(["Concept Note", "Full Proposal", "Expression of Interest"]),
        country: z.string().min(1),
        governorate: z.string().optional(),
        sectors: z.array(z.string()),
        projectDuration: z.number().min(1),
        totalRequestedBudget: z.string(),
        currency: z.enum(["USD", "EUR", "GBP", "CHF"]).default("USD"),
        submissionDeadline: z.string().transform(str => new Date(str)),
        proposalStatus: z.enum(["Draft", "Under Internal Review", "Submitted", "Approved", "Rejected", "Withdrawn"]).default("Draft"),
        completionPercentage: z.number().min(0).max(100).default(0),
        executiveSummary: z.string().optional(),
        problemStatement: z.string().optional(),
        objectives: z.array(z.string()).optional(),
        activities: z.array(z.any()).optional(),
        budget: z.array(z.any()).optional(),
        logframe: z.any().optional(),
        leadWriter: z.string().optional(),
        reviewers: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const result = await db.insert(proposals).values({
        organizationId,
        operatingUnitId,
        ...input,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      });

      return { id: Number(result.insertId), success: true };
    }),

  /**
   * Update an existing proposal
   */
  update: scopedProcedure
    .input(
      z.object({
        id: z.number(),
        pipelineOpportunityId: z.number().optional(),
        proposalTitle: z.string().min(1).optional(),
        donorName: z.string().min(1).optional(),
        callReference: z.string().optional(),
        proposalType: z.enum(["Concept Note", "Full Proposal", "Expression of Interest"]).optional(),
        country: z.string().min(1).optional(),
        governorate: z.string().optional(),
        sectors: z.array(z.string()).optional(),
        projectDuration: z.number().min(1).optional(),
        totalRequestedBudget: z.string().optional(),
        currency: z.enum(["USD", "EUR", "GBP", "CHF"]).optional(),
        submissionDeadline: z.string().transform(str => str ? new Date(str) : undefined).optional(),
        proposalStatus: z.enum(["Draft", "Under Internal Review", "Submitted", "Approved", "Rejected", "Withdrawn"]).optional(),
        completionPercentage: z.number().min(0).max(100).optional(),
        executiveSummary: z.string().optional(),
        problemStatement: z.string().optional(),
        objectives: z.array(z.string()).optional(),
        activities: z.array(z.any()).optional(),
        budget: z.array(z.any()).optional(),
        logframe: z.any().optional(),
        leadWriter: z.string().optional(),
        reviewers: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const { id, ...updateData } = input;

      // Verify ownership
      const existing = await db
        .select()
        .from(proposals)
        .where(
          and(
            eq(proposals.id, id),
            eq(proposals.organizationId, organizationId),
            eq(proposals.operatingUnitId, operatingUnitId),
            eq(proposals.isDeleted, false)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Proposal not found",
        });
      }

      await db
        .update(proposals)
        .set({
          ...updateData,
          updatedBy: ctx.user.id,
        })
        .where(eq(proposals.id, id));

      return { success: true };
    }),

  /**
   * Soft delete a proposal
   */
  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      // Verify ownership
      const existing = await db
        .select()
        .from(proposals)
        .where(
          and(
            eq(proposals.id, input.id),
            eq(proposals.organizationId, organizationId),
            eq(proposals.operatingUnitId, operatingUnitId),
            eq(proposals.isDeleted, false)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Proposal not found",
        });
      }

      await db
        .update(proposals)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user.id,
        })
        .where(eq(proposals.id, input.id));

      return { success: true };
    }),

  /**
   * Get pipeline statistics
   */
  getStats: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const conditions = [
        eq(proposals.organizationId, organizationId),
        eq(proposals.operatingUnitId, operatingUnitId),
        eq(proposals.isDeleted, false),
      ];

      const stats = await db
        .select({
          status: proposals.proposalStatus,
          count: sql<number>`count(*)`,
          totalBudget: sql<string>`sum(${proposals.totalRequestedBudget})`,
        })
        .from(proposals)
        .where(and(...conditions))
        .groupBy(proposals.proposalStatus);

      return stats;
    }),

  /**
   * Auto-convert approved proposal to grant and project
   * Called when proposal status changes to "Approved"
   */
  convertToGrantAndProject: scopedProcedure
    .input(z.object({ proposalId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const { grants: grantsTable, projects: projectsTable } = await import("../drizzle/schema");

      // Get the approved proposal
      const [proposal] = await db
        .select()
        .from(proposals)
        .where(
          and(
            eq(proposals.id, input.proposalId),
            eq(proposals.organizationId, organizationId),
            eq(proposals.operatingUnitId, operatingUnitId),
            eq(proposals.proposalStatus, "Approved"),
            eq(proposals.isDeleted, false)
          )
        )
        .limit(1);

      if (!proposal) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Approved proposal not found",
        });
      }

      // Generate unique grant number (format: GRN-YYYY-NNNN)
      const year = new Date().getFullYear();
      const randomNum = Math.floor(Math.random() * 9999) + 1;
      const grantNumber = `GRN-${year}-${String(randomNum).padStart(4, "0")}`;

      // Generate unique project code (format: PRJ-YYYY-NNNN)
      const projectCode = `PRJ-${year}-${String(randomNum).padStart(4, "0")}`;

      // Create grant record
      const [grantResult] = await db.insert(grantsTable).values({
        organizationId: proposal.organizationId,
        operatingUnitId: proposal.operatingUnitId,
        grantNumber,
        grantName: proposal.proposalTitle,
        donorName: proposal.donorName,
        grantAmount: proposal.totalRequestedBudget.toString(),
        currency: "USD",
        startDate: proposal.implementationStartDate || new Date(),
        endDate: proposal.implementationEndDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        status: "pending",
        reportingStatus: "on_track",
        description: proposal.projectSummary,
        sector: proposal.sectors ? JSON.parse(proposal.sectors as string)[0] : "General",
        reportingFrequency: "quarterly",
        coFunding: false,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      });

      // Create project record
      const [projectResult] = await db.insert(projectsTable).values({
        organizationId: proposal.organizationId,
        operatingUnitId: proposal.operatingUnitId,
        code: projectCode,
        title: proposal.proposalTitle,
        description: proposal.projectSummary,
        status: "planned",
        startDate: proposal.implementationStartDate || new Date(),
        endDate: proposal.implementationEndDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        totalBudget: proposal.totalRequestedBudget.toString(),
        spent: "0.00",
        currency: "USD",
        sectors: proposal.sectors ? JSON.parse(proposal.sectors as string) : ["General"],
        donor: proposal.donorName,
        location: proposal.country,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      });

      // Update grant with project ID
      await db
        .update(grantsTable)
        .set({ projectId: projectResult.insertId })
        .where(eq(grantsTable.id, grantResult.insertId));

      return {
        success: true,
        grantId: grantResult.insertId,
        projectId: projectResult.insertId,
        grantNumber,
        projectCode,
      };
    }),

  /**
   * Get dashboard statistics for proposals module
   */
  getDashboardStats: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const { pipelineOpportunities } = await import("../drizzle/schema");

      const opportunityConditions = [
        eq(pipelineOpportunities.organizationId, organizationId),
        eq(pipelineOpportunities.operatingUnitId, operatingUnitId),
        eq(pipelineOpportunities.isDeleted, false),
      ];

      const proposalConditions = [
        eq(proposals.organizationId, organizationId),
        eq(proposals.operatingUnitId, operatingUnitId),
        eq(proposals.isDeleted, false),
      ];

      // Count opportunities
      const [opportunitiesCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(pipelineOpportunities)
        .where(and(...opportunityConditions));

      // Count proposals
      const [proposalsCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(proposals)
        .where(and(...proposalConditions));

      return {
        totalOpportunities: opportunitiesCount?.count || 0,
        totalProposals: proposalsCount?.count || 0,
      };
    }),

  /**
   * Pipeline Opportunities CRUD Operations
   */

  // Get all pipeline opportunities
  getAllPipelineOpportunities: scopedProcedure
    .input(
      z.object({
        stage: z.enum(["Identified", "Under Review", "Go Decision", "No-Go", "Concept Requested", "Proposal Requested"]).optional(),
        limit: z.number().min(1).max(1000).default(100),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const { pipelineOpportunities } = await import("../drizzle/schema");
      const conditions = [
        eq(pipelineOpportunities.organizationId, organizationId),
        eq(pipelineOpportunities.operatingUnitId, operatingUnitId),
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

  // Create pipeline opportunity
  createPipelineOpportunity: scopedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        donorName: z.string().min(1),
        donorType: z.enum(["UN", "EU", "INGO", "Foundation", "Government", "Other"]),
        fundingWindow: z.string().optional(),
        deadline: z.string(),
        indicativeBudgetMin: z.number().min(0),
        indicativeBudgetMax: z.number().min(0),
        sector: z.array(z.string()),
        country: z.string().min(1),
        governorate: z.string().optional(),
        stage: z.enum(["Identified", "Under Review", "Go Decision", "No-Go", "Concept Requested", "Proposal Requested"]),
        probability: z.number().min(0).max(100),
        focalPoint: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const { pipelineOpportunities } = await import("../drizzle/schema");

      const [result] = await db.insert(pipelineOpportunities).values({
        organizationId,
        operatingUnitId,
        ...input,
        sector: JSON.stringify(input.sector),
        deadline: new Date(input.deadline),
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      });

      return { id: result.insertId, success: true };
    }),

  // Update pipeline opportunity
  updatePipelineOpportunity: scopedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        donorName: z.string().min(1).optional(),
        donorType: z.enum(["UN", "EU", "INGO", "Foundation", "Government", "Other"]).optional(),
        fundingWindow: z.string().optional(),
        deadline: z.string().optional(),
        indicativeBudgetMin: z.number().min(0).optional(),
        indicativeBudgetMax: z.number().min(0).optional(),
        sector: z.array(z.string()).optional(),
        country: z.string().min(1).optional(),
        governorate: z.string().optional(),
        stage: z.enum(["Identified", "Under Review", "Go Decision", "No-Go", "Concept Requested", "Proposal Requested"]).optional(),
        probability: z.number().min(0).max(100).optional(),
        focalPoint: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const { pipelineOpportunities } = await import("../drizzle/schema");
      const { id, ...updateData } = input;

      // Verify ownership
      const existing = await db
        .select()
        .from(pipelineOpportunities)
        .where(
          and(
            eq(pipelineOpportunities.id, id),
            eq(pipelineOpportunities.organizationId, organizationId),
            eq(pipelineOpportunities.operatingUnitId, operatingUnitId),
            eq(pipelineOpportunities.isDeleted, false)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pipeline opportunity not found",
        });
      }

      const updatePayload: any = {
        ...updateData,
        updatedBy: ctx.user.id,
      };

      if (updateData.sector) {
        updatePayload.sector = JSON.stringify(updateData.sector);
      }

      if (updateData.deadline) {
        updatePayload.deadline = new Date(updateData.deadline);
      }

      await db
        .update(pipelineOpportunities)
        .set(updatePayload)
        .where(eq(pipelineOpportunities.id, id));

      return { success: true };
    }),

  // Delete pipeline opportunity (soft delete)
  deletePipelineOpportunity: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const { pipelineOpportunities } = await import("../drizzle/schema");

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
          message: "Pipeline opportunity not found",
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

  // ============================================================================
  // OPPORTUNITIES CRUD (Raw Funding Intelligence)
  // ============================================================================

  // Get all funding opportunities
  getAllFundingOpportunities: scopedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(1000).default(100),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const conditions = [
        eq(opportunities.organizationId, organizationId),
        eq(opportunities.operatingUnitId, operatingUnitId),
        eq(opportunities.isDeleted, false),
      ];

      const result = await db
        .select()
        .from(opportunities)
        .where(and(...conditions))
        .orderBy(desc(opportunities.applicationDeadline))
        .limit(input.limit)
        .offset(input.offset);

      return result;
    }),

  // Create opportunity
  createFundingOpportunity: scopedProcedure
    .input(
      z.object({
        donorName: z.string().min(1),
        cfpLink: z.string().optional(),
        interestArea: z.array(z.string()).min(1),
        geographicAreas: z.string().min(1),
        applicationDeadline: z.string(), // Date string
        allocatedBudget: z.number().optional(),
        currency: z.string().default("USD"),
        isCoFunding: z.boolean().default(false),
        applicationLink: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();

      const [newOpportunity] = await db.insert(opportunities).values({
        organizationId,
        operatingUnitId,
        donorName: input.donorName,
        cfpLink: input.cfpLink,
        interestArea: input.interestArea,
        geographicAreas: input.geographicAreas,
        applicationDeadline: input.applicationDeadline,
        allocatedBudget: input.allocatedBudget?.toString(),
        currency: input.currency,
        isCoFunding: input.isCoFunding,
        applicationLink: input.applicationLink,
        notes: input.notes,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      });

      return newOpportunity;
    }),

  // Update opportunity
  updateFundingOpportunity: scopedProcedure
    .input(
      z.object({
        id: z.number(),
        donorName: z.string().min(1).optional(),
        cfpLink: z.string().optional(),
        interestArea: z.array(z.string()).optional(),
        geographicAreas: z.string().optional(),
        applicationDeadline: z.string().optional(),
        allocatedBudget: z.number().optional(),
        currency: z.string().optional(),
        isCoFunding: z.boolean().optional(),
        applicationLink: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const { id, ...updateData } = input;

      // Verify ownership
      const existing = await db
        .select()
        .from(opportunities)
        .where(
          and(
            eq(opportunities.id, id),
            eq(opportunities.organizationId, organizationId),
            eq(opportunities.operatingUnitId, operatingUnitId),
            eq(opportunities.isDeleted, false)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Opportunity not found",
        });
      }

      const updatePayload: any = {
        ...updateData,
        updatedBy: ctx.user.id,
      };

      if (updateData.allocatedBudget !== undefined) {
        updatePayload.allocatedBudget = updateData.allocatedBudget.toString();
      }

      await db
        .update(opportunities)
        .set(updatePayload)
        .where(eq(opportunities.id, id));

      return { success: true };
    }),

  // Delete opportunity (soft delete)
  deleteFundingOpportunity: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();

      // Verify ownership
      const existing = await db
        .select()
        .from(opportunities)
        .where(
          and(
            eq(opportunities.id, input.id),
            eq(opportunities.organizationId, organizationId),
            eq(opportunities.operatingUnitId, operatingUnitId),
            eq(opportunities.isDeleted, false)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Opportunity not found",
        });
      }

      await db
        .update(opportunities)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user.id,
        })
        .where(eq(opportunities.id, input.id));

      return { success: true };
    }),

  /**
   * Transition Opportunity to Pipeline (Phase 2.1 SSOT-Lite)
   * Generates funding_id, updates Opportunity, creates linked Pipeline entry
   */
  transitionToPipeline: scopedProcedure
    .input(
      z.object({
        opportunityId: z.number(),
        // Optional overrides for Pipeline entry
        stage: z.enum(["Identified", "Under Review", "Go Decision", "No-Go", "Concept Requested", "Proposal Requested", "Proposal Development", "Approved", "Rejected"]).optional(),
        probability: z.number().min(0).max(100).optional(),
        focalPoint: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();

      // 1. Verify Opportunity exists and user has access
      const opportunity = await db
        .select()
        .from(opportunities)
        .where(
          and(
            eq(opportunities.id, input.opportunityId),
            eq(opportunities.organizationId, organizationId),
            eq(opportunities.operatingUnitId, operatingUnitId),
            eq(opportunities.isDeleted, false)
          )
        )
        .limit(1);

      if (opportunity.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Opportunity not found",
        });
      }

      const opp = opportunity[0];

      // 2. Generate UUID for funding_id (lifecycle tracking)
      const fundingId = crypto.randomUUID();

      // 3. Update Opportunity with funding_id
      await db
        .update(opportunities)
        .set({
          fundingId: fundingId,
          updatedBy: ctx.user.id,
        })
        .where(eq(opportunities.id, input.opportunityId));

      // 4. Create Pipeline entry with same funding_id
      const pipelineData = {
        organizationId,
        operatingUnitId: operatingUnitId || opp.operatingUnitId,
        fundingId: fundingId,
        type: "pipeline" as const,
        
        // Copy from Opportunity
        title: `${opp.donorName} - ${opp.interestArea?.[0] || 'Funding Opportunity'}`,
        donorName: opp.donorName,
        donorType: opp.donorType,
        fundingWindow: `Transitioned from Opportunity #${input.opportunityId}`,
        deadline: opp.applicationDeadline,
        indicativeBudgetMin: String(opp.allocatedBudget || 0),
        indicativeBudgetMax: String(opp.allocatedBudget || 0),
        sectors: opp.interestArea || [],
        country: opp.geographicAreas.split(',')[0] || 'Unknown',
        governorate: opp.geographicAreas.split(',')[1] || null,
        
        // Pipeline-specific fields
        stage: input.stage || "Identified",
        probability: input.probability || 50,
        focalPoint: input.focalPoint || null,
        projectManagerName: opp.projectManagerName,
        projectManagerEmail: opp.projectManagerEmail,
        notes: `Transitioned from Opportunity #${input.opportunityId}\nCFP Link: ${opp.cfpLink || 'N/A'}\nApplication Link: ${opp.applicationLink || 'N/A'}`,
        
        // Status history
        statusHistory: [{
          timestamp: new Date().toISOString(),
          type: 'pipeline',
          stage: input.stage || 'Identified',
          updatedBy: ctx.user.id,
        }],
        
        // Audit fields
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      };

      const [pipelineEntry] = await db
        .insert(pipelineOpportunities)
        .values([pipelineData]);

      return {
        success: true,
        fundingId: fundingId,
        pipelineId: pipelineEntry.insertId,
        message: `Opportunity #${input.opportunityId} transitioned to Pipeline #${pipelineEntry.insertId}`,
      };
    }),

  /**
   * Bulk import funding opportunities from CSV
   */
  bulkImportFundingOpportunities: scopedProcedure
    .input(
      z.object({
        opportunities: z.array(
          z.object({
            donorName: z.string().min(1),
            donorType: z.string().optional(),
            cfpLink: z.string().optional(),
            interestArea: z.array(z.string()).min(1),
            geographicAreas: z.string().min(1),
            applicationDeadline: z.string(),
            allocatedBudget: z.number().optional(),
            currency: z.string().default("USD"),
            isCoFunding: z.boolean().default(false),
            applicationLink: z.string().optional(),
            projectManagerName: z.string().optional(),
            projectManagerEmail: z.string().optional(),
            notes: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();

      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
        createdIds: [] as number[],
      };

      for (let i = 0; i < input.opportunities.length; i++) {
        try {
          const opp = input.opportunities[i];

          // Validate required fields
          if (!opp.donorName) {
            results.failed++;
            results.errors.push(`Row ${i + 1}: Donor name is required`);
            continue;
          }

          if (!opp.applicationDeadline) {
            results.failed++;
            results.errors.push(`Row ${i + 1}: Application deadline is required`);
            continue;
          }

          // Insert opportunity
          const [newOpp] = await db.insert(opportunities).values({
            organizationId,
            operatingUnitId,
            donorName: opp.donorName,
            donorType: opp.donorType,
            cfpLink: opp.cfpLink,
            interestArea: opp.interestArea,
            geographicAreas: opp.geographicAreas,
            applicationDeadline: opp.applicationDeadline,
            allocatedBudget: opp.allocatedBudget?.toString(),
            currency: opp.currency,
            isCoFunding: opp.isCoFunding,
            applicationLink: opp.applicationLink,
            projectManagerName: opp.projectManagerName,
            projectManagerEmail: opp.projectManagerEmail,
            notes: opp.notes,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          });

          results.success++;
          results.createdIds.push(Number(newOpp.insertId));
        } catch (error) {
          results.failed++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.errors.push(`Row ${i + 1}: ${errorMessage}`);
        }
      }

      return results;
    }),
});
