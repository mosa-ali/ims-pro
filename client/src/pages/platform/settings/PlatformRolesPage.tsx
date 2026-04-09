import { useLanguage } from "@/contexts/LanguageContext";
import { Shield, Check, Lock } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/BackButton";

/**
 * Platform Roles & Permissions Page (READ-ONLY - Phase 0)
 * 
 * Displays platform-level roles and their permissions in a read-only format.
 * Roles are locked in Phase 0 to prevent security drift.
 * 
 * Roles:
 * 1. Platform Super Admin - Full system access
 * 2. Platform Admin - Management access
 * 3. Platform Auditor - Read-only access
 */

interface Permission {
 id: string;
 nameEn: string;
 nameAr: string;
}

interface Role {
 id: string;
 nameEn: string;
 nameAr: string;
 descriptionEn: string;
 descriptionAr: string;
 permissions: string[]; // Permission IDs
 color: string;
}

// Define all available permissions
const ALL_PERMISSIONS: Permission[] = [
 { id: "manage_platform_users", nameEn: "Manage platform users", nameAr: "إدارة مستخدمي المنصة" },
 { id: "manage_organizations", nameEn: "Manage organizations", nameAr: "إدارة المنظمات" },
 { id: "view_organizations", nameEn: "View organizations", nameAr: "عرض المنظمات" },
 { id: "manage_global_settings", nameEn: "Manage global settings", nameAr: "إدارة الإعدادات العامة" },
 { id: "view_global_settings", nameEn: "View global settings", nameAr: "عرض الإعدادات العامة" },
 { id: "view_audit_logs", nameEn: "View audit logs", nameAr: "عرض سجلات التدقيق" },
 { id: "export_audit_logs", nameEn: "Export audit logs", nameAr: "تصدير سجلات التدقيق" },
 { id: "manage_system_health", nameEn: "Manage system health", nameAr: "إدارة صحة النظام" },
 { id: "view_system_health", nameEn: "View system health", nameAr: "عرض صحة النظام" },
 { id: "manage_roles", nameEn: "Manage roles & permissions", nameAr: "إدارة الأدوار والصلاحيات" },
 { id: "suspend_organizations", nameEn: "Suspend/restore organizations", nameAr: "تعليق/استعادة المنظمات" },
 { id: "delete_organizations", nameEn: "Delete organizations", nameAr: "حذف المنظمات" },
];

// Define the 3 locked roles (Phase 0)
const PLATFORM_ROLES: Role[] = [
 {
 id: "platform_super_admin",
 nameEn: "Platform Super Admin",
 nameAr: "المسؤول الأعلى للمنصة",
 descriptionEn: "Full access to all platform functions including user management, organization control, system settings, and security configuration. This role has unrestricted access to all platform features.",
 descriptionAr: "وصول كامل لجميع وظائف المنصة بما في ذلك إدارة المستخدمين والتحكم في المنظمات وإعدادات النظام وتكوين الأمان. هذا الدور لديه وصول غير مقيد لجميع ميزات المنصة.",
 permissions: ALL_PERMISSIONS.map(p => p.id), // All permissions
 color: "red",
 },
 {
 id: "platform_admin",
 nameEn: "Platform Admin",
 nameAr: "مسؤول المنصة",
 descriptionEn: "Management access to platform operations including user management, organization oversight, and system monitoring. Cannot modify core security settings or role definitions.",
 descriptionAr: "وصول إداري لعمليات المنصة بما في ذلك إدارة المستخدمين والإشراف على المنظمات ومراقبة النظام. لا يمكن تعديل إعدادات الأمان الأساسية أو تعريفات الأدوار.",
 permissions: [
 "manage_platform_users",
 "manage_organizations",
 "view_organizations",
 "manage_global_settings",
 "view_audit_logs",
 "view_system_health",
 "suspend_organizations",
 ],
 color: "blue",
 },
 {
 id: "platform_auditor",
 nameEn: "Platform Auditor",
 nameAr: "مدقق المنصة",
 descriptionEn: "Read-only access to platform data for audit and compliance purposes. Can view organizations, settings, audit logs, and system health but cannot make any changes.",
 descriptionAr: "وصول للقراءة فقط لبيانات المنصة لأغراض التدقيق والامتثال. يمكن عرض المنظمات والإعدادات وسجلات التدقيق وصحة النظام ولكن لا يمكن إجراء أي تغييرات.",
 permissions: [
 "view_organizations",
 "view_global_settings",
 "view_audit_logs",
 "export_audit_logs",
 "view_system_health",
 ],
 color: "green",
 },
];

export default function PlatformRolesPage() {
 const { language, direction, isRTL} = useLanguage();
 const isArabic = language === 'ar';

 const getPermissionName = (permissionId: string) => {
 const permission = ALL_PERMISSIONS.find(p => p.id === permissionId);
 return permission ? (isArabic ? permission.nameAr : permission.nameEn) : permissionId;
 };

 const getRoleColorClasses = (color: string) => {
 const colorMap: Record<string, { bg: string; border: string; text: string }> = {
 red: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700" },
 blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
 green: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700" },
 };
 return colorMap[color] || colorMap.blue;
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
 {isArabic ? 'الأدوار والصلاحيات' : 'Platform Roles & Permissions'}
 </h1>
 <p className="text-sm text-gray-500 mt-1">
 {isArabic 
 ? 'عرض أدوار المنصة وصلاحياتها (مقفلة في المرحلة 0)'
 : 'View platform-level roles and their permissions (locked in Phase 0)'}
 </p>
 </div>
 <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
 <Lock className="w-3 h-3 me-1 inline-block" />
 {isArabic ? 'مقفل' : 'Locked'}
 </Badge>
 </div>
 </div>
 </div>

 {/* Content */}
 <div className="container py-8">
 {/* Info Banner */}
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
 <div className="flex items-start gap-3">
 <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
 <div className="flex-1">
 <h3 className="font-semibold text-blue-900 mb-1">
 {isArabic ? 'الأدوار مقفلة في المرحلة 0' : 'Roles Locked in Phase 0'}
 </h3>
 <p className="text-sm text-blue-700">
 {isArabic
 ? 'لا يمكن تعديل الأدوار أو الصلاحيات في هذه المرحلة لمنع انحراف الأمان. سيتم تمكين إدارة الأدوار المخصصة في المراحل المستقبلية.'
 : 'Roles and permissions cannot be modified in this phase to prevent security drift. Custom role management will be enabled in future phases.'}
 </p>
 </div>
 </div>
 </div>

 {/* Roles Grid */}
 <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
 {PLATFORM_ROLES.map((role) => {
 const colors = getRoleColorClasses(role.color);
 return (
 <Card key={role.id} className="hover:shadow-md transition-shadow">
 <CardHeader>
 <div className="flex items-start justify-between mb-2">
 <div className={`p-2 rounded-lg ${colors.bg}`}>
 <Shield className={`w-5 h-5 ${colors.text}`} />
 </div>
 <Badge variant="outline" className={`${colors.bg} ${colors.text} ${colors.border}`}>
 {role.permissions.length} {isArabic ? 'صلاحية' : 'permissions'}
 </Badge>
 </div>
 <CardTitle className="text-lg">
 {isArabic ? role.nameAr : role.nameEn}
 </CardTitle>
 <CardDescription className="text-sm leading-relaxed">
 {isArabic ? role.descriptionAr : role.descriptionEn}
 </CardDescription>
 </CardHeader>
 <CardContent>
 <div className="space-y-2">
 <h4 className="text-sm font-semibold text-gray-700 mb-3">
 {isArabic ? 'الصلاحيات المسموحة:' : 'Allowed Actions:'}
 </h4>
 <div className="space-y-1.5 max-h-64 overflow-y-auto">
 {role.permissions.map((permissionId) => (
 <div 
 key={permissionId} 
 className="flex items-start gap-2 text-sm text-gray-600"
 >
 <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
 <span>{getPermissionName(permissionId)}</span>
 </div>
 ))}
 </div>
 </div>
 </CardContent>
 </Card>
 );
 })}
 </div>

 {/* Footer Note */}
 <div className="mt-8 text-center text-sm text-gray-500">
 <p>
 {isArabic
 ? 'تم تعريف هذه الأدوار على مستوى النظام ولا يمكن تعديلها من خلال واجهة المستخدم.'
 : 'These roles are system-defined and cannot be modified through the user interface.'}
 </p>
 </div>
 </div>
 </div>
 );
}
