import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import { BarChart3, PieChart, TrendingUp, RefreshCw, Trash2, RotateCcw, Shield, AlertTriangle, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';

const labels = {
 en: {
 title: 'Deleted Records Dashboard',
 subtitle: 'Analytics and insights for data governance and compliance',
 totalDeleted: 'Total Deleted',
 totalRestored: 'Total Restored',
 permanentlyDeleted: 'Permanently Deleted',
 recoveryRate: 'Recovery Rate',
 deletionTrends: 'Deletion Trends',
 deletionTrendsDesc: 'Daily deletion activity over the past 30 days',
 topDeleters: 'Top Deleters',
 topDeletersDesc: 'Users with the most deletion actions',
 entityDistribution: 'Entity Type Distribution',
 entityDistributionDesc: 'Breakdown of deleted records by entity type',
 topReasons: 'Top Deletion Reasons',
 topReasonsDesc: 'Most common reasons for record deletion',
 noData: 'No data available',
 noDataDesc: 'Deletion analytics will appear here once records are deleted',
 loading: 'Loading dashboard...',
 accessDenied: 'Access Denied',
 accessDeniedDesc: 'Platform administrator privileges required.',
 returnBtn: 'Return to Dashboard',
 last7: 'Last 7 days',
 last30: 'Last 30 days',
 last90: 'Last 90 days',
 allTime: 'All time',
 records: 'records',
 deletions: 'deletions',
 reason: 'Reason',
 count: 'Count',
 user: 'User',
 type: 'Type',
 },
 ar: {
 title: 'لوحة تحليلات السجلات المحذوفة',
 subtitle: 'تحليلات ورؤى لحوكمة البيانات والامتثال',
 totalDeleted: 'إجمالي المحذوفات',
 totalRestored: 'إجمالي المستعادة',
 permanentlyDeleted: 'المحذوفة نهائياً',
 recoveryRate: 'معدل الاستعادة',
 deletionTrends: 'اتجاهات الحذف',
 deletionTrendsDesc: 'نشاط الحذف اليومي خلال آخر 30 يوماً',
 topDeleters: 'أكثر المستخدمين حذفاً',
 topDeletersDesc: 'المستخدمون الذين لديهم أكبر عدد من عمليات الحذف',
 entityDistribution: 'توزيع أنواع الكيانات',
 entityDistributionDesc: 'تحليل السجلات المحذوفة حسب نوع الكيان',
 topReasons: 'أهم أسباب الحذف',
 topReasonsDesc: 'الأسباب الأكثر شيوعاً لحذف السجلات',
 noData: 'لا توجد بيانات متاحة',
 noDataDesc: 'ستظهر تحليلات الحذف هنا بمجرد حذف السجلات',
 loading: 'جاري تحميل لوحة التحكم...',
 accessDenied: 'تم رفض الوصول',
 accessDeniedDesc: 'مطلوب صلاحيات مسؤول المنصة.',
 returnBtn: 'العودة إلى لوحة التحكم',
 last7: 'آخر 7 أيام',
 last30: 'آخر 30 يوماً',
 last90: 'آخر 90 يوماً',
 allTime: 'كل الأوقات',
 records: 'سجل',
 deletions: 'عملية حذف',
 reason: 'السبب',
 count: 'العدد',
 user: 'المستخدم',
 type: 'النوع',
 },
};

// Simple bar chart component
function SimpleBarChart({ data, maxValue, color = 'bg-blue-500' }: { data: { label: string; value: number }[]; maxValue: number; color?: string }) {
 return (
 <div className="space-y-2" dir={isRTL ? 'rtl' : 'ltr'}>
 {data.map((item, idx) => (
 <div key={idx} className="flex items-center gap-3">
 <span className="text-xs text-gray-600 w-24 truncate text-end">{item.label}</span>
 <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
 <div
 className={`h-full ${color} rounded-full transition-all duration-500 flex items-center justify-end px-2`}
 style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%`, minWidth: item.value > 0 ? '2rem' : '0' }}
 >
 <span className="text-[10px] text-white font-medium">{item.value}</span>
 </div>
 </div>
 </div>
 ))}
 </div>
 );
}

// Simple donut chart
function SimpleDonut({ data, colors }: { data: { label: string; value: number }[]; colors: string[] }) {
 const total = data.reduce((sum, d) => sum + d.value, 0);
 if (total === 0) return <div className="text-center text-gray-400 py-8">No data</div>;

 let cumulativePercent = 0;
 const segments = data.map((d, i) => {
 const percent = (d.value / total) * 100;
 const startAngle = (cumulativePercent / 100) * 360;
 cumulativePercent += percent;
 return { ...d, percent, startAngle, color: colors[i % colors.length] };
 });

 return (
 <div className="flex items-center gap-6">
 <div className="relative w-32 h-32">
 <svg viewBox="0 0 36 36" className="w-full h-full">
 {segments.map((seg, i) => {
 const dashArray = `${seg.percent} ${100 - seg.percent}`;
 const dashOffset = i === 0 ? 25 : 25 - segments.slice(0, i).reduce((s, d) => s + d.percent, 0);
 return (
 <circle
 key={i}
 cx="18" cy="18" r="15.9155"
 fill="transparent"
 stroke={seg.color}
 strokeWidth="3.5"
 strokeDasharray={dashArray}
 strokeDashoffset={dashOffset}
 className="transition-all duration-500"
 />
 );
 })}
 <text x="18" y="17" textAnchor="middle" className="text-[5px] fill-gray-800 font-bold">{total}</text>
 <text x="18" y="21" textAnchor="middle" className="text-[2.5px] fill-gray-500">total</text>
 </svg>
 </div>
 <div className="space-y-1.5">
 {segments.map((seg, i) => (
 <div key={i} className="flex items-center gap-2">
 <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: seg.color }} />
 <span className="text-xs text-gray-700">{seg.label}</span>
 <span className="text-xs text-gray-500 font-medium">({seg.value})</span>
 </div>
 ))}
 </div>
 </div>
 );
}

// Trend line chart (simple)
function SimpleTrendLine({ data }: { data: { date: string; count: number }[] }) {
 if (data.length === 0) return <div className="text-center text-gray-400 py-8">No data</div>;
 const maxCount = Math.max(...data.map(d => d.count), 1);

 return (
 <div className="flex items-end gap-1 h-32">
 {data.map((d, i) => (
 <div key={i} className="flex-1 flex flex-col items-center gap-1">
 <div
 className="w-full bg-blue-400 rounded-t hover:bg-blue-500 transition-colors"
 style={{ height: `${(d.count / maxCount) * 100}%`, minHeight: d.count > 0 ? '4px' : '1px' }}
 title={`${d.date}: ${d.count}`}
 />
 {i % Math.ceil(data.length / 7) === 0 && (
 <span className="text-[9px] text-gray-400 whitespace-nowrap">{d.date.slice(5)}</span>
 )}
 </div>
 ))}
 </div>
 );
}

export default function DeletedRecordsDashboard() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const { user } = useAuth();
 const labels = language === 'ar' ? labels.ar : labels.en;
 const [timeRange, setTimeRange] = useState('30');

 const allowedRoles = ['platform_super_admin', 'platform_admin', 'platform_auditor', 'admin'];
 const hasAccess = user && allowedRoles.includes(user.role);

 // Fetch analytics data
 const { data: summary, isLoading: loadingSummary } = trpc.ims.deletedRecordsAnalytics.getDashboardSummary.useQuery(
 undefined,
 { enabled: !!hasAccess, retry: false }
 );

 const { data: trends, isLoading: loadingTrends } = trpc.ims.deletedRecordsAnalytics.getDeletionTrends.useQuery(
 { days: parseInt(timeRange) },
 { enabled: !!hasAccess, retry: false }
 );

 const { data: topDeleters } = trpc.ims.deletedRecordsAnalytics.getTopDeleters.useQuery(
 { limit: 5 },
 { enabled: !!hasAccess, retry: false }
 );

 const { data: entityTypes } = trpc.ims.deletedRecordsAnalytics.getTopDeletedEntityTypes.useQuery(
 { limit: 6 },
 { enabled: !!hasAccess, retry: false }
 );

 const { data: reasons } = trpc.ims.deletedRecordsAnalytics.getDeletionReasons.useQuery(
 { limit: 5 },
 { enabled: !!hasAccess, retry: false }
 );

 const { data: recoveryRate } = trpc.ims.deletedRecordsAnalytics.getRecoveryRate.useQuery(
 undefined,
 { enabled: !!hasAccess, retry: false }
 );

 if (!hasAccess) {
 return (
 <div className="flex items-center justify-center min-h-[60vh]">
 <div className="text-center bg-white rounded-2xl shadow-lg p-10 max-w-md">
 <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
 <AlertTriangle className="w-8 h-8 text-red-500" />
 </div>
 <h2 className="text-xl font-bold text-gray-900 mb-2">{labels.accessDenied}</h2>
 <p className="text-gray-600 mb-6">{labels.accessDeniedDesc}</p>
 <a href="/platform" className="inline-block bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition">
 {labels.returnBtn}
 </a>
 </div>
 </div>
 );
 }

 const summaryData = summary || { totalDeleted: 0, totalRestored: 0, permanentlyDeleted: 0, pendingPurge: 0 };
 const rate = recoveryRate || { rate: 0, totalActions: 0, restoreActions: 0 };

 return (
 <div className="p-6 max-w-[1400px] mx-auto">
 {/* Header */}
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
 <BarChart3 className="w-5 h-5 text-blue-600" />
 </div>
 <div>
 <h1 className="text-2xl font-bold text-gray-900">{labels.title}</h1>
 <p className="text-sm text-gray-500">{labels.subtitle}</p>
 </div>
 </div>
 <a
 href="/platform/audit/deleted-records"
 className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition"
 >
 <Trash2 className="w-4 h-4" />
 {t.platformModule.deletedRecords}
 </a>
 </div>

 {/* Summary Cards */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
 <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
 <div className="flex items-center justify-between mb-3">
 <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
 <Trash2 className="w-5 h-5 text-red-500" />
 </div>
 <ArrowUpRight className="w-4 h-4 text-red-400" />
 </div>
 <p className="text-2xl font-bold text-gray-900">{summaryData.totalDeleted}</p>
 <p className="text-sm text-gray-500">{labels.totalDeleted}</p>
 </div>

 <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
 <div className="flex items-center justify-between mb-3">
 <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
 <RotateCcw className="w-5 h-5 text-green-500" />
 </div>
 <ArrowDownRight className="w-4 h-4 text-green-400" />
 </div>
 <p className="text-2xl font-bold text-gray-900">{summaryData.totalRestored}</p>
 <p className="text-sm text-gray-500">{labels.totalRestored}</p>
 </div>

 <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
 <div className="flex items-center justify-between mb-3">
 <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
 <AlertTriangle className="w-5 h-5 text-gray-500" />
 </div>
 </div>
 <p className="text-2xl font-bold text-gray-900">{summaryData.permanentlyDeleted}</p>
 <p className="text-sm text-gray-500">{labels.permanentlyDeleted}</p>
 </div>

 <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
 <div className="flex items-center justify-between mb-3">
 <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
 <RefreshCw className="w-5 h-5 text-blue-500" />
 </div>
 </div>
 <p className="text-2xl font-bold text-gray-900">{typeof rate.rate === 'number' ? `${rate.rate.toFixed(1)}%` : '0%'}</p>
 <p className="text-sm text-gray-500">{labels.recoveryRate}</p>
 </div>
 </div>

 {/* Charts Grid */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
 {/* Deletion Trends */}
 <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
 <div className="flex items-center justify-between mb-4">
 <div>
 <h3 className="font-semibold text-gray-900">{labels.deletionTrends}</h3>
 <p className="text-xs text-gray-500">{labels.deletionTrendsDesc}</p>
 </div>
 <select
 value={timeRange}
 onChange={(e) => setTimeRange(e.target.value)}
 className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs"
 >
 <option value="7">{labels.last7}</option>
 <option value="30">{labels.last30}</option>
 <option value="90">{labels.last90}</option>
 </select>
 </div>
 {loadingTrends ? (
 <div className="flex items-center justify-center h-32">
 <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
 </div>
 ) : (
 <SimpleTrendLine data={Array.isArray(trends) ? trends : []} />
 )}
 </div>

 {/* Entity Type Distribution */}
 <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
 <div className="mb-4">
 <h3 className="font-semibold text-gray-900">{labels.entityDistribution}</h3>
 <p className="text-xs text-gray-500">{labels.entityDistributionDesc}</p>
 </div>
 <SimpleDonut
 data={Array.isArray(entityTypes) ? entityTypes.map((e: any) => ({ label: e.entityType || e.type || 'Unknown', value: e.count || 0 })) : []}
 colors={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']}
 />
 </div>

 {/* Top Deleters */}
 <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
 <div className="mb-4">
 <h3 className="font-semibold text-gray-900">{labels.topDeleters}</h3>
 <p className="text-xs text-gray-500">{labels.topDeletersDesc}</p>
 </div>
 <SimpleBarChart
 data={Array.isArray(topDeleters) ? topDeleters.map((d: any) => ({ label: d.userName || d.name || 'Unknown', value: d.count || 0 })) : []}
 maxValue={Array.isArray(topDeleters) && topDeleters.length > 0 ? Math.max(...topDeleters.map((d: any) => d.count || 0)) : 1}
 color="bg-indigo-500"
 />
 </div>

 {/* Top Deletion Reasons */}
 <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
 <div className="mb-4">
 <h3 className="font-semibold text-gray-900">{labels.topReasons}</h3>
 <p className="text-xs text-gray-500">{labels.topReasonsDesc}</p>
 </div>
 {Array.isArray(reasons) && reasons.length > 0 ? (
 <div className="space-y-3">
 {reasons.map((r: any, idx: number) => (
 <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
 <span className="text-sm text-gray-700 flex-1 truncate">{r.reason || 'No reason provided'}</span>
 <span className="text-sm font-semibold text-gray-900 bg-white px-3 py-1 rounded-full border border-gray-200">
 {r.count}
 </span>
 </div>
 ))}
 </div>
 ) : (
 <div className="text-center text-gray-400 py-8">{labels.noData}</div>
 )}
 </div>
 </div>
 </div>
 );
}
