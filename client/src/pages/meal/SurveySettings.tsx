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

import { useNavigate } from '@/lib/router-compat';
import { useSearch } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { Save } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export function SurveySettings() {
 const { t } = useTranslation();
 const navigate = useNavigate();
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

 const labels = {
 title: t.mealSurvey.settings,
 subtitle: t.mealSurvey.configureModulePreferences,
 back: t.mealSurvey.back,
 dataCollection: t.mealSurvey.dataCollection,
 offlineCollection: t.mealSurvey.offlineCollection,
 offlineDescription: t.mealSurvey.allowDataEntryWithoutInternet,
 allowEdits: t.mealSurvey.allowEditsAfterSubmit,
 allowEditsDescription: t.mealSurvey.enumeratorsCanModifySubmittedData,
 requireVerification: t.mealSurvey.requireVerification,
 verificationDescription: t.mealSurvey.allSubmissionsMustBeVerified,
 dataManagement: t.mealSurvey.dataManagement,
 retentionPeriod: t.mealSurvey.dataRetentionPeriod,
 sixMonths: t.mealSurvey.k6Months,
 oneYear: t.mealSurvey.k1Year,
 twoYears: t.mealSurvey.k2Years,
 indefinite: t.mealSurvey.indefinite,
 compliance: t.mealSurvey.compliance,
 auditTrail: t.mealSurvey.auditTrail,
 auditTrailDesc: 'All data changes are logged for compliance and donor reporting',
 viewAuditLog: t.mealSurvey.viewAuditLog,
 piiMasking: t.mealSurvey.piiMasking,
 piiMaskingDesc: 'Configure which fields are masked in exports for privacy protection',
 configureMasking: t.mealSurvey.configureMasking,
 saveSettings: t.mealSurvey.saveSettings,
 success: t.mealSurvey.success,
 settingsSaved: t.mealSurvey.settingsSavedSuccessfully,
 };

 const handleSaveSettings = () => {
 // TODO: Implement actual save logic
 alert(labels.settingsSaved);
 };

 const handleViewAuditLog = () => {
 // Navigate to audit log screen
 navigate(`/organization/meal/audit-trail?projectId=${projectId}&projectName=${projectName}`);
 };

 const handleConfigureMasking = () => {
 // Navigate to PII masking config screen
 navigate(`/organization/meal/pii-masking-config?projectId=${projectId}&projectName=${projectName}`);
 };

 return (
 <div className="max-w-4xl mx-auto p-6 space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Back Navigation */}
 <BackButton onClick={() => navigate('/organization/meal/survey')} label={t.mealSurvey.backToSurveys} />
 {/* Header */}
 <div className={`flex items-center justify-between mb-2`}>
 <div className={`flex-1 text-start`}>
 <h1 className="text-2xl font-bold text-gray-900">{labels.title}</h1>
 <p className="text-sm text-gray-600 mt-1">{labels.subtitle}</p>
 </div>
 </div>

 {/* Data Collection Settings */}
 <div className="space-y-3">
 <h2 className={`text-lg font-bold text-gray-900 text-start`}>
 {labels.dataCollection}
 </h2>

 {/* Offline Collection */}
 <div className={`flex items-center justify-between p-4 rounded-lg bg-white border border-gray-200`}>
 <div className={'text-start'}>
 <p className="text-sm font-semibold text-gray-900">{labels.offlineCollection}</p>
 <p className="text-xs text-gray-600 mt-1">{labels.offlineDescription}</p>
 </div>
 <button
 onClick={() => setOfflineEnabled(!offlineEnabled)}
 className={`w-12 h-6 rounded-full transition-colors relative ${ offlineEnabled ? 'bg-blue-600' : 'bg-gray-300' }`}
 >
 <span
 className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${ offlineEnabled ? ('right-1') : ('left-1') }`}
 />
 </button>
 </div>

 {/* Allow Edits After Submit */}
 <div className={`flex items-center justify-between p-4 rounded-lg bg-white border border-gray-200`}>
 <div className={'text-start'}>
 <p className="text-sm font-semibold text-gray-900">{labels.allowEdits}</p>
 <p className="text-xs text-gray-600 mt-1">{labels.allowEditsDescription}</p>
 </div>
 <button
 onClick={() => setAllowEditsAfterSubmit(!allowEditsAfterSubmit)}
 className={`w-12 h-6 rounded-full transition-colors relative ${ allowEditsAfterSubmit ? 'bg-blue-600' : 'bg-gray-300' }`}
 >
 <span
 className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${ allowEditsAfterSubmit ? ('right-1') : ('left-1') }`}
 />
 </button>
 </div>

 {/* Require Verification */}
 <div className={`flex items-center justify-between p-4 rounded-lg bg-white border border-gray-200`}>
 <div className={'text-start'}>
 <p className="text-sm font-semibold text-gray-900">{labels.requireVerification}</p>
 <p className="text-xs text-gray-600 mt-1">{labels.verificationDescription}</p>
 </div>
 <button
 onClick={() => setRequireVerification(!requireVerification)}
 className={`w-12 h-6 rounded-full transition-colors relative ${ requireVerification ? 'bg-blue-600' : 'bg-gray-300' }`}
 >
 <span
 className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${ requireVerification ? ('right-1') : ('left-1') }`}
 />
 </button>
 </div>
 </div>

 {/* Data Management Settings */}
 <div className="space-y-3">
 <h2 className={`text-lg font-bold text-gray-900 text-start`}>
 {labels.dataManagement}
 </h2>

 <div className="p-4 rounded-lg bg-white border border-gray-200">
 <p className={`text-sm font-semibold text-gray-900 mb-3 text-start`}>
 {labels.retentionPeriod}
 </p>
 <div className={`flex gap-2 flex-wrap`}>
 {[
 { value: '6mo', label: labels.sixMonths },
 { value: '1yr', label: labels.oneYear },
 { value: '2yr', label: labels.twoYears },
 { value: 'indefinite', label: labels.indefinite },
 ].map((period) => (
 <button
 key={period.value}
 onClick={() => setDataRetention(period.value)}
 className={`px-4 py-2 rounded-full transition-colors ${ dataRetention === period.value ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300' }`}
 >
 <span className="text-xs font-medium">{period.label}</span>
 </button>
 ))}
 </div>
 </div>
 </div>

 {/* Compliance Settings */}
 <div className="space-y-3">
 <h2 className={`text-lg font-bold text-gray-900 text-start`}>
 {labels.compliance}
 </h2>

 {/* Audit Trail */}
 <div className="p-4 rounded-lg bg-white border border-gray-200">
 <p className={`text-sm font-semibold text-gray-900 mb-2 text-start`}>
 {labels.auditTrail}
 </p>
 <p className={`text-xs text-gray-600 text-start`}>
 {labels.auditTrailDesc}
 </p>
 <button
 onClick={handleViewAuditLog}
 className="mt-3 w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
 >
 <span className="text-xs font-semibold text-white">{labels.viewAuditLog}</span>
 </button>
 </div>

 {/* PII Masking */}
 <div className="p-4 rounded-lg bg-white border border-gray-200">
 <p className={`text-sm font-semibold text-gray-900 mb-2 text-start`}>
 {labels.piiMasking}
 </p>
 <p className={`text-xs text-gray-600 text-start`}>
 {labels.piiMaskingDesc}
 </p>
 <button
 onClick={handleConfigureMasking}
 className="mt-3 w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
 >
 <span className="text-xs font-semibold text-white">{labels.configureMasking}</span>
 </button>
 </div>
 </div>

 {/* Save Button */}
 <button
 onClick={handleSaveSettings}
 className="w-full rounded-lg py-4 bg-blue-600 hover:bg-blue-700 transition-colors mt-4"
 >
 <span className="font-semibold text-white flex items-center justify-center gap-2">
 <Save className="w-4 h-4" /> {labels.saveSettings}
 </span>
 </button>
 </div>
 );
}