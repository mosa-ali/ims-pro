/**
 * ============================================================================
 * REPORTS & ANALYTICS - ERP-GRADE INTELLIGENCE MODULE
 * ============================================================================
 * 
 * PURPOSE: Cross-module analytical and audit engine
 * 
 * MANDATORY RULES:
 * - Read-only, system-wide intelligence
 * - Aggregates data across HR, Payroll, Attendance, Recruitment
 * - Supports management decisions and audits
 * - Produces official, printable, exportable reports
 * - NEVER duplicates dashboards or profile views
 * - NEVER allows data entry
 * 
 * STRUCTURE:
 * 1. Landing View (Cards Grid)
 * 2. Six Analytics Workspaces
 * 3. Export & Print capabilities
 * 
 * ============================================================================
 */

import { useState } from 'react';
import { 
 ArrowLeft, ArrowRight, 
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
 BarChart3,
 PieChart,
 FileText,
 RefreshCw
} from 'lucide-react';
import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

type AnalyticsView = 
 | 'landing' 
 | 'workforce' 
 | 'payroll' 
 | 'attendance' 
 | 'leave' 
 | 'recruitment' 
 | 'compliance';

interface AnalyticsCard {
 id: AnalyticsView;
 icon: typeof Users;
 scope: string;
 dataSources: string[];
 lastRefresh: string;
}

export function ReportsAnalytics() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const navigate = useNavigate();
 const [activeView, setActiveView] = useState<AnalyticsView>('landing');
 const [dateRange, setDateRange] = useState({ from: '2024-01-01', to: '2024-12-31' });
 const [selectedDepartment, setSelectedDepartment] = useState('all');
 const [selectedProject, setSelectedProject] = useState('all');

 const labels = {
 title: t.hrReports.reportsAnalytics,
 subtitle: t.hrReports.managementAndAuditreadyHrInsights1,
 readOnly: '📊 All reports are read-only and auto-generated from system data',
 
 // Analytics Cards
 workforceAnalytics: t.hrReports.workforceAnalytics,
 payrollCostAnalytics: t.hrReports.payrollCostAnalytics,
 attendanceAnalytics: t.hrReports.attendanceAnalytics,
 leaveAnalytics: t.hrReports.leaveAnalytics,
 recruitmentAnalytics: t.hrReports.recruitmentAnalytics,
 complianceRiskAnalytics: t.hrReports.complianceRiskAnalytics,
 
 scope: t.hrReports.scope,
 dataSources: t.hrReports.dataSources,
 lastRefresh: t.hrReports.lastRefresh,
 viewAnalytics: t.hrReports.viewAnalytics,
 
 // Common
 exportExcel: t.hrReports.exportToExcel,
 printReport: t.hrReports.printReport,
 filters: t.hrReports.filters,
 dateRange: t.hrReports.dateRange2,
 department: t.hrReports.department,
 project: t.hrReports.project,
 all: t.hrReports.all,
 from: t.hrReports.from,
 to: t.hrReports.to,
 applyFilters: t.hrReports.applyFilters,
 backToLanding: t.hrReports.backToReports,
 
 // Workforce
 strategicWorkforce: t.hrReports.strategicWorkforceOverview,
 headcountByDepartment: t.hrReports.headcountByDepartment3,
 headcountByProject: t.hrReports.headcountByProject4,
 headcountByContract: t.hrReports.headcountByContractType,
 staffStatus: t.hrReports.staffStatusDistribution,
 genderDistribution: t.hrReports.genderDistribution,
 nationalityDistribution: t.hrReports.nationalityDistribution,
 staffGrowth: t.hrReports.staffGrowthOverTime,
 
 // Payroll
 financialControl: t.hrReports.financialControlDonorCompliance,
 payrollCostByMonth: t.hrReports.payrollCostByMonth,
 payrollByProject: t.hrReports.payrollByProject,
 salaryDistribution: t.hrReports.salaryDistributionByGrade,
 allowancesSummary: t.hrReports.allowancesSummary,
 overtimeCost: t.hrReports.overtimeCost,
 costTrends: t.hrReports.costTrendsOverTime,
 
 // Attendance
 operationalDiscipline: t.hrReports.operationalDisciplineFairness,
 attendanceRate: t.hrReports.attendanceRateByDepartment,
 lateArrivals: t.hrReports.lateArrivalsTrends,
 absencePatterns: t.hrReports.absencePatterns,
 overtimeHours: t.hrReports.overtimeHoursByProject,
 lockedRecords: t.hrReports.lockedVsAdjustedRecords,
 
 // Leave
 hrPlanning: t.hrReports.hrPlanningLiabilityTracking,
 leaveBalances: t.hrReports.leaveBalancesByType,
 leaveTaken: t.hrReports.leaveTakenPerPeriod,
 leaveLiability: t.hrReports.leaveLiabilityProjection,
 highRiskStaff: t.hrReports.highriskStaffExcessiveLeave,
 
 // Recruitment
 hiringEffectiveness: t.hrReports.hiringEffectivenessFairness,
 timeToHire: t.hrReports.timetohire,
 candidatesPerVacancy: t.hrReports.candidatesPerVacancy,
 shortlistRatio: t.hrReports.shortlistVsSelectionRatio,
 vacancyAging: t.hrReports.vacancyAging,
 sourceEffectiveness: t.hrReports.sourceEffectiveness,
 
 // Compliance
 auditGovernance: t.hrReports.auditGovernance,
 contractsExpiring: t.hrReports.contractsExpiring,
 missingDocuments: t.hrReports.missingMandatoryDocuments,
 pendingAppraisals: t.hrReports.pendingAppraisals,
 disciplinaryCases: t.hrReports.disciplinaryCasesSummary,
 attendanceAnomalies: t.hrReports.attendanceAnomalies,
 payrollExceptions: t.hrReports.payrollExceptions,
 
 count: t.hrReports.count,
 percentage: 'النسبة',
 amount: t.hrReports.amount,
 total: t.hrReports.total,
 average: t.hrReports.average,
 
 active: t.hrReports.active,
 archived: t.hrReports.archived,
 exited: t.hrReports.exited,
 male: t.hrReports.male,
 female: t.hrReports.female,
 };

 const analyticsCards: AnalyticsCard[] = [
 {
 id: 'workforce',
 icon: Users,
 scope: labels.strategicWorkforce,
 dataSources: ['Employee Profiles', 'Contracts', 'HR Archive'],
 lastRefresh: '2024-01-24 10:30 AM'
 },
 {
 id: 'payroll',
 icon: DollarSign,
 scope: labels.financialControl,
 dataSources: ['Approved Payroll', 'Salary Scale', 'Allowances', 'Attendance (OT)'],
 lastRefresh: '2024-01-24 10:30 AM'
 },
 {
 id: 'attendance',
 icon: Clock,
 scope: labels.operationalDiscipline,
 dataSources: ['Attendance Records', 'Locked Periods', 'Overtime Logs'],
 lastRefresh: '2024-01-24 10:30 AM'
 },
 {
 id: 'leave',
 icon: Calendar,
 scope: labels.hrPlanning,
 dataSources: ['Leave Requests', 'Leave Balances', 'Leave Policy'],
 lastRefresh: '2024-01-24 10:30 AM'
 },
 {
 id: 'recruitment',
 icon: UserPlus,
 scope: labels.hiringEffectiveness,
 dataSources: ['Vacancies', 'Applications', 'Shortlists', 'Selections'],
 lastRefresh: '2024-01-24 10:30 AM'
 },
 {
 id: 'compliance',
 icon: Shield,
 scope: labels.auditGovernance,
 dataSources: ['All HR Modules', 'System Logs', 'Audit Trail'],
 lastRefresh: '2024-01-24 10:30 AM'
 }
 ];

 const handleExportExcel = () => {
 alert('Exporting to Excel...'
 );
 };

 const handlePrintReport = () => {
 alert('Preparing PDF for print...'
 );
 };

 const renderLandingView = () => (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {analyticsCards.map(card => {
 const Icon = card.icon;
 return (
 <div 
 key={card.id}
 className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
 onClick={() => setActiveView(card.id)} dir={isRTL ? 'rtl' : 'ltr'}
 >
 <div className="flex items-start gap-4 mb-4">
 <div className="p-3 bg-blue-50 rounded-lg">
 <Icon className="w-6 h-6 text-blue-600" />
 </div>
 <div className="flex-1">
 <h3 className="font-semibold text-gray-900 mb-1">
 {card.id === 'workforce' && labels.workforceAnalytics}
 {card.id === 'payroll' && labels.payrollCostAnalytics}
 {card.id === 'attendance' && labels.attendanceAnalytics}
 {card.id === 'leave' && labels.leaveAnalytics}
 {card.id === 'recruitment' && labels.recruitmentAnalytics}
 {card.id === 'compliance' && labels.complianceRiskAnalytics}
 </h3>
 <p className="text-sm text-gray-600">{card.scope}</p>
 </div>
 </div>

 <div className="space-y-3 mb-4">
 <div>
 <p className="text-xs font-medium text-gray-500 mb-1">{labels.dataSources}</p>
 <div className="flex flex-wrap gap-1">
 {card.dataSources.map((source, idx) => (
 <span 
 key={idx}
 className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
 >
 {source}
 </span>
 ))}
 </div>
 </div>
 
 <div className="flex items-center gap-2 text-xs text-gray-500">
 <RefreshCw className="w-3 h-3" />
 <span>{labels.lastRefresh}: {card.lastRefresh}</span>
 </div>
 </div>

 <button className="w-full py-2 px-4 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium">
 {labels.viewAnalytics}
 </button>
 </div>
 );
 })}
 </div>
 );

 const renderFilterBar = () => (
 <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
 <div className="flex items-center gap-2 mb-4">
 <Filter className="w-4 h-4 text-gray-600" />
 <h3 className="font-medium text-gray-900">{labels.filters}</h3>
 </div>
 
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{labels.from}</label>
 <input 
 type="date" 
 value={dateRange.from}
 onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{labels.to}</label>
 <input 
 type="date" 
 value={dateRange.to}
 onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{labels.department}</label>
 <select 
 value={selectedDepartment}
 onChange={(e) => setSelectedDepartment(e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
 >
 <option value="all">{labels.all}</option>
 <option value="programs">Programs</option>
 <option value="operations">Operations</option>
 <option value="finance">Finance</option>
 <option value="hr">Human Resources</option>
 </select>
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{labels.project}</label>
 <select 
 value={selectedProject}
 onChange={(e) => setSelectedProject(e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
 >
 <option value="all">{labels.all}</option>
 <option value="wash">WASH Program</option>
 <option value="health">Health Services</option>
 <option value="education">Education Support</option>
 </select>
 </div>
 </div>
 
 <div className="flex gap-3 mt-4">
 <button 
 onClick={handleExportExcel}
 className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
 >
 <Download className="w-4 h-4" />
 {labels.exportExcel}
 </button>
 <button 
 onClick={handlePrintReport}
 className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
 >
 <Printer className="w-4 h-4" />
 {labels.printReport}
 </button>
 </div>
 </div>
 );

 const renderWorkforceAnalytics = () => (
 <div className="space-y-6">
 {renderFilterBar()}
 
 {/* Summary KPIs */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
 <p className="text-sm text-blue-600 mb-1">{labels.active}</p>
 <p className="text-3xl font-bold text-blue-900">8</p>
 </div>
 <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
 <p className="text-sm text-amber-600 mb-1">{labels.archived}</p>
 <p className="text-3xl font-bold text-amber-900">0</p>
 </div>
 <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
 <p className="text-sm text-gray-600 mb-1">{labels.exited}</p>
 <p className="text-3xl font-bold text-gray-900">0</p>
 </div>
 <div className="bg-green-50 border border-green-200 rounded-lg p-4">
 <p className="text-sm text-green-600 mb-1">{labels.total}</p>
 <p className="text-3xl font-bold text-green-900">8</p>
 </div>
 </div>

 {/* Headcount by Department */}
 <div className="bg-white border border-gray-200 rounded-lg p-6">
 <h3 className="font-semibold text-gray-900 mb-4">{labels.headcountByDepartment}</h3>
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>{labels.department}</th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>{labels.count}</th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>{labels.percentage}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 <tr><td className="px-4 py-3 text-sm">Programs</td><td className="px-4 py-3 text-sm font-medium">2</td><td className="px-4 py-3 text-sm">25.0%</td></tr>
 <tr><td className="px-4 py-3 text-sm">MEAL</td><td className="px-4 py-3 text-sm font-medium">1</td><td className="px-4 py-3 text-sm">12.5%</td></tr>
 <tr><td className="px-4 py-3 text-sm">Operations</td><td className="px-4 py-3 text-sm font-medium">3</td><td className="px-4 py-3 text-sm">37.5%</td></tr>
 <tr><td className="px-4 py-3 text-sm">Finance</td><td className="px-4 py-3 text-sm font-medium">1</td><td className="px-4 py-3 text-sm">12.5%</td></tr>
 <tr><td className="px-4 py-3 text-sm">Human Resources</td><td className="px-4 py-3 text-sm font-medium">1</td><td className="px-4 py-3 text-sm">12.5%</td></tr>
 </tbody>
 </table>
 </div>

 {/* Gender Distribution */}
 <div className="bg-white border border-gray-200 rounded-lg p-6">
 <h3 className="font-semibold text-gray-900 mb-4">{labels.genderDistribution}</h3>
 <div className="grid grid-cols-2 gap-4">
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
 <p className="text-sm text-blue-600 mb-2">{labels.male}</p>
 <p className="text-4xl font-bold text-blue-900">4</p>
 <p className="text-sm text-blue-700 mt-1">50.0%</p>
 </div>
 <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 text-center">
 <p className="text-sm text-pink-600 mb-2">{labels.female}</p>
 <p className="text-4xl font-bold text-pink-900">4</p>
 <p className="text-sm text-pink-700 mt-1">50.0%</p>
 </div>
 </div>
 </div>
 </div>
 );

 const renderPayrollAnalytics = () => (
 <div className="space-y-6">
 {renderFilterBar()}
 
 <div className="bg-white border border-gray-200 rounded-lg p-6">
 <h3 className="font-semibold text-gray-900 mb-4">{labels.payrollCostByMonth}</h3>
 <div className="h-64 flex items-center justify-center border border-gray-200 rounded-lg bg-gray-50">
 <div className="text-center">
 <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
 <p className="text-sm text-gray-500">{t.hrReports.chartVisualizationWouldAppearHere}</p>
 </div>
 </div>
 </div>

 <div className="bg-white border border-gray-200 rounded-lg p-6">
 <h3 className="font-semibold text-gray-900 mb-4">{labels.payrollByProject}</h3>
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>{labels.project}</th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>{labels.count}</th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>{labels.amount}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 <tr><td className="px-4 py-3 text-sm">WASH Program</td><td className="px-4 py-3 text-sm">3</td><td className="px-4 py-3 text-sm font-medium">$12,500</td></tr>
 <tr><td className="px-4 py-3 text-sm">Health Services</td><td className="px-4 py-3 text-sm">2</td><td className="px-4 py-3 text-sm font-medium">$8,200</td></tr>
 <tr><td className="px-4 py-3 text-sm">Education Support</td><td className="px-4 py-3 text-sm">3</td><td className="px-4 py-3 text-sm font-medium">$10,800</td></tr>
 </tbody>
 </table>
 </div>
 </div>
 );

 const renderAttendanceAnalytics = () => (
 <div className="space-y-6">
 {renderFilterBar()}
 
 <div className="bg-white border border-gray-200 rounded-lg p-6">
 <h3 className="font-semibold text-gray-900 mb-4">{labels.attendanceRate}</h3>
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>{labels.department}</th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>{t.hrReports.rate}</th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>{t.hrReports.lateArrivals}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 <tr><td className="px-4 py-3 text-sm">Programs</td><td className="px-4 py-3 text-sm font-medium text-green-600">98.5%</td><td className="px-4 py-3 text-sm">2</td></tr>
 <tr><td className="px-4 py-3 text-sm">Operations</td><td className="px-4 py-3 text-sm font-medium text-green-600">99.2%</td><td className="px-4 py-3 text-sm">1</td></tr>
 <tr><td className="px-4 py-3 text-sm">Finance</td><td className="px-4 py-3 text-sm font-medium text-green-600">100%</td><td className="px-4 py-3 text-sm">0</td></tr>
 </tbody>
 </table>
 </div>
 </div>
 );

 const renderLeaveAnalytics = () => (
 <div className="space-y-6">
 {renderFilterBar()}
 
 <div className="bg-white border border-gray-200 rounded-lg p-6">
 <h3 className="font-semibold text-gray-900 mb-4">{labels.leaveBalances}</h3>
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>{t.hrReports.leaveType}</th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>{t.hrReports.totalAllocated}</th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>{t.hrReports.used}</th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>{t.hrReports.remaining}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 <tr><td className="px-4 py-3 text-sm">Annual Leave</td><td className="px-4 py-3 text-sm">200</td><td className="px-4 py-3 text-sm">45</td><td className="px-4 py-3 text-sm font-medium text-green-600">155</td></tr>
 <tr><td className="px-4 py-3 text-sm">Sick Leave</td><td className="px-4 py-3 text-sm">80</td><td className="px-4 py-3 text-sm">12</td><td className="px-4 py-3 text-sm font-medium text-green-600">68</td></tr>
 <tr><td className="px-4 py-3 text-sm">Emergency Leave</td><td className="px-4 py-3 text-sm">40</td><td className="px-4 py-3 text-sm">8</td><td className="px-4 py-3 text-sm font-medium text-green-600">32</td></tr>
 </tbody>
 </table>
 </div>
 </div>
 );

 const renderRecruitmentAnalytics = () => (
 <div className="space-y-6">
 {renderFilterBar()}
 
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
 <div className="bg-white border border-gray-200 rounded-lg p-4">
 <p className="text-sm text-gray-600 mb-1">{labels.timeToHire}</p>
 <p className="text-3xl font-bold text-gray-900">42 {t.hrReports.days}</p>
 <p className="text-xs text-gray-500 mt-1">{labels.average}</p>
 </div>
 <div className="bg-white border border-gray-200 rounded-lg p-4">
 <p className="text-sm text-gray-600 mb-1">{labels.candidatesPerVacancy}</p>
 <p className="text-3xl font-bold text-gray-900">18</p>
 <p className="text-xs text-gray-500 mt-1">{labels.average}</p>
 </div>
 <div className="bg-white border border-gray-200 rounded-lg p-4">
 <p className="text-sm text-gray-600 mb-1">{t.hrReports.selectionRate}</p>
 <p className="text-3xl font-bold text-gray-900">5.6%</p>
 <p className="text-xs text-gray-500 mt-1">{labels.average}</p>
 </div>
 </div>

 <div className="bg-white border border-gray-200 rounded-lg p-6">
 <h3 className="font-semibold text-gray-900 mb-4">{labels.vacancyAging}</h3>
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>{t.hrReports.position}</th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>{t.hrReports.daysOpen}</th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>{t.hrReports.applications}</th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>{t.hrReports.status}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 <tr>
 <td className="px-4 py-3 text-sm">Program Officer</td>
 <td className="px-4 py-3 text-sm">28</td>
 <td className="px-4 py-3 text-sm">15</td>
 <td className="px-4 py-3 text-sm"><span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs">In Progress</span></td>
 </tr>
 <tr>
 <td className="px-4 py-3 text-sm">Finance Officer</td>
 <td className="px-4 py-3 text-sm">45</td>
 <td className="px-4 py-3 text-sm">22</td>
 <td className="px-4 py-3 text-sm"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">Shortlisting</span></td>
 </tr>
 </tbody>
 </table>
 </div>
 </div>
 );

 const renderComplianceAnalytics = () => (
 <div className="space-y-6">
 {renderFilterBar()}
 
 {/* Critical Alerts */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="bg-red-50 border border-red-200 rounded-lg p-4">
 <p className="text-sm text-red-600 mb-1">{labels.contractsExpiring}</p>
 <p className="text-3xl font-bold text-red-900">2</p>
 <p className="text-xs text-red-700 mt-1">{t.hrReports.within30Days}</p>
 </div>
 <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
 <p className="text-sm text-amber-600 mb-1">{labels.missingDocuments}</p>
 <p className="text-3xl font-bold text-amber-900">5</p>
 <p className="text-xs text-amber-700 mt-1">{t.hrReports.across3Employees}</p>
 </div>
 <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
 <p className="text-sm text-orange-600 mb-1">{labels.pendingAppraisals}</p>
 <p className="text-3xl font-bold text-orange-900">3</p>
 <p className="text-xs text-orange-700 mt-1">{t.hrReports.overdue}</p>
 </div>
 </div>

 {/* Contracts Expiring Detail */}
 <div className="bg-white border border-gray-200 rounded-lg p-6">
 <h3 className="font-semibold text-gray-900 mb-4">{labels.contractsExpiring}</h3>
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>{t.hrReports.employee}</th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>{t.hrReports.position}</th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>{t.hrReports.endDate}</th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>{t.hrReports.daysLeft}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 <tr>
 <td className="px-4 py-3 text-sm">Ahmed Hassan</td>
 <td className="px-4 py-3 text-sm">Program Officer</td>
 <td className="px-4 py-3 text-sm">2024-02-15</td>
 <td className="px-4 py-3 text-sm"><span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-medium">22 days</span></td>
 </tr>
 <tr>
 <td className="px-4 py-3 text-sm">Fatima Al-Sayed</td>
 <td className="px-4 py-3 text-sm">MEAL Officer</td>
 <td className="px-4 py-3 text-sm">2024-02-28</td>
 <td className="px-4 py-3 text-sm"><span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-medium">35 days</span></td>
 </tr>
 </tbody>
 </table>
 </div>

 {/* Disciplinary Cases Summary */}
 <div className="bg-white border border-gray-200 rounded-lg p-6">
 <h3 className="font-semibold text-gray-900 mb-4">{labels.disciplinaryCases}</h3>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <div className="text-center">
 <p className="text-2xl font-bold text-gray-900">2</p>
 <p className="text-xs text-gray-500">{t.hrReports.activeCases}</p>
 </div>
 <div className="text-center">
 <p className="text-2xl font-bold text-gray-900">1</p>
 <p className="text-xs text-gray-500">{t.hrReports.underReview}</p>
 </div>
 <div className="text-center">
 <p className="text-2xl font-bold text-gray-900">8</p>
 <p className="text-xs text-gray-500">{t.hrReports.resolved2024}</p>
 </div>
 <div className="text-center">
 <p className="text-2xl font-bold text-gray-900">0</p>
 <p className="text-xs text-gray-500">{t.hrReports.escalated}</p>
 </div>
 </div>
 </div>
 </div>
 );

 return (
 <div className="space-y-6">
 {/* Back Button */}
 <BackButton onClick={() => activeView === 'landing' ? navigate('/organization/hr') : setActiveView('landing')} label={activeView === 'landing' ? (t.hrReports.backToHr) : labels.backToLanding} />

 {/* Header */}
 <div>
 <h1 className="text-3xl font-bold text-gray-900">{labels.title}</h1>
 <p className="text-base text-gray-600 mt-2">{labels.subtitle}</p>
 </div>

 {/* Read-Only Notice */}
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
 <p className="text-sm text-blue-900">{labels.readOnly}</p>
 </div>

 {/* Content */}
 {activeView === 'landing' && renderLandingView()}
 {activeView === 'workforce' && renderWorkforceAnalytics()}
 {activeView === 'payroll' && renderPayrollAnalytics()}
 {activeView === 'attendance' && renderAttendanceAnalytics()}
 {activeView === 'leave' && renderLeaveAnalytics()}
 {activeView === 'recruitment' && renderRecruitmentAnalytics()}
 {activeView === 'compliance' && renderComplianceAnalytics()}
 </div>
 );
}
