/**
 * ============================================================================
 * INTERVIEW SCHEDULING - REFACTORED FOR tRPC
 * ============================================================================
 * 
 * Schedule interviews with:
 * - Job selection
 * - Candidate selection
 * - Interview details
 * - Bilingual support (EN/AR)
 * - RTL/LTR support
 * 
 * ============================================================================
 */

import { useState } from 'react';
import { AlertCircle, Loader2, Plus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/TranslationProvider';
import { toast } from 'sonner';
import { InterviewScheduleForm } from './InterviewScheduleForm';

interface Props {
  language: string;
  isRTL: boolean;
}

export function InterviewScheduling({ language, isRTL }: Props) {
  const t = useTranslation();
  const { user } = useAuth();
  const { isRTL: contextIsRTL } = useLanguage();
  const dir = isRTL || contextIsRTL ? 'rtl' : 'ltr';

  // State
  const [selectedJobId, setSelectedJobId] = useState<number | undefined>();
  const [showForm, setShowForm] = useState(false);

  // tRPC queries
  const { data: jobsData, isLoading: jobsLoading } = trpc.hrRecruitment.getAllVacancies.useQuery({
    status: 'open',
    limit: 100,
    offset: 0,
  });

  const { data: candidatesData, isLoading: candidatesLoading } = trpc.hrRecruitment.getAllCandidates.useQuery(
    { jobId: selectedJobId, limit: 100, offset: 0 },
    { enabled: !!selectedJobId }
  );

  const {
  data: interviewsData,
  isLoading: interviewsLoading,
  refetch: refetchInterviews,
} = trpc.hrRecruitment.getInterviewsByJob.useQuery(
  {
    jobId: selectedJobId ?? 0,
  },
  {
    enabled: !!selectedJobId,
  }
);

  // Translations
  const localT = {
    title: t.hrRecruitment?.interviewScheduling || 'Interview Scheduling',
    selectJob: t.hrRecruitment?.selectJob || 'Select Job',
    selectCandidate: t.hrRecruitment?.selectCandidate || 'Select Candidate',
    scheduleInterview: t.hrRecruitment?.scheduleInterview || 'Schedule Interview',
    noJobsSelected: t.hrRecruitment?.noJobsSelected || 'Please select a job first',
    noCandidates: t.hrRecruitment?.noCandidates || 'No candidates available',
    upcomingInterviews: t.hrRecruitment?.upcomingInterviews || 'Upcoming Interviews',
    noInterviews: t.hrRecruitment?.noInterviews || 'No interviews scheduled',
    candidate: t.hrRecruitment?.candidate || 'Candidate',
    interviewType: t.hrRecruitment?.interviewType || 'Interview Type',
    interviewDate: t.hrRecruitment?.interviewDate || 'Interview Date',
    interviewTime: t.hrRecruitment?.interviewTime || 'Interview Time',
    panelMembers: t.hrRecruitment?.panelMembers || 'Panel Members',
    loading: t.common?.loading || 'Loading...',
  };

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{localT.title}</h2>
        <button
          onClick={() => setShowForm(true)}
          disabled={!selectedJobId}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          {localT.scheduleInterview}
        </button>
      </div>

      {/* Job Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {localT.selectJob}
        </label>
        <select
          value={selectedJobId || ''}
          onChange={(e) => setSelectedJobId(e.target.value ? parseInt(e.target.value) : undefined)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">-- {localT.selectJob} --</option>
          {jobsLoading ? (
            <option disabled>{localT.loading}</option>
          ) : (
            jobsData?.map((job) => (
              <option key={job.id} value={job.id}>
                {job.jobTitle} ({job.jobCode || 'N/A'})
              </option>
            ))
          )}
        </select>
      </div>

      {/* Candidates List */}
      {selectedJobId && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{localT.selectCandidate}</h3>
          
          {candidatesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : !candidatesData || candidatesData.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">{localT.noCandidates}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {candidatesData.map((candidate) => (
                <div
                  key={candidate.id}
                  className="p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer"
                  onClick={() => {
                    // TODO: Pre-fill form with candidate
                    setShowForm(true);
                  }}
                >
                  <p className="font-medium text-gray-900">
                    {candidate.firstName} {candidate.lastName}
                  </p>
                  <p className="text-sm text-gray-600">{candidate.email}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upcoming Interviews */}
      {selectedJobId && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{localT.upcomingInterviews}</h3>
          
          {interviewsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : !interviewsData || interviewsData.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">{localT.noInterviews}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-start">
                      {localT.candidate}
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-start">
                      {localT.interviewType}
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-start">
                      {localT.interviewDate}
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-start">
                      {localT.interviewTime}
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-start">
                      {localT.panelMembers}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {interviewsData.map((interview) => (
                    <tr key={interview.candidateId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {/* TODO: Display candidate name */}
                        Candidate
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {interview.interviewType || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {interview.interviewDate ? new Date(interview.interviewDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {interview.interviewTime || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {typeof interview.panelMembers === 'string'
                        ? interview.panelMembers
                        : JSON.stringify(interview.panelMembers)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Interview Form Modal */}
      {showForm && selectedJobId && (
        <InterviewScheduleForm
          language={language}
          isRTL={isRTL}
          jobId={selectedJobId}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            refetchInterviews();
          }}
        />
      )}
    </div>
  );
}
