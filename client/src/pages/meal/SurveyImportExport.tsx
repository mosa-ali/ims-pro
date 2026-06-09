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

import { useNavigate } from '@/lib/router-compat';
import { useSearch } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState } from 'react';
import { FileSpreadsheet, FileText, FileUp, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export function SurveyImportExport() {
 const { t } = useTranslation();
 const navigate = useNavigate();
 const searchString = useSearch();
 const searchParams = new URLSearchParams(searchString);
 const { language, isRTL } = useLanguage();
 const [activeTab, setActiveTab] = useState<'import' | 'export'>('export');

 const projectId = searchParams.get('projectId') || '';
 const projectName = searchParams.get('projectName') || '';

 const labels = {
 title: t.mealSurvey.importExport,
 subtitle: t.mealSurvey.moveDataInAndOutOf,
 back: t.mealSurvey.back,
 exportTab: t.mealSurvey.export9,
 importTab: t.mealSurvey.import,
 exportSurveyData: t.mealSurvey.exportSurveyData10,
 exportExcel: t.mealSurvey.exportAsExcel,
 exportExcelDesc: t.mealSurvey.xlsxFormatWithAllSubmissions,
 exportCSV: t.mealSurvey.exportAsCsv,
 exportCSVDesc: t.mealSurvey.csvFormatForDataAnalysis,
 exportPDF: t.mealSurvey.exportAsPdf,
 exportPDFDesc: t.mealSurvey.pdfReportWithSummary,
 importSurveyData: t.mealSurvey.importSurveyData,
 tapToSelect: t.mealSurvey.tapToSelectFile,
 supported: t.mealSurvey.supportedExcelCsvXlsform,
 importHistory: t.mealSurvey.importHistory,
 noImports: t.mealSurvey.noRecentImportsSelectAFile,
 exporting: t.mealSurvey.exporting,
 importing: t.mealSurvey.importing,
 };

 const handleExport = (format: 'excel' | 'csv' | 'pdf') => {
 alert(`${labels.exporting} ${format.toUpperCase()}...`);
 };

 const handleImport = () => {
 alert(labels.importing);
 };

 return (
 <div className="p-6 space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Back Navigation */}
 <BackButton onClick={() => navigate('/organization/meal/survey')} label={t.mealSurvey.backToSurveys} />
 {/* Header */}
 <div className={`flex items-center justify-between mb-2`}>
 <div className={`flex-1 text-start`}>
 <h1 className="text-2xl font-bold text-gray-900">{labels.title}</h1>
 <p className="text-sm text-gray-600 mt-1">{labels.subtitle}</p>
 </div>
 </div>

 {/* Tab Buttons */}
 <div className={`flex gap-2 mb-4`}>
 <button
 onClick={() => setActiveTab('export')}
 className={`flex-1 px-4 py-3 rounded-lg transition-colors ${ activeTab === 'export' ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50' }`}
 >
 <span className="text-sm font-semibold">{labels.exportTab}</span>
 </button>
 <button
 onClick={() => setActiveTab('import')}
 className={`flex-1 px-4 py-3 rounded-lg transition-colors ${ activeTab === 'import' ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50' }`}
 >
 <span className="text-sm font-semibold">{labels.importTab}</span>
 </button>
 </div>

 {/* Export Tab */}
 {activeTab === 'export' && (
 <div className="space-y-4">
 <h3 className={`text-lg font-bold text-gray-900 text-start`}>
 {labels.exportSurveyData}
 </h3>

 <div className="space-y-3">
 <button
 onClick={() => handleExport('excel')}
 className={`w-full rounded-xl p-4 flex items-center justify-between bg-white border border-gray-200 hover:bg-gray-50 transition-colors ${ ''}`}
 >
 <div className={`flex items-center gap-3`}>
 <FileSpreadsheet className="w-6 h-6 text-green-600" />
 <div className={'text-start'}>
 <p className="font-semibold text-gray-900">{labels.exportExcel}</p>
 <p className="text-xs text-gray-600">{labels.exportExcelDesc}</p>
 </div>
 </div>
 <span className="text-lg text-gray-400">›</span>
 </button>

 <button
 onClick={() => handleExport('csv')}
 className={`w-full rounded-xl p-4 flex items-center justify-between bg-white border border-gray-200 hover:bg-gray-50 transition-colors ${ ''}`}
 >
 <div className={`flex items-center gap-3`}>
 <FileText className="w-6 h-6 text-blue-600" />
 <div className={'text-start'}>
 <p className="font-semibold text-gray-900">{labels.exportCSV}</p>
 <p className="text-xs text-gray-600">{labels.exportCSVDesc}</p>
 </div>
 </div>
 <span className="text-lg text-gray-400">›</span>
 </button>

 <button
 onClick={() => handleExport('pdf')}
 className={`w-full rounded-xl p-4 flex items-center justify-between bg-white border border-gray-200 hover:bg-gray-50 transition-colors ${ ''}`}
 >
 <div className={`flex items-center gap-3`}>
 <FileText className="w-6 h-6 text-red-600" />
 <div className={'text-start'}>
 <p className="font-semibold text-gray-900">{labels.exportPDF}</p>
 <p className="text-xs text-gray-600">{labels.exportPDFDesc}</p>
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
 <h3 className={`text-lg font-bold text-gray-900 text-start`}>
 {labels.importSurveyData}
 </h3>

 <div className="space-y-3">
 <button
 onClick={handleImport}
 className="w-full rounded-xl p-6 flex flex-col items-center justify-center border-2 border-dashed border-blue-600 hover:bg-blue-50 transition-colors"
 >
 <Upload className="w-12 h-12 text-blue-600 mb-2" />
 <p className="font-semibold text-gray-900 text-center">{labels.tapToSelect}</p>
 <p className="text-xs text-gray-600 text-center mt-1">{labels.supported}</p>
 </button>

 <div className="p-4 rounded-lg bg-white border border-gray-200">
 <p className={`text-sm font-semibold text-gray-900 mb-2 text-start`}>
 {labels.importHistory}
 </p>
 <p className={`text-xs text-gray-600 text-start`}>
 {labels.noImports}
 </p>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
