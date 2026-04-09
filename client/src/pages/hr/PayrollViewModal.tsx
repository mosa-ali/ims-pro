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
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

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
 const { t } = useTranslation();
 if (!isOpen || !payroll) return null;

 // Get organization settings for logo and name
 const orgSettings = getOrganizationSettings();
 const orgName = language === 'ar' && orgSettings.nameAr ? orgSettings.nameAr : orgSettings.name;

 const labels = {
 viewPayroll: t.hrPayroll.viewPayrollSheet,
 close: t.hrPayroll.close,
 print: t.hrPayroll.print,
 exportExcel: t.hrPayroll.exportExcel,
 
 // Document header
 orgName: orgName,
 docTitle: t.hrPayroll.monthlyPayrollSheet,
 monthYear: t.hrPayroll.monthyear,
 preparedBy: t.hrPayroll.preparedBy,
 approvedBy: t.hrPayroll.approvedBy,
 reviewedBy: t.hrPayroll.reviewedBy,
 status: t.hrPayroll.status,
 currency: t.hrPayroll.currency,
 refNo: t.hrPayroll.referenceNo,
 
 // Table headers
 staffId: t.hrPayroll.id,
 staffName: t.hrPayroll.name,
 position: t.hrPayroll.position,
 project: t.hrPayroll.project,
 basic: t.hrPayroll.basicSalary,
 housing: t.hrPayroll.housing3,
 transport: t.hrPayroll.transport4,
 representation: t.hrPayroll.represent,
 other: t.hrPayroll.other5,
 gross: t.hrPayroll.gross,
 taxBase: t.hrPayroll.taxBase,
 tax: t.hrPayroll.tax1,
 social: t.hrPayroll.socialSec,
 health: t.hrPayroll.health,
 deductions: t.hrPayroll.totalDed,
 netSalary: t.hrPayroll.netSalary6,
 total: t.hrPayroll.total,
 
 // Signature
 name: t.hrPayroll.name,
 signature: t.hrPayroll.signature,
 date: t.hrPayroll.date,
 
 // Status
 draft: t.hrPayroll.draft,
 submitted: t.hrPayroll.submitted,
 approved: t.hrPayroll.approved
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
 { key: 'staffId', label: labels.staffId, align: 'left', numeric: false },
 { key: 'staffName', label: labels.staffName, align: 'left', numeric: false },
 { key: 'position', label: labels.position, align: 'left', numeric: false },
 { key: 'basic', label: labels.basic, align: 'right', numeric: true },
 { key: 'housing', label: labels.housing, align: 'right', numeric: true },
 { key: 'transport', label: labels.transport, align: 'right', numeric: true },
 { key: 'representation', label: labels.representation, align: 'right', numeric: true },
 { key: 'other', label: labels.other, align: 'right', numeric: true },
 { key: 'gross', label: labels.gross, align: 'right', numeric: true },
 { key: 'tax', label: labels.tax, align: 'right', numeric: true },
 { key: 'social', label: labels.social, align: 'right', numeric: true },
 { key: 'health', label: labels.health, align: 'right', numeric: true },
 { key: 'deductions', label: labels.deductions, align: 'right', numeric: true },
 { key: 'netSalary', label: labels.netSalary, align: 'right', numeric: true }
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
 <h3 className="text-lg font-semibold text-gray-900">{labels.viewPayroll}</h3>
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
 <span>{labels.print}</span>
 </button>
 <button
 onClick={() => exportPayrollToExcel(payroll)}
 className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
 >
 <Download className="w-4 h-4" />
 <span>{labels.exportExcel}</span>
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
 className="print:p-0 px-6 py-4 overflow-y-auto flex-grow"
 >
 {/* Official Document Header (Print Only) */}
 <div className="print-doc-header hidden print:block mb-4">
 {/* Logo + Organization Name Row - RTL Responsive */}
 <div className={`flex items-start justify-between mb-3 ${actualIsRTL ? 'flex-row-reverse' : ''}`}>
 {/* Organization Name + Document Title */}
 <div className={actualIsRTL ? 'text-end' : 'text-start'}>
 <h2 className="text-xl font-bold text-black">{labels.orgName}</h2>
 <h3 className="text-lg font-semibold text-black mt-1">{labels.docTitle}</h3>
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
 <div className={`grid grid-cols-2 gap-4 text-sm pt-3 border-t-2 border-black ${actualIsRTL ? 'text-end' : 'text-start'}`}>
 <div>
 <span className="font-semibold">{labels.monthYear}:</span> {payroll.monthName} {payroll.year}
 </div>
 <div>
 <span className="font-semibold">{labels.currency}:</span> USD
 </div>
 <div>
 <span className="font-semibold">{labels.refNo}:</span> PAY-{payroll.year}-{String(payroll.month).padStart(2, '0')}
 </div>
 <div>
 <span className="font-semibold">{labels.status}:</span> {t[payroll.status as keyof typeof t]}
 </div>
 </div>
 </div>

 {/* Screen-only Info (Hidden in Print) */}
 <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 print:hidden mb-4">
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
 <div>
 <span className="text-gray-600">{labels.monthYear}:</span>
 <span className="ms-2 font-semibold text-gray-900">
 {payroll.monthName} {payroll.year}
 </span>
 </div>
 <div>
 <span className="text-gray-600">{labels.preparedBy}:</span>
 <span className="ms-2 font-semibold text-gray-900">{payroll.preparedBy}</span>
 </div>
 {payroll.approvedBy && (
 <div>
 <span className="text-gray-600">{labels.approvedBy}:</span>
 <span className="ms-2 font-semibold text-gray-900">{payroll.approvedBy}</span>
 </div>
 )}
 <div>
 <span className="text-gray-600">{labels.status}:</span>
 <span className={`ms-2 inline-block px-2 py-1 rounded border text-xs font-medium ${getStatusColor(payroll.status)}`}>
 {t[payroll.status as keyof typeof t]}
 </span>
 </div>
 </div>
 </div>

 {/* Payroll Table - Dynamic Column Order */}
 <div className="overflow-x-auto">
 <table className="w-full text-xs border-collapse border border-black">
 <thead>
 <tr className="bg-gray-100">
 {tableHeaders.map((header) => (
 <th
 key={header.key}
 className={`px-2 py-2 font-bold text-black border border-black ${ header.numeric ? 'text-center' : actualIsRTL ? 'text-right' : 'text-left' }`}
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
 className={`px-2 py-2 border border-black ${ isNumeric ? 'numeric-cell text-right' : actualIsRTL ? 'text-right' : 'text-left' } ${ header.key === 'gross' ? 'font-semibold text-black' : header.key === 'tax' || header.key === 'social' || header.key === 'health' ? 'text-red-600' : header.key === 'deductions' ? 'font-semibold text-red-700' : header.key === 'netSalary' ? 'font-bold text-green-700' : 'text-black' }`}
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
 {labels.total}
 </td>
 );
 } else if (header.key === 'staffName' || header.key === 'position') {
 return <td key={header.key} className="px-2 py-3 border border-black"></td>;
 } else if (header.key === 'basic') {
 return (
 <td key={header.key} className="px-2 py-3 text-end font-bold border border-black numeric-cell" style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>
 {formatPrintCurrency(payroll.totalBasicSalary)}
 </td>
 );
 } else if (header.key === 'housing' || header.key === 'transport' || header.key === 'representation' || header.key === 'other' || header.key === 'tax' || header.key === 'social' || header.key === 'health') {
 return <td key={header.key} className="px-2 py-3 border border-black"></td>;
 } else if (header.key === 'gross') {
 return (
 <td key={header.key} className="px-2 py-3 text-end font-bold border border-black numeric-cell" style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>
 {formatPrintCurrency(payroll.totalGrossSalary)}
 </td>
 );
 } else if (header.key === 'deductions') {
 return (
 <td key={header.key} className="px-2 py-3 text-end font-bold border border-black numeric-cell" style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>
 {formatPrintCurrency(payroll.totalDeductions)}
 </td>
 );
 } else if (header.key === 'netSalary') {
 return (
 <td key={header.key} className="px-2 py-3 text-end font-bold border border-black numeric-cell" style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>
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
 <div className="text-end">
 <p className="font-bold mb-1">{labels.approvedBy}:</p>
 <div className="border-t-2 border-black mt-8 pt-2">
 <p>{payroll.approvedBy || '__________________'}</p>
 {payroll.approvedByTitle && <p className="text-xs text-gray-700">{payroll.approvedByTitle}</p>}
 <p className="mt-4">__________________</p>
 <p className="text-xs">{labels.date}</p>
 </div>
 </div>
 <div className="text-end">
 <p className="font-bold mb-1">{labels.reviewedBy}:</p>
 <div className="border-t-2 border-black mt-8 pt-2">
 <p>__________________</p>
 <p className="text-xs">{labels.name}</p>
 <p className="mt-4">__________________</p>
 <p className="text-xs">{labels.date}</p>
 </div>
 </div>
 <div className="text-end">
 <p className="font-bold mb-1">{labels.preparedBy}:</p>
 <div className="border-t-2 border-black mt-8 pt-2">
 <p>{payroll.preparedBy}</p>
 {payroll.preparedByTitle && <p className="text-xs text-gray-700">{payroll.preparedByTitle}</p>}
 <p className="mt-4">__________________</p>
 <p className="text-xs">{labels.date}</p>
 </div>
 </div>
 </>
 ) : (
 // LTR Order: Prepared -> Reviewed -> Approved
 <>
 <div>
 <p className="font-bold mb-1">{labels.preparedBy}:</p>
 <div className="border-t-2 border-black mt-8 pt-2">
 <p>{payroll.preparedBy}</p>
 {payroll.preparedByTitle && <p className="text-xs text-gray-700">{payroll.preparedByTitle}</p>}
 <p className="mt-4">__________________</p>
 <p className="text-xs">{labels.date}</p>
 </div>
 </div>
 <div>
 <p className="font-bold mb-1">{labels.reviewedBy}:</p>
 <div className="border-t-2 border-black mt-8 pt-2">
 <p>__________________</p>
 <p className="text-xs">{labels.name}</p>
 <p className="mt-4">__________________</p>
 <p className="text-xs">{labels.date}</p>
 </div>
 </div>
 <div>
 <p className="font-bold mb-1">{labels.approvedBy}:</p>
 <div className="border-t-2 border-black mt-8 pt-2">
 <p>{payroll.approvedBy || '__________________'}</p>
 {payroll.approvedByTitle && <p className="text-xs text-gray-700">{payroll.approvedByTitle}</p>}
 <p className="mt-4">__________________</p>
 <p className="text-xs">{labels.date}</p>
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
 {labels.close}
 </button>
 </div>
 </div>
 </ModalOverlay>
 );
}