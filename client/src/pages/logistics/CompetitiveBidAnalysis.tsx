import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/i18n/useTranslation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Printer,
  Award,
  Plus,
  Trash2,
  Loader2,
  FileText,
  PenTool,
  CheckCircle,
  Lock,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import SignatureCanvas from "@/components/SignatureCanvas";
import { QRCodeCanvas } from "qrcode.react";
import { BackButton } from "@/components/BackButton";

/**
 * Competitive Bid Analysis (CBA) - Official Document
 *
 * Features:
 * 1. Dynamic approval committee members (add/remove)
 * 2. Digital signature canvas with QR verification
 * 3. PDF export (A4 landscape, RTL support)
 */

interface ApprovalMember {
  id?: number;
  sortOrder: number;
  role: string;
  roleAr: string;
  memberName: string;
  signatureDataUrl: string | null;
  signedAt: string | null;
  verificationCode: string;
  qrCodeDataUrl: string | null;
}

function generateVerificationCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "CBA-";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function CompetitiveBidAnalysis() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { language, isRTL} = useLanguage();
  const { t } = useTranslation();
  const utils = trpc.useUtils();

  // ── Data queries ────────────────────────────────────────────────────
  const { data: ba, isLoading: baLoading } =
    trpc.logistics.bidAnalysis.getById.useQuery(
      { id: parseInt(id!) },
      { enabled: !!id }
    );

  const { data: bidders = [], isLoading: biddersLoading } =
    trpc.logistics.bidAnalysis.getBidders.useQuery(
      { bidAnalysisId: parseInt(id!) },
      { enabled: !!id }
    );

  const { data: criteria = [] } =
    trpc.logistics.bidAnalysis.getCriteria.useQuery(
      { bidAnalysisId: parseInt(id!) },
      { enabled: !!id }
    );

  const { data: scores = [] } =
    trpc.logistics.bidAnalysis.getScores.useQuery(
      { bidAnalysisId: parseInt(id!) },
      { enabled: !!id }
    );

  const { data: savedSignatures = [] } =
    trpc.logistics.bidAnalysis.getCBASignatures.useQuery(
      { bidAnalysisId: parseInt(id!) },
      { enabled: !!id }
    );

  // PCE: Supplier Offer Matrix (per-item prices from Supplier Quotation Entry)
  const { data: supplierOfferMatrix } =
    trpc.logistics.bidAnalysis.getSupplierOfferMatrix.useQuery(
      { bidAnalysisId: parseInt(id!) },
      { enabled: !!id }
    );

  // ── Local state ─────────────────────────────────────────────────────
  const [justification, setJustification] = useState("");
  const [selectedWinnerId, setSelectedWinnerId] = useState<number | null>(null);
  const [approvalMembers, setApprovalMembers] = useState<ApprovalMember[]>([]);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [activeSignatureIdx, setActiveSignatureIdx] = useState<number | null>(null);
  const [generatingPdfId, setGeneratingPdfId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  // Derived: is CBA already finalized?
  const isCbaFinalized = !!(ba as any)?.cbaFinalizedAt;

  // Derived: is this a Type 2 (consultancy) procurement?
  const isConsultancy = (ba?.purchaseRequest as any)?.category === 'consultancy';

  // QR code canvas refs for generating data URLs
  const qrCanvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});

  // ── Initialize from saved data ──────────────────────────────────────
  useEffect(() => {
    if (ba) {
      setJustification(ba.selectionJustification || (ba as any).justification || "");
      setSelectedWinnerId(ba.selectedBidderId || (ba as any).selectedSupplierId || null);
    }
  }, [ba]);

  useEffect(() => {
    if (savedSignatures && savedSignatures.length > 0) {
      setApprovalMembers(
        savedSignatures.map((s: any) => ({
          id: s.id,
          sortOrder: s.sortOrder,
          role: s.role || "",
          roleAr: s.roleAr || "",
          memberName: s.memberName || "",
          signatureDataUrl: s.signatureDataUrl || null,
          signedAt: s.signedAt || null,
          verificationCode: s.verificationCode || generateVerificationCode(),
          qrCodeDataUrl: s.qrCodeDataUrl || null,
        }))
      );
    } else if (approvalMembers.length === 0) {
      // Default 3 members
      setApprovalMembers([
        {
          sortOrder: 1,
          role: "Committee Chair",
          roleAr: "رئيس اللجنة",
          memberName: "",
          signatureDataUrl: null,
          signedAt: null,
          verificationCode: generateVerificationCode(),
          qrCodeDataUrl: null,
        },
        {
          sortOrder: 2,
          role: "Procurement Officer",
          roleAr: "مسؤول المشتريات",
          memberName: "",
          signatureDataUrl: null,
          signedAt: null,
          verificationCode: generateVerificationCode(),
          qrCodeDataUrl: null,
        },
        {
          sortOrder: 3,
          role: "Finance Officer",
          roleAr: "المسؤول المالي",
          memberName: "",
          signatureDataUrl: null,
          signedAt: null,
          verificationCode: generateVerificationCode(),
          qrCodeDataUrl: null,
        },
      ]);
    }
  }, [savedSignatures]);

  // ── Score calculations ──────────────────────────────────────────────
  const bidderTechnicalScores = useMemo(() => {
    const scoreMap: Record<number, number> = {};
    bidders.forEach((bidder: any) => {
      let total = 0;
      scores.forEach((score: any) => {
        if (score.bidderId === bidder.id) {
          total += parseFloat(score.score || "0");
        }
      });
      scoreMap[bidder.id] = total;
    });
    return scoreMap;
  }, [bidders, scores]);

  const bidderFinancialScores = useMemo(() => {
    const scoreMap: Record<number, number> = {};
    const validBids = bidders
      .filter(
        (b: any) => b.totalBidAmount && parseFloat(b.totalBidAmount) > 0
      )
      .map((b: any) => ({
        id: b.id,
        amount: parseFloat(b.totalBidAmount),
      }));

    if (validBids.length === 0) {
      bidders.forEach((b: any) => {
        scoreMap[b.id] = 0;
      });
      return scoreMap;
    }

    const lowestBid = Math.min(...validBids.map((b) => b.amount));
    validBids.forEach(({ id, amount }) => {
      scoreMap[id] = (lowestBid / amount) * 50;
    });
    bidders.forEach((b: any) => {
      if (!scoreMap[b.id]) scoreMap[b.id] = 0;
    });
    return scoreMap;
  }, [bidders]);

  interface RankedBidder {
    id: number;
    bidderName: string;
    totalBidAmount: string | null;
    currency: string | null;
    technicalScore: number;
    financialScore: number;
    combinedScore: number;
    rank: number;
    isQualified: boolean;
  }

  const rankedBidders: RankedBidder[] = useMemo(() => {
    const biddersWithScores = bidders
      .filter((b: any) => b.submissionStatus !== "disqualified")
      .map((bidder: any) => {
        const technicalScore = bidderTechnicalScores[bidder.id] || 0;
        const isQualified = technicalScore >= 35;
        const financialScore = isQualified
          ? bidderFinancialScores[bidder.id] || 0
          : 0;
        const combinedScore = technicalScore + financialScore;
        return {
          id: bidder.id,
          bidderName: bidder.bidderName || "Unknown",
          totalBidAmount: bidder.totalBidAmount,
          currency: bidder.currency || "USD",
          technicalScore,
          financialScore,
          combinedScore,
          rank: 0,
          isQualified,
        };
      });
    biddersWithScores.sort((a, b) => b.combinedScore - a.combinedScore);
    biddersWithScores.forEach((bidder, index) => {
      bidder.rank = index + 1;
    });
    return biddersWithScores;
  }, [bidders, bidderTechnicalScores, bidderFinancialScores]);

  const lowestBidAmount = useMemo(() => {
    const validBids = rankedBidders
      .filter(
        (b) => b.totalBidAmount && parseFloat(b.totalBidAmount) > 0
      )
      .map((b) => parseFloat(b.totalBidAmount!));
    return validBids.length > 0 ? Math.min(...validBids) : 0;
  }, [rankedBidders]);

  const groupedCriteria = useMemo(() => {
    return criteria.reduce((acc: any, criterion: any) => {
      const sectionNum = criterion.sectionNumber || 1;
      if (!acc[sectionNum]) {
        acc[sectionNum] = {
          sectionName: criterion.sectionName || `Section ${sectionNum}`,
          sectionNameAr: criterion.sectionNameAr || criterion.sectionName || `Section ${sectionNum}`,
          maxScore: 0,
        };
      }
      acc[sectionNum].maxScore += parseFloat(criterion.maxScore || "0");
      return acc;
    }, {});
  }, [criteria]);

  const sections = Object.keys(groupedCriteria)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .map((key) => ({ number: parseInt(key), ...groupedCriteria[key] }));

  // ── Mutations ───────────────────────────────────────────────────────
  const generatePDF = trpc.logistics.generatePDF.useMutation();
  const updateCBA = trpc.logistics.bidAnalysis.updateCBA.useMutation({
    onSuccess: () => {
      toast.success(t.common.savedSuccessfully);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const finalizeCbaMutation = trpc.logistics.bidAnalysis.finalizeCba.useMutation({
    onSuccess: (data) => {
      utils.logistics.bidAnalysis.getById.invalidate({ id: parseInt(id!) });
      if (data.autoCreatedContractId) {
        toast.success(
          isRTL ? 'تم اعتماد تحليل العطاءات بنجاح — تم إنشاء مسودة العقد تلقائياً. انتقل إلى بطاقة العقد في مساحة العمل للمراجعة.'
            : 'CBA finalized successfully \u2014 Draft Contract auto-created. Go to the Contract card in the Workspace to review.'
        );
      } else {
        toast.success(isRTL ? 'تم اعتماد تحليل العطاءات بنجاح — تم تعيين الحالة إلى مُرسى' : 'CBA finalized successfully \u2014 BA status set to Awarded');
      }
      setFinalizeDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const saveSignaturesMutation =
    trpc.logistics.bidAnalysis.saveCBASignatures.useMutation({
      onSuccess: () => {
        utils.logistics.bidAnalysis.getCBASignatures.invalidate({
          bidAnalysisId: parseInt(id!),
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  // ── Handlers ────────────────────────────────────────────────────────
  const handleFinalizeCba = useCallback(async () => {
    setFinalizing(true);
    try {
      // Save current state first
      await updateCBA.mutateAsync({
        id: parseInt(id!),
        justification,
        selectedWinnerId: selectedWinnerId ?? undefined,
      });
      await saveSignaturesMutation.mutateAsync({
        bidAnalysisId: parseInt(id!),
        members: approvalMembers.map((m) => ({
          id: m.id,
          sortOrder: m.sortOrder,
          role: m.role,
          roleAr: m.roleAr,
          memberName: m.memberName,
          signatureDataUrl: m.signatureDataUrl || undefined,
          signedAt: m.signedAt || undefined,
          verificationCode: m.verificationCode,
          qrCodeDataUrl: m.qrCodeDataUrl || undefined,
        })),
      });
      // Then finalize
      await finalizeCbaMutation.mutateAsync({ bidAnalysisId: parseInt(id!) });
    } catch (e) {
      // errors handled by mutation callbacks
    } finally {
      setFinalizing(false);
    }
  }, [id, justification, selectedWinnerId, approvalMembers, updateCBA, saveSignaturesMutation, finalizeCbaMutation]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // Save CBA data
      await updateCBA.mutateAsync({
        id: parseInt(id!),
        justification,
        selectedWinnerId: selectedWinnerId ?? undefined,
      });

      // Save signatures
      await saveSignaturesMutation.mutateAsync({
        bidAnalysisId: parseInt(id!),
        members: approvalMembers.map((m) => ({
          id: m.id,
          sortOrder: m.sortOrder,
          role: m.role,
          roleAr: m.roleAr,
          memberName: m.memberName,
          signatureDataUrl: m.signatureDataUrl || undefined,
          signedAt: m.signedAt || undefined,
          verificationCode: m.verificationCode,
          qrCodeDataUrl: m.qrCodeDataUrl || undefined,
        })),
      });
    } catch (e) {
      // errors already handled by mutation callbacks
    } finally {
      setSaving(false);
    }
  }, [
    id,
    justification,
    selectedWinnerId,
    approvalMembers,
    updateCBA,
    saveSignaturesMutation,
  ]);

    const handleGeneratePdf = async () => {
    try {
      setGeneratingPdfId(Number(id));

      const result = await generatePDF.mutateAsync({
        documentType: "cba",
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

      const blob = new Blob(
        [bytes],
        {
          type: "application/pdf",
        }
      );

      const url = window.URL.createObjectURL(blob);

      window.open(url, "_blank");

      toast.success(
        isRTL
          ? "تم إنشاء ملف PDF بنجاح"
          : "PDF generated successfully"
      );

    } catch (error: any) {
      console.error("PDF generation error:", error);

      toast.error(
        error?.message ||
        (isRTL
          ? "خطأ في إنشاء PDF"
          : "Error generating PDF")
      );

    } finally {
      setGeneratingPdfId(null);
    }
  };

  // ── Approval member management ──────────────────────────────────────
  const addMember = () => {
    const nextOrder = approvalMembers.length + 1;
    setApprovalMembers((prev) => [
      ...prev,
      {
        sortOrder: nextOrder,
        role: "",
        roleAr: "",
        memberName: "",
        signatureDataUrl: null,
        signedAt: null,
        verificationCode: generateVerificationCode(),
        qrCodeDataUrl: null,
      },
    ]);
  };

  const removeMember = (index: number) => {
    if (approvalMembers.length <= 1) {
      toast.error(
        isRTL ? 'يجب وجود عضو واحد على الأقل' : 'At least one member is required'
      );
      return;
    }
    setApprovalMembers((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.map((m, i) => ({ ...m, sortOrder: i + 1 }));
    });
  };

  const updateMemberField = (
    index: number,
    field: keyof ApprovalMember,
    value: string
  ) => {
    setApprovalMembers((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  };

  const openSignatureDialog = (index: number) => {
    setActiveSignatureIdx(index);
    setSignatureDialogOpen(true);
  };

  const handleSignatureSave = (dataUrl: string) => {
    if (activeSignatureIdx === null) return;
    const now = new Date().toISOString();

    // Generate QR code data URL from the hidden canvas
    let qrDataUrl: string | null = null;
    const qrCanvas = qrCanvasRefs.current[activeSignatureIdx];
    if (qrCanvas) {
      qrDataUrl = qrCanvas.toDataURL("image/png");
    }

    setApprovalMembers((prev) =>
      prev.map((m, i) =>
        i === activeSignatureIdx
          ? {
              ...m,
              signatureDataUrl: dataUrl,
              signedAt: now,
              qrCodeDataUrl: qrDataUrl,
            }
          : m
      )
    );
    setSignatureDialogOpen(false);
    toast.success(
      isRTL ? 'تم حفظ التوقيع' : 'Signature saved'
    );
  };

  const clearMemberSignature = (index: number) => {
    setApprovalMembers((prev) =>
      prev.map((m, i) =>
        i === index
          ? {
              ...m,
              signatureDataUrl: null,
              signedAt: null,
              qrCodeDataUrl: null,
            }
          : m
      )
    );
  };

  // ── Loading state ───────────────────────────────────────────────────
  if (baLoading || biddersLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Back button */}
      <div className="border-b bg-card px-6 py-3 mb-6">
        <BackButton onClick={() => setLocation(`/organization/logistics/procurement-workspace/${ba?.purchaseRequestId}`)} label={t.logistics.backToProcurementWorkspace} />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">
            {t.procurement.competitiveBidAnalysisCba}
          </h1>
          <p className="text-muted-foreground" dir="ltr">
            {t.procurement.cbaNumber}: {ba?.cbaNumber}
          </p>
        </div>
        <div className={`flex gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
          {/* Finalize CBA — primary action once committee approves */}
          {!isCbaFinalized ? (
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setFinalizeDialogOpen(true)}
              disabled={saving || finalizing}
            >
              <CheckCircle className="h-4 w-4 me-2" />
              {isRTL ? 'اعتماد تحليل العطاءات' : 'Finalize CBA'}
            </Button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm font-medium">
              <Lock className="h-4 w-4" />
              {isRTL ? 'مُعتمد' : 'Finalized'}
              {(ba as any)?.cbaFinalizedAt && (
                <span className="text-xs text-green-600 font-normal">
                  {new Date((ba as any).cbaFinalizedAt).toLocaleDateString(
                    'en-US'
                  )}
                </span>
              )}
            </div>
          )}
          <Button onClick={handleSave} disabled={saving || isCbaFinalized}>
            {saving ? (
              <Loader2 className="h-4 w-4 me-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 me-2" />
            )}
            {t.procurement.save}
          </Button>
          <Button
            variant="outline"
            onClick={handleGeneratePdf}
            className="gap-2"
            disabled={generatingPdfId === Number(id)}
          >
            {generatingPdfId === Number(id) ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Printer className="h-4 w-4" />
            )}

            {generatingPdfId === Number(id)
              ? t.procurement.print
              : t.procurement.exportPdfLandscape}
          </Button>
        </div>
      </div>

      {/* Header Information Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t.procurement.details}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t.procurement.date}</Label>
              <Input value={new Date().toLocaleDateString()} disabled />
            </div>
            <div>
              <Label>{t.procurement.budgetAmount}</Label>
              <Input
                value={`${
                  ba?.purchaseRequest?.currency ||
                  (ba as any)?.currency ||
                  "USD"
                } ${
                  ba?.purchaseRequest?.totalBudgetLine
                    ? parseFloat(ba.purchaseRequest.totalBudgetLine as string).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : (ba as any)?.totalCost ||
                      ba?.purchaseRequest?.prTotalUsd || ba?.purchaseRequest?.prTotalUsd ||
                      "0"
                }`}
                disabled
              />
            </div>
            <div>
              <Label>{t.procurement.itemDescription}</Label>
              <Input
                value={
                  (ba as any)?.description ||
                  ba?.purchaseRequest?.projectTitle ||
                  ""
                }
                disabled
              />
            </div>
            <div>
              <Label>{t.procurement.country}</Label>
              <Input value={(ba as any)?.country || "Yemen"} disabled />
            </div>
            <div>
              <Label>{t.procurement.tenderRfqNumber}</Label>
              <Input value={ba?.announcementReference || ""} disabled />
            </div>
            <div>
              <Label>{t.procurement.budgetLine}</Label>
              <Input
                value={
                  (ba as any)?.budgetLineData?.description ||
                  ba?.purchaseRequest?.budgetTitle ||
                  ba?.purchaseRequest?.budgetCode ||
                  ""
                }
                disabled
              />
              {(ba as any)?.budgetLineData?.availableBalance && (
                <p className="text-xs text-muted-foreground mt-1">
                  {isRTL ? 'الرصيد المتاح:' : 'Available Balance:'}{" "}
                  <span className="font-medium">
                    {(ba as any)?.budgetLineData?.currency || ba?.purchaseRequest?.currency || "USD"}{" "}
                    {parseFloat((ba as any)?.budgetLineData?.availableBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget Overrun Warning Banner */}
      {(() => {
        const pr = ba?.purchaseRequest as any;

        // PR.total = totalBudgetLine × exchangeRate = the authoritative converted budget cap (e.g. USD 54,900)
        // This is stored directly in the DB — no re-calculation needed
        const convertedBudgetCap = pr?.total ? parseFloat(pr.total) : null;
        const exchangeToCurrency = pr?.exchangeTo || "USD";
        const budgetCurrency = pr?.currency || "USD";
        const exchangeRate = pr?.exchangeRate ? parseFloat(pr.exchangeRate) : 1;
        const hasExchange = exchangeRate !== 1 && exchangeToCurrency !== budgetCurrency;

        // Winning bid: bidder.totalBidAmount is already stored in the bidder's own currency (from DB)
        // bidder.currency tells us what currency the bid is in
        // We compare the bid directly against convertedBudgetCap (both in Exchange-to currency, e.g. USD)
        const winnerBidder = selectedWinnerId
          ? rankedBidders.find((b) => b.id === selectedWinnerId)
          : rankedBidders.length > 0
          ? rankedBidders[0]
          : null;

        const winnerBidAmount = winnerBidder?.totalBidAmount
          ? parseFloat(winnerBidder.totalBidAmount)
          : lowestBidAmount > 0
          ? lowestBidAmount
          : null;

        // The bid currency — use bidder.currency if available, else assume same as exchangeTo
        const bidCurrency = (winnerBidder as any)?.currency || exchangeToCurrency;

        if (convertedBudgetCap === null || winnerBidAmount === null) return null;

        // If bid currency matches the Exchange-to currency (e.g. both USD), compare directly
        // If bid currency matches budget currency (e.g. both EUR), convert bid to Exchange-to first
        // Otherwise compare as-is (same currency assumed)
        const winnerBidInCapCurrency =
          bidCurrency === exchangeToCurrency
            ? winnerBidAmount // already in USD, compare directly
            : bidCurrency === budgetCurrency && hasExchange
            ? winnerBidAmount * exchangeRate // convert EUR bid to USD
            : winnerBidAmount; // same currency, compare as-is

        if (winnerBidInCapCurrency > convertedBudgetCap) {
          const overrun = winnerBidInCapCurrency - convertedBudgetCap;
          const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          return (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-800">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div className="text-sm">
                <p className="font-semibold">
                  {isRTL ? 'تحذير: تجاوز بند الميزانية' : 'Budget Line Overrun Warning'}
                </p>
                <p className="mt-0.5">
                  {isRTL ? (
                    <>
                      مبلغ العطاء الفائز ({bidCurrency} {fmt(winnerBidAmount)})
                      {bidCurrency !== exchangeToCurrency && hasExchange && (
                        <> = {exchangeToCurrency} {fmt(winnerBidInCapCurrency)}</>
                      )}{" "}
                      يتجاوز إجمالي الميزانية ({exchangeToCurrency} {fmt(convertedBudgetCap)}) بمقدار{" "}
                      <strong>{exchangeToCurrency} {fmt(overrun)}</strong>.
                    </>
                  ) : (
                    <>
                      The winning bid ({bidCurrency} {fmt(winnerBidAmount)})
                      {bidCurrency !== exchangeToCurrency && hasExchange && (
                        <> = {exchangeToCurrency} {fmt(winnerBidInCapCurrency)}</>
                      )}{" "}
                      exceeds the converted budget total ({exchangeToCurrency} {fmt(convertedBudgetCap)}) by{" "}
                      <strong>{exchangeToCurrency} {fmt(overrun)}</strong>.
                    </>
                  )}
                </p>
                <p className="mt-1 text-xs text-amber-600">
                  {isRTL ? 'يرجى مراجعة الميزانية أو الحصول على موافقة إضافية قبل الاعتماد.' : 'Please review the budget or obtain additional approval before finalizing.'}
                </p>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Technical Evaluation (50%) */}
      <Card className="mb-6">
        <CardHeader className="bg-teal-600 text-white">
          <CardTitle>{t.procurement.technicalEvaluation50Points}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Alert className="mb-4 bg-yellow-50 border-yellow-200">
            <AlertDescription>
              {t.procurement.technicalThreshold70}
            </AlertDescription>
          </Alert>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.procurement.supplier}</TableHead>
                  {sections.map((section) => (
                    <TableHead key={section.number} className="text-center">
                      {isRTL ? (section as any).sectionNameAr : section.sectionName}
                      <br />
                      <span className="text-xs">
                        ({'max'} {section.maxScore})
                      </span>
                    </TableHead>
                  ))}
                  <TableHead className="text-center">
                    {t.procurement.maxScore}
                    <br />
                    <span className="text-xs">(50)</span>
                  </TableHead>
                  <TableHead className="text-center">
                    {t.procurement.totalTechnical}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankedBidders.map((bidder) => {
                  const sectionScores: Record<number, number> = {};
                  sections.forEach((section) => {
                    let sectionTotal = 0;
                    criteria.forEach((criterion: any) => {
                      if (criterion.sectionNumber === section.number) {
                        const score = scores.find(
                          (s: any) =>
                            s.criterionId === criterion.id &&
                            s.bidderId === bidder.id
                        );
                        sectionTotal += parseFloat(score?.score || "0");
                      }
                    });
                    sectionScores[section.number] = sectionTotal;
                  });

                  return (
                    <TableRow key={bidder.id}>
                      <TableCell className="font-medium">
                        {bidder.bidderName}
                      </TableCell>
                      {sections.map((section) => (
                        <TableCell
                          key={section.number}
                          className="text-center"
                        >
                          {sectionScores[section.number].toFixed(2)}
                        </TableCell>
                      ))}
                      <TableCell className="text-center font-bold">
                        50
                      </TableCell>
                      <TableCell
                        className={`text-center font-bold ${
                          bidder.isQualified
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {bidder.technicalScore.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Financial Evaluation (50%) */}
      <Card className="mb-6">
        <CardHeader className="bg-teal-600 text-white">
          <CardTitle>{t.procurement.financialEvaluation50Points}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-4">
            {t.procurement.pleaseCompleteAllPricingAndTechnical}
          </p>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.procurement.supplier}</TableHead>
                  <TableHead className="text-end">
                    {t.procurement.offeredPrice}
                  </TableHead>
                  <TableHead className="text-end">
                    {t.procurement.financialScore}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankedBidders.map((bidder) => (
                  <TableRow key={bidder.id}>
                    <TableCell className="font-medium">
                      {bidder.bidderName}
                    </TableCell>
                    <TableCell className="text-end">
                      {bidder.totalBidAmount
                        ? `${bidder.currency} ${parseFloat(
                            bidder.totalBidAmount
                          ).toFixed(2)}`
                        : "N/A"}
                    </TableCell>
                    <TableCell className="text-end font-bold">
                      {bidder.isQualified
                        ? bidder.financialScore.toFixed(2)
                        : "N/A"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded">
            <Label className="font-bold">
              {t.procurement.lowestBidAmount}
            </Label>
            <Input
              value={lowestBidAmount.toFixed(2)}
              disabled
              className="mt-2 font-bold text-lg"
            />
          </div>
        </CardContent>
      </Card>

      {/* PCE: Supplier Offer Matrix — auto-loaded from Supplier Quotation Entry */}
      <Card className="mb-6">
        <CardHeader className="bg-teal-600 text-white">
          <CardTitle>{t.procurement.supplierOfferMatrix}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-4">
            {t.procurement.supplierOfferMatrixSubtitle}
          </p>
          {!supplierOfferMatrix?.hasData ? (
            <div className="flex items-center gap-2 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                {t.procurement.noSupplierQuotationsSubmitted}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>{t.procurement.itemDescription}</TableHead>
                    <TableHead className="text-end">{t.procurement.qty}</TableHead>
                    <TableHead>{t.procurement.unit}</TableHead>
                    <TableHead className="text-end text-muted-foreground">{t.procurement.unitPrice}</TableHead>
                    {supplierOfferMatrix?.bidders.map((bidder) => (
                      <TableHead
                        key={bidder.id}
                        className={`text-end font-semibold ${
                          bidder.isSelected
                            ? "text-teal-600 dark:text-teal-400"
                            : "text-foreground"
                        }`}
                      >
                        {bidder.name}
                        {bidder.isSelected && (
                          <span className="ml-1 text-xs">(★)</span>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierOfferMatrix?.matrixRows.map((row, idx) => (
                    <TableRow key={row.prLineItemId}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{row.description}</TableCell>
                      <TableCell className="text-end">{row.quantity.toFixed(2)}</TableCell>
                      <TableCell>{row.unit}</TableCell>
                      <TableCell className="text-end text-muted-foreground">
                        ${row.estimatedUnitCost.toFixed(2)}
                      </TableCell>
                      {row.bidderPrices.map((bp) => (
                        <TableCell
                          key={bp.bidderId}
                          className={`text-end ${
                            bp.unitPrice !== null
                              ? supplierOfferMatrix?.bidders.find((b) => b.id === bp.bidderId)?.isSelected
                                ? "font-bold text-teal-600 dark:text-teal-400"
                                : "font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          {bp.unitPrice !== null ? `$${bp.unitPrice.toFixed(2)}` : "—"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {/* Totals row */}
                  <TableRow className="border-t-2 font-bold bg-muted/30">
                    <TableCell colSpan={5} className="text-end font-bold">
                      {t.procurement.total}
                    </TableCell>
                    {supplierOfferMatrix?.bidderTotals.map((bt) => (
                      <TableCell
                        key={bt.bidderId}
                        className={`text-end font-bold ${
                          supplierOfferMatrix?.bidders.find((b) => b.id === bt.bidderId)?.isSelected
                            ? "text-teal-600 dark:text-teal-400"
                            : ""
                        }`}
                      >
                        ${bt.total.toFixed(2)}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Combined Score (100%) */}
      <Card className="mb-6">
        <CardHeader className="bg-teal-600 text-white">
          <CardTitle>{t.procurement.finalScore100Points}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.procurement.rank}</TableHead>
                  <TableHead>{t.procurement.supplier}</TableHead>
                  <TableHead className="text-center">
                    {t.procurement.technical}
                  </TableHead>
                  <TableHead className="text-center">
                    {t.procurement.financial}
                  </TableHead>
                  <TableHead className="text-center">
                    {t.procurement.total100}
                  </TableHead>
                  <TableHead className="text-center">
                    {t.common.status}
                  </TableHead>
                  <TableHead className="text-center">
                    {t.common.actions}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankedBidders.map((bidder) => (
                  <TableRow
                    key={bidder.id}
                    className={bidder.rank === 1 ? "bg-green-50 dark:bg-green-950/20" : ""}
                  >
                    <TableCell className="font-bold">
                      {bidder.rank === 1 && (
                        <Award className="inline h-4 w-4 text-yellow-500 me-1" />
                      )}
                      #{bidder.rank}
                    </TableCell>
                    <TableCell className="font-medium">
                      {bidder.bidderName}
                    </TableCell>
                    <TableCell className="text-center">
                      {bidder.technicalScore.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      {bidder.isQualified
                        ? bidder.financialScore.toFixed(2)
                        : "N/A"}
                    </TableCell>
                    <TableCell className="text-center font-bold text-lg">
                      {bidder.isQualified
                        ? bidder.combinedScore.toFixed(2)
                        : 'Disqualified'}
                    </TableCell>
                    <TableCell className="text-center">
                      {bidder.isQualified ? (
                        <span className="text-green-600 font-semibold">
                          ✓ {t.procurement.qualified}
                        </span>
                      ) : (
                        <span className="text-red-600 font-semibold">
                          ✗ {t.procurement.notQualified}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {bidder.isQualified && (
                        <Button
                          size="sm"
                          variant={
                            selectedWinnerId === bidder.id
                              ? "default"
                              : "outline"
                          }
                          onClick={() => !isCbaFinalized && setSelectedWinnerId(bidder.id)}
                          disabled={isCbaFinalized}
                          className={isCbaFinalized ? "cursor-not-allowed opacity-70" : ""}
                        >
                          {selectedWinnerId === bidder.id
                            ? t.common.selected
                            : t.common.select}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Justification */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t.procurement.decisionJustification}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertDescription>
              {t.procurement.justificationMandatoryIfNotLowestBidder}
            </AlertDescription>
          </Alert>

          <Textarea
            value={justification}
            onChange={(e) => !isCbaFinalized && setJustification(e.target.value)}
            placeholder={t.procurement.selectionJustification}
            className={`min-h-[200px] ${isCbaFinalized ? 'bg-muted cursor-not-allowed opacity-70' : ''}`}
            readOnly={isCbaFinalized}
            disabled={isCbaFinalized}
          />
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════
          Approval & Signatures Section
          ══════════════════════════════════════════════════════════════ */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5" />
              {t.procurement.approvalSignatures}
            </CardTitle>
            {!isCbaFinalized && (
              <Button
                variant="outline"
                size="sm"
                onClick={addMember}
                className="flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                {t.procurement.addCommitteeMember}
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {t.procurement.committeeMembers}: {approvalMembers.length}
            {isCbaFinalized && (
              <span className="ml-2 text-xs text-green-600 font-medium">
                <Lock className="h-3 w-3 inline mr-1" />
                {isRTL ? 'مقفل' : 'Locked'}
              </span>
            )}
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>{t.procurement.role}</TableHead>
                  <TableHead>{t.procurement.name}</TableHead>
                  <TableHead className="text-center">
                    {t.procurement.digitalSignature}
                  </TableHead>
                  <TableHead className="text-center">
                    {t.procurement.signedOn}
                  </TableHead>
                  <TableHead className="text-center">
                    {t.procurement.verificationQrCode}
                  </TableHead>
                  {!isCbaFinalized && (
                    <TableHead className="text-center w-[80px]">
                      {t.common.actions}
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvalMembers.map((member, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-bold text-center">
                      {idx + 1}
                    </TableCell>
                    <TableCell>
                      <Input
                        value={isRTL ? (member.roleAr || member.role) : member.role}
                        onChange={(e) => {
                          if (!isCbaFinalized) {
                            if (isRTL) {
                              updateMemberField(idx, "roleAr", e.target.value);
                            } else {
                              updateMemberField(idx, "role", e.target.value);
                            }
                          }
                        }}
                        placeholder={t.procurement.role}
                        className={`min-w-[140px] ${isCbaFinalized ? 'bg-muted cursor-not-allowed' : ''}`}
                        readOnly={isCbaFinalized}
                        disabled={isCbaFinalized}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={member.memberName}
                        onChange={(e) =>
                          !isCbaFinalized && updateMemberField(
                            idx,
                            "memberName",
                            e.target.value
                          )
                        }
                        placeholder={t.common.name}
                        className={`min-w-[140px] ${isCbaFinalized ? 'bg-muted cursor-not-allowed' : ''}`}
                        readOnly={isCbaFinalized}
                        disabled={isCbaFinalized}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      {member.signatureDataUrl ? (
                        <div className="flex flex-col items-center gap-1">
                          <img
                            src={member.signatureDataUrl}
                            alt="Signature"
                            className="max-w-[120px] max-h-[50px] border rounded"
                          />
                          {!isCbaFinalized && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-red-500 h-6"
                              onClick={() => clearMemberSignature(idx)}
                            >
                              {t.procurement.clearSignature}
                            </Button>
                          )}
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => !isCbaFinalized && openSignatureDialog(idx)}
                          className={`flex items-center gap-1 ${isCbaFinalized ? 'cursor-not-allowed opacity-50' : ''}`}
                          disabled={isCbaFinalized}
                        >
                          <PenTool className="h-3 w-3" />
                          {t.procurement.signHere}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {member.signedAt
                        ? new Date(member.signedAt).toLocaleString(
                            'en-US'
                          )
                        : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {/* Hidden QR canvas for generating data URL */}
                      <div style={{ display: "none" }}>
                        <QRCodeCanvas
                          value={`CBA-VERIFY:${member.verificationCode}|BA:${id}|MEMBER:${idx + 1}`}
                          size={100}
                          ref={(el: any) => {
                            if (el) {
                              // QRCodeCanvas renders a canvas element
                              const canvas = el as unknown as HTMLCanvasElement;
                              qrCanvasRefs.current[idx] = canvas;
                            }
                          }}
                        />
                      </div>
                      {member.qrCodeDataUrl ? (
                        <img
                          src={member.qrCodeDataUrl}
                          alt="QR"
                          className="w-[50px] h-[50px] mx-auto"
                        />
                      ) : member.signatureDataUrl ? (
                        <span className="text-xs text-muted-foreground">
                          {member.verificationCode}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          —
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {!isCbaFinalized && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMember(idx)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          disabled={approvalMembers.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {approvalMembers.length >= 3 && !isCbaFinalized && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                onClick={addMember}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {t.procurement.addCommitteeMember}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════
          Signature Dialog
          ══════════════════════════════════════════════════════════════ */}
      <Dialog
        open={signatureDialogOpen}
        onOpenChange={setSignatureDialogOpen}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5" />
              {t.procurement.digitalSignature}
              {activeSignatureIdx !== null && (
                <span className="text-muted-foreground font-normal text-sm">
                  — {approvalMembers[activeSignatureIdx]?.memberName ||
                    `${t.procurement.memberNumber} ${activeSignatureIdx + 1}`}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-4">
            <SignatureCanvas
              width={440}
              height={180}
              onSave={handleSignatureSave}
              onClear={() => {}}
              existingSignature={
                activeSignatureIdx !== null
                  ? approvalMembers[activeSignatureIdx]?.signatureDataUrl
                  : null
              }
              clearLabel={t.procurement.clearSignature}
              confirmLabel={t.procurement.confirmSignature}
              signHereLabel={t.procurement.signHere}
            />
            {activeSignatureIdx !== null && (
              <div className="mt-3 text-center">
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'رمز التحقق' : 'Verification Code'}:{" "}
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs font-mono">
                    {approvalMembers[activeSignatureIdx]?.verificationCode}
                  </code>
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════
          Finalize CBA Confirmation Dialog
          ══════════════════════════════════════════════════════════════ */}
      <Dialog open={finalizeDialogOpen} onOpenChange={setFinalizeDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              {isRTL ? 'اعتماد تحليل العطاءات التنافسية' : 'Finalize Competitive Bid Analysis'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-amber-800 mb-1">
                {isRTL ? 'تحذير: لا يمكن التراجع عن هذا الإجراء' : 'Warning: This action cannot be undone'}
              </p>
              <p className="text-sm text-amber-700">
                {isConsultancy
                  ? (isRTL
                    ? "بمجرد الإتمام، سيتم قفل تحليل العطاءات التنافسية وتعيين حالة طلب الشراء على 'مُرسَى'. سيتم إنشاء مسودة العقد تلقائياً مع بيانات المورد المختار."
                    : "Once finalized, the CBA will be locked and the Bid Analysis status will be set to Awarded. A draft Contract will be auto-created with the selected supplier data and offer cost.")
                  : (isRTL
                    ? "بمجرد الإتمام، سيتم قفل تحليل العطاءات التنافسية وتعيين حالة طلب الشراء على 'مُرسَى'. سيتم فتح بطاقة أمر الشراء في مساحة العمل."
                    : "Once finalized, the CBA will be locked and the Bid Analysis status will be set to Awarded. The Purchase Order card in the Procurement Workspace will be unlocked.")}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {isRTL ? 'الفائز المختار:' : 'Selected Winner:'}{" "}
                <span className="font-semibold text-foreground">
                  {rankedBidders.find((b) => b.id === selectedWinnerId)?.bidderName ||
                    (isRTL ? 'لم يتم الاختيار' : 'Not selected')}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                {isRTL ? 'التوقيعات:' : 'Signatures:'}{" "}
                <span className="font-semibold text-foreground">
                  {approvalMembers.filter((m) => m.signatureDataUrl).length} / {approvalMembers.length}
                </span>
              </p>
            </div>
          </div>
          <DialogFooter className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button
              variant="outline"
              onClick={() => setFinalizeDialogOpen(false)}
              disabled={finalizing}
            >
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleFinalizeCba}
              disabled={finalizing}
            >
              {finalizing ? (
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 me-2" />
              )}
              {isRTL ? 'تأكيد الاعتماد' : 'Confirm Finalize'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
