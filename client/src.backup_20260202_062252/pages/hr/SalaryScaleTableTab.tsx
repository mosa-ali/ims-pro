/**
 * ============================================================================
 * SALARY SCALE TABLE TAB - THE ACTUAL DATA TABLE
 * ============================================================================
 * This is Tab 2 - the single source of truth for payroll
 * Now connected to the database via tRPC
 * ============================================================================
 */

import { useState, useRef } from 'react';
import {
  Plus,
  Download,
  Upload,
  Printer,
  Edit,
  Lock,
  Unlock,
  History,
  AlertTriangle,
  Check,
  RefreshCw,
  Trash2,
  Settings,
  Loader2
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { useDeletedRecords } from '@/contexts/DeletedRecordsContext';
import { trpc } from '@/lib/trpc';
import { EditSalaryModal, SalaryHistoryModal, AddGradeModal, ManageGradesModal } from './SalaryScaleModals';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

// Type for salary scale record from tRPC
type SalaryScaleRecord = {
  id: number;
  organizationId: number;
  operatingUnitId: number | null;
  employeeId: number;
  staffId: string;
  staffFullName: string;
  position: string | null;
  department: string | null;
  contractType: string | null;
  gradeId: number | null;
  gradeCode: string;
  step: string;
  minSalary: string | null;
  maxSalary: string | null;
  approvedGrossSalary: string;
  housingAllowance: string | null;
  housingAllowanceType: 'value' | 'percentage' | null;
  transportAllowance: string | null;
  transportAllowanceType: 'value' | 'percentage' | null;
  representationAllowance: string | null;
  representationAllowanceType: 'value' | 'percentage' | null;
  annualAllowance: string | null;
  bonus: string | null;
  otherAllowances: string | null;
  currency: string | null;
  version: number;
  effectiveStartDate: string;
  effectiveEndDate: string | null;
  status: 'draft' | 'active' | 'superseded';
  isLocked: boolean;
  usedInPayroll: boolean;
  lastApprovedBy: number | null;
  lastApprovedAt: Date | null;
  createdBy: number | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export function SalaryScaleTableTab() {
  const { language, isRTL } = useLanguage();
  const { user } = useAuth();
  const { softDelete } = useDeletedRecords();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [selectedRecord, setSelectedRecord] = useState<SalaryScaleRecord | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAddGradeModal, setShowAddGradeModal] = useState(false);
  const [showManageGradesModal, setShowManageGradesModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Get organization context from user
  const organizationId = user?.organizationId || 1;
  const operatingUnitId = user?.operatingUnitId;

  // tRPC queries
  const { data: records = [], isLoading, refetch } = trpc.hrSalaryScale.getAll.useQuery({
    organizationId,
    operatingUnitId: operatingUnitId || undefined,
    status: filterStatus === 'all' ? undefined : filterStatus as 'draft' | 'active' | 'superseded',
  });

  const { data: stats } = trpc.hrSalaryScale.getStatistics.useQuery({
    organizationId,
    operatingUnitId: operatingUnitId || undefined,
  });

  // tRPC mutations
  const syncMutation = trpc.hrSalaryScale.syncWithStaff.useMutation({
    onSuccess: (result) => {
      refetch();
      toast.success(
        language === 'en'
          ? `Synced ${result.createdCount} new staff records`
          : `تمت مزامنة ${result.createdCount} سجلات موظفين جديدة`
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const activateMutation = trpc.hrSalaryScale.activate.useMutation({
    onSuccess: () => {
      refetch();
      toast.success(language === 'en' ? 'Record activated' : 'تم تفعيل السجل');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const toggleLockMutation = trpc.hrSalaryScale.toggleLock.useMutation({
    onSuccess: (result) => {
      refetch();
      toast.success(
        result.isLocked
          ? (language === 'en' ? 'Record locked' : 'تم قفل السجل')
          : (language === 'en' ? 'Record unlocked' : 'تم فتح السجل')
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.hrSalaryScale.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success(language === 'en' ? 'Record deleted' : 'تم حذف السجل');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Translations
  const t = {
    criticalNote: language === 'en'
      ? 'CRITICAL: Payroll will read ONLY from Active records in this table'
      : 'هام: كشف الرواتب سيقرأ فقط من السجلات النشطة في هذا الجدول',

    // Actions
    addGrade: language === 'en' ? 'Add Grade' : 'إضافة درجة',
    importExcel: language === 'en' ? 'Import Excel' : 'استيراد Excel',
    exportExcel: language === 'en' ? 'Export Excel' : 'تصدير Excel',
    print: language === 'en' ? 'Print' : 'طباعة',
    syncStaff: language === 'en' ? 'Sync with Staff' : 'مزامنة مع الموظفين',
    edit: language === 'en' ? 'Edit' : 'تعديل',
    viewHistory: language === 'en' ? 'View History' : 'عرض السجل',
    lock: language === 'en' ? 'Lock' : 'قفل',
    unlock: language === 'en' ? 'Unlock' : 'فتح',
    activate: language === 'en' ? 'Activate' : 'تفعيل',
    delete: language === 'en' ? 'Delete' : 'حذف',
    manageGrades: language === 'en' ? 'Manage Grades' : 'إدارة الدرجات',

    // Table columns
    staffId: language === 'en' ? 'Staff ID' : 'رقم الموظف',
    staffName: language === 'en' ? 'Staff Name' : 'اسم الموظف',
    position: language === 'en' ? 'Position' : 'المنصب',
    department: language === 'en' ? 'Department' : 'القسم',
    contractType: language === 'en' ? 'Contract' : 'نوع العقد',
    grade: language === 'en' ? 'Grade' : 'الدرجة',
    step: language === 'en' ? 'Step' : 'المستوى',
    minSalary: language === 'en' ? 'Min' : 'الأدنى',
    maxSalary: language === 'en' ? 'Max' : 'الأقصى',
    approvedSalary: language === 'en' ? 'Approved Gross' : 'الراتب المعتمد',
    housing: language === 'en' ? 'Housing' : 'السكن',
    transport: language === 'en' ? 'Transport' : 'المواصلات',
    representation: language === 'en' ? 'Representation' : 'التمثيل',
    effectiveDate: language === 'en' ? 'Effective Date' : 'تاريخ السريان',
    status: language === 'en' ? 'Status' : 'الحالة',
    actions: language === 'en' ? 'Actions' : 'الإجراءات',
    version: language === 'en' ? 'Version' : 'النسخة',

    // Status
    draft: language === 'en' ? 'Draft' : 'مسودة',
    active: language === 'en' ? 'Active' : 'نشط',
    superseded: language === 'en' ? 'Superseded' : 'مستبدل',
    all: language === 'en' ? 'All' : 'الكل',

    // Messages
    filterBy: language === 'en' ? 'Filter by Status' : 'تصفية حسب الحالة',
    records: language === 'en' ? 'records' : 'سجل',
    noRecords: language === 'en'
      ? 'No salary records found. Click "Sync with Staff" to load staff from Staff Dictionary.'
      : 'لا توجد سجلات رواتب. انقر "مزامنة مع الموظفين" لتحميل الموظفين من دليل الموظفين.',
    loading: language === 'en' ? 'Loading...' : 'جاري التحميل...',
  };

  // Handle sync
  const handleSync = () => {
    syncMutation.mutate({
      organizationId,
      operatingUnitId: operatingUnitId || undefined,
    });
  };

  // Handle activate
  const handleActivate = (record: SalaryScaleRecord) => {
    activateMutation.mutate({ id: record.id });
  };

  // Handle lock/unlock
  const handleToggleLock = (record: SalaryScaleRecord) => {
    toggleLockMutation.mutate({ id: record.id });
  };

  // Handle Delete
  const handleDeleteSalary = (record: SalaryScaleRecord) => {
    if (record.usedInPayroll) {
      toast.error(
        language === 'en'
          ? 'Cannot delete: This salary record has been used in payroll.'
          : 'لا يمكن الحذف: تم استخدام هذا السجل في كشف الرواتب.'
      );
      return;
    }

    const confirmMsg = language === 'en'
      ? `Delete salary record for ${record.staffFullName}?`
      : `حذف سجل الراتب لـ ${record.staffFullName}؟`;

    if (!confirm(confirmMsg)) return;

    deleteMutation.mutate({ id: record.id });
  };

  // Handle Excel export
  const handleExportExcel = async () => {
    toast.info(language === 'en' ? 'Export feature coming soon' : 'ميزة التصدير قريباً');
  };

  // Handle Excel import
  const handleImportClick = () => {
    toast.info(language === 'en' ? 'Import feature coming soon' : 'ميزة الاستيراد قريباً');
  };

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Format currency
  const formatCurrency = (value: string | null, currency: string | null = 'USD') => {
    const num = parseFloat(value || '0');
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
    }).format(num);
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <Check className="w-3 h-3" />
            {t.active}
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Edit className="w-3 h-3" />
            {t.draft}
          </span>
        );
      case 'superseded':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            <History className="w-3 h-3" />
            {t.superseded}
          </span>
        );
      default:
        return null;
    }
  };

  // Filter records by status
  const filteredRecords = filterStatus === 'all'
    ? records
    : records.filter(r => r.status === filterStatus);

  // Group by staffId and get latest for each
  const latestRecords = Array.from(
    filteredRecords.reduce((map, record) => {
      const existing = map.get(record.staffId);
      if (!existing) {
        map.set(record.staffId, record);
      } else {
        // Prefer active > draft > superseded, then by version
        if (record.status === 'active' && existing.status !== 'active') {
          map.set(record.staffId, record);
        } else if (record.status === existing.status && record.version > existing.version) {
          map.set(record.staffId, record);
        }
      }
      return map;
    }, new Map<string, SalaryScaleRecord>()).values()
  );

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Critical Warning Banner */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
        <span className="text-sm text-yellow-800 font-medium">{t.criticalNote}</span>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t.filterBy}:</span>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.all}</SelectItem>
              <SelectItem value="draft">{t.draft}</SelectItem>
              <SelectItem value="active">{t.active}</SelectItem>
              <SelectItem value="superseded">{t.superseded}</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {latestRecords.length} {t.records}
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleSync}
            disabled={syncMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {syncMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span className={isRTL ? 'mr-2' : 'ml-2'}>{t.syncStaff}</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => setShowAddGradeModal(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4" />
            <span className={isRTL ? 'mr-2' : 'ml-2'}>{t.addGrade}</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => setShowManageGradesModal(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Settings className="w-4 h-4" />
            <span className={isRTL ? 'mr-2' : 'ml-2'}>{t.manageGrades}</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleImportClick}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Upload className="w-4 h-4" />
            <span className={isRTL ? 'mr-2' : 'ml-2'}>{t.importExcel}</span>
          </Button>

          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <Download className="w-4 h-4" />
            <span className={isRTL ? 'mr-2' : 'ml-2'}>{t.exportExcel}</span>
          </Button>

          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4" />
            <span className={isRTL ? 'mr-2' : 'ml-2'}>{t.print}</span>
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-muted-foreground">{t.loading}</span>
          </div>
        ) : latestRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <History className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-muted-foreground max-w-md">{t.noRecords}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-start font-medium text-gray-700">{t.staffId}</th>
                  <th className="px-4 py-3 text-start font-medium text-gray-700">{t.staffName}</th>
                  <th className="px-4 py-3 text-start font-medium text-gray-700">{t.position}</th>
                  <th className="px-4 py-3 text-start font-medium text-gray-700">{t.grade}</th>
                  <th className="px-4 py-3 text-start font-medium text-gray-700">{t.step}</th>
                  <th className="px-4 py-3 text-end font-medium text-gray-700">{t.approvedSalary}</th>
                  <th className="px-4 py-3 text-end font-medium text-gray-700">{t.housing}</th>
                  <th className="px-4 py-3 text-end font-medium text-gray-700">{t.transport}</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700">{t.status}</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700">{t.version}</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {latestRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{record.staffId}</td>
                    <td className="px-4 py-3 font-medium">{record.staffFullName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{record.position || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs font-medium">
                        {record.gradeCode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{record.step}</td>
                    <td className="px-4 py-3 text-end font-medium text-green-700">
                      {formatCurrency(record.approvedGrossSalary, record.currency)}
                    </td>
                    <td className="px-4 py-3 text-end text-muted-foreground">
                      {formatCurrency(record.housingAllowance, record.currency)}
                    </td>
                    <td className="px-4 py-3 text-end text-muted-foreground">
                      {formatCurrency(record.transportAllowance, record.currency)}
                    </td>
                    <td className="px-4 py-3 text-center">{getStatusBadge(record.status)}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">v{record.version}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {/* Edit */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setSelectedRecord(record);
                            setShowEditModal(true);
                          }}
                          disabled={record.isLocked}
                          title={t.edit}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>

                        {/* History */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setSelectedRecord(record);
                            setShowHistoryModal(true);
                          }}
                          title={t.viewHistory}
                        >
                          <History className="w-4 h-4" />
                        </Button>

                        {/* Activate (only for draft) */}
                        {record.status === 'draft' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600 hover:text-green-700"
                            onClick={() => handleActivate(record)}
                            disabled={activateMutation.isPending}
                            title={t.activate}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}

                        {/* Lock/Unlock */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleToggleLock(record)}
                          disabled={toggleLockMutation.isPending}
                          title={record.isLocked ? t.unlock : t.lock}
                        >
                          {record.isLocked ? (
                            <Lock className="w-4 h-4 text-red-500" />
                          ) : (
                            <Unlock className="w-4 h-4 text-gray-400" />
                          )}
                        </Button>

                        {/* Delete */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                          onClick={() => handleDeleteSalary(record)}
                          disabled={record.usedInPayroll || deleteMutation.isPending}
                          title={t.delete}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Statistics Summary */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-muted-foreground">{language === 'en' ? 'Total Records' : 'إجمالي السجلات'}</div>
          </div>
          <div className="bg-white rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.draft}</div>
            <div className="text-sm text-muted-foreground">{t.draft}</div>
          </div>
          <div className="bg-white rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="text-sm text-muted-foreground">{t.active}</div>
          </div>
          <div className="bg-white rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold text-gray-500">{stats.superseded}</div>
            <div className="text-sm text-muted-foreground">{t.superseded}</div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showEditModal && selectedRecord && (
        <EditSalaryModal
          record={{
            id: String(selectedRecord.id),
            version: selectedRecord.version,
            staffId: selectedRecord.staffId,
            staffFullName: selectedRecord.staffFullName,
            position: selectedRecord.position || '',
            department: selectedRecord.department || '',
            contractType: selectedRecord.contractType || '',
            grade: selectedRecord.gradeCode,
            step: selectedRecord.step,
            minSalary: parseFloat(selectedRecord.minSalary || '0'),
            maxSalary: parseFloat(selectedRecord.maxSalary || '0'),
            approvedGrossSalary: parseFloat(selectedRecord.approvedGrossSalary),
            housingAllowance: parseFloat(selectedRecord.housingAllowance || '0'),
            housingAllowanceType: selectedRecord.housingAllowanceType || 'value',
            transportAllowance: parseFloat(selectedRecord.transportAllowance || '0'),
            transportAllowanceType: selectedRecord.transportAllowanceType || 'value',
            representationAllowance: parseFloat(selectedRecord.representationAllowance || '0'),
            representationAllowanceType: selectedRecord.representationAllowanceType || 'value',
            annualAllowance: parseFloat(selectedRecord.annualAllowance || '0'),
            bonus: parseFloat(selectedRecord.bonus || '0'),
            otherAllowances: parseFloat(selectedRecord.otherAllowances || '0'),
            effectiveStartDate: selectedRecord.effectiveStartDate,
            effectiveEndDate: selectedRecord.effectiveEndDate || undefined,
            status: selectedRecord.status,
            lastApprovedBy: undefined,
            lastUpdatedDate: selectedRecord.updatedAt.toISOString(),
            createdDate: selectedRecord.createdAt.toISOString(),
            createdBy: 'System',
            isLocked: selectedRecord.isLocked,
            usedInPayroll: selectedRecord.usedInPayroll,
            currency: selectedRecord.currency || 'USD',
          }}
          onClose={() => {
            setShowEditModal(false);
            setSelectedRecord(null);
          }}
          onSave={() => {
            refetch();
            setShowEditModal(false);
            setSelectedRecord(null);
          }}
        />
      )}

      {showHistoryModal && selectedRecord && (
        <SalaryHistoryModal
          staffId={selectedRecord.staffId}
          staffName={selectedRecord.staffFullName}
          onClose={() => {
            setShowHistoryModal(false);
            setSelectedRecord(null);
          }}
        />
      )}

      {showAddGradeModal && (
        <AddGradeModal
          language={language}
          isRTL={isRTL}
          onClose={() => setShowAddGradeModal(false)}
          onSave={() => {
            setShowAddGradeModal(false);
            refetch();
          }}
        />
      )}

      {showManageGradesModal && (
        <ManageGradesModal
          language={language}
          isRTL={isRTL}
          onClose={() => setShowManageGradesModal(false)}
          onUpdate={() => refetch()}
        />
      )}
    </div>
  );
}

export default SalaryScaleTableTab;
