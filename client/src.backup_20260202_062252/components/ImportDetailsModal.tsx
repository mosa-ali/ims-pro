import { formatDate } from '@/utils/formatters';
import { X, Upload, CheckCircle2, XCircle, AlertTriangle, Calendar, User, FileText, Download } from 'lucide-react';
import { formatDate } from '@/utils/formatters';
import { useLanguage } from '@/contexts/LanguageContext';
import { ImportHistoryRecord } from '@/contexts/ImportHistoryContext';
import { useImportHistory } from '@/contexts/ImportHistoryContext';

interface ImportDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  importRecord: ImportHistoryRecord;
}

export function ImportDetailsModal({ isOpen, onClose, importRecord }: ImportDetailsModalProps) {
  const { language, isRTL } = useLanguage();
  const { downloadErrorReport } = useImportHistory();

  if (!isOpen) return null;

  const t = {
    title: language === 'en' ? 'Import Details' : 'تفاصيل الاستيراد',
    close: language === 'en' ? 'Close' : 'إغلاق',
    fileInfo: language === 'en' ? 'File Information' : 'معلومات الملف',
    fileName: language === 'en' ? 'File Name' : 'اسم الملف',
    fileType: language === 'en' ? 'File Type' : 'نوع الملف',
    module: language === 'en' ? 'Module' : 'الوحدة',
    targetTable: language === 'en' ? 'Target Table' : 'الجدول المستهدف',
    project: language === 'en' ? 'Project' : 'المشروع',
    globalImport: language === 'en' ? 'Global Import' : 'استيراد عام',
    importSettings: language === 'en' ? 'Import Settings' : 'إعدادات الاستيراد',
    allowDuplicates: language === 'en' ? 'Allow Duplicates' : 'السماح بالتكرارات',
    yes: language === 'en' ? 'Yes' : 'نعم',
    no: language === 'en' ? 'No' : 'لا',
    importBy: language === 'en' ? 'Imported By' : 'استورد بواسطة',
    importDate: language === 'en' ? 'Import Date' : 'تاريخ الاستيراد',
    status: language === 'en' ? 'Status' : 'الحالة',
    summary: language === 'en' ? 'Summary' : 'ملخص',
    totalRows: language === 'en' ? 'Total Rows' : 'إجمالي الصفوف',
    successRows: language === 'en' ? 'Success Rows' : 'الصفوف الناجحة',
    errorRows: language === 'en' ? 'Error Rows' : 'الصفوف الخاطئة',
    rollbackApplied: language === 'en' ? 'Rollback Applied' : 'تم التراجع',
    retryInfo: language === 'en' ? 'Retry Information' : 'معلومات إعادة المحاولة',
    retryOf: language === 'en' ? 'Retry of Import' : 'إعادة محاولة الاستيراد',
    retryCount: language === 'en' ? 'Retry Count' : 'عدد المحاولات',
    maxRetries: language === 'en' ? 'Max Retries' : 'الحد الأقصى',
    errorReport: language === 'en' ? 'Error Report' : 'تقرير الأخطاء',
    downloadErrorReport: language === 'en' ? 'Download Error Report' : 'تحميل تقرير الأخطاء',
    noErrors: language === 'en' ? 'No errors to display' : 'لا توجد أخطاء للعرض',
    rowNumber: language === 'en' ? 'Row' : 'الصف',
    field: language === 'en' ? 'Field' : 'الحقل',
    error: language === 'en' ? 'Error' : 'الخطأ',
    value: language === 'en' ? 'Value' : 'القيمة',
    completed: language === 'en' ? 'Completed' : 'مكتمل',
    failed: language === 'en' ? 'Failed' : 'فشل',
    partial: language === 'en' ? 'Partial' : 'جزئي',
    inProgress: language === 'en' ? 'In Progress' : 'قيد التنفيذ',
    rolledBack: language === 'en' ? 'Rolled Back' : 'تم التراجع',
    timeline: language === 'en' ? 'Import Timeline' : 'الجدول الزمني للاستيراد',
    showingFirst: language === 'en' ? 'Showing first 10 errors' : 'عرض أول 10 أخطاء'
  };

  const getStatusInfo = (status: string) => {
    const statusMap = {
      'COMPLETED': { 
        icon: <CheckCircle2 className="w-5 h-5" />, 
        bg: 'bg-green-100', 
        text: 'text-green-700',
        label: t.completed
      },
      'FAILED': { 
        icon: <XCircle className="w-5 h-5" />, 
        bg: 'bg-red-100', 
        text: 'text-red-700',
        label: t.failed
      },
      'PARTIAL': { 
        icon: <AlertTriangle className="w-5 h-5" />, 
        bg: 'bg-yellow-100', 
        text: 'text-yellow-700',
        label: t.partial
      },
      'IN_PROGRESS': { 
        icon: <Upload className="w-5 h-5" />, 
        bg: 'bg-blue-100', 
        text: 'text-blue-700',
        label: t.inProgress
      },
      'ROLLED_BACK': { 
        icon: <XCircle className="w-5 h-5" />, 
        bg: 'bg-gray-100', 
        text: 'text-gray-700',
        label: t.rolledBack
      }
    };
    return statusMap[status as keyof typeof statusMap] || statusMap.FAILED;
  };

  const statusInfo = getStatusInfo(importRecord.status);
  const hasErrors = importRecord.errorReportData && importRecord.errorReportData.length > 0;
  const errorsToShow = hasErrors ? importRecord.errorReportData!.slice(0, 10) : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`p-2 rounded-full ${statusInfo.bg}`}>
              {statusInfo.icon}
            </div>
            <div>
              <h2 className={`text-xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.title}
              </h2>
              <p className={`text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                {importRecord.fileName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* File Information */}
          <div>
            <h3 className={`text-lg font-semibold text-gray-900 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.fileInfo}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <InfoField label={t.fileName} value={importRecord.fileName} isRTL={isRTL} />
              <InfoField label={t.fileType} value={importRecord.fileType.toUpperCase()} isRTL={isRTL} />
              <InfoField label={t.module} value={importRecord.moduleName} isRTL={isRTL} />
              <InfoField label={t.targetTable} value={importRecord.targetTable} isRTL={isRTL} />
              <InfoField 
                label={t.project} 
                value={importRecord.projectName || t.globalImport} 
                isRTL={isRTL} 
              />
              <InfoField 
                label={t.status} 
                value={
                  <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bg} ${statusInfo.text}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                } 
                isRTL={isRTL} 
              />
            </div>
          </div>

          {/* Import Settings */}
          <div>
            <h3 className={`text-lg font-semibold text-gray-900 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.importSettings}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <InfoField 
                label={t.allowDuplicates} 
                value={importRecord.allowDuplicates ? t.yes : t.no} 
                isRTL={isRTL} 
              />
              <InfoField 
                label={t.importBy} 
                value={importRecord.importedByName} 
                isRTL={isRTL} 
              />
              <InfoField 
                label={t.importDate} 
                value={formatDate(new Date(importRecord.importDateTime), language)} 
                isRTL={isRTL} 
              />
              <InfoField 
                label={t.rollbackApplied} 
                value={importRecord.rollbackApplied ? t.yes : t.no} 
                isRTL={isRTL} 
              />
            </div>
          </div>

          {/* Summary Statistics */}
          <div>
            <h3 className={`text-lg font-semibold text-gray-900 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.summary}
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className={`text-sm text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.totalRows}
                </p>
                <p className={`text-2xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {importRecord.totalRows}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className={`text-sm text-green-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.successRows}
                </p>
                <p className={`text-2xl font-bold text-green-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {importRecord.successCount}
                </p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <p className={`text-sm text-red-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.errorRows}
                </p>
                <p className={`text-2xl font-bold text-red-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {importRecord.errorCount}
                </p>
              </div>
            </div>
          </div>

          {/* Retry Information */}
          {importRecord.retryOfImportId && (
            <div>
              <h3 className={`text-lg font-semibold text-gray-900 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.retryInfo}
              </h3>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <InfoField 
                    label={t.retryOf} 
                    value={importRecord.retryOfImportId} 
                    isRTL={isRTL} 
                  />
                  <InfoField 
                    label={t.retryCount} 
                    value={`${importRecord.retryCount} / ${importRecord.maxRetries}`} 
                    isRTL={isRTL} 
                  />
                </div>
              </div>
            </div>
          )}

          {/* Error Report Preview */}
          {hasErrors && (
            <div>
              <div className={`flex items-center justify-between mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <h3 className={`text-lg font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.errorReport}
                </h3>
                <button
                  onClick={() => downloadErrorReport(importRecord.id)}
                  className={`flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <Download className="w-4 h-4" />
                  <span>{t.downloadErrorReport}</span>
                </button>
              </div>
              
              <p className={`text-sm text-gray-600 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.showingFirst}
              </p>

              <div className="bg-red-50 border border-red-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-red-100 border-b border-red-200">
                      <tr>
                        <th className={`px-4 py-2 text-sm font-medium text-red-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                          {t.rowNumber}
                        </th>
                        <th className={`px-4 py-2 text-sm font-medium text-red-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                          {t.field}
                        </th>
                        <th className={`px-4 py-2 text-sm font-medium text-red-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                          {t.error}
                        </th>
                        <th className={`px-4 py-2 text-sm font-medium text-red-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                          {t.value}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-200">
                      {errorsToShow.map((error, index) => (
                        <tr key={index} className="hover:bg-red-100">
                          <td className={`px-4 py-2 text-sm text-red-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                            {error.rowNumber}
                          </td>
                          <td className={`px-4 py-2 text-sm text-red-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                            {error.field || 'N/A'}
                          </td>
                          <td className={`px-4 py-2 text-sm text-red-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                            {error.errorMessage}
                          </td>
                          <td className={`px-4 py-2 text-sm text-red-900 font-mono ${isRTL ? 'text-right' : 'text-left'}`}>
                            {error.originalValue || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {!hasErrors && importRecord.status !== 'IN_PROGRESS' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-600" />
              <p className="text-green-800 font-medium">{t.noErrors}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex gap-3 p-6 bg-gray-50 border-t border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors font-medium"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}

interface InfoFieldProps {
  label: string;
  value: string | React.ReactNode;
  isRTL: boolean;
}

function InfoField({ label, value, isRTL }: InfoFieldProps) {
  return (
    <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      {typeof value === 'string' ? (
        <p className="text-sm font-medium text-gray-900">{value}</p>
      ) : (
        value
      )}
    </div>
  );
}
