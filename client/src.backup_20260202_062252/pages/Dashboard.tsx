import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/layouts/DashboardLayoutNew";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { 
  FileText, 
  FolderKanban, 
  TrendingUp, 
  Users, 
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { RecentActivity } from "@/components/RecentActivity";
import { AlertsPanel } from "@/components/AlertsPanel";
import { useTranslation } from "react-i18next";

export default function Dashboard() {
  const { t } = useTranslation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.getStats.useQuery(
    undefined,
    { enabled: isAuthenticated && !!user?.organizationId }
  );

  if (authLoading) {
    return <DashboardLayout><DashboardSkeleton /></DashboardLayout>;
  }

  if (!isAuthenticated || !user?.organizationId) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Organization Required</CardTitle>
              <CardDescription>
                You need to be assigned to an organization to access the dashboard.
                Please contact your administrator.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('nav.dashboard')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('dashboard.welcome')}
          </p>
        </div>

        {statsLoading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title={t('dashboard.activeProjects')}
                value={stats?.totalProjects || 0}
                description={`${stats?.activeProjects || 0} ${t('dashboard.ongoing')}`}
                icon={<FolderKanban className="h-4 w-4" />}
                trend="neutral"
              />
              <StatCard
                title={t('dashboard.approvedGrants')}
                value={stats?.totalGrants || 0}
                description={`${stats?.approvedGrants || 0} ${t('dashboard.active')}`}
                icon={<DollarSign className="h-4 w-4" />}
                trend="positive"
              />
              <StatCard
                title={t('dashboard.openCases')}
                value={stats?.openCases || 0}
                description={`${stats?.totalCases || 0} ${t('dashboard.totalCases')}`}
                icon={<Users className="h-4 w-4" />}
                trend="neutral"
              />
              <StatCard
                title={t('dashboard.documents')}
                value="—"
                description={t('dashboard.storedSecurely')}
                icon={<FileText className="h-4 w-4" />}
                trend="neutral"
              />
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.quickActions')}</CardTitle>
                <CardDescription>
                  {t('dashboard.quickActionsDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Link href="/grants">
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="mr-2 h-4 w-4" />
                      {t('dashboard.newGrant')}
                    </Button>
                  </Link>
                  <Link href="/projects">
                    <Button variant="outline" className="w-full justify-start">
                      <FolderKanban className="mr-2 h-4 w-4" />
                      {t('dashboard.newProject')}
                    </Button>
                  </Link>
                  <Link href="/surveys">
                    <Button variant="outline" className="w-full justify-start">
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {t('dashboard.createSurvey')}
                    </Button>
                  </Link>
                  <Link href="/cases">
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="mr-2 h-4 w-4" />
                      {t('dashboard.registerCase')}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity & Alerts */}
            <div className="grid gap-4 lg:grid-cols-2">
              <RecentActivity />
              <AlertsPanel />
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function StatCard({ 
  title, 
  value, 
  description, 
  icon, 
  trend 
}: { 
  title: string; 
  value: number | string; 
  description: string; 
  icon: React.ReactNode;
  trend: 'positive' | 'negative' | 'neutral';
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function ActivityItem({ 
  icon, 
  title, 
  description, 
  time 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  time: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1">{icon}</div>
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="text-xs text-muted-foreground">{time}</p>
      </div>
    </div>
  );
}

function AlertItem({ 
  type, 
  title, 
  description 
}: { 
  type: 'success' | 'warning' | 'info'; 
  title: string; 
  description: string;
}) {
  const icons = {
    success: <CheckCircle className="h-4 w-4 text-success" />,
    warning: <AlertCircle className="h-4 w-4 text-warning" />,
    info: <Clock className="h-4 w-4 text-primary" />,
  };

  return (
    <div className="flex items-start gap-3">
      <div className="mt-1">{icons[type]}</div>
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
