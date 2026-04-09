/**
 * ============================================================================
 * SURVEY FORM PREVIEW
 * ============================================================================
 * 
 * Read-only preview of survey form as it appears to respondents
 * 
 * FEATURES:
 * - Loads ACTUAL survey data from localStorage
 * - Displays real questions from the selected survey
 * - Read-only form preview
 * - Preview mode indicator
 * - Submit button (disabled)
 * - Bilingual support (EN/AR) with RTL
 * 
 * ============================================================================
 */

import { useNavigate } from '@/lib/router-compat';
import { useSearch } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { FormPreview } from '@/components/FormPreview';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export function SurveyFormPreview() {
 const { t } = useTranslation();
 const navigate = useNavigate();
 const searchString = useSearch();
 const searchParams = new URLSearchParams(searchString);
 const { language, isRTL } = useLanguage();
 
 const surveyId = searchParams.get('surveyId') || '';
 const projectId = searchParams.get('projectId') || '';
 
 const [surveyData, setSurveyData] = useState<any>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 const labels = {
 title: t.mealSurvey.formPreview5,
 subtitle: t.mealSurvey.readonlyViewOfTheSurveyForm,
 back: t.mealSurvey.back,
 loading: t.mealSurvey.loadingSurvey,
 error: t.mealSurvey.errorLoadingSurvey,
 noQuestions: t.mealSurvey.thisSurveyHasNoQuestionsYet,
 surveyNotFound: t.mealSurvey.surveyNotFound6,
 };

 // ✅ Load actual survey data from localStorage
 useEffect(() => {
 if (!surveyId) {
 setError(labels.surveyNotFound);
 setLoading(false);
 return;
 }

 try {
 // 1. Load survey metadata
 const surveysKey = 'meal_surveys';
 const storedSurveys = localStorage.getItem(surveysKey);
 
 if (!storedSurveys) {
 setError(labels.surveyNotFound);
 setLoading(false);
 return;
 }

 const surveys = JSON.parse(storedSurveys);
 const survey = surveys.find((s: any) => s.id === surveyId);
 
 if (!survey) {
 setError(labels.surveyNotFound);
 setLoading(false);
 return;
 }

 // 2. Load survey questions
 const questionsKey = `survey_questions_${surveyId}`;
 const storedQuestions = localStorage.getItem(questionsKey);
 
 let questions = [];
 let formStyle = 'default';
 
 if (storedQuestions) {
 try {
 const questionsData = JSON.parse(storedQuestions);
 questions = questionsData.questions || [];
 formStyle = questionsData.formStyle || 'default';
 } catch (err) {
 console.error('Error parsing questions:', err);
 }
 }

 setSurveyData({
 id: survey.id,
 title: survey.name,
 description: survey.description,
 questions: questions,
 formStyle: formStyle,
 });
 setLoading(false);
 } catch (err) {
 console.error('Error loading survey:', err);
 setError(labels.error);
 setLoading(false);
 }
 }, [surveyId]);

 if (loading) {
 return (
 <div className="flex items-center justify-center min-h-screen" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="text-center">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
 <p className="text-gray-600">{labels.loading}</p>
 </div>
 </div>
 );
 }

 if (error || !surveyData) {
 return (
 <div className="max-w-3xl mx-auto p-6">
 <BackButton onClick={() => navigate('/organization/meal/survey')} label={t.mealSurvey.backToSurveys} />
 <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
 <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
 <h2 className="text-lg font-bold text-red-900 mb-2">{labels.error}</h2>
 <p className="text-sm text-red-700 mb-4">{error}</p>
 </div>
 </div>
 );
 }

 if (surveyData.questions.length === 0) {
 return (
 <div className="max-w-3xl mx-auto p-6">
 <BackButton onClick={() => navigate('/organization/meal/survey')} label={t.mealSurvey.backToSurveys} />
 <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
 <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
 <h2 className="text-lg font-bold text-yellow-900 mb-2">{labels.noQuestions}</h2>
 </div>
 </div>
 );
 }

 // ✅ Use the FormPreview component with ACTUAL survey data
 return (
 <div>
 {/* Back Navigation */}
 <BackButton onClick={() => navigate('/organization/meal/survey')} label={t.mealSurvey.backToSurveys} />
 <FormPreview
 surveyTitle={surveyData.title}
 surveyId={surveyData.id}
 projectId={projectId}
 questions={surveyData.questions}
 formStyle={surveyData.formStyle}
 onClose={() => navigate('/organization/meal/survey')}
 isRTL={isRTL}
 language={language}
 />
 </div>
 );
}
