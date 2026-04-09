// ============================================================================
// PROJECT DETAILS PAGE
// Uses exact tab components from professional design
// Integrated Management System (IMS)
// ============================================================================

import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { ArrowLeft, ArrowRight, Loader2, FileText, ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';

// Import print modals
import { ProjectCharterPrintModal } from '@/components/ProjectCharterPrintModal';
import { ProjectStatusReportPrintModal } from '@/components/ProjectStatusReportPrintModal';
import { ProjectClosureReportPrintModal } from '@/components/ProjectClosureReportPrintModal';
import { ProgramOverviewReportPrintModal } from '@/components/ProgramOverviewReportPrintModal';
import { BeneficiaryCertificatePrintModal } from '@/components/BeneficiaryCertificatePrintModal';

// Import exact tab components from design
import { OverviewTab } from './tabs/OverviewTab';
import { FinancialOverviewTab } from './tabs/FinancialOverviewTab';
import { ActivitiesTab } from './tabs/ActivitiesTab';
import { IndicatorsTab } from './tabs/IndicatorsTab';
import { BeneficiariesTab } from './tabs/BeneficiariesTab';
import { CaseManagementTab } from './tabs/CaseManagementTab';
import { TasksTab } from './tabs/TasksTab';
import { ProjectPlanTab } from './tabs/ProjectPlanTab';
import { ForecastPlanTab } from './tabs/ForecastPlanTab';
import { ProcurementPlanTab } from './tabs/ProcurementPlanTab';
import { ProjectReportTab } from './tabs/ProjectReportTab';

type TabId = 'overview' | 'financial' | 'activities' | 'indicators' | 'beneficiaries' | 
             'caseManagement' | 'tasks' | 'projectPlan' | 'forecastPlan' | 'procurementPlan' | 'report';

export default function ProjectDetailsPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { language, direction } = useLanguage();
  const isRTL = direction === 'rtl';
  
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [showCharterModal, setShowCharterModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  // Fetch project details
  const { data: project, isLoading } = trpc.projects.getById.useQuery(
    { id: Number(id) },
    { enabled: !!id }
  );

  const translations = {
    en: {
      backToProjects: 'Back to Projects',
      overview: 'Overview',
      financial: 'Financial Overview',
      activities: 'Activities',
      indicators: 'Indicators',
      beneficiaries: 'Beneficiaries',
      caseManagement: 'Case Management',
      tasks: 'Tasks',
      projectPlan: 'Project Plan',
      forecastPlan: 'Forecast Plan',
      procurementPlan: 'Procurement Plan',
      report: 'Project Report',
    },
    ar: {
      backToProjects: 'العودة إلى المشاريع',
      overview: 'نظرة عامة',
      financial: 'النظرة المالية',
      activities: 'الأنشطة',
      indicators: 'المؤشرات',
      beneficiaries: 'المستفيدون',
      caseManagement: 'إدارة الحالات',
      tasks: 'المهام',
      projectPlan: 'خطة المشروع',
      forecastPlan: 'خطة التوقعات',
      procurementPlan: 'خطة المشتريات',
      report: 'تقرير المشروع',
    },
  };

  const t = translations[language as keyof typeof translations];

  // Define Protection-related sectors that should show Case Management tab
  const protectionSectors = [
    'Protection',
    'Child Protection',
    'Education',
    'Education in Emergency'
  ];
  
  // Check if project has any protection-related sector
  // Ensure sectors is an array before using .some()
  const sectors = Array.isArray(project?.sectors) ? project.sectors : [];
  const hasProtectionSector = sectors.some(sector => 
    protectionSectors.some(protSector => 
      sector.toLowerCase().includes(protSector.toLowerCase())
    )
  );

  // Build tabs array conditionally
  const tabs = [
    { id: 'overview' as TabId, label: t.overview },
    { id: 'financial' as TabId, label: t.financial },
    { id: 'activities' as TabId, label: t.activities },
    { id: 'indicators' as TabId, label: t.indicators },
    { id: 'beneficiaries' as TabId, label: t.beneficiaries },
    // Only show Case Management for Protection-related sectors
    ...(hasProtectionSector ? [{ id: 'caseManagement' as TabId, label: t.caseManagement }] : []),
    { id: 'tasks' as TabId, label: t.tasks },
    { id: 'projectPlan' as TabId, label: t.projectPlan },
    { id: 'forecastPlan' as TabId, label: t.forecastPlan },
    { id: 'procurementPlan' as TabId, label: t.procurementPlan },
    { id: 'report' as TabId, label: t.report },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-lg text-gray-600 mb-4">Project not found</p>
        <Button onClick={() => setLocation('/organization/projects-list')}>
          {t.backToProjects}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/organization/projects-list')}
            className="mb-4"
          >
            {isRTL ? <ArrowRight className="w-4 h-4 ml-2" /> : <ArrowLeft className="w-4 h-4 mr-2" />}
            {t.backToProjects}
          </Button>

          <div className="mb-4 flex items-start justify-between" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {language === 'ar' && project.titleAr ? project.titleAr : project.title}
              </h1>
              <p className="text-sm text-gray-600">
                {isRTL ? 'رمز المشروع' : 'Project Code'}: <span dir="ltr" className="font-semibold">{project.code}</span>
              </p>
            </div>
            
            {/* Reports Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className={isRTL ? 'flex-row-reverse' : ''}>
                  <FileText className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {isRTL ? 'إنشاء التقارير' : 'Generate Reports'}
                  <ChevronDown className={`w-4 h-4 ${isRTL ? 'mr-2' : 'ml-2'}`} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="w-56">
                <DropdownMenuItem onClick={() => setShowCharterModal(true)}>
                  {isRTL ? 'ميثاق المشروع' : 'Project Charter'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowStatusModal(true)}>
                  {isRTL ? 'تقرير الحالة' : 'Status Report'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowClosureModal(true)}>
                  {isRTL ? 'تقرير الإغلاق' : 'Closure Report'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowProgramModal(true)}>
                  {isRTL ? 'نظرة عامة على البرنامج' : 'Program Overview'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowCertificateModal(true)}>
                  {isRTL ? 'شهادة المستفيد' : 'Beneficiary Certificate'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Section Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mt-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`p-4 rounded-lg border-2 transition-all ${isRTL ? 'text-right' : 'text-left'} ${
                  activeTab === tab.id
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white'
                }`}
              >
                <div className={`text-sm font-semibold ${
                  activeTab === tab.id ? 'text-primary' : 'text-gray-900'
                }`}>
                  {tab.label}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="container mx-auto px-6 py-8">
        {activeTab === 'overview' && <OverviewTab projectId={String(id)} onNavigateToActivities={() => setActiveTab('activities')} />}
        {activeTab === 'financial' && <FinancialOverviewTab projectId={String(id)} />}
        {activeTab === 'activities' && <ActivitiesTab projectId={String(id)} />}
        {activeTab === 'indicators' && <IndicatorsTab projectId={String(id)} />}
        {activeTab === 'beneficiaries' && <BeneficiariesTab projectId={String(id)} />}
        {activeTab === 'caseManagement' && hasProtectionSector && <CaseManagementTab projectId={String(id)} />}
        {activeTab === 'tasks' && <TasksTab projectId={String(id)} />}
        {activeTab === 'projectPlan' && <ProjectPlanTab projectId={String(id)} />}
        {activeTab === 'forecastPlan' && <ForecastPlanTab projectId={String(id)} />}
        {activeTab === 'procurementPlan' && <ProcurementPlanTab projectId={String(id)} />}
        {activeTab === 'report' && <ProjectReportTab projectId={String(id)} />}
      </div>
      
      {/* Print Modals */}
      {showCharterModal && (
        <ProjectCharterPrintModal
          projectName={project.title}
          projectCode={project.code}
          projectType={project.sectors?.[0] || 'Development'}
          startDate={project.startDate}
          endDate={project.endDate}
          objectives={['Improve community health', 'Provide education', 'Build infrastructure']}
          scope="Project scope description"
          deliverables={['Deliverable 1', 'Deliverable 2']}
          budget={project.totalBudget}
          currency={project.currency}
          stakeholders={[]}
          teamMembers={[]}
          risks={[]}
          assumptions={[]}
          approvedBy="Project Manager"
          approvalDate={new Date().toISOString().split('T')[0]}
          onClose={() => setShowCharterModal(false)}
        />
      )}
      
      {showStatusModal && (
        <ProjectStatusReportPrintModal
          projectName={project.title}
          projectCode={project.code}
          reportingPeriod={`${new Date(project.startDate).toLocaleDateString()} - ${new Date().toLocaleDateString()}`}
          overallStatus="On Track"
          completionPercentage={50}
          milestones={[]}
          accomplishments={[]}
          challenges={[]}
          upcomingActivities={[]}
          budgetStatus={{ allocated: project.totalBudget, spent: 0, remaining: project.totalBudget, percentageUsed: 0 }}
          teamUpdates={[]}
          nextSteps={[]}
          preparedBy="Project Manager"
          reviewedBy="Program Director"
          reportDate={new Date().toISOString().split('T')[0]}
          onClose={() => setShowStatusModal(false)}
        />
      )}
      
      {showClosureModal && (
        <ProjectClosureReportPrintModal
          projectName={project.title}
          projectCode={project.code}
          startDate={project.startDate}
          completionDate={project.endDate}
          objectives={['Objective 1', 'Objective 2']}
          deliverables={[]}
          budgetSummary={{ allocated: project.totalBudget, spent: 0, variance: 0, percentageUsed: 0 }}
          beneficiariesReached={0}
          keyAchievements={[]}
          lessonsLearned={[]}
          challenges={[]}
          recommendations={[]}
          finalRemarks="Project completed successfully"
          preparedBy="Project Manager"
          approvedBy="Program Director"
          onClose={() => setShowClosureModal(false)}
        />
      )}
      
      {showProgramModal && (
        <ProgramOverviewReportPrintModal
          programName="IMS Program"
          programCode="IMS-2024"
          reportingPeriod={`${new Date().getFullYear()}`}
          programObjectives={['Objective 1', 'Objective 2']}
          projects={[]}
          totalBudget={project.totalBudget}
          totalSpent={0}
          beneficiariesReached={0}
          keyAchievements={[]}
          challenges={[]}
          upcomingInitiatives={[]}
          recommendations={[]}
          preparedBy="Program Director"
          reviewedBy="Executive Director"
          reportDate={new Date().toISOString().split('T')[0]}
          onClose={() => setShowProgramModal(false)}
        />
      )}
      
      {showCertificateModal && (
        <BeneficiaryCertificatePrintModal
          beneficiaryName="Beneficiary Name"
          programName={project.title}
          programType={project.sectors?.[0] || 'Development'}
          startDate={project.startDate}
          completionDate={project.endDate}
          skillsAcquired={[
            { name: 'Skill 1', level: 'Intermediate' },
            { name: 'Skill 2', level: 'Advanced' }
          ]}
          hoursCompleted={100}
          achievementLevel="Excellent"
          certificateNumber={`CERT-${Date.now()}`}
          issuedBy="Program Director"
          issuerTitle="Director"
          additionalNotes="Congratulations on your achievement!"
          onClose={() => setShowCertificateModal(false)}
        />
      )}
    </div>
  );
}
