import { RotateCcw, X, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ImportHistoryRecord } from '@/contexts/ImportHistoryContext';
import { useState } from 'react';

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
  const { language, isRTL } = useLanguage();
  const [retryMode, setRetryMode] = useState<'ALL' | 'FAILED_ONLY'>('FAILED_ONLY');

  if (!isOpen) return null;

  const t = {
    title: language === 'en' ? 'Retry Import' : 'إعادة محاولة الاستيراد',
    file: language === 'en' ? 'File' : 'الملف',
    module: language === 'en' ? 'Module' : 'الوحدة',
    previousErrors: language === 'en' ? 'Previous Errors' : 'الأخطاء السابقة',
    allowDuplicates: language === 'en' ? 'Allow Duplicates' : 'السماح بالتكرارات',
    yes: language === 'en' ? 'Yes' : 'نعم',
    no: language === 'en' ? 'No' : 'لا',
    retryMode: language === 'en' ? 'Retry Mode' : 'وضع إعادة المحاولة',
    retryAll: language === 'en' ? 'Retry All Rows' : 'إعادة محاولة جميع الصفوف',
    retryFailedOnly: language === 'en' ? 'Retry Failed Rows Only' : 'إعادة محاولة الصفوف الفاشلة فقط',
    retryAllDesc: language === 'en' 
      ? 'Re-import all rows from the original file'
      : 'إعادة استيراد جميع الصفوف من الملف الأصلي',
    retryFailedDesc: language === 'en' 
      ? 'Only retry the rows that failed in the previous import'
      : 'إعادة محاولة الصفوف التي فشلت فقط في الاستيراد السابق',
    warning: language === 'en' ? 'This will:' : 'سيؤدي هذا إلى:',
    warningItem1: language === 'en' ? 'Reuse the same file' : 'إعادة استخدام نفس الملف',
    warningItem2: language === 'en' ? 'Re-run validation' : 'إعادة تشغيل التحقق',
    warningItem3: language === 'en' ? 'Create a new import record' : 'إنشاء سجل استيراد جديد',
    warningItem4All: language === 'en' ? 'Process all rows again' : 'معالجة جميع الصفوف مرة أخرى',
    warningItem4Failed: language === 'en' ? 'Process only failed rows' : 'معالجة الصفوف الفاشلة فقط',
    retryCount: language === 'en' ? 'Retry Attempt' : 'محاولة إعادة',
    of: language === 'en' ? 'of' : 'من',
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
    retryImport: language === 'en' ? 'Retry Import' : 'إعادة محاولة الاستيراد',
    recommended: language === 'en' ? 'Recommended' : 'موصى به'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="p-2 rounded-full bg-green-100">
              <RotateCcw className="w-6 h-6 text-green-600" />
            </div>
            <h2 className={`text-xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.title}
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
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-sm text-gray-600 mb-1">{t.file}</p>
              <p className="text-sm font-medium text-gray-900">{importRecord.fileName}</p>
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-sm text-gray-600 mb-1">{t.module}</p>
              <p className="text-sm font-medium text-gray-900">{importRecord.moduleName}</p>
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-sm text-gray-600 mb-1">{t.previousErrors}</p>
              <p className="text-sm font-medium text-red-600">{importRecord.errorCount}</p>
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-sm text-gray-600 mb-1">{t.allowDuplicates}</p>
              <p className="text-sm font-medium text-gray-900">
                {importRecord.allowDuplicates ? t.yes : t.no}
              </p>
            </div>
          </div>

          {/* Retry Count Warning */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <AlertTriangle className="w-5 h-5 text-purple-600" />
              <p className={`text-sm font-medium text-purple-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.retryCount} {importRecord.retryCount + 1} {t.of} {importRecord.maxRetries}
              </p>
            </div>
          </div>

          {/* Retry Mode Selection */}
          <div>
            <h3 className={`text-lg font-semibold text-gray-900 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.retryMode}
            </h3>
            
            <div className="space-y-3">
              {/* Retry Failed Only */}
              <label 
                className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  retryMode === 'FAILED_ONLY' 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 hover:border-green-300'
                } ${isRTL ? 'flex-row-reverse' : ''}`}
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
                  <div className={`flex items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <p className={`font-medium text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t.retryFailedOnly}
                    </p>
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                      {t.recommended}
                    </span>
                  </div>
                  <p className={`text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.retryFailedDesc}
                  </p>
                  <p className={`text-sm font-medium text-green-700 mt-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {importRecord.errorCount} rows will be retried
                  </p>
                </div>
              </label>

              {/* Retry All */}
              <label 
                className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  retryMode === 'ALL' 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 hover:border-green-300'
                } ${isRTL ? 'flex-row-reverse' : ''}`}
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
                  <p className={`font-medium text-gray-900 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.retryAll}
                  </p>
                  <p className={`text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.retryAllDesc}
                  </p>
                  <p className={`text-sm font-medium text-gray-700 mt-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {importRecord.totalRows} rows will be retried
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Warning Box */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className={`flex items-start gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className={`font-medium text-yellow-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.warning}
                </p>
                <ul className={`text-sm text-yellow-800 space-y-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <li className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full"></span>
                    <span>{t.warningItem1}</span>
                  </li>
                  <li className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full"></span>
                    <span>{t.warningItem2}</span>
                  </li>
                  <li className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full"></span>
                    <span>{t.warningItem3}</span>
                  </li>
                  <li className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full"></span>
                    <span>{retryMode === 'ALL' ? t.warningItem4All : t.warningItem4Failed}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex gap-3 p-6 bg-gray-50 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors text-gray-700 font-medium"
          >
            {t.cancel}
          </button>
          <button
            onClick={() => onConfirm(retryMode)}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
          >
            {t.retryImport}
          </button>
        </div>
      </div>
    </div>
  );
}
