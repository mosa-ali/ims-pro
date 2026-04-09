/**
 * ============================================================================
 * RISK & COMPLIANCE ROUTER
 * ============================================================================
 * 
 * Comprehensive risk management and incident tracking system.
 * 
 * GOVERNANCE RULES:
 * - All operations use scopedProcedure for Org/OU isolation
 * - Risk scoring calculated on backend: Likelihood (1-5) × Impact (1-5) = Score (1-25)
 * - Level mapping: 1-4=Low, 5-10=Medium, 11-19=High, 20-25=Critical
 * - Audit trail tracking via risk_history table
 * - Attachments stored in S3 via storagePut()
 * - Bilingual support (EN/AR) required for completion
 * - RBAC: Risk Managers create, Risk Owners update mitigation
 * 
 * ============================================================================
 */

import { z } from "zod";
import { router, scopedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { 
  risks,
  incidents,
  riskHistory,
  users,
  organizations,
  operatingUnits,
} from "../../drizzle/schema";
import {  eq, and, sql, desc, asc, gte, lte, count, sum, inArray, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate risk score and level based on likelihood and impact
 * Formula: Score = Likelihood (1-5) × Impact (1-5)
 * Level mapping:
 * - 1-4: Low (Green)
 * - 5-10: Medium (Yellow)
 * - 11-19: High (Orange)
 * - 20-25: Critical (Red)
 */
function calculateRiskScoreAndLevel(likelihood: number, impact: number): { score: number; level: "low" | "medium" | "high" | "critical" } {
  const score = likelihood * impact;
  
  let level: "low" | "medium" | "high" | "critical";
  if (score >= 1 && score <= 4) {
    level = "low";
  } else if (score >= 5 && score <= 10) {
    level = "medium";
  } else if (score >= 11 && score <= 19) {
    level = "high";
  } else {
    level = "critical";
  }
  
  return { score, level };
}

/**
 * Create audit trail entry in risk_history table
 */
async function createRiskHistoryEntry(
  db: any,
  riskId: number,
  organizationId: number,
  operatingUnitId: number | null,
  changeType: "created" | "status_changed" | "owner_changed" | "assessment_updated" | "mitigation_updated" | "closed" | "reopened" | "other",
  previousValue: any,
  newValue: any,
  description: string | null,
  descriptionAr: string | null,
  changedBy: number
) {
  await db.insert(riskHistory).values({
    riskId,
    organizationId,
    operatingUnitId,
    changeType,
    previousValue: previousValue ? JSON.stringify(previousValue) : null,
    newValue: newValue ? JSON.stringify(newValue) : null,
    description,
    descriptionAr,
    changedBy,
  });
}

// ============================================================================
// RISKS ROUTER
// ============================================================================

export const risksRouter = router({
  /**
   * List all risks with optional filters
   */
  list: scopedProcedure
    .input(z.object({
      status: z.enum(["identified", "assessed", "mitigated", "accepted", "transferred", "closed"]).optional(),
      level: z.enum(["low", "medium", "high", "critical"]).optional(),
      category: z.enum(["operational", "financial", "strategic", "compliance", "reputational", "technological", "environmental", "security", "legal", "other"]).optional(),
      ownerId: z.number().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      // Base conditions for scoping
      let conditions = [
        eq(risks.organizationId, organizationId),
        isNull(risks.deletedAt),
      ];

      if (operatingUnitId) {
        conditions.push(eq(risks.operatingUnitId, operatingUnitId));
      }

      // Apply filters
      if (input?.status) {
        conditions.push(eq(risks.status, input.status));
      }
      if (input?.level) {
        conditions.push(eq(risks.level, input.level));
      }
      if (input?.category) {
        conditions.push(eq(risks.category, input.category));
      }
      if (input?.ownerId) {
        conditions.push(eq(risks.owner, input.ownerId));
      }

      const allRisks = await db
        .select({
          risk: risks,
          ownerUser: users,
        })
        .from(risks)
        .leftJoin(users, eq(risks.owner, users.id))
        .where(and(...conditions))
        .orderBy(desc(risks.createdAt));

      return allRisks.map(r => ({
        ...r.risk,
        ownerName: r.ownerUser?.name || null,
      }));
    }),

  /**
   * Get single risk by ID with full details
   */
  getById: scopedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      const result = await db
        .select({
          risk: risks,
          ownerUser: users,
          organization: organizations,
          operatingUnit: operatingUnits,
        })
        .from(risks)
        .leftJoin(users, eq(risks.owner, users.id))
        .leftJoin(organizations, eq(risks.organizationId, organizations.id))
        .leftJoin(operatingUnits, eq(risks.operatingUnitId, operatingUnits.id))
        .where(
          and(
            eq(risks.id, input.id),
            eq(risks.organizationId, organizationId),
            operatingUnitId ? eq(risks.operatingUnitId, operatingUnitId) : sql`1=1`,
            isNull(risks.deletedAt)
          )
        )
        .limit(1);

      if (result.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Risk not found or access denied",
        });
      }

      const risk = result[0];
      return {
        ...risk.risk,
        ownerName: risk.ownerUser?.name || null,
        organizationName: risk.organization?.name || null,
        operatingUnitName: risk.operatingUnit?.name || null,
      };
    }),

  /**
   * Create new risk
   */
  create: scopedProcedure
    .input(z.object({
      riskCode: z.string().optional(),
      title: z.string().min(1),
      titleAr: z.string().optional(),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
      category: z.enum(["operational", "financial", "strategic", "compliance", "reputational", "technological", "environmental", "security", "legal", "other"]),
      likelihood: z.number().min(1).max(5),
      impact: z.number().min(1).max(5),
      status: z.enum(["identified", "assessed", "mitigated", "accepted", "transferred", "closed"]).default("identified"),
      mitigationPlan: z.string().optional(),
      mitigationPlanAr: z.string().optional(),
      owner: z.number().optional(),
      identifiedDate: z.string().optional(),
      reviewDate: z.string().optional(),
      targetClosureDate: z.string().optional(),
      attachments: z.string().optional(), // JSON array
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;
      const userId = ctx.user.id;

      // Calculate risk score and level
      const { score, level } = calculateRiskScoreAndLevel(input.likelihood, input.impact);

      // Insert risk
      const [newRisk] = await db.insert(risks).values({
        organizationId,
        operatingUnitId,
        riskCode: input.riskCode,
        title: input.title,
        titleAr: input.titleAr,
        description: input.description,
        descriptionAr: input.descriptionAr,
        category: input.category,
        likelihood: input.likelihood,
        impact: input.impact,
        score,
        level,
        status: input.status,
        mitigationPlan: input.mitigationPlan,
        mitigationPlanAr: input.mitigationPlanAr,
        owner: input.owner,
        identifiedDate: input.identifiedDate ? new Date(input.identifiedDate) : null,
        reviewDate: input.reviewDate ? new Date(input.reviewDate) : null,
        targetClosureDate: input.targetClosureDate ? new Date(input.targetClosureDate) : null,
        attachments: input.attachments,
        notes: input.notes,
        createdBy: userId,
      });

      // Create audit trail entry
      await createRiskHistoryEntry(
        db,
        newRisk.insertId,
        organizationId,
        operatingUnitId,
        "created",
        null,
        { title: input.title, level, score },
        "Risk created",
        "تم إنشاء المخاطر",
        userId
      );

      return { id: newRisk.insertId, success: true };
    }),

  /**
   * Update existing risk
   */
  update: scopedProcedure
    .input(z.object({
      id: z.number(),
      riskCode: z.string().optional(),
      title: z.string().optional(),
      titleAr: z.string().optional(),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
      category: z.enum(["operational", "financial", "strategic", "compliance", "reputational", "technological", "environmental", "security", "legal", "other"]).optional(),
      likelihood: z.number().min(1).max(5).optional(),
      impact: z.number().min(1).max(5).optional(),
      status: z.enum(["identified", "assessed", "mitigated", "accepted", "transferred", "closed"]).optional(),
      mitigationPlan: z.string().optional(),
      mitigationPlanAr: z.string().optional(),
      owner: z.number().optional(),
      identifiedDate: z.string().optional(),
      reviewDate: z.string().optional(),
      targetClosureDate: z.string().optional(),
      closedDate: z.string().optional(),
      attachments: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;
      const userId = ctx.user.id;

      // Get existing risk for audit trail
      const [existingRisk] = await db
        .select()
        .from(risks)
        .where(
          and(
            eq(risks.id, input.id),
            eq(risks.organizationId, organizationId),
            operatingUnitId ? eq(risks.operatingUnitId, operatingUnitId) : sql`1=1`,
            isNull(risks.deletedAt)
          )
        )
        .limit(1);

      if (!existingRisk) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Risk not found or access denied",
        });
      }

      // Prepare update values
      const updateValues: any = {};
      let changeType: "status_changed" | "owner_changed" | "assessment_updated" | "mitigation_updated" | "closed" | "other" = "other";
      let changeDescription = "Risk updated";
      let changeDescriptionAr = "تم تحديث المخاطر";

      // Track changes for audit
      if (input.title !== undefined) updateValues.title = input.title;
      if (input.titleAr !== undefined) updateValues.titleAr = input.titleAr;
      if (input.description !== undefined) updateValues.description = input.description;
      if (input.descriptionAr !== undefined) updateValues.descriptionAr = input.descriptionAr;
      if (input.category !== undefined) updateValues.category = input.category;
      if (input.riskCode !== undefined) updateValues.riskCode = input.riskCode;
      if (input.notes !== undefined) updateValues.notes = input.notes;
      if (input.attachments !== undefined) updateValues.attachments = input.attachments;

      // Handle status change
      if (input.status !== undefined && input.status !== existingRisk.status) {
        updateValues.status = input.status;
        changeType = input.status === "closed" ? "closed" : "status_changed";
        changeDescription = `Status changed from ${existingRisk.status} to ${input.status}`;
        changeDescriptionAr = `تم تغيير الحالة من ${existingRisk.status} إلى ${input.status}`;
      }

      // Handle owner change
      if (input.owner !== undefined && input.owner !== existingRisk.owner) {
        updateValues.owner = input.owner;
        changeType = "owner_changed";
        changeDescription = "Risk owner changed";
        changeDescriptionAr = "تم تغيير مالك المخاطر";
      }

      // Handle likelihood/impact change (assessment update)
      if ((input.likelihood !== undefined && input.likelihood !== existingRisk.likelihood) ||
          (input.impact !== undefined && input.impact !== existingRisk.impact)) {
        const newLikelihood = input.likelihood ?? existingRisk.likelihood;
        const newImpact = input.impact ?? existingRisk.impact;
        const { score, level } = calculateRiskScoreAndLevel(newLikelihood, newImpact);
        
        updateValues.likelihood = newLikelihood;
        updateValues.impact = newImpact;
        updateValues.score = score;
        updateValues.level = level;
        changeType = "assessment_updated";
        changeDescription = `Risk assessment updated: Score ${existingRisk.score} → ${score}, Level ${existingRisk.level} → ${level}`;
        changeDescriptionAr = `تم تحديث تقييم المخاطر: النتيجة ${existingRisk.score} ← ${score}، المستوى ${existingRisk.level} ← ${level}`;
      }

      // Handle mitigation plan change
      if ((input.mitigationPlan !== undefined && input.mitigationPlan !== existingRisk.mitigationPlan) ||
          (input.mitigationPlanAr !== undefined && input.mitigationPlanAr !== existingRisk.mitigationPlanAr)) {
        updateValues.mitigationPlan = input.mitigationPlan ?? existingRisk.mitigationPlan;
        updateValues.mitigationPlanAr = input.mitigationPlanAr ?? existingRisk.mitigationPlanAr;
        changeType = "mitigation_updated";
        changeDescription = "Mitigation plan updated";
        changeDescriptionAr = "تم تحديث خطة التخفيف";
      }

      // Handle dates
      if (input.identifiedDate !== undefined) {
        updateValues.identifiedDate = input.identifiedDate ? new Date(input.identifiedDate) : null;
      }
      if (input.reviewDate !== undefined) {
        updateValues.reviewDate = input.reviewDate ? new Date(input.reviewDate) : null;
      }
      if (input.targetClosureDate !== undefined) {
        updateValues.targetClosureDate = input.targetClosureDate ? new Date(input.targetClosureDate) : null;
      }
      if (input.closedDate !== undefined) {
        updateValues.closedDate = input.closedDate ? new Date(input.closedDate) : null;
      }

      // Update risk
      await db
        .update(risks)
        .set(updateValues)
        .where(eq(risks.id, input.id));

      // Create audit trail entry
      await createRiskHistoryEntry(
        db,
        input.id,
        organizationId,
        operatingUnitId,
        changeType,
        { status: existingRisk.status, owner: existingRisk.owner, score: existingRisk.score, level: existingRisk.level },
        { status: updateValues.status, owner: updateValues.owner, score: updateValues.score, level: updateValues.level },
        changeDescription,
        changeDescriptionAr,
        userId
      );

      return { success: true };
    }),

  /**
   * Soft delete risk
   */
  delete: scopedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;
      const userId = ctx.user.id;

      // Verify risk exists and belongs to organization
      const [existingRisk] = await db
        .select()
        .from(risks)
        .where(
          and(
            eq(risks.id, input.id),
            eq(risks.organizationId, organizationId),
            operatingUnitId ? eq(risks.operatingUnitId, operatingUnitId) : sql`1=1`,
            isNull(risks.deletedAt)
          )
        )
        .limit(1);

      if (!existingRisk) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Risk not found or access denied",
        });
      }

      // Soft delete
      await db
        .update(risks)
        .set({
          deletedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
          deletedBy: userId,
        })
        .where(eq(risks.id, input.id));

      return { success: true };
    }),

  /**
   * Get risk history (audit trail)
   */
  getHistory: scopedProcedure
    .input(z.object({
      riskId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      // Verify risk exists and belongs to organization
      const [existingRisk] = await db
        .select()
        .from(risks)
        .where(
          and(
            eq(risks.id, input.riskId),
            eq(risks.organizationId, organizationId),
            operatingUnitId ? eq(risks.operatingUnitId, operatingUnitId) : sql`1=1`
          )
        )
        .limit(1);

      if (!existingRisk) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Risk not found or access denied",
        });
      }

      // Get history entries
      const history = await db
        .select({
          history: riskHistory,
          changedByUser: users,
        })
        .from(riskHistory)
        .leftJoin(users, eq(riskHistory.changedBy, users.id))
        .where(eq(riskHistory.riskId, input.riskId))
        .orderBy(desc(riskHistory.changedAt));

      return history.map(h => ({
        ...h.history,
        changedByName: h.changedByUser?.name || "Unknown",
        previousValue: h.history.previousValue ? JSON.parse(h.history.previousValue) : null,
        newValue: h.history.newValue ? JSON.parse(h.history.newValue) : null,
      }));
    }),

  /**
   * Get related incidents for a risk
   */
  getRelatedIncidents: scopedProcedure
    .input(z.object({
      riskId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      // Verify risk exists
      const [existingRisk] = await db
        .select()
        .from(risks)
        .where(
          and(
            eq(risks.id, input.riskId),
            eq(risks.organizationId, organizationId),
            operatingUnitId ? eq(risks.operatingUnitId, operatingUnitId) : sql`1=1`
          )
        )
        .limit(1);

      if (!existingRisk) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Risk not found or access denied",
        });
      }

      // Get related incidents
      const relatedIncidents = await db
        .select()
        .from(incidents)
        .where(
          and(
            eq(incidents.relatedRiskId, input.riskId),
            eq(incidents.organizationId, organizationId),
            operatingUnitId ? eq(incidents.operatingUnitId, operatingUnitId) : sql`1=1`,
            isNull(incidents.deletedAt)
          )
        )
        .orderBy(desc(incidents.incidentDate));

      return relatedIncidents;
    }),
});

// ============================================================================
// INCIDENTS ROUTER
// ============================================================================

export const incidentsRouter = router({
  /**
   * List all incidents with optional filters
   */
  list: scopedProcedure
    .input(z.object({
      status: z.enum(["open", "under_investigation", "resolved", "closed"]).optional(),
      severity: z.enum(["minor", "moderate", "major", "critical"]).optional(),
      category: z.enum(["safety", "security", "data_breach", "operational", "hr", "financial", "environmental", "legal", "reputational", "other"]).optional(),
      relatedRiskId: z.number().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      let conditions = [
        eq(incidents.organizationId, organizationId),
        isNull(incidents.deletedAt),
      ];

      if (operatingUnitId) {
        conditions.push(eq(incidents.operatingUnitId, operatingUnitId));
      }

      if (input?.status) {
        conditions.push(eq(incidents.status, input.status));
      }
      if (input?.severity) {
        conditions.push(eq(incidents.severity, input.severity));
      }
      if (input?.category) {
        conditions.push(eq(incidents.category, input.category));
      }
      if (input?.relatedRiskId) {
        conditions.push(eq(incidents.relatedRiskId, input.relatedRiskId));
      }

      const allIncidents = await db
        .select({
          incident: incidents,
          reportedByUser: users,
          relatedRisk: risks,
        })
        .from(incidents)
        .leftJoin(users, eq(incidents.reportedBy, users.id))
        .leftJoin(risks, eq(incidents.relatedRiskId, risks.id))
        .where(and(...conditions))
        .orderBy(desc(incidents.incidentDate));

      return allIncidents.map(i => ({
        ...i.incident,
        reportedByName: i.reportedByUser?.name || null,
        relatedRiskTitle: i.relatedRisk?.title || null,
      }));
    }),

  /**
   * Get single incident by ID
   */
  getById: scopedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      const result = await db
        .select({
          incident: incidents,
          reportedByUser: users,
          relatedRisk: risks,
        })
        .from(incidents)
        .leftJoin(users, eq(incidents.reportedBy, users.id))
        .leftJoin(risks, eq(incidents.relatedRiskId, risks.id))
        .where(
          and(
            eq(incidents.id, input.id),
            eq(incidents.organizationId, organizationId),
            operatingUnitId ? eq(incidents.operatingUnitId, operatingUnitId) : sql`1=1`,
            isNull(incidents.deletedAt)
          )
        )
        .limit(1);

      if (result.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Incident not found or access denied",
        });
      }

      const incident = result[0];
      return {
        ...incident.incident,
        reportedByName: incident.reportedByUser?.name || null,
        relatedRiskTitle: incident.relatedRisk?.title || null,
      };
    }),

  /**
   * Create new incident
   */
  create: scopedProcedure
    .input(z.object({
      incidentCode: z.string().optional(),
      title: z.string().min(1),
      titleAr: z.string().optional(),
      description: z.string().min(1),
      descriptionAr: z.string().optional(),
      category: z.enum(["safety", "security", "data_breach", "operational", "hr", "financial", "environmental", "legal", "reputational", "other"]),
      severity: z.enum(["minor", "moderate", "major", "critical"]),
      incidentDate: z.string(),
      location: z.string().optional(),
      reportedBy: z.number().optional(),
      affectedParties: z.string().optional(), // JSON
      witnesses: z.string().optional(), // JSON
      relatedRiskId: z.number().optional(),
      attachments: z.string().optional(), // JSON
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;
      const userId = ctx.user.id;

      const [newIncident] = await db.insert(incidents).values({
        organizationId,
        operatingUnitId,
        incidentCode: input.incidentCode,
        title: input.title,
        titleAr: input.titleAr,
        description: input.description,
        descriptionAr: input.descriptionAr,
        category: input.category,
        severity: input.severity,
        incidentDate: new Date(input.incidentDate),
        location: input.location,
        reportedBy: input.reportedBy ?? userId,
        affectedParties: input.affectedParties,
        witnesses: input.witnesses,
        relatedRiskId: input.relatedRiskId,
        attachments: input.attachments,
        notes: input.notes,
        createdBy: userId,
      });

      return { id: newIncident.insertId, success: true };
    }),

  /**
   * Update existing incident
   */
  update: scopedProcedure
    .input(z.object({
      id: z.number(),
      incidentCode: z.string().optional(),
      title: z.string().optional(),
      titleAr: z.string().optional(),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
      category: z.enum(["safety", "security", "data_breach", "operational", "hr", "financial", "environmental", "legal", "reputational", "other"]).optional(),
      severity: z.enum(["minor", "moderate", "major", "critical"]).optional(),
      incidentDate: z.string().optional(),
      location: z.string().optional(),
      reportedBy: z.number().optional(),
      affectedParties: z.string().optional(),
      witnesses: z.string().optional(),
      investigationStatus: z.enum(["pending", "in_progress", "completed", "closed"]).optional(),
      investigationNotes: z.string().optional(),
      investigatedBy: z.number().optional(),
      investigationCompletedAt: z.string().optional(),
      rootCause: z.string().optional(),
      rootCauseAr: z.string().optional(),
      correctiveActions: z.string().optional(),
      preventiveActions: z.string().optional(),
      relatedRiskId: z.number().optional(),
      status: z.enum(["open", "under_investigation", "resolved", "closed"]).optional(),
      resolutionDate: z.string().optional(),
      resolutionNotes: z.string().optional(),
      attachments: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      // Verify incident exists
      const [existingIncident] = await db
        .select()
        .from(incidents)
        .where(
          and(
            eq(incidents.id, input.id),
            eq(incidents.organizationId, organizationId),
            operatingUnitId ? eq(incidents.operatingUnitId, operatingUnitId) : sql`1=1`,
            isNull(incidents.deletedAt)
          )
        )
        .limit(1);

      if (!existingIncident) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Incident not found or access denied",
        });
      }

      // Prepare update values
      const updateValues: any = {};
      if (input.incidentCode !== undefined) updateValues.incidentCode = input.incidentCode;
      if (input.title !== undefined) updateValues.title = input.title;
      if (input.titleAr !== undefined) updateValues.titleAr = input.titleAr;
      if (input.description !== undefined) updateValues.description = input.description;
      if (input.descriptionAr !== undefined) updateValues.descriptionAr = input.descriptionAr;
      if (input.category !== undefined) updateValues.category = input.category;
      if (input.severity !== undefined) updateValues.severity = input.severity;
      if (input.incidentDate !== undefined) updateValues.incidentDate = new Date(input.incidentDate);
      if (input.location !== undefined) updateValues.location = input.location;
      if (input.reportedBy !== undefined) updateValues.reportedBy = input.reportedBy;
      if (input.affectedParties !== undefined) updateValues.affectedParties = input.affectedParties;
      if (input.witnesses !== undefined) updateValues.witnesses = input.witnesses;
      if (input.investigationStatus !== undefined) updateValues.investigationStatus = input.investigationStatus;
      if (input.investigationNotes !== undefined) updateValues.investigationNotes = input.investigationNotes;
      if (input.investigatedBy !== undefined) updateValues.investigatedBy = input.investigatedBy;
      if (input.investigationCompletedAt !== undefined) {
        updateValues.investigationCompletedAt = input.investigationCompletedAt ? new Date(input.investigationCompletedAt) : null;
      }
      if (input.rootCause !== undefined) updateValues.rootCause = input.rootCause;
      if (input.rootCauseAr !== undefined) updateValues.rootCauseAr = input.rootCauseAr;
      if (input.correctiveActions !== undefined) updateValues.correctiveActions = input.correctiveActions;
      if (input.preventiveActions !== undefined) updateValues.preventiveActions = input.preventiveActions;
      if (input.relatedRiskId !== undefined) updateValues.relatedRiskId = input.relatedRiskId;
      if (input.status !== undefined) updateValues.status = input.status;
      if (input.resolutionDate !== undefined) {
        updateValues.resolutionDate = input.resolutionDate ? new Date(input.resolutionDate) : null;
      }
      if (input.resolutionNotes !== undefined) updateValues.resolutionNotes = input.resolutionNotes;
      if (input.attachments !== undefined) updateValues.attachments = input.attachments;
      if (input.notes !== undefined) updateValues.notes = input.notes;

      await db
        .update(incidents)
        .set(updateValues)
        .where(eq(incidents.id, input.id));

      return { success: true };
    }),

  /**
   * Soft delete incident
   */
  delete: scopedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;
      const userId = ctx.user.id;

      // Verify incident exists
      const [existingIncident] = await db
        .select()
        .from(incidents)
        .where(
          and(
            eq(incidents.id, input.id),
            eq(incidents.organizationId, organizationId),
            operatingUnitId ? eq(incidents.operatingUnitId, operatingUnitId) : sql`1=1`,
            isNull(incidents.deletedAt)
          )
        )
        .limit(1);

      if (!existingIncident) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Incident not found or access denied",
        });
      }

      await db
        .update(incidents)
        .set({
          deletedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
          deletedBy: userId,
        })
        .where(eq(incidents.id, input.id));

      return { success: true };
    }),
});

// ============================================================================
// DASHBOARD ANALYTICS ROUTER
// ============================================================================

export const riskComplianceDashboardRouter = router({
  /**
   * Get comprehensive dashboard data
   * Returns: Total Risks, High/Critical count, Mitigated count, Level Distribution,
   * 12-month Trends, Risks by Category
   */
  getDashboardData: scopedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      const baseConditions = operatingUnitId
        ? and(eq(risks.organizationId, organizationId), eq(risks.operatingUnitId, operatingUnitId), isNull(risks.deletedAt))
        : and(eq(risks.organizationId, organizationId), isNull(risks.deletedAt));

      // Get all risks in scope
      const allRisks = await db
        .select()
        .from(risks)
        .where(baseConditions);

      // Total risks
      const totalRisks = allRisks.length;

      // High/Critical risks count
      const highCriticalRisks = allRisks.filter(r => r.level === "high" || r.level === "critical").length;

      // Mitigated risks count
      const mitigatedRisks = allRisks.filter(r => r.status === "mitigated" || r.status === "closed").length;

      // Level distribution
      const levelDistribution = {
        low: allRisks.filter(r => r.level === "low").length,
        medium: allRisks.filter(r => r.level === "medium").length,
        high: allRisks.filter(r => r.level === "high").length,
        critical: allRisks.filter(r => r.level === "critical").length,
      };

      // 12-month trends (risks created per month)
      const now = new Date();
      const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      
      const monthlyTrends = [];
      for (let i = 0; i < 12; i++) {
        const monthStart = new Date(twelveMonthsAgo.getFullYear(), twelveMonthsAgo.getMonth() + i, 1);
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59);
        
        const risksInMonth = allRisks.filter(r => {
          const createdDate = new Date(r.createdAt);
          return createdDate >= monthStart && createdDate <= monthEnd;
        });

        monthlyTrends.push({
          month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          count: risksInMonth.length,
          high: risksInMonth.filter(r => r.level === "high").length,
          critical: risksInMonth.filter(r => r.level === "critical").length,
        });
      }

      // Risks by category
      const categoryBreakdown = [
        { category: "operational", count: allRisks.filter(r => r.category === "operational").length },
        { category: "financial", count: allRisks.filter(r => r.category === "financial").length },
        { category: "strategic", count: allRisks.filter(r => r.category === "strategic").length },
        { category: "compliance", count: allRisks.filter(r => r.category === "compliance").length },
        { category: "reputational", count: allRisks.filter(r => r.category === "reputational").length },
        { category: "technological", count: allRisks.filter(r => r.category === "technological").length },
        { category: "environmental", count: allRisks.filter(r => r.category === "environmental").length },
        { category: "security", count: allRisks.filter(r => r.category === "security").length },
        { category: "legal", count: allRisks.filter(r => r.category === "legal").length },
        { category: "other", count: allRisks.filter(r => r.category === "other").length },
      ].filter(c => c.count > 0); // Only return categories with risks

      return {
        totalRisks,
        highCriticalRisks,
        mitigatedRisks,
        levelDistribution,
        monthlyTrends,
        categoryBreakdown,
      };
    }),

  /**
   * Evaluate project for risk triggers and auto-generate risks
   * Calls Risk Intelligence Engine to detect financial, operational, and MEAL risks
   */
  evaluateProject: scopedProcedure
    .input(
      z.object({
        projectId: z.number(),
        organizationId: z.number(),
        operatingUnitId: z.number().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { evaluateProjectRisks } = await import('../_core/riskIntelligenceEngine');
      
      try {
        const result = await evaluateProjectRisks(
          input.projectId,
          input.organizationId,
          input.operatingUnitId,
          ctx.user.id
        );
        
        return {
          success: true,
          risksCreated: result.risksCreated,
          risksUpdated: result.risksUpdated,
          message: `Evaluation complete: ${result.risksCreated} risks created, ${result.risksUpdated} risks updated`,
        };
      } catch (error) {
        console.error('[Risk Intelligence] Evaluation failed:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to evaluate project risks',
        });
      }
    }),

  /**
   * Evaluate all active projects for risk triggers
   * Runs risk detection across all active projects in the organization
   */
  evaluateAllProjects: scopedProcedure
    .mutation(async ({ input, ctx }) => {
      const { evaluateProjectRisks } = await import('../_core/riskIntelligenceEngine');
      
      try {
        // Fetch all active projects in the organization/OU
        const activeProjects = await ctx.db
          .select()
          .from(projects)
          .where(
            and(
              eq(projects.organizationId, input.organizationId),
              input.operatingUnitId
                ? eq(projects.operatingUnitId, input.operatingUnitId)
                : sql`1=1`,
              eq(projects.status, 'active')
            )
          );

        let totalRisksGenerated = 0;
        let totalRisksUpdated = 0;
        let projectsEvaluated = 0;

        // Evaluate each project
        for (const project of activeProjects) {
          try {
            const result = await evaluateProjectRisks(
              project.id,
              input.organizationId,
              input.operatingUnitId,
              ctx.user.id
            );
            totalRisksGenerated += result.risksCreated;
            totalRisksUpdated += result.risksUpdated;
            projectsEvaluated++;
          } catch (error) {
            console.error(`[Risk Intelligence] Failed to evaluate project ${project.id}:`, error);
            // Continue with next project even if one fails
          }
        }

        return {
          success: true,
          projectsEvaluated,
          totalRisksGenerated,
          totalRisksUpdated,
          message: `Evaluated ${projectsEvaluated} projects: ${totalRisksGenerated} risks generated, ${totalRisksUpdated} risks updated`,
        };
      } catch (error) {
        console.error('[Risk Intelligence] Bulk evaluation failed:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to evaluate all projects',
        });
      }
    }),
});

// ============================================================================
// MAIN RISK & COMPLIANCE ROUTER
// ============================================================================

export const riskComplianceRouter = router({
  risks: risksRouter,
  incidents: incidentsRouter,
  dashboard: riskComplianceDashboardRouter,
});
