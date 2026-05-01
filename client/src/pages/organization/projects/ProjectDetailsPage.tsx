// ============================================================================
// PROJECT DETAILS PAGE
// Uses exact tab components from professional design
// Integrated Management System (IMS)
// ============================================================================

import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { ArrowLeft, ArrowRight, Loader2, FileText, ChevronDown, Lock, FolderOpen } from 'lucide-react';
import { EvidencePanel } from '@/components/EvidencePanel';
import { usePermissions } from '@/hooks/usePermissions';
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
import { MonthlyReportTab } from './tabs/MonthlyReportTab';
import { VarianceAlertsTab } from './tabs/VarianceAlertsTab';
import { useTranslation } from '@/i18n/useTranslation';

type TabId = 'overview' | 'financial' | 'activities' | 'indicators' | 'beneficiaries' | 
 'caseManagement' | 'tasks' | 'projectPlan' | 'forecastPlan' | 'procurementPlan' | 'varianceAlerts' | 'report' | 'monthlyReport' | 'evidence';

export default function ProjectDetailsPage() {
 const { t } = useTranslation();
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
 const { data: project, isLoading, isError } = trpc.projects.getById.useQuery(
 { id: Number(id) },
 { 
 enabled: !!id,
 retry: false, // Don't retry on NOT_FOUND errors
 refetchOnMount: false,
 refetchOnWindowFocus: false,
 refetchOnReconnect: false,
 }
 );

 // RBAC: Check workspace-level permissions for sensitive tabs (can be called anytime)
 const { canScreen, isAdmin } = usePermissions();

 if (isLoading || !id) {
 return (
 <div className="flex items-center justify-center min-h-screen" dir={isRTL ? "rtl" : "ltr"}>
 <Loader2 className="w-8 h-8 animate-spin text-primary" />
 </div>
 );
 }

 if (isError || !project) {
 return (
 <div className="flex flex-col items-center justify-center min-h-screen">
 <p className="text-lg text-gray-600 mb-4">Project not found</p>
 <Button onClick={() => setLocation('/organization/projects-list')}>
 {t.projectDetail.backToProjects}
 </Button>
 </div>
 );
 }

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

 // Case Management requires EXPLICIT permission (sensitive workspace)
 const hasCaseManagementPermission = isAdmin || canScreen('projects', 'case_management', 'view') || canScreen('cases', 'cases_list', 'view');
 // Beneficiaries requires explicit permission (sensitive workspace)
 const hasBeneficiariesPermission = isAdmin || canScreen('projects', 'beneficiaries', 'view');
 // Surveys requires explicit permission (sensitive workspace)
 const hasSurveysPermission = isAdmin || canScreen('projects', 'surveys', 'view') || canScreen('surveys', 'survey_builder', 'view');

 // Build tabs array conditionally — sensitive tabs require BOTH sector match AND RBAC permission
 const tabs = [
 { id: 'overview' as TabId, label: t.projectDetailsPage.overview },
 { id: 'financial' as TabId, label: t.projectDetail.financial },
 { id: 'varianceAlerts' as TabId, label: t.projectDetailsPage.varianceAlerts },
 { id: 'activities' as TabId, label: t.projectDetail.activities },
 { id: 'indicators' as TabId, label: t.projectDetail.indicators },
 // Beneficiaries: requires explicit RBAC permission
 ...(hasBeneficiariesPermission ? [{ id: 'beneficiaries' as TabId, label: t.projectDetailsPage.beneficiaries }] : []),
 // Case Management: requires BOTH protection sector AND explicit RBAC permission
 ...(hasProtectionSector && hasCaseManagementPermission ? [{ id: 'caseManagement' as TabId, label: t.projectDetailsPage.caseManagement }] : []),
 { id: 'tasks' as TabId, label: t.projectDetailsPage.tasks },
 { id: 'projectPlan' as TabId, label: t.projectDetailsPage.projectPlan },
 { id: 'forecastPlan' as TabId, label: t.projectDetailsPage.forecastPlan },
 { id: 'procurementPlan' as TabId, label: t.projectDetailsPage.procurementPlan },
 { id: 'report' as TabId, label: t.projectDetailsPage.report },
 { id: 'monthlyReport' as TabId, label: t.projectDetailsPage.monthlyReport },
 { id: 'evidence' as TabId, label: t.projectDetailsPage.evidence },
 ];

 return (
 <div className="min-h-screen bg-gray-50">
 {/* Header */}
 <div className="bg-white border-b border-gray-200">
 <div className="container mx-auto px-6 py-4">
 <Button data-back-nav
 variant="ghost"
 size="sm"
 onClick={() => setLocation('/organization/projects-list')}
 className="mb-4"
 >
 {isRTL ? <ArrowRight className="w-4 h-4 me-2" /> : <ArrowLeft className="w-4 h-4 me-2" />}
 {t.projectDetail.backToProjects}
 </Button>

 <div className="mb-4 flex items-start justify-between">
 <div className={'text-start'}>
 <h1 className="text-2xl font-bold text-gray-900 mb-2">
 {language === 'ar' && project?.titleAr ? project.titleAr : project?.title}
 </h1>
 <p className="text-sm text-gray-600">
 {t.projectDetailsPage.projectDetail.projectCode}: <span className="font-semibold">{project?.projectCode}</span>
 </p>
 </div>
 
 {/* Reports Dropdown */}
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button variant="outline" className={''}>
 <FileText className={`w-4 h-4 me-2`} />
 {t.projectDetailsPage.projectDetail.generateReports}
 <ChevronDown className={`w-4 h-4 ms-2`} />
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align={t.projectDetailsPage.projectDetail.end} className="w-56">
 <DropdownMenuItem onClick={() => setShowCharterModal(true)}>
 {t.projectDetailsPage.projectDetail.projectCharter}
 </DropdownMenuItem>
 <DropdownMenuItem onClick={() => setShowStatusModal(true)}>
 {t.projectDetailsPage.projectDetail.statusReport}
 </DropdownMenuItem>
 <DropdownMenuItem onClick={() => setShowClosureModal(true)}>
 {t.projectDetailsPage.projectDetail.closureReport}
 </DropdownMenuItem>
 <DropdownMenuItem onClick={() => setShowProgramModal(true)}>
 {t.projectDetailsPage.projectDetail.programOverview}
 </DropdownMenuItem>
 <DropdownMenuItem onClick={() => setShowCertificateModal(true)}>
 {t.projectDetailsPage.projectDetail.beneficiaryCertificate}
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </div>

 {/* Section Cards Grid */}
 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4 mt-6">
 {tabs.map((tab) => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`p-4 rounded-lg border-2 transition-all text-start ${ activeTab === tab.id ? 'border-primary bg-primary/5 shadow-md' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white' }`}
 >
 <div className={`text-sm font-semibold ${ activeTab === tab.id ? 'text-primary' : 'text-gray-900' }`}>
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
 {activeTab === 'varianceAlerts' && <VarianceAlertsTab projectId={String(id)} isRTL={isRTL} />}
 {activeTab === 'activities' && <ActivitiesTab projectId={String(id)} />}
 {activeTab === 'indicators' && <IndicatorsTab projectId={String(id)} />}
 {activeTab === 'beneficiaries' && hasBeneficiariesPermission && <BeneficiariesTab projectId={String(id)} />}
 {activeTab === 'caseManagement' && hasProtectionSector && hasCaseManagementPermission && <CaseManagementTab projectId={String(id)} />}
 {activeTab === 'tasks' && <TasksTab projectId={String(id)} />}
 {activeTab === 'projectPlan' && <ProjectPlanTab projectId={String(id)} />}
 {activeTab === 'forecastPlan' && <ForecastPlanTab projectId={String(id)} />}
 {activeTab === 'procurementPlan' && <ProcurementPlanTab projectId={String(id)} />}
 {activeTab === 'report' && <ProjectReportTab projectId={String(id)} />}
 {activeTab === 'monthlyReport' && <MonthlyReportTab projectId={String(id)} />}
 {activeTab === 'evidence' && <EvidencePanel entityType="Project" entityId={String(id)} />}
 </div>
 
 {/* Print Modals */}
 {showCharterModal && (
 <ProjectCharterPrintModal
 projectName={project?.title || ''}
 projectCode={project?.projectCode || ''}
 projectType={project?.sectors?.[0] || 'Development'}
 startDate={project?.startDate}
 endDate={project?.endDate}
 objectives={['Improve community health', 'Provide education', 'Build infrastructure']}
 scope="Project scope description"
 deliverables={['Deliverable 1', 'Deliverable 2']}
 budget={project?.totalBudget || 0}
 currency={project?.currency || 'USD'}
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
 projectName={project?.title || ''}
 projectCode={project?.projectCode || ''}
 reportingPeriod={project?.startDate ? `${new Date(project.startDate).toLocaleDateString()} - ${new Date().toLocaleDateString()}` : ''}
 overallStatus="On Track"
 completionPercentage={50}
 milestones={[]}
 accomplishments={[]}
 challenges={[]}
 upcomingActivities={[]}
 budgetStatus={{ allocated: project?.totalBudget || 0, spent: 0, remaining: project?.totalBudget || 0, percentageUsed: 0 }}
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
 projectName={project?.title || ''}
 projectCode={project?.projectCode || ''}
 startDate={project?.startDate}
 completionDate={project?.endDate}
 objectives={['Objective 1', 'Objective 2']}
 deliverables={[]}
 budgetSummary={{ allocated: project?.totalBudget || 0, spent: 0, variance: 0, percentageUsed: 0 }}
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
 totalBudget={project?.totalBudget || 0}
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
 programName={project?.title || ''}
 programType={project?.sectors?.[0] || 'Development'}
 startDate={project?.startDate}
 completionDate={project?.endDate}
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