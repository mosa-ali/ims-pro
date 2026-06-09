/**
 * ============================================================================
 * APPRAISAL FORM MODAL - Structured Performance Review Form
 * ============================================================================
 * 
 * CORE RULES:
 * - Auto-assigned to employee (staffId)
 * - Read-only after submission
 * - Stored under Performance & Appraisal card only
 */

import { useState } from 'react';
import { X, Save, Award } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { StaffMember } from '../types/hrTypes';
import { appraisalService, AppraisalRecord } from '@/app/services/appraisalService';
import { ModalOverlay } from '@/app/components/ui/ModalOverlay';
import { useTranslation } from '@/i18n/useTranslation';

interface Props {
 employee: StaffMember;
 onClose: () => void;
 onSave: (appraisal: AppraisalRecord) => void;
}

export function AppraisalFormModal({
 employee, onClose, onSave }: Props) {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 
 const [formData, setFormData] = useState({
 reviewPeriod: '',
 reviewYear: new Date().getFullYear(),
 reviewQuarter: '',
 reviewerName: '',
 reviewerPosition: '',
 reviewDate: new Date().toISOString().split('T')[0],
 overallRating: 3,
 ratingDescription: 'Satisfactory' as const,
 strengths: '',
 areasForImprovement: '',
 recommendation: 'Continue' as const,
 employeeAcknowledged: false,
 notes: ''
 });

 const localT = {
 title: t.hrModals.performanceAppraisalForm,
 subtitle: t.hrModals.annualPeriodicPerformanceReview,
 
 // Employee info (read-only)
 employeeInfo: t.hrModals.employeeInformation,
 staffId: t.hrModals.staffId,
 fullName: t.hrModals.fullName,
 position: t.hrModals.position,
 department: t.hrModals.department,
 
 // Review period
 reviewPeriod: t.hrModals.reviewPeriod,
 reviewYear: t.hrModals.reviewYear,
 reviewQuarter: t.hrModals.quarterOptional,
 
 // Reviewer info
 reviewerInfo: t.hrModals.reviewerInformation,
 reviewerName: t.hrModals.reviewerName,
 reviewerPosition: t.hrModals.reviewerPosition,
 reviewDate: t.hrModals.reviewDate,
 
 // Performance rating
 performanceRating: t.hrModals.performanceRating,
 overallRating: t.hrModals.overallRating15,
 ratingDescription: t.hrModals.ratingDescription,
 
 // Ratings
 excellent: t.hrModals.excellent,
 good: t.hrModals.good,
 satisfactory: t.hrModals.satisfactory,
 needsImprovement: t.hrModals.needsImprovement,
 unsatisfactory: t.hrModals.unsatisfactory,
 
 // Feedback
 strengths: t.hrModals.strengths,
 areasForImprovement: t.hrModals.areasForImprovement,
 
 // Recommendation
 recommendation: t.hrModals.finalRecommendation,
 continue: t.hrModals.continue,
 promote: t.hrModals.promote,
 trainingRequired: t.hrModals.trainingRequired,
 pip: t.hrModals.performanceImprovementPlan,
 
 // Acknowledgement
 employeeAcknowledged: t.hrModals.employeeAcknowledgement,
 acknowledgeText: 'I acknowledge that I have reviewed and discussed this appraisal',
 
 notes: t.hrModals.additionalNotes,
 
 // Actions
 cancel: t.hrModals.cancel,
 save: t.hrModals.saveLock,
 required: t.hrModals.pleaseFillInAllRequiredFields,
 success: t.hrModals.appraisalSavedSuccessfully
 };

 const handleRatingChange = (rating: number) => {
 let description: 'Excellent' | 'Good' | 'Satisfactory' | 'Needs Improvement' | 'Unsatisfactory';
 
 if (rating === 5) description = 'Excellent';
 else if (rating === 4) description = 'Good';
 else if (rating === 3) description = 'Satisfactory';
 else if (rating === 2) description = 'Needs Improvement';
 else description = 'Unsatisfactory';
 
 setFormData({ ...formData, overallRating: rating, ratingDescription: description });
 };

 const handleSave = () => {
 // Validation
 if (!formData.reviewPeriod || !formData.reviewerName || !formData.reviewerPosition ||
 !formData.strengths || !formData.areasForImprovement) {
 alert(localT.required);
 return;
 }
 
 // Create appraisal record with auto-assigned employee data
 const appraisal = appraisalService.add({
 // Auto-linked employee data (MANDATORY)
 staffId: employee.staffId,
 employeeName: employee.fullName,
 position: employee.position,
 department: employee.department,
 
 // Form data
 reviewPeriod: formData.reviewPeriod,
 reviewYear: formData.reviewYear,
 reviewQuarter: formData.reviewQuarter || undefined,
 reviewerName: formData.reviewerName,
 reviewerPosition: formData.reviewerPosition,
 reviewDate: formData.reviewDate,
 overallRating: formData.overallRating,
 ratingDescription: formData.ratingDescription,
 strengths: formData.strengths,
 areasForImprovement: formData.areasForImprovement,
 recommendation: formData.recommendation,
 employeeAcknowledged: formData.employeeAcknowledged,
 employeeAcknowledgementDate: formData.employeeAcknowledged ? new Date().toISOString() : undefined,
 notes: formData.notes || undefined,
 
 // Audit trail
 createdBy: 'Current User' // TODO: Replace with actual user
 });
 
 alert(localT.success);
 onSave(appraisal);
 onClose();
 };

 return (
 <ModalOverlay onClose={onClose}>
 <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
 <div className="flex items-center gap-3">
 <Award className="w-6 h-6 text-blue-600" />
 <div>
 <h2 className="text-xl font-bold text-gray-900">{localT.title}</h2>
 <p className="text-sm text-gray-500">{localT.subtitle}</p>
 </div>
 </div>
 <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
 <X className="w-6 h-6" />
 </button>
 </div>

 {/* Content */}
 <div className="flex-1 overflow-y-auto px-6 py-4">
 <div className="space-y-6">
 {/* Employee Information (Read-only) */}
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
 <h3 className="text-sm font-semibold text-blue-900 mb-3">{localT.employeeInfo}</h3>
 <div className="grid grid-cols-2 gap-3 text-sm">
 <div>
 <span className="text-gray-600">{t.hrModals.staffId}:</span>
 <span className="ms-2 font-medium text-gray-900">{employee.staffId}</span>
 </div>
 <div>
 <span className="text-gray-600">{t.hrModals.fullName}:</span>
 <span className="ms-2 font-medium text-gray-900">{employee.fullName}</span>
 </div>
 <div>
 <span className="text-gray-600">{t.hrModals.position}:</span>
 <span className="ms-2 font-medium text-gray-900">{employee.position}</span>
 </div>
 <div>
 <span className="text-gray-600">{t.hrModals.department}:</span>
 <span className="ms-2 font-medium text-gray-900">{employee.department}</span>
 </div>
 </div>
 </div>

 {/* Review Period */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {t.hrModals.reviewPeriod} *
 </label>
 <input
 type="text"
 value={formData.reviewPeriod}
 onChange={(e) => setFormData({ ...formData, reviewPeriod: e.target.value })}
 placeholder={t.hrModals.egAnnual2024Q12024}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>

 {/* Reviewer Information */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {t.hrModals.reviewerName} *
 </label>
 <input
 type="text"
 value={formData.reviewerName}
 onChange={(e) => setFormData({ ...formData, reviewerName: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {t.hrModals.reviewerPosition} *
 </label>
 <input
 type="text"
 value={formData.reviewerPosition}
 onChange={(e) => setFormData({ ...formData, reviewerPosition: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>
 </div>

 {/* Overall Rating */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {t.hrModals.overallRating} *
 </label>
 <div className="flex items-center gap-4">
 {[1, 2, 3, 4, 5].map(rating => (
 <button
 key={rating}
 onClick={() => handleRatingChange(rating)}
 className={`w-12 h-12 rounded-lg font-bold text-lg transition-colors ${ formData.overallRating === rating ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200' }`}
 >
 {rating}
 </button>
 ))}
 <span className="ms-4 text-sm font-medium text-gray-700">
 {t[formData.ratingDescription.toLowerCase().replace(/ /g, '') as keyof typeof t]}
 </span>
 </div>
 </div>

 {/* Strengths */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {t.hrModals.strengths} *
 </label>
 <textarea
 value={formData.strengths}
 onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
 rows={4}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>

 {/* Areas for Improvement */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {t.hrModals.areasForImprovement} *
 </label>
 <textarea
 value={formData.areasForImprovement}
 onChange={(e) => setFormData({ ...formData, areasForImprovement: e.target.value })}
 rows={4}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>

 {/* Recommendation */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {localT.recommendation} *
 </label>
 <select
 value={formData.recommendation}
 onChange={(e) => setFormData({ ...formData, recommendation: e.target.value as any })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 >
 <option value="Continue">{t.hrModals.continue}</option>
 <option value="Promote">{t.hrModals.promote}</option>
 <option value="Training Required">{t.hrModals.trainingRequired}</option>
 <option value="Performance Improvement Plan">{localT.pip}</option>
 </select>
 </div>

 {/* Employee Acknowledgement */}
 <div className="flex items-start gap-3">
 <input
 type="checkbox"
 id="acknowledge"
 checked={formData.employeeAcknowledged}
 onChange={(e) => setFormData({ ...formData, employeeAcknowledged: e.target.checked })}
 className="mt-1"
 />
 <label htmlFor="acknowledge" className="text-sm text-gray-700">
 {localT.acknowledgeText}
 </label>
 </div>

 {/* Notes */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {t.hrModals.notes}
 </label>
 <textarea
 value={formData.notes}
 onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
 rows={3}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>
 </div>
 </div>

 {/* Footer */}
 <div className={`flex items-center gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50`}>
 <button
 onClick={onClose}
 className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
 >
 {localT.cancel}
 </button>
 <button
 onClick={handleSave}
 className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700`}
 >
 <Save className="w-5 h-5" />
 <span>{localT.save}</span>
 </button>
 </div>
 </div>
 </ModalOverlay>
 );
}
