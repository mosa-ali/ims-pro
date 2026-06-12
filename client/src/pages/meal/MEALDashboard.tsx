/**
 * ============================================================================
 * MEAL DASHBOARD - EXACT DESIGN MATCH
 * ============================================================================
 * 
 * Converted from React Native to Web React
 * Matches screenshot design pixel-perfect with full RTL/LTR support
 * 
 * FEATURES:
 * - 5 Navigation module cards (2-column grid)
 * - Dashboard Status & Metrics section
 * - 6 KPI metric cards (2x3 grid)
 * - Clickable cards for navigation
 * - Refresh functionality
 * - Full trilingual support (EN/AR/IT) with RTL
 * 
 * ============================================================================
 */

import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { Target, BarChart3, MessageSquare, ClipboardList, FileText, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export function MEALDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const labels = {
    title: getText(
      t.meal.monitoringEvaluationLearningDashboard || "Monitoring, Evaluation, Accountability & Learning",
      t.meal.monitoringEvaluationLearningDashboard || "المراقبة والتقييم والمساءلة والتعلم",
      t.meal.monitoringEvaluationLearningDashboard || "Monitoraggio, Valutazione, Responsabilità e Apprendimento"
    ),
    refresh: getText(
      t.meal.refresh || "Refresh",
      t.meal.refresh || "تحديث",
      t.meal.refresh || "Aggiorna"
    ),
    back: getText(
      t.meal.back || "Back",
      t.meal.back || "رجوع",
      t.meal.back || "Indietro"
    ),

    // Navigation Cards
    indicatorsTracking: getText(
      t.meal.indicatorsTracking || "Indicators Tracking",
      t.meal.indicatorsTracking || "تتبع المؤشرات",
      t.meal.indicatorsTracking || "Tracciamento Indicatori"
    ),
    indicatorsDesc: getText(
      (t as any).meal?.indicatorsTrackingDesc || "Monitor project performance through indicator dashboards, visualize progress, and track achievements against targets.",
      (t as any).meal?.indicatorsTrackingDescAr || "مراقبة أداء المشروع من خلال لوحات معلومات المؤشرات، وتصور التقدم، وتتبع الإنجازات مقابل الأهداف.",
      (t as any).meal?.indicatorsTrackingDescIt || "Monitora le prestazioni del progetto attraverso i dashboard degli indicatori, visualizza i progressi e traccia i risultati rispetto agli obiettivi."
    ),

    mealReports: getText(
      t.meal.mealReportsAnalytics || "MEAL Reports & Analytics",
      t.meal.mealReportsAnalytics || "تقارير وتحليلات المراقبة والتقييم",
      t.meal.mealReportsAnalytics || "Rapporti e Analitiche MEAL"
    ),
    mealReportsDesc: getText(
      (t as any).meal?.mealReportsAnalyticsDesc || "Generate donor-ready reports with indicator performance charts, audit trails, evidence verification, and export functionality.",
      (t as any).meal?.mealReportsAnalyticsDescAr || "إنشاء تقارير جاهزة للمانحين مع مخططات أداء المؤشرات وتتبع التدقيق والتحقق من الأدلة وإمكانية التصدير.",
      (t as any).meal?.mealReportsAnalyticsDescIt || "Genera rapporti pronti per i donatori con grafici delle prestazioni degli indicatori, tracce di audit, verifica delle prove e funzionalità di esportazione."
    ),

    accountability: getText(
      t.meal.accountabilityCrm21 || "Accountability & CRM",
      t.meal.accountabilityCrm21 || "المساءلة وإدارة علاقات العملاء",
      t.meal.accountabilityCrm21 || "Responsabilità e CRM"
    ),
    accountabilityDesc: getText(
      (t as any).meal?.accountabilityCrmDesc || "Manage complaints and feedback, follow referral pathways, and ensure responses comply with AAP and safeguarding standards.",
      (t as any).meal?.accountabilityCrmDescAr || "إدارة الشكاوى والملاحظات، واتباع مسارات الإحالة، والتأكد من امتثال الردود لمعايير AAP والحماية.",
      (t as any).meal?.accountabilityCrmDescIt || "Gestisci i reclami e i feedback, segui i percorsi di rinvio e assicurati che le risposte siano conformi agli standard AAP e di salvaguardia."
    ),

    surveyData: getText(
      t.meal.surveyDataCollection || "Survey & Data Collection",
      t.meal.surveyDataCollection || "المسح وجمع البيانات",
      t.meal.surveyDataCollection || "Sondaggio e Raccolta Dati"
    ),
    surveyDataDesc: getText(
      (t as any).meal?.surveyDataCollectionDesc || "Collect project assessments, surveys, and monitoring data to inform decisions and strengthen evidence-based programming.",
      (t as any).meal?.surveyDataCollectionDescAr || "جمع تقييمات المشروع والمسوحات وبيانات المراقبة لإبلاغ القرارات وتعزيز البرمجة القائمة على الأدلة.",
      (t as any).meal?.surveyDataCollectionDescIt || "Raccogli valutazioni dei progetti, sondaggi e dati di monitoraggio per informare le decisioni e rafforzare la programmazione basata su prove."
    ),

    documents: getText(
      t.meal.documentsReports || "Documents & Reports",
      t.meal.documentsReports || "المستندات والتقارير",
      t.meal.documentsReports || "Documenti e Rapporti"
    ),
    documentsDesc: getText(
      (t as any).meal?.documentsReportsDesc || "Central hub for MEAL files—store assessments, reports, tools, and templates to support learning and organizational memory.",
      (t as any).meal?.documentsReportsDescAr || "مركز مركزي لملفات المراقبة والتقييم - تخزين التقييمات والتقارير والأدوات والقوالب لدعم التعلم والذاكرة التنظيمية.",
      (t as any).meal?.documentsReportsDescIt || "Hub centrale per i file MEAL: archivia valutazioni, rapporti, strumenti e modelli per supportare l'apprendimento e la memoria organizzativa."
    ),

    // Metrics Section
    dashboardStatus: getText(
      t.meal.dashboardStatusMetrics || "Dashboard Status & Metrics",
      t.meal.dashboardStatusMetrics || "حالة لوحة المعلومات والمقاييس",
      t.meal.dashboardStatusMetrics || "Stato Dashboard e Metriche"
    ),
    tapToView: getText(
      t.meal.tapAnyCardToViewDetailed || "Tap any card to view detailed information",
      t.meal.tapAnyCardToViewDetailed || "انقر على أي بطاقة لعرض المعلومات التفصيلية",
      t.meal.tapAnyCardToViewDetailed || "Tocca qualsiasi scheda per visualizzare informazioni dettagliate"
    ),

    // Metric Labels
    achievedIndicators: getText(
      t.meal.achievedIndicators || "Achieved Indicators",
      t.meal.achievedIndicators || "المؤشرات المحققة",
      t.meal.achievedIndicators || "Indicatori Raggiunti"
    ),
    ongoingIndicators: getText(
      t.meal.ongoingIndicators || "Ongoing Indicators",
      t.meal.ongoingIndicators || "المؤشرات الجارية",
      t.meal.ongoingIndicators || "Indicatori in Corso"
    ),
    pendingIndicators: getText(
      t.meal.pendingIndicators || "Pending Indicators",
      t.meal.pendingIndicators || "المؤشرات المعلقة",
      t.meal.pendingIndicators || "Indicatori in Sospeso"
    ),
    indicatorsUpdated: getText(
      t.meal.indicatorsUpdated || "Indicators Updated",
      t.meal.indicatorsUpdated || "المؤشرات المحدثة",
      t.meal.indicatorsUpdated || "Indicatori Aggiornati"
    ),
    indicatorsWithEvidence: getText(
      t.meal.indicatorsWithEvidence || "Indicators with Evidence",
      t.meal.indicatorsWithEvidence || "المؤشرات مع الأدلة",
      t.meal.indicatorsWithEvidence || "Indicatori con Prove"
    ),
    surveySubmissionsLinked: getText(
      t.meal.surveySubmissionsLinked || "Survey Submissions Linked",
      t.meal.surveySubmissionsLinked || "تقديمات المسح المرتبطة",
      t.meal.surveySubmissionsLinked || "Invii del Sondaggio Collegati"
    ),
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Back Navigation */}
      <BackButton onClick={() => navigate('/organization/meal')} label={getText(
        t.meal.backToMeal19 || "Back to MEAL",
        t.meal.backToMeal19 || "العودة إلى المراقبة والتقييم",
        t.meal.backToMeal19 || "Torna a MEAL"
      )} />
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className={`flex items-center justify-between`}>
          <h1 className={`text-xl font-bold text-gray-900 text-start`}>
            {labels.title}
          </h1>
          <div className={`flex gap-2`}>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3 py-1.5 rounded bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <span className={`text-xs font-medium flex items-center gap-1 ${isRefreshing ? 'text-gray-400' : 'text-red-600'}`}>
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                {labels.refresh}
              </span>
            </button>
          </div>
        </div>

        {/* Navigation Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Indicators Tracking */}
          <button
            onClick={() => navigate('/organization/meal/indicators')}
            className="bg-white rounded-lg border border-gray-200 p-8 hover:shadow-md hover:border-blue-300 transition-all"
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 flex items-center justify-center">
                <Target className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900">
                {labels.indicatorsTracking}
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                {labels.indicatorsDesc}
              </p>
            </div>
          </button>

          {/* Card 2: MEAL Reports & Analytics */}
          <button
            onClick={() => navigate('/organization/meal/reports/meal')}
            className="bg-white rounded-lg border border-gray-200 p-8 hover:shadow-md hover:border-blue-300 transition-all"
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 flex items-center justify-center">
                <BarChart3 className="w-10 h-10 text-purple-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900">
                {labels.mealReports}
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                {labels.mealReportsDesc}
              </p>
            </div>
          </button>

          {/* Card 3: Accountability & CRM */}
          <button
            onClick={() => navigate('/organization/meal/accountability')}
            className="bg-white rounded-lg border border-gray-200 p-8 hover:shadow-md hover:border-blue-300 transition-all"
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 flex items-center justify-center">
                <MessageSquare className="w-10 h-10 text-orange-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900">
                {labels.accountability}
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                {labels.accountabilityDesc}
              </p>
            </div>
          </button>

          {/* Card 4: Survey & Data Collection */}
          <button
            onClick={() => navigate('/organization/meal/survey')}
            className="bg-white rounded-lg border border-gray-200 p-8 hover:shadow-md hover:border-blue-300 transition-all"
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 flex items-center justify-center">
                <ClipboardList className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900">
                {labels.surveyData}
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                {labels.surveyDataDesc}
              </p>
            </div>
          </button>

          {/* Card 5: Documents & Reports - Full width on last row */}
          <div className="md:col-span-2 flex justify-center">
            <button
              onClick={() => navigate('/organization/meal/documents')}
              className="bg-white rounded-lg border border-gray-200 p-8 hover:shadow-md hover:border-blue-300 transition-all w-full md:w-1/2"
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-12 h-12 flex items-center justify-center">
                  <FileText className="w-10 h-10 text-indigo-600" />
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  {labels.documents}
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {labels.documentsDesc}
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Dashboard Status & Metrics Section */}
        <div className="space-y-4">
          {/* Section Header */}
          <div className={'text-start'}>
            <h2 className="text-base font-bold text-red-600 mb-1">
              📊 {labels.dashboardStatus}
            </h2>
            <p className="text-xs text-gray-600">
              {labels.tapToView}
            </p>
          </div>

          {/* Metrics Grid - 2x3 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Metric 1: Achieved Indicators */}
            <button
              onClick={() => navigate('/organization/meal/indicators?filter=achieved')}
              className="rounded-lg p-6 flex flex-col items-center justify-center hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#E8F5E9', minHeight: '120px' }}
            >
              <p className="text-4xl font-bold text-green-700 mb-2">0</p>
              <p className="text-sm font-semibold text-green-700 text-center">
                {labels.achievedIndicators}
              </p>
            </button>

            {/* Metric 2: Ongoing Indicators */}
            <button
              onClick={() => navigate('/organization/meal/indicators?filter=ongoing')}
              className="rounded-lg p-6 flex flex-col items-center justify-center hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#E3F2FD', minHeight: '120px' }}
            >
              <p className="text-4xl font-bold text-blue-700 mb-2">0</p>
              <p className="text-sm font-semibold text-blue-700 text-center">
                {labels.ongoingIndicators}
              </p>
            </button>

            {/* Metric 3: Pending Indicators */}
            <button
              onClick={() => navigate('/organization/meal/indicators?filter=pending')}
              className="rounded-lg p-6 flex flex-col items-center justify-center hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#FFF3E0', minHeight: '120px' }}
            >
              <p className="text-4xl font-bold text-orange-700 mb-2">0</p>
              <p className="text-sm font-semibold text-orange-700 text-center">
                {labels.pendingIndicators}
              </p>
            </button>

            {/* Metric 4: Indicators Updated */}
            <button
              onClick={() => navigate('/organization/meal/indicators?filter=updated')}
              className="rounded-lg p-6 flex flex-col items-center justify-center hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#F3E5F5', minHeight: '120px' }}
            >
              <p className="text-4xl font-bold text-purple-700 mb-2">0</p>
              <p className="text-sm font-semibold text-purple-700 text-center">
                {labels.indicatorsUpdated}
              </p>
            </button>

            {/* Metric 5: Indicators with Evidence */}
            <button
              onClick={() => navigate('/organization/meal/indicators?filter=evidence')}
              className="rounded-lg p-6 flex flex-col items-center justify-center hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#E0F2F1', minHeight: '120px' }}
            >
              <p className="text-4xl font-bold text-teal-700 mb-2">0</p>
              <p className="text-sm font-semibold text-teal-700 text-center">
                {labels.indicatorsWithEvidence}
              </p>
            </button>

            {/* Metric 6: Survey Submissions Linked */}
            <button
              onClick={() => navigate('/organization/meal/survey/submissions')}
              className="rounded-lg p-6 flex flex-col items-center justify-center hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#FFF8E1', minHeight: '120px' }}
            >
              <p className="text-4xl font-bold text-yellow-700 mb-2">0</p>
              <p className="text-sm font-semibold text-yellow-700 text-center">
                {labels.surveySubmissionsLinked}
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
