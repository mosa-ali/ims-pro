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

export function PerformanceReviewModal({ employee, existingReview, onClose, onSave }: Props) {
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

  const t = {
    title: language === 'en' ? 'Performance Review' : 'مراجعة الأداء',
    subtitle: language === 'en' 
      ? 'Simple periodic review (editable)' 
      : 'مراجعة دورية بسيطة (قابلة للتعديل)',
    
    reviewDate: language === 'en' ? 'Review Date' : 'تاريخ المراجعة',
    reviewPeriod: language === 'en' ? 'Review Period' : 'فترة المراجعة',
    reviewType: language === 'en' ? 'Review Type' : 'نوع المراجعة',
    overallRating: language === 'en' ? 'Overall Rating' : 'التقييم العام',
    strengths: language === 'en' ? 'Strengths' : 'نقاط القوة',
    areasForImprovement: language === 'en' ? 'Areas for Improvement' : 'مجالات التحسين',
    goals: language === 'en' ? 'Goals & Objectives' : 'الأهداف والغايات',
    comments: language === 'en' ? 'Additional Comments' : 'تعليقات إضافية',
    reviewedBy: language === 'en' ? 'Reviewed By' : 'تمت المراجعة بواسطة',
    reviewerTitle: language === 'en' ? 'Reviewer Title' : 'منصب المراجع',
    
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
    save: language === 'en' ? 'Save Review' : 'حفظ المراجعة',
    update: language === 'en' ? 'Update Review' : 'تحديث المراجعة'
  };

  const reviewTypes = [
    { value: 'Quarterly', label: language === 'en' ? 'Quarterly Review' : 'مراجعة ربع سنوية' },
    { value: 'Mid-Year', label: language === 'en' ? 'Mid-Year Review' : 'مراجعة نصف سنوية' },
    { value: 'Probation', label: language === 'en' ? 'Probation Review' : 'مراجعة فترة التجربة' },
    { value: 'Spot Review', label: language === 'en' ? 'Spot Review' : 'مراجعة فورية' }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-blue-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{t.title}</h2>
            <p className="text-sm text-gray-600 mt-1">{t.subtitle}</p>
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
                  {t.reviewDate} *
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
                  {t.reviewPeriod} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Q1 2024, Jan-Mar 2024"
                  value={formData.reviewPeriod}
                  onChange={(e) => setFormData({ ...formData, reviewPeriod: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.reviewType} *
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
                {t.overallRating} *
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
                      className={`w-8 h-8 ${
                        rating <= formData.overallRating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm font-medium text-gray-700">
                  {formData.overallRating}/5
                </span>
              </div>
            </div>

            {/* Strengths */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.strengths} *
              </label>
              <textarea
                required
                rows={3}
                value={formData.strengths}
                onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="What has the employee done well?"
              />
            </div>

            {/* Areas for Improvement */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.areasForImprovement}
              </label>
              <textarea
                rows={3}
                value={formData.areasForImprovement}
                onChange={(e) => setFormData({ ...formData, areasForImprovement: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="What areas need development?"
              />
            </div>

            {/* Goals */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.goals}
              </label>
              <textarea
                rows={3}
                value={formData.goals}
                onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Goals for next review period"
              />
            </div>

            {/* Comments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.comments}
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
                  {t.reviewedBy} *
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
                  {t.reviewerTitle} *
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
            {t.cancel}
          </button>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Save className="w-4 h-4" />
            {existingReview ? t.update : t.save}
          </button>
        </div>
      </div>
    </div>
  );
}
