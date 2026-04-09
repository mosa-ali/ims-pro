import { useState } from 'react';
import { Trash2, RotateCcw, Search, ShieldCheck, Globe, Building2, CheckSquare, Square } from 'lucide-react';
import { Link } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export default function PlatformDeletedRecords() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 
 const formatDate = (date: Date) => {
 return new Intl.DateTimeFormat(t.platformModule.enus, {
 year: 'numeric',
 month: 'short',
 day: 'numeric',
 hour: '2-digit',
 minute: '2-digit'
 }).format(date);
 };
 
 const { user } = useAuth();
 
 const [searchQuery, setSearchQuery] = useState('');
 const [recordTypeFilter, setRecordTypeFilter] = useState<string>('all');
 const [dateFilter, setDateFilter] = useState<string>('all');
 const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
 
 const [deleteModalOpen, setDeleteModalOpen] = useState(false);
 const [restoreModalOpen, setRestoreModalOpen] = useState(false);
 const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
 const [bulkRestoreModalOpen, setBulkRestoreModalOpen] = useState(false);
 const [selectedRecord, setSelectedRecord] = useState<any>(null);

 const isPlatformAdmin = user?.role?.toLowerCase() === 'platform_admin' || user?.role?.toLowerCase() === 'platform_super_admin';

 // Queries
 const { data: deletedRecords = [], isLoading, refetch } = trpc.ims.deletedRecords.listByScope.useQuery({
 scope: 'platform'
 }, {
 enabled: isPlatformAdmin
 });

 // Mutations
 const restoreMutation = trpc.ims.deletedRecords.restore.useMutation({
 onSuccess: () => {
 toast.success(t.platformModule.recordRestoredSuccessfully);
 refetch();
 setRestoreModalOpen(false);
 setSelectedRecord(null);
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const permanentDeleteMutation = trpc.ims.deletedRecords.permanentDelete.useMutation({
 onSuccess: () => {
 toast.success(t.platformModule.recordPermanentlyDeleted);
 refetch();
 setDeleteModalOpen(false);
 setSelectedRecord(null);
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const bulkRestoreMutation = trpc.ims.deletedRecords.bulkRestore.useMutation({
 onSuccess: (data) => {
 const message = `Successfully restored ${data.restoredCount} of ${data.totalRequested} records`;
 toast.success(message);
 if (data.errors && data.errors.length > 0) {
 toast.error(`Some restorations failed: ${data.errors.join(', ')}`);
 }
 refetch();
 setSelectedRecordIds([]);
 setBulkRestoreModalOpen(false);
 },
 onError: (error) => {
 toast.error(error.message);
 setBulkRestoreModalOpen(false);
 },
 });

 const bulkPermanentDeleteMutation = trpc.ims.deletedRecords.bulkPermanentDelete.useMutation({
 onSuccess: (data) => {
 const message = `Successfully deleted ${data.deletedCount} of ${data.totalRequested} records`;
 toast.success(message);
 if (data.errors && data.errors.length > 0) {
 toast.error(`Some deletions failed: ${data.errors.join(', ')}`);
 }
 refetch();
 setSelectedRecordIds([]);
 setBulkDeleteModalOpen(false);
 },
 onError: (error) => {
 toast.error(error.message);
 setBulkDeleteModalOpen(false);
 },
 });

 // Handlers
 const handleRestore = (record: any) => {
 setSelectedRecord(record);
 setRestoreModalOpen(true);
 };

 const handleConfirmRestore = () => {
 if (!selectedRecord) return;
 restoreMutation.mutate({
 entityType: selectedRecord.recordType,
 entityId: selectedRecord.entityId,
 scope: 'platform',
 });
 };

 const handlePermanentDelete = (record: any) => {
 setSelectedRecord(record);
 setDeleteModalOpen(true);
 };

 const handleConfirmPermanentDelete = () => {
 if (!selectedRecord) return;
 permanentDeleteMutation.mutate({
 entityType: selectedRecord.recordType,
 entityId: selectedRecord.entityId,
 scope: 'platform',
 });
 };

 const handleBulkRestore = () => {
 setBulkRestoreModalOpen(true);
 };

 const handleConfirmBulkRestore = () => {
 const records = selectedRecordIds.map(id => {
 const record = deletedRecords.find((r: any) => r.id === id);
 return {
 entityType: record?.recordType || '',
 entityId: record?.entityId || 0,
 };
 });
 bulkRestoreMutation.mutate({
 records,
 scope: 'platform',
 });
 };

 const handleBulkPermanentDelete = () => {
 setBulkDeleteModalOpen(true);
 };

 const handleConfirmBulkPermanentDelete = () => {
 const records = selectedRecordIds.map(id => {
 const record = deletedRecords.find((r: any) => r.id === id);
 return {
 entityType: record?.recordType || '',
 entityId: record?.entityId || 0,
 };
 });
 bulkPermanentDeleteMutation.mutate({
 records,
 scope: 'platform',
 });
 };

 const toggleSelectAll = () => {
 if (selectedRecordIds.length === filteredRecords.length) {
 setSelectedRecordIds([]);
 } else {
 setSelectedRecordIds(filteredRecords.map((r: any) => r.id));
 }
 };

 const toggleSelectRecord = (id: string) => {
 setSelectedRecordIds(prev =>
 prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id]
 );
 };

 if (!isPlatformAdmin) {
 return (
 <div className="flex items-center justify-center h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="text-center p-12 bg-white rounded-[40px] shadow-2xl border border-gray-100">
 <div className="p-6 bg-rose-50 rounded-full w-fit mx-auto mb-6">
 <Trash2 className="w-12 h-12 text-rose-600" />
 </div>
 <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Access Denied</h2>
 <p className="text-gray-500 font-medium">Platform administrator privileges required.</p>
 <Link href="/platform/settings"><button className="mt-8 px-8 py-3 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs">Return to Settings</button></Link>
 </div>
 </div>
 );
 }

 const labels = {
 title: t.platformModule.platformGovernanceVault,
 subtitle: t.platformModule.administrativeRecoveryOfGlobalSystemEntities,
 back: t.platformModule.back,
 archivedRecords: t.platformModule.globalArchive,
 archivedDesc: 'Records here affect platform-wide configurations and multi-tenant structures.',
 search: t.platformModule.searchGlobalEntities,
 filterRecordType: t.platformModule.allEntities,
 filterDate: t.platformModule.dateRange,
 allTime: t.platformModule.allHistory,
 last7Days: t.platformModule.last7Days,
 last30Days: t.platformModule.last30Days,
 last90Days: t.platformModule.last90Days,
 recordType: t.platformModule.entityClass,
 name: t.platformModule.globalIdentifier,
 deletedBy: t.platformModule.administrator,
 deletedAt: t.platformModule.timestamp,
 actions: t.platformModule.actions,
 restore: t.platformModule.restore,
 permanentDelete: t.platformModule.purgeEntity,
 totalDeleted: t.platformModule.globalDeleted,
 canRestore: t.platformModule.recoverable,
 canPermanentDelete: t.platformModule.purgeEligible,
 noRecords: t.platformModule.vaultIsEmpty,
 orgRef: t.platformModule.organizationRef,
 classification: t.platformModule.governanceLevel,
 selectAll: t.platformModule.selectAll,
 selected: t.platformModule.selected,
 bulkRestore: t.platformModule.restoreSelected,
 bulkDelete: t.platformModule.purgeSelected,
 };

 const recordTypes = Array.from(new Set(deletedRecords.map((r: any) => r.recordType))).sort();

 const filteredRecords = deletedRecords.filter((record: any) => {
 const matchesSearch = 
 record.recordName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
 record.recordType?.toLowerCase().includes(searchQuery.toLowerCase());
 const matchesRecordType = recordTypeFilter === 'all' || record.recordType === recordTypeFilter;
 
 let matchesDate = true;
 if (dateFilter !== 'all') {
 const deletedDate = new Date(record.deletedAt);
 const now = new Date();
 const daysDiff = Math.floor((now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24));
 if (dateFilter === '7days') matchesDate = daysDiff <= 7;
 else if (dateFilter === '30days') matchesDate = daysDiff <= 30;
 else if (dateFilter === '90days') matchesDate = daysDiff <= 90;
 }
 return matchesSearch && matchesRecordType && matchesDate;
 });

 const stats = {
 total: deletedRecords.length,
 canRestore: deletedRecords.filter((r: any) => r.canRestore).length,
 canPermanentDelete: deletedRecords.filter((r: any) => r.canPermanentDelete).length
 };

 return (
 <div className="min-h-screen bg-gray-50/50 p-8 md:p-12 lg:p-16">
 <div className="max-w-[1600px] mx-auto space-y-12">
 {/* Header */}
 <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 border-b border-gray-200 pb-10">
 <div className="space-y-4">
 <BackButton href="/platform/settings" label={labels.back} />
 <h1 className="text-5xl font-black text-gray-900 tracking-tighter flex items-center gap-4">
 <ShieldCheck className="w-12 h-12 text-blue-600" />
 {labels.title}
 </h1>
 <p className="text-xl text-gray-500 font-bold mt-2">{labels.subtitle}</p>
 </div>
 </div>

 {/* Stats Grid */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
 {[
 { label: labels.totalDeleted, val: stats.total, color: 'text-gray-900' },
 { label: labels.canRestore, val: stats.canRestore, color: 'text-blue-600' },
 { label: labels.canPermanentDelete, val: stats.canPermanentDelete, color: 'text-rose-600' }
 ].map(stat => (
 <div key={stat.label} className="bg-white border border-gray-200 rounded-[32px] p-8 shadow-sm">
 <p className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-2">{stat.label}</p>
 <p className={`text-5xl font-black ${stat.color} tracking-tight`}>{stat.val}</p>
 </div>
 ))}
 </div>

 {/* Governance Info Banner */}
 <div className="bg-slate-900 text-white rounded-[32px] p-8 flex items-center gap-6 shadow-xl relative overflow-hidden">
 <div className="absolute end-0 top-0 opacity-10">
 <Globe className="w-64 h-64 translate-x-20 -translate-y-20" />
 </div>
 <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md relative z-10">
 <ShieldCheck className="w-8 h-8 text-blue-400" />
 </div>
 <div className="space-y-1 relative z-10">
 <h3 className="text-lg font-black tracking-tight">{labels.archivedRecords}</h3>
 <p className="text-slate-400 font-medium leading-relaxed">{labels.archivedDesc}</p>
 </div>
 </div>

 {/* Bulk Actions Bar */}
 {selectedRecordIds.length > 0 && (
 <div className="bg-blue-50 border-2 border-blue-200 rounded-[24px] p-6 flex items-center justify-between">
 <div className="flex items-center gap-4">
 <div className="p-3 bg-blue-600 rounded-xl">
 <CheckSquare className="w-5 h-5 text-white" />
 </div>
 <div>
 <p className="font-black text-blue-900 text-lg">{selectedRecordIds.length} {labels.selected}</p>
 </div>
 </div>
 <div className={`flex items-center gap-3`}>
 <button
 onClick={handleBulkRestore}
 className="px-6 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2"
 >
 <RotateCcw className="w-4 h-4" />
 {labels.bulkRestore}
 </button>
 <button
 onClick={handleBulkPermanentDelete}
 className="px-6 py-3 bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-700 transition-all flex items-center gap-2"
 >
 <Trash2 className="w-4 h-4" />
 {labels.bulkDelete}
 </button>
 </div>
 </div>
 )}

 {/* Filters & Table */}
 <div className="space-y-6">
 <div className="bg-white rounded-[32px] border border-gray-200 p-8 shadow-sm">
 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
 <div className="relative md:col-span-2">
 <Search className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 ${'start-4'}`} />
 <input
 type="text"
 placeholder={labels.search}
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className={`w-full bg-gray-50 border-none rounded-2xl py-4 focus:ring-2 focus:ring-blue-500 font-medium ps-12 pe-4 text-start`}
 />
 </div>

 <select
 value={recordTypeFilter}
 onChange={(e) => setRecordTypeFilter(e.target.value)}
 className={`w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-black text-xs uppercase tracking-widest text-start`}
 >
 <option value="all">{labels.filterRecordType}</option>
 {recordTypes.map(rt => <option key={rt} value={rt}>{rt}</option>)}
 </select>

 <select
 value={dateFilter}
 onChange={(e) => setDateFilter(e.target.value)}
 className={`w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-black text-xs uppercase tracking-widest text-start`}
 >
 <option value="all">{labels.allTime}</option>
 <option value="7days">{labels.last7Days}</option>
 <option value="30days">{labels.last30Days}</option>
 <option value="90days">{labels.last90Days}</option>
 </select>
 </div>
 </div>

 <div className="bg-white rounded-[40px] border border-gray-200 overflow-hidden shadow-sm">
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="bg-gray-50 border-b border-gray-100">
 <th className={`px-6 py-6 text-start`}>
 <button
 onClick={toggleSelectAll}
 className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
 >
 {selectedRecordIds.length === filteredRecords.length && filteredRecords.length > 0 ? (
 <CheckSquare className="w-5 h-5 text-blue-600" />
 ) : (
 <Square className="w-5 h-5 text-gray-400" />
 )}
 </button>
 </th>
 <th className={`px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[2px] text-start`}>{labels.recordType}</th>
 <th className={`px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[2px] text-start`}>{labels.name}</th>
 <th className={`px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[2px] text-start`}>{labels.orgRef}</th>
 <th className={`px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[2px] text-start`}>{labels.classification}</th>
 <th className={`px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[2px] text-start`}>{labels.deletedBy}</th>
 <th className={`px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[2px] text-start`}>{labels.deletedAt}</th>
 <th className={`px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[2px] text-start`}>{t.platformModule.deletionReason}</th>
 <th className={`px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[2px] text-start`}>{labels.actions}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-50">
 {filteredRecords.length === 0 ? (
 <tr>
 <td colSpan={9} className="px-10 py-16 text-center">
 <div className="flex flex-col items-center gap-4">
 <div className="p-6 bg-gray-100 rounded-full">
 <Trash2 className="w-12 h-12 text-gray-400" />
 </div>
 <p className="text-xl font-black text-gray-400 uppercase tracking-widest">{labels.noRecords}</p>
 </div>
 </td>
 </tr>
 ) : (
 filteredRecords.map((record: any) => (
 <tr key={record.id} className="hover:bg-blue-50/20 transition-colors group">
 <td className={`px-6 py-8 text-start`}>
 <button
 onClick={() => toggleSelectRecord(record.id)}
 className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
 >
 {selectedRecordIds.includes(record.id) ? (
 <CheckSquare className="w-5 h-5 text-blue-600" />
 ) : (
 <Square className="w-5 h-5 text-gray-400" />
 )}
 </button>
 </td>
 <td className={`px-10 py-8 text-start`}>
 <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-[9px] font-black uppercase tracking-widest">{record.recordType}</span>
 </td>
 <td className={`px-10 py-8 font-black text-gray-900 tracking-tight text-start`}>{record.recordName}</td>
 <td className={`px-10 py-8 text-start`}>
 {record.organizationName ? (
 <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
 <Building2 className="w-4 h-4 text-slate-400" />
 {record.organizationName}
 </div>
 ) : (
 <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Global Entity</span>
 )}
 </td>
 <td className={`px-10 py-8 text-start`}>
 <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-600 rounded-lg w-fit border border-slate-200">
 <ShieldCheck className="w-3 h-3 text-blue-600" />
 <span className="text-[9px] font-black uppercase tracking-widest">PLATFORM</span>
 </div>
 </td>
 <td className={`px-10 py-8 text-sm font-bold text-gray-500 text-start`}>{record.deletedByName}</td>
 <td className={`px-10 py-8 text-xs font-bold text-gray-400 text-start`}>{formatDate(new Date(record.deletedAt))}</td>
 <td className={`px-10 py-8 text-start`}>
 <div className="max-w-xs">
 <p className="text-sm text-gray-600 line-clamp-2">
 {record.deletionReason || (t.platformModule.noReasonProvided)}
 </p>
 </div>
 </td>
 <td className={`px-10 py-8 text-start`}>
 <div className={`flex items-center gap-3`}>
 {record.canRestore && (
 <button 
 onClick={() => handleRestore(record)}
 className="px-6 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2"
 >
 <RotateCcw className="w-3 h-3" />
 {labels.restore}
 </button>
 )}
 {record.canPermanentDelete && (
 <button 
 onClick={() => handlePermanentDelete(record)}
 className="px-6 py-2 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all flex items-center gap-2"
 >
 <Trash2 className="w-3 h-3" />
 {labels.permanentDelete}
 </button>
 )}
 </div>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 </div>

 {/* Restore Confirmation Modal */}
 <DeleteConfirmationModal
 isOpen={restoreModalOpen}
 onClose={() => {
 setRestoreModalOpen(false);
 setSelectedRecord(null);
 }}
 onConfirm={handleConfirmRestore}
 title={t.platformModule.restoreRecord}
 message={`Are you sure you want to restore "${selectedRecord?.recordName}"? This will make it active again.`}
 confirmText={t.platformModule.restore}
 type="restore"
 />

 {/* Permanent Delete Confirmation Modal */}
 <DeleteConfirmationModal
 isOpen={deleteModalOpen}
 onClose={() => {
 setDeleteModalOpen(false);
 setSelectedRecord(null);
 }}
 onConfirm={handleConfirmPermanentDelete}
 title={t.platformModule.permanentlyDeleteRecord}
 message={`Are you sure you want to permanently delete "${selectedRecord?.recordName}"? This action cannot be undone.`}
 confirmText={t.platformModule.deletePermanently}
 type="delete"
 />

 {/* Bulk Restore Confirmation Modal */}
 <DeleteConfirmationModal
 isOpen={bulkRestoreModalOpen}
 onClose={() => setBulkRestoreModalOpen(false)}
 onConfirm={handleConfirmBulkRestore}
 title={t.platformModule.restoreMultipleRecords}
 message={`Are you sure you want to restore ${selectedRecordIds.length} records? They will become active again.`}
 confirmText={t.platformModule.restoreAll}
 type="restore"
 />

 {/* Bulk Permanent Delete Confirmation Modal */}
 <DeleteConfirmationModal
 isOpen={bulkDeleteModalOpen}
 onClose={() => setBulkDeleteModalOpen(false)}
 onConfirm={handleConfirmBulkPermanentDelete}
 title={t.platformModule.permanentlyDeleteMultipleRecords}
 message={`Are you sure you want to permanently delete ${selectedRecordIds.length} records? This action cannot be undone.`}
 confirmText={t.platformModule.deleteAllPermanently}
 type="delete"
 />
 </div>
 );
}
