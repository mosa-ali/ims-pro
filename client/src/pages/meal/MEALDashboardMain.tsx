/**
 * ============================================================================
 * MEAL MAIN DASHBOARD
 * ============================================================================
 * 
 * Converted from React Native to Web React
 * Main entry point for MEAL module with sub-module navigation
 * 
 * FEATURES:
 * - Dashboard metrics and KPIs
 * - Sub-module navigation cards
 * - Real-time status indicators
 * - Bilingual support (EN/AR)
 * 
 * ============================================================================
 */

import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { Target, MessageSquare, ClipboardList, FileText, TrendingUp, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export function MEALDashboardMain() {
 const { t } = useTranslation();
 const navigate = useNavigate();
 const { language, isRTL } = useLanguage();
 const labels = {
 title: t.meal.monitoringEvaluationLearningDashboard,
 subtitle: t.meal.mealSystem,
 back: t.meal.back,
 dashboardStatus: t.meal.dashboardStatusMetrics,
 achievedIndicators: t.meal.achievedIndicators,
 ongoingIndicators: t.meal.ongoingIndicators,
 pendingIndicators: t.meal.pendingIndicators,
 totalBeneficiaries: t.meal.totalBeneficiaries,
 };

 const subModules = [
 {
 id: 'indicators',
 title: t.meal.indicatorsTracking,
 description: 'Monitor project performance through indicator dashboards, visualize progress, and track achievements against targets.',
 icon: Target,
 route: '/organization/meal/indicators',
 },
 {
 id: 'accountability',
 title: t.meal.accountabilityCrm21,
 description: 'Manage complaints and feedback, follow referral pathways, and ensure responses comply with AAP and safeguarding standards.',
 icon: MessageSquare,
 route: '/organization/meal/accountability',
 },
 {
 id: 'survey',
 title: t.meal.surveyDataCollection,
 description: 'Collect project assessments, surveys, and monitoring data to inform decisions and strengthen evidence-based programming.',
 icon: ClipboardList,
 route: '/organization/meal/survey',
 },
 {
 id: 'documents',
 title: t.meal.documentsReports,
 description: 'Central hub for MEAL files—store assessments, reports, tools, and templates to support learning and organizational memory.',
 icon: FileText,
 route: '/organization/meal/documents',
 },
 ];

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Back Navigation */}
 <BackButton onClick={() => navigate('/organization/meal')} label={t.meal.backToMeal19} />
 {/* Header */}
 <div className={`flex items-center justify-between`}>
 <div className={'text-start'}>
 <h1 className="text-3xl font-bold text-gray-900">{labels.title}</h1>
 <p className="text-base text-gray-600 mt-1">{labels.subtitle}</p>
 </div>
 </div>

 {/* Sub-Module Cards */}
 <div className="space-y-4">
 {subModules.map((module) => {
 const Icon = module.icon;
 return (
 <button
 key={module.id}
 onClick={() => navigate(module.route)}
 className={`w-full bg-white rounded-xl p-5 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-start ${ isRTL ? 'text-right' : '' }`}
 >
 <div className={`flex items-center gap-4`}>
 <div className="w-14 h-14 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
 <Icon className="w-7 h-7 text-purple-600" />
 </div>
 <div className="flex-1">
 <h3 className="text-lg font-bold text-gray-900 mb-1">
 {module.title}
 </h3>
 <p className="text-sm text-gray-600">
 {module.description}
 </p>
 </div>
 </div>
 </button>
 );
 })}
 </div>

 {/* Dashboard Status & Metrics */}
 <div className="space-y-3 mt-4">
 <h2 className={`text-xl font-bold text-gray-900 text-start`}>
 {labels.dashboardStatus}
 </h2>
 
 {/* Row 1 */}
 <div className="grid grid-cols-2 gap-3">
 <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
 <p className="text-sm text-gray-600 mb-1">{labels.achievedIndicators}</p>
 <p className="text-3xl font-bold text-green-600">1</p>
 </div>
 <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
 <p className="text-sm text-gray-600 mb-1">{labels.ongoingIndicators}</p>
 <p className="text-3xl font-bold text-blue-600">6</p>
 </div>
 </div>

 {/* Row 2 */}
 <div className="grid grid-cols-2 gap-3">
 <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
 <p className="text-sm text-gray-600 mb-1">{labels.pendingIndicators}</p>
 <p className="text-3xl font-bold text-orange-600">12</p>
 </div>
 <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
 <p className="text-sm text-gray-600 mb-1">{labels.totalBeneficiaries}</p>
 <p className="text-3xl font-bold text-gray-900">1,250</p>
 </div>
 </div>
 </div>
 </div>
 );
}
