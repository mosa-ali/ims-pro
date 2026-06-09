/**
 * ============================================================================
 * SURVEY SUBMISSION DETAIL
 * ============================================================================
 * 
 * View detailed submission with responses and verification
 * 
 * FEATURES:
 * - View submission metadata
 * - Display all question responses
 * - Verify/reject submission
 * - Add verification notes
 * - Auto-navigate back to table after verification
 * - Bilingual support (EN/AR) with RTL
 * 
 * ============================================================================
 */

import { useNavigate, useParams } from '@/lib/router-compat';
import { useSearch } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect } from 'react';
import { Download, Check, X } from 'lucide-react';
import { surveyService } from '@/services/mealService';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export function SurveySubmissionDetail() {
 const { t } = useTranslation();
 const navigate = useNavigate();
 const { id: submissionId } = useParams<{ id: string }>();
 const searchString = useSearch();
 const searchParams = new URLSearchParams(searchString);
 const { language, isRTL } = useLanguage();
 const [verificationNotes, setVerificationNotes] = useState('');
 const [submission, setSubmission] = useState<any>(null);
 const [survey, setSurvey] = useState<any>(null);
 const [loading, setLoading] = useState(true);

 const surveyId = searchParams.get('surveyId') || '';
 const projectId = searchParams.get('projectId') || '';

 const labels = {
 title: t.mealSurvey.submissionDetail,
 id: t.mealSurvey.id,
 back: t.mealSurvey.backToDataTable,
 submittedBy: t.mealSurvey.submittedBy,
 approved: t.mealSurvey.approved,
 pending: t.mealSurvey.pending19,
 rejected: t.mealSurvey.rejected,
 date: t.mealSurvey.date,
 time: t.mealSurvey.time,
 location: t.mealSurvey.location,
 gps: t.mealSurvey.gps,
 device: t.mealSurvey.device,
 responses: t.mealSurvey.responses,
 verification: t.mealSurvey.verification,
 verificationNotes: t.mealSurvey.verificationNotes,
 notesPlaceholder: t.mealSurvey.addNotesAboutThisSubmission,
 approve: t.mealSurvey.approve,
 reject: t.mealSurvey.reject,
 verifiedConfirmation: t.mealSurvey.submissionVerified,
 verifiedDesc: t.mealSurvey.thisSubmissionHasBeenVerifiedAnd,
 exportSubmission: t.mealSurvey.exportSubmission,
 validationError: t.mealSurvey.validationError,
 approveSuccess: t.mealSurvey.submissionApprovedSuccessfully,
 rejectPrompt: t.mealSurvey.enterRejectionReason,
 rejectSuccess: t.mealSurvey.submissionRejected,
 exportSuccess: t.mealSurvey.exportingSubmissionData,
 loading: t.mealSurvey.loadingSubmission,
 notFound: t.mealSurvey.submissionNotFound,
 };

 // ✅ Load real submission data from localStorage
 useEffect(() => {
 const loadData = () => {
 setLoading(true);
 try {
 // Load survey
 const loadedSurvey = surveyService.getSurveyById(surveyId);
 setSurvey(loadedSurvey);

 // Load submission
 const STORAGE_KEY = 'meal_submissions';
 const storedSubmissions = localStorage.getItem(STORAGE_KEY);
 
 if (storedSubmissions) {
 const allSubmissions = JSON.parse(storedSubmissions);
 const foundSubmission = allSubmissions.find((s: any) => s.id === submissionId);
 
 if (foundSubmission) {
 setSubmission(foundSubmission);
 // Load existing validation comment if any
 if (foundSubmission.validationComment) {
 setVerificationNotes(foundSubmission.validationComment);
 }
 }
 }
 } catch (error) {
 console.error('Error loading submission:', error);
 }
 setLoading(false);
 };

 if (submissionId && surveyId) {
 loadData();
 }
 }, [submissionId, surveyId]);

 // ✅ Handle approve with proper localStorage update
 const handleApprove = () => {
 if (!submission) return;

 try {
 // Update in localStorage
 const STORAGE_KEY = 'meal_submissions';
 const allSubmissions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
 
 const updated = allSubmissions.map((s: any) => {
 if (s.id === submissionId) {
 return {
 ...s,
 validationStatus: 'approved',
 validationComment: verificationNotes || undefined,
 validatedAt: new Date().toISOString(),
 };
 }
 return s;
 });
 
 localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
 
 // Show success and navigate back
 alert(labels.approveSuccess);
 
 // Navigate back to data table
 navigate(`/organization/meal/survey/detail/${surveyId}?projectId=${projectId}&tab=data&subtab=table`);
 } catch (error) {
 console.error('Error approving submission:', error);
 }
 };

 // ✅ Handle reject with proper localStorage update
 const handleReject = () => {
 if (!submission) return;

 const reason = window.prompt(labels.rejectPrompt);
 if (!reason?.trim()) return;

 try {
 // Update in localStorage
 const STORAGE_KEY = 'meal_submissions';
 const allSubmissions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
 
 const updated = allSubmissions.map((s: any) => {
 if (s.id === submissionId) {
 return {
 ...s,
 validationStatus: 'rejected',
 validationComment: reason,
 validatedAt: new Date().toISOString(),
 };
 }
 return s;
 });
 
 localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
 
 // Show success and navigate back
 alert(labels.rejectSuccess);
 
 // Navigate back to data table
 navigate(`/organization/meal/survey/detail/${surveyId}?projectId=${projectId}&tab=data&subtab=table`);
 } catch (error) {
 console.error('Error rejecting submission:', error);
 }
 };

 const handleExport = () => {
 alert(labels.exportSuccess);
 };

 // Get question label
 const getQuestionLabel = (questionId: string) => {
 if (!survey || !survey.questions) return `Question ${questionId}`;
 const question = survey.questions.find((q: any) => q.id === questionId);
 return question?.label || question?.question || `Question ${questionId}`;
 };

 // Loading state
 if (loading) {
 return (
 <div className="flex items-center justify-center py-12" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="text-center">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
 <p className="text-gray-600">{labels.loading}</p>
 </div>
 </div>
 );
 }

 // Not found state
 if (!submission) {
 return (
 <div className="text-center py-12">
 <h3 className="text-lg font-semibold text-gray-900 mb-2">{labels.notFound}</h3>
 </div>
 );
 }

 const validationStatus = submission.validationStatus || 'pending';
 const isApproved = validationStatus === 'approved';
 const isRejected = validationStatus === 'rejected';
 const isPending = validationStatus === 'pending';

 return (
 <div className="space-y-4">
 {/* Back Navigation */}
 <BackButton onClick={() => navigate('/organization/meal/survey/submissions')} label={t.mealSurvey.backToSubmissions} />
 {/* Header */}
 <div className={`flex items-center gap-4 mb-4`}>
 <div className={`flex-1 text-start`}>
 <h1 className="text-2xl font-bold text-gray-900">{survey?.name || labels.title}</h1>
 <p className="text-sm text-gray-600 mt-1">
 {labels.submittedBy}: {submission.submittedBy}
 </p>
 </div>
 </div>

 {/* Submission Metadata */}
 <div className="p-6 rounded-lg bg-white border border-gray-200 space-y-4">
 <div className={`flex items-start justify-between`}>
 <div className={'text-start'}>
 <h2 className="text-lg font-bold text-gray-900">{survey?.name}</h2>
 </div>
 <span
 className={`px-3 py-1 rounded-full text-xs font-semibold ${ isApproved ? 'bg-green-100 text-green-700' : isRejected ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700' }`}
 >
 {isApproved && `✓ ${labels.approved}`}
 {isRejected && `✗ ${labels.rejected}`}
 {isPending && `⏳ ${labels.pending}`}
 </span>
 </div>

 {/* Metadata Grid */}
 <div className="grid grid-cols-2 gap-3">
 <div className={'text-start'}>
 <span className="text-xs text-gray-600 block mb-1">{labels.date}</span>
 <span className="text-sm font-semibold text-gray-900">
 {new Date(submission.submittedAt).toLocaleDateString()}
 </span>
 </div>
 <div className={'text-start'}>
 <span className="text-xs text-gray-600 block mb-1">{labels.time}</span>
 <span className="text-sm font-semibold text-gray-900">
 {new Date(submission.submittedAt).toLocaleTimeString()}
 </span>
 </div>
 {submission.location && (
 <>
 <div className={'text-start'}>
 <span className="text-xs text-gray-600 block mb-1">{labels.location}</span>
 <span className="text-sm font-semibold text-gray-900">
 {submission.location.governorate || 'N/A'}
 </span>
 </div>
 <div className={'text-start'}>
 <span className="text-xs text-gray-600 block mb-1">{labels.gps}</span>
 <span className="text-sm font-semibold text-gray-900">
 {submission.location.latitude.toFixed(4)}, {submission.location.longitude.toFixed(4)}
 </span>
 </div>
 </>
 )}
 {submission.metadata?.deviceId && (
 <div className={`col-span-2 text-start`}>
 <span className="text-xs text-gray-600 block mb-1">{labels.device}</span>
 <span className="text-sm font-semibold text-gray-900">
 {submission.metadata.deviceId}
 </span>
 </div>
 )}
 </div>
 </div>

 {/* Responses */}
 <div className="space-y-3">
 <h2 className={`text-lg font-bold text-gray-900 text-start`}>
 {labels.responses}
 </h2>
 {submission.responses?.map((response: any, index: number) => (
 <div key={response.questionId || index} className="p-4 rounded-lg bg-white border border-gray-200">
 <p className={`text-xs font-semibold text-gray-600 mb-1 text-start`}>
 Q{String(index + 1).padStart(3, '0')}
 </p>
 <p className={`text-sm font-semibold text-gray-900 mb-2 text-start`}>
 {getQuestionLabel(response.questionId)}
 </p>
 <div className="px-3 py-2 rounded-lg bg-blue-50">
 <p className={`text-sm text-blue-900 text-start`}>
 {Array.isArray(response.value) ? response.value.join(', ') : response.value}
 </p>
 </div>
 </div>
 ))}
 </div>

 {/* Verification Section */}
 {isPending && (
 <div className="p-6 rounded-lg bg-white border border-gray-200 space-y-4">
 <h2 className={`text-lg font-bold text-gray-900 text-start`}>
 {labels.verification}
 </h2>

 <div>
 <label className={`text-sm font-semibold text-gray-900 mb-2 block text-start`}>
 {labels.verificationNotes}
 </label>
 <textarea
 value={verificationNotes}
 onChange={(e) => setVerificationNotes(e.target.value)}
 placeholder={labels.notesPlaceholder}
 rows={4}
 className={`w-full px-4 py-3 rounded-lg text-base bg-gray-50 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${ 'text-start' }`}
 />
 </div>

 <div className={`flex gap-3`}>
 <button
 onClick={handleApprove}
 className="flex-1 py-3 rounded-lg bg-green-600 hover:bg-green-700 transition-colors"
 >
 <span className="font-semibold text-white flex items-center justify-center gap-2">
 <Check className="w-4 h-4" /> {labels.approve}
 </span>
 </button>
 <button
 onClick={handleReject}
 className="flex-1 py-3 rounded-lg bg-white border border-red-300 hover:bg-red-50 transition-colors"
 >
 <span className="font-semibold text-red-600 flex items-center justify-center gap-2">
 <X className="w-4 h-4" /> {labels.reject}
 </span>
 </button>
 </div>
 </div>
 )}

 {/* Verified/Rejected Confirmation */}
 {(isApproved || isRejected) && (
 <div className={`p-4 rounded-lg border ${isApproved ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
 <p className={`text-sm font-semibold text-gray-900 mb-1 text-start`}>
 {isApproved ? `✓ ${labels.verifiedConfirmation}` : `✗ ${labels.rejected}`}
 </p>
 <p className={`text-xs text-gray-600 text-start`}>
 {isApproved ? labels.verifiedDesc : submission.validationComment}
 </p>
 {submission.validationComment && isApproved && (
 <p className={`text-xs text-gray-600 mt-2 italic text-start`}>
 {submission.validationComment}
 </p>
 )}
 </div>
 )}

 {/* Export Button */}
 <button
 onClick={handleExport}
 className="w-full rounded-lg py-4 bg-blue-600 hover:bg-blue-700 transition-colors"
 >
 <span className="font-semibold text-white flex items-center justify-center gap-2">
 <Download className="w-4 h-4" /> {labels.exportSubmission}
 </span>
 </button>
 </div>
 );
}
