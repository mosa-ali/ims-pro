import { z } from "zod";
import { publicProcedure, protectedProcedure, router, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { hrSanctions } from "../drizzle/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { canAccess, logSensitiveAccess } from "./rbacService";
import { TRPCError } from "@trpc/server";
import { isPlatformAdmin } from "../shared/const";

const sanctionsProcedure = scopedProcedure.use(async ({ ctx, next }) => {
  const userId = ctx.user?.id;
  const orgId = ctx.scope?.organizationId;
  if (!userId || !orgId) throw new TRPCError({ code: 'UNAUTHORIZED' });
  if (isPlatformAdmin(ctx.user?.role)) return next({ ctx });
  const allowed = await canAccess(userId, orgId, 'hr', 'hr_sanctions', undefined, 'view');
  if (!allowed) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have permission to access HR Sanctions & Disciplinary. This is a sensitive workspace.' });
  }
  await logSensitiveAccess(userId, orgId, null, 'sensitive_access', 'hr', 'hr_sanctions', 'sanctions_management');
  return next({ ctx });
});

/**
 * HR Sanctions Router - Disciplinary Actions Management
 * MANDATORY: All queries filter isDeleted = false
 * MANDATORY: Delete operations use soft delete only (no hard delete)
 */
export const hrSanctionsRouter = router({
  // Get all sanctions for an organization
  getAll: sanctionsProcedure
    .input(z.object({
      employeeId: z.number().optional(),
      sanctionType: z.enum(["verbal_warning", "written_warning", "final_warning", "suspension", "demotion", "termination", "other"]).optional(),
      severity: z.enum(["minor", "moderate", "major", "critical"]).optional(),
      status: z.enum(["reported", "under_investigation", "pending_decision", "decided", "appealed", "closed"]).optional(),
      limit: z.number().optional().default(100),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const conditions = [
        eq(hrSanctions.organizationId, organizationId),
        eq(hrSanctions.isDeleted, false),
      ];
      
      if (input.employeeId) {
        conditions.push(eq(hrSanctions.employeeId, input.employeeId));
      }
      if (input.sanctionType) {
        conditions.push(eq(hrSanctions.sanctionType, input.sanctionType));
      }
      if (input.severity) {
        conditions.push(eq(hrSanctions.severity, input.severity));
      }
      if (input.status) {
        conditions.push(eq(hrSanctions.status, input.status));
      }
      
      return await db
        .select()
        .from(hrSanctions)
        .where(and(...conditions))
        .orderBy(desc(hrSanctions.createdAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  // Get single sanction by ID
  getById: sanctionsProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db
        .select()
        .from(hrSanctions)
        .where(
          and(
            eq(hrSanctions.id, input.id),
            eq(hrSanctions.organizationId, organizationId),
            eq(hrSanctions.isDeleted, false)
          )
        )
        .limit(1);
      
      return result[0] || null;
    }),

  // Get sanctions statistics
  getStatistics: sanctionsProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const allSanctions = await db
        .select()
        .from(hrSanctions)
        .where(
          and(
            eq(hrSanctions.organizationId, organizationId),
            eq(hrSanctions.isDeleted, false)
          )
        );
      
      // By status
      const reported = allSanctions.filter(s => s.status === 'reported').length;
      const underInvestigation = allSanctions.filter(s => s.status === 'under_investigation').length;
      const pendingDecision = allSanctions.filter(s => s.status === 'pending_decision').length;
      const decided = allSanctions.filter(s => s.status === 'decided').length;
      const appealed = allSanctions.filter(s => s.status === 'appealed').length;
      const closed = allSanctions.filter(s => s.status === 'closed').length;
      
      // By type
      const verbalWarning = allSanctions.filter(s => s.sanctionType === 'verbal_warning').length;
      const writtenWarning = allSanctions.filter(s => s.sanctionType === 'written_warning').length;
      const finalWarning = allSanctions.filter(s => s.sanctionType === 'final_warning').length;
      const suspension = allSanctions.filter(s => s.sanctionType === 'suspension').length;
      const demotion = allSanctions.filter(s => s.sanctionType === 'demotion').length;
      const termination = allSanctions.filter(s => s.sanctionType === 'termination').length;
      const other = allSanctions.filter(s => s.sanctionType === 'other').length;
      
      // By severity
      const minor = allSanctions.filter(s => s.severity === 'minor').length;
      const moderate = allSanctions.filter(s => s.severity === 'moderate').length;
      const major = allSanctions.filter(s => s.severity === 'major').length;
      const critical = allSanctions.filter(s => s.severity === 'critical').length;
      
      return {
        total: allSanctions.length,
        byStatus: { reported, underInvestigation, pendingDecision, decided, appealed, closed },
        byType: { verbalWarning, writtenWarning, finalWarning, suspension, demotion, termination, other },
        bySeverity: { minor, moderate, major, critical },
        activeCount: reported + underInvestigation + pendingDecision + appealed,
      };
    }),

  // Create new sanction
  create: sanctionsProcedure
    .input(z.object({
      employeeId: z.number(),
      sanctionCode: z.string().optional(),
      sanctionType: z.enum(["verbal_warning", "written_warning", "final_warning", "suspension", "demotion", "termination", "other"]),
      severity: z.enum(["minor", "moderate", "major", "critical"]),
      incidentDate: z.string(),
      reportedDate: z.string().optional(),
      description: z.string(),
      evidence: z.string().optional(), // JSON array of URLs
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db.insert(hrSanctions).values({
        organizationId,
        employeeId: input.employeeId,
        sanctionCode: input.sanctionCode,
        sanctionType: input.sanctionType,
        severity: input.severity,
        incidentDate: new Date(input.incidentDate),
        reportedDate: input.reportedDate ? new Date(input.reportedDate) : new Date(),
        description: input.description,
        evidence: input.evidence,
        notes: input.notes,
        status: "reported",
      });
      
      return { id: result[0].insertId, success: true };
    }),

  // Update sanction
  update: sanctionsProcedure
    .input(z.object({
      id: z.number(),
      sanctionCode: z.string().optional(),
      sanctionType: z.enum(["verbal_warning", "written_warning", "final_warning", "suspension", "demotion", "termination", "other"]).optional(),
      severity: z.enum(["minor", "moderate", "major", "critical"]).optional(),
      incidentDate: z.string().optional(),
      description: z.string().optional(),
      evidence: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, ...updateData } = input;
      
      const processedData: Record<string, unknown> = { ...updateData };
      if (updateData.incidentDate) processedData.incidentDate = new Date(updateData.incidentDate);
      
      await db
        .update(hrSanctions)
        .set(processedData)
        .where(and(eq(hrSanctions.id, id), eq(hrSanctions.organizationId, organizationId)));
      
      return { success: true };
    }),

  // Start investigation
  startInvestigation: sanctionsProcedure
    .input(z.object({
      id: z.number(),
      investigationNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(hrSanctions)
        .set({
          status: "under_investigation",
          investigatedBy: ctx.user?.id,
          investigationDate: new Date(),
          investigationNotes: input.investigationNotes,
        })
        .where(and(eq(hrSanctions.id, input.id), eq(hrSanctions.organizationId, organizationId)));
      
      return { success: true };
    }),

  // Complete investigation
  completeInvestigation: sanctionsProcedure
    .input(z.object({
      id: z.number(),
      investigationNotes: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(hrSanctions)
        .set({
          status: "pending_decision",
          investigationNotes: input.investigationNotes,
        })
        .where(and(eq(hrSanctions.id, input.id), eq(hrSanctions.organizationId, organizationId)));
      
      return { success: true };
    }),

  // Make decision
  makeDecision: sanctionsProcedure
    .input(z.object({
      id: z.number(),
      decision: z.string(),
      effectiveDate: z.string().optional(),
      expiryDate: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(hrSanctions)
        .set({
          status: "decided",
          decisionDate: new Date(),
          decisionBy: ctx.user?.id,
          decision: input.decision,
          effectiveDate: input.effectiveDate ? new Date(input.effectiveDate) : null,
          expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
        })
        .where(and(eq(hrSanctions.id, input.id), eq(hrSanctions.organizationId, organizationId)));
      
      return { success: true };
    }),

  // Record appeal
  recordAppeal: sanctionsProcedure
    .input(z.object({
      id: z.number(),
      appealNotes: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(hrSanctions)
        .set({
          status: "appealed",
          appealDate: new Date(),
          appealNotes: input.appealNotes,
        })
        .where(and(eq(hrSanctions.id, input.id), eq(hrSanctions.organizationId, organizationId)));
      
      return { success: true };
    }),

  // Resolve appeal
  resolveAppeal: sanctionsProcedure
    .input(z.object({
      id: z.number(),
      appealOutcome: z.enum(["upheld", "modified", "overturned"]),
      appealNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(hrSanctions)
        .set({
          status: input.appealOutcome === "overturned" ? "closed" : "decided",
          appealOutcome: input.appealOutcome,
          appealNotes: input.appealNotes,
        })
        .where(and(eq(hrSanctions.id, input.id), eq(hrSanctions.organizationId, organizationId)));
      
      return { success: true };
    }),

  // Close sanction
  close: sanctionsProcedure
    .input(z.object({
      id: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(hrSanctions)
        .set({
          status: "closed",
          notes: input.notes,
        })
        .where(and(eq(hrSanctions.id, input.id), eq(hrSanctions.organizationId, organizationId)));
      
      return { success: true };
    }),

  // Soft delete sanction
  delete: sanctionsProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(hrSanctions)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user?.id,
        })
        .where(and(eq(hrSanctions.id, input.id), eq(hrSanctions.organizationId, organizationId)));
      
      return { success: true };
    }),
});
