/**
 * ============================================================================
 * TRAINING CERTIFICATE PRINT MODAL - Official Training Completion Certificate
 * ============================================================================
 * ✅ USES OFFICIAL DOCUMENT TEMPLATE (Global Standard)
 * ✅ Decorative certificate design
 * ✅ Organization branding from System Settings
 * ============================================================================
 */

import { X, Printer, Award } from 'lucide-react';
import { StaffMember } from '../types/hrTypes';
import { TrainingRecord } from '@/app/services/trainingService';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface Props {
 training: TrainingRecord;
 onClose: () => void;
}

export function TrainingCertificatePrintModal({
 training, onClose }: Props) {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const [employee, setEmployee] = useState<StaffMember | null>(null);

 useEffect(() => {
 const emp = staffService.getByStaffId(training.staffId);
 if (emp) setEmployee(emp);
 }, [training]);

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

 const localT = {
 certificate: t.hrModals.certificateOfCompletion,
 presentedTo: t.hrModals.thisCertificateIsProudlyPresentedTo,
 completion: 'For successful completion of the training program',
 
 trainingTitle: t.hrModals.trainingTitle,
 duration: t.hrModals.duration,
 hours: t.hrModals.hours,
 completionDate: t.hrModals.completionDate,
 certNumber: t.hrModals.certificateNo,
 
 signatures: t.hrModals.signatures,
 trainer: t.hrModals.trainer,
 hrManager: t.hrModals.hrManager,
 
 print: t.hrModals.print,
 close: t.hrModals.close
 };

 const certificateNumber = `CERT-${training.id}-${new Date(training.completionDate || training.endDate).getFullYear()}`;

 return (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose} dir={isRTL ? 'rtl' : 'ltr'}>
 <div 
 className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
 onClick={(e) => e.stopPropagation()}
 
 >
 {/* Header (Print Hidden) */}
 <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-blue-50 print:hidden">
 <h2 className="text-xl font-bold text-gray-900">{localT.certificate}</h2>
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
 
 {/* Decorative Certificate */}
 <div className="border-8 border-double border-blue-600 rounded-lg p-12 bg-gradient-to-br from-blue-50 via-white to-blue-50">
 
 {/* Certificate Icon */}
 <div className="flex justify-center mb-6">
 <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center">
 <Award className="w-16 h-16 text-white" />
 </div>
 </div>

 {/* Certificate Title */}
 <div className="text-center mb-8">
 <h1 className="text-4xl font-bold text-blue-900 mb-2 tracking-wide">{localT.certificate}</h1>
 <div className="w-32 h-1 bg-blue-600 mx-auto"></div>
 </div>

 {/* Presented To */}
 <div className="text-center mb-8">
 <p className="text-lg text-gray-700 mb-4 italic">{localT.presentedTo}</p>
 <h2 className="text-3xl font-bold text-gray-900 mb-1">{employee.fullName}</h2>
 <p className="text-sm text-gray-600">{employee.position} • {employee.department}</p>
 </div>

 {/* Completion Statement */}
 <div className="text-center mb-8">
 <p className="text-base text-gray-700 mb-6">{localT.completion}</p>
 </div>

 {/* Training Details Box */}
 <div className="border-2 border-blue-300 rounded-lg p-6 mb-8 bg-white">
 <div className="text-center mb-4">
 <h3 className="text-2xl font-bold text-blue-900">"{training.trainingTitle}"</h3>
 </div>
 
 <div className="grid grid-cols-2 gap-6 text-sm mt-6">
 <div className="text-center">
 <p className="text-gray-600 font-medium mb-1">{localT.duration}</p>
 <p className="text-lg font-bold text-gray-900">{training.duration} {localT.hours}</p>
 </div>
 <div className="text-center">
 <p className="text-gray-600 font-medium mb-1">{localT.completionDate}</p>
 <p className="text-lg font-bold text-gray-900">
 {formatDate(training.completionDate || training.endDate)}
 </p>
 </div>
 </div>
 </div>

 {/* Certificate Number */}
 <div className="text-center mb-8">
 <p className="text-xs text-gray-500 uppercase tracking-wider">
 {localT.certNumber}: {certificateNumber}
 </p>
 </div>

 {/* Signatures */}
 <div className="grid grid-cols-2 gap-12 mt-12">
 <div className="text-center">
 <div className="h-12 mb-2"></div>
 <div className="border-t-2 border-gray-400 pt-2">
 <p className="text-sm font-bold text-gray-900">{training.trainingProvider}</p>
 <p className="text-xs text-gray-600 mt-1">{localT.trainer}</p>
 </div>
 </div>
 <div className="text-center">
 <div className="h-12 mb-2"></div>
 <div className="border-t-2 border-gray-400 pt-2">
 <p className="text-sm font-bold text-gray-900">{localT.hrManager}</p>
 <p className="text-xs text-gray-600 mt-1">{formatDate(new Date().toISOString())}</p>
 </div>
 </div>
 </div>

 {/* Decorative Elements */}
 <div className="flex justify-center mt-8 space-x-2">
 <div className="w-2 h-2 rounded-full bg-blue-600"></div>
 <div className="w-2 h-2 rounded-full bg-blue-400"></div>
 <div className="w-2 h-2 rounded-full bg-blue-300"></div>
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
 size: A4 landscape;
 margin: 10mm;
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