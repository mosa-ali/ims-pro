/**
 * ============================================================================
 * MEAL MODULE LAUNCHER - INTERACTIVE CARDS GRID
 * ============================================================================
 * 
 * PURPOSE:
 * - Scalable card-based navigation matching HR Module Launcher exactly
 * - Clear visibility of all MEAL modules (Active + Coming Soon)
 * - Status badges for module maturity
 * 
 * FEATURES:
 * ✅ Responsive grid (4 cols desktop, 3 large, 2 tablet, 1 mobile)
 * ✅ Status badges (Active / Coming Soon)
 * ✅ Bilingual (EN/AR with full RTL)
 * ✅ Module icons, names, descriptions
 * ✅ Click to navigate to active modules
 * ✅ Disabled state for coming-soon modules
 * ✅ Arrow icon flips correctly in RTL
 * 
 * ============================================================================
 */

import { useNavigate } from '@/lib/router-compat';
import {
 BarChart3,
 Target,
 ClipboardList,
 MessageSquare,
 FileText,
 BookOpen,
 ShieldCheck,
 Settings,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Lock } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';

interface MEALModuleCard {
 id: string;
 name: { en: string; ar: string };
 description: { en: string; ar: string };
 icon: any;
 path: string;
 status: 'active' | 'not-implemented';
 badge?: { en: string; ar: string };
}

export function MEALModule() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const navigate = useNavigate();
 const { canScreen, canModule, isAdmin } = usePermissions();

 // RBAC: Check permissions for sensitive workspaces
 const hasSurveyAccess = isAdmin || canModule('surveys', 'view') || canScreen('surveys', 'survey_builder', 'view');
 const hasAccountabilityAccess = isAdmin || canModule('meal', 'view') || canScreen('meal', 'accountability', 'view');

 const labels = {
 title: t.meal.meal,
 subtitle: t.meal.mealModuleSubtitle,

 // Status badges
 active: t.meal.active,
 notImplemented: t.meal.comingSoon,

 // Tooltips
 clickToOpen: t.meal.clickToOpenModule,
 underDevelopment: t.meal.moduleUnderDevelopment,
 };

 const modules: MEALModuleCard[] = [
 {
 id: 'indicators',
 name: { en: 'Indicators Tracking', ar: 'تتبع المؤشرات' },
 description: {
 en: 'Manage output, outcome, and impact indicators linked to projects.',
 ar: 'إدارة مؤشرات المخرجات والنتائج والأثر المرتبطة بالمشاريع.',
 },
 icon: Target,
 path: '/organization/meal/indicators',
 status: 'active',
 },
 {
 id: 'surveys',
 name: { en: 'Surveys & Data Collection', ar: 'المسح وجمع البيانات' },
 description: {
 en: 'Create and manage surveys (Baseline, Endline, PDM, AAP) and submissions.',
 ar: 'إنشاء وإدارة الاستبيانات (خط الأساس، خط النهاية، PDM، AAP) والتقديمات.',
 },
 icon: ClipboardList,
 path: '/organization/meal/survey',
 status: 'active',
 },
 {
 id: 'accountability',
 name: { en: 'Accountability & CRM', ar: 'المساءلة وإدارة العلاقات' },
 description: {
 en: 'Complaints, feedback, referrals, and follow-up tracking.',
 ar: 'الشكاوى والملاحظات والإحالات ومتابعة المتابعة.',
 },
 icon: MessageSquare,
 path: '/organization/meal/accountability',
 status: 'active',
 },
 {
 id: 'reports',
 name: { en: 'Reports & Analytics', ar: 'التقارير والتحليلات' },
 description: {
 en: 'Generate MEAL reports, indicator analysis, and visual dashboards.',
 ar: 'إنشاء تقارير MEAL وتحليل المؤشرات ولوحات التحكم المرئية.',
 },
 icon: BarChart3,
 path: '/organization/meal/reports/meal',
 status: 'active',
 },
 {
 id: 'documents',
 name: { en: 'MEAL Documents', ar: 'وثائق MEAL' },
 description: {
 en: 'Document repository for MEAL tools, guidelines, and evidence.',
 ar: 'مستودع المستندات لأدوات MEAL والإرشادات والأدلة.',
 },
 icon: FileText,
 path: '/organization/meal/documents',
 status: 'active',
 },
 {
 id: 'learning',
 name: { en: 'Learning & Knowledge Management', ar: 'التعلم وإدارة المعرفة' },
 description: {
 en: 'Lessons learned, best practices, learning products.',
 ar: 'الدروس المستفادة، أفضل الممارسات، منتجات التعلم.',
 },
 icon: BookOpen,
 path: '/organization/meal/learning',
 status: 'active',
 },
 {
 id: 'dqa',
 name: { en: 'Data Quality Assurance (DQA)', ar: 'ضمان جودة البيانات (DQA)' },
 description: {
 en: 'Data verification, spot checks, quality audits.',
 ar: 'التحقق من البيانات، الفحوصات العشوائية، عمليات تدقيق الجودة.',
 },
 icon: ShieldCheck,
 path: '/organization/meal/dqa',
 status: 'active',
 },
 {
 id: 'settings',
 name: { en: 'MEAL Settings', ar: 'إعدادات MEAL' },
 description: {
 en: 'Indicator templates, survey standards, configuration, users, permissions, log activity.',
 ar: 'قوالب المؤشرات، معايير الاستبيانات، التكوين، المستخدمين، الصلاحيات، سجل النشاط.',
 },
 icon: Settings,
 path: '/organization/meal/settings',
 status: 'active',
 },
 ];

 // Check if a module requires special RBAC permission and whether the user has it
 const isModuleLocked = (moduleId: string): boolean => {
 if (moduleId === 'surveys' && !hasSurveyAccess) return true;
 if (moduleId === 'accountability' && !hasAccountabilityAccess) return true;
 return false;
 };

 const handleModuleClick = (module: MEALModuleCard) => {
 if (isModuleLocked(module.id)) return; // RBAC blocked
 if (module.status === 'active') {
 navigate(module.path);
 }
 };

 const getStatusBadge = (module: MEALModuleCard) => {
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
 default:
 return null;
 }
 };

 const getCardClasses = (module: MEALModuleCard) => {
 const baseClasses = "bg-white rounded-lg border-2 p-6 transition-all duration-200";

 if (isModuleLocked(module.id)) {
 return `${baseClasses} border-red-200 opacity-50 cursor-not-allowed bg-red-50/30`;
 }
 if (module.status === 'active') {
 return `${baseClasses} border-gray-200 hover:border-blue-500 hover:shadow-lg cursor-pointer`;
 } else {
 return `${baseClasses} border-gray-200 opacity-60 cursor-not-allowed`;
 }
 };

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
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
 : labels.underDevelopment
 }
 >
 {/* Icon and Status Badge */}
 <div className={`flex items-start justify-between mb-4`}>
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

 {/* Active indicator or locked indicator */}
 {isModuleLocked(module.id) ? (
 <div className="mt-4 pt-4 border-t border-red-100 flex items-center gap-2 text-sm text-red-500 font-medium">
 <Lock className="w-4 h-4" />
 <span className="whitespace-nowrap">
 {t.meal.accessRestricted}
 </span>
 </div>
 ) : module.status === 'active' ? (
 <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-sm text-blue-600 font-medium">
 <span className="whitespace-nowrap">{labels.clickToOpen}</span>
 {!isRTL && (
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
 </svg>
 )}
 </div>
 ) : null}
 </div>
 );
 })}
 </div>

 {/* Footer Info */}
 <div className={`mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg text-start`}>
 <p className="text-sm text-blue-900">
 <strong>{t.meal.moduleStatusLegend}</strong>
 </p>
 <div className={`mt-2 flex flex-wrap gap-4`}>
 <div className="flex items-center gap-2">
 <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
 ✅ {labels.active}
 </span>
 <span className="text-xs text-gray-600">
 {t.meal.fullyFunctionalAndReadyToUse}
 </span>
 </div>
 <div className="flex items-center gap-2">
 <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
 ⏳ {labels.notImplemented}
 </span>
 <span className="text-xs text-gray-600">
 {t.meal.moduleUnderDevelopment}
 </span>
 </div>
 </div>
 </div>
 </div>
 );
}

export default MEALModule;