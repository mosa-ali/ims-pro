import { useState, useCallback, useMemo } from 'react';
import { Shield, Plus, Save, Edit2, Trash2, Lock, X, ChevronDown, ChevronRight, AlertTriangle, Eye, FileText, CheckCircle2, History, UserCog, GitCompare, Clock, Ban, Check, Zap, Users, Download, Filter, ClipboardList, Search, Copy } from 'lucide-react';
import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { isUserAdmin } from '@/lib/adminCheck';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

type ActionType = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'approve' | 'submit';
const ALL_ACTIONS: ActionType[] = ['view', 'create', 'edit', 'delete', 'export', 'approve', 'submit'];
const BASIC_ACTIONS: ActionType[] = ['view', 'create', 'edit', 'delete'];

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


// ============================================================================
// USER OVERRIDES PANEL
// ============================================================================

function UserOverridesPanel({ userId, language, isRTL }: { userId: number; language: string; isRTL: boolean }) {
 const t = useTranslation().t.rolesPermissions;
 const [showAddForm, setShowAddForm] = useState(false);
 const [moduleId, setModuleId] = useState('');
 const [screenId, setScreenId] = useState('');
 const [action, setAction] = useState<ActionType>('view');
 const [overrideType, setOverrideType] = useState<'grant' | 'revoke'>('grant');
 const [reason, setReason] = useState('');
 const [expiresAt, setExpiresAt] = useState('');

 const overridesQuery = trpc.settings.users.listOverrides.useQuery({ userId });
 const treeQuery = trpc.settings.roles.getPermissionTree.useQuery();
 const utils = trpc.useUtils();

 const createMut = trpc.settings.users.createOverride.useMutation({
 onSuccess: () => {
 toast.success(t.overrideCreated);
 utils.settings.users.listOverrides.invalidate({ userId });
 setShowAddForm(false);
 setModuleId(''); setScreenId(''); setAction('view'); setOverrideType('grant'); setReason(''); setExpiresAt('');
 },
 onError: (e: any) => toast.error(e.message),
 });

 const deactivateMut = trpc.settings.users.deactivateOverride.useMutation({
 onSuccess: () => {
 toast.success(t.overrideDeactivated);
 utils.settings.users.listOverrides.invalidate({ userId });
 },
 onError: (e: any) => toast.error(e.message),
 });

 const deleteMut = trpc.settings.users.deleteOverride.useMutation({
 onSuccess: () => {
 toast.success(t.overrideDeleted);
 utils.settings.users.listOverrides.invalidate({ userId });
 },
 onError: (e: any) => toast.error(e.message),
 });

 const permTree = treeQuery.data?.tree || [];
 const overrides = overridesQuery.data || [];
 const selectedModule = permTree.find((m: any) => m.id === moduleId);
 const screens = selectedModule?.screens || [];

 const handleCreate = () => {
 if (!moduleId || !action) return;
 createMut.mutate({
 userId,
 moduleId,
 screenId: screenId || null,
 action,
 overrideType,
 reason: reason || undefined,
 expiresAt: expiresAt || null,
 });
 };

 return (
 <div className="space-y-4">
 <div className={`flex items-center justify-between`}>
 <div>
 <h3 className={`text-sm font-semibold text-gray-900 ${isRTL ? 'text-end' : ''}`}>{t.overrides}</h3>
 <p className={`text-xs text-gray-500 ${isRTL ? 'text-end' : ''}`}>{t.overridesDesc}</p>
 </div>
 <button
 onClick={() => setShowAddForm(!showAddForm)}
 className="px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 flex items-center gap-1.5"
 >
 <Plus className="w-3.5 h-3.5" />{t.addOverride}
 </button>
 </div>

 {/* Add Override Form */}
 {showAddForm && (
 <div className={`p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3 ${isRTL ? 'text-end' : ''}`}>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="text-xs font-medium text-gray-600 block mb-1">{t.selectModule}</label>
 <select value={moduleId} onChange={(e) => { setModuleId(e.target.value); setScreenId(''); }}
 className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
 <option value="">{t.selectModule}</option>
 {permTree.map((m: any) => (
 <option key={m.id} value={m.id}>{language === 'en' ? m.name : (m.nameAr || m.name)}</option>
 ))}
 </select>
 </div>
 <div>
 <label className="text-xs font-medium text-gray-600 block mb-1">{t.selectScreen}</label>
 <select value={screenId} onChange={(e) => setScreenId(e.target.value)}
 className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" disabled={!moduleId}>
 <option value="">{t.moduleLevelPlaceholder}</option>
 {screens.map((s: any) => (
 <option key={s.id} value={s.id}>{language === 'en' ? s.name : (s.nameAr || s.name)}</option>
 ))}
 </select>
 </div>
 </div>
 <div className="grid grid-cols-3 gap-3">
 <div>
 <label className="text-xs font-medium text-gray-600 block mb-1">{t.selectAction}</label>
 <select value={action} onChange={(e) => setAction(e.target.value as ActionType)}
 className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
 {ALL_ACTIONS.map(a => (
 <option key={a} value={a}>{(t as any)[a]}</option>
 ))}
 </select>
 </div>
 <div>
 <label className="text-xs font-medium text-gray-600 block mb-1">{t.overrideType}</label>
 <div className="flex gap-2">
 <button
 onClick={() => setOverrideType('grant')}
 className={`flex-1 px-3 py-2 text-sm rounded-lg border flex items-center justify-center gap-1.5 ${overrideType === 'grant' ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white border-gray-200 text-gray-500'}`}
 >
 <Check className="w-3.5 h-3.5" />{t.grant}
 </button>
 <button
 onClick={() => setOverrideType('revoke')}
 className={`flex-1 px-3 py-2 text-sm rounded-lg border flex items-center justify-center gap-1.5 ${overrideType === 'revoke' ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-gray-200 text-gray-500'}`}
 >
 <Ban className="w-3.5 h-3.5" />{t.revoke}
 </button>
 </div>
 </div>
 <div>
 <label className="text-xs font-medium text-gray-600 block mb-1">{t.expiresAt}</label>
 <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
 className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
 </div>
 </div>
 <div>
 <label className="text-xs font-medium text-gray-600 block mb-1">{t.reason}</label>
 <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
 className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
 placeholder={t.overrideReasonPlaceholder} />
 </div>
 <div className={`flex gap-2 ${'justify-end'}`}>
 <button onClick={() => setShowAddForm(false)} className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">{t.cancel}</button>
 <button onClick={handleCreate} disabled={!moduleId || createMut.isPending}
 className="px-4 py-1.5 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1.5">
 <Zap className="w-3.5 h-3.5" />{t.addOverride}
 </button>
 </div>
 </div>
 )}

 {/* Overrides List */}
 {overridesQuery.isLoading ? (
 <div className="animate-pulse space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-lg" />)}</div>
 ) : overrides.length === 0 ? (
 <div className="text-center py-8">
 <UserCog className="w-10 h-10 text-gray-300 mx-auto mb-2" />
 <p className="text-sm text-gray-500">{t.noOverrides}</p>
 </div>
 ) : (
 <div className="space-y-2">
 {overrides.map((ov: any) => {
 const modName = permTree.find((m: any) => m.id === ov.moduleId);
 const screenName = modName?.screens?.find((s: any) => s.id === ov.screenId);
 const isExpired = ov.isExpired;
 const isGrant = ov.overrideType === 'grant';

 return (
 <div key={ov.id} className={`p-3 rounded-lg border ${isExpired ? 'bg-gray-50 border-gray-200 opacity-60' : isGrant ? 'bg-green-50/50 border-green-200' : 'bg-red-50/50 border-red-200'} ${isRTL ? 'text-end' : ''}`}>
 <div className={`flex items-center justify-between`}>
 <div className={`flex items-center gap-2`}>
 <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${isGrant ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
 {isGrant ? <Check className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
 {isGrant ? t.grant : t.revoke}
 </span>
 <span className="text-sm font-medium text-gray-900">
 {language === 'en' ? (modName?.name || ov.moduleId) : (modName?.nameAr || modName?.name || ov.moduleId)}
 </span>
 {screenName && (
 <>
 <ChevronRight className="w-3 h-3 text-gray-400" />
 <span className="text-sm text-gray-700">{language === 'en' ? screenName.name : (screenName.nameAr || screenName.name)}</span>
 </>
 )}
 <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{(t as any)[ov.action] || ov.action}</span>
 </div>
 <div className={`flex items-center gap-1.5`}>
 {isExpired ? (
 <span className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" />{t.expired}</span>
 ) : ov.isActive ? (
 <>
 <button onClick={() => deactivateMut.mutate({ overrideId: ov.id })}
 className="text-xs px-2 py-1 text-amber-600 bg-amber-50 rounded hover:bg-amber-100">{t.deactivate}</button>
 <button onClick={() => { if (confirm(t.deleteOverrideConfirm)) deleteMut.mutate({ overrideId: ov.id }); }}
 className="text-xs px-2 py-1 text-red-600 bg-red-50 rounded hover:bg-red-100">{t.deleteOverride}</button>
 </>
 ) : (
 <span className="text-xs text-gray-400">{t.inactive}</span>
 )}
 </div>
 </div>
 <div className={`flex items-center gap-4 mt-1.5 text-xs text-gray-500`}>
 {ov.reason && <span>{t.reason}: {ov.reason}</span>}
 {ov.expiresAt && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(ov.expiresAt).toLocaleDateString(t.settingsModule.enus)}</span>}
 <span>{t.createdBy}: {ov.createdByName}</span>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 );
}

// ============================================================================
// ROLE COMPARISON VIEW
// ============================================================================

function RoleComparisonView({ language, isRTL }: { language: string; isRTL: boolean }) {
 const t = useTranslation().t.rolesPermissions;
 const [roleIdA, setRoleIdA] = useState<number | null>(null);
 const [roleIdB, setRoleIdB] = useState<number | null>(null);
 const [showDiffsOnly, setShowDiffsOnly] = useState(false);

 const rolesQuery = trpc.settings.roles.list.useQuery();
 const roles = rolesQuery.data || [];

 const compareQuery = trpc.settings.users.compareRoles.useQuery(
 { roleIdA: roleIdA!, roleIdB: roleIdB! },
 { enabled: !!roleIdA && !!roleIdB && roleIdA !== roleIdB }
 );

 const comparison = compareQuery.data;

 return (
 <div className="space-y-4">
 {/* Role Selectors */}
 <div className={`grid grid-cols-2 gap-4 ${isRTL ? 'direction-rtl' : ''}`}>
 <div>
 <label className={`text-xs font-medium text-gray-600 block mb-1 ${isRTL ? 'text-end' : ''}`}>{t.selectRoleA}</label>
 <select value={roleIdA || ''} onChange={(e) => setRoleIdA(Number(e.target.value) || null)}
 className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
 <option value="">{t.selectRoleA}</option>
 {roles.map((r: any) => (
 <option key={r.id} value={r.id} disabled={r.id === roleIdB}>{language === 'en' ? r.name : (r.nameAr || r.name)}</option>
 ))}
 </select>
 </div>
 <div>
 <label className={`text-xs font-medium text-gray-600 block mb-1 ${isRTL ? 'text-end' : ''}`}>{t.selectRoleB}</label>
 <select value={roleIdB || ''} onChange={(e) => setRoleIdB(Number(e.target.value) || null)}
 className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
 <option value="">{t.selectRoleB}</option>
 {roles.map((r: any) => (
 <option key={r.id} value={r.id} disabled={r.id === roleIdA}>{language === 'en' ? r.name : (r.nameAr || r.name)}</option>
 ))}
 </select>
 </div>
 </div>

 {!roleIdA || !roleIdB ? (
 <div className="text-center py-12">
 <GitCompare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
 <p className="text-sm text-gray-500">{t.selectTwoRoles}</p>
 </div>
 ) : roleIdA === roleIdB ? (
 <div className="text-center py-12">
 <p className="text-sm text-gray-500">{t.pleaseSelectTwoDifferentRoles}</p>
 </div>
 ) : compareQuery.isLoading ? (
 <div className="animate-pulse space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-12 bg-gray-100 rounded-lg" />)}</div>
 ) : comparison ? (
 <div className="space-y-3">
 {/* Summary Header */}
 <div className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg`}>
 <div className={`flex items-center gap-4`}>
 <div className="text-center">
 <span className="text-xs text-gray-500 block">{t.roleA}</span>
 <span className="text-sm font-semibold text-blue-600">{language === 'en' ? comparison.roleA.name : (comparison.roleA.nameAr || comparison.roleA.name)}</span>
 </div>
 <GitCompare className="w-5 h-5 text-gray-400" />
 <div className="text-center">
 <span className="text-xs text-gray-500 block">{t.roleB}</span>
 <span className="text-sm font-semibold text-orange-600">{language === 'en' ? comparison.roleB.name : (comparison.roleB.nameAr || comparison.roleB.name)}</span>
 </div>
 </div>
 <div className={`flex items-center gap-3`}>
 <span className={`text-sm font-medium ${comparison.totalDifferences > 0 ? 'text-amber-600' : 'text-green-600'}`}>
 {comparison.totalDifferences} {t.totalDiffs}
 </span>
 <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
 <input type="checkbox" checked={showDiffsOnly} onChange={(e) => setShowDiffsOnly(e.target.checked)}
 className="w-3.5 h-3.5 text-purple-600 rounded border-gray-300" />
 {t.showDiffsOnly}
 </label>
 </div>
 </div>

 {comparison.totalDifferences === 0 && (
 <div className="text-center py-8">
 <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
 <p className="text-sm text-gray-500">{t.noDifferences}</p>
 </div>
 )}

 {/* Comparison Table */}
 <div className="border border-gray-200 rounded-lg overflow-hidden">
 <table className="w-full text-sm">
 <thead>
 <tr className="bg-gray-50">
 <th className={`px-4 py-2.5 font-medium text-gray-600 text-start`}>{t.module}</th>
 {ALL_ACTIONS.map(action => (
 <th key={action} className="px-2 py-2.5 font-medium text-gray-600 text-center w-[80px]">
 <div className="flex flex-col items-center gap-0.5">
 <span className="text-[10px]">{(t as any)[action]}</span>
 <div className={`flex items-center gap-1`}>
 <span className="w-2 h-2 rounded-full bg-blue-500" title={t.roleA} />
 <span className="w-2 h-2 rounded-full bg-orange-500" title={t.roleB} />
 </div>
 </div>
 </th>
 ))}
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {comparison.comparison
 .filter((mod: any) => !showDiffsOnly || mod.hasDifferences)
 .map((mod: any) => (
 <tr key={mod.moduleId} className={mod.hasDifferences ? 'bg-amber-50/30' : ''}>
 <td className={`px-4 py-2.5 ${isRTL ? 'text-end' : ''}`}>
 <div className={`flex items-center gap-2`}>
 <span className="font-medium text-gray-900">{language === 'en' ? mod.moduleName : (mod.moduleNameAr || mod.moduleName)}</span>
 {mod.isSensitive && <Lock className="w-3 h-3 text-amber-500" />}
 </div>
 </td>
 {mod.actions.map((a: any) => (
 <td key={a.action} className={`px-2 py-2.5 text-center ${a.isDifferent ? 'bg-amber-100/50' : ''}`}>
 <div className={`flex items-center justify-center gap-1`}>
 <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${a.roleA ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
 {a.roleA ? '✓' : '—'}
 </span>
 <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${a.roleB ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-400'}`}>
 {a.roleB ? '✓' : '—'}
 </span>
 </div>
 </td>
 ))}
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* Legend */}
 <div className={`flex items-center gap-4 text-xs text-gray-500`}>
 <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-100 text-blue-700 flex items-center justify-center text-[8px]">✓</span> {language === 'en' ? comparison.roleA.name : (comparison.roleA.nameAr || comparison.roleA.name)}</span>
 <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-100 text-orange-700 flex items-center justify-center text-[8px]">✓</span> {language === 'en' ? comparison.roleB.name : (comparison.roleB.nameAr || comparison.roleB.name)}</span>
 <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100" /> {t.differences}</span>
 </div>
 </div>
 ) : null}
 </div>
 );
}

// ============================================================================
// BULK OPERATIONS PANEL
// ============================================================================

function BulkOperationsPanel({ language, isRTL }: { language: string; isRTL: boolean }) {
 const t = useTranslation().t.rolesPermissions;
 const [mode, setMode] = useState<'role' | 'override'>('role');
 const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
 const [searchQuery, setSearchQuery] = useState('');
 const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
 const [moduleId, setModuleId] = useState('');
 const [screenId, setScreenId] = useState('');
 const [action, setAction] = useState<ActionType>('view');
 const [overrideType, setOverrideType] = useState<'grant' | 'revoke'>('grant');
 const [reason, setReason] = useState('');
 const [expiresAt, setExpiresAt] = useState('');

 const usersQuery = trpc.settings.users.list.useQuery({ search: '' });
 const rolesQuery = trpc.settings.roles.list.useQuery();
 const treeQuery = trpc.settings.roles.getPermissionTree.useQuery();
 const utils = trpc.useUtils();

 const bulkAssignMut = trpc.settings.users.bulkAssignRole.useMutation({
 onSuccess: (data: any) => {
 toast.success(`${t.bulkSuccess}: ${data.successCount} ${t.usersProcessed}${data.errorCount > 0 ? ` (${data.errorCount} ${t.errors})` : ''}`);
 utils.settings.users.list.invalidate();
 setSelectedUserIds(new Set());
 },
 onError: (e: any) => toast.error(e.message),
 });

 const bulkOverrideMut = trpc.settings.users.bulkCreateOverride.useMutation({
 onSuccess: (data: any) => {
 toast.success(`${t.bulkSuccess}: ${data.successCount} ${t.usersProcessed}${data.errorCount > 0 ? ` (${data.errorCount} ${t.errors})` : ''}`);
 utils.settings.users.list.invalidate();
 setSelectedUserIds(new Set());
 },
 onError: (e: any) => toast.error(e.message),
 });

 const usersList = useMemo(() => {
 const raw = (usersQuery.data as any)?.users || usersQuery.data || [];
 if (!searchQuery) return raw;
 const q = searchQuery.toLowerCase();
 return raw.filter((u: any) => (u.fullName || u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
 }, [usersQuery.data, searchQuery]);

 const roles = rolesQuery.data || [];
 const permTree = treeQuery.data?.tree || [];
 const selectedModule = permTree.find((m: any) => m.id === moduleId);

 const toggleUser = (userId: number) => {
 setSelectedUserIds(prev => {
 const next = new Set(prev);
 if (next.has(userId)) next.delete(userId); else next.add(userId);
 return next;
 });
 };

 const selectAllFiltered = () => {
 const ids = new Set(selectedUserIds);
 usersList.forEach((u: any) => ids.add(u.id));
 setSelectedUserIds(ids);
 };

 const deselectAll = () => setSelectedUserIds(new Set());

 const handleBulkAssign = () => {
 if (selectedUserIds.size === 0 || !selectedRoleId) return;
 bulkAssignMut.mutate({ userIds: Array.from(selectedUserIds), roleId: selectedRoleId });
 };

 const handleBulkOverride = () => {
 if (selectedUserIds.size === 0 || !moduleId || !action) return;
 bulkOverrideMut.mutate({
 userIds: Array.from(selectedUserIds),
 moduleId, screenId: screenId || null, action, overrideType,
 reason: reason || undefined, expiresAt: expiresAt || null,
 });
 };

 const isPending = bulkAssignMut.isPending || bulkOverrideMut.isPending;

 return (
 <div className="space-y-4">
 {/* Mode Selector */}
 <div className={`flex gap-2`}>
 <button onClick={() => setMode('role')}
 className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-all ${mode === 'role' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 bg-white text-gray-600 hover:border-purple-300'}`}>
 <Users className="w-4 h-4 mx-auto mb-1" />
 <div>{t.bulkAssignRole}</div>
 <div className="text-[10px] font-normal text-gray-500 mt-0.5">{t.bulkAssignDesc}</div>
 </button>
 <button onClick={() => setMode('override')}
 className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-all ${mode === 'override' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 bg-white text-gray-600 hover:border-purple-300'}`}>
 <Zap className="w-4 h-4 mx-auto mb-1" />
 <div>{t.bulkOverride}</div>
 <div className="text-[10px] font-normal text-gray-500 mt-0.5">{t.bulkOverrideDesc}</div>
 </button>
 </div>

 {/* User Selection */}
 <div className="border border-gray-200 rounded-lg overflow-hidden">
 <div className={`p-3 bg-gray-50 border-b border-gray-200 flex items-center gap-3`}>
 <div className="relative flex-1">
 <Search className={`w-4 h-4 text-gray-400 absolute top-1/2 -translate-y-1/2 ${'start-3'}`} />
 <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
 placeholder={t.searchUsers}
 className={`w-full border border-gray-200 rounded-lg py-1.5 text-sm bg-white ps-9 pe-3`} />
 </div>
 <span className="text-xs text-purple-600 font-medium whitespace-nowrap">
 {selectedUserIds.size} {t.selectedCount}
 </span>
 <button onClick={selectAllFiltered} className="text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap">{t.selectAll}</button>
 <button onClick={deselectAll} className="text-xs text-gray-500 hover:text-gray-700 whitespace-nowrap">{t.deselectAll}</button>
 </div>
 <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
 {usersQuery.isLoading ? (
 <div className="p-4 text-center text-sm text-gray-400">{t.processing}</div>
 ) : usersList.length === 0 ? (
 <div className="p-4 text-center text-sm text-gray-400">{t.noUsersFound}</div>
 ) : (
 usersList.map((u: any) => (
 <label key={u.id} className={`flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer`}>
 <input type="checkbox" checked={selectedUserIds.has(u.id)} onChange={() => toggleUser(u.id)}
 className="w-4 h-4 text-purple-600 rounded border-gray-300" />
 <div className="flex-1 min-w-0">
 <span className="text-sm text-gray-900 block truncate">{u.fullName || u.name || 'Unknown'}</span>
 <span className="text-xs text-gray-500 block truncate">{u.email}</span>
 </div>
 {u.rbacRoleName && (
 <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded flex-shrink-0">{u.rbacRoleName}</span>
 )}
 </label>
 ))
 )}
 </div>
 </div>

 {/* Action Configuration */}
 {mode === 'role' ? (
 <div className="space-y-3">
 <div>
 <label className={`text-xs font-medium text-gray-600 block mb-1 ${isRTL ? 'text-end' : ''}`}>{t.assignRole}</label>
 <select value={selectedRoleId || ''} onChange={(e) => setSelectedRoleId(Number(e.target.value) || null)}
 className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
 <option value="">{t.selectRole}</option>
 {roles.map((r: any) => (
 <option key={r.id} value={r.id}>{language === 'en' ? r.name : (r.nameAr || r.name)}</option>
 ))}
 </select>
 </div>
 <button onClick={handleBulkAssign} disabled={isPending || selectedUserIds.size === 0 || !selectedRoleId}
 className="w-full px-4 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2">
 {isPending ? <>{t.processing}</> : <><Users className="w-4 h-4" />{t.bulkAssignRole} ({selectedUserIds.size} {t.selectedCount})</>}
 </button>
 </div>
 ) : (
 <div className="space-y-3">
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className={`text-xs font-medium text-gray-600 block mb-1 ${isRTL ? 'text-end' : ''}`}>{t.selectModule}</label>
 <select value={moduleId} onChange={(e) => { setModuleId(e.target.value); setScreenId(''); }}
 className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
 <option value="">{t.selectModule}</option>
 {permTree.map((m: any) => (
 <option key={m.id} value={m.id}>{language === 'en' ? m.name : (m.nameAr || m.name)}{m.isSensitive ? ' \ud83d\udd12' : ''}</option>
 ))}
 </select>
 </div>
 <div>
 <label className={`text-xs font-medium text-gray-600 block mb-1 ${isRTL ? 'text-end' : ''}`}>{t.selectScreen}</label>
 <select value={screenId} onChange={(e) => setScreenId(e.target.value)}
 className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" disabled={!moduleId}>
 <option value="">{t.selectScreen}</option>
 {(selectedModule?.screens || []).map((s: any) => (
 <option key={s.id} value={s.id}>{language === 'en' ? s.name : (s.nameAr || s.name)}{s.isSensitive ? ' \ud83d\udd12' : ''}</option>
 ))}
 </select>
 </div>
 </div>
 <div className="grid grid-cols-3 gap-3">
 <div>
 <label className={`text-xs font-medium text-gray-600 block mb-1 ${isRTL ? 'text-end' : ''}`}>{t.selectAction}</label>
 <select value={action} onChange={(e) => setAction(e.target.value as ActionType)}
 className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
 {ALL_ACTIONS.map(a => <option key={a} value={a}>{(t as any)[a] || a}</option>)}
 </select>
 </div>
 <div>
 <label className={`text-xs font-medium text-gray-600 block mb-1 ${isRTL ? 'text-end' : ''}`}>{t.overrideType}</label>
 <select value={overrideType} onChange={(e) => setOverrideType(e.target.value as 'grant' | 'revoke')}
 className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
 <option value="grant">{t.grant}</option>
 <option value="revoke">{t.revoke}</option>
 </select>
 </div>
 <div>
 <label className={`text-xs font-medium text-gray-600 block mb-1 ${isRTL ? 'text-end' : ''}`}>{t.expiresAt}</label>
 <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
 className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" />
 </div>
 </div>
 <div>
 <label className={`text-xs font-medium text-gray-600 block mb-1 ${isRTL ? 'text-end' : ''}`}>{t.reason}</label>
 <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
 placeholder={t.optionalReasonForThisOverride}
 className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" />
 </div>
 <button onClick={handleBulkOverride} disabled={isPending || selectedUserIds.size === 0 || !moduleId}
 className="w-full px-4 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2">
 {isPending ? <>{t.processing}</> : <><Zap className="w-4 h-4" />{t.applyOverride} ({selectedUserIds.size} {t.selectedCount})</>}
 </button>
 </div>
 )}
 </div>
 );
}

// ============================================================================
// AUDIT REPORT PANEL
// ============================================================================

function AuditReportPanel({ language, isRTL }: { language: string; isRTL: boolean }) {
 const t = useTranslation().t.rolesPermissions;
 const [moduleFilter, setModuleFilter] = useState('');
 const [screenFilter, setScreenFilter] = useState('');
 const [sensitiveOnly, setSensitiveOnly] = useState(false);
 const [userFilter, setUserFilter] = useState('');

 const treeQuery = trpc.settings.roles.getPermissionTree.useQuery();
 const permTree = treeQuery.data?.tree || [];
 const selectedModule = permTree.find((m: any) => m.id === moduleFilter);

 const reportQuery = trpc.settings.users.auditReport.useQuery({
 moduleFilter: moduleFilter || undefined,
 screenFilter: screenFilter || undefined,
 sensitiveOnly: sensitiveOnly || undefined,
 userFilter: userFilter || undefined,
 });

 const exportQuery = trpc.settings.users.exportAuditCSV.useQuery({
 moduleFilter: moduleFilter || undefined,
 screenFilter: screenFilter || undefined,
 sensitiveOnly: sensitiveOnly || undefined,
 }, { enabled: false });

 const handleExport = async () => {
 const result = await exportQuery.refetch();
 if (result.data) {
 const blob = new Blob([result.data.csv], { type: 'text/csv;charset=utf-8;' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = result.data.filename;
 a.click();
 URL.revokeObjectURL(url);
 toast.success(t.csvExportedSuccessfully);
 }
 };

 const report = reportQuery.data;
 const entries = report?.entries || [];

 // Group entries by user for a cleaner view
 const groupedByUser = useMemo(() => {
 const map = new Map<number, { user: any; entries: any[] }>();
 for (const entry of entries) {
 if (!map.has(entry.userId)) {
 map.set(entry.userId, {
 user: { id: entry.userId, name: entry.userName, email: entry.userEmail, role: entry.userRole, rbacRoleName: entry.rbacRoleName },
 entries: [],
 });
 }
 map.get(entry.userId)!.entries.push(entry);
 }
 return Array.from(map.values());
 }, [entries]);

 return (
 <div className="space-y-4">
 {/* Filters */}
 <div className={`flex items-center gap-3 flex-wrap`}>
 <div className="relative flex-1 min-w-[150px]">
 <Search className={`w-4 h-4 text-gray-400 absolute top-1/2 -translate-y-1/2 ${'start-3'}`} />
 <input type="text" value={userFilter} onChange={(e) => setUserFilter(e.target.value)}
 placeholder={t.searchByUser}
 className={`w-full border border-gray-200 rounded-lg py-1.5 text-sm bg-white ps-9 pe-3`} />
 </div>
 <select value={moduleFilter} onChange={(e) => { setModuleFilter(e.target.value); setScreenFilter(''); }}
 className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white">
 <option value="">{t.allModules}</option>
 {permTree.map((m: any) => (
 <option key={m.id} value={m.id}>{language === 'en' ? m.name : (m.nameAr || m.name)}</option>
 ))}
 </select>
 <select value={screenFilter} onChange={(e) => setScreenFilter(e.target.value)}
 className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white" disabled={!moduleFilter}>
 <option value="">{t.allScreens}</option>
 {(selectedModule?.screens || []).map((s: any) => (
 <option key={s.id} value={s.id}>{language === 'en' ? s.name : (s.nameAr || s.name)}</option>
 ))}
 </select>
 <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer whitespace-nowrap">
 <input type="checkbox" checked={sensitiveOnly} onChange={(e) => setSensitiveOnly(e.target.checked)}
 className="w-3.5 h-3.5 text-purple-600 rounded border-gray-300" />
 {t.sensitiveOnlyFilter}
 </label>
 <button onClick={handleExport} disabled={exportQuery.isFetching}
 className="px-3 py-1.5 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1.5">
 <Download className="w-3.5 h-3.5" />{t.exportCSV}
 </button>
 </div>

 {/* Summary Cards */}
 {report && (
 <div className={`grid grid-cols-4 gap-3 ${isRTL ? 'direction-rtl' : ''}`}>
 <div className="p-3 bg-blue-50 rounded-lg text-center">
 <div className="text-2xl font-bold text-blue-700">{report.summary.totalUsers}</div>
 <div className="text-[10px] text-blue-600 mt-0.5">{t.totalUsersLabel}</div>
 </div>
 <div className="p-3 bg-amber-50 rounded-lg text-center">
 <div className="text-2xl font-bold text-amber-700">{report.summary.usersWithSensitiveAccess}</div>
 <div className="text-[10px] text-amber-600 mt-0.5">{t.sensitiveAccessLabel}</div>
 </div>
 <div className="p-3 bg-purple-50 rounded-lg text-center">
 <div className="text-2xl font-bold text-purple-700">{report.summary.activeOverrides}</div>
 <div className="text-[10px] text-purple-600 mt-0.5">{t.activeOverridesLabel}</div>
 </div>
 <div className="p-3 bg-red-50 rounded-lg text-center">
 <div className="text-2xl font-bold text-red-700">{report.summary.sensitiveWorkspaces}</div>
 <div className="text-[10px] text-red-600 mt-0.5">{t.sensitiveWorkspacesLabel}</div>
 </div>
 </div>
 )}

 {/* Report Header */}
 {report && (
 <div className={`text-xs text-gray-500 flex items-center gap-2`}>
 <span>{report.organizationName}</span>
 <span>\u2022</span>
 <span>{t.generated}: {new Date(report.generatedAt).toLocaleString(t.settingsModule.enus)}</span>
 <span>\u2022</span>
 <span>{t.by}: {report.generatedBy}</span>
 <span>\u2022</span>
 <span>{entries.length} {t.entries}</span>
 </div>
 )}

 {/* Report Table */}
 {reportQuery.isLoading ? (
 <div className="animate-pulse space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-gray-100 rounded-lg" />)}</div>
 ) : entries.length === 0 ? (
 <div className="text-center py-12">
 <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
 <p className="text-sm text-gray-500">{t.noReportData}</p>
 </div>
 ) : (
 <div className="border border-gray-200 rounded-lg overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="bg-gray-50 border-b border-gray-200">
 <th className={`px-3 py-2 font-medium text-gray-600 text-start`}>{t.user}</th>
 <th className={`px-3 py-2 font-medium text-gray-600 text-start`}>{t.role}</th>
 <th className={`px-3 py-2 font-medium text-gray-600 text-start`}>{t.module}</th>
 <th className={`px-3 py-2 font-medium text-gray-600 text-start`}>{t.screen}</th>
 <th className={`px-3 py-2 font-medium text-gray-600 text-start`}>{t.accessType}</th>
 <th className={`px-3 py-2 font-medium text-gray-600 text-start`}>{t.actions}</th>
 <th className={`px-3 py-2 font-medium text-gray-600 text-start`}>{t.grantedBy}</th>
 <th className={`px-3 py-2 font-medium text-gray-600 text-start`}>{t.grantedAt}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {entries.slice(0, 200).map((entry: any, idx: number) => (
 <tr key={idx} className={`hover:bg-gray-50 ${entry.isSensitive ? 'bg-amber-50/30' : ''}`}>
 <td className={`px-3 py-2 ${isRTL ? 'text-end' : ''}`}>
 <div className="text-sm text-gray-900">{entry.userName}</div>
 <div className="text-[10px] text-gray-500">{entry.userEmail}</div>
 </td>
 <td className={`px-3 py-2 text-xs ${isRTL ? 'text-end' : ''}`}>
 <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded">{entry.rbacRoleName || '-'}</span>
 </td>
 <td className={`px-3 py-2 text-xs ${isRTL ? 'text-end' : ''}`}>
 <span className="flex items-center gap-1">{entry.moduleName}{entry.isSensitive && <Lock className="w-3 h-3 text-amber-500" />}</span>
 </td>
 <td className={`px-3 py-2 text-xs text-gray-600 ${isRTL ? 'text-end' : ''}`}>{entry.screenName || '-'}</td>
 <td className={`px-3 py-2 text-xs ${isRTL ? 'text-end' : ''}`}>
 <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${ entry.accessType === 'platform_admin' ? 'bg-red-100 text-red-700' : entry.accessType === 'override_grant' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700' }`}>
 {entry.accessType === 'platform_admin' ? t.platformAdmin :
 entry.accessType === 'override_grant' ? t.overrideGrant : t.role}
 </span>
 </td>
 <td className={`px-3 py-2 text-xs text-gray-600 ${isRTL ? 'text-end' : ''}`}>
 {entry.actions.join(', ')}
 </td>
 <td className={`px-3 py-2 text-xs text-gray-600 ${isRTL ? 'text-end' : ''}`}>{entry.grantedBy}</td>
 <td className={`px-3 py-2 text-[10px] text-gray-500 ${isRTL ? 'text-end' : ''}`}>
 {new Date(entry.grantedAt).toLocaleDateString(t.settingsModule.enus)}
 {entry.expiresAt && (
 <div className="text-amber-600 flex items-center gap-0.5 mt-0.5">
 <Clock className="w-2.5 h-2.5" />
 {t.expires}: {new Date(entry.expiresAt).toLocaleDateString(t.settingsModule.enus)}
 </div>
 )}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 {entries.length > 200 && (
 <div className="p-2 bg-gray-50 text-center text-xs text-gray-500">
 {`Showing 200 of ${entries.length} entries. Export CSV for full report.`}
 </div>
 )}
 </div>
 )}
 </div>
 );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RolesPermissions() {
 const [, navigate] = useLocation();
 const { t } = useTranslation();
 const rp = t.rolesPermissions;
 const { user } = useAuth();
 const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
 const [editMode, setEditMode] = useState(false);
 const [localModulePerms, setLocalModulePerms] = useState<Record<string, ActionPerms>>({});
 const [localScreenPerms, setLocalScreenPerms] = useState<Record<string, Record<string, ActionPerms>>>({});
 const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
 const [showCreateModal, setShowCreateModal] = useState(false);
 const [newRoleName, setNewRoleName] = useState('');
 const [newRoleNameAr, setNewRoleNameAr] = useState('');
 const [newRoleDesc, setNewRoleDesc] = useState('');
 const [newRoleDescAr, setNewRoleDescAr] = useState('');
 const [activeTab, setActiveTab] = useState<'permissions' | 'audit' | 'compare' | 'bulk' | 'auditReport'>('permissions');
 const [selectedOverrideUserId, setSelectedOverrideUserId] = useState<number | null>(null);
 const { language, isRTL } = useLanguage();

 if (!isUserAdmin(user)) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="text-center p-8 bg-white rounded-2xl shadow border">
 <h2 className="text-xl font-bold text-gray-900">{t.accessDenied}</h2>
 </div>
 </div>
 );
 }

 const rolesQuery = trpc.settings.roles.list.useQuery();
 const treeQuery = trpc.settings.roles.getPermissionTree.useQuery();
 const auditQuery = trpc.settings.roles.getAuditLog.useQuery(undefined, { enabled: activeTab === 'audit' });
 const usersQuery = trpc.settings.users.list.useQuery({ search: '' }, { enabled: activeTab === 'permissions' });
 const utils = trpc.useUtils();

 const createMutation = trpc.settings.roles.create.useMutation({
 onSuccess: () => {
 toast.success(t.roleCreated);
 utils.settings.roles.list.invalidate();
 setShowCreateModal(false);
 setNewRoleName(''); setNewRoleNameAr(''); setNewRoleDesc(''); setNewRoleDescAr('');
 },
 onError: (e: any) => toast.error(e.message),
 });
 const updateMutation = trpc.settings.roles.update.useMutation({
 onSuccess: () => {
 toast.success(t.roleUpdated);
 utils.settings.roles.list.invalidate();
 utils.settings.roles.getAuditLog.invalidate();
 setEditMode(false);
 },
 onError: (e: any) => toast.error(e.message),
 });
 const deleteMutation = trpc.settings.roles.delete.useMutation({
 onSuccess: () => {
 toast.success(t.roleDeleted);
 utils.settings.roles.list.invalidate();
 utils.settings.roles.getAuditLog.invalidate();
 setSelectedRoleId(null);
 },
 onError: (e: any) => toast.error(e.message),
 });
 const cloneMutation = trpc.settings.roles.clone.useMutation({
 onSuccess: (data: any) => {
 toast.success(rp.cloneSuccess);
 utils.settings.roles.list.invalidate();
 utils.settings.roles.getAuditLog.invalidate();
 if (data?.id) setSelectedRoleId(data.id);
 },
 onError: (e: any) => toast.error(e.message),
 });

 const roles = rolesQuery.data || [];
 const permTree = treeQuery.data?.tree || [];
 const sensitiveWorkspaces = treeQuery.data?.sensitiveWorkspaces || [];
 const selectedRole = roles.find((r: any) => r.id === selectedRoleId);
 const usersList = (usersQuery.data as any)?.users || usersQuery.data || [];

 const selectRole = useCallback((roleId: number) => {
 setSelectedRoleId(roleId);
 setEditMode(false);
 const role = roles.find((r: any) => r.id === roleId);
 if (role) {
 const modPerms: Record<string, ActionPerms> = {};
 permTree.forEach((m: any) => {
 const rp = (role.permissions as any)?.[m.id];
 modPerms[m.id] = rp ? { ...NO_ACCESS, ...rp } : { ...NO_ACCESS };
 });
 setLocalModulePerms(modPerms);
 const screenPerms: Record<string, Record<string, ActionPerms>> = {};
 permTree.forEach((m: any) => {
 screenPerms[m.id] = {};
 (m.screens || []).forEach((s: any) => {
 screenPerms[m.id][s.id] = { ...NO_ACCESS };
 });
 });
 setLocalScreenPerms(screenPerms);
 }
 }, [roles, permTree]);

 const toggleModuleExpand = (moduleId: string) => {
 setExpandedModules(prev => {
 const next = new Set(prev);
 if (next.has(moduleId)) next.delete(moduleId);
 else next.add(moduleId);
 return next;
 });
 };

 const toggleModulePerm = (moduleId: string, action: ActionType) => {
 if (!editMode) return;
 setLocalModulePerms(prev => ({
 ...prev,
 [moduleId]: { ...prev[moduleId], [action]: !prev[moduleId]?.[action] }
 }));
 };

 const toggleScreenPerm = (moduleId: string, screenId: string, action: ActionType) => {
 if (!editMode) return;
 setLocalScreenPerms(prev => ({
 ...prev,
 [moduleId]: {
 ...prev[moduleId],
 [screenId]: { ...(prev[moduleId]?.[screenId] || NO_ACCESS), [action]: !(prev[moduleId]?.[screenId]?.[action]) }
 }
 }));
 };

 const grantAllModule = (moduleId: string) => {
 if (!editMode) return;
 const full: ActionPerms = { view: true, create: true, edit: true, delete: true, export: true, approve: true, submit: true };
 setLocalModulePerms(prev => ({ ...prev, [moduleId]: { ...full } }));
 const mod = permTree.find((m: any) => m.id === moduleId);
 if (mod?.screens) {
 setLocalScreenPerms(prev => {
 const updated = { ...prev, [moduleId]: { ...prev[moduleId] } };
 mod.screens.forEach((s: any) => {
 updated[moduleId][s.id] = { ...full };
 });
 return updated;
 });
 }
 };

 const revokeAllModule = (moduleId: string) => {
 if (!editMode) return;
 setLocalModulePerms(prev => ({ ...prev, [moduleId]: { ...NO_ACCESS } }));
 const mod = permTree.find((m: any) => m.id === moduleId);
 if (mod?.screens) {
 setLocalScreenPerms(prev => {
 const updated = { ...prev, [moduleId]: { ...prev[moduleId] } };
 mod.screens.forEach((s: any) => {
 updated[moduleId][s.id] = { ...NO_ACCESS };
 });
 return updated;
 });
 }
 };

 const saveChanges = () => {
 if (!selectedRoleId) return;
 updateMutation.mutate({
 id: selectedRoleId,
 permissions: localModulePerms,
 screenPermissions: localScreenPerms,
 });
 };

 const handleCreate = () => {
 if (!newRoleName.trim()) return;
 const defaultPerms: Record<string, ActionPerms> = {};
 permTree.forEach((m: any) => { defaultPerms[m.id] = { ...NO_ACCESS }; });
 createMutation.mutate({
 name: newRoleName, nameAr: newRoleNameAr, description: newRoleDesc, descriptionAr: newRoleDescAr,
 permissions: defaultPerms,
 });
 };

 const actionLabel = (action: ActionType) => (t as any)[action] || action;

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className={`flex items-center gap-3`}>
 <BackButton onClick={() => navigate('/organization/settings')} label={rp.back} />
 </div>
 <div className={`flex items-center justify-between`}>
 <div className={`flex items-center gap-3`}>
 <div className="p-3 bg-purple-50 rounded-lg"><Shield className="w-6 h-6 text-purple-600" /></div>
 <div>
 <h1 className={`text-2xl font-bold text-gray-900 ${isRTL ? 'text-end' : ''}`}>{rp.title}</h1>
 <p className={`text-sm text-gray-500 ${isRTL ? 'text-end' : ''}`}>{rp.subtitle}</p>
 </div>
 </div>
 <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 flex items-center gap-2">
 <Plus className="w-4 h-4" />{rp.addRole}
 </button>
 </div>

 {/* Protection Notice */}
 <div className={`flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl ${isRTL ? 'flex-row-reverse text-end' : ''}`}>
 <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
 <p className="text-sm text-amber-800">{rp.protectionNotice}</p>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
 {/* Roles List */}
 <div className="lg:col-span-1 space-y-2">
 {rolesQuery.isLoading ? (
 <div className="animate-pulse space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg" />)}</div>
 ) : (
 roles.map((role: any) => (
 <button
 key={role.id} onClick={() => selectRole(role.id)}
 className={`w-full p-4 rounded-lg border transition-all text-start ${selectedRoleId === role.id ? 'border-purple-500 bg-purple-50 shadow-sm' : 'border-gray-200 bg-white hover:border-purple-300'}`}
 >
 <div className={`flex items-center justify-between`}>
 <div className="min-w-0 flex-1">
 <h3 className="font-medium text-gray-900 text-sm truncate">{language === 'en' ? role.name : (role.nameAr || role.name)}</h3>
 <p className="text-xs text-gray-500 mt-0.5 truncate">{language === 'en' ? role.description : (role.descriptionAr || role.description)}</p>
 </div>
 <div className={`flex items-center gap-1 flex-shrink-0 ms-2`}>
 {role.isLocked && <Lock className="w-3 h-3 text-amber-500" />}
 {role.isSystem && <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{rp.system}</span>}
 </div>
 </div>
 </button>
 ))
 )}
 </div>

 {/* Permission Tree Panel */}
 <div className="lg:col-span-3">
 {!selectedRole ? (
 <div className="flex items-center justify-center h-64 bg-white rounded-lg border border-gray-200">
 <div className="text-center">
 <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
 <p className="text-gray-500">{rp.selectRole}</p>
 </div>
 </div>
 ) : (
 <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
 {/* Role Header */}
 <div className={`p-4 border-b border-gray-200 flex items-center justify-between`}>
 <div>
 <h2 className="font-bold text-gray-900">{language === 'en' ? selectedRole.name : ((selectedRole as any).nameAr || selectedRole.name)}</h2>
 <p className="text-xs text-gray-500">{language === 'en' ? selectedRole.description : ((selectedRole as any).descriptionAr || selectedRole.description)}</p>
 </div>
 <div className={`flex items-center gap-2`}>
 {editMode ? (
 <>
 <button onClick={() => { setEditMode(false); selectRole(selectedRole.id); }} className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">{rp.cancel}</button>
 <button onClick={saveChanges} disabled={updateMutation.isPending} className="px-3 py-1.5 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700 flex items-center gap-1.5 disabled:opacity-50">
 <Save className="w-3.5 h-3.5" />{rp.save}
 </button>
 </>
 ) : (
 <>
 {!selectedRole.isLocked && (
 <button onClick={() => setEditMode(true)} className="px-3 py-1.5 text-sm text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 flex items-center gap-1.5">
 <Edit2 className="w-3.5 h-3.5" />{rp.editPerms}
 </button>
 )}
 <button onClick={() => cloneMutation.mutate({ id: selectedRole.id })} disabled={cloneMutation.isPending} className="px-3 py-1.5 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 flex items-center gap-1.5 disabled:opacity-50">
 <Copy className="w-3.5 h-3.5" />{rp.cloneRole}
 </button>
 {!selectedRole.isSystem && (
 <button onClick={() => { if (confirm(rp.confirmDelete)) deleteMutation.mutate({ id: selectedRole.id }); }} className="px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 flex items-center gap-1.5">
 <Trash2 className="w-3.5 h-3.5" />{rp.deleteRole}
 </button>
 )}
 </>
 )}
 </div>
 </div>

 {/* Tabs: Permissions / Compare / Audit */}
 <div className={`flex border-b border-gray-200`}>
 <button
 onClick={() => setActiveTab('permissions')}
 className={`px-4 py-2.5 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'permissions' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
 >
 <Shield className="w-4 h-4" />{rp.tabPermissions}
 </button>
 <button
 onClick={() => setActiveTab('compare')}
 className={`px-4 py-2.5 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'compare' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
 >
 <GitCompare className="w-4 h-4" />{rp.tabCompare}
 </button>
 <button
 onClick={() => setActiveTab('audit')}
 className={`px-4 py-2.5 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'audit' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
 >
 <History className="w-4 h-4" />{rp.tabAudit}
 </button>
 <button
 onClick={() => setActiveTab('bulk')}
 className={`px-4 py-2.5 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'bulk' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
 >
 <Users className="w-4 h-4" />{rp.tabBulk}
 </button>
 <button
 onClick={() => setActiveTab('auditReport')}
 className={`px-4 py-2.5 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'auditReport' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
 >
 <ClipboardList className="w-4 h-4" />{rp.tabAuditReport}
 </button>
 </div>

 {activeTab === 'permissions' ? (
 <div>
 <div className="divide-y divide-gray-100">
 {/* Level Legend */}
 <div className={`px-4 py-3 bg-gray-50 flex items-center gap-6 text-xs text-gray-500`}>
 <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> {rp.level1}</span>
 <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500" /> {rp.level2}</span>
 <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" /> {rp.level3}</span>
 </div>

 {/* Permission Tree */}
 {permTree.map((mod: any) => {
 const isExpanded = expandedModules.has(mod.id);
 const hasScreens = mod.screens && mod.screens.length > 0;
 const modSensitive = mod.isSensitive;
 const modPerms = localModulePerms[mod.id] || NO_ACCESS;

 return (
 <div key={mod.id}>
 {/* Module Row (Level 1) */}
 <div className={`flex items-center gap-2 px-4 py-3 hover:bg-gray-50`}>
 {hasScreens ? (
 <button onClick={() => toggleModuleExpand(mod.id)} className="p-0.5 hover:bg-gray-200 rounded">
 {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : (isRTL ? <ChevronRight className="w-4 h-4 text-gray-400 rotate-180" /> : <ChevronRight className="w-4 h-4 text-gray-400" />)}
 </button>
 ) : (
 <span className="w-5" />
 )}
 <div className={`flex items-center gap-2 min-w-[180px]`}>
 <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
 <span className="text-sm font-semibold text-gray-900">{language === 'en' ? mod.name : (mod.nameAr || mod.name)}</span>
 {modSensitive && <Lock className="w-3.5 h-3.5 text-amber-500" title={rp.sensitiveTooltip} />}
 </div>
 <div className={`flex items-center gap-1 flex-1 justify-end`}>
 {editMode && (
 <>
 <button onClick={() => grantAllModule(mod.id)} className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 rounded hover:bg-green-100 me-2">{rp.grantAll}</button>
 <button onClick={() => revokeAllModule(mod.id)} className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-700 rounded hover:bg-red-100 me-3">{rp.revokeAll}</button>
 </>
 )}
 {ALL_ACTIONS.map(action => (
 <div key={action} className="flex flex-col items-center w-[60px]">
 <span className="text-[10px] text-gray-400 mb-0.5">{actionLabel(action)}</span>
 <input
 type="checkbox"
 checked={modPerms[action] || false}
 onChange={() => toggleModulePerm(mod.id, action)}
 disabled={!editMode}
 className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500 disabled:opacity-50 cursor-pointer disabled:cursor-default"
 />
 </div>
 ))}
 </div>
 </div>

 {/* Screen Rows (Level 2) */}
 {isExpanded && hasScreens && mod.screens.map((screen: any) => {
 const screenSensitive = screen.isSensitive;
 const screenPerms = localScreenPerms[mod.id]?.[screen.id] || NO_ACCESS;
 const availableActions: ActionType[] = screen.availableActions || BASIC_ACTIONS;

 return (
 <div
 key={screen.id}
 className={`flex items-center gap-2 px-4 py-2.5 ps-12 ${screenSensitive ? 'bg-amber-50/50' : 'bg-gray-50/50'} hover:bg-gray-100/50`}
 >
 <span className="w-5" />
 <div className={`flex items-center gap-2 min-w-[180px]`}>
 <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
 <span className="text-sm text-gray-700">{language === 'en' ? screen.name : (screen.nameAr || screen.name)}</span>
 {screenSensitive && (
 <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full" title={rp.sensitiveTooltip}>
 <Lock className="w-2.5 h-2.5" /> {rp.sensitive}
 </span>
 )}
 </div>
 <div className={`flex items-center gap-1 flex-1 justify-end`}>
 {editMode && <span className="w-[calc(2*1.5rem+0.75rem+0.5rem)]" />}
 {ALL_ACTIONS.map(action => {
 const isAvailable = availableActions.includes(action);
 return (
 <div key={action} className="flex flex-col items-center w-[60px]">
 {isAvailable ? (
 <input
 type="checkbox"
 checked={screenPerms[action] || false}
 onChange={() => toggleScreenPerm(mod.id, screen.id, action)}
 disabled={!editMode}
 className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500 disabled:opacity-50 cursor-pointer disabled:cursor-default"
 />
 ) : (
 <span className="w-4 h-4 text-gray-200">—</span>
 )}
 </div>
 );
 })}
 </div>
 </div>
 );
 })}
 </div>
 );
 })}
 </div>

 {/* User Overrides Section */}
 <div className="border-t border-gray-200 p-4">
 <div className={`flex items-center gap-3 mb-4`}>
 <UserCog className="w-5 h-5 text-purple-600" />
 <h3 className="text-sm font-semibold text-gray-900">{rp.overrides}</h3>
 <span className="text-xs text-gray-500">—</span>
 <select
 value={selectedOverrideUserId || ''}
 onChange={(e) => setSelectedOverrideUserId(Number(e.target.value) || null)}
 className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white flex-1 max-w-xs"
 >
 <option value="">{rp.selectUser}</option>
 {(Array.isArray(usersList) ? usersList : []).map((u: any) => (
 <option key={u.id} value={u.id}>{u.fullName || u.name || u.email}</option>
 ))}
 </select>
 </div>
 {selectedOverrideUserId ? (
 <UserOverridesPanel userId={selectedOverrideUserId} language={language} isRTL={isRTL} />
 ) : (
 <div className="text-center py-6">
 <UserCog className="w-8 h-8 text-gray-300 mx-auto mb-2" />
 <p className="text-xs text-gray-500">{t.selectAUserAboveToManageTheirPermissionO}</p>
 </div>
 )}
 </div>
 </div>
 ) : activeTab === 'compare' ? (
 <div className="p-4">
 <RoleComparisonView language={language} isRTL={isRTL} />
 </div>
 ) : activeTab === 'audit' ? (
 /* Audit Log Tab */
 <div className="p-4">
 {auditQuery.isLoading ? (
 <div className="animate-pulse space-y-3">
 {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-gray-100 rounded-lg" />)}
 </div>
 ) : (auditQuery.data?.length || 0) === 0 ? (
 <div className="text-center py-12">
 <History className="w-10 h-10 text-gray-300 mx-auto mb-3" />
 <p className="text-gray-500 text-sm">{rp.noLogs}</p>
 </div>
 ) : (
 <div className="space-y-2">
 {(auditQuery.data || []).map((log: any) => (
 <div key={log.id} className={`flex items-start gap-3 p-3 bg-gray-50 rounded-lg ${isRTL ? 'flex-row-reverse text-end' : ''}`}>
 <div className={`p-1.5 rounded-full flex-shrink-0 ${log.action.includes('delete') ? 'bg-red-100' : log.action.includes('create') ? 'bg-green-100' : log.action.includes('override') ? 'bg-purple-100' : 'bg-blue-100'}`}>
 {log.action.includes('delete') ? <Trash2 className="w-3.5 h-3.5 text-red-600" /> :
 log.action.includes('create') ? <Plus className="w-3.5 h-3.5 text-green-600" /> :
 log.action.includes('override') ? <Zap className="w-3.5 h-3.5 text-purple-600" /> :
 <Edit2 className="w-3.5 h-3.5 text-blue-600" />}
 </div>
 <div className="flex-1 min-w-0">
 <div className={`flex items-center gap-2`}>
 <span className="text-sm font-medium text-gray-900">{log.userName}</span>
 <span className="text-xs text-gray-400">•</span>
 <span className="text-xs text-gray-500">{log.action.replace('rbac.', '')}</span>
 </div>
 {log.details && (
 <p className="text-xs text-gray-500 mt-0.5 truncate">
 {(() => { try { const d = JSON.parse(log.details); return d.roleName || d.moduleId || log.details; } catch { return log.details; } })()}
 </p>
 )}
 <p className="text-[10px] text-gray-400 mt-1">{new Date(log.createdAt).toLocaleString(t.settingsModule.enus)}</p>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 ) : activeTab === 'bulk' ? (
 <div className="p-4">
 <BulkOperationsPanel language={language} isRTL={isRTL} />
 </div>
 ) : activeTab === 'auditReport' ? (
 <div className="p-4">
 <AuditReportPanel language={language} isRTL={isRTL} />
 </div>
 ) : null}
 </div>
 )}
 </div>
 </div>

 {/* Create Role Modal */}
 {showCreateModal && (
 <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
 <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
 <div className={`flex items-center justify-between mb-6`}>
 <h2 className="text-lg font-bold text-gray-900">{rp.createRole}</h2>
 <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
 </div>
 <div className="space-y-4">
 <div>
 <label className={`text-sm font-medium text-gray-700 block mb-1 ${isRTL ? 'text-end' : ''}`}>{rp.roleName}</label>
 <input type="text" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t.placeholders.eGMealOfficer} />
 </div>
 <div>
 <label className={`text-sm font-medium text-gray-700 block mb-1 ${isRTL ? 'text-end' : ''}`}>{rp.roleNameAr}</label>
 <input type="text" dir="rtl" value={newRoleNameAr} onChange={(e) => setNewRoleNameAr(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t.placeholders.مثالمسؤولالقياسوالتقييم} />
 </div>
 <div>
 <label className={`text-sm font-medium text-gray-700 block mb-1 ${isRTL ? 'text-end' : ''}`}>{rp.description}</label>
 <textarea value={newRoleDesc} onChange={(e) => setNewRoleDesc(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" rows={2} />
 </div>
 <div>
 <label className={`text-sm font-medium text-gray-700 block mb-1 ${isRTL ? 'text-end' : ''}`}>{rp.descriptionAr}</label>
 <textarea dir="rtl" value={newRoleDescAr} onChange={(e) => setNewRoleDescAr(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" rows={2} />
 </div>
 </div>
 <div className={`flex gap-3 mt-6 ${'justify-end'}`}>
 <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">{rp.cancel}</button>
 <button onClick={handleCreate} disabled={createMutation.isPending || !newRoleName.trim()} className="px-4 py-2 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50">
 {rp.createRole}
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}

export default RolesPermissions;
