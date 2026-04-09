import { useState, useEffect, useMemo } from 'react';
import { 
 Plus, Download, Upload, Edit2, Trash2, X, Search, 
 AlertTriangle, Package, DollarSign, Calendar, Building2, Loader2, Save, Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { UnifiedExportButton } from '@/components/exports/UnifiedExportButton';
import { PreImportPreviewDialog } from '@/components/PreImportPreviewDialog';
import { validateImportData } from '@/lib/clientSideValidation';
import { PROCUREMENT_CONFIG } from '@shared/importConfigs/procurement';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';
import { exportToStandardExcel, exportExcelTemplate, type ExcelColumn } from '@/lib/standardExcelExport';
import { trpc } from '@/lib/trpc';
import { ProcurementPlanTabSkeleton } from "@/components/ProjectTabSkeletons";
// organizationId and operatingUnitId now come from project data via tRPC query

interface ProcurementPlanTabProps {
 projectId: string;
}

export function ProcurementPlanTab({
 projectId }: ProcurementPlanTabProps) {
  const { t } = useTranslation();
 const { isRTL } = useLanguage();
// Load project data via tRPC query (like ForecastPlanTab)
 const { data: project, isLoading: projectLoading } = trpc.projects.getById.useQuery({ id: parseInt(projectId) });
 
 // Get organizationId and operatingUnitId from project data
 const organizationId = project?.organizationId;
 const operatingUnitId = project?.operatingUnitId;

 // Load procurement items from database
 const { data: procurementItems = [], isLoading: itemsLoading, refetch: refetchItems } = trpc.procurement.getByProject.useQuery(
 { 
 projectId: Number(projectId), 
 organizationId: organizationId || 0,
 operatingUnitId: operatingUnitId || 0
 },
 { enabled: !!organizationId && !!operatingUnitId }
 );

 // Load activities from Activities tab (Single Source of Truth)
 const { data: activities = [] } = trpc.activities.getDropdownList.useQuery(
 { 
 projectId: Number(projectId), 
 organizationId: organizationId || 0 
 },
 { enabled: !!organizationId }
 );

 // Mutations
 const createMutation = trpc.procurement.create.useMutation({
 onSuccess: () => {
 refetchItems();
 setShowCreateModal(false);
 resetForm();
 },
 });

 const updateMutation = trpc.procurement.update.useMutation({
 onSuccess: () => {
 refetchItems();
 setShowEditModal(false);
 setSelectedItem(null);
 resetForm();
 },
 });

 const deleteMutation = trpc.procurement.delete.useMutation({
 onSuccess: () => {
 refetchItems();
 setShowDeleteConfirm(false);
 setSelectedItem(null);
 },
 });

 const bulkImportMutation = trpc.procurement.bulkImport.useMutation({
 onSuccess: () => {
 refetchItems();
 setShowPreviewDialog(false);
 setValidRows([]);
 setInvalidRows([]);
 },
 });

 // Generate/Initialize Procurement Plan mutation (like Forecast Plan)
 const generateProcurementMutation = trpc.procurement.generateProcurementPlan.useMutation({
 onSuccess: (data) => {
 refetchItems();
 alert(`Procurement plan initialized: ${data.created} items created from budget`);
 },
 onError: (error) => {
 alert(`Error: ${error.message}`);
 },
 });

 // Handle Initialize/Reinitialize
 const handleInitialize = async () => {
 console.log('handleInitialize called', { organizationId, operatingUnitId, projectId });
 if (!organizationId || !operatingUnitId) {
 alert('Organization and Operating Unit required');
 return;
 }
 console.log('Calling mutation...');
 generateProcurementMutation.mutate({
 projectId: Number(projectId),
 organizationId: organizationId,
 operatingUnitId: operatingUnitId,
 });
 };

 // State
 const [searchTerm, setSearchTerm] = useState('');
 const [showCreateModal, setShowCreateModal] = useState(false);
 const [showEditModal, setShowEditModal] = useState(false);
 const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
 const [showImportModal, setShowImportModal] = useState(false);
 const [showPreviewDialog, setShowPreviewDialog] = useState(false);
 const [validRows, setValidRows] = useState<any[]>([]);
 const [invalidRows, setInvalidRows] = useState<any[]>([]);
 const [selectedItem, setSelectedItem] = useState<any | null>(null);

 // Form state
 const [formData, setFormData] = useState({
 activityId: 0,
 activityCode: '',
 activityName: '',
 itemDescription: '',
 category: 'GOODS' as 'GOODS' | 'SERVICES' | 'WORKS' | 'CONSULTANCY',
 quantity: 1,
 unitOfMeasure: '',
 estimatedUnitCost: 0,
 budgetCode: '',
 budgetLine: '',
 approvedBudget: 0,
 currency: 'USD' as 'USD' | 'EUR' | 'GBP' | 'CHF',
 procurementMethod: 'ONE_QUOTATION' as 'ONE_QUOTATION' | 'THREE_QUOTATION' | 'NEGOTIABLE_QUOTATION' | 'TENDER' | 'DIRECT_PURCHASE' | 'OTHER',
 recurrence: 'ONE_TIME' as 'ONE_TIME' | 'RECURRING',
 plannedStartDate: '',
 plannedEndDate: '',
 responsibleDepartment: 'Procurement',
 status: 'PLANNED' as 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
 notes: ''
 });

 // Multi-item form state for adding multiple items per activity
 const [itemsList, setItemsList] = useState<Array<{
 itemDescription: string;
 category: string;
 quantity: number;
 unitOfMeasure: string;
 estimatedUnitCost: number;
 recurrence: string;
 procurementMethod: string;
 plannedStartDate: string;
 status: string;
 }>>([]);

 const resetForm = () => {
 setFormData({
 activityId: 0,
 activityCode: '',
 activityName: '',
 itemDescription: '',
 category: 'GOODS',
 quantity: 1,
 unitOfMeasure: '',
 estimatedUnitCost: 0,
 budgetCode: '',
 budgetLine: '',
 approvedBudget: 0,
 currency: project?.currency || 'USD',
 procurementMethod: 'ONE_QUOTATION',
 recurrence: 'ONE_TIME',
 plannedStartDate: '',
 plannedEndDate: '',
 responsibleDepartment: 'Procurement',
 status: 'PLANNED',
 notes: ''
 });
 setItemsList([]);
 };

 // Auto-populate activity name when activity is selected
 useEffect(() => {
 if (formData.activityId) {
 const activity = activities.find((a: any) => a.id === formData.activityId);
 if (activity) {
 setFormData(prev => ({
 ...prev,
 activityCode: activity.activityCode || '',
 activityName: activity.activityName || '',
 budgetLine: `Activity ${activity.activityCode}`,
 }));
 }
 }
 }, [formData.activityId, activities]);

 // Filter items
 const filteredItems = useMemo(() => {
 return procurementItems.filter((item: any) =>
 (item.itemName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
 (item.budgetLine?.toLowerCase() || '').includes(searchTerm.toLowerCase())
 );
 }, [procurementItems, searchTerm]);

 // Calculate totals
 const totalEstimatedCost = useMemo(() => {
 return procurementItems.reduce((sum: number, item: any) => sum + (parseFloat(item.estimatedCost) || 0), 0);
 }, [procurementItems]);

 const totalApprovedBudget = project?.totalBudget || 0;
 const actualSpent = project?.spent || 0;
 const remainingBudget = totalApprovedBudget - actualSpent;
 const budgetExceeded = remainingBudget < 0;

 // Add item to the items list
 const handleAddItem = () => {
 if (!formData.itemDescription) {
 alert('Please enter item description');
 return;
 }
 setItemsList(prev => [...prev, {
 itemDescription: formData.itemDescription,
 category: formData.category,
 quantity: formData.quantity,
 unitOfMeasure: formData.unitOfMeasure,
 estimatedUnitCost: formData.estimatedUnitCost,
 recurrence: formData.recurrence,
 procurementMethod: formData.procurementMethod,
 plannedStartDate: formData.plannedStartDate,
 status: formData.status,
 }]);
 // Reset item fields but keep activity selected
 setFormData(prev => ({
 ...prev,
 itemDescription: '',
 quantity: 1,
 unitOfMeasure: '',
 estimatedUnitCost: 0,
 plannedStartDate: '',
 }));
 };

 // Remove item from the list
 const handleRemoveItem = (index: number) => {
 setItemsList(prev => prev.filter((_, i) => i !== index));
 };

 // Handlers
 const handleCreate = async () => {
 if (!formData.activityId) {
 alert('Please select an activity');
 return;
 }
 
 // If there are items in the list, create them all
 // Otherwise create a single item from the form
 const itemsToCreate = itemsList.length > 0 ? itemsList : [{
 itemDescription: formData.itemDescription,
 category: formData.category,
 quantity: formData.quantity,
 unitOfMeasure: formData.unitOfMeasure,
 estimatedUnitCost: formData.estimatedUnitCost,
 recurrence: formData.recurrence,
 procurementMethod: formData.procurementMethod,
 plannedStartDate: formData.plannedStartDate,
 status: formData.status,
 }];

 if (itemsToCreate.length === 0 || !itemsToCreate[0].itemDescription) {
 alert('Please add at least one item');
 return;
 }

 // Create each item
 for (const item of itemsToCreate) {
 const totalCost = item.quantity * item.estimatedUnitCost;
 await createMutation.mutateAsync({
 projectId: Number(projectId),
 organizationId: organizationId || 0,
 operatingUnitId: operatingUnitId || 0,
 activityId: formData.activityId,
 itemName: item.itemDescription,
 description: formData.notes,
 category: item.category as any,
 quantity: item.quantity,
 unit: item.unitOfMeasure,
 estimatedCost: totalCost.toString(),
 currency: formData.currency,
 procurementMethod: item.procurementMethod as any,
 recurrence: item.recurrence as any,
 plannedProcurementDate: item.plannedStartDate,
 status: item.status as any,
 budgetLine: formData.budgetLine,
 notes: formData.notes,
 });
 }
 
 setShowCreateModal(false);
 resetForm();
 refetchItems();
 };

 const handleEdit = () => {
 if (!selectedItem) return;

 const totalCost = formData.quantity * formData.estimatedUnitCost;

 updateMutation.mutate({
 id: selectedItem.id,
 activityId: formData.activityId || undefined,
 itemName: formData.itemDescription,
 description: formData.notes,
 category: formData.category,
 quantity: formData.quantity,
 unit: formData.unitOfMeasure,
 estimatedCost: totalCost.toString(),
 currency: formData.currency,
 procurementMethod: formData.procurementMethod,
 plannedProcurementDate: formData.plannedStartDate,
 status: formData.status,
 budgetLine: formData.budgetLine,
 notes: formData.notes,
 });
 };

 const handleDelete = () => {
 if (!selectedItem) return;
 deleteMutation.mutate({ id: selectedItem.id });
 };

 const openEditModal = (item: any) => {
 setSelectedItem(item);
 setFormData({
 activityId: item.activityId || 0,
 activityCode: '',
 activityName: '',
 itemDescription: item.itemName || '',
 category: item.category || 'GOODS',
 quantity: parseFloat(item.quantity) || 1,
 unitOfMeasure: item.unit || '',
 estimatedUnitCost: parseFloat(item.estimatedCost) / (parseFloat(item.quantity) || 1),
 budgetCode: '',
 budgetLine: item.budgetLine || '',
 approvedBudget: 0,
 currency: item.currency || 'USD',
 procurementMethod: item.procurementMethod || 'DIRECT_PURCHASE',
 procurementType: 'One-time',
 plannedStartDate: item.plannedProcurementDate || '',
 plannedEndDate: item.actualProcurementDate || '',
 responsibleDepartment: 'Procurement',
 status: item.status || 'PLANNED',
 notes: item.notes || ''
 });
 setShowEditModal(true);
 };

 // Export to Excel
 const handleExportExcel = async () => {
 const columns: ExcelColumn[] = [
 { name: t.projectDetail.activityCode, key: 'activityCode', width: 15, type: 'text' },
 { name: t.projectDetail.activityName, key: 'activityName', width: 30, type: 'text' },
 { name: t.projectDetail.itemDescription, key: 'itemName', width: 40, type: 'text' },
 { name: t.projectDetail.procurementCategory, key: 'category', width: 15, type: 'text' },
 { name: t.projectDetail.quantityLabel, key: 'quantity', width: 12, type: 'number', totals: 'sum' },
 { name: t.projectDetail.unitOfMeasure, key: 'unit', width: 15, type: 'text' },
 { name: t.projectDetail.estimatedTotalCost, key: 'estimatedCost', width: 18, type: 'currency', totals: 'sum' },
 { name: t.projectDetail.budgetCode, key: 'budgetLine', width: 15, type: 'text' },
 { name: t.projectDetail.procurementMethod, key: 'procurementMethod', width: 25, type: 'text' },
 { name: t.projectDetail.plannedStartDate, key: 'plannedProcurementDate', width: 15, type: 'date' },
 { name: t.common.status, key: 'status', width: 15, type: 'text' },
 { name: t.common.notes, key: 'notes', width: 30, type: 'text' },
 ];

 // Map items to include activity code and name from activities
 const dataWithActivityCode = filteredItems.map((item: any) => {
 const activity = activities.find((a: any) => a.id === item.activityId);
 return {
 ...item,
 activityCode: activity?.activityCode || '',
 activityName: activity?.activityName || '',
 };
 });

 await exportToStandardExcel({
 sheetName: t.projectDetail.procurementPlanTitle,
 columns,
 data: dataWithActivityCode,
 fileName: `Procurement_Plan_${project?.projectCode || projectId}_${new Date().toISOString().split('T')[0]}`,
 includeTotals: true,
 isRTL,
 });
 };

 // Export Empty Template
 const handleExportTemplate = async () => {
 const columns: ExcelColumn[] = [
 { name: `${t.projectDetail.activityCode}*`, key: 'activityCode', width: 15, type: 'text' },
 { name: `${t.projectDetail.itemDescription}*`, key: 'itemName', width: 40, type: 'text' },
 { name: `${t.projectDetail.procurementCategory}*`, key: 'category', width: 15, type: 'text' },
 { name: `${t.projectDetail.quantityLabel}*`, key: 'quantity', width: 12, type: 'number' },
 { name: `${t.projectDetail.unitOfMeasure}*`, key: 'unit', width: 15, type: 'text' },
 { name: `${t.projectDetail.estimatedTotalCost}*`, key: 'estimatedCost', width: 18, type: 'currency' },
 { name: t.projectDetail.budgetCode, key: 'budgetLine', width: 15, type: 'text' },
 { name: `${t.projectDetail.procurementMethod}*`, key: 'procurementMethod', width: 25, type: 'text' },
 { name: `${t.projectDetail.plannedStartDate}*`, key: 'plannedProcurementDate', width: 15, type: 'date' },
 { name: t.common.status, key: 'status', width: 15, type: 'text' },
 { name: t.common.notes, key: 'notes', width: 30, type: 'text' },
 ];

 await exportExcelTemplate({
 sheetName: t.projectDetail.procurementPlanTitle,
 columns,
 fileName: 'Procurement_Plan_Template',
 isRTL,
 });
 };

 // Import from Excel with preview
 const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0];
 if (!file) return;

 try {
 const workbook = new Workbook();
 const arrayBuffer = await file.arrayBuffer();
 await workbook.xlsx.load(arrayBuffer);

 const worksheet = workbook.worksheets[0];
 const rawData: any[] = [];

 worksheet.eachRow((row, rowNumber) => {
 if (rowNumber === 1) return; // Skip header
 
 const rowData: any = {};
 PROCUREMENT_CONFIG.columns.forEach((col, index) => {
 rowData[col.key] = row.getCell(index + 1).value?.toString() || '';
 });
 rawData.push(rowData);
 });

 // Validate using shared framework
 const { validRows: valid, invalidRows: invalid } = validateImportData(
 rawData,
 PROCUREMENT_CONFIG
 );

 setValidRows(valid);
 setInvalidRows(invalid);
 setShowPreviewDialog(true);
 setShowImportModal(false);
 } catch (error) {
 console.error('Import error:', error);
 alert('Failed to import file. Please check the format.');
 }
 };

 // Confirm import
 const handleConfirmImport = async () => {
 if (validRows.length === 0) return;

 bulkImportMutation.mutate({
 projectId: Number(projectId),
 organizationId: organizationId || 0,
 operatingUnitId: operatingUnitId || 0,
 rows: validRows,
 });
 };

 // Status badge colors
 const getStatusColor = (status: string) => {
 switch (status) {
 case 'PLANNED': return 'bg-gray-100 text-gray-700';
 case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700';
 case 'COMPLETED': return 'bg-emerald-100 text-emerald-700';
 case 'CANCELLED': return 'bg-red-100 text-red-700';
 default: return 'bg-gray-100 text-gray-700';
 }
 };

 const getCategoryColor = (category: string) => {
 switch (category) {
 case 'GOODS': return 'bg-blue-100 text-blue-700';
 case 'SERVICES': return 'bg-purple-100 text-purple-700';
 case 'WORKS': return 'bg-orange-100 text-orange-700';
 case 'CONSULTANCY': return 'bg-teal-100 text-teal-700';
 default: return 'bg-gray-100 text-gray-700';
 }
 };

 // Helper to translate category labels
 const getCategoryLabel = (category: string) => {
 switch (category) {
 case 'GOODS': return t.projectDetail.categoryGoods;
 case 'SERVICES': return t.projectDetail.categoryServices;
 case 'WORKS': return t.projectDetail.categoryWorks;
 case 'CONSULTANCY': return t.projectDetail.categoryConsultancy;
 default: return category;
 }
 };

 // Helper to translate status labels
 const getStatusLabel = (status: string) => {
 switch (status) {
 case 'PLANNED': return t.projectDetail.statusPlanned;
 case 'IN_PROGRESS': return t.projectDetail.statusInProgress;
 case 'COMPLETED': return t.projectDetail.statusCompleted;
 case 'CANCELLED': return t.projectDetail.statusCancelled;
 default: return status;
 }
 };

 // Helper to translate procurement method labels
 const getProcurementMethodLabel = (method: string) => {
 switch (method) {
 case 'ONE_QUOTATION': return t.projectDetail.methodOneQuotation;
 case 'THREE_QUOTATION': return t.projectDetail.methodThreeQuotation;
 case 'NEGOTIABLE_QUOTATION': return t.projectDetail.methodNegotiable;
 case 'TENDER': return t.projectDetail.methodTender;
 case 'DIRECT_PURCHASE': return t.projectDetail.methodDirectProcurement;
 case 'OTHER': return t.common.other;
 default: return method?.replace(/_/g, ' ') || '-';
 }
 };

 if (projectLoading || itemsLoading) {
 return <ProcurementPlanTabSkeleton />;
 }

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header Section */}
 <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200 text-start">
 <div className="flex items-start justify-between gap-4">
 <div>
 <h2 className="text-sm font-semibold text-gray-900 mb-1">{t.projectDetail.procurementPlanTitle}</h2>
 <p className="text-xs text-gray-600">{t.projectDetail.procurementPlanSubtitle}</p>
 <div className="flex items-center gap-4 mt-3 text-xs">
 <div>
 <span className="text-gray-600">{t.projectDetail.projectCode}: </span>
 <span className="ltr-safe font-medium">{project?.projectCode}</span>
 </div>
 <div>
 <span className="text-gray-600">{t.projectDetail.projectName}: </span>
 <span className="font-medium">{project?.projectTitle}</span>
 </div>
 {project && (
 <div>
 <span className="text-gray-600">{t.projectDetail.procurementPlanPeriod}: </span>
 <span className="ltr-safe font-medium">
 {project.startDate instanceof Date 
 ? project.startDate.toISOString().split('T')[0] 
 : String(project.startDate).split('T')[0]} - {project.endDate instanceof Date 
 ? project.endDate.toISOString().split('T')[0] 
 : String(project.endDate).split('T')[0]}
 </span>
 </div>
 )}
 </div>
 </div>
 </div>
 </div>

 {/* Action Buttons - Matching Forecast Plan Pattern */}
 <div className="flex items-center justify-end gap-2">
 <UnifiedExportButton
 hasData={filteredItems.length > 0}
 onExportData={handleExportExcel}
 onExportTemplate={handleExportTemplate}
 moduleName="Procurement"
 showModal={true}
 />
 <Button variant="outline" onClick={() => setShowImportModal(true)}>
 <Upload className="w-4 h-4 me-2" />
 {t.common.import}
 </Button>
 <Button variant="outline" onClick={() => window.print()} className="no-print">
 <Printer className="w-4 h-4 me-2" />
 {t.common.print}
 </Button>
 <Button variant="outline" onClick={handleInitialize} disabled={generateProcurementMutation.isPending}>
 <Save className="w-4 h-4 me-2" />
 {generateProcurementMutation.isPending ? t.common.loading : t.forecastPlan.reinitialize}
 </Button>
 <Button onClick={() => setShowCreateModal(true)}>
 <Plus className="w-4 h-4 me-2" />
 {t.common.create} +
 </Button>
 </div>

 {/* Search */}
 <div className="relative">
 <Search className="absolute top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 start-3" />
 <input
 type="text"
 placeholder={t.projectDetail.searchProcurementItems}
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ps-10 pe-4 text-start"
 />
 </div>

 {/* Summary Cards */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div className="bg-white border border-gray-200 rounded-lg p-4">
 <div className="flex items-center gap-2 mb-2">
 <Package className="w-5 h-5 text-blue-600" />
 <div className="text-sm text-gray-600 text-start">{t.projectDetail.totalProcurementItems}</div>
 </div>
 <div className="ltr-safe text-2xl font-bold text-gray-900">{procurementItems.length}</div>
 </div>
 <div className="bg-white border border-gray-200 rounded-lg p-4">
 <div className="flex items-center gap-2 mb-2">
 <DollarSign className="w-5 h-5 text-green-600" />
 <div className="text-sm text-gray-600 text-start">{t.projectDetail.totalEstimatedCost}</div>
 </div>
 <div className="ltr-safe text-2xl font-bold text-gray-900">
 ${totalEstimatedCost.toLocaleString()}
 </div>
 </div>
 <div className="bg-white border border-gray-200 rounded-lg p-4">
 <div className="flex items-center gap-2 mb-2">
 <Calendar className="w-5 h-5 text-purple-600" />
 <div className="text-sm text-gray-600 text-start">{t.finance.approvedBudget}</div>
 </div>
 <div className="ltr-safe text-2xl font-bold text-gray-900">
 ${totalApprovedBudget.toLocaleString()}
 </div>
 </div>
 <div className={`bg-white border rounded-lg p-4 ${budgetExceeded ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
 <div className="flex items-center gap-2 mb-2">
 {budgetExceeded ? (
 <AlertTriangle className="w-5 h-5 text-red-600" />
 ) : (
 <DollarSign className="w-5 h-5 text-emerald-600" />
 )}
 <div className={`text-sm text-start ${budgetExceeded ? 'text-red-700' : 'text-gray-600'}`}>
 {t.projectDetail.remainingBudget}
 </div>
 </div>
 <div className={`ltr-safe text-2xl font-bold ${budgetExceeded ? 'text-red-600' : 'text-emerald-600'}`}>
 ${remainingBudget.toLocaleString()}
 </div>
 </div>
 </div>

 {/* Procurement Items Table */}
 <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase text-start">{t.projectDetail.activityCode}</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase text-start">{t.projectDetail.activityName}</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase text-start">{t.projectDetail.itemDescription}</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase text-start">{t.projectDetail.procurementCategory}</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase text-start">{t.projectDetail.quantityLabel}</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase text-start">{t.projectDetail.estimatedTotalCost}</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase text-start">{t.projectDetail.procurementMethod}</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase text-start">{t.projectDetail.plannedStartDate}</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase text-start">{t.common.status}</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase text-start">{t.common.actions}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {filteredItems.length === 0 ? (
 <tr>
 <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
 {t.projectDetail.noProcurementItems}
 </td>
 </tr>
 ) : (
 filteredItems.map((item: any) => {
 const activity = activities.find((a: any) => a.id === item.activityId);
 return (
 <tr key={item.id} className="hover:bg-gray-50">
 <td className="ltr-safe px-4 py-3 text-sm font-medium text-gray-900">
 {activity?.activityCode || '-'}
 </td>
 <td className="px-4 py-3 text-sm text-gray-700 max-w-[200px] truncate text-start" title={activity?.activityName || '-'}>
 {activity?.activityName || '-'}
 </td>
 <td className="px-4 py-3 text-sm text-gray-700 text-start">
 {item.itemName}
 </td>
 <td className="px-4 py-3">
 <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(item.category)}`}>
 {getCategoryLabel(item.category)}
 </span>
 </td>
 <td className="ltr-safe px-4 py-3 text-sm text-gray-700">
 {item.quantity} {item.unit}
 </td>
 <td className="ltr-safe px-4 py-3 text-sm font-medium text-gray-900">
 ${parseFloat(item.estimatedCost || 0).toLocaleString()}
 </td>
 <td className="px-4 py-3 text-sm text-gray-700 text-start">
 {getProcurementMethodLabel(item.procurementMethod)}
 </td>
 <td className="ltr-safe px-4 py-3 text-sm text-gray-700">
 {item.plannedProcurementDate 
 ? (item.plannedProcurementDate instanceof Date 
 ? item.plannedProcurementDate.toISOString().split('T')[0] 
 : String(item.plannedProcurementDate).split('T')[0])
 : '-'}
 </td>
 <td className="px-4 py-3">
 <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(item.status)}`}>
 {getStatusLabel(item.status)}
 </span>
 </td>
 <td className="px-4 py-3">
 <div className="flex items-center gap-1">
 <button
 onClick={() => openEditModal(item)}
 className="p-1 text-blue-600 hover:bg-blue-50 rounded"
 title={t.common.edit}
 >
 <Edit2 className="w-4 h-4" />
 </button>
 <button
 onClick={() => {
 setSelectedItem(item);
 setShowDeleteConfirm(true);
 }}
 className="p-1 text-red-600 hover:bg-red-50 rounded"
 title={t.common.delete}
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 </td>
 </tr>
 );
 })
 )}
 </tbody>
 </table>
 </div>
 </div>

 {/* Create Modal with Multi-Item Support */}
 {showCreateModal && (
 <ProcurementCreateModal
 isRTL={isRTL}
 t={t}
 formData={formData}
 setFormData={setFormData}
 activities={activities}
 itemsList={itemsList}
 onAddItem={handleAddItem}
 onRemoveItem={handleRemoveItem}
 onClose={() => {
 setShowCreateModal(false);
 resetForm();
 }}
 onSubmit={handleCreate}
 isSubmitting={createMutation.isPending}
 />
 )}

 {/* Edit Modal - Items can still be edited after auto-generation */}
 {showEditModal && (
 <ProcurementItemModal
 isRTL={isRTL}
 t={t}
 title={t.projectDetail.editProcurementItem}
 formData={formData}
 setFormData={setFormData}
 activities={activities}
 onClose={() => {
 setShowEditModal(false);
 setSelectedItem(null);
 resetForm();
 }}
 onSubmit={handleEdit}
 isSubmitting={updateMutation.isPending}
 />
 )}

 {/* Delete Confirmation */}
 {showDeleteConfirm && selectedItem && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg p-6 max-w-md w-full">
 <h3 className={`text-lg font-semibold mb-4 text-start`}>{t.common.confirmDelete}</h3>
 <p className={`text-gray-600 mb-4 text-start`}>
 {t.common.deleteConfirmMessage.replace('{item}', selectedItem.itemName)}
 </p>
 <div className={`flex gap-2`}>
 <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 border rounded">{t.common.cancel}</button>
 <button 
 onClick={handleDelete} 
 className="px-4 py-2 bg-red-600 text-white rounded flex items-center gap-2"
 disabled={deleteMutation.isPending}
 >
 {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
 {t.common.delete}
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Import Modal */}
 {showImportModal && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg p-6 max-w-lg w-full">
 <h3 className={`text-lg font-semibold mb-4 text-start`}>{t.projectDetail.importActivities}</h3>
 <input type="file" accept=".xlsx,.xls" onChange={handleImportExcel} className="w-full mb-4" />
 <button onClick={() => setShowImportModal(false)} className="px-4 py-2 border rounded">{t.common.cancel}</button>
 </div>
 </div>
 )}

 {/* Preview Dialog */}
 <PreImportPreviewDialog
 isOpen={showPreviewDialog}
 onClose={() => setShowPreviewDialog(false)}
 validRows={validRows}
 invalidRows={invalidRows}
 onConfirm={handleConfirmImport}
 moduleName="Procurement"
 config={PROCUREMENT_CONFIG}
 />
 </div>
 );
}

// Procurement Item Modal Component
interface ProcurementItemModalProps {
 isRTL: boolean;
 t: any;
 title: string;
 formData: any;
 setFormData: (data: any) => void;
 activities: any[];
 onClose: () => void;
 onSubmit: () => void;
 isSubmitting?: boolean;
}

function ProcurementItemModal({
 isRTL, 
 title, 
 formData, 
 setFormData, 
 activities,
 onClose, 
 onSubmit,
 isSubmitting = false
}: ProcurementItemModalProps) {
 const { t } = useTranslation(); 
 return (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
 <div className={`sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between`}>
 <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
 <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
 <X className="w-5 h-5" />
 </button>
 </div>

 <div className="p-6 space-y-4">
 {/* Row 1: Activity Selection (Single Source of Truth) */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.activityCode} <span className="text-red-500">*</span>
 <span className="text-xs text-blue-600 ms-2">(Auto-synced from Activities tab)</span>
 </label>
 <select
 value={formData.activityId}
 onChange={(e) => setFormData({ ...formData, activityId: Number(e.target.value) })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 >
 <option value={0}>-- Select Activity --</option>
 {activities.map((activity: any) => (
 <option key={activity.id} value={activity.id}>
 {activity.activityName}
 </option>
 ))}
 </select>
 </div>

 {/* Row 2: Activity Name (Read-only, auto-populated) */}
 {formData.activityName && (
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.activityTitle}
 </label>
 <input
 type="text"
 value={formData.activityName}
 readOnly
 className={`w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-600 text-start`}
 />
 </div>
 )}

 {/* Row 3: Item Description */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.itemDescription} <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 value={formData.itemDescription}
 onChange={(e) => setFormData({ ...formData, itemDescription: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 />
 </div>

 {/* Row 4: Category and Procurement Method */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.procurementCategory} <span className="text-red-500">*</span>
 </label>
 <select
 value={formData.category}
 onChange={(e) => setFormData({ ...formData, category: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 >
 <option value="GOODS">Goods</option>
 <option value="SERVICES">Services</option>
 <option value="WORKS">Works</option>
 <option value="CONSULTANCY">Consultancy</option>
 </select>
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.procurementMethod} <span className="text-red-500">*</span>
 </label>
 <select
 value={formData.procurementMethod}
 onChange={(e) => setFormData({ ...formData, procurementMethod: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 >
 <option value="DIRECT_PURCHASE">Direct Purchase</option>
 <option value="COMPETITIVE_BIDDING">Competitive Bidding</option>
 <option value="REQUEST_FOR_QUOTATION">Request for Quotation</option>
 <option value="FRAMEWORK_AGREEMENT">Framework Agreement</option>
 </select>
 </div>
 </div>

 {/* Row 5: Quantity and Unit */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.quantityLabel} <span className="text-red-500">*</span>
 </label>
 <input
 type="number"
 min="1"
 value={formData.quantity}
 onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.unitOfMeasure} <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 value={formData.unitOfMeasure}
 onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 placeholder={t.placeholders.eGPcsKgUnits}
 />
 </div>
 </div>

 {/* Row 6: Estimated Unit Cost and Total */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.estimatedUnitCost} <span className="text-red-500">*</span>
 </label>
 <input
 type="number"
 min="0"
 step="0.01"
 value={formData.estimatedUnitCost}
 onChange={(e) => setFormData({ ...formData, estimatedUnitCost: Number(e.target.value) })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.estimatedTotalCost}
 </label>
 <input
 type="text"
 value={`$${(formData.quantity * formData.estimatedUnitCost).toLocaleString()}`}
 readOnly
 className={`w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-600 text-start`}
 />
 </div>
 </div>

 {/* Row 7: Planned Dates */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.plannedStartDate} <span className="text-red-500">*</span>
 </label>
 <input
 type="date"
 value={formData.plannedStartDate}
 onChange={(e) => setFormData({ ...formData, plannedStartDate: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.common.status}
 </label>
 <select
 value={formData.status}
 onChange={(e) => setFormData({ ...formData, status: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 >
 <option value="PLANNED">Planned</option>
 <option value="IN_PROGRESS">In Progress</option>
 <option value="COMPLETED">Completed</option>
 <option value="CANCELLED">Cancelled</option>
 </select>
 </div>
 </div>

 {/* Row 8: Notes */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.common.notes}
 </label>
 <textarea
 value={formData.notes}
 onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
 rows={3}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 />
 </div>
 </div>

 <div className={`sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-2`}>
 <button
 onClick={onClose}
 className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
 >
 {t.common.cancel}
 </button>
 <button
 onClick={onSubmit}
 disabled={isSubmitting}
 className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2"
 >
 {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
 {t.common.save}
 </button>
 </div>
 </div>
 </div>
 );
}


// Procurement Create Modal with Multi-Item Support
interface ProcurementCreateModalProps {
 isRTL: boolean;
 t: any;
 formData: any;
 setFormData: (data: any) => void;
 activities: any[];
 itemsList: Array<{
 itemDescription: string;
 category: string;
 quantity: number;
 unitOfMeasure: string;
 estimatedUnitCost: number;
 recurrence: string;
 procurementMethod: string;
 plannedStartDate: string;
 status: string;
 }>;
 onAddItem: () => void;
 onRemoveItem: (index: number) => void;
 onClose: () => void;
 onSubmit: () => void;
 isSubmitting?: boolean;
}

function ProcurementCreateModal({
 isRTL, 

 formData, 
 setFormData, 
 activities,
 itemsList,
 onAddItem,
 onRemoveItem,
 onClose, 
 onSubmit,
 isSubmitting = false
}: ProcurementCreateModalProps) {
 const { t } = useTranslation(); 
 return (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto">
 <div className={`sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between`}>
 <h3 className="text-lg font-semibold text-gray-900">
 {t.projectDetail.createNewProcurementItems}
 </h3>
 <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
 <X className="w-5 h-5" />
 </button>
 </div>

 <div className="p-6 space-y-6">
 {/* Step 1: Select Activity */}
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
 <h4 className={`text-sm font-semibold text-blue-800 mb-3 text-start`}>
 {t.projectDetail.step1SelectActivity}
 </h4>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.activityCode} <span className="text-red-500">*</span>
 <span className="text-xs text-blue-600 ms-2">(Auto-synced from Activities tab)</span>
 </label>
 <select
 value={formData.activityId}
 onChange={(e) => setFormData({ ...formData, activityId: Number(e.target.value) })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 >
 <option value={0}>-- Select Activity --</option>
 {activities.map((activity: any) => (
 <option key={activity.id} value={activity.id}>
 {activity.activityName}
 </option>
 ))}
 </select>
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.activityTitle}
 </label>
 <input
 type="text"
 value={formData.activityName}
 readOnly
 className={`w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-600 text-start`}
 />
 </div>
 </div>
 </div>

 {/* Step 2: Add Items */}
 {formData.activityId > 0 && (
 <div className="bg-green-50 border border-green-200 rounded-lg p-4">
 <h4 className={`text-sm font-semibold text-green-800 mb-3 text-start`}>
 {t.projectDetail.step2AddItems}
 </h4>
 
 {/* Item Form */}
 <div className="grid grid-cols-4 gap-3 mb-4">
 <div className="col-span-2">
 <label className={`block text-xs font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.itemDescription} <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 value={formData.itemDescription}
 onChange={(e) => setFormData({ ...formData, itemDescription: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm text-start`}
 placeholder={t.placeholders.enterItemDescription}
 />
 </div>
 <div>
 <label className={`block text-xs font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.procurementCategory} <span className="text-red-500">*</span>
 </label>
 <select
 value={formData.category}
 onChange={(e) => setFormData({ ...formData, category: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm text-start`}
 >
 <option value="GOODS">Goods</option>
 <option value="SERVICES">Services</option>
 <option value="WORKS">Works</option>
 <option value="CONSULTANCY">Consultancy</option>
 </select>
 </div>
 <div>
 <label className={`block text-xs font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.quantityLabel} <span className="text-red-500">*</span>
 </label>
 <input
 type="number"
 min="1"
 value={formData.quantity}
 onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm text-start`}
 />
 </div>
 </div>

 <div className="grid grid-cols-4 gap-3 mb-4">
 <div>
 <label className={`block text-xs font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.unitOfMeasure} <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 value={formData.unitOfMeasure}
 onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm text-start`}
 placeholder={t.placeholders.eGPcsKg}
 />
 </div>
 <div>
 <label className={`block text-xs font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.recurrence}
 </label>
 <select
 value={formData.recurrence}
 onChange={(e) => setFormData({ ...formData, recurrence: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm text-start`}
 >
 <option value="ONE_TIME">One-time</option>
 <option value="RECURRING">Recurring</option>
 </select>
 </div>
 <div>
 <label className={`block text-xs font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.estimatedUnitCost} <span className="text-red-500">*</span>
 </label>
 <input
 type="number"
 min="0"
 step="0.01"
 value={formData.estimatedUnitCost}
 onChange={(e) => setFormData({ ...formData, estimatedUnitCost: Number(e.target.value) })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm text-start`}
 />
 </div>
 <div>
 <label className={`block text-xs font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.estimatedTotalCost}
 </label>
 <input
 type="text"
 value={`$${(formData.quantity * formData.estimatedUnitCost).toLocaleString()}`}
 readOnly
 className={`w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-600 text-sm text-start`}
 />
 </div>
 </div>

 <div className="grid grid-cols-4 gap-3 mb-4">
 <div>
 <label className={`block text-xs font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.procurementMethod} <span className="text-red-500">*</span>
 </label>
 <select
 value={formData.procurementMethod}
 onChange={(e) => setFormData({ ...formData, procurementMethod: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm text-start`}
 >
 <option value="ONE_QUOTATION">One Quotation</option>
 <option value="THREE_QUOTATION">Three Quotation</option>
 <option value="NEGOTIABLE_QUOTATION">Negotiable Quotation</option>
 <option value="TENDER">Tender</option>
 <option value="DIRECT_PURCHASE">Direct Purchase</option>
 <option value="OTHER">Other</option>
 </select>
 </div>
 <div>
 <label className={`block text-xs font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.plannedStartDate} <span className="text-red-500">*</span>
 </label>
 <input
 type="date"
 value={formData.plannedStartDate}
 onChange={(e) => setFormData({ ...formData, plannedStartDate: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm text-start`}
 />
 </div>
 <div>
 <label className={`block text-xs font-medium text-gray-700 mb-1 text-start`}>
 {t.common.status}
 </label>
 <select
 value={formData.status}
 onChange={(e) => setFormData({ ...formData, status: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm text-start`}
 >
 <option value="PLANNED">Planned</option>
 <option value="REQUESTED">Requested</option>
 <option value="APPROVED">Approved</option>
 <option value="IN_PROCUREMENT">In Procurement</option>
 <option value="ORDERED">Ordered</option>
 <option value="DELIVERED">Delivered</option>
 <option value="CANCELLED">Cancelled</option>
 </select>
 </div>
 <div className="flex items-end">
 <button
 onClick={onAddItem}
 className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center gap-2 text-sm"
 >
 <Plus className="w-4 h-4" />
 {t.projectDetail.addItem}
 </button>
 </div>
 </div>

 {/* Items List */}
 {itemsList.length > 0 && (
 <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
 <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
 <h5 className={`text-sm font-medium text-gray-700 text-start`}>
 {`Added Items (${itemsList.length})`}
 </h5>
 </div>
 <div className="max-h-48 overflow-y-auto">
 <table className="w-full text-sm">
 <thead className="bg-gray-50 sticky top-0">
 <tr>
 <th className={`px-3 py-2 text-xs font-medium text-gray-500 text-start`}>Item Description</th>
 <th className={`px-3 py-2 text-xs font-medium text-gray-500 text-start`}>Category</th>
 <th className={`px-3 py-2 text-xs font-medium text-gray-500 text-start`}>Qty</th>
 <th className={`px-3 py-2 text-xs font-medium text-gray-500 text-start`}>Unit Cost</th>
 <th className={`px-3 py-2 text-xs font-medium text-gray-500 text-start`}>Total</th>
 <th className={`px-3 py-2 text-xs font-medium text-gray-500 text-start`}>Method</th>
 <th className="px-3 py-2 text-xs font-medium text-gray-500"></th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {itemsList.map((item, index) => (
 <tr key={index} className="hover:bg-gray-50">
 <td className="px-3 py-2 text-gray-900">{item.itemDescription}</td>
 <td className="px-3 py-2 text-gray-600">{item.category}</td>
 <td className="px-3 py-2 text-gray-600">{item.quantity} {item.unitOfMeasure}</td>
 <td className="px-3 py-2 text-gray-600">${item.estimatedUnitCost.toLocaleString()}</td>
 <td className="px-3 py-2 text-gray-900 font-medium">${(item.quantity * item.estimatedUnitCost).toLocaleString()}</td>
 <td className="px-3 py-2 text-gray-600">{item.procurementMethod.replace(/_/g, ' ')}</td>
 <td className="px-3 py-2">
 <button
 onClick={() => onRemoveItem(index)}
 className="p-1 text-red-600 hover:bg-red-50 rounded"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
 <div className={`flex justify-between items-center`}>
 <span className="text-sm text-gray-600">
 {t.projectDetail.totalItems} {itemsList.length}
 </span>
 <span className="text-sm font-semibold text-gray-900">
 {t.projectDetail.grandTotal} ${itemsList.reduce((sum, item) => sum + (item.quantity * item.estimatedUnitCost), 0).toLocaleString()}
 </span>
 </div>
 </div>
 </div>
 )}
 </div>
 )}

 {/* Notes */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.common.notes}
 </label>
 <textarea
 value={formData.notes}
 onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
 rows={2}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 placeholder={t.placeholders.optionalNotesForAllItems}
 />
 </div>
 </div>

 <div className={`sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-2`}>
 <button
 onClick={onClose}
 className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
 >
 {t.common.cancel}
 </button>
 <button
 onClick={onSubmit}
 disabled={isSubmitting || (!formData.activityId) || (itemsList.length === 0 && !formData.itemDescription)}
 className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
 {`Create ${itemsList.length > 0 ? itemsList.length : 1} Item(s)`}
 </button>
 </div>
 </div>
 </div>
 );
}
