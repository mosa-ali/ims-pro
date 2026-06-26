import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BrainCircuit,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Calendar,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Target,
  Lightbulb,
  BarChart3,
  Clock,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { AIRecommendation } from "@shared/types/executive";
import { useTranslation } from '@/i18n/useTranslation';

interface Props {
  recommendations: AIRecommendation[];
}

// ─── Internal types ────────────────────────────────────────────────────────────

type InsightPeriod = "daily" | "weekly";

interface DailyInsight {
  id: string;
  title: string;
  content: string;
  impact: "high" | "medium" | "low";
  category: string;
  action: string;
  icon: React.ElementType;
  iconColor: string;
}

interface WeeklyInsight {
  id: string;
  title: string;
  summary: string;
  trend: "up" | "down" | "stable";
  trendLabel: string;
  bullets: string[];
  recommendation: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Derives strategic daily insights from AI recommendations.
 * Converts operational alerts into forward-looking decision guidance.
 * These are STRATEGY recommendations, not alerts — they tell executives WHAT TO DO.
 */
function buildDailyInsights(recommendations: AIRecommendation[]): DailyInsight[] {
  const insights: DailyInsight[] = [];

  for (const rec of recommendations) {
    const category = (rec.category ?? "general").toLowerCase();
    const impact = (rec.impact ?? "medium") as "high" | "medium" | "low";

    // Map each recommendation to a STRATEGIC action insight (not a repeat of the alert)
    if (category === "risk" || rec.id?.includes("risk") || rec.id?.includes("concentration")) {
      insights.push({
        id: rec.id ?? `daily-${insights.length}`,
        title: "Risk Governance Action",
        content: buildStrategicContent(rec, "risk"),
        impact,
        category: "Risk Strategy",
        action: "Convene Risk Committee",
        icon: AlertTriangle,
        iconColor: "text-rose-400",
      });
    } else if (category === "financial" || rec.id?.includes("budget") || rec.id?.includes("under")) {
      insights.push({
        id: rec.id ?? `daily-${insights.length}`,
        title: "Financial Optimization",
        content: buildStrategicContent(rec, "financial"),
        impact,
        category: "Finance Strategy",
        action: "Review Budget Allocation",
        icon: BarChart3,
        iconColor: "text-blue-400",
      });
    } else if (category === "compliance" || rec.id?.includes("grant")) {
      insights.push({
        id: rec.id ?? `daily-${insights.length}`,
        title: "Compliance & Donor Relations",
        content: buildStrategicContent(rec, "compliance"),
        impact,
        category: "Compliance Strategy",
        action: "Initiate Closeout Protocol",
        icon: CheckCircle2,
        iconColor: "text-emerald-400",
      });
    } else if (category === "operational" || rec.id?.includes("stalled") || rec.id?.includes("schedule")) {
      insights.push({
        id: rec.id ?? `daily-${insights.length}`,
        title: "Operational Recovery",
        content: buildStrategicContent(rec, "operational"),
        impact,
        category: "Operations Strategy",
        action: "Assign Recovery Lead",
        icon: Target,
        iconColor: "text-amber-400",
      });
    } else {
      insights.push({
        id: rec.id ?? `daily-${insights.length}`,
        title: rec.title ?? "Strategic Recommendation",
        content: rec.content ?? "",
        impact,
        category: "Portfolio Strategy",
        action: "Review & Act",
        icon: Lightbulb,
        iconColor: "text-teal-400",
      });
    }
  }

  // De-duplicate by category — one strategic insight per domain per day
  const seen = new Set<string>();
  return insights.filter((i) => {
    if (seen.has(i.category)) return false;
    seen.add(i.category);
    return true;
  });
}

/**
 * Converts an alert-style recommendation into a strategic forward-looking insight.
 * The key distinction: alerts say WHAT IS WRONG, insights say WHAT TO DO STRATEGICALLY.
 */
function buildStrategicContent(rec: AIRecommendation, type: string): string {
  const content = rec.content ?? "";

  switch (type) {
    case "risk":
      return `Your risk register requires executive governance, not just operational updates. ${
        content.includes("100%")
          ? "With the entire active portfolio flagged at high/critical severity, this signals a systemic risk management gap — not isolated incidents. Establish a standing Risk Governance Committee with fortnightly executive reviews and mandate mitigation plans for all high+ risks within 5 business days."
          : "Prioritise assigning dedicated risk owners and set 7-day review SLAs for all critical items. Consider engaging an external risk consultant if internal capacity is constrained."
      }`;

    case "financial":
      return `Budget execution misalignment requires strategic reallocation, not just monitoring. ${
        content.includes("50%") || content.includes("20%")
          ? "Under-executing projects risk grant non-compliance and donor confidence erosion. Conduct an emergency budget review this week — identify whether delays stem from procurement, staffing, or scope issues, and reallocate uncommitted funds to delivery-ready activities."
          : "Implement a monthly burn-rate dashboard reviewed at senior management level. Projects exceeding ±15% variance from planned expenditure should trigger automatic CFO review."
      }`;

    case "compliance":
      return `Grant lifecycle management requires proactive donor engagement, not reactive closeout. Initiate stakeholder communication with affected donors now — propose no-cost extensions where applicable, document all deliverables achieved to date, and ensure financial reconciliation is complete before the expiry date. Failure to act within 7 days risks clawback provisions.`;

    case "operational":
      return `Implementation stalling at portfolio level indicates structural execution barriers. Conduct a rapid diagnostic across stalled projects to identify common blockers — procurement delays, staffing gaps, or community access issues. Assign a dedicated Programme Recovery Lead with authority to unblock cross-departmental dependencies. Set weekly milestone checkpoints for the next 4 weeks.`;

    default:
      return content;
  }
}

/**
 * Builds a weekly strategic summary from all recommendations.
 * Synthesises patterns across the week into portfolio-level intelligence.
 */
function buildWeeklyInsights(recommendations: AIRecommendation[]): WeeklyInsight[] {
  const hasRisk       = recommendations.some(r => (r.category === "risk")       || r.id?.includes("risk"));
  const hasFinance    = recommendations.some(r => (r.category === "financial")  || r.id?.includes("budget") || r.id?.includes("under"));
  const hasCompliance = recommendations.some(r => (r.category === "compliance") || r.id?.includes("grant"));
  const hasOps        = recommendations.some(r => (r.category === "operational")|| r.id?.includes("stalled") || r.id?.includes("schedule"));

  const highCount   = recommendations.filter(r => r.impact === "high").length;
  const totalCount  = recommendations.length;
  const weekOf      = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const insights: WeeklyInsight[] = [];

  // ── Portfolio Health Summary ─────────────────────────────────────────
  insights.push({
    id: "weekly-portfolio",
    title: `Portfolio Intelligence Summary — Week of ${weekOf}`,
    summary: `This week's analysis identified ${totalCount} strategic issue${totalCount !== 1 ? "s" : ""} across the portfolio, ${highCount} of which require${highCount === 1 ? "s" : ""} high-priority executive response. ${
      highCount > totalCount / 2
        ? "Portfolio health is under significant pressure and requires immediate leadership attention."
        : highCount > 0
        ? "Portfolio health is moderate with targeted interventions needed."
        : "Portfolio health is stable with no critical escalations this week."
    }`,
    trend: highCount > 2 ? "down" : highCount > 0 ? "stable" : "up",
    trendLabel: highCount > 2 ? "Portfolio Under Pressure" : highCount > 0 ? "Moderate Risk" : "Portfolio Healthy",
    bullets: [
      `${totalCount} strategic recommendation${totalCount !== 1 ? "s" : ""} generated from live ERP data`,
      `${highCount} high-impact item${highCount !== 1 ? "s" : ""} requiring executive decision this week`,
      hasRisk       ? "Risk governance gaps identified — committee escalation required" : "Risk register activity within normal parameters",
      hasFinance    ? "Budget execution variance detected — CFO review recommended" : "Financial health within acceptable thresholds",
      hasCompliance ? "Grant compliance deadlines approaching — donor communication required" : "Grants operating within compliance window",
      hasOps        ? "Operational stalling detected — recovery plans needed" : "Project execution progressing as planned",
    ],
    recommendation: `This week's priority action: ${
      hasRisk
        ? "Convene an emergency Risk Governance Committee. Risk concentration at portfolio level is the highest-severity issue requiring board-level awareness."
        : hasFinance
        ? "Commission an urgent budget re-alignment review across all active projects with >15% variance from planned expenditure."
        : hasCompliance
        ? "Assign a Grants Compliance Officer to manage all expiring grants and open donor communication channels immediately."
        : "Maintain current management cadence. Schedule the next portfolio review in 30 days and monitor leading indicators weekly."
    }`,
  });

  // ── Risk Strategy (if applicable) ──────────────────────────────────
  if (hasRisk) {
    insights.push({
      id: "weekly-risk",
      title: "Weekly Risk Intelligence Brief",
      summary: "Risk register analysis reveals systemic patterns requiring governance-level response, not just operational risk updates.",
      trend: "down",
      trendLabel: "Risk Exposure Elevated",
      bullets: [
        "Critical/high risks represent majority of active risk portfolio",
        "Mitigation plans absent or outdated for significant portion of risks",
        "Risk concentration at portfolio level exceeds safe operational thresholds",
        "Recommend: mandate mitigation plans for all high+ risks within 5 business days",
        "Recommend: establish fortnightly Risk Committee with executive sponsorship",
      ],
      recommendation: "Strategic priority: Transform risk management from a tracking exercise into an active governance function. The volume and severity of current risks indicates the organisation is operating beyond its risk appetite. Board notification may be warranted.",
    });
  }

  // ── Financial Intelligence (if applicable) ──────────────────────────
  if (hasFinance) {
    insights.push({
      id: "weekly-finance",
      title: "Weekly Financial Intelligence Brief",
      summary: "Budget execution analysis reveals misalignment between financial disbursement and programme delivery across multiple projects.",
      trend: "stable",
      trendLabel: "Execution Variance Detected",
      bullets: [
        "Multiple projects showing under-execution relative to timeline",
        "Budget absorption below donor-expected rates — compliance risk emerging",
        "Recommend: emergency budget review across all projects with >15% variance",
        "Recommend: consider reallocation of uncommitted funds to delivery-ready activities",
        "Recommend: monthly burn-rate dashboard at senior management level",
      ],
      recommendation: "Strategic priority: Establish a Financial Execution Task Force to conduct project-by-project budget reviews. Identify systemic blockers (procurement, HR, approvals) and implement corrective measures before next donor reporting cycle.",
    });
  }

  // ── Compliance Intelligence (if applicable) ─────────────────────────
  if (hasCompliance) {
    insights.push({
      id: "weekly-compliance",
      title: "Weekly Compliance & Donor Relations Brief",
      summary: "Grant expiry timeline analysis indicates compliance windows are closing. Proactive donor engagement is required.",
      trend: "stable",
      trendLabel: "Action Required",
      bullets: [
        "Grant(s) entering final 30-day compliance window",
        "Closeout documentation and financial reconciliation must begin immediately",
        "Donor communication should be initiated within 48 hours",
        "No-cost extension requests should be prepared as contingency",
        "Final narrative reports should be drafted this week",
      ],
      recommendation: "Strategic priority: Assign a dedicated Grants Closeout Manager for each expiring grant. Create a closeout checklist and establish daily progress checkpoints for the next 30 days.",
    });
  }

  return insights;
}

// ─── Impact badge config ───────────────────────────────────────────────────────

function impactConfig(impact: string) {
  switch (impact) {
    case "high":   return { label: "High Impact",   cls: "text-rose-400 bg-rose-400/10 border-rose-400/20" };
    case "medium": return { label: "Medium Impact", cls: "text-amber-400 bg-amber-400/10 border-amber-400/20" };
    default:       return { label: "Low Impact",    cls: "text-slate-400 bg-slate-400/10 border-slate-400/20" };
  }
}

function trendIcon(trend: "up" | "down" | "stable") {
  switch (trend) {
    case "up":     return { Icon: TrendingUp,   color: "text-emerald-400" };
    case "down":   return { Icon: TrendingDown, color: "text-rose-400"    };
    default:       return { Icon: BarChart3,    color: "text-amber-400"   };
  }
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ExecutiveAIInsightsPanel({ recommendations }: Props) {
  const { isRTL } = useLanguage();
  const { t }     = useTranslation();

  const [period,   setPeriod]   = useState<InsightPeriod>("daily");
  const [expanded, setExpanded] = useState(false);       // View More / Less toggle
  const [openWeekly, setOpenWeekly] = useState<string | null>(null); // Weekly accordion

  const dailyInsights  = buildDailyInsights(recommendations);
  const weeklyInsights = buildWeeklyInsights(recommendations);

  // How many daily cards to show collapsed vs expanded
  const COLLAPSED_LIMIT = 2;
  const visibleDaily = expanded ? dailyInsights : dailyInsights.slice(0, COLLAPSED_LIMIT);
  const hasMore      = dailyInsights.length > COLLAPSED_LIMIT;

  const isAnalyzing = recommendations.length === 0;

  return (
    <Card className="border-none shadow-sm bg-slate-900 text-white overflow-hidden h-full">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <CardHeader className="border-b border-white/10 py-4 px-6 bg-white/5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-teal-400" />
            <CardTitle className="text-sm font-bold tracking-tight">
              {t.NewDashboardTranslations?.aiStrategicInsights ?? "AI Strategic Insights"}
            </CardTitle>
          </div>

          <div className="flex items-center gap-2">
            {/* Period toggle */}
            <div className="flex items-center bg-white/10 rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setPeriod("daily")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${
                  period === "daily"
                    ? "bg-teal-500 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Calendar className="w-3 h-3" />
                Daily
              </button>
              <button
                onClick={() => setPeriod("weekly")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${
                  period === "weekly"
                    ? "bg-teal-500 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <CalendarDays className="w-3 h-3" />
                Weekly
              </button>
            </div>

            <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30 text-[9px] font-bold uppercase tracking-wider">
              Enterprise v5.2
            </Badge>
          </div>
        </div>

        {/* Period description */}
        <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
          {period === "daily"
            ? `Today's strategic priorities — ${new Date().toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}`
            : `Weekly intelligence synthesis — analysis of all portfolio signals this week`
          }
        </p>
      </CardHeader>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <CardContent className="p-0">

        {/* Analyzing state */}
        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="relative">
              <BrainCircuit className="w-10 h-10 text-teal-400 animate-pulse" />
              <div className="absolute inset-0 rounded-full bg-teal-400/10 animate-ping" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-bold text-slate-200">Analyzing portfolio data...</p>
              <p className="text-[10px] text-slate-400">Strategic insights will appear once sufficient project data is available.</p>
            </div>
          </div>
        )}

        {/* ── DAILY VIEW ─────────────────────────────────────────────── */}
        {!isAnalyzing && period === "daily" && (
          <div className="divide-y divide-white/5">
            {visibleDaily.map((insight, idx) => {
              const { label, cls } = impactConfig(insight.impact);
              const Icon = insight.icon;
              return (
                <div key={insight.id} className="p-6 space-y-3 group hover:bg-white/[0.02] transition-colors">

                  {/* Title row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center">
                        <Icon className={`w-3.5 h-3.5 ${insight.iconColor}`} />
                      </div>
                      <div className="min-w-0">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${insight.iconColor}`}>
                          {insight.category}
                        </span>
                        <p className="text-[11px] font-black text-white uppercase tracking-wide leading-tight mt-0.5">
                          {insight.title}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[9px] font-bold border flex-shrink-0 ${cls}`}>
                      {label}
                    </Badge>
                  </div>

                  {/* Strategic content — differentiated from operational alerts */}
                  <p className="text-[11px] text-slate-300 leading-relaxed pl-9">
                    {insight.content}
                  </p>

                  {/* Action CTA */}
                  <div className="pl-9">
                    <button className="flex items-center gap-1.5 text-[10px] font-black text-teal-400 uppercase tracking-widest hover:text-teal-300 transition-colors">
                      <Sparkles className="w-3 h-3" />
                      {insight.action}
                      <ArrowRight className="w-3 h-3 transform group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* View More / View Less */}
            {hasMore && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="w-full flex items-center justify-center gap-2 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-teal-400 hover:bg-white/[0.02] transition-all"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    View Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    View {dailyInsights.length - COLLAPSED_LIMIT} More Insight{dailyInsights.length - COLLAPSED_LIMIT > 1 ? "s" : ""}
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* ── WEEKLY VIEW ────────────────────────────────────────────── */}
        {!isAnalyzing && period === "weekly" && (
          <div className="divide-y divide-white/5">
            {weeklyInsights.map((insight) => {
              const { Icon, color } = trendIcon(insight.trend);
              const isOpen = openWeekly === insight.id;
              return (
                <div key={insight.id} className="group">
                  {/* Accordion header */}
                  <button
                    className="w-full p-6 flex items-start justify-between gap-4 hover:bg-white/[0.02] transition-colors text-left"
                    onClick={() => setOpenWeekly(isOpen ? null : insight.id)}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`flex-shrink-0 w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center mt-0.5`}>
                        <Icon className={`w-3.5 h-3.5 ${color}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-white uppercase tracking-wide leading-tight">
                          {insight.title}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 leading-relaxed line-clamp-2">
                          {insight.summary}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className={`text-[9px] font-bold border ${
                        insight.trend === "down"   ? "text-rose-400 border-rose-400/30 bg-rose-400/10" :
                        insight.trend === "up"     ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/10" :
                                                     "text-amber-400 border-amber-400/30 bg-amber-400/10"
                      }`}>
                        {insight.trendLabel}
                      </Badge>
                      {isOpen
                        ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                        : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      }
                    </div>
                  </button>

                  {/* Accordion body */}
                  {isOpen && (
                    <div className="px-6 pb-6 space-y-4 border-t border-white/5 pt-4">
                      {/* Bullet points */}
                      <ul className="space-y-2 pl-9">
                        {insight.bullets.map((b, i) => (
                          <li key={i} className="flex items-start gap-2 text-[11px] text-slate-300 leading-relaxed">
                            <div className="w-1 h-1 rounded-full bg-teal-400 flex-shrink-0 mt-1.5" />
                            {b}
                          </li>
                        ))}
                      </ul>

                      {/* Weekly recommendation box */}
                      <div className="ml-9 bg-teal-500/10 border border-teal-500/20 rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-teal-400" />
                          <span className="text-[9px] font-black text-teal-400 uppercase tracking-widest">
                            This Week's Strategic Priority
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-200 leading-relaxed">
                          {insight.recommendation}
                        </p>
                      </div>

                      {/* CTA */}
                      <div className="ml-9">
                        <button className="flex items-center gap-1.5 text-[10px] font-black text-teal-400 uppercase tracking-widest hover:text-teal-300 transition-colors">
                          <Clock className="w-3 h-3" />
                          Schedule Review
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Week footer */}
            <div className="px-6 py-4 flex items-center justify-between">
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">
                <Clock className="w-3 h-3 inline mr-1" />
                Generated {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} · Based on live ERP data
              </p>
              <button className="flex items-center gap-1 text-[10px] font-black text-teal-400 uppercase tracking-widest hover:text-teal-300 transition-colors">
                Export Brief
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
