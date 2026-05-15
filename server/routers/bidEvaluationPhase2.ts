/**
 * Phase 2: BEC-Qualification Integration - tRPC Procedures
 * 
 * API endpoints for frontend integration:
 * - Get qualification baseline for display
 * - Create BEC with auto-loaded scores
 * - Get auto-loaded scores
 * - Manage locked/read-only scores
 * 
 * Uses actual schema: bidAnalysisId, score field, baselineId, qualificationScoreId
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { getDb } from '../db';
import { eq, and } from 'drizzle-orm';
import {
  bidAnalyses,
  bidAnalysisBidders,
  bidEvaluationScores,
  vendorProcurementBaselines,
  vendorQualificationScores,
  vendors,
} from '../../drizzle/schema';
import {
  getQualificationBaseline,
  getQualificationBaselines,
  mapQualificationToBeC,
  getAutoLoadedScoresForAnalysis,
  removeAutoLoadedScores,
} from '../services/procurement/bidEvaluationQualificationMapping';
import {
  getScoresWithLockStatus,
  unlockScore,
  lockScore,
  updateScoreWithValidation,
} from '../services/procurement/bidEvaluationScoreService';
import { router, protectedProcedure, scopedProcedure } from "../_core/trpc";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const GetQualificationBaselineInput = z.object({
  vendorId: z.number().int().positive(),
  bidAnalysisId: z.number().int().positive(),
});

const GetQualificationBaselinesInput = z.object({
  vendorIds: z.array(z.number().int().positive()),
  bidAnalysisId: z.number().int().positive(),
});

const AutoLoadQualificationInput = z.object({
  bidAnalysisId: z.number().int().positive(),
  bidderId: z.number().int().positive(),
  vendorId: z.number().int().positive(),
});

const UpdateScoreInput = z.object({
  scoreId: z.number().int().positive(),
  value: z.number().min(0).max(100),
  notes: z.string().optional(),
  bidAnalysisId: z.number().int().positive(),
});

const UnlockScoreInput = z.object({
  scoreId: z.number().int().positive(),
  reason: z.string().min(1),
  bidAnalysisId: z.number().int().positive(),
});

const LockScoreInput = z.object({
  scoreId: z.number().int().positive(),
  reason: z.string().min(1),
  bidAnalysisId: z.number().int().positive(),
});

// ============================================================================
// tRPC PROCEDURES
// ============================================================================

export const bidEvaluationPhase2Router = {
  /**
   * Get qualification baseline for a vendor
   * Returns vendor qualification score and baseline data
   */
  getQualificationBaseline: scopedProcedure
    .input(GetQualificationBaselineInput)
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();

        // Verify bid analysis access
        const analysis = await db.query.bidAnalyses.findFirst({
          where: and(
            eq(bidAnalyses.id, input.bidAnalysisId),
            eq(bidAnalyses.organizationId, ctx.scope.organizationId)
          ),
        });

        if (!analysis) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Bid analysis not found or access denied',
          });
        }

        // Get qualification baseline
        const baseline = await getQualificationBaseline(
          input.vendorId,
          ctx.scope.organizationId,
          analysis.operatingUnitId
        );

        if (!baseline) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Vendor has no qualification baseline',
          });
        }

        return baseline;
      } catch (error) {
        console.error('[bidEvaluationPhase2] Get qualification baseline error:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch qualification baseline',
        });
      }
    }),

  /**
   * Get qualification baselines for multiple vendors (batch)
   * Returns map of vendorId -> baseline
   */
  getQualificationBaselines: scopedProcedure
    .input(GetQualificationBaselinesInput)
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();

        // Verify bid analysis access
        const analysis = await db.query.bidAnalyses.findFirst({
          where: and(
            eq(bidAnalyses.id, input.bidAnalysisId),
            eq(bidAnalyses.organizationId, ctx.scope.organizationId)
          ),
        });

        if (!analysis) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Bid analysis not found or access denied',
          });
        }

        // Get baselines for all vendors
        const baselines = await getQualificationBaselines(
          input.vendorIds,
          ctx.scope.organizationId,
          analysis.operatingUnitId
        );

        return Object.fromEntries(baselines);
      } catch (error) {
        console.error('[bidEvaluationPhase2] Get qualification baselines error:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch qualification baselines',
        });
      }
    }),

  /**
   * Auto-load qualification baseline as BEC scores
   * Creates locked, read-only scores from qualification baseline
   */
  autoLoadQualification: scopedProcedure
    .input(AutoLoadQualificationInput)
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();

        // Verify bid analysis access
        const analysis = await db.query.bidAnalyses.findFirst({
          where: and(
            eq(bidAnalyses.id, input.bidAnalysisId),
            eq(bidAnalyses.organizationId, ctx.scope.organizationId)
          ),
        });

        if (!analysis) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Bid analysis not found or access denied',
          });
        }

        // Get qualification baseline
        const baseline = await getQualificationBaseline(
          input.vendorId,
          ctx.scope.organizationId,
          analysis.operatingUnitId
        );

        if (!baseline) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Vendor has no qualification baseline',
          });
        }

        // Map qualification to BEC scores
        await mapQualificationToBeC(
          input.bidAnalysisId,
          input.bidderId,
          baseline.baselineId,
          baseline.qualificationScoreId,
          ctx.scope.organizationId
        );

        return {
          success: true,
          message: `Auto-loaded qualification baseline for vendor ${input.vendorId}`,
          baselineId: baseline.baselineId,
          qualificationScoreId: baseline.qualificationScoreId,
        };
      } catch (error) {
        console.error('[bidEvaluationPhase2] Auto-load qualification error:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to auto-load qualification',
        });
      }
    }),

  /**
   * Get all auto-loaded scores for a bid analysis
   * Returns scores with sourceType = 'qualification_auto'
   */
  getAutoLoadedScores: scopedProcedure
    .input(z.object({ bidAnalysisId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      try {
        const scores = await getAutoLoadedScoresForAnalysis(
          input.bidAnalysisId,
          ctx.scope.organizationId
        );

        return {
          count: scores.length,
          scores,
        };
      } catch (error) {
        console.error('[bidEvaluationPhase2] Get auto-loaded scores error:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch auto-loaded scores',
        });
      }
    }),

  /**
   * Get all scores with lock status for a bid analysis
   * Shows which scores are locked and why
   */
  getScoresWithLockStatus: scopedProcedure
    .input(z.object({ bidAnalysisId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      try {
        const scores = await getScoresWithLockStatus(
          input.bidAnalysisId,
          ctx.scope.organizationId
        );

        return {
          count: scores.length,
          locked: scores.filter((s) => s.isLocked === 1).length,
          autoLoaded: scores.filter((s) => s.isAutoLoaded === 1).length,
          scores,
        };
      } catch (error) {
        console.error('[bidEvaluationPhase2] Get scores with lock status error:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch scores with lock status',
        });
      }
    }),

  /**
   * Update a score (only if not locked)
   * Validates lock status before allowing update
   */
  updateScore: scopedProcedure
    .input(UpdateScoreInput)
    .mutation(async ({ ctx, input }) => {
      try {
        await updateScoreWithValidation(
          {
            scoreId: input.scoreId,
            value: input.value,
            notes: input.notes,
            userId: ctx.user.id,
            bidAnalysisId: input.bidAnalysisId,
            organizationId: ctx.scope.organizationId,
          },
          ctx.scope.organizationId
        );

        return {
          success: true,
          message: `Score ${input.scoreId} updated successfully`,
        };
      } catch (error) {
        console.error('[bidEvaluationPhase2] Update score error:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update score',
        });
      }
    }),

  /**
   * Unlock a score (admin only)
   * Allows modification of previously locked scores
   */
  unlockScore: scopedProcedure
    .input(UnlockScoreInput)
    .mutation(async ({ ctx, input }) => {
      try {
        // Check admin role
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only admins can unlock scores',
          });
        }

        await unlockScore(
          input.scoreId,
          ctx.user.id,
          input.reason,
          input.bidAnalysisId,
          ctx.scope.organizationId
        );

        return {
          success: true,
          message: `Score ${input.scoreId} unlocked successfully`,
        };
      } catch (error) {
        console.error('[bidEvaluationPhase2] Unlock score error:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to unlock score',
        });
      }
    }),

  /**
   * Lock a score (admin only)
   * Prevents further modifications
   */
  lockScore: scopedProcedure
    .input(LockScoreInput)
    .mutation(async ({ ctx, input }) => {
      try {
        // Check admin role
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only admins can lock scores',
          });
        }

        await lockScore(
          input.scoreId,
          ctx.user.id,
          input.reason,
          input.bidAnalysisId,
          ctx.scope.organizationId
        );

        return {
          success: true,
          message: `Score ${input.scoreId} locked successfully`,
        };
      } catch (error) {
        console.error('[bidEvaluationPhase2] Lock score error:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to lock score',
        });
      }
    }),

  /**
   * Remove all auto-loaded scores from a bid analysis
   * Useful for rolling back auto-load operation
   */
  removeAutoLoadedScores: scopedProcedure
    .input(z.object({ bidAnalysisId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Check admin role
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only admins can remove auto-loaded scores',
          });
        }

        const count = await removeAutoLoadedScores(
          input.bidAnalysisId,
          ctx.scope.organizationId
        );

        return {
          success: true,
          message: `Removed ${count} auto-loaded scores`,
          count,
        };
      } catch (error) {
        console.error('[bidEvaluationPhase2] Remove auto-loaded scores error:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to remove auto-loaded scores',
        });
      }
    }),
};
