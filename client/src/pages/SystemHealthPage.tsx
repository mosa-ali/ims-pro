/**
 * ============================================================================
 * SYSTEM HEALTH & PROTECTION - LANDING PAGE (CARDS GRID)
 * ============================================================================
 * 
 * PURPOSE:
 * - Platform-level monitoring workspace landing page
 * - Card-based navigation to two monitoring modules
 * - Matches HR/Finance module launcher pattern
 * 
 * FEATURES:
 * ✅ Responsive grid (2 cards, responsive layout)
 * ✅ Bilingual (EN/AR with RTL)
 * ✅ Module icons, names, descriptions
 * ✅ Click to navigate to detailed monitoring screens
 * 
 * ============================================================================
 */

import { useNavigate } from '@/lib/router-compat';
import { Activity, ShieldCheck, RefreshCw, FileSearch } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n/useTranslation';

interface MonitoringModule {
 id: string;
 name: { en: string; ar: string };
 description: { en: string; ar: string };
 icon: any;
 path: string;
 status: 'active';
 healthScore: number;
 actionButton: { en: string; ar: string };
 actionIcon: any;
}

export default function SystemHealthPage() {
  const { language, isRTL } = useLanguage();
 const navigate = useNavigate();
 const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
 const [isRunningAudit, setIsRunningAudit] = useState(false);

 const { t } = useTranslation();
 const labels = {
 title: t.common.systemHealthProtection,
 subtitle: t.common.systemHealthSubtitle,
 
 clickToOpen: t.common.clickToOpenModule,
 diagnosticsStarted: t.common.fullDiagnosticsStarted,
 auditStarted: t.common.rerunningAudit,
 };

 const modules: MonitoringModule[] = [
 {
 id: 'infrastructure',
 name: { en: 'System Health', ar: 'حالة النظام' },
 description: { en: 'Platform infrastructure monitoring - Database, API, Storage, and Operational Health', ar: 'مراقبة البنية التحتية للمنصة - قاعدة البيانات، API، التخزين، والصحة التشغيلية' },
 icon: Activity,
 path: '/platform/system-health/infrastructure',
 status: 'active',
 healthScore: 94,
 actionButton: { en: 'Run Full Diagnostics', ar: 'تشغيل التشخيص الكامل' },
 actionIcon: RefreshCw
 },
 {
 id: 'regression',
 name: { en: 'Regression Protection', ar: 'حماية التراجع' },
 description: { en: 'Platform business logic and integrity monitoring - Infrastructure readiness and regression engine', ar: 'مراقبة منطق الأعمال وسلامة المنصة - جاهزية البنية التحتية ومحرك الحماية من التراجع' },
 icon: ShieldCheck,
 path: '/platform/system-health/regression',
 status: 'active',
 healthScore: 100,
 actionButton: { en: 'Re-run Audit', ar: 'إعادة تشغيل التدقيق' },
 actionIcon: FileSearch
 }
 ];

 const handleModuleClick = (module: MonitoringModule) => {
 navigate(module.path);
 };

 const handleAction = (e: React.MouseEvent, moduleId: string) => {
 e.stopPropagation(); // Prevent card navigation
 
 if (moduleId === 'infrastructure') {
 setIsRunningDiagnostics(true);
 toast.info(labels.diagnosticsStarted);
 // Simulate diagnostics
 setTimeout(() => {
 setIsRunningDiagnostics(false);
 navigate('/platform/system-health/infrastructure');
 }, 1500);
 } else if (moduleId === 'regression') {
 setIsRunningAudit(true);
 toast.info(labels.auditStarted);
 // Simulate audit
 setTimeout(() => {
 setIsRunningAudit(false);
 navigate('/platform/system-health/regression');
 }, 1500);
 }
 };

 const getHealthColor = (score: number) => {
 if (score >= 90) return 'text-emerald-600 bg-emerald-50';
 if (score >= 70) return 'text-amber-600 bg-amber-50';
 return 'text-rose-600 bg-rose-50';
 };

 const getCardClasses = () => {
 return "bg-white rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg cursor-pointer p-6 transition-all duration-200";
 };

 return (
 <div className="min-h-screen bg-gray-50/50 p-8" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="max-w-[1600px] mx-auto space-y-6">
 {/* Header */}
 <div className={'text-start'}>
 <h1 className="text-3xl font-bold text-gray-900">{labels.title}</h1>
 <p className="text-base text-gray-600 mt-2">{labels.subtitle}</p>
 </div>

 {/* Module Cards Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {modules.map((module) => {
 const Icon = module.icon;
 
 return (
 <div
 key={module.id}
 onClick={() => handleModuleClick(module)}
 className={getCardClasses()}
 title={labels.clickToOpen}
 >
 {/* Icon, Title, and Health Score */}
 <div className={`flex items-start gap-4 mb-4 flex-row`}>
 <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
 <Icon className="w-6 h-6 text-blue-600" />
 </div>
 <div className={`flex-1 text-start`}>
 <div className="flex items-center gap-2 mb-2">
 <h3 className="text-lg font-semibold text-gray-900">
 {module.name[language]}
 </h3>
 <div className={`px-2 py-1 rounded-full text-xs font-bold ${getHealthColor(module.healthScore)}`}>
 {module.healthScore}%
 </div>
 </div>
 <p className="text-sm text-gray-600 leading-relaxed">
 {module.description[language]}
 </p>
 </div>
 </div>
 
 {/* Action Button */}
 <div className={`text-end`}>
 <Button
 variant="outline"
 size="sm"
 onClick={(e) => handleAction(e, module.id)}
 disabled={(module.id === 'infrastructure' && isRunningDiagnostics) || (module.id === 'regression' && isRunningAudit)}
 className="gap-2"
 >
 <module.actionIcon className={`w-4 h-4 ${(module.id === 'infrastructure' && isRunningDiagnostics) || (module.id === 'regression' && isRunningAudit) ? 'animate-spin' : ''}`} />
 {module.actionButton[language]}
 </Button>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </div>
 );
}
