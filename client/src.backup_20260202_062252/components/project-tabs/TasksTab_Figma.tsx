import { useState } from 'react';
import { 
  Plus, Download, Upload, FileSpreadsheet, Edit2, Trash2, X, Search, Filter,
  AlertCircle, CheckCircle2, Clock, List, LayoutGrid
} from 'lucide-react';

import { useTranslation } from 'react-i18next';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';


interface Task {
  id: string;
  code: string;
  title: string;
  description: string;
  status: 'To Do' | 'In Progress' | 'Review' | 'Completed';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  assignedTo: string;
  dueDate: string;
  estimatedHours: number;
  actualHours: number;
  activityCode: string;
}

const mockTasks: Task[] = [
  {
    id: '1',
    code: 'TASK-001',
    title: 'Prepare Campaign Materials',
    description: 'Design posters, flyers, and social media content',
    status: 'In Progress',
    priority: 'High',
    assignedTo: 'Sarah Johnson',
    dueDate: '2024-02-15',
    estimatedHours: 20,
    actualHours: 12,
    activityCode: 'ACT-001'
  },
  {
    id: '2',
    code: 'TASK-002',
    title: 'Schedule Community Meetings',
    description: 'Arrange meetings with community leaders',
    status: 'To Do',
    priority: 'Medium',
    assignedTo: 'Mike Chen',
    dueDate: '2024-02-20',
    estimatedHours: 8,
    actualHours: 0,
    activityCode: 'ACT-001'
  },
  {
    id: '3',
    code: 'TASK-003',
    title: 'Develop Training Curriculum',
    description: 'Create comprehensive training materials',
    status: 'Review',
    priority: 'High',
    assignedTo: 'Emma Davis',
    dueDate: '2024-02-10',
    estimatedHours: 40,
    actualHours: 38,
    activityCode: 'ACT-002'
  },
  {
    id: '4',
    code: 'TASK-004',
    title: 'Final Report Submission',
    description: 'Submit quarterly report to donor',
    status: 'Completed',
    priority: 'Urgent',
    assignedTo: 'John Smith',
    dueDate: '2024-01-31',
    estimatedHours: 16,
    actualHours: 18,
    activityCode: 'ACT-001'
  }
];

export function TasksTab() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n?.language === 'ar';
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    status: 'To Do' as Task['status'],
    priority: 'Medium' as Task['priority'],
    assignedTo: '',
    dueDate: '',
    estimatedHours: 0,
    actualHours: 0,
    activityCode: ''
  });

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.assignedTo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tasksByStatus = {
    'To Do': filteredTasks.filter(t => t.status === 'To Do'),
    'In Progress': filteredTasks.filter(t => t.status === 'In Progress'),
    'Review': filteredTasks.filter(t => t.status === 'Review'),
    'Completed': filteredTasks.filter(t => t.status === 'Completed')
  };

  // Helper function to get translated status
  const getStatusLabel = (status: Task['status']) => {
    switch (status) {
      case 'To Do': return t('projectDetail.taskStatusToDo');
      case 'In Progress': return t('projectDetail.taskStatusInProgress');
      case 'Review': return t('projectDetail.taskStatusReview');
      case 'Completed': return t('projectDetail.taskStatusCompleted');
    }
  };

  // Helper function to get translated priority
  const getPriorityLabel = (priority: Task['priority']) => {
    switch (priority) {
      case 'Low': return t('projectDetail.taskPriorityLow');
      case 'Medium': return t('projectDetail.taskPriorityMedium');
      case 'High': return t('projectDetail.taskPriorityHigh');
      case 'Urgent': return t('projectDetail.taskPriorityUrgent');
    }
  };

  // Export to Excel
  const handleExportExcel = async () => {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet(t('projectDetail.tasksPageTitle'));

    worksheet.columns = [
      { header: t('projectDetail.taskCode'), key: 'code', width: 15 },
      { header: t('projectDetail.taskTitle'), key: 'title', width: 40 },
      { header: t('projectDetail.taskDescription'), key: 'description', width: 50 },
      { header: t('projectDetail.taskStatus'), key: 'status', width: 15 },
      { header: t('projectDetail.taskPriority'), key: 'priority', width: 12 },
      { header: t('projectDetail.taskAssignedTo'), key: 'assignedTo', width: 20 },
      { header: t('projectDetail.taskDueDate'), key: 'dueDate', width: 15 },
      { header: t('projectDetail.taskEstHours'), key: 'estimatedHours', width: 12 },
      { header: t('projectDetail.taskActualHours'), key: 'actualHours', width: 12 },
      { header: t('projectDetail.activityCode'), key: 'activityCode', width: 15 }
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' }
    };

    filteredTasks.forEach(task => {
      worksheet.addRow({
        ...task,
        status: getStatusLabel(task.status),
        priority: getPriorityLabel(task.priority)
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    saveAs(blob, `Tasks_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export Empty Template
  const handleExportTemplate = async () => {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet(t('projectDetail.tasksPageTitle'));

    worksheet.columns = [
      { header: `${t('projectDetail.taskCode')}*`, key: 'code', width: 15 },
      { header: `${t('projectDetail.taskTitle')}*`, key: 'title', width: 40 },
      { header: t('projectDetail.taskDescription'), key: 'description', width: 50 },
      { header: t('projectDetail.taskStatus'), key: 'status', width: 15 },
      { header: t('projectDetail.taskPriority'), key: 'priority', width: 12 },
      { header: t('projectDetail.taskAssignedTo'), key: 'assignedTo', width: 20 },
      { header: `${t('projectDetail.taskDueDate')} (YYYY-MM-DD)*`, key: 'dueDate', width: 20 },
      { header: t('projectDetail.taskEstHours'), key: 'estimatedHours', width: 12 },
      { header: t('projectDetail.taskActualHours'), key: 'actualHours', width: 12 },
      { header: t('projectDetail.activityCode'), key: 'activityCode', width: 15 }
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF059669' }
    };

    worksheet.addRow({
      code: 'TASK-001',
      title: 'Example Task',
      description: 'Task description here',
      status: getStatusLabel('In Progress'),
      priority: getPriorityLabel('High'),
      assignedTo: 'John Doe',
      dueDate: '2024-03-31',
      estimatedHours: '20',
      actualHours: '10',
      activityCode: 'ACT-001'
    });

    // Data validation
    const statusOptions = `"${getStatusLabel('To Do')},${getStatusLabel('In Progress')},${getStatusLabel('Review')},${getStatusLabel('Completed')}"`;
    worksheet.getColumn('status').eachCell({ includeEmpty: true }, (cell, rowNumber) => {
      if (rowNumber > 1) {
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [statusOptions]
        };
      }
    });

    const priorityOptions = `"${getPriorityLabel('Low')},${getPriorityLabel('Medium')},${getPriorityLabel('High')},${getPriorityLabel('Urgent')}"`;
    worksheet.getColumn('priority').eachCell({ includeEmpty: true }, (cell, rowNumber) => {
      if (rowNumber > 1) {
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [priorityOptions]
        };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    saveAs(blob, 'Tasks_Template_Empty.xlsx');
  };

  // Import from Excel
  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const workbook = new Workbook();
    const arrayBuffer = await file.arrayBuffer();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];
    const importedData: Task[] = [];
    const errors: string[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const code = row.getCell(1).value?.toString() || '';
      const title = row.getCell(2).value?.toString() || '';
      const dueDate = row.getCell(7).value?.toString() || '';

      if (!code) errors.push(`${t('projectDetail.row')} ${rowNumber}: ${t('projectDetail.taskCodeRequired')}`);
      if (!title) errors.push(`${t('projectDetail.row')} ${rowNumber}: ${t('projectDetail.taskTitleRequired')}`);
      if (!dueDate) errors.push(`${t('projectDetail.row')} ${rowNumber}: ${t('projectDetail.taskDueDateRequired')}`);

      importedData.push({
        id: `imported-${Date.now()}-${rowNumber}`,
        code,
        title,
        description: row.getCell(3).value?.toString() || '',
        status: (row.getCell(4).value?.toString() || 'To Do') as Task['status'],
        priority: (row.getCell(5).value?.toString() || 'Medium') as Task['priority'],
        assignedTo: row.getCell(6).value?.toString() || '',
        dueDate,
        estimatedHours: parseFloat(row.getCell(8).value?.toString() || '0'),
        actualHours: parseFloat(row.getCell(9).value?.toString() || '0'),
        activityCode: row.getCell(10).value?.toString() || ''
      });
    });

    if (errors.length > 0) {
      alert(`${t('projectDetail.importErrors')}:\n${errors.join('\n')}`);
      return;
    }

    setTasks([...tasks, ...importedData]);
    alert(t('projectDetail.tasksImportedSuccess').replace('{count}', importedData.length.toString()));
    setShowImportModal(false);
  };

  const handleCreate = () => {
    if (!formData.code || !formData.title || !formData.dueDate) {
      alert(t('projectDetail.fillRequiredFields'));
      return;
    }

    const newTask: Task = {
      id: `task-${Date.now()}`,
      ...formData
    };

    setTasks([...tasks, newTask]);
    setShowCreateModal(false);
    resetForm();
    alert(t('projectDetail.taskCreatedSuccess'));
  };

  const handleEdit = () => {
    if (!selectedTask) return;

    setTasks(tasks.map(task => 
      task.id === selectedTask.id ? { ...selectedTask, ...formData } : task
    ));
    setShowEditModal(false);
    setSelectedTask(null);
    resetForm();
    alert(t('projectDetail.taskUpdatedSuccess'));
  };

  const handleDelete = () => {
    if (!selectedTask) return;
    
    setTasks(tasks.filter(task => task.id !== selectedTask.id));
    setShowDeleteConfirm(false);
    setSelectedTask(null);
    alert(t('projectDetail.taskDeletedSuccess'));
  };

  const resetForm = () => {
    setFormData({
      code: '',
      title: '',
      description: '',
      status: 'To Do',
      priority: 'Medium',
      assignedTo: '',
      dueDate: '',
      estimatedHours: 0,
      actualHours: 0,
      activityCode: ''
    });
  };

  const openEditModal = (task: Task) => {
    setSelectedTask(task);
    setFormData(task);
    setShowEditModal(true);
  };

  const openDeleteConfirm = (task: Task) => {
    setSelectedTask(task);
    setShowDeleteConfirm(true);
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-100 text-red-700';
      case 'High': return 'bg-orange-100 text-orange-700';
      case 'Medium': return 'bg-yellow-100 text-yellow-700';
      case 'Low': return 'bg-green-100 text-green-700';
    }
  };

  const getPriorityIcon = (priority: Task['priority']) => {
    switch (priority) {
      case 'Urgent': return <AlertCircle className="w-3 h-3" />;
      case 'High': return <AlertCircle className="w-3 h-3" />;
      case 'Medium': return <Clock className="w-3 h-3" />;
      case 'Low': return <CheckCircle2 className="w-3 h-3" />;
    }
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="space-y-6">
      {/* Header */}
      <div className={`flex items-center justify-between mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h2 className="text-sm font-semibold text-gray-900">{t('projectDetail.tasksPageTitle')}</h2>
          <p className="text-xs text-gray-600 mt-0.5">{t('projectDetail.tasksPageSubtitle')}</p>
        </div>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => setViewMode(viewMode === 'kanban' ? 'table' : 'kanban')}
            className={`px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            {viewMode === 'kanban' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
            {viewMode === 'kanban' ? t('projectDetail.tableView') : t('projectDetail.kanbanView')}
          </button>
          <button
            onClick={handleExportExcel}
            disabled={filteredTasks.length === 0}
            className={`px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Download className="w-4 h-4" />
            {t('projectDetail.exportData')}
          </button>
          <button
            onClick={handleExportTemplate}
            className={`px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            {t('projectDetail.exportTemplate')}
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
            {t('projectDetail.addTask')}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 ${isRTL ? 'end-3' : 'start-3'}`} />
        <input
          type="text"
          placeholder={t('projectDetail.searchTasks')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'pe-10 ps-4 text-right' : 'ps-10 pe-4 text-left'}`}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className={`text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.totalTasks')}</div>
          <div className="text-2xl font-bold text-gray-900" dir="ltr">{tasks.length}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className={`text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.statusInProgress')}</div>
          <div className="text-2xl font-bold text-blue-600" dir="ltr">
            {tasks.filter(t => t.status === 'In Progress').length}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className={`text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.statusCompleted')}</div>
          <div className="text-2xl font-bold text-green-600" dir="ltr">
            {tasks.filter(t => t.status === 'Completed').length}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className={`text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.totalEstHours')}</div>
          <div className="text-2xl font-bold text-gray-900" dir="ltr">
            {tasks.reduce((sum, t) => sum + t.estimatedHours, 0)}h
          </div>
        </div>
      </div>

      {/* Kanban or Table View */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
            <div key={status} className="bg-gray-50 rounded-lg p-4">
              <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <h3 className={`font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {getStatusLabel(status as Task['status'])}
                </h3>
                <span className="text-sm text-gray-600" dir="ltr">{statusTasks.length}</span>
              </div>
              <div className="space-y-3">
                {statusTasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                  >
                    <div className={`flex items-start justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className="text-xs text-gray-500 mb-1" dir="ltr">{task.code}</div>
                        <h4 className="font-medium text-gray-900 text-sm">{task.title}</h4>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${getPriorityColor(task.priority)}`}>
                        {getPriorityIcon(task.priority)}
                        {getPriorityLabel(task.priority)}
                      </span>
                    </div>
                    <p className={`text-xs text-gray-600 mb-3 line-clamp-2 ${isRTL ? 'text-right' : 'text-left'}`}>{task.description}</p>
                    <div className={`flex items-center justify-between text-xs text-gray-500 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span>{task.assignedTo}</span>
                      <span dir="ltr">{task.dueDate}</span>
                    </div>
                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <button
                        onClick={() => openEditModal(task)}
                        className={`flex-1 px-2 py-1 text-xs text-blue-600 border border-blue-200 rounded hover:bg-blue-50 flex items-center justify-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        <Edit2 className="w-3 h-3" />
                        {t('common.edit')}
                      </button>
                      <button
                        onClick={() => openDeleteConfirm(task)}
                        className={`flex-1 px-2 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 flex items-center justify-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        <Trash2 className="w-3 h-3" />
                        {t('common.delete')}
                      </button>
                    </div>
                  </div>
                ))}
                {statusTasks.length === 0 && (
                  <div className="text-center text-sm text-gray-400 py-8">
                    {t('projectDetail.noTasksFound')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.taskCode')}</th>
                  <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.taskTitle')}</th>
                  <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.taskStatus')}</th>
                  <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.taskPriority')}</th>
                  <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.taskAssignedTo')}</th>
                  <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.taskDueDate')}</th>
                  <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.taskHours')}</th>
                  <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      {t('projectDetail.noTasksFoundClickAdd')}
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">{task.code}</td>
                      <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className="font-medium text-gray-900">{task.title}</div>
                        <div className="text-xs text-gray-500" dir="ltr">{task.activityCode}</div>
                      </td>
                      <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          task.status === 'Completed' ? 'bg-green-100 text-green-700' :
                          task.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                          task.status === 'Review' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {getStatusLabel(task.status)}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 w-fit ${getPriorityColor(task.priority)} ${isRTL ? 'flex-row-reverse' : ''}`}>
                          {getPriorityIcon(task.priority)}
                          {getPriorityLabel(task.priority)}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{task.assignedTo}</td>
                      <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">{task.dueDate}</td>
                      <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">
                        {task.actualHours}/{task.estimatedHours}h
                      </td>
                      <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <button
                            onClick={() => openEditModal(task)}
                            className="text-blue-600 hover:text-blue-800"
                            title={t('common.edit')}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteConfirm(task)}
                            className="text-red-600 hover:text-red-800"
                            title={t('common.delete')}
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
      )}

      {/* Modals */}
      {showCreateModal && (
        <Modal title={t('projectDetail.addTask')} onClose={() => { setShowCreateModal(false); resetForm(); }}>
          <TaskForm
            formData={formData}
            onChange={setFormData}
            onSubmit={handleCreate}
            onCancel={() => { setShowCreateModal(false); resetForm(); }}
          />
        </Modal>
      )}

      {showEditModal && (
        <Modal title={t('projectDetail.editTask')} onClose={() => { setShowEditModal(false); setSelectedTask(null); resetForm(); }}>
          <TaskForm
            formData={formData}
            onChange={setFormData}
            onSubmit={handleEdit}
            onCancel={() => { setShowEditModal(false); setSelectedTask(null); resetForm(); }}
            isEdit
          />
        </Modal>
      )}

      {showImportModal && (
        <Modal title={t('projectDetail.importTasksTitle')} onClose={() => setShowImportModal(false)}>
          <div>
            <p className={`text-sm text-gray-600 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('projectDetail.importTasksDescription')}
            </p>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportExcel}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <div className={`mt-4 flex justify-end gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showDeleteConfirm && selectedTask && (
        <Modal title={t('common.confirmDelete')} onClose={() => { setShowDeleteConfirm(false); setSelectedTask(null); }}>
          <div>
            <p className={`text-sm text-gray-600 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('projectDetail.deleteTaskConfirm').replace('{title}', selectedTask.title)}
            </p>
            <div className={`flex items-center justify-end gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => { setShowDeleteConfirm(false); setSelectedTask(null); }}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Modal Component (reusable)
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className={`flex items-center justify-between p-6 border-b border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h3 className={`text-lg font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// Task Form Component
interface TaskFormProps {
  formData: Omit<Task, 'id'>;
  onChange: (data: Omit<Task, 'id'>) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isEdit?: boolean;
}

function TaskForm({ formData, onChange, onSubmit, onCancel, isEdit }: TaskFormProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n?.language === 'ar';

  const getStatusLabel = (status: Task['status']) => {
    switch (status) {
      case 'To Do': return t('projectDetail.taskStatusToDo');
      case 'In Progress': return t('projectDetail.taskStatusInProgress');
      case 'Review': return t('projectDetail.taskStatusReview');
      case 'Completed': return t('projectDetail.taskStatusCompleted');
    }
  };

  const getPriorityLabel = (priority: Task['priority']) => {
    switch (priority) {
      case 'Low': return t('projectDetail.taskPriorityLow');
      case 'Medium': return t('projectDetail.taskPriorityMedium');
      case 'High': return t('projectDetail.taskPriorityHigh');
      case 'Urgent': return t('projectDetail.taskPriorityUrgent');
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('projectDetail.taskCode')}*
          </label>
          <input
            type="text"
            required
            value={formData.code}
            onChange={(e) => onChange({ ...formData, code: e.target.value })}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
            dir="ltr"
          />
        </div>
        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('projectDetail.activityCode')}
          </label>
          <input
            type="text"
            value={formData.activityCode}
            onChange={(e) => onChange({ ...formData, activityCode: e.target.value })}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
            dir="ltr"
          />
        </div>
      </div>

      <div>
        <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('projectDetail.taskTitle')}*
        </label>
        <input
          type="text"
          required
          value={formData.title}
          onChange={(e) => onChange({ ...formData, title: e.target.value })}
          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
        />
      </div>

      <div>
        <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('projectDetail.taskDescription')}
        </label>
        <textarea
          rows={3}
          value={formData.description}
          onChange={(e) => onChange({ ...formData, description: e.target.value })}
          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('projectDetail.taskStatus')}
          </label>
          <select
            value={formData.status}
            onChange={(e) => onChange({ ...formData, status: e.target.value as Task['status'] })}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
          >
            <option value="To Do">{getStatusLabel('To Do')}</option>
            <option value="In Progress">{getStatusLabel('In Progress')}</option>
            <option value="Review">{getStatusLabel('Review')}</option>
            <option value="Completed">{getStatusLabel('Completed')}</option>
          </select>
        </div>
        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('projectDetail.taskPriority')}
          </label>
          <select
            value={formData.priority}
            onChange={(e) => onChange({ ...formData, priority: e.target.value as Task['priority'] })}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
          >
            <option value="Low">{getPriorityLabel('Low')}</option>
            <option value="Medium">{getPriorityLabel('Medium')}</option>
            <option value="High">{getPriorityLabel('High')}</option>
            <option value="Urgent">{getPriorityLabel('Urgent')}</option>
          </select>
        </div>
        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('projectDetail.taskDueDate')}*
          </label>
          <input
            type="date"
            required
            value={formData.dueDate}
            onChange={(e) => onChange({ ...formData, dueDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
            dir="ltr"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('projectDetail.taskAssignedTo')}
          </label>
          <input
            type="text"
            value={formData.assignedTo}
            onChange={(e) => onChange({ ...formData, assignedTo: e.target.value })}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
          />
        </div>
        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('projectDetail.taskEstHours')}
          </label>
          <input
            type="number"
            min="0"
            value={formData.estimatedHours}
            onChange={(e) => onChange({ ...formData, estimatedHours: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
            dir="ltr"
          />
        </div>
        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('projectDetail.taskActualHours')}
          </label>
          <input
            type="number"
            min="0"
            value={formData.actualHours}
            onChange={(e) => onChange({ ...formData, actualHours: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
            dir="ltr"
          />
        </div>
      </div>

      <div className={`flex items-center justify-end gap-2 pt-4 border-t border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90"
        >
          {isEdit ? t('projectDetail.updateTask') : t('projectDetail.createTask')}
        </button>
      </div>
    </form>
  );
}