// ============================================================================
// FINANCE DESIGN SYSTEM — RiskBadge
// Displays a risk severity level: Critical / High / Medium / Low.
// ============================================================================

import { AlertTriangle, ArrowUpRight, ChevronUp, ShieldCheck } from "lucide-react";
import { RISK_PALETTE, RiskLevel } from "./tokens";

interface RiskBadgeProps {
  level: RiskLevel;
  /** Show an icon before the label. Default: true. */
  showIcon?: boolean;
  /** Render as a filled pill (default) or just the coloured dot + label. */
  variant?: "pill" | "dot";
  className?: string;
}

const RISK_ICONS: Record<RiskLevel, React.ElementType> = {
  Critical: AlertTriangle,
  High: ArrowUpRight,
  Medium: ChevronUp,
  Low: ShieldCheck,
};

export function RiskBadge({ level, showIcon = false, variant = "pill", className = "" }: RiskBadgeProps) {
  const palette = RISK_PALETTE[level];
  const Icon = RISK_ICONS[level];

  if (variant === "dot") {
    return (
      <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${className}`}
        style={{ color: palette.dot }}>
        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: palette.dot }} />
        {level}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold ${className}`}
      style={{ background: palette.bg, borderColor: palette.border, color: palette.text }}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {level}
    </span>
  );
}

/** Standalone coloured dot indicator. */
export function RiskDot({ level, size = "sm" }: { level: RiskLevel; size?: "xs" | "sm" | "md" }) {
  const palette = RISK_PALETTE[level];
  const dim = size === "xs" ? "h-1.5 w-1.5" : size === "sm" ? "h-2.5 w-2.5" : "h-3.5 w-3.5";
  return <span className={`inline-block rounded-full ${dim}`} style={{ background: palette.dot }} />;
}
