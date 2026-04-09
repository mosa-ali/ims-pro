import { useState } from 'react';
import { FileText, Download, AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { useLocation, useParams } from 'wouter';
import { useLanguage, formatDate } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export function ImportHistoryDetails() {
 const { t } = useTranslation();
 const params = useParams<{ id: string }>();
 const [, navigate] = useLocation();
 const { language, isRTL } = useLanguage();
 const { data: importRecord, isLoading } = trpc.settings.importHistory.getById.useQuery(
 { id: Number(params.id) },
 { enabled: !!params.id }
 );

 const labels = {
 title: t.importExport.importDetails,
 back: t.importExport.backToImportHistory,
 notFound: t.importExport.importNotFound,
 notFoundDesc: t.importExport.theImportRecordYouAreLooking,
 fileName: t.importExport.fileName,
 module: t.importExport.module,
 status: t.importExport.status,
 totalRows: t.importExport.totalRows,
 successCount: t.importExport.success,
 errorCount: t.importExport.errors,
 importDate: t.importExport.importDate,
 loading: t.importExport.loading,
 };

 if (isLoading) {
 return (
 <div className="flex items-center justify-center h-96" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="text-center">
 <RefreshCw className="w-8 h-8 mx-auto mb-4 text-blue-500 animate-spin" />
 <p className="text-gray-600">{labels.loading}</p>
 </div>
 </div>
 );
 }

 if (!importRecord) {
 return (
 <div className="flex items-center justify-center h-96">
 <div className="text-center">
 <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
 <h2 className="text-xl font-semibold text-gray-900 mb-2">{labels.notFound}</h2>
 <p className="text-gray-600 mb-4">{labels.notFoundDesc}</p>
 <button
 onClick={() => navigate('/organization/settings/import-history')}
 className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
 >
 {labels.back}
 </button>
 </div>
 </div>
 );
 }

 const getStatusColor = (status: string) => {
 switch (status) {
 case 'completed': return 'bg-green-100 text-green-700';
 case 'failed': return 'bg-red-100 text-red-700';
 case 'partial': return 'bg-yellow-100 text-yellow-700';
 case 'in_progress': return 'bg-blue-100 text-blue-700';
 default: return 'bg-gray-100 text-gray-700';
 }
 };

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className={`flex items-center gap-4`}>
 <BackButton onClick={() => navigate('/organization/settings/import-history')} iconOnly />
 <div>
 <div className={`flex items-center gap-2`}>
 <FileText className="w-6 h-6 text-blue-600" />
 <h1 className="text-2xl font-bold text-gray-900">{labels.title}</h1>
 </div>
 <p className={`text-sm text-gray-600 mt-1 text-start`}>{labels.back}</p>
 </div>
 </div>

 {/* Details Card */}
 <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-4">
 <div>
 <label className="text-sm font-medium text-gray-500">{labels.fileName}</label>
 <p className="text-lg font-semibold text-gray-900">{importRecord.fileName}</p>
 </div>
 <div>
 <label className="text-sm font-medium text-gray-500">{labels.module}</label>
 <p><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">{importRecord.moduleName}</span></p>
 </div>
 <div>
 <label className="text-sm font-medium text-gray-500">{labels.status}</label>
 <p><span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(importRecord.status)}`}>{importRecord.status}</span></p>
 </div>
 <div>
 <label className="text-sm font-medium text-gray-500">{labels.importDate}</label>
 <p className="text-gray-900">{formatDate(new Date(importRecord.importedAt || importRecord.createdAt), language)}</p>
 </div>
 </div>
 <div className="space-y-4">
 <div className="grid grid-cols-3 gap-4">
 <div className="bg-gray-50 rounded-lg p-4 text-center">
 <p className="text-sm text-gray-500">{labels.totalRows}</p>
 <p className="text-2xl font-bold text-gray-900">{importRecord.totalRows || 0}</p>
 </div>
 <div className="bg-green-50 rounded-lg p-4 text-center">
 <p className="text-sm text-green-600">{labels.successCount}</p>
 <p className="text-2xl font-bold text-green-700">{importRecord.successCount || 0}</p>
 </div>
 <div className="bg-red-50 rounded-lg p-4 text-center">
 <p className="text-sm text-red-600">{labels.errorCount}</p>
 <p className="text-2xl font-bold text-red-700">{importRecord.errorCount || 0}</p>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}

export default ImportHistoryDetails;
