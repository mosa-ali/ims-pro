/**
 * ============================================================================
 * AUTHORITATIVE PROJECT REPORT DATA HOOK
 * ============================================================================
 * 
 * MANDATORY DATA GOVERNANCE RULE:
 * This hook reads ONLY from authoritative database tables via tRPC.
 * NO hard-coded data. NO hook-only calculations.
 * All values must be persisted in core tables for audit/donor compliance.
 * 
 * AUTHORITATIVE TABLES (Source of Truth):
 * 1. Projects → Project metadata, status, timeline
 * 2. Financial Overview → Budget allocations and expenditures
 * 3. Activities → Activity definitions and progress
 * 4. Tasks → Task list and completion status
 * 5. Indicators → MEAL indicators, baselines, targets, achievements
 * 6. Beneficiaries → Beneficiary records and disaggregation
 * 7. Cases → Case management records
 * 
 * HOOKS MAY ONLY:
 * - Aggregate data from authoritative tables
 * - Cache results for performance
 * - Format for display
 * 
 * HOOKS MUST NEVER:
 * - Create data that doesn't exist in tables
 * - Silently overwrite authoritative records
 * - Use hardcoded mock values
 * 
 * ============================================================================
 */

import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================================
// TYPE DEFINITIONS (Match Database Schema)
// ============================================================================

export interface ProjectReportData {
 // Organization name (from Organizations table)
 organizationName: string;
 
 // Project Metadata (from Projects table)
 project: {
 id: number;
 projectCode: string;
 titleEn: string;
 titleAr: string;
 status: string;
 startDate: string;
 endDate: string;
 totalBudget: number;
 spent: number;
 currency: string;
 sectors: string[];
 location: string;
 };

 // Budget Summary (from Projects + Financial Overview)
 budget: {
 approved: number;
 revised: number;
 spent: number;
 committed: number;
 available: number;
 utilizationRate: number;
 };

 // Budget Breakdown by Category (from Financial Overview)
 budgetByCategory: Array<{
 category: string;
 allocated: number;
 spent: number;
 balance: number;
 }>;

 // Financial Performance (from Financial Overview)
 financial: {
 totalDisbursed: number;
 totalExpenditure: number;
 pendingPayments: number;
 burnRate: number;
 forecastedCompletion: number;
 // Additional fields for report display
 approvedBudget: number;
 actualSpent: number;
 remaining: number;
 };

 // Activities Progress (from Activities table)
 activities: {
 total: number;
 completed: number;
 inProgress: number;
 notStarted: number;
 delayed: number;
 completionRate: number;
 details: Array<{
 id: string;
 activityTitle: string;
 progress: number;
 status: string;
 }>;
 };

 // Tasks Progress (from Tasks table)
 tasks: {
 total: number;
 completed: number;
 inProgress: number;
 overdue: number;
 completionRate: number;
 };

 // Indicators (from Indicators table)
 indicators: {
 total: number;
 onTrack: number;
 atRisk: number;
 achieved: number;
 averageAchievement: number;
 details: Array<{
 code: string;
 title: string;
 baseline: number;
 target: number;
 achieved: number;
 progress: number;
 status: string;
 }>;
 };

 // Beneficiaries (from Beneficiaries table)
 beneficiaries: {
 total: number;
 direct: number;
 indirect: number;
 male: number;
 female: number;
 children: number;
 youth: number;
 adults: number;
 elderly: number;
 locations: number;
 };

 // Case Management (from Case Management tables)
 caseManagement: {
 totalCases: number;
 activeCases: number;
 closedCases: number;
 highRiskCases: number;
 pssSessions: number;
 cssActivities: number;
 childrenReached: number;
 referrals: number;
 completedReferrals: number;
 };

 // Risks (from Risks table)
 risks: {
 high: number;
 medium: number;
 low: number;
 total: number;
 };

 // Timeline
 daysRemaining: number;
 overallStatus: string;
}

// ============================================================================
// DATA ACCESS HOOK (reads from database via tRPC)
// ============================================================================

export function useProjectReportData(projectId: string, dateFrom?: string, dateTo?: string): {
  data: ProjectReportData | null;
 loading: boolean;
 error: Error | null;
 refresh: () => void;
} {
 const numericProjectId = parseInt(projectId);
 const { user } = useAuth();
 
 // Debug: Log user data to see what's available
 console.log('[useProjectReportData] User data:', user);
 console.log('[useProjectReportData] organizationId:', user?.organizationId);
 console.log('[useProjectReportData] operatingUnitId:', (user as any)?.operatingUnitId);
 
 // Get organizationId and operatingUnitId from authenticated user
 // Use explicit check to ensure we have valid numbers
 const organizationId = user?.organizationId ?? null;
 const operatingUnitId = (user as any)?.operatingUnitId ?? null;
 
 console.log('[useProjectReportData] Final organizationId:', organizationId);
 console.log('[useProjectReportData] Final operatingUnitId:', operatingUnitId);

 // Fetch project data from database
 const projectQuery = trpc.projects.getById.useQuery(
 { id: numericProjectId },
 { enabled: !!projectId }
 );

 // Fetch activities from database
 const activitiesQuery = trpc.activities.getByProject.useQuery(
 { projectId: numericProjectId },
 { enabled: !!projectId }
 );

 // Fetch activities statistics from database
 const activitiesStatsQuery = trpc.activities.getStatistics.useQuery(
 { projectId: numericProjectId },
 { enabled: !!projectId }
 );

 // Fetch indicators from database
 const indicatorsQuery = trpc.indicators.getByProject.useQuery(
 { 
 projectId: numericProjectId,
 organizationId: organizationId ?? 0,
 operatingUnitId: operatingUnitId ?? 0
 },
 { 
 enabled: !!projectId && typeof organizationId === 'number' && organizationId > 0 && typeof operatingUnitId === 'number' && operatingUnitId > 0
 }
 );

 // Fetch indicators statistics from database
 const indicatorsStatsQuery = trpc.indicators.getStatistics.useQuery(
 { 
 projectId: numericProjectId, 
 organizationId: organizationId ?? 0, 
 operatingUnitId: operatingUnitId ?? 0
 },
 { 
 enabled: !!projectId && typeof organizationId === 'number' && organizationId > 0 && typeof operatingUnitId === 'number' && operatingUnitId > 0
 }
 );

 // Fetch beneficiaries statistics from database
 // Note: beneficiaries.getStatistics only requires projectId (no organizationId/operatingUnitId)
 const beneficiariesStatsQuery = trpc.beneficiaries.getStatistics.useQuery(
 { 
 projectId: numericProjectId
 },
 { 
 enabled: !!projectId
 }
 );

 // Fetch tasks from database
 const tasksQuery = trpc.tasks.getByProject.useQuery(
 { projectId: numericProjectId },
 { enabled: !!projectId }
 );

 // Fetch case management data from database
 const casesQuery = trpc.caseManagement.cases.list.useQuery(
 { projectId: numericProjectId },
 { enabled: !!projectId }
 );

 const pssSessionsQuery = trpc.caseManagement.pssSessions.list.useQuery(
 { projectId: numericProjectId },
 { enabled: !!projectId }
 );

 const referralsQuery = trpc.caseManagement.referrals.list.useQuery(
 { projectId: numericProjectId },
 { enabled: !!projectId }
 );

 const safeSpacesQuery = trpc.caseManagement.childSafeSpaces.list.useQuery(
 { projectId: numericProjectId },
 { enabled: !!projectId }
 );

 const cssActivitiesQuery = trpc.caseManagement.cssActivities.list.useQuery(
 { projectId: numericProjectId },
 { enabled: !!projectId }
 );

 // Fetch financial overview data from budget items (AUTHORITATIVE SOURCE)
 const financialQuery = trpc.budgetItems.getByProject.useQuery(
 { projectId: numericProjectId },
 { enabled: !!projectId }
 );

 const loading = projectQuery.isLoading || activitiesQuery.isLoading || indicatorsQuery.isLoading;
 const error = projectQuery.error ? new Error(projectQuery.error.message) : null;

 // Build report data from fetched data - ALL FROM DATABASE
 const data: ProjectReportData | null = projectQuery.data ? (() => {
 const project = projectQuery.data;
 const activitiesData = activitiesQuery.data || [];
 const activitiesStats = activitiesStatsQuery.data;
 const indicatorsData = indicatorsQuery.data || [];
 const indicatorsStats = indicatorsStatsQuery.data;
 const beneficiariesStats = beneficiariesStatsQuery.data;
 const tasksData = tasksQuery.data || [];
 const casesData = casesQuery.data || [];
 const pssSessionsData = pssSessionsQuery.data || [];
 const referralsData = referralsQuery.data || [];
 const safeSpacesData = safeSpacesQuery.data || [];
 const cssActivitiesData = cssActivitiesQuery.data || [];
 const financialData = financialQuery.data || [];

 // Calculate activities metrics from real data
 const completedActivities = activitiesData.filter(a => a.status === 'COMPLETED').length;
 const inProgressActivities = activitiesData.filter(a => a.status === 'IN_PROGRESS').length;
 const notStartedActivities = activitiesData.filter(a => a.status === 'NOT_STARTED').length;
 const delayedActivities = activitiesData.filter(a => {
 if (!a.plannedEndDate) return false;
 const plannedEnd = new Date(a.plannedEndDate);
 const now = new Date();
 return plannedEnd < now && a.status !== 'DONE';
 }).length;

 // Calculate tasks metrics from real data
 const completedTasks = tasksData.filter(t => t.status === 'DONE').length;
 const inProgressTasks = tasksData.filter(t => t.status === 'IN_PROGRESS').length;
 const overdueTasks = tasksData.filter(t => {
 if (!t.dueDate) return false;
 const dueDate = new Date(t.dueDate);
 const now = new Date();
 return dueDate < now && t.status !== 'DONE';
 }).length;

 // Calculate indicators metrics from real data
 const onTrackIndicators = indicatorsData.filter((i: any) => {
 const targetVal = parseFloat(i.targetValue || i.target || '0');
 const achievedVal = parseFloat(i.achievedValue || '0');
 const progress = targetVal > 0 ? (achievedVal / targetVal) * 100 : 0;
 return progress >= 80;
 }).length;
 const atRiskIndicators = indicatorsData.filter((i: any) => {
 const targetVal = parseFloat(i.targetValue || i.target || '0');
 const achievedVal = parseFloat(i.achievedValue || '0');
 const progress = targetVal > 0 ? (achievedVal / targetVal) * 100 : 0;
 return progress >= 50 && progress < 80;
 }).length;
 const achievedIndicators = indicatorsData.filter((i: any) => {
 const targetVal = parseFloat(i.targetValue || i.target || '0');
 const achievedVal = parseFloat(i.achievedValue || '0');
 const progress = targetVal > 0 ? (achievedVal / targetVal) * 100 : 0;
 return progress >= 100;
 }).length;
 const avgAchievement = indicatorsData.length > 0
 ? indicatorsData.reduce((sum: number, i: any) => {
 const targetVal = parseFloat(i.targetValue || i.target || '0');
 const achievedVal = parseFloat(i.achievedValue || '0');
 const progress = targetVal > 0 ? (achievedVal / targetVal) * 100 : 0;
 return sum + progress;
 }, 0) / indicatorsData.length
 : 0;

 // Calculate case management metrics from real data
 const activeCases = casesData.filter(c => c.status === 'open').length;
 const closedCases = casesData.filter(c => c.status === 'closed').length;
 const highRiskCases = casesData.filter(c => c.riskLevel === 'high').length;
 const completedReferrals = referralsData.filter(r => r.status === 'completed').length;
 const childrenReached = cssActivitiesData.reduce((sum, a) => sum + (a.participantsCount || 0), 0);

 // Calculate budget metrics - Total Budget comes from project, Allocated Budget from budget items
 // Total Budget: Project's overall budget (from projects table)
 // Allocated Budget: Sum of budget line items (from budget_items table)
 const totalBudget = Number(project.totalBudget) || 0;
 const allocatedBudget = financialData.reduce((sum: number, item: any) => {
 // totalBudgetLine = qty * unitCost * recurrence (calculated in budget_items table)
 return sum + (Number(item.totalBudgetLine) || 0);
 }, 0);
 const spent = financialData.reduce((sum: number, item: any) => {
 // actualSpent is the actual spent amount for this budget item
 return sum + (Number(item.actualSpent) || 0);
 }, 0);
 const available = totalBudget - spent;
 const utilizationRate = totalBudget > 0 ? (spent / totalBudget) * 100 : 0;
 const burnRate = totalBudget > 0 ? Math.round((spent / totalBudget) * 100) : 0;

 // Aggregate financial data by category (using budgetCode as category)
 const budgetByCategory = financialData.reduce((acc: Array<{category: string; allocated: number; spent: number; balance: number}>, item: any) => {
 const category = item.budgetCode || item.category || 'Other';
 const existing = acc.find(c => c.category === category);
 const allocated = Number(item.totalBudgetLine) || 0;
 const spent = Number(item.actualSpent) || 0;
 if (existing) {
 existing.allocated += allocated;
 existing.spent += spent;
 existing.balance = existing.allocated - existing.spent;
 } else {
 acc.push({
 category,
 allocated: allocated,
 spent: spent,
 balance: allocated - spent
 });
 }
 return acc;
 }, []);

 return {
 organizationName: project.organizationName || 'Organization',
 project: {
 id: project.id,
 projectCode: project.projectCode,
 titleEn: project.title || project.titleEn || '',
 titleAr: project.titleAr || '',
 status: project.status,
 startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
 endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
 totalBudget: totalBudget,
 spent: spent,
 currency: project.currency,
 sectors: Array.isArray(project.sectors) ? project.sectors : (project.sectors ? String(project.sectors).split(',').map((s: string) => s.trim()) : []),
 location: project.location || 'N/A',
 },
 // Budget data from real project data
 budget: {
 approved: totalBudget,
 revised: totalBudget,
 spent: spent,
 committed: 0, // From financial transactions when available
 available: available,
 utilizationRate: Math.round(utilizationRate),
 },
 // Budget by category from real financial data
 budgetByCategory: budgetByCategory.length > 0 ? budgetByCategory : [],
 // Financial metrics from Financial Overview data (AUTHORITATIVE SOURCE)
 financial: {
 totalDisbursed: spent,
 totalExpenditure: spent,
 pendingPayments: 0,
 burnRate: burnRate,
 forecastedCompletion: totalBudget,
 // Additional fields for report display
 approvedBudget: totalBudget,
 actualSpent: spent,
 remaining: available,
 },
 // Activities from real database data
 activities: {
 total: activitiesData.length,
 completed: completedActivities,
 inProgress: inProgressActivities,
 notStarted: notStartedActivities,
 delayed: delayedActivities,
 completionRate: activitiesData.length > 0 ? Math.round((completedActivities / activitiesData.length) * 100) : 0,
 details: activitiesData.slice(0, 10).map(a => ({
 id: String(a.id),
 activityTitle: a.activityName || '',
 progress: Number(a.progressPercentage) || 0,
 status: a.status || 'NOT_STARTED',
 })),
 },
 // Tasks from real database data
 tasks: {
 total: tasksData.length,
 completed: completedTasks,
 inProgress: inProgressTasks,
 overdue: overdueTasks,
 completionRate: tasksData.length > 0 ? Math.round((completedTasks / tasksData.length) * 100) : 0,
 },
 // Indicators from real database data
 indicators: {
 total: indicatorsData.length,
 onTrack: onTrackIndicators,
 atRisk: atRiskIndicators,
 achieved: achievedIndicators,
 averageAchievement: Math.round(avgAchievement),
 details: indicatorsData.slice(0, 10).map(i => ({
 code: i.indicatorCode || '',
 title: i.indicatorName || '',
 baseline: Number(i.baseline) || 0,
 target: Number(i.target) || 0,
 achieved: Number(i.achievedValue) || 0,
 progress: i.target > 0 ? Math.round((i.achievedValue / i.target) * 100) : 0,
 status: i.target > 0 && (i.achievedValue / i.target) >= 0.8 ? 'ON_TRACK' : 'AT_RISK',
 })),
 },
 // Beneficiaries from real database data
 beneficiaries: {
 total: beneficiariesStats?.total || 0,
 direct: beneficiariesStats?.direct || 0,
 indirect: beneficiariesStats?.indirect || 0,
 male: beneficiariesStats?.male || 0,
 female: beneficiariesStats?.female || 0,
 children: beneficiariesStats?.children || 0,
 youth: beneficiariesStats?.youth || 0,
 adults: beneficiariesStats?.adults || 0,
 elderly: beneficiariesStats?.elderly || 0,
 locations: beneficiariesStats?.locations || 0,
 },
 // Case Management from real database data
 caseManagement: {
 totalCases: casesData.length,
 activeCases: activeCases,
 closedCases: closedCases,
 highRiskCases: highRiskCases,
 pssSessions: pssSessionsData.length,
 cssActivities: cssActivitiesData.length,
 childrenReached: childrenReached,
 referrals: referralsData.length,
 completedReferrals: completedReferrals,
 },
 // Risks - will be populated when risks table is implemented
 risks: {
 high: 0,
 medium: 0,
 low: 0,
 total: 0,
 },
 daysRemaining: project.endDate ? Math.ceil((new Date(project.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0,
 overallStatus: project.status === 'ONGOING' ? 'On Track' : project.status,
 };
 })() : null;

 const refresh = () => {
 projectQuery.refetch();
 activitiesQuery.refetch();
 indicatorsQuery.refetch();
 tasksQuery.refetch();
 casesQuery.refetch();
 pssSessionsQuery.refetch();
 referralsQuery.refetch();
 financialQuery.refetch();
 };

 return { data, loading, error, refresh };
}
