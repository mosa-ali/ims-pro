import { trpc } from "@/lib/trpc";
import React from "react";
import { useTranslation } from "react-i18next";
import { formatRelativeTime } from "@/lib/formatters";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle2, 
  XCircle, 
  FileText, 
  DollarSign, 
  Users, 
  Target,
  AlertCircle,
  Clock
} from "lucide-react";

const getActionIcon = (action: string) => {
  const icons: Record<string, React.ReactElement> = {
    create_grant: <FileText className="h-4 w-4" />,
    approve_grant: <CheckCircle2 className="h-4 w-4 text-green-600" />,
    reject_grant: <XCircle className="h-4 w-4 text-red-600" />,
    create_project: <Target className="h-4 w-4" />,
    update_project: <Target className="h-4 w-4" />,
    create_budget: <DollarSign className="h-4 w-4" />,
    approve_budget: <CheckCircle2 className="h-4 w-4 text-green-600" />,
    create_expenditure: <DollarSign className="h-4 w-4 text-orange-600" />,
    approve_expenditure: <CheckCircle2 className="h-4 w-4 text-green-600" />,
    create_beneficiary: <Users className="h-4 w-4" />,
    update_beneficiary: <Users className="h-4 w-4" />,
    create_forecast_plan: <FileText className="h-4 w-4" />,
    update_forecast_plan: <FileText className="h-4 w-4" />,
  };
  return icons[action] || <FileText className="h-4 w-4" />;
};

// Action labels will be translated dynamically using t() function

export function RecentActivity() {
  const { t } = useTranslation();
  const { data: activities = [], isLoading } = trpc.dashboard.getRecentActivity.useQuery();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.recentActivity')}</CardTitle>
          <CardDescription>{t('dashboard.recentActivityDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="h-8 w-8 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.recentActivity')}</CardTitle>
          <CardDescription>{t('dashboard.recentActivityDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{t('dashboard.noRecentActivity')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('dashboard.recentActivity')}</CardTitle>
        <CardDescription>{t('dashboard.recentActivityDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 pb-4 border-b last:border-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  {getActionIcon(activity.action)}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm">
                    <span className="font-medium">{activity.userName || t('common.user')}</span>
                    {" "}
                    <span className="text-muted-foreground">
                      {t(`dashboard.${activity.action.replace(/_/g, '')}`, activity.action.replace(/_/g, " "))}
                    </span>
                  </p>
                  {(activity.details as any) && (
                    <p className="text-xs text-muted-foreground">{String(activity.details)}</p>
                  )}
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatRelativeTime(activity.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
