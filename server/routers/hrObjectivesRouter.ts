/**
 * ============================================================================
 * HR OBJECTIVES ROUTER - CORRECTED VERSION
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
  listObjectives,
  getObjective,
  updateObjectiveStatus,
  softDeleteObjective,
} from '../db/hrAnnualPlanning';
import { OBJECTIVE_STATUS, OBJECTIVE_PRIORITY } from '../db/_status';
import { hrObjectives } from '../../drizzle/schema';
import { and, eq, inArray, desc } from 'drizzle-orm';
import { nowSql } from '../db/_time';
import { buildUpdatePayload, buildSoftDeletePayload, scopedAndActive } from '../db/_scope';

// Validation schemas
const createObjectiveSchema = z.object({
  planId: z.number().int().positive(),
  objectiveCode: z.string().min(1).max(50),
  objectiveNameEn: z.string().min(3).max(255),
  objectiveNameAr: z.string().min(3).max(255),
  descriptionEn: z.string().optional(),
  descriptionAr: z.string().optional(),
  category: z.string().optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  ownerUserId: z.number().int().optional(),
  ownerName: z.string().optional(),
  weight: z.number().optional().default(1.0),
  notes: z.string().optional(),
});

const updateObjectiveSchema = z.object({
  id: z.number().int().positive(),
  objectiveCode: z.string().min(1).max(50).optional(),
  objectiveNameEn: z.string().min(3).max(255).optional(),
  objectiveNameAr: z.string().min(3).max(255).optional(),
  descriptionEn: z.string().optional(),
  descriptionAr: z.string().optional(),
  category: z.string().optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  ownerUserId: z.number().int().optional(),
  ownerName: z.string().optional(),
  weight: z.number().optional(),
  notes: z.string().optional(),
});

export const hrObjectivesRouter = router({
  /**
   * Get all objectives for a plan with filters
   * USES: scopedAndActive() for proper scope + soft-delete filtering
   */
  getAll: scopedProcedure
    .input(
      z.object({
        planId: z.number().int().positive(),
        status: z.enum(['draft', 'active', 'completed', 'archived']).optional(),
        limit: z.number().int().positive().default(50),
        offset: z.number().int().nonnegative().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      return listObjectives(db, ctx.scope, input.planId, {
        status: input.status,
        limit: input.limit,
        offset: input.offset,
      });
    }),

  /**
   * Get single objective by ID
   * USES: getObjective() database helper
   */
  getById: scopedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      return getObjective(db, input.id, ctx.scope);
    }),

  /**
   * Get objectives by plan ID
   * USES: listObjectives() database helper
   */
  getByPlanId: scopedProcedure
    .input(z.object({ planId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      return listObjectives(db, ctx.scope, input.planId, { limit: 1000 });
    }),

  /**
   * Get objectives statistics
   * USES: OBJECTIVE_STATUS constants instead of hardcoded strings
   */
  getStatistics: scopedProcedure
    .input(z.object({ planId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      const objectives = await listObjectives(db, ctx.scope, input.planId, { limit: 1000 });

      return {
        total: objectives.length,
        byStatus: {
          draft: objectives.filter((o) => o.status === OBJECTIVE_STATUS.DRAFT).length,
          active: objectives.filter((o) => o.status === OBJECTIVE_STATUS.ACTIVE).length,
          completed: objectives.filter((o) => o.status === OBJECTIVE_STATUS.COMPLETED).length,
          archived: objectives.filter((o) => o.status === OBJECTIVE_STATUS.ARCHIVED).length,
        },
        byPriority: {
          critical: objectives.filter((o) => o.priority === OBJECTIVE_PRIORITY.CRITICAL).length,
          high: objectives.filter((o) => o.priority === OBJECTIVE_PRIORITY.HIGH).length,
          medium: objectives.filter((o) => o.priority === OBJECTIVE_PRIORITY.MEDIUM).length,
          low: objectives.filter((o) => o.priority === OBJECTIVE_PRIORITY.LOW).length,
        },
      };
    }),

  /**
   * Create new objective
   * USES: nowSql() for timestamps, ctx.user?.id for user ID
   */
  create: scopedProcedure
    .input(createObjectiveSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      try {
        const result = await db.insert(hrObjectives).values({
          organizationId: ctx.scope.organizationId,
          operatingUnitId: ctx.scope.operatingUnitId || null,
          planId: input.planId,
          objectiveCode: input.objectiveCode,
          objectiveNameEn: input.objectiveNameEn,
          objectiveNameAr: input.objectiveNameAr,
          descriptionEn: input.descriptionEn || null,
          descriptionAr: input.descriptionAr || null,
          category: input.category || null,
          priority: input.priority,
          ownerUserId: input.ownerUserId || null,
          ownerName: input.ownerName || null,
          weight: input.weight || 1.0,
          notes: input.notes || null,
          status: OBJECTIVE_STATUS.DRAFT,
          progressPercentage: 0,
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
          message: 'Failed to create objective',
        });
      }
    }),

  /**
   * Update objective
   * USES: buildUpdatePayload() for consistent update pattern
   */
  update: scopedProcedure
    .input(updateObjectiveSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      try {
        const { id, ...updateData } = input;

        await db
          .update(hrObjectives)
          .set(buildUpdatePayload({
            ...updateData,
            updatedBy: ctx.user?.id || null,
          }))
          .where(
            and(
              eq(hrObjectives.id, id),
              ...scopedAndActive(hrObjectives, ctx.scope),
            )
          );

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update objective',
        });
      }
    }),

  /**
   * Change objective status
   * USES: updateObjectiveStatus() database helper
   */
  updateStatus: scopedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        status: z.enum(['draft', 'active', 'completed', 'archived']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      try {
        await updateObjectiveStatus(db, input.id, input.status, ctx.user?.id || 0, ctx.scope);
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update objective status',
        });
      }
    }),

  /**
   * Soft delete objective
   * USES: softDeleteObjective() database helper
   */
  delete: scopedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      try {
        await softDeleteObjective(db, input.id, ctx.user?.id || 0, ctx.scope);
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete objective',
        });
      }
    }),

  /**
   * Restore soft-deleted objective
   * USES: buildUpdatePayload() for consistent restore pattern
   */
  restore: scopedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      try {
        await db
          .update(hrObjectives)
          .set(buildUpdatePayload({
            isDeleted: 0,
            deletedAt: null,
            deletedBy: null,
            updatedBy: ctx.user?.id || null,
          }))
          .where(
            and(
              eq(hrObjectives.id, input.id),
              eq(hrObjectives.organizationId, ctx.scope.organizationId),
            )
          );

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to restore objective',
        });
      }
    }),

  /**
   * Bulk update objectives status
   * USES: inArray() for bulk operations, scopedAndActive() for filtering
   */
  bulkUpdateStatus: scopedProcedure
    .input(
      z.object({
        ids: z.array(z.number().int().positive()),
        status: z.enum(['draft', 'active', 'completed', 'archived']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      try {
        await db
          .update(hrObjectives)
          .set(buildUpdatePayload({
            status: input.status,
            updatedBy: ctx.user?.id || null,
          }))
          .where(
            and(
              inArray(hrObjectives.id, input.ids),
              ...scopedAndActive(hrObjectives, ctx.scope),
            )
          );

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to bulk update objectives',
        });
      }
    }),

  /**
   * Bulk delete objectives
   * USES: buildSoftDeletePayload() for consistent soft-delete pattern
   */
  bulkDelete: scopedProcedure
    .input(z.object({ ids: z.array(z.number().int().positive()) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      try {
        await db
          .update(hrObjectives)
          .set(buildSoftDeletePayload(ctx.user?.id || 0))
          .where(
            and(
              inArray(hrObjectives.id, input.ids),
              ...scopedAndActive(hrObjectives, ctx.scope),
            )
          );

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to bulk delete objectives',
        });
      }
    }),
});
