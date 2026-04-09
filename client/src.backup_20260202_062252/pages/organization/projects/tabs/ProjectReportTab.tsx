import { formatDate } from '@/utils/formatters';
import { useState, useMemo, useRef } from 'react';
import { RefreshCw, FileText, Download, ChevronDown, ChevronUp, ArrowUp, ArrowDown, AlertTriangle, Printer, Loader2 } from "lucide-react";
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '@/utils/formatters';
import { useTranslation } from '@/i18n/useTranslation';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useProjectReportData } from '@/hooks/useProjectReportData';
import { calculateProjectRiskLevel, getRiskLevelBadgeVariant, type RiskLevel } from '@/utils/riskCalculation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ProjectReportPrintView } from "@/components/ProjectReportPrintView";

interface ProjectReportTabProps {
  projectId: string;
}

export function ProjectReportTab({ projectId }: ProjectReportTabProps) {
  const { language, isRTL } = useLanguage();
  const { t } = useTranslation();
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
      
      toast.success(isRTL ? 'تم تحميل التقرير بنجاح' : 'Report downloaded successfully');
      setIsGeneratingPDF(false);
    },
    onError: (error) => {
      console.error('PDF generation error:', error);
      toast.error(isRTL ? 'فشل في إنشاء التقرير' : 'Failed to generate report');
      setIsGeneratingPDF(false);
    },
  });

  // ✅ AUTHORITATIVE DATA: Read from database tables only
  const { data: reportData, loading, error, refresh } = useProjectReportData(projectId);

  // Calculate dynamic risk level using the risk calculation utility - MUST be before conditional returns
  const riskCalculation = useMemo(() => {
    if (!reportData) return { level: 'Low' as const, score: 0, summary: '', factors: [] };
    return calculateProjectRiskLevel({
      startDate: reportData.project.startDate,
      endDate: reportData.project.endDate,
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
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{isRTL ? 'جاري تحميل التقرير...' : 'Loading project report...'}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !reportData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 font-medium">{isRTL ? 'فشل تحميل التقرير' : 'Failed to load project report'}</p>
          <p className="text-gray-600 text-sm mt-2">{error?.message || (isRTL ? 'المشروع غير موجود' : 'Project not found')}</p>
          <button
            onClick={refresh}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {isRTL ? 'إعادة المحاولة' : 'Retry'}
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
    const start = new Date(reportData.project.startDate).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
    const end = new Date(reportData.project.endDate).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
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
          name: reportData.project.titleEn,
          code: reportData.project.code,
          status: reportData.project.status,
          startDate: reportData.project.startDate,
          endDate: reportData.project.endDate,
          location: reportData.project.location || '',
          sectors: reportData.project.sectors || [],
          currency: reportData.project.currency || 'USD',
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
          <html dir="${isRTL ? 'rtl' : 'ltr'}">
          <head>
            <title>${reportData.project.titleEn} - Project Report</title>
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
                font-family: ${isRTL ? "'Noto Sans Arabic', 'Arial', sans-serif" : "'Inter', 'Arial', sans-serif"};
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
    const summarySheet = workbook.addWorksheet(isRTL ? 'الملخص التنفيذي' : 'Executive Summary');
    summarySheet.columns = [
      { header: isRTL ? 'القسم' : 'Section', key: 'section', width: 40 },
      { header: isRTL ? 'القيمة' : 'Value', key: 'value', width: 30 }
    ];
    // Standardized header styling
    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

    const summaryData = [
      { section: isRTL ? 'اسم المشروع' : 'Project Name', value: reportData.project.titleEn },
      { section: isRTL ? 'كود المشروع' : 'Project Code', value: reportData.project.code },
      { section: isRTL ? 'فترة المشروع' : 'Project Period', value: formatDateRange() },
      { section: '', value: '' },
      { section: isRTL ? 'تقدم التنفيذ' : 'Implementation Progress', value: `${reportData.activities.completionRate}%` },
      { section: isRTL ? 'إنجاز المؤشرات' : 'Indicators Achievement', value: `${Math.round(reportData.indicators.averageAchievement)}%` },
      { section: isRTL ? 'معدل صرف الميزانية' : 'Budget Burn Rate', value: `${reportData.financial.burnRate}%` },
      { section: isRTL ? 'الأيام المتبقية' : 'Days Remaining', value: reportData.daysRemaining.toString() },
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
        { name: isRTL ? 'القسم' : 'Section', filterButton: true },
        { name: isRTL ? 'القيمة' : 'Value', filterButton: true },
      ],
      rows: summaryData.map(r => [r.section, r.value]),
    });

    // Sheet 2: Activities
    const activitiesSheet = workbook.addWorksheet(isRTL ? 'الأنشطة' : 'Activities');
    activitiesSheet.columns = [
      { header: isRTL ? 'العنوان' : 'Title', key: 'title', width: 40 },
      { header: isRTL ? 'التقدم (%)' : 'Progress (%)', key: 'progress', width: 15 },
      { header: isRTL ? 'الحالة' : 'Status', key: 'status', width: 15 }
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
          { name: isRTL ? 'العنوان' : 'Title', filterButton: true },
          { name: isRTL ? 'التقدم (%)' : 'Progress (%)', filterButton: true },
          { name: isRTL ? 'الحالة' : 'Status', filterButton: true },
        ],
        rows: activitiesData.map(r => [r.title, r.progress, r.status]),
      });
    }

    // Sheet 3: Indicators
    const indicatorsSheet = workbook.addWorksheet(isRTL ? 'المؤشرات' : 'Indicators');
    indicatorsSheet.columns = [
      { header: isRTL ? 'الكود' : 'Code', key: 'code', width: 15 },
      { header: isRTL ? 'العنوان' : 'Title', key: 'title', width: 40 },
      { header: isRTL ? 'خط الأساس' : 'Baseline', key: 'baseline', width: 12 },
      { header: isRTL ? 'المستهدف' : 'Target', key: 'target', width: 12 },
      { header: isRTL ? 'المحقق' : 'Achieved', key: 'achieved', width: 12 },
      { header: isRTL ? 'التقدم (%)' : 'Progress (%)', key: 'progress', width: 15 }
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
          { name: isRTL ? 'الكود' : 'Code', filterButton: true },
          { name: isRTL ? 'العنوان' : 'Title', filterButton: true },
          { name: isRTL ? 'خط الأساس' : 'Baseline', filterButton: true },
          { name: isRTL ? 'المستهدف' : 'Target', filterButton: true },
          { name: isRTL ? 'المحقق' : 'Achieved', filterButton: true },
          { name: isRTL ? 'التقدم (%)' : 'Progress (%)', filterButton: true },
        ],
        rows: indicatorsData.map(r => [r.code, r.title, r.baseline, r.target, r.achieved, r.progress]),
      });
    }

    // Sheet 4: Financial
    const financialSheet = workbook.addWorksheet(isRTL ? 'المالية' : 'Financial');
    financialSheet.columns = [
      { header: isRTL ? 'البند' : 'Metric', key: 'metric', width: 35 },
      { header: isRTL ? 'المبلغ' : 'Amount', key: 'amount', width: 20 }
    ];
    // Standardized header styling
    financialSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    financialSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

    const financialData = [
      { metric: isRTL ? 'إجمالي الميزانية' : 'Total Budget', amount: reportData.financial.approvedBudget },
      { metric: isRTL ? 'الفعلي المصروف' : 'Actual Spent', amount: reportData.financial.actualSpent },
      { metric: isRTL ? 'الرصيد المتبقي' : 'Remaining', amount: reportData.financial.approvedBudget - reportData.financial.actualSpent },
      { metric: isRTL ? 'معدل الصرف (%)' : 'Burn Rate (%)', amount: reportData.financial.burnRate.toString() },
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
        { name: isRTL ? 'البند' : 'Metric', filterButton: true },
        { name: isRTL ? 'المبلغ' : 'Amount', filterButton: true },
      ],
      rows: financialData.map(r => [r.metric, r.amount]),
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    saveAs(blob, `Project_Report_${reportData.project.code}_${new Date().toISOString().split('T')[0]}.xlsx`);
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

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="space-y-6 mt-6">
      {/* Report Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1 text-start">
              <CardTitle className="text-xl">{reportData.project.titleEn}</CardTitle>
              <div className="grid grid-cols-2 gap-4 mt-3 text-sm text-start">
                <div>
                  <span className="text-muted-foreground">{isRTL ? 'الممول: ' : 'Donor: '}</span>
                  <span className="font-medium">N/A</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{isRTL ? 'فترة المشروع: ' : 'Project Period: '}</span>
                  <span className="font-medium">{formatDateRange()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{isRTL ? 'الأيام المتبقية: ' : 'Remaining Days: '}</span>
                  <span className={`font-medium ${calculateDaysRemaining() < 30 ? 'text-red-600' : 'text-green-600'}`}>
                    {calculateDaysRemaining()} {isRTL ? 'يوم' : 'days'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">{isRTL ? 'تاريخ التقرير: ' : 'Report Generated: '}</span>
                  <span className="font-medium">{new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={refresh}>
                <RefreshCw className="h-4 w-4 me-2" />
                {isRTL ? 'تحديث' : 'Refresh Data'}
              </Button>
              <Button size="sm" onClick={handleGenerateDocumentPDF} disabled={isGeneratingPDF}>
                {isGeneratingPDF ? (
                  <Loader2 className="h-4 w-4 animate-spin me-2" />
                ) : (
                  <Download className="h-4 w-4 me-2" />
                )}
                {isGeneratingPDF 
                  ? (isRTL ? 'جاري الإنشاء...' : 'Generating...') 
                  : (isRTL ? 'تحميل PDF' : 'Download PDF')}
              </Button>
              <Button size="sm" variant="outline" onClick={handleExportPDF}>
                <Printer className="h-4 w-4 me-2" />
                {isRTL ? 'معاينة' : 'Preview'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Overall Project Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? 'ملخص أداء المشروع' : 'Overall Project Performance Summary'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">{isRTL ? 'تقدم التنفيذ' : 'Implementation Progress'}</p>
              <p className={`text-2xl font-bold ${getProgressColor(performanceSummary.implementationProgress)}`}>
                {performanceSummary.implementationProgress}%
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">{isRTL ? 'معدل صرف الميزانية' : 'Budget Burn Rate'}</p>
              <p className={`text-2xl font-bold ${getProgressColor(100 - performanceSummary.budgetBurnRate)}`}>
                {performanceSummary.budgetBurnRate.toFixed(1)}%
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">{isRTL ? 'الأنشطة' : 'Activities'}</p>
              <p className="text-2xl font-bold">
                {performanceSummary.activitiesCompleted}/{performanceSummary.activitiesTotal}
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">{isRTL ? 'المؤشرات' : 'Indicators'}</p>
              <p className="text-2xl font-bold">
                {performanceSummary.indicatorsAchieved}/{performanceSummary.indicatorsTotal}
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">{isRTL ? 'المهام' : 'Tasks'}</p>
              <p className="text-2xl font-bold">
                {performanceSummary.tasksCompleted}/{performanceSummary.tasksTotal}
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">{isRTL ? 'مستوى المخاطر' : 'Risk Level'}</p>
              <Badge variant={getRiskLevelBadgeVariant(performanceSummary.overallRiskLevel)} className="text-sm">
                {performanceSummary.overallRiskLevel === 'Critical' ? (isRTL ? 'حرج' : 'Critical') :
                 performanceSummary.overallRiskLevel === 'High' ? (isRTL ? 'عالي' : 'High') :
                 performanceSummary.overallRiskLevel === 'Medium' ? (isRTL ? 'متوسط' : 'Medium') :
                 (isRTL ? 'منخفض' : 'Low')}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activities Progress */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? 'تقدم الأنشطة' : 'Activities Progress'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reportData.activities.details.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">{isRTL ? 'لا توجد أنشطة' : 'No activities found'}</p>
            ) : (
              reportData.activities.details.map((activity, index) => {
                const progress = activity.progress;
                return (
                  <div key={activity.id || index} className="border rounded-lg p-4">
                    <div className={`flex items-center justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="flex-1">
                        <p className="font-medium">{activity.activityTitle}</p>
                      </div>
                      <Badge variant={activity.status === "COMPLETED" ? "default" : activity.status === "IN_PROGRESS" ? "secondary" : "outline"}>
                        {activity.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className={`grid grid-cols-3 gap-4 text-sm mb-2 ${isRTL ? 'text-right' : ''}`}>
                      <div>
                        <span className="text-muted-foreground">{isRTL ? 'المستهدف: ' : 'Target: '}</span>
                        <span className="font-medium">100%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{isRTL ? 'المحقق: ' : 'Achieved: '}</span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{isRTL ? 'التقدم: ' : 'Progress: '}</span>
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
          <CardTitle>{isRTL ? 'إنجاز المؤشرات' : 'Indicators Achievement'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {reportData.indicators.details.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">{isRTL ? 'لا توجد مؤشرات' : 'No indicators found'}</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className={isRTL ? 'text-right' : 'text-left'}>
                    <th className="pb-3 font-medium">{isRTL ? 'اسم المؤشر' : 'Indicator Name'}</th>
                    <th className={`pb-3 font-medium ${isRTL ? 'text-left' : 'text-right'}`}>{isRTL ? 'خط الأساس' : 'Baseline'}</th>
                    <th className={`pb-3 font-medium ${isRTL ? 'text-left' : 'text-right'}`}>{isRTL ? 'المستهدف' : 'Target'}</th>
                    <th className={`pb-3 font-medium ${isRTL ? 'text-left' : 'text-right'}`}>{isRTL ? 'المحقق' : 'Achieved'}</th>
                    <th className={`pb-3 font-medium ${isRTL ? 'text-left' : 'text-right'}`}>{isRTL ? 'نسبة الإنجاز' : 'Achievement %'}</th>
                    <th className="pb-3 font-medium">{isRTL ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.indicators.details.map((indicator, index) => {
                    const achievement = indicator.target > 0 
                      ? ((indicator.achieved - indicator.baseline) / (indicator.target - indicator.baseline)) * 100 
                      : 0;
                    return (
                      <tr key={indicator.code || index} className="border-b">
                        <td className="py-3">{indicator.title}</td>
                        <td className={`py-3 ${isRTL ? 'text-left' : 'text-right'}`}>{indicator.baseline}</td>
                        <td className={`py-3 ${isRTL ? 'text-left' : 'text-right'}`}>{indicator.target}</td>
                        <td className={`py-3 font-medium ${isRTL ? 'text-left' : 'text-right'}`}>{indicator.achieved}</td>
                        <td className={`py-3 font-medium ${isRTL ? 'text-left' : 'text-right'} ${getProgressColor(achievement)}`}>
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
          <CardTitle>{isRTL ? 'الأداء المالي والميزانية' : 'Budget & Financial Performance'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 mb-4">
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">{isRTL ? 'إجمالي الميزانية' : 'Total Budget'}</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(reportData.financial.approvedBudget, reportData.project.currency || 'EUR', language)}
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">{isRTL ? 'الفعلي المصروف' : 'Actual Spent'}</p>
              <p className="text-xl font-bold">
                {formatCurrency(reportData.financial.actualSpent, reportData.project.currency || 'EUR', language)}
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">{isRTL ? 'الرصيد المتبقي' : 'Remaining Balance'}</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(reportData.financial.approvedBudget - reportData.financial.actualSpent, reportData.project.currency || 'EUR', language)}
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">{isRTL ? 'معدل الصرف' : 'Burn Rate'}</p>
              <p className={`text-xl font-bold ${reportData.financial.burnRate > 80 ? 'text-red-600' : 'text-blue-600'}`}>
                {reportData.financial.burnRate.toFixed(1)}%
              </p>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">{isRTL ? 'استخدام الميزانية' : 'Budget Utilization'}</p>
            <Progress value={reportData.financial.burnRate} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Risk Snapshot */}
      <Card>
        <CardHeader>
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <CardTitle>{isRTL ? 'لمحة عن المخاطر' : 'Risk Snapshot'}</CardTitle>
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
            <div className={`flex items-center justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-sm font-medium">{isRTL ? 'مؤشر المخاطر' : 'Risk Score'}</span>
              <span className="text-sm font-bold">{riskCalculation.score}/100</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all ${
                  riskCalculation.score >= 60 ? 'bg-red-600' :
                  riskCalculation.score >= 40 ? 'bg-orange-500' :
                  riskCalculation.score >= 20 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${riskCalculation.score}%` }}
              />
            </div>
          </div>

          {/* Risk Factors */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold mb-3">{isRTL ? 'عوامل المخاطر' : 'Risk Factors'}</h4>
            {riskCalculation.factors.map((factor, index) => (
              <div key={index} className={`flex items-center gap-3 p-3 rounded-lg border ${
                factor.status === 'critical' ? 'bg-red-50 border-red-200' :
                factor.status === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                'bg-green-50 border-green-200'
              } ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                  factor.status === 'critical' ? 'bg-red-500' :
                  factor.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                }`} />
                <div className="flex-1">
                  <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
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
              <div className="text-xs text-gray-600 mt-1">{isRTL ? 'حرجة' : 'Critical'}</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{reportData.risks.high}</div>
              <div className="text-xs text-gray-600 mt-1">{isRTL ? 'عالية' : 'High'}</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{reportData.risks.medium}</div>
              <div className="text-xs text-gray-600 mt-1">{isRTL ? 'متوسطة' : 'Medium'}</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{reportData.risks.low}</div>
              <div className="text-xs text-gray-600 mt-1">{isRTL ? 'منخفضة' : 'Low'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Narrative Sections */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? 'الأقسام السردية' : 'Narrative Sections'}</CardTitle>
          <p className="text-sm text-muted-foreground">{isRTL ? 'كتل نصية قابلة للتحرير للتقرير' : 'Editable text blocks for the report'}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="progressSummary">{isRTL ? 'ملخص التقدم' : 'Progress Summary'}</Label>
            <Textarea
              id="progressSummary"
              value={narratives.progressSummary}
              onChange={(e) => setNarratives({ ...narratives, progressSummary: e.target.value })}
              placeholder={isRTL ? 'لخص التقدم العام...' : 'Summarize overall progress...'}
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="challenges">{isRTL ? 'التحديات' : 'Challenges'}</Label>
            <Textarea
              id="challenges"
              value={narratives.challenges}
              onChange={(e) => setNarratives({ ...narratives, challenges: e.target.value })}
              placeholder={isRTL ? 'صف التحديات الرئيسية...' : 'Describe key challenges faced...'}
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="mitigationActions">{isRTL ? 'إجراءات التخفيف' : 'Mitigation Actions'}</Label>
            <Textarea
              id="mitigationActions"
              value={narratives.mitigationActions}
              onChange={(e) => setNarratives({ ...narratives, mitigationActions: e.target.value })}
              placeholder={isRTL ? 'حدد استراتيجيات التخفيف...' : 'Outline mitigation strategies...'}
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="keyAchievements">{isRTL ? 'الإنجازات الرئيسية' : 'Key Achievements'}</Label>
            <Textarea
              id="keyAchievements"
              value={narratives.keyAchievements}
              onChange={(e) => setNarratives({ ...narratives, keyAchievements: e.target.value })}
              placeholder={isRTL ? 'أبرز الإنجازات الرئيسية...' : 'Highlight major accomplishments...'}
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="nextSteps">{isRTL ? 'الخطوات التالية' : 'Next Steps'}</Label>
            <Textarea
              id="nextSteps"
              value={narratives.nextSteps}
              onChange={(e) => setNarratives({ ...narratives, nextSteps: e.target.value })}
              placeholder={isRTL ? 'حدد الأنشطة القادمة...' : 'Outline upcoming activities...'}
              rows={3}
            />
          </div>
          <Button variant="outline">
            {isRTL ? 'حفظ السرد' : 'Save Narratives'}
          </Button>
        </CardContent>
      </Card>

      {/* Print-Optimized PDF Modal */}
      <Dialog open={showPrintModal} onOpenChange={setShowPrintModal}>
        <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{isRTL ? 'معاينة التقرير للطباعة' : 'Print Preview - Project Report'}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowPrintModal(false)}>
                  {isRTL ? 'إغلاق' : 'Close'}
                </Button>
                <Button size="sm" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  {isRTL ? 'طباعة / PDF' : 'Print / PDF'}
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
              organizationName="YDH - Yamany Development Foundation"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
