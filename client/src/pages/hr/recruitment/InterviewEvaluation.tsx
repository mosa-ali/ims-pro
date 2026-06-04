/**
 * ============================================================================
 * INTERVIEW EVALUATION - REFACTORED FOR tRPC
 * ============================================================================
 * 
 * Rate and evaluate interviews with:
 * - Candidate selection
 * - Interview rating
 * - Evaluation notes
 * - Bilingual support (EN/AR)
 * - RTL/LTR support
 * 
 * ============================================================================
 */

import { useState } from 'react';
import { Loader2, AlertCircle, Star } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { toast } from 'sonner';
import { InterviewEvaluationForm } from './InterviewEvaluationForm';

interface Props {
  language: string;
  isRTL: boolean;
}

export function InterviewEvaluation({ language, isRTL }: Props) {
  const { t } = useTranslation();
  const { isRTL: contextIsRTL } = useLanguage();
  const dir = isRTL || contextIsRTL ? 'rtl' : 'ltr';

  const [selectedCandidateId, setSelectedCandidateId] = useState<number | undefined>();
  const [selectedInterviewId, setSelectedInterviewId] = useState<number | undefined>();
  const [showForm, setShowForm] = useState(false);

  // tRPC queries
  const { data: candidatesData, isLoading: candidatesLoading } = trpc.hrRecruitment.getAllCandidates.useQuery({
    limit: 100,
    offset: 0,
  });

  const { data: interviewsData, isLoading: interviewsLoading, error } = trpc.hrRecruitment.getInterviewsByCandidate.useQuery(
    selectedCandidateId || 0,
    { enabled: !!selectedCandidateId }
  );

  const { data: selectedInterview, isLoading: interviewDetailLoading } = trpc.hrRecruitment.getInterviewsByCandidate.useQuery(
    selectedInterviewId || 0,
    { enabled: !!selectedInterviewId }
  );

  // Translations
  const localT = {
    title: t.hrRecruitment?.interviewEvaluation || 'Interview Evaluation',
    selectCandidate: t.hrRecruitment?.selectCandidate || 'Select Candidate',
    selectInterview: t.hrRecruitment?.selectInterview || 'Select Interview',
    interviewDate: t.hrRecruitment?.interviewDate || 'Interview Date',
    interviewTime: t.hrRecruitment?.interviewTime || 'Interview Time',
    interviewType: t.hrRecruitment?.interviewType || 'Interview Type',
    feedbackScore: t.hrRecruitment?.feedbackScore || 'Feedback Score',
    notes: t.hrRecruitment?.notes || 'Notes',
    evaluate: t.hrRecruitment?.evaluate || 'Evaluate',
    noInterviews: t.hrRecruitment?.noInterviews || 'No interviews found',
    loading: t.common?.loading || 'Loading...',
  };

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{localT.title}</h2>
      </div>

      {/* Candidate Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {localT.selectCandidate}
        </label>
        <select
          value={selectedCandidateId || ''}
          onChange={(e) => {
            setSelectedCandidateId(e.target.value ? parseInt(e.target.value) : undefined);
            setSelectedInterviewId(undefined);
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">-- {localT.selectCandidate} --</option>
          {candidatesLoading ? (
            <option disabled>{localT.loading}</option>
          ) : (
            candidatesData?.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.firstName} {candidate.lastName}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Interviews List */}
      {selectedCandidateId && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{localT.selectInterview}</h3>

          {interviewsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">{t.common?.error || 'Error'}</p>
                <p className="text-sm text-red-700">{error.message}</p>
              </div>
            </div>
          ) : !interviewsData || interviewsData.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">{localT.noInterviews}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {interviewsData.map((interview) => (
                <div
                  key={interview.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedInterviewId === interview.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                  }`}
                  onClick={() => setSelectedInterviewId(interview.id)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{interview.interviewType || 'Interview'}</p>
                      <p className="text-sm text-gray-600">
                        {interview.interviewDate ? new Date(interview.interviewDate).toLocaleDateString() : 'N/A'} at{' '}
                      </p>
                    </div>
                    {interview.feedbackScore && (
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < interview.feedbackScore ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Evaluation Form */}
      {selectedInterviewId && selectedInterview && (
        <InterviewEvaluationForm
          language={language}
          isRTL={isRTL}
          interview={selectedInterview}
          onSuccess={() => {
            toast.success(t.hrRecruitment?.evaluationSaved || 'Evaluation saved successfully');
            setSelectedInterviewId(undefined);
          }}
        />
      )}
    </div>
  );
}
