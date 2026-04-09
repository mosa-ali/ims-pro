import { useState, useEffect } from 'react';
import { Download, FileText, Calendar, TrendingUp, Users, Shield, Activity, Edit, Save, AlertCircle } from 'lucide-react';

import { useTranslation } from 'react-i18next';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';
import { useCaseManagementReportData } from '@/hooks/useCaseManagementReportData';

interface ReportsAnalyticsProps {
  projectId: number;
  projectName: string;
  donorName: string;
}

export function ReportsAnalytics({ projectId, projectName, donorName }: ReportsAnalyticsProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n?.language === 'ar';
  
  const [dateFrom, setDateFrom] = useState('2024-01-01');
  const [dateTo, setDateTo] = useState('2024-12-31');
  
  // Fetch real data from Case Management modules
  const reportDataHook = useCaseManagementReportData({
    projectId,
    filters: {
      reportingPeriodStart: dateFrom,
      reportingPeriodEnd: dateTo
    },
    currentUser: { name: 'Current User' }
  });
  
  // Convert hook data to expected format with fallback defaults
  const defaultReportData = {
    cases: { total: 0, new: 0, active: 0, closed: 0, highRisk: 0, avgCaseDuration: 0, details: [] },
    pssSessions: { total: 0, individual: 0, group: 0, avgDuration: 0, followUpsScheduled: 0, details: [] },
    referrals: { total: 0, internal: 0, external: 0, completed: 0, completionRate: 0, details: [] },
    safeSpaces: { locations: 0, totalActivities: 0, childrenReached: 0, avgChildrenPerSession: 0, details: [] },
    activities: { total: 0, byType: [], details: [] }
  };
  
  const reportData = reportDataHook?.report || defaultReportData;
  
  // Additional safety check for nested properties
  if (!reportData.cases) reportData.cases = defaultReportData.cases;
  if (!reportData.pssSessions) reportData.pssSessions = defaultReportData.pssSessions;
  if (!reportData.referrals) reportData.referrals = defaultReportData.referrals;
  if (!reportData.safeSpaces) reportData.safeSpaces = defaultReportData.safeSpaces;
  if (!reportData.activities) reportData.activities = defaultReportData.activities;
  const loading = false;
  const error = null;
  
  // Editable narrative sections with localStorage persistence
  const storageKey = `cm_report_narrative_${projectId}_${dateFrom}_${dateTo}`;
  
  const [executiveSummary, setExecutiveSummary] = useState('');
  const [keyAchievements, setKeyAchievements] = useState('');
  const [isEditingExecutiveSummary, setIsEditingExecutiveSummary] = useState(false);
  const [isEditingAchievements, setIsEditingAchievements] = useState(false);

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
    if (!reportData || reportData.cases.total === 0) return '';

    const highRiskPercent = reportData.cases.total > 0
      ? ((reportData.cases.highRisk / reportData.cases.total) * 100).toFixed(1)
      : '0';

    const completionRate = reportData.referrals.completionRate.toFixed(1);

    if (isRTL) {
      // Arabic version
      return `خلال الفترة المشمولة بالتقرير من ${dateFrom} إلى ${dateTo}، قدم مشروع ${projectName} الدعم النفسي والحماية لـ ${reportData.cases.total} مستفيد من خلال إدارة الحالا�� النشطة. تم تسجيل ${reportData.cases.new} حالة جديدة، منها ${highRiskPercent}% تم تصنيفها كحالات عالية الخطورة تتطلب خدمات متابعة مكثفة. أجرى المشروع ${reportData.pssSessions.total} جلسة دعم نفسي (${reportData.pssSessions.individual} فردية، ${reportData.pssSessions.group} جماعية) ووصل إلى ${reportData.safeSpaces.childrenReached} طفل من خلال ${reportData.safeSpaces.totalActivities} نشاط مساحة آمنة للأطفال عبر ${reportData.safeSpaces.locations} موقع. تم إجراء ${reportData.referrals.total} إحالة إلى المنظمات الشريكة، بمعدل إكمال ${completionRate}٪.`;
    } else {
      // English version
      return `During the reporting period from ${dateFrom} to ${dateTo}, the ${projectName} provided psychosocial and protection support to ${reportData.cases.total} beneficiaries through active case management. ${reportData.cases.new} new cases were registered, with ${highRiskPercent}% classified as high-risk requiring intensive follow-up services. The project conducted ${reportData.pssSessions.total} PSS sessions (${reportData.pssSessions.individual} individual, ${reportData.pssSessions.group} group) and reached ${reportData.safeSpaces.childrenReached} children through ${reportData.safeSpaces.totalActivities} Child Safe Space activities across ${reportData.safeSpaces.locations} locations. ${reportData.referrals.total} referrals were made to partner organizations, achieving a ${completionRate}% completion rate.`;
    }
  };

  // AUTO-GENERATE KEY ACHIEVEMENTS from real data
  const generateKeyAchievements = () => {
    if (!reportData) return '';

    const achievements = [];

    if (isRTL) {
      // Arabic version
      // Cases achievement
      if (reportData.cases.total > 0) {
        const closureRate = reportData.cases.total > 0
          ? ((reportData.cases.closed / reportData.cases.total) * 100).toFixed(0)
          : '0';
        achievements.push(`• ${reportData.cases.total} حالة تمت إدارتها، منها ${closureRate}٪ تم إغلاقها بنجاح`);
      }

      // PSS Sessions achievement
      if (reportData.pssSessions.total > 0) {
        achievements.push(`• ${reportData.pssSessions.total} جلسة دعم نفسي تم إجراؤها (${reportData.pssSessions.individual} فردية، ${reportData.pssSessions.group} جماعية)`);
      }

      // Referrals achievement
      if (reportData.referrals.total > 0) {
        achievements.push(`• ${reportData.referrals.total} إحالة تمت مع المنظمات الشريكة، بمعدل إكمال ${reportData.referrals.completionRate}٪`);
      }

      // Child Safe Space achievement
      if (reportData.safeSpaces.childrenReached > 0) {
        achievements.push(`• ${reportData.safeSpaces.childrenReached} طفل شاركوا في أنشطة المساحات الآمنة عبر ${reportData.safeSpaces.locations} موقع`);
      }

      // Activities achievement
      if (reportData.activities.total > 0) {
        achievements.push(`• ${reportData.activities.total} نشاط منظم تم تنفيذه خلال فترة التقرير`);
      }
    } else {
      // English version
      // Cases achievement
      if (reportData.cases.total > 0) {
        const closureRate = reportData.cases.total > 0
          ? ((reportData.cases.closed / reportData.cases.total) * 100).toFixed(0)
          : '0';
        achievements.push(`• ${reportData.cases.total} cases managed, with ${closureRate}% successfully closed`);
      }

      // PSS Sessions achievement
      if (reportData.pssSessions.total > 0) {
        achievements.push(`• ${reportData.pssSessions.total} PSS sessions conducted (${reportData.pssSessions.individual} individual, ${reportData.pssSessions.group} group)`);
      }

      // Referrals achievement
      if (reportData.referrals.total > 0) {
        achievements.push(`• ${reportData.referrals.total} referrals completed with partner organizations, ${reportData.referrals.completionRate}% completion rate`);
      }

      // Child Safe Space achievement
      if (reportData.safeSpaces.childrenReached > 0) {
        achievements.push(`• ${reportData.safeSpaces.childrenReached} children participated in safe space activities across ${reportData.safeSpaces.locations} locations`);
      }

      // Activities achievement
      if (reportData.activities.total > 0) {
        achievements.push(`• ${reportData.activities.total} structured activities implemented during the reporting period`);
      }
    }

    return achievements.join('\n');
  };

  // Export to PDF
  const handleExportPDF = () => {
    if (!reportData) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to export PDF');
      return;
    }

    const finalExecutiveSummary = executiveSummary || generateExecutiveSummary();
    const finalAchievements = keyAchievements || generateKeyAchievements();
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Case Management Report - ${projectName}</title>
        <style>
          @page { margin: 20mm; }
          body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            margin: 0;
            padding: 20px;
            line-height: 1.6;
            color: #1f2937;
          }
          .header {
            border-bottom: 4px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          h1 { 
            color: #2563eb; 
            margin: 0 0 15px 0;
            font-size: 28px;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            background: #f3f4f6;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .meta-item {
            font-size: 13px;
          }
          .meta-label {
            color: #6b7280;
            font-weight: 600;
            margin-bottom: 4px;
          }
          .meta-value {
            color: #1f2937;
            font-weight: 500;
          }
          h2 { 
            color: #1e40af; 
            margin-top: 35px;
            margin-bottom: 15px;
            font-size: 18px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 8px;
          }
          .metrics-grid { 
            display: grid; 
            grid-template-columns: repeat(3, 1fr); 
            gap: 15px;
            margin: 25px 0;
          }
          .metric-card { 
            background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
            padding: 18px; 
            border-left: 4px solid #2563eb;
            border-radius: 6px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          .metric-label { 
            color: #6b7280; 
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 600;
            margin-bottom: 8px;
          }
          .metric-value { 
            font-size: 28px; 
            font-weight: bold; 
            color: #1f2937;
          }
          .narrative-section {
            background: #f9fafb;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            border-left: 4px solid #10b981;
            white-space: pre-wrap;
            font-size: 14px;
            line-height: 1.8;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 13px;
          }
          th {
            background: #2563eb;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
          }
          td {
            padding: 10px 12px;
            border-bottom: 1px solid #e5e7eb;
          }
          tr:hover {
            background: #f9fafb;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 11px;
          }
          @media print {
            .no-print { display: none; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Case Management Report</h1>
          <div class="meta-grid">
            <div class="meta-item">
              <div class="meta-label">Project</div>
              <div class="meta-value">${projectName}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Donor</div>
              <div class="meta-value">${donorName}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Reporting Period</div>
              <div class="meta-value">${dateFrom} to ${dateTo}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Generated</div>
              <div class="meta-value">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
          </div>
        </div>

        <h2>Executive Summary</h2>
        <div class="narrative-section">${finalExecutiveSummary}</div>

        <h2>Key Metrics</h2>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-label">Total Beneficiaries</div>
            <div class="metric-value">${reportData.cases.total}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">PSS Sessions</div>
            <div class="metric-value">${reportData.pssSessions.total}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Children Reached</div>
            <div class="metric-value">${reportData.safeSpaces.childrenReached}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Total Referrals</div>
            <div class="metric-value">${reportData.referrals.total}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">CSS Locations</div>
            <div class="metric-value">${reportData.safeSpaces.locations}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">High-Risk Cases</div>
            <div class="metric-value" style="color: #dc2626;">${reportData.cases.highRisk}</div>
          </div>
        </div>

        ${finalAchievements ? `
          <h2>Key Achievements</h2>
          <div class="narrative-section">${finalAchievements}</div>
        ` : ''}

        <h2>Detailed Tables</h2>
        
        <h3 style="color: #059669; margin-top: 25px; margin-bottom: 10px; font-size: 16px;">Cases Overview</h3>
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th style="text-align: right;">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Total Cases</td><td style="text-align: right; font-weight: 600;">${reportData.cases.total}</td></tr>
            <tr><td>New Cases (Period)</td><td style="text-align: right; font-weight: 600;">${reportData.cases.new}</td></tr>
            <tr><td>Active Cases</td><td style="text-align: right; font-weight: 600;">${reportData.cases.active}</td></tr>
            <tr><td>Closed Cases</td><td style="text-align: right; font-weight: 600;">${reportData.cases.closed}</td></tr>
            <tr><td>High-Risk Cases</td><td style="text-align: right; font-weight: 600; color: #dc2626;">${reportData.cases.highRisk}</td></tr>
            <tr><td>Average Case Duration</td><td style="text-align: right; font-weight: 600;">${reportData.cases.avgCaseDuration} days</td></tr>
          </tbody>
        </table>

        <h3 style="color: #059669; margin-top: 25px; margin-bottom: 10px; font-size: 16px;">PSS Sessions</h3>
        <table>
          <thead>
            <tr>
              <th>Indicator</th>
              <th style="text-align: right;">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Total PSS Sessions</td><td style="text-align: right; font-weight: 600;">${reportData.pssSessions.total}</td></tr>
            <tr><td>Individual Sessions</td><td style="text-align: right; font-weight: 600;">${reportData.pssSessions.individual}</td></tr>
            <tr><td>Group Sessions</td><td style="text-align: right; font-weight: 600;">${reportData.pssSessions.group}</td></tr>
            <tr><td>Average Duration</td><td style="text-align: right; font-weight: 600;">${reportData.pssSessions.avgDuration} min</td></tr>
            <tr><td>Follow-ups Scheduled</td><td style="text-align: right; font-weight: 600;">${reportData.pssSessions.followUpsScheduled}</td></tr>
          </tbody>
        </table>

        <h3 style="color: #059669; margin-top: 25px; margin-bottom: 10px; font-size: 16px;">Referrals</h3>
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th style="text-align: right;">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Total Referrals</td><td style="text-align: right; font-weight: 600;">${reportData.referrals.total}</td></tr>
            <tr><td>Internal Referrals</td><td style="text-align: right; font-weight: 600;">${reportData.referrals.internal}</td></tr>
            <tr><td>External Referrals</td><td style="text-align: right; font-weight: 600;">${reportData.referrals.external}</td></tr>
            <tr><td>Completed Referrals</td><td style="text-align: right; font-weight: 600;">${reportData.referrals.completed}</td></tr>
            <tr><td>Completion Rate</td><td style="text-align: right; font-weight: 600;">${reportData.referrals.completionRate}%</td></tr>
          </tbody>
        </table>

        <h3 style="color: #059669; margin-top: 25px; margin-bottom: 10px; font-size: 16px;">Child Safe Spaces</h3>
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th style="text-align: right;">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Active CSS Locations</td><td style="text-align: right; font-weight: 600;">${reportData.safeSpaces.locations}</td></tr>
            <tr><td>Total CSS Activities</td><td style="text-align: right; font-weight: 600;">${reportData.safeSpaces.totalActivities}</td></tr>
            <tr><td>Children Reached</td><td style="text-align: right; font-weight: 600;">${reportData.safeSpaces.childrenReached}</td></tr>
            <tr><td>Avg. Children per Session</td><td style="text-align: right; font-weight: 600;">${reportData.safeSpaces.avgChildrenPerSession}</td></tr>
          </tbody>
        </table>

        <h3 style="color: #059669; margin-top: 25px; margin-bottom: 10px; font-size: 16px;">Activities & Services</h3>
        <table>
          <thead>
            <tr>
              <th>Activity Type</th>
              <th style="text-align: right;">Count</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.activities.byType.map(a => `
              <tr><td>${a.type}</td><td style="text-align: right; font-weight: 600;">${a.count}</td></tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>This report was automatically generated from Case Management database records</p>
          <p>Generated on ${new Date().toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>

        <div class="no-print" style="margin-top: 30px; text-align: center; padding: 20px;">
          <button onclick="window.print()" style="padding: 12px 24px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; margin-right: 10px;">Print / Save as PDF</button>
          <button onclick="window.close()" style="padding: 12px 24px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600;">Close</button>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
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

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Generating report...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !reportData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 font-medium">Failed to generate report</p>
          <p className="text-gray-600 text-sm mt-2">Please try again</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex items-center justify-between mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h2 className="text-sm font-semibold text-gray-900">{t('caseManagement.caseManagementAutoReport')}</h2>
          <p className="text-xs text-gray-600 mt-0.5">{t('caseManagement.autoGeneratedFromData')}</p>
        </div>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={handleExportPDF}
            className={`px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <FileText className="w-4 h-4" />
            {t('caseManagement.printSaveAsPDF')}
          </button>
          <button
            onClick={handleExportExcel}
            className={`px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Download className="w-4 h-4" />
            {t('caseManagement.exportExcel')}
          </button>
        </div>
      </div>

      {/* Report Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white" dir={isRTL ? 'rtl' : 'ltr'}>
        <h1 className={`text-2xl font-bold mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t('caseManagement.caseManagementReport')}</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <div className="opacity-80">{t('caseManagement.project')}</div>
            <div className="font-semibold">{projectName}</div>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <div className="opacity-80">{t('caseManagement.donor')}</div>
            <div className="font-semibold">{donorName}</div>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <div className="opacity-80">{t('caseManagement.reportingPeriod')}</div>
            <div className="font-semibold" dir="ltr">{dateFrom} {t('caseManagement.to')} {dateTo}</div>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <div className="opacity-80">{t('caseManagement.generatedOn')}</div>
            <div className="font-semibold" dir="ltr">{new Date().toLocaleDateString()}</div>
          </div>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className={`flex items-center gap-4 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Calendar className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">{t('caseManagement.reportingPeriod')}:</span>
          </div>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md"
          />
          <span className="text-gray-500">{t('caseManagement.to')}</span>
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
            {t('caseManagement.executiveSummary')}
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
                {t('common.save')}
              </>
            ) : (
              <>
                <Edit className="w-4 h-4" />
                {t('common.edit')}
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
        <h3 className={`text-lg font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t('caseManagement.keyMetrics')}</h3>
        <div className="grid grid-cols-3 gap-4" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border-l-4 border-blue-600">
            <div className={`text-xs text-blue-700 font-medium uppercase mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t('caseManagement.totalBeneficiaries')}</div>
            <div className={`text-3xl font-bold text-blue-900 ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">{reportData.cases.total}</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border-l-4 border-purple-600">
            <div className={`text-xs text-purple-700 font-medium uppercase mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t('caseManagement.pssSessions')}</div>
            <div className={`text-3xl font-bold text-purple-900 ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">{reportData.pssSessions.total}</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border-l-4 border-green-600">
            <div className={`text-xs text-green-700 font-medium uppercase mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t('caseManagement.childrenReached')}</div>
            <div className={`text-3xl font-bold text-green-900 ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">{reportData.safeSpaces.childrenReached}</div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border-l-4 border-orange-600">
            <div className={`text-xs text-orange-700 font-medium uppercase mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t('caseManagement.totalReferrals')}</div>
            <div className={`text-3xl font-bold text-orange-900 ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">{reportData.referrals.total}</div>
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border-l-4 border-indigo-600">
            <div className={`text-xs text-indigo-700 font-medium uppercase mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t('caseManagement.cssLocations')}</div>
            <div className={`text-3xl font-bold text-indigo-900 ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">{reportData.safeSpaces.locations}</div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border-l-4 border-red-600">
            <div className={`text-xs text-red-700 font-medium uppercase mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t('caseManagement.highRiskCases')}</div>
            <div className={`text-3xl font-bold text-red-900 ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">{reportData.cases.highRisk}</div>
          </div>
        </div>
      </div>

      {/* Key Achievements - Auto-Generated & Editable */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h3 className={`text-lg font-semibold text-gray-900 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <TrendingUp className="w-5 h-5 text-green-600" />
            {t('caseManagement.keyAchievements')}
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
                {t('common.save')}
              </>
            ) : (
              <>
                <Edit className="w-4 h-4" />
                {t('common.edit')}
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
            {t('caseManagement.casesLabel')}
          </h3>
          <div className="space-y-2 text-sm">
            <div className={`flex justify-between py-2 border-b ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-gray-600">{t('caseManagement.totalCasesLabel')}</span>
              <span className="font-semibold" dir="ltr">{reportData.cases.total}</span>
            </div>
            <div className={`flex justify-between py-2 border-b ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-gray-600">{t('caseManagement.newCasesLabel')}</span>
              <span className="font-semibold" dir="ltr">{reportData.cases.new}</span>
            </div>
            <div className={`flex justify-between py-2 border-b ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-gray-600">{t('caseManagement.activeCasesLabel')}</span>
              <span className="font-semibold" dir="ltr">{reportData.cases.active}</span>
            </div>
            <div className={`flex justify-between py-2 border-b ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-gray-600">{t('caseManagement.closedCasesLabel')}</span>
              <span className="font-semibold" dir="ltr">{reportData.cases.closed}</span>
            </div>
            <div className={`flex justify-between py-2 border-b ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-gray-600">{t('caseManagement.highRiskCasesLabel')}</span>
              <span className="font-semibold text-red-600" dir="ltr">{reportData.cases.highRisk}</span>
            </div>
            <div className={`flex justify-between py-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-gray-600">{t('caseManagement.avgDurationLabel')}</span>
              <span className="font-semibold" dir="ltr">{reportData.cases.avgCaseDuration} {t('caseManagement.days')}</span>
            </div>
          </div>
        </div>

        {/* PSS Sessions Table */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className={`text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Activity className="w-5 h-5 text-purple-600" />
            {t('caseManagement.pssSessionsLabel')}
          </h3>
          <div className="space-y-2 text-sm">
            <div className={`flex justify-between py-2 border-b ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-gray-600">{t('caseManagement.totalSessionsLabel')}</span>
              <span className="font-semibold" dir="ltr">{reportData.pssSessions.total}</span>
            </div>
            <div className={`flex justify-between py-2 border-b ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-gray-600">{t('caseManagement.individualSessionsCount')}</span>
              <span className="font-semibold" dir="ltr">{reportData.pssSessions.individual}</span>
            </div>
            <div className={`flex justify-between py-2 border-b ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-gray-600">{t('caseManagement.groupSessionsCount')}</span>
              <span className="font-semibold" dir="ltr">{reportData.pssSessions.group}</span>
            </div>
            <div className={`flex justify-between py-2 border-b ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-gray-600">{t('caseManagement.avgDuration')}</span>
              <span className="font-semibold" dir="ltr">{reportData.pssSessions.avgDuration} min</span>
            </div>
            <div className={`flex justify-between py-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-gray-600">{t('caseManagement.followUpsScheduledLabel')}</span>
              <span className="font-semibold" dir="ltr">{reportData.pssSessions.followUpsScheduled}</span>
            </div>
          </div>
        </div>

        {/* Referrals Table */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className={`text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Shield className="w-5 h-5 text-orange-600" />
            {t('caseManagement.referralsLabel')}
          </h3>
          <div className="space-y-2 text-sm">
            <div className={`flex justify-between py-2 border-b ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-gray-600">{t('caseManagement.totalReferralsLabel')}</span>
              <span className="font-semibold" dir="ltr">{reportData.referrals.total}</span>
            </div>
            <div className={`flex justify-between py-2 border-b ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-gray-600">{t('caseManagement.internalReferralsLabel')}</span>
              <span className="font-semibold" dir="ltr">{reportData.referrals.internal}</span>
            </div>
            <div className={`flex justify-between py-2 border-b ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-gray-600">{t('caseManagement.externalReferralsLabel')}</span>
              <span className="font-semibold" dir="ltr">{reportData.referrals.external}</span>
            </div>
            <div className={`flex justify-between py-2 border-b ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-gray-600">{t('caseManagement.completedLabel')}</span>
              <span className="font-semibold text-green-600" dir="ltr">{reportData.referrals.completed}</span>
            </div>
            <div className={`flex justify-between py-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-gray-600">{t('caseManagement.completionRateLabel')}</span>
              <span className="font-semibold" dir="ltr">{reportData.referrals.completionRate}%</span>
            </div>
          </div>
        </div>

        {/* Safe Spaces Table */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className={`text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Users className="w-5 h-5 text-indigo-600" />
            {t('caseManagement.safeSpacesLabel')}
          </h3>
          <div className="space-y-2 text-sm">
            <div className={`flex justify-between py-2 border-b ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-gray-600">{t('caseManagement.activeLocationsLabel')}</span>
              <span className="font-semibold" dir="ltr">{reportData.safeSpaces.locations}</span>
            </div>
            <div className={`flex justify-between py-2 border-b ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-gray-600">{t('caseManagement.totalActivitiesLabel')}</span>
              <span className="font-semibold" dir="ltr">{reportData.safeSpaces.totalActivities}</span>
            </div>
            <div className={`flex justify-between py-2 border-b ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-gray-600">{t('caseManagement.childrenReached')}</span>
              <span className="font-semibold" dir="ltr">{reportData.safeSpaces.childrenReached}</span>
            </div>
            <div className={`flex justify-between py-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-gray-600">{t('caseManagement.avgPerSessionLabel')}</span>
              <span className="font-semibold" dir="ltr">{reportData.safeSpaces.avgChildrenPerSession}</span>
            </div>
          </div>
        </div>

        {/* Activities Table */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 md:col-span-2">
          <h3 className={`text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Activity className="w-5 h-5 text-blue-600" />
            {t('caseManagement.activitiesServices')}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {reportData.activities.byType.map((activity, index) => (
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