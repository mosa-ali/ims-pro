import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * Hook for fetching all annual plans
 */
export function useAnnualPlans(filters?: {
  planYear?: number;
  status?: "draft" | "pending_review" | "pending_approval" | "approved" | "rejected";
}) {
  const { user } = useAuth();

  const query = trpc.hrAnnualPlan.getAll.useQuery(
    filters || {},
    {
      enabled: !!user,
    }
  );

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

/**
 * Hook for fetching a single annual plan
 */
export function useAnnualPlan(id?: number) {
  const { user } = useAuth();

  const query = trpc.hrAnnualPlan.getById.useQuery(
    { id: id || 0 },
    {
      enabled: !!user && !!id,
    }
  );

  return {
    data: query.data || null,
    isLoading: query.isLoading,
    error: query.error,
  };
}

/**
 * Hook for fetching annual plan by year
 */
export function useAnnualPlanByYear(planYear?: number) {
  const { user } = useAuth();

  const query = trpc.hrAnnualPlan.getByYear.useQuery(
    { planYear: planYear || 0 },
    {
      enabled: !!user && !!planYear,
    }
  );

  return {
    data: query.data || null,
    isLoading: query.isLoading,
    error: query.error,
  };
}

/**
 * Hook for fetching annual plan statistics
 */
export function useAnnualPlanStatistics() {
  const { user } = useAuth();

  const query = trpc.hrAnnualPlan.getStatistics.useQuery(
    {},
    {
      enabled: !!user,
    }
  );

  return {
    data: query.data || {
      total: 0,
      byStatus: {
        draft: 0,
        pendingReview: 0,
        pendingApproval: 0,
        approved: 0,
        rejected: 0,
      },
      years: [],
      totalEstimatedCost: 0,
    },
    isLoading: query.isLoading,
    error: query.error,
  };
}

/**
 * Hook for creating a new annual plan
 */
export function useCreateAnnualPlan() {
  const utils = trpc.useUtils();

  const mutation = trpc.hrAnnualPlan.create.useMutation({
    onSuccess: () => {
      utils.hrAnnualPlan.getAll.invalidate();
      utils.hrAnnualPlan.getStatistics.invalidate();
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook for updating an annual plan
 */
export function useUpdateAnnualPlan() {
  const utils = trpc.useUtils();

  const mutation = trpc.hrAnnualPlan.update.useMutation({
    onSuccess: () => {
      utils.hrAnnualPlan.getAll.invalidate();
      utils.hrAnnualPlan.getById.invalidate();
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook for submitting annual plan for review
 */
export function useSubmitAnnualPlanForReview() {
  const utils = trpc.useUtils();

  const mutation = trpc.hrAnnualPlan.submitForReview.useMutation({
    onSuccess: () => {
      utils.hrAnnualPlan.getAll.invalidate();
      utils.hrAnnualPlan.getById.invalidate();
      utils.hrAnnualPlan.getStatistics.invalidate();
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook for completing annual plan review
 */
export function useCompleteAnnualPlanReview() {
  const utils = trpc.useUtils();

  const mutation = trpc.hrAnnualPlan.completeReview.useMutation({
    onSuccess: () => {
      utils.hrAnnualPlan.getAll.invalidate();
      utils.hrAnnualPlan.getById.invalidate();
      utils.hrAnnualPlan.getStatistics.invalidate();
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook for approving an annual plan
 */
export function useApproveAnnualPlan() {
  const utils = trpc.useUtils();

  const mutation = trpc.hrAnnualPlan.approve.useMutation({
    onSuccess: () => {
      utils.hrAnnualPlan.getAll.invalidate();
      utils.hrAnnualPlan.getById.invalidate();
      utils.hrAnnualPlan.getStatistics.invalidate();
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook for rejecting an annual plan
 */
export function useRejectAnnualPlan() {
  const utils = trpc.useUtils();

  const mutation = trpc.hrAnnualPlan.reject.useMutation({
    onSuccess: () => {
      utils.hrAnnualPlan.getAll.invalidate();
      utils.hrAnnualPlan.getById.invalidate();
      utils.hrAnnualPlan.getStatistics.invalidate();
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook for reverting annual plan to draft
 */
export function useRevertAnnualPlanToDraft() {
  const utils = trpc.useUtils();

  const mutation = trpc.hrAnnualPlan.revertToDraft.useMutation({
    onSuccess: () => {
      utils.hrAnnualPlan.getAll.invalidate();
      utils.hrAnnualPlan.getById.invalidate();
      utils.hrAnnualPlan.getStatistics.invalidate();
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook for deleting an annual plan (soft delete)
 */
export function useDeleteAnnualPlan() {
  const utils = trpc.useUtils();

  const mutation = trpc.hrAnnualPlan.delete.useMutation({
    onSuccess: () => {
      utils.hrAnnualPlan.getAll.invalidate();
      utils.hrAnnualPlan.getStatistics.invalidate();
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
