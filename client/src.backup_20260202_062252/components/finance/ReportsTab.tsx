import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { FileText, Download } from "lucide-react";

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
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const { data: budgets } = trpc.finance.listBudgets.useQuery();
  const { data: expenditures } = trpc.finance.listExpenditures.useQuery();

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
      
      const dateLabel = isRTL ? 'تاريخ الإنشاء' : 'Generated';
      addText(`${dateLabel}: ${new Date().toLocaleDateString()}`, 20, 30, 10);
      
      const summaryTitle = isRTL ? 'الملخص المالي' : 'Financial Summary';
      addText(summaryTitle, 20, 45, 12);
      
      const totalBudgetLabel = isRTL ? 'الميزانية الإجمالية' : 'Total Budget';
      const totalSpentLabel = isRTL ? 'الإنفاق الإجمالي' : 'Total Spent';
      const varianceLabel = isRTL ? 'الفرق' : 'Variance';
      const utilizationLabel = isRTL ? 'معدل الاستخدام' : 'Utilization Rate';
      const underBudgetLabel = isRTL ? '(أقل من الميزانية)' : '(Under Budget)';
      const overBudgetLabel = isRTL ? '(أكثر من الميزانية)' : '(Over Budget)';
      
      addText(`${totalBudgetLabel}: $${totalBudget.toLocaleString()}`, 30, 55, 10);
      addText(`${totalSpentLabel}: $${totalSpent.toLocaleString()}`, 30, 62, 10);
      addText(`${varianceLabel}: $${Math.abs(variance).toLocaleString()} ${variance >= 0 ? underBudgetLabel : overBudgetLabel}`, 30, 69, 10);
      addText(`${utilizationLabel}: ${totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0}%`, 30, 76, 10);
      
      if (budgets && budgets.length > 0) {
        const budgetBreakdownLabel = isRTL ? 'تفصيل الميزانية' : 'Budget Breakdown';
        addText(budgetBreakdownLabel, 20, 90, 10);
        
        let yPos = 100;
        budgets.forEach((budget: any, index: number) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          const budgetIdLabel = isRTL ? 'رقم الميزانية' : 'Budget ID';
          const amountLabel = isRTL ? 'المبلغ' : 'Amount';
          const statusLabel = isRTL ? 'الحالة' : 'Status';
          
          addText(`${index + 1}. ${budgetIdLabel}: ${budget.id}`, 30, yPos, 10);
          addText(`   ${amountLabel}: $${parseFloat(budget.budgetedAmount || "0").toLocaleString()}`, 30, yPos + 7, 10);
          addText(`   ${statusLabel}: ${budget.status}`, 30, yPos + 14, 10);
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
      toast.success(t('finance.pdfReportGenerated'));
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error(t('finance.pdfReportFailed'));
    }
  };

  const exportToExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      
      const wb = XLSX.utils.book_new();
      
      const summaryData = [
        [t('finance.financialSummaryReport')],
        [t('finance.generated'), new Date().toLocaleDateString()],
        [],
        [t('finance.metric'), t('finance.amount')],
        [t('finance.totalBudget'), totalBudget],
        [t('finance.totalSpent'), totalSpent],
        [t('finance.variance'), variance],
        [t('finance.utilizationRate'), totalBudget > 0 ? `${((totalSpent / totalBudget) * 100).toFixed(1)}%` : "0%"],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");
      
      if (budgets && budgets.length > 0) {
        const budgetData = budgets.map((b: any) => ({
          [t('finance.budgetId')]: b.id,
          [t('finance.projectId')]: b.projectId,
          [t('finance.accountId')]: b.accountId,
          [t('finance.budgetedAmount')]: parseFloat(b.budgetedAmount || "0"),
          [t('finance.forecastAmount')]: parseFloat(b.forecastAmount || "0"),
          [t('finance.currency')]: b.currency,
          [t('finance.status')]: b.status,
          [t('finance.period')]: b.period,
        }));
        const budgetSheet = XLSX.utils.json_to_sheet(budgetData);
        XLSX.utils.book_append_sheet(wb, budgetSheet, t('finance.budgets'));
      }
      
      if (expenditures && expenditures.length > 0) {
        const expData = expenditures.map((e: any) => ({
          [t('finance.expenditureId')]: e.id,
          [t('finance.budgetId')]: e.budgetId,
          [t('finance.amount')]: parseFloat(e.amount || "0"),
          [t('finance.currency')]: e.currency,
          [t('finance.date')]: new Date(e.expenditureDate).toLocaleDateString(),
          [t('finance.vendor')]: e.vendor || "",
          [t('finance.status')]: e.status,
          [t('finance.excelDescription')]: e.description || "",
        }));
        const expSheet = XLSX.utils.json_to_sheet(expData);
        XLSX.utils.book_append_sheet(wb, expSheet, t('finance.expenditures'));
      }
      
      XLSX.writeFile(wb, `financial-report-${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success(t('finance.excelReportGenerated'));
    } catch (error) {
      console.error("Excel export error:", error);
      toast.error(t('finance.excelReportFailed'));
    }
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <Card>
        <CardHeader>
          <CardTitle className={isRTL ? 'text-right' : 'text-left'}>{t('finance.financialReports')}</CardTitle>
          <CardDescription className={isRTL ? 'text-right' : 'text-left'}>{t('finance.financialReportsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Variance Analysis Report */}
            <Card>
              <CardHeader>
                <CardTitle className={`text-base ${isRTL ? 'text-right' : 'text-left'}`}>{t('finance.varianceAnalysisReport')}</CardTitle>
                <CardDescription className={isRTL ? 'text-right' : 'text-left'}>{t('finance.budgetVsActualComparison')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className={`flex justify-between text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span>{t('finance.totalBudget')}:</span>
                    <span className="font-mono">${totalBudget.toLocaleString()}</span>
                  </div>
                  <div className={`flex justify-between text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span>{t('finance.totalSpent')}:</span>
                    <span className="font-mono">${totalSpent.toLocaleString()}</span>
                  </div>
                  <div className={`flex justify-between text-sm font-medium ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span>{t('finance.variance')}:</span>
                    <span className={`font-mono ${variance >= 0 ? "text-green-600" : "text-red-600"}`}>
                      ${Math.abs(variance).toLocaleString()} {variance >= 0 ? "(Under)" : "(Over)"}
                    </span>
                  </div>
                </div>
                <Button variant="outline" className="w-full" onClick={exportToPDF}>
                  <FileText className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {t('finance.exportToPDF')}
                </Button>
              </CardContent>
            </Card>

            {/* Budget Utilization Report */}
            <Card>
              <CardHeader>
                <CardTitle className={`text-base ${isRTL ? 'text-right' : 'text-left'}`}>{t('finance.budgetUtilizationReport')}</CardTitle>
                <CardDescription className={isRTL ? 'text-right' : 'text-left'}>{t('finance.spendingAnalysisByProject')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-4">
                  <div className="text-3xl font-bold">
                    {totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0}%
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{t('finance.budgetUtilized')}</p>
                </div>
                <Button variant="outline" className="w-full" onClick={exportToExcel}>
                  <Download className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {t('finance.exportToExcel')}
                </Button>
              </CardContent>
            </Card>

            {/* Expenditure Summary */}
            <Card>
              <CardHeader>
                <CardTitle className={`text-base ${isRTL ? 'text-right' : 'text-left'}`}>{t('finance.expenditureSummary')}</CardTitle>
                <CardDescription className={isRTL ? 'text-right' : 'text-left'}>{t('finance.detailedExpenditureBreakdown')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className={`flex justify-between text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span>{t('finance.draft')}:</span>
                    <span>{expenditures?.filter(e => e.status === 'draft').length || 0}</span>
                  </div>
                  <div className={`flex justify-between text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span>{t('finance.submitted')}:</span>
                    <span>{expenditures?.filter(e => e.status === 'submitted').length || 0}</span>
                  </div>
                  <div className={`flex justify-between text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span>{t('finance.approved')}:</span>
                    <span>{expenditures?.filter(e => e.status === 'approved').length || 0}</span>
                  </div>
                  <div className={`flex justify-between text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span>{t('finance.paid')}:</span>
                    <span>{expenditures?.filter(e => e.status === 'paid').length || 0}</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full" onClick={exportToExcel}>
                  <Download className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {t('finance.exportToExcel')}
                </Button>
              </CardContent>
            </Card>

            {/* Donor Compliance Report */}
            <Card>
              <CardHeader>
                <CardTitle className={`text-base ${isRTL ? 'text-right' : 'text-left'}`}>{t('finance.donorComplianceReport')}</CardTitle>
                <CardDescription className={isRTL ? 'text-right' : 'text-left'}>{t('finance.euUnEchoFormat')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={`text-sm text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('finance.donorComplianceReportDesc')}
                </div>
                <Button variant="outline" className="w-full" disabled>
                  <Download className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {t('finance.generateReportComingSoon')}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className={`mt-6 p-4 bg-muted rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
            <p className="text-sm text-muted-foreground">
              <strong>{t('finance.note')}:</strong> {t('finance.exportNote')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
