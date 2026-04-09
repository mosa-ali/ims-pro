// ============================================================================
// RECENT ACTIVITY FEED COMPONENT
// System-generated activity feed for Projects Workspace Dashboard
// Integrated Management System (IMS)
// ============================================================================

import { useEffect } from 'react';
import { Clock, FileText, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';
import { formatDistanceToNow } from 'date-fns';

interface RecentActivityFeedProps {
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

export function RecentActivityFeed({ 
  limit = 20, 
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}: RecentActivityFeedProps) {
  const { currentOrganizationId } = useOrganization();
  const { currentOperatingUnitId } = useOperatingUnit();

  const { data: activities, isLoading, refetch } = trpc.projects.getRecentActivities.useQuery(
    {
      organizationId: currentOrganizationId || 1,
      operatingUnitId: currentOperatingUnitId || 1,
      limit,
    },
    {
      enabled: !!currentOrganizationId && !!currentOperatingUnitId,
      refetchInterval: autoRefresh ? refreshInterval : false,
    }
  );

  // Get icon based on action type
  const getActionIcon = (action: string) => {
    if (action.includes('created')) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (action.includes('updated')) return <FileText className="w-4 h-4 text-blue-600" />;
    if (action.includes('status_changed')) return <AlertCircle className="w-4 h-4 text-amber-600" />;
    if (action.includes('deleted')) return <XCircle className="w-4 h-4 text-red-600" />;
    return <Clock className="w-4 h-4 text-gray-400" />;
  };

  // Get status badge color based on action type
  const getStatusBadgeColor = (action: string) => {
    if (action.includes('created')) return 'bg-green-100 text-green-700';
    if (action.includes('updated')) return 'bg-blue-100 text-blue-700';
    if (action.includes('status_changed')) return 'bg-amber-100 text-amber-700';
    if (action.includes('deleted')) return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Recent Activity</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Recent Activity</h3>
        <div className="text-center py-8 text-gray-500 text-sm">
          No recent project activities
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Recent Activity</h3>
        {autoRefresh && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>Auto-refresh enabled</span>
          </div>
        )}
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
          >
            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5">
              {getActionIcon(activity.action)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm text-gray-900 leading-relaxed">
                  <p className="font-medium">{activity.action}</p>
                  {(() => {
                    try {
                      const details = JSON.parse(activity.details);
                      return (
                        <p className="text-xs text-gray-600 mt-0.5">
                          {details.projectCode && `${details.projectCode}: `}
                          {details.projectTitle || ''}
                        </p>
                      );
                    } catch {
                      return null;
                    }
                  })()}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${getStatusBadgeColor(activity.action)}`}>
                  {activity.action.replace(/_/g, ' ').replace('project ', '')}
                </span>
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                <span className="font-medium">{activity.userName}</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
