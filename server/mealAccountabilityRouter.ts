import { z } from "zod";
import { publicProcedure, protectedProcedure, router, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { mealAccountabilityRecords } from "../drizzle/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { canAccess, logSensitiveAccess } from "./rbacService";
import { TRPCError } from "@trpc/server";
import { isPlatformAdmin } from "../shared/const";

const nowSql = new Date().toISOString().slice(0, 19).replace('T', ' ');

const accountabilityProcedure = scopedProcedure.use(async ({ ctx, next }) => {
  const userId = ctx.user?.id;
  const orgId = ctx.scope?.organizationId;
  if (!userId || !orgId) throw new TRPCError({ code: 'UNAUTHORIZED' });
  if (isPlatformAdmin(ctx.user?.role)) return next({ ctx });
  const allowed = await canAccess(userId, orgId, 'meal', 'accountability', undefined, 'view');
  if (!allowed) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have permission to access Accountability & CRM. This is a sensitive workspace.' });
  }
  await logSensitiveAccess(userId, orgId, null, 'sensitive_access', 'meal', 'accountability', 'accountability_management');
  return next({ ctx });
});

/**
 * MEAL Accountability Router - Complaints, Feedback & Suggestions Management
 * MANDATORY: All queries filter isDeleted = false
 * MANDATORY: Delete operations use soft delete only (no hard delete)
 */
export const mealAccountabilityRouter = router({
  // Get all accountability records for an organization (excludes soft-deleted)
  getAll: accountabilityProcedure
    .input(z.object({
      projectId: z.number().optional(),
      recordType: z.enum(["complaint", "feedback", "suggestion"]).optional(),
      status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
      severity: z.enum(["low", "medium", "high", "critical"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const conditions = [
        eq(mealAccountabilityRecords.organizationId, organizationId),
        eq(mealAccountabilityRecords.isDeleted, 0),
      ];
      
      if (operatingUnitId) {
        conditions.push(eq(mealAccountabilityRecords.operatingUnitId, operatingUnitId));
      }
      if (input.projectId) {
        conditions.push(eq(mealAccountabilityRecords.projectId, input.projectId));
      }
      if (input.recordType) {
        conditions.push(eq(mealAccountabilityRecords.recordType, input.recordType));
      }
      if (input.status) {
        conditions.push(eq(mealAccountabilityRecords.status, input.status));
      }
      if (input.severity) {
        conditions.push(eq(mealAccountabilityRecords.severity, input.severity));
      }
      
      return await db
        .select()
        .from(mealAccountabilityRecords)
        .where(and(...conditions))
        .orderBy(desc(mealAccountabilityRecords.receivedAt));
    }),

  // Get single record by ID
  getById: accountabilityProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db
        .select()
        .from(mealAccountabilityRecords)
        .where(
          and(
            eq(mealAccountabilityRecords.id, input.id),
            eq(mealAccountabilityRecords.organizationId, organizationId),
            eq(mealAccountabilityRecords.isDeleted, 0)
          )
        )
        .limit(1);
      
      return result[0] || null;
    }),

  // Get statistics for dashboard
  getStatistics: accountabilityProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const conditions = [
        eq(mealAccountabilityRecords.organizationId, organizationId),
        eq(mealAccountabilityRecords.isDeleted, 0),
      ];
      
      if (operatingUnitId) {
        conditions.push(eq(mealAccountabilityRecords.operatingUnitId, operatingUnitId));
      }
      
      const allRecords = await db
        .select()
        .from(mealAccountabilityRecords)
        .where(and(...conditions));
      
      // By type
      const complaints = allRecords.filter(r => r.recordType === 'complaint').length;
      const feedback = allRecords.filter(r => r.recordType === 'feedback').length;
      const suggestions = allRecords.filter(r => r.recordType === 'suggestion').length;
      
      // By status
      const open = allRecords.filter(r => r.status === 'open').length;
      const inProgress = allRecords.filter(r => r.status === 'in_progress').length;
      const resolved = allRecords.filter(r => r.status === 'resolved').length;
      const closed = allRecords.filter(r => r.status === 'closed').length;
      
      // By severity
      const low = allRecords.filter(r => r.severity === 'low').length;
      const medium = allRecords.filter(r => r.severity === 'medium').length;
      const high = allRecords.filter(r => r.severity === 'high').length;
      const critical = allRecords.filter(r => r.severity === 'critical').length;
      
      return {
        total: allRecords.length,
        byType: { complaints, feedback, suggestions },
        byStatus: { open, inProgress, resolved, closed },
        bySeverity: { low, medium, high, critical },
      };
    }),

  // Create accountability record
  create: accountabilityProcedure
    .input(z.object({
      projectId: z.number().optional(),
      recordCode: z.string(),
      recordType: z.enum(["complaint", "feedback", "suggestion"]).default("feedback"),
      category: z.string().optional(),
      severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
      status: z.enum(["open", "in_progress", "resolved", "closed"]).default("open"),
      subject: z.string(),
      description: z.string(),
      submittedVia: z.string().optional(),
      isAnonymous: z.boolean().default(false),
      isSensitive: z.boolean().default(false),
      complainantName: z.string().optional(),
      complainantGender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
      complainantAgeGroup: z.string().optional(),
      complainantContact: z.string().optional(),
      complainantLocation: z.string().optional(),
      dueDate: z.string().optional(),
      assignedTo: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db.insert(mealAccountabilityRecords).values({
        organizationId,
        operatingUnitId,
        projectId: input.projectId,
        recordCode: input.recordCode,
        recordType: input.recordType,
        category: input.category,
        severity: input.severity,
        status: input.status,
        subject: input.subject,
        description: input.description,
        submittedVia: input.submittedVia,
        isAnonymous: input.isAnonymous,
        isSensitive: input.isSensitive,
        complainantName: input.complainantName,
        complainantGender: input.complainantGender,
        complainantAgeGroup: input.complainantAgeGroup,
        complainantContact: input.complainantContact,
        complainantLocation: input.complainantLocation,
        dueDate: input.dueDate,
        assignedTo: input.assignedTo,
        createdBy: ctx.user?.id,
        updatedBy: ctx.user?.id,
      });
      
      return { id: result[0].insertId, success: true };
    }),

  // Update accountability record
  update: accountabilityProcedure
    .input(z.object({
      id: z.number(),
      recordCode: z.string().optional(),
      recordType: z.enum(["complaint", "feedback", "suggestion"]).optional(),
      category: z.string().optional(),
      severity: z.enum(["low", "medium", "high", "critical"]).optional(),
      status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
      subject: z.string().optional(),
      description: z.string().optional(),
      submittedVia: z.string().optional(),
      isAnonymous: z.boolean().optional(),
      isSensitive: z.boolean().optional(),
      complainantName: z.string().optional(),
      complainantGender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
      complainantAgeGroup: z.string().optional(),
      complainantContact: z.string().optional(),
      complainantLocation: z.string().optional(),
      dueDate: z.string().optional(),
      assignedTo: z.number().optional(),
      resolution: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, ...updateData } = input;
      
      // If status is being set to resolved, set resolvedAt and resolvedBy
      const additionalData: any = { updatedBy: ctx.user?.id };
      if (input.status === 'resolved' || input.status === 'closed') {
        additionalData.resolvedAt = new Date();
        additionalData.resolvedBy = ctx.user?.id;
      }
      
      await db
        .update(mealAccountabilityRecords)
        .set({
          ...updateData,
          ...additionalData,
        })
        .where(and(eq(mealAccountabilityRecords.id, id), eq(mealAccountabilityRecords.organizationId, organizationId)));
      
      return { success: true };
    }),

  // SOFT DELETE ONLY - NO HARD DELETE ALLOWED
  delete: accountabilityProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // MANDATORY: Soft delete only - set isDeleted = true
      await db
        .update(mealAccountabilityRecords)
        .set({
          isDeleted: 1,
          deletedAt: nowSql,
          deletedBy: ctx.user?.id,
        })
        .where(and(eq(mealAccountabilityRecords.id, input.id), eq(mealAccountabilityRecords.organizationId, organizationId)));
      
      return { success: true };
    }),

  // Resolve record
  resolve: accountabilityProcedure
    .input(z.object({
      id: z.number(),
      resolution: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(mealAccountabilityRecords)
        .set({
          status: 'resolved',
          resolution: input.resolution,
          resolvedAt: nowSql,
          resolvedBy: ctx.user?.id,
          updatedBy: ctx.user?.id,
        })
        .where(and(eq(mealAccountabilityRecords.id, input.id), eq(mealAccountabilityRecords.organizationId, organizationId)));
      
      return { success: true };
    }),

  // Assign record to user
  assign: accountabilityProcedure
    .input(z.object({
      id: z.number(),
      assignedTo: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(mealAccountabilityRecords)
        .set({
          assignedTo: input.assignedTo,
          status: 'in_progress',
          updatedBy: ctx.user?.id,
        })
        .where(and(eq(mealAccountabilityRecords.id, input.id), eq(mealAccountabilityRecords.organizationId, organizationId)));
      
      return { success: true };
    }),
});
