import { useState, useRef } from 'react';
import { Plus, Edit, Trash2, Download, X, Building2, Loader2, Save, Users, Upload } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { PreImportPreviewDialog } from '@/components/PreImportPreviewDialog';
import { safeSpacesImportConfig, validateImportRow, parseExcelToRows } from '@/config/caseManagementImportConfig';

interface ChildSafeSpaceProps {
  projectId: number;
}

export function ChildSafeSpace({ projectId }: ChildSafeSpaceProps) {
  const { isRTL } = useLanguage();
  const utils = trpc.useUtils();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'locations' | 'activities'>('locations');
  
  // Location modal states
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [showEditLocationModal, setShowEditLocationModal] = useState(false);
  const [showDeleteLocationModal, setShowDeleteLocationModal] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<number | null>(null);
  const [deletingLocationId, setDeletingLocationId] = useState<number | null>(null);
  
  // Activity modal states
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [showEditActivityModal, setShowEditActivityModal] = useState(false);
  const [showDeleteActivityModal, setShowDeleteActivityModal] = useState(false);
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [importValidRows, setImportValidRows] = useState<any[]>([]);
  const [importInvalidRows, setImportInvalidRows] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingActivityId, setEditingActivityId] = useState<number | null>(null);
  const [deletingActivityId, setDeletingActivityId] = useState<number | null>(null);
  
  // Form states - matching backend schema
  const [locationFormData, setLocationFormData] = useState({
    cssCode: '',
    cssName: '',
    location: '',
    operatingPartner: '',
    capacity: 0,
    ageGroupsServed: '',
    genderSegregation: false,
    operatingDays: '',
    operatingHours: ''
  });
  
  const [activityFormData, setActivityFormData] = useState({
    cssId: 0,
    activityDate: new Date().toISOString().split('T')[0],
    activityType: '',
    participantsCount: 0,
    maleCount: 0,
    femaleCount: 0,
    facilitatorName: '',
    notes: ''
  });

  // tRPC queries
  const { data: cssLocations, isLoading: locationsLoading } = trpc.caseManagement.childSafeSpaces.getByProject.useQuery({
    projectId
  });
  
  const { data: cssActivities, isLoading: activitiesLoading } = trpc.caseManagement.cssActivities.getByProject.useQuery({
    projectId
  });
  
  // Location mutations
  const createLocationMutation = trpc.caseManagement.childSafeSpaces.create.useMutation({
    onSuccess: () => {
      utils.caseManagement.childSafeSpaces.getByProject.invalidate({ projectId });
      toast.success(isRTL ? 'تم إضافة المساحة الآمنة بنجاح' : 'Child Safe Space added successfully');
      setShowAddLocationModal(false);
      resetLocationForm();
    },
    onError: (error) => toast.error(error.message)
  });
  
  const updateLocationMutation = trpc.caseManagement.childSafeSpaces.update.useMutation({
    onSuccess: () => {
      utils.caseManagement.childSafeSpaces.getByProject.invalidate({ projectId });
      toast.success(isRTL ? 'تم تحديث المساحة الآمنة بنجاح' : 'Child Safe Space updated successfully');
      setShowEditLocationModal(false);
      setEditingLocationId(null);
      resetLocationForm();
    },
    onError: (error) => toast.error(error.message)
  });
  
  const deleteLocationMutation = trpc.caseManagement.childSafeSpaces.delete.useMutation({
    onSuccess: () => {
      utils.caseManagement.childSafeSpaces.getByProject.invalidate({ projectId });
      toast.success(isRTL ? 'تم حذف المساحة الآمنة بنجاح' : 'Child Safe Space deleted successfully');
      setShowDeleteLocationModal(false);
      setDeletingLocationId(null);
    },
    onError: (error) => toast.error(error.message)
  });
  
  // Activity mutations
  const createActivityMutation = trpc.caseManagement.cssActivities.create.useMutation({
    onSuccess: () => {
      utils.caseManagement.cssActivities.getByProject.invalidate({ projectId });
      toast.success(isRTL ? 'تم إضافة النشاط بنجاح' : 'Activity added successfully');
      setShowAddActivityModal(false);
      resetActivityForm();
    },
    onError: (error) => toast.error(error.message)
  });
  
  const updateActivityMutation = trpc.caseManagement.cssActivities.update.useMutation({
    onSuccess: () => {
      utils.caseManagement.cssActivities.getByProject.invalidate({ projectId });
      toast.success(isRTL ? 'تم تحديث النشاط بنجاح' : 'Activity updated successfully');
      setShowEditActivityModal(false);
      setEditingActivityId(null);
      resetActivityForm();
    },
    onError: (error) => toast.error(error.message)
  });
  
  const deleteActivityMutation = trpc.caseManagement.cssActivities.delete.useMutation({
    onSuccess: () => {
      utils.caseManagement.cssActivities.getByProject.invalidate({ projectId });
      toast.success(isRTL ? 'تم حذف النشاط بنجاح' : 'Activity deleted successfully');
      setShowDeleteActivityModal(false);
      setDeletingActivityId(null);
    },
    onError: (error) => toast.error(error.message)
  });

  const resetLocationForm = () => {
    setLocationFormData({
      cssCode: '',
      cssName: '',
      location: '',
      operatingPartner: '',
      capacity: 0,
      ageGroupsServed: '',
      genderSegregation: false,
      operatingDays: '',
      operatingHours: ''
    });
  };
  
  const resetActivityForm = () => {
    setActivityFormData({
      cssId: 0,
      activityDate: new Date().toISOString().split('T')[0],
      activityType: '',
      participantsCount: 0,
      maleCount: 0,
      femaleCount: 0,
      facilitatorName: '',
      notes: ''
    });
  };

  const handleAddLocation = () => {
    if (!locationFormData.cssCode || !locationFormData.cssName || !locationFormData.location) {
      toast.error(isRTL ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
      return;
    }
    createLocationMutation.mutate({ ...locationFormData, projectId });
  };

  const handleEditLocation = () => {
    if (!editingLocationId) return;
    updateLocationMutation.mutate({ id: editingLocationId, ...locationFormData });
  };

  const handleDeleteLocation = () => {
    if (deletingLocationId) {
      deleteLocationMutation.mutate({ id: deletingLocationId });
    }
  };

  const openEditLocation = (loc: any) => {
    setEditingLocationId(loc.id);
    setLocationFormData({
      cssCode: loc.cssCode || '',
      cssName: loc.cssName || '',
      location: loc.location || '',
      operatingPartner: loc.operatingPartner || '',
      capacity: loc.capacity || 0,
      ageGroupsServed: loc.ageGroupsServed || '',
      genderSegregation: loc.genderSegregation || false,
      operatingDays: loc.operatingDays || '',
      operatingHours: loc.operatingHours || ''
    });
    setShowEditLocationModal(true);
  };

  const handleAddActivity = () => {
    if (!activityFormData.cssId || !activityFormData.activityDate || !activityFormData.activityType) {
      toast.error(isRTL ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
      return;
    }
    createActivityMutation.mutate({ ...activityFormData, projectId });
  };

  const handleEditActivity = () => {
    if (!editingActivityId) return;
    updateActivityMutation.mutate({ id: editingActivityId, ...activityFormData });
  };

  const handleDeleteActivity = () => {
    if (deletingActivityId) {
      deleteActivityMutation.mutate({ id: deletingActivityId });
    }
  };

  const openEditActivity = (act: any) => {
    setEditingActivityId(act.id);
    setActivityFormData({
      cssId: act.cssId || 0,
      activityDate: act.activityDate ? new Date(act.activityDate).toISOString().split('T')[0] : '',
      activityType: act.activityType || '',
      participantsCount: act.participantsCount || 0,
      maleCount: act.maleCount || 0,
      femaleCount: act.femaleCount || 0,
      facilitatorName: act.facilitatorName || '',
      notes: act.notes || ''
    });
    setShowEditActivityModal(true);
  };

  // Import handler for Locations
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

      const rows = parseExcelToRows(data, safeSpacesImportConfig);
      const validRows: any[] = [];
      const invalidRows: any[] = [];

      rows.forEach((row, index) => {
        const { isValid, errors } = validateImportRow(row, index + 2, safeSpacesImportConfig, isRTL);
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
        await createLocationMutation.mutateAsync({
          projectId,
          cssCode: row.data.cssCode || '',
          cssName: row.data.cssName || '',
          location: row.data.location || '',
          operatingPartner: row.data.operatingPartner || '',
          capacity: row.data.capacity || 0,
          ageGroupsServed: row.data.ageGroupsServed || '',
          genderSegregation: false,
          operatingDays: row.data.operatingDays || '',
          operatingHours: row.data.operatingHours || ''
        });
      }
      toast.success(isRTL ? `تم استيراد ${importValidRows.length} مساحة آمنة بنجاح` : `Successfully imported ${importValidRows.length} safe spaces`);
      setShowImportPreview(false);
      setImportValidRows([]);
      setImportInvalidRows([]);
    } catch (error) {
      toast.error(isRTL ? 'خطأ في الاستيراد' : 'Import error');
    }
  };

  // Single Export Button for Locations
  const handleExportLocations = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(isRTL ? 'المساحات الآمنة' : 'Child Safe Spaces');

    worksheet.columns = [
      { header: isRTL ? 'رمز المساحة' : 'CSS Code', key: 'cssCode', width: 15 },
      { header: isRTL ? 'اسم المساحة' : 'CSS Name', key: 'cssName', width: 25 },
      { header: isRTL ? 'الموقع' : 'Location', key: 'location', width: 25 },
      { header: isRTL ? 'الشريك المنفذ' : 'Operating Partner', key: 'operatingPartner', width: 25 },
      { header: isRTL ? 'السعة' : 'Capacity', key: 'capacity', width: 12 },
      { header: isRTL ? 'الفئات العمرية' : 'Age Groups', key: 'ageGroupsServed', width: 20 },
      { header: isRTL ? 'أيام العمل' : 'Operating Days', key: 'operatingDays', width: 20 },
      { header: isRTL ? 'ساعات العمل' : 'Operating Hours', key: 'operatingHours', width: 15 }
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };

    (cssLocations || []).forEach(loc => {
      worksheet.addRow({
        cssCode: loc.cssCode,
        cssName: loc.cssName,
        location: loc.location,
        operatingPartner: loc.operatingPartner || '',
        capacity: loc.capacity || '',
        ageGroupsServed: loc.ageGroupsServed || '',
        operatingDays: loc.operatingDays || '',
        operatingHours: loc.operatingHours || ''
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `CSS_Locations_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success(isRTL ? 'تم التصدير بنجاح' : 'Export successful');
  };

  // Single Export Button for Activities
  const handleExportActivities = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(isRTL ? 'أنشطة المساحات الآمنة' : 'CSS Activities');

    worksheet.columns = [
      { header: isRTL ? 'رمز المساحة' : 'CSS Code', key: 'cssCode', width: 15 },
      { header: isRTL ? 'اسم المساحة' : 'CSS Name', key: 'cssName', width: 25 },
      { header: isRTL ? 'التاريخ' : 'Date', key: 'activityDate', width: 15 },
      { header: isRTL ? 'نوع النشاط' : 'Activity Type', key: 'activityType', width: 20 },
      { header: isRTL ? 'عدد المشاركين' : 'Participants', key: 'participantsCount', width: 15 },
      { header: isRTL ? 'ذكور' : 'Male', key: 'maleCount', width: 10 },
      { header: isRTL ? 'إناث' : 'Female', key: 'femaleCount', width: 10 },
      { header: isRTL ? 'الميسر' : 'Facilitator', key: 'facilitatorName', width: 20 },
      { header: isRTL ? 'ملاحظات' : 'Notes', key: 'notes', width: 40 }
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };

    (cssActivities || []).forEach(act => {
      worksheet.addRow({
        cssCode: act.cssCode || '',
        cssName: act.cssName || '',
        activityDate: act.activityDate ? new Date(act.activityDate).toISOString().split('T')[0] : '',
        activityType: act.activityType,
        participantsCount: act.participantsCount,
        maleCount: act.maleCount || 0,
        femaleCount: act.femaleCount || 0,
        facilitatorName: act.facilitatorName || '',
        notes: act.notes || ''
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `CSS_Activities_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success(isRTL ? 'تم التصدير بنجاح' : 'Export successful');
  };

  if (locationsLoading || activitiesLoading) {
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
      <div className={`p-6 border-b border-gray-200 ${isRTL ? 'text-right' : 'text-left'}`}>
        <h2 className="text-sm font-semibold text-gray-900">
          {isRTL ? 'المساحات الآمنة للأطفال' : 'Child Safe Spaces'}
        </h2>
        <p className="text-xs text-gray-600 mt-0.5">
          {isRTL ? 'إدارة المساحات الآمنة وأنشطتها' : 'Manage safe spaces and their activities'}
        </p>
      </div>

      {/* Tabs */}
      <div className={`border-b border-gray-200 flex ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button
          onClick={() => setActiveTab('locations')}
          className={`px-6 py-3 text-sm font-medium ${
            activeTab === 'locations'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Building2 className="w-4 h-4 inline-block mr-2" />
          {isRTL ? 'المواقع' : 'Locations'}
        </button>
        <button
          onClick={() => setActiveTab('activities')}
          className={`px-6 py-3 text-sm font-medium ${
            activeTab === 'activities'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4 inline-block mr-2" />
          {isRTL ? 'الأنشطة' : 'Activities'}
        </button>
      </div>

      {/* Locations Tab */}
      {activeTab === 'locations' && (
        <>
          <div className={`p-4 flex items-center justify-end gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className={`px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Upload className="w-4 h-4" />
              {isRTL ? 'استيراد' : 'Import'}
            </button>
            <button onClick={handleExportLocations} className={`px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Download className="w-4 h-4" />
              {isRTL ? 'تصدير' : 'Export'}
            </button>
            <button onClick={() => { resetLocationForm(); setShowAddLocationModal(true); }} className={`px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Plus className="w-4 h-4" />
              {isRTL ? 'إضافة مساحة' : 'Add Space'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'الرمز' : 'Code'}</th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'الاسم' : 'Name'}</th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'الموقع' : 'Location'}</th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'السعة' : 'Capacity'}</th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(cssLocations || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-sm">{isRTL ? 'لا توجد مساحات آمنة مسجلة' : 'No safe spaces recorded yet'}</p>
                    </td>
                  </tr>
                ) : (
                  (cssLocations || []).map((loc) => (
                    <tr key={loc.id} className="hover:bg-gray-50">
                      <td className={`px-6 py-4 text-sm font-medium text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{loc.cssCode}</td>
                      <td className={`px-6 py-4 text-sm text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{loc.cssName}</td>
                      <td className={`px-6 py-4 text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{loc.location}</td>
                      <td className={`px-6 py-4 text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{loc.capacity || '-'}</td>
                      <td className="px-6 py-4">
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : 'justify-start'}`}>
                          <button onClick={() => openEditLocation(loc)} className="p-1 text-amber-600 hover:bg-amber-50 rounded"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => { setDeletingLocationId(loc.id); setShowDeleteLocationModal(true); }} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Activities Tab */}
      {activeTab === 'activities' && (
        <>
          <div className={`p-4 flex items-center justify-end gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button onClick={handleExportActivities} className={`px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Download className="w-4 h-4" />
              {isRTL ? 'تصدير' : 'Export'}
            </button>
            <button onClick={() => { resetActivityForm(); setShowAddActivityModal(true); }} className={`px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Plus className="w-4 h-4" />
              {isRTL ? 'إضافة نشاط' : 'Add Activity'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'المساحة' : 'Space'}</th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'التاريخ' : 'Date'}</th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'النوع' : 'Type'}</th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'المشاركين' : 'Participants'}</th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(cssActivities || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-sm">{isRTL ? 'لا توجد أنشطة مسجلة' : 'No activities recorded yet'}</p>
                    </td>
                  </tr>
                ) : (
                  (cssActivities || []).map((act) => (
                    <tr key={act.id} className="hover:bg-gray-50">
                      <td className={`px-6 py-4 text-sm text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{act.cssName || act.cssCode || '-'}</td>
                      <td className={`px-6 py-4 text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{act.activityDate ? new Date(act.activityDate).toLocaleDateString() : '-'}</td>
                      <td className={`px-6 py-4 text-sm text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{act.activityType}</td>
                      <td className={`px-6 py-4 text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{act.participantsCount}</td>
                      <td className="px-6 py-4">
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : 'justify-start'}`}>
                          <button onClick={() => openEditActivity(act)} className="p-1 text-amber-600 hover:bg-amber-50 rounded"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => { setDeletingActivityId(act.id); setShowDeleteActivityModal(true); }} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Location Add/Edit Modal */}
      {(showAddLocationModal || showEditLocationModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className={`p-6 border-b border-gray-200 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-lg font-semibold text-gray-900">
                {showEditLocationModal ? (isRTL ? 'تعديل المساحة الآمنة' : 'Edit Safe Space') : (isRTL ? 'إضافة مساحة آمنة' : 'Add Safe Space')}
              </h3>
              <button onClick={() => { setShowAddLocationModal(false); setShowEditLocationModal(false); setEditingLocationId(null); resetLocationForm(); }} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'رمز المساحة *' : 'CSS Code *'}</label>
                  <input type="text" value={locationFormData.cssCode} onChange={(e) => setLocationFormData({ ...locationFormData, cssCode: e.target.value })} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'اسم المساحة *' : 'CSS Name *'}</label>
                  <input type="text" value={locationFormData.cssName} onChange={(e) => setLocationFormData({ ...locationFormData, cssName: e.target.value })} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'الموقع *' : 'Location *'}</label>
                  <input type="text" value={locationFormData.location} onChange={(e) => setLocationFormData({ ...locationFormData, location: e.target.value })} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'الشريك المنفذ' : 'Operating Partner'}</label>
                  <input type="text" value={locationFormData.operatingPartner} onChange={(e) => setLocationFormData({ ...locationFormData, operatingPartner: e.target.value })} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'السعة' : 'Capacity'}</label>
                  <input type="number" value={locationFormData.capacity} onChange={(e) => setLocationFormData({ ...locationFormData, capacity: Number(e.target.value) })} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`} min={0} />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'الفئات العمرية' : 'Age Groups'}</label>
                  <input type="text" value={locationFormData.ageGroupsServed} onChange={(e) => setLocationFormData({ ...locationFormData, ageGroupsServed: e.target.value })} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`} placeholder={isRTL ? 'مثال: 6-12 سنة' : 'e.g., 6-12 years'} />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'أيام العمل' : 'Operating Days'}</label>
                  <input type="text" value={locationFormData.operatingDays} onChange={(e) => setLocationFormData({ ...locationFormData, operatingDays: e.target.value })} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`} placeholder={isRTL ? 'مثال: الأحد - الخميس' : 'e.g., Sun - Thu'} />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'ساعات العمل' : 'Operating Hours'}</label>
                  <input type="text" value={locationFormData.operatingHours} onChange={(e) => setLocationFormData({ ...locationFormData, operatingHours: e.target.value })} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`} placeholder={isRTL ? 'مثال: 9:00 - 15:00' : 'e.g., 9:00 - 15:00'} />
                </div>
              </div>
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <input type="checkbox" id="genderSeg" checked={locationFormData.genderSegregation} onChange={(e) => setLocationFormData({ ...locationFormData, genderSegregation: e.target.checked })} className="w-4 h-4 text-primary border-gray-300 rounded" />
                <label htmlFor="genderSeg" className="text-sm text-gray-700">{isRTL ? 'فصل حسب الجنس' : 'Gender Segregation'}</label>
              </div>
            </div>
            <div className={`p-6 border-t border-gray-200 flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button onClick={showEditLocationModal ? handleEditLocation : handleAddLocation} disabled={createLocationMutation.isPending || updateLocationMutation.isPending} className={`px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                {(createLocationMutation.isPending || updateLocationMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isRTL ? 'حفظ' : 'Save'}
              </button>
              <button onClick={() => { setShowAddLocationModal(false); setShowEditLocationModal(false); setEditingLocationId(null); resetLocationForm(); }} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">{isRTL ? 'إلغاء' : 'Cancel'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Add/Edit Modal */}
      {(showAddActivityModal || showEditActivityModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className={`p-6 border-b border-gray-200 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-lg font-semibold text-gray-900">
                {showEditActivityModal ? (isRTL ? 'تعديل النشاط' : 'Edit Activity') : (isRTL ? 'إضافة نشاط' : 'Add Activity')}
              </h3>
              <button onClick={() => { setShowAddActivityModal(false); setShowEditActivityModal(false); setEditingActivityId(null); resetActivityForm(); }} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'المساحة الآمنة *' : 'Safe Space *'}</label>
                  <select value={activityFormData.cssId} onChange={(e) => setActivityFormData({ ...activityFormData, cssId: Number(e.target.value) })} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                    <option value={0}>{isRTL ? 'اختر المساحة' : 'Select Space'}</option>
                    {(cssLocations || []).map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.cssCode} - {loc.cssName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'التاريخ *' : 'Date *'}</label>
                  <input type="date" value={activityFormData.activityDate} onChange={(e) => setActivityFormData({ ...activityFormData, activityDate: e.target.value })} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'نوع النشاط *' : 'Activity Type *'}</label>
                  <select value={activityFormData.activityType} onChange={(e) => setActivityFormData({ ...activityFormData, activityType: e.target.value })} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                    <option value="">{isRTL ? 'اختر' : 'Select'}</option>
                    <option value="recreational">{isRTL ? 'ترفيهي' : 'Recreational'}</option>
                    <option value="educational">{isRTL ? 'تعليمي' : 'Educational'}</option>
                    <option value="psychosocial">{isRTL ? 'نفسي اجتماعي' : 'Psychosocial'}</option>
                    <option value="life_skills">{isRTL ? 'مهارات حياتية' : 'Life Skills'}</option>
                    <option value="other">{isRTL ? 'أخرى' : 'Other'}</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'الميسر' : 'Facilitator'}</label>
                  <input type="text" value={activityFormData.facilitatorName} onChange={(e) => setActivityFormData({ ...activityFormData, facilitatorName: e.target.value })} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'عدد المشاركين *' : 'Participants *'}</label>
                  <input type="number" value={activityFormData.participantsCount} onChange={(e) => setActivityFormData({ ...activityFormData, participantsCount: Number(e.target.value) })} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`} min={0} />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'ذكور' : 'Male'}</label>
                  <input type="number" value={activityFormData.maleCount} onChange={(e) => setActivityFormData({ ...activityFormData, maleCount: Number(e.target.value) })} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`} min={0} />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'إناث' : 'Female'}</label>
                  <input type="number" value={activityFormData.femaleCount} onChange={(e) => setActivityFormData({ ...activityFormData, femaleCount: Number(e.target.value) })} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`} min={0} />
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'ملاحظات' : 'Notes'}</label>
                <textarea value={activityFormData.notes} onChange={(e) => setActivityFormData({ ...activityFormData, notes: e.target.value })} rows={3} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`} />
              </div>
            </div>
            <div className={`p-6 border-t border-gray-200 flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button onClick={showEditActivityModal ? handleEditActivity : handleAddActivity} disabled={createActivityMutation.isPending || updateActivityMutation.isPending} className={`px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                {(createActivityMutation.isPending || updateActivityMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isRTL ? 'حفظ' : 'Save'}
              </button>
              <button onClick={() => { setShowAddActivityModal(false); setShowEditActivityModal(false); setEditingActivityId(null); resetActivityForm(); }} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">{isRTL ? 'إلغاء' : 'Cancel'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Location Modal */}
      {showDeleteLocationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md m-4">
            <h3 className={`text-lg font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'تأكيد الحذف' : 'Confirm Delete'}</h3>
            <p className={`text-gray-600 mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'هل أنت متأكد من حذف هذه المساحة الآمنة؟' : 'Are you sure you want to delete this safe space?'}</p>
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button onClick={handleDeleteLocation} disabled={deleteLocationMutation.isPending} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2">
                {deleteLocationMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {isRTL ? 'حذف' : 'Delete'}
              </button>
              <button onClick={() => { setShowDeleteLocationModal(false); setDeletingLocationId(null); }} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">{isRTL ? 'إلغاء' : 'Cancel'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Activity Modal */}
      {showDeleteActivityModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md m-4">
            <h3 className={`text-lg font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'تأكيد الحذف' : 'Confirm Delete'}</h3>
            <p className={`text-gray-600 mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'هل أنت متأكد من حذف هذا النشاط؟' : 'Are you sure you want to delete this activity?'}</p>
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button onClick={handleDeleteActivity} disabled={deleteActivityMutation.isPending} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2">
                {deleteActivityMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {isRTL ? 'حذف' : 'Delete'}
              </button>
              <button onClick={() => { setShowDeleteActivityModal(false); setDeletingActivityId(null); }} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">{isRTL ? 'إلغاء' : 'Cancel'}</button>
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
        columns={safeSpacesImportConfig.columns.map(col => ({ key: col.key, label: isRTL ? col.labelAr : col.label }))}
        moduleName={isRTL ? safeSpacesImportConfig.moduleNameAr : safeSpacesImportConfig.moduleName}
      />
    </div>
  );
}
