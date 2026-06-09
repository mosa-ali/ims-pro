/**
 * ============================================================================
 * HIRING DECISIONS - REFACTORED FOR tRPC
 * ============================================================================
 * 
 * List and manage hiring decisions with:
 * - Job filtering
 * - Decision status display
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
import { useTranslation } from '@/i18n/useTranslation';
import { toast } from 'sonner';

interface Props {
  language: string;
  isRTL: boolean;
}

export function HiringDecisions({ language, isRTL }: Props) {
  const { t } = useTranslation();
  const { isRTL: contextIsRTL } = useLanguage();
  const dir = isRTL || contextIsRTL ? 'rtl' : 'ltr';

  const [selectedJobId, setSelectedJobId] = useState<number | undefined>();

  // tRPC queries
  const { data: jobsData = [], isLoading: jobsLoading } =
    trpc.hrRecruitment.getAllVacancies.useQuery({
        limit: 100,
        offset: 0,
    });

  const { data: decisionsData, isLoading: decisionsLoading, error, refetch } = trpc.hrRecruitment.getHiringDecisionsByJob.useQuery(
    selectedJobId || 0,
    { enabled: !!selectedJobId }
  );

  // tRPC mutations
  const deleteDecisionMutation = trpc.hrRecruitment.deleteHiringDecision.useMutation({
    onSuccess: () => {
      toast.success(t.hrRecruitment?.decisionDeleted || 'Decision deleted successfully');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete decision');
    },
  });

  // Handlers
  const handleDelete = (id: number) => {
    if (confirm(t.hrRecruitment?.confirmDelete || 'Are you sure?')) {
      deleteDecisionMutation.mutate({ id });
    }
  };

  // Translations
  const localT = {
    title: t.hrRecruitment?.hiringDecisions || 'Hiring Decisions',
    selectJob: t.hrRecruitment?.selectJob || 'Select Job',
    candidate: t.hrRecruitment?.candidate || 'Candidate',
    status: t.hrRecruitment?.status || 'Status',
    salary: t.hrRecruitment?.salary || 'Salary',
    startDate: t.hrRecruitment?.startDate || 'Start Date',
    actions: t.hrRecruitment?.actions || 'Actions',
    view: t.hrRecruitment?.view || 'View',
    delete: t.hrRecruitment?.delete || 'Delete',
    noDecisions: t.hrRecruitment?.noDecisions || 'No hiring decisions found',
    makeDecision: t.hrRecruitment.makeHiringDecision,
    exportExcel: t.hrRecruitment.exportToExcel,
    
    all: t.hrRecruitment.all,
    approved: t.hrRecruitment.approved,
    rejected: t.hrRecruitment.rejected,
    onHold: t.hrRecruitment.onHold,
    
    decisionRef: t.hrRecruitment.decisionRef,
    position: t.hrRecruitment.position,
    decision: t.hrRecruitment.decision,
    date: t.hrRecruitment.date,
    approvedBy: t.hrRecruitment.approvedBy,
    employeeId: t.hrRecruitment.employeeId,
    
    pendingCandidates: t.hrRecruitment.candidatesPendingDecision,
    selectCandidate: t.hrRecruitment.selectCandidate,
    
    noPendingCandidates: t.hrRecruitment.noCandidatesAwaitingDecision,
    
    totalDecisions: t.hrRecruitment.totalDecisions,
    hired: t.hrRecruitment.hired,
    pending: t.hrRecruitment.awaitingDecision,
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

      {/* Decisions Table */}
      {selectedJobId && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {decisionsLoading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">{localT.loading}</p>
            </div>
          ) : error ? (
            <div className="p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">{localT.error}</p>
                <p className="text-sm text-red-700">{error.message}</p>
              </div>
            </div>
          ) : !decisionsData || decisionsData.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p className="text-lg font-medium">{localT.noDecisions}</p>
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
                      {localT.status}
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-start">
                      {localT.salary}
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-start">
                      {localT.startDate}
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-start">
                      {localT.actions}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {decisionsData.map((decision) => (
                    <tr key={decision.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900">Candidate</td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            decision.offerStatus === 'Accepted'
                              ? 'bg-green-100 text-green-700'
                              : decision.offerStatus === 'Rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {decision.offerStatus || 'pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {decision.proposedSalary ? `$${parseFloat(decision.proposedSalary).toLocaleString()}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {decision.startDate ? new Date(decision.startDate).toLocaleDateString() : '-'}
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
                            onClick={() => handleDelete(decision.id)}
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
    </div>
  );
}
