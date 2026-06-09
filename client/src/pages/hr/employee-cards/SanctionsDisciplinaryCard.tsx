/**
 * ============================================================================
 * 5. SANCTIONS & DISCIPLINARY CARD - EMPLOYEE PROFILE
 * ============================================================================
 * 
 * 🔒 ARCHITECTURE (BEST PRACTICE):
 * - READ-ONLY personnel record & document archive
 * - Shows ONLY approved/closed cases from Sanctions & Disciplinary Module
 * - Auto-loads final approved decisions
 * - Provides document generation & upload
 * 
 * ❌ DOES NOT:
 * - Start investigations
 * - Edit decisions
 * - Approve/reject cases
 * - Manually enter data
 * 
 * ✅ PROVIDES:
 * - Generate Official Disciplinary Form (PDF)
 * - Upload Signed Disciplinary Form (PDF)
 * - View final approved records
 * - Audit trail
 * 
 * DATA SOURCE:
 * - Reads from: sanctions_cases (localStorage)
 * - Filter: status = 'Approved' or 'Closed'
 * - Filter: staffId = current employee
 * 
 * ============================================================================
 */

import { useState, useEffect, useRef } from 'react';
import { 
 AlertTriangle, 
 FileText, 
 Printer, 
 Upload, 
 Download,
 CheckCircle,
 Eye,
 Lock,
 Shield
} from 'lucide-react';
import { StaffMember } from '../types/hrTypes';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface DisciplinaryCase {
 id: string;
 caseReference: string;
 staffId: string;
 status: 'Draft' | 'Investigation' | 'Decision' | 'Approval' | 'Approved' | 'Closed';
 
 // From Form 1
 allegationDetails: string;
 allegationDate: string;
 reportedBy: string;
 reporterPosition: string;
 
 // From Form 4 (Decision)
 finalDecision?: string;
 disciplinaryAction?: string; // FREE TEXT field
 effectiveDate?: string;
 
 // From Form 5 (Approval)
 approvedBy?: string;
 approverPosition?: string;
 approvalDate?: string;
 
 // From Form 6 (Final Record)
 finalRecordGenerated?: boolean;
 finalRecordDate?: string;
 
 createdDate: string;
 lastUpdated: string;
}

interface SignedDocument {
 id: string;
 caseId: string;
 caseReference: string;
 staffId: string;
 fileName: string;
 fileData: string; // Base64 or blob URL
 uploadedDate: string;
 uploadedBy: string;
}

interface Props {
 employee: StaffMember;
 language: string;
 isRTL: boolean;
}

// ============================================================================
// SERVICES
// ============================================================================

const disciplinaryCasesService = {
 getApprovedCases(staffId: string): DisciplinaryCase[] {
 try {
 const data = localStorage.getItem('sanctions_cases');
 const allCases: DisciplinaryCase[] = data ? JSON.parse(data) : [];
 
 // Filter: only Approved or Closed cases for this employee
 return allCases.filter(c => 
 c.staffId === staffId && 
 (c.status === 'Approved' || c.status === 'Closed')
 );
 } catch {
 return [];
 }
 }
};

const signedDocumentsService = {
 getAll(): SignedDocument[] {
 try {
 const data = localStorage.getItem('sanctions_signed_documents');
 return data ? JSON.parse(data) : [];
 } catch {
 return [];
 }
 },

 getByCaseId(caseId: string): SignedDocument | null {
 const docs = this.getAll();
 return docs.find(d => d.caseId === caseId) || null;
 },

 upload(doc: Omit<SignedDocument, 'id' | 'uploadedDate'>): SignedDocument {
 const docs = this.getAll();
 const newDoc: SignedDocument = {
 ...doc,
 id: `SDC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
 uploadedDate: new Date().toISOString()
 };
 docs.push(newDoc);
 localStorage.setItem('sanctions_signed_documents', JSON.stringify(docs));
 return newDoc;
 }
};

// ============================================================================
// COMPONENT
// ============================================================================

export function SanctionsDisciplinaryCard({
 employee, language, isRTL }: Props) {
 const { t } = useTranslation();
 const [cases, setCases] = useState<DisciplinaryCase[]>([]);
 const [signedDocs, setSignedDocs] = useState<Map<string, SignedDocument>>(new Map());
 const [showPrintModal, setShowPrintModal] = useState(false);
 const [selectedCase, setSelectedCase] = useState<DisciplinaryCase | null>(null);
 const fileInputRef = useRef<HTMLInputElement>(null);
 const [uploadingCaseId, setUploadingCaseId] = useState<string | null>(null);

 useEffect(() => {
 loadData();
 }, [employee]);

 const loadData = () => {
 // Load approved/closed cases
 const approvedCases = disciplinaryCasesService.getApprovedCases(employee.staffId);
 
 // Sort by approval date (most recent first)
 approvedCases.sort((a, b) => {
 const dateA = new Date(a.approvalDate || a.createdDate).getTime();
 const dateB = new Date(b.approvalDate || b.createdDate).getTime();
 return dateB - dateA;
 });
 
 setCases(approvedCases);
 
 // Load signed documents
 const docsMap = new Map<string, SignedDocument>();
 approvedCases.forEach(c => {
 const doc = signedDocumentsService.getByCaseId(c.id);
 if (doc) {
 docsMap.set(c.id, doc);
 }
 });
 setSignedDocs(docsMap);
 };

 const handleGenerateOfficialForm = (disciplinaryCase: DisciplinaryCase) => {
 setSelectedCase(disciplinaryCase);
 setShowPrintModal(true);
 };

 const handleUploadSignedForm = (caseId: string) => {
 setUploadingCaseId(caseId);
 fileInputRef.current?.click();
 };

 const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file || !uploadingCaseId) return;

 // Validate file type
 if (file.type !== 'application/pdf') {
 alert(t.pdfOnly);
 return;
 }

 // Validate file size (max 5MB)
 if (file.size > 5 * 1024 * 1024) {
 alert(t.hrModals.fileTooLargeMaximumSizeIs);
 return;
 }

 // Convert to base64
 const reader = new FileReader();
 reader.onload = () => {
 const fileData = reader.result as string;
 const caseData = cases.find(c => c.id === uploadingCaseId);
 
 if (caseData) {
 signedDocumentsService.upload({
 caseId: uploadingCaseId,
 caseReference: caseData.caseReference,
 staffId: employee.staffId,
 fileName: file.name,
 fileData: fileData,
 uploadedBy: 'HR Manager' // TODO: Get from auth context
 });
 
 loadData(); // Reload to show uploaded document
 alert(t.hr.uploadSuccess);
 }
 
 setUploadingCaseId(null);
 };
 reader.readAsDataURL(file);
 };

 const handleDownloadSignedForm = (doc: SignedDocument) => {
 // Create download link
 const link = document.createElement('a');
 link.href = doc.fileData;
 link.download = doc.fileName;
 link.click();
 };

 const formatDate = (dateString?: string) => {
 if (!dateString) return '-';
 return new Date(dateString).toLocaleDateString(t.hrEmployeeCards.en, {
 year: 'numeric',
 month: 'long',
 day: 'numeric'
 });
 };

 const labels = {
 title: t.hrEmployeeCards.sanctionsDisciplinary,
 subtitle: t.hr.sanctionsDisciplinarySubtitle,
 
 noRecords: t.hrEmployeeCards.noDisciplinaryRecords,
 cleanRecord: t.hrEmployeeCards.cleanDisciplinaryRecordNoSanctionsOn,
 
 caseReference: t.hrEmployeeCards.caseReference,
 allegation: t.hrEmployeeCards.allegation,
 allegationDate: t.hrEmployeeCards.allegationDate,
 finalDecision: t.hrEmployeeCards.finalDecision,
 disciplinaryAction: t.hrEmployeeCards.disciplinaryAction,
 effectiveDate: t.hrEmployeeCards.effectiveDate,
 approvedBy: t.hrEmployeeCards.approvedBy,
 approvalDate: t.hrEmployeeCards.approvalDate,
 status: t.hrEmployeeCards.status,
 
 generateForm: t.hrEmployeeCards.generateOfficialForm,
 uploadSigned: t.hrEmployeeCards.uploadSignedForm,
 downloadSigned: t.hrEmployeeCards.downloadSignedForm,
 viewCase: t.hrEmployeeCards.viewFullCase,
 
 signedDocument: t.hrEmployeeCards.signedDocument,
 uploaded: t.hrEmployeeCards.uploaded,
 uploadedOn: t.hrEmployeeCards.uploadedOn,
 
 approved: t.hrEmployeeCards.approved,
 closed: t.hrEmployeeCards.closed,
 
 importantNote: t.hrEmployeeCards.importantNote,
 noteText: 'All disciplinary cases are managed through the Sanctions & Disciplinary Module. This tab shows final approved decisions for personnel file documentation only.',
 
 pdfOnly: t.hrEmployeeCards.onlyPdfFilesAreAllowed,
 fileTooLarge: t.hrEmployeeCards.fileSizeMustBeLessThan,
 uploadSuccess: t.hrEmployeeCards.signedFormUploadedSuccessfully,
 
 totalCases: t.hrEmployeeCards.totalCases
 };

 return (
 <div className="bg-white rounded-lg border border-gray-200" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className="px-6 py-4 border-b border-gray-200">
 <div className={`flex items-start justify-between`}>
 <div className={'text-start'}>
 <div className={`flex items-center gap-3`}>
 <AlertTriangle className="w-5 h-5 text-red-600" />
 <div>
 <h3 className="text-lg font-semibold text-gray-900">{labels.title}</h3>
 <p className="text-sm text-gray-600 mt-1">{labels.subtitle}</p>
 </div>
 {cases.length > 0 && (
 <div className={`flex items-center gap-2 px-3 py-1 bg-red-50 rounded-lg border border-red-200`}>
 <Shield className="w-4 h-4 text-red-600" />
 <span className="text-sm font-semibold text-red-600">
 {labels.totalCases}: {cases.length}
 </span>
 </div>
 )}
 </div>
 </div>
 </div>
 </div>

 {/* Important Note Banner */}
 <div className="px-6 pt-4">
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
 <div className={`flex items-start gap-3`}>
 <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
 <div className={'text-start'}>
 <h4 className="text-sm font-semibold text-blue-900">{labels.importantNote}</h4>
 <p className="text-sm text-blue-700 mt-1">{labels.noteText}</p>
 </div>
 </div>
 </div>
 </div>

 {/* Content */}
 <div className="p-6">
 {cases.length === 0 ? (
 <div className="text-center py-12">
 <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
 <CheckCircle className="w-8 h-8 text-green-600" />
 </div>
 <p className="text-lg font-medium text-green-700 mb-1">{labels.noRecords}</p>
 <p className="text-sm text-gray-600">{labels.cleanRecord}</p>
 </div>
 ) : (
 <div className="space-y-4">
 {cases.map((disciplinaryCase) => {
 const signedDoc = signedDocs.get(disciplinaryCase.id);
 
 return (
 <div 
 key={disciplinaryCase.id}
 className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow bg-gray-50"
 >
 {/* Case Header */}
 <div className={`flex items-start justify-between mb-4`}>
 <div className={'text-start'}>
 <div className={`flex items-center gap-2 mb-2`}>
 <span className="text-sm font-mono font-bold text-gray-900">
 {disciplinaryCase.caseReference}
 </span>
 <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${ disciplinaryCase.status === 'Approved' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-700 border-gray-200' }`}>
 {disciplinaryCase.status === 'Approved' ? labels.approved : labels.closed}
 </span>
 </div>
 <p className="text-xs text-gray-500">
 {labels.approvalDate}: {formatDate(disciplinaryCase.approvalDate)}
 </p>
 </div>
 </div>

 {/* Case Details */}
 <div className="space-y-3 mb-4">
 {/* Allegation */}
 <div className={'text-start'}>
 <p className="text-xs font-semibold text-gray-600 mb-1">{labels.allegation}:</p>
 <p className="text-sm text-gray-900">{disciplinaryCase.allegationDetails}</p>
 <p className="text-xs text-gray-500 mt-1">
 {labels.allegationDate}: {formatDate(disciplinaryCase.allegationDate)}
 </p>
 </div>

 {/* Final Decision */}
 {disciplinaryCase.finalDecision && (
 <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-start`}>
 <p className="text-xs font-semibold text-yellow-900 mb-1">{labels.finalDecision}:</p>
 <p className="text-sm text-yellow-800">{disciplinaryCase.finalDecision}</p>
 </div>
 )}

 {/* Disciplinary Action (FREE TEXT) */}
 {disciplinaryCase.disciplinaryAction && (
 <div className={`bg-red-50 border border-red-200 rounded-lg p-3 text-start`}>
 <p className="text-xs font-semibold text-red-900 mb-1">{labels.disciplinaryAction}:</p>
 <p className="text-sm text-red-800 font-medium">{disciplinaryCase.disciplinaryAction}</p>
 {disciplinaryCase.effectiveDate && (
 <p className="text-xs text-red-700 mt-2">
 {labels.effectiveDate}: {formatDate(disciplinaryCase.effectiveDate)}
 </p>
 )}
 </div>
 )}

 {/* Approval Info */}
 {disciplinaryCase.approvedBy && (
 <div className={`text-xs text-gray-600 text-start`}>
 <p>
 <span className="font-semibold">{labels.approvedBy}:</span> {disciplinaryCase.approvedBy}
 {disciplinaryCase.approverPosition && ` (${disciplinaryCase.approverPosition})`}
 </p>
 </div>
 )}
 </div>

 {/* Signed Document Status */}
 {signedDoc && (
 <div className={`bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-start`}>
 <div className={`flex items-center gap-2`}>
 <CheckCircle className="w-4 h-4 text-green-600" />
 <span className="text-sm font-semibold text-green-900">{labels.signedDocument}: {signedDoc.fileName}</span>
 </div>
 <p className="text-xs text-green-700 mt-1">
 {labels.uploadedOn}: {formatDate(signedDoc.uploadedDate)}
 </p>
 </div>
 )}

 {/* Action Buttons */}
 <div className={`flex items-center gap-3 flex-wrap`}>
 {/* Generate Official Form */}
 <button
 onClick={() => handleGenerateOfficialForm(disciplinaryCase)}
 className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100`}
 >
 <Printer className="w-4 h-4" />
 <span>{labels.generateForm}</span>
 </button>

 {/* Upload Signed Form */}
 {!signedDoc && (
 <button
 onClick={() => handleUploadSignedForm(disciplinaryCase.id)}
 className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100`}
 >
 <Upload className="w-4 h-4" />
 <span>{labels.uploadSigned}</span>
 </button>
 )}

 {/* Download Signed Form */}
 {signedDoc && (
 <button
 onClick={() => handleDownloadSignedForm(signedDoc)}
 className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50`}
 >
 <Download className="w-4 h-4" />
 <span>{labels.downloadSigned}</span>
 </button>
 )}
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>

 {/* Hidden File Input */}
 <input
 ref={fileInputRef}
 type="file"
 accept="application/pdf"
 onChange={handleFileSelected}
 className="hidden"
 />

 {/* Print Modal */}
 {showPrintModal && selectedCase && (
 <OfficialDisciplinaryFormPrintModal
 disciplinaryCase={selectedCase}
 employee={employee}
 language={language}
 isRTL={isRTL}
 onClose={() => {
 setShowPrintModal(false);
 setSelectedCase(null);
 }}
 />
 )}
 </div>
 );
}

// ============================================================================
// OFFICIAL DISCIPLINARY FORM - PRINT MODAL
// ============================================================================

interface PrintModalProps {
 disciplinaryCase: DisciplinaryCase;
 employee: StaffMember;
 language: string;
 isRTL: boolean;
 onClose: () => void;
}

function OfficialDisciplinaryFormPrintModal({
 disciplinaryCase, 
 employee, 
 language, 
 isRTL, 
 onClose 
}: PrintModalProps) {
 const { t } = useTranslation(); 
 const contentRef = useRef<HTMLDivElement>(null);

 const handlePrint = () => {
 window.print();
 };

 const formatDate = (dateString?: string) => {
 if (!dateString) return '-';
 return new Date(dateString).toLocaleDateString(t.hrEmployeeCards.en, {
 year: 'numeric',
 month: 'long',
 day: 'numeric'
 });
 };

 const labels = {
 title: t.hrEmployeeCards.officialDisciplinaryForm,
 organizationName: t.hrEmployeeCards.humanitarianOrganization,
 confidential: t.hrEmployeeCards.confidentialPersonnelFile,
 
 caseReference: t.hrEmployeeCards.caseReference,
 employeeInfo: t.hrEmployeeCards.employeeInformation,
 staffId: t.hrEmployeeCards.staffId,
 fullName: t.hrEmployeeCards.fullName,
 position: t.hrEmployeeCards.position1,
 department: t.hrEmployeeCards.department,
 
 allegationDetails: t.hrEmployeeCards.allegationDetails,
 allegationDate: t.hrEmployeeCards.allegationDate,
 
 finalDecision: t.hrEmployeeCards.finalDecision,
 disciplinaryAction: t.hrEmployeeCards.disciplinaryActionToBeTaken,
 effectiveDate: t.hrEmployeeCards.effectiveDate,
 
 approvalSection: t.hrEmployeeCards.approval,
 approvedBy: t.hrEmployeeCards.approvedBy,
 approverPosition: t.hrEmployeeCards.position1,
 approvalDate: t.hrEmployeeCards.approvalDate,
 signature: t.hrEmployeeCards.signature,
 
 employeeAcknowledgment: t.hrEmployeeCards.employeeAcknowledgment,
 acknowledgmentText: 'I acknowledge that I have received and reviewed this disciplinary action. I understand the contents and the effective date.',
 employeeSignature: t.hrEmployeeCards.employeeSignature,
 date: t.hrEmployeeCards.date,
 
 generatedOn: t.hrEmployeeCards.generatedOn,
 printButton: t.hrEmployeeCards.printForm,
 closeButton: t.hrEmployeeCards.close
 };

 return (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
 {/* Modal Header */}
 <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
 <h2 className="text-lg font-semibold text-gray-900">{labels.title}</h2>
 <div className="flex items-center gap-2">
 <button
 onClick={handlePrint}
 className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
 >
 <Printer className="w-4 h-4" />
 <span>{labels.printButton}</span>
 </button>
 <button
 onClick={onClose}
 className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
 >
 {labels.closeButton}
 </button>
 </div>
 </div>

 {/* Print Content */}
 <div ref={contentRef} className="p-8 print:p-12" >
 {/* Organization Header */}
 <div className="text-center mb-8 border-b-2 border-gray-300 pb-6">
 <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
 <span className="text-xs text-gray-500">[LOGO]</span>
 </div>
 <h1 className="text-2xl font-bold text-gray-900 mb-2">{labels.organizationName}</h1>
 <h2 className="text-xl font-semibold text-gray-700 mb-2">{labels.title}</h2>
 <p className="text-sm text-red-600 font-medium">{labels.confidential}</p>
 </div>

 {/* Case Reference */}
 <div className="mb-6 bg-gray-100 p-4 rounded">
 <p className="text-sm font-semibold text-gray-700">{labels.caseReference}:</p>
 <p className="text-lg font-mono font-bold text-gray-900">{disciplinaryCase.caseReference}</p>
 </div>

 {/* Employee Information */}
 <div className="mb-6">
 <h3 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-300 pb-2">{labels.employeeInfo}</h3>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <p className="text-sm text-gray-600">{labels.staffId}:</p>
 <p className="text-base font-semibold text-gray-900">{employee.staffId}</p>
 </div>
 <div>
 <p className="text-sm text-gray-600">{labels.fullName}:</p>
 <p className="text-base font-semibold text-gray-900">{employee.fullName}</p>
 </div>
 <div>
 <p className="text-sm text-gray-600">{labels.position}:</p>
 <p className="text-base font-semibold text-gray-900">{employee.position}</p>
 </div>
 <div>
 <p className="text-sm text-gray-600">{labels.department}:</p>
 <p className="text-base font-semibold text-gray-900">{employee.department}</p>
 </div>
 </div>
 </div>

 {/* Allegation Details */}
 <div className="mb-6">
 <h3 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-300 pb-2">{labels.allegationDetails}</h3>
 <p className="text-base text-gray-900 mb-3">{disciplinaryCase.allegationDetails}</p>
 <p className="text-sm text-gray-600">
 <span className="font-semibold">{labels.allegationDate}:</span> {formatDate(disciplinaryCase.allegationDate)}
 </p>
 </div>

 {/* Final Decision */}
 {disciplinaryCase.finalDecision && (
 <div className="mb-6 bg-yellow-50 border-2 border-yellow-300 p-4 rounded">
 <h3 className="text-lg font-bold text-yellow-900 mb-3">{labels.finalDecision}</h3>
 <p className="text-base text-yellow-900">{disciplinaryCase.finalDecision}</p>
 </div>
 )}

 {/* Disciplinary Action (FREE TEXT - Most Important) */}
 {disciplinaryCase.disciplinaryAction && (
 <div className="mb-6 bg-red-50 border-2 border-red-300 p-4 rounded">
 <h3 className="text-lg font-bold text-red-900 mb-3">{labels.disciplinaryAction}</h3>
 <p className="text-base text-red-900 font-medium whitespace-pre-wrap">
 {disciplinaryCase.disciplinaryAction}
 </p>
 {disciplinaryCase.effectiveDate && (
 <p className="text-sm text-red-800 mt-3">
 <span className="font-semibold">{labels.effectiveDate}:</span> {formatDate(disciplinaryCase.effectiveDate)}
 </p>
 )}
 </div>
 )}

 {/* Approval Section */}
 <div className="mb-8">
 <h3 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-300 pb-2">{labels.approvalSection}</h3>
 <div className="grid grid-cols-2 gap-6">
 <div>
 <p className="text-sm text-gray-600 mb-1">{labels.approvedBy}:</p>
 <p className="text-base font-semibold text-gray-900">{disciplinaryCase.approvedBy || '-'}</p>
 </div>
 <div>
 <p className="text-sm text-gray-600 mb-1">{labels.approverPosition}:</p>
 <p className="text-base font-semibold text-gray-900">{disciplinaryCase.approverPosition || '-'}</p>
 </div>
 <div>
 <p className="text-sm text-gray-600 mb-1">{labels.approvalDate}:</p>
 <p className="text-base font-semibold text-gray-900">{formatDate(disciplinaryCase.approvalDate)}</p>
 </div>
 <div>
 <p className="text-sm text-gray-600 mb-1">{labels.signature}:</p>
 <div className="border-b-2 border-gray-400 h-12"></div>
 </div>
 </div>
 </div>

 {/* Employee Acknowledgment Section */}
 <div className="border-2 border-gray-300 p-6 rounded">
 <h3 className="text-lg font-bold text-gray-900 mb-3">{labels.employeeAcknowledgment}</h3>
 <p className="text-sm text-gray-700 mb-6">{labels.acknowledgmentText}</p>
 
 <div className="grid grid-cols-2 gap-6">
 <div>
 <p className="text-sm text-gray-600 mb-1">{labels.employeeSignature}:</p>
 <div className="border-b-2 border-gray-400 h-16 mt-2"></div>
 </div>
 <div>
 <p className="text-sm text-gray-600 mb-1">{labels.date}:</p>
 <div className="border-b-2 border-gray-400 h-16 mt-2"></div>
 </div>
 </div>
 </div>

 {/* Footer */}
 <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
 <p>{labels.generatedOn}: {formatDate(new Date().toISOString())}</p>
 <p className="mt-1">{labels.organizationName} - {labels.confidential}</p>
 </div>
 </div>
 </div>
 </div>
 );
}