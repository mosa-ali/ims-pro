/**
 * ============================================================================
 * INDICATOR EXPORT & VERIFICATION COMPONENTS
 * ============================================================================
 * 
 * Converted from React Native to Web React
 * Export buttons, evidence verification, and history components
 * 
 * FEATURES:
 * - Export PDF/Excel buttons
 * - Evidence verification section
 * - Indicator history/audit trail
 * - Bilingual support (EN/AR) with RTL
 * 
 * ============================================================================
 */

import { useLanguage } from '@/contexts/LanguageContext';
import { Download, FileText, Check, X, FileUp } from 'lucide-react';

export function ExportButtons({ projectId }: { projectId?: string }) {
  const { language, isRTL } = useLanguage();

  const t = {
    exportPDF: language === 'en' ? '📄 Export PDF' : '📄 تصدير PDF',
    exportExcel: language === 'en' ? '📊 Export Excel' : '📊 تصدير Excel',
    generating: language === 'en' ? 'Generating...' : 'جاري الإنشاء...',
    success: language === 'en' ? 'Success' : 'نجح',
    pdfSuccess: language === 'en' ? 'PDF exported successfully' : 'تم تصدير PDF بنجاح',
    excelSuccess: language === 'en' ? 'Excel file exported successfully' : 'تم تصدير ملف Excel بنجاح',
    error: language === 'en' ? 'Error' : 'خطأ',
    pdfError: language === 'en' ? 'Failed to export PDF' : 'فشل تصدير PDF',
    excelError: language === 'en' ? 'Failed to export Excel' : 'فشل تصدير Excel',
  };

  const handleExportPDF = () => {
    // TODO: Implement actual PDF export
    alert(t.pdfSuccess);
  };

  const handleExportExcel = () => {
    // TODO: Implement actual Excel export
    alert(t.excelSuccess);
  };

  return (
    <div className={`flex gap-3 p-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
      <button
        onClick={handleExportPDF}
        className="flex-1 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
      >
        <span className="text-sm font-bold text-white flex items-center justify-center gap-2">
          <FileText className="w-4 h-4" /> {t.exportPDF}
        </span>
      </button>

      <button
        onClick={handleExportExcel}
        className="flex-1 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
      >
        <span className="text-sm font-bold text-white flex items-center justify-center gap-2">
          <Download className="w-4 h-4" /> {t.exportExcel}
        </span>
      </button>
    </div>
  );
}

export function EvidenceVerificationSection({
  evidence,
  onVerify,
}: {
  evidence: any[];
  onVerify?: (evidenceId: number, status: string) => void;
}) {
  const { language, isRTL } = useLanguage();

  const t = {
    title: language === 'en' ? 'Evidence & Verification Status' : 'الأدلة وحالة التحقق',
    uploaded: language === 'en' ? 'Uploaded:' : 'تم الرفع:',
    by: language === 'en' ? 'by' : 'بواسطة',
    verified: language === 'en' ? 'Verified:' : 'تم التحقق:',
    rejectionReason: language === 'en' ? 'Rejection Reason:' : 'سبب الرفض:',
    verify: language === 'en' ? '✓ Verify' : '✓ تحقق',
    reject: language === 'en' ? '✕ Reject' : '✕ رفض',
    viewFile: language === 'en' ? '📎 View Evidence File' : '📎 عرض ملف الأدلة',
    noEvidence: language === 'en' ? 'No evidence uploaded' : 'لم يتم رفع أدلة',
  };

  const getVerificationColor = (status: string) => {
    switch (status) {
      case 'Verified':
        return '#4CAF50';
      case 'Rejected':
        return '#F44336';
      case 'Pending':
      default:
        return '#FFC107';
    }
  };

  return (
    <div className="p-6">
      <h3 className={`text-lg font-bold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
        {t.title}
      </h3>

      {evidence && evidence.length > 0 ? (
        evidence.map((item, index) => (
          <div key={index} className="mb-4 p-4 rounded-lg bg-white border border-gray-200">
            {/* Header */}
            <div className={`flex justify-between items-start mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                <p className="font-bold text-sm text-gray-900">{item.evidenceType}</p>
                <p className="text-xs text-gray-600 mt-1">{item.fileName}</p>
              </div>

              <span
                className="px-3 py-1 rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: getVerificationColor(item.verificationStatus) }}
              >
                {item.verificationStatus}
              </span>
            </div>

            {/* Details */}
            <div className="mb-3">
              <p className={`text-xs text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.uploaded} {new Date(item.uploadedAt).toLocaleDateString()} {t.by} {item.uploadedBy}
              </p>
              {item.verifiedAt && (
                <p className={`text-xs text-gray-600 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.verified} {new Date(item.verifiedAt).toLocaleDateString()} {t.by} {item.verifiedBy}
                </p>
              )}
            </div>

            {/* Rejection Reason */}
            {item.rejectionReason && (
              <div className="p-2 rounded bg-red-50 mb-3">
                <p className={`text-xs font-semibold text-red-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.rejectionReason}
                </p>
                <p className={`text-xs text-red-600 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {item.rejectionReason}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            {item.verificationStatus === 'Pending' && onVerify && (
              <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button
                  onClick={() => onVerify(item.id, 'Verified')}
                  className="flex-1 py-2 rounded bg-green-600 hover:bg-green-700 transition-colors"
                >
                  <span className="text-xs font-bold text-white flex items-center justify-center gap-1">
                    <Check className="w-3 h-3" /> {t.verify}
                  </span>
                </button>
                <button
                  onClick={() => onVerify(item.id, 'Rejected')}
                  className="flex-1 py-2 rounded bg-red-600 hover:bg-red-700 transition-colors"
                >
                  <span className="text-xs font-bold text-white flex items-center justify-center gap-1">
                    <X className="w-3 h-3" /> {t.reject}
                  </span>
                </button>
              </div>
            )}

            {/* File Link */}
            {item.fileUrl && (
              <button className="mt-3 w-full p-2 rounded bg-blue-600 hover:bg-blue-700 transition-colors">
                <span className="text-xs font-semibold text-white flex items-center justify-center gap-1">
                  <FileUp className="w-3 h-3" /> {t.viewFile}
                </span>
              </button>
            )}
          </div>
        ))
      ) : (
        <p className="text-gray-500">{t.noEvidence}</p>
      )}
    </div>
  );
}

export function IndicatorHistoryPanel({ history }: { history: any[] }) {
  const { language, isRTL } = useLanguage();

  const t = {
    title: language === 'en' ? 'Indicator Audit Trail' : 'سجل تدقيق المؤشر',
    valueChange: language === 'en' ? 'Value Change:' : 'تغيير القيمة:',
    noHistory: language === 'en' ? 'No history available' : 'لا يوجد سجل متاح',
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'Create':
        return '#4CAF50';
      case 'Update':
        return '#2196F3';
      case 'Correction':
        return '#FF9800';
      default:
        return '#6B7280';
    }
  };

  return (
    <div className="p-6">
      <h3 className={`text-lg font-bold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
        {t.title}
      </h3>

      {history && history.length > 0 ? (
        history.map((entry, index) => (
          <div
            key={index}
            className={`mb-4 p-4 rounded-lg bg-white border-l-4 ${isRTL ? 'border-l-0 border-r-4' : ''}`}
            style={{ borderColor: getActionColor(entry.changeType) }}
          >
            {/* Header */}
            <div className={`flex justify-between items-start mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div>
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span
                    className="px-2 py-1 rounded text-xs font-bold text-white"
                    style={{ backgroundColor: getActionColor(entry.changeType) }}
                  >
                    {entry.changeType}
                  </span>
                  <span className="text-xs font-semibold text-gray-900">{entry.changedBy}</span>
                </div>
              </div>
              <span className="text-xs text-gray-600">
                {new Date(entry.changedAt).toLocaleDateString()} {new Date(entry.changedAt).toLocaleTimeString()}
              </span>
            </div>

            {/* Change Details */}
            <div className="bg-gray-50 p-3 rounded mb-2">
              <p className={`text-xs font-semibold text-gray-900 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.valueChange}
              </p>
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-xs text-red-600">{entry.oldValue || '—'}</span>
                <span className="text-xs font-bold text-gray-600">→</span>
                <span className="text-xs text-green-600">{entry.newValue || '—'}</span>
              </div>
            </div>

            {/* Comment */}
            {entry.comment && (
              <div className="p-2 rounded bg-white">
                <p className={`text-xs italic text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                  "{entry.comment}"
                </p>
              </div>
            )}
          </div>
        ))
      ) : (
        <p className="text-gray-500">{t.noHistory}</p>
      )}
    </div>
  );
}
