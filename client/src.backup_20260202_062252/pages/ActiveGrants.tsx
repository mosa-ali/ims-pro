import { useState, useRef, useMemo } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/formatters';
import DashboardLayoutNew from '@/layouts/DashboardLayoutNew';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Search, Eye, Edit, Upload, Download, FileDown, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

export default function ActiveGrants() {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const [, setLocation] = useLocation();
  const navigate = (path: string) => setLocation(path);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: grants, isLoading, refetch } = trpc.grants.listActive.useQuery();
  const importMutation = trpc.grants.importFromExcel.useMutation();
  const { data: exportData } = trpc.grants.exportToExcel.useQuery();

  const utils = trpc.useUtils();
  const deleteGrantMutation = trpc.grants.delete.useMutation({
    onSuccess: () => {
      toast.success(t('grants.grantDeleted'));
      utils.grants.listActive.invalidate();
    },
    onError: (error) => {
      toast.error(`${t('grants.grantDeleteFailed')}: ${error.message}`);
    },
  });

  // Status badge translation helper
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ongoing':
        return t('grants.ongoing');
      case 'approved':
        return t('grants.approved');
      case 'planned':
        return t('grants.planned');
      case 'closed':
        return t('grants.closed');
      default:
        return status;
    }
  };

  // Handle Excel Import
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleExportTemplate = () => {
    const wb = XLSX.utils.book_new();
    
    // Bilingual headers based on selected language
    const headers = language === 'ar' 
      ? ['رمز المنحة', 'اسم المانح', 'عنوان المشروع', 'تاريخ البدء', 'تاريخ الانتهاء', 'الميزانية الإجمالية', 'عملة المنحة', 'الحالة']
      : ['Grant Code', 'Donor Name', 'Project Title', 'StartDate', 'EndDate', 'Total Budget', 'Grant Currency', 'Status'];
    
    const exampleRow = language === 'ar'
      ? ['EXAMPLE-001', 'مانح تجريبي', 'مشروع تجريبي', '2025-01-01', '2026-12-31', '100000', 'USD', 'ongoing']
      : ['EXAMPLE-001', 'Example Donor', 'Example Project', '2025-01-01', '2026-12-31', '100000', 'USD', 'ongoing'];
    
    const templateData = [headers, exampleRow];
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    XLSX.utils.book_append_sheet(wb, ws, 'Grants');
    XLSX.writeFile(wb, 'grants_template.xlsx');
    toast.success(t('grants.templateDownloaded'));
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

      // Helper function to parse Excel dates
      const parseExcelDate = (excelDate: any): string => {
        if (!excelDate) return '';
        
        // If it's already a Date object or valid date string
        if (excelDate instanceof Date) {
          return excelDate.toISOString();
        }
        
        // If it's a string that looks like a date
        if (typeof excelDate === 'string') {
          const parsed = new Date(excelDate);
          if (!isNaN(parsed.getTime())) {
            return parsed.toISOString();
          }
        }
        
        // If it's an Excel serial number (days since 1900-01-01)
        if (typeof excelDate === 'number') {
          const excelEpoch = new Date(1900, 0, 1);
          const daysOffset = excelDate - 2; // Excel has a leap year bug
          const date = new Date(excelEpoch.getTime() + daysOffset * 24 * 60 * 60 * 1000);
          return date.toISOString();
        }
        
        return '';
      };

      // Parse Excel data - handle both template format and user's format with metadata columns
      const grants = jsonData
        .filter(row => row['Grant Code'] && row['Grant Code'] !== 'Grant Code') // Skip empty rows and header row
        .map(row => ({
          grantCode: row['Grant Code'] || '',
          donorName: row['Donor Name'] || '',
          projectTitle: row['Project Title'] || '',
          startDate: parseExcelDate(row['StartDate']),
          endDate: parseExcelDate(row['EndDate']),
          totalBudget: String(row['Total Budget'] || '0').replace(/,/g, ''), // Remove commas
          currency: row['Grant Currency'] || 'USD',
          status: row['Status'] || 'draft',
        }));

      // Debug: log parsed grants
      console.log('Parsed grants for import:', grants);

      // Call import mutation
      const result = await importMutation.mutateAsync({ grants });
      
      if (result.success > 0) {
        toast.success(`${t('grants.importCompleted')}: ${result.success} ${t('grants.grantsImportedSuccess')}${result.failed > 0 ? `, ${result.failed} ${t('grants.failed')}` : ''}`);
      }
      
      if (result.errors.length > 0) {
        console.error('Import errors:', result.errors);
        // Show first error in toast for debugging
        toast.error(`${t('grants.importErrors')}: ${result.errors[0]}`);
      }

      // Refresh grants list
      refetch();
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error(t('grants.importFailed'));
    }
  };

  // Handle Excel Export
  const handleExportClick = () => {
    if (!exportData || exportData.length === 0) {
      toast.error(t('grants.noGrantsToExport'));
      return;
    }

    try {
      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData.map(g => ({
        'Grant Code': g.grantCode,
        'Donor Name': g.donorName,
        'Project Title': g.projectTitle,
        'Start Date': g.startDate,
        'End Date': g.endDate,
        'Total Budget': g.totalBudget,
        'Currency': g.currency,
        'Status': g.status,
      })));

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Active Grants');

      // Generate file
      const fileName = `Active_Grants_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      toast.success(t('grants.grantsExported'));
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t('grants.exportFailed'));
    }
  };

  // Calculate remaining days
  const getRemainingDays = (endDate: Date | string | null) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Filter grants
  const filteredGrants = grants?.filter((grant) => {
    const matchesSearch =
      grant.donorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grant.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grant.grantCode?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || grant.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ongoing':
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'planned':
        return 'bg-yellow-100 text-yellow-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <DashboardLayoutNew>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/projects')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{t('grants.activeGrants')}</h1>
              <p className="text-muted-foreground">
                {t('grants.activeGrantsDesc')}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
              className="hidden"
            />
            <Button variant="outline" onClick={handleImportClick} disabled={importMutation.isPending}>
              <Upload className="h-4 w-4 mr-2" />
              {importMutation.isPending ? t('grants.importing') : t('grants.importFromExcel')}
            </Button>
            <Button variant="outline" onClick={handleExportClick}>
              <Download className="h-4 w-4 mr-2" />
              {t('grants.exportToExcel')}
            </Button>
            <Button variant="outline" onClick={handleExportTemplate}>
              <FileDown className="h-4 w-4 mr-2" />
              {t('grants.exportTemplate')}
            </Button>
            <Button onClick={() => navigate('/grants/new')}>
              <Plus className="h-4 w-4 mr-2" />
              {t('grants.addNewGrant')}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('grants.searchPlaceholderActive')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={t('grants.filterByStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('grants.allStatuses')}</SelectItem>
                  <SelectItem value="ongoing">{t('grants.ongoing')}</SelectItem>
                  <SelectItem value="approved">{t('grants.approved')}</SelectItem>
                  <SelectItem value="planned">{t('grants.planned')}</SelectItem>
                  <SelectItem value="closed">{t('grants.closed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Grants Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {filteredGrants?.length || 0} {filteredGrants?.length === 1 ? t('grants.activeGrantCount') : t('grants.activeGrantCountPlural')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('grants.loadingGrants')}
              </div>
            ) : filteredGrants && filteredGrants.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('grants.donorName')}</TableHead>
                      <TableHead>{t('grants.projectTitle')}</TableHead>
                      <TableHead>{t('grants.status')}</TableHead>
                      <TableHead>{t('grants.startDate')}</TableHead>
                      <TableHead>{t('grants.endDate')}</TableHead>
                      <TableHead>{t('grants.remainingDays')}</TableHead>
                      <TableHead className="text-right">{t('grants.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGrants.map((grant) => {
                      const remainingDays = getRemainingDays(grant.endDate);
                      return (
                        <TableRow key={grant.id}>
                          <TableCell className="font-medium">
                            {grant.donorName}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{grant.title}</div>
                              <div className="text-sm text-muted-foreground">
                                {grant.grantCode}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(grant.status || '')}>
                              {getStatusLabel(grant.status || '')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {grant.startDate
                              ? formatDate(new Date(grant.startDate))
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {grant.endDate
                              ? formatDate(new Date(grant.endDate))
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {remainingDays !== null ? (
                              <span
                                className={
                                  remainingDays < 30
                                    ? 'text-red-600 font-semibold'
                                    : remainingDays < 90
                                    ? 'text-yellow-600 font-semibold'
                                    : 'text-green-600'
                                }
                              >
                                {remainingDays} {t('grants.daysLeft')}
                              </span>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/grants/${grant.id}`)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                {t('grants.viewDetails')}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/grants/${grant.id}/edit`)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                {t('grants.update')}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`${t('grants.confirmDeleteGrant')} "${grant.grantCode}"? ${t('grants.confirmDeleteGrantDesc')}`)) {
                                    deleteGrantMutation.mutate({ id: grant.id });
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                {t('grants.delete')}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">{t('grants.noActiveGrants')}</p>
                <Button onClick={() => navigate('/grants/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('grants.addFirstGrant')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayoutNew>
  );
}
