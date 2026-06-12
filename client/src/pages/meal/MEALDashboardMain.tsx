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
 * - Trilingual support (EN/AR/IT)
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
    subtitle: getText(
      t.meal.mealSystem || "MEAL System",
      t.meal.mealSystem || "نظام المراقبة والتقييم",
      t.meal.mealSystem || "Sistema MEAL"
    ),
    back: getText(
      t.meal.back || "Back",
      t.meal.back || "رجوع",
      t.meal.back || "Indietro"
    ),
    dashboardStatus: getText(
      t.meal.dashboardStatusMetrics || "Dashboard Status & Metrics",
      t.meal.dashboardStatusMetrics || "حالة لوحة المعلومات والمقاييس",
      t.meal.dashboardStatusMetrics || "Stato Dashboard e Metriche"
    ),
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
    totalBeneficiaries: getText(
      t.meal.totalBeneficiaries || "Total Beneficiaries",
      t.meal.totalBeneficiaries || "إجمالي المستفيدين",
      t.meal.totalBeneficiaries || "Beneficiari Totali"
    ),
  };

  const subModules = [
    {
      id: 'indicators',
      title: getText(
        t.meal.indicatorsTracking || "Indicators Tracking",
        t.meal.indicatorsTracking || "تتبع المؤشرات",
        t.meal.indicatorsTracking || "Tracciamento Indicatori"
      ),
      description: getText(
        "Monitor project performance through indicator dashboards, visualize progress, and track achievements against targets.",
        "مراقبة أداء المشروع من خلال لوحات معلومات المؤشرات، وتصور التقدم، وتتبع الإنجازات مقابل الأهداف.",
        "Monitora le prestazioni del progetto attraverso i dashboard degli indicatori, visualizza i progressi e traccia i risultati rispetto agli obiettivi."
      ),
      icon: Target,
      route: '/organization/meal/indicators',
    },
    {
      id: 'accountability',
      title: getText(
        t.meal.accountabilityCrm21 || "Accountability & CRM",
        t.meal.accountabilityCrm21 || "المساءلة وإدارة علاقات العملاء",
        t.meal.accountabilityCrm21 || "Responsabilità e CRM"
      ),
      description: getText(
        "Manage complaints and feedback, follow referral pathways, and ensure responses comply with AAP and safeguarding standards.",
        "إدارة الشكاوى والملاحظات، واتباع مسارات الإحالة، والتأكد من امتثال الردود لمعايير AAP والحماية.",
        "Gestisci i reclami e i feedback, segui i percorsi di rinvio e assicurati che le risposte siano conformi agli standard AAP e di salvaguardia."
      ),
      icon: MessageSquare,
      route: '/organization/meal/accountability',
    },
    {
      id: 'survey',
      title: getText(
        t.meal.surveyDataCollection || "Survey & Data Collection",
        t.meal.surveyDataCollection || "المسح وجمع البيانات",
        t.meal.surveyDataCollection || "Sondaggio e Raccolta Dati"
      ),
      description: getText(
        "Collect project assessments, surveys, and monitoring data to inform decisions and strengthen evidence-based programming.",
        "جمع تقييمات المشروع والمسوحات وبيانات المراقبة لإبلاغ القرارات وتعزيز البرمجة القائمة على الأدلة.",
        "Raccogli valutazioni dei progetti, sondaggi e dati di monitoraggio per informare le decisioni e rafforzare la programmazione basata su prove."
      ),
      icon: ClipboardList,
      route: '/organization/meal/survey',
    },
    {
      id: 'documents',
      title: getText(
        t.meal.documentsReports || "Documents & Reports",
        t.meal.documentsReports || "المستندات والتقارير",
        t.meal.documentsReports || "Documenti e Rapporti"
      ),
      description: getText(
        "Central hub for MEAL files—store assessments, reports, tools, and templates to support learning and organizational memory.",
        "مركز مركزي لملفات المراقبة والتقييم - تخزين التقييمات والتقارير والأدوات والقوالب لدعم التعلم والذاكرة التنظيمية.",
        "Hub centrale per i file MEAL: archivia valutazioni, rapporti, strumenti e modelli per supportare l'apprendimento e la memoria organizzativa."
      ),
      icon: FileText,
      route: '/organization/meal/documents',
    },
  ];

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Back Navigation */}
      <BackButton onClick={() => navigate('/organization/meal')} label={getText(
        t.meal.backToMeal19 || "Back to MEAL",
        t.meal.backToMeal19 || "العودة إلى المراقبة والتقييم",
        t.meal.backToMeal19 || "Torna a MEAL"
      )} />
      
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
              className={`w-full bg-white rounded-xl p-5 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-start ${isRTL ? 'text-right' : ''}`}
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
