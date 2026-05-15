/**
 * Batch Query Service for BEC + Vendor Qualification Integration
 * 
 * Optimized queries to prevent N+1 problems
 * Uses actual schema fields: bidAnalysisId, score, baselineId, qualificationScoreId
 * 
 * CRITICAL DESIGN DECISIONS:
 * 1. Uses baselineId and qualificationScoreId for linkage (not snapshots)
 * 2. Data isolation through bidAnalyses.organizationId
 * 3. No snapshot tables - uses actual vendor_procurement_baselines and vendor_qualification_scores
 * 4. All timestamps in UTC
 */

import { getDb } from '../../db';
import { 
  bidEvaluationScores, 
  bidEvaluationCriteria,
  bidAnalyses,
  bidAnalysisBidders,
  vendorProcurementBaselines,
  vendorQualificationScores,
  vendors
} from '../../../drizzle/schema';
import { eq, and, inArray, isNotNull } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface BidEvaluationScoreWithQualification {
  scoreId: number;
  bidAnalysisId: number;
  criterionId: number;
  bidderId: number;
  score: string | null;
  status: string;
  notes: string | null;
  sourceType: string;
  isAutoLoaded: number;
  isLocked: number;
  evaluationSource: string;
  baselineId: number | null;
  qualificationScoreId: number | null;
  lockedAt: string | null;
  lockedBy: number | null;
  // Qualification baseline data
  vendorId: number | null;
  vendorName: string | null;
  qualificationStatus: string | null;
  qualificationTotalScore: string | null;
  baselineCreatedAt: string | null;
}

export interface BidEvaluationBatchResult {
  bidAnalysisId: number;
  organizationId: number;
  operatingUnitId: number | null;
  totalScores: number;
  autoLoadedScores: number;
  lockedScores: number;
  manualScores: number;
  scores: BidEvaluationScoreWithQualification[];
}

// ============================================================================
// BATCH QUERY FUNCTIONS
// ============================================================================

/**
 * Get all scores for a bid analysis with qualification baseline data
 * Single query with joins to prevent N+1
 */
export async function getScoresWithQualificationBaselines(
  bidAnalysisId: number,
  organizationId: number
): Promise<BidEvaluationScoreWithQualification[]> {
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

    // Get all scores with joined qualification data
    const scores = await db
      .select({
        scoreId: bidEvaluationScores.id,
        bidAnalysisId: bidEvaluationScores.bidAnalysisId,
        criterionId: bidEvaluationScores.criterionId,
        bidderId: bidEvaluationScores.bidderId,
        score: bidEvaluationScores.score,
        status: bidEvaluationScores.status,
        notes: bidEvaluationScores.notes,
        sourceType: bidEvaluationScores.sourceType,
        isAutoLoaded: bidEvaluationScores.isAutoLoaded,
        isLocked: bidEvaluationScores.isLocked,
        evaluationSource: bidEvaluationScores.evaluationSource,
        baselineId: bidEvaluationScores.baselineId,
        qualificationScoreId: bidEvaluationScores.qualificationScoreId,
        lockedAt: bidEvaluationScores.lockedAt,
        lockedBy: bidEvaluationScores.lockedBy,
        // From baseline
        vendorId: vendorProcurementBaselines.vendorId,
        vendorName: vendors.name,
        qualificationStatus: vendorQualificationScores.qualificationStatus,
        qualificationTotalScore: vendorQualificationScores.totalScore,
        baselineCreatedAt: vendorProcurementBaselines.createdAt,
      })
      .from(bidEvaluationScores)
      .leftJoin(
        vendorProcurementBaselines,
        eq(bidEvaluationScores.baselineId, vendorProcurementBaselines.id)
      )
      .leftJoin(
        vendorQualificationScores,
        eq(bidEvaluationScores.qualificationScoreId, vendorQualificationScores.id)
      )
      .leftJoin(
        vendors,
        eq(vendorProcurementBaselines.vendorId, vendors.id)
      )
      .where(eq(bidEvaluationScores.bidAnalysisId, bidAnalysisId));

    return scores as BidEvaluationScoreWithQualification[];
  } catch (error) {
    console.error('[batchQueryService] Get scores with qualification baselines error:', error);
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch scores with qualification baselines',
    });
  }
}

/**
 * Get auto-loaded scores for a bid analysis
 * Only returns scores with sourceType = 'qualification_auto'
 */
export async function getAutoLoadedScores(
  bidAnalysisId: number,
  organizationId: number
): Promise<BidEvaluationScoreWithQualification[]> {
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
    const scores = await db
      .select({
        scoreId: bidEvaluationScores.id,
        bidAnalysisId: bidEvaluationScores.bidAnalysisId,
        criterionId: bidEvaluationScores.criterionId,
        bidderId: bidEvaluationScores.bidderId,
        score: bidEvaluationScores.score,
        status: bidEvaluationScores.status,
        notes: bidEvaluationScores.notes,
        sourceType: bidEvaluationScores.sourceType,
        isAutoLoaded: bidEvaluationScores.isAutoLoaded,
        isLocked: bidEvaluationScores.isLocked,
        evaluationSource: bidEvaluationScores.evaluationSource,
        baselineId: bidEvaluationScores.baselineId,
        qualificationScoreId: bidEvaluationScores.qualificationScoreId,
        lockedAt: bidEvaluationScores.lockedAt,
        lockedBy: bidEvaluationScores.lockedBy,
        vendorId: vendorProcurementBaselines.vendorId,
        vendorName: vendors.name,
        qualificationStatus: vendorQualificationScores.qualificationStatus,
        qualificationTotalScore: vendorQualificationScores.totalScore,
        baselineCreatedAt: vendorProcurementBaselines.createdAt,
      })
      .from(bidEvaluationScores)
      .leftJoin(
        vendorProcurementBaselines,
        eq(bidEvaluationScores.baselineId, vendorProcurementBaselines.id)
      )
      .leftJoin(
        vendorQualificationScores,
        eq(bidEvaluationScores.qualificationScoreId, vendorQualificationScores.id)
      )
      .leftJoin(
        vendors,
        eq(vendorProcurementBaselines.vendorId, vendors.id)
      )
      .where(
        and(
          eq(bidEvaluationScores.bidAnalysisId, bidAnalysisId),
          eq(bidEvaluationScores.sourceType, 'qualification_auto'),
          eq(bidEvaluationScores.isAutoLoaded, 1)
        )
      );

    return scores as BidEvaluationScoreWithQualification[];
  } catch (error) {
    console.error('[batchQueryService] Get auto-loaded scores error:', error);
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch auto-loaded scores',
    });
  }
}

/**
 * Get locked scores for a bid analysis
 * Only returns scores with isLocked = 1
 */
export async function getLockedScores(
  bidAnalysisId: number,
  organizationId: number
): Promise<BidEvaluationScoreWithQualification[]> {
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

    // Get locked scores
    const scores = await db
      .select({
        scoreId: bidEvaluationScores.id,
        bidAnalysisId: bidEvaluationScores.bidAnalysisId,
        criterionId: bidEvaluationScores.criterionId,
        bidderId: bidEvaluationScores.bidderId,
        score: bidEvaluationScores.score,
        status: bidEvaluationScores.status,
        notes: bidEvaluationScores.notes,
        sourceType: bidEvaluationScores.sourceType,
        isAutoLoaded: bidEvaluationScores.isAutoLoaded,
        isLocked: bidEvaluationScores.isLocked,
        evaluationSource: bidEvaluationScores.evaluationSource,
        baselineId: bidEvaluationScores.baselineId,
        qualificationScoreId: bidEvaluationScores.qualificationScoreId,
        lockedAt: bidEvaluationScores.lockedAt,
        lockedBy: bidEvaluationScores.lockedBy,
        vendorId: vendorProcurementBaselines.vendorId,
        vendorName: vendors.name,
        qualificationStatus: vendorQualificationScores.qualificationStatus,
        qualificationTotalScore: vendorQualificationScores.totalScore,
        baselineCreatedAt: vendorProcurementBaselines.createdAt,
      })
      .from(bidEvaluationScores)
      .leftJoin(
        vendorProcurementBaselines,
        eq(bidEvaluationScores.baselineId, vendorProcurementBaselines.id)
      )
      .leftJoin(
        vendorQualificationScores,
        eq(bidEvaluationScores.qualificationScoreId, vendorQualificationScores.id)
      )
      .leftJoin(
        vendors,
        eq(vendorProcurementBaselines.vendorId, vendors.id)
      )
      .where(
        and(
          eq(bidEvaluationScores.bidAnalysisId, bidAnalysisId),
          eq(bidEvaluationScores.isLocked, 1)
        )
      );

    return scores as BidEvaluationScoreWithQualification[];
  } catch (error) {
    console.error('[batchQueryService] Get locked scores error:', error);
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch locked scores',
    });
  }
}

/**
 * Get scores for specific criteria across all bidders
 * Useful for comparing scores for a single criterion
 */
export async function getScoresForCriteria(
  bidAnalysisId: number,
  criterionId: number,
  organizationId: number
): Promise<BidEvaluationScoreWithQualification[]> {
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

    // Get scores for criterion
    const scores = await db
      .select({
        scoreId: bidEvaluationScores.id,
        bidAnalysisId: bidEvaluationScores.bidAnalysisId,
        criterionId: bidEvaluationScores.criterionId,
        bidderId: bidEvaluationScores.bidderId,
        score: bidEvaluationScores.score,
        status: bidEvaluationScores.status,
        notes: bidEvaluationScores.notes,
        sourceType: bidEvaluationScores.sourceType,
        isAutoLoaded: bidEvaluationScores.isAutoLoaded,
        isLocked: bidEvaluationScores.isLocked,
        evaluationSource: bidEvaluationScores.evaluationSource,
        baselineId: bidEvaluationScores.baselineId,
        qualificationScoreId: bidEvaluationScores.qualificationScoreId,
        lockedAt: bidEvaluationScores.lockedAt,
        lockedBy: bidEvaluationScores.lockedBy,
        vendorId: vendorProcurementBaselines.vendorId,
        vendorName: vendors.name,
        qualificationStatus: vendorQualificationScores.qualificationStatus,
        qualificationTotalScore: vendorQualificationScores.totalScore,
        baselineCreatedAt: vendorProcurementBaselines.createdAt,
      })
      .from(bidEvaluationScores)
      .leftJoin(
        vendorProcurementBaselines,
        eq(bidEvaluationScores.baselineId, vendorProcurementBaselines.id)
      )
      .leftJoin(
        vendorQualificationScores,
        eq(bidEvaluationScores.qualificationScoreId, vendorQualificationScores.id)
      )
      .leftJoin(
        vendors,
        eq(vendorProcurementBaselines.vendorId, vendors.id)
      )
      .where(
        and(
          eq(bidEvaluationScores.bidAnalysisId, bidAnalysisId),
          eq(bidEvaluationScores.criterionId, criterionId)
        )
      );

    return scores as BidEvaluationScoreWithQualification[];
  } catch (error) {
    console.error('[batchQueryService] Get scores for criteria error:', error);
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch scores for criteria',
    });
  }
}

/**
 * Get scores for specific bidder across all criteria
 * Useful for reviewing a single bidder's evaluation
 */
export async function getScoresForBidder(
  bidAnalysisId: number,
  bidderId: number,
  organizationId: number
): Promise<BidEvaluationScoreWithQualification[]> {
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

    // Get scores for bidder
    const scores = await db
      .select({
        scoreId: bidEvaluationScores.id,
        bidAnalysisId: bidEvaluationScores.bidAnalysisId,
        criterionId: bidEvaluationScores.criterionId,
        bidderId: bidEvaluationScores.bidderId,
        score: bidEvaluationScores.score,
        status: bidEvaluationScores.status,
        notes: bidEvaluationScores.notes,
        sourceType: bidEvaluationScores.sourceType,
        isAutoLoaded: bidEvaluationScores.isAutoLoaded,
        isLocked: bidEvaluationScores.isLocked,
        evaluationSource: bidEvaluationScores.evaluationSource,
        baselineId: bidEvaluationScores.baselineId,
        qualificationScoreId: bidEvaluationScores.qualificationScoreId,
        lockedAt: bidEvaluationScores.lockedAt,
        lockedBy: bidEvaluationScores.lockedBy,
        vendorId: vendorProcurementBaselines.vendorId,
        vendorName: vendors.name,
        qualificationStatus: vendorQualificationScores.qualificationStatus,
        qualificationTotalScore: vendorQualificationScores.totalScore,
        baselineCreatedAt: vendorProcurementBaselines.createdAt,
      })
      .from(bidEvaluationScores)
      .leftJoin(
        vendorProcurementBaselines,
        eq(bidEvaluationScores.baselineId, vendorProcurementBaselines.id)
      )
      .leftJoin(
        vendorQualificationScores,
        eq(bidEvaluationScores.qualificationScoreId, vendorQualificationScores.id)
      )
      .leftJoin(
        vendors,
        eq(vendorProcurementBaselines.vendorId, vendors.id)
      )
      .where(
        and(
          eq(bidEvaluationScores.bidAnalysisId, bidAnalysisId),
          eq(bidEvaluationScores.bidderId, bidderId)
        )
      );

    return scores as BidEvaluationScoreWithQualification[];
  } catch (error) {
    console.error('[batchQueryService] Get scores for bidder error:', error);
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch scores for bidder',
    });
  }
}

/**
 * Get batch summary for a bid analysis
 * Returns counts of auto-loaded, locked, and manual scores
 */
export async function getBidAnalysisSummary(
  bidAnalysisId: number,
  organizationId: number
): Promise<BidEvaluationBatchResult> {
  try {
    const db = await getDb();

    // Verify organization access and get analysis
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

    // Get all scores with qualification data
    const scores = await getScoresWithQualificationBaselines(bidAnalysisId, organizationId);

    // Calculate statistics
    const totalScores = scores.length;
    const autoLoadedScores = scores.filter((s) => s.isAutoLoaded === 1).length;
    const lockedScores = scores.filter((s) => s.isLocked === 1).length;
    const manualScores = totalScores - autoLoadedScores;

    return {
      bidAnalysisId,
      organizationId,
      operatingUnitId: analysis.operatingUnitId,
      totalScores,
      autoLoadedScores,
      lockedScores,
      manualScores,
      scores,
    };
  } catch (error) {
    console.error('[batchQueryService] Get bid analysis summary error:', error);
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch bid analysis summary',
    });
  }
}
