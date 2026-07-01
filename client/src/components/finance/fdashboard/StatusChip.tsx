// ============================================================================
// FINANCE DESIGN SYSTEM — StatusChip / VarianceChip / CurrencyBadge
// General-purpose chips for status labels, variance values and currencies.
// ============================================================================

import { AdvanceStatus, ReportingStatus } from "./tokens";

// ─── Generic status map type ──────────────────────────────────────────────────

type ChipVariant = "default" | "outline";

interface StatusChipProps {
  label: string;
  /** Tailwind bg+text class pair e.g. "bg-green-100 text-green-700". */
  colorClass?: string;
  variant?: ChipVariant;
  className?: string;
}

/** Fully flexible status chip. Consumer supplies the colour class. */
export function StatusChip({
  label,
  colorClass = "bg-slate-100 text-slate-600",
  variant = "default",
  className = "",
}: StatusChipProps) {
  const base = "inline-block rounded px-2 py-0.5 text-[10px] font-bold whitespace-nowrap";
  if (variant === "outline") {
    return (
      <span className={`${base} border ${colorClass} ${className}`}>{label}</span>
    );
  }
  return <span className={`${base} ${colorClass} ${className}`}>{label}</span>;
}

// ─── Pre-wired advance status chip ───────────────────────────────────────────

const ADVANCE_COLORS: Record<AdvanceStatus, string> = {
  Overdue: "bg-red-100 text-red-700",
  "Due Soon": "bg-amber-100 text-amber-700",
  Settled: "bg-green-100 text-green-700",
};

export function AdvanceStatusChip({ status, className = "" }: { status: AdvanceStatus; className?: string }) {
  return <StatusChip label={status} colorClass={ADVANCE_COLORS[status]} className={className} />;
}

// ─── Pre-wired donor reporting status chip ───────────────────────────────────

const REPORTING_COLORS: Record<ReportingStatus, string> = {
  "On Track": "bg-green-100 text-green-700",
  Overdue: "bg-red-100 text-red-700",
  Submitted: "bg-blue-100 text-blue-700",
};

export function ReportingStatusChip({ status, className = "" }: { status: ReportingStatus; className?: string }) {
  return <StatusChip label={status} colorClass={REPORTING_COLORS[status]} className={className} />;
}

// ─── Variance chip ─────────────────────────────────────────────────────────────

interface VarianceChipProps {
  value: number;
  /** Format: "percent" | "currency". Default: "percent". */
  format?: "percent" | "currency";
  /** If true, negative variance is good (under-budget). Default: false. */
  negativeIsGood?: boolean;
  className?: string;
}

export function VarianceChip({
  value,
  format = "percent",
  negativeIsGood = false,
  className = "",
}: VarianceChipProps) {
  const isNegative = value < 0;
  const isGood = negativeIsGood ? isNegative : !isNegative;
  const colorClass = isGood ? "text-green-700" : "text-red-600";
  const label =
    format === "percent"
      ? `${value > 0 ? "+" : ""}${value.toFixed(1)}%`
      : `${value > 0 ? "+" : ""}${value < 0 ? "-" : ""}$${Math.abs(value).toLocaleString()}`;

  return (
    <span
      className={`font-mono text-[11px] font-bold ${colorClass} ${className}`}
      dir="ltr"
    >
      {label}
    </span>
  );
}

// ─── Currency badge ───────────────────────────────────────────────────────────

interface CurrencyBadgeProps {
  currency: string;
  className?: string;
}

export function CurrencyBadge({ currency, className = "" }: CurrencyBadgeProps) {
  return (
    <span
      className={`inline-block rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-blue-700 ${className}`}
    >
      {currency}
    </span>
  );
}

// ─── Priority chip (for AI recommendations) ──────────────────────────────────

type Priority = "Critical" | "High" | "Medium" | "Low";
const PRIORITY_COLORS: Record<Priority, string> = {
  Critical: "bg-red-100 text-red-700",
  High: "bg-orange-100 text-orange-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-green-100 text-green-700",
};

export function PriorityChip({ priority, className = "" }: { priority: Priority; className?: string }) {
  return <StatusChip label={priority} colorClass={PRIORITY_COLORS[priority]} className={className} />;
}

// ─── Document status chip ─────────────────────────────────────────────────────

type DocStatus = "Missing" | "Incomplete" | "Pending" | "Complete";
const DOC_COLORS: Record<DocStatus, string> = {
  Missing: "bg-red-100 text-red-700",
  Incomplete: "bg-amber-100 text-amber-700",
  Pending: "bg-blue-100 text-blue-700",
  Complete: "bg-green-100 text-green-700",
};

export function DocStatusChip({ status, className = "" }: { status: DocStatus; className?: string }) {
  return <StatusChip label={status} colorClass={DOC_COLORS[status]} className={className} />;
}

// ─── Risk open/closed status chip ────────────────────────────────────────────

type RiskStatus = "Open" | "In Progress" | "Mitigated" | "Accepted";
const RISK_STATUS_COLORS: Record<RiskStatus, string> = {
  Open: "bg-red-50 text-red-700",
  "In Progress": "bg-blue-50 text-blue-700",
  Mitigated: "bg-green-50 text-green-700",
  Accepted: "bg-slate-100 text-slate-600",
};

export function RiskStatusChip({ status, className = "" }: { status: RiskStatus; className?: string }) {
  return <StatusChip label={status} colorClass={RISK_STATUS_COLORS[status]} className={className} />;
}
