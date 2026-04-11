import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Bell, AlertTriangle, AlertCircle, Check, X, Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

interface VarianceAlertsTabProps {
  projectId: number;
  isRTL: boolean;
}

type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'dismissed';
type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export function VarianceAlertsTab({
  projectId,
  isRTL
}: VarianceAlertsTabProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'all'>('all');

  // Fetch alerts for this project
  const { data: alerts = [], refetch: refetchAlerts, isLoading: alertsLoading } = trpc.varianceAlerts.getAlerts.useQuery(
    {
      projectId,
      status: statusFilter === 'all' ? undefined : statusFilter,
      severity: severityFilter === 'all' ? undefined : severityFilter,
      limit: 100,
    }
  );

  // Fetch summary statistics
  const { data: summary } = trpc.varianceAlerts.getSummary.useQuery(
    { projectId }
  );

  // Acknowledge alert mutation
  const acknowledgeMutation = trpc.varianceAlerts.acknowledgeAlert.useMutation({
    onSuccess: () => {
      refetchAlerts();
      toast({
        title: t.projectDetail.success,
        description: "Alert acknowledged successfully",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: t.projectDetail.error,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Resolve alert mutation
  const resolveMutation = trpc.varianceAlerts.resolveAlert.useMutation({
    onSuccess: () => {
      refetchAlerts();
      toast({
        title: t.projectDetail.success,
        description: "Alert resolved successfully",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: t.projectDetail.error,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Dismiss alert mutation
  const dismissMutation = trpc.varianceAlerts.dismissAlert.useMutation({
    onSuccess: () => {
      refetchAlerts();
      toast({
        title: t.projectDetail.success,
        description: "Alert dismissed successfully",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: t.projectDetail.error,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete alert mutation
  const deleteMutation = trpc.varianceAlerts.deleteAlert.useMutation({
    onSuccess: () => {
      refetchAlerts();
      toast({
        title: t.projectDetail.success,
        description: "Alert deleted successfully",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: t.projectDetail.error,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-700';
      case 'high':
        return 'bg-orange-100 text-orange-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'low':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getStatusBadgeColor = (status: AlertStatus) => {
    switch (status) {
      case 'active':
        return 'bg-red-100 text-red-700';
      case 'acknowledged':
        return 'bg-yellow-100 text-yellow-700';
      case 'resolved':
        return 'bg-green-100 text-green-700';
      case 'dismissed':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <Bell className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Budget Variance Alerts
            </h2>
            <p className="text-sm text-gray-600">
              Monitor budget overspending and variance alerts
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{summary?.total ?? 0}</p>
            </div>
            <Bell className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-red-600">{summary?.active ?? 0}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Acknowledged</p>
              <p className="text-2xl font-bold text-yellow-600">{summary?.acknowledged ?? 0}</p>
            </div>
            <Check className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Critical</p>
              <p className="text-2xl font-bold text-red-600">{summary?.critical ?? 0}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">High</p>
              <p className="text-2xl font-bold text-orange-600">{summary?.high ?? 0}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AlertStatus | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Severity</label>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as AlertSeverity | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Alerts List */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">
            Alert History
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {alertsLoading ? (
            <div className="p-8 text-center text-gray-500">
              <div className="animate-spin inline-block">
                <Bell className="w-8 h-8 text-gray-300" />
              </div>
              <p className="mt-2">Loading alerts...</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No alerts found</p>
              <p className="text-sm mt-1">
                Alerts will appear here when budget variance is detected
              </p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className={`p-4 ${alert.status === 'active' ? 'bg-red-50' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      alert.severity === 'critical' ? 'bg-red-100' : 
                      alert.severity === 'high' ? 'bg-orange-100' :
                      alert.severity === 'medium' ? 'bg-yellow-100' :
                      'bg-blue-100'
                    }`}>
                      {getSeverityIcon(alert.severity as AlertSeverity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getSeverityColor(alert.severity as AlertSeverity)}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getStatusBadgeColor(alert.status as AlertStatus)}`}>
                          {alert.status.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(alert.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <h4 className="font-semibold text-gray-900 mb-1">
                        {alert.alertType.replace('_', ' ').toUpperCase()}
                      </h4>

                      {alert.category && (
                        <p className="text-sm text-gray-600 mb-2">
                          Category: <span className="font-mono">{alert.category}</span>
                        </p>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-2">
                        <div>
                          <p className="text-gray-600">Budget Amount</p>
                          <p className="font-semibold text-gray-900">${parseFloat(alert.budgetAmount).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Actual Amount</p>
                          <p className="font-semibold text-gray-900">${parseFloat(alert.actualAmount).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Variance</p>
                          <p className="font-semibold text-red-600">${parseFloat(alert.variance).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Variance %</p>
                          <p className="font-semibold text-red-600">{parseFloat(alert.variancePercentage).toFixed(2)}%</p>
                        </div>
                      </div>

                      {alert.description && (
                        <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
                      )}

                      {alert.acknowledgedAt && (
                        <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Acknowledged - {new Date(alert.acknowledgedAt).toLocaleString()}
                        </div>
                      )}

                      {alert.resolvedAt && (
                        <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Resolved - {new Date(alert.resolvedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 flex-shrink-0">
                    {alert.status === 'active' && (
                      <>
                        <Button
                          onClick={() => acknowledgeMutation.mutate({ alertId: alert.id })}
                          variant="outline"
                          size="sm"
                          disabled={acknowledgeMutation.isPending}
                          title="Acknowledge this alert"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => resolveMutation.mutate({ alertId: alert.id })}
                          variant="outline"
                          size="sm"
                          disabled={resolveMutation.isPending}
                          title="Resolve this alert"
                        >
                          <Check className="w-4 h-4 text-green-600" />
                        </Button>
                      </>
                    )}
                    {alert.status === 'acknowledged' && (
                      <Button
                        onClick={() => resolveMutation.mutate({ alertId: alert.id })}
                        variant="outline"
                        size="sm"
                        disabled={resolveMutation.isPending}
                        title="Resolve this alert"
                      >
                        <Check className="w-4 h-4 text-green-600" />
                      </Button>
                    )}
                    <Button
                      onClick={() => dismissMutation.mutate({ alertId: alert.id })}
                      variant="outline"
                      size="sm"
                      disabled={dismissMutation.isPending}
                      title="Dismiss this alert"
                    >
                      <X className="w-4 h-4 text-gray-600" />
                    </Button>
                    <Button
                      onClick={() => deleteMutation.mutate({ alertId: alert.id })}
                      variant="outline"
                      size="sm"
                      disabled={deleteMutation.isPending}
                      title="Delete this alert"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
