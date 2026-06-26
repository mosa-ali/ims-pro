/**
 * types/executive.ts
 * Core types for the Executive Intelligence Center
 */

/* ==========================================
   Executive KPI Summary
========================================== */

export interface ExecutiveKPIs {
  // Financial Performance
  totalBudget: number;
  totalSpent: number;
  remainingBalance: number;
  budgetExecution: number;
  burnRate: number;
  totalEmployees: number;

  // Portfolio Overview
  activeProjects: number;
  activeGrants: number;
  activeDonors: number;
  beneficiariesReached: number;

  // Risk & Performance

  complianceScore: number;

  // Resource Mobilization
  fundingPipeline: number;
}

/* ==========================================
   Financial Trends
========================================== */

export interface FinancialTrend {
  month: string;
  budgeted: number;
  spent: number;
  variance: number;
}

/* ==========================================
   Geographic Intelligence
========================================== */

export interface GeographicDistribution {
  country: string | null;
  governorate?: string | null;

  projectCount: number;
  totalBudget: number;
  totalSpent: number;
  beneficiaryCount: number;

  lat: number;
  lng: number;
}

/* ==========================================
   Executive Alerts
========================================== */

export type ExecutiveAlertType =
  | "critical"
  | "warning"
  | "info";

export type ExecutiveAlertCategory =
  | "budget"
  | "compliance"
  | "grant"
  | "project"
  | "activity";

export interface ExecutiveAlert {
  id: string;
  type: ExecutiveAlertType;
  category: ExecutiveAlertCategory;

  message: string;

  referenceId?: string | null;

  date: string;
}

/* ==========================================
   AI Recommendations
========================================== */

export type AIImpactLevel =
  | "high"
  | "medium"
  | "low";

export interface AIRecommendation {
  id: string;

  title: string;

  content: string;

  impact: AIImpactLevel;

  priority: number;

  actionUrl?: string | null;
  category: string;
}

/* ==========================================
   Dashboard Response Models
========================================== */

export interface ExecutiveDashboardResponse {
  kpis: ExecutiveKPIs;
  trends: FinancialTrend[];
  geoData: GeographicDistribution[];
  alerts: ExecutiveAlert[];
  aiInsights: AIRecommendation[];
}

/* ==========================================
   Geographic Map Marker
========================================== */

export interface ExecutiveMapMarker {
  id: string;

  country: string;
  governorate?: string | null;

  lat: number;
  lng: number;

  projectCount: number;
  totalBudget: number;
  totalSpent: number;
  beneficiaryCount: number;
}

/* ==========================================
   Filter Models
========================================== */

export interface ExecutiveDashboardFilters {
  organizationId?: number;
  operatingUnitId?: number;

  projectId?: number;
  grantId?: number;
  donorId?: number;

  startDate?: string;
  endDate?: string;
}
export interface Forecast {
  forecastStatus: "healthy" | "warning" | "critical";
  projectedExhaustionMonths: number;
  avgMonthlyBurn: number;
  remainingBalance: number;
  monthlyTrend: {
    month: string;
    actual: number;
    spent: number;
    forecast: number;
    variance: number;
  }[];
}