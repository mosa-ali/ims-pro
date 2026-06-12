import { Users, Shield, List, Globe, Mail, Palette, Trash2, RefreshCw, Lock, Upload, ChevronRight, Activity, Settings, FileText, Zap } from 'lucide-react';
import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { isUserAdmin } from '@/lib/adminCheck';
import { useTranslation } from '@/i18n/useTranslation';

interface SettingCard {
  id: string;
  title: { en: string; ar: string; it: string };
  description: { en: string; ar: string; it: string };
  icon: React.ReactNode;
  adminOnly: boolean;
  path: string;
  color: string;
}

const settingsCards: SettingCard[] = [
  {
    id: 'user-management',
    title: {
      en: 'User Management',
      ar: 'إدارة المستخدمين',
      it: 'Gestione Utenti'
    },
    description: {
      en: 'Manage system users and assign roles',
      ar: 'إدارة مستخدمي النظام وتعيين الأدوار',
      it: 'Gestisci gli utenti del sistema e assegna i ruoli'
    },
    icon: <Users className="w-5 h-5" />,
    adminOnly: true,
    path: '/organization/settings/users',
    color: 'bg-blue-50 text-blue-600'
  },
  {
    id: 'roles-permissions',
    title: {
      en: 'Roles & Permissions',
      ar: 'الأدوار والصلاحيات',
      it: 'Ruoli e Autorizzazioni'
    },
    description: {
      en: 'Define what each role can access and edit',
      ar: 'تحديد ما يمكن لكل دور الوصول إليه وتعديله',
      it: 'Definisci cosa ogni ruolo può accedere e modificare'
    },
    icon: <Shield className="w-5 h-5" />,
    adminOnly: true,
    path: '/organization/settings/roles',
    color: 'bg-purple-50 text-purple-600'
  },
  {
    id: 'option-sets',
    title: {
      en: 'Option Sets / Lookups',
      ar: 'مجموعات الخيارات / القوائم',
      it: 'Set di Opzioni / Ricerche'
    },
    description: {
      en: 'Manage dropdown values used across the system',
      ar: 'إدارة قيم القوائم المنسدلة المستخدمة في النظام',
      it: 'Gestisci i valori dei menu a discesa utilizzati nel sistema'
    },
    icon: <List className="w-5 h-5" />,
    adminOnly: true,
    path: '/organization/settings/options',
    color: 'bg-indigo-50 text-indigo-600'
  },
  {
    id: 'language',
    title: {
      en: 'Language & Localization',
      ar: 'اللغة والترجمة',
      it: 'Lingua e Localizzazione'
    },
    description: {
      en: 'Switch between Arabic and English interface',
      ar: 'التبديل بين واجهة اللغة العربية والإنجليزية',
      it: 'Passa tra l\'interfaccia araba e inglese'
    },
    icon: <Globe className="w-5 h-5" />,
    adminOnly: false,
    path: '/organization/settings/language',
    color: 'bg-green-50 text-green-600'
  },
  {
    id: 'email-notifications',
    title: {
      en: 'Email & Notifications',
      ar: 'البريد الإلكتروني والإشعارات',
      it: 'Email e Notifiche'
    },
    description: {
      en: 'Control system notifications and templates',
      ar: 'التحكم في إشعارات النظام والقوالب',
      it: 'Controlla le notifiche di sistema e i modelli'
    },
    icon: <Mail className="w-5 h-5" />,
    adminOnly: false,
    path: '/organization/settings/notifications',
    color: 'bg-yellow-50 text-yellow-600'
  },
  {
    id: 'branding',
    title: {
      en: 'Logo & Branding',
      ar: 'الشعار والعلامة التجارية',
      it: 'Logo e Branding'
    },
    description: {
      en: 'Customize system branding and appearance',
      ar: 'تخصيص العلامة التجارية ومظهر النظام',
      it: 'Personalizza il branding e l\'aspetto del sistema'
    },
    icon: <Palette className="w-5 h-5" />,
    adminOnly: true,
    path: '/organization/settings/branding',
    color: 'bg-pink-50 text-pink-600'
  },
  {
    id: 'deleted-records',
    title: {
      en: 'Deleted Records / Archive',
      ar: 'السجلات المحذوفة / الأرشيف',
      it: 'Record Eliminati / Archivio'
    },
    description: {
      en: 'Audit and restore deleted data',
      ar: 'مراجعة واستعادة البيانات المحذوفة',
      it: 'Audit e ripristina i dati eliminati'
    },
    icon: <Trash2 className="w-5 h-5" />,
    adminOnly: true,
    path: '/organization/settings/deleted-records',
    color: 'bg-red-50 text-red-600'
  },
  {
    id: 'import-history',
    title: {
      en: 'Import History',
      ar: 'سجل الاستيراد',
      it: 'Cronologia Importazione'
    },
    description: {
      en: 'Track Excel imports, view errors, and retry failed imports',
      ar: 'تتبع عمليات استيراد Excel وعرض الأخطاء وإعادة محاولة الاستيرادات الفاشلة',
      it: 'Traccia le importazioni di Excel, visualizza gli errori e riprova le importazioni non riuscite'
    },
    icon: <Upload className="w-5 h-5" />,
    adminOnly: true,
    path: '/organization/settings/import-history',
    color: 'bg-blue-50 text-blue-600'
  },
  {
    id: 'publish-sync',
    title: {
      en: 'System Publish & Sync',
      ar: 'نشر ومزامنة النظام',
      it: 'Pubblica e Sincronizza Sistema'
    },
    description: {
      en: 'Control publishing and data synchronization',
      ar: 'التحكم في النشر ومزامنة البيانات',
      it: 'Controlla la pubblicazione e la sincronizzazione dei dati'
    },
    icon: <RefreshCw className="w-5 h-5" />,
    adminOnly: true,
    path: '/organization/settings/publish-sync',
    color: 'bg-cyan-50 text-cyan-600'
  },
  {
    id: 'admin-access',
    title: {
      en: 'Administrator Access',
      ar: 'وصول المسؤول',
      it: 'Accesso Amministratore'
    },
    description: {
      en: 'Advanced system controls and maintenance',
      ar: 'عناصر التحكم المتقدمة في النظام والصيانة',
      it: 'Controlli di sistema avanzati e manutenzione'
    },
    icon: <Lock className="w-5 h-5" />,
    adminOnly: true,
    path: '/organization/settings/admin',
    color: 'bg-gray-50 text-gray-600'
  },
  {
    id: 'system-health',
    title: {
      en: 'System Health & Protection',
      ar: 'صحة النظام والحماية',
      it: 'Salute del Sistema e Protezione'
    },
    description: {
      en: 'Monitor system readiness and regression rules',
      ar: 'مراقبة جاهزية النظام وقواعد منع التراجع',
      it: 'Monitora la prontezza del sistema e le regole di regressione'
    },
    icon: <Activity className="w-5 h-5" />,
    adminOnly: true,
    path: '/organization/settings/system-health',
    color: 'bg-red-50 text-red-600'
  },
  {
    id: 'central-documents',
    title: {
      en: 'Central Documents',
      ar: 'المستندات المركزية',
      it: 'Documenti Centrali'
    },
    description: {
      en: 'Unified audit repository with multi-workspace structure',
      ar: 'مستودع التدقيق الموحد مع هيكل متعدد مساحات العمل',
      it: 'Repository di audit unificato con struttura multi-workspace'
    },
    icon: <FileText className="w-5 h-5" />,
    adminOnly: false,
    path: '/organization/settings/documents',
    color: 'bg-emerald-50 text-emerald-600'
  },
  {
    id: 'unit-types',
    title: {
      en: 'Unit Type Management',
      ar: 'إدارة أنواع الوحدات',
      it: 'Gestione Tipi di Unità'
    },
    description: {
      en: 'Manage standardized units used across all modules',
      ar: 'إدارة الوحدات الموحدة المستخدمة عبر جميع الوحدات',
      it: 'Gestisci le unità standardizzate utilizzate in tutti i moduli'
    },
    icon: <Zap className="w-5 h-5" />,
    adminOnly: true,
    path: '/organization/settings/unit-types',
    color: 'bg-orange-50 text-orange-600'
  }
];

export function SettingsDashboard() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { language, isRTL } = useLanguage();
  const { user } = useAuth();

  // ========== HELPER FUNCTION TO GET TEXT BY LANGUAGE ==========
  const getText = (en: string, ar: string, it: string): string => {
    switch (language) {
      case "ar":
        return ar;
      case "it":
        return it;
      case "en":
      default:
        return en;
    }
  };

  // ========== GET LANGUAGE KEY FOR TYPE-SAFE INDEXING ==========
  const getLanguageKey = (): 'en' | 'ar' | 'it' => {
    if (language === 'ar') return 'ar';
    if (language === 'it') return 'it';
    return 'en';
  };

  const isAdmin = isUserAdmin(user);

  // Filter cards based on admin status
  const visibleCards = settingsCards.filter(card => !card.adminOnly || isAdmin);

  const t_settings = {
    title: getText(
      t.settingsModule.settings || "Settings",
      t.settingsModule.settings || "الإعدادات",
      t.settingsModule.settings || "Impostazioni"
    ),
    subtitle: getText(
      t.settingsModule.applicationSettingsAndPreferences || "Application settings and preferences",
      t.settingsModule.applicationSettingsAndPreferences || "إعدادات التطبيق والتفضيلات",
      t.settingsModule.applicationSettingsAndPreferences || "Impostazioni dell'applicazione e preferenze"
    ),
    adminOnly: getText(
      t.settingsModule.adminOnly || "Admin only",
      t.settingsModule.adminOnly || "للمسؤول فقط",
      t.settingsModule.adminOnly || "Solo amministratore"
    )
  };

  const langKey = getLanguageKey();

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className={`flex items-center gap-3`}>
        <Settings className="w-8 h-8 text-gray-900" />
        <div>
          <h1 className={`text-2xl font-bold text-gray-900 text-start`}>
            {t_settings.title}
          </h1>
          <p className={`text-sm text-gray-600 mt-1 text-start`}>
            {t_settings.subtitle}
          </p>
        </div>
      </div>

      {/* Settings Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleCards.map((card) => (
          <button
            key={card.id}
            onClick={() => navigate(card.path)}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all text-start group"
          >
            <div className={`flex items-start justify-between`}>
              <div className={`flex items-start gap-4 flex-1`}>
                <div className={`p-3 rounded-lg ${card.color}`}>
                  {card.icon}
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold text-gray-900 mb-1 text-start`}>
                    {card.title[langKey]}
                  </h3>
                  {card.adminOnly && (
                    <span className="inline-block px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded mb-2">
                      {t_settings.adminOnly}
                    </span>
                  )}
                  <p className={`text-sm text-gray-600 text-start`}>
                    {card.description[langKey]}
                  </p>
                </div>
              </div>
              <ChevronRight className={`w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0 ${isRTL ? 'rotate-180' : ''}`} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default SettingsDashboard;
