/**
 * ============================================================================
 * PERFORMANCE REVIEW MODAL (Simple, Editable Reviews)
 * ============================================================================
 * 
 * DIFFERENCE FROM APPRAISAL FORM:
 * - Simpler, lightweight reviews
 * - Can be edited after submission
 * - Used for periodic check-ins, mid-year reviews
 * - NOT locked after submission
 * 
 * APPRAISAL FORM is for:
 * - Annual formal appraisals
 * - Locked after submission
 * - Comprehensive evaluation
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { X, Save, Star } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface PerformanceReview {
 id: string;
 staffId: string;
 employeeName: string;
 position: string;
 department: string;
 
 reviewDate: string;
 reviewPeriod: string;
 reviewType: 'Mid-Year' | 'Quarterly' | 'Probation' | 'Spot Review';
 
 overallRating: number; // 1-5 stars
 strengths: string;
 areasForImprovement: string;
 goals: string;
 comments: string;
 
 reviewedBy: string;
 reviewerTitle: string;
 
 createdDate: string;
 updatedDate: string;
}

interface Props {
 employee: any;
 existingReview?: PerformanceReview;
 onClose: () => void;
 onSave: () => void;
}

const STORAGE_KEY = 'hr_performance_reviews';

export function PerformanceReviewModal({
 employee, existingReview, onClose, onSave }: Props) {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 
 const [formData, setFormData] = useState({
 reviewDate: existingReview?.reviewDate || new Date().toISOString().split('T')[0],
 reviewPeriod: existingReview?.reviewPeriod || '',
 reviewType: existingReview?.reviewType || 'Quarterly' as const,
 overallRating: existingReview?.overallRating || 3,
 strengths: existingReview?.strengths || '',
 areasForImprovement: existingReview?.areasForImprovement || '',
 goals: existingReview?.goals || '',
 comments: existingReview?.comments || '',
 reviewedBy: existingReview?.reviewedBy || '',
 reviewerTitle: existingReview?.reviewerTitle || ''
 });

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 
 const allReviews: PerformanceReview[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
 
 if (existingReview) {
 // Update existing
 const index = allReviews.findIndex(r => r.id === existingReview.id);
 if (index !== -1) {
 allReviews[index] = {
 ...existingReview,
 ...formData,
 updatedDate: new Date().toISOString()
 };
 }
 } else {
 // Create new
 const newReview: PerformanceReview = {
 id: `REV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
 staffId: employee.staffId,
 employeeName: employee.fullName,
 position: employee.position,
 department: employee.department,
 ...formData,
 createdDate: new Date().toISOString(),
 updatedDate: new Date().toISOString()
 };
 allReviews.push(newReview);
 }
 
 localStorage.setItem(STORAGE_KEY, JSON.stringify(allReviews));
 onSave();
 };

 const localT = {
 title: t.hrModals.performanceReview,
 subtitle: t.hr.performanceReviewSubtitle,
 
 reviewDate: t.hrModals.reviewDate1,
 reviewPeriod: t.hrModals.reviewPeriod11,
 reviewType: t.hrModals.reviewType,
 overallRating: t.hrModals.overallRating12,
 strengths: t.hrModals.strengths,
 areasForImprovement: t.hrModals.areasForImprovement,
 goals: t.hrModals.goalsObjectives,
 comments: t.hrModals.additionalComments,
 reviewedBy: t.hrModals.reviewedBy,
 reviewerTitle: t.hrModals.reviewerTitle,
 
 cancel: t.hrModals.cancel,
 save: t.hrModals.saveReview,
 update: t.hrModals.updateReview
 };

 const reviewTypes = [
 { value: 'Quarterly', label: t.hrModals.quarterlyReview },
 { value: 'Mid-Year', label: t.hrModals.midyearReview },
 { value: 'Probation', label: t.hrModals.probationReview },
 { value: 'Spot Review', label: t.hrModals.spotReview }
 ];

 return (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
 {/* Header */}
 <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-blue-50">
 <div>
 <h2 className="text-xl font-bold text-gray-900">{localT.title}</h2>
 <p className="text-sm text-gray-600 mt-1">{localT.subtitle}</p>
 <p className="text-sm text-blue-600 font-medium mt-1">
 {employee.fullName} - {employee.position}
 </p>
 </div>
 <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
 <X className="w-6 h-6" />
 </button>
 </div>

 {/* Form */}
 <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
 <div className="space-y-6">
 {/* Review Details */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {localT.reviewDate} *
 </label>
 <input
 type="date"
 required
 value={formData.reviewDate}
 onChange={(e) => setFormData({ ...formData, reviewDate: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {localT.reviewPeriod} *
 </label>
 <input
 type="text"
 required
 placeholder={t.placeholders.eGQ12024JanMar2024}
 value={formData.reviewPeriod}
 onChange={(e) => setFormData({ ...formData, reviewPeriod: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {localT.reviewType} *
 </label>
 <select
 required
 value={formData.reviewType}
 onChange={(e) => setFormData({ ...formData, reviewType: e.target.value as any })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 >
 {reviewTypes.map(type => (
 <option key={type.value} value={type.value}>{type.label}</option>
 ))}
 </select>
 </div>
 </div>

 {/* Overall Rating */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {localT.overallRating} *
 </label>
 <div className="flex items-center gap-2">
 {[1, 2, 3, 4, 5].map(rating => (
 <button
 key={rating}
 type="button"
 onClick={() => setFormData({ ...formData, overallRating: rating })}
 className="focus:outline-none"
 >
 <Star
 className={`w-8 h-8 ${ rating <= formData.overallRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300' }`}
 />
 </button>
 ))}
 <span className="ms-2 text-sm font-medium text-gray-700">
 {formData.overallRating}/5
 </span>
 </div>
 </div>

 {/* Strengths */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {localT.strengths} *
 </label>
 <textarea
 required
 rows={3}
 value={formData.strengths}
 onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 placeholder={t.placeholders.whatHasTheEmployeeDoneWell}
 />
 </div>

 {/* Areas for Improvement */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {localT.areasForImprovement}
 </label>
 <textarea
 rows={3}
 value={formData.areasForImprovement}
 onChange={(e) => setFormData({ ...formData, areasForImprovement: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 placeholder={t.placeholders.whatAreasNeedDevelopment}
 />
 </div>

 {/* Goals */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {localT.goals}
 </label>
 <textarea
 rows={3}
 value={formData.goals}
 onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 placeholder={t.placeholders.goalsForNextReviewPeriod}
 />
 </div>

 {/* Comments */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {localT.comments}
 </label>
 <textarea
 rows={2}
 value={formData.comments}
 onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 />
 </div>

 {/* Reviewer Info */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {localT.reviewedBy} *
 </label>
 <input
 type="text"
 required
 value={formData.reviewedBy}
 onChange={(e) => setFormData({ ...formData, reviewedBy: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {localT.reviewerTitle} *
 </label>
 <input
 type="text"
 required
 value={formData.reviewerTitle}
 onChange={(e) => setFormData({ ...formData, reviewerTitle: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 />
 </div>
 </div>
 </div>
 </form>

 {/* Footer */}
 <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3 bg-gray-50">
 <button
 type="button"
 onClick={onClose}
 className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
 >
 {localT.cancel}
 </button>
 <button
 onClick={handleSubmit}
 className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
 >
 <Save className="w-4 h-4" />
 {existingReview ? localT.update : localT.save}
 </button>
 </div>
 </div>
 </div>
 );
}
