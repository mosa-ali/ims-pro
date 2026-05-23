import { Calendar, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DeadlineItem {
  id: number;
  projectName: string | null;      // ← Allow null (from LEFT JOIN)
  grantId: number | null;          // ← Add this field
  grantName: string;               // ← Add this field  
  reportType: string;
  reportStatus: string;
  reportDeadline: string;
  periodFrom: string;
  periodTo: string;
  daysUntilDeadline: number;
  isOverdue: boolean;
  isUrgent: boolean;
  isUpcoming: boolean;
  statusLabel: string;
}

interface UpcomingDeadlinesData {
  total: number;
  overdue: number;
  urgent: number;
  upcoming: number;
  all: DeadlineItem[];
  overdueSummary: DeadlineItem[];
  urgentSummary: DeadlineItem[];
  upcomingSummary: DeadlineItem[];
}

interface UpcomingReportingDeadlinesProps {
  deadlines: UpcomingDeadlinesData | null;
  isLoading: boolean;
  t: any;
  isRTL?: boolean;
}

export function UpcomingReportingDeadlines({
  deadlines,
  isLoading,
  t,
  isRTL = false,
}: UpcomingReportingDeadlinesProps) {
  if (isLoading) {
    return (
      <Card className={isRTL ? 'rtl' : 'ltr'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {t.upcomingReportingDeadlines?.title || 'Upcoming Reporting Deadlines'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-200 rounded" />
            <div className="h-8 bg-gray-200 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!deadlines || deadlines.total === 0) {
    return (
      <Card className={isRTL ? 'rtl' : 'ltr'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {t.upcomingReportingDeadlines?.title || 'Upcoming Reporting Deadlines'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">
            {t.upcomingReportingDeadlines?.noData || 'No upcoming deadlines'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadgeVariant = (item: DeadlineItem): 'destructive' | 'secondary' | 'outline' => {
    if (item.isOverdue) return 'destructive';
    if (item.isUrgent) return 'outline';
    return 'secondary';
  };

  const getStatusIcon = (item: DeadlineItem) => {
    if (item.isOverdue) return <AlertCircle className="w-4 h-4" />;
    if (item.isUrgent) return <Clock className="w-4 h-4" />;
    return <Calendar className="w-4 h-4" />;
  };

  const renderDeadlineItem = (item: DeadlineItem) => (
    <div key={item.id} className="flex items-start justify-between p-3 border rounded-lg hover:bg-gray-50">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          {getStatusIcon(item)}
          <p className="font-medium text-sm text-gray-800">{item.projectName}</p>
        </div>
        <p className="text-xs text-gray-600 mb-1">
          {item.reportType} • {item.periodFrom} to {item.periodTo}
        </p>
        <p className="text-xs text-gray-500">
          {t.upcomingReportingDeadlines?.deadline || 'Deadline'}: {item.reportDeadline}
        </p>
      </div>
      <Badge variant={getStatusBadgeVariant(item)} className="whitespace-nowrap ml-2">
        {item.statusLabel}
      </Badge>
    </div>
  );

  return (
    <Card className={isRTL ? 'rtl' : 'ltr'}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {t.upcomingReportingDeadlines?.title || 'Upcoming Reporting Deadlines'}
          </CardTitle>
          <div className="flex gap-2">
            {deadlines.overdue > 0 && (
              <Badge variant="destructive" className="text-xs">
                {deadlines.overdue} {t.upcomingReportingDeadlines?.overdue || 'Overdue'}
              </Badge>
            )}
            {deadlines.urgent > 0 && (
              <Badge variant="outline" className="text-xs border-orange-500 text-orange-700">
                {deadlines.urgent} {t.upcomingReportingDeadlines?.urgent || 'Urgent'}
              </Badge>
            )}
            {deadlines.upcoming > 0 && (
              <Badge variant="secondary" className="text-xs">
                {deadlines.upcoming} {t.upcomingReportingDeadlines?.upcoming || 'Upcoming'}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overdue Section */}
        {deadlines.overdueSummary.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {t.upcomingReportingDeadlines?.overdue || 'Overdue'} ({deadlines.overdue})
            </h4>
            <div className="space-y-2">
              {deadlines.overdueSummary.map(renderDeadlineItem)}
            </div>
          </div>
        )}

        {/* Urgent Section */}
        {deadlines.urgentSummary.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-orange-700 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {t.upcomingReportingDeadlines?.urgent || 'Urgent'} ({deadlines.urgent})
            </h4>
            <div className="space-y-2">
              {deadlines.urgentSummary.map(renderDeadlineItem)}
            </div>
          </div>
        )}

        {/* Upcoming Section */}
        {deadlines.upcomingSummary.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {t.upcomingReportingDeadlines?.upcoming || 'Upcoming'} ({deadlines.upcoming})
            </h4>
            <div className="space-y-2">
              {deadlines.upcomingSummary.map(renderDeadlineItem)}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="pt-3 border-t text-xs text-gray-600">
          <p>
            {t.upcomingReportingDeadlines?.total || 'Total'}: {deadlines.total}{' '}
            {t.upcomingReportingDeadlines?.schedules || 'reporting schedules'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
