/**
 * ============================================================================
 * ATTENDANCE RECORDS TABLE
 * ============================================================================
 * 
 * Complete attendance records management
 * - Search & filter
 * - All columns visible
 * - Row actions (view, edit, approve, etc.)
 * - Export functionality
 * 
 * ============================================================================
 */
import { Link } from 'wouter';

import { useState, useEffect } from 'react';
import {
 Search,
 Filter,
 Download,
 Eye,
 Edit,
 Check,
 X,
 Plus,
 AlertCircle,
 Clock,
 Timer,
 Lock,
 FileText
, ArrowLeft, ArrowRight} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { attendanceService, AttendanceRecord, AttendanceSource, AttendanceStatus } from '@/app/services/attendanceService';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export function AttendanceRecordsTable() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();

 const [records, setRecords] = useState<AttendanceRecord[]>([]);
 const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
 const [searchTerm, setSearchTerm] = useState('');
 const [selectedStatus, setSelectedStatus] = useState<string>('all');
 const [selectedSource, setSelectedSource] = useState<string>('all');
 const [selectedPeriod, setSelectedPeriod] = useState<string>('current');
 const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
 const [showDetailModal, setShowDetailModal] = useState(false);

 useEffect(() => {
 loadRecords();
 }, [selectedPeriod]);

 useEffect(() => {
 applyFilters();
 }, [records, searchTerm, selectedStatus, selectedSource]);

 const loadRecords = () => {
 let allRecords: AttendanceRecord[] = [];
 
 if (selectedPeriod === 'current') {
 const now = new Date();
 const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
 allRecords = attendanceService.getByPeriod(currentMonth);
 } else if (selectedPeriod === 'today') {
 allRecords = attendanceService.getToday();
 } else {
 allRecords = attendanceService.getAll();
 }
 
 // Sort by date descending
 allRecords.sort((a, b) => b.date.localeCompare(a.date));
 
 setRecords(allRecords);
 };

 const applyFilters = () => {
 let filtered = [...records];
 
 // Search filter
 if (searchTerm) {
 filtered = filtered.filter(r => 
 r.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
 r.staffId.toLowerCase().includes(searchTerm.toLowerCase())
 );
 }
 
 // Status filter
 if (selectedStatus !== 'all') {
 filtered = filtered.filter(r => r.status === selectedStatus);
 }
 
 // Source filter
 if (selectedSource !== 'all') {
 filtered = filtered.filter(r => r.source === selectedSource);
 }
 
 setFilteredRecords(filtered);
 };

 const handleApprove = (recordId: string) => {
 const success = attendanceService.approve(recordId, 'Current User'); // TODO: Get real user
 if (success) {
 loadRecords();
 }
 };

 const handleReject = (recordId: string) => {
 const reason = prompt(t.hrAttendance.rejectionReason);
 if (reason) {
 const success = attendanceService.reject(recordId, 'Current User', reason);
 if (success) {
 loadRecords();
 }
 }
 };

 const handleViewDetail = (record: AttendanceRecord) => {
 setSelectedRecord(record);
 setShowDetailModal(true);
 };

 const getSourceBadge = (source: AttendanceSource) => {
 switch (source) {
 case 'microsoft_teams_shifts':
 return { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: '🟦', label: 'Teams Shifts' };
 case 'manual_hr_entry':
 return { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: '🟨', label: t.hrAttendance.manualHr };
 case 'microsoft_teams_presence':
 return { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: '⚪', label: 'Teams Presence' };
 }
 };

 const getStatusBadge = (status: AttendanceStatus) => {
 switch (status) {
 case 'present':
 return { color: 'bg-green-100 text-green-700', label: t.hrAttendance.present };
 case 'absent':
 return { color: 'bg-red-100 text-red-700', label: t.hrAttendance.absent };
 case 'late':
 return { color: 'bg-yellow-100 text-yellow-700', label: t.hrAttendance.late };
 case 'on_leave':
 return { color: 'bg-blue-100 text-blue-700', label: t.hrAttendance.onLeave };
 case 'field_work':
 return { color: 'bg-purple-100 text-purple-700', label: t.hrAttendance.fieldWork };
 case 'overtime':
 return { color: 'bg-indigo-100 text-indigo-700', label: t.hrAttendance.overtime };
 }
 };

 const getApprovalBadge = (status: string) => {
 switch (status) {
 case 'approved':
 return { color: 'bg-green-100 text-green-700', label: t.hrAttendance.approved };
 case 'pending':
 return { color: 'bg-orange-100 text-orange-700', label: t.hrAttendance.pending };
 case 'rejected':
 return { color: 'bg-red-100 text-red-700', label: t.hrAttendance.rejected };
 }
 };

 const labels = {
 title: t.hrAttendance.attendanceRecords,
 subtitle: t.hrAttendance.viewSearchAndManageAllAttendance,
 
 search: t.hrAttendance.searchByNameOrId,
 filterStatus: t.hrAttendance.filterByStatus,
 filterSource: t.hrAttendance.filterBySource,
 filterPeriod: t.hrAttendance.period,
 
 today: t.hrAttendance.today,
 currentMonth: t.hrAttendance.currentMonth,
 allRecords: t.hrAttendance.allRecords,
 all: t.hrAttendance.all,
 
 export: t.hrAttendance.export,
 addRecord: t.hrAttendance.addRecord,
 
 // Table Headers
 staffName: t.hrAttendance.staffName,
 date: t.hrAttendance.date,
 plannedHours: t.hrAttendance.plannedHours,
 actualHours: t.hrAttendance.actualHours,
 overtimeHours: t.hrAttendance.overtime,
 status: t.hrAttendance.status,
 source: t.hrAttendance.source,
 approval: t.hrAttendance.approval,
 payrollEligible: t.hrAttendance.payroll,
 actions: t.hrAttendance.actions,
 
 yes: t.hrAttendance.yes,
 no: t.hrAttendance.no,
 
 view: t.hrAttendance.view,
 approve: t.hrAttendance.approve,
 reject: t.hrAttendance.reject,
 locked: t.hrAttendance.locked,
 
 noRecords: t.hrAttendance.noAttendanceRecordsFound,
 totalRecords: t.hrAttendance.totalRecords
 };

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Back Button */}
 <BackButton href="/organization/hr/attendance" label={t.hrAttendance.attendanceDashboard} />

 {/* Header */}
 <div>
 <h1 className={`text-2xl font-bold text-gray-900 text-start`}>
 {labels.title}
 </h1>
 <p className={`text-sm text-gray-600 mt-1 text-start`}>
 {labels.subtitle}
 </p>
 </div>

 {/* Filters & Actions Bar */}
 <div className="bg-white rounded-lg border border-gray-200 p-4">
 <div className={`flex flex-col lg:flex-row gap-4 ${isRTL ? 'lg:flex-row-reverse' : ''}`}>
 {/* Search */}
 <div className="flex-1">
 <div className="relative">
 <Search className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 ${'start-3'}`} />
 <input
 type="text"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 placeholder={labels.search}
 className={`w-full ps-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
 />
 </div>
 </div>

 {/* Period Filter */}
 <select
 value={selectedPeriod}
 onChange={(e) => setSelectedPeriod(e.target.value)}
 className={`px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-end' : ''}`}
 >
 <option value="today">{labels.today}</option>
 <option value="current">{labels.currentMonth}</option>
 <option value="all">{labels.allRecords}</option>
 </select>

 {/* Status Filter */}
 <select
 value={selectedStatus}
 onChange={(e) => setSelectedStatus(e.target.value)}
 className={`px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-end' : ''}`}
 >
 <option value="all">{labels.all}</option>
 <option value="present">{t.hrAttendance.present}</option>
 <option value="absent">{t.hrAttendance.absent}</option>
 <option value="late">{t.hrAttendance.late}</option>
 <option value="on_leave">{t.hrAttendance.onLeave}</option>
 <option value="field_work">{t.hrAttendance.fieldWork}</option>
 <option value="overtime">{t.hrAttendance.overtime}</option>
 </select>

 {/* Source Filter */}
 <select
 value={selectedSource}
 onChange={(e) => setSelectedSource(e.target.value)}
 className={`px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-end' : ''}`}
 >
 <option value="all">{labels.all}</option>
 <option value="microsoft_teams_shifts">{'Teams Shifts'}</option>
 <option value="manual_hr_entry">{t.hrAttendance.manualHr}</option>
 <option value="microsoft_teams_presence">{'Teams Presence'}</option>
 </select>

 {/* Export Button */}
 <button className={`flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors`}>
 <Download className="w-4 h-4" />
 <span>{labels.export}</span>
 </button>
 </div>

 {/* Records Count */}
 <div className={`mt-4 pt-4 border-t border-gray-200 text-start`}>
 <p className="text-sm text-gray-600">
 {labels.totalRecords}: <span className="font-semibold text-gray-900">{filteredRecords.length}</span>
 </p>
 </div>
 </div>

 {/* Table */}
 <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider text-start`}>
 {labels.staffName}
 </th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider text-start`}>
 {labels.date}
 </th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider text-start`}>
 {labels.plannedHours}
 </th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider text-start`}>
 {labels.actualHours}
 </th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider text-start`}>
 {labels.overtimeHours}
 </th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider text-start`}>
 {labels.status}
 </th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider text-start`}>
 {labels.source}
 </th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider text-start`}>
 {labels.approval}
 </th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider text-start`}>
 {labels.payrollEligible}
 </th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider text-start`}>
 {labels.actions}
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {filteredRecords.length === 0 ? (
 <tr>
 <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
 {labels.noRecords}
 </td>
 </tr>
 ) : (
 filteredRecords.map((record) => {
 const sourceBadge = getSourceBadge(record.source);
 const statusBadge = getStatusBadge(record.status);
 const approvalBadge = getApprovalBadge(record.approvalStatus);

 return (
 <tr key={record.id} className="hover:bg-gray-50">
 <td className={`px-4 py-3 text-start`}>
 <div>
 <p className="text-sm font-medium text-gray-900">{record.staffName}</p>
 <p className="text-xs text-gray-500">{record.staffId}</p>
 </div>
 </td>
 <td className={`px-4 py-3 text-sm text-gray-900 text-start`}>
 {record.date}
 </td>
 <td className={`px-4 py-3 text-sm text-gray-900 text-start`}>
 {record.plannedHours.toFixed(1)}h
 </td>
 <td className={`px-4 py-3 text-sm text-gray-900 text-start`}>
 {record.actualHours.toFixed(1)}h
 </td>
 <td className={`px-4 py-3 text-start`}>
 {record.overtimeHours > 0 ? (
 <span className="inline-flex items-center gap-1 text-sm font-medium text-purple-600">
 <Timer className="w-4 h-4" />
 {record.overtimeHours.toFixed(1)}h
 </span>
 ) : (
 <span className="text-sm text-gray-400">-</span>
 )}
 </td>
 <td className={`px-4 py-3 text-start`}>
 <div className="flex items-center gap-2">
 <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}>
 {statusBadge.label}
 </span>
 {record.isFlagged && (
 <AlertCircle className="w-4 h-4 text-red-500" />
 )}
 </div>
 </td>
 <td className={`px-4 py-3 text-start`}>
 <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${sourceBadge.color}`}>
 {sourceBadge.icon} {sourceBadge.label}
 </span>
 </td>
 <td className={`px-4 py-3 text-start`}>
 <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${approvalBadge.color}`}>
 {approvalBadge.label}
 </span>
 </td>
 <td className={`px-4 py-3 text-sm text-start`}>
 {record.payrollEligible ? (
 <span className="text-green-600 font-medium">{labels.yes}</span>
 ) : (
 <span className="text-red-600 font-medium">{labels.no}</span>
 )}
 </td>
 <td className={`px-4 py-3 text-start`}>
 <div className={`flex items-center gap-2`}>
 <button
 onClick={() => handleViewDetail(record)}
 className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
 title={labels.view}
 >
 <Eye className="w-4 h-4" />
 </button>
 {!record.periodLocked && record.approvalStatus === 'pending' && (
 <>
 <button
 onClick={() => handleApprove(record.id)}
 className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
 title={labels.approve}
 >
 <Check className="w-4 h-4" />
 </button>
 <button
 onClick={() => handleReject(record.id)}
 className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
 title={labels.reject}
 >
 <X className="w-4 h-4" />
 </button>
 </>
 )}
 {record.periodLocked && (
 <Lock className="w-4 h-4 text-gray-400" title={labels.locked} />
 )}
 </div>
 </td>
 </tr>
 );
 })
 )}
 </tbody>
 </table>
 </div>
 </div>

 {/* Detail Modal - Placeholder for now */}
 {showDetailModal && selectedRecord && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
 <div className={`p-6 border-b border-gray-200 flex items-center justify-between`}>
 <h2 className="text-xl font-bold text-gray-900">
 {t.hrAttendance.attendanceDetail}
 </h2>
 <button
 onClick={() => setShowDetailModal(false)}
 className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>
 <div className="p-6">
 <p className="text-gray-600">
 {t.hrAttendance.detailedViewComingSoon}
 </p>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
