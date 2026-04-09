import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { FileSearch, Filter, Download, Info } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { BackButton } from "@/components/BackButton";

export default function PlatformAuditLogsPage() {
 const { language, direction, isRTL} = useLanguage();
 const isArabic = language === 'ar';

 const [page, setPage] = useState(0);
 const [limit] = useState(20);
 const [actionFilter, setActionFilter] = useState<string | undefined>(undefined);
 const [entityTypeFilter, setEntityTypeFilter] = useState<string | undefined>(undefined);

 const { data, isLoading } = trpc.ims.auditLogs.list.useQuery({
 limit,
 offset: page * limit,
 action: actionFilter,
 entityType: entityTypeFilter,
 });

 const logs = data?.logs || [];
 const total = data?.total || 0;
 const totalPages = Math.ceil(total / limit);

 const handlePreviousPage = () => { if (page > 0) setPage(page - 1); };
 const handleNextPage = () => { if (page < totalPages - 1) setPage(page + 1); };
 const handleClearFilters = () => { setActionFilter(undefined); setEntityTypeFilter(undefined); setPage(0); };

 const getActionBadgeColor = (action: string) => {
 if (action.includes("create")) return "bg-green-50 text-green-700 border-green-200";
 if (action.includes("update")) return "bg-blue-50 text-blue-700 border-blue-200";
 if (action.includes("delete")) return "bg-red-50 text-red-700 border-red-200";
 if (action.includes("suspend")) return "bg-amber-50 text-amber-700 border-amber-200";
 return "bg-gray-50 text-gray-700 border-gray-200";
 };

 return (
 <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="bg-white border-b border-gray-200">
 <div className="container py-6">
 <div className="flex items-center gap-4 mb-4">
 <BackButton href="~/platform/settings" iconOnly />
 <div className="flex-1">
 <h1 className="text-2xl font-bold text-gray-900">
 {isArabic ? 'التدقيق والامتثال' : 'Audit & Compliance'}
 </h1>
 <p className="text-sm text-gray-500 mt-1">
 {isArabic ? 'عرض سجل التدقيق على مستوى المنصة' : 'View platform-level audit trail'}
 </p>
 </div>
 <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
 {isArabic ? 'بيانات حقيقية' : 'Real Data'}
 </Badge>
 </div>
 </div>
 </div>

 <div className="container py-8">
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
 <div className="flex items-start gap-3">
 <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
 <div className="flex-1">
 <h3 className="font-semibold text-blue-900 mb-1">
 {isArabic ? 'سجل التدقيق المباشر' : 'Live Audit Trail'}
 </h3>
 <p className="text-sm text-blue-700">
 {isArabic ? 'يتم تسجيل جميع إجراءات المنصة تلقائيًا لأغراض الامتثال والأمان. البيانات المعروضة هي بيانات حقيقية من قاعدة البيانات.' : 'All platform actions are automatically logged for compliance and security purposes. Data shown is real from the database.'}
 </p>
 </div>
 </div>
 </div>

 <Card className="mb-6">
 <CardHeader>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <Filter className="w-5 h-5 text-gray-600" />
 <div>
 <CardTitle>{isArabic ? 'تصفية السجلات' : 'Filter Logs'}</CardTitle>
 <CardDescription>{isArabic ? 'تصفية سجلات التدقيق حسب الإجراء أو نوع الكيان' : 'Filter audit logs by action or entity type'}</CardDescription>
 </div>
 </div>
 {(actionFilter || entityTypeFilter) && (
 <Button variant="outline" size="sm" onClick={handleClearFilters}>
 {isArabic ? 'مسح الفلاتر' : 'Clear Filters'}
 </Button>
 )}
 </div>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="text-sm font-semibold text-gray-700 mb-2 block">{isArabic ? 'الإجراء' : 'Action'}</label>
 <Select value={actionFilter || "all"} onValueChange={(v) => { setActionFilter(v === "all" ? undefined : v); setPage(0); }}>
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{isArabic ? 'جميع الإجراءات' : 'All Actions'}</SelectItem>
 <SelectItem value="create_organization">{isArabic ? 'إنشاء منظمة' : 'Create Organization'}</SelectItem>
 <SelectItem value="update_organization">{isArabic ? 'تحديث منظمة' : 'Update Organization'}</SelectItem>
 <SelectItem value="delete_organization">{isArabic ? 'حذف منظمة' : 'Delete Organization'}</SelectItem>
 <SelectItem value="create_user">{isArabic ? 'إنشاء مستخدم' : 'Create User'}</SelectItem>
 <SelectItem value="update_user">{isArabic ? 'تحديث مستخدم' : 'Update User'}</SelectItem>
 <SelectItem value="delete_user">{isArabic ? 'حذف مستخدم' : 'Delete User'}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div>
 <label className="text-sm font-semibold text-gray-700 mb-2 block">{isArabic ? 'نوع الكيان' : 'Entity Type'}</label>
 <Select value={entityTypeFilter || "all"} onValueChange={(v) => { setEntityTypeFilter(v === "all" ? undefined : v); setPage(0); }}>
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{isArabic ? 'جميع الأنواع' : 'All Types'}</SelectItem>
 <SelectItem value="organization">{isArabic ? 'منظمة' : 'Organization'}</SelectItem>
 <SelectItem value="user">{isArabic ? 'مستخدم' : 'User'}</SelectItem>
 <SelectItem value="operating_unit">{isArabic ? 'وحدة تشغيلية' : 'Operating Unit'}</SelectItem>
 <SelectItem value="settings">{isArabic ? 'إعدادات' : 'Settings'}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 </CardContent>
 </Card>

 <Card>
 <CardHeader>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <FileSearch className="w-5 h-5 text-gray-600" />
 <div>
 <CardTitle>{isArabic ? 'سجلات التدقيق' : 'Audit Logs'}</CardTitle>
 <CardDescription>{isArabic ? `إجمالي ${total} سجل` : `Total ${total} logs`}</CardDescription>
 </div>
 </div>
 <Button variant="outline" size="sm" disabled>
 <Download className="w-4 h-4 me-2" />
 {isArabic ? 'تصدير' : 'Export'}
 </Button>
 </div>
 </CardHeader>
 <CardContent>
 {isLoading ? (
 <div className="text-center py-12">
 <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
 <p className="text-gray-600">{isArabic ? 'جارٍ التحميل...' : 'Loading...'}</p>
 </div>
 ) : logs.length === 0 ? (
 <div className="text-center py-12">
 <FileSearch className="w-12 h-12 text-gray-400 mx-auto mb-4" />
 <h3 className="text-lg font-semibold text-gray-900 mb-2">{isArabic ? 'لا توجد سجلات' : 'No Logs Found'}</h3>
 <p className="text-sm text-gray-500">{isArabic ? 'لم يتم العثور على سجلات تدقيق تطابق المعايير المحددة.' : 'No audit logs found matching the specified criteria.'}</p>
 </div>
 ) : (
 <>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className="px-4 py-3 text-start text-xs font-semibold text-gray-600 uppercase">{isArabic ? 'الوقت' : 'Time'}</th>
 <th className="px-4 py-3 text-start text-xs font-semibold text-gray-600 uppercase">{isArabic ? 'الإجراء' : 'Action'}</th>
 <th className="px-4 py-3 text-start text-xs font-semibold text-gray-600 uppercase">{isArabic ? 'نوع الكيان' : 'Entity Type'}</th>
 <th className="px-4 py-3 text-start text-xs font-semibold text-gray-600 uppercase">{isArabic ? 'معرف الكيان' : 'Entity ID'}</th>
 <th className="px-4 py-3 text-start text-xs font-semibold text-gray-600 uppercase">{isArabic ? 'المستخدم' : 'User'}</th>
 <th className="px-4 py-3 text-start text-xs font-semibold text-gray-600 uppercase">{isArabic ? 'التفاصيل' : 'Details'}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {logs.map((log) => (
 <tr key={log.id} className="hover:bg-gray-50">
 <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
 {log.createdAt ? format(new Date(log.createdAt), 'MMM dd, HH:mm') : '-'}
 </td>
 <td className="px-4 py-3">
 <Badge variant="outline" className={getActionBadgeColor(log.action)}>{log.action}</Badge>
 </td>
 <td className="px-4 py-3 text-sm text-gray-700">{log.entityType || '-'}</td>
 <td className="px-4 py-3 text-sm text-gray-700">{log.entityId || '-'}</td>
 <td className="px-4 py-3 text-sm text-gray-700">{log.userId || '-'}</td>
 <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{log.details || '-'}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 <div className="flex items-center justify-between mt-6 pt-4 border-t">
 <div className="text-sm text-gray-600">
 {isArabic ? `عرض ${page * limit + 1} إلى ${Math.min((page + 1) * limit, total)} من ${total}` : `Showing ${page * limit + 1} to ${Math.min((page + 1) * limit, total)} of ${total}`}
 </div>
 <div className="flex items-center gap-2">
 <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={page === 0}>{isArabic ? 'السابق' : 'Previous'}</Button>
 <span className="text-sm text-gray-600">{isArabic ? `صفحة ${page + 1} من ${totalPages}` : `Page ${page + 1} of ${totalPages}`}</span>
 <Button variant="outline" size="sm" onClick={handleNextPage} disabled={page >= totalPages - 1}>{isArabic ? 'التالي' : 'Next'}</Button>
 </div>
 </div>
 </>
 )}
 </CardContent>
 </Card>

 <div className="mt-6 text-center text-sm text-gray-500">
 <p>{isArabic ? 'يتم الاحتفاظ بسجلات التدقيق لمدة 7 سنوات لأغراض الامتثال.' : 'Audit logs are retained for 7 years for compliance purposes.'}</p>
 </div>
 </div>
 </div>
 );
}
