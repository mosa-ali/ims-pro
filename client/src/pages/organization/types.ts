// =============================================================================
// DASHBOARD TYPE DEFINITIONS
// Matches dashboardRouter output types exactly
// =============================================================================

export interface DashboardSummary {
  totalProjects: number;
  activeProjects: number;
  totalBudget: number;
  budgetUtilization: number;
  activeGrants: number;
  totalWorkforce: number;
  pendingProcurements: number;
  inventoryAlerts: number;
}

export interface WorkflowCount {
  type: string;
  count: number;
  label: string;
  labelAr?: string;
  route: string;
}

export interface PendingApproval {
  id: string;
  type: string;
  reference: string;
  title: string;
  submittedBy: string;
  submittedAt: string;
  amount?: number;
  currency?: string;
  route: string;
}

export interface Task {
  id: string;
  title: string;
  dueDate: string;
  priority: "low" | "medium" | "high";
  status: string;
}

export interface ModuleMetric {
  label: string;
  labelAr?: string;
  value: string | number;
  trend?: "up" | "down" | "stable";
  trendValue?: string;
}

export interface ModuleQuickAction {
  label: string;
  labelAr?: string;
  route: string;
}

export interface ModuleSnapshot {
  module: string;
  label: string;
  labelAr?: string;
  stats: ModuleMetric[];
  route: string;
  quickActions?: ModuleQuickAction[];
}

export interface Alert {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  titleAr?: string;
  message: string;
  messageAr?: string;
  module: string;
  timestamp: string;
  route?: string;
}

export interface Deadline {
  id: string;
  title: string;
  titleAr?: string;
  dueDate: string;
  module: string;
  route?: string;
}

export interface ActivityItem {
  id: string;
  action: string;
  actionAr?: string;
  description: string;
  descriptionAr?: string;
  user: string;
  timestamp: string;
  module: string;
}

export interface HealthDimension {
  dimension: string;
  dimensionAr?: string;
  score: number;
  status: "good" | "warning" | "critical";
  details?: string;
  detailsAr?: string;
}

export interface HumanitarianFootprint {
  totalBeneficiaries: number;
  activeDonors: number;
  operatingCountry: string;  // Current OU's country (Yemen, Cambodia, etc.)
  operatingCountryAr?: string;
  sectors: string[];
  sectorsAr?: string[];
  governorates: string[];
  governoratesAr?: string[];
}

export interface OrganizationDashboardData {
  summary: DashboardSummary;
  workflowCounts: WorkflowCount[];
  pendingApprovals: PendingApproval[];
  myTasks: Task[];
  moduleSnapshots: ModuleSnapshot[];
  criticalAlerts: Alert[];
  upcomingDeadlines: Deadline[];
  recentActivity: ActivityItem[];
  operationalHealth: HealthDimension[];
  humanitarianFootprint: HumanitarianFootprint;
}

// Context types for production integration
export interface DashboardContextUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface DashboardContextOrganization {
  id: string;
  name: string;
  nameAr?: string;
  code: string;
}

export interface DashboardContextOperatingUnit {
  id: string;
  name: string;
  nameAr?: string;
  code: string;
}

export interface DashboardPermissions {
  canView: (module: string) => boolean;
  canModule: (module: string) => boolean;
  isAdmin: boolean;
  isPlatformAdmin: boolean;
}

export interface TranslationContext {
  t: (key: string) => string;
  language: string;
  isRTL: boolean;
  dir: "ltr" | "rtl";
}
