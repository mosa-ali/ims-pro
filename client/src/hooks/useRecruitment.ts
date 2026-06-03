/**
 * ============================================================================
 * RECRUITMENT MODULE - CUSTOM HOOKS (FINAL PRODUCTION)
 * ============================================================================
 * 
 * Custom React hooks for recruitment data management with tRPC integration.
 * These hooks provide:
 * - Data fetching and caching
 * - Automatic cache invalidation
 * - Toast notifications
 * - Error handling
 * - Loading states
 * 
 * ============================================================================
 */

import { useCallback, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

/**
 * Hook for managing vacancies
 */
export function useVacancies(filters?: {
  status?: string;
  department?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const utils = trpc.useUtils();

  // Fetch vacancies
  const { data: vacancies = [], isLoading, error } = trpc.hrRecruitment.getAllVacancies.useQuery(
    filters,
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  );

  // Create vacancy mutation
  const { mutate: createVacancy, isPending: isCreating } = 
    trpc.hrRecruitment.createVacancy.useMutation({
      onSuccess: () => {
        toast.success('Vacancy created successfully');
        utils.hrRecruitment.getAllVacancies.invalidate();
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to create vacancy');
      },
    });

  // Update vacancy mutation
  const { mutate: updateVacancy, isPending: isUpdating } = 
    trpc.hrRecruitment.updateVacancy.useMutation({
      onSuccess: () => {
        toast.success('Vacancy updated successfully');
        utils.hrRecruitment.getAllVacancies.invalidate();
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to update vacancy');
      },
    });

  // Delete vacancy mutation
  const { mutate: deleteVacancy, isPending: isDeleting } = 
    trpc.hrRecruitment.deleteVacancy.useMutation({
      onSuccess: () => {
        toast.success('Vacancy deleted successfully');
        utils.hrRecruitment.getAllVacancies.invalidate();
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to delete vacancy');
      },
    });

  // Refetch function
  const refetch = useCallback(() => {
    utils.hrRecruitment.getAllVacancies.invalidate();
  }, [utils]);

  return {
    vacancies,
    isLoading,
    error,
    createVacancy,
    updateVacancy,
    deleteVacancy,
    refetch,
    isCreating,
    isUpdating,
    isDeleting,
  };
}

/**
 * Hook for managing candidates
 */
export function useCandidates(filters?: {
  jobId?: number;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const utils = trpc.useUtils();

  // Fetch candidates
  const { data: candidates = [], isLoading, error } = trpc.hrRecruitment.getAllCandidates.useQuery(
    filters,
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  );

  // Create candidate mutation
  const { mutate: createCandidate, isPending: isCreating } = 
    trpc.hrRecruitment.createCandidate.useMutation({
      onSuccess: () => {
        toast.success('Candidate added successfully');
        utils.hrRecruitment.getAllCandidates.invalidate();
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to add candidate');
      },
    });

  // Update candidate status mutation
  const { mutate: updateCandidateStatus, isPending: isUpdating } = 
    trpc.hrRecruitment.updateCandidateStatus.useMutation({
      onSuccess: () => {
        toast.success('Candidate status updated');
        utils.hrRecruitment.getAllCandidates.invalidate();
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to update candidate');
      },
    });

  // Delete candidate mutation
  const { mutate: deleteCandidate, isPending: isDeleting } = 
    trpc.hrRecruitment.deleteCandidate.useMutation({
      onSuccess: () => {
        toast.success('Candidate deleted successfully');
        utils.hrRecruitment.getAllCandidates.invalidate();
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to delete candidate');
      },
    });

  // Refetch function
  const refetch = useCallback(() => {
    utils.hrRecruitment.getAllCandidates.invalidate();
  }, [utils]);

  return {
    candidates,
    isLoading,
    error,
    createCandidate,
    updateCandidateStatus,
    deleteCandidate,
    refetch,
    isCreating,
    isUpdating,
    isDeleting,
  };
}

/**
 * Hook for managing interviews
 */
export function useInterviews(filters?: {
  candidateId?: number;
  jobId?: number;
}) {
  const utils = trpc.useUtils();

  // Create interview mutation
  const { mutate: createInterview, isPending: isCreating } = 
    trpc.hrRecruitment.createInterview.useMutation({
      onSuccess: () => {
        toast.success('Interview scheduled successfully');
        utils.hrRecruitment.getAllCandidates.invalidate();
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to schedule interview');
      },
    });

  // Refetch function
  const refetch = useCallback(() => {
    utils.hrRecruitment.getAllCandidates.invalidate();
  }, [utils]);

  return {
    createInterview,
    refetch,
    isCreating,
  };
}

/**
 * Hook for managing hiring decisions
 */
export function useHiringDecisions(filters?: {
  candidateId?: number;
  jobId?: number;
}) {
  const utils = trpc.useUtils();

  // Create hiring decision mutation
  const { mutate: createHiringDecision, isPending: isCreating } = 
    trpc.hrRecruitment.createHiringDecision.useMutation({
      onSuccess: () => {
        toast.success('Hiring decision created successfully');
        utils.hrRecruitment.getAllCandidates.invalidate();
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to create hiring decision');
      },
    });

  // Refetch function
  const refetch = useCallback(() => {
    utils.hrRecruitment.getAllCandidates.invalidate();
  }, [utils]);

  return {
    createHiringDecision,
    refetch,
    isCreating,
  };
}

/**
 * Hook for fetching recruitment KPIs
 */
export function useRecruitmentKPIs() {
  const { data: kpis, isLoading, error } = trpc.hrRecruitment.getRecruitmentKPIs.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  );

  const utils = trpc.useUtils();

  const refetch = useCallback(() => {
    utils.hrRecruitment.getRecruitmentKPIs.invalidate();
  }, [utils]);

  return {
    kpis: kpis || {
      openVacancies: 0,
      candidatesInPipeline: 0,
      interviewsScheduled: 0,
      positionsFilled: 0,
      averageTimeToHire: 0,
    },
    isLoading,
    error,
    refetch,
  };
}
