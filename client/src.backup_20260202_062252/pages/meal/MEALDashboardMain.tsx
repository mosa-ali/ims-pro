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

import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { Target, MessageSquare, ClipboardList, FileText, TrendingUp, BarChart3 } from 'lucide-react';

export function MEALDashboardMain() {
  const [, navigate] = useLocation();
  const { language, isRTL } = useLanguage();

  const t = {
    title: language === 'en' ? 'Monitoring, Evaluation & Learning Dashboard' : 'لوحة المتابعة والتقييم والتعلم',
    subtitle: language === 'en' ? 'MEAL System' : 'نظام المتابعة والتقييم',
    back: language === 'en' ? 'Back' : 'رجوع',
    dashboardStatus: language === 'en' ? 'Dashboard Status & Metrics' : 'حالة لوحة التحكم والمقاييس',
    achievedIndicators: language === 'en' ? 'Achieved Indicators' : 'المؤشرات المحققة',
    ongoingIndicators: language === 'en' ? 'Ongoing Indicators' : 'المؤشرات الجارية',
    pendingIndicators: language === 'en' ? 'Pending Indicators' : 'المؤشرات المعلقة',
    totalBeneficiaries: language === 'en' ? 'Total Beneficiaries' : 'إجمالي المستفيدين',
  };

  const subModules = [
    {
      id: 'indicators',
      title: language === 'en' ? 'Indicators Tracking' : 'تتبع المؤشرات',
      description: language === 'en' 
        ? 'Monitor project performance through indicator dashboards, visualize progress, and track achievements against targets.'
        : 'مراقبة أداء المشروع من خلال لوحات المؤشرات، وتصور التقدم، وتتبع الإنجازات مقابل الأهداف.',
      icon: Target,
      route: '/meal/indicators',
    },
    {
      id: 'accountability',
      title: language === 'en' ? 'Accountability & CRM' : 'المساءلة وإدارة العلاقات',
      description: language === 'en'
        ? 'Manage complaints and feedback, follow referral pathways, and ensure responses comply with AAP and safeguarding standards.'
        : 'إدارة الشكاوى والملاحظات، ومتابعة مسارات الإحالة، وضمان الامتثال لمعايير المساءلة والحماية.',
      icon: MessageSquare,
      route: '/meal/accountability',
    },
    {
      id: 'survey',
      title: language === 'en' ? 'Survey & Data Collection' : 'المسح وجمع البيانات',
      description: language === 'en'
        ? 'Collect project assessments, surveys, and monitoring data to inform decisions and strengthen evidence-based programming.'
        : 'جمع تقييمات المشروع والمسوحات وبيانات المراقبة لإعلام القرارات وتعزيز البرمجة القائمة على الأدلة.',
      icon: ClipboardList,
      route: '/meal/survey',
    },
    {
      id: 'documents',
      title: language === 'en' ? 'Documents & Reports' : 'الوثائق والتقارير',
      description: language === 'en'
        ? 'Central hub for MEAL files—store assessments, reports, tools, and templates to support learning and organizational memory.'
        : 'مركز رئيسي لملفات المتابعة والتقييم - تخزين التقييمات والتقارير والأدوات والقوالب لدعم التعلم والذاكرة التنظيمية.',
      icon: FileText,
      route: '/meal/documents',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
          <p className="text-base text-gray-600 mt-1">{t.subtitle}</p>
        </div>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
        >
          <span className="text-sm font-medium text-gray-700">{t.back}</span>
        </button>
      </div>

      {/* Sub-Module Cards */}
      <div className="space-y-4">
        {subModules.map((module) => {
          const Icon = module.icon;
          return (
            <button
              key={module.id}
              onClick={() => navigate(module.route)}
              className={`w-full bg-white rounded-xl p-5 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-left ${
                isRTL ? 'text-right' : ''
              }`}
            >
              <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
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
        <h2 className={`text-xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.dashboardStatus}
        </h2>
        
        {/* Row 1 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
            <p className="text-sm text-gray-600 mb-1">{t.achievedIndicators}</p>
            <p className="text-3xl font-bold text-green-600">1</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
            <p className="text-sm text-gray-600 mb-1">{t.ongoingIndicators}</p>
            <p className="text-3xl font-bold text-blue-600">6</p>
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
            <p className="text-sm text-gray-600 mb-1">{t.pendingIndicators}</p>
            <p className="text-3xl font-bold text-orange-600">12</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
            <p className="text-sm text-gray-600 mb-1">{t.totalBeneficiaries}</p>
            <p className="text-3xl font-bold text-gray-900">1,250</p>
          </div>
        </div>
      </div>
    </div>
  );
}
