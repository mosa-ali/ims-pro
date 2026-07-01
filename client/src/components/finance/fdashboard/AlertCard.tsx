// ============================================================================
// FINANCE DESIGN SYSTEM — AlertCard / NotificationCard
// Coloured alert banners and notification items for risk/compliance alerts.
// ============================================================================

import { AlertTriangle, Bell, CheckCircle2, Clock, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";

type AlertTone = "critical" | "warning" | "info" | "success";

interface AlertCardProps {
  tone: AlertTone;
  title: string;
  body: string;
  /** Timestamp string (e.g. "2h ago"). */
  timestamp?: string;
  /** Primary action button label. */
  actionLabel?: string;
  onAction?: () => void;
  /** Secondary action button label. */
  secondaryLabel?: string;
  onSecondary?: () => void;
  className?: string;
}

const TONE_MAP: Record<AlertTone, { border: string; bg: string; text: string; icon: React.ElementType; btn: string }> = {
  critical: { border: "border-red-600", bg: "bg-red-50", text: "text-red-700", icon: XCircle, btn: "bg-red-700" },
  warning: { border: "border-amber-500", bg: "bg-amber-50", text: "text-amber-700", icon: AlertTriangle, btn: "bg-amber-500" },
  info: { border: "border-blue-600", bg: "bg-blue-50", text: "text-blue-700", icon: Info, btn: "bg-blue-600" },
  success: { border: "border-green-600", bg: "bg-green-50", text: "text-green-700", icon: CheckCircle2, btn: "bg-green-700" },
};

export function AlertCard({
  tone,
  title,
  body,
  timestamp,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  className = "",
}: AlertCardProps) {
  const palette = TONE_MAP[tone];
  const Icon = palette.icon;

  return (
    <div className={`border-s-4 p-4 ${palette.border} ${palette.bg} ${className}`}>
      <div className={`flex items-center gap-2 text-[11px] font-extrabold uppercase ${palette.text}`}>
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span>{title}</span>
        {timestamp && (
          <span className="ms-auto text-[9px] font-medium normal-case text-slate-500">
            {timestamp}
          </span>
        )}
      </div>
      <p className="mt-2 text-[11px] leading-4 text-slate-700">{body}</p>
      {(actionLabel || secondaryLabel) && (
        <div className="mt-3 flex gap-2">
          {actionLabel && (
            <button
              onClick={onAction}
              className={`flex-1 rounded px-3 py-2 text-[11px] font-extrabold uppercase text-white transition-opacity hover:opacity-90 ${palette.btn}`}
            >
              {actionLabel}
            </button>
          )}
          {secondaryLabel && (
            <button
              onClick={onSecondary}
              className="flex-1 rounded border border-slate-300 px-3 py-2 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-white"
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CalendarEventItem ────────────────────────────────────────────────────────

type EventType = "critical" | "warning" | "info";

interface CalendarEventItemProps {
  date: string;
  label: string;
  type: EventType;
}

const EVENT_DOT: Record<EventType, string> = {
  critical: "bg-red-600",
  warning: "bg-amber-500",
  info: "bg-blue-500",
};

export function CalendarEventItem({ date, label, type }: CalendarEventItemProps) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
      <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${EVENT_DOT[type]}`} />
      <p className="flex-1 min-w-0 text-[11px] font-medium leading-tight text-slate-700">{label}</p>
      <span className="shrink-0 font-mono text-[10px] text-slate-500" dir="ltr">{date}</span>
    </div>
  );
}
