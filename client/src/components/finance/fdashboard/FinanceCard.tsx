// ============================================================================
// FINANCE DESIGN SYSTEM — FinanceCard
// Base card container used by every finance widget.
// ============================================================================

import type { ReactNode, HTMLAttributes } from "react";
import { ELEVATION, RADIUS } from "./tokens";

interface FinanceCardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  /** Render a coloured left border accent. */
  accent?: "navy" | "critical" | "warning" | "success" | "info" | "none";
  /** Make the card a dark navy surface (AI / highlight panels). */
  dark?: boolean;
  /** Remove default padding so the consumer controls inner spacing. */
  noPadding?: boolean;
  /** Additional Tailwind classes. */
  className?: string;
  as?: "section" | "article" | "div";
}

const ACCENT_BORDER: Record<string, string> = {
  navy: "border-s-[#003b70]",
  critical: "border-s-red-600",
  warning: "border-s-amber-500",
  success: "border-s-green-600",
  info: "border-s-blue-500",
  none: "",
};

export function FinanceCard({
  children,
  accent = "none",
  dark = false,
  noPadding = false,
  className = "",
  as: Tag = "section",
  ...rest
}: FinanceCardProps) {
  const hasAccent = accent !== "none";
  return (
    <Tag
      className={[
        RADIUS.card,
        ELEVATION.card,
        "border border-slate-200",
        dark ? "bg-[#003b70] text-white" : "bg-white text-slate-900",
        hasAccent ? `border-s-4 ${ACCENT_BORDER[accent]}` : "",
        !noPadding ? "p-4" : "",
        "transition-shadow duration-150 hover:shadow-[0_4px_12px_rgba(15,23,42,.09)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </Tag>
  );
}
