import { Link } from 'wouter';
/**
 * ============================================================================
 * HR MODULE LAUNCHER - INTERACTIVE CARDS GRID
 * ============================================================================
 * 
 * PURPOSE:
 * - Replace horizontal scrolling tabs with scalable card-based navigation
 * - Clear visibility of all HR modules (implemented + coming soon)
 * - Better UX for non-technical HR staff
 * - Status badges for module maturity
 * 
 * FEATURES:
 * ✅ Responsive grid (3-4 cols desktop, 2 tablet, 1 mobile)
 * ✅ Status badges (Active / Not Yet Implemented / Restricted)
 * ✅ Bilingual (EN/AR with RTL)
 * ✅ Module icons, names, descriptions
 * ✅ Click to navigate to active modules
 * ✅ Disabled state for not-yet-implemented modules
 * 
 * ============================================================================
 */

import { useNavigate } from '@/lib/router-compat';
import {
 Users,
 DollarSign,
 Wallet,
 FileText,
 Calendar,
 GraduationCap,
 FolderOpen,
 BarChart3,
 Settings,
 UserCheck,
 Clock,
 Award,
 Shield,
 Building2,
 AlertTriangle,
 ClipboardList
, ArrowLeft, ArrowRight} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

interface HRModule {
 id: string;
 name: { en: string; ar: string };
 description: { en: string; ar: string };
 icon: any;
 path: string;
 status: 'active' | 'not-implemented' | 'restricted';
 badge?: { en: string; ar: string };
}

export function HRModuleLauncher() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const navigate = useNavigate();

 const labels = {
 title: t.hr.humanResourcesManagement,
 subtitle: t.hr.hrModuleSubtitle,
 
 // Status badges
 active: t.hr.active,
 notImplemented: t.hr.notYetImplemented,
 restricted: t.hr.restrictedAccess,
 comingSoon: t.hr.comingSoon2,
 
 // Tooltips
 clickToOpen: t.hr.clickToOpenModule,
 underDevelopment: t.hr.moduleUnderDevelopment,
 noAccess: t.hr.youDoNotHaveAccessTo,
 };

 const modules: HRModule[] = [
 {
 id: 'overview',
 name: { en: 'HR Overview', ar: 'نظرة عامة على الموارد البشرية' },
 description: { en: 'Dashboard with key HR metrics and statistics', ar: 'وحة تحكم مع مؤشرات وإحصاءات الموارد البشرية' },
 icon: BarChart3,
 path: '/organization/hr/overview',
 status: 'active'
 },
 {
 id: 'staff-dictionary',
 name: { en: 'Staff Dictionary', ar: 'سجل الموظفين' },
 description: { en: 'Complete staff registry with profiles and data', ar: 'سجل كامل للموظفين مع الملفات الشخصية والبيانات' },
 icon: Users,
 path: '/organization/hr/staff-dictionary',
 status: 'active'
 },
 {
 id: 'salary-scale',
 name: { en: 'Salary Scale', ar: 'سلم الرواتب' },
 description: { en: 'Grade-based salary structure and approvals', ar: 'هيكل الرواتب القائم على الدرجات والموافقات' },
 icon: DollarSign,
 path: '/organization/hr/salary-scale',
 status: 'active'
 },
 {
 id: 'payroll',
 name: { en: 'Payroll & Allowances', ar: 'الرواتب والبدلات' },
 description: { en: 'Monthly payroll sheets and salary processing', ar: 'كشوف الرواتب الشهرية ومعالجة الأجور' },
 icon: Wallet,
 path: '/organization/hr/payroll',
 status: 'active'
 },
 {
 id: 'contracts',
 name: { en: 'Employees Profiles', ar: 'ملفات الموظفين' },
 description: { en: 'Complete employee lifecycle management from hire to exit', ar: 'إدارة دورة حياة الموظف الكاملة من التوظيف حتى المغادرة' },
 icon: UserCheck,
 path: '/organization/hr/employees-profiles',
 status: 'active'
 },
 {
 id: 'sanctions',
 name: { en: 'Sanctions & Disciplinary', ar: 'العقوبات والإجراءات التأديبية' },
 description: { en: 'Complete disciplinary case management from allegation to closure', ar: 'إدارة القضايا التأديبية الكاملة من الادعاء إلى الإغلاق' },
 icon: AlertTriangle,
 path: '/organization/hr/sanctions',
 status: 'active'
 },
 {
 id: 'leave',
 name: { en: 'Leave Management', ar: 'إدارة الإجازات' },
 description: { en: 'Leave requests, approvals, and balances', ar: 'طلبات الإجازات والموافقات والأرصدة' },
 icon: Calendar,
 path: '/organization/hr/leave',
 status: 'active'
 },
 {
 id: 'attendance',
 name: { en: 'Attendance & Time', ar: 'الحضور والوقت' },
 description: { en: 'Time tracking, attendance, and work hours', ar: 'تتبع الوقت والحضور وساعات العمل' },
 icon: Clock,
 path: '/organization/hr/attendance',
 status: 'active'
 },
 {
 id: 'recruitment',
 name: { en: 'Recruitment', ar: 'التوظيف' },
 description: { en: 'Job postings, applicants, and hiring process', ar: 'إعلانات الوظائف والمتقدمين وعملية التوظيف' },
 icon: UserCheck,
 path: '/organization/hr/recruitment',
 status: 'active'
 },
 {
 id: 'annual-plan',
 name: { en: 'HR Annual Plan', ar: 'الخطة السنوية للموارد البشرية' },
 description: { en: 'Strategic workforce planning, recruitment forecasting, and budget estimation', ar: 'التخطيط الاستراتيجي للقوى العاملة والتنبؤ بالتوظيف وتقدير الميزانية' },
 icon: ClipboardList,
 path: '/organization/hr/annual-plan',
 status: 'active'
 },
 {
 id: 'documents',
 name: { en: 'HR Documents', ar: 'مستندات الموارد البشرية' },
 description: { en: 'Policies, templates, and HR documentation', ar: 'السياسات والنماذج ووثائق الموارد البشرية' },
 icon: FolderOpen,
 path: '/organization/hr/documents',
 status: 'active'
 },
 {
 id: 'reports',
 name: { en: 'Reports & Analytics', ar: 'التقارير والتحليلات' },
 description: { en: 'Management and audit-ready HR insights', ar: 'رؤى الموارد البشرية الإدارية وجاهزة للتدقيق' },
 icon: BarChart3,
 path: '/organization/hr/reports',
 status: 'active'
 },
 {
 id: 'settings',
 name: { en: 'HR Settings', ar: 'إعدادات الموارد البشرية' },
 description: { en: 'Configure HR policies, rules, and preferences', ar: 'تكوين سياسات وقواعد وتفضيلات الموارد البشرية' },
 icon: Settings,
 path: '/organization/hr/settings',
 status: 'active'
 }
 ];

 const handleModuleClick = (module: HRModule) => {
 if (module.status === 'active') {
 navigate(module.path);
 }
 };

 const getStatusBadge = (module: HRModule) => {
 switch (module.status) {
 case 'active':
 return (
 <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
 ✅ {labels.active}
 </span>
 );
 case 'not-implemented':
 return (
 <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
 ⏳ {module.badge ? module.badge[language] : labels.notImplemented}
 </span>
 );
 case 'restricted':
 return (
 <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
 🔒 {labels.restricted}
 </span>
 );
 default:
 return null;
 }
 };

 const getCardClasses = (module: HRModule) => {
 const baseClasses = "bg-white rounded-lg border-2 p-6 transition-all duration-200";
 
 if (module.status === 'active') {
 return `${baseClasses} border-gray-200 hover:border-blue-500 hover:shadow-lg cursor-pointer`;
 } else {
 return `${baseClasses} border-gray-200 opacity-60 cursor-not-allowed`;
 }
 };

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Back Button */}
 <BackButton href="/organization" label={t.hr.organizationDashboard} />
 
 {/* Header */}
 <div className={'text-start'}>
 <h1 className="text-3xl font-bold text-gray-900">{labels.title}</h1>
 <p className="text-base text-gray-600 mt-2">{labels.subtitle}</p>
 </div>

 {/* Module Cards Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
 {modules.map((module) => {
 const Icon = module.icon;
 
 return (
 <div
 key={module.id}
 onClick={() => handleModuleClick(module)}
 className={getCardClasses(module)}
 title={
 module.status === 'active' 
 ? labels.clickToOpen 
 : module.status === 'restricted' 
 ? labels.noAccess 
 : labels.underDevelopment
 }
 >
 {/* Icon and Status Badge */}
 <div className="flex items-start justify-between mb-4">
 <div className={`p-3 rounded-lg ${ module.status === 'active' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400' }`}>
 <Icon className="w-6 h-6" />
 </div>
 <div>{getStatusBadge(module)}</div>
 </div>

 {/* Module Name */}
 <h3 className={`text-lg font-semibold text-gray-900 mb-2 text-start`}>
 {module.name[language]}
 </h3>

 {/* Module Description */}
 <p className={`text-sm text-gray-600 text-start`}>
 {module.description[language]}
 </p>

 {/* Active indicator */}
 {module.status === 'active' && (
 <div className={`mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-sm text-blue-600 font-medium`}>
 <span>{labels.clickToOpen}</span>
 <svg className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
 </svg>
 </div>
 )}
 </div>
 );
 })}
 </div>

 {/* Footer Info */}
 <div className={`mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg text-start`}>
 <p className="text-sm text-blue-900">
 <strong>{t.hr.moduleStatusLegend}</strong>
 </p>
 <div className={`mt-2 flex flex-wrap gap-4`}>
 <div className="flex items-center gap-2">
 <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
 ✅ {labels.active}
 </span>
 <span className="text-xs text-gray-600">
 {t.hr.fullyFunctionalAndReadyToUse}
 </span>
 </div>
 <div className="flex items-center gap-2">
 <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
 ⏳ {labels.notImplemented}
 </span>
 <span className="text-xs text-gray-600">
 {t.hr.moduleUnderDevelopment}
 </span>
 </div>
 </div>
 </div>
 </div>
 );
}