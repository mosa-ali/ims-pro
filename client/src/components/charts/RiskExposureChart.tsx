import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/i18n/useTranslation";
import { useLocation } from "wouter";

interface ProjectRiskExposure {
  projectName: string;
  totalRisks: number;
  criticalRisks: number;
  highRisks: number;
  mediumRisks: number;
  lowRisks: number;
  riskScore?: number;
  percent?: number;
}

interface Props {
  data: ProjectRiskExposure[];
  maxProjects?: number;
  onViewDashboard?: () => void;
}

/**
 * RiskExposureChart
 * Location: src/components/charts/RiskExposureChart.tsx
 *
 * Custom stacked progress-bar chart — purpose-built for the executive view.
 * Replaces the recharts horizontal BarChart which had layout/overflow issues.
 */
export default function RiskExposureChart({
  data,
  maxProjects = 5,
  onViewDashboard,
}: Props) {
  const { isRTL } = useLanguage();
  const { t } = useTranslation();
  const [, setLocation] = useLocation();

  // Sort by riskScore (weighted) or totalRisks, take top N
  const topProjects = [...data]
    .sort((a, b) => (b.riskScore ?? b.totalRisks) - (a.riskScore ?? a.totalRisks))
    .slice(0, maxProjects);

  const maxScore = Math.max(
    ...topProjects.map((p) => p.riskScore ?? p.totalRisks),
    1
  );

  const SEVERITY = [
    { key: "criticalRisks", label: "Critical", color: "#dc2626", bg: "bg-red-600"    },
    { key: "highRisks",     label: "High",     color: "#f97316", bg: "bg-orange-500" },
    { key: "mediumRisks",   label: "Medium",   color: "#eab308", bg: "bg-yellow-500" },
    { key: "lowRisks",      label: "Low",      color: "#22c55e", bg: "bg-green-500"  },
  ] as const;

  const handleNav = () => {
    if (onViewDashboard) {
      onViewDashboard();
    } else {
      setLocation("/organization/risk-compliance/dashboard");
    }
  };

  if (topProjects.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400">
        <p className="text-sm">
          {t.common?.noData || "No project risk data available"}
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-4 ${isRTL ? "rtl" : "ltr"}`}>
      {/* Project rows */}
      {topProjects.map((project, idx) => {
        const score = project.riskScore ?? project.totalRisks;
        const widthPct = Math.round((score / maxScore) * 100);
        const total = project.totalRisks;

        // Segment widths as % of the project's own bar
        const segments = SEVERITY.map((s) => ({
          ...s,
          count: project[s.key],
          pct: total > 0 ? (project[s.key] / total) * 100 : 0,
        })).filter((s) => s.count > 0);

        return (
          <div key={idx} className="space-y-1">
            {/* Project name row */}
            <div className="flex items-center justify-between gap-2">
              <span
                className="text-[11px] font-bold text-slate-700 truncate max-w-[160px]"
                title={project.projectName}
              >
                {project.projectName}
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Per-severity pill counts */}
                {segments.map((s) => (
                  <span
                    key={s.key}
                    className="text-[9px] font-black px-1.5 py-0.5 rounded text-white"
                    style={{ backgroundColor: s.color }}
                    title={`${s.label}: ${s.count}`}
                  >
                    {s.count}
                  </span>
                ))}
                <span className="text-[10px] font-black text-slate-500 w-6 text-right">
                  {total}
                </span>
              </div>
            </div>

            {/* Stacked bar */}
            <div className="w-full h-5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full flex rounded-full overflow-hidden transition-all duration-500"
                style={{ width: `${widthPct}%` }}
              >
                {segments.map((s, i) => (
                  <div
                    key={s.key}
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${s.pct}%`,
                      backgroundColor: s.color,
                      // Rounded ends only on first/last visible segment
                      borderRadius:
                        i === 0 && i === segments.length - 1
                          ? "9999px"
                          : i === 0
                          ? "9999px 0 0 9999px"
                          : i === segments.length - 1
                          ? "0 9999px 9999px 0"
                          : "0",
                    }}
                    title={`${s.label}: ${s.count}`}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })}

      {/* Legend + "View Dashboard" button on the same row */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-1">
        {/* Legend */}
        <div className="flex items-center gap-3 flex-wrap">
          {SEVERITY.map((s) => (
            <div key={s.key} className="flex items-center gap-1">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-[9px] font-bold text-slate-500 uppercase">
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Inline "View Dashboard" button */}
        <button
          onClick={handleNav}
          className="flex items-center gap-1.5 text-[10px] font-black text-teal-600 uppercase tracking-wider hover:text-teal-700 transition-colors whitespace-nowrap"
        >
          View Details
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}