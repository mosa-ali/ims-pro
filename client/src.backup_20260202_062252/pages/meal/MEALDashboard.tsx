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
 * - Full bilingual support (EN/AR) with RTL
 * 
 * ============================================================================
 */

import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { Target, BarChart3, MessageSquare, ClipboardList, FileText, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export function MEALDashboard() {
  const [, navigate] = useLocation();
  const { language, isRTL } = useLanguage();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const t = {
    title: language === 'en' ? 'Monitoring, Evaluation & Learning Dashboard' : 'لوحة المتابعة والتقييم والتعلم',
    refresh: language === 'en' ? 'Refresh' : 'تحديث',
    back: language === 'en' ? 'Back' : 'رجوع',
    
    // Navigation Cards
    indicatorsTracking: language === 'en' ? 'Indicators Tracking' : 'تتبع المؤشرات',
    indicatorsDesc: language === 'en'
      ? 'Monitor project performance through indicator dashboards, visualize progress, and track achievements against targets.'
      : 'مراقبة أداء المشروع من خلال لوحات المؤشرات، وتصور التقدم، وتتبع الإنجازات مقابل الأهداف.',
    
    mealReports: language === 'en' ? 'MEAL Reports & Analytics' : 'تقارير وتحليلات MEAL',
    mealReportsDesc: language === 'en'
      ? 'Generate donor-ready reports with indicator performance charts, audit trails, evidence verification, and export functionality.'
      : 'إنشاء تقارير جاهزة للجهات المانحة مع مخططات أداء المؤشرات ومسارات التدقيق والتحقق من الأدلة ووظيفة التصدير.',
    
    accountability: language === 'en' ? 'Accountability & CRM' : 'المساءلة وإدارة العلاقات',
    accountabilityDesc: language === 'en'
      ? 'Manage complaints and feedback, follow referral pathways, and ensure responses comply with AAP and safeguarding standards.'
      : 'إدارة الشكاوى والملاحظات، ومتابعة مسارات الإحالة، وضمان الامتثال لمعايير المساءلة والحماية.',
    
    surveyData: language === 'en' ? 'Survey & Data Collection' : 'المسح وجمع البيانات',
    surveyDataDesc: language === 'en'
      ? 'Collect project assessments, surveys, and monitoring data to inform decisions and strengthen evidence-based programming.'
      : 'جمع تقييمات المشروع والمسوحات وبيانات المراقبة لإعلام القرارات وتعزيز البرمجة القائمة على الأدلة.',
    
    documents: language === 'en' ? 'Documents & Reports' : 'الوثائق والتقارير',
    documentsDesc: language === 'en'
      ? 'Central hub for MEAL files—store assessments, reports, tools, and templates to support learning and organizational memory.'
      : 'مركز رئيسي لملفات MEAL - تخزين التقييمات والتقارير والأدوات والقوالب لدعم التعلم والذاكرة التنظيمية.',
    
    // Metrics Section
    dashboardStatus: language === 'en' ? 'Dashboard Status & Metrics' : 'حالة لوحة التحكم والمقاييس',
    tapToView: language === 'en' ? 'Tap any card to view detailed information' : 'انقر على أي بطاقة لعرض المعلومات التفصيلية',
    
    // Metric Labels
    achievedIndicators: language === 'en' ? 'Achieved Indicators' : 'المؤشرات المحققة',
    ongoingIndicators: language === 'en' ? 'Ongoing Indicators' : 'المؤشرات الجارية',
    pendingIndicators: language === 'en' ? 'Pending Indicators' : 'المؤشرات المعلقة',
    indicatorsUpdated: language === 'en' ? 'Indicators Updated' : 'المؤشرات المحدثة',
    indicatorsWithEvidence: language === 'en' ? 'Indicators with Evidence' : 'المؤشرات مع الأدلة',
    surveySubmissionsLinked: language === 'en' ? 'Survey Submissions Linked' : 'تقديمات المسح المرتبطة',
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h1 className={`text-xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.title}
          </h1>
          <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3 py-1.5 rounded bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <span className={`text-xs font-medium flex items-center gap-1 ${
                isRefreshing ? 'text-gray-400' : 'text-red-600'
              }`}>
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                {t.refresh}
              </span>
            </button>
            <button
              onClick={() => window.history.back()}
              className="px-3 py-1.5 rounded bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <span className="text-xs font-medium text-gray-900">{t.back}</span>
            </button>
          </div>
        </div>

        {/* Navigation Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Indicators Tracking */}
          <button
            onClick={() => navigate('/meal/indicators')}
            className="bg-white rounded-lg border border-gray-200 p-8 hover:shadow-md hover:border-blue-300 transition-all"
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 flex items-center justify-center">
                <Target className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900">
                {t.indicatorsTracking}
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t.indicatorsDesc}
              </p>
            </div>
          </button>

          {/* Card 2: MEAL Reports & Analytics */}
          <button
            onClick={() => navigate('/meal/reports/meal')}
            className="bg-white rounded-lg border border-gray-200 p-8 hover:shadow-md hover:border-blue-300 transition-all"
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 flex items-center justify-center">
                <BarChart3 className="w-10 h-10 text-purple-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900">
                {t.mealReports}
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t.mealReportsDesc}
              </p>
            </div>
          </button>

          {/* Card 3: Accountability & CRM */}
          <button
            onClick={() => navigate('/meal/accountability')}
            className="bg-white rounded-lg border border-gray-200 p-8 hover:shadow-md hover:border-blue-300 transition-all"
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 flex items-center justify-center">
                <MessageSquare className="w-10 h-10 text-orange-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900">
                {t.accountability}
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t.accountabilityDesc}
              </p>
            </div>
          </button>

          {/* Card 4: Survey & Data Collection */}
          <button
            onClick={() => navigate('/meal/survey')}
            className="bg-white rounded-lg border border-gray-200 p-8 hover:shadow-md hover:border-blue-300 transition-all"
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 flex items-center justify-center">
                <ClipboardList className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900">
                {t.surveyData}
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t.surveyDataDesc}
              </p>
            </div>
          </button>

          {/* Card 5: Documents & Reports - Full width on last row */}
          <div className="md:col-span-2 flex justify-center">
            <button
              onClick={() => navigate('/meal/documents')}
              className="bg-white rounded-lg border border-gray-200 p-8 hover:shadow-md hover:border-blue-300 transition-all w-full md:w-1/2"
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-12 h-12 flex items-center justify-center">
                  <FileText className="w-10 h-10 text-indigo-600" />
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  {t.documents}
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {t.documentsDesc}
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Dashboard Status & Metrics Section */}
        <div className="space-y-4">
          {/* Section Header */}
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <h2 className="text-base font-bold text-red-600 mb-1">
              📊 {t.dashboardStatus}
            </h2>
            <p className="text-xs text-gray-600">
              {t.tapToView}
            </p>
          </div>

          {/* Metrics Grid - 2x3 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Metric 1: Achieved Indicators */}
            <button
              onClick={() => navigate('/meal/indicators?filter=achieved')}
              className="rounded-lg p-6 flex flex-col items-center justify-center hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#E8F5E9', minHeight: '120px' }}
            >
              <p className="text-4xl font-bold text-green-700 mb-2">0</p>
              <p className="text-sm font-semibold text-green-700 text-center">
                {t.achievedIndicators}
              </p>
            </button>

            {/* Metric 2: Ongoing Indicators */}
            <button
              onClick={() => navigate('/meal/indicators?filter=ongoing')}
              className="rounded-lg p-6 flex flex-col items-center justify-center hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#E3F2FD', minHeight: '120px' }}
            >
              <p className="text-4xl font-bold text-blue-700 mb-2">0</p>
              <p className="text-sm font-semibold text-blue-700 text-center">
                {t.ongoingIndicators}
              </p>
            </button>

            {/* Metric 3: Pending Indicators */}
            <button
              onClick={() => navigate('/meal/indicators?filter=pending')}
              className="rounded-lg p-6 flex flex-col items-center justify-center hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#FFF3E0', minHeight: '120px' }}
            >
              <p className="text-4xl font-bold text-orange-700 mb-2">0</p>
              <p className="text-sm font-semibold text-orange-700 text-center">
                {t.pendingIndicators}
              </p>
            </button>

            {/* Metric 4: Indicators Updated */}
            <button
              onClick={() => navigate('/meal/indicators?filter=updated')}
              className="rounded-lg p-6 flex flex-col items-center justify-center hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#F3E5F5', minHeight: '120px' }}
            >
              <p className="text-4xl font-bold text-purple-700 mb-2">0</p>
              <p className="text-sm font-semibold text-purple-700 text-center">
                {t.indicatorsUpdated}
              </p>
            </button>

            {/* Metric 5: Indicators with Evidence */}
            <button
              onClick={() => navigate('/meal/indicators?filter=evidence')}
              className="rounded-lg p-6 flex flex-col items-center justify-center hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#E0F2F1', minHeight: '120px' }}
            >
              <p className="text-4xl font-bold text-teal-700 mb-2">0</p>
              <p className="text-sm font-semibold text-teal-700 text-center">
                {t.indicatorsWithEvidence}
              </p>
            </button>

            {/* Metric 6: Survey Submissions Linked */}
            <button
              onClick={() => navigate('/meal/survey/submissions')}
              className="rounded-lg p-6 flex flex-col items-center justify-center hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#FFF8E1', minHeight: '120px' }}
            >
              <p className="text-4xl font-bold text-yellow-700 mb-2">0</p>
              <p className="text-sm font-semibold text-yellow-700 text-center">
                {t.surveySubmissionsLinked}
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
