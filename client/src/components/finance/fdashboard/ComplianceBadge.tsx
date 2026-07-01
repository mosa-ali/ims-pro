// ============================================================================
// FINANCE DESIGN SYSTEM — ComplianceBadge
// Visual compliance status indicator with colour-coded pill, dot, and score.
// ============================================================================

import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { COMPLIANCE_PALETTE, ComplianceStatus, scoreToStatus } from "./tokens";

interface ComplianceBadgeProps {
  status: ComplianceStatus;
  /** Show an icon. Default: true. */
  showIcon?: boolean;
  variant?: "pill" | "dot" | "icon-only";
  className?: string;
}

const COMPLIANCE_ICONS: Record<ComplianceStatus, React.ElementType> = {
  Good: CheckCircle2,
  Warning: AlertTriangle,
  Critical: XCircle,
};

export function ComplianceBadge({
  status,
  showIcon = true,
  variant = "pill",
  className = "",
}: ComplianceBadgeProps) {
  const palette = COMPLIANCE_PALETTE[status];
  const Icon = COMPLIANCE_ICONS[status];

  if (variant === "dot") {
    return (
      <span
        className={`h-2.5 w-2.5 rounded-full flex-shrink-0 inline-block ${className}`}
        style={{ background: palette.color }}
      />
    );
  }

  if (variant === "icon-only") {
    return <Icon className={`h-4 w-4 ${className}`} style={{ color: palette.color }} />;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold ${className}`}
      style={{ background: palette.bg, color: palette.text }}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {status}
    </span>
  );
}

/** Derive status from a numeric score and render the badge. */
export function ScoreBadge({ score, className = "" }: { score: number; className?: string }) {
  return <ComplianceBadge status={scoreToStatus(score)} className={className} />;
}
