/**
 * ============================================================================
 * INTERVIEW MANAGEMENT - REFACTORED FOR tRPC
 * ============================================================================
 * 
 * Full CRUD for interviews with:
 * - List, create, edit, delete
 * - Job and candidate filtering
 * - Status management
 * - Bilingual support (EN/AR)
 * - RTL/LTR support
 * 
 * ============================================================================
 */

import { useState } from 'react';
import { Loader2, AlertCircle, Plus, Edit2, Trash2, Eye } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { toast } from 'sonner';

interface Props {
  language: string;
  isRTL: boolean;
}

export function InterviewManagement({ language, isRTL }: Props) {
  const { t } = useTranslation();
  const { isRTL: contextIsRTL } = useLanguage();
  const dir = isRTL || contextIsRTL ? 'rtl' : 'ltr';

  const [selectedJobId, setSelectedJobId] = useState<number | undefined>();
  const [selectedInterviewId, setSelectedInterviewId] = useState<number | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [editingInterview, setEditingInterview] = useState<any>(null);

  // tRPC queries
  const { data: jobsData, isLoading: jobsLoading } = trpc.hrRecruitment.getAllVacancies.useQuery({
    limit: 100,
    offset: 0,
  });

  const {
  data: interviewsData,
  isLoading: interviewsLoading,
  refetch: refetchInterviews,
  error: interviewsError,
} = trpc.hrRecruitment.getInterviewsByJob.useQuery(
  {
    jobId: selectedJobId ?? 0,
  },
  {
    enabled: !!selectedJobId,
  }
);

  const { data: selectedInterview, isLoading: interviewDetailLoading } = trpc.hrRecruitment.getInterviewById.useQuery(
  {
    candidateId: selectedInterviewId ?? 0,
  },
  {
    enabled: !!selectedInterviewId,
  }
);

  // tRPC mutations
  const updateInterviewMutation = trpc.hrRecruitment.updateInterview.useMutation({
    onSuccess: () => {
      toast.success(t.hrRecruitment?.interviewUpdated || 'Interview updated successfully');
      setEditingInterview(null);
      setShowForm(false);
      refetchInterviews();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update interview');
    },
  });

  const deleteInterviewMutation = trpc.hrRecruitment.deleteInterview.useMutation({
    onSuccess: () => {
      toast.success(t.hrRecruitment?.interviewDeleted || 'Interview deleted successfully');
      setSelectedInterviewId(undefined);
      refetchInterviews();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete interview');
    },
  });

  // Handlers
  const handleEdit = (interview: any) => {
    setEditingInterview(interview);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (confirm(t.hrRecruitment?.confirmDelete || 'Are you sure?')) {
            deleteInterviewMutation.mutate({
        candidateId: id,
        });
        }
    };

  // Translations
  const localT = {
    title: t.hrRecruitment?.interviewManagement || 'Interview Management',
    selectJob: t.hrRecruitment?.selectJob || 'Select Job',
    newInterview: t.hrRecruitment?.newInterview || 'New Interview',
    candidate: t.hrRecruitment?.candidate || 'Candidate',
    type: t.hrRecruitment?.type || 'Type',
    interviewDate: t.hrRecruitment?.interviewDate || 'Interview Date',
    interviewTime: t.hrRecruitment?.interviewTime || 'Interview Time',
    status: t.hrRecruitment?.status || 'Status',
    actions: t.hrRecruitment?.actions || 'Actions',
    view: t.hrRecruitment?.view || 'View',
    edit: t.hrRecruitment?.edit || 'Edit',
    delete: t.hrRecruitment?.delete || 'Delete',
    noInterviews: t.hrRecruitment?.noInterviews || 'No interviews found',
    loading: t.common?.loading || 'Loading...',
  };

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{localT.title}</h2>
        <button
          onClick={() => {
            setEditingInterview(null);
            setShowForm(true);
          }}
          disabled={!selectedJobId}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          {localT.newInterview}
        </button>
      </div>

      {/* Job Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {localT.selectJob}
        </label>
        <select
          value={selectedJobId || ''}
          onChange={(e) => {
            setSelectedJobId(e.target.value ? parseInt(e.target.value) : undefined);
            setSelectedInterviewId(undefined);
          }}
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

      {/* Interviews Table */}
      {selectedJobId && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {interviewsLoading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">{localT.loading}</p>
            </div>
          ) : interviewsError ? (
            <div className="p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">{t.common?.error || 'Error'}</p>
                <p className="text-sm text-red-700">{interviewsError?.message}</p>
              </div>
            </div>
          ) : !interviewsData || interviewsData.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p className="text-lg font-medium">{localT.noInterviews}</p>
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
                      {localT.type}
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-start">
                      {localT.interviewDate}
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-start">
                      {localT.interviewTime}
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-start">
                      {localT.status}
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-start">
                      {localT.actions}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {interviewsData.map((interview) => (
                    <tr key={interview.candidateId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900">Candidate</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{interview.interviewType || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {interview.interviewDate ? new Date(interview.interviewDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{interview.interviewTime || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {interview.status || 'scheduled'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedInterviewId(interview.candidateId)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title={localT.view}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(interview)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title={localT.edit}
                          >
                            <Edit2 className="w-4 h-4" />
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
          )}
        </div>
      )}

      {/* Detail View */}
      {selectedInterviewId && selectedInterview && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.hrRecruitment?.interviewDetails || 'Interview Details'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">{localT.type}</p>
              <p className="text-lg font-medium text-gray-900">{selectedInterview.interviewType || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{localT.interviewDate}</p>
              <p className="text-lg font-medium text-gray-900">
                {selectedInterview.interviewDate ? new Date(selectedInterview.interviewDate).toLocaleDateString() : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{localT.interviewTime}</p>
              <p className="text-lg font-medium text-gray-900">{selectedInterview.interviewTime || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{localT.status}</p>
              <p className="text-lg font-medium text-gray-900">{selectedInterview.status || '-'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
