import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, Target, Users, DollarSign } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProgramsOverviewProps {
  projectId: number;
}

export default function ProgramsOverview({ projectId }: ProgramsOverviewProps) {
  const { t, i18n } = useTranslation();
  const { isRTL } = useLanguage();

  // Fetch real data from backend
  const { data: activities, isLoading: activitiesLoading } = trpc.projectActivities.list.useQuery({ projectId });
  const { data: indicators, isLoading: indicatorsLoading } = trpc.projectIndicators.list.useQuery({ projectId });
  const { data: tasks, isLoading: tasksLoading } = trpc.projectTasks.list.useQuery({ projectId });
  const { data: project } = trpc.projects.getById.useQuery({ id: projectId });

  const isLoading = activitiesLoading || indicatorsLoading || tasksLoading;

  // Calculate statistics from real data
  const totalActivities = activities?.length || 0;
  const completedActivities = activities?.filter(a => a.status === 'completed').length || 0;
  
  const totalIndicators = indicators?.length || 0;
  const achievedIndicators = indicators?.filter(i => i.achieved >= i.target).length || 0;
  
  // For now, use placeholder values for beneficiaries and budget until those modules are implemented
  const totalBeneficiaries = project?.beneficiaryCount || 0;
  const reachedBeneficiaries = 0; // TODO: Implement beneficiaries count when beneficiaries module is ready
  const budgetUtilization = 0; // TODO: Calculate from expenses when financial module is ready

  if (isLoading) {
    return (
      <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Summary Cards - flex-row-reverse handles RTL visual direction */}
      <div className={`flex flex-row gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {[
        <Card key="activities" className="flex-1">
          <CardHeader className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center justify-between space-y-0 pb-2`}>
            <CardTitle className={`text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('projects.activities')}
            </CardTitle>
            <Target className={`h-4 w-4 text-muted-foreground ${isRTL ? 'mr-0 ml-2' : 'ml-0 mr-2'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span dir="ltr">{completedActivities}/{totalActivities}</span>
            </div>
            <p className={`text-xs text-muted-foreground mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              <span dir="ltr">{totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0}%</span> {t('projects.completed')}
            </p>
            <Progress 
              value={totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0} 
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>,

        /* Indicators Card */
        <Card key="indicators" className="flex-1">
          <CardHeader className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center justify-between space-y-0 pb-2`}>
            <CardTitle className={`text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('projectDetail.overviewStatIndicators')}
            </CardTitle>
            <Target className={`h-4 w-4 text-muted-foreground ${isRTL ? 'mr-0 ml-2' : 'ml-0 mr-2'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span dir="ltr">{achievedIndicators}/{totalIndicators}</span>
            </div>
            <p className={`text-xs text-muted-foreground mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              <span dir="ltr">{totalIndicators > 0 ? Math.round((achievedIndicators / totalIndicators) * 100) : 0}%</span> {t('projectDetail.achieved')}
            </p>
            <Progress 
              value={totalIndicators > 0 ? (achievedIndicators / totalIndicators) * 100 : 0} 
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>,

        /* Beneficiaries Card */
        <Card key="beneficiaries" className="flex-1">
          <CardHeader className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center justify-between space-y-0 pb-2`}>
            <CardTitle className={`text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('projects.beneficiaries')}
            </CardTitle>
            <Users className={`h-4 w-4 text-muted-foreground ${isRTL ? 'mr-0 ml-2' : 'ml-0 mr-2'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span dir="ltr">{reachedBeneficiaries.toLocaleString()}/{totalBeneficiaries.toLocaleString()}</span>
            </div>
            <p className={`text-xs text-muted-foreground mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              <span dir="ltr">{totalBeneficiaries > 0 ? Math.round((reachedBeneficiaries / totalBeneficiaries) * 100) : 0}%</span> {t('projectDetail.overviewStatBeneficiaries')}
            </p>
            <Progress 
              value={totalBeneficiaries > 0 ? (reachedBeneficiaries / totalBeneficiaries) * 100 : 0} 
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>,

        /* Budget Utilization Card */
        <Card key="budget" className="flex-1">
          <CardHeader className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center justify-between space-y-0 pb-2`}>
            <CardTitle className={`text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('projectDetail.overviewStatBudgetUtilization')}
            </CardTitle>
            <DollarSign className={`h-4 w-4 text-muted-foreground ${isRTL ? 'mr-0 ml-2' : 'ml-0 mr-2'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold"><span dir="ltr">{budgetUtilization}%</span></div>
            <p className={`text-xs text-muted-foreground mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('projectDetail.overviewBudgetSubtitle')}
            </p>
            <Progress 
              value={budgetUtilization} 
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>
          ]}
      </div>

      {/* Program Description Section */}
      <Card>
        <CardHeader>
          <CardTitle className={isRTL ? 'text-right' : 'text-left'}>
            {t('projectDetail.tabProgramsOverview')}
          </CardTitle>
          <CardDescription className={isRTL ? 'text-right' : 'text-left'}>
            {t('projectDetail.activitiesPageSubtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Objectives Section */}
          {project?.objectives && (
            <div>
              <h4 className={`font-medium mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('projects.objectives')}
              </h4>
              <div className={`text-sm text-muted-foreground whitespace-pre-wrap ${isRTL ? 'text-right' : 'text-left'}`}>
                {project.objectives}
              </div>
            </div>
          )}

          {/* Key Activities Section */}
          <div>
            <h4 className={`font-medium mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('projectDetail.overviewKeyActivities')}
            </h4>
            {activities && activities.length > 0 ? (
              <div className="grid gap-2">
                {activities.slice(0, 5).map((activity) => {
                  const completion = activity.target > 0 
                    ? Math.round((activity.achieved / activity.target) * 100) 
                    : 0;
                  
                  return (
                    <div 
                      key={activity.id} 
                      className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center justify-between p-3 border rounded-lg`}
                    >
                      <div className="flex-1">
                        <p className={`font-medium text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                          {isRTL && activity.nameAr ? activity.nameAr : activity.name}
                        </p>
                        <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-2 mt-1`}>
                          <Badge 
                            variant={
                              activity.status === "completed" ? "default" : 
                              activity.status === "ongoing" ? "default" : 
                              "secondary"
                            } 
                            className="text-xs"
                          >
                            {activity.status === "completed" ? t('projectDetail.activityStatusCompleted') :
                             activity.status === "ongoing" ? t('projectDetail.activityStatusInProgress') :
                             activity.status === "planned" ? t('projectDetail.activityStatusNotStarted') :
                             activity.status === "on_hold" ? t('projectDetail.activityStatusOnHold') :
                             activity.status === "cancelled" ? t('projectDetail.activityStatusCancelled') :
                             activity.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground" dir="ltr">
                            {completion}% {t('projects.completed')}
                          </span>
                        </div>
                      </div>
                      <Progress value={completion} className={`w-24 h-2 ${isRTL ? 'mr-0 ml-4' : 'ml-0 mr-4'}`} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className={`text-sm text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('projectDetail.noActivitiesYet')}
              </p>
            )}
          </div>

          {/* Timeline Section */}
          {project && (
            <div>
              <h4 className={`font-medium mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('projects.timeline')}
              </h4>
              <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-2 text-sm text-muted-foreground`}>
                <Calendar className={`h-4 w-4 flex-shrink-0 ${isRTL ? 'ml-2 mr-0' : 'ml-0 mr-2'}`} />
                <span dir={isRTL ? "rtl" : "ltr"}>
                  {t('projectDetail.procurementPlanPeriod')}: {new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
