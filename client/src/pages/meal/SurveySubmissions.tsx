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

import { useNavigate } from '@/lib/router-compat';
import { useSearch } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect } from 'react';
import { Search, Filter, Download, Eye, Edit, Trash2, CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

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
 const { t } = useTranslation();
 const navigate = useNavigate();
 const searchString = useSearch();
 const searchParams = new URLSearchParams(searchString);
 const { language, isRTL } = useLanguage();
 const [searchQuery, setSearchQuery] = useState('');
 const [filterStatus, setFilterStatus] = useState<SubmissionStatus>('all');
 const [submissions, setSubmissions] = useState<Submission[]>([]);
 const [loading, setLoading] = useState(true);

 const projectId = searchParams.get('projectId') || '';
 const projectName = searchParams.get('projectName') || '';

 const labels = {
 title: t.mealSurvey.dataCollection,
 subtitle: t.mealSurvey.viewAndVerifySubmissions,
 searchPlaceholder: t.mealSurvey.searchSubmissions,
 all: t.mealSurvey.all,
 pending: t.mealSurvey.pending19,
 verified: t.mealSurvey.verified20,
 rejected: t.mealSurvey.rejected,
 noSubmissions: t.mealSurvey.noSubmissionsFound,
 noSubmissionsDesc: t.mealSurvey.submissionsWillAppearHereOnceData,
 id: t.mealSurvey.id,
 submittedBy: t.mealSurvey.submittedBy,
 date: t.mealSurvey.date,
 time: t.mealSurvey.time,
 location: t.mealSurvey.location,
 rejectionReason: t.mealSurvey.rejectionReason,
 view: t.mealSurvey.view,
 verify: t.mealSurvey.verify,
 reject: t.mealSurvey.reject,
 delete: t.mealSurvey.delete,
 confirmVerify: t.mealSurvey.markThisSubmissionAsVerified,
 confirmDelete: t.mealSurvey.areYouSureYouWantTo21,
 cancel: t.mealSurvey.cancel,
 success: t.mealSurvey.success,
 verifySuccess: t.mealSurvey.submissionVerified22,
 deleteSuccess: t.mealSurvey.submissionDeleted,
 rejectSuccess: t.mealSurvey.submissionRejected,
 enterRejectionReason: t.mealSurvey.enterRejectionReason,
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
 return { label: labels.verified, color: '#10B981', icon: '✅' };
 } else if (submission.rejectionReason) {
 return { label: labels.rejected, color: '#EF4444', icon: '❌' };
 } else {
 return { label: labels.pending, color: '#F59E0B', icon: '⏳' };
 }
 };

 const handleViewSubmission = (submissionId: string) => {
 navigate(`/organization/meal/survey/submission/${submissionId}?projectId=${projectId}`);
 };

 const handleVerifySubmission = (submissionId: string) => {
 if (window.confirm(labels.confirmVerify)) {
 setSubmissions(
 submissions.map((s) =>
 s.id === submissionId ? { ...s, verified: true, rejectionReason: undefined } : s
 )
 );
 alert(labels.verifySuccess);
 }
 };

 const handleRejectSubmission = (submissionId: string) => {
 const reason = window.prompt(labels.enterRejectionReason);
 if (reason?.trim()) {
 setSubmissions(
 submissions.map((s) =>
 s.id === submissionId ? { ...s, verified: false, rejectionReason: reason } : s
 )
 );
 alert(labels.rejectSuccess);
 }
 };

 const handleDeleteSubmission = (submissionId: string) => {
 if (window.confirm(labels.confirmDelete)) {
 setSubmissions(submissions.filter((s) => s.id !== submissionId));
 alert(labels.deleteSuccess);
 }
 };

 return (
 <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Back Navigation */}
 <BackButton onClick={() => navigate('/organization/meal/survey')} label={t.mealSurvey.backToSurveys} />
 {/* Header - ✅ Back button fixed: positioned LTR and navigates to Survey & Data Collection */}
 <div className="flex items-center justify-between mb-2">
 <div className={`flex-1 text-start`}>
 <h1 className="text-2xl font-bold text-gray-900">{labels.title}</h1>
 <p className="text-sm text-gray-600 mt-1">{labels.subtitle}</p>
 </div>
 </div>

 {/* Search */}
 <div className="relative">
 <Search className={`absolute top-3 w-5 h-5 text-gray-400 ${'start-4'}`} />
 <input
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder={labels.searchPlaceholder}
 className={`w-full px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${ t.mealSurvey.pl12 }`}
 />
 </div>

 {/* Filter Buttons */}
 <div className={`flex gap-2 mb-4`}>
 {(['all', 'pending', 'verified', 'rejected'] as SubmissionStatus[]).map((status) => (
 <button
 key={status}
 onClick={() => setFilterStatus(status)}
 className={`px-4 py-2 rounded-full transition-colors ${ filterStatus === status ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50' }`}
 >
 <span className="text-sm font-medium">
 {status === 'all' ? labels.all : status === 'pending' ? labels.pending : status === 'verified' ? labels.verified : labels.rejected}
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
 <p className="text-lg text-gray-600 mb-2">{labels.noSubmissions}</p>
 <p className="text-sm text-gray-500">{labels.noSubmissionsDesc}</p>
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
 <div className={`flex items-start justify-between`}>
 <div className={`flex-1 text-start`}>
 <div className={`flex items-center gap-2 mb-1`}>
 <span className="text-xs font-semibold text-gray-600">{labels.id}: {submission.id}</span>
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
 <p className="text-sm text-gray-600">{labels.submittedBy}: {submission.submittedBy}</p>
 </div>
 </div>

 {/* Submission Metadata */}
 <div className={`flex gap-4 py-2`}>
 <div className={'text-start'}>
 <p className="text-xs text-gray-600">{labels.date}</p>
 <p className="text-sm font-semibold text-gray-900 mt-1">
 {new Date(submission.submittedAt).toLocaleDateString()}
 </p>
 </div>
 <div className={'text-start'}>
 <p className="text-xs text-gray-600">{labels.time}</p>
 <p className="text-sm font-semibold text-gray-900 mt-1">
 {new Date(submission.submittedAt).toLocaleTimeString()}
 </p>
 </div>
 {submission.location && (
 <div className={'text-start'}>
 <p className="text-xs text-gray-600">{labels.location}</p>
 <p className="text-sm font-semibold text-gray-900 mt-1">
 {submission.location}
 </p>
 </div>
 )}
 </div>

 {/* Rejection Reason (if rejected) */}
 {submission.rejectionReason && (
 <div className="p-3 rounded-lg bg-red-50" style={{ borderLeft: t.mealSurvey.k4pxSolidEf4444, borderRight: t.mealSurvey.none }}>
 <p className={`text-xs font-semibold text-gray-900 mb-1 text-start`}>{labels.rejectionReason}</p>
 <p className={`text-sm text-gray-700 text-start`}>{submission.rejectionReason}</p>
 </div>
 )}

 {/* Action Buttons */}
 <div className={`flex gap-2 flex-wrap`}>
 <button
 onClick={() => handleViewSubmission(submission.id)}
 className="flex-1 min-w-[45%] py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
 >
 <span className="text-xs font-semibold text-white flex items-center justify-center gap-1">
 <Eye className="w-3 h-3" /> {labels.view}
 </span>
 </button>

 {!submission.verified && !submission.rejectionReason && (
 <>
 <button
 onClick={() => handleVerifySubmission(submission.id)}
 className="flex-1 min-w-[45%] py-2 rounded-lg bg-green-600 hover:bg-green-700 transition-colors"
 >
 <span className="text-xs font-semibold text-white flex items-center justify-center gap-1">
 <CheckCircle className="w-3 h-3" /> {labels.verify}
 </span>
 </button>
 <button
 onClick={() => handleRejectSubmission(submission.id)}
 className="flex-1 min-w-[45%] py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
 >
 <span className="text-xs font-semibold text-red-600 flex items-center justify-center gap-1">
 <XCircle className="w-3 h-3" /> {labels.reject}
 </span>
 </button>
 </>
 )}

 <button
 onClick={() => handleDeleteSubmission(submission.id)}
 className="flex-1 min-w-[45%] py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
 >
 <span className="text-xs font-semibold text-red-600 flex items-center justify-center gap-1">
 <Trash2 className="w-3 h-3" /> {labels.delete}
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