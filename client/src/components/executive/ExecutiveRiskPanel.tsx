import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { ShieldAlert, ShieldCheck, AlertOctagon, TrendingDown, Clock } from "lucide-react";
import { useTranslation } from '@/i18n/useTranslation';
import { useLocation } from "wouter";
import RiskSeverityChart from '@/components/charts/RiskSeverityChart';
import RiskStatusChart from '@/components/charts/RiskStatusChart';
import RiskExposureChart from '@/components/charts/RiskExposureChart';

interface RiskEntry {
  id: number;
  title: string;
  category: string;
  level: "low" | "medium" | "high" | "critical";
  owner: string;
  score: number;
}

interface CompliancePosture {
  compliancePercentage: number;
  healthStandard: "High" | "Medium" | "Low";
  description: string;
  incidentCount: number;
  lastUpdated: Date;
}

interface RiskSummary {
  severity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  status: {
    identified: number;
    mitigated: number;
    accepted: number;
    transferred: number;
    closed: number;
  };
  exposure: Array<{
    projectName: string;
    totalRisks: number;
    criticalRisks: number;
    highRisks: number;
    mediumRisks: number;
    lowRisks: number;
    riskScore?: number;
    percent?: number;
  }>;
}

interface Props {
  isLoading: boolean;
  risks?: RiskEntry[];
  compliance?: CompliancePosture;
  riskSummary?: RiskSummary;
  onViewDashboard?: () => void;
}

/**
 * ExecutiveRiskPanel
 * Location: src/components/executive/ExecutiveRiskPanel.tsx
 */
export default function ExecutiveRiskPanel({
  isLoading,
  risks,
  compliance,
  riskSummary,
  onViewDashboard,
}: Props) {
  const { isRTL } = useLanguage();
  const { t } = useTranslation();
  const [, setLocation] = useLocation();

  const handleViewDashboard = () => {
    if (onViewDashboard) {
      onViewDashboard();
    } else {
      // FIX: correct route path
      setLocation('/organization/risk-compliance/dashboard');
    }
  };

  // FIX: derive a meaningful compliance posture from live risk data
  // when complianceScore from KPIs is 0/missing.
  // Logic: if we have real risk data, compute a posture from severity mix.
  const totalRisks = riskSummary
    ? riskSummary.severity.critical +
      riskSummary.severity.high +
      riskSummary.severity.medium +
      riskSummary.severity.low
    : 0;

  const criticalAndHigh = riskSummary
    ? riskSummary.severity.critical + riskSummary.severity.high
    : 0;

  // Derive health standard from risk severity when complianceScore is unavailable
  const derivedHealthStandard = (): "High" | "Medium" | "Low" => {
    // If backend sends a real compliance score, use it
    if (compliance?.compliancePercentage && compliance.compliancePercentage > 0) {
      return compliance.compliancePercentage >= 80
        ? "High"
        : compliance.compliancePercentage >= 60
        ? "Medium"
        : "Low";
    }
    // Otherwise derive from risk portfolio severity
    if (totalRisks === 0) return "High"; // No risks = clean posture
    const criticalRatio = criticalAndHigh / totalRisks;
    if (criticalRatio > 0.4) return "Low";
    if (criticalRatio > 0.2) return "Medium";
    return "High";
  };

  const derivedPercentage = (): number => {
    if (compliance?.compliancePercentage && compliance.compliancePercentage > 0) {
      return compliance.compliancePercentage;
    }
    // Derive % from risk portfolio: higher critical ratio = lower compliance
    if (totalRisks === 0) return 100;
    const criticalRatio = criticalAndHigh / totalRisks;
    return Math.round(Math.max(10, 100 - criticalRatio * 80));
  };

  const healthStandard = derivedHealthStandard();
  const compliancePercentage = derivedPercentage();

  const borderColor =
    healthStandard === "High"
      ? "border-emerald-500"
      : healthStandard === "Medium"
      ? "border-amber-500"
      : "border-rose-500";

  const iconBg =
    healthStandard === "High"
      ? "bg-emerald-500"
      : healthStandard === "Medium"
      ? "bg-amber-500"
      : "bg-rose-500";

  const openIncidents = compliance?.incidentCount ?? riskSummary?.status.identified ?? 0;

  const defaultRiskSummary: RiskSummary = {
    severity:  { critical: 0, high: 0, medium: 0, low: 0 },
    status:    { identified: 0, mitigated: 0, accepted: 0, transferred: 0, closed: 0 },
    exposure:  [],
  };
  const summary = riskSummary ?? defaultRiskSummary;

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`}>

      {/* ── ROW 1: Three charts ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Severity */}
        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b py-4 px-6 bg-slate-50/30">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <CardTitle className="text-sm font-bold text-slate-800">
                {t.riskCompliance?.severity || "Risk Severity"}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading
              ? <Skeleton className="h-64 w-full rounded-lg" />
              : <RiskSeverityChart data={summary.severity} />
            }
          </CardContent>
        </Card>

        {/* Status */}
        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b py-4 px-6 bg-slate-50/30">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-blue-600" />
              <CardTitle className="text-sm font-bold text-slate-800">
                {t.riskCompliance?.riskStatus || "Risk Status"}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading
              ? <Skeleton className="h-64 w-full rounded-lg" />
              : <RiskStatusChart data={summary.status} />
            }
          </CardContent>
        </Card>

        {/* Project Exposure — button lives INSIDE this card now */}
        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b py-4 px-6 bg-slate-50/30">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-orange-600" />
              <CardTitle className="text-sm font-bold text-slate-800">
                {t.riskCompliance?.projectExposure || "Project Exposure"}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading
              ? <Skeleton className="h-64 w-full rounded-lg" />
              : (
                <RiskExposureChart
                  data={summary.exposure}
                  maxProjects={5}
                  onViewDashboard={handleViewDashboard}
                />
              )
            }
          </CardContent>
        </Card>
      </div>

      {/* ── ROW 2: KPI cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Compliance Posture */}
        <Card className="border-none shadow-sm bg-white overflow-hidden lg:col-span-2">
          <CardHeader className="pb-3 border-b border-slate-50 bg-slate-50/20">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <CardTitle className="text-xs font-black text-slate-500 uppercase tracking-widest">
                {t.riskCompliance?.compliancePosture || "Compliance Posture"}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-24 w-24 rounded-full mx-auto" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="relative">
                  <div className={`w-24 h-24 rounded-full border-[6px] ${borderColor} flex items-center justify-center`}>
                    <span className="text-3xl font-black text-slate-800">
                      {compliancePercentage}%
                    </span>
                  </div>
                  <div className={`absolute -top-1 -right-1 ${iconBg} text-white p-1 rounded-full shadow-sm`}>
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">
                    {t.riskCompliance?.healthStandard || "Health Standard"}: {healthStandard}
                  </h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed px-2">
                    {compliance?.description ||
                      `Organization risk portfolio: ${totalRisks} active risks, ` +
                      `${criticalAndHigh} critical/high priority.`}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Risks / Incidents */}
        <Card className="border-none shadow-sm bg-rose-50 border-rose-100 overflow-hidden lg:col-span-2">
          <CardContent className="p-5 flex items-start gap-4 h-full">
            {isLoading ? (
              <div className="space-y-4 w-full">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>
            ) : (
              <>
                <div className="bg-rose-500 text-white p-2 rounded-xl shadow-lg shadow-rose-200 flex-shrink-0">
                  <AlertOctagon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">
                    {t.riskCompliance?.activeRisks || "Active Risks"}
                  </p>
                  <h3 className="text-2xl font-black text-rose-900 tracking-tighter">
                    {String(openIncidents).padStart(2, '0')}
                  </h3>
                  <p className="text-[9px] font-medium text-rose-700/60 mt-2 italic flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {t.riskCompliance?.lastUpdated || "Last updated"}:{" "}
                    {(compliance?.lastUpdated ?? new Date()).toLocaleString()}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Standalone button REMOVED — now lives inside RiskExposureChart */}
    </div>
  );
}