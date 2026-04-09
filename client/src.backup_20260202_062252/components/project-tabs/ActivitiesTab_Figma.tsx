import { useState } from 'react';
import { 
  Plus, Download, Upload, FileSpreadsheet, 
  Edit2, Trash2, Calendar, BarChart3, X, Search 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface Activity {
  id: string;
  code: string;
  title: string;
  description: string;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  completion: number;
  responsible: string;
  location: string;
}

const mockActivities: Activity[] = [
  {
    id: '1',
    code: 'ACT-001',
    title: 'Community Awareness Campaign',
    description: 'Organize community events to raise awareness about project goals',
    status: 'In Progress',
    startDate: '2024-01-15',
    endDate: '2024-03-30',
    budget: 5000,
    spent: 1200,
    completion: 35,
    responsible: 'Sarah Johnson',
    location: 'Multiple Districts'
  },
  {
    id: '2',
    code: 'ACT-002',
    title: 'Training Workshops',
    description: 'Conduct training sessions for beneficiaries',
    status: 'Not Started',
    startDate: '2024-02-01',
    endDate: '2024-04-15',
    budget: 8000,
    spent: 0,
    completion: 0,
    responsible: 'Mike Chen',
    location: 'Central Training Center'
  }
];

interface ActivitiesTabProps {
  projectId: string;
}

export function ActivitiesTab({ projectId }: ActivitiesTabProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n?.language === 'ar';
  
  // ✅ Load activities from localStorage, linked to projectId
  const loadActivities = (): Activity[] => {
    const stored = localStorage.getItem('pms_activities');
    if (!stored) return [];
    
    const allActivities = JSON.parse(stored);
    // Map UI activity format to report format
    return allActivities
      .filter((a: any) => a.projectId === projectId)
      .map((a: any) => ({
        id: a.id,
        code: a.activityCode || a.code,
        title: a.activityTitle || a.title,
        description: a.description || '',
        status: a.status === 'IN_PROGRESS' ? 'In Progress' :
                a.status === 'NOT_STARTED' ? 'Not Started' :
                a.status === 'COMPLETED' ? 'Completed' :
                a.status === 'ON_HOLD' ? 'On Hold' : a.status,
        startDate: a.plannedStartDate || a.startDate,
        endDate: a.plannedEndDate || a.endDate,
        budget: a.budget || 0,
        spent: a.spent || 0,
        completion: a.progress || a.completion || 0,
        responsible: a.responsible || '',
        location: a.location || ''
      }));
  };

  // ✅ Save activities to localStorage in report-compatible format
  const saveActivities = (activities: Activity[]) => {
    const stored = localStorage.getItem('pms_activities');
    const allActivities = stored ? JSON.parse(stored) : [];
    
    // Remove old activities for this project
    const otherActivities = allActivities.filter((a: any) => a.projectId !== projectId);
    
    // Add new activities in report format
    const newActivities = activities.map(a => ({
      id: a.id,
      projectId: projectId,
      activityCode: a.code,
      activityTitle: a.title,
      description: a.description,
      plannedStartDate: a.startDate,
      plannedEndDate: a.endDate,
      actualStartDate: a.status !== 'Not Started' ? a.startDate : undefined,
      actualEndDate: a.status === 'Completed' ? a.endDate : undefined,
      status: a.status === 'In Progress' ? 'IN_PROGRESS' : 
              a.status === 'Not Started' ? 'NOT_STARTED' :
              a.status === 'Completed' ? 'COMPLETED' : 'ON_HOLD',
      progress: a.completion,
      targetValue: 1,
      achievedValue: a.status === 'Completed' ? 1 : 0,
      responsible: a.responsible,
      budget: a.budget,
      spent: a.spent,
      location: a.location,
      linkedRisks: 0
    }));
    
    localStorage.setItem('pms_activities', JSON.stringify([...otherActivities, ...newActivities]));
  };

  const [activities, setActivities] = useState<Activity[]>(() => {
    const loaded = loadActivities();
    // If no activities exist for this project, initialize with mock data
    if (loaded.length === 0) {
      // Save mock activities immediately on first load
      saveActivities(mockActivities);
      return mockActivities;
    }
    return loaded;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    status: 'Not Started' as Activity['status'],
    startDate: '',
    endDate: '',
    budget: 0,
    spent: 0,
    completion: 0,
    responsible: '',
    location: ''
  });

  // Filter activities
  const filteredActivities = activities.filter(activity =>
    activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity.responsible.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Export to Excel
  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Activities');

    worksheet.columns = [
      { header: t('projectDetail.activityCode'), key: 'code', width: 15 },
      { header: t('projectDetail.activityTitle'), key: 'title', width: 40 },
      { header: t('projectDetail.activityDescription'), key: 'description', width: 50 },
      { header: t('projectDetail.activityStatus'), key: 'status', width: 15 },
      { header: t('projectDetail.activityStartDate'), key: 'startDate', width: 15 },
      { header: t('projectDetail.activityEndDate'), key: 'endDate', width: 15 },
      { header: `${t('projectDetail.activityBudget')} (USD)`, key: 'budget', width: 15 },
      { header: `${t('projectDetail.activitySpent')} (USD)`, key: 'spent', width: 15 },
      { header: `${t('projectDetail.activityCompletion')} (%)`, key: 'completion', width: 15 },
      { header: t('projectDetail.activityResponsible'), key: 'responsible', width: 25 },
      { header: t('projectDetail.activityLocation'), key: 'location', width: 25 }
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' }
    };

    // Add data
    filteredActivities.forEach(activity => {
      worksheet.addRow(activity);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    saveAs(blob, `Activities_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export Empty Template
  const handleExportTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Activities Template');

    worksheet.columns = [
      { header: t('projectDetail.activityCodeRequired'), key: 'code', width: 15 },
      { header: t('projectDetail.activityTitleRequired'), key: 'title', width: 40 },
      { header: t('projectDetail.activityDescription'), key: 'description', width: 50 },
      { header: t('projectDetail.activityStatus'), key: 'status', width: 15 },
      { header: `${t('projectDetail.activityStartDate')} (YYYY-MM-DD)*`, key: 'startDate', width: 20 },
      { header: `${t('projectDetail.activityEndDate')} (YYYY-MM-DD)*`, key: 'endDate', width: 20 },
      { header: `${t('projectDetail.activityBudget')} (USD)`, key: 'budget', width: 15 },
      { header: `${t('projectDetail.activitySpent')} (USD)`, key: 'spent', width: 15 },
      { header: `${t('projectDetail.activityCompletion')} (%)`, key: 'completion', width: 15 },
      { header: t('projectDetail.activityResponsible'), key: 'responsible', width: 25 },
      { header: t('projectDetail.activityLocation'), key: 'location', width: 25 }
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF059669' }
    };

    // Add example row
    worksheet.addRow({
      code: 'ACT-001',
      title: 'Example Activity',
      description: 'Description of the activity',
      status: 'In Progress',
      startDate: '2024-01-01',
      endDate: '2024-03-31',
      budget: '10000',
      spent: '2500',
      completion: '25',
      responsible: 'John Doe',
      location: 'Main Office'
    });

    // Add data validation for Status
    worksheet.getColumn('status').eachCell({ includeEmpty: true }, (cell, rowNumber) => {
      if (rowNumber > 1) {
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"Not Started,In Progress,Completed,On Hold,Cancelled"']
        };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    saveAs(blob, 'Activities_Template_Empty.xlsx');
  };

  // Import from Excel
  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const workbook = new ExcelJS.Workbook();
    const arrayBuffer = await file.arrayBuffer();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];
    const importedData: Activity[] = [];
    const errors: string[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const code = row.getCell(1).value?.toString() || '';
      const title = row.getCell(2).value?.toString() || '';
      const startDate = row.getCell(5).value?.toString() || '';
      const endDate = row.getCell(6).value?.toString() || '';

      // Validation
      if (!code) errors.push(`Row ${rowNumber}: Activity Code is required`);
      if (!title) errors.push(`Row ${rowNumber}: Activity Title is required`);
      if (!startDate) errors.push(`Row ${rowNumber}: Start Date is required`);
      if (!endDate) errors.push(`Row ${rowNumber}: End Date is required`);

      importedData.push({
        id: `imported-${Date.now()}-${rowNumber}`,
        code,
        title,
        description: row.getCell(3).value?.toString() || '',
        status: (row.getCell(4).value?.toString() || 'Not Started') as Activity['status'],
        startDate,
        endDate,
        budget: parseFloat(row.getCell(7).value?.toString() || '0'),
        spent: parseFloat(row.getCell(8).value?.toString() || '0'),
        completion: parseFloat(row.getCell(9).value?.toString() || '0'),
        responsible: row.getCell(10).value?.toString() || '',
        location: row.getCell(11).value?.toString() || ''
      });
    });

    if (errors.length > 0) {
      alert(`Import errors:\n${errors.join('\n')}`);
      return;
    }

    setActivities([...activities, ...importedData]);
    alert(t('projectDetail.successfullyImported').replace('{0}', importedData.length.toString()));
    setShowImportModal(false);
  };

  // Create Activity
  const handleCreate = () => {
    if (!formData.code || !formData.title || !formData.startDate || !formData.endDate) {
      alert(t('projectDetail.fillRequiredFields'));
      return;
    }

    const newActivity: Activity = {
      id: `act-${Date.now()}`,
      ...formData
    };

    setActivities([...activities, newActivity]);
    setShowCreateModal(false);
    resetForm();
    alert(t('projectDetail.activityCreatedSuccess'));
    saveActivities([...activities, newActivity]);
  };

  // Edit Activity
  const handleEdit = () => {
    if (!selectedActivity) return;

    setActivities(activities.map(act => 
      act.id === selectedActivity.id ? { ...selectedActivity, ...formData } : act
    ));
    setShowEditModal(false);
    setSelectedActivity(null);
    resetForm();
    alert(t('projectDetail.activityUpdatedSuccess'));
    saveActivities(activities.map(act => 
      act.id === selectedActivity.id ? { ...selectedActivity, ...formData } : act
    ));
  };

  // Delete Activity
  const handleDelete = () => {
    if (!selectedActivity) return;
    
    setActivities(activities.filter(act => act.id !== selectedActivity.id));
    setShowDeleteConfirm(false);
    setSelectedActivity(null);
    alert(t('projectDetail.activityDeletedSuccess'));
    saveActivities(activities.filter(act => act.id !== selectedActivity.id));
  };

  const resetForm = () => {
    setFormData({
      code: '',
      title: '',
      description: '',
      status: 'Not Started',
      startDate: '',
      endDate: '',
      budget: 0,
      spent: 0,
      completion: 0,
      responsible: '',
      location: ''
    });
  };

  const openEditModal = (activity: Activity) => {
    setSelectedActivity(activity);
    setFormData(activity);
    setShowEditModal(true);
  };

  const openDeleteConfirm = (activity: Activity) => {
    setSelectedActivity(activity);
    setShowDeleteConfirm(true);
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="space-y-6">
      {/* Header with Actions */}
      <div className={`flex items-center justify-between mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h2 className="text-sm font-semibold text-gray-900">{t('projectDetail.activitiesPageTitle')}</h2>
          <p className="text-xs text-gray-600 mt-0.5">{t('projectDetail.activitiesPageSubtitle')}</p>
        </div>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => setViewMode(viewMode === 'table' ? 'timeline' : 'table')}
            className={`px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            {viewMode === 'table' ? <BarChart3 className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
            {viewMode === 'table' ? t('projectDetail.timelineView') : t('projectDetail.tableView')}
          </button>
          <button
            onClick={handleExportExcel}
            disabled={filteredActivities.length === 0}
            className={`px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Download className="w-4 h-4" />
            {t('projectDetail.exportData') || 'Export Data'}
          </button>
          <button
            onClick={handleExportTemplate}
            className={`px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            {t('projectDetail.exportTemplate') || 'Export Template'}
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className={`px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Upload className="w-4 h-4" />
            {t('projectDetail.importActivities')}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className={`px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Plus className="w-4 h-4" />
            {t('projectDetail.addActivity')}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 ${isRTL ? 'end-3' : 'start-3'}`} />
        <input
          type="text"
          placeholder={t('projectDetail.searchActivities')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'pe-10 ps-4 text-right' : 'ps-10 pe-4 text-left'}`}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className={`text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.totalActivities')}</div>
          <div className={`text-2xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">{activities.length}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className={`text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.inProgress')}</div>
          <div className={`text-2xl font-bold text-blue-600 ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">
            {activities.filter(a => a.status === 'In Progress').length}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className={`text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.completed')}</div>
          <div className={`text-2xl font-bold text-green-600 ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">
            {activities.filter(a => a.status === 'Completed').length}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className={`text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.totalBudget')}</div>
          <div className={`text-2xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">
            ${activities.reduce((sum, a) => sum + a.budget, 0).toLocaleString()}
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
                  <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.code')}</th>
                  <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.title')}</th>
                  <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.activityStatus')}</th>
                  <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.activityDuration')}</th>
                  <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.activityBudget')}</th>
                  <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.activityProgress')}</th>
                  <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.responsible')}</th>
                  <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredActivities.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      {t('projectDetail.noActivitiesFound')}
                    </td>
                  </tr>
                ) : (
                  filteredActivities.map((activity) => (
                    <tr key={activity.id} className="hover:bg-gray-50">
                      <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{activity.code}</td>
                      <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className="font-medium text-gray-900">{activity.title}</div>
                        <div className="text-xs text-gray-500">{activity.location}</div>
                      </td>
                      <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          activity.status === 'Completed' ? 'bg-green-100 text-green-700' :
                          activity.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                          activity.status === 'On Hold' ? 'bg-yellow-100 text-yellow-700' :
                          activity.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {activity.status === 'Completed' ? t('projectDetail.activityStatusCompleted') :
                           activity.status === 'In Progress' ? t('projectDetail.activityStatusInProgress') :
                           activity.status === 'On Hold' ? t('projectDetail.activityStatusOnHold') :
                           activity.status === 'Cancelled' ? t('projectDetail.activityStatusCancelled') :
                           t('projectDetail.activityStatusNotStarted')}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">
                        {activity.startDate} - {activity.endDate}
                      </td>
                      <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">
                        ${activity.budget.toLocaleString()}
                      </td>
                      <td className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2" dir="ltr">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{ width: `${activity.completion}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600" dir="ltr">{activity.completion}%</span>
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                        {activity.responsible}
                      </td>
                      <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
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
          <h3 className={`text-lg font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.timelineView')}</h3>
          <div className="space-y-4">
            {filteredActivities.map((activity) => (
              <div key={activity.id} className="border border-gray-200 rounded-lg p-4">
                <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="flex-1">
                    <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="font-medium text-gray-900">{activity.code}</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        activity.status === 'Completed' ? 'bg-green-100 text-green-700' :
                        activity.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {activity.status === 'Completed' ? t('projectDetail.activityStatusCompleted') :
                         activity.status === 'In Progress' ? t('projectDetail.activityStatusInProgress') :
                         activity.status === 'On Hold' ? t('projectDetail.activityStatusOnHold') :
                         activity.status === 'Cancelled' ? t('projectDetail.activityStatusCancelled') :
                         t('projectDetail.activityStatusNotStarted')}
                      </span>
                    </div>
                    <h4 className="font-semibold text-gray-900">{activity.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                    <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                      <span dir="ltr">📅 {activity.startDate} → {activity.endDate}</span>
                      <span dir="ltr">💰 ${activity.budget.toLocaleString()}</span>
                      <span>👤 {activity.responsible}</span>
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
                  <div className={`flex items-center justify-between text-sm text-gray-600 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span>{t('projectDetail.activityProgress')}</span>
                    <span dir="ltr">{activity.completion}%</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2" dir="ltr">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${activity.completion}%` }}
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
          title={t('projectDetail.addNewActivity')}
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
          title={t('projectDetail.editActivity')}
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
          title={t('projectDetail.importActivitiesTitle')}
          onClose={() => setShowImportModal(false)}
        >
          <div>
            <p className="text-sm text-gray-600 mb-4">
              {t('projectDetail.importActivitiesDesc')}
            </p>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportExcel}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <div className={`mt-4 flex justify-end ${isRTL ? 'flex-row-reverse' : ''}`}>
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
            <p className={`text-sm text-gray-600 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('projectDetail.confirmDeleteActivity').replace('{0}', selectedActivity.title)}
            </p>
            <div className={`flex items-center justify-end gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
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
    </div>
  );
}

// Modal Component
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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

function ActivityForm({ formData, onChange, onSubmit, onCancel, isEdit, t, isRTL }: ActivityFormProps) {
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
          <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.activityCodeRequired')}</label>
          <input
            type="text"
            required
            value={formData.code}
            onChange={(e) => onChange({ ...formData, code: e.target.value })}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
          />
        </div>
        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.activityStatus')}</label>
          <select
            value={formData.status}
            onChange={(e) => onChange({ ...formData, status: e.target.value as Activity['status'] })}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
          >
            <option value="Not Started">{t('projectDetail.activityStatusNotStarted')}</option>
            <option value="In Progress">{t('projectDetail.activityStatusInProgress')}</option>
            <option value="Completed">{t('projectDetail.activityStatusCompleted')}</option>
            <option value="On Hold">{t('projectDetail.activityStatusOnHold')}</option>
            <option value="Cancelled">{t('projectDetail.activityStatusCancelled')}</option>
          </select>
        </div>
      </div>

      <div>
        <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.activityTitleRequired')}</label>
        <input
          type="text"
          required
          value={formData.title}
          onChange={(e) => onChange({ ...formData, title: e.target.value })}
          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
        />
      </div>

      <div>
        <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.activityDescription')}</label>
        <textarea
          rows={3}
          value={formData.description}
          onChange={(e) => onChange({ ...formData, description: e.target.value })}
          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.activityStartDate')}*</label>
          <input
            type="date"
            required
            value={formData.startDate}
            onChange={(e) => onChange({ ...formData, startDate: e.target.value })}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
          />
        </div>
        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.activityEndDate')}*</label>
          <input
            type="date"
            required
            value={formData.endDate}
            onChange={(e) => onChange({ ...formData, endDate: e.target.value })}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.activityBudget')} (USD)</label>
          <input
            type="number"
            min="0"
            value={formData.budget}
            onChange={(e) => onChange({ ...formData, budget: parseFloat(e.target.value) || 0 })}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
            dir="ltr"
          />
        </div>
        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.activitySpent')} (USD)</label>
          <input
            type="number"
            min="0"
            value={formData.spent}
            onChange={(e) => onChange({ ...formData, spent: parseFloat(e.target.value) || 0 })}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
            dir="ltr"
          />
        </div>
        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.activityCompletion')} (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            value={formData.completion}
            onChange={(e) => onChange({ ...formData, completion: parseFloat(e.target.value) || 0 })}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
            dir="ltr"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.activityResponsible')}</label>
          <input
            type="text"
            value={formData.responsible}
            onChange={(e) => onChange({ ...formData, responsible: e.target.value })}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
          />
        </div>
        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.activityLocation')}</label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => onChange({ ...formData, location: e.target.value })}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
          />
        </div>
      </div>

      <div className={`flex items-center justify-end gap-2 pt-4 border-t border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
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
          {isEdit ? t('projectDetail.editActivity') : t('projectDetail.addActivity')}
        </button>
      </div>
    </form>
  );
}