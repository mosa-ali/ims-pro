import { Globe, Check } from 'lucide-react';
import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export function LanguageSettings() {
 const { t } = useTranslation();
 const [, navigate] = useLocation();
 const { language, setLanguage, isRTL } = useLanguage();
 const labels = {
 title: t.settingsModule.languageLocalization,
 subtitle: t.settingsModule.switchBetweenArabicAndEnglishInterface,
 back: t.settingsModule.backToSettings,
 selectLang: t.settingsModule.selectInterfaceLanguage,
 english: 'English',
 arabic: 'العربية',
 englishDesc: t.settingsModule.useEnglishForTheEntireInterface,
 arabicDesc: t.settingsModule.useArabicForTheEntireInterface,
 current: t.settingsModule.current,
 note: t.settingsModule.changingTheLanguageWillImmediatelyUpdate,
 };

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className={`flex items-center gap-3`}>
 <BackButton onClick={() => navigate('/organization/settings')} label={labels.back} />
 </div>
 <div className={`flex items-center gap-3`}>
 <div className="p-3 bg-green-50 rounded-lg"><Globe className="w-6 h-6 text-green-600" /></div>
 <div>
 <h1 className={`text-2xl font-bold text-gray-900 ${isRTL ? 'text-end' : ''}`}>{labels.title}</h1>
 <p className={`text-sm text-gray-500 ${isRTL ? 'text-end' : ''}`}>{labels.subtitle}</p>
 </div>
 </div>

 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h2 className="font-semibold text-gray-900 mb-4">{labels.selectLang}</h2>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {/* English */}
 <button
 onClick={() => setLanguage('en')}
 className={`p-6 rounded-lg border-2 transition-all text-start border-green-500 bg-green-50`}
 >
 <div className="flex items-center justify-between mb-3">
 <span className="text-3xl">🇬🇧</span>
 {language === 'en' && <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full"><Check className="w-3 h-3" />{labels.current}</span>}
 </div>
 <h3 className="font-semibold text-gray-900 text-lg">{labels.english}</h3>
 <p className="text-sm text-gray-500 mt-1">{labels.englishDesc}</p>
 </button>

 {/* Arabic */}
 <button
 onClick={() => setLanguage('ar')}
 className={`p-6 rounded-lg border-2 transition-all text-end border-gray-200 hover:border-green-300`}
 >
 <div className="flex items-center justify-between mb-3">
 {language === 'ar' && <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full"><Check className="w-3 h-3" />{labels.current}</span>}
 <span className="text-3xl">🇸🇦</span>
 </div>
 <h3 className="font-semibold text-gray-900 text-lg">{labels.arabic}</h3>
 <p className="text-sm text-gray-500 mt-1">{labels.arabicDesc}</p>
 </button>
 </div>
 <p className="text-xs text-gray-400 mt-4">{labels.note}</p>
 </div>
 </div>
 );
}

export default LanguageSettings;
