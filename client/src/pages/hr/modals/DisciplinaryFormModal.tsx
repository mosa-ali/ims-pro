/**
 * ============================================================================
 * DISCIPLINARY FORM MODAL - HR Manager / Admin Only
 * ============================================================================
 */

import { useState } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { StaffMember } from '../types/hrTypes';
import { disciplinaryService, DisciplinaryRecord } from '@/app/services/disciplinaryService';
import { ModalOverlay } from '@/app/components/ui/ModalOverlay';
import { useTranslation } from '@/i18n/useTranslation';

interface Props {
 employee: StaffMember;
 onClose: () => void;
 onSave: (record: DisciplinaryRecord) => void;
}

export function DisciplinaryFormModal({
 employee, onClose, onSave }: Props) {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 
 const [formData, setFormData] = useState({
 actionDate: new Date().toISOString().split('T')[0],
 disciplinaryStage: 'Observation / Note' as const,
 actionDescription: '',
 finalActionType: '' as '' | 'Warning' | 'Suspension' | 'Salary Deduction' | 'Termination' | 'Other',
 finalActionDetails: '',
 policyReference: '',
 issuedBy: '',
 issuedByRole: '',
 duration: '',
 hasPayrollImpact: false,
 payrollImpactDescription: '',
 severity: 'Medium' as const,
 notes: ''
 });

 const localT = {
 title: t.hrModals.disciplinaryActionForm,
 subtitle: t.hrModals.hrManagerAdminOnly,
 
 employeeInfo: t.hrModals.employeeInformation,
 staffId: t.hrModals.staffId,
 fullName: t.hrModals.fullName,
 position: t.hrModals.position,
 department: t.hrModals.department,
 
 actionDate: t.hrModals.actionDate,
 
 // ✅ NEW: Disciplinary Stage (Process, NOT Punishment)
 disciplinaryStage: t.hrModals.disciplinaryStage,
 stageObservation: t.hrModals.observationNote,
 stageInvestigation: t.hrModals.investigationInitiated,
 stageVerbalWarning: t.hrModals.verbalWarning,
 stageWrittenWarning: t.hrModals.writtenWarning,
 stageFinalWarning: t.hrModals.finalWarning,
 stageEscalated: t.hrModals.escalated,
 stageClosedNoAction: t.hrModals.closedNoAction,
 stageClosedAction: t.hrModals.closedActionTaken,
 
 // ✅ NEW: Action Description (Free Text - REQUIRED)
 actionDescription: t.hrModals.disciplinaryActionDescription,
 actionDescriptionPlaceholder: language === 'en' 
 ? 'e.g., "Formal written warning issued", "Investigation ongoing - no decision yet", "Case escalated to management committee"'
 : 'مثال: "تم إصدار إنذار كتابي رسمي"، "التحقيق جارٍ - لم يتم اتخاذ قرار بعد"، "تم تصعيد القضية إلى لجنة الإدارة"',
 
 // ✅ NEW: Final Action Section (Only when Closed with Action)
 finalActionSection: t.hrModals.finalActionOptional,
 finalActionType: t.hrModals.finalActionType,
 finalActionWarning: t.hrModals.warning,
 finalActionSuspension: t.hrModals.suspension,
 finalActionSalaryDeduction: t.hrModals.salaryDeduction,
 finalActionTermination: t.hrModals.termination,
 finalActionOther: t.hrModals.other,
 finalActionDetails: t.hrModals.finalActionDetails,
 finalActionNote: 'Only fill this section if disciplinary process resulted in a final action',
 
 policyReference: t.hrModals.policyReferenceOptional,
 
 issuedBy: t.hrModals.issuedBy,
 issuedByRole: t.hrModals.rolePosition,
 
 duration: t.hrModals.durationIfApplicable,
 severity: t.hrModals.severity,
 low: t.hrModals.low,
 medium: t.hrModals.medium,
 high: t.hrModals.high,
 critical: t.hrModals.critical,
 
 payrollImpact: t.hrModals.hasPayrollImpact,
 payrollImpactDescription: t.hrModals.describeImpact,
 
 notes: t.hrModals.additionalNotes,
 
 cancel: t.hrModals.cancel,
 save: t.hrModals.saveLock,
 required: t.hrModals.pleaseFillInAllRequiredFields,
 success: t.hrModals.disciplinaryRecordSavedSuccessfully,
 warning: t.hrModals.thisActionCannotBeEditedOr
 };

 const handleSave = () => {
 // Validation
 if (!formData.actionDescription || !formData.issuedBy || !formData.issuedByRole) {
 alert(t.required);
 return;
 }
 
 if (!confirm(t.warning)) return;
 
 const record = disciplinaryService.add({
 staffId: employee.staffId,
 employeeName: employee.fullName,
 position: employee.position,
 department: employee.department,
 
 actionDate: formData.actionDate,
 disciplinaryStage: formData.disciplinaryStage,
 actionDescription: formData.actionDescription,
 
 // Only include final action if stage is "Closed (Action Taken)"
 ...(formData.disciplinaryStage === 'Closed (Action Taken)' && formData.finalActionType && {
 finalActionType: formData.finalActionType as any,
 finalActionDetails: formData.finalActionType === 'Other' ? formData.finalActionDetails : undefined
 }),
 
 policyReference: formData.policyReference || undefined,
 issuedBy: formData.issuedBy,
 issuedByRole: formData.issuedByRole,
 duration: formData.duration || undefined,
 hasPayrollImpact: formData.hasPayrollImpact,
 payrollImpactDescription: formData.payrollImpactDescription || undefined,
 severity: formData.severity,
 notes: formData.notes || undefined,
 
 createdBy: 'Current User' // TODO: Replace with actual user
 });
 
 alert(t.success);
 onSave(record);
 onClose();
 };

 // Check if Final Action section should be shown
 const showFinalActionSection = formData.disciplinaryStage === 'Closed (Action Taken)';

 return (
 <ModalOverlay onClose={onClose}>
 <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-red-50">
 <div className="flex items-center gap-3">
 <AlertTriangle className="w-6 h-6 text-red-600" />
 <div>
 <h2 className="text-xl font-bold text-gray-900">{t.title}</h2>
 <p className="text-sm text-red-600">{t.subtitle}</p>
 </div>
 </div>
 <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
 <X className="w-6 h-6" />
 </button>
 </div>

 <div className="flex-1 overflow-y-auto px-6 py-4">
 <div className="space-y-4">
 {/* Employee Info */}
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
 <h3 className="text-sm font-semibold text-blue-900 mb-2">{t.employeeInfo}</h3>
 <div className="grid grid-cols-2 gap-2 text-sm">
 <div><span className="text-gray-600">{t.staffId}:</span> <span className="font-medium">{employee.staffId}</span></div>
 <div><span className="text-gray-600">{t.fullName}:</span> <span className="font-medium">{employee.fullName}</span></div>
 <div><span className="text-gray-600">{t.position}:</span> <span className="font-medium">{employee.position}</span></div>
 <div><span className="text-gray-600">{t.department}:</span> <span className="font-medium">{employee.department}</span></div>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{t.actionDate} *</label>
 <input
 type="date"
 value={formData.actionDate}
 onChange={(e) => setFormData({ ...formData, actionDate: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>
 
 {/* ✅ NEW: Disciplinary Stage (Process) */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{t.disciplinaryStage} *</label>
 <select
 value={formData.disciplinaryStage}
 onChange={(e) => setFormData({ ...formData, disciplinaryStage: e.target.value as any })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 >
 <option value="Observation / Note">{t.stageObservation}</option>
 <option value="Investigation Initiated">{t.stageInvestigation}</option>
 <option value="Verbal Warning">{t.stageVerbalWarning}</option>
 <option value="Written Warning">{t.stageWrittenWarning}</option>
 <option value="Final Warning">{t.stageFinalWarning}</option>
 <option value="Escalated">{t.stageEscalated}</option>
 <option value="Closed (No Action)">{t.stageClosedNoAction}</option>
 <option value="Closed (Action Taken)">{t.stageClosedAction}</option>
 </select>
 </div>
 </div>

 {/* ✅ NEW: Action Description (Free Text - REQUIRED) */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{t.actionDescription} *</label>
 <textarea
 value={formData.actionDescription}
 onChange={(e) => setFormData({ ...formData, actionDescription: e.target.value })}
 rows={4}
 placeholder={t.actionDescriptionPlaceholder}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 <p className="text-xs text-gray-500 mt-1">
 {'Describe what happened or is being considered. Be specific and factual.'}
 </p>
 </div>

 {/* ✅ NEW: Final Action Section (Only when Closed with Action) */}
 {showFinalActionSection && (
 <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
 <div className="flex items-start gap-2">
 <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
 <div>
 <h3 className="text-sm font-semibold text-yellow-900">{t.finalActionSection}</h3>
 <p className="text-xs text-yellow-700 mt-1">{t.finalActionNote}</p>
 </div>
 </div>
 
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{t.finalActionType}</label>
 <select
 value={formData.finalActionType}
 onChange={(e) => setFormData({ ...formData, finalActionType: e.target.value as any })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 >
 <option value="">-- Select --</option>
 <option value="Warning">{t.finalActionWarning}</option>
 <option value="Suspension">{t.finalActionSuspension}</option>
 <option value="Salary Deduction">{t.finalActionSalaryDeduction}</option>
 <option value="Termination">{t.finalActionTermination}</option>
 <option value="Other">{t.finalActionOther}</option>
 </select>
 </div>
 
 {formData.finalActionType === 'Other' && (
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{t.finalActionDetails}</label>
 <input
 type="text"
 value={formData.finalActionDetails}
 onChange={(e) => setFormData({ ...formData, finalActionDetails: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>
 )}
 </div>
 </div>
 )}

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{t.issuedBy} *</label>
 <input
 type="text"
 value={formData.issuedBy}
 onChange={(e) => setFormData({ ...formData, issuedBy: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{t.issuedByRole} *</label>
 <input
 type="text"
 value={formData.issuedByRole}
 onChange={(e) => setFormData({ ...formData, issuedByRole: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>
 </div>

 <div className="flex items-center gap-3">
 <input
 type="checkbox"
 id="payrollImpact"
 checked={formData.hasPayrollImpact}
 onChange={(e) => setFormData({ ...formData, hasPayrollImpact: e.target.checked })}
 />
 <label htmlFor="payrollImpact" className="text-sm text-gray-700">{t.payrollImpact}</label>
 </div>

 {formData.hasPayrollImpact && (
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{t.payrollImpactDescription}</label>
 <input
 type="text"
 value={formData.payrollImpactDescription}
 onChange={(e) => setFormData({ ...formData, payrollImpactDescription: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>
 )}
 </div>
 </div>

 <div className={`flex items-center gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50`}>
 <button
 onClick={onClose}
 className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
 >
 {t.cancel}
 </button>
 <button
 onClick={handleSave}
 className={`flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700`}
 >
 <Save className="w-5 h-5" />
 <span>{t.save}</span>
 </button>
 </div>
 </div>
 </ModalOverlay>
 );
}