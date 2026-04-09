import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppShell from "./components/AppShell";
import Home from "./pages/Home";

// Platform Admin Pages
import PlatformDashboard from "./pages/PlatformDashboard";
import OrganizationsPage from "./pages/OrganizationsPage";
import OperatingUnitsPage from "./pages/OperatingUnitsPage";
import UserManagement from "./pages/UserManagement";
import SystemHealthPage from "./pages/SystemHealthPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import PlatformSettingsPage from "./pages/PlatformSettingsPage";
import PlatformAdminSettingsPage from "./pages/platform/PlatformAdminSettingsPage";
import PlatformUsersPage from "./pages/platform/settings/PlatformUsersPage";
import PlatformRolesPage from "./pages/platform/settings/PlatformRolesPage";
import GlobalSystemSettingsPage from "./pages/platform/settings/GlobalSystemSettingsPage";
import AuthenticationStatusPage from "./pages/platform/settings/AuthenticationStatusPage";
import OrganizationLifecyclePage from "./pages/platform/settings/OrganizationLifecyclePage";
import PlatformAuditLogsPage from "./pages/platform/settings/PlatformAuditLogsPage";
import OrganizationDetailPage from "./pages/OrganizationDetailPage";
import OperatingUnitDetailPage from "./pages/OperatingUnitDetailPage";

// Organization Pages
import OrganizationDashboard from "./pages/organization/OrganizationDashboard";
import ProjectManagementDashboard from "./pages/organization/projects/ProjectManagementDashboard";
import ProjectsCRUDPage from "./pages/organization/projects/ProjectsCRUDPage";
import ProjectDetailsPage from "./pages/organization/projects/ProjectDetailsPage";
import ActiveGrantsPage from '@/pages/organization/ActiveGrantsPage';
import ReportingSchedulePage from '@/pages/organization/ReportingSchedulePage';
import ProposalPipeline from '@/pages/organization/proposals/ProposalPipeline';
import AnnualProgramsReport from '@/pages/organization/AnnualProgramsReport';
import DonorCRMDashboard from '@/pages/organization/donor-crm/DonorCRMDashboard';
import Opportunities from '@/pages/organization/donor-crm/Opportunities';
import AdminDashboard from "./pages/AdminDashboard";
import OrganizationSettingsPage from "./pages/OrganizationSettingsPage";
import UserManagementSettings from "./pages/settings/UserManagementSettings";
import SettingsPlaceholder from "./pages/settings/SettingsPlaceholder";

// MEAL Module Pages
import { MEALLanding } from "./pages/meal/MEALLanding";
import { MEALDashboard } from "./pages/meal/MEALDashboard";
import { IndicatorsList } from "./pages/meal/IndicatorsList";
import { IndicatorsListPage } from "./pages/meal/IndicatorsListPage";
import { AddIndicator } from "./pages/meal/AddIndicator";
import { IndicatorDetails } from "./pages/meal/IndicatorDetails";
import { IndicatorDataEntryForm } from "./pages/meal/IndicatorDataEntry";
import { SurveyDashboard } from "./pages/meal/SurveyDashboard";
import { SurveyList } from "./pages/meal/SurveyList";
import { SurveyDetailView } from "./pages/meal/SurveyDetailView";
import { SurveyEditor } from "./pages/meal/SurveyEditor";
import { SurveyCreateForm } from "./pages/meal/SurveyCreateForm";
import { SurveySubmissions } from "./pages/meal/SurveySubmissions";
import { SurveySubmissionDetail } from "./pages/meal/SurveySubmissionDetail";
import { SurveyResponse } from "./pages/meal/SurveyResponse";
import { SurveyTemplates } from "./pages/meal/SurveyTemplates";
import { SurveyReports } from "./pages/meal/SurveyReports";
import { SurveyAnalyticsDashboard } from "./pages/meal/SurveyAnalyticsDashboard";
import { SurveyImportExport } from "./pages/meal/SurveyImportExport";
import { SurveyExport } from "./pages/meal/SurveyExport";
import { SurveyImportKobo } from "./pages/meal/SurveyImportKobo";
import { Accountability } from "./pages/meal/Accountability";
import { Documents as MEALDocuments } from "./pages/meal/Documents";
import { MEALReports } from "./pages/meal/MEALReports";
import { AuditTrail as MEALAuditTrail } from "./pages/meal/AuditTrail";
import { PIIMaskingConfig } from "./pages/meal/PIIMaskingConfig";
import { UserManagement as MEALUserManagement } from "./pages/meal/UserManagement";

// Finance Module Pages
import FinanceLanding from "./pages/finance/FinanceLanding";
import FinanceOverview from "./pages/finance/FinanceOverview";
import FinanceChartOfAccounts from "./pages/finance/FinanceChartOfAccounts";
import FinanceBudgets from "./pages/finance/FinanceBudgets";
import FinanceExpenditures from "./pages/finance/FinanceExpenditures";
import FinanceReports from "./pages/finance/FinanceReports";
import FinanceComingSoon from "./pages/finance/FinanceComingSoon";
import AdvancesSettlements from "./pages/finance/AdvancesSettlements";
import TreasuryCashManagement from "./pages/finance/TreasuryCashManagement";
import AssetsManagement from "./pages/finance/AssetsManagement";
import FinanceSettings from "./pages/finance/FinanceSettings";

// HR Module Pages
import { HRModuleLauncher } from "./pages/hr/HRModuleLauncher";
import { HRDashboard } from "./pages/hr/HRDashboard";
import { EmployeesDirectory } from "./pages/hr/EmployeesDirectory";
import { EmployeesProfiles } from "./pages/hr/EmployeesProfiles";
import { EmployeesProfilesLanding } from "./pages/hr/EmployeesProfilesLanding";
import { IndividualEmployeeProfile } from "./pages/hr/IndividualEmployeeProfile";
import { AddEmployeePage } from "./pages/hr/AddEmployeePage";
import { LeaveManagement } from "./pages/hr/LeaveManagement";
import { PayrollAllowances } from "./pages/hr/PayrollAllowances";
import { SalaryScale } from "./pages/hr/SalaryScale";
import { Recruitment } from "./pages/hr/Recruitment";
import { TrainingManagement } from "./pages/hr/TrainingManagement";
import { HRDocuments } from "./pages/hr/HRDocuments";
import { HRReports } from "./pages/hr/HRReports";
import { HRSettings } from "./pages/hr/HRSettings";
import { SanctionsDisciplinary } from "./pages/hr/SanctionsDisciplinary";
import { HRAnnualPlanModule } from "./pages/hr/HRAnnualPlanModule";
import { ReportsAnalytics as HRReportsAnalytics } from "./pages/hr/ReportsAnalytics";
import { AttendanceDashboard } from "./pages/hr/attendance/AttendanceDashboard";
import { AttendanceCalendar } from "./pages/hr/attendance/AttendanceCalendar";
import { AttendanceRecordsTable } from "./pages/hr/attendance/AttendanceRecordsTable";
import { MyAttendance } from "./pages/hr/attendance/MyAttendance";
import { OvertimeManagement } from "./pages/hr/attendance/OvertimeManagement";
import { AttendanceReports } from "./pages/hr/attendance/AttendanceReports";
import { PeriodManagement } from "./pages/hr/attendance/PeriodManagement";
import { StaffDictionary } from "./pages/hr/StaffDictionary";
import { ProfilesSummary } from "./pages/hr/ProfilesSummary";
import { NewHires } from "./pages/hr/NewHires";
import { ContractRenewals } from "./pages/hr/ContractRenewals";
import { ExitProcessing } from "./pages/hr/ExitProcessing";
import { ReferenceVerification } from "./pages/hr/ReferenceVerification";
import { ArchivedEmployees } from "./pages/hr/ArchivedEmployees";
import { ExitedStaff } from "./pages/hr/ExitedStaff";

// Logistics Module Pages
import LogisticsWorkspace from "./pages/logistics/LogisticsWorkspace";
import PurchaseRequestList from "./pages/logistics/PurchaseRequestList";
import PurchaseRequestForm from "./pages/logistics/PurchaseRequestForm";
import SupplierList from "./pages/logistics/SupplierList";
import SupplierForm from "./pages/logistics/SupplierForm";
import PurchaseOrderList from "./pages/logistics/PurchaseOrderList";
import GoodsReceiptList from "./pages/logistics/GoodsReceiptList";
import StockManagement from "./pages/logistics/StockManagement";
import FleetManagement from "./pages/logistics/FleetManagement";
import ProcurementTracker from "./pages/logistics/ProcurementTracker";
import PurchaseRequestPrint from "./pages/logistics/PurchaseRequestPrint";
import PurchaseOrderPrint from "./pages/logistics/PurchaseOrderPrint";
import GoodsReceiptPrint from "./pages/logistics/GoodsReceiptPrint";
import ProcurementWorkspace from "./pages/logistics/ProcurementWorkspace";

/**
 * Router Component
 * 
 * CRITICAL ARCHITECTURE:
 * - AppShell mounts ONCE and never remounts
 * - Only page content (children) changes on navigation
 * - Sidebar and Header stay mounted = instant navigation
 * - Auth checks happen at AppShell level, not per page
 * 
 * This ensures:
 * ✓ No white flashes
 * ✓ No loading spinners between pages
 * ✓ No context resets
 * ✓ Navigation < 300ms
 */
function Router() {
  return (
    <AppShell>
      <Switch>
        {/* Home Page (no layout) */}
        <Route path="/" component={Home} />
        
        {/* Platform Admin Routes */}
        <Route path="/platform" component={PlatformDashboard} />
        <Route path="/platform/organizations" component={OrganizationsPage} />
        <Route path="/platform/organizations/:shortCode/:ouSuffix" component={OperatingUnitDetailPage} />
        <Route path="/platform/organizations/:shortCode" component={OrganizationDetailPage} />
        <Route path="/platform/operating-units" component={OperatingUnitsPage} />
        <Route path="/platform/users" component={UserManagement} />
        <Route path="/platform/system-health" component={SystemHealthPage} />
        <Route path="/platform/audit-logs" component={AuditLogsPage} />
        <Route path="/platform/settings" component={PlatformAdminSettingsPage} />
        <Route path="/platform/settings/users" component={PlatformUsersPage} />
        <Route path="/platform/settings/roles" component={PlatformRolesPage} />
        <Route path="/platform/settings/global" component={GlobalSystemSettingsPage} />
        <Route path="/platform/settings/authentication" component={AuthenticationStatusPage} />
        <Route path="/platform/settings/lifecycle" component={OrganizationLifecyclePage} />
        <Route path="/platform/settings/audit" component={PlatformAuditLogsPage} />
        
        {/* Organization Routes */}
        <Route path="/organization" component={OrganizationDashboard} />
        <Route path="/organization/admin" component={AdminDashboard} />
        <Route path="/organization/projects" component={ProjectManagementDashboard} />
        <Route path="/organization/projects-list" component={ProjectsCRUDPage} />
        <Route path="/organization/projects/:id" component={ProjectDetailsPage} />
        <Route path="/organization/grants" component={ActiveGrantsPage} />
        <Route path="/organization/reporting" component={ReportingSchedulePage} />
        <Route path="/organization/reporting-schedule" component={ReportingSchedulePage} />
        <Route path="/organization/proposals" component={ProposalPipeline} />
        <Route path="/organization/donor-crm" component={DonorCRMDashboard} />
        <Route path="/organization/donor-crm/opportunities" component={Opportunities} />
        <Route path="/organization/annual-report" component={AnnualProgramsReport} />
        <Route path="/organization/settings" component={OrganizationSettingsPage} />
        <Route path="/organization/settings/users" component={UserManagementSettings} />
        <Route path="/organization/settings/roles">
          {() => <SettingsPlaceholder title="Roles & Permissions" description="Define what each role can access and edit" />}
        </Route>
        <Route path="/organization/settings/options">
          {() => <SettingsPlaceholder title="Option Sets / Lookups" description="Manage dropdown values used across the system" />}
        </Route>
        <Route path="/organization/settings/notifications">
          {() => <SettingsPlaceholder title="Email & Notifications" description="Control system notifications and templates" />}
        </Route>
        <Route path="/organization/settings/branding">
          {() => <SettingsPlaceholder title="Logo & Branding" description="Customize system branding and appearance" />}
        </Route>
        <Route path="/organization/settings/publish">
          {() => <SettingsPlaceholder title="System Publish & Sync" description="Control publishing and data synchronization" />}
        </Route>
        <Route path="/organization/settings/admin">
          {() => <SettingsPlaceholder title="Administrator Access" description="Advanced system controls and maintenance" />}
        </Route>
        
        {/* Organization MEAL Routes (accessible from sidebar) */}
        <Route path="/organization/meal" component={MEALLanding} />
        <Route path="/organization/meal/dashboard" component={MEALDashboard} />
        <Route path="/organization/meal/indicators" component={IndicatorsListPage} />
        <Route path="/organization/meal/indicators/list" component={IndicatorsList} />
        <Route path="/organization/meal/indicators/add" component={AddIndicator} />
        <Route path="/organization/meal/indicators/:id" component={IndicatorDetails} />
        <Route path="/organization/meal/indicators/:id/data-entry" component={IndicatorDataEntryForm} />
        <Route path="/organization/meal/survey" component={SurveyDashboard} />
        <Route path="/organization/meal/survey/list" component={SurveyList} />
        <Route path="/organization/meal/survey/create" component={SurveyCreateForm} />
        <Route path="/organization/meal/survey/templates" component={SurveyTemplates} />
        <Route path="/organization/meal/survey/import-export" component={SurveyImportExport} />
        <Route path="/organization/meal/survey/import-kobo" component={SurveyImportKobo} />
        <Route path="/organization/meal/survey/export" component={SurveyExport} />
        <Route path="/organization/meal/survey/reports" component={SurveyReports} />
        <Route path="/organization/meal/survey/analytics" component={SurveyAnalyticsDashboard} />
        <Route path="/organization/meal/survey/:id" component={SurveyDetailView} />
        <Route path="/organization/meal/survey/:id/edit" component={SurveyEditor} />
        <Route path="/organization/meal/survey/:id/submissions" component={SurveySubmissions} />
        <Route path="/organization/meal/survey/:id/submissions/:submissionId" component={SurveySubmissionDetail} />
        <Route path="/organization/meal/survey/:id/respond" component={SurveyResponse} />
        <Route path="/organization/meal/accountability" component={Accountability} />
        <Route path="/organization/meal/documents" component={MEALDocuments} />
        <Route path="/organization/meal/reports" component={MEALReports} />
        <Route path="/organization/meal/audit-trail" component={MEALAuditTrail} />
        <Route path="/organization/meal/pii-masking" component={PIIMaskingConfig} />
        <Route path="/organization/meal/users" component={MEALUserManagement} />
        
        {/* MEAL Module Routes (standalone) */}
        <Route path="/meal" component={MEALLanding} />
        <Route path="/meal/dashboard" component={MEALDashboard} />
        <Route path="/meal/indicators" component={IndicatorsListPage} />
        <Route path="/meal/indicators/list" component={IndicatorsList} />
        <Route path="/meal/indicators/add" component={AddIndicator} />
        <Route path="/meal/indicators/:id" component={IndicatorDetails} />
        <Route path="/meal/indicators/:id/data-entry" component={IndicatorDataEntryForm} />
        <Route path="/meal/survey" component={SurveyDashboard} />
        <Route path="/meal/survey/list" component={SurveyList} />
        <Route path="/meal/survey/create" component={SurveyCreateForm} />
        <Route path="/meal/survey/templates" component={SurveyTemplates} />
        <Route path="/meal/survey/import-export" component={SurveyImportExport} />
        <Route path="/meal/survey/import-kobo" component={SurveyImportKobo} />
        <Route path="/meal/survey/export" component={SurveyExport} />
        <Route path="/meal/survey/reports" component={SurveyReports} />
        <Route path="/meal/survey/analytics" component={SurveyAnalyticsDashboard} />
        <Route path="/meal/survey/:id" component={SurveyDetailView} />
        <Route path="/meal/survey/:id/edit" component={SurveyEditor} />
        <Route path="/meal/survey/:id/submissions" component={SurveySubmissions} />
        <Route path="/meal/survey/:id/submissions/:submissionId" component={SurveySubmissionDetail} />
        <Route path="/meal/survey/:id/respond" component={SurveyResponse} />
        <Route path="/meal/accountability" component={Accountability} />
        <Route path="/meal/documents" component={MEALDocuments} />
        <Route path="/meal/reports" component={MEALReports} />
        <Route path="/meal/audit-trail" component={MEALAuditTrail} />
        <Route path="/meal/pii-masking" component={PIIMaskingConfig} />
        <Route path="/meal/users" component={MEALUserManagement} />
        
        {/* Organization Finance Routes */}
        <Route path="/organization/finance" component={FinanceLanding} />
        <Route path="/organization/finance/overview" component={FinanceOverview} />
        <Route path="/organization/finance/chart-of-accounts" component={FinanceChartOfAccounts} />
        <Route path="/organization/finance/budgets" component={FinanceBudgets} />
        <Route path="/organization/finance/expenditures" component={FinanceExpenditures} />
        <Route path="/organization/finance/reports" component={FinanceReports} />
        <Route path="/organization/finance/advances" component={AdvancesSettlements} />
        <Route path="/organization/finance/assets" component={AssetsManagement} />
        <Route path="/organization/finance/treasury" component={TreasuryCashManagement} />
        <Route path="/organization/finance/settings" component={FinanceSettings} />
        
        {/* Organization HR Routes (accessible from sidebar) */}
        <Route path="/organization/hr" component={HRModuleLauncher} />
        <Route path="/organization/hr/overview" component={HRDashboard} />
        <Route path="/organization/hr/dashboard" component={HRDashboard} />
        <Route path="/organization/hr/employees" component={EmployeesDirectory} />
        <Route path="/organization/hr/employees/profiles" component={EmployeesProfilesLanding} />
        <Route path="/organization/hr/employees/profiles/:id" component={IndividualEmployeeProfile} />
        <Route path="/organization/hr/employees/add" component={AddEmployeePage} />
        <Route path="/organization/hr/employees-profiles" component={EmployeesProfilesLanding} />
        <Route path="/organization/hr/employees-profiles/directory" component={EmployeesDirectory} />
        <Route path="/organization/hr/employees-profiles/training-management" component={TrainingManagement} />
        <Route path="/organization/hr/employees-profiles/training" component={TrainingManagement} />
        <Route path="/organization/hr/employees-profiles/view/:id" component={IndividualEmployeeProfile} />
        <Route path="/organization/hr/employees-profiles/summary" component={ProfilesSummary} />
        <Route path="/organization/hr/employees-profiles/new-hires" component={NewHires} />
        <Route path="/organization/hr/employees-profiles/contract-renewals" component={ContractRenewals} />
        <Route path="/organization/hr/employees-profiles/exit-processing" component={ExitProcessing} />
        <Route path="/organization/hr/employees-profiles/reference" component={ReferenceVerification} />
        <Route path="/organization/hr/employees-profiles/archived" component={ArchivedEmployees} />
        <Route path="/organization/hr/employees-profiles/exited" component={ExitedStaff} />
        <Route path="/organization/hr/employees-profiles/:id" component={IndividualEmployeeProfile} />
        <Route path="/organization/hr/leave" component={LeaveManagement} />
        <Route path="/organization/hr/payroll" component={PayrollAllowances} />
        <Route path="/organization/hr/salary-scale" component={SalaryScale} />
        <Route path="/organization/hr/recruitment" component={Recruitment} />
        <Route path="/organization/hr/recruitment/*" component={Recruitment} />
        <Route path="/organization/hr/training" component={TrainingManagement} />
        <Route path="/organization/hr/documents" component={HRDocuments} />
        <Route path="/organization/hr/reports" component={HRReports} />
        <Route path="/organization/hr/reports-analytics" component={HRReportsAnalytics} />
        <Route path="/organization/hr/settings" component={HRSettings} />
        <Route path="/organization/hr/sanctions" component={SanctionsDisciplinary} />
        <Route path="/organization/hr/sanctions/*" component={SanctionsDisciplinary} />
        <Route path="/organization/hr/annual-plan" component={HRAnnualPlanModule} />
        <Route path="/organization/hr/annual-plan/*" component={HRAnnualPlanModule} />
        <Route path="/organization/hr/attendance" component={AttendanceDashboard} />
        <Route path="/organization/hr/attendance/calendar" component={AttendanceCalendar} />
        <Route path="/organization/hr/attendance/records" component={AttendanceRecordsTable} />
        <Route path="/organization/hr/attendance/my-attendance" component={MyAttendance} />
        <Route path="/organization/hr/attendance/overtime" component={OvertimeManagement} />
        <Route path="/organization/hr/attendance/reports" component={AttendanceReports} />
        <Route path="/organization/hr/attendance/periods" component={PeriodManagement} />
        <Route path="/organization/hr/staff-dictionary" component={StaffDictionary} />
        
        {/* Logistics Module Routes */}
        <Route path="/logistics" component={LogisticsWorkspace} />
        <Route path="/logistics/purchase-requests" component={PurchaseRequestList} />
        <Route path="/logistics/purchase-requests/new" component={PurchaseRequestForm} />
        <Route path="/logistics/purchase-requests/:id" component={PurchaseRequestForm} />
        <Route path="/logistics/purchase-requests/:id/edit" component={PurchaseRequestForm} />
        <Route path="/logistics/suppliers" component={SupplierList} />
        <Route path="/logistics/suppliers/new" component={SupplierForm} />
        <Route path="/logistics/suppliers/:id" component={SupplierForm} />
        <Route path="/logistics/suppliers/:id/edit" component={SupplierForm} />
        <Route path="/logistics/purchase-orders" component={PurchaseOrderList} />
        <Route path="/logistics/grn" component={GoodsReceiptList} />
        <Route path="/logistics/stock" component={StockManagement} />
        <Route path="/logistics/fleet" component={FleetManagement} />
        <Route path="/logistics/tracker" component={ProcurementTracker} />
        <Route path="/logistics/purchase-requests/:id/workspace" component={ProcurementWorkspace} />
        <Route path="/logistics/purchase-requests/:id/print" component={PurchaseRequestPrint} />
        <Route path="/logistics/purchase-orders/:id/print" component={PurchaseOrderPrint} />
        <Route path="/logistics/grn/:id/print" component={GoodsReceiptPrint} />
        
        {/* Organization Logistics Routes */}
        <Route path="/organization/logistics" component={LogisticsWorkspace} />
        <Route path="/organization/logistics/purchase-requests" component={PurchaseRequestList} />
        <Route path="/organization/logistics/purchase-requests/new" component={PurchaseRequestForm} />
        <Route path="/organization/logistics/purchase-requests/:id" component={PurchaseRequestForm} />
        <Route path="/organization/logistics/purchase-requests/:id/edit" component={PurchaseRequestForm} />
        <Route path="/organization/logistics/suppliers" component={SupplierList} />
        <Route path="/organization/logistics/suppliers/new" component={SupplierForm} />
        <Route path="/organization/logistics/suppliers/:id" component={SupplierForm} />
        <Route path="/organization/logistics/suppliers/:id/edit" component={SupplierForm} />
        <Route path="/organization/logistics/purchase-orders" component={PurchaseOrderList} />
        <Route path="/organization/logistics/grn" component={GoodsReceiptList} />
        <Route path="/organization/logistics/stock" component={StockManagement} />
        <Route path="/organization/logistics/fleet" component={FleetManagement} />
        <Route path="/organization/logistics/tracker" component={ProcurementTracker} />
        
        {/* 404 Page */}
        <Route path="/404" component={NotFound} />
        
        {/* Fallback */}
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
