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

import { useLocation, useSearch } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect, useMemo } from 'react';
import { Loader2, ChevronLeft, ChevronRight, Info } from 'lucide-react';

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
  const [, navigate] = useLocation();
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

  const t = {
    back: language === 'en' ? 'Back' : 'رجوع',
    previous: language === 'en' ? 'Previous' : 'السابق',
    next: language === 'en' ? 'Next' : 'التالي',
    submitSurvey: language === 'en' ? 'Submit Survey' : 'إرسال الاستطلاع',
    required: language === 'en' ? 'Required' : 'مطلوب',
    enterAnswer: language === 'en' ? 'Enter your answer' : 'أدخل إجابتك',
    enterNumber: language === 'en' ? 'Enter a number' : 'أدخل رقماً',
    yes: language === 'en' ? 'Yes' : 'نعم',
    no: language === 'en' ? 'No' : 'لا',
    page: language === 'en' ? 'Page' : 'صفحة',
    of: language === 'en' ? 'of' : 'من',
    skipLogicInfo: language === 'en' ? 'This survey uses dynamic questions' : 'يستخدم هذا الاستطلاع أسئلة ديناميكية',
    skipLogicDesc: language === 'en'
      ? 'Some questions may appear or disappear based on your answers.'
      : 'قد تظهر أو تختفي بعض الأسئلة بناءً على إجاباتك.',
    validationError: language === 'en' ? 'Validation Error' : 'خطأ في التحقق',
    requiredField: language === 'en' ? 'is required' : 'مطلوب',
    success: language === 'en' ? 'Success' : 'نجح',
    submitSuccess: language === 'en' ? 'Survey submitted successfully!' : 'تم إرسال الاستطلاع بنجاح!',
    submitError: language === 'en' ? 'Failed to submit survey' : 'فشل إرسال الاستطلاع',
    loadError: language === 'en' ? 'Failed to load survey form' : 'فشل تحميل نموذج الاستطلاع',
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
        name: language === 'en' ? 'Beneficiary Satisfaction Survey' : 'استطلاع رضا المستفيدين',
        description: language === 'en'
          ? 'Help us improve our services by sharing your feedback'
          : 'ساعدنا في تحسين خدماتنا من خلال مشاركة ملاحظاتك',
        skipLogicRules: [],
      };

      const mockQuestions: Question[] = [
        {
          id: 'q1',
          type: 'text',
          label: language === 'en' ? 'What is your name?' : 'ما اسمك؟',
          required: true,
        },
        {
          id: 'q2',
          type: 'choice',
          label: language === 'en' ? 'How satisfied are you with our services?' : 'كم أنت راضٍ عن خدماتنا؟',
          required: true,
          options: language === 'en'
            ? ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied']
            : ['راضٍ جداً', 'راضٍ', 'محايد', 'غير راضٍ', 'غير راضٍ جداً'],
        },
        {
          id: 'q3',
          type: 'rating',
          label: language === 'en' ? 'Rate your overall experience' : 'قيم تجربتك الإجمالية',
          required: true,
        },
        {
          id: 'q4',
          type: 'yes_no',
          label: language === 'en' ? 'Would you recommend us to others?' : 'هل توصي بنا للآخرين؟',
          required: true,
        },
        {
          id: 'q5',
          type: 'text',
          label: language === 'en' ? 'Additional comments or suggestions' : 'تعليقات أو اقتراحات إضافية',
          description: language === 'en' ? 'Optional feedback' : 'ملاحظات اختيارية',
          required: false,
        },
      ];

      setForm(mockForm);
      setQuestions(mockQuestions);
    } catch (error) {
      alert(t.loadError);
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
        alert(`${t.validationError}: "${question.label}" ${t.requiredField}`);
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
      alert(t.submitSuccess);
      window.history.back();
    } catch (error) {
      alert(t.submitError);
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
            placeholder={t.enterAnswer}
            className={`w-full px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              isRTL ? 'text-right' : 'text-left'
            }`}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={(value as string) || ''}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            placeholder={t.enterNumber}
            className={`w-full px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              isRTL ? 'text-right' : 'text-left'
            }`}
          />
        );

      case 'choice':
        return (
          <div className="space-y-2">
            {question.options?.map((option) => (
              <button
                key={option}
                onClick={() => handleResponseChange(question.id, option)}
                className={`w-full p-3 rounded-lg border flex items-center transition-colors ${
                  value === option
                    ? 'bg-blue-600 border-blue-600'
                    : 'bg-white border-gray-300 hover:bg-gray-50'
                } ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isRTL ? 'ml-3' : 'mr-3'
                  }`}
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
          <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {[t.yes, t.no].map((option) => (
              <button
                key={option}
                onClick={() => handleResponseChange(question.id, option)}
                className={`flex-1 p-3 rounded-lg border transition-colors ${
                  value === option
                    ? 'bg-blue-600 border-blue-600'
                    : 'bg-white border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span
                  className={`font-semibold ${
                    value === option ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {option}
                </span>
              </button>
            ))}
          </div>
        );

      case 'rating':
        return (
          <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
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
          <div className={`flex gap-2 justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                onClick={() => handleResponseChange(question.id, rating.toString())}
                className={`flex-1 p-3 rounded-lg border transition-colors ${
                  value === rating.toString()
                    ? 'bg-blue-600 border-blue-600'
                    : 'bg-white border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span
                  className={`font-semibold ${
                    value === rating.toString() ? 'text-white' : 'text-gray-900'
                  }`}
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
            {language === 'en' ? 'Question type not supported' : 'نوع السؤال غير مدعوم'}
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
      {/* Header */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
          <h1 className="text-2xl font-bold text-gray-900">{form?.name}</h1>
          {form?.description && (
            <p className="text-sm text-gray-600 mt-2">{form.description}</p>
          )}
        </div>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <span className="text-sm font-semibold text-blue-600">{t.back}</span>
        </button>
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
              <div className={isRTL ? 'text-right' : 'text-left'}>
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
          className={`p-3 rounded-lg bg-white border-l-4 border-blue-600 ${
            isRTL ? 'border-l-0 border-r-4' : ''
          }`}
        >
          <div className={`flex items-start gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-xs font-semibold text-blue-600">{t.skipLogicInfo}</p>
              <p className="text-xs text-gray-600 mt-1">{t.skipLogicDesc}</p>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className={`px-4 py-2 rounded-lg transition-colors ${
              currentPage === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <span className="font-semibold flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" /> {t.previous}
            </span>
          </button>

          <span className="text-gray-600">
            {t.page} {currentPage + 1} {t.of} {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage === totalPages - 1}
            className={`px-4 py-2 rounded-lg transition-colors ${
              currentPage === totalPages - 1
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <span className="font-semibold flex items-center gap-2">
              {t.next} <ChevronRight className="w-4 h-4" />
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
          <span className="font-semibold text-white text-base">{t.submitSurvey}</span>
        )}
      </button>
    </div>
  );
}
