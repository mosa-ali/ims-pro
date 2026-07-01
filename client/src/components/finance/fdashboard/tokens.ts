// ============================================================================
// FINANCE DESIGN SYSTEM — TOKENS
// Single source of truth for all finance UI colour, spacing, typography,
// elevation, animation and chart palette tokens.
// ============================================================================

// ─── Colour Palette ───────────────────────────────────────────────────────────

export const FINANCE_COLORS = {
  // Brand
  navy: "#003b70",
  navyDark: "#002a55",
  navyLight: "#dbeafe",

  // Semantic
  critical: "#c81e1e",
  criticalBg: "#fee2e2",
  criticalBorder: "#ef4444",
  criticalText: "#b91c1c",

  high: "#ea580c",
  highBg: "#ffedd5",
  highBorder: "#f97316",
  highText: "#c2410c",

  warning: "#d97706",
  warningBg: "#fef9c3",
  warningBorder: "#eab308",
  warningText: "#92400e",

  success: "#15803d",
  successBg: "#dcfce7",
  successBorder: "#22c55e",
  successText: "#166534",

  info: "#2563eb",
  infoBg: "#dbeafe",
  infoBorder: "#60a5fa",
  infoText: "#1d4ed8",

  // Neutral
  background: "#f5f7fb",
  surface: "#ffffff",
  border: "#e2e8f0",
  borderLight: "#f1f5f9",
  muted: "#94a3b8",
  mutedText: "#64748b",
  bodyText: "#1e293b",
  headingText: "#0f172a",
  captionText: "#94a3b8",
} as const;

// ─── Risk level helper ────────────────────────────────────────────────────────

export type RiskLevel = "Critical" | "High" | "Medium" | "Low";
export type ComplianceStatus = "Good" | "Warning" | "Critical";
export type TrendDirection = "up" | "down" | "stable";
export type AdvanceStatus = "Overdue" | "Due Soon" | "Settled";
export type ReportingStatus = "On Track" | "Overdue" | "Submitted";

export const RISK_PALETTE: Record<RiskLevel, { bg: string; border: string; text: string; dot: string }> = {
  Critical: { bg: FINANCE_COLORS.criticalBg, border: FINANCE_COLORS.criticalBorder, text: FINANCE_COLORS.criticalText, dot: FINANCE_COLORS.critical },
  High: { bg: FINANCE_COLORS.highBg, border: FINANCE_COLORS.highBorder, text: FINANCE_COLORS.highText, dot: FINANCE_COLORS.high },
  Medium: { bg: FINANCE_COLORS.warningBg, border: FINANCE_COLORS.warningBorder, text: FINANCE_COLORS.warningText, dot: FINANCE_COLORS.warning },
  Low: { bg: FINANCE_COLORS.successBg, border: FINANCE_COLORS.successBorder, text: FINANCE_COLORS.successText, dot: FINANCE_COLORS.success },
};

export const COMPLIANCE_PALETTE: Record<ComplianceStatus, { color: string; bg: string; text: string }> = {
  Good: { color: FINANCE_COLORS.success, bg: FINANCE_COLORS.successBg, text: FINANCE_COLORS.successText },
  Warning: { color: FINANCE_COLORS.warning, bg: FINANCE_COLORS.warningBg, text: FINANCE_COLORS.warningText },
  Critical: { color: FINANCE_COLORS.critical, bg: FINANCE_COLORS.criticalBg, text: FINANCE_COLORS.criticalText },
};

// ─── Chart palette ────────────────────────────────────────────────────────────

export const CHART_COLORS = {
  primary: FINANCE_COLORS.navy,
  primaryLight: "#93c5fd",
  budget: "#93c5fd",
  actual: FINANCE_COLORS.navy,
  forecast: FINANCE_COLORS.critical,
  variance: FINANCE_COLORS.warning,
  positive: FINANCE_COLORS.success,
  negative: FINANCE_COLORS.critical,
  neutral: FINANCE_COLORS.muted,
  series: [
    "#003b70", "#2563eb", "#0891b2", "#15803d", "#ca8a04",
    "#c81e1e", "#7c3aed", "#db2777", "#ea580c", "#16a34a",
  ],
} as const;

// ─── Spacing scale ────────────────────────────────────────────────────────────

export const SPACING = {
  pageX: "p-6",
  pageY: "p-6",
  cardInner: "p-4",
  cardInnerSm: "p-3",
  gutter: "gap-4",
  gutterSm: "gap-3",
  gutterXs: "gap-2",
} as const;

// ─── Typography scale ─────────────────────────────────────────────────────────

export const TYPE = {
  pageTitle: "text-[20px] font-semibold text-slate-800",
  pageSubtitle: "text-[11px] text-slate-500",
  sectionTitle: "text-[11px] font-extrabold uppercase tracking-widest text-[#003b70]",
  widgetTitle: "text-[11px] font-extrabold uppercase tracking-widest text-[#003b70]",
  widgetSubtitle: "text-[10px] text-slate-500",
  kpiValue: "font-mono text-[22px] font-bold leading-none",
  kpiLabel: "text-[10px] font-bold uppercase tracking-wide text-slate-500",
  kpiMeta: "text-[10px] font-semibold",
  tableHeader: "text-[10px] font-bold uppercase tracking-wide text-slate-500",
  tableBody: "text-[12px] text-slate-700",
  tableBodyMono: "font-mono text-[12px]",
  caption: "text-[10px] text-slate-400",
  badge: "text-[10px] font-bold",
  badgeSm: "text-[9px] font-bold uppercase tracking-wide",
  button: "text-[11px] font-semibold",
  buttonSm: "text-[10px] font-bold",
} as const;

// ─── Elevation (shadow) ───────────────────────────────────────────────────────

export const ELEVATION = {
  card: "shadow-[0_1px_3px_rgba(15,23,42,.06)]",
  cardHover: "hover:shadow-[0_4px_12px_rgba(15,23,42,.10)]",
  dropdown: "shadow-[0_4px_16px_rgba(15,23,42,.12)]",
  modal: "shadow-[0_8px_32px_rgba(15,23,42,.16)]",
} as const;

// ─── Border radius ────────────────────────────────────────────────────────────

export const RADIUS = {
  card: "rounded-[10px]",
  badge: "rounded",
  badgeFull: "rounded-full",
  input: "rounded",
  button: "rounded",
} as const;

// ─── Animation tokens ─────────────────────────────────────────────────────────

export const ANIMATION = {
  transition: "transition-colors duration-150",
  transitionAll: "transition-all duration-200",
  hoverLift: "hover:-translate-y-0.5 transition-transform duration-150",
} as const;

// ─── Compliance score → status helper ────────────────────────────────────────

export function scoreToStatus(score: number): ComplianceStatus {
  if (score >= 85) return "Good";
  if (score >= 70) return "Warning";
  return "Critical";
}

export function scoreToColor(score: number): string {
  if (score >= 85) return FINANCE_COLORS.success;
  if (score >= 70) return FINANCE_COLORS.warning;
  return FINANCE_COLORS.critical;
}

// ─── Currency formatter factory ───────────────────────────────────────────────

export function makeCurrencyFormatter(currency = "USD", locale = "en-US") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
}

export function compactCurrency(value: number, currency = "USD"): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}${currency === "USD" ? "$" : ""}${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}${currency === "USD" ? "$" : ""}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${currency === "USD" ? "$" : ""}${(abs / 1_000).toFixed(0)}K`;
  return `${sign}${currency === "USD" ? "$" : ""}${abs}`;
}
