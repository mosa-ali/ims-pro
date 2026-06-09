import { useState, useRef } from 'react';
import { Plus, Edit, Trash2, Download, X, Activity, Loader2, Save, Upload } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { PreImportPreviewDialog } from '@/components/PreImportPreviewDialog';
import { activitiesImportConfig, validateImportRow, parseExcelToRows } from '@/config/caseManagementImportConfig';
import { useTranslation } from '@/i18n/useTranslation';

interface ActivitiesServicesProps {
 projectId: number;
}

export function ActivitiesServices({
 projectId }: ActivitiesServicesProps) {
 const { t } = useTranslation();
 const { isRTL } = useLanguage();
 const utils = trpc.useUtils();
 
 const [showAddModal, setShowAddModal] = useState(false);
 const [showEditModal, setShowEditModal] = useState(false);
 const [showDeleteModal, setShowDeleteModal] = useState(false);
 const [showImportPreview, setShowImportPreview] = useState(false);
 const [importValidRows, setImportValidRows] = useState<any[]>([]);
 const [importInvalidRows, setImportInvalidRows] = useState<any[]>([]);
 const fileInputRef = useRef<HTMLInputElement>(null);
 const [editingActivityId, setEditingActivityId] = useState<number | null>(null);
 const [deletingActivityId, setDeletingActivityId] = useState<number | null>(null);
 
 const [formData, setFormData] = useState({
 caseId: 0,
 activityDate: new Date().toISOString().split('T')[0],
 activityType: '',
 provider: '',
 notes: ''
 });

 // tRPC queries and mutations
 const { data: activities, isLoading } = trpc.caseManagement.activities.getByProject.useQuery({
 projectId
 });
 
 const { data: cases } = trpc.caseManagement.cases.getByProject.useQuery({
 projectId,
 filters: {}
 });
 
 const createMutation = trpc.caseManagement.activities.create.useMutation({
 onSuccess: () => {
 utils.caseManagement.activities.getByProject.invalidate({ projectId });
 toast.success(t.projectDetail.activityAddedSuccessfully);
 setShowAddModal(false);
 resetForm();
 },
 onError: (error) => toast.error(error.message)
 });
 
 const updateMutation = trpc.caseManagement.activities.update.useMutation({
 onSuccess: () => {
 utils.caseManagement.activities.getByProject.invalidate({ projectId });
 toast.success(t.projectDetail.activityUpdatedSuccessfully);
 setShowEditModal(false);
 setEditingActivityId(null);
 resetForm();
 },
 onError: (error) => toast.error(error.message)
 });
 
 const deleteMutation = trpc.caseManagement.activities.delete.useMutation({
 onSuccess: () => {
 utils.caseManagement.activities.getByProject.invalidate({ projectId });
 toast.success(t.projectDetail.activityDeletedSuccessfully);
 setShowDeleteModal(false);
 setDeletingActivityId(null);
 },
 onError: (error) => toast.error(error.message)
 });

 const resetForm = () => {
 setFormData({
 caseId: 0,
 activityDate: new Date().toISOString().split('T')[0],
 activityType: '',
 provider: '',
 notes: ''
 });
 };

 const handleAdd = () => {
 if (!formData.caseId || !formData.activityDate || !formData.activityType) {
 toast.error(t.projectDetail.pleaseFillRequiredFields);
 return;
 }
 createMutation.mutate({ ...formData, projectId });
 };

 const handleEdit = () => {
 if (!editingActivityId) return;
 updateMutation.mutate({ id: editingActivityId, ...formData });
 };

 const handleDelete = () => {
 if (deletingActivityId) {
 deleteMutation.mutate({ id: deletingActivityId });
 }
 };

 const openEdit = (act: any) => {
 setEditingActivityId(act.id);
 setFormData({
 caseId: act.caseId || 0,
 activityDate: act.activityDate ? new Date(act.activityDate).toISOString().split('T')[0] : '',
 activityType: act.activityType || '',
 provider: act.provider || '',
 notes: act.notes || ''
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

 const rows = parseExcelToRows(data, activitiesImportConfig);
 const validRows: any[] = [];
 const invalidRows: any[] = [];

 rows.forEach((row, index) => {
 const { isValid, errors } = validateImportRow(row, index + 2, activitiesImportConfig, isRTL);
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
 activityDate: row.data.activityDate,
 activityType: row.data.activityType || '',
 provider: row.data.provider || '',
 notes: row.data.notes || ''
 });
 }
 toast.success(`Successfully imported ${importValidRows.length} activities`);
 setShowImportPreview(false);
 setImportValidRows([]);
 setImportInvalidRows([]);
 } catch (error) {
 toast.error(t.projectDetail.importError);
 }
 };

 // Single Export Button
 const handleExportExcel = async () => {
 const workbook = new ExcelJS.Workbook();
 const worksheet = workbook.addWorksheet(t.projectDetail.activitiesServices);

 worksheet.columns = [
 { header: t.projectDetail.caseCode, key: 'caseCode', width: 15 },
 { header: t.projectDetail.beneficiaryCode, key: 'beneficiaryCode', width: 18 },
 { header: t.projectDetail.date, key: 'activityDate', width: 15 },
 { header: t.projectDetail.activityType, key: 'activityType', width: 20 },
 { header: t.projectDetail.provider, key: 'provider', width: 25 },
 { header: t.projectDetail.notes, key: 'notes', width: 40 }
 ];

 worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
 worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };

 (activities || []).forEach(act => {
 worksheet.addRow({
 caseCode: act.caseCode || '',
 beneficiaryCode: act.beneficiaryCode || '',
 activityDate: act.activityDate ? new Date(act.activityDate).toISOString().split('T')[0] : '',
 activityType: act.activityType,
 provider: act.provider || '',
 notes: act.notes || ''
 });
 });

 const buffer = await workbook.xlsx.writeBuffer();
 const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
 saveAs(blob, `Activities_Services_${new Date().toISOString().split('T')[0]}.xlsx`);
 toast.success(t.projectDetail.exportSuccessful);
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
 {t.projectDetail.activitiesServices}
 </h2>
 <p className="text-xs text-gray-600 mt-0.5">
 {t.projectDetail.manageCaseActivitiesAndServices}
 </p>
 </div>
 <div className={`flex items-center gap-2`}>
 <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
 <button onClick={() => fileInputRef.current?.click()} className={`px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2`}>
 <Upload className="w-4 h-4" />
 {t.projectDetail.import}
 </button>
 <button onClick={handleExportExcel} className={`px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2`}>
 <Download className="w-4 h-4" />
 {t.projectDetail.export}
 </button>
 <button onClick={() => { resetForm(); setShowAddModal(true); }} className={`px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2`}>
 <Plus className="w-4 h-4" />
 {t.projectDetail.addActivity}
 </button>
 </div>
 </div>

 {/* Activities Table */}
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider text-start`}>
 {t.projectDetail.caseCode}
 </th>
 <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider text-start`}>
 {t.projectDetail.date}
 </th>
 <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider text-start`}>
 {t.projectDetail.activityType}
 </th>
 <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider text-start`}>
 {t.projectDetail.provider}
 </th>
 <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider text-start`}>
 {t.projectDetail.actions}
 </th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-gray-200">
 {(activities || []).length === 0 ? (
 <tr>
 <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
 <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
 <p className="text-sm">{t.projectDetail.noActivitiesRecordedYet}</p>
 </td>
 </tr>
 ) : (
 (activities || []).map((act) => (
 <tr key={act.id} className="hover:bg-gray-50">
 <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-start`}>
 {act.caseCode || '-'}
 </td>
 <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-start`}>
 {act.activityDate ? new Date(act.activityDate).toLocaleDateString() : '-'}
 </td>
 <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-start`}>
 {act.activityType}
 </td>
 <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-start`}>
 {act.provider || '-'}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-center">
 <div className={`flex items-center gap-2 justify-start`}>
 <button onClick={() => openEdit(act)} className="p-1 text-amber-600 hover:bg-amber-50 rounded">
 <Edit className="w-4 h-4" />
 </button>
 <button onClick={() => { setDeletingActivityId(act.id); setShowDeleteModal(true); }} className="p-1 text-red-600 hover:bg-red-50 rounded">
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

 {/* Add/Edit Modal */}
 {(showAddModal || showEditModal) && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50">
 <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
 <div className={`p-6 border-b border-gray-200 flex items-center justify-between`}>
 <h3 className="text-lg font-semibold text-gray-900">
 {showEditModal 
 ? (t.projectDetail.editActivity) 
 : (t.projectDetail.addNewActivity)}
 </h3>
 <button onClick={() => { setShowAddModal(false); setShowEditModal(false); setEditingActivityId(null); resetForm(); }} className="p-2 hover:bg-gray-100 rounded-full">
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
 {t.projectDetail.date24}
 </label>
 <input type="date" value={formData.activityDate} onChange={(e) => setFormData({ ...formData, activityDate: e.target.value })} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-start`} />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.activityType25}
 </label>
 <select value={formData.activityType} onChange={(e) => setFormData({ ...formData, activityType: e.target.value })} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-start`}>
 <option value="">{t.projectDetail.select}</option>
 <option value="awareness">{t.projectDetail.awarenessSession}</option>
 <option value="counseling">{t.projectDetail.counseling}</option>
 <option value="health">{t.projectDetail.healthSupport}</option>
 <option value="livelihood">{t.projectDetail.livelihoodSupport}</option>
 <option value="education">{t.projectDetail.educationSupport}</option>
 <option value="legal">{t.projectDetail.legalSupport}</option>
 <option value="other">{t.projectDetail.other}</option>
 </select>
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.provider}
 </label>
 <input type="text" value={formData.provider} onChange={(e) => setFormData({ ...formData, provider: e.target.value })} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-start`} />
 </div>
 </div>
 
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.notes}
 </label>
 <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-start`} />
 </div>
 </div>
 
 <div className={`p-6 border-t border-gray-200 flex items-center gap-3`}>
 <button onClick={showEditModal ? handleEdit : handleAdd} disabled={createMutation.isPending || updateMutation.isPending} className={`px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2`}>
 {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
 {t.projectDetail.save}
 </button>
 <button onClick={() => { setShowAddModal(false); setShowEditModal(false); setEditingActivityId(null); resetForm(); }} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
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
 {t.projectDetail.areYouSureYouWantTo26}
 </p>
 <div className={`flex items-center gap-3`}>
 <button onClick={handleDelete} disabled={deleteMutation.isPending} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2">
 {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
 {t.projectDetail.delete}
 </button>
 <button onClick={() => { setShowDeleteModal(false); setDeletingActivityId(null); }} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
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
 columns={activitiesImportConfig.columns.map(col => ({ key: col.key, label: isRTL ? col.labelAr : col.label }))}
 moduleName={isRTL ? activitiesImportConfig.moduleNameAr : activitiesImportConfig.moduleName}
 />
 </div>
 );
}
