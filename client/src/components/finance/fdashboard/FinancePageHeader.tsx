// ============================================================================
// FINANCE DESIGN SYSTEM — FinancePageHeader
// Top-of-page header with title, subtitle, icon, last-updated timestamp,
// action buttons, and trilingual support (EN, AR, IT).
// ============================================================================

import type { ReactNode } from "react";
import { Link, useLocation } from 'wouter';
import {
  RefreshCw, Download, Shield, ShieldAlert, ShieldCheck,
} from "lucide-react";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { TYPE, FINANCE_COLORS } from "./tokens";

export interface FinanceNavItem {
  path: string;
  labelEn: string;
  labelAr: string;
  labelIt: string;
  icon: React.ElementType;
}

const DEFAULT_NAV_ITEMS: FinanceNavItem[] = [
  { path: "/finance", labelEn: "Executive Dashboard", labelAr: "لوحة التحكم", labelIt: "Dashboard Esecutivo", icon: ShieldCheck },
  { path: "/finance/risk", labelEn: "Risk Center", labelAr: "مركز المخاطر", labelIt: "Centro Rischi", icon: ShieldAlert },
  { path: "/finance/compliance", labelEn: "Compliance Center", labelAr: "مركز الامتثال", labelIt: "Centro Conformità", icon: Shield },
];

interface FinancePageHeaderProps {
  /** Page title string. */
  title: string;
  titleAr?: string;
  titleIt?: string;
  subtitle?: string;
  subtitleAr?: string;
  subtitleIt?: string;
  /** Icon component rendered inside the navy pill. */
  icon: React.ElementType;
  /** Timestamp string (already formatted). */
  timestamp?: string;
  /** Extra action buttons to the right of refresh/export. */
  actions?: ReactNode;
  /** Override nav items. Defaults to the 3 finance pages. */
  navItems?: FinanceNavItem[];
  /** Last-updated label (translated by caller). */
  updatedLabel?: string;
  updatedLabelAr?: string;
  updatedLabelIt?: string;
  refreshLabel?: string;
  refreshLabelAr?: string;
  refreshLabelIt?: string;
  exportLabel?: string;
  exportLabelAr?: string;
  exportLabelIt?: string;
  onRefresh?: () => void;
  onExport?: () => void;
}

export function FinancePageHeader({
  title,
  titleAr,
  titleIt,
  subtitle,
  subtitleAr,
  subtitleIt,
  icon: Icon,
  timestamp = "Oct 24, 2024 · 14:32:01",
  actions,
  navItems = DEFAULT_NAV_ITEMS,
  updatedLabel = "Last updated",
  updatedLabelAr = "آخر تحديث",
  updatedLabelIt = "Ultimo aggiornamento",
  refreshLabel = "Refresh",
  refreshLabelAr = "تحديث",
  refreshLabelIt = "Aggiorna",
  exportLabel = "Export Report",
  exportLabelAr = "تصدير التقرير",
  exportLabelIt = "Esporta Report",
  onRefresh,
  onExport,
}: FinancePageHeaderProps) {
  const { language, isRTL } = useLanguage();
  const location = useLocation();

  // Determine display text based on current language
  const displayTitle = language === "ar" && titleAr ? titleAr : language === "it" && titleIt ? titleIt : title;
  const displaySubtitle = language === "ar" && subtitleAr ? subtitleAr : language === "it" && subtitleIt ? subtitleIt : subtitle;
  const displayUpdatedLabel = language === "ar" && updatedLabelAr ? updatedLabelAr : language === "it" && updatedLabelIt ? updatedLabelIt : updatedLabel;
  const displayRefreshLabel = language === "ar" && refreshLabelAr ? refreshLabelAr : language === "it" && refreshLabelIt ? refreshLabelIt : refreshLabel;
  const displayExportLabel = language === "ar" && exportLabelAr ? exportLabelAr : language === "it" && exportLabelIt ? exportLabelIt : exportLabel;

  // Helper to get nav label based on language
  const getNavLabel = (item: FinanceNavItem) => {
    if (language === "ar") return item.labelAr;
    if (language === "it") return item.labelIt;
    return item.labelEn;
  };

  return (
    <div className="space-y-3">
      {/* Title row */}
      <div
        className={`flex flex-col gap-3 border-b border-slate-200 pb-3 lg:flex-row lg:items-center lg:justify-between`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ background: FINANCE_COLORS.navy }}
          >
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className={TYPE.pageTitle}>{displayTitle}</h1>
            {displaySubtitle && <p className={TYPE.pageSubtitle}>{displaySubtitle}</p>}
          </div>
        </div>

        <div className={`flex items-center gap-2`}>
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            {displayUpdatedLabel}
          </span>
          <span className="font-mono text-[11px] text-slate-700" dir="ltr">
            {timestamp}
          </span>
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {displayRefreshLabel}
          </button>
          <button
            onClick={onExport}
            className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:opacity-90"
            style={{ background: FINANCE_COLORS.navy }}
          >
            <Download className="h-3.5 w-3.5" />
            {displayExportLabel}
          </button>
          {actions}
        </div>
      </div>

      {/* Sub-navigation tab bar removed */}
      {/* Note: navItems and getNavLabel are kept for future use if navigation is re-enabled */}
    </div>
  );
}
