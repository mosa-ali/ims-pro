/**
 * ============================================================================
 * PROJECT OVERVIEW TABLE - FINAL VERSION (i18n Fixed)
 * ============================================================================
 *
 * Unified project overview table combining:
 * - Project identification (name, code, donor)
 * - Status and health indicators
 * - Budget utilization with visual bars
 * - Timeline metrics (days remaining, end date)
 * - Reporting compliance (overdue reports)
 * - Burn health with trend indicators
 * - Risk indicators and warnings
 * - Full RTL/LTR and bilingual support via t prop
 *
 * ============================================================================
 */

import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';

interface ProjectData {
  id: number;
  name: string;
  code: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  donor?: string;
  riskLevel?: 'Low' | 'Medium' | 'High' | 'Critical';
  budgetUtilization?: number;
  totalBudget?: number;
  spent?: number;
  overdueReports?: number;
  daysRemaining?: number;
  endDate?: string;
  burnHealth?: 'Healthy' | 'Watch' | 'At Risk' | 'Critical';
  healthScore?: number;
  risks?: string[];
  titleAr?: string;
  donorAr?: string;
}

interface ProjectOverviewTableProps {
  data: ProjectData[];
  isLoading: boolean;
  t: any;
  isRTL: boolean;
  onProjectClick?: (projectId: number) => void;
}

export function ProjectOverviewTable({
  data,
  isLoading = false,
  t,
  isRTL = false,
  onProjectClick,
}: ProjectOverviewTableProps) {
  // Translated labels using t prop keys from projectMgmtDashboard.i18n.ts
  const labels = {
    title:           t?.projectOverview     || 'Project Overview',
    colProjectName:  t?.colProjectName      || 'Project Name',
    colStatus:       t?.colStatus           || 'Status',
    colDonor:        t?.colDonor            || 'Donor',
    colRisk:         t?.colRisk             || 'Risk',
    colBudgetUtil:   t?.colBudgetUtil       || 'Budget Util.',
    colOverdue:      t?.colOverdueReports   || 'Overdue Rpts',
    colDaysLeft:     t?.colDaysLeft         || 'Days Left',
    colBurnHealth:   t?.colBurnHealth       || 'Burn Health',
    colEndDate:      t?.colEndDate          || 'End Date',
    noProjects:      t?.noProjects          || 'No projects found',
    none:            t?.none                || 'None',
    dOverdue:        t?.dOverdue            || 'd overdue',
    dLeft:           t?.dLeft               || 'd',
    burnHealthy:     t?.burnHealth_healthy  || 'Healthy',
    burnWarning:     t?.burnHealth_warning  || 'Warning',
    burnCritical:    t?.burnHealth_critical || 'Critical',
    loading:         t?.loading             || 'Loading projects...',
    activeRisks:     t?.activeRisks         || 'Active Risks',
  };

  // Get health status color
  const getHealthColor = (status?: string) => {
    switch (status) {
      case 'Healthy':
        return 'bg-green-100 text-green-800';
      case 'Watch':
        return 'bg-yellow-100 text-yellow-800';
      case 'At Risk':
        return 'bg-orange-100 text-orange-800';
      case 'Critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get translated burn health label
  const getBurnHealthLabel = (status?: string) => {
    switch (status) {
      case 'Healthy':
        return labels.burnHealthy;
      case 'Watch':
        return labels.burnWarning;
      case 'At Risk':
        return labels.burnWarning;
      case 'Critical':
        return labels.burnCritical;
      default:
        return status || '';
    }
  };

  // Get risk level color
  const getRiskColor = (risk?: string) => {
    switch (risk) {
      case 'Low':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'Medium':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'High':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Critical':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  // Get status color
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'on_hold':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format currency
  const formatCurrency = (value?: number) => {
    if (!value) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format date
  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{labels.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">{labels.loading}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{labels.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">{labels.noProjects}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card dir={isRTL ? 'rtl' : 'ltr'}>
      <CardHeader>
        <CardTitle>{labels.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{labels.colProjectName}</TableHead>
                <TableHead>{labels.colStatus}</TableHead>
                <TableHead>{labels.colDonor}</TableHead>
                <TableHead>{labels.colRisk}</TableHead>
                <TableHead>{labels.colBudgetUtil}</TableHead>
                <TableHead>{labels.colOverdue}</TableHead>
                <TableHead>{labels.colDaysLeft}</TableHead>
                <TableHead>{labels.colBurnHealth}</TableHead>
                <TableHead>{labels.colEndDate}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((project: ProjectData) => (
                <TableRow
                  key={project.id}
                  onClick={() => onProjectClick?.(project.id)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  {/* Project Name */}
                  <TableCell className="font-medium">
                    <div>
                      <p className="font-semibold">
                        {isRTL ? project.titleAr || project.name : project.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{project.code}</p>
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge className={getStatusColor(project.status)}>
                      {project.status}
                    </Badge>
                  </TableCell>

                  {/* Donor */}
                  <TableCell className="text-sm">
                    {isRTL ? project.donorAr || project.donor : project.donor || '-'}
                  </TableCell>

                  {/* Risk Level */}
                  <TableCell>
                    <Badge variant="outline" className={getRiskColor(project.riskLevel)}>
                      {project.riskLevel || labels.none}
                    </Badge>
                  </TableCell>

                  {/* Budget Utilization */}
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              (project.budgetUtilization || 0) > 100
                                ? 'bg-red-500'
                                : (project.budgetUtilization || 0) > 85
                                  ? 'bg-orange-500'
                                  : 'bg-green-500'
                            }`}
                            style={{
                              width: `${Math.min(project.budgetUtilization || 0, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium">
                          {Math.round(project.budgetUtilization || 0)}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(project.spent)} / {formatCurrency(project.totalBudget)}
                      </p>
                    </div>
                  </TableCell>

                  {/* Overdue Reports */}
                  <TableCell>
                    {project.overdueReports && project.overdueReports > 0 ? (
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="font-medium text-red-600">
                          {project.overdueReports}{labels.dOverdue}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-green-600">{labels.none}</span>
                      </div>
                    )}
                  </TableCell>

                  {/* Days Remaining */}
                  <TableCell>
                    <div className="text-sm">
                      {project.daysRemaining !== undefined ? (
                        <span
                          className={
                            project.daysRemaining < 30
                              ? 'font-semibold text-orange-600'
                              : 'text-foreground'
                          }
                        >
                          {project.daysRemaining}{labels.dLeft}
                        </span>
                      ) : (
                        '-'
                      )}
                    </div>
                  </TableCell>

                  {/* Burn Health */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge className={getHealthColor(project.burnHealth)}>
                        {getBurnHealthLabel(project.burnHealth)}
                      </Badge>
                      {project.burnHealth === 'At Risk' && (
                        <TrendingUp className="h-4 w-4 text-orange-500" />
                      )}
                      {project.burnHealth === 'Critical' && (
                        <TrendingUp className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </TableCell>

                  {/* End Date */}
                  <TableCell className="text-sm">
                    {formatDate(project.endDate)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Risk Summary */}
        {data.some(p => p.risks && p.risks.length > 0) && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-semibold text-red-900 mb-2">{labels.activeRisks}</h4>
            <ul className="space-y-1">
              {data
                .flatMap(p => (p.risks || []).map(r => ({ projectName: p.name, risk: r })))
                .map((item, idx) => (
                  <li key={idx} className="text-sm text-red-800">
                    <strong>{item.projectName}:</strong> {item.risk}
                  </li>
                ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
