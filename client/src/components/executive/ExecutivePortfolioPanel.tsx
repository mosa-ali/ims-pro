import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, CheckCircle2, Clock, ExternalLink, AlertTriangle, ArrowRight } from "lucide-react";
import { useTranslation } from '@/i18n/useTranslation';
import { useLocation } from "wouter";
import { useNavigate } from"@/lib/router-compat";
import { formatCurrency } from "@/utils/formatters";

interface Governorate {
  governorateId: number;
  governorateName: string;
}

interface PortfolioProject {
  id: number;
  projectCode?: string | null;
  title?: string | null;
  currency?: string | null;

  status:
    | "planning"
    | "active"
    | "on_hold"
    | "completed"
    | "cancelled";

  totalBudget?: string | number | null;
  totalSpent?: string | number | null;

  physicalProgressPercentage?: string | number | null;

  governorates?: Governorate[];

  healthLevel?:
    | "healthy"
    | "watch"
    | "at-risk"
    | "critical";

  overallScore?: number | null;
}

interface Props {
  projects: PortfolioProject[];
  isLoading: boolean;
}

/**
 * ExecutivePortfolioPanel
 * Location: src/components/executive/ExecutivePortfolioPanel.tsx
 * 
 * Strategic overview of all active programs and their health.
 */
export default function ExecutivePortfolioPanel({
  projects,
  isLoading
}: Props) {
    const {language } = useLanguage();
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const navigate = useNavigate();    

  return (
    <Card className="border-none shadow-sm bg-white overflow-hidden">
      <CardHeader className="border-b py-5 px-6 bg-slate-50/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4 text-teal-600" />
            <CardTitle className="text-sm font-bold text-slate-800">
              {t.NewDashboardTranslations.portfolioPerformance ??
                "Portfolio Performance"}
            </CardTitle>
          </div>

          <button 
          onClick={() => navigate("/organization/auto-programs-report")}
          className="text-[10px] font-bold text-teal-700 uppercase tracking-widest hover:underline flex items-center gap-1">
            {t.NewDashboardTranslations.viewDetailedReport ??
              "Detailed Project Matrix"}
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </CardHeader>

  <CardContent className="p-0">
    {isLoading ? (
      <div className="p-6 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-20 w-full rounded-xl"
          />
        ))}
      </div>
    ) : !projects || projects.length === 0 ? (
      <div className="p-8 text-center">
        <p className="text-sm font-medium text-slate-500">
          No portfolio projects available
        </p>

        <p className="text-xs text-slate-400 mt-1">
          Data will appear once projects are synchronized from the system.
        </p>
      </div>
    ) : (
      <div className="divide-y divide-slate-100">
        {projects.map((project) => {
          const budget = Number(project.totalBudget ?? 0);
          const spent = Number(project.totalSpent ?? 0);

          const progress =
            Number(project.physicalProgressPercentage ?? 0);

          const utilization =
            budget > 0 ? (spent / budget) * 100 : 0;

          const healthLevel =
            project.healthLevel ?? "watch";

          const healthColors =
            healthLevel === "healthy"
              ? {
                  icon: "bg-emerald-50 text-emerald-600",
                  badge:
                    "bg-emerald-50 text-emerald-700 border-emerald-200",
                  progress: "bg-emerald-500",
                }
              : healthLevel === "watch"
              ? {
                  icon: "bg-amber-50 text-amber-600",
                  badge:
                    "bg-amber-50 text-amber-700 border-amber-200",
                  progress: "bg-amber-500",
                }
              : healthLevel === "at-risk"
              ? {
                  icon: "bg-rose-50 text-rose-600",
                  badge:
                    "bg-rose-50 text-rose-700 border-rose-200",
                  progress: "bg-rose-500",
                }
              : {
                  icon: "bg-red-50 text-red-700",
                  badge:
                    "bg-red-50 text-red-700 border-red-200",
                  progress: "bg-red-600",
                };

          return (
            <div
              key={project.id}
              className="p-5 hover:bg-slate-50/60 transition-colors"
            >
              {/* HEADER ROW */}
              <div className="flex items-start justify-between gap-4">

                {/* LEFT */}
                <div className="flex items-start gap-4 flex-1 min-w-0">

                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${healthColors.icon}`}
                  >
                    {healthLevel === "healthy" ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : healthLevel === "watch" ? (
                      <Clock className="w-5 h-5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">

                    {/* PROJECT CODE + STATUS */}
                    <div className="flex items-center gap-2 flex-wrap">

                      <span className="font-mono text-sm font-bold text-slate-900">
                        {project.projectCode ?? `PRJ-${project.id}`}
                      </span>

                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase ${healthColors.badge}`}
                      >
                        {healthLevel.replace("-", " ")}
                      </Badge>

                    </div>

                    {/* TITLE */}
                    <p className="text-xs text-slate-500 truncate mt-1">
                      {project.title ?? "Project title not available"}
                    </p>

                    {/* BUDGET + SPENT + SCORE */}
                    <div className="flex items-center gap-3 mt-2 text-[11px] flex-wrap">

                      <span className="font-semibold text-slate-600">
                        Budget:
                      </span>

                      <span className="font-bold text-slate-800">
                        {formatCurrency(
                          budget,
                          project.currency ?? "USD",
                          language
                        )}
                      </span>

                      <span className="text-slate-300">•</span>

                      <span className="font-semibold text-slate-600">
                        Spent:
                      </span>

                      <span className="font-bold text-slate-800">
                        {formatCurrency(
                          spent,
                          project.currency ?? "USD",
                          language
                        )}
                      </span>

                      <span className="text-slate-300">•</span>

                      <span className="font-semibold text-teal-600">
                        Score {Math.round(project.overallScore ?? 0)}
                      </span>

                    </div>

                  </div>
                </div>

                {/* RIGHT SIDE */}
                <div className="w-44 flex-shrink-0">

                  {/* PROGRESS HEADER */}
                  <div className="flex justify-between text-[10px] uppercase tracking-wider text-slate-400 mb-2">

                    <span>
                      {t.NewDashboardTranslations
                        .physicalProgress ?? "Progress"}
                    </span>

                    <span className="font-bold text-slate-700">
                      {progress}%
                    </span>

                  </div>

                  {/* PROGRESS BAR */}
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">

                    <div
                      className={`h-full rounded-full ${healthColors.progress}`}
                      style={{
                        width: `${Math.min(
                          Math.max(progress, 0),
                          100
                        )}%`,
                      }}
                    />

                  </div>

                  {/* UTILIZATION SMALL LABEL */}
                  <div className="mt-2 text-[10px] text-slate-500 font-medium">
                    Utilization:{" "}
                    <span className="font-bold text-slate-700">
                      {utilization.toFixed(0)}%
                    </span>
                  </div>

                </div>
              </div>
            </div>
          );
        })}
      </div>
  )}
</CardContent>
  </Card>
)}