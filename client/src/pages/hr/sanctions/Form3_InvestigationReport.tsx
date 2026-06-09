/**
 * ============================================================================
 * FORM 3: INVESTIGATION REPORT
 * ============================================================================
 * 
 * PURPOSE: Record investigation findings
 * 
 * FEATURES:
 * - Investigation summary and findings
 * - Evidence and witnesses
 * - FREE TEXT recommendation (no predefined sanctions)
 * - File uploads (evidence, interviews, documents)
 * - Submit Investigation Report
 * - Printable
 * - Read-only after submission
 * - Bilingual (EN/AR)
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from '@/lib/router-compat';
import { Save, Send, Printer, FileText, Upload } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { InvestigationReport, DisciplinaryCase } from './types';
import { sanctionsService } from './sanctionsService';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export function Form3_InvestigationReport() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const navigate = useNavigate();
 const { caseRef } = useParams<{ caseRef: string }>();

 const [caseData, setCaseData] = useState<DisciplinaryCase | null>(null);
 const [formData, setFormData] = useState<InvestigationReport>({
 caseReferenceNumber: caseRef || '',
 summaryOfInvestigation: '',
 evidenceReviewed: '',
 witnesses: '',
 findings: '',
 conclusion: '',
 recommendation: '',
 evidenceFiles: [],
 interviewRecords: [],
 supportingDocuments: [],
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
 if (existing.form3_report) {
 setFormData(existing.form3_report);
 setIsReadOnly(existing.form3_report.status === 'submitted');
 }
 }
 };

 const handleInputChange = (field: keyof InvestigationReport, value: any) => {
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

 if (!formData.summaryOfInvestigation.trim()) {
 newErrors.summaryOfInvestigation = t.hrSanctions.summaryIsRequired;
 }

 if (!formData.findings.trim()) {
 newErrors.findings = t.hrSanctions.findingsAreRequired;
 }

 if (!formData.conclusion.trim()) {
 newErrors.conclusion = t.hrSanctions.conclusionIsRequired;
 }

 if (!formData.recommendation.trim()) {
 newErrors.recommendation = t.hrSanctions.recommendationIsRequired;
 }

 setErrors(newErrors);
 return Object.keys(newErrors).length === 0;
 };

 const handleSaveAsDraft = () => {
 if (!caseData) return;

 const updated = {
 ...caseData,
 form3_report: { ...formData, status: 'draft' },
 lastUpdatedDate: new Date().toISOString()
 };

 sanctionsService.saveCase(updated);
 sanctionsService.addAuditEntry(caseRef!, 'Saved Form 3', 'Investigation report saved as draft', 'form3', formData.createdBy);
 
 alert(t.hrSanctions.savedSuccessfully);
 };

 const handleSubmit = () => {
 if (!validateForm()) {
 alert(t.hrSanctions.pleaseFillInAllRequiredFields);
 return;
 }

 if (!caseData) return;

 const submitted = {
 ...formData,
 status: 'submitted' as const,
 submittedDate: new Date().toISOString()
 };

 const updated = {
 ...caseData,
 form3_report: submitted,
 currentStatus: 'investigation-completed' as const,
 lastUpdatedDate: new Date().toISOString()
 };

 sanctionsService.saveCase(updated);
 sanctionsService.addAuditEntry(caseRef!, 'Submitted Investigation Report', 'Form 3 submitted', 'form3', formData.createdBy);
 
 alert(t.hrSanctions.investigationReportSubmitted);
 navigate('/organization/hr/sanctions');
 };

 const labels = {
 title: t.hrSanctions.investigationReport,
 subtitle: t.hrSanctions.form3Of6,
 
 caseRef: t.hrSanctions.caseReference,
 employee: t.hrSanctions.employee,
 
 summaryOfInvestigation: t.hrSanctions.summaryOfInvestigation,
 evidenceReviewed: t.hrSanctions.evidenceReviewed,
 witnesses: t.hrSanctions.witnessesIfApplicable,
 findings: t.hrSanctions.findings,
 conclusion: t.hrSanctions.conclusion,
 recommendation: t.hrSanctions.recommendationFreeText,
 
 uploads: t.hrSanctions.supportingDocuments,
 evidenceFiles: t.hrSanctions.evidenceFiles,
 interviewRecords: t.hrSanctions.interviewRecords,
 supportingDocuments: t.hrSanctions.otherSupportingDocuments,
 uploadFile: t.hrSanctions.uploadFile,
 
 saveAsDraft: t.hrSanctions.saveAsDraft,
 submitReport: t.hrSanctions.submitInvestigationReport,
 print: t.hrSanctions.print,
 back: t.hrSanctions.back,
 
 readOnlyNotice: '🔒 This report has been submitted and is now read-only',
 
 recommendationNote: 'Note: This is FREE TEXT - no predefined sanctions. Write your professional recommendation based on findings.',
 
 summaryPlaceholder: t.hrSanctions.provideAComprehensiveSummaryOfThe,
 evidencePlaceholder: t.hrSanctions.listAllEvidenceReviewedDocumentsEmails,
 witnessesPlaceholder: t.hrSanctions.listWitnessesInterviewedAndKeyPoints,
 findingsPlaceholder: t.hrSanctions.documentYourInvestigationFindings,
 conclusionPlaceholder: t.hrSanctions.stateYourConclusionBasedOnThe,
 recommendationPlaceholder: t.hrSanctions.provideYourRecommendationForDisciplinaryAction
 };

 return (
 <div className="min-h-screen bg-gray-50 print:bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="bg-white border-b border-gray-200 print:hidden">
 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
 <BackButton onClick={() => navigate('/organization/hr/sanctions')} label={labels.back} />

 <div className={`flex items-center justify-between`}>
 <div className={'text-start'}>
 <div className={`flex items-center gap-3`}>
 <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
 <FileText className="w-6 h-6 text-green-600" />
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
 {t.hrSanctions.investigationReport1}
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

 {/* Summary */}
 <div className="mb-6">
 <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-end' : ''}`}>
 {labels.summaryOfInvestigation} <span className="text-red-600">*</span>
 </label>
 <textarea
 value={formData.summaryOfInvestigation}
 onChange={(e) => handleInputChange('summaryOfInvestigation', e.target.value)}
 disabled={isReadOnly}
 placeholder={labels.summaryPlaceholder}
 rows={6}
 className={`w-full px-3 py-2 border rounded-lg ${ errors.summaryOfInvestigation ? 'border-red-500' : 'border-gray-300' } ${isReadOnly ? 'bg-gray-100' : ''} ${isRTL ? 'text-right' : ''}`}
 />
 {errors.summaryOfInvestigation && (
 <p className="mt-1 text-sm text-red-600">{errors.summaryOfInvestigation}</p>
 )}
 </div>

 {/* Evidence Reviewed */}
 <div className="mb-6">
 <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-end' : ''}`}>
 {labels.evidenceReviewed}
 </label>
 <textarea
 value={formData.evidenceReviewed}
 onChange={(e) => handleInputChange('evidenceReviewed', e.target.value)}
 disabled={isReadOnly}
 placeholder={labels.evidencePlaceholder}
 rows={4}
 className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${isReadOnly ? 'bg-gray-100' : ''} ${isRTL ? 'text-end' : ''}`}
 />
 </div>

 {/* Witnesses */}
 <div className="mb-6">
 <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-end' : ''}`}>
 {labels.witnesses}
 </label>
 <textarea
 value={formData.witnesses}
 onChange={(e) => handleInputChange('witnesses', e.target.value)}
 disabled={isReadOnly}
 placeholder={labels.witnessesPlaceholder}
 rows={4}
 className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${isReadOnly ? 'bg-gray-100' : ''} ${isRTL ? 'text-end' : ''}`}
 />
 </div>

 {/* Findings */}
 <div className="mb-6">
 <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-end' : ''}`}>
 {labels.findings} <span className="text-red-600">*</span>
 </label>
 <textarea
 value={formData.findings}
 onChange={(e) => handleInputChange('findings', e.target.value)}
 disabled={isReadOnly}
 placeholder={labels.findingsPlaceholder}
 rows={6}
 className={`w-full px-3 py-2 border rounded-lg ${ errors.findings ? 'border-red-500' : 'border-gray-300' } ${isReadOnly ? 'bg-gray-100' : ''} ${isRTL ? 'text-right' : ''}`}
 />
 {errors.findings && (
 <p className="mt-1 text-sm text-red-600">{errors.findings}</p>
 )}
 </div>

 {/* Conclusion */}
 <div className="mb-6">
 <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-end' : ''}`}>
 {labels.conclusion} <span className="text-red-600">*</span>
 </label>
 <textarea
 value={formData.conclusion}
 onChange={(e) => handleInputChange('conclusion', e.target.value)}
 disabled={isReadOnly}
 placeholder={labels.conclusionPlaceholder}
 rows={5}
 className={`w-full px-3 py-2 border rounded-lg ${ errors.conclusion ? 'border-red-500' : 'border-gray-300' } ${isReadOnly ? 'bg-gray-100' : ''} ${isRTL ? 'text-right' : ''}`}
 />
 {errors.conclusion && (
 <p className="mt-1 text-sm text-red-600">{errors.conclusion}</p>
 )}
 </div>

 {/* Recommendation (FREE TEXT) */}
 <div className="mb-6">
 <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-end' : ''}`}>
 {labels.recommendation} <span className="text-red-600">*</span>
 </label>
 <div className="mb-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
 <p className="text-xs text-amber-800">{labels.recommendationNote}</p>
 </div>
 <textarea
 value={formData.recommendation}
 onChange={(e) => handleInputChange('recommendation', e.target.value)}
 disabled={isReadOnly}
 placeholder={labels.recommendationPlaceholder}
 rows={6}
 className={`w-full px-3 py-2 border rounded-lg ${ errors.recommendation ? 'border-red-500' : 'border-gray-300' } ${isReadOnly ? 'bg-gray-100' : ''} ${isRTL ? 'text-right' : ''}`}
 />
 {errors.recommendation && (
 <p className="mt-1 text-sm text-red-600">{errors.recommendation}</p>
 )}
 </div>

 {/* Uploads Section */}
 <div className="mb-6 p-4 bg-gray-50 rounded-lg">
 <h3 className={`text-sm font-medium text-gray-900 mb-3 ${isRTL ? 'text-end' : ''}`}>
 {labels.uploads}
 </h3>
 <div className="space-y-3 text-sm text-gray-600">
 <div className={`flex items-center gap-2`}>
 <Upload className="w-4 h-4" />
 <span>{labels.evidenceFiles} ({formData.evidenceFiles.length} files)</span>
 </div>
 <div className={`flex items-center gap-2`}>
 <Upload className="w-4 h-4" />
 <span>{labels.interviewRecords} ({formData.interviewRecords.length} files)</span>
 </div>
 <div className={`flex items-center gap-2`}>
 <Upload className="w-4 h-4" />
 <span>{labels.supportingDocuments} ({formData.supportingDocuments.length} files)</span>
 </div>
 <p className="text-xs text-gray-500 mt-2">
 {'File upload functionality available (stored in browser for prototype)'}
 </p>
 </div>
 </div>

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
 className={`flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700`}
 >
 <Send className="w-5 h-5" />
 <span className="font-medium">{labels.submitReport}</span>
 </button>
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 );
}
