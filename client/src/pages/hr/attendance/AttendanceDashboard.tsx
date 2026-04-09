/**
 * ============================================================================
 * ATTENDANCE DASHBOARD
 * ============================================================================
 * 
 * Main hub for attendance management
 * - KPI cards (Present, Absent, Late, Overtime, etc.)
 * - Quick actions
 * - Navigation to sub-modules
 * 
 * ============================================================================
 */
import { Link } from 'wouter';

import { useState, useEffect } from 'react';
import {
 Users,
 UserCheck,
 UserX,
 Clock,
 Timer,
 AlertCircle,
 CheckCircle,
 Calendar,
 FileText,
 ClipboardList,
 Download,
 Lock,
 Unlock
, ArrowLeft, ArrowRight} from 'lucide-react';
import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { attendanceService, AttendanceStats, AttendancePeriod } from '@/app/services/attendanceService';
import { seedAttendanceData } from '@/app/utils/seedAttendanceData';
import { trpc } from '@/lib/trpc';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export function AttendanceDashboard() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const navigate = useNavigate();
 const { currentOrganizationId } = useOrganization();
 const { currentOperatingUnitId } = useOperatingUnit();

 // Get real employee count from database
 const { data: employeeCounts } = trpc.hrEmployees.getCounts.useQuery(
 {},
 { enabled: !!currentOrganizationId && !!currentOperatingUnitId }
 );

 const [stats, setStats] = useState<AttendanceStats>({
 totalStaff: 0,
 presentToday: 0,
 absentToday: 0,
 lateArrivals: 0,
 overtimeHoursToday: 0,
 overtimeHoursPeriod: 0,
 pendingApprovals: 0,
 flaggedRecords: 0
 });

 const [currentPeriod, setCurrentPeriod] = useState<AttendancePeriod | null>(null);

 useEffect(() => {
 // Seed data on first load
 seedAttendanceData();
 loadDashboardData();
 }, []);

 // Update stats when employee counts change
 useEffect(() => {
 if (employeeCounts) {
 loadDashboardData();
 }
 }, [employeeCounts]);

 const loadDashboardData = () => {
 // Load statistics
 const dashboardStats = attendanceService.getStats();
 // Override totalStaff with real database count
 setStats({
 ...dashboardStats,
 totalStaff: employeeCounts?.active ?? 0
 });

 // Load current period
 const now = new Date();
 const periodMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
 let period = attendanceService.getPeriod(periodMonth);
 
 // Create period if it doesn't exist
 if (!period) {
 period = attendanceService.createOrUpdatePeriod(periodMonth);
 }
 
 setCurrentPeriod(period);
 };

 const labels = {
 title: t.hrAttendance.attendanceManagement,
 subtitle: t.hr.attendanceSubtitle,
 
 // KPI Cards
 totalStaff: t.hrAttendance.totalStaff,
 presentToday: t.hrAttendance.presentToday,
 absentToday: t.hrAttendance.absentToday,
 lateArrivals: t.hrAttendance.lateArrivals,
 overtimeToday: t.hrAttendance.overtimeToday,
 overtimePeriod: t.hrAttendance.overtimeThisMonth,
 pendingApprovals: t.hrAttendance.pendingApprovals,
 flaggedRecords: t.hrAttendance.flaggedRecords,
 
 hours: t.hrAttendance.hours1,
 records: t.hrAttendance.records,
 
 // Period Status
 currentPeriod: t.hrAttendance.currentPeriod,
 periodStatus: t.hrAttendance.status,
 lockDeadline: t.hrAttendance.lockDeadline,
 statusOpen: t.hrAttendance.open,
 statusLocked: t.hrAttendance.locked,
 
 // Actions
 viewCalendar: t.hrAttendance.viewCalendar,
 viewRecords: t.hrAttendance.viewAllRecords,
 myAttendance: t.hrAttendance.myAttendance,
 overtimeManagement: t.hrAttendance.overtimeManagement,
 printReports: t.hrAttendance.printReports,
 periodManagement: t.hrAttendance.periodManagement,
 
 // Quick Stats
 quickStats: t.hrAttendance.quickStatistics,
 viewDetails: t.hrAttendance.viewDetails
 };

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <BackButton href="/organization/hr" label={t.hrAttendance.hrDashboard} />

 {/* Back Button */}
 

 {/* Header */}
 <div>
 <h1 className={`text-2xl font-bold text-gray-900 text-start`}>
 {labels.title}
 </h1>
 <p className={`text-sm text-gray-600 mt-1 text-start`}>
 {labels.subtitle}
 </p>
 </div>

 {/* Current Period Status Banner */}
 {currentPeriod && (
 <div className={`bg-gradient-to-r ${currentPeriod.status === 'locked' ? 'from-red-50 to-red-100 border-red-200' : 'from-blue-50 to-blue-100 border-blue-200'} border-2 rounded-lg p-4`}>
 <div className="flex items-center justify-between">
 <div className="flex items-center justify-between mt-4">{currentPeriod.status === 'locked' ? (
 <Lock className="w-6 h-6 text-red-600" />
 ) : (
 <Unlock className="w-6 h-6 text-blue-600" />
 )}
 <div className={'text-start'}>
 <p className="text-sm font-semibold text-gray-900">
 {labels.currentPeriod}: {currentPeriod.monthName} {currentPeriod.year}
 </p>
 <p className="text-xs text-gray-600">
 {labels.periodStatus}: {currentPeriod.status === 'locked' ? labels.statusLocked : labels.statusOpen}
 {currentPeriod.status === 'open' && ` • ${labels.lockDeadline}: ${currentPeriod.lockDeadline}`}
 </p>
 </div>
 </div>
 <button
 onClick={() => navigate('/organization/hr/attendance/periods')}
 className={`px-4 py-2 bg-white border-2 ${currentPeriod.status === 'locked' ? 'border-red-300' : 'border-blue-300'} rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors`}
 >
 {labels.periodManagement}
 </button>
 </div>
 </div>
 )}

 {/* KPI Cards - Row 1 */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 {/* Total Staff */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <div className="flex items-center justify-between mb-4">
 <div className="p-3 bg-gray-50 rounded-lg">
 <Users className="w-6 h-6 text-gray-600" />
 </div>
 </div>
 <div className={'text-start'}>
 <p className="text-sm text-gray-600 mb-1">{labels.totalStaff}</p>
 <p className="text-3xl font-bold text-gray-900">{stats.totalStaff}</p>
 </div>
 </div>

 {/* Present Today */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <div className="flex items-center justify-between mb-4">
 <div className="p-3 bg-green-50 rounded-lg">
 <UserCheck className="w-6 h-6 text-green-600" />
 </div>
 </div>
 <div className={'text-start'}>
 <p className="text-sm text-gray-600 mb-1">{labels.presentToday}</p>
 <p className="text-3xl font-bold text-green-600">{stats.presentToday}</p>
 </div>
 </div>

 {/* Absent Today */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <div className="flex items-center justify-between mb-4">
 <div className="p-3 bg-red-50 rounded-lg">
 <UserX className="w-6 h-6 text-red-600" />
 </div>
 </div>
 <div className={'text-start'}>
 <p className="text-sm text-gray-600 mb-1">{labels.absentToday}</p>
 <p className="text-3xl font-bold text-red-600">{stats.absentToday}</p>
 </div>
 </div>

 {/* Late Arrivals */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <div className="flex items-center justify-between mb-4">
 <div className="p-3 bg-yellow-50 rounded-lg">
 <Clock className="w-6 h-6 text-yellow-600" />
 </div>
 </div>
 <div className={'text-start'}>
 <p className="text-sm text-gray-600 mb-1">{labels.lateArrivals}</p>
 <p className="text-3xl font-bold text-yellow-600">{stats.lateArrivals}</p>
 </div>
 </div>
 </div>

 {/* KPI Cards - Row 2 */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 {/* Overtime Today */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <div className="flex items-center justify-between mb-4">
 <div className="p-3 bg-purple-50 rounded-lg">
 <Timer className="w-6 h-6 text-purple-600" />
 </div>
 </div>
 <div className={'text-start'}>
 <p className="text-sm text-gray-600 mb-1">{labels.overtimeToday}</p>
 <p className="text-3xl font-bold text-purple-600">{stats.overtimeHoursToday.toFixed(1)}</p>
 <p className="text-xs text-gray-500 mt-1">{labels.hours}</p>
 </div>
 </div>

 {/* Overtime This Month */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <div className="flex items-center justify-between mb-4">
 <div className="p-3 bg-indigo-50 rounded-lg">
 <Timer className="w-6 h-6 text-indigo-600" />
 </div>
 </div>
 <div className={'text-start'}>
 <p className="text-sm text-gray-600 mb-1">{labels.overtimePeriod}</p>
 <p className="text-3xl font-bold text-indigo-600">{stats.overtimeHoursPeriod.toFixed(1)}</p>
 <p className="text-xs text-gray-500 mt-1">{labels.hours}</p>
 </div>
 </div>

 {/* Pending Approvals */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <div className="flex items-center justify-between mb-4">
 <div className="p-3 bg-orange-50 rounded-lg">
 <AlertCircle className="w-6 h-6 text-orange-600" />
 </div>
 </div>
 <div className={'text-start'}>
 <p className="text-sm text-gray-600 mb-1">{labels.pendingApprovals}</p>
 <p className="text-3xl font-bold text-orange-600">{stats.pendingApprovals}</p>
 <p className="text-xs text-gray-500 mt-1">{labels.records}</p>
 </div>
 </div>

 {/* Flagged Records */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <div className="flex items-center justify-between mb-4">
 <div className="p-3 bg-pink-50 rounded-lg">
 <AlertCircle className="w-6 h-6 text-pink-600" />
 </div>
 </div>
 <div className={'text-start'}>
 <p className="text-sm text-gray-600 mb-1">{labels.flaggedRecords}</p>
 <p className="text-3xl font-bold text-pink-600">{stats.flaggedRecords}</p>
 <p className="text-xs text-gray-500 mt-1">{labels.records}</p>
 </div>
 </div>
 </div>

 {/* Quick Actions */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {/* View Calendar */}
 <button
 onClick={() => navigate('/organization/hr/attendance/calendar')}
 className={`flex items-center gap-4 p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-lg transition-all`}
 >
 <div className="p-3 bg-blue-50 rounded-lg">
 <Calendar className="w-6 h-6 text-blue-600" />
 </div>
 <div className={'text-start'}>
 <p className="font-semibold text-gray-900">{labels.viewCalendar}</p>
 <p className="text-xs text-gray-600">{t.hrAttendance.dayWeekMonthViews}</p>
 </div>
 </button>

 {/* View Records */}
 <button
 onClick={() => navigate('/organization/hr/attendance/records')}
 className={`flex items-center gap-4 p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-green-500 hover:shadow-lg transition-all`}
 >
 <div className="p-3 bg-green-50 rounded-lg">
 <FileText className="w-6 h-6 text-green-600" />
 </div>
 <div className={'text-start'}>
 <p className="font-semibold text-gray-900">{labels.viewRecords}</p>
 <p className="text-xs text-gray-600">{t.hrAttendance.searchFilterExport}</p>
 </div>
 </button>

 {/* My Attendance (Employee View) */}
 <button
 onClick={() => navigate('/organization/hr/attendance/my-attendance')}
 className={`flex items-center gap-4 p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:shadow-lg transition-all`}
 >
 <div className="p-3 bg-purple-50 rounded-lg">
 <UserCheck className="w-6 h-6 text-purple-600" />
 </div>
 <div className={'text-start'}>
 <p className="font-semibold text-gray-900">{labels.myAttendance}</p>
 <p className="text-xs text-gray-600">{t.hrAttendance.viewSubmitExplanations}</p>
 </div>
 </button>

 {/* Overtime Management */}
 <button
 onClick={() => navigate('/organization/hr/attendance/overtime')}
 className={`flex items-center gap-4 p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:shadow-lg transition-all`}
 >
 <div className="p-3 bg-indigo-50 rounded-lg">
 <Timer className="w-6 h-6 text-indigo-600" />
 </div>
 <div className={'text-start'}>
 <p className="font-semibold text-gray-900">{labels.overtimeManagement}</p>
 <p className="text-xs text-gray-600">{t.hrAttendance.approveTrackOvertime}</p>
 </div>
 </button>

 {/* Print Reports */}
 <button
 onClick={() => navigate('/organization/hr/attendance/reports')}
 className={`flex items-center gap-4 p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:shadow-lg transition-all`}
 >
 <div className="p-3 bg-orange-50 rounded-lg">
 <Download className="w-6 h-6 text-orange-600" />
 </div>
 <div className={'text-start'}>
 <p className="font-semibold text-gray-900">{labels.printReports}</p>
 <p className="text-xs text-gray-600">{t.hrAttendance.monthlySheetsForms}</p>
 </div>
 </button>

 {/* Period Management */}
 <button
 onClick={() => navigate('/organization/hr/attendance/periods')}
 className={`flex items-center gap-4 p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-red-500 hover:shadow-lg transition-all`}
 >
 <div className="p-3 bg-red-50 rounded-lg">
 <Lock className="w-6 h-6 text-red-600" />
 </div>
 <div className={'text-start'}>
 <p className="font-semibold text-gray-900">{labels.periodManagement}</p>
 <p className="text-xs text-gray-600">{t.hrAttendance.lockUnlockPeriods}</p>
 </div>
 </button>
 </div>
 </div>
 );
}