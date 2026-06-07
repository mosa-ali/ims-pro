/**
 * ============================================================================
 * VACANCY DETAIL VIEW - REFACTORED FOR tRPC
 * ============================================================================
 * 
 * Display vacancy details with:
 * - Job information
 * - Candidate count
 * - Application link
 * - Bilingual support (EN/AR)
 * - RTL/LTR support
 * 
 * ============================================================================
 */

import { X, Copy, Check, Loader2, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/TranslationProvider';
import { RecruitmentJob, JOB_STATUS_LABELS } from '@shared/types/recruitment-canonical';
import { JOB_STATUS_COLORS } from '@shared/constants/recruitment-canonical';
import { useState } from 'react';
import { toast } from 'sonner';

interface Props {
  language: string;
  isRTL: boolean;
  vacancy: RecruitmentJob;
  onClose: () => void;
}

export function VacancyDetail({ language, isRTL, vacancy, onClose }: Props) {
  const t = useTranslation();
  const { isRTL: contextIsRTL } = useLanguage();
  const dir = isRTL || contextIsRTL ? 'rtl' : 'ltr';
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  // tRPC queries
  const { data: candidatesData, isLoading: candidatesLoading } = trpc.hrRecruitment.getAllCandidates.useQuery({
    jobId: vacancy.id,
    limit: 1000,
    offset: 0,
  });

  // Handlers
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
    toast.success(t.hrRecruitment?.linkCopied || 'Link copied to clipboard');
  };

  // Translations
  const localT = {
    title: t.hrRecruitment?.vacancyDetails || 'Vacancy Details',
    close: t.common?.close || 'Close',
    jobTitle: t.hrRecruitment?.jobTitle || 'Job Title',
    jobCode: t.hrRecruitment?.jobCode || 'Job Code',
    department: t.hrRecruitment?.department || 'Department',
    location: t.hrRecruitment?.location || 'Location',
    employmentType: t.hrRecruitment?.employmentType || 'Employment Type',
    numberOfPositions: t.hrRecruitment?.numberOfPositions || 'Number of Positions',
    gradeLevel: t.hrRecruitment?.gradeLevel || 'Grade Level',
    salaryRange: t.hrRecruitment?.salaryRange || 'Salary Range',
    postingDate: t.hrRecruitment?.postingDate || 'Posting Date',
    closingDate: t.hrRecruitment?.closingDate || 'Closing Date',
    status: t.hrRecruitment?.status || 'Status',
    description: t.hrRecruitment?.description || 'Description',
    requirements: t.hrRecruitment?.requirements || 'Requirements',
    responsibilities: t.hrRecruitment?.responsibilities || 'Responsibilities',
    benefits: t.hrRecruitment?.benefits || 'Benefits',
    candidates: t.hrRecruitment?.candidates || 'Candidates',
    applicationLink: t.hrRecruitment?.applicationLink || 'Application Link',
    copyLink: t.hrRecruitment?.copyApplicationLink || 'Copy Link',
    linkCopied: t.hrRecruitment?.linkCopied || 'Link copied',
    isRemote: t.hrRecruitment?.isRemote || 'Remote',
    loading: t.common?.loading || 'Loading...',
  };

  const getStatusBadge = (status: string) => {
    const color = JOB_STATUS_COLORS[status as keyof typeof JOB_STATUS_COLORS] || 'bg-gray-100 text-gray-700';
    const label = JOB_STATUS_LABELS[status as keyof typeof JOB_STATUS_LABELS] || status;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${color}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir={dir}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{localT.title}</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Job Title & Code */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{vacancy.jobTitle}</h3>
            {vacancy.jobCode && (
              <p className="text-sm text-gray-600 font-mono">{vacancy.jobCode}</p>
            )}
          </div>

          {/* Status & Key Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">{localT.status}</p>
              {getStatusBadge(vacancy.status)}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">{localT.department}</p>
              <p className="text-sm text-gray-900">{vacancy.department || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">{localT.numberOfPositions}</p>
              <p className="text-sm text-gray-900">{vacancy.numberOfPositions || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">{localT.candidates}</p>
              {candidatesLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <p className="text-sm text-gray-900">{candidatesData?.length || 0}</p>
              )}
            </div>
          </div>

          {/* Location & Employment Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">{localT.location}</p>
              <p className="text-sm text-gray-900">{vacancy.location || '-'}</p>
              {vacancy.isRemote && (
                <p className="text-xs text-green-600 font-medium mt-1">{localT.isRemote}</p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">{localT.employmentType}</p>
              <p className="text-sm text-gray-900">{vacancy.employmentType || '-'}</p>
            </div>
          </div>

          {/* Grade & Salary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">{localT.gradeLevel}</p>
              <p className="text-sm text-gray-900">{vacancy.gradeLevel || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">{localT.salaryRange}</p>
              <p className="text-sm text-gray-900">{vacancy.salaryRange || '-'}</p>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">{localT.postingDate}</p>
              <p className="text-sm text-gray-900">
                {vacancy.postingDate ? new Date(vacancy.postingDate).toLocaleDateString() : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">{localT.closingDate}</p>
              <p className="text-sm text-gray-900">
                {vacancy.closingDate ? new Date(vacancy.closingDate).toLocaleDateString() : '-'}
              </p>
            </div>
          </div>

          {/* Application Link */}
          {vacancy.status === 'open' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">{localT.applicationLink}</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={getApplicationUrl(vacancy.jobCode)}
                  className="flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-600"
                />
                <button
                  onClick={() => copyApplicationLink(vacancy.jobCode)}
                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                  title={localT.copyLink}
                >
                  {copiedRef === vacancy.jobCode ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Description */}
          {vacancy.description && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">{localT.description}</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{vacancy.description}</p>
            </div>
          )}

          {/* Requirements */}
          {vacancy.requirements && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">{localT.requirements}</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{vacancy.requirements}</p>
            </div>
          )}

          {/* Responsibilities */}
          {vacancy.responsibilities && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">{localT.responsibilities}</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{vacancy.responsibilities}</p>
            </div>
          )}

          {/* Benefits */}
          {vacancy.benefits && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">{localT.benefits}</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{vacancy.benefits}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {localT.close}
          </button>
        </div>
      </div>
    </div>
  );
}
