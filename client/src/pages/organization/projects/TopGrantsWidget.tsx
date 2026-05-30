import React, { memo } from "react";
import { useLocation } from "wouter";
import { TrendingUp, Clock, AlertTriangle, CheckCircle, Pause, FileText } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TopGrant {
  id: number;
  grantNumber: string | null;
  grantName: string;
  donorName: string;
  totalBudget: number;
  totalBudgetUSD: number;
  currency: string;
  spent: number;
  balance: number;
  budgetUtilization: number;
  status: "active" | "completed" | "pending" | "on_hold";
  endDate: string | null;
  daysRemaining: number | null;
  reportingStatus: string;
}

interface TopGrantsWidgetProps {
  grants: TopGrant[] | null | undefined;
  loading?: boolean;
  isRTL?: boolean;
  t?: Record<string, any>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * STATUS_CONFIG now accepts a `t` prop so labels are translated.
 * Fallbacks to English strings are kept for safety.
 */
function getStatusConfig(t: Record<string, any>) {
  return {
    active:    { label: t.statusActive    || "Active",    color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    completed: { label: t.statusCompleted || "Completed", color: "bg-blue-100 text-blue-700 border-blue-200" },
    pending:   { label: t.statusPending   || "Pending",   color: "bg-amber-100 text-amber-700 border-amber-200" },
    on_hold:   { label: t.statusOnHold    || "On Hold",   color: "bg-gray-100 text-gray-600 border-gray-200" },
  };
}

const REPORTING_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  on_track: { icon: <CheckCircle className="w-3.5 h-3.5" />, color: "text-emerald-600" },
  due:      { icon: <Clock className="w-3.5 h-3.5" />,        color: "text-amber-600" },
  overdue:  { icon: <AlertTriangle className="w-3.5 h-3.5" />, color: "text-red-600" },
};

function formatUSD(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function getBurnColor(pct: number): string {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 75) return "bg-amber-400";
  return "bg-emerald-500";
}

/**
 * getDaysLabel now accepts a `t` prop to translate "Expired" and "d left".
 */
function getDaysLabel(days: number | null, t: Record<string, any>): { text: string; color: string } {
  const expired = t.expired || "Expired";
  const dLeft   = t.dLeft   || "d left";

  if (days === null) return { text: "—", color: "text-gray-400" };
  if (days < 0)  return { text: expired,             color: "text-red-600 font-semibold" };
  if (days <= 30) return { text: `${days}${dLeft}`,  color: "text-red-600 font-semibold" };
  if (days <= 90) return { text: `${days}${dLeft}`,  color: "text-amber-600 font-semibold" };
  return { text: `${days}${dLeft}`, color: "text-gray-500" };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function GrantRowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3 px-4 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 bg-gray-200 rounded w-3/5" />
        <div className="h-3 bg-gray-100 rounded w-2/5" />
      </div>
      <div className="w-20 h-3 bg-gray-200 rounded" />
      <div className="w-16 h-5 bg-gray-100 rounded-full" />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TopGrantsWidget = memo(function TopGrantsWidget({
  grants,
  loading = false,
  isRTL = false,
  t = {},
}: TopGrantsWidgetProps) {
  const [, setLocation] = useLocation();

  const labels = {
    title:         t.topGrantsTitle        || "Top Grants",
    subtitle:      t.topGrantsSubtitle     || "Largest grants by portfolio value",
    viewAll:       t.viewAll               || "View All",
    noData:        t.noGrantData           || "No grants found",
    noDataSub:     t.noGrantDataSub        || "Grants will appear here once created",
    budget:        t.budget                || "Budget",
    utilization:   t.utilization           || "Utilization",
    expires:       t.expires               || "Expires",
    reporting:     t.reporting             || "Reporting",
  };

  // Build translated status config inside the component so it reacts to t changes
  const statusConfig = getStatusConfig(t);

  const handleViewAll = () => setLocation("/organization/grants");

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
            <FileText className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{labels.title}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{labels.subtitle}</p>
          </div>
        </div>
        <button
          onClick={handleViewAll}
          className="text-xs font-medium text-violet-600 hover:text-violet-700 hover:underline transition-colors"
        >
          {labels.viewAll} →
        </button>
      </div>

      {/* Body */}
      {loading ? (
        <div className="divide-y divide-gray-50">
          {Array.from({ length: 5 }).map((_, i) => <GrantRowSkeleton key={i} />)}
        </div>
      ) : !grants || grants.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <FileText className="w-10 h-10 text-gray-200 mb-3" />
          <p className="text-sm font-medium text-gray-500">{labels.noData}</p>
          <p className="text-xs text-gray-400 mt-1">{labels.noDataSub}</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {grants.map((grant, idx) => {
            const statusCfg  = statusConfig[grant.status] || statusConfig.pending;
            const reportCfg  = REPORTING_CONFIG[grant.reportingStatus] || REPORTING_CONFIG.on_track;
            const daysInfo   = getDaysLabel(grant.daysRemaining, t);
            const burnColor  = getBurnColor(grant.budgetUtilization);

            return (
              <div
                key={grant.id}
                className="flex items-start gap-3 py-3.5 px-5 hover:bg-gray-50/70 transition-colors group cursor-default"
              >
                {/* Rank badge */}
                <div className="w-6 h-6 rounded-full bg-violet-50 text-violet-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900 truncate max-w-[220px]">
                      {grant.grantName}
                    </span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400 truncate">{grant.donorName}</span>
                    {grant.grantNumber && (
                      <>
                        <span className="text-gray-200">·</span>
                        <span className="text-xs text-gray-400 font-mono">{grant.grantNumber}</span>
                      </>
                    )}
                  </div>

                  {/* Budget bar */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-gray-400">{labels.utilization}</span>
                      <span className="text-[10px] font-semibold text-gray-600">{grant.budgetUtilization}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${burnColor}`}
                        style={{ width: `${Math.min(grant.budgetUtilization, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Right column */}
                <div className="flex flex-col items-end gap-1.5 shrink-0 text-right">
                  <span className="text-sm font-semibold text-gray-800">
                    {formatUSD(grant.totalBudgetUSD)}
                  </span>
                  <span className={`text-[11px] ${daysInfo.color}`}>
                    {daysInfo.text}
                  </span>
                  <span className={`flex items-center gap-0.5 text-[11px] ${reportCfg.color}`}>
                    {reportCfg.icon}
                    <span className="capitalize">{grant.reportingStatus.replace("_", " ")}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default TopGrantsWidget;
