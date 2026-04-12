import { formatDate } from '@/utils/formatters';
import { useState, useMemo, useRef } from 'react';
import { RefreshCw, FileText, Download, ChevronDown, ChevronUp, ArrowUp, ArrowDown, AlertTriangle, Printer, Loader2 } from "lucide-react";
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '@/utils/formatters';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useMonthlyReportData } from '@/hooks/useMonthlyReportData';
import { calculateProjectRiskLevel, getRiskLevelBadgeVariant, type RiskLevel } from '@/utils/riskCalculation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ProjectReportPrintView } from "@/components/ProjectReportPrintView";
import { ReportTabSkeleton } from "@/components/ProjectTabSkeletons";
import { useTranslation } from '@/i18n/useTranslation';

interface MonthlyReportTabProps {
 projectId: string;
}

export function MonthlyReportTab({
 projectId }: MonthlyReportTabProps) {
 const { t } = useTranslation();
 // Month selection state
 const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
 const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
 const { language, isRTL } = useLanguage();
const [narratives, setNarratives] = useState({
 progressSummary: "",
 challenges: "",
 mitigationActions: "",
 keyAchievements: "",
 nextSteps: "",
 });

 // State for print modal - MUST be declared before any conditional returns
 const [showPrintModal, setShowPrintModal] = useState(false);
 const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
 const printRef = useRef<HTMLDivElement>(null);
 
 // Server-side PDF generation mutation
 const generatePDFMutation = trpc.projects.generatePDF.useMutation({
 onSuccess: (data) => {
 // Convert base64 to blob and download
 const byteCharacters = atob(data.pdf);
 const byteNumbers = new Array(byteCharacters.length);
 for (let i = 0; i < byteCharacters.length; i++) {
 byteNumbers[i] = byteCharacters.charCodeAt(i);
 }
 const byteArray = new Uint8Array(byteNumbers);
 const blob = new Blob([byteArray], { type: 'application/pdf' });
 
 // Download the PDF
 const url = window.URL.createObjectURL(blob);
 const link = document.createElement('a');
 link.href = url;
 link.download = data.filename;
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 window.URL.revokeObjectURL(url);
 
 toast.success(t.projectDetail.reportDownloadedSuccessfully);
 setIsGeneratingPDF(false);
 },
 onError: (error) => {
 console.error('PDF generation error:', error);
 toast.error(t.projectDetail.failedToGenerateReport);
 setIsGeneratingPDF(false);
 },
 });

 // ✅ AUTHORITATIVE DATA: Read from database tables only - FILTERED BY SELECTED MONTH
 const { data: reportData, loading, error, refresh, generatedAt, periodStart, periodEnd } = useMonthlyReportData(projectId, selectedYear, selectedMonth);

 // Calculate dynamic risk level using the risk calculation utility - MUST be before conditional returns
 const riskCalculation = useMemo(() => {
 if (!reportData || !reportData.project) return { level: 'Low' as const, score: 0, summary: '', factors: [] };
 return calculateProjectRiskLevel({
 startDate: reportData.project?.startDate || '',
 endDate: reportData.project?.endDate || '',
 activitiesTotal: reportData.activities.total,
 activitiesCompleted: reportData.activities.completed,
 indicatorsTotal: reportData.indicators.total,
 indicatorsAchieved: reportData.indicators.achieved,
 tasksTotal: reportData.tasks.total,
 tasksCompleted: reportData.tasks.completed,
 totalBudget: reportData.financial.approvedBudget,
 spent: reportData.financial.actualSpent,
 highRisks: reportData.risks.high,
 mediumRisks: reportData.risks.medium,
 lowRisks: reportData.risks.low,
 });
 }, [reportData]);

 // Loading state
 if (loading) {
 return <ReportTabSkeleton />;
 }

 // Error state
 if (error || !reportData) {
 return (
 <div className="flex items-center justify-center h-96">
 <div className="text-center">
 <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
 <p className="text-red-600 font-medium">{t.projectDetail.failedToLoadProjectReport}</p>
 <p className="text-gray-600 text-sm mt-2">{error?.message || (t.projectDetail.projectNotFound)}</p>
 <button
 onClick={refresh}
 className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
 >
 {t.projectDetail.retry}
 </button>
 </div>
 </div>
 );
 }

 // Calculate days remaining
 const calculateDaysRemaining = () => {
 return reportData.daysRemaining;
 };

 // Get progress color
 const getProgressColor = (progress: number) => {
 if (progress < 50) return "text-red-600";
 if (progress < 80) return "text-yellow-600";
 return "text-green-600";
 };

 // Get progress bar color
 const getProgressBarColor = (progress: number) => {
 if (progress >= 80) return 'bg-green-500';
 if (progress >= 50) return 'bg-yellow-500';
 return 'bg-red-500';
 };

 // Get risk badge variant
 const getRiskColor = (level: string) => {
 switch (level.toLowerCase()) {
 case "high":
 case "critical":
 return "destructive" as const;
 case "medium":
 return "secondary" as const;
 default:
 return "default" as const;
 }
 };

 // Get status color
 const getStatusColor = (status: string) => {
 const statusUpper = status.toUpperCase();
 if (statusUpper.includes('ACHIEVED') || statusUpper.includes('COMPLETED') || statusUpper.includes('ON_TRACK')) {
 return 'bg-green-100 text-green-700 border border-green-300';
 }
 if (statusUpper.includes('ONGOING') || statusUpper.includes('IN_PROGRESS')) {
 return 'bg-blue-100 text-blue-700 border border-blue-300';
 }
 if (statusUpper.includes('PENDING') || statusUpper.includes('NOT_STARTED')) {
 return 'bg-gray-100 text-gray-700 border border-gray-300';
 }
 return 'bg-yellow-100 text-yellow-700 border border-yellow-300';
 };

 // Format date range
 const formatDateRange = () => {
 const start = new Date(reportData.project?.startDate || '').toLocaleDateString(t.projectDetail.enus, {
 year: 'numeric',
 month: 'numeric',
 day: 'numeric'
 });
 const end = new Date(reportData.project?.endDate || '').toLocaleDateString(t.projectDetail.enus, {
 year: 'numeric',
 month: 'numeric',
 day: 'numeric'
 });
 return `${start} — ${end}`;
 };

 // Export to PDF - Opens print-optimized view (preview)
 const handleExportPDF = () => {
 setShowPrintModal(true);
 };
 
 // Generate document-based PDF using server-side Puppeteer
 const handleGenerateDocumentPDF = async () => {
 if (!reportData) return;
 
 setIsGeneratingPDF(true);
 
 generatePDFMutation.mutate({
 projectId: parseInt(projectId),
 language: language as 'en' | 'ar',
 reportData: {
 project: {
 name: reportData.project?.titleEn || 'Unnamed Project',
 code: reportData.project?.projectCode || 'N/A',
 status: reportData.project?.status || 'Unknown',
 startDate: reportData.project?.startDate || '',
 endDate: reportData.project?.endDate || '',
 location: reportData.project?.location || '',
 sectors: reportData.project?.sectors || [],
 currency: reportData.project?.currency || 'USD',
 daysRemaining: reportData.daysRemaining,
 },
 activities: {
 total: reportData.activities.total,
 completed: reportData.activities.completed,
 completionRate: reportData.activities.completionRate,
 details: reportData.activities.details?.map(a => ({
 activityTitle: a.activityTitle || 'Unnamed Activity',
 target: a.target || 100,
 achieved: a.achieved || 0,
 progress: a.progress || 0,
 status: a.status || 'in_progress',
 })) || [],
 },
 indicators: {
 total: reportData.indicators.total,
 achieved: reportData.indicators.achieved,
 averageAchievement: reportData.indicators.averageAchievement,
 details: reportData.indicators.details?.map(i => ({
 name: i.name || 'Unnamed Indicator',
 baseline: i.baseline || 0,
 target: i.target || 0,
 actual: i.actual || 0,
 achievementRate: i.achievementRate || 0,
 })) || [],
 },
 financial: {
 totalBudget: reportData.financial.approvedBudget || 0,
 actualSpent: reportData.financial.actualSpent || 0,
 remaining: (reportData.financial.approvedBudget || 0) - (reportData.financial.actualSpent || 0),
 burnRate: reportData.financial.burnRate || 0,
 },
 riskCalculation: {
 level: riskCalculation.level,
 score: riskCalculation.score,
 summary: riskCalculation.summary,
 factors: riskCalculation.factors || [],
 },
 narratives: {
 progressSummary: narratives.progressSummary || '',
 challenges: narratives.challenges || '',
 mitigationActions: narratives.mitigationActions || '',
 keyAchievements: narratives.keyAchievements || '',
 nextSteps: narratives.nextSteps || '',
 },
 organizationName: reportData.organizationName || 'Organization',
 },
 });
 };

 // Handle actual print
 const handlePrint = () => {
 if (printRef.current) {
 const printContent = printRef.current.innerHTML;
 const printWindow = window.open('', '_blank');
 if (printWindow) {
 printWindow.document.write(`
 <!DOCTYPE html>
 <html dir="${'ltr'}">
 <head>
 <title>${reportData.project?.titleEn || 'Monthly Report'} - ${t.projectDetail.monthlyReport} - ${monthNames[selectedMonth - 1]} ${selectedYear}</title>
 <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">
 <style>
 * { box-sizing: border-box; }
 @page {
 size: A4 portrait;
 margin: 8mm 8mm 10mm 8mm;
 }
 @media print {
 html, body {
 width: 210mm !important;
 height: auto !important;
 margin: 0 !important;
 padding: 0 !important;
 -webkit-print-color-adjust: exact !important;
 print-color-adjust: exact !important;
 }
 .print-report {
 width: 100% !important;
 max-width: none !important;
 margin: 0 !important;
 padding: 0 !important;
 }
 table {
 width: 100% !important;
 }
 .no-break {
 page-break-inside: avoid;
 }
 }
 html, body {
 margin: 0;
 padding: 0;
 width: 100%;
 font-family: 'Inter', Arial, sans-serif;
 }
 .print-report {
 width: 100%;
 max-width: none;
 margin: 0;
 padding: 0;
 }
 table {
 width: 100%;
 border-collapse: collapse;
 }
 th, td {
 padding: 3px 5px;
 text-align: left;
 border: 1px solid #e2e8f0;
 font-size: 8pt;
 }
 th {
 background: #00a8a8;
 color: white;
 font-weight: 600;
 }
 </style>
 </head>
 <body>
 <div class="print-report">
 ${printContent}
 </div>
 </body>
 </html>
 `);
 printWindow.document.close();
 printWindow.focus();
 setTimeout(() => {
 printWindow.print();
 printWindow.close();
 }, 500);
 }
 }
 };

 // Export to Excel
 const handleExportExcel = async () => {
 const workbook = new Workbook();
 
 // Sheet 1: Executive Summary
 const summarySheet = workbook.addWorksheet(t.projectDetail.executiveSummary);
 summarySheet.columns = [
 { header: t.projectDetail.section, key: 'section', width: 40 },
 { header: t.projectDetail.value, key: 'value', width: 30 }
 ];
 // Standardized header styling
 summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
 summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

 const summaryData = [
 { section: t.projectDetail.projectName, value: reportData.project?.titleEn || 'Unnamed Project' },
 { section: t.projectDetail.projectCode4, value: reportData.project?.projectCode || 'N/A' },
 { section: t.projectDetail.projectPeriod, value: formatDateRange() },
 { section: '', value: '' },
 { section: t.projectDetail.implementationProgress, value: `${reportData.activities.completionRate}%` },
 { section: t.projectDetail.indicatorsAchievement, value: `${Math.round(reportData.indicators.averageAchievement)}%` },
 { section: t.projectDetail.budgetBurnRate, value: `${reportData.financial.burnRate}%` },
 { section: t.projectDetail.daysRemaining, value: reportData.daysRemaining.toString() },
 ];
 summaryData.forEach(row => summarySheet.addRow(row));
 
 // Add Excel Table with filters
 summarySheet.addTable({
 name: 'SummaryTable',
 ref: 'A1',
 headerRow: true,
 totalsRow: false,
 style: {
 theme: 'TableStyleMedium2',
 showRowStripes: true,
 },
 columns: [
 { name: t.projectDetail.section, filterButton: true },
 { name: t.projectDetail.value, filterButton: true },
 ],
 rows: summaryData.map(r => [r.section, r.value]),
 });

 // Sheet 2: Activities
 const activitiesSheet = workbook.addWorksheet(t.projectDetail.activities);
 activitiesSheet.columns = [
 { header: t.projectDetail.title, key: 'title', width: 40 },
 { header: t.projectDetail.progress5, key: 'progress', width: 15 },
 { header: t.projectDetail.status, key: 'status', width: 15 }
 ];
 // Standardized header styling
 activitiesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
 activitiesSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

 const activitiesData = reportData.activities.details.map(activity => ({
 title: activity.activityTitle,
 progress: activity.progress,
 status: activity.status
 }));
 activitiesData.forEach(row => activitiesSheet.addRow(row));
 
 // Add Excel Table with filters
 if (activitiesData.length > 0) {
 activitiesSheet.addTable({
 name: 'ActivitiesTable',
 ref: 'A1',
 headerRow: true,
 totalsRow: false,
 style: {
 theme: 'TableStyleMedium2',
 showRowStripes: true,
 },
 columns: [
 { name: t.projectDetail.title, filterButton: true },
 { name: t.projectDetail.progress5, filterButton: true },
 { name: t.projectDetail.status, filterButton: true },
 ],
 rows: activitiesData.map(r => [r.title, r.progress, r.status]),
 });
 }

 // Sheet 3: Indicators
 const indicatorsSheet = workbook.addWorksheet(t.projectDetail.indicators);
 indicatorsSheet.columns = [
 { header: t.projectDetail.code, key: 'code', width: 15 },
 { header: t.projectDetail.title, key: 'title', width: 40 },
 { header: t.projectDetail.baseline, key: 'baseline', width: 12 },
 { header: t.projectDetail.target, key: 'target', width: 12 },
 { header: t.projectDetail.achieved, key: 'achieved', width: 12 },
 { header: t.projectDetail.progress5, key: 'progress', width: 15 }
 ];
 // Standardized header styling
 indicatorsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
 indicatorsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

 const indicatorsData = reportData.indicators.details.map(indicator => ({
 code: indicator.code,
 title: indicator.title,
 baseline: indicator.baseline,
 target: indicator.target,
 achieved: indicator.achieved,
 progress: indicator.progress
 }));
 indicatorsData.forEach(row => indicatorsSheet.addRow(row));
 
 // Add Excel Table with filters
 if (indicatorsData.length > 0) {
 indicatorsSheet.addTable({
 name: 'IndicatorsTable',
 ref: 'A1',
 headerRow: true,
 totalsRow: false,
 style: {
 theme: 'TableStyleMedium2',
 showRowStripes: true,
 },
 columns: [
 { name: t.projectDetail.code, filterButton: true },
 { name: t.projectDetail.title, filterButton: true },
 { name: t.projectDetail.baseline, filterButton: true },
 { name: t.projectDetail.target, filterButton: true },
 { name: t.projectDetail.achieved, filterButton: true },
 { name: t.projectDetail.progress5, filterButton: true },
 ],
 rows: indicatorsData.map(r => [r.code, r.title, r.baseline, r.target, r.achieved, r.progress]),
 });
 }

 // Sheet 4: Financial
 const financialSheet = workbook.addWorksheet(t.projectDetail.financial);
 financialSheet.columns = [
 { header: t.projectDetail.metric, key: 'metric', width: 35 },
 { header: t.projectDetail.amount, key: 'amount', width: 20 }
 ];
 // Standardized header styling
 financialSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
 financialSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

 const financialData = [
 { metric: t.projectDetail.totalBudget, amount: reportData.financial.approvedBudget },
 { metric: t.projectDetail.actualSpent6, amount: reportData.financial.actualSpent },
 { metric: t.projectDetail.remaining, amount: reportData.financial.approvedBudget - reportData.financial.actualSpent },
 { metric: t.projectDetail.burnRate7, amount: reportData.financial.burnRate.toString() },
 ];
 financialData.forEach(row => financialSheet.addRow(row));
 
 // Add Excel Table with filters
 financialSheet.addTable({
 name: 'FinancialTable',
 ref: 'A1',
 headerRow: true,
 totalsRow: false,
 style: {
 theme: 'TableStyleMedium2',
 showRowStripes: true,
 },
 columns: [
 { name: t.projectDetail.metric, filterButton: true },
 { name: t.projectDetail.amount, filterButton: true },
 ],
 rows: financialData.map(r => [r.metric, r.amount]),
 });

 const buffer = await workbook.xlsx.writeBuffer();
 const blob = new Blob([buffer], { 
 type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
 });
 saveAs(blob, `Monthly_Report_${reportData.project?.projectCode || 'Report'}_${selectedYear}-${String(selectedMonth).padStart(2, '0')}.xlsx`);
 };

 // Calculate performance summary from real data
 const performanceSummary = {
 implementationProgress: reportData.activities.completionRate,
 budgetBurnRate: reportData.financial.burnRate,
 activitiesCompleted: reportData.activities.completed,
 activitiesTotal: reportData.activities.total,
 indicatorsAchieved: reportData.indicators.achieved,
 indicatorsTotal: reportData.indicators.total,
 tasksCompleted: reportData.tasks.completed,
 tasksTotal: reportData.tasks.total,
 overallRiskLevel: riskCalculation.level as RiskLevel,
 };

 // Month names for display
 const monthNames = isRTL 
 ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
 : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

 // Get month date range for display
 const getMonthDateRange = () => {
 const start = new Date(selectedYear, selectedMonth - 1, 1);
 const end = new Date(selectedYear, selectedMonth, 0);
 const startStr = start.toLocaleDateString(t.projectDetail.enus, { year: 'numeric', month: 'numeric', day: 'numeric' });
 const endStr = end.toLocaleDateString(t.projectDetail.enus, { year: 'numeric', month: 'numeric', day: 'numeric' });
 return `${startStr} — ${endStr}`;
 };

 return (
 <div className="space-y-6 mt-6">
 {/* Month Selector */}
 <Card>
 <CardHeader>
 <div className="flex items-center justify-between">
 <CardTitle className="text-lg">{t.projectDetail.selectMonthlyReportPeriod}</CardTitle>
 <div className="flex gap-3 items-center">
 <div className="flex items-center gap-2">
 <Label>{t.projectDetail.year}</Label>
 <select 
 value={selectedYear} 
 onChange={(e) => setSelectedYear(parseInt(e.target.value))}
 className="border rounded-md px-3 py-2 text-sm"
 >
 {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(year => (
 <option key={year} value={year}>{year}</option>
 ))}
 </select>
 </div>
 <div className="flex items-center gap-2">
 <Label>{t.projectDetail.month}</Label>
 <select 
 value={selectedMonth} 
 onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
 className="border rounded-md px-3 py-2 text-sm"
 >
 {monthNames.map((name, index) => (
 <option key={index + 1} value={index + 1}>{name}</option>
 ))}
 </select>
 </div>
 </div>
 </div>
 </CardHeader>
 </Card>

 {/* Report Header */}
 <Card>
 <CardHeader>
 <div className="flex items-center justify-between">
 <div className="flex-1 text-start">
 <CardTitle className="text-xl">
 {t.projectDetail.monthlyReport8}
 {monthNames[selectedMonth - 1]} {selectedYear}
 </CardTitle>
 <p className="text-sm text-muted-foreground mt-1">{reportData.project?.titleEn || 'Unnamed Project'}</p>
 <div className="grid grid-cols-2 gap-4 mt-3 text-sm text-start">
 <div>
 <span className="text-muted-foreground">{t.projectDetail.donor}</span>
 <span className="font-medium">N/A</span>
 </div>
 <div>
 <span className="text-muted-foreground">{t.projectDetail.reportPeriod}</span>
 <span className="font-medium">{getMonthDateRange()}</span>
 </div>
 <div>
 <span className="text-muted-foreground">{t.projectDetail.projectPeriod9}</span>
 <span className="font-medium">{formatDateRange()}</span>
 </div>
 <div>
 <span className="text-muted-foreground">{t.projectDetail.generated}</span>
 <span className="font-medium">{new Date().toLocaleDateString(t.projectDetail.enus)}</span>
 </div>
 </div>
 </div>
 <div className="flex gap-2">
 <Button variant="outline" size="sm" onClick={refresh}>
 <RefreshCw className="h-4 w-4 me-2" />
 {t.projectDetail.refreshData}
 </Button>
 <Button size="sm" onClick={handleGenerateDocumentPDF} disabled={isGeneratingPDF}>
 {isGeneratingPDF ? (
 <Loader2 className="h-4 w-4 animate-spin me-2" />
 ) : (
 <Download className="h-4 w-4 me-2" />
 )}
 {isGeneratingPDF 
 ? (t.projectDetail.generating) 
 : (t.projectDetail.downloadPdf)}
 </Button>
 <Button size="sm" variant="outline" onClick={handleExportPDF}>
 <Printer className="h-4 w-4 me-2" />
 {t.projectDetail.preview}
 </Button>
 </div>
 </div>
 </CardHeader>
 </Card>

 {/* Overall Project Performance Summary */}
 <Card>
 <CardHeader>
 <CardTitle>{t.projectDetail.overallProjectPerformanceSummary}</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
 <div className="text-center p-4 border rounded-lg">
 <p className="text-sm text-muted-foreground mb-1">{t.projectDetail.implementationProgress}</p>
 <p className={`text-2xl font-bold ${getProgressColor(performanceSummary.implementationProgress)}`}>
 {performanceSummary.implementationProgress}%
 </p>
 </div>
 <div className="text-center p-4 border rounded-lg">
 <p className="text-sm text-muted-foreground mb-1">{t.projectDetail.budgetBurnRate}</p>
 <p className={`text-2xl font-bold ${getProgressColor(100 - performanceSummary.budgetBurnRate)}`}>
 {performanceSummary.budgetBurnRate.toFixed(1)}%
 </p>
 </div>
 <div className="text-center p-4 border rounded-lg">
 <p className="text-sm text-muted-foreground mb-1">{t.projectDetail.activities}</p>
 <p className="text-2xl font-bold">
 {performanceSummary.activitiesCompleted}/{performanceSummary.activitiesTotal}
 </p>
 </div>
 <div className="text-center p-4 border rounded-lg">
 <p className="text-sm text-muted-foreground mb-1">{t.projectDetail.indicators}</p>
 <p className="text-2xl font-bold">
 {performanceSummary.indicatorsAchieved}/{performanceSummary.indicatorsTotal}
 </p>
 </div>
 <div className="text-center p-4 border rounded-lg">
 <p className="text-sm text-muted-foreground mb-1">{t.projectDetail.tasks}</p>
 <p className="text-2xl font-bold">
 {performanceSummary.tasksCompleted}/{performanceSummary.tasksTotal}
 </p>
 </div>
 <div className="text-center p-4 border rounded-lg">
 <p className="text-sm text-muted-foreground mb-1">{t.projectDetail.riskLevel}</p>
 <Badge variant={getRiskLevelBadgeVariant(performanceSummary.overallRiskLevel)} className="text-sm">
 {performanceSummary.overallRiskLevel === 'Critical' ? (t.projectDetail.critical) :
 performanceSummary.overallRiskLevel === 'High' ? (t.projectDetail.high) :
 performanceSummary.overallRiskLevel === 'Medium' ? (t.projectDetail.medium) :
 (t.projectDetail.low)}
 </Badge>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Activities Progress */}
 <Card>
 <CardHeader>
 <CardTitle>{t.projectDetail.activitiesProgress}</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="space-y-4">
 {reportData.activities.details.length === 0 ? (
 <p className="text-muted-foreground text-center py-8">{t.projectDetail.noActivitiesFound}</p>
 ) : (
 reportData.activities.details.map((activity, index) => {
 const progress = activity.progress;
 return (
 <div key={activity.id || index} className="border rounded-lg p-4">
 <div className={`flex items-center justify-between mb-2`}>
 <div className="flex-1">
 <p className="font-medium">{activity.activityTitle}</p>
 </div>
 <Badge variant={activity.status === "COMPLETED" ? "default" : activity.status === "IN_PROGRESS" ? "secondary" : "outline"}>
 {activity.status.replace('_', ' ')}
 </Badge>
 </div>
 <div className={`grid grid-cols-3 gap-4 text-sm mb-2 ${isRTL ? 'text-end' : ''}`}>
 <div>
 <span className="text-muted-foreground">{t.projectDetail.target10}</span>
 <span className="font-medium">100%</span>
 </div>
 <div>
 <span className="text-muted-foreground">{t.projectDetail.achieved11}</span>
 <span className="font-medium">{progress}%</span>
 </div>
 <div>
 <span className="text-muted-foreground">{t.projectDetail.progress12}</span>
 <span className={`font-medium ${getProgressColor(progress)}`}>
 {progress.toFixed(1)}%
 </span>
 </div>
 </div>
 <Progress value={progress} className="h-2" />
 </div>
 );
 })
 )}
 </div>
 </CardContent>
 </Card>

 {/* Indicators Achievement */}
 <Card>
 <CardHeader>
 <CardTitle>{t.projectDetail.indicatorsAchievement}</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="overflow-x-auto -mx-6 px-6">
 {reportData.indicators.details.length === 0 ? (
 <p className="text-muted-foreground text-center py-8">{t.projectDetail.noIndicatorsFound}</p>
 ) : (
 <table className="w-full text-sm">
 <thead className="border-b">
 <tr className={'text-start'}>
 <th className="pb-3 font-medium min-w-[300px]">{t.projectDetail.indicatorName}</th>
 <th className={`pb-3 font-medium text-end min-w-[80px]`}>{t.projectDetail.baseline}</th>
 <th className={`pb-3 font-medium text-end min-w-[80px]`}>{t.projectDetail.target}</th>
 <th className={`pb-3 font-medium text-end min-w-[80px]`}>{t.projectDetail.achieved}</th>
 <th className={`pb-3 font-medium text-end min-w-[100px]`}>{t.projectDetail.achievement}</th>
 <th className="pb-3 font-medium min-w-[80px]">{t.projectDetail.status}</th>
 </tr>
 </thead>
 <tbody>
 {reportData.indicators.details.map((indicator, index) => {
 const achievement = indicator.target > 0 
 ? ((indicator.achieved - indicator.baseline) / (indicator.target - indicator.baseline)) * 100 
 : 0;
 return (
 <tr key={indicator.code || index} className="border-b">
 <td className="py-3 break-words whitespace-normal">{indicator.title}</td>
 <td className={`py-3 text-end`}>{indicator.baseline}</td>
 <td className={`py-3 text-end`}>{indicator.target}</td>
 <td className={`py-3 font-medium text-end`}>{indicator.achieved}</td>
 <td className={`py-3 font-medium text-end ${getProgressColor(achievement)}`}>
 {achievement.toFixed(1)}%
 </td>
 <td className="py-3">
 <div className="w-24">
 <Progress value={Math.min(achievement, 100)} className="h-2" />
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 )}
 </div>
 </CardContent>
 </Card>

 {/* Budget & Financial Performance */}
 <Card>
 <CardHeader>
 <CardTitle>{t.projectDetail.budgetFinancialPerformance}</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="grid gap-4 md:grid-cols-4 mb-4">
 <div className="text-center p-4 border rounded-lg">
 <p className="text-sm text-muted-foreground mb-1">{t.projectDetail.totalBudget}</p>
 <p className="text-xl font-bold text-green-600">
 {formatCurrency(reportData.financial.approvedBudget, reportData.project?.currency || 'EUR', language)}
 </p>
 </div>
 <div className="text-center p-4 border rounded-lg">
 <p className="text-sm text-muted-foreground mb-1">{t.projectDetail.actualSpent6}</p>
 <p className="text-xl font-bold">
 {formatCurrency(reportData.financial.actualSpent, reportData.project?.currency || 'EUR', language)}
 </p>
 </div>
 <div className="text-center p-4 border rounded-lg">
 <p className="text-sm text-muted-foreground mb-1">{t.projectDetail.remainingBalance}</p>
 <p className="text-xl font-bold text-green-600">
 {formatCurrency(reportData.financial.approvedBudget - reportData.financial.actualSpent, reportData.project?.currency || 'EUR', language)}
 </p>
 </div>
 <div className="text-center p-4 border rounded-lg">
 <p className="text-sm text-muted-foreground mb-1">{t.projectDetail.burnRate13}</p>
 <p className={`text-xl font-bold ${reportData.financial.burnRate > 80 ? 'text-red-600' : 'text-blue-600'}`}>
 {reportData.financial.burnRate.toFixed(1)}%
 </p>
 </div>
 </div>
 <div>
 <p className="text-sm text-muted-foreground mb-2">{t.projectDetail.budgetUtilization}</p>
 <Progress value={reportData.financial.burnRate} className="h-3" />
 </div>
 </CardContent>
 </Card>

 {/* Risk Snapshot */}
 <Card>
 <CardHeader>
 <div className={`flex items-center justify-between`}>
 <CardTitle>{t.projectDetail.riskSnapshot}</CardTitle>
 <Badge variant={getRiskLevelBadgeVariant(riskCalculation.level)} className="text-sm px-3 py-1">
 {isRTL ? (
 riskCalculation.level === 'Critical' ? 'حرج' :
 riskCalculation.level === 'High' ? 'عالي' :
 riskCalculation.level === 'Medium' ? 'متوسط' : 'منخفض'
 ) : riskCalculation.level}
 </Badge>
 </div>
 <p className="text-sm text-muted-foreground mt-2">{riskCalculation.summary}</p>
 </CardHeader>
 <CardContent>
 {/* Risk Score Bar */}
 <div className="mb-6">
 <div className={`flex items-center justify-between mb-2`}>
 <span className="text-sm font-medium">{t.projectDetail.riskScore}</span>
 <span className="text-sm font-bold">{riskCalculation.score}/100</span>
 </div>
 <div className="w-full bg-gray-200 rounded-full h-3">
 <div 
 className={`h-3 rounded-full transition-all ${ riskCalculation.score >= 60 ? 'bg-red-600' : riskCalculation.score >= 40 ? 'bg-orange-500' : riskCalculation.score >= 20 ? 'bg-yellow-500' : 'bg-green-500' }`}
 style={{ width: `${riskCalculation.score}%` }}
 />
 </div>
 </div>

 {/* Risk Factors */}
 <div className="space-y-3">
 <h4 className="text-sm font-semibold mb-3">{t.projectDetail.riskFactors}</h4>
 {riskCalculation.factors.map((factor, index) => (
 <div key={index} className={`flex items-center gap-3 p-3 rounded-lg border ${ factor.status === 'critical' ? 'bg-red-50 border-red-200' : factor.status === 'warning' ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200' }`}>
 <div className={`w-3 h-3 rounded-full flex-shrink-0 ${ factor.status === 'critical' ? 'bg-red-500' : factor.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500' }`} />
 <div className="flex-1">
 <div className={`flex items-center justify-between`}>
 <span className="text-sm font-medium">{factor.name}</span>
 <span className="text-sm text-muted-foreground">{factor.value}%</span>
 </div>
 <p className="text-xs text-muted-foreground mt-1">{factor.description}</p>
 </div>
 </div>
 ))}
 </div>

 {/* Logged Risks Summary */}
 <div className="grid grid-cols-4 gap-3 mt-6">
 <div className="text-center p-3 bg-red-50 rounded-lg">
 <div className="text-2xl font-bold text-red-600">0</div>
 <div className="text-xs text-gray-600 mt-1">{t.projectDetail.critical14}</div>
 </div>
 <div className="text-center p-3 bg-orange-50 rounded-lg">
 <div className="text-2xl font-bold text-orange-600">{reportData.risks.high}</div>
 <div className="text-xs text-gray-600 mt-1">{t.projectDetail.high15}</div>
 </div>
 <div className="text-center p-3 bg-yellow-50 rounded-lg">
 <div className="text-2xl font-bold text-yellow-600">{reportData.risks.medium}</div>
 <div className="text-xs text-gray-600 mt-1">{t.projectDetail.medium16}</div>
 </div>
 <div className="text-center p-3 bg-green-50 rounded-lg">
 <div className="text-2xl font-bold text-green-600">{reportData.risks.low}</div>
 <div className="text-xs text-gray-600 mt-1">{t.projectDetail.low17}</div>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Narrative Sections */}
 <Card>
 <CardHeader>
 <CardTitle>{t.projectDetail.narrativeSections}</CardTitle>
 <p className="text-sm text-muted-foreground">{t.projectDetail.editableTextBlocksForTheReport}</p>
 </CardHeader>
 <CardContent className="space-y-4">
 <div>
 <Label htmlFor="progressSummary">{t.projectDetail.progressSummary}</Label>
 <Textarea
 id="progressSummary"
 value={narratives.progressSummary}
 onChange={(e) => setNarratives({ ...narratives, progressSummary: e.target.value })}
 placeholder={t.projectDetail.summarizeOverallProgress}
 rows={3}
 />
 </div>
 <div>
 <Label htmlFor="challenges">{t.projectDetail.challenges}</Label>
 <Textarea
 id="challenges"
 value={narratives.challenges}
 onChange={(e) => setNarratives({ ...narratives, challenges: e.target.value })}
 placeholder={t.projectDetail.describeKeyChallengesFaced}
 rows={3}
 />
 </div>
 <div>
 <Label htmlFor="mitigationActions">{t.projectDetail.mitigationActions}</Label>
 <Textarea
 id="mitigationActions"
 value={narratives.mitigationActions}
 onChange={(e) => setNarratives({ ...narratives, mitigationActions: e.target.value })}
 placeholder={t.projectDetail.outlineMitigationStrategies}
 rows={3}
 />
 </div>
 <div>
 <Label htmlFor="keyAchievements">{t.projectDetail.keyAchievements}</Label>
 <Textarea
 id="keyAchievements"
 value={narratives.keyAchievements}
 onChange={(e) => setNarratives({ ...narratives, keyAchievements: e.target.value })}
 placeholder={t.projectDetail.highlightMajorAccomplishments}
 rows={3}
 />
 </div>
 <div>
 <Label htmlFor="nextSteps">{t.projectDetail.nextSteps}</Label>
 <Textarea
 id="nextSteps"
 value={narratives.nextSteps}
 onChange={(e) => setNarratives({ ...narratives, nextSteps: e.target.value })}
 placeholder={t.projectDetail.outlineUpcomingActivities}
 rows={3}
 />
 </div>
 <Button variant="outline">
 {t.projectDetail.saveNarratives}
 </Button>
 </CardContent>
 </Card>

 {/* Print-Optimized PDF Modal */}
 <Dialog open={showPrintModal} onOpenChange={setShowPrintModal}>
 <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle className="flex items-center justify-between">
 <span>{t.projectDetail.printPreviewProjectReport}</span>
 <div className="flex gap-2">
 <Button variant="outline" size="sm" onClick={() => setShowPrintModal(false)}>
 {t.projectDetail.close}
 </Button>
 <Button size="sm" onClick={handlePrint}>
 <Printer className="h-4 w-4 me-2" />
 {t.projectDetail.printPdf}
 </Button>
 </div>
 </DialogTitle>
 </DialogHeader>
 <div className="border rounded-lg overflow-hidden bg-white">
 <ProjectReportPrintView
 ref={printRef}
 reportData={reportData}
 riskCalculation={riskCalculation}
 narratives={narratives}
 language={language as 'en' | 'ar'}
 organizationName={reportData?.organizationName || 'Organization'}
 reportType="monthly"
 reportPeriodStart={`${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`}
 reportPeriodEnd={`${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${new Date(selectedYear, selectedMonth, 0).getDate()}`}
 generatedAt={generatedAt}
 />
 </div>
 </DialogContent>
 </Dialog>
 </div>
 );
}
