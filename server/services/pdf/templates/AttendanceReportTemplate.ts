/**
 * Attendance Report PDF Template
 * Generates HTML body for official PDF wrapper
 */

export interface AttendanceReportData {
  organizationName: string;
  period: string;
  totalStaff: number;
  totalDays: number;
  totalOvertimeHours: number;
  records: Array<{
    staffName: string;
    staffId: string;
    date: string;
    checkIn: string | null;
    checkOut: string | null;
    workHours: number;
    overtimeHours: number;
    status: string;
  }>;
  language: 'en' | 'ar';
}

export function generateAttendanceReportHtml(data: AttendanceReportData): string {
  const {
    organizationName,
    period,
    totalStaff,
    totalDays,
    totalOvertimeHours,
    records,
    language,
  } = data;

  const isArabic = language === 'ar';

  // Generate table rows
  const tableRows = records
    .map(
      (record, index) => `
    <tr>
      <td class="cell-center">${index + 1}</td>
      <td class="cell-text">${record.staffName}</td>
      <td class="cell-text ltr-safe">${record.staffId}</td>
      <td class="cell-text ltr-safe">${record.date}</td>
      <td class="cell-text ltr-safe">${record.checkIn || '-'}</td>
      <td class="cell-text ltr-safe">${record.checkOut || '-'}</td>
      <td class="cell-center">${record.workHours.toFixed(1)}</td>
      <td class="cell-center">${record.overtimeHours.toFixed(1)}</td>
      <td class="cell-text">${record.status}</td>
    </tr>
  `
    )
    .join('');

  return `
    <div class="attendance-report">
      <!-- Summary Section -->
      <div class="summary-section">
        <h2>${isArabic ? 'ملخص التقرير' : 'Report Summary'}</h2>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-label">${isArabic ? 'الفترة' : 'Period'}</div>
            <div class="summary-value">${period}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">${isArabic ? 'إجمالي الموظفين' : 'Total Staff'}</div>
            <div class="summary-value">${totalStaff}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">${isArabic ? 'إجمالي الأيام' : 'Total Days'}</div>
            <div class="summary-value">${totalDays}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">${isArabic ? 'إجمالي ساعات العمل الإضافي' : 'Total Overtime Hours'}</div>
            <div class="summary-value">${totalOvertimeHours.toFixed(1)}</div>
          </div>
        </div>
      </div>

      <!-- Records Table -->
      <div class="records-section">
        <h2>${isArabic ? 'سجلات الحضور' : 'Attendance Records'}</h2>
        <table class="records-table">
          <thead>
            <tr>
              <th class="cell-center">#</th>
              <th class="cell-text">${isArabic ? 'اسم الموظف' : 'Staff Name'}</th>
              <th class="cell-text">${isArabic ? 'معرف الموظف' : 'Staff ID'}</th>
              <th class="cell-text">${isArabic ? 'التاريخ' : 'Date'}</th>
              <th class="cell-text">${isArabic ? 'الحضور' : 'Check In'}</th>
              <th class="cell-text">${isArabic ? 'المغادرة' : 'Check Out'}</th>
              <th class="cell-center">${isArabic ? 'ساعات العمل' : 'Work Hours'}</th>
              <th class="cell-center">${isArabic ? 'ساعات إضافية' : 'Overtime'}</th>
              <th class="cell-text">${isArabic ? 'الحالة' : 'Status'}</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>

      <!-- Signature Section -->
      <div class="signature-section">
        <div class="signature-row">
          <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-label">${isArabic ? 'توقيع المدير' : 'Manager Signature'}</div>
          </div>
          <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-label">${isArabic ? 'التاريخ' : 'Date'}</div>
          </div>
        </div>
      </div>
    </div>

    <style>
      .attendance-report {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        color: #333;
      }

      .summary-section {
        margin-bottom: 30px;
      }

      .summary-section h2 {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 15px;
        border-bottom: 2px solid #0066cc;
        padding-bottom: 8px;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 15px;
        margin-bottom: 20px;
      }

      .summary-item {
        border: 1px solid #ddd;
        padding: 12px;
        border-radius: 4px;
        background-color: #f9f9f9;
      }

      .summary-label {
        font-size: 11px;
        color: #666;
        font-weight: 500;
        margin-bottom: 5px;
      }

      .summary-value {
        font-size: 16px;
        font-weight: 700;
        color: #0066cc;
      }

      .records-section {
        margin-bottom: 30px;
      }

      .records-section h2 {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 15px;
        border-bottom: 2px solid #0066cc;
        padding-bottom: 8px;
      }

      .records-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 10px;
      }

      .records-table thead {
        background-color: #0066cc;
        color: white;
      }

      .records-table th {
        padding: 10px 6px;
        text-align: left;
        font-weight: 600;
        border: 1px solid #0066cc;
      }

      .records-table td {
        padding: 8px 6px;
        border: 1px solid #ddd;
      }

      .records-table tbody tr:nth-child(even) {
        background-color: #f9f9f9;
      }

      .records-table tbody tr:hover {
        background-color: #f0f5ff;
      }

      .cell-center {
        text-align: center;
      }

      .cell-text {
        text-align: left;
      }

      .ltr-safe {
        font-family: 'Courier New', monospace;
      }

      .signature-section {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #ddd;
      }

      .signature-row {
        display: flex;
        justify-content: space-between;
        gap: 40px;
      }

      .signature-block {
        flex: 1;
        text-align: center;
      }

      .signature-line {
        border-bottom: 1px solid #333;
        height: 60px;
        margin-bottom: 10px;
      }

      .signature-label {
        font-size: 11px;
        font-weight: 500;
        color: #333;
      }

      html[dir="rtl"] .cell-text {
        text-align: right;
      }

      html[dir="rtl"] .summary-grid {
        direction: rtl;
      }

      html[dir="rtl"] .signature-row {
        flex-direction: row-reverse;
      }
    </style>
  `;
}
