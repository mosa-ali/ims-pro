import { useState } from 'react';
import { Trash2, Search, RotateCcw, AlertTriangle, User, Database, Eye, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import { useLocation } from 'wouter';
import { useLanguage, formatDate } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { isUserAdmin } from '@/lib/adminCheck';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export function DeletedRecords() {
 const { t } = useTranslation();
 const [, navigate] = useLocation();
 const { language, isRTL } = useLanguage();
 const { user } = useAuth();
 const [activeTab, setActiveTab] = useState<'users' | 'records'>('users');
 const [searchQuery, setSearchQuery] = useState('');
 const [moduleFilter, setModuleFilter] = useState('all');
 const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
 const [restoreDialogUser, setRestoreDialogUser] = useState<any>(null);
 const [restoreRoleId, setRestoreRoleId] = useState<number | undefined>(undefined);

 if (!isUserAdmin(user)) {
 return <div className="flex items-center justify-center h-64"><div className="text-center p-8 bg-white rounded-2xl shadow border"><h2 className="text-xl font-bold text-gray-900">Access Denied</h2></div></div>;
 }

 // Deleted users query
 const deletedUsersQuery = trpc.settings.users.listDeletedUsers.useQuery({ search: searchQuery || undefined });
 const restoreUserMutation = trpc.settings.users.restoreUser.useMutation({
 onSuccess: () => {
 toast.success(t.deletedRecords.userRestoredSuccessfully);
 deletedUsersQuery.refetch();
 setRestoreDialogUser(null);
 },
 onError: (e: any) => toast.error(e.message),
 });

 // Existing module records query
 const recordsQuery = trpc.settings.deletedRecords.list.useQuery(
 { search: searchQuery || undefined, module: moduleFilter !== 'all' ? moduleFilter : undefined },
 { enabled: activeTab === 'records' }
 );
 const restoreMutation = trpc.settings.deletedRecords.restore.useMutation({
 onSuccess: () => { toast.success(t.deletedRecords.recordRestored); recordsQuery.refetch(); },
 onError: (e: any) => toast.error(e.message),
 });
 const purgeMutation = trpc.settings.deletedRecords.purge.useMutation({
 onSuccess: () => { toast.success(t.deletedRecords.recordPermanentlyDeleted); recordsQuery.refetch(); },
 onError: (e: any) => toast.error(e.message),
 });

 // Roles query for restore dialog
 const rolesQuery = trpc.settings.roles.list.useQuery(undefined, { enabled: !!restoreDialogUser });

 const deletedUsers = deletedUsersQuery.data || [];
 const records = recordsQuery.data || [];
 const modules = ['grants', 'projects', 'finance', 'hr', 'meal', 'surveys', 'procurement'];

 const labels = {
 title: t.deletedRecords.deletedRecordsArchive,
 subtitle: t.deletedRecords.auditAndRestoreDeletedDataIncluding,
 back: t.deletedRecords.backToSettings,
 search: t.deletedRecords.search,
 allModules: t.deletedRecords.allModules,
 restore: t.deletedRecords.restore,
 purge: t.deletedRecords.purge,
 noRecords: t.deletedRecords.noDeletedRecordsFound1,
 noDeletedUsers: t.deletedRecords.noDeletedUsersFound,
 deletedBy: t.deletedRecords.deletedBy2,
 deletedAt: t.deletedRecords.deletedAt3,
 module: t.deletedRecords.module,
 record: t.deletedRecords.record,
 actions: t.deletedRecords.actions,
 warning: t.deletedRecords.softdeletedUsersCanBeRestoredExternal,
 usersTab: t.deletedRecords.deletedUsers,
 recordsTab: t.deletedRecords.moduleRecords,
 userName: t.deletedRecords.userName,
 email: t.deletedRecords.email,
 previousRoles: t.deletedRecords.previousRoles,
 previousOrgs: t.deletedRecords.previousOrganizations,
 reason: t.deletedRecords.deletionReason4,
 viewDetails: t.deletedRecords.viewDetails,
 restoreUser: t.deletedRecords.restoreUser,
 restoreConfirm: t.deletedRecords.confirmRestore,
 restoreDesc: t.deletedRecords.thisWillReactivateTheUserReassign,
 assignRole: t.deletedRecords.assignRoleOptional,
 noRole: t.deletedRecords.noRoleAssigned,
 cancel: t.deletedRecords.cancel,
 noReason: t.deletedRecords.noReasonProvided,
 historicalData: t.deletedRecords.historicalDataPreserved,
 purgeWarning: t.deletedRecords.purgedRecordsCannotBeRecovered,
 };

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Back button */}
 <div className={`flex items-center gap-3`}>
 <BackButton onClick={() => navigate('/organization/settings')} label={labels.back} />
 </div>

 {/* Header */}
 <div className={`flex items-center gap-3`}>
 <div className="p-3 bg-red-50 rounded-lg"><Trash2 className="w-6 h-6 text-red-600" /></div>
 <div>
 <h1 className={`text-2xl font-bold text-gray-900 ${isRTL ? 'text-end' : ''}`}>{labels.title}</h1>
 <p className={`text-sm text-gray-500 ${isRTL ? 'text-end' : ''}`}>{labels.subtitle}</p>
 </div>
 </div>

 {/* Warning banner */}
 <div className={`flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg`}>
 <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
 <p className="text-sm text-amber-700">{labels.warning}</p>
 </div>

 {/* Tabs */}
 <div className={`flex border-b border-gray-200`}>
 <button
 onClick={() => setActiveTab('users')}
 className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${ activeTab === 'users' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700' }`}
 >
 <User className="w-4 h-4" />
 {labels.usersTab}
 {deletedUsers.length > 0 && (
 <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">{deletedUsers.length}</span>
 )}
 </button>
 <button
 onClick={() => setActiveTab('records')}
 className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${ activeTab === 'records' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700' }`}
 >
 <Database className="w-4 h-4" />
 {labels.recordsTab}
 </button>
 </div>

 {/* Search bar */}
 <div className={`flex flex-wrap gap-4`}>
 <div className="relative flex-1 min-w-[200px]">
 <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 ${'start-3'}`} />
 <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={labels.search}
 className={`w-full border border-gray-200 rounded-lg py-2 text-sm ps-10 pe-4`} />
 </div>
 {activeTab === 'records' && (
 <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
 <option value="all">{labels.allModules}</option>
 {modules.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
 </select>
 )}
 </div>

 {/* ===== DELETED USERS TAB ===== */}
 {activeTab === 'users' && (
 <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
 {deletedUsersQuery.isLoading ? (
 <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" /></div>
 ) : deletedUsers.length === 0 ? (
 <div className="flex flex-col items-center justify-center h-40 text-gray-500">
 <User className="w-10 h-10 mb-3 text-gray-300" />
 <p className="font-medium">{labels.noDeletedUsers}</p>
 <p className="text-xs text-gray-400 mt-1">{labels.historicalData}</p>
 </div>
 ) : (
 <div className="divide-y divide-gray-100">
 {deletedUsers.map((u: any) => (
 <div key={u.id} className="hover:bg-gray-50 transition-colors">
 {/* User row */}
 <div className={`flex items-center justify-between px-4 py-3`}>
 <div className={`flex items-center gap-3 flex-1`}>
 <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
 <User className="w-5 h-5 text-red-600" />
 </div>
 <div className={isRTL ? 'text-end' : ''}>
 <p className="text-sm font-semibold text-gray-900">{u.name || 'Unknown User'}</p>
 <p className="text-xs text-gray-500">{u.email || '-'}</p>
 </div>
 </div>
 <div className={`flex items-center gap-2`}>
 <div className={`text-xs text-gray-500 text-end hidden sm:block`}>
 <p>{labels.deletedAt}: {u.deletedAt ? formatDate(new Date(u.deletedAt), language) : '-'}</p>
 <p>{labels.deletedBy}: {u.deletedByName || 'Unknown'}</p>
 </div>
 <button
 onClick={() => setExpandedUserId(expandedUserId === u.id ? null : u.id)}
 className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
 title={labels.viewDetails}
 >
 {expandedUserId === u.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
 </button>
 <button
 onClick={() => { setRestoreDialogUser(u); setRestoreRoleId(undefined); }}
 className={`px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 flex items-center gap-1`}
 >
 <RotateCcw className="w-3 h-3" />{labels.restore}
 </button>
 </div>
 </div>

 {/* Expanded details */}
 {expandedUserId === u.id && (
 <div className={`px-4 pb-4 ms-13`}>
 <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-100">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{labels.reason}</p>
 <p className="text-sm text-gray-700">{u.deletionReason || labels.noReason}</p>
 </div>
 <div>
 <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{labels.deletedAt}</p>
 <p className="text-sm text-gray-700">{u.deletedAt ? formatDate(new Date(u.deletedAt), language) : '-'}</p>
 </div>
 <div>
 <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{labels.previousRoles}</p>
 <div className={`flex flex-wrap gap-1`}>
 {(u.previousRoles || []).length > 0
 ? u.previousRoles.map((r: string, i: number) => (
 <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{r}</span>
 ))
 : <span className="text-xs text-gray-400">-</span>
 }
 </div>
 </div>
 <div>
 <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{labels.previousOrgs}</p>
 <div className={`flex flex-wrap gap-1`}>
 {(u.previousOrganizations || []).length > 0
 ? u.previousOrganizations.map((o: any, i: number) => (
 <span key={i} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">{o.orgName || `Org #${o.orgId}`}</span>
 ))
 : <span className="text-xs text-gray-400">-</span>
 }
 </div>
 </div>
 </div>
 <div className={`flex items-center gap-2 pt-2 border-t border-gray-200 text-xs text-gray-400`}>
 <Shield className="w-3 h-3" />
 <span>{labels.historicalData}</span>
 </div>
 </div>
 </div>
 )}
 </div>
 ))}
 </div>
 )}
 </div>
 )}

 {/* ===== MODULE RECORDS TAB ===== */}
 {activeTab === 'records' && (
 <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
 <div className={`flex items-center gap-3 p-3 bg-red-50 border-b border-red-100`}>
 <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
 <p className="text-xs text-red-600">{labels.purgeWarning}</p>
 </div>
 {recordsQuery.isLoading ? (
 <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" /></div>
 ) : records.length === 0 ? (
 <div className="flex flex-col items-center justify-center h-32 text-gray-500">
 <Trash2 className="w-8 h-8 mb-2 text-gray-300" /><p>{labels.noRecords}</p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead><tr className="bg-gray-50 border-b border-gray-200">
 <th className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-start`}>{labels.record}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-start`}>{labels.module}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-start`}>{labels.deletedBy}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-start`}>{labels.deletedAt}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-start`}>{labels.actions}</th>
 </tr></thead>
 <tbody className="divide-y divide-gray-100">
 {records.map((rec: any) => (
 <tr key={rec.id} className="hover:bg-gray-50">
 <td className="px-4 py-3 text-sm font-medium text-gray-900">{rec.recordName || `Record #${rec.recordId}`}</td>
 <td className="px-4 py-3 text-sm"><span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">{rec.module}</span></td>
 <td className="px-4 py-3 text-sm text-gray-600">{rec.deletedByName || 'Unknown'}</td>
 <td className="px-4 py-3 text-sm text-gray-500">{rec.deletedAt ? formatDate(new Date(rec.deletedAt), language) : '-'}</td>
 <td className="px-4 py-3">
 <div className={`flex items-center gap-2`}>
 <button onClick={() => restoreMutation.mutate({ id: rec.id })} className={`px-3 py-1 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 flex items-center gap-1`}>
 <RotateCcw className="w-3 h-3" />{labels.restore}
 </button>
 <button onClick={() => { if (confirm('Permanently delete?')) purgeMutation.mutate({ id: rec.id }); }} className={`px-3 py-1 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 flex items-center gap-1`}>
 <Trash2 className="w-3 h-3" />{labels.purge}
 </button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>
 )}

 {/* ===== RESTORE USER DIALOG ===== */}
 {restoreDialogUser && (
 <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setRestoreDialogUser(null)}>
 <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
 <div className={`flex items-center gap-3`}>
 <div className="p-2 bg-green-50 rounded-lg"><RotateCcw className="w-5 h-5 text-green-600" /></div>
 <h3 className="text-lg font-bold text-gray-900">{labels.restoreUser}</h3>
 </div>

 <p className="text-sm text-gray-600">{labels.restoreDesc}</p>

 <div className="bg-gray-50 rounded-lg p-3 space-y-2">
 <div className={`flex items-center gap-2`}>
 <User className="w-4 h-4 text-gray-400" />
 <span className="text-sm font-medium text-gray-900">{restoreDialogUser.name || 'Unknown'}</span>
 </div>
 <p className="text-xs text-gray-500">{restoreDialogUser.email}</p>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{labels.assignRole}</label>
 <select
 value={restoreRoleId || ''}
 onChange={(e) => setRestoreRoleId(e.target.value ? Number(e.target.value) : undefined)}
 className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
 >
 <option value="">{labels.noRole}</option>
 {(rolesQuery.data || []).map((role: any) => (
 <option key={role.id} value={role.id}>{language === 'ar' && role.nameAr ? role.nameAr : role.name}</option>
 ))}
 </select>
 </div>

 <div className={`flex items-center gap-3 pt-2`}>
 <button
 onClick={() => setRestoreDialogUser(null)}
 className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
 >
 {labels.cancel}
 </button>
 <button
 onClick={() => restoreUserMutation.mutate({ userId: restoreDialogUser.id, reassignRoleId: restoreRoleId })}
 disabled={restoreUserMutation.isPending}
 className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
 >
 {restoreUserMutation.isPending ? '...' : labels.restoreConfirm}
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}

export default DeletedRecords;
