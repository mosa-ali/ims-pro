import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/layouts/DashboardLayoutNew";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Calendar, MapPin, FileText, DollarSign, TrendingUp, Target, Users, Upload, Edit } from "lucide-react";
import { useParams, Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  
  const { data: project, isLoading } = trpc.projects.getById.useQuery(
    { id: parseInt(id!) },
    { enabled: !!id && !!user?.organizationId }
  );

  const { data: grant } = trpc.grants.getById.useQuery(
    { id: project?.grantId! },
    { enabled: !!project?.grantId }
  );

  // Finance permissions
  const canAccessFinance = user?.role === 'admin' || user?.role === 'manager';
  const canEditFinance = user?.role === 'admin';

  // Fetch project-specific financial data
  const { data: budgets } = trpc.finance.listBudgets.useQuery(
    undefined,
    { enabled: !!user?.organizationId && canAccessFinance }
  );
  const { data: expenditures } = trpc.finance.listExpenditures.useQuery(
    undefined,
    { enabled: !!user?.organizationId && canAccessFinance }
  );

  // Filter for this project
  const projectBudgets = budgets?.filter(b => b.projectId === project?.id) || [];
  const projectBudgetIds = projectBudgets.map(b => b.id);
  const projectExpenditures = expenditures?.filter(e => projectBudgetIds.includes(e.budgetId)) || [];

  // Calculate financial metrics
  const totalBudget = projectBudgets.reduce((sum, b) => sum + parseFloat(b.budgetedAmount || "0"), 0);
  const totalSpent = projectExpenditures
    .filter(e => e.status === "approved" || e.status === "paid")
    .reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0);
  const remaining = totalBudget - totalSpent;
  const utilizationRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  if (!user?.organizationId) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('projectDetail.organizationRequired')}</CardTitle>
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
              <CardTitle>{t('projectDetail.projectNotFound')}</CardTitle>
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

  const statusColors = {
    planning: "bg-blue-500/10 text-blue-600",
    active: "bg-green-500/10 text-green-600",
    on_hold: "bg-amber-500/10 text-amber-600",
    completed: "bg-gray-500/10 text-gray-600",
    cancelled: "bg-red-500/10 text-red-600",
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/projects">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{project.titleEn}</h1>
              {project.titleAr && (
                <p className="text-lg text-muted-foreground mt-1" dir="rtl">
                  {project.titleAr}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusColors[project.status]}>
              {project.status.replace('_', ' ').toUpperCase()}
            </Badge>
            <Button variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Edit Project
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Project Code</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{project.projectCode}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Location</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{project.location || 'N/A'}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Start Date</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Date(project.startDate).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">End Date</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Date(project.endDate).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4" dir={isRTL ? "rtl" : "ltr"}>
          <TabsList>
            <TabsTrigger value="overview">{t('projectDetail.tabProgramsOverview')}</TabsTrigger>
            {canAccessFinance && <TabsTrigger value="finance">{t('projectDetail.financialOverview')}</TabsTrigger>}
            <TabsTrigger value="meal">{t('projectDetail.tabMEAL')}</TabsTrigger>
            <TabsTrigger value="surveys">{t('projectDetail.tabSurveys')}</TabsTrigger>
            <TabsTrigger value="cases">{t('projectDetail.tabCases')}</TabsTrigger>
            <TabsTrigger value="documents">{t('projectDetail.tabDocuments')}</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('projectDetail.projectInformation')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {grant && (
                  <div>
                    <h4 className="font-medium mb-2">{t('projectDetail.linkedGrant')}</h4>
                    <Link href={`/grants/${grant.id}`}>
                      <Button variant="outline" size="sm">
                        {grant.title}
                      </Button>
                    </Link>
                  </div>
                )}

                <Separator />

                {project.description && (
                  <div>
                    <h4 className="font-medium mb-2">{t('projectDetail.descriptionEnglish')}</h4>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {project.description}
                    </p>
                  </div>
                )}

                {project.descriptionAr && (
                  <div>
                    <h4 className="font-medium mb-2">{t('projectDetail.descriptionArabic')}</h4>
                    <p className="text-muted-foreground whitespace-pre-wrap" dir="rtl">
                      {project.descriptionAr}
                    </p>
                  </div>
                )}

                {project.objectives && (
                  <div>
                    <h4 className="font-medium mb-2">{t('projectDetail.objectivesEnglish')}</h4>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {project.objectives}
                    </p>
                  </div>
                )}

                {project.objectivesAr && (
                  <div>
                    <h4 className="font-medium mb-2">{t('projectDetail.objectivesArabic')}</h4>
                    <p className="text-muted-foreground whitespace-pre-wrap" dir="rtl">
                      {project.objectivesAr}
                    </p>
                  </div>
                )}

                {!project.description && !project.descriptionAr && (
                  <p className="text-muted-foreground italic">{t('projectDetail.noDescriptionProvided')}</p>
                )}

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-medium ml-2">
                      {Math.ceil(
                        (new Date(project.endDate).getTime() -
                          new Date(project.startDate).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )}{' '}
                      days
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Beneficiaries:</span>
                    <span className="font-medium ml-2">
                      {project.beneficiaryCount || 'Not specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created:</span>
                    <span className="font-medium ml-2">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Updated:</span>
                    <span className="font-medium ml-2">
                      {new Date(project.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Finance Tab */}
          {canAccessFinance && (
            <TabsContent value="finance" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${totalBudget.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      {projectBudgets.length} {projectBudgets.length === 1 ? 'budget' : 'budgets'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Expenditures</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${totalSpent.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      {projectExpenditures.length} {projectExpenditures.length === 1 ? 'expense' : 'expenses'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Remaining</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      <span className={remaining >= 0 ? "text-green-600" : "text-red-600"}>
                        ${Math.abs(remaining).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {utilizationRate.toFixed(1)}% utilized
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Financial Overview</CardTitle>
                      <CardDescription>
                        Budget allocation and expenditure tracking for this project
                      </CardDescription>
                    </div>
                    {canEditFinance && (
                      <Link href="/finance">
                        <Button>
                          <DollarSign className="mr-2 h-4 w-4" />
                          Manage Finance
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {projectBudgets.length > 0 ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">Budget Breakdown:</span>
                          <span className="font-mono">${totalBudget.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Approved Expenditures:</span>
                          <span className="font-mono">${totalSpent.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium">
                          <span>Variance:</span>
                          <span className={`font-mono ${remaining >= 0 ? "text-green-600" : "text-red-600"}`}>
                            ${Math.abs(remaining).toLocaleString()} {remaining >= 0 ? "(Under Budget)" : "(Over Budget)"}
                          </span>
                        </div>
                      </div>
                      <div className="pt-4 border-t">
                        <p className="text-sm text-muted-foreground mb-2">Recent Expenditures:</p>
                        {projectExpenditures.slice(0, 3).map((exp: any) => (
                          <div key={exp.id} className="flex justify-between text-sm py-1">
                            <span>{new Date(exp.expenditureDate).toLocaleDateString()}</span>
                            <span className="font-mono">${parseFloat(exp.amount).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No financial data available. Create budgets in the Finance module.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* MEAL Tab */}
          <TabsContent value="meal" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>MEAL Indicators</CardTitle>
                    <CardDescription>
                      Monitoring, Evaluation, Accountability & Learning
                    </CardDescription>
                  </div>
                  <Link href="/meal">
                    <Button>
                      <Target className="mr-2 h-4 w-4" />
                      Manage Indicators
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  No indicators defined yet. Add MEAL indicators to track project outcomes.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Surveys Tab */}
          <TabsContent value="surveys" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Project Surveys</CardTitle>
                    <CardDescription>Data collection and assessments</CardDescription>
                  </div>
                  <Link href="/surveys">
                    <Button>
                      <FileText className="mr-2 h-4 w-4" />
                      Create Survey
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  No surveys linked to this project
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cases Tab */}
          <TabsContent value="cases" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Case Management</CardTitle>
                    <CardDescription>Protection, PSS, and referrals</CardDescription>
                  </div>
                  <Link href="/cases">
                    <Button>
                      <Users className="mr-2 h-4 w-4" />
                      Register Case
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  No cases registered for this project
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Project Documents</CardTitle>
                    <CardDescription>Reports, assessments, and files</CardDescription>
                  </div>
                  <Button>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Document
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  No documents uploaded yet
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
