/**
 * ============================================================================
 * PAYROLL SLIP PRINT MODAL - Individual Employee Pay Stub
 * ============================================================================
 * ✅ Official payslip document for individual employee
 * ✅ A4 Layout, print-optimized
 * ✅ Organization branding from System Settings
 * ✅ Earnings + Deductions breakdown
 * ✅ Suitable for bank submission & tax records
 * ============================================================================
 */

import { X, Printer, DollarSign } from 'lucide-react';
import { StaffMember } from '../types/hrTypes';
import { useState, useEffect } from 'react';
import { getOrganizationSettings } from '@/app/services/organizationService';
import { useTranslation } from '@/i18n/useTranslation';
import type { PayrollRecord } from '../types/hrTypes';
import { useLanguage } from '@/contexts/LanguageContext';
interface Props {
 payrollRecord: PayrollRecord;
 employee: StaffMember;
 payPeriod: string; // e.g., "January 2025"
 onClose: () => void;
}

export function PayrollSlipPrintModal({
 payrollRecord, employee, payPeriod, onClose }: Props) {
 const { t } = useTranslation();
 const [language] = useState<'en' | 'ar'>('en');
 const [isRTL] = useState(false);
 const orgSettings = getOrganizationSettings();
 const orgName = language === 'ar' && orgSettings.nameAr ? orgSettings.nameAr : orgSettings.name;

 const handlePrint = () => {
 window.print();
 };

 const formatCurrency = (amount: number) => {
 return new Intl.NumberFormat('en-US', {
 style: 'currency',
 currency: employee.currency || 'USD',
 minimumFractionDigits: 2
 }).format(amount);
 };

 const formatDate = (dateString?: string) => {
 if (!dateString) return '-';
 return new Date(dateString).toLocaleDateString(t.hrModals.en, {
 year: 'numeric',
 month: 'long',
 day: 'numeric'
 });
 };

 const localT = {
 title: t.hrModals.payrollSlip,
 payPeriod: t.hrModals.payPeriod,
 payDate: t.hrModals.payDate,
 
 employeeInfo: t.hrModals.employeeInformation,
 staffId: t.hrModals.staffId,
 fullName: t.hrModals.fullName,
 position: t.hrModals.position,
 department: t.hrModals.department,
 project: t.hrModals.project,
 
 earnings: t.hrModals.earnings,
 basicSalary: t.hrModals.basicSalary,
 housingAllowance: t.hrModals.housingAllowance,
 transportAllowance: t.hrModals.transportAllowance9,
 representationAllowance: t.hrModals.representationAllowance,
 otherAllowances: t.hrModals.otherAllowances,
 grossSalary: t.hrModals.grossSalary,
 
 deductions: t.hrModals.deductions,
 tax: t.hrModals.incomeTax,
 socialSecurity: t.hrModals.socialSecurity,
 healthInsurance: t.hrModals.healthInsurance,
 otherDeductions: t.hrModals.otherDeductions,
 totalDeductions: t.hrModals.totalDeductions,
 
 netSalary: t.hrModals.netSalary,
 
 paymentDetails: t.hrModals.paymentDetails,
 bankName: t.hrModals.bankName,
 accountNumber: t.hrModals.accountNumber,
 iban: t.hrModals.iban,
 
 confidential: 'This payslip is confidential and intended for the named employee only.',
 
 generatedBy: t.hrModals.generatedBy,
 generatedOn: t.hrModals.generatedOn10,
 
 print: t.hrModals.print,
 close: t.hrModals.close
 };

 return (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose} dir={isRTL ? 'rtl' : 'ltr'}>
 <div 
 className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
 onClick={(e) => e.stopPropagation()}
 
 >
 {/* Header (Print Hidden) */}
 <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-green-50 print:hidden">
 <h2 className="text-xl font-bold text-gray-900">{localT.title}</h2>
 <div className="flex items-center gap-2">
 <button
 onClick={handlePrint}
 className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
 >
 <Printer className="w-4 h-4" />
 <span>{localT.print}</span>
 </button>
 <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
 <X className="w-6 h-6" />
 </button>
 </div>
 </div>

 {/* Content */}
 <div className="flex-1 overflow-y-auto p-8">
 <div className="max-w-[210mm] mx-auto bg-white print:p-0">
 
 {/* Organization Header */}
 <div className="mb-8 text-center border-b-2 border-blue-600 pb-4">
 {orgSettings.logo && (
 <img 
 src={orgSettings.logo} 
 alt={orgName} 
 className="h-16 mx-auto mb-2 object-contain"
 />
 )}
 <h1 className="text-2xl font-bold text-gray-900">{orgName}</h1>
 <p className="text-sm text-gray-600 mt-1">{t.hrModals.humanResourcesDepartment}</p>
 </div>

 {/* Document Title */}
 <div className="text-center mb-6">
 <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-lg">
 <DollarSign className="w-6 h-6 text-blue-600" />
 <h2 className="text-xl font-bold text-blue-900">{localT.title}</h2>
 </div>
 </div>

 {/* Pay Period Info */}
 <div className="mb-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
 <div className="grid grid-cols-2 gap-4 text-sm">
 <div>
 <span className="font-medium text-gray-700">{localT.payPeriod}:</span>
 <p className="text-lg font-bold text-gray-900">{payPeriod}</p>
 </div>
 <div>
 <span className="font-medium text-gray-700">{localT.payDate}:</span>
 <p className="text-lg font-bold text-gray-900">{formatDate(new Date().toISOString())}</p>
 </div>
 </div>
 </div>

 {/* Employee Information */}
 <div className="mb-6 border border-gray-300 rounded-lg p-4">
 <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase bg-gray-100 px-3 py-2 rounded">
 {localT.employeeInfo}
 </h3>
 <div className="grid grid-cols-2 gap-3 text-sm">
 <div className="flex justify-between">
 <span className="text-gray-600">{localT.staffId}:</span>
 <span className="font-semibold text-gray-900">{employee.staffId}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-600">{localT.fullName}:</span>
 <span className="font-semibold text-gray-900">{employee.fullName}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-600">{localT.position}:</span>
 <span className="font-semibold text-gray-900">{employee.position}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-600">{localT.department}:</span>
 <span className="font-semibold text-gray-900">{employee.department}</span>
 </div>
 <div className="flex justify-between col-span-2">
 <span className="text-gray-600">{localT.project}:</span>
 <span className="font-semibold text-gray-900">{payrollRecord.project}</span>
 </div>
 </div>
 </div>

 {/* Earnings Section */}
 <div className="mb-6">
 <h3 className="text-sm font-bold text-green-900 mb-3 uppercase bg-green-100 px-3 py-2 rounded">
 {localT.earnings}
 </h3>
 <div className="border border-green-300 rounded-lg overflow-hidden">
 <table className="w-full text-sm">
 <tbody>
 <tr className="border-b border-green-200">
 <td className="px-4 py-2 text-gray-700">{localT.basicSalary}</td>
 <td className="px-4 py-2 text-end font-semibold text-gray-900">{formatCurrency(payrollRecord.basicSalary)}</td>
 </tr>
 <tr className="border-b border-green-200 bg-green-50">
 <td className="px-4 py-2 text-gray-700">{localT.housingAllowance}</td>
 <td className="px-4 py-2 text-end font-semibold text-gray-900">{formatCurrency(payrollRecord.housingAllowance)}</td>
 </tr>
 <tr className="border-b border-green-200">
 <td className="px-4 py-2 text-gray-700">{localT.transportAllowance}</td>
 <td className="px-4 py-2 text-end font-semibold text-gray-900">{formatCurrency(payrollRecord.transportAllowance)}</td>
 </tr>
 <tr className="border-b border-green-200 bg-green-50">
 <td className="px-4 py-2 text-gray-700">{localT.representationAllowance}</td>
 <td className="px-4 py-2 text-end font-semibold text-gray-900">{formatCurrency(payrollRecord.representationAllowance)}</td>
 </tr>
 <tr className="border-b-2 border-green-400">
 <td className="px-4 py-2 text-gray-700">{localT.otherAllowances}</td>
 <td className="px-4 py-2 text-end font-semibold text-gray-900">{formatCurrency(payrollRecord.otherAllowances)}</td>
 </tr>
 <tr className="bg-green-100">
 <td className="px-4 py-3 font-bold text-green-900">{localT.grossSalary}</td>
 <td className="px-4 py-3 text-end font-bold text-lg text-green-900">{formatCurrency(payrollRecord.grossSalary)}</td>
 </tr>
 </tbody>
 </table>
 </div>
 </div>

 {/* Deductions Section */}
 <div className="mb-6">
 <h3 className="text-sm font-bold text-red-900 mb-3 uppercase bg-red-100 px-3 py-2 rounded">
 {localT.deductions}
 </h3>
 <div className="border border-red-300 rounded-lg overflow-hidden">
 <table className="w-full text-sm">
 <tbody>
 <tr className="border-b border-red-200">
 <td className="px-4 py-2 text-gray-700">{localT.tax}</td>
 <td className="px-4 py-2 text-end font-semibold text-gray-900">{formatCurrency(payrollRecord.taxAmount)}</td>
 </tr>
 <tr className="border-b border-red-200 bg-red-50">
 <td className="px-4 py-2 text-gray-700">{localT.socialSecurity}</td>
 <td className="px-4 py-2 text-end font-semibold text-gray-900">{formatCurrency(payrollRecord.socialSecurityAmount)}</td>
 </tr>
 <tr className="border-b border-red-200">
 <td className="px-4 py-2 text-gray-700">{localT.healthInsurance}</td>
 <td className="px-4 py-2 text-end font-semibold text-gray-900">{formatCurrency(payrollRecord.healthInsuranceAmount)}</td>
 </tr>
 <tr className="border-b-2 border-red-400 bg-red-50">
 <td className="px-4 py-2 text-gray-700">{localT.otherDeductions}</td>
 <td className="px-4 py-2 text-end font-semibold text-gray-900">{formatCurrency(payrollRecord.otherDeductions)}</td>
 </tr>
 <tr className="bg-red-100">
 <td className="px-4 py-3 font-bold text-red-900">{localT.totalDeductions}</td>
 <td className="px-4 py-3 text-end font-bold text-lg text-red-900">{formatCurrency(payrollRecord.totalDeductions)}</td>
 </tr>
 </tbody>
 </table>
 </div>
 </div>

 {/* Net Salary */}
 <div className="mb-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
 <div className="flex justify-between items-center">
 <span className="text-xl font-bold uppercase">{localT.netSalary}</span>
 <span className="text-3xl font-bold">{formatCurrency(payrollRecord.netSalary)}</span>
 </div>
 </div>

 {/* Payment Details */}
 {(employee.bankName || employee.accountNumber || employee.iban) && (
 <div className="mb-6 border border-gray-300 rounded-lg p-4 bg-blue-50">
 <h3 className="text-sm font-bold text-blue-900 mb-3">{localT.paymentDetails}</h3>
 <div className="grid grid-cols-2 gap-3 text-sm">
 {employee.bankName && (
 <div className="flex justify-between">
 <span className="text-gray-700">{localT.bankName}:</span>
 <span className="font-semibold text-gray-900">{employee.bankName}</span>
 </div>
 )}
 {employee.accountNumber && (
 <div className="flex justify-between">
 <span className="text-gray-700">{localT.accountNumber}:</span>
 <span className="font-semibold text-gray-900">{employee.accountNumber}</span>
 </div>
 )}
 {employee.iban && (
 <div className="flex justify-between col-span-2">
 <span className="text-gray-700">{localT.iban}:</span>
 <span className="font-semibold text-gray-900">{employee.iban}</span>
 </div>
 )}
 </div>
 </div>
 )}

 {/* Confidential Notice */}
 <div className="mb-6 bg-yellow-50 border-s-4 border-yellow-500 p-3">
 <p className="text-xs text-yellow-900 font-medium">{localT.confidential}</p>
 </div>

 {/* Footer */}
 <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-500 text-center">
 <p>{localT.generatedBy}: {orgName}</p>
 <p>{localT.generatedOn}: {formatDate(new Date().toISOString())}</p>
 </div>
 </div>
 </div>

 {/* Footer Actions (Print Hidden) */}
 <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3 print:hidden">
 <button
 onClick={handlePrint}
 className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
 >
 <Printer className="w-5 h-5" />
 <span>{localT.print}</span>
 </button>
 <button
 onClick={onClose}
 className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
 >
 {localT.close}
 </button>
 </div>
 </div>

 {/* Print Styles */}
 <style>{`
 @media print {
 @page {
 size: A4;
 margin: 15mm;
 }
 
 body {
 -webkit-print-color-adjust: exact;
 print-color-adjust: exact;
 }
 
 .print\\:hidden {
 display: none !important;
 }
 
 body * {
 visibility: hidden;
 }
 
 .fixed, .fixed * {
 visibility: visible;
 }
 
 .fixed {
 position: static;
 background: white;
 }
 }
 `}</style>
 </div>
 );
}
