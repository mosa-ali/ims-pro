/**
 * Email Notification Service for Leave Management
 * Handles email notifications for leave requests
 */

export interface EmailNotification {
 id: string;
 to: string;
 cc?: string[];
 subject: string;
 body: string;
 type: 'leave_request_submitted' | 'leave_request_approved' | 'leave_request_rejected' | 'leave_reminder';
 createdAt: Date;
 sentAt?: Date;
 status: 'pending' | 'sent' | 'failed';
}

export interface LeaveRequest {
 id: string;
 employeeId: string;
 employeeName: string;
 leaveType: string;
 startDate: string;
 endDate: string;
 days: number;
 reason?: string;
 status: string;
 supervisorEmail?: string;
}

class EmailNotificationService {
 private notifications: EmailNotification[] = [];

 notifyLeaveRequestSubmitted(request: LeaveRequest): EmailNotification {
 const notification: EmailNotification = {
 id: `notif-${Date.now()}`,
 to: request.supervisorEmail || 'supervisor@organization.org',
 subject: `Leave Request Submitted - ${request.employeeName}`,
 body: `
Dear Supervisor,

A new leave request has been submitted:

Employee: ${request.employeeName}
Leave Type: ${request.leaveType}
Start Date: ${request.startDate}
End Date: ${request.endDate}
Duration: ${request.days} day(s)
Reason: ${request.reason || 'Not specified'}

Please review and approve/reject this request.

Best regards,
HR System
 `.trim(),
 type: 'leave_request_submitted',
 createdAt: new Date(),
 status: 'pending'
 };
 
 this.notifications.push(notification);
 console.log('[Email Service] Leave request notification created:', notification.id);
 return notification;
 }

 notifyLeaveRequestApproved(request: LeaveRequest): EmailNotification {
 const notification: EmailNotification = {
 id: `notif-${Date.now()}`,
 to: `${request.employeeId}@organization.org`,
 subject: `Leave Request Approved - ${request.leaveType}`,
 body: `
Dear ${request.employeeName},

Your leave request has been approved:

Leave Type: ${request.leaveType}
Start Date: ${request.startDate}
End Date: ${request.endDate}
Duration: ${request.days} day(s)

Please ensure proper handover before your leave.

Best regards,
HR Department
 `.trim(),
 type: 'leave_request_approved',
 createdAt: new Date(),
 status: 'pending'
 };
 
 this.notifications.push(notification);
 console.log('[Email Service] Leave approval notification created:', notification.id);
 return notification;
 }

 notifyLeaveRequestRejected(request: LeaveRequest, rejectionReason?: string): EmailNotification {
 const notification: EmailNotification = {
 id: `notif-${Date.now()}`,
 to: `${request.employeeId}@organization.org`,
 subject: `Leave Request Rejected - ${request.leaveType}`,
 body: `
Dear ${request.employeeName},

Your leave request has been rejected:

Leave Type: ${request.leaveType}
Start Date: ${request.startDate}
End Date: ${request.endDate}
Duration: ${request.days} day(s)
${rejectionReason ? `Reason: ${rejectionReason}` : ''}

Please contact HR for more information.

Best regards,
HR Department
 `.trim(),
 type: 'leave_request_rejected',
 createdAt: new Date(),
 status: 'pending'
 };
 
 this.notifications.push(notification);
 console.log('[Email Service] Leave rejection notification created:', notification.id);
 return notification;
 }

 getNotifications(): EmailNotification[] {
 return [...this.notifications];
 }

 markAsSent(notificationId: string): void {
 const notification = this.notifications.find(n => n.id === notificationId);
 if (notification) {
 notification.status = 'sent';
 notification.sentAt = new Date();
 }
 }
}

export const emailNotificationService = new EmailNotificationService();
