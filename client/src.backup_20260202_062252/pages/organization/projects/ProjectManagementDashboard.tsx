// ============================================================================
// PROJECT MANAGEMENT DASHBOARD
// Comprehensive overview of all projects, budgets, and performance metrics
// Integrated Management System (IMS)
// ============================================================================

import { 
  DollarSign, 
  Calendar, 
  FileText,
  Loader2
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';
import { trpc } from '@/lib/trpc';
import { Link } from 'wouter';
import { RecentActivityFeed } from '@/components/RecentActivityFeed';

export default function ProjectManagementDashboard() {
  const { language, direction } = useLanguage();
  const isRTL = direction === 'rtl';
  const { currentOrganizationId } = useOrganization();
  const { currentOperatingUnitId } = useOperatingUnit();
  
  // Project CRUD operations moved to /organization/projects-list

  // Get reporting schedules count
  const { data: reportingSchedulesCount = 0 } = trpc.reportingSchedules.getCount.useQuery({
    organizationId: currentOrganizationId || 1,
    operatingUnitId: currentOperatingUnitId || 1,
  }, {
    enabled: !!currentOrganizationId && !!currentOperatingUnitId,
  });

  const { data: kpis, isLoading: kpisLoading } = trpc.projects.getDashboardKPIs.useQuery(
    { 
      organizationId: currentOrganizationId || 1,
      operatingUnitId: currentOperatingUnitId || 1,
    },
    { enabled: !!currentOrganizationId && !!currentOperatingUnitId }
  );

  // All project CRUD handlers moved to /organization/projects-list

  const t = {
    en: {
      title: 'Projects Workspace',
      subtitle: 'Comprehensive overview of all projects, budgets, and performance metrics',
      projectsManagement: 'Active Projects',
      projectsManagementDesc: 'Day-to-day project operations',
      projectsManagementLink: 'Open Projects →',
      reportingSchedule: 'Project Reporting Schedule',
      reportingScheduleValue: '2',
      reportingScheduleDesc: 'Active',
      reportingScheduleSubdesc: 'View active reporting timelines',
      reportingScheduleLink: 'Click to view Reporting Schedule →',
      proposalPipeline: 'Proposal & Pipeline',
      proposalPipelineValue: '8',
      proposalPipelineDesc: 'Opportunities',
      proposalPipelineSubdesc: 'Track funding opportunities and proposals',
      proposalPipelineLink: 'Click to view Proposal Pipeline →',
      annualReport: 'Annual Programs Report',
      annualReportValue: '',
      annualReportDesc: 'Strategic Annual Report',
      annualReportSubdesc: 'Comprehensive visual report on achievements, performance and annual planning',
      annualReportLink: 'Click to view Annual Report →',
      portfolioHealth: 'Portfolio Health',
      performance: 'Performance',
      compliance: 'Compliance',
      totalBudget: 'Total Budget',
      actualSpent: 'Total Spent',
      balance: 'Balance',
      avgCompletionRate: 'Avg. Completion Rate',
      projectsOnTrack: 'On Track / At Risk',
      reportingComplianceRate: 'Reporting Compliance Rate',
      pendingApprovals: 'Pending Approvals',
      projectList: 'Project List',
      exportExcel: 'Export Excel',
      importExcel: 'Import Excel',
      addNewProject: 'Add New Project',
      searchByTitle: 'Search by Title',
      all: 'All',
      ongoing: 'Ongoing',
      planned: 'Planned',
      completed: 'Completed',
      notStarted: 'Not Started',
      projectCode: 'Project Code',
      budgetUtilization: 'Budget Utilization',
      startDate: 'Start Date',
      endDate: 'End Date',
      daysRemaining: 'Days Remaining',
      days: 'days',
      expired: 'Expired',
      donor: 'Donor',
      totalBudgetLabel: 'Total Budget',
      currency: 'Currency',
      spent: 'Spent',
      sectors: 'Sectors',
      viewDetails: 'View Details',
      update: 'Update',
      deleteProject: 'Delete Project',
      loading: 'Loading...',
      noProjects: 'No projects found',
      deleteConfirmTitle: 'Delete Project?',
      deleteConfirmDesc: 'Are you sure you want to delete this project? This action cannot be undone.',
    },
    ar: {
      title: 'لوحة إدارة المشاريع',
      subtitle: 'نظرة شاملة على جميع المشاريع والميزانيات ومقاييس الأداء',
      projectsManagement: 'المشاريع النشطة',
      projectsManagementDesc: 'عمليات المشروع اليومية',
      projectsManagementLink: 'فتح المشاريع ←',
      reportingSchedule: 'جدول تقارير المشروع',
      reportingScheduleValue: '2',
      reportingScheduleDesc: 'نشط',
      reportingScheduleSubdesc: 'عرض الجداول الزمنية للتقارير النشطة',
      reportingScheduleLink: 'انقر لعرض جدول التقارير ←',
      proposalPipeline: 'المقترحات والفرص',
      proposalPipelineValue: '8',
      proposalPipelineDesc: 'فرص',
      proposalPipelineSubdesc: 'تتبع فرص التمويل والمقترحات',
      proposalPipelineLink: 'انقر لعرض خط المقترحات ←',
      annualReport: 'تقرير البرامج السنوي',
      annualReportValue: '',
      annualReportDesc: 'التقرير الاستراتيجي السنوي',
      annualReportSubdesc: 'تقرير مرئي شامل عن الإنجازات والأداء والتخطيط السنوي',
      annualReportLink: 'انقر لعرض التقرير السنوي ←',
      portfolioHealth: 'صحة المحفظة',
      performance: 'الأداء',
      compliance: 'الامتثال',
      totalBudget: 'إجمالي الميزانية',
      actualSpent: 'إجمالي المصروف',
      balance: 'الرصيد',
      avgCompletionRate: 'متوسط معدل الإنجاز',
      projectsOnTrack: 'على المسار / معرض للخطر',
      reportingComplianceRate: 'معدل الامتثال للتقارير',
      pendingApprovals: 'الموافقات المعلقة',
      projectList: 'قائمة المشاريع',
      exportExcel: 'تصدير إكسل',
      importExcel: 'استيراد إكسل',
      addNewProject: 'إضافة مشروع جديد',
      searchByTitle: 'البحث بالعنوان',
      all: 'الكل',
      ongoing: 'جاري',
      planned: 'مخطط',
      completed: 'مكتمل',
      notStarted: 'لم يبدأ',
      projectCode: 'رمز المشروع',
      budgetUtilization: 'استخدام الميزانية',
      startDate: 'تاريخ البدء',
      endDate: 'تاريخ الانتهاء',
      daysRemaining: 'الأيام المتبقية',
      days: 'يوم',
      expired: 'منتهي',
      donor: 'الجهة المانحة',
      totalBudgetLabel: 'إجمالي الميزانية',
      currency: 'العملة',
      spent: 'المصروف',
      sectors: 'القطاعات',
      viewDetails: 'عرض التفاصيل',
      update: 'تحديث',
      deleteProject: 'حذف المشروع',
      loading: 'جاري التحميل...',
      noProjects: 'لم يتم العثور على مشاريع',
      deleteConfirmTitle: 'حذف المشروع؟',
      deleteConfirmDesc: 'هل أنت متأكد من حذف هذا المشروع؟ لا يمكن التراجع عن هذا الإجراء.',
    }
  };

  const translations = language === 'en' ? t.en : t.ar;

  if (!currentOrganizationId) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-gray-500">Please select an organization to view projects.</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{translations.title}</h1>
        <p className="text-sm text-gray-600 mt-1">{translations.subtitle}</p>
      </div>

      {/* Top 5 Primary Cards - Cards Grid Landing View */}
      {/* Top Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {/* 1. Projects Management (CORE CARD) */}
        <Link href="/organization/projects-list">
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{kpis?.totalProjects || 0}</div>
          </div>
          <div className="text-sm font-semibold text-gray-900 mb-1">{translations.projectsManagement}</div>
          <div className="text-xs text-gray-600 mb-2">{translations.projectsManagementDesc}</div>
          <div className="text-xs text-indigo-600 font-medium">{translations.projectsManagementLink}</div>
          </div>
        </Link>

        {/* 2. Project Reporting Schedule */}
        <Link href="/organization/reporting-schedule">
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">{reportingSchedulesCount}</div>
            </div>
            <div className="text-sm font-semibold text-gray-900 mb-1">{translations.reportingSchedule}</div>
            <div className="text-xs text-gray-600 mb-2">{translations.reportingScheduleDesc}</div>
            <div className="text-xs text-purple-600 font-medium">{translations.reportingScheduleLink}</div>
          </div>
        </Link>

        {/* 5. Annual Programs Report */}
        <Link href="/organization/annual-report">
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              {translations.annualReportValue && (
                <div className="text-3xl font-bold text-gray-900">{translations.annualReportValue}</div>
              )}
            </div>
            <div className="text-sm font-semibold text-gray-900 mb-1">{translations.annualReport}</div>
            <div className="text-xs text-gray-600 mb-2">{translations.annualReportDesc}</div>
            <div className="text-xs text-green-600 font-medium">{translations.annualReportLink}</div>
          </div>
        </Link>
      </div>

      {/* KPIs Row - Portfolio Health, Performance, Compliance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpisLoading ? (
          <div className="flex items-center justify-center col-span-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {/* Portfolio Health - Equal width with Performance */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">{translations.portfolioHealth}</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-2 h-8">{translations.totalBudget}</div>
                  <div className="text-2xl font-bold text-gray-900">
                    ${((kpis?.totalBudgetUSD || 0) / 1000000).toFixed(1)}M
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-2 h-8">{translations.actualSpent}</div>
                  <div className="text-2xl font-bold text-gray-900">
                    ${((kpis?.actualSpentUSD || 0) / 1000000).toFixed(1)}M
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-2 h-8">{translations.balance}</div>
                  <div className="text-2xl font-bold text-gray-900">
                    ${((kpis?.balanceUSD || 0) / 1000000).toFixed(1)}M
                  </div>
                </div>
              </div>
            </div>

            {/* Performance */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">{translations.performance}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-2 h-8">{translations.avgCompletionRate}</div>
                  <div className="text-2xl font-bold text-gray-900">{(kpis?.avgCompletionRate || 0).toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-2 h-8">{translations.projectsOnTrack}</div>
                  <div className="text-2xl font-bold text-gray-900">
                    <span className="text-green-600">{kpis?.projectsOnTrack || 0}</span>
                    {' / '}
                    <span className="text-red-600">{kpis?.projectsAtRisk || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Compliance */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">{translations.compliance}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-2 h-8">{translations.reportingComplianceRate}</div>
                  <div className="text-2xl font-bold text-gray-900">{(kpis?.reportingComplianceRate || 0).toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-2 h-8">{translations.pendingApprovals}</div>
                  <div className="text-2xl font-bold text-gray-900">{kpis?.pendingApprovals || 0}</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Recent Activity Feed */}
      <div className="mt-8">
        <RecentActivityFeed limit={20} autoRefresh={true} refreshInterval={30000} />
      </div>

      {/* Project List moved to /organization/projects-list */}
      {/* Use the Projects Management card to navigate to the full project list */}


      {/* Project CRUD modals moved to /organization/projects-list */}
    </div>
  );
}
