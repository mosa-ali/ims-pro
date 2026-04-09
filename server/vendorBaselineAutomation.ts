/**
 * Vendor Procurement Baseline Automation
 * Auto-creates a baseline qualification record when a bidder is selected/awarded in CBA.
 * Per IMS guidelines: "First-time participation in Bid Evaluation → auto-create Initial Procurement Baseline record"
 */
import { getDb } from './db';
import {
  vendorProcurementBaselines,
  bidEvaluationScores,
  bidEvaluationCriteria,
} from '../drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';

interface BaselineCreationParams {
  vendorId: number;
  organizationId: number;
  operatingUnitId?: number | null;
  bidAnalysisId: number;
  purchaseRequestId?: number | null;
  prNumber?: string | null;
  cbaNumber?: string | null;
  bidderId: number;
  totalBidAmount?: number | string | null;
  currency?: string | null;
  createdBy?: number;
}

export async function createProcurementBaseline(params: BaselineCreationParams) {
  const db = await getDb();

  try {
    // Check if baseline already exists for this vendor + bid analysis
    const [existing] = await db
      .select({ id: vendorProcurementBaselines.id })
      .from(vendorProcurementBaselines)
      .where(and(
        eq(vendorProcurementBaselines.vendorId, params.vendorId),
        eq(vendorProcurementBaselines.bidAnalysisId, params.bidAnalysisId),
        eq(vendorProcurementBaselines.isDeleted, 0),
      ))
      .limit(1);

    if (existing) {
      console.log(`[Baseline] Already exists for vendor ${params.vendorId} on bid analysis ${params.bidAnalysisId}`);
      return { created: false, id: existing.id };
    }

    // Check if this is the vendor's first participation
    const [participationCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(vendorProcurementBaselines)
      .where(and(
        eq(vendorProcurementBaselines.vendorId, params.vendorId),
        eq(vendorProcurementBaselines.organizationId, params.organizationId),
        eq(vendorProcurementBaselines.isDeleted, 0),
      ));

    const isFirst = (participationCount?.count || 0) === 0;

    // Try to pull bid evaluation scores by category
    let legalAdminScore: number | null = null;
    let experienceTechnicalScore: number | null = null;
    let operationalFinancialScore: number | null = null;
    let referencesScore: number | null = null;

    try {
      const scores = await db
        .select({
          criterionName: bidEvaluationCriteria.criterionName,
          score: bidEvaluationScores.score,
          maxScore: bidEvaluationCriteria.maxScore,
        })
        .from(bidEvaluationScores)
        .leftJoin(bidEvaluationCriteria, eq(bidEvaluationCriteria.id, bidEvaluationScores.criterionId))
        .where(eq(bidEvaluationScores.bidderId, params.bidderId));

      for (const s of scores) {
        const name = (s.criterionName || '').toLowerCase();
        const scoreVal = Number(s.score) || 0;
        if (name.includes('legal') || name.includes('admin') || name.includes('registration')) {
          legalAdminScore = (legalAdminScore || 0) + scoreVal;
        } else if (name.includes('experience') || name.includes('technical')) {
          experienceTechnicalScore = (experienceTechnicalScore || 0) + scoreVal;
        } else if (name.includes('operational') || name.includes('financial') || name.includes('capacity')) {
          operationalFinancialScore = (operationalFinancialScore || 0) + scoreVal;
        } else if (name.includes('reference')) {
          referencesScore = (referencesScore || 0) + scoreVal;
        }
      }
    } catch (err) {
      console.log('[Baseline] Could not pull bid evaluation scores:', err);
    }

    const [result] = await db.insert(vendorProcurementBaselines).values({
      vendorId: params.vendorId,
      organizationId: params.organizationId,
      operatingUnitId: params.operatingUnitId || null,
      bidAnalysisId: params.bidAnalysisId,
      purchaseRequestId: params.purchaseRequestId || null,
      prNumber: params.prNumber || null,
      cbaNumber: params.cbaNumber || null,
      legalAdminScore: legalAdminScore?.toFixed(2) || null,
      experienceTechnicalScore: experienceTechnicalScore?.toFixed(2) || null,
      operationalFinancialScore: operationalFinancialScore?.toFixed(2) || null,
      referencesScore: referencesScore?.toFixed(2) || null,
      totalBidAmount: params.totalBidAmount != null ? String(params.totalBidAmount) : null,
      currency: params.currency || null,
      qualificationOutcome: 'qualified',
      isFirstParticipation: isFirst ? 1 : 0,
      participationDate: new Date().toISOString(),
      createdBy: params.createdBy || null,
      updatedBy: params.createdBy || null,
    }).$returningId();

    console.log(`[Baseline] Created procurement baseline ${result.id} for vendor ${params.vendorId} (first: ${isFirst})`);
    return { created: true, id: result.id, isFirstParticipation: isFirst };
  } catch (err) {
    console.error('[Baseline] Error creating procurement baseline:', err);
    return { created: false, error: String(err) };
  }
}
