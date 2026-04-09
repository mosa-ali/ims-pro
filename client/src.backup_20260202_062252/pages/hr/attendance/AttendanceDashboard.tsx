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
} from 'lucide-react';
import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { BackToModulesButton } from '../BackToModulesButton';
import { attendanceService, AttendanceStats, AttendancePeriod } from '@/app/services/attendanceService';
import { seedAttendanceData } from '@/app/utils/seedAttendanceData';

export function AttendanceDashboard() {
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();

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

  const loadDashboardData = () => {
    // Load statistics
    const dashboardStats = attendanceService.getStats();
    setStats(dashboardStats);

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

  const t = {
    title: language === 'en' ? 'Attendance Management' : 'إدارة الحضور',
    subtitle: language === 'en' 
      ? 'Track attendance, shifts, overtime, and period locking' 
      : 'تتبع الحضور، والمناوبات، والعمل الإضافي، وإغلاق الفترات',
    
    // KPI Cards
    totalStaff: language === 'en' ? 'Total Staff' : 'إجمالي الموظفين',
    presentToday: language === 'en' ? 'Present Today' : 'حاضر اليوم',
    absentToday: language === 'en' ? 'Absent Today' : 'غائب اليوم',
    lateArrivals: language === 'en' ? 'Late Arrivals' : 'التأخيرات',
    overtimeToday: language === 'en' ? 'Overtime Today' : 'العمل الإضافي اليوم',
    overtimePeriod: language === 'en' ? 'Overtime This Month' : 'العمل الإضافي هذا الشهر',
    pendingApprovals: language === 'en' ? 'Pending Approvals' : 'الموافقات المعلقة',
    flaggedRecords: language === 'en' ? 'Flagged Records' : 'السجلات المميزة',
    
    hours: language === 'en' ? 'hours' : 'ساعات',
    records: language === 'en' ? 'records' : 'سجل',
    
    // Period Status
    currentPeriod: language === 'en' ? 'Current Period' : 'الفترة الحالية',
    periodStatus: language === 'en' ? 'Status' : 'الحالة',
    lockDeadline: language === 'en' ? 'Lock Deadline' : 'موعد الإغلاق',
    statusOpen: language === 'en' ? 'Open' : 'مفتوح',
    statusLocked: language === 'en' ? 'Locked' : 'مغلق',
    
    // Actions
    viewCalendar: language === 'en' ? 'View Calendar' : 'عرض التقويم',
    viewRecords: language === 'en' ? 'View All Records' : 'عرض جميع السجلات',
    myAttendance: language === 'en' ? 'My Attendance' : 'حضوري',
    overtimeManagement: language === 'en' ? 'Overtime Management' : 'إدارة العمل الإضافي',
    printReports: language === 'en' ? 'Print Reports' : 'طباعة التقارير',
    periodManagement: language === 'en' ? 'Period Management' : 'إدارة الفترات',
    
    // Quick Stats
    quickStats: language === 'en' ? 'Quick Statistics' : 'إحصائيات سريعة',
    viewDetails: language === 'en' ? 'View Details' : 'عرض التفاصيل'
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <BackToModulesButton 
        targetPath="/organization/hr"
        parentModuleName={language === 'en' ? 'HR Modules' : 'وحدات الموارد البشرية'}
      />

      {/* Header */}
      <div>
        <h1 className={`text-2xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.title}
        </h1>
        <p className={`text-sm text-gray-600 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.subtitle}
        </p>
      </div>

      {/* Current Period Status Banner */}
      {currentPeriod && (
        <div className={`bg-gradient-to-r ${currentPeriod.status === 'locked' ? 'from-red-50 to-red-100 border-red-200' : 'from-blue-50 to-blue-100 border-blue-200'} border-2 rounded-lg p-4`}>
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {currentPeriod.status === 'locked' ? (
                <Lock className="w-6 h-6 text-red-600" />
              ) : (
                <Unlock className="w-6 h-6 text-blue-600" />
              )}
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-sm font-semibold text-gray-900">
                  {t.currentPeriod}: {currentPeriod.monthName} {currentPeriod.year}
                </p>
                <p className="text-xs text-gray-600">
                  {t.periodStatus}: {currentPeriod.status === 'locked' ? t.statusLocked : t.statusOpen}
                  {currentPeriod.status === 'open' && ` • ${t.lockDeadline}: ${currentPeriod.lockDeadline}`}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/organization/hr/attendance/periods')}
              className={`px-4 py-2 bg-white border-2 ${currentPeriod.status === 'locked' ? 'border-red-300' : 'border-blue-300'} rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors`}
            >
              {t.periodManagement}
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Staff */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="p-3 bg-gray-50 rounded-lg">
              <Users className="w-6 h-6 text-gray-600" />
            </div>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-sm text-gray-600 mb-1">{t.totalStaff}</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalStaff}</p>
          </div>
        </div>

        {/* Present Today */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="p-3 bg-green-50 rounded-lg">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-sm text-gray-600 mb-1">{t.presentToday}</p>
            <p className="text-3xl font-bold text-green-600">{stats.presentToday}</p>
          </div>
        </div>

        {/* Absent Today */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="p-3 bg-red-50 rounded-lg">
              <UserX className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-sm text-gray-600 mb-1">{t.absentToday}</p>
            <p className="text-3xl font-bold text-red-600">{stats.absentToday}</p>
          </div>
        </div>

        {/* Late Arrivals */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-sm text-gray-600 mb-1">{t.lateArrivals}</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.lateArrivals}</p>
          </div>
        </div>
      </div>

      {/* KPI Cards - Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Overtime Today */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Timer className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-sm text-gray-600 mb-1">{t.overtimeToday}</p>
            <p className="text-3xl font-bold text-purple-600">{stats.overtimeHoursToday.toFixed(1)}</p>
            <p className="text-xs text-gray-500 mt-1">{t.hours}</p>
          </div>
        </div>

        {/* Overtime This Month */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="p-3 bg-indigo-50 rounded-lg">
              <Timer className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-sm text-gray-600 mb-1">{t.overtimePeriod}</p>
            <p className="text-3xl font-bold text-indigo-600">{stats.overtimeHoursPeriod.toFixed(1)}</p>
            <p className="text-xs text-gray-500 mt-1">{t.hours}</p>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="p-3 bg-orange-50 rounded-lg">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-sm text-gray-600 mb-1">{t.pendingApprovals}</p>
            <p className="text-3xl font-bold text-orange-600">{stats.pendingApprovals}</p>
            <p className="text-xs text-gray-500 mt-1">{t.records}</p>
          </div>
        </div>

        {/* Flagged Records */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="p-3 bg-pink-50 rounded-lg">
              <AlertCircle className="w-6 h-6 text-pink-600" />
            </div>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-sm text-gray-600 mb-1">{t.flaggedRecords}</p>
            <p className="text-3xl font-bold text-pink-600">{stats.flaggedRecords}</p>
            <p className="text-xs text-gray-500 mt-1">{t.records}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* View Calendar */}
        <button
          onClick={() => navigate('/organization/hr/attendance/calendar')}
          className={`flex items-center gap-4 p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-lg transition-all ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <div className="p-3 bg-blue-50 rounded-lg">
            <Calendar className="w-6 h-6 text-blue-600" />
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="font-semibold text-gray-900">{t.viewCalendar}</p>
            <p className="text-xs text-gray-600">{language === 'en' ? 'Day / Week / Month views' : 'عرض اليوم / الأسبوع / الشهر'}</p>
          </div>
        </button>

        {/* View Records */}
        <button
          onClick={() => navigate('/organization/hr/attendance/records')}
          className={`flex items-center gap-4 p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-green-500 hover:shadow-lg transition-all ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <div className="p-3 bg-green-50 rounded-lg">
            <FileText className="w-6 h-6 text-green-600" />
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="font-semibold text-gray-900">{t.viewRecords}</p>
            <p className="text-xs text-gray-600">{language === 'en' ? 'Search, filter, export' : 'بحث، تصفية، تصدير'}</p>
          </div>
        </button>

        {/* My Attendance (Employee View) */}
        <button
          onClick={() => navigate('/organization/hr/attendance/my-attendance')}
          className={`flex items-center gap-4 p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:shadow-lg transition-all ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <div className="p-3 bg-purple-50 rounded-lg">
            <UserCheck className="w-6 h-6 text-purple-600" />
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="font-semibold text-gray-900">{t.myAttendance}</p>
            <p className="text-xs text-gray-600">{language === 'en' ? 'View & submit explanations' : 'عرض وتقديم التوضيحات'}</p>
          </div>
        </button>

        {/* Overtime Management */}
        <button
          onClick={() => navigate('/organization/hr/attendance/overtime')}
          className={`flex items-center gap-4 p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:shadow-lg transition-all ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <div className="p-3 bg-indigo-50 rounded-lg">
            <Timer className="w-6 h-6 text-indigo-600" />
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="font-semibold text-gray-900">{t.overtimeManagement}</p>
            <p className="text-xs text-gray-600">{language === 'en' ? 'Approve & track overtime' : 'الموافقة وتتبع العمل الإضافي'}</p>
          </div>
        </button>

        {/* Print Reports */}
        <button
          onClick={() => navigate('/organization/hr/attendance/reports')}
          className={`flex items-center gap-4 p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:shadow-lg transition-all ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <div className="p-3 bg-orange-50 rounded-lg">
            <Download className="w-6 h-6 text-orange-600" />
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="font-semibold text-gray-900">{t.printReports}</p>
            <p className="text-xs text-gray-600">{language === 'en' ? 'Monthly sheets & forms' : 'الأوراق والنماذج الشهرية'}</p>
          </div>
        </button>

        {/* Period Management */}
        <button
          onClick={() => navigate('/organization/hr/attendance/periods')}
          className={`flex items-center gap-4 p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-red-500 hover:shadow-lg transition-all ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <div className="p-3 bg-red-50 rounded-lg">
            <Lock className="w-6 h-6 text-red-600" />
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="font-semibold text-gray-900">{t.periodManagement}</p>
            <p className="text-xs text-gray-600">{language === 'en' ? 'Lock & unlock periods' : 'إغلاق وفتح الفترات'}</p>
          </div>
        </button>
      </div>
    </div>
  );
}