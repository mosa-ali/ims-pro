/**
 * ============================================================================
 * SURVEY SETTINGS
 * ============================================================================
 * 
 * Converted from React Native to Web React
 * Configure survey module preferences and compliance settings
 * 
 * FEATURES:
 * - Data collection settings (offline, edits, verification)
 * - Data retention period selection
 * - Audit trail access
 * - PII masking configuration
 * - Save settings
 * - Bilingual support (EN/AR) with RTL
 * 
 * ============================================================================
 */

import { useLocation, useSearch } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowLeft, Save } from 'lucide-react';
import { useState } from 'react';

export function SurveySettings() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const { language, isRTL } = useLanguage();
  const [offlineEnabled, setOfflineEnabled] = useState(true);
  const [allowEditsAfterSubmit, setAllowEditsAfterSubmit] = useState(false);
  const [requireVerification, setRequireVerification] = useState(true);
  const [dataRetention, setDataRetention] = useState('indefinite');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [autoBackup, setAutoBackup] = useState(true);

  const projectId = searchParams.get('projectId') || '';
  const projectName = searchParams.get('projectName') || '';

  const t = {
    title: language === 'en' ? 'Settings' : 'الإعدادات',
    subtitle: language === 'en' ? 'Configure module preferences' : 'تكوين تفضيلات الوحدة',
    back: language === 'en' ? 'Back' : 'رجوع',
    dataCollection: language === 'en' ? 'Data Collection' : 'جمع البيانات',
    offlineCollection: language === 'en' ? 'Offline Collection' : 'الجمع دون اتصال',
    offlineDescription: language === 'en' ? 'Allow data entry without internet' : 'السماح بإدخال البيانات بدون إنترنت',
    allowEdits: language === 'en' ? 'Allow Edits After Submit' : 'السماح بالتعديلات بعد الإرسال',
    allowEditsDescription: language === 'en' ? 'Enumerators can modify submitted data' : 'يمكن للمعدادين تعديل البيانات المرسلة',
    requireVerification: language === 'en' ? 'Require Verification' : 'يتطلب التحقق',
    verificationDescription: language === 'en' ? 'All submissions must be verified' : 'يجب التحقق من جميع التقديمات',
    dataManagement: language === 'en' ? 'Data Management' : 'إدارة البيانات',
    retentionPeriod: language === 'en' ? 'Data Retention Period' : 'فترة الاحتفاظ بالبيانات',
    sixMonths: language === 'en' ? '6 Months' : '6 أشهر',
    oneYear: language === 'en' ? '1 Year' : 'سنة واحدة',
    twoYears: language === 'en' ? '2 Years' : 'سنتان',
    indefinite: language === 'en' ? 'Indefinite' : 'غير محدد',
    compliance: language === 'en' ? 'Compliance' : 'الامتثال',
    auditTrail: language === 'en' ? 'Audit Trail' : 'سجل التدقيق',
    auditTrailDesc: language === 'en'
      ? 'All data changes are logged for compliance and donor reporting'
      : 'يتم تسجيل جميع تغييرات البيانات للامتثال وتقارير المانحين',
    viewAuditLog: language === 'en' ? 'View Audit Log' : 'عرض سجل التدقيق',
    piiMasking: language === 'en' ? 'PII Masking' : 'إخفاء المعلومات الشخصية',
    piiMaskingDesc: language === 'en'
      ? 'Configure which fields are masked in exports for privacy protection'
      : 'تكوين الحقول التي يتم إخفاؤها في الصادرات لحماية الخصوصية',
    configureMasking: language === 'en' ? 'Configure Masking' : 'تكوين الإخفاء',
    saveSettings: language === 'en' ? '💾 Save Settings' : '💾 حفظ الإعدادات',
    success: language === 'en' ? 'Success' : 'نجح',
    settingsSaved: language === 'en' ? 'Settings saved successfully' : 'تم حفظ الإعدادات بنجاح',
  };

  const handleSaveSettings = () => {
    // TODO: Implement actual save logic
    alert(t.settingsSaved);
  };

  const handleViewAuditLog = () => {
    // Navigate to audit log screen
    navigate(`/meal/audit-trail?projectId=${projectId}&projectName=${projectName}`);
  };

  const handleConfigureMasking = () => {
    // Navigate to PII masking config screen
    navigate(`/meal/pii-masking-config?projectId=${projectId}&projectName=${projectName}`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      {/* Header */}
      <div className={`flex items-center justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
          <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
          <p className="text-sm text-gray-600 mt-1">{t.subtitle}</p>
        </div>
        <button
          onClick={() => window.history.back()}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
          <span className="text-sm font-medium text-gray-700">{t.back}</span>
        </button>
      </div>

      {/* Data Collection Settings */}
      <div className="space-y-3">
        <h2 className={`text-lg font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.dataCollection}
        </h2>

        {/* Offline Collection */}
        <div className={`flex items-center justify-between p-4 rounded-lg bg-white border border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-sm font-semibold text-gray-900">{t.offlineCollection}</p>
            <p className="text-xs text-gray-600 mt-1">{t.offlineDescription}</p>
          </div>
          <button
            onClick={() => setOfflineEnabled(!offlineEnabled)}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              offlineEnabled ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                offlineEnabled ? (isRTL ? 'left-1' : 'right-1') : (isRTL ? 'right-1' : 'left-1')
              }`}
            />
          </button>
        </div>

        {/* Allow Edits After Submit */}
        <div className={`flex items-center justify-between p-4 rounded-lg bg-white border border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-sm font-semibold text-gray-900">{t.allowEdits}</p>
            <p className="text-xs text-gray-600 mt-1">{t.allowEditsDescription}</p>
          </div>
          <button
            onClick={() => setAllowEditsAfterSubmit(!allowEditsAfterSubmit)}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              allowEditsAfterSubmit ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                allowEditsAfterSubmit ? (isRTL ? 'left-1' : 'right-1') : (isRTL ? 'right-1' : 'left-1')
              }`}
            />
          </button>
        </div>

        {/* Require Verification */}
        <div className={`flex items-center justify-between p-4 rounded-lg bg-white border border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-sm font-semibold text-gray-900">{t.requireVerification}</p>
            <p className="text-xs text-gray-600 mt-1">{t.verificationDescription}</p>
          </div>
          <button
            onClick={() => setRequireVerification(!requireVerification)}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              requireVerification ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                requireVerification ? (isRTL ? 'left-1' : 'right-1') : (isRTL ? 'right-1' : 'left-1')
              }`}
            />
          </button>
        </div>
      </div>

      {/* Data Management Settings */}
      <div className="space-y-3">
        <h2 className={`text-lg font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.dataManagement}
        </h2>

        <div className="p-4 rounded-lg bg-white border border-gray-200">
          <p className={`text-sm font-semibold text-gray-900 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.retentionPeriod}
          </p>
          <div className={`flex gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
            {[
              { value: '6mo', label: t.sixMonths },
              { value: '1yr', label: t.oneYear },
              { value: '2yr', label: t.twoYears },
              { value: 'indefinite', label: t.indefinite },
            ].map((period) => (
              <button
                key={period.value}
                onClick={() => setDataRetention(period.value)}
                className={`px-4 py-2 rounded-full transition-colors ${
                  dataRetention === period.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <span className="text-xs font-medium">{period.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Compliance Settings */}
      <div className="space-y-3">
        <h2 className={`text-lg font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.compliance}
        </h2>

        {/* Audit Trail */}
        <div className="p-4 rounded-lg bg-white border border-gray-200">
          <p className={`text-sm font-semibold text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.auditTrail}
          </p>
          <p className={`text-xs text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.auditTrailDesc}
          </p>
          <button
            onClick={handleViewAuditLog}
            className="mt-3 w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <span className="text-xs font-semibold text-white">{t.viewAuditLog}</span>
          </button>
        </div>

        {/* PII Masking */}
        <div className="p-4 rounded-lg bg-white border border-gray-200">
          <p className={`text-sm font-semibold text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.piiMasking}
          </p>
          <p className={`text-xs text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.piiMaskingDesc}
          </p>
          <button
            onClick={handleConfigureMasking}
            className="mt-3 w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <span className="text-xs font-semibold text-white">{t.configureMasking}</span>
          </button>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSaveSettings}
        className="w-full rounded-lg py-4 bg-blue-600 hover:bg-blue-700 transition-colors mt-4"
      >
        <span className="font-semibold text-white flex items-center justify-center gap-2">
          <Save className="w-4 h-4" /> {t.saveSettings}
        </span>
      </button>
    </div>
  );
}