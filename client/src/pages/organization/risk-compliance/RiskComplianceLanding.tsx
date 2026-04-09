/**
 * ============================================================================
 * RISK & COMPLIANCE MODULE LAUNCHER - INTERACTIVE CARDS GRID
 * ============================================================================
 * 
 * PURPOSE:
 * - Replace tabs-based interface with scalable card-based navigation
 * - Clear visibility of all Risk & Compliance modules
 * - Better UX consistent with Finance, HR, and MEAL modules
 * - Status badges for module maturity
 * 
 * FEATURES:
 * ✅ Responsive grid (3 cols desktop, 2 tablet, 1 mobile)
 * ✅ Status badges (Active / Coming Soon)
 * ✅ Bilingual (EN/AR with RTL)
 * ✅ Module icons, names, descriptions
 * ✅ Click to navigate to active modules
 * ✅ Disabled state for coming-soon modules
 * 
 * ============================================================================
 */

import { useNavigate } from '@/lib/router-compat';
import {
 LayoutDashboard,
 Shield,
 AlertTriangle,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface RiskComplianceModule {
 id: string;
 name: { en: string; ar: string };
 description: { en: string; ar: string };
 icon: any;
 path: string;
 status: 'active' | 'coming-soon';
}

export function RiskComplianceLanding() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const navigate = useNavigate();

 const labels = {
 title: t.organizationModule.riskCompliance,
 subtitle: t.riskCompliance.subtitle,
 
 // Status badges
 active: t.organizationModule.active,
 comingSoon: t.organizationModule.comingSoon,
 
 // Tooltips
 clickToOpen: t.organizationModule.clickToOpenModule,
 underDevelopment: t.organizationModule.moduleUnderDevelopment,
 };

 const modules: RiskComplianceModule[] = [
 {
 id: 'dashboard',
 name: { en: 'Dashboard', ar: 'لوحة المعلومات' },
 description: { 
 en: 'Overview of risks and incidents with KPIs, trends, and analytics.', 
 ar: 'نظرة عامة على المخاطر والحوادث مع مؤشرات الأداء والاتجاهات والتحليلات.' 
 },
 icon: LayoutDashboard,
 path: '/organization/risk-compliance/dashboard',
 status: 'active'
 },
 {
 id: 'risk-registry',
 name: { en: 'Risk Registry', ar: 'سجل المخاطر' },
 description: { 
 en: 'Identify, assess, and manage organizational risks with mitigation strategies.', 
 ar: 'تحديد وتقييم وإدارة المخاطر التنظيمية مع استراتيجيات التخفيف.' 
 },
 icon: Shield,
 path: '/organization/risk-compliance/risk-registry',
 status: 'active'
 },
 {
 id: 'incident-log',
 name: { en: 'Incident Log', ar: 'سجل الحوادث' },
 description: { 
 en: 'Track and manage incidents, link to risks, and monitor resolution status.', 
 ar: 'تتبع وإدارة الحوادث والربط بالمخاطر ومراقبة حالة الحل.' 
 },
 icon: AlertTriangle,
 path: '/organization/risk-compliance/incident-log',
 status: 'active'
 },
 ];

 const handleModuleClick = (module: RiskComplianceModule) => {
 if (module.status === 'active') {
 navigate(module.path);
 }
 };

 const getStatusBadge = (module: RiskComplianceModule) => {
 switch (module.status) {
 case 'active':
 return (
 <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
 ✅ {labels.active}
 </span>
 );
 case 'coming-soon':
 return (
 <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
 ⏳ {labels.comingSoon}
 </span>
 );
 default:
 return null;
 }
 };

 const getCardClasses = (module: RiskComplianceModule) => {
 const baseClasses = "bg-white rounded-lg border-2 p-6 transition-all duration-200";
 
 if (module.status === 'active') {
 return `${baseClasses} border-gray-200 hover:border-emerald-500 hover:shadow-lg cursor-pointer`;
 } else {
 return `${baseClasses} border-gray-200 opacity-60 cursor-not-allowed`;
 }
 };

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className="text-start">
 <h1 className="text-3xl font-bold text-gray-900">{labels.title}</h1>
 <p className="text-base text-gray-600 mt-2">{labels.subtitle}</p>
 </div>

 {/* Module Cards Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {modules.map((module) => {
 const Icon = module.icon;
 
 return (
 <div
 key={module.id}
 onClick={() => handleModuleClick(module)}
 className={getCardClasses(module)}
 title={
 module.status === 'active' 
 ? (t.organizationModule.clickToOpenModule27)
 : labels.underDevelopment
 }
 >
 {/* Icon and Status Badge */}
 <div className="flex items-start justify-between mb-4">
 <div className={`p-3 rounded-lg ${ module.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400' }`}>
 <Icon className="w-6 h-6" />
 </div>
 <div>{getStatusBadge(module)}</div>
 </div>

 {/* Module Name */}
 <h3 className="text-lg font-semibold text-gray-900 mb-2 text-start">
 {module.name[language]}
 </h3>

 {/* Module Description */}
 <p className="text-sm text-gray-600 text-start">
 {module.description[language]}
 </p>

 {/* Active indicator */}
 {module.status === 'active' && (
 <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-sm text-emerald-600 font-medium">
 <span>{labels.clickToOpen}</span>
 {!isRTL && (
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
 </svg>
 )}
 </div>
 )}
 </div>
 );
 })}
 </div>

 {/* Footer Info */}
 <div className="mt-8 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-start">
 <p className="text-sm text-emerald-900">
 <strong>{t.organizationModule.moduleStatusLegend}</strong>
 </p>
 <div className="mt-2 flex flex-wrap gap-4">
 <div className="flex items-center gap-2">
 <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
 ✅ {labels.active}
 </span>
 <span className="text-xs text-gray-600">
 {t.organizationModule.fullyFunctionalAndReadyToUse}
 </span>
 </div>
 <div className="flex items-center gap-2">
 <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
 ⏳ {labels.comingSoon}
 </span>
 <span className="text-xs text-gray-600">
 {t.organizationModule.moduleUnderDevelopment}
 </span>
 </div>
 </div>
 </div>
 </div>
 );
}

export default RiskComplianceLanding;
