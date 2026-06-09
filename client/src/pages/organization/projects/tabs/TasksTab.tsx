import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { 
 Plus, Download, Upload, FileSpreadsheet, Edit2, Trash2, X, Search, Filter,
 AlertCircle, CheckCircle2, Clock, List, LayoutGrid, User, Mail
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { useAuth } from '@/_core/hooks/useAuth';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';
import { exportToStandardExcel, exportExcelTemplate, type ExcelColumn } from '@/lib/standardExcelExport';
import { UnifiedExportButton } from '@/components/exports/UnifiedExportButton';
import { PreImportPreviewDialog } from '@/components/PreImportPreviewDialog';
import { validateImportData } from '@/lib/clientSideValidation';
import { TASKS_CONFIG } from '@shared/importConfigs/tasks';
import { generateTasksTemplate } from '@/lib/templateGenerator';
import { TasksTabSkeleton } from "@/components/ProjectTabSkeletons";

// Helper function to format dates
const formatDate = (date: Date | string | null | undefined): string => {
 if (!date) return '';
 if (date instanceof Date) {
 return date.toISOString().split('T')[0];
 }
 if (typeof date === 'string') {
 const parsed = new Date(date);
 if (!isNaN(parsed.getTime())) {
 return parsed.toISOString().split('T')[0];
 }
 return date;
 }
 return '';
};

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Task type matches database schema
interface Task {
 id: number;
 projectId: number;
 organizationId: number;
 operatingUnitId: number | null;
 taskCode: string | null;
 taskName: string;
 taskNameAr: string | null;
 description: string | null;
 descriptionAr: string | null;
 status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'BLOCKED';
 priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
 startDate: string | null;
 dueDate: string | null;
 completedDate: string | null;
 // Assignment Accountability Model fields
 assignedByEmail: string | null;
 assignedByName: string | null;
 assignedToEmail: string | null;
 assignedToName: string | null;
 assignmentDate: string | null;
 assignedTo: number | null;
 progressPercentage: string;
 tags: string[] | null;
 category: string | null;
 activityId: number | null;
 isDeleted: boolean;
 deletedAt: string | null;
 deletedBy: number | null;
 createdAt: string;
 updatedAt: string;
 createdBy: number | null;
 updatedBy: number | null;
}

interface TasksTabProps {
 projectId: string;
}

export function TasksTab({
 projectId }: TasksTabProps) {
 const { t } = useTranslation();
 const { isRTL } = useLanguage();
const { user } = useAuth();
 
 // ✅ Load tasks from database via tRPC
 const projectIdNum = parseInt(projectId, 10);
 const { data: tasks = [], isLoading, refetch } = trpc.tasks.getByProject.useQuery({ projectId: projectIdNum });
 
 // Mutations
 const createMutation = trpc.tasks.create.useMutation({
 onSuccess: () => {
 refetch();
 setShowCreateModal(false);
 resetForm();
 },
 onError: (error) => {
 alert(`Error creating task: ${error.message}`);
 },
 });
 
 const updateMutation = trpc.tasks.update.useMutation({
 onSuccess: () => {
 refetch();
 setShowEditModal(false);
 setSelectedTask(null);
 resetForm();
 },
 onError: (error) => {
 alert(`Error updating task: ${error.message}`);
 },
 });
 
 const deleteMutation = trpc.tasks.delete.useMutation({
 onSuccess: () => {
 refetch();
 setShowDeleteConfirm(false);
 setSelectedTask(null);
 },
 });
 
 const bulkImportMutation = trpc.tasks.bulkImport.useMutation({
 onSuccess: (result) => {
 refetch();
 setShowPreviewDialog(false);
 alert(`Successfully imported ${result.imported} tasks. ${result.skipped} skipped.`);
 },
 });

 const [searchTerm, setSearchTerm] = useState('');
 const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
 const [showCreateModal, setShowCreateModal] = useState(false);
 const [showEditModal, setShowEditModal] = useState(false);
 const [showImportModal, setShowImportModal] = useState(false);
 
 // Preview dialog state
 const [showPreviewDialog, setShowPreviewDialog] = useState(false);
 const [validRows, setValidRows] = useState<any[]>([]);
 const [invalidRows, setInvalidRows] = useState<any[]>([]);
 const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
 const [selectedTask, setSelectedTask] = useState<Task | null>(null);

 // Form data with MANDATORY assignment fields
 const [formData, setFormData] = useState({
 taskCode: '',
 taskName: '',
 description: '',
 status: 'TODO' as Task['status'],
 priority: 'MEDIUM' as Task['priority'],
 // MANDATORY Assignment fields
 assignedToName: '',
 assignedToEmail: '',
 dueDate: '',
 startDate: '',
 });

 const filteredTasks = tasks.filter((task: Task) =>
 task.taskName.toLowerCase().includes(searchTerm.toLowerCase()) ||
 (task.taskCode && task.taskCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
 (task.assignedToName && task.assignedToName.toLowerCase().includes(searchTerm.toLowerCase())) ||
 (task.assignedToEmail && task.assignedToEmail.toLowerCase().includes(searchTerm.toLowerCase()))
 );

 const tasksByStatus = {
 'TODO': filteredTasks.filter((t: Task) => t.status === 'TODO'),
 'IN_PROGRESS': filteredTasks.filter((t: Task) => t.status === 'IN_PROGRESS'),
 'REVIEW': filteredTasks.filter((t: Task) => t.status === 'REVIEW'),
 'DONE': filteredTasks.filter((t: Task) => t.status === 'DONE')
 };

 // Helper function to get translated status
 const getStatusLabel = (status: Task['status']) => {
 switch (status) {
 case 'TODO': return t.projectDetail.taskStatusToDo;
 case 'IN_PROGRESS': return t.projectDetail.taskStatusInProgress;
 case 'REVIEW': return t.projectDetail.taskStatusReview;
 case 'DONE': return t.projectDetail.taskStatusCompleted;
 case 'BLOCKED': return 'Blocked';
 }
 };

 // Helper function to get translated priority
 const getPriorityLabel = (priority: Task['priority']) => {
 switch (priority) {
 case 'LOW': return t.projectDetail.taskPriorityLow;
 case 'MEDIUM': return t.projectDetail.taskPriorityMedium;
 case 'HIGH': return t.projectDetail.taskPriorityHigh;
 case 'URGENT': return t.projectDetail.taskPriorityUrgent;
 }
 };

 // Export to Excel
 const handleExportExcel = async () => {
 const exportData = filteredTasks.map((task: Task) => ({
 taskCode: task.taskCode || '',
 taskName: task.taskName,
 description: task.description || '',
 status: getStatusLabel(task.status),
 priority: getPriorityLabel(task.priority),
 assignedToName: task.assignedToName || '',
 assignedToEmail: task.assignedToEmail || '',
 assignedByName: task.assignedByName || '',
 assignedByEmail: task.assignedByEmail || '',
 assignmentDate: formatDate(task.assignmentDate),
 startDate: formatDate(task.startDate),
 dueDate: formatDate(task.dueDate),
 progress: task.progressPercentage,
 }));

 const columns: ExcelColumn[] = [
 { name: t.projectDetail.taskCode, key: 'taskCode', width: 15, type: 'text' },
 { name: t.projectDetail.taskTitle, key: 'taskName', width: 40, type: 'text' },
 { name: t.projectDetail.taskDescription, key: 'description', width: 50, type: 'text' },
 { name: t.projectDetail.taskStatus, key: 'status', width: 15, type: 'text' },
 { name: t.projectDetail.taskPriority, key: 'priority', width: 12, type: 'text' },
 { name: 'Assigned To (Name)', key: 'assignedToName', width: 20, type: 'text' },
 { name: 'Assigned To (Email)', key: 'assignedToEmail', width: 25, type: 'text' },
 { name: 'Assigned By (Name)', key: 'assignedByName', width: 20, type: 'text' },
 { name: 'Assigned By (Email)', key: 'assignedByEmail', width: 25, type: 'text' },
 { name: 'Assignment Date', key: 'assignmentDate', width: 15, type: 'date' },
 { name: 'Start Date', key: 'startDate', width: 15, type: 'date' },
 { name: t.projectDetail.taskDueDate, key: 'dueDate', width: 15, type: 'date' },
 { name: 'Progress %', key: 'progress', width: 12, type: 'number' },
 ];

 await exportToStandardExcel({
 sheetName: t.projectDetail.tasksPageTitle,
 columns,
 data: exportData,
 fileName: `Tasks_Export_${new Date().toISOString().split('T')[0]}`,
 includeTotals: false,
 isRTL,
 });
 };

 // Export Empty Template
 const handleExportTemplate = async () => {
 const columns: ExcelColumn[] = [
 { name: `${t.projectDetail.taskCode}`, key: 'taskCode', width: 15, type: 'text' },
 { name: `${t.projectDetail.taskTitle}*`, key: 'taskName', width: 40, type: 'text' },
 { name: t.projectDetail.taskDescription, key: 'description', width: 50, type: 'text' },
 { name: t.projectDetail.taskStatus, key: 'status', width: 15, type: 'text' },
 { name: t.projectDetail.taskPriority, key: 'priority', width: 12, type: 'text' },
 { name: 'Assigned To Name*', key: 'assignedToName', width: 20, type: 'text' },
 { name: 'Assigned To Email*', key: 'assignedToEmail', width: 25, type: 'text' },
 { name: 'Start Date (YYYY-MM-DD)', key: 'startDate', width: 20, type: 'date' },
 { name: `${t.projectDetail.taskDueDate} (YYYY-MM-DD)`, key: 'dueDate', width: 20, type: 'date' },
 ];

 await exportExcelTemplate({
 sheetName: t.projectDetail.tasksPageTitle,
 columns,
 fileName: 'Tasks_Template',
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
 TASKS_CONFIG.columns.forEach((col, index) => {
 rowData[col.key] = row.getCell(index + 1).value?.toString() || '';
 });
 rawData.push(rowData);
 });

 // Validate using shared framework
 const { validRows: valid, invalidRows: invalid } = validateImportData(
 rawData,
 TASKS_CONFIG
 );

 setValidRows(valid);
 setInvalidRows(invalid);
 setShowImportModal(false);
 setShowPreviewDialog(true);
 } catch (error) {
 console.error('Import error:', error);
 alert('Import failed. Please check your file format.');
 }
 };

 // Confirm import after preview
 const handleConfirmImport = () => {
 bulkImportMutation.mutate({
 projectId: projectIdNum,
 rows: validRows,
 });
 };

 // Validate assignment fields before create
 const validateAssignment = (): boolean => {
 if (!formData.assignedToName || formData.assignedToName.trim() === '') {
 alert('Assignee Name is required. Please enter the name of the person responsible for this task.');
 return false;
 }
 if (!formData.assignedToEmail || formData.assignedToEmail.trim() === '') {
 alert('Assignee Email is required. Email is the unique identifier for accountability.');
 return false;
 }
 if (!emailRegex.test(formData.assignedToEmail)) {
 alert('Invalid email format. Please enter a valid email address for the assignee.');
 return false;
 }
 return true;
 };

 const handleCreate = () => {
 if (!formData.taskName) {
 alert(t.projectDetail.fillRequiredFields);
 return;
 }

 // MANDATORY: Validate assignment fields
 if (!validateAssignment()) {
 return;
 }

 createMutation.mutate({
 projectId: projectIdNum,
 taskCode: formData.taskCode || undefined,
 taskName: formData.taskName,
 description: formData.description || undefined,
 status: formData.status,
 priority: formData.priority,
 assignedToName: formData.assignedToName,
 assignedToEmail: formData.assignedToEmail,
 dueDate: formData.dueDate || undefined,
 startDate: formData.startDate || undefined,
 });
 };

 const handleEdit = () => {
 if (!selectedTask) return;

 // Validate assignment if changing assignee
 if (formData.assignedToEmail && !emailRegex.test(formData.assignedToEmail)) {
 alert('Invalid email format. Please enter a valid email address for the assignee.');
 return;
 }

 updateMutation.mutate({
 id: selectedTask.id,
 taskName: formData.taskName,
 description: formData.description || undefined,
 status: formData.status,
 priority: formData.priority,
 assignedToName: formData.assignedToName || undefined,
 assignedToEmail: formData.assignedToEmail || undefined,
 dueDate: formData.dueDate || undefined,
 startDate: formData.startDate || undefined,
 });
 };

 const handleDelete = () => {
 if (!selectedTask) return;
 deleteMutation.mutate({ id: selectedTask.id });
 };

 const resetForm = () => {
 setFormData({
 taskCode: '',
 taskName: '',
 description: '',
 status: 'TODO',
 priority: 'MEDIUM',
 assignedToName: '',
 assignedToEmail: '',
 dueDate: '',
 startDate: '',
 });
 };

 const openEditModal = (task: Task) => {
 setSelectedTask(task);
 setFormData({
 taskCode: task.taskCode || '',
 taskName: task.taskName,
 description: task.description || '',
 status: task.status,
 priority: task.priority,
 assignedToName: task.assignedToName || '',
 assignedToEmail: task.assignedToEmail || '',
 dueDate: formatDate(task.dueDate),
 startDate: formatDate(task.startDate),
 });
 setShowEditModal(true);
 };

 const openDeleteConfirm = (task: Task) => {
 setSelectedTask(task);
 setShowDeleteConfirm(true);
 };

 const getPriorityColor = (priority: Task['priority']) => {
 switch (priority) {
 case 'URGENT': return 'bg-red-100 text-red-700';
 case 'HIGH': return 'bg-orange-100 text-orange-700';
 case 'MEDIUM': return 'bg-yellow-100 text-yellow-700';
 case 'LOW': return 'bg-green-100 text-green-700';
 }
 };

 const getPriorityIcon = (priority: Task['priority']) => {
 switch (priority) {
 case 'URGENT': return <AlertCircle className="w-3 h-3" />;
 case 'HIGH': return <AlertCircle className="w-3 h-3" />;
 case 'MEDIUM': return <Clock className="w-3 h-3" />;
 case 'LOW': return <CheckCircle2 className="w-3 h-3" />;
 }
 };

 if (isLoading) {
 return <TasksTabSkeleton />;
 }

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className="flex items-center justify-between mt-6">
 <div className="text-start">
 <h2 className="text-sm font-semibold text-gray-900">{t.projectDetail.tasksPageTitle}</h2>
 <p className="text-xs text-gray-600 mt-0.5">{t.projectDetail.tasksPageSubtitle}</p>
 </div>
 <div className="flex items-center gap-2">
 <button
 onClick={() => setViewMode(viewMode === 'kanban' ? 'table' : 'kanban')}
 className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
 >
 {viewMode === 'kanban' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
 {viewMode === 'kanban' ? t.projectDetail.tableView : t.projectDetail.kanbanView}
 </button>
 <UnifiedExportButton
 hasData={filteredTasks.length > 0}
 onExportData={handleExportExcel}
 onExportTemplate={handleExportTemplate}
 moduleName="Tasks"
 showModal={true}
 />
 <button
 onClick={() => setShowImportModal(true)}
 className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
 >
 <Upload className="w-4 h-4" />
 {t.projectDetail.importActivities}
 </button>
 <button
 onClick={() => setShowCreateModal(true)}
 className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2"
 >
 <Plus className="w-4 h-4" />
 {t.projectDetail.addTask}
 </button>
 </div>
 </div>

 {/* Search */}
 <div className="relative">
 <Search className="absolute top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 start-3" />
 <input
 type="text"
 placeholder={t.projectDetail.searchTasks}
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full py-2 ps-10 pe-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start"
 />
 </div>

 {/* Summary Cards */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div className="bg-white border border-gray-200 rounded-lg p-4">
 <div className="text-sm text-gray-600 text-start">{t.projectDetail.totalTasks}</div>
 <div className="ltr-safe text-2xl font-bold text-gray-900">{tasks.length}</div>
 </div>
 <div className="bg-white border border-gray-200 rounded-lg p-4">
 <div className="text-sm text-gray-600 text-start">{t.projectDetail.statusInProgress}</div>
 <div className="ltr-safe text-2xl font-bold text-blue-600">
 {tasks.filter((t: Task) => t.status === 'IN_PROGRESS').length}
 </div>
 </div>
 <div className="bg-white border border-gray-200 rounded-lg p-4">
 <div className="text-sm text-gray-600 text-start">{t.projectDetail.statusCompleted}</div>
 <div className="ltr-safe text-2xl font-bold text-green-600">
 {tasks.filter((t: Task) => t.status === 'DONE').length}
 </div>
 </div>
 <div className="bg-white border border-gray-200 rounded-lg p-4">
 <div className="text-sm text-gray-600 text-start">Review</div>
 <div className="ltr-safe text-2xl font-bold text-purple-600">
 {tasks.filter((t: Task) => t.status === 'REVIEW').length}
 </div>
 </div>
 </div>

 {/* Kanban or Table View */}
 {viewMode === 'kanban' ? (
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 {(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as const).map((status) => (
 <div key={status} className="bg-gray-50 rounded-lg p-4">
 <div className="flex items-center justify-between mb-4">
 <h3 className="font-semibold text-gray-900">{getStatusLabel(status)}</h3>
 <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded">
 {tasksByStatus[status].length}
 </span>
 </div>
 <div className="space-y-3">
 {tasksByStatus[status].map((task: Task) => (
 <div
 key={task.id}
 className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
 onClick={() => openEditModal(task)}
 >
 <div className="flex items-start justify-between">
 <div className="flex-1 text-start">
 <h4 className="font-medium text-gray-900 text-sm">{isRTL ? task.taskNameAr || task.taskName : task.taskName}</h4>
 {task.taskCode && (
 <p className="ltr-safe text-xs text-gray-500 mt-1">{task.taskCode}</p>
 )}
 </div>
 <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${getPriorityColor(task.priority)}`}>
 {getPriorityIcon(task.priority)}
 {getPriorityLabel(task.priority)}
 </span>
 </div>
 {/* Assignment Info */}
 {task.assignedToName && (
 <div className="mt-2 flex items-center gap-1 text-xs text-gray-600">
 <User className="w-3 h-3" />
 <span>{task.assignedToName}</span>
 </div>
 )}
 {task.assignedToEmail && (
 <div className="flex items-center gap-1 text-xs text-gray-500">
 <Mail className="w-3 h-3" />
 <span className="ltr-safe">{task.assignedToEmail}</span>
 </div>
 )}
 {task.dueDate && (
 <div className="mt-2 text-xs text-gray-500 text-start">
 {t.projectDetail.taskDueDate}: <span className="ltr-safe">{formatDate(task.dueDate)}</span>
 </div>
 )}
 <div className="mt-2 flex items-center justify-end gap-2">
 <button
 onClick={(e) => { e.stopPropagation(); openEditModal(task); }}
 className="text-blue-600 hover:text-blue-800"
 title={t.common.edit}
 >
 <Edit2 className="w-4 h-4" />
 </button>
 <button
 onClick={(e) => { e.stopPropagation(); openDeleteConfirm(task); }}
 className="text-red-600 hover:text-red-800"
 title={t.common.delete}
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 </div>
 ))}
 {tasksByStatus[status].length === 0 && (
 <div className="text-center text-gray-400 text-sm py-4">
 {t.projectDetail.noTasks}
 </div>
 )}
 </div>
 </div>
 ))}
 </div>
 ) : (
 <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50">
 <tr>
 <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-start">{t.projectDetail.taskCode}</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-start">{t.projectDetail.taskTitle}</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-start">{t.projectDetail.taskStatus}</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-start">{t.projectDetail.taskPriority}</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-start">Assigned To</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-start">Assigned By</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-start">{t.projectDetail.taskDueDate}</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-start">{t.common.actions}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {filteredTasks.length === 0 ? (
 <tr>
 <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
 {t.projectDetail.noTasks}
 </td>
 </tr>
 ) : (
 filteredTasks.map((task: Task) => (
 <tr key={task.id} className="hover:bg-gray-50">
 <td className="ltr-safe px-4 py-3 text-sm text-start">{task.taskCode || '-'}</td>
 <td className="px-4 py-3 text-sm font-medium text-start">{isRTL ? task.taskNameAr || task.taskName : task.taskName}</td>
 <td className="px-4 py-3 text-sm text-start">
 <span className={`px-2 py-1 rounded-full text-xs ${ task.status === 'DONE' ? 'bg-green-100 text-green-700' : task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : task.status === 'REVIEW' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700' }`}>
 {getStatusLabel(task.status)}
 </span>
 </td>
 <td className="px-4 py-3 text-sm text-start">
 <span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 w-fit ${getPriorityColor(task.priority)}`}>
 {getPriorityIcon(task.priority)}
 {getPriorityLabel(task.priority)}
 </span>
 </td>
 <td className="px-4 py-3 text-sm text-start">
 <div>
 <div>{task.assignedToName || '-'}</div>
 {task.assignedToEmail && (
 <div className="ltr-safe text-xs text-gray-500">{task.assignedToEmail}</div>
 )}
 </div>
 </td>
 <td className="px-4 py-3 text-sm text-start">
 <div>
 <div>{task.assignedByName || '-'}</div>
 {task.assignedByEmail && (
 <div className="ltr-safe text-xs text-gray-500">{task.assignedByEmail}</div>
 )}
 </div>
 </td>
 <td className="ltr-safe px-4 py-3 text-sm text-start">{formatDate(task.dueDate) || '-'}</td>
 <td className="px-4 py-3 text-sm text-start">
 <div className="flex items-center gap-2">
 <button
 onClick={() => openEditModal(task)}
 className="text-blue-600 hover:text-blue-800"
 title={t.common.edit}
 >
 <Edit2 className="w-4 h-4" />
 </button>
 <button
 onClick={() => openDeleteConfirm(task)}
 className="text-red-600 hover:text-red-800"
 title={t.common.delete}
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
 <Modal title={t.projectDetail.addTask} onClose={() => { setShowCreateModal(false); resetForm(); }}>
 <TaskForm
 formData={formData}
 onChange={setFormData}
 onSubmit={handleCreate}
 onCancel={() => { setShowCreateModal(false); resetForm(); }}
 isLoading={createMutation.isPending}
 currentUser={user}
 />
 </Modal>
 )}

 {showEditModal && (
 <Modal title={t.projectDetail.editTask} onClose={() => { setShowEditModal(false); setSelectedTask(null); resetForm(); }}>
 <TaskForm
 formData={formData}
 onChange={setFormData}
 onSubmit={handleEdit}
 onCancel={() => { setShowEditModal(false); setSelectedTask(null); resetForm(); }}
 isEdit
 isLoading={updateMutation.isPending}
 currentUser={user}
 existingTask={selectedTask}
 />
 </Modal>
 )}

 {showImportModal && (
 <Modal title={t.projectDetail.importTasksTitle} onClose={() => setShowImportModal(false)}>
 <div>
 <p className={`text-sm text-gray-600 mb-4 text-start`}>
 {t.projectDetail.importTasksDescription}
 </p>
 <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
 <p className="text-sm text-yellow-800">
 <strong>Note:</strong> Imported tasks require "Assigned To Name" and "Assigned To Email" columns for accountability compliance.
 </p>
 </div>
 <input
 type="file"
 accept=".xlsx,.xls"
 onChange={handleImportExcel}
 className="w-full px-3 py-2 border border-gray-300 rounded-md"
 />
 <div className={`mt-4 flex justify-end gap-2`}>
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

 {showDeleteConfirm && selectedTask && (
 <Modal title={t.common.confirmDelete} onClose={() => { setShowDeleteConfirm(false); setSelectedTask(null); }}>
 <div>
 <p className={`text-sm text-gray-600 mb-4 text-start`}>
 {t.projectDetail.deleteTaskConfirm.replace('{title}', selectedTask.taskName)}
 </p>
 <div className={`flex items-center justify-end gap-2`}>
 <button
 onClick={() => { setShowDeleteConfirm(false); setSelectedTask(null); }}
 className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
 >
 {t.common.cancel}
 </button>
 <button
 onClick={handleDelete}
 disabled={deleteMutation.isPending}
 className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
 >
 {deleteMutation.isPending ? 'Deleting...' : t.common.delete}
 </button>
 </div>
 </div>
 </Modal>
 )}
 
 {/* Preview Dialog */}
 <PreImportPreviewDialog
 isOpen={showPreviewDialog}
 onClose={() => setShowPreviewDialog(false)}
 validRows={validRows}
 invalidRows={invalidRows}
 onConfirm={handleConfirmImport}
 moduleName="Tasks"
 config={TASKS_CONFIG}
 />
 </div>
 );
}

// Modal Component (reusable)
function Modal({
 
 title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
 
 return (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
 <div className={`flex items-center justify-between p-6 border-b border-gray-200`}>
 <h3 className={`text-lg font-semibold text-gray-900 text-start`}>{title}</h3>
 <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
 <X className="w-5 h-5" />
 </button>
 </div>
 <div className="p-6">{children}</div>
 </div>
 </div>
 );
}

// Task Form Component with MANDATORY Assignment Fields
interface TaskFormProps {
 formData: {
 taskCode: string;
 taskName: string;
 description: string;
 status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'BLOCKED';
 priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
 assignedToName: string;
 assignedToEmail: string;
 dueDate: string;
 startDate: string;
 };
 onChange: (data: TaskFormProps['formData']) => void;
 onSubmit: () => void;
 onCancel: () => void;
 isEdit?: boolean;
 isLoading?: boolean;
 currentUser?: { name?: string | null; email?: string | null } | null;
 existingTask?: Task | null;
}

function TaskForm({
  formData, onChange, onSubmit, onCancel, isEdit, isLoading, currentUser, existingTask }: TaskFormProps) {
  const { t } = useTranslation();
const getStatusLabel = (status: string) => {
 switch (status) {
 case 'TODO': return t.projectDetail.taskStatusToDo;
 case 'IN_PROGRESS': return t.projectDetail.taskStatusInProgress;
 case 'REVIEW': return t.projectDetail.taskStatusReview;
 case 'DONE': return t.projectDetail.taskStatusCompleted;
 case 'BLOCKED': return 'Blocked';
 default: return status;
 }
 };

 const getPriorityLabel = (priority: string) => {
 switch (priority) {
 case 'LOW': return t.projectDetail.taskPriorityLow;
 case 'MEDIUM': return t.projectDetail.taskPriorityMedium;
 case 'HIGH': return t.projectDetail.taskPriorityHigh;
 case 'URGENT': return t.projectDetail.taskPriorityUrgent;
 default: return priority;
 }
 };

 return (
 <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
 {/* Assigned By Section (Read-only) */}
 <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
 <h4 className={`text-sm font-semibold text-blue-800 mb-2 text-start`}>
 {t.projectDetail.assignedBy} (Auto-filled)
 </h4>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={`block text-xs text-blue-600 mb-1 text-start`}>Name</label>
 <div className="px-3 py-2 bg-white border border-blue-200 rounded-md text-sm text-gray-700">
 {isEdit && existingTask?.assignedByName ? existingTask.assignedByName : (currentUser?.name || 'Current User')}
 </div>
 </div>
 <div>
 <label className={`block text-xs text-blue-600 mb-1 text-start`}>Email</label>
 <div className="px-3 py-2 bg-white border border-blue-200 rounded-md text-sm text-gray-700">
 {isEdit && existingTask?.assignedByEmail ? existingTask.assignedByEmail : (currentUser?.email || 'user@example.com')}
 </div>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.taskCode}
 </label>
 <input
 type="text"
 value={formData.taskCode}
 onChange={(e) => onChange({ ...formData, taskCode: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 placeholder={t.placeholders.eGTask001}
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.taskTitle}*
 </label>
 <input
 type="text"
 required
 value={formData.taskName}
 onChange={(e) => onChange({ ...formData, taskName: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 />
 </div>
 </div>

 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.taskDescription}
 </label>
 <textarea
 rows={3}
 value={formData.description}
 onChange={(e) => onChange({ ...formData, description: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 />
 </div>

 {/* MANDATORY: Assigned To Section */}
 <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
 <h4 className={`text-sm font-semibold text-orange-800 mb-2 text-start`}>
 {t.projectDetail.assignTo} (Required)*
 </h4>
 <p className={`text-xs text-orange-600 mb-3 text-start`}>
 Email is the unique identifier for accountability and audit compliance.
 </p>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.assigneeName}*
 </label>
 <input
 type="text"
 required={!isEdit}
 value={formData.assignedToName}
 onChange={(e) => onChange({ ...formData, assignedToName: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 placeholder={t.placeholders.fullNameOfAssignee}
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.assigneeEmail}*
 </label>
 <input
 type="email"
 required={!isEdit}
 value={formData.assignedToEmail}
 onChange={(e) => onChange({ ...formData, assignedToEmail: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 placeholder={t.placeholders.emailExampleCom}
 />
 </div>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.taskStatus}
 </label>
 <select
 value={formData.status}
 onChange={(e) => onChange({ ...formData, status: e.target.value as TaskFormProps['formData']['status'] })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 >
 <option value="TODO">{getStatusLabel('TODO')}</option>
 <option value="IN_PROGRESS">{getStatusLabel('IN_PROGRESS')}</option>
 <option value="REVIEW">{getStatusLabel('REVIEW')}</option>
 <option value="DONE">{getStatusLabel('DONE')}</option>
 <option value="BLOCKED">{getStatusLabel('BLOCKED')}</option>
 </select>
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.taskPriority}
 </label>
 <select
 value={formData.priority}
 onChange={(e) => onChange({ ...formData, priority: e.target.value as TaskFormProps['formData']['priority'] })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 >
 <option value="LOW">{getPriorityLabel('LOW')}</option>
 <option value="MEDIUM">{getPriorityLabel('MEDIUM')}</option>
 <option value="HIGH">{getPriorityLabel('HIGH')}</option>
 <option value="URGENT">{getPriorityLabel('URGENT')}</option>
 </select>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 Start Date
 </label>
 <input
 type="date"
 value={formData.startDate}
 onChange={(e) => onChange({ ...formData, startDate: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectDetail.taskDueDate}
 </label>
 <input
 type="date"
 value={formData.dueDate}
 onChange={(e) => onChange({ ...formData, dueDate: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 />
 </div>
 </div>

 <div className={`flex items-center justify-end gap-2 pt-4 border-t border-gray-200`}>
 <button
 type="button"
 onClick={onCancel}
 className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
 >
 {t.common.cancel}
 </button>
 <button
 type="submit"
 disabled={isLoading}
 className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
 >
 {isLoading ? 'Saving...' : (isEdit ? t.projectDetail.updateTask : t.projectDetail.createTask)}
 </button>
 </div>
 </form>
 );
}
