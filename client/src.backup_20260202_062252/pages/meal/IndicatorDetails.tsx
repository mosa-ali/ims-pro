/**
 * ============================================================================
 * INDICATOR DETAILS
 * ============================================================================
 * 
 * Converted from React Native to Web React
 * Detailed view of a single indicator with complete metrics
 * 
 * FEATURES:
 * - Indicator metadata display
 * - Progress metrics (baseline, target, achieved, balance)
 * - Disaggregated data (gender breakdown)
 * - Verification & documentation
 * - Update indicator value button
 * - Edit indicator button
 * - Bilingual support (EN/AR) with RTL
 * 
 * ============================================================================
 */

import { useLocation, useSearch } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { Edit, TrendingUp } from 'lucide-react';

export function IndicatorDetails() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const { language, isRTL } = useLanguage();

  const id = searchParams.get('id') || '';
  const indicatorId = parseInt(id);

  const t = {
    title: language === 'en' ? 'Indicator Details' : 'تفاصيل المؤشر',
    back: language === 'en' ? 'Back' : 'رجوع',
    activity: language === 'en' ? 'Activity:' : 'النشاط:',
    project: language === 'en' ? 'Project:' : 'المشروع:',
    indicatorId: language === 'en' ? 'Indicator ID:' : 'معرف المؤشر:',
    progressMetrics: language === 'en' ? 'Progress Metrics' : 'مقاييس التقدم',
    baseline: language === 'en' ? 'Baseline' : 'خط الأساس',
    target: language === 'en' ? 'Target' : 'الهدف',
    achieved: language === 'en' ? 'Achieved' : 'المحقق',
    balance: language === 'en' ? 'Balance' : 'الرصيد',
    units: language === 'en' ? 'units' : 'وحدات',
    reportingFrequency: language === 'en' ? 'Reporting Frequency' : 'تكرار التقرير',
    disaggregatedData: language === 'en' ? 'Disaggregated Data' : 'البيانات المفصلة',
    male: language === 'en' ? 'Male' : 'ذكر',
    female: language === 'en' ? 'Female' : 'أنثى',
    boys: language === 'en' ? 'Boys' : 'أولاد',
    girls: language === 'en' ? 'Girls' : 'بنات',
    totalIndividuals: language === 'en' ? 'Total Individuals' : 'إجمالي الأفراد',
    verificationDocs: language === 'en' ? 'Verification & Documentation' : 'التحقق والوثائق',
    sourceOfVerification: language === 'en' ? 'Source of Verification' : 'مصدر التحقق',
    noSource: language === 'en' ? 'No verification source specified' : 'لم يتم تحديد مصدر تحقق',
    supportingDocs: language === 'en' ? 'Supporting Documents' : 'المستندات الداعمة',
    noDocs: language === 'en' ? 'No documents attached' : 'لا توجد مستندات مرفقة',
    updateValue: language === 'en' ? 'Update Indicator Value' : 'تحديث قيمة المؤشر',
    editIndicator: language === 'en' ? 'Edit Indicator' : 'تعديل المؤشر',
    loading: language === 'en' ? 'Loading indicator details...' : 'تحميل تفاصيل المؤشر...',
    na: language === 'en' ? 'N/A' : 'غير متاح',
  };

  // Mock indicator data
  const indicator = {
    id: indicatorId,
    indicatorName: language === 'en'
      ? 'Number of households with improved water access'
      : 'عدد الأسر ذات الوصول المحسن للمياه',
    activityName: language === 'en' ? 'Water Infrastructure Development' : 'تطوير البنية التحتية للمياه',
    projectName: language === 'en' ? 'Yemen Water Project 2024' : 'مشروع المياه في اليمن 2024',
    indicatorId: 'IND-2024-001',
    indStatus: 'Ongoing',
    baselineValue: '150',
    targetValue: '500',
    achievedValue: '320',
    balance: 180,
    unitType: language === 'en' ? 'households' : 'أسرة',
    reportingFrequency: 'Monthly',
    maleCount: 480,
    femaleCount: 520,
    boysCount: 350,
    girlsCount: 380,
    sourceOfVerification: language === 'en' ? 'Field assessment reports, GPS verification' : 'تقارير التقييم الم��داني، تحقق GPS',
    supportingDocuments: language === 'en' ? 'Water_Assessment_Q1_2024.pdf' : 'تقييم_المياه_Q1_2024.pdf',
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'achieved':
        return '#4CAF50';
      case 'ongoing':
        return '#2196F3';
      case 'pending':
        return '#FF9800';
      default:
        return '#6B7280';
    }
  };

  const totalIndividuals =
    (indicator.maleCount || 0) + (indicator.femaleCount || 0) + (indicator.boysCount || 0) + (indicator.girlsCount || 0);

  if (!indicator) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <p className="text-lg text-gray-500">{t.loading}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className={`flex items-center justify-between pb-6 border-b border-gray-200 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h1 className="text-2xl font-bold text-gray-900 flex-1">{t.title}</h1>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <span className="text-sm font-semibold text-blue-600">{t.back}</span>
        </button>
      </div>

      {/* Indicator Metadata */}
      <div className="rounded-xl p-6 mb-6 bg-white border border-gray-200">
        <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h2 className={`text-xl font-bold text-gray-900 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            {indicator.indicatorName}
          </h2>
          {indicator.indStatus && (
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: getStatusColor(indicator.indStatus) }}
            >
              {indicator.indStatus}
            </span>
          )}
        </div>

        <div className="space-y-3">
          <div className={`flex ${isRTL ? 'flex-row-reverse' : ''}`}>
            <p className={`text-sm font-semibold text-gray-600 ${isRTL ? 'ml-4' : 'mr-4'}`} style={{ width: '160px' }}>
              {t.activity}
            </p>
            <p className={`text-sm text-gray-900 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {indicator.activityName || t.na}
            </p>
          </div>

          <div className={`flex ${isRTL ? 'flex-row-reverse' : ''}`}>
            <p className={`text-sm font-semibold text-gray-600 ${isRTL ? 'ml-4' : 'mr-4'}`} style={{ width: '160px' }}>
              {t.project}
            </p>
            <p className={`text-sm text-gray-900 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {indicator.projectName || t.na}
            </p>
          </div>

          <div className={`flex ${isRTL ? 'flex-row-reverse' : ''}`}>
            <p className={`text-sm font-semibold text-gray-600 ${isRTL ? 'ml-4' : 'mr-4'}`} style={{ width: '160px' }}>
              {t.indicatorId}
            </p>
            <p className={`text-sm text-gray-900 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {indicator.indicatorId || t.na}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Metrics */}
      <div className="mb-6">
        <h3 className={`text-lg font-bold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.progressMetrics}
        </h3>

        <div className={`grid grid-cols-4 gap-4 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="rounded-xl p-4 bg-white border border-gray-200">
            <p className={`text-sm text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.baseline}</p>
            <p className="text-2xl font-bold text-gray-900">{indicator.baselineValue || '0'}</p>
            <p className={`text-xs text-gray-500 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {indicator.unitType || t.units}
            </p>
          </div>

          <div className="rounded-xl p-4 bg-white border border-gray-200">
            <p className={`text-sm text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.target}</p>
            <p className="text-2xl font-bold text-blue-600">{indicator.targetValue || '0'}</p>
            <p className={`text-xs text-gray-500 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {indicator.unitType || t.units}
            </p>
          </div>

          <div className="rounded-xl p-4 bg-white border border-gray-200">
            <p className={`text-sm text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.achieved}</p>
            <p className="text-2xl font-bold text-green-600">{indicator.achievedValue || '0'}</p>
            <p className={`text-xs text-gray-500 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {indicator.unitType || t.units}
            </p>
          </div>

          <div className="rounded-xl p-4 bg-white border border-gray-200">
            <p className={`text-sm text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.balance}</p>
            <p className="text-2xl font-bold text-orange-600">{indicator.balance?.toString() || '0'}</p>
            <p className={`text-xs text-gray-500 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {indicator.unitType || t.units}
            </p>
          </div>
        </div>

        <div className="rounded-xl p-4 bg-white border border-gray-200">
          <p className={`text-sm text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.reportingFrequency}
          </p>
          <p className={`text-lg font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
            {indicator.reportingFrequency || t.na}
          </p>
        </div>
      </div>

      {/* Disaggregated Data */}
      <div className="mb-6">
        <h3 className={`text-lg font-bold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.disaggregatedData}
        </h3>

        <div className="rounded-xl p-6 bg-white border border-gray-200">
          <div className={`grid grid-cols-4 gap-4 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">{t.male}</p>
              <p className="text-3xl font-bold text-blue-600">{indicator.maleCount?.toString() || '0'}</p>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">{t.female}</p>
              <p className="text-3xl font-bold text-pink-600">{indicator.femaleCount?.toString() || '0'}</p>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">{t.boys}</p>
              <p className="text-3xl font-bold text-cyan-600">{indicator.boysCount?.toString() || '0'}</p>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">{t.girls}</p>
              <p className="text-3xl font-bold text-purple-600">{indicator.girlsCount?.toString() || '0'}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
              <p className="text-base font-semibold text-gray-900">{t.totalIndividuals}</p>
              <p className="text-2xl font-bold text-blue-600">{totalIndividuals}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Verification & Documents */}
      <div className="mb-6">
        <h3 className={`text-lg font-bold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.verificationDocs}
        </h3>

        <div className="rounded-xl p-6 mb-4 bg-white border border-gray-200">
          <p className={`text-sm font-semibold text-gray-600 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.sourceOfVerification}
          </p>
          <p className={`text-base text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
            {indicator.sourceOfVerification || t.noSource}
          </p>
        </div>

        <div className="rounded-xl p-6 bg-white border border-gray-200">
          <p className={`text-sm font-semibold text-gray-600 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.supportingDocs}
          </p>
          <p className={`text-base text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
            {indicator.supportingDocuments || t.noDocs}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button
          onClick={() => navigate(`/meal/data-entry?id=${indicator.id}&mode=indicator`)}
          className="flex-1 px-6 py-4 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          <span className="font-semibold text-white flex items-center justify-center gap-2">
            <TrendingUp className="w-4 h-4" /> {t.updateValue}
          </span>
        </button>

        <button
          onClick={() => navigate(`/meal/indicators/add?edit=${indicator.id}`)}
          className="flex-1 px-6 py-4 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <span className="font-semibold text-gray-900 flex items-center justify-center gap-2">
            <Edit className="w-4 h-4" /> {t.editIndicator}
          </span>
        </button>
      </div>
    </div>
  );
}