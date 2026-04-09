/**
 * ============================================================================
 * REPORTS & ANALYTICS SERVICE
 * ============================================================================
 * 
 * PURPOSE: Service layer for Reports & Analytics module
 * 
 * ARCHITECTURE:
 * Component → Hook → Service → tRPC Router → Database
 * 
 * This service provides a clean abstraction over tRPC calls for:
 * - Reusable data logic
 * - Testability
 * - Future caching
 * - Clean separation
 * - Scalability
 * 
 * GOVERNANCE:
 * - All data aggregation happens in backend (reportsAnalyticsRouter.ts)
 * - This service ONLY calls tRPC endpoints
 * - NO frontend aggregation
 * - NO mock data
 * 
 * ============================================================================
 */

import { trpc } from '@/lib/trpc';

export interface DateRange {
 from: string;
 to: string;
}

export interface WorkforceStats {
 activeCount: number;
 archivedCount: number;
 exitedCount: number;
 totalCount: number;
 byDepartment: { name: string; count: number; percentage: number }[];
 byGender: { male: number; female: number; malePercentage: number; femalePercentage: number };
 byContract: { type: string; count: number }[];
}

export interface PayrollStats {
 monthlyCosts: { month: string; amount: number }[];
 totalAnnualCost: number;
 byProject: { name: string; amount: number; count: number }[];
 byDepartment: { name: string; amount: number }[];
}

export interface AttendanceStats {
 overallRate: number;
 byDepartment: { name: string; rate: number; lateCount: number }[];
 overtimeHoursByProject: { project: string; hours: number }[];
 anomalyCount: number;
}

export interface LeaveStats {
 takenByType: { type: string; count: number }[];
 totalDaysUsed: number;
 averageLeavePerStaff: number;
 liabilityEstimate: number;
}

export interface RecruitmentStats {
 timeToHire: number;
 candidatesPerVacancy: number;
 selectionRate: number;
 vacancyAging: { position: string; daysOpen: number; appCount: number; status: string }[];
}

export interface ComplianceStats {
 expiringContracts: number;
 missingDocuments: number;
 pendingAppraisals: number;
 disciplinaryCases: number;
}

export interface AllAnalyticsData {
 organizationName: string;
 lastRefresh: string;
 workforce: WorkforceStats;
 payroll: PayrollStats;
 attendance: AttendanceStats;
 leave: LeaveStats;
 recruitment: RecruitmentStats;
 compliance: ComplianceStats;
}

/**
 * Reports & Analytics Service
 * 
 * Provides methods to fetch analytics data via tRPC.
 * All methods return tRPC query hooks that can be used in React components.
 */
export const reportsAnalyticsService = {
 /**
 * Get all analytics data (workforce, payroll, attendance, leave, recruitment, compliance)
 */
 useAllAnalytics: (dateRange: DateRange) => {
 return trpc.ims.reportsAnalytics.getAll.useQuery({
 dateFrom: dateRange.from,
 dateTo: dateRange.to,
 });
 },

 /**
 * Get workforce analytics only
 */
 useWorkforceAnalytics: (dateRange: DateRange) => {
 return trpc.ims.reportsAnalytics.workforce.getStats.useQuery({
 dateFrom: dateRange.from,
 dateTo: dateRange.to,
 });
 },

 /**
 * Get payroll analytics only
 */
 usePayrollAnalytics: (dateRange: DateRange) => {
 return trpc.ims.reportsAnalytics.payroll.getStats.useQuery({
 dateFrom: dateRange.from,
 dateTo: dateRange.to,
 });
 },

 /**
 * Get attendance analytics only
 */
 useAttendanceAnalytics: (dateRange: DateRange) => {
 return trpc.ims.reportsAnalytics.attendance.getStats.useQuery({
 dateFrom: dateRange.from,
 dateTo: dateRange.to,
 });
 },

 /**
 * Get leave analytics only
 */
 useLeaveAnalytics: (dateRange: DateRange) => {
 return trpc.ims.reportsAnalytics.leave.getStats.useQuery({
 dateFrom: dateRange.from,
 dateTo: dateRange.to,
 });
 },

 /**
 * Get recruitment analytics only
 */
 useRecruitmentAnalytics: (dateRange: DateRange) => {
 return trpc.ims.reportsAnalytics.recruitment.getStats.useQuery({
 dateFrom: dateRange.from,
 dateTo: dateRange.to,
 });
 },

 /**
 * Get compliance analytics only
 */
 useComplianceAnalytics: (dateRange: DateRange) => {
 return trpc.ims.reportsAnalytics.compliance.getStats.useQuery({
 dateFrom: dateRange.from,
 dateTo: dateRange.to,
 });
 },
};

/**
 * Export utility functions for data formatting
 * These are pure functions that don't fetch data
 */
export const reportsAnalyticsUtils = {
 /**
 * Format currency for display
 */
 formatCurrency: (amount: number): string => {
 return new Intl.NumberFormat('en-US', {
 style: 'currency',
 currency: 'USD',
 minimumFractionDigits: 0,
 maximumFractionDigits: 0,
 }).format(amount);
 },

 /**
 * Format date for display
 */
 formatDate: (date: string): string => {
 return new Date(date).toLocaleDateString('en-US', {
 year: 'numeric',
 month: 'short',
 day: 'numeric',
 });
 },

 /**
 * Format percentage for display
 */
 formatPercentage: (value: number): string => {
 return `${value.toFixed(1)}%`;
 },

 /**
 * Calculate percentage
 */
 calculatePercentage: (part: number, total: number): number => {
 if (total === 0) return 0;
 return (part / total) * 100;
 },
};
