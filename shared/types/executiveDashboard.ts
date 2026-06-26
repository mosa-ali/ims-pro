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
  accent: "#7C3AED",
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
    it: [
      "Richieste di Ferie in Sospeso",
      "Richieste di Reclutamento",
      "Contratti in Scadenza",
      "Valutazioni delle Prestazioni Dovute",
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
    it: [
      "Pagamenti in Sospeso",
      "Anticipi in Sospeso",
      "Modifiche di Bilancio",
      "Richieste di Contanti",
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
    it: [
      "Richieste di Acquisto in Sospeso",
      "Richieste di Quotazione Aperte",
      "Ordini di Acquisto in Sospeso",
      "Consegne Ritardate",
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
    it: [
      "Rischi Aperti",
      "Rischi Critici",
      "Risultati dell'Audit",
      "Relazioni Scadute",
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
    it: [
      "Richieste di Acquisto Presentate",
      "Riviste",
      "Approvate",
      "Ordini Emessi",
      "Completate",
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
    it: [
      "Richieste di Ferie",
      "Approvazione del Supervisore",
      "Approvazione HR",
      "Completata",
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
    it: ["Risorse Umane", "Finanza", "Programmi", "Monitoraggio e Valutazione", "Logistica", "Approvvigionamento", "IT"],
  },
  contractTypes: {
    en: ["National Staff", "International Staff", "Consultants", "Volunteers"],
    ar: ["الموظفون الوطنيون", "الموظفون الدوليون", "الاستشاريون", "المتطوعون"],
    it: ["Personale Nazionale", "Personale Internazionale", "Consulenti", "Volontari"],
  },
  gender: {
    en: ["Male", "Female"],
    ar: ["ذكر", "أنثى"],
    it: ["Maschio", "Femmina"],
  },
} as const;

/**
 * Procurement Status Categories
 */
export const PROCUREMENT_STATUS = {
  en: ["Draft", "Submitted", "Approved", "Rejected", "Completed"],
  ar: ["مسودة", "مقدم", "موافق عليه", "مرفوض", "مكتمل"],
  it: ["Bozza", "Presentato", "Approvato", "Rifiutato", "Completato"],
} as const;

/**
 * Procurement Categories
 */
export const PROCUREMENT_CATEGORIES = {
  en: ["Assets", "Services", "Construction", "Supplies", "IT Equipment"],
  ar: ["الأصول", "الخدمات", "البناء", "الإمدادات", "معدات تكنولوجيا المعلومات"],
  it: ["Beni", "Servizi", "Costruzione", "Forniture", "Attrezzature IT"],
} as const;

/**
 * Cost Pool Categories
 */
export const COST_POOL_CATEGORIES = {
  en: ["Program Costs", "Support Costs", "HR Costs", "Operations"],
  ar: ["تكاليف البرنامج", "تكاليف الدعم", "تكاليف الموارد البشرية", "العمليات"],
  it: ["Costi del Programma", "Costi di Supporto", "Costi HR", "Operazioni"],
} as const;

/**
 * Sector Categories
 */
export const SECTOR_CATEGORIES = {
  en: ["WASH", "Protection", "Food Security", "Livelihood", "Education", "Health", "Shelter", "Nutrition"],
  ar: ["المياه والصرف الصحي", "الحماية", "الأمن الغذائي", "سبل العيش", "التعليم", "الصحة", "المأوى", "التغذية"],
  it: ["WASH", "Protezione", "Sicurezza Alimentare", "Mezzi di Sussistenza", "Istruzione", "Salute", "Riparo", "Nutrizione"],
} as const;

/**
 * Donor Categories
 */
export const DONOR_CATEGORIES = {
  en: ["DG ECHO", "AICS", "UNICEF", "UNDP", "OCHA", "Other"],
  ar: ["المديرية العامة للحماية المدنية", "الوكالة الإيطالية للتعاون الإنمائي", "اليونيسيف", "برنامج الأمم المتحدة الإنمائي", "مكتب الأمم المتحدة لتنسيق الشؤون الإنسانية", "أخرى"],
  it: ["DG ECHO", "AICS", "UNICEF", "UNDP", "OCHA", "Altro"],
} as const;

/**
 * Risk Matrix Configuration
 */
export const RISK_MATRIX = {
  likelihood: ["Low", "Medium", "High"],
  likelihoodAr: ["منخفض", "متوسط", "عالي"],
  likelihoodIt: ["Basso", "Medio", "Alto"],
  impact: ["Low", "Medium", "High"],
  impactAr: ["منخفض", "متوسط", "عالي"],
  impactIt: ["Basso", "Medio", "Alto"],
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

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Row 1: Executive KPI Header
 */
export interface ExecutiveKPICard {
  id: string;
  title: string;
  titleAr?: string;
  titleIt?: string;
  value: number;
  valueFormatted: string;
  change: number;
  changePercentage: number;
  trend: "up" | "down" | "stable";
  sparklineData: number[];
  icon: string;
  color: string;
  route?: string;
}

export interface ExecutiveKPIRow {
  totalActiveProjects: ExecutiveKPICard;
  totalGrantValue: ExecutiveKPICard;
  budgetUtilization: ExecutiveKPICard;
  activeDonors: ExecutiveKPICard;
  humanResources: ExecutiveKPICard;
  beneficiariesReached: ExecutiveKPICard;
}

/**
 * Row 2: Portfolio Performance
 */
export interface PortfolioTrendDataPoint {
  month: string;
  approvedBudget?: number;
  actualSpending?: number;
  activeProjects?: number;
  completedProjects?: number;
}

export interface PortfolioPerformanceRow {
  budgetVsExpenditureTrend: PortfolioTrendDataPoint[];
  activeProjectsTrend: PortfolioTrendDataPoint[];
}

/**
 * Row 3: Program Portfolio Analytics
 */
export interface PortfolioAnalyticsItem {
  label: string;
  labelAr?: string;
  labelIt?: string;
  value: number;
  percentage: number;
  color: string;
}

export interface ProgramPortfolioAnalyticsRow {
  projectsBySector: PortfolioAnalyticsItem[];
  budgetByDonor: PortfolioAnalyticsItem[];
  projectsByGovernorate: PortfolioAnalyticsItem[];
}

/**
 * Row 4: Operational Action Center
 */
export interface OperationalMetric {
  label: string;
  labelAr?: string;
  labelIt?: string;
  value: number;
  trend?: "up" | "down" | "stable";
  trendValue?: number;
}

export interface OperationalCard {
  id: string;
  title: string;
  titleAr?: string;
  titleIt?: string;
  color: "green" | "blue" | "orange" | "red";
  metrics: OperationalMetric[];
  route?: string;
}

export interface OperationalActionCenterRow {
  humanResources: OperationalCard;
  finance: OperationalCard;
  logisticsProcurement: OperationalCard;
  riskCompliance: OperationalCard;
}

/**
 * Row 5: Approval Pipelines
 */
export interface FunnelStage {
  stage: string;
  stageAr?: string;
  stageIt?: string;
  count: number;
  percentage: number;
}

export interface ApprovalPipelinesRow {
  procurementFunnel: FunnelStage[];
  hrWorkflowFunnel: FunnelStage[];
}

/**
 * Row 6: Human Resources Analytics
 */
export interface HRAnalyticsItem {
  label: string;
  labelAr?: string;
  labelIt?: string;
  value: number;
  percentage: number;
  color: string;
}

export interface HumanResourcesAnalyticsRow {
  employeesByDepartment: HRAnalyticsItem[];
  contractTypes: HRAnalyticsItem[];
  genderDistribution: HRAnalyticsItem[];
}

/**
 * Row 7: Financial Intelligence
 */
export interface GrantBudgetItem {
  grantName: string;
  grantNameAr?: string;
  grantNameIt?: string;
  budget: number;
  spent: number;
  remaining: number;
  utilizationPercentage: number;
}

export interface MonthlyExpenditurePoint {
  month: string;
  amount: number;
}

export interface CostPoolItem {
  label: string;
  labelAr?: string;
  labelIt?: string;
  value: number;
  percentage: number;
  color: string;
}

export interface FinancialIntelligenceRow {
  budgetUtilizationByGrant: GrantBudgetItem[];
  monthlyExpenditure: MonthlyExpenditurePoint[];
  costPoolDistribution: CostPoolItem[];
}

/**
 * Row 8: Procurement Analytics
 */
export interface ProcurementStatusItem {
  status: string;
  statusAr?: string;
  statusIt?: string;
  count: number;
  percentage: number;
  color: string;
}

export interface ProcurementCategoryItem {
  label: string;
  labelAr?: string;
  labelIt?: string;
  value: number;
  percentage: number;
  color: string;
}

export interface ProcurementCycleTimePoint {
  month: string;
  averageApprovalDays: number;
}

export interface ProcurementAnalyticsRow {
  prStatus: ProcurementStatusItem[];
  procurementCategories: ProcurementCategoryItem[];
  procurementCycleTime: ProcurementCycleTimePoint[];
}

/**
 * Row 9: Monitoring & Evaluation
 */
export interface IndicatorProgressItem {
  label: string;
  labelAr?: string;
  labelIt?: string;
  target: number;
  achieved: number;
  percentage: number;
}

export interface BeneficiariesBySectorItem {
  sector: string;
  sectorAr?: string;
  sectorIt?: string;
  male: number;
  female: number;
  total: number;
  color: string;
}

export interface ActivityCompletionItem {
  label: string;
  labelAr?: string;
  labelIt?: string;
  planned: number;
  completed: number;
  percentage: number;
}

export interface MonitoringEvaluationRow {
  indicatorsProgress: IndicatorProgressItem[];
  beneficiariesBySector: BeneficiariesBySectorItem[];
  activityCompletion: ActivityCompletionItem[];
}

/**
 * Row 10: Risk & Compliance
 */
export interface RiskHeatmapCell {
  likelihood: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  count: number;
  color: string;
  risks: string[];
}

export interface RiskHeatmapMatrix {
  cells: RiskHeatmapCell[][];
}

export interface OpenFindingItem {
  category: string;
  categoryAr?: string;
  categoryIt?: string;
  count: number;
  color: string;
}

export interface RiskComplianceRow {
  riskHeatmap: RiskHeatmapMatrix;
  openFindings: OpenFindingItem[];
}

/**
 * Complete Executive Dashboard Data Structure
 */
export interface ExecutiveIntelligenceDashboardData {
  row1: ExecutiveKPIRow;
  row2: PortfolioPerformanceRow;
  row3: ProgramPortfolioAnalyticsRow;
  row4: OperationalActionCenterRow;
  row5: ApprovalPipelinesRow;
  row6: HumanResourcesAnalyticsRow;
  row7: FinancialIntelligenceRow;
  row8: ProcurementAnalyticsRow;
  row9: MonitoringEvaluationRow;
  row10: RiskComplianceRow;
}

/**
 * Generic chart data types
 */
export interface ChartDataPoint {
  x: string | number;
  y?: number;
  [key: string]: string | number | undefined;
}

export interface DonutChartData {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

export interface GaugeChartData {
  value: number;
  max: number;
  percentage: number;
  label: string;
  color: string;
}

export interface HeatmapCell {
  x: string;
  y: string;
  value: number;
  color: string;
}

export interface AnalyticsItem {
  label: string;
  labelAr?: string;
  labelIt?: string;
  value: number;
  percentage?: number;
  color?: string;
}

/**
 * Bottleneck Types (for ExecutiveAlertsPanel)
 */
export interface OverdueProject {
  id: string;
  name: string;
  nameAr?: string;
  nameIt?: string;
  dueDate: Date | string;
  daysOverdue: number;
  status: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  owner?: string;
}

export interface StalledPurchaseRequest {
  id: string;
  prNumber: string;
  title: string;
  titleAr?: string;
  titleIt?: string;
  daysStalledFor: number;
  status: string;
  amount?: number;
  vendor?: string;
}

export interface PendingApproval {
  id: string;
  title: string;
  titleAr?: string;
  titleIt?: string;
  description?: string;
  descriptionAr?: string;
  descriptionIt?: string;
  type: 'budget' | 'procurement' | 'hr' | 'other';
  priority: 'critical' | 'high' | 'medium' | 'low';
  requiredApprovals?: number;
  completedApprovals?: number;
}

export interface Bottleneck {
  overdueProjects: OverdueProject[];
  stalledPRs: StalledPurchaseRequest[];
  pendingApprovals: PendingApproval[];
}

/**
 * Dashboard Statistics Types (for ExecutiveKPIHeader)
 */
export interface DashboardStats {
  totalActiveProjects: number;
  totalBudget: number;
  totalExpenditure: number;
  budgetUtilizationPercentage: number;
  budgetUtilization?: number;
  activeDonors: number;
  beneficiariesReached: number;
  totalBeneficiaries?: number;
  monthlyProjectTrend?: number[];
  monthlyBudgetTrend?: number[];
  monthlyBudgetUtilizationTrend?: number[];
  monthlyDonorTrend?: number[];
  monthlyStaffTrend?: number[];
  monthlyBeneficiaryTrend?: number[];
  projects?: {
    active?: number;
    completed?: number;
    total?: number;
  };
  finance?: {
    totalBudget?: number;
    totalSpent?: number;
    totalRemaining?: number;
    utilizationPercentage?: number;
    budgetUtilization?: number;
    budgetUtilizationTrend: number;
    change: number;
  };
  grants?: {
    total?: number;
    active?: number;
    completed?: number;
  };
  hr?: {
    totalEmployees?: number;
    activeEmployees?: number;
    departments?: number;
  };
  humanitarian?: {
    beneficiariesReached?: number;
    activeBeneficiaries?: number;
    sectors?: number;
    totalBeneficiaries?: number;
  };
}

/**
 * Projects by Governorate Types (for GlobalOperationsMap)
 */
export interface ProjectsByGovernorate {
  country?: string;
  countryAr?: string;
  countryIt?: string;
  projectCount: number;
  activeProjects: number;
  completedProjects: number;
  budget: number;
  expenditure: number;
  latitude?: number;
  longitude?: number;
  governorates?: Array<{
    name: string;
    nameAr?: string;
    nameIt?: string;
    projectCount: number;
    activeProjects: number;
    budget: number;
    expenditure: number;
  }>;
}

/**
 * Deadline Types (for UpcomingDeadlinesPanel)
 */
export interface Deadline {
  id: string;
  title: string;
  titleAr?: string;
  titleIt?: string;
  description?: string;
  descriptionAr?: string;
  descriptionIt?: string;
  dueDate: Date | string;
  category: 'project' | 'grant' | 'approval' | 'report' | 'other';
  priority: 'critical' | 'high' | 'medium' | 'low';
  owner?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'overdue';
  daysRemaining?: number;
}

/**
 * Action Item Types (for CriticalActionCenter)
 */
export interface ActionItem {
  id: string;
  title: string;
  titleAr?: string;
  titleIt?: string;
  description?: string;
  descriptionAr?: string;
  descriptionIt?: string;
  type: 'hr' | 'procurement' | 'finance' | 'projects' | 'other';
  priority: 'critical' | 'high' | 'medium' | 'low';
  assignee?: string;
  dueDate: Date | string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  daysRemaining?: number;
  daysOverdue?: number;
}

/**
 * Complete Dashboard Data with all sections 
 */
export interface CompleteDashboardData {
  kpis?: ExecutiveKPICard[];
  stats?: DashboardStats;
  operations?: {
    governorates: ProjectsByGovernorate[];
  };
  bottlenecks?: Bottleneck;
  deadlines?: Deadline[];
  performance?: PortfolioTrendDataPoint[];
  countries?: ProjectsByGovernorate[];
  hr?: HumanResourcesAnalyticsRow;
  finance?: FinancialIntelligenceRow;
  actions?: ActionItem[];
}
