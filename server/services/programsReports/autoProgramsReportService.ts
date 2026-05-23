/**
 * Auto Programs Report Service
 * 
 * Enterprise-grade aggregation engine for the Auto Programs Report.
 * Queries real database tables and computes analytics:
 * - Executive KPIs
 * - Financial analytics (budget burn, utilization, monthly trends)
 * - Implementation performance (activities, indicators, tasks)
 * - Risk & compliance metrics
 * - Beneficiary analytics
 * - Project health scoring
 * 
 * ALL queries enforce organization + operating unit isolation.
 */

import { eq, and, gte, lte, sql, desc, count, sum, inArray } from 'drizzle-orm';
import { getDb } from '../../db';
import {
  projects,
  grants,
  budgetItems,
  activities,
  indicators,
  beneficiaries,
  tasks,
  risks,
  reportingSchedules,
  forecastPlan,
  expenditures,
} from 'drizzle/schema';
import { calculateProjectHealth, type HealthStatus, type ProjectHealthResult } from '../../utils/projectHealthEngine';

// ============================================================
// TYPES
// ============================================================

export interface AutoReportFilters {
  organizationId: number;
  operatingUnitId: number;
  fromDate: string; // ISO date string YYYY-MM-DD
  toDate: string;   // ISO date string YYYY-MM-DD
  projectId?: number; // optional: specific project or all
}

export interface ExecutiveSummary {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  atRiskProjects: number;
  criticalProjects: number;
  totalBudget: number;
  totalSpent: number;
  utilizationPercent: number;
  totalBeneficiaries: number;
  overdueReports: number;
  expiringProjects: number; // ending within 60 days
}

export interface FinancialAnalytics {
  budgetVsSpent: Array<{ projectName: string; budget: number; spent: number }>;
  monthlyBurnTrend: Array<{ month: string; spent: number; budget: number }>;
  categoryBreakdown: Array<{ category: string; budget: number; spent: number }>;
  donorFunding: Array<{ donor: string; amount: number; spent: number }>;
  burnRateProjection: {
    currentBurnRate: number; // per month
    projectedEndDate: string;
    remainingBalance: number;
  };
}

export interface ImplementationPerformance {
  activityCompletionPercent: number;
  indicatorAchievementPercent: number;
  taskCompletionPercent: number;
  totalActivities: number;
  completedActivities: number;
  delayedActivities: number;
  totalIndicators: number;
  achievedIndicators: number;
  offTrackIndicators: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
}

export interface RiskCompliance {
  totalRisks: number;
  highRisks: number;
  criticalRisks: number;
  unresolvedRisks: number;
  overdueReports: number;
  totalScheduledReports: number;
  complianceScore: number;
}

export interface BeneficiaryAnalytics {
  totalReached: number;
  male: number;
  female: number;
  ageGroups: Array<{ group: string; count: number }>;
  communityTypes: Array<{ type: string; count: number }>;
  vulnerableGroups: number;
}

export interface ProjectHealthSummary {
  projectId: number;
  projectName: string;
  status: string;
  healthStatus: HealthStatus;
  healthScore: number;
  totalBudget: number;
  totalSpent: number;
  startDate: string;
  endDate: string;
}

export interface AutoReportData {
  executiveSummary: ExecutiveSummary;
  financialAnalytics: FinancialAnalytics;
  implementationPerformance: ImplementationPerformance;
  riskCompliance: RiskCompliance;
  beneficiaryAnalytics: BeneficiaryAnalytics;
  projectHealthList: ProjectHealthSummary[];
}

// ============================================================
// MAIN SERVICE FUNCTION
// ============================================================

export async function generateAutoReport(filters: AutoReportFilters): Promise<AutoReportData> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const { organizationId, operatingUnitId, fromDate, toDate, projectId } = filters;

  // 1. Get filtered projects (date overlap logic)
  const baseConditions = [
    eq(projects.organizationId, organizationId),
    eq(projects.operatingUnitId, operatingUnitId),
    eq(projects.isDeleted, 0),
    lte(projects.startDate, toDate),
    gte(projects.endDate, fromDate),
  ];

  if (projectId) {
    baseConditions.push(eq(projects.id, projectId));
  }

  const filteredProjects = await db
    .select({
      id: projects.id,
      title: projects.title,
      titleEn: projects.titleEn,
      status: projects.status,
      startDate: projects.startDate,
      endDate: projects.endDate,
      totalBudget: projects.totalBudget,
      spent: projects.spent,
      donor: projects.donor,
      sectors: projects.sectors,
      beneficiaryCount: projects.beneficiaryCount,
      physicalProgressPercentage: projects.physicalProgressPercentage,
    })
    .from(projects)
    .where(and(...baseConditions));

  if (filteredProjects.length === 0) {
    return getEmptyReport();
  }

  const projectIds = filteredProjects.map(p => p.id);

  // 2. Aggregate all data in parallel
  const [
    budgetData,
    activityData,
    indicatorData,
    beneficiaryData,
    taskData,
    riskData,
    reportingData,
    expenditureData,
  ] = await Promise.all([
    aggregateBudgetItems(db, projectIds, organizationId, operatingUnitId),
    aggregateActivities(db, projectIds, organizationId, operatingUnitId),
    aggregateIndicators(db, projectIds, organizationId, operatingUnitId),
    aggregateBeneficiaries(db, projectIds, organizationId, operatingUnitId),
    aggregateTasks(db, projectIds, organizationId, operatingUnitId),
    aggregateRisks(db, projectIds, organizationId, operatingUnitId),
    aggregateReportingSchedules(db, projectIds, organizationId, operatingUnitId, fromDate, toDate),
    aggregateExpenditures(db, projectIds, organizationId, operatingUnitId, fromDate, toDate),
  ]);

  // 3. Compute project health for each project
  const projectHealthList: ProjectHealthSummary[] = filteredProjects.map(p => {
    const pActivities = activityData.byProject[p.id] || { total: 0, completed: 0, delayed: 0 };
    const pIndicators = indicatorData.byProject[p.id] || { total: 0, achieved: 0, offTrack: 0 };
    const pTasks = taskData.byProject[p.id] || { total: 0, completed: 0, overdue: 0 };
    const pRisks = riskData.byProject[p.id] || { total: 0, high: 0, unresolved: 0 };

    const healthResult = calculateProjectHealth({
      startDate: p.startDate,
      endDate: p.endDate,
      status: p.status,
      totalBudget: Number(p.totalBudget || 0),
      totalSpent: Number(p.spent || 0),
      totalActivities: pActivities.total,
      completedActivities: pActivities.completed,
      delayedActivities: pActivities.delayed,
      totalIndicators: pIndicators.total,
      achievedIndicators: pIndicators.achieved,
      offTrackIndicators: pIndicators.offTrack,
      totalTasks: pTasks.total,
      completedTasks: pTasks.completed,
      overdueTasks: pTasks.overdue,
      totalRisks: pRisks.total,
      highRisks: pRisks.high,
      unresolvedRisks: pRisks.unresolved,
      targetBeneficiaries: Number(p.beneficiaryCount || 0),
      reachedBeneficiaries: beneficiaryData.byProject[p.id] || 0,
    });

    return {
      projectId: p.id,
      projectName: p.titleEn || p.title || `Project #${p.id}`,
      status: p.status,
      healthStatus: healthResult.status,
      healthScore: healthResult.score,
      totalBudget: Number(p.totalBudget || 0),
      totalSpent: Number(p.spent || 0),
      startDate: p.startDate,
      endDate: p.endDate,
    };
  });

  // 4. Executive Summary
  const now = new Date();
  const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const totalBudget = filteredProjects.reduce((s, p) => s + Number(p.totalBudget || 0), 0);
  const totalSpent = filteredProjects.reduce((s, p) => s + Number(p.spent || 0), 0);

  const executiveSummary: ExecutiveSummary = {
    totalProjects: filteredProjects.length,
    activeProjects: filteredProjects.filter(p => p.status === 'active').length,
    completedProjects: filteredProjects.filter(p => p.status === 'completed').length,
    atRiskProjects: projectHealthList.filter(p => p.healthStatus === 'At Risk').length,
    criticalProjects: projectHealthList.filter(p => p.healthStatus === 'Critical').length,
    totalBudget,
    totalSpent,
    utilizationPercent: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
    totalBeneficiaries: beneficiaryData.total,
    overdueReports: reportingData.overdue,
    expiringProjects: filteredProjects.filter(p => {
      const end = new Date(p.endDate);
      return end <= sixtyDaysFromNow && end >= now && p.status === 'active';
    }).length,
  };

  // 5. Financial Analytics
  const financialAnalytics: FinancialAnalytics = {
    budgetVsSpent: filteredProjects.slice(0, 15).map(p => ({
      projectName: (p.titleEn || p.title || '').substring(0, 30),
      budget: Number(p.totalBudget || 0),
      spent: Number(p.spent || 0),
    })),
    monthlyBurnTrend: expenditureData.monthlyTrend,
    categoryBreakdown: budgetData.categoryBreakdown,
    donorFunding: buildDonorFunding(filteredProjects),
    burnRateProjection: computeBurnRateProjection(totalBudget, totalSpent, expenditureData.monthlyTrend),
  };

  // 6. Implementation Performance
  const implementationPerformance: ImplementationPerformance = {
    activityCompletionPercent: activityData.total > 0 ? Math.round((activityData.completed / activityData.total) * 100) : 0,
    indicatorAchievementPercent: indicatorData.total > 0 ? Math.round((indicatorData.achieved / indicatorData.total) * 100) : 0,
    taskCompletionPercent: taskData.total > 0 ? Math.round((taskData.completed / taskData.total) * 100) : 0,
    totalActivities: activityData.total,
    completedActivities: activityData.completed,
    delayedActivities: activityData.delayed,
    totalIndicators: indicatorData.total,
    achievedIndicators: indicatorData.achieved,
    offTrackIndicators: indicatorData.offTrack,
    totalTasks: taskData.total,
    completedTasks: taskData.completed,
    overdueTasks: taskData.overdue,
  };

  // 7. Risk & Compliance
  const riskCompliance: RiskCompliance = {
    totalRisks: riskData.total,
    highRisks: riskData.high,
    criticalRisks: riskData.critical,
    unresolvedRisks: riskData.unresolved,
    overdueReports: reportingData.overdue,
    totalScheduledReports: reportingData.total,
    complianceScore: reportingData.total > 0
      ? Math.round(((reportingData.total - reportingData.overdue) / reportingData.total) * 100)
      : 100,
  };

  // 8. Beneficiary Analytics
  const beneficiaryAnalytics: BeneficiaryAnalytics = {
    totalReached: beneficiaryData.total,
    male: beneficiaryData.male,
    female: beneficiaryData.female,
    ageGroups: beneficiaryData.ageGroups,
    communityTypes: beneficiaryData.communityTypes,
    vulnerableGroups: beneficiaryData.vulnerable,
  };

  return {
    executiveSummary,
    financialAnalytics,
    implementationPerformance,
    riskCompliance,
    beneficiaryAnalytics,
    projectHealthList,
  };
}

// ============================================================
// AGGREGATION HELPERS
// ============================================================

async function aggregateBudgetItems(db: any, projectIds: number[], orgId: number, ouId: number) {
  if (projectIds.length === 0) return { categoryBreakdown: [] };

  const items = await db
    .select({
      category: budgetItems.category,
      totalBudget: sql<string>`SUM(${budgetItems.totalBudgetLine})`,
      totalSpent: sql<string>`SUM(${budgetItems.actualSpent})`,
    })
    .from(budgetItems)
    .where(and(
      inArray(budgetItems.projectId, projectIds),
      eq(budgetItems.organizationId, orgId),
      eq(budgetItems.isDeleted, 0),
    ))
    .groupBy(budgetItems.category);

  const categoryBreakdown = items.map((item: any) => ({
    category: item.category || 'Uncategorized',
    budget: Number(item.totalBudget || 0),
    spent: Number(item.totalSpent || 0),
  }));

  return { categoryBreakdown };
}

async function aggregateActivities(db: any, projectIds: number[], orgId: number, ouId: number) {
  if (projectIds.length === 0) return { total: 0, completed: 0, delayed: 0, byProject: {} };

  const rows = await db
    .select({
      projectId: activities.projectId,
      status: activities.status,
    })
    .from(activities)
    .where(and(
      inArray(activities.projectId, projectIds),
      eq(activities.organizationId, orgId),
      eq(activities.isDeleted, 0),
    ));

  const byProject: Record<number, { total: number; completed: number; delayed: number }> = {};
  let total = 0, completed = 0, delayed = 0;

  for (const row of rows) {
    total++;
    if (!byProject[row.projectId]) byProject[row.projectId] = { total: 0, completed: 0, delayed: 0 };
    byProject[row.projectId].total++;

    if (row.status === 'COMPLETED') {
      completed++;
      byProject[row.projectId].completed++;
    }
    if (row.status === 'ON_HOLD' || row.status === 'CANCELLED') {
      delayed++;
      byProject[row.projectId].delayed++;
    }
  }

  return { total, completed, delayed, byProject };
}

async function aggregateIndicators(db: any, projectIds: number[], orgId: number, ouId: number) {
  if (projectIds.length === 0) return { total: 0, achieved: 0, offTrack: 0, byProject: {} };

  const rows = await db
    .select({
      projectId: indicators.projectId,
      status: indicators.status,
    })
    .from(indicators)
    .where(and(
      inArray(indicators.projectId, projectIds),
      eq(indicators.organizationId, orgId),
      eq(indicators.isDeleted, 0),
    ));

  const byProject: Record<number, { total: number; achieved: number; offTrack: number }> = {};
  let total = 0, achieved = 0, offTrack = 0;

  for (const row of rows) {
    total++;
    if (!byProject[row.projectId]) byProject[row.projectId] = { total: 0, achieved: 0, offTrack: 0 };
    byProject[row.projectId].total++;

    if (row.status === 'ACHIEVED') {
      achieved++;
      byProject[row.projectId].achieved++;
    }
    if (row.status === 'OFF_TRACK') {
      offTrack++;
      byProject[row.projectId].offTrack++;
    }
  }

  return { total, achieved, offTrack, byProject };
}

async function aggregateBeneficiaries(db: any, projectIds: number[], orgId: number, ouId: number) {
  if (projectIds.length === 0) return { total: 0, male: 0, female: 0, ageGroups: [], communityTypes: [], vulnerable: 0, byProject: {} };

  const rows = await db
    .select({
      projectId: beneficiaries.projectId,
      gender: beneficiaries.gender,
      ageGroup: beneficiaries.ageGroup,
      communityType: beneficiaries.communityType,
      disabilityStatus: beneficiaries.disabilityStatus,
    })
    .from(beneficiaries)
    .where(and(
      inArray(beneficiaries.projectId, projectIds),
      eq(beneficiaries.organizationId, orgId),
      eq(beneficiaries.isDeleted, 0),
    ));

  const byProject: Record<number, number> = {};
  let total = 0, male = 0, female = 0, vulnerable = 0;
  const ageGroupMap: Record<string, number> = {};
  const communityTypeMap: Record<string, number> = {};

  for (const row of rows) {
    total++;
    if (!byProject[row.projectId]) byProject[row.projectId] = 0;
    byProject[row.projectId]++;

    if (row.gender === 'MALE') male++;
    if (row.gender === 'FEMALE') female++;
    if (row.disabilityStatus === 1) vulnerable++;

    if (row.ageGroup) {
      ageGroupMap[row.ageGroup] = (ageGroupMap[row.ageGroup] || 0) + 1;
    }
    if (row.communityType) {
      communityTypeMap[row.communityType] = (communityTypeMap[row.communityType] || 0) + 1;
    }
  }

  const ageGroups = Object.entries(ageGroupMap).map(([group, count]) => ({ group, count }));
  const communityTypes = Object.entries(communityTypeMap).map(([type, count]) => ({ type, count }));

  return { total, male, female, ageGroups, communityTypes, vulnerable, byProject };
}

async function aggregateTasks(db: any, projectIds: number[], orgId: number, ouId: number) {
  if (projectIds.length === 0) return { total: 0, completed: 0, overdue: 0, byProject: {} };

  const today = new Date().toISOString().split('T')[0];

  const rows = await db
    .select({
      projectId: tasks.projectId,
      status: tasks.status,
      dueDate: tasks.dueDate,
    })
    .from(tasks)
    .where(and(
      inArray(tasks.projectId, projectIds),
      eq(tasks.organizationId, orgId),
      eq(tasks.isDeleted, 0),
    ));

  const byProject: Record<number, { total: number; completed: number; overdue: number }> = {};
  let total = 0, completed = 0, overdue = 0;

  for (const row of rows) {
    total++;
    if (!byProject[row.projectId]) byProject[row.projectId] = { total: 0, completed: 0, overdue: 0 };
    byProject[row.projectId].total++;

    if (row.status === 'DONE') {
      completed++;
      byProject[row.projectId].completed++;
    }
    if (row.dueDate && row.dueDate < today && row.status !== 'DONE') {
      overdue++;
      byProject[row.projectId].overdue++;
    }
  }

  return { total, completed, overdue, byProject };
}

async function aggregateRisks(db: any, projectIds: number[], orgId: number, ouId: number) {
  if (projectIds.length === 0) return { total: 0, high: 0, critical: 0, unresolved: 0, byProject: {} };

  const rows = await db
    .select({
      projectId: risks.projectId,
      level: risks.level,
      status: risks.status,
    })
    .from(risks)
    .where(and(
      eq(risks.organizationId, orgId),
      eq(risks.isDeleted, 0),
    ));

  // Filter to only risks related to our projects (risks.projectId can be null for org-level risks)
  const relevantRows = rows.filter((r: any) => !r.projectId || projectIds.includes(r.projectId));

  const byProject: Record<number, { total: number; high: number; unresolved: number }> = {};
  let total = 0, high = 0, critical = 0, unresolved = 0;

  for (const row of relevantRows) {
    total++;
    const pid = row.projectId || 0;
    if (pid && !byProject[pid]) byProject[pid] = { total: 0, high: 0, unresolved: 0 };
    if (pid) byProject[pid].total++;

    if (row.level === 'high') {
      high++;
      if (pid) byProject[pid].high++;
    }
    if (row.level === 'critical') {
      critical++;
      high++; // count critical as high too for health engine
      if (pid) byProject[pid].high++;
    }
    if (row.status !== 'closed' && row.status !== 'mitigated') {
      unresolved++;
      if (pid) byProject[pid].unresolved++;
    }
  }

  return { total, high, critical, unresolved, byProject };
}

async function aggregateReportingSchedules(
  db: any, projectIds: number[], orgId: number, ouId: number,
  fromDate: string, toDate: string
) {
  if (projectIds.length === 0) return { total: 0, overdue: 0 };

  const today = new Date().toISOString().split('T')[0];

  const rows = await db
    .select({
      id: reportingSchedules.id,
      reportStatus: reportingSchedules.reportStatus,
      reportDeadline: reportingSchedules.reportDeadline,
    })
    .from(reportingSchedules)
    .where(and(
      inArray(reportingSchedules.projectId, projectIds),
      eq(reportingSchedules.organizationId, orgId),
      eq(reportingSchedules.isDeleted, 0),
    ));

  let total = rows.length;
  let overdue = 0;

  for (const row of rows) {
    if (
      row.reportDeadline < today &&
      row.reportStatus !== 'SUBMITTED_TO_DONOR' &&
      row.reportStatus !== 'SUBMITTED_TO_HQ'
    ) {
      overdue++;
    }
  }

  return { total, overdue };
}

async function aggregateExpenditures(
  db: any, projectIds: number[], orgId: number, ouId: number,
  fromDate: string, toDate: string
) {
  if (projectIds.length === 0) return { monthlyTrend: [] };

  // Get budget items with their updatedAt for monthly burn calculation
  const items = await db
    .select({
      updatedAt: budgetItems.updatedAt,
      actualSpent: budgetItems.actualSpent,
      totalBudgetLine: budgetItems.totalBudgetLine,
    })
    .from(budgetItems)
    .where(and(
      inArray(budgetItems.projectId, projectIds),
      eq(budgetItems.organizationId, orgId),
      eq(budgetItems.isDeleted, 0),
      gte(budgetItems.updatedAt, fromDate),
      lte(budgetItems.updatedAt, toDate),
    ));

  // Group by month
  const monthlyMap: Record<string, { spent: number; budget: number }> = {};

  for (const item of items) {
    if (!item.updatedAt) continue;
    const date = new Date(item.updatedAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { spent: 0, budget: 0 };
    monthlyMap[monthKey].spent += Number(item.actualSpent || 0);
    monthlyMap[monthKey].budget += Number(item.totalBudgetLine || 0);
  }

  // Sort and format
  const monthlyTrend = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      spent: Math.round(data.spent),
      budget: Math.round(data.budget),
    }));

  return { monthlyTrend };
}

// ============================================================
// UTILITY HELPERS
// ============================================================

function buildDonorFunding(projectList: any[]): Array<{ donor: string; amount: number; spent: number }> {
  const donorMap: Record<string, { amount: number; spent: number }> = {};

  for (const p of projectList) {
    const donor = p.donor || 'Unspecified';
    if (!donorMap[donor]) donorMap[donor] = { amount: 0, spent: 0 };
    donorMap[donor].amount += Number(p.totalBudget || 0);
    donorMap[donor].spent += Number(p.spent || 0);
  }

  return Object.entries(donorMap)
    .map(([donor, data]) => ({ donor, ...data }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);
}

function computeBurnRateProjection(
  totalBudget: number,
  totalSpent: number,
  monthlyTrend: Array<{ month: string; spent: number; budget: number }>
) {
  const remainingBalance = totalBudget - totalSpent;

  // Average monthly burn from last 3 months
  const recentMonths = monthlyTrend.slice(-3);
  const avgMonthlyBurn = recentMonths.length > 0
    ? recentMonths.reduce((s, m) => s + m.spent, 0) / recentMonths.length
    : 0;

  // Project when funds will be exhausted
  let projectedEndDate = '';
  if (avgMonthlyBurn > 0 && remainingBalance > 0) {
    const monthsRemaining = Math.ceil(remainingBalance / avgMonthlyBurn);
    const projected = new Date();
    projected.setMonth(projected.getMonth() + monthsRemaining);
    projectedEndDate = projected.toISOString().split('T')[0];
  }

  return {
    currentBurnRate: Math.round(avgMonthlyBurn),
    projectedEndDate,
    remainingBalance: Math.round(remainingBalance),
  };
}

function getEmptyReport(): AutoReportData {
  return {
    executiveSummary: {
      totalProjects: 0,
      activeProjects: 0,
      completedProjects: 0,
      atRiskProjects: 0,
      criticalProjects: 0,
      totalBudget: 0,
      totalSpent: 0,
      utilizationPercent: 0,
      totalBeneficiaries: 0,
      overdueReports: 0,
      expiringProjects: 0,
    },
    financialAnalytics: {
      budgetVsSpent: [],
      monthlyBurnTrend: [],
      categoryBreakdown: [],
      donorFunding: [],
      burnRateProjection: { currentBurnRate: 0, projectedEndDate: '', remainingBalance: 0 },
    },
    implementationPerformance: {
      activityCompletionPercent: 0,
      indicatorAchievementPercent: 0,
      taskCompletionPercent: 0,
      totalActivities: 0,
      completedActivities: 0,
      delayedActivities: 0,
      totalIndicators: 0,
      achievedIndicators: 0,
      offTrackIndicators: 0,
      totalTasks: 0,
      completedTasks: 0,
      overdueTasks: 0,
    },
    riskCompliance: {
      totalRisks: 0,
      highRisks: 0,
      criticalRisks: 0,
      unresolvedRisks: 0,
      overdueReports: 0,
      totalScheduledReports: 0,
      complianceScore: 100,
    },
    beneficiaryAnalytics: {
      totalReached: 0,
      male: 0,
      female: 0,
      ageGroups: [],
      communityTypes: [],
      vulnerableGroups: 0,
    },
    projectHealthList: [],
  };
}

// ============================================================
// PROJECT LIST FOR DROPDOWN
// ============================================================

export async function getProjectsList(organizationId: number, operatingUnitId: number) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: projects.id,
      title: projects.title,
      titleEn: projects.titleEn,
      status: projects.status,
      startDate: projects.startDate,
      endDate: projects.endDate,
    })
    .from(projects)
    .where(and(
      eq(projects.organizationId, organizationId),
      eq(projects.operatingUnitId, operatingUnitId),
      eq(projects.isDeleted, 0),
    ))
    .orderBy(desc(projects.createdAt));

  return rows.map(r => ({
    id: r.id,
    title: r.titleEn || r.title || `Project #${r.id}`,
    status: r.status,
    startDate: r.startDate,
    endDate: r.endDate,
  }));
}
