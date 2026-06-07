/**
 * ============================================================================
 * INTERVIEW LIST - REFACTORED FOR tRPC
 * ============================================================================
 * 
 * Display interviews with:
 * - Job filtering
 * - Status display
 * - Delete functionality
 * - Bilingual support (EN/AR)
 * - RTL/LTR support
 * 
 * ============================================================================
 */

import { useState } from 'react';
import { Loader2, AlertCircle, Trash2, Eye } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/TranslationProvider';
import { toast } from 'sonner';

interface Props {
  language: string;
  isRTL: boolean;
}

export function InterviewList({ language, isRTL }: Props) {
  const t = useTranslation();
  const { isRTL: contextIsRTL } = useLanguage();
  const dir = isRTL || contextIsRTL ? 'rtl' : 'ltr';

  // State
  const [selectedJobId, setSelectedJobId] = useState<number | undefined>();

  // tRPC queries
  const { data: jobsData = [], isLoading: jobsLoading } =
    trpc.hrRecruitment.getAllVacancies.useQuery({
      limit: 100,
      offset: 0,
    });

 const {
  data: interviewsData,
  isLoading: interviewsLoading,
  error: interviewsError,
  refetch: refetchInterviews,
} =
trpc.hrRecruitment.getInterviewsByJob.useQuery(
  {
    jobId: selectedJobId ?? 0,
  },
  {
    enabled: !!selectedJobId,
  }
);

  // tRPC mutations
  const deleteInterviewMutation = trpc.hrRecruitment.deleteInterview.useMutation({
    onSuccess: () => {
      toast.success(t.hrRecruitment?.interviewDeleted || 'Interview deleted successfully');
      refetchInterviews();

    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete interview');
    },
  });

  // Handlers
  const handleDelete = (id: number) => {
    if (confirm(t.hrRecruitment?.confirmDelete || 'Are you sure you want to delete this interview?')) {
      deleteInterviewMutation.mutate({
      candidateId: id,
    });
    }
  };

  // Translations
  const localT = {
    title: t.hrRecruitment?.interviews || 'Interviews',
    selectJob: t.hrRecruitment?.selectJob || 'Select Job',
    jobTitle: t.hrRecruitment?.jobTitle || 'Job Title',
    jobCode: t.hrRecruitment?.jobCode || 'Job Code',
    candidate: t.hrRecruitment?.candidate || 'Candidate',
    interviewType: t.hrRecruitment?.interviewType || 'interview Type',
    scheduledDate: t.hrRecruitment?.date || 'scheduled Date',
    scheduledTime: t.hrRecruitment?.scheduledTime || 'scheduled Time',
    location: t.hrRecruitment?.location || 'Location',
    status: t.hrRecruitment?.status || 'Status',
    actions: t.hrRecruitment?.actions || 'Actions',
    view: t.hrRecruitment?.view || 'View',
    delete: t.hrRecruitment?.delete || 'Delete',
    noInterviews: t.hrRecruitment?.noInterviews || 'No interviews found',
    loading: t.common?.loading || 'Loading...',
    error: t.common?.error || 'Error',
  };

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{localT.title}</h2>
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

      {/* Loading State */}
      {selectedJobId && interviewsLoading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">{localT.loading}</p>
        </div>
      )}

      {/* Error State */}
      {selectedJobId && !!interviewsError && (
        <div className="bg-red-50 rounded-lg shadow-sm border border-red-200 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">{localT.error}</p>
            <p className="text-sm text-red-700">{interviewsError?.message}</p>
          </div>
        </div>
      )}

      {/* Interviews Table */}
      {selectedJobId && !interviewsLoading && !interviewsError && (
        <>
          {!interviewsData || interviewsData.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
              <div className="text-center text-gray-500">
                <p className="text-lg font-medium">{localT.noInterviews}</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-${dir === 'rtl' ? 'end' : 'start'}`}>
                        {localT.candidate}
                      </th>
                      <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-${dir === 'rtl' ? 'end' : 'start'}`}>
                        {localT.interviewType}
                      </th>
                      <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-${dir === 'rtl' ? 'end' : 'start'}`}>
                        {localT.scheduledDate}
                      </th>
                      <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-${dir === 'rtl' ? 'end' : 'start'}`}>
                        {localT.scheduledTime}
                      </th>
                      <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-${dir === 'rtl' ? 'end' : 'start'}`}>
                        {localT.location}
                      </th>
                      <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-${dir === 'rtl' ? 'end' : 'start'}`}>
                        {localT.status}
                      </th>
                      <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-${dir === 'rtl' ? 'end' : 'start'}`}>
                        {localT.actions}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {interviewsData.map((interview) => (
                      <tr key={interview.candidateId} className="hover:bg-gray-50 transition-colors">
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
                        <td className="px-4 py-3 text-sm">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            {interview.status || 'scheduled'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title={localT.view}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(interview.candidateId)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title={localT.delete}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
