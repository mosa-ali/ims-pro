// ProjectRiskTable.tsx
// Executive project risk table with per-project risk indicators, burn health, and overdue reports.

import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { riskColor, statusColor, burnHealthColor, formatCurrencyCompact, formatPercentage } from './useProgramDashboard';

interface ProjectRiskTableProps {
  data: any[] | undefined;
  isLoading: boolean;
  t: Record<string, any>;
  isRTL?: boolean;
}

const RiskBadge = memo(function RiskBadge({ level }: { level: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${riskColor(level)}`}>
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  );
});

const BurnBar = memo(function BurnBar({ value, isOver }: { value: number; isOver: boolean }) {
  const capped = Math.min(value, 100);
  const color = isOver ? '#ef4444' : value > 80 ? '#f59e0b' : '#10b981';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[48px]">
        <div
          className="h-full rounded-full"
          style={{ width: `${capped}%`, backgroundColor: color }}
        />
      </div>
      <span className={`text-xs font-medium ${isOver ? 'text-red-600' : 'text-gray-700'}`}>
        {value}%
      </span>
    </div>
  );
});

export const ProjectRiskTable = memo(function ProjectRiskTable({
  data, isLoading, t, isRTL,
}: ProjectRiskTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-5 bg-gray-200 rounded w-48 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          {t.riskTable || 'Project Risk Overview'}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {!data || (Array.isArray(data) && data.length === 0) ? (
          <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
            {t.noRiskData || 'No active projects found'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" dir={isRTL ? 'rtl' : 'ltr'}>
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {t.projectName || 'Project'}
                  </th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {t.status || 'Status'}
                  </th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {t.riskLevel || 'Risk'}
                  </th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap min-w-[120px]">
                    {t.budgetUtil || 'Budget Util.'}
                  </th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {t.overdueReports || 'Overdue Rpts'}
                  </th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {t.daysRemaining || 'Days Left'}
                  </th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {t.burnHealth || 'Burn Health'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((project, idx) => (
                  <tr
                    key={project.id}
                    className={`border-b border-gray-50 hover:bg-gray-50/70 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/30'}`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900 truncate max-w-[200px]">{project.name}</div>
                      <div className="text-xs text-gray-400">{project.code}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(project.status)}`}>
                        {project.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <RiskBadge level={project.riskLevel} />
                    </td>
                    <td className="py-3 px-3">
                      <BurnBar value={project.budgetUtilization} isOver={project.isOverBudget} />
                    </td>
                    <td className="py-3 px-3">
                      {project.overdueReports > 0 ? (
                        <span className="inline-flex items-center gap-1 text-red-600 font-semibold text-xs">
                          <AlertTriangle className="w-3 h-3" />
                          {project.overdueReports}
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-600 font-medium">✓ None</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {project.daysRemaining !== null ? (
                        <span className={`text-xs font-semibold ${
                          project.daysRemaining < 0 ? 'text-red-600' :
                          project.daysRemaining < 30 ? 'text-amber-600' :
                          'text-gray-700'
                        }`}>
                          {project.daysRemaining < 0 ? `${Math.abs(project.daysRemaining)}d overdue` : `${project.daysRemaining}d`}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-xs font-semibold capitalize ${burnHealthColor(project.burnHealth)}`}>
                        {project.burnHealth}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
