/**
 * ============================================================================
 * db/hrAnnualPlanning.ts — HR Annual Planning Query Helpers
 * ============================================================================
 * 
 * Reusable query helpers for the HR Annual Planning module.
 * 
 * Standards:
 *  - All timestamps use nowSql() — never sql`NOW()`
 *  - All status values use constants — never hardcoded strings
 *  - All queries use scopedAndActive() — never inline eq(organizationId, ...)
 *  - Soft deletes use buildSoftDeletePayload() — never inline isDeleted=1
 *  - db parameter typed as DB — never `db: any`
 * 
 * ============================================================================
 */

import { and, eq, isNull, desc, like, or, count } from 'drizzle-orm';
import {
  hrAnnualPlans,
  hrObjectives,
  hrKPIs,
  hrPlanReviews,
} from '../../drizzle/schema';
import type { DB, ScopeContext } from './_scope';
import {
  scopedAndActive,
  withScope,
  buildUpdatePayload,
  buildSoftDeletePayload,
  buildRestorePayload,
} from './_scope';
import { nowSql } from './_time';
import {
  ANNUAL_PLAN_STATUS,
  OBJECTIVE_STATUS,
  KPI_STATUS,
  PLAN_REVIEW_STATUS,
  type AnnualPlanStatus,
  type ObjectiveStatus,
  type KpiStatus,
  type PlanReviewStatus,
} from './_status';

// ============================================================================
// ANNUAL PLANS
// ============================================================================

/**
 * List annual plans for a given scope with optional filters.
 */
export async function listAnnualPlans(
  db: DB,
  ctx: ScopeContext,
  options: { year?: number; status?: AnnualPlanStatus | 'all'; searchTerm?: string; limit?: number; offset?: number } = {}
) {
  const { year, status, searchTerm, limit = 50, offset = 0 } = options;
  const conditions = scopedAndActive(hrAnnualPlans, ctx);

  if (year) {
    conditions.push(eq(hrAnnualPlans.planYear, year));
  }

  if (status && status !== 'all') {
    conditions.push(eq(hrAnnualPlans.status, status));
  }

  if (searchTerm) {
    conditions.push(
      or(
        like(hrAnnualPlans.planName, `%${searchTerm}%`)
      )!
    );
  }

  return db
    .select()
    .from(hrAnnualPlans)
    .where(and(...conditions))
    .orderBy(desc(hrAnnualPlans.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Get a single annual plan by ID with scope validation.
 */
export async function getAnnualPlan(db: DB, planId: number, ctx: ScopeContext) {
  const [plan] = await db
    .select()
    .from(hrAnnualPlans)
    .where(and(
      eq(hrAnnualPlans.id, planId),
      ...scopedAndActive(hrAnnualPlans, ctx),
    ))
    .limit(1);
  return plan ?? null;
}

/**
 * Update annual plan status.
 */
export async function updateAnnualPlanStatus(
  db: DB,
  planId: number,
  status: AnnualPlanStatus,
  updatedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(hrAnnualPlans)
    .set(buildUpdatePayload({ status, updatedBy }))
    .where(and(
      eq(hrAnnualPlans.id, planId),
      ...scopedAndActive(hrAnnualPlans, ctx),
    ));
}

/**
 * Soft-delete an annual plan.
 */
export async function softDeleteAnnualPlan(
  db: DB,
  planId: number,
  userId: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(hrAnnualPlans)
    .set(buildSoftDeletePayload(userId))
    .where(and(
      eq(hrAnnualPlans.id, planId),
      ...scopedAndActive(hrAnnualPlans, ctx),
    ));
}

/**
 * Restore a soft-deleted annual plan.
 */
export async function restoreAnnualPlan(
  db: DB,
  planId: number,
  updatedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(hrAnnualPlans)
    .set(buildRestorePayload())
    .where(and(
      eq(hrAnnualPlans.id, planId),
      ...withScope(hrAnnualPlans, ctx),
    ));
}

// ============================================================================
// OBJECTIVES
// ============================================================================

/**
 * List objectives for a given plan.
 */
export async function listObjectives(
  db: DB,
  ctx: ScopeContext,
  planId: number,
  options: { status?: ObjectiveStatus | 'all'; limit?: number; offset?: number } = {}
) {
  const { status, limit = 50, offset = 0 } = options;
  const conditions = scopedAndActive(hrObjectives, ctx);
  conditions.push(eq(hrObjectives.planId, planId));

  if (status && status !== 'all') {
    conditions.push(eq(hrObjectives.status, status));
  }

  return db
    .select()
    .from(hrObjectives)
    .where(and(...conditions))
    .orderBy(desc(hrObjectives.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Get a single objective by ID.
 */
export async function getObjective(db: DB, objectiveId: number, ctx: ScopeContext) {
  const [objective] = await db
    .select()
    .from(hrObjectives)
    .where(and(
      eq(hrObjectives.id, objectiveId),
      ...scopedAndActive(hrObjectives, ctx),
    ))
    .limit(1);
  return objective ?? null;
}

/**
 * Update objective status.
 */
export async function updateObjectiveStatus(
  db: DB,
  objectiveId: number,
  status: ObjectiveStatus,
  updatedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(hrObjectives)
    .set(buildUpdatePayload({ status, updatedBy }))
    .where(and(
      eq(hrObjectives.id, objectiveId),
      ...scopedAndActive(hrObjectives, ctx),
    ));
}

/**
 * Soft-delete an objective.
 */
export async function softDeleteObjective(
  db: DB,
  objectiveId: number,
  userId: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(hrObjectives)
    .set(buildSoftDeletePayload(userId))
    .where(and(
      eq(hrObjectives.id, objectiveId),
      ...scopedAndActive(hrObjectives, ctx),
    ));
}

// ============================================================================
// KPIs
// ============================================================================

/**
 * List KPIs for a given objective.
 */
export async function listKPIs(
  db: DB,
  ctx: ScopeContext,
  objectiveId: number,
  options: { status?: KpiStatus | 'all'; limit?: number; offset?: number } = {}
) {
  const { status, limit = 50, offset = 0 } = options;
  const conditions = scopedAndActive(hrKPIs, ctx);
  conditions.push(eq(hrKPIs.objectiveId, objectiveId));

  if (status && status !== 'all') {
    conditions.push(eq(hrKPIs.status, status));
  }

  return db
    .select()
    .from(hrKPIs)
    .where(and(...conditions))
    .orderBy(desc(hrKPIs.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Get a single KPI by ID.
 */
export async function getKPI(db: DB, kpiId: number, ctx: ScopeContext) {
  const [kpi] = await db
    .select()
    .from(hrKPIs)
    .where(and(
      eq(hrKPIs.id, kpiId),
      ...scopedAndActive(hrKPIs, ctx),
    ))
    .limit(1);
  return kpi ?? null;
}

/**
 * Update KPI progress (actual value).
 */
export async function updateKPIProgress(
  db: DB,
  kpiId: number,
  actual: number,
  updatedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(hrKPIs)
    .set(buildUpdatePayload({ actual, updatedBy }))
    .where(and(
      eq(hrKPIs.id, kpiId),
      ...scopedAndActive(hrKPIs, ctx),
    ));
}

/**
 * Update KPI status.
 */
export async function updateKPIStatus(
  db: DB,
  kpiId: number,
  status: KpiStatus,
  updatedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(hrKPIs)
    .set(buildUpdatePayload({ status, updatedBy }))
    .where(and(
      eq(hrKPIs.id, kpiId),
      ...scopedAndActive(hrKPIs, ctx),
    ));
}

/**
 * Soft-delete a KPI.
 */
export async function softDeleteKPI(
  db: DB,
  kpiId: number,
  userId: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(hrKPIs)
    .set(buildSoftDeletePayload(userId))
    .where(and(
      eq(hrKPIs.id, kpiId),
      ...scopedAndActive(hrKPIs, ctx),
    ));
}

// ============================================================================
// PLAN REVIEWS
// ============================================================================

/**
 * List reviews for a given plan.
 */
export async function listPlanReviews(
  db: DB,
  ctx: ScopeContext,
  planId: number,
  options: { reviewStatus?: PlanReviewStatus | 'all'; limit?: number; offset?: number } = {}
) {
  const { reviewStatus, limit = 50, offset = 0 } = options;
  const conditions = scopedAndActive(hrPlanReviews, ctx);
  conditions.push(eq(hrPlanReviews.planId, planId));

  if (reviewStatus && reviewStatus !== 'all') {
    conditions.push(eq(hrPlanReviews.reviewStatus, reviewStatus));
  }

  return db
    .select()
    .from(hrPlanReviews)
    .where(and(...conditions))
    .orderBy(desc(hrPlanReviews.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Get a single plan review by ID.
 */
export async function getPlanReview(db: DB, reviewId: number, ctx: ScopeContext) {
  const [review] = await db
    .select()
    .from(hrPlanReviews)
    .where(and(
      eq(hrPlanReviews.id, reviewId),
      ...scopedAndActive(hrPlanReviews, ctx),
    ))
    .limit(1);
  return review ?? null;
}

/**
 * Update plan review status.
 */
export async function updatePlanReviewStatus(
  db: DB,
  reviewId: number,
  reviewStatus: PlanReviewStatus,
  updatedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(hrPlanReviews)
    .set(buildUpdatePayload({ reviewStatus, updatedBy }))
    .where(and(
      eq(hrPlanReviews.id, reviewId),
      ...scopedAndActive(hrPlanReviews, ctx),
    ));
}

/**
 * Approve a plan review.
 */
export async function approvePlanReview(
  db: DB,
  reviewId: number,
  updatedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(hrPlanReviews)
    .set(buildUpdatePayload({
      reviewStatus: PLAN_REVIEW_STATUS.APPROVED,
      approvedAt: nowSql(),
      updatedBy,
    }))
    .where(and(
      eq(hrPlanReviews.id, reviewId),
      ...scopedAndActive(hrPlanReviews, ctx),
    ));
}

/**
 * Reject a plan review.
 */
export async function rejectPlanReview(
  db: DB,
  reviewId: number,
  rejectionReason: string,
  updatedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(hrPlanReviews)
    .set(buildUpdatePayload({
      reviewStatus: PLAN_REVIEW_STATUS.REJECTED,
      rejectedAt: nowSql(),
      rejectionReason,
      updatedBy,
    }))
    .where(and(
      eq(hrPlanReviews.id, reviewId),
      ...scopedAndActive(hrPlanReviews, ctx),
    ));
}

/**
 * Soft-delete a plan review.
 */
export async function softDeletePlanReview(
  db: DB,
  reviewId: number,
  userId: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(hrPlanReviews)
    .set(buildSoftDeletePayload(userId))
    .where(and(
      eq(hrPlanReviews.id, reviewId),
      ...scopedAndActive(hrPlanReviews, ctx),
    ));
}
