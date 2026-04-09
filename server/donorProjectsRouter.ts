import { z } from "zod";
import { router, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { donorProjects, donors, projects } from "../drizzle/schema";
import { eq, and, isNull, desc, asc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Input validation schemas
const createDonorProjectSchema = z.object({
  donorId: z.number(),
  projectId: z.number(),
  relationshipType: z.enum(["primary_funder", "co_funder", "in_kind", "technical_partner", "potential", "past"]).optional(),
  status: z.enum(["active", "pending", "completed", "cancelled"]).optional(),
  fundingAmount: z.number().optional().nullable(),
  currency: z.string().max(10).optional(),
  fundingPercentage: z.number().min(0).max(100).optional().nullable(),
  startDate: z.date().optional().nullable(),
  endDate: z.date().optional().nullable(),
  notes: z.string().optional().nullable(),
  notesAr: z.string().optional().nullable(),
});

const updateDonorProjectSchema = createDonorProjectSchema.partial().extend({
  id: z.number(),
});

const listDonorProjectsSchema = z.object({
  donorId: z.number().optional(),
  projectId: z.number().optional(),
  relationshipType: z.enum(["primary_funder", "co_funder", "in_kind", "technical_partner", "potential", "past"]).optional(),
  status: z.enum(["active", "pending", "completed", "cancelled"]).optional(),
  includeDeleted: z.boolean().optional(),
});

export const donorProjectsRouter = router({
  // List donor-project relationships
  list: scopedProcedure
    .input(listDonorProjectsSchema)
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const { donorId, projectId, relationshipType, status, includeDeleted } = input;

      // Build where conditions
      const conditions = [
        eq(donorProjects.organizationId, ctx.scope.organizationId),
      ];

      // Filter by operating unit if set
      if (ctx.scope.operatingUnitId) {
        conditions.push(eq(donorProjects.operatingUnitId, ctx.scope.operatingUnitId));
      }

      // Exclude deleted unless requested
      if (!includeDeleted) {
        conditions.push(isNull(donorProjects.deletedAt));
      }

      // Filter by donor
      if (donorId) {
        conditions.push(eq(donorProjects.donorId, donorId));
      }

      // Filter by project
      if (projectId) {
        conditions.push(eq(donorProjects.projectId, projectId));
      }

      // Filter by relationship type
      if (relationshipType) {
        conditions.push(eq(donorProjects.relationshipType, relationshipType));
      }

      // Filter by status
      if (status) {
        conditions.push(eq(donorProjects.status, status));
      }

      // Get donor-project relationships with joined data
      const results = await db
        .select({
          id: donorProjects.id,
          organizationId: donorProjects.organizationId,
          operatingUnitId: donorProjects.operatingUnitId,
          donorId: donorProjects.donorId,
          projectId: donorProjects.projectId,
          relationshipType: donorProjects.relationshipType,
          status: donorProjects.status,
          fundingAmount: donorProjects.fundingAmount,
          currency: donorProjects.currency,
          fundingPercentage: donorProjects.fundingPercentage,
          startDate: donorProjects.startDate,
          endDate: donorProjects.endDate,
          notes: donorProjects.notes,
          notesAr: donorProjects.notesAr,
          createdAt: donorProjects.createdAt,
          updatedAt: donorProjects.updatedAt,
          deletedAt: donorProjects.deletedAt,
          // Donor info
          donorName: donors.name,
          donorNameAr: donors.nameAr,
          donorCode: donors.code,
          donorType: donors.type,
          // Project info
          projectTitle: projects.titleEn,
          projectTitleAr: projects.titleAr,
          projectCode: projects.projectCode,
          projectStatus: projects.status,
        })
        .from(donorProjects)
        .leftJoin(donors, eq(donorProjects.donorId, donors.id))
        .leftJoin(projects, eq(donorProjects.projectId, projects.id))
        .where(and(...conditions))
        .orderBy(desc(donorProjects.createdAt));

      return {
        donorProjects: results,
        total: results.length,
      };
    }),

  // Get a single donor-project relationship by ID
  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const result = await db
        .select({
          id: donorProjects.id,
          organizationId: donorProjects.organizationId,
          operatingUnitId: donorProjects.operatingUnitId,
          donorId: donorProjects.donorId,
          projectId: donorProjects.projectId,
          relationshipType: donorProjects.relationshipType,
          status: donorProjects.status,
          fundingAmount: donorProjects.fundingAmount,
          currency: donorProjects.currency,
          fundingPercentage: donorProjects.fundingPercentage,
          startDate: donorProjects.startDate,
          endDate: donorProjects.endDate,
          notes: donorProjects.notes,
          notesAr: donorProjects.notesAr,
          createdAt: donorProjects.createdAt,
          updatedAt: donorProjects.updatedAt,
          deletedAt: donorProjects.deletedAt,
          // Donor info
          donorName: donors.name,
          donorNameAr: donors.nameAr,
          donorCode: donors.code,
          donorType: donors.type,
          // Project info
          projectTitle: projects.titleEn,
          projectTitleAr: projects.titleAr,
          projectCode: projects.projectCode,
          projectStatus: projects.status,
        })
        .from(donorProjects)
        .leftJoin(donors, eq(donorProjects.donorId, donors.id))
        .leftJoin(projects, eq(donorProjects.projectId, projects.id))
        .where(and(
          eq(donorProjects.id, input.id),
          eq(donorProjects.organizationId, ctx.scope.organizationId)
        ))
        .limit(1);

      if (result.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Donor-project relationship not found" });
      }

      return result[0];
    }),

  // Create a new donor-project relationship
  create: scopedProcedure
    .input(createDonorProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Check if relationship already exists
      const existing = await db
        .select({ id: donorProjects.id })
        .from(donorProjects)
        .where(and(
          eq(donorProjects.donorId, input.donorId),
          eq(donorProjects.projectId, input.projectId),
          eq(donorProjects.organizationId, ctx.scope.organizationId),
          isNull(donorProjects.deletedAt)
        ))
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "This donor-project relationship already exists" });
      }

      // Verify donor exists and belongs to the organization
      const donorExists = await db
        .select({ id: donors.id })
        .from(donors)
        .where(and(
          eq(donors.id, input.donorId),
          eq(donors.organizationId, ctx.scope.organizationId),
          isNull(donors.deletedAt)
        ))
        .limit(1);

      if (donorExists.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Donor not found" });
      }

      // Verify project exists and belongs to the organization
      const projectExists = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(
          eq(projects.id, input.projectId),
          eq(projects.organizationId, ctx.scope.organizationId),
          eq(projects.isDeleted, false)
        ))
        .limit(1);

      if (projectExists.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      const result = await db.insert(donorProjects).values({
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
        donorId: input.donorId,
        projectId: input.projectId,
        relationshipType: input.relationshipType || "primary_funder",
        status: input.status || "active",
        fundingAmount: input.fundingAmount ? String(input.fundingAmount) : null,
        currency: input.currency || "USD",
        fundingPercentage: input.fundingPercentage ? String(input.fundingPercentage) : null,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        notes: input.notes,
        notesAr: input.notesAr,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      });

      return { id: Number(result[0].insertId), success: true };
    }),

  // Update a donor-project relationship
  update: scopedProcedure
    .input(updateDonorProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const { id, ...updateData } = input;

      // Verify the relationship exists and belongs to the organization
      const existing = await db
        .select({ id: donorProjects.id })
        .from(donorProjects)
        .where(and(
          eq(donorProjects.id, id),
          eq(donorProjects.organizationId, ctx.scope.organizationId)
        ))
        .limit(1);

      if (existing.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Donor-project relationship not found" });
      }

      // Build update object
      const updates: Record<string, unknown> = {
        updatedBy: ctx.user.id,
      };

      if (updateData.relationshipType !== undefined) updates.relationshipType = updateData.relationshipType;
      if (updateData.status !== undefined) updates.status = updateData.status;
      if (updateData.fundingAmount !== undefined) updates.fundingAmount = updateData.fundingAmount ? String(updateData.fundingAmount) : null;
      if (updateData.currency !== undefined) updates.currency = updateData.currency;
      if (updateData.fundingPercentage !== undefined) updates.fundingPercentage = updateData.fundingPercentage ? String(updateData.fundingPercentage) : null;
      if (updateData.startDate !== undefined) updates.startDate = updateData.startDate ? new Date(updateData.startDate) : null;
      if (updateData.endDate !== undefined) updates.endDate = updateData.endDate ? new Date(updateData.endDate) : null;
      if (updateData.notes !== undefined) updates.notes = updateData.notes;
      if (updateData.notesAr !== undefined) updates.notesAr = updateData.notesAr;

      await db
        .update(donorProjects)
        .set(updates)
        .where(eq(donorProjects.id, id));

      return { success: true };
    }),

  // Soft delete a donor-project relationship
  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify the relationship exists and belongs to the organization
      const existing = await db
        .select({ id: donorProjects.id })
        .from(donorProjects)
        .where(and(
          eq(donorProjects.id, input.id),
          eq(donorProjects.organizationId, ctx.scope.organizationId)
        ))
        .limit(1);

      if (existing.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Donor-project relationship not found" });
      }

      await db
        .update(donorProjects)
        .set({
          deletedAt: new Date(),
          deletedBy: ctx.user.id,
        })
        .where(eq(donorProjects.id, input.id));

      return { success: true };
    }),

  // Restore a soft-deleted donor-project relationship
  restore: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db
        .update(donorProjects)
        .set({
          deletedAt: null,
          deletedBy: null,
          updatedBy: ctx.user.id,
        })
        .where(and(
          eq(donorProjects.id, input.id),
          eq(donorProjects.organizationId, ctx.scope.organizationId)
        ));

      return { success: true };
    }),

  // Get projects linked to a donor
  getProjectsByDonor: scopedProcedure
    .input(z.object({ donorId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const results = await db
        .select({
          id: donorProjects.id,
          projectId: donorProjects.projectId,
          relationshipType: donorProjects.relationshipType,
          status: donorProjects.status,
          fundingAmount: donorProjects.fundingAmount,
          currency: donorProjects.currency,
          fundingPercentage: donorProjects.fundingPercentage,
          startDate: donorProjects.startDate,
          endDate: donorProjects.endDate,
          // Project info
          projectTitle: projects.titleEn,
          projectTitleAr: projects.titleAr,
          projectCode: projects.projectCode,
          projectStatus: projects.status,
          projectStartDate: projects.startDate,
          projectEndDate: projects.endDate,
          projectBudget: projects.totalBudget,
        })
        .from(donorProjects)
        .leftJoin(projects, eq(donorProjects.projectId, projects.id))
        .where(and(
          eq(donorProjects.donorId, input.donorId),
          eq(donorProjects.organizationId, ctx.scope.organizationId),
          isNull(donorProjects.deletedAt)
        ))
        .orderBy(desc(donorProjects.createdAt));

      return { projects: results };
    }),

  // Get donors linked to a project
  getDonorsByProject: scopedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const results = await db
        .select({
          id: donorProjects.id,
          donorId: donorProjects.donorId,
          relationshipType: donorProjects.relationshipType,
          status: donorProjects.status,
          fundingAmount: donorProjects.fundingAmount,
          currency: donorProjects.currency,
          fundingPercentage: donorProjects.fundingPercentage,
          startDate: donorProjects.startDate,
          endDate: donorProjects.endDate,
          // Donor info
          donorName: donors.name,
          donorNameAr: donors.nameAr,
          donorCode: donors.code,
          donorType: donors.type,
          donorEmail: donors.email,
          donorPhone: donors.phone,
        })
        .from(donorProjects)
        .leftJoin(donors, eq(donorProjects.donorId, donors.id))
        .where(and(
          eq(donorProjects.projectId, input.projectId),
          eq(donorProjects.organizationId, ctx.scope.organizationId),
          isNull(donorProjects.deletedAt)
        ))
        .orderBy(desc(donorProjects.createdAt));

      return { donors: results };
    }),
});
