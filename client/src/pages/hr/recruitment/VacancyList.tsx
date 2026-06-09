/**
 * ============================================================================
 * VACANCY LIST VIEW - REFACTORED FOR tRPC
 * ============================================================================
 * 
 * Display all vacancies with:
 * - Server-side filtering and pagination
 * - Real tRPC data from database
 * - Multi-tenancy support
 * - Bilingual support (EN/AR)
 * - RTL/LTR support
 * 
 * ============================================================================
 */

import { useState } from 'react';
import {
  Search,
  Plus,
  Edit,
  Eye,
  Lock,
  Archive,
  Copy,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { RecruitmentJob, JOB_STATUS_LABELS, JobStatus } from '@shared/types/recruitment-canonical';
import { JOB_STATUS_COLORS } from '@shared/constants/recruitment-canonical';
import { toast } from 'sonner';
import { VacancyForm } from './VacancyForm';
import { VacancyDetail } from './VacancyDetail';

interface Props {
  language: string;
  isRTL: boolean;
}

export function VacancyList({ language, isRTL }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isRTL: contextIsRTL } = useLanguage();
  const dir = isRTL || contextIsRTL ? 'rtl' : 'ltr';

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'All'>('All');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedVacancy, setSelectedVacancy] = useState<RecruitmentJob | undefined>();
  const [showDetail, setShowDetail] = useState(false);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);

  // tRPC queries
  const { data: vacanciesData, isLoading, error, refetch } = trpc.hrRecruitment.getAllVacancies.useQuery({
    status: statusFilter !== 'All' ? (statusFilter as JobStatus) : undefined,
    department: departmentFilter || undefined,
    search: searchTerm || undefined,
    limit,
    offset,
  });

  // tRPC mutations
  const updateJobMutation = trpc.hrRecruitment.updateVacancy.useMutation({
    onSuccess: () => {
      toast.success(t.hrRecruitment.jobUpdated || 'Job updated successfully');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update job');
    },
  });

  const deleteJobMutation = trpc.hrRecruitment.deleteVacancy.useMutation({
    onSuccess: () => {
      toast.success(t.hrRecruitment.jobDeleted || 'Job deleted successfully');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete job');
    },
  });

  // Handlers
  const handleEdit = (vacancy: RecruitmentJob) => {
    setSelectedVacancy(vacancy);
    setShowForm(true);
  };

  const handleView = (vacancy: RecruitmentJob) => {
    setSelectedVacancy(vacancy);
    setShowDetail(true);
  };

  const handleCloseVacancy = (id: number) => {
    if (confirm(t.hrRecruitment.confirmClose || 'Are you sure you want to close this vacancy?')) {
      updateJobMutation.mutate({
        id,
        status: 'closed',
      });
    }
  };

  const handleArchiveVacancy = (id: number) => {
    if (confirm(t.hrRecruitment.confirmArchive || 'Are you sure you want to archive this vacancy?')) {
      deleteJobMutation.mutate({ id });
    }
  };

  const getApplicationUrl = (jobCode?: string) => {
    if (!jobCode) return '';
    return `${window.location.origin}/apply/${jobCode}`;
  };

  const copyApplicationLink = (jobCode?: string) => {
    if (!jobCode) return;
    const url = getApplicationUrl(jobCode);
    navigator.clipboard.writeText(url);
    setCopiedRef(jobCode);
    setTimeout(() => setCopiedRef(null), 2000);
    toast.success(t.hrRecruitment.linkCopied || 'Link copied to clipboard');
  };

  // Translations
  const localT = {
    title: t.hrRecruitment?.vacancies || 'Vacancies',
    search: t.hrRecruitment?.searchVacancies || 'Search vacancies...',
    all: t.hrRecruitment?.all || 'All',
    newVacancy: t.hrRecruitment?.newVacancy || 'New Vacancy',
    ref: t.hrRecruitment?.reference || 'Reference',
    position: t.hrRecruitment?.position || 'Position',
    department: t.hrRecruitment?.department || 'Department',
    location: t.hrRecruitment?.location || 'Location',
    closingDate: t.hrRecruitment?.closingDate || 'Closing Date',
    candidates: t.hrRecruitment?.candidates || 'Candidates',
    status: t.hrRecruitment?.status || 'Status',
    actions: t.hrRecruitment?.actions || 'Actions',
    edit: t.hrRecruitment?.edit || 'Edit',
    view: t.hrRecruitment?.view || 'View',
    close: t.hrRecruitment?.close || 'Close',
    archive: t.hrRecruitment?.archive || 'Archive',
    copyLink: t.hrRecruitment?.copyApplicationLink || 'Copy Link',
    linkCopied: t.hrRecruitment?.linkCopied || 'Link copied',
    noVacancies: t.hrRecruitment?.noVacanciesFound || 'No vacancies found',
    createFirst: t.hrRecruitment?.createYourFirstVacancyToStart || 'Create your first vacancy to get started',
    total: t.common?.total || 'Total',
    loading: t.common?.loading || 'Loading...',
    error: t.common?.error || 'Error',
  };

  // Get status badge
  const getStatusBadge = (status: JobStatus) => {
    const color = JOB_STATUS_COLORS[status] || 'bg-gray-100 text-gray-700';
    const label = JOB_STATUS_LABELS[status] || status;
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
        <button
          onClick={() => {
            setSelectedVacancy(undefined);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {localT.newVacancy}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            {(['All', 'draft', 'open', 'closed', 'filled'] as const).map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(
                    status === 'All'
                      ? 'All'
                      : (status as JobStatus)
                  );
                  setOffset(0);
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'All' ? localT.all : JOB_STATUS_LABELS[status] || status}
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

      {/* Vacancies Table */}
      {!isLoading && !error && (
        <>
          {!vacanciesData || vacanciesData.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
              <div className="text-center text-gray-500">
                <p className="text-lg font-medium">{localT.noVacancies}</p>
                <p className="text-sm mt-1">{localT.createFirst}</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-${dir === 'rtl' ? 'end' : 'start'}`}>
                        {localT.ref}
                      </th>
                      <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-${dir === 'rtl' ? 'end' : 'start'}`}>
                        {localT.position}
                      </th>
                      <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-${dir === 'rtl' ? 'end' : 'start'}`}>
                        {localT.department}
                      </th>
                      <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-${dir === 'rtl' ? 'end' : 'start'}`}>
                        {localT.location}
                      </th>
                      <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-${dir === 'rtl' ? 'end' : 'start'}`}>
                        {localT.closingDate}
                      </th>
                      <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-${dir === 'rtl' ? 'end' : 'start'}`}>
                        {localT.candidates}
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
                    {vacanciesData.map((vacancy) => (
                      <tr key={vacancy.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-mono text-gray-900">
                          {vacancy.jobCode || `JOB-${vacancy.id}`}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                          {vacancy.jobTitle}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {vacancy.department || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {vacancy.location || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {vacancy.closingDate ? new Date(vacancy.closingDate).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            0
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {getStatusBadge(vacancy.status as JobStatus)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleView(vacancy)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title={localT.view}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {vacancy.status !== 'filled' && (
                              <button
                                onClick={() => handleEdit(vacancy)}
                                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                title={localT.edit}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            {vacancy.status === 'open' && (
                              <>
                                <button
                                  onClick={() => copyApplicationLink(vacancy.jobCode ?? undefined)}
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title={localT.copyLink}
                                >
                                  {copiedRef === vacancy.jobCode ? (
                                    <Check className="w-4 h-4" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleCloseVacancy(vacancy.id)}
                                  className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                  title={localT.close}
                                >
                                  <Lock className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {vacancy.status === 'closed' && (
                              <button
                                onClick={() => handleArchiveVacancy(vacancy.id)}
                                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                title={localT.archive}
                              >
                                <Archive className="w-4 h-4" />
                              </button>
                            )}
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

      {/* Modals */}
      {showForm && (
        <VacancyForm
          language={language}
          isRTL={isRTL}
          vacancy={selectedVacancy}
          onClose={() => {
            setShowForm(false);
            setSelectedVacancy(undefined);
          }}
          onSave={() => {
            setShowForm(false);
            setSelectedVacancy(undefined);
            refetch();
          }}
        />
      )}

      {showDetail && selectedVacancy && (
        <VacancyDetail
          language={language}
          isRTL={isRTL}
          vacancy={selectedVacancy}
          onClose={() => {
            setShowDetail(false);
            setSelectedVacancy(undefined);
          }}
        />
      )}
    </div>
  );
}
