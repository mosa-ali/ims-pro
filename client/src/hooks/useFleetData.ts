/**
 * Custom Hooks for Fleet Management Data Integration
 * Provides convenient hooks for accessing fleet data with caching and error handling
 */

import { useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

// ============================================================================
// VEHICLE HOOKS
// ============================================================================

/**
 * Hook to fetch vehicle detail with caching
 */
export function useVehicleDetail(vehicleId: string) {
  const { data, isLoading, error, refetch } = trpc.fleet.vehicle.getDetail.useQuery(
    { vehicleId },
    {
      enabled: !!vehicleId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  return {
    vehicle: data,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to fetch vehicle statistics
 */
export function useVehicleStatistics(vehicleId: string) {
  const { data, isLoading, error } = trpc.fleet.vehicle.getStatistics.useQuery(
    { vehicleId },
    {
      enabled: !!vehicleId,
      staleTime: 5 * 60 * 1000,
    }
  );

  return {
    statistics: data,
    isLoading,
    error,
  };
}

/**
 * Hook to fetch vehicle audit trail with pagination
 */
export function useVehicleAuditTrail(vehicleId: string, limit = 50, offset = 0) {
  const { data, isLoading, error, fetchNextPage, hasNextPage } = trpc.fleet.vehicle.getAuditTrail.useInfiniteQuery(
    { vehicleId, limit },
    {
      enabled: !!vehicleId,
      getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.offset + limit : undefined),
    }
  );

  const allLogs = useMemo(() => {
    return data?.pages.flatMap((page) => page.logs) ?? [];
  }, [data]);

  return {
    logs: allLogs,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
  };
}

/**
 * Hook to check if vehicle can create trip
 */
export function useCanCreateTrip(vehicleId: string) {
  const { data, isLoading, error } = trpc.fleet.vehicle.canCreateTrip.useQuery(
    { vehicleId },
    {
      enabled: !!vehicleId,
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );

  return {
    canCreate: data?.canCreate ?? false,
    reason: data?.reason,
    isLoading,
    error,
  };
}

// ============================================================================
// DRIVER HOOKS
// ============================================================================

/**
 * Hook to fetch driver detail
 */
export function useDriverDetail(driverId: string) {
  const { data, isLoading, error, refetch } = trpc.fleet.driver.getDetail.useQuery(
    { driverId },
    {
      enabled: !!driverId,
      staleTime: 5 * 60 * 1000,
    }
  );

  return {
    driver: data,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to fetch driver performance metrics
 */
export function useDriverPerformance(driverId: string, dateRange: "week" | "month" | "quarter" | "year" = "month") {
  const { data, isLoading, error } = trpc.fleet.driver.getPerformance.useQuery(
    { driverId, dateRange },
    {
      enabled: !!driverId,
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  return {
    performance: data,
    isLoading,
    error,
  };
}

/**
 * Hook to fetch driver assignment history
 */
export function useDriverAssignmentHistory(driverId: string, limit = 50) {
  const { data, isLoading, error, fetchNextPage, hasNextPage } = trpc.fleet.driver.getAssignmentHistory.useInfiniteQuery(
    { driverId, limit },
    {
      enabled: !!driverId,
      getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.offset + limit : undefined),
    }
  );

  const allAssignments = useMemo(() => {
    return data?.pages.flatMap((page) => page.assignments) ?? [];
  }, [data]);

  return {
    assignments: allAssignments,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
  };
}

/**
 * Hook to fetch driver license status
 */
export function useDriverLicenseStatus(driverId: string) {
  const { data, isLoading, error } = trpc.fleet.driver.getLicenseStatus.useQuery(
    { driverId },
    {
      enabled: !!driverId,
      staleTime: 24 * 60 * 60 * 1000, // 24 hours
    }
  );

  return {
    licenseStatus: data,
    isLoading,
    error,
    isExpiring: data?.daysUntilExpiry !== undefined && data.daysUntilExpiry < 30,
    isExpired: data?.status === "expired",
  };
}

// ============================================================================
// TRIP HOOKS
// ============================================================================

/**
 * Hook to fetch trip detail
 */
export function useTripDetail(tripId: string) {
  const { data, isLoading, error } = trpc.fleet.trip.getDetail.useQuery(
    { tripId },
    {
      enabled: !!tripId,
      staleTime: 5 * 60 * 1000,
    }
  );

  return {
    trip: data,
    isLoading,
    error,
  };
}

/**
 * Hook to fetch trip fuel consumption
 */
export function useTripFuelConsumption(tripId: string) {
  const { data, isLoading, error } = trpc.fleet.trip.getFuelConsumption.useQuery(
    { tripId },
    {
      enabled: !!tripId,
      staleTime: 5 * 60 * 1000,
    }
  );

  return {
    fuelConsumption: data,
    isLoading,
    error,
  };
}

/**
 * Hook to fetch trip efficiency
 */
export function useTripEfficiency(tripId: string) {
  const { data, isLoading, error } = trpc.fleet.trip.getEfficiency.useQuery(
    { tripId },
    {
      enabled: !!tripId,
      staleTime: 5 * 60 * 1000,
    }
  );

  return {
    efficiency: data,
    isLoading,
    error,
  };
}

// ============================================================================
// FUEL ANALYTICS HOOKS
// ============================================================================

/**
 * Hook to fetch fuel consumption trends
 */
export function useFuelConsumptionTrends(
  vehicleId: string | undefined,
  startDate: Date,
  endDate: Date
) {
  const { data, isLoading, error } = trpc.fleet.fuel.getFuelConsumptionTrends.useQuery(
    { vehicleId, startDate, endDate },
    {
      enabled: !!startDate && !!endDate,
      staleTime: 15 * 60 * 1000,
    }
  );

  return {
    trends: data,
    isLoading,
    error,
  };
}

/**
 * Hook to fetch fuel efficiency metrics
 */
export function useFuelEfficiencyMetrics(
  vehicleId: string | undefined,
  dateRange: "week" | "month" | "quarter" | "year" = "month"
) {
  const { data, isLoading, error } = trpc.fleet.fuel.getFuelEfficiencyMetrics.useQuery(
    { vehicleId, dateRange },
    {
      enabled: true,
      staleTime: 15 * 60 * 1000,
    }
  );

  return {
    metrics: data,
    isLoading,
    error,
  };
}

/**
 * Hook to fetch fuel anomalies
 */
export function useFuelAnomalies(vehicleId: string, threshold = 1.5) {
  const { data, isLoading, error } = trpc.fleet.fuel.getFuelAnomalies.useQuery(
    { vehicleId, threshold },
    {
      enabled: !!vehicleId,
      staleTime: 30 * 60 * 1000,
    }
  );

  return {
    anomalies: data,
    isLoading,
    error,
  };
}

// ============================================================================
// MAINTENANCE HOOKS
// ============================================================================

/**
 * Hook to fetch maintenance predictions
 */
export function useMaintenancePredictions(vehicleId: string) {
  const { data, isLoading, error } = trpc.fleet.maintenance.getMaintenancePredictions.useQuery(
    { vehicleId },
    {
      enabled: !!vehicleId,
      staleTime: 24 * 60 * 60 * 1000,
    }
  );

  return {
    predictions: data,
    isLoading,
    error,
  };
}

/**
 * Hook to fetch maintenance schedule
 */
export function useMaintenanceSchedule(vehicleId: string) {
  const { data, isLoading, error } = trpc.fleet.maintenance.getMaintenanceSchedule.useQuery(
    { vehicleId },
    {
      enabled: !!vehicleId,
      staleTime: 24 * 60 * 60 * 1000,
    }
  );

  return {
    schedule: data,
    isLoading,
    error,
  };
}

/**
 * Hook to fetch maintenance history
 */
export function useMaintenanceHistory(vehicleId: string, limit = 50) {
  const { data, isLoading, error, fetchNextPage, hasNextPage } = trpc.fleet.maintenance.getMaintenanceHistory.useInfiniteQuery(
    { vehicleId, limit },
    {
      enabled: !!vehicleId,
      getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.offset + limit : undefined),
    }
  );

  const allRecords = useMemo(() => {
    return data?.pages.flatMap((page) => page.records) ?? [];
  }, [data]);

  return {
    records: allRecords,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
  };
}

// ============================================================================
// COMPLIANCE HOOKS
// ============================================================================

/**
 * Hook to fetch compliance status
 */
export function useComplianceStatus(vehicleId?: string) {
  const { data, isLoading, error } = trpc.fleet.compliance.getComplianceStatus.useQuery(
    { vehicleId },
    {
      staleTime: 60 * 60 * 1000, // 1 hour
    }
  );

  return {
    status: data,
    isLoading,
    error,
  };
}

/**
 * Hook to fetch compliance documents
 */
export function useComplianceDocuments(vehicleId: string) {
  const { data, isLoading, error } = trpc.fleet.compliance.getComplianceDocuments.useQuery(
    { vehicleId },
    {
      enabled: !!vehicleId,
      staleTime: 60 * 60 * 1000,
    }
  );

  return {
    documents: data,
    isLoading,
    error,
  };
}

/**
 * Hook to fetch compliance inspections
 */
export function useComplianceInspections(vehicleId: string) {
  const { data, isLoading, error } = trpc.fleet.compliance.getComplianceInspections.useQuery(
    { vehicleId },
    {
      enabled: !!vehicleId,
      staleTime: 60 * 60 * 1000,
    }
  );

  return {
    inspections: data,
    isLoading,
    error,
  };
}

// ============================================================================
// REPORTING HOOKS
// ============================================================================

/**
 * Hook to fetch fleet overview
 */
export function useFleetOverview() {
  const { data, isLoading, error, refetch } = trpc.fleet.reporting.dashboard.getFleetOverview.useQuery(undefined, {
    staleTime: 10 * 60 * 1000,
  });

  return {
    overview: data,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to fetch fleet status distribution
 */
export function useFleetStatusDistribution() {
  const { data, isLoading, error } = trpc.fleet.reporting.dashboard.getFleetStatusDistribution.useQuery(undefined, {
    staleTime: 10 * 60 * 1000,
  });

  return {
    distribution: data,
    isLoading,
    error,
  };
}

/**
 * Hook to fetch fleet performance metrics
 */
export function useFleetPerformanceMetrics(
  dateRange: "week" | "month" | "quarter" | "year" = "month"
) {
  const { data, isLoading, error } = trpc.fleet.reporting.dashboard.getFleetPerformanceMetrics.useQuery(
    { dateRange },
    {
      staleTime: 15 * 60 * 1000,
    }
  );

  return {
    metrics: data,
    isLoading,
    error,
  };
}

/**
 * Hook to fetch operational KPIs
 */
export function useOperationalKPIs(
  dateRange: "week" | "month" | "quarter" | "year" = "month"
) {
  const { data, isLoading, error } = trpc.fleet.reporting.kpi.getOperationalKPIs.useQuery(
    { dateRange },
    {
      staleTime: 15 * 60 * 1000,
    }
  );

  return {
    kpis: data,
    isLoading,
    error,
  };
}

/**
 * Hook to fetch financial KPIs
 */
export function useFinancialKPIs(
  dateRange: "week" | "month" | "quarter" | "year" = "month"
) {
  const { data, isLoading, error } = trpc.fleet.reporting.kpi.getFinancialKPIs.useQuery(
    { dateRange },
    {
      staleTime: 15 * 60 * 1000,
    }
  );

  return {
    kpis: data,
    isLoading,
    error,
  };
}

// ============================================================================
// GOVERNANCE HOOKS
// ============================================================================

/**
 * Hook to fetch auto-numbering templates
 */
export function useAutoNumberingTemplates() {
  const { data, isLoading, error } = trpc.fleet.governance.autoNumbering.getAutoNumberingTemplates.useQuery(undefined, {
    staleTime: 60 * 60 * 1000,
  });

  return {
    templates: data?.templates,
    isLoading,
    error,
  };
}

/**
 * Hook to generate auto number
 */
export function useGenerateAutoNumber() {
  const utils = trpc.useUtils();
  const mutation = trpc.fleet.governance.autoNumbering.generateAutoNumber.useMutation({
    onSuccess: () => {
      utils.fleet.governance.autoNumbering.getAutoNumberingTemplates.invalidate();
    },
  });

  return {
    generateAutoNumber: mutation.mutate,
    autoNumber: mutation.data?.autoNumber,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook to fetch role permissions
 */
export function useRolePermissions(role?: "admin" | "manager" | "driver" | "viewer") {
  const { data, isLoading, error } = trpc.fleet.governance.rbac.getRolePermissions.useQuery(
    { role },
    {
      staleTime: 60 * 60 * 1000,
    }
  );

  return {
    permissions: data?.permissions,
    isLoading,
    error,
  };
}

/**
 * Hook to fetch audit trail
 */
export function useAuditTrail(
  entityType?: "vehicle" | "driver" | "trip" | "maintenance",
  entityId?: string,
  limit = 50
) {
  const { data, isLoading, error, fetchNextPage, hasNextPage } = trpc.fleet.governance.auditTrail.getAuditTrail.useInfiniteQuery(
    { entityType, entityId, limit },
    {
      getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.offset + limit : undefined),
    }
  );

  const allLogs = useMemo(() => {
    return data?.pages.flatMap((page) => page.logs) ?? [];
  }, [data]);

  return {
    logs: allLogs,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
  };
}

/**
 * Hook to fetch workflow rules
 */
export function useWorkflowRules() {
  const { data, isLoading, error } = trpc.fleet.governance.workflow.getWorkflowRules.useQuery(undefined, {
    staleTime: 60 * 60 * 1000,
  });

  return {
    rules: data?.rules,
    isLoading,
    error,
  };
}

// ============================================================================
// ERP INTEGRATION HOOKS
// ============================================================================

/**
 * Hook to fetch vendor integration status
 */
export function useVendorIntegrationStatus() {
  const { data, isLoading, error, refetch } = trpc.fleet.erp.vendor.getVendorStatus.useQuery(undefined, {
    staleTime: 30 * 60 * 1000,
  });

  return {
    status: data,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to sync vendors
 */
export function useSyncVendors() {
  const utils = trpc.useUtils();
  const mutation = trpc.fleet.erp.vendor.syncVendors.useMutation({
    onSuccess: () => {
      utils.fleet.erp.vendor.getVendorStatus.invalidate();
    },
  });

  return {
    syncVendors: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    success: mutation.isSuccess,
  };
}

/**
 * Hook to fetch procurement linkage
 */
export function useProcurementLinkage(vehicleId: string) {
  const { data, isLoading, error } = trpc.fleet.erp.procurement.getProcurementLinkage.useQuery(
    { vehicleId },
    {
      enabled: !!vehicleId,
      staleTime: 30 * 60 * 1000,
    }
  );

  return {
    linkage: data,
    isLoading,
    error,
  };
}

/**
 * Hook to fetch finance module linkage
 */
export function useFinanceModuleLinkage(vehicleId: string) {
  const { data, isLoading, error } = trpc.fleet.erp.finance.getFinanceModuleLinkage.useQuery(
    { vehicleId },
    {
      enabled: !!vehicleId,
      staleTime: 30 * 60 * 1000,
    }
  );

  return {
    linkage: data,
    isLoading,
    error,
  };
}
