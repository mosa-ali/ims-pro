/**
 * ============================================================================
 * TRAINING MANAGEMENT - CENTRALIZED TRAINING OVERSIGHT
 * ============================================================================
 * 
 * PURPOSE:
 * - Centralized view of ALL training records across ALL employees
 * - Reporting & oversight card (NOT a data entry point)
 * - Links back to individual employee profiles
 * - Filters for training analysis and donor reporting
 * 
 * DATA SOURCE:
 * - Reads from 'hr_training_records' localStorage
 * - Training records created ONLY in Employee Profile → Training & Development
 * - This is a READ-ONLY aggregated view
 * 
 * FEATURES:
 * - All training records in one table
 * - Multi-criteria filters (Status, Type, Provider, Date Range, Department, Project)
 * - Export to Excel
 * - Links to employee profiles
 * - Statistics dashboard
 * 
 * PERMISSIONS:
 * - HR Manager: Full view
 * - Admin: Full view
 * - Programs: View only
 * - Finance: View only
 * 
 * ============================================================================
 */
import { Link } from 'wouter';

import { useState, useEffect } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { 
 GraduationCap, 
 Filter, 
 Download, 
 Eye, 
 Calendar,
 Users,
 Award,
 TrendingUp,
 Search,
 FileText,
 CheckCircle,
 Clock,
 X
, ArrowLeft, ArrowRight} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import * as XLSX from 'xlsx';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface TrainingRecord {
 id: string;
 staffId: string;
 employeeName: string;
 position: string;
 department: string;
 trainingTitle: string;
 provider: string;
 trainingType: 'Technical' | 'Soft Skills' | 'Management' | 'Compliance' | 'Safety' | 'Other';
 startDate: string;
 endDate: string;
 duration?: string;
 status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
 completionDate?: string;
 certificateIssued: boolean;
 certificateUrl?: string;
 certificateNumber?: string;
 cost?: number;
 currency?: string;
 fundedBy?: string;
 createdBy: string;
 createdDate: string;
 notes?: string;
}

interface TrainingFilters {
 status: string;
 trainingType: string;
 provider: string;
 department: string;
 fundedBy: string;
 dateFrom: string;
 dateTo: string;
 searchTerm: string;
}

// ============================================================================
// TRAINING SERVICE
// ============================================================================

const trainingService = {
 getAll(): TrainingRecord[] {
 try {
 const data = localStorage.getItem('hr_training_records');
 return data ? JSON.parse(data) : [];
 } catch {
 return [];
 }
 }
};

// ============================================================================
// COMPONENT
// ============================================================================

export function TrainingManagement() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const navigate = useNavigate();

 const [trainings, setTrainings] = useState<TrainingRecord[]>([]);
 const [filteredTrainings, setFilteredTrainings] = useState<TrainingRecord[]>([]);
 const [showFilters, setShowFilters] = useState(false);
 
 const [filters, setFilters] = useState<TrainingFilters>({
 status: '',
 trainingType: '',
 provider: '',
 department: '',
 fundedBy: '',
 dateFrom: '',
 dateTo: '',
 searchTerm: ''
 });

 // Load all training records
 useEffect(() => {
 loadTrainings();
 }, []);

 // Apply filters
 useEffect(() => {
 applyFilters();
 }, [trainings, filters]);

 const loadTrainings = () => {
 const records = trainingService.getAll();
 // Sort by start date descending
 records.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
 setTrainings(records);
 };

 const applyFilters = () => {
 let filtered = [...trainings];

 // Search term
 if (filters.searchTerm) {
 const term = filters.searchTerm.toLowerCase();
 filtered = filtered.filter(t => 
 t.employeeName.toLowerCase().includes(term) ||
 t.trainingTitle.toLowerCase().includes(term) ||
 t.staffId.toLowerCase().includes(term) ||
 t.provider.toLowerCase().includes(term)
 );
 }

 // Status filter
 if (filters.status) {
 filtered = filtered.filter(t => t.status === filters.status);
 }

 // Training type filter
 if (filters.trainingType) {
 filtered = filtered.filter(t => t.trainingType === filters.trainingType);
 }

 // Provider filter
 if (filters.provider) {
 filtered = filtered.filter(t => 
 t.provider.toLowerCase().includes(filters.provider.toLowerCase())
 );
 }

 // Department filter
 if (filters.department) {
 filtered = filtered.filter(t => 
 t.department.toLowerCase().includes(filters.department.toLowerCase())
 );
 }

 // Funded by filter
 if (filters.fundedBy) {
 filtered = filtered.filter(t => 
 t.fundedBy?.toLowerCase().includes(filters.fundedBy.toLowerCase())
 );
 }

 // Date range filter
 if (filters.dateFrom) {
 filtered = filtered.filter(t => 
 new Date(t.startDate) >= new Date(filters.dateFrom)
 );
 }
 if (filters.dateTo) {
 filtered = filtered.filter(t => 
 new Date(t.startDate) <= new Date(filters.dateTo)
 );
 }

 setFilteredTrainings(filtered);
 };

 const resetFilters = () => {
 setFilters({
 status: '',
 trainingType: '',
 provider: '',
 department: '',
 fundedBy: '',
 dateFrom: '',
 dateTo: '',
 searchTerm: ''
 });
 };

 const exportToExcel = () => {
 const data = filteredTrainings.map(t => ({
 'Staff ID': t.staffId,
 'Full Name': t.employeeName,
 'Position': t.position,
 'Department': t.department,
 'Training Title': t.trainingTitle,
 'Provider': t.provider,
 'Training Type': t.trainingType,
 'Start Date': formatDate(t.startDate),
 'End Date': formatDate(t.endDate),
 'Duration': t.duration || '-',
 'Status': t.status,
 'Certificate Issued': t.certificateIssued ? 'Yes' : 'No',
 'Certificate Number': t.certificateNumber || '-',
 'Cost': t.cost ? `${t.cost} ${t.currency || ''}` : '-',
 'Funded By': t.fundedBy || '-',
 'Notes': t.notes || '-'
 }));

 const ws = XLSX.utils.json_to_sheet(data);
 const wb = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb, ws, 'Training Records');
 XLSX.writeFile(wb, `Training_Records_${new Date().toISOString().split('T')[0]}.xlsx`);
 };

 const handleViewEmployee = (staffId: string) => {
 navigate(`/hr/employees-profiles/directory?staffId=${staffId}`);
 };

 const formatDate = (dateString: string) => {
 return new Date(dateString).toLocaleDateString(t.hr.en, {
 year: 'numeric',
 month: 'short',
 day: 'numeric'
 });
 };

 const getStatusBadge = (status: string) => {
 const badges = {
 'Scheduled': 'bg-blue-100 text-blue-700 border-blue-200',
 'In Progress': 'bg-yellow-100 text-yellow-700 border-yellow-200',
 'Completed': 'bg-green-100 text-green-700 border-green-200',
 'Cancelled': 'bg-red-100 text-red-700 border-red-200'
 };
 return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-700 border-gray-200';
 };

 // Calculate statistics
 const stats = {
 total: filteredTrainings.length,
 completed: filteredTrainings.filter(t => t.status === 'Completed').length,
 inProgress: filteredTrainings.filter(t => t.status === 'In Progress').length,
 scheduled: filteredTrainings.filter(t => t.status === 'Scheduled').length,
 withCertificate: filteredTrainings.filter(t => t.certificateIssued).length,
 totalCost: filteredTrainings.reduce((sum, t) => sum + (t.cost || 0), 0)
 };

 const labels = {
 title: t.hr.trainingManagement,
 subtitle: t.hr.trainingSubtitle,
 
 // Statistics
 totalTrainings: t.hr.totalTrainings,
 completed: t.hr.completed,
 inProgress: t.hr.inProgress,
 scheduled: t.hr.scheduled,
 withCertificate: t.hr.withCertificate,
 totalCost: t.hr.totalCost,
 
 // Actions
 filters: t.hr.filters14,
 export: t.hr.exportToExcel,
 search: t.hr.searchByNameTrainingOrStaff,
 applyFilters: t.hr.applyFilters15,
 resetFilters: t.hr.reset,
 showFilters: t.hr.showFilters,
 hideFilters: t.hr.hideFilters,
 
 // Table headers
 staffId: t.hr.staffId,
 fullName: t.hr.fullName,
 position: t.hr.position16,
 department: t.hr.department,
 trainingTitle: t.hr.trainingTitle,
 provider: t.hr.provider,
 trainingType: t.hr.trainingType,
 startDate: t.hr.startDate,
 endDate: t.hr.endDate,
 status: t.hr.status,
 certificate: t.hr.certificate,
 actions: t.hr.actions,
 
 // Filter labels
 filterByStatus: t.hr.status,
 filterByType: t.hr.trainingType,
 filterByProvider: t.hr.provider,
 filterByDepartment: t.hr.department,
 filterByProject: t.hr.fundedByProject,
 dateFrom: t.hr.dateFrom17,
 dateTo: t.hr.dateTo,
 
 // Options
 allStatuses: t.hr.allStatuses,
 allTypes: t.hr.allTypes,
 
 // Actions
 viewProfile: t.hr.viewProfile,
 viewCertificate: t.hr.viewCertificate,
 noCertificate: t.hr.noCertificate,
 
 // Empty states
 noRecords: t.hr.noTrainingRecordsFound,
 noRecordsDesc: 'Training records are created from individual employee profiles.',
 
 // Note
 noteTitle: t.hr.importantNote,
 noteText: 'Training records are created and managed from Employee Profile → Training & Development. This view is for reporting and oversight only.',
 
 // Types
 technical: t.hr.technical,
 softSkills: t.hr.softSkills,
 management: t.hr.management,
 compliance: t.hr.compliance,
 safety: t.hr.safety,
 other: t.hr.other18,
 
 cancelled: t.hr.cancelled
 };

 return (
 <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
 <BackButton href="/organization/hr" label={t.hr.hrDashboard} />

 {/* Header */}
 <div className="bg-white border-b border-gray-200">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
 
 
 <div className="flex items-center justify-between mt-4">
 <div className={'text-start'}>
 <div className={`flex items-center gap-3`}>
 <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
 <GraduationCap className="w-6 h-6 text-purple-600" />
 </div>
 <div>
 <h1 className="text-2xl font-bold text-gray-900">{labels.title}</h1>
 <p className="text-sm text-gray-600 mt-1">{labels.subtitle}</p>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>

 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
 {/* Statistics Cards */}
 <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
 <div className="bg-white rounded-lg border border-gray-200 p-4">
 <div className={`flex items-center gap-3`}>
 <GraduationCap className="w-8 h-8 text-blue-600" />
 <div className={'text-start'}>
 <p className="text-xs text-gray-600">{labels.totalTrainings}</p>
 <p className="text-xl font-bold text-gray-900">{stats.total}</p>
 </div>
 </div>
 </div>

 <div className="bg-white rounded-lg border border-gray-200 p-4">
 <div className={`flex items-center gap-3`}>
 <CheckCircle className="w-8 h-8 text-green-600" />
 <div className={'text-start'}>
 <p className="text-xs text-gray-600">{labels.completed}</p>
 <p className="text-xl font-bold text-green-600">{stats.completed}</p>
 </div>
 </div>
 </div>

 <div className="bg-white rounded-lg border border-gray-200 p-4">
 <div className={`flex items-center gap-3`}>
 <Clock className="w-8 h-8 text-yellow-600" />
 <div className={'text-start'}>
 <p className="text-xs text-gray-600">{labels.inProgress}</p>
 <p className="text-xl font-bold text-yellow-600">{stats.inProgress}</p>
 </div>
 </div>
 </div>

 <div className="bg-white rounded-lg border border-gray-200 p-4">
 <div className={`flex items-center gap-3`}>
 <Calendar className="w-8 h-8 text-blue-600" />
 <div className={'text-start'}>
 <p className="text-xs text-gray-600">{labels.scheduled}</p>
 <p className="text-xl font-bold text-blue-600">{stats.scheduled}</p>
 </div>
 </div>
 </div>

 <div className="bg-white rounded-lg border border-gray-200 p-4">
 <div className={`flex items-center gap-3`}>
 <Award className="w-8 h-8 text-purple-600" />
 <div className={'text-start'}>
 <p className="text-xs text-gray-600">{labels.withCertificate}</p>
 <p className="text-xl font-bold text-purple-600">{stats.withCertificate}</p>
 </div>
 </div>
 </div>

 <div className="bg-white rounded-lg border border-gray-200 p-4">
 <div className={`flex items-center gap-3`}>
 <TrendingUp className="w-8 h-8 text-green-600" />
 <div className={'text-start'}>
 <p className="text-xs text-gray-600">{labels.totalCost}</p>
 <p className="text-lg font-bold text-green-600">
 ${stats.totalCost.toLocaleString()}
 </p>
 </div>
 </div>
 </div>
 </div>

 {/* Important Note */}
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
 <div className={`flex items-start gap-3`}>
 <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
 <div className={'text-start'}>
 <h3 className="text-sm font-semibold text-blue-900">{labels.noteTitle}</h3>
 <p className="text-sm text-blue-700 mt-1">{labels.noteText}</p>
 </div>
 </div>
 </div>

 {/* Search and Actions */}
 <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
 <div className={`flex flex-col md:flex-row gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
 {/* Search */}
 <div className="flex-1">
 <div className="relative">
 <Search className={`absolute top-3 ${'start-3'} w-5 h-5 text-gray-400`} />
 <input
 type="text"
 value={filters.searchTerm}
 onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
 placeholder={labels.search}
 className={`w-full ps-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
 />
 </div>
 </div>

 {/* Action Buttons */}
 <div className={`flex gap-2`}>
 <button
 onClick={() => setShowFilters(!showFilters)}
 className={`flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50`}
 >
 <Filter className="w-5 h-5 text-gray-600" />
 <span className="text-sm font-medium text-gray-700">
 {showFilters ? labels.hideFilters : labels.showFilters}
 </span>
 </button>

 <button
 onClick={exportToExcel}
 className={`flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700`}
 >
 <Download className="w-5 h-5" />
 <span className="text-sm font-medium">{labels.export}</span>
 </button>
 </div>
 </div>

 {/* Filters Panel */}
 {showFilters && (
 <div className="mt-4 pt-4 border-t border-gray-200">
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
 {/* Status Filter */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-end' : ''}`}>
 {labels.filterByStatus}
 </label>
 <select
 value={filters.status}
 onChange={(e) => setFilters({ ...filters, status: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
 >
 <option value="">{labels.allStatuses}</option>
 <option value="Scheduled">{labels.scheduled}</option>
 <option value="In Progress">{labels.inProgress}</option>
 <option value="Completed">{labels.completed}</option>
 <option value="Cancelled">{labels.cancelled}</option>
 </select>
 </div>

 {/* Training Type Filter */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-end' : ''}`}>
 {labels.filterByType}
 </label>
 <select
 value={filters.trainingType}
 onChange={(e) => setFilters({ ...filters, trainingType: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
 >
 <option value="">{labels.allTypes}</option>
 <option value="Technical">{labels.technical}</option>
 <option value="Soft Skills">{labels.softSkills}</option>
 <option value="Management">{labels.management}</option>
 <option value="Compliance">{labels.compliance}</option>
 <option value="Safety">{labels.safety}</option>
 <option value="Other">{labels.other}</option>
 </select>
 </div>

 {/* Provider Filter */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-end' : ''}`}>
 {labels.filterByProvider}
 </label>
 <input
 type="text"
 value={filters.provider}
 onChange={(e) => setFilters({ ...filters, provider: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
 placeholder={labels.filterByProvider}
 />
 </div>

 {/* Department Filter */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-end' : ''}`}>
 {labels.filterByDepartment}
 </label>
 <input
 type="text"
 value={filters.department}
 onChange={(e) => setFilters({ ...filters, department: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
 placeholder={labels.filterByDepartment}
 />
 </div>

 {/* Project/Funded By Filter */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-end' : ''}`}>
 {labels.filterByProject}
 </label>
 <input
 type="text"
 value={filters.fundedBy}
 onChange={(e) => setFilters({ ...filters, fundedBy: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
 placeholder={labels.filterByProject}
 />
 </div>

 {/* Date From */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-end' : ''}`}>
 {labels.dateFrom}
 </label>
 <input
 type="date"
 value={filters.dateFrom}
 onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
 />
 </div>

 {/* Date To */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-end' : ''}`}>
 {labels.dateTo}
 </label>
 <input
 type="date"
 value={filters.dateTo}
 onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
 />
 </div>

 {/* Reset Button */}
 <div className="flex items-end">
 <button
 onClick={resetFilters}
 className={`w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50`}
 >
 <X className="w-5 h-5 text-gray-600" />
 <span className="text-sm font-medium text-gray-700">{labels.resetFilters}</span>
 </button>
 </div>
 </div>
 </div>
 )}
 </div>

 {/* Training Records Table */}
 <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
 {filteredTrainings.length === 0 ? (
 <div className="p-12 text-center">
 <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
 <h3 className="text-lg font-semibold text-gray-900 mb-2">{labels.noRecords}</h3>
 <p className="text-sm text-gray-600">{labels.noRecordsDesc}</p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{labels.staffId}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{labels.fullName}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{labels.position}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{labels.department}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{labels.trainingTitle}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{labels.provider}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{labels.trainingType}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{labels.startDate}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{labels.endDate}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{labels.status}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{labels.certificate}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{labels.actions}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {filteredTrainings.map((training) => (
 <tr key={training.id} className="hover:bg-gray-50">
 <td className="px-4 py-3 text-sm text-gray-900 font-mono">{training.staffId}</td>
 <td className="px-4 py-3 text-sm text-gray-900 font-medium">{training.employeeName}</td>
 <td className="px-4 py-3 text-sm text-gray-700">{training.position}</td>
 <td className="px-4 py-3 text-sm text-gray-700">{training.department}</td>
 <td className="px-4 py-3 text-sm text-gray-900 font-medium">{training.trainingTitle}</td>
 <td className="px-4 py-3 text-sm text-gray-700">{training.provider}</td>
 <td className="px-4 py-3 text-sm text-gray-700">{training.trainingType}</td>
 <td className="px-4 py-3 text-sm text-gray-700">{formatDate(training.startDate)}</td>
 <td className="px-4 py-3 text-sm text-gray-700">{formatDate(training.endDate)}</td>
 <td className="px-4 py-3">
 <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(training.status)}`}>
 {training.status}
 </span>
 </td>
 <td className="px-4 py-3 text-sm">
 {training.certificateIssued ? (
 <div className="flex items-center gap-1 text-green-600">
 <Award className="w-4 h-4" />
 <span className="text-xs">{training.certificateNumber || labels.withCertificate}</span>
 </div>
 ) : (
 <span className="text-xs text-gray-500">{labels.noCertificate}</span>
 )}
 </td>
 <td className="px-4 py-3">
 <button
 onClick={() => handleViewEmployee(training.staffId)}
 className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
 >
 <Eye className="w-4 h-4" />
 <span>{labels.viewProfile}</span>
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </div>
 </div>
 );
}