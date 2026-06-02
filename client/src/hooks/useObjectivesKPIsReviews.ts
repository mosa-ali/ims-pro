/**
 * ============================================================================
 * OBJECTIVES, KPIs, AND REVIEWS HOOKS
 * ============================================================================
 * 
 * tRPC hooks for managing objectives, KPIs, and plan reviews
 * Provides type-safe queries and mutations for all operations
 * 
 * ============================================================================
 */

import { trpc } from '@/lib/trpc';

/**
 * ============================================================================
 * OBJECTIVES HOOKS
 * ============================================================================
 */

export function useObjectives(planId: number | undefined, options?: any) {
  return trpc.hrObjectives.getAll.useQuery(
    { planId: planId || 0 },
    { enabled: !!planId, ...options }
  );
}

export function useObjective(objectiveId: number | undefined) {
  return trpc.hrObjectives.getById.useQuery(
    { id: objectiveId || 0 },
    { enabled: !!objectiveId }
  );
}

export function useObjectivesByPlanId(planId: number | undefined) {
  return trpc.hrObjectives.getByPlanId.useQuery(
    { planId: planId || 0 },
    { enabled: !!planId }
  );
}

export function useObjectivesStatistics(planId: number | undefined) {
  return trpc.hrObjectives.getStatistics.useQuery(
    { planId: planId || 0 },
    { enabled: !!planId }
  );
}

export function useCreateObjective() {
  const utils = trpc.useUtils();
  return trpc.hrObjectives.create.useMutation({
    onSuccess: () => {
      utils.hrObjectives.getAll.invalidate();
      utils.hrObjectives.getStatistics.invalidate();
    },
  });
}

export function useUpdateObjective() {
  const utils = trpc.useUtils();
  return trpc.hrObjectives.update.useMutation({
    onSuccess: () => {
      utils.hrObjectives.getAll.invalidate();
      utils.hrObjectives.getById.invalidate();
    },
  });
}

export function useUpdateObjectiveStatus() {
  const utils = trpc.useUtils();
  return trpc.hrObjectives.updateStatus.useMutation({
    onSuccess: () => {
      utils.hrObjectives.getAll.invalidate();
      utils.hrObjectives.getStatistics.invalidate();
    },
  });
}

export function useDeleteObjective() {
  const utils = trpc.useUtils();
  return trpc.hrObjectives.delete.useMutation({
    onSuccess: () => {
      utils.hrObjectives.getAll.invalidate();
      utils.hrObjectives.getStatistics.invalidate();
    },
  });
}

export function useRestoreObjective() {
  const utils = trpc.useUtils();
  return trpc.hrObjectives.restore.useMutation({
    onSuccess: () => {
      utils.hrObjectives.getAll.invalidate();
    },
  });
}

export function useBulkUpdateObjectiveStatus() {
  const utils = trpc.useUtils();
  return trpc.hrObjectives.bulkUpdateStatus.useMutation({
    onSuccess: () => {
      utils.hrObjectives.getAll.invalidate();
      utils.hrObjectives.getStatistics.invalidate();
    },
  });
}

export function useBulkDeleteObjectives() {
  const utils = trpc.useUtils();
  return trpc.hrObjectives.bulkDelete.useMutation({
    onSuccess: () => {
      utils.hrObjectives.getAll.invalidate();
      utils.hrObjectives.getStatistics.invalidate();
    },
  });
}

/**
 * ============================================================================
 * KPIs HOOKS
 * ============================================================================
 */

export function useKPIs(objectiveId: number | undefined, options?: any) {
  return trpc.hrKPIs.getAll.useQuery(
    { objectiveId: objectiveId || 0 },
    { enabled: !!objectiveId, ...options }
  );
}

export function useKPI(kpiId: number | undefined) {
  return trpc.hrKPIs.getById.useQuery(
    { id: kpiId || 0 },
    { enabled: !!kpiId }
  );
}

export function useKPIsByObjectiveId(objectiveId: number | undefined) {
  return trpc.hrKPIs.getByObjectiveId.useQuery(
    { objectiveId: objectiveId || 0 },
    { enabled: !!objectiveId }
  );
}

export function useKPIsStatistics(objectiveId: number | undefined) {
  return trpc.hrKPIs.getStatistics.useQuery(
    { objectiveId: objectiveId || 0 },
    { enabled: !!objectiveId }
  );
}

export function useCreateKPI() {
  const utils = trpc.useUtils();
  return trpc.hrKPIs.create.useMutation({
    onSuccess: () => {
      utils.hrKPIs.getAll.invalidate();
      utils.hrKPIs.getStatistics.invalidate();
    },
  });
}

export function useUpdateKPI() {
  const utils = trpc.useUtils();
  return trpc.hrKPIs.update.useMutation({
    onSuccess: () => {
      utils.hrKPIs.getAll.invalidate();
      utils.hrKPIs.getById.invalidate();
    },
  });
}

export function useUpdateKPIProgress() {
  const utils = trpc.useUtils();
  return trpc.hrKPIs.updateProgress.useMutation({
    onSuccess: () => {
      utils.hrKPIs.getAll.invalidate();
      utils.hrKPIs.getById.invalidate();
      utils.hrKPIs.getStatistics.invalidate();
    },
  });
}

export function useUpdateKPIStatus() {
  const utils = trpc.useUtils();
  return trpc.hrKPIs.updateStatus.useMutation({
    onSuccess: () => {
      utils.hrKPIs.getAll.invalidate();
      utils.hrKPIs.getStatistics.invalidate();
    },
  });
}

export function useDeleteKPI() {
  const utils = trpc.useUtils();
  return trpc.hrKPIs.delete.useMutation({
    onSuccess: () => {
      utils.hrKPIs.getAll.invalidate();
      utils.hrKPIs.getStatistics.invalidate();
    },
  });
}

export function useRestoreKPI() {
  const utils = trpc.useUtils();
  return trpc.hrKPIs.restore.useMutation({
    onSuccess: () => {
      utils.hrKPIs.getAll.invalidate();
    },
  });
}

export function useBulkUpdateKPIStatus() {
  const utils = trpc.useUtils();
  return trpc.hrKPIs.bulkUpdateStatus.useMutation({
    onSuccess: () => {
      utils.hrKPIs.getAll.invalidate();
      utils.hrKPIs.getStatistics.invalidate();
    },
  });
}

export function useBulkDeleteKPIs() {
  const utils = trpc.useUtils();
  return trpc.hrKPIs.bulkDelete.useMutation({
    onSuccess: () => {
      utils.hrKPIs.getAll.invalidate();
      utils.hrKPIs.getStatistics.invalidate();
    },
  });
}

/**
 * ============================================================================
 * PLAN REVIEWS HOOKS
 * ============================================================================
 */

export function usePlanReviews(planId: number | undefined, options?: any) {
  return trpc.hrPlanReviews.getAll.useQuery(
    { planId: planId || 0 },
    { enabled: !!planId, ...options }
  );
}

export function usePlanReview(reviewId: number | undefined) {
  return trpc.hrPlanReviews.getById.useQuery(
    { id: reviewId || 0 },
    { enabled: !!reviewId }
  );
}

export function usePlanReviewsByPlanId(planId: number | undefined) {
  return trpc.hrPlanReviews.getByPlanId.useQuery(
    { planId: planId || 0 },
    { enabled: !!planId }
  );
}

export function usePlanReviewsStatistics(planId: number | undefined) {
  return trpc.hrPlanReviews.getStatistics.useQuery(
    { planId: planId || 0 },
    { enabled: !!planId }
  );
}

export function useCreatePlanReview() {
  const utils = trpc.useUtils();
  return trpc.hrPlanReviews.create.useMutation({
    onSuccess: () => {
      utils.hrPlanReviews.getAll.invalidate();
      utils.hrPlanReviews.getStatistics.invalidate();
    },
  });
}

export function useUpdatePlanReview() {
  const utils = trpc.useUtils();
  return trpc.hrPlanReviews.update.useMutation({
    onSuccess: () => {
      utils.hrPlanReviews.getAll.invalidate();
      utils.hrPlanReviews.getById.invalidate();
    },
  });
}

export function useApprovePlanReview() {
  const utils = trpc.useUtils();
  return trpc.hrPlanReviews.approve.useMutation({
    onSuccess: () => {
      utils.hrPlanReviews.getAll.invalidate();
      utils.hrPlanReviews.getById.invalidate();
      utils.hrPlanReviews.getStatistics.invalidate();
    },
  });
}

export function useRejectPlanReview() {
  const utils = trpc.useUtils();
  return trpc.hrPlanReviews.reject.useMutation({
    onSuccess: () => {
      utils.hrPlanReviews.getAll.invalidate();
      utils.hrPlanReviews.getById.invalidate();
      utils.hrPlanReviews.getStatistics.invalidate();
    },
  });
}

export function useAddPlanReviewComment() {
  const utils = trpc.useUtils();
  return trpc.hrPlanReviews.addComment.useMutation({
    onSuccess: () => {
      utils.hrPlanReviews.getAll.invalidate();
      utils.hrPlanReviews.getById.invalidate();
    },
  });
}

export function useDeletePlanReview() {
  const utils = trpc.useUtils();
  return trpc.hrPlanReviews.delete.useMutation({
    onSuccess: () => {
      utils.hrPlanReviews.getAll.invalidate();
      utils.hrPlanReviews.getStatistics.invalidate();
    },
  });
}

export function useRestorePlanReview() {
  const utils = trpc.useUtils();
  return trpc.hrPlanReviews.restore.useMutation({
    onSuccess: () => {
      utils.hrPlanReviews.getAll.invalidate();
    },
  });
}
