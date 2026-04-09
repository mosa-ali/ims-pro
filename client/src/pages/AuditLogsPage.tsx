import { useState } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from '@/contexts/LanguageContext';
import { FileText, Filter, Download, Info, Search, Trash2, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format } from "date-fns";
import * as XLSX from 'xlsx';

/**
 * Audit Logs Page
 * Platform Admin only - Track all platform-level activities
 */
export default function AuditLogsPage() {
  const { language, isRTL } = useLanguage();
  const { t } = useTranslation();
  const isArabic = language === 'ar';

  const [page, setPage] = useState(0);
  const [limit] = useState(20);
  const [actionFilter, setActionFilter] = useState<string | undefined>(undefined);
  const [entityTypeFilter, setEntityTypeFilter] = useState<string | undefined>(undefined);
  const [isExporting, setIsExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState<string | undefined>(undefined);

  // Debounce search input
  const searchTimeoutRef = useState<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef[0]) clearTimeout(searchTimeoutRef[0]);
    searchTimeoutRef[0] = setTimeout(() => {
      setDebouncedSearch(value.trim() || undefined);
      setPage(0);
    }, 400);
  };

  const { data, isLoading } = trpc.ims.auditLogs.list.useQuery({
    limit,
    offset: page * limit,
    action: actionFilter,
    entityType: entityTypeFilter,
    search: debouncedSearch,
  });

  // Fetch all logs for export
  const { data: allLogsData } = trpc.ims.auditLogs.list.useQuery({
    limit: 10000, // Fetch up to 10k logs for export
    offset: 0,
    action: actionFilter,
    entityType: entityTypeFilter,
    search: debouncedSearch,
  }, {
    enabled: isExporting,
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const handlePreviousPage = () => {
    if (page > 0) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (page < totalPages - 1) setPage(page + 1);
  };

  const handleClearFilters = () => {
    setActionFilter(undefined);
    setEntityTypeFilter(undefined);
    setSearchQuery('');
    setDebouncedSearch(undefined);
    setPage(0);
  };

  const handleExportToExcel = async () => {
    try {
      setIsExporting(true);
      const exportLogs = allLogsData?.logs || logs;
      
      const excelData = exportLogs.map((log: any) => ({
        'Timestamp': log.createdAt ? format(new Date(log.createdAt), 'MMM dd, yyyy HH:mm:ss') : '-',
        'User': log.userName || 'Unknown',
        'Email': log.userEmail || '-',
        'Action': log.action,
        'Entity Type': log.entityType || '-',
        'Entity ID': log.entityId || '-',
        'Organization': log.organizationName || '-',
        'Operating Unit': log.operatingUnitName || '-',
        'IP Address': log.ipAddress || '-',
        'User Agent': log.userAgent || '-',
        'Details': log.details || '-',
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Logs');
      
      // Set column widths
      worksheet['!cols'] = [
        { wch: 20 },
        { wch: 15 },
        { wch: 25 },
        { wch: 15 },
        { wch: 15 },
        { wch: 12 },
        { wch: 20 },
        { wch: 20 },
        { wch: 15 },
        { wch: 30 },
        { wch: 30 },
      ];

      const fileName = `audit-logs-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes("create")) return "bg-green-50 text-green-700 border-green-200";
    if (action.includes("update")) return "bg-blue-50 text-blue-700 border-blue-200";
    if (action.includes("delete") || action.includes("soft_delete")) return "bg-red-50 text-red-700 border-red-200";
    if (action.includes("suspend")) return "bg-amber-50 text-amber-700 border-amber-200";
    if (action.includes("login")) return "bg-purple-50 text-purple-700 border-purple-200";
    return "bg-gray-50 text-gray-700 border-gray-200";
  };

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bg-white border-b border-gray-200">
        <div className="container py-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">
                {t.auditLogsPage?.auditLogs || (isArabic ? 'سجلات التدقيق' : 'Audit Logs')}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {isArabic ? 'عرض جميع أنشطة المنصة على مستوى الإدارة' : 'View all platform-level administration activities'}
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
                {isArabic
                  ? 'يتم تسجيل جميع إجراءات المنصة تلقائيًا لأغراض الامتثال والأمان. البيانات المعروضة هي بيانات حقيقية من قاعدة البيانات.'
                  : 'All platform actions are automatically logged for compliance and security purposes. Data shown is real from the database.'}
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
              {(actionFilter || entityTypeFilter || searchQuery) && (
                <Button variant="outline" size="sm" onClick={handleClearFilters}>
                  {isArabic ? 'مسح الفلاتر' : 'Clear Filters'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Search by user name/email */}
            <div className="mb-4">
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                {isArabic ? 'بحث باسم المستخدم أو البريد الإلكتروني' : 'Search by User Name or Email'}
              </label>
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder={isArabic ? 'ابحث عن مستخدم...' : 'Search for a user...'}
                  className="w-full ps-10 pe-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  {isArabic ? 'الإجراء' : 'Action'}
                </label>
                <Select
                  value={actionFilter || "all"}
                  onValueChange={(v) => {
                    setActionFilter(v === "all" ? undefined : v);
                    setPage(0);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isArabic ? 'جميع الإجراءات' : 'All Actions'}</SelectItem>
                    <SelectItem value="create_organization">{isArabic ? 'إنشاء منظمة' : 'Create Organization'}</SelectItem>
                    <SelectItem value="update_organization">{isArabic ? 'تحديث منظمة' : 'Update Organization'}</SelectItem>
                    <SelectItem value="soft_delete">{isArabic ? 'حذف ناعم' : 'Soft Delete'}</SelectItem>
                    <SelectItem value="project_status_changed">{isArabic ? 'تغيير حالة المشروع' : 'Project Status Changed'}</SelectItem>
                    <SelectItem value="login">{isArabic ? 'تسجيل دخول' : 'Login'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  {isArabic ? 'نوع الكيان' : 'Entity Type'}
                </label>
                <Select
                  value={entityTypeFilter || "all"}
                  onValueChange={(v) => {
                    setEntityTypeFilter(v === "all" ? undefined : v);
                    setPage(0);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isArabic ? 'جميع الأنواع' : 'All Types'}</SelectItem>
                    <SelectItem value="organization">{isArabic ? 'منظمة' : 'Organization'}</SelectItem>
                    <SelectItem value="user">{isArabic ? 'مستخدم' : 'User'}</SelectItem>
                    <SelectItem value="operating_unit">{isArabic ? 'وحدة تشغيلية' : 'Operating Unit'}</SelectItem>
                    <SelectItem value="settings">{isArabic ? 'إعدادات' : 'Settings'}</SelectItem>
                    <SelectItem value="project">{isArabic ? 'مشروع' : 'Project'}</SelectItem>
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
                <FileText className="w-5 h-5 text-gray-600" />
                <div>
                  <CardTitle>{isArabic ? 'سجلات التدقيق' : 'Audit Logs'}</CardTitle>
                  <CardDescription>
                    {isArabic ? `إجمالي ${total} سجل` : `Total ${total} logs`}
                  </CardDescription>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportToExcel}
                disabled={isLoading || isExporting || logs.length === 0}
              >
                <Download className="w-4 h-4 me-2" />
                {isExporting ? (isArabic ? 'جاري التصدير...' : 'Exporting...') : (isArabic ? 'تصدير إكسل' : 'Export Excel')}
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
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {isArabic ? 'لا توجد سجلات' : 'No Logs Found'}
                </h3>
                <p className="text-sm text-gray-500">
                  {isArabic
                    ? 'لم يتم العثور على سجلات تدقيق تطابق المعايير المحددة.'
                    : 'No audit logs found matching the specified criteria.'}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-start text-xs font-semibold text-gray-600 uppercase">
                          {isArabic ? 'الوقت' : 'Time'}
                        </th>
                        <th className="px-4 py-3 text-start text-xs font-semibold text-gray-600 uppercase">
                          {isArabic ? 'المستخدم' : 'User'}
                        </th>
                        <th className="px-4 py-3 text-start text-xs font-semibold text-gray-600 uppercase">
                          {isArabic ? 'الإجراء' : 'Action'}
                        </th>
                        <th className="px-4 py-3 text-start text-xs font-semibold text-gray-600 uppercase">
                          {isArabic ? 'نوع الكيان' : 'Entity Type'}
                        </th>
                        <th className="px-4 py-3 text-start text-xs font-semibold text-gray-600 uppercase">
                          {isArabic ? 'المنظمة' : 'Organization'}
                        </th>
                        <th className="px-4 py-3 text-start text-xs font-semibold text-gray-600 uppercase">
                          {isArabic ? 'الوحدة التشغيلية' : 'Operating Unit'}
                        </th>
                        <th className="px-4 py-3 text-start text-xs font-semibold text-gray-600 uppercase">
                          {isArabic ? 'عنوان IP' : 'IP Address'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {logs.map((log: any) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {log.createdAt ? format(new Date(log.createdAt), 'MMM dd, HH:mm') : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div>
                              <div className="font-medium text-gray-900">{log.userName || 'Unknown'}</div>
                              <div className="text-xs text-gray-500">{log.userEmail || '-'}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={getActionBadgeColor(log.action)}>
                              {log.action}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{log.entityType || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{log.organizationName || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{log.operatingUnitName || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 font-mono text-xs">{log.ipAddress || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    {isArabic 
                      ? `الصفحة ${page + 1} من ${totalPages} (${logs.length} سجل)`
                      : `Page ${page + 1} of ${totalPages} (${logs.length} logs)`
                    }
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousPage}
                      disabled={page === 0}
                    >
                      {isArabic ? 'التالي' : 'Previous'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={page >= totalPages - 1}
                    >
                      {isArabic ? 'السابق' : 'Next'}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        {/* Retention Policy Section */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-gray-600" />
              <div>
                <CardTitle>{isArabic ? 'سياسة الاحتفاظ بالسجلات' : 'Log Retention Policy'}</CardTitle>
                <CardDescription>{isArabic ? 'إدارة أرشفة وحذف السجلات القديمة' : 'Manage archival and deletion of old audit logs'}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <RetentionPolicySection isArabic={isArabic} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Retention Policy sub-component
 */
function RetentionPolicySection({ isArabic }: { isArabic: boolean }) {
  const [retentionDays, setRetentionDays] = useState(180);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.ims.auditLogs.retentionStats.useQuery();
  const utils = trpc.useUtils();

  const applyRetention = trpc.ims.auditLogs.applyRetention.useMutation({
    onSuccess: (result) => {
      toast.success(
        isArabic
          ? `تم حذف ${result.deletedCount} سجل أقدم من ${result.retentionDays} يوم`
          : `Deleted ${result.deletedCount} logs older than ${result.retentionDays} days`
      );
      refetchStats();
      utils.ims.auditLogs.list.invalidate();
      setIsDeleting(false);
    },
    onError: (error) => {
      toast.error(isArabic ? 'فشل تطبيق سياسة الاحتفاظ' : 'Failed to apply retention policy');
      setIsDeleting(false);
    },
  });

  const handleApplyRetention = () => {
    setIsDeleting(true);
    applyRetention.mutate({ retentionDays });
  };

  if (statsLoading) {
    return (
      <div className="text-center py-6">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-sm text-gray-500">{isArabic ? 'جارٍ تحميل الإحصائيات...' : 'Loading statistics...'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{stats?.total || 0}</div>
          <div className="text-xs text-gray-500 mt-1">{isArabic ? 'إجمالي السجلات' : 'Total Logs'}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-700">{stats?.last30Days || 0}</div>
          <div className="text-xs text-gray-500 mt-1">{isArabic ? 'آخر 30 يوم' : 'Last 30 Days'}</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">{stats?.last90Days || 0}</div>
          <div className="text-xs text-gray-500 mt-1">{isArabic ? 'آخر 90 يوم' : 'Last 90 Days'}</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-amber-700">{stats?.last180Days || 0}</div>
          <div className="text-xs text-gray-500 mt-1">{isArabic ? 'آخر 180 يوم' : 'Last 180 Days'}</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-700">{stats?.olderThan180Days || 0}</div>
          <div className="text-xs text-gray-500 mt-1">{isArabic ? 'أقدم من 180 يوم' : 'Older than 180 Days'}</div>
        </div>
      </div>

      {stats?.oldestLogDate && (
        <p className="text-sm text-gray-500">
          {isArabic ? 'أقدم سجل: ' : 'Oldest log: '}
          <span className="font-medium">{format(new Date(stats.oldestLogDate), 'MMM dd, yyyy')}</span>
        </p>
      )}

      {/* Retention Action */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <h4 className="font-semibold text-amber-900">
              {isArabic ? 'تطبيق سياسة الاحتفاظ' : 'Apply Retention Policy'}
            </h4>
            <p className="text-sm text-amber-700 mt-1">
              {isArabic
                ? 'حذف سجلات التدقيق الأقدم من عدد الأيام المحدد. هذا الإجراء لا يمكن التراجع عنه.'
                : 'Delete audit logs older than the specified number of days. This action cannot be undone.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={String(retentionDays)}
              onValueChange={(v) => setRetentionDays(Number(v))}
            >
              <SelectTrigger className="w-[140px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">{isArabic ? '30 يوم' : '30 Days'}</SelectItem>
                <SelectItem value="60">{isArabic ? '60 يوم' : '60 Days'}</SelectItem>
                <SelectItem value="90">{isArabic ? '90 يوم' : '90 Days'}</SelectItem>
                <SelectItem value="180">{isArabic ? '180 يوم' : '180 Days'}</SelectItem>
                <SelectItem value="365">{isArabic ? '365 يوم' : '365 Days'}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleApplyRetention}
              disabled={isDeleting}
            >
              <Trash2 className="w-4 h-4 me-2" />
              {isDeleting
                ? (isArabic ? 'جارٍ الحذف...' : 'Deleting...')
                : (isArabic ? 'تطبيق' : 'Apply')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
