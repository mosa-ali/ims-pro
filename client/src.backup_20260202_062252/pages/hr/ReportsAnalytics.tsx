/**
 * ============================================================================
 * REPORTS & ANALYTICS - ERP-GRADE INTELLIGENCE MODULE
 * ============================================================================
 * 
 * PURPOSE: Cross-module analytical and audit engine
 * 
 * MANDATORY RULES:
 * - Read-only, system-wide intelligence
 * - Aggregates data across HR, Payroll, Attendance, Recruitment
 * - Supports management decisions and audits
 * - Produces official, printable, exportable reports
 * - NEVER duplicates dashboards or profile views
 * - NEVER allows data entry
 * 
 * STRUCTURE:
 * 1. Landing View (Cards Grid)
 * 2. Six Analytics Workspaces
 * 3. Export & Print capabilities
 * 
 * ============================================================================
 */

import { useState } from 'react';
import { 
  ArrowLeft, 
  Users, 
  DollarSign, 
  Clock, 
  Calendar, 
  UserPlus, 
  Shield,
  Download,
  Printer,
  Filter,
  TrendingUp,
  BarChart3,
  PieChart,
  FileText,
  RefreshCw
} from 'lucide-react';
import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';

type AnalyticsView = 
  | 'landing' 
  | 'workforce' 
  | 'payroll' 
  | 'attendance' 
  | 'leave' 
  | 'recruitment' 
  | 'compliance';

interface AnalyticsCard {
  id: AnalyticsView;
  icon: typeof Users;
  scope: string;
  dataSources: string[];
  lastRefresh: string;
}

export function ReportsAnalytics() {
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<AnalyticsView>('landing');
  const [dateRange, setDateRange] = useState({ from: '2024-01-01', to: '2024-12-31' });
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedProject, setSelectedProject] = useState('all');

  const t = {
    title: language === 'en' ? 'Reports & Analytics' : 'التقارير والتحليلات',
    subtitle: language === 'en' ? 'Management and audit-ready HR insights' : 'رؤى الموارد البشرية الإدارية وجاهزة للتدقيق',
    readOnly: language === 'en' 
      ? '📊 All reports are read-only and auto-generated from system data'
      : '📊 جميع التقارير للقراءة فقط ويتم إنشاؤها تلقائيًا من بيانات النظام',
    
    // Analytics Cards
    workforceAnalytics: language === 'en' ? 'Workforce Analytics' : 'تحليلات القوى العاملة',
    payrollCostAnalytics: language === 'en' ? 'Payroll & Cost Analytics' : 'تحليلات كشوف المرتبات والتكاليف',
    attendanceAnalytics: language === 'en' ? 'Attendance Analytics' : 'تحليلات الحضور',
    leaveAnalytics: language === 'en' ? 'Leave Analytics' : 'تحليلات الإجازات',
    recruitmentAnalytics: language === 'en' ? 'Recruitment Analytics' : 'تحليلات التوظيف',
    complianceRiskAnalytics: language === 'en' ? 'Compliance & Risk Analytics' : 'تحليلات الامتثال والمخاطر',
    
    scope: language === 'en' ? 'Scope' : 'النطاق',
    dataSources: language === 'en' ? 'Data Sources' : 'مصادر البيانات',
    lastRefresh: language === 'en' ? 'Last Refresh' : 'آخر تحديث',
    viewAnalytics: language === 'en' ? 'View Analytics' : 'عرض التحليلات',
    
    // Common
    exportExcel: language === 'en' ? 'Export to Excel' : 'تصدير إلى Excel',
    printReport: language === 'en' ? 'Print Report' : 'طباعة التقرير',
    filters: language === 'en' ? 'Filters' : 'الفلاتر',
    dateRange: language === 'en' ? 'Date Range' : 'النطاق الزمني',
    department: language === 'en' ? 'Department' : 'القسم',
    project: language === 'en' ? 'Project' : 'المشروع',
    all: language === 'en' ? 'All' : 'الكل',
    from: language === 'en' ? 'From' : 'من',
    to: language === 'en' ? 'To' : 'إلى',
    applyFilters: language === 'en' ? 'Apply Filters' : 'تطبيق الفلاتر',
    backToLanding: language === 'en' ? 'Back to Reports' : 'العودة إلى التقارير',
    
    // Workforce
    strategicWorkforce: language === 'en' ? 'Strategic workforce overview' : 'نظرة عامة استراتيجية على القوى العاملة',
    headcountByDepartment: language === 'en' ? 'Headcount by Department' : 'عدد الموظفين حسب القسم',
    headcountByProject: language === 'en' ? 'Headcount by Project' : 'عدد الموظفين حسب المشروع',
    headcountByContract: language === 'en' ? 'Headcount by Contract Type' : 'عدد الموظفين حسب نوع العقد',
    staffStatus: language === 'en' ? 'Staff Status Distribution' : 'توزيع حالة الموظفين',
    genderDistribution: language === 'en' ? 'Gender Distribution' : 'التوزيع الجنساني',
    nationalityDistribution: language === 'en' ? 'Nationality Distribution' : 'توزيع الجنسيات',
    staffGrowth: language === 'en' ? 'Staff Growth Over Time' : 'نمو الموظفين بمرور الوقت',
    
    // Payroll
    financialControl: language === 'en' ? 'Financial control & donor compliance' : 'الرقابة المالية والامتثال للمانحين',
    payrollCostByMonth: language === 'en' ? 'Payroll Cost by Month' : 'تكلفة كشف المرتبات حسب الشهر',
    payrollByProject: language === 'en' ? 'Payroll by Project' : 'كشف المرتبات حسب المشروع',
    salaryDistribution: language === 'en' ? 'Salary Distribution by Grade' : 'توزيع الرواتب حسب الدرجة',
    allowancesSummary: language === 'en' ? 'Allowances Summary' : 'ملخص البدلات',
    overtimeCost: language === 'en' ? 'Overtime Cost' : 'تكلفة العمل الإضافي',
    costTrends: language === 'en' ? 'Cost Trends Over Time' : 'اتجاهات التكلفة بمرور الوقت',
    
    // Attendance
    operationalDiscipline: language === 'en' ? 'Operational discipline & fairness' : 'الانضباط التشغيلي والعدالة',
    attendanceRate: language === 'en' ? 'Attendance Rate by Department' : 'معدل الحضور حسب القسم',
    lateArrivals: language === 'en' ? 'Late Arrivals Trends' : 'اتجاهات التأخير',
    absencePatterns: language === 'en' ? 'Absence Patterns' : 'أنماط الغياب',
    overtimeHours: language === 'en' ? 'Overtime Hours by Project' : 'ساعات العمل الإضافي حسب المشروع',
    lockedRecords: language === 'en' ? 'Locked vs Adjusted Records' : 'السجلات المقفلة مقابل المعدلة',
    
    // Leave
    hrPlanning: language === 'en' ? 'HR planning & liability tracking' : 'تخطيط الموارد البشرية وتتبع المسؤولية',
    leaveBalances: language === 'en' ? 'Leave Balances by Type' : 'أرصدة الإجازات حسب النوع',
    leaveTaken: language === 'en' ? 'Leave Taken per Period' : 'الإجازات المأخوذة حسب الفترة',
    leaveLiability: language === 'en' ? 'Leave Liability Projection' : 'توقعات مسؤولية الإجازات',
    highRiskStaff: language === 'en' ? 'High-Risk Staff (Excessive Leave)' : 'الموظفون ذوو المخاطر العالية (إجازة مفرطة)',
    
    // Recruitment
    hiringEffectiveness: language === 'en' ? 'Hiring effectiveness & fairness' : 'فعالية التوظيف والعدالة',
    timeToHire: language === 'en' ? 'Time-to-Hire' : 'وقت التوظيف',
    candidatesPerVacancy: language === 'en' ? 'Candidates per Vacancy' : 'المرشحون لكل وظيفة شاغرة',
    shortlistRatio: language === 'en' ? 'Shortlist vs Selection Ratio' : 'نسبة القائمة المختصرة مقابل الاختيار',
    vacancyAging: language === 'en' ? 'Vacancy Aging' : 'عمر الوظيفة الشاغرة',
    sourceEffectiveness: language === 'en' ? 'Source Effectiveness' : 'فعالية المصدر',
    
    // Compliance
    auditGovernance: language === 'en' ? 'Audit & governance' : 'التدقيق والحوكمة',
    contractsExpiring: language === 'en' ? 'Contracts Expiring' : 'العقود المنتهية',
    missingDocuments: language === 'en' ? 'Missing Mandatory Documents' : 'المستندات الإلزامية المفقودة',
    pendingAppraisals: language === 'en' ? 'Pending Appraisals' : 'التقييمات المعلقة',
    disciplinaryCases: language === 'en' ? 'Disciplinary Cases Summary' : 'ملخص قضايا التأديب',
    attendanceAnomalies: language === 'en' ? 'Attendance Anomalies' : 'شذوذ الحضور',
    payrollExceptions: language === 'en' ? 'Payroll Exceptions' : 'استثناءات كشف المرتبات',
    
    count: language === 'en' ? 'Count' : 'العدد',
    percentage: language === 'en' ? 'النسبة' : 'Percentage',
    amount: language === 'en' ? 'Amount' : 'المبلغ',
    total: language === 'en' ? 'Total' : 'المجموع',
    average: language === 'en' ? 'Average' : 'المتوسط',
    
    active: language === 'en' ? 'Active' : 'نشط',
    archived: language === 'en' ? 'Archived' : 'مؤرشف',
    exited: language === 'en' ? 'Exited' : 'مغادر',
    male: language === 'en' ? 'Male' : 'ذكر',
    female: language === 'en' ? 'Female' : 'أنثى',
  };

  const analyticsCards: AnalyticsCard[] = [
    {
      id: 'workforce',
      icon: Users,
      scope: t.strategicWorkforce,
      dataSources: ['Employee Profiles', 'Contracts', 'HR Archive'],
      lastRefresh: '2024-01-24 10:30 AM'
    },
    {
      id: 'payroll',
      icon: DollarSign,
      scope: t.financialControl,
      dataSources: ['Approved Payroll', 'Salary Scale', 'Allowances', 'Attendance (OT)'],
      lastRefresh: '2024-01-24 10:30 AM'
    },
    {
      id: 'attendance',
      icon: Clock,
      scope: t.operationalDiscipline,
      dataSources: ['Attendance Records', 'Locked Periods', 'Overtime Logs'],
      lastRefresh: '2024-01-24 10:30 AM'
    },
    {
      id: 'leave',
      icon: Calendar,
      scope: t.hrPlanning,
      dataSources: ['Leave Requests', 'Leave Balances', 'Leave Policy'],
      lastRefresh: '2024-01-24 10:30 AM'
    },
    {
      id: 'recruitment',
      icon: UserPlus,
      scope: t.hiringEffectiveness,
      dataSources: ['Vacancies', 'Applications', 'Shortlists', 'Selections'],
      lastRefresh: '2024-01-24 10:30 AM'
    },
    {
      id: 'compliance',
      icon: Shield,
      scope: t.auditGovernance,
      dataSources: ['All HR Modules', 'System Logs', 'Audit Trail'],
      lastRefresh: '2024-01-24 10:30 AM'
    }
  ];

  const handleExportExcel = () => {
    alert(language === 'en' 
      ? 'Exporting to Excel...' 
      : 'تصدير إلى Excel...'
    );
  };

  const handlePrintReport = () => {
    alert(language === 'en' 
      ? 'Preparing PDF for print...' 
      : 'إعداد PDF للطباعة...'
    );
  };

  const renderLandingView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {analyticsCards.map(card => {
        const Icon = card.icon;
        return (
          <div 
            key={card.id}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => setActiveView(card.id)}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Icon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {card.id === 'workforce' && t.workforceAnalytics}
                  {card.id === 'payroll' && t.payrollCostAnalytics}
                  {card.id === 'attendance' && t.attendanceAnalytics}
                  {card.id === 'leave' && t.leaveAnalytics}
                  {card.id === 'recruitment' && t.recruitmentAnalytics}
                  {card.id === 'compliance' && t.complianceRiskAnalytics}
                </h3>
                <p className="text-sm text-gray-600">{card.scope}</p>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">{t.dataSources}</p>
                <div className="flex flex-wrap gap-1">
                  {card.dataSources.map((source, idx) => (
                    <span 
                      key={idx}
                      className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                    >
                      {source}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <RefreshCw className="w-3 h-3" />
                <span>{t.lastRefresh}: {card.lastRefresh}</span>
              </div>
            </div>

            <button className="w-full py-2 px-4 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium">
              {t.viewAnalytics}
            </button>
          </div>
        );
      })}
    </div>
  );

  const renderFilterBar = () => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-gray-600" />
        <h3 className="font-medium text-gray-900">{t.filters}</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t.from}</label>
          <input 
            type="date" 
            value={dateRange.from}
            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t.to}</label>
          <input 
            type="date" 
            value={dateRange.to}
            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t.department}</label>
          <select 
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">{t.all}</option>
            <option value="programs">Programs</option>
            <option value="operations">Operations</option>
            <option value="finance">Finance</option>
            <option value="hr">Human Resources</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t.project}</label>
          <select 
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">{t.all}</option>
            <option value="wash">WASH Program</option>
            <option value="health">Health Services</option>
            <option value="education">Education Support</option>
          </select>
        </div>
      </div>
      
      <div className="flex gap-3 mt-4">
        <button 
          onClick={handleExportExcel}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
        >
          <Download className="w-4 h-4" />
          {t.exportExcel}
        </button>
        <button 
          onClick={handlePrintReport}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
        >
          <Printer className="w-4 h-4" />
          {t.printReport}
        </button>
      </div>
    </div>
  );

  const renderWorkforceAnalytics = () => (
    <div className="space-y-6">
      {renderFilterBar()}
      
      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 mb-1">{t.active}</p>
          <p className="text-3xl font-bold text-blue-900">8</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-600 mb-1">{t.archived}</p>
          <p className="text-3xl font-bold text-amber-900">0</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">{t.exited}</p>
          <p className="text-3xl font-bold text-gray-900">0</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 mb-1">{t.total}</p>
          <p className="text-3xl font-bold text-green-900">8</p>
        </div>
      </div>

      {/* Headcount by Department */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">{t.headcountByDepartment}</h3>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.department}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.count}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.percentage}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr><td className="px-4 py-3 text-sm">Programs</td><td className="px-4 py-3 text-sm font-medium">2</td><td className="px-4 py-3 text-sm">25.0%</td></tr>
            <tr><td className="px-4 py-3 text-sm">MEAL</td><td className="px-4 py-3 text-sm font-medium">1</td><td className="px-4 py-3 text-sm">12.5%</td></tr>
            <tr><td className="px-4 py-3 text-sm">Operations</td><td className="px-4 py-3 text-sm font-medium">3</td><td className="px-4 py-3 text-sm">37.5%</td></tr>
            <tr><td className="px-4 py-3 text-sm">Finance</td><td className="px-4 py-3 text-sm font-medium">1</td><td className="px-4 py-3 text-sm">12.5%</td></tr>
            <tr><td className="px-4 py-3 text-sm">Human Resources</td><td className="px-4 py-3 text-sm font-medium">1</td><td className="px-4 py-3 text-sm">12.5%</td></tr>
          </tbody>
        </table>
      </div>

      {/* Gender Distribution */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">{t.genderDistribution}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <p className="text-sm text-blue-600 mb-2">{t.male}</p>
            <p className="text-4xl font-bold text-blue-900">4</p>
            <p className="text-sm text-blue-700 mt-1">50.0%</p>
          </div>
          <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 text-center">
            <p className="text-sm text-pink-600 mb-2">{t.female}</p>
            <p className="text-4xl font-bold text-pink-900">4</p>
            <p className="text-sm text-pink-700 mt-1">50.0%</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPayrollAnalytics = () => (
    <div className="space-y-6">
      {renderFilterBar()}
      
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">{t.payrollCostByMonth}</h3>
        <div className="h-64 flex items-center justify-center border border-gray-200 rounded-lg bg-gray-50">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">{language === 'en' ? 'Chart visualization would appear here' : 'سيظهر هنا رسم بياني'}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">{t.payrollByProject}</h3>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.project}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.count}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.amount}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr><td className="px-4 py-3 text-sm">WASH Program</td><td className="px-4 py-3 text-sm">3</td><td className="px-4 py-3 text-sm font-medium">$12,500</td></tr>
            <tr><td className="px-4 py-3 text-sm">Health Services</td><td className="px-4 py-3 text-sm">2</td><td className="px-4 py-3 text-sm font-medium">$8,200</td></tr>
            <tr><td className="px-4 py-3 text-sm">Education Support</td><td className="px-4 py-3 text-sm">3</td><td className="px-4 py-3 text-sm font-medium">$10,800</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAttendanceAnalytics = () => (
    <div className="space-y-6">
      {renderFilterBar()}
      
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">{t.attendanceRate}</h3>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.department}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{language === 'en' ? 'Rate' : 'المعدل'}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{language === 'en' ? 'Late Arrivals' : 'التأخيرات'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr><td className="px-4 py-3 text-sm">Programs</td><td className="px-4 py-3 text-sm font-medium text-green-600">98.5%</td><td className="px-4 py-3 text-sm">2</td></tr>
            <tr><td className="px-4 py-3 text-sm">Operations</td><td className="px-4 py-3 text-sm font-medium text-green-600">99.2%</td><td className="px-4 py-3 text-sm">1</td></tr>
            <tr><td className="px-4 py-3 text-sm">Finance</td><td className="px-4 py-3 text-sm font-medium text-green-600">100%</td><td className="px-4 py-3 text-sm">0</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderLeaveAnalytics = () => (
    <div className="space-y-6">
      {renderFilterBar()}
      
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">{t.leaveBalances}</h3>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{language === 'en' ? 'Leave Type' : 'نوع الإجازة'}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{language === 'en' ? 'Total Allocated' : 'إجمالي المخصص'}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{language === 'en' ? 'Used' : 'المستخدم'}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{language === 'en' ? 'Remaining' : 'المتبقي'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr><td className="px-4 py-3 text-sm">Annual Leave</td><td className="px-4 py-3 text-sm">200</td><td className="px-4 py-3 text-sm">45</td><td className="px-4 py-3 text-sm font-medium text-green-600">155</td></tr>
            <tr><td className="px-4 py-3 text-sm">Sick Leave</td><td className="px-4 py-3 text-sm">80</td><td className="px-4 py-3 text-sm">12</td><td className="px-4 py-3 text-sm font-medium text-green-600">68</td></tr>
            <tr><td className="px-4 py-3 text-sm">Emergency Leave</td><td className="px-4 py-3 text-sm">40</td><td className="px-4 py-3 text-sm">8</td><td className="px-4 py-3 text-sm font-medium text-green-600">32</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderRecruitmentAnalytics = () => (
    <div className="space-y-6">
      {renderFilterBar()}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">{t.timeToHire}</p>
          <p className="text-3xl font-bold text-gray-900">42 {language === 'en' ? 'days' : 'يوم'}</p>
          <p className="text-xs text-gray-500 mt-1">{t.average}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">{t.candidatesPerVacancy}</p>
          <p className="text-3xl font-bold text-gray-900">18</p>
          <p className="text-xs text-gray-500 mt-1">{t.average}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">{language === 'en' ? 'Selection Rate' : 'معدل الاختيار'}</p>
          <p className="text-3xl font-bold text-gray-900">5.6%</p>
          <p className="text-xs text-gray-500 mt-1">{t.average}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">{t.vacancyAging}</h3>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{language === 'en' ? 'Position' : 'المنصب'}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{language === 'en' ? 'Days Open' : 'أيام مفتوحة'}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{language === 'en' ? 'Applications' : 'الطلبات'}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{language === 'en' ? 'Status' : 'الحالة'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="px-4 py-3 text-sm">Program Officer</td>
              <td className="px-4 py-3 text-sm">28</td>
              <td className="px-4 py-3 text-sm">15</td>
              <td className="px-4 py-3 text-sm"><span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs">In Progress</span></td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm">Finance Officer</td>
              <td className="px-4 py-3 text-sm">45</td>
              <td className="px-4 py-3 text-sm">22</td>
              <td className="px-4 py-3 text-sm"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">Shortlisting</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderComplianceAnalytics = () => (
    <div className="space-y-6">
      {renderFilterBar()}
      
      {/* Critical Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600 mb-1">{t.contractsExpiring}</p>
          <p className="text-3xl font-bold text-red-900">2</p>
          <p className="text-xs text-red-700 mt-1">{language === 'en' ? 'Within 30 days' : 'خلال 30 يومًا'}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-600 mb-1">{t.missingDocuments}</p>
          <p className="text-3xl font-bold text-amber-900">5</p>
          <p className="text-xs text-amber-700 mt-1">{language === 'en' ? 'Across 3 employees' : 'عبر 3 موظفين'}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm text-orange-600 mb-1">{t.pendingAppraisals}</p>
          <p className="text-3xl font-bold text-orange-900">3</p>
          <p className="text-xs text-orange-700 mt-1">{language === 'en' ? 'Overdue' : 'متأخر'}</p>
        </div>
      </div>

      {/* Contracts Expiring Detail */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">{t.contractsExpiring}</h3>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{language === 'en' ? 'Employee' : 'الموظف'}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{language === 'en' ? 'Position' : 'المنصب'}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{language === 'en' ? 'End Date' : 'تار��خ الانتهاء'}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{language === 'en' ? 'Days Left' : 'الأيام المتبقية'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="px-4 py-3 text-sm">Ahmed Hassan</td>
              <td className="px-4 py-3 text-sm">Program Officer</td>
              <td className="px-4 py-3 text-sm">2024-02-15</td>
              <td className="px-4 py-3 text-sm"><span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-medium">22 days</span></td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm">Fatima Al-Sayed</td>
              <td className="px-4 py-3 text-sm">MEAL Officer</td>
              <td className="px-4 py-3 text-sm">2024-02-28</td>
              <td className="px-4 py-3 text-sm"><span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-medium">35 days</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Disciplinary Cases Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">{t.disciplinaryCases}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">2</p>
            <p className="text-xs text-gray-500">{language === 'en' ? 'Active Cases' : 'حالات نشطة'}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">1</p>
            <p className="text-xs text-gray-500">{language === 'en' ? 'Under Review' : 'قيد المراجعة'}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">8</p>
            <p className="text-xs text-gray-500">{language === 'en' ? 'Resolved (2024)' : 'تم حلها (2024)'}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">0</p>
            <p className="text-xs text-gray-500">{language === 'en' ? 'Escalated' : 'تم تصعيدها'}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Back Button */}
      <button
        onClick={() => activeView === 'landing' ? navigate('/organization/hr') : setActiveView('landing')}
        className={`flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
      >
        <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
        <span>{activeView === 'landing' ? (language === 'en' ? 'Back to HR' : 'العودة إلى الموارد البشرية') : t.backToLanding}</span>
      </button>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
        <p className="text-base text-gray-600 mt-2">{t.subtitle}</p>
      </div>

      {/* Read-Only Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">{t.readOnly}</p>
      </div>

      {/* Content */}
      {activeView === 'landing' && renderLandingView()}
      {activeView === 'workforce' && renderWorkforceAnalytics()}
      {activeView === 'payroll' && renderPayrollAnalytics()}
      {activeView === 'attendance' && renderAttendanceAnalytics()}
      {activeView === 'leave' && renderLeaveAnalytics()}
      {activeView === 'recruitment' && renderRecruitmentAnalytics()}
      {activeView === 'compliance' && renderComplianceAnalytics()}
    </div>
  );
}
