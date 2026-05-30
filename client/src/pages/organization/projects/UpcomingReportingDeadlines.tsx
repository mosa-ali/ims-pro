import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocation } from 'wouter';

// ─── Interface for compact deadline item ──────────────────────────────────

interface CompactDeadlineItem {
  id: number;
  projectId: number | null;
  projectCode: string;
  projectName: string;
  reportType: string;
  reportStatus: string;
  reportDeadline: string;
  daysUntilDeadline: number;
  isOverdue: boolean;
  isUrgent: boolean;
  isUpcoming: boolean;
  actionRequired: boolean;
  priority: number;
}

interface CompactUpcomingDeadlinesData {
  total: number;
  deadlines: CompactDeadlineItem[];
}

interface UpcomingReportingDeadlinesProps {
  deadlines?: CompactUpcomingDeadlinesData;
  isLoading?: boolean;
  isRTL?: boolean;
  t?: Record<string, any>;
}

export function UpcomingReportingDeadlines({
  deadlines,
  isLoading = false,
  isRTL: isRTLProp = false,
  t = {},
}: UpcomingReportingDeadlinesProps) {
  const { isRTL: contextIsRTL } = useLanguage();
  const isRTL = isRTLProp || contextIsRTL;
  const [, setLocation] = useLocation();

  // Translated labels
  const urd = t?.upcomingReportingDeadlines || {};
  const labels = {
    title: urd.title || 'Upcoming Reporting Deadlines',
    noData: urd.noData || 'No upcoming deadlines',
    viewAll: urd.viewAll || 'View All Reporting Schedules',
    actionRequired: urd.actionRequired || 'Action',
    overdue: urd.overdue || 'Overdue',
    urgent: urd.urgent || 'Urgent',
    upcoming: urd.upcoming || 'Upcoming',
    dAgo: t?.dAgo || 'd ago',
    dLeft: t?.dLeft || 'd left',
  };

  // Get priority color and border
  const getPriorityColor = (item: CompactDeadlineItem) => {
    if (item.isOverdue) return 'border-l-4 border-red-500 bg-red-50';
    if (item.isUrgent) return 'border-l-4 border-amber-500 bg-amber-50';
    if (item.isUpcoming) return 'border-l-4 border-blue-400 bg-blue-50';
    return 'border-l-4 border-gray-300 bg-gray-50';
  };

  // Get status badge
  const getStatusBadge = (item: CompactDeadlineItem) => {
    if (item.isOverdue) {
      return (
        <Badge variant="destructive" className="text-xs whitespace-nowrap">
          {labels.overdue}
        </Badge>
      );
    }
    if (item.isUrgent) {
      return (
        <Badge variant="outline" className="text-xs border-amber-500 text-amber-700 whitespace-nowrap">
          {labels.urgent}
        </Badge>
      );
    }
    if (item.isUpcoming) {
      return (
        <Badge variant="secondary" className="text-xs whitespace-nowrap">
          {labels.upcoming}
        </Badge>
      );
    }
    return null;
  };

  // Format days display
  const formatDays = (days: number) => {
    if (days < 0) {
      return `${Math.abs(days)}${labels.dAgo}`;
    }
    return `${days}${labels.dLeft}`;
  };

  // Handle row click
  const handleRowClick = (item: CompactDeadlineItem) => {
    setLocation(
      `/organization/reporting-schedule?projectId=${item.projectId}&reportId=${item.id}`
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="border border-gray-200" dir={isRTL ? 'rtl' : 'ltr'}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {labels.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!deadlines || deadlines.total === 0) {
    return (
      <Card className="border border-gray-200" dir={isRTL ? 'rtl' : 'ltr'}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {labels.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-gray-500">
            <p>{labels.noData}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-200" dir={isRTL ? 'rtl' : 'ltr'}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {labels.title}
          </CardTitle>
          {deadlines.total > 5 && (
            <Badge variant="secondary" className="text-xs">
              {deadlines.total} total
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {/* Compact table rows */}
        {deadlines.deadlines.map((item) => (
          <div
            key={item.id}
            onClick={() => handleRowClick(item)}
            className={`p-3 rounded-lg cursor-pointer hover:shadow-md transition-all ${getPriorityColor(
              item
            )}`}
          >
            <div className="flex items-center justify-between gap-3">
              {/* Left: Report info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm truncate">
                    {item.reportType}
                  </span>
                  <span className="text-xs text-gray-600 truncate">
                    {item.projectCode}
                  </span>
                </div>
                <p className="text-xs text-gray-600 truncate">
                  {item.projectName}
                </p>
              </div>

              {/* Middle: Due date */}
              <div className="text-xs text-gray-600 whitespace-nowrap">
                Due: {new Date(item.reportDeadline).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>

              {/* Right: Days + Status + Action */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">
                  {formatDays(item.daysUntilDeadline)}
                </span>

                {getStatusBadge(item)}

                {item.actionRequired && (
                  <Badge variant="destructive" className="text-xs whitespace-nowrap">
                    {labels.actionRequired}
                  </Badge>
                )}

                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>
        ))}

        {/* Footer: View All link */}
        <div className="pt-3 border-t">
          <button
            onClick={() => setLocation('/organization/reporting-schedule')}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            {labels.viewAll} →
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
