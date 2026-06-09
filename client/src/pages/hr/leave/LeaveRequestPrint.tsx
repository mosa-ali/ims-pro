/**
 * ============================================================================
 * LEAVE REQUEST PRINT LAYOUT
 * ============================================================================
 * 
 * Purpose: Professional print/PDF layout for leave requests
 * 
 * Features:
 * - Organization header with logo placeholder
 * - Employee details section
 * - Leave details with dates and duration
 * - Approval workflow section
 * - Signature blocks
 * - Print-optimized CSS
 * 
 * ============================================================================
 */

import { LeaveRequest } from './types';
import { StaffMember, staffService } from '@/app/services/hrService';
import { X, Printer } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface Props {
 request: LeaveRequest;
 language: string;
 isRTL: boolean;
 onClose: () => void;
}

export function LeaveRequestPrint({
 request, language, isRTL, onClose }: Props) {
 const { t } = useTranslation();
 // Get employee details from the request
 const employee = staffService.getByStaffId(request.staffId);

 const handlePrint = () => {
 window.print();
 };

 const formatDate = (dateString?: string) => {
 if (!dateString) return '-';
 return new Date(dateString).toLocaleDateString(t.hrLeave.en, {
 year: 'numeric',
 month: 'long',
 day: 'numeric'
 });
 };

 const localT = {
 title: t.hrLeave.leaveRequestForm,
 requestNo: t.hrLeave.requestNo,
 date: t.hrLeave.date,
 
 printButton: t.hrLeave.printSaveAsPdf,
 close: t.hrLeave.close,
 
 // Employee Section
 employeeInfo: t.hrLeave.employeeInformation5,
 staffId: t.hrLeave.staffId,
 fullName: t.hrLeave.fullName,
 position: t.hrLeave.position,
 department: t.hrLeave.department,
 contractDate: t.hrLeave.contractStartDate,
 
 // Leave Details
 leaveDetails: t.hrLeave.leaveDetails6,
 leaveType: t.hrLeave.leaveType,
 startDate: t.hrLeave.startDate,
 endDate: t.hrLeave.endDate,
 totalDays: t.hrLeave.totalDays,
 reason: t.hrLeave.reason,
 justification: t.hrLeave.justification,
 
 // Balance Info
 balanceInfo: t.hrLeave.leaveBalanceSummary,
 annualEntitlement: t.hrLeave.annualEntitlement,
 usedDays: t.hrLeave.usedDays,
 remainingBalance: t.hrLeave.remainingBalance,
 days: t.hrLeave.days7,
 
 // Approval Section
 approvalSection: t.hrLeave.approvalWorkflow,
 lineManager: t.hrLeave.lineManager,
 hrManager: t.hrLeave.hrManager,
 signature: t.hrLeave.signature,
 approvalDate: t.hrLeave.date,
 status: t.hrLeave.status,
 approvedBy: t.hrLeave.approvedBy,
 approvalDateValue: t.hrLeave.approvalDate,
 
 // Footer
 notes: t.hrLeave.notes,
 printedOn: t.hrLeave.printedOn,
 systemGenerated: t.hrLeave.thisIsASystemgeneratedDocument,
 
 // Medical Report
 medicalReport: t.hrLeave.medicalReportAttached,
 fileName: t.hrLeave.fileName
 };

 return (
 <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
 {/* Modal Header - No Print */}
 <div className="no-print flex items-center justify-between px-6 py-4 border-b border-gray-200">
 <h2 className="text-lg font-semibold text-gray-900">{t.title}</h2>
 <div className="flex items-center gap-3">
 <button
 onClick={handlePrint}
 className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
 >
 <Printer className="w-4 h-4" />
 <span>{t.printButton}</span>
 </button>
 <button
 onClick={onClose}
 className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
 >
 <X className="w-5 h-5" />
 </button>
 </div>
 </div>

 {/* Modal Body - Scrollable */}
 <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
 <div className="print-container">
 {/* Print-specific styles */}
 <style>{`
 @media print {
 body * {
 visibility: hidden;
 }
 .print-container,
 .print-container * {
 visibility: visible;
 }
 .print-container {
 position: absolute;
 left: 0;
 top: 0;
 width: 100%;
 padding: 20mm;
 }
 .no-print {
 display: none !important;
 }
 @page {
 size: A4;
 margin: 15mm;
 }
 }
 
 .print-container {
 background: white;
 max-width: 210mm;
 margin: 0 auto;
 padding: 20mm;
 font-family: Arial, sans-serif;
 color: #000;
 }
 
 .print-header {
 border-bottom: 3px solid #2563eb;
 padding-bottom: 20px;
 margin-bottom: 30px;
 }
 
 .print-section {
 margin-bottom: 25px;
 page-break-inside: avoid;
 }
 
 .print-section-title {
 background: #f3f4f6;
 border-left: 4px solid #2563eb;
 padding: 10px 15px;
 margin-bottom: 15px;
 font-weight: bold;
 font-size: 14px;
 text-transform: uppercase;
 letter-spacing: 0.5px;
 }
 
 ${isRTL ? '.print-section-title { border-left: none; border-right: 4px solid #2563eb; }' : ''}
 
 .print-grid {
 display: grid;
 grid-template-columns: 1fr 1fr;
 gap: 15px;
 margin-bottom: 15px;
 }
 
 .print-field {
 margin-bottom: 12px;
 }
 
 .print-label {
 font-size: 11px;
 color: #6b7280;
 font-weight: 600;
 text-transform: uppercase;
 margin-bottom: 4px;
 }
 
 .print-value {
 font-size: 13px;
 color: #000;
 font-weight: 500;
 }
 
 .print-signature-box {
 border: 1px solid #d1d5db;
 padding: 15px;
 min-height: 80px;
 margin-top: 10px;
 }
 
 .print-footer {
 border-top: 2px solid #e5e7eb;
 padding-top: 15px;
 margin-top: 40px;
 text-align: center;
 font-size: 10px;
 color: #6b7280;
 }
 
 .status-badge {
 display: inline-block;
 padding: 6px 12px;
 border-radius: 4px;
 font-size: 12px;
 font-weight: 600;
 }
 
 .status-draft {
 background: #f3f4f6;
 color: #374151;
 border: 1px solid #d1d5db;
 }
 
 .status-submitted {
 background: #fef3c7;
 color: #92400e;
 border: 1px solid #fcd34d;
 }
 
 .status-approved {
 background: #d1fae5;
 color: #065f46;
 border: 1px solid #6ee7b7;
 }
 
 .status-rejected {
 background: #fee2e2;
 color: #991b1b;
 border: 1px solid #fca5a5;
 }
 `}</style>

 {/* Header */}
 <div className="print-header">
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
 <div>
 <div style={{ 
 width: '60px', 
 height: '60px', 
 background: '#2563eb', 
 borderRadius: '8px',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 color: 'white',
 fontSize: '24px',
 fontWeight: 'bold',
 marginBottom: '10px'
 }}>
 HR
 </div>
 <h1 style={{ 
 fontSize: '20px', 
 fontWeight: 'bold', 
 margin: 0,
 color: '#111827'
 }}>
 {t.title}
 </h1>
 </div>
 <div style={{ textAlign: t.hrLeave.right }}>
 <div className="print-field">
 <div className="print-label">{t.requestNo}</div>
 <div className="print-value" style={{ fontFamily: 'monospace' }}>
 {request.id.toUpperCase()}
 </div>
 </div>
 <div className="print-field">
 <div className="print-label">{t.date}</div>
 <div className="print-value">{formatDate(request.createdAt)}</div>
 </div>
 </div>
 </div>
 </div>

 {/* Employee Information */}
 <div className="print-section">
 <div className="print-section-title">{t.employeeInfo}</div>
 <div className="print-grid">
 <div className="print-field">
 <div className="print-label">{t.staffId}</div>
 <div className="print-value" style={{ fontFamily: 'monospace' }}>
 {staffService.getStaffId(request.employeeId)}
 </div>
 </div>
 <div className="print-field">
 <div className="print-label">{t.fullName}</div>
 <div className="print-value">{staffService.getFullName(request.employeeId)}</div>
 </div>
 <div className="print-field">
 <div className="print-label">{t.position}</div>
 <div className="print-value">{staffService.getPosition(request.employeeId)}</div>
 </div>
 <div className="print-field">
 <div className="print-label">{t.department}</div>
 <div className="print-value">{staffService.getDepartment(request.employeeId)}</div>
 </div>
 <div className="print-field">
 <div className="print-label">{t.contractDate}</div>
 <div className="print-value">{formatDate(staffService.getContractStartDate(request.employeeId))}</div>
 </div>
 </div>
 </div>

 {/* Leave Details */}
 <div className="print-section">
 <div className="print-section-title">{t.leaveDetails}</div>
 <div className="print-grid">
 <div className="print-field">
 <div className="print-label">{t.leaveType}</div>
 <div className="print-value">{request.leaveType}</div>
 </div>
 <div className="print-field">
 <div className="print-label">{t.status}</div>
 <div>
 <span className={`status-badge status-${request.status.toLowerCase()}`}>
 {request.status}
 </span>
 </div>
 </div>
 <div className="print-field">
 <div className="print-label">{t.startDate}</div>
 <div className="print-value">{formatDate(request.startDate)}</div>
 </div>
 <div className="print-field">
 <div className="print-label">{t.endDate}</div>
 <div className="print-value">{formatDate(request.endDate)}</div>
 </div>
 <div className="print-field">
 <div className="print-label">{t.totalDays}</div>
 <div className="print-value" style={{ fontSize: '16px', fontWeight: 'bold', color: '#2563eb' }}>
 {request.totalDays} {t.days}
 </div>
 </div>
 </div>
 
 {request.reason && (
 <div className="print-field" style={{ marginTop: '15px' }}>
 <div className="print-label">{t.reason}</div>
 <div className="print-value" style={{ 
 background: '#f9fafb', 
 padding: '10px', 
 borderRadius: '4px',
 border: '1px solid #e5e7eb'
 }}>
 {request.reason}
 </div>
 </div>
 )}

 {request.justification && request.leaveType === 'Emergency Leave' && (
 <div className="print-field" style={{ marginTop: '15px' }}>
 <div className="print-label">{t.justification}</div>
 <div className="print-value" style={{ 
 background: '#fef3c7', 
 padding: '10px', 
 borderRadius: '4px',
 border: '1px solid #fcd34d'
 }}>
 {request.justification}
 </div>
 </div>
 )}

 {request.medicalReportFileName && request.leaveType === 'Sick Leave' && (
 <div className="print-field" style={{ marginTop: '15px' }}>
 <div className="print-label">{t.medicalReport}</div>
 <div className="print-value" style={{ 
 background: '#fee2e2', 
 padding: '10px', 
 borderRadius: '4px',
 border: '1px solid #fca5a5',
 fontFamily: 'monospace'
 }}>
 📄 {request.medicalReportFileName}
 </div>
 </div>
 )}
 </div>

 {/* Leave Balance (for Annual Leave only) */}
 {request.leaveType === 'Annual Leave' && request.balance && (
 <div className="print-section">
 <div className="print-section-title">{t.balanceInfo}</div>
 <div className="print-grid">
 <div className="print-field">
 <div className="print-label">{t.annualEntitlement}</div>
 <div className="print-value">{request.balance.annualEntitlement} {t.days}</div>
 </div>
 <div className="print-field">
 <div className="print-label">{t.usedDays}</div>
 <div className="print-value">{request.balance.usedDays} {t.days}</div>
 </div>
 <div className="print-field">
 <div className="print-label">{t.remainingBalance}</div>
 <div className="print-value" style={{ 
 fontSize: '16px', 
 fontWeight: 'bold', 
 color: request.balance.remainingBalance < 5 ? '#dc2626' : '#059669'
 }}>
 {request.balance.remainingBalance} {t.days}
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Approval Section */}
 <div className="print-section">
 <div className="print-section-title">{t.approvalSection}</div>
 
 {request.status === 'Approved' && request.approvedBy && (
 <div style={{ 
 background: '#d1fae5', 
 border: '2px solid #6ee7b7', 
 borderRadius: '6px',
 padding: '15px',
 marginBottom: '20px'
 }}>
 <div className="print-grid">
 <div className="print-field">
 <div className="print-label">{t.approvedBy}</div>
 <div className="print-value">{request.approvedBy}</div>
 </div>
 <div className="print-field">
 <div className="print-label">{t.approvalDateValue}</div>
 <div className="print-value">{formatDate(request.approvedAt)}</div>
 </div>
 </div>
 </div>
 )}

 {request.status === 'Rejected' && request.rejectedBy && (
 <div style={{ 
 background: '#fee2e2', 
 border: '2px solid #fca5a5', 
 borderRadius: '6px',
 padding: '15px',
 marginBottom: '20px'
 }}>
 <div className="print-grid">
 <div className="print-field">
 <div className="print-label">{t.hrLeave.rejectedBy}</div>
 <div className="print-value">{request.rejectedBy}</div>
 </div>
 <div className="print-field">
 <div className="print-label">{t.hrLeave.rejectionDate}</div>
 <div className="print-value">{formatDate(request.rejectedAt)}</div>
 </div>
 </div>
 {request.rejectionReason && (
 <div className="print-field" style={{ marginTop: '10px' }}>
 <div className="print-label">{t.hrLeave.rejectionReason}</div>
 <div className="print-value">{request.rejectionReason}</div>
 </div>
 )}
 </div>
 )}

 {/* Signature blocks for pending/draft */}
 {(request.status === 'Draft' || request.status === 'Submitted') && (
 <div className="print-grid">
 <div>
 <div className="print-label">{t.lineManager}</div>
 <div className="print-signature-box">
 <div style={{ marginTop: '50px' }}>
 <div style={{ borderTop: '1px solid #000', width: '60%', margin: '0 auto' }}></div>
 <div style={{ textAlign: 'center', marginTop: '5px', fontSize: '10px' }}>
 {t.signature}
 </div>
 </div>
 </div>
 <div className="print-field" style={{ marginTop: '10px' }}>
 <div className="print-label">{t.approvalDate}</div>
 <div style={{ borderBottom: '1px solid #d1d5db', height: '25px' }}></div>
 </div>
 </div>
 
 <div>
 <div className="print-label">{t.hrManager}</div>
 <div className="print-signature-box">
 <div style={{ marginTop: '50px' }}>
 <div style={{ borderTop: '1px solid #000', width: '60%', margin: '0 auto' }}></div>
 <div style={{ textAlign: 'center', marginTop: '5px', fontSize: '10px' }}>
 {t.signature}
 </div>
 </div>
 </div>
 <div className="print-field" style={{ marginTop: '10px' }}>
 <div className="print-label">{t.approvalDate}</div>
 <div style={{ borderBottom: '1px solid #d1d5db', height: '25px' }}></div>
 </div>
 </div>
 </div>
 )}
 </div>

 {/* Footer */}
 <div className="print-footer">
 <p style={{ margin: '5px 0' }}>
 {t.systemGenerated}
 </p>
 <p style={{ margin: '5px 0' }}>
 {t.printedOn}: {new Date().toLocaleDateString(t.hrLeave.en, {
 year: 'numeric',
 month: 'long',
 day: 'numeric',
 hour: '2-digit',
 minute: '2-digit'
 })}
 </p>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}