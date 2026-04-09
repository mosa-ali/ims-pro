import { z } from "zod";
import { router, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { mealDqaVisits, mealDqaFindings, mealDqaActions, mealAuditLog } from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * MEAL Data Quality Assurance (DQA) Router
 * Full CRUD for DQA visits, findings, and corrective actions
 * MANDATORY: All queries filter isDeleted = false (soft delete)
 * MANDATORY: All procedures use scopedProcedure for org/OU isolation
 */
export const mealDqaRouter = router({
  // ---- DQA Visits ----
  listVisits: scopedProcedure
    .input(z.object({
      projectId: z.number().optional(),
      status: z.enum(["draft", "submitted", "approved", "closed"]).optional(),
      dataSource: z.enum(["survey", "indicator", "accountability", "mixed"]).optional(),
      limit: z.number().default(100),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions: any[] = [
        eq(mealDqaVisits.organizationId, organizationId),
        eq(mealDqaVisits.isDeleted, false),
      ];

      if (input.projectId) conditions.push(eq(mealDqaVisits.projectId, input.projectId));
      if (input.status) conditions.push(eq(mealDqaVisits.status, input.status));
      if (input.dataSource) conditions.push(eq(mealDqaVisits.dataSource, input.dataSource));

      return await db
        .select()
        .from(mealDqaVisits)
        .where(and(...conditions))
        .orderBy(desc(mealDqaVisits.visitDate))
        .limit(input.limit)
        .offset(input.offset);
    }),

  getVisitById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [visit] = await db
        .select()
        .from(mealDqaVisits)
        .where(and(
          eq(mealDqaVisits.id, input.id),
          eq(mealDqaVisits.organizationId, organizationId),
          eq(mealDqaVisits.isDeleted, false),
        ));

      return visit || null;
    }),

  createVisit: scopedProcedure
    .input(z.object({
      projectId: z.number(),
      visitDate: z.string(),
      verifierUserIds: z.any().optional(),
      locationIds: z.any().optional(),
      dataSource: z.enum(["survey", "indicator", "accountability", "mixed"]),
      samplingMethod: z.string().optional(),
      recordsCheckedCount: z.number().default(0),
      accurateCount: z.number().default(0),
      discrepanciesCount: z.number().default(0),
      missingFieldsCount: z.number().default(0),
      duplicatesCount: z.number().default(0),
      summary: z.string().optional(),
      status: z.enum(["draft", "submitted", "approved", "closed"]).default("draft"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Auto-generate DQA code
      const [countResult] = await db
        .select({ cnt: sql<number>`COUNT(*)` })
        .from(mealDqaVisits)
        .where(eq(mealDqaVisits.organizationId, organizationId));
      const nextNum = (countResult?.cnt || 0) + 1;
      const dqaCode = `DQA-${String(nextNum).padStart(4, '0')}`;

      const [result] = await db.insert(mealDqaVisits).values({
        organizationId,
        operatingUnitId,
        projectId: input.projectId,
        dqaCode,
        visitDate: new Date(input.visitDate),
        verifierUserIds: input.verifierUserIds || null,
        locationIds: input.locationIds || null,
        dataSource: input.dataSource,
        samplingMethod: input.samplingMethod || null,
        recordsCheckedCount: input.recordsCheckedCount,
        accurateCount: input.accurateCount,
        discrepanciesCount: input.discrepanciesCount,
        missingFieldsCount: input.missingFieldsCount,
        duplicatesCount: input.duplicatesCount,
        summary: input.summary || null,
        status: input.status,
        createdBy: ctx.user?.id || null,
      });

      // Audit log
      await db.insert(mealAuditLog).values({
        organizationId,
        operatingUnitId,
        moduleName: "MEAL",
        entityType: "dqa_visit",
        entityId: result.insertId,
        actionType: "create",
        actorUserId: ctx.user?.id || null,
        diff: { input },
      });

      return { id: result.insertId, dqaCode, success: true };
    }),

  updateVisit: scopedProcedure
    .input(z.object({
      id: z.number(),
      visitDate: z.string().optional(),
      verifierUserIds: z.any().optional(),
      locationIds: z.any().optional(),
      dataSource: z.enum(["survey", "indicator", "accountability", "mixed"]).optional(),
      samplingMethod: z.string().optional(),
      recordsCheckedCount: z.number().optional(),
      accurateCount: z.number().optional(),
      discrepanciesCount: z.number().optional(),
      missingFieldsCount: z.number().optional(),
      duplicatesCount: z.number().optional(),
      summary: z.string().optional(),
      status: z.enum(["draft", "submitted", "approved", "closed"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...updates } = input;
      const setData: any = { updatedBy: ctx.user?.id || null };
      if (updates.visitDate !== undefined) setData.visitDate = new Date(updates.visitDate);
      if (updates.verifierUserIds !== undefined) setData.verifierUserIds = updates.verifierUserIds;
      if (updates.locationIds !== undefined) setData.locationIds = updates.locationIds;
      if (updates.dataSource !== undefined) setData.dataSource = updates.dataSource;
      if (updates.samplingMethod !== undefined) setData.samplingMethod = updates.samplingMethod;
      if (updates.recordsCheckedCount !== undefined) setData.recordsCheckedCount = updates.recordsCheckedCount;
      if (updates.accurateCount !== undefined) setData.accurateCount = updates.accurateCount;
      if (updates.discrepanciesCount !== undefined) setData.discrepanciesCount = updates.discrepanciesCount;
      if (updates.missingFieldsCount !== undefined) setData.missingFieldsCount = updates.missingFieldsCount;
      if (updates.duplicatesCount !== undefined) setData.duplicatesCount = updates.duplicatesCount;
      if (updates.summary !== undefined) setData.summary = updates.summary;
      if (updates.status !== undefined) setData.status = updates.status;

      await db.update(mealDqaVisits)
        .set(setData)
        .where(and(
          eq(mealDqaVisits.id, id),
          eq(mealDqaVisits.organizationId, organizationId),
          eq(mealDqaVisits.isDeleted, false),
        ));

      return { success: true };
    }),

  deleteVisit: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.update(mealDqaVisits)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user?.id || null,
        })
        .where(and(
          eq(mealDqaVisits.id, input.id),
          eq(mealDqaVisits.organizationId, organizationId),
        ));

      return { success: true };
    }),

  // Stats/KPIs
  stats: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const visits = await db
        .select()
        .from(mealDqaVisits)
        .where(and(
          eq(mealDqaVisits.organizationId, organizationId),
          eq(mealDqaVisits.isDeleted, false),
        ));

      const totalVisits = visits.length;
      const totalRecordsChecked = visits.reduce((s, v) => s + (v.recordsCheckedCount || 0), 0);
      const totalDiscrepancies = visits.reduce((s, v) => s + (v.discrepanciesCount || 0), 0);
      const totalAccurate = visits.reduce((s, v) => s + (v.accurateCount || 0), 0);
      const accuracyRate = totalRecordsChecked > 0 ? Math.round((totalAccurate / totalRecordsChecked) * 100) : 0;
      const approved = visits.filter(v => v.status === "approved" || v.status === "closed").length;
      const pending = visits.filter(v => v.status === "draft" || v.status === "submitted").length;

      // Findings stats
      const findings = await db
        .select()
        .from(mealDqaFindings)
        .where(and(
          eq(mealDqaFindings.organizationId, organizationId),
          eq(mealDqaFindings.isDeleted, false),
        ));

      const totalFindings = findings.length;
      const highSeverity = findings.filter(f => f.severity === "high").length;

      return { totalVisits, totalRecordsChecked, totalDiscrepancies, accuracyRate, approved, pending, totalFindings, highSeverity };
    }),

  // ---- DQA Findings ----
  listFindings: scopedProcedure
    .input(z.object({ dqaVisitId: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      return await db
        .select()
        .from(mealDqaFindings)
        .where(and(
          eq(mealDqaFindings.dqaVisitId, input.dqaVisitId),
          eq(mealDqaFindings.organizationId, organizationId),
          eq(mealDqaFindings.isDeleted, false),
        ))
        .orderBy(desc(mealDqaFindings.createdAt));
    }),

  createFinding: scopedProcedure
    .input(z.object({
      dqaVisitId: z.number(),
      severity: z.enum(["low", "medium", "high"]),
      category: z.enum(["completeness", "accuracy", "timeliness", "integrity", "validity"]),
      findingText: z.string().min(1),
      recommendationText: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db.insert(mealDqaFindings).values({
        dqaVisitId: input.dqaVisitId,
        organizationId,
        operatingUnitId,
        severity: input.severity,
        category: input.category,
        findingText: input.findingText,
        recommendationText: input.recommendationText || null,
      });

      return { id: result.insertId, success: true };
    }),

  updateFinding: scopedProcedure
    .input(z.object({
      id: z.number(),
      severity: z.enum(["low", "medium", "high"]).optional(),
      category: z.enum(["completeness", "accuracy", "timeliness", "integrity", "validity"]).optional(),
      findingText: z.string().optional(),
      recommendationText: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...updates } = input;
      const setData: any = {};
      if (updates.severity !== undefined) setData.severity = updates.severity;
      if (updates.category !== undefined) setData.category = updates.category;
      if (updates.findingText !== undefined) setData.findingText = updates.findingText;
      if (updates.recommendationText !== undefined) setData.recommendationText = updates.recommendationText;

      await db.update(mealDqaFindings)
        .set(setData)
        .where(and(
          eq(mealDqaFindings.id, id),
          eq(mealDqaFindings.organizationId, organizationId),
          eq(mealDqaFindings.isDeleted, false),
        ));

      return { success: true };
    }),

  deleteFinding: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.update(mealDqaFindings)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user?.id || null,
        })
        .where(and(
          eq(mealDqaFindings.id, input.id),
          eq(mealDqaFindings.organizationId, organizationId),
        ));

      return { success: true };
    }),

  // ---- DQA Corrective Actions ----
  listActions: scopedProcedure
    .input(z.object({ dqaFindingId: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      return await db
        .select()
        .from(mealDqaActions)
        .where(and(
          eq(mealDqaActions.dqaFindingId, input.dqaFindingId),
          eq(mealDqaActions.organizationId, organizationId),
          eq(mealDqaActions.isDeleted, false),
        ))
        .orderBy(desc(mealDqaActions.createdAt));
    }),

  createAction: scopedProcedure
    .input(z.object({
      dqaFindingId: z.number(),
      actionText: z.string().min(1),
      ownerUserId: z.number().optional(),
      dueDate: z.string().optional(),
      status: z.enum(["open", "in_progress", "closed"]).default("open"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db.insert(mealDqaActions).values({
        dqaFindingId: input.dqaFindingId,
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
      status: z.enum(["open", "in_progress", "closed"]).optional(),
      dueDate: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...updates } = input;
      const setData: any = {};
      if (updates.actionText !== undefined) setData.actionText = updates.actionText;
      if (updates.status !== undefined) setData.status = updates.status;
      if (updates.dueDate !== undefined) setData.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;

      await db.update(mealDqaActions)
        .set(setData)
        .where(and(
          eq(mealDqaActions.id, id),
          eq(mealDqaActions.organizationId, organizationId),
          eq(mealDqaActions.isDeleted, false),
        ));

      return { success: true };
    }),

  deleteAction: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.update(mealDqaActions)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user?.id || null,
        })
        .where(and(
          eq(mealDqaActions.id, input.id),
          eq(mealDqaActions.organizationId, organizationId),
        ));

      return { success: true };
    }),
});
