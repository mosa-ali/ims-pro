import { useState, useRef } from 'react';
import { Plus, Edit, Trash2, Download, X, ArrowRightLeft, Loader2, Save, CheckSquare, Square, FileSpreadsheet, FileText, ChevronDown, Upload } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { PreImportPreviewDialog } from '@/components/PreImportPreviewDialog';
import { referralsImportConfig, validateImportRow, parseExcelToRows } from '@/config/caseManagementImportConfig';
import { useTranslation } from '@/i18n/useTranslation';
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ReferralsProps {
 projectId: number;
}

export function Referrals({
 projectId }: ReferralsProps) {
 const { t } = useTranslation();
 const { isRTL } = useLanguage();
 const utils = trpc.useUtils();
 
 const [showAddModal, setShowAddModal] = useState(false);
 const [showEditModal, setShowEditModal] = useState(false);
 const [showDeleteModal, setShowDeleteModal] = useState(false);
 const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
 const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
 const [showExportModal, setShowExportModal] = useState(false);
 const [showImportPreview, setShowImportPreview] = useState(false);
 const [importValidRows, setImportValidRows] = useState<any[]>([]);
 const [importInvalidRows, setImportInvalidRows] = useState<any[]>([]);
 const fileInputRef = useRef<HTMLInputElement>(null);
 const [editingReferralId, setEditingReferralId] = useState<number | null>(null);
 const [deletingReferralId, setDeletingReferralId] = useState<number | null>(null);
 const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
 const [bulkStatus, setBulkStatus] = useState('pending');
 
 const [formData, setFormData] = useState({
 caseId: 0,
 referralDate: new Date().toISOString().split('T')[0],
 referralType: 'internal',
 receivingOrganization: '',
 serviceRequired: '',
 focalPoint: '',
 focalPointContact: '',
 status: 'pending',
 followUpDate: '',
 consentObtained: false
 });

 // tRPC queries and mutations
 const { data: referrals, isLoading } = trpc.caseManagement.referrals.getByProject.useQuery({
 projectId
 });
 
 const { data: cases } = trpc.caseManagement.cases.getByProject.useQuery({
 projectId,
 filters: {}
 });
 
 const createMutation = trpc.caseManagement.referrals.create.useMutation({
 onSuccess: () => {
 utils.caseManagement.referrals.getByProject.invalidate({ projectId });
 toast.success(t.projectDetail.referralAddedSuccessfully);
 setShowAddModal(false);
 resetForm();
 },
 onError: (error) => toast.error(error.message)
 });
 
 const updateMutation = trpc.caseManagement.referrals.update.useMutation({
 onSuccess: () => {
 utils.caseManagement.referrals.getByProject.invalidate({ projectId });
 toast.success(t.projectDetail.referralUpdatedSuccessfully);
 setShowEditModal(false);
 setEditingReferralId(null);
 resetForm();
 },
 onError: (error) => toast.error(error.message)
 });
 
 const deleteMutation = trpc.caseManagement.referrals.delete.useMutation({
 onSuccess: () => {
 utils.caseManagement.referrals.getByProject.invalidate({ projectId });
 toast.success(t.projectDetail.referralDeletedSuccessfully);
 setShowDeleteModal(false);
 setDeletingReferralId(null);
 },
 onError: (error) => toast.error(error.message)
 });

 const resetForm = () => {
 setFormData({
 caseId: 0,
 referralDate: new Date().toISOString().split('T')[0],
 referralType: 'internal',
 receivingOrganization: '',
 serviceRequired: '',
 focalPoint: '',
 focalPointContact: '',
 status: 'pending',
 followUpDate: '',
 consentObtained: false
 });
 };

 // Bulk Selection
 const toggleSelectAll = () => {
 if (selectedIds.size === (referrals || []).length) {
 setSelectedIds(new Set());
 } else {
 setSelectedIds(new Set((referrals || []).map(r => r.id)));
 }
 };

 const toggleSelect = (id: number) => {
 const newSelected = new Set(selectedIds);
 if (newSelected.has(id)) {
 newSelected.delete(id);
 } else {
 newSelected.add(id);
 }
 setSelectedIds(newSelected);
 };

 // Bulk Operations
 const handleBulkDelete = async () => {
 const ids = Array.from(selectedIds);
 let successCount = 0;
 
 for (const id of ids) {
 try {
 await deleteMutation.mutateAsync({ id });
 successCount++;
 } catch (error) {
 console.error(`Failed to delete referral ${id}:`, error);
 }
 }
 
 setSelectedIds(new Set());
 setShowBulkDeleteModal(false);
 toast.success(`Successfully deleted ${successCount} referrals`
 );
 };

 const handleBulkStatusUpdate = async () => {
 const ids = Array.from(selectedIds);
 let successCount = 0;
 
 for (const id of ids) {
 try {
 await updateMutation.mutateAsync({ id, status: bulkStatus });
 successCount++;
 } catch (error) {
 console.error(`Failed to update referral ${id}:`, error);
 }
 }
 
 setSelectedIds(new Set());
 setShowBulkStatusModal(false);
 toast.success(`Successfully updated status for ${successCount} referrals`
 );
 };

 const handleAdd = () => {
 if (!formData.caseId || !formData.referralDate || !formData.receivingOrganization || !formData.serviceRequired) {
 toast.error(t.projectDetail.pleaseFillRequiredFields);
 return;
 }
 
 if (!formData.consentObtained) {
 toast.error(t.projectDetail.beneficiaryConsentIsRequired);
 return;
 }

 createMutation.mutate({ ...formData, projectId });
 };

 const handleEdit = () => {
 if (!editingReferralId) return;
 updateMutation.mutate({ id: editingReferralId, ...formData });
 };

 const handleDelete = () => {
 if (deletingReferralId) {
 deleteMutation.mutate({ id: deletingReferralId });
 }
 };

 const openEdit = (ref: any) => {
 setEditingReferralId(ref.id);
 setFormData({
 caseId: ref.caseId || 0,
 referralDate: ref.referralDate ? new Date(ref.referralDate).toISOString().split('T')[0] : '',
 referralType: ref.referralType || 'internal',
 receivingOrganization: ref.receivingOrganization || '',
 serviceRequired: ref.serviceRequired || '',
 focalPoint: ref.focalPoint || '',
 focalPointContact: ref.focalPointContact || '',
 status: ref.status || 'pending',
 followUpDate: ref.followUpDate ? new Date(ref.followUpDate).toISOString().split('T')[0] : '',
 consentObtained: ref.consentObtained || false
 });
 setShowEditModal(true);
 };

 // Import handler
 const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0];
 if (!file) return;

 try {
 const workbook = new ExcelJS.Workbook();
 await workbook.xlsx.load(await file.arrayBuffer());
 const worksheet = workbook.worksheets[0];
 
 if (!worksheet) {
 toast.error(t.projectDetail.noWorksheetFound);
 return;
 }

 const data: any[][] = [];
 worksheet.eachRow((row) => {
 const rowData: any[] = [];
 row.eachCell({ includeEmpty: true }, (cell) => {
 rowData.push(cell.value);
 });
 data.push(rowData);
 });

 const rows = parseExcelToRows(data, referralsImportConfig);
 const validRows: any[] = [];
 const invalidRows: any[] = [];

 rows.forEach((row, index) => {
 const { isValid, errors } = validateImportRow(row, index + 2, referralsImportConfig, isRTL);
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

 if (fileInputRef.current) {
 fileInputRef.current.value = '';
 }
 };

 const handleConfirmImport = async () => {
 try {
 for (const row of importValidRows) {
 const matchingCase = (cases || []).find(c => c.caseCode === row.data.caseCode);
 if (!matchingCase) {
 toast.error(`Case not found: ${row.data.caseCode}`);
 continue;
 }

 await createMutation.mutateAsync({
 projectId,
 caseId: matchingCase.id,
 referralDate: row.data.referralDate,
 referralType: row.data.referralType || 'internal',
 receivingOrganization: row.data.receivingOrganization || '',
 serviceRequired: row.data.serviceRequired || '',
 focalPoint: row.data.focalPoint || '',
 focalPointContact: row.data.focalPointContact || '',
 status: row.data.status || 'pending',
 followUpDate: row.data.followUpDate || '',
 consentObtained: row.data.consentObtained === 'Yes' || row.data.consentObtained === 'نعم' || row.data.consentObtained === true
 });
 }
 toast.success(`Successfully imported ${importValidRows.length} referrals`);
 setShowImportPreview(false);
 setImportValidRows([]);
 setImportInvalidRows([]);
 } catch (error) {
 toast.error(t.projectDetail.importError);
 }
 };

 // Export Functions
 const handleExportExcel = async (selectedOnly: boolean = false) => {
 const dataToExport = selectedOnly 
 ? (referrals || []).filter(r => selectedIds.has(r.id))
 : (referrals || []);
 
 const workbook = new ExcelJS.Workbook();
 const worksheet = workbook.addWorksheet(t.projectDetail.referrals);

 worksheet.columns = [
 { header: t.projectDetail.caseCode, key: 'caseCode', width: 15 },
 { header: t.projectDetail.beneficiaryCode, key: 'beneficiaryCode', width: 18 },
 { header: t.projectDetail.referralDate, key: 'referralDate', width: 15 },
 { header: t.projectDetail.referralType, key: 'referralType', width: 15 },
 { header: t.projectDetail.receivingOrganization, key: 'receivingOrganization', width: 25 },
 { header: t.projectDetail.serviceRequired, key: 'serviceRequired', width: 25 },
 { header: t.projectDetail.focalPoint, key: 'focalPoint', width: 20 },
 { header: t.projectDetail.status, key: 'status', width: 12 },
 { header: t.projectDetail.followupDate, key: 'followUpDate', width: 15 },
 { header: t.projectDetail.consent, key: 'consentObtained', width: 12 }
 ];

 worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
 worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };

 dataToExport.forEach(ref => {
 worksheet.addRow({
 caseCode: ref.caseCode || '',
 beneficiaryCode: ref.beneficiaryCode || '',
 referralDate: ref.referralDate ? new Date(ref.referralDate).toISOString().split('T')[0] : '',
 referralType: ref.referralType,
 receivingOrganization: ref.receivingOrganization || '',
 serviceRequired: ref.serviceRequired || '',
 focalPoint: ref.focalPoint || '',
 status: ref.status,
 followUpDate: ref.followUpDate ? new Date(ref.followUpDate).toISOString().split('T')[0] : '',
 consentObtained: ref.consentObtained ? (t.projectDetail.yes) : (t.projectDetail.no)
 });
 });

 const buffer = await workbook.xlsx.writeBuffer();
 const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
 saveAs(blob, `Referrals_${new Date().toISOString().split('T')[0]}.xlsx`);
 toast.success(t.projectDetail.exportSuccessful);
 setShowExportModal(false);
 };

 const handleExportCSV = async (selectedOnly: boolean = false) => {
 const dataToExport = selectedOnly 
 ? (referrals || []).filter(r => selectedIds.has(r.id))
 : (referrals || []);
 
 const headers = [
 'Case Code', 'Beneficiary Code', 'Referral Date', 'Type', 
 'Receiving Organization', 'Service Required', 'Focal Point', 
 'Status', 'Follow-up Date', 'Consent'
 ];
 
 const rows = dataToExport.map(ref => [
 ref.caseCode || '',
 ref.beneficiaryCode || '',
 ref.referralDate ? new Date(ref.referralDate).toISOString().split('T')[0] : '',
 ref.referralType,
 ref.receivingOrganization || '',
 ref.serviceRequired || '',
 ref.focalPoint || '',
 ref.status,
 ref.followUpDate ? new Date(ref.followUpDate).toISOString().split('T')[0] : '',
 ref.consentObtained ? 'Yes' : 'No'
 ]);
 
 const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
 const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
 saveAs(blob, `Referrals_${new Date().toISOString().split('T')[0]}.csv`);
 toast.success(t.projectDetail.exportSuccessful);
 setShowExportModal(false);
 };

 const downloadTemplate = () => {
 const headers = [
 'Case Code', 'Referral Date (YYYY-MM-DD)', 'Type (internal/external)', 
 'Receiving Organization', 'Service Required', 'Focal Point', 
 'Focal Point Contact', 'Status (pending/accepted/completed/rejected)', 
 'Follow-up Date (YYYY-MM-DD)', 'Consent Obtained (yes/no)'
 ];
 
 const csvContent = headers.join(',');
 const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
 saveAs(blob, 'Referrals_Import_Template.csv');
 toast.success(t.projectDetail.templateDownloaded);
 setShowExportModal(false);
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
 {t.projectDetail.referrals}
 </h2>
 <p className="text-xs text-gray-600 mt-0.5">
 {t.projectDetail.manageInternalAndExternalReferrals}
 </p>
 </div>
 <div className={`flex items-center gap-2`}>
 {/* Bulk Actions Dropdown */}
 {selectedIds.size > 0 && (
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <button className="px-4 py-2 text-sm bg-orange-500 text-white rounded-md hover:bg-orange-600 flex items-center gap-2">
 {`Actions (${selectedIds.size})`}
 <ChevronDown className="w-4 h-4" />
 </button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end">
 <DropdownMenuItem onClick={() => handleExportExcel(true)}>
 <Download className="w-4 h-4 me-2" />
 {t.projectDetail.exportSelected}
 </DropdownMenuItem>
 <DropdownMenuItem onClick={() => setShowBulkStatusModal(true)}>
 <Edit className="w-4 h-4 me-2" />
 {t.projectDetail.changeStatus}
 </DropdownMenuItem>
 <DropdownMenuItem onClick={() => setShowBulkDeleteModal(true)} className="text-red-600">
 <Trash2 className="w-4 h-4 me-2" />
 {t.projectDetail.deleteSelected}
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 )}
 
 {/* Import Button */}
 <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
 <button onClick={() => fileInputRef.current?.click()} className={`px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2`}>
 <Upload className="w-4 h-4" />
 {t.projectDetail.import}
 </button>
 {/* Single Export Button */}
 <button onClick={() => setShowExportModal(true)} className={`px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2`}>
 <Download className="w-4 h-4" />
 {t.projectDetail.export}
 </button>
 <button onClick={() => { resetForm(); setShowAddModal(true); }} className={`px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2`}>
 <Plus className="w-4 h-4" />
 {t.projectDetail.addReferral}
 </button>
 </div>
 </div>

 {/* Referrals Table */}
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className="px-4 py-3 w-10">
 <button onClick={toggleSelectAll} className="p-1 hover:bg-gray-200 rounded">
 {selectedIds.size === (referrals || []).length && (referrals || []).length > 0 
 ? <CheckSquare className="w-4 h-4 text-primary" /> 
 : <Square className="w-4 h-4 text-gray-400" />
 }
 </button>
 </th>
 <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider text-start`}>
 {t.projectDetail.caseCode}
 </th>
 <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider text-start`}>
 {t.projectDetail.date}
 </th>
 <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider text-start`}>
 {t.projectDetail.type38}
 </th>
 <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider text-start`}>
 {t.projectDetail.receivingOrg}
 </th>
 <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider text-start`}>
 {t.projectDetail.service}
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
 {(referrals || []).length === 0 ? (
 <tr>
 <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
 <ArrowRightLeft className="w-12 h-12 mx-auto mb-4 text-gray-300" />
 <p className="text-sm">{t.projectDetail.noReferralsRecordedYet}</p>
 </td>
 </tr>
 ) : (
 (referrals || []).map((ref) => (
 <tr key={ref.id} className={`hover:bg-gray-50 ${selectedIds.has(ref.id) ? 'bg-blue-50' : ''}`}>
 <td className="px-4 py-4">
 <button onClick={() => toggleSelect(ref.id)} className="p-1 hover:bg-gray-200 rounded">
 {selectedIds.has(ref.id) 
 ? <CheckSquare className="w-4 h-4 text-primary" /> 
 : <Square className="w-4 h-4 text-gray-400" />
 }
 </button>
 </td>
 <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-start`}>
 {ref.caseCode || '-'}
 </td>
 <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-start`}>
 {ref.referralDate ? new Date(ref.referralDate).toLocaleDateString() : '-'}
 </td>
 <td className={`px-6 py-4 whitespace-nowrap text-sm text-start`}>
 <span className={`px-2 py-1 rounded-full text-xs font-medium ${ ref.referralType === 'internal' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700' }`}>
 {ref.referralType === 'internal' 
 ? (t.projectDetail.internal) 
 : (t.projectDetail.external)}
 </span>
 </td>
 <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-start`}>
 {ref.receivingOrganization || '-'}
 </td>
 <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-start`}>
 {ref.serviceRequired || '-'}
 </td>
 <td className={`px-6 py-4 whitespace-nowrap text-sm text-start`}>
 <StatusBadge status={ref.status || ''} isRTL={isRTL} />
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-center">
 <div className={`flex items-center gap-2 justify-start`}>
 <button onClick={() => openEdit(ref)} className="p-1 text-amber-600 hover:bg-amber-50 rounded">
 <Edit className="w-4 h-4" />
 </button>
 <button onClick={() => { setDeletingReferralId(ref.id); setShowDeleteModal(true); }} className="p-1 text-red-600 hover:bg-red-50 rounded">
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
 </h3>
 <div className="space-y-3">
 <button
 onClick={() => handleExportExcel(false)}
 className="w-full px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-3"
 >
 <FileSpreadsheet className="w-5 h-5 text-green-600" />
 <div className={'text-start'}>
 <p className="font-medium text-gray-900">Export Excel (.xlsx)</p>
 <p className="text-xs text-gray-500">{t.projectDetail.exportCurrentData}</p>
 </div>
 </button>
 <button
 onClick={() => handleExportCSV(false)}
 className="w-full px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-3"
 >
 <FileText className="w-5 h-5 text-blue-600" />
 <div className={'text-start'}>
 <p className="font-medium text-gray-900">Export CSV</p>
 <p className="text-xs text-gray-500">{t.projectDetail.forCompatibilityWithOtherSoftware}</p>
 </div>
 </button>
 <button
 onClick={downloadTemplate}
 className="w-full px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-3"
 >
 <Download className="w-5 h-5 text-purple-600" />
 <div className={'text-start'}>
 <p className="font-medium text-gray-900">{t.projectDetail.downloadImportTemplate}</p>
 <p className="text-xs text-gray-500">{t.projectDetail.emptyTemplateForDataImport}</p>
 </div>
 </button>
 </div>
 <button
 onClick={() => setShowExportModal(false)}
 className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
 >
 {t.projectDetail.cancel}
 </button>
 </div>
 </div>
 )}

 {/* Bulk Status Modal */}
 {showBulkStatusModal && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50">
 <div className="bg-white rounded-lg shadow-xl p-6 max-w-md m-4">
 <h3 className={`text-lg font-semibold text-gray-900 mb-4 text-start`}>
 {t.projectDetail.changeStatusForSelectedReferrals}
 </h3>
 <p className={`text-gray-600 mb-4 text-start`}>
 {`This will update status for ${selectedIds.size} referrals`}
 </p>
 <select
 value={bulkStatus}
 onChange={(e) => setBulkStatus(e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
 >
 <option value="pending">{t.projectDetail.pending}</option>
 <option value="accepted">{t.projectDetail.accepted}</option>
 <option value="completed">{t.projectDetail.completed}</option>
 <option value="rejected">{t.projectDetail.rejected}</option>
 </select>
 <div className={`flex items-center gap-3`}>
 <button
 onClick={handleBulkStatusUpdate}
 className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
 >
 {t.projectDetail.update}
 </button>
 <button
 onClick={() => setShowBulkStatusModal(false)}
 className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
 >
 {t.projectDetail.cancel}
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Bulk Delete Modal */}
 {showBulkDeleteModal && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50">
 <div className="bg-white rounded-lg shadow-xl p-6 max-w-md m-4">
 <h3 className={`text-lg font-semibold text-gray-900 mb-4 text-start`}>
 {t.projectDetail.confirmBulkDelete48}
 </h3>
 <p className={`text-gray-600 mb-6 text-start`}>
 {`Are you sure you want to delete ${selectedIds.size} referrals? This action cannot be undone.`}
 </p>
 <div className={`flex items-center gap-3`}>
 <button
 onClick={handleBulkDelete}
 className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
 >
 {t.projectDetail.delete}
 </button>
 <button
 onClick={() => setShowBulkDeleteModal(false)}
 className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
 >
 {t.projectDetail.cancel}
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Add/Edit Modal */}
 {(showAddModal || showEditModal) && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50">
 <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
 <div className={`p-6 border-b border-gray-200 flex items-center justify-between`}>
 <h3 className="text-lg font-semibold text-gray-900">
 {showEditModal 
 ? (t.projectDetail.editReferral) 
 : (t.projectDetail.addNewReferral)}
 </h3>
 <button onClick={() => { setShowAddModal(false); setShowEditModal(false); setEditingReferralId(null); resetForm(); }} className="p-2 hover:bg-gray-100 rounded-full">
 <X className="w-5 h-5" />
 </button>
 </div>
 
 <div className="p-6 space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.case}
 </label>
 <select value={formData.caseId} onChange={(e) => setFormData({ ...formData, caseId: Number(e.target.value) })} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-start`}>
 <option value={0}>{t.projectDetail.selectCase}</option>
 {(cases || []).map(c => (
 <option key={c.id} value={c.id}>{c.caseCode} - {c.beneficiaryCode}</option>
 ))}
 </select>
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.referralDate49}
 </label>
 <input type="date" value={formData.referralDate} onChange={(e) => setFormData({ ...formData, referralDate: e.target.value })} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-start`} />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.referralType}
 </label>
 <select value={formData.referralType} onChange={(e) => setFormData({ ...formData, referralType: e.target.value })} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-start`}>
 <option value="internal">{t.projectDetail.internal}</option>
 <option value="external">{t.projectDetail.external}</option>
 </select>
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.receivingOrganization50}
 </label>
 <input type="text" value={formData.receivingOrganization} onChange={(e) => setFormData({ ...formData, receivingOrganization: e.target.value })} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-start`} />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.serviceRequired51}
 </label>
 <input type="text" value={formData.serviceRequired} onChange={(e) => setFormData({ ...formData, serviceRequired: e.target.value })} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-start`} />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.focalPoint}
 </label>
 <input type="text" value={formData.focalPoint} onChange={(e) => setFormData({ ...formData, focalPoint: e.target.value })} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-start`} />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.contactNumber}
 </label>
 <input type="text" value={formData.focalPointContact} onChange={(e) => setFormData({ ...formData, focalPointContact: e.target.value })} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-start`} />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.status}
 </label>
 <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-start`}>
 <option value="pending">{t.projectDetail.pending}</option>
 <option value="accepted">{t.projectDetail.accepted}</option>
 <option value="completed">{t.projectDetail.completed}</option>
 <option value="rejected">{t.projectDetail.rejected}</option>
 </select>
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.followupDate}
 </label>
 <input type="date" value={formData.followUpDate} onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-start`} />
 </div>
 </div>
 
 <div className={`flex items-center gap-2`}>
 <input type="checkbox" id="consent" checked={formData.consentObtained} onChange={(e) => setFormData({ ...formData, consentObtained: e.target.checked })} className="w-4 h-4 text-primary border-gray-300 rounded" />
 <label htmlFor="consent" className="text-sm text-gray-700">
 {t.projectDetail.beneficiaryConsentObtained}
 </label>
 </div>
 </div>
 
 <div className={`p-6 border-t border-gray-200 flex items-center gap-3`}>
 <button onClick={showEditModal ? handleEdit : handleAdd} disabled={createMutation.isPending || updateMutation.isPending} className={`px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2`}>
 {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
 {t.projectDetail.save}
 </button>
 <button onClick={() => { setShowAddModal(false); setShowEditModal(false); setEditingReferralId(null); resetForm(); }} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
 {t.projectDetail.cancel}
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Delete Confirmation Modal */}
 {showDeleteModal && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50">
 <div className="bg-white rounded-lg shadow-xl p-6 max-w-md m-4">
 <h3 className={`text-lg font-semibold text-gray-900 mb-4 text-start`}>
 {t.projectDetail.confirmDelete}
 </h3>
 <p className={`text-gray-600 mb-6 text-start`}>
 {t.projectDetail.areYouSureYouWantTo52}
 </p>
 <div className={`flex items-center gap-3`}>
 <button onClick={handleDelete} disabled={deleteMutation.isPending} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2">
 {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
 {t.projectDetail.delete}
 </button>
 <button onClick={() => { setShowDeleteModal(false); setDeletingReferralId(null); }} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
 {t.projectDetail.cancel}
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Pre-Import Preview Dialog */}
 <PreImportPreviewDialog
 open={showImportPreview}
 onClose={() => { setShowImportPreview(false); setImportValidRows([]); setImportInvalidRows([]); }}
 onConfirmImport={handleConfirmImport}
 validRows={importValidRows}
 invalidRows={importInvalidRows}
 columns={referralsImportConfig.columns.map(col => ({ key: col.key, label: isRTL ? col.labelAr : col.label }))}
 moduleName={isRTL ? referralsImportConfig.moduleNameAr : referralsImportConfig.moduleName}
 />
 </div>
 );
}

// Helper Components
function StatusBadge({
 status, isRTL }: { status: string; isRTL: boolean }) {
 const colors = {
 pending: 'bg-yellow-100 text-yellow-700',
 accepted: 'bg-blue-100 text-blue-700',
 completed: 'bg-green-100 text-green-700',
 rejected: 'bg-red-100 text-red-700'
 };
 
 const labels = {
 pending: t.projectDetail.pending,
 accepted: t.projectDetail.accepted,
 completed: t.projectDetail.completed,
 rejected: t.projectDetail.rejected
 };
 
 return (
 <span className={`px-2 py-1 ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700'} text-xs font-medium rounded-full`}>
 {labels[status as keyof typeof labels] || status}
 </span>
 );
}
