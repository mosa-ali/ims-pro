/**
 * Project Intelligence Type Definitions
 *
 * Defines all types and interfaces for project health, AI insights,
 * and executive dashboard functionality.
 */

// ============================================================================
// Health Score and Status Types
// ============================================================================

export enum ProjectHealthStatus {
  CRITICAL = 'critical',
  NEEDS_ATTENTION = 'needs_attention',
  STABLE = 'stable',
  PERFORMING = 'performing',
}

export enum HealthCategory {
  SCHEDULE = 'schedule',
  BUDGET = 'budget',
  RISK = 'risk',
  STAKEHOLDER = 'stakeholder',
  QUALITY = 'quality',
  RESOURCE = 'resource',
}

// ============================================================================
// Project Health Result Type
// ============================================================================

export interface ProjectHealthMetric {
  category: HealthCategory;
  score: number; // 0-100
  trend: 'improving' | 'stable' | 'declining';
  lastUpdated: Date;
  alerts?: string[];
}

export interface ProjectHealthResult {
  projectId: number;
  projectName: string;
  overallHealthScore: number; // 0-100
  status: ProjectHealthStatus;
  metrics: ProjectHealthMetric[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  lastAssessmentDate: Date;
  nextAssessmentDate: Date;
  criticalIssues: Array<{
    id: string;
    title: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    recommendedAction: string;
  }>;
}

// ============================================================================
// AI Insight Types
// ============================================================================

export interface AIProjectInsight {
  projectId: number;
  projectName: string;
  narrative: string; // AI-generated narrative summary
  keyFindings: string[];
  recommendations: string[];
  riskAssessment: string;
  opportunities: string[];
  confidenceScore: number; // 0-100
  generatedAt: Date;
  dataSourcesUsed: string[];
  caveats?: string[];
}

// ============================================================================
// Executive Report Types
// ============================================================================

export interface ProjectExecutiveReport {
  projectId: number;
  projectName: string;
  health: ProjectHealthResult;
  aiInsight: AIProjectInsight;
  executiveSummary: string;
  criticalActions: Array<{
    priority: 'immediate' | 'urgent' | 'important' | 'monitor';
    action: string;
    owner: string;
    dueDate: Date;
  }>;
}

// ============================================================================
// Portfolio Types
// ============================================================================

export interface PortfolioHealthAggregation {
  organizationId: number;
  operatingUnitId: number;
  totalProjects: number;
  averageHealthScore: number;
  performingCount: number;
  stableCount: number;
  needsAttentionCount: number;
  criticalCount: number;
  portfolioRiskIndex: number; // 0-100
  healthTrend: 'improving' | 'stable' | 'declining';
}

export interface PortfolioRiskDistribution {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface PortfolioExecutiveSummary {
  organizationId: number;
  operatingUnitId: number;
  totalProjects: number;
  performingCount: number;
  stableCount: number;
  needsAttentionCount: number;
  criticalCount: number;
  portfolioRiskIndex: number;
  portfolioNarrative: string;
  portfolioRecommendations: string[];
  portfolioRiskSummary: string;
  averageConfidenceScore: number;
  projectInsights: AIProjectInsight[];
  generatedAt: Date;
}

// ============================================================================
// Executive Dashboard Types
// ============================================================================

export interface DashboardKPI {
  label: string;
  value: number | string;
  target?: number;
  trend?: 'up' | 'down' | 'stable';
  trendPercentage?: number;
  status?: 'good' | 'warning' | 'critical';
}

export interface ProjectCard {
  projectId: number;
  projectName: string;
  healthScore: number;
  status: ProjectHealthStatus;
  progress: number;
  budget: {
    allocated: number;
    spent: number;
    percentage: number;
  };
  schedule: {
    baselineDate: Date;
    currentDate: Date;
    completionDate: Date;
    variance: number;
  };
  risks: number;
  lastUpdated: Date;
}

export interface ExecutiveDashboardData {
  organizationId: number;
  operatingUnitId: number;
  generatedAt: Date;
  portfolioMetrics: {
    totalProjects: number;
    averageHealthScore: number;
    portfolioRiskIndex: number;
    criticalProjects: number;
  };
  kpis: DashboardKPI[];
  portfolioAIInsights: AIProjectInsight[];
  executiveSummary: string;
  riskDistribution: PortfolioRiskDistribution;
  projectCards: ProjectCard[];
  topRisks: Array<{
    projectId: number;
    projectName: string;
    risk: string;
    severity: 'critical' | 'high' | 'medium';
    recommendedAction: string;
  }>;
  opportunities: Array<{
    projectId: number;
    projectName: string;
    opportunity: string;
    potentialImpact: string;
  }>;
}

// ============================================================================
// Service Response Types
// ============================================================================

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  timestamp: Date;
}

// ============================================================================
// Request Filter Types
// ============================================================================

export interface PortfolioFilter {
  organizationId: number;
  operatingUnitId?: number;
  status?: ProjectHealthStatus[];
  riskLevel?: ('low' | 'medium' | 'high' | 'critical')[];
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

export interface ProjectFilter extends PortfolioFilter {
  projectId: number;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface HealthScoreTrend {
  date: Date;
  score: number;
  status: ProjectHealthStatus;
}

export interface ProjectTrendAnalysis {
  projectId: number;
  trend: HealthScoreTrend[];
  averageTrendDirection: 'improving' | 'stable' | 'declining';
  anomalies: Array<{
    date: Date;
    scoreChange: number;
    reason: string;
  }>;
}

export interface RiskTrend {
  date: Date;
  riskCount: number;
  averageSeverity: 'low' | 'medium' | 'high' | 'critical';
}

export interface BenchmarkData {
  organizationId: number;
  metricName: string;
  yourValue: number;
  industryAverage: number;
  percentile: number;
  trend: 'improving' | 'stable' | 'declining';
}
