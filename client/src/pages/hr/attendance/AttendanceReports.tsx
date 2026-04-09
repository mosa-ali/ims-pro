/**
 * ============================================================================
 * ATTENDANCE REPORTS - PRINTABLE OUTPUTS
 * ============================================================================
 * 
 * Professional print-ready documents:
 * - Monthly Attendance Sheet
 * - Attendance Adjustment Form
 * - Overtime Approval Sheet
 * 
 * REQUIREMENTS:
 * - A4 format
 * - Organization name & logo
 * - EN / AR support
 * - Signature placeholders
 * - Date & period clearly shown
 * 
 * ============================================================================
 */
import { Link } from 'wouter';

import { useState, useEffect } from 'react';
import {
 FileText,
 Download,
 Printer,
 Calendar,
 Clock,
 Users
, ArrowLeft, ArrowRight} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { attendanceService, AttendanceRecord } from '@/app/services/attendanceService';
import { useTranslation } from '@/i18n/useTranslation';

type ReportType = 'monthly_sheet' | 'adjustment_form' | 'overtime_sheet';

export function AttendanceReports() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();

 const [selectedReport, setSelectedReport] = useState<ReportType>('monthly_sheet');
 const [selectedMonth, setSelectedMonth] = useState<string>('');
 const [records, setRecords] = useState<AttendanceRecord[]>([]);
 const [showPreview, setShowPreview] = useState(false);

 useEffect(() => {
 // Set default month to current month
 const now = new Date();
 const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
 setSelectedMonth(currentMonth);
 }, []);

 useEffect(() => {
 if (selectedMonth) {
 loadRecords();
 }
 }, [selectedMonth]);

 const loadRecords = () => {
 const periodRecords = attendanceService.getByPeriod(selectedMonth);
 setRecords(periodRecords);
 };

 const handlePrint = () => {
 window.print();
 };

 const handleExport = () => {
 alert('Export to Excel/PDF will be implemented with backend integration');
 };

 const getMonthName = () => {
 if (!selectedMonth) return '';
 const [year, month] = selectedMonth.split('-');
 const monthNames = language === 'en'
 ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
 : ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
 return `${monthNames[parseInt(month) - 1]} ${year}`;
 };

 const labels = {
 title: t.hrAttendance.attendanceReports,
 subtitle: t.hrAttendance.generateAndPrintAttendanceReports,
 
 // Report Types
 monthlySheet: t.hrAttendance.monthlyAttendanceSheet,
 adjustmentForm: t.hrAttendance.attendanceAdjustmentForm,
 overtimeSheet: t.hrAttendance.overtimeApprovalSheet,
 
 // Actions
 selectMonth: t.hrAttendance.selectMonth,
 preview: t.hrAttendance.preview,
 print: t.hrAttendance.print,
 export: t.hrAttendance.export,
 
 // Report Content
 organizationName: t.hrAttendance.humanitarianOrganization,
 systemName: t.hrAttendance.integratedManagementSystemIms,
 reportTitle: t.hrAttendance.attendanceReport,
 period: t.hrAttendance.period,
 generatedOn: t.hrAttendance.generatedOn,
 
 // Table Headers
 no: '#',
 staffName: t.hrAttendance.staffName,
 staffId: t.hrAttendance.staffId,
 date: t.hrAttendance.date,
 checkIn: t.hrAttendance.checkIn,
 checkOut: t.hrAttendance.checkOut,
 hours: t.hrAttendance.hours,
 overtime: t.hrAttendance.overtime,
 status: t.hrAttendance.status,
 notes: t.hrAttendance.notes,
 
 // Signatures
 preparedBy: t.hrAttendance.preparedBy,
 reviewedBy: t.hrAttendance.reviewedBy,
 approvedBy: t.hrAttendance.approvedBy,
 signature: t.hrAttendance.signature,
 dateLabel: t.hrAttendance.date,
 
 // Summary
 summary: t.hrAttendance.summary,
 totalStaff: t.hrAttendance.totalStaff,
 totalDays: t.hrAttendance.totalDays,
 totalOvertimeHours: t.hrAttendance.totalOvertimeHours,
 
 noRecords: t.hrAttendance.noRecordsFoundForSelectedPeriod
 };

 const reportTemplates = [
 {
 type: 'monthly_sheet' as ReportType,
 name: labels.monthlySheet,
 icon: Calendar,
 description: t.hrAttendance.completeMonthlyAttendanceReportWithAll
 },
 {
 type: 'adjustment_form' as ReportType,
 name: labels.adjustmentForm,
 icon: FileText,
 description: t.hrAttendance.formForAttendanceAdjustmentsAndCorrections
 },
 {
 type: 'overtime_sheet' as ReportType,
 name: labels.overtimeSheet,
 icon: Clock,
 description: t.hrAttendance.overtimeHoursApprovalSheet
 }
 ];

 const renderMonthlySheet = () => {
 const uniqueStaff = Array.from(new Set(records.map(r => r.staffId)));
 const totalOvertimeHours = records.reduce((sum, r) => sum + r.overtimeHours, 0);

 return (
 <div className="bg-white p-8 rounded-lg border border-gray-200 print:border-0" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className={`text-center mb-8 text-start`}>
 <h1 className="text-2xl font-bold text-gray-900 mb-2">{labels.organizationName}</h1>
 <h2 className="text-xl font-semibold text-gray-700 mb-4">{labels.monthlySheet}</h2>
 <div className="flex justify-between items-center border-t border-b border-gray-300 py-2 mt-4">
 <div>
 <span className="font-semibold">{labels.period}: </span>
 <span>{getMonthName()}</span>
 </div>
 <div>
 <span className="font-semibold">{labels.generatedOn}: </span>
 <span>{new Date().toLocaleDateString()}</span>
 </div>
 </div>
 </div>

 {/* Summary */}
 <div className="grid grid-cols-3 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
 <div className={'text-start'}>
 <p className="text-sm text-gray-600">{labels.totalStaff}</p>
 <p className="text-xl font-bold text-gray-900">{uniqueStaff.length}</p>
 </div>
 <div className={'text-start'}>
 <p className="text-sm text-gray-600">{labels.totalDays}</p>
 <p className="text-xl font-bold text-gray-900">{records.length}</p>
 </div>
 <div className={'text-start'}>
 <p className="text-sm text-gray-600">{labels.totalOvertimeHours}</p>
 <p className="text-xl font-bold text-gray-900">{totalOvertimeHours.toFixed(1)}</p>
 </div>
 </div>

 {/* Table */}
 <table className="w-full border-collapse border border-gray-300 mb-8">
 <thead>
 <tr className="bg-gray-100">
 <th className={`border border-gray-300 px-2 py-2 text-sm text-start`}>{labels.no}</th>
 <th className={`border border-gray-300 px-2 py-2 text-sm text-start`}>{labels.staffName}</th>
 <th className={`border border-gray-300 px-2 py-2 text-sm text-start`}>{labels.date}</th>
 <th className={`border border-gray-300 px-2 py-2 text-sm text-start`}>{labels.checkIn}</th>
 <th className={`border border-gray-300 px-2 py-2 text-sm text-start`}>{labels.checkOut}</th>
 <th className={`border border-gray-300 px-2 py-2 text-sm text-start`}>{labels.hours}</th>
 <th className={`border border-gray-300 px-2 py-2 text-sm text-start`}>{labels.overtime}</th>
 <th className={`border border-gray-300 px-2 py-2 text-sm text-start`}>{labels.status}</th>
 </tr>
 </thead>
 <tbody>
 {records.length === 0 ? (
 <tr>
 <td colSpan={8} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
 {labels.noRecords}
 </td>
 </tr>
 ) : (
 records.map((record, index) => (
 <tr key={record.id}>
 <td className={`border border-gray-300 px-2 py-2 text-sm text-start`}>{index + 1}</td>
 <td className={`border border-gray-300 px-2 py-2 text-sm text-start`}>{record.staffName}</td>
 <td className={`border border-gray-300 px-2 py-2 text-sm text-start`}>{record.date}</td>
 <td className={`border border-gray-300 px-2 py-2 text-sm text-start`}>{record.actualCheckIn || '-'}</td>
 <td className={`border border-gray-300 px-2 py-2 text-sm text-start`}>{record.actualCheckOut || '-'}</td>
 <td className={`border border-gray-300 px-2 py-2 text-sm text-start`}>{record.actualHours.toFixed(1)}</td>
 <td className={`border border-gray-300 px-2 py-2 text-sm text-start`}>{record.overtimeHours > 0 ? record.overtimeHours.toFixed(1) : '-'}</td>
 <td className={`border border-gray-300 px-2 py-2 text-sm text-start`}>{record.status}</td>
 </tr>
 ))
 )}
 </tbody>
 </table>

 {/* Signatures */}
 <div className="grid grid-cols-3 gap-8 mt-12">
 <div className={'text-start'}>
 <p className="font-semibold mb-8">{labels.preparedBy}</p>
 <div className="border-t border-gray-400 pt-2">
 <p className="text-sm text-gray-600">{labels.signature}</p>
 </div>
 <div className="mt-4">
 <p className="text-sm text-gray-600">{labels.dateLabel}: ___________</p>
 </div>
 </div>
 <div className={'text-start'}>
 <p className="font-semibold mb-8">{labels.reviewedBy}</p>
 <div className="border-t border-gray-400 pt-2">
 <p className="text-sm text-gray-600">{labels.signature}</p>
 </div>
 <div className="mt-4">
 <p className="text-sm text-gray-600">{labels.dateLabel}: ___________</p>
 </div>
 </div>
 <div className={'text-start'}>
 <p className="font-semibold mb-8">{labels.approvedBy}</p>
 <div className="border-t border-gray-400 pt-2">
 <p className="text-sm text-gray-600">{labels.signature}</p>
 </div>
 <div className="mt-4">
 <p className="text-sm text-gray-600">{labels.dateLabel}: ___________</p>
 </div>
 </div>
 </div>
 </div>
 );
 };

 const renderOvertimeSheet = () => {
 const overtimeRecords = records.filter(r => r.overtimeHours > 0);
 const totalOvertimeHours = overtimeRecords.reduce((sum, r) => sum + r.overtimeHours, 0);

 return (
 <div className="bg-white p-8 rounded-lg border border-gray-200 print:border-0">
 {/* Header */}
 <div className={`text-center mb-8 text-start`}>
 <h1 className="text-2xl font-bold text-gray-900 mb-2">{labels.organizationName}</h1>
 <h2 className="text-xl font-semibold text-gray-700 mb-4">{labels.overtimeSheet}</h2>
 <div className="flex justify-between items-center border-t border-b border-gray-300 py-2 mt-4">
 <div>
 <span className="font-semibold">{labels.period}: </span>
 <span>{getMonthName()}</span>
 </div>
 <div>
 <span className="font-semibold">{labels.generatedOn}: </span>
 <span>{new Date().toLocaleDateString()}</span>
 </div>
 </div>
 </div>

 {/* Summary */}
 <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
 <p className={`text-lg font-bold text-purple-900 text-start`}>
 {labels.totalOvertimeHours}: {totalOvertimeHours.toFixed(1)} {labels.hours}
 </p>
 </div>

 {/* Table */}
 <table className="w-full border-collapse border border-gray-300 mb-8">
 <thead>
 <tr className="bg-gray-100">
 <th className={`border border-gray-300 px-2 py-2 text-sm text-start`}>{labels.no}</th>
 <th className={`border border-gray-300 px-2 py-2 text-sm text-start`}>{labels.staffName}</th>
 <th className={`border border-gray-300 px-2 py-2 text-sm text-start`}>{labels.staffId}</th>
 <th className={`border border-gray-300 px-2 py-2 text-sm text-start`}>{labels.date}</th>
 <th className={`border border-gray-300 px-2 py-2 text-sm text-start`}>{labels.overtime}</th>
 <th className={`border border-gray-300 px-2 py-2 text-sm text-start`}>{labels.status}</th>
 <th className={`border border-gray-300 px-2 py-2 text-sm text-start`}>{labels.notes}</th>
 </tr>
 </thead>
 <tbody>
 {overtimeRecords.length === 0 ? (
 <tr>
 <td colSpan={7} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
 {t.hrAttendance.noOvertimeRecordsForThisPeriod}
 </td>
 </tr>
 ) : (
 overtimeRecords.map((record, index) => (
 <tr key={record.id}>
 <td className={`border border-gray-300 px-2 py-2 text-sm text-start`}>{index + 1}</td>
 <td className={`border border-gray-300 px-2 py-2 text-sm text-start`}>{record.staffName}</td>
 <td className={`border border-gray-300 px-2 py-2 text-sm text-start`}>{record.staffId}</td>
 <td className={`border border-gray-300 px-2 py-2 text-sm text-start`}>{record.date}</td>
 <td className={`border border-gray-300 px-2 py-2 text-sm font-bold text-purple-600 text-start`}>
 {record.overtimeHours.toFixed(1)}h
 </td>
 <td className={`border border-gray-300 px-2 py-2 text-sm text-start`}>
 {record.overtimeApprovalStatus}
 </td>
 <td className={`border border-gray-300 px-2 py-2 text-sm text-start`}>
 {record.notes || '-'}
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>

 {/* Signatures */}
 <div className="grid grid-cols-3 gap-8 mt-12">
 <div className={'text-start'}>
 <p className="font-semibold mb-8">{labels.preparedBy}</p>
 <div className="border-t border-gray-400 pt-2">
 <p className="text-sm text-gray-600">{labels.signature}</p>
 </div>
 <div className="mt-4">
 <p className="text-sm text-gray-600">{labels.dateLabel}: ___________</p>
 </div>
 </div>
 <div className={'text-start'}>
 <p className="font-semibold mb-8">{labels.reviewedBy}</p>
 <div className="border-t border-gray-400 pt-2">
 <p className="text-sm text-gray-600">{labels.signature}</p>
 </div>
 <div className="mt-4">
 <p className="text-sm text-gray-600">{labels.dateLabel}: ___________</p>
 </div>
 </div>
 <div className={'text-start'}>
 <p className="font-semibold mb-8">{labels.approvedBy}</p>
 <div className="border-t border-gray-400 pt-2">
 <p className="text-sm text-gray-600">{labels.signature}</p>
 </div>
 <div className="mt-4">
 <p className="text-sm text-gray-600">{labels.dateLabel}: ___________</p>
 </div>
 </div>
 </div>
 </div>
 );
 };

 return (
 <div className="space-y-6 print:space-y-0">
 {/* Header - Hide on print */}
 <div className="print:hidden">
 
 </div>

 <div className="print:hidden">
 <h1 className={`text-2xl font-bold text-gray-900 text-start`}>
 {labels.title}
 </h1>
 <p className={`text-sm text-gray-600 mt-1 text-start`}>
 {labels.subtitle}
 </p>
 </div>

 {/* Report Selection - Hide on print */}
 <div className="print:hidden grid grid-cols-1 md:grid-cols-3 gap-4">
 {reportTemplates.map((template) => {
 const Icon = template.icon;
 return (
 <button
 key={template.type}
 onClick={() => setSelectedReport(template.type)}
 className={`p-4 rounded-lg border-2 transition-all ${ selectedReport === template.type ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300' } text-start`}
 >
 <Icon className={`w-8 h-8 ${selectedReport === template.type ? 'text-blue-600' : 'text-gray-600'} mb-2`} />
 <h3 className="font-bold text-gray-900 mb-1">{template.name}</h3>
 <p className="text-xs text-gray-600">{template.description}</p>
 </button>
 );
 })}
 </div>

 {/* Controls - Hide on print */}
 <div className="print:hidden bg-white rounded-lg border border-gray-200 p-4">
 <div className={`flex items-center gap-4`}>
 <div className="flex-1">
 <label className={`block text-sm font-semibold text-gray-700 mb-2 text-start`}>
 {labels.selectMonth}
 </label>
 <input
 type="month"
 value={selectedMonth}
 onChange={(e) => setSelectedMonth(e.target.value)}
 className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-end' : ''}`}
 />
 </div>

 <div className={`flex gap-3 items-end`}>
 <button
 onClick={handlePrint}
 className={`flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors`}
 >
 <Printer className="w-5 h-5" />
 <span>{labels.print}</span>
 </button>

 <button
 onClick={handleExport}
 className={`flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors`}
 >
 <Download className="w-5 h-5" />
 <span>{labels.export}</span>
 </button>
 </div>
 </div>
 </div>

 {/* Report Preview */}
 {selectedReport === 'monthly_sheet' && renderMonthlySheet()}
 {selectedReport === 'overtime_sheet' && renderOvertimeSheet()}
 {selectedReport === 'adjustment_form' && (
 <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
 <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
 <p className="text-gray-600">
 {'Adjustment Form template will be implemented based on organizational needs'}
 </p>
 </div>
 )}
 </div>
 );
}