// ============================================================================
// FINANCE DESIGN SYSTEM — WidgetHeader
// Consistent header used at the top of every chart / widget card.
// ============================================================================

import type { ReactNode } from "react";
import { TYPE } from "./tokens";


interface WidgetHeaderProps {
  title: string;
  subtitle?: string;
  /** Icon rendered to the left of the title. */
  icon?: ReactNode;
  /** Badge / chip displayed to the right of the title (e.g. "98%"). */
  badge?: string;
  /** Action slot — buttons, dropdowns rendered at the far end. */
  action?: ReactNode;
  /** When true the text colours flip for a dark (navy) background. */
  dark?: boolean;
  /** When true a bottom border is added. Default: true. */
  divider?: boolean;
  className?: string;
}

export function WidgetHeader({
  title,
  subtitle,
  icon,
  badge,
  action,
  dark = false,
  divider = true,
  className = "",
}: WidgetHeaderProps) {
  return (
    <div
      className={[
        "flex items-start justify-between gap-3",
        divider ? "border-b border-slate-100 p-4 pb-3" : "p-4 pb-3",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Left: icon + title + subtitle */}
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && (
          <div className={`mt-0.5 shrink-0 ${dark ? "text-white/70" : "text-[#003b70]"}`}>
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h2
            className={[
              TYPE.widgetTitle,
              dark ? "text-white" : "",
              "flex items-center gap-2",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {title}
            {badge && (
              <span
                className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${
                  dark
                    ? "border-white/20 bg-white/15 text-white"
                    : "border-blue-200 bg-blue-50 text-blue-700"
                }`}
              >
                {badge}
              </span>
            )}
          </h2>
          {subtitle && (
            <p className={`mt-0.5 text-[10px] ${dark ? "text-white/60" : "text-slate-500"}`}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right: action slot */}
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
