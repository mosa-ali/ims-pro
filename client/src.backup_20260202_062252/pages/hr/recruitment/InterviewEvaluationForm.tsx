/**
 * ============================================================================
 * INTERVIEW EVALUATION FORM
 * ============================================================================
 * 
 * Conduct interview evaluation with ratings and recommendations
 * 
 * ============================================================================
 */

import { useState } from 'react';
import { X, Save, Star } from 'lucide-react';
import { interviewService, candidateService } from './recruitmentService';
import { Interview } from './types';

interface Props {
  language: string;
  isRTL: boolean;
  interview: Interview;
  onClose: () => void;
  onSave: () => void;
}

export function InterviewEvaluationForm({ language, isRTL, interview, onClose, onSave }: Props) {
  const candidate = candidateService.getById(interview.candidateId);

  const [formData, setFormData] = useState({
    technicalSkills: interview.technicalSkills || 0,
    communicationSkills: interview.communicationSkills || 0,
    problemSolving: interview.problemSolving || 0,
    culturalFit: interview.culturalFit || 0,
    motivation: interview.motivation || 0,
    overallRating: interview.overallRating || 0,
    recommendation: interview.recommendation || '',
    strengths: interview.strengths || '',
    weaknesses: interview.weaknesses || '',
    evaluationNotes: interview.evaluationNotes || '',
    status: interview.status || 'Scheduled'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.overallRating === 0) newErrors.overallRating = t.requiredField;
    if (!formData.recommendation) newErrors.recommendation = t.requiredField;
    if (!formData.strengths.trim()) newErrors.strengths = t.requiredField;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    interviewService.update(interview.id, {
      ...formData,
      status: 'Completed'
    });

    onSave();
  };

  const StarRating = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="focus:outline-none"
          >
            <Star
              className={`w-8 h-8 ${
                star <= value 
                  ? 'fill-yellow-400 text-yellow-400' 
                  : 'fill-none text-gray-300'
              }`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-600">{value}/5</span>
      </div>
    </div>
  );

  const t = {
    title: language === 'en' ? 'Interview Evaluation' : 'تقييم المقابلة',
    candidateInfo: language === 'en' ? 'Candidate Information' : 'معلومات المرشح',
    ratings: language === 'en' ? 'Evaluation Ratings' : 'تقييمات التقويم',
    recommendation: language === 'en' ? 'Recommendation' : 'التوصية',
    
    technicalSkills: language === 'en' ? 'Technical Skills' : 'المهارات التقنية',
    communicationSkills: language === 'en' ? 'Communication Skills' : 'مهارات التواصل',
    problemSolving: language === 'en' ? 'Problem Solving' : 'حل المشكلات',
    culturalFit: language === 'en' ? 'Cultural Fit' : 'التوافق الثقافي',
    motivation: language === 'en' ? 'Motivation & Enthusiasm' : 'الدافع والحماس',
    overallRating: language === 'en' ? 'Overall Rating' : 'التقييم الإجمالي',
    
    recommendationLabel: language === 'en' ? 'Final Recommendation' : 'التوصية النهائية',
    highlyRecommended: language === 'en' ? 'Highly Recommended' : 'موصى به بشدة',
    recommended: language === 'en' ? 'Recommended' : 'موصى به',
    notRecommended: language === 'en' ? 'Not Recommended' : 'غير موصى به',
    onHold: language === 'en' ? 'On Hold' : 'قيد الانتظار',
    
    strengths: language === 'en' ? 'Key Strengths' : 'نقاط القوة الرئيسية',
    weaknesses: language === 'en' ? 'Areas for Improvement' : 'مجالات التحسين',
    evaluationNotes: language === 'en' ? 'Additional Notes' : 'ملاحظات إضافية',
    
    interviewStatus: language === 'en' ? 'Interview Status' : 'حالة المقابلة',
    scheduled: language === 'en' ? 'Scheduled' : 'مجدولة',
    completed: language === 'en' ? 'Completed' : 'مكتملة',
    cancelled: language === 'en' ? 'Cancelled' : 'ملغاة',
    noShow: language === 'en' ? 'No Show' : 'لم يحضر',
    
    save: language === 'en' ? 'Save Evaluation' : 'حفظ التقييم',
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
    
    requiredField: language === 'en' ? 'This field is required' : 'هذا الحقل مطلوب'
  };

  return (
    <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{t.title}</h2>
            <p className="text-sm text-blue-100">{interview.interviewRef}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Candidate Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">{t.candidateInfo}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Name:</span>
                <span className="ml-2 font-medium text-gray-900">{candidate?.fullName}</span>
              </div>
              <div>
                <span className="text-gray-500">Reference:</span>
                <span className="ml-2 font-mono text-gray-900">{candidate?.candidateRef}</span>
              </div>
              <div>
                <span className="text-gray-500">Score:</span>
                <span className="ml-2 font-medium text-green-600">{candidate?.totalScore.toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-gray-500">Interview Date:</span>
                <span className="ml-2 text-gray-900">{new Date(interview.scheduledDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Interview Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.interviewStatus} <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Scheduled">{t.scheduled}</option>
              <option value="Completed">{t.completed}</option>
              <option value="Cancelled">{t.cancelled}</option>
              <option value="No Show">{t.noShow}</option>
            </select>
          </div>

          {/* Ratings Section */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">{t.ratings}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StarRating
                value={formData.technicalSkills}
                onChange={(v) => handleInputChange('technicalSkills', v)}
                label={t.technicalSkills}
              />
              <StarRating
                value={formData.communicationSkills}
                onChange={(v) => handleInputChange('communicationSkills', v)}
                label={t.communicationSkills}
              />
              <StarRating
                value={formData.problemSolving}
                onChange={(v) => handleInputChange('problemSolving', v)}
                label={t.problemSolving}
              />
              <StarRating
                value={formData.culturalFit}
                onChange={(v) => handleInputChange('culturalFit', v)}
                label={t.culturalFit}
              />
              <StarRating
                value={formData.motivation}
                onChange={(v) => handleInputChange('motivation', v)}
                label={t.motivation}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.overallRating} <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleInputChange('overallRating', star)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-10 h-10 ${
                          star <= formData.overallRating 
                            ? 'fill-yellow-400 text-yellow-400' 
                            : 'fill-none text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-lg font-bold text-gray-900">{formData.overallRating}/5</span>
                </div>
                {errors.overallRating && <p className="text-xs text-red-500 mt-1">{errors.overallRating}</p>}
              </div>
            </div>
          </div>

          {/* Recommendation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.recommendationLabel} <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.recommendation}
              onChange={(e) => handleInputChange('recommendation', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.recommendation ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select recommendation...</option>
              <option value="Highly Recommended">{t.highlyRecommended}</option>
              <option value="Recommended">{t.recommended}</option>
              <option value="Not Recommended">{t.notRecommended}</option>
              <option value="On Hold">{t.onHold}</option>
            </select>
            {errors.recommendation && <p className="text-xs text-red-500 mt-1">{errors.recommendation}</p>}
          </div>

          {/* Strengths */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.strengths} <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.strengths}
              onChange={(e) => handleInputChange('strengths', e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.strengths ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="List the candidate's key strengths..."
            />
            {errors.strengths && <p className="text-xs text-red-500 mt-1">{errors.strengths}</p>}
          </div>

          {/* Weaknesses */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.weaknesses}
            </label>
            <textarea
              value={formData.weaknesses}
              onChange={(e) => handleInputChange('weaknesses', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="List areas for improvement..."
            />
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.evaluationNotes}
            </label>
            <textarea
              value={formData.evaluationNotes}
              onChange={(e) => handleInputChange('evaluationNotes', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any additional observations or comments..."
            />
          </div>
        </form>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {t.save}
          </button>
        </div>
      </div>
    </div>
  );
}
