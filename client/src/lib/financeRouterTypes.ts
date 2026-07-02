// ============================================================================
// FINANCE DASHBOARD ROUTER — Client-side type definitions
// Mirror of server/routers/finance/financeDashboardRouter.ts return types.
// Keep in sync with the server router when procedures change.
// ============================================================================

// ─── Shared filter input ──────────────────────────────────────────────────────

export interface FilterInput {
  fiscalYear?: string;
  periodStart: string;
  periodEnd: string;
  currency?: string;
  period?: string;
  projectIds?: number[];
  donorIds?: number[];
}

// ─── Procedure 1: getKPICards ─────────────────────────────────────────────────

export interface KPICardsData {
  totalBudget: number;
  actualExpenditure: number;
  commitments: number;
  cashOnHand: number;
  currentBurnRate: number;
  utilization: number;
  apOverdue: number;
  arTotal: number;
  currency: string;
  timestamp?: string;
}

// ─── Procedure 2: getBudgetTrend ──────────────────────────────────────────────

export interface BudgetTrendPoint {
  name: string;
  budget: number;
  actual: number;
  forecast: number;
  variance: number;
}

// ─── Procedure 3: getCashWaterfall ────────────────────────────────────────────

export interface CashWaterfallData {
  opening: number;
  receipts: number;
  payments: number;
  closing: number;
  netCashFlow: number;
  currency: string;
}

// ─── Procedure 4: getHealthMatrix ────────────────────────────────────────────
export type HealthStatus =
  | "excellent"
  | "good"
  | "warning"
  | "critical";

export type HealthTrend =
  | "improving"
  | "stable"
  | "declining";

export interface HealthDimension {
  dimension: string;
  score: number;
  weight: number;
  status: HealthStatus;
  trend: HealthTrend;
  description?: string;
  details?: string;
}

export interface HealthMatrixData {
  overallScore: number;
  overallStatus: string;
  dimensions: HealthDimension[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

// ─── Procedure 8: getComplianceSummary ───────────────────────────────────────

export interface ComplianceIndicatorItem {
  name: string;
  status: string;
  score: number;
  severity: string;
}

export interface ComplianceSummaryData {
  overallScore: number;
  overallStatus: string;
  compliant: number;
  atRisk: number;
  nonCompliant: number;
  criticalIssues: string[];
  recommendations: string[];
  indicators: ComplianceIndicatorItem[];
}

// ─── Procedure 5: getRiskAlerts ──────────────────────────────────────────────

export interface RiskAlert {
  id: string;
  title: string;
  severity: string;
  riskScore: number;
  category: string;
  mitigationPlan: string;
}

// ─── Procedure 6: getRiskDistribution ────────────────────────────────────────

export interface RiskDistributionItem {
  name: string;
  value: number;
  fill: string;
}

// ─── Procedure 7: getP2PPipeline ─────────────────────────────────────────────

export interface P2PStage {
  stage: string;
  count: number;
  avgDays: number;
  bottlenecks: number;
}

export interface P2PPipelineData {
  totalTransactions: number;
  stages: P2PStage[];
  averageCycleTime: number;
  completionRate: number;
  totalValue: number;
}


// ─── Procedure 9: getAIRecommendations ───────────────────────────────────────

export interface AIRecommendationItem {
  id: string;
  title: string;
  priority: string;
  confidence: number;
  impact: string;
  action: string;
  reason: string;
  category: string;
}

// ─── Procedure 10: getFilterMetadata ─────────────────────────────────────────

export interface FilterMetadata {
  fiscalYears: string[];
  currencies: string[];
  periods: string[];
  organizations: unknown[];
  operatingUnits: unknown[];
  projects: unknown[];
  budgetLines: unknown[];
  expenditureCategories: unknown[];
}

// ─── Procedure 11: getRiskScore ──────────────────────────────────────────────

export interface RiskScoreData {
  overallScore: number;
  level: string;
  trend: string;
  totalExposure: number;
  exposureTrend: string;
  activeRiskCount: number;
  riskCountTrend: string;
}

// ─── Procedure 12: getRiskTrend ──────────────────────────────────────────────

export interface RiskTrendPoint {
  date: string;
  riskScore: number;
}

// ─── Procedure 13: getRiskDimensions ─────────────────────────────────────────

export interface RiskDimensionItem {
  dimension: string;
  score: number;
  status: string;
}

// ─── Procedure 14: getFinancialRisksRegister ─────────────────────────────────

export interface RiskRegisterRow {
  riskId: string;
  description: string;
  category: string;
  probability: number;
  impact: number;
  severity: string;
  owner: string;
  dueDate: string;
  status: string;
  [key: string]: unknown;
}

// ─── Procedure 15: getComplianceScore ────────────────────────────────────────

export interface ComplianceScoreData {
  overallScore: number;
  auditReadiness: number;
  openFindings: number;
  remediationRate: number;
  trend: string;
  auditTrend: string;
  findingsTrend: string;
  remediationTrend: string;
}

// ─── Procedure 16: getComplianceTrend ────────────────────────────────────────

export interface ComplianceTrendPoint {
  date: string;
  score: number;
  target: number;
}

// ─── Procedure 17: getComplianceIndicators ───────────────────────────────────

export interface ComplianceIndicatorRow {
  name: string;
  score: number;
}

// ─── Procedure 18: getComplianceFindings ─────────────────────────────────────

export interface ComplianceFinding {
  title: string;
  category: string;
  severity: string;
  owner: string;
  dueDate: string;
  status: string;
  [key: string]: unknown;
}

// ─── Procedure 19: getAuditSchedule ──────────────────────────────────────────

export interface AuditScheduleEvent {
  id: string;
  title: string;
  date: string;
  type: string;
  status: string;
}

// ─── Procedure: getRiskRegisterStats ─────────────────────────────────────────

export interface RiskRegisterStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  open: number;
  underReview: number;
  resolved: number;
  totalExposure: number;
  currency: string;
}

export const RISK_SORT_FIELDS = [
  "riskId",
  "title",
  "category",
  "likelihood",
  "impact",
  "overallRiskScore",
  "financialExposure",
  "status",
  "detectedAt",
  "dueDate",
] as const;

export type RiskSortField = typeof RISK_SORT_FIELDS[number];

// ─── Procedure: getRiskRegisterPaginated ─────────────────────────────────────

export interface RiskRegisterRecord {
  id: number;
  riskId: string;
  title: string;
  description: string;
  category: string;
  projectCode?: string;
  projectName?: string;
  donorName?: string;
  grantCode?: string;
  likelihood: number;
  impact: number;
  riskScore: number;
  financialExposure: number;
  currency: string;
  status: string;
  owner?: string;
  dueDate?: string;
  detectedDate?: string;
  mitigationPlan?: string;
  hasAiRecommendation: boolean;
  operatingUnit?: string;
  overallRiskScore?: number;
  ownerName?: string;
  detectedAt?: string;
  aiRecommendation?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Procedure: getComplianceFindingsStats ────────────────────────────────────

export interface ComplianceFindingsStats {
  open: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  resolved: number;
  overdue: number;
  avgResolutionDays: number;
  auditReadiness: number;
  complianceScore: number;
}

// ─── Procedure: getComplianceFindingsPaginated ────────────────────────────────

export interface ComplianceFindingRecord {
  id: string;
  findingId: string;
  title: string;
  description?: string;
  findingType: string;
  severity: string;
  projectCode?: string;
  projectName?: string;
  referenceTable?: string;
  referenceRecord?: string;
  assignedTo?: string;
  targetDate?: string;
  status: string;
  createdDate?: string;
  resolvedDate?: string;
  recommendation?: string;
  hasAiRecommendation: boolean;
  operatingUnit?: string;
  [key: string]: unknown;
}

// ─── Procedure: getAIRecommendationsByRisk / ByFinding ───────────────────────

export interface FullAIRecommendation {
  id: string;
  priority: string;
  category: string;
  confidence: number;
  title: string;
  reasoning: string;
  recommendation: string;
  expectedImpact: string;
  estimatedSavings?: number;
  currency?: string;
  status: "pending" | "accepted" | "dismissed" | "implemented";
  createdAt?: string;
}

// ─── Router Response Envelope ────────────────────────────────────────────────

export interface RouterResponse<T> {
  status: 'ok' | 'error' | 'not_found' | 'empty';
  data?: T;
  message?: string;
  timestamp: Date;
}

export interface PaginatedRouterResponse<T> {
  status: 'ok' | 'error' | 'empty';
  data: PaginatedResponse<T>;
  timestamp: Date;
  message?: string;
}

// ─── Finance Reporting ────────────────────────────────────────────────────────

export interface FinanceReporting {

  // Categories
  financialStatements: string;
  donorReports: string;
  managementReports: string;
  complianceReports: string;
  executiveReports: string;

  // Financial Statements
  monthlyFinancialReport: string;
  quarterlyReport: string;
  semiAnnualReport: string;
  annualReport: string;
  executiveSummary: string;
  budgetVsActual: string;
  cashFlowStatement: string;
  incomeStatement: string;
  balanceSheet: string;
  trialBalance: string;
  generalLedgerSummary: string;

  // Donor Reports
  grantFinancialReport: string;
  donorUtilizationReport: string;
  costShareReport: string;
  budgetPerformance: string;
  pipelineReport: string;
  grantClosureReport: string;

  // Management Reports
  projectFinancialHealth: string;
  cashPosition: string;
  liquidityReport: string;
  treasuryPosition: string;
  commitments: string;
  accountsPayable: string;
  accountsReceivable: string;
  bankReconciliation: string;
  budgetForecast: string;
  burnRateAnalysis: string;
  varianceAnalysis: string;
  expenseAnalysis: string;
  revenueAnalysis: string;
  procurementFinancialSummary: string;
  payrollFinancialSummary: string;
  assetFinancialSummary: string;

  // Compliance
  auditReadiness: string;
  financialCompliance: string;
  outstandingAdvances: string;
  supportingDocuments: string;
  journalValidation: string;
  budgetCompliance: string;
  bankReconciliationStatus: string;
  grantCompliance: string;
  vatCompliance: string;
  segregationOfDuties: string;

  // Executive
  executiveFinancialSummary: string;
  countryOfficeSummary: string;
  operatingUnitSummary: string;
  organizationSummary: string;
  multiCountrySummary: string;
  consolidatedFinancialReport: string;
  financialKPIBook: string;
  boardReport: string;

  // KPI Labels
  totalBudget: string;
  actualExpenditure: string;
  availableBudget: string;
  netIncome: string;
  budgetUtilization: string;

  // Periods
  monthly: string;
  quarterly: string;
  semiAnnual: string;
  annual: string;
  customRange: string;

  // Status
  all: string;
  draft: string;
  final: string;
  archived: string;

  // Workspace
  selectReport: string;
  generated: string;
  period: string;
  fiscalYear: string;
  reportDetails: string;
  reportHistory: string;

  // Buttons
  print: string;
  exportPdf: string;
  exportExcel: string;
  download: string;
  generate: string;
  refresh: string;
  reset: string;

  // Tables
  categoryProject: string;
  budgeted: string;
  actual: string;
  variance: string;
  variancePercent: string;
  forecast: string;
  totals: string;

  reportName: string;
  format: string;
  generatedAt: string;
  status: string;

  // Empty States
  noReportSelected: string;
  noReportSelectedDescription: string;
  noReportData: string;
  noHistory: string;
  noCashFlowData: string;
  noTrialBalanceData: string;

  // AI
  aiFinancialInsights: string;
  overspend: string;
  burnRate: string;
  monthsLeft: string;
  projected: string;
  review: string;
  dismiss: string;

  // Settings
  reportSettings: string;
  scheduledReports: string;
  newSchedule: string;
  sendNow: string;
  edit: string;
  systemIntegrity: string;
  reportComparison: string;
  saveSettings: string;

}

// ─── Component Props ──────────────────────────────────────────────────────────

export interface FinancePageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  timestamp?: string;
  actions?: React.ReactNode;
  isRTL?: boolean;
}

export interface FinanceKpiCardProps {
  label: string;
  value: string | number;
  meta?: string;
  trend?: number;
  upIsGood?: boolean;
  icon?: React.ReactNode;
  valueColor?: string;
  progressValue?: number;
  accent?: string;
  className?: string;
  numericDir?: 'ltr' | 'rtl';
}

// ─── Input Types for Router Procedures ────────────────────────────────────────

export interface GetRisksInput {
  organizationId: number;
  operatingUnitId?: number | undefined;
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  riskLevel?: 'critical' | 'high' | 'medium' | 'low';
  status?: string;
  likelihood?: string;
  impact?: string;
  ownerId?: number;
  projectId?: number;
  donorId?: number;
  startDate?: string;
  endDate?: string;
}

export interface ExportRegisterInput {
  organizationId: number;
  operatingUnitId?: number;
  search?: string;
  category?: string;
  likelihood?: 'low' | 'medium' | 'high' | 'critical';
  impact?: 'low' | 'medium' | 'high' | 'critical';
  status?: string;
  ids?: number[];
}

// ─── Zero-value fallbacks (used while loading / on error) ─────────────────────

export const EMPTY_KPI: KPICardsData = {
  totalBudget: 0, actualExpenditure: 0, commitments: 0,
  cashOnHand: 0, currentBurnRate: 0, utilization: 0,
  apOverdue: 0, arTotal: 0, currency: "USD",
};

export const EMPTY_WATERFALL: CashWaterfallData = {
  opening: 0, receipts: 0, payments: 0, closing: 0, netCashFlow: 0, currency: "USD",
};

export const EMPTY_P2P: P2PPipelineData = {
  totalTransactions: 0, stages: [], averageCycleTime: 0, completionRate: 0, totalValue: 0,
};

export const EMPTY_COMPLIANCE: ComplianceSummaryData = {
  overallScore: 0, overallStatus: "unknown", compliant: 0, atRisk: 0,
  nonCompliant: 0, criticalIssues: [], recommendations: [], indicators: [],
};

export const EMPTY_HEALTH: HealthMatrixData = {
  overallScore: 0, overallStatus: "unknown", dimensions: [],
  strengths: [], weaknesses: [], recommendations: [],
};

export const EMPTY_RISK_SCORE: RiskScoreData = {
  overallScore: 0, level: "low", trend: "stable",
  totalExposure: 0, exposureTrend: "stable", activeRiskCount: 0, riskCountTrend: "stable",
};

export const EMPTY_COMPLIANCE_SCORE: ComplianceScoreData = {
  overallScore: 0, auditReadiness: 0, openFindings: 0, remediationRate: 0,
  trend: "stable", auditTrend: "stable", findingsTrend: "stable", remediationTrend: "stable",
};

export const EMPTY_RISK_REGISTER_STATS: RiskRegisterStats = {
  total: 0, critical: 0, high: 0, medium: 0, low: 0,
  open: 0, underReview: 0, resolved: 0, totalExposure: 0, currency: "USD",
};

export const EMPTY_COMPLIANCE_FINDINGS_STATS: ComplianceFindingsStats = {
  open: 0, critical: 0, high: 0, medium: 0, low: 0,
  resolved: 0, overdue: 0, avgResolutionDays: 0,
  auditReadiness: 0, complianceScore: 0,
};
