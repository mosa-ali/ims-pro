/**
 * Unit Types Master Data Router
 * Provides system-wide standardized unit types for all modules
 * (Logistics, Finance, MEAL, HR, Projects)
 */

import { publicProcedure, router } from "../../_core/trpc";
import { getDb } from "../../db";
import { unitTypes } from "../../../drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";

export const unitTypesRouter = router({
  /**
   * Get all active unit types, optionally filtered by category
   */
  getAll: publicProcedure
    .input(
      z.object({
        category: z.enum(["goods", "time_based", "programmatic"]).optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      const query = db
        .select()
        .from(unitTypes)
        .where(
          and(
            eq(unitTypes.active, 1),
            isNull(unitTypes.deletedAt),
            input?.category ? eq(unitTypes.category, input.category) : undefined
          )
        )
        .orderBy(unitTypes.category, unitTypes.name);

      const result = await query;
      return result;
    }),

  /**
   * Get unit type by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const result = await db
        .select()
        .from(unitTypes)
        .where(
          and(
            eq(unitTypes.id, input.id),
            isNull(unitTypes.deletedAt)
          )
        )
        .limit(1);

      return result[0] || null;
    }),

  /**
   * Get unit types by category
   */
  getByCategory: publicProcedure
    .input(
      z.object({
        category: z.enum(["goods", "time_based", "programmatic"]),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      const result = await db
        .select()
        .from(unitTypes)
        .where(
          and(
            eq(unitTypes.category, input.category),
            eq(unitTypes.active, 1),
            isNull(unitTypes.deletedAt)
          )
        )
        .orderBy(unitTypes.name);

      return result;
    }),

  /**
   * Get all categories with their unit counts
   */
  getCategorySummary: publicProcedure.query(async () => {
    const db = await getDb();
    const goods = await db
      .select()
      .from(unitTypes)
      .where(
        and(
          eq(unitTypes.category, "goods"),
          eq(unitTypes.active, 1),
          isNull(unitTypes.deletedAt)
        )
      );

    const timeBased = await db
      .select()
      .from(unitTypes)
      .where(
        and(
          eq(unitTypes.category, "time_based"),
          eq(unitTypes.active, 1),
          isNull(unitTypes.deletedAt)
        )
      );

    const programmatic = await db
      .select()
      .from(unitTypes)
      .where(
        and(
          eq(unitTypes.category, "programmatic"),
          eq(unitTypes.active, 1),
          isNull(unitTypes.deletedAt)
        )
      );

    return {
      goods: {
        category: "goods",
        count: goods.length,
        units: goods,
      },
      timeBased: {
        category: "time_based",
        count: timeBased.length,
        units: timeBased,
      },
      programmatic: {
        category: "programmatic",
        count: programmatic.length,
        units: programmatic,
      },
      total: goods.length + timeBased.length + programmatic.length,
    };
  }),

  /**
   * Create a new unit type (admin only)
   */
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        nameAr: z.string().max(100).optional(),
        category: z.enum(["goods", "time_based", "programmatic"]),
        description: z.string().optional(),
        descriptionAr: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // TODO: Add admin role check
      // if (ctx.user?.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });

      const db = await getDb();
      const result = await db.insert(unitTypes).values({
        name: input.name,
        nameAr: input.nameAr,
        category: input.category,
        description: input.description,
        descriptionAr: input.descriptionAr,
        active: 1,
        isDeleted: 0,
        createdBy: ctx.user?.id,
        updatedBy: ctx.user?.id,
      });

      return { id: result.insertId, ...input };
    }),

  /**
   * Update an existing unit type (admin only)
   */
  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        nameAr: z.string().max(100).optional(),
        description: z.string().optional(),
        descriptionAr: z.string().optional(),
        active: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // TODO: Add admin role check
      // if (ctx.user?.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });

      const db = await getDb();
      const { id, ...updateData } = input;

      await db
        .update(unitTypes)
        .set({
          ...updateData,
          updatedBy: ctx.user?.id,
        })
        .where(eq(unitTypes.id, id));

      return { id, ...updateData };
    }),

  /**
   * Soft delete a unit type (admin only)
   */
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // TODO: Add admin role check
      // if (ctx.user?.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });

      const db = await getDb();
      await db
        .update(unitTypes)
        .set({
          isDeleted: 1,
          deletedAt: new Date().toISOString(),
          deletedBy: ctx.user?.id,
        })
        .where(eq(unitTypes.id, input.id));

      return { success: true };
    }),

  /**
   * Search unit types by name
   */
  search: publicProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      const result = await db
        .select()
        .from(unitTypes)
        .where(
          and(
            eq(unitTypes.active, 1),
            isNull(unitTypes.deletedAt)
          )
        )
        .orderBy(unitTypes.name);

      // Filter by query (case-insensitive search on name and nameAr)
      return result.filter(
        (unit) =>
          unit.name.toLowerCase().includes(input.query.toLowerCase()) ||
          (unit.nameAr && unit.nameAr.includes(input.query))
      );
    }),
});
