import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOperatingUnit } from "@/contexts/OperatingUnitContext";

import type {
  ExecutiveKPIs,
  FinancialTrend,
  ExecutiveAlert,
  AIRecommendation
} from "@shared/types/executive";

interface CompliancePosture {
  compliancePercentage: number;
  healthStandard: "High" | "Medium" | "Low";
  description: string;
  incidentCount: number;
  lastUpdated: Date;
}

type UIRisk = {
  id: number;
  title: string;
  category:
    | "financial"
    | "security"
    | "operational"
    | "environmental"
    | "legal"
    | "reputational"
    | "strategic"
    | "compliance"
    | "technological"
    | "other";
  level: "low" | "medium" | "high" | "critical";
  owner: string;
  score: number;
};

export function useExecutiveDashboard() {
  const { currentOrganizationId } = useOrganization();
  const { currentOperatingUnitId } = useOperatingUnit();

  const queryEnabled =
    !!currentOrganizationId && !!currentOperatingUnitId;

  const commonOptions = {
    enabled: queryEnabled,
    staleTime: 300000,
    refetchOnWindowFocus: false,
  };

  // ── Queries ────────────────────────────────────────────────────────────────

  const kpisQuery =
    trpc.executiveDashboard.getStats.useQuery({}, commonOptions);

  const trendsQuery =
    trpc.executiveDashboard.getPortfolioTrends.useQuery(undefined, commonOptions);

  // getGeographicProjects returns a plain ProjectMapData[] array.
  // operatingUnitCountry comes from kpisQuery (ouCountry field).
  // The hook assembles them into the shape ExecutiveGeographicPanel expects.
  const geoQuery =
    trpc.executiveDashboard.getGeographicProjects.useQuery(undefined, commonOptions);

  const forecastQuery =
    trpc.executiveDashboard.getForecastingData.useQuery(undefined, commonOptions);

  const alertsQuery =
    trpc.executiveDashboard.getExecutiveAlerts.useQuery(undefined, commonOptions);

  const aiInsightsQuery =
    trpc.executiveDashboard.getAIInsights.useQuery(undefined, commonOptions);

  // FIX A: topRisksQuery was calling trpc.projectIntelligence.getTopRisks
  // with { limit: 10 } but:
  //   - executiveDashboardRouter.getTopRisks takes NO input (hardcodes .limit(10))
  //   - projectIntelligence router may not expose getTopRisks at all
  // Correct: use executiveDashboard.getTopRisks which is the confirmed procedure.
  const topRisksQuery =
    trpc.executiveDashboard.getTopRisks.useQuery(undefined, commonOptions);

    const riskSummaryQuery =
      trpc.executiveDashboard.getExecutiveRiskSummary.useQuery(
        undefined,
        commonOptions
      );

  // FIX B: complianceQuery was calling trpc.projectIntelligence.getCompliancePosture
  // which does NOT exist in any router — this caused isError=true on every load,
  // which made the entire dashboard surface an error state.
  // Removed this query entirely. Compliance score comes from kpisQuery.complianceScore.
  // If a dedicated compliance procedure is added later, re-wire it here.

  const portfolioProjectsQuery =
    trpc.executiveDashboard.getPortfolioProjects.useQuery(undefined, commonOptions);

  // ── Derived data ───────────────────────────────────────────────────────────

  const formattedRisks: UIRisk[] = (topRisksQuery.data ?? []).map((risk) => ({
    id: risk.id,
    title: risk.title ?? "Untitled Risk",
    // Normalize category to allowed union values
    category: (
      [
        "financial","security","operational","environmental",
        "legal","reputational","strategic","compliance","technological",
      ].includes(risk.category ?? "")
        ? risk.category
        : "other"
    ) as UIRisk["category"],
    level: (risk.level ?? "medium") as UIRisk["level"],
    owner:
      typeof risk.owner === "number"
        ? `User ${risk.owner}`
        : risk.owner ?? "Unknown",
    score: risk.score ?? 0,
  }));

  // ── Loading / error ────────────────────────────────────────────────────────

  const isLoading =
    kpisQuery.isLoading ||
    trendsQuery.isLoading ||
    geoQuery.isLoading ||
    forecastQuery.isLoading ||
    alertsQuery.isLoading ||
    aiInsightsQuery.isLoading ||
    portfolioProjectsQuery.isLoading ||
    topRisksQuery.isLoading;
    topRisksQuery.isLoading || riskSummaryQuery.isLoading;

  // FIX B: complianceQuery.isLoading removed — procedure didn't exist

  const isError =
    kpisQuery.isError ||
    trendsQuery.isError ||
    geoQuery.isError ||
    forecastQuery.isError ||
    alertsQuery.isError ||
    aiInsightsQuery.isError ||
    portfolioProjectsQuery.isError ||
    topRisksQuery.isError;
    topRisksQuery.isError   || riskSummaryQuery.isError;

  // FIX B: complianceQuery.isError removed — was causing permanent isError=true

  // ── KPI shape ──────────────────────────────────────────────────────────────

  const kpis: ExecutiveKPIs = {
    totalBudget:        kpisQuery.data?.totalBudget ?? 0,
    totalSpent:         kpisQuery.data?.totalSpent ?? 0,
    remainingBalance:   kpisQuery.data?.remainingBalance ?? 0,
    budgetExecution: kpisQuery.data?.budgetExecution ?? 0,
    burnRate:           kpisQuery.data?.burnRate ?? 0,
    totalEmployees:     kpisQuery.data?.totalEmployees ?? 0,
    activeProjects:     kpisQuery.data?.activeProjects ?? 0,
    activeGrants:       kpisQuery.data?.activeGrants ?? 0,
    activeDonors:       kpisQuery.data?.activeDonors ?? 0,
    beneficiariesReached: kpisQuery.data?.beneficiariesReached ?? 0,
    complianceScore:    kpisQuery.data?.complianceScore ?? 0,
    fundingPipeline:    kpisQuery.data?.fundingPipeline ?? 0,
  };

  // ── geoData assembly ───────────────────────────────────────────────────────
  //
  // FIX C (PRIMARY MAP FIX):
  //
  // BEFORE (broken):
  //   geoData = geoQuery.data ?? { operatingUnitCountry: null, projects: [] }
  //
  //   Problem: geoQuery (getGeographicProjects) returns a PLAIN ARRAY.
  //   Falling back to { operatingUnitCountry: null, projects: [] } only applies
  //   when geoQuery.data is undefined (loading). Once data arrives, geoData IS
  //   the plain array, which has no operatingUnitCountry field.
  //   ExecutiveGeographicPanel's Array.isArray() guard catches this correctly
  //   and sets operatingUnitCountry = null → map shows "Unknown".
  //
  // AFTER (fixed):
  //   Assemble the shape the panel expects here in the hook,
  //   using ouCountry from kpisQuery which is WHERE the backend puts it.
  //   This is the correct single source of truth.
  //
  const geoData = {
    operatingUnitCountry: kpisQuery.data?.ouCountry ?? null,
    projects: geoQuery.data ?? [],
  };

  // ── Compliance posture (derived from available data) ───────────────────────
  //
  // FIX B (continued): Since getCompliancePosture doesn't exist yet,
  // build a derived compliance posture from kpisQuery.complianceScore
  // so the rest of the UI still has something to render.
  //

  const riskSummary = riskSummaryQuery.data
  ? {
      severity: riskSummaryQuery.data.severity,
      status:   riskSummaryQuery.data.status,
      exposure: riskSummaryQuery.data.exposure,
    }
  : undefined;

  const complianceScore = kpisQuery.data?.complianceScore ?? 0;
const compliance: CompliancePosture = {
  compliancePercentage: complianceScore,
  healthStandard:
    complianceScore >= 80 ? "High" : complianceScore >= 60 ? "Medium" : "Low",
  description:
    `Organization is meeting ${complianceScore}% of audit and donor reporting ` +
    `requirements on-time and with verified data integrity.`,
  incidentCount: riskSummaryQuery.data?.openIncidents ?? 0, // ← live, not hardcoded
  lastUpdated: new Date(),
};

  // ── Return ─────────────────────────────────────────────────────────────────

  return {
    kpis,
    riskSummary,
    trends: (trendsQuery.data ?? []) as FinancialTrend[],

    projects: portfolioProjectsQuery.data ?? [],

    // Shape: { operatingUnitCountry: string | null, projects: ProjectMapData[] }
    // ExecutiveGeographicPanel consumes this to resolve the correct GeoJSON file.
    geoData,

    forecast: forecastQuery.data,

    topRisks: formattedRisks,

    alerts: (alertsQuery.data ?? []) as ExecutiveAlert[],

    aiInsights: (aiInsightsQuery.data ?? []) as AIRecommendation[],

    compliance,

    isLoading,
    isError,

    refetch: () => {
      kpisQuery.refetch();
      trendsQuery.refetch();
      geoQuery.refetch();
      forecastQuery.refetch();
      alertsQuery.refetch();
      aiInsightsQuery.refetch();
      portfolioProjectsQuery.refetch();
      topRisksQuery.refetch();
      riskSummaryQuery.refetch(); // ← ADD
    },
  };
}