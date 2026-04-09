/**
 * ============================================================================
 * MY ATTENDANCE - EMPLOYEE SELF-VIEW
 * ============================================================================
 * 
 * CRITICAL: Employee self-service attendance view
 * - Read-only attendance records
 * - Submit explanations for flagged days
 * - Upload attachments (optional)
 * - Clear indication of locked periods
 * 
 * EMPLOYEE CANNOT:
 * - Edit attendance
 * - Change hours
 * - Approve records
 * 
 * ============================================================================
 */
import { Link } from 'wouter';

import { useState, useEffect } from 'react';
import {
 Calendar,
 AlertCircle,
 CheckCircle,
 Clock,
 Lock,
 FileText,
 Upload,
 MessageSquare,
 Info
, ArrowLeft, ArrowRight} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { attendanceService, AttendanceRecord } from '@/app/services/attendanceService';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export function MyAttendance() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();

 // TODO: Get from auth context
 const currentEmployeeId = 'EMP-001';
 const currentEmployeeName = 'Ahmed Hassan';

 const [myRecords, setMyRecords] = useState<AttendanceRecord[]>([]);
 const [selectedPeriod, setSelectedPeriod] = useState<string>('current');
 const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
 const [showExplanationModal, setShowExplanationModal] = useState(false);
 const [explanation, setExplanation] = useState('');
 const [attachments, setAttachments] = useState<string[]>([]);

 useEffect(() => {
 loadMyRecords();
 }, [selectedPeriod]);

 const loadMyRecords = () => {
 // Get all records for current employee
 const allMyRecords = attendanceService.getByStaffId(currentEmployeeId);
 
 let filtered = allMyRecords;
 
 if (selectedPeriod === 'current') {
 const now = new Date();
 const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
 filtered = allMyRecords.filter(r => r.periodMonth === currentMonth);
 } else if (selectedPeriod === 'last') {
 const now = new Date();
 const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
 const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
 filtered = allMyRecords.filter(r => r.periodMonth === lastMonthStr);
 }
 
 // Sort by date descending
 filtered.sort((a, b) => b.date.localeCompare(a.date));
 
 setMyRecords(filtered);
 };

 const handleSubmitExplanation = () => {
 if (!selectedRecord) return;
 
 if (!explanation.trim()) {
 alert(t.hrAttendance.pleaseEnterAnExplanation);
 return;
 }
 
 try {
 const success = attendanceService.addEmployeeExplanation(
 selectedRecord.id,
 explanation,
 attachments
 );
 
 if (success) {
 alert(t.hrAttendance.explanationSubmittedSuccessfully);
 setShowExplanationModal(false);
 setExplanation('');
 setAttachments([]);
 setSelectedRecord(null);
 loadMyRecords();
 }
 } catch (error: any) {
 alert(error.message);
 }
 };

 const openExplanationModal = (record: AttendanceRecord) => {
 setSelectedRecord(record);
 setExplanation(record.employeeExplanation || '');
 setAttachments(record.employeeAttachments || []);
 setShowExplanationModal(true);
 };

 const getStatusBadge = (record: AttendanceRecord) => {
 if (record.status === 'present' && !record.isLate) {
 return { color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-4 h-4" />, label: t.hrAttendance.present };
 } else if (record.status === 'late') {
 return { color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-4 h-4" />, label: `Late (${record.lateMinutes} min)` };
 } else if (record.status === 'absent') {
 return { color: 'bg-red-100 text-red-700', icon: <AlertCircle className="w-4 h-4" />, label: t.hrAttendance.absent };
 } else if (record.status === 'overtime') {
 return { color: 'bg-purple-100 text-purple-700', icon: <Clock className="w-4 h-4" />, label: `Overtime (${record.overtimeHours.toFixed(1)}h)` };
 } else if (record.status === 'on_leave') {
 return { color: 'bg-blue-100 text-blue-700', icon: <Calendar className="w-4 h-4" />, label: t.hrAttendance.onLeave };
 } else if (record.status === 'field_work') {
 return { color: 'bg-indigo-100 text-indigo-700', icon: <FileText className="w-4 h-4" />, label: t.hrAttendance.fieldWork };
 }
 return { color: 'bg-gray-100 text-gray-700', icon: <Info className="w-4 h-4" />, label: record.status };
 };

 const labels = {
 title: t.hrAttendance.myAttendance,
 subtitle: t.hrAttendance.viewYourAttendanceRecordsAndSubmit,
 
 currentMonth: t.hrAttendance.currentMonth,
 lastMonth: t.hrAttendance.lastMonth,
 allRecords: t.hrAttendance.allRecords,
 
 date: t.hrAttendance.date,
 status: t.hrAttendance.status,
 plannedHours: t.hrAttendance.planned,
 actualHours: t.hrAttendance.actual,
 notes: t.hrAttendance.notes,
 explanation: t.hrAttendance.explanation,
 
 submitExplanation: t.hrAttendance.submitExplanation,
 explanationSubmitted: t.hrAttendance.explanationSubmitted,
 noExplanation: t.hrAttendance.noExplanationSubmitted,
 
 flaggedDay: t.hrAttendance.flaggedDay,
 lockedPeriod: t.hrAttendance.lockedPeriod,
 cannotSubmit: t.hrAttendance.cannotSubmitExplanationsForLockedPeriods,
 
 noRecords: t.hrAttendance.noAttendanceRecordsFound,
 totalDays: t.hrAttendance.totalDays,
 presentDays: t.hrAttendance.presentDays,
 lateDays: t.hrAttendance.lateDays,
 
 // Explanation Modal
 modalTitle: t.hrAttendance.submitExplanation,
 modalSubtitle: t.hrAttendance.provideAnExplanationForThisAttendance,
 yourExplanation: t.hrAttendance.yourExplanation,
 enterExplanation: t.hrAttendance.enterYourExplanationHere,
 attachments: t.hrAttendance.attachmentsOptional,
 addAttachment: t.hrAttendance.addAttachment,
 submit: t.hrAttendance.submit,
 cancel: t.hrAttendance.cancel,
 
 // Info Notice
 infoTitle: t.hrAttendance.importantNotice,
 infoText: 'You can only view your attendance records and submit explanations. You cannot edit attendance data or change hours.'
 };

 const summary = {
 total: myRecords.length,
 present: myRecords.filter(r => r.status === 'present' || r.status === 'overtime').length,
 late: myRecords.filter(r => r.isLate).length,
 absent: myRecords.filter(r => r.status === 'absent').length
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

 {/* Info Notice */}
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
 <div className={`flex items-start gap-3`}>
 <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
 <div className={'text-start'}>
 <p className="text-sm font-semibold text-blue-900">{labels.infoTitle}</p>
 <p className="text-sm text-blue-700 mt-1">{labels.infoText}</p>
 </div>
 </div>
 </div>

 {/* Summary Cards */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div className="bg-white rounded-lg border border-gray-200 p-4">
 <p className={`text-sm text-gray-600 mb-1 text-start`}>{labels.totalDays}</p>
 <p className={`text-2xl font-bold text-gray-900 text-start`}>{summary.total}</p>
 </div>
 <div className="bg-white rounded-lg border border-gray-200 p-4">
 <p className={`text-sm text-gray-600 mb-1 text-start`}>{labels.presentDays}</p>
 <p className={`text-2xl font-bold text-green-600 text-start`}>{summary.present}</p>
 </div>
 <div className="bg-white rounded-lg border border-gray-200 p-4">
 <p className={`text-sm text-gray-600 mb-1 text-start`}>{labels.lateDays}</p>
 <p className={`text-2xl font-bold text-yellow-600 text-start`}>{summary.late}</p>
 </div>
 <div className="bg-white rounded-lg border border-gray-200 p-4">
 <p className={`text-sm text-gray-600 mb-1 text-start`}>{t.hrAttendance.absentDays}</p>
 <p className={`text-2xl font-bold text-red-600 text-start`}>{summary.absent}</p>
 </div>
 </div>

 {/* Period Filter */}
 <div className="flex items-center gap-3">
 <select
 value={selectedPeriod}
 onChange={(e) => setSelectedPeriod(e.target.value)}
 className={`px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-end' : ''}`}
 >
 <option value="current">{labels.currentMonth}</option>
 <option value="last">{labels.lastMonth}</option>
 <option value="all">{labels.allRecords}</option>
 </select>
 </div>

 {/* Records List */}
 <div className="space-y-3">
 {myRecords.length === 0 ? (
 <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
 <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
 <p className="text-gray-500">{labels.noRecords}</p>
 </div>
 ) : (
 myRecords.map((record) => {
 const statusBadge = getStatusBadge(record);
 const hasExplanation = !!record.employeeExplanation;

 return (
 <div
 key={record.id}
 className={`bg-white rounded-lg border-2 ${record.isFlagged ? 'border-yellow-300' : 'border-gray-200'} p-4 hover:shadow-md transition-all`}
 >
 <div className={`flex items-start justify-between`}>
 {/* Left Side */}
 <div className={`flex-1 text-start`}>
 <div className={`flex items-center gap-3 mb-2`}>
 <p className="text-lg font-bold text-gray-900">{record.date}</p>
 {record.periodLocked && (
 <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
 <Lock className="w-3 h-3" />
 {labels.lockedPeriod}
 </span>
 )}
 {record.isFlagged && (
 <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
 <AlertCircle className="w-3 h-3" />
 {labels.flaggedDay}
 </span>
 )}
 </div>

 <div className={`flex items-center gap-2 mb-3`}>
 <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium ${statusBadge.color}`}>
 {statusBadge.icon}
 {statusBadge.label}
 </span>
 </div>

 <div className={`grid grid-cols-2 gap-4 text-sm text-start`}>
 <div>
 <p className="text-gray-600">{labels.plannedHours}</p>
 <p className="font-semibold text-gray-900">
 {record.plannedShiftStart} - {record.plannedShiftEnd} ({record.plannedHours}h)
 </p>
 </div>
 <div>
 <p className="text-gray-600">{labels.actualHours}</p>
 <p className="font-semibold text-gray-900">
 {record.actualCheckIn || '-'} - {record.actualCheckOut || '-'} ({record.actualHours}h)
 </p>
 </div>
 </div>

 {record.notes && (
 <div className={`mt-3 p-3 bg-gray-50 rounded-lg text-start`}>
 <p className="text-xs text-gray-600 mb-1">{labels.notes}</p>
 <p className="text-sm text-gray-900">{record.notes}</p>
 </div>
 )}

 {hasExplanation && (
 <div className={`mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-start`}>
 <div className={`flex items-center gap-2 mb-1`}>
 <CheckCircle className="w-4 h-4 text-green-600" />
 <p className="text-xs font-semibold text-green-700">{labels.explanationSubmitted}</p>
 </div>
 <p className="text-sm text-gray-900">{record.employeeExplanation}</p>
 {record.employeeExplanationDate && (
 <p className="text-xs text-gray-500 mt-1">
 {new Date(record.employeeExplanationDate).toLocaleString()}
 </p>
 )}
 </div>
 )}
 </div>

 {/* Right Side - Action */}
 <div className="flex-shrink-0">
 {record.isFlagged && !record.periodLocked && (
 <button
 onClick={() => openExplanationModal(record)}
 className={`flex items-center gap-2 px-4 py-2 ${hasExplanation ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white text-sm font-medium rounded-lg transition-colors`}
 >
 <MessageSquare className="w-4 h-4" />
 <span>{hasExplanation ? (t.hrAttendance.update) : labels.submitExplanation}</span>
 </button>
 )}
 {record.periodLocked && (
 <div className={`px-4 py-2 bg-gray-100 text-gray-500 text-sm rounded-lg text-start`}>
 <Lock className="w-4 h-4 mx-auto mb-1" />
 <p className="text-xs">{labels.cannotSubmit}</p>
 </div>
 )}
 </div>
 </div>
 </div>
 );
 })
 )}
 </div>

 {/* Explanation Modal */}
 {showExplanationModal && selectedRecord && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
 <div className={`p-6 border-b border-gray-200 text-start`}>
 <h2 className="text-xl font-bold text-gray-900">{labels.modalTitle}</h2>
 <p className="text-sm text-gray-600 mt-1">{labels.modalSubtitle}</p>
 <p className="text-sm font-semibold text-gray-900 mt-2">
 {t.hrAttendance.date2}{selectedRecord.date}
 </p>
 </div>

 <div className={`p-6 space-y-4 text-start`}>
 {/* Explanation Textarea */}
 <div>
 <label className="block text-sm font-semibold text-gray-700 mb-2">
 {labels.yourExplanation}
 </label>
 <textarea
 value={explanation}
 onChange={(e) => setExplanation(e.target.value)}
 placeholder={labels.enterExplanation}
 rows={5}
 className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-start`}
 />
 </div>

 {/* Attachments (Placeholder) */}
 <div>
 <label className="block text-sm font-semibold text-gray-700 mb-2">
 {labels.attachments}
 </label>
 <button className={`flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors`}>
 <Upload className="w-4 h-4" />
 <span>{labels.addAttachment}</span>
 </button>
 </div>
 </div>

 {/* Actions */}
 <div className={`p-6 border-t border-gray-200 flex items-center gap-3`}>
 <button
 onClick={handleSubmitExplanation}
 className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
 >
 {labels.submit}
 </button>
 <button
 onClick={() => {
 setShowExplanationModal(false);
 setExplanation('');
 setAttachments([]);
 setSelectedRecord(null);
 }}
 className="flex-1 px-6 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
 >
 {labels.cancel}
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
