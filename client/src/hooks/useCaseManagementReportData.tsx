// ============================================================================
// CASE MANAGEMENT REPORT DATA HOOK
// Aggregates real data from all Case Management sub-modules via tRPC
// NO localStorage - All data from database
// ============================================================================

import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import type {
 CaseRecord,
 PSSSession,
 CaseReferral,
 ChildSafeSpace,
 CSSActivity,
 CaseActivity
} from '@/types/caseManagement';

export interface CaseManagementReportData {
 // Metadata
 projectId: number;
 reportingPeriod: {
 from: string;
 to: string;
 };

 // Cases
 cases: {
 total: number;
 new: number;
 active: number;
 closed: number;
 highRisk: number;
 mediumRisk: number;
 lowRisk: number;
 byType: { type: string; count: number }[];
 byStatus: { status: string; count: number }[];
 byGender: { male: number; female: number; other: number };
 avgCaseDuration: number;
 details: any[];
 };

 // PSS Sessions
 pssSessions: {
 total: number;
 individual: number;
 group: number;
 byApproach: { approach: string; count: number }[];
 avgDuration: number;
 followUpsScheduled: number;
 details: any[];
 };

 // Referrals
 referrals: {
 total: number;
 internal: number;
 external: number;
 completed: number;
 pending: number;
 byType: { type: string; count: number }[];
 completionRate: number;
 details: any[];
 };

 // Child Safe Spaces
 safeSpaces: {
 locations: number;
 totalActivities: number;
 childrenReached: number;
 avgChildrenPerSession: number;
 byAgeGroup: { ageGroup: string; count: number }[];
 details: any[];
 activities: any[];
 };

 // Activities & Services
 activities: {
 total: number;
 byType: { type: string; count: number }[];
 details: any[];
 };

 // Overall Metrics
 overall: {
 totalBeneficiaries: number;
 activeLocations: number;
 activeCaseWorkers: number;
 lastActivityDate: string;
 totalUpdates: number;
 };
}

export function useCaseManagementReportData(
 projectId: number,
 dateFrom: string,
 dateTo: string
): {
 data: CaseManagementReportData | null;
 loading: boolean;
 error: Error | null;
} {
 // Fetch all data from database via tRPC
 const casesQuery = trpc.caseManagement.cases.list.useQuery(
 { projectId },
 { enabled: !!projectId }
 );

 const pssSessionsQuery = trpc.caseManagement.pssSessions.list.useQuery(
 { projectId },
 { enabled: !!projectId }
 );

 const referralsQuery = trpc.caseManagement.referrals.list.useQuery(
 { projectId },
 { enabled: !!projectId }
 );

 const safeSpacesQuery = trpc.caseManagement.childSafeSpaces.list.useQuery(
 { projectId },
 { enabled: !!projectId }
 );

 const cssActivitiesQuery = trpc.caseManagement.cssActivities.list.useQuery(
 { projectId },
 { enabled: !!projectId }
 );

 const caseActivitiesQuery = trpc.caseManagement.caseActivities.list.useQuery(
 { projectId },
 { enabled: !!projectId }
 );

 const loading = casesQuery.isLoading || pssSessionsQuery.isLoading || referralsQuery.isLoading;
 const queryError = casesQuery.error || pssSessionsQuery.error || referralsQuery.error;

 const result = useMemo<{
 data: CaseManagementReportData | null;
 error: Error | null;
 }>(() => {
 if (loading) {
 return { data: null, error: null };
 }

 try {
 // Get all data from tRPC queries
 const allCases = casesQuery.data || [];
 const allPSSSessions = pssSessionsQuery.data || [];
 const allReferrals = referralsQuery.data || [];
 const allSafeSpaces = safeSpacesQuery.data || [];
 const allCSSActivities = cssActivitiesQuery.data || [];
 const allCaseActivities = caseActivitiesQuery.data || [];

 // Filter by date range
 const fromDate = new Date(dateFrom);
 const toDate = new Date(dateTo);

 const filteredCases = allCases.filter(c => {
 const intakeDate = c.intakeDate ? new Date(c.intakeDate) : null;
 if (!intakeDate) return true; // Include cases without intake date
 return intakeDate >= fromDate && intakeDate <= toDate;
 });

 const filteredPSSSessions = allPSSSessions.filter(s => {
 const sessionDate = s.sessionDate ? new Date(s.sessionDate) : null;
 if (!sessionDate) return true;
 return sessionDate >= fromDate && sessionDate <= toDate;
 });

 const filteredReferrals = allReferrals.filter(r => {
 const referralDate = r.referralDate ? new Date(r.referralDate) : null;
 if (!referralDate) return true;
 return referralDate >= fromDate && referralDate <= toDate;
 });

 const filteredCSSActivities = allCSSActivities.filter(a => {
 const activityDate = a.activityDate ? new Date(a.activityDate) : null;
 if (!activityDate) return true;
 return activityDate >= fromDate && activityDate <= toDate;
 });

 const filteredCaseActivities = allCaseActivities.filter(a => {
 const activityDate = a.activityDate ? new Date(a.activityDate) : null;
 if (!activityDate) return true;
 return activityDate >= fromDate && activityDate <= toDate;
 });

 // ============ CASES AGGREGATION ============
 const totalCases = filteredCases.length;
 const newCases = filteredCases.filter(c => {
 const createdAt = c.createdAt ? new Date(c.createdAt) : null;
 if (!createdAt) return false;
 return createdAt >= fromDate && createdAt <= toDate;
 }).length;
 const activeCases = filteredCases.filter(c => c.status === 'open').length;
 const closedCases = filteredCases.filter(c => c.status === 'closed').length;
 const highRiskCases = filteredCases.filter(c => c.riskLevel === 'high').length;
 const mediumRiskCases = filteredCases.filter(c => c.riskLevel === 'medium').length;
 const lowRiskCases = filteredCases.filter(c => c.riskLevel === 'low').length;

 // Cases by type
 const casesByType = filteredCases.reduce((acc, c) => {
 const type = c.caseType || 'Other';
 const existing = acc.find(item => item.type === type);
 if (existing) {
 existing.count++;
 } else {
 acc.push({ type, count: 1 });
 }
 return acc;
 }, [] as { type: string; count: number }[]);

 // Cases by status
 const casesByStatus = filteredCases.reduce((acc, c) => {
 const status = c.status || 'Unknown';
 const existing = acc.find(item => item.status === status);
 if (existing) {
 existing.count++;
 } else {
 acc.push({ status, count: 1 });
 }
 return acc;
 }, [] as { status: string; count: number }[]);

 // Cases by gender
 const maleCount = filteredCases.filter(c => c.gender === 'male').length;
 const femaleCount = filteredCases.filter(c => c.gender === 'female').length;
 const otherCount = filteredCases.filter(c => c.gender !== 'male' && c.gender !== 'female').length;

 // Average case duration (for closed cases)
 const closedCasesWithDates = filteredCases.filter(c => c.status === 'closed' && c.closedAt);
 const avgCaseDuration = closedCasesWithDates.length > 0
 ? closedCasesWithDates.reduce((sum, c) => {
 const opened = c.createdAt ? new Date(c.createdAt) : new Date();
 const closed = new Date(c.closedAt!);
 const duration = Math.ceil((closed.getTime() - opened.getTime()) / (1000 * 60 * 60 * 24));
 return sum + duration;
 }, 0) / closedCasesWithDates.length
 : 0;

 // ============ PSS SESSIONS AGGREGATION ============
 const totalPSSSessions = filteredPSSSessions.length;
 const individualSessions = filteredPSSSessions.filter(s => s.sessionType === 'individual').length;
 const groupSessions = filteredPSSSessions.filter(s => s.sessionType === 'group').length;

 // PSS sessions by approach
 const sessionsByApproach = filteredPSSSessions.reduce((acc, s) => {
 const approach = s.pssApproach || 'Other';
 const existing = acc.find(item => item.approach === approach);
 if (existing) {
 existing.count++;
 } else {
 acc.push({ approach, count: 1 });
 }
 return acc;
 }, [] as { approach: string; count: number }[]);

 // Average session duration
 const avgSessionDuration = filteredPSSSessions.length > 0
 ? filteredPSSSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / filteredPSSSessions.length
 : 0;

 // Follow-ups scheduled
 const followUpsScheduled = filteredPSSSessions.filter(s => s.nextSessionDate).length;

 // ============ REFERRALS AGGREGATION ============
 const totalReferrals = filteredReferrals.length;
 const internalReferrals = filteredReferrals.filter(r => r.referralType === 'internal').length;
 const externalReferrals = filteredReferrals.filter(r => r.referralType === 'external').length;
 const completedReferrals = filteredReferrals.filter(r => r.status === 'completed').length;
 const pendingReferrals = filteredReferrals.filter(r => r.status === 'pending').length;

 // Referrals by type
 const referralsByType = filteredReferrals.reduce((acc, r) => {
 const type = r.serviceType || 'Other';
 const existing = acc.find(item => item.type === type);
 if (existing) {
 existing.count++;
 } else {
 acc.push({ type, count: 1 });
 }
 return acc;
 }, [] as { type: string; count: number }[]);

 const completionRate = totalReferrals > 0 ? (completedReferrals / totalReferrals) * 100 : 0;

 // ============ SAFE SPACES AGGREGATION ============
 const safeSpaceLocations = allSafeSpaces.length;
 const totalCSSActivities = filteredCSSActivities.length;

 // Count unique children reached
 const childrenReached = filteredCSSActivities.reduce((sum, a) => sum + (a.participantsCount || 0), 0);

 // Average children per session
 const avgChildrenPerSession = totalCSSActivities > 0 ? childrenReached / totalCSSActivities : 0;

 // Age groups (from Safe Spaces)
 const ageGroups = allSafeSpaces.reduce((acc, space) => {
 const ageGroup = space.ageGroupsServed || 'Unknown';
 const existing = acc.find(item => item.ageGroup === ageGroup);
 if (existing) {
 existing.count++;
 } else {
 acc.push({ ageGroup, count: 1 });
 }
 return acc;
 }, [] as { ageGroup: string; count: number }[]);

 // ============ ACTIVITIES AGGREGATION ============
 const totalActivities = filteredCaseActivities.length;

 // Activities by type
 const activitiesByType = filteredCaseActivities.reduce((acc, a) => {
 const type = a.activityType || 'Other';
 const existing = acc.find(item => item.type === type);
 if (existing) {
 existing.count++;
 } else {
 acc.push({ type, count: 1 });
 }
 return acc;
 }, [] as { type: string; count: number }[]);

 // ============ OVERALL METRICS ============
 // Total unique beneficiaries (unique case IDs)
 const uniqueBeneficiaries = new Set(filteredCases.map(c => c.id)).size;

 // Active locations (from cases)
 const activeLocations = new Set(filteredCases.map(c => c.location).filter(Boolean)).size;

 // Active case workers (assigned to cases)
 const activeCaseWorkers = new Set(filteredCases.map(c => c.assignedTo).filter(Boolean)).size;

 // Last activity date (most recent from all sources)
 const allDates = [
 ...filteredCases.map(c => c.updatedAt),
 ...filteredPSSSessions.map(s => s.updatedAt),
 ...filteredReferrals.map(r => r.updatedAt),
 ...filteredCSSActivities.map(a => a.updatedAt || a.activityDate),
 ...filteredCaseActivities.map(a => a.updatedAt || a.activityDate)
 ].filter(Boolean);

 const lastActivityDate = allDates.length > 0
 ? allDates.sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0]
 : new Date().toISOString();

 // Total updates (all activity records)
 const totalUpdates = filteredPSSSessions.length + filteredReferrals.length + filteredCSSActivities.length + filteredCaseActivities.length;

 const reportDataObject: CaseManagementReportData = {
 projectId,
 reportingPeriod: {
 from: dateFrom,
 to: dateTo
 },
 cases: {
 total: totalCases,
 new: newCases,
 active: activeCases,
 closed: closedCases,
 highRisk: highRiskCases,
 mediumRisk: mediumRiskCases,
 lowRisk: lowRiskCases,
 byType: casesByType,
 byStatus: casesByStatus,
 byGender: { male: maleCount, female: femaleCount, other: otherCount },
 avgCaseDuration: Math.round(avgCaseDuration),
 details: filteredCases
 },
 pssSessions: {
 total: totalPSSSessions,
 individual: individualSessions,
 group: groupSessions,
 byApproach: sessionsByApproach,
 avgDuration: Math.round(avgSessionDuration),
 followUpsScheduled,
 details: filteredPSSSessions
 },
 referrals: {
 total: totalReferrals,
 internal: internalReferrals,
 external: externalReferrals,
 completed: completedReferrals,
 pending: pendingReferrals,
 byType: referralsByType,
 completionRate: Math.round(completionRate * 10) / 10,
 details: filteredReferrals
 },
 safeSpaces: {
 locations: safeSpaceLocations,
 totalActivities: totalCSSActivities,
 childrenReached,
 avgChildrenPerSession: Math.round(avgChildrenPerSession),
 byAgeGroup: ageGroups,
 details: allSafeSpaces,
 activities: filteredCSSActivities
 },
 activities: {
 total: totalActivities,
 byType: activitiesByType,
 details: filteredCaseActivities
 },
 overall: {
 totalBeneficiaries: uniqueBeneficiaries,
 activeLocations,
 activeCaseWorkers,
 lastActivityDate: lastActivityDate ? new Date(lastActivityDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
 totalUpdates
 }
 };
 
 return {
 data: reportDataObject,
 error: null
 };
 } catch (error) {
 console.error('Error aggregating case management report data:', error);
 return {
 data: null,
 error: error instanceof Error ? error : new Error(String(error))
 };
 }
 }, [
 projectId, 
 dateFrom, 
 dateTo, 
 loading,
 casesQuery.data,
 pssSessionsQuery.data,
 referralsQuery.data,
 safeSpacesQuery.data,
 cssActivitiesQuery.data,
 caseActivitiesQuery.data
 ]);

 return {
 data: result.data,
 loading,
 error: queryError ? new Error(queryError.message) : result.error
 };
}
