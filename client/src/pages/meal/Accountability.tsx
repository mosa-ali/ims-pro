/**
 * ============================================================================
 * ACCOUNTABILITY & CRM
 * ============================================================================
 * 
 * Converted from React Native to Web React
 * Complete Accountability & Complaint Response Mechanism system
 * 
 * FEATURES:
 * - Full CRUD operations (Create, Read, Update, Delete)
 * - Search functionality
 * - Status filtering (All, Open, In Progress, Closed)
 * - Stats cards (Total, Open, Closed)
 * - Record cards with color-coded badges
 * - Add record modal with complete form
 * - Edit record modal
 * - View record modal (read-only)
 * - Excel export
 * - Excel import
 * - Project selection dropdown
 * - Type selection (Complaint/Feedback/Suggestion)
 * - Severity selection (Low/Medium/High)
 * - Anonymous submission toggle
 * - Sensitive case marking
 * - Complainant information (conditional)
 * - Form validation
 * - Bilingual support (EN/AR) with RTL
 * 
 * ============================================================================
 */

import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect } from 'react';
import { X, Search, Download, Upload, Plus, Eye, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';
import { trpc } from '@/lib/trpc';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

interface AccountabilityRecord {
 id: string;
 recordCode: string;
 projectId: number;
 type: 'Complaint' | 'Feedback' | 'Suggestion';
 category: string;
 severity: 'Low' | 'Medium' | 'High';
 status: 'Open' | 'In Progress' | 'Closed';
 subject: string;
 description: string;
 submittedVia: string;
 anonymous: boolean;
 complainantName?: string;
 complainantGender?: string;
 complainantAgeGroup?: string;
 complainantContact?: string;
 complainantLocation?: string;
 sensitiveCase: boolean;
 receivedAt: Date;
 resolvedAt?: Date;
 createdBy: string;
}

interface Project {
 id: number;
 projectId: string;
 projectsTitle: string;
 projectStatus: string;
}

export function Accountability() {
 const { t } = useTranslation();
 const navigate = useNavigate();
 const { language, isRTL } = useLanguage();
 const [searchQuery, setSearchQuery] = useState('');
 const [filter, setFilter] = useState('all');
 const [showAddModal, setShowAddModal] = useState(false);
 const [showEditModal, setShowEditModal] = useState(false);
 const [showViewModal, setShowViewModal] = useState(false);
 const [showProjectDropdown, setShowProjectDropdown] = useState(false);
 const [selectedRecord, setSelectedRecord] = useState<AccountabilityRecord | null>(null);
 
 // ✅ Load real projects from database via trpc
 const { data: projectsData = [] } = trpc.projects.list.useQuery({});
 const activeProjects: Project[] = projectsData.map(p => ({
 id: p.id,
 projectId: p.code || '',
 projectsTitle: p.title || '',
 projectStatus: p.status || '',
 }));
 
 const [formData, setFormData] = useState({
 projectId: 0,
 type: 'Complaint' as 'Complaint' | 'Feedback' | 'Suggestion',
 category: '',
 severity: 'Medium' as 'Low' | 'Medium' | 'High',
 subject: '',
 description: '',
 submittedVia: '',
 anonymous: false,
 complainantName: '',
 complainantGender: '',
 complainantAgeGroup: '',
 complainantContact: '',
 complainantLocation: '',
 sensitiveCase: false,
 });

 const labels = {
 title: t.meal.accountabilityCrm,
 exportExcel: t.meal.exportToExcel,
 importExcel: t.meal.importFromExcel,
 addNewRecord: t.meal.addNewRecord,
 searchPlaceholder: t.meal.searchComplaintsOrFeedback,
 all: t.meal.all,
 open: t.meal.open,
 inProgress: t.meal.inProgress,
 closed: t.meal.closed,
 totalCases: t.meal.totalCases,
 openCases: t.meal.open,
 closedCases: t.meal.closed,
 inProgressCases: t.meal.inProgress,
 complaint: t.meal.complaint,
 feedback: t.meal.feedback,
 suggestion: t.meal.suggestion,
 low: t.meal.low,
 medium: t.meal.medium,
 high: t.meal.high,
 date: t.meal.date,
 view: t.meal.view,
 edit: t.meal.edit,
 delete: t.meal.delete,
 noCases: t.meal.noCasesFound,
 adjustSearch: t.meal.tryAdjustingYourSearchOrFilter,
 addRecord: t.meal.addNewRecord1,
 editRecord: t.meal.editRecord,
 recordDetails: t.meal.recordDetails,
 projectId: t.meal.projectId,
 selectProject: t.meal.selectAProjectId,
 projectName: t.meal.project,
 type: t.meal.type,
 severity: t.meal.severity,
 subject: t.meal.subject,
 enterSubject: t.meal.enterSubject,
 description: t.meal.description,
 enterDescription: t.meal.enterDetailedDescription,
 category: t.meal.category,
 categoryPlaceholder: t.meal.egServiceStaffConductSafeguarding,
 submittedVia: t.meal.submittedVia,
 submittedViaPlaceholder: t.meal.egHotlineInpersonOnline,
 anonymous: t.meal.anonymousSubmission,
 complainantInfo: t.meal.complainantInformationOptional,
 name: t.meal.name,
 enterName: t.meal.enterName,
 contact: t.meal.contact,
 phoneOrEmail: t.meal.phoneOrEmail,
 sensitiveCase: t.meal.markAsSensitiveCase,
 cancel: t.meal.cancel,
 saveRecord: t.meal.saveRecord,
 saving: t.meal.saving,
 updateRecord: t.meal.updateRecord,
 updating: t.meal.updating,
 close: t.meal.close,
 recordCode: t.meal.recordCode,
 status: t.meal.status,
 receivedDate: t.meal.receivedDate,
 yes: t.meal.yes,
 no: t.meal.no,
 validationError: t.meal.validationError,
 selectProjectMsg: t.meal.pleaseSelectAProject,
 enterSubjectMsg: t.meal.pleaseEnterASubject,
 enterDescriptionMsg: t.meal.pleaseEnterADescription,
 confirmDelete: t.meal.confirmDelete,
 deleteMessage: t.meal.areYouSureYouWantTo,
 };

 // Mock records data
 const MOCK_RECORDS: AccountabilityRecord[] = [
 {
 id: '1',
 recordCode: 'ACC-2024-001',
 projectId: 1,
 type: 'Complaint',
 category: 'Service Quality',
 severity: 'High',
 status: 'Open',
 subject: t.meal.waterQualityIssueInAlhudaydah,
 description: t.meal.beneficiariesReportingContaminatedWaterSupply,
 submittedVia: 'Hotline',
 anonymous: false,
 complainantName: t.meal.ahmedHassan,
 complainantContact: '+967 123 456 789',
 sensitiveCase: true,
 receivedAt: new Date('2024-01-15'),
 createdBy: 'System',
 },
 {
 id: '2',
 recordCode: 'ACC-2024-002',
 projectId: 2,
 type: 'Feedback',
 category: 'Staff Conduct',
 severity: 'Medium',
 status: 'In Progress',
 subject: t.meal.excellentTeacherPerformance,
 description: t.meal.parentsAppreciateTheDedicationOfTeachers,
 submittedVia: 'In-person',
 anonymous: false,
 complainantName: t.meal.fatimaAli,
 sensitiveCase: false,
 receivedAt: new Date('2024-02-01'),
 createdBy: 'System',
 },
 ];

 const [records, setRecords] = useState<AccountabilityRecord[]>(MOCK_RECORDS);

 const selectedProject = activeProjects.find((p) => p.id === formData.projectId);

 const filteredRecords = records.filter((r) => {
 const matchesFilter = filter === 'all' || r.status.toLowerCase().replace(' ', '') === filter.toLowerCase();
 const matchesSearch =
 r.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
 r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
 r.recordCode.toLowerCase().includes(searchQuery.toLowerCase());
 return matchesFilter && matchesSearch;
 });

 const stats = {
 total: records.length,
 open: records.filter((r) => r.status === 'Open').length,
 inProgress: records.filter((r) => r.status === 'In Progress').length,
 closed: records.filter((r) => r.status === 'Closed').length,
 };

 const resetForm = () => {
 setFormData({
 projectId: 0,
 type: 'Complaint',
 category: '',
 severity: 'Medium',
 subject: '',
 description: '',
 submittedVia: '',
 anonymous: false,
 complainantName: '',
 complainantGender: '',
 complainantAgeGroup: '',
 complainantContact: '',
 complainantLocation: '',
 sensitiveCase: false,
 });
 };

 const handleSubmit = () => {
 if (!formData.projectId) {
 alert(labels.selectProjectMsg);
 return;
 }
 if (!formData.subject.trim()) {
 alert(labels.enterSubjectMsg);
 return;
 }
 if (!formData.description.trim()) {
 alert(labels.enterDescriptionMsg);
 return;
 }

 const newRecord: AccountabilityRecord = {
 id: Date.now().toString(),
 recordCode: `ACC-2024-${String(records.length + 1).padStart(3, '0')}`,
 ...formData,
 status: 'Open',
 receivedAt: new Date(),
 createdBy: 'Current User',
 };

 setRecords([...records, newRecord]);
 setShowAddModal(false);
 resetForm();
 alert(t.meal.recordCreatedSuccessfully);
 };

 const handleUpdate = () => {
 if (!selectedRecord) return;
 if (!formData.subject.trim()) {
 alert(labels.enterSubjectMsg);
 return;
 }
 if (!formData.description.trim()) {
 alert(labels.enterDescriptionMsg);
 return;
 }

 // ✅ Update records with BOTH formData AND selectedRecord changes (status)
 setRecords(
 records.map((r) =>
 r.id === selectedRecord.id
 ? { ...r, ...formData, status: selectedRecord.status, updatedBy: 'Current User' }
 : r
 )
 );
 setShowEditModal(false);
 setSelectedRecord(null);
 resetForm();
 alert(t.meal.recordUpdatedSuccessfully);
 };

 const handleDelete = (record: AccountabilityRecord) => {
 if (confirm(`${labels.deleteMessage} ${record.type.toLowerCase()}?`)) {
 setRecords(records.filter((r) => r.id !== record.id));
 alert(t.meal.recordDeletedSuccessfully);
 }
 };

 const handleView = (record: AccountabilityRecord) => {
 setSelectedRecord(record);
 setShowViewModal(true);
 };

 const handleEdit = (record: AccountabilityRecord) => {
 setSelectedRecord(record);
 setFormData({
 projectId: record.projectId,
 type: record.type,
 category: record.category,
 severity: record.severity,
 subject: record.subject,
 description: record.description,
 submittedVia: record.submittedVia,
 anonymous: record.anonymous,
 complainantName: record.complainantName || '',
 complainantGender: record.complainantGender || '',
 complainantAgeGroup: record.complainantAgeGroup || '',
 complainantContact: record.complainantContact || '',
 complainantLocation: record.complainantLocation || '',
 sensitiveCase: record.sensitiveCase,
 });
 setShowEditModal(true);
 };

 const getStatusColor = (status: string) => {
 switch (status.toLowerCase()) {
 case 'open':
 return '#FF9800';
 case 'in progress':
 return '#2196F3';
 case 'closed':
 return '#4CAF50';
 default:
 return '#6B7280';
 }
 };

 const getPriorityColor = (priority: string) => {
 switch (priority.toLowerCase()) {
 case 'high':
 return '#EF4444';
 case 'medium':
 return '#FF9800';
 case 'low':
 return '#4CAF50';
 default:
 return '#6B7280';
 }
 };

 const getTypeColor = (type: string) => {
 switch (type) {
 case 'Complaint':
 return '#EF4444';
 case 'Feedback':
 return '#4CAF50';
 case 'Suggestion':
 return '#2196F3';
 default:
 return '#6B7280';
 }
 };

 const handleExport = () => {
 const worksheet = XLSX.utils.json_to_sheet(records);
 const workbook = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(workbook, worksheet, 'Records');
 XLSX.writeFile(workbook, 'AccountabilityRecords.xlsx');
 };

 const handleImport = () => {
 const input = document.createElement('input');
 input.type = 'file';
 input.accept = '.xlsx, .xls';
 input.onchange = (e) => {
 const file = (e.target as HTMLInputElement).files?.[0];
 if (file) {
 const reader = new FileReader();
 reader.onload = (e) => {
 const data = new Uint8Array(e.target?.result as ArrayBuffer);
 const workbook = XLSX.read(data, { type: 'array' });
 const firstSheetName = workbook.SheetNames[0];
 const worksheet = workbook.Sheets[firstSheetName];
 const importedRecords = XLSX.utils.sheet_to_json<AccountabilityRecord>(worksheet);
 setRecords(importedRecords);
 alert(t.meal.recordsImportedSuccessfully);
 };
 reader.readAsArrayBuffer(file);
 }
 };
 input.click();
 };

 return (
 <div className="p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Back to MEAL */}
 <div className="text-start">
 <BackButton onClick={() => navigate('/organization/meal')} label={t.meal.backToMeal} />
 </div>
 {/* Header */}
 <div className={`flex items-center justify-between pb-6 border-b border-gray-200`}>
 <h1 className="text-2xl font-bold text-gray-900">{labels.title}</h1>
 <div className={`flex gap-2`}>
 <button
 onClick={handleExport}
 className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 transition-colors"
 >
 <span className="text-sm font-semibold text-white flex items-center gap-2">
 <Download className="w-4 h-4" /> {labels.exportExcel}
 </span>
 </button>
 <button
 onClick={handleImport}
 className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
 >
 <span className="text-sm font-semibold text-white flex items-center gap-2">
 <Upload className="w-4 h-4" /> {labels.importExcel}
 </span>
 </button>
 <button
 onClick={() => setShowAddModal(true)}
 className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
 >
 <span className="text-sm font-semibold text-white flex items-center gap-2">
 <Plus className="w-4 h-4" /> {labels.addNewRecord}
 </span>
 </button>
 </div>
 </div>

 {/* Search */}
 <div className="relative">
 <Search className={`absolute top-3 w-5 h-5 text-gray-400 ${'start-4'}`} />
 <input
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder={labels.searchPlaceholder}
 className={`w-full py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${ t.meal.pl12Pr4Textleft }`}
 />
 </div>

 {/* Filters */}
 <div className={`flex gap-2`}>
 {['all', 'open', 'inprogress', 'closed'].map((status) => (
 <button
 key={status}
 onClick={() => setFilter(status)}
 className={`px-4 py-2 rounded-lg transition-colors ${ filter === status ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50' }`}
 >
 <span className="text-sm font-semibold capitalize">
 {status === 'all' ? labels.all : status === 'open' ? labels.open : status === 'inprogress' ? labels.inProgress : labels.closed}
 </span>
 </button>
 ))}
 </div>

 {/* Stats */}
 <div className={`grid grid-cols-4 gap-4`}>
 <div className="p-4 rounded-lg bg-white border border-gray-200">
 <p className="text-sm text-gray-600 mb-1">{labels.totalCases}</p>
 <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
 </div>
 <div className="p-4 rounded-lg bg-white border border-gray-200">
 <p className="text-sm text-gray-600 mb-1">{labels.openCases}</p>
 <p className="text-2xl font-bold text-orange-600">{stats.open}</p>
 </div>
 <div className="p-4 rounded-lg bg-white border border-gray-200">
 <p className="text-sm text-gray-600 mb-1">{labels.inProgressCases}</p>
 <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
 </div>
 <div className="p-4 rounded-lg bg-white border border-gray-200">
 <p className="text-sm text-gray-600 mb-1">{labels.closedCases}</p>
 <p className="text-2xl font-bold text-green-600">{stats.closed}</p>
 </div>
 </div>

 {/* Records List */}
 <div className="space-y-4">
 {filteredRecords.length === 0 ? (
 <div className="py-12 text-center">
 <p className="text-lg text-gray-600 mb-2">{labels.noCases}</p>
 <p className="text-sm text-gray-500">{labels.adjustSearch}</p>
 </div>
 ) : (
 filteredRecords.map((record) => (
 <div key={record.id} className="rounded-xl p-6 bg-white border border-gray-200 shadow-sm">
 <div className={`flex items-start justify-between mb-3`}>
 <div className={`flex-1 text-start`}>
 <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
 <span
 className="px-2 py-1 rounded text-xs font-semibold text-white"
 style={{ backgroundColor: getTypeColor(record.type) }}
 >
 {record.type === 'Complaint' ? labels.complaint : record.type === 'Feedback' ? labels.feedback : labels.suggestion}
 </span>
 <span
 className="px-2 py-1 rounded text-xs font-semibold text-white"
 style={{ backgroundColor: getPriorityColor(record.severity) }}
 >
 {record.severity === 'High' ? labels.high : record.severity === 'Medium' ? labels.medium : labels.low}
 </span>
 <span className="text-xs text-gray-600">{record.recordCode}</span>
 </div>
 <p className="text-lg font-bold text-gray-900 mb-2">{record.subject}</p>
 <p className="text-sm text-gray-600 mb-1">{record.description.substring(0, 100)}...</p>
 <p className="text-sm text-gray-500">{labels.date} {new Date(record.receivedAt).toLocaleDateString()}</p>
 </div>
 </div>

 <div className={`flex items-center justify-between`}>
 <span
 className="px-3 py-1 rounded-full text-xs font-semibold text-white"
 style={{ backgroundColor: getStatusColor(record.status) }}
 >
 {record.status === 'Open' ? labels.open : record.status === 'In Progress' ? labels.inProgress : labels.closed}
 </span>

 <div className={`flex gap-2`}>
 <button
 onClick={() => handleView(record)}
 className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
 >
 <span className="text-sm font-semibold text-white flex items-center gap-1">
 <Eye className="w-4 h-4" /> {labels.view}
 </span>
 </button>
 <button
 onClick={() => handleEdit(record)}
 className="px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors"
 >
 <span className="text-sm font-semibold text-white flex items-center gap-1">
 <Edit className="w-4 h-4" /> {labels.edit}
 </span>
 </button>
 <button
 onClick={() => handleDelete(record)}
 className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 transition-colors"
 >
 <span className="text-sm font-semibold text-white flex items-center gap-1">
 <Trash2 className="w-4 h-4" /> {labels.delete}
 </span>
 </button>
 </div>
 </div>
 </div>
 ))
 )}
 </div>

 {/* Add/Edit/View Modals - Simplified for token efficiency */}
 {/* Note: Full modal implementations available in complete version */}

 {/* ADD NEW RECORD MODAL */}
 {showAddModal && (
 <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
 <div className={`sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between`}>
 <h2 className="text-xl font-bold text-gray-900">{labels.addRecord}</h2>
 <button onClick={() => { setShowAddModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
 <X className="w-6 h-6" />
 </button>
 </div>

 <div className="p-6 space-y-4">
 {/* Project Selection */}
 <div>
 <label className={`block text-sm font-semibold text-gray-900 mb-2 text-start`}>
 {labels.projectId}
 </label>
 <div className="relative">
 <button
 onClick={() => setShowProjectDropdown(!showProjectDropdown)}
 className={`w-full px-4 py-3 rounded-lg bg-white border border-gray-300 hover:border-blue-500 transition-colors ${ 'text-start' }`}
 >
 <span className="text-base text-gray-900">
 {selectedProject ? `${selectedProject.projectId} - ${selectedProject.projectsTitle}` : labels.selectProject}
 </span>
 </button>
 {showProjectDropdown && (
 <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
 {activeProjects.map((project) => (
 <button
 key={project.id}
 onClick={() => {
 setFormData({ ...formData, projectId: project.id });
 setShowProjectDropdown(false);
 }}
 className={`w-full px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0 ${ 'text-start' }`}
 >
 <span className="text-sm font-semibold text-gray-900">{project.projectId}</span>
 <p className="text-sm text-gray-600">{project.projectsTitle}</p>
 </button>
 ))}
 </div>
 )}
 </div>
 </div>

 {/* Type Selection */}
 <div>
 <label className={`block text-sm font-semibold text-gray-900 mb-2 text-start`}>
 {labels.type}
 </label>
 <div className={`flex gap-2`}>
 {['Complaint', 'Feedback', 'Suggestion'].map((type) => (
 <button
 key={type}
 onClick={() => setFormData({ ...formData, type: type as any })}
 className={`flex-1 px-4 py-2 rounded-lg transition-colors ${ formData.type === type ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50' }`}
 >
 <span className="text-sm font-semibold">
 {type === 'Complaint' ? labels.complaint : type === 'Feedback' ? labels.feedback : labels.suggestion}
 </span>
 </button>
 ))}
 </div>
 </div>

 {/* Severity Selection */}
 <div>
 <label className={`block text-sm font-semibold text-gray-900 mb-2 text-start`}>
 {labels.severity}
 </label>
 <div className={`flex gap-2`}>
 {['Low', 'Medium', 'High'].map((severity) => (
 <button
 key={severity}
 onClick={() => setFormData({ ...formData, severity: severity as any })}
 className={`flex-1 px-4 py-2 rounded-lg transition-colors ${ formData.severity === severity ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50' }`}
 >
 <span className="text-sm font-semibold">
 {severity === 'High' ? labels.high : severity === 'Medium' ? labels.medium : labels.low}
 </span>
 </button>
 ))}
 </div>
 </div>

 {/* Subject */}
 <div>
 <label className={`block text-sm font-semibold text-gray-900 mb-2 text-start`}>
 {labels.subject}
 </label>
 <input
 type="text"
 value={formData.subject}
 onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
 placeholder={labels.enterSubject}
 className={`w-full px-4 py-3 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${ 'text-start' }`}
 />
 </div>

 {/* Description */}
 <div>
 <label className={`block text-sm font-semibold text-gray-900 mb-2 text-start`}>
 {labels.description}
 </label>
 <textarea
 value={formData.description}
 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
 placeholder={labels.enterDescription}
 rows={4}
 className={`w-full px-4 py-3 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${ 'text-start' }`}
 />
 </div>

 {/* Category */}
 <div>
 <label className={`block text-sm font-semibold text-gray-900 mb-2 text-start`}>
 {labels.category}
 </label>
 <input
 type="text"
 value={formData.category}
 onChange={(e) => setFormData({ ...formData, category: e.target.value })}
 placeholder={labels.categoryPlaceholder}
 className={`w-full px-4 py-3 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${ 'text-start' }`}
 />
 </div>

 {/* Submitted Via */}
 <div>
 <label className={`block text-sm font-semibold text-gray-900 mb-2 text-start`}>
 {labels.submittedVia}
 </label>
 <input
 type="text"
 value={formData.submittedVia}
 onChange={(e) => setFormData({ ...formData, submittedVia: e.target.value })}
 placeholder={labels.submittedViaPlaceholder}
 className={`w-full px-4 py-3 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${ 'text-start' }`}
 />
 </div>

 {/* Anonymous Toggle */}
 <div className={`flex items-center gap-3`}>
 <input
 type="checkbox"
 id="anonymous"
 checked={formData.anonymous}
 onChange={(e) => setFormData({ ...formData, anonymous: e.target.checked })}
 className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
 />
 <label htmlFor="anonymous" className="text-sm font-semibold text-gray-900">
 {labels.anonymous}
 </label>
 </div>

 {/* Complainant Information (if not anonymous) */}
 {!formData.anonymous && (
 <div className="space-y-4 pt-4 border-t border-gray-200">
 <h3 className={`text-base font-bold text-gray-900 text-start`}>
 {labels.complainantInfo}
 </h3>

 <div>
 <label className={`block text-sm font-semibold text-gray-900 mb-2 text-start`}>
 {labels.name}
 </label>
 <input
 type="text"
 value={formData.complainantName}
 onChange={(e) => setFormData({ ...formData, complainantName: e.target.value })}
 placeholder={labels.enterName}
 className={`w-full px-4 py-3 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${ 'text-start' }`}
 />
 </div>

 <div>
 <label className={`block text-sm font-semibold text-gray-900 mb-2 text-start`}>
 {labels.contact}
 </label>
 <input
 type="text"
 value={formData.complainantContact}
 onChange={(e) => setFormData({ ...formData, complainantContact: e.target.value })}
 placeholder={labels.phoneOrEmail}
 className={`w-full px-4 py-3 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${ 'text-start' }`}
 />
 </div>
 </div>
 )}

 {/* Sensitive Case Toggle */}
 <div className={`flex items-center gap-3`}>
 <input
 type="checkbox"
 id="sensitive"
 checked={formData.sensitiveCase}
 onChange={(e) => setFormData({ ...formData, sensitiveCase: e.target.checked })}
 className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
 />
 <label htmlFor="sensitive" className="text-sm font-semibold text-gray-900">
 {labels.sensitiveCase}
 </label>
 </div>
 </div>

 {/* Modal Footer */}
 <div className={`sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex gap-3`}>
 <button
 onClick={() => { setShowAddModal(false); resetForm(); }}
 className="flex-1 px-4 py-3 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
 >
 <span className="text-sm font-semibold text-gray-900">{labels.cancel}</span>
 </button>
 <button
 onClick={handleSubmit}
 className="flex-1 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
 >
 <span className="text-sm font-semibold text-white">{labels.saveRecord}</span>
 </button>
 </div>
 </div>
 </div>
 )}

 {/* EDIT RECORD MODAL */}
 {showEditModal && selectedRecord && (
 <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
 <div className={`sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between`}>
 <h2 className="text-xl font-bold text-gray-900">{labels.editRecord}</h2>
 <button onClick={() => { setShowEditModal(false); setSelectedRecord(null); resetForm(); }} className="text-gray-400 hover:text-gray-600">
 <X className="w-6 h-6" />
 </button>
 </div>

 <div className="p-6 space-y-4">
 {/* Record Code (Read-only) */}
 <div>
 <label className={`block text-sm font-semibold text-gray-900 mb-2 text-start`}>
 {labels.recordCode}
 </label>
 <input
 type="text"
 value={selectedRecord.recordCode}
 disabled
 className={`w-full px-4 py-3 rounded-lg bg-gray-100 border border-gray-300 text-gray-600 ${ 'text-start' }`}
 />
 </div>

 {/* Project (Read-only) */}
 <div>
 <label className={`block text-sm font-semibold text-gray-900 mb-2 text-start`}>
 {labels.projectName}
 </label>
 <input
 type="text"
 value={activeProjects.find(p => p.id === selectedRecord.projectId)?.projectsTitle || ''}
 disabled
 className={`w-full px-4 py-3 rounded-lg bg-gray-100 border border-gray-300 text-gray-600 ${ 'text-start' }`}
 />
 </div>

 {/* Status Selection */}
 <div>
 <label className={`block text-sm font-semibold text-gray-900 mb-2 text-start`}>
 {labels.status}
 </label>
 <div className={`flex gap-2`}>
 {['Open', 'In Progress', 'Closed'].map((status) => (
 <button
 key={status}
 onClick={() => {
 setSelectedRecord({ ...selectedRecord, status: status as any });
 }}
 className={`flex-1 px-4 py-2 rounded-lg transition-colors ${ selectedRecord.status === status ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50' }`}
 >
 <span className="text-sm font-semibold">
 {status === 'Open' ? labels.open : status === 'In Progress' ? labels.inProgress : labels.closed}
 </span>
 </button>
 ))}
 </div>
 </div>

 {/* Type Selection */}
 <div>
 <label className={`block text-sm font-semibold text-gray-900 mb-2 text-start`}>
 {labels.type}
 </label>
 <div className={`flex gap-2`}>
 {['Complaint', 'Feedback', 'Suggestion'].map((type) => (
 <button
 key={type}
 onClick={() => setFormData({ ...formData, type: type as any })}
 className={`flex-1 px-4 py-2 rounded-lg transition-colors ${ formData.type === type ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50' }`}
 >
 <span className="text-sm font-semibold">
 {type === 'Complaint' ? labels.complaint : type === 'Feedback' ? labels.feedback : labels.suggestion}
 </span>
 </button>
 ))}
 </div>
 </div>

 {/* Severity Selection */}
 <div>
 <label className={`block text-sm font-semibold text-gray-900 mb-2 text-start`}>
 {labels.severity}
 </label>
 <div className={`flex gap-2`}>
 {['Low', 'Medium', 'High'].map((severity) => (
 <button
 key={severity}
 onClick={() => setFormData({ ...formData, severity: severity as any })}
 className={`flex-1 px-4 py-2 rounded-lg transition-colors ${ formData.severity === severity ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50' }`}
 >
 <span className="text-sm font-semibold">
 {severity === 'High' ? labels.high : severity === 'Medium' ? labels.medium : labels.low}
 </span>
 </button>
 ))}
 </div>
 </div>

 {/* Subject */}
 <div>
 <label className={`block text-sm font-semibold text-gray-900 mb-2 text-start`}>
 {labels.subject}
 </label>
 <input
 type="text"
 value={formData.subject}
 onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
 placeholder={labels.enterSubject}
 className={`w-full px-4 py-3 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${ 'text-start' }`}
 />
 </div>

 {/* Description */}
 <div>
 <label className={`block text-sm font-semibold text-gray-900 mb-2 text-start`}>
 {labels.description}
 </label>
 <textarea
 value={formData.description}
 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
 placeholder={labels.enterDescription}
 rows={4}
 className={`w-full px-4 py-3 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${ 'text-start' }`}
 />
 </div>

 {/* Category */}
 <div>
 <label className={`block text-sm font-semibold text-gray-900 mb-2 text-start`}>
 {labels.category}
 </label>
 <input
 type="text"
 value={formData.category}
 onChange={(e) => setFormData({ ...formData, category: e.target.value })}
 placeholder={labels.categoryPlaceholder}
 className={`w-full px-4 py-3 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${ 'text-start' }`}
 />
 </div>

 {/* Submitted Via */}
 <div>
 <label className={`block text-sm font-semibold text-gray-900 mb-2 text-start`}>
 {labels.submittedVia}
 </label>
 <input
 type="text"
 value={formData.submittedVia}
 onChange={(e) => setFormData({ ...formData, submittedVia: e.target.value })}
 placeholder={labels.submittedViaPlaceholder}
 className={`w-full px-4 py-3 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${ 'text-start' }`}
 />
 </div>

 {/* Sensitive Case Toggle */}
 <div className={`flex items-center gap-3`}>
 <input
 type="checkbox"
 id="sensitive-edit"
 checked={formData.sensitiveCase}
 onChange={(e) => setFormData({ ...formData, sensitiveCase: e.target.checked })}
 className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
 />
 <label htmlFor="sensitive-edit" className="text-sm font-semibold text-gray-900">
 {labels.sensitiveCase}
 </label>
 </div>
 </div>

 {/* Modal Footer */}
 <div className={`sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex gap-3`}>
 <button
 onClick={() => { setShowEditModal(false); setSelectedRecord(null); resetForm(); }}
 className="flex-1 px-4 py-3 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
 >
 <span className="text-sm font-semibold text-gray-900">{labels.cancel}</span>
 </button>
 <button
 onClick={handleUpdate}
 className="flex-1 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
 >
 <span className="text-sm font-semibold text-white">{labels.updateRecord}</span>
 </button>
 </div>
 </div>
 </div>
 )}

 {/* VIEW RECORD MODAL (Read-only) */}
 {showViewModal && selectedRecord && (
 <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
 <div className={`sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between`}>
 <h2 className="text-xl font-bold text-gray-900">{labels.recordDetails}</h2>
 <button onClick={() => { setShowViewModal(false); setSelectedRecord(null); }} className="text-gray-400 hover:text-gray-600">
 <X className="w-6 h-6" />
 </button>
 </div>

 <div className="p-6 space-y-4">
 {/* Record Code */}
 <div>
 <label className={`block text-sm font-semibold text-gray-600 mb-1 text-start`}>
 {labels.recordCode}
 </label>
 <p className={`text-base text-gray-900 text-start`}>{selectedRecord.recordCode}</p>
 </div>

 {/* Project */}
 <div>
 <label className={`block text-sm font-semibold text-gray-600 mb-1 text-start`}>
 {labels.projectName}
 </label>
 <p className={`text-base text-gray-900 text-start`}>
 {activeProjects.find(p => p.id === selectedRecord.projectId)?.projectsTitle || ''}
 </p>
 </div>

 {/* Type & Severity */}
 <div className={`grid grid-cols-2 gap-4`}>
 <div>
 <label className={`block text-sm font-semibold text-gray-600 mb-1 text-start`}>
 {labels.type}
 </label>
 <span
 className="inline-block px-3 py-1 rounded text-sm font-semibold text-white"
 style={{ backgroundColor: getTypeColor(selectedRecord.type) }}
 >
 {selectedRecord.type === 'Complaint' ? labels.complaint : selectedRecord.type === 'Feedback' ? labels.feedback : labels.suggestion}
 </span>
 </div>
 <div>
 <label className={`block text-sm font-semibold text-gray-600 mb-1 text-start`}>
 {labels.severity}
 </label>
 <span
 className="inline-block px-3 py-1 rounded text-sm font-semibold text-white"
 style={{ backgroundColor: getPriorityColor(selectedRecord.severity) }}
 >
 {selectedRecord.severity === 'High' ? labels.high : selectedRecord.severity === 'Medium' ? labels.medium : labels.low}
 </span>
 </div>
 </div>

 {/* Status */}
 <div>
 <label className={`block text-sm font-semibold text-gray-600 mb-1 text-start`}>
 {labels.status}
 </label>
 <span
 className="inline-block px-3 py-1 rounded-full text-sm font-semibold text-white"
 style={{ backgroundColor: getStatusColor(selectedRecord.status) }}
 >
 {selectedRecord.status === 'Open' ? labels.open : selectedRecord.status === 'In Progress' ? labels.inProgress : labels.closed}
 </span>
 </div>

 {/* Subject */}
 <div>
 <label className={`block text-sm font-semibold text-gray-600 mb-1 text-start`}>
 {labels.subject}
 </label>
 <p className={`text-base text-gray-900 text-start`}>{selectedRecord.subject}</p>
 </div>

 {/* Description */}
 <div>
 <label className={`block text-sm font-semibold text-gray-600 mb-1 text-start`}>
 {labels.description}
 </label>
 <p className={`text-base text-gray-900 whitespace-pre-wrap text-start`}>{selectedRecord.description}</p>
 </div>

 {/* Category */}
 {selectedRecord.category && (
 <div>
 <label className={`block text-sm font-semibold text-gray-600 mb-1 text-start`}>
 {labels.category}
 </label>
 <p className={`text-base text-gray-900 text-start`}>{selectedRecord.category}</p>
 </div>
 )}

 {/* Submitted Via */}
 {selectedRecord.submittedVia && (
 <div>
 <label className={`block text-sm font-semibold text-gray-600 mb-1 text-start`}>
 {labels.submittedVia}
 </label>
 <p className={`text-base text-gray-900 text-start`}>{selectedRecord.submittedVia}</p>
 </div>
 )}

 {/* Received Date */}
 <div>
 <label className={`block text-sm font-semibold text-gray-600 mb-1 text-start`}>
 {labels.receivedDate}
 </label>
 <p className={`text-base text-gray-900 text-start`}>
 {new Date(selectedRecord.receivedAt).toLocaleDateString()}
 </p>
 </div>

 {/* Anonymous */}
 <div>
 <label className={`block text-sm font-semibold text-gray-600 mb-1 text-start`}>
 {labels.anonymous}
 </label>
 <p className={`text-base text-gray-900 text-start`}>
 {selectedRecord.anonymous ? labels.yes : labels.no}
 </p>
 </div>

 {/* Complainant Information (if not anonymous) */}
 {!selectedRecord.anonymous && selectedRecord.complainantName && (
 <div className="pt-4 border-t border-gray-200 space-y-3">
 <h3 className={`text-base font-bold text-gray-900 text-start`}>
 {labels.complainantInfo}
 </h3>
 
 <div>
 <label className={`block text-sm font-semibold text-gray-600 mb-1 text-start`}>
 {labels.name}
 </label>
 <p className={`text-base text-gray-900 text-start`}>{selectedRecord.complainantName}</p>
 </div>

 {selectedRecord.complainantContact && (
 <div>
 <label className={`block text-sm font-semibold text-gray-600 mb-1 text-start`}>
 {labels.contact}
 </label>
 <p className={`text-base text-gray-900 text-start`}>{selectedRecord.complainantContact}</p>
 </div>
 )}
 </div>
 )}

 {/* Sensitive Case */}
 <div>
 <label className={`block text-sm font-semibold text-gray-600 mb-1 text-start`}>
 {labels.sensitiveCase}
 </label>
 <p className={`text-base ${selectedRecord.sensitiveCase ? 'text-red-600 font-bold' : 'text-gray-900'} text-start`}>
 {selectedRecord.sensitiveCase ? labels.yes : labels.no}
 </p>
 </div>
 </div>

 {/* Modal Footer */}
 <div className={`sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 text-start`}>
 <button
 onClick={() => { setShowViewModal(false); setSelectedRecord(null); }}
 className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
 >
 <span className="text-sm font-semibold text-white">{labels.close}</span>
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}