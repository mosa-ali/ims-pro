// Executive Program Management Dashboard for humanitarian NGO/INGO portfolio oversight.
// Replaces ProjectManagementDashboard.tsx

import React, { memo } from 'react';
import { FileText, Calendar, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { dashboardTranslations } from '@/i18n/projectMgmtDashboard.i18n';
import { useProgramDashboard } from './useProgramDashboard';
import { KPISection } from './KPISection';
import { PortfolioFinancialSnapshot } from './PortfolioFinancialSnapshot';
import { ExecutiveAlerts } from './ExecutiveAlerts';
import { ComplianceOverview } from './ComplianceOverview';
import { BeneficiaryProgress } from './BeneficiaryProgress';
import { ProjectOverviewTable } from './ProjectOverviewTable';
import TopGrantsWidget from './TopGrantsWidget';
import { ExpiringProjects } from './ExpiringProjects';
import { UpcomingReportingDeadlines } from "./UpcomingReportingDeadlines";

// ─── Navigation card ──────────────────────────────────────────────────────────

interface NavCardProps {
  icon: React.ReactNode;
  count: number | string;
  title: string;
  description: string;
  linkText: string;
  href: string;
  accent: string;
  isLoading?: boolean;
}

const NavCard = memo(function NavCard({
  icon, count, title, description, linkText, href, accent, isLoading,
}: NavCardProps) {
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-3" />
        <div className="h-4 bg-gray-100 rounded w-full mb-2" />
        <div className="h-4 bg-gray-100 rounded w-3/4" />
      </div>
    );
  }

  return (
    <div
      className="bg-white border border-gray-200 rounded-xl p-5 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all group"
      onClick={() => setLocation(href)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${accent}`}>{icon}</div>
        <span className="text-3xl font-bold text-gray-900">{count}</span>
      </div>
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <p className="text-xs text-gray-500 mt-1 mb-3">{description}</p>
      <button className="text-xs font-medium text-indigo-600 group-hover:underline">
        {linkText} →
      </button>
    </div>
  );
});

// ─── Main dashboard ───────────────────────────────────────────────────────────

export default function ProgramDashboard() {
  const { language, isRTL } = useLanguage();
  const [, setLocation] = useLocation();
  const t = dashboardTranslations[language as keyof typeof dashboardTranslations] || dashboardTranslations.en || dashboardTranslations.it;

  const {
    kpis, alerts, budgetTrend, statusDistribution, snapshot,
    compliance, activeCount, reportingCount, riskTable, beneficiarySummary,
    topGrants, upcomingReportingDeadlines, expiringProjects,
    financialSnapshot, financialSnapshotLoading,
    kpisLoading, alertsLoading, budgetTrendLoading, statusDistributionLoading,
    snapshotLoading, complianceLoading, activeCountLoading, reportingCountLoading,
    riskTableLoading, beneficiarySummaryLoading, topGrantsLoading, upcomingReportingDeadlinesLoading, expiringProjectsLoading,
  } = useProgramDashboard();

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-gray-50/50 p-4 md:p-6 space-y-6">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t.title}</h1>
        <p className="text-sm text-gray-500 mt-1">{t.subtitle}</p>
      </div>

      {/* ── Top navigation cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <NavCard
          icon={<FileText className="w-5 h-5 text-indigo-600" />}
          count={activeCount || 0}
          title={t.activeProjects?.title || 'Active Projects'}
          description={t.activeProjects?.description || 'View all active projects in portfolio'}
          linkText={t.activeProjects?.linkText || 'View Projects'}
          href="/organization/projects-list"
          accent="bg-indigo-50"
          isLoading={activeCountLoading}
        />
        <NavCard
          icon={<Calendar className="w-5 h-5 text-purple-600" />}
          count={reportingCount || 0}
          title={t.reportingSchedule?.title || 'Projects Reporting Schedule'}
          description={t.reportingSchedule?.description || 'Track reporting cycles and compliance'}
          linkText={t.reportingSchedule?.linkText || 'View Schedule'}
          href="/organization/reporting-schedule"
          accent="bg-purple-50"
          isLoading={reportingCountLoading}
        />
        <NavCard
          icon={<BarChart3 className="w-5 h-5 text-emerald-600" />}
          count={activeCount || 0}
          title={t.programsOverviewReport?.title || 'Programs Overview Report'}
          description={t.programsOverviewReport?.description || 'Executive dashboard with project health, budget analytics, and compliance metrics'}
          linkText={t.programsOverviewReport?.linkText || 'View Report'}
          href="/organization/auto-programs-report"
          accent="bg-emerald-50"
          isLoading={activeCountLoading}
        />
      </div>

      {/* ── Executive KPI strip ── */}
      <KPISection
        kpis={kpis}
        compliance={compliance}
        alerts={alerts}
        isLoading={kpisLoading || complianceLoading}
        t={t}
      />

      {/* ── Alerts (only when there are active alerts) ── */}
      {(alertsLoading || (alerts && (
        (alerts.atRisk?.length || 0) +
        (alerts.overBudget?.length || 0) +
        (alerts.expiringSoon?.length || 0) +
        (alerts.overdueReports?.length || 0)
      ))) && (
        <ExecutiveAlerts
          alerts={alerts}
          compliance={compliance}
          isLoading={alertsLoading}
          t={t}
        />
      )}

      {/* ── Portfolio Financial Snapshot ── */}
      <PortfolioFinancialSnapshot
        snapshot={financialSnapshot}
        isLoading={financialSnapshotLoading}
        t={t}
        isRTL={isRTL}
      />

      {/* ── Compliance + Beneficiary row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ComplianceOverview
          compliance={compliance ?? null}
          isLoading={complianceLoading}
          t={t}
        />
        <BeneficiaryProgress
          data={beneficiarySummary}
          isLoading={beneficiarySummaryLoading}
          t={t}
        />
      </div>

      {/* ── Top Grants + Upcoming Deadlines row (COMPACT WIDGET) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopGrantsWidget
          grants={topGrants}
          loading={topGrantsLoading}
          isRTL={isRTL}
          t={t}
        />
        {/* UPDATED: Now uses compact widget format with top 5 deadlines */}
        <UpcomingReportingDeadlines
          deadlines={(upcomingReportingDeadlines ?? null) as any}
          isLoading={upcomingReportingDeadlinesLoading}
          isRTL={isRTL}
          t={t}
        />
      </div>

      {/* ── Expiring Projects widget ── */}
        <ExpiringProjects
          projects={expiringProjects}
          isLoading={expiringProjectsLoading}
          isRTL={isRTL}
          t={t}
        />

      {/* ── Unified Project Overview Table (Risk + Snapshot merged) ── */}
      <ProjectOverviewTable
        data={(riskTable || []) as any}
        isLoading={riskTableLoading}
        t={t}
        isRTL={isRTL}
        onProjectClick={(id) => setLocation(`/organization/projects/${id}`)}
      />
    </div>
  );
}