import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * ============================================================================
 * PAYROLL MANAGEMENT HOOKS - PHASE 3 PRODUCTION-READY IMPLEMENTATION
 * ============================================================================
 *
 * All hooks use tRPC mutations and queries with proper error handling,
 * loading states, and automatic cache invalidation.
 *
 * Data Isolation: All procedures use scopedProcedure (automatic org/ou scoping)
 * ============================================================================
 */

// ============================================================================
// PAYROLL RECORDS HOOKS
// ============================================================================

/**
 * Hook for fetching all payroll records with filters
 */
export function usePayrollRecords(filters?: {
  employeeId?: number;
  status?: "draft" | "pending_approval" | "approved" | "paid" | "cancelled";
  payrollMonth?: number;
  payrollYear?: number;
  limit?: number;
  offset?: number;
}) {
  const { data, isLoading, error } = trpc.hrPayroll.getAll.useQuery(filters || {});

  return {
    records: data || [],
    isLoading,
    error,
  };
}

/**
 * Hook for fetching a single payroll record
 */
export function usePayrollRecord(id: number) {
  const { data, isLoading, error } = trpc.hrPayroll.getById.useQuery({ id });

  return {
    record: data || null,
    isLoading,
    error,
  };
}

/**
 * Hook for fetching payroll statistics
 */
export function usePayrollStatistics(payrollYear: number, payrollMonth?: number) {
  const { data, isLoading, error } = trpc.hrPayroll.getStatistics.useQuery({
    payrollYear,
    ...(payrollMonth && { payrollMonth }),
  });

  return {
    statistics: data,
    isLoading,
    error,
  };
}

/**
 * Hook for creating a new payroll record
 */
export function useCreatePayroll() {
  const utils = trpc.useUtils();

  const mutation = trpc.hrPayroll.create.useMutation({
    onSuccess: () => {
      // Invalidate all payroll queries
      utils.hrPayroll.getAll.invalidate();
      utils.hrPayroll.getStatistics.invalidate();
    },
  });

  return {
    createPayroll: mutation.mutate,
    createPayrollAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook for updating a payroll record (draft only)
 */
export function useUpdatePayroll() {
  const utils = trpc.useUtils();

  const mutation = trpc.hrPayroll.update.useMutation({
    onSuccess: () => {
      utils.hrPayroll.getAll.invalidate();
      utils.hrPayroll.getById.invalidate();
      utils.hrPayroll.getStatistics.invalidate();
    },
  });

  return {
    updatePayroll: mutation.mutate,
    updatePayrollAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook for submitting payroll for approval
 */
export function useSubmitPayrollForApproval() {
  const utils = trpc.useUtils();

  const mutation = trpc.hrPayroll.submitForApproval.useMutation({
    onSuccess: () => {
      utils.hrPayroll.getAll.invalidate();
      utils.hrPayroll.getById.invalidate();
      utils.hrPayroll.getStatistics.invalidate();
    },
  });

  return {
    submitForApproval: mutation.mutate,
    submitForApprovalAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook for approving a payroll record
 */
export function useApprovePayroll() {
  const utils = trpc.useUtils();

  const mutation = trpc.hrPayroll.approve.useMutation({
    onSuccess: () => {
      utils.hrPayroll.getAll.invalidate();
      utils.hrPayroll.getById.invalidate();
      utils.hrPayroll.getStatistics.invalidate();
    },
  });

  return {
    approvePayroll: mutation.mutate,
    approvePayrollAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook for rejecting/cancelling a payroll record
 */
export function useCancelPayroll() {
  const utils = trpc.useUtils();

  const mutation = trpc.hrPayroll.cancel.useMutation({
    onSuccess: () => {
      utils.hrPayroll.getAll.invalidate();
      utils.hrPayroll.getById.invalidate();
      utils.hrPayroll.getStatistics.invalidate();
    },
  });

  return {
    cancelPayroll: mutation.mutate,
    cancelPayrollAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook for marking payroll as paid
 */
export function useMarkPayrollAsPaid() {
  const utils = trpc.useUtils();

  const mutation = trpc.hrPayroll.markAsPaid.useMutation({
    onSuccess: () => {
      utils.hrPayroll.getAll.invalidate();
      utils.hrPayroll.getById.invalidate();
      utils.hrPayroll.getStatistics.invalidate();
    },
  });

  return {
    markAsPaid: mutation.mutate,
    markAsPaidAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook for deleting a payroll record (soft delete)
 */
export function useDeletePayroll() {
  const utils = trpc.useUtils();

  const mutation = trpc.hrPayroll.delete.useMutation({
    onSuccess: () => {
      utils.hrPayroll.getAll.invalidate();
      utils.hrPayroll.getStatistics.invalidate();
    },
  });

  return {
    deletePayroll: mutation.mutate,
    deletePayrollAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

// ============================================================================
// SALARY GRADES HOOKS
// ============================================================================

/**
 * Hook for fetching all salary grades
 */
export function useSalaryGrades(filters?: { limit?: number; offset?: number }) {
  const { data, isLoading, error } = trpc.hrPayroll.getSalaryGrades.useQuery(filters || {});

  return {
    grades: data || [],
    isLoading,
    error,
  };
}

/**
 * Hook for fetching a single salary grade
 */
export function useSalaryGrade(id: number) {
  const { data, isLoading, error } = trpc.hrPayroll.getSalaryGradeById.useQuery({ id });

  return {
    grade: data || null,
    isLoading,
    error,
  };
}

/**
 * Hook for fetching salary grade by code
 */
export function useSalaryGradeByCode(code: string) {
  const { data, isLoading, error } = trpc.hrPayroll.getByGradeCode.useQuery({ code });

  return {
    grade: data || null,
    isLoading,
    error,
  };
}

// ============================================================================
// PAYROLL GENERATION HOOKS
// ============================================================================

/**
 * Hook for generating payroll from salary scale
 */
export function useGeneratePayrollFromSalaryScale() {
  const utils = trpc.useUtils();

  const mutation = trpc.hrPayroll.generateFromSalaryScale.useMutation({
    onSuccess: () => {
      utils.hrPayroll.getAll.invalidate();
      utils.hrPayroll.getStatistics.invalidate();
    },
  });

  return {
    generatePayroll: mutation.mutate,
    generatePayrollAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook for validating payroll generation readiness
 */
export function useValidatePayrollGeneration() {
  const { data, isLoading, error } = trpc.hrPayroll.validateGeneration.useQuery({});

  return {
    validation: data,
    isLoading,
    error,
    canGenerate: data?.canGenerate || false,
  };
}
