/**
 * ============================================================================
 * HR ANNUAL PLAN - VIEW/EDIT SCREEN - tRPC VERSION
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
 * CHANGES FROM ORIGINAL:
 * - Replaced hrAnnualPlanService with tRPC hooks
 * - All other code preserved exactly as-is
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
import { useAnnualPlan, useUpdateAnnualPlan, useSubmitAnnualPlanForReview, useCompleteAnnualPlanReview } from '@/hooks/useAnnualPlanning';
import type { HRAnnualPlan } from '@shared/types/hrAnnualPlanning';

interface HRAnnualPlanViewProps {
  id?: string;
}

export function HRAnnualPlanView({ id: propId }: HRAnnualPlanViewProps = {}) {
 const { t } = useTranslation();
 const urlParams = useParams<{ id: string }>();
 const navigate = useNavigate();
 const { language, isRTL } = useLanguage();
 
 // Use prop id first, then URL param, then 0
 const id = propId || urlParams.id;
 
 // tRPC hooks - REPLACED SERVICE CALLS
 const planId = id ? parseInt(id) : 0;
 const { data: plan, isLoading, error } = useAnnualPlan(planId);
 const updateMutation = useUpdateAnnualPlan();
 const submitForReviewMutation = useSubmitAnnualPlanForReview();
 const completeReviewMutation = useCompleteAnnualPlanReview();
 
 const [localPlan, setLocalPlan] = useState<HRAnnualPlan | null>(null);
 const [isEditing, setIsEditing] = useState(false);
 const [activeTab, setActiveTab] = useState<string>('overview');

 const budgetData =
  typeof localPlan?.budgetEstimate === "string"
    ? JSON.parse(localPlan.budgetEstimate || "{}")
    : localPlan?.budgetEstimate || {};

 // Sync tRPC data with local state
 useEffect(() => {
  if (!plan) return;

  setLocalPlan(plan as HRAnnualPlan);

  setIsEditing(plan.status === "draft");
}, [plan]);

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

 // REPLACED: handleSave - now uses tRPC mutation
 const handleSave = async () => {
 if (localPlan) {
   try {
     await updateMutation.mutateAsync({
      id: localPlan.id,
      planName: localPlan.planName,

      existingWorkforce:
        typeof localPlan.existingWorkforce === "string"
          ? localPlan.existingWorkforce
          : JSON.stringify(localPlan.existingWorkforce ?? []),

      plannedStaffing:
        typeof localPlan.plannedStaffing === "string"
          ? localPlan.plannedStaffing
          : JSON.stringify(localPlan.plannedStaffing ?? []),

      recruitmentPlan:
        typeof localPlan.recruitmentPlan === "string"
          ? localPlan.recruitmentPlan
          : JSON.stringify(localPlan.recruitmentPlan ?? []),

      budgetEstimate:
        typeof localPlan.budgetEstimate === "string"
          ? localPlan.budgetEstimate
          : JSON.stringify(localPlan.budgetEstimate ?? {}),

      trainingPlan:
        typeof localPlan.trainingPlan === "string"
          ? localPlan.trainingPlan
          : JSON.stringify(localPlan.trainingPlan ?? []),

      hrRisks:
        typeof localPlan.hrRisks === "string"
          ? localPlan.hrRisks
          : JSON.stringify(localPlan.hrRisks ?? []),

    });
     setIsEditing(false);
   } catch (err) {
     console.error('Failed to save plan:', err);
   }
 }
 };

 // REPLACED: handleSubmitForReview - now uses tRPC mutation
 const handleSubmitForReview = async () => {
 if (localPlan) {
   try {
     await submitForReviewMutation.mutateAsync({ id: localPlan.id });
     setIsEditing(false);
   } catch (err) {
     console.error('Failed to submit for review:', err);
   }
 }
 };

 // REPLACED: handleApprove - now uses tRPC mutation
 const handleApprove = async () => {
 if (localPlan) {
   try {
     await completeReviewMutation.mutateAsync({
      id: localPlan.id,
    });
   } catch (err) {
     console.error('Failed to approve plan:', err);
   }
 }
 };

 const getStatusColor = (status: string) => {
 switch (status) {
 case 'draft': return 'bg-gray-100 text-gray-700 border-gray-300';
 case 'pending_review': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
 case 'pending_approval': return 'bg-blue-100 text-blue-700 border-blue-300';
 case 'approved': return 'bg-green-100 text-green-700 border-green-300';
 case 'rejected': return 'bg-red-100 text-red-700 border-red-300';
 default: return 'bg-gray-100 text-gray-700 border-gray-300';
 }
 };

 const formatCurrency = (amount: number) => {
 return `$${amount.toLocaleString()}`;
 };

 if (isLoading) {
 return (
   <div className="flex items-center justify-center h-64" dir={isRTL ? 'rtl' : 'ltr'}>
     <div className="text-center">
       <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3 animate-spin" />
       <p className="text-gray-600">{labels.loadingPlan}</p>
     </div>
   </div>
 );
 }

 if (!localPlan) {
 return (
 <div className="flex items-center justify-center h-64" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="text-center">
 <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
 <p className="text-gray-600">{labels.planNotFound}</p>
 </div>
 </div>
 );
 }

 const isReadOnly = localPlan.status === 'approved' || localPlan.status === 'rejected';

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
 {labels.planTitle} {localPlan.planYear}
 </h1>
 <p className="text-gray-600 mt-1">{localPlan.planName}</p>
 <div className="mt-3">
 <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(localPlan.status)}`}>
 {localPlan.status === 'approved' && <Lock className="w-4 h-4" />}
 {localPlan.status}
 </span>
 </div>
 </div>

 {/* Action Buttons */}
 <div className={`flex items-center gap-2`}>
 {isEditing ? (
 <>
 <button
 onClick={handleSave}
 disabled={updateMutation.isPending}
 className={`flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50`}
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
 {localPlan.status === 'draft' && (
 <button
 onClick={handleSubmitForReview}
 disabled={submitForReviewMutation.isPending}
 className={`flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50`}
 >
 <CheckCircle className="w-4 h-4" />
 <span>{labels.submitForReview}</span>
 </button>
 )}
 </>
 )}
 {localPlan.status === 'pending_review' && (
 <button
 onClick={handleApprove}
 disabled={completeReviewMutation.isPending}
 className={`flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50`}
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
 <p className="text-2xl font-bold text-gray-900">{localPlan.plannedStaffing ? localPlan.existingWorkforce?.length ?? 0 : 0}</p>
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
 <p className="text-2xl font-bold text-gray-900">{localPlan.existingWorkforce ? localPlan.existingWorkforce?.length ?? 0 : 0}</p>
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
 <p className="text-2xl font-bold text-gray-900">
   {(localPlan.plannedStaffing ? localPlan.existingWorkforce?.length ?? 0 : 0) - (localPlan.existingWorkforce ? localPlan.existingWorkforce?.length ?? 0 : 0)}
 </p>
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
 <p className="text-2xl font-bold text-gray-900">{formatCurrency(budgetData.total ?? 0)}</p>
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
 <PlanHeader plan={localPlan} />
 )}
 
 {activeTab === 'existing' && (
 <ExistingWorkforceSection 
 plan={localPlan} 
 isEditing={isEditing}
 onUpdate={(updated) => setLocalPlan(updated)}
 />
 )}
 
 {activeTab === 'planned' && (
 <PlannedStaffingSection 
 plan={localPlan} 
 isEditing={isEditing}
 onUpdate={(updated) => setLocalPlan(updated)}
 />
 )}
 
 {activeTab === 'recruitment' && (
 <RecruitmentPlanSection 
 plan={localPlan}
 />
 )}
 
 {activeTab === 'budget' && (
 <BudgetEstimationSection 
 plan={localPlan} 
 isEditing={isEditing}
 onUpdate={(updated) => setLocalPlan(updated)}
 />
 )}
 
 {activeTab === 'training' && (
 <TrainingPlanSection 
 plan={localPlan} 
 isEditing={isEditing}
 onUpdate={(updated) => setLocalPlan(updated)}
 />
 )}
 
 {activeTab === 'risks' && (
 <RiskMitigationSection 
 plan={localPlan} 
 isEditing={isEditing}
 onUpdate={(updated) => setLocalPlan(updated)}
 />
 )}
 
 {activeTab === 'approval' && (
 <ApprovalSection 
 plan={localPlan}
 isEditing={isEditing}
 onUpdate={(updated) => setLocalPlan(updated)}
 />
 )}
 </div>
 </div>
 </div>
 );
}