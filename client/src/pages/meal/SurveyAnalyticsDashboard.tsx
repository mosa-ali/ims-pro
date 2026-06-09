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

import { useNavigate } from '@/lib/router-compat';
import { useSearch } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export function SurveyAnalyticsDashboard() {
 const { t } = useTranslation();
 const navigate = useNavigate();
 const searchString = useSearch();
 const searchParams = new URLSearchParams(searchString);
 const { language, isRTL } = useLanguage();
 const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('month');

 const projectId = searchParams.get('projectId') || '';
 const projectName = searchParams.get('projectName') || '';
 const surveyId = searchParams.get('surveyId') || '';

 const labels = {
 title: t.mealSurvey.analyticsDashboard,
 subtitle: t.mealSurvey.surveyPerformanceInsights,
 back: t.mealSurvey.back,
 week: t.mealSurvey.week,
 month: t.mealSurvey.month,
 allTime: t.mealSurvey.allTime,
 keyMetrics: t.mealSurvey.keyMetrics,
 totalSubmissions: t.mealSurvey.totalSubmissions,
 completionRate: t.mealSurvey.completionRate,
 verified: t.mealSurvey.verified,
 dataQuality: t.mealSurvey.dataQuality,
 avgCompletion: t.mealSurvey.avgCompletion,
 minutes: t.mealSurvey.minutes,
 submissionStatus: t.mealSurvey.submissionStatus,
 verifiedStatus: t.mealSurvey.verified1,
 pending: t.mealSurvey.pending,
 rejected: t.mealSurvey.rejected,
 qualityDistribution: t.mealSurvey.qualityDistribution,
 excellent: t.mealSurvey.excellent90,
 good: t.mealSurvey.good7589,
 fair: t.mealSurvey.fair6074,
 poor: t.mealSurvey.poor60,
 topEnumerators: t.mealSurvey.topEnumerators,
 submissions: t.mealSurvey.submissions,
 exportReport: t.mealSurvey.exportReport,
 thisWeek: t.mealSurvey.thisWeek,
 thisMonth: t.mealSurvey.thisMonth,
 loading: t.mealSurvey.loadingAnalytics,
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
 { name: t.mealSurvey.ahmedHassan, submissions: 45, qualityScore: 88 },
 { name: t.mealSurvey.fatimaAli, submissions: 38, qualityScore: 85 },
 { name: t.mealSurvey.mohammedIbrahim, submissions: 32, qualityScore: 92 },
 { name: t.mealSurvey.leilaAhmed, submissions: 28, qualityScore: 79 },
 ],
 };

 return (
 <div className="p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Back Navigation */}
 <BackButton onClick={() => navigate('/organization/meal/survey')} label={t.mealSurvey.backToSurveys} />
 {/* Header */}
 <div className={`flex items-center justify-between mb-2`}>
 <div className={`flex-1 text-start`}>
 <h1 className="text-2xl font-bold text-gray-900">{labels.title}</h1>
 <p className="text-sm text-gray-600 mt-1">{labels.subtitle}</p>
 </div>
 </div>

 {/* Date Range Filter */}
 <div className={`flex gap-2`}>
 {(['week', 'month', 'all'] as const).map((range) => (
 <button
 key={range}
 onClick={() => setDateRange(range)}
 className={`px-4 py-2 rounded-lg transition-colors ${ dateRange === range ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50' }`}
 >
 <span className="text-xs font-semibold">
 {range === 'week' ? labels.week : range === 'month' ? labels.month : labels.allTime}
 </span>
 </button>
 ))}
 </div>

 {/* KPI Cards */}
 <div>
 <h3 className={`text-lg font-bold text-gray-900 mb-4 text-start`}>
 {labels.keyMetrics}
 </h3>

 <div className="grid grid-cols-2 gap-3">
 <div className="p-4 rounded-xl bg-white border border-gray-200">
 <p className="text-3xl mb-1">📊</p>
 <p className="text-xs text-gray-600 mb-1">{labels.totalSubmissions}</p>
 <p className="text-2xl font-bold text-gray-900">{analytics.totalSubmissions}</p>
 <p className="text-xs text-gray-600 mt-1">
 {dateRange === 'week' ? labels.thisWeek : dateRange === 'month' ? labels.thisMonth : labels.allTime}
 </p>
 </div>

 <div className="p-4 rounded-xl bg-white border border-gray-200">
 <p className="text-3xl mb-1">✅</p>
 <p className="text-xs text-gray-600 mb-1">{labels.completionRate}</p>
 <p className="text-2xl font-bold text-gray-900">{analytics.completionRate}%</p>
 <p className="text-xs text-gray-600 mt-1">{analytics.verifiedSubmissions} {labels.verified}</p>
 </div>

 <div className="p-4 rounded-xl bg-white border border-gray-200">
 <p className="text-3xl mb-1">⭐</p>
 <p className="text-xs text-gray-600 mb-1">{labels.dataQuality}</p>
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
 <p className="text-xs text-gray-600 mb-1">{labels.avgCompletion}</p>
 <p className="text-2xl font-bold text-gray-900">{analytics.averageCompletionTime}</p>
 <p className="text-xs text-gray-600 mt-1">{labels.minutes}</p>
 </div>
 </div>
 </div>

 {/* Submission Status */}
 <div>
 <h3 className={`text-lg font-bold text-gray-900 mb-4 text-start`}>
 {labels.submissionStatus}
 </h3>

 <div className="space-y-2">
 {[
 { label: labels.verifiedStatus, count: analytics.verifiedSubmissions, color: '#22C55E' },
 { label: labels.pending, count: analytics.pendingSubmissions, color: '#F59E0B' },
 { label: labels.rejected, count: analytics.rejectedSubmissions, color: '#EF4444' },
 ].map((status) => (
 <div key={status.label} className={`flex items-center gap-3`}>
 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
 <div className="flex-1">
 <p className={`text-sm text-gray-900 text-start`}>{status.label}</p>
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
 <h3 className={`text-lg font-bold text-gray-900 mb-4 text-start`}>
 {labels.qualityDistribution}
 </h3>

 <div className="space-y-2">
 {[
 { label: labels.excellent, count: Math.round(analytics.totalSubmissions * 0.45), color: '#22C55E' },
 { label: labels.good, count: Math.round(analytics.totalSubmissions * 0.35), color: '#3B82F6' },
 { label: labels.fair, count: Math.round(analytics.totalSubmissions * 0.15), color: '#F59E0B' },
 { label: labels.poor, count: Math.round(analytics.totalSubmissions * 0.05), color: '#EF4444' },
 ].map((quality) => (
 <div key={quality.label} className={`flex items-center gap-3`}>
 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: quality.color }} />
 <div className="flex-1">
 <p className={`text-sm text-gray-900 text-start`}>{quality.label}</p>
 </div>
 <p className="text-sm font-bold text-gray-900">{quality.count}</p>
 </div>
 ))}
 </div>
 </div>

 {/* Top Enumerators */}
 <div>
 <h3 className={`text-lg font-bold text-gray-900 mb-4 text-start`}>
 {labels.topEnumerators}
 </h3>

 <div className="space-y-2">
 {analytics.enumeratorStats.map((enumerator, index) => (
 <div
 key={enumerator.name}
 className="p-3 rounded-lg bg-white border border-gray-200 flex items-center justify-between"
 >
 <div className={`flex items-center gap-3 flex-1`}>
 <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
 <span className="text-xs font-bold text-white">{index + 1}</span>
 </div>
 <div className={`flex-1 text-start`}>
 <p className="text-sm font-semibold text-gray-900">{enumerator.name}</p>
 <p className="text-xs text-gray-600">{enumerator.submissions} {labels.submissions}</p>
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
 onClick={() => navigate(`/organization/meal/survey-export?projectId=${projectId}&projectName=${projectName}&surveyId=${surveyId}`)}
 className="w-full rounded-lg py-4 bg-blue-600 hover:bg-blue-700 transition-colors"
 >
 <span className="font-semibold text-white flex items-center justify-center gap-2">
 <Download className="w-4 h-4" /> {labels.exportReport}
 </span>
 </button>
 </div>
 );
}
