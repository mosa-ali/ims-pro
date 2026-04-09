/**
 * ============================================================================
 * CUSTOM HOOK: useCaseManagementReportData
 * Aggregates and formats data for Case Management Reports
 * ============================================================================
 */

import { useMemo } from 'react';
import {
  getCaseRecords,
  getPSSSessions,
  getCaseReferrals,
  getCaseActivities,
  getCSSActivities,
  getCSSLocations,
  generateCaseManagementReport
} from '@/services/caseManagementService';
import type {
  CaseRecord,
  CaseManagementReport,
  ReportFilters
} from '@/types/caseManagement';

interface UseCaseManagementReportDataProps {
  projectId: number;
  filters: ReportFilters;
  currentUser: { name: string };
}

export function useCaseManagementReportData({
  projectId,
  filters,
  currentUser
}: UseCaseManagementReportDataProps) {
  // Generate full report
  const report = useMemo(() => {
    return generateCaseManagementReport(projectId, filters, currentUser);
  }, [projectId, filters, currentUser]);

  // Get filtered cases
  const cases = useMemo(() => {
    return getCaseRecords(projectId).filter(c => {
      const inRange = c.openedAt >= filters.reportingPeriodStart && 
                      c.openedAt <= filters.reportingPeriodEnd;
      const matchesType = !filters.caseType || c.caseType === filters.caseType;
      const matchesRisk = !filters.riskLevel || c.riskLevel === filters.riskLevel;
      return inRange && matchesType && matchesRisk && !c.isDeleted;
    });
  }, [projectId, filters]);

  // Demographics breakdown
  const demographics = useMemo(() => {
    const genderBreakdown: Record<string, number> = {};
    const ageGroups = {
      '0-5': 0,
      '6-11': 0,
      '12-17': 0,
      '18-24': 0,
      '25-59': 0,
      '60+': 0
    };

    cases.forEach(c => {
      // Gender
      genderBreakdown[c.gender] = (genderBreakdown[c.gender] || 0) + 1;

      // Age groups
      const age = c.age;
      if (age <= 5) ageGroups['0-5']++;
      else if (age <= 11) ageGroups['6-11']++;
      else if (age <= 17) ageGroups['12-17']++;
      else if (age <= 24) ageGroups['18-24']++;
      else if (age <= 59) ageGroups['25-59']++;
      else ageGroups['60+']++;
    });

    return { genderBreakdown, ageGroups };
  }, [cases]);

  // Case type breakdown
  const caseTypeBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    cases.forEach(c => {
      breakdown[c.caseType] = (breakdown[c.caseType] || 0) + 1;
    });
    return breakdown;
  }, [cases]);

  // Risk level trends over time
  const riskTrends = useMemo(() => {
    const trends: Array<{ date: string; high: number; medium: number; low: number }> = [];

    // Group cases by month
    const monthlyData: Record<string, { high: number; medium: number; low: number }> = {};

    cases.forEach(c => {
      const monthKey = c.openedAt.substring(0, 7); // YYYY-MM
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { high: 0, medium: 0, low: 0 };
      }

      if (c.riskLevel === 'high') monthlyData[monthKey].high++;
      else if (c.riskLevel === 'medium') monthlyData[monthKey].medium++;
      else monthlyData[monthKey].low++;
    });

    // Convert to array and sort
    Object.keys(monthlyData)
      .sort()
      .forEach(month => {
        trends.push({
          date: month,
          ...monthlyData[month]
        });
      });

    return trends;
  }, [cases]);

  // PSS session statistics
  const pssStats = useMemo(() => {
    const allSessions = getPSSSessions();
    const caseSessions = allSessions.filter(s => {
      const caseMatch = cases.find(c => c.id === s.caseId);
      return caseMatch && 
             s.sessionDate >= filters.reportingPeriodStart && 
             s.sessionDate <= filters.reportingPeriodEnd;
    });

    const byApproach: Record<string, number> = {};
    caseSessions.forEach(s => {
      byApproach[s.pssApproach] = (byApproach[s.pssApproach] || 0) + 1;
    });

    const avgDuration = caseSessions.length > 0
      ? caseSessions.reduce((sum, s) => sum + s.duration, 0) / caseSessions.length
      : 0;

    return {
      total: caseSessions.length,
      byApproach,
      avgDuration: Math.round(avgDuration)
    };
  }, [cases, filters]);

  // Referral statistics
  const referralStats = useMemo(() => {
    const allReferrals = getCaseReferrals();
    const caseReferrals = allReferrals.filter(r => {
      const caseMatch = cases.find(c => c.id === r.caseId);
      return caseMatch && 
             r.referralDate >= filters.reportingPeriodStart && 
             r.referralDate <= filters.reportingPeriodEnd;
    });

    const byService: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byOrganization: Record<string, number> = {};

    caseReferrals.forEach(r => {
      byService[r.serviceRequired] = (byService[r.serviceRequired] || 0) + 1;
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      byOrganization[r.receivingOrganization] = (byOrganization[r.receivingOrganization] || 0) + 1;
    });

    return {
      total: caseReferrals.length,
      byService,
      byStatus,
      byOrganization,
      completionRate: caseReferrals.length > 0
        ? Math.round((byStatus['completed'] || 0) / caseReferrals.length * 100)
        : 0
    };
  }, [cases, filters]);

  // Activity statistics
  const activityStats = useMemo(() => {
    const allActivities = getCaseActivities();
    const caseActivities = allActivities.filter(a => {
      const caseMatch = cases.find(c => c.id === a.caseId);
      return caseMatch && 
             a.activityDate >= filters.reportingPeriodStart && 
             a.activityDate <= filters.reportingPeriodEnd;
    });

    const byType: Record<string, number> = {};
    caseActivities.forEach(a => {
      byType[a.activityType] = (byType[a.activityType] || 0) + 1;
    });

    return {
      total: caseActivities.length,
      byType
    };
  }, [cases, filters]);

  // CSS statistics
  const cssStats = useMemo(() => {
    const allCSSActivities = getCSSActivities();
    const periodActivities = allCSSActivities.filter(a => 
      a.activityDate >= filters.reportingPeriodStart && 
      a.activityDate <= filters.reportingPeriodEnd
    );

    const byType: Record<string, number> = {};
    let totalChildren = 0;
    let maleChildren = 0;
    let femaleChildren = 0;

    periodActivities.forEach(a => {
      byType[a.activityType] = (byType[a.activityType] || 0) + 1;
      totalChildren += a.participantsCount;
      maleChildren += a.maleCount || 0;
      femaleChildren += a.femaleCount || 0;
    });

    return {
      totalActivities: periodActivities.length,
      byType,
      totalChildren,
      maleChildren,
      femaleChildren,
      locations: getCSSLocations(projectId).length
    };
  }, [projectId, filters]);

  // Case outcomes and closure rates
  const outcomeStats = useMemo(() => {
    const closedCases = cases.filter(c => 
      c.status === 'closed' && 
      c.closedAt && 
      c.closedAt >= filters.reportingPeriodStart &&
      c.closedAt <= filters.reportingPeriodEnd
    );

    const caseDurations = closedCases
      .filter(c => c.closedAt)
      .map(c => {
        const opened = new Date(c.openedAt);
        const closed = new Date(c.closedAt!);
        return Math.floor((closed.getTime() - opened.getTime()) / (1000 * 60 * 60 * 24));
      });

    const avgDuration = caseDurations.length > 0
      ? Math.round(caseDurations.reduce((a, b) => a + b, 0) / caseDurations.length)
      : 0;

    const minDuration = caseDurations.length > 0 ? Math.min(...caseDurations) : 0;
    const maxDuration = caseDurations.length > 0 ? Math.max(...caseDurations) : 0;

    return {
      totalClosed: closedCases.length,
      avgDuration,
      minDuration,
      maxDuration,
      closureRate: cases.length > 0
        ? Math.round(closedCases.length / cases.length * 100)
        : 0
    };
  }, [cases, filters]);

  // Export data for charts
  const chartData = useMemo(() => ({
    casesByMonth: riskTrends,
    casesByType: Object.entries(caseTypeBreakdown).map(([type, count]) => ({
      type,
      count
    })),
    casesByGender: Object.entries(demographics.genderBreakdown).map(([gender, count]) => ({
      gender,
      count
    })),
    casesByAge: Object.entries(demographics.ageGroups).map(([ageGroup, count]) => ({
      ageGroup,
      count
    })),
    referralsByStatus: Object.entries(referralStats.byStatus).map(([status, count]) => ({
      status,
      count
    }))
  }), [riskTrends, caseTypeBreakdown, demographics, referralStats]);

  return {
    // Core report
    report,
    
    // Detailed breakdowns
    demographics,
    caseTypeBreakdown,
    riskTrends,
    pssStats,
    referralStats,
    activityStats,
    cssStats,
    outcomeStats,
    
    // Chart data
    chartData,
    
    // Raw data
    cases
  };
}
