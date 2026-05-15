import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import React from "react";
import { useParams, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { GLOBAL_CURRENCIES } from "../../../../shared/const";
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from "@/components/ui/table";
import { Save, AlertTriangle, CheckCircle2, XCircle, Printer, Lock, LockOpen, FileSpreadsheet, Download, ChevronDown, ChevronUp, ChevronsUpDown, Loader2, ShieldCheck, ClipboardCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

/**
 * Bid Evaluation Checklist (BA/CBA)
 * 
 * Official Evaluation Matrix:
 * Section 1: Legal & Administrative (9 pts)
 * Section 2: Experience & Technical Capacity (10 pts)
 * Section 3: Operational & Financial Capacity (20 pts)
 * Section 4: Samples (if relevant) (5 pts, conditional)
 * Section 5: References (6 pts)
 * Section 6: Total Offer Price (50 pts, auto-calculated)
 * 
 * Technical max = 50 (normalized), Financial max = 50, Total = 100
 * Threshold: 70% of technical (35/50)
 * Hard-stops: mandatory criteria scored 0 → disqualified
 * Payment Terms: mutually exclusive radio (3 options)
 */

// Deterministic badge colors for bidders (with print-safe hex values)
const BADGE_COLORS = [
 { text: "text-red-700", bg: "bg-red-50", printBg: "#fef2f2", printText: "#b91c1c" },
 { text: "text-blue-700", bg: "bg-blue-50", printBg: "#eff6ff", printText: "#1d4ed8" },
 { text: "text-green-700", bg: "bg-green-50", printBg: "#f0fdf4", printText: "#15803d" },
 { text: "text-purple-700", bg: "bg-purple-50", printBg: "#faf5ff", printText: "#7e22ce" },
 { text: "text-orange-600", bg: "bg-orange-50", printBg: "#fff7ed", printText: "#ea580c" },
 { text: "text-teal-700", bg: "bg-teal-50", printBg: "#f0fdfa", printText: "#0f766e" },
 { text: "text-pink-700", bg: "bg-pink-50", printBg: "#fdf2f8", printText: "#be185d" },
];

export default function BidEvaluationChecklist() {
 const { t } = useTranslation();
 const { id } = useParams<{ id: string }>();
 const [, setLocation] = useLocation();
 const { language, isRTL} = useLanguage();
 const printRef = useRef<HTMLDivElement>(null);
 const utils = trpc.useUtils();

 // Auto-sync vendor qualification scores into evaluation matrix
const bulkSyncQualificationScores =
  trpc.logistics.bidAnalysis.bulkSyncQualificationScores.useMutation({
    onSuccess: async () => {
      await utils.logistics.bidAnalysis.getScores.invalidate({
        bidAnalysisId: parseInt(id!),
      });

      await utils.logistics.bidEvaluation.getCalculatedScores.invalidate({
        bidAnalysisId: parseInt(id!),
      });

      await refetchScores();
      await refetchCalculatedScores();

      toast.success(
        isRTL
          ? "تم تحميل درجات تأهيل الموردين تلقائياً"
          : "Vendor qualification scores auto-loaded successfully"
      );
    },

    onError: (error: any) => {
      console.error("Qualification sync failed:", error);

      toast.error(
        error?.message ||
        (isRTL
          ? "فشل في تحميل درجات التأهيل"
          : "Failed to auto-load qualification scores")
      );
    },
  });

 // ========== TRANSLATION OBJECT (BOM PATTERN) ==========
 const localT = {
   // Header & Navigation
   backToWorkspace: t.logistics.backToWorkspace,
   documentTitle: t.bidEvaluationChecklist?.bidEvaluationChecklist || "Bid Evaluation Checklist",
   officialRecord: t.bidEvaluationChecklist?.officialRecordFor || "Official record for",
   
   // Evaluation Criteria
   bidEvaluationCriteria: t.bidEvaluationChecklist?.bidEvaluationCriteria || "Bid Evaluation Criteria",
   evaluationCriteriaInitialized: t.bidEvaluationChecklist?.evaluationCriteriaInitialized || "Evaluation criteria initialized",
   evaluationCriteriaNotInitialized: t.bidEvaluationChecklist?.evaluationCriteriaNotInitialized || "Evaluation criteria have not been initialized yet",
   initializeEvaluationCriteria: t.bidEvaluationChecklist?.initializeEvaluationCriteria || "Initialize Evaluation Criteria",
   
   // Bidders & Summary
   bidder: t.bidEvaluationChecklist?.bidder || "Bidder",
   biddersSummary: t.bidEvaluationChecklist?.biddersSummary || "Bidders Summary",
   qualified: t.bidEvaluationChecklist?.qualified || "Qualified",
   notQualified: t.bidEvaluationChecklist?.notQualified || "Not Qualified",
   
   // Scores & Evaluation
   score: t.bidEvaluationChecklist?.score || "Score",
   maxScore: t.bidEvaluationChecklist?.maxScore || "Max Score",
   finalScore: t.bidEvaluationChecklist?.finalScore || "Final Score",
   technical: t.bidEvaluationChecklist?.technical || "Technical",
   financial: t.bidEvaluationChecklist?.financial || "Financial",
   final: t.bidEvaluationChecklist?.final || "Final",
   technicalPlusFinancial: t.bidEvaluationChecklist?.technicalPlusFinancial || "Technical + Financial",
   totalTechnicalScore: t.bidEvaluationChecklist?.totalTechnicalScore || "Total Technical Score",
   financialScore: t.bidEvaluationChecklist?.financialScore || "Financial Score",
   
   // Sections
   section: t.bidEvaluationChecklist?.section || "Section",
   sectionTotal: t.bidEvaluationChecklist?.sectionTotal || "Section Total",
   sumOfSections: t.bidEvaluationChecklist?.sumOfSections || "Sum of Sections 1–5",
   requirement: t.bidEvaluationChecklist?.requirement || "Requirement",
   details: t.bidEvaluationChecklist?.details || "Details",
   
   // Price & Currency
   price: t.bidEvaluationChecklist?.price || "Price",
   currency: t.bidEvaluationChecklist?.currency || "Currency",
   totalOfferPrice: t.bidEvaluationChecklist?.totalOfferPrice || "Total Offer Price",
   priceMissingOrInvalid: t.bidEvaluationChecklist?.priceMissingOrInvalid || "Total Offer Price is missing or invalid (must be > 0)",
   paymentTerms: t.bidEvaluationChecklist?.paymentTerms || "Payment Terms",
   
   // Status & Qualification
   status: t.bidEvaluationChecklist?.status || "Status",
   screening: t.bidEvaluationChecklist?.screening || "Screening",
   mandatoryCriteriaFailed: t.bidEvaluationChecklist?.mandatoryCriteriaFailed || "Mandatory criteria failed",
   mandatoryHardStop: t.bidEvaluationChecklist?.mandatoryHardStop || "Mandatory hard-stop criterion. Score of 0 results in automatic disqualification.",
   technicalBelowThreshold: t.bidEvaluationChecklist?.technicalBThreshold || "Technical score is below 70% threshold",
   
   // Remarks
   remarks: t.bidEvaluationChecklist?.remarks || "Remarks",
   remarksDescription: t.bidEvaluationChecklist?.remarksDescription || "Auto-collected feedback for Not Qualified bidders",
   noRemarksAllQualified: t.bidEvaluationChecklist?.noRemarksAllQualified || "All bidders are qualified — no remarks to display.",
   selectOnePerBidder: t.bidEvaluationChecklist?.selectOnePerBidder || "select one per bidder",
   
   // Scoring Actions
   saveAllScores: t.bidEvaluationChecklist?.saveAllScores || "Save All Scores",
   allScoresSavedSuccessfully: t.bidEvaluationChecklist?.allScoresSavedSuccessfully || "All scores saved successfully",
   lockScores: t.bidEvaluationChecklist?.scoresAreLocked || "Scores are locked",
   scoresLockedSuccessfully: t.bidEvaluationChecklist?.scoresLockedSuccessfully || "Scores locked successfully",
   scoresUnlockedForEditing: t.bidEvaluationChecklist?.scoresUnlockedForEditing || "Scores unlocked for editing",
   failedToLockScores: t.bidEvaluationChecklist?.failedToLockScores || "Failed to lock scores",
   failedToUnlockScores: t.bidEvaluationChecklist?.failedToUnlockScores || "Failed to unlock scores",
   failedToSaveTotalOfferPrice: t.bidEvaluationChecklist?.failedToSaveTotalOfferPrice || "Failed to save total offer price",
   unlockScores: t.bidEvaluationChecklist?.unlockScores || "Unlock Scores",
   
   // Finalization
   finalizeEvaluation: t.bidEvaluationChecklist?.finalizeEvaluation || "Finalize Evaluation",
   confirmFinalize: t.bidEvaluationChecklist?.confirmFinalize || "Are you sure you want to finalize this evaluation?",
   evaluationFinalized: t.bidEvaluationChecklist?.evaluationFinalized || "Evaluation finalized successfully",
   evaluationAlreadyFinalized: t.bidEvaluationChecklist?.evaluationAlreadyFinalized || "This evaluation has already been finalized.",
   finalizing: t.bidEvaluationChecklist?.finalizing || "Finalizing...",
   
   // Export & Print
   exportPdf: t.bidEvaluationChecklist?.exportPdf || "Export PDF",
   exportExcel: t.bidEvaluationChecklist?.exportExcel || "Export Excel",
   exportExcelWithData: t.bidEvaluationChecklist?.exportExcelWithData || "Export with Data",
   exportExcelTemplate: t.bidEvaluationChecklist?.exportExcelTemplate || "Export Empty Template",
   printExportPdf: t.bidEvaluationChecklist?.printExportPdf || "Print / Export PDF",
   generatingPdf: t.bidEvaluationChecklist?.generatingPdf || "Generating PDF...",
   generatingExcel: t.bidEvaluationChecklist?.generatingExcel || "Generating Excel...",
   
   // UI Controls
   expandAll: t.bidEvaluationChecklist?.expandAll || "Expand All",
   collapseAll: t.bidEvaluationChecklist?.collapseAll || "Collapse All",
   loading: t.bidEvaluationChecklist?.loading || "Loading...",
   
   // PR Reference
   prReference: t.bidEvaluationChecklist?.prReference || "PR Reference",
   
   // Common
   save: t.common.save,
   cancel: t.common.cancel,
   delete: t.common.delete,
   edit: t.common.edit,
   add: t.common.add,
   submit: t.common.submit,
   required: t.common.required,
   error: t.common.error,
 };

 // Fetch BA data
 const { data: ba, isLoading: baLoading } = trpc.logistics.bidAnalysis.getById.useQuery(
 { id: parseInt(id!) },
 { enabled: !!id }
 );

 // Fetch bidders
 const { data: bidders = [], isLoading: biddersLoading } = trpc.logistics.bidAnalysis.getBidders.useQuery(
 { bidAnalysisId: parseInt(id!) },
 { enabled: !!id }
 );

 // Fetch evaluation criteria
 const { data: criteria = [], isLoading: criteriaLoading } = trpc.logistics.bidAnalysis.getCriteria.useQuery(
 { bidAnalysisId: parseInt(id!) },
 { enabled: !!id }
 );

 // Fetch evaluation scores
 const { data: scores = [], refetch: refetchScores } = trpc.logistics.bidAnalysis.getScores.useQuery(
 { bidAnalysisId: parseInt(id!) },
 { enabled: !!id }
 );

 // ── Layer 1 → Layer 2 Auto-Sync: Vendor Qualification Scores (read-only) ──
 // Extract vendor IDs from bidders to batch-fetch their qualification scores
 const bidderVendorIds = useMemo(() => {
 return bidders
 .filter((b: any) => b.supplierId)
 .map((b: any) => b.supplierId as number);
 }, [bidders]);

 const { data: qualificationMap = {} } = trpc.vendors.getQualificationBatch.useQuery(
 { vendorIds: bidderVendorIds },
 { enabled: bidderVendorIds.length > 0 }
 );

 // Fetch calculated scores (SINGLE SOURCE OF TRUTH)
 const { data: calculatedScores = [], refetch: refetchCalculatedScores } = trpc.logistics.bidEvaluation.getCalculatedScores.useQuery(
 { bidAnalysisId: parseInt(id!) },
 { enabled: !!id }
 );

 // Initialize criteria mutation
 const initializeCriteria = trpc.logistics.bidAnalysis.initializeCriteria.useMutation({
 onSuccess: () => {
 toast.success(t.bidEvaluationChecklist.evaluationCriteriaInitialized);
 window.location.reload();
 },
 });

 // Save total offer price mutation
 const saveTotalOfferPrice = trpc.logistics.bidEvaluation.saveTotalOfferPrice.useMutation({
 onSuccess: () => {
 refetchCalculatedScores();
 },
 onError: (error: any) => {
 toast.error(error.message || t.bidEvaluationChecklist.failedToSaveTotalOfferPrice);
 },
 });

 // Update score mutation
 const updateScore = trpc.logistics.bidAnalysis.updateScore.useMutation({
 onSuccess: () => {
 refetchScores();
 refetchCalculatedScores();
 },
 onError: (error: any) => {
 toast.error(error.message);
 },
 });

 // Local scores state
 const [localScores, setLocalScores] = useState<Record<string, number>>({});
 // Local total offer prices
 const [localPrices, setLocalPrices] = useState<Record<number, string>>({});
 // Local currency per bidder
 const [localCurrencies, setLocalCurrencies] = useState<Record<number, string>>({});
 // Scores locked (read-only) state — derived from DB timestamp
 const scoresLocked = !!(ba as any)?.scoringLockedAt;

 // Lock / unlock mutations
 const lockScoringMutation = trpc.logistics.bidAnalysis.lockScoring.useMutation({
 onSuccess: () => {
 toast.success(t.bidEvaluationChecklist.scoresLockedSuccessfully);
 utils.logistics.bidAnalysis.getById.invalidate({ id: parseInt(id!) });
 },
 onError: (err: any) => toast.error(err.message || t.bidEvaluationChecklist.failedToLockScores),
 });
 const unlockScoringMutation = trpc.logistics.bidAnalysis.unlockScoring.useMutation({
 onSuccess: () => {
 toast.info(t.bidEvaluationChecklist.scoresUnlockedForEditing);
 utils.logistics.bidAnalysis.getById.invalidate({ id: parseInt(id!) });
 },
 onError: (err: any) => toast.error(err.message || t.bidEvaluationChecklist.failedToUnlockScores),
 });

 const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
 const finalizeMutation = trpc.logistics.bidEvaluation.finalizeEvaluation.useMutation({
 onSuccess: () => {
 toast.success(t.bidEvaluationChecklist.evaluationFinalized);
 utils.logistics.bidAnalysis.getById.invalidate({ id: parseInt(id!) });
 setShowFinalizeConfirm(false);
 },
 onError: (err: any) => toast.error(err.message || (isRTL ? 'فشل في إنهاء التقييم' : 'Failed to finalize evaluation')),
 });

 // Stabilize scores/bidders references to prevent infinite re-render loops.
 // tRPC + superjson + json-patch can break React Query structural sharing,
 // causing new array references on every render cycle.
 const scoresFingerprint = useMemo(
   () => JSON.stringify(scores.map((s: any) => `${s.criterionId}-${s.bidderId}-${s.score}`)),
   [scores]
 );
 const biddersFingerprint = useMemo(
   () => JSON.stringify(bidders.map((b: any) => `${b.id}-${b.totalBidAmount}-${b.currency}`)),
   [bidders]
 );

 useEffect(() => {
 const scoreMap: Record<string, number> = {};
 scores.forEach((score: any) => {
 const key = `${score.criterionId}-${score.bidderId}`;
 scoreMap[key] = parseFloat(score.score || "0");
 });
 setLocalScores(scoreMap);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [scoresFingerprint]);

 useEffect(() => {
 const priceMap: Record<number, string> = {};
 const currencyMap: Record<number, string> = {};
 bidders.forEach((b: any) => {
 if (b.totalBidAmount) {
 priceMap[b.id] = String(b.totalBidAmount);
 }
 currencyMap[b.id] = b.currency || "USD";
 });
 setLocalPrices(priceMap);
 setLocalCurrencies(currencyMap);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [biddersFingerprint]);
 
 const activeBidders = useMemo(() =>
 bidders.filter((b: any) => b.submissionStatus !== "disqualified"),
 [bidders]
 );

 // ════════════════════════════════════════════════════════
// AUTO-SYNC VENDOR QUALIFICATION SCORES
// Layer 1 (Vendor Qualification)
// → Layer 2 (Bid Evaluation Matrix)
// ════════════════════════════════════════════════════════

  const autoSyncTriggered = useRef(false);

  useEffect(() => {
    // Prevent duplicate sync calls
    if (autoSyncTriggered.current) return;

    // Wait until all required data loaded
    if (
      !id ||
      criteria.length === 0 ||
      bidders.length === 0 ||
      Object.keys(qualificationMap).length === 0
    ) {
      return;
    }

    // Ensure at least one bidder has qualification data
    const hasQualificationData = bidders.some(
      (b: any) => qualificationMap[b.supplierId]
    );

    if (!hasQualificationData) {
      return;
    }

    autoSyncTriggered.current = true;

    bulkSyncQualificationScores.mutate({
      bidAnalysisId: parseInt(id!),
    });

  }, [
    id,
    criteria,
    bidders,
    qualificationMap,
  ]);

 const handleScoreChange = (criterionId: number, bidderId: number, value: string, maxScore?: number) => {
 const key = `${criterionId}-${bidderId}`;
 let numValue = parseFloat(value) || 0;
 if (maxScore !== undefined && numValue > maxScore) {
 numValue = maxScore;
 }
 if (numValue < 0) numValue = 0;
 setLocalScores((prev) => ({ ...prev, [key]: numValue }));
 };

 const handleSaveScore = (criterionId: number, bidderId: number) => {
 const key = `${criterionId}-${bidderId}`;
 const score = localScores[key] || 0;
 updateScore.mutate({
 bidAnalysisId: parseInt(id!),
 criterionId,
 bidderId,
 score,
 status: "scored",
 });
 };

 /**
 * Handle Payment Terms radio selection
 * When one option is selected, clear the others in the same group
 */
 const handlePaymentTermsSelect = (selectedCriterionId: number, bidderId: number, maxScore: number, allPaymentCriteria: any[]) => {
 const selectedKey = `${selectedCriterionId}-${bidderId}`;
 setLocalScores((prev) => {
 const updated = { ...prev };
 allPaymentCriteria.forEach((c: any) => {
 const k = `${c.id}-${bidderId}`;
 updated[k] = 0;
 });
 updated[selectedKey] = maxScore;
 return updated;
 });

 allPaymentCriteria.forEach((c: any) => {
 const score = c.id === selectedCriterionId ? maxScore : 0;
 updateScore.mutate({
 bidAnalysisId: parseInt(id!),
 criterionId: c.id,
 bidderId,
 score,
 status: "scored",
 });
 });
 };

 const handleSaveAll = () => {
 const updates = Object.entries(localScores).map(([key, score]) => {
 const [criterionId, bidderId] = key.split("-").map(Number);
 return { criterionId, bidderId, score };
 });

 Promise.all(
 updates.map((update) =>
 updateScore.mutateAsync({
 bidAnalysisId: parseInt(id!),
 criterionId: update.criterionId,
 bidderId: update.bidderId,
 score: update.score,
 status: "scored",
 })
 )
 ).then(() => {
 toast.success(t.bidEvaluationChecklist.allScoresSavedSuccessfully);
 refetchCalculatedScores();
 lockScoringMutation.mutate({ bidAnalysisId: parseInt(id!) });
 });
 };

 const handleSavePrice = (bidderId: number) => {
 const price = parseFloat(localPrices[bidderId] || "0");
 if (price > 0) {
 saveTotalOfferPrice.mutate({
 bidAnalysisId: parseInt(id!),
 bidderId,
 totalOfferPrice: price,
 currency: localCurrencies[bidderId] || "USD",
 });
 }
 };

 const handleCurrencyChange = (bidderId: number, currency: string) => {
 setLocalCurrencies(prev => ({ ...prev, [bidderId]: currency }));
 const price = parseFloat(localPrices[bidderId] || "0");
 if (price > 0) {
 saveTotalOfferPrice.mutate({
 bidAnalysisId: parseInt(id!),
 bidderId,
 totalOfferPrice: price,
 currency,
 });
 }
 };

 /**
 * Print / Export PDF handler
 * Opens browser print dialog with compact landscape A4 layout
 */
 const [pdfLoading, setPdfLoading] = useState(false);
 const [excelLoading, setExcelLoading] = useState(false);

 const generatePDF =
  trpc.logistics.generatePDF.useMutation();

const handleExportPdf = useCallback(async () => {
  if (!id) return;

  try {
    setPdfLoading(true);

    const result = await generatePDF.mutateAsync({
      documentType: "bidEvaluationChecklist",
      documentId: Number(id),
      language: isRTL ? "ar" : "en",
    });

    if (!result?.pdf || !result.pdf.startsWith("JVBER")) {
      toast.error(
        isRTL
          ? "ملف PDF غير صالح"
          : "Invalid PDF generated"
      );

      return;
    }

    // Base64 → Blob
    const binaryString = atob(result.pdf);

    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const blob = new Blob([bytes], {
      type: "application/pdf",
    });

    const url = window.URL.createObjectURL(blob);

    window.open(url, "_blank");

  } catch (error: any) {
    console.error(error);

    toast.error(
      error?.message ||
      (isRTL
        ? "خطأ في إنشاء PDF"
        : "Error generating PDF")
    );

  } finally {
    setPdfLoading(false);
  }
}, [id, isRTL]);

 const handleExportExcel = useCallback((mode: "data" | "template") => {
   if (!ba || !id) return;
   setExcelLoading(true);
   const orgId = ba.organizationId || '';
   const lang = language === 'ar' ? 'ar' : 'en';
   const url = `/organization/logistics/bid-analysis/${id}/evaluation-checklist-excel?lang=${lang}&orgId=${orgId}&mode=${mode}`;
   // Trigger download via hidden anchor
   const a = document.createElement("a");
   a.href = url;
   a.download = "";
   document.body.appendChild(a);
   a.click();
   document.body.removeChild(a);
   setTimeout(() => setExcelLoading(false), 2000);
 }, [ba, id, language]);

 // Group criteria by section
 const groupedSections = useMemo(() => {
 const groups: Record<number, { sectionNumber: number; sectionName: string; sectionNameAr: string; criteria: any[] }> = {};
 criteria.forEach((c: any) => {
 const sn = c.sectionNumber || 1;
 if (!groups[sn]) {
 groups[sn] = {
 sectionNumber: sn,
 sectionName: c.sectionName || `Section ${sn}`,
 sectionNameAr: c.sectionNameAr || c.sectionName || `القسم ${sn}`,
 criteria: [],
 };
 }
 groups[sn].criteria.push(c);
 });
 return Object.values(groups).sort((a, b) => a.sectionNumber - b.sectionNumber);
 }, [criteria]);

 // Collapsed sections state for collapse/expand feature
 const [collapsedSections, setCollapsedSections] = useState<Set<number>>(new Set());

 const toggleSection = useCallback((sectionNumber: number) => {
   setCollapsedSections(prev => {
     const next = new Set(prev);
     if (next.has(sectionNumber)) {
       next.delete(sectionNumber);
     } else {
       next.add(sectionNumber);
     }
     return next;
   });
 }, []);

 const toggleAllSections = useCallback(() => {
   setCollapsedSections(prev => {
     if (prev.size === groupedSections.length) {
       return new Set();
     }
     return new Set(groupedSections.map(s => s.sectionNumber));
   });
 }, [groupedSections]);

 // Calculate section total for a bidder
 const calcSectionTotal = (sectionCriteria: any[], bidderId: number): number => {
 let total = 0;
 const optionGroups = new Map<string, number>();
 sectionCriteria.forEach((c: any) => {
 const key = `${c.id}-${bidderId}`;
 const score = localScores[key] || 0;
 if (c.optionGroup) {
 const current = optionGroups.get(c.optionGroup) || 0;
 if (score > current) optionGroups.set(c.optionGroup, score);
 } else {
 total += score;
 }
 });
 optionGroups.forEach((v) => { total += v; });
 return total;
 };

 if (baLoading || biddersLoading || criteriaLoading) {
 return (
 <div className="flex items-center justify-center min-h-screen">
 <div className="text-center">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
 <p className="text-muted-foreground">{t.bidEvaluationChecklist.loading}</p>
 </div>
 </div>
 );
 }

 // Initialize criteria if empty
 if (criteria.length === 0) {
 return (
 <div className="container mx-auto py-6">
 <Card>
 <CardHeader>
 <CardTitle>{t.bidEvaluationChecklist.bidEvaluationCriteria}</CardTitle>
 </CardHeader>
 <CardContent>
 <Alert className="mb-4">
 <AlertTriangle className="h-4 w-4" />
 <AlertDescription>
 {t.bidEvaluationChecklist.evaluationCriteriaNotInitialized}
 </AlertDescription>
 </Alert>
 <Button onClick={() => initializeCriteria.mutate({ bidAnalysisId: parseInt(id!) })}>
 {t.bidEvaluationChecklist.initializeEvaluationCriteria}
 </Button>
 </CardContent>
 </Card>
 </div>
 );
 }

 // Identify payment terms criteria (optionGroup = "payment_terms")
 const paymentTermsCriteria = criteria.filter((c: any) => c.optionGroup === "payment_terms");

 return (
 <>
 {/* Print-specific styles */}
 <style>{`
 @media print {
 /* Hide non-printable elements */
 nav, header, aside, footer,
 .no-print,
 [data-no-print],
 button:not(.print-keep),
 .sidebar,
 .DashboardLayout-sidebar {
 display: none !important;
 }

 /* Reset page layout for landscape A4 */
 @page {
 size: A4 landscape;
 margin: 8mm 10mm;
 }

 /* Make the printable area fill the page */
 body {
 -webkit-print-color-adjust: exact !important;
 print-color-adjust: exact !important;
 color-adjust: exact !important;
 font-size: 9px !important;
 line-height: 1.2 !important;
 }

 .bec-print-container {
 width: 100% !important;
 max-width: 100% !important;
 padding: 0 !important;
 margin: 0 !important;
 }

 /* Compact cards */
 .bec-print-container .bec-card {
 break-inside: avoid;
 page-break-inside: avoid;
 margin-bottom: 4px !important;
 box-shadow: none !important;
 border: 1px solid #e5e7eb !important;
 }

 .bec-print-container .bec-card-header {
 padding: 4px 8px !important;
 }

 .bec-print-container .bec-card-content {
 padding: 2px 8px 4px !important;
 }

 /* Compact tables */
 .bec-print-container table {
 font-size: 8px !important;
 }

 .bec-print-container th,
 .bec-print-container td {
 padding: 2px 4px !important;
 font-size: 8px !important;
 line-height: 1.2 !important;
 }

 /* Preserve badge colors in print */
 .bec-badge-header {
 -webkit-print-color-adjust: exact !important;
 print-color-adjust: exact !important;
 }

 /* Disqualified bidder styling in print */
 .bec-disqualified-header {
 opacity: 0.5 !important;
 text-decoration: line-through !important;
 }

 /* Hide inputs, show values */
 .bec-print-container input[type="number"] {
 border: none !important;
 background: transparent !important;
 box-shadow: none !important;
 padding: 0 !important;
 text-align: center !important;
 font-size: 8px !important;
 -moz-appearance: textfield;
 }
 .bec-print-container input[type="number"]::-webkit-outer-spin-button,
 .bec-print-container input[type="number"]::-webkit-inner-spin-button {
 -webkit-appearance: none;
 margin: 0;
 }

 /* Hide select triggers in print */
 .bec-print-container .bec-currency-select {
 display: none !important;
 }
 .bec-print-container .bec-currency-print {
 display: inline !important;
 }

 /* Summary cards grid */
 .bec-summary-grid {
 display: flex !important;
 flex-wrap: wrap !important;
 gap: 4px !important;
 }
 .bec-summary-grid > * {
 flex: 1 1 18% !important;
 min-width: 120px !important;
 }

 /* Hide scrollbar artifacts */
 .overflow-x-auto {
 overflow: visible !important;
 }
 }

 /* Hide print-only elements on screen */
 @media screen {
 .bec-currency-print {
 display: none !important;
 }
 }

 /* Sticky header for evaluation tables */
 .bec-sticky-header thead {
 position: sticky;
 top: 0;
 z-index: 10;
 background: white;
 }
 .bec-sticky-header thead th {
 background: inherit;
 }
 .bec-sticky-header thead .bec-badge-header {
 position: sticky;
 top: 0;
 z-index: 11;
 }

 /* Sticky first column (Requirement) */
 .bec-sticky-col td:first-child,
 .bec-sticky-col th:first-child {
 position: sticky;
 left: 0;
 z-index: 5;
 background: white;
 }
 html[dir="rtl"] .bec-sticky-col td:first-child,
 html[dir="rtl"] .bec-sticky-col th:first-child {
 left: auto;
 right: 0;
 }
 .bec-sticky-col thead th:first-child {
 z-index: 15;
 background: #f3f4f6;
 }
     /* Section header row (bg-blue-100/80) */
     .bec-sticky-col .bg-blue-100\/80 td:first-child {
     background: #dbeafe;
     }
     /* Total Technical Score row (bg-blue-600) */
     .bec-sticky-col .bg-blue-600 td:first-child {
     background: #2563eb;
     }
     /* Section subtotal row (bg-slate-100) */
     .bec-sticky-col .bg-slate-100 td:first-child {
     background: #f1f5f9;
     }
     .bec-sticky-col .bg-green-50\/50 td:first-child {
     background: #f0fdf4;
     }
     .bec-sticky-col .bg-muted\/30 td:first-child {
     background: #f5f5f5;
     }
 /* Shadow on sticky column edge */
 .bec-sticky-col td:first-child::after,
 .bec-sticky-col th:first-child::after {
 content: '';
 position: absolute;
 top: 0;
 right: -4px;
 bottom: 0;
 width: 4px;
 background: linear-gradient(to right, rgba(0,0,0,0.06), transparent);
 pointer-events: none;
 }
 html[dir="rtl"] .bec-sticky-col td:first-child::after,
 html[dir="rtl"] .bec-sticky-col th:first-child::after {
 right: auto;
 left: -4px;
 background: linear-gradient(to left, rgba(0,0,0,0.06), transparent);
 }
 `}</style>

 <div
 ref={printRef}
 className="container mx-auto py-6 bec-print-container"
 >
 {/* Back button - purchase-requests style */}
 <BackButton onClick={() => setLocation(`/organization/logistics/procurement-workspace/${ba?.purchaseRequestId}`)} label={t.logistics.backToProcurementWorkspace} />

 {/* Header */}
 <div className="flex items-center justify-between mb-6 no-print">
 <div>
 <h1 className="text-2xl font-bold text-foreground">{t.bidEvaluationChecklist.bidEvaluationChecklist}</h1>
 <p className="text-muted-foreground text-sm">
 {t.bidEvaluationChecklist.officialRecordFor} {ba?.purchaseRequest?.prNumber || ''} | {t.bidEvaluationChecklist.technical} (50) + {t.bidEvaluationChecklist.financial} (50) = 100
 </p>
 </div>
 <div className="flex items-center gap-2">
 <Button variant="outline" onClick={handleExportPdf} disabled={pdfLoading}>
   {pdfLoading ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Printer className="h-4 w-4 me-2" />}
   {pdfLoading ? t.bidEvaluationChecklist.generatingPdf : t.bidEvaluationChecklist.exportPdf}
 </Button>
 <DropdownMenu>
   <DropdownMenuTrigger asChild>
     <Button variant="outline" disabled={excelLoading}>
       {excelLoading ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 me-2" />}
       {excelLoading ? t.bidEvaluationChecklist.generatingExcel : t.bidEvaluationChecklist.exportExcel}
       <ChevronDown className="h-3 w-3 ms-1" />
     </Button>
   </DropdownMenuTrigger>
   <DropdownMenuContent align="end">
     <DropdownMenuItem onClick={() => handleExportExcel("data")}>
       <Download className="h-4 w-4 me-2" />
       {t.bidEvaluationChecklist.exportExcelWithData}
     </DropdownMenuItem>
     <DropdownMenuSeparator />
     <DropdownMenuItem onClick={() => handleExportExcel("template")}>
       <FileSpreadsheet className="h-4 w-4 me-2" />
       {t.bidEvaluationChecklist.exportExcelTemplate}
     </DropdownMenuItem>
   </DropdownMenuContent>
 </DropdownMenu>
 <Button
 variant={scoresLocked ? "outline" : "default"}
 onClick={() => {
 if (scoresLocked) {
 unlockScoringMutation.mutate({ bidAnalysisId: parseInt(id!) });
 } else {
 handleSaveAll();
 }
 }}
 >
 {scoresLocked ? (
 <>
 <LockOpen className="h-4 w-4 me-2" />
 {t.bidEvaluationChecklist.unlockScores}
 </>
 ) : (
 <>
 <Save className="h-4 w-4 me-2" />
 {t.bidEvaluationChecklist.saveAllScores}
 </>
 )}
 </Button>
 </div>
 </div>

 {/* Scores Locked Banner */}
 {scoresLocked && (
 <div className="mb-4 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 no-print">
 <Lock className="h-4 w-4 shrink-0" />
 {t.bidEvaluationChecklist.scoresAreLocked}
 </div>
 )}

 {/* Print-only header (visible only when printing) */}
 <div className="hidden print:block mb-3">
 <h1 className="text-base font-bold">{t.bidEvaluationChecklist.bidEvaluationChecklist}</h1>
 <p className="text-[9px] text-gray-600">
 {t.bidEvaluationChecklist.officialRecordFor} {ba?.purchaseRequest?.prNumber || ''} | {t.bidEvaluationChecklist.technical} (50) + {t.bidEvaluationChecklist.financial} (50) = 100
 </p>
 </div>
 {/* ═══════════════ VENDOR QUALIFICATION SCORES (Auto-loaded, Read-Only) ═══════════════ */}
 {bidderVendorIds.length > 0 && Object.keys(qualificationMap).length > 0 && (
 <Card className="mb-6 bec-card border-blue-200 bg-blue-50/30">
 <CardHeader className="bec-card-header pb-2">
 <div className="flex items-center gap-2">
 <ClipboardCheck className="h-5 w-5 text-blue-600" />
 <CardTitle className="text-base text-blue-900">
 {isRTL ? 'درجات تأهيل المورد (محملة تلقائياً — للقراءة فقط)' : 'Vendor Qualification Scores (Auto-loaded — Read Only)'}
 </CardTitle>
 </div>
 <p className="text-xs text-blue-700 mt-1">
 {isRTL
 ? 'هذه الدرجات محملة من سجل المورد الرئيسي. لا يمكن تعديلها هنا.'
 : 'These scores are loaded from the Vendor Master record. They cannot be edited here.'}
 </p>
 </CardHeader>
 <CardContent className="bec-card-content pt-2">
 <div className="overflow-x-auto">
 <Table className="text-sm">
 <TableHeader>
 <TableRow>
 <TableHead className="text-xs">{isRTL ? 'القسم' : 'Section'}</TableHead>
 <TableHead className="text-xs text-center">{isRTL ? 'الحد الأقصى' : 'Max'}</TableHead>
 {activeBidders.map((bidder: any, idx: number) => {
 const color = BADGE_COLORS[idx % BADGE_COLORS.length];
 return (
 <TableHead key={bidder.id} className={`text-center text-xs ${color.text} ${color.bg}`}>
 {bidder.bidderName}
 </TableHead>
 );
 })}
 </TableRow>
 </TableHeader>
 <TableBody>
 {[
 { label: isRTL ? 'القانونية والإدارية' : 'Legal & Administrative', key: 'section1Total', max: 12 },
 { label: isRTL ? 'الخبرة والقدرة التقنية' : 'Experience & Technical', key: 'section2Total', max: 10 },
 { label: isRTL ? 'التواجد التشغيلي' : 'Operational Presence', key: 'section3Total', max: 2 },
 { label: isRTL ? 'المراجع' : 'References', key: 'section4Total', max: 6 },
 ].map(section => (
 <TableRow key={section.key}>
 <TableCell className="font-medium text-xs">{section.label}</TableCell>
 <TableCell className="text-center text-xs text-muted-foreground">{section.max}</TableCell>
 {activeBidders.map((bidder: any) => {
 const qual = (qualificationMap as any)[bidder.supplierId];
 const score = qual ? Number(qual[section.key]) || 0 : 0;
 return (
 <TableCell key={bidder.id} className="text-center text-xs font-medium">
 {qual ? (
 <span className={score >= section.max * 0.7 ? 'text-green-700' : score >= section.max * 0.5 ? 'text-yellow-700' : 'text-red-700'}>
 {score.toFixed(1)}
 </span>
 ) : (
 <span className="text-muted-foreground">—</span>
 )}
 </TableCell>
 );
 })}
 </TableRow>
 ))}
 <TableRow className="font-bold border-t-2">
 <TableCell className="text-xs">{isRTL ? 'مجموع التأهيل' : 'Qualification Total'}</TableCell>
 <TableCell className="text-center text-xs">30</TableCell>
 {activeBidders.map((bidder: any) => {
 const qual = (qualificationMap as any)[bidder.supplierId];
 const total = qual ? Number(qual.totalScore) || 0 : 0;
 const status = qual?.qualificationStatus;
 return (
 <TableCell key={bidder.id} className="text-center">
 <div className="text-sm font-bold">
 {qual ? (
 <span className={status === 'qualified' ? 'text-green-700' : status === 'conditional' ? 'text-yellow-700' : 'text-red-700'}>
 {total.toFixed(1)}/30
 </span>
 ) : (
 <span className="text-muted-foreground">—</span>
 )}
 </div>
 {qual && (
 <div className={`text-[10px] mt-0.5 ${
 status === 'qualified' ? 'text-green-600' : status === 'conditional' ? 'text-yellow-600' : 'text-red-600'
 }`}>
 {status === 'qualified' ? (isRTL ? '✓ مؤهل' : '✓ Qualified')
 : status === 'conditional' ? (isRTL ? '⚠ مشروط' : '⚠ Conditional')
 : (isRTL ? '✗ غير مؤهل' : '✗ Not Qualified')}
 </div>
 )}
 </TableCell>
 );
 })}
 </TableRow>
 </TableBody>
 </Table>
 </div>
 </CardContent>
 </Card>
 )}

 {/* Bidders Summary Cards */}
 <Card className="mb-6 bec-card">
 <CardHeader className="bec-card-header">
 <CardTitle>{t.bidEvaluationChecklist.biddersSummary}</CardTitle>
 </CardHeader>
 <CardContent className="bec-card-content">
 <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 bec-summary-grid">
 {activeBidders.map((bidder: any) => {
 const calc = calculatedScores.find((c: any) => c.bidderId === bidder.id);
 const isQualified = calc?.status === "Qualified";
 return (
 <Card
 key={bidder.id}
 className={`border-2 flex flex-col ${isQualified ? "border-green-400" : "border-red-400"}`}
 >
 <CardContent className="pt-4 pb-3 px-4 flex flex-col flex-1">
 {/* Fixed-height supplier name: max 2 lines with ellipsis */}
 <h3
 className="font-semibold text-sm break-words line-clamp-2 min-h-[2.5rem]"
 title={bidder.bidderName}
 >
 {bidder.bidderName}
 </h3>
 {/* Score block */}
 <div className="mt-2 space-y-1 text-xs">
 <div className="flex justify-between">
 <span className="text-muted-foreground">{t.bidEvaluationChecklist.technical}:</span>
 <span className="font-bold">{calc?.technicalScore?.toFixed(2) ?? "0.00"}/50</span>
 </div>
 <div className="flex justify-between">
 <span className="text-muted-foreground">{t.bidEvaluationChecklist.financial}:</span>
 <span className="font-bold">{calc?.financialScore?.toFixed(2) ?? "0.00"}/50</span>
 </div>
 <div className="flex justify-between border-t pt-1">
 <span className="text-muted-foreground font-semibold">{t.bidEvaluationChecklist.final}:</span>
 <span className="font-bold text-base">{calc?.finalScore?.toFixed(2) ?? "0.00"}/100</span>
 </div>
 </div>
 {/* Status badge: always bottom-aligned */}
 <div className={`mt-auto pt-2 text-xs font-semibold flex items-center gap-1 ${isQualified ? "text-green-600" : "text-red-600"}`}>
 {isQualified ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
 {isQualified ? t.bidEvaluationChecklist.qualified : t.bidEvaluationChecklist.notQualified}
 </div>
 </CardContent>
 </Card>
 );
 })}
 </div>
 </CardContent>
 </Card>

     {/* Unified Evaluation Table — single header, sections as title rows */}
     <Card className="mb-6 bec-card">
     <CardContent className="pt-4 bec-card-content">
     <div className="flex justify-end mb-2 no-print">
       <Button
         variant="outline"
         size="sm"
         onClick={toggleAllSections}
         className="text-xs gap-1.5"
       >
         <ChevronsUpDown className="h-3.5 w-3.5" />
         {collapsedSections.size === groupedSections.length ? t.bidEvaluationChecklist.expandAll : t.bidEvaluationChecklist.collapseAll}
       </Button>
     </div>
     <div className="overflow-x-auto">
     <Table
     className="bec-sticky-header bec-sticky-col"
     style={{ tableLayout: "fixed", minWidth: `${490 + activeBidders.length * 170}px` }}
     >
     <colgroup>
     <col style={{ width: "180px" }} />
     <col style={{ width: "90px" }} />
     <col style={{ width: "220px" }} />
     {activeBidders.map((b: any) => (
     <col key={b.id} style={{ width: "170px" }} />
     ))}
     </colgroup>
     <TableHeader>
     <TableRow>
     <TableHead className="text-xs" style={{ whiteSpace: "normal", wordBreak: "break-word" }}>{t.bidEvaluationChecklist.requirement}</TableHead>
     <TableHead className="text-xs text-center" style={{ whiteSpace: "normal", wordBreak: "break-word", lineHeight: "1.3" }}>{t.bidEvaluationChecklist.maxScore}</TableHead>
     <TableHead className="text-xs" style={{ whiteSpace: "normal", wordBreak: "break-word" }}>{t.bidEvaluationChecklist.details}</TableHead>
     {activeBidders.map((bidder: any, idx: number) => {
     const color = BADGE_COLORS[idx % BADGE_COLORS.length];
     return (
     <TableHead
     key={bidder.id}
     className={`p-0 align-middle bec-badge-header ${color.bg}`}
     style={{
     backgroundColor: color.printBg,
     }}
     >
     <div
     className={`w-full h-full flex items-center justify-center px-2 py-2 text-xs font-semibold text-center leading-snug ${color.text}`}
     style={{
     wordBreak: "break-word",
     whiteSpace: "normal",
     minHeight: "48px",
     color: color.printText,
     }}
     title={bidder.bidderName}
     >
     {bidder.bidderName}
     </div>
     </TableHead>
     );
     })}
     </TableRow>
     </TableHeader>
     <TableBody>
     {groupedSections.map((section) => {
     const isFinancialSection = section.sectionNumber === 6;
     const regularCriteria = section.criteria.filter((c: any) => !c.optionGroup);
     const paymentGroup = section.criteria.filter((c: any) => c.optionGroup === "payment_terms");
     const hasPaymentTerms = paymentGroup.length > 0;

     return (
     <React.Fragment key={section.sectionNumber}>
     {/* Total Technical Score row before Section 6 — STRONGEST visual weight */}
     {section.sectionNumber === 6 && (() => {
     // Compute rawTechnicalMax from technical criteria (same logic as scoring service)
     const techCriteria = criteria.filter((c: any) => c.criteriaType === 'technical' && c.isApplicable !== 0);
     const optGroups = new Map<string, number>();
     let rawTechMax = 0;
     techCriteria.forEach((c: any) => {
       const ms = Number(c.maxScore || 0);
       if (c.optionGroup) {
         const cur = optGroups.get(c.optionGroup) || 0;
         if (ms > cur) optGroups.set(c.optionGroup, ms);
       } else {
         rawTechMax += ms;
       }
     });
     optGroups.forEach(v => { rawTechMax += v; });

     return (
     <TableRow className="bg-blue-600 border-y-2 border-blue-700">
     <TableCell className="font-black text-white text-sm py-3">
     {t.bidEvaluationChecklist.totalTechnicalScore}
     </TableCell>
     <TableCell className="text-center text-sm font-bold text-white py-3">
     {rawTechMax}
     </TableCell>
     <TableCell className="text-xs text-blue-100 py-3">
     {t.bidEvaluationChecklist.sumOfSections}
     </TableCell>
     {activeBidders.map((bidder: any) => {
     // Compute raw total from local section scores (sections 1-5 only)
     const technicalSections = groupedSections.filter(s => s.sectionNumber !== 6);
     let rawTotal = 0;
     technicalSections.forEach(s => {
       rawTotal += calcSectionTotal(s.criteria, bidder.id);
     });
     const isQualified = rawTechMax > 0 && rawTechMax !== 50
       ? ((rawTotal / rawTechMax) * 50) >= 35
       : rawTotal >= 35;
     return (
     <TableCell
     key={bidder.id}
     className={`text-center font-black text-base py-3 ${isQualified ? "text-green-200" : "text-red-200"}`}
     style={{ borderInlineStart: "1px solid rgba(255,255,255,0.2)" }}
     >
     {rawTotal.toFixed(2)}
     </TableCell>
     );
     })}
     </TableRow>
     );
     })()}

     {/* Section title row — clickable to collapse/expand — MEDIUM visual weight */}
     <TableRow
       className="bg-blue-100/80 cursor-pointer hover:bg-blue-200/70 transition-colors border-t-2 border-blue-300"
       onClick={() => toggleSection(section.sectionNumber)}
     >
     <TableCell
     colSpan={3 + activeBidders.length}
     className="text-sm font-bold text-blue-900 py-2.5"
     >
     <div className="flex items-center gap-2">
       {collapsedSections.has(section.sectionNumber) ? (
         <ChevronDown className="h-4 w-4 shrink-0 text-blue-600" />
       ) : (
         <ChevronUp className="h-4 w-4 shrink-0 text-blue-600" />
       )}
       {t.bidEvaluationChecklist.section} {section.sectionNumber}: {isRTL ? section.sectionNameAr : section.sectionName}
     </div>
     </TableCell>
     </TableRow>

     {/* Criteria rows — hidden when section is collapsed */}
     {!collapsedSections.has(section.sectionNumber) && regularCriteria.map((criterion: any) => {
     if (isFinancialSection) {
     return (
     <TableRow key={criterion.id}>
     <TableCell className="text-sm font-medium" style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
     {isRTL ? (criterion.requirementLabelAr || criterion.requirementLabel || criterion.name) : (criterion.requirementLabel || criterion.name)}
     </TableCell>
     <TableCell className="text-center text-sm">{parseFloat(criterion.maxScore).toFixed(0)}</TableCell>
     <TableCell className="text-xs text-muted-foreground" style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
     {isRTL ? (criterion.detailsTextAr || criterion.detailsText || "") : (criterion.detailsText || "")}
     </TableCell>
     {activeBidders.map((bidder: any) => {
     const calc = calculatedScores.find((c: any) => c.bidderId === bidder.id);
     return (
     <TableCell key={bidder.id}>
     <div className="space-y-1.5">
     <div className="flex items-center gap-1">
     <span className="bec-currency-select">
     <Select
     value={localCurrencies[bidder.id] || "USD"}
     onValueChange={(val) => handleCurrencyChange(bidder.id, val)}
     >
     <SelectTrigger className="w-[70px] h-8 text-xs">
     <SelectValue />
     </SelectTrigger>
     <SelectContent>
     {GLOBAL_CURRENCIES.map((cur) => (
     <SelectItem key={cur.code} value={cur.code}>
     {cur.code}
     </SelectItem>
     ))}
     </SelectContent>
     </Select>
     </span>
     <span className="bec-currency-print text-xs font-medium">
     {localCurrencies[bidder.id] || "USD"}
     </span>
     <Input
     type="number"
     step="0.01"
     min="0"
     placeholder={t.bidEvaluationChecklist.price}
     value={localPrices[bidder.id] || ""}
     onChange={(e) => setLocalPrices(prev => ({ ...prev, [bidder.id]: e.target.value }))}
     onBlur={() => handleSavePrice(bidder.id)}
     disabled={scoresLocked}
     className={`flex-1 text-sm h-8 ${scoresLocked ? "bg-muted cursor-not-allowed opacity-70" : ""}`}
     />
     </div>
     <div className="text-xs text-center text-muted-foreground">
     {t.bidEvaluationChecklist.score}: <span className="font-semibold">{calc?.financialScore?.toFixed(2) ?? "0.00"}</span>
     </div>
     </div>
     </TableCell>
     );
     })}
     </TableRow>
     );
     }

     return (
     <TableRow key={criterion.id} className={criterion.isScreening ? "bg-green-50/50" : ""}>
     <TableCell className="text-sm" style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
     <div className="font-medium">
     {isRTL ? (criterion.requirementLabelAr || criterion.requirementLabel || criterion.name) : (criterion.requirementLabel || criterion.name)}
     {criterion.isScreening ? (
     <span className="ms-1 text-[10px] text-green-600 font-normal">({t.bidEvaluationChecklist.screening})</span>
     ) : null}
     {criterion.isMandatoryHardStop ? (
     <span className="ms-1 text-[10px] text-red-500 font-normal">*</span>
     ) : null}
     </div>
     </TableCell>
     <TableCell className="text-center text-sm">{parseFloat(criterion.maxScore).toFixed(1)}</TableCell>
     <TableCell className="text-xs text-muted-foreground" style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
     {isRTL ? (criterion.detailsTextAr || criterion.detailsText || "") : (criterion.detailsText || "")}
     </TableCell>
     {activeBidders.map((bidder: any) => {
     const key = `${criterion.id}-${bidder.id}`;
     const value = localScores[key] || 0;
     return (
     <TableCell key={bidder.id} className="text-center">
     <Input
     type="number"
     step="0.1"
     min="0"
     max={parseFloat(criterion.maxScore)}
     value={value}
     onChange={(e) => handleScoreChange(criterion.id, bidder.id, e.target.value, parseFloat(criterion.maxScore))}
     onBlur={() => handleSaveScore(criterion.id, bidder.id)}
     disabled={scoresLocked}
     className={`w-full text-sm text-center ${scoresLocked ? "bg-muted cursor-not-allowed opacity-70" : ""}`}
     />
     </TableCell>
     );
     })}
     </TableRow>
     );
     })}

     {/* Payment Terms — hidden when section is collapsed */}
     {!collapsedSections.has(section.sectionNumber) && hasPaymentTerms && (
     <>
     <TableRow className="bg-muted/30">
     <TableCell colSpan={3 + activeBidders.length} className="text-sm font-semibold py-2">
     {t.bidEvaluationChecklist.paymentTerms} <span className="text-xs font-normal text-muted-foreground">({t.bidEvaluationChecklist.selectOnePerBidder})</span>
     </TableCell>
     </TableRow>
     {paymentGroup.map((option: any) => (
     <TableRow key={option.id}>
     <TableCell className="text-sm ps-8">
     <div className="font-medium">{t.bidEvaluationChecklist.paymentTerms}</div>
     </TableCell>
     <TableCell className="text-center text-sm">{parseFloat(option.maxScore).toFixed(0)}</TableCell>
     <TableCell className="text-xs text-muted-foreground">
     {isRTL ? (option.detailsTextAr || option.detailsText || "") : (option.detailsText || "")}
     </TableCell>
     {activeBidders.map((bidder: any) => {
     const key = `${option.id}-${bidder.id}`;
     const isSelected = (localScores[key] || 0) > 0;
     return (
     <TableCell key={bidder.id} className="text-center">
     <label className="inline-flex items-center justify-center cursor-pointer">
     <input
     type="radio"
     name={`payment_terms_${bidder.id}`}
     checked={isSelected}
     onChange={() => handlePaymentTermsSelect(option.id, bidder.id, parseFloat(option.maxScore), paymentGroup)}
     disabled={scoresLocked}
     className="h-4 w-4 text-primary"
     />
     </label>
     </TableCell>
     );
     })}
     </TableRow>
     ))}
     </>
     )}

     {/* Section Total Row — always visible — SUBTLE visual weight */}
     <TableRow className="font-semibold bg-slate-100 border-b border-slate-300">
     <TableCell colSpan={3} className="text-slate-700 text-sm">{t.bidEvaluationChecklist.sectionTotal}</TableCell>
     {activeBidders.map((bidder: any) => {
     if (isFinancialSection) {
     const calc = calculatedScores.find((c: any) => c.bidderId === bidder.id);
     return (
     <TableCell key={bidder.id} className="text-center text-green-700 font-bold">
     {calc?.financialScore?.toFixed(2) ?? "0.00"}
     </TableCell>
     );
     }
     const sectionTotal = calcSectionTotal(section.criteria, bidder.id);
     return (
     <TableCell key={bidder.id} className="text-center text-green-700 font-bold">
     {sectionTotal.toFixed(2)}
     </TableCell>
     );
     })}
     </TableRow>
     </React.Fragment>
     );
     })}
     </TableBody>
     </Table>
     </div>
     </CardContent>
     </Card>

 {/* Grand Total: Technical + Financial = 100 */}
 <Card className="mb-6 bec-card">
 <CardHeader className="bec-card-header">
 <CardTitle>{t.bidEvaluationChecklist.technicalPlusFinancial} = 100</CardTitle>
 </CardHeader>
 <CardContent className="bec-card-content">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.bidEvaluationChecklist.bidder}</TableHead>
 <TableHead className="text-center">{t.bidEvaluationChecklist.technical} (50)</TableHead>
 <TableHead className="text-center">{t.bidEvaluationChecklist.financial} (50)</TableHead>
 <TableHead className="text-center">{t.bidEvaluationChecklist.finalScore} (100)</TableHead>
 <TableHead className="text-center">{t.bidEvaluationChecklist.status}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {activeBidders.map((bidder: any) => {
 const calc = calculatedScores.find((c: any) => c.bidderId === bidder.id);
 const isQualified = calc?.status === "Qualified";
 return (
 <TableRow key={bidder.id}>
 <TableCell className="font-medium">
 {bidder.bidderName}
 </TableCell>
 <TableCell className="text-center font-bold">{calc?.technicalScore?.toFixed(2) ?? "0.00"}</TableCell>
 <TableCell className="text-center font-bold">{calc?.financialScore?.toFixed(2) ?? "0.00"}</TableCell>
 <TableCell className="text-center text-lg font-bold">{calc?.finalScore?.toFixed(2) ?? "0.00"}</TableCell>
 <TableCell className="text-center">
 {isQualified ? (
 <span className="text-green-600 font-semibold flex items-center justify-center gap-1">
 <CheckCircle2 className="h-4 w-4" /> {t.bidEvaluationChecklist.qualified}
 </span>
 ) : (
 <span className="text-red-600 font-semibold flex items-center justify-center gap-1">
 <XCircle className="h-4 w-4" /> {t.bidEvaluationChecklist.notQualified}
 </span>
 )}
 </TableCell>
 </TableRow>
 );
 })}
 </TableBody>
 </Table>
 </CardContent>
 </Card>

 {/* ═══════════════ REMARKS SECTION ═══════════════ */}
 {(() => {
   const notQualifiedBidders = activeBidders.filter((bidder: any) => {
     const calc = calculatedScores.find((c: any) => c.bidderId === bidder.id);
     return calc?.status !== "Qualified";
   });
   return (
     <Card className="mb-6 bec-card" dir={isRTL ? 'rtl' : 'ltr'}>
       <CardHeader className="bec-card-header">
         <CardTitle className={'text-left'}>{t.bidEvaluationChecklist.remarks}</CardTitle>
         <p className={`text-xs text-muted-foreground mt-1 ${'text-left'}`}>{t.bidEvaluationChecklist.remarksDescription}</p>
       </CardHeader>
       <CardContent className="bec-card-content">
         {notQualifiedBidders.length === 0 ? (
           <div className={`flex items-center gap-2 text-sm text-green-600 py-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
             <CheckCircle2 className="h-4 w-4" />
             {t.bidEvaluationChecklist.noRemarksAllQualified}
           </div>
         ) : (
           <div className="space-y-4">
             {notQualifiedBidders.map((bidder: any) => {
               const calc = calculatedScores.find((c: any) => c.bidderId === bidder.id);
               const reasons: string[] = calc?.disqualificationReasons || [];
               // Translate server-side English reasons to Arabic when in RTL mode
               const translateReason = (reason: string): string => {
                 if (!isRTL) return reason;
                 // "Mandatory criteria failed: X, Y, Z"
                 const mandatoryMatch = reason.match(/^Mandatory criteria failed:\s*(.+)$/);
                 if (mandatoryMatch) {
                   return `${t.bidEvaluationChecklist.mandatoryCriteriaFailed}: ${mandatoryMatch[1]}`;
                 }
                 // "Mandatory criteria not met (N failed)"
                 const mandatoryNotMetMatch = reason.match(/^Mandatory criteria not met \((\d+) failed\)$/);
                 if (mandatoryNotMetMatch) {
                   return `${t.bidEvaluationChecklist.mandatoryCriteriaFailed} (${mandatoryNotMetMatch[1]})`;
                 }
                 // "Technical score (X/50) is below 70% threshold (Y/50)"
                 const techMatch = reason.match(/^Technical score \(([\d.]+)\/?(\d+)?\).*(?:below|threshold).*\(([\d.]+)\/?(\d+)?\)/);
                 if (techMatch) {
                   return `${localT.technicalBelowThreshold} (${techMatch[1]}/${techMatch[2] || '50'}) - (${techMatch[3]}/${techMatch[4] || '50'})`;
                 }
                 // "Technical score (X) below minimum threshold (Y)"
                 const techSimpleMatch = reason.match(/^Technical score \(([\d.]+)\) below minimum threshold \(([\d.]+)\)/);
                 if (techSimpleMatch) {
                   return `${localT.technicalBelowThreshold} (${techSimpleMatch[1]}) - (${techSimpleMatch[2]})`;
                 }
                 // "Total Offer Price is missing or invalid"
                 if (reason.includes('Total Offer Price is missing') || reason.includes('Total Offer Price')) {
                   return t.bidEvaluationChecklist.priceMissingOrInvalid;
                 }
                 return reason;
               };
               return (
                 <div key={bidder.id} className="border border-red-200 rounded-lg p-4 bg-red-50/50">
                   <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                     <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                     <span className="font-semibold text-red-800 text-sm">{bidder.bidderName}</span>
                     <span className="text-xs text-red-500 font-medium">({t.bidEvaluationChecklist.notQualified})</span>
                   </div>
                   <ul className={`space-y-1.5 ${'ps-6 text-left'}`} style={{ listStyleType: 'disc', listStylePosition: 'inside' }}>
                     {reasons.map((reason: string, idx: number) => (
                       <li key={idx} className="text-sm text-red-700">
                         {translateReason(reason)}
                       </li>
                     ))}
                     {reasons.length === 0 && (
                       <li className="text-sm text-muted-foreground">
                         {t.bidEvaluationChecklist.notQualified}
                       </li>
                     )}
                   </ul>
                 </div>
               );
             })}
           </div>
         )}
       </CardContent>
     </Card>
   );
 })()}

 {/* Mandatory Criteria Legend */}
 <div className="text-xs text-muted-foreground mb-4">
 <span className="text-red-500">*</span> = {t.bidEvaluationChecklist.mandatoryHardStop}
 </div>

 {/* Finalize Evaluation Button */}
 {ba && ba.status !== 'financial_evaluation' && ba.status !== 'awarded' && (
 <div className="mt-6 mb-4">
 {!showFinalizeConfirm ? (
 <Button
 onClick={() => setShowFinalizeConfirm(true)}
 className="bg-green-600 hover:bg-green-700 text-white"
 size="lg"
 >
 <ShieldCheck className="h-5 w-5 me-2" />
 {t.bidEvaluationChecklist.finalizeEvaluation}
 </Button>
 ) : (
 <Card className="border-green-200 bg-green-50">
 <CardContent className="pt-6">
 <p className="text-sm text-green-800 mb-4">
 {t.bidEvaluationChecklist.confirmFinalize}
 </p>
 <div className="flex gap-3">
 <Button
 onClick={() => finalizeMutation.mutate({ bidAnalysisId: parseInt(id!) })}
 disabled={finalizeMutation.isPending}
 className="bg-green-600 hover:bg-green-700 text-white"
 >
 {finalizeMutation.isPending ? (
 <><Loader2 className="h-4 w-4 me-2 animate-spin" />{t.bidEvaluationChecklist.finalizing}</>
 ) : (
 <><ShieldCheck className="h-4 w-4 me-2" />{t.bidEvaluationChecklist.finalizeEvaluation}</>
 )}
 </Button>
 <Button
 variant="outline"
 onClick={() => setShowFinalizeConfirm(false)}
 disabled={finalizeMutation.isPending}
 >
 {isRTL ? 'إلغاء' : 'Cancel'}
 </Button>
 </div>
 </CardContent>
 </Card>
 )}
 </div>
 )}

 {ba && (ba.status === 'financial_evaluation' || ba.status === 'awarded') && (
 <div className="mt-6 mb-4">
 <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
 <ShieldCheck className="h-5 w-5" />
 <span className="text-sm font-medium">{t.bidEvaluationChecklist.evaluationAlreadyFinalized}</span>
 </div>
 </div>
 )}
 </div>
 </>
 );
}
