/**
 * ============================================================================
 * INDICATOR CHARTS - Visualization of indicator achievement and progress
 * ============================================================================
 * 
 * Converted from Figma React Native (indicator-charts.tsx) to Web React
 * Shows bar charts for achievement and progress over time
 * Uses tRPC backend + Recharts
 * 
 * ============================================================================
 */
import { useMemo } from 'react';
import { useNavigate, useParams } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import { BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
 BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
 LineChart, Line, Cell
} from 'recharts';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export function IndicatorChartsPage() {
 const { t } = useTranslation();
 const navigate = useNavigate();
 const params = useParams();
 const indicatorId = params?.id ? parseInt(params.id) : null;
 const { language, isRTL} = useLanguage();

 const labels = {
 backToDetails: t.meal.backToIndicatorDetails,
 title: t.meal.indicatorCharts,
 subtitle: t.meal.visualAnalysisOfIndicatorPerformanceAnd,
 achievementChart: t.meal.achievementVsTarget,
 progressChart: t.meal.progressOverTime,
 target: t.meal.target,
 achieved: t.meal.achieved,
 baseline: t.meal.baseline,
 value: t.meal.value,
 loading: t.meal.loadingCharts,
 noData: t.meal.noDataEntriesToVisualize,
 male: t.meal.male10,
 female: t.meal.female11,
 boys: t.meal.boys,
 girls: t.meal.girls,
 disaggregationChart: t.meal.beneficiaryDisaggregation,
 };

 // Fetch indicator
 const { data: indicator, isLoading: loadingIndicator } = trpc.indicators.getById.useQuery(
 { id: indicatorId! },
 { enabled: !!indicatorId }
 );

 // Fetch data entries
 const { data: dataEntries = [], isLoading: loadingEntries } = trpc.mealIndicatorData.getByIndicator.useQuery(
 { indicatorId: indicatorId! },
 { enabled: !!indicatorId }
 );

 // Achievement bar chart data
 const achievementData = useMemo(() => {
 if (!indicator) return [];
 const targetVal = parseFloat(indicator.target) || 0;
 const achievedVal = parseFloat(indicator.achievedValue) || 0;
 const baselineVal = parseFloat(indicator.baseline) || 0;
 return [
 {
 name: language === 'en'
 ? (indicator.indicatorName?.substring(0, 30) + (indicator.indicatorName.length > 30 ? '...' : ''))
 : ((indicator.indicatorNameAr || indicator.indicatorName)?.substring(0, 30) + '...'),
 [labels.baseline]: baselineVal,
 [labels.target]: targetVal,
 [labels.achieved]: achievedVal,
 }
 ];
 }, [indicator, language, t]);

 // Progress over time line chart data
 const progressData = useMemo(() => {
 return dataEntries
 .filter((e: any) => e.periodEndDate || e.reportingPeriod)
 .sort((a: any, b: any) => {
 const dateA = a.periodEndDate ? new Date(a.periodEndDate).getTime() : 0;
 const dateB = b.periodEndDate ? new Date(b.periodEndDate).getTime() : 0;
 return dateA - dateB;
 })
 .map((entry: any) => ({
 date: entry.reportingPeriod || (entry.periodEndDate ? new Date(entry.periodEndDate).toLocaleDateString() : ''),
 [labels.value]: parseFloat(entry.achievedValue) || 0,
 }));
 }, [dataEntries, t]);

 // Disaggregation bar chart data (from JSON disaggregation field)
 const disaggregationData = useMemo(() => {
 let male = 0, female = 0, pwd = 0, nonPwd = 0;
 dataEntries.forEach((entry: any) => {
 const d = entry.disaggregation;
 if (d && typeof d === 'object') {
 male += parseFloat(d.male) || 0;
 female += parseFloat(d.female) || 0;
 pwd += parseFloat(d.pwd) || 0;
 nonPwd += parseFloat(d.nonPwd) || 0;
 }
 });
 return [
 { name: labels.male, value: male, fill: '#3B82F6' },
 { name: labels.female, value: female, fill: '#EC4899' },
 { name: t.meal.pwd, value: pwd, fill: '#F59E0B' },
 { name: t.meal.nonpwd, value: nonPwd, fill: '#06B6D4' },
 ];
 }, [dataEntries, language, t]);

 const isLoading = loadingIndicator || loadingEntries;

 if (isLoading) {
 return (
 <div className="flex items-center justify-center min-h-screen p-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="text-center">
 <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
 <p className="text-sm text-muted-foreground">{labels.loading}</p>
 </div>
 </div>
 );
 }

 return (
 <div className="p-6">
 {/* Back */}
 <BackButton onClick={() => navigate(indicatorId ? `/organization/meal/indicators/${indicatorId}` : '/organization/meal')} label={labels.backToDetails} />

 {/* Header */}
 <div className="mb-6">
 <div className="flex items-center gap-3 mb-2">
 <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
 <BarChart3 className="h-5 w-5 text-blue-600" />
 </div>
 <div>
 <h1 className="text-2xl font-bold text-foreground">{labels.title}</h1>
 <p className="text-sm text-muted-foreground">{labels.subtitle}</p>
 </div>
 </div>
 </div>

 {/* Achievement vs Target Chart */}
 <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
 <h2 className="text-lg font-semibold text-gray-900 mb-4">{labels.achievementChart}</h2>
 {achievementData.length > 0 ? (
 <ResponsiveContainer width="100%" height={300}>
 <BarChart data={achievementData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
 <CartesianGrid strokeDasharray="3 3" />
 <XAxis dataKey="name" />
 <YAxis />
 <Tooltip />
 <Legend />
 <Bar dataKey={labels.baseline} fill="#9CA3AF" radius={[4, 4, 0, 0]} />
 <Bar dataKey={labels.target} fill="#3B82F6" radius={[4, 4, 0, 0]} />
 <Bar dataKey={labels.achieved} fill="#10B981" radius={[4, 4, 0, 0]} />
 </BarChart>
 </ResponsiveContainer>
 ) : (
 <div className="text-center py-8 text-gray-500">{labels.noData}</div>
 )}
 </div>

 {/* Progress Over Time Chart */}
 <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
 <h2 className="text-lg font-semibold text-gray-900 mb-4">{labels.progressChart}</h2>
 {progressData.length > 0 ? (
 <ResponsiveContainer width="100%" height={300}>
 <LineChart data={progressData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
 <CartesianGrid strokeDasharray="3 3" />
 <XAxis dataKey="date" />
 <YAxis />
 <Tooltip />
 <Legend />
 <Line type="monotone" dataKey={labels.value} stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} />
 </LineChart>
 </ResponsiveContainer>
 ) : (
 <div className="text-center py-8 text-gray-500">{labels.noData}</div>
 )}
 </div>

 {/* Disaggregation Chart */}
 <div className="bg-white border border-gray-200 rounded-xl p-6">
 <h2 className="text-lg font-semibold text-gray-900 mb-4">{labels.disaggregationChart}</h2>
 {disaggregationData.some(d => d.value > 0) ? (
 <ResponsiveContainer width="100%" height={300}>
 <BarChart data={disaggregationData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
 <CartesianGrid strokeDasharray="3 3" />
 <XAxis dataKey="name" />
 <YAxis />
 <Tooltip />
 <Bar dataKey="value" radius={[4, 4, 0, 0]}>
 {disaggregationData.map((entry, index) => (
 <Cell key={index} fill={entry.fill} />
 ))}
 </Bar>
 </BarChart>
 </ResponsiveContainer>
 ) : (
 <div className="text-center py-8 text-gray-500">{labels.noData}</div>
 )}
 </div>
 </div>
 );
}

// Keep named export for backward compatibility with App.tsx import
export function IndicatorCharts() {
 return <IndicatorChartsPage />;
}

export default IndicatorChartsPage;
