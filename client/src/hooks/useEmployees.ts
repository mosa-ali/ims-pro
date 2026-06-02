/**
 * ============================================================================
 * useEmployees Hook - PHASE 1 FRONTEND INTEGRATION
 * ============================================================================
 *
 * Provides a clean React hook interface for HR employee management.
 * Automatically handles organization/operating unit scoping via context.
 *
 * USAGE:
 * const { employees, isLoading, create, update, delete: deleteEmployee } = useEmployees();
 * ============================================================================
 */

import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';

export interface EmployeeFilters {
  status?: 'active' | 'on_leave' | 'suspended' | 'terminated' | 'resigned';
  department?: string;
  employmentType?: 'full_time' | 'part_time' | 'contract' | 'consultant' | 'intern';
  staffCategory?: 'national' | 'international' | 'expatriate';
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateEmployeeInput {
  employeeCode: string;
  firstName: string;
  lastName: string;
  firstNameAr?: string;
  lastNameAr?: string;
  email?: string | null;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  nationality?: string;
  nationalId?: string;
  passportNumber?: string;
  employmentType?: 'full_time' | 'part_time' | 'contract' | 'consultant' | 'intern';
  staffCategory?: 'national' | 'international' | 'expatriate';
  department?: string;
  position?: string;
  jobTitle?: string;
  gradeLevel?: string;
  reportingTo?: number;
  hireDate?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  probationEndDate?: string;
  status?: 'active' | 'on_leave' | 'suspended' | 'terminated' | 'resigned';
  address?: string;
  city?: string;
  country?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIban?: string;
  photoUrl?: string;
  notes?: string;
}

export interface UpdateEmployeeInput extends Partial<CreateEmployeeInput> {
  id: number;
  terminationDate?: string;
}

/**
 * Main hook for employee management
 */
export function useEmployees(filters?: EmployeeFilters) {
  const organizationId = useOrganization();
  const operatingUnitId = useOperatingUnit();

  // Query employees
  const { data: employees = [], isLoading, error, refetch } = trpc.hrEmployees.getAll.useQuery(
    filters ?? {},
    {
      enabled: !!organizationId,
    }
  );

  // Create mutation
  const createMutation = trpc.hrEmployees.create.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  // Update mutation
  const updateMutation = trpc.hrEmployees.update.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  // Delete mutation
  const deleteMutation = trpc.hrEmployees.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  // Restore mutation
  const restoreMutation = trpc.hrEmployees.restore.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  // Count by status
  const { data: statusCounts = {} } = trpc.hrEmployees.countByStatus.useQuery(undefined, {
    enabled: !!organizationId,
  });

  return {
    employees,
    isLoading,
    error,
    statusCounts,
    create: createMutation.mutate,
    createAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    delete: deleteMutation.mutate,
    deleteAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    restore: restoreMutation.mutate,
    restoreAsync: restoreMutation.mutateAsync,
    isRestoring: restoreMutation.isPending,
    refetch,
  };
}

/**
 * Hook for getting a single employee by ID
 */
export function useEmployee(employeeId: number) {
  const organizationId = useOrganization();

  const { data: employee, isLoading, error, refetch } = trpc.hrEmployees.getById.useQuery(
    { id: employeeId },
    {
      enabled: !!organizationId && !!employeeId,
    }
  );

  return {
    employee,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook for creating a new employee
 */
export function useCreateEmployee() {
  const utils = trpc.useUtils();

  const mutation = trpc.hrEmployees.create.useMutation({
    onSuccess: () => {
      utils.hrEmployees.getAll.invalidate();
      utils.hrEmployees.countByStatus.invalidate();
    },
  });

  return {
    create: mutation.mutate,
    createAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook for updating an employee
 */
export function useUpdateEmployee() {
  const utils = trpc.useUtils();

  const mutation = trpc.hrEmployees.update.useMutation({
    onSuccess: () => {
      utils.hrEmployees.getAll.invalidate();
      utils.hrEmployees.getById.invalidate();
      utils.hrEmployees.countByStatus.invalidate();
    },
  });

  return {
    update: mutation.mutate,
    updateAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook for deleting an employee
 */
export function useDeleteEmployee() {
  const utils = trpc.useUtils();

  const mutation = trpc.hrEmployees.delete.useMutation({
    onSuccess: () => {
      utils.hrEmployees.getAll.invalidate();
      utils.hrEmployees.countByStatus.invalidate();
    },
  });

  return {
    delete: mutation.mutate,
    deleteAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}