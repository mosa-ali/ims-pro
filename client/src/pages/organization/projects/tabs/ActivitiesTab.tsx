import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { 
 Plus, Download, Upload, FileSpreadsheet, 
 Edit2, Trash2, Calendar, BarChart3, X, Search 
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { UnifiedExportButton } from '@/components/exports/UnifiedExportButton';
import { ActivitiesTabSkeleton } from '@/components/ProjectTabSkeletons';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { exportToStandardExcel, exportExcelTemplate, type ExcelColumn } from '@/lib/standardExcelExport';
import { PreImportPreviewDialog } from '@/components/PreImportPreviewDialog';
import { validateImportData, type PreviewRow } from '@/lib/clientSideValidation';
import { ACTIVITIES_CONFIG } from '@shared/importConfigs/activities';
import { generateActivitiesTemplate } from '@/lib/templateGenerator';

// ✅ Helper function to get currency symbol
const getCurrencySymbol = (currency: string): string => {
 const symbols: Record<string, string> = {
  'EUR': '€',
  'USD': '$',
  'CHF': 'CHF ',
  'GBP': '£',
  'YER': 'YER ',
  'SAR': 'SAR ',
 };
 return symbols[currency] || currency + ' ';
};

// ✅ Helper function to format currency with symbol
const formatCurrencyWithSymbol = (amount: number, currency: string): string => {
 const symbol = getCurrencySymbol(currency);
 return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Helper function to format dates (handles both Date objects and strings)
const formatDate = (date: Date | string | null | undefined): string => {
 if (!date) return '';
 if (date instanceof Date) {
 return date.toISOString().split('T')[0];
 }
 if (typeof date === 'string') {
 // If already a string, try to parse and format it
 const parsed = new Date(date);
 if (!isNaN(parsed.getTime())) {
 return parsed.toISOString().split('T')[0];
 }
 return date;
 }
 return '';
};

// Activity type matches database schema
interface Activity {
 id: number;
 projectId: number;
 organizationId: number;
 operatingUnitId: number | null;
 activityCode: string;
 activityName: string;
 activityNameAr: string | null;
 description: string | null;
 descriptionAr: string | null;
 plannedStartDate: string;
 plannedEndDate: string;
 actualStartDate: string | null;
 actualEndDate: string | null;
 status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
 progressPercentage: string;
 budgetAllocated: string;
 actualSpent: string;
 currency: 'USD' | 'EUR' | 'GBP' | 'CHF';
 location: string | null;
 locationAr: string | null;
 responsiblePerson: string | null;
 isDeleted: boolean;
 deletedAt: string | null;
 deletedBy: number | null;
 createdAt: string;
 updatedAt: string;
 createdBy: number | null;
 updatedBy: number | null;
}

interface ActivitiesTabProps {
 projectId: string;
}

export function ActivitiesTab({
 projectId }: ActivitiesTabProps) {
 const { t } = useTranslation();
 const { isRTL } = useLanguage();
 // ✅ Load activities from database via tRPC
 const projectIdNum = parseInt(projectId, 10);
 const { data: activities = [], isLoading, refetch } = trpc.activities.getByProject.useQuery({ projectId: projectIdNum });
 
 // ✅ FIXED: Fetch project to get currency
 const { data: projectData } = trpc.projects.getById.useQuery({ id: projectIdNum });
 const projectCurrency = projectData?.currency || 'USD';
 
 // Mutations
 const createMutation = trpc.activities.create.useMutation({
 onSuccess: () => {
 refetch();
 setShowCreateModal(false);
 resetForm();
 },
 });
 
 const updateMutation = trpc.activities.update.useMutation({
 onSuccess: () => {
 refetch();
 setShowEditModal(false);
 setSelectedActivity(null);
 resetForm();
 },
 });
 
 const deleteMutation = trpc.activities.delete.useMutation({
 onSuccess: () => {
 refetch();
 setShowDeleteConfirm(false);
 setSelectedActivity(null);
 },
 });
 const [searchTerm, setSearchTerm] = useState('');
 const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');
 const [showCreateModal, setShowCreateModal] = useState(false);
 const [showEditModal, setShowEditModal] = useState(false);
 const [showImportModal, setShowImportModal] = useState(false);
 const [showPreviewDialog, setShowPreviewDialog] = useState(false);
 const [validRows, setValidRows] = useState<PreviewRow[]>([]);
 const [invalidRows, setInvalidRows] = useState<PreviewRow[]>([]);
 const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
 const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

 // Form state
 const [formData, setFormData] = useState({
 activityCode: '',
 activityName: '',
 activityNameAr: '',
 description: '',
 descriptionAr: '',
 status: 'NOT_STARTED' as Activity['status'],
 plannedStartDate: '',
 plannedEndDate: '',
 actualStartDate: '',
 actualEndDate: '',
 budgetAllocated: '0.00',
 actualSpent: '0.00',
 progressPercentage: '0.00',
 target: '',
 unitType: '',
 achievedValue: '',
 currency: projectCurrency as Activity['currency'], // ✅ FIXED: Use project currency
 location: '',
 locationAr: '',
 responsiblePerson: ''
 });

 // Filter activities
 const filteredActivities = activities.filter(activity =>
 activity.activityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
 activity.activityCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
 (activity.responsiblePerson && activity.responsiblePerson.toLowerCase().includes(searchTerm.toLowerCase()))
 );

 // Export to Excel
 const handleExportExcel = async () => {
 const columns: ExcelColumn[] = [
 { name: t.projectDetail.activityCode, key: 'activityCode', width: 15, type: 'text' },
 { name: t.projectDetail.activityTitle, key: 'activityName', width: 40, type: 'text' },
 { name: t.projectDetail.activityDescription, key: 'description', width: 50, type: 'text' },
 { name: t.projectDetail.activityStatus, key: 'status', width: 15, type: 'text' },
 { name: t.projectDetail.activityStartDate, key: 'plannedStartDate', width: 15, type: 'date' },
 { name: t.projectDetail.activityEndDate, key: 'plannedEndDate', width: 15, type: 'date' },
 { name: `${t.projectDetail.activityBudget} (${projectCurrency})`, key: 'budgetAllocated', width: 15, type: 'currency', totals: 'sum' }, // ✅ FIXED: Dynamic currency
 { name: `${t.projectDetail.activitySpent} (${projectCurrency})`, key: 'actualSpent', width: 15, type: 'currency', totals: 'sum' }, // ✅ FIXED: Dynamic currency
 { name: `${t.projectDetail.activityCompletion} (%)`, key: 'progressPercentage', width: 15, type: 'number', totals: 'average' },
 { name: t.projectDetail.activityResponsible, key: 'responsiblePerson', width: 25, type: 'text' },
 { name: t.projectDetail.activityLocation, key: 'location', width: 25, type: 'text' },
 ];

 await exportToStandardExcel({
 sheetName: 'Activities',
 columns,
 data: filteredActivities,
 fileName: `Activities_Export_${new Date().toISOString().split('T')[0]}`,
 includeTotals: true,
 isRTL,
 });
 };

 // Export Empty Template
 const handleExportTemplate = async () => {
 const columns: ExcelColumn[] = [
 { name: t.projectDetail.activityCodeRequired, key: 'activityCode', width: 15, type: 'text' },
 { name: t.projectDetail.activityTitleRequired, key: 'activityName', width: 40, type: 'text' },
 { name: t.projectDetail.activityDescription, key: 'description', width: 50, type: 'text' },
 { name: t.projectDetail.activityStatus, key: 'status', width: 15, type: 'text' },
 { name: `${t.projectDetail.activityStartDate} (YYYY-MM-DD)*`, key: 'plannedStartDate', width: 20, type: 'date' },
 { name: `${t.projectDetail.activityEndDate} (YYYY-MM-DD)*`, key: 'plannedEndDate', width: 20, type: 'date' },
 { name: `${t.projectDetail.activityBudget} (${projectCurrency})`, key: 'budgetAllocated', width: 15, type: 'currency' }, // ✅ FIXED: Dynamic currency
 { name: `${t.projectDetail.activitySpent} (${projectCurrency})`, key: 'actualSpent', width: 15, type: 'currency' }, // ✅ FIXED: Dynamic currency
 { name: `${t.projectDetail.activityCompletion} (%)`, key: 'progressPercentage', width: 15, type: 'number' },
 { name: t.projectDetail.activityResponsible, key: 'responsiblePerson', width: 25, type: 'text' },
 { name: t.projectDetail.activityLocation, key: 'location', width: 25, type: 'text' },
 ];

 await exportExcelTemplate({
 sheetName: 'Activities Template',
 columns,
 fileName: 'Activities_Template',
 isRTL,
 });
 };

 // Import from Excel with Preview Dialog
 const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0];
 if (!file) return;

 try {
 const workbook = new ExcelJS.Workbook();
 const arrayBuffer = await file.arrayBuffer();
 await workbook.xlsx.load(arrayBuffer);

 const worksheet = workbook.worksheets[0];
 const items: any[] = [];

 worksheet.eachRow((row, rowNumber) => {
 if (rowNumber === 1) return; // Skip header

 items.push({
 activityCode: row.getCell(1).value?.toString() || '',
 activityTitle: row.getCell(2).value?.toString() || '',
 description: row.getCell(3).value?.toString() || '',
 status: row.getCell(4).value?.toString() || '',
 plannedStartDate: row.getCell(5).value?.toString() || '',
 plannedEndDate: row.getCell(6).value?.toString() || '',
 budget: row.getCell(7).value?.toString() || '',
 spent: row.getCell(8).value?.toString() || '',
 progress: row.getCell(9).value?.toString() || '',
 responsible: row.getCell(10).value?.toString() || '',
 location: row.getCell(11).value?.toString() || ''
 });
 });

 // Validate using shared framework
 const { validRows: valid, invalidRows: invalid } = validateImportData(
 items,
 { 
 columns: ACTIVITIES_CONFIG.columns, 
 sheetName: 'Activities', 
 language: 'en' 
 }
 );

 setValidRows(valid);
 setInvalidRows(invalid);
 setShowImportModal(false);
 setShowPreviewDialog(true);
 } catch (error) {
 console.error('Import error:', error);
 alert(t.projectDetail.errorReadingFile);
 }
 };

 // Confirm Import after Preview
 const handleConfirmImport = () => {
 if (validRows.length === 0) {
 alert(t.projectDetail.noValidDataToImport);
 return;
 }

 setShowPreviewDialog(false);

 // Convert valid rows to Activity format
 const importedActivities: Activity[] = validRows.map((row, index) => ({
 id: `imported-${Date.now()}-${index}`,
 code: row.data.activityCode,
 title: row.data.activityTitle,
 description: row.data.description || '',
 status: row.data.status as Activity['status'],
 startDate: row.data.plannedStartDate,
 endDate: row.data.plannedEndDate,
 budget: parseFloat(row.data.budget) || 0,
 spent: parseFloat(row.data.spent) || 0,
 completion: parseFloat(row.data.progress) || 0,
 responsible: row.data.responsible || '',
 location: row.data.location || ''
 }));

 setActivities([...activities, ...importedActivities]);
 alert(t.projectDetail.successfullyImported.replace('{0}', importedActivities.length.toString()));
 };

 // Create Activity
 const handleCreate = () => {
 if (!formData.activityCode || !formData.activityName || !formData.plannedStartDate || !formData.plannedEndDate) {
 alert(t.projectDetail.fillRequiredFields);
 return;
 }

 createMutation.mutate({
 projectId: projectIdNum,
 activityCode: formData.activityCode,
 activityName: formData.activityName,
 activityNameAr: formData.activityNameAr || undefined,
 description: formData.description || undefined,
 descriptionAr: formData.descriptionAr || undefined,
 plannedStartDate: formData.plannedStartDate,
 plannedEndDate: formData.plannedEndDate,
 actualStartDate: formData.actualStartDate || undefined,
 actualEndDate: formData.actualEndDate || undefined,
 status: formData.status,
 progressPercentage: formData.progressPercentage,
 target: formData.target || undefined,
 unitType: formData.unitType || undefined,
 achievedValue: formData.achievedValue || undefined,
 budgetAllocated: formData.budgetAllocated,
 actualSpent: formData.actualSpent,
 currency: formData.currency,
 location: formData.location || undefined,
 locationAr: formData.locationAr || undefined,
 responsiblePerson: formData.responsiblePerson || undefined,
 });
 };

 // Edit Activity
 const handleEdit = () => {
 if (!selectedActivity) return;

 updateMutation.mutate({
 id: selectedActivity.id,
 activityCode: formData.activityCode || undefined,
 activityName: formData.activityName || undefined,
 activityNameAr: formData.activityNameAr || undefined,
 description: formData.description || undefined,
 descriptionAr: formData.descriptionAr || undefined,
 plannedStartDate: formData.plannedStartDate || undefined,
 plannedEndDate: formData.plannedEndDate || undefined,
 actualStartDate: formData.actualStartDate || undefined,
 actualEndDate: formData.actualEndDate || undefined,
 status: formData.status || undefined,
 progressPercentage: formData.progressPercentage || undefined,
 target: formData.target || undefined,
 unitType: formData.unitType || undefined,
 achievedValue: formData.achievedValue || undefined,
 budgetAllocated: formData.budgetAllocated || undefined,
 actualSpent: formData.actualSpent || undefined,
 currency: formData.currency || undefined,
 location: formData.location || undefined,
 locationAr: formData.locationAr || undefined,
 responsiblePerson: formData.responsiblePerson || undefined,
 });
 };

 // Delete Activity
 const handleDelete = () => {
 if (!selectedActivity) return;
 
 deleteMutation.mutate({ id: selectedActivity.id });
 };

 const resetForm = () => {
 setFormData({
 activityCode: '',
 activityName: '',
 activityNameAr: '',
 description: '',
 descriptionAr: '',
 status: 'NOT_STARTED',
 plannedStartDate: '',
 plannedEndDate: '',
 actualStartDate: '',
 actualEndDate: '',
 budgetAllocated: '0.00',
 actualSpent: '0.00',
 progressPercentage: '0.00',
 target: '',
 unitType: '',
 achievedValue: '',
 currency: 'USD',
 location: '',
 locationAr: '',
 responsiblePerson: ''
 });
 };

 const openEditModal = (activity: Activity) => {
 setSelectedActivity(activity);
 setFormData({
 activityCode: activity.activityCode,
 activityName: activity.activityName,
 activityNameAr: activity.activityNameAr || '',
 description: activity.description || '',
 descriptionAr: activity.descriptionAr || '',
 status: activity.status,
 plannedStartDate: formatDate(activity.plannedStartDate),
 plannedEndDate: formatDate(activity.plannedEndDate),
 actualStartDate: formatDate(activity.actualStartDate) || '',
 actualEndDate: formatDate(activity.actualEndDate) || '',
 budgetAllocated: activity.budgetAllocated,
 actualSpent: activity.actualSpent,
 progressPercentage: activity.progressPercentage,
 target: activity.target || '',
 unitType: activity.unitType || '',
 achievedValue: activity.achievedValue || '',
 currency: activity.currency,
 location: activity.location || '',
 locationAr: activity.locationAr || '',
 responsiblePerson: activity.responsiblePerson || ''
 });
 setShowEditModal(true);
 };

 const openDeleteConfirm = (activity: Activity) => {
 setSelectedActivity(activity);
 setShowDeleteConfirm(true);
 };

 if (isLoading) {
 return <ActivitiesTabSkeleton />;
 }

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header with Actions */}
 <div className="flex items-center justify-between mt-6">
 <div className="text-start">
 <h2 className="text-sm font-semibold text-gray-900">{t.projectDetail.activitiesPageTitle}</h2>
 <p className="text-xs text-gray-600 mt-0.5">{t.projectDetail.activitiesPageSubtitle}</p>
 </div>
 <div className="flex items-center gap-2">
 <button
 onClick={() => setViewMode(viewMode === 'table' ? 'timeline' : 'table')}
 className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
 >
 {viewMode === 'table' ? <BarChart3 className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
 {viewMode === 'table' ? t.projectDetail.timelineView : t.projectDetail.tableView}
 </button>
 <UnifiedExportButton
 hasData={filteredActivities.length > 0}
 onExportData={handleExportExcel}
 onExportTemplate={handleExportTemplate}
 moduleName="Activities"
 showModal={true}
 />
 <button
 onClick={() => setShowImportModal(true)}
 className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
 >
 <Upload className="w-4 h-4" />
 {t.projectDetail.importActivities}
 </button>
 <button
 onClick={() => setShowCreateModal(true)}
 className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2"
 >
 <Plus className="w-4 h-4" />
 {t.projectDetail.addActivity}
 </button>
 </div>
 </div>

 {/* Search */}
 <div className="relative">
 <Search className="absolute top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 start-3" />
 <input
 type="text"
 placeholder={t.projectDetail.searchActivities}
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full py-2 ps-10 pe-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start"
 />
 </div>

 {/* Summary Cards */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div className="bg-white border border-gray-200 rounded-lg p-4">
 <div className="text-sm text-gray-600 text-start">{t.projectDetail.totalActivities}</div>
 <div className="text-2xl font-bold text-gray-900 text-start"><span className="ltr-safe">{activities.length}</span></div>
 </div>
 <div className="bg-white border border-gray-200 rounded-lg p-4">
 <div className="text-sm text-gray-600 text-start">{t.projectDetail.inProgress}</div>
 <div className="text-2xl font-bold text-blue-600 text-start">
 <span className="ltr-safe">{activities.filter(a => a.status === 'In Progress').length}</span>
 </div>
 </div>
 <div className="bg-white border border-gray-200 rounded-lg p-4">
 <div className="text-sm text-gray-600 text-start">{t.projectDetail.completed}</div>
 <div className="text-2xl font-bold text-green-600 text-start">
 <span className="ltr-safe">{activities.filter(a => a.status === 'Completed').length}</span>
 </div>
 </div>
 <div className="bg-white border border-gray-200 rounded-lg p-4">
 <div className="text-sm text-gray-600 text-start">{t.projectDetail.totalBudget}</div>
 <div className="text-2xl font-bold text-gray-900 text-start">
 {/* ✅ FIXED: Use dynamic currency instead of hardcoded $ */}
 <span className="ltr-safe">{formatCurrencyWithSymbol(activities.reduce((sum, a) => sum + parseFloat(a.budgetAllocated || '0'), 0), projectCurrency)}</span>
 </div>
 </div>
 </div>

 {/* Table or Timeline View */}
 {viewMode === 'table' ? (
 <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase text-start">{t.projectDetail.code}</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase text-start">{t.projectDetail.title}</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase text-start">{t.projectDetail.activityStatus}</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase text-start">{t.projectDetail.activityDuration}</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase text-start">{t.projectDetail.activityBudget}</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase text-start">{t.projectDetail.activityProgress}</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase text-start">{t.projectDetail.responsible}</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase text-start">{t.projectDetail.actions}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {filteredActivities.length === 0 ? (
 <tr>
 <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
 {t.projectDetail.noActivitiesFound}
 </td>
 </tr>
 ) : (
 filteredActivities.map((activity) => (
 <tr key={activity.id} className="hover:bg-gray-50">
 <td className="px-4 py-3 text-sm text-start"><span className="ltr-safe">{activity.activityCode}</span></td>
 <td className="px-4 py-3 text-sm text-start">
 <div className="font-medium text-gray-900">
 {isRTL 
 ? activity.activityNameAr || activity.activityName
 : activity.activityName
 }
 </div>
 <div className="text-xs text-gray-500">{isRTL ? activity.locationAr || activity.location : activity.location}</div>
 </td>
 <td className="px-4 py-3 text-sm text-start">
 <span className={`px-2 py-1 text-xs font-medium rounded-full ${ activity.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : activity.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : activity.status === 'ON_HOLD' ? 'bg-yellow-100 text-yellow-700' : activity.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700' }`}>
 {activity.status === 'COMPLETED' ? t.projectDetail.activityStatusCompleted :
 activity.status === 'IN_PROGRESS' ? t.projectDetail.activityStatusInProgress :
 activity.status === 'ON_HOLD' ? t.projectDetail.activityStatusOnHold :
 activity.status === 'CANCELLED' ? t.projectDetail.activityStatusCancelled :
 t.projectDetail.activityStatusNotStarted}
 </span>
 </td>
 <td className="px-4 py-3 text-sm text-start">
 <span className="ltr-safe">{formatDate(activity.plannedStartDate)} - {formatDate(activity.plannedEndDate)}</span>
 </td>
 <td className="px-4 py-3 text-sm text-start">
 {/* ✅ FIXED: Use dynamic currency instead of hardcoded $ */}
 <span className="ltr-safe">{formatCurrencyWithSymbol(parseFloat(activity.budgetAllocated || '0'), activity.currency)}</span>
 </td>
 <td className="px-4 py-3 text-start">
 <div className="flex items-center gap-2">
 <div className="ltr-safe flex-1 bg-gray-200 rounded-full h-2">
 <div
 className="bg-primary h-2 rounded-full"
 style={{ width: `${parseFloat(activity.progressPercentage || '0')}%` }}
 />
 </div>
 <span className="ltr-safe text-sm text-gray-600">{parseFloat(activity.progressPercentage || '0')}%</span>
 </div>
 </td>
 <td className="px-4 py-3 text-sm text-start">
 {activity.responsiblePerson}
 </td>
 <td className="px-4 py-3 text-sm text-start">
 <div className="flex items-center gap-2">
 <button
 onClick={() => openEditModal(activity)}
 className="text-blue-600 hover:text-blue-800"
 >
 <Edit2 className="w-4 h-4" />
 </button>
 <button
 onClick={() => openDeleteConfirm(activity)}
 className="text-red-600 hover:text-red-800"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>
 ) : (
 <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-4 text-start">{t.projectDetail.timelineView}</h3>
 <div className="space-y-4">
 {filteredActivities.map((activity) => (
 <div key={activity.id} className="border border-gray-200 rounded-lg p-4">
 <div className="flex items-start justify-between">
 <div className="flex-1">
 <div className="flex items-center gap-2 mb-2">
 <span className="ltr-safe font-medium text-gray-900">{activity.activityCode}</span>
 <span className={`px-2 py-1 text-xs font-medium rounded-full ${ activity.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : activity.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700' }`}>
 {activity.status === 'COMPLETED' ? t.projectDetail.activityStatusCompleted :
 activity.status === 'IN_PROGRESS' ? t.projectDetail.activityStatusInProgress :
 activity.status === 'ON_HOLD' ? t.projectDetail.activityStatusOnHold :
 activity.status === 'CANCELLED' ? t.projectDetail.activityStatusCancelled :
 t.projectDetail.activityStatusNotStarted}
 </span>
 </div>
 <h4 className="font-semibold text-gray-900 text-start">
 {isRTL 
 ? activity.activityNameAr || activity.activityName
 : activity.activityName
 }
 </h4>
 <p className="text-sm text-gray-600 mt-1 text-start">{isRTL ? activity.descriptionAr || activity.description : activity.description}</p>
 <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
 <span className="ltr-safe">📅 {formatDate(activity.plannedStartDate)} → {formatDate(activity.plannedEndDate)}</span>
 {/* ✅ FIXED: Use dynamic currency instead of hardcoded $ */}
 <span className="ltr-safe">💰 {formatCurrencyWithSymbol(parseFloat(activity.budgetAllocated || '0'), activity.currency)}</span>
 <span>👤 {activity.responsiblePerson}</span>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <button
 onClick={() => openEditModal(activity)}
 className="p-2 text-blue-600 hover:bg-blue-50 rounded"
 >
 <Edit2 className="w-4 h-4" />
 </button>
 <button
 onClick={() => openDeleteConfirm(activity)}
 className="p-2 text-red-600 hover:bg-red-50 rounded"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 </div>
 <div className="mt-3">
 <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
 <span>{t.projectDetail.activityProgress}</span>
 <span className="ltr-safe">{parseFloat(activity.progressPercentage || '0')}%</span>
 </div>
 <div className="ltr-safe bg-gray-200 rounded-full h-2">
 <div
 className="bg-primary h-2 rounded-full transition-all"
 style={{ width: `${parseFloat(activity.progressPercentage || '0')}%` }}
 />
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Create Modal */}
 {showCreateModal && (
 <Modal
 title={t.projectDetail.addNewActivity}
 onClose={() => {
 setShowCreateModal(false);
 resetForm();
 }}
 >
 <ActivityForm
 formData={formData}
 onChange={setFormData}
 onSubmit={handleCreate}
 onCancel={() => {
 setShowCreateModal(false);
 resetForm();
 }}
 t={t}
 isRTL={isRTL}
 />
 </Modal>
 )}

 {/* Edit Modal */}
 {showEditModal && (
 <Modal
 title={t.projectDetail.editActivity}
 onClose={() => {
 setShowEditModal(false);
 setSelectedActivity(null);
 resetForm();
 }}
 >
 <ActivityForm
 formData={formData}
 onChange={setFormData}
 onSubmit={handleEdit}
 onCancel={() => {
 setShowEditModal(false);
 setSelectedActivity(null);
 resetForm();
 }}
 isEdit
 t={t}
 isRTL={isRTL}
 />
 </Modal>
 )}

 {/* Import Modal */}
 {showImportModal && (
 <Modal
 title={t.projectDetail.importActivitiesTitle}
 onClose={() => setShowImportModal(false)}
 >
 <div>
 <p className="text-sm text-gray-600 mb-4">
 {t.projectDetail.importActivitiesDesc}
 </p>
 <input
 type="file"
 accept=".xlsx,.xls"
 onChange={handleImportExcel}
 className="w-full px-3 py-2 border border-gray-300 rounded-md"
 />
 <div className={`mt-4 flex justify-end`}>
 <button
 onClick={() => setShowImportModal(false)}
 className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
 >
 {t.common.cancel}
 </button>
 </div>
 </div>
 </Modal>
 )}

 {/* Delete Confirmation */}
 {showDeleteConfirm && selectedActivity && (
 <Modal
 title={t.projects.deleteConfirm}
 onClose={() => {
 setShowDeleteConfirm(false);
 setSelectedActivity(null);
 }}
 >
 <div>
 <p className={`text-sm text-gray-600 mb-4 text-start`}>
 {t.projectDetail.confirmDeleteActivity.replace('{0}', selectedActivity.activityName)}
 </p>
 <div className={`flex items-center justify-end gap-2`}>
 <button
 onClick={() => {
 setShowDeleteConfirm(false);
 setSelectedActivity(null);
 }}
 className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
 >
 {t.common.cancel}
 </button>
 <button
 onClick={handleDelete}
 className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
 >
 {t.common.delete}
 </button>
 </div>
 </div>
 </Modal>
 )}

 {/* Pre-Import Preview Dialog */}
 <PreImportPreviewDialog
 open={showPreviewDialog}
 onClose={() => setShowPreviewDialog(false)}
 onConfirmImport={handleConfirmImport}
 validRows={validRows}
 invalidRows={invalidRows}
 columns={[
 { key: 'activityCode', label: t.projectDetail.activityCode },
 { key: 'activityTitle', label: t.projectDetail.activityTitle },
 { key: 'status', label: t.projectDetail.status },
 { key: 'plannedStartDate', label: t.projectDetail.startDate },
 { key: 'plannedEndDate', label: t.projectDetail.endDate },
 { key: 'budget', label: t.projectDetail.budget },
 { key: 'progress', label: t.projectDetail.progress }
 ]}
 moduleName={t.projectDetail.activities}
 />
 </div>
 );
}

// Modal Component
function Modal({
 title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const { language, isRTL} = useLanguage();
 return (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
 <div className="flex items-center justify-between p-6 border-b border-gray-200">
 <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
 <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
 <X className="w-5 h-5" />
 </button>
 </div>
 <div className="p-6">{children}</div>
 </div>
 </div>
 );
}

// Activity Form Component
interface ActivityFormProps {
 formData: Omit<Activity, 'id'>;
 onChange: (data: Omit<Activity, 'id'>) => void;
 onSubmit: () => void;
 onCancel: () => void;
 isEdit?: boolean;
 t: any;
 isRTL: boolean;
}

function ActivityForm({
 formData, onChange, onSubmit, onCancel, isEdit, t, isRTL }: ActivityFormProps) {
 return (
 <form
 onSubmit={(e) => {
 e.preventDefault();
 onSubmit();
 }}
 className="space-y-4"
 >
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>{t.projectDetail.activityCodeRequired}</label>
 <input
 type="text"
 required
 value={formData.activityCode}
 onChange={(e) => onChange({ ...formData, activityCode: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>{t.projectDetail.activityStatus}</label>
 <select
 value={formData.status}
 onChange={(e) => onChange({ ...formData, status: e.target.value as Activity['status'] })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 >
 <option value="NOT_STARTED">{t.projectDetail.activityStatusNotStarted}</option>
 <option value="IN_PROGRESS">{t.projectDetail.activityStatusInProgress}</option>
 <option value="COMPLETED">{t.projectDetail.activityStatusCompleted}</option>
 <option value="ON_HOLD">{t.projectDetail.activityStatusOnHold}</option>
 <option value="CANCELLED">{t.projectDetail.activityStatusCancelled}</option>
 </select>
 </div>
 </div>

 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>{t.projectDetail.activityTitleRequired}</label>
 <input
 type="text"
 required
 value={formData.activityName}
 onChange={(e) => onChange({ ...formData, activityName: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 />
 </div>

 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>{t.projectDetail.activityDescription}</label>
 <textarea
 rows={3}
 value={formData.description}
 onChange={(e) => onChange({ ...formData, description: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>{t.projectDetail.activityStartDate}*</label>
 <input
 type="date"
 required
 value={formData.plannedStartDate}
 onChange={(e) => onChange({ ...formData, plannedStartDate: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>{t.projectDetail.activityEndDate}*</label>
 <input
 type="date"
 required
 value={formData.plannedEndDate}
 onChange={(e) => onChange({ ...formData, plannedEndDate: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 />
 </div>
 </div>

 <div className="grid grid-cols-3 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>{t.projectDetail.activityBudget} (USD)</label>
 <input
 type="number"
 min="0"
 step="0.01"
 value={formData.budgetAllocated}
 onChange={(e) => onChange({ ...formData, budgetAllocated: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>{t.projectDetail.activitySpent} (USD)</label>
 <input
 type="number"
 value={formData.actualSpent || '0.00'}
 disabled
 className={`w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 cursor-not-allowed text-start`}
 />
 <p className="text-xs text-gray-500 mt-1">{t.projectDetail.autocalculatedFromBudgetItems}</p>
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>{t.projectDetail.activityCompletion} (%)</label>
 <input
 type="number"
 value={formData.progressPercentage || '0.00'}
 disabled
 className={`w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 cursor-not-allowed text-start`}
 />
 <p className="text-xs text-gray-500 mt-1">{t.projectDetail.autocalculatedFromBudgetItems}</p>
 </div>
 </div>

 {/* Target-based Progress Tracking */}
 <div className="grid grid-cols-3 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>Target</label>
 <input
 type="number"
 min="0"
 step="0.01"
 value={formData.target || ''}
 onChange={(e) => onChange({ ...formData, target: e.target.value })}
 placeholder={t.placeholders.eG1000}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>Unit Type</label>
 <input
 type="text"
 value={formData.unitType || ''}
 onChange={(e) => onChange({ ...formData, unitType: e.target.value })}
 placeholder={t.placeholders.eGHouseholdsSessions}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>Achieved</label>
 <input
 type="number"
 min="0"
 step="0.01"
 value={formData.achievedValue || ''}
 onChange={(e) => onChange({ ...formData, achievedValue: e.target.value })}
 placeholder={t.placeholders.eG500}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>{t.projectDetail.activityResponsible}</label>
 <input
 type="text"
 value={formData.responsiblePerson}
 onChange={(e) => onChange({ ...formData, responsiblePerson: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>{t.projectDetail.activityLocation}</label>
 <input
 type="text"
 value={formData.location}
 onChange={(e) => onChange({ ...formData, location: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 />
 </div>
 </div>

 <div className={`flex items-center justify-end gap-2 pt-4 border-t border-gray-200`}>
 <button
 type="button"
 onClick={onCancel}
 className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
 >
 {t.common.cancel}
 </button>
 <button
 type="submit"
 className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90"
 >
 {isEdit ? t.projectDetail.editActivity : t.projectDetail.addActivity}
 </button>
 </div>
 </form>
 );
}
