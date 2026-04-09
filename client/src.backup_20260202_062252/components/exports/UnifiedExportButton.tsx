/**
 * ============================================================================
 * UNIFIED EXPORT BUTTON COMPONENT
 * ============================================================================
 * 
 * SYSTEM-WIDE STANDARD for all export functionality
 * 
 * FEATURES:
 * - Single "Export Excel" button (replaces "Export to Excel" + "Export Template")
 * - Data-aware: Exports data if exists, template if empty
 * - Optional modal for user choice
 * - Full bilingual support (EN/AR with RTL)
 * - Consistent behavior across ALL modules
 * 
 * USAGE:
 * <UnifiedExportButton
 *   hasData={filteredItems.length > 0}
 *   onExportData={handleExportWithData}
 *   onExportTemplate={handleExportTemplate}
 *   moduleName="Projects"
 *   showModal={true}  // Optional: show choice modal
 * />
 * 
 * ============================================================================
 */

import { useState } from 'react';
import { Download, FileSpreadsheet, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface UnifiedExportButtonProps {
  hasData: boolean;
  onExportData: () => Promise<void> | void;
  onExportTemplate: () => Promise<void> | void;
  moduleName?: string;
  showModal?: boolean;
  disabled?: boolean;
  className?: string;
}

export function UnifiedExportButton({
  hasData,
  onExportData,
  onExportTemplate,
  moduleName = '',
  showModal = true,
  disabled = false,
  className = ''
}: UnifiedExportButtonProps) {
  const { language, isRTL } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const t = {
    exportExcel: language === 'en' ? 'Export Excel' : 'تصدير إكسل',
    exportModalTitle: language === 'en' ? 'Export Excel File' : 'تصدير ملف إكسل',
    exportWithData: language === 'en' ? 'Export with Data' : 'تصدير مع البيانات',
    exportTemplate: language === 'en' ? 'Export Blank Template' : 'تصدير نموذج فارغ',
    exportWithDataDesc: language === 'en' 
      ? 'Export all current records with data'
      : 'تصدير جميع السجلات الحالية مع البيانات',
    exportTemplateDesc: language === 'en'
      ? 'Export empty template for data import'
      : 'تصدير نموذج فارغ لاستيراد البيانات',
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
    exporting: language === 'en' ? 'Exporting...' : 'جاري التصدير...'
  };

  const handleClick = () => {
    if (!showModal) {
      // Direct export: use data if exists, template otherwise
      if (hasData) {
        handleExport('data');
      } else {
        handleExport('template');
      }
    } else {
      // Show modal for user choice
      setIsModalOpen(true);
    }
  };

  const handleExport = async (type: 'data' | 'template') => {
    setIsExporting(true);
    try {
      if (type === 'data') {
        await onExportData();
      } else {
        await onExportTemplate();
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      alert(language === 'en' 
        ? 'Export failed. Please try again.' 
        : 'فشل التصدير. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      {/* Unified Export Button */}
      <button
        onClick={handleClick}
        disabled={disabled || isExporting}
        className={`px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''} ${className}`}
      >
        <Download className="w-4 h-4" />
        {isExporting ? t.exporting : t.exportExcel}
      </button>

      {/* Export Modal (Optional) */}
      {showModal && isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full shadow-xl">
            {/* Header */}
            <div className={`flex items-center justify-between p-6 border-b border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-lg font-semibold text-gray-900">
                {t.exportModalTitle}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isExporting}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Options */}
            <div className="p-6 space-y-3">
              {/* Export with Data */}
              {hasData && (
                <button
                  onClick={() => handleExport('data')}
                  disabled={isExporting}
                  className={`w-full p-4 border-2 border-green-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5 text-green-600" />
                    </div>
                    <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      <div className="font-semibold text-gray-900 mb-1">
                        {t.exportWithData}
                      </div>
                      <div className="text-sm text-gray-600">
                        {t.exportWithDataDesc}
                      </div>
                    </div>
                  </div>
                </button>
              )}

              {/* Export Blank Template */}
              <button
                onClick={() => handleExport('template')}
                disabled={isExporting}
                className={`w-full p-4 border-2 border-blue-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isRTL ? 'text-right' : 'text-left'}`}
              >
                <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="font-semibold text-gray-900 mb-1">
                      {t.exportTemplate}
                    </div>
                    <div className="text-sm text-gray-600">
                      {t.exportTemplateDesc}
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className={`flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isExporting}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 disabled:opacity-50"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}