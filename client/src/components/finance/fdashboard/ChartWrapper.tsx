// ============================================================================
// FINANCE DESIGN SYSTEM — ChartWrapper
// Container for every Recharts chart: header, optional toolbar, loading and
// empty states, consistent sizing.
// ============================================================================

import type { ReactNode } from "react";
import { Download, Maximize2, MoreVertical } from "lucide-react";
import { FinanceCard } from "./FinanceCard";
import { WidgetHeader } from "./WidgetHeader";
import { LoadingSkeleton } from "./LoadingSkeleton";

interface ChartWrapperProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  /** Fixed height for the chart area (Tailwind class). Default: "h-[280px]". */
  chartHeight?: string;
  children: ReactNode;
  /** Show loading skeleton overlay. */
  isLoading?: boolean;
  /** Show empty state instead of chart. */
  isEmpty?: boolean;
  emptyMessage?: string;
  /** Extra controls slotted into the header action area. */
  headerAction?: ReactNode;
  /** Show a download icon button in the toolbar. */
  showDownload?: boolean;
  onDownload?: () => void;
  className?: string;
}

export function ChartWrapper({
  title,
  subtitle,
  icon,
  chartHeight = "h-[280px]",
  children,
  isLoading = false,
  isEmpty = false,
  emptyMessage = "No data available for the selected period.",
  headerAction,
  showDownload = false,
  onDownload,
  className = "",
}: ChartWrapperProps) {
  const action = (
    <div className="flex items-center gap-1">
      {headerAction}
      {showDownload && (
        <button
          onClick={onDownload}
          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          title="Download chart data"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );

  return (
    <FinanceCard noPadding className={className}>
      <WidgetHeader title={title} subtitle={subtitle} icon={icon} action={action} />

      <div className={`relative ${chartHeight} p-4`}>
        {isLoading ? (
          <LoadingSkeleton variant="chart" />
        ) : isEmpty ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-[12px] text-slate-400">{emptyMessage}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </FinanceCard>
  );
}
