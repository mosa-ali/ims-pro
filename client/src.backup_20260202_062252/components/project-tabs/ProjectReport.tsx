import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { 
  Download, 
  RefreshCw, 
  FileText, 
  TrendingUp, 
  Target, 
  AlertTriangle,
  CheckCircle2,
  DollarSign
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/i18n/useTranslation";

interface ProjectReportProps {
  projectId: number;
}

export default function ProjectReport({ projectId }: ProjectReportProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [narratives, setNarratives] = useState({
    progressSummary: "",
    challenges: "",
    mitigationActions: "",
    keyAchievements: "",
    nextSteps: "",
  });

  const { data: project } = trpc.projects.getById.useQuery(
    { id: projectId },
    { enabled: !!projectId }
  );

  const { data: budgets } = trpc.finance.listBudgets.useQuery(undefined, {
    enabled: !!user?.organizationId
  });

  const { data: expenditures } = trpc.finance.listExpenditures.useQuery(undefined, {
    enabled: !!user?.organizationId
  });

  // Filter for this project
  const projectBudgets = useMemo(() => 
    budgets?.filter((b: any) => b.projectId === projectId) || [], 
    [budgets, projectId]
  );

  const projectBudgetIds = useMemo(() => 
    projectBudgets.map((b: any) => b.id), 
    [projectBudgets]
  );

  const projectExpenditures = useMemo(() => 
    expenditures?.filter((e: any) => projectBudgetIds.includes(e.budgetId)) || [], 
    [expenditures, projectBudgetIds]
  );

  // Calculate metrics
  const totalBudget = projectBudgets.reduce((sum: number, b: any) => 
    sum + parseFloat(b.budgetedAmount || "0"), 0
  );

  const totalSpent = projectExpenditures
    .filter((e: any) => e.status === "approved" || e.status === "paid")
    .reduce((sum: number, e: any) => sum + parseFloat(e.amount || "0"), 0);

  const burnRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // Calculate remaining days
  const remainingDays = project ? Math.ceil(
    (new Date(project.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  ) : 0;

  // Mock data for demonstration (TODO: Replace with real data)
  const performanceSummary = {
    implementationProgress: 45,
    budgetBurnRate: burnRate,
    activitiesCompleted: 5,
    activitiesTotal: 12,
    indicatorsAchieved: 3,
    indicatorsTotal: 8,
    tasksCompleted: 18,
    tasksTotal: 45,
    overallRiskLevel: "Medium",
  };

  const activities = [
    { name: "Sports Training Sessions", target: 100, achieved: 75, responsible: "Ahmed Hassan", status: "ongoing" },
    { name: "Community Engagement Events", target: 50, achieved: 20, responsible: "Fatima Ali", status: "ongoing" },
    { name: "Capacity Building Workshops", target: 30, achieved: 0, responsible: "Mohammed Saleh", status: "planned" },
  ];

  const indicators = [
    { name: "Youth participating in sports", baseline: 0, target: 500, achieved: 320, unit: "persons" },
    { name: "Community events conducted", baseline: 0, target: 20, achieved: 8, unit: "events" },
    { name: "Improved social cohesion (%)", baseline: 30, target: 75, achieved: 52, unit: "%" },
  ];

  const risks = [
    { title: "Weather disruptions", category: "External", level: "Medium", mitigation: "In Progress", owner: "Ahmed Hassan" },
    { title: "Funding delays", category: "Financial", level: "High", mitigation: "Mitigated", owner: "Finance Team" },
  ];

  const handleGeneratePDF = () => {
    toast.info("PDF generation will be implemented with backend support");
  };

  const handleRefresh = () => {
    toast.success("Data refreshed");
  };

  const getProgressColor = (progress: number) => {
    if (progress < 50) return "text-red-600";
    if (progress < 80) return "text-yellow-600";
    return "text-green-600";
  };

  const getRiskColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "high":
      case "critical":
        return "destructive";
      case "medium":
        return "secondary";
      default:
        return "default";
    }
  };

  const canEdit = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl">{project?.titleEn || t.projectDetail.projectReport}</CardTitle>
              <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                <div>
                  <span className="text-muted-foreground">{t.projectDetail.donor}: </span>
                  <span className="font-medium">N/A</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t.projectDetail.projectPeriod}: </span>
                  <span className="font-medium">
                    {project && `${new Date(project.startDate).toLocaleDateString()} - ${new Date(project.endDate).toLocaleDateString()}`}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t.projectDetail.remainingDays}: </span>
                  <span className={`font-medium ${remainingDays < 30 ? 'text-red-600' : 'text-green-600'}`}>
                    {remainingDays} {t.projectDetail.days}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t.projectDetail.reportGenerated}: </span>
                  <span className="font-medium">{new Date().toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t.projectDetail.refreshData}
              </Button>
              <Button size="sm" onClick={handleGeneratePDF}>
                <Download className="mr-2 h-4 w-4" />
                {t.projectDetail.generatePDF}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Overall Project Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>{t.projectDetail.overallPerformanceSummary}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">{t.projectDetail.implementationProgress}</p>
              <p className={`text-2xl font-bold ${getProgressColor(performanceSummary.implementationProgress)}`}>
                {performanceSummary.implementationProgress}%
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">{t.projectDetail.budgetBurnRate}</p>
              <p className={`text-2xl font-bold ${getProgressColor(performanceSummary.budgetBurnRate)}`}>
                {performanceSummary.budgetBurnRate.toFixed(1)}%
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">{t.projectDetail.activities}</p>
              <p className="text-2xl font-bold">
                {performanceSummary.activitiesCompleted}/{performanceSummary.activitiesTotal}
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">{t.projectDetail.indicators}</p>
              <p className="text-2xl font-bold">
                {performanceSummary.indicatorsAchieved}/{performanceSummary.indicatorsTotal}
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">{t.projectDetail.tasks}</p>
              <p className="text-2xl font-bold">
                {performanceSummary.tasksCompleted}/{performanceSummary.tasksTotal}
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">{t.projectDetail.riskLevel}</p>
              <Badge variant={getRiskColor(performanceSummary.overallRiskLevel)} className="text-sm">
                {performanceSummary.overallRiskLevel}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activities Progress */}
      <Card>
        <CardHeader>
          <CardTitle>{t.projectDetail.activitiesProgress}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.map((activity, index) => {
              const progress = (activity.achieved / activity.target) * 100;
              return (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium">{activity.name}</p>
                      <p className="text-sm text-muted-foreground">{t.projectDetail.responsible}: {activity.responsible}</p>
                    </div>
                    <Badge variant={activity.status === "ongoing" ? "default" : "secondary"}>
                      {activity.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm mb-2">
                    <div>
                      <span className="text-muted-foreground">{t.projectDetail.target}: </span>
                      <span className="font-medium">{activity.target}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t.projectDetail.achieved}: </span>
                      <span className="font-medium">{activity.achieved}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t.projectDetail.progress}: </span>
                      <span className={`font-medium ${getProgressColor(progress)}`}>
                        {progress.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Indicators Achievement */}
      <Card>
        <CardHeader>
          <CardTitle>{t.projectDetail.indicatorsAchievement}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="pb-3 font-medium">{t.projectDetail.indicatorName}</th>
                  <th className="pb-3 font-medium text-right">{t.projectDetail.baseline}</th>
                  <th className="pb-3 font-medium text-right">{t.projectDetail.target}</th>
                  <th className="pb-3 font-medium text-right">{t.projectDetail.achieved}</th>
                  <th className="pb-3 font-medium">{t.projectDetail.unit}</th>
                  <th className="pb-3 font-medium text-right">{t.projectDetail.achievementPercent}</th>
                  <th className="pb-3 font-medium">{t.common.status}</th>
                </tr>
              </thead>
              <tbody>
                {indicators.map((indicator, index) => {
                  const achievement = ((indicator.achieved - indicator.baseline) / (indicator.target - indicator.baseline)) * 100;
                  return (
                    <tr key={index} className="border-b">
                      <td className="py-3">{indicator.name}</td>
                      <td className="py-3 text-right">{indicator.baseline}</td>
                      <td className="py-3 text-right">{indicator.target}</td>
                      <td className="py-3 text-right font-medium">{indicator.achieved}</td>
                      <td className="py-3">{indicator.unit}</td>
                      <td className={`py-3 text-right font-medium ${getProgressColor(achievement)}`}>
                        {achievement.toFixed(1)}%
                      </td>
                      <td className="py-3">
                        <div className="w-24">
                          <Progress value={achievement} className="h-2" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Budget & Financial Performance */}
      <Card>
        <CardHeader>
          <CardTitle>{t.projectDetail.budgetFinancialPerformance}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 mb-4">
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">{t.projectDetail.totalBudget}</p>
              <p className="text-xl font-bold text-green-600">${totalBudget.toLocaleString()}</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">{t.projectDetail.actualSpent}</p>
              <p className="text-xl font-bold">${totalSpent.toLocaleString()}</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">{t.projectDetail.remainingBalance}</p>
              <p className="text-xl font-bold text-green-600">${(totalBudget - totalSpent).toLocaleString()}</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">{t.projectDetail.burnRate}</p>
              <p className={`text-xl font-bold ${burnRate > 80 ? 'text-red-600' : 'text-blue-600'}`}>
                {burnRate.toFixed(1)}%
              </p>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">{t.projectDetail.budgetUtilization}</p>
            <Progress value={burnRate} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Risk Snapshot */}
      <Card>
        <CardHeader>
          <CardTitle>{t.projectDetail.riskSnapshot}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="pb-3 font-medium">{t.projectDetail.riskTitle}</th>
                  <th className="pb-3 font-medium">{t.projectDetail.category}</th>
                  <th className="pb-3 font-medium">{t.projectDetail.riskLevel}</th>
                  <th className="pb-3 font-medium">{t.projectDetail.mitigationStatus}</th>
                  <th className="pb-3 font-medium">{t.projectDetail.owner}</th>
                </tr>
              </thead>
              <tbody>
                {risks.map((risk, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-3">{risk.title}</td>
                    <td className="py-3">{risk.category}</td>
                    <td className="py-3">
                      <Badge variant={getRiskColor(risk.level)}>
                        {risk.level}
                      </Badge>
                    </td>
                    <td className="py-3">{risk.mitigation}</td>
                    <td className="py-3">{risk.owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Narrative Sections */}
      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle>{t.projectDetail.narrativeSections}</CardTitle>
            <p className="text-sm text-muted-foreground">{t.projectDetail.narrativeSectionsDesc}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="progressSummary">{t.projectDetail.progressSummary}</Label>
              <Textarea
                id="progressSummary"
                value={narratives.progressSummary}
                onChange={(e) => setNarratives({ ...narratives, progressSummary: e.target.value })}
                placeholder={t.projectDetail.progressSummaryPlaceholder}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="challenges">{t.projectDetail.challenges}</Label>
              <Textarea
                id="challenges"
                value={narratives.challenges}
                onChange={(e) => setNarratives({ ...narratives, challenges: e.target.value })}
                placeholder={t.projectDetail.challengesPlaceholder}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="mitigationActions">{t.projectDetail.mitigationActions}</Label>
              <Textarea
                id="mitigationActions"
                value={narratives.mitigationActions}
                onChange={(e) => setNarratives({ ...narratives, mitigationActions: e.target.value })}
                placeholder={t.projectDetail.mitigationActionsPlaceholder}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="keyAchievements">{t.projectDetail.keyAchievements}</Label>
              <Textarea
                id="keyAchievements"
                value={narratives.keyAchievements}
                onChange={(e) => setNarratives({ ...narratives, keyAchievements: e.target.value })}
                placeholder={t.projectDetail.keyAchievementsPlaceholder}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="nextSteps">{t.projectDetail.nextSteps}</Label>
              <Textarea
                id="nextSteps"
                value={narratives.nextSteps}
                onChange={(e) => setNarratives({ ...narratives, nextSteps: e.target.value })}
                placeholder={t.projectDetail.nextStepsPlaceholder}
                rows={3}
              />
            </div>
            <Button variant="outline">
              {t.projectDetail.saveNarratives}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
