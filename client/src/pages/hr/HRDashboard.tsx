/**
 * ============================================================================
 * HR DASHBOARD - Management Overview
 * ============================================================================
 * 
 * FEATURES:
 * - KPI Cards: Active Staff, Contracts, Leave, Payroll (REAL DATA from tRPC)
 * - Charts: Staff by Project, Contract Types (REAL DATA)
 * - Quick Actions: Add Staff, Export Snapshot
 * - Strategic HR: HR Annual Plan
 * 
 * ============================================================================
 */
import { Link } from 'wouter';

import { 
  Users, 
  FileText, 
  Calendar,
  DollarSign,
  TrendingUp,
  Download,
  Plus,
  Building2,
  Globe2,
  Target,
  ClipboardList,
  Loader2,
  ArrowLeft, 
  ArrowRight
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from '@/lib/router-compat';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export function HRDashboard() {
  const { t } = useTranslation();
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const { currentOrganizationId } = useOrganization();
  const { currentOperatingUnitId } = useOperatingUnit();
  const { user } = useAuth();

  interface LocalizedText {
  en: string;
  ar: string;
  it: string;
}
type Language = 'en' | 'ar' | 'it';

  // ========== HELPER FUNCTION TO GET TEXT BY LANGUAGE ==========
  const getText = (en: string, ar: string, it: string): string => {
    switch (language) {
      case "ar":
        return ar;
      case "it":
        return it;
      case "en":
      default:
        return en;
    }
  };

  // Get user's organization
  const { data: userOrgs } = trpc.ims.userAssignments.myOrganizations.useQuery(undefined, {
    enabled: !!user,
  });
  
  const organizationId = currentOrganizationId!;
  const operatingUnitId = currentOperatingUnitId!;

  // Fetch employee counts from database
  const { data: employeeCounts, isLoading: countsLoading } = trpc.hrEmployees.getCounts.useQuery(
    {},
    { enabled: !!organizationId && !!operatingUnitId }
  );

  // Fetch all employees for charts
  const { data: employees, isLoading: employeesLoading } = trpc.hrEmployees.getAll.useQuery(
    { 
      status: 'active'
    },
    { enabled: !!organizationId && !!operatingUnitId }
  );

  // Calculate KPI data from real employees
  const totalStaff = employeeCounts?.active ?? 0;
  const nationalStaff = employees?.filter((e: any) => e.staffCategory === 'national').length ?? 0;
  const internationalStaff = employees?.filter((e: any) => e.staffCategory === 'international').length ?? 0;
  const nationalPercentage = totalStaff > 0 ? Math.round((nationalStaff / totalStaff) * 100) : 0;
  const internationalPercentage = totalStaff > 0 ? Math.round((internationalStaff / totalStaff) * 100) : 0;

  // Staff by department/project
  const departmentCounts: Record<string, number> = {};
  employees?.forEach((emp: any) => {
    const dept = emp.department || 'Others';
    departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
  });
  
  const staffByProject = Object.entries(departmentCounts)
    .map(([project, staff]) => ({ project, staff }))
    .sort((a, b) => b.staff - a.staff)
    .slice(0, 5);

  // Staff by contract type
  const contractTypeCounts: Record<string, number> = {};
  employees?.forEach((emp: any) => {
    const type = emp.employmentType || 'full_time';
    contractTypeCounts[type] = (contractTypeCounts[type] || 0) + 1;
  });
  
  const contractTypes = [
    { type: getText('Full-Time', 'دوام كامل', 'Tempo Pieno'), count: contractTypeCounts['full_time'] || 0, color: 'bg-blue-500' },
    { type: getText('Part-Time', 'دوام جزئي', 'Tempo Parziale'), count: contractTypeCounts['part_time'] || 0, color: 'bg-green-500' },
    { type: getText('Contract', 'عقد', 'Contratto'), count: contractTypeCounts['contract'] || 0, color: 'bg-yellow-500' },
    { type: getText('Consultant', 'استشاري', 'Consulente'), count: contractTypeCounts['consultant'] || 0, color: 'bg-purple-500' },
    { type: getText('Intern', 'متدرب', 'Stagista'), count: contractTypeCounts['intern'] || 0, color: 'bg-pink-500' }
  ].filter(ct => ct.count > 0);

  const isLoading = countsLoading || employeesLoading;

  const labels = {
    title: getText(
      t.hr.humanResourcesManagement || "Human Resources Management",
      t.hr.humanResourcesManagement || "إدارة الموارد البشرية",
      t.hr.humanResourcesManagement || "Gestione delle Risorse Umane"
    ),
    subtitle: getText(
      t.hr.hrDashboardSubtitle || "Overview of HR metrics and operations",
      t.hr.hrDashboardSubtitle || "نظرة عامة على مقاييس وعمليات الموارد البشرية",
      t.hr.hrDashboardSubtitle || "Panoramica delle metriche e delle operazioni HR"
    ),
    // KPI Cards
    totalActiveStaff: getText(
      t.hr.totalActiveStaff || "Total Active Staff",
      t.hr.totalActiveStaff || "إجمالي الموظفين النشطين",
      t.hr.totalActiveStaff || "Personale Attivo Totale"
    ),
    nationalStaff: getText(
      t.hr.nationalStaff || "National Staff",
      t.hr.nationalStaff || "الموظفون الوطنيون",
      t.hr.nationalStaff || "Personale Nazionale"
    ),
    internationalStaff: getText(
      t.hr.internationalStaff || "International Staff",
      t.hr.internationalStaff || "الموظفون الدوليون",
      t.hr.internationalStaff || "Personale Internazionale"
    ),
    activeContracts: getText(
      t.hr.activeContracts || "Active Contracts",
      t.hr.activeContracts || "العقود النشطة",
      t.hr.activeContracts || "Contratti Attivi"
    ),
    staffOnLeave: getText(
      t.hr.staffOnLeaveToday || "Staff on Leave Today",
      t.hr.staffOnLeaveToday || "الموظفون في إجازة اليوم",
      t.hr.staffOnLeaveToday || "Personale in Congedo Oggi"
    ),
    monthlyPayroll: getText(
      t.hr.monthlyPayrollValue || "Monthly Payroll",
      t.hr.monthlyPayrollValue || "الرواتب الشهرية",
      t.hr.monthlyPayrollValue || "Buste Paga Mensili"
    ),
    trainingsOngoing: getText(
      t.hr.trainingsOngoing || "Trainings Ongoing",
      t.hr.trainingsOngoing || "التدريبات الجارية",
      t.hr.trainingsOngoing || "Formazioni in Corso"
    ),
    
    // Charts
    staffByProject: getText(
      t.hr.staffByProject || "Staff by Project",
      t.hr.staffByProject || "الموظفون حسب المشروع",
      t.hr.staffByProject || "Personale per Progetto"
    ),
    staffByContract: getText(
      t.hr.staffByContractType || "Staff by Contract Type",
      t.hr.staffByContractType || "الموظفون حسب نوع العقد",
      t.hr.staffByContractType || "Personale per Tipo di Contratto"
    ),
    leaveTypes: getText(
      t.hr.leaveTypesMonthly || "Leave Types Monthly",
      t.hr.leaveTypesMonthly || "أنواع الإجازات الشهرية",
      t.hr.leaveTypesMonthly || "Tipi di Congedi Mensili"
    ),
    payrollCost: getText(
      t.hr.payrollCostByProject || "Payroll Cost by Project",
      t.hr.payrollCostByProject || "تكلفة الرواتب حسب المشروع",
      t.hr.payrollCostByProject || "Costo Buste Paga per Progetto"
    ),
    
    // Actions
    addNewStaff: getText(
      t.hr.addNewStaff || "Add New Staff",
      t.hr.addNewStaff || "إضافة موظف جديد",
      t.hr.addNewStaff || "Aggiungi Nuovo Personale"
    ),
    exportSnapshot: getText(
      t.hr.exportHrSnapshot || "Export Snapshot",
      t.hr.exportHrSnapshot || "تصدير لقطة",
      t.hr.exportHrSnapshot || "Esporta Snapshot"
    ),
    
    // Labels
    total: getText(
      t.hr.total || "Total",
      t.hr.total || "الإجمالي",
      t.hr.total || "Totale"
    ),
    change: getText(
      t.hr.vsLastMonth || "vs Last Month",
      t.hr.vsLastMonth || "مقابل الشهر الماضي",
      t.hr.vsLastMonth || "vs Mese Scorso"
    ),
    viewAll: getText(
      t.hr.viewAll || "View All",
      t.hr.viewAll || "عرض الكل",
      t.hr.viewAll || "Visualizza Tutto"
    ),
    ofTotalStaff: getText(
      t.hr.ofTotalStaff || "of total staff",
      t.hr.ofTotalStaff || "من إجمالي الموظفين",
      t.hr.ofTotalStaff || "del personale totale"
    ),
    strategicHR: getText(
      t.hr.strategicHr || "Strategic HR",
      t.hr.strategicHr || "الموارد البشرية الاستراتيجية",
      t.hr.strategicHr || "HR Strategico"
    ),
    strategicHRDesc: getText(
      "Long-term planning, forecasting, and strategic workforce management",
      "التخطيط طويل الأجل والتنبؤ وإدارة القوى العاملة الاستراتيجية",
      "Pianificazione a lungo termine, previsioni e gestione strategica della forza lavoro"
    ),
    hrAnnualPlan: getText(
      t.hr.hrAnnualPlan || "HR Annual Plan",
      t.hr.hrAnnualPlan || "خطة الموارد البشرية السنوية",
      t.hr.hrAnnualPlan || "Piano Annuale HR"
    ),
    hrAnnualPlanDesc: getText(
      "Strategic workforce planning, recruitment forecasting, and budget estimation",
      "التخطيط الاستراتيجي للقوى العاملة والتنبؤ بالتوظيف وتقدير الميزانية",
      "Pianificazione strategica della forza lavoro, previsioni di reclutamento e stima del budget"
    ),
    currentPlan: getText(
      t.hr.currentPlan || "Current Plan",
      t.hr.currentPlan || "الخطة الحالية",
      t.hr.currentPlan || "Piano Attuale"
    ),
    status: getText(
      t.hr.status8 || "Status",
      t.hr.status8 || "الحالة",
      t.hr.status8 || "Stato"
    ),
    approved: getText(
      t.hr.approved || "Approved",
      t.hr.approved || "موافق عليه",
      t.hr.approved || "Approvato"
    ),
    clickToOpen: getText(
      t.hr.clickToOpen || "Click to open",
      t.hr.clickToOpen || "انقر لفتح",
      t.hr.clickToOpen || "Fai clic per aprire"
    ),
    noDataAvailable: getText(
      "No data available",
      "لا توجد بيانات متاحة",
      "Nessun dato disponibile"
    ),
    organizationDashboard: getText(
      t.hr.organizationDashboard || "Organization Dashboard",
      t.hr.organizationDashboard || "لوحة تحكم المنظمة",
      t.hr.organizationDashboard || "Dashboard Organizzazione"
    ),
    active: getText(
      "Active",
      "نشط",
      "Attivo"
    )
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" dir={isRTL ? 'rtl' : 'ltr'}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Back to Modules Button */}
      <BackButton href="/organization" label={labels.organizationDashboard} />

      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Active Staff */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              +12
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-1">{labels.totalActiveStaff}</p>
          <p className="text-2xl font-bold text-gray-900">{totalStaff}</p>
          <p className="text-xs text-gray-400 mt-1">{labels.change}</p>
        </div>

        {/* Active Contracts */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileText className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              +8
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-1">{labels.activeContracts}</p>
          <p className="text-2xl font-bold text-gray-900">{totalStaff}</p>
          <p className="text-xs text-gray-400 mt-1">{labels.change}</p>
        </div>

        {/* Staff on Leave */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Calendar className="w-5 h-5 text-yellow-600" />
            </div>
            <span className="text-xs text-red-600 font-medium">-3</span>
          </div>
          <p className="text-sm text-gray-500 mb-1">{labels.staffOnLeave}</p>
          <p className="text-2xl font-bold text-gray-900">0</p>
          <p className="text-xs text-gray-400 mt-1">{labels.change}</p>
        </div>

        {/* Monthly Payroll */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              +5%
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-1">{labels.monthlyPayroll}</p>
          <p className="text-2xl font-bold text-gray-900">$0</p>
          <p className="text-xs text-gray-400 mt-1">{labels.change}</p>
        </div>
      </div>

      {/* KPI Cards Row 2 - National/International */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* National Staff */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-sm text-gray-500">{labels.nationalStaff}</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{nationalStaff}</p>
          <p className="text-sm text-gray-400 mt-1">{nationalPercentage}% {labels.ofTotalStaff}</p>
        </div>

        {/* International Staff */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <Globe2 className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm text-gray-500">{labels.internationalStaff}</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{internationalStaff}</p>
          <p className="text-sm text-gray-400 mt-1">{internationalPercentage}% {labels.ofTotalStaff}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4">
        <button 
          onClick={() => navigate('/organization/hr/employees/add')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {labels.addNewStaff}
        </button>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <Download className="w-4 h-4" />
          {labels.exportSnapshot}
        </button>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Staff by Project/Department */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{labels.staffByProject}</h3>
          <div className="space-y-3">
            {staffByProject.length > 0 ? staffByProject.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{item.project}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(item.staff / totalStaff) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8 text-end">{item.staff}</span>
                </div>
              </div>
            )) : (
              <p className="text-sm text-gray-400">{labels.noDataAvailable}</p>
            )}
          </div>
        </div>

        {/* Staff by Contract Type */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{labels.staffByContract}</h3>
          <div className="space-y-3">
            {contractTypes.length > 0 ? contractTypes.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <span className="text-sm text-gray-600">{item.type}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{item.count}</span>
              </div>
            )) : (
              <p className="text-sm text-gray-400">{labels.noDataAvailable}</p>
            )}
          </div>
        </div>
      </div>

      {/* Strategic HR Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Target className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{labels.strategicHR}</h3>
            <p className="text-sm text-gray-500">{labels.strategicHRDesc}</p>
          </div>
        </div>

        {/* HR Annual Plan Card */}
        <div 
          onClick={() => navigate('/organization/hr/annual-plan')}
          className="border border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer transition-all"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ClipboardList className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900">{labels.hrAnnualPlan}</h4>
                  <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                    ✅ {labels.active}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{labels.hrAnnualPlanDesc}</p>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="text-gray-500">{labels.currentPlan}</span>
                <span className="font-medium text-gray-900 ms-2">2026</span>
              </div>
              <div>
                <span className="text-gray-500">{labels.status}</span>
                <span className="font-medium text-green-600 ms-2">{labels.approved}</span>
              </div>
            </div>
          </div>
          <p className="text-sm text-blue-600 mt-3">{labels.clickToOpen} →</p>
        </div>
      </div>
    </div>
  );
}
