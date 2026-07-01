// ============================================================================
// FINANCE DESIGN SYSTEM — Barrel export
// Import any finance component from "@/app/components/finance"
// ============================================================================

// Tokens & utilities
export * from "./tokens";

// Layout
export { FinanceCard } from "./FinanceCard";
export { WidgetHeader } from "./WidgetHeader";
export { FinancePageHeader } from "./FinancePageHeader";
export type { FinanceNavItem } from "./FinancePageHeader";

// KPI Cards
export { FinanceKpiCard } from "./FinanceKpiCard";
export type { FinanceKpiCardProps } from "./FinanceKpiCard";
export { SparklineCard } from "./SparklineCard";

// Badges & Chips
export { RiskBadge, RiskDot } from "./RiskBadge";
export { ComplianceBadge, ScoreBadge } from "./ComplianceBadge";
export {
  StatusChip,
  AdvanceStatusChip,
  ReportingStatusChip,
  VarianceChip,
  CurrencyBadge,
  PriorityChip,
  DocStatusChip,
  RiskStatusChip,
} from "./StatusChip";

// Filter Bar
export { FinanceFilterBar, FinanceSearchBar } from "./FinanceFilterBar";
export type { FilterDropdown, FilterOption, QuickFilter } from "./FinanceFilterBar";

// Chart Wrapper
export { ChartWrapper } from "./ChartWrapper";

// Executive Table
export { ExecutiveTable } from "./ExecutiveTable";
export type { TableColumn, SortDirection } from "./ExecutiveTable";

// AI Recommendation
export { AIRecommendationPanel, AIRecommendationItem } from "./AIRecommendationCard";
export type { AIRecommendation } from "./AIRecommendationCard";

// Compliance & Risk Indicators
export {
  ComplianceIndicator,
  ComplianceIndicatorGrid,
  HealthGauge,
} from "./ComplianceIndicator";
export type { IndicatorRow } from "./ComplianceIndicator";

// Alerts & Notifications
export { AlertCard, CalendarEventItem } from "./AlertCard";

// State Components
export { LoadingSkeleton, EmptyState, ErrorState } from "./LoadingSkeleton";
