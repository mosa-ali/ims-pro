/**
 * useAutoProgramsReport Hook
 * 
 * Frontend data hook for the Auto Programs Report.
 * Connects to tRPC backend procedures with:
 * - Date range filtering (fiscal year, custom range)
 * - Project selection
 * - Auto-refresh every 5 minutes
 * - Proper loading/error states
 */

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';


// ============================================================
// TYPES
// ============================================================

export type DateRangePreset = 'current_year' | 'last_year' | 'last_6_months' | 'last_quarter' | 'custom';

export interface DateRange {
  fromDate: string; // YYYY-MM-DD
  toDate: string;   // YYYY-MM-DD
}

export interface AutoReportFilters {
  dateRangePreset: DateRangePreset;
  customRange: DateRange;
  projectId?: number;
}

// ============================================================
// HELPER: Compute date range from preset
// ============================================================

function computeDateRange(preset: DateRangePreset, customRange: DateRange): DateRange {
  const now = new Date();
  const currentYear = now.getFullYear();

  switch (preset) {
    case 'current_year':
      return {
        fromDate: `${currentYear}-01-01`,
        toDate: `${currentYear}-12-31`,
      };
    case 'last_year':
      return {
        fromDate: `${currentYear - 1}-01-01`,
        toDate: `${currentYear - 1}-12-31`,
      };
    case 'last_6_months': {
      const sixMonthsAgo = new Date(now);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      return {
        fromDate: sixMonthsAgo.toISOString().split('T')[0],
        toDate: now.toISOString().split('T')[0],
      };
    }
    case 'last_quarter': {
      const threeMonthsAgo = new Date(now);
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return {
        fromDate: threeMonthsAgo.toISOString().split('T')[0],
        toDate: now.toISOString().split('T')[0],
      };
    }
    case 'custom':
      return customRange;
    default:
      return {
        fromDate: `${currentYear}-01-01`,
        toDate: `${currentYear}-12-31`,
      };
  }
}

// ============================================================
// MAIN HOOK
// ============================================================

export function useAutoProgramsReport() {
  // Filter state
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('current_year');
  const [customRange, setCustomRange] = useState<DateRange>({
    fromDate: `${new Date().getFullYear()}-01-01`,
    toDate: `${new Date().getFullYear()}-12-31`,
  });
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(undefined);

  // Compute effective date range
  const effectiveDateRange = useMemo(
    () => computeDateRange(dateRangePreset, customRange),
    [dateRangePreset, customRange]
  );

  // tRPC Queries
  const dashboardQuery = trpc.projects.generateAutoReport.getDashboardData.useQuery(
    {
      fromDate: effectiveDateRange.fromDate,
      toDate: effectiveDateRange.toDate,
      projectId: selectedProjectId,
    },
    {
      refetchInterval: 5 * 60 * 1000, // 5 minutes
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );

  const projectsListQuery = trpc.projects.generateAutoReport.getProjectsList.useQuery(undefined, {
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Derived data
  const data = dashboardQuery.data ?? null;
  const projectsList = projectsListQuery.data ?? [];
  const isLoading = dashboardQuery.isLoading;
  const isRefetching = dashboardQuery.isRefetching;
  const error = dashboardQuery.error;

  // Actions
  const refetch = () => dashboardQuery.refetch();

  const setFilters = (filters: Partial<AutoReportFilters>) => {
    if (filters.dateRangePreset !== undefined) setDateRangePreset(filters.dateRangePreset);
    if (filters.customRange !== undefined) setCustomRange(filters.customRange);
    if (filters.projectId !== undefined) setSelectedProjectId(filters.projectId || undefined);
  };

  const resetFilters = () => {
    setDateRangePreset('current_year');
    setCustomRange({
      fromDate: `${new Date().getFullYear()}-01-01`,
      toDate: `${new Date().getFullYear()}-12-31`,
    });
    setSelectedProjectId(undefined);
  };

  return {
    // Data
    data,
    projectsList,

    // Loading states
    isLoading,
    isRefetching,
    error,

    // Filters
    filters: {
      dateRangePreset,
      customRange,
      projectId: selectedProjectId,
      effectiveDateRange,
    },

    // Actions
    setFilters,
    resetFilters,
    refetch,
    setDateRangePreset,
    setCustomRange,
    setSelectedProjectId,
  };
}

// ============================================================
// EXPORT TYPES FOR COMPONENT USE
// ============================================================

export type AutoReportData = NonNullable<ReturnType<typeof useAutoProgramsReport>['data']>;
export type ProjectListItem = NonNullable<ReturnType<typeof useAutoProgramsReport>['projectsList']>[number];
