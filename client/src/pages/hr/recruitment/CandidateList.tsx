/**
 * ============================================================================
 * CANDIDATE LIST VIEW - REFACTORED FOR tRPC
 * ============================================================================
 * 
 * Display all candidates with:
 * - Status filters
 * - Search functionality
 * - Action buttons
 * - Pagination
 * - Bilingual support (EN/AR)
 * - RTL/LTR support
 * 
 * ============================================================================
 */

import { useState } from 'react';
import {
  Search,
  Eye,
  Edit,
  Trash2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { RecruitmentCandidate, CandidateStatus, CANDIDATE_STATUS_LABELS } from '@shared/types/recruitment-canonical';
import { CANDIDATE_STATUS_COLORS } from '@shared/constants/recruitment-canonical';

import { toast } from 'sonner';
import { CandidateDetail } from './CandidateDetail';


interface Props {
  language: string;
  isRTL: boolean;
}

export function CandidateList({ language, isRTL }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isRTL: contextIsRTL } = useLanguage();
  const dir = isRTL || contextIsRTL ? 'rtl' : 'ltr';

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<CandidateStatus | 'All'>('All');
  const [selectedCandidate, setSelectedCandidate] = useState<RecruitmentCandidate | undefined>();
  const [showDetail, setShowDetail] = useState(false);
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);

  // tRPC queries
  const { data: candidatesData, isLoading, error, refetch } = trpc.hrRecruitment.getAllCandidates.useQuery({
    status,
    search: searchTerm || undefined,
    limit,
    offset
  });

  // tRPC mutations
  const deleteCandidateMutation = trpc.hrRecruitment.deleteCandidate.useMutation({
    onSuccess: () => {
      toast.success(t.hrRecruitment?.candidateDeleted || 'Candidate deleted successfully');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete candidate');
    },
  });

  // Handlers
  const handleView = (candidate: RecruitmentCandidate) => {
    setSelectedCandidate(candidate);
    setShowDetail(true);
  };

  const handleDelete = (id: number) => {
    if (confirm(t.hrRecruitment?.confirmDelete || 'Are you sure you want to delete this candidate?')) {
      deleteCandidateMutation.mutate({ id });
    }
  };

  // Translations
  const localT = {
    title: t.hrRecruitment?.candidates || 'Candidates',
    search: t.hrRecruitment?.searchCandidates || 'Search candidates...',
    all: t.hrRecruitment?.all || 'All',
    firstName: t.hrRecruitment?.firstName || 'First Name',
    lastName: t.hrRecruitment?.lastName || 'Last Name',
    email: t.hrRecruitment?.email || 'Email',
    phone: t.hrRecruitment?.phone || 'Phone',
    status: t.hrRecruitment?.status || 'Status',
    appliedAt: t.hrRecruitment?.appliedAt || 'Applied At',
    actions: t.hrRecruitment?.actions || 'Actions',
    view: t.hrRecruitment?.view || 'View',
    edit: t.hrRecruitment?.edit || 'Edit',
    delete: t.hrRecruitment?.delete || 'Delete',
    noCandidates: t.hrRecruitment?.noCandidatesFound || 'No candidates found',
    loading: t.common?.loading || 'Loading...',
    error: t.common?.error || 'Error',
  };

  // Get status badge
  const getStatusBadge = (status: CandidateStatus) => {
    const color = CANDIDATE_STATUS_COLORS[status] || 'bg-gray-100 text-gray-700';
    const label = CANDIDATE_STATUS_LABELS[status] || status;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        {label}
      </span>
    );
  };

  // Render
  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{localT.title}</h2>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className={`absolute ${dir === 'rtl' ? 'end-3' : 'start-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setOffset(0);
              }}
              placeholder={localT.search}
              className={`w-full ${dir === 'rtl' ? 'pe-10 ps-4' : 'ps-10 pe-4'} py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            {(['All', 'new',
              'applied',
              'screening',
              'shortlisted',
              'interview_scheduled',
              'interviewed',
              'offer_pending',
              'offer_sent',
              'offered',
              'hired',
              'rejected',
              'withdrawn'] as const).map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status as 'All' | CandidateStatus);
                  setOffset(0);
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'All' ? localT.all : CANDIDATE_STATUS_LABELS[status] || status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">{localT.loading}</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 rounded-lg shadow-sm border border-red-200 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">{localT.error}</p>
            <p className="text-sm text-red-700">{error.message}</p>
          </div>
        </div>
      )}

      {/* Candidates Table */}
      {!isLoading && !error && (
        <>
          {!candidatesData || candidatesData.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
              <div className="text-center text-gray-500">
                <p className="text-lg font-medium">{localT.noCandidates}</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-${dir === 'rtl' ? 'end' : 'start'}`}>
                        {localT.firstName}
                      </th>
                      <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-${dir === 'rtl' ? 'end' : 'start'}`}>
                        {localT.lastName}
                      </th>
                      <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-${dir === 'rtl' ? 'end' : 'start'}`}>
                        {localT.email}
                      </th>
                      <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-${dir === 'rtl' ? 'end' : 'start'}`}>
                        {localT.phone}
                      </th>
                      <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-${dir === 'rtl' ? 'end' : 'start'}`}>
                        {localT.status}
                      </th>
                      <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-${dir === 'rtl' ? 'end' : 'start'}`}>
                        {localT.appliedAt}
                      </th>
                      <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-${dir === 'rtl' ? 'end' : 'start'}`}>
                        {localT.actions}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {candidatesData.map((candidate) => (
                      <tr key={candidate.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {candidate.firstName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {candidate.lastName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {candidate.email}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {candidate.phone || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {getStatusBadge(candidate.status as CandidateStatus)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {candidate.appliedAt ? new Date(candidate.appliedAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleView(candidate.fistName)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title={localT.view}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(candidate.id)}
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

      {/* Detail Modal */}
      {showDetail && selectedCandidate && (
        <CandidateDetail
          language={language}
          isRTL={isRTL}
          candidate={selectedCandidate}
          onClose={() => {
            setShowDetail(false);
            setSelectedCandidate(undefined);
          }}
        />
      )}
    </div>
  );
}
