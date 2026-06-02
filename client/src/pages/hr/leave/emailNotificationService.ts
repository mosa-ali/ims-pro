/**
 * ============================================================================
 * EMAIL NOTIFICATION SERVICE (MOCK / UX ONLY)
 * ============================================================================
 * 
 * ⚠️ IMPORTANT: This is a FRONTEND-ONLY simulation for UX demonstration
 * 
 * Purpose: 
 * - Demonstrate email notification workflow
 * - Provide audit trail visibility
 * - Log notification events for review
 * 
 * Limitations:
 * - NO real emails are sent
 * - NO SMTP connection
 * - NO external API calls
 * - Data stored in localStorage only
 * 
 * Future Backend Integration:
 * - When Supabase/API is added, replace this with real email service
 * - Connect to Microsoft Outlook/Exchange or SendGrid/Mailgun/Resend
 * - Add real delivery confirmation
 * 
 * ============================================================================
 */

import { LeaveRequest, LeaveBalance } from './types';

export interface EmailNotification {
  id: string;
  type: 'leave_request_submitted' | 'leave_request_approved' | 'leave_request_rejected';
  recipientRole: string;
  recipientName: string;
  recipientEmail: string; // Mock email
  subject: string;
  body: string;
  metadata: {
    leaveRequestId: string;
    staffName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    totalDays: number;
  };
  sentAt: string;
  status: 'simulated'; // Always 'simulated' for frontend-only
}

const STORAGE_KEY = 'hr_email_notifications_log';

class EmailNotificationService {
  /**
   * Log notification event (UX simulation only)
   */
  private logNotification(notification: EmailNotification): void {
    const logs = this.getAllLogs();
    logs.unshift(notification); // Add to beginning
    
    // Keep only last 100 notifications
    const trimmed = logs.slice(0, 100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  }

  /**
   * Get all notification logs
   */
  getAllLogs(): EmailNotification[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  /**
   * Get logs for specific leave request
   */
  getLogsByLeaveRequest(leaveRequestId: string): EmailNotification[] {
    return this.getAllLogs().filter(log => log.metadata.leaveRequestId === leaveRequestId);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Generate notification for new leave request submission
   */
  notifyLeaveRequestSubmitted(request: LeaveRequest, balance?: LeaveBalance): EmailNotification {
    // Mock line manager details (in real system, would come from org structure)
    const lineManager = {
      name: 'Line Manager', // TODO: Get from org chart when available
      email: 'linemanager@organization.org' // Mock email
    };

    const notification: EmailNotification = {
      id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'leave_request_submitted',
      recipientRole: 'Line Manager',
      recipientName: lineManager.name,
      recipientEmail: lineManager.email,
      subject: `New Leave Request - ${request.staffName}`,
      body: this.generateSubmissionEmailBody(request, balance),
      metadata: {
        leaveRequestId: request.id,
        staffName: request.staffName,
        leaveType: request.leaveType,
        startDate: request.startDate,
        endDate: request.endDate,
        totalDays: request.totalDays
      },
      sentAt: new Date().toISOString(),
      status: 'simulated'
    };

    this.logNotification(notification);
    return notification;
  }

  /**
   * Generate notification for leave approval
   */
  notifyLeaveRequestApproved(request: LeaveRequest, balance?: LeaveBalance): EmailNotification {
    const notification: EmailNotification = {
      id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'leave_request_approved',
      recipientRole: 'Employee',
      recipientName: request.staffName,
      recipientEmail: `${request.staffId}@organization.org`, // Mock email
      subject: `Leave Request Approved - ${request.leaveType}`,
      body: this.generateApprovalEmailBody(request, balance),
      metadata: {
        leaveRequestId: request.id,
        staffName: request.staffName,
        leaveType: request.leaveType,
        startDate: request.startDate,
        endDate: request.endDate,
        totalDays: request.totalDays
      },
      sentAt: new Date().toISOString(),
      status: 'simulated'
    };

    this.logNotification(notification);
    return notification;
  }

  /**
   * Generate notification for leave rejection
   */
  notifyLeaveRequestRejected(request: LeaveRequest, balance?: LeaveBalance): EmailNotification {
    const notification: EmailNotification = {
      id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'leave_request_rejected',
      recipientRole: 'Employee',
      recipientName: request.staffName,
      recipientEmail: `${request.staffId}@organization.org`, // Mock email
      subject: `Leave Request Rejected - ${request.leaveType}`,
      body: this.generateRejectionEmailBody(request, balance),
      metadata: {
        leaveRequestId: request.id,
        staffName: request.staffName,
        leaveType: request.leaveType,
        startDate: request.startDate,
        endDate: request.endDate,
        totalDays: request.totalDays
      },
      sentAt: new Date().toISOString(),
      status: 'simulated'
    };

    this.logNotification(notification);
    return notification;
  }

  /**
   * Generate email body for submission notification
   */
  private generateSubmissionEmailBody(request: LeaveRequest, balance?: LeaveBalance): string {
    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString('en', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    return `Dear Line Manager,

A new leave request has been submitted and requires your review.

EMPLOYEE DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Staff ID: ${request.staffId}
Staff Name: ${request.staffName}
Department: ${request.department}
Position: ${request.position}

LEAVE REQUEST DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Leave Type: ${request.leaveType}
Start Date: ${formatDate(request.startDate)}
End Date: ${formatDate(request.endDate)}
Total Days: ${request.totalDays} days
${request.reason ? `\nReason: ${request.reason}` : ''}

${balance && request.leaveType === 'Annual Leave' ? `
LEAVE BALANCE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Opening Balance: ${balance.openingBalance} days
Used Leave: ${balance.usedLeave} days
Pending Leave: ${balance.pendingLeave} days
Available Balance: ${balance.availableBalance} days
` : ''}

Please review this request at your earliest convenience.

To review and approve/reject this request, please log in to the HR Management System.

Best regards,
HR Management System

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ SIMULATED NOTIFICATION (Frontend-Only)
This is a demonstration email. No actual email was sent.
`;
  }

  /**
   * Generate email body for approval notification
   */
  private generateApprovalEmailBody(request: LeaveRequest, balance?: LeaveBalance): string {
    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString('en', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    return `Dear ${request.staffName},

Good news! Your leave request has been approved.

APPROVED LEAVE DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Leave Type: ${request.leaveType}
Start Date: ${formatDate(request.startDate)}
End Date: ${formatDate(request.endDate)}
Total Days: ${request.totalDays} days

Approved By: ${request.approvedBy || 'HR Manager'}
Approval Date: ${request.approvedAt ? formatDate(request.approvedAt) : 'N/A'}

${balance && request.leaveType === 'Annual Leave' ? `
UPDATED LEAVE BALANCE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Opening Balance: ${balance.openingBalance} days
Used Leave: ${balance.usedLeave} days
Pending Leave: ${balance.pendingLeave} days
Available Balance: ${balance.availableBalance} days
` : ''}

Please ensure proper handover of duties before your leave begins.

Best regards,
HR Department

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ SIMULATED NOTIFICATION (Frontend-Only)
This is a demonstration email. No actual email was sent.
`;
  }

  /**
   * Generate email body for rejection notification
   */
  private generateRejectionEmailBody(request: LeaveRequest, balance?: LeaveBalance): string {
    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString('en', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    return `Dear ${request.staffName},

Your leave request has been rejected.

LEAVE REQUEST DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Leave Type: ${request.leaveType}
Start Date: ${formatDate(request.startDate)}
End Date: ${formatDate(request.endDate)}
Total Days: ${request.totalDays} days

Rejected By: ${request.rejectedBy || 'HR Manager'}
Rejection Date: ${request.rejectedAt ? formatDate(request.rejectedAt) : 'N/A'}

${request.rejectionReason ? `
REASON FOR REJECTION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${request.rejectionReason}
` : ''}

If you have questions about this decision, please contact HR or your line manager.

Best regards,
HR Department

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ SIMULATED NOTIFICATION (Frontend-Only)
This is a demonstration email. No actual email was sent.
`;
  }
}

export const emailNotificationService = new EmailNotificationService();
