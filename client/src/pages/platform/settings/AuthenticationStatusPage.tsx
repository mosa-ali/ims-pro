import { useLanguage } from "@/contexts/LanguageContext";
import { Key, CheckCircle, AlertCircle, Info } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/BackButton";

/**
 * Authentication & Identity Status Page (READ-ONLY - Phase 0)
 * 
 * Provides transparency on identity integration without allowing modifications.
 * Displays:
 * - Authentication provider (Manus OAuth current, Microsoft Entra ID planned)
 * - OAuth connection status
 * - MFA enforcement status
 * - Session policy
 */

export default function AuthenticationStatusPage() {
 const { language, direction, isRTL} = useLanguage();
 const isArabic = language === 'ar';

 // Mock data - in production, this would come from system configuration
 const authStatus = {
 currentProvider: {
 name: "Manus OAuth",
 status: "connected",
 description: isArabic 
 ? "نظام المصادقة الحالي المستخدم لجميع عمليات تسجيل الدخول"
 : "Current authentication system used for all login operations",
 },
 plannedProvider: {
 name: "Microsoft Entra ID",
 status: "planned",
 description: isArabic
 ? "مزود هوية المؤسسة المخطط للتكامل المستقبلي"
 : "Enterprise identity provider planned for future integration",
 },
 mfaEnabled: true,
 sessionPolicy: {
 timeout: "24 hours",
 refreshEnabled: true,
 description: isArabic
 ? "تنتهي صلاحية الجلسات تلقائيًا بعد 24 ساعة من عدم النشاط"
 : "Sessions automatically expire after 24 hours of inactivity",
 },
 };

 return (
 <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className="bg-white border-b border-gray-200">
 <div className="container py-6">
 <div className="flex items-center gap-4 mb-4">
 <BackButton href="~/platform/settings" iconOnly />
 <div className="flex-1">
 <h1 className="text-2xl font-bold text-gray-900">
 {isArabic ? 'حالة المصادقة والهوية' : 'Authentication & Identity Status'}
 </h1>
 <p className="text-sm text-gray-500 mt-1">
 {isArabic 
 ? 'عرض تكوين مزود الهوية وحالة الاتصال'
 : 'View identity provider configuration and connection status'}
 </p>
 </div>
 <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
 {isArabic ? 'للقراءة فقط' : 'Read-Only'}
 </Badge>
 </div>
 </div>
 </div>

 {/* Content */}
 <div className="container py-8 max-w-4xl">
 {/* Info Banner */}
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
 <div className="flex items-start gap-3">
 <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
 <div className="flex-1">
 <h3 className="font-semibold text-blue-900 mb-1">
 {isArabic ? 'معلومات للقراءة فقط' : 'Read-Only Information'}
 </h3>
 <p className="text-sm text-blue-700">
 {isArabic
 ? 'لا يمكن تعديل إعدادات المصادقة من خلال هذه الواجهة. اتصل بمسؤول النظام لإجراء تغييرات على تكوين الأمان.'
 : 'Authentication settings cannot be modified through this interface. Contact system administrator for changes to security configuration.'}
 </p>
 </div>
 </div>
 </div>

 {/* Authentication Providers */}
 <div className="space-y-6">
 {/* Current Provider */}
 <Card>
 <CardHeader>
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-lg bg-green-50">
 <Key className="w-5 h-5 text-green-600" />
 </div>
 <div className="flex-1">
 <CardTitle>{isArabic ? 'مزود المصادقة الحالي' : 'Current Authentication Provider'}</CardTitle>
 <CardDescription>
 {isArabic
 ? 'نظام الهوية النشط حاليًا'
 : 'Currently active identity system'}
 </CardDescription>
 </div>
 <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
 <CheckCircle className="w-3 h-3 me-1 inline-block" />
 {isArabic ? 'متصل' : 'Connected'}
 </Badge>
 </div>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <p className="text-sm font-semibold text-gray-700 mb-1">
 {isArabic ? 'اسم المزود' : 'Provider Name'}
 </p>
 <p className="text-base text-gray-900">{authStatus.currentProvider.name}</p>
 </div>
 <div>
 <p className="text-sm font-semibold text-gray-700 mb-1">
 {isArabic ? 'الحالة' : 'Status'}
 </p>
 <p className="text-base text-green-600 font-semibold capitalize">
 {isArabic ? 'نشط ومتصل' : 'Active & Connected'}
 </p>
 </div>
 </div>
 <div>
 <p className="text-sm font-semibold text-gray-700 mb-1">
 {isArabic ? 'الوصف' : 'Description'}
 </p>
 <p className="text-sm text-gray-600">{authStatus.currentProvider.description}</p>
 </div>
 </CardContent>
 </Card>

 {/* Planned Provider */}
 <Card>
 <CardHeader>
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-lg bg-amber-50">
 <Key className="w-5 h-5 text-amber-600" />
 </div>
 <div className="flex-1">
 <CardTitle>{isArabic ? 'مزود الهوية المخطط' : 'Planned Identity Provider'}</CardTitle>
 <CardDescription>
 {isArabic
 ? 'التكامل المستقبلي قيد التطوير'
 : 'Future integration under development'}
 </CardDescription>
 </div>
 <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
 <AlertCircle className="w-3 h-3 me-1 inline-block" />
 {isArabic ? 'مخطط' : 'Planned'}
 </Badge>
 </div>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <p className="text-sm font-semibold text-gray-700 mb-1">
 {isArabic ? 'اسم المزود' : 'Provider Name'}
 </p>
 <p className="text-base text-gray-900">{authStatus.plannedProvider.name}</p>
 </div>
 <div>
 <p className="text-sm font-semibold text-gray-700 mb-1">
 {isArabic ? 'الحالة' : 'Status'}
 </p>
 <p className="text-base text-amber-600 font-semibold capitalize">
 {isArabic ? 'قيد التخطيط' : 'In Planning'}
 </p>
 </div>
 </div>
 <div>
 <p className="text-sm font-semibold text-gray-700 mb-1">
 {isArabic ? 'الوصف' : 'Description'}
 </p>
 <p className="text-sm text-gray-600">{authStatus.plannedProvider.description}</p>
 </div>
 </CardContent>
 </Card>

 {/* Security Settings */}
 <Card>
 <CardHeader>
 <CardTitle>{isArabic ? 'إعدادات الأمان' : 'Security Settings'}</CardTitle>
 <CardDescription>
 {isArabic
 ? 'سياسات الأمان والجلسة الحالية'
 : 'Current security and session policies'}
 </CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 {/* MFA Status */}
 <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
 <div>
 <p className="font-semibold text-gray-900">
 {isArabic ? 'فرض المصادقة متعددة العوامل (MFA)' : 'Multi-Factor Authentication (MFA) Enforcement'}
 </p>
 <p className="text-sm text-gray-600 mt-1">
 {isArabic
 ? 'يتطلب من المستخدمين تمكين MFA لتعزيز الأمان'
 : 'Requires users to enable MFA for enhanced security'}
 </p>
 </div>
 <Badge variant="outline" className={authStatus.mfaEnabled ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-600 border-gray-200"}>
 {authStatus.mfaEnabled 
 ? (isArabic ? 'مفعّل' : 'Enabled')
 : (isArabic ? 'معطّل' : 'Disabled')}
 </Badge>
 </div>

 {/* Session Policy */}
 <div className="p-4 bg-gray-50 rounded-lg">
 <p className="font-semibold text-gray-900 mb-2">
 {isArabic ? 'سياسة الجلسة' : 'Session Policy'}
 </p>
 <div className="space-y-2">
 <div className="flex justify-between text-sm">
 <span className="text-gray-600">{isArabic ? 'مهلة الجلسة' : 'Session Timeout'}</span>
 <span className="font-medium text-gray-900">{authStatus.sessionPolicy.timeout}</span>
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-gray-600">{isArabic ? 'تحديث تلقائي' : 'Auto Refresh'}</span>
 <span className="font-medium text-gray-900">
 {authStatus.sessionPolicy.refreshEnabled 
 ? (isArabic ? 'مفعّل' : 'Enabled')
 : (isArabic ? 'معطّل' : 'Disabled')}
 </span>
 </div>
 <p className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-200">
 {authStatus.sessionPolicy.description}
 </p>
 </div>
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Footer Note */}
 <div className="mt-6 text-center text-sm text-gray-500">
 <p>
 {isArabic
 ? 'لا يمكن تعديل تكوينات المصادقة من خلال واجهة المستخدم. اتصل بفريق دعم المنصة للحصول على المساعدة.'
 : 'Authentication configurations cannot be modified through the user interface. Contact platform support team for assistance.'}
 </p>
 </div>
 </div>
 </div>
 );
}
