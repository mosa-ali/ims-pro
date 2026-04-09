/**
 * ============================================================================
 * HR ANNUAL PLAN - DASHBOARD (LANDING PAGE)
 * ============================================================================
 * 
 * SECTION 1: HR Annual Plan Dashboard
 * 
 * FEATURES:
 * - KPI Cards (6 top metrics)
 * - Filters (Year, Department, Project/Program)
 * - Actions (Create, View, Export)
 * - Plans List (All created plans)
 * 
 * KPIs:
 * 1. Total Planned Positions
 * 2. Existing Staff (Start of Year)
 * 3. New Positions Required
 * 4. Estimated HR Cost (Annual)
 * 5. Recruitment Actions Planned
 * 6. Training Actions Planned
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { 
  Users,
  UserPlus,
  DollarSign,
  Target,
  GraduationCap,
  Briefcase,
  Plus,
  Download,
  FileText,
  Eye,
  Edit,
  Lock,
  Filter,
  Calendar,
  Building2,
  FolderOpen,
  Trash2
} from 'lucide-react';
import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { BackToModulesButton } from '../BackToModulesButton';
import { hrAnnualPlanService, HRAnnualPlan } from '@/app/services/hrAnnualPlanService';
import { CreateAnnualPlanModal } from './CreateAnnualPlanModal';

// Plan status type
type PlanStatus = 'draft' | 'under-review' | 'approved' | 'locked';

export function HRAnnualPlanDashboard() {
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();
  
  // Load plans from service
  const [plans, setPlans] = useState<HRAnnualPlan[]>([]);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedProject, setSelectedProject] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = () => {
    const allPlans = hrAnnualPlanService.getAll();
    setPlans(allPlans);
  };

  const handleCreateNewPlan = () => {
    // Open the create modal instead of directly creating
    setIsCreateModalOpen(true);
  };

  const handlePlanCreated = (newPlan: HRAnnualPlan) => {
    // Reload plans and navigate to the new plan
    loadPlans();
    navigate(`/organization/hr/annual-plan/view/${newPlan.id}`);
  };

  const handleDeletePlan = (planId: string) => {
    if (window.confirm(language === 'en' 
      ? 'Are you sure you want to delete this plan? This action cannot be undone.' 
      : 'هل أنت متأكد من حذف هذه الخطة؟ لا يمكن التراجع عن هذا الإجراء.')) {
      const success = hrAnnualPlanService.delete(planId);
      if (success) {
        loadPlans(); // Reload plans after deletion
      }
    }
  };

  const t = {
    // Header
    title: language === 'en' ? 'HR Annual Plan' : 'الخطة السنوية للموارد البشرية',
    subtitle: language === 'en' 
      ? 'Strategic workforce planning, recruitment forecasting, and budget estimation'
      : 'التخطيط الاستراتيجي للقوى العاملة، والتنبؤ بالتوظيف، وتقدير الميزانية',
    
    // KPI Labels
    totalPlannedPositions: language === 'en' ? 'Total Planned Positions' : 'إجمالي الوظائف المخططة',
    existingStaff: language === 'en' ? 'Existing Staff (Start of Year)' : 'الموظفون الحاليون (بداية العام)',
    newPositionsRequired: language === 'en' ? 'New Positions Required' : 'الوظائف الجديدة المطلوبة',
    estimatedHRCost: language === 'en' ? 'Estimated HR Cost (Annual)' : 'التكلفة المقدرة للموارد البشرية (سنوي)',
    recruitmentActionsPlanned: language === 'en' ? 'Recruitment Actions Planned' : 'إجراءات التوظيف المخططة',
    trainingActionsPlanned: language === 'en' ? 'Training Actions Planned' : 'إجراءات التدريب المخططة',
    
    // Filters
    filterYear: language === 'en' ? 'Year' : 'السنة',
    filterDepartment: language === 'en' ? 'Department' : 'القسم',
    filterProject: language === 'en' ? 'Project/Program' : 'المشروع/البرنامج',
    allDepartments: language === 'en' ? 'All Departments' : 'جميع الأقسام',
    allProjects: language === 'en' ? 'All Projects' : 'جميع المشاريع',
    
    // Actions
    createNewPlan: language === 'en' ? 'Create New Plan' : 'إنشاء خطة جديدة',
    exportPlans: language === 'en' ? 'Export Plans' : 'تصدير الخطط',
    viewApprovedPlans: language === 'en' ? 'View Approved Plans' : 'عرض الخطط المعتمدة',
    
    // Plan Status
    draft: language === 'en' ? 'Draft' : 'مسودة',
    underReview: language === 'en' ? 'Under Review' : 'قيد المراجعة',
    approved: language === 'en' ? 'Approved' : 'معتمدة',
    locked: language === 'en' ? 'Locked' : 'مقفلة',
    
    // Table Headers
    planYear: language === 'en' ? 'Plan Year' : 'سنة الخطة',
    organization: language === 'en' ? 'Organization' : 'المنظمة',
    preparedBy: language === 'en' ? 'Prepared By' : 'أعدها',
    preparationDate: language === 'en' ? 'Preparation Date' : 'تاريخ الإعداد',
    status: language === 'en' ? 'Status' : 'الحالة',
    positions: language === 'en' ? 'Positions' : 'الوظائف',
    cost: language === 'en' ? 'Est. Cost' : 'التكلفة المقدرة',
    actions: language === 'en' ? 'Actions' : 'الإجرا��ات',
    
    // Action Buttons
    view: language === 'en' ? 'View' : 'عرض',
    edit: language === 'en' ? 'Edit' : 'تعديل',
    
    // Messages
    noPlans: language === 'en' 
      ? 'No annual plans created yet. Create your first strategic HR plan.'
      : 'لم يتم إنشاء خطط سنوية بعد. قم بإنشاء خطتك الاستراتيجية الأولى للموارد البشرية.',
    
    // Info Banner
    strategicPlanningTitle: language === 'en' ? 'Strategic HR Planning' : 'التخطيط الاستراتيجي للموارد البشرية',
    strategicPlanningDesc: language === 'en'
      ? 'HR Annual Plans are strategic documents that guide recruitment, budgeting, and capacity building. Once approved, plans become read-only and serve as references for operational modules.'
      : 'الخطط السنوية للموارد البشرية هي وثائق استراتيجية توجه التوظيف والميزانية وبناء القدرات. بمجرد الموافقة عليها، تصبح الخطط للقراءة فقط وتعمل كمراجع للوحدات التشغيلية.'
  };

  // Get current active plan (approved or locked)
  const currentPlan = plans.find(p => p.year === selectedYear && (p.status === 'approved' || p.status === 'locked'));

  // KPI data from current plan
  const kpiData = currentPlan ? {
    totalPlannedPositions: currentPlan.totalPlannedPositions,
    existingStaff: currentPlan.existingStaffCount,
    newPositionsRequired: currentPlan.newPositionsRequired,
    estimatedCost: currentPlan.estimatedTotalCost,
    recruitmentActions: currentPlan.recruitmentPlan.length,
    trainingActions: currentPlan.trainingPlan.length
  } : {
    totalPlannedPositions: 0,
    existingStaff: 0,
    newPositionsRequired: 0,
    estimatedCost: 0,
    recruitmentActions: 0,
    trainingActions: 0
  };

  const getStatusColor = (status: PlanStatus) => {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar' : 'en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <BackToModulesButton 
        targetPath="/organization/hr"
        parentModuleName={language === 'en' ? 'Overview' : 'نظرة عامة'}
      />

      {/* Header */}
      <div className={isRTL ? 'text-right' : 'text-left'}>
        <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
        <p className="text-base text-gray-600 mt-2">{t.subtitle}</p>
      </div>

      {/* Info Banner */}
      <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4 rounded">
        <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="flex-shrink-0">
            <Target className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex-1">
            <h3 className={`text-sm font-medium text-indigo-900 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.strategicPlanningTitle}
            </h3>
            <p className={`text-sm text-indigo-800 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.strategicPlanningDesc}
            </p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {/* Year Filter */}
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Calendar className="w-5 h-5 text-gray-500" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
            <option value={2028}>2028</option>
          </select>
        </div>

        {/* Department Filter */}
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Building2 className="w-5 h-5 text-gray-500" />
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">{t.allDepartments}</option>
            <option value="programs">Programs</option>
            <option value="operations">Operations</option>
            <option value="finance">Finance</option>
            <option value="hr">Human Resources</option>
          </select>
        </div>

        {/* Project Filter */}
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <FolderOpen className="w-5 h-5 text-gray-500" />
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">{t.allProjects}</option>
            <option value="echo">ECHO-YEM-001</option>
            <option value="unhcr">UNHCR-SYR-002</option>
            <option value="sc">SC-MENA-003</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Planned Positions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="p-3 bg-indigo-50 rounded-lg">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-sm text-gray-600 mb-1">{t.totalPlannedPositions}</p>
            <p className="text-3xl font-bold text-gray-900">{kpiData.totalPlannedPositions}</p>
          </div>
        </div>

        {/* Existing Staff */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Briefcase className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-sm text-gray-600 mb-1">{t.existingStaff}</p>
            <p className="text-3xl font-bold text-gray-900">{kpiData.existingStaff}</p>
          </div>
        </div>

        {/* New Positions Required */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="p-3 bg-green-50 rounded-lg">
              <UserPlus className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-sm text-gray-600 mb-1">{t.newPositionsRequired}</p>
            <p className="text-3xl font-bold text-gray-900">{kpiData.newPositionsRequired}</p>
          </div>
        </div>

        {/* Estimated HR Cost */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="p-3 bg-purple-50 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-sm text-gray-600 mb-1">{t.estimatedHRCost}</p>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(kpiData.estimatedCost)}</p>
          </div>
        </div>

        {/* Recruitment Actions Planned */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="p-3 bg-orange-50 rounded-lg">
              <Target className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-sm text-gray-600 mb-1">{t.recruitmentActionsPlanned}</p>
            <p className="text-3xl font-bold text-gray-900">{kpiData.recruitmentActions}</p>
          </div>
        </div>

        {/* Training Actions Planned */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <GraduationCap className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-sm text-gray-600 mb-1">{t.trainingActionsPlanned}</p>
            <p className="text-3xl font-bold text-gray-900">{kpiData.trainingActions}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button 
          onClick={handleCreateNewPlan}
          className={`flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <Plus className="w-4 h-4" />
          <span>{t.createNewPlan}</span>
        </button>
        <button 
          className={`flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <Download className="w-4 h-4" />
          <span>{t.exportPlans}</span>
        </button>
      </div>

      {/* Plans List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className={`text-lg font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.viewApprovedPlans}
          </h2>
        </div>

        {plans.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">{t.noPlans}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">{t.planYear}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">{t.organization}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">{t.preparedBy}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">{t.preparationDate}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700">{t.status}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700">{t.positions}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">{t.cost}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-bold text-indigo-600">{plan.year}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{plan.organization}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{plan.approval.preparedBy || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{formatDate(plan.approval.preparationDate)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(plan.status)}`}>
                        {plan.status === 'locked' && <Lock className="w-3 h-3" />}
                        {t[plan.status as keyof typeof t]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                      {plan.totalPlannedPositions || '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                      {plan.estimatedTotalCost > 0 ? formatCurrency(plan.estimatedTotalCost) : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className={`flex items-center justify-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <button
                          onClick={() => navigate(`/hr/annual-plan/view/${plan.id}`)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors"
                          title={t.view}
                        >
                          <Eye className="w-4 h-4" />
                          <span className="text-xs">{t.view}</span>
                        </button>
                        {plan.status === 'draft' && (
                          <button
                            onClick={() => navigate(`/hr/annual-plan/view/${plan.id}`)}
                            className="inline-flex items-center gap-1 px-3 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                            title={t.edit}
                          >
                            <Edit className="w-4 h-4" />
                            <span className="text-xs">{t.edit}</span>
                          </button>
                        )}
                        {plan.status === 'draft' && (
                          <button
                            onClick={() => handleDeletePlan(plan.id)}
                            className="inline-flex items-center gap-1 px-3 py-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                            title={language === 'en' ? 'Delete' : 'حذف'}
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="text-xs">{language === 'en' ? 'Delete' : 'حذف'}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Annual Plan Modal */}
      <CreateAnnualPlanModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onPlanCreated={handlePlanCreated}
        existingPlans={plans}
        language={language}
        isRTL={isRTL}
      />
    </div>
  );
}