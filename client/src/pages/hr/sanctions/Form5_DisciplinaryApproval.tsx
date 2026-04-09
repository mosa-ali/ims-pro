/**
 * ============================================================================
 * FORM 5: DISCIPLINARY APPROVAL
 * ============================================================================
 * 
 * PURPOSE: Formal authorization
 * 
 * FEATURES:
 * - Approve / Reject decision
 * - Approval notes
 * - Approve & Close Case OR Reject & Return
 * - Triggers Form 6 auto-generation on approval
 * - Printable
 * - Locked permanently after approval
 * - Bilingual (EN/AR)
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from '@/lib/router-compat';
import { CheckCircle, XCircle, Printer, Shield } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DisciplinaryApproval, DisciplinaryCase, FinalDisciplinaryRecord, ApprovalDecision } from './types';
import { sanctionsService } from './sanctionsService';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export function Form5_DisciplinaryApproval() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const navigate = useNavigate();
 const { caseRef } = useParams<{ caseRef: string }>();

 const [caseData, setCaseData] = useState<DisciplinaryCase | null>(null);
 const [formData, setFormData] = useState<DisciplinaryApproval>({
 caseReferenceNumber: caseRef || '',
 reviewedBy: '',
 approvalDecision: 'Approve',
 approvalDate: new Date().toISOString().split('T')[0],
 approvalNotes: '',
 createdBy: 'Current User',
 createdDate: new Date().toISOString(),
 status: 'draft'
 });

 const [isReadOnly, setIsReadOnly] = useState(false);
 const [errors, setErrors] = useState<Record<string, string>>({});

 useEffect(() => {
 if (caseRef) {
 loadCase();
 }
 }, [caseRef]);

 const loadCase = () => {
 const existing = sanctionsService.getCaseByReference(caseRef!);
 if (existing) {
 setCaseData(existing);
 if (existing.form5_approval) {
 setFormData(existing.form5_approval);
 setIsReadOnly(existing.form5_approval.status !== 'draft');
 }
 }
 };

 const handleInputChange = (field: keyof DisciplinaryApproval, value: any) => {
 if (isReadOnly) return;
 
 setFormData(prev => ({
 ...prev,
 [field]: value
 }));
 
 if (errors[field]) {
 setErrors(prev => {
 const newErrors = { ...prev };
 delete newErrors[field];
 return newErrors;
 });
 }
 };

 const validateForm = (): boolean => {
 const newErrors: Record<string, string> = {};

 if (!formData.reviewedBy.trim()) {
 newErrors.reviewedBy = t.hrSanctions.reviewerNameIsRequired;
 }

 if (!formData.approvalDate) {
 newErrors.approvalDate = t.hrSanctions.approvalDateIsRequired;
 }

 if (!formData.approvalNotes.trim()) {
 newErrors.approvalNotes = t.hrSanctions.approvalNotesAreRequired;
 }

 setErrors(newErrors);
 return Object.keys(newErrors).length === 0;
 };

 const generateForm6 = (): FinalDisciplinaryRecord => {
 if (!caseData || !caseData.form4_decision) {
 throw new Error('Form 4 data missing');
 }

 const form6: FinalDisciplinaryRecord = {
 caseReferenceNumber: caseData.caseReferenceNumber,
 staffId: caseData.staffId,
 fullName: caseData.fullName,
 position: caseData.position,
 department: caseData.department,
 finalActionTaken: caseData.form4_decision.finalDisciplinaryAction,
 effectiveDate: caseData.form4_decision.effectiveDate,
 approvalAuthority: formData.reviewedBy,
 approvalDate: formData.approvalDate,
 payrollImpact: caseData.form4_decision.payrollImpact,
 statusChange: false, // TODO: Determine if termination
 generatedDate: new Date().toISOString(),
 generatedBy: 'System (Auto-generated)'
 };

 return form6;
 };

 const handleApprove = () => {
 if (!validateForm()) {
 alert(t.hrSanctions.pleaseFillInAllRequiredFields);
 return;
 }

 if (!caseData) return;

 // Generate Form 6 (Final Record)
 const form6 = generateForm6();

 const approved = {
 ...formData,
 approvalDecision: 'Approve' as ApprovalDecision,
 status: 'approved' as const
 };

 const updated = {
 ...caseData,
 form5_approval: approved,
 form6_final: form6,
 currentStatus: 'approved-closed' as const,
 lastUpdatedDate: new Date().toISOString()
 };

 sanctionsService.saveCase(updated);
 sanctionsService.addAuditEntry(caseRef!, 'Case Approved & Closed', 'Form 5 approved - Form 6 auto-generated', 'form5', formData.createdBy);
 
 alert('✅ Case approved and closed! Final record (Form 6) has been auto-generated.'
 );
 
 navigate('/organization/hr/sanctions');
 };

 const handleReject = () => {
 if (!validateForm()) {
 alert(t.hrSanctions.pleaseFillInAllRequiredFields);
 return;
 }

 if (!caseData) return;

 const rejected = {
 ...formData,
 approvalDecision: 'Reject' as ApprovalDecision,
 status: 'rejected' as const
 };

 const updated = {
 ...caseData,
 form5_approval: rejected,
 currentStatus: 'rejected' as const,
 lastUpdatedDate: new Date().toISOString()
 };

 sanctionsService.saveCase(updated);
 sanctionsService.addAuditEntry(caseRef!, 'Decision Rejected', 'Form 5 rejected - returned for revision', 'form5', formData.createdBy);
 
 alert('Decision rejected and returned for revision.'
 );
 
 navigate('/organization/hr/sanctions');
 };

 const labels = {
 title: t.hrSanctions.disciplinaryApproval,
 subtitle: t.hrSanctions.form5Of6,
 
 caseRef: t.hrSanctions.caseReference,
 employee: t.hrSanctions.employee,
 proposedAction: t.hrSanctions.proposedAction,
 
 reviewedBy: t.hrSanctions.reviewedBy,
 approvalDecision: t.hrSanctions.approvalDecision,
 approvalDate: t.hrSanctions.approvalDate,
 approvalNotes: t.hrSanctions.approvalNotes,
 
 approve: t.hrSanctions.approve,
 reject: t.hrSanctions.reject,
 
 approveAndClose: t.hrSanctions.approveCloseCase,
 rejectAndReturn: t.hrSanctions.rejectReturn,
 print: t.hrSanctions.print,
 back: t.hrSanctions.back,
 
 readOnlyNotice: '🔒 ' + t.hr.approvalFinalizedLocked,
 
 approvalNote: '⚠️ Approval will auto-generate Form 6 (Final Disciplinary Record) and close the case permanently.',
 
 rejectionNote: '⚠️ Rejection will return the case to Form 4 for revision.',
 
 notesPlaceholder: t.hrSanctions.provideApprovalOrRejectionNotes
 };

 return (
 <div className="min-h-screen bg-gray-50 print:bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="bg-white border-b border-gray-200 print:hidden">
 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
 <BackButton onClick={() => navigate('/organization/hr/sanctions')} label={labels.back} />

 <div className={`flex items-center justify-between`}>
 <div className={'text-start'}>
 <div className={`flex items-center gap-3`}>
 <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
 <Shield className="w-6 h-6 text-indigo-600" />
 </div>
 <div>
 <h1 className="text-2xl font-bold text-gray-900">{labels.title}</h1>
 <p className="text-sm text-gray-600">{labels.subtitle}</p>
 </div>
 </div>
 </div>

 <button
 onClick={() => window.print()}
 className={`flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50`}
 >
 <Printer className="w-4 h-4" />
 <span className="text-sm font-medium">{labels.print}</span>
 </button>
 </div>
 </div>
 </div>

 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 print:p-8">
 <div className="hidden print:block mb-8 text-center border-b-2 border-gray-300 pb-6">
 <h1 className="text-2xl font-bold text-gray-900 mb-1">
 {t.hrSanctions.disciplinaryApprovalForm}
 </h1>
 <p className="text-sm text-gray-600">{labels.subtitle}</p>
 <p className="text-xs text-gray-500 mt-2">
 {t.hrSanctions.organizationNameLogo}
 </p>
 </div>

 {isReadOnly && (
 <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg print:hidden">
 <p className="text-sm text-yellow-800 font-medium">{labels.readOnlyNotice}</p>
 </div>
 )}

 <div className="bg-white rounded-lg border border-gray-200 print:border-0">
 <div className="p-6">
 {/* Case Info */}
 <div className="mb-6 p-4 bg-blue-50 rounded-lg">
 <div className="grid grid-cols-2 gap-4 text-sm">
 <div>
 <span className="font-medium">{labels.caseRef}:</span> {caseData?.caseReferenceNumber}
 </div>
 <div>
 <span className="font-medium">{labels.employee}:</span> {caseData?.fullName}
 </div>
 </div>
 </div>

 {/* Proposed Action (from Form 4) */}
 {caseData?.form4_decision && (
 <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
 <h3 className={`text-sm font-semibold text-purple-900 mb-2 ${isRTL ? 'text-end' : ''}`}>
 {labels.proposedAction}
 </h3>
 <p className={`text-sm text-purple-800 ${isRTL ? 'text-end' : ''}`}>
 {caseData.form4_decision.finalDisciplinaryAction}
 </p>
 </div>
 )}

 {/* Reviewed By */}
 <div className="mb-6">
 <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-end' : ''}`}>
 {labels.reviewedBy} <span className="text-red-600">*</span>
 </label>
 <input
 type="text"
 value={formData.reviewedBy}
 onChange={(e) => handleInputChange('reviewedBy', e.target.value)}
 disabled={isReadOnly}
 className={`w-full px-3 py-2 border rounded-lg ${ errors.reviewedBy ? 'border-red-500' : 'border-gray-300' } ${isReadOnly ? 'bg-gray-100' : ''} ${isRTL ? 'text-right' : ''}`}
 />
 {errors.reviewedBy && (
 <p className="mt-1 text-sm text-red-600">{errors.reviewedBy}</p>
 )}
 </div>

 {/* Approval Decision */}
 <div className="mb-6">
 <label className={`block text-sm font-medium text-gray-700 mb-3 ${isRTL ? 'text-end' : ''}`}>
 {labels.approvalDecision} <span className="text-red-600">*</span>
 </label>
 
 <div className={`flex gap-6`}>
 <label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer ${ formData.approvalDecision === 'Approve' ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-white' }`}>
 <input
 type="radio"
 checked={formData.approvalDecision === 'Approve'}
 onChange={() => handleInputChange('approvalDecision', 'Approve')}
 disabled={isReadOnly}
 className="w-5 h-5"
 />
 <div className={isRTL ? 'text-end' : ''}>
 <div className="flex items-center gap-2">
 <CheckCircle className="w-5 h-5 text-green-600" />
 <span className="font-medium text-green-900">{labels.approve}</span>
 </div>
 </div>
 </label>
 
 <label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer ${ formData.approvalDecision === 'Reject' ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white' }`}>
 <input
 type="radio"
 checked={formData.approvalDecision === 'Reject'}
 onChange={() => handleInputChange('approvalDecision', 'Reject')}
 disabled={isReadOnly}
 className="w-5 h-5"
 />
 <div className={isRTL ? 'text-end' : ''}>
 <div className="flex items-center gap-2">
 <XCircle className="w-5 h-5 text-red-600" />
 <span className="font-medium text-red-900">{labels.reject}</span>
 </div>
 </div>
 </label>
 </div>

 {/* Decision-specific warnings */}
 <div className="mt-4">
 {formData.approvalDecision === 'Approve' && (
 <div className="p-3 bg-green-50 border border-green-200 rounded">
 <p className="text-xs text-green-800">{labels.approvalNote}</p>
 </div>
 )}
 {formData.approvalDecision === 'Reject' && (
 <div className="p-3 bg-red-50 border border-red-200 rounded">
 <p className="text-xs text-red-800">{labels.rejectionNote}</p>
 </div>
 )}
 </div>
 </div>

 {/* Approval Date */}
 <div className="mb-6">
 <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-end' : ''}`}>
 {labels.approvalDate} <span className="text-red-600">*</span>
 </label>
 <input
 type="date"
 value={formData.approvalDate}
 onChange={(e) => handleInputChange('approvalDate', e.target.value)}
 disabled={isReadOnly}
 className={`w-full px-3 py-2 border rounded-lg ${ errors.approvalDate ? 'border-red-500' : 'border-gray-300' } ${isReadOnly ? 'bg-gray-100' : ''}`}
 />
 {errors.approvalDate && (
 <p className="mt-1 text-sm text-red-600">{errors.approvalDate}</p>
 )}
 </div>

 {/* Approval Notes */}
 <div className="mb-6">
 <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-end' : ''}`}>
 {labels.approvalNotes} <span className="text-red-600">*</span>
 </label>
 <textarea
 value={formData.approvalNotes}
 onChange={(e) => handleInputChange('approvalNotes', e.target.value)}
 disabled={isReadOnly}
 placeholder={labels.notesPlaceholder}
 rows={6}
 className={`w-full px-3 py-2 border rounded-lg ${ errors.approvalNotes ? 'border-red-500' : 'border-gray-300' } ${isReadOnly ? 'bg-gray-100' : ''} ${isRTL ? 'text-right' : ''}`}
 />
 {errors.approvalNotes && (
 <p className="mt-1 text-sm text-red-600">{errors.approvalNotes}</p>
 )}
 </div>

 {!isReadOnly && (
 <div className={`flex gap-4 mt-8 pt-6 border-t border-gray-200 print:hidden`}>
 <button
 onClick={handleReject}
 className={`flex items-center gap-2 px-6 py-3 border-2 border-red-500 text-red-700 bg-red-50 rounded-lg hover:bg-red-100`}
 >
 <XCircle className="w-5 h-5" />
 <span className="font-medium">{labels.rejectAndReturn}</span>
 </button>

 <button
 onClick={handleApprove}
 className={`flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700`}
 >
 <CheckCircle className="w-5 h-5" />
 <span className="font-medium">{labels.approveAndClose}</span>
 </button>
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 );
}
