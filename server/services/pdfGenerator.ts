/**
 * ============================================================================
 * SERVER-SIDE PDF GENERATOR
 * ============================================================================
 * 
 * Generates document-based PDFs using Puppeteer (headless Chrome).
 * Produces real PDFs with:
 * - Selectable text
 * - Searchable content
 * - Real tables
 * - Vector graphics (no pixelation)
 * 
 * ============================================================================
 */

import puppeteer from 'puppeteer';

interface ProjectReportPDFData {
  project: {
    name: string;
    code: string;
    status: string;
    startDate: string;
    endDate: string;
    location: string;
    sectors: string[];
    currency: string;
    daysRemaining: number;
  };
  activities: {
    total: number;
    completed: number;
    completionRate: number;
    details: Array<{
      activityTitle: string;
      target: number;
      achieved: number;
      progress: number;
      status: string;
    }>;
  };
  indicators: {
    total: number;
    achieved: number;
    averageAchievement: number;
    details: Array<{
      name: string;
      baseline: number;
      target: number;
      actual: number;
      achievementRate: number;
    }>;
  };
  financial: {
    totalBudget: number;
    actualSpent: number;
    remaining: number;
    burnRate: number;
  };
  riskCalculation: {
    level: string;
    score: number;
    summary: string;
    factors: Array<{
      name: string;
      value: number;
      status: string;
      description: string;
    }>;
  };
  narratives: {
    progressSummary: string;
    challenges: string;
    mitigationActions: string;
    keyAchievements: string;
    nextSteps: string;
  };
  organizationName: string;
  language: 'en' | 'ar';
}

function formatDate(dateStr: string, isRTL: boolean = false): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatCurrency(amount: number, currency: string = 'USD', isRTL: boolean = false): string {
  return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function generateExecutiveSummary(data: ProjectReportPDFData): string {
  const { activities, financial, riskCalculation, project } = data;
  const startDate = new Date(project.startDate);
  const endDate = new Date(project.endDate);
  const today = new Date();
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const elapsedDays = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const timeElapsedPercent = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

  // Implementation Status
  let statusText = '';
  if (activities.completionRate === 0 && timeElapsedPercent > 20) {
    statusText = '<strong>Implementation:</strong> Delayed start phase with no measurable implementation progress.';
  } else if (activities.completionRate < 30) {
    statusText = '<strong>Implementation:</strong> Early implementation stages.';
  } else if (activities.completionRate < 70) {
    statusText = '<strong>Implementation:</strong> Active implementation phase.';
  } else {
    statusText = '<strong>Implementation:</strong> Approaching completion.';
  }

  // Financial Status
  let budgetText = '';
  if (financial.burnRate === 0 && timeElapsedPercent > 20) {
    budgetText = '<strong>Financial:</strong> No budget disbursed despite significant time elapsed.';
  } else if (financial.burnRate < timeElapsedPercent - 20) {
    budgetText = '<strong>Financial:</strong> Spending below expected level.';
  } else {
    budgetText = '<strong>Financial:</strong> Spending aligned with timeline.';
  }

  // Risk Implication
  let riskText = '';
  if (riskCalculation.level === 'Critical') {
    riskText = '<strong>Risk:</strong> Critical risks requiring immediate intervention.';
  } else if (riskCalculation.level === 'High') {
    riskText = '<strong>Risk:</strong> High risks requiring urgent attention.';
  } else if (riskCalculation.level === 'Medium') {
    riskText = '<strong>Risk:</strong> Medium risks being monitored.';
  } else {
    riskText = '<strong>Risk:</strong> Low risk, progressing well.';
  }

  // Structured format with line breaks for better readability
  return `${statusText}<br/>${budgetText}<br/>${riskText}`;
}

function generateRiskExplanation(data: ProjectReportPDFData): string {
  const factors = data.riskCalculation.factors || [];
  const criticalFactors = factors.filter(f => f.status === 'critical');
  const warningFactors = factors.filter(f => f.status === 'warning');
  
  if (criticalFactors.length === 0 && warningFactors.length === 0) {
    return 'All risk indicators within acceptable limits.';
  }

  const reasons: string[] = [];
  criticalFactors.forEach(f => {
    if (f.name.includes('Implementation')) reasons.push('No implementation progress');
    if (f.name.includes('Budget')) reasons.push('No budget utilization');
  });
  warningFactors.forEach(f => {
    if (f.name.includes('Time')) reasons.push(`${f.value}% time elapsed`);
  });

  return 'Based on: ' + reasons.join(', ') + '.';
}

function generateHTMLReport(data: ProjectReportPDFData): string {
  const isRTL = data.language === 'ar';
  const today = new Date();
  
  // Calculate time metrics
  const startDate = new Date(data.project.startDate);
  const endDate = new Date(data.project.endDate);
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const elapsedDays = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const timeElapsedPercent = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

  const riskColor = data.riskCalculation.level === 'Critical' ? '#dc2626' : 
                    data.riskCalculation.level === 'High' ? '#ea580c' : 
                    data.riskCalculation.level === 'Medium' ? '#ca8a04' : '#16a34a';
  const riskBg = data.riskCalculation.level === 'Critical' ? '#fef2f2' : 
                 data.riskCalculation.level === 'High' ? '#fff7ed' : 
                 data.riskCalculation.level === 'Medium' ? '#fefce8' : '#f0fdf4';

  return `
<!DOCTYPE html>
<html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${data.language}">
<head>
  <meta charset="UTF-8">
  <title>${data.project.name} - Project Report</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    @page {
      size: A4 portrait;
      margin: 12mm 12mm 15mm 12mm;
    }
    
    body {
      font-family: ${isRTL ? "'Noto Sans Arabic', 'Arial', sans-serif" : "'Inter', 'Arial', sans-serif"};
      font-size: 9pt;
      line-height: 1.4;
      color: #1a1a1a;
      background: white;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    .container {
      width: 100%;
      max-width: none;
    }
    
    /* Header */
    .header {
      background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
      color: white;
      padding: 16px 20px;
      margin-bottom: 0;
    }
    
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(255,255,255,0.2);
    }
    
    .logo-section {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .logo {
      width: 40px;
      height: 40px;
      background: white;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: #1e3a5f;
      font-size: 12pt;
    }
    
    .org-name {
      font-size: 11pt;
      font-weight: 600;
    }
    
    .report-meta {
      text-align: ${isRTL ? 'left' : 'right'};
      font-size: 8pt;
    }
    
    .report-meta .title {
      font-weight: 600;
      font-size: 10pt;
    }
    
    .project-title {
      font-size: 16pt;
      font-weight: 700;
      margin-bottom: 4px;
    }
    
    .project-code {
      font-size: 9pt;
      opacity: 0.9;
    }
    
    /* Sections */
    .section {
      padding: 10px 16px;
      margin-bottom: 8px;
    }
    
    .section-title {
      font-size: 11pt;
      font-weight: 700;
      color: #1e3a5f;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 2px solid #00a8a8;
    }
    
    /* Executive Summary */
    .executive-summary {
      background: #f8fafc;
      border-left: 4px solid #00a8a8;
      padding: 12px 16px;
      margin: 12px 16px;
    }
    
    .executive-summary h3 {
      font-size: 11pt;
      font-weight: 700;
      color: #1e3a5f;
      margin-bottom: 6px;
    }
    
    .executive-summary p {
      font-size: 9pt;
      color: #334155;
      line-height: 1.5;
    }
    
    /* Two Column Layout */
    .two-columns {
      display: flex;
      gap: 16px;
      padding: 0 16px;
      margin-bottom: 12px;
    }
    
    .column {
      flex: 1;
    }
    
    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }
    
    th, td {
      padding: 6px 8px;
      text-align: ${isRTL ? 'right' : 'left'};
      border: 1px solid #e2e8f0;
      font-size: 8pt;
    }
    
    th {
      background: #00a8a8;
      color: white;
      font-weight: 600;
    }
    
    .label-cell {
      background: #f8fafc;
      font-weight: 600;
      width: 35%;
    }
    
    /* Risk Box */
    .risk-box {
      background: ${riskBg};
      border: 1px solid ${riskColor};
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 10px;
    }
    
    .risk-badge {
      display: inline-block;
      background: ${riskColor};
      color: white;
      padding: 3px 12px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 9pt;
    }
    
    .risk-score {
      margin-left: 10px;
      font-size: 8pt;
      color: #64748b;
    }
    
    .risk-explanation {
      margin-top: 6px;
      font-size: 8pt;
      color: #475569;
    }
    
    /* Status Badges */
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 7pt;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .status-ongoing { background: #00a8a8; color: white; }
    .status-completed { background: #16a34a; color: white; }
    .status-critical { background: #dc2626; color: white; }
    .status-warning { background: #ca8a04; color: white; }
    .status-ok { background: #16a34a; color: white; }
    .status-in-progress { background: #f59e0b; color: white; }
    
    /* Progress Bar */
    .progress-bar {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .progress-track {
      width: 50px;
      height: 8px;
      background: #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
    }
    
    .progress-fill {
      height: 100%;
      background: #00a8a8;
    }
    
    .progress-fill.zero { background: #dc2626; }
    
    .progress-text {
      font-size: 8pt;
      font-weight: 600;
    }
    
    /* KPI Values */
    .kpi-value {
      font-weight: 700;
      font-size: 10pt;
    }
    
    .kpi-value.teal { color: #00a8a8; }
    .kpi-value.red { color: #dc2626; }
    .kpi-value.green { color: #16a34a; }
    
    /* Financial Warning */
    .financial-warning {
      margin-top: 6px;
      font-size: 8pt;
      color: #dc2626;
      font-style: italic;
    }
    
    /* Narrative Section */
    .narrative-row td:first-child {
      width: 25%;
      vertical-align: top;
    }
    
    .narrative-placeholder {
      color: #94a3b8;
      font-style: italic;
    }
    
    /* Footer */
    .footer {
      border-top: 1px solid #e2e8f0;
      padding: 10px 16px;
      margin-top: 12px;
      display: flex;
      justify-content: space-between;
      font-size: 7pt;
      color: #64748b;
    }
    
    /* Page break control */
    .no-break {
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- HEADER -->
    <div class="header">
      <div class="header-top">
        <div class="logo-section">
          <div class="logo">IMS</div>
          <span class="org-name">${data.organizationName}</span>
        </div>
        <div class="report-meta">
          <div class="title">Project Report</div>
          <div>${formatDate(today.toISOString(), isRTL)}</div>
          <div style="opacity: 0.8;">Period: ${formatDate(data.project.startDate, isRTL)} - ${formatDate(data.project.endDate, isRTL)}</div>
        </div>
      </div>
      <div class="project-title">${data.project.name}</div>
      <div class="project-code">Project Code: ${data.project.code}</div>
    </div>
    
    <!-- EXECUTIVE SUMMARY -->
    <div class="executive-summary">
      <h3>📋 Executive Summary</h3>
      <p>${generateExecutiveSummary(data)}</p>
    </div>
    
    <!-- PROJECT OVERVIEW + KPIs -->
    <div class="two-columns">
      <div class="column">
        <div class="section-title">📁 Project Overview</div>
        <table>
          <tbody>
            <tr>
              <td class="label-cell">Status</td>
              <td><span class="status-badge status-ongoing">${data.project.status}</span></td>
            </tr>
            <tr>
              <td class="label-cell">Location</td>
              <td>${data.project.location || 'N/A'}</td>
            </tr>
            <tr>
              <td class="label-cell">Sectors</td>
              <td>${data.project.sectors?.join(', ') || 'N/A'}</td>
            </tr>
            <tr>
              <td class="label-cell">Duration</td>
              <td>${formatDate(data.project.startDate, isRTL)} → ${formatDate(data.project.endDate, isRTL)}</td>
            </tr>
            <tr>
              <td class="label-cell">Days Remaining</td>
              <td class="kpi-value teal">${data.project.daysRemaining} days (${Math.round(timeElapsedPercent)}% elapsed)</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div class="column">
        <div class="section-title">📊 Key Performance Indicators</div>
        <table>
          <tbody>
            <tr>
              <td class="label-cell">Implementation Progress</td>
              <td class="kpi-value ${data.activities.completionRate === 0 ? 'red' : 'teal'}">${data.activities.completionRate.toFixed(0)}%</td>
            </tr>
            <tr>
              <td class="label-cell">Budget Burn Rate</td>
              <td class="kpi-value ${data.financial.burnRate === 0 ? 'red' : ''}">${data.financial.burnRate.toFixed(1)}%</td>
            </tr>
            <tr>
              <td class="label-cell">Activities</td>
              <td>${data.activities.completed}/${data.activities.total}</td>
            </tr>
            <tr>
              <td class="label-cell">Indicators</td>
              <td>${data.indicators.achieved}/${data.indicators.total}</td>
            </tr>
            <tr>
              <td class="label-cell">Risk Level</td>
              <td><span class="risk-badge">${data.riskCalculation.level}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- RISK ANALYSIS -->
    <div class="section no-break">
      <div class="section-title">⚠️ Risk Analysis</div>
      <div class="risk-box">
        <span class="risk-badge">${data.riskCalculation.level}</span>
        <span class="risk-score">Score: ${data.riskCalculation.score}/100</span>
        <p class="risk-explanation"><strong>Explanation:</strong> ${generateRiskExplanation(data)}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Risk Factor</th>
            <th>Value</th>
            <th>Status</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          ${(data.riskCalculation.factors || []).map(factor => `
            <tr>
              <td style="font-weight: 600;">${factor.name}</td>
              <td>${factor.value}%</td>
              <td><span class="status-badge status-${factor.status}">${factor.status.toUpperCase()}</span></td>
              <td style="font-size: 7pt;">${factor.description}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <!-- ACTIVITIES PROGRESS -->
    <div class="section no-break">
      <div class="section-title">🎯 Activities Progress</div>
      ${data.activities.details && data.activities.details.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Activity</th>
              <th>Target</th>
              <th>Achieved</th>
              <th>Progress</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.activities.details.map(activity => `
              <tr>
                <td style="font-weight: 600;">${activity.activityTitle}</td>
                <td>${activity.target}%</td>
                <td>${activity.achieved}%</td>
                <td>
                  <div class="progress-bar">
                    <div class="progress-track">
                      <div class="progress-fill ${activity.progress === 0 ? 'zero' : ''}" style="width: ${activity.progress}%;"></div>
                    </div>
                    <span class="progress-text" style="color: ${activity.progress === 0 ? '#dc2626' : '#00a8a8'};">${activity.progress}%</span>
                  </div>
                </td>
                <td><span class="status-badge status-${activity.status === 'completed' ? 'completed' : 'in-progress'}">${activity.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : '<p style="color: #64748b; font-style: italic;">No activities recorded yet.</p>'}
    </div>
    
    <!-- INDICATORS ACHIEVEMENT -->
    <div class="section no-break">
      <div class="section-title">📈 Indicators Achievement</div>
      ${data.indicators.details && data.indicators.details.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Indicator</th>
              <th>Baseline</th>
              <th>Target</th>
              <th>Actual</th>
              <th>Achievement</th>
            </tr>
          </thead>
          <tbody>
            ${data.indicators.details.map(indicator => `
              <tr>
                <td style="font-weight: 600;">${indicator.name}</td>
                <td>${indicator.baseline}</td>
                <td>${indicator.target}</td>
                <td>${indicator.actual}</td>
                <td class="kpi-value ${indicator.achievementRate >= 100 ? 'green' : indicator.achievementRate >= 50 ? '' : 'red'}">${indicator.achievementRate.toFixed(0)}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : '<p style="color: #64748b; font-style: italic;">Indicators have not yet been defined or reported for this reporting period.</p>'}
    </div>
    
    <!-- FINANCIAL PERFORMANCE -->
    <div class="section no-break">
      <div class="section-title">💰 Financial Performance</div>
      <table>
        <thead>
          <tr>
            <th>Total Budget</th>
            <th>Actual Spent</th>
            <th>Remaining</th>
            <th>Burn Rate</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="kpi-value teal" style="font-size: 11pt;">${formatCurrency(data.financial.totalBudget, data.project.currency, isRTL)}</td>
            <td class="kpi-value ${data.financial.actualSpent === 0 ? 'red' : ''}" style="font-size: 11pt;">${formatCurrency(data.financial.actualSpent, data.project.currency, isRTL)}</td>
            <td class="kpi-value" style="font-size: 11pt;">${formatCurrency(data.financial.totalBudget - data.financial.actualSpent, data.project.currency, isRTL)}</td>
            <td class="kpi-value ${data.financial.burnRate === 0 ? 'red' : ''}" style="font-size: 11pt;">${data.financial.burnRate.toFixed(1)}%</td>
          </tr>
        </tbody>
      </table>
      ${data.financial.burnRate === 0 && timeElapsedPercent > 20 ? 
        '<p class="financial-warning">⚠️ Spending significantly below expected. Requires immediate review.</p>' : ''}
    </div>
    
    <!-- NARRATIVE REPORTS -->
    <div class="section no-break">
      <div class="section-title">📝 Narrative Reports</div>
      <table>
        <tbody>
          <tr class="narrative-row">
            <td class="label-cell">Progress Summary</td>
            <td>${data.narratives.progressSummary || '<span class="narrative-placeholder">This section will be completed in the next reporting cycle.</span>'}</td>
          </tr>
          <tr class="narrative-row">
            <td class="label-cell">Key Achievements</td>
            <td>${data.narratives.keyAchievements || '<span class="narrative-placeholder">This section will be completed in the next reporting cycle.</span>'}</td>
          </tr>
          <tr class="narrative-row">
            <td class="label-cell">Challenges</td>
            <td>${data.narratives.challenges || '<span class="narrative-placeholder">This section will be completed in the next reporting cycle.</span>'}</td>
          </tr>
          <tr class="narrative-row">
            <td class="label-cell">Mitigation Actions</td>
            <td>${data.narratives.mitigationActions || '<span class="narrative-placeholder">This section will be completed in the next reporting cycle.</span>'}</td>
          </tr>
          <tr class="narrative-row">
            <td class="label-cell">Next Steps</td>
            <td>${data.narratives.nextSteps || '<span class="narrative-placeholder">This section will be completed in the next reporting cycle.</span>'}</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- FOOTER -->
    <div class="footer">
      <span>${data.organizationName} • IMS - Integrated Management System</span>
      <span>Generated: ${formatDate(today.toISOString(), isRTL)}</span>
    </div>
  </div>
</body>
</html>
`;
}

export async function generateProjectReportPDF(data: ProjectReportPDFData): Promise<Buffer> {
  const html = generateHTMLReport(data);
  
  const browser = await puppeteer.launch({
    headless: true,
    executablePath:
      process.env.PUPPETEER_EXECUTABLE_PATH ||
      '/usr/bin/chromium',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-crash-reporter',
      '--disable-breakpad',
    ],
  });
  
  try {
    const page = await browser.newPage();
    
    // Set content and wait for fonts to load
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Wait a bit for fonts to render
    await page.evaluate(() => document.fonts.ready);
    
    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '12mm',
        right: '12mm',
        bottom: '15mm',
        left: '12mm',
      },
    });
    
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

export type { ProjectReportPDFData };


/**
 * ============================================================================
 * CASE MANAGEMENT REPORT PDF GENERATOR
 * ============================================================================
 */

interface CaseManagementReportPDFData {
  projectName: string;
  donorName: string;
  dateFrom: string;
  dateTo: string;
  language: 'en' | 'ar';
  executiveSummary: string;
  keyAchievements: string;
  cases: {
    total: number;
    new: number;
    active: number;
    closed: number;
    highRisk: number;
    avgCaseDuration: number;
  };
  pssSessions: {
    total: number;
    individual: number;
    group: number;
    avgDuration: number;
    followUpsScheduled: number;
  };
  safeSpaces: {
    locations: number;
    totalActivities: number;
    childrenReached: number;
    avgChildrenPerSession: number;
  };
  referrals: {
    total: number;
    internal: number;
    external: number;
    completed: number;
    completionRate: number;
  };
  activities: {
    total: number;
    byType: Array<{ type: string; count: number }>;
  };
}

function generateCaseManagementHTMLReport(data: CaseManagementReportPDFData): string {
  const isRTL = data.language === 'ar';
  const today = new Date();

  return `
<!DOCTYPE html>
<html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${data.language}">
<head>
  <meta charset="UTF-8">
  <title>${isRTL ? 'تقرير إدارة الحالات' : 'Case Management Report'} - ${data.projectName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    @page {
      size: A4 portrait;
      margin: 12mm 12mm 15mm 12mm;
    }
    
    body {
      font-family: ${isRTL ? "'Noto Sans Arabic', 'Arial', sans-serif" : "'Inter', 'Arial', sans-serif"};
      font-size: 9pt;
      line-height: 1.4;
      color: #1a1a1a;
      background: white;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    .container {
      width: 100%;
      max-width: none;
    }
    
    .header {
      background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
      color: white;
      padding: 16px 20px;
      margin-bottom: 0;
    }
    
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(255,255,255,0.2);
    }
    
    .logo-section {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .logo {
      width: 40px;
      height: 40px;
      background: white;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: #1e3a5f;
      font-size: 12pt;
    }
    
    .org-name {
      font-size: 11pt;
      font-weight: 600;
    }
    
    .report-meta {
      text-align: ${isRTL ? 'left' : 'right'};
      font-size: 8pt;
    }
    
    .report-meta .title {
      font-weight: 600;
      font-size: 10pt;
    }
    
    .project-title {
      font-size: 16pt;
      font-weight: 700;
      margin-bottom: 4px;
    }
    
    .project-code {
      font-size: 9pt;
      opacity: 0.9;
    }
    
    .section {
      padding: 10px 16px;
      margin-bottom: 8px;
    }
    
    .section-title {
      font-size: 11pt;
      font-weight: 700;
      color: #1e3a5f;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 2px solid #00a8a8;
    }
    
    .executive-summary {
      background: #f8fafc;
      border-${isRTL ? 'right' : 'left'}: 4px solid #00a8a8;
      padding: 12px 16px;
      margin: 12px 16px;
    }
    
    .executive-summary h3 {
      font-size: 11pt;
      font-weight: 700;
      color: #1e3a5f;
      margin-bottom: 6px;
    }
    
    .executive-summary p {
      font-size: 9pt;
      color: #334155;
      line-height: 1.5;
      white-space: pre-wrap;
    }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      padding: 0 16px;
      margin-bottom: 16px;
    }
    
    .metric-card {
      background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
      padding: 12px;
      border-${isRTL ? 'right' : 'left'}: 4px solid #2563eb;
      border-radius: 6px;
    }
    
    .metric-label {
      color: #6b7280;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .metric-value {
      font-size: 20pt;
      font-weight: bold;
      color: #1f2937;
    }
    
    .metric-value.danger {
      color: #dc2626;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    
    th, td {
      padding: 8px 10px;
      text-align: ${isRTL ? 'right' : 'left'};
      border: 1px solid #e2e8f0;
      font-size: 9pt;
    }
    
    th {
      background: #2563eb;
      color: white;
      font-weight: 600;
    }
    
    .table-section {
      padding: 0 16px;
      margin-bottom: 16px;
    }
    
    .table-section h3 {
      font-size: 10pt;
      font-weight: 600;
      color: #059669;
      margin-bottom: 8px;
    }
    
    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 8px 16px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 7pt;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-top">
        <div class="logo-section">
          <div class="logo">IMS</div>
          <span class="org-name">${data.donorName}</span>
        </div>
        <div class="report-meta">
          <div class="title">${isRTL ? 'تقرير إدارة الحالات' : 'Case Management Report'}</div>
          <div>${isRTL ? 'فترة التقرير:' : 'Reporting Period:'} ${data.dateFrom} ${isRTL ? 'إلى' : 'to'} ${data.dateTo}</div>
        </div>
      </div>
      <div class="project-title">${data.projectName}</div>
      <div class="project-code">${isRTL ? 'تاريخ الإنشاء:' : 'Generated:'} ${today.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
    </div>
    
    <div class="executive-summary">
      <h3>${isRTL ? 'الملخص التنفيذي' : 'Executive Summary'}</h3>
      <p>${data.executiveSummary}</p>
    </div>
    
    <div class="section">
      <div class="section-title">${isRTL ? 'المؤشرات الرئيسية' : 'Key Metrics'}</div>
    </div>
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">${isRTL ? 'إجمالي المستفيدين' : 'Total Beneficiaries'}</div>
        <div class="metric-value">${data.cases.total}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">${isRTL ? 'جلسات الدعم النفسي' : 'PSS Sessions'}</div>
        <div class="metric-value">${data.pssSessions.total}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">${isRTL ? 'الأطفال الذين تم الوصول إليهم' : 'Children Reached'}</div>
        <div class="metric-value">${data.safeSpaces.childrenReached}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">${isRTL ? 'إجمالي الإحالات' : 'Total Referrals'}</div>
        <div class="metric-value">${data.referrals.total}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">${isRTL ? 'مواقع المساحات الآمنة' : 'CSS Locations'}</div>
        <div class="metric-value">${data.safeSpaces.locations}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">${isRTL ? 'الحالات عالية الخطورة' : 'High-Risk Cases'}</div>
        <div class="metric-value danger">${data.cases.highRisk}</div>
      </div>
    </div>
    
    ${data.keyAchievements ? `
    <div class="executive-summary">
      <h3>${isRTL ? 'الإنجازات الرئيسية' : 'Key Achievements'}</h3>
      <p>${data.keyAchievements}</p>
    </div>
    ` : ''}
    
    <div class="section">
      <div class="section-title">${isRTL ? 'الجداول التفصيلية' : 'Detailed Tables'}</div>
    </div>
    
    <div class="table-section">
      <h3>${isRTL ? 'نظرة عامة على الحالات' : 'Cases Overview'}</h3>
      <table>
        <thead>
          <tr>
            <th>${isRTL ? 'المؤشر' : 'Metric'}</th>
            <th style="text-align: ${isRTL ? 'left' : 'right'};">${isRTL ? 'القيمة' : 'Value'}</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>${isRTL ? 'إجمالي الحالات' : 'Total Cases'}</td><td style="text-align: ${isRTL ? 'left' : 'right'}; font-weight: 600;">${data.cases.total}</td></tr>
          <tr><td>${isRTL ? 'الحالات الجديدة (الفترة)' : 'New Cases (Period)'}</td><td style="text-align: ${isRTL ? 'left' : 'right'}; font-weight: 600;">${data.cases.new}</td></tr>
          <tr><td>${isRTL ? 'الحالات النشطة' : 'Active Cases'}</td><td style="text-align: ${isRTL ? 'left' : 'right'}; font-weight: 600;">${data.cases.active}</td></tr>
          <tr><td>${isRTL ? 'الحالات المغلقة' : 'Closed Cases'}</td><td style="text-align: ${isRTL ? 'left' : 'right'}; font-weight: 600;">${data.cases.closed}</td></tr>
          <tr><td>${isRTL ? 'الحالات عالية الخطورة' : 'High-Risk Cases'}</td><td style="text-align: ${isRTL ? 'left' : 'right'}; font-weight: 600; color: #dc2626;">${data.cases.highRisk}</td></tr>
          <tr><td>${isRTL ? 'متوسط مدة الحالة' : 'Average Case Duration'}</td><td style="text-align: ${isRTL ? 'left' : 'right'}; font-weight: 600;">${data.cases.avgCaseDuration} ${isRTL ? 'أيام' : 'days'}</td></tr>
        </tbody>
      </table>
    </div>
    
    <div class="table-section">
      <h3>${isRTL ? 'جلسات الدعم النفسي' : 'PSS Sessions'}</h3>
      <table>
        <thead>
          <tr>
            <th>${isRTL ? 'المؤشر' : 'Indicator'}</th>
            <th style="text-align: ${isRTL ? 'left' : 'right'};">${isRTL ? 'القيمة' : 'Value'}</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>${isRTL ? 'إجمالي جلسات الدعم النفسي' : 'Total PSS Sessions'}</td><td style="text-align: ${isRTL ? 'left' : 'right'}; font-weight: 600;">${data.pssSessions.total}</td></tr>
          <tr><td>${isRTL ? 'الجلسات الفردية' : 'Individual Sessions'}</td><td style="text-align: ${isRTL ? 'left' : 'right'}; font-weight: 600;">${data.pssSessions.individual}</td></tr>
          <tr><td>${isRTL ? 'الجلسات الجماعية' : 'Group Sessions'}</td><td style="text-align: ${isRTL ? 'left' : 'right'}; font-weight: 600;">${data.pssSessions.group}</td></tr>
          <tr><td>${isRTL ? 'متوسط المدة' : 'Average Duration'}</td><td style="text-align: ${isRTL ? 'left' : 'right'}; font-weight: 600;">${data.pssSessions.avgDuration} ${isRTL ? 'دقائق' : 'min'}</td></tr>
          <tr><td>${isRTL ? 'المتابعات المجدولة' : 'Follow-ups Scheduled'}</td><td style="text-align: ${isRTL ? 'left' : 'right'}; font-weight: 600;">${data.pssSessions.followUpsScheduled}</td></tr>
        </tbody>
      </table>
    </div>
    
    <div class="table-section">
      <h3>${isRTL ? 'الإحالات' : 'Referrals'}</h3>
      <table>
        <thead>
          <tr>
            <th>${isRTL ? 'المؤشر' : 'Metric'}</th>
            <th style="text-align: ${isRTL ? 'left' : 'right'};">${isRTL ? 'القيمة' : 'Value'}</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>${isRTL ? 'إجمالي الإحالات' : 'Total Referrals'}</td><td style="text-align: ${isRTL ? 'left' : 'right'}; font-weight: 600;">${data.referrals.total}</td></tr>
          <tr><td>${isRTL ? 'الإحالات الداخلية' : 'Internal Referrals'}</td><td style="text-align: ${isRTL ? 'left' : 'right'}; font-weight: 600;">${data.referrals.internal}</td></tr>
          <tr><td>${isRTL ? 'الإحالات الخارجية' : 'External Referrals'}</td><td style="text-align: ${isRTL ? 'left' : 'right'}; font-weight: 600;">${data.referrals.external}</td></tr>
          <tr><td>${isRTL ? 'الإحالات المكتملة' : 'Completed Referrals'}</td><td style="text-align: ${isRTL ? 'left' : 'right'}; font-weight: 600;">${data.referrals.completed}</td></tr>
          <tr><td>${isRTL ? 'معدل الإكمال' : 'Completion Rate'}</td><td style="text-align: ${isRTL ? 'left' : 'right'}; font-weight: 600;">${data.referrals.completionRate}${isRTL ? '٪' : '%'}</td></tr>
        </tbody>
      </table>
    </div>
    
    <div class="table-section">
      <h3>${isRTL ? 'المساحات الآمنة للأطفال' : 'Child Safe Spaces'}</h3>
      <table>
        <thead>
          <tr>
            <th>${isRTL ? 'المؤشر' : 'Metric'}</th>
            <th style="text-align: ${isRTL ? 'left' : 'right'};">${isRTL ? 'القيمة' : 'Value'}</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>${isRTL ? 'مواقع المساحات الآمنة النشطة' : 'Active CSS Locations'}</td><td style="text-align: ${isRTL ? 'left' : 'right'}; font-weight: 600;">${data.safeSpaces.locations}</td></tr>
          <tr><td>${isRTL ? 'إجمالي أنشطة المساحات الآمنة' : 'Total CSS Activities'}</td><td style="text-align: ${isRTL ? 'left' : 'right'}; font-weight: 600;">${data.safeSpaces.totalActivities}</td></tr>
          <tr><td>${isRTL ? 'الأطفال الذين تم الوصول إليهم' : 'Children Reached'}</td><td style="text-align: ${isRTL ? 'left' : 'right'}; font-weight: 600;">${data.safeSpaces.childrenReached}</td></tr>
          <tr><td>${isRTL ? 'متوسط الأطفال لكل جلسة' : 'Avg. Children per Session'}</td><td style="text-align: ${isRTL ? 'left' : 'right'}; font-weight: 600;">${data.safeSpaces.avgChildrenPerSession}</td></tr>
        </tbody>
      </table>
    </div>
    
    <div class="table-section">
      <h3>${isRTL ? 'الأنشطة والخدمات' : 'Activities & Services'}</h3>
      <table>
        <thead>
          <tr>
            <th>${isRTL ? 'نوع النشاط' : 'Activity Type'}</th>
            <th style="text-align: ${isRTL ? 'left' : 'right'};">${isRTL ? 'العدد' : 'Count'}</th>
          </tr>
        </thead>
        <tbody>
          ${data.activities.byType.map(a => `
            <tr><td>${a.type}</td><td style="text-align: ${isRTL ? 'left' : 'right'}; font-weight: 600;">${a.count}</td></tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <div class="footer">
      <span>${data.donorName} • IMS - Integrated Management System</span>
      <span>${isRTL ? 'تم الإنشاء في' : 'Generated:'} ${today.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
    </div>
  </div>
</body>
</html>
`;
}

export async function generateCaseManagementReportPDF(data: CaseManagementReportPDFData): Promise<Buffer> {
  const html = generateCaseManagementHTMLReport(data);
  
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/home/ubuntu/.cache/puppeteer/chrome/linux-144.0.7559.96/chrome-linux64/chrome',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=none',
    ],
  });
  
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '12mm',
        right: '12mm',
        bottom: '15mm',
        left: '12mm',
      },
    });
    
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

export type { CaseManagementReportPDFData };
