/**
 * ============================================================================
 * SURVEY EXPORT
 * ============================================================================
 * 
 * Converted from React Native to Web React
 * Comprehensive export interface with format selection and options
 * 
 * FEATURES:
 * - Survey form selection
 * - Format selection (Excel, CSV, PDF)
 * - Export options (include audit trail)
 * - Export info panel
 * - Compliance notice
 * - Loading states
 * - Bilingual support (EN/AR) with RTL
 * 
 * ============================================================================
 */

import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState } from 'react';
import { FileSpreadsheet, FileText, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export function SurveyExport() {
 const { t } = useTranslation();
 const navigate = useNavigate();
 const { language, isRTL } = useLanguage();
 const [selectedFormat, setSelectedFormat] = useState<'excel' | 'csv' | 'pdf'>('excel');
 const [selectedSurvey, setSelectedSurvey] = useState<number | null>(null);
 const [includeAudit, setIncludeAudit] = useState(true);
 const [isExporting, setIsExporting] = useState(false);

 const labels = {
 title: t.mealSurvey.exportSurveyData,
 subtitle: t.mealSurvey.generateDonorreadyReportsInMultipleFormats,
 back: t.mealSurvey.back,
 step1: t.mealSurvey.k1SelectSurveyForm,
 step2: t.mealSurvey.k2SelectExportFormat,
 step3: t.mealSurvey.k3ExportOptions,
 excel: 'Excel (.xlsx)',
 excelDesc: t.mealSurvey.multisheetWorkbookWithMetadataRawData,
 csv: 'CSV (.csv)',
 csvDesc: t.mealSurvey.flatFormatCompatibleWithMostAnalysis,
 pdf: t.mealSurvey.pdfReportPdf,
 pdfDesc: t.mealSurvey.formattedReportWithChartsAndSummary,
 includeAudit: t.mealSurvey.includeAuditTrail,
 includeAuditDesc: t.mealSurvey.addSubmissionDetailsVerifierInfoAnd,
 exportDetails: t.mealSurvey.exportDetails,
 detailsList: '• Only completed and verified submissions are included\n• Soft-deleted submissions are automatically excluded\n• All exports are logged for compliance and audit purposes\n• KOBO-compatible format ensures donor compatibility\n• Includes disaggregation by gender, age, location, and disability',
 generateExport: t.mealSurvey.generateDownloadExport,
 generating: t.mealSurvey.generatingExport,
 compliance: t.mealSurvey.complianceDataProtection,
 complianceText: 'This export complies with donor requirements and data protection standards. All exports are:\n• Logged with timestamp, user, and format\n• Restricted to verified submissions only\n• Compatible with KOBO and ODK platforms\n• Encrypted during transmission\n• Retained in audit trail for 2 years',
 };

 // Mock survey forms
 const surveyForms = [
 { id: 1, title: t.mealSurvey.beneficiarySatisfactionSurvey, description: t.mealSurvey.q12025 },
 { id: 2, title: t.mealSurvey.serviceQualityAssessment, description: t.mealSurvey.monthly },
 ];

 const formats = [
 { format: 'excel' as const, label: labels.excel, description: labels.excelDesc, icon: FileSpreadsheet, color: 'text-green-600' },
 { format: 'csv' as const, label: labels.csv, description: labels.csvDesc, icon: FileText, color: 'text-blue-600' },
 { format: 'pdf' as const, label: labels.pdf, description: labels.pdfDesc, icon: FileText, color: 'text-red-600' },
 ];

 const handleExport = () => {
 if (!selectedSurvey) {
 alert(t.mealSurvey.pleaseSelectASurveyForm);
 return;
 }

 setIsExporting(true);
 setTimeout(() => {
 setIsExporting(false);
 alert(t.mealSurvey.exportSuccessful);
 }, 2000);
 };

 return (
 <div className="p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Back Navigation */}
 <BackButton onClick={() => navigate('/organization/meal/survey')} label={t.mealSurvey.backToSurveys} />
 {/* Header */}
 <div className={`flex items-center justify-between`}>
 <div className={`flex-1 text-start`}>
 <h1 className="text-2xl font-bold text-gray-900">{labels.title}</h1>
 <p className="text-sm text-gray-600 mt-1">{labels.subtitle}</p>
 </div>
 </div>

 {/* Survey Selection */}
 <div>
 <h3 className={`text-lg font-bold text-gray-900 mb-3 text-start`}>
 {labels.step1}
 </h3>
 <div className="space-y-2">
 {surveyForms.map((form) => (
 <button
 key={form.id}
 onClick={() => setSelectedSurvey(form.id)}
 className={`w-full p-4 rounded-lg border flex items-center justify-between transition-colors ${ selectedSurvey === form.id ? 'border-blue-600 bg-blue-50' : 'border-gray-300 bg-white hover:bg-gray-50' }`}
 >
 <div className={`flex-1 text-start`}>
 <p className={`font-semibold ${selectedSurvey === form.id ? 'text-blue-600' : 'text-gray-900'}`}>
 {form.title}
 </p>
 <p className="text-xs text-gray-600 mt-1">{form.description}</p>
 </div>
 <div
 className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${ selectedSurvey === form.id ? 'border-blue-600 bg-blue-600' : 'border-gray-300' }`}
 >
 {selectedSurvey === form.id && <span className="text-white text-xs">✓</span>}
 </div>
 </button>
 ))}
 </div>
 </div>

 {/* Format Selection */}
 <div>
 <h3 className={`text-lg font-bold text-gray-900 mb-3 text-start`}>
 {labels.step2}
 </h3>
 <div className="space-y-2">
 {formats.map((option) => {
 const Icon = option.icon;
 return (
 <button
 key={option.format}
 onClick={() => setSelectedFormat(option.format)}
 className={`w-full p-4 rounded-lg border flex items-center justify-between transition-colors ${ selectedFormat === option.format ? 'border-blue-600 bg-blue-50' : 'border-gray-300 bg-white hover:bg-gray-50' }`}
 >
 <div className={`flex-1 text-start`}>
 <div className={`flex items-center gap-2 mb-1`}>
 <Icon className={`w-5 h-5 ${option.color}`} />
 <p className={`font-semibold ${selectedFormat === option.format ? 'text-blue-600' : 'text-gray-900'}`}>
 {option.label}
 </p>
 </div>
 <p className="text-xs text-gray-600">{option.description}</p>
 </div>
 <div
 className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${ selectedFormat === option.format ? 'border-blue-600 bg-blue-600' : 'border-gray-300' }`}
 >
 {selectedFormat === option.format && <span className="text-white text-xs">✓</span>}
 </div>
 </button>
 );
 })}
 </div>
 </div>

 {/* Export Options */}
 <div>
 <h3 className={`text-lg font-bold text-gray-900 mb-3 text-start`}>
 {labels.step3}
 </h3>
 <button
 onClick={() => setIncludeAudit(!includeAudit)}
 className={`w-full p-4 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors flex items-center justify-between ${ ''}`}
 >
 <div className={`flex-1 text-start`}>
 <p className="font-semibold text-gray-900">{labels.includeAudit}</p>
 <p className="text-xs text-gray-600 mt-1">{labels.includeAuditDesc}</p>
 </div>
 <div
 className={`w-6 h-6 rounded border-2 flex items-center justify-center ${ includeAudit ? 'border-blue-600 bg-blue-600' : 'border-gray-300' }`}
 >
 {includeAudit && <span className="text-white text-xs">✓</span>}
 </div>
 </button>
 </div>

 {/* Export Info */}
 <div className="p-4 rounded-lg bg-white border border-gray-200">
 <p className={`text-sm font-semibold text-gray-900 mb-2 text-start`}>
 {labels.exportDetails}
 </p>
 <p className={`text-xs text-gray-600 leading-relaxed whitespace-pre-line text-start`}>
 {labels.detailsList}
 </p>
 </div>

 {/* Export Button */}
 <button
 onClick={handleExport}
 disabled={!selectedSurvey || isExporting}
 className={`w-full p-4 rounded-lg flex items-center justify-center transition-colors ${ selectedSurvey && !isExporting ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed' }`}
 >
 {isExporting ? (
 <span className="flex items-center gap-2">
 <Loader2 className="w-5 h-5 animate-spin" />
 <span className="font-semibold">{labels.generating}</span>
 </span>
 ) : (
 <span className="font-semibold text-lg">{labels.generateExport}</span>
 )}
 </button>

 {/* Compliance Notice */}
 <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
 <p className={`text-xs font-semibold text-gray-900 mb-2 text-start`}>
 {labels.compliance}
 </p>
 <p className={`text-xs text-gray-600 leading-relaxed whitespace-pre-line text-start`}>
 {labels.complianceText}
 </p>
 </div>
 </div>
 );
}
