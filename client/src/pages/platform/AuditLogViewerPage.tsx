import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import { Shield, Search, Download, Filter, Calendar, User, FileText, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';

const labels = {
 en: {
 title: 'Audit Log Viewer',
 subtitle: 'Track all platform administrator activities and system events',
 search: 'Search audit logs...',
 filterAction: 'All Actions',
 filterUser: 'All Users',
 filterEntity: 'All Entity Types',
 dateFrom: 'From',
 dateTo: 'To',
 export: 'Export CSV',
 noResults: 'No audit logs found',
 noResultsDesc: 'Try adjusting your filters or date range',
 timestamp: 'Timestamp',
 user: 'User',
 action: 'Action',
 entityType: 'Entity Type',
 entityId: 'Entity ID',
 details: 'Details',
 loading: 'Loading audit logs...',
 accessDenied: 'Access Denied',
 accessDeniedDesc: 'Platform administrator privileges required.',
 returnBtn: 'Return to Dashboard',
 showing: 'Showing',
 of: 'of',
 records: 'records',
 page: 'Page',
 prev: 'Previous',
 next: 'Next',
 },
 ar: {
 title: 'عارض سجلات التدقيق',
 subtitle: 'تتبع جميع أنشطة مسؤولي المنصة وأحداث النظام',
 search: 'البحث في سجلات التدقيق...',
 filterAction: 'جميع الإجراءات',
 filterUser: 'جميع المستخدمين',
 filterEntity: 'جميع أنواع الكيانات',
 dateFrom: 'من',
 dateTo: 'إلى',
 export: 'تصدير CSV',
 noResults: 'لم يتم العثور على سجلات تدقيق',
 noResultsDesc: 'حاول تعديل الفلاتر أو النطاق الزمني',
 timestamp: 'الطابع الزمني',
 user: 'المستخدم',
 action: 'الإجراء',
 entityType: 'نوع الكيان',
 entityId: 'معرف الكيان',
 details: 'التفاصيل',
 loading: 'جاري تحميل سجلات التدقيق...',
 accessDenied: 'تم رفض الوصول',
 accessDeniedDesc: 'مطلوب صلاحيات مسؤول المنصة.',
 returnBtn: 'العودة إلى لوحة التحكم',
 showing: 'عرض',
 of: 'من',
 records: 'سجل',
 page: 'صفحة',
 prev: 'السابق',
 next: 'التالي',
 },
};

const ACTION_TYPES = [
 { value: '', en: 'All Actions', ar: 'جميع الإجراءات' },
 { value: 'CREATE', en: 'Create', ar: 'إنشاء' },
 { value: 'UPDATE', en: 'Update', ar: 'تحديث' },
 { value: 'DELETE', en: 'Delete', ar: 'حذف' },
 { value: 'RESTORE', en: 'Restore', ar: 'استعادة' },
 { value: 'PERMANENT_DELETE', en: 'Permanent Delete', ar: 'حذف نهائي' },
 { value: 'ROLE_CHANGE', en: 'Role Change', ar: 'تغيير الدور' },
 { value: 'LOGIN', en: 'Login', ar: 'تسجيل دخول' },
 { value: 'LOGOUT', en: 'Logout', ar: 'تسجيل خروج' },
 { value: 'POLICY_CHANGE', en: 'Policy Change', ar: 'تغيير السياسة' },
 { value: 'BULK_DELETE', en: 'Bulk Delete', ar: 'حذف جماعي' },
];

const ENTITY_TYPES = [
 { value: '', en: 'All Entity Types', ar: 'جميع أنواع الكيانات' },
 { value: 'user', en: 'User', ar: 'مستخدم' },
 { value: 'organization', en: 'Organization', ar: 'منظمة' },
 { value: 'project', en: 'Project', ar: 'مشروع' },
 { value: 'operating_unit', en: 'Operating Unit', ar: 'وحدة تشغيلية' },
 { value: 'platform_admin', en: 'Platform Admin', ar: 'مسؤول المنصة' },
 { value: 'retention_policy', en: 'Retention Policy', ar: 'سياسة الاحتفاظ' },
 { value: 'system_settings', en: 'System Settings', ar: 'إعدادات النظام' },
];

const ACTION_COLORS: Record<string, string> = {
 CREATE: 'bg-green-100 text-green-700',
 UPDATE: 'bg-blue-100 text-blue-700',
 DELETE: 'bg-red-100 text-red-700',
 RESTORE: 'bg-emerald-100 text-emerald-700',
 PERMANENT_DELETE: 'bg-red-200 text-red-800',
 ROLE_CHANGE: 'bg-purple-100 text-purple-700',
 LOGIN: 'bg-gray-100 text-gray-700',
 LOGOUT: 'bg-gray-100 text-gray-600',
 POLICY_CHANGE: 'bg-amber-100 text-amber-700',
 BULK_DELETE: 'bg-red-100 text-red-700',
};

interface AuditLog {
 id: number;
 userId: number | null;
 userName: string | null;
 action: string;
 entityType: string | null;
 entityId: string | null;
 details: string | null;
 ipAddress: string | null;
 organizationId: number | null;
 operatingUnitId: number | null;
 createdAt: string | number;
}

const PAGE_SIZE = 25;

export default function AuditLogViewerPage() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const { user } = useAuth();
 const labels = language === 'ar' ? labels.ar : labels.en;

 const [searchQuery, setSearchQuery] = useState('');
 const [actionFilter, setActionFilter] = useState('');
 const [entityFilter, setEntityFilter] = useState('');
 const [dateFrom, setDateFrom] = useState('');
 const [dateTo, setDateTo] = useState('');
 const [currentPage, setCurrentPage] = useState(1);

 // RBAC check
 const allowedRoles = ['platform_super_admin', 'platform_admin', 'platform_auditor', 'admin'];
 const hasAccess = user && allowedRoles.includes(user.role);

 // Fetch audit logs
 const { data: auditLogs, isLoading } = trpc.ims.auditLogs.list.useQuery(
 { limit: 100 },
 { enabled: !!hasAccess }
 );

 // Filter and search
 const filteredLogs = useMemo(() => {
 if (!auditLogs) return [];
 let logs = Array.isArray(auditLogs) ? auditLogs : (auditLogs as any)?.logs || [];

 if (searchQuery) {
 const q = searchQuery.toLowerCase();
 logs = logs.filter((log: AuditLog) =>
 (log.userName?.toLowerCase().includes(q)) ||
 (log.action?.toLowerCase().includes(q)) ||
 (log.entityType?.toLowerCase().includes(q)) ||
 (log.details?.toLowerCase().includes(q)) ||
 (log.entityId?.toLowerCase().includes(q))
 );
 }

 if (actionFilter) {
 logs = logs.filter((log: AuditLog) => log.action === actionFilter);
 }

 if (entityFilter) {
 logs = logs.filter((log: AuditLog) => log.entityType === entityFilter);
 }

 if (dateFrom) {
 const fromTs = new Date(dateFrom).getTime();
 logs = logs.filter((log: AuditLog) => {
 const logTs = typeof log.createdAt === 'number' ? log.createdAt : new Date(log.createdAt).getTime();
 return logTs >= fromTs;
 });
 }

 if (dateTo) {
 const toTs = new Date(dateTo).getTime() + 86400000;
 logs = logs.filter((log: AuditLog) => {
 const logTs = typeof log.createdAt === 'number' ? log.createdAt : new Date(log.createdAt).getTime();
 return logTs <= toTs;
 });
 }

 return logs;
 }, [auditLogs, searchQuery, actionFilter, entityFilter, dateFrom, dateTo]);

 const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE);
 const paginatedLogs = filteredLogs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

 const formatDate = (ts: string | number) => {
 const date = typeof ts === 'number' ? new Date(ts) : new Date(ts);
 return date.toLocaleString(t.platformModule.enus, {
 year: 'numeric', month: 'short', day: 'numeric',
 hour: '2-digit', minute: '2-digit', second: '2-digit',
 });
 };

 const handleExportCSV = () => {
 const headers = ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID', 'Details'];
 const rows = filteredLogs.map((log: AuditLog) => [
 formatDate(log.createdAt),
 log.userName || 'System',
 log.action,
 log.entityType || '-',
 log.entityId || '-',
 (log.details || '').replace(/"/g, '""'),
 ]);

 const csv = [
 headers.join(','),
 ...rows.map((row: string[]) => row.map((cell: string) => `"${cell}"`).join(',')),
 ].join('\n');

 const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
 const url = URL.createObjectURL(blob);
 const link = document.createElement('a');
 link.href = url;
 link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
 link.click();
 URL.revokeObjectURL(url);
 };

 if (!hasAccess) {
 return (
 <div className="flex items-center justify-center min-h-[60vh]" dir={isRTL ? 'rtl' : 'ltr'}>
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

 return (
 <div className="p-6 max-w-[1400px] mx-auto">
 {/* Header */}
 <div className="mb-6">
 <div className="flex items-center gap-3 mb-2">
 <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
 <FileText className="w-5 h-5 text-indigo-600" />
 </div>
 <div>
 <h1 className="text-2xl font-bold text-gray-900">{labels.title}</h1>
 <p className="text-sm text-gray-500">{labels.subtitle}</p>
 </div>
 </div>
 </div>

 {/* Filters Bar */}
 <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
 {/* Search */}
 <div className="lg:col-span-2 relative">
 <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 ${'start-3'}`} />
 <input
 type="text"
 placeholder={labels.search}
 value={searchQuery}
 onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
 className={`w-full border border-gray-200 rounded-lg py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ps-10 pe-3`}
 />
 </div>

 {/* Action Filter */}
 <select
 value={actionFilter}
 onChange={(e) => { setActionFilter(e.target.value); setCurrentPage(1); }}
 className="border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
 >
 {ACTION_TYPES.map((a) => (
 <option key={a.value} value={a.value}>{language === 'ar' ? a.ar : a.en}</option>
 ))}
 </select>

 {/* Entity Type Filter */}
 <select
 value={entityFilter}
 onChange={(e) => { setEntityFilter(e.target.value); setCurrentPage(1); }}
 className="border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
 >
 {ENTITY_TYPES.map((e) => (
 <option key={e.value} value={e.value}>{language === 'ar' ? e.ar : e.en}</option>
 ))}
 </select>

 {/* Date From */}
 <div className="relative">
 <label className="absolute -top-2 start-2 bg-white px-1 text-xs text-gray-500">{labels.dateFrom}</label>
 <input
 type="date"
 value={dateFrom}
 onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
 className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
 />
 </div>

 {/* Date To */}
 <div className="relative">
 <label className="absolute -top-2 start-2 bg-white px-1 text-xs text-gray-500">{labels.dateTo}</label>
 <input
 type="date"
 value={dateTo}
 onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
 className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
 />
 </div>
 </div>
 </div>

 {/* Actions Bar */}
 <div className="flex items-center justify-between mb-4">
 <p className="text-sm text-gray-600">
 {labels.showing} <span className="font-semibold">{paginatedLogs.length}</span> {labels.of} <span className="font-semibold">{filteredLogs.length}</span> {labels.records}
 </p>
 <button
 onClick={handleExportCSV}
 disabled={filteredLogs.length === 0}
 className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
 >
 <Download className="w-4 h-4" />
 {labels.export}
 </button>
 </div>

 {/* Table */}
 <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
 {isLoading ? (
 <div className="flex items-center justify-center py-20">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
 <span className={`text-gray-500 ms-3`}>{labels.loading}</span>
 </div>
 ) : paginatedLogs.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-20">
 <FileText className="w-12 h-12 text-gray-300 mb-3" />
 <h3 className="text-lg font-semibold text-gray-700 mb-1">{labels.noResults}</h3>
 <p className="text-sm text-gray-500">{labels.noResultsDesc}</p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="bg-gray-50 border-b border-gray-200">
 <th className={`py-3 px-4 font-semibold text-gray-600 text-start`}>{labels.timestamp}</th>
 <th className={`py-3 px-4 font-semibold text-gray-600 text-start`}>{labels.user}</th>
 <th className={`py-3 px-4 font-semibold text-gray-600 text-start`}>{labels.action}</th>
 <th className={`py-3 px-4 font-semibold text-gray-600 text-start`}>{labels.entityType}</th>
 <th className={`py-3 px-4 font-semibold text-gray-600 text-start`}>{labels.entityId}</th>
 <th className={`py-3 px-4 font-semibold text-gray-600 text-start`}>{labels.details}</th>
 </tr>
 </thead>
 <tbody>
 {paginatedLogs.map((log: AuditLog, idx: number) => (
 <tr key={log.id || idx} className="border-b border-gray-100 hover:bg-gray-50 transition">
 <td className="py-3 px-4 text-gray-600 whitespace-nowrap text-xs">{formatDate(log.createdAt)}</td>
 <td className="py-3 px-4">
 <div className="flex items-center gap-2">
 <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center">
 <User className="w-3.5 h-3.5 text-indigo-600" />
 </div>
 <span className="font-medium text-gray-800 text-xs">{log.userName || 'System'}</span>
 </div>
 </td>
 <td className="py-3 px-4">
 <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700'}`}>
 {log.action}
 </span>
 </td>
 <td className="py-3 px-4 text-gray-600 text-xs">{log.entityType || '-'}</td>
 <td className="py-3 px-4 text-gray-500 text-xs font-mono">{log.entityId || '-'}</td>
 <td className="py-3 px-4 text-gray-600 text-xs max-w-xs truncate" title={log.details || ''}>
 {log.details || '-'}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>

 {/* Pagination */}
 {totalPages > 1 && (
 <div className="flex items-center justify-between mt-4">
 <p className="text-sm text-gray-500">
 {labels.page} {currentPage} {labels.of} {totalPages}
 </p>
 <div className="flex items-center gap-2">
 <button
 onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
 disabled={currentPage === 1}
 className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"

 >
 {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
 {labels.prev}
 </button>
 <button
 onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
 disabled={currentPage === totalPages}
 className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {labels.next}
 {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
 </button>
 </div>
 </div>
 )}
 </div>
 );
}
