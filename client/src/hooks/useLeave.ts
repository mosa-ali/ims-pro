import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

/**
 * Leave Request Status type
 */
export type LeaveRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

/**
 * Leave Type
 */
export type LeaveType = "annual" | "sick" | "maternity" | "paternity" | "unpaid" | "compassionate" | "study" | "other";

/**
 * Hook for managing leave requests
 * Automatically injects scope from organization/operating unit context
 */
export function useLeaveRequests(filters?: {
  status?: LeaveRequestStatus;
  leaveType?: LeaveType;
  employeeId?: number;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}) {
  const { user } = useAuth();

  const query = trpc.hrLeave.getRequests.useQuery(
    {
      status: filters?.status,
      leaveType: filters?.leaveType,
      employeeId: filters?.employeeId,
      limit: filters?.limit || 50,
      offset: filters?.offset || 0,
    },
    {
      enabled: !!user,
    }
  );

  const mappedData = (query.data || []).map((item: any) => ({
    ...item,
    staffId: item.employeeCode || 'N/A',
    staffName: item.employeeName || 'Unknown',
    position: item.position || 'N/A',
    department: item.department || 'N/A',
  }));

  return {
    data: mappedData,
    isLoading: query.isLoading,
    error: query.error,
    isError: query.isError,
    refetch: query.refetch,
  };
}

/**
 * Hook for getting a single leave request
 */
export function useLeaveRequest(id?: number) {
  const { user } = useAuth();

  const query = trpc.hrLeave.getById.useQuery(
    { id: id || 0 },
    {
      enabled: !!user && !!id,
    }
  );

  return {
    request: query.data,
    isLoading: query.isLoading,
    error: query.error,
    isError: query.isError,
  };
}

/**
 * Hook for getting leave requests by employee
 */
export function useEmployeeLeaveRequests(employeeId?: number, limit = 50, offset = 0) {
  const { user } = useAuth();

  const query = trpc.hrLeave.getRequests.useQuery(
    {
      employeeId: employeeId || 0,
      limit,
      offset,
    },
    {
      enabled: !!user && !!employeeId,
    }
  );

  return {
    requests: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    isError: query.isError,
  };
}

/**
 * Hook for counting leave requests by status
 */
export function useLeaveRequestCounts() {
  const { user } = useAuth();

  const query = trpc.hrLeave.getStatistics.useQuery(
    { year: new Date().getFullYear() },
    {
      enabled: !!user,
    }
  );

  const stats = query.data;
  const flattened = {
    pending: stats?.byStatus?.pending || 0,
    approved: stats?.byStatus?.approved || 0,
    rejected: stats?.byStatus?.rejected || 0,
    cancelled: stats?.byStatus?.cancelled || 0,
    total: stats?.total || 0,
  };

  return {
    data: flattened,
    isLoading: query.isLoading,
    error: query.error,
  };
}

/**
 * Hook for creating leave request
 */
export function useCreateLeaveRequest() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const mutation = trpc.hrLeave.create.useMutation({
    onSuccess: () => {
      utils.hrLeave.getAll.invalidate();
      utils.hrLeave.getStatistics.invalidate();
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
 * Hook for updating leave request
 */
export function useUpdateLeaveRequest() {
  const utils = trpc.useUtils();

  const mutation = trpc.hrLeave.update.useMutation({
    onSuccess: () => {
      utils.hrLeave.getAll.invalidate();
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
 * Hook for approving leave request
 */
export function useApproveLeaveRequest() {
  const utils = trpc.useUtils();

  const mutation = trpc.hrLeave.approve.useMutation({
    onSuccess: () => {
      utils.hrLeave.getAll.invalidate();
      utils.hrLeave.getStatistics.invalidate({ year: new Date().getFullYear() });
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
 * Hook for rejecting leave request
 */
export function useRejectLeaveRequest() {
  const utils = trpc.useUtils();

  const mutation = trpc.hrLeave.reject.useMutation({
    onSuccess: () => {
      utils.hrLeave.getAll.invalidate();
      utils.hrLeave.getStatistics.invalidate({ year: new Date().getFullYear() });
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
 * Hook for cancelling leave request
 */
export function useDeleteLeaveRequest() {
  const utils = trpc.useUtils();

  const mutation = trpc.hrLeave.cancel.useMutation({
    onSuccess: () => {
      utils.hrLeave.getAll.invalidate();
      utils.hrLeave.getStatistics.invalidate();
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
 * Hook for permanently deleting leave request (soft delete)
 */
export function useDeleteLeaveRequestPermanent() {
  const utils = trpc.useUtils();

  const mutation = trpc.hrLeave.delete.useMutation({
    onSuccess: () => {
      utils.hrLeave.getAll.invalidate();
    },
  });

  return {
    deleteRequest: mutation.mutate,
    deleteRequestAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook for getting leave balances
 */
export function useLeaveBalances(filters?: {
  year?: number;
  leaveType?: LeaveType;
  employeeId?: number;
  limit?: number;
  offset?: number;
}) {
  const { user } = useAuth();

  const query = trpc.hrLeave.getBalances.useQuery(
    {
      year: filters?.year,
      leaveType: filters?.leaveType,
      employeeId: filters?.employeeId,
      limit: filters?.limit,
      offset: filters?.offset,
    },
    {
      enabled: !!user,
    }
  );

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    isError: query.isError,
    refetch: query.refetch,
  };
}

/**
 * Hook for setting/updating leave balance
 */
export function useSetLeaveBalance() {
  const utils = trpc.useUtils();

  const mutation = trpc.hrLeave.setBalance.useMutation({
    onSuccess: () => {
      utils.hrLeave.getBalances.invalidate();
    },
  });

  return {
    setBalance: mutation.mutate,
    setBalanceAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Deprecated: Hook for getting a single leave balance
 * Note: Use useLeaveBalances() instead for comprehensive balance data
 */
export function useLeaveBalance(id?: number) {
  return {
    balance: null,
    isLoading: false,
    error: null,
    isError: false,
  };
}

/**
 * Deprecated: Hook for getting employee leave balance for specific year and type
 * Note: Filter results from useLeaveBalances() instead
 */
export function useEmployeeLeaveBalance(
  employeeId?: number,
  year?: number,
  leaveType?: LeaveType
) {
  return {
    balance: null,
    isLoading: false,
    error: null,
    isError: false,
  };
}

/**
 * Deprecated: Hook for getting employee leave summary
 * Note: Compute from useLeaveBalances() results instead
 */
export function useEmployeeLeaveSummary(employeeId?: number, year?: number) {
  return {
    summary: null,
    isLoading: false,
    error: null,
  };
}

/**
 * Deprecated: Hook for getting organization-wide leave summary
 * Note: Compute from useLeaveBalances() results instead
 */
export function useOrganizationLeaveSummary(year?: number) {
  return {
    summary: null,
    isLoading: false,
    error: null,
  };
}

/**
 * Deprecated: Hook for updating leave balance
 * Note: Use useSetLeaveBalance() instead
 */
export function useUpdateLeaveBalance() {
  const utils = trpc.useUtils();

  const mutation = trpc.hrLeave.setBalance.useMutation({
    onSuccess: () => {
      utils.hrLeave.getBalances.invalidate();
    },
  });

  return {
    updateBalance: mutation.mutate,
    updateBalanceAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Deprecated: Hook for resetting annual leave balance
 * Note: This procedure does not exist in hrLeaveRouter
 */
export function useResetAnnualBalance() {
  return {
    resetBalance: () => {},
    resetBalanceAsync: async () => {},
    isLoading: false,
    error: null,
  };
}

/**
 * Deprecated: Hook for deleting leave balance
 * Note: This procedure does not exist in hrLeaveRouter
 */
export function useDeleteLeaveBalance() {
  return {
    deleteBalance: () => {},
    deleteBalanceAsync: async () => {},
    isLoading: false,
    error: null,
  };
}

/**
 * Deprecated: Hook for restoring leave balance
 * Note: This procedure does not exist in hrLeaveRouter
 */
export function useRestoreLeaveBalance() {
  return {
    restoreBalance: () => {},
    restoreBalanceAsync: async () => {},
    isLoading: false,
    error: null,
  };
}
