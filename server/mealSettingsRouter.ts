import { z } from "zod";
import { router, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { mealIndicatorTemplates, mealSurveyStandards, mealAuditLog } from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * MEAL Settings Router
 * Indicator Templates, Survey Standards, and Activity Log
 * MANDATORY: All queries filter isDeleted = false (soft delete)
 * MANDATORY: All procedures use scopedProcedure for org/OU isolation
 */
export const mealSettingsRouter = router({
  // ---- Indicator Templates ----
  listTemplates: scopedProcedure
    .input(z.object({
      active: z.boolean().optional(),
      limit: z.number().default(100),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions: any[] = [
        eq(mealIndicatorTemplates.organizationId, organizationId),
        eq(mealIndicatorTemplates.isDeleted, false),
      ];

      if (input.active !== undefined) conditions.push(eq(mealIndicatorTemplates.active, input.active));

      return await db
        .select()
        .from(mealIndicatorTemplates)
        .where(and(...conditions))
        .orderBy(desc(mealIndicatorTemplates.createdAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  getTemplateById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [template] = await db
        .select()
        .from(mealIndicatorTemplates)
        .where(and(
          eq(mealIndicatorTemplates.id, input.id),
          eq(mealIndicatorTemplates.organizationId, organizationId),
          eq(mealIndicatorTemplates.isDeleted, false),
        ));

      return template || null;
    }),

  createTemplate: scopedProcedure
    .input(z.object({
      name: z.string().min(1),
      code: z.string().optional(),
      unitOfMeasure: z.string().optional(),
      calculationMethod: z.string().optional(),
      frequency: z.string().optional(),
      disaggregationFields: z.any().optional(),
      defaultTargets: z.any().optional(),
      active: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db.insert(mealIndicatorTemplates).values({
        organizationId,
        name: input.name,
        code: input.code || null,
        unitOfMeasure: input.unitOfMeasure || null,
        calculationMethod: input.calculationMethod || null,
        frequency: input.frequency || null,
        disaggregationFields: input.disaggregationFields || null,
        defaultTargets: input.defaultTargets || null,
        active: input.active,
      });

      // Audit log
      await db.insert(mealAuditLog).values({
        organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
        moduleName: "MEAL",
        entityType: "indicator_template",
        entityId: result.insertId,
        actionType: "create",
        actorUserId: ctx.user?.id || null,
        diff: { input },
      });

      return { id: result.insertId, success: true };
    }),

  updateTemplate: scopedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      code: z.string().optional(),
      unitOfMeasure: z.string().optional(),
      calculationMethod: z.string().optional(),
      frequency: z.string().optional(),
      disaggregationFields: z.any().optional(),
      defaultTargets: z.any().optional(),
      active: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...updates } = input;
      const setData: any = {};
      if (updates.name !== undefined) setData.name = updates.name;
      if (updates.code !== undefined) setData.code = updates.code;
      if (updates.unitOfMeasure !== undefined) setData.unitOfMeasure = updates.unitOfMeasure;
      if (updates.calculationMethod !== undefined) setData.calculationMethod = updates.calculationMethod;
      if (updates.frequency !== undefined) setData.frequency = updates.frequency;
      if (updates.disaggregationFields !== undefined) setData.disaggregationFields = updates.disaggregationFields;
      if (updates.defaultTargets !== undefined) setData.defaultTargets = updates.defaultTargets;
      if (updates.active !== undefined) setData.active = updates.active;

      await db.update(mealIndicatorTemplates)
        .set(setData)
        .where(and(
          eq(mealIndicatorTemplates.id, id),
          eq(mealIndicatorTemplates.organizationId, organizationId),
          eq(mealIndicatorTemplates.isDeleted, false),
        ));

      return { success: true };
    }),

  deleteTemplate: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.update(mealIndicatorTemplates)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user?.id || null,
        })
        .where(and(
          eq(mealIndicatorTemplates.id, input.id),
          eq(mealIndicatorTemplates.organizationId, organizationId),
        ));

      return { success: true };
    }),

  // ---- Survey Standards ----
  listStandards: scopedProcedure
    .input(z.object({
      limit: z.number().default(100),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      return await db
        .select()
        .from(mealSurveyStandards)
        .where(and(
          eq(mealSurveyStandards.organizationId, organizationId),
          eq(mealSurveyStandards.isDeleted, false),
        ))
        .orderBy(desc(mealSurveyStandards.createdAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  getStandardById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [standard] = await db
        .select()
        .from(mealSurveyStandards)
        .where(and(
          eq(mealSurveyStandards.id, input.id),
          eq(mealSurveyStandards.organizationId, organizationId),
          eq(mealSurveyStandards.isDeleted, false),
        ));

      return standard || null;
    }),

  createStandard: scopedProcedure
    .input(z.object({
      standardName: z.string().min(1),
      validationRules: z.any().optional(),
      requiredFields: z.any().optional(),
      gpsRequired: z.boolean().default(false),
      photoRequired: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db.insert(mealSurveyStandards).values({
        organizationId,
        standardName: input.standardName,
        validationRules: input.validationRules || null,
        requiredFields: input.requiredFields || null,
        gpsRequired: input.gpsRequired,
        photoRequired: input.photoRequired,
      });

      // Audit log
      await db.insert(mealAuditLog).values({
        organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
        moduleName: "MEAL",
        entityType: "survey_standard",
        entityId: result.insertId,
        actionType: "create",
        actorUserId: ctx.user?.id || null,
        diff: { input },
      });

      return { id: result.insertId, success: true };
    }),

  updateStandard: scopedProcedure
    .input(z.object({
      id: z.number(),
      standardName: z.string().optional(),
      validationRules: z.any().optional(),
      requiredFields: z.any().optional(),
      gpsRequired: z.boolean().optional(),
      photoRequired: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...updates } = input;
      const setData: any = {};
      if (updates.standardName !== undefined) setData.standardName = updates.standardName;
      if (updates.validationRules !== undefined) setData.validationRules = updates.validationRules;
      if (updates.requiredFields !== undefined) setData.requiredFields = updates.requiredFields;
      if (updates.gpsRequired !== undefined) setData.gpsRequired = updates.gpsRequired;
      if (updates.photoRequired !== undefined) setData.photoRequired = updates.photoRequired;

      await db.update(mealSurveyStandards)
        .set(setData)
        .where(and(
          eq(mealSurveyStandards.id, id),
          eq(mealSurveyStandards.organizationId, organizationId),
          eq(mealSurveyStandards.isDeleted, false),
        ));

      return { success: true };
    }),

  deleteStandard: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.update(mealSurveyStandards)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user?.id || null,
        })
        .where(and(
          eq(mealSurveyStandards.id, input.id),
          eq(mealSurveyStandards.organizationId, organizationId),
        ));

      return { success: true };
    }),

  // ---- Activity Log (read-only) ----
  listAuditLog: scopedProcedure
    .input(z.object({
      entityType: z.string().optional(),
      actionType: z.enum(["create", "update", "delete", "approve", "export", "print"]).optional(),
      limit: z.number().default(100),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions: any[] = [
        eq(mealAuditLog.organizationId, organizationId),
      ];

      if (input.entityType) conditions.push(eq(mealAuditLog.entityType, input.entityType));
      if (input.actionType) conditions.push(eq(mealAuditLog.actionType, input.actionType));

      return await db
        .select()
        .from(mealAuditLog)
        .where(and(...conditions))
        .orderBy(desc(mealAuditLog.createdAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  // Stats
  stats: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const templates = await db
        .select()
        .from(mealIndicatorTemplates)
        .where(and(
          eq(mealIndicatorTemplates.organizationId, organizationId),
          eq(mealIndicatorTemplates.isDeleted, false),
        ));

      const standards = await db
        .select()
        .from(mealSurveyStandards)
        .where(and(
          eq(mealSurveyStandards.organizationId, organizationId),
          eq(mealSurveyStandards.isDeleted, false),
        ));

      const [logCount] = await db
        .select({ cnt: sql<number>`COUNT(*)` })
        .from(mealAuditLog)
        .where(eq(mealAuditLog.organizationId, organizationId));

      return {
        totalTemplates: templates.length,
        activeTemplates: templates.filter(t => t.active).length,
        totalStandards: standards.length,
        totalAuditEntries: logCount?.cnt || 0,
      };
    }),
});
