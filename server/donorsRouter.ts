// ============================================================================
// DONORS ROUTER - COMPLETE WITH DASHBOARD PROCEDURES
// tRPC procedures for donor management and dashboard operations
// ============================================================================

import { z } from "zod";
import { router, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { donors, grants, budgets } from "../drizzle/schema";
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
  // ============================================================================
  // EXISTING PROCEDURES - CRUD OPERATIONS
  // ============================================================================

  list: scopedProcedure
    .input(listDonorsSchema)
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const { page, pageSize, search, type, isActive, sortBy, sortOrder, includeDeleted } = input;
      const offset = (page - 1) * pageSize;

      const conditions = [
        eq(donors.organizationId, ctx.scope.organizationId),
      ];

      if (ctx.scope.operatingUnitId) {
        conditions.push(eq(donors.operatingUnitId, ctx.scope.operatingUnitId));
      }

      if (!includeDeleted) {
        conditions.push(isNull(donors.deletedAt));
      }

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

      if (type) {
        conditions.push(eq(donors.type, type));
      }

      if (isActive !== undefined) {
        conditions.push(eq(donors.isActive, 1));
      }

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(donors)
        .where(and(...conditions));
      const total = countResult[0]?.count || 0;

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

  create: scopedProcedure
    .input(createDonorSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

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

  update: scopedProcedure
    .input(updateDonorSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const { id, ...updateData } = input;

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

  softDelete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

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
          deletedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
          deletedBy: ctx.user.id,
        })
        .where(eq(donors.id, input.id));

      return { message: "Donor deleted successfully" };
    }),

  restore: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

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

    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(donors)
      .where(and(...conditions));

    const activeResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(donors)
      .where(and(...conditions, eq(donors.isActive, 1)));

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
        conditions.push(eq(donors.isActive, 1));
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

  // ============================================================================
  // DASHBOARD PROCEDURES
  // ============================================================================

  getTopDonorsForDashboard: scopedProcedure
    .input(z.object({
      limit: z.number().min(1).max(20).default(5),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const { organizationId, operatingUnitId } = ctx.scope;
      const { limit } = input;

      const conditions = [
        eq(donors.organizationId, organizationId),
        isNull(donors.deletedAt),
      ];

      if (operatingUnitId) {
        conditions.push(eq(donors.operatingUnitId, operatingUnitId));
      }

      const topDonors = await db
        .select({
          id: donors.id,
          name: donors.name,
          type: donors.type,
        })
        .from(donors)
        .where(and(...conditions))
        .orderBy(desc(donors.id))
        .limit(limit);

      const donorData = await Promise.all(
        topDonors.map(async (donor) => {
          const grantsList = await db
            .select({
              id: grants.id,
              grantAmount: grants.grantAmount,
              amount: grants.amount,
              status: grants.status,
            })
            .from(grants)
            .where(
              and(
                eq(grants.donorId, donor.id),
                eq(grants.organizationId, organizationId)
              )
            );

          // Calculate utilized amount from budgets linked to grants
          let totalUtilized = 0;
          for (const grant of grantsList) {
            const budgetResult = await db
              .select({ totalActualAmount: sql<number>`COALESCE(SUM(CAST(${budgets.totalActualAmount} AS DECIMAL(15,2))), 0)` })
              .from(budgets)
              .where(eq(budgets.grantId, grant.id));
            totalUtilized += Number(budgetResult[0]?.totalActualAmount || 0);
          }

          const totalCommitted = grantsList.reduce((sum, g) => sum + (Number(g.grantAmount) || Number(g.amount) || 0), 0);
          const activeGrants = grantsList.filter(g => g.status === 'ongoing' || g.status === 'approved').length;
          const utilizationRate = totalCommitted > 0 ? (totalUtilized / totalCommitted) * 100 : 0;

          return {
            id: donor.id,
            name: donor.name,
            type: donor.type,
            activeGrants,
            totalCommitted: Math.round(totalCommitted),
            totalUtilized: Math.round(totalUtilized),
            utilizationRate: Math.round(utilizationRate),
          };
        })
      );

      return donorData;
    }),

  getDonorIntelligence: scopedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const { organizationId, operatingUnitId } = ctx.scope;

    const conditions = [
      eq(donors.organizationId, organizationId),
      isNull(donors.deletedAt),
    ];

    if (operatingUnitId) {
      conditions.push(eq(donors.operatingUnitId, operatingUnitId));
    }

    const allDonors = await db
      .select({
        id: donors.id,
        name: donors.name,
        type: donors.type,
        isActive: donors.isActive,
      })
      .from(donors)
      .where(and(...conditions));

    const donorMetrics = await Promise.all(
      allDonors.map(async (donor) => {
        const grantsList = await db
          .select({
            id: grants.id,
            grantAmount: grants.grantAmount,
            amount: grants.amount,
            status: grants.status,
          })
          .from(grants)
          .where(
            and(
              eq(grants.donorId, donor.id),
              eq(grants.organizationId, organizationId)
            )
          );

        // Calculate utilized amount from budgets linked to grants
        let totalUtilized = 0;
        for (const grant of grantsList) {
          const budgetResult = await db
            .select({ totalActualAmount: sql<number>`COALESCE(SUM(CAST(${budgets.totalActualAmount} AS DECIMAL(15,2))), 0)` })
            .from(budgets)
            .where(eq(budgets.grantId, grant.id));
          totalUtilized += Number(budgetResult[0]?.totalActualAmount || 0);
        }

        const totalCommitted = grantsList.reduce((sum, g) => sum + (Number(g.grantAmount) || Number(g.amount) || 0), 0);
        const activeGrants = grantsList.filter(g => g.status === 'ongoing' || g.status === 'approved').length;
        const completedGrants = grantsList.filter(g => g.status === 'closed').length;
        const utilizationRate = totalCommitted > 0 ? (totalUtilized / totalCommitted) * 100 : 0;

        return {
          id: donor.id,
          name: donor.name,
          type: donor.type,
          isActive: donor.isActive,
          activeGrants,
          completedGrants,
          totalCommitted: Math.round(totalCommitted),
          totalUtilized: Math.round(totalUtilized),
          utilizationRate: Math.round(utilizationRate),
        };
      })
    );

    return donorMetrics;
  }),

  getDonorTypeDistribution: scopedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const { organizationId, operatingUnitId } = ctx.scope;

    const conditions = [
      eq(donors.organizationId, organizationId),
      isNull(donors.deletedAt),
    ];

    if (operatingUnitId) {
      conditions.push(eq(donors.operatingUnitId, operatingUnitId));
    }

    const distribution = await db
      .select({
        type: donors.type,
        count: sql<number>`count(*)`,
      })
      .from(donors)
      .where(and(...conditions))
      .groupBy(donors.type);

    return distribution.map(item => ({
      type: item.type || 'other',
      count: item.count,
    }));
  }),

  getTotalDonorCommitment: scopedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const { organizationId, operatingUnitId } = ctx.scope;

    const conditions = [
      eq(donors.organizationId, organizationId),
      isNull(donors.deletedAt),
    ];

    if (operatingUnitId) {
      conditions.push(eq(donors.operatingUnitId, operatingUnitId));
    }

    const allDonors = await db
      .select({ id: donors.id })
      .from(donors)
      .where(and(...conditions));

    const allGrants = await db
      .select({
        id: grants.id,
        grantAmount: grants.grantAmount,
        amount: grants.amount,
        status: grants.status,
      })
      .from(grants)
      .where(eq(grants.organizationId, organizationId));

    // Calculate total utilized from all grant budgets
    let totalUtilized = 0;
    for (const grant of allGrants) {
      const budgetResult = await db
        .select({ totalActualAmount: sql<number>`COALESCE(SUM(CAST(${budgets.totalActualAmount} AS DECIMAL(15,2))), 0)` })
        .from(budgets)
        .where(eq(budgets.grantId, grant.id));
      totalUtilized += Number(budgetResult[0]?.totalActualAmount || 0);
    }

    const totalCommitted = allGrants.reduce((sum, g) => sum + (Number(g.grantAmount) || Number(g.amount) || 0), 0);
    const activeGrants = allGrants.filter(g => g.status === 'ongoing' || g.status === 'approved').length;

    return {
      totalDonors: allDonors.length,
      totalCommitted: Math.round(totalCommitted),
      totalUtilized: Math.round(totalUtilized),
      activeGrants,
      utilizationRate: totalCommitted > 0 ? Math.round((totalUtilized / totalCommitted) * 100) : 0,
    };
  }),
});

export type DonorsRouter = typeof donorsRouter;
