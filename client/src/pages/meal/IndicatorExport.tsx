/**
 * ============================================================================
 * INDICATOR EXPORT - Export, Evidence & History for indicators
 * ============================================================================
 * 
 * Converted from Figma React Native (indicator-export.tsx) to Web React
 * Provides PDF/Excel export, evidence documents, and update history
 * Uses tRPC backend (no mock data)
 * 
 * ============================================================================
 */
import { useState, useMemo } from 'react';
import { useNavigate, useParams } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import { Download, FileText, FileSpreadsheet, Calendar, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export function IndicatorExportPage() {
 const { t } = useTranslation();
 const navigate = useNavigate();
 const params = useParams();
 const indicatorId = params?.id ? parseInt(params.id) : null;
 const { language, isRTL} = useLanguage();
 const [exporting, setExporting] = useState(false);

 const labels = {
 backToDetails: t.meal.backToIndicatorDetails,
 title: t.meal.exportEvidence,
 subtitle: t.meal.exportIndicatorDataAndManageSupporting,
 exportPDF: t.meal.exportAsPdf,
 exportExcel: t.meal.exportAsExcel,
 exportSection: t.meal.exportOptions,
 historySection: t.meal.updateHistory,
 noHistory: t.meal.noUpdateHistoryAvailable,
 loading: t.meal.loading,
 value: t.meal.value,
 pdfDesc: t.meal.downloadAFormattedPdfReportOf,
 excelDesc: t.meal.downloadRawDataInExcelFormat,
 success: t.meal.exportCompletedSuccessfully,
 error: t.meal.exportFailedPleaseTryAgain,
 indicator: t.meal.indicator9,
 target: t.meal.target,
 achieved: t.meal.achieved,
 baseline: t.meal.baseline,
 status: t.meal.status,
 male: t.meal.male10,
 female: t.meal.female11,
 boys: t.meal.boys,
 girls: t.meal.girls,
 };

 // Fetch indicator
 const { data: indicator, isLoading: loadingIndicator } = trpc.indicators.getById.useQuery(
 { id: indicatorId! },
 { enabled: !!indicatorId }
 );

 // Fetch data entries
 const { data: dataEntries = [], isLoading: loadingEntries } = trpc.mealIndicatorData.getByIndicator.useQuery(
 { indicatorId: indicatorId! },
 { enabled: !!indicatorId }
 );

 const sortedEntries = useMemo(() => {
 return [...dataEntries]
 .filter((e: any) => e.reportingDate)
 .sort((a: any, b: any) => new Date(b.reportingDate).getTime() - new Date(a.reportingDate).getTime());
 }, [dataEntries]);

 const handleExportPDF = async () => {
 if (!indicator) return;
 setExporting(true);
 try {
 const doc = new jsPDF();
 const name = language === 'en' ? indicator.indicatorName : (indicator.indicatorNameAr || indicator.indicatorName);

 doc.setFontSize(18);
 doc.text('Indicator Report', 20, 20);
 doc.setFontSize(12);
 doc.text(`${labels.indicator}: ${name}`, 20, 35);
 doc.text(`${labels.status}: ${indicator.status}`, 20, 45);
 doc.text(`${labels.baseline}: ${indicator.baseline || '0'}`, 20, 55);
 doc.text(`${labels.target}: ${indicator.target || '0'}`, 20, 65);
 doc.text(`${labels.achieved}: ${indicator.achievedValue || '0'}`, 20, 75);

 if (sortedEntries.length > 0) {
 doc.text('Data Entries', 20, 95);
 let y = 105;
 doc.setFontSize(10);
 doc.text('Date', 20, y);
 doc.text('Value', 60, y);
 doc.text('Male', 90, y);
 doc.text('Female', 110, y);
 doc.text('Boys', 130, y);
 doc.text('Girls', 150, y);
 doc.text('Notes', 170, y);
 y += 8;

 sortedEntries.forEach((entry: any) => {
 if (y > 270) { doc.addPage(); y = 20; }
 doc.text(new Date(entry.reportingDate).toLocaleDateString(), 20, y);
 doc.text(String(entry.value || '0'), 60, y);
 doc.text(String(entry.maleCount || 0), 90, y);
 doc.text(String(entry.femaleCount || 0), 110, y);
 doc.text(String(entry.boysCount || 0), 130, y);
 doc.text(String(entry.girlsCount || 0), 150, y);
 doc.text((entry.notes || '-').substring(0, 20), 170, y);
 y += 8;
 });
 }

 doc.save(`indicator_${indicator.id}_report.pdf`);
 toast.success(labels.success);
 } catch (err) {
 toast.error(labels.error);
 } finally {
 setExporting(false);
 }
 };

 const handleExportExcel = async () => {
 if (!indicator) return;
 setExporting(true);
 try {
 const name = language === 'en' ? indicator.indicatorName : (indicator.indicatorNameAr || indicator.indicatorName);
 const headers = ['Date', 'Value', 'Male', 'Female', 'Boys', 'Girls', 'Notes'];
 const rows = sortedEntries.map((entry: any) => [
 entry.reportingDate ? new Date(entry.reportingDate).toLocaleDateString() : '',
 entry.value || '0',
 entry.maleCount || 0,
 entry.femaleCount || 0,
 entry.boysCount || 0,
 entry.girlsCount || 0,
 entry.notes || '',
 ]);

 const csvContent = [
 [`Indicator: ${name}`],
 [`Status: ${indicator.status}`],
 [`Baseline: ${indicator.baseline || '0'}`],
 [`Target: ${indicator.target || '0'}`],
 [`Achieved: ${indicator.achievedValue || '0'}`],
 [],
 headers,
 ...rows,
 ].map(row => row.join(',')).join('\n');

 const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
 const url = URL.createObjectURL(blob);
 const link = document.createElement('a');
 link.href = url;
 link.download = `indicator_${indicator.id}_data.csv`;
 link.click();
 URL.revokeObjectURL(url);
 toast.success(labels.success);
 } catch (err) {
 toast.error(labels.error);
 } finally {
 setExporting(false);
 }
 };

 const isLoading = loadingIndicator || loadingEntries;

 if (isLoading) {
 return (
 <div className="flex items-center justify-center min-h-screen p-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="text-center">
 <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
 <p className="text-sm text-muted-foreground">{labels.loading}</p>
 </div>
 </div>
 );
 }

 return (
 <div className="p-6">
 {/* Back */}
 <BackButton onClick={() => navigate(indicatorId ? `/organization/meal/indicators/${indicatorId}` : '/organization/meal')} label={labels.backToDetails} />

 {/* Header */}
 <div className="mb-6">
 <div className="flex items-center gap-3 mb-2">
 <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
 <Download className="h-5 w-5 text-green-600" />
 </div>
 <div>
 <h1 className="text-2xl font-bold text-foreground">{labels.title}</h1>
 <p className="text-sm text-muted-foreground">{labels.subtitle}</p>
 </div>
 </div>
 </div>

 {/* Export Options */}
 <div className="mb-6">
 <h2 className="text-lg font-semibold text-gray-900 mb-4">{labels.exportSection}</h2>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <button
 onClick={handleExportPDF}
 disabled={exporting}
 className="rounded-xl p-6 bg-white border border-gray-200 hover:border-red-300 hover:shadow-md transition-all text-start disabled:opacity-50"
 >
 <div className={`flex items-center gap-4`}>
 <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
 <FileText className="h-6 w-6 text-red-600" />
 </div>
 <div className="flex-1">
 <h3 className="text-base font-semibold text-gray-900">{labels.exportPDF}</h3>
 <p className="text-sm text-gray-500 mt-1">{labels.pdfDesc}</p>
 </div>
 </div>
 </button>

 <button
 onClick={handleExportExcel}
 disabled={exporting}
 className="rounded-xl p-6 bg-white border border-gray-200 hover:border-green-300 hover:shadow-md transition-all text-start disabled:opacity-50"
 >
 <div className={`flex items-center gap-4`}>
 <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
 <FileSpreadsheet className="h-6 w-6 text-green-600" />
 </div>
 <div className="flex-1">
 <h3 className="text-base font-semibold text-gray-900">{labels.exportExcel}</h3>
 <p className="text-sm text-gray-500 mt-1">{labels.excelDesc}</p>
 </div>
 </div>
 </button>
 </div>
 </div>

 {/* Update History */}
 <div className="mb-6">
 <h2 className="text-lg font-semibold text-gray-900 mb-4">{labels.historySection}</h2>
 {sortedEntries.length === 0 ? (
 <div className="rounded-xl p-8 bg-white border border-gray-200 text-center">
 <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
 <p className="text-sm text-gray-500">{labels.noHistory}</p>
 </div>
 ) : (
 <div className="space-y-3">
 {sortedEntries.map((entry: any, index: number) => (
 <div key={entry.id || index} className="rounded-xl p-4 bg-white border border-gray-200">
 <div className={`flex items-start gap-3`}>
 <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
 <CheckCircle className="h-4 w-4 text-blue-600" />
 </div>
 <div className="flex-1">
 <div className={`flex justify-between items-start`}>
 <div>
 <p className="text-sm font-semibold text-gray-900">
 {labels.value}: {entry.value || '0'}
 </p>
 <p className="text-xs text-gray-500 mt-0.5">
 {labels.male}: {entry.maleCount || 0} | {labels.female}: {entry.femaleCount || 0} | {labels.boys}: {entry.boysCount || 0} | {labels.girls}: {entry.girlsCount || 0}
 </p>
 </div>
 <span className="text-xs text-gray-400">
 {entry.reportingDate ? new Date(entry.reportingDate).toLocaleDateString() : '-'}
 </span>
 </div>
 {entry.notes && (
 <p className="text-xs text-gray-600 mt-2 italic">{entry.notes}</p>
 )}
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 );
}

// Keep named export for backward compatibility with App.tsx import
export function IndicatorExport() {
 return <IndicatorExportPage />;
}

export default IndicatorExportPage;
