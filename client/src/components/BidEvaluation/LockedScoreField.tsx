/**
 * Phase 2: Locked Score Field Component
 * 
 * Displays score input fields with lock enforcement.
 * - Blue background for visual distinction
 * - Tooltip showing source and snapshot value
 * - Read-only input field
 * - Bilingual support (EN/AR)
 */

import { Input } from "@/components/ui/input";
import { Lock, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LockedScoreFieldProps {
  score: string | number;
  label: string;
  isLocked: boolean;
  isAutoLoaded: boolean;
  sourceType?: "qualification_auto" | "procurement_manual" | "financial_auto";
  qualificationSnapshotValue?: string | number;
  evaluationSource?: string;
  notes?: string;
  language?: "en" | "ar";
  disabled?: boolean;
}

const sourceTypeLabels: Record<string, Record<string, string>> = {
  qualification_auto: {
    en: "Auto-loaded from Vendor Qualification",
    ar: "محمل تلقائياً من تقييم البائع",
  },
  procurement_manual: {
    en: "Manually entered during procurement",
    ar: "تم إدخاله يدوياً أثناء المشتريات",
  },
  financial_auto: {
    en: "Auto-calculated from financial scoring",
    ar: "محسوب تلقائياً من التقييم المالي",
  },
};

export function LockedScoreField({
  score,
  label,
  isLocked,
  isAutoLoaded,
  sourceType = "procurement_manual",
  qualificationSnapshotValue,
  evaluationSource,
  notes,
  language = "en",
  disabled = false,
}: LockedScoreFieldProps) {
  const isRTL = language === "ar";
  const sourceLabel = sourceTypeLabels[sourceType]?.[language] || sourceType;

  const tooltipContent = (
    <div className="space-y-1 text-xs">
      <p className="font-semibold">{label}</p>
      <p>{sourceLabel}</p>
      {qualificationSnapshotValue !== undefined && (
        <p>
          {language === "ar" ? "القيمة المحفوظة" : "Snapshot Value"}:{" "}
          {qualificationSnapshotValue}
        </p>
      )}
      {notes && <p className="italic">{notes}</p>}
    </div>
  );

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {isLocked && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Lock className="w-4 h-4 text-blue-600" />
              </TooltipTrigger>
              <TooltipContent side="right">{tooltipContent}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div
        className={`relative ${isLocked ? "bg-blue-50 border-blue-200" : ""}`}
      >
        <Input
          type="number"
          value={score}
          disabled={isLocked || disabled}
          readOnly={isLocked}
          className={`
            ${isLocked ? "bg-blue-50 border-blue-200 text-blue-900 cursor-not-allowed" : ""}
            ${isAutoLoaded ? "font-semibold" : ""}
          `}
        />
        {isLocked && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Lock className="w-4 h-4 text-blue-400" />
          </div>
        )}
      </div>
      {isAutoLoaded && (
        <p className="text-xs text-blue-600">
          {language === "ar"
            ? "محمل تلقائياً من التأهيل"
            : "Auto-loaded from qualification"}
        </p>
      )}
    </div>
  );
}

/**
 * Score Field Group Component
 * Displays multiple score fields with proper grouping and styling
 */
interface ScoreFieldGroupProps {
  title: string;
  scores: Array<{
    id: number;
    label: string;
    value: string | number;
    isLocked: boolean;
    isAutoLoaded: boolean;
    sourceType?: string;
    qualificationSnapshotValue?: string | number;
  }>;
  language?: "en" | "ar";
}

export function ScoreFieldGroup({
  title,
  scores,
  language = "en",
}: ScoreFieldGroupProps) {
  const isRTL = language === "ar";

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
      <h3 className="font-semibold text-sm text-gray-900">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scores.map((score) => (
          <LockedScoreField
            key={score.id}
            score={score.value}
            label={score.label}
            isLocked={score.isLocked}
            isAutoLoaded={score.isAutoLoaded}
            sourceType={score.sourceType as any}
            qualificationSnapshotValue={score.qualificationSnapshotValue}
            language={language}
          />
        ))}
      </div>
      {scores.some((s) => s.isAutoLoaded) && (
        <div className="flex items-start gap-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            {language === "ar"
              ? "بعض الدرجات محملة تلقائياً من تقييم البائع ولا يمكن تعديلها"
              : "Some scores are auto-loaded from vendor qualification and cannot be modified"}
          </p>
        </div>
      )}
    </div>
  );
}

export default LockedScoreField;
