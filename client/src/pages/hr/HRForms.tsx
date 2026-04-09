import { Link } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export function HRForms() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 
 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <BackButton href="/organization/hr" label={t.hr.hrDashboard} />
 <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
 <h2 className="text-2xl font-bold text-gray-900 mb-2">
 {t.hr.hrFormsRequests}
 </h2>
 <p className="text-gray-600">
 {t.hr.comingSoon}
 </p>
 </div>
 </div>
 );
}
