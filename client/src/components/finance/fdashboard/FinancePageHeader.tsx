// ============================================================================
// FINANCE DESIGN SYSTEM — FinancePageHeader
// Standard Finance page header used across all Finance pages.
// Supports:
// - Trilingual (EN / AR / IT)
// - Page title & subtitle
// - Icon
// - Timestamp
// - Built-in Refresh / Export buttons
// - Optional custom actions
// ============================================================================

import type { ReactNode, ElementType } from "react";
import { RefreshCw, Download, Shield, ShieldAlert, ShieldCheck } from "lucide-react";

import { useLanguage } from "@/app/contexts/LanguageContext";
import { TYPE, FINANCE_COLORS } from "./tokens";

// ============================================================================
// Navigation
// ============================================================================

export interface FinanceNavItem {
  path: string;
  labelEn: string;
  labelAr: string;
  labelIt: string;
  icon: ElementType;
}

export const DEFAULT_FINANCE_NAV_ITEMS: FinanceNavItem[] = [
  {
    path: "/finance",
    labelEn: "Executive Dashboard",
    labelAr: "لوحة التحكم",
    labelIt: "Dashboard Esecutivo",
    icon: ShieldCheck,
  },
  {
    path: "/finance/risk",
    labelEn: "Risk Center",
    labelAr: "مركز المخاطر",
    labelIt: "Centro Rischi",
    icon: ShieldAlert,
  },
  {
    path: "/finance/compliance",
    labelEn: "Compliance Center",
    labelAr: "مركز الامتثال",
    labelIt: "Centro Conformità",
    icon: Shield,
  },
];

// ============================================================================
// Props
// ============================================================================

export interface FinancePageHeaderProps {
  /** Title */
  title: string;
  titleAr?: string;
  titleIt?: string;

  /** Subtitle */
  subtitle?: string;
  subtitleAr?: string;
  subtitleIt?: string;

  /** Header icon */
  icon: ElementType;

  /** Last updated timestamp */
  timestamp?: string;

  /** Extra custom actions */
  actions?: ReactNode;

  /** Reserved for future finance navigation */
  navItems?: FinanceNavItem[];

  /** Labels */
  updatedLabel?: string;
  updatedLabelAr?: string;
  updatedLabelIt?: string;

  refreshLabel?: string;
  refreshLabelAr?: string;
  refreshLabelIt?: string;

  exportLabel?: string;
  exportLabelAr?: string;
  exportLabelIt?: string;

  /** Standard actions */
  onRefresh?: () => void;
  onExport?: () => void;

  /** Visibility */
  showRefresh?: boolean;
  showExport?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function FinancePageHeader({
  title,
  titleAr,
  titleIt,

  subtitle,
  subtitleAr,
  subtitleIt,

  icon: Icon,

  timestamp,

  actions,

  navItems = DEFAULT_FINANCE_NAV_ITEMS,

  updatedLabel = "Last updated",
  updatedLabelAr = "آخر تحديث",
  updatedLabelIt = "Ultimo aggiornamento",

  refreshLabel = "Refresh",
  refreshLabelAr = "تحديث",
  refreshLabelIt = "Aggiorna",

  exportLabel = "Export",
  exportLabelAr = "تصدير",
  exportLabelIt = "Esporta",

  onRefresh,
  onExport,

  showRefresh = true,
  showExport = true,
}: FinancePageHeaderProps) {
  const { language, isRTL } = useLanguage();

  const displayTitle =
    language === "ar"
      ? titleAr ?? title
      : language === "it"
        ? titleIt ?? title
        : title;

  const displaySubtitle =
    language === "ar"
      ? subtitleAr ?? subtitle
      : language === "it"
        ? subtitleIt ?? subtitle
        : subtitle;

  const displayUpdatedLabel =
    language === "ar"
      ? updatedLabelAr ?? updatedLabel
      : language === "it"
        ? updatedLabelIt ?? updatedLabel
        : updatedLabel;

  const displayRefreshLabel =
    language === "ar"
      ? refreshLabelAr ?? refreshLabel
      : language === "it"
        ? refreshLabelIt ?? refreshLabel
        : refreshLabel;

  const displayExportLabel =
    language === "ar"
      ? exportLabelAr ?? exportLabel
      : language === "it"
        ? exportLabelIt ?? exportLabel
        : exportLabel;

  return (
    <div className="space-y-3" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">

        {/* Left */}
        <div className="flex items-center gap-3">

          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ background: FINANCE_COLORS.navy }}
          >
            <Icon className="h-5 w-5 text-white" />
          </div>

          <div>
            <h1 className={TYPE.pageTitle}>
              {displayTitle}
            </h1>

            {displaySubtitle && (
              <p className={TYPE.pageSubtitle}>
                {displaySubtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="flex flex-wrap items-center gap-2">

          {timestamp && (
            <>
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {displayUpdatedLabel}
              </span>

              <span
                className="font-mono text-[11px] text-slate-700"
                dir="ltr"
              >
                {timestamp}
              </span>
            </>
          )}

          {showRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={!onRefresh}
              className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {displayRefreshLabel}
            </button>
          )}

          {showExport && (
            <button
              type="button"
              onClick={onExport}
              disabled={!onExport}
              className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-[11px] font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: FINANCE_COLORS.navy }}
            >
              <Download className="h-3.5 w-3.5" />
              {displayExportLabel}
            </button>
          )}

          {actions}
        </div>
      </div>
    </div>
  );
}