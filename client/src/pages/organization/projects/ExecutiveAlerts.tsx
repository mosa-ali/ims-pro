// ExecutiveAlerts.tsx
// Executive alerts center — overdue reports, at-risk projects, expiring grants, over-budget.

import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingDown, Clock, FileWarning } from 'lucide-react';

interface AlertItem {
  id: number;
  projectName?: string;
  reportType?: string;
  reportStatus: string;
  reportDeadline?: string | null;
  daysOverdue?: number;
}

interface AlertGroupProps {
  icon: React.ReactNode;
  label: string;
  items: AlertItem[];
  badgeClass: string;
  emptyText: string;
  renderItem: (item: AlertItem) => React.ReactNode;
}

const AlertGroup = memo(function AlertGroup({
  icon, label, items, badgeClass, emptyText, renderItem,
}: AlertGroupProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-gray-500">{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">{label}</span>
        <Badge className={`text-xs ml-auto ${badgeClass}`}>{items.length}</Badge>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400 italic">{emptyText}</p>
      ) : (
        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
          {items.map((item) => renderItem(item))}
        </div>
      )}
    </div>
  );
});

interface ExecutiveAlertsProps {
  alerts: any;
  compliance: any;
  isLoading: boolean;
  t: Record<string, any>;
}

export const ExecutiveAlerts = memo(function ExecutiveAlerts({
  alerts, compliance, isLoading, t,
}: ExecutiveAlertsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-5 bg-gray-200 rounded w-40 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalAlerts =
    (alerts?.atRisk?.length || 0) +
    (alerts?.overBudget?.length || 0) +
    (alerts?.expiringSoon?.length || 0) +
    (alerts?.overdueReports?.length || 0);

  return (
    <Card className={totalAlerts > 0 ? 'border-red-200 bg-red-50/30' : ''}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <AlertTriangle className={`w-4 h-4 ${totalAlerts > 0 ? 'text-red-500' : 'text-gray-400'}`} />
          {t.alertsTitle || 'Compliance & Risk Alerts'}
          {totalAlerts > 0 && (
            <Badge className="ml-auto bg-red-100 text-red-700 text-xs">{totalAlerts} Active</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <AlertGroup
            icon={<AlertTriangle className="w-4 h-4" />}
            label={t.atRisk || 'Projects At Risk'}
            items={alerts?.atRisk || []}
            badgeClass="bg-red-100 text-red-700"
            emptyText={t.noAtRisk || 'No at-risk projects'}
            renderItem={(item) => (
              <div key={item.id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-red-100 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                <span className="text-gray-700 truncate">{item.projectName || `Project #${item.id}`}</span>
              </div>
            )}
          />

          <AlertGroup
            icon={<TrendingDown className="w-4 h-4" />}
            label={t.overBudget || 'Over Budget'}
            items={alerts?.overBudget || []}
            badgeClass="bg-amber-100 text-amber-700"
            emptyText={t.noOverBudget || 'No over-budget projects'}
            renderItem={(item) => (
              <div key={item.id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-amber-100 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                <span className="text-gray-700 truncate">{item.projectName || `Project #${item.id}`}</span>
              </div>
            )}
          />

          <AlertGroup
            icon={<Clock className="w-4 h-4" />}
            label={t.expiringSoon || 'Expiring in 30 Days'}
            items={alerts?.expiringSoon || []}
            badgeClass="bg-orange-100 text-orange-700"
            emptyText={t.noExpiring || 'No projects expiring soon'}
            renderItem={(item) => (
              <div key={item.id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-orange-100 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                <span className="text-gray-700 truncate">{item.projectName || `Project #${item.id}`}</span>
              </div>
            )}
          />

          <AlertGroup
            icon={<FileWarning className="w-4 h-4" />}
            label={t.overdueReports || 'Overdue Reports'}
            items={alerts?.overdueReports || []}
            badgeClass="bg-purple-100 text-purple-700"
            emptyText={t.noOverdueReports || 'No overdue reports'}
            renderItem={(item) => (
              <div key={item.id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-purple-100 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-gray-700 truncate block">{item.reportType || 'Report'}</span>
                  {item.reportDeadline && (
                    <span className="text-gray-400">Due: {item.reportDeadline}</span>
                  )}
                </div>
              </div>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
});
