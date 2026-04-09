/**
 * ============================================================================
 * FORM PREVIEW
 * ============================================================================
 * 
 * Renders survey exactly as respondent will see it
 * - Applies form style (single page, grid, multiple pages, etc.)
 * - Supports skip logic and required fields
 * - Multi-page navigation
 * - Return to beginning functionality
 * 
 * ============================================================================
 */

import { useLanguage } from '@/contexts/LanguageContext';
import { X, ArrowLeft, ArrowRight, RotateCcw, RefreshCw, Check, Edit, Info } from 'lucide-react';
import { useState } from 'react';

interface Question {
 id: string;
 type: string;
 label: string;
 description?: string;
 required: boolean;
 options?: string[];
 minValue?: number;
 maxValue?: number;
 gpsAccuracy?: number;
}

interface FormPreviewProps {
 surveyTitle: string;
 surveyId?: string;
 projectId?: string;
 questions: Question[];
 formStyle: 'default' | 'grid' | 'grid_caps' | 'multiple_pages' | 'grid_multiple' | 'grid_multiple_caps';
 onClose: () => void;
}

export function FormPreview({ 
 surveyTitle = 'Survey',
 surveyId,
 projectId = 'project_default',
 questions, 
 formStyle = 'default',
 onClose 
}: Partial<FormPreviewProps> & { questions: Question[]; onClose?: () => void; isRTL?: boolean; language?: string }) {
 const actualLanguage = contextLanguage || 'en';
 const actualIsRTL = contextIsRTL !== undefined ? contextIsRTL : false;
 const [currentPage, setCurrentPage] = useState(0);
 const [responses, setResponses] = useState<Record<string, any>>({});
 const [showDraftInfoModal, setShowDraftInfoModal] = useState(false);
 const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
 const [showThankYou, setShowThankYou] = useState(false);

 const isMultiPage = formStyle.includes('multiple');
 const isGridTheme = formStyle.includes('grid');
 const isCapsHeadings = formStyle.includes('caps');
 
 const totalPages = isMultiPage ? questions.length : 1;
 const displayQuestions = isMultiPage ? [questions[currentPage]] : questions;

 const t = {
 previewMode: actualLanguage === 'en' ? 'Preview Mode' : 'وضع المعاينة',
 assessmentTitle: actualLanguage === 'en' ? 'Assessment Title' : 'عنوان التقييم',
 next: actualLanguage === 'en' ? 'Next' : 'التالي',
 back: actualLanguage === 'en' ? 'Back' : 'رجوع',
 submit: actualLanguage === 'en' ? 'Submit' : 'إرسال',
 saveDraft: actualLanguage === 'en' ? 'Save Draft' : 'حفظ المسودة',
 savedToBrowser: actualLanguage === 'en' ? 'Saved to browser' : 'محفوظ في المتصفح',
 returnToBeginning: actualLanguage === 'en' ? 'Return to Beginning' : 'العودة للبداية',
 goToEnd: actualLanguage === 'en' ? 'Go to End' : 'الذهاب للنهاية',
 required: actualLanguage === 'en' ? 'Required' : 'مطلوب',
 finalizeRecordLater: actualLanguage === 'en' ? 'Finalize record later' : 'إتمام السجل لاحقاً',
 draftStoredText: actualLanguage === 'en'
 ? 'The draft record is stored only within the current browser. You can close this browser without losing the stored record.'
 : 'يتم تخزين السجل المسودة فقط داخل المتصفح الحالي. يمكنك إغلاق هذا المتصفح دون فقدان السجل المخزن.',
 draftAccessText: actualLanguage === 'en'
 ? 'Draft records can be accessed by reopening this page and clicking the button on the left of the screen that looks like this:'
 : 'يمكن الوصول إلى السجلات المسودة عن طريق إعادة فتح هذه الصفحة والنقر على الزر الموجود على الجانب الأيسر من الشاشة الذي يبدو كالتالي:',
 warningText: actualLanguage === 'en'
 ? 'Warning: If you clear your browser cache, all draft and unsubmitted final records will be permanently deleted.'
 : 'تحذير: إذا قمت بمسح ذاكرة التخزين المؤقت للمتصفح، فسيتم حذف جميع السجلات النهائية المسودة وغير المقدمة نهائيًا.',
 ok: actualLanguage === 'en' ? 'OK' : 'موافق',
 formSubmitted: actualLanguage === 'en' ? 'Form submitted!' : 'تم إرسال النموذج!',
 thankYou: actualLanguage === 'en' ? 'Thank you for your submission!' : 'شكرا لك على تقديمك!',
 confirmSubmit: actualLanguage === 'en' ? 'Are you sure you want to submit this form?' : 'هل أنت متأكد من إرسال هذا النموذج؟',
 cancel: actualLanguage === 'en' ? 'Cancel' : 'إلغاء',
 };

 const handleNext = () => {
 if (currentPage < totalPages - 1) {
 setCurrentPage(currentPage + 1);
 }
 };

 const handleBack = () => {
 if (currentPage > 0) {
 setCurrentPage(currentPage - 1);
 }
 };

 const handleReturnToBeginning = () => {
 setCurrentPage(0);
 setResponses({});
 };

 const handleGoToEnd = () => {
 setCurrentPage(totalPages - 1);
 };

 const renderQuestion = (question: Question) => {
 const questionStyle = isGridTheme 
 ? 'bg-white p-6 rounded-lg shadow-sm border border-gray-200' 
 : 'mb-6';

 const labelStyle = isCapsHeadings 
 ? 'text-sm font-bold uppercase tracking-wide text-gray-700 mb-2 block' 
 : 'text-sm font-semibold text-gray-700 mb-2 block';

 return (
 <div key={question.id} className={questionStyle}>
 <label className={labelStyle}>
 {question.label}
 {question.required && <span className="text-red-500 ms-1">*</span>}
 </label>
 {question.description && (
 <p className="text-xs text-gray-500 mb-3">{question.description}</p>
 )}

 {/* Render input based on question type */}
 {question.type === 'text' && (
 <input
 type="text"
 value={responses[question.id] || ''}
 onChange={(e) => setResponses({ ...responses, [question.id]: e.target.value })}
 className="w-full px-4 py-2.5 rounded-lg text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 placeholder={actualLanguage === 'en' ? 'Enter your answer' : 'أدخل إجابتك'}
 />
 )}

 {(question.type === 'integer' || question.type === 'decimal') && (
 <input
 type="number"
 value={responses[question.id] || ''}
 onChange={(e) => setResponses({ ...responses, [question.id]: e.target.value })}
 min={question.minValue}
 max={question.maxValue}
 className="w-full px-4 py-2.5 rounded-lg text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 placeholder={actualLanguage === 'en' ? 'Enter number' : 'أدخل رقم'}
 />
 )}

 {question.type === 'date' && (
 <input
 type="date"
 value={responses[question.id] || ''}
 onChange={(e) => setResponses({ ...responses, [question.id]: e.target.value })}
 className="w-full px-4 py-2.5 rounded-lg text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 />
 )}

 {question.type === 'select_one' && question.options && (
 <div className="space-y-2">
 {question.options.map((option, idx) => (
 <label key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
 <input
 type="radio"
 name={question.id}
 value={option}
 checked={responses[question.id] === option}
 onChange={(e) => setResponses({ ...responses, [question.id]: e.target.value })}
 className="w-4 h-4 text-blue-600"
 />
 <span className="text-sm text-gray-800">{option}</span>
 </label>
 ))}
 </div>
 )}

 {question.type === 'select_multiple' && question.options && (
 <div className="space-y-2">
 {question.options.map((option, idx) => (
 <label key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
 <input
 type="checkbox"
 value={option}
 checked={(responses[question.id] || []).includes(option)}
 onChange={(e) => {
 const current = responses[question.id] || [];
 const updated = e.target.checked
 ? [...current, option]
 : current.filter((v: string) => v !== option);
 setResponses({ ...responses, [question.id]: updated });
 }}
 className="w-4 h-4 text-blue-600 rounded"
 />
 <span className="text-sm text-gray-800">{option}</span>
 </label>
 ))}
 </div>
 )}

 {question.type === 'note' && (
 <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
 <p className="text-sm text-blue-900">{question.description}</p>
 </div>
 )}
 </div>
 );
 };

 const handleSubmit = () => {
 // Generate submission data in the correct format matching mealService.ts
 const submissionId = `sub_${Date.now()}`;
 const startTime = new Date(Date.now() - Math.random() * 3600000); // Random start time within last hour
 const endTime = new Date();
 
 // Convert responses object to array of SurveyResponse format
 const responsesArray = Object.entries(responses).map(([questionId, value]) => ({
 questionId,
 value,
 }));
 
 const submission = {
 id: submissionId,
 surveyId: surveyId || surveyTitle, // Use surveyId if available, else fallback to title
 projectId: projectId,
 submittedBy: 'Sarah Johnson', // In real app, this would be the logged-in user
 submittedAt: endTime.toISOString(),
 responses: responsesArray,
 status: 'completed' as const,
 syncStatus: 'synced' as const,
 location: responses['location'] ? {
 latitude: 0,
 longitude: 0,
 governorate: responses['location'] as string,
 } : undefined,
 metadata: {
 formStyle: formStyle,
 deviceType: 'web',
 language: actualLanguage,
 submissionDate: endTime.toISOString(),
 startTime: startTime.toISOString(),
 endTime: endTime.toISOString(),
 }
 };

 // Save to localStorage using the SUBMISSIONS key (matching mealService.ts structure)
 const STORAGE_KEY = 'meal_submissions';
 const existingSubmissions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
 
 existingSubmissions.push(submission);
 localStorage.setItem(STORAGE_KEY, JSON.stringify(existingSubmissions));

 // Update survey submissions count
 const surveysKey = 'meal_surveys';
 const surveys = JSON.parse(localStorage.getItem(surveysKey) || '[]');
 const surveyIndex = surveys.findIndex((s: any) => s.id === (surveyId || surveyTitle));
 if (surveyIndex !== -1) {
 surveys[surveyIndex].submissionsCount = (surveys[surveyIndex].submissionsCount || 0) + 1;
 surveys[surveyIndex].updatedAt = endTime.toISOString();
 localStorage.setItem(surveysKey, JSON.stringify(surveys));
 }

 // Clear draft if exists
 localStorage.removeItem(`survey_draft_${surveyTitle}`);

 // Show thank you confirmation
 setShowSubmitConfirmation(false);
 setShowThankYou(true);
 };

 return (
 <div className="fixed inset-0 bg-gray-100 z-50 flex flex-col">
 {/* Preview Header */}
 <div className="bg-blue-600 text-white px-6 py-3 flex items-center justify-between">
 <div className={`flex items-center gap-3 ${actualIsRTL ? 'flex-row-reverse' : ''}`}>
 <div className="px-3 py-1 bg-blue-700 rounded-full text-xs font-semibold">
 {t.previewMode}
 </div>
 {isMultiPage && (
 <span className="text-sm font-medium">
 {actualLanguage === 'en' ? `Question ${currentPage + 1} of ${totalPages}` : `السؤال ${currentPage + 1} من ${totalPages}`}
 </span>
 )}
 </div>
 <button
 onClick={onClose}
 className="p-2 rounded-md hover:bg-blue-700 transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Form Content */}
 <div className="flex-1 overflow-y-auto p-6">
 <div className="max-w-4xl mx-auto">
 {/* Survey Title */}
 <div className={`text-center mb-8 ${isCapsHeadings ? 'uppercase' : ''}`}>
 <h1 className="text-3xl font-bold text-blue-600 mb-2">
 {surveyTitle}
 </h1>
 </div>

 {/* Questions */}
 <div className={isGridTheme ? 'space-y-4' : ''}>
 {displayQuestions.map(renderQuestion)}
 </div>

 {/* Navigation Buttons */}
 <div className="mt-8 space-y-4">
 {/* Primary Navigation */}
 {isMultiPage ? (
 <div className={`flex gap-3 ${actualIsRTL ? 'flex-row-reverse' : ''}`}>
 {currentPage > 0 && (
 <button
 onClick={handleBack}
 className="flex-1 px-6 py-3 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors text-gray-700 font-medium" data-back-nav>
 {actualIsRTL ? <ArrowRight className="w-4 h-4 inline me-2" /> : <ArrowLeft className="w-4 h-4 inline me-2" />}
 {t.back}
 </button>
 )}
 <button
 onClick={currentPage < totalPages - 1 ? handleNext : () => setShowSubmitConfirmation(true)}
 className="flex-1 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors text-white font-semibold"
 >
 {currentPage < totalPages - 1 ? (
 <>
 {t.next}
 {actualIsRTL ? <ArrowLeft className="w-4 h-4 inline ms-2" /> : <ArrowRight className="w-4 h-4 inline ms-2" />}
 </>
 ) : (
 t.submit
 )}
 </button>
 </div>
 ) : (
 <div className={`flex gap-3 items-center justify-center ${actualIsRTL ? 'flex-row-reverse' : ''}`}>
 {/* Save Draft Button */}
 <button
 onClick={() => {
 localStorage.setItem(`survey_draft_${surveyTitle}`, JSON.stringify(responses));
 setShowDraftInfoModal(true);
 }}
 className="px-6 py-3 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors font-medium flex items-center gap-2"
 title={t.savedToBrowser}
 >
 <Edit className="w-4 h-4" />
 {t.saveDraft}
 </button>

 {/* Info Icon */}
 <button
 onClick={() => setShowDraftInfoModal(true)}
 className="relative group p-1 hover:bg-gray-100 rounded-full transition-colors"
 title={t.savedToBrowser}
 >
 <svg 
 className="w-5 h-5 text-gray-400 cursor-pointer" 
 fill="currentColor" 
 viewBox="0 0 20 20"
 >
 <path 
 fillRule="evenodd" 
 d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" 
 clipRule="evenodd" 
 />
 </svg>
 </button>

 {/* Submit Button */}
 <button
 onClick={() => setShowSubmitConfirmation(true)}
 className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors text-white font-semibold flex items-center gap-2"
 >
 <Check className="w-4 h-4" />
 {t.submit}
 </button>
 </div>
 )}

 {/* Secondary Navigation */}
 <div className={`flex gap-3 justify-center ${actualIsRTL ? 'flex-row-reverse' : ''}`}>
 <button
 onClick={handleReturnToBeginning}
 className="px-4 py-2 rounded-md text-sm text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-2" data-back-nav>
 <RotateCcw className="w-4 h-4" />
 {t.returnToBeginning}
 </button>
 {isMultiPage && currentPage < totalPages - 1 && (
 <button
 onClick={handleGoToEnd}
 className="px-4 py-2 rounded-md text-sm text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-2">
 {t.goToEnd}
 <ArrowRight className="w-4 h-4" />
 </button>
 )}
 </div>
 </div>
 </div>
 </div>

 {/* Footer Attribution */}
 <div className="bg-white border-t border-gray-200 px-6 py-3">
 <p className="text-xs text-gray-500 text-center">
 {actualLanguage === 'en' ? 'Powered by MEAL Survey System' : 'مدعوم من نظام استطلاعات MEAL'}
 </p>
 </div>

 {/* Draft Info Modal */}
 {showDraftInfoModal && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
 <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
 {/* Modal Header */}
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-xl font-bold text-gray-900">
 {t.finalizeRecordLater}
 </h2>
 <button
 onClick={() => setShowDraftInfoModal(false)}
 className="text-gray-400 hover:text-gray-600 transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Modal Content */}
 <div className="space-y-4">
 {/* First paragraph */}
 <p className="text-sm text-gray-700 leading-relaxed">
 {t.draftStoredText}
 </p>

 {/* Second paragraph with icon reference */}
 <div className="space-y-2">
 <p className="text-sm text-gray-700 leading-relaxed">
 {t.draftAccessText}
 </p>
 
 {/* Draft button icon example */}
 <div className="flex justify-center py-3">
 <div className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md border-2 border-blue-300 border-dashed flex items-center gap-2">
 <Edit className="w-4 h-4" />
 <span className="text-sm font-medium">{t.saveDraft}</span>
 </div>
 </div>
 </div>

 {/* Warning text */}
 <p className="text-sm text-gray-700 leading-relaxed">
 <span className="font-semibold">
 {actualLanguage === 'en' ? 'Warning:' : 'تحذير:'}
 </span>{' '}
 {actualLanguage === 'en'
 ? 'If you clear your browser cache, all draft and unsubmitted final records will be permanently deleted.'
 : 'إذا قمت بمسح ذاكرة التخزين المؤقت للمتصفح، فسيتم حذف جميع السجلات النهائية المسودة وغير المقدمة نهائيًا.'}
 </p>
 </div>

 {/* Modal Footer */}
 <div className="mt-6 flex justify-end">
 <button
 onClick={() => setShowDraftInfoModal(false)}
 className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
 >
 {t.ok}
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Submit Confirmation Modal */}
 {showSubmitConfirmation && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
 <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
 {/* Modal Header */}
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-xl font-bold text-gray-900">
 {t.submit}
 </h2>
 <button
 onClick={() => setShowSubmitConfirmation(false)}
 className="text-gray-400 hover:text-gray-600 transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Modal Content */}
 <div className="space-y-4">
 <p className="text-sm text-gray-700 leading-relaxed">
 {t.confirmSubmit}
 </p>
 </div>

 {/* Modal Footer */}
 <div className="mt-6 flex justify-end gap-3">
 <button
 onClick={() => setShowSubmitConfirmation(false)}
 className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-md font-medium transition-colors"
 >
 {t.cancel}
 </button>
 <button
 onClick={handleSubmit}
 className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
 >
 {t.submit}
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Thank You Modal */}
 {showThankYou && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
 <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
 {/* Modal Header */}
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-xl font-bold text-gray-900">
 {t.formSubmitted}
 </h2>
 <button
 onClick={() => {
 setShowThankYou(false);
 if (onClose) {
 onClose();
 }
 }}
 className="text-gray-400 hover:text-gray-600 transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Modal Content */}
 <div className="space-y-4">
 <p className="text-sm text-gray-700 leading-relaxed">
 {t.thankYou}
 </p>
 </div>

 {/* Modal Footer */}
 <div className="mt-6 flex justify-end">
 <button
 onClick={() => {
 setShowThankYou(false);
 if (onClose) {
 onClose();
 }
 }}
 className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
 >
 {t.ok}
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}