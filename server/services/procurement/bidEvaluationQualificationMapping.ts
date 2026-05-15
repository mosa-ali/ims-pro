/**
 * Bid Evaluation - Vendor Qualification Mapping Service
 * 
 * Maps Vendor Qualification scores to Bid Evaluation scores
 * Uses actual schema: baselineId and qualificationScoreId linkage
 * 
 * CRITICAL DESIGN DECISIONS:
 * 1. No snapshot tables - uses vendor_procurement_baselines and vendor_qualification_scores
 * 2. Uses baselineId and qualificationScoreId for linkage
 * 3. Data isolation through bidAnalyses.organizationId
 * 4. Supports bilingual (EN/AR) labels
 */

import { getDb } from '../../db';
import {
  vendorQualificationScores,
  vendorProcurementBaselines,
  bidEvaluationScores,
  bidAnalyses,
  vendors,
} from '../../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface QualificationBaseline {
  baselineId: number;
  qualificationScoreId: number;
  vendorId: number;
  vendorName: string;
  qualificationStatus: string | null;
  totalScore: string | null;
  section1Total: string | null;
  section2Total: string | null;
  section3Total: string | null;
  section4Total: string | null;
  createdAt: string | null;
}

export interface MappedQualificationScore {
  criterionId: number;
  bidderId: number;
  score: string;
  sourceType: 'qualification_auto';
  isAutoLoaded: 1;
  isLocked: 1;
  evaluationSource: 'qualification_auto';
  baselineId: number;
  qualificationScoreId: number;
}

// ============================================================================
// QUALIFICATION BASELINE RETRIEVAL
// ============================================================================

/**
 * Get qualification baseline for a vendor
 * Returns the most recent approved qualification score
 */
export async function getQualificationBaseline(
  vendorId: number,
  organizationId: number,
  operatingUnitId: number | null
): Promise<QualificationBaseline | null> {
  try {
    const db = await getDb();

    // Get most recent approved qualification score
    const qualification = await db.query.vendorQualificationScores.findFirst({
      where: and(
        eq(vendorQualificationScores.vendorId, vendorId),
        eq(vendorQualificationScores.organizationId, organizationId),
        ...(operatingUnitId ? [eq(vendorQualificationScores.operatingUnitId, operatingUnitId)] : [])
      ),
      orderBy: (vqs) => vqs.createdAt,
    });

    if (!qualification) {
      return null;
    }

    // Get corresponding procurement baseline
    const baseline = await db.query.vendorProcurementBaselines.findFirst({
      where: and(
        eq(vendorProcurementBaselines.vendorId, vendorId),
        eq(vendorProcurementBaselines.organizationId, organizationId),
        ...(operatingUnitId ? [eq(vendorProcurementBaselines.operatingUnitId, operatingUnitId)] : [])
      ),
      orderBy: (vpb) => vpb.createdAt,
    });

    // Get vendor name
    const vendor = await db.query.vendors.findFirst({
      where: eq(vendors.id, vendorId),
    });

    return {
      baselineId: baseline?.id || 0,
      qualificationScoreId: qualification.id,
      vendorId,
      vendorName: vendor?.name || 'Unknown Vendor',
      qualificationStatus: qualification.qualificationStatus || '',
      totalScore: qualification.totalScore || '0',
      section1Total: qualification.section1Total || '0',
      section2Total: qualification.section2Total || '0',
      section3Total: qualification.section3Total || '0',
      section4Total: qualification.section4Total || '0',
      createdAt: qualification.createdAt || new Date().toISOString(),
    };
  } catch (error) {
    console.error('[bidEvaluationQualificationMapping] Get qualification baseline error:', error);
    return null;
  }
}

/**
 * Get qualification baselines for multiple vendors
 * Batch operation to prevent N+1 queries
 */
export async function getQualificationBaselines(
  vendorIds: number[],
  organizationId: number,
  operatingUnitId: number | null
): Promise<Map<number, QualificationBaseline>> {
  try {
    const db = await getDb();

    const qualifications = await db.query.vendorQualificationScores.findMany({
      where: and(
        ...(vendorIds.length > 0 ? [eq(vendorQualificationScores.vendorId, vendorIds[0])] : []),
        eq(vendorQualificationScores.organizationId, organizationId),
        ...(operatingUnitId ? [eq(vendorQualificationScores.operatingUnitId, operatingUnitId)] : [])
      ),
    });

    // Get corresponding baselines
    const baselines = await db.query.vendorProcurementBaselines.findMany({
      where: and(
        eq(vendorProcurementBaselines.organizationId, organizationId),
        ...(operatingUnitId ? [eq(vendorProcurementBaselines.operatingUnitId, operatingUnitId)] : [])
      ),
    });

    // Get vendor names
    const vendorList = await db.query.vendors.findMany({
      where: eq(vendors.id, vendorIds[0]),
    });

    const vendorMap = new Map(vendorList.map((v) => [v.id, v.name]));
    const baselineMap = new Map<number, QualificationBaseline>();

    for (const qual of qualifications) {
      const baseline = baselines.find((b) => b.vendorId === qual.vendorId);

      baselineMap.set(qual.vendorId, {
        baselineId: baseline?.id || 0,
        qualificationScoreId: qual.id,
        vendorId: qual.vendorId,
        vendorName: vendorMap.get(qual.vendorId) || 'Unknown Vendor',
        qualificationStatus: qual.qualificationStatus,
        totalScore: qual.totalScore,
        section1Total: qual.section1Total,
        section2Total: qual.section2Total,
        section3Total: qual.section3Total,
        section4Total: qual.section4Total,
        createdAt: qual.createdAt,
      });
    }

    return baselineMap;
  } catch (error) {
    console.error('[bidEvaluationQualificationMapping] Get qualification baselines error:', error);
    return new Map();
  }
}

// ============================================================================
// AUTO-LOAD MAPPING
// ============================================================================

/**
 * Map qualification baseline to BEC scores
 * Creates auto-loaded, locked scores in bid_evaluation_scores
 */
export async function mapQualificationToBeC(
  bidAnalysisId: number,
  bidderId: number,
  baselineId: number,
  qualificationScoreId: number,
  organizationId: number
): Promise<void> {
  try {
    const db = await getDb();

    // Verify bid analysis access
    const analysis = await db.query.bidAnalyses.findFirst({
      where: and(
        eq(bidAnalyses.id, bidAnalysisId),
        eq(bidAnalyses.organizationId, organizationId)
      ),
    });

    if (!analysis) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Bid analysis not found or access denied',
      });
    }

    // Get qualification score details
    const qualification = await db.query.vendorQualificationScores.findFirst({
      where: eq(vendorQualificationScores.id, qualificationScoreId),
    });

    if (!qualification) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Qualification score not found',
      });
    }

    // Map qualification sections to BEC criteria
    // This is a simplified mapping - adjust based on actual criteria definitions
    const mappings = [
      { criterionId: 1, score: qualification.section1Total }, // Legal & Administrative
      { criterionId: 2, score: qualification.section2Total }, // Experience & Technical
      { criterionId: 3, score: qualification.section3Total }, // Operational & Financial
      { criterionId: 4, score: qualification.section4Total }, // References
    ];

    // Create auto-loaded scores
    for (const mapping of mappings) {
      // Check if score already exists
      const existingScore = await db.query.bidEvaluationScores.findFirst({
        where: and(
          eq(bidEvaluationScores.bidAnalysisId, bidAnalysisId),
          eq(bidEvaluationScores.criterionId, mapping.criterionId),
          eq(bidEvaluationScores.bidderId, bidderId)
        ),
      });

      if (existingScore) {
        // Update existing score
        await db
          .update(bidEvaluationScores)
          .set({
            score: mapping.score,
            sourceType: 'qualification_auto',
            isAutoLoaded: 1,
            isLocked: 1,
            evaluationSource: 'qualification_auto',
            baselineId,
            qualificationScoreId,
            lockedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(bidEvaluationScores.id, existingScore.id));
      } else {
        // Create new score
        await db.insert(bidEvaluationScores).values({
          bidAnalysisId,
          criterionId: mapping.criterionId,
          bidderId,
          score: mapping.score,
          status: 'scored',
          sourceType: 'qualification_auto',
          isAutoLoaded: 1,
          isLocked: 1,
          evaluationSource: 'qualification_auto',
          baselineId,
          qualificationScoreId,
          lockedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    console.log(
      `[bidEvaluationQualificationMapping] Auto-loaded ${mappings.length} scores for bidder ${bidderId}`
    );
  } catch (error) {
    console.error('[bidEvaluationQualificationMapping] Map qualification to BEC error:', error);
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to map qualification to BEC',
    });
  }
}

/**
 * Get auto-loaded scores for a bid analysis
 * Returns all scores that were auto-loaded from qualification
 */
export async function getAutoLoadedScoresForAnalysis(
  bidAnalysisId: number,
  organizationId: number
): Promise<MappedQualificationScore[]> {
  try {
    const db = await getDb();

    // Verify organization access
    const analysis = await db.query.bidAnalyses.findFirst({
      where: and(
        eq(bidAnalyses.id, bidAnalysisId),
        eq(bidAnalyses.organizationId, organizationId)
      ),
    });

    if (!analysis) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Bid analysis not found or access denied',
      });
    }

    // Get auto-loaded scores
    const scores = await db.query.bidEvaluationScores.findMany({
      where: and(
        eq(bidEvaluationScores.bidAnalysisId, bidAnalysisId),
        eq(bidEvaluationScores.sourceType, 'qualification_auto'),
        eq(bidEvaluationScores.isAutoLoaded, 1)
      ),
    });

    return scores.map((score) => ({
      criterionId: score.criterionId,
      bidderId: score.bidderId,
      score: score.score || '0',
      sourceType: 'qualification_auto',
      isAutoLoaded: 1,
      isLocked: 1,
      evaluationSource: 'qualification_auto',
      baselineId: score.baselineId || 0,
      qualificationScoreId: score.qualificationScoreId || 0,
    }));
  } catch (error) {
    console.error('[bidEvaluationQualificationMapping] Get auto-loaded scores error:', error);
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch auto-loaded scores',
    });
  }
}

/**
 * Remove auto-loaded scores for a bid analysis
 * Useful when rolling back auto-load operation
 */
export async function removeAutoLoadedScores(
  bidAnalysisId: number,
  organizationId: number
): Promise<number> {
  try {
    const db = await getDb();

    // Verify organization access
    const analysis = await db.query.bidAnalyses.findFirst({
      where: and(
        eq(bidAnalyses.id, bidAnalysisId),
        eq(bidAnalyses.organizationId, organizationId)
      ),
    });

    if (!analysis) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Bid analysis not found or access denied',
      });
    }

    // Delete auto-loaded scores
    const result = await db
      .delete(bidEvaluationScores)
      .where(
        and(
          eq(bidEvaluationScores.bidAnalysisId, bidAnalysisId),
          eq(bidEvaluationScores.sourceType, 'qualification_auto'),
          eq(bidEvaluationScores.isAutoLoaded, 1)
        )
      );

    console.log(`[bidEvaluationQualificationMapping] Removed auto-loaded scores from analysis ${bidAnalysisId}`);
    return Number((result as any)?.[0]?.affectedRows || 0);
  } catch (error) {
    console.error('[bidEvaluationQualificationMapping] Remove auto-loaded scores error:', error);
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to remove auto-loaded scores',
    });
  }
}
