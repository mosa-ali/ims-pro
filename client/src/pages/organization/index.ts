// =============================================================================
// DASHBOARD MODULE INDEX
// =============================================================================
// Export all dashboard components, types, constants, and utilities
// for clean imports throughout the application.
// =============================================================================

// Main Dashboard Component
export { MainDashboard } from "@/components/dashboard/MainDashboard";

// Types
export type {
  DashboardSummary,
  WorkflowCount,
  PendingApproval,
  Task,
  ModuleMetric,
  ModuleQuickAction,
  ModuleSnapshot,
  Alert,
  Deadline,
  ActivityItem,
  HealthDimension,
  HumanitarianFootprint,
  OrganizationDashboardData,
  DashboardContextUser,
  DashboardContextOrganization,
  DashboardContextOperatingUnit,
  DashboardPermissions,
  TranslationContext,
} from "./types";

// Constants
export {
  ROUTES,
  RBAC_MODULES,
  WORKFLOW_TYPES,
  SEVERITY_CONFIG,
  HEALTH_STATUS_CONFIG,
  MODULE_ICONS,
  DASHBOARD_REFRESH_INTERVAL,
  LIST_LIMITS,
} from "./constants";

// Utilities
export {
  formatCurrency,
  formatCompactNumber,
  formatPercentage,
  formatDate,
  formatRelativeTime,
  getDaysUntilDeadline,
  getDeadlineUrgency,
  getSeverityClasses,
  getHealthStatusClasses,
  calculateOverallHealthScore,
  getHealthStatusFromScore,
  sortAlertsBySeverity,
  truncateText,
  generateListKey,
  isEmpty,
  buildModuleRoute,
  getTrendIndicator,
  formatWorkflowLabel,
} from "./utils";
