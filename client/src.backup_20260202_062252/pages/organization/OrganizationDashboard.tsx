// ============================================================================
// ORGANIZATION DASHBOARD
// Operational overview for Organization users
// Integrated Management System (IMS)
// ============================================================================

import { Briefcase, Users, Wallet, Target, TrendingUp, AlertCircle, FileText, ChevronRight, ChevronLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';
import { trpc } from '@/lib/trpc';

export default function OrganizationDashboard() {
  const { language, direction } = useLanguage();
  const isRTL = direction === 'rtl';
  const { currentOrganizationId, userOrganizations } = useOrganization();
  const { currentOperatingUnitId, userOperatingUnits } = useOperatingUnit();
  
  // Get current organization and operating unit from lists
  const currentOrganization = userOrganizations?.find(o => o.organizationId === currentOrganizationId);
  const currentOperatingUnit = userOperatingUnits?.find(ou => ou.id === currentOperatingUnitId);

  // Fetch real KPIs from backend (enforces data isolation)
  const { data: projectKPIs, isLoading: projectKPIsLoading } = trpc.projects.getDashboardKPIs.useQuery(
    {
      organizationId: currentOrganizationId!,
      operatingUnitId: currentOperatingUnitId!,
    },
    {
      enabled: !!currentOrganizationId && !!currentOperatingUnitId,
      refetchOnWindowFocus: false,
    }
  );

  const { data: grantsKPIs, isLoading: grantsKPIsLoading } = trpc.grants.getDashboardKPIs.useQuery(
    {
      organizationId: currentOrganizationId!,
      operatingUnitId: currentOperatingUnitId!,
    },
    {
      enabled: !!currentOrganizationId && !!currentOperatingUnitId,
      refetchOnWindowFocus: false,
    }
  );

  // Format currency
  const formatCurrency = (amount: number) => {
    if (amount >= 1_000_000) {
      return `$${(amount / 1_000_000).toFixed(1)}M`;
    } else if (amount >= 1_000) {
      return `$${(amount / 1_000).toFixed(1)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  const kpis = [
    { 
      label: 'Active Projects', 
      labelAr: 'المشاريع النشطة', 
      value: projectKPIsLoading ? '...' : (projectKPIs?.activePrograms?.toString() || '0'), 
      icon: Briefcase, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50' 
    },
    { 
      label: 'Total Employees', 
      labelAr: 'إجمالي الموظفين', 
      value: '156', // TODO: Add employee KPI endpoint
      icon: Users, 
      color: 'text-indigo-600', 
      bg: 'bg-indigo-50' 
    },
    { 
      label: 'Total Budget', 
      labelAr: 'إجمالي الميزانية', 
      value: projectKPIsLoading ? '...' : formatCurrency(projectKPIs?.totalBudgetUSD || 0), 
      icon: Wallet, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50' 
    },
    { 
      label: 'Grant Execution', 
      labelAr: 'تنفيذ المنح', 
      value: projectKPIsLoading ? '...' : `${Math.round(projectKPIs?.avgCompletionRate || 0)}%`, 
      icon: Target, 
      color: 'text-orange-600', 
      bg: 'bg-orange-50' 
    },
  ];

  const t = {
    en: {
      operatingUnitContext: 'Operating Unit Context',
      compliance: 'Project Compliance',
      activeGrants: 'Active Grants',
      complianceAlerts: 'Compliance Alerts',
      itemsRequiringAttention: 'Items requiring attention',
      highPriority: 'HIGH PRIORITY',
      mediumPriority: 'MEDIUM PRIORITY',
      daysAgo: 'days ago',
      quarterlyReportOverdue: 'Quarterly Report Overdue',
      quarterlyReportDesc: 'Grant #G2024-042 quarterly report pending',
      budgetRevisionNeeded: 'Budget Revision Needed',
      budgetRevisionDesc: 'Project Water & Sanitation budget variance exceeds 10%',
      projectPipelineStatus: 'Project Pipeline Status',
      activeProjectProgress: 'Active project progress',
      viewAll: 'View All',
      onTrack: 'On Track',
      needsReview: 'Needs Review',
      waterSanitation: 'Water & Sanitation - Phase 2',
      waterSanitationDesc: 'Community water access and sanitation facilities',
      educationSupport: 'Education Support Program',
      educationSupportDesc: 'School infrastructure and teacher training',
      healthClinics: 'Mobile Health Clinics',
      healthClinicsDesc: 'Primary healthcare delivery in remote areas',
      acrossAllPrograms: 'Across all programs',
      fullTimeStaff: 'Full-time staff',
      allocatedFunds: 'Allocated funds',
      onTrackStatus: 'On Track'
    },
    ar: {
      operatingUnitContext: 'سياق وحدة التشغيل',
      compliance: 'الامتثال للمشروع',
      activeGrants: 'المنح النشطة',
      complianceAlerts: 'تنبيهات الامتثال',
      itemsRequiringAttention: 'العناصر التي تتطلب الاهتمام',
      highPriority: 'أولوية عالية',
      mediumPriority: 'أولوية متوسطة',
      daysAgo: 'منذ أيام',
      quarterlyReportOverdue: 'تأخر التقرير الفصلي',
      quarterlyReportDesc: 'التقرير الفصلي للمنحة #G2024-042 معلق',
      budgetRevisionNeeded: 'مطلوب مراجعة الميزانية',
      budgetRevisionDesc: 'تباين ميزانية مشروع المياه والصرف الصحي يتجاوز 10%',
      projectPipelineStatus: 'حالة مشاريع القيد',
      activeProjectProgress: 'تقدم المشاريع النشطة',
      viewAll: 'عرض الكل',
      onTrack: 'على المسار الصحيح',
      needsReview: 'يحتاج إلى مراجعة',
      waterSanitation: 'المياه والصرف الصحي - المرحلة 2',
      waterSanitationDesc: 'الوصول إلى المياه المجتمعية ومرافق الصرف الصحي',
      educationSupport: 'برنامج دعم التعليم',
      educationSupportDesc: 'البنية التحتية المدرسية وتدريب المعلمين',
      healthClinics: 'العيادات الصحية المتنقلة',
      healthClinicsDesc: 'تقديم الرعاية الصحية الأولية في المناطق النائية',
      acrossAllPrograms: 'عبر جميع البرامج',
      fullTimeStaff: 'موظفون بدوام كامل',
      allocatedFunds: 'الأموال المخصصة',
      onTrackStatus: 'على المسار الصحيح'
    }
  };

  const translations = language === 'en' ? t.en : t.ar;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Context Banner (Phase 0 Spec 3 & 4) */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-sm">
                {translations.operatingUnitContext}
              </span>
              <span className="bg-green-400 w-2 h-2 rounded-full animate-pulse" />
            </div>
            <h1 className="text-4xl font-black tracking-tight">
              {currentOrganization?.organizationName || 'IMS Foundation'}
            </h1>
            <p className="text-blue-100 font-bold text-lg flex items-center gap-2">
              {currentOperatingUnit?.name || 'Headquarters'}
              <span className="opacity-50">•</span>
              {currentOperatingUnit?.country || 'Yemen'}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10 flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-black">94%</div>
              <div className="text-[10px] uppercase font-black tracking-wider opacity-70">{translations.compliance}</div>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center">
              <div className="text-2xl font-black">12</div>
              <div className="text-[10px] uppercase font-black tracking-wider opacity-70">{translations.activeGrants}</div>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20" />
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
            <div className={`w-12 h-12 ${kpi.bg} ${kpi.color} rounded-xl flex items-center justify-center mb-4 group-hover:rotate-6 transition-transform`}>
              <kpi.icon className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">
              {language === 'en' ? kpi.label : kpi.labelAr}
            </div>
            <div className="text-3xl font-black text-gray-900 mt-1">{kpi.value}</div>
            <div className="text-xs text-gray-500 mt-1">
              {idx === 0 && translations.acrossAllPrograms}
              {idx === 1 && translations.fullTimeStaff}
              {idx === 2 && translations.allocatedFunds}
              {idx === 3 && translations.onTrackStatus}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Alerts & Notifications */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              {translations.complianceAlerts}
            </h3>
            <p className="text-xs text-gray-500 mb-4">{translations.itemsRequiringAttention}</p>
            <div className="space-y-4">
              {[
                { title: translations.quarterlyReportOverdue, desc: translations.quarterlyReportDesc, date: '2', priority: 'High' },
                { title: translations.budgetRevisionNeeded, desc: translations.budgetRevisionDesc, date: '5', priority: 'Medium' },
              ].map((alert, i) => (
                <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${alert.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {alert.priority === 'High' ? translations.highPriority : translations.mediumPriority}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400">
                      {language === 'en' ? `${alert.date} ${translations.daysAgo}` : `${translations.daysAgo} ${alert.date}`}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-gray-900 mb-1">{alert.title}</div>
                  <div className="text-xs text-gray-600">{alert.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Operational Highlights */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-lg font-black text-gray-900">
              {translations.projectPipelineStatus}
            </h3>
            <button className="text-blue-600 text-sm font-bold hover:underline flex items-center gap-1">
              {translations.viewAll}
              {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
          <div className="p-6">
            <p className="text-xs text-gray-500 mb-6">{translations.activeProjectProgress}</p>
            <div className="space-y-8">
              {[
                { name: translations.waterSanitation, desc: translations.waterSanitationDesc, progress: 85, budget: '$1.2M', status: translations.onTrack, statusColor: 'text-green-600', bgColor: 'bg-green-50' },
                { name: translations.educationSupport, desc: translations.educationSupportDesc, progress: 62, budget: '$850K', status: translations.onTrack, statusColor: 'text-blue-600', bgColor: 'bg-blue-50' },
                { name: translations.healthClinics, desc: translations.healthClinicsDesc, progress: 45, budget: '$620K', status: translations.onTrack, statusColor: 'text-blue-600', bgColor: 'bg-blue-50' },
              ].map((project, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-gray-900">{project.name}</div>
                      <div className="text-xs text-gray-500 font-medium mt-1">{project.desc}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500">{project.budget}</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${project.bgColor} ${project.statusColor}`}>
                          {project.status}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-black text-gray-700">{project.progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${project.progress > 80 ? 'bg-emerald-500' : project.progress > 50 ? 'bg-blue-500' : 'bg-amber-500'}`} 
                      style={{ width: `${project.progress}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
