import React from 'react';
import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, BarChart3, LayoutDashboard, TrendingUp, ShieldAlert } from "lucide-react";

// Strategic Panels
import ExecutivePortfolioPanel from "@/components/executive/ExecutivePortfolioPanel";
import ExecutiveDonorPanel from "@/components/executive/ExecutiveDonorPanel";
import ExecutiveHeader from "./ExecutiveHeader";
import ExecutiveFilterToolbar from "./ExecutiveFilterToolbar";
import ExecutiveSummaryCards from "./ExecutiveSummaryCards";
import ExecutiveFinancialPanel from "./ExecutiveFinancialPanel";
import ExecutiveGeographicPanel from "./ExecutiveGeographicPanel";
import ExecutiveAlertsPanel from "./ExecutiveAlertsPanel";
import ExecutiveRiskPanel from "./ExecutiveRiskPanel";
import ExecutiveAIInsightsPanel from "./ExecutiveAIInsightsPanel";
import { useExecutiveDashboard } from "./useExecutiveDashboard";
import { useTranslation } from '@/i18n/useTranslation';

/**
 * ExecutiveIntelligenceCenter
 * 
 * FINAL PRODUCTION MAIN CONTAINER - MOBILE RESPONSIVE
 * Location: src/pages/ExecutiveIntelligenceCenter.tsx
 * 
 * A high-density strategic command center for organizational leadership.
 * Optimized for both desktop monitoring and mobile field access.
 */
interface ExecutiveIntelligenceCenterProps {
  language?: "en" | "ar" | "it";
  isRTL?: boolean;
  onRefresh?: () => void;
}

export default function ExecutiveIntelligenceCenter({
  language: propLanguage,
  isRTL: propIsRTL,
  onRefresh,
}: ExecutiveIntelligenceCenterProps) {
  const {
    kpis,
    trends,
    geoData,
    alerts,
    aiInsights,
    isLoading,
    projects,
    isError,
    topRisks,
    riskSummary,   // ← ADD
    compliance,    // ← ADD
  } = useExecutiveDashboard();

  const languageContext = useLanguage();
  const { t } = useTranslation();

  // Use props if provided, otherwise fallback to context
  const language =
    propLanguage ?? languageContext.language;

  const isRTL =
    propIsRTL ?? languageContext.isRTL;

  const direction =
    isRTL ? "rtl" : "ltr";

  if (isError) {
  console.error("Executive dashboard error");
}

  return (
    <div 
        dir={direction}
        className="w-full bg-gray-50/50 p-4 md:p-6 space-y-6"
      >
      {/* ── ROW 1: CORE PERFORMANCE KPIS ── */}
      <ExecutiveSummaryCards data={kpis} isLoading={isLoading} />

      {/* ── ROW 2: STRATEGIC ANALYTICS GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Geographic Intelligence: Adaptive scaling for maps and regional data */}
        <div className="lg:col-span-8">
          <ExecutiveGeographicPanel data={geoData} isLoading={isLoading} />
        </div>

        {/* Financial Health: Focused burn rate and expenditure monitoring */}
        <div className="lg:col-span-4">
          <ExecutiveFinancialPanel />
        </div>
      </div>

      {/* ── ROW 3: SPECIALIZED INTELLIGENCE TABS ── */}
      <Tabs defaultValue="portfolio" className="w-full">
        <div className="overflow-x-auto pb-1 scrollbar-none">
          <TabsList className="bg-white border p-1 h-12 gap-1 mb-6 shadow-sm rounded-xl inline-flex min-w-full md:min-w-0">
            <TabsTrigger 
              value="portfolio" 
              className="rounded-lg gap-2 data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 data-[state=active]:shadow-none px-4"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="whitespace-nowrap">Portfolio Performance</span>
            </TabsTrigger>
            <TabsTrigger 
              value="donors" 
              className="rounded-lg gap-2 data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 data-[state=active]:shadow-none px-4"
            >
              <TrendingUp className="w-4 h-4" />
              <span className="whitespace-nowrap">Donor Intelligence</span>
            </TabsTrigger>
            <TabsTrigger 
              value="risk" 
              className="rounded-lg gap-2 data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 data-[state=active]:shadow-none px-4"
            >
              <ShieldAlert className="w-4 h-4" />
              <span className="whitespace-nowrap">Risk & Compliance</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="portfolio" className="mt-0 focus-visible:outline-none">
          <ExecutivePortfolioPanel
            projects={projects}
            isLoading={isLoading}
          />
        </TabsContent>
        <TabsContent value="donors" className="mt-0 focus-visible:outline-none">
          <ExecutiveDonorPanel isLoading={isLoading} />
        </TabsContent>
        <TabsContent value="risk" className="mt-0 focus-visible:outline-none">
          <ExecutiveRiskPanel
            isLoading={isLoading}
            risks={topRisks ?? []}
            riskSummary={riskSummary}   // ← ADD
            compliance={compliance}      // ← ADD
          />
        </TabsContent>
      </Tabs>

      {/* ── ROW 4: OPERATIONAL FLAGS & AI STRATEGY ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Merged operational alerts and system-generated validation flags */}
        <ExecutiveAlertsPanel alerts={alerts} />
        
        {/* High-impact strategic management recommendations */}
        <ExecutiveAIInsightsPanel recommendations={aiInsights} />
      </div>

      {/* ── FOOTER: SYSTEM BRANDING & VERSIONING ── */}
      <footer className="pt-6 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 opacity-60">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-teal-700" />
          <span className="font-display text-lg font-bold text-slate-900 uppercase tracking-tighter">Organizational Dashboard</span>
        </div>
        <p className="text-[10px] md:text-xs font-medium text-slate-500 text-center">
        </p>
        <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <span>{new Date().getFullYear()} © Integrated Management System</span>
        </div>
      </footer>
    </div>
  );
}
