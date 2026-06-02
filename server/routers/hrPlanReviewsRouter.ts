/**
 * ============================================================================
 * HR PLAN REVIEWS ROUTER - CORRECTED VERSION
 * ============================================================================
 * 
 * CRITICAL FIXES APPLIED:
 * ✅ Uses scopedAndActive() instead of inline isNull(deletedAt)
 * ✅ Uses nowSql() instead of new Date()
 * ✅ Uses buildUpdatePayload() and buildSoftDeletePayload()
 * ✅ Uses database helper functions
 * ✅ Uses status constants instead of hardcoded strings
 * ✅ Uses ctx.user?.id instead of ctx.user.email
 * 
 * ============================================================================
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, scopedProcedure } from '../_core/trpc';
import { getDb } from '../db';
import {
  listPlanReviews,
  getPlanReview,
  approvePlanReview,
  rejectPlanReview,
  softDeletePlanReview,
} from '../db/hrAnnualPlanning';
import { PLAN_REVIEW_STATUS, PLAN_REVIEWER_ROLE } from '../db/_status';
import { hrPlanReviews } from '../../drizzle/schema';
import { and, eq, desc } from 'drizzle-orm';
import { nowSql } from '../db/_time';
import { buildUpdatePayload, buildSoftDeletePayload, scopedAndActive } from '../db/_scope';

// Validation schemas
const createReviewSchema = z.object({
  planId: z.number().int().positive(),
  reviewerUserId: z.number().int().optional(),
  reviewerName: z.string().min(1).max(255),
  reviewerRole: z.enum(['hr_manager', 'department_head', 'executive', 'finance', 'other']),
  comments: z.string().optional(),
  recommendations: z.string().optional(),
});

const updateReviewSchema = z.object({
  id: z.number().int().positive(),
  comments: z.string().optional(),
  recommendations: z.string().optional(),
});

export const hrPlanReviewsRouter = router({
  /**
   * Get all reviews for a plan
   * USES: scopedAndActive() for proper scope + soft-delete filtering
   */
  getAll: scopedProcedure
    .input(
      z.object({
        planId: z.number().int().positive(),
        reviewStatus: z.enum(['pending', 'approved', 'rejected', 'commented']).optional(),
        limit: z.number().int().positive().default(50),
        offset: z.number().int().nonnegative().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      return listPlanReviews(db, ctx.scope, input.planId, {
        reviewStatus: input.reviewStatus,
        limit: input.limit,
        offset: input.offset,
      });
    }),

  /**
   * Get single review by ID
   * USES: getPlanReview() database helper
   */
  getById: scopedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      return getPlanReview(db, input.id, ctx.scope);
    }),

  /**
   * Get reviews by plan ID
   * USES: listPlanReviews() database helper
   */
  getByPlanId: scopedProcedure
    .input(z.object({ planId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      return listPlanReviews(db, ctx.scope, input.planId, { limit: 1000 });
    }),

  /**
   * Get review statistics for a plan
   * USES: PLAN_REVIEW_STATUS constants instead of hardcoded strings
   */
  getStatistics: scopedProcedure
    .input(z.object({ planId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      const reviews = await listPlanReviews(db, ctx.scope, input.planId, { limit: 1000 });

      return {
        total: reviews.length,
        byStatus: {
          pending: reviews.filter((r) => r.reviewStatus === PLAN_REVIEW_STATUS.PENDING).length,
          approved: reviews.filter((r) => r.reviewStatus === PLAN_REVIEW_STATUS.APPROVED).length,
          rejected: reviews.filter((r) => r.reviewStatus === PLAN_REVIEW_STATUS.REJECTED).length,
          commented: reviews.filter((r) => r.reviewStatus === PLAN_REVIEW_STATUS.COMMENTED).length,
        },
        byRole: {
          hr_manager: reviews.filter((r) => r.reviewerRole === PLAN_REVIEWER_ROLE.HR_MANAGER).length,
          department_head: reviews.filter((r) => r.reviewerRole === PLAN_REVIEWER_ROLE.DEPARTMENT_HEAD).length,
          executive: reviews.filter((r) => r.reviewerRole === PLAN_REVIEWER_ROLE.EXECUTIVE).length,
          finance: reviews.filter((r) => r.reviewerRole === PLAN_REVIEWER_ROLE.FINANCE).length,
          other: reviews.filter((r) => r.reviewerRole === PLAN_REVIEWER_ROLE.OTHER).length,
        },
        allApproved: reviews.every((r) => r.reviewStatus === PLAN_REVIEW_STATUS.APPROVED),
        anyRejected: reviews.some((r) => r.reviewStatus === PLAN_REVIEW_STATUS.REJECTED),
      };
    }),

  /**
   * Create new review
   * USES: nowSql() for timestamps, ctx.user?.id for user ID
   */
  create: scopedProcedure
    .input(createReviewSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      try {
        const result = await db.insert(hrPlanReviews).values({
          organizationId: ctx.scope.organizationId,
          operatingUnitId: ctx.scope.operatingUnitId || null,
          planId: input.planId,
          reviewerUserId: input.reviewerUserId || null,
          reviewerName: input.reviewerName,
          reviewerRole: input.reviewerRole,
          reviewStatus: PLAN_REVIEW_STATUS.PENDING,
          comments: input.comments || null,
          recommendations: input.recommendations || null,
          reviewDate: null,
          isDeleted: 0,
          createdAt: nowSql(),
          createdBy: ctx.user?.id || null,
        });

        return {
          success: true,
          id: result.insertId,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create review',
        });
      }
    }),

  /**
   * Update review
   * USES: buildUpdatePayload() for consistent update pattern
   */
  update: scopedProcedure
    .input(updateReviewSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      try {
        const { id, ...updateData } = input;

        await db
          .update(hrPlanReviews)
          .set(buildUpdatePayload({
            ...updateData,
            updatedBy: ctx.user?.id || null,
          }))
          .where(
            and(
              eq(hrPlanReviews.id, id),
              ...scopedAndActive(hrPlanReviews, ctx.scope),
            )
          );

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update review',
        });
      }
    }),

  /**
   * Approve review
   * USES: approvePlanReview() database helper
   */
  approve: scopedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        comments: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      try {
        await approvePlanReview(db, input.id, input.comments || null, ctx.user?.id );
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to approve review',
        });
      }
    }),

  /**
   * Reject review
   * USES: rejectPlanReview() database helper
   */
  reject: scopedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        comments: z.string(),
        recommendations: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      try {
        await rejectPlanReview(
          db,
          input.id,
          input.comments,
          input.recommendations || null,
          ctx.user?.id || 0,
        );
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to reject review',
        });
      }
    }),

  /**
   * Add comment to review
   * USES: buildUpdatePayload() for consistent update pattern
   */
  addComment: scopedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        comment: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      try {
        await db
          .update(hrPlanReviews)
          .set(buildUpdatePayload({
            reviewStatus: PLAN_REVIEW_STATUS.COMMENTED,
            comments: input.comment,
            updatedBy: ctx.user?.id || null,
          }))
          .where(
            and(
              eq(hrPlanReviews.id, input.id),
              ...scopedAndActive(hrPlanReviews, ctx.scope),
            )
          );

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to add comment',
        });
      }
    }),

  /**
   * Soft delete review
   * USES: softDeletePlanReview() database helper
   */
  delete: scopedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      try {
        await softDeletePlanReview(db, input.id, ctx.user?.id || 0, ctx.scope);
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete review',
        });
      }
    }),

  /**
   * Restore soft-deleted review
   * USES: buildUpdatePayload() for consistent restore pattern
   */
  restore: scopedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      try {
        await db
          .update(hrPlanReviews)
          .set(buildUpdatePayload({
            isDeleted: 0,
            deletedAt: null,
            deletedBy: null,
            updatedBy: ctx.user?.id || null,
          }))
          .where(
            and(
              eq(hrPlanReviews.id, input.id),
              eq(hrPlanReviews.organizationId, ctx.scope.organizationId),
            )
          );

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to restore review',
        });
      }
    }),
});
