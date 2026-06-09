import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocation } from 'wouter';

const getDeadlineStatus = (deadline: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(deadline);
  dueDate.setHours(0, 0, 0, 0);

  const days = Math.ceil(
    (dueDate.getTime() - today.getTime()) /
    (1000 * 60 * 60 * 24)
  );

  if (days < 0) {
    return {
      days,
      label: `${Math.abs(days)}d overdue`,
      className: "bg-red-100 text-red-700 border-red-300",
      severity: "overdue",
    };
  }

  if (days === 0) {
    return {
      days,
      label: "Due Today",
      className: "bg-red-600 text-white border-red-600",
      severity: "today",
    };
  }

  if (days <= 7) {
    return {
      days,
      label: `${days}d left`,
      className: "bg-orange-100 text-orange-700 border-orange-300",
      severity: "critical",
    };
  }

  if (days <= 30) {
    return {
      days,
      label: `${days}d left`,
      className: "bg-yellow-100 text-yellow-700 border-yellow-300",
      severity: "warning",
    };
  }

  return {
    days,
    label: `${days}d left`,
    className: "bg-green-100 text-green-700 border-green-300",
    severity: "normal",
  };
};


// ─── Interface for compact deadline item ──────────────────────────────────

interface CompactDeadlineItem {
  id: number;
  projectId: string;
  projectName: string;
  reportType: string;
  reportStatus: string; // ALL statuses: NOT_STARTED, PLANNED, UNDER_PREPARATION, UNDER_REVIEW, SUBMITTED_TO_HQ, SUBMITTED_TO_DONOR
  reportDeadline: string;
  daysOverdue: number;
  isOverdue: boolean;
  isUrgent: boolean;
  isUpcoming: boolean;
  actionRequired: boolean;
  priority: number;
}

interface CompactUpcomingDeadlinesData {
  total: number; // Total deadlines within 90 days
  deadlines: CompactDeadlineItem[]; // ALL deadlines (for full page)
  deadlinesWidget?: CompactDeadlineItem[]; // Top 5 for widget (optional, fallback to deadlines)
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

// ─────────────────────────────────────────────────────────────
// Dashboard deadline display
// Status is intentionally ignored to prevent crashes caused by
// new or unexpected report statuses.
// UI is driven only by deadline urgency.
// ─────────────────────────────────────────────────────────────

// Get status badge color based ONLY on deadline urgency
const getStatusBadgeVariant = (
  item: CompactDeadlineItem
): 'destructive' | 'outline' | 'secondary' | 'default' => {
  if (item.isOverdue) {
    return 'destructive';
  }

  if (item.isUrgent) {
    return 'outline';
  }

  if (item.isUpcoming) {
    return 'secondary';
  }

  return 'default';
};

// Get priority color and border
const getPriorityColor = (item: CompactDeadlineItem) => {
  if (item.isOverdue) {
    return 'border-l-4 border-red-500 bg-red-50';
  }

  if (item.isUrgent) {
    return 'border-l-4 border-amber-500 bg-amber-50';
  }

  if (item.isUpcoming) {
    return 'border-l-4 border-blue-400 bg-blue-50';
  }

  return 'border-l-4 border-gray-300 bg-gray-50';
};

// Get badge based ONLY on deadline urgency
const getStatusBadge = (item: CompactDeadlineItem) => {
  if (item.isOverdue) {
    return (
      <Badge
        variant="destructive"
        className="text-xs whitespace-nowrap"
      >
        {labels.overdue}
      </Badge>
    );
  }

  if (item.isUrgent) {
    return (
      <Badge
        variant="outline"
        className="text-xs border-amber-500 text-amber-700 whitespace-nowrap"
      >
        {labels.urgent}
      </Badge>
    );
  }

  if (item.isUpcoming) {
    return (
      <Badge
        variant="secondary"
        className="text-xs whitespace-nowrap"
      >
        {labels.upcoming}
      </Badge>
    );
  }

  return (
    <Badge
      variant="default"
      className="text-xs whitespace-nowrap"
    >
      Active
    </Badge>
  );
};

  // Format days display
  const formatDaysUntilDeadline = (deadline: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(deadline);
  dueDate.setHours(0, 0, 0, 0);

  const days = Math.ceil(
    (dueDate.getTime() - today.getTime()) /
    (1000 * 60 * 60 * 24)
  );

  if (days < 0) {
    return `${Math.abs(days)}d overdue`;
  }

  if (days === 0) {
    return 'Due today';
  }

  return `${days}d`;
};

  // Handle row click
  const handleRowClick = (item: CompactDeadlineItem) => {
    setLocation(
      `/organization/reporting-schedule?projectId=${item.projectId}&reportId=${item.id}`
    );
  };

  // Use widget-limited display (top 5) or fallback to all deadlines
  const displayDeadlines = deadlines?.deadlinesWidget || deadlines?.deadlines || [];
  const totalCount = deadlines?.total || 0;

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
  if (!deadlines || totalCount === 0) {
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
          {totalCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {totalCount} total
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {/* Compact table rows - showing top 5 or all if less than 5 */}
        {displayDeadlines.map((item) => (
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
                {(() => {
                  const deadlineStatus = getDeadlineStatus(item.reportDeadline);

                  return (
                    <>
                      {/* Days Remaining Badge */}
                      <Badge
                        variant="outline"
                        className={`text-xs whitespace-nowrap font-semibold ${deadlineStatus.className}`}
                      >
                        {deadlineStatus.label}
                      </Badge>

                      {/* Action Required */}
                      {(item.actionRequired || deadlineStatus.days <= 6) && (
                        <Badge
                          variant="destructive"
                          className="text-xs whitespace-nowrap animate-pulse"
                        >
                          {labels.actionRequired}
                        </Badge>
                      )}

                      {/* Overdue Warning */}
                      {deadlineStatus.days < 0 && (
                        <Badge
                          variant="destructive"
                          className="text-xs whitespace-nowrap"
                        >
                          Overdue
                        </Badge>
                      )}

                      {/* Due Today */}
                      {deadlineStatus.days === 0 && (
                        <Badge
                          className="text-xs whitespace-nowrap bg-red-600 text-white"
                        >
                          Due Today
                        </Badge>
                      )}

                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </>
                  );
                })()}
              </div>
              </div>
              </div>
              ))}

              {/* Show indicator if there are more than displayed */}
              {totalCount > displayDeadlines.length && (
                <div className="text-xs text-gray-500 text-center py-2">
                  Showing {displayDeadlines.length} of {totalCount} deadlines
                </div>
              )}

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
