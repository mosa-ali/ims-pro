/**
 * ============================================================================
 * SURVEY FORM PREVIEW - MIGRATED TO tRPC
 * ============================================================================
 * 
 * Migrated from localStorage to tRPC backend
 * Read-only preview of survey form as it appears to respondents
 * 
 * FEATURES:
 * - Loads survey data from tRPC backend
 * - Displays real questions from the selected survey
 * - Read-only form preview
 * - Preview mode indicator
 * - Submit button (disabled)
 * - Bilingual support (EN/AR) with RTL
 * - Automatic data isolation (organizationId + operatingUnitId)
 * 
 * ============================================================================
 */

import { useNavigate } from '@/lib/router-compat';
import { useSearch } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { FormPreview } from '@/components/FormPreview';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";
import { trpc } from "@/lib/trpc";

export function SurveyFormPreview() {
 const { t } = useTranslation();
 const navigate = useNavigate();
 const searchString = useSearch();
 const searchParams = new URLSearchParams(searchString);
 const { language, isRTL } = useLanguage();
 
 const surveyId = searchParams.get('surveyId') ? parseInt(searchParams.get('surveyId')!) : null;
 const projectId = searchParams.get('projectId') || '';
 
 const [surveyData, setSurveyData] = useState<any>(null);
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

 // ✅ TRPC: Load survey data from backend
 const { data: survey, isLoading: surveyLoading, error: surveyError } = trpc.mealSurveys.getById.useQuery(
   { id: surveyId! },
   { enabled: !!surveyId }
 );

 // ✅ TRPC: Load survey questions from backend
  const { data: questions, isLoading: questionsLoading } = surveyId
  ? trpc.mealSurveys.questions.getBySurvey.useQuery({ surveyId })
  : { data: [], isLoading: false };

 // ✅ Build survey data from tRPC responses
 useEffect(() => {
   if (!surveyId) {
     setError(labels.surveyNotFound);
     return;
   }

   if (surveyError) {
     setError(labels.surveyNotFound);
     return;
   }

   if (survey && questions) {
     try {
       setSurveyData({
         id: survey.id,
         title: survey.title,
         description: survey.description,
         questions: questions || [],
       });
       setError(null);
     } catch (err) {
       console.error('Error building survey data:', err);
       setError(labels.error);
     }
   }
 }, [survey, questions, surveyId, surveyError, labels]);

 const isLoading = surveyLoading || questionsLoading;

 if (!surveyId) {
   return (
     <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
       <div className="max-w-4xl mx-auto px-4 py-6">
         <div className="flex items-center gap-4 mb-6">
           <BackButton />
           <h1 className="text-3xl font-bold">{labels.title}</h1>
         </div>
         <div className="bg-white rounded-lg shadow p-6">
           <div className="flex items-center gap-4 text-red-600">
             <AlertCircle className="w-6 h-6" />
             <p>{labels.surveyNotFound}</p>
           </div>
         </div>
       </div>
     </div>
   );
 }

 if (isLoading) {
   return (
     <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
       <div className="max-w-4xl mx-auto px-4 py-6">
         <div className="flex items-center gap-4 mb-6">
           <BackButton />
           <h1 className="text-3xl font-bold">{labels.title}</h1>
         </div>
         <div className="bg-white rounded-lg shadow p-12 flex items-center justify-center">
           <div className="text-center">
             <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
             <p className="text-gray-600">{labels.loading}</p>
           </div>
         </div>
       </div>
     </div>
   );
 }

 if (error) {
   return (
     <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
       <div className="max-w-4xl mx-auto px-4 py-6">
         <div className="flex items-center gap-4 mb-6">
           <BackButton />
           <h1 className="text-3xl font-bold">{labels.title}</h1>
         </div>
         <div className="bg-white rounded-lg shadow p-6">
           <div className="flex items-center gap-4 text-red-600">
             <AlertCircle className="w-6 h-6" />
             <p>{error}</p>
           </div>
         </div>
       </div>
     </div>
   );
 }

 if (!surveyData) {
   return (
     <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
       <div className="max-w-4xl mx-auto px-4 py-6">
         <div className="flex items-center gap-4 mb-6">
           <BackButton />
           <h1 className="text-3xl font-bold">{labels.title}</h1>
         </div>
         <div className="bg-white rounded-lg shadow p-6">
           <div className="flex items-center gap-4 text-amber-600">
             <AlertCircle className="w-6 h-6" />
             <p>{labels.noQuestions}</p>
           </div>
         </div>
       </div>
     </div>
   );
 }

 return (
   <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
     <div className="max-w-4xl mx-auto px-4 py-6">
       {/* Header */}
       <div className="flex items-center gap-4 mb-6">
         <BackButton />
         <div>
           <h1 className="text-3xl font-bold">{labels.title}</h1>
           <p className="text-gray-600 mt-1">{labels.subtitle}</p>
         </div>
       </div>

       {/* Preview Badge */}
       <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
         <p className="text-blue-800 text-sm font-medium">
           📋 Preview Mode - This is how respondents will see your survey
         </p>
       </div>

       {/* Survey Preview */}
       <div className="bg-white rounded-lg shadow p-8">
         <div className="mb-8">
           <h2 className="text-2xl font-bold mb-2">{surveyData.title}</h2>
           {surveyData.description && (
             <p className="text-gray-600">{surveyData.description}</p>
           )}
         </div>

         {/* Questions */}
         {surveyData.questions && surveyData.questions.length > 0 ? (
           <div className="space-y-8">
             {surveyData.questions.map((question: any, index: number) => (
               <div key={question.id} className="pb-8 border-b last:border-b-0">
                 <div className="flex items-start gap-4">
                   <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
                     {index + 1}
                   </div>
                   <div className="flex-1">
                     <h3 className="text-lg font-semibold mb-1">
                       {question.label}
                       {question.required && (
                         <span className="text-red-500 ml-1">*</span>
                       )}
                     </h3>
                     {question.description && (
                       <p className="text-gray-600 text-sm mb-3">{question.description}</p>
                     )}
                     
                     {/* Question Type Indicator */}
                     <div className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full mb-3">
                       {question.type}
                     </div>

                     {/* Options (if applicable) */}
                     {question.options && question.options.length > 0 && (
                       <div className="mt-3 space-y-2">
                         {question.options.map((option: string, optIndex: number) => (
                           <div key={optIndex} className="flex items-center gap-3">
                             <input
                               type="checkbox"
                               disabled
                               className="w-4 h-4 text-blue-600 rounded cursor-not-allowed"
                             />
                             <label className="text-gray-700 cursor-not-allowed">
                               {option}
                             </label>
                           </div>
                         ))}
                       </div>
                     )}

                     {/* Input Field (disabled) */}
                     {!question.options && (
                       <input
                         type="text"
                         disabled
                         placeholder="Response would appear here"
                         className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                       />
                     )}
                   </div>
                 </div>
               </div>
             ))}
           </div>
         ) : (
           <div className="text-center py-12">
             <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
             <p className="text-gray-500">{labels.noQuestions}</p>
           </div>
         )}

         {/* Submit Button (Disabled) */}
         <div className="mt-8 pt-8 border-t">
           <Button disabled className="w-full">
             Submit (Preview Mode - Disabled)
           </Button>
         </div>
       </div>
     </div>
   </div>
 );
}
