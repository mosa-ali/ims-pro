/**
 * Payroll View Modal - TRUE RTL Print Support
 * 
 * CRITICAL RTL REQUIREMENTS:
 * - When Arabic: Full RTL document flow
 * - Table columns REVERSED for RTL
 * - Numbers stay LTR (unicode-bidi: isolate)
 * - Header aligned RTL
 * - Signature section RTL-ordered
 * - Print-specific dir="rtl" attribute
 */

import { X, Printer, Download } from 'lucide-react';
import { PayrollSheet } from '@/app/services/hrService';
import { exportPayrollToExcel } from '@/app/utils/excelExport';
import { getOrganizationSettings } from '@/app/services/organizationService';
import { ModalOverlay } from '@/app/components/ui/ModalOverlay';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  payroll: PayrollSheet | null;
  language: 'en' | 'ar';
  isRTL: boolean;
  formatCurrency: (amount: number, currency?: string) => string;
  onPrint: () => void;
}

export function PayrollViewModal({
  isOpen,
  onClose,
  payroll,
  language,
  isRTL,
  formatCurrency,
  onPrint
}: Props) {
  if (!isOpen || !payroll) return null;

  // Get organization settings for logo and name
  const orgSettings = getOrganizationSettings();
  const orgName = language === 'ar' && orgSettings.nameAr ? orgSettings.nameAr : orgSettings.name;

  const t = {
    viewPayroll: language === 'en' ? 'View Payroll Sheet' : 'عرض كشف الرواتب',
    close: language === 'en' ? 'Close' : 'إغلاق',
    print: language === 'en' ? 'Print' : 'طباعة',
    exportExcel: language === 'en' ? 'Export Excel' : 'تصدير Excel',
    
    // Document header
    orgName: orgName,
    docTitle: language === 'en' ? 'Monthly Payroll Sheet' : 'كشف الرواتب الشهري',
    monthYear: language === 'en' ? 'Month/Year' : 'الشهر/السنة',
    preparedBy: language === 'en' ? 'Prepared By' : 'أعده',
    approvedBy: language === 'en' ? 'Approved By' : 'اعتمده',
    reviewedBy: language === 'en' ? 'Reviewed By' : 'راجعه',
    status: language === 'en' ? 'Status' : 'الحالة',
    currency: language === 'en' ? 'Currency' : 'العملة',
    refNo: language === 'en' ? 'Reference No.' : 'الرقم المرجعي',
    
    // Table headers
    staffId: language === 'en' ? 'ID' : 'الرقم',
    staffName: language === 'en' ? 'Name' : 'الاسم',
    position: language === 'en' ? 'Position' : 'المنصب',
    project: language === 'en' ? 'Project' : 'المشروع',
    basic: language === 'en' ? 'Basic Salary' : 'الراتب الأساسي',
    housing: language === 'en' ? 'Housing' : 'السكن',
    transport: language === 'en' ? 'Transport' : 'المواصلات',
    representation: language === 'en' ? 'Represent.' : 'التمثيل',
    other: language === 'en' ? 'Other' : 'أخرى',
    gross: language === 'en' ? 'Gross' : 'الإجمالي',
    taxBase: language === 'en' ? 'Tax Base' : 'الوعاء',
    tax: language === 'en' ? 'Tax' : 'الضريبة',
    social: language === 'en' ? 'Social Sec.' : 'الضمان',
    health: language === 'en' ? 'Health' : 'الصحي',
    deductions: language === 'en' ? 'Total Ded.' : 'إجمالي الخصومات',
    netSalary: language === 'en' ? 'Net Salary' : 'الصافي',
    total: language === 'en' ? 'TOTAL' : 'المجموع',
    
    // Signature
    name: language === 'en' ? 'Name' : 'الاسم',
    signature: language === 'en' ? 'Signature' : 'التوقيع',
    date: language === 'en' ? 'Date' : 'التاريخ',
    
    // Status
    draft: language === 'en' ? 'Draft' : 'مسودة',
    submitted: language === 'en' ? 'Submitted' : 'مقدم',
    approved: language === 'en' ? 'Approved' : 'معتمد'
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'submitted': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'approved': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  // Format currency for print (no double $ US)
  const formatPrintCurrency = (amount: number | null | undefined) => {
    const num = Number(amount) || 0;
    return `$${num.toFixed(2)}`;
  };

  // DEBUG: Log to verify RTL state
  console.log('[PayrollViewModal] isRTL:', isRTL, 'language:', language);

  // CRITICAL FIX: Force re-computation based on language prop, not isRTL prop
  // Because isRTL prop might be stale from parent component
  const actualIsRTL = language === 'ar';

  // Define table headers order - SAME for both languages
  // Visual reversal handled by CSS dir="rtl", not array reversal
  const tableHeaders = [
    { key: 'staffId', label: t.staffId, align: 'left', numeric: false },
    { key: 'staffName', label: t.staffName, align: 'left', numeric: false },
    { key: 'position', label: t.position, align: 'left', numeric: false },
    { key: 'basic', label: t.basic, align: 'right', numeric: true },
    { key: 'housing', label: t.housing, align: 'right', numeric: true },
    { key: 'transport', label: t.transport, align: 'right', numeric: true },
    { key: 'representation', label: t.representation, align: 'right', numeric: true },
    { key: 'other', label: t.other, align: 'right', numeric: true },
    { key: 'gross', label: t.gross, align: 'right', numeric: true },
    { key: 'tax', label: t.tax, align: 'right', numeric: true },
    { key: 'social', label: t.social, align: 'right', numeric: true },
    { key: 'health', label: t.health, align: 'right', numeric: true },
    { key: 'deductions', label: t.deductions, align: 'right', numeric: true },
    { key: 'netSalary', label: t.netSalary, align: 'right', numeric: true }
  ];

  // Get cell value helper
  const getCellValue = (record: any, key: string) => {
    switch (key) {
      case 'staffId': return record.staffId;
      case 'staffName': return record.staffName;
      case 'position': return record.position;
      case 'basic': return record.basicSalary;
      case 'housing': return record.housingAllowance || 0;
      case 'transport': return record.transportAllowance;
      case 'representation': return record.representationAllowance;
      case 'other': return record.otherAllowances;
      case 'gross': return record.grossSalary;
      case 'tax': return record.taxAmount || 0;
      case 'social': return record.socialSecurityAmount || 0;
      case 'health': return record.healthInsuranceAmount || 0;
      case 'deductions': return record.totalDeductions;
      case 'netSalary': return record.netSalary;
      default: return '';
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full my-8 max-h-[90vh] flex flex-col">
        {/* Screen-only Header (Hidden in Print) */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between print:hidden flex-shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{t.viewPayroll}</h3>
            <p className="text-sm text-gray-600 mt-1">
              {payroll.monthName} {payroll.year}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onPrint}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Printer className="w-4 h-4" />
              <span>{t.print}</span>
            </button>
            <button
              onClick={() => exportPayrollToExcel(payroll)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              <span>{t.exportExcel}</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE DOCUMENT STARTS HERE */}
        <div 
          id="print-area" 
          dir={actualIsRTL ? 'rtl' : 'ltr'}
          className="print:p-0 px-6 py-4 overflow-y-auto flex-grow"
        >
          {/* Official Document Header (Print Only) */}
          <div className="print-doc-header hidden print:block mb-4">
            {/* Logo + Organization Name Row - RTL Responsive */}
            <div className={`flex items-start justify-between mb-3 ${actualIsRTL ? 'flex-row-reverse' : ''}`}>
              {/* Organization Name + Document Title */}
              <div className={actualIsRTL ? 'text-right' : 'text-left'}>
                <h2 className="text-xl font-bold text-black">{t.orgName}</h2>
                <h3 className="text-lg font-semibold text-black mt-1">{t.docTitle}</h3>
              </div>
              
              {/* Organization Logo */}
              {orgSettings.logo && (
                <img 
                  src={orgSettings.logo} 
                  alt="Organization Logo" 
                  className="h-16 w-auto object-contain flex-shrink-0"
                />
              )}
            </div>
            
            {/* Document Info Grid - RTL Responsive */}
            <div className={`grid grid-cols-2 gap-4 text-sm pt-3 border-t-2 border-black ${actualIsRTL ? 'text-right' : 'text-left'}`}>
              <div>
                <span className="font-semibold">{t.monthYear}:</span> {payroll.monthName} {payroll.year}
              </div>
              <div>
                <span className="font-semibold">{t.currency}:</span> USD
              </div>
              <div>
                <span className="font-semibold">{t.refNo}:</span> PAY-{payroll.year}-{String(payroll.month).padStart(2, '0')}
              </div>
              <div>
                <span className="font-semibold">{t.status}:</span> {t[payroll.status as keyof typeof t]}
              </div>
            </div>
          </div>

          {/* Screen-only Info (Hidden in Print) */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 print:hidden mb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">{t.monthYear}:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  {payroll.monthName} {payroll.year}
                </span>
              </div>
              <div>
                <span className="text-gray-600">{t.preparedBy}:</span>
                <span className="ml-2 font-semibold text-gray-900">{payroll.preparedBy}</span>
              </div>
              {payroll.approvedBy && (
                <div>
                  <span className="text-gray-600">{t.approvedBy}:</span>
                  <span className="ml-2 font-semibold text-gray-900">{payroll.approvedBy}</span>
                </div>
              )}
              <div>
                <span className="text-gray-600">{t.status}:</span>
                <span className={`ml-2 inline-block px-2 py-1 rounded border text-xs font-medium ${getStatusColor(payroll.status)}`}>
                  {t[payroll.status as keyof typeof t]}
                </span>
              </div>
            </div>
          </div>

          {/* Payroll Table - Dynamic Column Order */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse border border-black" dir={actualIsRTL ? 'rtl' : 'ltr'}>
              <thead>
                <tr className="bg-gray-100">
                  {tableHeaders.map((header) => (
                    <th
                      key={header.key}
                      className={`px-2 py-2 font-bold text-black border border-black ${
                        header.numeric ? 'text-center' : actualIsRTL ? 'text-right' : 'text-left'
                      }`}
                    >
                      {header.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payroll.records.map((record, index) => (
                  <tr key={record.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {tableHeaders.map((header) => {
                      const value = getCellValue(record, header.key);
                      const isNumeric = header.numeric;
                      const isTextCell = !isNumeric;

                      return (
                        <td
                          key={header.key}
                          className={`px-2 py-2 border border-black ${
                            isNumeric 
                              ? 'numeric-cell text-right' 
                              : actualIsRTL ? 'text-right' : 'text-left'
                          } ${
                            header.key === 'gross' ? 'font-semibold text-black' :
                            header.key === 'tax' || header.key === 'social' || header.key === 'health' ? 'text-red-600' :
                            header.key === 'deductions' ? 'font-semibold text-red-700' :
                            header.key === 'netSalary' ? 'font-bold text-green-700' :
                            'text-black'
                          }`}
                          style={isNumeric ? { direction: 'ltr', unicodeBidi: 'isolate' } : undefined}
                        >
                          {isTextCell ? value : formatPrintCurrency(Number(value))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {/* Totals Row - Matches header column order */}
                <tr className="bg-gray-900 text-white border-t-2 border-black">
                  {tableHeaders.map((header) => {
                    if (header.key === 'staffId') {
                      return (
                        <td key={header.key} className="px-2 py-3 font-bold border border-black">
                          {t.total}
                        </td>
                      );
                    } else if (header.key === 'staffName' || header.key === 'position') {
                      return <td key={header.key} className="px-2 py-3 border border-black"></td>;
                    } else if (header.key === 'basic') {
                      return (
                        <td key={header.key} className="px-2 py-3 text-right font-bold border border-black numeric-cell" style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>
                          {formatPrintCurrency(payroll.totalBasicSalary)}
                        </td>
                      );
                    } else if (header.key === 'housing' || header.key === 'transport' || header.key === 'representation' || header.key === 'other' || header.key === 'tax' || header.key === 'social' || header.key === 'health') {
                      return <td key={header.key} className="px-2 py-3 border border-black"></td>;
                    } else if (header.key === 'gross') {
                      return (
                        <td key={header.key} className="px-2 py-3 text-right font-bold border border-black numeric-cell" style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>
                          {formatPrintCurrency(payroll.totalGrossSalary)}
                        </td>
                      );
                    } else if (header.key === 'deductions') {
                      return (
                        <td key={header.key} className="px-2 py-3 text-right font-bold border border-black numeric-cell" style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>
                          {formatPrintCurrency(payroll.totalDeductions)}
                        </td>
                      );
                    } else if (header.key === 'netSalary') {
                      return (
                        <td key={header.key} className="px-2 py-3 text-right font-bold border border-black numeric-cell" style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>
                          {formatPrintCurrency(payroll.totalNetSalary)}
                        </td>
                      );
                    }
                    return <td key={header.key} className="px-2 py-3 border border-black"></td>;
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Signature Section (Print Only) - RTL Responsive */}
          <div className="print-signatures hidden print:block mt-12">
            <div className={`grid grid-cols-3 gap-8 text-sm ${actualIsRTL ? 'direction-rtl' : ''}`}>
              {actualIsRTL ? (
                // RTL Order: Approved -> Reviewed -> Prepared
                <>
                  <div className="text-right">
                    <p className="font-bold mb-1">{t.approvedBy}:</p>
                    <div className="border-t-2 border-black mt-8 pt-2">
                      <p>{payroll.approvedBy || '__________________'}</p>
                      {payroll.approvedByTitle && <p className="text-xs text-gray-700">{payroll.approvedByTitle}</p>}
                      <p className="mt-4">__________________</p>
                      <p className="text-xs">{t.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold mb-1">{t.reviewedBy}:</p>
                    <div className="border-t-2 border-black mt-8 pt-2">
                      <p>__________________</p>
                      <p className="text-xs">{t.name}</p>
                      <p className="mt-4">__________________</p>
                      <p className="text-xs">{t.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold mb-1">{t.preparedBy}:</p>
                    <div className="border-t-2 border-black mt-8 pt-2">
                      <p>{payroll.preparedBy}</p>
                      {payroll.preparedByTitle && <p className="text-xs text-gray-700">{payroll.preparedByTitle}</p>}
                      <p className="mt-4">__________________</p>
                      <p className="text-xs">{t.date}</p>
                    </div>
                  </div>
                </>
              ) : (
                // LTR Order: Prepared -> Reviewed -> Approved
                <>
                  <div>
                    <p className="font-bold mb-1">{t.preparedBy}:</p>
                    <div className="border-t-2 border-black mt-8 pt-2">
                      <p>{payroll.preparedBy}</p>
                      {payroll.preparedByTitle && <p className="text-xs text-gray-700">{payroll.preparedByTitle}</p>}
                      <p className="mt-4">__________________</p>
                      <p className="text-xs">{t.date}</p>
                    </div>
                  </div>
                  <div>
                    <p className="font-bold mb-1">{t.reviewedBy}:</p>
                    <div className="border-t-2 border-black mt-8 pt-2">
                      <p>__________________</p>
                      <p className="text-xs">{t.name}</p>
                      <p className="mt-4">__________________</p>
                      <p className="text-xs">{t.date}</p>
                    </div>
                  </div>
                  <div>
                    <p className="font-bold mb-1">{t.approvedBy}:</p>
                    <div className="border-t-2 border-black mt-8 pt-2">
                      <p>{payroll.approvedBy || '__________________'}</p>
                      {payroll.approvedByTitle && <p className="text-xs text-gray-700">{payroll.approvedByTitle}</p>}
                      <p className="mt-4">__________________</p>
                      <p className="text-xs">{t.date}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Screen-only Footer (Hidden in Print) */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end print:hidden flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700"
          >
            {t.close}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}