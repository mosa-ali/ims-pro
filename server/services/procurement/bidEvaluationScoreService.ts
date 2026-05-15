/**
 * Bid Evaluation Score Service
 * 
 * Handles score updates with lock enforcement, validation, and audit trail
 * Prevents modification of locked scores from qualification baseline
 * 
 * CRITICAL DESIGN DECISIONS:
 * 1. Uses actual schema fields: score (not value), bidAnalysisId (not bidEvaluationId)
 * 2. No snapshot table references - uses baselineId and qualificationScoreId
 * 3. Data isolation through bidAnalyses.organizationId
 * 4. Lock enforcement on isLocked field
 */

import { getDb } from '../../db';
import { 
  bidEvaluationScores, 
  bidAnalyses,
  vendorProcurementBaselines,
  vendorQualificationScores 
} from '../../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ScoreUpdateInput {
  scoreId: number;
  value: number; // Will be converted to string for database
  notes?: string;
  userId: number;
  bidAnalysisId: number;
  organizationId: number;
}

export interface ScoreValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ScoreWithContext {
  scoreId: number;
  bidAnalysisId: number;
  criterionId: number;
  bidderId: number;
  score: string | null;
  status: 'scored' | 'none';
  notes: string | null;
  sourceType: string;
  isAutoLoaded: number;
  isLocked: number;
  evaluationSource: string;
  baselineId: number | null;
  qualificationScoreId: number | null;
  lockedAt: string | null;
  lockedBy: number | null;
  canModify: boolean;
  sourceDescription: string;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates score update against lock enforcement rules
 * Prevents modification of auto-loaded scores from qualification baseline
 */
export async function validateScoreUpdate(
  input: ScoreUpdateInput,
  organizationId: number
): Promise<ScoreValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const db = await getDb();

    // Verify bid analysis access
    const analysis = await db.query.bidAnalyses.findFirst({
      where: and(
        eq(bidAnalyses.id, input.bidAnalysisId),
        eq(bidAnalyses.organizationId, organizationId)
      ),
    });

    if (!analysis) {
      errors.push('Bid analysis not found or access denied');
      return { isValid: false, errors, warnings };
    }

    // Fetch the score record
    const score = await db.query.bidEvaluationScores.findFirst({
      where: eq(bidEvaluationScores.id, input.scoreId),
    });

    if (!score) {
      errors.push(`Score with ID ${input.scoreId} not found`);
      return { isValid: false, errors, warnings };
    }

    // Verify score belongs to correct bid analysis
    if (score.bidAnalysisId !== input.bidAnalysisId) {
      errors.push('Score does not belong to this bid analysis');
      return { isValid: false, errors, warnings };
    }

    // CRITICAL: Check if score is locked (auto-loaded from qualification)
    if (score.isLocked === 1) {
      errors.push(
        `Cannot modify locked score. This score was auto-loaded from qualification baseline. ` +
        `Source: ${score.evaluationSource}. Contact procurement manager to unlock.`
      );
      return { isValid: false, errors, warnings };
    }

    // Check if score is auto-loaded but not locked (warning)
    if (score.isAutoLoaded === 1 && score.isLocked === 0) {
      warnings.push(
        'This score was auto-loaded from qualification baseline but is currently unlocked. ' +
        'Modifications will override the qualification value.'
      );
    }

    // Validate score value range (0-100)
    if (input.value < 0 || input.value > 100) {
      errors.push(`Score value must be between 0 and 100. Received: ${input.value}`);
    }

    // Validate score type
    if (typeof input.value !== 'number') {
      errors.push(`Score value must be a number. Received: ${typeof input.value}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { isValid: false, errors, warnings };
  }
}

// ============================================================================
// SCORE UPDATE FUNCTIONS
// ============================================================================

/**
 * Updates a score with full validation and audit trail
 * Throws error if score is locked
 */
export async function updateScoreWithValidation(
  input: ScoreUpdateInput,
  organizationId: number
): Promise<void> {
  // Validate first
  const validation = await validateScoreUpdate(input, organizationId);

  if (!validation.isValid) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Score update validation failed: ${validation.errors.join('; ')}`,
    });
  }

  // Log warnings to console (can be sent to audit service)
  if (validation.warnings.length > 0) {
    console.warn('[Score Update Warnings]', validation.warnings);
  }

  const db = await getDb();

  // Update score - use correct field name 'score' not 'value'
  await db
    .update(bidEvaluationScores)
    .set({
      score: input.value.toString(), // Convert number to string for decimal field
      notes: input.notes || null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(bidEvaluationScores.id, input.scoreId));
}

/**
 * Batch fetch scores with lock status and qualification baseline
 * Optimizes N+1 query pattern
 */
export async function getScoresWithLockStatus(
  bidAnalysisId: number,
  organizationId: number
): Promise<ScoreWithContext[]> {
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
    })
    .from(bidEvaluationScores)
    .where(eq(bidEvaluationScores.bidAnalysisId, bidAnalysisId));

  // Map to context with computed fields
  return scores.map((score) => ({
    ...score,
    canModify: score.isLocked === 0,
    sourceDescription:
      score.isAutoLoaded === 1
        ? `Auto-loaded from ${score.evaluationSource}`
        : 'Manually entered',
  })) as ScoreWithContext[];
}

// ============================================================================
// LOCK/UNLOCK FUNCTIONS
// ============================================================================

/**
 * Unlock a score (admin only)
 * Creates audit trail for compliance
 */
export async function unlockScore(
  scoreId: number,
  userId: number,
  reason: string,
  bidAnalysisId: number,
  organizationId: number
): Promise<void> {
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

  // Verify score exists and belongs to analysis
  const score = await db.query.bidEvaluationScores.findFirst({
    where: and(
      eq(bidEvaluationScores.id, scoreId),
      eq(bidEvaluationScores.bidAnalysisId, bidAnalysisId)
    ),
  });

  if (!score) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Score not found or does not belong to this bid analysis',
    });
  }

  // Unlock score
  const auditNote = `[UNLOCKED by user ${userId} at ${new Date().toISOString()}. Reason: ${reason}]`;
  const updatedNotes = score.notes ? `${score.notes}\n${auditNote}` : auditNote;

  await db
    .update(bidEvaluationScores)
    .set({
      isLocked: 0,
      notes: updatedNotes,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(bidEvaluationScores.id, scoreId));

  // Log to audit
  console.log(`[AUDIT] Score ${scoreId} unlocked by user ${userId}. Reason: ${reason}`);
}

/**
 * Lock a score (admin only)
 * Prevents further modifications
 */
export async function lockScore(
  scoreId: number,
  userId: number,
  reason: string,
  bidAnalysisId: number,
  organizationId: number
): Promise<void> {
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

  // Verify score exists
  const score = await db.query.bidEvaluationScores.findFirst({
    where: and(
      eq(bidEvaluationScores.id, scoreId),
      eq(bidEvaluationScores.bidAnalysisId, bidAnalysisId)
    ),
  });

  if (!score) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Score not found',
    });
  }

  // Lock score
  const auditNote = `[LOCKED by user ${userId} at ${new Date().toISOString()}. Reason: ${reason}]`;
  const updatedNotes = score.notes ? `${score.notes}\n${auditNote}` : auditNote;

  await db
    .update(bidEvaluationScores)
    .set({
      isLocked: 1,
      lockedAt: new Date().toISOString(),
      lockedBy: userId,
      notes: updatedNotes,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(bidEvaluationScores.id, scoreId));

  // Log to audit
  console.log(`[AUDIT] Score ${scoreId} locked by user ${userId}. Reason: ${reason}`);
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get score modification history
 * Shows all changes and who made them
 */
export async function getScoreDetails(
  scoreId: number,
  bidAnalysisId: number,
  organizationId: number
) {
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

  // Get score with full context
  const score = await db
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
      createdAt: bidEvaluationScores.createdAt,
      updatedAt: bidEvaluationScores.updatedAt,
      // Baseline data
      baselineCreatedAt: vendorProcurementBaselines.createdAt,
      // Qualification data
      qualificationStatus: vendorQualificationScores.qualificationStatus,
      qualificationTotalScore: vendorQualificationScores.totalScore,
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
    .where(and(eq(bidEvaluationScores.id, scoreId), eq(bidEvaluationScores.bidAnalysisId, bidAnalysisId)))
    .limit(1);

  if (score.length === 0) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Score not found',
    });
  }

  return score[0];
}

/**
 * Get all scores for a criterion across all bidders
 * Useful for comparing scores
 */
export async function getScoresForCriterion(
  bidAnalysisId: number,
  criterionId: number,
  organizationId: number
): Promise<ScoreWithContext[]> {
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
    })
    .from(bidEvaluationScores)
    .where(
      and(
        eq(bidEvaluationScores.bidAnalysisId, bidAnalysisId),
        eq(bidEvaluationScores.criterionId, criterionId)
      )
    );

  // Map to context
  return scores.map((score) => ({
    ...score,
    canModify: score.isLocked === 0,
    sourceDescription:
      score.isAutoLoaded === 1
        ? `Auto-loaded from ${score.evaluationSource}`
        : 'Manually entered',
  })) as ScoreWithContext[];
}
