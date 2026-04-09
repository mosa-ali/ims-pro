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

export function HRAnnualPlanView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();
  
  const [plan, setPlan] = useState<HRAnnualPlan | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('overview');

  const t = {
    // Navigation
    backToPlans: language === 'en' ? 'Back to Plans' : 'العودة إلى الخطط',
    
    // Header
    planTitle: language === 'en' ? 'HR Annual Plan' : 'الخطة السنوية للموارد البشرية',
    year: language === 'en' ? 'Year' : 'السنة',
    status: language === 'en' ? 'Status' : 'الحالة',
    
    // Status
    draft: language === 'en' ? 'Draft' : 'مسودة',
    underReview: language === 'en' ? 'Under Review' : 'قيد المراجعة',
    approved: language === 'en' ? 'Approved' : 'معتمدة',
    locked: language === 'en' ? 'Locked' : 'مقفلة',
    
    // Actions
    edit: language === 'en' ? 'Edit Plan' : 'تعديل الخطة',
    save: language === 'en' ? 'Save Changes' : 'حفظ التغييرات',
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
    submitForReview: language === 'en' ? 'Submit for Review' : 'إرسال للمراجعة',
    approve: language === 'en' ? 'Approve Plan' : 'اعتماد الخطة',
    exportPDF: language === 'en' ? 'Export PDF' : 'تصدير PDF',
    exportExcel: language === 'en' ? 'Export Excel' : 'تصدير Excel',
    
    // Tabs
    overview: language === 'en' ? 'Overview' : 'نظرة عامة',
    existingWorkforce: language === 'en' ? 'Existing Workforce' : 'القوى العاملة الحالية',
    plannedStaffing: language === 'en' ? 'Planned Staffing' : 'التوظيف المخطط',
    recruitment: language === 'en' ? 'Recruitment Plan' : 'خطة التوظيف',
    budget: language === 'en' ? 'Budget & Costs' : 'الميزانية والتكاليف',
    training: language === 'en' ? 'Training Plan' : 'خطة التدريب',
    risks: language === 'en' ? 'HR Risks' : 'مخاطر الموارد البشرية',
    approval: language === 'en' ? 'Approval' : 'الاعتماد',
    
    // Messages
    planNotFound: language === 'en' ? 'Plan not found' : 'لم يتم العثور على الخطة',
    loadingPlan: language === 'en' ? 'Loading plan...' : 'جاري تحميل الخطة...',
    readOnlyWarning: language === 'en'
      ? 'This plan is approved/locked and cannot be edited'
      : 'هذه الخطة معتمدة/مقفلة ولا يمكن تعديلها',
    
    // Overview KPIs
    totalPositions: language === 'en' ? 'Total Planned Positions' : 'إجمالي الوظائف المخططة',
    existingStaff: language === 'en' ? 'Existing Staff' : 'الموظفون الحاليون',
    newPositions: language === 'en' ? 'New Positions Required' : 'الوظائف الجديدة المطلوبة',
    totalCost: language === 'en' ? 'Total Estimated Cost' : 'إجمالي التكلفة المقدرة',
    recruitmentActions: language === 'en' ? 'Recruitment Actions' : 'إجراءات التوظيف',
    trainingActions: language === 'en' ? 'Training Actions' : 'إجراءات التدريب',
    identifiedRisks: language === 'en' ? 'Identified Risks' : 'المخاطر المحددة'
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
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">{t.planNotFound}</p>
        </div>
      </div>
    );
  }

  const isReadOnly = plan.status === 'approved' || plan.status === 'locked';

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/organization/hr/annual-plan')}
        className={`flex items-center gap-2 text-gray-600 hover:text-gray-900 ${isRTL ? 'flex-row-reverse' : ''}`}
      >
        <ChevronLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
        <span>{t.backToPlans}</span>
      </button>

      {/* Header Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          {/* Title and Status */}
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <h1 className="text-3xl font-bold text-gray-900">
              {t.planTitle} {plan.year}
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
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className={`flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <Save className="w-4 h-4" />
                  <span>{t.save}</span>
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  {t.cancel}
                </button>
              </>
            ) : (
              <>
                {!isReadOnly && (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className={`flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      <Edit className="w-4 h-4" />
                      <span>{t.edit}</span>
                    </button>
                    {plan.status === 'draft' && (
                      <button
                        onClick={handleSubmitForReview}
                        className={`flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>{t.submitForReview}</span>
                      </button>
                    )}
                  </>
                )}
                {plan.status === 'under-review' && (
                  <button
                    onClick={handleApprove}
                    className={`flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>{t.approve}</span>
                  </button>
                )}
                <button
                  className={`flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <Download className="w-4 h-4" />
                  <span>{t.exportPDF}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Read-only Warning */}
        {isReadOnly && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-900">{t.readOnlyWarning}</p>
          </div>
        )}
      </div>

      {/* Overview KPIs (Always Visible) */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="p-2 bg-indigo-50 rounded">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-xs text-gray-600">{t.totalPositions}</p>
                <p className="text-2xl font-bold text-gray-900">{plan.totalPlannedPositions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="p-2 bg-blue-50 rounded">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-xs text-gray-600">{t.existingStaff}</p>
                <p className="text-2xl font-bold text-gray-900">{plan.existingStaffCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="p-2 bg-green-50 rounded">
                <Target className="w-5 h-5 text-green-600" />
              </div>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-xs text-gray-600">{t.newPositions}</p>
                <p className="text-2xl font-bold text-gray-900">{plan.newPositionsRequired}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="p-2 bg-purple-50 rounded">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-xs text-gray-600">{t.totalCost}</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(plan.estimatedTotalCost)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className={`flex overflow-x-auto ${isRTL ? 'flex-row-reverse' : ''}`}>
            {[
              { id: 'overview', label: t.overview, icon: FileText },
              { id: 'existing', label: t.existingWorkforce, icon: Users },
              { id: 'planned', label: t.plannedStaffing, icon: Target },
              { id: 'recruitment', label: t.recruitment, icon: ClipboardCheck },
              { id: 'budget', label: t.budget, icon: DollarSign },
              { id: 'training', label: t.training, icon: GraduationCap },
              { id: 'risks', label: t.risks, icon: AlertTriangle },
              { id: 'approval', label: t.approval, icon: CheckCircle }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  } ${isRTL ? 'flex-row-reverse' : ''}`}
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
