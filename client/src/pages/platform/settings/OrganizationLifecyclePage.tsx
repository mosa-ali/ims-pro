import { useLanguage } from "@/contexts/LanguageContext";
import { Building2, Info, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/BackButton";

export default function OrganizationLifecyclePage() {
 const { language, direction, isRTL} = useLanguage();
 const isArabic = language === 'ar';

 const lifecycleRules = {
 statuses: [
 {
 name: isArabic ? "نشط" : "Active",
 description: isArabic
 ? "المنظمة تعمل بشكل كامل مع الوصول الكامل إلى جميع الميزات"
 : "Organization is fully operational with full access to all features",
 color: "green",
 },
 {
 name: isArabic ? "معلق" : "Suspended",
 description: isArabic
 ? "الوصول مقيد مؤقتًا، البيانات محفوظة، لا يمكن إجراء عمليات جديدة"
 : "Access temporarily restricted, data preserved, no new operations allowed",
 color: "amber",
 },
 {
 name: isArabic ? "مؤرشف" : "Archived",
 description: isArabic
 ? "المنظمة غير نشطة بشكل دائم، البيانات محفوظة للقراءة فقط"
 : "Organization permanently inactive, data preserved in read-only mode",
 color: "gray",
 },
 ],
 transitions: [
 {
 from: isArabic ? "نشط" : "Active",
 to: isArabic ? "معلق" : "Suspended",
 allowed: true,
 reason: isArabic
 ? "يمكن تعليق المنظمات النشطة لأسباب إدارية أو مالية"
 : "Active organizations can be suspended for administrative or financial reasons",
 },
 {
 from: isArabic ? "معلق" : "Suspended",
 to: isArabic ? "نشط" : "Active",
 allowed: true,
 reason: isArabic
 ? "يمكن إعادة تنشيط المنظمات المعلقة بعد حل المشكلات"
 : "Suspended organizations can be reactivated after issues are resolved",
 },
 {
 from: isArabic ? "نشط" : "Active",
 to: isArabic ? "مؤرشف" : "Archived",
 allowed: true,
 reason: isArabic
 ? "يمكن أرشفة المنظمات النشطة عند الإغلاق الدائم"
 : "Active organizations can be archived upon permanent closure",
 },
 {
 from: isArabic ? "معلق" : "Suspended",
 to: isArabic ? "مؤرشف" : "Archived",
 allowed: true,
 reason: isArabic
 ? "يمكن أرشفة المنظمات المعلقة إذا لم يتم حل المشكلات"
 : "Suspended organizations can be archived if issues are not resolved",
 },
 {
 from: isArabic ? "مؤرشف" : "Archived",
 to: isArabic ? "نشط" : "Active",
 allowed: false,
 reason: isArabic
 ? "لا يمكن إعادة تنشيط المنظمات المؤرشفة - يجب إنشاء منظمة جديدة"
 : "Archived organizations cannot be reactivated - must create new organization",
 },
 ],
 autoArchivalRules: [
 {
 rule: isArabic
 ? "المنظمات المعلقة لأكثر من 12 شهرًا يتم أرشفتها تلقائيًا"
 : "Organizations suspended for more than 12 months are automatically archived",
 enabled: true,
 },
 {
 rule: isArabic
 ? "المنظمات بدون مستخدمين نشطين لمدة 6 أشهر يتم تعليقها تلقائيًا"
 : "Organizations with no active users for 6 months are automatically suspended",
 enabled: true,
 },
 {
 rule: isArabic
 ? "المنظمات بدون نشاط لمدة 24 شهرًا يتم أرشفتها تلقائيًا"
 : "Organizations with no activity for 24 months are automatically archived",
 enabled: false,
 },
 ],
 dataRetention: {
 active: isArabic ? "غير محدود" : "Unlimited",
 suspended: isArabic ? "12 شهرًا" : "12 months",
 archived: isArabic ? "7 سنوات" : "7 years",
 },
 };

 return (
 <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="bg-white border-b border-gray-200">
 <div className="container py-6">
 <div className="flex items-center gap-4 mb-4">
 <BackButton href="~/platform/settings" iconOnly />
 <div className="flex-1">
 <h1 className="text-2xl font-bold text-gray-900">
 {isArabic ? 'قواعد دورة حياة المنظمة' : 'Organization Lifecycle Rules'}
 </h1>
 <p className="text-sm text-gray-500 mt-1">
 {isArabic ? 'عرض قواعد الحوكمة للانتقالات بين حالات المنظمة' : 'View governance rules for organization status transitions'}
 </p>
 </div>
 <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
 {isArabic ? 'للقراءة فقط' : 'Read-Only'}
 </Badge>
 </div>
 </div>
 </div>

 <div className="container py-8 max-w-4xl">
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
 <div className="flex items-start gap-3">
 <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
 <div className="flex-1">
 <h3 className="font-semibold text-blue-900 mb-1">
 {isArabic ? 'قواعد محددة مسبقًا' : 'Predefined Rules'}
 </h3>
 <p className="text-sm text-blue-700">
 {isArabic ? 'قواعد دورة حياة المنظمة محددة مسبقًا من قبل النظام ولا يمكن تعديلها في المرحلة 0.' : 'Organization lifecycle rules are predefined by the system and cannot be modified in Phase 0.'}
 </p>
 </div>
 </div>
 </div>

 <div className="space-y-6">
 <Card>
 <CardHeader>
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-lg bg-blue-50">
 <Building2 className="w-5 h-5 text-blue-600" />
 </div>
 <div>
 <CardTitle>{isArabic ? 'حالات المنظمة' : 'Organization Statuses'}</CardTitle>
 <CardDescription>{isArabic ? 'الحالات المتاحة لدورة حياة المنظمة' : 'Available states in organization lifecycle'}</CardDescription>
 </div>
 </div>
 </CardHeader>
 <CardContent className="space-y-3">
 {lifecycleRules.statuses.map((status, index) => (
 <div key={index} className="p-4 bg-gray-50 rounded-lg">
 <div className="flex items-center gap-3 mb-2">
 <Badge variant="outline" className={status.color === 'green' ? "bg-green-50 text-green-700 border-green-200" : status.color === 'amber' ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-gray-100 text-gray-700 border-gray-300"}>
 {status.name}
 </Badge>
 </div>
 <p className="text-sm text-gray-600">{status.description}</p>
 </div>
 ))}
 </CardContent>
 </Card>

 <Card>
 <CardHeader>
 <CardTitle>{isArabic ? 'الانتقالات المسموح بها' : 'Allowed Transitions'}</CardTitle>
 <CardDescription>{isArabic ? 'قواعد الانتقال بين حالات المنظمة' : 'Rules for transitioning between organization statuses'}</CardDescription>
 </CardHeader>
 <CardContent className="space-y-3">
 {lifecycleRules.transitions.map((transition, index) => (
 <div key={index} className="p-4 bg-gray-50 rounded-lg">
 <div className="flex items-center gap-3 mb-2">
 <span className="text-sm font-semibold text-gray-700">{transition.from}</span>
 <span className="text-gray-400">→</span>
 <span className="text-sm font-semibold text-gray-700">{transition.to}</span>
 {transition.allowed ? <CheckCircle2 className="w-4 h-4 text-green-600 ms-auto" /> : <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 ms-auto">{isArabic ? 'غير مسموح' : 'Not Allowed'}</Badge>}
 </div>
 <p className="text-sm text-gray-600">{transition.reason}</p>
 </div>
 ))}
 </CardContent>
 </Card>

 <Card>
 <CardHeader>
 <CardTitle>{isArabic ? 'قواعد الأرشفة التلقائية' : 'Automatic Archival Rules'}</CardTitle>
 <CardDescription>{isArabic ? 'الشروط التي تؤدي إلى الأرشفة التلقائية' : 'Conditions that trigger automatic archival'}</CardDescription>
 </CardHeader>
 <CardContent className="space-y-3">
 {lifecycleRules.autoArchivalRules.map((rule, index) => (
 <div key={index} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
 <p className="text-sm text-gray-700 flex-1">{rule.rule}</p>
 <Badge variant="outline" className={rule.enabled ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-600 border-gray-300"}>
 {rule.enabled ? (isArabic ? 'مفعّل' : 'Enabled') : (isArabic ? 'معطّل' : 'Disabled')}
 </Badge>
 </div>
 ))}
 </CardContent>
 </Card>

 <Card>
 <CardHeader>
 <CardTitle>{isArabic ? 'سياسة الاحتفاظ بالبيانات' : 'Data Retention Policy'}</CardTitle>
 <CardDescription>{isArabic ? 'مدة الاحتفاظ بالبيانات لكل حالة منظمة' : 'Data retention duration for each organization status'}</CardDescription>
 </CardHeader>
 <CardContent>
 <div className="space-y-3">
 <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
 <span className="text-sm font-semibold text-gray-700">{isArabic ? 'منظمات نشطة' : 'Active Organizations'}</span>
 <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{lifecycleRules.dataRetention.active}</Badge>
 </div>
 <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
 <span className="text-sm font-semibold text-gray-700">{isArabic ? 'منظمات معلقة' : 'Suspended Organizations'}</span>
 <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{lifecycleRules.dataRetention.suspended}</Badge>
 </div>
 <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
 <span className="text-sm font-semibold text-gray-700">{isArabic ? 'منظمات مؤرشفة' : 'Archived Organizations'}</span>
 <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">{lifecycleRules.dataRetention.archived}</Badge>
 </div>
 </div>
 </CardContent>
 </Card>
 </div>

 <div className="mt-6 text-center text-sm text-gray-500">
 <p>{isArabic ? 'قواعد دورة الحياة محددة مسبقًا من قبل النظام ولا يمكن تعديلها من خلال واجهة المستخدم.' : 'Lifecycle rules are predefined by the system and cannot be modified through the user interface.'}</p>
 </div>
 </div>
 </div>
 );
}
