import { AlertCircle, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ComplianceMetrics {
  complianceRate: number;
  total: number;
  submitted: number;
  underReview: number;
  pending: number;
  overdue: number;
  overdueReports: Array<{
    id: number;
    projectName: string;
    reportType: string;
    reportStatus: string;
    reportDeadline: string;
    daysOverdue: number;
  }>;
}

interface ComplianceOverviewProps {
  compliance: ComplianceMetrics | null;
  isLoading: boolean;
  t: any;
  isRTL?: boolean;
}

export function ComplianceOverview({
  compliance,
  isLoading,
  t,
  isRTL = false,
}: ComplianceOverviewProps) {
  if (isLoading) {
    return (
      <Card className={isRTL ? 'rtl' : 'ltr'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {t.reportingCompliance?.title || 'Reporting Compliance'}
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

  if (!compliance) {
    return (
      <Card className={isRTL ? 'rtl' : 'ltr'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {t.reportingCompliance?.title || 'Reporting Compliance'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">
            {t.reportingCompliance?.noData || 'No compliance data available'}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Determine compliance status color
  const getComplianceColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    if (rate >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getComplianceBgColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-50';
    if (rate >= 60) return 'bg-yellow-50';
    if (rate >= 40) return 'bg-orange-50';
    return 'bg-red-50';
  };

  return (
    <Card className={isRTL ? 'rtl' : 'ltr'}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {t.reportingCompliance?.title || 'Reporting Compliance'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Compliance Rate */}
        <div className={`p-4 rounded-lg ${getComplianceBgColor(compliance.complianceRate)}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {t.reportingCompliance?.complianceRate || 'Compliance Rate'}
            </span>
            <span className={`text-2xl font-bold ${getComplianceColor(compliance.complianceRate)}`}>
              {compliance.complianceRate}%
            </span>
          </div>
          <p className="text-sm text-gray-600">
            {compliance.submitted + compliance.underReview} / {compliance.total}{' '}
            {t.reportingCompliance?.submitted || 'submitted'}
          </p>
        </div>

        {/* Status Breakdown */}
        <div className="grid grid-cols-2 gap-3">
          {/* Submitted */}
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-xs font-medium text-gray-600">
                {t.reportingCompliance?.submitted || 'Submitted'}
              </span>
            </div>
            <p className="text-lg font-bold text-green-600">{compliance.submitted}</p>
          </div>

          {/* Under Review */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-gray-600">
                {t.reportingCompliance?.underReview || 'Under Review'}
              </span>
            </div>
            <p className="text-lg font-bold text-blue-600">{compliance.underReview}</p>
          </div>

          {/* Pending */}
          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-xs font-medium text-gray-600">
                {t.reportingCompliance?.pending || 'Pending'}
              </span>
            </div>
            <p className="text-lg font-bold text-yellow-600">{compliance.pending}</p>
          </div>

          {/* Overdue */}
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-xs font-medium text-gray-600">
                {t.reportingCompliance?.overdue || 'Overdue'}
              </span>
            </div>
            <p className="text-lg font-bold text-red-600">{compliance.overdue}</p>
          </div>
        </div>

        {/* Overdue Reports List */}
        {compliance.overdueReports.length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              {t.reportingCompliance?.overdueReports || 'Overdue Reports'}
            </h4>
            <div className="space-y-2">
              {compliance.overdueReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-200"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{report.projectName}</p>
                    <p className="text-xs text-gray-600">{report.reportType}</p>
                  </div>
                  <Badge variant="destructive" className="whitespace-nowrap">
                    {report.daysOverdue}d {t.reportingCompliance?.overdue || 'overdue'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
