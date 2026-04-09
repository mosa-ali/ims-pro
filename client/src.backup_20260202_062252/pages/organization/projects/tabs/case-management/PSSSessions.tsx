import { useState, useRef } from 'react';
import { Plus, Edit, Trash2, Download, X, Calendar, Loader2, Save, Upload } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatNumber } from '@/utils/formatters';
import { trpc } from '@/lib/trpc';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { PreImportPreviewDialog } from '@/components/PreImportPreviewDialog';
import { pssSessionsImportConfig, validateImportRow, parseExcelToRows } from '@/config/caseManagementImportConfig';

interface PSSSessionsProps {
  projectId: number;
}

export function PSSSessions({ projectId }: PSSSessionsProps) {
  const { isRTL } = useLanguage();
  const utils = trpc.useUtils();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [importValidRows, setImportValidRows] = useState<any[]>([]);
  const [importInvalidRows, setImportInvalidRows] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    caseId: 0,
    sessionDate: new Date().toISOString().split('T')[0],
    sessionType: 'individual',
    pssApproach: '',
    facilitatorName: '',
    duration: 60,
    keyObservations: '',
    beneficiaryResponse: '',
    nextSessionDate: ''
  });

  // tRPC queries and mutations
  const { data: sessions, isLoading } = trpc.caseManagement.pssSessions.getByProject.useQuery({
    projectId
  });
  
  const { data: cases } = trpc.caseManagement.cases.getByProject.useQuery({
    projectId,
    filters: {}
  });
  
  const createMutation = trpc.caseManagement.pssSessions.create.useMutation({
    onSuccess: () => {
      utils.caseManagement.pssSessions.getByProject.invalidate({ projectId });
      toast.success(isRTL ? 'تم إضافة الجلسة بنجاح' : 'Session added successfully');
      setShowAddModal(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
  
  const updateMutation = trpc.caseManagement.pssSessions.update.useMutation({
    onSuccess: () => {
      utils.caseManagement.pssSessions.getByProject.invalidate({ projectId });
      toast.success(isRTL ? 'تم تحديث الجلسة بنجاح' : 'Session updated successfully');
      setShowEditModal(false);
      setEditingSessionId(null);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
  
  const deleteMutation = trpc.caseManagement.pssSessions.delete.useMutation({
    onSuccess: () => {
      utils.caseManagement.pssSessions.getByProject.invalidate({ projectId });
      toast.success(isRTL ? 'تم حذف الجلسة بنجاح' : 'Session deleted successfully');
      setShowDeleteModal(false);
      setDeletingSessionId(null);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const resetForm = () => {
    setFormData({
      caseId: 0,
      sessionDate: new Date().toISOString().split('T')[0],
      sessionType: 'individual',
      pssApproach: '',
      facilitatorName: '',
      duration: 60,
      keyObservations: '',
      beneficiaryResponse: '',
      nextSessionDate: ''
    });
  };

  const handleAdd = () => {
    if (!formData.caseId || !formData.sessionDate || !formData.sessionType) {
      toast.error(isRTL ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
      return;
    }

    createMutation.mutate({
      ...formData,
      projectId
    });
  };

  const handleEdit = () => {
    if (!editingSessionId) return;
    
    updateMutation.mutate({
      id: editingSessionId,
      ...formData
    });
  };

  const handleDelete = () => {
    if (deletingSessionId !== null) {
      deleteMutation.mutate({ id: deletingSessionId });
    }
  };

  const openEdit = (session: any) => {
    setEditingSessionId(session.id);
    setFormData({
      caseId: session.caseId,
      sessionDate: session.sessionDate ? new Date(session.sessionDate).toISOString().split('T')[0] : '',
      sessionType: session.sessionType || 'individual',
      pssApproach: session.pssApproach || '',
      facilitatorName: session.facilitatorName || '',
      duration: session.duration || 60,
      keyObservations: session.keyObservations || '',
      beneficiaryResponse: session.beneficiaryResponse || '',
      nextSessionDate: session.nextSessionDate ? new Date(session.nextSessionDate).toISOString().split('T')[0] : ''
    });
    setShowEditModal(true);
  };

  const openDelete = (sessionId: number) => {
    setDeletingSessionId(sessionId);
    setShowDeleteModal(true);
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

      // Convert worksheet to array
      const data: any[][] = [];
      worksheet.eachRow((row, rowNumber) => {
        const rowData: any[] = [];
        row.eachCell({ includeEmpty: true }, (cell) => {
          rowData.push(cell.value);
        });
        data.push(rowData);
      });

      // Parse and validate rows
      const rows = parseExcelToRows(data, pssSessionsImportConfig);
      const validRows: any[] = [];
      const invalidRows: any[] = [];

      rows.forEach((row, index) => {
        const { isValid, errors } = validateImportRow(row, index + 2, pssSessionsImportConfig, isRTL);
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

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    try {
      for (const row of importValidRows) {
        // Find case by caseCode
        const matchingCase = (cases || []).find(c => c.caseCode === row.data.caseCode);
        if (!matchingCase) {
          toast.error(isRTL ? `لم يتم العثور على الحالة: ${row.data.caseCode}` : `Case not found: ${row.data.caseCode}`);
          continue;
        }

        await createMutation.mutateAsync({
          projectId,
          caseId: matchingCase.id,
          sessionDate: row.data.sessionDate,
          sessionType: row.data.sessionType || 'individual',
          pssApproach: row.data.pssApproach || '',
          facilitatorName: row.data.facilitatorName || '',
          duration: row.data.duration || 60,
          keyObservations: row.data.notes || '',
          beneficiaryResponse: '',
          nextSessionDate: ''
        });
      }
      toast.success(isRTL ? `تم استيراد ${importValidRows.length} جلسة بنجاح` : `Successfully imported ${importValidRows.length} sessions`);
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
    const worksheet = workbook.addWorksheet(isRTL ? 'جلسات الدعم النفسي' : 'PSS Sessions');

    // Define columns with bilingual headers
    worksheet.columns = [
      { header: isRTL ? 'رمز الحالة' : 'Case Code', key: 'caseCode', width: 15 },
      { header: isRTL ? 'رمز المستفيد' : 'Beneficiary Code', key: 'beneficiaryCode', width: 18 },
      { header: isRTL ? 'تاريخ الجلسة' : 'Session Date', key: 'sessionDate', width: 15 },
      { header: isRTL ? 'نوع الجلسة' : 'Session Type', key: 'sessionType', width: 15 },
      { header: isRTL ? 'نهج الدعم النفسي' : 'PSS Approach', key: 'pssApproach', width: 25 },
      { header: isRTL ? 'الميسر' : 'Facilitator', key: 'facilitatorName', width: 20 },
      { header: isRTL ? 'المدة (دقيقة)' : 'Duration (min)', key: 'duration', width: 15 },
      { header: isRTL ? 'الملاحظات الرئيسية' : 'Key Observations', key: 'keyObservations', width: 40 },
      { header: isRTL ? 'استجابة المستفيد' : 'Beneficiary Response', key: 'beneficiaryResponse', width: 30 },
      { header: isRTL ? 'تاريخ الجلسة القادمة' : 'Next Session Date', key: 'nextSessionDate', width: 18 }
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Add data
    (sessions || []).forEach(session => {
      worksheet.addRow({
        caseCode: session.caseCode || '',
        beneficiaryCode: session.beneficiaryCode || '',
        sessionDate: session.sessionDate ? new Date(session.sessionDate).toISOString().split('T')[0] : '',
        sessionType: session.sessionType,
        pssApproach: session.pssApproach || '',
        facilitatorName: session.facilitatorName || '',
        duration: session.duration || '',
        keyObservations: session.keyObservations || '',
        beneficiaryResponse: session.beneficiaryResponse || '',
        nextSessionDate: session.nextSessionDate ? new Date(session.nextSessionDate).toISOString().split('T')[0] : ''
      });
    });

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `PSS_Sessions_${new Date().toISOString().split('T')[0]}.xlsx`);
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
            {isRTL ? 'جلسات الدعم النفسي الاجتماعي' : 'PSS Sessions'}
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">
            {isRTL ? 'إدارة جلسات الدعم النفسي الفردية والجماعية' : 'Manage individual and group PSS sessions'}
          </p>
        </div>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {/* Hidden file input for import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />
          {/* Import Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Upload className="w-4 h-4" />
            {isRTL ? 'استيراد' : 'Import'}
          </button>
          {/* Single Export Button */}
          <button
            onClick={handleExportExcel}
            className={`px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Download className="w-4 h-4" />
            {isRTL ? 'تصدير' : 'Export'}
          </button>
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className={`px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Plus className="w-4 h-4" />
            {isRTL ? 'إضافة جلسة' : 'Add Session'}
          </button>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="overflow-x-auto">
        <table className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                {isRTL ? 'رمز الحالة' : 'Case Code'}
              </th>
              <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                {isRTL ? 'تاريخ الجلسة' : 'Session Date'}
              </th>
              <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                {isRTL ? 'النوع' : 'Type'}
              </th>
              <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                {isRTL ? 'النهج' : 'Approach'}
              </th>
              <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                {isRTL ? 'الميسر' : 'Facilitator'}
              </th>
              <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                {isRTL ? 'المدة' : 'Duration'}
              </th>
              <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                {isRTL ? 'الإجراءات' : 'Actions'}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(sessions || []).length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm">{isRTL ? 'لا توجد جلسات مسجلة' : 'No sessions recorded yet'}</p>
                </td>
              </tr>
            ) : (
              (sessions || []).map((session) => (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {session.caseCode || '-'}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {session.sessionDate ? new Date(session.sessionDate).toLocaleDateString() : '-'}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      session.sessionType === 'individual' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {session.sessionType === 'individual' 
                        ? (isRTL ? 'فردي' : 'Individual') 
                        : (isRTL ? 'جماعي' : 'Group')}
                    </span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {session.pssApproach || '-'}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {session.facilitatorName || '-'}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {session.duration ? `${session.duration} ${isRTL ? 'دقيقة' : 'min'}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : 'justify-start'}`}>
                      <button
                        onClick={() => openEdit(session)}
                        className="p-1 text-amber-600 hover:bg-amber-50 rounded"
                        title={isRTL ? 'تعديل' : 'Edit'}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDelete(session.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title={isRTL ? 'حذف' : 'Delete'}
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

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className={`p-6 border-b border-gray-200 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-lg font-semibold text-gray-900">
                {showEditModal 
                  ? (isRTL ? 'تعديل الجلسة' : 'Edit Session') 
                  : (isRTL ? 'إضافة جلسة جديدة' : 'Add New Session')}
              </h3>
              <button
                onClick={() => { setShowAddModal(false); setShowEditModal(false); setEditingSessionId(null); resetForm(); }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'الحالة *' : 'Case *'}
                  </label>
                  <select
                    value={formData.caseId}
                    onChange={(e) => setFormData({ ...formData, caseId: Number(e.target.value) })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    <option value={0}>{isRTL ? 'اختر الحالة' : 'Select Case'}</option>
                    {(cases || []).map(c => (
                      <option key={c.id} value={c.id}>{c.caseCode} - {c.beneficiaryCode}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'تاريخ الجلسة *' : 'Session Date *'}
                  </label>
                  <input
                    type="date"
                    value={formData.sessionDate}
                    onChange={(e) => setFormData({ ...formData, sessionDate: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'نوع الجلسة *' : 'Session Type *'}
                  </label>
                  <select
                    value={formData.sessionType}
                    onChange={(e) => setFormData({ ...formData, sessionType: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    <option value="individual">{isRTL ? 'فردي' : 'Individual'}</option>
                    <option value="group">{isRTL ? 'جماعي' : 'Group'}</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'نهج الدعم النفسي' : 'PSS Approach'}
                  </label>
                  <input
                    type="text"
                    value={formData.pssApproach}
                    onChange={(e) => setFormData({ ...formData, pssApproach: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`}
                    placeholder={isRTL ? 'مثال: العلاج السلوكي المعرفي' : 'e.g., Cognitive Behavioral Therapy'}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'الميسر' : 'Facilitator'}
                  </label>
                  <input
                    type="text"
                    value={formData.facilitatorName}
                    onChange={(e) => setFormData({ ...formData, facilitatorName: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'المدة (دقيقة)' : 'Duration (minutes)'}
                  </label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`}
                    min={0}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'تاريخ الجلسة القادمة' : 'Next Session Date'}
                  </label>
                  <input
                    type="date"
                    value={formData.nextSessionDate}
                    onChange={(e) => setFormData({ ...formData, nextSessionDate: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`}
                  />
                </div>
              </div>
              
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {isRTL ? 'الملاحظات الرئيسية' : 'Key Observations'}
                </label>
                <textarea
                  value={formData.keyObservations}
                  onChange={(e) => setFormData({ ...formData, keyObservations: e.target.value })}
                  rows={3}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`}
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {isRTL ? 'استجابة المستفيد' : 'Beneficiary Response'}
                </label>
                <textarea
                  value={formData.beneficiaryResponse}
                  onChange={(e) => setFormData({ ...formData, beneficiaryResponse: e.target.value })}
                  rows={2}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`}
                />
              </div>
            </div>
            
            <div className={`p-6 border-t border-gray-200 flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={showEditModal ? handleEdit : handleAdd}
                disabled={createMutation.isPending || updateMutation.isPending}
                className={`px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isRTL ? 'حفظ' : 'Save'}
              </button>
              <button
                onClick={() => { setShowAddModal(false); setShowEditModal(false); setEditingSessionId(null); resetForm(); }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
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
              {isRTL 
                ? 'هل أنت متأكد من حذف هذه الجلسة؟ لا يمكن التراجع عن هذا الإجراء.' 
                : 'Are you sure you want to delete this session? This action cannot be undone.'}
            </p>
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2"
              >
                {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {isRTL ? 'حذف' : 'Delete'}
              </button>
              <button
                onClick={() => { setShowDeleteModal(false); setDeletingSessionId(null); }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Import Preview Dialog */}
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
        columns={pssSessionsImportConfig.columns.map(col => ({
          key: col.key,
          label: isRTL ? col.labelAr : col.label
        }))}
        moduleName={isRTL ? pssSessionsImportConfig.moduleNameAr : pssSessionsImportConfig.moduleName}
      />
    </div>
  );
}
