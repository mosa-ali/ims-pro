import { useLanguage } from "@/contexts/LanguageContext";
import { 
 Users, Shield, Settings as SettingsIcon, Key, Building2, 
 FileSearch, Activity, ArrowRight, Trash2, Clock, Mail
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from '@/i18n/useTranslation';

/**
 * Platform Admin Settings Page
 * 
 * Provides global governance and control over the IMS platform without accessing operational data.
 * 
 * 7 Setting Cards (Phase 0):
 * 1. Platform Users - Manage platform admins
 * 2. Platform Roles & Permissions - Read-only roles display
 * 3. Global System Settings - Default language, timezone, currency, environment
 * 4. Authentication & Identity Status - Read-only auth provider info
 * 5. Organization Lifecycle Rules - Read-only lifecycle rules
 * 6. Audit & Compliance - View platform audit logs (REAL DATA)
 * 7. System Health & Readiness - Link to existing system health page
 */

interface SettingCard {
 id: string;
 title: string;
 titleAr: string;
 description: string;
 descriptionAr: string;
 icon: any;
 path: string;
 badge?: string;
 badgeAr?: string;
}

export default function PlatformAdminSettingsPage() {
  const { t } = useTranslation();
const { language, direction, isRTL } = useLanguage();

 const settingCards: SettingCard[] = [
 {
 id: 'platform-users',
 title: 'Platform Users',
 titleAr: 'مستخدمو المنصة',
 description: 'Manage who can administer the platform itself. Add, remove, or suspend Platform Admins.',
 descriptionAr: 'إدارة من يمكنه إدارة المنصة نفسها. إضافة أو إزالة أو تعليق مسؤولي المنصة.',
 icon: Users,
 path: '/platform/settings/users',
 badge: 'Mandatory',
 badgeAr: 'إلزامي'
 },
 {
 id: 'platform-roles',
 title: 'Platform Roles & Permissions',
 titleAr: 'الأدوار والصلاحيات',
 description: 'View platform-level roles and their permissions. Read-only in Phase 0.',
 descriptionAr: 'عرض أدوار المنصة وصلاحياتها. للقراءة فقط في المرحلة 0.',
 icon: Shield,
 path: '/platform/settings/roles',
 badge: 'Read-Only',
 badgeAr: 'للقراءة فقط'
 },
 {
 id: 'global-settings',
 title: 'Global System Settings',
 titleAr: 'الإعدادات العامة',
 description: 'Configure default language, timezone, currency, and environment label.',
 descriptionAr: 'تكوين اللغة الافتراضية والمنطقة الزمنية والعملة وتسمية البيئة.',
 icon: SettingsIcon,
 path: '/platform/settings/global'
 },
 {
 id: 'authentication',
 title: 'Authentication & Identity',
 titleAr: 'المصادقة والهوية',
 description: 'View authentication provider status, OAuth connection, and MFA enforcement.',
 descriptionAr: 'عرض حالة موفر المصادقة واتصال OAuth وتطبيق المصادقة متعددة العوامل.',
 icon: Key,
 path: '/platform/settings/authentication',
 badge: 'Read-Only',
 badgeAr: 'للقراءة فقط'
 },
 {
 id: 'org-lifecycle',
 title: 'Organization Lifecycle Rules',
 titleAr: 'قواعد دورة حياة المنظمة',
 description: 'Understand organization states (Active, Suspended, Deleted) and who can change them.',
 descriptionAr: 'فهم حالات المنظمة (نشطة، معلقة، محذوفة) ومن يمكنه تغييرها.',
 icon: Building2,
 path: '/platform/settings/lifecycle',
 badge: 'Read-Only',
 badgeAr: 'للقراءة فقط'
 },
 {
 id: 'audit-compliance',
 title: 'Audit & Compliance',
 titleAr: 'التدقيق والامتثال',
 description: 'View platform activity logs including organization changes, user actions, and login events.',
 descriptionAr: 'عرض سجلات نشاط المنصة بما في ذلك تغييرات المنظمة وإجراءات المستخدم وأحداث تسجيل الدخول.',
 icon: FileSearch,
 path: '/platform/settings/audit',
 badge: 'Real Data',
 badgeAr: 'بيانات حقيقية'
 },
 {
 id: 'system-health',
 title: 'System Health & Readiness',
 titleAr: 'صحة النظام والجاهزية',
 description: 'Monitor platform stability, dependency status, version info, and deployment timestamp.',
 descriptionAr: 'مراقبة استقرار المنصة وحالة التبعيات ومعلومات الإصدار وطابع الوقت للنشر.',
 icon: Activity,
 path: '/platform/system-health'
 },
 {
 id: 'deleted-records',
 title: 'Deleted Records',
 titleAr: 'السجلات المحذوفة',
 description: 'View and manage soft-deleted records across all organizations. Restore or permanently purge entities.',
 descriptionAr: 'عرض وإدارة السجلات المحذوفة مؤقتاً عبر جميع المنظمات. استعادة الكيانات أو حذفها نهائياً.',
 icon: Trash2,
 path: '/platform/deleted-records',
 badge: 'Real Data',
 badgeAr: 'بيانات حقيقية'
 },
 {
 id: 'retention-policy',
 title: 'Retention Policy',
 titleAr: 'سياسة الاحتفاظ',
 description: 'Configure automatic purging of soft-deleted records after a specified retention period.',
 descriptionAr: 'تكوين الحذف التلقائي للسجلات المحذوفة مؤقتاً بعد فترة احتفاظ محددة.',
 icon: Clock,
 path: '/platform/retention-policy',
 badge: 'Policy Control',
 badgeAr: 'التحكم بالسياسة'
 },
 {
 id: 'platform-email',
 title: 'Platform Email Settings',
 titleAr: 'إعدادات البريد الإلكتروني للمنصة',
 description: 'Configure the platform-level M365 mailbox used to send onboarding links and system notifications to organization admins.',
 descriptionAr: 'تكوين صندوق بريد Microsoft 365 على مستوى المنصة المستخدم لإرسال روابط الإعداد والإشعارات للمسؤولين.',
 icon: Mail,
 path: '/platform/settings/email',
 badge: 'Required',
 badgeAr: 'مطلوب'
 }
 ];

 return (
 <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Page Header */}
 <div className="bg-white border-b border-gray-200">
 <div className="container py-8">
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-3xl font-bold text-gray-900">
 {t.platformModule.platformAdminSettings}
 </h1>
 <p className="text-gray-500 mt-2">
 {'Global governance and control over the IMS platform'}
 </p>
 </div>
 <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
 {t.platformModule.platformAdminOnly}
 </Badge>
 </div>
 </div>
 </div>

 {/* Settings Cards Grid */}
 <div className="container py-8">
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {settingCards.map((card) => {
 const Icon = card.icon;
 const title = language === 'ar' ? card.titleAr : card.title;
 const description = language === 'ar' ? card.descriptionAr : card.description;
 const badge = card.badge ? (language === 'ar' ? card.badgeAr : card.badge) : null;

 return (
 <a
 key={card.id}
 href={card.path}
 className="block group"
 >
 <Card className="h-full transition-all hover:shadow-lg hover:border-slate-300 cursor-pointer">
 <CardHeader>
 <div className="flex items-start justify-between mb-3">
 <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
 <Icon className="w-6 h-6 text-slate-700" />
 </div>
 {badge && (
 <Badge variant="secondary" className="text-xs">
 {badge}
 </Badge>
 )}
 </div>
 <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-slate-700 transition-colors">
 {title}
 </CardTitle>
 <CardDescription className="text-sm text-gray-500 leading-relaxed">
 {description}
 </CardDescription>
 </CardHeader>
 <CardContent>
 <div className={`flex items-center gap-2 text-sm font-semibold text-slate-600 group-hover:text-slate-900 transition-colors`}>
 <span>{t.platformModule.open}</span>
 <ArrowRight className={`w-4 h-4 group-hover:translate-x-1 transition-transform ${isRTL ? 'rotate-180' : ''}`} />
 </div>
 </CardContent>
 </Card>
 </a>
 );
 })}
 </div>

 {/* Important Notice */}
 <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
 <div className="flex items-start gap-4">
 <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
 <Shield className="w-5 h-5 text-blue-600" />
 </div>
 <div>
 <h3 className="font-bold text-blue-900 mb-2">
 {t.platformModule.platformSettingsGovernance}
 </h3>
 <p className="text-sm text-blue-800 leading-relaxed">
 {'Platform Admin Settings provide global governance without accessing operational data. These settings configure the system, not the business. Most settings are read-only in Phase 0 to prevent security drift.'}
 </p>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}
