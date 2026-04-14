/**
 * ============================================================================
 * MEAL SURVEYS HOOKS - tRPC-Based Backend Integration
 * ============================================================================
 * 
 * Replaces localStorage-based mealService with tRPC backend queries.
 * All data is automatically scoped by organizationId + operatingUnitId.
 * 
 * COMPLIANCE:
 * ✅ No localStorage usage
 * ✅ All queries scoped by backend
 * ✅ Automatic scope enforcement via scopedProcedure
 * ✅ Audit trail tracking (createdBy, updatedBy)
 * ✅ Soft delete enforcement
 * 
 * ============================================================================
 */

import { trpc } from '@/lib/trpc';
import { useCallback } from 'react';

// ============================================================================
// SURVEY HOOKS
// ============================================================================

/**
 * Get all surveys for current organization/OU
 * Automatically scoped by backend via scopedProcedure
 */
export const useGetAllSurveys = (filters?: { projectId?: number; status?: 'draft' | 'published' | 'closed' | 'archived' }) => {
  return trpc.mealSurveys.getAll.useQuery(filters || {});
};

/**
 * Get single survey by ID with scope validation
 * Backend verifies survey belongs to current org/OU
 */
export const useGetSurveyById = (id: number) => {
  return trpc.mealSurveys.getById.useQuery({ id });
};

/**
 * Get survey with all related data (questions + submission count)
 * Single query for efficiency
 */
export const useGetSurveyWithDetails = (id: number) => {
  return trpc.mealSurveys.getWithDetails.useQuery({ id });
};

/**
 * Get survey statistics for dashboard
 * Automatically scoped by backend
 */
export const useGetSurveyStatistics = () => {
  return trpc.mealSurveys.getStatistics.useQuery({});
};

/**
 * Create new survey
 * Automatically sets organizationId, operatingUnitId, createdBy
 */
export const useCreateSurvey = () => {
  const utils = trpc.useUtils();
  
  return trpc.mealSurveys.create.useMutation({
    onSuccess: () => {
      // Invalidate all survey queries to refetch
      utils.mealSurveys.getAll.invalidate();
      utils.mealSurveys.getStatistics.invalidate();
    },
  });
};

/**
 * Update survey
 * Tracks updatedBy automatically
 */
export const useUpdateSurvey = () => {
  const utils = trpc.useUtils();
  
  return trpc.mealSurveys.update.useMutation({
    onSuccess: (_, variables) => {
      // Invalidate specific survey and all surveys
      utils.mealSurveys.getById.invalidate({ id: variables.id });
      utils.mealSurveys.getWithDetails.invalidate({ id: variables.id });
      utils.mealSurveys.getAll.invalidate();
    },
  });
};

/**
 * Delete survey (soft delete)
 * Backend sets isDeleted=true, deletedAt, deletedBy
 */
export const useDeleteSurvey = () => {
  const utils = trpc.useUtils();
  
  return trpc.mealSurveys.delete.useMutation({
    onSuccess: () => {
      // Invalidate all survey queries
      utils.mealSurveys.getAll.invalidate();
      utils.mealSurveys.getStatistics.invalidate();
    },
  });
};

// ============================================================================
// SURVEY QUESTIONS HOOKS
// ============================================================================

/**
 * Get all questions for a survey
 * Automatically scoped by backend
 */
export const useGetSurveyQuestions = (surveyId: number) => {
  return trpc.mealSurveys.questions.getBySurvey.useQuery({ surveyId });
};

/**
 * Create question for survey
 * Automatically sets organizationId, operatingUnitId, createdBy
 */
export const useCreateSurveyQuestion = () => {
  const utils = trpc.useUtils();
  
  return trpc.mealSurveys.questions.create.useMutation({
    onSuccess: (_, variables) => {
      // Invalidate questions for this survey
      utils.mealSurveys.questions.getBySurvey.invalidate({ surveyId: variables.surveyId });
      utils.mealSurveys.getWithDetails.invalidate({ id: variables.surveyId });
    },
  });
};

/**
 * Update question
 * Tracks updatedBy automatically
 */
export const useUpdateSurveyQuestion = () => {
  const utils = trpc.useUtils();
  
  return trpc.mealSurveys.questions.update.useMutation({
    onSuccess: (_, variables) => {
      // Need to invalidate all question queries since we don't know surveyId
      utils.mealSurveys.questions.getBySurvey.invalidate();
    },
  });
};

/**
 * Delete question (soft delete)
 * Backend sets isDeleted=true, deletedAt, deletedBy
 */
export const useDeleteSurveyQuestion = () => {
  const utils = trpc.useUtils();
  
  return trpc.mealSurveys.questions.delete.useMutation({
    onSuccess: () => {
      // Invalidate all question queries
      utils.mealSurveys.questions.getBySurvey.invalidate();
    },
  });
};

/**
 * Update question order (bulk operation)
 * Tracks updatedBy for all questions
 */
export const useUpdateQuestionOrder = () => {
  const utils = trpc.useUtils();
  
  return trpc.mealSurveys.questions.updateOrder.useMutation({
    onSuccess: (_, variables) => {
      // Invalidate questions for this survey
      utils.mealSurveys.questions.getBySurvey.invalidate({ surveyId: variables.surveyId });
    },
  });
};

// ============================================================================
// SURVEY SUBMISSIONS HOOKS
// ============================================================================

/**
 * Get all submissions for a survey
 * Automatically scoped by backend
 */
export const useGetSurveySubmissions = (surveyId: number, validationStatus?: 'pending' | 'approved' | 'rejected') => {
  return trpc.mealSurveys.submissions.getBySurvey.useQuery({ surveyId, validationStatus });
};

/**
 * Get single submission by ID
 * Backend verifies submission belongs to current org/OU
 */
export const useGetSubmissionById = (id: number) => {
  return trpc.mealSurveys.submissions.getById.useQuery({ id });
};

/**
 * Create submission
 * Automatically sets organizationId, operatingUnitId, submittedBy
 */
export const useCreateSubmission = () => {
  const utils = trpc.useUtils();
  
  return trpc.mealSurveys.submissions.create.useMutation({
    onSuccess: (_, variables) => {
      // Invalidate submissions for this survey
      utils.mealSurveys.submissions.getBySurvey.invalidate({ surveyId: variables.surveyId });
      utils.mealSurveys.submissions.getStatistics.invalidate({ surveyId: variables.surveyId });
    },
  });
};

/**
 * Update submission validation status
 * Tracks validatedBy automatically
 */
export const useUpdateSubmissionValidation = () => {
  const utils = trpc.useUtils();
  
  return trpc.mealSurveys.submissions.updateValidation.useMutation({
    onSuccess: (_, variables) => {
      // Invalidate submission and all submissions queries
      utils.mealSurveys.submissions.getById.invalidate({ id: variables.id });
      utils.mealSurveys.submissions.getBySurvey.invalidate();
    },
  });
};

/**
 * Delete submission (soft delete)
 * Backend sets isDeleted=true, deletedAt, deletedBy
 */
export const useDeleteSubmission = () => {
  const utils = trpc.useUtils();
  
  return trpc.mealSurveys.submissions.delete.useMutation({
    onSuccess: () => {
      // Invalidate all submission queries
      utils.mealSurveys.submissions.getBySurvey.invalidate();
    },
  });
};

/**
 * Get submission statistics for a survey
 * Automatically scoped by backend
 */
export const useGetSubmissionStatistics = (surveyId: number) => {
  return trpc.mealSurveys.submissions.getStatistics.useQuery({ surveyId });
};

// ============================================================================
// COMBINED HOOKS FOR COMMON PATTERNS
// ============================================================================

/**
 * Hook for survey form operations (get + create/update)
 * Handles loading, error states, and cache invalidation
 */
export const useSurveyForm = (surveyId?: number) => {
  const getSurvey = useGetSurveyWithDetails(surveyId || 0);
  const createSurvey = useCreateSurvey();
  const updateSurvey = useUpdateSurvey();
  
  return {
    survey: getSurvey.data,
    isLoading: getSurvey.isLoading,
    error: getSurvey.error,
    createSurvey: createSurvey.mutateAsync,
    updateSurvey: updateSurvey.mutateAsync,
    isCreating: createSurvey.isPending,
    isUpdating: updateSurvey.isPending,
  };
};

/**
 * Hook for survey dashboard (list + statistics)
 * Handles loading, error states, and filtering
 */
export const useSurveyDashboard = (filters?: { projectId?: number; status?: 'draft' | 'published' | 'closed' | 'archived' }) => {
  const surveys = useGetAllSurveys(filters);
  const statistics = useGetSurveyStatistics();
  
  return {
    surveys: surveys.data || [],
    statistics: statistics.data,
    isLoading: surveys.isLoading || statistics.isLoading,
    error: surveys.error || statistics.error,
    refetch: () => {
      surveys.refetch();
      statistics.refetch();
    },
  };
};

/**
 * Hook for submission management
 * Handles list, validation, and deletion
 */
export const useSubmissionManagement = (surveyId: number) => {
  const submissions = useGetSurveySubmissions(surveyId);
  const statistics = useGetSubmissionStatistics(surveyId);
  const updateValidation = useUpdateSubmissionValidation();
  const deleteSubmission = useDeleteSubmission();
  
  return {
    submissions: submissions.data || [],
    statistics: statistics.data,
    isLoading: submissions.isLoading || statistics.isLoading,
    updateValidation: updateValidation.mutateAsync,
    deleteSubmission: deleteSubmission.mutateAsync,
    isUpdating: updateValidation.isPending,
    isDeleting: deleteSubmission.isPending,
  };
};

export default {
  // Surveys
  useGetAllSurveys,
  useGetSurveyById,
  useGetSurveyWithDetails,
  useGetSurveyStatistics,
  useCreateSurvey,
  useUpdateSurvey,
  useDeleteSurvey,
  
  // Questions
  useGetSurveyQuestions,
  useCreateSurveyQuestion,
  useUpdateSurveyQuestion,
  useDeleteSurveyQuestion,
  useUpdateQuestionOrder,
  
  // Submissions
  useGetSurveySubmissions,
  useGetSubmissionById,
  useCreateSubmission,
  useUpdateSubmissionValidation,
  useDeleteSubmission,
  useGetSubmissionStatistics,
  
  // Combined
  useSurveyForm,
  useSurveyDashboard,
  useSubmissionManagement,
};
