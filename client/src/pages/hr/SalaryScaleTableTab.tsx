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
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { useDeletedRecords } from '@/contexts/DeletedRecordsContext';
import { trpc } from '@/lib/trpc';
import { SalaryHistoryModal, AddGradeModal, ManageGradesModal } from './SalaryScaleModals';
import { EditCurrentSalaryModal } from './modals/EditCurrentSalaryModal';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n/useTranslation';

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
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const { currentOrganizationId } = useOrganization();
 const { currentOperatingUnitId } = useOperatingUnit();
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
 const organizationId = currentOrganizationId || 0;
 const operatingUnitId = currentOperatingUnitId || user?.operatingUnitId || undefined;

 // tRPC queries
 const { data: records = [], isLoading, refetch } = trpc.hrSalaryScale.getAll.useQuery({
 organizationId: organizationId || 0,
 operatingUnitId: operatingUnitId || null,
 status: filterStatus === 'all' ? undefined : (filterStatus as 'draft' | 'active' | 'superseded' | undefined),
 });

 const { data: stats } = trpc.hrSalaryScale.getStatistics.useQuery({
 organizationId: organizationId || 0,
 operatingUnitId: operatingUnitId || null,
 });

 // tRPC mutations
 const syncMutation = trpc.hrSalaryScale.syncWithStaff.useMutation({
 onSuccess: (result) => {
 refetch();
 toast.success(
 `Synced ${result.createdCount} new staff records`
 );
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const activateMutation = trpc.hrSalaryScale.activate.useMutation({
 onSuccess: () => {
 refetch();
 toast.success(t.hr.recordActivated);
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
 ? (t.hr.recordLocked)
 : (t.hr.recordUnlocked)
 );
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const deleteMutation = trpc.hrSalaryScale.delete.useMutation({
 onSuccess: () => {
 refetch();
 toast.success(t.hr.recordDeleted);
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 // Translations
 const labels = {
 criticalNote: 'CRITICAL: Payroll will read ONLY from Active records in this table',

 // Actions
 addGrade: t.hr.addGrade11,
 importExcel: t.hr.importExcel,
 exportExcel: t.hr.exportExcel,
 print: t.hr.print,
 syncStaff: t.hr.syncWithStaff,
 edit: t.hr.edit,
 viewHistory: t.hr.viewHistory,
 lock: t.hr.lock,
 unlock: t.hr.unlock,
 activate: t.hr.activate,
 delete: t.hr.delete,
 manageGrades: t.hr.manageGrades,

 // Table columns
 staffId: t.hr.staffId,
 staffName: t.hr.staffName,
 position: t.hr.position,
 department: t.hr.department,
 contractType: t.hr.contract12,
 grade: t.hr.grade,
 step: t.hr.step,
 minSalary: t.hr.min13,
 maxSalary: t.hr.max,
 approvedSalary: t.hr.approvedGross,
 housing: t.hr.housing,
 transport: t.hr.transport,
 representation: t.hr.representation,
 effectiveDate: t.hr.effectiveDate,
 status: t.hr.status,
 actions: t.hr.actions,
 version: t.hr.version,

 // Status
 draft: t.hr.draft,
 active: t.hr.active,
 superseded: t.hr.superseded,
 all: t.hr.all,

 // Messages
 filterBy: t.hr.filterByStatus,
 records: t.hr.records,
 noRecords: language === 'en'
 ? 'No salary records found. Click "Sync with Staff" to load staff from Staff Dictionary.'
 : 'لا توجد سجلات رواتب. انقر "مزامنة مع الموظفين" لتحميل الموظفين من دليل الموظفين.',
 loading: t.hr.loading,
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
 'Cannot delete: This salary record has been used in payroll.'
 );
 return;
 }

 const confirmMsg = `Delete salary record for ${record.staffFullName}?`;

 if (!confirm(confirmMsg)) return;

 deleteMutation.mutate({ id: record.id });
 };

 // Handle Excel export
 const handleExportExcel = async () => {
 toast.info(t.hr.exportFeatureComingSoon);
 };

 // Handle Excel import
 const handleImportClick = () => {
 toast.info(t.hr.importFeatureComingSoon);
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
 {labels.active}
 </span>
 );
 case 'draft':
 return (
 <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
 <Edit className="w-3 h-3" />
 {labels.draft}
 </span>
 );
 case 'superseded':
 return (
 <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
 <History className="w-3 h-3" />
 {labels.superseded}
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
 <span className="text-sm text-yellow-800 font-medium">{labels.criticalNote}</span>
 </div>

 {/* Action Bar */}
 <div className="flex flex-wrap items-center justify-between gap-4">
 {/* Filter */}
 <div className="flex items-center gap-2">
 <span className="text-sm text-muted-foreground">{labels.filterBy}:</span>
 <Select value={filterStatus} onValueChange={setFilterStatus}>
 <SelectTrigger className="w-32">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{labels.all}</SelectItem>
 <SelectItem value="draft">{labels.draft}</SelectItem>
 <SelectItem value="active">{labels.active}</SelectItem>
 <SelectItem value="superseded">{labels.superseded}</SelectItem>
 </SelectContent>
 </Select>
 <span className="text-sm text-muted-foreground">
 {latestRecords.length} {labels.records}
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
 <span className={'ms-2'}>{labels.syncStaff}</span>
 </Button>

 <Button
 variant="default"
 size="sm"
 onClick={() => setShowAddGradeModal(true)}
 className="bg-green-600 hover:bg-green-700"
 >
 <Plus className="w-4 h-4" />
 <span className={'ms-2'}>{labels.addGrade}</span>
 </Button>

 <Button
 variant="default"
 size="sm"
 onClick={() => setShowManageGradesModal(true)}
 className="bg-purple-600 hover:bg-purple-700"
 >
 <Settings className="w-4 h-4" />
 <span className={'ms-2'}>{labels.manageGrades}</span>
 </Button>

 <Button
 variant="default"
 size="sm"
 onClick={handleImportClick}
 className="bg-indigo-600 hover:bg-indigo-700"
 >
 <Upload className="w-4 h-4" />
 <span className={'ms-2'}>{labels.importExcel}</span>
 </Button>

 <Button variant="outline" size="sm" onClick={handleExportExcel}>
 <Download className="w-4 h-4" />
 <span className={'ms-2'}>{labels.exportExcel}</span>
 </Button>

 <Button variant="outline" size="sm" onClick={handlePrint}>
 <Printer className="w-4 h-4" />
 <span className={'ms-2'}>{labels.print}</span>
 </Button>
 </div>
 </div>

 {/* Table */}
 <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
 {isLoading ? (
 <div className="flex items-center justify-center py-12">
 <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
 <span className="ms-2 text-muted-foreground">{labels.loading}</span>
 </div>
 ) : latestRecords.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-12 text-center">
 <History className="w-12 h-12 text-gray-300 mb-4" />
 <p className="text-muted-foreground max-w-md">{labels.noRecords}</p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="bg-gray-50 border-b">
 <tr>
 <th className="px-4 py-3 text-start font-medium text-gray-700">{labels.staffId}</th>
 <th className="px-4 py-3 text-start font-medium text-gray-700">{labels.staffName}</th>
 <th className="px-4 py-3 text-start font-medium text-gray-700">{labels.position}</th>
 <th className="px-4 py-3 text-start font-medium text-gray-700">{labels.grade}</th>
 <th className="px-4 py-3 text-start font-medium text-gray-700">{labels.step}</th>
 <th className="px-4 py-3 text-end font-medium text-gray-700">{labels.approvedSalary}</th>
 <th className="px-4 py-3 text-end font-medium text-gray-700">{labels.housing}</th>
 <th className="px-4 py-3 text-end font-medium text-gray-700">{labels.transport}</th>
 <th className="px-4 py-3 text-center font-medium text-gray-700">{labels.status}</th>
 <th className="px-4 py-3 text-center font-medium text-gray-700">{labels.version}</th>
 <th className="px-4 py-3 text-center font-medium text-gray-700">{labels.actions}</th>
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
 title={labels.edit}
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
 title={labels.viewHistory}
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
 title={labels.activate}
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
 title={record.isLocked ? labels.unlock : labels.lock}
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
 title={labels.delete}
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
 <div className="text-sm text-muted-foreground">{t.hr.totalRecords}</div>
 </div>
 <div className="bg-white rounded-lg border p-4 text-center">
 <div className="text-2xl font-bold text-yellow-600">{stats.draft}</div>
 <div className="text-sm text-muted-foreground">{labels.draft}</div>
 </div>
 <div className="bg-white rounded-lg border p-4 text-center">
 <div className="text-2xl font-bold text-green-600">{stats.active}</div>
 <div className="text-sm text-muted-foreground">{labels.active}</div>
 </div>
 <div className="bg-white rounded-lg border p-4 text-center">
 <div className="text-2xl font-bold text-gray-500">{stats.superseded}</div>
 <div className="text-sm text-muted-foreground">{labels.superseded}</div>
 </div>
 </div>
 )}

 {/* Modals */}
 {showEditModal && selectedRecord && (
 <EditCurrentSalaryModal
 salaryRecordId={selectedRecord.id}
 employee={{
 id: selectedRecord.employeeId,
 staffId: selectedRecord.staffId,
 fullName: selectedRecord.staffFullName,
 position: selectedRecord.position || '',
 department: selectedRecord.department || '',
 grade: selectedRecord.gradeCode,
 step: selectedRecord.step,
 basicSalary: parseFloat(selectedRecord.approvedGrossSalary),
 housingAllowance: parseFloat(selectedRecord.housingAllowance || '0'),
 transportAllowance: parseFloat(selectedRecord.transportAllowance || '0'),
 representationAllowance: parseFloat(selectedRecord.representationAllowance || '0'),
 representationAllowanceType: selectedRecord.representationAllowanceType || 'value',
 annualAllowance: parseFloat(selectedRecord.annualAllowance || '0'),
 bonus: parseFloat(selectedRecord.bonus || '0'),
 otherAllowances: parseFloat(selectedRecord.otherAllowances || '0'),
 effectiveStartDate: selectedRecord.effectiveStartDate,
 effectiveEndDate: selectedRecord.effectiveEndDate || undefined,
 status: selectedRecord.status,
 lastApprovedBy: undefined,
 lastUpdatedDate: typeof selectedRecord.updatedAt === 'string' 
   ? selectedRecord.updatedAt 
   : selectedRecord.updatedAt?.toISOString?.() || new Date().toISOString(),
 createdDate: typeof selectedRecord.createdAt === 'string'
   ? selectedRecord.createdAt
   : selectedRecord.createdAt?.toISOString?.() || new Date().toISOString(),
 createdBy: 'System',
 isLocked: Boolean(selectedRecord.isLocked),
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
 language={language}
 isRTL={isRTL}
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
