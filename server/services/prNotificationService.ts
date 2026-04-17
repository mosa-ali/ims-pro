/**
 * PR Notification Service
 * Handles email notifications for Purchase Request approval workflow
 * Integrates with existing email infrastructure
 */

import { getDb } from "../db";
import { emailTemplates, purchaseRequests, users, organizations } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { sendEmail, renderTemplate } from "./emailService";

interface PREmailData {
  prId: number;
  prNumber: string;
  requesterName: string;
  requesterEmail: string;
  projectTitle: string;
  totalAmount: number;
  currency: string;
  urgency: string;
  department: string;
  neededBy?: Date;
  organizationId: number;
  logisticsSignerName?: string;
  logisticsSignerTitle?: string;
  financeSignerName?: string;
  financeSignerTitle?: string;
  pmSignerName?: string;
  pmSignerTitle?: string;
}

/**
 * Seed default PR email templates for an organization if they don't exist
 */
export async function seedPREmailTemplates(organizationId: number, createdBy?: number): Promise<void> {
  const db = await getDb();
  
  // Check if templates already exist
  const existing = await db
    .select({ id: emailTemplates.id })
    .from(emailTemplates)
    .where(and(
      eq(emailTemplates.organizationId, organizationId),
      eq(emailTemplates.eventKey, 'pr_submitted')
    ))
    .limit(1);
  
  if (existing.length > 0) {
    // Templates already exist
    return;
  }
  
  // Insert all 5 PR email templates
  const templates = [
    {
      eventKey: 'pr_submitted',
      templateName: 'PR Submitted - Logistics Validation Required',
      subject: '[Action Required] Purchase Request {{prNumber}} Awaiting Logistics Validation',
      bodyHtml: getPRSubmittedTemplate(),
      bodyText: getPRSubmittedTextTemplate(),
    },
    {
      eventKey: 'pr_logistics_validated',
      templateName: 'PR Logistics Validated - Finance Validation Required',
      subject: '[Action Required] Purchase Request {{prNumber}} Awaiting Finance Validation',
      bodyHtml: getPRLogisticsValidatedTemplate(),
      bodyText: getPRLogisticsValidatedTextTemplate(),
    },
    {
      eventKey: 'pr_finance_validated',
      templateName: 'PR Finance Validated - PM Approval Required',
      subject: '[Action Required] Purchase Request {{prNumber}} Awaiting Program Manager Approval',
      bodyHtml: getPRFinanceValidatedTemplate(),
      bodyText: getPRFinanceValidatedTextTemplate(),
    },
    {
      eventKey: 'pr_approved',
      templateName: 'PR Approved - Procurement Process Initiated',
      subject: '[Approved] Purchase Request {{prNumber}} Has Been Approved',
      bodyHtml: getPRApprovedTemplate(),
      bodyText: getPRApprovedTextTemplate(),
    },
    {
      eventKey: 'pr_rejected',
      templateName: 'PR Rejected - Revision Required',
      subject: '[Rejected] Purchase Request {{prNumber}} Has Been Rejected',
      bodyHtml: getPRRejectedTemplate(),
      bodyText: getPRRejectedTextTemplate(),
    },
  ];
  
  for (const template of templates) {
    await db.insert(emailTemplates).values({
      organizationId,
      eventKey: template.eventKey,
      templateName: template.templateName,
      subject: template.subject,
      bodyHtml: template.bodyHtml,
      bodyText: template.bodyText,
      isActive: true,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

/**
 * Get PR data for email notifications
 */
async function getPRData(prId: number): Promise<PREmailData | null> {
  const db = await getDb();
  
  const [pr] = await db
    .select({
      prId: purchaseRequests.id,
      prNumber: purchaseRequests.prNumber,
      projectTitle: purchaseRequests.projectTitle,
      totalAmount: purchaseRequests.totalAmount,
      currency: purchaseRequests.currency,
      urgency: purchaseRequests.urgency,
      department: purchaseRequests.department,
      neededBy: purchaseRequests.neededBy,
      organizationId: purchaseRequests.organizationId,
      requesterName: users.name,
      requesterEmail: users.email,
      logisticsSignerName: purchaseRequests.logisticsSignerName,
      logisticsSignerTitle: purchaseRequests.logisticsSignerTitle,
      financeSignerName: purchaseRequests.financeSignerName,
      financeSignerTitle: purchaseRequests.financeSignerTitle,
      pmSignerName: purchaseRequests.pmSignerName,
      pmSignerTitle: purchaseRequests.pmSignerTitle,
    })
    .from(purchaseRequests)
    .leftJoin(users, eq(purchaseRequests.requesterId, users.id))
    .where(eq(purchaseRequests.id, prId))
    .limit(1);
  
  if (!pr || !pr.requesterEmail) {
    return null;
  }
  
  return {
    prId: pr.prId,
    prNumber: pr.prNumber || '',
    requesterName: pr.requesterName || 'Unknown',
    requesterEmail: pr.requesterEmail,
    projectTitle: pr.projectTitle || '',
    totalAmount: pr.totalAmount || 0,
    currency: pr.currency || 'USD',
    urgency: pr.urgency || 'normal',
    department: pr.department || '',
    neededBy: pr.neededBy || undefined,
    organizationId: pr.organizationId,
    logisticsSignerName: pr.logisticsSignerName || undefined,
    logisticsSignerTitle: pr.logisticsSignerTitle || undefined,
    financeSignerName: pr.financeSignerName || undefined,
    financeSignerTitle: pr.financeSignerTitle || undefined,
    pmSignerName: pr.pmSignerName || undefined,
    pmSignerTitle: pr.pmSignerTitle || undefined,
  };
}

/**
 * Get email template for an event
 */
async function getEmailTemplate(organizationId: number, eventKey: string) {
  const db = await getDb();
  
  const [template] = await db
    .select()
    .from(emailTemplates)
    .where(and(
      eq(emailTemplates.organizationId, organizationId),
      eq(emailTemplates.eventKey, eventKey),
      eq(emailTemplates.isActive, true)
    ))
    .limit(1);
  
  return template;
}

/**
 * Send PR submitted notification to Logistics
 */
export async function notifyLogisticsOfPRSubmission(
  prId: number,
  logisticsEmail: string
): Promise<boolean> {
  const prData = await getPRData(prId);
  if (!prData) return false;
  
  // Ensure templates exist
  await seedPREmailTemplates(prData.organizationId);
  
  const template = await getEmailTemplate(prData.organizationId, 'pr_submitted');
  if (!template) {
    console.error('PR submitted email template not found');
    return false;
  }
  
  const variables = {
    prNumber: prData.prNumber,
    requesterName: prData.requesterName,
    department: prData.department,
    projectTitle: prData.projectTitle,
    totalAmount: prData.totalAmount.toLocaleString(),
    currency: prData.currency,
    urgency: prData.urgency,
    neededBy: prData.neededBy ? prData.neededBy.toLocaleDateString() : 'N/A',
    actionUrl: `${process.env.VITE_APP_URL || 'https://app.example.com'}/logistics/purchase-requests/${prData.prId}`,
  };
  
  const subject = renderTemplate(template.subject, variables);
  const bodyHtml = renderTemplate(template.bodyHtml, variables);
  const bodyText = template.bodyText ? renderTemplate(template.bodyText, variables) : undefined;
  
  const result = await sendEmail({
    organizationId: prData.organizationId,
    to: [logisticsEmail],
    subject,
    bodyHtml,
    bodyText,
  });
  
  return result.success;
}

/**
 * Send PR validated by Logistics notification to Finance
 */
export async function notifyFinanceOfLogisticsValidation(
  prId: number,
  financeEmail: string
): Promise<boolean> {
  const prData = await getPRData(prId);
  if (!prData) return false;
  
  await seedPREmailTemplates(prData.organizationId);
  
  const template = await getEmailTemplate(prData.organizationId, 'pr_logistics_validated');
  if (!template) {
    console.error('PR logistics validated email template not found');
    return false;
  }
  
  const variables = {
    prNumber: prData.prNumber,
    requesterName: prData.requesterName,
    department: prData.department,
    projectTitle: prData.projectTitle,
    totalAmount: prData.totalAmount.toLocaleString(),
    currency: prData.currency,
    urgency: prData.urgency,
    neededBy: prData.neededBy ? prData.neededBy.toLocaleDateString() : 'N/A',
    logisticsSignerName: prData.logisticsSignerName || 'N/A',
    logisticsSignerTitle: prData.logisticsSignerTitle || 'N/A',
    actionUrl: `${process.env.VITE_APP_URL || 'https://app.example.com'}/logistics/purchase-requests/${prData.prId}`,
  };
  
  const subject = renderTemplate(template.subject, variables);
  const bodyHtml = renderTemplate(template.bodyHtml, variables);
  const bodyText = template.bodyText ? renderTemplate(template.bodyText, variables) : undefined;
  
  const result = await sendEmail({
    organizationId: prData.organizationId,
    to: [financeEmail],
    subject,
    bodyHtml,
    bodyText,
  });
  
  return result.success;
}

/**
 * Send PR validated by Finance notification to PM
 */
export async function notifyPMOfFinanceValidation(
  prId: number,
  pmEmail: string
): Promise<boolean> {
  const prData = await getPRData(prId);
  if (!prData) return false;
  
  await seedPREmailTemplates(prData.organizationId);
  
  const template = await getEmailTemplate(prData.organizationId, 'pr_finance_validated');
  if (!template) {
    console.error('PR finance validated email template not found');
    return false;
  }
  
  const variables = {
    prNumber: prData.prNumber,
    requesterName: prData.requesterName,
    department: prData.department,
    projectTitle: prData.projectTitle,
    totalAmount: prData.totalAmount.toLocaleString(),
    currency: prData.currency,
    urgency: prData.urgency,
    neededBy: prData.neededBy ? prData.neededBy.toLocaleDateString() : 'N/A',
    logisticsSignerName: prData.logisticsSignerName || 'N/A',
    logisticsSignerTitle: prData.logisticsSignerTitle || 'N/A',
    financeSignerName: prData.financeSignerName || 'N/A',
    financeSignerTitle: prData.financeSignerTitle || 'N/A',
    actionUrl: `${process.env.VITE_APP_URL || 'https://app.example.com'}/logistics/purchase-requests/${prData.prId}`,
  };
  
  const subject = renderTemplate(template.subject, variables);
  const bodyHtml = renderTemplate(template.bodyHtml, variables);
  const bodyText = template.bodyText ? renderTemplate(template.bodyText, variables) : undefined;
  
  const result = await sendEmail({
    organizationId: prData.organizationId,
    to: [pmEmail],
    subject,
    bodyHtml,
    bodyText,
  });
  
  return result.success;
}

/**
 * Send PR approved notification to Requester
 */
export async function notifyRequesterOfApproval(prId: number): Promise<boolean> {
  const prData = await getPRData(prId);
  if (!prData) return false;
  
  await seedPREmailTemplates(prData.organizationId);
  
  const template = await getEmailTemplate(prData.organizationId, 'pr_approved');
  if (!template) {
    console.error('PR approved email template not found');
    return false;
  }
  
  const variables = {
    prNumber: prData.prNumber,
    requesterName: prData.requesterName,
    department: prData.department,
    projectTitle: prData.projectTitle,
    totalAmount: prData.totalAmount.toLocaleString(),
    currency: prData.currency,
    logisticsSignerName: prData.logisticsSignerName || 'N/A',
    logisticsSignerTitle: prData.logisticsSignerTitle || 'N/A',
    financeSignerName: prData.financeSignerName || 'N/A',
    financeSignerTitle: prData.financeSignerTitle || 'N/A',
    pmSignerName: prData.pmSignerName || 'N/A',
    pmSignerTitle: prData.pmSignerTitle || 'N/A',
    actionUrl: `${process.env.VITE_APP_URL || 'https://app.example.com'}/logistics/purchase-requests/${prData.prId}`,
  };
  
  const subject = renderTemplate(template.subject, variables);
  const bodyHtml = renderTemplate(template.bodyHtml, variables);
  const bodyText = template.bodyText ? renderTemplate(template.bodyText, variables) : undefined;
  
  const result = await sendEmail({
    organizationId: prData.organizationId,
    to: [prData.requesterEmail],
    subject,
    bodyHtml,
    bodyText,
  });
  
  return result.success;
}

/**
 * Send PR rejected notification to Requester
 */
export async function notifyRequesterOfRejection(
  prId: number,
  rejectedBy: string,
  rejectionReason: string
): Promise<boolean> {
  const prData = await getPRData(prId);
  if (!prData) return false;
  
  await seedPREmailTemplates(prData.organizationId);
  
  const template = await getEmailTemplate(prData.organizationId, 'pr_rejected');
  if (!template) {
    console.error('PR rejected email template not found');
    return false;
  }
  
  const variables = {
    prNumber: prData.prNumber,
    requesterName: prData.requesterName,
    department: prData.department,
    projectTitle: prData.projectTitle,
    totalAmount: prData.totalAmount.toLocaleString(),
    currency: prData.currency,
    rejectedBy,
    rejectionReason,
    actionUrl: `${process.env.VITE_APP_URL || 'https://app.example.com'}/logistics/purchase-requests/${prData.prId}`,
  };
  
  const subject = renderTemplate(template.subject, variables);
  const bodyHtml = renderTemplate(template.bodyHtml, variables);
  const bodyText = template.bodyText ? renderTemplate(template.bodyText, variables) : undefined;
  
  const result = await sendEmail({
    organizationId: prData.organizationId,
    to: [prData.requesterEmail],
    subject,
    bodyHtml,
    bodyText,
  });
  
  return result.success;
}

// ============================================================================
// Email Template HTML Functions
// ============================================================================

function getPRSubmittedTemplate(): string {
  return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1e40af;">Purchase Request Submitted</h2>
    <p>Dear Logistics Team,</p>
    <p>A new Purchase Request has been submitted and requires your validation.</p>
    
    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #374151;">Purchase Request Details:</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 5px 0;"><strong>PR Number:</strong></td><td>{{prNumber}}</td></tr>
        <tr><td style="padding: 5px 0;"><strong>Requester:</strong></td><td>{{requesterName}}</td></tr>
        <tr><td style="padding: 5px 0;"><strong>Department:</strong></td><td>{{department}}</td></tr>
        <tr><td style="padding: 5px 0;"><strong>Project:</strong></td><td>{{projectTitle}}</td></tr>
        <tr><td style="padding: 5px 0;"><strong>Total Amount:</strong></td><td>{{currency}} {{totalAmount}}</td></tr>
        <tr><td style="padding: 5px 0;"><strong>Urgency:</strong></td><td>{{urgency}}</td></tr>
        <tr><td style="padding: 5px 0;"><strong>Needed By:</strong></td><td>{{neededBy}}</td></tr>
      </table>
    </div>
    
    <p>Please review and validate this purchase request:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{actionUrl}}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Review Purchase Request</a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
      <strong>Actions Available:</strong><br>
      • Validate (approve to proceed to Finance)<br>
      • Reject (return to requester with comments)
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    <p style="color: #9ca3af; font-size: 12px;">
      This is an automated notification from the IMS Procurement System.<br>
      Please do not reply to this email.
    </p>
  </div>`;
}

function getPRSubmittedTextTemplate(): string {
  return `Dear Logistics Team,

A new Purchase Request has been submitted and requires your validation.

Purchase Request Details:
- PR Number: {{prNumber}}
- Requester: {{requesterName}}
- Department: {{department}}
- Project: {{projectTitle}}
- Total Amount: {{currency}} {{totalAmount}}
- Urgency: {{urgency}}
- Needed By: {{neededBy}}

Please review and validate this purchase request at:
{{actionUrl}}

Actions Available:
- Validate (approve to proceed to Finance)
- Reject (return to requester with comments)

This is an automated notification from the IMS Procurement System.
Please do not reply to this email.`;
}

function getPRLogisticsValidatedTemplate(): string {
  return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1e40af;">Purchase Request - Finance Validation Required</h2>
    <p>Dear Finance Team,</p>
    <p>A Purchase Request has been validated by Logistics and now requires your financial validation.</p>
    
    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #374151;">Purchase Request Details:</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 5px 0;"><strong>PR Number:</strong></td><td>{{prNumber}}</td></tr>
        <tr><td style="padding: 5px 0;"><strong>Requester:</strong></td><td>{{requesterName}}</td></tr>
        <tr><td style="padding: 5px 0;"><strong>Department:</strong></td><td>{{department}}</td></tr>
        <tr><td style="padding: 5px 0;"><strong>Project:</strong></td><td>{{projectTitle}}</td></tr>
        <tr><td style="padding: 5px 0;"><strong>Total Amount:</strong></td><td>{{currency}} {{totalAmount}}</td></tr>
        <tr><td style="padding: 5px 0;"><strong>Urgency:</strong></td><td>{{urgency}}</td></tr>
        <tr><td style="padding: 5px 0;"><strong>Needed By:</strong></td><td>{{neededBy}}</td></tr>
      </table>
    </div>
    
    <div style="background-color: #d1fae5; padding: 10px; border-radius: 6px; border-left: 4px solid #10b981; margin: 20px 0;">
      <p style="margin: 0; color: #065f46;"><strong>✅ Logistics Status:</strong> Validated</p>
    </div>
    
    <p>Please review budget availability and validate this purchase request:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{actionUrl}}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Review Purchase Request</a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
      <strong>Actions Available:</strong><br>
      • Validate (approve to proceed to Program Manager)<br>
      • Reject (return to requester with comments)
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    <p style="color: #9ca3af; font-size: 12px;">
      This is an automated notification from the IMS Procurement System.<br>
      Please do not reply to this email.
    </p>
  </div>`;
}

function getPRLogisticsValidatedTextTemplate(): string {
  return `Dear Finance Team,

A Purchase Request has been validated by Logistics and now requires your financial validation.

Purchase Request Details:
- PR Number: {{prNumber}}
- Requester: {{requesterName}}
- Department: {{department}}
- Project: {{projectTitle}}
- Total Amount: {{currency}} {{totalAmount}}
- Urgency: {{urgency}}
- Needed By: {{neededBy}}

Logistics Status: ✅ Validated

Please review budget availability and validate this purchase request at:
{{actionUrl}}

Actions Available:
- Validate (approve to proceed to Program Manager)
- Reject (return to requester with comments)

This is an automated notification from the IMS Procurement System.
Please do not reply to this email.`;
}

function getPRFinanceValidatedTemplate(): string {
  return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1e40af;">Purchase Request - Final Approval Required</h2>
    <p>Dear Program Manager,</p>
    <p>A Purchase Request has been validated by both Logistics and Finance, and now requires your final approval.</p>
    
    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #374151;">Purchase Request Details:</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 5px 0;"><strong>PR Number:</strong></td><td>{{prNumber}}</td></tr>
        <tr><td style="padding: 5px 0;"><strong>Requester:</strong></td><td>{{requesterName}}</td></tr>
        <tr><td style="padding: 5px 0;"><strong>Department:</strong></td><td>{{department}}</td></tr>
        <tr><td style="padding: 5px 0;"><strong>Project:</strong></td><td>{{projectTitle}}</td></tr>
        <tr><td style="padding: 5px 0;"><strong>Total Amount:</strong></td><td>{{currency}} {{totalAmount}}</td></tr>
        <tr><td style="padding: 5px 0;"><strong>Urgency:</strong></td><td>{{urgency}}</td></tr>
        <tr><td style="padding: 5px 0;"><strong>Needed By:</strong></td><td>{{neededBy}}</td></tr>
      </table>
    </div>
    
    <div style="background-color: #d1fae5; padding: 10px; border-radius: 6px; border-left: 4px solid #10b981; margin: 20px 0;">
      <p style="margin: 5px 0; color: #065f46;"><strong>✅ Logistics Status:</strong> Validated</p>
      <p style="margin: 5px 0; color: #065f46;"><strong>✅ Finance Status:</strong> Validated</p>
    </div>
    
    <p>Please review and approve this purchase request:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{actionUrl}}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Review Purchase Request</a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
      <strong>Actions Available:</strong><br>
      • Approve (initiate procurement process)<br>
      • Reject (return to requester with comments)
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    <p style="color: #9ca3af; font-size: 12px;">
      This is an automated notification from the IMS Procurement System.<br>
      Please do not reply to this email.
    </p>
  </div>`;
}

function getPRFinanceValidatedTextTemplate(): string {
  return `Dear Program Manager,

A Purchase Request has been validated by both Logistics and Finance, and now requires your final approval.

Purchase Request Details:
- PR Number: {{prNumber}}
- Requester: {{requesterName}}
- Department: {{department}}
- Project: {{projectTitle}}
- Total Amount: {{currency}} {{totalAmount}}
- Urgency: {{urgency}}
- Needed By: {{neededBy}}

Logistics Status: ✅ Validated
Finance Status: ✅ Validated

Please review and approve this purchase request at:
{{actionUrl}}

Actions Available:
- Approve (initiate procurement process)
- Reject (return to requester with comments)

This is an automated notification from the IMS Procurement System.
Please do not reply to this email.`;
}

function getPRApprovedTemplate(): string {
  return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #10b981;">✅ Purchase Request Approved</h2>
    <p>Dear {{requesterName}},</p>
    <p>Good news! Your Purchase Request has been approved and the procurement process will now begin.</p>
    
    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #374151;">Purchase Request Details:</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 5px 0;"><strong>PR Number:</strong></td><td>{{prNumber}}</td></tr>
        <tr><td style="padding: 5px 0;"><strong>Project:</strong></td><td>{{projectTitle}}</td></tr>
        <tr><td style="padding: 5px 0;"><strong>Total Amount:</strong></td><td>{{currency}} {{totalAmount}}</td></tr>
        <tr><td style="padding: 5px 0;"><strong>Department:</strong></td><td>{{department}}</td></tr>
      </table>
    </div>
    
    <div style="background-color: #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h4 style="margin-top: 0; color: #065f46;">Approval Status:</h4>
      <p style="margin: 5px 0; color: #065f46;">✅ Logistics: Validated</p>
      <p style="margin: 5px 0; color: #065f46;">✅ Finance: Validated</p>
      <p style="margin: 5px 0; color: #065f46;">✅ Program Manager: Approved</p>
    </div>
    
    <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 20px 0;">
      <h4 style="margin-top: 0; color: #1e40af;">Next Steps:</h4>
      <p style="margin: 5px 0; color: #1e3a8a;">The procurement team will now initiate the sourcing process. You can track the progress at any time.</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{actionUrl}}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Track Purchase Request</a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    <p style="color: #9ca3af; font-size: 12px;">
      This is an automated notification from the IMS Procurement System.<br>
      Please do not reply to this email.
    </p>
  </div>`;
}

function getPRApprovedTextTemplate(): string {
  return `Dear {{requesterName}},

Good news! Your Purchase Request has been approved and the procurement process will now begin.

Purchase Request Details:
- PR Number: {{prNumber}}
- Project: {{projectTitle}}
- Total Amount: {{currency}} {{totalAmount}}
- Department: {{department}}

Approval Status:
✅ Logistics: Validated
✅ Finance: Validated
✅ Program Manager: Approved

Next Steps:
The procurement team will now initiate the sourcing process. You can track the progress at:
{{actionUrl}}

This is an automated notification from the IMS Procurement System.
Please do not reply to this email.`;
}

function getPRRejectedTemplate(): string {
  return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #dc2626;">❌ Purchase Request Rejected</h2>
    <p>Dear {{requesterName}},</p>
    <p>Your Purchase Request has been rejected and requires revision.</p>
    
    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #374151;">Purchase Request Details:</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 5px 0;"><strong>PR Number:</strong></td><td>{{prNumber}}</td></tr>
        <tr><td style="padding: 5px 0;"><strong>Project:</strong></td><td>{{projectTitle}}</td></tr>
        <tr><td style="padding: 5px 0;"><strong>Total Amount:</strong></td><td>{{currency}} {{totalAmount}}</td></tr>
        <tr><td style="padding: 5px 0;"><strong>Department:</strong></td><td>{{department}}</td></tr>
      </table>
    </div>
    
    <div style="background-color: #fee2e2; padding: 15px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 20px 0;">
      <h4 style="margin-top: 0; color: #991b1b;">Rejection Details:</h4>
      <p style="margin: 5px 0; color: #7f1d1d;"><strong>Rejected By:</strong> {{rejectedBy}}</p>
      <p style="margin: 5px 0; color: #7f1d1d;"><strong>Reason:</strong> {{rejectionReason}}</p>
    </div>
    
    <p>Please review the comments and revise your purchase request:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{actionUrl}}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Revise Purchase Request</a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    <p style="color: #9ca3af; font-size: 12px;">
      This is an automated notification from the IMS Procurement System.<br>
      Please do not reply to this email.
    </p>
  </div>`;
}

function getPRRejectedTextTemplate(): string {
  return `Dear {{requesterName}},

Your Purchase Request has been rejected and requires revision.

Purchase Request Details:
- PR Number: {{prNumber}}
- Project: {{projectTitle}}
- Total Amount: {{currency}} {{totalAmount}}
- Department: {{department}}

Rejected By: {{rejectedBy}}
Reason: {{rejectionReason}}

Please review the comments and revise your purchase request at:
{{actionUrl}}

This is an automated notification from the IMS Procurement System.
Please do not reply to this email.`;
}
