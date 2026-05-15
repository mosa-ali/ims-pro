/**
 * Phase 2: Qualification Baseline Panel
 * 
 * Displays the vendor's qualification baseline scores in the BEC UI.
 * Shows as a read-only sidebar panel with:
 * - Vendor info
 * - Qualification classification and risk level
 * - Normalized baseline scores
 * - Evaluation date and source
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface QualificationBaselinePanelProps {
  vendorId: number;
  language?: "en" | "ar";
}

const classificationColors: Record<string, string> = {
  preferred: "bg-green-100 text-green-800",
  approved: "bg-blue-100 text-blue-800",
  conditional: "bg-yellow-100 text-yellow-800",
  rejected: "bg-red-100 text-red-800",
};

const riskLevelColors: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const riskLevelIcons: Record<string, React.ReactNode> = {
  low: <CheckCircle2 className="w-4 h-4" />,
  medium: <AlertCircle className="w-4 h-4" />,
  high: <AlertCircle className="w-4 h-4" />,
  critical: <AlertCircle className="w-4 h-4" />,
};

export function QualificationBaselinePanel({
  vendorId,
  language = "en",
}: QualificationBaselinePanelProps) {
  const { data: qualificationData, isLoading, error } =
    trpc.bidEvaluationPhase2.getQualificationBaselineWithVendor.useQuery(
      { vendorId },
      { enabled: !!vendorId }
    );

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            {language === "ar"
              ? "خط الأساس للتأهيل"
              : "Qualification Baseline"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !qualificationData) {
    return (
      <Card className="w-full border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-yellow-900">
            {language === "ar"
              ? "لا يوجد خط أساس للتأهيل"
              : "No Qualification Baseline"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-yellow-800">
          {language === "ar"
            ? "هذا البائع لم يتم تقييمه بعد"
            : "This vendor has not been evaluated yet"}
        </CardContent>
      </Card>
    );
  }

  const { vendor, baseline } = qualificationData;
  const isRTL = language === "ar";

  return (
    <Card className="w-full border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-sm font-semibold text-blue-900">
              {language === "ar"
                ? "خط الأساس للتأهيل"
                : "Qualification Baseline"}
            </CardTitle>
            <p className="text-xs text-blue-700 mt-1">{vendor.name}</p>
          </div>
          <Badge
            className={`${classificationColors[baseline.classification] || "bg-gray-100"} text-xs`}
          >
            {baseline.classification.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Risk Level */}
        <div className="flex items-center gap-2 p-2 bg-white rounded border border-blue-100">
          <div className={riskLevelColors[baseline.riskLevel]}>
            {riskLevelIcons[baseline.riskLevel]}
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-700">
              {language === "ar" ? "مستوى المخاطر" : "Risk Level"}
            </p>
            <p className="text-xs text-gray-600 capitalize">
              {baseline.riskLevel}
            </p>
          </div>
        </div>

        {/* Evaluation Date */}
        <div className="p-2 bg-white rounded border border-blue-100">
          <p className="text-xs font-medium text-gray-700">
            {language === "ar" ? "تاريخ التقييم" : "Evaluation Date"}
          </p>
          <p className="text-xs text-gray-600">
            {new Date(baseline.evaluationDate).toLocaleDateString(
              language === "ar" ? "ar-SA" : "en-US"
            )}
          </p>
        </div>

        {/* Scores */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-blue-900">
            {language === "ar" ? "الدرجات المعيارية" : "Baseline Scores"}
          </p>

          <div className="grid grid-cols-2 gap-2">
            {/* Legal & Administrative */}
            <div className="p-2 bg-white rounded border border-blue-100">
              <p className="text-xs text-gray-600">
                {language === "ar" ? "القانونية" : "Legal & Admin"}
              </p>
              <p className="text-sm font-bold text-blue-900">
                {baseline.scores.legalAdministrative.toFixed(1)}
              </p>
            </div>

            {/* Experience & Technical */}
            <div className="p-2 bg-white rounded border border-blue-100">
              <p className="text-xs text-gray-600">
                {language === "ar" ? "الخبرة" : "Experience"}
              </p>
              <p className="text-sm font-bold text-blue-900">
                {baseline.scores.experienceTechnical.toFixed(1)}
              </p>
            </div>

            {/* Operational & Financial */}
            <div className="p-2 bg-white rounded border border-blue-100">
              <p className="text-xs text-gray-600">
                {language === "ar" ? "التشغيلية" : "Operational"}
              </p>
              <p className="text-sm font-bold text-blue-900">
                {baseline.scores.operationalPresence.toFixed(1)}
              </p>
            </div>

            {/* References */}
            <div className="p-2 bg-white rounded border border-blue-100">
              <p className="text-xs text-gray-600">
                {language === "ar" ? "المراجع" : "References"}
              </p>
              <p className="text-sm font-bold text-blue-900">
                {baseline.scores.references.toFixed(1)}
              </p>
            </div>
          </div>

          {/* Total */}
          <div className="p-2 bg-blue-100 rounded border border-blue-300">
            <p className="text-xs font-medium text-blue-900">
              {language === "ar" ? "الإجمالي" : "Total"}
            </p>
            <p className="text-lg font-bold text-blue-900">
              {baseline.scores.total.toFixed(1)}/30
            </p>
          </div>
        </div>

        {/* Info Message */}
        <div className="p-2 bg-blue-100 rounded text-xs text-blue-800">
          {language === "ar"
            ? "هذه الدرجات محملة تلقائياً من تقييم البائع ولا يمكن تعديلها"
            : "These scores are auto-loaded from vendor qualification and cannot be modified"}
        </div>
      </CardContent>
    </Card>
  );
}

export default QualificationBaselinePanel;
