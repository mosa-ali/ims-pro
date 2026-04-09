// ============================================================================
// APPROVAL PANEL COMPONENT
// Reusable approval workflow display and action component
// Integrated Management System (IMS)
// ============================================================================

import React, { useState } from 'react';
import { CheckCircle, Clock, XCircle, Lock, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { approvalFlowService, type ApprovalFlow, type ApprovalStep } from '@/services/approvalFlowService';
import { useTranslation } from '@/i18n/useTranslation';
interface ApprovalPanelProps {
 flow: ApprovalFlow;
 onApprove?: () => void;
 onReject?: () => void;
 compact?: boolean;
}

export function ApprovalPanel({
 flow, onApprove, onReject, compact = false }: ApprovalPanelProps) {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const { user } = useAuth();
const [showRejectModal, setShowRejectModal] = useState(false);
 const [rejectionReason, setRejectionReason] = useState('');
 const [comments, setComments] = useState('');
 const [processing, setProcessing] = useState(false);

 ;
const getStatusIcon = (status: ApprovalStep['status']) => {
 switch (status) {
 case 'approved':
 return <CheckCircle className="w-5 h-5 text-green-600" />;
 case 'pending':
 return <Clock className="w-5 h-5 text-amber-600" />;
 case 'rejected':
 return <XCircle className="w-5 h-5 text-red-600" />;
 case 'locked':
 return <Lock className="w-5 h-5 text-gray-400" />;
 default:
 return <AlertCircle className="w-5 h-5 text-gray-400" />;
 }
 };

 const getStatusBadge = (status: ApprovalStep['status']) => {
 const baseClasses = 'px-2 py-1 rounded text-xs font-medium';
 switch (status) {
 case 'approved':
 return `${baseClasses} bg-green-100 text-green-800`;
 case 'pending':
 return `${baseClasses} bg-amber-100 text-amber-800`;
 case 'rejected':
 return `${baseClasses} bg-red-100 text-red-800`;
 case 'locked':
 return `${baseClasses} bg-gray-100 text-gray-600`;
 default:
 return `${baseClasses} bg-gray-100 text-gray-600`;
 }
 };

 const canUserApprove = () => {
 if (!user) return false;
 return approvalFlowService.canUserApprove(flow.id, user.role);
 };

 const handleApprove = async () => {
 if (!canUserApprove() || !user) return;

 setProcessing(true);
 const currentStep = flow.steps.find(s => s.status === 'pending');
 if (!currentStep) return;

 const result = approvalFlowService.approveStep(
 flow.id,
 currentStep.stepNumber,
 user.id,
 user.fullName,
 user.role,
 comments
 );

 setProcessing(false);
 if (result.success && onApprove) {
 onApprove();
 }
 };

 const handleReject = async () => {
 if (!rejectionReason.trim()) {
 alert(t.approvalPanel.reasonRequired);
 return;
 }

 if (!canUserApprove() || !user) return;

 setProcessing(true);
 const currentStep = flow.steps.find(s => s.status === 'pending');
 if (!currentStep) return;

 const result = approvalFlowService.rejectStep(
 flow.id,
 currentStep.stepNumber,
 user.id,
 user.fullName,
 user.role,
 rejectionReason
 );

 setProcessing(false);
 if (result.success && onReject) {
 setShowRejectModal(false);
 setRejectionReason('');
 onReject();
 }
 };

 const currentStep = flow.steps.find(s => s.status === 'pending');
 const showActionButtons = canUserApprove() && currentStep;

 return (
 <div className={`bg-white rounded-lg border border-gray-200`}>
 <div className="p-4 border-b border-gray-200">
 <h3 className="text-sm font-bold text-gray-900">{t.approvalPanel.title}</h3>
 </div>

 <div className="p-4 space-y-4">
 {flow.steps.map((step, index) => (
 <div key={step.stepNumber} className="relative">
 {/* Connection line */}
 {index < flow.steps.length - 1 && (
 <div className={`absolute ${isRTL ? 'right-[13px]' : 'left-[13px]'} top-8 bottom-[-16px] w-0.5 bg-gray-200`} />
 )}

 {/* Step content */}
 <div className={`flex items-start gap-3`}>
 {/* Icon */}
 <div className="relative z-10 mt-0.5">
 {getStatusIcon(step.status)}
 </div>

 {/* Details */}
 <div className="flex-1 min-w-0">
 <div className={`flex items-center justify-between gap-2 mb-1`}>
 <div className={`text-sm font-medium text-gray-900 text-start`}>
 {language === 'en' ? step.roleLabel.en : step.roleLabel.ar}
 </div>
 <span className={getStatusBadge(step.status)}>
 {(t.approvalPanel as any)[step.status] || t.approvalPanel.notStarted}
 </span>
 </div>

 {step.approverName && (
 <div className={`text-xs text-gray-600 text-start`}>
 {t.approvalPanel.approver}: {step.approverName}
 </div>
 )}

 {step.approvedAt && (
 <div className={`text-xs text-gray-500 text-start`}>
 {t.approvalPanel.date}: {new Date(step.approvedAt).toLocaleDateString(t.procurement.enus)}
 </div>
 )}

 {step.comments && (
 <div className={`text-xs text-gray-600 mt-1 italic text-start`}>
 {step.comments}
 </div>
 )}

 {step.rejectionReason && (
 <div className={`text-xs text-red-600 mt-1 text-start`}>
 {step.rejectionReason}
 </div>
 )}
 </div>
 </div>
 </div>
 ))}
 </div>

 {/* Action Buttons */}
 {showActionButtons && (
 <div className={`p-4 border-t border-gray-200 bg-gray-50 flex gap-3`}>
 <button
 onClick={handleApprove}
 disabled={processing}
 className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
 >
 ✅ {t.approvalPanel.approveButton}
 </button>
 <button
 onClick={() => setShowRejectModal(true)}
 disabled={processing}
 className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
 >
 ❌ {t.approvalPanel.rejectButton}
 </button>
 </div>
 )}

 {/* Reject Modal */}
 {showRejectModal && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50">
 <div className={`bg-white rounded-lg shadow-xl max-w-md w-full mx-4`}>
 <div className="p-6">
 <h3 className="text-lg font-bold text-gray-900 mb-4">{t.approvalPanel.rejectTitle}</h3>
 
 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {t.approvalPanel.rejectLabel}
 </label>
 <textarea
 value={rejectionReason}
 onChange={(e) => setRejectionReason(e.target.value)}
 placeholder={t.approvalPanel.rejectPlaceholder}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 rows={3}
 required
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {t.approvalPanel.commentsLabel}
 </label>
 <textarea
 value={comments}
 onChange={(e) => setComments(e.target.value)}
 placeholder={t.approvalPanel.commentsPlaceholder}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 rows={2}
 />
 </div>
 </div>

 <div className={`flex gap-3 mt-6`}>
 <button
 onClick={() => {
 setShowRejectModal(false);
 setRejectionReason('');
 setComments('');
 }}
 className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
 >
 {t.approvalPanel.cancel}
 </button>
 <button
 onClick={handleReject}
 disabled={!rejectionReason.trim() || processing}
 className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {t.approvalPanel.submit}
 </button>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
