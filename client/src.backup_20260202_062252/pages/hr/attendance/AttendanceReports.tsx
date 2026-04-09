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

import { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Clock,
  Users
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { BackToModulesButton } from '../BackToModulesButton';
import { attendanceService, AttendanceRecord } from '@/app/services/attendanceService';

type ReportType = 'monthly_sheet' | 'adjustment_form' | 'overtime_sheet';

export function AttendanceReports() {
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
    alert(language === 'en' 
      ? 'Export to Excel/PDF will be implemented with backend integration' 
      : 'سيتم تنفيذ التصدير إلى Excel/PDF مع التكامل الخلفي');
  };

  const getMonthName = () => {
    if (!selectedMonth) return '';
    const [year, month] = selectedMonth.split('-');
    const monthNames = language === 'en'
      ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      : ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  const t = {
    title: language === 'en' ? 'Attendance Reports' : 'تقارير الحضور',
    subtitle: language === 'en' ? 'Generate and print attendance reports' : 'إنشاء وطباعة تقارير الحضور',
    
    // Report Types
    monthlySheet: language === 'en' ? 'Monthly Attendance Sheet' : 'كشف الحضور الشهري',
    adjustmentForm: language === 'en' ? 'Attendance Adjustment Form' : 'نموذج تعديل الحضور',
    overtimeSheet: language === 'en' ? 'Overtime Approval Sheet' : 'كشف الموافقة على العمل الإضافي',
    
    // Actions
    selectMonth: language === 'en' ? 'Select Month' : 'اختر الشهر',
    preview: language === 'en' ? 'Preview' : 'معاينة',
    print: language === 'en' ? 'Print' : 'طباعة',
    export: language === 'en' ? 'Export' : 'تصدير',
    
    // Report Content
    organizationName: language === 'en' ? 'Humanitarian Organization' : 'المنظمة الإنسانية',
    systemName: language === 'en' ? 'Integrated Management System (IMS)' : 'نظام الإدارة المتكامل (IMS)',
    reportTitle: language === 'en' ? 'Attendance Report' : 'تقرير الحضور',
    period: language === 'en' ? 'Period' : 'الفترة',
    generatedOn: language === 'en' ? 'Generated On' : 'تاريخ الإنشاء',
    
    // Table Headers
    no: language === 'en' ? '#' : 'الرقم',
    staffName: language === 'en' ? 'Staff Name' : 'اسم الموظف',
    staffId: language === 'en' ? 'Staff ID' : 'الرقم الوظيفي',
    date: language === 'en' ? 'Date' : 'التاريخ',
    checkIn: language === 'en' ? 'Check In' : 'تسجيل الدخول',
    checkOut: language === 'en' ? 'Check Out' : 'تسجيل الخروج',
    hours: language === 'en' ? 'Hours' : 'الساعات',
    overtime: language === 'en' ? 'Overtime' : 'عمل إضافي',
    status: language === 'en' ? 'Status' : 'الحالة',
    notes: language === 'en' ? 'Notes' : 'ملاحظات',
    
    // Signatures
    preparedBy: language === 'en' ? 'Prepared By' : 'أعده',
    reviewedBy: language === 'en' ? 'Reviewed By' : 'راجعه',
    approvedBy: language === 'en' ? 'Approved By' : 'اعتمده',
    signature: language === 'en' ? 'Signature' : 'التوقيع',
    dateLabel: language === 'en' ? 'Date' : 'التاريخ',
    
    // Summary
    summary: language === 'en' ? 'Summary' : 'الملخص',
    totalStaff: language === 'en' ? 'Total Staff' : 'إجمالي الموظفين',
    totalDays: language === 'en' ? 'Total Days' : 'إجمالي الأيام',
    totalOvertimeHours: language === 'en' ? 'Total Overtime Hours' : 'إجمالي ساعات العمل الإضافي',
    
    noRecords: language === 'en' ? 'No records found for selected period' : 'لا توجد سجلات للفترة المحددة'
  };

  const reportTemplates = [
    {
      type: 'monthly_sheet' as ReportType,
      name: t.monthlySheet,
      icon: Calendar,
      description: language === 'en' ? 'Complete monthly attendance report with all staff' : 'تقرير الحضور الشهري الكامل لجميع الموظفين'
    },
    {
      type: 'adjustment_form' as ReportType,
      name: t.adjustmentForm,
      icon: FileText,
      description: language === 'en' ? 'Form for attendance adjustments and corrections' : 'نموذج لتعديلات وتصحيحات الحضور'
    },
    {
      type: 'overtime_sheet' as ReportType,
      name: t.overtimeSheet,
      icon: Clock,
      description: language === 'en' ? 'Overtime hours approval sheet' : 'كشف الموافقة على ساعات العمل الإضافي'
    }
  ];

  const renderMonthlySheet = () => {
    const uniqueStaff = Array.from(new Set(records.map(r => r.staffId)));
    const totalOvertimeHours = records.reduce((sum, r) => sum + r.overtimeHours, 0);

    return (
      <div className="bg-white p-8 rounded-lg border border-gray-200 print:border-0">
        {/* Header */}
        <div className={`text-center mb-8 ${isRTL ? 'text-right' : 'text-left'}`}>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t.organizationName}</h1>
          <h2 className="text-xl font-semibold text-gray-700 mb-4">{t.monthlySheet}</h2>
          <div className="flex justify-between items-center border-t border-b border-gray-300 py-2 mt-4">
            <div>
              <span className="font-semibold">{t.period}: </span>
              <span>{getMonthName()}</span>
            </div>
            <div>
              <span className="font-semibold">{t.generatedOn}: </span>
              <span>{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-sm text-gray-600">{t.totalStaff}</p>
            <p className="text-xl font-bold text-gray-900">{uniqueStaff.length}</p>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-sm text-gray-600">{t.totalDays}</p>
            <p className="text-xl font-bold text-gray-900">{records.length}</p>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-sm text-gray-600">{t.totalOvertimeHours}</p>
            <p className="text-xl font-bold text-gray-900">{totalOvertimeHours.toFixed(1)}</p>
          </div>
        </div>

        {/* Table */}
        <table className="w-full border-collapse border border-gray-300 mb-8">
          <thead>
            <tr className="bg-gray-100">
              <th className={`border border-gray-300 px-2 py-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{t.no}</th>
              <th className={`border border-gray-300 px-2 py-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{t.staffName}</th>
              <th className={`border border-gray-300 px-2 py-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{t.date}</th>
              <th className={`border border-gray-300 px-2 py-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{t.checkIn}</th>
              <th className={`border border-gray-300 px-2 py-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{t.checkOut}</th>
              <th className={`border border-gray-300 px-2 py-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{t.hours}</th>
              <th className={`border border-gray-300 px-2 py-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{t.overtime}</th>
              <th className={`border border-gray-300 px-2 py-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{t.status}</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={8} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                  {t.noRecords}
                </td>
              </tr>
            ) : (
              records.map((record, index) => (
                <tr key={record.id}>
                  <td className={`border border-gray-300 px-2 py-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{index + 1}</td>
                  <td className={`border border-gray-300 px-2 py-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{record.staffName}</td>
                  <td className={`border border-gray-300 px-2 py-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{record.date}</td>
                  <td className={`border border-gray-300 px-2 py-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{record.actualCheckIn || '-'}</td>
                  <td className={`border border-gray-300 px-2 py-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{record.actualCheckOut || '-'}</td>
                  <td className={`border border-gray-300 px-2 py-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{record.actualHours.toFixed(1)}</td>
                  <td className={`border border-gray-300 px-2 py-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{record.overtimeHours > 0 ? record.overtimeHours.toFixed(1) : '-'}</td>
                  <td className={`border border-gray-300 px-2 py-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{record.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Signatures */}
        <div className="grid grid-cols-3 gap-8 mt-12">
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="font-semibold mb-8">{t.preparedBy}</p>
            <div className="border-t border-gray-400 pt-2">
              <p className="text-sm text-gray-600">{t.signature}</p>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-600">{t.dateLabel}: ___________</p>
            </div>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="font-semibold mb-8">{t.reviewedBy}</p>
            <div className="border-t border-gray-400 pt-2">
              <p className="text-sm text-gray-600">{t.signature}</p>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-600">{t.dateLabel}: ___________</p>
            </div>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="font-semibold mb-8">{t.approvedBy}</p>
            <div className="border-t border-gray-400 pt-2">
              <p className="text-sm text-gray-600">{t.signature}</p>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-600">{t.dateLabel}: ___________</p>
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
        <div className={`text-center mb-8 ${isRTL ? 'text-right' : 'text-left'}`}>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t.organizationName}</h1>
          <h2 className="text-xl font-semibold text-gray-700 mb-4">{t.overtimeSheet}</h2>
          <div className="flex justify-between items-center border-t border-b border-gray-300 py-2 mt-4">
            <div>
              <span className="font-semibold">{t.period}: </span>
              <span>{getMonthName()}</span>
            </div>
            <div>
              <span className="font-semibold">{t.generatedOn}: </span>
              <span>{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <p className={`text-lg font-bold text-purple-900 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.totalOvertimeHours}: {totalOvertimeHours.toFixed(1)} {t.hours}
          </p>
        </div>

        {/* Table */}
        <table className="w-full border-collapse border border-gray-300 mb-8">
          <thead>
            <tr className="bg-gray-100">
              <th className={`border border-gray-300 px-2 py-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{t.no}</th>
              <th className={`border border-gray-300 px-2 py-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{t.staffName}</th>
              <th className={`border border-gray-300 px-2 py-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{t.staffId}</th>
              <th className={`border border-gray-300 px-2 py-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{t.date}</th>
              <th className={`border border-gray-300 px-2 py-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{t.overtime}</th>
              <th className={`border border-gray-300 px-2 py-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{t.status}</th>
              <th className={`border border-gray-300 px-2 py-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{t.notes}</th>
            </tr>
          </thead>
          <tbody>
            {overtimeRecords.length === 0 ? (
              <tr>
                <td colSpan={7} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                  {language === 'en' ? 'No overtime records for this period' : 'لا توجد سجلات عمل إضافي لهذه الفترة'}
                </td>
              </tr>
            ) : (
              overtimeRecords.map((record, index) => (
                <tr key={record.id}>
                  <td className={`border border-gray-300 px-2 py-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{index + 1}</td>
                  <td className={`border border-gray-300 px-2 py-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{record.staffName}</td>
                  <td className={`border border-gray-300 px-2 py-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{record.staffId}</td>
                  <td className={`border border-gray-300 px-2 py-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{record.date}</td>
                  <td className={`border border-gray-300 px-2 py-2 text-sm font-bold text-purple-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {record.overtimeHours.toFixed(1)}h
                  </td>
                  <td className={`border border-gray-300 px-2 py-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                    {record.overtimeApprovalStatus}
                  </td>
                  <td className={`border border-gray-300 px-2 py-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                    {record.notes || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Signatures */}
        <div className="grid grid-cols-3 gap-8 mt-12">
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="font-semibold mb-8">{t.preparedBy}</p>
            <div className="border-t border-gray-400 pt-2">
              <p className="text-sm text-gray-600">{t.signature}</p>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-600">{t.dateLabel}: ___________</p>
            </div>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="font-semibold mb-8">{t.reviewedBy}</p>
            <div className="border-t border-gray-400 pt-2">
              <p className="text-sm text-gray-600">{t.signature}</p>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-600">{t.dateLabel}: ___________</p>
            </div>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="font-semibold mb-8">{t.approvedBy}</p>
            <div className="border-t border-gray-400 pt-2">
              <p className="text-sm text-gray-600">{t.signature}</p>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-600">{t.dateLabel}: ___________</p>
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
        <BackToModulesButton 
          targetPath="/organization/hr/attendance"
          parentModuleName={language === 'en' ? 'Attendance Dashboard' : 'لوحة الحضور'}
        />
      </div>

      <div className="print:hidden">
        <h1 className={`text-2xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.title}
        </h1>
        <p className={`text-sm text-gray-600 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.subtitle}
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
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedReport === template.type
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              } ${isRTL ? 'text-right' : 'text-left'}`}
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
        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="flex-1">
            <label className={`block text-sm font-semibold text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.selectMonth}
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-right' : ''}`}
            />
          </div>

          <div className={`flex gap-3 items-end ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={handlePrint}
              className={`flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <Printer className="w-5 h-5" />
              <span>{t.print}</span>
            </button>

            <button
              onClick={handleExport}
              className={`flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <Download className="w-5 h-5" />
              <span>{t.export}</span>
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
            {language === 'en' 
              ? 'Adjustment Form template will be implemented based on organizational needs' 
              : 'سيتم تنفيذ نموذج التعديل بناءً على احتياجات المنظمة'}
          </p>
        </div>
      )}
    </div>
  );
}