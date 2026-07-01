/**
 * server/engines/finance/index.ts - CORRECTED
 *
 * Finance Engines Export Hub
 * Central export point for all finance sub-engines.
 * FIXED: Exports correct types that actually exist in engine files
 */

export {
  GeneralLedgerEngine,
  getGeneralLedgerEngine,
  type GLPostingRequest,
  type AuditTrailEntry,
} from './GeneralLedgerEngine';

export {
  TrialBalanceEngine,
  type TrialBalance,
} from './TrialBalanceEngine';

export {
  FinancialStatementEngine,
  getFinancialStatementEngine,
  type FinancialStatementData,
  type BalanceSheet,
  type IncomeStatement,
} from './FinancialStatementEngine';

export {
  ReconciliationEngine,
  getReconciliationEngine,
  type ReconciliationResult,
} from './ReconciliationEngine';

export {
  FinancialRiskEngine,
  getFinancialRiskEngine,
  type RiskDimension,
  type RiskAssessment,
  type RiskTrend,
} from './FinancialRiskEngine';

export {
  EnhancedComplianceEngine,
  getEnhancedComplianceEngine,
  type ComplianceStatus,
  type ComplianceAssessment,
  type ComplianceRisk,
} from './EnhancedComplianceEngine';

export {
  CurrencyEngine,
  getCurrencyEngine,
  type ExchangeRate,
  type ConversionResult,
  type CurrencyExposure,
  type FXGainLoss,
  type CurrencyConfig,
} from './CurrencyEngine';

export {
  FinancialReportingEngine,
  getFinancialReportingEngine,
  type ReportType,
  type ReportMetadata,
  type MonthlyFinancialReport,
  type BudgetVsActualReport,
  type TrialBalanceReport,
  type BalanceSheetReport,
  type CashFlowReport,
  type IncomeStatementReport,
  type DonorFinancialReport,
} from './FinancialReportingEngine';

export {
  P2PPipelineEngine,
  getP2PPipelineEngine,
  type P2PStage,
  type P2PItem,
  type P2PTransaction,
  type P2PPipelineMetrics,
  type P2PCompliance,
} from './P2PPipelineEngine';

// CORRECTED: Export actual types from FinancialHealthEngine
// NOT HealthScore, ProjectHealth (which don't exist)
export {
  FinancialHealthEngine,
  getFinancialHealthEngine,
  type HealthDimension,
  type FinancialHealth,
} from './FinancialHealthEngine';

// CORRECTED: Export actual types from AIExecutiveEngine
// NOT Recommendation, InsightCategory (which don't exist)
export {
  AIExecutiveEngine,
  getAIExecutiveEngine,
  type BudgetOverrunAlert,
  type UnderutilizedGrant,
  type CashShortageAlert,
  type AnomalyDetection,
  type ExecutiveInsight,
  type ExecutiveSummary,
} from './AIExecutiveEngine';
