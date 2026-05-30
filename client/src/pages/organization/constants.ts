// =============================================================================
// DASHBOARD CONSTANTS - Routes, Configuration, Module Registry
// =============================================================================

// Production-safe route registry
export const ROUTES = {
  LOGIN: "/login",
  DASHBOARD: "/organization",
  
  // Main Modules
  HR: "/organization/hr",
  FINANCE: "/organization/finance",
  LOGISTICS: "/organization/logistics",
  MEAL: "/organization/meal",
  RISKS: "/organization/risk-compliance",
  PROGRAMS: "/organization/projects",
  DONOR_CRM: "/organization/donor-crm",
  GRANTS: "/organization/grants",
  REPORTS: "/organization/reports-analytics",
  SETTINGS: "/organization/settings",
  
  // Quick Actions
  NEW_PR: "/organization/logistics/purchase-requests/new",
  MY_PRS: "/organization/logistics/my-prs",
  APPROVE_PRS: "/organization/logistics/purchase-requests",
  NEW_STOCK_REQUEST: "/organization/logistics/stock/requests/new",
  LEAVE_REQUEST: "/organization/hr/leave",
  
  // HR Sub-routes
  HR_DIRECTORY: "/organization/hr/directory",
  HR_RECRUITMENT: "/organization/hr/recruitment",
  HR_CONTRACTS: "/organization/hr/contracts",
  
  // Finance Sub-routes
  PAYMENTS: "/organization/finance/payments",
  FINANCE_BUDGETS: "/organization/finance/budgets",
  
  // Logistics Sub-routes
  CONTRACTS: "/organization/logistics/contracts",
  STOCK_ITEMS: "/organization/logistics/stock-items",
  INVENTORY: "/organization/logistics/inventory",
  
  // Grants Sub-routes
  GRANTS_PIPELINE: "/organization/grants/pipeline",
  GRANTS_COMPLIANCE: "/organization/grants/compliance",
  GRANTS_REPORTS: "/organization/grants/reports",
  
  // MEAL Sub-routes
  MEAL_DASHBOARDS: "/organization/meal/dashboards",
  MEAL_DATA_ENTRY: "/organization/meal/data-entry",
  
  // Risk Sub-routes
  RISK_REGISTER: "/organization/risk-compliance/register",
  RISK_INCIDENTS: "/organization/risk-compliance/incidents",
  
  // Donor CRM Sub-routes
  DONOR_REGISTRY: "/organization/donor-crm/registry",
  DONOR_PROPOSALS: "/organization/donor-crm/proposals",
} as const;

export const ROUTE_LABELS = {
  [ROUTES.DASHBOARD]: {
    en: "Dashboard",
    ar: "لوحة التحكم",
  },

  [ROUTES.PROGRAMS]: {
    en: "Program Management",
    ar: "إدارة البرامج",
  },

  [ROUTES.HR]: {
    en: "Human Resources",
    ar: "الموارد البشرية",
  },

  [ROUTES.FINANCE]: {
    en: "Financial Management",
    ar: "الإدارة المالية",
  },

  [ROUTES.LOGISTICS]: {
    en: "Logistics & Procurement",
    ar: "اللوجستيات والمشتريات",
  },

  [ROUTES.MEAL]: {
    en: "MEAL",
    ar: "المتابعة والتقييم والمساءلة والتعلم",
  },

  [ROUTES.RISKS]: {
    en: "Risk & Compliance",
    ar: "المخاطر والامتثال",
  },

  [ROUTES.DONOR_CRM]: {
    en: "Donor CRM",
    ar: "إدارة علاقات المانحين",
  },

  [ROUTES.GRANTS]: {
    en: "Grants Management",
    ar: "إدارة المنح",
  },

  [ROUTES.REPORTS]: {
    en: "Reports & Analytics",
    ar: "التقارير والتحليلات",
  },

  [ROUTES.SETTINGS]: {
    en: "Settings",
    ar: "الإعدادات",
  },
} as const;


// RBAC Module identifiers (must match your backend permission system)
export const RBAC_MODULES = {
  HR: "hr",
  FINANCE: "finance",
  LOGISTICS: "logistics",
  MEAL: "meal",
  RISKS: "risk-compliance",
  PROGRAMS: "programs",
  DONOR_CRM: "donor-crm",
  GRANTS: "grants",
  REPORTS: "reports-analytics",
  SETTINGS: "settings",
  INVENTORY: "inventory",
} as const;

// Workflow type identifiers
export const WORKFLOW_TYPES = {
  PENDING_PR_APPROVALS: "pending_pr_approvals",
  LEAVE_REQUESTS: "leave_requests",
  PENDING_PAYMENTS: "pending_payments",
  PENDING_CONTRACTS: "pending_contracts",
  STOCK_REQUESTS: "stock_requests",
  ACTIVE_RFQS: "active_rfqs",
} as const;

// Alert severity configuration
export const SEVERITY_CONFIG = {
  critical: {
    color: "bg-red-100 text-red-800 border-red-200",
    dotColor: "bg-red-500",
    label: "Critical",
    labelAr: "حرج",
  },
  high: {
    color: "bg-orange-100 text-orange-800 border-orange-200",
    dotColor: "bg-orange-500",
    label: "High",
    labelAr: "عالي",
  },
  medium: {
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    dotColor: "bg-yellow-500",
    label: "Medium",
    labelAr: "متوسط",
  },
  low: {
    color: "bg-blue-100 text-blue-800 border-blue-200",
    dotColor: "bg-blue-500",
    label: "Low",
    labelAr: "منخفض",
  },
} as const;

// Health status configuration (matches ProjectReport.tsx methodology)
export const HEALTH_STATUS_CONFIG = {
  good: {
    color: "text-green-600",
    bgColor: "bg-green-500",
    label: "Healthy",
    labelAr: "صحي",
  },
  warning: {
    color: "text-yellow-600",
    bgColor: "bg-yellow-500",
    label: "Watchlist",
    labelAr: "قائمة المراقبة",
  },
  critical: {
    color: "text-red-600",
    bgColor: "bg-red-500",
    label: "Critical",
    labelAr: "حرج",
  },
} as const;

// Module icon mapping (used by module snapshots)
export const MODULE_ICONS = {
  hr: "Users",
  finance: "DollarSign",
  logistics: "Truck",
  meal: "Target",
  "risk-compliance": "ShieldAlert",
  programs: "FolderKanban",
  "donor-crm": "HeartHandshake",
  grants: "Receipt",
  inventory: "Boxes",
  reports: "BarChart3",
} as const;

// Dashboard refresh interval (ms)
export const DASHBOARD_REFRESH_INTERVAL = 60000; // 1 minute

// Maximum items to display in lists before "View All"
export const LIST_LIMITS = {
  PENDING_APPROVALS: 5,
  TASKS: 5,
  ALERTS: 5,
  ACTIVITIES: 5,
  DEADLINES: 5,
} as const;
