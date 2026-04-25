/**
 * ============================================================================
 * APPRAISAL PRINT MODAL - Official Performance Appraisal Document
 * ============================================================================
 * ✅ USES OFFICIAL DOCUMENT TEMPLATE (Global Standard)
 * ✅ A4 Layout, print-optimized
 * ✅ Organization branding from System Settings
 * ============================================================================
 */

import { X, Printer } from 'lucide-react';
import { AppraisalRecord } from '../types/hrTypes';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface Props {
 appraisal: AppraisalRecord;
 onClose: () => void;
}

export function AppraisalPrintModal({
 appraisal, onClose }: Props) {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();

 const handlePrint = () => {
 window.print();
 };

 const formatDate = (dateString?: string) => {
 if (!dateString) return '-';
 return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
 year: 'numeric',
 month: 'long',
 day: 'numeric'
 });
 };

 const getRatingColor = (rating?: number) => {
 if (!rating) return 'text-gray-700 bg-gray-100';
 if (rating >= 4.5) return 'text-green-700 bg-green-100';
 if (rating >= 3.5) return 'text-blue-700 bg-blue-100';
 if (rating >= 2.5) return 'text-yellow-700 bg-yellow-100';
 return 'text-red-700 bg-red-100';
 };

 const getRatingLabelFromText = (ratingText?: string) => {
 if (!ratingText) return '-';
 if (language === 'ar') {
 const arLabels: Record<string, string> = {
 'Excellent': 'ممتاز',
 'Good': 'جيد',
 'Satisfactory': 'مرضي',
 'Needs Improvement': 'يحتاج للتحسين',
 'Unsatisfactory': 'غير مرضي'
 };
 return arLabels[ratingText] || ratingText;
 }
 return ratingText;
 };

 const localT = {
 title: t.hrEmployeeCards?.performanceAppraisal || 'Performance Appraisal',
 
 appraisalPeriod: t.hrModals.appraisalPeriod || 'Appraisal Period',
 reviewDate: t.hrModals.reviewDate || 'Review Date',
 reviewer: t.hrModals.reviewer || 'Reviewer',
 overallRating: t.hrModals.overallRating || 'Overall Rating',
 
 competencies: t.hrModals.competencyRatings || 'Competency Ratings',
 technical: t.hrModals.technicalSkills || 'Technical Skills',
 communication: t.hrModals.communication || 'Communication',
 teamwork: t.hrModals.teamwork || 'Teamwork',
 leadership: t.hrModals.leadership || 'Leadership',
 problemSolving: t.hrModals.problemSolving || 'Problem Solving',
 
 achievements: t.hrModals.keyAchievements || 'Key Achievements',
 areasForDevelopment: t.hrModals.areasForDevelopment || 'Areas for Development',
 goals: t.hrModals.goalsForNextPeriod || 'Goals for Next Period',
 
 employeeComments: t.hrModals.employeeComments || 'Employee Comments',
 supervisorComments: t.hrStaff.supervisorComments || 'Supervisor Comments',
 
 signatures: t.hrModals.signatures || 'Signatures',
 employeeSignature: t.hrModals.employeeSignature || 'Employee Signature',
 reviewerSignature: t.hrModals.reviewerSignature || 'Reviewer Signature',
 hrSignature: t.hrModals.hrManagerSignature || 'HR Manager Signature',
 date: t.hrModals.date || 'Date',
 
 competency: t.hrModals.competency || 'Competency',
 rating: t.hrModals.rating || 'Rating',
 hrManager: t.hrModals.hrManager || 'HR Manager',
 
 print: t.hr?.print || 'Print',
 close: t.hr?.close || 'Close'
 };

 return (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose} dir={isRTL ? 'rtl' : 'ltr'}>
 <div 
 className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
 onClick={(e) => e.stopPropagation()}
 
 >
 {/* Header (Print Hidden) */}
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

 {/* Content */}
 <div className="flex-1 overflow-y-auto p-8">
 <div className="max-w-[210mm] mx-auto bg-white print:p-0">
 {/* Document will be printed with OfficialDocumentTemplate styling */}
 
 {/* Basic Information */}
 <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
 <div className="grid grid-cols-2 gap-4 text-sm">
 <div>
 <span className="font-medium text-gray-700">{localT.appraisalPeriod}:</span>
 <p className="text-gray-900">
 {appraisal.reviewPeriodStart && appraisal.reviewPeriodEnd 
 ? `${formatDate(appraisal.reviewPeriodStart)} - ${formatDate(appraisal.reviewPeriodEnd)}`
 : appraisal.reviewPeriod || '-'}
 </p>
 </div>
 <div>
 <span className="font-medium text-gray-700">{localT.reviewDate}:</span>
 <p className="text-gray-900">{formatDate(appraisal.reviewDate)}</p>
 </div>
 <div>
 <span className="font-medium text-gray-700">{localT.reviewer}:</span>
 <p className="text-gray-900">{appraisal.reviewerName}</p>
 </div>
 <div>
 <span className="font-medium text-gray-700">{localT.overallRating}:</span>
 <div className="flex items-center gap-2 mt-1">
 <span className={`px-3 py-1 rounded font-bold text-lg ${getRatingColor()}`}>
 {appraisal.overallRating}
 </span>
 <span className="text-sm text-gray-600">({getRatingLabelFromText(appraisal.overallRating)})</span>
 </div>
 </div>
 </div>
 </div>

 {/* Competency Ratings */}
 {(appraisal.technicalSkills || appraisal.communication || appraisal.teamwork || appraisal.leadership || appraisal.problemSolving) && (
 <div className="mb-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-3">{localT.competencies}</h3>
 <div className="border border-gray-200 rounded-lg overflow-hidden">
 <table className="w-full">
 <thead className="bg-gray-50">
 <tr>
 <th className={`px-4 py-2 text-sm font-medium text-gray-700 text-start`}>
 {localT.competency}
 </th>
 <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">
 {localT.rating}
 </th>
 </tr>
 </thead>
 <tbody>
 {appraisal.technicalSkills && (
 <tr className="border-t border-gray-200">
 <td className="px-4 py-2 text-sm text-gray-900">{localT.technical}</td>
 <td className="px-4 py-2 text-center">
 <span className={`px-2 py-1 rounded font-medium ${getRatingColor(appraisal.technicalSkills)}`}>
 {appraisal.technicalSkills.toFixed(1)}
 </span>
 </td>
 </tr>
 )}
 {appraisal.communication && (
 <tr className="border-t border-gray-200">
 <td className="px-4 py-2 text-sm text-gray-900">{localT.communication}</td>
 <td className="px-4 py-2 text-center">
 <span className={`px-2 py-1 rounded font-medium ${getRatingColor(appraisal.communication)}`}>
 {appraisal.communication.toFixed(1)}
 </span>
 </td>
 </tr>
 )}
 {appraisal.teamwork && (
 <tr className="border-t border-gray-200">
 <td className="px-4 py-2 text-sm text-gray-900">{localT.teamwork}</td>
 <td className="px-4 py-2 text-center">
 <span className={`px-2 py-1 rounded font-medium ${getRatingColor(appraisal.teamwork)}`}>
 {appraisal.teamwork.toFixed(1)}
 </span>
 </td>
 </tr>
 )}
 {appraisal.leadership && (
 <tr className="border-t border-gray-200">
 <td className="px-4 py-2 text-sm text-gray-900">{localT.leadership}</td>
 <td className="px-4 py-2 text-center">
 <span className={`px-2 py-1 rounded font-medium ${getRatingColor(appraisal.leadership)}`}>
 {appraisal.leadership.toFixed(1)}
 </span>
 </td>
 </tr>
 )}
 {appraisal.problemSolving && (
 <tr className="border-t border-gray-200">
 <td className="px-4 py-2 text-sm text-gray-900">{localT.problemSolving}</td>
 <td className="px-4 py-2 text-center">
 <span className={`px-2 py-1 rounded font-medium ${getRatingColor(appraisal.problemSolving)}`}>
 {appraisal.problemSolving.toFixed(1)}
 </span>
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* Narrative Sections */}
 <div className="space-y-4 mb-6">
 {appraisal.achievements && (
 <div>
 <h3 className="text-sm font-semibold text-gray-900 mb-2">{localT.achievements}</h3>
 <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">
 {appraisal.achievements}
 </div>
 </div>
 )}

 {appraisal.areasForDevelopment && (
 <div>
 <h3 className="text-sm font-semibold text-gray-900 mb-2">{localT.areasForDevelopment}</h3>
 <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">
 {appraisal.areasForDevelopment}
 </div>
 </div>
 )}

 {appraisal.goals && (
 <div>
 <h3 className="text-sm font-semibold text-gray-900 mb-2">{localT.goals}</h3>
 <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">
 {appraisal.goals}
 </div>
 </div>
 )}

 {appraisal.employeeComments && (
 <div>
 <h3 className="text-sm font-semibold text-gray-900 mb-2">{localT.employeeComments}</h3>
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">
 {appraisal.employeeComments}
 </div>
 </div>
 )}

 {appraisal.supervisorComments && (
 <div>
 <h3 className="text-sm font-semibold text-gray-900 mb-2">{localT.supervisorComments}</h3>
 <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">
 {appraisal.supervisorComments}
 </div>
 </div>
 )}
 </div>

 {/* Signatures */}
 <div className="mt-8 pt-6 border-t-2 border-gray-300">
 <h3 className="text-sm font-semibold text-gray-900 mb-4">{localT.signatures}</h3>
 <div className="grid grid-cols-3 gap-8">
 <div>
 <div className="h-16 mb-2"></div>
 <div className="border-t-2 border-gray-400 pt-2">
 <p className="text-xs font-semibold text-gray-900">{localT.employeeSignature}</p>
 <p className="text-xs text-gray-600 mt-1">{appraisal.staffName}</p>
 <p className="text-xs text-gray-500">{localT.date}: _______________</p>
 </div>
 </div>
 <div>
 <div className="h-16 mb-2"></div>
 <div className="border-t-2 border-gray-400 pt-2">
 <p className="text-xs font-semibold text-gray-900">{localT.reviewerSignature}</p>
 <p className="text-xs text-gray-600 mt-1">{appraisal.reviewerName}</p>
 <p className="text-xs text-gray-500">{localT.date}: {formatDate(appraisal.reviewDate)}</p>
 </div>
 </div>
 <div>
 <div className="h-16 mb-2"></div>
 <div className="border-t-2 border-gray-400 pt-2">
 <p className="text-xs font-semibold text-gray-900">{localT.hrSignature}</p>
 <p className="text-xs text-gray-600 mt-1">{localT.hrManager}</p>
 <p className="text-xs text-gray-500">{localT.date}: _______________</p>
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