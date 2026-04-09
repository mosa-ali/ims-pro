import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

export function ContractsAssignments() {
 const { t } = useTranslation();
 const { language, isRTL} = useLanguage();
 
 return (
 <div className="bg-white rounded-lg border border-gray-200 p-8 text-center" dir={isRTL ? 'rtl' : 'ltr'}>
 <h2 className="text-2xl font-bold text-gray-900 mb-2">
 {t.hr.contractsAssignments}
 </h2>
 <p className="text-gray-600">
 {t.hr.comingSoon}
 </p>
 </div>
 );
}
