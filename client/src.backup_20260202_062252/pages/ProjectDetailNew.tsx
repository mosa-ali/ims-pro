import { useAuth } from "@/_core/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/LanguageContext";
import DashboardLayout from "@/layouts/DashboardLayoutNew";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  FileText, 
  Edit,
  Users,
  CheckCircle2,
  Target,
  ListTodo,
  DollarSign,
  BarChart3,
  Layers
} from "lucide-react";
import { useParams, Link, useLocation } from "wouter";
import { useState } from "react";

// Import tab components (to be created)
import ProgramsOverview from "@/components/project-tabs/ProgramsOverview";
import { ActivitiesTab } from "@/components/project-tabs/ActivitiesTab_Figma";
import { TasksTab } from "@/components/project-tabs/TasksTab_Figma";
import { IndicatorsTab as ProjectIndicators } from "@/components/project-tabs/ProjectIndicators";
import BeneficiariesTab from "@/components/project-tabs/BeneficiariesTab";
import FinancialOverview from "@/components/project-tabs/FinancialOverview";
import ProjectReport from "@/components/project-tabs/ProjectReport";
import { ForecastPlan } from "@/components/project-tabs/ForecastPlan";
import { ProcurementPlan } from "@/components/project-tabs/ProcurementPlan";
import ProjectPlan from "@/pages/ProjectPlan";
import { CaseManagementTab } from "@/pages/CaseManagementTab";

export default function ProjectDetailNew() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const { isRTL } = useLanguage();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  
  const { data: project, isLoading } = trpc.projects.getById.useQuery(
    { id: parseInt(id!) },
    { enabled: !!id && !!user?.organizationId }
  );

  const { data: grant } = trpc.grants.getById.useQuery(
    { id: project?.grantId! },
    { enabled: !!project?.grantId }
  );

  // Permissions
  const canEdit = user?.role === 'admin' || user?.role === 'manager';
  const canAccessFinance = user?.role === 'admin' || user?.role === 'manager';

  if (!user?.organizationId) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('common.error')}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <div className="h-8 bg-muted rounded w-48 animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('common.error')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href="/projects">
                <Button variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t('projectDetail.backToProjects')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const statusColors: Record<string, string> = {
    planning: "bg-blue-500/10 text-blue-600",
    active: "bg-green-500/10 text-green-600",
    on_hold: "bg-amber-500/10 text-amber-600",
    completed: "bg-gray-500/10 text-gray-600",
    cancelled: "bg-red-500/10 text-red-600",
  };

  // Calculate remaining days
  const endDate = new Date(project.endDate);
  const today = new Date();
  const remainingDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Status translation helper
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      active: t('projectDetail.statusActive'),
      planning: t('projectDetail.statusPlanning'),
      on_hold: t('projectDetail.statusOnHold'),
      completed: t('projectDetail.statusCompleted'),
      cancelled: t('projectDetail.statusCancelled'),
    };
    return statusMap[status] || status.toUpperCase();
  };

  // Tab configurations
  const primaryTabs = [
    { value: "overview", icon: FileText, labelKey: "projectDetail.tabProgramsOverview" },
    { value: "activities", icon: CheckCircle2, labelKey: "projectDetail.tabViewAllActivities" },
    { value: "tasks", icon: ListTodo, labelKey: "projectDetail.tabTasksMgt" },
    { value: "case-management", icon: Users, labelKey: "projectDetail.tabCaseManagement" },
    { value: "project-plan", icon: Layers, labelKey: "projectDetail.tabProjectPlan" },
  ];

  const secondaryTabs = [
    { value: "indicators", icon: Target, labelKey: "projectDetail.tabProjectIndicators", show: true },
    { value: "beneficiaries", icon: Users, labelKey: "projectDetail.tabBeneficiaries", show: true },
    { value: "financial", icon: DollarSign, labelKey: "projectDetail.tabFinancialOverview", show: canAccessFinance },
    { value: "forecast", icon: BarChart3, labelKey: "projectDetail.tabForecastPlan", show: canAccessFinance },
    { value: "procurement", icon: Layers, labelKey: "projectDetail.tabProcurementPlan", show: canAccessFinance },
    { value: "report", icon: BarChart3, labelKey: "projectDetail.tabProjectReport", show: true },
  ];

  // DO NOT reverse arrays - flex-row-reverse handles visual order
  // Keep logical order: Overview first, Reports last
  const displayPrimaryTabs = primaryTabs;
  const displaySecondaryTabs = secondaryTabs;

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/projects">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">{project.titleEn}</h1>
                <Badge className={statusColors[project.status]}>
                  {getStatusText(project.status)}
                </Badge>
              </div>
              {project.titleAr && (
                <p className="text-lg text-muted-foreground mt-1" dir="rtl">
                  {project.titleAr}
                </p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {project.location || t('projectDetail.notAvailable')}
                </span>
                {remainingDays >= 0 && (
                  <span className="font-medium text-orange-600">
                    {remainingDays} {t('projectDetail.daysRemaining')}
                  </span>
                )}
              </div>
            </div>
          </div>
          {canEdit && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation(`/projects/${id}/edit`)}
            >
              <Edit className="mr-2 h-4 w-4" />
              {t('projectDetail.editProject')}
            </Button>
          )}
        </div>

        {/* Project Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t('projectDetail.projectInformation')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">{t('projectDetail.projectCode')}</p>
                <p className="font-medium">{project.projectCode}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('projectDetail.donorGrant')}</p>
                <p className="font-medium">{grant?.donorName || t('projectDetail.notAvailable')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('projectDetail.description')}</p>
                <p className="font-medium">{project.description || t('projectDetail.noDescriptionProvided')}</p>
              </div>
              {project.descriptionAr && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('projectDetail.descriptionArabic')}</p>
                  <p className="font-medium" dir="rtl">{project.descriptionAr}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs - Two Row Layout */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4" dir={isRTL ? "rtl" : "ltr"}>
          <div className="space-y-2">
            {/* Primary Tabs Row */}
            <TabsList className="flex w-full">
              {displayPrimaryTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger key={tab.value} value={tab.value} className="flex-1">
                    <Icon className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {t(tab.labelKey)}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            
            {/* Secondary Tabs Row */}
            <TabsList className="flex w-full">
              {displaySecondaryTabs
                .filter((tab) => tab.show)
                .map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger key={tab.value} value={tab.value} className="flex-1">
                      <Icon className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                      {t(tab.labelKey)}
                    </TabsTrigger>
                  );
                })}
            </TabsList>
          </div>

          <TabsContent value="overview">
            <ProgramsOverview projectId={project.id} />
          </TabsContent>

          <TabsContent value="activities">
            <ActivitiesTab projectId={project.id.toString()} />
          </TabsContent>

          <TabsContent value="tasks">
            <TasksTab />
          </TabsContent>

          <TabsContent value="case-management">
            <CaseManagementTab projectId={project.id} />
          </TabsContent>

          <TabsContent value="project-plan">
            <ProjectPlan />
          </TabsContent>

          <TabsContent value="indicators">
            <ProjectIndicators projectId={project.id} />
          </TabsContent>

          <TabsContent value="beneficiaries">
            <BeneficiariesTab projectId={project.id} />
          </TabsContent>

          {canAccessFinance && (
            <TabsContent value="financial">
              <FinancialOverview projectId={project.id} />
            </TabsContent>
          )}

          {canAccessFinance && (
            <TabsContent value="forecast">
              <ForecastPlan projectId={project.id} />
            </TabsContent>
          )}

          {canAccessFinance && (
            <TabsContent value="procurement">
              <ProcurementPlan projectId={project.id} />
            </TabsContent>
          )}

          <TabsContent value="report">
            <ProjectReport projectId={project.id} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
