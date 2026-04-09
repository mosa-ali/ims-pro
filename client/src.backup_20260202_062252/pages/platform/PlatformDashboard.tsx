import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Building2, Users, Database, Cloud, Zap, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { trpc } from '@/lib/trpc';
import { Skeleton } from "@/components/ui/skeleton";

export default function PlatformDashboard() {
  const { t } = useTranslation();
  
  const { data: stats, isLoading: statsLoading } = trpc.platform.getStats.useQuery();
  const { data: health, isLoading: healthLoading } = trpc.platform.getSystemHealth.useQuery();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'offline':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'healthy':
        return t('platform.dashboard.healthy');
      case 'degraded':
        return t('platform.dashboard.degraded');
      case 'offline':
        return t('platform.dashboard.offline');
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('platform.dashboard.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('platform.dashboard.subtitle')}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('platform.dashboard.totalOrganizations')}
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalOrganizations || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {statsLoading ? (
                <Skeleton className="h-4 w-24" />
              ) : (
                `${stats?.activeOrganizations || 0} ${t('platform.dashboard.activeOrganizations').toLowerCase()}`
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('platform.dashboard.totalUsers')}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {t('platform.dashboard.platformReadiness')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('platform.dashboard.databaseStatus')}
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {healthLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="flex items-center gap-2">
                {getStatusIcon(health?.database || 'unknown')}
                <span className="text-lg font-semibold">
                  {getStatusText(health?.database || 'unknown')}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('platform.dashboard.storageStatus')}
            </CardTitle>
            <Cloud className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {healthLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="flex items-center gap-2">
                {getStatusIcon(health?.storage || 'unknown')}
                <span className="text-lg font-semibold">
                  {getStatusText(health?.storage || 'unknown')}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t('platform.dashboard.systemHealth')}
          </CardTitle>
          <CardDescription>
            {t('platform.systemHealth.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Database className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{t('platform.systemHealth.database')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('platform.dashboard.databaseStatus')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(health?.database || 'unknown')}
                  <span className="font-medium">
                    {getStatusText(health?.database || 'unknown')}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{t('platform.systemHealth.api')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('platform.dashboard.apiStatus')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(health?.api || 'unknown')}
                  <span className="font-medium">
                    {getStatusText(health?.api || 'unknown')}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Cloud className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{t('platform.systemHealth.storage')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('platform.dashboard.storageStatus')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(health?.storage || 'unknown')}
                  <span className="font-medium">
                    {getStatusText(health?.storage || 'unknown')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('platform.dashboard.platformReadiness')}</CardTitle>
          <CardDescription>
            Overall platform operational status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              {getStatusIcon(health?.overall || 'unknown')}
              <div className="flex-1">
                <p className="font-semibold text-lg">
                  {getStatusText(health?.overall || 'unknown')}
                </p>
                <p className="text-sm text-muted-foreground">
                  All critical services operational
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
