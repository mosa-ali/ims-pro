/**
 * ============================================================================
 * DONOR-GRADE PROJECT REPORT PDF TEMPLATE - COMPACT VERSION
 * ============================================================================
 * 
 * Professional humanitarian report with COMPACT spacing for maximum content density.
 * Designed for A4 print with minimal wasted space.
 * 
 * ============================================================================
 */

import { forwardRef } from 'react';
import { ProjectReportData } from '@/hooks/useProjectReportData';
import { RiskCalculationResult } from '@/utils/riskCalculation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface ProjectReportPrintViewProps {
 reportData: ProjectReportData;
 riskCalculation: RiskCalculationResult;
 narratives: {
 progressSummary: string;
 challenges: string;
 mitigationActions: string;
 keyAchievements: string;
 nextSteps: string;
 };
 language?: 'en' | 'ar';
 organizationName?: string;
 organizationLogo?: string;
 /** Report type: 'project' for full project report, 'monthly' for monthly report */
 reportType?: 'project' | 'monthly';
 /** For monthly reports: the period start date (e.g., '2026-02-01') */
 reportPeriodStart?: string;
 /** For monthly reports: the period end date (e.g., '2026-02-28') */
 reportPeriodEnd?: string;
 /** The date/time when the report was generated */
 generatedAt?: Date;
}

export const ProjectReportPrintView = forwardRef<HTMLDivElement, ProjectReportPrintViewProps>(function ProjectReportPrintView({
 reportData,
 riskCalculation,
 narratives,
 language = 'en',
 organizationName = 'YDH - Yamany Development Foundation',
 organizationLogo,
 reportType = 'project',
 reportPeriodStart,
 reportPeriodEnd,
 generatedAt,
}, ref) {
 
 // Format helpers
 const formatDate = (dateStr: string) => {
 const { t } = useTranslation();
 if (!dateStr) return 'N/A';
 return new Date(dateStr).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
 year: 'numeric',
 month: 'short',
 day: 'numeric',
 });
 };

 const formatCurrency = (amount: number, currency: string = 'USD') => {
 return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
 style: 'currency',
 currency: currency,
 minimumFractionDigits: 0,
 maximumFractionDigits: 0,
 }).format(amount);
 };

 // Calculate time metrics
 const startDate = new Date(reportData.project?.startDate || new Date());
 const endDate = new Date(reportData.project?.endDate || new Date());
 const today = new Date();
 const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
 const elapsedDays = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
 const timeElapsedPercent = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

 // Generate executive summary with structured format
 const generateExecutiveSummary = () => {
 const implementationProgress = reportData.activities.completionRate;
 const budgetBurnRate = reportData.financial.burnRate;
 const riskLevel = riskCalculation.level;
 
 // Implementation Status
 let statusText = '';
 if (implementationProgress === 0 && timeElapsedPercent > 20) {
 statusText = 'Delayed start phase with no measurable implementation progress.';
 } else if (implementationProgress < 30) {
 statusText = 'Early implementation stages.';
 } else if (implementationProgress < 70) {
 statusText = 'Active implementation phase.';
 } else {
 statusText = 'Approaching completion.';
 }

 // Financial Status
 let budgetText = '';
 if (budgetBurnRate === 0 && timeElapsedPercent > 20) {
 budgetText = 'No budget disbursed despite significant time elapsed.';
 } else if (budgetBurnRate < timeElapsedPercent - 20) {
 budgetText = 'Spending below expected level.';
 } else {
 budgetText = 'Spending aligned with timeline.';
 }

 // Risk Implication
 let riskText = '';
 if (riskLevel === 'Critical') {
 riskText = 'Critical risks requiring immediate intervention.';
 } else if (riskLevel === 'High') {
 riskText = 'High risks requiring urgent attention.';
 } else if (riskLevel === 'Medium') {
 riskText = 'Medium risks being monitored.';
 } else {
 riskText = 'Low risk, progressing well.';
 }

 return { statusText, budgetText, riskText };
 };

 // Generate risk explanation
 const generateRiskExplanation = () => {
 const factors = riskCalculation.factors || [];
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
 };

 // Financial interpretation
 const getFinancialInterpretation = () => {
 const burnRate = reportData.financial.burnRate;
 if (burnRate === 0 && timeElapsedPercent > 20) {
 return '⚠️ Spending significantly below expected. Requires immediate review.';
 } else if (burnRate < timeElapsedPercent - 15) {
 return '⚠️ Burn rate below expected. May indicate delays.';
 } else if (burnRate > timeElapsedPercent + 15) {
 return '⚠️ Burn rate above expected. Requires monitoring.';
 }
 return '✓ Spending aligned with timeline.';
 };

 const riskColor = riskCalculation.level === 'Critical' ? '#dc2626' : riskCalculation.level === 'High' ? '#ea580c' : riskCalculation.level === 'Medium' ? '#ca8a04' : '#16a34a';
 const riskBg = riskCalculation.level === 'Critical' ? '#fef2f2' : riskCalculation.level === 'High' ? '#fff7ed' : riskCalculation.level === 'Medium' ? '#fefce8' : '#f0fdf4';

 return (
 <div 
 ref={ref}
 className="print-report"
 
 style={{
 fontFamily: "'Inter', 'Segoe UI', sans-serif",
 fontSize: '9pt',
 lineHeight: '1.3',
 color: '#1a1a1a',
 background: 'white',
 width: '100%',
 maxWidth: 'none',
 margin: 0,
 padding: 0,
 }}
 >
 <style>{`
 @media print {
 @page { 
 size: A4 portrait; 
 margin: 8mm 10mm 10mm 10mm; 
 }
 html, body {
 width: 210mm !important;
 margin: 0 !important;
 padding: 0 !important;
 }
 .print-report { 
 width: 100% !important;
 max-width: none !important;
 margin: 0 !important;
 padding: 0 !important;
 -webkit-print-color-adjust: exact !important; 
 print-color-adjust: exact !important; 
 }
 .no-break { page-break-inside: avoid; }
 .print-report table {
 width: 100% !important;
 }
 }
 .print-report * { box-sizing: border-box; }
 .print-report table { width: 100%; border-collapse: collapse; }
 .print-report th, .print-report td { padding: 3px 5px; text-align: left; border: 1px solid #e2e8f0; font-size: 8pt; }
 .print-report th { background: #00a8a8; color: white; font-weight: 600; }
 `}</style>

 {/* HEADER - Compact */}
 <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)', color: 'white', padding: '12px 16px', marginBottom: 0 }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
 <div style={{ width: '36px', height: '36px', background: 'white', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#1e3a5f', fontSize: '11pt' }}>IMS</div>
 <span style={{ fontSize: '10pt', fontWeight: 600 }}>{organizationName}</span>
 </div>
 <div style={{ textAlign: 'right', fontSize: '8pt' }}>
 <div style={{ fontWeight: 600 }}>{reportType === 'monthly' ? (t.printTemplates.monthlyReport) : (t.printTemplates.projectReport)}</div>
 <div>{t.printTemplates.generated}{generatedAt ? new Date(generatedAt).toLocaleString(isRTL ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : formatDate(new Date().toISOString())}</div>
 <div style={{ opacity: 0.8 }}>{t.printTemplates.period}{reportType === 'monthly' && reportPeriodStart && reportPeriodEnd ? `${formatDate(reportPeriodStart)} - ${formatDate(reportPeriodEnd)}` : `${formatDate(reportData.project?.startDate || '')} - ${formatDate(reportData.project?.endDate || '')}`}</div>
 </div>
 </div>
 <div style={{ fontSize: '14pt', fontWeight: 700, marginBottom: '4px' }}>{reportData.project?.name || 'Unnamed Project'}</div>
 <div style={{ fontSize: '9pt', opacity: 0.9 }}>Project Code: {reportData.project?.projectCode || 'N/A'}</div>
 </div>

 {/* EXECUTIVE SUMMARY - Compact with structured format */}
 <div style={{ padding: '8px 12px', background: '#f8fafc', borderLeft: '3px solid #00a8a8', margin: '8px 12px' }}>
 <div style={{ fontSize: '10pt', fontWeight: 700, color: '#1e3a5f', marginBottom: '4px' }}>📋 Executive Summary</div>
 {(() => {
 const summary = generateExecutiveSummary();
 return (
 <div style={{ margin: 0, fontSize: '8pt', color: '#334155', lineHeight: '1.6' }}>
 <div><strong>Implementation:</strong> {summary.statusText}</div>
 <div><strong>Financial:</strong> {summary.budgetText}</div>
 <div><strong>Risk:</strong> {summary.riskText}</div>
 </div>
 );
 })()}
 </div>

 {/* PROJECT OVERVIEW + KPIs - Side by Side */}
 <div style={{ display: 'flex', gap: '8px', padding: '0 12px', marginBottom: '8px' }}>
 {/* Project Overview */}
 <div style={{ flex: 1 }}>
 <div style={{ fontSize: '10pt', fontWeight: 700, color: '#1e3a5f', marginBottom: '4px', borderBottom: '2px solid #00a8a8', paddingBottom: '2px' }}>📁 Project Overview</div>
 <table>
 <tbody>
 <tr><td style={{ fontWeight: 600, width: '35%', background: '#f8fafc' }}>Status</td><td><span style={{ background: '#00a8a8', color: 'white', padding: '1px 6px', borderRadius: '3px', fontSize: '7pt', textTransform: 'uppercase' }}>{reportData.project?.status || 'N/A'}</span></td></tr>
 <tr><td style={{ fontWeight: 600, background: '#f8fafc' }}>Location</td><td>{reportData.project?.location || 'N/A'}</td></tr>
 <tr><td style={{ fontWeight: 600, background: '#f8fafc' }}>Sectors</td><td>{reportData.project?.sectors?.join(', ') || 'N/A'}</td></tr>
 <tr><td style={{ fontWeight: 600, background: '#f8fafc' }}>Duration</td><td>{formatDate(reportData.project?.startDate || '')} → {formatDate(reportData.project?.endDate || '')}</td></tr>
 <tr><td style={{ fontWeight: 600, background: '#f8fafc' }}>Days Remaining</td><td style={{ color: '#00a8a8', fontWeight: 600 }}>{reportData.project?.daysRemaining || 0} days ({Math.round(timeElapsedPercent)}% elapsed)</td></tr>
 </tbody>
 </table>
 </div>

 {/* KPIs */}
 <div style={{ flex: 1 }}>
 <div style={{ fontSize: '10pt', fontWeight: 700, color: '#1e3a5f', marginBottom: '4px', borderBottom: '2px solid #00a8a8', paddingBottom: '2px' }}>📊 Key Performance Indicators</div>
 <table>
 <tbody>
 <tr><td style={{ fontWeight: 600, width: '50%', background: '#f8fafc' }}>Implementation Progress</td><td style={{ color: reportData.activities.completionRate === 0 ? '#dc2626' : '#00a8a8', fontWeight: 700 }}>{(reportData.activities.completionRate ?? 0).toFixed(0)}%</td></tr>
 <tr><td style={{ fontWeight: 600, background: '#f8fafc' }}>Budget Burn Rate</td><td style={{ color: reportData.financial.burnRate === 0 ? '#dc2626' : '#1e3a5f', fontWeight: 700 }}>{(reportData.financial.burnRate ?? 0).toFixed(1)}%</td></tr>
 <tr><td style={{ fontWeight: 600, background: '#f8fafc' }}>Activities</td><td>{reportData.activities.completed}/{reportData.activities.total}</td></tr>
 <tr><td style={{ fontWeight: 600, background: '#f8fafc' }}>Indicators</td><td>{reportData.indicators.achieved}/{reportData.indicators.total}</td></tr>
 <tr><td style={{ fontWeight: 600, background: '#f8fafc' }}>Risk Level</td><td><span style={{ background: riskColor, color: 'white', padding: '1px 8px', borderRadius: '3px', fontSize: '7pt', fontWeight: 700 }}>{riskCalculation.level}</span></td></tr>
 </tbody>
 </table>
 </div>
 </div>

 {/* RISK ANALYSIS - Compact */}
 <div className="no-break" style={{ padding: '0 12px', marginBottom: '8px' }}>
 <div style={{ fontSize: '10pt', fontWeight: 700, color: '#1e3a5f', marginBottom: '4px', borderBottom: '2px solid #00a8a8', paddingBottom: '2px' }}>⚠️ Risk Analysis</div>
 <div style={{ background: riskBg, border: `1px solid ${riskColor}`, borderRadius: '4px', padding: '8px', marginBottom: '6px' }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
 <div>
 <span style={{ background: riskColor, color: 'white', padding: '2px 10px', borderRadius: '10px', fontWeight: 700, fontSize: '9pt' }}>{riskCalculation.level}</span>
 <span style={{ marginLeft: '8px', fontSize: '8pt', color: '#64748b' }}>Score: {riskCalculation.score}/100</span>
 </div>
 </div>
 <p style={{ margin: '4px 0 0', fontSize: '8pt', color: '#475569' }}><strong>Explanation:</strong> {generateRiskExplanation()}</p>
 </div>
 <table>
 <thead>
 <tr><th>Risk Factor</th><th>Value</th><th>Status</th><th>Description</th></tr>
 </thead>
 <tbody>
 {(riskCalculation.factors || []).map((factor, idx) => (
 <tr key={idx}>
 <td style={{ fontWeight: 600 }}>{factor.name}</td>
 <td>{factor.value}%</td>
 <td>
 <span style={{
 background: factor.status === 'critical' ? '#dc2626' : factor.status === 'warning' ? '#ca8a04' : '#16a34a',
 color: 'white',
 padding: '1px 6px',
 borderRadius: '3px',
 fontSize: '7pt',
 textTransform: 'uppercase'
 }}>{factor.status}</span>
 </td>
 <td style={{ fontSize: '7pt' }}>{factor.description}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* ACTIVITIES PROGRESS - Compact */}
 <div className="no-break" style={{ padding: '0 12px', marginBottom: '8px' }}>
 <div style={{ fontSize: '10pt', fontWeight: 700, color: '#1e3a5f', marginBottom: '4px', borderBottom: '2px solid #00a8a8', paddingBottom: '2px' }}>🎯 Activities Progress</div>
 {reportData.activities.details && reportData.activities.details.length > 0 ? (
 <table>
 <thead>
 <tr><th>Activity</th><th>Target</th><th>Achieved</th><th>Progress</th><th>Status</th></tr>
 </thead>
 <tbody>
 {reportData.activities.details.map((activity, idx) => (
 <tr key={idx}>
 <td style={{ fontWeight: 600 }}>{activity.activityTitle}</td>
 <td>{activity.target}%</td>
 <td>{activity.achieved}%</td>
 <td>
 <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
 <div style={{ width: '40px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
 <div style={{ width: `${activity.progress}%`, height: '100%', background: activity.progress === 0 ? '#dc2626' : '#00a8a8' }}></div>
 </div>
 <span style={{ fontSize: '7pt', color: activity.progress === 0 ? '#dc2626' : '#00a8a8' }}>{activity.progress}%</span>
 </div>
 </td>
 <td><span style={{ background: activity.status === 'completed' ? '#16a34a' : '#f59e0b', color: 'white', padding: '1px 6px', borderRadius: '3px', fontSize: '7pt', textTransform: 'uppercase' }}>{activity.status}</span></td>
 </tr>
 ))}
 </tbody>
 </table>
 ) : (
 <p style={{ margin: 0, fontSize: '8pt', color: '#64748b', fontStyle: 'italic' }}>No activities recorded yet.</p>
 )}
 </div>

 {/* INDICATORS - Compact */}
 <div className="no-break" style={{ padding: '0 12px', marginBottom: '8px' }}>
 <div style={{ fontSize: '10pt', fontWeight: 700, color: '#1e3a5f', marginBottom: '4px', borderBottom: '2px solid #00a8a8', paddingBottom: '2px' }}>📈 Indicators Achievement</div>
 {reportData.indicators.details && reportData.indicators.details.length > 0 ? (
 <table>
 <thead>
 <tr><th>Indicator</th><th>Baseline</th><th>Target</th><th>Actual</th><th>Achievement</th></tr>
 </thead>
 <tbody>
 {reportData.indicators.details.map((indicator, idx) => (
 <tr key={idx}>
 <td style={{ fontWeight: 600 }}>{indicator.name}</td>
 <td>{indicator.baseline}</td>
 <td>{indicator.target}</td>
 <td>{indicator.actual}</td>
 <td style={{ color: indicator.achievementRate >= 100 ? '#16a34a' : indicator.achievementRate >= 50 ? '#ca8a04' : '#dc2626', fontWeight: 600 }}>{(indicator.achievementRate ?? 0).toFixed(0)}%</td>
 </tr>
 ))}
 </tbody>
 </table>
 ) : (
 <p style={{ margin: 0, fontSize: '8pt', color: '#64748b', fontStyle: 'italic' }}>Indicators have not yet been defined or reported for this reporting period.</p>
 )}
 </div>

 {/* FINANCIAL PERFORMANCE - Compact */}
 <div className="no-break" style={{ padding: '0 12px', marginBottom: '8px' }}>
 <div style={{ fontSize: '10pt', fontWeight: 700, color: '#1e3a5f', marginBottom: '4px', borderBottom: '2px solid #00a8a8', paddingBottom: '2px' }}>💰 Financial Performance</div>
 <table>
 <thead>
 <tr><th>Total Budget</th><th>Actual Spent</th><th>Remaining</th><th>Burn Rate</th></tr>
 </thead>
 <tbody>
 <tr>
 <td style={{ fontWeight: 700, color: '#00a8a8', fontSize: '10pt' }}>{formatCurrency(reportData.financial.totalBudget, reportData.project?.currency || 'USD')}</td>
 <td style={{ fontWeight: 700, color: reportData.financial.actualSpent === 0 ? '#dc2626' : '#1e3a5f', fontSize: '10pt' }}>{formatCurrency(reportData.financial.actualSpent, reportData.project?.currency || 'USD')}</td>
 <td style={{ fontWeight: 700, fontSize: '10pt' }}>{formatCurrency(reportData.financial.remaining, reportData.project?.currency || 'USD')}</td>
 <td style={{ fontWeight: 700, color: reportData.financial.burnRate === 0 ? '#dc2626' : '#1e3a5f', fontSize: '10pt' }}>{(reportData.financial.burnRate ?? 0).toFixed(1)}%</td>
 </tr>
 </tbody>
 </table>
 <p style={{ margin: '4px 0 0', fontSize: '8pt', color: '#475569' }}>{getFinancialInterpretation()}</p>
 </div>

 {/* NARRATIVE REPORTS - Compact */}
 <div className="no-break" style={{ padding: '0 12px', marginBottom: '8px' }}>
 <div style={{ fontSize: '10pt', fontWeight: 700, color: '#1e3a5f', marginBottom: '4px', borderBottom: '2px solid #00a8a8', paddingBottom: '2px' }}>📝 Narrative Reports</div>
 <table>
 <tbody>
 <tr>
 <td style={{ fontWeight: 600, width: '20%', background: '#f8fafc', verticalAlign: 'top' }}>Progress Summary</td>
 <td style={{ fontSize: '8pt' }}>{narratives.progressSummary || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>This section will be completed in the next reporting cycle.</span>}</td>
 </tr>
 <tr>
 <td style={{ fontWeight: 600, background: '#f8fafc', verticalAlign: 'top' }}>Key Achievements</td>
 <td style={{ fontSize: '8pt' }}>{narratives.keyAchievements || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>This section will be completed in the next reporting cycle.</span>}</td>
 </tr>
 <tr>
 <td style={{ fontWeight: 600, background: '#f8fafc', verticalAlign: 'top' }}>Challenges</td>
 <td style={{ fontSize: '8pt' }}>{narratives.challenges || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>This section will be completed in the next reporting cycle.</span>}</td>
 </tr>
 <tr>
 <td style={{ fontWeight: 600, background: '#f8fafc', verticalAlign: 'top' }}>Mitigation Actions</td>
 <td style={{ fontSize: '8pt' }}>{narratives.mitigationActions || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>This section will be completed in the next reporting cycle.</span>}</td>
 </tr>
 <tr>
 <td style={{ fontWeight: 600, background: '#f8fafc', verticalAlign: 'top' }}>Next Steps</td>
 <td style={{ fontSize: '8pt' }}>{narratives.nextSteps || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>This section will be completed in the next reporting cycle.</span>}</td>
 </tr>
 </tbody>
 </table>
 </div>

 {/* FOOTER - Compact */}
 <div style={{ borderTop: '1px solid #e2e8f0', padding: '6px 12px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '7pt', color: '#64748b' }}>
 <span>{organizationName} • IMS - Integrated Management System</span>
 <span>Generated: {formatDate(new Date().toISOString())}</span>
 </div>
 </div>
 );
});

export default ProjectReportPrintView;
