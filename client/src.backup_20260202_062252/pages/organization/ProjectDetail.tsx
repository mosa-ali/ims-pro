import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { ArrowLeft, Edit, Calendar, DollarSign } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { shouldShowCaseManagement, formatProjectSectors } from '@/utils/projectHelpers';
import { useProjectData, calculateDaysRemaining } from '@/hooks/useProjectData';

// Import tab components
import { OverviewTab } from './tabs/OverviewTab';
import { ActivitiesTab } from './tabs/ActivitiesTab';
import { TasksTab } from './tabs/TasksTab';
import { IndicatorsTab } from './tabs/IndicatorsTab';
import { BeneficiariesTab } from './tabs/BeneficiariesTab';
import { FinancialOverviewTab } from './tabs/FinancialOverviewTab';
import { ForecastPlanTab } from './tabs/ForecastPlanTab';
import { ProcurementPlanTab } from './tabs/ProcurementPlanTab';
import { ProjectReportTab } from './tabs/ProjectReportTab';
import { CaseManagementTab } from './tabs/CaseManagementTab';
import { ProjectPlanTab } from './tabs/ProjectPlanTab';

export function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const { isRTL } = useLanguage();
  const { t } = useTranslation();
  
  // ✅ CRITICAL FIX: Dynamically load project data based on URL project ID
  const { project, loading, error } = useProjectData(id);
  
  // Handler for Edit Project button
  const handleEditProject = () => {
    // Navigate to projects page with edit state
    navigate('/projects', { state: { editProjectId: id } });
  };
  
  // ✅ Loading state
  if (loading) {
    return (
      <div className="project-page">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading project data...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // ✅ Error state
  if (error || !project) {
    return (
      <div className="project-page">
        <Link
          to="/projects"
          className={`inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 project-spacer-sm ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
          {t.projectDetail.backToProjects}
        </Link>
        <div className="project-card mt-4">
          <div className="text-center py-12">
            <p className="text-red-600 text-lg font-semibold mb-2">⚠️ Project Not Found</p>
            <p className="text-gray-600">{error || `Project with ID "${id}" does not exist`}</p>
            <Link to="/projects" className="inline-block mt-4 text-primary hover:underline">
              Return to Projects List
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Calculate dynamic values from actual project data
  const daysRemaining = calculateDaysRemaining(project.endDate);
  const statusLabel = project.status === 'Ongoing' ? t.projects.statusOngoing :
                      project.status === 'Planned' ? t.projects.statusPlanned :
                      project.status === 'Completed' ? t.projects.statusCompleted :
                      project.status === 'Not Started' ? t.projects.statusNotStarted :
                      project.status === 'Suspended' ? t.projects.statusSuspended :
                      project.status;

  // Check if Case Management tab should be shown (based on actual project sectors)
  const showCaseManagement = shouldShowCaseManagement(project.project_sectors);
  
  // Build tabs array dynamically based on project sectors
  const allTabs = [
    { id: 'overview', label: t.projectDetail.tabProgramsOverview, icon: '📊', show: true },
    { id: 'activities', label: t.projectDetail.tabViewAllActivities, icon: '📋', show: true },
    { id: 'plan', label: t.projectDetail.tabProjectPlan, icon: '📅', show: true },
    { id: 'tasks', label: t.projectDetail.tabTasksMgt, icon: '✓', show: true },
    { id: 'cases', label: t.projectDetail.tabCaseManagement, icon: '📁', show: showCaseManagement },
    { id: 'indicators', label: t.projectDetail.tabProjectIndicators, icon: '🎯', show: true },
    { id: 'beneficiaries', label: t.projectDetail.tabBeneficiaries, icon: '👥', show: true },
    { id: 'financial', label: t.projectDetail.tabFinancialOverview, icon: '💰', show: true },
    { id: 'forecast', label: t.projectDetail.tabForecastPlan, icon: '📈', show: true },
    { id: 'procurement', label: t.projectDetail.tabProcurementPlan, icon: '🛒', show: true },
    { id: 'report', label: t.projectDetail.tabProjectReport, icon: '📄', show: true }
  ];

  // Filter tabs based on `show` property
  const tabs = allTabs.filter(tab => tab.show);
  
  return (
    <div className="project-page">
      {/* Back Button */}
      <Link
        to="/projects"
        className={`inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 project-spacer-sm ${isRTL ? 'flex-row-reverse' : ''}`}
      >
        <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
        {t.projectDetail.backToProjects}
      </Link>
      
      {/* Project Header */}
      <div className="project-card project-spacer-md">
        <div className={`flex items-start justify-between gap-4 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
            <div className={`flex items-center gap-3 mb-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
              <h1 className="project-section-header mb-0 truncate">{project.title}</h1>
              <span className="project-status-badge project-status-ongoing flex-shrink-0">
                {statusLabel}
              </span>
            </div>
            <div className={`flex items-center gap-4 text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span dir="ltr" className="text-gray-600">{project.startDate} - {project.endDate}</span>
              </div>
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <DollarSign className="w-4 h-4 flex-shrink-0" />
                <span className="text-orange-600 font-medium whitespace-nowrap" dir="ltr">{daysRemaining} {t.projectDetail.daysRemaining}</span>
              </div>
            </div>
          </div>
          <button className={`project-btn-primary flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`} onClick={handleEditProject}>
            <Edit className="w-4 h-4" />
            {t.projectDetail.editProject}
          </button>
        </div>
        
        {/* Project Info Grid */}
        <div className="project-grid-2 mt-4 pt-4 border-t border-gray-200">
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="project-meta-text">{t.projectDetail.projectCode}</p>
            <p className="project-body-text font-medium">{project.code}</p>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="project-meta-text">{t.projectDetail.donorGrant}</p>
            <p className="project-body-text font-medium">{project.donor || 'N/A'}</p>
          </div>
          {/* Show sectors */}
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="project-meta-text">Sectors</p>
            <p className="project-body-text font-medium">{formatProjectSectors(project.project_sectors)}</p>
          </div>
          {/* Show Project Manager */}
          {project.manager && (
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="project-meta-text">Project Manager</p>
              <p className="project-body-text font-medium">{project.manager}</p>
            </div>
          )}
          {/* Show Location */}
          {project.location && (
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="project-meta-text">Location</p>
              <p className="project-body-text font-medium">{project.location}</p>
            </div>
          )}
          {/* Show Target Beneficiaries */}
          {project.targetBeneficiaries && (
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="project-meta-text">Target Beneficiaries</p>
              <p className="project-body-text font-medium">{project.targetBeneficiaries.toLocaleString()}</p>
            </div>
          )}
          {/* Show Objectives section */}
          {project.objectives && (
            <div className={`col-span-2 ${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="project-meta-text">Objectives</p>
              <p className="project-body-text">{project.objectives}</p>
            </div>
          )}
          {/* Show description section if description exists */}
          {project.description && (
            <div className={`col-span-2 ${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="project-meta-text">{t.projectDetail.description}</p>
              <p className="project-body-text">{project.description}</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Tabs */}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List className={`project-tabs-list ${isRTL ? 'flex-row-reverse' : ''}`}>
          {tabs.map((tab) => (
            <Tabs.Trigger
              key={tab.id}
              value={tab.id}
              className={`project-tab ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <span className={isRTL ? 'ms-2' : 'me-2'}>{tab.icon}</span>
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        
        <div className="project-spacer-md">
          <Tabs.Content value="overview">
            <OverviewTab projectId={project.id} />
          </Tabs.Content>
          
          <Tabs.Content value="activities">
            <ActivitiesTab projectId={project.id} />
          </Tabs.Content>
          
          <Tabs.Content value="tasks">
            <TasksTab projectId={project.id} />
          </Tabs.Content>
          
          <Tabs.Content value="indicators">
            <IndicatorsTab projectId={project.id} />
          </Tabs.Content>
          
          <Tabs.Content value="beneficiaries">
            <BeneficiariesTab projectId={project.id} />
          </Tabs.Content>
          
          <Tabs.Content value="financial">
            <FinancialOverviewTab projectId={project.id} />
          </Tabs.Content>
          
          <Tabs.Content value="forecast">
            <ForecastPlanTab projectId={project.id} />
          </Tabs.Content>
          
          <Tabs.Content value="procurement">
            <ProcurementPlanTab projectId={project.id} />
          </Tabs.Content>
          
          <Tabs.Content value="cases">
            <CaseManagementTab projectId={project.id} />
          </Tabs.Content>
          
          <Tabs.Content value="report">
            <ProjectReportTab projectId={project.id} />
          </Tabs.Content>
          
          <Tabs.Content value="plan">
            <ProjectPlanTab projectId={project.id} />
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
}