// ============================================================================
// FINANCE DESIGN SYSTEM — LoadingSkeleton / EmptyState / ErrorState
// Consistent placeholder states for all finance components.
// ============================================================================

import type { ReactNode } from "react";
import { AlertTriangle, Database, RefreshCw } from "lucide-react";

// ─── LoadingSkeleton ──────────────────────────────────────────────────────────

interface LoadingSkeletonProps {
  variant?: "kpi" | "chart" | "table" | "list" | "card" | "text";
  rows?: number;
  className?: string;
}

function Bone({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-slate-200 ${className}`} />
  );
}

export function LoadingSkeleton({
  variant = "card",
  rows = 4,
  className = "",
}: LoadingSkeletonProps) {
  if (variant === "kpi") {
    return (
      <div className={`space-y-2 ${className}`}>
        <Bone className="h-3 w-20" />
        <Bone className="h-7 w-32" />
        <Bone className="h-2.5 w-16" />
      </div>
    );
  }

  if (variant === "chart") {
    return (
      <div className={`flex h-full w-full flex-col items-center justify-center gap-3 ${className}`}>
        <div className="flex items-end gap-2 h-32">
          {[60, 80, 45, 70, 90, 55, 75].map((h, i) => (
            <Bone key={i} className={`w-8 animate-pulse`} style={{ height: `${h}%` } as React.CSSProperties} />
          ))}
        </div>
        <Bone className="h-2.5 w-40" />
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className={`space-y-0 ${className}`}>
        <div className="flex gap-4 border-b border-slate-100 px-4 py-2.5">
          {[120, 80, 60, 60, 60, 50].map((w, i) => (
            <Bone key={i} className={`h-2.5`} style={{ width: w } as React.CSSProperties} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 border-b border-slate-100 px-4 py-3">
            {[120, 80, 60, 60, 60, 50].map((w, j) => (
              <Bone key={j} className={`h-3`} style={{ width: w } as React.CSSProperties} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className={`divide-y divide-slate-100 ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Bone className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Bone className="h-3 w-3/4" />
              <Bone className="h-2.5 w-1/2" />
            </div>
            <Bone className="h-5 w-16 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "text") {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <Bone key={i} className={`h-3 ${i === rows - 1 ? "w-2/3" : "w-full"}`} />
        ))}
      </div>
    );
  }

  // Default: card
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-3">
        <Bone className="h-5 w-5 rounded" />
        <Bone className="h-3 w-32" />
      </div>
      <Bone className="h-24 w-full rounded" />
      <div className="space-y-2">
        <Bone className="h-2.5 w-full" />
        <Bone className="h-2.5 w-5/6" />
        <Bone className="h-2.5 w-4/6" />
      </div>
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title = "No data available",
  message = "There are no records to display for the selected filters.",
  icon,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-12 text-center ${className}`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        {icon ?? <Database className="h-6 w-6 text-slate-400" />}
      </div>
      <div>
        <p className="text-[13px] font-semibold text-slate-700">{title}</p>
        <p className="mt-1 text-[11px] text-slate-400">{message}</p>
      </div>
      {action}
    </div>
  );
}

// ─── ErrorState ───────────────────────────────────────────────────────────────

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  title = "Failed to load data",
  message = "An error occurred while fetching financial data. Please try again.",
  onRetry,
  retryLabel = "Retry",
  className = "",
}: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-12 text-center ${className}`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
        <AlertTriangle className="h-6 w-6 text-red-500" />
      </div>
      <div>
        <p className="text-[13px] font-semibold text-slate-700">{title}</p>
        <p className="mt-1 text-[11px] text-slate-400">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded bg-[#003b70] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#002a55] transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {retryLabel}
        </button>
      )}
    </div>
  );
}
