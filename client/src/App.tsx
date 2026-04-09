import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
// Direction is handled centrally by LanguageContext (sets html[dir]) + index.css
// DirectionProvider and direction.css removed per FINAL LOCKED GUIDELINE
import AppShell from "./components/AppShell";
import { Loader2 } from "lucide-react";

// ============================================================================
// LAZY LOADING - All page components are loaded on demand
// This reduces initial bundle from ~240K lines to just the shell + current page
// ============================================================================

// Home & NotFound (kept eager since they're small and frequently accessed)
import Home from "./pages/Home";
import NotFound from "@/pages/NotFound";
import Login from "./pages/auth/Login";
import RequestAccessPage from "./pages/RequestAccess";

// --- Public Pages ---
const VerifySignature = lazy(() => import("./pages/VerifySignature"));
// --- Platform Admin Pages ---
const PlatformDashboard = lazy(() => import("./pages/PlatformDashboard"));
const OrganizationsPage = lazy(() => import("./pages/OrganizationsPage"));
const OperatingUnitsPage = lazy(() => import("./pages/OperatingUnitsPage"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const SystemHealthPage = lazy(() => import("./pages/SystemHealthPage"));
const InfrastructurePage = lazy(() => import("./pages/platform/system-health/InfrastructurePage"));
const RegressionPage = lazy(() => import("./pages/platform/system-health/RegressionPage"));
const AuditLogsPage = lazy(() => import("./pages/AuditLogsPage"));
const PlatformSettingsPage = lazy(() => import("./pages/PlatformSettingsPage"));
const PlatformAdminSettingsPage = lazy(() => import("./pages/platform/PlatformAdminSettingsPage"));
const PlatformUsersPage = lazy(() => import("./pages/platform/settings/PlatformUsersPage"));
const PlatformRolesPage = lazy(() => import("./pages/platform/settings/PlatformRolesPage"));
const GlobalSystemSettingsPage = lazy(() => import("./pages/platform/settings/GlobalSystemSettingsPage"));
const AuthenticationStatusPage = lazy(() => import("./pages/platform/settings/AuthenticationStatusPage"));
const OrganizationLifecyclePage = lazy(() => import("./pages/platform/settings/OrganizationLifecyclePage"));
const PlatformAuditLogsPage = lazy(() => import("./pages/platform/settings/PlatformAuditLogsPage"));
const EmailTemplateManagement = lazy(() => import("./pages/platform/EmailTemplateManagement"));
const ConnectMicrosoft365Page = lazy(() => import("./pages/organizations/ConnectMicrosoft365Page"));
const PlatformDeletedRecords = lazy(() => import("./pages/platform/PlatformDeletedRecords"));
const RetentionPolicyPage = lazy(() => import("./pages/platform/settings/RetentionPolicyPage"));
const PlatformEmailSettingsPage = lazy(() => import("./pages/platform/settings/PlatformEmailSettingsPage"));
const DeletedRecordsDashboard = lazy(() => import("./pages/platform/DeletedRecordsDashboard"));
const AuditLogViewerPage = lazy(() => import("./pages/platform/AuditLogViewerPage"));
const AccessRequestsPage = lazy(() => import("./pages/platform/AccessRequestsPage"));
const EmailManagementPage = lazy(() => import("./pages/platform/EmailManagement"));
const PerformanceDashboard = lazy(() => import("./pages/platform/PerformanceDashboard"));
const PasswordResetPage = lazy(() => import("./pages/PasswordResetPage"));
const OrganizationDetailPage = lazy(() => import("./pages/OrganizationDetailPage"));
const OperatingUnitDetailPage = lazy(() => import("./pages/OperatingUnitDetailPage"));
// --- Organization Pages ---
const OrganizationDashboard = lazy(() => import("./pages/organization/OrganizationDashboard"));
const ProjectManagementDashboard = lazy(() => import("./pages/organization/projects/ProjectManagementDashboard"));
const ProjectsCRUDPage = lazy(() => import("./pages/organization/projects/ProjectsCRUDPage"));
const ProjectDetailsPage = lazy(() => import("./pages/organization/projects/ProjectDetailsPage"));
const ActiveGrantsPage = lazy(() => import("@/pages/organization/ActiveGrantsPage"));
const ReportingSchedulePage = lazy(() => import("@/pages/organization/ReportingSchedulePage"));
const ProposalPipeline = lazy(() => import("@/pages/organization/proposals/ProposalPipeline"));
const AnnualProgramsReport = lazy(() => import("@/pages/organization/AnnualProgramsReport"));
const DonorCRMDashboard = lazy(() => import("@/pages/organization/donor-crm/DonorCRMDashboard"));
const Opportunities = lazy(() => import("@/pages/organization/donor-crm/Opportunities"));
const DonorRegistry = lazy(() => import("@/pages/organization/donor-crm/DonorRegistry"));
const DonorCommunications = lazy(() => import("@/pages/organization/donor-crm/DonorCommunications"));
const DonorReports = lazy(() => import("@/pages/organization/donor-crm/DonorReports"));
const FundingOpportunities = lazy(() => import("@/pages/organization/proposals/FundingOpportunities"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
// --- Organization Settings Pages ---
const SettingsDashboard = lazy(() => import("./pages/settings/SettingsDashboard"));
const SettingsUserManagement = lazy(() => import("./pages/settings/UserManagement"));
const SettingsRolesPermissions = lazy(() => import("./pages/settings/RolesPermissions"));
const SettingsOptionSets = lazy(() => import("./pages/settings/OptionSets"));
const SettingsLogoBranding = lazy(() => import("./pages/settings/LogoBranding"));
const SettingsEmailNotifications = lazy(() => import("./pages/settings/EmailNotifications"));
const SettingsPublishSync = lazy(() => import("./pages/settings/PublishSync"));
const SettingsAdminAccess = lazy(() => import("./pages/settings/AdminAccess"));
const SettingsDeletedRecords = lazy(() => import("./pages/settings/DeletedRecords"));
const OrgDeletedRecords = lazy(() => import("./pages/organization/settings/OrgDeletedRecords"));
const SettingsLandingSettings = lazy(() => import("./pages/settings/LandingSettings"));
const SettingsLanguageSettings = lazy(() => import("./pages/settings/LanguageSettings"));
const SettingsImportHistory = lazy(() => import("./pages/settings/ImportHistory"));
const SettingsImportHistoryDetails = lazy(() => import("./pages/settings/ImportHistoryDetails"));
const SettingsSystemHealth = lazy(() => import("./pages/settings/SystemHealthPanel"));
const UnitTypeManagement = lazy(() => import("./pages/settings/UnitTypeManagement"));
const CentralDocumentsFinal = lazy(() => import("./app/pages/CentralDocumentsFinal"));



// --- MEAL Module Pages (named exports need wrapper) ---
const MEALModule = lazy(() => import("./pages/meal/MEALModule").then(m => ({ default: m.MEALModule })));
const MEALDashboardMain = lazy(() => import("./pages/meal/MEALDashboardMain").then(m => ({ default: m.MEALDashboardMain })));
const MEALDashboard = lazy(() => import("./pages/meal/MEALDashboard").then(m => ({ default: m.MEALDashboard })));
const IndicatorsList = lazy(() => import("./pages/meal/IndicatorsList").then(m => ({ default: m.IndicatorsList })));
const IndicatorsListPage = lazy(() => import("./pages/meal/IndicatorsListPage").then(m => ({ default: m.IndicatorsListPage })));
const AddIndicator = lazy(() => import("./pages/meal/AddIndicator").then(m => ({ default: m.AddIndicator })));
const IndicatorDetails = lazy(() => import("./pages/meal/IndicatorDetails").then(m => ({ default: m.IndicatorDetails })));
const IndicatorDataEntryForm = lazy(() => import("./pages/meal/IndicatorDataEntry").then(m => ({ default: m.IndicatorDataEntryForm })));
const IndicatorCharts = lazy(() => import("./pages/meal/IndicatorCharts").then(m => ({ default: m.IndicatorCharts })));
const IndicatorChartsPage = lazy(() => import("./pages/meal/IndicatorCharts").then(m => ({ default: m.IndicatorChartsPage })));
const IndicatorExport = lazy(() => import("./pages/meal/IndicatorExport").then(m => ({ default: m.IndicatorExport })));
const IndicatorExportPage = lazy(() => import("./pages/meal/IndicatorExport").then(m => ({ default: m.IndicatorExportPage })));
const DataEntry = lazy(() => import("./pages/meal/DataEntry").then(m => ({ default: m.DataEntry })));
const SurveyDashboard = lazy(() => import("./pages/meal/SurveyDashboard").then(m => ({ default: m.SurveyDashboard })));
const SurveyList = lazy(() => import("./pages/meal/SurveyList").then(m => ({ default: m.SurveyList })));
const SurveyDetailView = lazy(() => import("./pages/meal/SurveyDetailView").then(m => ({ default: m.SurveyDetailView })));
const SurveyEditor = lazy(() => import("./pages/meal/SurveyEditor").then(m => ({ default: m.SurveyEditor })));
const SurveyCreateForm = lazy(() => import("./pages/meal/SurveyCreateForm").then(m => ({ default: m.SurveyCreateForm })));
const SurveyForms = lazy(() => import("./pages/meal/SurveyForms").then(m => ({ default: m.SurveyForms })));
const SurveyFormPreview = lazy(() => import("./pages/meal/SurveyFormPreview").then(m => ({ default: m.SurveyFormPreview })));
const SurveySettings = lazy(() => import("./pages/meal/SurveySettings").then(m => ({ default: m.SurveySettings })));
const SurveySubmissions = lazy(() => import("./pages/meal/SurveySubmissions").then(m => ({ default: m.SurveySubmissions })));
const SurveySubmissionDetail = lazy(() => import("./pages/meal/SurveySubmissionDetail").then(m => ({ default: m.SurveySubmissionDetail })));
const SurveyResponse = lazy(() => import("./pages/meal/SurveyResponse").then(m => ({ default: m.SurveyResponse })));
const SurveyTemplates = lazy(() => import("./pages/meal/SurveyTemplates").then(m => ({ default: m.SurveyTemplates })));
const SurveyReports = lazy(() => import("./pages/meal/SurveyReports").then(m => ({ default: m.SurveyReports })));
const SurveyAnalyticsDashboard = lazy(() => import("./pages/meal/SurveyAnalyticsDashboard").then(m => ({ default: m.SurveyAnalyticsDashboard })));
const SurveyImportExport = lazy(() => import("./pages/meal/SurveyImportExport").then(m => ({ default: m.SurveyImportExport })));
const DataVerification = lazy(() => import("./pages/meal/DataVerification").then(m => ({ default: m.DataVerification })));
const BulkIndicatorDataImport = lazy(() => import("./pages/meal/BulkIndicatorDataImport").then(m => ({ default: m.BulkIndicatorDataImport })));
const SurveyExport = lazy(() => import("./pages/meal/SurveyExport").then(m => ({ default: m.SurveyExport })));
const SurveyImportKobo = lazy(() => import("./pages/meal/SurveyImportKobo").then(m => ({ default: m.SurveyImportKobo })));
const Accountability = lazy(() => import("./pages/meal/Accountability").then(m => ({ default: m.Accountability })));
const MEALDocuments = lazy(() => import("./pages/meal/Documents").then(m => ({ default: m.Documents })));
const DocumentsManual = lazy(() => import("./pages/meal/DocumentsManual").then(m => ({ default: m.DocumentsManual })));
const MEALReports = lazy(() => import("./pages/meal/MEALReports").then(m => ({ default: m.MEALReports })));
const MEALAuditTrail = lazy(() => import("./pages/meal/AuditTrail").then(m => ({ default: m.AuditTrail })));
const PIIMaskingConfig = lazy(() => import("./pages/meal/PIIMaskingConfig").then(m => ({ default: m.PIIMaskingConfig })));
const MEALUserManagement = lazy(() => import("./pages/meal/UserManagement").then(m => ({ default: m.UserManagement })));
const LearningManagement = lazy(() => import("./pages/meal/LearningManagement").then(m => ({ default: m.LearningManagement })));
const DQAManagement = lazy(() => import("./pages/meal/DQAManagement").then(m => ({ default: m.DQAManagement })));
const MEALSettings = lazy(() => import("./pages/meal/MEALSettings").then(m => ({ default: m.MEALSettings })));

// --- Finance Module Pages ---
const FinanceLanding = lazy(() => import("./pages/finance/FinanceLanding"));
const FinanceVendors = lazy(() => import("./pages/finance/FinanceVendors"));
const FinanceVendorList = lazy(() => import("./pages/finance/FinanceVendorList"));
const FinanceSuppliersList = lazy(() => import("./pages/finance/FinanceSuppliersList"));
const FinanceContractorsList = lazy(() => import("./pages/finance/FinanceContractorsList"));
const FinanceServiceProvidersList = lazy(() => import("./pages/finance/FinanceServiceProvidersList"));
const FinanceVendorDetail = lazy(() => import("./pages/finance/FinanceVendorDetail"));
const FinanceEvaluationHub = lazy(() => import("./pages/finance/FinanceEvaluationHub"));
const FinanceOverview = lazy(() => import("./pages/finance/FinanceOverview"));
const FinanceChartOfAccounts = lazy(() => import("./pages/finance/FinanceChartOfAccounts"));
const FinanceBudgets = lazy(() => import("./pages/finance/FinanceBudgets"));
const BudgetDetail = lazy(() => import("./pages/finance/BudgetDetail"));
const PaymentDetail = lazy(() => import("./pages/finance/PaymentDetail"));
const AssetDetail = lazy(() => import("./pages/finance/AssetDetail"));
const AdvanceDetail = lazy(() => import("./pages/finance/AdvanceDetail"));
const ReconciliationDetail = lazy(() => import("./pages/finance/ReconciliationDetail"));
const FinanceExpenditures = lazy(() => import("./pages/finance/FinanceExpenditures"));
const FinanceReports = lazy(() => import("./pages/finance/FinanceReports"));
const FinanceComingSoon = lazy(() => import("./pages/finance/FinanceComingSoon"));
const AdvancesSettlements = lazy(() => import("./pages/finance/AdvancesSettlements"));
const TreasuryCashManagement = lazy(() => import("./pages/finance/TreasuryCashManagement"));
const TreasuryCashManagementDashboard = lazy(() => import("./pages/finance/TreasuryCashManagementDashboard"));
const TreasuryBankAccounts = lazy(() => import("./pages/finance/TreasuryBankAccounts"));
const TreasuryCashTransactions = lazy(() => import("./pages/finance/TreasuryCashTransactions"));
const TreasuryFundBalances = lazy(() => import("./pages/finance/TreasuryFundBalances"));
const TreasuryBankReconciliation = lazy(() => import("./pages/finance/TreasuryBankReconciliation"));
const AssetsManagement = lazy(() => import("./pages/finance/AssetsManagement"));
const AssetsManagementDashboard = lazy(() => import("./pages/finance/AssetsManagementDashboard"));
const AssetRegistry = lazy(() => import("./pages/finance/AssetRegistry"));
const AssetCategories = lazy(() => import("./pages/finance/AssetCategories"));
const AssetTransfers = lazy(() => import("./pages/finance/AssetTransfers"));
const AssetDisposals = lazy(() => import("./pages/finance/AssetDisposals"));
const FinanceSettings = lazy(() => import("./pages/finance/FinanceSettings"));
const InvoiceMatching = lazy(() => import("./pages/finance/InvoiceMatching"));
const BudgetUtilizationDashboard = lazy(() => import("./pages/finance/BudgetUtilizationDashboard"));
const PayablesManagement = lazy(() => import("./pages/finance/PayablesManagement"));
const PayableDetail = lazy(() => import("./pages/finance/PayableDetail"));
const FinancePayments = lazy(() => import("./pages/finance/FinancePayments"));
const FinancePaymentReports = lazy(() => import("./pages/finance/FinancePaymentReports"));
const BankStatementImport = lazy(() => import("./pages/finance/BankStatementImport"));
const BankReconciliationMatching = lazy(() => import("./pages/finance/BankReconciliationMatching"));
const JournalEntries = lazy(() => import("./pages/finance/JournalEntries"));
const ExchangeRatesManagement = lazy(() => import("@/pages/finance/ExchangeRatesManagement"));
const CostAllocationManagement = lazy(() => import("@/pages/finance/CostAllocationManagement"));
const FinancialDashboard = lazy(() => import("./pages/finance/FinancialDashboard"));

// --- HR Module Pages (named exports need wrapper) ---
const HRModuleLauncher = lazy(() => import("./pages/hr/HRModuleLauncher").then(m => ({ default: m.HRModuleLauncher })));
const HRDashboard = lazy(() => import("./pages/hr/HRDashboard").then(m => ({ default: m.HRDashboard })));
const EmployeesDirectory = lazy(() => import("./pages/hr/EmployeesDirectory").then(m => ({ default: m.EmployeesDirectory })));
const EmployeesProfiles = lazy(() => import("./pages/hr/EmployeesProfiles").then(m => ({ default: m.EmployeesProfiles })));
const EmployeesProfilesLanding = lazy(() => import("./pages/hr/EmployeesProfilesLanding").then(m => ({ default: m.EmployeesProfilesLanding })));
const IndividualEmployeeProfile = lazy(() => import("./pages/hr/IndividualEmployeeProfile"));
const AddEmployeePage = lazy(() => import("./pages/hr/AddEmployeePage").then(m => ({ default: m.AddEmployeePage })));
const EditEmployeePage = lazy(() => import("./pages/hr/EditEmployeePage").then(m => ({ default: m.EditEmployeePage })));
const LeaveManagement = lazy(() => import("./pages/hr/LeaveManagement").then(m => ({ default: m.LeaveManagement })));
const PayrollAllowances = lazy(() => import("./pages/hr/PayrollAllowances").then(m => ({ default: m.PayrollAllowances })));
const SalaryScale = lazy(() => import("./pages/hr/SalaryScale").then(m => ({ default: m.SalaryScale })));
const Recruitment = lazy(() => import("./pages/hr/Recruitment").then(m => ({ default: m.Recruitment })));
const TrainingManagement = lazy(() => import("./pages/hr/TrainingManagement").then(m => ({ default: m.TrainingManagement })));
const HRDocuments = lazy(() => import("./pages/hr/HRDocuments").then(m => ({ default: m.HRDocuments })));
const HRReports = lazy(() => import("./pages/hr/HRReports").then(m => ({ default: m.HRReports })));
const HRSettings = lazy(() => import("./pages/hr/HRSettings").then(m => ({ default: m.HRSettings })));
const SanctionsDisciplinary = lazy(() => import("./pages/hr/SanctionsDisciplinary").then(m => ({ default: m.SanctionsDisciplinary })));
const HRAnnualPlanModule = lazy(() => import("./pages/hr/HRAnnualPlanModule").then(m => ({ default: m.HRAnnualPlanModule })));
const HRReportsAnalytics = lazy(() => import("./pages/hr/ReportsAnalytics").then(m => ({ default: m.ReportsAnalytics })));
const ReportsAnalyticsPage = lazy(() => import("./pages/organization/reports/ReportsAnalyticsPage").then(m => ({ default: m.ReportsAnalyticsPage })));
const RiskComplianceLanding = lazy(() => import("./pages/organization/risk-compliance/RiskComplianceLanding"));
const RiskDashboardPage = lazy(() => import("./pages/organization/risk-compliance/RiskDashboardPage"));
const RiskRegistryPage = lazy(() => import("./pages/organization/risk-compliance/RiskRegistryPage"));
const IncidentLogPage = lazy(() => import("./pages/organization/risk-compliance/IncidentLogPage"));
const RiskDetailPage = lazy(() => import("./pages/organization/risk-compliance/RiskDetailPage"));
const AttendanceDashboard = lazy(() => import("./pages/hr/attendance/AttendanceDashboard").then(m => ({ default: m.AttendanceDashboard })));
const AttendanceCalendar = lazy(() => import("./pages/hr/attendance/AttendanceCalendar").then(m => ({ default: m.AttendanceCalendar })));
const AttendanceRecordsTable = lazy(() => import("./pages/hr/attendance/AttendanceRecordsTable").then(m => ({ default: m.AttendanceRecordsTable })));
const MyAttendance = lazy(() => import("./pages/hr/attendance/MyAttendance").then(m => ({ default: m.MyAttendance })));
const OvertimeManagement = lazy(() => import("./pages/hr/attendance/OvertimeManagement").then(m => ({ default: m.OvertimeManagement })));
const AttendanceReports = lazy(() => import("./pages/hr/attendance/AttendanceReports").then(m => ({ default: m.AttendanceReports })));
const PeriodManagement = lazy(() => import("./pages/hr/attendance/PeriodManagement").then(m => ({ default: m.PeriodManagement })));
const StaffDictionary = lazy(() => import("./pages/hr/StaffDictionary").then(m => ({ default: m.StaffDictionary })));
const ProfilesSummary = lazy(() => import("./pages/hr/ProfilesSummary").then(m => ({ default: m.ProfilesSummary })));
const NewHires = lazy(() => import("./pages/hr/NewHires").then(m => ({ default: m.NewHires })));
const ContractRenewals = lazy(() => import("./pages/hr/ContractRenewals").then(m => ({ default: m.ContractRenewals })));
const ExitProcessing = lazy(() => import("./pages/hr/ExitProcessing").then(m => ({ default: m.ExitProcessing })));
const ReferenceVerification = lazy(() => import("./pages/hr/ReferenceVerification").then(m => ({ default: m.ReferenceVerification })));
const ArchivedEmployees = lazy(() => import("./pages/hr/ArchivedEmployees").then(m => ({ default: m.ArchivedEmployees })));
const ExitedStaff = lazy(() => import("./pages/hr/ExitedStaff").then(m => ({ default: m.ExitedStaff })));

// --- Logistics Module Pages ---
const LogisticsWorkspace = lazy(() => import("./pages/logistics/LogisticsWorkspace"));
const LogisticsVendorManagement = lazy(() => import("./pages/logistics/VendorManagement"));
const SuppliersList = lazy(() => import("./pages/logistics/SuppliersList"));
const ContractorsList = lazy(() => import("./pages/logistics/ContractorsList"));
const ServiceProvidersList = lazy(() => import("./pages/logistics/ServiceProvidersList"));
const LogisticsVendorDetail = lazy(() => import("./pages/logistics/VendorDetail"));
const LogisticsVendorDetailEnhanced = lazy(() => import("./pages/logistics/VendorDetailEnhanced"));
const LogisticsVendorPerformanceEvaluation = lazy(() => import("./pages/logistics/VendorPerformanceEvaluation"));
const EvaluationPerformanceHub = lazy(() => import("./pages/logistics/EvaluationPerformanceHub"));
const EvaluationChecklist = lazy(() => import("./pages/logistics/EvaluationChecklist"));
const VendorQualificationList = lazy(() => import("./pages/logistics/VendorQualificationList"));
const ScoreDashboard = lazy(() => import("./pages/logistics/ScoreDashboard"));
const EvaluationHistory = lazy(() => import("./pages/logistics/EvaluationHistory"));
const ApprovalWorkflow = lazy(() => import("./pages/logistics/ApprovalWorkflow"));
const VendorBlacklistManagement = lazy(() => import("./pages/logistics/VendorBlacklistManagement"));
const BlacklistCaseDetail = lazy(() => import("./pages/logistics/BlacklistCaseDetail"));
const BlacklistWorkflowSettings = lazy(() => import("./pages/logistics/BlacklistWorkflowSettings"));
const VendorEdit = lazy(() => import("./pages/logistics/VendorEdit"));
const ReportsAnalytics = lazy(() => import("./pages/logistics/ReportsAnalytics"));
const ProcurementCycleTimeReport = lazy(() => import("./pages/logistics/reports/ProcurementCycleTimeReport"));
const SupplierPerformanceReport = lazy(() => import("./pages/logistics/reports/SupplierPerformanceReport"));
const POAgingReport = lazy(() => import("./pages/logistics/reports/POAgingReport"));
const SpendingAnalysisReport = lazy(() => import("./pages/logistics/reports/SpendingAnalysisReport"));
const InventorySummaryReport = lazy(() => import("./pages/logistics/reports/InventorySummaryReport"));
const ScheduledReports = lazy(() => import("./pages/logistics/reports/ScheduledReports"));
const PurchaseRequestList = lazy(() => import("./pages/logistics/PurchaseRequestList"));
const MyPRs = lazy(() => import("./pages/logistics/MyPRs"));
const PurchaseRequestForm = lazy(() => import("./pages/logistics/PurchaseRequestForm"));
const VendorWorkspace = lazy(() => import("./pages/logistics/VendorWorkspace").then(m => ({ default: m.VendorWorkspace })));
const StockWorkspace = lazy(() => import("./pages/logistics/StockWorkspace").then(m => ({ default: m.StockWorkspace })));

const PurchaseOrderList = lazy(() => import("./pages/logistics/PurchaseOrderList"));
const GoodsReceiptList = lazy(() => import("./pages/logistics/GoodsReceiptList"));
const StockManagement = lazy(() => import("./pages/logistics/StockManagement"));
const StockItemsList = lazy(() => import("./pages/logistics/stock/items/StockItemsList"));
const StockItemsForm = lazy(() => import("./pages/logistics/stock/items/StockItemsForm"));
const StockRequestsList = lazy(() => import("./pages/logistics/stock/requests/StockRequestsList"));
const StockRequestsForm = lazy(() => import("./pages/logistics/stock/requests/StockRequestsForm"));
const IssuedItemsList = lazy(() => import("./pages/logistics/stock/issued/IssuedItemsList"));
const IssuedItemsForm = lazy(() => import("./pages/logistics/stock/issued/IssuedItemsForm"));
const ReturnsList = lazy(() => import("./pages/logistics/stock/returns/ReturnsList"));
const ReturnsForm = lazy(() => import("./pages/logistics/stock/returns/ReturnsForm"));
const StockLedger = lazy(() => import("./pages/logistics/stock/ledger/StockLedger"));
const StockBatchesList = lazy(() => import("./pages/logistics/stock/batches/StockBatchesList"));
const PhysicalCountList = lazy(() => import("./pages/logistics/stock/physical-count/PhysicalCountList"));
const PhysicalCountForm = lazy(() => import("./pages/logistics/stock/physical-count/PhysicalCountForm"));
const TransferTracking = lazy(() => import("./pages/logistics/stock/transfer-tracking/TransferTracking"));
const ScheduledExpiryAlerts = lazy(() => import("./pages/logistics/stock/expiry/ScheduledExpiryAlerts"));
const WarehouseAlertConfigs = lazy(() => import("./pages/logistics/stock/expiry/WarehouseAlertConfigs"));
const StockAnalytics = lazy(() => import("./pages/logistics/stock/analytics/StockAnalytics"));
const StockAdjustments = lazy(() => import("./pages/logistics/stock/adjustments/StockAdjustments"));
const StockAdjustmentForm = lazy(() => import("./pages/logistics/stock/adjustments/StockAdjustmentForm"));
const WarehouseTransfers = lazy(() => import("./pages/logistics/stock/transfers/WarehouseTransfers"));
const WarehouseTransferForm = lazy(() => import("./pages/logistics/stock/transfers/WarehouseTransferForm"));
const ExpiryAlerts = lazy(() => import("./pages/logistics/stock/expiry/ExpiryAlerts"));
const FleetManagement = lazy(() => import("./pages/logistics/FleetManagement"));
const VehiclesList = lazy(() => import("./pages/logistics/fleet/vehicles/VehiclesList"));
const VehiclesForm = lazy(() => import("./pages/logistics/fleet/vehicles/VehiclesForm"));
const VehicleDetail = lazy(() => import("./pages/logistics/fleet/vehicles/VehicleDetail"));
const DriversList = lazy(() => import("./pages/logistics/fleet/drivers/DriversList"));
const DriverDetail = lazy(() => import("./pages/logistics/fleet/drivers/DriverDetail"));
const DriversForm = lazy(() => import("./pages/logistics/fleet/drivers/DriversForm"));
const TripLogsList = lazy(() => import("./pages/logistics/fleet/trips/TripLogsList"));
const TripLogsForm = lazy(() => import("./pages/logistics/fleet/trips/TripLogsForm"));
const TripDetail = lazy(() => import("./pages/logistics/fleet/trips/TripDetail"));
const MaintenanceList = lazy(() => import("./pages/logistics/fleet/maintenance/MaintenanceList"));
const MaintenanceForm = lazy(() => import("./pages/logistics/fleet/maintenance/MaintenanceForm"));
const MaintenancePredictor = lazy(() => import("./pages/logistics/fleet/maintenance/MaintenancePredictor"));
const FuelTrackingList = lazy(() => import("./pages/logistics/fleet/fuel/FuelTrackingList"));
const FuelTrackingForm = lazy(() => import("./pages/logistics/fleet/fuel/FuelTrackingForm"));
const FuelAnalytics = lazy(() => import("./pages/logistics/fleet/fuel/FuelAnalytics"));
const ComplianceList = lazy(() => import("./pages/logistics/fleet/compliance/ComplianceList"));
const ComplianceForm = lazy(() => import("./pages/logistics/fleet/compliance/ComplianceForm"));
const ComplianceDashboard = lazy(() => import("./pages/logistics/fleet/compliance/ComplianceDashboard"));
const VendorIntegration = lazy(() => import("./pages/logistics/erp/VendorIntegration"));
const ProcurementLinkage = lazy(() => import("./pages/logistics/erp/ProcurementLinkage"));
const FinanceModuleLinkage = lazy(() => import("./pages/logistics/erp/FinanceModuleLinkage"));
const FleetDashboard = lazy(() => import("./pages/logistics/reporting/FleetDashboard"));
const KPIReports = lazy(() => import("./pages/logistics/reporting/KPIReports"));
const ExportVisualization = lazy(() => import("./pages/logistics/reporting/ExportVisualization"));
const AutoNumberingTemplates = lazy(() => import("./pages/logistics/governance/AutoNumberingTemplates"));
const RoleBasedAccessControl = lazy(() => import("./pages/logistics/governance/RoleBasedAccessControl"));
const AuditTrailCompliance = lazy(() => import("./pages/logistics/governance/AuditTrailCompliance"));
const WorkflowAutomation = lazy(() => import("./pages/logistics/governance/WorkflowAutomation"));
const ProcurementTracker = lazy(() => import("./pages/logistics/ProcurementTracker"));
const PurchaseRequestPrint = lazy(() => import("./pages/logistics/PurchaseRequestPrint"));
const PurchaseOrderPrint = lazy(() => import("./pages/logistics/PurchaseOrderPrint"));
const GoodsReceiptPrint = lazy(() => import("./pages/logistics/GoodsReceiptPrint"));
const ProcurementWorkspace = lazy(() => import("./pages/logistics/ProcurementWorkspace"));
const TenderInformation = lazy(() => import("./pages/logistics/TenderInformation"));
const BidEvaluationChecklist = lazy(() => import("@/pages/logistics/BidEvaluationChecklist"));
const BidOpeningMinutes = lazy(() => import("@/pages/logistics/BidOpeningMinutes"));
const CompetitiveBidAnalysis = lazy(() => import("./pages/logistics/CompetitiveBidAnalysis"));
const RFQManagementPage = lazy(() => import("./pages/logistics/RFQManagementPage"));
const RFQPrint = lazy(() => import("./pages/logistics/RFQPrint"));
const QuotationAnalysisDetail = lazy(() => import("./pages/logistics/QuotationAnalysisDetail"));
const PurchaseOrderDetail = lazy(() => import("./pages/logistics/PurchaseOrderDetail"));
const GoodsReceiptDetail = lazy(() => import("./pages/logistics/GoodsReceiptDetail"));
const ProcurementPackagePrint = lazy(() => import("./pages/logistics/ProcurementPackagePrint"));
const QuotationAnalysisPrint = lazy(() => import("./pages/logistics/QuotationAnalysisPrint"));
const QuotationAnalysisExtendedPrint = lazy(() => import("./pages/logistics/QuotationAnalysisExtendedPrint"));
const BidAnalysisPrint = lazy(() => import("./pages/logistics/BidAnalysisPrint"));
const BidOpeningMinutesPrint = lazy(() => import("./pages/logistics/BidOpeningMinutesPrint"));
const BidEvaluationChecklistPrint = lazy(() => import("./pages/logistics/BidEvaluationChecklistPrint"));
const PRPayablesList = lazy(() => import("./pages/logistics/PRPayablesList"));
const ContractManagement = lazy(() => import("./pages/logistics/ContractManagement"));
const SACManagement = lazy(() => import("./pages/logistics/SACManagement"));
const SACForm = lazy(() => import("./pages/logistics/SACForm"));

// ============================================================================
// Loading Fallback - shown while lazy chunks are being loaded
// ============================================================================
function PageLoader() {
 return (
 <div className="flex items-center justify-center min-h-[60vh]">
 <div className="text-center">
 <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
 <p className="text-sm text-muted-foreground">Loading...</p>
 </div>
 </div>
 );
}

/**
 * Router Component
 * 
 * CRITICAL ARCHITECTURE:
 * - AppShell mounts ONCE and never remounts
 * - Only page content (children) changes on navigation
 * - Sidebar and Header stay mounted = instant navigation
 * - Auth checks happen at AppShell level, not per page
 * - All page components are lazy-loaded for fast initial load
 * 
 * This ensures:
 * ✓ No white flashes on initial load
 * ✓ Fast initial page render (only loads current page chunk)
 * ✓ No context resets
 * ✓ Navigation loads only the needed chunk
 */
function Router() {
  // make sure to consider if you need authentication for certain routes
 // make sure to consider if you need authentication for certain routes
 return (
 <AppShell>
 <Suspense fallback={<PageLoader />}>
 <Switch>
  {/* Login Page */}
  <Route path="/login" component={Login} />
  
  {/* Home Page */}
  <Route path="/" component={Home} />
 
 {/* Platform Admin Routes */}
 <Route path="/platform" component={PlatformDashboard} />
 <Route path="/platform/organizations" component={OrganizationsPage} />
 <Route path="/platform/organizations/:shortCode/:ouSuffix" component={OperatingUnitDetailPage} />
 <Route path="/platform/organizations/:shortCode" component={OrganizationDetailPage} />
 <Route path="/platform/operating-units" component={OperatingUnitsPage} />
 <Route path="/platform/users" component={UserManagement} />
 <Route path="/platform/system-health" component={SystemHealthPage} />
 <Route path="/platform/system-health/infrastructure" component={InfrastructurePage} />
 <Route path="/platform/system-health/regression" component={RegressionPage} />
 <Route path="/platform/audit-logs" component={AuditLogsPage} />
 <Route path="/platform/settings" component={PlatformAdminSettingsPage} />
 <Route path="/platform/settings/users" component={PlatformUsersPage} />
 <Route path="/platform/settings/roles" component={PlatformRolesPage} />
 <Route path="/platform/settings/global" component={GlobalSystemSettingsPage} />
 <Route path="/platform/settings/authentication" component={AuthenticationStatusPage} />
 <Route path="/platform/settings/lifecycle" component={OrganizationLifecyclePage} />
 <Route path="/platform/settings/email-templates" component={EmailTemplateManagement} />
 <Route path="/platform/audit-logs" component={AuditLogViewerPage} />
 <Route path="/platform/access-requests" component={AccessRequestsPage} />
 <Route path="/platform/email-management" component={EmailManagementPage} />
 <Route path="/platform/performance-dashboard" component={PerformanceDashboard} />
 <Route path="/platform/deleted-records" component={PlatformDeletedRecords} />
 <Route path="/platform/deleted-records/dashboard" component={DeletedRecordsDashboard} />
 <Route path="/platform/retention-policy" component={RetentionPolicyPage} />
 <Route path="/platform/settings/email" component={PlatformEmailSettingsPage} />

 <Route path="/reset-password/:token" component={PasswordResetPage} />
 
 {/* Organization Routes */}
 <Route path="/organization" component={OrganizationDashboard} />
 <Route path="/organization/admin" component={AdminDashboard} />
 <Route path="/connect-microsoft365" component={ConnectMicrosoft365Page} />
 <Route path="/organization/projects" component={ProjectManagementDashboard} />
 <Route path="/organization/projects-list" component={ProjectsCRUDPage} />
 <Route path="/organization/projects/:id" component={ProjectDetailsPage} />
 <Route path="/organization/grants" component={ActiveGrantsPage} />
 <Route path="/organization/reporting" component={ReportingSchedulePage} />
 <Route path="/organization/reporting-schedule" component={ReportingSchedulePage} />
 <Route path="/organization/proposals" component={ProposalPipeline} />
 <Route path="/organization/donor-crm" component={DonorCRMDashboard} />
 <Route path="/organization/donor-crm/opportunities" component={Opportunities} />
 <Route path="/organization/donor-crm/donors" component={DonorRegistry} />
 <Route path="/organization/donor-crm/communications" component={DonorCommunications} />
 <Route path="/organization/donor-crm/reports" component={DonorReports} />
 <Route path="/organization/donor-crm/funding-opportunities" component={FundingOpportunities} />
 <Route path="/organization/annual-report" component={AnnualProgramsReport} />
 <Route path="/organization/settings" component={SettingsDashboard} />
 <Route path="/organization/settings/users" component={SettingsUserManagement} />
 <Route path="/organization/settings/roles" component={SettingsRolesPermissions} />
 <Route path="/organization/settings/options" component={SettingsOptionSets} />
 <Route path="/organization/settings/notifications" component={SettingsEmailNotifications} />
 <Route path="/organization/settings/branding" component={SettingsLogoBranding} />
 <Route path="/organization/settings/publish-sync" component={SettingsPublishSync} />
 <Route path="/organization/settings/admin" component={SettingsAdminAccess} />
 <Route path="/organization/settings/deleted-records" component={OrgDeletedRecords} />
 <Route path="/organization/settings/landing" component={SettingsLandingSettings} />
 <Route path="/organization/settings/language" component={SettingsLanguageSettings} />
 <Route path="/organization/settings/import-history" component={SettingsImportHistory} />
 <Route path="/organization/settings/import-history/:id" component={SettingsImportHistoryDetails} />
 <Route path="/organization/settings/system-health" component={SettingsSystemHealth} />
 <Route path="/organization/settings/unit-types" component={UnitTypeManagement} />
 <Route path="/organization/settings/documents" component={CentralDocumentsFinal} />
 
 {/* Organization MEAL Routes */}
 <Route path="/organization/meal" component={MEALModule} />
 <Route path="/organization/meal/main" component={MEALDashboardMain} />
 <Route path="/organization/meal/dashboard" component={MEALDashboard} />
 
 {/* Indicators */}
 <Route path="/organization/meal/indicators" component={IndicatorsListPage} />
 <Route path="/organization/meal/indicators/list" component={IndicatorsList} />
 <Route path="/organization/meal/indicators/add" component={AddIndicator} />
 <Route path="/organization/meal/indicators/charts" component={IndicatorCharts} />
 <Route path="/organization/meal/indicators/export" component={IndicatorExport} />
 <Route path="/organization/meal/indicators/data-verification" component={DataVerification} />
 <Route path="/organization/meal/indicators/bulk-import" component={BulkIndicatorDataImport} />
 <Route path="/organization/meal/indicators/:id" component={IndicatorDetails} />
 <Route path="/organization/meal/indicators/:id/charts" component={IndicatorChartsPage} />
 <Route path="/organization/meal/indicators/:id/export" component={IndicatorExportPage} />
 <Route path="/organization/meal/indicators/:id/data-entry" component={IndicatorDataEntryForm} />
 <Route path="/organization/meal/add-indicator" component={AddIndicator} />
 <Route path="/organization/meal/data-entry" component={DataEntry} />
 
 {/* Survey & Data Collection */}
 <Route path="/organization/meal/survey" component={SurveyDashboard} />
 <Route path="/organization/meal/survey/dashboard" component={SurveyDashboard} />
 <Route path="/organization/meal/survey/list" component={SurveyList} />
 <Route path="/organization/meal/survey/create" component={SurveyCreateForm} />
 <Route path="/organization/meal/survey/create-form" component={SurveyCreateForm} />
 <Route path="/organization/meal/survey/forms" component={SurveyForms} />
 <Route path="/organization/meal/survey/form-preview" component={SurveyFormPreview} />
 <Route path="/organization/meal/survey/editor" component={SurveyEditor} />
 <Route path="/organization/meal/survey/settings" component={SurveySettings} />
 <Route path="/organization/meal/survey/templates" component={SurveyTemplates} />
 <Route path="/organization/meal/survey/submissions" component={SurveySubmissions} />
 <Route path="/organization/meal/survey/import-export" component={SurveyImportExport} />
 <Route path="/organization/meal/survey/import-kobo" component={SurveyImportKobo} />
 <Route path="/organization/meal/survey/reports" component={SurveyReports} />
 <Route path="/organization/meal/survey/analytics" component={SurveyAnalyticsDashboard} />
 <Route path="/organization/meal/survey/detail/:id" component={SurveyDetailView} />
 <Route path="/organization/meal/survey/submission/:submissionId" component={SurveySubmissionDetail} />
 <Route path="/organization/meal/survey/:id/respond" component={SurveyResponse} />
 <Route path="/organization/meal/survey-export" component={SurveyExport} />
 
 {/* Other MEAL modules */}
 <Route path="/organization/meal/accountability" component={Accountability} />
 <Route path="/organization/meal/documents" component={MEALDocuments} />
 <Route path="/organization/meal/documents/manual" component={DocumentsManual} />
 <Route path="/organization/meal/reports" component={MEALReports} />
 <Route path="/organization/meal/reports/meal" component={MEALReports} />
 <Route path="/organization/meal/audit-trail" component={MEALAuditTrail} />
 <Route path="/organization/meal/pii-masking" component={PIIMaskingConfig} />
 <Route path="/organization/meal/pii-masking-config" component={PIIMaskingConfig} />
 <Route path="/organization/meal/users" component={MEALUserManagement} />
 <Route path="/organization/meal/learning" component={LearningManagement} />
 <Route path="/organization/meal/dqa" component={DQAManagement} />
 <Route path="/organization/meal/settings" component={MEALSettings} />
 
 {/* Organization Finance Routes */}
 <Route path="/organization/finance" component={FinanceLanding} />
 <Route path="/organization/finance/overview" component={FinanceOverview} />
 <Route path="/organization/finance/chart-of-accounts" component={FinanceChartOfAccounts} />
 <Route path="/organization/finance/budgets/:id" component={BudgetDetail} />
 <Route path="/organization/finance/budgets" component={FinanceBudgets} />
 <Route path="/organization/finance/expenditures" component={FinanceExpenditures} />
 <Route path="/organization/finance/reports" component={FinanceReports} />
 <Route path="/organization/finance/advances/:id" component={AdvanceDetail} />
 <Route path="/organization/finance/advances" component={AdvancesSettlements} />
 <Route path="/organization/finance/assets/registry" component={AssetRegistry} />
 <Route path="/organization/finance/assets/categories" component={AssetCategories} />
 <Route path="/organization/finance/assets/transfers" component={AssetTransfers} />
 <Route path="/organization/finance/assets/disposals" component={AssetDisposals} />
 <Route path="/organization/finance/assets/:id" component={AssetDetail} />
 <Route path="/organization/finance/assets" component={AssetsManagementDashboard} />
 <Route path="/organization/finance/treasury/reconciliation/:id" component={ReconciliationDetail} />
 <Route path="/organization/finance/treasury/bank-accounts" component={TreasuryBankAccounts} />
 <Route path="/organization/finance/treasury/cash-transactions" component={TreasuryCashTransactions} />
 <Route path="/organization/finance/treasury/fund-balances" component={TreasuryFundBalances} />
 <Route path="/organization/finance/treasury/bank-reconciliation" component={TreasuryBankReconciliation} />
 <Route path="/organization/finance/treasury" component={TreasuryCashManagementDashboard} />
 <Route path="/organization/finance/settings" component={FinanceSettings} />
 <Route path="/organization/finance/invoice-matching/:payableId" component={InvoiceMatching} />
 <Route path="/organization/finance/budget-utilization" component={BudgetUtilizationDashboard} />
 <Route path="/organization/finance/payables/:id" component={PayableDetail} />
 <Route path="/organization/finance/payables" component={PayablesManagement} />
 <Route path="/organization/finance/payments/:id" component={PaymentDetail} />
 <Route path="/organization/finance/payments" component={FinancePayments} />
 <Route path="/organization/finance/payment-reports" component={FinancePaymentReports} />
 <Route path="/organization/finance/bank-statement-import" component={BankStatementImport} />
 <Route path="/organization/finance/bank-reconciliation-matching" component={BankReconciliationMatching} />
 <Route path="/organization/finance/journal-entries" component={JournalEntries} />
 <Route path="/organization/finance/exchange-rates" component={ExchangeRatesManagement} />
 <Route path="/organization/finance/cost-allocation" component={CostAllocationManagement} />
 <Route path="/organization/finance/vendors/suppliers" component={FinanceSuppliersList} />
              <Route path="/organization/finance/vendors/contractors" component={FinanceContractorsList} />
              <Route path="/organization/finance/vendors/service-providers" component={FinanceServiceProvidersList} />
              <Route path="/organization/finance/vendors/evaluation/qualification-list" component={VendorQualificationList} />
              <Route path="/organization/finance/vendors/evaluation/score-dashboard" component={ScoreDashboard} />
              <Route path="/organization/finance/vendors/evaluation/history" component={EvaluationHistory} />
              <Route path="/organization/finance/vendors/evaluation/approval-workflow" component={ApprovalWorkflow} />
              <Route path="/organization/finance/vendors/evaluation/blacklist" component={VendorBlacklistManagement} />
              <Route path="/organization/finance/vendors/evaluation/blacklist/:id" component={BlacklistCaseDetail} />
              <Route path="/organization/finance/vendors/evaluation" component={FinanceEvaluationHub} />
              <Route path="/organization/finance/vendors/:id" component={FinanceVendorDetail} />
              <Route path="/organization/finance/vendors" component={FinanceVendors} />
 <Route path="/organization/finance/dashboard" component={FinancialDashboard} />
 
 {/* Organization HR Routes */}
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
 <Route path="/organization/hr/employees-profiles/edit/:id" component={EditEmployeePage} />
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
 <Route path="/organization/reports-analytics" component={ReportsAnalyticsPage} />
 <Route path="/organization/risk-compliance" component={RiskComplianceLanding} />
 <Route path="/organization/risk-compliance/dashboard" component={RiskDashboardPage} />
 <Route path="/organization/risk-compliance/risk-registry" component={RiskRegistryPage} />
 <Route path="/organization/risk-compliance/incident-log" component={IncidentLogPage} />
 <Route path="/organization/risk-compliance/:id" component={RiskDetailPage} />
 <Route path="/organization/reports">
 {() => {
 window.location.href = '/organization/reports-analytics';
 return null;
 }}
 </Route>
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
 
 {/* Organization Logistics Routes */}
 <Route path="/organization/logistics" component={LogisticsWorkspace} />
 <Route path="/organization/logistics/my-prs" component={MyPRs} />
 <Route path="/organization/logistics/vendor-documents" component={VendorWorkspace} />
 <Route path="/organization/logistics/stock-documents" component={StockWorkspace} />
 <Route path="/organization/logistics/vendors" component={LogisticsVendorManagement} />
 <Route path="/organization/logistics/vendors/suppliers/:id/edit" component={VendorEdit} />
 <Route path="/organization/logistics/vendors/suppliers" component={SuppliersList} />
 <Route path="/organization/logistics/vendors/contractors" component={ContractorsList} />
 <Route path="/organization/logistics/vendors/service-providers" component={ServiceProvidersList} />
 <Route path="/organization/logistics/vendors/:id" component={LogisticsVendorDetail} />
 <Route path="/organization/logistics/vendors/:id/enhanced" component={LogisticsVendorDetailEnhanced} />
 <Route path="/organization/logistics/vendors/:id/performance" component={LogisticsVendorPerformanceEvaluation} />
 <Route path="/organization/logistics/vendor-performance-evaluation" component={LogisticsVendorPerformanceEvaluation} />
 <Route path="/organization/logistics/evaluation-performance" component={EvaluationPerformanceHub} />
 <Route path="/organization/logistics/evaluation-performance/qualification-list" component={VendorQualificationList} />
 <Route path="/organization/logistics/evaluation-performance/checklist/:vendorId" component={EvaluationChecklist} />
 <Route path="/organization/logistics/evaluation-performance/checklist" component={EvaluationChecklist} />
 <Route path="/organization/logistics/evaluation-performance/score-dashboard" component={ScoreDashboard} />
 <Route path="/organization/logistics/evaluation-performance/history" component={EvaluationHistory} />
 <Route path="/organization/logistics/evaluation-performance/approval-workflow" component={ApprovalWorkflow} />
 <Route path="/organization/logistics/evaluation-performance/blacklist" component={VendorBlacklistManagement} />
 <Route path="/organization/logistics/evaluation-performance/blacklist/settings" component={BlacklistWorkflowSettings} />
 <Route path="/organization/logistics/evaluation-performance/blacklist/:id" component={BlacklistCaseDetail} />
 <Route path="/organization/logistics/reports" component={ReportsAnalytics} />
 <Route path="/organization/logistics/reports/cycle-time" component={ProcurementCycleTimeReport} />
 <Route path="/organization/logistics/reports/supplier-performance" component={SupplierPerformanceReport} />
 <Route path="/organization/logistics/reports/po-aging" component={POAgingReport} />
 <Route path="/organization/logistics/reports/spending" component={SpendingAnalysisReport} />
 <Route path="/organization/logistics/reports/inventory" component={InventorySummaryReport} />
 <Route path="/organization/logistics/reports/scheduled" component={ScheduledReports} />
 <Route path="/organization/logistics/purchase-requests" component={PurchaseRequestList} />
 <Route path="/organization/logistics/purchase-requests/new" component={PurchaseRequestForm} />
 <Route path="/organization/logistics/purchase-requests/:id/print" component={PurchaseRequestPrint} />
 <Route path="/organization/logistics/purchase-requests/:id/edit" component={PurchaseRequestForm} />
 <Route path="/organization/logistics/purchase-requests/:id" component={PurchaseRequestForm} />

 <Route path="/organization/logistics/purchase-orders" component={PurchaseOrderList} />
 <Route path="/organization/logistics/grn" component={GoodsReceiptList} />
 <Route path="/organization/logistics/stock" component={StockManagement} />
 <Route path="/organization/logistics/stock/items" component={StockItemsList} />
 <Route path="/organization/logistics/stock/items/new" component={StockItemsForm} />
 <Route path="/organization/logistics/stock/items/:id" component={StockItemsForm} />
 <Route path="/organization/logistics/stock/items/:id/edit" component={StockItemsForm} />
 <Route path="/organization/logistics/stock/requests" component={StockRequestsList} />
 <Route path="/organization/logistics/stock/requests/new" component={StockRequestsForm} />
 <Route path="/organization/logistics/stock/requests/:id" component={StockRequestsForm} />
 <Route path="/organization/logistics/stock/requests/:id/edit" component={StockRequestsForm} />
 <Route path="/organization/logistics/stock/issued" component={IssuedItemsList} />
 <Route path="/organization/logistics/stock/issued/new" component={IssuedItemsForm} />
 <Route path="/organization/logistics/stock/issued/:id" component={IssuedItemsForm} />
 <Route path="/organization/logistics/stock/issued/:id/edit" component={IssuedItemsForm} />
 <Route path="/organization/logistics/stock/returns" component={ReturnsList} />
 <Route path="/organization/logistics/stock/returns/new" component={ReturnsForm} />
 <Route path="/organization/logistics/stock/returns/:id" component={ReturnsForm} />
 <Route path="/organization/logistics/stock/returns/:id/edit" component={ReturnsForm} />
 <Route path="/organization/logistics/stock/ledger" component={StockLedger} />
<Route path="/organization/logistics/stock/batches" component={StockBatchesList} />
 <Route path="/organization/logistics/stock/physical-count/new" component={PhysicalCountForm} />
 <Route path="/organization/logistics/stock/physical-count/:id" component={PhysicalCountForm} />
 <Route path="/organization/logistics/stock/physical-count" component={PhysicalCountList} />
 <Route path="/organization/logistics/stock/transfer-tracking" component={TransferTracking} />
 <Route path="/organization/logistics/stock/scheduled-alerts" component={ScheduledExpiryAlerts} />
 <Route path="/organization/logistics/stock/warehouse-alert-configs" component={WarehouseAlertConfigs} />
 <Route path="/organization/logistics/stock/analytics" component={StockAnalytics} />
                  <Route path="/organization/logistics/stock/adjustments" component={StockAdjustments} />
                  <Route path="/organization/logistics/stock/adjustments/new" component={StockAdjustmentForm} />
                  <Route path="/organization/logistics/stock/transfers" component={WarehouseTransfers} />
                  <Route path="/organization/logistics/stock/transfers/new" component={WarehouseTransferForm} />
                  <Route path="/organization/logistics/stock/expiry" component={ExpiryAlerts} />
                  <Route path="/organization/logistics/fleet" component={FleetManagement} />
 {/* Fleet - Vehicles */}
 <Route path="/organization/logistics/fleet/vehicles" component={VehiclesList} />
 <Route path="/organization/logistics/fleet/vehicles/new" component={VehiclesForm} />
 <Route path="/organization/logistics/fleet/vehicles/:id/detail" component={VehicleDetail} />
 <Route path="/organization/logistics/fleet/vehicles/:id" component={VehiclesForm} />
 <Route path="/organization/logistics/fleet/vehicles/:id/edit" component={VehiclesForm} />
 {/* Fleet - Drivers */}
 <Route path="/organization/logistics/fleet/drivers" component={DriversList} />
 <Route path="/organization/logistics/fleet/drivers/new" component={DriversForm} />
 <Route path="/organization/logistics/fleet/drivers/:id/detail" component={DriverDetail} />
 <Route path="/organization/logistics/fleet/drivers/:id" component={DriversForm} />
 <Route path="/organization/logistics/fleet/drivers/:id/edit" component={DriversForm} />
 {/* Fleet - Trip Logs */}
 <Route path="/organization/logistics/fleet/trips" component={TripLogsList} />
 <Route path="/organization/logistics/fleet/trips/new" component={TripLogsForm} />
 <Route path="/organization/logistics/fleet/trips/:id/detail" component={TripDetail} />
 <Route path="/organization/logistics/fleet/trips/:id" component={TripLogsForm} />
 <Route path="/organization/logistics/fleet/trips/:id/edit" component={TripLogsForm} />
 {/* Fleet - Maintenance */}
 <Route path="/organization/logistics/fleet/maintenance" component={MaintenanceList} />
 <Route path="/organization/logistics/fleet/maintenance/new" component={MaintenanceForm} />
 <Route path="/organization/logistics/fleet/maintenance/predictor" component={MaintenancePredictor} />
 <Route path="/organization/logistics/fleet/maintenance/:id" component={MaintenanceForm} />
 <Route path="/organization/logistics/fleet/maintenance/:id/edit" component={MaintenanceForm} />
 {/* Fleet - Fuel Tracking */}
 <Route path="/organization/logistics/fleet/fuel" component={FuelTrackingList} />
 <Route path="/organization/logistics/fleet/fuel/new" component={FuelTrackingForm} />
 <Route path="/organization/logistics/fleet/fuel/analytics" component={FuelAnalytics} />
 <Route path="/organization/logistics/fleet/fuel/:id" component={FuelTrackingForm} />
 <Route path="/organization/logistics/fleet/fuel/:id/edit" component={FuelTrackingForm} />

 {/* Fleet - Compliance Tracking */}
 <Route path="/organization/logistics/fleet/compliance" component={ComplianceList} />
 <Route path="/organization/logistics/fleet/compliance/new" component={ComplianceForm} />
 <Route path="/organization/logistics/fleet/compliance/dashboard" component={ComplianceDashboard} />
 <Route path="/organization/logistics/fleet/compliance/:id" component={ComplianceForm} />
 <Route path="/organization/logistics/fleet/compliance/:id/edit" component={ComplianceForm} />

 {/* ERP Integration */}
 <Route path="/organization/logistics/erp/vendor-integration" component={VendorIntegration} />
 <Route path="/organization/logistics/erp/procurement-linkage" component={ProcurementLinkage} />
 <Route path="/organization/logistics/erp/finance-linkage" component={FinanceModuleLinkage} />

 {/* Reporting & Analytics */}
 <Route path="/organization/logistics/reporting/fleet-dashboard" component={FleetDashboard} />
 <Route path="/organization/logistics/reporting/kpi-reports" component={KPIReports} />
 <Route path="/organization/logistics/reporting/export" component={ExportVisualization} />

 {/* Governance */}
 <Route path="/organization/logistics/governance/auto-numbering" component={AutoNumberingTemplates} />
 <Route path="/organization/logistics/governance/rbac" component={RoleBasedAccessControl} />
 <Route path="/organization/logistics/governance/audit-trail" component={AuditTrailCompliance} />
 <Route path="/organization/logistics/governance/workflow" component={WorkflowAutomation} />

 <Route path="/organization/logistics/tracker" component={ProcurementTracker} />
 <Route path="/organization/logistics/procurement-workspace/:prId" component={ProcurementWorkspace} />
 <Route path="/organization/logistics/procurement-workspace/tender-information/:id" component={TenderInformation} />
 <Route path="/organization/logistics/procurement-workspace/bid-evaluation-checklist/:id" component={BidEvaluationChecklist} />
 <Route path="/organization/logistics/procurement-workspace/bid-opening-minutes/:id" component={BidOpeningMinutes} />
 <Route path="/organization/logistics/procurement-workspace/competitive-bid-analysis/:id" component={CompetitiveBidAnalysis} />
 <Route path="/organization/logistics/procurement-workspace/contract/:id" component={ContractManagement} />
 <Route path="/organization/logistics/procurement-workspace/sac/:id" component={SACManagement} />
 <Route path="/organization/logistics/procurement-workspace/sac-form/:sacId" component={SACForm} />
 <Route path="/organization/logistics/rfq/:id" component={RFQManagementPage} />
 <Route path="/organization/logistics/rfq/:id/print" component={RFQPrint} />
 <Route path="/organization/logistics/quotation-analysis/:id" component={QuotationAnalysisDetail} />
 <Route path="/organization/logistics/purchase-orders/:id" component={PurchaseOrderDetail} />
 <Route path="/organization/logistics/goods-receipts/:id" component={GoodsReceiptDetail} />
 <Route path="/organization/logistics/payables" component={PRPayablesList} />
 <Route path="/organization/logistics/procurement-package/:prId/print" component={ProcurementPackagePrint} />
 <Route path="/organization/logistics/purchase-orders/:id/print" component={PurchaseOrderPrint} />
 <Route path="/organization/logistics/grn/:id/print" component={GoodsReceiptPrint} />
 <Route path="/organization/logistics/quotation-analysis/:id/print" component={QuotationAnalysisPrint} />
 <Route path="/organization/logistics/quotation-analysis-extended/:id/print" component={QuotationAnalysisExtendedPrint} />
 <Route path="/organization/logistics/bid-analysis/:id/print" component={BidAnalysisPrint} />
 <Route path="/organization/logistics/bid-opening-minutes/:id/print" component={BidOpeningMinutesPrint} />
 <Route path="/organization/logistics/bid-evaluation-checklist/:id/print" component={BidEvaluationChecklistPrint} />
 
 {/* Redirects for legacy routes */}
 <Route path="/projects">
 {() => {
 window.location.href = '/organization/projects';
 return null;
 }}
 </Route>
 
  {/* Public Verification Page */}
  <Route path="/verify/:code" component={VerifySignature} />

  {/* 404 Page */}
  <Route path="/404" component={NotFound} />
 
 {/* Fallback */}
 <Route component={NotFound} />
 </Switch>
 </Suspense>
 </AppShell>
 );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
// to keep consistent foreground/background color across components
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
