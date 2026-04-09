/**
 * Finance Vendor List — Read-Only Mirror
 * 
 * Displays the vendor list from Logistics in read-only mode.
 * Supports filtering by vendor type (supplier, contractor, service_provider).
 * All data auto-syncs from the same tRPC procedures used by Logistics.
 * No create/edit/delete actions — read-only view for Finance users.
 */

import { useTranslation } from '@/i18n/useTranslation';
import { useState, useMemo } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Eye,
  Lock,
  FileDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
} from 'lucide-react';
import { Link } from 'wouter';
import { BackButton } from "@/components/BackButton";
import { toast } from 'sonner';

const ITEMS_PER_PAGE = 50;

interface FinanceVendorListProps {
  vendorType?: 'supplier' | 'contractor' | 'service_provider';
}

export default function FinanceVendorList({ vendorType }: FinanceVendorListProps = {}) {
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();
  const { t } = useTranslation();
  const { currentOrganization, selectedOrganization } = useOrganization();

  const organizationId = currentOrganization?.id || selectedOrganization?.id || 0;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch vendors from same endpoint as Logistics
  const vendorsQuery = trpc.vendors.list.useQuery(
    {
      vendorType: vendorType || undefined,
      search: searchQuery || undefined,
      limit: 200,
    },
    { enabled: !!organizationId }
  );

  const vendors = vendorsQuery.data?.vendors || [];

  // Batch-fetch qualification statuses
  const displayedVendorIds = useMemo(() => {
    return vendors.map((v: any) => v.id as number);
  }, [vendors]);

  const { data: qualificationMap = {} } = trpc.vendors.getQualificationBatch.useQuery(
    { vendorIds: displayedVendorIds },
    { enabled: displayedVendorIds.length > 0 }
  );

  const getQualBadge = (vendorId: number) => {
    const qual = (qualificationMap as any)[vendorId];
    if (!qual) {
      return <Badge variant="outline" className="text-xs gap-1 text-muted-foreground border-muted"><ShieldAlert className="h-3 w-3" />{isRTL ? 'غير مقيّم' : 'Not Evaluated'}</Badge>;
    }
    const status = qual.qualificationStatus;
    if (status === 'qualified') {
      return <Badge className="text-xs gap-1 bg-green-100 text-green-800 border-green-200"><ShieldCheck className="h-3 w-3" />{isRTL ? 'مؤهل' : 'Qualified'}</Badge>;
    }
    if (status === 'conditional') {
      return <Badge className="text-xs gap-1 bg-yellow-100 text-yellow-800 border-yellow-200"><ShieldAlert className="h-3 w-3" />{isRTL ? 'مشروط' : 'Conditional'}</Badge>;
    }
    return <Badge className="text-xs gap-1 bg-red-100 text-red-800 border-red-200"><ShieldX className="h-3 w-3" />{isRTL ? 'غير مؤهل' : 'Not Qualified'}</Badge>;
  };

  // Filter vendors
  const filteredVendors = useMemo(() => {
    let result = [...vendors];
    if (statusFilter !== 'all') {
      result = result.filter((v: any) => v.status === statusFilter);
    }
    return result;
  }, [vendors, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredVendors.length / ITEMS_PER_PAGE);
  const paginatedVendors = filteredVendors.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredVendors.length === 0) {
      toast.error(isRTL ? 'لا توجد بيانات للتصدير' : 'No data to export');
      return;
    }
    const headers = ['Vendor Code', 'Name', 'Type', 'Status', 'Contact Person', 'Phone', 'Email', 'Tax ID', 'Bank Name', 'IBAN'];
    const rows = filteredVendors.map((v: any) => [
      v.vendorCode || '', v.name || '', v.vendorType || '', v.status || '',
      v.contactPerson || '', v.phone || '', v.email || '',
      v.taxId || '', v.bankName || '', v.iban || v.accountNumber || '',
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-vendors-${vendorType || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(isRTL ? 'تم تصدير السجل بنجاح' : 'Exported successfully');
  };

  const getVendorTypeLabel = (type: string) => {
    if (type === 'supplier') return isRTL ? 'مورد' : 'Supplier';
    if (type === 'contractor') return isRTL ? 'مقاول' : 'Contractor';
    if (type === 'service_provider') return isRTL ? 'مزود خدمة' : 'Service Provider';
    return type;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') return <Badge className="bg-green-100 text-green-800">{isRTL ? 'نشط' : 'Active'}</Badge>;
    if (status === 'inactive') return <Badge className="bg-gray-100 text-gray-800">{isRTL ? 'غير نشط' : 'Inactive'}</Badge>;
    if (status === 'blocked') return <Badge className="bg-red-100 text-red-800">{isRTL ? 'محظور' : 'Blocked'}</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  const getPageTitle = () => {
    if (vendorType === 'supplier') return isRTL ? 'قائمة الموردين' : 'Suppliers List';
    if (vendorType === 'contractor') return isRTL ? 'قائمة المقاولين' : 'Contractors List';
    if (vendorType === 'service_provider') return isRTL ? 'قائمة مقدمي الخدمات' : 'Service Providers List';
    return isRTL ? 'قائمة الموردين' : 'Vendor List';
  };

  const getPageSubtitle = () => {
    if (vendorType === 'supplier') return isRTL ? 'عرض سجل الموردين — للقراءة فقط' : 'View supplier records — Read-Only';
    if (vendorType === 'contractor') return isRTL ? 'عرض سجل المقاولين — للقراءة فقط' : 'View contractor records — Read-Only';
    if (vendorType === 'service_provider') return isRTL ? 'عرض سجل مقدمي الخدمات — للقراءة فقط' : 'View service provider records — Read-Only';
    return isRTL ? 'عرض سجل الموردين — للقراءة فقط' : 'View vendor records — Read-Only';
  };

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/organization/finance/vendors">
              <BackButton label={isRTL ? 'العودة لإدارة الموردين' : 'Back to Vendor Management'} />
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-foreground">{getPageTitle()}</h1>
                <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 gap-1">
                  <Lock className="h-3 w-3" />
                  {isRTL ? 'للقراءة فقط' : 'Read-Only'}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1">{getPageSubtitle()}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
              <FileDown className="h-4 w-4" />
              {isRTL ? 'تصدير' : 'Export CSV'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        {/* Search and Filter Bar */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isRTL ? 'بحث بالاسم، الكود، البريد...' : 'Search by name, code, email...'}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="ps-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={isRTL ? 'الحالة' : 'Status'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRTL ? 'جميع الحالات' : 'All Statuses'}</SelectItem>
              <SelectItem value="active">{isRTL ? 'نشط' : 'Active'}</SelectItem>
              <SelectItem value="inactive">{isRTL ? 'غير نشط' : 'Inactive'}</SelectItem>
              <SelectItem value="blocked">{isRTL ? 'محظور' : 'Blocked'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats Summary */}
        <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
          <span>{isRTL ? `الإجمالي: ${filteredVendors.length}` : `Total: ${filteredVendors.length}`}</span>
          <span>|</span>
          <span>{isRTL ? `النشط: ${filteredVendors.filter((v: any) => v.status === 'active' || v.isActive).length}` : `Active: ${filteredVendors.filter((v: any) => v.status === 'active' || v.isActive).length}`}</span>
        </div>

        {/* Vendor Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center w-[100px]">{isRTL ? 'الكود' : 'Code'}</TableHead>
                    <TableHead>{isRTL ? 'اسم المورد' : 'Vendor Name'}</TableHead>
                    {!vendorType && <TableHead className="text-center">{isRTL ? 'النوع' : 'Type'}</TableHead>}
                    <TableHead className="text-center">{isRTL ? 'الحالة' : 'Status'}</TableHead>
                    <TableHead className="text-center">{isRTL ? 'التأهيل' : 'Qualification'}</TableHead>
                    <TableHead>{isRTL ? 'جهة الاتصال' : 'Contact'}</TableHead>
                    <TableHead>{isRTL ? 'الهاتف' : 'Phone'}</TableHead>
                    <TableHead>{isRTL ? 'البريد' : 'Email'}</TableHead>
                    <TableHead>{isRTL ? 'الرقم الضريبي' : 'Tax ID'}</TableHead>
                    <TableHead className="text-center">{isRTL ? 'الإجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendorsQuery.isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: vendorType ? 9 : 10 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : paginatedVendors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={vendorType ? 9 : 10} className="text-center py-8 text-muted-foreground">
                        {isRTL ? 'لا توجد نتائج' : 'No vendors found'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedVendors.map((vendor: any) => (
                      <TableRow key={vendor.id} className="hover:bg-muted/50">
                        <TableCell className="text-center font-mono text-sm">{vendor.vendorCode}</TableCell>
                        <TableCell className="font-medium">{vendor.name}</TableCell>
                        {!vendorType && (
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs capitalize">
                              {getVendorTypeLabel(vendor.vendorType)}
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell className="text-center">{getStatusBadge(vendor.status || (vendor.isActive ? 'active' : 'inactive'))}</TableCell>
                        <TableCell className="text-center">{getQualBadge(vendor.id)}</TableCell>
                        <TableCell className="text-sm">{vendor.contactPerson || '—'}</TableCell>
                        <TableCell className="text-sm font-mono">{vendor.phone || '—'}</TableCell>
                        <TableCell className="text-sm">{vendor.email || '—'}</TableCell>
                        <TableCell className="text-sm font-mono">{vendor.taxId || '—'}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 h-7 text-xs"
                            onClick={() => navigate(`/organization/finance/vendors/${vendor.id}`)}
                          >
                            <Eye className="w-3 h-3" />
                            {isRTL ? 'عرض' : 'View'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">
                  {isRTL
                    ? `عرض ${(currentPage - 1) * ITEMS_PER_PAGE + 1}–${Math.min(currentPage * ITEMS_PER_PAGE, filteredVendors.length)} من ${filteredVendors.length}`
                    : `Showing ${(currentPage - 1) * ITEMS_PER_PAGE + 1}–${Math.min(currentPage * ITEMS_PER_PAGE, filteredVendors.length)} of ${filteredVendors.length}`}
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>
                    {isRTL ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                    {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                  </Button>
                  <span className="px-3 text-sm font-medium">{currentPage} / {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                    {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}>
                    {isRTL ? <ChevronsLeft className="h-4 w-4" /> : <ChevronsRight className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Source Notice */}
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 mt-6">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                  {isRTL ? 'مصدر البيانات: السجل الرئيسي للموردين — الخدمات اللوجستية' : 'Data Source: Logistics Vendor Master'}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                  {isRTL
                    ? 'جميع بيانات الموردين تأتي من وحدة الخدمات اللوجستية. لإنشاء أو تعديل أو حذف الموردين، يرجى استخدام إدارة الموردين في الخدمات اللوجستية.'
                    : 'All vendor data originates from the Logistics module. To create, edit, or delete vendors, please use Vendor Management in Logistics.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
