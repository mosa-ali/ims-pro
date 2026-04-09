/**
 * ============================================================================
 * REPORTS & ANALYTICS - MAIN PAGE
 * ============================================================================
 * 
 * PURPOSE: Cross-module analytical and audit engine
 * 
 * MANDATORY RULES:
 * - Read-only, system-wide intelligence
 * - Aggregates data across HR, Payroll, Attendance, Recruitment via tRPC
 * - Supports management decisions and audits
 * - Produces official, printable, exportable reports
 * - NEVER duplicates dashboards or profile views
 * - NEVER allows data entry
 * 
 * ============================================================================
 */

import { useState } from 'react';
import { 
 Users, 
 DollarSign, 
 Clock, 
 Calendar, 
 UserPlus, 
 Shield,
 Download,
 Printer,
 Filter,
 TrendingUp,
 RefreshCw,
 Eye,
 ArrowLeft,
 ArrowRight
} from 'lucide-react';
import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReportsAnalyticsData } from '@/hooks/useReportsAnalyticsData';
import { Button } from '@/components/ui/button';
import { WorkforceAnalytics } from './components/WorkforceAnalytics';
import { PayrollAnalytics } from './components/PayrollAnalytics';
import { AttendanceAnalytics } from './components/AttendanceAnalytics';
import { LeaveAnalytics } from './components/LeaveAnalytics';
import { RecruitmentAnalytics } from './components/RecruitmentAnalytics';
import { ComplianceAnalytics } from './components/ComplianceAnalytics';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

type AnalyticsView = 
 | 'landing' 
 | 'workforce' 
 | 'payroll' 
 | 'attendance' 
 | 'leave' 
 | 'recruitment' 
 | 'compliance'
 | 'full-report';

export function ReportsAnalyticsPage() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const [, setLocation] = useLocation();
 
 const [activeView, setActiveView] = useState<AnalyticsView>('landing');
 
 // Use custom hook for data fetching (Hook → Service → tRPC → Database)
 const { data: allAnalytics, isLoading, refetch, dateRange, setDateRange } = useReportsAnalyticsData();

 const labels = {
 title: t.orgReports.reportsAnalytics,
 subtitle: t.orgReports.managementAndAuditreadyHrInsights,
 readOnly: '📊 All reports are read-only and auto-generated from system data',
 
 // Analytics Cards
 workforceAnalytics: t.orgReports.workforceAnalytics,
 payrollCostAnalytics: t.orgReports.payrollCostAnalytics,
 attendanceAnalytics: t.orgReports.attendanceAnalytics,
 leaveAnalytics: t.orgReports.leaveAnalytics,
 recruitmentAnalytics: t.orgReports.recruitmentAnalytics,
 complianceRiskAnalytics: t.orgReports.complianceRiskAnalytics,
 
 scope: t.orgReports.scope,
 dataSources: t.orgReports.dataSources,
 lastRefresh: t.orgReports.lastRefresh,
 viewAnalytics: t.orgReports.viewAnalytics,
 sync: t.orgReports.syncData,
 
 exportExcel: t.orgReports.exportToExcel,
 printReport: t.orgReports.printReport,
 fullManagementReport: t.orgReports.fullManagementReport,
 
 strategicWorkforce: t.orgReports.strategicWorkforceOverview,
 financialControl: t.orgReports.financialControlDonorCompliance,
 operationalDiscipline: t.orgReports.operationalDisciplineFairness,
 hrPlanning: t.orgReports.hrPlanningLiabilityTracking,
 hiringEffectiveness: t.orgReports.hiringEffectivenessFairness,
 auditGovernance: t.orgReports.auditGovernance,
 backToReports: t.orgReports.backToReports,
 
 // Data source translations
 profiles: t.orgReports.profiles,
 contracts: t.orgReports.contracts,
 payroll: t.orgReports.payroll,
 scales: t.orgReports.scales,
 attendance: t.orgReports.attendance,
 overtime: t.orgReports.overtime,
 leaves: t.orgReports.leaves,
 policies: t.orgReports.policies,
 vacancies: t.orgReports.vacancies,
 candidates: t.orgReports.candidates,
 auditLog: t.orgReports.auditLog,
 files: t.orgReports.files,
 };

 const handleExportExcel = async () => {
 if (!allAnalytics) return;
 
 try {
 const ExcelJS = (await import('exceljs')).default;
 const workbook = new ExcelJS.Workbook();
 const sheet = workbook.addWorksheet('Management Report');
 
 // Header
 sheet.addRow(['Integrated Management System - Analytics Report']);
 sheet.addRow(['Organization:', allAnalytics.organizationName]);
 sheet.addRow(['Generated on:', new Date().toLocaleString()]);
 sheet.addRow(['Date Range:', `${dateRange.from} to ${dateRange.to}`]);
 sheet.addRow([]);
 
 // Workforce
 sheet.addRow(['WORKFORCE SUMMARY']);
 sheet.addRow(['Active', allAnalytics.workforce.activeCount]);
 sheet.addRow(['Archived', allAnalytics.workforce.archivedCount]);
 sheet.addRow(['Exited', allAnalytics.workforce.exitedCount]);
 sheet.addRow(['Total', allAnalytics.workforce.totalCount]);
 sheet.addRow([]);
 
 // Departments
 sheet.addRow(['Department Headcount']);
 allAnalytics.workforce.byDepartment.forEach(d => sheet.addRow([d.name, d.count, `${d.percentage.toFixed(1)}%`]));
 sheet.addRow([]);
 
 // Payroll
 sheet.addRow(['PAYROLL SUMMARY']);
 sheet.addRow(['Est. Annual Payroll', allAnalytics.payroll.totalAnnualCost]);
 sheet.addRow([]);
 
 const buffer = await workbook.xlsx.writeBuffer();
 const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
 const saveAs = (await import('file-saver')).saveAs;
 saveAs(blob, `IMS_Management_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
 } catch (error) {
 console.error('Excel Export Failed:', error);
 alert('Failed to export Excel. Please check console for details.');
 }
 };

 const handlePrintReport = () => {
 window.print();
 };

 const renderLandingView = () => (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
 {[
 { id: 'workforce', icon: Users, title: labels.workforceAnalytics, scope: labels.strategicWorkforce, sources: [labels.profiles, labels.contracts] },
 { id: 'payroll', icon: DollarSign, title: labels.payrollCostAnalytics, scope: labels.financialControl, sources: [labels.payroll, labels.scales] },
 { id: 'attendance', icon: Clock, title: labels.attendanceAnalytics, scope: labels.operationalDiscipline, sources: [labels.attendance, labels.overtime] },
 { id: 'leave', icon: Calendar, title: labels.leaveAnalytics, scope: labels.hrPlanning, sources: [labels.leaves, labels.policies] },
 { id: 'recruitment', icon: UserPlus, title: labels.recruitmentAnalytics, scope: labels.hiringEffectiveness, sources: [labels.vacancies, labels.candidates] },
 { id: 'compliance', icon: Shield, title: labels.complianceRiskAnalytics, scope: labels.auditGovernance, sources: [labels.auditLog, labels.files] },
 ].map(card => {
 const Icon = card.icon;
 return (
 <div
 key={card.id}
 className="bg-white border-2 border-gray-100 rounded-[32px] p-10 hover:border-blue-200 hover:shadow-2xl transition-all duration-500 cursor-pointer group"
 onClick={() => setActiveView(card.id as AnalyticsView)} dir={isRTL ? 'rtl' : 'ltr'}
 >
 <div className="flex items-center justify-between mb-8">
 <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-[20px] group-hover:scale-110 transition-transform duration-500">
 <Icon className="w-8 h-8 text-blue-600" />
 </div>
 <Eye className="w-5 h-5 text-gray-300 group-hover:text-blue-600 transition-colors" />
 </div>
 
 <h3 className="text-xl font-black text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
 {card.title}
 </h3>
 
 <p className="text-sm text-gray-500 mb-6 leading-relaxed">
 {card.scope}
 </p>
 
 <div className="pt-6 border-t border-gray-100">
 <p className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-3">{labels.dataSources}</p>
 <div className="flex flex-wrap gap-2">
 {card.sources.map(src => (
 <span key={src} className="px-3 py-1 bg-gray-50 text-[10px] font-bold text-gray-600 rounded-full">
 {src}
 </span>
 ))}
 </div>
 </div>
 </div>
 );
 })}
 </div>
 );

 return (
 <div className="min-h-screen bg-gray-50/50 p-8 md:p-12 lg:p-16 print:p-0 print:bg-white overflow-x-hidden">
 <div className="max-w-[1400px] mx-auto space-y-12">
 {/* Back Button (Finance-style) */}
 {activeView !== 'landing' && (
 <BackButton onClick={() => setActiveView('landing')} label={labels.backToReports} />
 )}
 
 {/* Module Header */}
 <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 border-b border-gray-200 pb-10 print:hidden">
 <div className="space-y-4">
 <div>
 <h1 className="text-5xl font-black text-gray-900 tracking-tight mb-3">{labels.title}</h1>
 <p className="text-lg text-gray-500 font-medium max-w-2xl">{labels.subtitle}</p>
 </div>
 
 <div className="flex items-center gap-3 px-6 py-3 bg-blue-50 border border-blue-100 rounded-2xl w-fit">
 <Shield className="w-5 h-5 text-blue-600" />
 <span className="text-sm font-bold text-blue-900">{labels.readOnly}</span>
 </div>
 </div>
 
 <div className="flex flex-col gap-4">
 <div className="flex gap-3">
 <Button
 onClick={() => refetch()}
 disabled={isLoading}
 variant="outline"
 className="flex items-center gap-2"
 >
 <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
 {labels.sync}
 </Button>
 <Button
 onClick={handleExportExcel}
 disabled={!allAnalytics}
 variant="outline"
 className="flex items-center gap-2"
 >
 <Download className="w-4 h-4" />
 {labels.exportExcel}
 </Button>
 <Button
 onClick={handlePrintReport}
 disabled={!allAnalytics}
 variant="outline"
 className="flex items-center gap-2"
 >
 <Printer className="w-4 h-4" />
 {labels.printReport}
 </Button>
 </div>
 
 {allAnalytics && (
 <div className="text-xs text-gray-400 text-end">
 {labels.lastRefresh}: {new Date(allAnalytics.lastRefresh).toLocaleString()}
 </div>
 )}
 </div>
 </div>

 {/* Content Area */}
 {isLoading && (
 <div className="flex items-center justify-center py-20">
 <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
 </div>
 )}

 {!isLoading && !allAnalytics && (
 <div className="text-center py-20">
 <p className="text-gray-500">No data available for selected filters</p>
 </div>
 )}

 {!isLoading && allAnalytics && (
 <>
 {activeView === 'landing' && renderLandingView()}
 {activeView === 'workforce' && <WorkforceAnalytics data={allAnalytics.workforce} />}
 {activeView === 'payroll' && <PayrollAnalytics data={allAnalytics.payroll} />}
 {activeView === 'attendance' && <AttendanceAnalytics data={allAnalytics.attendance} />}
 {activeView === 'leave' && <LeaveAnalytics data={allAnalytics.leave} />}
 {activeView === 'recruitment' && <RecruitmentAnalytics data={allAnalytics.recruitment} />}
 {activeView === 'compliance' && <ComplianceAnalytics data={allAnalytics.compliance} />}
 </>
 )}
 </div>
 </div>
 );
}
