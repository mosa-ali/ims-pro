import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/layouts/DashboardLayoutNew";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { 
  FolderKanban, 
  Search, 
  DollarSign, 
  TrendingUp, 
  Users, 
  FileText,
  Calendar,
  BarChart3,
  CheckCircle2,
  Clock,
  Eye,
  Edit,
  Trash2,
  Upload
} from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { formatDate, formatCurrency } from "@/lib/formatters";
import * as XLSX from 'xlsx';

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  planning: "secondary",
  active: "default",
  on_hold: "destructive",
  completed: "outline",
  closed: "outline",
};

export default function ProjectsDashboard() {
  const { t, i18n } = useTranslation();
  
  // Helper function to get localized project title
  const getProjectTitle = (project: any) => {
    if (i18n.language === 'ar' && project.titleAr) {
      return project.titleAr;
    }
    return project.titleEn;
  };
  
  const STATUS_FILTERS = [
    { value: "all", label: t('projects.all') },
    { value: "ongoing", label: t('projects.ongoing') },
    { value: "planned", label: t('projects.planned') },
    { value: "completed", label: t('projects.completed') },
    { value: "not_started", label: t('projects.notStarted') },
  ];
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Export to Excel: exports data if exists, otherwise template
  const handleExportToExcel = () => {

    
    // Bilingual headers
    const headers = i18n.language === 'ar'
      ? ['رمز المشروع', 'عنوان المشروع', 'الحالة', 'تاريخ البدء', 'تاريخ الانتهاء', 'الموقع', 'الوصف', 'الأهداف', 'عدد المستفيدين']
      : ['Project Code', 'Project Title', 'Status', 'Start Date', 'End Date', 'Location', 'Description', 'Objectives', 'Beneficiary Count'];
    
    let data;
    let filename;
    
    if (filteredProjects && filteredProjects.length > 0) {
      // Export actual project data
      data = filteredProjects.map((project: any) => ([
        project.projectCode,
        getProjectTitle(project),
        project.status,
        project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
        project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
        project.location || '',
        project.description || '',
        project.objectives || '',
        project.beneficiaryCount || 0
      ]));
      filename = 'projects_data.xlsx';
      toast.success(t('projects.exportSuccess'));
    } else {
      // Export template with example data
      const exampleRow = i18n.language === 'ar'
        ? ['PROJ-001', 'مشروع تجريبي', 'active', '2025-01-01', '2025-12-31', 'اليمن', 'وصف المشروع هنا', 'أهداف المشروع هنا', 100]
        : ['PROJ-001', 'Example Project', 'active', '2025-01-01', '2025-12-31', 'Yemen', 'Project description here', 'Project objectives here', 100];
      data = [exampleRow];
      filename = 'projects_template.xlsx';
      toast.success(t('projects.templateDownloaded'));
    }
    
    const sheetData = [headers, ...data];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Projects');
    XLSX.writeFile(wb, filename);
  };

  // Import from Excel
  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
  
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length < 2) {
        toast.error(t('projects.importFailed') + ': No data found');
        return;
      }

      // Skip header row
      const rows = jsonData.slice(1) as any[];
      let imported = 0;
      let skipped = 0;

      for (const row of rows) {
        if (!row[0] || !row[1] || !row[2] || !row[3] || !row[4]) {
          skipped++;
          continue; // Skip rows with missing required fields
        }

        try {
          await createProjectMutation.mutateAsync({
            projectCode: String(row[0]),
            titleEn: String(row[1]),
            titleAr: String(row[1]), // Use same title for Arabic if not provided
            startDate: new Date(row[3]),
            endDate: new Date(row[4]),
            location: row[5] ? String(row[5]) : undefined,
            description: row[6] ? String(row[6]) : undefined,
            objectives: row[7] ? String(row[7]) : undefined,
            beneficiaryCount: row[8] ? Number(row[8]) : undefined,
          });
          imported++;
        } catch (error) {
          skipped++;
        }
      }

      toast.success(`${t('projects.importSuccess')}: ${imported} ${t('projects.recordsImported')}. ${skipped > 0 ? `${skipped} skipped.` : ''}`);
      event.target.value = ''; // Reset file input
    } catch (error) {
      toast.error(t('projects.importFailed') + ': ' + (error as Error).message);
    }
  };

  const { data: projects, isLoading } = trpc.projects.list.useQuery(undefined, { 
    enabled: !!user?.organizationId 
  });
  const { data: grants } = trpc.grants.list.useQuery(undefined, { 
    enabled: !!user?.organizationId 
  });
  const { data: budgets } = trpc.finance.listBudgets.useQuery(undefined, {
    enabled: !!user?.organizationId
  });
  const { data: expenditures } = trpc.finance.listExpenditures.useQuery(undefined, {
    enabled: !!user?.organizationId
  });

  const utils = trpc.useUtils();
  const deleteProjectMutation = trpc.projects.delete.useMutation({
    onSuccess: () => {
      toast.success(t('projects.projectDeleted'));
      utils.projects.list.invalidate();
    },
    onError: (error) => {
      toast.error(`${t('projects.deleteProjectFailed')}: ${error.message}`);
    },
  });

  const createProjectMutation = trpc.projects.create.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
    },
  });

  // ============================================================================
  // DASHBOARD KPI CALCULATIONS - SINGLE SOURCE OF TRUTH: Finance → Overview
  // ============================================================================
  // All financial KPIs are calculated dynamically from Finance module data ONLY.
  // NO hardcoded values. NO estimates. NO placeholder data.
  // This ensures donor audit compliance and financial accountability.
  // ============================================================================
  const statistics = useMemo(() => {
    // When no data exists, all KPIs must be zero
    if (!projects || !budgets || !expenditures) {
      return {
        activePrograms: 0,
        totalBudget: 0,
        actualSpent: 0,
        balance: 0,
        avgCompletionRate: 0,
      };
    }

    // Step 1: Filter to ACTIVE projects only (status === 'active')
    const activeProjects = projects.filter(p => p.status === 'active');
    const activePrograms = activeProjects.length;
    
    // Step 2: Get project IDs for active projects
    const activeProjectIds = new Set(activeProjects.map(p => p.id));
    
    // Step 3: Calculate Total Budget
    // Sum of ALL APPROVED budgets for active projects ONLY
    // Data source: Finance → Budgets table (status = 'approved')
    const totalBudget = budgets
      .filter((b: any) => 
        activeProjectIds.has(b.projectId) && 
        (b.status === 'approved' || b.status === 'Approved')
      )
      .reduce((sum: number, b: any) => 
        sum + parseFloat(b.budgetedAmount || '0'), 0
      );
    
    // Step 4: Calculate Actual Spent
    // Sum of ALL APPROVED expenditures for active projects ONLY
    // Data source: Finance → Expenditures table (status = 'approved')
    const actualSpent = expenditures
      .filter((e: any) => {
        // Find budget for this expenditure to get project ID
        const budget = budgets.find((b: any) => b.id === e.budgetId);
        return budget && activeProjectIds.has(budget.projectId) && 
               (e.status === 'approved' || e.status === 'Approved');
      })
      .reduce((sum: number, e: any) => 
        sum + parseFloat(e.amount || '0'), 0
      );
    
    // Step 5: Calculate Balance
    // Formula: Total Budget - Actual Spent
    // This is a simple subtraction, always dynamic
    const balance = totalBudget - actualSpent;

    // Step 6: Calculate Avg. Completion Rate
    // Formula: (Actual Spent / Total Budget) * 100
    // This represents FINANCIAL PROGRESS (budget utilization %), NOT timeline progress
    // This is the ONLY acceptable method for donor-compliant financial reporting
    // When no budget exists (totalBudget = 0), completion rate MUST be 0%
    // Data source: Calculated from totalBudget and actualSpent above
    const avgCompletionRate = totalBudget > 0
      ? (actualSpent / totalBudget) * 100
      : 0;

    return {
      activePrograms,
      totalBudget,
      actualSpent,
      balance,
      avgCompletionRate,
    };
  }, [projects, budgets, expenditures]);

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    if (!projects) return [];

    let filtered = projects.filter(project => {
      const matchesSearch = 
        getProjectTitle(project).toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.projectCode?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || (() => {
        const now = new Date();
        const start = new Date(project.startDate);
        const end = new Date(project.endDate);

        switch (statusFilter) {
          case "ongoing":
            return project.status === "active" && now >= start && now <= end;
          case "planned":
            return project.status === "planning" || now < start;
          case "completed":
            return project.status === "completed" || now > end;
          case "not_started":
            return now < start;
          default:
            return true;
        }
      })();

      return matchesSearch && matchesStatus;
    });

    // Sort by title
    filtered.sort((a, b) => {
      const comparison = getProjectTitle(a).localeCompare(getProjectTitle(b));
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [projects, searchQuery, statusFilter, sortOrder]);

  // Calculate budget utilization for each project
  const getProjectBudgetUtilization = (projectId: number) => {
    if (!budgets || !expenditures) return 0;

    const projectBudgets = budgets.filter((b: any) => b.projectId === projectId);
    const totalBudget = projectBudgets.reduce((sum: number, b: any) => 
      sum + parseFloat(b.budgetedAmount || '0'), 0
    );

    const projectExpenses = expenditures.filter((e: any) => e.projectId === projectId);
    const totalSpent = projectExpenses.reduce((sum: number, e: any) => 
      sum + parseFloat(e.amount || '0'), 0
    );

    return totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  };

  if (!user?.organizationId) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Required</CardTitle>
              <CardDescription>You must be part of an organization to access projects.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('projects.dashboardTitle')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('projects.dashboardDescription')}
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow" 
            onClick={() => setLocation("/grants/active")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('projects.grantManagement')}</CardTitle>
              <DollarSign className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{grants?.filter(g => g.status === 'ongoing' || g.status === 'approved').length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('projects.grantManagementDesc')}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('projects.beneficiaryDatabase')}</CardTitle>
              <Users className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('projects.beneficiaryDatabaseDesc')}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('projects.projectsReports')}</CardTitle>
              <FileText className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projects?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('projects.projectsReportsDesc')}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('projects.reportingPeriodManagement')}</CardTitle>
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('projects.reportingPeriodManagementDesc')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('projects.activePrograms')}</CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{statistics.activePrograms}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('projects.totalBudget')}</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(statistics.totalBudget, 'EUR')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('projects.actualSpent')}</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(statistics.actualSpent, 'EUR')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('projects.balance')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(statistics.balance, 'EUR')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('projects.avgCompletionRate')}</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {statistics.avgCompletionRate.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Project List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('projects.projectList')}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportToExcel}>
                <FileText className="mr-2 h-4 w-4" />
                {t('projects.exportToExcel')}
              </Button>
              <Button variant="outline" onClick={() => document.getElementById('project-import-input')?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                {t('projects.importExcel')}
              </Button>
              <input
                id="project-import-input"
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleImportExcel}
              />
              <Button onClick={() => setLocation("/projects/new")}>
                <FolderKanban className="mr-2 h-4 w-4" />
                {t('projects.addNewProject')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('projects.searchByProjectTitle')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((filter) => (
                <Button
                  key={filter.value}
                  variant={statusFilter === filter.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(filter.value)}
                >
                  {filter.label}
                </Button>
              ))}
              <div className="ml-auto flex gap-2">
                <Button
                  variant={sortOrder === "asc" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortOrder("asc")}
                >
                  {t('projects.sortAZ')}
                </Button>
                <Button
                  variant={sortOrder === "desc" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortOrder("desc")}
                >
                  {t('projects.sortZA')}
                </Button>
              </div>
            </div>

            {/* Projects */}
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-6 bg-muted rounded w-3/4" />
                      <div className="h-4 bg-muted rounded w-1/2 mt-2" />
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('projects.noProjectsFound')}</p>
                <p className="text-sm mt-2">{t('projects.noProjectsFoundDesc')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredProjects.map((project) => {
                  const budgetUtilization = getProjectBudgetUtilization(project.id);
                  return (
                    <Card key={project.id} className="bg-card/50 hover:bg-card hover:shadow-md transition-all border-border/50">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                              <CardTitle className="text-lg">{getProjectTitle(project)}</CardTitle>
                              <Badge variant={STATUS_VARIANTS[project.status] || "default"}>
                                {t(`projectStatus.${project.status}`)}
                              </Badge>
                            </div>
                            
                            <CardDescription className="mt-3">
                              {project.description || "Promoting Inclusion and Social Change through Sports"}
                            </CardDescription>
                          </div>
                        </div>

                        {/* Subtle divider */}
                        <div className="mt-4 mb-4 border-t border-border/40" />

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{t('projects.budgetUtilization')}</span>
                            <span className={`font-medium ${
                              budgetUtilization > 90 ? 'text-red-600' : 
                              budgetUtilization > 75 ? 'text-amber-600' : 
                              'text-emerald-600'
                            }`}>
                              {budgetUtilization.toFixed(1)}%
                            </span>
                          </div>
                          <Progress 
                            value={budgetUtilization} 
                            className={`h-2 ${
                              budgetUtilization > 90 ? '[&>div]:bg-red-500' : 
                              budgetUtilization > 75 ? '[&>div]:bg-amber-500' : 
                              '[&>div]:bg-emerald-500'
                            }`}
                          />
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">{t('projects.startDate')}</span>
                            <p className="font-medium">
                              {formatDate(new Date(project.startDate))}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{t('projects.endDate')}</span>
                            <p className="font-medium">
                              {formatDate(new Date(project.endDate))}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{t('projects.sector')}</span>
                            <p className="font-medium">N/A</p>
                          </div>
                        </div>

                        {/* Action Buttons - Positioned below Start Date */}
                        <div className="mt-4 flex gap-2">
                          <Button
                            onClick={() => setLocation(`/projects/${project.id}`)}
                            size="sm"
                            variant="default"
                            className="h-8"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1.5" />
                            {t('projects.viewDetails')}
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setLocation(`/projects/${project.id}/edit`);
                            }}
                            size="sm"
                            variant="outline"
                            className="h-8"
                          >
                            <Edit className="h-3.5 w-3.5 mr-1.5" />
                            {t('common.edit')}
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`${t('projects.confirmDelete')} This action can be undone from Deleted Records.`)) {
                                deleteProjectMutation.mutate({ id: project.id });
                              }
                            }}
                            size="sm"
                            variant="ghost"
                            className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            {t('projects.deleteProject')}
                          </Button>
                        </div>


                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
