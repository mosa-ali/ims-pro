/**
 * ============================================================================
 * DUPLICATE DETECTION MODAL (MANDATORY FOR ALL IMPORTS)
 * ============================================================================
 * 
 * This modal is displayed AFTER file selection and BEFORE import processing.
 * It shows detected duplicates and asks the user: "Allow duplication? (Yes/No)"
 * 
 * RULES:
 * - If No (default): Block import, show duplicate details
 * - If Yes: Allow import, flag duplicates in metadata
 * - All decisions are logged for audit
 * ============================================================================
 */

import { useState } from 'react';
import { AlertTriangle, X, Download, Info, CheckCircle2, XCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DuplicationScanResult, ModuleName, downloadDuplicationReport, getBusinessKeyConfig } from '@/utils/duplicationDetection';
import { useTranslation } from '@/i18n/useTranslation';

interface DuplicateDetectionModalProps {
 isOpen: boolean;
 scanResult: DuplicationScanResult;
 moduleName: ModuleName;
 fileName: string;
 onAllow: () => void;
 onBlock: () => void;
 onCancel: () => void;
}

export function DuplicateDetectionModal({
 isOpen,
 scanResult,
 moduleName,
 fileName,
 onAllow,
 onBlock,
 onCancel
}: DuplicateDetectionModalProps) {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const [selectedAction, setSelectedAction] = useState<'block' | 'allow'>('block');

 if (!isOpen) return null;

 const businessKeyConfig = getBusinessKeyConfig(moduleName);

 const labels = {
 title: t.components.duplicateRecordsDetected,
 subtitle: language === 'en' 
 ? 'Some records in this file already exist or are duplicated within the file'
 : 'بعض السجلات في هذا الملف موجودة بالفعل أو مكررة داخل الملف',
 file: t.components.file,
 module: t.components.module,
 duplicateKey: t.components.duplicationCheckBasedOn,
 summary: t.components.summary,
 totalRows: t.components.totalRows,
 duplicates: t.components.duplicateRows,
 unique: t.components.uniqueRows,
 question: t.components.howShouldWeProceed,
 blockOption: t.components.blockImportRecommended,
 blockDesc: language === 'en' 
 ? 'Do not import any data. Review and fix duplicates first.'
 : 'عدم استيراد أي بيانات. مراجعة وإصلاح التكرارات أولاً.',
 allowOption: t.components.allowDuplicates,
 allowDesc: language === 'en' 
 ? 'Import all rows including duplicates. Duplicates will be flagged for audit.'
 : 'استيراد جميع الصفوف بما في ذلك التكرارات. سيتم وضع علامة على التكرارات للمراجعة.',
 duplicateList: t.components.duplicateRecordsFirst10,
 downloadReport: t.components.downloadFullReport,
 row: t.components.row,
 fields: t.components.duplicateFields,
 reason: t.components.reason,
 cancel: t.components.cancelImport,
 proceed: t.components.proceed,
 blockImport: t.components.blockImport,
 allowImport: t.components.allowImport,
 warning: t.components.warning,
 warningMessage: language === 'en'
 ? 'Allowing duplicates may cause data integrity issues and compliance problems. This decision will be logged for audit.'
 : 'السماح بالتكرارات قد يسبب مشاكل في سلامة البيانات ومشاكل الامتثال. سيتم تسجيل هذا القرار للمراجعة.',
 recommended: t.components.recommended,
 requiresApproval: t.components.requiresJustification
 };

 const handleDownloadReport = () => {
 downloadDuplicationReport(scanResult, moduleName, fileName);
 };

 const handleProceed = () => {
 if (selectedAction === 'block') {
 onBlock();
 } else {
 onAllow();
 }
 };

 return (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
 {/* Header */}
 <div className={`flex items-center justify-between p-6 border-b border-gray-200 bg-yellow-50`}>
 <div className={`flex items-center gap-3`}>
 <div className="p-2 rounded-full bg-yellow-100">
 <AlertTriangle className="w-6 h-6 text-yellow-600" />
 </div>
 <div>
 <h2 className={`text-xl font-bold text-gray-900 text-start`}>
 {labels.title}
 </h2>
 <p className={`text-sm text-gray-600 text-start`}>
 {labels.subtitle}
 </p>
 </div>
 </div>
 <button
 onClick={onCancel}
 className="p-1 hover:bg-yellow-100 rounded-md transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Body */}
 <div className="flex-1 overflow-y-auto p-6 space-y-6">
 {/* File Info */}
 <div className="bg-gray-50 rounded-lg p-4">
 <div className="grid grid-cols-2 gap-4">
 <div className={'text-start'}>
 <p className="text-sm text-gray-600">{labels.file}</p>
 <p className="text-sm font-medium text-gray-900">{fileName}</p>
 </div>
 <div className={'text-start'}>
 <p className="text-sm text-gray-600">{labels.module}</p>
 <p className="text-sm font-medium text-gray-900">{moduleName}</p>
 </div>
 </div>
 <div className={`mt-3 pt-3 border-t border-gray-200 text-start`}>
 <p className="text-sm text-gray-600 mb-1">{labels.duplicateKey}</p>
 <p className="text-sm font-medium text-blue-700">
 {businessKeyConfig?.description || 'Unknown'}
 </p>
 <p className="text-xs text-gray-500 mt-1">
 Fields: {businessKeyConfig?.fields.join(', ')}
 </p>
 </div>
 </div>

 {/* Summary Stats */}
 <div>
 <h3 className={`text-lg font-semibold text-gray-900 mb-3 text-start`}>
 {labels.summary}
 </h3>
 <div className="grid grid-cols-3 gap-4">
 <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
 <p className={`text-sm text-gray-600 mb-1 text-start`}>
 {labels.totalRows}
 </p>
 <p className={`text-2xl font-bold text-gray-900 text-start`}>
 {scanResult.totalRows}
 </p>
 </div>
 <div className="bg-red-50 rounded-lg p-4 border border-red-200">
 <p className={`text-sm text-red-700 mb-1 text-start`}>
 {labels.duplicates}
 </p>
 <p className={`text-2xl font-bold text-red-600 text-start`}>
 {scanResult.duplicateCount}
 </p>
 </div>
 <div className="bg-green-50 rounded-lg p-4 border border-green-200">
 <p className={`text-sm text-green-700 mb-1 text-start`}>
 {labels.unique}
 </p>
 <p className={`text-2xl font-bold text-green-600 text-start`}>
 {scanResult.uniqueCount}
 </p>
 </div>
 </div>
 </div>

 {/* Decision Options */}
 <div>
 <h3 className={`text-lg font-semibold text-gray-900 mb-3 text-start`}>
 {labels.question}
 </h3>
 
 <div className="space-y-3">
 {/* Block Option (Recommended) */}
 <label 
 className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${ selectedAction === 'block' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300' }`}
 >
 <input
 type="radio"
 name="action"
 value="block"
 checked={selectedAction === 'block'}
 onChange={() => setSelectedAction('block')}
 className="mt-1"
 />
 <div className="flex-1">
 <div className={`flex items-center gap-2 mb-1`}>
 <XCircle className="w-5 h-5 text-red-600" />
 <p className={`font-medium text-gray-900 text-start`}>
 {labels.blockOption}
 </p>
 <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
 {labels.recommended}
 </span>
 </div>
 <p className={`text-sm text-gray-600 text-start`}>
 {labels.blockDesc}
 </p>
 </div>
 </label>

 {/* Allow Option */}
 <label 
 className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${ selectedAction === 'allow' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-yellow-300' }`}
 >
 <input
 type="radio"
 name="action"
 value="allow"
 checked={selectedAction === 'allow'}
 onChange={() => setSelectedAction('allow')}
 className="mt-1"
 />
 <div className="flex-1">
 <div className={`flex items-center gap-2 mb-1`}>
 <CheckCircle2 className="w-5 h-5 text-yellow-600" />
 <p className={`font-medium text-gray-900 text-start`}>
 {labels.allowOption}
 </p>
 <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
 {labels.requiresApproval}
 </span>
 </div>
 <p className={`text-sm text-gray-600 text-start`}>
 {labels.allowDesc}
 </p>
 </div>
 </label>
 </div>
 </div>

 {/* Warning Box (shown when Allow is selected) */}
 {selectedAction === 'allow' && (
 <div className="bg-red-50 border border-red-200 rounded-lg p-4">
 <div className={`flex items-start gap-2`}>
 <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
 <div className="flex-1">
 <p className={`font-medium text-red-900 mb-1 text-start`}>
 {labels.warning}
 </p>
 <p className={`text-sm text-red-800 text-start`}>
 {labels.warningMessage}
 </p>
 </div>
 </div>
 </div>
 )}

 {/* Duplicate Records Preview */}
 <div>
 <div className={`flex items-center justify-between mb-3`}>
 <h3 className={`text-lg font-semibold text-gray-900 text-start`}>
 {labels.duplicateList}
 </h3>
 <button
 onClick={handleDownloadReport}
 className={`flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors`}
 >
 <Download className="w-4 h-4" />
 <span>{labels.downloadReport}</span>
 </button>
 </div>

 <div className="bg-red-50 border border-red-200 rounded-lg overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-red-100 border-b border-red-200">
 <tr>
 <th className={`px-4 py-2 text-sm font-medium text-red-900 text-start`}>
 {labels.row}
 </th>
 <th className={`px-4 py-2 text-sm font-medium text-red-900 text-start`}>
 {labels.fields}
 </th>
 <th className={`px-4 py-2 text-sm font-medium text-red-900 text-start`}>
 {labels.reason}
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-red-200">
 {scanResult.duplicates.slice(0, 10).map((dup, index) => (
 <tr key={index} className="hover:bg-red-100">
 <td className={`px-4 py-2 text-sm text-red-900 font-medium text-start`}>
 {dup.rowNumber}
 </td>
 <td className={`px-4 py-2 text-sm text-red-900 text-start`}>
 {dup.duplicateFields.map(field => (
 <div key={field}>
 <span className="font-medium">{field}:</span> {dup.rowData[field]}
 </div>
 ))}
 </td>
 <td className={`px-4 py-2 text-sm text-red-900 text-start`}>
 {dup.reason}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 
 {scanResult.duplicates.length > 10 && (
 <div className="bg-red-100 p-3 text-center border-t border-red-200">
 <p className="text-sm text-red-800">
 {language === 'en' 
 ? `Showing 10 of ${scanResult.duplicates.length} duplicates. Download full report to see all.`
 : `عرض 10 من ${scanResult.duplicates.length} تكرارات. قم بتنزيل التقرير الكامل لرؤية الكل.`}
 </p>
 </div>
 )}
 </div>
 </div>
 </div>

 {/* Footer */}
 <div className={`flex gap-3 p-6 bg-gray-50 border-t border-gray-200`}>
 <button
 onClick={onCancel}
 className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors text-gray-700 font-medium"
 >
 {labels.cancel}
 </button>
 <button
 onClick={handleProceed}
 className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${ selectedAction === 'block' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-yellow-600 text-white hover:bg-yellow-700' }`}
 >
 {selectedAction === 'block' ? labels.blockImport : labels.allowImport}
 </button>
 </div>
 </div>
 </div>
 );
}
