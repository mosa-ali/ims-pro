/**
 * ============================================================================
 * DISCIPLINARY LETTER PRINT MODAL - Official Disciplinary Action Document
 * ============================================================================
 * ✅ USES OFFICIAL DOCUMENT TEMPLATE (Global Standard)
 * ✅ A4 Layout, print-optimized
 * ✅ Organization branding from System Settings
 * ============================================================================
 */

import { X, Printer } from 'lucide-react';
import { StaffMember } from '../types/hrTypes';
import { DisciplinaryRecord } from '@/app/services/disciplinaryService';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface Props {
 disciplinary: DisciplinaryRecord;
 onClose: () => void;
}

export function DisciplinaryLetterPrintModal({
 disciplinary, onClose }: Props) {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const [employee, setEmployee] = useState<StaffMember | null>(null);

 useEffect(() => {
 const emp = staffService.getByStaffId(disciplinary.staffId);
 if (emp) setEmployee(emp);
 }, [disciplinary]);

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

 const getSeverityColor = (severity: string) => {
 switch (severity) {
 case 'Minor': return 'text-yellow-700 bg-yellow-100';
 case 'Major': return 'text-orange-700 bg-orange-100';
 case 'Severe': return 'text-red-700 bg-red-100';
 default: return 'text-gray-700 bg-gray-100';
 }
 };

 const localT = {
 title: t.hrModals.disciplinaryActionLetter,
 
 ref: t.hrModals.reference,
 date: t.hrModals.date,
 to: t.hrModals.to,
 subject: t.hrModals.subject,
 
 incidentDetails: t.hrModals.incidentDetails,
 incidentDate: t.hrModals.incidentDate,
 severity: t.hrModals.severity4,
 stage: t.hrModals.disciplinaryStage5,
 
 description: t.hrModals.descriptionOfIncident,
 actionTaken: t.hrModals.actionTaken,
 consequences: t.hrModals.consequencesOfRepeatedViolations,
 
 opening: 'This letter serves as a formal notice of disciplinary action taken against you for the incident described below.',
 
 acknowledgement: 'You are required to acknowledge receipt of this letter within 3 business days. You have the right to appeal this decision within 7 business days.',
 
 signatures: t.hrModals.signatures,
 issuedBy: t.hrModals.issuedBy,
 acknowledgedBy: t.hrModals.acknowledgedBy,
 witness: t.hrModals.witnessHr,
 
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
 <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-red-50 print:hidden">
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
 
 {/* Letter Header */}
 <div className="mb-8">
 <div className="flex justify-between items-start mb-4 text-sm">
 <div>
 <strong>{localT.ref}:</strong> DISC-{disciplinary.id}-{new Date(disciplinary.incidentDate).getFullYear()}
 </div>
 <div>
 <strong>{localT.date}:</strong> {formatDate(disciplinary.actionDate)}
 </div>
 </div>
 </div>

 {/* Recipient */}
 <div className="mb-8">
 <p className="font-bold text-lg mb-2">{localT.to}:</p>
 <p className="text-gray-900 font-medium">{employee.fullName}</p>
 <p className="text-gray-700">{employee.position}</p>
 <p className="text-gray-700">{employee.department}</p>
 <p className="text-gray-700">{t.hrModals.staffId}: {employee.staffId}</p>
 </div>

 {/* Subject */}
 <div className="mb-8">
 <p className="font-bold text-lg mb-2">{localT.subject}:</p>
 <p className="text-gray-900 font-semibold uppercase">{localT.title}</p>
 </div>

 {/* Opening Statement */}
 <div className="mb-8">
 <p className="text-sm leading-relaxed text-gray-800">{localT.opening}</p>
 </div>

 {/* Incident Details Box */}
 <div className="mb-8 border-2 border-red-300 rounded-lg p-6 bg-red-50">
 <h3 className="text-lg font-bold text-red-900 mb-4">{localT.incidentDetails}</h3>
 
 <div className="grid grid-cols-3 gap-4 mb-4">
 <div>
 <span className="text-sm font-medium text-gray-700">{localT.incidentDate}:</span>
 <p className="text-sm text-gray-900 font-semibold">{formatDate(disciplinary.incidentDate)}</p>
 </div>
 <div>
 <span className="text-sm font-medium text-gray-700">{localT.severity}:</span>
 <p className={`inline-block px-3 py-1 rounded font-bold text-sm ${getSeverityColor(disciplinary.severity)}`}>
 {disciplinary.severity}
 </p>
 </div>
 <div>
 <span className="text-sm font-medium text-gray-700">{localT.stage}:</span>
 <p className="text-sm text-gray-900 font-semibold">{disciplinary.disciplinaryStage}</p>
 </div>
 </div>
 
 <div className="mb-4">
 <h4 className="text-sm font-semibold text-gray-900 mb-2">{localT.description}:</h4>
 <div className="bg-white border border-red-200 rounded p-3 text-sm text-gray-800 whitespace-pre-wrap">
 {disciplinary.description}
 </div>
 </div>
 
 <div>
 <h4 className="text-sm font-semibold text-gray-900 mb-2">{localT.actionTaken}:</h4>
 <div className="bg-white border border-red-200 rounded p-3 text-sm text-gray-800 whitespace-pre-wrap">
 {disciplinary.actionTaken}
 </div>
 </div>
 </div>

 {/* Consequences Warning */}
 <div className="mb-8 bg-yellow-50 border border-yellow-300 rounded-lg p-4">
 <h4 className="text-sm font-bold text-yellow-900 mb-2">{localT.consequences}:</h4>
 <p className="text-sm text-yellow-800">
 {'Further violations of company policies may result in more severe disciplinary action, up to and including termination of employment.'}
 </p>
 </div>

 {/* Acknowledgement Requirement */}
 <div className="mb-8 bg-blue-50 border border-blue-300 rounded-lg p-4">
 <p className="text-sm text-blue-800 font-medium">{localT.acknowledgement}</p>
 </div>

 {/* Signatures */}
 <div className="mt-12 pt-8 border-t-2 border-gray-300">
 <h3 className="text-sm font-bold text-gray-900 mb-6">{localT.signatures}</h3>
 <div className="grid grid-cols-3 gap-8">
 <div>
 <div className="h-16 mb-2"></div>
 <div className="border-t-2 border-gray-400 pt-2">
 <p className="text-xs font-semibold text-gray-900">{localT.issuedBy}</p>
 <p className="text-xs text-gray-600 mt-1">{disciplinary.reportedBy}</p>
 <p className="text-xs text-gray-500">{localT.date}: {formatDate(disciplinary.actionDate)}</p>
 </div>
 </div>
 <div>
 <div className="h-16 mb-2"></div>
 <div className="border-t-2 border-gray-400 pt-2">
 <p className="text-xs font-semibold text-gray-900">{localT.acknowledgedBy}</p>
 <p className="text-xs text-gray-600 mt-1">{employee.fullName}</p>
 <p className="text-xs text-gray-500">{localT.date}: _______________</p>
 </div>
 </div>
 <div>
 <div className="h-16 mb-2"></div>
 <div className="border-t-2 border-gray-400 pt-2">
 <p className="text-xs font-semibold text-gray-900">{localT.witness}</p>
 <p className="text-xs text-gray-600 mt-1">{t.hrModals.hrManager}</p>
 <p className="text-xs text-gray-500">{localT.date}: _______________</p>
 </div>
 </div>
 </div>
 </div>

 {/* Footer Notice */}
 <div className="mt-8 pt-4 border-t border-gray-200 text-center">
 <p className="text-xs text-gray-500">
 {'This is an official HR document. Please retain for your records.'}
 </p>
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