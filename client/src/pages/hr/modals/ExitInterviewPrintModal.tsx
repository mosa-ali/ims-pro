/**
 * ============================================================================
 * EXIT INTERVIEW PRINT MODAL - Official Exit Interview Report
 * ============================================================================
 * ✅ USES OFFICIAL DOCUMENT TEMPLATE (Global Standard)
 * ✅ A4 Layout, print-optimized
 * ✅ Organization branding from System Settings
 * ============================================================================
 */

import { X, Printer } from 'lucide-react';
import { StaffMember } from '../types/hrTypes';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface ExitInterviewData {
 id: string;
 staffId: string;
 interviewDate: string;
 conductedBy: string;
 
 reasonForLeaving: string;
 wouldRecommend: string;
 wouldRejoin: string;
 
 satisfactionRatings: {
 workEnvironment: number;
 management: number;
 compensation: number;
 careerGrowth: number;
 workLifeBalance: number;
 };
 
 strengths?: string;
 improvements?: string;
 comments?: string;
}

interface Props {
 exitInterview: ExitInterviewData;
 onClose: () => void;
}

export function ExitInterviewPrintModal({
 exitInterview, onClose }: Props) {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const [employee, setEmployee] = useState<StaffMember | null>(null);

 useEffect(() => {
 const emp = staffService.getByStaffId(exitInterview.staffId);
 if (emp) setEmployee(emp);
 }, [exitInterview]);

 if (!employee) return null;

 const handlePrint = () => {
 window.print();
 };

 const formatDate = (dateString?: string) => {
 if (!dateString) return '-';
 return new Date(dateString).toLocaleDateString(t.hrModals.en, {
 year: 'numeric',
 month: 'long',
 day: 'numeric'
 });
 };

 const getRatingStars = (rating: number) => {
 return '★'.repeat(rating) + '☆'.repeat(5 - rating);
 };

 const localT = {
 title: t.hrModals.exitInterviewReport,
 
 confidential: t.hrModals.confidentialForHrUseOnly,
 
 ref: t.hrModals.reference,
 interviewDate: t.hrModals.interviewDate,
 conductedBy: t.hrModals.conductedBy,
 
 employeeInfo: t.hrModals.employeeInformation,
 staffId: t.hrModals.staffId,
 fullName: t.hrModals.fullName,
 position: t.hrModals.position,
 department: t.hrModals.department,
 
 exitDetails: t.hrModals.exitDetails,
 reasonForLeaving: t.hrModals.reasonForLeaving,
 wouldRecommend: t.hrModals.wouldRecommendOrganization,
 wouldRejoin: t.hrModals.wouldRejoinIfOpportunity,
 
 satisfactionRatings: t.hrModals.satisfactionRatings15,
 workEnvironment: t.hrModals.workEnvironment,
 management: t.hrModals.managementLeadership,
 compensation: t.hrModals.compensationBenefits,
 careerGrowth: t.hrModals.careerGrowthOpportunities,
 workLifeBalance: t.hrModals.worklifeBalance,
 
 feedback: t.hrModals.feedback,
 strengths: t.hrModals.organizationStrengths,
 improvements: t.hrModals.areasForImprovement,
 additionalComments: t.hrModals.additionalComments,
 
 signatures: t.hrModals.signatures,
 employee: t.hrModals.employee,
 interviewer: t.hrModals.interviewerHr,
 date: t.hrModals.date,
 
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
 <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-purple-50 print:hidden">
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
 
 {/* Confidential Banner */}
 <div className="mb-6 bg-red-100 border-s-4 border-red-500 p-3">
 <p className="text-sm font-bold text-red-900 text-center">{localT.confidential}</p>
 </div>

 {/* Report Header */}
 <div className="mb-8">
 <div className="flex justify-between items-start mb-4 text-sm">
 <div>
 <strong>{localT.ref}:</strong> EXIT-{exitInterview.id}-{new Date(exitInterview.interviewDate).getFullYear()}
 </div>
 <div>
 <strong>{localT.interviewDate}:</strong> {formatDate(exitInterview.interviewDate)}
 </div>
 </div>
 <div className="text-sm">
 <strong>{localT.conductedBy}:</strong> {exitInterview.conductedBy}
 </div>
 </div>

 {/* Employee Information */}
 <div className="mb-8 border border-gray-300 rounded-lg p-4 bg-gray-50">
 <h3 className="text-base font-bold text-gray-900 mb-3">{localT.employeeInfo}</h3>
 <div className="grid grid-cols-2 gap-4 text-sm">
 <div>
 <span className="font-medium text-gray-700">{localT.staffId}:</span>
 <p className="text-gray-900">{employee.staffId}</p>
 </div>
 <div>
 <span className="font-medium text-gray-700">{localT.fullName}:</span>
 <p className="text-gray-900">{employee.fullName}</p>
 </div>
 <div>
 <span className="font-medium text-gray-700">{localT.position}:</span>
 <p className="text-gray-900">{employee.position}</p>
 </div>
 <div>
 <span className="font-medium text-gray-700">{localT.department}:</span>
 <p className="text-gray-900">{employee.department}</p>
 </div>
 </div>
 </div>

 {/* Exit Details */}
 <div className="mb-8">
 <h3 className="text-base font-bold text-gray-900 mb-4">{localT.exitDetails}</h3>
 
 <div className="space-y-4">
 <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
 <h4 className="text-sm font-semibold text-gray-900 mb-2">{localT.reasonForLeaving}:</h4>
 <p className="text-sm text-gray-800">{exitInterview.reasonForLeaving}</p>
 </div>
 
 <div className="grid grid-cols-2 gap-4">
 <div className="border border-gray-200 rounded-lg p-3 bg-white">
 <h4 className="text-xs font-semibold text-gray-700 mb-1">{localT.wouldRecommend}</h4>
 <p className="text-sm font-bold text-gray-900">{exitInterview.wouldRecommend}</p>
 </div>
 <div className="border border-gray-200 rounded-lg p-3 bg-white">
 <h4 className="text-xs font-semibold text-gray-700 mb-1">{localT.wouldRejoin}</h4>
 <p className="text-sm font-bold text-gray-900">{exitInterview.wouldRejoin}</p>
 </div>
 </div>
 </div>
 </div>

 {/* Satisfaction Ratings */}
 <div className="mb-8">
 <h3 className="text-base font-bold text-gray-900 mb-4">{localT.satisfactionRatings}</h3>
 
 <div className="border border-gray-200 rounded-lg overflow-hidden">
 <table className="w-full">
 <thead className="bg-gray-100">
 <tr>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>
 {t.hrModals.category}
 </th>
 <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">
 {t.hrModals.rating}
 </th>
 </tr>
 </thead>
 <tbody>
 <tr className="border-t border-gray-200">
 <td className="px-4 py-3 text-sm text-gray-900">{localT.workEnvironment}</td>
 <td className="px-4 py-3 text-center text-yellow-500 text-lg">
 {getRatingStars(exitInterview.satisfactionRatings.workEnvironment)}
 </td>
 </tr>
 <tr className="border-t border-gray-200">
 <td className="px-4 py-3 text-sm text-gray-900">{localT.management}</td>
 <td className="px-4 py-3 text-center text-yellow-500 text-lg">
 {getRatingStars(exitInterview.satisfactionRatings.management)}
 </td>
 </tr>
 <tr className="border-t border-gray-200">
 <td className="px-4 py-3 text-sm text-gray-900">{localT.compensation}</td>
 <td className="px-4 py-3 text-center text-yellow-500 text-lg">
 {getRatingStars(exitInterview.satisfactionRatings.compensation)}
 </td>
 </tr>
 <tr className="border-t border-gray-200">
 <td className="px-4 py-3 text-sm text-gray-900">{localT.careerGrowth}</td>
 <td className="px-4 py-3 text-center text-yellow-500 text-lg">
 {getRatingStars(exitInterview.satisfactionRatings.careerGrowth)}
 </td>
 </tr>
 <tr className="border-t border-gray-200">
 <td className="px-4 py-3 text-sm text-gray-900">{localT.workLifeBalance}</td>
 <td className="px-4 py-3 text-center text-yellow-500 text-lg">
 {getRatingStars(exitInterview.satisfactionRatings.workLifeBalance)}
 </td>
 </tr>
 </tbody>
 </table>
 </div>
 </div>

 {/* Feedback */}
 <div className="mb-8">
 <h3 className="text-base font-bold text-gray-900 mb-4">{localT.feedback}</h3>
 
 <div className="space-y-4">
 {exitInterview.strengths && (
 <div>
 <h4 className="text-sm font-semibold text-gray-900 mb-2">{localT.strengths}:</h4>
 <div className="border border-green-200 rounded-lg p-3 bg-green-50 text-sm text-gray-800 whitespace-pre-wrap">
 {exitInterview.strengths}
 </div>
 </div>
 )}
 
 {exitInterview.improvements && (
 <div>
 <h4 className="text-sm font-semibold text-gray-900 mb-2">{localT.improvements}:</h4>
 <div className="border border-orange-200 rounded-lg p-3 bg-orange-50 text-sm text-gray-800 whitespace-pre-wrap">
 {exitInterview.improvements}
 </div>
 </div>
 )}
 
 {exitInterview.comments && (
 <div>
 <h4 className="text-sm font-semibold text-gray-900 mb-2">{localT.additionalComments}:</h4>
 <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 text-sm text-gray-800 whitespace-pre-wrap">
 {exitInterview.comments}
 </div>
 </div>
 )}
 </div>
 </div>

 {/* Signatures */}
 <div className="mt-12 pt-8 border-t-2 border-gray-300">
 <h3 className="text-sm font-bold text-gray-900 mb-6">{localT.signatures}</h3>
 <div className="grid grid-cols-2 gap-12">
 <div>
 <div className="h-16 mb-2"></div>
 <div className="border-t-2 border-gray-400 pt-2">
 <p className="text-xs font-semibold text-gray-900">{localT.employee}</p>
 <p className="text-xs text-gray-600 mt-1">{employee.fullName}</p>
 <p className="text-xs text-gray-500">{localT.date}: _______________</p>
 </div>
 </div>
 <div>
 <div className="h-16 mb-2"></div>
 <div className="border-t-2 border-gray-400 pt-2">
 <p className="text-xs font-semibold text-gray-900">{localT.interviewer}</p>
 <p className="text-xs text-gray-600 mt-1">{exitInterview.conductedBy}</p>
 <p className="text-xs text-gray-500">{localT.date}: {formatDate(exitInterview.interviewDate)}</p>
 </div>
 </div>
 </div>
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