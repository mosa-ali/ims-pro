/**
 * ============================================================================
 * Email Notification Service
 * ============================================================================
 * 
 * Sends email notifications to organization admins with one-link onboarding URLs.
 * Uses Manus built-in notification API for reliable delivery.
 * 
 * ============================================================================
 */

import { ENV } from "../../_core/env";
import { emailQueueService } from "../emailQueueService";
import { platformEmailService } from "../platformEmailService";

export interface OnboardingEmailRequest {
  organizationId: number;
  organizationName: string;
  adminEmail: string;
  adminName: string;
  onboardingLink: string;
  language: "en" | "ar";
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class EmailNotificationService {
  /**
   * Send onboarding link email to organization admin
   * Uses Manus built-in notification API
   */
  async sendOnboardingLinkEmail(request: OnboardingEmailRequest): Promise<EmailSendResult> {
    const subject = this.getEmailSubject(request.language);
    const htmlContent = this.generateEmailHTML(request);
    const textContent = this.generateEmailText(request);

    // -----------------------------------------------------------------------
    // Strategy 1: Try platform-level email service (direct delivery to admin)
    // This works even when the org has no email provider configured yet.
    // -----------------------------------------------------------------------
    try {
      const isPlatformConfigured = await platformEmailService.isConfigured();
      if (isPlatformConfigured) {
        console.log(`[EMAIL] Attempting direct delivery via platform email service to ${request.adminEmail}`);
        const platformResult = await platformEmailService.sendEmail({
          to: request.adminEmail,
          toName: request.adminName,
          subject,
          bodyHtml: htmlContent,
          bodyText: textContent,
        });

        if (platformResult.success) {
          console.log(`[EMAIL] Platform email delivered successfully to ${request.adminEmail}`);
          return { success: true, messageId: `platform-direct-${Date.now()}` };
        }

        // Platform email configured but failed — log and fall through to queue
        console.warn(`[EMAIL] Platform email delivery failed (${platformResult.error}), falling back to org queue`);
      } else {
        console.log(`[EMAIL] Platform email not configured, falling back to org queue for ${request.adminEmail}`);
      }
    } catch (platformErr) {
      const msg = platformErr instanceof Error ? platformErr.message : String(platformErr);
      console.warn(`[EMAIL] Platform email service error: ${msg}, falling back to org queue`);
    }

    // -----------------------------------------------------------------------
    // Strategy 2: Queue via org's email provider (requires org M365 setup)
    // -----------------------------------------------------------------------
    try {
      console.log(`[EMAIL] Queuing onboarding link email to ${request.adminEmail} for org ${request.organizationName}`);

      const queueResult = await emailQueueService.queueEmail({
        organizationId: request.organizationId,
        recipientEmail: request.adminEmail,
        recipientName: request.adminName,
        subject,
        htmlContent,
        textContent,
        emailType: "onboarding",
        language: request.language,
        metadata: {
          organizationName: request.organizationName,
          type: "onboarding_link",
        },
      });

      if (!queueResult.success) {
        console.error(`[EMAIL] Failed to queue email for ${request.adminEmail}`);
        return { success: false, error: "Failed to queue email for delivery" };
      }

      console.log(`[EMAIL] Email queued successfully with ID: ${queueResult.id}`);
      return { success: true, messageId: String(queueResult.id) };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[EMAIL] Exception while queuing email for ${request.adminEmail}:`, errorMsg);
      return { success: false, error: `Failed to queue email: ${errorMsg}` };
    }
  }

  /**
   * Get email subject based on language
   */
  private getEmailSubject(language: "en" | "ar"): string {
    if (language === "ar") {
      return "ربط Microsoft 365 مع نظام الإدارة المتكاملة";
    }
    return "Connect Microsoft 365 to Integrated Management System";
  }

  /**
   * Generate HTML email content
   */
  private generateEmailHTML(request: OnboardingEmailRequest): string {
    if (request.language === "ar") {
      return this.generateArabicEmailHTML(request);
    }
    return this.generateEnglishEmailHTML(request);
  }

  /**
   * Generate English email HTML
   */
  private generateEnglishEmailHTML(request: OnboardingEmailRequest): string {
    return `
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
    .button { display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Connect Microsoft 365</h2>
      <p>Hello ${this.escapeHtml(request.adminName)},</p>
    </div>
    
    <p>Your organization <strong>${this.escapeHtml(request.organizationName)}</strong> has been created in the Integrated Management System (IMS).</p>
    
    <p>To complete the setup and connect your Microsoft 365 tenant, please click the button below:</p>
    
    <a href="${this.escapeHtml(request.onboardingLink)}" class="button">Connect Microsoft 365</a>
    
    <p>This link will:</p>
    <ul>
      <li>Take you to Microsoft's login page</li>
      <li>Ask you to sign in with your work account</li>
      <li>Request admin consent to connect your tenant</li>
      <li>Automatically complete the setup</li>
    </ul>
    
    <p><strong>Important:</strong> This link is valid for 24 hours. If it expires, please contact your platform administrator to request a new link.</p>
    
    <p>If you have any questions, please contact your platform administrator.</p>
    
    <div class="footer">
      <p>This is an automated message from the Integrated Management System. Please do not reply to this email.</p>
      <p>&copy; ${new Date().getFullYear()} Integrated Management System. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate Arabic email HTML
   */
  private generateArabicEmailHTML(request: OnboardingEmailRequest): string {
    return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; direction: rtl; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
    .button { display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>ربط Microsoft 365</h2>
      <p>مرحبا ${this.escapeHtml(request.adminName)}،</p>
    </div>
    
    <p>تم إنشاء مؤسستك <strong>${this.escapeHtml(request.organizationName)}</strong> في نظام الإدارة المتكاملة (IMS).</p>
    
    <p>لإكمال الإعداد وربط مستأجر Microsoft 365 الخاص بك، يرجى النقر على الزر أدناه:</p>
    
    <a href="${this.escapeHtml(request.onboardingLink)}" class="button">ربط Microsoft 365</a>
    
    <p>سيقوم هذا الرابط بـ:</p>
    <ul>
      <li>نقلك إلى صفحة تسجيل الدخول في Microsoft</li>
      <li>طلب تسجيل الدخول باستخدام حسابك العملي</li>
      <li>طلب موافقة المسؤول لربط مستأجرك</li>
      <li>إكمال الإعداد تلقائياً</li>
    </ul>
    
    <p><strong>مهم:</strong> هذا الرابط صالح لمدة 24 ساعة. إذا انتهت صلاحيته، يرجى الاتصال بمسؤول النظام الأساسي لطلب رابط جديد.</p>
    
    <p>إذا كان لديك أي أسئلة، يرجى الاتصال بمسؤول النظام الأساسي.</p>
    
    <div class="footer">
      <p>هذه رسالة آلية من نظام الإدارة المتكاملة. يرجى عدم الرد على هذا البريد الإلكتروني.</p>
      <p>&copy; ${new Date().getFullYear()} نظام الإدارة المتكاملة. جميع الحقوق محفوظة.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate plain text email content
   */
  private generateEmailText(request: OnboardingEmailRequest): string {
    if (request.language === "ar") {
      return `
مرحبا ${request.adminName}،

تم إنشاء مؤسستك ${request.organizationName} في نظام الإدارة المتكاملة (IMS).

لإكمال الإعداد وربط مستأجر Microsoft 365 الخاص بك، يرجى زيارة الرابط التالي:

${request.onboardingLink}

سيقوم هذا الرابط بـ:
- نقلك إلى صفحة تسجيل الدخول في Microsoft
- طلب تسجيل الدخول باستخدام حسابك العملي
- طلب موافقة المسؤول لربط مستأجرك
- إكمال الإعداد تلقائياً

مهم: هذا الرابط صالح لمدة 24 ساعة. إذا انتهت صلاحيته، يرجى الاتصال بمسؤول النظام الأساسي لطلب رابط جديد.

إذا كان لديك أي أسئلة، يرجى الاتصال بمسؤول النظام الأساسي.

هذه رسالة آلية من نظام الإدارة المتكاملة. يرجى عدم الرد على هذا البريد الإلكتروني.
      `;
    }

    return `
Hello ${request.adminName},

Your organization ${request.organizationName} has been created in the Integrated Management System (IMS).

To complete the setup and connect your Microsoft 365 tenant, please visit the following link:

${request.onboardingLink}

This link will:
- Take you to Microsoft's login page
- Ask you to sign in with your work account
- Request admin consent to connect your tenant
- Automatically complete the setup

Important: This link is valid for 24 hours. If it expires, please contact your platform administrator to request a new link.

If you have any questions, please contact your platform administrator.

This is an automated message from the Integrated Management System. Please do not reply to this email.
    `;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
  }
}

export const emailNotificationService = new EmailNotificationService();
