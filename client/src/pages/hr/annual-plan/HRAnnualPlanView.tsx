/**
 * ============================================================================
 * HR ANNUAL PLAN - VIEW/EDIT SCREEN
 * ============================================================================
 * 
 * SECTION 2: Master Record View
 * 
 * This is the main screen showing all sections of an HR Annual Plan
 * 
 * SECTIONS:
 * 1. Plan Header (Read-only after approval)
 * 2. Existing Workforce Snapshot
 * 3. Planned Staffing Requirements
 * 4. Recruitment Plan (Auto-generated)
 * 5. HR Cost & Budget Estimation
 * 6. Training & Capacity Development Plan
 * 7. HR Risks & Mitigation Plan
 * 8. Approval & Governance
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from '@/lib/router-compat';
import {
 ChevronLeft,
 Lock,
 Edit,
 Save,
 CheckCircle,
 XCircle,
 AlertCircle,
 Download,
 FileText,
 Users,
 DollarSign,
 Target,
 GraduationCap,
 AlertTriangle,
 ClipboardCheck
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { hrAnnualPlanService, HRAnnualPlan } from '@/app/services/hrAnnualPlanService';
import { PlanHeader } from './components/PlanHeader';
import { ExistingWorkforceSection } from './components/ExistingWorkforceSection';
import { PlannedStaffingSection } from './components/PlannedStaffingSection';
import { RecruitmentPlanSection } from './components/RecruitmentPlanSection';
import { BudgetEstimationSection } from './components/BudgetEstimationSection';
import { TrainingPlanSection } from './components/TrainingPlanSection';
import { RiskMitigationSection } from './components/RiskMitigationSection';
import { ApprovalSection } from './components/ApprovalSection';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export function HRAnnualPlanView() {
 const { t } = useTranslation();
 const { id } = useParams<{ id: string }>();
 const navigate = useNavigate();
 const { language, isRTL } = useLanguage();
 
 const [plan, setPlan] = useState<HRAnnualPlan | null>(null);
 const [isEditing, setIsEditing] = useState(false);
 const [activeTab, setActiveTab] = useState<string>('overview');

 const labels = {
 // Navigation
 backToPlans: t.hrAnnualPlan.backToPlans,
 
 // Header
 planTitle: t.hrAnnualPlan.hrAnnualPlan,
 year: t.hrAnnualPlan.year,
 status: t.hrAnnualPlan.status,
 
 // Status
 draft: t.hrAnnualPlan.draft,
 underReview: t.hrAnnualPlan.underReview,
 approved: t.hrAnnualPlan.approved,
 locked: t.hrAnnualPlan.locked,
 
 // Actions
 edit: t.hrAnnualPlan.editPlan,
 save: t.hrAnnualPlan.saveChanges,
 cancel: t.hrAnnualPlan.cancel,
 submitForReview: t.hrAnnualPlan.submitForReview,
 approve: t.hrAnnualPlan.approvePlan,
 exportPDF: t.hrAnnualPlan.exportPdf,
 exportExcel: t.hrAnnualPlan.exportExcel,
 
 // Tabs
 overview: t.hrAnnualPlan.overview,
 existingWorkforce: t.hrAnnualPlan.existingWorkforce,
 plannedStaffing: t.hrAnnualPlan.plannedStaffing,
 recruitment: t.hrAnnualPlan.recruitmentPlan,
 budget: t.hrAnnualPlan.budgetCosts,
 training: t.hrAnnualPlan.trainingPlan,
 risks: t.hrAnnualPlan.hrRisks,
 approval: t.hrAnnualPlan.approval,
 
 // Messages
 planNotFound: t.hrAnnualPlan.planNotFound,
 loadingPlan: t.hrAnnualPlan.loadingPlan,
 readOnlyWarning: 'This plan is approved/locked and cannot be edited',
 
 // Overview KPIs
 totalPositions: t.hrAnnualPlan.totalPlannedPositions,
 existingStaff: t.hrAnnualPlan.existingStaff,
 newPositions: t.hrAnnualPlan.newPositionsRequired,
 totalCost: t.hrAnnualPlan.totalEstimatedCost,
 recruitmentActions: t.hrAnnualPlan.recruitmentActions,
 trainingActions: t.hrAnnualPlan.trainingActions,
 identifiedRisks: t.hrAnnualPlan.identifiedRisks
 };

 useEffect(() => {
 if (id) {
 loadPlan(id);
 }
 }, [id]);

 const loadPlan = (planId: string) => {
 const loadedPlan = hrAnnualPlanService.getById(planId);
 if (loadedPlan) {
 setPlan(loadedPlan);
 // Set editing mode if draft
 setIsEditing(loadedPlan.status === 'draft');
 }
 };

 const handleSave = () => {
 if (plan) {
 hrAnnualPlanService.update(plan.id, plan);
 setIsEditing(false);
 }
 };

 const handleSubmitForReview = () => {
 if (plan) {
 const updated = hrAnnualPlanService.submitForReview(plan.id);
 if (updated) {
 setPlan(updated);
 setIsEditing(false);
 }
 }
 };

 const handleApprove = () => {
 if (plan) {
 const approvedBy = 'Management'; // In real app, get from auth context
 const updated = hrAnnualPlanService.approvePlan(plan.id, approvedBy);
 if (updated) {
 setPlan(updated);
 }
 }
 };

 const getStatusColor = (status: string) => {
 switch (status) {
 case 'draft': return 'bg-gray-100 text-gray-700 border-gray-300';
 case 'under-review': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
 case 'approved': return 'bg-green-100 text-green-700 border-green-300';
 case 'locked': return 'bg-blue-100 text-blue-700 border-blue-300';
 default: return 'bg-gray-100 text-gray-700 border-gray-300';
 }
 };

 const formatCurrency = (amount: number) => {
 return `$${amount.toLocaleString()}`;
 };

 if (!plan) {
 return (
 <div className="flex items-center justify-center h-64" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="text-center">
 <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
 <p className="text-gray-600">{labels.planNotFound}</p>
 </div>
 </div>
 );
 }

 const isReadOnly = plan.status === 'approved' || plan.status === 'locked';

 return (
 <div className="space-y-6">
 {/* Back Button */}
 <BackButton onClick={() => navigate('/organization/hr/annual-plan')} label={labels.backToPlans} />

 {/* Header Section */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <div className={`flex items-start justify-between`}>
 {/* Title and Status */}
 <div className={'text-start'}>
 <h1 className="text-3xl font-bold text-gray-900">
 {labels.planTitle} {plan.year}
 </h1>
 <p className="text-gray-600 mt-1">{plan.organization}</p>
 <div className="mt-3">
 <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(plan.status)}`}>
 {plan.status === 'locked' && <Lock className="w-4 h-4" />}
 {t[plan.status as keyof typeof t]}
 </span>
 </div>
 </div>

 {/* Action Buttons */}
 <div className={`flex items-center gap-2`}>
 {isEditing ? (
 <>
 <button
 onClick={handleSave}
 className={`flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700`}
 >
 <Save className="w-4 h-4" />
 <span>{labels.save}</span>
 </button>
 <button
 onClick={() => setIsEditing(false)}
 className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
 >
 {labels.cancel}
 </button>
 </>
 ) : (
 <>
 {!isReadOnly && (
 <>
 <button
 onClick={() => setIsEditing(true)}
 className={`flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700`}
 >
 <Edit className="w-4 h-4" />
 <span>{labels.edit}</span>
 </button>
 {plan.status === 'draft' && (
 <button
 onClick={handleSubmitForReview}
 className={`flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700`}
 >
 <CheckCircle className="w-4 h-4" />
 <span>{labels.submitForReview}</span>
 </button>
 )}
 </>
 )}
 {plan.status === 'under-review' && (
 <button
 onClick={handleApprove}
 className={`flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700`}
 >
 <CheckCircle className="w-4 h-4" />
 <span>{labels.approve}</span>
 </button>
 )}
 <button
 className={`flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50`}
 >
 <Download className="w-4 h-4" />
 <span>{labels.exportPDF}</span>
 </button>
 </>
 )}
 </div>
 </div>

 {/* Read-only Warning */}
 {isReadOnly && (
 <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
 <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
 <p className="text-sm text-amber-900">{labels.readOnlyWarning}</p>
 </div>
 )}
 </div>

 {/* Overview KPIs (Always Visible) */}
 {activeTab === 'overview' && (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
 <div className="bg-white rounded-lg border border-gray-200 p-4">
 <div className={`flex items-center gap-3`}>
 <div className="p-2 bg-indigo-50 rounded">
 <Users className="w-5 h-5 text-indigo-600" />
 </div>
 <div className={'text-start'}>
 <p className="text-xs text-gray-600">{labels.totalPositions}</p>
 <p className="text-2xl font-bold text-gray-900">{plan.totalPlannedPositions}</p>
 </div>
 </div>
 </div>

 <div className="bg-white rounded-lg border border-gray-200 p-4">
 <div className={`flex items-center gap-3`}>
 <div className="p-2 bg-blue-50 rounded">
 <Users className="w-5 h-5 text-blue-600" />
 </div>
 <div className={'text-start'}>
 <p className="text-xs text-gray-600">{labels.existingStaff}</p>
 <p className="text-2xl font-bold text-gray-900">{plan.existingStaffCount}</p>
 </div>
 </div>
 </div>

 <div className="bg-white rounded-lg border border-gray-200 p-4">
 <div className={`flex items-center gap-3`}>
 <div className="p-2 bg-green-50 rounded">
 <Target className="w-5 h-5 text-green-600" />
 </div>
 <div className={'text-start'}>
 <p className="text-xs text-gray-600">{labels.newPositions}</p>
 <p className="text-2xl font-bold text-gray-900">{plan.newPositionsRequired}</p>
 </div>
 </div>
 </div>

 <div className="bg-white rounded-lg border border-gray-200 p-4">
 <div className={`flex items-center gap-3`}>
 <div className="p-2 bg-purple-50 rounded">
 <DollarSign className="w-5 h-5 text-purple-600" />
 </div>
 <div className={'text-start'}>
 <p className="text-xs text-gray-600">{labels.totalCost}</p>
 <p className="text-2xl font-bold text-gray-900">{formatCurrency(plan.estimatedTotalCost)}</p>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Tab Navigation */}
 <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
 <div className="border-b border-gray-200">
 <nav className={`flex overflow-x-auto`}>
 {[
 { id: 'overview', label: labels.overview, icon: FileText },
 { id: 'existing', label: labels.existingWorkforce, icon: Users },
 { id: 'planned', label: labels.plannedStaffing, icon: Target },
 { id: 'recruitment', label: labels.recruitment, icon: ClipboardCheck },
 { id: 'budget', label: labels.budget, icon: DollarSign },
 { id: 'training', label: labels.training, icon: GraduationCap },
 { id: 'risks', label: labels.risks, icon: AlertTriangle },
 { id: 'approval', label: labels.approval, icon: CheckCircle }
 ].map(tab => {
 const Icon = tab.icon;
 return (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${ activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300' }`}
 >
 <Icon className="w-4 h-4" />
 <span>{tab.label}</span>
 </button>
 );
 })}
 </nav>
 </div>

 {/* Tab Content */}
 <div className="p-6">
 {activeTab === 'overview' && (
 <PlanHeader plan={plan} />
 )}
 
 {activeTab === 'existing' && (
 <ExistingWorkforceSection 
 plan={plan} 
 isEditing={isEditing}
 onUpdate={(updated) => setPlan(updated)}
 />
 )}
 
 {activeTab === 'planned' && (
 <PlannedStaffingSection 
 plan={plan} 
 isEditing={isEditing}
 onUpdate={(updated) => setPlan(updated)}
 />
 )}
 
 {activeTab === 'recruitment' && (
 <RecruitmentPlanSection 
 plan={plan}
 />
 )}
 
 {activeTab === 'budget' && (
 <BudgetEstimationSection 
 plan={plan} 
 isEditing={isEditing}
 onUpdate={(updated) => setPlan(updated)}
 />
 )}
 
 {activeTab === 'training' && (
 <TrainingPlanSection 
 plan={plan} 
 isEditing={isEditing}
 onUpdate={(updated) => setPlan(updated)}
 />
 )}
 
 {activeTab === 'risks' && (
 <RiskMitigationSection 
 plan={plan} 
 isEditing={isEditing}
 onUpdate={(updated) => setPlan(updated)}
 />
 )}
 
 {activeTab === 'approval' && (
 <ApprovalSection 
 plan={plan}
 isEditing={isEditing}
 onUpdate={(updated) => setPlan(updated)}
 />
 )}
 </div>
 </div>
 </div>
 );
}
