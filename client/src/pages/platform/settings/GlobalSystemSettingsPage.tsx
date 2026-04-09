import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Settings, Save, Info } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { BackButton } from "@/components/BackButton";

/**
 * Global System Settings Page (EDITABLE - Phase 0)
 * 
 * Allows Platform Admins to configure system-wide settings:
 * - Default system language (EN / AR) - Editable
 * - Default timezone - Read-only (display only)
 * - Default currency - Read-only (display only)
 * - Platform environment label (Production / Staging / Test) - Editable
 */

export default function GlobalSystemSettingsPage() {
 const { language, direction, isRTL} = useLanguage();
 const isArabic = language === 'ar';

 // Fetch current settings
 const { data: settings, isLoading, refetch } = trpc.ims.globalSettings.get.useQuery();

 // Local state for form
 const [defaultLanguage, setDefaultLanguage] = useState<string>("");
 const [environmentLabel, setEnvironmentLabel] = useState<string>("");
 const [hasChanges, setHasChanges] = useState(false);

 // Update mutation
 const updateMutation = trpc.ims.globalSettings.update.useMutation({
 onSuccess: () => {
 toast.success(isArabic ? "تم حفظ الإعدادات بنجاح" : "Settings saved successfully");
 setHasChanges(false);
 refetch();
 },
 onError: (error) => {
 toast.error(isArabic ? "فشل حفظ الإعدادات" : "Failed to save settings");
 console.error(error);
 },
 });

 // Initialize form when settings load
 if (settings && !defaultLanguage && !environmentLabel) {
 setDefaultLanguage(settings.defaultLanguage);
 setEnvironmentLabel(settings.environmentLabel);
 }

 const handleSave = () => {
 if (!hasChanges) return;

 updateMutation.mutate({
 defaultLanguage: defaultLanguage as "en" | "ar",
 environmentLabel: environmentLabel as "production" | "staging" | "test",
 });
 };

 const handleLanguageChange = (value: string) => {
 setDefaultLanguage(value);
 setHasChanges(true);
 };

 const handleEnvironmentChange = (value: string) => {
 setEnvironmentLabel(value);
 setHasChanges(true);
 };

 if (isLoading) {
 return (
 <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="text-center">
 <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
 <p className="text-gray-600">{isArabic ? 'جارٍ التحميل...' : 'Loading...'}</p>
 </div>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-gray-50">
 {/* Header */}
 <div className="bg-white border-b border-gray-200">
 <div className="container py-6">
 <div className="flex items-center gap-4 mb-4">
 <BackButton href="~/platform/settings" iconOnly />
 <div className="flex-1">
 <h1 className="text-2xl font-bold text-gray-900">
 {isArabic ? 'الإعدادات العامة للنظام' : 'Global System Settings'}
 </h1>
 <p className="text-sm text-gray-500 mt-1">
 {isArabic 
 ? 'تكوين الإعدادات على مستوى النظام'
 : 'Configure system-wide settings'}
 </p>
 </div>
 {hasChanges && (
 <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
 {isArabic ? 'تغييرات غير محفوظة' : 'Unsaved Changes'}
 </Badge>
 )}
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
 {isArabic ? 'إعدادات المرحلة 0' : 'Phase 0 Settings'}
 </h3>
 <p className="text-sm text-blue-700">
 {isArabic
 ? 'بعض الإعدادات للقراءة فقط في هذه المرحلة. سيتم تمكين التحكم الكامل في المراحل المستقبلية.'
 : 'Some settings are read-only in this phase. Full control will be enabled in future phases.'}
 </p>
 </div>
 </div>
 </div>

 {/* Settings Form */}
 <Card>
 <CardHeader>
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-lg bg-blue-50">
 <Settings className="w-5 h-5 text-blue-600" />
 </div>
 <div>
 <CardTitle>{isArabic ? 'إعدادات النظام' : 'System Configuration'}</CardTitle>
 <CardDescription>
 {isArabic
 ? 'إدارة الإعدادات الافتراضية التي تؤثر على جميع المنظمات'
 : 'Manage default settings that affect all organizations'}
 </CardDescription>
 </div>
 </div>
 </CardHeader>
 <CardContent className="space-y-6">
 {/* Default Language - EDITABLE */}
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <Label htmlFor="defaultLanguage" className="text-base font-semibold">
 {isArabic ? 'اللغة الافتراضية للنظام' : 'Default System Language'}
 </Label>
 <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
 {isArabic ? 'قابل للتعديل' : 'Editable'}
 </Badge>
 </div>
 <p className="text-sm text-gray-500">
 {isArabic
 ? 'اللغة الافتراضية للمستخدمين الجدد والواجهة'
 : 'Default language for new users and interface'}
 </p>
 <Select value={defaultLanguage} onValueChange={handleLanguageChange}>
 <SelectTrigger id="defaultLanguage" className="w-full">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="en">English (EN)</SelectItem>
 <SelectItem value="ar">العربية (AR)</SelectItem>
 </SelectContent>
 </Select>
 </div>

 {/* Default Timezone - READ-ONLY */}
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <Label className="text-base font-semibold">
 {isArabic ? 'المنطقة الزمنية الافتراضية' : 'Default Timezone'}
 </Label>
 <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
 {isArabic ? 'للقراءة فقط' : 'Read-Only'}
 </Badge>
 </div>
 <p className="text-sm text-gray-500">
 {isArabic
 ? 'المنطقة الزمنية المستخدمة لعرض التواريخ والأوقات'
 : 'Timezone used for displaying dates and times'}
 </p>
 <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-700">
 {settings?.defaultTimezone || 'UTC'}
 </div>
 </div>

 {/* Default Currency - READ-ONLY */}
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <Label className="text-base font-semibold">
 {isArabic ? 'العملة الافتراضية' : 'Default Currency'}
 </Label>
 <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
 {isArabic ? 'للقراءة فقط' : 'Read-Only'}
 </Badge>
 </div>
 <p className="text-sm text-gray-500">
 {isArabic
 ? 'العملة الافتراضية للمعاملات المالية'
 : 'Default currency for financial transactions'}
 </p>
 <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-700">
 {settings?.defaultCurrency || 'USD'}
 </div>
 </div>

 {/* Environment Label - EDITABLE */}
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <Label htmlFor="environmentLabel" className="text-base font-semibold">
 {isArabic ? 'تسمية بيئة المنصة' : 'Platform Environment Label'}
 </Label>
 <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
 {isArabic ? 'قابل للتعديل' : 'Editable'}
 </Badge>
 </div>
 <p className="text-sm text-gray-500">
 {isArabic
 ? 'تحديد بيئة المنصة الحالية (إنتاج، تجريبي، اختبار)'
 : 'Identify the current platform environment (production, staging, test)'}
 </p>
 <Select value={environmentLabel} onValueChange={handleEnvironmentChange}>
 <SelectTrigger id="environmentLabel" className="w-full">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="production">
 {isArabic ? 'إنتاج (Production)' : 'Production'}
 </SelectItem>
 <SelectItem value="staging">
 {isArabic ? 'تجريبي (Staging)' : 'Staging'}
 </SelectItem>
 <SelectItem value="test">
 {isArabic ? 'اختبار (Test)' : 'Test'}
 </SelectItem>
 </SelectContent>
 </Select>
 </div>

 {/* Save Button */}
 <div className="pt-4 border-t">
 <Button
 onClick={handleSave}
 disabled={!hasChanges || updateMutation.isPending}
 className="w-full sm:w-auto"
 >
 {updateMutation.isPending ? (
 <>
 <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin me-2"></div>
 {isArabic ? 'جارٍ الحفظ...' : 'Saving...'}
 </>
 ) : (
 <>
 <Save className="w-4 h-4 me-2" />
 {isArabic ? 'حفظ التغييرات' : 'Save Changes'}
 </>
 )}
 </Button>
 </div>
 </CardContent>
 </Card>

 {/* Footer Note */}
 <div className="mt-6 text-center text-sm text-gray-500">
 <p>
 {isArabic
 ? 'تؤثر هذه الإعدادات على جميع المنظمات في المنصة. استخدمها بحذر.'
 : 'These settings affect all organizations on the platform. Use with caution.'}
 </p>
 </div>
 </div>
 </div>
 );
}
