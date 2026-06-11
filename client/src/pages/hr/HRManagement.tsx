/**
 * ============================================================================
 * HR MANAGEMENT MODULE - MODULE LAUNCHER VIEW
 * ============================================================================
 * 
 * ✅ NEW DESIGN: Interactive Module Cards Grid (No More Horizontal Scrolling)
 * 
 * PURPOSE: Human resources management system
 * 
 * NAVIGATION IMPROVEMENT:
 * - Replaced horizontal scrolling tabs with card-based module launcher
 * - Clear visibility of all HR modules (implemented + coming soon)
 * - Status badges for module maturity
 * - Scalable design (supports 10+ modules)
 * - Better UX for non-technical HR staff
 * 
 * CORE PRINCIPLES:
 * - Staff is the primary entity
 * - One staff → multiple projects allowed
 * - Payroll aligned with Finance module
 * - Monthly payroll mandatory & printable
 * - All HR actions are traceable
 * - Full bilingual support (EN/AR with RTL/LTR)
 * - Excel import/export everywhere
 * 
 * ============================================================================
 */

import { Routes, Route } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { HRModuleLauncher } from './HRModuleLauncher';
import { HRDashboard } from './HRDashboard';
import { StaffDictionary } from './StaffDictionary';
import { SalaryScale } from './SalaryScale';
import { EmployeesProfiles } from './EmployeesProfiles';
import { EmployeesDirectory } from './EmployeesDirectory';
import { FilteredEmployeesList } from './FilteredEmployeesList';
import { ProfilesSummary } from './ProfilesSummary';
import { EmployeeCard } from './EmployeeCard';
import { LeaveManagement } from './LeaveManagement';
import { PayrollAllowances } from './PayrollAllowances';
import { TrainingManagement } from './TrainingManagement';
import { SanctionsDisciplinary } from './SanctionsDisciplinary';
import { Recruitment } from './Recruitment';
import { HRDocuments } from './HRDocuments';
import { ReportsAnalytics } from './ReportsAnalytics';
import { HRSettings } from './HRSettings';
import { HRAnnualPlanModule } from './HRAnnualPlanModule';
import { AttendanceDashboard } from './attendance/AttendanceDashboard';
import { AttendanceRecordsTable } from './attendance/AttendanceRecordsTable';
import { MyAttendance } from './attendance/MyAttendance';
import { PeriodManagement } from './attendance/PeriodManagement';
import { AttendanceCalendar } from './attendance/AttendanceCalendar';
import { OvertimeManagement } from './attendance/OvertimeManagement';
import { AttendanceReports } from './attendance/AttendanceReports';
import { useTranslation } from '@/i18n/useTranslation';

export function HRManagement() {
  const { language, isRTL } = useLanguage();
    const { t } = useTranslation();
 
 return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
    <Routes>
 {/* Default: Module Launcher */}
 <Route index element={<HRModuleLauncher />} />
 
 {/* Individual Module Routes */}
 <Route path="overview" element={<HRDashboard />} />
 <Route path="staff-dictionary" element={<StaffDictionary />} />
 <Route path="salary-scale" element={<SalaryScale />} />
 <Route path="payroll" element={<PayrollAllowances />} />
 <Route path="sanctions/*" element={<SanctionsDisciplinary />} />
 <Route path="annual-plan/*" element={<HRAnnualPlanModule />} />
 
 {/* Employees Profiles - Nested Routes */}
 <Route path="employees-profiles">
 <Route index element={<EmployeesProfiles />} />
 <Route path="directory" element={<EmployeesDirectory />} />
 <Route path="training-management" element={<TrainingManagement />} />
 <Route 
 path="archived" 
 element={
 <FilteredEmployeesList 
 filter="archived"
 title={{ en: 'Archived Employees', ar: 'الموظفون المؤرشفون' }}
 subtitle={{ en: 'Inactive staff (historical records)', ar: 'الموظفون غير النشطين (سجلات تاريخية)' }}
 backPath="/organization/hr/employees-profiles"
 />
 } 
 />
 <Route 
 path="exited" 
 element={
 <FilteredEmployeesList 
 filter="exited"
 title={{ en: 'Exited Staff', ar: 'الموظفون المغادرون' }}
 subtitle={{ en: 'Completed exit process (read-only profiles)', ar: 'أكملوا عملية الخروج (ملفات للقراءة فقط)' }}
 backPath="/organization/hr/employees-profiles"
 />
 } 
 />
 <Route 
 path="new-hires" 
 element={
 <FilteredEmployeesList 
 filter="new-hires"
 title={{ en: 'New Hires', ar: 'التعيينات الجديدة' }}
 subtitle={{ en: 'Recently hired staff (last 90 days)', ar: 'الموظفون المعينون حديثاً (آخر 90 يوماً)' }}
 backPath="/organization/hr/employees-profiles"
 showAddButton={true}
 />
 } 
 />
 <Route 
 path="renewals" 
 element={
 <FilteredEmployeesList 
 filter="renewals"
 title={{ en: 'Contract Renewals', ar: 'تجديدات العقود' }}
 subtitle={{ en: 'Contracts expiring within 60 days', ar: 'عقود تنتهي خلال 60 يوماً' }}
 backPath="/organization/hr/employees-profiles"
 />
 } 
 />
 <Route 
 path="exit-processing" 
 element={
 <FilteredEmployeesList 
 filter="exit-processing"
 title={{ en: 'Exit Processing', ar: 'معالجة الخروج' }}
 subtitle={{ en: 'Staff in offboarding process', ar: 'موظفون في عملية الخروج' }}
 backPath="/organization/hr/employees-profiles"
 />
 } 
 />
 <Route 
 path="reference" 
 element={
 <FilteredEmployeesList 
 filter="reference"
 title={{ en: 'Reference & Verification', ar: 'المراجع والتحقق' }}
 subtitle={{ en: 'Generate employment references for exited staff', ar: 'إنشاء مراجع التوظيف للموظفين المغادرين' }}
 backPath="/organization/hr/employees-profiles"
 />
 } 
 />
 <Route path="summary" element={<ProfilesSummary />} />
 <Route path="view/:id" element={<EmployeeCard />} />
 </Route>
 
 <Route path="leave" element={<LeaveManagement />} />
 <Route path="recruitment" element={<Recruitment language={language} isRTL={isRTL} />} />
 <Route path="documents" element={<HRDocuments />} />
 <Route path="reports" element={<ReportsAnalytics />} />
 <Route path="settings" element={<HRSettings />} />
 
 {/* Attendance Module Routes */}
 <Route path="attendance">
 <Route index element={<AttendanceDashboard />} />
 <Route path="records" element={<AttendanceRecordsTable />} />
 <Route path="my-attendance" element={<MyAttendance />} />
 <Route path="periods" element={<PeriodManagement />} />
 <Route path="calendar" element={<AttendanceCalendar />} />
 <Route path="overtime" element={<OvertimeManagement />} />
 <Route path="reports" element={<AttendanceReports />} />
 </Route>
 
 {/* Fallback for unknown HR routes */}
 <Route path="*" element={<HRModuleLauncher />} />
 </Routes>
 </div>
 );
}