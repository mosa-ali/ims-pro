import { useState, useEffect, useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, Download, Upload, FileSpreadsheet, Plus, Edit2, Trash2, Eye, History, X, Printer } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { exportToStandardExcel, type ExcelColumn } from '@/lib/standardExcelExport';
import { generateErrorReport } from '@/lib/errorReportGenerator';
import { ImportResultPanel, type ImportResult, type ImportError } from '@/components/ImportResultPanel';
import { PreImportPreviewDialog } from '@/components/PreImportPreviewDialog';
import { validateImportData, type PreviewRow } from '@/lib/clientSideValidation';
import { FINANCIAL_OVERVIEW_CONFIG } from '@shared/importConfigs/financialOverview';
import { generateFinancialOverviewTemplate } from '@/lib/templateGenerator';
import { UnifiedExportButton } from '@/components/exports/UnifiedExportButton';
import { syncExcelToDocuments } from '@/lib/documentSync';
import { toast } from 'sonner';
import { FinancialTabSkeleton } from "@/components/ProjectTabSkeletons";
import { useTranslation } from '@/i18n/useTranslation';

interface FinancialOverviewTabProps {
 projectId: string;
}

// Helper function to get currency symbol
const getCurrencySymbol = (currency: string) => {
 const { t } = useTranslation();
 const symbols: Record<string, string> = {
 'EUR': '€',
 'USD': '$',
 'CHF': 'CHF ',
 'YER': 'YER ',
 'SAR': 'SAR ',
 };
 return symbols[currency] || currency + ' ';
};

// Helper function to format currency with symbol
const formatCurrencyWithSymbol = (amount: number, currency: string) => {
 const symbol = getCurrencySymbol(currency);
 return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function FinancialOverviewTab({ projectId }: FinancialOverviewTabProps) {
 const { language, isRTL} = useLanguage();
 const { t } = useTranslation();
 
 // Convert projectId to number for tRPC query
 const projectIdNum = parseInt(projectId, 10);
 
 const [budgetCodeFilter, setBudgetCodeFilter] = useState("All");
 const [searchQuery, setSearchQuery] = useState("");
 const [showCreateModal, setShowCreateModal] = useState(false);
 const [showViewModal, setShowViewModal] = useState(false);
 const [showImportModal, setShowImportModal] = useState(false);
 const [showImportHistoryModal, setShowImportHistoryModal] = useState(false);
 const [editingItem, setEditingItem] = useState<any | null>(null);
 const [viewingItem, setViewingItem] = useState<any | null>(null);
 const [importFile, setImportFile] = useState<File | null>(null);
 const [allowDuplicates, setAllowDuplicates] = useState(false);
 const [importPreview, setImportPreview] = useState<any[]>([]);
 const [showPreviewDialog, setShowPreviewDialog] = useState(false);
 const [validRows, setValidRows] = useState<PreviewRow[]>([]);
 const [invalidRows, setInvalidRows] = useState<PreviewRow[]>([]);
 const [showImportResult, setShowImportResult] = useState(false);
 const [importResult, setImportResult] = useState<ImportResult | null>(null);
 const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
 
 // Import History filters
 const [historyDateFrom, setHistoryDateFrom] = useState('');
 const [historyDateTo, setHistoryDateTo] = useState('');
 const [historyUserId, setHistoryUserId] = useState<number | undefined>(undefined);
 const [historyStatus, setHistoryStatus] = useState<'success' | 'failed' | 'partial' | undefined>(undefined);
 
 const [formData, setFormData] = useState({
 category: 'personal' as string,
 budgetCode: '',
 subBudgetLine: '',
 activityId: null as number | null,
 activityName: '',
 budgetItem: '',
 qty: 1,
 unitType: '',
 unitCost: 0,
 recurrence: 1,
 currency: 'USD',
 notes: '',
 spent: 0,
 });
 
 // Fetch project details to get organization currency
 const { data: projectData } = trpc.projects.getById.useQuery({ id: projectIdNum });
 // Project currency is the source of truth for all financial displays
 const organizationCurrency = projectData?.currency || 'USD';
 
 // Fetch budget items from database
 const { data: budgetItems = [], isLoading, refetch } = trpc.budgetItems.getByProject.useQuery({ projectId: projectIdNum });
 
 // Fetch activities dropdown list (Single Source of Truth)
 const { data: activitiesDropdown = [] } = trpc.activities.getDropdownList.useQuery({ projectId: projectIdNum });
 
 // Fetch import history with filters
 const { data: importHistoryData = [], isLoading: isLoadingHistory } = trpc.budgetItems.getImportHistory.useQuery({ 
 projectId: projectIdNum,
 dateFrom: historyDateFrom || undefined,
 dateTo: historyDateTo || undefined,
 userId: historyUserId,
 status: historyStatus,
 });
 
 // Create mutation
 const createMutation = trpc.budgetItems.create.useMutation({
 onSuccess: () => {
 refetch();
 setShowCreateModal(false);
 setFormData({
 category: 'personal',
 budgetCode: '',
 subBudgetLine: '',
 activityId: null,
 activityName: '',
 budgetItem: '',
 qty: 1,
 unitType: '',
 unitCost: 0,
 recurrence: 1,
 currency: 'USD',
 notes: '',
 spent: 0,
 });
 alert(t.projectDetail.budgetItemCreatedSuccessfully);
 },
 onError: (error) => {
 alert(`${t.projectDetail.failedToCreate}: ${error.message}`);
 },
 });
 
 // Update mutation
 const updateMutation = trpc.budgetItems.update.useMutation({
 onSuccess: () => {
 refetch();
 setShowCreateModal(false);
 setEditingItem(null);
 alert(t.projectDetail.budgetItemUpdatedSuccessfully);
 },
 onError: (error) => {
 alert(`${t.projectDetail.failedToUpdate}: ${error.message}`);
 },
 });
 
 // Delete mutation
 const deleteBudgetItemMutation = trpc.budgetItems.delete.useMutation({
 onSuccess: () => {
 refetch();
 alert(t.projectDetail.budgetItemDeletedSuccessfully);
 },
 onError: (error) => {
 alert(`${t.projectDetail.failedToDelete}: ${error.message}`);
 },
 });
 
 // Bulk delete mutation
 const bulkDeleteMutation = trpc.budgetItems.bulkDelete.useMutation({
 onSuccess: (result) => {
 refetch();
 setSelectedItems(new Set());
 alert(`${t.projectDetail.deleted} ${result.deleted} ${t.projectDetail.itemsSuccessfully}`);
 },
 onError: (error) => {
 alert(`${t.projectDetail.bulkDeleteFailed}: ${error.message}`);
 },
 });
 
 // Bulk import mutation
 const bulkImportMutation = trpc.budgetItems.bulkImport.useMutation({
 onSuccess: (result) => {
 refetch();
 // Show structured import result panel
 setImportResult({
 imported: result.imported,
 skipped: result.skipped,
 errors: result.details?.errors || [],
 });
 setShowImportResult(true);
 setShowImportModal(false);
 setImportFile(null);
 setImportPreview([]);
 },
 onError: (error) => {
 alert(`${t.projectDetail.importFailed}: ${error.message}`);
 },
 });
 
 // Handlers
 const handleCreate = () => {
 setEditingItem(null);
 setFormData({
 budgetCode: '',
 subBudgetLine: '',
 activityId: null,
 activityName: '',
 budgetItem: '',
 qty: 1,
 unitType: '',
 unitCost: 0,
 recurrence: 1,
 currency: 'USD',
 notes: '',
 spent: 0,
 });
 setShowCreateModal(true);
 };
 
 const handleEdit = (item: any) => {
 setEditingItem(item);
 setFormData({
 category: item.category || 'personal',
 budgetCode: item.budgetCode || '',
 subBudgetLine: item.subBudgetLine || '',
 activityId: item.activityId || null,
 activityName: item.activityName || '',
 budgetItem: item.budgetItem || '',
 qty: parseFloat(item.quantity?.toString() || '1'),
 unitType: item.unitType || '',
 unitCost: parseFloat(item.unitCost?.toString() || '0'),
 recurrence: item.recurrence || 1,
 currency: item.currency || 'USD',
 notes: item.notes || '',
 spent: parseFloat(item.actualSpent?.toString() || '0'),
 });
 setShowCreateModal(true);
 };
 
 const handleView = (item: any) => {
 setViewingItem(item);
 setShowViewModal(true);
 };
 
 const handleSubmit = () => {
 // Validation
 if (!formData.budgetCode) {
 alert(t.projectDetail.pleaseFillAllRequiredFields);
 return;
 }
 
 if (formData.qty <= 0 || formData.unitCost < 0 || formData.recurrence <= 0) {
 alert(t.projectDetail.numbersMustBePositive);
 return;
 }
 
 const totalBudgetLine = formData.qty * formData.unitCost * formData.recurrence;
 
 if (editingItem) {
 updateMutation.mutate({
 id: editingItem.id,
 category: formData.category,
 budgetCode: formData.budgetCode,
 subBudgetLine: formData.subBudgetLine,
 activityId: formData.activityId,
 budgetItem: formData.budgetItem,
 qty: formData.qty,
 unitType: formData.unitType,
 unitCost: formData.unitCost,
 recurrence: formData.recurrence,
 currency: formData.currency,
 notes: formData.notes,
 spent: formData.spent,
 });
 } else {
 createMutation.mutate({
 projectId: projectIdNum,
 category: formData.category,
 budgetCode: formData.budgetCode,
 subBudgetLine: formData.subBudgetLine,
 activityId: formData.activityId,
 budgetItem: formData.budgetItem,
 qty: formData.qty,
 unitType: formData.unitType,
 unitCost: formData.unitCost,
 recurrence: formData.recurrence,
 currency: formData.currency,
 notes: formData.notes,
 });
 }
 };
 
 const handleDeleteBudgetItem = (id: number) => {
 if (window.confirm(t.projectDetail.areYouSureYouWantTo)) {
 deleteBudgetItemMutation.mutate({ id });
 }
 };
 
 const handleBulkDelete = () => {
 const count = selectedItems.size;
 if (window.confirm(`Are you sure you want to delete ${count} item(s)?`)) {
 bulkDeleteMutation.mutate({ ids: Array.from(selectedItems) });
 }
 };
 
 const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;
 
 setImportFile(file);
 
 try {
 const workbook = new ExcelJS.Workbook();
 const buffer = await file.arrayBuffer();
 await workbook.xlsx.load(buffer);
 
 const worksheet = workbook.getWorksheet('Financial Overview');
 if (!worksheet) {
 alert(t.projectDetail.worksheetFinancialOverviewNotFound);
 return;
 }
 
 const items: any[] = [];
 
 worksheet.eachRow((row, rowNumber) => {
 if (rowNumber === 1) return; // Skip header
 
 const budgetCode = row.getCell(1).value?.toString() || '';
 const budgetItem = row.getCell(4).value?.toString() || '';
 
 if (budgetCode) {
 items.push({
 budgetCode,
 subBudgetLine: row.getCell(2).value?.toString() || '',
 activityName: row.getCell(3).value?.toString() || '',
 budgetItem,
 qty: parseFloat(row.getCell(5).value?.toString() || '1'),
 unitType: row.getCell(6).value?.toString() || '',
 unitCost: parseFloat(row.getCell(7).value?.toString() || '0'),
 recurrence: parseInt(row.getCell(8).value?.toString() || '1'),
 currency: row.getCell(10).value?.toString() || 'USD',
 notes: row.getCell(14).value?.toString() || '',
 });
 }
 });
 
 // Validate using shared framework with organization currency context
 const { validRows: valid, invalidRows: invalid } = validateImportData(
 items,
 { 
 columns: FINANCIAL_OVERVIEW_CONFIG.columns, 
 sheetName: 'Financial Overview', 
 language: 'en',
 context: { organizationCurrency }
 }
 );
 
 setValidRows(valid);
 setInvalidRows(invalid);
 setImportPreview(items);
 setShowPreviewDialog(true);
 } catch (error) {
 alert(`${t.projectDetail.failedToParseFile}: ${error}`);
 }
 };
 
 const handleConfirmImport = () => {
 if (validRows.length === 0) {
 alert(t.projectDetail.noValidDataToImport);
 return;
 }
 
 setShowPreviewDialog(false);
 
 // Extract only the data from valid rows
 const validData = validRows.map(row => row.data);
 
 bulkImportMutation.mutate({
 projectId: projectIdNum,
 items: validData,
 allowDuplicates,
 });
 };
 
 // Get project's primary currency from project data (source of truth)
 const projectCurrency = useMemo(() => {
 return projectData?.currency || 'USD';
 }, [projectData]);
 
 // Calculate financial metrics
 const metrics = useMemo(() => {
 // Use project's total budget, not sum of budget items
 const totalBudget = projectData ? Number(projectData.totalBudget) : 0;
 const allocatedBudget = budgetItems.reduce((sum, item) => sum + parseFloat(item.totalBudgetLine?.toString() || "0"), 0);
 const actualSpent = budgetItems.reduce((sum, item) => sum + (parseFloat(item.actualSpent?.toString() || "0")), 0);
 const committed = budgetItems.reduce((sum, item) => sum + (item.committed || 0), 0);
 const remainingBalance = totalBudget - actualSpent;
 const burnRate = totalBudget > 0 ? (actualSpent / totalBudget) * 100 : 0;
 const unallocatedBudget = totalBudget - allocatedBudget;
 
 return {
 totalBudget,
 allocatedBudget,
 unallocatedBudget,
 actualSpent,
 committed,
 remainingBalance,
 burnRate,
 };
 }, [budgetItems, projectData]);
 
 // Filter budget items
 const filteredItems = useMemo(() => {
 let items = budgetItems;
 
 // Budget code filter
 if (budgetCodeFilter !== "All") {
 items = items.filter(item => item.budgetCode === budgetCodeFilter);
 }
 
 // Search filter
 if (searchQuery.trim()) {
 items = items.filter(item => 
 item.budgetItem?.toLowerCase().includes(searchQuery.toLowerCase()) ||
 item.activity?.activityName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
 item.activity?.activityCode?.toLowerCase().includes(searchQuery.toLowerCase())
 );
 }
 
 return items;
 }, [budgetItems, budgetCodeFilter, searchQuery]);
 
 // Get unique budget codes for filter
 const budgetCodes = useMemo(() => {
 const codes = new Set(budgetItems.map(item => item.budgetCode).filter(Boolean));
 return Array.from(codes);
 }, [budgetItems]);
 
 // Group items by budget code
 const groupedItems = useMemo(() => {
 const groups = new Map<string, typeof budgetItems>();
 filteredItems.forEach(item => {
 const code = item.budgetCode || "Uncategorized";
 if (!groups.has(code)) {
 groups.set(code, []);
 }
 groups.get(code)!.push(item);
 });
 return groups;
 }, [filteredItems]);
 
 // Export to Excel
 const handleExportExcel = async () => {
 // Prepare data with calculated fields
 const exportData = filteredItems.map((item: any) => {
 const budget = parseFloat(item.totalBudgetLine?.toString() || "0");
 const spent = parseFloat(item.actualSpent?.toString() || "0");
 const balance = budget - spent;
 const variancePercent = budget > 0 ? ((spent - budget) / budget) * 100 : 0;
 const status = 
 variancePercent > 10 ? "Overspending" :
 variancePercent < -20 ? "Underspending" :
 "On Track";
 
 return {
 budgetCode: item.budgetCode,
 subBudgetLine: item.subBudgetLine,
 activityName: item.activityName,
 budgetItem: item.budgetItem,
 qty: parseFloat(item.quantity?.toString() || "0"),
 unitType: item.unitType,
 unitCost: parseFloat(item.unitCost?.toString() || "0"),
 recurrence: parseFloat(item.recurrence?.toString() || "0"),
 totalBudgetLine: budget,
 currency: item.currency,
 actualSpent: spent,
 actualBalance: balance,
 variancePercent: variancePercent,
 status,
 };
 });

 // Define columns with proper types and totals
 const columns: ExcelColumn[] = [
 { name: 'Budget Code', key: 'budgetCode', width: 15, type: 'text' },
 { name: 'Sub Budget Line', key: 'subBudgetLine', width: 15, type: 'text' },
 { name: 'Activity Name', key: 'activityName', width: 30, type: 'text' },
 { name: 'Budget Item', key: 'budgetItem', width: 30, type: 'text' },
 { name: 'Qty', key: 'qty', width: 10, type: 'number', totals: 'sum' },
 { name: 'Unit Type', key: 'unitType', width: 15, type: 'text' },
 { name: 'Unit Cost', key: 'unitCost', width: 12, type: 'currency', totals: 'none' },
 { name: 'Recurrence', key: 'recurrence', width: 12, type: 'number', totals: 'none' },
 { name: 'Total Budget', key: 'totalBudgetLine', width: 15, type: 'currency', totals: 'sum' },
 { name: 'Currency', key: 'currency', width: 10, type: 'text' },
 { name: 'Actual Spent', key: 'actualSpent', width: 15, type: 'currency', totals: 'sum' },
 { name: 'Balance', key: 'actualBalance', width: 15, type: 'currency', totals: 'sum' },
 { name: 'Variance %', key: 'variancePercent', width: 12, type: 'number', totals: 'none' },
 { name: 'Status', key: 'status', width: 15, type: 'text' },
 ];

 // Export using standardized format (downloads to user)
 await exportToStandardExcel({
 sheetName: 'Financial Overview',
 columns,
 data: exportData,
 fileName: `Financial_Overview_Project_${projectId}`,
 includeTotals: true,
 isRTL,
 });

 // Auto-sync to Central Documents
 try {
 // Create workbook for sync
 const workbook = new ExcelJS.Workbook();
 const worksheet = workbook.addWorksheet('Financial Overview');
 
 // Add header row
 const headerRow = worksheet.addRow(columns.map(col => col.name));
 headerRow.font = { bold: true };
 headerRow.fill = {
 type: 'pattern',
 pattern: 'solid',
 fgColor: { argb: 'FF4472C4' },
 };
 
 // Add data rows
 exportData.forEach(row => {
 worksheet.addRow(columns.map(col => row[col.key as keyof typeof row]));
 });
 
 // Add totals row if data exists
 if (exportData.length > 0) {
 const totalsRow = worksheet.addRow(columns.map(col => {
 if (col.totals === 'sum') {
 return exportData.reduce((sum, row) => sum + (row[col.key as keyof typeof row] as number || 0), 0);
 }
 return col.key === 'budgetCode' ? 'TOTAL' : '';
 }));
 totalsRow.font = { bold: true };
 }
 
 // Set column widths
 columns.forEach((col, index) => {
 worksheet.getColumn(index + 1).width = col.width;
 });

 // Sync to Central Documents
 await syncExcelToDocuments(workbook, {
 workspace: "projects",
 folderCode: "01_Financial_Overview",
 projectCode: projectId,
 fileName: `Financial_Overview_${projectId}_${new Date().toISOString().split('T')[0]}.xlsx`,
 syncSource: "financial_overview",
 });
 
 toast.success(t.projectDetail.financialOverviewExportedAndSyncedTo);
 } catch (error) {
 console.error("Failed to sync to Central Documents:", error);
 toast.warning(t.projectDetail.fileExportedButSyncToCentral);
 }
 };
 
 // Get status color
 const getStatusColor = (variancePercent: number) => {
 if (variancePercent > 10) return "#EF4444"; // Overspending - red
 if (variancePercent < -20) return "#F59E0B"; // Underspending - yellow
 return "#10B981"; // On track - green
 };
 
 // Get burn rate color
 const getBurnRateColor = (rate: number) => {
 if (rate > 90) return "#EF4444"; // Critical - red
 if (rate > 75) return "#F59E0B"; // Warning - yellow
 return "#10B981"; // Good - green
 };
 
 // Calculate total for form
 const calculatedTotal = formData.qty * formData.unitCost * formData.recurrence;
 
 // Keyboard shortcuts
 useEffect(() => {
 const handleKeyDown = (e: KeyboardEvent) => {
 // Ctrl+S or Cmd+S - Save (submit form if modal is open)
 if ((e.ctrlKey || e.metaKey) && e.key === 's') {
 e.preventDefault();
 if (showCreateModal) {
 handleSubmit();
 }
 }
 
 // Ctrl+E or Cmd+E - Edit (edit first selected item)
 if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
 e.preventDefault();
 if (!showCreateModal && !showViewModal && filteredItems.length > 0) {
 handleEdit(filteredItems[0]);
 }
 }
 
 // Ctrl+P or Cmd+P - Print
 if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
 e.preventDefault();
 window.print();
 }
 };
 
 window.addEventListener('keydown', handleKeyDown);
 return () => window.removeEventListener('keydown', handleKeyDown);
 }, [showCreateModal, showViewModal, filteredItems]);
 
 // Error report generator (corruption-free)
 async function handleDownloadErrorReport() {
 if (!importResult || importResult.errors.length === 0) return;

 await generateErrorReport({
 errors: importResult.errors.map(error => ({
 row: error.row,
 field: error.field,
 errorType: 'Validation',
 message: error.message,
 suggestedFix: error.suggestedFix,
 originalData: error.data,
 })),
 fileName: 'Financial_Overview',
 dataColumns: [
 { header: 'Budget Code', key: 'budgetCode', width: 15 },
 { header: 'Sub Budget Line', key: 'subBudgetLine', width: 20 },
 { header: 'Activity Name', key: 'activityName', width: 30 },
 { header: 'Budget Item', key: 'budgetItem', width: 20 },
 { header: 'Qty', key: 'qty', width: 10 },
 { header: 'Unit Type', key: 'unitType', width: 15 },
 { header: 'Unit Cost', key: 'unitCost', width: 12 },
 { header: 'Recurrence', key: 'recurrence', width: 12 },
 { header: 'Currency', key: 'currency', width: 10 },
 { header: 'Notes', key: 'notes', width: 30 },
 ],
 });
 }

 // Send error report to Platform Admin (Governance Feature)
 const sendReportMutation = trpc.systemReports.submitImportErrorReport.useMutation({
 onSuccess: () => {
 toast.success(
 'Report sent to Platform Admin successfully'
 );
 setShowImportResult(false);
 },
 onError: (error) => {
 toast.error(
 `Failed to send report: ${error.message}`
 );
 },
 });

 async function handleSendReportToAdmin() {
 if (!importResult || importResult.errors.length === 0) return;

 // Get current project context
 const project = await trpc.projects.getById.query({ id: parseInt(projectId) });
 if (!project) {
 toast.error(t.projectDetail.failedToGetProjectInformation);
 return;
 }

 // Submit report to platform admin
 sendReportMutation.mutate({
 organizationId: project.organizationId,
 operatingUnitId: project.operatingUnitId || undefined,
 projectId: parseInt(projectId),
 module: 'Financial Overview',
 importType: 'create',
 importSummary: {
 rowsProcessed: importResult.imported + importResult.skipped + importResult.errors.length,
 rowsImported: importResult.imported,
 rowsSkipped: importResult.skipped,
 rowsWithErrors: importResult.errors.length,
 },
 errorDetails: importResult.errors.map(error => ({
 row: error.row,
 field: error.field,
 errorType: 'Validation',
 message: error.message,
 suggestedFix: error.suggestedFix,
 })),
 dataColumns: [
 { header: 'Budget Code', key: 'budgetCode', width: 15 },
 { header: 'Sub Budget Line', key: 'subBudgetLine', width: 20 },
 { header: 'Activity Name', key: 'activityName', width: 30 },
 { header: 'Budget Item', key: 'budgetItem', width: 20 },
 { header: 'Qty', key: 'qty', width: 10 },
 { header: 'Unit Type', key: 'unitType', width: 15 },
 { header: 'Unit Cost', key: 'unitCost', width: 12 },
 { header: 'Recurrence', key: 'recurrence', width: 12 },
 { header: 'Currency', key: 'currency', width: 10 },
 { header: 'Notes', key: 'notes', width: 30 },
 ],
 });
 }

 if (isLoading) {
 return <FinancialTabSkeleton />;
 }
 
 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Summary Cards */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div className="bg-white rounded-xl p-4 border border-gray-200">
 <p className="text-xs text-gray-600 mb-1">
 {t.projectDetail.totalBudget}
 </p>
 <p className="text-2xl font-bold text-gray-900">
 {formatCurrencyWithSymbol(metrics.totalBudget, projectCurrency)}
 </p>
 </div>
 <div className="bg-white rounded-xl p-4 border border-gray-200">
 <p className="text-xs text-gray-600 mb-1">
 {t.projectDetail.actualSpent}
 </p>
 <p className="text-2xl font-bold text-blue-600">
 {formatCurrencyWithSymbol(metrics.actualSpent, projectCurrency)}
 </p>
 </div>
 <div className="bg-white rounded-xl p-4 border border-gray-200">
 <p className="text-xs text-gray-600 mb-1">
 {t.projectDetail.remainingBalance}
 </p>
 <p className="text-2xl font-bold" style={{ color: metrics.remainingBalance >= 0 ? "#10B981" : "#EF4444" }}>
 {formatCurrencyWithSymbol(metrics.remainingBalance, projectCurrency)}
 </p>
 </div>
 <div className="bg-white rounded-xl p-4 border border-gray-200">
 <p className="text-xs text-gray-600 mb-1">
 {t.projectDetail.burnRate}
 </p>
 <p className="text-2xl font-bold" style={{ color: getBurnRateColor(metrics.burnRate) }}>
 {metrics.burnRate.toFixed(1)}%
 </p>
 </div>
 </div>
 
 {/* Budget vs Actual Chart */}
 <div className="bg-white rounded-xl p-5 border border-gray-200">
 <h3 className="text-lg font-bold text-gray-900 mb-4">
 {t.projectDetail.budgetVsActual}
 </h3>
 <div className="space-y-4">
 {/* Budget Bar */}
 <div>
 <div className="flex justify-between items-center mb-2">
 <span className="text-sm text-gray-600">
 {t.projectDetail.budgetedAmount}
 </span>
 <span className="text-sm font-semibold text-gray-900">
 {formatCurrencyWithSymbol(metrics.totalBudget, projectCurrency)}
 </span>
 </div>
 <div className="h-8 rounded-lg bg-gray-200">
 <div
 className="h-8 rounded-lg bg-blue-600"
 style={{ width: "100%" }}
 />
 </div>
 </div>
 
 {/* Actual Bar */}
 <div>
 <div className="flex justify-between items-center mb-2">
 <span className="text-sm text-gray-600">
 {t.projectDetail.actualSpent}
 </span>
 <span className="text-sm font-semibold" style={{ color: getBurnRateColor(metrics.burnRate) }}>
 {formatCurrencyWithSymbol(metrics.actualSpent, projectCurrency)} ({metrics.burnRate.toFixed(1)}%)
 </span>
 </div>
 <div className="h-8 rounded-lg bg-gray-200">
 <div
 className="h-8 rounded-lg"
 style={{
 width: `${Math.min(metrics.burnRate, 100)}%`,
 backgroundColor: getBurnRateColor(metrics.burnRate),
 }}
 />
 </div>
 </div>
 </div>
 </div>
 
 {/* Filters and Export */}
 <div className="bg-white rounded-xl p-5 border border-gray-200 space-y-4">
 <div className="flex items-center justify-between">
 <h3 className="text-lg font-bold text-gray-900">
 {t.projectDetail.financialDetails}
 </h3>
 <div className="flex gap-2">
 {selectedItems.size > 0 ? (
 <>
 <Button 
 variant="outline" 
 size="sm" 
 onClick={() => setSelectedItems(new Set())}
 >
 {`Deselect All (${selectedItems.size})`}
 </Button>
 <Button 
 variant="destructive" 
 size="sm" 
 onClick={handleBulkDelete}
 >
 <Trash2 className="w-4 h-4 me-2" />
 {`Delete Selected (${selectedItems.size})`}
 </Button>
 </>
 ) : (
 <>
 <Button variant="outline" size="sm" onClick={handleCreate}>
 <Plus className="w-4 h-4 me-2" />
 {t.projectDetail.create}
 </Button>
 <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)}>
 <Upload className="w-4 h-4 me-2" />
 {t.projectDetail.import}
 </Button>
 <UnifiedExportButton
 hasData={filteredItems.length > 0}
 onExportData={handleExportExcel}
 onExportTemplate={() => generateFinancialOverviewTemplate()}
 moduleName="Financial Overview"
 showModal={true}
 />
 <Button variant="outline" size="sm" onClick={() => setShowImportHistoryModal(true)}>
 <History className="w-4 h-4 me-2" />
 {t.projectDetail.history}
 </Button>
 <Button variant="outline" size="sm" onClick={() => window.print()} className="no-print">
 <Printer className="w-4 h-4 me-2" />
 {t.projectDetail.print}
 </Button>
 </>
 )}
 </div>
 </div>
 
 {/* Search Bar */}
 <div>
 <input
 type="text"
 placeholder={t.projectDetail.searchBudgetItemsOrActivities}
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
 />
 </div>
 
 {/* Budget Code Filter */}
 <div>
 <p className="text-sm font-semibold text-gray-900 mb-2">
 {t.projectDetail.filterByBudgetCode}
 </p>
 <div className="flex gap-2 overflow-x-auto pb-2">
 <button
 onClick={() => setBudgetCodeFilter("All")}
 className={`px-4 py-2 rounded-lg border text-sm whitespace-nowrap ${ budgetCodeFilter === "All" ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-300 bg-white text-gray-700' }`}
 >
 {t.projectDetail.all}
 </button>
 {budgetCodes.map((code, idx) => (
 <button
 key={idx}
 onClick={() => setBudgetCodeFilter(code)}
 className={`px-4 py-2 rounded-lg border text-sm whitespace-nowrap ${ budgetCodeFilter === code ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-300 bg-white text-gray-700' }`}
 >
 {code}
 </button>
 ))}
 </div>
 </div>
 
 {/* Financial Table */}
 <div className="space-y-4">
 {Array.from(groupedItems.entries()).map(([budgetCode, items]) => {
 const groupTotal = items.reduce((sum, item) => sum + parseFloat(item.totalBudgetLine?.toString() || "0"), 0);
 const groupSpent = items.reduce((sum, item) => sum + (item.spent || 0), 0);
 const groupBalance = groupTotal - groupSpent;
 const groupVariance = groupTotal > 0 ? ((groupSpent - groupTotal) / groupTotal) * 100 : 0;
 const groupCurrency = items[0]?.currency || 'USD';
 
 return (
 <div key={budgetCode} className="border-t border-gray-200 pt-4">
 {/* Budget Code Header */}
 <div className="flex items-center justify-between mb-3 p-3 rounded-lg bg-gray-50">
 <h4 className="text-base font-bold text-gray-900">{budgetCode}</h4>
 <div className="flex gap-4">
 <div>
 <p className="text-xs text-gray-600">{t.projectDetail.budget}</p>
 <p className="text-sm font-semibold text-gray-900">{formatCurrencyWithSymbol(groupTotal, groupCurrency)}</p>
 </div>
 <div>
 <p className="text-xs text-gray-600">{t.projectDetail.spent}</p>
 <p className="text-sm font-semibold text-blue-600">{formatCurrencyWithSymbol(groupSpent, groupCurrency)}</p>
 </div>
 <div>
 <p className="text-xs text-gray-600">{t.projectDetail.balance}</p>
 <p className="text-sm font-semibold" style={{ color: groupBalance >= 0 ? "#10B981" : "#EF4444" }}>
 {formatCurrencyWithSymbol(groupBalance, groupCurrency)}
 </p>
 </div>
 <div>
 <p className="text-xs text-gray-600">{t.projectDetail.variance}</p>
 <p className="text-sm font-semibold" style={{ color: getStatusColor(groupVariance) }}>
 {groupVariance > 0 ? "+" : ""}{groupVariance.toFixed(1)}%
 </p>
 </div>
 </div>
 </div>
 
 {/* Budget Items */}
 {items.map((item, idx) => {
 const budget = parseFloat(item.totalBudgetLine?.toString() || "0");
 const spent = parseFloat(item.actualSpent?.toString() || "0");
 const balance = budget - spent;
 const variancePercent = budget > 0 ? ((spent - budget) / budget) * 100 : 0;
 const status = 
 variancePercent > 10 ? (t.projectDetail.overspending) :
 variancePercent < -20 ? (t.projectDetail.underspending) :
 (t.projectDetail.onTrack);
 
 return (
 <div key={idx} className="ms-4 mb-3 p-3 rounded-lg border border-gray-200">
 <div className="flex items-start gap-3 mb-2">
 <input
 type="checkbox"
 checked={selectedItems.has(item.id)}
 onChange={(e) => {
 const newSelected = new Set(selectedItems);
 if (e.target.checked) {
 newSelected.add(item.id);
 } else {
 newSelected.delete(item.id);
 }
 setSelectedItems(newSelected);
 }}
 className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 no-print"
 />
 <div className="flex-1 flex items-start justify-between">
 <div className="flex-1">
 <p className="text-sm font-semibold text-gray-900 mb-1">
 {item.budgetItem}
 </p>
 {item.activity && (
 <p className="text-xs text-gray-600 mb-1">
 {t.projectDetail.activity}
 {isRTL ? item.activity.activityNameAr || item.activity.activityName : item.activity.activityName}
 </p>
 )}
 <p className="text-xs text-gray-600">
 {item.quantity} {item.unitType} × {formatCurrencyWithSymbol(parseFloat(item.unitCost?.toString() || "0"), item.currency || 'USD')} × {item.recurrence} = {formatCurrencyWithSymbol(budget, item.currency || 'USD')}
 </p>
 </div>
 <div
 className="px-3 py-1 rounded-full"
 style={{ backgroundColor: getStatusColor(variancePercent) + "20" }}
 >
 <span 
 className="text-xs font-semibold" 
 style={{ color: getStatusColor(variancePercent) }}
 >
 {status}
 </span>
 </div>
 </div>
 </div>
 
 {/* Progress Bar */}
 <div className="mb-2">
 <div className="h-2 rounded-full bg-gray-200">
 <div
 className="h-2 rounded-full"
 style={{
 width: `${Math.min((spent / budget) * 100, 100)}%`,
 backgroundColor: getStatusColor(variancePercent),
 }}
 />
 </div>
 </div>
 
 {/* Financial Details */}
 <div className="flex justify-between mb-2">
 <div>
 <p className="text-xs text-gray-600">{t.projectDetail.spent}</p>
 <p className="text-sm font-medium text-blue-600">
 {formatCurrencyWithSymbol(spent, item.currency || 'USD')}
 </p>
 </div>
 <div>
 <p className="text-xs text-gray-600">{t.projectDetail.balance}</p>
 <p className="text-sm font-medium" style={{ color: balance >= 0 ? "#10B981" : "#EF4444" }}>
 {formatCurrencyWithSymbol(balance, item.currency || 'USD')}
 </p>
 </div>
 <div>
 <p className="text-xs text-gray-600">{t.projectDetail.variance}</p>
 <p className="text-sm font-medium" style={{ color: getStatusColor(variancePercent) }}>
 {variancePercent > 0 ? "+" : ""}{variancePercent.toFixed(1)}%
 </p>
 </div>
 </div>
 
 {/* Action Buttons */}
 <div className="flex gap-2">
 <Button
 variant="outline"
 size="sm"
 className="flex-1"
 onClick={() => handleView(item)}
 >
 <Eye className="w-3 h-3 me-1" />
 {t.projectDetail.view}
 </Button>
 <Button
 variant="outline"
 size="sm"
 className="flex-1"
 onClick={() => handleEdit(item)}
 >
 <Edit2 className="w-3 h-3 me-1" />
 {t.projectDetail.edit}
 </Button>
 <Button
 variant="outline"
 size="sm"
 onClick={() => handleDeleteBudgetItem(item.id)}
 className="text-red-600 hover:text-red-700"
 >
 <Trash2 className="w-3 h-3" />
 </Button>
 </div>
 </div>
 );
 })}
 </div>
 );
 })}
 </div>
 
 {filteredItems.length === 0 && (
 <p className="text-sm text-gray-600 text-center py-8">
 {t.projectDetail.noBudgetItemsFoundMatchingThe}
 </p>
 )}
 </div>
 
 {/* Create/Edit Modal */}
 {showCreateModal && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-xl font-bold text-gray-900">
 {editingItem 
 ? (t.projectDetail.editBudgetItem)
 : (t.projectDetail.createBudgetItem)}
 </h2>
 <button onClick={() => { setShowCreateModal(false); setEditingItem(null); }} className="text-gray-500 hover:text-gray-700">
 <X className="w-5 h-5" />
 </button>
 </div>
 
 <div className="grid grid-cols-2 gap-4">
 <div className="col-span-2">
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {t.projectDetail.blCategory} *
 </label>
 <select
 value={formData.category || 'personal'}
 onChange={(e) => {
 setFormData({
 ...formData,
 category: e.target.value,
 activityId: (e.target.value !== 'project_activities' && e.target.value !== 'meal_activities') ? null : formData.activityId
 });
 }}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
 required
 >
 <option value="personal">{t.projectDetail.personalSalariesStaffCost}</option>
 <option value="project_activities">{t.projectDetail.projectActivities}</option>
 <option value="meal_activities">{t.projectDetail.mealActivities}</option>
 <option value="operation_cost">{t.projectDetail.operationCost}</option>
 <option value="ip_cost">{t.projectDetail.ipCostImplementingPartner}</option>
 <option value="overhead_cost">{t.projectDetail.overheadCost}</option>
 </select>
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {t.projectDetail.budgetCode} *
 </label>
 <input
 type="text"
 value={formData.budgetCode}
 onChange={(e) => setFormData({ ...formData, budgetCode: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
 required
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {t.projectDetail.subBudgetLine}
 </label>
 <input
 type="text"
 value={formData.subBudgetLine}
 onChange={(e) => setFormData({ ...formData, subBudgetLine: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
 />
 </div>
 
 {(formData.category === 'project_activities' || formData.category === 'meal_activities') && (
 <div className="col-span-2">
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {t.projectDetail.activitySourceOfTruth}
 </label>
 <select
 value={formData.activityId || ''}
 onChange={(e) => {
 const selectedId = e.target.value ? parseInt(e.target.value) : null;
 setFormData({
 ...formData,
 activityId: selectedId,
 });
 }}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
 >
 <option value="">{t.projectDetail.selectActivity}</option>
 {activitiesDropdown.map((activity) => (
 <option key={activity.id} value={activity.id}>
 {activity.activityName}
 </option>
 ))}
 </select>
 </div>
 )}
 
 <div className="col-span-2">
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {t.projectDetail.budgetItem}
 </label>
 <input
 type="text"
 value={formData.budgetItem}
 onChange={(e) => setFormData({ ...formData, budgetItem: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
 placeholder={t.projectDetail.optionalCanUseActivityName}
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {t.projectDetail.quantity} *
 </label>
 <input
 type="number"
 value={formData.qty}
 onChange={(e) => setFormData({ ...formData, qty: parseFloat(e.target.value) || 0 })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
 min="1"
 required
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {t.projectDetail.unitType}
 </label>
 <input
 type="text"
 value={formData.unitType}
 onChange={(e) => setFormData({ ...formData, unitType: e.target.value })}
 placeholder={t.placeholders.personTripItem}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {t.projectDetail.unitCost} *
 </label>
 <input
 type="number"
 value={formData.unitCost}
 onChange={(e) => setFormData({ ...formData, unitCost: parseFloat(e.target.value) || 0 })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
 min="0"
 step="0.01"
 required
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {t.projectDetail.recurrence} *
 </label>
 <input
 type="number"
 value={formData.recurrence}
 onChange={(e) => setFormData({ ...formData, recurrence: parseInt(e.target.value) || 1 })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
 min="1"
 required
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {t.projectDetail.currency} *
 </label>
 <select
 value={formData.currency}
 onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
 >
 <option value="USD">USD</option>
 <option value="EUR">EUR</option>
 <option value="CHF">CHF</option>
 <option value="YER">YER</option>
 <option value="SAR">SAR</option>
 </select>
 </div>
 
 {/* Spent field - only visible in Edit mode - MOVED BEFORE NOTES */}
 {editingItem && (
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {t.projectDetail.actualSpent1}
 </label>
 <input
 type="number"
 value={formData.spent}
 onChange={(e) => setFormData({ ...formData, spent: parseFloat(e.target.value) || 0 })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
 min="0"
 step="0.01"
 />
 </div>
 )}
 
 <div className="col-span-2">
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {t.projectDetail.notes}
 </label>
 <textarea
 value={formData.notes}
 onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
 rows={3}
 />
 </div>
 
 {/* Calculated Total */}
 <div className="col-span-2 bg-blue-50 p-4 rounded-lg border border-blue-200">
 <p className="text-sm font-medium text-gray-700 mb-1">
 {t.projectDetail.calculatedTotalBudgetLine}:
 </p>
 <p className="text-3xl font-bold text-blue-600">
 {formatCurrencyWithSymbol(calculatedTotal, formData.currency)}
 </p>
 <p className="text-xs text-gray-600 mt-1">
 {formData.qty} × {formatCurrencyWithSymbol(formData.unitCost, formData.currency)} × {formData.recurrence}
 </p>
 </div>
 
 {/* Auto-calculated Balance and Variance - only visible in Edit mode */}
 {editingItem && (
 <div className="col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <p className="text-sm font-medium text-gray-600 mb-1">
 {t.projectDetail.remainingBalance} ({t.projectDetail.autocalculated}):
 </p>
 <p className={`text-xl font-bold ${calculatedTotal - formData.spent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
 {formatCurrencyWithSymbol(calculatedTotal - formData.spent, formData.currency)}
 </p>
 </div>
 <div>
 <p className="text-sm font-medium text-gray-600 mb-1">
 {t.projectDetail.variance2} ({t.projectDetail.autocalculated}):
 </p>
 <p className={`text-xl font-bold ${calculatedTotal > 0 ? ((formData.spent / calculatedTotal) * 100 <= 100 ? 'text-green-600' : 'text-red-600') : 'text-gray-600'}`}>
 {calculatedTotal > 0 ? ((formData.spent / calculatedTotal) * 100).toFixed(1) : 0}%
 </p>
 </div>
 </div>
 </div>
 )}
 </div>
 
 <div className="flex gap-2 mt-6">
 <Button 
 onClick={handleSubmit} 
 disabled={createMutation.isPending || updateMutation.isPending}
 className="flex-1"
 >
 {editingItem 
 ? (t.projectDetail.update)
 : (t.projectDetail.create)}
 </Button>
 <Button 
 variant="outline" 
 onClick={() => { setShowCreateModal(false); setEditingItem(null); }}
 className="flex-1"
 >
 {t.projectDetail.cancel}
 </Button>
 </div>
 </div>
 </div>
 )}
 
 {/* View Modal */}
 {showViewModal && viewingItem && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-xl font-bold text-gray-900">
 {t.projectDetail.budgetItemDetails}
 </h2>
 <button onClick={() => { setShowViewModal(false); setViewingItem(null); }} className="text-gray-500 hover:text-gray-700">
 <X className="w-5 h-5" />
 </button>
 </div>
 
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <p className="text-sm font-medium text-gray-600">{t.projectDetail.budgetCode}</p>
 <p className="text-base font-semibold text-gray-900">{viewingItem.budgetCode}</p>
 </div>
 <div>
 <p className="text-sm font-medium text-gray-600">{t.projectDetail.subBudgetLine}</p>
 <p className="text-base font-semibold text-gray-900">{viewingItem.subBudgetLine || '-'}</p>
 </div>
 <div className="col-span-2">
 <p className="text-sm font-medium text-gray-600">{t.projectDetail.activityName}</p>
 <p className="text-base font-semibold text-gray-900">{viewingItem.activityName || '-'}</p>
 </div>
 <div className="col-span-2">
 <p className="text-sm font-medium text-gray-600">{t.projectDetail.budgetItem}</p>
 <p className="text-base font-semibold text-gray-900">{viewingItem.budgetItem}</p>
 </div>
 <div>
 <p className="text-sm font-medium text-gray-600">{t.projectDetail.quantity}</p>
 <p className="text-base font-semibold text-gray-900">{viewingItem.qty}</p>
 </div>
 <div>
 <p className="text-sm font-medium text-gray-600">{t.projectDetail.unitType}</p>
 <p className="text-base font-semibold text-gray-900">{viewingItem.unitType || '-'}</p>
 </div>
 <div>
 <p className="text-sm font-medium text-gray-600">{t.projectDetail.unitCost}</p>
 <p className="text-base font-semibold text-gray-900">{formatCurrencyWithSymbol(parseFloat(viewingItem.unitCost), viewingItem.currency)}</p>
 </div>
 <div>
 <p className="text-sm font-medium text-gray-600">{t.projectDetail.recurrence}</p>
 <p className="text-base font-semibold text-gray-900">{viewingItem.recurrence}</p>
 </div>
 </div>
 
 <div className="border-t pt-4">
 <div className="grid grid-cols-2 gap-4">
 <div className="bg-blue-50 p-3 rounded-lg">
 <p className="text-sm font-medium text-gray-600">{t.projectDetail.totalBudget}</p>
 <p className="text-2xl font-bold text-blue-600">{formatCurrencyWithSymbol(parseFloat(viewingItem.totalBudgetLine), viewingItem.currency)}</p>
 </div>
 <div className="bg-green-50 p-3 rounded-lg">
 <p className="text-sm font-medium text-gray-600">{t.projectDetail.actualSpent}</p>
 <p className="text-2xl font-bold text-green-600">{formatCurrencyWithSymbol(viewingItem.spent || 0, viewingItem.currency)}</p>
 </div>
 <div className="bg-purple-50 p-3 rounded-lg">
 <p className="text-sm font-medium text-gray-600">{t.projectDetail.balance}</p>
 <p className="text-2xl font-bold text-purple-600">{formatCurrencyWithSymbol(parseFloat(viewingItem.totalBudgetLine) - (viewingItem.spent || 0), viewingItem.currency)}</p>
 </div>
 <div className="bg-orange-50 p-3 rounded-lg">
 <p className="text-sm font-medium text-gray-600">{t.projectDetail.variance3}</p>
 <p className="text-2xl font-bold text-orange-600">
 {((viewingItem.spent || 0) / parseFloat(viewingItem.totalBudgetLine) * 100 - 100).toFixed(1)}%
 </p>
 </div>
 </div>
 </div>
 
 {viewingItem.notes && (
 <div>
 <p className="text-sm font-medium text-gray-600 mb-1">{t.projectDetail.notes}</p>
 <p className="text-base text-gray-900">{viewingItem.notes}</p>
 </div>
 )}
 </div>
 
 <div className="flex gap-2 mt-6">
 <Button 
 onClick={() => { 
 setShowViewModal(false); 
 handleEdit(viewingItem); 
 }}
 className="flex-1"
 >
 <Edit2 className="w-4 h-4 me-2" />
 {t.projectDetail.edit}
 </Button>
 <Button 
 variant="outline" 
 onClick={() => { setShowViewModal(false); setViewingItem(null); }}
 className="flex-1"
 >
 {t.projectDetail.close}
 </Button>
 </div>
 </div>
 </div>
 )}
 
 {/* Import Modal */}
 {showImportModal && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-xl font-bold text-gray-900">
 {t.projectDetail.importBudgetItems}
 </h2>
 <button onClick={() => { setShowImportModal(false); setImportFile(null); setImportPreview([]); }} className="text-gray-500 hover:text-gray-700">
 <X className="w-5 h-5" />
 </button>
 </div>
 
 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {t.projectDetail.selectExcelFile}
 </label>
 <input
 type="file"
 accept=".xlsx,.xls"
 onChange={handleFileSelect}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
 />
 <p className="text-xs text-gray-500 mt-1">
 {t.projectDetail.useTheSameFormatAsThe}
 </p>
 </div>
 
 <div className="flex items-center gap-2">
 <input
 type="checkbox"
 id="allowDuplicates"
 checked={allowDuplicates}
 onChange={(e) => setAllowDuplicates(e.target.checked)}
 className="w-4 h-4"
 />
 <label htmlFor="allowDuplicates" className="text-sm font-medium text-gray-700">
 {t.projectDetail.allowDuplicates}
 </label>
 </div>
 
 {importPreview.length > 0 && (
 <div className="border rounded-lg p-4 bg-gray-50">
 <p className="text-sm font-medium text-gray-700 mb-2">
 {t.projectDetail.preview}: {importPreview.length} {t.projectDetail.items}
 </p>
 <div className="max-h-60 overflow-y-auto space-y-2">
 {importPreview.slice(0, 5).map((item, idx) => (
 <div key={idx} className="bg-white p-2 rounded border border-gray-200 text-sm">
 <p className="font-semibold">{item.budgetCode} - {item.budgetItem}</p>
 <p className="text-gray-600 text-xs">
 {item.quantity} × {formatCurrencyWithSymbol(item.unitCost, item.currency)} × {item.recurrence}
 </p>
 </div>
 ))}
 {importPreview.length > 5 && (
 <p className="text-xs text-gray-500 text-center">
 {`and ${importPreview.length - 5} more items...`}
 </p>
 )}
 </div>
 </div>
 )}
 </div>
 
 <div className="flex gap-2 mt-6">
 <Button 
 onClick={handleConfirmImport} 
 disabled={importPreview.length === 0 || bulkImportMutation.isPending}
 className="flex-1"
 >
 {t.projectDetail.import} ({importPreview.length})
 </Button>
 <Button 
 variant="outline" 
 onClick={() => { setShowImportModal(false); setImportFile(null); setImportPreview([]); }}
 className="flex-1"
 >
 {t.projectDetail.cancel}
 </Button>
 </div>
 </div>
 </div>
 )}
 
 {/* Import History Modal */}
 {showImportHistoryModal && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-xl font-bold text-gray-900">
 {t.projectDetail.importHistory}
 </h2>
 <button onClick={() => setShowImportHistoryModal(false)} className="text-gray-500 hover:text-gray-700">
 <X className="w-5 h-5" />
 </button>
 </div>
 
 {/* Filters */}
 <div className="bg-gray-50 p-4 rounded-lg mb-4">
 <p className="text-sm font-semibold text-gray-700 mb-3">{t.projectDetail.filterResults}</p>
 <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
 <div>
 <label className="text-xs text-gray-600 mb-1 block">{t.projectDetail.dateFrom}</label>
 <input
 type="date"
 value={historyDateFrom}
 onChange={(e) => setHistoryDateFrom(e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
 />
 </div>
 <div>
 <label className="text-xs text-gray-600 mb-1 block">{t.projectDetail.dateTo}</label>
 <input
 type="date"
 value={historyDateTo}
 onChange={(e) => setHistoryDateTo(e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
 />
 </div>
 <div>
 <label className="text-xs text-gray-600 mb-1 block">{t.projectDetail.status}</label>
 <select
 value={historyStatus || ''}
 onChange={(e) => setHistoryStatus(e.target.value as any || undefined)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
 >
 <option value="">{t.projectDetail.all}</option>
 <option value="success">{t.projectDetail.success}</option>
 <option value="partial">{t.projectDetail.partial}</option>
 <option value="failed">{t.projectDetail.failed}</option>
 </select>
 </div>
 <div className="flex items-end">
 <Button
 variant="outline"
 size="sm"
 onClick={() => {
 setHistoryDateFrom('');
 setHistoryDateTo('');
 setHistoryUserId(undefined);
 setHistoryStatus(undefined);
 }}
 className="w-full"
 >
 {t.projectDetail.resetFilters}
 </Button>
 </div>
 </div>
 </div>
 
 {isLoadingHistory ? (
 <div className="text-center py-8">
 <p className="text-gray-600">{t.projectDetail.loading}</p>
 </div>
 ) : importHistoryData.length === 0 ? (
 <div className="text-center py-8">
 <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
 <p className="text-gray-600">
 {t.projectDetail.noImportHistory}
 </p>
 <p className="text-sm text-gray-500 mt-2">
 {t.projectDetail.allImportOperationsWillBeTracked}
 </p>
 </div>
 ) : (
 <div className="space-y-3">
 {importHistoryData.map((record: any) => {
 const statusColor = 
 record.status === 'completed' ? 'text-green-600 bg-green-50' :
 record.status === 'partial' ? 'text-yellow-600 bg-yellow-50' :
 'text-red-600 bg-red-50';
 
 const statusIcon = 
 record.status === 'completed' ? '✓' :
 record.status === 'partial' ? '⚠' :
 '✗';
 
 return (
 <div key={record.id} className="border border-gray-200 rounded-lg p-4">
 <div className="flex items-start justify-between mb-2">
 <div className="flex-1">
 <div className="flex items-center gap-2 mb-1">
 <FileSpreadsheet className="w-4 h-4 text-gray-600" />
 <p className="text-sm font-semibold text-gray-900">{record.fileName}</p>
 <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
 {statusIcon} {record.status}
 </span>
 </div>
 <p className="text-xs text-gray-600">
 {t.projectDetail.by} {record.userName || 'Unknown'} • {new Date(record.importedAt).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })}
 </p>
 </div>
 </div>
 
 <div className="grid grid-cols-3 gap-3 mt-3">
 <div className="bg-green-50 p-2 rounded">
 <p className="text-xs text-gray-600">{t.projectDetail.imported}</p>
 <p className="text-lg font-bold text-green-600">{record.recordsImported}</p>
 </div>
 <div className="bg-yellow-50 p-2 rounded">
 <p className="text-xs text-gray-600">{t.projectDetail.skipped}</p>
 <p className="text-lg font-bold text-yellow-600">{record.recordsSkipped}</p>
 </div>
 <div className="bg-red-50 p-2 rounded">
 <p className="text-xs text-gray-600">{t.projectDetail.errors}</p>
 <p className="text-lg font-bold text-red-600">{record.recordsErrors}</p>
 </div>
 </div>
 
 {record.allowedDuplicates && (
 <div className="mt-2 flex items-center gap-1 text-xs text-gray-600">
 <AlertCircle className="w-3 h-3" />
 <span>{t.projectDetail.duplicatesAllowed}</span>
 </div>
 )}
 
 {record.errorDetails && (
 <details className="mt-2">
 <summary className="text-xs text-red-600 cursor-pointer hover:underline">
 {t.projectDetail.viewErrorDetails}
 </summary>
 <pre className="mt-2 text-xs bg-red-50 p-2 rounded overflow-x-auto">
 {JSON.stringify(JSON.parse(record.errorDetails), null, 2)}
 </pre>
 </details>
 )}
 </div>
 );
 })}
 </div>
 )}
 
 <div className="flex justify-end mt-6">
 <Button variant="outline" onClick={() => setShowImportHistoryModal(false)}>
 {t.projectDetail.close}
 </Button>
 </div>
 </div>
 </div>
 )}

 {/* Pre-Import Preview Dialog */}
 <PreImportPreviewDialog
 open={showPreviewDialog}
 onClose={() => setShowPreviewDialog(false)}
 onConfirmImport={handleConfirmImport}
 validRows={validRows}
 invalidRows={invalidRows}
 columns={[
 { key: 'budgetCode', label: 'Budget Code' },
 { key: 'subBudgetLine', label: 'Sub Budget Line' },
 { key: 'activityName', label: 'Activity Name' },
 { key: 'budgetItem', label: 'Budget Item' },
 { key: 'qty', label: 'Qty' },
 { key: 'unitType', label: 'Unit Type' },
 { key: 'unitCost', label: 'Unit Cost' },
 { key: 'recurrence', label: 'Recurrence' },
 { key: 'currency', label: 'Currency' },
 ]}
 moduleName="Financial Overview"
 />
 
 {/* Import Result Panel */}
 <ImportResultPanel
 open={showImportResult}
 onClose={() => setShowImportResult(false)}
 result={importResult}
 onDownloadErrorReport={handleDownloadErrorReport}
 onSendReportToAdmin={handleSendReportToAdmin}
 onReupload={() => {
 setShowImportResult(false);
 setShowImportModal(true);
 }}
 isRTL={isRTL}
 />
 </div>
 );
}
