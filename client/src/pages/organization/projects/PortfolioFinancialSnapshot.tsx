// ============================================================================
// PORTFOLIO FINANCIAL SNAPSHOT
// Executive-level KPI grid showing real portfolio financial health.
// Data comes exclusively from getPortfolioFinancialSnapshot backend procedure.
// No charts, no projections, no fake data — only real database values.
// Supports RTL/LTR, mobile-first responsive layout.
// ============================================================================

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, TrendingDown, Wallet, BarChart2, Landmark, Flame } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PortfolioFinancialSnapshotData {
  totalBudget: number;
  totalSpent: number;
  remainingBalance: number;
  utilizationRate: number;
  activeProjects: number;
  activeGrants: number;
  activeGrantsValue?: number;
}

interface PortfolioFinancialSnapshotProps {
  snapshot?: PortfolioFinancialSnapshotData;
  isLoading: boolean;
  /** Translation object — only keys used here need to be present */
  t?: Record<string, any>;
  isRTL?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format large USD numbers as compact strings: 1 500 000 → $1.5M. Handles negatives. */
function formatUSD(value: number): string {
  const abs = Math.abs(value);
  const prefix = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${prefix}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `${prefix}$${(abs / 1_000).toFixed(1)}K`;
  return `${prefix}$${abs.toLocaleString()}`;
}

/** Full number with thousands separator for the sub-label */
function formatUSDFull(value: number): string {
  return `$${Math.abs(value).toLocaleString('en-US')} USD`;
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  subLabel?: string;
  icon: React.ReactNode;
  colorClass: string;
  textColorClass: string;
  iconBgClass: string;
  /** Optional utilization bar (0–100) */
  utilizationPct?: number;
  utilizationBarClass?: string;
  isRTL?: boolean;
}

function KpiCard({
  label,
  value,
  subLabel,
  icon,
  colorClass,
  textColorClass,
  iconBgClass,
  utilizationPct,
  utilizationBarClass = 'bg-purple-500',
  isRTL,
}: KpiCardProps) {
  return (
    <div
      className={`rounded-xl p-3 ${colorClass} flex flex-col gap-1`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-gray-500 leading-tight">{label}</span>
        <div className={`w-6 h-6 rounded-full ${iconBgClass} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
      </div>
      <div className={`text-base font-bold ${textColorClass} leading-none tracking-tight`}>
        {value}
      </div>
      {utilizationPct !== undefined && (
        <div className="w-full bg-white/60 rounded-full h-1 overflow-hidden">
          <div
            className={`h-1 rounded-full ${utilizationBarClass} transition-all duration-500`}
            style={{ width: `${Math.min(100, Math.max(0, utilizationPct))}%` }}
          />
        </div>
      )}
      {subLabel && (
        <div className="text-xs text-gray-500 leading-snug">{subLabel}</div>
      )}
    </div>
  );
}

// ─── Loading skeleton ────────────────────────────────────────────────────────

function SnapshotSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl bg-gray-50 p-3 flex flex-col gap-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-1.5 w-full rounded-full" />
          <Skeleton className="h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

// ─── Translation helper ───────────────────────────────────────────────────────
function lbl(t: Record<string, any> | undefined, key: string, fallback: string): string {
  return t?.projectMgmtDashboard?.[key] ?? fallback;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function PortfolioFinancialSnapshot({
  snapshot,
  isLoading,
  t,
  isRTL = false,
}: PortfolioFinancialSnapshotProps) {
  // Utilization bar colour based on rate
  const utilizationBarClass =
    (snapshot?.utilizationRate ?? 0) > 90
      ? 'bg-red-500'
      : (snapshot?.utilizationRate ?? 0) > 70
      ? 'bg-amber-500'
      : 'bg-purple-500';

  const utilizationSubLabel = !snapshot
    ? ''
    : snapshot.utilizationRate > 90
    ? lbl(t, 'highUtilization', 'High utilization — review remaining funds')
    : snapshot.utilizationRate > 70
    ? lbl(t, 'onTrack', 'On track')
    : lbl(t, 'budgetAvailable', 'Budget available');

  return (
    <Card className="border border-gray-200 shadow-sm" dir={isRTL ? 'rtl' : 'ltr'}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-gray-800">
          {lbl(t, 'portfolioFinancialSnapshot', 'Portfolio Financial Snapshot')}
        </CardTitle>
        {snapshot && !isLoading && (
          <p className="text-xs text-gray-500 mt-0.5">
            {snapshot.activeProjects}{' '}
            {lbl(t, 'activeProject', 'active project')}{snapshot.activeProjects !== 1 ? 's' : ''}
            {snapshot.activeGrants > 0
              ? ` · ${snapshot.activeGrants} ${lbl(t, 'activeGrant', 'active grant')}${snapshot.activeGrants !== 1 ? 's' : ''}`
              : ''}
          </p>
        )}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <SnapshotSkeleton />
        ) : !snapshot ? (
          <div className="py-8 text-center text-sm text-gray-400">
            {lbl(t, 'noFinancialData', 'No financial data available')}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* ── Required 4 KPIs ─────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
              {/* 1. Approved Budget */}
              <KpiCard
                label={lbl(t, 'totalBudgetLabel', 'Approved Budget')}
                value={formatUSD(snapshot.totalBudget)}
                subLabel={formatUSDFull(snapshot.totalBudget)}
                icon={<DollarSign className="w-3 h-3 text-blue-600" />}
                colorClass="bg-blue-50"
                textColorClass="text-blue-700"
                iconBgClass="bg-blue-100"
                isRTL={isRTL}
              />

              {/* 2. Total Spent */}
              <KpiCard
                label={lbl(t, 'actualSpent', 'Total Spent')}
                value={formatUSD(snapshot.totalSpent)}
                subLabel={formatUSDFull(snapshot.totalSpent)}
                icon={<TrendingDown className="w-3 h-3 text-red-600" />}
                colorClass="bg-red-50"
                textColorClass="text-red-700"
                iconBgClass="bg-red-100"
                isRTL={isRTL}
              />

              {/* 3. Remaining Balance */}
              <KpiCard
                label={lbl(t, 'balance', 'Remaining Balance')}
                value={formatUSD(snapshot.remainingBalance)}
                subLabel={formatUSDFull(snapshot.remainingBalance)}
                icon={<Wallet className="w-3 h-3 text-green-600" />}
                colorClass={snapshot.remainingBalance < 0 ? 'bg-red-50' : 'bg-green-50'}
                textColorClass={snapshot.remainingBalance < 0 ? 'text-red-700' : 'text-green-700'}
                iconBgClass={snapshot.remainingBalance < 0 ? 'bg-red-100' : 'bg-green-100'}
                isRTL={isRTL}
              />

              {/* 4. Utilization Rate */}
              <KpiCard
                label={lbl(t, 'budgetUtilization', 'Utilization Rate')}
                value={`${snapshot.utilizationRate.toFixed(1)}%`}
                subLabel={utilizationSubLabel}
                icon={<BarChart2 className="w-3 h-3 text-purple-600" />}
                colorClass="bg-purple-50"
                textColorClass="text-purple-700"
                iconBgClass="bg-purple-100"
                utilizationPct={snapshot.utilizationRate}
                utilizationBarClass={utilizationBarClass}
                isRTL={isRTL}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
