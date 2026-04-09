/**
 * ============================================================================
 * SURVEY IMPORT/EXPORT
 * ============================================================================
 * 
 * Converted from React Native to Web React
 * Simple import/export interface with tab navigation
 * 
 * FEATURES:
 * - Tab navigation (Export/Import)
 * - Export options (Excel, CSV, PDF)
 * - Import file picker
 * - Import history display
 * - Bilingual support (EN/AR) with RTL
 * 
 * ============================================================================
 */

import { useLocation, useSearch } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState } from 'react';
import { FileSpreadsheet, FileText, FileUp, Upload } from 'lucide-react';

export function SurveyImportExport() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const { language, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('export');

  const projectId = searchParams.get('projectId') || '';
  const projectName = searchParams.get('projectName') || '';

  const t = {
    title: language === 'en' ? 'Import / Export' : 'استيراد / تصدير',
    subtitle: language === 'en' ? 'Move data in and out of system' : 'نقل البيانات داخل وخارج النظام',
    back: language === 'en' ? 'Back' : 'رجوع',
    exportTab: language === 'en' ? '⬇️ Export' : '⬇️ تصدير',
    importTab: language === 'en' ? '⬆️ Import' : '⬆️ استيراد',
    exportSurveyData: language === 'en' ? 'Export Survey Data' : 'تصدير بيانات الاستطلاع',
    exportExcel: language === 'en' ? 'Export as Excel' : 'تصدير كملف Excel',
    exportExcelDesc: language === 'en' ? 'XLSX format with all submissions' : 'صيغة XLSX مع جميع التقديمات',
    exportCSV: language === 'en' ? 'Export as CSV' : 'تصدير كملف CSV',
    exportCSVDesc: language === 'en' ? 'CSV format for data analysis' : 'صيغة CSV لتحليل البيانات',
    exportPDF: language === 'en' ? 'Export as PDF' : 'تصدير كملف PDF',
    exportPDFDesc: language === 'en' ? 'PDF report with summary' : 'تقرير PDF مع ملخص',
    importSurveyData: language === 'en' ? 'Import Survey Data' : 'استيراد بيانات الاستطلاع',
    tapToSelect: language === 'en' ? 'Tap to select file' : 'انقر لاختيار الملف',
    supported: language === 'en' ? 'Supported: Excel, CSV, XLSForm' : 'المدعوم: Excel، CSV، XLSForm',
    importHistory: language === 'en' ? 'Import History' : 'سجل الاستيراد',
    noImports: language === 'en' ? 'No recent imports. Select a file to get started.' : 'لا توجد عمليات استيراد حديثة. اختر ملفاً للبدء.',
    exporting: language === 'en' ? 'Exporting' : 'جاري التصدير',
    importing: language === 'en' ? 'Importing' : 'جاري الاستيراد',
  };

  const handleExport = (format: 'excel' | 'csv' | 'pdf') => {
    alert(`${t.exporting} ${format.toUpperCase()}...`);
  };

  const handleImport = () => {
    alert(t.importing);
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className={`flex items-center justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
          <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
          <p className="text-sm text-gray-600 mt-1">{t.subtitle}</p>
        </div>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <span className="text-sm font-medium text-gray-900">{t.back}</span>
        </button>
      </div>

      {/* Tab Buttons */}
      <div className={`flex gap-2 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button
          onClick={() => setActiveTab('export')}
          className={`flex-1 px-4 py-3 rounded-lg transition-colors ${
            activeTab === 'export'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          <span className="text-sm font-semibold">{t.exportTab}</span>
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`flex-1 px-4 py-3 rounded-lg transition-colors ${
            activeTab === 'import'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          <span className="text-sm font-semibold">{t.importTab}</span>
        </button>
      </div>

      {/* Export Tab */}
      {activeTab === 'export' && (
        <div className="space-y-4">
          <h3 className={`text-lg font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.exportSurveyData}
          </h3>

          <div className="space-y-3">
            <button
              onClick={() => handleExport('excel')}
              className={`w-full rounded-xl p-4 flex items-center justify-between bg-white border border-gray-200 hover:bg-gray-50 transition-colors ${
                isRTL ? 'flex-row-reverse' : ''
              }`}
            >
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <FileSpreadsheet className="w-6 h-6 text-green-600" />
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <p className="font-semibold text-gray-900">{t.exportExcel}</p>
                  <p className="text-xs text-gray-600">{t.exportExcelDesc}</p>
                </div>
              </div>
              <span className="text-lg text-gray-400">›</span>
            </button>

            <button
              onClick={() => handleExport('csv')}
              className={`w-full rounded-xl p-4 flex items-center justify-between bg-white border border-gray-200 hover:bg-gray-50 transition-colors ${
                isRTL ? 'flex-row-reverse' : ''
              }`}
            >
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <FileText className="w-6 h-6 text-blue-600" />
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <p className="font-semibold text-gray-900">{t.exportCSV}</p>
                  <p className="text-xs text-gray-600">{t.exportCSVDesc}</p>
                </div>
              </div>
              <span className="text-lg text-gray-400">›</span>
            </button>

            <button
              onClick={() => handleExport('pdf')}
              className={`w-full rounded-xl p-4 flex items-center justify-between bg-white border border-gray-200 hover:bg-gray-50 transition-colors ${
                isRTL ? 'flex-row-reverse' : ''
              }`}
            >
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <FileText className="w-6 h-6 text-red-600" />
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <p className="font-semibold text-gray-900">{t.exportPDF}</p>
                  <p className="text-xs text-gray-600">{t.exportPDFDesc}</p>
                </div>
              </div>
              <span className="text-lg text-gray-400">›</span>
            </button>
          </div>
        </div>
      )}

      {/* Import Tab */}
      {activeTab === 'import' && (
        <div className="space-y-4">
          <h3 className={`text-lg font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.importSurveyData}
          </h3>

          <div className="space-y-3">
            <button
              onClick={handleImport}
              className="w-full rounded-xl p-6 flex flex-col items-center justify-center border-2 border-dashed border-blue-600 hover:bg-blue-50 transition-colors"
            >
              <Upload className="w-12 h-12 text-blue-600 mb-2" />
              <p className="font-semibold text-gray-900 text-center">{t.tapToSelect}</p>
              <p className="text-xs text-gray-600 text-center mt-1">{t.supported}</p>
            </button>

            <div className="p-4 rounded-lg bg-white border border-gray-200">
              <p className={`text-sm font-semibold text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.importHistory}
              </p>
              <p className={`text-xs text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.noImports}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
