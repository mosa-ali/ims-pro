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

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, TrendingDown, AlertCircle, Users, Clock, Timer } from 'lucide-react';
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
  const dateRange = useMemo(() => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    return {
      startDate: startOfMonth.toISOString().split('T')[0],
      endDate: endOfMonth.toISOString().split('T')[0],
    };
  }, []);

  // Fetch dashboard metrics from tRPC
  const { data, isLoading: isQueryLoading, error: queryError } = trpc.hrAttendance.getDashboardMetrics.useQuery(
    dateRange,
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
      setError(queryError.message || t.common?.error || 'Failed to load metrics');
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

  // Ensure metrics has default values
  const safeMetrics = metrics || {
    pendingApprovalsCount: 0,
    overtimeHours: 0,
    attendanceRate: 0,
    lateArrivalsCount: 0,
    absentCount: 0,
    onLeaveCount: 0,
    totalRecords: 0,
    presentCount: 0,
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Present Today */}
        <KPICard
          title={t.hrAttendance?.presentToday || 'Present Today'}
          value={safeMetrics.presentCount}
          icon={<Users className="w-4 h-4 text-green-600" />}
          trend={safeMetrics.presentCount > 0 ? 'up' : 'neutral'}
          onClick={() => setSelectedMetric('present')}
          isLoading={isLoading}
        />

        {/* Absent Today */}
        <KPICard
          title={t.hrAttendance?.absentToday || 'Absent Today'}
          value={safeMetrics.absentCount}
          icon={<AlertCircle className="w-4 h-4 text-red-600" />}
          trend={safeMetrics.absentCount > 0 ? 'down' : 'neutral'}
          onClick={() => setSelectedMetric('absent')}
          isLoading={isLoading}
        />

        {/* Late Arrivals */}
        <KPICard
          title={t.hrAttendance?.lateArrivals || 'Late Arrivals'}
          value={safeMetrics.lateArrivalsCount}
          icon={<Clock className="w-4 h-4 text-yellow-600" />}
          trend={safeMetrics.lateArrivalsCount > 0 ? 'down' : 'neutral'}
          onClick={() => setSelectedMetric('late')}
          isLoading={isLoading}
        />

        {/* Overtime Today */}
        <KPICard
          title={t.hrAttendance?.overtimeToday || 'Overtime Today'}
          value={safeMetrics.overtimeHours.toFixed(1)}
          unit="hours"
          icon={<Timer className="w-4 h-4 text-purple-600" />}
          onClick={() => setSelectedMetric('overtime')}
          isLoading={isLoading}
        />

        {/* Pending Approvals */}
        <KPICard
          title={t.hrAttendance?.pendingApprovals || 'Pending Approvals'}
          value={safeMetrics.pendingApprovalsCount}
          icon={<AlertCircle className="w-4 h-4 text-orange-600" />}
          trend={safeMetrics.pendingApprovalsCount > 0 ? 'up' : 'neutral'}
          onClick={() => setSelectedMetric('pending')}
          isLoading={isLoading}
        />

        {/* On Leave */}
        <KPICard
          title={t.hrAttendance?.onLeave || 'On Leave'}
          value={safeMetrics.onLeaveCount}
          icon={<Users className="w-4 h-4 text-blue-600" />}
          onClick={() => setSelectedMetric('leave')}
          isLoading={isLoading}
        />
      </div>

      {/* Summary Section */}
      {safeMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.hrAttendance?.summary || 'Summary'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">{t.hrAttendance?.totalRecords || 'Total Records'}</span>
                <div className="text-2xl font-bold">{safeMetrics.totalRecords}</div>
              </div>
              <div>
                <span className="text-muted-foreground">{t.hrAttendance?.present || 'Present'}</span>
                <div className="text-2xl font-bold text-green-600">{safeMetrics.presentCount}</div>
              </div>
              <div>
                <span className="text-muted-foreground">{t.hrAttendance?.pending || 'Pending'}</span>
                <div className="text-2xl font-bold text-yellow-600">{safeMetrics.pendingApprovalsCount}</div>
              </div>
              <div>
                <span className="text-muted-foreground">{t.hrReports.attendanceRate || 'Attendance Rate'}</span>
                <div className="text-2xl font-bold text-blue-600">{safeMetrics.attendanceRate.toFixed(1)}%</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto-refresh indicator */}
      {!isLoading && (
        <div className="text-xs text-muted-foreground text-center">
          {t.hrReports.autoRefresh ? t.hrReports.autoRefresh.replace('{interval}', '30s') : 'Auto-refreshing every 30 seconds'}
        </div>
      )}
    </div>
  );
};

export default DashboardKPICards;
