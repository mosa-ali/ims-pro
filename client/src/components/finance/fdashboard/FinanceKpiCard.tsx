// ============================================================================
// FINANCE DESIGN SYSTEM — FinanceKpiCard
// Standard KPI metric card with icon, value, label, trend indicator, and
// optional progress bar. Used across all finance dashboards.
// ============================================================================

import type { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { FinanceCard } from "./FinanceCard";
import { TYPE, TrendDirection } from "./tokens";

export interface FinanceKpiCardProps {
  label: string;
  value: string | number;
  /** Formatted sub-text (e.g. "+12% vs last month"). */
  meta?: string;
  /** Trend direction for the meta colour + icon. */
  trend?: TrendDirection;
  /** Whether "up" is good (green) or bad (red). Defaults to true. */
  upIsGood?: boolean;
  /** Lucide icon component. */
  icon: React.ElementType;
  /** Custom colour override for the value text. */
  valueColor?: string;
  /** Render a utilisation progress bar (0-100). */
  progressValue?: number;
  /** Accent border side colour. */
  accent?: "navy" | "critical" | "warning" | "success" | "info" | "none";
  /** Additional classes. */
  className?: string;
  /** LTR-force the numeric value (always LTR for numbers). */
  numericDir?: boolean;
}

function TrendIcon({ trend }: { trend: TrendDirection }) {
  if (trend === "up") return <TrendingUp className="h-3 w-3" />;
  if (trend === "down") return <TrendingDown className="h-3 w-3" />;
  return <Minus className="h-3 w-3" />;
}

function trendColor(trend: TrendDirection, upIsGood: boolean): string {
  if (trend === "stable") return "text-slate-400";
  const isPositive = (trend === "up" && upIsGood) || (trend === "down" && !upIsGood);
  return isPositive ? "text-green-700" : "text-red-600";
}

export function FinanceKpiCard({
  label,
  value,
  meta,
  trend,
  upIsGood = true,
  icon: Icon,
  valueColor,
  progressValue,
  accent = "none",
  className = "",
  numericDir = true,
}: FinanceKpiCardProps) {
  return (
    <FinanceCard accent={accent} noPadding className={`p-3 flex flex-col gap-1 ${className}`}>
      {/* Label + icon row */}
      <div className="flex items-center justify-between">
        <p className={TYPE.kpiLabel}>{label}</p>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>

      {/* Primary value */}
      <div
        className={`${TYPE.kpiValue} ${valueColor ?? "text-[#003b70]"}`}
        dir={numericDir ? "ltr" : undefined}
      >
        {value}
      </div>

      {/* Meta / trend */}
      {meta && (
        <p
          className={`${TYPE.kpiMeta} flex items-center gap-1 ${
            trend ? trendColor(trend, upIsGood) : "text-slate-400"
          }`}
        >
          {trend && <TrendIcon trend={trend} />}
          {meta}
        </p>
      )}

      {/* Optional progress bar */}
      {progressValue !== undefined && (
        <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-200">
          <div
            className="h-1.5 rounded-full transition-all"
            style={{
              width: `${Math.min(100, progressValue)}%`,
              background:
                progressValue > 100
                  ? "#c81e1e"
                  : progressValue > 85
                  ? "#d97706"
                  : "#003b70",
            }}
          />
        </div>
      )}
    </FinanceCard>
  );
}
