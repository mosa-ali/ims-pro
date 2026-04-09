import { useState } from 'react';
import { Upload, CheckCircle2, XCircle, Clock, AlertTriangle, RotateCcw, Download, Eye, Search, X } from 'lucide-react';
import { useLocation } from 'wouter';
import { useLanguage, formatDate } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { isUserAdmin } from '@/lib/adminCheck';
import { trpc } from '@/lib/trpc';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export function ImportHistory() {
 const { t } = useTranslation();
 const [, navigate] = useLocation();
 const { language, isRTL } = useLanguage();
 const { user } = useAuth();

 const [searchQuery, setSearchQuery] = useState('');
 const [moduleFilter, setModuleFilter] = useState<string>('all');
 const [statusFilter, setStatusFilter] = useState<string>('all');
 const [dateFilter, setDateFilter] = useState<string>('all');
 const [selectedImport, setSelectedImport] = useState<any>(null);
 const [detailsModalOpen, setDetailsModalOpen] = useState(false);

 // Use tRPC to fetch import history from the existing import_history table
 const { data: importRecords = [] } = trpc.settings.importHistory.list.useQuery();

 const labels = {
 title: t.importExport.importHistory,
 subtitle: t.settingsModule.importHistorySubtitle,
 back: t.importExport.backToSettings,
 search: t.importExport.searchByFileNameOrModule,
 filterModule: t.importExport.allModules,
 filterStatus: t.importExport.allStatus,
 allTime: t.importExport.allTime,
 last7Days: t.importExport.last7Days,
 last30Days: t.importExport.last30Days,
 last90Days: t.importExport.last90Days,
 fileName: t.importExport.fileName,
 module: t.importExport.module,
 importedBy: t.importExport.importedBy,
 importDate: t.importExport.importDate,
 status: t.importExport.status,
 results: t.importExport.results,
 actions: t.importExport.actions,
 totalImports: t.importExport.totalImports,
 completed: t.importExport.completed,
 failed: t.importExport.failed,
 partial: t.importExport.partial,
 inProgress: t.importExport.inProgress,
 rolledBack: t.importExport.rolledBack,
 viewDetails: t.importExport.viewDetails,
 downloadErrors: t.importExport.downloadErrors,
 retry: t.importExport.retry,
 noImports: t.importExport.noImportsFound,
 noImportsDesc: 'When you import Excel files, they will appear here with full tracking.',
 success: t.importExport.success,
 errors: t.importExport.errors,
 total: t.importExport.total,
 close: t.importExport.close,
 importDetails: t.importExport.importDetails,
 };

 const modules = Array.from(new Set(importRecords.map((r: any) => r.moduleName))).sort();

 const filteredImports = importRecords.filter((record: any) => {
 const matchesSearch = 
 record.fileName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
 record.moduleName?.toLowerCase().includes(searchQuery.toLowerCase());
 const matchesModule = moduleFilter === 'all' || record.moduleName === moduleFilter;
 const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
 
 let matchesDate = true;
 if (dateFilter !== 'all') {
 const importDate = new Date(record.importedAt || record.createdAt);
 const now = new Date();
 const daysDiff = Math.floor((now.getTime() - importDate.getTime()) / (1000 * 60 * 60 * 24));
 if (dateFilter === '7days') matchesDate = daysDiff <= 7;
 else if (dateFilter === '30days') matchesDate = daysDiff <= 30;
 else if (dateFilter === '90days') matchesDate = daysDiff <= 90;
 }
 
 return matchesSearch && matchesModule && matchesStatus && matchesDate;
 });

 const stats = {
 total: importRecords.length,
 completed: importRecords.filter((r: any) => r.status === 'completed').length,
 failed: importRecords.filter((r: any) => r.status === 'failed').length,
 partial: importRecords.filter((r: any) => r.status === 'partial').length,
 inProgress: importRecords.filter((r: any) => r.status === 'in_progress').length
 };

 const getStatusBadge = (status: string) => {
 const badges: Record<string, { icon: React.ReactNode; bg: string; text: string; label: string }> = {
 'completed': { icon: <CheckCircle2 className="w-4 h-4" />, bg: 'bg-green-100', text: 'text-green-700', label: labels.completed },
 'failed': { icon: <XCircle className="w-4 h-4" />, bg: 'bg-red-100', text: 'text-red-700', label: labels.failed },
 'partial': { icon: <AlertTriangle className="w-4 h-4" />, bg: 'bg-yellow-100', text: 'text-yellow-700', label: labels.partial },
 'in_progress': { icon: <Clock className="w-4 h-4" />, bg: 'bg-blue-100', text: 'text-blue-700', label: labels.inProgress },
 'rolled_back': { icon: <RotateCcw className="w-4 h-4" />, bg: 'bg-gray-100', text: 'text-gray-700', label: labels.rolledBack }
 };
 const badge = badges[status] || badges['failed'];
 return (
 <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`} dir={isRTL ? 'rtl' : 'ltr'}>
 {badge.icon}
 <span>{badge.label}</span>
 </div>
 );
 };

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className={`flex items-center justify-between`}>
 <div className={`flex items-center gap-4`}>
 <BackButton onClick={() => navigate('/organization/settings')} iconOnly />
 <div>
 <div className={`flex items-center gap-2`}>
 <Upload className="w-6 h-6 text-blue-600" />
 <h1 className={`text-2xl font-bold text-gray-900 text-start`}>{labels.title}</h1>
 </div>
 <p className={`text-sm text-gray-600 mt-1 text-start`}>{labels.subtitle}</p>
 </div>
 </div>
 </div>

 {/* Stats Cards */}
 <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
 {[
 { label: labels.totalImports, value: stats.total, color: 'text-gray-900' },
 { label: labels.completed, value: stats.completed, color: 'text-green-600' },
 { label: labels.partial, value: stats.partial, color: 'text-yellow-600' },
 { label: labels.failed, value: stats.failed, color: 'text-red-600' },
 { label: labels.inProgress, value: stats.inProgress, color: 'text-blue-600' },
 ].map((stat, i) => (
 <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
 <p className={`text-sm text-gray-600 mb-1 text-start`}>{stat.label}</p>
 <p className={`text-3xl font-bold ${stat.color} text-start`}>{stat.value}</p>
 </div>
 ))}
 </div>

 {/* Info Box */}
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
 <div className={`flex items-start gap-2`}>
 <Upload className="w-5 h-5 text-blue-600 mt-0.5" />
 <div>
 <h3 className={`font-semibold text-blue-900 mb-1 text-start`}>
 {t.importExport.automatedImportTracking}
 </h3>
 <p className={`text-sm text-blue-800 text-start`}>
 {'Every Excel import is automatically logged with full audit trail, error reports, and retry capability.'}
 </p>
 </div>
 </div>
 </div>

 {/* Filters */}
 <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
 <div className="relative lg:col-span-1">
 <Search className={`absolute top-3 w-5 h-5 text-gray-400 ${'start-3'}`} />
 <input
 type="text"
 placeholder={labels.search}
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className={`w-full border border-gray-300 rounded-md py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ps-10 pe-3 text-start`}
 />
 </div>
 <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-start`}>
 <option value="all">{labels.filterModule}</option>
 {modules.map((module: any) => (<option key={module} value={module}>{module}</option>))}
 </select>
 <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-start`}>
 <option value="all">{labels.filterStatus}</option>
 <option value="completed">{labels.completed}</option>
 <option value="partial">{labels.partial}</option>
 <option value="failed">{labels.failed}</option>
 <option value="in_progress">{labels.inProgress}</option>
 <option value="rolled_back">{labels.rolledBack}</option>
 </select>
 <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-start`}>
 <option value="all">{labels.allTime}</option>
 <option value="7days">{labels.last7Days}</option>
 <option value="30days">{labels.last30Days}</option>
 <option value="90days">{labels.last90Days}</option>
 </select>
 </div>
 </div>

 {/* Imports Table */}
 <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 {[labels.fileName, labels.module, labels.importedBy, labels.importDate, labels.status, labels.results, labels.actions].map((h, i) => (
 <th key={i} className={`px-6 py-3 text-sm font-medium text-gray-700 text-start`}>{h}</th>
 ))}
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {filteredImports.map((record: any) => (
 <tr key={record.id} className="hover:bg-gray-50">
 <td className={`px-6 py-4 text-sm font-medium text-gray-900 text-start`}>
 <div className="flex items-center gap-2">
 <Upload className="w-4 h-4 text-gray-400" />
 <span>{record.fileName}</span>
 </div>
 </td>
 <td className={`px-6 py-4 text-sm text-start`}>
 <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">{record.moduleName}</span>
 </td>
 <td className={`px-6 py-4 text-sm text-gray-600 text-start`}>{record.importedByName || '-'}</td>
 <td className={`px-6 py-4 text-sm text-gray-600 text-start`}>
 {formatDate(new Date(record.importedAt || record.createdAt), language)}
 </td>
 <td className={`px-6 py-4 text-start`}>{getStatusBadge(record.status)}</td>
 <td className={`px-6 py-4 text-sm text-start`}>
 <div className="space-y-1">
 <span className="text-green-600 font-medium">{labels.success}: {record.successCount || 0}</span>
 {(record.errorCount || 0) > 0 && <div className="text-red-600 font-medium">{labels.errors}: {record.errorCount}</div>}
 <div className="text-xs text-gray-500">{labels.total}: {record.totalRows || 0}</div>
 </div>
 </td>
 <td className={`px-6 py-4 text-start`}>
 <button
 onClick={() => { setSelectedImport(record); setDetailsModalOpen(true); }}
 className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
 title={labels.viewDetails}
 >
 <Eye className="w-4 h-4" />
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {filteredImports.length === 0 && (
 <div className="text-center py-12 text-gray-500">
 <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
 <p className="text-lg font-medium text-gray-900 mb-1">{labels.noImports}</p>
 <p className="text-sm text-gray-600">{labels.noImportsDesc}</p>
 </div>
 )}
 </div>

 {/* Details Modal */}
 {detailsModalOpen && selectedImport && (
 <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDetailsModalOpen(false)}>
 <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
 <div className={`flex items-center justify-between mb-4`}>
 <h2 className="text-lg font-bold text-gray-900">{labels.importDetails}</h2>
 <button onClick={() => setDetailsModalOpen(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
 </div>
 <div className="space-y-3 text-sm">
 <div className="flex justify-between"><span className="text-gray-500">{labels.fileName}:</span><span className="font-medium">{selectedImport.fileName}</span></div>
 <div className="flex justify-between"><span className="text-gray-500">{labels.module}:</span><span className="font-medium">{selectedImport.moduleName}</span></div>
 <div className="flex justify-between"><span className="text-gray-500">{labels.status}:</span>{getStatusBadge(selectedImport.status)}</div>
 <div className="flex justify-between"><span className="text-gray-500">{labels.total}:</span><span className="font-medium">{selectedImport.totalRows || 0}</span></div>
 <div className="flex justify-between"><span className="text-gray-500">{labels.success}:</span><span className="font-medium text-green-600">{selectedImport.successCount || 0}</span></div>
 <div className="flex justify-between"><span className="text-gray-500">{labels.errors}:</span><span className="font-medium text-red-600">{selectedImport.errorCount || 0}</span></div>
 <div className="flex justify-between"><span className="text-gray-500">{labels.importDate}:</span><span className="font-medium">{formatDate(new Date(selectedImport.importedAt || selectedImport.createdAt), language)}</span></div>
 </div>
 <div className="mt-6 flex justify-end">
 <button onClick={() => setDetailsModalOpen(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium">{labels.close}</button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}

export default ImportHistory;
