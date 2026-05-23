import React, { memo } from "react";
import { useLocation } from "wouter";
import { Users } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TopDonor {
  id: number;
  name: string;
  type: string | null;
  activeGrants: number;
  totalCommitted: number;
  totalUtilized: number;
  utilizationRate: number;
}

interface TopDonorsWidgetProps {
  donors: TopDonor[] | null | undefined;
  loading?: boolean;
  isRTL?: boolean;
  t?: Record<string, any>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  bilateral:     "bg-blue-50 text-blue-700",
  multilateral:  "bg-indigo-50 text-indigo-700",
  foundation:    "bg-violet-50 text-violet-700",
  corporate:     "bg-emerald-50 text-emerald-700",
  individual:    "bg-amber-50 text-amber-700",
  government:    "bg-sky-50 text-sky-700",
  ngo:           "bg-teal-50 text-teal-700",
  other:         "bg-gray-50 text-gray-600",
};

const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
];

function formatUSD(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
}

function getUtilizationColor(pct: number): string {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 75) return "bg-amber-400";
  return "bg-emerald-500";
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DonorRowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3 px-4 animate-pulse">
      <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 bg-gray-200 rounded w-2/5" />
        <div className="h-3 bg-gray-100 rounded w-1/4" />
      </div>
      <div className="w-16 h-3 bg-gray-200 rounded" />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TopDonorsWidget = memo(function TopDonorsWidget({
  donors,
  loading = false,
  isRTL = false,
  t = {},
}: TopDonorsWidgetProps) {
  const [, setLocation] = useLocation();

  const labels = {
    title:       t.topDonorsTitle    || "Top Donors",
    subtitle:    t.topDonorsSubtitle || "Donors by committed funding",
    viewAll:     t.viewAll           || "View All",
    noData:      t.noDonorData       || "No donors found",
    noDataSub:   t.noDonorDataSub    || "Donors will appear here once added",
    committed:   t.committed         || "Committed",
    utilized:    t.utilized          || "Utilized",
    grants:      t.grants            || "grants",
    active:      t.active            || "active",
  };

  const handleViewAll = () => setLocation("/organization/donors");

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{labels.title}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{labels.subtitle}</p>
          </div>
        </div>
        <button
          onClick={handleViewAll}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
        >
          {labels.viewAll} →
        </button>
      </div>

      {/* Body */}
      {loading ? (
        <div className="divide-y divide-gray-50">
          {Array.from({ length: 5 }).map((_, i) => <DonorRowSkeleton key={i} />)}
        </div>
      ) : !donors || donors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <Users className="w-10 h-10 text-gray-200 mb-3" />
          <p className="text-sm font-medium text-gray-500">{labels.noData}</p>
          <p className="text-xs text-gray-400 mt-1">{labels.noDataSub}</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {donors.map((donor, idx) => {
            const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
            const typeColor   = TYPE_COLORS[donor.type || "other"] || TYPE_COLORS.other;
            const utilColor   = getUtilizationColor(donor.utilizationRate);

            return (
              <div
                key={donor.id}
                className="flex items-start gap-3 py-3.5 px-5 hover:bg-gray-50/70 transition-colors"
              >
                {/* Avatar */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor}`}>
                  {getInitials(donor.name)}
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                      {donor.name}
                    </span>
                    {donor.type && (
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium capitalize ${typeColor}`}>
                        {donor.type}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-gray-400">
                      {donor.activeGrants} {labels.active} {labels.grants}
                    </span>
                  </div>

                  {/* Utilization bar */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-gray-400">
                        {labels.utilized}: {formatUSD(donor.totalUtilized)} / {formatUSD(donor.totalCommitted)}
                      </span>
                      <span className="text-[10px] font-semibold text-gray-600">
                        {donor.utilizationRate}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${utilColor}`}
                        style={{ width: `${Math.min(donor.utilizationRate, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Committed amount */}
                <div className="shrink-0 text-right">
                  <span className="text-sm font-semibold text-gray-800">
                    {formatUSD(donor.totalCommitted)}
                  </span>
                  <p className="text-[10px] text-gray-400 mt-0.5">{labels.committed}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default TopDonorsWidget;
