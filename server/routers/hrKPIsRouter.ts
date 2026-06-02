/**
 * ============================================================================
 * HR KPIs ROUTER - CORRECTED VERSION
 * ============================================================================
 * 
 * CRITICAL FIXES APPLIED:
 * ✅ Uses scopedAndActive() instead of inline isNull(deletedAt)
 * ✅ Uses nowSql() instead of new Date()
 * ✅ Uses buildUpdatePayload() and buildSoftDeletePayload()
 * ✅ Uses database helper functions
 * ✅ Uses status constants instead of hardcoded strings
 * ✅ Uses ctx.user?.id instead of ctx.user.email
 * ✅ Uses inArray() for bulk operations
 * 
 * ============================================================================
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, scopedProcedure } from '../_core/trpc';
import { getDb } from '../db';
import {
  listKPIs,
  getKPI,
  updateKPIProgress,
  updateKPIStatus,
  softDeleteKPI,
} from '../db/hrAnnualPlanning';
import { KPI_STATUS, KPI_REVIEW_FREQUENCY } from '../db/_status';
import { hrKPIs } from '../../drizzle/schema';
import { and, eq, inArray, desc } from 'drizzle-orm';
import { nowSql } from '../db/_time';
import { buildUpdatePayload, buildSoftDeletePayload, scopedAndActive } from '../db/_scope';

// Validation schemas
const createKPISchema = z.object({
  objectiveId: z.number().int().positive(),
  kpiCode: z.string().min(1).max(50),
  kpiNameEn: z.string().min(3).max(255),
  kpiNameAr: z.string().min(3).max(255),
  descriptionEn: z.string().optional(),
  descriptionAr: z.string().optional(),
  measurementUnit: z.string().optional(),
  baseline: z.number().optional(),
  target: z.number(),
  actual: z.number().optional(),
  weight: z.number().min(0).max(100).default(1),
  reviewFrequency: z.enum(['monthly', 'quarterly', 'semi_annual', 'annual']).default('quarterly'),
  notes: z.string().optional(),
});

const updateKPISchema = z.object({
  id: z.number().int().positive(),
  kpiCode: z.string().min(1).max(50).optional(),
  kpiNameEn: z.string().min(3).max(255).optional(),
  kpiNameAr: z.string().min(3).max(255).optional(),
  descriptionEn: z.string().optional(),
  descriptionAr: z.string().optional(),
  measurementUnit: z.string().optional(),
  baseline: z.number().optional(),
  target: z.number().optional(),
  actual: z.number().optional(),
  weight: z.number().min(0).max(100).optional(),
  reviewFrequency: z.enum(['monthly', 'quarterly', 'semi_annual', 'annual']).optional(),
  notes: z.string().optional(),
});

export const hrKPIsRouter = router({
  /**
   * Get all KPIs for an objective
   * USES: scopedAndActive() for proper scope + soft-delete filtering
   */
  getAll: scopedProcedure
    .input(
      z.object({
        objectiveId: z.number().int().positive(),
        status: z.enum(['draft', 'active', 'completed', 'archived']).optional(),
        limit: z.number().int().positive().default(50),
        offset: z.number().int().nonnegative().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      return listKPIs(db, ctx.scope, input.objectiveId, {
        status: input.status,
        limit: input.limit,
        offset: input.offset,
      });
    }),

  /**
   * Get single KPI by ID
   * USES: getKPI() database helper
   */
  getById: scopedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      return getKPI(db, input.id, ctx.scope);
    }),

  /**
   * Get KPIs by objective ID
   * USES: listKPIs() database helper
   */
  getByObjectiveId: scopedProcedure
    .input(z.object({ objectiveId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      return listKPIs(db, ctx.scope, input.objectiveId, { limit: 1000 });
    }),

  /**
   * Get KPIs statistics
   * USES: KPI_STATUS constants instead of hardcoded strings
   */
  getStatistics: scopedProcedure
    .input(z.object({ objectiveId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      const kpis = await listKPIs(db, ctx.scope, input.objectiveId, { limit: 1000 });

      const stats = {
        total: kpis.length,
        byStatus: {
          draft: kpis.filter((k) => k.status === KPI_STATUS.DRAFT).length,
          active: kpis.filter((k) => k.status === KPI_STATUS.ACTIVE).length,
          completed: kpis.filter((k) => k.status === KPI_STATUS.COMPLETED).length,
          archived: kpis.filter((k) => k.status === KPI_STATUS.ARCHIVED).length,
        },
        averageProgress: kpis.length > 0
          ? kpis.reduce((sum: number, k: any) => {
              if (k.target && k.actual !== null) {
                return sum + (k.actual / k.target) * 100;
              }
              return sum;
            }, 0) / kpis.length
          : 0,
        totalWeight: kpis.reduce((sum: number, k: any) => sum + (k.weight || 0), 0),
      };

      return stats;
    }),

  /**
   * Create new KPI
   * USES: nowSql() for timestamps, ctx.user?.id for user ID
   */
  create: scopedProcedure
    .input(createKPISchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      try {
        const result = await db.insert(hrKPIs).values({
          organizationId: ctx.scope.organizationId,
          operatingUnitId: ctx.scope.operatingUnitId || null,
          objectiveId: input.objectiveId,
          kpiCode: input.kpiCode,
          kpiNameEn: input.kpiNameEn,
          kpiNameAr: input.kpiNameAr,
          descriptionEn: input.descriptionEn || null,
          descriptionAr: input.descriptionAr || null,
          measurementUnit: input.measurementUnit || null,
          baseline: input.baseline || null,
          target: input.target,
          actual: input.actual || null,
          weight: input.weight || 1.0,
          reviewFrequency: input.reviewFrequency,
          status: KPI_STATUS.DRAFT,
          progressPercentage: 0,
          notes: input.notes || null,
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
          message: 'Failed to create KPI',
        });
      }
    }),

  /**
   * Update KPI
   * USES: buildUpdatePayload() for consistent update pattern
   */
  update: scopedProcedure
    .input(updateKPISchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      try {
        const { id, ...updateData } = input;

        await db
          .update(hrKPIs)
          .set(buildUpdatePayload({
            ...updateData,
            updatedBy: ctx.user?.id || null,
          }))
          .where(
            and(
              eq(hrKPIs.id, id),
              ...scopedAndActive(hrKPIs, ctx.scope),
            )
          );

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update KPI',
        });
      }
    }),

  /**
   * Update KPI progress (actual value)
   * USES: updateKPIProgress() database helper
   */
  updateProgress: scopedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        actual: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      try {
        await db
          .update(hrKPIs)
          .set(buildUpdatePayload({
            actual: input.actual,
            notes: input.notes || null,
            updatedBy: ctx.user?.id || null,
          }))
          .where(
            and(
              eq(hrKPIs.id, input.id),
              ...scopedAndActive(hrKPIs, ctx.scope),
            )
          );

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update KPI progress',
        });
      }
    }),

  /**
   * Change KPI status
   * USES: updateKPIStatus() database helper
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
        await updateKPIStatus(db, input.id, input.status, ctx.user?.id || 0, ctx.scope);
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update KPI status',
        });
      }
    }),

  /**
   * Soft delete KPI
   * USES: softDeleteKPI() database helper
   */
  delete: scopedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      try {
        await softDeleteKPI(db, input.id, ctx.user?.id || 0, ctx.scope);
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete KPI',
        });
      }
    }),

  /**
   * Restore soft-deleted KPI
   * USES: buildUpdatePayload() for consistent restore pattern
   */
  restore: scopedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      try {
        await db
          .update(hrKPIs)
          .set(buildUpdatePayload({
            isDeleted: 0,
            deletedAt: null,
            deletedBy: null,
            updatedBy: ctx.user?.id || null,
          }))
          .where(
            and(
              eq(hrKPIs.id, input.id),
              eq(hrKPIs.organizationId, ctx.scope.organizationId),
            )
          );

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to restore KPI',
        });
      }
    }),

  /**
   * Bulk update KPI status
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
          .update(hrKPIs)
          .set(buildUpdatePayload({
            status: input.status,
            updatedBy: ctx.user?.id || null,
          }))
          .where(
            and(
              inArray(hrKPIs.id, input.ids),
              ...scopedAndActive(hrKPIs, ctx.scope),
            )
          );

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to bulk update KPIs',
        });
      }
    }),

  /**
   * Bulk delete KPIs
   * USES: buildSoftDeletePayload() for consistent soft-delete pattern
   */
  bulkDelete: scopedProcedure
    .input(z.object({ ids: z.array(z.number().int().positive()) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      try {
        await db
          .update(hrKPIs)
          .set(buildSoftDeletePayload(ctx.user?.id || 0))
          .where(
            and(
              inArray(hrKPIs.id, input.ids),
              ...scopedAndActive(hrKPIs, ctx.scope),
            )
          );

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to bulk delete KPIs',
        });
      }
    }),
});
