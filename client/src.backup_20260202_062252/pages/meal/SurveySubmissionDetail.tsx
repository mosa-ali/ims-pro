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

import { useLocation, useSearch, useParams } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect } from 'react';
import { Download, Check, X, ArrowLeft } from 'lucide-react';
import { surveyService } from '@/services/mealService';

export function SurveySubmissionDetail() {
  const [, navigate] = useLocation();
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

  const t = {
    title: language === 'en' ? 'Submission Detail' : 'تفاصيل التقديم',
    id: language === 'en' ? 'ID' : 'المعرف',
    back: language === 'en' ? 'Back to Data Table' : 'رجوع إلى جدول البيانات',
    submittedBy: language === 'en' ? 'Submitted by' : 'قدم بواسطة',
    approved: language === 'en' ? 'Approved' : 'موافق عليه',
    pending: language === 'en' ? 'Pending' : 'معلق',
    rejected: language === 'en' ? 'Rejected' : 'مرفوض',
    date: language === 'en' ? 'Date' : 'التاريخ',
    time: language === 'en' ? 'Time' : 'الوقت',
    location: language === 'en' ? 'Location' : 'الموقع',
    gps: language === 'en' ? 'GPS' : 'نظام تحديد المواقع',
    device: language === 'en' ? 'Device' : 'الجهاز',
    responses: language === 'en' ? 'Responses' : 'الإجابات',
    verification: language === 'en' ? 'Verification' : 'التحقق',
    verificationNotes: language === 'en' ? 'Verification Notes' : 'ملاحظات التحقق',
    notesPlaceholder: language === 'en' ? 'Add notes about this submission...' : 'أضف ملاحظات حول هذا التقديم...',
    approve: language === 'en' ? 'Approve' : 'موافقة',
    reject: language === 'en' ? 'Reject' : 'رفض',
    verifiedConfirmation: language === 'en' ? 'Submission Verified' : 'تم التحقق من التقديم',
    verifiedDesc: language === 'en' ? 'This submission has been verified and is ready for analysis.' : 'تم التحقق من هذا التقديم وهو جاهز للتحليل.',
    exportSubmission: language === 'en' ? 'Export Submission' : 'تصدير التقديم',
    validationError: language === 'en' ? 'Validation Error' : 'خطأ في التحقق',
    approveSuccess: language === 'en' ? 'Submission approved successfully' : 'تم الموافقة على التقديم بنجاح',
    rejectPrompt: language === 'en' ? 'Enter rejection reason:' : 'أدخل سبب الرفض:',
    rejectSuccess: language === 'en' ? 'Submission rejected' : 'تم رفض التقديم',
    exportSuccess: language === 'en' ? 'Exporting submission data...' : 'تصدير بيانات التقديم...',
    loading: language === 'en' ? 'Loading submission...' : 'جاري تحميل التقديم...',
    notFound: language === 'en' ? 'Submission not found' : 'التقديم غير موجود',
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
      alert(t.approveSuccess);
      
      // Navigate back to data table
      navigate(`/meal/survey/detail/${surveyId}?projectId=${projectId}&tab=data&subtab=table`);
    } catch (error) {
      console.error('Error approving submission:', error);
    }
  };

  // ✅ Handle reject with proper localStorage update
  const handleReject = () => {
    if (!submission) return;

    const reason = window.prompt(t.rejectPrompt);
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
      alert(t.rejectSuccess);
      
      // Navigate back to data table
      navigate(`/meal/survey/detail/${surveyId}?projectId=${projectId}&tab=data&subtab=table`);
    } catch (error) {
      console.error('Error rejecting submission:', error);
    }
  };

  const handleExport = () => {
    alert(t.exportSuccess);
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
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t.loading}</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (!submission) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.notFound}</h3>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {t.back}
        </button>
      </div>
    );
  }

  const validationStatus = submission.validationStatus || 'pending';
  const isApproved = validationStatus === 'approved';
  const isRejected = validationStatus === 'rejected';
  const isPending = validationStatus === 'pending';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`flex items-center gap-4 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button
          onClick={() => navigate(`/meal/survey/detail/${surveyId}?projectId=${projectId}&tab=data&subtab=table`)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
          <span className="text-sm font-medium text-gray-700">{t.back}</span>
        </button>
        <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
          <h1 className="text-2xl font-bold text-gray-900">{survey?.name || t.title}</h1>
          <p className="text-sm text-gray-600 mt-1">
            {t.submittedBy}: {submission.submittedBy}
          </p>
        </div>
      </div>

      {/* Submission Metadata */}
      <div className="p-6 rounded-lg bg-white border border-gray-200 space-y-4">
        <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <h2 className="text-lg font-bold text-gray-900">{survey?.name}</h2>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              isApproved ? 'bg-green-100 text-green-700' :
              isRejected ? 'bg-red-100 text-red-700' :
              'bg-yellow-100 text-yellow-700'
            }`}
          >
            {isApproved && `✓ ${t.approved}`}
            {isRejected && `✗ ${t.rejected}`}
            {isPending && `⏳ ${t.pending}`}
          </span>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <span className="text-xs text-gray-600 block mb-1">{t.date}</span>
            <span className="text-sm font-semibold text-gray-900">
              {new Date(submission.submittedAt).toLocaleDateString()}
            </span>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <span className="text-xs text-gray-600 block mb-1">{t.time}</span>
            <span className="text-sm font-semibold text-gray-900">
              {new Date(submission.submittedAt).toLocaleTimeString()}
            </span>
          </div>
          {submission.location && (
            <>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <span className="text-xs text-gray-600 block mb-1">{t.location}</span>
                <span className="text-sm font-semibold text-gray-900">
                  {submission.location.governorate || 'N/A'}
                </span>
              </div>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <span className="text-xs text-gray-600 block mb-1">{t.gps}</span>
                <span className="text-sm font-semibold text-gray-900">
                  {submission.location.latitude.toFixed(4)}, {submission.location.longitude.toFixed(4)}
                </span>
              </div>
            </>
          )}
          {submission.metadata?.deviceId && (
            <div className={`col-span-2 ${isRTL ? 'text-right' : 'text-left'}`}>
              <span className="text-xs text-gray-600 block mb-1">{t.device}</span>
              <span className="text-sm font-semibold text-gray-900">
                {submission.metadata.deviceId}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Responses */}
      <div className="space-y-3">
        <h2 className={`text-lg font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.responses}
        </h2>
        {submission.responses?.map((response: any, index: number) => (
          <div key={response.questionId || index} className="p-4 rounded-lg bg-white border border-gray-200">
            <p className={`text-xs font-semibold text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              Q{String(index + 1).padStart(3, '0')}
            </p>
            <p className={`text-sm font-semibold text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
              {getQuestionLabel(response.questionId)}
            </p>
            <div className="px-3 py-2 rounded-lg bg-blue-50">
              <p className={`text-sm text-blue-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                {Array.isArray(response.value) ? response.value.join(', ') : response.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Verification Section */}
      {isPending && (
        <div className="p-6 rounded-lg bg-white border border-gray-200 space-y-4">
          <h2 className={`text-lg font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.verification}
          </h2>

          <div>
            <label className={`text-sm font-semibold text-gray-900 mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.verificationNotes}
            </label>
            <textarea
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              placeholder={t.notesPlaceholder}
              rows={4}
              className={`w-full px-4 py-3 rounded-lg text-base bg-gray-50 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                isRTL ? 'text-right' : 'text-left'
              }`}
            />
          </div>

          <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={handleApprove}
              className="flex-1 py-3 rounded-lg bg-green-600 hover:bg-green-700 transition-colors"
            >
              <span className="font-semibold text-white flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> {t.approve}
              </span>
            </button>
            <button
              onClick={handleReject}
              className="flex-1 py-3 rounded-lg bg-white border border-red-300 hover:bg-red-50 transition-colors"
            >
              <span className="font-semibold text-red-600 flex items-center justify-center gap-2">
                <X className="w-4 h-4" /> {t.reject}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Verified/Rejected Confirmation */}
      {(isApproved || isRejected) && (
        <div className={`p-4 rounded-lg border ${isApproved ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className={`text-sm font-semibold text-gray-900 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            {isApproved ? `✓ ${t.verifiedConfirmation}` : `✗ ${t.rejected}`}
          </p>
          <p className={`text-xs text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
            {isApproved ? t.verifiedDesc : submission.validationComment}
          </p>
          {submission.validationComment && isApproved && (
            <p className={`text-xs text-gray-600 mt-2 italic ${isRTL ? 'text-right' : 'text-left'}`}>
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
          <Download className="w-4 h-4" /> {t.exportSubmission}
        </span>
      </button>
    </div>
  );
}
