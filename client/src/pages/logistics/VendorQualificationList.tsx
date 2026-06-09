/**
 * Vendor Qualification List Page
 * 
 * Entry point from the Evaluation & Performance Hub → Vendor Qualification Checklist card.
 * Shows a table of all vendor master records with their qualification status,
 * scores, and action buttons (Evaluate / View / Edit).
 * 
 * Route: /organization/logistics/evaluation-performance/qualification-list
 */
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useSearch } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ClipboardCheck,
  Search,
  Eye,
  Pencil,
  FileCheck,
  Filter,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  FileQuestion,
  Loader2,
  CalendarClock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileSpreadsheet,
  FileDown,
  Save,
  FolderOpen,
  RotateCcw,
  Lock,
} from 'lucide-react';
import { BackButton } from "@/components/BackButton";
import { useNavigate, useLocation } from '@/lib/router-compat';
import { useTranslation } from '@/i18n/useTranslation';

type QualificationStatusFilter = 'all' | 'not_evaluated' | 'draft' | 'qualified' | 'conditional' | 'not_qualified' | 'rejected';
type VendorTypeFilter = 'all' | 'supplier' | 'contractor' | 'service_provider' | 'consultant' | 'other';

function getStatusBadge(status: string, isRTL: boolean) {

  const { t } = useTranslation();  switch (status) {
    case 'qualified':
      return (
        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1">
          <CheckCircle2 className="w-3 h-3" />
          {isRTL ? 'مؤهل' : 'Qualified'}
        </Badge>
      );
    case 'conditional':
      return (
        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 gap-1">
          <AlertTriangle className="w-3 h-3" />
          {isRTL ? 'مشروط' : 'Conditional'}
        </Badge>
      );
    case 'not_qualified':
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 gap-1">
          <XCircle className="w-3 h-3" />
          {isRTL ? 'غير مؤهل' : 'Not Qualified'}
        </Badge>
      );
    case 'draft':
      return (
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 gap-1">
          <Clock className="w-3 h-3" />
          {isRTL ? 'مسودة' : 'Draft'}
        </Badge>
      );
    case 'rejected':
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 gap-1">
          <XCircle className="w-3 h-3" />
          {isRTL ? 'مرفوض' : 'Rejected'}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          <FileQuestion className="w-3 h-3" />
          {isRTL ? 'غير مقيّم' : 'Not Evaluated'}
        </Badge>
      );
  }
}

function getExpiryBadge(expiryDate: string | null, isRTL: boolean) {
  if (!expiryDate) return null;
  const now = new Date();
  const expiry = new Date(expiryDate);
  const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) {
    return (
      <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 gap-1 text-xs">
        <CalendarClock className="w-3 h-3" />
        {isRTL ? 'منتهي الصلاحية' : 'Expired'}
      </Badge>
    );
  }
  if (daysUntilExpiry <= 90) {
    return (
      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 gap-1 text-xs">
        <CalendarClock className="w-3 h-3" />
        {isRTL ? `ينتهي خلال ${daysUntilExpiry} يوم` : `Expires in ${daysUntilExpiry}d`}
      </Badge>
    );
  }
  return null;
}

function getVendorTypeLabel(type: string | null, isRTL: boolean) {
  const types: Record<string, { en: string; ar: string }> = {
    supplier: { en: 'Supplier', ar: 'مورد' },
    contractor: { en: 'Contractor', ar: 'مقاول' },
    service_provider: { en: 'Service Provider', ar: 'مقدم خدمات' },
    consultant: { en: 'Consultant', ar: 'استشاري' },
    other: { en: 'Other', ar: 'أخرى' },
  };
  const t = types[type || 'other'] || types.other;
  return isRTL ? t.ar : t.en;
}

export default function VendorQualificationList() {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const searchString = useSearch();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<QualificationStatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<VendorTypeFilter>('all');
  const [specialFilter, setSpecialFilter] = useState<'none' | 'top_performers'>('none');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  // Handle filter query params from URL (e.g., ?filter=top_performers or ?filter=pending)
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const filterParam = params.get('filter');
    if (filterParam === 'top_performers') {
      setSpecialFilter('top_performers');
      setStatusFilter('all');
    } else if (filterParam === 'pending') {
      setSpecialFilter('none');
      setStatusFilter('not_evaluated');
    }
  }, [searchString]);

  // Fetch ALL vendors without filters — filters are applied client-side
  // This ensures KPI summary cards always reflect the full dataset
  const vendorsQuery = trpc.vendors.listVendorsWithQualification.useQuery({});
  const utils = trpc.useUtils();

  const allVendors = vendorsQuery.data || [];

  // Summary counts — always computed from the full unfiltered dataset
  const summary = useMemo(() => {
    return {
      total: allVendors.length,
      qualified: allVendors.filter(v => v.qualificationStatus === 'qualified').length,
      conditional: allVendors.filter(v => v.qualificationStatus === 'conditional').length,
      notQualified: allVendors.filter(v => v.qualificationStatus === 'not_qualified').length,
      notEvaluated: allVendors.filter(v => v.qualificationStatus === 'not_evaluated').length,
      draft: allVendors.filter(v => v.qualificationStatus === 'draft').length,
    };
  }, [allVendors]);

  // Client-side filtering for the table
  const filteredVendors = useMemo(() => {
    let result = allVendors;

    // Special filter: top_performers (score >= 20 out of 30, i.e. qualified)
    if (specialFilter === 'top_performers') {
      result = result.filter(v => v.qualificationStatus === 'qualified');
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(v => v.qualificationStatus === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter(v => v.vendorType === typeFilter);
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(v =>
        v.vendorCode?.toLowerCase().includes(searchLower) ||
        v.name?.toLowerCase().includes(searchLower) ||
        v.nameAr?.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [allVendors, statusFilter, typeFilter, search, specialFilter]);

  const isFiltered = statusFilter !== 'all' || typeFilter !== 'all' || !!search || specialFilter !== 'none';

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredVendors.length / ITEMS_PER_PAGE));
  const paginatedVendors = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredVendors.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredVendors, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, typeFilter, search, specialFilter]);

  // Export handlers
  const exportRegisterQuery = trpc.vendors.exportQualificationRegister.useQuery(undefined, { enabled: false });

  const handleExportExcel = useCallback(async () => {
    try {
      const result = await exportRegisterQuery.refetch();
      const data = result.data;
      if (!data || data.length === 0) {
        toast.error(isRTL ? 'لا توجد بيانات للتصدير' : 'No data to export');
        return;
      }
      // Generate CSV
      const headers = ['Vendor Code', 'Name', 'Type', 'Status', 'Total Score', 'Classification', 'Evaluation Date', 'Expiry Date', 'Evaluator', 'Section 1', 'Section 2', 'Section 3', 'Section 4'];
      const rows = data.map((v: any) => [
        v.vendorCode, v.name, v.vendorType, v.status, v.totalScore ?? '', v.classification ?? '',
        v.evaluationDate ? new Date(v.evaluationDate).toLocaleDateString() : '',
        v.expiryDate ? new Date(v.expiryDate).toLocaleDateString() : '',
        v.evaluatorName ?? '', v.section1Total ?? '', v.section2Total ?? '', v.section3Total ?? '', v.section4Total ?? '',
      ]);
      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r: any[]) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qualification_register_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(isRTL ? 'تم التصدير بنجاح' : 'Export successful');
    } catch (e) {
      toast.error(isRTL ? 'فشل التصدير' : 'Export failed');
    }
  }, [exportRegisterQuery, isRTL]);

  const handleExportPDF = useCallback(() => {
    const data = filteredVendors;
    if (data.length === 0) {
      toast.error(isRTL ? 'لا توجد بيانات للتصدير' : 'No data to export');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const rows = data.map((v: any) => `
      <tr>
        <td>${v.vendorCode || ''}</td>
        <td>${isRTL ? (v.nameAr || v.name) : v.name}</td>
        <td>${v.vendorType || ''}</td>
        <td>${v.qualificationStatus || 'not_evaluated'}</td>
        <td>${v.totalScore != null ? v.totalScore + '/30' : '—'}</td>
        <td>${v.classification || '—'}</td>
      </tr>
    `).join('');
    printWindow.document.write(`
      <html><head><title>Qualification Register</title>
      <style>body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}th{background:#f5f5f5;font-weight:bold}h1{font-size:18px}h2{font-size:14px;color:#666}</style></head>
      <body><h1>Vendor Qualification Register</h1><h2>Generated: ${new Date().toLocaleString()}</h2>
      <table><thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Status</th><th>Score</th><th>Classification</th></tr></thead><tbody>${rows}</tbody></table></body></html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
    toast.success(isRTL ? 'تم فتح نافذة الطباعة' : 'Print window opened');
  }, [filteredVendors, isRTL]);

  // Template management
  const templatesQuery = trpc.vendors.listTemplates.useQuery();
  const createTemplateMutation = trpc.vendors.createTemplate.useMutation({
    onSuccess: () => {
      templatesQuery.refetch();
      setNewTemplateName('');
      toast.success(isRTL ? 'تم حفظ القالب' : 'Template saved');
    },
  });
  const deleteTemplateMutation = trpc.vendors.deleteTemplate.useMutation({
    onSuccess: () => {
      templatesQuery.refetch();
      toast.success(isRTL ? 'تم حذف القالب' : 'Template deleted');
    },
  });

  const handleRefresh = () => {
    utils.vendors.listVendorsWithQualification.invalidate();
  };

  // Detect if accessed from Finance module
  const [currentPath] = useLocation();
  const isFinanceContext = currentPath.includes('/finance/');
  const evalBasePath = isFinanceContext
    ? '/organization/finance/vendors/evaluation'
    : '/organization/logistics/evaluation-performance';
  const vendorMgmtPath = isFinanceContext
    ? '/organization/finance/vendors'
    : '/organization/logistics/vendors';

  const handleEvaluate = (vendorId: number) => {
    navigate(`/organization/logistics/evaluation-performance/checklist/${vendorId}`);
  };

  const handleView = (vendorId: number) => {
    navigate(`/organization/logistics/evaluation-performance/checklist/${vendorId}?mode=view`);
  };

  const handleEdit = (vendorId: number) => {
    navigate(`/organization/logistics/evaluation-performance/checklist/${vendorId}?mode=edit`);
  };

  const handleReEvaluate = (vendorId: number) => {
    navigate(`/organization/logistics/evaluation-performance/checklist/${vendorId}?mode=edit`);
  };

  return (
    <div className="p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <BackButton
            label={isRTL ? 'العودة إلى التقييم والأداء' : 'Back to Evaluation & Performance'}
            href={evalBasePath}
          />
          <div className="flex items-center gap-3 mt-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ClipboardCheck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">
                  {isRTL ? 'إدارة تأهيل الموردين' : 'Vendor Qualification Management'}
                </h1>
                {isFinanceContext && (
                  <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 gap-1">
                    <Lock className="h-3 w-3" />
                    {isRTL ? 'للقراءة فقط' : 'Read-Only'}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {isRTL
                  ? 'عرض جميع الموردين وحالة تأهيلهم — اختر مورداً لتقييمه أو مراجعة تأهيله'
                  : 'View all vendors and their qualification status — select a vendor to evaluate or review'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Export Excel */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {isRTL ? 'تصدير Excel' : 'Export Excel'}
          </Button>
          {/* Export PDF */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            className="gap-2"
          >
            <FileDown className="w-4 h-4" />
            {isRTL ? 'تصدير PDF' : 'Export PDF'}
          </Button>
          {/* Templates - hidden in Finance read-only context */}
          {!isFinanceContext && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplateDialog(true)}
              className="gap-2"
            >
              <FolderOpen className="w-4 h-4" />
              {isRTL ? 'القوالب' : 'Templates'}
            </Button>
          )}
          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={vendorsQuery.isFetching}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${vendorsQuery.isFetching ? 'animate-spin' : ''}`} />
            {isRTL ? 'تحديث' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Summary Cards — Always visible */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card
          className={`cursor-pointer hover:shadow-md transition-shadow ${statusFilter === 'all' ? 'ring-2 ring-primary' : 'border-border'}`}
          onClick={() => setStatusFilter('all')}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{summary.total}</p>
            <p className="text-xs text-muted-foreground">{isRTL ? 'إجمالي الموردين' : 'Total Vendors'}</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer hover:shadow-md transition-shadow ${statusFilter === 'qualified' ? 'ring-2 ring-emerald-500' : 'border-emerald-200 dark:border-emerald-800'}`}
          onClick={() => setStatusFilter(statusFilter === 'qualified' ? 'all' : 'qualified')}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{summary.qualified}</p>
            <p className="text-xs text-muted-foreground">{isRTL ? 'مؤهل' : 'Qualified'}</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer hover:shadow-md transition-shadow ${statusFilter === 'conditional' ? 'ring-2 ring-amber-500' : 'border-amber-200 dark:border-amber-800'}`}
          onClick={() => setStatusFilter(statusFilter === 'conditional' ? 'all' : 'conditional')}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{summary.conditional}</p>
            <p className="text-xs text-muted-foreground">{isRTL ? 'مشروط' : 'Conditional'}</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer hover:shadow-md transition-shadow ${statusFilter === 'not_qualified' ? 'ring-2 ring-red-500' : 'border-red-200 dark:border-red-800'}`}
          onClick={() => setStatusFilter(statusFilter === 'not_qualified' ? 'all' : 'not_qualified')}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{summary.notQualified}</p>
            <p className="text-xs text-muted-foreground">{isRTL ? 'غير مؤهل' : 'Not Qualified'}</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer hover:shadow-md transition-shadow ${statusFilter === 'draft' ? 'ring-2 ring-blue-500' : 'border-blue-200 dark:border-blue-800'}`}
          onClick={() => setStatusFilter(statusFilter === 'draft' ? 'all' : 'draft')}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{summary.draft}</p>
            <p className="text-xs text-muted-foreground">{isRTL ? 'مسودة' : 'Draft'}</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer hover:shadow-md transition-shadow ${statusFilter === 'not_evaluated' ? 'ring-2 ring-gray-400' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'not_evaluated' ? 'all' : 'not_evaluated')}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{summary.notEvaluated}</p>
            <p className="text-xs text-muted-foreground">{isRTL ? 'غير مقيّم' : 'Not Evaluated'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
              <Input
                placeholder={isRTL ? 'بحث بالاسم أو الكود...' : 'Search by name or code...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={isRTL ? 'pr-9' : 'pl-9'}
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as QualificationStatusFilter)}>
              <SelectTrigger className="w-full md:w-[200px]">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <SelectValue placeholder={isRTL ? 'حالة التأهيل' : 'Qualification Status'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? 'جميع الحالات' : 'All Statuses'}</SelectItem>
                <SelectItem value="not_evaluated">{isRTL ? 'غير مقيّم' : 'Not Evaluated'}</SelectItem>
                <SelectItem value="draft">{isRTL ? 'مسودة' : 'Draft'}</SelectItem>
                <SelectItem value="qualified">{isRTL ? 'مؤهل' : 'Qualified'}</SelectItem>
                <SelectItem value="conditional">{isRTL ? 'مشروط' : 'Conditional'}</SelectItem>
                <SelectItem value="not_qualified">{isRTL ? 'غير مؤهل' : 'Not Qualified'}</SelectItem>
                <SelectItem value="rejected">{isRTL ? 'مرفوض' : 'Rejected'}</SelectItem>
              </SelectContent>
            </Select>

            {/* Vendor Type Filter */}
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as VendorTypeFilter)}>
              <SelectTrigger className="w-full md:w-[200px]">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <SelectValue placeholder={isRTL ? 'نوع المورد' : 'Vendor Type'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? 'جميع الأنواع' : 'All Types'}</SelectItem>
                <SelectItem value="supplier">{isRTL ? 'مورد' : 'Supplier'}</SelectItem>
                <SelectItem value="contractor">{isRTL ? 'مقاول' : 'Contractor'}</SelectItem>
                <SelectItem value="service_provider">{isRTL ? 'مقدم خدمات' : 'Service Provider'}</SelectItem>
                <SelectItem value="consultant">{isRTL ? 'استشاري' : 'Consultant'}</SelectItem>
                <SelectItem value="other">{isRTL ? 'أخرى' : 'Other'}</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear filters */}
            {isFiltered && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatusFilter('all');
                  setTypeFilter('all');
                  setSearch('');
                  setSpecialFilter('none');
                }}
              >
                {isRTL ? 'مسح الفلاتر' : 'Clear Filters'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vendor Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                {isRTL ? 'سجل الموردين' : 'Vendor Register'}
              </CardTitle>
              <CardDescription>
                {isFiltered
                  ? (isRTL
                    ? `عرض ${filteredVendors.length} من ${allVendors.length} مورد`
                    : `Showing ${filteredVendors.length} of ${allVendors.length} vendor${allVendors.length !== 1 ? 's' : ''}`)
                  : (isRTL
                    ? `عرض ${allVendors.length} مورد`
                    : `Showing ${allVendors.length} vendor${allVendors.length !== 1 ? 's' : ''}`)}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {vendorsQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-muted-foreground ms-2">{isRTL ? 'جاري التحميل...' : 'Loading...'}</span>
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="text-center py-12">
              <FileQuestion className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {isFiltered
                  ? (isRTL ? 'لا توجد نتائج مطابقة للفلاتر المحددة' : 'No vendors match the selected filters')
                  : (isRTL ? 'لا يوجد موردين مسجلين' : 'No vendors registered')}
              </p>
              {isFiltered && (
                <Button
                  variant="link"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setStatusFilter('all');
                    setTypeFilter('all');
                    setSearch('');
                    setSpecialFilter('none');
                  }}
                >
                  {isRTL ? 'مسح الفلاتر' : 'Clear Filters'}
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center w-[100px]">{isRTL ? 'الكود' : 'Code'}</TableHead>
                    <TableHead>{isRTL ? 'اسم المورد' : 'Vendor Name'}</TableHead>
                    <TableHead className="text-center">{isRTL ? 'النوع' : 'Type'}</TableHead>
                    <TableHead className="text-center">{isRTL ? 'تاريخ التسجيل' : 'Registration Date'}</TableHead>
                    <TableHead className="text-center">{isRTL ? 'حالة التأهيل' : 'Qualification Status'}</TableHead>
                    <TableHead className="text-center">{isRTL ? 'آخر تقييم' : 'Last Evaluation'}</TableHead>
                    <TableHead className="text-center">{isRTL ? 'الدرجة' : 'Score'}</TableHead>
                    <TableHead className="text-center">{isRTL ? 'الصلاحية' : 'Validity'}</TableHead>
                    <TableHead className="text-center">{isRTL ? 'الإجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedVendors.map((vendor) => {
                    const isEvaluated = vendor.qualificationStatus !== 'not_evaluated';
                    const isDraft = vendor.qualificationStatus === 'draft';
                    const canEdit = isDraft || vendor.qualificationStatus === 'conditional' || vendor.qualificationStatus === 'not_qualified';
                    const isQualified = vendor.qualificationStatus === 'qualified';

                    return (
                      <TableRow key={vendor.id} className="hover:bg-muted/50">
                        <TableCell className="text-center font-mono text-sm">
                          {vendor.vendorCode}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">
                              {isRTL ? (vendor.nameAr || vendor.name) : vendor.name}
                            </p>
                            {vendor.isBlacklisted ? (
                              <Badge className="bg-red-100 text-red-800 text-xs mt-1">
                                {isRTL ? 'محظور' : 'Blacklisted'}
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-xs">
                            {getVendorTypeLabel(vendor.vendorType, isRTL)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {vendor.createdAt
                            ? new Date(vendor.createdAt).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(vendor.qualificationStatus, isRTL)}
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {vendor.evaluationDate
                            ? new Date(vendor.evaluationDate).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          {vendor.totalScore !== null ? (
                            <span className={`font-semibold ${
                              vendor.totalScore >= 20 ? 'text-emerald-600' :
                              vendor.totalScore >= 15 ? 'text-amber-600' :
                              'text-red-600'
                            }`}>
                              {vendor.totalScore}/30
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {getExpiryBadge(vendor.expiryDate, isRTL)}
                          {!vendor.expiryDate && isEvaluated && (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {!isFinanceContext && !isEvaluated && (
                              <Button
                                size="sm"
                                variant="default"
                                className="gap-1 h-7 text-xs"
                                onClick={() => handleEvaluate(vendor.id)}
                              >
                                <FileCheck className="w-3 h-3" />
                                {isRTL ? 'تقييم' : 'Evaluate'}
                              </Button>
                            )}
                            {isEvaluated && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 h-7 text-xs"
                                onClick={() => handleView(vendor.id)}
                              >
                                <Eye className="w-3 h-3" />
                                {isRTL ? 'عرض' : 'View'}
                              </Button>
                            )}
                            {!isFinanceContext && isEvaluated && canEdit && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 h-7 text-xs"
                                onClick={() => handleEdit(vendor.id)}
                              >
                                <Pencil className="w-3 h-3" />
                                {isRTL ? 'تعديل' : 'Edit'}
                              </Button>
                            )}
                            {!isFinanceContext && isEvaluated && isQualified && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                                onClick={() => handleReEvaluate(vendor.id)}
                              >
                                <RotateCcw className="w-3 h-3" />
                                {isRTL ? 'إعادة تقييم' : 'Re-evaluate'}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {/* Pagination Controls */}
          {filteredVendors.length > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <div className="text-sm text-muted-foreground">
                {isRTL
                  ? `صفحة ${currentPage} من ${totalPages} (${filteredVendors.length} مورد)`
                  : `Page ${currentPage} of ${totalPages} (${filteredVendors.length} vendors)`}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  {isRTL ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  {isRTL ? <ChevronsLeft className="h-4 w-4" /> : <ChevronsRight className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Template Management Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isRTL ? 'إدارة قوالب الأقسام المخصصة' : 'Custom Section Templates'}</DialogTitle>
            <DialogDescription>
              {isRTL ? 'حفظ وإعادة استخدام أقسام التقييم المخصصة' : 'Save and reuse custom evaluation sections across vendor evaluations'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Create new template */}
            <div className="flex gap-2">
              <Input
                placeholder={isRTL ? 'اسم القالب الجديد...' : 'New template name...'}
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
              <Button
                size="sm"
                disabled={!newTemplateName.trim() || createTemplateMutation.isPending}
                onClick={() => {
                  createTemplateMutation.mutate({
                    templateName: newTemplateName.trim(),
                    sections: [
                      {
                        name: 'Custom Section',
                        maxScore: 10,
                        criteria: [
                          { name: 'Criterion 1', maxScore: 5 },
                          { name: 'Criterion 2', maxScore: 5 },
                        ],
                      },
                    ],
                  });
                }}
              >
                <Save className="h-4 w-4 me-1" />
                {isRTL ? 'حفظ' : 'Save'}
              </Button>
            </div>
            {/* Existing templates */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {(templatesQuery.data || []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {isRTL ? 'لا توجد قوالب محفوظة' : 'No saved templates'}
                </p>
              ) : (
                (templatesQuery.data || []).map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{t.templateName}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.sections?.length || 0} {isRTL ? 'أقسام' : 'sections'}
                        {t.createdAt && ` • ${new Date(t.createdAt).toLocaleDateString()}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => deleteTemplateMutation.mutate({ id: t.id })}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              {isRTL ? 'إغلاق' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
