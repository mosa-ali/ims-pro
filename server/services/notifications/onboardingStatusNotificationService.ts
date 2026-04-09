/**
 * ============================================================================
 * Onboarding Status Notification Service
 * ============================================================================
 * 
 * Sends real-time notifications to organization admins when:
 * - Onboarding process starts
 * - Onboarding completes successfully
 * - Onboarding encounters errors
 * - Consent link expires
 * 
 * Uses Manus built-in notification API for delivery
 * ============================================================================
 */

import { notifyOwner } from '../../_core/notification';

export interface NotificationPayload {
  organizationId: string;
  organizationName: string;
  adminEmail: string;
  adminName: string;
  status: 'started' | 'completed' | 'failed' | 'expired';
  tenantId?: string;
  errorMessage?: string;
  onboardingLink?: string;
  expiresAt?: Date;
  language?: 'en' | 'ar';
}

/**
 * Send onboarding started notification
 */
export async function notifyOnboardingStarted(payload: NotificationPayload): Promise<boolean> {
  const { organizationName, adminEmail, adminName, onboardingLink, expiresAt, language = 'en' } = payload;

  const title = language === 'ar' 
    ? `🚀 بدء الإعداد: ${organizationName}`
    : `🚀 Onboarding Started: ${organizationName}`;

  const content = language === 'ar'
    ? `مرحبا ${adminName},\n\nتم بدء عملية الإعداد لمؤسستك. يرجى النقر على الرابط أدناه لمتابعة العملية:\n\n${onboardingLink}\n\nينتهي الصلاحية في: ${expiresAt?.toLocaleString('ar-SA')}`
    : `Hi ${adminName},\n\nOnboarding has started for your organization. Please click the link below to continue:\n\n${onboardingLink}\n\nExpires at: ${expiresAt?.toLocaleString('en-US')}`;

  try {
    const result = await notifyOwner({ title, content });
    return result;
  } catch (error) {
    console.error('[OnboardingNotification] Failed to send started notification:', error);
    return false;
  }
}

/**
 * Send onboarding completed notification
 */
export async function notifyOnboardingCompleted(payload: NotificationPayload): Promise<boolean> {
  const { organizationName, adminEmail, adminName, tenantId, language = 'en' } = payload;

  const title = language === 'ar'
    ? `✅ اكتمل الإعداد: ${organizationName}`
    : `✅ Onboarding Completed: ${organizationName}`;

  const content = language === 'ar'
    ? `مرحبا ${adminName},\n\nتم بنجاح إعداد مؤسستك وربط حسابك على Microsoft 365.\n\nمعرف المستأجر: ${tenantId}\n\nيمكنك الآن الوصول إلى جميع الميزات.`
    : `Hi ${adminName},\n\nYour organization has been successfully set up and connected to Microsoft 365.\n\nTenant ID: ${tenantId}\n\nYou can now access all features.`;

  try {
    const result = await notifyOwner({ title, content });
    return result;
  } catch (error) {
    console.error('[OnboardingNotification] Failed to send completed notification:', error);
    return false;
  }
}

/**
 * Send onboarding failed notification
 */
export async function notifyOnboardingFailed(payload: NotificationPayload): Promise<boolean> {
  const { organizationName, adminEmail, adminName, errorMessage, language = 'en' } = payload;

  const title = language === 'ar'
    ? `❌ فشل الإعداد: ${organizationName}`
    : `❌ Onboarding Failed: ${organizationName}`;

  const content = language === 'ar'
    ? `مرحبا ${adminName},\n\nللأسف، حدث خطأ أثناء عملية الإعداد:\n\n${errorMessage}\n\nيرجى التواصل مع فريق الدعم للمساعدة.`
    : `Hi ${adminName},\n\nUnfortunately, an error occurred during the onboarding process:\n\n${errorMessage}\n\nPlease contact support for assistance.`;

  try {
    const result = await notifyOwner({ title, content });
    return result;
  } catch (error) {
    console.error('[OnboardingNotification] Failed to send failed notification:', error);
    return false;
  }
}

/**
 * Send consent link expired notification
 */
export async function notifyConsentLinkExpired(payload: NotificationPayload): Promise<boolean> {
  const { organizationName, adminEmail, adminName, language = 'en' } = payload;

  const title = language === 'ar'
    ? `⏰ انتهت صلاحية الرابط: ${organizationName}`
    : `⏰ Consent Link Expired: ${organizationName}`;

  const content = language === 'ar'
    ? `مرحبا ${adminName},\n\nانتهت صلاحية رابط الموافقة الخاص بك. يرجى طلب رابط جديد من فريق الدعم.`
    : `Hi ${adminName},\n\nYour consent link has expired. Please request a new link from the support team.`;

  try {
    const result = await notifyOwner({ title, content });
    return result;
  } catch (error) {
    console.error('[OnboardingNotification] Failed to send expired notification:', error);
    return false;
  }
}

/**
 * Notify platform admin of new organization onboarding
 */
export async function notifyPlatformAdminOfNewOnboarding(payload: NotificationPayload): Promise<boolean> {
  const { organizationName, adminName, language = 'en' } = payload;

  const title = language === 'ar'
    ? `📋 منظمة جديدة قيد الإعداد: ${organizationName}`
    : `📋 New Organization Onboarding: ${organizationName}`;

  const content = language === 'ar'
    ? `تم إنشاء منظمة جديدة قيد الإعداد:\n\nاسم المنظمة: ${organizationName}\nمسؤول المنظمة: ${adminName}\n\nيرجى مراقبة تقدم الإعداد من لوحة التحكم.`
    : `A new organization has been created and is pending onboarding:\n\nOrganization Name: ${organizationName}\nOrganization Admin: ${adminName}\n\nPlease monitor the onboarding progress from the dashboard.`;

  try {
    const result = await notifyOwner({ title, content });
    return result;
  } catch (error) {
    console.error('[OnboardingNotification] Failed to send platform admin notification:', error);
    return false;
  }
}

/**
 * Get notification template for email delivery
 */
export function getNotificationTemplate(status: string, language: string = 'en'): { subject: string; body: string } {
  const templates = {
    en: {
      started: {
        subject: 'Your Organization Onboarding Has Started',
        body: 'Click the link in your email to complete the onboarding process.',
      },
      completed: {
        subject: 'Your Organization Onboarding is Complete',
        body: 'Your organization has been successfully connected to Microsoft 365.',
      },
      failed: {
        subject: 'Your Organization Onboarding Failed',
        body: 'An error occurred during onboarding. Please contact support.',
      },
      expired: {
        subject: 'Your Consent Link Has Expired',
        body: 'Please request a new onboarding link from support.',
      },
    },
    ar: {
      started: {
        subject: 'بدأ إعداد منظمتك',
        body: 'انقر على الرابط في بريدك الإلكتروني لإكمال عملية الإعداد.',
      },
      completed: {
        subject: 'اكتمل إعداد منظمتك',
        body: 'تم ربط منظمتك بنجاح بـ Microsoft 365.',
      },
      failed: {
        subject: 'فشل إعداد منظمتك',
        body: 'حدث خطأ أثناء الإعداد. يرجى التواصل مع الدعم.',
      },
      expired: {
        subject: 'انتهت صلاحية رابط الموافقة',
        body: 'يرجى طلب رابط إعداد جديد من الدعم.',
      },
    },
  };

  const langTemplates = templates[language as keyof typeof templates] || templates.en;
  return langTemplates[status as keyof typeof langTemplates] || langTemplates.started;
}

/**
 * Format notification for audit logging
 */
export function formatNotificationForAudit(payload: NotificationPayload): object {
  return {
    timestamp: new Date().toISOString(),
    organizationId: payload.organizationId,
    organizationName: payload.organizationName,
    adminEmail: payload.adminEmail,
    status: payload.status,
    language: payload.language || 'en',
    type: 'onboarding_status_notification',
  };
}
