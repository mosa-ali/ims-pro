// ============================================================================
// FINANCE DESIGN SYSTEM — SparklineCard
// KPI card with an embedded Recharts sparkline area chart.
// ============================================================================

import { ResponsiveContainer, AreaChart, Area, Tooltip } from "recharts";
import { FinanceCard } from "./FinanceCard";
import { TYPE, TrendDirection } from "./tokens";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface SparklineDataPoint {
  value: number;
  [key: string]: number | string;
}

interface SparklineCardProps {
  label: string;
  value: string | number;
  meta?: string;
  trend?: TrendDirection;
  upIsGood?: boolean;
  data: SparklineDataPoint[];
  dataKey?: string;
  color?: string;
  icon?: React.ElementType;
  className?: string;
  tooltipFormatter?: (value: number) => string;
}

function TrendIcon({ trend }: { trend: TrendDirection }) {
  if (trend === "up") return <TrendingUp className="h-3 w-3" />;
  if (trend === "down") return <TrendingDown className="h-3 w-3" />;
  return <Minus className="h-3 w-3" />;
}

export function SparklineCard({
  label,
  value,
  meta,
  trend,
  upIsGood = true,
  data,
  dataKey = "value",
  color = "#003b70",
  icon: Icon,
  className = "",
  tooltipFormatter,
}: SparklineCardProps) {
  const isPositive =
    trend === "stable"
      ? null
      : (trend === "up" && upIsGood) || (trend === "down" && !upIsGood);

  const metaColor =
    trend === undefined || trend === "stable"
      ? "text-slate-400"
      : isPositive
      ? "text-green-700"
      : "text-red-600";

  return (
    <FinanceCard noPadding className={`p-3 flex flex-col gap-1 ${className}`}>
      <div className="flex items-center justify-between">
        <p className={TYPE.kpiLabel}>{label}</p>
        {Icon && <Icon className="h-4 w-4 text-slate-400" />}
      </div>

      <div className={`${TYPE.kpiValue} text-[#003b70]`} dir="ltr">
        {value}
      </div>

      {/* Sparkline */}
      <div className="h-12 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`sparkGrad-${label}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.15} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={1.5}
              fill={`url(#sparkGrad-${label})`}
              dot={false}
            />
            <Tooltip
              contentStyle={{ fontSize: 10, padding: "2px 6px" }}
              formatter={tooltipFormatter ? (v: number) => [tooltipFormatter(v)] : undefined}
              itemStyle={{ fontSize: 10 }}
              labelStyle={{ display: "none" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {meta && (
        <p className={`${TYPE.kpiMeta} flex items-center gap-1 ${metaColor}`}>
          {trend && <TrendIcon trend={trend} />}
          {meta}
        </p>
      )}
    </FinanceCard>
  );
}
