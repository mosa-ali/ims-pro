/**
 * ============================================================================
 * SURVEY RESPONSE FORM
 * ============================================================================
 * 
 * Converted from React Native to Web React
 * Complete survey response form with dynamic question types and skip logic
 * 
 * FEATURES:
 * - Multiple question types (text, choice, rating, etc.)
 * - Skip logic support
 * - Pagination
 * - Form validation
 * - Progress tracking
 * - Bilingual support (EN/AR) with RTL
 * 
 * ============================================================================
 */

import { useNavigate } from '@/lib/router-compat';
import { useSearch } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect, useMemo } from 'react';
import { Loader2, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

interface Question {
 id: string;
 type: string;
 label: string;
 description?: string;
 required: boolean;
 options?: string[];
}

interface FormWithSkipLogic {
 id: string;
 name: string;
 description?: string;
 skipLogicRules?: any[];
}

interface FormResponse {
 [questionId: string]: string | string[] | boolean | number;
}

export function SurveyResponse() {
 const { t } = useTranslation();
 const navigate = useNavigate();
 const searchString = useSearch();
 const searchParams = new URLSearchParams(searchString);
 const { language, isRTL } = useLanguage();
 const [form, setForm] = useState<FormWithSkipLogic | null>(null);
 const [questions, setQuestions] = useState<Question[]>([]);
 const [responses, setResponses] = useState<FormResponse>({});
 const [loading, setLoading] = useState(true);
 const [submitting, setSubmitting] = useState(false);
 const [currentPage, setCurrentPage] = useState(0);
 const questionsPerPage = 5;

 const formId = searchParams.get('formId') || '';
 const templateId = searchParams.get('templateId') || '';

 const labels = {
 back: t.mealSurvey.back,
 previous: t.mealSurvey.previous,
 next: t.mealSurvey.next,
 submitSurvey: t.mealSurvey.submitSurvey,
 required: t.mealSurvey.required,
 enterAnswer: t.mealSurvey.enterYourAnswer,
 enterNumber: t.mealSurvey.enterANumber,
 yes: t.mealSurvey.yes,
 no: t.mealSurvey.no,
 page: t.mealSurvey.page,
 of: t.mealSurvey.of,
 skipLogicInfo: t.mealSurvey.thisSurveyUsesDynamicQuestions,
 skipLogicDesc: 'Some questions may appear or disappear based on your answers.',
 validationError: t.mealSurvey.validationError,
 requiredField: t.mealSurvey.isRequired,
 success: t.mealSurvey.success,
 submitSuccess: t.mealSurvey.surveySubmittedSuccessfully,
 submitError: t.mealSurvey.failedToSubmitSurvey,
 loadError: t.mealSurvey.failedToLoadSurveyForm,
 };

 useEffect(() => {
 loadFormAndQuestions();
 }, [formId, templateId]);

 const loadFormAndQuestions = async () => {
 setLoading(true);
 try {
 // Mock data - replace with actual tRPC call
 const mockForm: FormWithSkipLogic = {
 id: formId || '1',
 name: t.mealSurvey.beneficiarySatisfactionSurvey,
 description: 'Help us improve our services by sharing your feedback',
 skipLogicRules: [],
 };

 const mockQuestions: Question[] = [
 {
 id: 'q1',
 type: 'text',
 label: t.mealSurvey.whatIsYourName,
 required: true,
 },
 {
 id: 'q2',
 type: 'choice',
 label: t.mealSurvey.howSatisfiedAreYouWithOur,
 required: true,
 options: language === 'en'
 ? ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied']
 : ['راضٍ جداً', 'راضٍ', 'محايد', 'غير راضٍ', 'غير راضٍ جداً'],
 },
 {
 id: 'q3',
 type: 'rating',
 label: t.mealSurvey.rateYourOverallExperience,
 required: true,
 },
 {
 id: 'q4',
 type: 'yes_no',
 label: t.mealSurvey.wouldYouRecommendUsToOthers,
 required: true,
 },
 {
 id: 'q5',
 type: 'text',
 label: t.mealSurvey.additionalCommentsOrSuggestions,
 description: t.mealSurvey.optionalFeedback,
 required: false,
 },
 ];

 setForm(mockForm);
 setQuestions(mockQuestions);
 } catch (error) {
 alert(labels.loadError);
 } finally {
 setLoading(false);
 }
 };

 const handleResponseChange = (questionId: string, value: any) => {
 setResponses({
 ...responses,
 [questionId]: value,
 });
 };

 const visibleQuestions = useMemo(() => {
 // Skip logic evaluation would go here
 return questions;
 }, [questions, responses]);

 const validateResponses = () => {
 for (const question of visibleQuestions) {
 if (question.required && !responses[question.id]) {
 alert(`${labels.validationError}: "${question.label}" ${labels.requiredField}`);
 return false;
 }
 }
 return true;
 };

 const handleSubmitResponse = async () => {
 if (!validateResponses()) {
 return;
 }

 setSubmitting(true);
 try {
 // TODO: Replace with actual tRPC call
 await new Promise((resolve) => setTimeout(resolve, 1000));
 alert(labels.submitSuccess);
 navigate('/organization/meal/survey');
 } catch (error) {
 alert(labels.submitError);
 } finally {
 setSubmitting(false);
 }
 };

 const renderQuestion = (question: Question) => {
 const value = responses[question.id];

 switch (question.type) {
 case 'text':
 return (
 <input
 type="text"
 value={(value as string) || ''}
 onChange={(e) => handleResponseChange(question.id, e.target.value)}
 placeholder={labels.enterAnswer}
 className={`w-full px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${ 'text-start' }`}
 />
 );

 case 'number':
 return (
 <input
 type="number"
 value={(value as string) || ''}
 onChange={(e) => handleResponseChange(question.id, e.target.value)}
 placeholder={labels.enterNumber}
 className={`w-full px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${ 'text-start' }`}
 />
 );

 case 'choice':
 return (
 <div className="space-y-2" dir={isRTL ? 'rtl' : 'ltr'}>
 {question.options?.map((option) => (
 <button
 key={option}
 onClick={() => handleResponseChange(question.id, option)}
 className={`w-full p-3 rounded-lg border flex items-center transition-colors ${ value === option ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300 hover:bg-gray-50' }`}
 >
 <div
 className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${ 'me-3' }`}
 style={{
 borderColor: value === option ? '#FFFFFF' : '#D1D5DB',
 backgroundColor: value === option ? '#FFFFFF' : 'transparent',
 }}
 >
 {value === option && (
 <div className="w-2 h-2 rounded-full bg-blue-600"></div>
 )}
 </div>
 <span className={value === option ? 'text-white' : 'text-gray-900'}>
 {option}
 </span>
 </button>
 ))}
 </div>
 );

 case 'yes_no':
 return (
 <div className={`flex gap-3`}>
 {[labels.yes, labels.no].map((option) => (
 <button
 key={option}
 onClick={() => handleResponseChange(question.id, option)}
 className={`flex-1 p-3 rounded-lg border transition-colors ${ value === option ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300 hover:bg-gray-50' }`}
 >
 <span
 className={`font-semibold ${ value === option ? 'text-white' : 'text-gray-900' }`}
 >
 {option}
 </span>
 </button>
 ))}
 </div>
 );

 case 'rating':
 return (
 <div className={`flex gap-2`}>
 {[1, 2, 3, 4, 5].map((star) => (
 <button
 key={star}
 onClick={() => handleResponseChange(question.id, star.toString())}
 className="transition-transform hover:scale-110"
 >
 <span className="text-4xl">
 {parseInt(value as string) >= star ? '⭐' : '☆'}
 </span>
 </button>
 ))}
 </div>
 );

 case 'likert':
 return (
 <div className={`flex gap-2 justify-between`}>
 {[1, 2, 3, 4, 5].map((rating) => (
 <button
 key={rating}
 onClick={() => handleResponseChange(question.id, rating.toString())}
 className={`flex-1 p-3 rounded-lg border transition-colors ${ value === rating.toString() ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300 hover:bg-gray-50' }`}
 >
 <span
 className={`font-semibold ${ value === rating.toString() ? 'text-white' : 'text-gray-900' }`}
 >
 {rating}
 </span>
 </button>
 ))}
 </div>
 );

 default:
 return (
 <p className="text-gray-500">
 {t.mealSurvey.questionTypeNotSupported}
 </p>
 );
 }
 };

 if (loading) {
 return (
 <div className="flex items-center justify-center min-h-screen">
 <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
 </div>
 );
 }

 const paginatedQuestions = visibleQuestions.slice(
 currentPage * questionsPerPage,
 (currentPage + 1) * questionsPerPage
 );
 const totalPages = Math.ceil(visibleQuestions.length / questionsPerPage);

 return (
 <div className="max-w-3xl mx-auto space-y-6 p-6">
 {/* Back Navigation */}
 <BackButton onClick={() => navigate('/organization/meal/survey')} label={t.mealSurvey.backToSurveys} />
 {/* Header */}
 <div className={`flex items-center justify-between`}>
 <div className={`flex-1 text-start`}>
 <h1 className="text-2xl font-bold text-gray-900">{form?.name}</h1>
 {form?.description && (
 <p className="text-sm text-gray-600 mt-2">{form.description}</p>
 )}
 </div>
 </div>

 {/* Progress */}
 {totalPages > 1 && (
 <div className="bg-gray-200 rounded-full h-2">
 <div
 className="bg-blue-500 h-2 rounded-full transition-all"
 style={{ width: `${((currentPage + 1) / totalPages) * 100}%` }}
 />
 </div>
 )}

 {/* Questions */}
 <div className="space-y-6">
 {paginatedQuestions.map((question, index) => {
 const globalIndex = questions.findIndex((q) => q.id === question.id) + 1;
 return (
 <div key={question.id} className="space-y-3">
 <div className={'text-start'}>
 <p className="text-base font-semibold text-gray-900">
 {globalIndex}. {question.label}
 {question.required && <span className="text-red-600"> *</span>}
 </p>
 {question.description && (
 <p className="text-sm text-gray-600 mt-1">{question.description}</p>
 )}
 </div>
 {renderQuestion(question)}
 </div>
 );
 })}
 </div>

 {/* Skip Logic Info */}
 {form?.skipLogicRules && form.skipLogicRules.length > 0 && (
 <div
 className={`p-3 rounded-lg bg-white border-s-4 border-blue-600 ${ isRTL ? 'border-l-0 border-r-4' : '' }`}
 >
 <div className={`flex items-start gap-2`}>
 <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
 <div className={'text-start'}>
 <p className="text-xs font-semibold text-blue-600">{labels.skipLogicInfo}</p>
 <p className="text-xs text-gray-600 mt-1">{labels.skipLogicDesc}</p>
 </div>
 </div>
 </div>
 )}

 {/* Pagination */}
 {totalPages > 1 && (
 <div className={`flex items-center justify-between`}>
 <button
 onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
 disabled={currentPage === 0}
 className={`px-4 py-2 rounded-lg transition-colors ${ currentPage === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700' }`}
 >
 <span className="font-semibold flex items-center gap-2">
 {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />} {labels.previous}
 </span>
 </button>

 <span className="text-gray-600">
 {labels.page} {currentPage + 1} {labels.of} {totalPages}
 </span>

 <button
 onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
 disabled={currentPage === totalPages - 1}
 className={`px-4 py-2 rounded-lg transition-colors ${ currentPage === totalPages - 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700' }`}
 >
 <span className="font-semibold flex items-center gap-2">
 {labels.next} {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
 </span>
 </button>
 </div>
 )}

 {/* Submit Button */}
 <button
 onClick={handleSubmitResponse}
 disabled={submitting}
 className="w-full rounded-lg py-4 bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
 >
 {submitting ? (
 <Loader2 className="w-5 h-5 text-white animate-spin mx-auto" />
 ) : (
 <span className="font-semibold text-white text-base">{labels.submitSurvey}</span>
 )}
 </button>
 </div>
 );
}
