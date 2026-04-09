import { useState, useEffect } from 'react';
import { Download, FileText, Calendar, TrendingUp, Users, Shield, Activity, Edit, Save, AlertCircle, X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatNumber, formatCurrency } from '@/utils/formatters';
import { useTranslation } from '@/i18n/useTranslation';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';
import { useCaseManagementReportData } from '@/hooks/useCaseManagementReportData.tsx';
import { trpc } from '@/lib/trpc';

interface ReportsAnalyticsProps {
  projectId: number;
  projectName: string;
  donorName: string;
}

export function ReportsAnalytics({ projectId, projectName, donorName }: ReportsAnalyticsProps) {
  const { isRTL } = useLanguage();
  const { t } = useTranslation();
  const [dateFrom, setDateFrom] = useState('2024-01-01');
  const [dateTo, setDateTo] = useState('2024-12-31');
  
  // Fetch real data from Case Management modules
  const reportData = useCaseManagementReportData(projectId, dateFrom, dateTo);
  
  // Editable narrative sections with localStorage persistence
  const storageKey = `cm_report_narrative_${projectId}_${dateFrom}_${dateTo}`;
  
  const [executiveSummary, setExecutiveSummary] = useState('');
  const [keyAchievements, setKeyAchievements] = useState('');
  const [isEditingExecutiveSummary, setIsEditingExecutiveSummary] = useState(false);
  const [isEditingAchievements, setIsEditingAchievements] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  // tRPC mutation for server-side PDF generation
  const generatePDFMutation = trpc.caseManagement.pdf.generatePDF.useMutation();

  // Load saved narratives from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.executiveSummary) setExecutiveSummary(parsed.executiveSummary);
        if (parsed.keyAchievements) setKeyAchievements(parsed.keyAchievements);
      } catch (e) {
        console.error('Failed to parse saved narratives', e);
      }
    }
  }, [storageKey]);

  // Save narratives to localStorage
  const saveNarratives = () => {
    localStorage.setItem(storageKey, JSON.stringify({
      executiveSummary,
      keyAchievements
    }));
  };

  // AUTO-GENERATE EXECUTIVE SUMMARY from real data
  const generateExecutiveSummary = () => {
    if (!reportData || !reportData.data) return '';

    const data = reportData.data;
    const highRiskPercent = data.cases.total > 0
      ? ((data.cases.highRisk / data.cases.total) * 100).toFixed(1)
      : '0';

    const completionRate = data.referrals.completionRate.toFixed(1);

    if (isRTL) {
      // Arabic version
      return `خلال الفترة المشمولة بالتقرير من ${dateFrom} إلى ${dateTo}، قدم مشروع ${projectName} الدعم النفسي والحماية لـ ${data.cases.total} مستفيد من خلال إدارة الحالا النشطة. تم تسجيل ${data.cases.new} حالة جديدة، منها ${highRiskPercent}% تم تصنيفها كحالات عالية الخطورة تتطلب خدمات متابعة مكثفة. أجرى المشروع ${data.pssSessions.total} جلسة دعم نفسي (${data.pssSessions.individual} فردية، ${data.pssSessions.group} جماعية) ووصل إلى ${data.safeSpaces.childrenReached} طفل من خلال ${data.safeSpaces.totalActivities} نشاط مساحة آمنة للأطفال عبر ${data.safeSpaces.locations} موقع. تم إجراء ${data.referrals.total} إحالة إلى المنظمات الشريكة، بمعدل إكمال ${completionRate}٪.`;
    } else {
      // English version
      return `During the reporting period from ${dateFrom} to ${dateTo}, the ${projectName} provided psychosocial and protection support to ${data.cases.total} beneficiaries through active case management. ${data.cases.new} new cases were registered, with ${highRiskPercent}% classified as high-risk requiring intensive follow-up services. The project conducted ${data.pssSessions.total} PSS sessions (${data.pssSessions.individual} individual, ${data.pssSessions.group} group) and reached ${data.safeSpaces.childrenReached} children through ${data.safeSpaces.totalActivities} Child Safe Space activities across ${data.safeSpaces.locations} locations. ${data.referrals.total} referrals were made to partner organizations, achieving a ${completionRate}% completion rate.`;
    }
  };

  // AUTO-GENERATE KEY ACHIEVEMENTS from real data
  const generateKeyAchievements = () => {
    if (!reportData || !reportData.data) return '';

    const data = reportData.data;
    const achievements = [];

    if (isRTL) {
      // Arabic version
      // Cases achievement
      if (data.cases.total > 0) {
        const closureRate = data.cases.total > 0
          ? ((data.cases.closed / data.cases.total) * 100).toFixed(0)
          : '0';
        achievements.push(`• ${data.cases.total} حالة تمت إدارتها، منها ${closureRate}٪ تم إغلاقها بنجاح`);
      }

      // PSS Sessions achievement
      if (data.pssSessions.total > 0) {
        achievements.push(`• ${data.pssSessions.total} جلسة دعم نفسي تم إجراؤها (${data.pssSessions.individual} فردية، ${data.pssSessions.group} جماعية)`);
      }

      // Referrals achievement
      if (data.referrals.total > 0) {
        achievements.push(`• ${data.referrals.total} إحالة تمت مع المنظمات الشري��ة، بمعدل إكمال ${data.referrals.completionRate}٪`);
      }

      // Child Safe Space achievement
      if (data.safeSpaces.childrenReached > 0) {
        achievements.push(`• ${data.safeSpaces.childrenReached} طفل شاركوا في أنشطة المساحات الآمنة عبر ${data.safeSpaces.locations} موقع`);
      }

      // Activities achievement
      if (data.activities.total > 0) {
        achievements.push(`• ${data.activities.total} نشاط منظم تم تنفيذه خلال فترة التقرير`);
      }
    } else {
      // English version
      // Cases achievement
      if (data.cases.total > 0) {
        const closureRate = data.cases.total > 0
          ? ((data.cases.closed / data.cases.total) * 100).toFixed(0)
          : '0';
        achievements.push(`• ${data.cases.total} cases managed, with ${closureRate}% successfully closed`);
      }

      // PSS Sessions achievement
      if (data.pssSessions.total > 0) {
        achievements.push(`• ${data.pssSessions.total} PSS sessions conducted (${data.pssSessions.individual} individual, ${data.pssSessions.group} group)`);
      }

      // Referrals achievement
      if (data.referrals.total > 0) {
        achievements.push(`• ${data.referrals.total} referrals completed with partner organizations, ${data.referrals.completionRate}% completion rate`);
      }

      // Child Safe Space achievement
      if (data.safeSpaces.childrenReached > 0) {
        achievements.push(`• ${data.safeSpaces.childrenReached} children participated in safe space activities across ${data.safeSpaces.locations} locations`);
      }

      // Activities achievement
      if (data.activities.total > 0) {
        achievements.push(`• ${data.activities.total} structured activities implemented during the reporting period`);
      }
    }

    return achievements.join('\n');
  };

  // Export to PDF using server-side generation (same as Project Report)
  const handleExportPDF = async () => {
    console.log('handleExportPDF called', { reportData, hasData: !!reportData?.data });
    if (!reportData || !reportData.data) {
      console.error('PDF export aborted: reportData is missing', { reportData });
      alert(isRTL ? 'البيانات غير متوفرة. يرجى الانتظار حتى يتم تحميل التقرير.' : 'Data not available. Please wait for the report to load.');
      return;
    }
    
    setIsGeneratingPDF(true);
    
    try {
      const finalExecutiveSummary = executiveSummary || generateExecutiveSummary();
      const finalAchievements = keyAchievements || generateKeyAchievements();
      const data = reportData.data;
      
      const result = await generatePDFMutation.mutateAsync({
        projectId,
        language: isRTL ? 'ar' : 'en',
        reportData: {
          projectName,
          donorName,
          dateFrom,
          dateTo,
          executiveSummary: finalExecutiveSummary,
          keyAchievements: finalAchievements,
          cases: {
            total: data.cases.total,
            new: data.cases.new,
            active: data.cases.active,
            closed: data.cases.closed,
            highRisk: data.cases.highRisk,
            avgCaseDuration: data.cases.avgCaseDuration,
          },
          pssSessions: {
            total: data.pssSessions.total,
            individual: data.pssSessions.individual,
            group: data.pssSessions.group,
            avgDuration: data.pssSessions.avgDuration,
            followUpsScheduled: data.pssSessions.followUpsScheduled,
          },
          safeSpaces: {
            locations: data.safeSpaces.locations,
            totalActivities: data.safeSpaces.totalActivities,
            childrenReached: data.safeSpaces.childrenReached,
            avgChildrenPerSession: data.safeSpaces.avgChildrenPerSession,
          },
          referrals: {
            total: data.referrals.total,
            internal: data.referrals.internal,
            external: data.referrals.external,
            completed: data.referrals.completed,
            completionRate: data.referrals.completionRate,
          },
          activities: {
            total: data.activities.total,
            byType: data.activities.byType,
          },
        },
      });
      
      console.log('PDF mutation result:', { success: result.success, hasData: !!result.pdf, filename: result.filename });
      
      if (result.success && result.pdf) {
        // Convert base64 to blob and download
        const byteCharacters = atob(result.pdf);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.filename || `CaseManagement_Report_${dateFrom}_${dateTo}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      alert(isRTL ? 'فشل في إنشاء ملف PDF. يرجى المحاولة مرة أخرى.' : 'Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Export to Excel
  const handleExportExcel = async () => {
    if (!reportData) return;

    const workbook = new Workbook();
    
    // Sheet 1: Executive Summary
    const summarySheet = workbook.addWorksheet('Executive Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 40 },
      { header: 'Value', key: 'value', width: 20 }
    ];
    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };

    summarySheet.addRow({ metric: 'Project Name', value: projectName });
    summarySheet.addRow({ metric: 'Donor', value: donorName });
    summarySheet.addRow({ metric: 'Reporting Period', value: `${dateFrom} to ${dateTo}` });
    summarySheet.addRow({ metric: 'Generated On', value: new Date().toLocaleDateString() });
    summarySheet.addRow({ metric: '', value: '' });
    summarySheet.addRow({ metric: 'Total Beneficiaries', value: reportData.cases.total });
    summarySheet.addRow({ metric: 'New Cases', value: reportData.cases.new });
    summarySheet.addRow({ metric: 'Active Cases', value: reportData.cases.active });
    summarySheet.addRow({ metric: 'Closed Cases', value: reportData.cases.closed });
    summarySheet.addRow({ metric: 'High-Risk Cases', value: reportData.cases.highRisk });

    // Sheet 2: Cases Details
    const casesSheet = workbook.addWorksheet('Cases');
    casesSheet.columns = [
      { header: 'Case Code', key: 'caseCode', width: 20 },
      { header: 'Beneficiary Name', key: 'name', width: 30 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'Age', key: 'age', width: 10 },
      { header: 'Case Type', key: 'caseType', width: 15 },
      { header: 'Risk Level', key: 'riskLevel', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Intake Date', key: 'intakeDate', width: 15 },
      { header: 'Location', key: 'location', width: 25 },
    ];
    casesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    casesSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };

    reportData.cases.details.forEach(c => {
      casesSheet.addRow({
        caseCode: c.caseCode,
        name: `${c.firstName} ${c.lastName}`,
        gender: c.gender,
        age: c.age,
        caseType: c.caseType,
        riskLevel: c.riskLevel,
        status: c.status,
        intakeDate: c.intakeDate,
        location: c.location
      });
    });

    // Sheet 3: PSS Sessions
    const pssSheet = workbook.addWorksheet('PSS Sessions');
    pssSheet.columns = [
      { header: 'Session Date', key: 'date', width: 15 },
      { header: 'Session Type', key: 'type', width: 15 },
      { header: 'PSS Approach', key: 'approach', width: 20 },
      { header: 'Duration (min)', key: 'duration', width: 15 },
      { header: 'Next Session', key: 'nextSession', width: 15 },
    ];
    pssSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    pssSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } };

    reportData.pssSessions.details.forEach(s => {
      pssSheet.addRow({
        date: s.sessionDate,
        type: s.sessionType,
        approach: s.pssApproach,
        duration: s.duration,
        nextSession: s.nextSessionDate || 'N/A'
      });
    });

    // Sheet 4: Referrals
    const referralsSheet = workbook.addWorksheet('Referrals');
    referralsSheet.columns = [
      { header: 'Referral Date', key: 'date', width: 15 },
      { header: 'Service Type', key: 'serviceType', width: 25 },
      { header: 'Referral Type', key: 'referralType', width: 15 },
      { header: 'Organization', key: 'organization', width: 30 },
      { header: 'Status', key: 'status', width: 15 },
    ];
    referralsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    referralsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEA580C' } };

    reportData.referrals.details.forEach(r => {
      referralsSheet.addRow({
        date: r.referralDate,
        serviceType: r.serviceType,
        referralType: r.referralType,
        organization: r.referredToOrganization,
        status: r.status
      });
    });

    // Sheet 5: Safe Spaces
    const cssSheet = workbook.addWorksheet('Child Safe Spaces');
    cssSheet.columns = [
      { header: 'CSS Name', key: 'name', width: 30 },
      { header: 'Location', key: 'location', width: 30 },
      { header: 'Capacity', key: 'capacity', width: 12 },
      { header: 'Age Groups', key: 'ageGroups', width: 20 },
    ];
    cssSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cssSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };

    reportData.safeSpaces.details.forEach(s => {
      cssSheet.addRow({
        name: s.cssName,
        location: s.location,
        capacity: s.capacity,
        ageGroups: s.ageGroupsServed
      });
    });

    // Sheet 6: Activities
    const activitiesSheet = workbook.addWorksheet('Activities');
    activitiesSheet.columns = [
      { header: 'Activity Date', key: 'date', width: 15 },
      { header: 'Activity Type', key: 'type', width: 25 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Status', key: 'status', width: 15 },
    ];
    activitiesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    activitiesSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };

    reportData.activities.details.forEach(a => {
      activitiesSheet.addRow({
        date: a.activityDate,
        type: a.activityType,
        description: a.description,
        status: a.status
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    saveAs(blob, `Case_Management_Report_${projectName.replace(/\s+/g, '_')}_${dateFrom}_${dateTo}.xlsx`);
  };

  // Check if report data is available
  if (!reportData.data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <p className="text-gray-700 font-medium">No case management data available</p>
          <p className="text-gray-600 text-sm mt-2">Add cases to generate reports</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex items-center justify-between mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h2 className="text-sm font-semibold text-gray-900">{t.caseManagement.caseManagementAutoReport}</h2>
          <p className="text-xs text-gray-600 mt-0.5">{t.caseManagement.autoGeneratedFromData}</p>
        </div>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Button
            onClick={() => setShowExportModal(true)}
            className="bg-primary text-white hover:bg-primary/90"
          >
            <Download className="w-4 h-4 mr-2" />
            {isRTL ? 'تصدير | Export' : 'Export | تصدير'}
          </Button>
        </div>

        {/* Single Export Modal */}
        <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                {isRTL ? 'تصدير التقرير | Export Report' : 'Export Report | تصدير التقرير'}
              </DialogTitle>
              <DialogDescription>
                {isRTL ? 'اختر صيغة التصدير' : 'Choose export format'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-14"
                onClick={() => {
                  handleExportExcel();
                  setShowExportModal(false);
                }}
              >
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <div className="font-medium">Excel (.xlsx)</div>
                  <div className="text-xs text-muted-foreground">
                    {isRTL ? 'تصدير البيانات الكاملة مع أوراق عمل متعددة' : 'Full data export with multiple worksheets'}
                  </div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-14"
                disabled={isGeneratingPDF}
                onClick={async () => {
                  try {
                    await handleExportPDF();
                    setShowExportModal(false);
                  } catch (error) {
                    console.error('PDF export failed:', error);
                    // Keep modal open on error so user can retry
                  }
                }}
              >
                {isGeneratingPDF ? (
                  <>
                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-red-600 animate-spin" />
                    </div>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <div className="font-medium">{isRTL ? 'جاري الإنشاء...' : 'Generating...'}</div>
                      <div className="text-xs text-muted-foreground">
                        {isRTL ? 'يرجى الانتظار' : 'Please wait'}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-red-600" />
                    </div>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <div className="font-medium">PDF</div>
                      <div className="text-xs text-muted-foreground">
                        {isRTL ? 'تقرير منسق للطباعة والمشاركة' : 'Formatted report for printing and sharing'}
                      </div>
                    </div>
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Report Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white" dir={isRTL ? 'rtl' : 'ltr'}>
        <h1 className={`text-2xl font-bold mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t.caseManagement.caseManagementReport}</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <div className="opacity-80">{t.caseManagement.project}</div>
            <div className="font-semibold">{projectName}</div>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <div className="opacity-80">{t.caseManagement.donor}</div>
            <div className="font-semibold">{donorName}</div>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <div className="opacity-80">{t.caseManagement.reportingPeriod}</div>
            <div className="font-semibold" dir="ltr">{dateFrom} {t.caseManagement.to} {dateTo}</div>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <div className="opacity-80">{t.caseManagement.generatedOn}</div>
            <div className="font-semibold" dir="ltr">{new Date().toLocaleDateString()}</div>
          </div>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className={`flex items-center gap-4 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Calendar className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">{t.caseManagement.reportingPeriod}:</span>
          </div>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md"
          />
          <span className="text-gray-500">{t.caseManagement.to}</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md"
          />
        </div>
      </div>

      {/* Executive Summary - Auto-Generated & Editable */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h3 className={`text-lg font-semibold text-gray-900 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <FileText className="w-5 h-5 text-blue-600" />
            {t.caseManagement.executiveSummary}
          </h3>
          <button
            onClick={() => {
              if (isEditingExecutiveSummary) {
                saveNarratives();
                setIsEditingExecutiveSummary(false);
              } else {
                if (!executiveSummary) {
                  setExecutiveSummary(generateExecutiveSummary());
                }
                setIsEditingExecutiveSummary(true);
              }
            }}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            {isEditingExecutiveSummary ? (
              <>
                <Save className="w-4 h-4" />
                {t.common.save}
              </>
            ) : (
              <>
                <Edit className="w-4 h-4" />
                {t.common.edit}
              </>
            )}
          </button>
        </div>
        {isEditingExecutiveSummary ? (
          <textarea
            value={executiveSummary}
            onChange={(e) => setExecutiveSummary(e.target.value)}
            className={`w-full p-3 text-sm text-gray-700 leading-relaxed border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
            rows={6}
            placeholder="Auto-generated summary based on reporting period data..."
          />
        ) : (
          <p className={`text-sm text-gray-700 leading-relaxed ${isRTL ? 'text-right' : 'text-left'}`}>
            {executiveSummary || generateExecutiveSummary()}
          </p>
        )}
      </div>

      {/* Key Metrics */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className={`text-lg font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t.caseManagement.keyMetrics}</h3>
        <div className="grid grid-cols-3 gap-4" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border-l-4 border-blue-600">
            <div className={`text-xs text-blue-700 font-medium uppercase mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.caseManagement.totalBeneficiaries}</div>
            <div className={`text-3xl font-bold text-blue-900 ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">{reportData.data.cases.total}</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border-l-4 border-purple-600">
            <div className={`text-xs text-purple-700 font-medium uppercase mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.caseManagement.pssSessions}</div>
            <div className={`text-3xl font-bold text-purple-900 ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">{reportData.data.pssSessions.total}</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border-l-4 border-green-600">
            <div className={`text-xs text-green-700 font-medium uppercase mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.caseManagement.childrenReached}</div>
            <div className={`text-3xl font-bold text-green-900 ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">{reportData.data.safeSpaces.childrenReached}</div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border-l-4 border-orange-600">
            <div className={`text-xs text-orange-700 font-medium uppercase mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.caseManagement.totalReferrals}</div>
            <div className={`text-3xl font-bold text-orange-900 ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">{reportData.data.referrals.total}</div>
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border-l-4 border-indigo-600">
            <div className={`text-xs text-indigo-700 font-medium uppercase mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.caseManagement.cssLocations}</div>
            <div className={`text-3xl font-bold text-indigo-900 ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">{reportData.data.safeSpaces.locations}</div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border-l-4 border-red-600">
            <div className={`text-xs text-red-700 font-medium uppercase mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.caseManagement.highRiskCases}</div>
            <div className={`text-3xl font-bold text-red-900 ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">{reportData.data.cases.highRisk}</div>
          </div>
        </div>
      </div>

      {/* Key Achievements - Auto-Generated & Editable */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h3 className={`text-lg font-semibold text-gray-900 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <TrendingUp className="w-5 h-5 text-green-600" />
            {t.caseManagement.keyAchievements}
          </h3>
          <button
            onClick={() => {
              if (isEditingAchievements) {
                saveNarratives();
                setIsEditingAchievements(false);
              } else {
                if (!keyAchievements) {
                  setKeyAchievements(generateKeyAchievements());
                }
                setIsEditingAchievements(true);
              }
            }}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-md transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            {isEditingAchievements ? (
              <>
                <Save className="w-4 h-4" />
                {t.common.save}
              </>
            ) : (
              <>
                <Edit className="w-4 h-4" />
                {t.common.edit}
              </>
            )}
          </button>
        </div>
        {isEditingAchievements ? (
          <textarea
            value={keyAchievements}
            onChange={(e) => setKeyAchievements(e.target.value)}
            className={`w-full p-3 text-sm text-gray-700 leading-relaxed border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 ${isRTL ? 'text-right' : 'text-left'}`}
            rows={6}
            placeholder="Auto-generated achievements based on data..."
          />
        ) : (
          <pre className={`text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-sans ${isRTL ? 'text-right' : 'text-left'}`}>
            {keyAchievements || generateKeyAchievements()}
          </pre>
        )}
      </div>

      {/* Detailed Sub-Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Cases Table */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className={`text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Users className="w-5 h-5 text-green-600" />
            {t.caseManagement.casesLabel}
          </h3>
          <div className="space-y-2 text-sm" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex justify-between py-2 border-b">
              <span className={`text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t.caseManagement.totalCasesLabel}</span>
              <span className="font-semibold">{reportData.data.cases.total}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className={`text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t.caseManagement.newCasesLabel}</span>
              <span className="font-semibold">{reportData.data.cases.new}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className={`text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t.caseManagement.activeCasesLabel}</span>
              <span className="font-semibold">{reportData.data.cases.active}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className={`text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t.caseManagement.closedCasesLabel}</span>
              <span className="font-semibold">{reportData.data.cases.closed}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className={`text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t.caseManagement.highRiskCasesLabel}</span>
              <span className="font-semibold text-red-600">{reportData.data.cases.highRisk}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className={`text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t.caseManagement.avgDurationLabel}</span>
              <span className="font-semibold">{isRTL ? `${t.caseManagement.days} ${reportData.data.cases.avgCaseDuration}` : `${reportData.data.cases.avgCaseDuration} ${t.caseManagement.days}`}</span>
            </div>
          </div>
        </div>

        {/* PSS Sessions Table */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className={`text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Activity className="w-5 h-5 text-purple-600" />
            {t.caseManagement.pssSessionsLabel}
          </h3>
          <div className="space-y-2 text-sm" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex justify-between py-2 border-b">
              <span className={`text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t.caseManagement.totalSessionsLabel}</span>
              <span className="font-semibold">{reportData.data.pssSessions.total}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className={`text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t.caseManagement.individualSessionsCount}</span>
              <span className="font-semibold">{reportData.data.pssSessions.individual}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className={`text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t.caseManagement.groupSessionsCount}</span>
              <span className="font-semibold">{reportData.data.pssSessions.group}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className={`text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t.caseManagement.avgDuration}</span>
              <span className="font-semibold">{isRTL ? `${t.caseManagement.minutes} ${reportData.data.pssSessions.avgDuration}` : `${reportData.data.pssSessions.avgDuration} ${t.caseManagement.minutes}`}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className={`text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t.caseManagement.followUpsScheduledLabel}</span>
              <span className="font-semibold">{reportData.data.pssSessions.followUpsScheduled}</span>
            </div>
          </div>
        </div>

        {/* Referrals Table */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className={`text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Shield className="w-5 h-5 text-orange-600" />
            {t.caseManagement.referralsLabel}
          </h3>
          <div className="space-y-2 text-sm" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex justify-between py-2 border-b">
              <span className={`text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t.caseManagement.totalReferralsLabel}</span>
              <span className="font-semibold">{reportData.data.referrals.total}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className={`text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t.caseManagement.internalReferralsLabel}</span>
              <span className="font-semibold">{reportData.data.referrals.internal}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className={`text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t.caseManagement.externalReferralsLabel}</span>
              <span className="font-semibold">{reportData.data.referrals.external}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className={`text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t.caseManagement.completedLabel}</span>
              <span className="font-semibold text-green-600">{reportData.data.referrals.completed}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className={`text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t.caseManagement.completionRateLabel}</span>
              <span className="font-semibold">{isRTL ? `٪${reportData.data.referrals.completionRate}` : `${reportData.data.referrals.completionRate}%`}</span>
            </div>
          </div>
        </div>

        {/* Safe Spaces Table */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className={`text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Users className="w-5 h-5 text-indigo-600" />
            {t.caseManagement.safeSpacesLabel}
          </h3>
          <div className="space-y-2 text-sm" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex justify-between py-2 border-b">
              <span className={`text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t.caseManagement.activeLocationsLabel}</span>
              <span className="font-semibold">{reportData.data.safeSpaces.locations}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className={`text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t.caseManagement.totalActivitiesLabel}</span>
              <span className="font-semibold">{reportData.data.safeSpaces.totalActivities}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className={`text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t.caseManagement.childrenReached}</span>
              <span className="font-semibold">{reportData.data.safeSpaces.childrenReached}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className={`text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t.caseManagement.avgPerSessionLabel}</span>
              <span className="font-semibold">{reportData.data.safeSpaces.avgChildrenPerSession}</span>
            </div>
          </div>
        </div>

        {/* Activities Table */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 md:col-span-2">
          <h3 className={`text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Activity className="w-5 h-5 text-blue-600" />
            {t.caseManagement.activitiesServices}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {reportData.data.activities.byType.map((activity, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className={`text-xs text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{activity.type}</div>
                <div className={`text-2xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">{activity.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}