/**
 * ============================================================================
 * INTERVIEW EVALUATION MODAL
 * ============================================================================
 * 
 * Features:
 * - Score candidate performance
 * - Add recommendation
 * - Save evaluation
 * 
 * ============================================================================
 */

import { useState } from 'react';
import { X, Star, FileText, CheckCircle } from 'lucide-react';
import { interviewService, candidateService } from './recruitmentService';
import { Interview, Candidate } from './types';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface Props {
 language: string;
 isRTL: boolean;
 interview: Interview;
 candidate: Candidate;
 onClose: () => void;
 onComplete: () => void;
}

export function InterviewEvaluation({
 language, isRTL, interview, candidate, onClose, onComplete }: Props) {
 const { t } = useTranslation();
 const [formData, setFormData] = useState({
 overallScore: 0,
 recommendation: '',
 notes: interview.notes || ''
 });

 const [errors, setErrors] = useState<Record<string, string>>({});

 const validate = (): boolean => {
 const newErrors: Record<string, string> = {};

 if (formData.overallScore < 0 || formData.overallScore > 100) {
 newErrors.overallScore = 'Score must be between 0 and 100';
 }
 if (!formData.recommendation.trim()) {
 newErrors.recommendation = 'Recommendation is required';
 }

 setErrors(newErrors);
 return Object.keys(newErrors).length === 0;
 };

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();

 if (!validate()) return;

 // Update interview with evaluation
 interviewService.update(interview.id, {
 overallScore: formData.overallScore,
 recommendation: formData.recommendation,
 notes: formData.notes
 });

 onComplete();
 };

 const localT = {
 title: t.hrRecruitment.interviewEvaluation,
 candidateInfo: t.hrRecruitment.candidateInformation,
 interviewDetails: t.hrRecruitment.interviewDetails,
 
 name: t.hrRecruitment.name,
 email: t.hrRecruitment.email1,
 score: t.hrRecruitment.applicationScore,
 
 interviewDate: t.hrRecruitment.interviewDate,
 type: t.hrRecruitment.type,
 panel: t.hrRecruitment.panelMembers,
 
 evaluation: t.hrRecruitment.evaluation,
 overallScore: t.hrRecruitment.overallInterviewScore,
 recommendation: t.hrRecruitment.recommendation,
 notes: t.hrRecruitment.additionalNotes,
 
 recommendProceed: t.hrRecruitment.recommendForHiring,
 recommendReject: t.hrRecruitment.doNotRecommend,
 needsSecondInterview: t.hrRecruitment.needsSecondInterview,
 
 cancel: t.hrRecruitment.cancel,
 submit: t.hrRecruitment.submitEvaluation
 };

 return (
 <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir={isRTL ? 'rtl' : 'ltr'}>
 <div 
 className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
 
 >
 {/* Header */}
 <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
 <div className="flex items-center gap-3">
 <Star className="w-6 h-6" />
 <div>
 <h2 className="text-xl font-bold">{t.title}</h2>
 <p className="text-sm text-blue-100">{candidate.fullName}</p>
 </div>
 </div>
 <button
 onClick={onClose}
 className="p-1 hover:bg-blue-700 rounded-lg transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Body */}
 <div className="flex-1 overflow-y-auto p-6 space-y-6">
 {/* Candidate Info */}
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
 <h3 className="text-sm font-bold text-gray-900 mb-3">{t.candidateInfo}</h3>
 <div className="grid grid-cols-3 gap-4 text-sm">
 <div>
 <span className="text-gray-600">{t.name}:</span>
 <p className="font-medium text-gray-900">{candidate.fullName}</p>
 </div>
 <div>
 <span className="text-gray-600">{t.email}:</span>
 <p className="font-medium text-gray-900">{candidate.email}</p>
 </div>
 <div>
 <span className="text-gray-600">{t.score}:</span>
 <p className="font-bold text-green-600">{candidate.totalScore.toFixed(1)}%</p>
 </div>
 </div>
 </div>

 {/* Interview Details */}
 <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
 <h3 className="text-sm font-bold text-gray-900 mb-3">{t.interviewDetails}</h3>
 <div className="grid grid-cols-3 gap-4 text-sm">
 <div>
 <span className="text-gray-600">{t.interviewDate}:</span>
 <p className="font-medium text-gray-900">
 {new Date(interview.interviewDate).toLocaleString()}
 </p>
 </div>
 <div>
 <span className="text-gray-600">{t.type}:</span>
 <p className="font-medium text-gray-900">{interview.interviewType}</p>
 </div>
 <div>
 <span className="text-gray-600">{t.panel}:</span>
 <p className="font-medium text-gray-900">{interview.panelMembers.join(', ')}</p>
 </div>
 </div>
 </div>

 {/* Evaluation Form */}
 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <h3 className="text-lg font-bold text-gray-900 mb-4">{t.evaluation}</h3>
 
 <div className="mb-4">
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {t.overallScore} <span className="text-red-500">*</span>
 </label>
 <div className="flex items-center gap-4">
 <input
 type="range"
 min="0"
 max="100"
 step="5"
 value={formData.overallScore}
 onChange={(e) => setFormData(prev => ({ ...prev, overallScore: parseInt(e.target.value) }))}
 className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
 />
 <input
 type="number"
 min="0"
 max="100"
 value={formData.overallScore}
 onChange={(e) => setFormData(prev => ({ ...prev, overallScore: parseInt(e.target.value) || 0 }))}
 className={`w-20 px-3 py-2 text-center border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${ errors.overallScore ? 'border-red-500' : 'border-gray-300' }`}
 />
 <span className="text-lg font-bold text-gray-900">%</span>
 </div>
 {errors.overallScore && (
 <p className="text-xs text-red-500 mt-1">{errors.overallScore}</p>
 )}
 
 {/* Score Color Indicator */}
 <div className="mt-2 flex items-center gap-2">
 <div className={`px-3 py-1 rounded-full text-sm font-medium ${ formData.overallScore >= 80 ? 'bg-green-100 text-green-700' : formData.overallScore >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700' }`}>
 {formData.overallScore >= 80 ? 'Excellent' :
 formData.overallScore >= 60 ? 'Good' : 'Needs Improvement'}
 </div>
 </div>
 </div>

 <div className="mb-4">
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {t.recommendation} <span className="text-red-500">*</span>
 </label>
 <div className="space-y-2">
 <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
 <input
 type="radio"
 value="Recommend for Hiring"
 checked={formData.recommendation === 'Recommend for Hiring'}
 onChange={(e) => setFormData(prev => ({ ...prev, recommendation: e.target.value }))}
 className="w-4 h-4 text-blue-600"
 />
 <span className="text-sm text-gray-900">{t.recommendProceed}</span>
 </label>
 
 <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
 <input
 type="radio"
 value="Needs Second Interview"
 checked={formData.recommendation === 'Needs Second Interview'}
 onChange={(e) => setFormData(prev => ({ ...prev, recommendation: e.target.value }))}
 className="w-4 h-4 text-blue-600"
 />
 <span className="text-sm text-gray-900">{t.needsSecondInterview}</span>
 </label>
 
 <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
 <input
 type="radio"
 value="Do Not Recommend"
 checked={formData.recommendation === 'Do Not Recommend'}
 onChange={(e) => setFormData(prev => ({ ...prev, recommendation: e.target.value }))}
 className="w-4 h-4 text-blue-600"
 />
 <span className="text-sm text-gray-900">{t.recommendReject}</span>
 </label>
 </div>
 {errors.recommendation && (
 <p className="text-xs text-red-500 mt-1">{errors.recommendation}</p>
 )}
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {t.notes}
 </label>
 <textarea
 value={formData.notes}
 onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
 rows={4}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 placeholder={t.placeholders.detailedEvaluationNotes}
 />
 </div>
 </div>
 </form>
 </div>

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
 <CheckCircle className="w-4 h-4" />
 {t.submit}
 </button>
 </div>
 </div>
 </div>
 );
}
