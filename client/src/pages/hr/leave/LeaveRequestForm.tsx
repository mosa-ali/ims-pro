/**
 * ============================================================================
 * LEAVE REQUEST FORM
 * ============================================================================
 * 
 * Purpose: Create new leave request with full validation
 * 
 * Features:
 * - Auto-filled employee info (read-only)
 * - Leave type selection
 * - Date range with auto-calculation
 * - Conditional fields (justification, medical report)
 * - Real-time validation
 * - Balance checking
 * - Email notification preview
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Upload, CheckCircle, Calendar, Mail } from 'lucide-react';
import { StaffMember } from '../types/hrTypes';
import { LeaveRequest, LeaveType } from './types';
import { leaveRequestService, leaveBalanceService } from './leaveService';
import { calculateLeaveDays, validateLeaveRequest } from './leaveCalculations';
import { emailNotificationService, EmailNotification } from './emailNotificationService';
import { EmailPreviewModal } from './EmailPreviewModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

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
 const { t } = useTranslation();
 const balance = leaveBalanceService.calculateBalance(employee);
 
 const [formData, setFormData] = useState({
 leaveType: (editingRequest?.leaveType || 'Annual Leave') as LeaveType,
 startDate: editingRequest?.startDate || '',
 endDate: editingRequest?.endDate || '',
 totalDays: editingRequest?.totalDays || 0,
 reason: editingRequest?.reason || '',
 justification: editingRequest?.justification || '',
 medicalReportFile: editingRequest?.medicalReportFile || '',
 medicalReportFileName: editingRequest?.medicalReportFileName || ''
 });

 const [errors, setErrors] = useState<string[]>([]);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [emailNotification, setEmailNotification] = useState<EmailNotification | null>(null);

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
 alert(t.pdfOnly);
 return;
 }

 // Validate file size (max 5MB)
 if (file.size > 5 * 1024 * 1024) {
 alert(t.fileTooLarge);
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

 const handleSubmit = (asDraft: boolean = false) => {
 setIsSubmitting(true);
 setErrors([]);

 // Validate
 const validation = validateLeaveRequest({
 leaveType: formData.leaveType,
 startDate: formData.startDate,
 endDate: formData.endDate,
 totalDays: formData.totalDays,
 reason: formData.reason,
 justification: formData.justification,
 medicalReportFile: formData.medicalReportFile,
 availableBalance: balance.availableBalance,
 contractStartDate: employee.contractStartDate,
 contractEndDate: employee.contractEndDate || new Date().toISOString()
 });

 if (!validation.valid && !asDraft) {
 setErrors(validation.errors);
 setIsSubmitting(false);
 return;
 }

 try {
 const requestData = {
 staffId: employee.staffId,
 staffName: employee.fullName,
 position: employee.position,
 department: employee.department,
 leaveType: formData.leaveType,
 startDate: formData.startDate,
 endDate: formData.endDate,
 totalDays: formData.totalDays,
 reason: formData.reason,
 justification: formData.justification || undefined,
 medicalReportFile: formData.medicalReportFile || undefined,
 medicalReportFileName: formData.medicalReportFileName || undefined,
 status: (asDraft ? 'Draft' : 'Submitted') as any
 };

 let createdRequest: LeaveRequest;
 if (editingRequest) {
 leaveRequestService.update(editingRequest.id, requestData);
 createdRequest = leaveRequestService.getById(editingRequest.id)!;
 } else {
 createdRequest = leaveRequestService.create(requestData);
 }

 // ⚠️ MOCK EMAIL NOTIFICATION - UX ONLY
 // If status is 'Submitted' (not Draft), trigger simulated email notification
 if (!asDraft && createdRequest) {
 const notification = emailNotificationService.notifyLeaveRequestSubmitted(createdRequest);
 setEmailNotification(notification);
 // Don't call onSave() yet - wait for user to acknowledge email preview
 } else {
 // For draft, just save and close
 onSave();
 }
 } catch (error) {
 setErrors(['Failed to save leave request']);
 setIsSubmitting(false);
 } finally {
 setIsSubmitting(false);
 }
 };

 const localT = {
 title: t.hrLeave.leaveRequest,
 employeeInfo: t.hrLeave.employeeInformation,
 leaveDetails: t.hrLeave.leaveDetails,
 leaveBalance: t.hrLeave.leaveBalance,
 
 staffId: t.hrLeave.staffId,
 fullName: t.hrLeave.fullName,
 position: t.hrLeave.position,
 department: t.hrLeave.department,
 contractPeriod: t.hrLeave.contractPeriod,
 
 leaveType: t.hrLeave.leaveType,
 annualLeave: t.hrLeave.annualLeave,
 emergencyLeave: t.hrLeave.emergencyLeave,
 sickLeave: t.hrLeave.sickLeave,
 otherLeave: t.hrLeave.otherLeave,
 
 startDate: t.hrLeave.startDate,
 endDate: t.hrLeave.endDate,
 totalDays: t.hrLeave.totalLeaveDays,
 reason: t.hrLeave.reason,
 justification: t.hrLeave.justificationRequiredForEmergency3Days,
 medicalReport: t.hrLeave.medicalReportRequiredForSick3,
 
 openingBalance: t.hrLeave.openingBalance,
 usedLeave: t.hrLeave.usedLeave,
 pendingLeave: t.hrLeave.pendingLeave,
 remainingBalance: t.hrLeave.remainingBalance,
 availableBalance: t.hrLeave.availableBalance,
 
 saveAsDraft: t.hrLeave.saveAsDraft,
 submit: t.hrLeave.submitRequest,
 cancel: t.hrLeave.cancel,
 
 uploadFile: t.hrLeave.uploadPdf,
 fileUploaded: t.hrLeave.fileUploaded,
 
 pdfOnly: t.hrLeave.onlyPdfFilesAreAllowed,
 fileTooLarge: t.hrLeave.fileSizeMustBeLessThan,
 
 days: t.hrLeave.days4
 };

 const formatDate = (dateString: string) => {
 if (!dateString) return '-';
 return new Date(dateString).toLocaleDateString(t.hrLeave.en, {
 year: 'numeric',
 month: 'short',
 day: 'numeric'
 });
 };

 return (
 <>
 <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
 <h2 className="text-lg font-semibold text-gray-900">{t.title}</h2>
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
 <h3 className="text-sm font-semibold text-gray-900 mb-3">{t.employeeInfo}</h3>
 <div className="grid grid-cols-2 gap-4 text-sm">
 <div>
 <p className="text-gray-600">{t.staffId}:</p>
 <p className="font-medium text-gray-900">{employee.staffId}</p>
 </div>
 <div>
 <p className="text-gray-600">{t.fullName}:</p>
 <p className="font-medium text-gray-900">{employee.fullName}</p>
 </div>
 <div>
 <p className="text-gray-600">{t.position}:</p>
 <p className="font-medium text-gray-900">{employee.position}</p>
 </div>
 <div>
 <p className="text-gray-600">{t.department}:</p>
 <p className="font-medium text-gray-900">{employee.department}</p>
 </div>
 <div className="col-span-2">
 <p className="text-gray-600">{t.contractPeriod}:</p>
 <p className="font-medium text-gray-900">
 {formatDate(employee.contractStartDate)} → {formatDate(employee.contractEndDate || new Date().toISOString())}
 </p>
 </div>
 </div>
 </div>

 {/* Leave Balance */}
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
 <h3 className="text-sm font-semibold text-blue-900 mb-3">{t.leaveBalance}</h3>
 <div className="grid grid-cols-5 gap-3 text-sm">
 <div>
 <p className="text-blue-700">{t.openingBalance}:</p>
 <p className="font-bold text-blue-900">{balance.openingBalance} {t.days}</p>
 </div>
 <div>
 <p className="text-blue-700">{t.usedLeave}:</p>
 <p className="font-bold text-blue-900">{balance.usedLeave} {t.days}</p>
 </div>
 <div>
 <p className="text-blue-700">{t.pendingLeave}:</p>
 <p className="font-bold text-blue-900">{balance.pendingLeave} {t.days}</p>
 </div>
 <div>
 <p className="text-blue-700">{t.remainingBalance}:</p>
 <p className="font-bold text-blue-900">{balance.remainingBalance} {t.days}</p>
 </div>
 <div className="bg-blue-100 rounded p-2">
 <p className="text-blue-700">{t.availableBalance}:</p>
 <p className="font-bold text-blue-900 text-lg">{balance.availableBalance} {t.days}</p>
 </div>
 </div>
 </div>

 {/* Leave Details Form */}
 <div className="space-y-4">
 <h3 className="text-sm font-semibold text-gray-900">{t.leaveDetails}</h3>

 {/* Leave Type */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {t.leaveType} <span className="text-red-600">*</span>
 </label>
 <select
 value={formData.leaveType}
 onChange={(e) => setFormData({ ...formData, leaveType: e.target.value as LeaveType })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 >
 <option value="Annual Leave">{t.annualLeave}</option>
 <option value="Emergency Leave">{t.emergencyLeave}</option>
 <option value="Sick Leave">{t.sickLeave}</option>
 <option value="Other Leave">{t.otherLeave}</option>
 </select>
 </div>

 {/* Date Range */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {t.startDate} <span className="text-red-600">*</span>
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
 {t.endDate} <span className="text-red-600">*</span>
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
 <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
 <p className="text-sm font-semibold text-yellow-900">
 {t.totalDays}: <span className="text-xl">{formData.totalDays}</span> {t.days}
 </p>
 </div>

 {/* Reason */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {t.reason} <span className="text-red-600">*</span>
 </label>
 <textarea
 value={formData.reason}
 onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
 rows={3}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 placeholder={t.hrLeave.enterReasonForLeave}
 />
 </div>

 {/* Conditional: Justification for Emergency > 3 days */}
 {formData.leaveType === 'Emergency Leave' && formData.totalDays > 3 && (
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {t.justification} <span className="text-red-600">*</span>
 </label>
 <textarea
 value={formData.justification}
 onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
 rows={3}
 className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-yellow-50"
 placeholder={t.hrLeave.provideDetailedJustification}
 />
 </div>
 )}

 {/* Conditional: Medical Report for Sick > 3 days */}
 {formData.leaveType === 'Sick Leave' && formData.totalDays > 3 && (
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {t.medicalReport} <span className="text-red-600">*</span>
 </label>
 <div className="flex items-center gap-3">
 <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-300 rounded-lg cursor-pointer hover:bg-blue-100">
 <Upload className="w-4 h-4 text-blue-700" />
 <span className="text-sm font-medium text-blue-700">{t.uploadFile}</span>
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
 {t.cancel}
 </button>
 <button
 onClick={() => handleSubmit(true)}
 disabled={isSubmitting}
 className="px-4 py-2 text-blue-700 bg-blue-50 border border-blue-300 rounded-lg hover:bg-blue-100 disabled:opacity-50"
 >
 {t.saveAsDraft}
 </button>
 <button
 onClick={() => handleSubmit(false)}
 disabled={isSubmitting}
 className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
 >
 <Save className="w-4 h-4" />
 <span>{t.submit}</span>
 </button>
 </div>
 </div>
 </div>

 {/* Email Preview Modal */}
 {emailNotification && (
 <EmailPreviewModal
 notification={emailNotification}
 language={language}
 isRTL={isRTL}
 onClose={() => {
 setEmailNotification(null);
 onSave();
 }}
 />
 )}
 </>
 );
}