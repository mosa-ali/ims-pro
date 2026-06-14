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
 * - Full trilingual support (EN/AR/IT with RTL/LTR)
 * - Excel import/export everywhere
 * 
 * ============================================================================
 */

import { Route, Switch } from 'wouter';
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
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';

export function HRManagement() {
  const { language, isRTL } = useLanguage();
  const { t } = useTranslation();
  const { currentOrganization } = useOrganization();
  const { currentOperatingUnit } = useOrganization();
  const organizationId = currentOrganization?.id || 0;
  const operatingUnitId = currentOperatingUnit?.id;
  
  // ========== HELPER FUNCTION TO GET TEXT BY LANGUAGE ==========
  const getText = (en: string, ar: string, it: string): string => {
    switch (language) {
      case "ar":
        return ar;
      case "it":
        return it;
      case "en":
      default:
        return en;
    }
  };
 
  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <Switch>
        {/* Default: Module Launcher */}
        <Route path="/" component={HRModuleLauncher} />
        
        {/* Individual Module Routes */}
        <Route path="/overview" component={HRDashboard} />
        <Route path="/staff-dictionary" component={StaffDictionary} />
        <Route path="/salary-scale" component={SalaryScale} />
        <Route path="/payroll" component={PayrollAllowances} />
        <Route path="/sanctions/:rest*" component={SanctionsDisciplinary} />
        <Route path="/annual-plan/:rest*" component={HRAnnualPlanModule} />
        
        {/* Employees Profiles - Nested Routes */}
        <Route path="/employees-profiles" component={EmployeesProfiles} />
        <Route path="/employees-profiles/directory" component={EmployeesDirectory} />
        <Route path="/employees-profiles/training-management" component={TrainingManagement} />
        
        {/* Archived Employees */}
        <Route path="/employees-profiles/archived">
          {() => (
            <FilteredEmployeesList 
              filter="archived"
              title={{
                en: 'Archived Employees',
                ar: 'الموظفون المؤرشفون',
                it: 'Dipendenti Archiviati'
              }}
              subtitle={{
                en: 'Inactive staff (historical records)',
                ar: 'الموظفون غير النشطين (سجلات تاريخية)',
                it: 'Personale inattivo (record storici)'
              }}
              backPath="/organization/hr/employees-profiles"
            />
          )}
        </Route>

        {/* Exited Staff */}
        <Route path="/employees-profiles/exited">
          {() => (
            <FilteredEmployeesList 
              filter="exited"
              title={{
                en: 'Exited Staff',
                ar: 'الموظفون المغادرون',
                it: 'Personale Uscito'
              }}
              subtitle={{
                en: 'Completed exit process (read-only profiles)',
                ar: 'أكملوا عملية الخروج (ملفات للقراءة فقط)',
                it: 'Processo di uscita completato (profili di sola lettura)'
              }}
              backPath="/organization/hr/employees-profiles"
            />
          )}
        </Route>

        {/* New Hires */}
        <Route path="/employees-profiles/new-hires">
          {() => (
            <FilteredEmployeesList 
              filter="new-hires"
              title={{
                en: 'New Hires',
                ar: 'التعيينات الجديدة',
                it: 'Nuove Assunzioni'
              }}
              subtitle={{
                en: 'Recently hired staff (last 90 days)',
                ar: 'الموظفون المعينون حديثاً (آخر 90 يوماً)',
                it: 'Personale assunto di recente (ultimi 90 giorni)'
              }}
              backPath="/organization/hr/employees-profiles"
              showAddButton={true}
            />
          )}
        </Route>

        {/* Contract Renewals */}
        <Route path="/employees-profiles/renewals">
          {() => (
            <FilteredEmployeesList 
              filter="renewals"
              title={{
                en: 'Contract Renewals',
                ar: 'تجديدات العقود',
                it: 'Rinnovi di Contratto'
              }}
              subtitle={{
                en: 'Contracts expiring within 60 days',
                ar: 'عقود تنتهي خلال 60 يوماً',
                it: 'Contratti in scadenza entro 60 giorni'
              }}
              backPath="/organization/hr/employees-profiles"
            />
          )}
        </Route>

        {/* Exit Processing */}
        <Route path="/employees-profiles/exit-processing">
          {() => (
            <FilteredEmployeesList 
              filter="exit-processing"
              title={{
                en: 'Exit Processing',
                ar: 'معالجة الخروج',
                it: 'Elaborazione dell\'Uscita'
              }}
              subtitle={{
                en: 'Staff in offboarding process',
                ar: 'موظفون في عملية الخروج',
                it: 'Personale in processo di offboarding'
              }}
              backPath="/organization/hr/employees-profiles"
            />
          )}
        </Route>

        {/* Reference & Verification */}
        <Route path="/employees-profiles/reference">
          {() => (
            <FilteredEmployeesList 
              filter="reference"
              title={{
                en: 'Reference & Verification',
                ar: 'المراجع والتحقق',
                it: 'Riferimento e Verifica'
              }}
              subtitle={{
                en: 'Generate employment references for exited staff',
                ar: 'إنشاء مراجع التوظيف للموظفين المغادرين',
                it: 'Genera riferimenti di lavoro per il personale uscito'
              }}
              backPath="/organization/hr/employees-profiles"
            />
          )}
        </Route>

        <Route path="/employees-profiles/summary" component={ProfilesSummary} />
        <Route path="/employees-profiles/view/:id" component={EmployeeCard} />
        
        <Route path="/leave" component={LeaveManagement} />
        <Route path="/recruitment">
          {() => <Route path="/recruitment" component={Recruitment} />}
        </Route>
        <Route path="/reports" component={ReportsAnalytics} />
        <Route path="/settings" component={HRSettings} />
        
        {/* Attendance Module Routes */}
        <Route path="/attendance" component={AttendanceDashboard} />
        <Route path="/attendance/records" component={AttendanceRecordsTable} />
        <Route path="/attendance/my-attendance" component={MyAttendance} />
        <Route path="/attendance/periods" component={PeriodManagement} />
        <Route path="/attendance/calendar" component={AttendanceCalendar} />
        <Route path="/attendance/overtime" component={OvertimeManagement} />
        <Route path="/attendance/reports" component={AttendanceReports} />
        
        {/* Fallback for unknown HR routes */}
        <Route path="/:rest*" component={HRModuleLauncher} />
      </Switch>
    </div>
  );
}
