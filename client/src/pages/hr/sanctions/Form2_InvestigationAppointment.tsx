/**
 * ============================================================================
 * FORM 2: INVESTIGATION APPOINTMENT
 * ============================================================================
 * 
 * PURPOSE: Officially assign investigation responsibility
 * 
 * FEATURES:
 * - Investigation team assignment
 * - Dates and scope
 * - Policy reference
 * - Confirm Investigation Team
 * - Printable with organization logo
 * - Locked after confirmation
 * - Bilingual (EN/AR)
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from '@/lib/router-compat';
import { Save, CheckCircle, Printer, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { InvestigationAppointment, DisciplinaryCase } from './types';
import { sanctionsService } from './sanctionsService';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export function Form2_InvestigationAppointment() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const navigate = useNavigate();
 const { caseRef } = useParams<{ caseRef: string }>();

 const [caseData, setCaseData] = useState<DisciplinaryCase | null>(null);
 const [formData, setFormData] = useState<InvestigationAppointment>({
 caseReferenceNumber: caseRef || '',
 investigationStartDate: new Date().toISOString().split('T')[0],
 expectedEndDate: '',
 investigationLead: '',
 investigationTeamMembers: '',
 scopeOfInvestigation: '',
 applicablePolicyReference: '',
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
 if (existing.form2_investigation) {
 setFormData(existing.form2_investigation);
 setIsReadOnly(existing.form2_investigation.status === 'confirmed');
 }
 }
 };

 const handleInputChange = (field: keyof InvestigationAppointment, value: any) => {
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

 if (!formData.investigationStartDate) {
 newErrors.investigationStartDate = t.hrSanctions.startDateIsRequired;
 }

 if (!formData.expectedEndDate) {
 newErrors.expectedEndDate = t.hrSanctions.expectedEndDateIsRequired;
 }

 if (!formData.investigationLead.trim()) {
 newErrors.investigationLead = t.hrSanctions.investigationLeadIsRequired;
 }

 if (!formData.scopeOfInvestigation.trim()) {
 newErrors.scopeOfInvestigation = t.hrSanctions.scopeIsRequired;
 }

 setErrors(newErrors);
 return Object.keys(newErrors).length === 0;
 };

 const handleSave = () => {
 if (!caseData) return;

 const updated = {
 ...caseData,
 form2_investigation: { ...formData, status: 'draft' },
 lastUpdatedDate: new Date().toISOString()
 };

 sanctionsService.saveCase(updated);
 sanctionsService.addAuditEntry(caseRef!, 'Saved Form 2', 'Investigation appointment saved', 'form2', formData.createdBy);
 
 alert(t.hrSanctions.savedSuccessfully);
 };

 const handleConfirm = () => {
 if (!validateForm()) {
 alert(t.hrSanctions.pleaseFillInAllRequiredFields);
 return;
 }

 if (!caseData) return;

 const confirmed = {
 ...formData,
 status: 'confirmed' as const,
 confirmedDate: new Date().toISOString()
 };

 const updated = {
 ...caseData,
 form2_investigation: confirmed,
 currentStatus: 'investigation-in-progress' as const,
 lastUpdatedDate: new Date().toISOString()
 };

 sanctionsService.saveCase(updated);
 sanctionsService.addAuditEntry(caseRef!, 'Confirmed Investigation Team', 'Form 2 confirmed', 'form2', formData.createdBy);
 
 alert(t.hrSanctions.investigationTeamConfirmed);
 navigate('/organization/hr/sanctions');
 };

 const labels = {
 title: t.hrSanctions.investigationAppointment,
 subtitle: t.hrSanctions.form2Of6,
 
 caseRef: t.hrSanctions.caseReference,
 employee: t.hrSanctions.employee,
 
 investigationStartDate: t.hrSanctions.investigationStartDate,
 expectedEndDate: t.hrSanctions.expectedEndDate,
 investigationLead: t.hrSanctions.investigationLead,
 investigationTeamMembers: t.hrSanctions.investigationTeamMembers,
 scopeOfInvestigation: t.hrSanctions.scopeOfInvestigation,
 applicablePolicyReference: t.hrSanctions.applicablePolicyReference,
 
 save: t.hrSanctions.save,
 confirm: t.hrSanctions.confirmInvestigationTeam,
 print: t.hrSanctions.print,
 back: t.hrSanctions.back,
 
 readOnlyNotice: '🔒 This form has been confirmed and is locked',
 
 teamMembersPlaceholder: t.hrSanctions.listTeamMembersCommaSeparated,
 scopePlaceholder: t.hrSanctions.describeTheScopeAndObjectivesOf,
 policyPlaceholder: t.hrSanctions.egCodeOfConductSection42
 };

 return (
 <div className="min-h-screen bg-gray-50 print:bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="bg-white border-b border-gray-200 print:hidden">
 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
 <BackButton onClick={() => navigate('/organization/hr/sanctions')} label={labels.back} />

 <div className={`flex items-center justify-between`}>
 <div className={'text-start'}>
 <div className={`flex items-center gap-3`}>
 <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
 <Users className="w-6 h-6 text-blue-600" />
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
 {t.hrSanctions.investigationAppointmentForm}
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

 {/* Investigation Dates */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-end' : ''}`}>
 {labels.investigationStartDate} <span className="text-red-600">*</span>
 </label>
 <input
 type="date"
 value={formData.investigationStartDate}
 onChange={(e) => handleInputChange('investigationStartDate', e.target.value)}
 disabled={isReadOnly}
 className={`w-full px-3 py-2 border rounded-lg ${ errors.investigationStartDate ? 'border-red-500' : 'border-gray-300' } ${isReadOnly ? 'bg-gray-100' : ''}`}
 />
 {errors.investigationStartDate && (
 <p className="mt-1 text-sm text-red-600">{errors.investigationStartDate}</p>
 )}
 </div>

 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-end' : ''}`}>
 {labels.expectedEndDate} <span className="text-red-600">*</span>
 </label>
 <input
 type="date"
 value={formData.expectedEndDate}
 onChange={(e) => handleInputChange('expectedEndDate', e.target.value)}
 disabled={isReadOnly}
 className={`w-full px-3 py-2 border rounded-lg ${ errors.expectedEndDate ? 'border-red-500' : 'border-gray-300' } ${isReadOnly ? 'bg-gray-100' : ''}`}
 />
 {errors.expectedEndDate && (
 <p className="mt-1 text-sm text-red-600">{errors.expectedEndDate}</p>
 )}
 </div>
 </div>

 {/* Investigation Lead */}
 <div className="mb-6">
 <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-end' : ''}`}>
 {labels.investigationLead} <span className="text-red-600">*</span>
 </label>
 <input
 type="text"
 value={formData.investigationLead}
 onChange={(e) => handleInputChange('investigationLead', e.target.value)}
 disabled={isReadOnly}
 className={`w-full px-3 py-2 border rounded-lg ${ errors.investigationLead ? 'border-red-500' : 'border-gray-300' } ${isReadOnly ? 'bg-gray-100' : ''} ${isRTL ? 'text-right' : ''}`}
 />
 {errors.investigationLead && (
 <p className="mt-1 text-sm text-red-600">{errors.investigationLead}</p>
 )}
 </div>

 {/* Team Members */}
 <div className="mb-6">
 <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-end' : ''}`}>
 {labels.investigationTeamMembers}
 </label>
 <textarea
 value={formData.investigationTeamMembers}
 onChange={(e) => handleInputChange('investigationTeamMembers', e.target.value)}
 disabled={isReadOnly}
 placeholder={labels.teamMembersPlaceholder}
 rows={3}
 className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${isReadOnly ? 'bg-gray-100' : ''} ${isRTL ? 'text-end' : ''}`}
 />
 </div>

 {/* Scope */}
 <div className="mb-6">
 <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-end' : ''}`}>
 {labels.scopeOfInvestigation} <span className="text-red-600">*</span>
 </label>
 <textarea
 value={formData.scopeOfInvestigation}
 onChange={(e) => handleInputChange('scopeOfInvestigation', e.target.value)}
 disabled={isReadOnly}
 placeholder={labels.scopePlaceholder}
 rows={5}
 className={`w-full px-3 py-2 border rounded-lg ${ errors.scopeOfInvestigation ? 'border-red-500' : 'border-gray-300' } ${isReadOnly ? 'bg-gray-100' : ''} ${isRTL ? 'text-right' : ''}`}
 />
 {errors.scopeOfInvestigation && (
 <p className="mt-1 text-sm text-red-600">{errors.scopeOfInvestigation}</p>
 )}
 </div>

 {/* Policy Reference */}
 <div className="mb-6">
 <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-end' : ''}`}>
 {labels.applicablePolicyReference}
 </label>
 <input
 type="text"
 value={formData.applicablePolicyReference}
 onChange={(e) => handleInputChange('applicablePolicyReference', e.target.value)}
 disabled={isReadOnly}
 placeholder={labels.policyPlaceholder}
 className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${isReadOnly ? 'bg-gray-100' : ''} ${isRTL ? 'text-end' : ''}`}
 />
 </div>

 {!isReadOnly && (
 <div className={`flex gap-4 mt-8 pt-6 border-t border-gray-200 print:hidden`}>
 <button
 onClick={handleSave}
 className={`flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50`}
 >
 <Save className="w-5 h-5" />
 <span className="font-medium">{labels.save}</span>
 </button>

 <button
 onClick={handleConfirm}
 className={`flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700`}
 >
 <CheckCircle className="w-5 h-5" />
 <span className="font-medium">{labels.confirm}</span>
 </button>
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 );
}
