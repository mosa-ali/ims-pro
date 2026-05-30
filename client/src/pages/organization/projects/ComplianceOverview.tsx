// ComplianceOverview.tsx
// Reporting compliance summary with visual progress breakdown.

import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';
import { formatPercentage } from './useProgramDashboard';

interface ComplianceOverviewProps {
  compliance: any;
  isLoading: boolean;
  t: Record<string, any>;
}

interface ComplianceBarProps {
  label: string;
  count: number;
  total: number;
  color: string;
}

const ComplianceBar = memo(function ComplianceBar({ label, count, total, color }: ComplianceBarProps) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold text-gray-800">{count} ({pct}%)</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
});

export const ComplianceOverview = memo(function ComplianceOverview({
  compliance, isLoading, t,
}: ComplianceOverviewProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-5 bg-gray-200 rounded w-40 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-6 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const total = compliance?.totalSchedules || 0;
  const rate = compliance?.reportingComplianceRate || 0;
  const rateColor = rate >= 80 ? '#10b981' : rate >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          {t?.complianceOverview?.title || 'Reporting Compliance'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Big compliance score */}
        <div className="flex items-center gap-4 mb-5">
          <div className="relative w-16 h-16 flex-shrink-0">
            <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.9"
                fill="none"
                stroke={rateColor}
                strokeWidth="3"
                strokeDasharray={`${rate} ${100 - rate}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-gray-800">{rate}%</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500">{t?.complianceOverview?.complianceRate || 'Compliance Rate'}</p>
            <p className="text-sm font-semibold text-gray-800">
              {compliance?.completedReports || 0} / {total} {t?.complianceOverview?.submitted || 'submitted'}
            </p>
            {(compliance?.overdueReports || 0) > 0 && (
              <p className="text-xs text-red-600 font-medium mt-0.5">
                {compliance.overdueReports} {t?.complianceOverview?.overdue || 'overdue'}
              </p>
            )}
          </div>
        </div>

        {/* Status breakdown bars */}
        <div className="space-y-3">
          <ComplianceBar
            label={t?.complianceOverview?.submitted || 'Submitted to Donor'}
            count={compliance?.completedReports || 0}
            total={total}
            color="#10b981"
          />
          <ComplianceBar
            label={t?.complianceOverview?.inReview || 'Under Review / HQ'}
            count={compliance?.inReviewReports || 0}
            total={total}
            color="#3b82f6"
          />
          <ComplianceBar
            label={t?.complianceOverview?.pending || 'Pending / Not Started'}
            count={compliance?.pendingReports || 0}
            total={total}
            color="#f59e0b"
          />
          <ComplianceBar
            label={t?.complianceOverview?.overdue || 'Overdue'}
            count={compliance?.overdueReports || 0}
            total={total}
            color="#ef4444"
          />
        </div>
      </CardContent>
    </Card>
  );
});
