// useProgramDashboard.ts
// Custom hook that aggregates all tRPC queries for the Program Management Dashboard.
// All queries are scoped to organizationId + operatingUnitId.

import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';

export function useProgramDashboard() {
  const { currentOrganizationId } = useOrganization();
  const { currentOperatingUnitId } = useOperatingUnit();

  const ouId = useMemo(
    () =>
      typeof currentOperatingUnitId === 'string'
        ? parseInt(currentOperatingUnitId, 10)
        : currentOperatingUnitId || 0,
    [currentOperatingUnitId]
  );

  const enabled = !!currentOrganizationId && !!currentOperatingUnitId;
  const baseInput = { organizationId: currentOrganizationId || 0, operatingUnitId: ouId };

  const kpisQuery = trpc.projects.getDashboardKPIs.useQuery(baseInput, { enabled, refetchInterval: 300000 });
  const alertsQuery = trpc.projects.getAlerts.useQuery(baseInput, { enabled, refetchInterval: 300000 });
  const budgetTrendQuery = trpc.projects.getBudgetTrend.useQuery(
    { ...baseInput, months: 12 },
    { enabled }
  );
  const statusDistributionQuery = trpc.projects.getStatusDistribution.useQuery(baseInput, { enabled });
  const snapshotQuery = trpc.projects.getSnapshot.useQuery(
    { ...baseInput, limit: 10 },
    { enabled }
  );
  const complianceQuery = trpc.projects.getReportingCompliance.useQuery(baseInput, { enabled, refetchInterval: 300000 });
  const activeCountQuery = trpc.projects.getActiveCount.useQuery(baseInput, { enabled });
  const reportingCountQuery = trpc.projects.getReportingSchedulesCount.useQuery(baseInput, { enabled });
  const riskTableQuery = trpc.projects.getProjectRiskTable.useQuery(
    { ...baseInput, limit: 20 },
    { enabled }
  );

  // Beneficiary summary — uses beneficiaries router, scoped to org/OU via ctx.scope
  // Input is not used by the procedure (it reads from ctx.scope), but we pass it
  // to satisfy the input schema and keep the query reactive to scope changes.
  const beneficiarySummaryQuery = trpc.beneficiaries.getBeneficiarySummary.useQuery(
    baseInput,
    { enabled }
  );

  // Top grants — uses grantsRouter.getTopGrantsForDashboard
  // Returns top 5 grants by portfolio value with budget utilization and expiry info
  const topGrantsQuery = trpc.grants.getTopGrantsForDashboard.useQuery(
    { limit: 5 },
    { enabled }
  );

  // Upcoming reporting deadlines — next 30 days
  // Uses reportingSchedules to fetch overdue and upcoming reports
  const upcomingReportingDeadlinesQuery = trpc.projects.getUpcomingReportingDeadlines.useQuery(
    { ...baseInput, daysAhead: 30 },
    { enabled, refetchInterval: 300000 } // 5 minute auto-refresh for compliance monitoring
  );

  // Expiring projects — ending in 30/60/90 days
  // Critical for closeout preparation and extension planning
  const expiringProjectsQuery = trpc.projects.getExpiringProjects.useQuery(
    { ...baseInput, daysAhead: 90 },
    { enabled, refetchInterval: 300000 } // 5 minute auto-refresh
  );

  // Portfolio Financial Snapshot — real budget/grant aggregation for the KPI card.
  // Replaces BurnRateAnalytics. Reads from approved+revised budgets and ongoing grants.
  // Procedure uses ctx.scope internally so input is empty object.
  const financialSnapshotQuery = trpc.projects.getPortfolioFinancialSnapshot.useQuery(
    {},
    { enabled, refetchInterval: 300000 } // 5 minute auto-refresh
  );

  const isAnyLoading =
    kpisQuery.isLoading ||
    alertsQuery.isLoading ||
    budgetTrendQuery.isLoading ||
    statusDistributionQuery.isLoading;

  return {
    // Data
    kpis: kpisQuery.data,
    alerts: alertsQuery.data,
    budgetTrend: budgetTrendQuery.data,
    statusDistribution: statusDistributionQuery.data,
    snapshot: snapshotQuery.data,
    compliance: complianceQuery.data,
    activeCount: activeCountQuery.data,
    reportingCount: reportingCountQuery.data,
    riskTable: riskTableQuery.data,
    beneficiarySummary: beneficiarySummaryQuery.data,
    topGrants: topGrantsQuery.data,
    upcomingReportingDeadlines: upcomingReportingDeadlinesQuery.data,
    expiringProjects: expiringProjectsQuery.data,
    financialSnapshot: financialSnapshotQuery.data,

    // Loading states
    kpisLoading: kpisQuery.isLoading,
    alertsLoading: alertsQuery.isLoading,
    budgetTrendLoading: budgetTrendQuery.isLoading,
    statusDistributionLoading: statusDistributionQuery.isLoading,
    snapshotLoading: snapshotQuery.isLoading,
    complianceLoading: complianceQuery.isLoading,
    activeCountLoading: activeCountQuery.isLoading,
    reportingCountLoading: reportingCountQuery.isLoading,
    riskTableLoading: riskTableQuery.isLoading,
    beneficiarySummaryLoading: beneficiarySummaryQuery.isLoading,
    topGrantsLoading: topGrantsQuery.isLoading,
    upcomingReportingDeadlinesLoading: upcomingReportingDeadlinesQuery.isLoading,
    expiringProjectsLoading: expiringProjectsQuery.isLoading,
    financialSnapshotLoading: financialSnapshotQuery.isLoading,
    isAnyLoading,

    // Context
    organizationId: currentOrganizationId,
    operatingUnitId: ouId,
    enabled,
  };
}

// ─── Shared formatting helpers ────────────────────────────────────────────────

export function formatCurrencyCompact(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount.toFixed(0)}`;
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${(value || 0).toFixed(decimals)}%`;
}

export function riskColor(level: string): string {
  switch (level) {
    case 'critical': return 'text-red-700 bg-red-100 border-red-200';
    case 'high':     return 'text-orange-700 bg-orange-100 border-orange-200';
    case 'medium':   return 'text-amber-700 bg-amber-100 border-amber-200';
    default:         return 'text-emerald-700 bg-emerald-100 border-emerald-200';
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case 'active':    return 'text-emerald-700 bg-emerald-100';
    case 'on_hold':   return 'text-amber-700 bg-amber-100';
    case 'planning':  return 'text-blue-700 bg-blue-100';
    case 'completed': return 'text-gray-700 bg-gray-100';
    case 'cancelled': return 'text-red-700 bg-red-100';
    default:          return 'text-gray-700 bg-gray-100';
  }
}

export function burnHealthColor(health: string): string {
  switch (health) {
    case 'critical': return 'text-red-600';
    case 'warning':  return 'text-amber-600';
    default:         return 'text-emerald-600';
  }
}

export function formatDateLocalized(dateStr: string | Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateStr));
}
