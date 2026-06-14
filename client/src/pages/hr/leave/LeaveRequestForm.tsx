/**
 * ============================================================================
 * LEAVE REQUEST FORM (tRPC VERSION WITH i18n)
 * ============================================================================
 * 
 * Purpose: Create/Update leave request with proper status lifecycle
 * 
 * Features:
 * - Auto-filled employee info (read-only)
 * - Leave type selection
 * - Date range with auto-calculation
 * - Conditional fields (justification, medical report)
 * - Real-time validation
 * - Balance checking from tRPC
 * - Real-time projected balance deduction
 * - Email notification preview
 * - Draft vs Submit with single record update
 * - Full i18n support (EN/AR/IT)
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Upload, CheckCircle, Calendar, Mail, Loader2 } from 'lucide-react';
import { StaffMember } from '../types/hrTypes';
import { LeaveRequest, LeaveBalance, LeaveStatus, LeaveType } from './types';
import { calculateLeaveDays, validateLeaveRequest } from './leaveCalculations';
import { emailNotificationService, EmailNotification } from './emailNotificationService';
import { EmailPreviewModal } from './EmailPreviewModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCreateLeaveRequest, useUpdateLeaveRequest } from '@/hooks/useLeave';
import { hrAnnualLeaveTranslations } from '@/i18n/hrAnnualLeave-i18n';
import { trpc } from '@/lib/trpc';

interface Props {
 employee: StaffMember;
 language: string;
 isRTL: boolean;
 onClose: () => void;
 onSave: () => void;
 editingRequest?: LeaveRequest | null;
}

export function LeaveRequestForm({
 employee, language, isRTL, onClose, onSave, editingRequest }: Props) {
  const t =
   hrAnnualLeaveTranslations[
     language as keyof typeof hrAnnualLeaveTranslations
   ];
 const { mutateAsync: createRequest, isPending: isCreating } = useCreateLeaveRequest();
 const { mutateAsync: updateRequest, isPending: isUpdating } = useUpdateLeaveRequest();
 const utils = trpc.useUtils();
 const isSubmitting = isCreating || isUpdating;
 
 // Fetch real balance from tRPC
 const { data: employeeBalance, isLoading: balanceLoading } = trpc.hrAnnualLeave.calculateEmployeeBalance.useQuery({
 employeeId: Number(employee.id),
 year: new Date().getFullYear(),
 });

 const balance = employeeBalance || {
  entitlement: 0,
  accrued: 0,
  used: 0,
  pending: 0,
  remaining: 0,
  available: 0,
 };
 
 const [formData, setFormData] = useState({
 leaveType: (editingRequest?.leaveType || 'annual') as LeaveType,
 startDate: editingRequest?.startDate || '',
 endDate: editingRequest?.endDate || '',
 totalDays: editingRequest?.totalDays || 0,
 reason: editingRequest?.reason || '',
 medicalReportFile: editingRequest?.medicalReportFile || '',
 medicalReportFileName: editingRequest?.medicalReportFileName || ''
 });

 const [errors, setErrors] = useState<string[]>([]);
 const [emailNotification, setEmailNotification] = useState<EmailNotification | null>(null);
 const [showEmailPreview, setShowEmailPreview] = useState(false);

 // Auto-calculate total days when dates change
 useEffect(() => {
 if (formData.startDate && formData.endDate) {
 const days = calculateLeaveDays(formData.startDate, formData.endDate);
 setFormData(prev => ({ ...prev, totalDays: days }));
 }
 }, [formData.startDate, formData.endDate]);

 const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;

 // Validate file type (PDF only)
 if (file.type !== 'application/pdf') {
 alert(t.validation.pdfOnly);
 return;
 }

 // Validate file size (max 5MB)
 if (file.size > 5 * 1024 * 1024) {
 alert(t.validation.fileTooLarge);
 return;
 }

 // Convert to base64
 const reader = new FileReader();
 reader.onload = () => {
 setFormData(prev => ({
 ...prev,
 medicalReportFile: reader.result as string,
 medicalReportFileName: file.name
 }));
 };
 reader.readAsDataURL(file);
 };

 const mapLeaveTypeToBackend = (leaveType: LeaveType) => {
  return leaveType;
};


 const handleSubmit = async (asDraft: boolean = false) => {
 setErrors([]);

 // Validate
 const validation = validateLeaveRequest({
 leaveType: formData.leaveType,
 startDate: formData.startDate,
 endDate: formData.endDate,
 totalDays: formData.totalDays,
 reason: formData.reason,
 medicalReportFile: formData.medicalReportFile,
 availableBalance: balance.available,
 contractStartDate: employee.contractStartDate,
 contractEndDate: employee.contractEndDate || new Date().toISOString()
 });

 if (!validation.valid && !asDraft) {
 setErrors(validation.errors);
 return;
 }

 try {
 // Determine status based on action
 const status = asDraft ? 'draft' : 'pending';

 if (editingRequest) {
         // Update existing request - SINGLE RECORD UPDATE
         await updateRequest({
         id: Number(editingRequest.id),
         employeeId: Number(employee.id),
         leaveType: mapLeaveTypeToBackend(formData.leaveType),
         startDate: formData.startDate,
         endDate: formData.endDate,
         totalDays: Number(formData.totalDays),
         reason: formData.reason || undefined,
         attachmentUrl: formData.medicalReportFile || undefined,
         status: status,
         submittedAt: asDraft ? undefined : new Date().toISOString(),
         lastStatusUpdatedAt: new Date().toISOString(),
         });
 } else {
         // Create new request - ONLY ONE RECORD
         await createRequest({
         employeeId: Number(employee.id),
         leaveType: mapLeaveTypeToBackend(formData.leaveType),
         startDate: formData.startDate,
         endDate: formData.endDate,
         totalDays: Number(formData.totalDays),
         reason: formData.reason || undefined,
         attachmentUrl: formData.medicalReportFile || undefined,
         status: status,
         submittedAt: asDraft ? undefined : new Date().toISOString(),
         lastStatusUpdatedAt: new Date().toISOString(),
         });
 }

 // Invalidate annual leave queries to refresh balances immediately
 await utils.hrAnnualLeave.calculateEmployeeBalance.invalidate();
 await utils.hrAnnualLeave.getLeaveBalanceSummary.invalidate();
 await utils.hrAnnualLeave.getEmployeesAnnualLeave.invalidate();

 // Send email notification if not draft
 if (!asDraft) {
 const notification: EmailNotification = {
  id: crypto.randomUUID(),
  type: 'leave_request_submitted',
  recipientName: employee.fullName,
  recipientEmail: employee.email || 'employee@company.com',
  recipientRole: employee.jobTitle || 'Employee',
  subject: `${t.form.leaveRequest} - ${formData.leaveType}`,
  body: `${t.messages.leaveRequestSubmitted} ${formData.leaveType} ${t.dateTime.from} ${formData.startDate} ${t.dateTime.to} ${formData.endDate}.`,
  metadata: {
    leaveRequestId: editingRequest?.id?.toString() ?? 'new',
    staffName: employee.fullName,
    leaveType: formData.leaveType,
    startDate: formData.startDate,
    endDate: formData.endDate,
    totalDays: formData.totalDays,
  },
  sentAt: new Date().toISOString(),
  status: 'simulated',
 };
 setEmailNotification(notification);
 setShowEmailPreview(true);
 } else {
 onSave();
 }
 } catch (error: any) {
 setErrors([error?.message || t.messages.failedToSave]);
 }
 };

 const localT = {
 title: t.form.leaveRequest,
 employeeInfo: t.leaveRequestForm.employeeInformation,
 leaveDetails: t.leaveRequestForm.leaveDetails,
 leaveBalance: t.leaveBalance.title,
 
 staffId: t.tableColumns.staffId,
 fullName: t.tableColumns.name,
 position: t.tableColumns.position,
 department: t.tableColumns.department,
 contractPeriod: t.tableColumns.contractPeriod,
 
 leaveType: t.leaveDetails.leaveType,
 annualLeave: t.leaveTypes.annualLeave,
 emergencyLeave: t.leaveTypes.emergencyLeave,
 sickLeave: t.leaveTypes.sickLeave,
 otherLeave: t.leaveTypes.other,
 
 startDate: t.leaveDetails.startDate,
 endDate: t.leaveDetails.endDate,
 totalDays: t.leaveDetails.totalDays,
 reason: t.leaveDetails.reason,
 medicalReport: t.leaveDetails.medicalReport,
 
 accrued: t.leaveBalance.accrued,
 used: t.leaveBalance.used,
 pending: t.leaveBalance.pending,
 remaining: t.leaveBalance.remaining,
 available: t.leaveBalance.available,
 
 saveAsDraft: t.buttons.saveAsDraft,
 submit: t.buttons.submitRequest,
 cancel: t.buttons.cancel,
 
 uploadFile: t.form.uploadFile,
 fileUploaded: t.form.fileUploaded,
 
 pdfOnly: t.validation.pdfOnly,
 fileTooLarge: t.validation.fileTooLarge,
 
 days: t.units.days
 };

 const formatDate = (dateString: string) => {
 if (!dateString) return '-';
 return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
 year: 'numeric',
 month: 'short',
 day: 'numeric'
 });
 };

 // Calculate projected available balance
 const projectedAvailable = Math.max(0, balance.available - formData.totalDays);
 const hasInsufficientBalance =
  formData.leaveType === 'annual' &&
  formData.totalDays > balance.available;

 return (
 <>
 <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
 <h2 className="text-lg font-semibold text-gray-900">{localT.title}</h2>
 <button
 onClick={onClose}
 className="text-gray-400 hover:text-gray-600"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Content */}
 <div className="p-6 space-y-6">
 {/* Errors */}
 {errors.length > 0 && (
 <div className="bg-red-50 border border-red-200 rounded-lg p-4">
 <div className={`flex items-start gap-3`}>
 <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
 <div className={'text-start'}>
 <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
 {errors.map((error, index) => (
 <li key={index}>{error}</li>
 ))}
 </ul>
 </div>
 </div>
 </div>
 )}

 {/* Employee Information (Read-Only) */}
 <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
 <h3 className="text-sm font-semibold text-gray-900 mb-3">{localT.employeeInfo}</h3>
 <div className="grid grid-cols-2 gap-4 text-sm">
 <div>
 <p className="text-gray-600">{localT.staffId}:</p>
 <p className="font-medium text-gray-900">{employee.staffId}</p>
 </div>
 <div>
 <p className="text-gray-600">{localT.fullName}:</p>
 <p className="font-medium text-gray-900">{employee.fullName}</p>
 </div>
 <div>
 <p className="text-gray-600">{localT.position}:</p>
 <p className="font-medium text-gray-900">{employee.jobTitle || employee.position || '-'}</p>
 </div>
 <div>
 <p className="text-gray-600">{localT.department}:</p>
 <p className="font-medium text-gray-900">{employee.department || '-'}</p>
 </div>
 <div className="col-span-2">
 <p className="text-gray-600">{localT.contractPeriod}:</p>
 <p className="font-medium text-gray-900">
 {formatDate(employee.contractStartDate)} → {formatDate(employee.contractEndDate || new Date().toISOString())}
 </p>
 </div>
 </div>
 </div>

 {/* Leave Balance */}
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
 <h3 className="text-sm font-semibold text-blue-900 mb-3">{localT.leaveBalance}</h3>
 {balanceLoading ? (
 <div className="flex items-center gap-2 text-blue-700">
 <Loader2 className="w-4 h-4 animate-spin" />
 <span>{t.messages.loading}</span>
 </div>
 ) : (
 <>
 <div className="grid grid-cols-5 gap-3 text-sm">
 <div>
 <p className="text-blue-700">{localT.accrued}:</p>
 <p className="font-bold text-blue-900">{balance.accrued} {localT.days}</p>
 </div>
 <div>
 <p className="text-blue-700">{localT.used}:</p>
 <p className="font-bold text-blue-900">{balance.used} {localT.days}</p>
 </div>
 <div>
 <p className="text-blue-700">{localT.pending}:</p>
 <p className="font-bold text-blue-900">{balance.pending} {localT.days}</p>
 </div>
 <div>
 <p className="text-blue-700">{localT.remaining}:</p>
 <p className="font-bold text-blue-900">{balance.remaining} {localT.days}</p>
 </div>
 <div className="bg-blue-100 rounded p-2">
 <p className="text-blue-700">{localT.available}:</p>
 <p className="font-bold text-blue-900 text-lg">{balance.available} {localT.days}</p>
 </div>
 </div>

 {/* Projected Balance After Request */}
 {formData.totalDays > 0 && formData.leaveType === 'annual' && (
 <div className="mt-4 pt-4 border-t border-blue-200">
 <div className="flex items-center justify-between">
 <span className="text-blue-700 font-medium">{t.leaveBalance.available} {t.dateTime.after} {t.leaveDetails.request}:</span>
 <span className={`font-bold text-lg ${
 hasInsufficientBalance ? 'text-red-600' : 'text-green-600'
 }`}>
 {projectedAvailable} {localT.days}
 </span>
 </div>
 {hasInsufficientBalance && (
 <p className="text-red-600 text-xs mt-2">⚠️ {t.leaveBalance.insufficientBalance}</p>
 )}
 </div>
 )}
 </>
 )}
 </div>

 {/* Leave Details Form */}
 <div className="space-y-4">
 <h3 className="text-sm font-semibold text-gray-900">{localT.leaveDetails}</h3>

 {/* Leave Type */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {localT.leaveType} <span className="text-red-600">*</span>
 </label>
 <select
 value={formData.leaveType}
 onChange={(e) => setFormData({ ...formData, leaveType: e.target.value as LeaveType })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 >
<option value="annual">{localT.annualLeave}</option>
<option value="sick">{localT.sickLeave}</option>
<option value="maternity">Maternity Leave</option>
<option value="paternity">Paternity Leave</option>
<option value="unpaid">Unpaid Leave</option>
<option value="compassionate">Compassionate Leave</option>
<option value="study">Study Leave</option>
<option value="other">{localT.otherLeave}</option>
 </select>
 </div>

 {/* Date Range */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {localT.startDate} <span className="text-red-600">*</span>
 </label>
 <input
 type="date"
 value={formData.startDate}
 onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {localT.endDate} <span className="text-red-600">*</span>
 </label>
 <input
 type="date"
 value={formData.endDate}
 onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 />
 </div>
 </div>

 {/* Total Days (Auto-calculated) */}
 <div className={`rounded-lg p-3 ${hasInsufficientBalance ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
 <p className={`text-sm font-semibold ${hasInsufficientBalance ? 'text-red-900' : 'text-yellow-900'}`}>
 {localT.totalDays}: <span className="text-xl">{formData.totalDays}</span> {localT.days}
 </p>
 </div>

 {/* Reason */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {localT.reason} <span className="text-red-600">*</span>
 </label>
 <textarea
 value={formData.reason}
 onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
 rows={3}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 placeholder={t.form.enterReason}
 />
 </div>

 {/* Conditional: Medical Report for Sick > 3 days */}
 {formData.leaveType === 'sick' && formData.totalDays > 3 && (
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {localT.medicalReport} <span className="text-red-600">*</span>
 </label>
 <div className="flex items-center gap-3">
 <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-300 rounded-lg cursor-pointer hover:bg-blue-100">
 <Upload className="w-4 h-4 text-blue-700" />
 <span className="text-sm font-medium text-blue-700">{localT.uploadFile}</span>
 <input
 type="file"
 accept="application/pdf"
 onChange={handleFileUpload}
 className="hidden"
 />
 </label>
 {formData.medicalReportFileName && (
 <div className="flex items-center gap-2 text-sm text-green-700">
 <CheckCircle className="w-4 h-4" />
 <span>{formData.medicalReportFileName}</span>
 </div>
 )}
 </div>
 </div>
 )}
 </div>
 </div>

 {/* Footer */}
 <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
 <button
 onClick={onClose}
 disabled={isSubmitting}
 className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50"
 >
 {localT.cancel}
 </button>
 <button
 onClick={() => handleSubmit(true)}
 disabled={isSubmitting}
 className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 flex items-center gap-2"
 >
 <Save className="w-4 h-4" />
 {localT.saveAsDraft}
 </button>
 <button
 onClick={() => handleSubmit(false)}
 disabled={isSubmitting || hasInsufficientBalance}
 className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
 >
 {isSubmitting ? (
 <>
 <Loader2 className="w-4 h-4 animate-spin" />
 {t.messages.saving}
 </>
 ) : (
 <>
 <Mail className="w-4 h-4" />
 {localT.submit}
 </>
 )}
 </button>
 </div>
 </div>
 </div>

{/* Email Preview Modal */}
{showEmailPreview && emailNotification && (
  <EmailPreviewModal
    notification={emailNotification}
    language={language}
    isRTL={isRTL}
    onClose={() => {
      setShowEmailPreview(false);
      onSave();
 }}
 />
 )}
 </>
 );
}