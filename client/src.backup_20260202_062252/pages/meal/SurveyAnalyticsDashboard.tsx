/**
 * ============================================================================
 * SURVEY ANALYTICS DASHBOARD
 * ============================================================================
 * 
 * Converted from React Native to Web React
 * Analytics dashboard with KPIs, charts, and enumerator statistics
 * 
 * FEATURES:
 * - Date range filter (Week, Month, All Time)
 * - 4 KPI cards (Total, Completion Rate, Data Quality, Avg Time)
 * - Submission status breakdown
 * - Quality distribution
 * - Top enumerators leaderboard
 * - Export report button
 * - Bilingual support (EN/AR) with RTL
 * 
 * ============================================================================
 */

import { useLocation, useSearch } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState } from 'react';
import { Download } from 'lucide-react';

export function SurveyAnalyticsDashboard() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const { language, isRTL } = useLanguage();
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('month');

  const projectId = searchParams.get('projectId') || '';
  const projectName = searchParams.get('projectName') || '';
  const surveyId = searchParams.get('surveyId') || '';

  const t = {
    title: language === 'en' ? 'Analytics Dashboard' : 'لوحة التحليلات',
    subtitle: language === 'en' ? 'Survey performance & insights' : 'أداء الاستطلاع والرؤى',
    back: language === 'en' ? 'Back' : 'رجوع',
    week: language === 'en' ? 'Week' : 'أسبوع',
    month: language === 'en' ? 'Month' : 'شهر',
    allTime: language === 'en' ? 'All Time' : 'كل الوقت',
    keyMetrics: language === 'en' ? 'Key Metrics' : 'المقاييس الرئيسية',
    totalSubmissions: language === 'en' ? 'Total Submissions' : 'إجمالي التقديمات',
    completionRate: language === 'en' ? 'Completion Rate' : 'معدل الإكمال',
    verified: language === 'en' ? 'verified' : 'تم التحقق',
    dataQuality: language === 'en' ? 'Data Quality' : 'جودة البيانات',
    avgCompletion: language === 'en' ? 'Avg Completion' : 'متوسط الإكمال',
    minutes: language === 'en' ? 'minutes' : 'دقائق',
    submissionStatus: language === 'en' ? 'Submission Status' : 'حالة التقديم',
    verifiedStatus: language === 'en' ? 'Verified' : 'تم التحقق',
    pending: language === 'en' ? 'Pending' : 'قيد الانتظار',
    rejected: language === 'en' ? 'Rejected' : 'مرفوض',
    qualityDistribution: language === 'en' ? 'Quality Distribution' : 'توزيع الجودة',
    excellent: language === 'en' ? 'Excellent (90+)' : 'ممتاز (90+)',
    good: language === 'en' ? 'Good (75-89)' : 'جيد (75-89)',
    fair: language === 'en' ? 'Fair (60-74)' : 'مقبول (60-74)',
    poor: language === 'en' ? 'Poor (<60)' : 'ضعيف (<60)',
    topEnumerators: language === 'en' ? 'Top Enumerators' : 'أفضل المعدادين',
    submissions: language === 'en' ? 'submissions' : 'تقديمات',
    exportReport: language === 'en' ? '📥 Export Report' : '📥 تصدير التقرير',
    thisWeek: language === 'en' ? 'This week' : 'هذا الأسبوع',
    thisMonth: language === 'en' ? 'This month' : 'هذا الشهر',
    loading: language === 'en' ? 'Loading analytics...' : 'تحميل التحليلات...',
  };

  // Mock analytics data
  const analytics = {
    totalSubmissions: 120,
    verifiedSubmissions: 95,
    pendingSubmissions: 20,
    rejectedSubmissions: 5,
    completionRate: 79,
    dataQualityScore: 82,
    averageCompletionTime: 12,
    enumeratorStats: [
      { name: language === 'en' ? 'Ahmed Hassan' : 'أحمد حسن', submissions: 45, qualityScore: 88 },
      { name: language === 'en' ? 'Fatima Ali' : 'فاطمة علي', submissions: 38, qualityScore: 85 },
      { name: language === 'en' ? 'Mohammed Ibrahim' : 'محمد إبراهيم', submissions: 32, qualityScore: 92 },
      { name: language === 'en' ? 'Leila Ahmed' : 'ليلى أحمد', submissions: 28, qualityScore: 79 },
    ],
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className={`flex items-center justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
          <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
          <p className="text-sm text-gray-600 mt-1">{t.subtitle}</p>
        </div>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <span className="text-sm font-medium text-gray-900">{t.back}</span>
        </button>
      </div>

      {/* Date Range Filter */}
      <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {(['week', 'month', 'all'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setDateRange(range)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              dateRange === range
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <span className="text-xs font-semibold">
              {range === 'week' ? t.week : range === 'month' ? t.month : t.allTime}
            </span>
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div>
        <h3 className={`text-lg font-bold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.keyMetrics}
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-white border border-gray-200">
            <p className="text-3xl mb-1">📊</p>
            <p className="text-xs text-gray-600 mb-1">{t.totalSubmissions}</p>
            <p className="text-2xl font-bold text-gray-900">{analytics.totalSubmissions}</p>
            <p className="text-xs text-gray-600 mt-1">
              {dateRange === 'week' ? t.thisWeek : dateRange === 'month' ? t.thisMonth : t.allTime}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-gray-200">
            <p className="text-3xl mb-1">✅</p>
            <p className="text-xs text-gray-600 mb-1">{t.completionRate}</p>
            <p className="text-2xl font-bold text-gray-900">{analytics.completionRate}%</p>
            <p className="text-xs text-gray-600 mt-1">{analytics.verifiedSubmissions} {t.verified}</p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-gray-200">
            <p className="text-3xl mb-1">⭐</p>
            <p className="text-xs text-gray-600 mb-1">{t.dataQuality}</p>
            <p className="text-2xl font-bold text-gray-900">{analytics.dataQualityScore}%</p>
            <div className="w-full h-1 bg-gray-200 rounded-full mt-2">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${analytics.dataQualityScore}%`,
                  backgroundColor: analytics.dataQualityScore >= 90 ? '#22C55E' : analytics.dataQualityScore >= 75 ? '#3B82F6' : '#F59E0B',
                }}
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-gray-200">
            <p className="text-3xl mb-1">⏱️</p>
            <p className="text-xs text-gray-600 mb-1">{t.avgCompletion}</p>
            <p className="text-2xl font-bold text-gray-900">{analytics.averageCompletionTime}</p>
            <p className="text-xs text-gray-600 mt-1">{t.minutes}</p>
          </div>
        </div>
      </div>

      {/* Submission Status */}
      <div>
        <h3 className={`text-lg font-bold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.submissionStatus}
        </h3>

        <div className="space-y-2">
          {[
            { label: t.verifiedStatus, count: analytics.verifiedSubmissions, color: '#22C55E' },
            { label: t.pending, count: analytics.pendingSubmissions, color: '#F59E0B' },
            { label: t.rejected, count: analytics.rejectedSubmissions, color: '#EF4444' },
          ].map((status) => (
            <div key={status.label} className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
              <div className="flex-1">
                <p className={`text-sm text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{status.label}</p>
              </div>
              <p className="text-sm font-bold text-gray-900">{status.count}</p>
              <p className="text-xs text-gray-600">
                ({Math.round((status.count / analytics.totalSubmissions) * 100)}%)
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Quality Distribution */}
      <div>
        <h3 className={`text-lg font-bold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.qualityDistribution}
        </h3>

        <div className="space-y-2">
          {[
            { label: t.excellent, count: Math.round(analytics.totalSubmissions * 0.45), color: '#22C55E' },
            { label: t.good, count: Math.round(analytics.totalSubmissions * 0.35), color: '#3B82F6' },
            { label: t.fair, count: Math.round(analytics.totalSubmissions * 0.15), color: '#F59E0B' },
            { label: t.poor, count: Math.round(analytics.totalSubmissions * 0.05), color: '#EF4444' },
          ].map((quality) => (
            <div key={quality.label} className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: quality.color }} />
              <div className="flex-1">
                <p className={`text-sm text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{quality.label}</p>
              </div>
              <p className="text-sm font-bold text-gray-900">{quality.count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Top Enumerators */}
      <div>
        <h3 className={`text-lg font-bold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.topEnumerators}
        </h3>

        <div className="space-y-2">
          {analytics.enumeratorStats.map((enumerator, index) => (
            <div
              key={enumerator.name}
              className="p-3 rounded-lg bg-white border border-gray-200 flex items-center justify-between"
            >
              <div className={`flex items-center gap-3 flex-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{index + 1}</span>
                </div>
                <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <p className="text-sm font-semibold text-gray-900">{enumerator.name}</p>
                  <p className="text-xs text-gray-600">{enumerator.submissions} {t.submissions}</p>
                </div>
              </div>
              <span
                className="px-2 py-1 rounded-full text-xs font-bold"
                style={{
                  backgroundColor: enumerator.qualityScore >= 90 ? '#22C55E20' : enumerator.qualityScore >= 75 ? '#3B82F620' : '#F59E0B20',
                  color: enumerator.qualityScore >= 90 ? '#22C55E' : enumerator.qualityScore >= 75 ? '#3B82F6' : '#F59E0B',
                }}
              >
                {enumerator.qualityScore}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Export Button */}
      <button
        onClick={() => navigate(`/meal/survey-export?projectId=${projectId}&projectName=${projectName}&surveyId=${surveyId}`)}
        className="w-full rounded-lg py-4 bg-blue-600 hover:bg-blue-700 transition-colors"
      >
        <span className="font-semibold text-white flex items-center justify-center gap-2">
          <Download className="w-4 h-4" /> {t.exportReport}
        </span>
      </button>
    </div>
  );
}
