import { useState, useRef } from 'react';
import { Plus, Edit, Trash2, Download, X, Activity, Loader2, Save, Upload } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { PreImportPreviewDialog } from '@/components/PreImportPreviewDialog';
import { activitiesImportConfig, validateImportRow, parseExcelToRows } from '@/config/caseManagementImportConfig';

interface ActivitiesServicesProps {
  projectId: number;
}

export function ActivitiesServices({ projectId }: ActivitiesServicesProps) {
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
      toast.success(isRTL ? 'تم إضافة النشاط بنجاح' : 'Activity added successfully');
      setShowAddModal(false);
      resetForm();
    },
    onError: (error) => toast.error(error.message)
  });
  
  const updateMutation = trpc.caseManagement.activities.update.useMutation({
    onSuccess: () => {
      utils.caseManagement.activities.getByProject.invalidate({ projectId });
      toast.success(isRTL ? 'تم تحديث النشاط بنجاح' : 'Activity updated successfully');
      setShowEditModal(false);
      setEditingActivityId(null);
      resetForm();
    },
    onError: (error) => toast.error(error.message)
  });
  
  const deleteMutation = trpc.caseManagement.activities.delete.useMutation({
    onSuccess: () => {
      utils.caseManagement.activities.getByProject.invalidate({ projectId });
      toast.success(isRTL ? 'تم حذف النشاط بنجاح' : 'Activity deleted successfully');
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
      toast.error(isRTL ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
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
        toast.error(isRTL ? 'لم يتم العثور على ورقة عمل' : 'No worksheet found');
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
      toast.error(isRTL ? 'خطأ في قراءة الملف' : 'Error reading file');
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
          toast.error(isRTL ? `لم يتم العثور على الحالة: ${row.data.caseCode}` : `Case not found: ${row.data.caseCode}`);
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
      toast.success(isRTL ? `تم استيراد ${importValidRows.length} نشاط بنجاح` : `Successfully imported ${importValidRows.length} activities`);
      setShowImportPreview(false);
      setImportValidRows([]);
      setImportInvalidRows([]);
    } catch (error) {
      toast.error(isRTL ? 'خطأ في الاستيراد' : 'Import error');
    }
  };

  // Single Export Button
  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(isRTL ? 'الأنشطة والخدمات' : 'Activities & Services');

    worksheet.columns = [
      { header: isRTL ? 'رمز الحالة' : 'Case Code', key: 'caseCode', width: 15 },
      { header: isRTL ? 'رمز المستفيد' : 'Beneficiary Code', key: 'beneficiaryCode', width: 18 },
      { header: isRTL ? 'التاريخ' : 'Date', key: 'activityDate', width: 15 },
      { header: isRTL ? 'نوع النشاط' : 'Activity Type', key: 'activityType', width: 20 },
      { header: isRTL ? 'مقدم الخدمة' : 'Provider', key: 'provider', width: 25 },
      { header: isRTL ? 'ملاحظات' : 'Notes', key: 'notes', width: 40 }
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
    toast.success(isRTL ? 'تم التصدير بنجاح' : 'Export successful');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-gray-600">{isRTL ? 'جاري التحميل...' : 'Loading...'}</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header with Bilingual Support */}
      <div className={`p-6 border-b border-gray-200 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h2 className="text-sm font-semibold text-gray-900">
            {isRTL ? 'الأنشطة والخدمات' : 'Activities & Services'}
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">
            {isRTL ? 'إدارة أنشطة وخدمات الحالات' : 'Manage case activities and services'}
          </p>
        </div>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className={`px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Upload className="w-4 h-4" />
            {isRTL ? 'استيراد' : 'Import'}
          </button>
          <button onClick={handleExportExcel} className={`px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Download className="w-4 h-4" />
            {isRTL ? 'تصدير' : 'Export'}
          </button>
          <button onClick={() => { resetForm(); setShowAddModal(true); }} className={`px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Plus className="w-4 h-4" />
            {isRTL ? 'إضافة نشاط' : 'Add Activity'}
          </button>
        </div>
      </div>

      {/* Activities Table */}
      <div className="overflow-x-auto">
        <table className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                {isRTL ? 'رمز الحالة' : 'Case Code'}
              </th>
              <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                {isRTL ? 'التاريخ' : 'Date'}
              </th>
              <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                {isRTL ? 'نوع النشاط' : 'Activity Type'}
              </th>
              <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                {isRTL ? 'مقدم الخدمة' : 'Provider'}
              </th>
              <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                {isRTL ? 'الإجراءات' : 'Actions'}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(activities || []).length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm">{isRTL ? 'لا توجد أنشطة مسجلة' : 'No activities recorded yet'}</p>
                </td>
              </tr>
            ) : (
              (activities || []).map((act) => (
                <tr key={act.id} className="hover:bg-gray-50">
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {act.caseCode || '-'}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {act.activityDate ? new Date(act.activityDate).toLocaleDateString() : '-'}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {act.activityType}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {act.provider || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : 'justify-start'}`}>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className={`p-6 border-b border-gray-200 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-lg font-semibold text-gray-900">
                {showEditModal 
                  ? (isRTL ? 'تعديل النشاط' : 'Edit Activity') 
                  : (isRTL ? 'إضافة نشاط جديد' : 'Add New Activity')}
              </h3>
              <button onClick={() => { setShowAddModal(false); setShowEditModal(false); setEditingActivityId(null); resetForm(); }} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'الحالة *' : 'Case *'}
                  </label>
                  <select value={formData.caseId} onChange={(e) => setFormData({ ...formData, caseId: Number(e.target.value) })} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                    <option value={0}>{isRTL ? 'اختر الحالة' : 'Select Case'}</option>
                    {(cases || []).map(c => (
                      <option key={c.id} value={c.id}>{c.caseCode} - {c.beneficiaryCode}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'التاريخ *' : 'Date *'}
                  </label>
                  <input type="date" value={formData.activityDate} onChange={(e) => setFormData({ ...formData, activityDate: e.target.value })} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'نوع النشاط *' : 'Activity Type *'}
                  </label>
                  <select value={formData.activityType} onChange={(e) => setFormData({ ...formData, activityType: e.target.value })} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                    <option value="">{isRTL ? 'اختر' : 'Select'}</option>
                    <option value="awareness">{isRTL ? 'جلسة توعية' : 'Awareness Session'}</option>
                    <option value="counseling">{isRTL ? 'استشارة' : 'Counseling'}</option>
                    <option value="health">{isRTL ? 'دعم صحي' : 'Health Support'}</option>
                    <option value="livelihood">{isRTL ? 'دعم سبل العيش' : 'Livelihood Support'}</option>
                    <option value="education">{isRTL ? 'دعم تعليمي' : 'Education Support'}</option>
                    <option value="legal">{isRTL ? 'دعم قانوني' : 'Legal Support'}</option>
                    <option value="other">{isRTL ? 'أخرى' : 'Other'}</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'مقدم الخدمة' : 'Provider'}
                  </label>
                  <input type="text" value={formData.provider} onChange={(e) => setFormData({ ...formData, provider: e.target.value })} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`} />
                </div>
              </div>
              
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {isRTL ? 'ملاحظات' : 'Notes'}
                </label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`} />
              </div>
            </div>
            
            <div className={`p-6 border-t border-gray-200 flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button onClick={showEditModal ? handleEdit : handleAdd} disabled={createMutation.isPending || updateMutation.isPending} className={`px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isRTL ? 'حفظ' : 'Save'}
              </button>
              <button onClick={() => { setShowAddModal(false); setShowEditModal(false); setEditingActivityId(null); resetForm(); }} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md m-4">
            <h3 className={`text-lg font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              {isRTL ? 'تأكيد الحذف' : 'Confirm Delete'}
            </h3>
            <p className={`text-gray-600 mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
              {isRTL ? 'هل أنت متأكد من حذف هذا النشاط؟' : 'Are you sure you want to delete this activity?'}
            </p>
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button onClick={handleDelete} disabled={deleteMutation.isPending} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2">
                {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {isRTL ? 'حذف' : 'Delete'}
              </button>
              <button onClick={() => { setShowDeleteModal(false); setDeletingActivityId(null); }} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                {isRTL ? 'إلغاء' : 'Cancel'}
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
