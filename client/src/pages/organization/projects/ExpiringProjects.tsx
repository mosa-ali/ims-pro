import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Calendar, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

// Match ACTUAL procedure return types from projectsRouter.ts
interface ExpiringProjectItem {
  id: number;
  name: string | null;
  code: string | null;
  endDate: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  daysRemaining: number;
  budgetUtilization: number;
  totalBudgetUSD: number;
  spentUSD: number;
  expiryCategory: string;
}

interface ExpiringProjectsData {
  total: number;
  expiring30: number;
  expiring60: number;
  expiring90: number;
  projects: ExpiringProjectItem[];
}

interface ExpiringProjectsProps {
  projects: ExpiringProjectsData | null | undefined;
  isLoading?: boolean;
  isRTL?: boolean;
  t?: Record<string, any>;
}

export function ExpiringProjects({
  projects,
  isLoading = false,
  isRTL: isRTLProp = false,
  t = {},
}: ExpiringProjectsProps) {
  const { isRTL: contextIsRTL } = useLanguage();
  
  // Safe nested object access - prevents crashes when projects is undefined
  const safeProjects = projects?.projects ?? [];
  const total = projects?.total ?? 0;
  const expiring30 = projects?.expiring30 ?? 0;
  const expiring60 = projects?.expiring60 ?? 0;
  const expiring90 = projects?.expiring90 ?? 0;
  const isRTL = isRTLProp || contextIsRTL;

  const getStatusColor = (category: string) => {
    if (category === 'critical') return 'bg-red-50 border-red-200';
    if (category === 'warning') return 'bg-amber-50 border-amber-200';
    return 'bg-blue-50 border-blue-200';
  };

  const getStatusBadge = (category: string, daysRemaining: number) => {
    if (category === 'critical') {
      return (
        <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Closeout Now
        </Badge>
      );
    }
    if (category === 'warning') {
      return <Badge className="bg-amber-100 text-amber-800">Closeout Soon</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-800">Expires in {daysRemaining}d</Badge>;
  };

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
    }).format(new Date(dateStr));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card className="border border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Expiring Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!projects || safeProjects.length === 0) {
    return (
      <Card className="border border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Expiring Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-gray-500">
            <p>No projects expiring in the next 90 days</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Expiring Projects</CardTitle>
          <div className="flex gap-2">
            {expiring30 > 0 && (
              <Badge className="bg-red-100 text-red-800">{expiring30} Critical</Badge>
            )}
            {expiring60 > 0 && (
              <Badge className="bg-amber-100 text-amber-800">{expiring60} Warning</Badge>
            )}
            <Badge className="bg-blue-100 text-blue-800">{total} Total</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {safeProjects.map((project) => (
            <div
              key={project.id}
              className={`p-3 border rounded-lg transition-colors ${getStatusColor(project.expiryCategory)}`}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {project.name || `Project #${project.id}`}
                  </p>
                  <p className="text-xs text-gray-600">
                    {project.code ? `Code: ${project.code}` : 'No Code'}
                  </p>
                </div>
                {getStatusBadge(project.expiryCategory, project.daysRemaining)}
              </div>

              <div className="space-y-2">
                {/* Budget Utilization */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600">Budget Utilization</span>
                    <span className="font-semibold text-gray-700">{project.budgetUtilization.toFixed(1)}%</span>
                  </div>
                  <Progress value={Math.min(project.budgetUtilization, 100)} className="h-1.5" />
                </div>

                {/* Budget and Timeline */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-600">Budget</p>
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(project.totalBudgetUSD)}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-gray-600 mb-1">
                      <Clock className="w-3 h-3" />
                      <span>Expires</span>
                    </div>
                    <p className="font-semibold text-gray-900">{formatDate(project.endDate)}</p>
                  </div>
                </div>

                {/* Spent Amount */}
                <div className="text-xs">
                  <span className="text-gray-600">Spent: </span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(project.spentUSD)}
                  </span>
                </div>

                {/* Days Remaining */}
                <div className="flex items-center justify-between pt-1 border-t border-gray-200">
                  <span className="text-xs text-gray-600">Days Remaining</span>
                  <span
                    className={`text-sm font-bold ${
                      project.daysRemaining <= 30
                        ? 'text-red-700'
                        : project.daysRemaining <= 60
                          ? 'text-amber-700'
                          : 'text-blue-700'
                    }`}
                  >
                    {project.daysRemaining} days
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
