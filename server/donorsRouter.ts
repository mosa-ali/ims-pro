import { z } from "zod";
import { router, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { donors } from "../drizzle/schema";
import { eq, and, isNull, desc, asc, sql, like, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Input validation schemas
const createDonorSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  nameAr: z.string().max(255).optional().nullable(),
  type: z.enum(["bilateral", "multilateral", "foundation", "corporate", "individual", "government", "ngo", "other"]).optional(),
  category: z.string().max(100).optional().nullable(),
  contactPersonName: z.string().max(255).optional().nullable(),
  contactPersonTitle: z.string().max(255).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  website: z.string().max(255).optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  notes: z.string().optional().nullable(),
  notesAr: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const updateDonorSchema = createDonorSchema.partial().extend({
  id: z.number(),
});

const listDonorsSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
  search: z.string().optional(),
  type: z.enum(["bilateral", "multilateral", "foundation", "corporate", "individual", "government", "ngo", "other"]).optional(),
  isActive: z.boolean().optional(),
  sortBy: z.enum(["name", "code", "type", "createdAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  includeDeleted: z.boolean().optional(),
});

export const donorsRouter = router({
  // List donors with pagination, search, and filtering
  list: scopedProcedure
    .input(listDonorsSchema)
    .query(async ({ ctx, input }) => {

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const { page, pageSize, search, type, isActive, sortBy, sortOrder, includeDeleted } = input;
      const offset = (page - 1) * pageSize;

      // Build where conditions
      const conditions = [
        eq(donors.organizationId, ctx.scope.organizationId),
      ];

      // Filter by operating unit if set
      if (ctx.scope.operatingUnitId) {
        conditions.push(eq(donors.operatingUnitId, ctx.scope.operatingUnitId));
      }

      // Exclude deleted unless requested
      if (!includeDeleted) {
        conditions.push(isNull(donors.deletedAt));
      }

      // Search filter
      if (search) {
        conditions.push(
          or(
            like(donors.name, `%${search}%`),
            like(donors.nameAr, `%${search}%`),
            like(donors.code, `%${search}%`),
            like(donors.email, `%${search}%`)
          )!
        );
      }

      // Type filter
      if (type) {
        conditions.push(eq(donors.type, type));
      }

      // Active filter
      if (isActive !== undefined) {
        conditions.push(eq(donors.isActive, isActive));
      }

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(donors)
        .where(and(...conditions));
      const total = countResult[0]?.count || 0;


      // Build order by
      let orderByClause;
      const order = sortOrder === "asc" ? asc : desc;
      switch (sortBy) {
        case "name":
          orderByClause = order(donors.name);
          break;
        case "code":
          orderByClause = order(donors.code);
          break;
        case "type":
          orderByClause = order(donors.type);
          break;
        case "createdAt":
        default:
          orderByClause = desc(donors.createdAt);
      }

      // Fetch donors
      const donorsList = await db
        .select()
        .from(donors)
        .where(and(...conditions))
        .orderBy(orderByClause)
        .limit(pageSize)
        .offset(offset);

      return {
        donors: donorsList,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  // Get single donor by ID
  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const donor = await db
        .select()
        .from(donors)
        .where(
          and(
            eq(donors.id, input.id),
            eq(donors.organizationId, ctx.scope.organizationId),
            isNull(donors.deletedAt)
          )
        )
        .limit(1);

      if (!donor[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Donor not found" });
      }

      return donor[0];
    }),

  // Create new donor
  create: scopedProcedure
    .input(createDonorSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Check for duplicate code within organization
      const existing = await db
        .select({ id: donors.id })
        .from(donors)
        .where(
          and(
            eq(donors.organizationId, ctx.scope.organizationId),
            eq(donors.code, input.code),
            isNull(donors.deletedAt)
          )
        )
        .limit(1);

      if (existing[0]) {
        throw new TRPCError({ code: "CONFLICT", message: "A donor with this code already exists" });
      }

      const result = await db.insert(donors).values({
        ...input,
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
        createdBy: ctx.user.id,
      });

      const insertId = result[0].insertId;

      return { id: insertId, message: "Donor created successfully" };
    }),

  // Update donor
  update: scopedProcedure
    .input(updateDonorSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const { id, ...updateData } = input;

      // Verify donor exists and belongs to organization
      const existing = await db
        .select({ id: donors.id })
        .from(donors)
        .where(
          and(
            eq(donors.id, id),
            eq(donors.organizationId, ctx.scope.organizationId),
            isNull(donors.deletedAt)
          )
        )
        .limit(1);

      if (!existing[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Donor not found" });
      }

      // Check for duplicate code if code is being updated
      if (updateData.code) {
        const duplicate = await db
          .select({ id: donors.id })
          .from(donors)
          .where(
            and(
              eq(donors.organizationId, ctx.scope.organizationId),
              eq(donors.code, updateData.code),
              sql`${donors.id} != ${id}`,
              isNull(donors.deletedAt)
            )
          )
          .limit(1);

        if (duplicate[0]) {
          throw new TRPCError({ code: "CONFLICT", message: "A donor with this code already exists" });
        }
      }

      await db
        .update(donors)
        .set({
          ...updateData,
          updatedBy: ctx.user.id,
        })
        .where(eq(donors.id, id));

      return { message: "Donor updated successfully" };
    }),

  // Soft delete donor
  softDelete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify donor exists and belongs to organization
      const existing = await db
        .select({ id: donors.id })
        .from(donors)
        .where(
          and(
            eq(donors.id, input.id),
            eq(donors.organizationId, ctx.scope.organizationId),
            isNull(donors.deletedAt)
          )
        )
        .limit(1);

      if (!existing[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Donor not found" });
      }

      await db
        .update(donors)
        .set({
          deletedAt: new Date(),
          deletedBy: ctx.user.id,
        })
        .where(eq(donors.id, input.id));

      return { message: "Donor deleted successfully" };
    }),

  // Restore soft-deleted donor
  restore: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify donor exists, belongs to organization, and is deleted
      const existing = await db
        .select({ id: donors.id, deletedAt: donors.deletedAt })
        .from(donors)
        .where(
          and(
            eq(donors.id, input.id),
            eq(donors.organizationId, ctx.scope.organizationId)
          )
        )
        .limit(1);

      if (!existing[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Donor not found" });
      }

      if (!existing[0].deletedAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Donor is not deleted" });
      }

      await db
        .update(donors)
        .set({
          deletedAt: null,
          deletedBy: null,
          updatedBy: ctx.user.id,
        })
        .where(eq(donors.id, input.id));

      return { message: "Donor restored successfully" };
    }),

  // Get KPIs for dashboard
  getKPIs: scopedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const conditions = [
      eq(donors.organizationId, ctx.scope.organizationId),
      isNull(donors.deletedAt),
    ];

    if (ctx.scope.operatingUnitId) {
      conditions.push(eq(donors.operatingUnitId, ctx.scope.operatingUnitId));
    }

    // Total donors
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(donors)
      .where(and(...conditions));

    // Active donors
    const activeResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(donors)
      .where(and(...conditions, eq(donors.isActive, true)));

    // Donors by type
    const byTypeResult = await db
      .select({
        type: donors.type,
        count: sql<number>`count(*)`,
      })
      .from(donors)
      .where(and(...conditions))
      .groupBy(donors.type);

    return {
      totalDonors: totalResult[0]?.count || 0,
      activeDonors: activeResult[0]?.count || 0,
      byType: byTypeResult,
    };
  }),

  // Export donors to Excel format (returns data for client-side export)
  exportData: scopedProcedure
    .input(z.object({
      search: z.string().optional(),
      type: z.enum(["bilateral", "multilateral", "foundation", "corporate", "individual", "government", "ngo", "other"]).optional(),
      isActive: z.boolean().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const { search, type, isActive } = input;

      const conditions = [
        eq(donors.organizationId, ctx.scope.organizationId),
        isNull(donors.deletedAt),
      ];

      if (ctx.scope.operatingUnitId) {
        conditions.push(eq(donors.operatingUnitId, ctx.scope.operatingUnitId));
      }

      if (search) {
        conditions.push(
          or(
            like(donors.name, `%${search}%`),
            like(donors.nameAr, `%${search}%`),
            like(donors.code, `%${search}%`)
          )!
        );
      }

      if (type) {
        conditions.push(eq(donors.type, type));
      }

      if (isActive !== undefined) {
        conditions.push(eq(donors.isActive, isActive));
      }

      const donorsList = await db
        .select()
        .from(donors)
        .where(and(...conditions))
        .orderBy(asc(donors.name));

      return {
        donors: donorsList,
        exportedAt: new Date().toISOString(),
      };
    }),
});

export type DonorsRouter = typeof donorsRouter;
