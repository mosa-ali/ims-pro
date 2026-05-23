// ProjectSnapshotTable.tsx
// Enhanced project snapshot table with budget utilization bars, risk badges,
// reporting status, and next reporting deadline.

import React, { memo } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table2, AlertTriangle } from 'lucide-react';
import { riskColor, statusColor, formatCurrencyCompact, formatDateLocalized } from './useProgramDashboard';

interface ProjectSnapshotTableProps {
  data: any[] | undefined;
  isLoading: boolean;
  t: Record<string, any>;
  isRTL?: boolean;
  onProjectClick?: (id: number) => void;
}

const UtilBar = memo(function UtilBar({ value, isOver }: { value: number; isOver: boolean }) {
  const capped = Math.min(value, 100);
  const color = isOver ? '#ef4444' : value > 85 ? '#f59e0b' : '#10b981';
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${capped}%`, backgroundColor: color }} />
      </div>
      <span className={`text-xs font-medium flex-shrink-0 ${isOver ? 'text-red-600' : 'text-gray-700'}`}>
        {value}%
      </span>
    </div>
  );
});

export const ProjectSnapshotTable = memo(function ProjectSnapshotTable({
  data, isLoading, t, isRTL, onProjectClick,
}: ProjectSnapshotTableProps) {
  const [, setLocation] = useLocation();

  const handleRowClick = (projectId: number) => {
    onProjectClick?.(projectId);
    setLocation(`/organization/projects/${projectId}`);
  };
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-5 bg-gray-200 rounded w-48 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
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
          <Table2 className="w-4 h-4 text-gray-600" />
          {t.projectSnapshot || 'Project Portfolio Snapshot'}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {!data || (Array.isArray(data) && data.length === 0) ? (
          <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
            {t.noProjects || 'No projects found'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" dir={isRTL ? 'rtl' : 'ltr'}>
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {t.projectName || 'Project'}
                  </th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {t.status || 'Status'}
                  </th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {t.donor || 'Donor'}
                  </th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap min-w-[120px]">
                    {t.budgetUtil || 'Budget Util.'}
                  </th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {t.risk || 'Risk'}
                  </th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {t.nextReport || 'Next Report'}
                  </th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {t.endDate || 'End Date'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((project, idx) => (
                  <tr
                    key={project.id}
                    className={`border-b border-gray-50 hover:bg-indigo-50/30 transition-colors cursor-pointer ${idx % 2 === 0 ? '' : 'bg-gray-50/30'}`}
                    onClick={() => handleRowClick(project.id)}
                  >
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900 truncate max-w-[220px]">{project.name}</div>
                      <div className="text-xs text-gray-400">{project.code}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(project.status)}`}>
                        {project.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-xs text-gray-600 truncate max-w-[120px] block">
                        {project.donor || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <UtilBar value={project.budgetUtilization} isOver={project.isOverBudget} />
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${riskColor(project.riskLevel)}`}>
                        {project.riskLevel}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {project.overdueReports > 0 ? (
                        <span className="inline-flex items-center gap-1 text-red-600 text-xs font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          {project.overdueReports} overdue
                        </span>
                      ) : project.nextDueDate ? (
                        <span className="text-xs text-gray-600">{formatDateLocalized(project.nextDueDate)}</span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-xs font-medium ${
                        project.daysRemaining !== null && project.daysRemaining < 0 ? 'text-red-600' :
                        project.daysRemaining !== null && project.daysRemaining < 30 ? 'text-amber-600' :
                        'text-gray-600'
                      }`}>
                        {project.endDate ? formatDateLocalized(project.endDate) : '—'}
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
