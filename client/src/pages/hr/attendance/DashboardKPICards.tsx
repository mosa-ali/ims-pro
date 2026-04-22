/**
 * ============================================================================
 * DASHBOARD KPI CARDS COMPONENT
 * ============================================================================
 * 
 * Displays real-time attendance metrics in card format:
 * - Pending Approvals
 * - Overtime Hours
 * - Attendance Rate
 * - Late Arrivals
 * - Absent Count
 * - On-Leave Count
 * 
 * Features:
 * - Real-time polling (30 seconds)
 * - Drill-down to detailed records
 * - Bilingual support (EN/AR)
 * - RTL/LTR layout
 * - Loading states
 * - Error handling
 * 
 * ============================================================================
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { useTranslation } from '@/i18n/useTranslation';

interface KPIMetrics {
  pendingApprovalsCount: number;
  overtimeHours: number;
  attendanceRate: number;
  lateArrivalsCount: number;
  absentCount: number;
  onLeaveCount: number;
  totalRecords: number;
  presentCount: number;
}

interface KPICardProps {
  title: string;
  value: number | string;
  unit?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  onClick?: () => void;
  isLoading?: boolean;
  error?: string;
}

/**
 * Individual KPI Card Component
 */
const KPICard = ({
  title,
  value,
  unit,
  icon,
  trend,
  onClick,
  isLoading,
  error,
}: KPICardProps) => {
  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs">{error}</span>
          </div>
        ) : (
          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-bold">{value}</div>
            {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
            {trend && (
              <div className="ml-2">
                {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
                {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Main Dashboard KPI Cards Component
 */
export const DashboardKPICards = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<KPIMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  // Get current date range (current month)
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const startDate = startOfMonth.toISOString().split('T')[0];
  const endDate = endOfMonth.toISOString().split('T')[0];

  // Fetch dashboard metrics
  const { data, isLoading: isQueryLoading, error: queryError } = trpc.hrAttendance.getDashboardMetrics.useQuery(
    { startDate, endDate },
    {
      refetchInterval: 30000, // Refresh every 30 seconds
      enabled: !!user,
    }
  );

  useEffect(() => {
    if (data) {
      setMetrics(data);
      setIsLoading(false);
      setError(null);
    }
  }, [data]);

  useEffect(() => {
    if (queryError) {
      setError(queryError.message || t('common.error'));
      setIsLoading(false);
    }
  }, [queryError, t]);

  useEffect(() => {
    setIsLoading(isQueryLoading);
  }, [isQueryLoading]);

  if (!metrics && isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Pending Approvals */}
        <KPICard
          title={t('attendance.kpi.pendingApprovals')}
          value={metrics?.pendingApprovalsCount || 0}
          icon={<AlertCircle className="w-4 h-4" />}
          trend={metrics && metrics.pendingApprovalsCount > 0 ? 'up' : 'neutral'}
          onClick={() => setSelectedMetric('pending')}
          isLoading={isLoading}
        />

        {/* Overtime Hours */}
        <KPICard
          title={t('attendance.kpi.overtimeHours')}
          value={metrics?.overtimeHours || 0}
          unit="hrs"
          icon={<TrendingUp className="w-4 h-4" />}
          onClick={() => setSelectedMetric('overtime')}
          isLoading={isLoading}
        />

        {/* Attendance Rate */}
        <KPICard
          title={t('attendance.kpi.attendanceRate')}
          value={`${metrics?.attendanceRate.toFixed(1) || 0}%`}
          icon={<TrendingUp className="w-4 h-4" />}
          trend={metrics && metrics.attendanceRate >= 90 ? 'up' : 'down'}
          onClick={() => setSelectedMetric('rate')}
          isLoading={isLoading}
        />

        {/* Late Arrivals */}
        <KPICard
          title={t('attendance.kpi.lateArrivals')}
          value={metrics?.lateArrivalsCount || 0}
          icon={<AlertCircle className="w-4 h-4" />}
          trend={metrics && metrics.lateArrivalsCount > 0 ? 'down' : 'neutral'}
          onClick={() => setSelectedMetric('late')}
          isLoading={isLoading}
        />

        {/* Absent Count */}
        <KPICard
          title={t('attendance.kpi.absent')}
          value={metrics?.absentCount || 0}
          icon={<AlertCircle className="w-4 h-4" />}
          trend={metrics && metrics.absentCount > 0 ? 'down' : 'neutral'}
          onClick={() => setSelectedMetric('absent')}
          isLoading={isLoading}
        />

        {/* On-Leave Count */}
        <KPICard
          title={t('attendance.kpi.onLeave')}
          value={metrics?.onLeaveCount || 0}
          icon={<TrendingDown className="w-4 h-4" />}
          onClick={() => setSelectedMetric('leave')}
          isLoading={isLoading}
        />
      </div>

      {/* Summary Section */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('attendance.summary')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">{t('attendance.totalRecords')}</span>
                <div className="text-2xl font-bold">{metrics.totalRecords}</div>
              </div>
              <div>
                <span className="text-muted-foreground">{t('attendance.present')}</span>
                <div className="text-2xl font-bold text-green-600">{metrics.presentCount}</div>
              </div>
              <div>
                <span className="text-muted-foreground">{t('attendance.pending')}</span>
                <div className="text-2xl font-bold text-yellow-600">{metrics.pendingApprovalsCount}</div>
              </div>
              <div>
                <span className="text-muted-foreground">{t('attendance.period')}</span>
                <div className="text-sm font-medium">
                  {startDate} - {endDate}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto-refresh indicator */}
      {!isLoading && (
        <div className="text-xs text-muted-foreground text-center">
          {t('common.autoRefresh', { interval: '30s' })}
        </div>
      )}
    </div>
  );
};

export default DashboardKPICards;
