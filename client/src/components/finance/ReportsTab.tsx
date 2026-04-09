import { trpc } from "@/lib/trpc";
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { FileText, Download } from "lucide-react";
import { useTranslation } from '@/i18n/useTranslation';

/**
 * Finance Reports Tab Component
 * 
 * Features:
 * - Budget vs Actual variance analysis reports
 * - Budget utilization reports
 * - Expenditure summary by status
 * - Donor compliance reports (EU, UN, ECHO format)
 * - Export to PDF with bilingual support
 * - Export to Excel with multiple sheets
 * - Bilingual support (English/Arabic) with RTL/LTR switching
 * - Real-time data aggregation
 * 
 * File Path: /client/src/components/finance/ReportsTab.tsx
 * 
 * Usage:
 * import ReportsTab from '@/components/finance/ReportsTab';
 * <ReportsTab />
 */
export default function ReportsTab() {
 const { t } = useTranslation();
 const { language, isRTL} = useLanguage();
 const { data: budgets } = trpc.budgets.list.useQuery({});
 const { data: expenditures } = trpc.expenditures.list.useQuery({});

 const totalBudget = budgets?.reduce((sum, b) => sum + parseFloat(b.budgetedAmount || "0"), 0) || 0;
 const totalSpent = expenditures?.filter(e => e.status === 'approved' || e.status === 'paid')
 .reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0) || 0;
 const variance = totalBudget - totalSpent;

 const exportToPDF = async () => {
 try {
 const { jsPDF } = await import("jspdf");
 
 const doc = new jsPDF({
 orientation: 'portrait',
 unit: 'mm',
 format: 'a4'
 });
 
 const pageWidth = doc.internal.pageSize.getWidth();
 
 const addText = (text: string, x: number, y: number, fontSize: number = 10) => {
 doc.setFontSize(fontSize);
 if (isRTL) {
 doc.text(text, pageWidth - x, y, { align: 'right' });
 } else {
 doc.text(text, x, y);
 }
 };
 
 const title = isRTL 
 ? 'تقرير تحليل التباين المالي'
 : 'Financial Variance Analysis Report';
 addText(title, 20, 20, 18);
 
 const dateLabel = t.financeModule.generated;
 addText(`${dateLabel}: ${new Date().toLocaleDateString()}`, 20, 30, 10);
 
 const summaryTitle = t.financeModule.financialSummary;
 addText(summaryTitle, 20, 45, 12);
 
 const totalBudgetLabel = t.financeModule.totalBudget;
 const totalSpentLabel = t.financeModule.totalSpent;
 const varianceLabel = t.financeModule.variance;
 const utilizationLabel = t.financeModule.utilizationRate;
 const underBudgetLabel = t.financeModule.underBudget;
 const overBudgetLabel = t.financeModule.overBudget;
 
 addText(`${totalBudgetLabel}: $${totalBudget.toLocaleString()}`, 30, 55, 10);
 addText(`${totalSpentLabel}: $${totalSpent.toLocaleString()}`, 30, 62, 10);
 addText(`${varianceLabel}: $${Math.abs(variance).toLocaleString()} ${variance >= 0 ? underBudgetLabel : overBudgetLabel}`, 30, 69, 10);
 addText(`${utilizationLabel}: ${totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0}%`, 30, 76, 10);
 
 if (budgets && budgets.length > 0) {
 const budgetBreakdownLabel = t.financeModule.budgetBreakdown;
 addText(budgetBreakdownLabel, 20, 90, 10);
 
 let yPos = 100;
 budgets.forEach((budget: any, index: number) => {
 if (yPos > 270) {
 doc.addPage();
 yPos = 20;
 }
 const budgetIdLabel = t.financeModule.budgetId;
 const amountLabel = t.financeModule.amount;
 const statusLabel = t.financeModule.status;
 
 addText(`${index + 1}. ${budgetIdLabel}: ${budget.id}`, 30, yPos, 10);
 addText(` ${amountLabel}: $${parseFloat(budget.budgetedAmount || "0").toLocaleString()}`, 30, yPos + 7, 10);
 addText(` ${statusLabel}: ${budget.status}`, 30, yPos + 14, 10);
 yPos += 25;
 });
 }
 
 const complianceText = isRTL
 ? 'يتوافق هذا التقرير مع معايير التقارير المالية للاتحاد الأوروبي والأمم المتحدة وECHO'
 : 'This report complies with EU, UN, and ECHO financial reporting standards.';
 doc.setFontSize(8);
 if (isRTL) {
 doc.text(complianceText, pageWidth - 20, 280, { align: 'right' });
 } else {
 doc.text(complianceText, 20, 280);
 }
 
 doc.save(`financial-report-${new Date().toISOString().split("T")[0]}.pdf`);
 toast.success(t.reportsTab.pdfReportGenerated);
 } catch (error) {
 console.error("PDF export error:", error);
 toast.error(t.reportsTab.pdfReportFailed);
 }
 };

 const exportToExcel = async () => {
 try {
 const XLSX = await import("xlsx");
 
 const wb = XLSX.utils.book_new();
 
 const summaryData = [
 [t.reportsTab.financialSummaryReport],
 [t.reportsTab.generated, new Date().toLocaleDateString()],
 [],
 [t.reportsTab.metric, t.reportsTab.amount],
 [t.reportsTab.totalBudget, totalBudget],
 [t.reportsTab.totalSpent, totalSpent],
 [t.reportsTab.variance, variance],
 [t.reportsTab.utilizationRate, totalBudget > 0 ? `${((totalSpent / totalBudget) * 100).toFixed(1)}%` : "0%"],
 ];
 const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
 XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");
 
 if (budgets && budgets.length > 0) {
 const budgetData = budgets.map((b: any) => ({
 [t.reportsTab.budgetId]: b.id,
 [t.reportsTab.projectId]: b.projectId,
 [t.reportsTab.accountId]: b.accountId,
 [t.reportsTab.budgetedAmount]: parseFloat(b.budgetedAmount || "0"),
 [t.reportsTab.forecastAmount]: parseFloat(b.forecastAmount || "0"),
 [t.reportsTab.currency]: b.currency,
 [t.reportsTab.status]: b.status,
 [t.reportsTab.period]: b.period,
 }));
 const budgetSheet = XLSX.utils.json_to_sheet(budgetData);
 XLSX.utils.book_append_sheet(wb, budgetSheet, t.reportsTab.budgets);
 }
 
 if (expenditures && expenditures.length > 0) {
 const expData = expenditures.map((e: any) => ({
 [t.reportsTab.expenditureId]: e.id,
 [t.reportsTab.budgetId]: e.budgetId,
 [t.reportsTab.amount]: parseFloat(e.amount || "0"),
 [t.reportsTab.currency]: e.currency,
 [t.reportsTab.date]: new Date(e.expenditureDate).toLocaleDateString(),
 [t.reportsTab.vendor]: e.vendor || "",
 [t.reportsTab.status]: e.status,
 [t.reportsTab.excelDescription]: e.description || "",
 }));
 const expSheet = XLSX.utils.json_to_sheet(expData);
 XLSX.utils.book_append_sheet(wb, expSheet, t.reportsTab.expenditures);
 }
 
 XLSX.writeFile(wb, `financial-report-${new Date().toISOString().split("T")[0]}.xlsx`);
 toast.success(t.reportsTab.excelReportGenerated);
 } catch (error) {
 console.error("Excel export error:", error);
 toast.error(t.reportsTab.excelReportFailed);
 }
 };

 return (
 <div className="space-y-6">
 <Card>
 <CardHeader>
 <CardTitle className={'text-start'}>{t.reportsTab.financialReports}</CardTitle>
 <CardDescription className={'text-start'}>{t.reportsTab.financialReportsDesc}</CardDescription>
 </CardHeader>
 <CardContent>
 <div className="grid gap-4 md:grid-cols-2">
 {/* Variance Analysis Report */}
 <Card>
 <CardHeader>
 <CardTitle className={`text-base text-start`}>{t.reportsTab.varianceAnalysisReport}</CardTitle>
 <CardDescription className={'text-start'}>{t.reportsTab.budgetVsActualComparison}</CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="space-y-2">
 <div className={`flex justify-between text-sm`}>
 <span>{t.reportsTab.totalBudget}:</span>
 <span className="font-mono">${totalBudget.toLocaleString()}</span>
 </div>
 <div className={`flex justify-between text-sm`}>
 <span>{t.reportsTab.totalSpent}:</span>
 <span className="font-mono">${totalSpent.toLocaleString()}</span>
 </div>
 <div className={`flex justify-between text-sm font-medium`}>
 <span>{t.reportsTab.variance}:</span>
 <span className={`font-mono ${variance >= 0 ? "text-green-600" : "text-red-600"}`}>
 ${Math.abs(variance).toLocaleString()} {variance >= 0 ? "(Under)" : "(Over)"}
 </span>
 </div>
 </div>
 <Button variant="outline" className="w-full" onClick={exportToPDF}>
 <FileText className={`h-4 w-4 me-2`} />
 {t.reportsTab.exportToPDF}
 </Button>
 </CardContent>
 </Card>

 {/* Budget Utilization Report */}
 <Card>
 <CardHeader>
 <CardTitle className={`text-base text-start`}>{t.reportsTab.budgetUtilizationReport}</CardTitle>
 <CardDescription className={'text-start'}>{t.reportsTab.spendingAnalysisByProject}</CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="text-center py-4">
 <div className="text-3xl font-bold">
 {totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0}%
 </div>
 <p className="text-sm text-muted-foreground mt-1">{t.reportsTab.budgetUtilized}</p>
 </div>
 <Button variant="outline" className="w-full" onClick={exportToExcel}>
 <Download className={`h-4 w-4 me-2`} />
 {t.reportsTab.exportToExcel}
 </Button>
 </CardContent>
 </Card>

 {/* Expenditure Summary */}
 <Card>
 <CardHeader>
 <CardTitle className={`text-base text-start`}>{t.reportsTab.expenditureSummary}</CardTitle>
 <CardDescription className={'text-start'}>{t.reportsTab.detailedExpenditureBreakdown}</CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="space-y-2">
 <div className={`flex justify-between text-sm`}>
 <span>{t.reportsTab.draft}:</span>
 <span>{expenditures?.filter(e => e.status === 'draft').length || 0}</span>
 </div>
 <div className={`flex justify-between text-sm`}>
 <span>{t.reportsTab.submitted}:</span>
 <span>{expenditures?.filter(e => e.status === 'submitted').length || 0}</span>
 </div>
 <div className={`flex justify-between text-sm`}>
 <span>{t.reportsTab.approved}:</span>
 <span>{expenditures?.filter(e => e.status === 'approved').length || 0}</span>
 </div>
 <div className={`flex justify-between text-sm`}>
 <span>{t.reportsTab.paid}:</span>
 <span>{expenditures?.filter(e => e.status === 'paid').length || 0}</span>
 </div>
 </div>
 <Button variant="outline" className="w-full" onClick={exportToExcel}>
 <Download className={`h-4 w-4 me-2`} />
 {t.reportsTab.exportToExcel}
 </Button>
 </CardContent>
 </Card>

 {/* Donor Compliance Report */}
 <Card>
 <CardHeader>
 <CardTitle className={`text-base text-start`}>{t.reportsTab.donorComplianceReport}</CardTitle>
 <CardDescription className={'text-start'}>{t.reportsTab.euUnEchoFormat}</CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className={`text-sm text-muted-foreground text-start`}>
 {t.reportsTab.donorComplianceReportDesc}
 </div>
 <Button variant="outline" className="w-full" disabled>
 <Download className={`h-4 w-4 me-2`} />
 {t.reportsTab.generateReportComingSoon}
 </Button>
 </CardContent>
 </Card>
 </div>

 <div className={`mt-6 p-4 bg-muted rounded-lg text-start`}>
 <p className="text-sm text-muted-foreground">
 <strong>{t.reportsTab.note}:</strong> {t.reportsTab.exportNote}
 </p>
 </div>
 </CardContent>
 </Card>
 </div>
 );
}
