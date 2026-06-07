/**
 * ============================================================================
 * HIRING DECISION - REFACTORED FOR tRPC
 * ============================================================================
 * 
 * View and manage individual hiring decision with:
 * - Decision details
 * - Approve/reject functionality
 * - Bilingual support (EN/AR)
 * - RTL/LTR support
 * 
 * ============================================================================
 */

import { useState } from 'react';
import { Loader2, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/TranslationProvider';
import { toast } from 'sonner';

interface Props {
  language: string;
  isRTL: boolean;
  decisionId: number;
  onClose?: () => void;
}

export function HiringDecision({ language, isRTL, decisionId, onClose }: Props) {
  const t = useTranslation();
  const { isRTL: contextIsRTL } = useLanguage();
  const dir = isRTL || contextIsRTL ? 'rtl' : 'ltr';

  const [isProcessing, setIsProcessing] = useState(false);

  // tRPC queries
  const { data: decision, isLoading, error, refetch } = trpc.hrRecruitment.getHiringDecisionById.useQuery(decisionId);

  // tRPC mutations
  const approveMutation = trpc.hrRecruitment.approveHiringDecision.useMutation({
    onSuccess: () => {
      toast.success(t.hrRecruitment?.decisionApproved || 'Decision approved successfully');
      refetch();
      setIsProcessing(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to approve decision');
      setIsProcessing(false);
    },
  });

  const rejectMutation = trpc.hrRecruitment.rejectHiringDecision.useMutation({
    onSuccess: () => {
      toast.success(t.hrRecruitment?.decisionRejected || 'Decision rejected successfully');
      refetch();
      setIsProcessing(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to reject decision');
      setIsProcessing(false);
    },
  });

  // Handlers
  const handleApprove = () => {
    if (confirm(t.hrRecruitment?.confirmApprove || 'Approve this hiring decision?')) {
      setIsProcessing(true);
      approveMutation.mutate({ id: decisionId });
    }
  };

  const handleReject = () => {
    if (confirm(t.hrRecruitment?.confirmReject || 'Reject this hiring decision?')) {
      setIsProcessing(true);
      rejectMutation.mutate({ id: decisionId });
    }
  };

  // Translations
  const localT = {
    title: t.hrRecruitment?.hiringDecision || 'Hiring Decision',
    candidate: t.hrRecruitment?.candidate || 'Candidate',
    position: t.hrRecruitment?.position || 'Position',
    offerStatus: t.hrRecruitment?.offerStatus || 'Status',
    salary: t.hrRecruitment?.proposedSalary || 'Salary',
    startDate: t.hrRecruitment?.startDate || 'Start Date',
    notes: t.hrRecruitment?.notes || 'Notes',
    approve: t.hrRecruitment?.approve || 'Approve',
    reject: t.hrRecruitment?.reject || 'Reject',
    loading: t.common?.loading || 'Loading...',
    error: t.common?.error || 'Error',
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
        <p className="text-gray-600">{localT.loading}</p>
      </div>
    );
  }

  if (error || !decision) {
    return (
      <div className="bg-red-50 rounded-lg shadow-sm border border-red-200 p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-red-900">{localT.error}</p>
          <p className="text-sm text-red-700">{error?.message || 'Failed to load decision'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" dir={dir}>
      <h2 className="text-xl font-bold text-gray-900 mb-6">{localT.title}</h2>

      <div className="space-y-6">
        {/* Status Badge */}
        <div>
          <p className="text-sm text-gray-600 mb-2">{localT.offerStatus}</p>
          <div className="flex items-center gap-2">
            {decision.offerStatus === 'Accepted' && (
              <>
                <CheckCircle className="w-6 h-6 text-green-600" />
                <span className="text-lg font-semibold text-green-600">{t.hrRecruitment?.accepted || 'Accepted'}</span>
              </>
            )}
            {decision.offerStatus === 'Rejected' && (
              <>
                <XCircle className="w-6 h-6 text-red-600" />
                <span className="text-lg font-semibold text-red-600">{t.hrRecruitment?.rejected || 'Rejected'}</span>
              </>
            )}
            {decision.offerStatus === 'Pending' && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700">
                {t.hrRecruitment?.pending || 'Pending'}
              </span>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">{localT.candidate}</p>
            <p className="text-lg font-medium text-gray-900">Candidate Name</p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">{localT.position}</p>
            <p className="text-lg font-medium text-gray-900">Position Title</p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">{localT.salary}</p>
            <p className="text-lg font-medium text-gray-900">
              {decision.proposedSalary ? `$${parseFloat(decision.proposedSalary).toLocaleString()}` : '-'}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">{localT.startDate}</p>
            <p className="text-lg font-medium text-gray-900">
              {decision.startDate ? new Date(decision.startDate).toLocaleDateString() : '-'}
            </p>
          </div>
        </div>

        {/* Notes */}
        {decision.approvalNotes && (
          <div>
            <p className="text-sm text-gray-600 mb-2">{localT.notes}</p>
            <p className="text-gray-900 whitespace-pre-wrap">{decision.approvalNotes}</p>
          </div>
        )}

        {/* Actions */}
        {decision.offerStatus === 'Pending' && (
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleApprove}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t.hrRecruitment?.processing || 'Processing...'}
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  {localT.approve}
                </>
              )}
            </button>

            <button
              onClick={handleReject}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t.hrRecruitment?.processing || 'Processing...'}
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5" />
                  {localT.reject}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
