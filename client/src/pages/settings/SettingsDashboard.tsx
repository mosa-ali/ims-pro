import { Users, Shield, List, Globe, Mail, Palette, Trash2, RefreshCw, Lock, Upload, ChevronRight, Activity, Settings, FileText, Zap } from 'lucide-react';
import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { isUserAdmin } from '@/lib/adminCheck';
import { useTranslation } from '@/i18n/useTranslation';

interface SettingCard {
 id: string;
 title: string;
 titleAr: string;
 description: string;
 descriptionAr: string;
 icon: React.ReactNode;
 adminOnly: boolean;
 path: string;
 color: string;
}

const settingsCards: SettingCard[] = [
 {
 id: 'user-management',
 title: 'User Management',
 titleAr: 'إدارة المستخدمين',
 description: 'Manage system users and assign roles',
 descriptionAr: 'إدارة مستخدمي النظام وتعيين الأدوار',
 icon: <Users className="w-5 h-5" />,
 adminOnly: true,
 path: '/organization/settings/users',
 color: 'bg-blue-50 text-blue-600'
 },
 {
 id: 'roles-permissions',
 title: 'Roles & Permissions',
 titleAr: 'الأدوار والصلاحيات',
 description: 'Define what each role can access and edit',
 descriptionAr: 'تحديد ما يمكن لكل دور الوصول إليه وتعديله',
 icon: <Shield className="w-5 h-5" />,
 adminOnly: true,
 path: '/organization/settings/roles',
 color: 'bg-purple-50 text-purple-600'
 },
 {
 id: 'option-sets',
 title: 'Option Sets / Lookups',
 titleAr: 'مجموعات الخيارات / القوائم',
 description: 'Manage dropdown values used across the system',
 descriptionAr: 'إدارة قيم القوائم المنسدلة المستخدمة في النظام',
 icon: <List className="w-5 h-5" />,
 adminOnly: true,
 path: '/organization/settings/options',
 color: 'bg-indigo-50 text-indigo-600'
 },
 {
 id: 'language',
 title: 'Language & Localization',
 titleAr: 'اللغة والترجمة',
 description: 'Switch between Arabic and English interface',
 descriptionAr: 'التبديل بين واجهة اللغة العربية والإنجليزية',
 icon: <Globe className="w-5 h-5" />,
 adminOnly: false,
 path: '/organization/settings/language',
 color: 'bg-green-50 text-green-600'
 },
 {
 id: 'email-notifications',
 title: 'Email & Notifications',
 titleAr: 'البريد الإلكتروني والإشعارات',
 description: 'Control system notifications and templates',
 descriptionAr: 'التحكم في إشعارات النظام والقوالب',
 icon: <Mail className="w-5 h-5" />,
 adminOnly: false,
 path: '/organization/settings/notifications',
 color: 'bg-yellow-50 text-yellow-600'
 },
 {
 id: 'branding',
 title: 'Logo & Branding',
 titleAr: 'الشعار والعلامة التجارية',
 description: 'Customize system branding and appearance',
 descriptionAr: 'تخصيص العلامة التجارية ومظهر النظام',
 icon: <Palette className="w-5 h-5" />,
 adminOnly: true,
 path: '/organization/settings/branding',
 color: 'bg-pink-50 text-pink-600'
 },
 {
 id: 'deleted-records',
 title: 'Deleted Records / Archive',
 titleAr: 'السجلات المحذوفة / الأرشيف',
 description: 'Audit and restore deleted data',
 descriptionAr: 'مراجعة واستعادة البيانات المحذوفة',
 icon: <Trash2 className="w-5 h-5" />,
 adminOnly: true,
 path: '/organization/settings/deleted-records',
 color: 'bg-red-50 text-red-600'
 },
 {
 id: 'import-history',
 title: 'Import History',
 titleAr: 'سجل الاستيراد',
 description: 'Track Excel imports, view errors, and retry failed imports',
 descriptionAr: 'تتبع عمليات استيراد Excel وعرض الأخطاء وإعادة محاولة الاستيرادات الفاشلة',
 icon: <Upload className="w-5 h-5" />,
 adminOnly: true,
 path: '/organization/settings/import-history',
 color: 'bg-blue-50 text-blue-600'
 },
 {
 id: 'publish-sync',
 title: 'System Publish & Sync',
 titleAr: 'نشر ومزامنة النظام',
 description: 'Control publishing and data synchronization',
 descriptionAr: 'التحكم في النشر ومزامنة البيانات',
 icon: <RefreshCw className="w-5 h-5" />,
 adminOnly: true,
 path: '/organization/settings/publish-sync',
 color: 'bg-cyan-50 text-cyan-600'
 },
 {
 id: 'admin-access',
 title: 'Administrator Access',
 titleAr: 'وصول المسؤول',
 description: 'Advanced system controls and maintenance',
 descriptionAr: 'عناصر التحكم المتقدمة في النظام والصيانة',
 icon: <Lock className="w-5 h-5" />,
 adminOnly: true,
 path: '/organization/settings/admin',
 color: 'bg-gray-50 text-gray-600'
 },
 {
 id: 'system-health',
 title: 'System Health & Protection',
 titleAr: 'صحة النظام والحماية',
 description: 'Monitor system readiness and regression rules',
 descriptionAr: 'مراقبة جاهزية النظام وقواعد منع التراجع',
 icon: <Activity className="w-5 h-5" />,
 adminOnly: true,
 path: '/organization/settings/system-health',
 color: 'bg-red-50 text-red-600'
 },
 {
 id: 'central-documents',
 title: 'Central Documents',
 titleAr: 'المستندات المركزية',
 description: 'Unified audit repository with multi-workspace structure',
 descriptionAr: 'مستودع التدقيق الموحد مع هيكل متعدد مساحات العمل',
 icon: <FileText className="w-5 h-5" />,
 adminOnly: false,
 path: '/organization/settings/documents',
 color: 'bg-emerald-50 text-emerald-600'
 },
 {
 id: 'unit-types',
 title: 'Unit Type Management',
 titleAr: 'إدارة أنواع الوحدات',
 description: 'Manage standardized units used across all modules',
 descriptionAr: 'إدارة الوحدات الموحدة المستخدمة عبر جميع الوحدات',
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

 const isAdmin = isUserAdmin(user);

 // Filter cards based on admin status
 const visibleCards = settingsCards.filter(card => !card.adminOnly || isAdmin);

 const t_settings = {
 title: t.settingsModule.settings,
 subtitle: t.settingsModule.applicationSettingsAndPreferences,
 adminOnly: t.settingsModule.adminOnly
 };

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
 {language === 'en' ? card.title : card.titleAr}
 </h3>
 {card.adminOnly && (
 <span className="inline-block px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded mb-2">
 {t_settings.adminOnly}
 </span>
 )}
 <p className={`text-sm text-gray-600 text-start`}>
 {language === 'en' ? card.description : card.descriptionAr}
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
