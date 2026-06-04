/**
 * ============================================================================
 * CANDIDATE DETAIL VIEW - REFACTORED FOR tRPC
 * ============================================================================
 * 
 * Display candidate details with:
 * - Personal information
 * - Education & experience
 * - Interviews
 * - Hiring decision
 * - Bilingual support (EN/AR)
 * - RTL/LTR support
 * 
 * ============================================================================
 */

import { X, Loader2, AlertCircle, Mail, Phone, MapPin } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { RecruitmentCandidate, CandidateStatus, CANDIDATE_STATUS_LABELS } from '@shared/types/recruitment-canonical';
import { CANDIDATE_STATUS_COLORS } from '@shared/constants/recruitment-canonical';

interface Props {
  language: string;
  isRTL: boolean;
  candidate: RecruitmentCandidate;
  onClose: () => void;
}

export function CandidateDetail({ language, isRTL, candidate, onClose }: Props) {
  const { t } = useTranslation();
  const { isRTL: contextIsRTL } = useLanguage();
  const dir = isRTL || contextIsRTL ? 'rtl' : 'ltr';

  // tRPC queries
  const { data: interviewsData, isLoading: interviewsLoading } = trpc.hrRecruitment.getInterviewsByCandidate.useQuery(
    candidate.id
  );

  const { data: hiringDecisionData, isLoading: hiringDecisionLoading } = trpc.hrRecruitment.getHiringDecisionByCandidate.useQuery(
    candidate.id
  );

  // Translations
  const localT = {
    title: t.hrRecruitment?.candidateDetails || 'Candidate Details',
    close: t.common?.close || 'Close',
    personalInfo: t.hrRecruitment?.personalInformation || 'Personal Information',
    firstName: t.hrRecruitment?.firstName || 'First Name',
    lastName: t.hrRecruitment?.lastName || 'Last Name',
    email: t.hrRecruitment?.email || 'Email',
    phone: t.hrRecruitment?.phone || 'Phone',
    education: t.hrRecruitment?.education || 'Education',
    experience: t.hrRecruitment?.experience || 'Experience',
    skills: t.hrRecruitment?.skills || 'Skills',
    status: t.hrRecruitment?.status || 'Status',
    appliedAt: t.hrRecruitment?.appliedAt || 'Applied At',
    interviews: t.hrRecruitment?.interviews || 'Interviews',
    hiringDecision: t.hrRecruitment?.hiringDecision || 'Hiring Decision',
    noInterviews: t.hrRecruitment?.noInterviews || 'No interviews scheduled',
    noDecision: t.hrRecruitment?.noDecision || 'No hiring decision yet',
    loading: t.common?.loading || 'Loading...',
  };

  const getStatusBadge = (status: string) => {
    const color = CANDIDATE_STATUS_COLORS[status as keyof typeof CANDIDATE_STATUS_COLORS] || 'bg-gray-100 text-gray-700';
    const label = CANDIDATE_STATUS_LABELS[status as keyof typeof CANDIDATE_STATUS_LABELS] || status;
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
          {/* Name & Status */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {candidate.firstName} {candidate.lastName}
            </h3>
            <div className="flex items-center gap-4">
              {getStatusBadge(candidate.status)}
              <p className="text-sm text-gray-600">
                {localT.appliedAt}: {candidate.appliedAt ? new Date(candidate.appliedAt).toLocaleDateString() : '-'}
              </p>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium text-gray-700 mb-3">{localT.personalInfo}</p>
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <a href={`mailto:${candidate.email}`} className="text-blue-600 hover:underline">
                {candidate.email}
              </a>
            </div>
            {candidate.phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <a href={`tel:${candidate.phone}`} className="text-blue-600 hover:underline">
                  {candidate.phone}
                </a>
              </div>
            )}
          </div>

          {/* Education */}
          {candidate.education && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">{localT.education}</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{candidate.education}</p>
            </div>
          )}

          {/* Experience */}
          {candidate.experience && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">{localT.experience}</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{candidate.experience}</p>
            </div>
          )}

          {/* Skills */}
          {candidate.skills && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">{localT.skills}</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{candidate.skills}</p>
            </div>
          )}

          {/* Interviews */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">{localT.interviews}</p>
            {interviewsLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <p className="text-sm text-gray-600">{localT.loading}</p>
              </div>
            ) : interviewsData && interviewsData.length > 0 ? (
              <div className="space-y-2">
                {interviewsData.map((interview) => (
                  <div key={interview.id} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-900">
                      {interview.interviewType || 'Interview'}
                    </p>
                    <p className="text-xs text-gray-600">
                      {interview.scheduledDate ? new Date(interview.scheduledDate).toLocaleDateString() : '-'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">{localT.noInterviews}</p>
            )}
          </div>

          {/* Hiring Decision */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">{localT.hiringDecision}</p>
            {hiringDecisionLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <p className="text-sm text-gray-600">{localT.loading}</p>
              </div>
            ) : hiringDecisionData ? (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-900">
                  {hiringDecisionData.status || 'Pending'}
                </p>
                {hiringDecisionData.offerSalary && (
                  <p className="text-sm text-gray-600">
                    Salary: ${hiringDecisionData.offerSalary}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-600">{localT.noDecision}</p>
            )}
          </div>
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
