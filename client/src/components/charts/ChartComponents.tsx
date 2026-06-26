// =============================================================================
// REUSABLE CHART COMPONENTS
// Line, Area, Donut, Bar, Funnel, Gauge, Heatmap charts
// =============================================================================

import React from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import { CHART_CONFIG, POWER_BI_COLORS } from "@shared/constants/executiveDashboard";
import type { ChartDataPoint, DonutChartData, GaugeChartData } from "@shared/types/executiveDashboard";

/**
 * Line Chart Component
 */
export function LineChartComponent({
  data,
  lines,
  xAxisKey = "month",
  height = 300,
  isRTL = false,
}: {
  data: ChartDataPoint[];
  lines: Array<{ key: string; stroke: string; name: string }>;
  xAxisKey?: string;
  height?: number;
  isRTL?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={CHART_CONFIG.lineChart.margin}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey={xAxisKey}
          stroke="#9ca3af"
          style={{ fontSize: "12px" }}
        />
        <YAxis stroke="#9ca3af" style={{ fontSize: "12px" }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
          }}
        />
        <Legend />
        {lines.map((line) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            stroke={line.stroke}
            strokeWidth={CHART_CONFIG.lineChart.strokeWidth}
            dot={{ r: CHART_CONFIG.lineChart.dotRadius }}
            name={line.name}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/**
 * Area Chart Component
 */
export function AreaChartComponent({
  data,
  areas,
  xAxisKey = "month",
  height = 300,
  isRTL = false,
}: {
  data: ChartDataPoint[];
  areas: Array<{ key: string; fill: string; name: string }>;
  xAxisKey?: string;
  height?: number;
  isRTL?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={CHART_CONFIG.areaChart.margin}>
        <defs>
          {areas.map((area) => (
            <linearGradient key={area.key} id={`gradient-${area.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={area.fill} stopOpacity={0.8} />
              <stop offset="95%" stopColor={area.fill} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey={xAxisKey}
          stroke="#9ca3af"
          style={{ fontSize: "12px" }}
        />
        <YAxis stroke="#9ca3af" style={{ fontSize: "12px" }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
          }}
        />
        <Legend />
        {areas.map((area) => (
          <Area
            key={area.key}
            type="monotone"
            dataKey={area.key}
            fill={`url(#gradient-${area.key})`}
            stroke={area.fill}
            strokeWidth={CHART_CONFIG.areaChart.strokeWidth}
            name={area.name}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

/**
 * Donut Chart Component
 */
export function DonutChartComponent({
  data,
  height = 300,
  isRTL = false,
}: {
  data: DonutChartData[];
  height?: number;
  isRTL?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={CHART_CONFIG.donutChart.innerRadius}
          outerRadius={CHART_CONFIG.donutChart.outerRadius}
          paddingAngle={2}
          dataKey="value"
          label={({ label, percentage }) => `${label}: ${percentage}%`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => `${value} (${((value / data.reduce((sum, d) => sum + d.value, 0)) * 100).toFixed(1)}%)`}
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

/**
 * Horizontal Bar Chart Component
 */
export function HorizontalBarChartComponent({
  data,
  dataKey = "value",
  nameKey = "label",
  colors,
  height = 300,
  isRTL = false,
}: {
  data: Array<Record<string, any>>;
  dataKey?: string;
  nameKey?: string;
  colors?: string[];
  height?: number;
  isRTL?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={CHART_CONFIG.barChart.margin}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis type="number" stroke="#9ca3af" style={{ fontSize: "12px" }} />
        <YAxis
          dataKey={nameKey}
          type="category"
          stroke="#9ca3af"
          style={{ fontSize: "12px" }}
          width={100}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
          }}
        />
        <Bar dataKey={dataKey} fill={colors?.[0] || POWER_BI_COLORS.primary} radius={[0, 8, 8, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={colors?.[index % colors.length] || POWER_BI_COLORS.primary}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Vertical Bar Chart Component
 */
export function VerticalBarChartComponent({
  data,
  dataKey = "value",
  nameKey = "label",
  colors,
  height = 300,
  isRTL = false,
}: {
  data: Array<Record<string, any>>;
  dataKey?: string;
  nameKey?: string;
  colors?: string[];
  height?: number;
  isRTL?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={CHART_CONFIG.barChart.margin}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey={nameKey}
          stroke="#9ca3af"
          style={{ fontSize: "12px" }}
        />
        <YAxis stroke="#9ca3af" style={{ fontSize: "12px" }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
          }}
        />
        <Bar dataKey={dataKey} fill={colors?.[0] || POWER_BI_COLORS.primary} radius={[8, 8, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={colors?.[index % colors.length] || POWER_BI_COLORS.primary}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Stacked Bar Chart Component
 */
export function StackedBarChartComponent({
  data,
  series,
  xAxisKey = "label",
  height = 300,
  isRTL = false,
}: {
  data: Array<Record<string, any>>;
  series: Array<{ key: string; fill: string; name: string }>;
  xAxisKey?: string;
  height?: number;
  isRTL?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={CHART_CONFIG.barChart.margin}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey={xAxisKey}
          stroke="#9ca3af"
          style={{ fontSize: "12px" }}
        />
        <YAxis stroke="#9ca3af" style={{ fontSize: "12px" }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
          }}
        />
        <Legend />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} stackId="a" fill={s.fill} name={s.name} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Gauge Chart Component (SVG-based)
 */
export function GaugeChartComponent({
  value,
  max = 100,
  label = "",
  color = POWER_BI_COLORS.primary,
  height = 200,
}: {
  value: number;
  max?: number;
  label?: string;
  color?: string;
  height?: number;
}) {
  const percentage = Math.min((value / max) * 100, 100);
  const radius = CHART_CONFIG.gaugeChart.radius;
  const arcWidth = CHART_CONFIG.gaugeChart.arcWidth;
  const circumference = 2 * Math.PI * (radius - arcWidth / 2);
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center" style={{ height }}>
      <svg width={radius * 2.5} height={radius * 1.5} viewBox={`0 0 ${radius * 2.5} ${radius * 1.5}`}>
        {/* Background arc */}
        <circle
          cx={radius * 1.25}
          cy={radius * 1.25}
          r={radius - arcWidth / 2}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={arcWidth}
        />
        {/* Progress arc */}
        <circle
          cx={radius * 1.25}
          cy={radius * 1.25}
          r={radius - arcWidth / 2}
          fill="none"
          stroke={color}
          strokeWidth={arcWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${radius * 1.25} ${radius * 1.25})`}
        />
      </svg>
      <div className="text-center mt-2">
        <p className="text-2xl font-bold" style={{ color }}>
          {percentage.toFixed(0)}%
        </p>
        {label && <p className="text-sm text-gray-600">{label}</p>}
      </div>
    </div>
  );
}

/**
 * Funnel Chart Component
 */
export function FunnelChartComponent({
  data,
  height = 300,
  isRTL = false,
}: {
  data: Array<{ stage: string; count: number; percentage: number }>;
  height?: number;
  isRTL?: boolean;
}) {
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div style={{ height }} className="flex flex-col justify-center gap-2 p-4">
      {data.map((item, index) => {
        const width = (item.count / maxCount) * 100;
        return (
          <div key={index} className="flex flex-col items-center gap-1">
            <div
              className="bg-blue-500 rounded transition-all"
              style={{
                width: `${width}%`,
                height: "40px",
                minWidth: "60px",
              }}
            />
            <div className="text-center">
              <p className="text-sm font-semibold">{item.stage}</p>
              <p className="text-xs text-gray-600">
                {item.count} ({item.percentage}%)
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Heatmap Component (Grid-based)
 */
export function HeatmapComponent({
  data,
  rows,
  columns,
  height = 300,
  isRTL = false,
}: {
  data: Array<{ x: string; y: string; value: number; color: string }>;
  rows: string[];
  columns: string[];
  height?: number;
  isRTL?: boolean;
}) {
  const cellSize = 40;

  return (
    <div
      className="overflow-x-auto"
      style={{
        height,
        display: "flex",
        alignItems: "center",
      }}
    >
      <div className="inline-block p-4">
        {/* Column headers */}
        <div className="flex gap-1 mb-2">
          <div style={{ width: cellSize * 1.5 }} />
          {columns.map((col) => (
            <div
              key={col}
              style={{ width: cellSize }}
              className="text-center text-xs font-semibold text-gray-700"
            >
              {col}
            </div>
          ))}
        </div>

        {/* Rows */}
        {rows.map((row) => (
          <div key={row} className="flex gap-1 mb-1">
            {/* Row label */}
            <div
              style={{ width: cellSize * 1.5 }}
              className="text-xs font-semibold text-gray-700 flex items-center"
            >
              {row}
            </div>

            {/* Cells */}
            {columns.map((col) => {
              const cell = data.find((d) => d.x === col && d.y === row);
              return (
                <div
                  key={`${row}-${col}`}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: cell?.color || "#f3f4f6",
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  title={`${row} × ${col}: ${cell?.value || 0}`}
                  className="hover:shadow-md"
                >
                  <span className="text-xs font-semibold text-white">
                    {cell?.value || 0}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default {
  LineChartComponent,
  AreaChartComponent,
  DonutChartComponent,
  HorizontalBarChartComponent,
  VerticalBarChartComponent,
  StackedBarChartComponent,
  GaugeChartComponent,
  FunnelChartComponent,
  HeatmapComponent,
};
