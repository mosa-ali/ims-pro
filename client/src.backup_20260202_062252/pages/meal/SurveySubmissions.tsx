/**
 * ============================================================================
 * SURVEY SUBMISSIONS LIST
 * ============================================================================
 * 
 * Converted from React Native to Web React
 * View and manage survey submissions with filtering and verification
 * 
 * FEATURES:
 * - Search submissions
 * - Filter by status (all, pending, verified, rejected)
 * - Verify/reject submissions
 * - Delete submissions
 * - View submission details
 * - Bilingual support (EN/AR) with RTL
 * 
 * ============================================================================
 */

import { useLocation, useSearch } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect } from 'react';
import { Search, Filter, Download, Eye, Edit, Trash2, CheckCircle, Clock, XCircle, ArrowLeft, Loader2 } from 'lucide-react';

type SubmissionStatus = 'all' | 'pending' | 'verified' | 'rejected';

interface Submission {
  id: string;
  formId: string;
  formName: string;
  submittedBy: string;
  submittedAt: string;
  location?: string;
  verified: boolean;
  verificationNotes?: string;
  rejectionReason?: string;
}

export function SurveySubmissions() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const { language, isRTL } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<SubmissionStatus>('all');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const projectId = searchParams.get('projectId') || '';
  const projectName = searchParams.get('projectName') || '';

  const t = {
    title: language === 'en' ? 'Data Collection' : 'جمع البيانات',
    subtitle: language === 'en' ? 'View and verify submissions' : 'عرض والتحقق من التقديمات',
    back: language === 'en' ? 'Back' : 'رجوع',
    searchPlaceholder: language === 'en' ? 'Search submissions...' : 'البحث في التقديمات...',
    all: language === 'en' ? 'All' : 'الكل',
    pending: language === 'en' ? 'Pending' : 'معلق',
    verified: language === 'en' ? 'Verified' : 'محقق',
    rejected: language === 'en' ? 'Rejected' : 'مرفوض',
    noSubmissions: language === 'en' ? 'No submissions found' : 'لم يتم العثور على تقديمات',
    noSubmissionsDesc: language === 'en' ? 'Submissions will appear here once data is collected' : 'ستظهر التقديمات هنا بمجرد جمع البيانات',
    id: language === 'en' ? 'ID' : 'المعرف',
    submittedBy: language === 'en' ? 'Submitted by' : 'قدم بواسطة',
    date: language === 'en' ? 'Date' : 'التاريخ',
    time: language === 'en' ? 'Time' : 'الوقت',
    location: language === 'en' ? 'Location' : 'الموقع',
    rejectionReason: language === 'en' ? 'Rejection Reason:' : 'سبب الرفض:',
    view: language === 'en' ? 'View' : 'عرض',
    verify: language === 'en' ? 'Verify' : 'تحقق',
    reject: language === 'en' ? 'Reject' : 'رفض',
    delete: language === 'en' ? 'Delete' : 'حذف',
    confirmVerify: language === 'en' ? 'Mark this submission as verified?' : 'وضع علامة على هذا التقديم كمحقق؟',
    confirmDelete: language === 'en' ? 'Are you sure you want to delete this submission? This action cannot be undone.' : 'هل أنت متأكد من حذف هذا التقديم؟ لا يمكن التراجع عن هذا الإجراء.',
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
    success: language === 'en' ? 'Success' : 'نجح',
    verifySuccess: language === 'en' ? 'Submission verified' : 'تم التحقق من التقديم',
    deleteSuccess: language === 'en' ? 'Submission deleted' : 'تم حذف التقديم',
    rejectSuccess: language === 'en' ? 'Submission rejected' : 'تم رفض التقديم',
    enterRejectionReason: language === 'en' ? 'Enter rejection reason:' : 'أدخل سبب الرفض:',
  };

  useEffect(() => {
    loadSubmissions();
  }, [projectId]);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      // Mock data - replace with actual tRPC call
      const mockData: Submission[] = [
        {
          id: 'sub_001',
          formId: 'form_001',
          formName: 'Beneficiary Satisfaction Survey',
          submittedBy: 'Ahmed Hassan',
          submittedAt: '2025-01-19T10:30:00Z',
          location: 'Sana\'a',
          verified: false,
        },
        {
          id: 'sub_002',
          formId: 'form_001',
          formName: 'Beneficiary Satisfaction Survey',
          submittedBy: 'Fatima Ali',
          submittedAt: '2025-01-18T14:20:00Z',
          location: 'Aden',
          verified: true,
        },
        {
          id: 'sub_003',
          formId: 'form_002',
          formName: 'Post-Distribution Monitoring',
          submittedBy: 'Omar Mohammed',
          submittedAt: '2025-01-17T09:15:00Z',
          location: 'Taiz',
          verified: false,
          rejectionReason: 'Incomplete data - missing beneficiary ID',
        },
      ];
      setSubmissions(mockData);
    } catch (error) {
      console.error('Failed to load submissions', error);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubmissions = submissions.filter((submission) => {
    const matchesSearch =
      submission.submittedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      submission.formName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      submission.location?.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesStatus = true;
    if (filterStatus === 'pending') {
      matchesStatus = !submission.verified && !submission.rejectionReason;
    } else if (filterStatus === 'verified') {
      matchesStatus = submission.verified;
    } else if (filterStatus === 'rejected') {
      matchesStatus = !!submission.rejectionReason;
    }

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (submission: Submission) => {
    if (submission.verified) {
      return { label: t.verified, color: '#10B981', icon: '✅' };
    } else if (submission.rejectionReason) {
      return { label: t.rejected, color: '#EF4444', icon: '❌' };
    } else {
      return { label: t.pending, color: '#F59E0B', icon: '⏳' };
    }
  };

  const handleViewSubmission = (submissionId: string) => {
    navigate(`/meal/survey/submission/${submissionId}?projectId=${projectId}`);
  };

  const handleVerifySubmission = (submissionId: string) => {
    if (window.confirm(t.confirmVerify)) {
      setSubmissions(
        submissions.map((s) =>
          s.id === submissionId ? { ...s, verified: true, rejectionReason: undefined } : s
        )
      );
      alert(t.verifySuccess);
    }
  };

  const handleRejectSubmission = (submissionId: string) => {
    const reason = window.prompt(t.enterRejectionReason);
    if (reason?.trim()) {
      setSubmissions(
        submissions.map((s) =>
          s.id === submissionId ? { ...s, verified: false, rejectionReason: reason } : s
        )
      );
      alert(t.rejectSuccess);
    }
  };

  const handleDeleteSubmission = (submissionId: string) => {
    if (window.confirm(t.confirmDelete)) {
      setSubmissions(submissions.filter((s) => s.id !== submissionId));
      alert(t.deleteSuccess);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header - ✅ Back button fixed: positioned LTR and navigates to Survey & Data Collection */}
      <div className="flex items-center justify-between mb-2">
        <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
          <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
          <p className="text-sm text-gray-600 mt-1">{t.subtitle}</p>
        </div>
        <button
          onClick={() => navigate(`/meal/survey?projectId=${projectId}&projectName=${projectName}`)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
          <span className="text-sm font-medium text-gray-700">{t.back}</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className={`absolute top-3 w-5 h-5 text-gray-400 ${isRTL ? 'right-4' : 'left-4'}`} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          className={`w-full px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            isRTL ? 'pr-12 text-right' : 'pl-12'
          }`}
        />
      </div>

      {/* Filter Buttons */}
      <div className={`flex gap-2 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {(['all', 'pending', 'verified', 'rejected'] as SubmissionStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-full transition-colors ${
              filterStatus === status
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <span className="text-sm font-medium">
              {status === 'all' ? t.all : status === 'pending' ? t.pending : status === 'verified' ? t.verified : t.rejected}
            </span>
          </button>
        ))}
      </div>

      {/* Submissions List */}
      {loading ? (
        <div className="py-12 text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-lg text-gray-600 mb-2">{t.noSubmissions}</p>
          <p className="text-sm text-gray-500">{t.noSubmissionsDesc}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSubmissions.map((submission) => {
            const status = getStatusBadge(submission);
            return (
              <div
                key={submission.id}
                className="rounded-xl p-4 bg-white border border-gray-200 space-y-3"
              >
                {/* Submission Header */}
                <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className={`flex items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="text-xs font-semibold text-gray-600">{t.id}: {submission.id}</span>
                      <span
                        className="px-2 py-1 rounded-full text-xs font-semibold"
                        style={{ backgroundColor: status.color + '20', color: status.color }}
                      >
                        {status.icon} {status.label}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                      {submission.formName}
                    </h3>
                    <p className="text-sm text-gray-600">{t.submittedBy}: {submission.submittedBy}</p>
                  </div>
                </div>

                {/* Submission Metadata */}
                <div className={`flex gap-4 py-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <p className="text-xs text-gray-600">{t.date}</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">
                      {new Date(submission.submittedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <p className="text-xs text-gray-600">{t.time}</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">
                      {new Date(submission.submittedAt).toLocaleTimeString()}
                    </p>
                  </div>
                  {submission.location && (
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <p className="text-xs text-gray-600">{t.location}</p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">
                        {submission.location}
                      </p>
                    </div>
                  )}
                </div>

                {/* Rejection Reason (if rejected) */}
                {submission.rejectionReason && (
                  <div className="p-3 rounded-lg bg-red-50" style={{ borderLeft: isRTL ? 'none' : '4px solid #EF4444', borderRight: isRTL ? '4px solid #EF4444' : 'none' }}>
                    <p className={`text-xs font-semibold text-gray-900 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.rejectionReason}</p>
                    <p className={`text-sm text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{submission.rejectionReason}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className={`flex gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <button
                    onClick={() => handleViewSubmission(submission.id)}
                    className="flex-1 min-w-[45%] py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    <span className="text-xs font-semibold text-white flex items-center justify-center gap-1">
                      <Eye className="w-3 h-3" /> {t.view}
                    </span>
                  </button>

                  {!submission.verified && !submission.rejectionReason && (
                    <>
                      <button
                        onClick={() => handleVerifySubmission(submission.id)}
                        className="flex-1 min-w-[45%] py-2 rounded-lg bg-green-600 hover:bg-green-700 transition-colors"
                      >
                        <span className="text-xs font-semibold text-white flex items-center justify-center gap-1">
                          <CheckCircle className="w-3 h-3" /> {t.verify}
                        </span>
                      </button>
                      <button
                        onClick={() => handleRejectSubmission(submission.id)}
                        className="flex-1 min-w-[45%] py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-xs font-semibold text-red-600 flex items-center justify-center gap-1">
                          <XCircle className="w-3 h-3" /> {t.reject}
                        </span>
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => handleDeleteSubmission(submission.id)}
                    className="flex-1 min-w-[45%] py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-xs font-semibold text-red-600 flex items-center justify-center gap-1">
                      <Trash2 className="w-3 h-3" /> {t.delete}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}