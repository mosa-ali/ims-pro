import { z } from 'zod';
import { scopedProcedure, router } from '../../_core/trpc';
import { getDb } from '../../db';
import {
  vendorEvaluations,
  vendorEvaluationItems,
  vendorProcurementBaselines,
  vendors,
  users,
} from '../../../drizzle/schema';
import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

/**
 * IMS Standard Checklist Definition
 * Sections 1-5 with weighted scoring per the CRUD guidelines
 */
const IMS_CHECKLIST = [
  // Section 1 — Legal & Administrative (max 9, weight 20%)
  { section: 1, key: 'commercial_registration', label: 'Valid company registration (Commercial Register)', maxScore: 2 },
  { section: 1, key: 'tax_card', label: 'Tax Card', maxScore: 2 },
  { section: 1, key: 'insurance_card', label: 'Insurance Card', maxScore: 1 },
  { section: 1, key: 'signed_declarations', label: 'Signed policy and declarations (Anti-corruption, Child protection, Environmental & social, Conflict of interest)', maxScore: 2 },
  { section: 1, key: 'sanctions_screening', label: 'Screening against terrorism/sanctions lists', maxScore: 2 },
  // Section 2 — Experience & Technical Capacity (max 10, weight 15%)
  { section: 2, key: 'company_profile', label: 'Bidder/Company profile document, recent annual report', maxScore: 3 },
  { section: 2, key: 'years_experience', label: 'Years of Experience (registration date, copies of past contracts)', maxScore: 4 },
  { section: 2, key: 'ingo_experience', label: 'Experience with INGOs in delivery of similar materials/contract', maxScore: 3 },
  // Section 3 — Operational & Financial Capacity (max 20, weight 25%)
  { section: 3, key: 'target_geography', label: 'Presence in the target geography', maxScore: 1 },
  { section: 3, key: 'work_safety_plan', label: 'Work & Safety Plan (detailed operational plans including safety and environmental plan)', maxScore: 5 },
  { section: 3, key: 'delivery_time', label: 'Delivery Time (in Days)', maxScore: 2 },
  { section: 3, key: 'validity_offer', label: 'Validity of Offer (Days)', maxScore: 2 },
  { section: 3, key: 'replacement_period', label: 'Replacement Period for Rejected Items', maxScore: 2 },
  { section: 3, key: 'payment_terms', label: 'Payment Terms', maxScore: 3 },
  { section: 3, key: 'bank_guarantee', label: 'Bank Guarantee (Original guarantee letter from bank)', maxScore: 1 },
  { section: 3, key: 'bank_account_details', label: 'Bank account details (Bank confirmation letter, audited accounts)', maxScore: 1 },
  // Note: payment_terms max 3 is for best case (0% upfront), mutually exclusive options handled in UI
  // Section 4 — Samples (max 5, weight 15%) — conditional
  { section: 4, key: 'samples', label: 'Samples (if relevant) — Verification process, mandatory before award', maxScore: 5 },
  // Section 5 — References (max 6, weight 15%)
  { section: 5, key: 'references', label: 'References from previous contracts or projects (UN/INGOs or local NGOs)', maxScore: 6 },
];

const SECTION_WEIGHTS: Record<number, number> = {
  1: 0.20,
  2: 0.15,
  3: 0.25,
  4: 0.15,
  5: 0.15,
  6: 0.10,
};

const SECTION_MAX: Record<number, number> = {
  1: 9,
  2: 10,
  3: 20,
  4: 5,
  5: 6,
};

function classifyScore(score: number): 'preferred' | 'approved' | 'conditional' | 'rejected' {
  if (score >= 85) return 'preferred';
  if (score >= 70) return 'approved';
  if (score >= 50) return 'conditional';
  return 'rejected';
}

function riskFromClassification(c: string): 'low' | 'medium' | 'high' | 'critical' {
  if (c === 'preferred') return 'low';
  if (c === 'approved') return 'medium';
  if (c === 'conditional') return 'high';
  return 'critical';
}

export const vendorEvaluationRouter = router({
  /** Get the IMS standard checklist definition */
  getChecklist: scopedProcedure
    .query(() => {
      return { checklist: IMS_CHECKLIST, weights: SECTION_WEIGHTS, sectionMax: SECTION_MAX };
    }),

  /** List evaluations for a vendor */
  listByVendor: scopedProcedure
    .input(z.object({ vendorId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const orgId = ctx.scope.organizationId;

      const evals = await db
        .select({
          id: vendorEvaluations.id,
          vendorId: vendorEvaluations.vendorId,
          evaluationDate: vendorEvaluations.evaluationDate,
          totalScore: vendorEvaluations.totalScore,
          classification: vendorEvaluations.classification,
          riskLevel: vendorEvaluations.riskLevel,
          status: vendorEvaluations.status,
          version: vendorEvaluations.version,
          section1Score: vendorEvaluations.section1Score,
          section2Score: vendorEvaluations.section2Score,
          section3Score: vendorEvaluations.section3Score,
          section4Score: vendorEvaluations.section4Score,
          section5Score: vendorEvaluations.section5Score,
          evaluatorName: users.name,
          createdAt: vendorEvaluations.createdAt,
        })
        .from(vendorEvaluations)
        .leftJoin(users, eq(users.id, vendorEvaluations.evaluatorId))
        .where(and(
          eq(vendorEvaluations.vendorId, input.vendorId),
          eq(vendorEvaluations.organizationId, orgId),
          eq(vendorEvaluations.isDeleted, 0),
        ))
        .orderBy(desc(vendorEvaluations.evaluationDate));

      return evals;
    }),

  /** List all evaluations for the organization (for hub pages) */
  listAll: scopedProcedure
    .input(z.object({
      status: z.enum(['draft', 'pending_compliance', 'pending_finance', 'pending_final', 'approved', 'rejected']).optional(),
      classification: z.enum(['preferred', 'approved', 'conditional', 'rejected']).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const orgId = ctx.scope.organizationId;

      const conditions = [
        eq(vendorEvaluations.organizationId, orgId),
        eq(vendorEvaluations.isDeleted, 0),
      ];
      if (input?.status) conditions.push(eq(vendorEvaluations.status, input.status));
      if (input?.classification) conditions.push(eq(vendorEvaluations.classification, input.classification));

      const evals = await db
        .select({
          id: vendorEvaluations.id,
          vendorId: vendorEvaluations.vendorId,
          vendorName: vendors.name,
          vendorCode: vendors.vendorCode,
          evaluationDate: vendorEvaluations.evaluationDate,
          totalScore: vendorEvaluations.totalScore,
          classification: vendorEvaluations.classification,
          riskLevel: vendorEvaluations.riskLevel,
          status: vendorEvaluations.status,
          version: vendorEvaluations.version,
          evaluatorName: users.name,
          createdAt: vendorEvaluations.createdAt,
        })
        .from(vendorEvaluations)
        .leftJoin(vendors, eq(vendors.id, vendorEvaluations.vendorId))
        .leftJoin(users, eq(users.id, vendorEvaluations.evaluatorId))
        .where(and(...conditions))
        .orderBy(desc(vendorEvaluations.evaluationDate));

      return evals;
    }),

  /** Get evaluation detail with items */
  getById: scopedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const orgId = ctx.scope.organizationId;

      const [evaluation] = await db
        .select()
        .from(vendorEvaluations)
        .where(and(
          eq(vendorEvaluations.id, input.id),
          eq(vendorEvaluations.organizationId, orgId),
          eq(vendorEvaluations.isDeleted, 0),
        ))
        .limit(1);

      if (!evaluation) throw new TRPCError({ code: 'NOT_FOUND', message: 'Evaluation not found' });

      const items = await db
        .select()
        .from(vendorEvaluationItems)
        .where(eq(vendorEvaluationItems.evaluationId, input.id))
        .orderBy(vendorEvaluationItems.sectionNumber, vendorEvaluationItems.id);

      return { evaluation, items };
    }),

  /** Create a new evaluation with checklist items */
  create: scopedProcedure
    .input(z.object({
      vendorId: z.number().int().positive(),
      evaluationDate: z.string(),
      notes: z.string().optional(),
      items: z.array(z.object({
        sectionNumber: z.number(),
        checklistItemKey: z.string(),
        checklistItemLabel: z.string(),
        maxScore: z.number(),
        rating: z.number().min(0).max(5).optional(),
        score: z.number().optional(),
        notes: z.string().optional(),
        documentUrls: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const orgId = ctx.scope.organizationId;
      const ouId = ctx.scope.operatingUnitId;

      // Calculate section scores and total
      const sectionScores: Record<number, number> = {};
      for (const item of input.items) {
        if (!sectionScores[item.sectionNumber]) sectionScores[item.sectionNumber] = 0;
        sectionScores[item.sectionNumber] += (item.score ?? 0);
      }

      // Calculate weighted total (normalize each section to percentage then apply weight)
      let totalScore = 0;
      for (const [section, rawScore] of Object.entries(sectionScores)) {
        const sNum = Number(section);
        const maxForSection = SECTION_MAX[sNum] || 1;
        const weight = SECTION_WEIGHTS[sNum] || 0;
        const normalizedPct = (rawScore / maxForSection) * 100;
        totalScore += normalizedPct * weight;
      }

      const classification = classifyScore(totalScore);
      const riskLevel = riskFromClassification(classification);

      const [result] = await db.insert(vendorEvaluations).values({
        vendorId: input.vendorId,
        organizationId: orgId,
        operatingUnitId: ouId || null,
        evaluatorId: ctx.user.id,
        evaluationDate: input.evaluationDate,
        totalScore: totalScore.toFixed(2),
        classification,
        riskLevel,
        section1Score: (sectionScores[1] || 0).toFixed(2),
        section2Score: (sectionScores[2] || 0).toFixed(2),
        section3Score: (sectionScores[3] || 0).toFixed(2),
        section4Score: (sectionScores[4] || 0).toFixed(2),
        section5Score: (sectionScores[5] || 0).toFixed(2),
        section6Score: (sectionScores[6] || 0).toFixed(2),
        notes: input.notes,
        status: 'draft',
        version: 1,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      }).$returningId();

      // Insert checklist items
      if (input.items.length > 0) {
        await db.insert(vendorEvaluationItems).values(
          input.items.map(item => ({
            evaluationId: result.id,
            sectionNumber: item.sectionNumber,
            checklistItemKey: item.checklistItemKey,
            checklistItemLabel: item.checklistItemLabel,
            maxScore: item.maxScore.toFixed(2),
            rating: item.rating ?? null,
            score: item.score != null ? item.score.toFixed(2) : null,
            notes: item.notes,
            documentUrls: item.documentUrls,
          }))
        );
      }

      return { id: result.id, totalScore, classification, riskLevel };
    }),

  /** Submit evaluation for approval workflow */
  submitForApproval: scopedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const orgId = ctx.scope.organizationId;

      const [evaluation] = await db.select()
        .from(vendorEvaluations)
        .where(and(
          eq(vendorEvaluations.id, input.id),
          eq(vendorEvaluations.organizationId, orgId),
          eq(vendorEvaluations.isDeleted, 0),
        ))
        .limit(1);

      if (!evaluation) throw new TRPCError({ code: 'NOT_FOUND' });
      if (evaluation.status !== 'draft') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only draft evaluations can be submitted' });
      }

      await db.update(vendorEvaluations)
        .set({ status: 'pending_compliance', updatedBy: ctx.user.id })
        .where(eq(vendorEvaluations.id, input.id));

      return { success: true };
    }),

  /** Advance approval workflow */
  advanceApproval: scopedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      action: z.enum(['approve', 'reject']),
      justification: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const orgId = ctx.scope.organizationId;

      const [evaluation] = await db.select()
        .from(vendorEvaluations)
        .where(and(
          eq(vendorEvaluations.id, input.id),
          eq(vendorEvaluations.organizationId, orgId),
          eq(vendorEvaluations.isDeleted, 0),
        ))
        .limit(1);

      if (!evaluation) throw new TRPCError({ code: 'NOT_FOUND' });

      if (input.action === 'reject') {
        await db.update(vendorEvaluations)
          .set({
            status: 'rejected',
            justification: input.justification,
            updatedBy: ctx.user.id,
          })
          .where(eq(vendorEvaluations.id, input.id));
        return { success: true, newStatus: 'rejected' };
      }

      // Advance: pending_compliance → pending_finance → pending_final → approved
      const flowMap: Record<string, string> = {
        'pending_compliance': 'pending_finance',
        'pending_finance': 'pending_final',
        'pending_final': 'approved',
      };

      const nextStatus = flowMap[evaluation.status];
      if (!nextStatus) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Cannot advance from status: ${evaluation.status}` });
      }

      const updateData: any = { status: nextStatus, updatedBy: ctx.user.id };
      if (nextStatus === 'approved') {
        updateData.approvedBy = ctx.user.id;
        updateData.approvedAt = new Date().toISOString();
      }

      await db.update(vendorEvaluations)
        .set(updateData)
        .where(eq(vendorEvaluations.id, input.id));

      return { success: true, newStatus: nextStatus };
    }),

  /** Get statistics for the hub */
  getStats: scopedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      const orgId = ctx.scope.organizationId;

      const [stats] = await db.select({
        total: sql<number>`COUNT(*)`,
        preferred: sql<number>`SUM(CASE WHEN ${vendorEvaluations.classification} = 'preferred' THEN 1 ELSE 0 END)`,
        approved: sql<number>`SUM(CASE WHEN ${vendorEvaluations.classification} = 'approved' THEN 1 ELSE 0 END)`,
        conditional: sql<number>`SUM(CASE WHEN ${vendorEvaluations.classification} = 'conditional' THEN 1 ELSE 0 END)`,
        rejected: sql<number>`SUM(CASE WHEN ${vendorEvaluations.classification} = 'rejected' THEN 1 ELSE 0 END)`,
        pendingApproval: sql<number>`SUM(CASE WHEN ${vendorEvaluations.status} IN ('pending_compliance','pending_finance','pending_final') THEN 1 ELSE 0 END)`,
        draft: sql<number>`SUM(CASE WHEN ${vendorEvaluations.status} = 'draft' THEN 1 ELSE 0 END)`,
      })
      .from(vendorEvaluations)
      .where(and(
        eq(vendorEvaluations.organizationId, orgId),
        eq(vendorEvaluations.isDeleted, 0),
      ));

      return stats || { total: 0, preferred: 0, approved: 0, conditional: 0, rejected: 0, pendingApproval: 0, draft: 0 };
    }),

  /** List procurement baselines for a vendor */
  listBaselines: scopedProcedure
    .input(z.object({ vendorId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const orgId = ctx.scope.organizationId;

      const baselines = await db
        .select()
        .from(vendorProcurementBaselines)
        .where(and(
          eq(vendorProcurementBaselines.vendorId, input.vendorId),
          eq(vendorProcurementBaselines.organizationId, orgId),
          eq(vendorProcurementBaselines.isDeleted, 0),
        ))
        .orderBy(desc(vendorProcurementBaselines.participationDate));

      return baselines;
    }),

  /** List all baselines for the organization */
  listAllBaselines: scopedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      const orgId = ctx.scope.organizationId;

      const baselines = await db
        .select({
          id: vendorProcurementBaselines.id,
          vendorId: vendorProcurementBaselines.vendorId,
          vendorName: vendors.name,
          vendorCode: vendors.vendorCode,
          prNumber: vendorProcurementBaselines.prNumber,
          cbaNumber: vendorProcurementBaselines.cbaNumber,
          legalAdminScore: vendorProcurementBaselines.legalAdminScore,
          experienceTechnicalScore: vendorProcurementBaselines.experienceTechnicalScore,
          operationalFinancialScore: vendorProcurementBaselines.operationalFinancialScore,
          referencesScore: vendorProcurementBaselines.referencesScore,
          totalBidAmount: vendorProcurementBaselines.totalBidAmount,
          currency: vendorProcurementBaselines.currency,
          qualificationOutcome: vendorProcurementBaselines.qualificationOutcome,
          isFirstParticipation: vendorProcurementBaselines.isFirstParticipation,
          participationDate: vendorProcurementBaselines.participationDate,
        })
        .from(vendorProcurementBaselines)
        .leftJoin(vendors, eq(vendors.id, vendorProcurementBaselines.vendorId))
        .where(and(
          eq(vendorProcurementBaselines.organizationId, orgId),
          eq(vendorProcurementBaselines.isDeleted, 0),
        ))
        .orderBy(desc(vendorProcurementBaselines.participationDate));

      return baselines;
    }),

  /** Soft delete evaluation */
  delete: scopedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const orgId = ctx.scope.organizationId;

      await db.update(vendorEvaluations)
        .set({
          isDeleted: 1,
          deletedAt: new Date().toISOString(),
          deletedBy: ctx.user.id,
        })
        .where(and(
          eq(vendorEvaluations.id, input.id),
          eq(vendorEvaluations.organizationId, orgId),
        ));

      return { success: true };
    }),
});
