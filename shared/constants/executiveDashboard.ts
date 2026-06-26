// =============================================================================
// EXECUTIVE DASHBOARD CONSTANTS
// Configuration for Power BI-style dashboard
// =============================================================================

/**
 * Dashboard Row Identifiers
 */
export const EXECUTIVE_DASHBOARD_ROWS = {
  KPI_HEADER: "row1_kpi_header",
  PORTFOLIO_PERFORMANCE: "row2_portfolio_performance",
  PROGRAM_PORTFOLIO: "row3_program_portfolio",
  OPERATIONAL_ACTION_CENTER: "row4_operational_action_center",
  APPROVAL_PIPELINES: "row5_approval_pipelines",
  HR_ANALYTICS: "row6_hr_analytics",
  FINANCIAL_INTELLIGENCE: "row7_financial_intelligence",
  PROCUREMENT_ANALYTICS: "row8_procurement_analytics",
  MONITORING_EVALUATION: "row9_monitoring_evaluation",
  RISK_COMPLIANCE: "row10_risk_compliance",
} as const;

/**
 * Power BI Color Palette
 */
export const POWER_BI_COLORS = {
  primary: "#0078D4",
  secondary: "#50E6FF",
  success: "#107C10",
  warning: "#FFB900",
  danger: "#D83B01",
  info: "#0078D4",
  light: "#F3F2F1",
  dark: "#323130",
  color: "#7C3AED",
  
  // Sector colors (WASH, Protection, Food Security, etc.)
  sectors: {
    wash: "#0078D4",
    protection: "#107C10",
    foodSecurity: "#FFB900",
    livelihood: "#50E6FF",
    education: "#D83B01",
    health: "#E81828",
    shelter: "#8661C5",
    nutrition: "#F7630C",
  },
  
  // Donor colors
  donors: {
    dgEcho: "#0078D4",
    aics: "#107C10",
    unicef: "#FFB900",
    undp: "#50E6FF",
    ocha: "#D83B01",
    other: "#A4373A",
  },
  
  // Operational card colors
  operational: {
    hr: "#107C10",      // Green
    finance: "#0078D4",  // Blue
    logistics: "#FFB900", // Orange
    risk: "#D83B01",     // Red
  },
  
  // Risk heatmap colors
  risk: {
    low: "#107C10",      // Green
    medium: "#FFB900",   // Yellow
    high: "#D83B01",     // Red
  },
} as const;

/**
 * Chart Configuration
 */
export const CHART_CONFIG = {
  lineChart: {
    strokeWidth: 2,
    dotRadius: 4,
    margin: { top: 5, right: 30, left: 0, bottom: 5 },
  },
  areaChart: {
    strokeWidth: 2,
    margin: { top: 5, right: 30, left: 0, bottom: 5 },
  },
  donutChart: {
    innerRadius: 60,
    outerRadius: 100,
    labelRadius: 130,
  },
  barChart: {
    margin: { top: 20, right: 30, left: 100, bottom: 5 },
    barHeight: 30,
  },
  funnelChart: {
    margin: { top: 20, right: 20, left: 20, bottom: 20 },
  },
  gaugeChart: {
    radius: 80,
    arcWidth: 15,
  },
  heatmapChart: {
    cellSize: 40,
    margin: { top: 20, right: 20, left: 100, bottom: 20 },
  },
} as const;

/**
 * Operational Card Metrics
 */
export const OPERATIONAL_CARD_METRICS = {
  hr: {
    en: [
      "Leave Requests Pending",
      "Recruitment Requests",
      "Contracts Expiring",
      "Performance Reviews Due",
    ],
    ar: [
      "طلبات الإجازة المعلقة",
      "طلبات التوظيف",
      "العقود المنتهية الصلاحية",
      "تقييمات الأداء المستحقة",
    ],
  },
  finance: {
    en: [
      "Payments Pending",
      "Advances Outstanding",
      "Budget Amendments",
      "Cash Requests",
    ],
    ar: [
      "المدفوعات المعلقة",
      "السلفيات المعلقة",
      "تعديلات الميزانية",
      "طلبات النقد",
    ],
  },
  logistics: {
    en: [
      "PR Pending Approval",
      "RFQs Open",
      "POs Pending",
      "Deliveries Delayed",
    ],
    ar: [
      "طلبات الشراء المعلقة",
      "طلبات الأسعار المفتوحة",
      "أوامر الشراء المعلقة",
      "الشحنات المتأخرة",
    ],
  },
  risk: {
    en: [
      "Open Risks",
      "Critical Risks",
      "Audit Findings",
      "Reports Overdue",
    ],
    ar: [
      "المخاطر المفتوحة",
      "المخاطر الحرجة",
      "نتائج التدقيق",
      "التقارير المتأخرة",
    ],
  },
} as const;

/**
 * Funnel Stages
 */
export const FUNNEL_STAGES = {
  procurement: {
    en: [
      "Submitted PRs",
      "Reviewed",
      "Approved",
      "PO Issued",
      "Completed",
    ],
    ar: [
      "طلبات الشراء المقدمة",
      "تمت المراجعة",
      "موافق عليه",
      "تم إصدار أمر الشراء",
      "مكتمل",
    ],
  },
  hr: {
    en: [
      "Leave Requests",
      "Supervisor Approval",
      "HR Approval",
      "Completed",
    ],
    ar: [
      "طلبات الإجازة",
      "موافقة المشرف",
      "موافقة الموارد البشرية",
      "مكتمل",
    ],
  },
} as const;

/**
 * HR Analytics Categories
 */
export const HR_ANALYTICS_CATEGORIES = {
  departments: {
    en: ["HR", "Finance", "Programs", "MEAL", "Logistics", "Procurement", "IT"],
    ar: ["الموارد البشرية", "المالية", "البرامج", "المتابعة والتقييم", "اللوجستيات", "المشتريات", "تكنولوجيا المعلومات"],
  },
  contractTypes: {
    en: ["National Staff", "International Staff", "Consultants", "Volunteers"],
    ar: ["الموظفون الوطنيون", "الموظفون الدوليون", "الاستشاريون", "المتطوعون"],
  },
  gender: {
    en: ["Male", "Female"],
    ar: ["ذكر", "أنثى"],
  },
} as const;

/**
 * Procurement Status Categories
 */
export const PROCUREMENT_STATUS = {
  en: ["Draft", "Submitted", "Approved", "Rejected", "Completed"],
  ar: ["مسودة", "مقدم", "موافق عليه", "مرفوض", "مكتمل"],
} as const;

/**
 * Procurement Categories
 */
export const PROCUREMENT_CATEGORIES = {
  en: ["Assets", "Services", "Construction", "Supplies", "IT Equipment"],
  ar: ["الأصول", "الخدمات", "البناء", "الإمدادات", "معدات تكنولوجيا المعلومات"],
} as const;

/**
 * Cost Pool Categories
 */
export const COST_POOL_CATEGORIES = {
  en: ["Program Costs", "Support Costs", "HR Costs", "Operations"],
  ar: ["تكاليف البرنامج", "تكاليف الدعم", "تكاليف الموارد البشرية", "العمليات"],
} as const;

/**
 * Sector Categories
 */
export const SECTOR_CATEGORIES = {
  en: ["WASH", "Protection", "Food Security", "Livelihood", "Education", "Health", "Shelter", "Nutrition"],
  ar: ["المياه والصرف الصحي", "الحماية", "الأمن الغذائي", "سبل العيش", "التعليم", "الصحة", "المأوى", "التغذية"],
} as const;

/**
 * Donor Categories
 */
export const DONOR_CATEGORIES = {
  en: ["DG ECHO", "AICS", "UNICEF", "UNDP", "OCHA", "Other"],
  ar: ["المديرية العامة للحماية المدنية", "الوكالة الإيطالية للتعاون الإنمائي", "اليونيسيف", "برنامج الأمم المتحدة الإنمائي", "مكتب الأمم المتحدة لتنسيق الشؤون الإنسانية", "أخرى"],
} as const;

/**
 * Risk Matrix Configuration
 */
export const RISK_MATRIX = {
  likelihood: ["Low", "Medium", "High"],
  likelihoodAr: ["منخفض", "متوسط", "عالي"],
  impact: ["Low", "Medium", "High"],
  impactAr: ["منخفض", "متوسط", "عالي"],
} as const;

/**
 * Dashboard Refresh Configuration
 */
export const EXECUTIVE_DASHBOARD_REFRESH = {
  interval: 300000, // 5 minutes
  timeout: 30000,   // 30 seconds
  retries: 3,
} as const;

/**
 * Data Aggregation Periods
 */
export const AGGREGATION_PERIODS = {
  daily: "daily",
  weekly: "weekly",
  monthly: "monthly",
  quarterly: "quarterly",
  yearly: "yearly",
} as const;

/**
 * Tooltip Configuration
 */
export const TOOLTIP_CONFIG = {
  delay: 200,
  position: "auto" as const,
  maxWidth: 300,
} as const;

/**
 * Responsive Breakpoints
 */
export const RESPONSIVE_BREAKPOINTS = {
  mobile: 640,
  tablet: 1024,
  desktop: 1280,
  wide: 1536,
} as const;

/**
 * Animation Configuration
 */
export const ANIMATION_CONFIG = {
  duration: 300,
  easing: "ease-in-out",
  delay: 0,
} as const;
