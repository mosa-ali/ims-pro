/**
 * ============================================================================
 * FORM 1: DISCIPLINARY CASE INITIATION
 * ============================================================================
 * 
 * PURPOSE: Register a disciplinary allegation
 * 
 * FEATURES:
 * - Auto-filled employee data (read-only)
 * - Auto-generated case reference number
 * - Save as Draft / Submit for Investigation
 * - Printable with organization logo
 * - Read-only after submission
 * - Bilingual (EN/AR)
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from '@/lib/router-compat';
import { Save, Send, Printer, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DisciplinaryCaseInitiation, DisciplinaryCase, RiskLevel } from './types';
import { sanctionsService } from './sanctionsService';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

interface StaffMember {
 staffId: string;
 firstName: string;
 lastName: string;
 position: string;
 department: string;
}

export function Form1_CaseInitiation() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const navigate = useNavigate();
 const { staffId, caseRef } = useParams<{ staffId?: string; caseRef?: string }>();

 const [staff, setStaff] = useState<StaffMember | null>(null);
 const [formData, setFormData] = useState<DisciplinaryCaseInitiation>({
 staffId: '',
 fullName: '',
 position: '',
 department: '',
 caseReferenceNumber: '',
 caseTitle: '',
 allegationSummary: '',
 dateOfAllegation: new Date().toISOString().split('T')[0],
 reportedBy: '',
 initialRiskLevel: 'Medium',
 immediateActionTaken: '',
 createdBy: 'Current User', // TODO: Get from auth context
 createdDate: new Date().toISOString(),
 status: 'draft'
 });

 const [isReadOnly, setIsReadOnly] = useState(false);
 const [errors, setErrors] = useState<Record<string, string>>({});

 useEffect(() => {
 if (caseRef) {
 loadExistingCase();
 } else if (staffId) {
 loadStaffData();
 }
 }, [staffId, caseRef]);

 const loadStaffData = () => {
 try {
 const allStaff = JSON.parse(localStorage.getItem('hr_staff_members') || '[]');
 const member = allStaff.find((s: any) => s.staffId === staffId);
 
 if (member) {
 setStaff(member);
 const caseRefNumber = sanctionsService.generateCaseReference();
 setFormData(prev => ({
 ...prev,
 staffId: member.staffId,
 fullName: `${member.firstName} ${member.lastName}`,
 position: member.position,
 department: member.department,
 caseReferenceNumber: caseRefNumber
 }));
 }
 } catch (error) {
 console.error('Error loading staff data:', error);
 }
 };

 const loadExistingCase = () => {
 if (!caseRef) return;
 
 const existingCase = sanctionsService.getCaseByReference(caseRef);
 if (existingCase && existingCase.form1_initiation) {
 setFormData(existingCase.form1_initiation);
 setIsReadOnly(existingCase.form1_initiation.status === 'submitted');
 }
 };

 const handleInputChange = (field: keyof DisciplinaryCaseInitiation, value: any) => {
 if (isReadOnly) return;
 
 setFormData(prev => ({
 ...prev,
 [field]: value
 }));
 
 // Clear error for this field
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

 if (!formData.caseTitle.trim()) {
 newErrors.caseTitle = t.hrSanctions.caseTitleIsRequired;
 }

 if (!formData.allegationSummary.trim()) {
 newErrors.allegationSummary = t.hrSanctions.allegationSummaryIsRequired;
 }

 if (!formData.dateOfAllegation) {
 newErrors.dateOfAllegation = t.hrSanctions.dateIsRequired;
 }

 if (!formData.reportedBy.trim()) {
 newErrors.reportedBy = t.hrSanctions.reporterNameIsRequired;
 }

 setErrors(newErrors);
 return Object.keys(newErrors).length === 0;
 };

 const handleSaveAsDraft = () => {
 const caseData: DisciplinaryCase = {
 caseReferenceNumber: formData.caseReferenceNumber,
 staffId: formData.staffId,
 fullName: formData.fullName,
 position: formData.position,
 department: formData.department,
 currentStatus: 'draft',
 createdDate: formData.createdDate,
 lastUpdatedDate: new Date().toISOString(),
 form1_initiation: { ...formData, status: 'draft' },
 auditTrail: []
 };

 sanctionsService.saveCase(caseData);
 sanctionsService.addAuditEntry(
 formData.caseReferenceNumber,
 'Saved as Draft',
 'Form 1 saved as draft',
 'form1',
 formData.createdBy
 );

 alert(t.hrSanctions.caseSavedAsDraftSuccessfully);
 };

 const handleSubmit = () => {
 if (!validateForm()) {
 alert(t.hrSanctions.pleaseFillInAllRequiredFields);
 return;
 }

 const submittedForm = {
 ...formData,
 status: 'submitted' as const,
 submittedDate: new Date().toISOString()
 };

 const caseData: DisciplinaryCase = {
 caseReferenceNumber: formData.caseReferenceNumber,
 staffId: formData.staffId,
 fullName: formData.fullName,
 position: formData.position,
 department: formData.department,
 currentStatus: 'investigation-pending',
 createdDate: formData.createdDate,
 lastUpdatedDate: new Date().toISOString(),
 form1_initiation: submittedForm,
 auditTrail: []
 };

 sanctionsService.saveCase(caseData);
 sanctionsService.addAuditEntry(
 formData.caseReferenceNumber,
 'Submitted for Investigation',
 'Form 1 submitted - case initiated',
 'form1',
 formData.createdBy
 );

 alert('Case submitted for investigation successfully!'
 );
 
 navigate('/organization/hr/sanctions');
 };

 const handlePrint = () => {
 window.print();
 };

 const labels = {
 title: t.hrSanctions.disciplinaryCaseInitiation,
 subtitle: t.hrSanctions.form1Of6,
 
 // Sections
 employeeInfo: t.hrSanctions.employeeInformation,
 caseDetails: t.hrSanctions.caseDetails,
 
 // Fields
 staffId: t.hrSanctions.staffId,
 fullName: t.hrSanctions.fullName,
 position: t.hrSanctions.position,
 department: t.hrSanctions.department,
 caseRef: t.hrSanctions.caseReferenceNumber,
 caseTitle: t.hrSanctions.caseTitle,
 allegationSummary: t.hrSanctions.allegationSummary,
 dateOfAllegation: t.hrSanctions.dateOfAllegation,
 reportedBy: t.hrSanctions.reportedBy,
 riskLevel: t.hrSanctions.initialRiskLevel,
 immediateAction: t.hrSanctions.immediateActionTakenIfAny,
 
 // Risk levels
 low: t.hrSanctions.low,
 medium: t.hrSanctions.medium,
 high: t.hrSanctions.high,
 
 // Actions
 saveAsDraft: t.hrSanctions.saveAsDraft,
 submitForInvestigation: t.hrSanctions.submitForInvestigation,
 print: t.hrSanctions.print,
 back: t.hrSanctions.backToCases,
 
 // Placeholders
 caseTitlePlaceholder: t.hrSanctions.egAllegedMisconductInProcurementProcess,
 allegationPlaceholder: t.hrSanctions.provideADetailedSummaryOfThe,
 reportedByPlaceholder: t.hrSanctions.nameOfPersonReporting,
 immediateActionPlaceholder: t.hrSanctions.describeAnyImmediateActionsTaken,
 
 // Status
 readOnlyNotice: '🔒 ' + t.hr.formSubmittedReadOnly,
 
 // Metadata
 createdBy: t.hrSanctions.createdBy,
 createdDate: t.hrSanctions.createdDate,
 submittedDate: t.hrSanctions.submittedDate,
 
 // Validation
 required: t.hrSanctions.required
 };

 return (
 <div className="min-h-screen bg-gray-50 print:bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header - Hidden on print */}
 <div className="bg-white border-b border-gray-200 print:hidden">
 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
 <BackButton onClick={() => navigate('/organization/hr/sanctions')} label={labels.back} />

 <div className={`flex items-center justify-between`}>
 <div className={'text-start'}>
 <div className={`flex items-center gap-3`}>
 <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
 <AlertTriangle className="w-6 h-6 text-red-600" />
 </div>
 <div>
 <h1 className="text-2xl font-bold text-gray-900">{labels.title}</h1>
 <p className="text-sm text-gray-600">{labels.subtitle}</p>
 </div>
 </div>
 </div>

 <button
 onClick={handlePrint}
 className={`flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50`}
 >
 <Printer className="w-4 h-4" />
 <span className="text-sm font-medium">{labels.print}</span>
 </button>
 </div>
 </div>
 </div>

 {/* Form Content */}
 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 print:p-8">
 {/* Print Header */}
 <div className="hidden print:block mb-8 text-center border-b-2 border-gray-300 pb-6">
 <h1 className="text-2xl font-bold text-gray-900 mb-1">
 {t.hrSanctions.disciplinaryCaseInitiationForm}
 </h1>
 <p className="text-sm text-gray-600">{labels.subtitle}</p>
 <p className="text-xs text-gray-500 mt-2">
 {t.hrSanctions.organizationNameLogo}
 </p>
 </div>

 {/* Read-only notice */}
 {isReadOnly && (
 <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg print:hidden">
 <p className="text-sm text-yellow-800 font-medium">{labels.readOnlyNotice}</p>
 </div>
 )}

 {/* Form Card */}
 <div className="bg-white rounded-lg border border-gray-200 print:border-0 print:shadow-none">
 <div className="p-6">
 {/* SECTION 1: Employee Information (Auto-filled, Read-only) */}
 <div className="mb-8">
 <h2 className={`text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200 ${isRTL ? 'text-end' : ''}`}>
 {labels.employeeInfo}
 </h2>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-end' : ''}`}>
 {labels.staffId}
 </label>
 <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 font-mono">
 {formData.staffId}
 </div>
 </div>

 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-end' : ''}`}>
 {labels.fullName}
 </label>
 <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 font-medium">
 {formData.fullName}
 </div>
 </div>

 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-end' : ''}`}>
 {labels.position}
 </label>
 <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-700">
 {formData.position}
 </div>
 </div>

 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-end' : ''}`}>
 {labels.department}
 </label>
 <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-700">
 {formData.department}
 </div>
 </div>
 </div>
 </div>

 {/* SECTION 2: Case Details */}
 <div className="mb-8">
 <h2 className={`text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200 ${isRTL ? 'text-end' : ''}`}>
 {labels.caseDetails}
 </h2>

 {/* Case Reference Number (Auto-generated, Read-only) */}
 <div className="mb-6">
 <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-end' : ''}`}>
 {labels.caseRef}
 </label>
 <div className="px-3 py-2 bg-blue-50 border-2 border-blue-300 rounded-lg text-blue-900 font-mono font-bold text-lg">
 {formData.caseReferenceNumber}
 </div>
 </div>

 {/* Case Title */}
 <div className="mb-6">
 <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-end' : ''}`}>
 {labels.caseTitle} <span className="text-red-600">*</span>
 </label>
 <input
 type="text"
 value={formData.caseTitle}
 onChange={(e) => handleInputChange('caseTitle', e.target.value)}
 disabled={isReadOnly}
 placeholder={labels.caseTitlePlaceholder}
 className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 ${ errors.caseTitle ? 'border-red-500' : 'border-gray-300' } ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''} ${isRTL ? 'text-right' : ''}`}
 />
 {errors.caseTitle && (
 <p className="mt-1 text-sm text-red-600">{errors.caseTitle}</p>
 )}
 </div>

 {/* Allegation Summary */}
 <div className="mb-6">
 <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-end' : ''}`}>
 {labels.allegationSummary} <span className="text-red-600">*</span>
 </label>
 <textarea
 value={formData.allegationSummary}
 onChange={(e) => handleInputChange('allegationSummary', e.target.value)}
 disabled={isReadOnly}
 placeholder={labels.allegationPlaceholder}
 rows={6}
 className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 ${ errors.allegationSummary ? 'border-red-500' : 'border-gray-300' } ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''} ${isRTL ? 'text-right' : ''}`}
 />
 {errors.allegationSummary && (
 <p className="mt-1 text-sm text-red-600">{errors.allegationSummary}</p>
 )}
 </div>

 {/* Date of Allegation */}
 <div className="mb-6">
 <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-end' : ''}`}>
 {labels.dateOfAllegation} <span className="text-red-600">*</span>
 </label>
 <input
 type="date"
 value={formData.dateOfAllegation}
 onChange={(e) => handleInputChange('dateOfAllegation', e.target.value)}
 disabled={isReadOnly}
 className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 ${ errors.dateOfAllegation ? 'border-red-500' : 'border-gray-300' } ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
 />
 {errors.dateOfAllegation && (
 <p className="mt-1 text-sm text-red-600">{errors.dateOfAllegation}</p>
 )}
 </div>

 {/* Reported By */}
 <div className="mb-6">
 <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-end' : ''}`}>
 {labels.reportedBy} <span className="text-red-600">*</span>
 </label>
 <input
 type="text"
 value={formData.reportedBy}
 onChange={(e) => handleInputChange('reportedBy', e.target.value)}
 disabled={isReadOnly}
 placeholder={labels.reportedByPlaceholder}
 className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 ${ errors.reportedBy ? 'border-red-500' : 'border-gray-300' } ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''} ${isRTL ? 'text-right' : ''}`}
 />
 {errors.reportedBy && (
 <p className="mt-1 text-sm text-red-600">{errors.reportedBy}</p>
 )}
 </div>

 {/* Initial Risk Level */}
 <div className="mb-6">
 <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-end' : ''}`}>
 {labels.riskLevel} <span className="text-red-600">*</span>
 </label>
 <select
 value={formData.initialRiskLevel}
 onChange={(e) => handleInputChange('initialRiskLevel', e.target.value as RiskLevel)}
 disabled={isReadOnly}
 className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 ${ isReadOnly ? 'bg-gray-100 cursor-not-allowed' : '' }`}
 >
 <option value="Low">{labels.low}</option>
 <option value="Medium">{labels.medium}</option>
 <option value="High">{labels.high}</option>
 </select>
 </div>

 {/* Immediate Action Taken */}
 <div className="mb-6">
 <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-end' : ''}`}>
 {labels.immediateAction}
 </label>
 <textarea
 value={formData.immediateActionTaken}
 onChange={(e) => handleInputChange('immediateActionTaken', e.target.value)}
 disabled={isReadOnly}
 placeholder={labels.immediateActionPlaceholder}
 rows={4}
 className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 ${ isReadOnly ? 'bg-gray-100 cursor-not-allowed' : '' } ${isRTL ? 'text-right' : ''}`}
 />
 </div>
 </div>

 {/* Metadata (Print only) */}
 <div className="hidden print:block mt-8 pt-6 border-t border-gray-200">
 <div className="grid grid-cols-2 gap-4 text-sm">
 <div>
 <span className="font-medium">{labels.createdBy}:</span> {formData.createdBy}
 </div>
 <div>
 <span className="font-medium">{labels.createdDate}:</span> {new Date(formData.createdDate).toLocaleDateString()}
 </div>
 {formData.submittedDate && (
 <div className="col-span-2">
 <span className="font-medium">{labels.submittedDate}:</span> {new Date(formData.submittedDate).toLocaleDateString()}
 </div>
 )}
 </div>
 </div>

 {/* Actions (Not visible on print) */}
 {!isReadOnly && (
 <div className={`flex gap-4 mt-8 pt-6 border-t border-gray-200 print:hidden`}>
 <button
 onClick={handleSaveAsDraft}
 className={`flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50`}
 >
 <Save className="w-5 h-5" />
 <span className="font-medium">{labels.saveAsDraft}</span>
 </button>

 <button
 onClick={handleSubmit}
 className={`flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700`}
 >
 <Send className="w-5 h-5" />
 <span className="font-medium">{labels.submitForInvestigation}</span>
 </button>
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 );
}
