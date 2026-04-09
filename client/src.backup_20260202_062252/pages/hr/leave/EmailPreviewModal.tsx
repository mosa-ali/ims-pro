/**
 * ============================================================================
 * EMAIL PREVIEW MODAL (UX DEMONSTRATION)
 * ============================================================================
 * 
 * Purpose: Display simulated email notifications for UX demonstration
 * 
 * ⚠️ FRONTEND-ONLY: No actual emails are sent
 * 
 * ============================================================================
 */

import { X, Mail, AlertCircle, Clock, User } from 'lucide-react';
import { EmailNotification } from './emailNotificationService';

interface Props {
  notification: EmailNotification;
  language: string;
  isRTL: boolean;
  onClose: () => void;
}

export function EmailPreviewModal({ notification, language, isRTL, onClose }: Props) {
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString(language === 'ar' ? 'ar' : 'en', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const t = {
    title: language === 'en' ? 'Email Preview' : 'معاينة البريد الإلكتروني',
    simulatedLabel: language === 'en' 
      ? 'Simulated Notification (Frontend-Only)' 
      : 'إشعار محاكى (واجهة أمامية فقط)',
    simulatedDesc: language === 'en'
      ? 'This is a demonstration. No actual email was sent. Real email sending requires backend integration.'
      : 'هذا عرض توضيحي. لم يتم إرسال بريد إلكتروني فعلي. يتطلب الإرسال الفعلي للبريد الإلكتروني تكامل الخادم.',
    from: language === 'en' ? 'From' : 'من',
    to: language === 'en' ? 'To' : 'إلى',
    subject: language === 'en' ? 'Subject' : 'الموضوع',
    sentAt: language === 'en' ? 'Sent At' : 'أُرسل في',
    status: language === 'en' ? 'Status' : 'الحالة',
    simulated: language === 'en' ? 'Simulated' : 'محاكى',
    messageBody: language === 'en' ? 'Message Body' : 'نص الرسالة',
    close: language === 'en' ? 'Close' : 'إغلاق'
  };

  return (
    <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">{t.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Simulated Warning Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-amber-900 text-sm">
                {t.simulatedLabel}
              </div>
              <div className="text-amber-700 text-xs mt-1">
                {t.simulatedDesc}
              </div>
            </div>
          </div>
        </div>

        {/* Email Headers */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="space-y-3">
            {/* From */}
            <div className="flex items-start gap-3">
              <div className="text-sm font-semibold text-gray-600 w-20">
                {t.from}:
              </div>
              <div className="text-sm text-gray-900">
                HR Management System &lt;noreply@hrms.org&gt;
              </div>
            </div>

            {/* To */}
            <div className="flex items-start gap-3">
              <div className="text-sm font-semibold text-gray-600 w-20">
                {t.to}:
              </div>
              <div className="text-sm text-gray-900">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span>{notification.recipientName}</span>
                  <span className="text-gray-500">
                    &lt;{notification.recipientEmail}&gt;
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Role: {notification.recipientRole}
                </div>
              </div>
            </div>

            {/* Subject */}
            <div className="flex items-start gap-3">
              <div className="text-sm font-semibold text-gray-600 w-20">
                {t.subject}:
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {notification.subject}
              </div>
            </div>

            {/* Sent At */}
            <div className="flex items-start gap-3">
              <div className="text-sm font-semibold text-gray-600 w-20">
                {t.sentAt}:
              </div>
              <div className="text-sm text-gray-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                {formatDateTime(notification.sentAt)}
              </div>
            </div>

            {/* Status */}
            <div className="flex items-start gap-3">
              <div className="text-sm font-semibold text-gray-600 w-20">
                {t.status}:
              </div>
              <div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  {t.simulated}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Email Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="text-sm font-semibold text-gray-700 mb-3">
            {t.messageBody}
          </div>
          <div 
            className="bg-white border border-gray-200 rounded-lg p-6 font-mono text-sm text-gray-800 whitespace-pre-wrap"
            style={{ lineHeight: '1.6' }}
          >
            {notification.body}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}