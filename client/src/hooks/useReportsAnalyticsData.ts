/**
 * ============================================================================
 * USE REPORTS ANALYTICS DATA HOOK
 * ============================================================================
 * 
 * PURPOSE: Custom React hook for Reports & Analytics data fetching
 * 
 * ARCHITECTURE:
 * Component → Hook → Service → tRPC Router → Database
 * 
 * This hook provides:
 * - Clean data fetching interface
 * - Loading and error states
 * - Refetch capability
 * - Type safety
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { reportsAnalyticsService, type AllAnalyticsData, type DateRange } from '@/services/reportsAnalyticsService';

export interface UseReportsAnalyticsDataReturn {
 data: AllAnalyticsData | undefined;
 isLoading: boolean;
 error: Error | null;
 refetch: () => void;
 dateRange: DateRange;
 setDateRange: (range: DateRange) => void;
}

/**
 * Custom hook for fetching all analytics data
 * 
 * @param initialDateRange - Initial date range for filtering
 * @returns Analytics data, loading state, error state, and refetch function
 */
export function useReportsAnalyticsData(
 initialDateRange: DateRange = {
 from: '2026-01-01',
 to: '2026-12-31',
 }
): UseReportsAnalyticsDataReturn {
 const { currentOrganization } = useOrganization();
 const [dateRange, setDateRange] = useState<DateRange>(initialDateRange);

 // Fetch all analytics data using the service
 const { data, isLoading, error, refetch } = reportsAnalyticsService.useAllAnalytics(dateRange);

 // Auto-refetch when organization changes
 useEffect(() => {
 if (currentOrganization) {
 refetch();
 }
 }, [currentOrganization, refetch]);

 return {
 data,
 isLoading,
 error: error as Error | null,
 refetch,
 dateRange,
 setDateRange,
 };
}

/**
 * Hook for fetching workforce analytics only
 */
export function useWorkforceAnalytics(dateRange: DateRange) {
 const { currentOrganization } = useOrganization();
 const { data, isLoading, error, refetch } = reportsAnalyticsService.useWorkforceAnalytics(dateRange);

 useEffect(() => {
 if (currentOrganization) {
 refetch();
 }
 }, [currentOrganization, refetch]);

 return { data, isLoading, error, refetch };
}

/**
 * Hook for fetching payroll analytics only
 */
export function usePayrollAnalytics(dateRange: DateRange) {
 const { currentOrganization } = useOrganization();
 const { data, isLoading, error, refetch } = reportsAnalyticsService.usePayrollAnalytics(dateRange);

 useEffect(() => {
 if (currentOrganization) {
 refetch();
 }
 }, [currentOrganization, refetch]);

 return { data, isLoading, error, refetch };
}

/**
 * Hook for fetching attendance analytics only
 */
export function useAttendanceAnalytics(dateRange: DateRange) {
 const { currentOrganization } = useOrganization();
 const { data, isLoading, error, refetch } = reportsAnalyticsService.useAttendanceAnalytics(dateRange);

 useEffect(() => {
 if (currentOrganization) {
 refetch();
 }
 }, [currentOrganization, refetch]);

 return { data, isLoading, error, refetch };
}

/**
 * Hook for fetching leave analytics only
 */
export function useLeaveAnalytics(dateRange: DateRange) {
 const { currentOrganization } = useOrganization();
 const { data, isLoading, error, refetch } = reportsAnalyticsService.useLeaveAnalytics(dateRange);

 useEffect(() => {
 if (currentOrganization) {
 refetch();
 }
 }, [currentOrganization, refetch]);

 return { data, isLoading, error, refetch };
}

/**
 * Hook for fetching recruitment analytics only
 */
export function useRecruitmentAnalytics(dateRange: DateRange) {
 const { currentOrganization } = useOrganization();
 const { data, isLoading, error, refetch } = reportsAnalyticsService.useRecruitmentAnalytics(dateRange);

 useEffect(() => {
 if (currentOrganization) {
 refetch();
 }
 }, [currentOrganization, refetch]);

 return { data, isLoading, error, refetch };
}

/**
 * Hook for fetching compliance analytics only
 */
export function useComplianceAnalytics(dateRange: DateRange) {
 const { currentOrganization } = useOrganization();
 const { data, isLoading, error, refetch } = reportsAnalyticsService.useComplianceAnalytics(dateRange);

 useEffect(() => {
 if (currentOrganization) {
 refetch();
 }
 }, [currentOrganization, refetch]);

 return { data, isLoading, error, refetch };
}
