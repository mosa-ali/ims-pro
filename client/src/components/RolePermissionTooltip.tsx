import { Shield, ShieldCheck, Eye } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import {
 Tooltip,
 TooltipContent,
 TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Role Permission Definitions
 * Maps each role to its specific permissions with bilingual labels
 */
const ROLE_PERMISSIONS: Record<string, { en: string; ar: string; permissions: { en: string; ar: string }[] }> = {
 platform_super_admin: {
 en: 'Platform Super Admin',
 ar: 'مسؤول المنصة الأعلى',
 permissions: [
 { en: 'Full system configuration', ar: 'تكوين النظام الكامل' },
 { en: 'Manage all organizations', ar: 'إدارة جميع المنظمات' },
 { en: 'Manage platform admins', ar: 'إدارة مسؤولي المنصة' },
 { en: 'View audit logs', ar: 'عرض سجلات التدقيق' },
 { en: 'Configure retention policies', ar: 'تكوين سياسات الاحتفاظ' },
 { en: 'Restore deleted records', ar: 'استعادة السجلات المحذوفة' },
 { en: 'Permanently delete records', ar: 'حذف السجلات نهائياً' },
 { en: 'Manage system settings', ar: 'إدارة إعدادات النظام' },
 { en: 'Manage authentication providers', ar: 'إدارة مزودي المصادقة' },
 { en: 'Access system health dashboard', ar: 'الوصول إلى لوحة صحة النظام' },
 { en: 'Manage Microsoft 365 integration', ar: 'إدارة تكامل مايكروسوفت 365' },
 { en: 'Override user permissions', ar: 'تجاوز صلاحيات المستخدمين' },
 ],
 },
 platform_admin: {
 en: 'Platform Admin',
 ar: 'مسؤول المنصة',
 permissions: [
 { en: 'View all organizations', ar: 'عرض جميع المنظمات' },
 { en: 'Manage organization lifecycle', ar: 'إدارة دورة حياة المنظمات' },
 { en: 'View platform users', ar: 'عرض مستخدمي المنصة' },
 { en: 'View audit logs', ar: 'عرض سجلات التدقيق' },
 { en: 'Access system health', ar: 'الوصول إلى صحة النظام' },
 { en: 'View deleted records', ar: 'عرض السجلات المحذوفة' },
 { en: 'Restore deleted records', ar: 'استعادة السجلات المحذوفة' },
 ],
 },
 platform_auditor: {
 en: 'Platform Auditor',
 ar: 'مدقق المنصة',
 permissions: [
 { en: 'View all organizations (read-only)', ar: 'عرض جميع المنظمات (قراءة فقط)' },
 { en: 'View audit logs', ar: 'عرض سجلات التدقيق' },
 { en: 'View system health', ar: 'عرض صحة النظام' },
 { en: 'View deleted records', ar: 'عرض السجلات المحذوفة' },
 { en: 'Export audit reports', ar: 'تصدير تقارير التدقيق' },
 ],
 },
 organization_admin: {
 en: 'Organization Admin',
 ar: 'مسؤول المنظمة',
 permissions: [
 { en: 'Manage organization settings', ar: 'إدارة إعدادات المنظمة' },
 { en: 'Manage organization users', ar: 'إدارة مستخدمي المنظمة' },
 { en: 'Manage operating units', ar: 'إدارة الوحدات التشغيلية' },
 { en: 'View organization reports', ar: 'عرض تقارير المنظمة' },
 { en: 'Manage RBAC roles', ar: 'إدارة أدوار RBAC' },
 { en: 'Access all modules', ar: 'الوصول إلى جميع الوحدات' },
 { en: 'Manage deleted records', ar: 'إدارة السجلات المحذوفة' },
 ],
 },
 admin: {
 en: 'Admin',
 ar: 'مسؤول',
 permissions: [
 { en: 'Full administrative access', ar: 'وصول إداري كامل' },
 { en: 'Manage users', ar: 'إدارة المستخدمين' },
 { en: 'Configure settings', ar: 'تكوين الإعدادات' },
 ],
 },
 manager: {
 en: 'Manager',
 ar: 'مدير',
 permissions: [
 { en: 'View team data', ar: 'عرض بيانات الفريق' },
 { en: 'Approve requests', ar: 'الموافقة على الطلبات' },
 { en: 'Generate reports', ar: 'إنشاء التقارير' },
 ],
 },
 user: {
 en: 'User',
 ar: 'مستخدم',
 permissions: [
 { en: 'View assigned data', ar: 'عرض البيانات المعينة' },
 { en: 'Submit requests', ar: 'تقديم الطلبات' },
 ],
 },
};

interface RolePermissionTooltipProps {
 role: string;
 children?: React.ReactNode;
 className?: string;
}

export function RolePermissionTooltip({
 role, children, className = '' }: RolePermissionTooltipProps) {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();

 const roleData = ROLE_PERMISSIONS[role];
 if (!roleData) {
 return <span className={className}>{children || role}</span>;
 }

 const roleName = language === 'ar' ? roleData.ar : roleData.en;
 const permissions = roleData.permissions;

 return (
 <Tooltip>
 <TooltipTrigger asChild>
 <span className={`inline-flex items-center cursor-help ${className}`} tabIndex={0}>
 {children || (
 <span className="flex items-center gap-1.5">
 <ShieldCheck className="w-4 h-4 text-blue-600" />
 <span className="font-medium">{roleName}</span>
 <span className="text-xs text-gray-500">({permissions.length})</span>
 </span>
 )}
 </span>
 </TooltipTrigger>
 <TooltipContent
 side={t.components.right}
 align="start"
 sideOffset={8}
 className="w-80 p-0 overflow-hidden rounded-xl border border-gray-200 shadow-2xl bg-white text-gray-900"
 
 >
 {/* Header */}
 <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
 <div className="flex items-center gap-2">
 <Shield className="w-5 h-5 text-white" />
 <div>
 <h4 className="text-white font-semibold text-sm">{roleName}</h4>
 <p className="text-blue-100 text-xs">
 {language === 'ar'
 ? `${permissions.length} صلاحية`
 : `${permissions.length} permission${permissions.length !== 1 ? 's' : ''}`}
 </p>
 </div>
 </div>
 </div>

 {/* Permissions List */}
 <div className="max-h-64 overflow-y-auto p-3">
 <ul className="space-y-1.5">
 {permissions.map((perm, idx) => (
 <li key={idx} className="flex items-start gap-2 text-sm">
 <Eye className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
 <span className="text-gray-700">{language === 'ar' ? perm.ar : perm.en}</span>
 </li>
 ))}
 </ul>
 </div>

 {/* Footer */}
 <div className="bg-gray-50 px-4 py-2 border-t border-gray-100">
 <p className="text-xs text-gray-500">
 {language === 'ar'
 ? 'مرر فوق الدور لعرض الصلاحيات'
 : 'Hover over role to view permissions'}
 </p>
 </div>
 </TooltipContent>
 </Tooltip>
 );
}

export { ROLE_PERMISSIONS };
export default RolePermissionTooltip;
