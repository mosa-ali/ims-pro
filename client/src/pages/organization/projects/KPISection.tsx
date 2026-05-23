// KPISection.tsx
// Executive KPI summary strip — compact metric cards with trend indicators.

import React, { memo } from 'react';
import {
  TrendingUp, TrendingDown, AlertTriangle, FileWarning,
  Users, Clock, ShieldCheck, Wallet, Activity,
} from 'lucide-react';
import { formatCurrencyCompact, formatPercentage } from './useProgramDashboard';

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  severity?: 'ok' | 'warn' | 'critical';
  isLoading?: boolean;
}

const MetricCard = memo(function MetricCard({
  icon, label, value, subValue, trend, severity = 'ok', isLoading,
}: MetricCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />
        <div className="h-4 bg-gray-100 rounded w-3/4" />
      </div>
    );
  }

  const severityBorder = {
    ok:       'border-l-4 border-l-emerald-400',
    warn:     'border-l-4 border-l-amber-400',
    critical: 'border-l-4 border-l-red-500',
  }[severity];

  const trendIcon =
    trend === 'up'   ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> :
    trend === 'down' ? <TrendingDown className="w-3.5 h-3.5 text-red-500" /> :
    null;

  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm ${severityBorder} flex flex-col gap-1`}>
      <div className="flex items-center justify-between">
        <span className="text-gray-400">{icon}</span>
        {trendIcon}
      </div>
      <div className="text-2xl font-bold text-gray-900 leading-tight">{value}</div>
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</div>
      {subValue && <div className="text-xs text-gray-400">{subValue}</div>}
    </div>
  );
});

interface KPISectionProps {
  kpis: any;
  compliance: any;
  alerts: any;
  isLoading: boolean;
  t: Record<string, any>;
}

export const KPISection = memo(function KPISection({
  kpis, compliance, alerts, isLoading, t,
}: KPISectionProps) {
  const totalAlerts = alerts?.summary?.totalAlerts || 0;
  const overdueReports = compliance?.overdueReports || 0;
  const complianceRate = compliance?.reportingComplianceRate || 0;

  const cards: MetricCardProps[] = [
    {
      icon: <Activity className="w-5 h-5" />,
      label: t.kpi?.activeProjects || 'Active Programs',
      value: kpis?.onTrackCount || 0,
      subValue: `${kpis?.totalProjects || 0} total`,
      severity: 'ok',
    },
    {
      icon: <Wallet className="w-5 h-5" />,
      label: t.kpi?.portfolioBudget || 'Total Portfolio Value',
      value: formatCurrencyCompact(kpis?.totalBudgetUSD || 0),
      subValue: `${formatCurrencyCompact(kpis?.totalSpentUSD || 0)} spent`,
      severity: 'ok',
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      label: t.kpi?.burnRate || 'Portfolio Burn Rate',
      value: formatPercentage(kpis?.burnRatePercent || 0),
      subValue: `${formatCurrencyCompact(kpis?.balanceUSD || 0)} remaining`,
      severity: (kpis?.burnRatePercent || 0) > 90 ? 'critical' : (kpis?.burnRatePercent || 0) > 75 ? 'warn' : 'ok',
      trend: (kpis?.burnRatePercent || 0) > 75 ? 'up' : 'neutral',
    },
    {
      icon: <AlertTriangle className="w-5 h-5" />,
      label: t.kpi?.projectsAtRisk || 'Projects at Risk',
      value: kpis?.atRiskCount || 0,
      subValue: `${kpis?.overBudgetCount || 0} over budget`,
      severity: (kpis?.atRiskCount || 0) > 0 ? 'critical' : 'ok',
      trend: (kpis?.atRiskCount || 0) > 0 ? 'up' : 'neutral',
    },
    {
      icon: <FileWarning className="w-5 h-5" />,
      label: t.kpi?.overdueReports || 'Overdue Reports',
      value: overdueReports,
      subValue: `${compliance?.pendingReports || 0} pending`,
      severity: overdueReports > 0 ? 'critical' : 'ok',
    },
    {
      icon: <Clock className="w-5 h-5" />,
      label: t.kpi?.expiringGrants || 'Expiring in 30d',
      value: kpis?.expiringCount || 0,
      subValue: 'projects expiring soon',
      severity: (kpis?.expiringCount || 0) > 0 ? 'warn' : 'ok',
    },
    {
      icon: <ShieldCheck className="w-5 h-5" />,
      label: t.kpi?.complianceScore || 'Reporting Compliance',
      value: formatPercentage(complianceRate),
      subValue: `${compliance?.completedReports || 0} / ${compliance?.totalSchedules || 0} submitted`,
      severity: complianceRate < 50 ? 'critical' : complianceRate < 80 ? 'warn' : 'ok',
      trend: complianceRate >= 80 ? 'up' : 'down',
    },
    {
      icon: <Users className="w-5 h-5" />,
      label: t.kpi?.totalAlerts || 'Operational Alerts',
      value: totalAlerts,
      subValue: `${alerts?.summary?.atRiskCount || 0} at-risk, ${alerts?.summary?.overBudgetCount || 0} over budget`,
      severity: totalAlerts > 5 ? 'critical' : totalAlerts > 0 ? 'warn' : 'ok',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3 mb-6">
      {cards.map((card, idx) => (
        <MetricCard key={idx} {...card} isLoading={isLoading} />
      ))}
    </div>
  );
});
