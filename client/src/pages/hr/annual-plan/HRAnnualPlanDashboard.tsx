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
import { Link } from 'wouter';

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
, ArrowLeft, ArrowRight} from 'lucide-react';
import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { hrAnnualPlanService, HRAnnualPlan } from '@/app/services/hrAnnualPlanService';
import { CreateAnnualPlanModal } from './CreateAnnualPlanModal';
import { useTranslation } from '@/i18n/useTranslation';

// Plan status type
type PlanStatus = 'draft' | 'under-review' | 'approved' | 'locked';

export function HRAnnualPlanDashboard() {
 const { t } = useTranslation();
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
 if (window.confirm('Are you sure you want to delete this plan? This action cannot be undone.')) {
 const success = hrAnnualPlanService.delete(planId);
 if (success) {
 loadPlans(); // Reload plans after deletion
 }
 }
 };

 const labels = {
 // Header
 title: t.hrAnnualPlan.hrAnnualPlan,
 subtitle: t.hr.annualPlanSubtitle,
 
 // KPI Labels
 totalPlannedPositions: t.hrAnnualPlan.totalPlannedPositions,
 existingStaff: t.hrAnnualPlan.existingStaffStartOfYear,
 newPositionsRequired: t.hrAnnualPlan.newPositionsRequired,
 estimatedHRCost: t.hrAnnualPlan.estimatedHrCostAnnual,
 recruitmentActionsPlanned: t.hrAnnualPlan.recruitmentActionsPlanned,
 trainingActionsPlanned: t.hrAnnualPlan.trainingActionsPlanned,
 
 // Filters
 filterYear: t.hrAnnualPlan.year,
 filterDepartment: t.hrAnnualPlan.department,
 filterProject: t.hrAnnualPlan.projectprogram,
 allDepartments: t.hrAnnualPlan.allDepartments,
 allProjects: t.hrAnnualPlan.allProjects,
 
 // Actions
 createNewPlan: t.hrAnnualPlan.createNewPlan,
 exportPlans: t.hrAnnualPlan.exportPlans,
 viewApprovedPlans: t.hrAnnualPlan.viewApprovedPlans,
 
 // Plan Status
 draft: t.hrAnnualPlan.draft,
 underReview: t.hrAnnualPlan.underReview,
 approved: t.hrAnnualPlan.approved,
 locked: t.hrAnnualPlan.locked,
 
 // Table Headers
 planYear: t.hrAnnualPlan.planYear,
 organization: t.hrAnnualPlan.organization,
 preparedBy: t.hrAnnualPlan.preparedBy1,
 preparationDate: t.hrAnnualPlan.preparationDate,
 status: t.hrAnnualPlan.status,
 positions: t.hrAnnualPlan.positions,
 cost: t.hrAnnualPlan.estCost,
 actions: t.hrAnnualPlan.actions,
 
 // Action Buttons
 view: t.hrAnnualPlan.view,
 edit: t.hrAnnualPlan.edit,
 
 // Messages
 noPlans: 'No annual plans created yet. Create your first strategic HR plan.',
 
 // Info Banner
 strategicPlanningTitle: t.hrAnnualPlan.strategicHrPlanning,
 strategicPlanningDesc: 'HR Annual Plans are strategic documents that guide recruitment, budgeting, and capacity building. Once approved, plans become read-only and serve as references for operational modules.'
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
 return new Date(dateString).toLocaleDateString(t.hrAnnualPlan.en, {
 year: 'numeric',
 month: 'short',
 day: 'numeric'
 });
 };

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Back Button */}
 

 {/* Header */}
 <div className={'text-start'}>
 <h1 className="text-3xl font-bold text-gray-900">{labels.title}</h1>
 <p className="text-base text-gray-600 mt-2">{labels.subtitle}</p>
 </div>

 {/* Info Banner */}
 <div className="bg-indigo-50 border-s-4 border-indigo-400 p-4 rounded">
 <div className={`flex items-start gap-3`}>
 <div className="flex-shrink-0">
 <Target className="w-5 h-5 text-indigo-600" />
 </div>
 <div className="flex-1">
 <h3 className={`text-sm font-medium text-indigo-900 text-start`}>
 {labels.strategicPlanningTitle}
 </h3>
 <p className={`text-sm text-indigo-800 mt-1 text-start`}>
 {labels.strategicPlanningDesc}
 </p>
 </div>
 </div>
 </div>

 {/* Filters Bar */}
 <div className={`flex items-center gap-4`}>
 {/* Year Filter */}
 <div className={`flex items-center gap-2`}>
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
 <div className={`flex items-center gap-2`}>
 <Building2 className="w-5 h-5 text-gray-500" />
 <select
 value={selectedDepartment}
 onChange={(e) => setSelectedDepartment(e.target.value)}
 className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
 >
 <option value="all">{labels.allDepartments}</option>
 <option value="programs">Programs</option>
 <option value="operations">Operations</option>
 <option value="finance">Finance</option>
 <option value="hr">Human Resources</option>
 </select>
 </div>

 {/* Project Filter */}
 <div className={`flex items-center gap-2`}>
 <FolderOpen className="w-5 h-5 text-gray-500" />
 <select
 value={selectedProject}
 onChange={(e) => setSelectedProject(e.target.value)}
 className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
 >
 <option value="all">{labels.allProjects}</option>
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
 <div className={`flex items-center justify-between mb-4`}>
 <div className="p-3 bg-indigo-50 rounded-lg">
 <Users className="w-6 h-6 text-indigo-600" />
 </div>
 </div>
 <div className={'text-start'}>
 <p className="text-sm text-gray-600 mb-1">{labels.totalPlannedPositions}</p>
 <p className="text-3xl font-bold text-gray-900">{kpiData.totalPlannedPositions}</p>
 </div>
 </div>

 {/* Existing Staff */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <div className={`flex items-center justify-between mb-4`}>
 <div className="p-3 bg-blue-50 rounded-lg">
 <Briefcase className="w-6 h-6 text-blue-600" />
 </div>
 </div>
 <div className={'text-start'}>
 <p className="text-sm text-gray-600 mb-1">{labels.existingStaff}</p>
 <p className="text-3xl font-bold text-gray-900">{kpiData.existingStaff}</p>
 </div>
 </div>

 {/* New Positions Required */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <div className={`flex items-center justify-between mb-4`}>
 <div className="p-3 bg-green-50 rounded-lg">
 <UserPlus className="w-6 h-6 text-green-600" />
 </div>
 </div>
 <div className={'text-start'}>
 <p className="text-sm text-gray-600 mb-1">{labels.newPositionsRequired}</p>
 <p className="text-3xl font-bold text-gray-900">{kpiData.newPositionsRequired}</p>
 </div>
 </div>

 {/* Estimated HR Cost */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <div className={`flex items-center justify-between mb-4`}>
 <div className="p-3 bg-purple-50 rounded-lg">
 <DollarSign className="w-6 h-6 text-purple-600" />
 </div>
 </div>
 <div className={'text-start'}>
 <p className="text-sm text-gray-600 mb-1">{labels.estimatedHRCost}</p>
 <p className="text-3xl font-bold text-gray-900">{formatCurrency(kpiData.estimatedCost)}</p>
 </div>
 </div>

 {/* Recruitment Actions Planned */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <div className={`flex items-center justify-between mb-4`}>
 <div className="p-3 bg-orange-50 rounded-lg">
 <Target className="w-6 h-6 text-orange-600" />
 </div>
 </div>
 <div className={'text-start'}>
 <p className="text-sm text-gray-600 mb-1">{labels.recruitmentActionsPlanned}</p>
 <p className="text-3xl font-bold text-gray-900">{kpiData.recruitmentActions}</p>
 </div>
 </div>

 {/* Training Actions Planned */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <div className={`flex items-center justify-between mb-4`}>
 <div className="p-3 bg-yellow-50 rounded-lg">
 <GraduationCap className="w-6 h-6 text-yellow-600" />
 </div>
 </div>
 <div className={'text-start'}>
 <p className="text-sm text-gray-600 mb-1">{labels.trainingActionsPlanned}</p>
 <p className="text-3xl font-bold text-gray-900">{kpiData.trainingActions}</p>
 </div>
 </div>
 </div>

 {/* Action Buttons */}
 <div className={`flex items-center gap-3`}>
 <button 
 onClick={handleCreateNewPlan}
 className={`flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors`}
 >
 <Plus className="w-4 h-4" />
 <span>{labels.createNewPlan}</span>
 </button>
 <button 
 className={`flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors`}
 >
 <Download className="w-4 h-4" />
 <span>{labels.exportPlans}</span>
 </button>
 </div>

 {/* Plans List */}
 <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
 <div className="px-6 py-4 border-b border-gray-200">
 <h2 className={`text-lg font-semibold text-gray-900 text-start`}>
 {labels.viewApprovedPlans}
 </h2>
 </div>

 {plans.length === 0 ? (
 <div className="px-6 py-12 text-center">
 <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
 <p className="text-gray-600">{labels.noPlans}</p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className={`px-6 py-3 text-xs font-semibold text-gray-700 text-start`}>{labels.planYear}</th>
 <th className={`px-6 py-3 text-xs font-semibold text-gray-700 text-start`}>{labels.organization}</th>
 <th className={`px-6 py-3 text-xs font-semibold text-gray-700 text-start`}>{labels.preparedBy}</th>
 <th className={`px-6 py-3 text-xs font-semibold text-gray-700 text-start`}>{labels.preparationDate}</th>
 <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700">{labels.status}</th>
 <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700">{labels.positions}</th>
 <th className="px-6 py-3 text-end text-xs font-semibold text-gray-700">{labels.cost}</th>
 <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700">{labels.actions}</th>
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
 <td className="px-6 py-4 text-end text-sm font-semibold text-gray-900">
 {plan.estimatedTotalCost > 0 ? formatCurrency(plan.estimatedTotalCost) : '-'}
 </td>
 <td className="px-6 py-4 text-center">
 <div className={`flex items-center justify-center gap-2`}>
 <button
 onClick={() => navigate(`/hr/annual-plan/view/${plan.id}`)}
 className="inline-flex items-center gap-1 px-3 py-1 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors"
 title={labels.view}
 >
 <Eye className="w-4 h-4" />
 <span className="text-xs">{labels.view}</span>
 </button>
 {plan.status === 'draft' && (
 <button
 onClick={() => navigate(`/hr/annual-plan/view/${plan.id}`)}
 className="inline-flex items-center gap-1 px-3 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
 title={labels.edit}
 >
 <Edit className="w-4 h-4" />
 <span className="text-xs">{labels.edit}</span>
 </button>
 )}
 {plan.status === 'draft' && (
 <button
 onClick={() => handleDeletePlan(plan.id)}
 className="inline-flex items-center gap-1 px-3 py-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
 title={t.hrAnnualPlan.delete}
 >
 <Trash2 className="w-4 h-4" />
 <span className="text-xs">{t.hrAnnualPlan.delete}</span>
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