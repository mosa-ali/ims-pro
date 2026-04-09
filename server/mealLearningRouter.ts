import { z } from "zod";
import { router, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { mealLearningItems, mealLearningActions, mealAuditLog } from "../drizzle/schema";
import { eq, and, desc, count, isNull, sql } from "drizzle-orm";

/**
 * MEAL Learning & Knowledge Management Router
 * Full CRUD for lessons learned, best practices, and learning products
 * MANDATORY: All queries filter isDeleted = false (soft delete)
 * MANDATORY: All procedures use scopedProcedure for org/OU isolation
 */
export const mealLearningRouter = router({
  // List all learning items (excludes soft-deleted)
  list: scopedProcedure
    .input(z.object({
      type: z.enum(["lesson", "best_practice", "product"]).optional(),
      status: z.enum(["draft", "submitted", "validated", "published", "archived"]).optional(),
      projectId: z.number().optional(),
      visibility: z.enum(["internal", "donor"]).optional(),
      moduleSource: z.enum(["indicator", "survey", "accountability", "cross_cutting"]).optional(),
      limit: z.number().default(100),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions: any[] = [
        eq(mealLearningItems.organizationId, organizationId),
        eq(mealLearningItems.isDeleted, false),
      ];

      if (input.type) conditions.push(eq(mealLearningItems.type, input.type));
      if (input.status) conditions.push(eq(mealLearningItems.status, input.status));
      if (input.projectId) conditions.push(eq(mealLearningItems.projectId, input.projectId));
      if (input.visibility) conditions.push(eq(mealLearningItems.visibility, input.visibility));
      if (input.moduleSource) conditions.push(eq(mealLearningItems.moduleSource, input.moduleSource));

      const items = await db
        .select()
        .from(mealLearningItems)
        .where(and(...conditions))
        .orderBy(desc(mealLearningItems.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return items;
    }),

  // Get by ID
  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [item] = await db
        .select()
        .from(mealLearningItems)
        .where(and(
          eq(mealLearningItems.id, input.id),
          eq(mealLearningItems.organizationId, organizationId),
          eq(mealLearningItems.isDeleted, false),
        ));

      return item || null;
    }),

  // Create learning item
  create: scopedProcedure
    .input(z.object({
      projectId: z.number(),
      type: z.enum(["lesson", "best_practice", "product"]),
      title: z.string().min(1),
      context: z.string().optional(),
      rootCause: z.string().optional(),
      whatWorked: z.string().optional(),
      whatDidnt: z.string().optional(),
      recommendations: z.string().optional(),
      moduleSource: z.enum(["indicator", "survey", "accountability", "cross_cutting"]),
      visibility: z.enum(["internal", "donor"]).default("internal"),
      status: z.enum(["draft", "submitted", "validated", "published", "archived"]).default("draft"),
      tags: z.any().optional(),
      locationIds: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db.insert(mealLearningItems).values({
        organizationId,
        operatingUnitId,
        projectId: input.projectId,
        type: input.type,
        title: input.title,
        context: input.context || null,
        rootCause: input.rootCause || null,
        whatWorked: input.whatWorked || null,
        whatDidnt: input.whatDidnt || null,
        recommendations: input.recommendations || null,
        moduleSource: input.moduleSource,
        visibility: input.visibility,
        status: input.status,
        tags: input.tags || null,
        locationIds: input.locationIds || null,
        createdBy: ctx.user?.id || null,
      });

      // Audit log
      await db.insert(mealAuditLog).values({
        organizationId,
        operatingUnitId,
        moduleName: "MEAL",
        entityType: "learning_item",
        entityId: result.insertId,
        actionType: "create",
        actorUserId: ctx.user?.id || null,
        diff: { input },
      });

      return { id: result.insertId, success: true };
    }),

  // Update learning item
  update: scopedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).optional(),
      context: z.string().optional(),
      rootCause: z.string().optional(),
      whatWorked: z.string().optional(),
      whatDidnt: z.string().optional(),
      recommendations: z.string().optional(),
      moduleSource: z.enum(["indicator", "survey", "accountability", "cross_cutting"]).optional(),
      visibility: z.enum(["internal", "donor"]).optional(),
      status: z.enum(["draft", "submitted", "validated", "published", "archived"]).optional(),
      tags: z.any().optional(),
      locationIds: z.any().optional(),
      type: z.enum(["lesson", "best_practice", "product"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...updateData } = input;
      const updates: any = { updatedBy: ctx.user?.id || null };
      if (updateData.title !== undefined) updates.title = updateData.title;
      if (updateData.context !== undefined) updates.context = updateData.context;
      if (updateData.rootCause !== undefined) updates.rootCause = updateData.rootCause;
      if (updateData.whatWorked !== undefined) updates.whatWorked = updateData.whatWorked;
      if (updateData.whatDidnt !== undefined) updates.whatDidnt = updateData.whatDidnt;
      if (updateData.recommendations !== undefined) updates.recommendations = updateData.recommendations;
      if (updateData.moduleSource !== undefined) updates.moduleSource = updateData.moduleSource;
      if (updateData.visibility !== undefined) updates.visibility = updateData.visibility;
      if (updateData.status !== undefined) updates.status = updateData.status;
      if (updateData.tags !== undefined) updates.tags = updateData.tags;
      if (updateData.locationIds !== undefined) updates.locationIds = updateData.locationIds;
      if (updateData.type !== undefined) updates.type = updateData.type;

      await db.update(mealLearningItems)
        .set(updates)
        .where(and(
          eq(mealLearningItems.id, id),
          eq(mealLearningItems.organizationId, organizationId),
          eq(mealLearningItems.isDeleted, false),
        ));

      // Audit log
      await db.insert(mealAuditLog).values({
        organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
        moduleName: "MEAL",
        entityType: "learning_item",
        entityId: id,
        actionType: "update",
        actorUserId: ctx.user?.id || null,
        diff: { updates },
      });

      return { success: true };
    }),

  // Soft delete learning item
  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.update(mealLearningItems)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user?.id || null,
        })
        .where(and(
          eq(mealLearningItems.id, input.id),
          eq(mealLearningItems.organizationId, organizationId),
        ));

      // Audit log
      await db.insert(mealAuditLog).values({
        organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
        moduleName: "MEAL",
        entityType: "learning_item",
        entityId: input.id,
        actionType: "delete",
        actorUserId: ctx.user?.id || null,
        diff: null,
      });

      return { success: true };
    }),

  // Get statistics/KPIs
  stats: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const items = await db
        .select()
        .from(mealLearningItems)
        .where(and(
          eq(mealLearningItems.organizationId, organizationId),
          eq(mealLearningItems.isDeleted, false),
        ));

      const total = items.length;
      const lessons = items.filter(i => i.type === "lesson").length;
      const bestPractices = items.filter(i => i.type === "best_practice").length;
      const products = items.filter(i => i.type === "product").length;
      const published = items.filter(i => i.status === "published").length;
      const draft = items.filter(i => i.status === "draft").length;

      return { total, lessons, bestPractices, products, published, draft };
    }),

  // ---- Learning Actions CRUD ----
  listActions: scopedProcedure
    .input(z.object({ learningItemId: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      return await db
        .select()
        .from(mealLearningActions)
        .where(and(
          eq(mealLearningActions.learningItemId, input.learningItemId),
          eq(mealLearningActions.organizationId, organizationId),
          eq(mealLearningActions.isDeleted, false),
        ))
        .orderBy(desc(mealLearningActions.createdAt));
    }),

  createAction: scopedProcedure
    .input(z.object({
      learningItemId: z.number(),
      actionText: z.string().min(1),
      ownerUserId: z.number().optional(),
      dueDate: z.string().optional(),
      status: z.enum(["open", "in_progress", "closed"]).default("open"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db.insert(mealLearningActions).values({
        learningItemId: input.learningItemId,
        organizationId,
        operatingUnitId,
        actionText: input.actionText,
        ownerUserId: input.ownerUserId || null,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        status: input.status,
      });

      return { id: result.insertId, success: true };
    }),

  updateAction: scopedProcedure
    .input(z.object({
      id: z.number(),
      actionText: z.string().optional(),
      ownerUserId: z.number().optional(),
      dueDate: z.string().optional(),
      status: z.enum(["open", "in_progress", "closed"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...updates } = input;
      const setData: any = {};
      if (updates.actionText !== undefined) setData.actionText = updates.actionText;
      if (updates.ownerUserId !== undefined) setData.ownerUserId = updates.ownerUserId;
      if (updates.dueDate !== undefined) setData.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;
      if (updates.status !== undefined) setData.status = updates.status;

      await db.update(mealLearningActions)
        .set(setData)
        .where(and(
          eq(mealLearningActions.id, id),
          eq(mealLearningActions.organizationId, organizationId),
          eq(mealLearningActions.isDeleted, false),
        ));

      return { success: true };
    }),

  deleteAction: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.update(mealLearningActions)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user?.id || null,
        })
        .where(and(
          eq(mealLearningActions.id, input.id),
          eq(mealLearningActions.organizationId, organizationId),
        ));

      return { success: true };
    }),
});
