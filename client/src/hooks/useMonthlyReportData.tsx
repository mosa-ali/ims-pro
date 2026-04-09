/**
 * ============================================================================
 * MONTHLY REPORT DATA HOOK
 * ============================================================================
 * 
 * This hook extends useProjectReportData with month-based filtering.
 * It filters activities, indicators, and financial data by their updatedAt
 * date within the selected month range.
 * 
 * ============================================================================
 */

import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';
import { ProjectReportData } from './useProjectReportData';

// ============================================================================
// MONTHLY REPORT DATA HOOK
// ============================================================================

export function useMonthlyReportData(
 projectId: string, 
 year: number, 
 month: number
): {
  data: ProjectReportData | null;
 loading: boolean;
 error: Error | null;
 refresh: () => void;
 generatedAt: Date;
 periodStart: Date;
 periodEnd: Date;
} {
 const numericProjectId = parseInt(projectId);
 const { user } = useAuth();
 
 // Calculate month period
 const periodStart = new Date(year, month - 1, 1); // First day of month
 const periodEnd = new Date(year, month, 0, 23, 59, 59, 999); // Last day of month
 const generatedAt = new Date(); // Current timestamp when report is generated
 
 // Get organizationId and operatingUnitId from authenticated user
 const organizationId = user?.organizationId ?? null;
 const operatingUnitId = (user as any)?.operatingUnitId ?? null;

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

 // Fetch beneficiaries statistics from database
 const beneficiariesStatsQuery = trpc.beneficiaries.getStatistics.useQuery(
 { projectId: numericProjectId },
 { enabled: !!projectId }
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

 const cssActivitiesQuery = trpc.caseManagement.cssActivities.list.useQuery(
 { projectId: numericProjectId },
 { enabled: !!projectId }
 );

 // Fetch financial overview data from budget items
 const financialQuery = trpc.budgetItems.getByProject.useQuery(
 { projectId: numericProjectId },
 { enabled: !!projectId }
 );

 const loading = projectQuery.isLoading || activitiesQuery.isLoading || indicatorsQuery.isLoading;
 const error = projectQuery.error ? new Error(projectQuery.error.message) : null;

 // Helper function to check if a date is within the month range
 const isWithinMonth = (dateStr: string | Date | null | undefined): boolean => {
 if (!dateStr) return false;
 const date = new Date(dateStr);
 return date >= periodStart && date <= periodEnd;
 };

 // Build report data from fetched data - FILTERED BY MONTH
 const data: ProjectReportData | null = projectQuery.data ? (() => {
 const project = projectQuery.data;
 const allActivitiesData = activitiesQuery.data || [];
 const allIndicatorsData = indicatorsQuery.data || [];
 const beneficiariesStats = beneficiariesStatsQuery.data;
 const allTasksData = tasksQuery.data || [];
 const allCasesData = casesQuery.data || [];
 const allPssSessionsData = pssSessionsQuery.data || [];
 const allReferralsData = referralsQuery.data || [];
 const allCssActivitiesData = cssActivitiesQuery.data || [];
 const allFinancialData = financialQuery.data || [];

 // Filter data by updatedAt within the selected month
 const activitiesData = allActivitiesData.filter(a => isWithinMonth(a.updatedAt));
 const indicatorsData = allIndicatorsData.filter(i => isWithinMonth(i.updatedAt));
 const tasksData = allTasksData.filter(t => isWithinMonth(t.updatedAt));
 const casesData = allCasesData.filter(c => isWithinMonth(c.updatedAt));
 const pssSessionsData = allPssSessionsData.filter(p => isWithinMonth(p.updatedAt));
 const referralsData = allReferralsData.filter(r => isWithinMonth(r.updatedAt));
 const cssActivitiesData = allCssActivitiesData.filter(c => isWithinMonth(c.updatedAt));
 const financialData = allFinancialData.filter(f => isWithinMonth(f.updatedAt));

 // Calculate activities metrics from filtered data
 const completedActivities = activitiesData.filter(a => a.status === 'COMPLETED').length;
 const inProgressActivities = activitiesData.filter(a => a.status === 'IN_PROGRESS').length;
 const notStartedActivities = activitiesData.filter(a => a.status === 'NOT_STARTED').length;
 const delayedActivities = activitiesData.filter(a => {
 if (!a.plannedEndDate) return false;
 const plannedEnd = new Date(a.plannedEndDate);
 const now = new Date();
 return plannedEnd < now && a.status !== 'DONE';
 }).length;

 // Calculate tasks metrics from filtered data
 const completedTasks = tasksData.filter(t => t.status === 'DONE').length;
 const inProgressTasks = tasksData.filter(t => t.status === 'IN_PROGRESS').length;
 const overdueTasks = tasksData.filter(t => {
 if (!t.dueDate) return false;
 const dueDate = new Date(t.dueDate);
 const now = new Date();
 return dueDate < now && t.status !== 'DONE';
 }).length;

 // Calculate indicators metrics from filtered data
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

 // Calculate case management metrics from filtered data
 const activeCases = casesData.filter(c => c.status === 'open').length;
 const closedCases = casesData.filter(c => c.status === 'closed').length;
 const highRiskCases = casesData.filter(c => c.riskLevel === 'high').length;
 const completedReferrals = referralsData.filter(r => r.status === 'completed').length;
 const childrenReached = cssActivitiesData.reduce((sum, a) => sum + (a.participantsCount || 0), 0);

 // Calculate budget metrics from filtered financial data
 const totalBudget = Number(project.totalBudget) || 0;
 const allocatedBudget = financialData.reduce((sum: number, item: any) => {
 return sum + (Number(item.totalBudgetLine) || 0);
 }, 0);
 const spent = financialData.reduce((sum: number, item: any) => {
 return sum + (Number(item.actualSpent) || 0);
 }, 0);
 const available = totalBudget - spent;
 const utilizationRate = totalBudget > 0 ? (spent / totalBudget) * 100 : 0;
 const burnRate = totalBudget > 0 ? Math.round((spent / totalBudget) * 100) : 0;

 // Aggregate financial data by category
 const budgetByCategory = financialData.reduce((acc: Array<{category: string; allocated: number; spent: number; balance: number}>, item: any) => {
 const category = item.budgetCode || item.category || 'Other';
 const existing = acc.find(c => c.category === category);
 const allocated = Number(item.totalBudgetLine) || 0;
 const itemSpent = Number(item.actualSpent) || 0;
 if (existing) {
 existing.allocated += allocated;
 existing.spent += itemSpent;
 existing.balance = existing.allocated - existing.spent;
 } else {
 acc.push({
 category,
 allocated: allocated,
 spent: itemSpent,
 balance: allocated - itemSpent
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
 budget: {
 approved: totalBudget,
 revised: totalBudget,
 spent: spent,
 committed: 0,
 available: available,
 utilizationRate: Math.round(utilizationRate),
 },
 budgetByCategory: budgetByCategory.length > 0 ? budgetByCategory : [],
 financial: {
 totalDisbursed: spent,
 totalExpenditure: spent,
 pendingPayments: 0,
 burnRate: burnRate,
 forecastedCompletion: totalBudget,
 approvedBudget: totalBudget,
 actualSpent: spent,
 remaining: available,
 },
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
 tasks: {
 total: tasksData.length,
 completed: completedTasks,
 inProgress: inProgressTasks,
 overdue: overdueTasks,
 completionRate: tasksData.length > 0 ? Math.round((completedTasks / tasksData.length) * 100) : 0,
 },
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

 return { 
 data, 
 loading, 
 error, 
 refresh, 
 generatedAt,
 periodStart,
 periodEnd
 };
}
