/**
 * ============================================================================
 * REFERENCE SUMMARY MODAL - Employment Verification Document
 * ============================================================================
 * ✅ USES OFFICIAL DOCUMENT TEMPLATE (Global Standard)
 * ============================================================================
 */

import { X, Printer } from 'lucide-react';
import { StaffMember } from '../types/hrTypes';
import { OfficialDocumentTemplate } from '@/app/components/hr/OfficialDocumentTemplate';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface Props {
 employee: StaffMember;
 language: string;
 isRTL: boolean;
 onClose: () => void;
}

export function ReferenceSummaryModal({
 employee, language, isRTL, onClose }: Props) {
 const { t } = useTranslation();
 const formatDate = (dateString?: string) => {
 if (!dateString) return '-';
 return new Date(dateString).toLocaleDateString(t.hrModals.en, {
 year: 'numeric',
 month: 'long',
 day: 'numeric'
 });
 };

 const calculateTotalDuration = () => {
 if (!employee.hireDate) return '-';
 const start = new Date(employee.hireDate);
 const end = employee.contractEndDate ? new Date(employee.contractEndDate) : new Date();
 
 const years = end.getFullYear() - start.getFullYear();
 const months = end.getMonth() - start.getMonth();
 
 const totalMonths = years * 12 + months;
 const displayYears = Math.floor(totalMonths / 12);
 const displayMonths = totalMonths % 12;
 
 if (language === 'ar') {
 return `${displayYears} سنة و ${displayMonths} شهر`;
 } else {
 return `${displayYears} year(s) and ${displayMonths} month(s)`;
 }
 };

 const handlePrint = () => {
 window.print();
 };

 const localT = {
 title: t.hrModals.employmentReferenceSummary,
 orgName: t.hrModals.humanitarianOrganization,
 issuedDate: t.hrModals.issuedDate,
 
 certifyText: 'TO WHOM IT MAY CONCERN\n\nThis is to certify that',
 
 workedWith: t.hrModals.workedWithOurOrganizationInThe,
 
 employeeInfo: t.hrModals.employeeInformation,
 fullName: t.hrModals.fullName,
 staffId: t.hrModals.staffId,
 position: t.hrModals.position,
 department: t.hrModals.department,
 
 employmentDetails: t.hrModals.employmentDetails,
 startDate: t.hrModals.startDate,
 endDate: t.hrModals.endDate,
 totalDuration: t.hrModals.totalDuration,
 employmentType: t.hrModals.employmentType,
 
 closingText: 'This reference is issued upon the request of the aforementioned employee for official purposes.',
 
 disclaimer: 'Note: This document contains factual employment information only and does not constitute a performance evaluation or recommendation.',
 
 authorizedSignature: t.hrModals.authorizedSignature,
 hrManager: t.hrModals.hrManager,
 stamp: t.hrModals.officialStamp,
 
 print: t.hrModals.print,
 close: t.hrModals.close
 };

 return (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose} dir={isRTL ? 'rtl' : 'ltr'}>
 <div 
 className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
 onClick={(e) => e.stopPropagation()}
 
 >
 {/* Header */}
 <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-blue-50 print:hidden">
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

 {/* Content - Printable */}
 <div className="flex-1 overflow-y-auto p-8 print:p-12">
 <div className="max-w-3xl mx-auto space-y-6">
 {/* Letterhead */}
 <div className="text-center border-b-2 border-blue-600 pb-6 mb-8">
 <h1 className="text-3xl font-bold text-blue-900 mb-2">{localT.orgName}</h1>
 <p className="text-sm text-gray-600">
 {t.hrModals.humanResourcesDepartment}
 </p>
 </div>

 {/* Document Info */}
 <div className="flex justify-between items-start mb-6 text-sm text-gray-600">
 <div>
 <strong>{localT.issuedDate}:</strong> {formatDate(new Date().toISOString())}
 </div>
 <div className="text-end">
 <strong>Ref:</strong> EMP-REF-{employee.staffId}-{new Date().getFullYear()}
 </div>
 </div>

 {/* Certification Text */}
 <div className="space-y-4 text-sm leading-relaxed">
 <p className="font-bold text-center uppercase mb-6">
 {t.hrModals.toWhomItMayConcern}
 </p>
 
 <p>
 {t.hrModals.thisIsToCertifyThat}{' '}
 <strong className="text-blue-900 text-lg">{employee.fullName}</strong>{' '}
 {t.hrModals.staffId13} <strong>{employee.staffId}</strong>){' '}
 {localT.workedWith}
 </p>
 </div>

 {/* Employment Information Table */}
 <div className="border border-gray-300 rounded-lg overflow-hidden mt-6">
 <table className="w-full">
 <tbody>
 <tr className="border-b border-gray-200">
 <td className="px-4 py-3 bg-gray-50 font-medium text-sm text-gray-700 w-1/3">{localT.fullName}</td>
 <td className="px-4 py-3 text-sm text-gray-900">{employee.fullName}</td>
 </tr>
 <tr className="border-b border-gray-200">
 <td className="px-4 py-3 bg-gray-50 font-medium text-sm text-gray-700">{localT.staffId}</td>
 <td className="px-4 py-3 text-sm text-gray-900 font-mono">{employee.staffId}</td>
 </tr>
 <tr className="border-b border-gray-200">
 <td className="px-4 py-3 bg-gray-50 font-medium text-sm text-gray-700">{localT.position}</td>
 <td className="px-4 py-3 text-sm text-gray-900">{employee.position}</td>
 </tr>
 <tr className="border-b border-gray-200">
 <td className="px-4 py-3 bg-gray-50 font-medium text-sm text-gray-700">{localT.department}</td>
 <td className="px-4 py-3 text-sm text-gray-900">{employee.department}</td>
 </tr>
 <tr className="border-b border-gray-200">
 <td className="px-4 py-3 bg-gray-50 font-medium text-sm text-gray-700">{localT.startDate}</td>
 <td className="px-4 py-3 text-sm text-gray-900">{formatDate(employee.hireDate)}</td>
 </tr>
 <tr className="border-b border-gray-200">
 <td className="px-4 py-3 bg-gray-50 font-medium text-sm text-gray-700">{localT.endDate}</td>
 <td className="px-4 py-3 text-sm text-gray-900">
 {employee.status === 'exited' 
 ? formatDate(employee.contractEndDate) 
 : (t.hrModals.currentlyEmployed)}
 </td>
 </tr>
 <tr className="border-b border-gray-200">
 <td className="px-4 py-3 bg-gray-50 font-medium text-sm text-gray-700">{localT.totalDuration}</td>
 <td className="px-4 py-3 text-sm text-gray-900 font-semibold">{calculateTotalDuration()}</td>
 </tr>
 <tr>
 <td className="px-4 py-3 bg-gray-50 font-medium text-sm text-gray-700">{localT.employmentType}</td>
 <td className="px-4 py-3 text-sm text-gray-900">{employee.employmentType || '-'}</td>
 </tr>
 </tbody>
 </table>
 </div>

 {/* Closing Statement */}
 <div className="mt-8 space-y-4">
 <p className="text-sm leading-relaxed">{localT.closingText}</p>
 
 <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
 <p className="text-xs text-yellow-800">{localT.disclaimer}</p>
 </div>
 </div>

 {/* Signature Section */}
 <div className="mt-12 pt-8 border-t-2 border-gray-300">
 <div className="grid grid-cols-2 gap-8">
 <div>
 <div className="h-16 mb-2"></div>
 <div className="border-t-2 border-gray-400 pt-2">
 <p className="text-sm font-semibold text-gray-900">{localT.authorizedSignature}</p>
 <p className="text-xs text-gray-600">{localT.hrManager}</p>
 <p className="text-xs text-gray-500 mt-1">{formatDate(new Date().toISOString())}</p>
 </div>
 </div>
 <div className="flex items-end justify-center">
 <div className="text-center">
 <div className="w-32 h-32 border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center mb-2">
 <span className="text-xs text-gray-400">{localT.stamp}</span>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Footer */}
 <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
 <p>{t.hrModals.generatedOn14} {formatDate(new Date().toISOString())}</p>
 <p className="mt-1">
 {'This is a computer-generated document and does not require a physical signature.'}
 </p>
 </div>
 </div>
 </div>

 {/* Footer Actions */}
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
 body * {
 visibility: hidden;
 }
 .print\\:hidden {
 display: none !important;
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