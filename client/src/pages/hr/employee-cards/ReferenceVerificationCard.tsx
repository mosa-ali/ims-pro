/**
 * ============================================================================
 * 8. REFERENCE & VERIFICATION CARD
 * ============================================================================
 * 
 * ✅ CONTROLLED INPUT (Upload-Only)
 * - NOT Read-Only - Uploads allowed
 * - External reference forms from UN, NGOs, banks, embassies, etc.
 * - Forms are filled externally, signed, and returned to HR
 * - System stores official documents
 * - Factual information only (no evaluation)
 * 
 * ============================================================================
 */

import { FileCheck, Printer, Upload, Download, FileText } from 'lucide-react';
import { StaffMember } from '../types/hrTypes';
import { useState, useEffect } from 'react';
import { ReferenceSummaryModal } from '../modals/ReferenceSummaryModal';
import { ReferenceUploadModal } from '../modals/ReferenceUploadModal';
import { referenceUploadService, ReferenceUpload } from '@/app/services/referenceUploadService';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface Props {
 employee: StaffMember;
 language: string;
 isRTL: boolean;
}

export function ReferenceVerificationCard({
 employee, language, isRTL }: Props) {
 const { t } = useTranslation();
 const [uploads, setUploads] = useState<ReferenceUpload[]>([]);
 const [showUploadModal, setShowUploadModal] = useState(false);
 const [isPrinting, setIsPrinting] = useState(false);

 useEffect(() => {
 loadUploads();
 }, [employee]);

 const loadUploads = () => {
 const data = referenceUploadService.getByStaffId(employee.staffId);
 setUploads(data);
 };

 const localT = {
 title: t.hrEmployeeCards.referenceVerification,
 subtitle: t.hrEmployeeCards.employmentVerificationAndReferences,
 generateReference: t.hrEmployeeCards.generateReferenceSummary,
 uploadReference: t.hrEmployeeCards.uploadReferenceForm,
 
 employmentHistory: t.hrEmployeeCards.employmentHistory,
 employmentPeriod: t.hrEmployeeCards.employmentPeriod,
 lastPosition: t.hrEmployeeCards.lastPosition,
 department: t.hrEmployeeCards.department,
 supervisor: t.hrEmployeeCards.supervisorAtExit,
 finalStatus: t.hrEmployeeCards.finalStatus,
 
 uploadedReferences: t.hrEmployeeCards.uploadedReferenceRequests,
 noUploads: t.hrEmployeeCards.noReferenceFormsUploadedYet,
 requestingOrg: t.hrEmployeeCards.requestingOrganization,
 referenceType: t.hrEmployeeCards.referenceType,
 dateRequested: t.hrEmployeeCards.dateRequested,
 dateIssued: t.hrEmployeeCards.dateIssued,
 uploadedBy: t.hrEmployeeCards.uploadedBy,
 uploadDate: t.hrEmployeeCards.uploadDate,
 download: t.hrEmployeeCards.download,
 
 note: '📌 This section contains factual information only (no evaluation)'
 };

 const formatDate = (dateString?: string) => {
 if (!dateString) return '-';
 return new Date(dateString).toLocaleDateString(t.hrEmployeeCards.en, {
 year: 'numeric',
 month: 'short',
 day: 'numeric'
 });
 };

 const getReferenceTypeColor = (type: string) => {
 switch (type) {
 case 'Employment': return 'bg-blue-100 text-blue-700 border-blue-200';
 case 'Salary': return 'bg-green-100 text-green-700 border-green-200';
 case 'Conduct': return 'bg-purple-100 text-purple-700 border-purple-200';
 case 'General': return 'bg-gray-100 text-gray-700 border-gray-200';
 default: return 'bg-gray-100 text-gray-700 border-gray-200';
 }
 };

 return (
 <div className="bg-white rounded-lg border border-gray-200" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
 <div className={'text-start'}>
 <h3 className="text-lg font-semibold text-gray-900">{localT.title}</h3>
 <p className="text-sm text-gray-600 mt-1">{localT.subtitle}</p>
 </div>
 <div className={`flex items-center gap-2`}>
 <button 
 className={`flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700`}
 onClick={() => setShowUploadModal(true)}
 >
 <Upload className="w-4 h-4" />
 <span>{localT.uploadReference}</span>
 </button>
 <button 
 className={`flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700`}
 onClick={() => setIsPrinting(true)}
 >
 <Printer className="w-4 h-4" />
 <span>{localT.generateReference}</span>
 </button>
 </div>
 </div>
 
 <div className="p-6 space-y-6">
 {/* Employment History Summary */}
 <div className={`p-4 bg-gray-50 rounded-lg text-start`}>
 <h4 className="text-sm font-semibold text-gray-900 mb-3">{localT.employmentHistory}</h4>
 <div className="space-y-2">
 <div className={`flex justify-between`}>
 <span className="text-sm text-gray-600">{localT.employmentPeriod}:</span>
 <span className="text-sm font-medium text-gray-900">
 {formatDate(employee.hireDate)} - {formatDate(employee.contractEndDate)}
 </span>
 </div>
 <div className={`flex justify-between`}>
 <span className="text-sm text-gray-600">{localT.lastPosition}:</span>
 <span className="text-sm font-medium text-gray-900">{employee.position}</span>
 </div>
 <div className={`flex justify-between`}>
 <span className="text-sm text-gray-600">{localT.department}:</span>
 <span className="text-sm font-medium text-gray-900">{employee.department}</span>
 </div>
 <div className={`flex justify-between`}>
 <span className="text-sm text-gray-600">{localT.supervisor}:</span>
 <span className="text-sm font-medium text-gray-900">
 {employee.supervisor || (t.hrEmployeeCards.notAssigned)}
 </span>
 </div>
 <div className={`flex justify-between`}>
 <span className="text-sm text-gray-600">{localT.finalStatus}:</span>
 <span className="text-sm font-medium text-green-600">
 {employee.status === 'active' ? (t.hrEmployeeCards.currentlyActive) : employee.status}
 </span>
 </div>
 </div>
 </div>

 {/* Uploaded Reference Forms */}
 <div>
 <h4 className="text-sm font-semibold text-gray-900 mb-3">{localT.uploadedReferences}</h4>
 {uploads.length === 0 ? (
 <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
 <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
 <p className="text-sm text-gray-500">{localT.noUploads}</p>
 </div>
 ) : (
 <div className="space-y-3">
 {uploads.map((upload) => (
 <div key={upload.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
 <div className="flex items-start justify-between mb-2">
 <div className="flex-1">
 <div className="flex items-center gap-2 mb-2">
 <FileText className="w-5 h-5 text-blue-600" />
 <span className="font-semibold text-gray-900">{upload.fileName}</span>
 <span className={`px-2 py-1 rounded text-xs font-medium border ${getReferenceTypeColor(upload.referenceType)}`}>
 {upload.referenceType}
 </span>
 </div>
 <p className="text-sm text-gray-700 mb-1">
 <span className="font-medium">{localT.requestingOrg}:</span> {upload.requestingOrganization}
 </p>
 <div className="flex items-center gap-4 text-xs text-gray-500">
 <span>{localT.dateRequested}: {formatDate(upload.dateRequested)}</span>
 {upload.dateIssued && (
 <span>{localT.dateIssued}: {formatDate(upload.dateIssued)}</span>
 )}
 </div>
 <p className="text-xs text-gray-400 mt-1">
 {localT.uploadedBy}: {upload.uploadedBy} • {formatDate(upload.uploadDate)}
 </p>
 </div>
 <button
 className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded"
 title={localT.download}
 >
 <Download className="w-5 h-5" />
 </button>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Note */}
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
 <p className={`text-sm text-blue-800 text-start`}>
 {localT.note}
 </p>
 </div>
 </div>

 {/* Upload Modal */}
 {showUploadModal && (
 <ReferenceUploadModal
 employee={employee}
 onClose={() => setShowUploadModal(false)}
 onUpload={() => {
 loadUploads();
 setShowUploadModal(false);
 }}
 />
 )}

 {/* Reference Summary Modal */}
 {isPrinting && (
 <ReferenceSummaryModal
 employee={employee}
 language={language}
 isRTL={isRTL}
 onClose={() => setIsPrinting(false)}
 />
 )}
 </div>
 );
}