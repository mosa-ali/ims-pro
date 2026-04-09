import { RotateCcw, X, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ImportHistoryRecord } from '@/contexts/ImportHistoryContext';
import { useState } from 'react';
import { useTranslation } from '@/i18n/useTranslation';

interface RetryConfirmationModalProps {
 isOpen: boolean;
 onClose: () => void;
 onConfirm: (mode: 'ALL' | 'FAILED_ONLY') => void;
 importRecord: ImportHistoryRecord;
}

export function RetryConfirmationModal({
 isOpen,
 onClose,
 onConfirm,
 importRecord
}: RetryConfirmationModalProps) {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const [retryMode, setRetryMode] = useState<'ALL' | 'FAILED_ONLY'>('FAILED_ONLY');

 if (!isOpen) return null;

 const labels = {
 title: t.components.retryImport,
 file: t.components.file,
 module: t.components.module,
 previousErrors: t.components.previousErrors,
 allowDuplicates: t.components.allowDuplicates,
 yes: t.components.yes,
 no: t.components.no,
 retryMode: t.components.retryMode,
 retryAll: t.components.retryAllRows,
 retryFailedOnly: t.components.retryFailedRowsOnly,
 retryAllDesc: language === 'en' 
 ? 'Re-import all rows from the original file'
 : 'إعادة استيراد جميع الصفوف من الملف الأصلي',
 retryFailedDesc: language === 'en' 
 ? 'Only retry the rows that failed in the previous import'
 : 'إعادة محاولة الصفوف التي فشلت فقط في الاستيراد السابق',
 warning: t.components.thisWill,
 warningItem1: t.components.reuseTheSameFile,
 warningItem2: t.components.rerunValidation,
 warningItem3: t.components.createANewImportRecord,
 warningItem4All: t.components.processAllRowsAgain,
 warningItem4Failed: t.components.processOnlyFailedRows,
 retryCount: t.components.retryAttempt,
 of: t.components.of,
 cancel: t.components.cancel,
 retryImport: t.components.retryImport,
 recommended: t.components.recommended
 };

 return (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
 {/* Header */}
 <div className={`flex items-center justify-between p-6 border-b border-gray-200`}>
 <div className={`flex items-center gap-3`}>
 <div className="p-2 rounded-full bg-green-100">
 <RotateCcw className="w-6 h-6 text-green-600" />
 </div>
 <h2 className={`text-xl font-bold text-gray-900 text-start`}>
 {labels.title}
 </h2>
 </div>
 <button
 onClick={onClose}
 className="p-1 hover:bg-gray-100 rounded-md transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Body */}
 <div className="p-6 space-y-6">
 {/* Import Information */}
 <div className="grid grid-cols-2 gap-4">
 <div className={'text-start'}>
 <p className="text-sm text-gray-600 mb-1">{labels.file}</p>
 <p className="text-sm font-medium text-gray-900">{importRecord.fileName}</p>
 </div>
 <div className={'text-start'}>
 <p className="text-sm text-gray-600 mb-1">{labels.module}</p>
 <p className="text-sm font-medium text-gray-900">{importRecord.moduleName}</p>
 </div>
 <div className={'text-start'}>
 <p className="text-sm text-gray-600 mb-1">{labels.previousErrors}</p>
 <p className="text-sm font-medium text-red-600">{importRecord.errorCount}</p>
 </div>
 <div className={'text-start'}>
 <p className="text-sm text-gray-600 mb-1">{labels.allowDuplicates}</p>
 <p className="text-sm font-medium text-gray-900">
 {importRecord.allowDuplicates ? labels.yes : labels.no}
 </p>
 </div>
 </div>

 {/* Retry Count Warning */}
 <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
 <div className={`flex items-center gap-2`}>
 <AlertTriangle className="w-5 h-5 text-purple-600" />
 <p className={`text-sm font-medium text-purple-900 text-start`}>
 {labels.retryCount} {importRecord.retryCount + 1} {labels.of} {importRecord.maxRetries}
 </p>
 </div>
 </div>

 {/* Retry Mode Selection */}
 <div>
 <h3 className={`text-lg font-semibold text-gray-900 mb-3 text-start`}>
 {labels.retryMode}
 </h3>
 
 <div className="space-y-3">
 {/* Retry Failed Only */}
 <label 
 className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${ retryMode === 'FAILED_ONLY' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300' }`}
 >
 <input
 type="radio"
 name="retryMode"
 value="FAILED_ONLY"
 checked={retryMode === 'FAILED_ONLY'}
 onChange={() => setRetryMode('FAILED_ONLY')}
 className="mt-1"
 />
 <div className="flex-1">
 <div className={`flex items-center gap-2 mb-1`}>
 <p className={`font-medium text-gray-900 text-start`}>
 {labels.retryFailedOnly}
 </p>
 <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
 {labels.recommended}
 </span>
 </div>
 <p className={`text-sm text-gray-600 text-start`}>
 {labels.retryFailedDesc}
 </p>
 <p className={`text-sm font-medium text-green-700 mt-2 text-start`}>
 {importRecord.errorCount} rows will be retried
 </p>
 </div>
 </label>

 {/* Retry All */}
 <label 
 className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${ retryMode === 'ALL' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300' }`}
 >
 <input
 type="radio"
 name="retryMode"
 value="ALL"
 checked={retryMode === 'ALL'}
 onChange={() => setRetryMode('ALL')}
 className="mt-1"
 />
 <div className="flex-1">
 <p className={`font-medium text-gray-900 mb-1 text-start`}>
 {labels.retryAll}
 </p>
 <p className={`text-sm text-gray-600 text-start`}>
 {labels.retryAllDesc}
 </p>
 <p className={`text-sm font-medium text-gray-700 mt-2 text-start`}>
 {importRecord.totalRows} rows will be retried
 </p>
 </div>
 </label>
 </div>
 </div>

 {/* Warning Box */}
 <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
 <div className={`flex items-start gap-2`}>
 <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
 <div className="flex-1">
 <p className={`font-medium text-yellow-900 mb-2 text-start`}>
 {labels.warning}
 </p>
 <ul className={`text-sm text-yellow-800 space-y-1 text-start`}>
 <li className={`flex items-center gap-2`}>
 <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full"></span>
 <span>{labels.warningItem1}</span>
 </li>
 <li className={`flex items-center gap-2`}>
 <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full"></span>
 <span>{labels.warningItem2}</span>
 </li>
 <li className={`flex items-center gap-2`}>
 <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full"></span>
 <span>{labels.warningItem3}</span>
 </li>
 <li className={`flex items-center gap-2`}>
 <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full"></span>
 <span>{retryMode === 'ALL' ? labels.warningItem4All : labels.warningItem4Failed}</span>
 </li>
 </ul>
 </div>
 </div>
 </div>
 </div>

 {/* Footer */}
 <div className={`flex gap-3 p-6 bg-gray-50`}>
 <button
 onClick={onClose}
 className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors text-gray-700 font-medium"
 >
 {labels.cancel}
 </button>
 <button
 onClick={() => onConfirm(retryMode)}
 className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
 >
 {labels.retryImport}
 </button>
 </div>
 </div>
 </div>
 );
}
