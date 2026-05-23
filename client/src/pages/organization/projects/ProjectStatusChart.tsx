// ProjectStatusChart.tsx
// Responsive donut chart with external legend — no overlapping labels.

import React, { memo, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  'On Track':  '#10b981',
  'At Risk':   '#f59e0b',
  'Planning':  '#3b82f6',
  'Completed': '#6b7280',
  'Cancelled': '#ef4444',
};

interface ProjectStatusChartProps {
  distribution: Record<string, number> | undefined;
  isLoading: boolean;
  t: Record<string, any>;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value, payload: p } = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow p-2 text-xs">
      <span className="font-semibold" style={{ color: p.fill }}>{name}</span>
      <span className="ml-2 text-gray-600">{value} projects</span>
    </div>
  );
};

export const ProjectStatusChart = memo(function ProjectStatusChart({
  distribution, isLoading, t,
}: ProjectStatusChartProps) {
  const chartData = useMemo(() => {
    if (!distribution) return [];
    return Object.entries(distribution)
      .filter(([, v]) => (v as number) > 0)
      .map(([key, value]) => ({
        name: key,
        value: value as number,
        fill: STATUS_COLORS[key] || '#94a3b8',
      }));
  }, [distribution]);

  const total = useMemo(() => chartData.reduce((s, d) => s + d.value, 0), [chartData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-5 bg-gray-200 rounded w-48 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-72 bg-gray-100 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-600" />
          {t.statusDistribution || 'Project Status Distribution'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-72 flex items-center justify-center text-gray-400 text-sm">
            {t.noData || 'No projects found'}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Donut chart */}
            <div className="w-full sm:w-48 h-48 flex-shrink-0 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={74}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center total */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-gray-900">{total}</span>
                <span className="text-xs text-gray-500">Projects</span>
              </div>
            </div>

            {/* External legend */}
            <div className="flex-1 space-y-2 w-full">
              {chartData.map((entry) => {
                const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
                return (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: entry.fill }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-xs font-medium text-gray-700 truncate">{entry.name}</span>
                        <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                          {entry.value} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: entry.fill }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
