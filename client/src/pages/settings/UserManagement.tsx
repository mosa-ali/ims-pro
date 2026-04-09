import { useState, useMemo } from 'react';
import { Users, Search, Edit2, Ban, CheckCircle, Clock, XCircle, Shield, Save, X, UserPlus, Plus, Trash2, ChevronDown, ChevronRight, Lock, AlertTriangle, History, CheckSquare, Square, MinusSquare, Building2, Filter } from 'lucide-react';
import { EditUserPermissionsModal } from './EditUserPermissionsModal';
import { Office365DirectorySearch } from '@/components/Office365DirectorySearch';
import { MicrosoftDirectorySearchField } from '@/components/MicrosoftDirectorySearchField';
import { useLocation } from 'wouter';
import { useLanguage, formatDate } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { useTranslation } from '@/i18n/useTranslation';
import { isUserAdmin } from '@/lib/adminCheck';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { BackButton } from "@/components/BackButton";

type ActionType = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'approve' | 'submit';
const ALL_ACTIONS: ActionType[] = ['view', 'create', 'edit', 'delete', 'export', 'approve', 'submit'];

interface ActionPerms {
 view: boolean;
 create: boolean;
 edit: boolean;
 delete: boolean;
 export?: boolean;
 approve?: boolean;
 submit?: boolean;
}

const NO_ACCESS: ActionPerms = { view: false, create: false, edit: false, delete: false, export: false, approve: false, submit: false };


const ACTION_LABELS: Record<string, { en: string; ar: string }> = {
 view: { en: 'View', ar: 'عرض' },
 create: { en: 'Create', ar: 'إنشاء' },
 edit: { en: 'Edit', ar: 'تعديل' },
 delete: { en: 'Delete', ar: 'حذف' },
 export: { en: 'Export', ar: 'تصدير' },
 approve: { en: 'Approve', ar: 'موافقة' },
 submit: { en: 'Submit', ar: 'إرسال' },
};

const HISTORY_ACTION_LABELS: Record<string, { en: string; ar: string }> = {
 'permission.assign': { en: 'Permissions Assigned', ar: 'تم تعيين الصلاحيات' },
 'permission.update': { en: 'Permissions Updated', ar: 'تم تحديث الصلاحيات' },
 'permission.activate': { en: 'Account Activated', ar: 'تم تفعيل الحساب' },
 'permission.deactivate': { en: 'Account Deactivated', ar: 'تم تعطيل الحساب' },
 'override.create': { en: 'Override Created', ar: 'تم إنشاء تجاوز' },
 'override.deactivate': { en: 'Override Deactivated', ar: 'تم تعطيل تجاوز' },
 'override.delete': { en: 'Override Deleted', ar: 'تم حذف تجاوز' },
 'bulk.role.assign': { en: 'Bulk Role Assignment', ar: 'تعيين دور جماعي' },
 'bulk.override.create': { en: 'Bulk Override Created', ar: 'تم إنشاء تجاوز جماعي' },
 'bulk.override.remove': { en: 'Bulk Override Removed', ar: 'تم إزالة تجاوز جماعي' },
 'user.delete': { en: 'Removed from Organization', ar: 'تمت الإزالة من المنظمة' },
};

// ============================================================================
// PERMISSION HISTORY TIMELINE
// ============================================================================

function PermissionHistoryTimeline({ userId, language, isRTL }: { userId: number; language: string; isRTL: boolean }) {
 const t = useTranslation().t.userMgmt;
 const historyQuery = trpc.settings.users.getPermissionHistory.useQuery({ userId, limit: 50 });
 const history = historyQuery.data || [];

 if (historyQuery.isLoading) {
 return (
 <div className="flex items-center justify-center py-8" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
 </div>
 );
 }

 if (history.length === 0) {
 return (
 <div className="text-center py-8">
 <History className="w-8 h-8 text-gray-300 mx-auto mb-2" />
 <p className="text-sm text-gray-500">{t.noHistory}</p>
 </div>
 );
 }

 return (
 <div className="relative">
 {/* Timeline line */}
 <div className={`absolute top-0 bottom-0 w-0.5 bg-gray-200 ${'start-4'}`} />
 <div className="space-y-4">
 {history.map((entry: any, idx: number) => {
 const label = HISTORY_ACTION_LABELS[entry.action] || { en: entry.action, ar: entry.action };
 const isGrant = entry.action.includes('assign') || entry.action.includes('activate') || entry.action === 'override.create';
 const isRevoke = entry.action.includes('deactivate') || entry.action.includes('delete') || entry.action.includes('remove');
 const color = isGrant ? 'bg-green-500' : isRevoke ? 'bg-red-500' : 'bg-blue-500';

 return (
 <div key={entry.id || idx} className={`relative flex gap-3 ps-2`}>
 {/* Timeline dot */}
 <div className={`relative z-10 w-5 h-5 rounded-full ${color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
 <div className="w-2 h-2 rounded-full bg-white" />
 </div>
 {/* Content */}
 <div className={`flex-1 bg-gray-50 rounded-lg p-3 border border-gray-100 ${isRTL ? 'text-end' : ''}`}>
 <div className={`flex items-center justify-between gap-2`}>
 <span className="text-sm font-medium text-gray-900">{language === 'en' ? label.en : label.ar}</span>
 <span className="text-[10px] text-gray-400 whitespace-nowrap">{formatDate(entry.createdAt)}</span>
 </div>
 {entry.details && <p className="text-xs text-gray-600 mt-1">{entry.details}</p>}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function UserManagement() {
 const { user } = useAuth();
 const { language, isRTL } = useLanguage();
 const t = useTranslation().t;
 const [, setLocation] = useLocation();

 // Get current organization context
 const currentOrgId = useMemo(() => {
 const orgId = localStorage.getItem('pms_current_org');
 return orgId ? parseInt(orgId, 10) : null;
 }, []);

 // State management
 const [showAddUser, setShowAddUser] = useState(false);
 const [userType, setUserType] = useState<'microsoft' | 'local'>('microsoft');
 const [newUser, setNewUser] = useState({ fullName: '', email: '', roleId: '' as string, password: '', confirmPassword: '', selectedOUs: [] as number[] });
 const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
 const [deleteUserName, setDeleteUserName] = useState('');
 const [deletionReason, setDeletionReason] = useState('');
 const [historyUserId, setHistoryUserId] = useState<number | null>(null);
 const [historyUserName, setHistoryUserName] = useState('');

 // Edit user state
 const [showEditModal, setShowEditModal] = useState(false);
 const [editingUser, setEditingUser] = useState<{ id: number; fullName: string; email: string; rbacRoleId: number | null } | null>(null);
 const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
 const [editingPermissions, setEditingPermissions] = useState<Record<string, ActionPerms>>({});
 const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

 // Bulk selection state
 const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
 const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
 const [bulkDeletionReason, setBulkDeletionReason] = useState('');

 // OU filter state
 const [ouFilterId, setOuFilterId] = useState<number | undefined>(undefined);

 // Edit OUs modal state
 const [showEditOUsModal, setShowEditOUsModal] = useState(false);
 const [editOUsUserId, setEditOUsUserId] = useState<number | null>(null);
 const [editOUsUserName, setEditOUsUserName] = useState('');
 const [editOUsSelected, setEditOUsSelected] = useState<number[]>([]);

 if (!isUserAdmin(user)) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="text-center">
 <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
 <p className="text-lg font-semibold text-gray-900">{t.accessDenied}</p>
 <p className="text-sm text-gray-600">{t.adminOnlyAccess}</p>
 </div>
 </div>
 );
 }

 // Queries
 const usersQuery = trpc.settings.users.list.useQuery({ ouFilter: ouFilterId });
 const rolesQuery = trpc.settings.roles.list.useQuery({ limit: 100 });
 const permissionTreeQuery = trpc.settings.roles.getPermissionTree.useQuery();
  const operatingUnitsQuery = trpc.ims.operatingUnits.listByOrganization.useQuery(
    { organizationId: currentOrgId! },
    { enabled: !!currentOrgId }
  );
 const utils = trpc.useUtils();

 // Mutations
 const addUserMutation = trpc.settings.users.add.useMutation({
 onSuccess: () => {
 toast.success(t.userMgmt?.userAddedSuccessfully || 'User added successfully');
 setNewUser({ fullName: '', email: '', roleId: '', password: '', confirmPassword: '', selectedOUs: [] });
 setUserType('microsoft');
 setShowAddUser(false);
 utils.settings.users.list.invalidate();
 },
 onError: (error) => {
 toast.error(error.message || 'Failed to add user');
 },
 });

 const deleteUserMutation = trpc.settings.users.delete.useMutation({
 onSuccess: () => {
 toast.success(t.userMgmt?.userRemovedSuccessfully || 'User removed successfully');
 setDeleteUserId(null);
 setDeleteUserName('');
 setDeletionReason('');
 utils.settings.users.list.invalidate();
 },
 onError: (error) => {
 toast.error(error.message || 'Failed to remove user');
 },
 });

 const bulkDeleteMutation = trpc.settings.users.bulkDelete.useMutation({
 onSuccess: () => {
 toast.success(t.userMgmt?.usersRemovedSuccessfully || 'Users removed successfully');
 setSelectedUserIds(new Set());
 setShowBulkDeleteDialog(false);
 setBulkDeletionReason('');
 utils.settings.users.list.invalidate();
 },
 onError: (error) => {
 toast.error(error.message || 'Failed to remove users');
 },
 });

 const updateUserMutation = trpc.settings.users.updatePermissions.useMutation({
 onSuccess: () => {
 toast.success(t.userMgmt?.userUpdatedSuccessfully || 'User updated successfully');
 setShowEditModal(false);
 setEditingUser(null);
 setEditingRoleId('');
 utils.settings.users.list.invalidate();
 },
 onError: (error) => {
 toast.error(error.message || 'Failed to update user');
 },
 });

 const updateUserOUsMutation = trpc.settings.users.updateUserOUs.useMutation({
 onSuccess: () => {
 toast.success(language === 'en' ? 'Operating units updated successfully' : 'تم تحديث الوحدات التشغيلية بنجاح');
 setShowEditOUsModal(false);
 setEditOUsUserId(null);
 setEditOUsUserName('');
 setEditOUsSelected([]);
 utils.settings.users.list.invalidate();
 },
 onError: (error) => {
 toast.error(error.message || 'Failed to update operating units');
 },
 });

 const users = usersQuery.data || [];
 const roles = rolesQuery.data || [];
 const operatingUnits = operatingUnitsQuery.data || [];

 // Auto-assign OU if only one exists
 const autoAssignedOU = useMemo(() => {
 if (operatingUnits.length === 1 && newUser.selectedOUs.length === 0) {
 return [operatingUnits[0].id];
 }
 return newUser.selectedOUs;
 }, [operatingUnits, newUser.selectedOUs]);

 // Handlers
 const handleSelectAll = (checked: boolean) => {
 if (checked) {
 setSelectedUserIds(new Set(users.map(u => u.id)));
 } else {
 setSelectedUserIds(new Set());
 }
 };

 const handleSelectUser = (userId: number, checked: boolean) => {
 const newSelected = new Set(selectedUserIds);
 if (checked) {
 newSelected.add(userId);
 } else {
 newSelected.delete(userId);
 }
 setSelectedUserIds(newSelected);
 };

 const handleOUToggle = (ouId: number) => {
 const newOUs = newUser.selectedOUs.includes(ouId)
 ? newUser.selectedOUs.filter(id => id !== ouId)
 : [...newUser.selectedOUs, ouId];
 setNewUser(prev => ({ ...prev, selectedOUs: newOUs }));
 };

 return (
 <div className={`min-h-screen bg-gray-50 p-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="max-w-7xl mx-auto">
 {/* Header */}
 <div className="mb-8">
 <div className="flex items-center gap-3 mb-4">
 <BackButton />
 <Users className="w-8 h-8 text-blue-600" />
 <h1 className="text-3xl font-bold text-gray-900">{t.userMgmt?.title || 'User Management'}</h1>
 </div>
 <p className="text-gray-600">{t.userMgmt?.subtitle || 'Manage organization users and permissions'}</p>
 </div>

 {/* Toolbar: Add User + OU Filter */}
 <div className="mb-6 flex flex-wrap items-center gap-3">
 <button
 onClick={() => setShowAddUser(true)}
 className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
 >
 <Plus className="w-4 h-4" />
 {t.addUser}
 </button>
 {/* OU Filter */}
 {operatingUnits.length > 1 && (
 <div className="flex items-center gap-2">
 <Filter className="w-4 h-4 text-gray-500" />
 <select
 value={ouFilterId ?? ''}
 onChange={(e) => setOuFilterId(e.target.value ? Number(e.target.value) : undefined)}
 className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
 >
 <option value="">{language === 'en' ? 'All Operating Units' : 'جميع الوحدات التشغيلية'}</option>
 {operatingUnits.map((ou: any) => (
 <option key={ou.id} value={ou.id}>
 {language === 'en' ? ou.name : (ou.nameAr || ou.name)}
 </option>
 ))}
 </select>
 </div>
 )}
 </div>

 {/* Users Table */}
 <div className="bg-white rounded-lg shadow overflow-hidden">
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className="px-6 py-3 text-left">
 <input
 type="checkbox"
 checked={selectedUserIds.size === users.length && users.length > 0}
 onChange={(e) => handleSelectAll(e.target.checked)}
 className="rounded"
 />
 </th>
 <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">{t.userMgmt?.name || (language === 'en' ? 'Name' : 'الاسم')}</th>
 <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">{t.userMgmt?.email || (language === 'en' ? 'Email' : 'البريد الإلكتروني')}</th>
 <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">{t.userMgmt?.role || (language === 'en' ? 'Role' : 'الدور')}</th>
 <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
 {language === 'en' ? 'Operating Units' : 'الوحدات التشغيلية'}
 </th>
 <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">{language === 'en' ? 'Auth Method' : 'طريقة المصادقة'}</th>
 <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">{t.userMgmt?.actions || (language === 'en' ? 'Actions' : 'الإجراءات')}</th>
 </tr>
 </thead>
 <tbody>
 {users.map((u: any) => (
 <tr key={u.id} className="border-b border-gray-200 hover:bg-gray-50">
 <td className="px-6 py-3">
 <input
 type="checkbox"
 checked={selectedUserIds.has(u.id)}
 onChange={(e) => handleSelectUser(u.id, e.target.checked)}
 className="rounded"
 />
 </td>
 <td className="px-6 py-3 text-sm text-gray-900">{u.fullName}</td>
 <td className="px-6 py-3 text-sm text-gray-600">{u.email}</td>
 <td className="px-6 py-3 text-sm text-gray-600">{u.rbacRoleName || 'No Role Assigned'}</td>
 <td className="px-6 py-3 text-sm">
 {u.operatingUnits && u.operatingUnits.length > 0 ? (
 <div className="flex flex-wrap gap-1">
 {u.operatingUnits.map((ou: any) => (
 <span key={ou.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200">
 <Building2 className="w-3 h-3" />
 {ou.name}
 </span>
 ))}
 </div>
 ) : (
 <span className="text-xs text-gray-400 italic">
 {language === 'en' ? 'No OU assigned' : 'لا توجد وحدة تشغيلية'}
 </span>
 )}
 </td>
 <td className="px-6 py-3 text-sm">
 {u.authenticationProvider === 'microsoft' ? (
 <div className="flex items-center gap-2">
 <div className="w-2 h-2 rounded-full bg-blue-500"></div>
 <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded">Microsoft 365</span>
 </div>
 ) : u.authenticationProvider === 'local' ? (
 <div className="flex items-center gap-2">
 <div className="w-2 h-2 rounded-full bg-green-500"></div>
 <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded">Local User</span>
 </div>
 ) : (
 <span className="text-xs text-gray-500">Unknown</span>
 )}
 </td>
 <td className="px-6 py-3 text-sm">
 <div className="flex items-center gap-2">
 <button
 onClick={() => {
 setEditingUser({ id: u.id, fullName: u.fullName, email: u.email, rbacRoleId: u.rbacRoleId || null });
 setEditingRoleId(u.rbacRoleId || null);
 // Initialize permissions from user's current permissions or role template
 const userPerms = u.rbacRoleId ? (roles.find(r => r.id === u.rbacRoleId)?.permissions || {}) : {};
 setEditingPermissions(typeof userPerms === 'string' ? JSON.parse(userPerms) : userPerms);
 setExpandedModules(new Set());
 // Pre-populate OU selection with user's current OUs
 setEditOUsSelected((u.operatingUnits || []).map((ou: any) => ou.id));
 setEditOUsUserId(u.id);
 setShowEditModal(true);
 }}
 className="text-blue-600 hover:text-blue-700"
 title={language === 'en' ? 'Edit user' : 'تعديل المستخدم'}
 >
 <Edit2 className="w-4 h-4" />
 </button>
 <button
 onClick={() => {
 setEditOUsUserId(u.id);
 setEditOUsUserName(u.fullName);
 setEditOUsSelected((u.operatingUnits || []).map((ou: any) => ou.id));
 setShowEditOUsModal(true);
 }}
 className="text-purple-600 hover:text-purple-700"
 title={language === 'en' ? 'Edit operating units' : 'تعديل الوحدات التشغيلية'}
 >
 <Building2 className="w-4 h-4" />
 </button>
 <button
 onClick={() => {
 setDeleteUserId(u.id);
 setDeleteUserName(u.fullName);
 }}
 className="text-red-600 hover:text-red-700"
 title={language === 'en' ? 'Delete user' : 'حذف المستخدم'}
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* Add User Modal */}
 {showAddUser && (
 <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
 <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
 <div className="p-6 border-b border-gray-200">
 <div className={`flex items-center justify-between`}>
 <div className={`flex items-center gap-3`}>
 <UserPlus className="w-6 h-6 text-blue-600" />
 <h2 className="text-xl font-bold text-gray-900">{t.addUserTitle}</h2>
 </div>
 <button onClick={() => setShowAddUser(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
 </div>
 </div>
 <div className="p-6 space-y-4">
 {/* User Type Toggle */}
 <div className="flex gap-2">
 <button
 onClick={() => setUserType('microsoft')}
 className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
 userType === 'microsoft'
 ? 'bg-blue-600 text-white'
 : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
 }`}
 >
 {language === 'en' ? 'Microsoft 365' : 'مايكروسوفت 365'}
 </button>
 <button
 onClick={() => setUserType('local')}
 className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
 userType === 'local'
 ? 'bg-blue-600 text-white'
 : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
 }`}
 >
 {language === 'en' ? 'Local User' : 'مستخدم محلي'}
 </button>
 </div>

 {/* Microsoft 365 User Fields */}
 {userType === 'microsoft' && (
 <>
 <MicrosoftDirectorySearchField
 value={newUser.fullName}
 email={newUser.email}
 organizationId={currentOrgId || 0}
 onNameChange={(name) => setNewUser(prev => ({ ...prev, fullName: name }))}
 onUserSelect={(user) => {
 setNewUser(prev => ({
 ...prev,
 fullName: user.displayName,
 email: user.email,
 }));
 }}
 isRTL={isRTL}
 placeholder={t.userMgmt?.enterFullName}
 label={t.fullName}
 />
 <div>
 <label className={`text-sm font-medium text-gray-700 mb-1 block ${isRTL ? 'text-end' : ''}`}>{t.emailLabel}</label>
 <input
 type="email"
 value={newUser.email}
 onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
 className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-end' : ''}`}
 placeholder={t.userMgmt?.enterEmailAddress}
 />
 </div>
 </>
 )}

 {/* Local User Fields */}
 {userType === 'local' && (
 <>
 <div>
 <label className={`text-sm font-medium text-gray-700 mb-1 block ${isRTL ? 'text-end' : ''}`}>{t.fullName}</label>
 <input
 type="text"
 value={newUser.fullName}
 onChange={(e) => setNewUser(prev => ({ ...prev, fullName: e.target.value }))}
 className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-end' : ''}`}
 placeholder={language === 'en' ? 'Enter full name' : 'أدخل الاسم الكامل'}
 />
 </div>
 <div>
 <label className={`text-sm font-medium text-gray-700 mb-1 block ${isRTL ? 'text-end' : ''}`}>{t.emailLabel}</label>
 <input
 type="email"
 value={newUser.email}
 onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
 className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-end' : ''}`}
 placeholder={t.userMgmt?.enterEmailAddress}
 />
 </div>
 <div>
 <label className={`text-sm font-medium text-gray-700 mb-1 block ${isRTL ? 'text-end' : ''}`}>{language === 'en' ? 'Password' : 'كلمة المرور'}</label>
 <input
 type="password"
 value={newUser.password}
 onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
 className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-end' : ''}`}
 placeholder={language === 'en' ? 'At least 8 characters' : 'على الأقل 8 أحرف'}
 />
 </div>
 <div>
 <label className={`text-sm font-medium text-gray-700 mb-1 block ${isRTL ? 'text-end' : ''}`}>{language === 'en' ? 'Confirm Password' : 'تأكيد كلمة المرور'}</label>
 <input
 type="password"
 value={newUser.confirmPassword}
 onChange={(e) => setNewUser(prev => ({ ...prev, confirmPassword: e.target.value }))}
 className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-end' : ''}`}
 placeholder={language === 'en' ? 'Confirm password' : 'تأكيد كلمة المرور'}
 />
 </div>
 </>
 )}

 {/* Role Selection */}
 <div>
 <label className={`text-sm font-medium text-gray-700 mb-1 block ${isRTL ? 'text-end' : ''}`}>{t.assignRole}</label>
 <select
 value={newUser.roleId}
 onChange={(e) => setNewUser(prev => ({ ...prev, roleId: e.target.value }))}
 className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-end' : ''}`}
 >
 <option value="">{t.selectRole}</option>
 {roles.map(r => <option key={r.id} value={r.id}>{language === 'en' ? r.name : (r.nameAr || r.name)}</option>)}
 </select>
 </div>

 {/* Operating Units Selection */}
 <div>
 <label className={`text-sm font-medium text-gray-700 mb-2 block ${isRTL ? 'text-end' : ''}`}>
 {language === 'en' ? 'Operating Units' : 'الوحدات التشغيلية'}
 </label>
 {operatingUnitsQuery.isLoading ? (
 <div className="flex items-center justify-center py-4">
 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
 </div>
 ) : operatingUnits.length === 0 ? (
 <div className="text-sm text-gray-500 py-3 px-3 bg-gray-50 rounded-lg">
 {language === 'en' ? 'No operating units available' : 'لا توجد وحدات تشغيلية متاحة'}
 </div>
 ) : operatingUnits.length === 1 ? (
 <div className="text-sm text-gray-600 py-3 px-3 bg-blue-50 rounded-lg border border-blue-200">
 <div className="flex items-center gap-2">
 <CheckCircle className="w-4 h-4 text-green-600" />
 <span>
 {language === 'en' 
 ? `Auto-assigned to: ${operatingUnits[0].name}` 
 : `تم التعيين التلقائي إلى: ${operatingUnits[0].nameAr || operatingUnits[0].name}`}
 </span>
 </div>
 </div>
 ) : (
 <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
 {operatingUnits.map((ou: any) => (
 <label key={ou.id} className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded transition-colors">
 <input
 type="checkbox"
 checked={autoAssignedOU.includes(ou.id)}
 onChange={() => handleOUToggle(ou.id)}
 className="rounded"
 />
 <span className="text-sm text-gray-700">
 {language === 'en' ? ou.name : (ou.nameAr || ou.name)}
 </span>
 </label>
 ))}
 </div>
 )}
 {operatingUnits.length > 1 && autoAssignedOU.length === 0 && (
 <p className="text-xs text-red-600 mt-1">
 {language === 'en' ? 'Please select at least one operating unit' : 'يرجى تحديد وحدة تشغيلية واحدة على الأقل'}
 </p>
 )}
 </div>
 </div>

 {/* Modal Footer */}
 <div className={`p-6 border-t border-gray-200 flex gap-3 justify-end`}>
 <button
 onClick={() => setShowAddUser(false)}
 className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
 >
 {t.cancel}
 </button>
 <button
 onClick={() => {
 if (!newUser.fullName || !newUser.email) {
 toast.error(t.userMgmt?.nameAndEmailAreRequired || 'Name and email are required');
 return;
 }
 if (userType === 'local') {
 if (!newUser.password || !newUser.confirmPassword) {
 toast.error(language === 'en' ? 'Password is required for local users' : 'كلمة المرور مطلوبة للمستخدمين المحليين');
 return;
 }
 if (newUser.password !== newUser.confirmPassword) {
 toast.error(language === 'en' ? 'Passwords do not match' : 'كلمات المرور غير متطابقة');
 return;
 }
 if (newUser.password.length < 8) {
 toast.error(language === 'en' ? 'Password must be at least 8 characters' : 'يجب أن تكون كلمة المرور 8 أحرف على الأقل');
 return;
 }
 }
 // Validate OUs are selected
 if (autoAssignedOU.length === 0) {
 toast.error(language === 'en' ? 'Please select at least one operating unit' : 'يرجى تحديد وحدة تشغيلية واحدة على الأقل');
 return;
 }
 addUserMutation.mutate({
 fullName: newUser.fullName,
 email: newUser.email,
 roleId: newUser.roleId ? Number(newUser.roleId) : undefined,
 userType: userType,
 password: userType === 'local' ? newUser.password : undefined,
 confirmPassword: userType === 'local' ? newUser.confirmPassword : undefined,
 operatingUnitIds: autoAssignedOU,
 });
 }}
 disabled={addUserMutation.isPending}
 className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
 >
 <UserPlus className="w-4 h-4" />
 {addUserMutation.isPending ? t.adding : t.addUser}
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Delete Confirmation Dialog */}
 {deleteUserId !== null && (
 <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
 <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
 <div className="p-6 border-b border-gray-200">
 <div className="flex items-center gap-3">
 <AlertTriangle className="w-6 h-6 text-red-600" />
 <h2 className="text-xl font-bold text-gray-900">{t.confirmDelete}</h2>
 </div>
 </div>
 <div className="p-6 space-y-4">
 <p className="text-gray-600">{t.userMgmt?.confirmRemoveUser || `Are you sure you want to remove ${deleteUserName}?`}</p>
 <textarea
 value={deletionReason}
 onChange={(e) => setDeletionReason(e.target.value)}
 placeholder={t.userMgmt?.deletionReason || 'Reason for removal (optional)'}
 className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
 rows={3}
 />
 </div>
 <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
 <button
 onClick={() => {
 setDeleteUserId(null);
 setDeleteUserName('');
 setDeletionReason('');
 }}
 className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
 >
 {t.cancel}
 </button>
 <button
 onClick={() => {
 deleteUserMutation.mutate({
 userId: deleteUserId,
 reason: deletionReason,
 });
 }}
 disabled={deleteUserMutation.isPending}
 className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
 >
 <Trash2 className="w-4 h-4" />
 {deleteUserMutation.isPending ? t.removing : t.remove}
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Bulk Delete Dialog */}
 {showBulkDeleteDialog && (
 <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
 <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
 <div className="p-6 border-b border-gray-200">
 <div className="flex items-center gap-3">
 <AlertTriangle className="w-6 h-6 text-red-600" />
 <h2 className="text-xl font-bold text-gray-900">{t.confirmDelete}</h2>
 </div>
 </div>
 <div className="p-6 space-y-4">
 <p className="text-gray-600">{t.userMgmt?.confirmRemoveUsers || `Remove ${selectedUserIds.size} selected users?`}</p>
 <textarea
 value={bulkDeletionReason}
 onChange={(e) => setBulkDeletionReason(e.target.value)}
 placeholder={t.userMgmt?.deletionReason || 'Reason for removal (optional)'}
 className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
 rows={3}
 />
 </div>
 <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
 <button
 onClick={() => {
 setShowBulkDeleteDialog(false);
 setBulkDeletionReason('');
 }}
 className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
 >
 {t.cancel}
 </button>
 <button
 onClick={() => {
 bulkDeleteMutation.mutate({
 userIds: Array.from(selectedUserIds),
 reason: bulkDeletionReason,
 });
 }}
 disabled={bulkDeleteMutation.isPending}
 className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
 >
 <Trash2 className="w-4 h-4" />
 {bulkDeleteMutation.isPending ? t.removing : t.remove}
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Edit User Modal */}
 <EditUserPermissionsModal
 isOpen={showEditModal}
 user={editingUser}
 roles={roles}
 permissionTree={permissionTreeQuery.data?.tree || []}
 permissions={editingPermissions}
 roleId={editingRoleId}
 language={language}
 isRTL={isRTL}
 isPending={updateUserMutation.isPending || updateUserOUsMutation.isPending}
 onClose={() => {
 setShowEditModal(false);
 setEditingUser(null);
 setEditingRoleId(null);
 setEditingPermissions({});
 setEditOUsSelected([]);
 setEditOUsUserId(null);
 }}
 onPermissionsChange={setEditingPermissions}
 onRoleChange={setEditingRoleId}
 operatingUnits={operatingUnits}
 selectedOUIds={editOUsSelected}
 onOUChange={setEditOUsSelected}
 onSave={() => {
 if (Object.keys(editingPermissions).length === 0) {
 toast.error(t.userMgmt?.permissionsRequired || 'Please assign at least one module permission');
 return;
 }
 // Save permissions
 updateUserMutation.mutate({
 userId: editingUser!.id,
 roleId: editingRoleId,
 permissions: editingPermissions,
 screenPermissions: {},
 });
 // Save OU assignments in parallel
 if (editOUsUserId !== null) {
 updateUserOUsMutation.mutate({
 userId: editOUsUserId,
 operatingUnitIds: editOUsSelected,
 });
 }
 }}
 t={t}
 />

 {/* Edit Operating Units Modal */}
 {showEditOUsModal && (
 <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
 <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
 <div className="p-6 border-b border-gray-200">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <Building2 className="w-6 h-6 text-purple-600" />
 <div>
 <h2 className="text-xl font-bold text-gray-900">
 {language === 'en' ? 'Edit Operating Units' : 'تعديل الوحدات التشغيلية'}
 </h2>
 <p className="text-sm text-gray-500 mt-0.5">{editOUsUserName}</p>
 </div>
 </div>
 <button
 onClick={() => {
 setShowEditOUsModal(false);
 setEditOUsUserId(null);
 setEditOUsUserName('');
 setEditOUsSelected([]);
 }}
 className="p-2 hover:bg-gray-100 rounded-lg"
 >
 <X className="w-5 h-5" />
 </button>
 </div>
 </div>
 <div className="p-6">
 {operatingUnits.length === 0 ? (
 <div className="text-sm text-gray-500 py-4 text-center">
 {language === 'en' ? 'No operating units available' : 'لا توجد وحدات تشغيلية متاحة'}
 </div>
 ) : (
 <>
 <p className="text-sm text-gray-600 mb-4">
 {language === 'en'
 ? 'Select the operating units this user should have access to:'
 : 'حدد الوحدات التشغيلية التي يجب أن يصل إليها هذا المستخدم:'}
 </p>
 <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
 {operatingUnits.map((ou: any) => (
 <label
 key={ou.id}
 className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded-lg transition-colors"
 >
 <input
 type="checkbox"
 checked={editOUsSelected.includes(ou.id)}
 onChange={() => {
 setEditOUsSelected(prev =>
 prev.includes(ou.id)
 ? prev.filter(id => id !== ou.id)
 : [...prev, ou.id]
 );
 }}
 className="w-4 h-4 rounded accent-purple-600"
 />
 <div className="flex items-center gap-2">
 <Building2 className="w-4 h-4 text-gray-400" />
 <span className="text-sm font-medium text-gray-800">
 {language === 'en' ? ou.name : (ou.nameAr || ou.name)}
 </span>
 {ou.type && (
 <span className="text-xs text-gray-400 capitalize">({ou.type})</span>
 )}
 </div>
 </label>
 ))}
 </div>
 {editOUsSelected.length === 0 && (
 <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
 <AlertTriangle className="w-3 h-3" />
 {language === 'en'
 ? 'Warning: User will have no operating unit access'
 : 'تحذير: لن يكون للمستخدم صلاحية الوصول إلى أي وحدة تشغيلية'}
 </p>
 )}
 </>
 )}
 </div>
 <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
 <button
 onClick={() => {
 setShowEditOUsModal(false);
 setEditOUsUserId(null);
 setEditOUsUserName('');
 setEditOUsSelected([]);
 }}
 className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
 >
 {t.cancel}
 </button>
 <button
 onClick={() => {
 if (editOUsUserId !== null) {
 updateUserOUsMutation.mutate({
 userId: editOUsUserId,
 operatingUnitIds: editOUsSelected,
 });
 }
 }}
 disabled={updateUserOUsMutation.isPending}
 className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
 >
 <Save className="w-4 h-4" />
 {updateUserOUsMutation.isPending
 ? (language === 'en' ? 'Saving...' : 'جاري الحفظ...')
 : (language === 'en' ? 'Save Changes' : 'حفظ التغييرات')}
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 </div>
 );
}
