// ============================================================================
// FINANCE DESIGN SYSTEM — AIRecommendationCard
// Expandable AI recommendation panel item with priority, category,
// confidence score, suggested action, responsible unit and deadline.
// ============================================================================

import { useState, type ReactNode } from "react";
import { Bot, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { FinanceCard } from "./FinanceCard";
import { PriorityChip } from "./StatusChip";

type Priority = "Critical" | "High" | "Medium" | "Low";

export interface AIRecommendation {
  id: number | string;
  priority: Priority;
  category: string;
  /** Confidence score 0-100. */
  confidence: number;
  /** One-sentence reason/finding. */
  reason: string;
  /** Suggested action for management. */
  action: string;
  responsible?: string;
  deadline?: string;
  impact?: "High" | "Medium" | "Low";
}

interface AIRecommendationItemProps {
  rec: AIRecommendation;
  /** Whether the item is currently expanded. */
  isOpen: boolean;
  onToggle: () => void;
  acknowledgeLabel?: string;
  viewDetailsLabel?: string;
  onAcknowledge?: (rec: AIRecommendation) => void;
  onViewDetails?: (rec: AIRecommendation) => void;
}

export function AIRecommendationItem({
  rec,
  isOpen,
  onToggle,
  acknowledgeLabel = "Acknowledge",
  viewDetailsLabel = "View Details",
  onAcknowledge,
  onViewDetails,
}: AIRecommendationItemProps) {
  return (
    <div className="border-b border-slate-100 last:border-0">
      {/* Collapsed header — always visible */}
      <button
        className="w-full p-3 text-start transition-colors hover:bg-slate-50/60"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <PriorityChip priority={rec.priority} />
            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
              {rec.category}
            </span>
            {rec.impact && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                {rec.impact} Impact
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="text-[10px] text-slate-400">{rec.confidence}%</span>
            {isOpen ? (
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            )}
          </div>
        </div>
        <p className="mt-1.5 text-[11px] leading-4 text-slate-700">{rec.reason}</p>
      </button>

      {/* Expanded content */}
      {isOpen && (
        <div className="border-t border-dashed border-slate-200 bg-slate-50 px-3 pb-3 pt-2 space-y-2.5">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mb-1">
              Suggested Action
            </p>
            <p className="text-[11px] leading-4 text-slate-700">{rec.action}</p>
          </div>

          {(rec.responsible || rec.deadline) && (
            <div className="grid grid-cols-2 gap-2">
              {rec.responsible && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">
                    Responsible
                  </p>
                  <p className="text-[11px] text-slate-700">{rec.responsible}</p>
                </div>
              )}
              {rec.deadline && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">
                    Deadline
                  </p>
                  <p className="font-mono text-[11px] text-slate-700" dir="ltr">
                    {rec.deadline}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Confidence bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[9px] text-slate-400">
              <span>AI Confidence</span>
              <span dir="ltr">{rec.confidence}%</span>
            </div>
            <div className="h-1 w-full rounded-full bg-slate-200">
              <div
                className="h-1 rounded-full transition-all"
                style={{
                  width: `${rec.confidence}%`,
                  background:
                    rec.confidence >= 85
                      ? "#15803d"
                      : rec.confidence >= 65
                      ? "#d97706"
                      : "#c81e1e",
                }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-0.5">
            <button
              onClick={() => onAcknowledge?.(rec)}
              className="flex-1 rounded bg-[#003b70] px-2 py-1.5 text-center text-[10px] font-bold text-white transition-colors hover:bg-[#002a55]"
            >
              {acknowledgeLabel}
            </button>
            <button
              onClick={() => onViewDetails?.(rec)}
              className="flex-1 inline-flex items-center justify-center gap-1 rounded border border-slate-300 px-2 py-1.5 text-[10px] font-semibold text-slate-700 transition-colors hover:bg-slate-100"
            >
              {viewDetailsLabel}
              <ExternalLink className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Panel wrapper ────────────────────────────────────────────────────────────

interface AIRecommendationPanelProps {
  title?: string;
  recommendations: AIRecommendation[];
  isLoading?: boolean;
  acknowledgeLabel?: string;
  viewDetailsLabel?: string;
  onAcknowledge?: (rec: AIRecommendation) => void;
  onViewDetails?: (rec: AIRecommendation) => void;
  /** Initially expanded item id. */
  defaultOpen?: number | string | null;
  className?: string;
}

export function AIRecommendationPanel({
  title = "AI Recommendations",
  recommendations,
  isLoading = false,
  acknowledgeLabel,
  viewDetailsLabel,
  onAcknowledge,
  onViewDetails,
  defaultOpen = null,
  className = "",
}: AIRecommendationPanelProps) {
  const [openId, setOpenId] = useState<number | string | null>(
    defaultOpen ?? (recommendations[0]?.id ?? null),
  );

  if (isLoading) {
    return (
        <FinanceCard dark noPadding className={className}>
            <div className="flex items-center justify-center py-12">
                <Bot className="mr-2 h-5 w-5 animate-pulse text-white" />
                <span className="text-sm text-white">
                    Loading recommendations...
                </span>
            </div>
        </FinanceCard>
      );
  }

  return (
    <FinanceCard dark noPadding className={className}>
      {/* Dark header */}
      <div className="border-b border-white/10 p-4">
        <h2 className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-white">
          <Bot className="h-4 w-4" />
          {title}
        </h2>
      </div>
      {/* White body */}
      <div className="rounded-b-[10px] bg-white">
        {recommendations.map((rec) => (
          <AIRecommendationItem
            key={rec.id}
            rec={rec}
            isOpen={openId === rec.id}
            onToggle={() => setOpenId(openId === rec.id ? null : rec.id)}
            acknowledgeLabel={acknowledgeLabel}
            viewDetailsLabel={viewDetailsLabel}
            onAcknowledge={onAcknowledge}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>
    </FinanceCard>
  );
}
