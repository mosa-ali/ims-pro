// ============================================================================
// FINANCE DESIGN SYSTEM — ComplianceIndicator / RiskIndicator / HealthGauge
// Reusable progress-bar indicators for compliance, risk and health scores.
// ============================================================================

import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { ComplianceStatus, TrendDirection, scoreToColor, scoreToStatus, COMPLIANCE_PALETTE } from "./tokens";

// ─── ComplianceIndicator ──────────────────────────────────────────────────────

interface ComplianceIndicatorProps {
  label: string;
  score: number;
  trend?: TrendDirection;
  /** Show the score percentage text. Default: true. */
  showScore?: boolean;
  /** Width of the progress bar track in Tailwind class. */
  barWidth?: string;
  className?: string;
}

function TrendIcon({ trend }: { trend: TrendDirection }) {
  if (trend === "up") return <TrendingUp className="h-3.5 w-3.5 text-green-600" />;
  if (trend === "down") return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
  return <Minus className="h-3.5 w-3.5 text-slate-400" />;
}

export function ComplianceIndicator({
  label,
  score,
  trend,
  showScore = true,
  barWidth = "w-28",
  className = "",
}: ComplianceIndicatorProps) {
  const status = scoreToStatus(score);
  const color = scoreToColor(score);
  const palette = COMPLIANCE_PALETTE[status];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Status dot */}
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: palette.color }}
      />

      {/* Label */}
      <span className="min-w-0 flex-1 text-[12px] font-medium text-slate-700">{label}</span>

      {/* Progress bar */}
      <div className={`${barWidth} h-1.5 shrink-0 rounded-full bg-slate-100`}>
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${score}%`, background: color }}
        />
      </div>

      {/* Score */}
      {showScore && (
        <span
          className="w-9 shrink-0 text-right font-mono text-[11px] font-bold"
          style={{ color }}
          dir="ltr"
        >
          {score}%
        </span>
      )}

      {/* Trend */}
      {trend && (
        <span className="shrink-0">
          <TrendIcon trend={trend} />
        </span>
      )}
    </div>
  );
}

// ─── Compact 2-column grid of ComplianceIndicators ───────────────────────────

export interface IndicatorRow {
  label: string;
  score: number;
  trend?: TrendDirection;
  status?: ComplianceStatus;
}

interface ComplianceIndicatorGridProps {
  indicators: IndicatorRow[];
  columns?: 1 | 2;
  className?: string;
}

export function ComplianceIndicatorGrid({
  indicators,
  columns = 2,
  className = "",
}: ComplianceIndicatorGridProps) {
  return (
    <div
      className={[
        columns === 2 ? "grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y divide-slate-100 sm:divide-y-0" : "divide-y divide-slate-100",
        className,
      ].join(" ")}
    >
      {indicators.map((ind, i) => (
        <div
          key={ind.label}
          className={[
            "px-4 py-3 hover:bg-slate-50/60 transition-colors",
            columns === 2 && i % 2 === 0 ? "sm:border-r sm:border-slate-100" : "",
          ].join(" ")}
        >
          <ComplianceIndicator
            label={ind.label}
            score={ind.score}
            trend={ind.trend}
          />
        </div>
      ))}
    </div>
  );
}

// ─── HealthGauge — radial / donut score gauge ─────────────────────────────────

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface HealthGaugeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

const GAUGE_DIMS = {
  sm: { h: 100, inner: 34, outer: 46, fontSize: "text-[18px]" },
  md: { h: 130, inner: 44, outer: 60, fontSize: "text-[22px]" },
  lg: { h: 160, inner: 55, outer: 74, fontSize: "text-[28px]" },
};

export function HealthGauge({ score, size = "md", label, className = "" }: HealthGaugeProps) {
  const color = scoreToColor(score);
  const dims = GAUGE_DIMS[size];
  const data = [
    { value: score, fill: color },
    { value: 100 - score, fill: "#f1f5f9" },
  ];

  return (
    <div className={`relative flex flex-col items-center ${className}`} style={{ height: dims.h }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            startAngle={220}
            endAngle={-40}
            innerRadius={dims.inner}
            outerRadius={dims.outer}
            cx="50%"
            cy="55%"
            paddingAngle={0}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {/* Centre label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
        <span className={`font-mono ${dims.fontSize} font-bold leading-none`} style={{ color }}>
          {score}%
        </span>
        {label && <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</span>}
      </div>
    </div>
  );
}
