import { useState, useRef } from 'react';
import { Plus, Search, Download, Edit2, Eye, Trash2, Save, X as XIcon, FileSpreadsheet, Loader2, Upload, CheckSquare, Square, MoreVertical } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatNumber } from '@/utils/formatters';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { PreImportPreviewDialog } from '@/components/PreImportPreviewDialog';
import { casesImportConfig, validateImportRow, parseExcelToRows } from '@/config/caseManagementImportConfig';
import { useTranslation } from '@/i18n/useTranslation';
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CasesListProps {
 projectId: number;
 onViewCase: (caseId: number) => void;
}

export function CasesList({
 projectId, onViewCase }: CasesListProps) {
 const { t } = useTranslation();
 const { isRTL } = useLanguage();
 const { user } = useAuth();
 const utils = trpc.useUtils();
 const fileInputRef = useRef<HTMLInputElement>(null);
 
 const [filters, setFilters] = useState<{
 gender?: string;
 riskLevel?: string;
 status?: string;
 caseType?: string;
 }>({});
 const [searchTerm, setSearchTerm] = useState('');
 const [showAddForm, setShowAddForm] = useState(false);
 const [editingCaseId, setEditingCaseId] = useState<number | null>(null);
 const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
 const [showViewDetails, setShowViewDetails] = useState<any | null>(null);
 const [showExportModal, setShowExportModal] = useState(false);
 
 // Bulk operations state
 const [selectedCases, setSelectedCases] = useState<Set<number>>(new Set());
 const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
 const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
 const [bulkStatus, setBulkStatus] = useState('');
 
 // Import state
 const [showImportPreview, setShowImportPreview] = useState(false);
 const [importValidRows, setImportValidRows] = useState<any[]>([]);
 const [importInvalidRows, setImportInvalidRows] = useState<any[]>([]);
 
 // Form state
 const [formData, setFormData] = useState<{
 beneficiaryCode: string;
 firstName: string;
 lastName: string;
 dateOfBirth: string;
 gender: string;
 nationality: string;
 idNumber: string;
 phoneNumber: string;
 email: string;
 address: string;
 caseType: string;
 riskLevel: string;
 referralSource: string;
 intakeDate: string;
 status: string;
 assignedTo: string;
 notes: string;
 age?: number;
 }>({
 beneficiaryCode: '',
 firstName: '',
 lastName: '',
 dateOfBirth: '',
 gender: '',
 nationality: '',
 idNumber: '',
 phoneNumber: '',
 email: '',
 address: '',
 caseType: '',
 riskLevel: '',
 referralSource: '',
 intakeDate: new Date().toISOString().split('T')[0],
 status: 'open',
 assignedTo: user?.name || '',
 notes: ''
 });
 
 // tRPC queries and mutations
 const { data: cases, isLoading } = trpc.caseManagement.cases.getByProject.useQuery({
 projectId,
 filters
 });
 
 const createMutation = trpc.caseManagement.cases.create.useMutation({
 onSuccess: () => {
 utils.caseManagement.cases.getByProject.invalidate({ projectId });
 toast.success(t.projectDetail.caseCreatedSuccessfully);
 setShowAddForm(false);
 resetForm();
 },
 onError: (error) => {
 toast.error(error.message);
 }
 });
 
 const updateMutation = trpc.caseManagement.cases.update.useMutation({
 onSuccess: () => {
 utils.caseManagement.cases.getByProject.invalidate({ projectId });
 toast.success(t.projectDetail.caseUpdatedSuccessfully);
 setShowAddForm(false);
 setEditingCaseId(null);
 resetForm();
 },
 onError: (error) => {
 toast.error(error.message);
 }
 });
 
 const deleteMutation = trpc.caseManagement.cases.delete.useMutation({
 onSuccess: () => {
 utils.caseManagement.cases.getByProject.invalidate({ projectId });
 toast.success(t.projectDetail.caseDeletedSuccessfully);
 setShowDeleteConfirm(null);
 },
 onError: (error) => {
 toast.error(error.message);
 }
 });
 
 const resetForm = () => {
 setFormData({
 beneficiaryCode: '',
 firstName: '',
 lastName: '',
 dateOfBirth: '',
 gender: '',
 nationality: '',
 idNumber: '',
 phoneNumber: '',
 email: '',
 address: '',
 caseType: '',
 riskLevel: '',
 referralSource: '',
 intakeDate: new Date().toISOString().split('T')[0],
 status: 'open',
 assignedTo: user?.name || '',
 notes: ''
 });
 };
 
 // Filter by search term
 const filteredCases = (cases || []).filter(c =>
 c.caseCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
 c.beneficiaryCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
 `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
 );

 // ➕ ADD NEW CASE
 const handleAddCase = () => {
 setShowAddForm(true);
 setEditingCaseId(null);
 resetForm();
 };

 // ✏️ EDIT CASE
 const handleEditCase = (caseRecord: any) => {
 setEditingCaseId(caseRecord.id);
 setFormData({
 beneficiaryCode: caseRecord.beneficiaryCode || '',
 firstName: caseRecord.firstName || '',
 lastName: caseRecord.lastName || '',
 dateOfBirth: caseRecord.dateOfBirth ? new Date(caseRecord.dateOfBirth).toISOString().split('T')[0] : '',
 gender: caseRecord.gender || '',
 nationality: caseRecord.nationality || '',
 idNumber: caseRecord.idNumber || '',
 phoneNumber: caseRecord.phoneNumber || '',
 email: caseRecord.email || '',
 address: caseRecord.address || '',
 caseType: caseRecord.caseType || '',
 riskLevel: caseRecord.riskLevel || '',
 referralSource: caseRecord.referralSource || '',
 intakeDate: caseRecord.intakeDate ? new Date(caseRecord.intakeDate).toISOString().split('T')[0] : '',
 status: caseRecord.status || 'open',
 assignedTo: caseRecord.assignedTo || '',
 notes: caseRecord.notes || '',
 age: caseRecord.age
 });
 setShowAddForm(true);
 };

 // 💾 SAVE CASE (Create or Update)
 const handleSaveCase = () => {
 // Validation
 if (!formData.beneficiaryCode || !formData.caseType || !formData.riskLevel) {
 toast.error(t.projectDetail.pleaseFillRequiredFields);
 return;
 }

 if (editingCaseId) {
 // Update existing case
 updateMutation.mutate({
 id: editingCaseId,
 ...formData
 });
 } else {
 // Create new case
 createMutation.mutate({
 projectId,
 ...formData
 });
 }
 };

 // 🗑 DELETE CASE
 const handleDeleteCase = () => {
 if (showDeleteConfirm) {
 deleteMutation.mutate({ id: showDeleteConfirm });
 }
 };

 // 📥 EXPORT TO EXCEL (Single Export Button)
 const handleExportExcel = async (format: 'xlsx' | 'csv') => {
 const workbook = new ExcelJS.Workbook();
 const worksheet = workbook.addWorksheet(t.projectDetail.casesList);

 // Define columns with bilingual headers
 worksheet.columns = [
 { header: t.projectDetail.caseCode, key: 'caseCode', width: 15 },
 { header: t.projectDetail.beneficiaryCode, key: 'beneficiaryCode', width: 18 },
 { header: t.projectDetail.firstName, key: 'firstName', width: 15 },
 { header: t.projectDetail.lastName, key: 'lastName', width: 15 },
 { header: t.projectDetail.dateOfBirth, key: 'dateOfBirth', width: 15 },
 { header: t.projectDetail.gender, key: 'gender', width: 10 },
 { header: t.projectDetail.age, key: 'age', width: 8 },
 { header: t.projectDetail.nationality, key: 'nationality', width: 15 },
 { header: t.projectDetail.idNumber, key: 'idNumber', width: 18 },
 { header: t.projectDetail.phoneNumber, key: 'phoneNumber', width: 15 },
 { header: t.projectDetail.email, key: 'email', width: 25 },
 { header: t.projectDetail.address, key: 'address', width: 30 },
 { header: t.projectDetail.caseType, key: 'caseType', width: 20 },
 { header: t.projectDetail.riskLevel27, key: 'riskLevel', width: 12 },
 { header: t.projectDetail.referralSource, key: 'referralSource', width: 20 },
 { header: t.projectDetail.intakeDate, key: 'intakeDate', width: 15 },
 { header: t.projectDetail.status, key: 'status', width: 12 },
 { header: t.projectDetail.assignedTo, key: 'assignedTo', width: 18 },
 { header: t.projectDetail.notes, key: 'notes', width: 40 }
 ];

 // Style header row
 worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
 worksheet.getRow(1).fill = {
 type: 'pattern',
 pattern: 'solid',
 fgColor: { argb: 'FF0F172A' }
 };

 // Add data - export selected cases if any, otherwise all filtered cases
 const casesToExport = selectedCases.size > 0 
 ? filteredCases.filter(c => selectedCases.has(c.id))
 : filteredCases;
 
 casesToExport.forEach(caseRecord => {
 worksheet.addRow({
 ...caseRecord,
 dateOfBirth: caseRecord.dateOfBirth ? new Date(caseRecord.dateOfBirth).toISOString().split('T')[0] : '',
 intakeDate: caseRecord.intakeDate ? new Date(caseRecord.intakeDate).toISOString().split('T')[0] : ''
 });
 });

 // Generate file
 if (format === 'csv') {
 const buffer = await workbook.csv.writeBuffer();
 const blob = new Blob([buffer], { type: 'text/csv' });
 saveAs(blob, `Cases_List_${new Date().toISOString().split('T')[0]}.csv`);
 } else {
 const buffer = await workbook.xlsx.writeBuffer();
 const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
 saveAs(blob, `Cases_List_${new Date().toISOString().split('T')[0]}.xlsx`);
 }
 
 toast.success(t.projectDetail.exportSuccessful);
 setShowExportModal(false);
 };

 // 📤 EXPORT TEMPLATE
 const handleExportTemplate = async () => {
 const workbook = new ExcelJS.Workbook();
 const worksheet = workbook.addWorksheet(t.projectDetail.casesImportTemplate);

 // Define columns from config
 worksheet.columns = casesImportConfig.columns.map(col => ({
 header: isRTL ? col.labelAr : col.label,
 key: col.key,
 width: 20
 }));

 // Style header row
 worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
 worksheet.getRow(1).fill = {
 type: 'pattern',
 pattern: 'solid',
 fgColor: { argb: 'FF4472C4' }
 };

 // Add sample row
 worksheet.addRow({
 beneficiaryCode: 'BEN-2024-001',
 firstName: 'Ahmed',
 lastName: 'Mohammed',
 dateOfBirth: '1990-01-15',
 gender: 'male',
 nationality: 'Yemeni',
 idNumber: 'ID123456',
 phoneNumber: '+967123456789',
 email: 'example@email.com',
 address: 'Sana\'a, Yemen',
 caseType: 'pss',
 riskLevel: 'medium',
 status: 'open',
 referralSource: 'Community Outreach',
 intakeDate: new Date().toISOString().split('T')[0],
 assignedTo: 'Case Worker',
 notes: 'Sample case - DELETE BEFORE IMPORT'
 });

 const buffer = await workbook.xlsx.writeBuffer();
 const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
 saveAs(blob, `Cases_Import_Template_${new Date().toISOString().split('T')[0]}.xlsx`);
 toast.success(t.projectDetail.templateDownloadedSuccessfully);
 setShowExportModal(false);
 };

 // 📥 IMPORT FILE HANDLER
 const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;

 try {
 const workbook = new ExcelJS.Workbook();
 await workbook.xlsx.load(await file.arrayBuffer());
 const worksheet = workbook.worksheets[0];
 
 if (!worksheet) {
 toast.error(t.projectDetail.noDataFoundInFile);
 return;
 }

 // Parse worksheet to array
 const data: any[][] = [];
 worksheet.eachRow((row, rowNumber) => {
 const rowData: any[] = [];
 row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
 rowData[colNumber - 1] = cell.value;
 });
 data.push(rowData);
 });

 // Parse and validate rows
 const rows = parseExcelToRows(data, casesImportConfig);
 const validRows: any[] = [];
 const invalidRows: any[] = [];

 rows.forEach((row, index) => {
 const { isValid, errors } = validateImportRow(row, index + 2, casesImportConfig, isRTL);
 if (isValid) {
 validRows.push({ rowNumber: index + 2, data: row, isValid: true });
 } else {
 invalidRows.push({ rowNumber: index + 2, data: row, isValid: false, errors });
 }
 });

 setImportValidRows(validRows);
 setImportInvalidRows(invalidRows);
 setShowImportPreview(true);
 } catch (error) {
 toast.error(t.projectDetail.errorReadingFile);
 }

 // Reset file input
 if (fileInputRef.current) {
 fileInputRef.current.value = '';
 }
 };

 // 📥 CONFIRM IMPORT
 const handleConfirmImport = async () => {
 let successCount = 0;
 let errorCount = 0;

 for (const row of importValidRows) {
 try {
 await createMutation.mutateAsync({
 projectId,
 ...row.data
 });
 successCount++;
 } catch (error) {
 errorCount++;
 }
 }

 toast.success(
 isRTL 
 ? `تم استيراد ${successCount} حالة بنجاح${errorCount > 0 ? `، فشل ${errorCount}` : ''}`
 : `Successfully imported ${successCount} cases${errorCount > 0 ? `, ${errorCount} failed` : ''}`
 );

 setShowImportPreview(false);
 setImportValidRows([]);
 setImportInvalidRows([]);
 utils.caseManagement.cases.getByProject.invalidate({ projectId });
 };

 // BULK OPERATIONS
 const toggleSelectAll = () => {
 if (selectedCases.size === filteredCases.length) {
 setSelectedCases(new Set());
 } else {
 setSelectedCases(new Set(filteredCases.map(c => c.id)));
 }
 };

 const toggleSelectCase = (id: number) => {
 const newSelected = new Set(selectedCases);
 if (newSelected.has(id)) {
 newSelected.delete(id);
 } else {
 newSelected.add(id);
 }
 setSelectedCases(newSelected);
 };

 const handleBulkDelete = async () => {
 let successCount = 0;
 for (const id of selectedCases) {
 try {
 await deleteMutation.mutateAsync({ id });
 successCount++;
 } catch (error) {
 // Continue with other deletions
 }
 }
 toast.success(`Deleted ${successCount} cases`);
 setSelectedCases(new Set());
 setShowBulkDeleteConfirm(false);
 };

 const handleBulkStatusUpdate = async () => {
 if (!bulkStatus) return;
 
 let successCount = 0;
 for (const id of selectedCases) {
 try {
 await updateMutation.mutateAsync({ id, status: bulkStatus });
 successCount++;
 } catch (error) {
 // Continue with other updates
 }
 }
 toast.success(`Updated ${successCount} cases`);
 setSelectedCases(new Set());
 setShowBulkStatusModal(false);
 setBulkStatus('');
 };

 if (isLoading) {
 return (
 <div className="flex items-center justify-center py-12" dir={isRTL ? 'rtl' : 'ltr'}>
 <Loader2 className="w-8 h-8 animate-spin text-primary" />
 <span className="ms-2 text-gray-600">{t.projectDetail.loading}</span>
 </div>
 );
 }
 
 return (
 <div className="bg-white rounded-lg shadow-sm border border-gray-200">
 {/* Header with Bilingual Support */}
 <div className={`p-6 border-b border-gray-200 flex items-center justify-between`}>
 <div className={'text-start'}>
 <h2 className="text-sm font-semibold text-gray-900">
 {t.projectDetail.casesList}
 <span className="text-xs text-gray-500 mx-2">|</span>
 <span className="text-xs text-gray-500">{'قائمة الحالات'}</span>
 </h2>
 <p className="text-xs text-gray-600 mt-0.5">
 {t.projectDetail.manageAllProjectCases}
 <span className="text-xs text-gray-400 mx-2">|</span>
 <span className="text-xs text-gray-400">{'إدارة جميع حالات المشروع'}</span>
 </p>
 </div>
 <div className={`flex items-center gap-2`}>
 {/* Bulk Actions Dropdown (visible when items selected) */}
 {selectedCases.size > 0 && (
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <button className={`px-4 py-2 text-sm bg-amber-600 text-white rounded-md hover:bg-amber-700 flex items-center gap-2`}>
 <MoreVertical className="w-4 h-4" />
 {`Actions (${selectedCases.size})`}
 </button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end">
 <DropdownMenuItem onClick={() => handleExportExcel('xlsx')}>
 <Download className="w-4 h-4 me-2" />
 {t.projectDetail.exportSelected}
 </DropdownMenuItem>
 <DropdownMenuItem onClick={() => setShowBulkStatusModal(true)}>
 <Edit2 className="w-4 h-4 me-2" />
 {t.projectDetail.changeStatus}
 </DropdownMenuItem>
 <DropdownMenuItem onClick={() => setShowBulkDeleteConfirm(true)} className="text-red-600">
 <Trash2 className="w-4 h-4 me-2" />
 {t.projectDetail.deleteSelected}
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 )}
 
 {/* Single Export Button */}
 <button
 onClick={() => setShowExportModal(true)}
 className={`px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2`}
 >
 <Download className="w-4 h-4" />
 {t.projectDetail.export}
 </button>
 
 {/* Import Button */}
 <button
 onClick={() => fileInputRef.current?.click()}
 className={`px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2`}
 >
 <Upload className="w-4 h-4" />
 {t.projectDetail.import}
 </button>
 <input
 ref={fileInputRef}
 type="file"
 accept=".xlsx,.xls"
 onChange={handleFileSelect}
 className="hidden"
 />
 
 <button
 onClick={handleAddCase}
 className={`px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2`}
 >
 <Plus className="w-4 h-4" />
 {t.projectDetail.addNewCase}
 </button>
 </div>
 </div>
 
 {/* Search & Filters */}
 <div className="p-4 border-b border-gray-200">
 <div className={`flex items-center gap-4 flex-wrap`}>
 <div className="flex-1 min-w-[200px] relative">
 <Search className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 ${'start-3'}`} />
 <input
 type="text"
 placeholder={t.projectDetail.searchByCodeOrName}
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className={`w-full py-2 border border-gray-300 rounded-md text-sm ps-10 pe-3 text-start`}
 />
 </div>
 
 <select
 className={`px-3 py-2 border border-gray-300 rounded-md text-sm text-start`}
 value={filters.gender || ''}
 onChange={(e) => setFilters({ ...filters, gender: e.target.value || undefined })}
 >
 <option value="">{t.projectDetail.allGender}</option>
 <option value="male">{t.projectDetail.male}</option>
 <option value="female">{t.projectDetail.female}</option>
 </select>
 
 <select
 className={`px-3 py-2 border border-gray-300 rounded-md text-sm text-start`}
 value={filters.riskLevel || ''}
 onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value || undefined })}
 >
 <option value="">{t.projectDetail.allRiskLevels}</option>
 <option value="high">{t.projectDetail.high}</option>
 <option value="medium">{t.projectDetail.medium}</option>
 <option value="low">{t.projectDetail.low}</option>
 </select>
 
 <select
 className={`px-3 py-2 border border-gray-300 rounded-md text-sm text-start`}
 value={filters.status || ''}
 onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
 >
 <option value="">{t.projectDetail.allStatus}</option>
 <option value="open">{t.projectDetail.open}</option>
 <option value="ongoing">{t.projectDetail.ongoing}</option>
 <option value="closed">{t.projectDetail.closed}</option>
 </select>
 </div>
 </div>
 
 {/* Cases Table */}
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className="px-4 py-3 w-10">
 <button onClick={toggleSelectAll} className="p-1 hover:bg-gray-200 rounded">
 {selectedCases.size === filteredCases.length && filteredCases.length > 0 ? (
 <CheckSquare className="w-4 h-4 text-primary" />
 ) : (
 <Square className="w-4 h-4 text-gray-400" />
 )}
 </button>
 </th>
 <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider text-start`}>
 {t.projectDetail.caseCode}
 </th>
 <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider text-start`}>
 {t.projectDetail.beneficiary}
 </th>
 <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider text-start`}>
 {t.projectDetail.gender}
 </th>
 <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider text-start`}>
 {t.projectDetail.age}
 </th>
 <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider text-start`}>
 {t.projectDetail.risk}
 </th>
 <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider text-start`}>
 {t.projectDetail.type}
 </th>
 <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider text-start`}>
 {t.projectDetail.status}
 </th>
 <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider text-start`}>
 {t.projectDetail.actions}
 </th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-gray-200">
 {filteredCases.length === 0 ? (
 <tr>
 <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
 <p className="text-sm">{t.projectDetail.noCasesMatchTheCurrentFilters}</p>
 </td>
 </tr>
 ) : (
 filteredCases.map((caseRecord) => (
 <tr key={caseRecord.id} className={`hover:bg-gray-50 ${selectedCases.has(caseRecord.id) ? 'bg-blue-50' : ''}`}>
 <td className="px-4 py-4">
 <button onClick={() => toggleSelectCase(caseRecord.id)} className="p-1 hover:bg-gray-200 rounded">
 {selectedCases.has(caseRecord.id) ? (
 <CheckSquare className="w-4 h-4 text-primary" />
 ) : (
 <Square className="w-4 h-4 text-gray-400" />
 )}
 </button>
 </td>
 <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-start`}>
 {caseRecord.caseCode}
 </td>
 <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-start`}>
 {caseRecord.beneficiaryCode}
 </td>
 <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-start`}>
 {caseRecord.gender === 'male' ? (t.projectDetail.m28) : (t.projectDetail.f29)}
 </td>
 <td className="ltr-safe px-6 py-4 whitespace-nowrap text-sm text-end text-gray-600">
 {caseRecord.age || '-'}
 </td>
 <td className={`px-6 py-4 whitespace-nowrap text-sm text-start`}>
 <RiskBadge level={caseRecord.riskLevel || ''} isRTL={isRTL} />
 </td>
 <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-600 uppercase text-start`}>
 {caseRecord.caseType}
 </td>
 <td className={`px-6 py-4 whitespace-nowrap text-sm text-start`}>
 <StatusBadge status={caseRecord.status || ''} isRTL={isRTL} />
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-center">
 <div className={`flex items-center gap-2 justify-start`}>
 <button
 onClick={() => setShowViewDetails(caseRecord)}
 className="p-1 text-blue-600 hover:bg-blue-50 rounded"
 title={t.projectDetail.view}
 >
 <Eye className="w-4 h-4" />
 </button>
 <button
 onClick={() => handleEditCase(caseRecord)}
 className="p-1 text-amber-600 hover:bg-amber-50 rounded"
 title={t.projectDetail.edit}
 >
 <Edit2 className="w-4 h-4" />
 </button>
 <button
 onClick={() => setShowDeleteConfirm(caseRecord.id)}
 className="p-1 text-red-600 hover:bg-red-50 rounded"
 title={t.projectDetail.delete}
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
 
 {/* Export Modal */}
 {showExportModal && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50">
 <div className="bg-white rounded-lg shadow-xl p-6 max-w-md m-4">
 <h3 className={`text-lg font-semibold text-gray-900 mb-4 text-start`}>
 {t.projectDetail.exportOptions}
 <span className="text-xs text-gray-500 mx-2">|</span>
 <span className="text-xs text-gray-500">{'خيارات التصدير'}</span>
 </h3>
 <div className="space-y-3">
 <button
 onClick={() => handleExportExcel('xlsx')}
 className={`w-full px-4 py-3 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-3`}
 >
 <FileSpreadsheet className="w-5 h-5 text-green-600" />
 <div className={'text-start'}>
 <div className="font-medium">{t.projectDetail.exportExcelXlsx}</div>
 <div className="text-xs text-gray-500">{t.projectDetail.exportCurrentData}</div>
 </div>
 </button>
 <button
 onClick={() => handleExportExcel('csv')}
 className={`w-full px-4 py-3 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-3`}
 >
 <FileSpreadsheet className="w-5 h-5 text-blue-600" />
 <div className={'text-start'}>
 <div className="font-medium">{t.projectDetail.exportCsv}</div>
 <div className="text-xs text-gray-500">{t.projectDetail.forCompatibilityWithOtherSoftware}</div>
 </div>
 </button>
 <button
 onClick={handleExportTemplate}
 className={`w-full px-4 py-3 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-3`}
 >
 <Download className="w-5 h-5 text-purple-600" />
 <div className={'text-start'}>
 <div className="font-medium">{t.projectDetail.downloadImportTemplate}</div>
 <div className="text-xs text-gray-500">{t.projectDetail.emptyTemplateForDataImport}</div>
 </div>
 </button>
 </div>
 <div className="mt-4 pt-4 border-t">
 <button
 onClick={() => setShowExportModal(false)}
 className="w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
 >
 {t.projectDetail.cancel}
 </button>
 </div>
 </div>
 </div>
 )}
 
 {/* Add/Edit Form Modal */}
 {showAddForm && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50">
 <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
 <div className={`p-6 border-b border-gray-200 flex items-center justify-between`}>
 <h3 className="text-lg font-semibold text-gray-900">
 {editingCaseId 
 ? (t.projectDetail.editCase) 
 : (t.projectDetail.addNewCase)}
 </h3>
 <button
 onClick={() => { setShowAddForm(false); setEditingCaseId(null); resetForm(); }}
 className="p-2 hover:bg-gray-100 rounded-full"
 >
 <XIcon className="w-5 h-5" />
 </button>
 </div>
 
 <div className="p-6 space-y-6">
 {/* Beneficiary Information */}
 <div>
 <h4 className={`text-sm font-semibold text-gray-900 mb-4 text-start`}>
 {t.projectDetail.beneficiaryInformation}
 </h4>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.beneficiaryCode30}
 </label>
 <input
 type="text"
 value={formData.beneficiaryCode}
 onChange={(e) => setFormData({ ...formData, beneficiaryCode: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-start`}
 placeholder="BEN-2024-001"
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.firstName}
 </label>
 <input
 type="text"
 value={formData.firstName}
 onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-start`}
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.lastName}
 </label>
 <input
 type="text"
 value={formData.lastName}
 onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-start`}
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.dateOfBirth}
 </label>
 <input
 type="date"
 value={formData.dateOfBirth}
 onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-start`}
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.gender}
 </label>
 <select
 value={formData.gender}
 onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-start`}
 >
 <option value="">{t.projectDetail.select}</option>
 <option value="male">{t.projectDetail.male}</option>
 <option value="female">{t.projectDetail.female}</option>
 </select>
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.nationality}
 </label>
 <input
 type="text"
 value={formData.nationality}
 onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-start`}
 />
 </div>
 </div>
 </div>
 
 {/* Case Information */}
 <div>
 <h4 className={`text-sm font-semibold text-gray-900 mb-4 text-start`}>
 {t.projectDetail.caseInformation}
 </h4>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.caseType31}
 </label>
 <select
 value={formData.caseType}
 onChange={(e) => setFormData({ ...formData, caseType: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-start`}
 >
 <option value="">{t.projectDetail.select}</option>
 <option value="pss">{t.projectDetail.pss}</option>
 <option value="cp">{t.projectDetail.childProtection}</option>
 <option value="gbv">{t.projectDetail.gbv32}</option>
 <option value="protection">{t.projectDetail.protection}</option>
 </select>
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.riskLevel33}
 </label>
 <select
 value={formData.riskLevel}
 onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-start`}
 >
 <option value="">{t.projectDetail.select}</option>
 <option value="high">{t.projectDetail.high}</option>
 <option value="medium">{t.projectDetail.medium}</option>
 <option value="low">{t.projectDetail.low}</option>
 </select>
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.status}
 </label>
 <select
 value={formData.status}
 onChange={(e) => setFormData({ ...formData, status: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-start`}
 >
 <option value="open">{t.projectDetail.open}</option>
 <option value="ongoing">{t.projectDetail.ongoing}</option>
 <option value="closed">{t.projectDetail.closed}</option>
 </select>
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.intakeDate}
 </label>
 <input
 type="date"
 value={formData.intakeDate}
 onChange={(e) => setFormData({ ...formData, intakeDate: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-start`}
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.referralSource}
 </label>
 <input
 type="text"
 value={formData.referralSource}
 onChange={(e) => setFormData({ ...formData, referralSource: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-start`}
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.assignedTo}
 </label>
 <input
 type="text"
 value={formData.assignedTo}
 onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-start`}
 />
 </div>
 </div>
 </div>
 
 {/* Notes */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.notes}
 </label>
 <textarea
 value={formData.notes}
 onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
 rows={3}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-start`}
 />
 </div>
 </div>
 
 <div className={`p-6 border-t border-gray-200 flex items-center gap-3`}>
 <button
 onClick={handleSaveCase}
 disabled={createMutation.isPending || updateMutation.isPending}
 className={`px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2`}
 >
 {(createMutation.isPending || updateMutation.isPending) ? (
 <Loader2 className="w-4 h-4 animate-spin" />
 ) : (
 <Save className="w-4 h-4" />
 )}
 {t.projectDetail.save}
 </button>
 <button
 onClick={() => { setShowAddForm(false); setEditingCaseId(null); resetForm(); }}
 className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
 >
 {t.projectDetail.cancel}
 </button>
 </div>
 </div>
 </div>
 )}
 
 {/* Delete Confirmation Modal */}
 {showDeleteConfirm && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50">
 <div className="bg-white rounded-lg shadow-xl p-6 max-w-md m-4">
 <h3 className={`text-lg font-semibold text-gray-900 mb-4 text-start`}>
 {t.projectDetail.confirmDelete}
 </h3>
 <p className={`text-gray-600 mb-6 text-start`}>
 {'Are you sure you want to delete this case? This action cannot be undone.'}
 </p>
 <div className={`flex items-center gap-3`}>
 <button
 onClick={handleDeleteCase}
 disabled={deleteMutation.isPending}
 className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2"
 >
 {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
 {t.projectDetail.delete}
 </button>
 <button
 onClick={() => setShowDeleteConfirm(null)}
 className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
 >
 {t.projectDetail.cancel}
 </button>
 </div>
 </div>
 </div>
 )}
 
 {/* Bulk Delete Confirmation Modal */}
 {showBulkDeleteConfirm && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50">
 <div className="bg-white rounded-lg shadow-xl p-6 max-w-md m-4">
 <h3 className={`text-lg font-semibold text-gray-900 mb-4 text-start`}>
 {t.projectDetail.confirmBulkDelete}
 </h3>
 <p className={`text-gray-600 mb-6 text-start`}>
 {`Are you sure you want to delete ${selectedCases.size} cases? This action cannot be undone.`}
 </p>
 <div className={`flex items-center gap-3`}>
 <button
 onClick={handleBulkDelete}
 className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
 >
 {t.projectDetail.deleteAll}
 </button>
 <button
 onClick={() => setShowBulkDeleteConfirm(false)}
 className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
 >
 {t.projectDetail.cancel}
 </button>
 </div>
 </div>
 </div>
 )}
 
 {/* Bulk Status Update Modal */}
 {showBulkStatusModal && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50">
 <div className="bg-white rounded-lg shadow-xl p-6 max-w-md m-4">
 <h3 className={`text-lg font-semibold text-gray-900 mb-4 text-start`}>
 {t.projectDetail.bulkStatusChange}
 </h3>
 <p className={`text-gray-600 mb-4 text-start`}>
 {`Change status of ${selectedCases.size} cases to:`}
 </p>
 <select
 value={bulkStatus}
 onChange={(e) => setBulkStatus(e.target.value)}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-6 text-start`}
 >
 <option value="">{t.projectDetail.selectStatus}</option>
 <option value="open">{t.projectDetail.open}</option>
 <option value="ongoing">{t.projectDetail.ongoing}</option>
 <option value="closed">{t.projectDetail.closed}</option>
 </select>
 <div className={`flex items-center gap-3`}>
 <button
 onClick={handleBulkStatusUpdate}
 disabled={!bulkStatus}
 className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
 >
 {t.projectDetail.update}
 </button>
 <button
 onClick={() => { setShowBulkStatusModal(false); setBulkStatus(''); }}
 className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
 >
 {t.projectDetail.cancel}
 </button>
 </div>
 </div>
 </div>
 )}
 
 {/* View Details Modal */}
 {showViewDetails && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50">
 <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
 <div className={`p-6 border-b border-gray-200 flex items-center justify-between`}>
 <h3 className="text-lg font-semibold text-gray-900">
 {t.projectDetail.caseDetails}
 </h3>
 <button
 onClick={() => setShowViewDetails(null)}
 className="p-2 hover:bg-gray-100 rounded-full"
 >
 <XIcon className="w-5 h-5" />
 </button>
 </div>
 <div className="p-6 space-y-4">
 <DetailRow label={t.projectDetail.caseCode} value={showViewDetails.caseCode} isRTL={isRTL} />
 <DetailRow label={t.projectDetail.beneficiaryCode} value={showViewDetails.beneficiaryCode} isRTL={isRTL} />
 <DetailRow label={t.projectDetail.name} value={`${showViewDetails.firstName || ''} ${showViewDetails.lastName || ''}`} isRTL={isRTL} />
 <DetailRow label={t.projectDetail.gender} value={showViewDetails.gender} isRTL={isRTL} />
 <DetailRow label={t.projectDetail.age} value={showViewDetails.age} isRTL={isRTL} />
 <DetailRow label={t.projectDetail.caseType} value={showViewDetails.caseType} isRTL={isRTL} />
 <DetailRow label={t.projectDetail.riskLevel27} value={showViewDetails.riskLevel} isRTL={isRTL} />
 <DetailRow label={t.projectDetail.status} value={showViewDetails.status} isRTL={isRTL} />
 <DetailRow label={t.projectDetail.notes} value={showViewDetails.notes} isRTL={isRTL} />
 </div>
 </div>
 </div>
 )}
 
 {/* Import Preview Dialog */}
 <PreImportPreviewDialog
 open={showImportPreview}
 onClose={() => {
 setShowImportPreview(false);
 setImportValidRows([]);
 setImportInvalidRows([]);
 }}
 onConfirmImport={handleConfirmImport}
 validRows={importValidRows}
 invalidRows={importInvalidRows}
 columns={casesImportConfig.columns.map(col => ({
 key: col.key,
 label: isRTL ? col.labelAr : col.label
 }))}
 moduleName={isRTL ? casesImportConfig.moduleNameAr : casesImportConfig.moduleName}
 />
 </div>
 );
}

// Helper Components
function RiskBadge({
 level, isRTL }: { level: string; isRTL: boolean }) {
 const colors = {
 high: 'bg-red-100 text-red-700',
 medium: 'bg-yellow-100 text-yellow-700',
 low: 'bg-green-100 text-green-700'
 };
 
 const labels = {
 high: t.projectDetail.high,
 medium: t.projectDetail.medium,
 low: t.projectDetail.low
 };
 
 return (
 <span className={`px-2 py-1 ${colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-700'} text-xs font-medium rounded-full`}>
 {labels[level as keyof typeof labels] || level}
 </span>
 );
}

function StatusBadge({
 status, isRTL }: { status: string; isRTL: boolean }) {
 const colors = {
 open: 'bg-blue-100 text-blue-700',
 ongoing: 'bg-green-100 text-green-700',
 closed: 'bg-gray-100 text-gray-700'
 };
 
 const labels = {
 open: t.projectDetail.open,
 ongoing: t.projectDetail.ongoing,
 closed: t.projectDetail.closed
 };
 
 return (
 <span className={`px-2 py-1 ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700'} text-xs font-medium rounded-full`}>
 {labels[status as keyof typeof labels] || status}
 </span>
 );
}

function DetailRow({ label, value, isRTL }: { label: string; value: any; isRTL: boolean }) {
 return (
 <div className={`flex`}>
 <span className={`w-40 text-sm font-medium text-gray-500 text-start`}>{label}:</span>
 <span className={`flex-1 text-sm text-gray-900 text-start`}>{value || '-'}</span>
 </div>
 );
}
