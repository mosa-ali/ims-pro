/**
 * Blacklist Case Detail — Full Page View
 *
 * Replaces the small dialog with a spacious, dedicated page.
 * Includes:
 *  - Case header with status badge and vendor info
 *  - Tabs: Details, Evidence, Signatures, Audit Log
 *  - Canvas-based digital signature capture for Submitter & Manager (Approver)
 *  - Verification QR code per signature (encodes hash + timestamp)
 *  - Workflow action buttons that update status accordingly
 *  - Full RTL/LTR bilingual support
 *
 * Route: /organization/logistics/evaluation-performance/blacklist/:id
 */
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useParams } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate, useLocation } from "@/lib/router-compat";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert";
import {
  ShieldBan,
  Shield,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  ShieldCheck,
  ShieldX,
  RotateCcw,
  Loader2,
  Upload,
  Trash2,
  Pen,
  History,
  Download,
  Calendar,
  User,
  Paperclip,
  QrCode,
  Info,
  RefreshCw,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

// ── Reason category labels ──
const REASON_LABELS: Record<string, { en: string; ar: string }> = {
  fraud_falsified_docs: {
    en: "Fraud / Falsified Documents",
    ar: "احتيال / وثائق مزورة",
  },
  corruption_bribery: { en: "Corruption / Bribery", ar: "فساد / رشوة" },
  sanctions_screening_failure: {
    en: "Sanctions Screening Failure",
    ar: "فشل فحص العقوبات",
  },
  repeated_non_performance: {
    en: "Repeated Non-Performance",
    ar: "عدم الأداء المتكرر",
  },
  contract_abandonment: {
    en: "Contract Abandonment",
    ar: "التخلي عن العقد",
  },
  repeated_delivery_failure: {
    en: "Repeated Delivery Failure",
    ar: "فشل التسليم المتكرر",
  },
  refusal_correct_defects: {
    en: "Refusal to Correct Defects",
    ar: "رفض تصحيح العيوب",
  },
  false_declarations: {
    en: "False Declarations",
    ar: "إقرارات كاذبة",
  },
  conflict_of_interest: {
    en: "Conflict of Interest",
    ar: "تضارب المصالح",
  },
  other: { en: "Other", ar: "أخرى" },
};

// ── Duration labels ──
const DURATION_LABELS: Record<string, { en: string; ar: string }> = {
  "6_months": { en: "6 Months", ar: "6 أشهر" },
  "1_year": { en: "1 Year", ar: "سنة واحدة" },
  "2_years": { en: "2 Years", ar: "سنتان" },
  "3_years": { en: "3 Years", ar: "3 سنوات" },
  "5_years": { en: "5 Years", ar: "5 سنوات" },
  permanent: { en: "Permanent", ar: "دائم" },
};

// ── Status config ──
const STATUS_CONFIG: Record<
  string,
  { en: string; ar: string; color: string; icon: any }
> = {
  draft: {
    en: "Draft",
    ar: "مسودة",
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    icon: FileText,
  },
  submitted: {
    en: "Submitted",
    ar: "مقدم",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    icon: Send,
  },
  under_validation: {
    en: "Under Validation",
    ar: "قيد التحقق",
    color:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    icon: Clock,
  },
  pending_approval: {
    en: "Pending Approval",
    ar: "بانتظار الموافقة",
    color:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    icon: AlertTriangle,
  },
  approved: {
    en: "Approved (Active)",
    ar: "معتمد (نشط)",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    icon: ShieldBan,
  },
  rejected: {
    en: "Rejected",
    ar: "مرفوض",
    color:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    icon: XCircle,
  },
  revoked: {
    en: "Revoked",
    ar: "ملغى",
    color:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    icon: RotateCcw,
  },
  expired: {
    en: "Expired",
    ar: "منتهي",
    color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    icon: Calendar,
  },
};

function StatusBadge({
  status,
  isRTL,
  size = "default",
}: {
  status: string;
  isRTL: boolean;
  size?: "default" | "lg";
}) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return <Badge variant="outline">{status}</Badge>;
  const Icon = cfg.icon;
  return (
    <Badge
      className={`${cfg.color} gap-1.5 ${
        size === "lg" ? "text-sm px-3 py-1" : ""
      }`}
    >
      <Icon className={size === "lg" ? "w-4 h-4" : "w-3 h-3"} />
      {isRTL ? cfg.ar : cfg.en}
    </Badge>
  );
}

// ── Workflow step indicator ──
const WORKFLOW_STEPS = [
  { key: "draft", en: "Draft", ar: "مسودة" },
  { key: "submitted", en: "Submitted", ar: "مقدم" },
  { key: "under_validation", en: "Validation", ar: "التحقق" },
  { key: "pending_approval", en: "Approval", ar: "الموافقة" },
  { key: "approved", en: "Active", ar: "نشط" },
];

function WorkflowStepper({
  currentStatus,
  isRTL,
}: {
  currentStatus: string;
  isRTL: boolean;
}) {
  const terminalStatuses = ["rejected", "revoked", "expired"];
  const isTerminal = terminalStatuses.includes(currentStatus);

  const currentIdx = WORKFLOW_STEPS.findIndex((s) => s.key === currentStatus);

  return (
    <div className="flex items-center gap-1 w-full overflow-x-auto py-2">
      {WORKFLOW_STEPS.map((step, idx) => {
        const isCompleted = !isTerminal && idx < currentIdx;
        const isCurrent = step.key === currentStatus;
        const isPast = isCompleted || isCurrent;

        return (
          <div key={step.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                  isCurrent
                    ? "bg-primary text-primary-foreground border-primary"
                    : isCompleted
                    ? "bg-primary/20 text-primary border-primary/40"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={`text-[10px] mt-1 text-center leading-tight ${
                  isPast
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {isRTL ? step.ar : step.en}
              </span>
            </div>
            {idx < WORKFLOW_STEPS.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-1 mt-[-16px] ${
                  isCompleted ? "bg-primary/40" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}

      {isTerminal && (
        <div className="flex items-center flex-1 min-w-0">
          <div
            className={`h-0.5 flex-1 mx-1 mt-[-16px] ${
              currentStatus === "rejected"
                ? "bg-destructive/40"
                : "bg-emerald-400/40"
            }`}
          />
          <div className="flex flex-col items-center flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                currentStatus === "rejected"
                  ? "bg-destructive text-destructive-foreground border-destructive"
                  : currentStatus === "revoked"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-gray-500 text-white border-gray-500"
              }`}
            >
              {currentStatus === "rejected" ? (
                <XCircle className="w-4 h-4" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
            </div>
            <span className="text-[10px] mt-1 text-center leading-tight font-medium">
              {isRTL
                ? STATUS_CONFIG[currentStatus]?.ar
                : STATUS_CONFIG[currentStatus]?.en}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SIGNATURE CANVAS COMPONENT
// ══════════════════════════════════════════════════════════════
function SignatureCanvas({
  onCapture,
  isRTL,
  label,
  isPending,
}: {
  onCapture: (dataUrl: string) => void;
  isRTL: boolean;
  label: string;
  isPending: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const getPos = useCallback(
    (
      e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      if ("touches" in e) {
        const touch = e.touches[0];
        return {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        };
      }
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    []
  );

  const startDrawing = useCallback(
    (
      e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
    ) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      setIsDrawing(true);
    },
    [getPos]
  );

  const draw = useCallback(
    (
      e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
    ) => {
      e.preventDefault();
      if (!isDrawing) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const pos = getPos(e);
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1a1a2e";
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      setHasSignature(true);
    },
    [isDrawing, getPos]
  );

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleCapture = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;
    const dataUrl = canvas.toDataURL("image/png");
    onCapture(dataUrl);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="font-semibold flex items-center gap-2">
          <Pen className="w-4 h-4" />
          {label}
        </Label>
        {hasSignature && (
          <span className="text-xs text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {isRTL ? "تم التوقيع" : "Signature captured"}
          </span>
        )}
      </div>

      <div className="border-2 border-dashed rounded-xl bg-white dark:bg-slate-950 p-1 relative">
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <p className="text-muted-foreground/40 text-sm select-none">
              {isRTL ? "ارسم توقيعك هنا" : "Draw your signature here"}
            </p>
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={600}
          height={150}
          className="w-full cursor-crosshair rounded-lg touch-none"
          style={{ height: "150px" }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={clearSignature}
          disabled={!hasSignature}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {isRTL ? "مسح التوقيع" : "Clear"}
        </Button>
        <div className="flex-1" />
        <Button
          size="sm"
          onClick={handleCapture}
          disabled={!hasSignature || isPending}
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          <Pen className="w-4 h-4" />
          {isRTL ? "تأكيد التوقيع" : "Confirm Signature"}
        </Button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SIGNATURE CARD WITH QR CODE
// ══════════════════════════════════════════════════════════════
function SignatureCard({
  sig,
  isRTL,
}: {
  sig: any;
  isRTL: boolean;
}) {
  const qrData = useMemo(() => {
    return JSON.stringify({
      caseId: sig.caseId,
      signer: sig.signerName,
      role: sig.signerRole,
      hash: sig.signatureHash,
      signedAt: sig.signedAt,
      status: sig.status,
    });
  }, [sig]);

  const roleLabel = useMemo(() => {
    const roles: Record<string, { en: string; ar: string }> = {
      submitter: { en: "Submitter", ar: "مقدم الطلب" },
      approver: { en: "Manager / Approver", ar: "المدير / المعتمد" },
      user: { en: "User", ar: "مستخدم" },
      admin: { en: "Admin", ar: "مسؤول" },
    };
    return roles[sig.signerRole] || { en: sig.signerRole, ar: sig.signerRole };
  }, [sig.signerRole]);

  return (
    <Card
      className={`overflow-hidden ${
        sig.status === "revoked" ? "opacity-60 border-destructive/30" : ""
      }`}
    >
      <CardContent className="p-5">
        <div className="flex gap-5">
          {/* Left: Signature image + info */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold text-sm">{sig.signerName}</span>
              <Badge
                variant="outline"
                className="text-xs capitalize"
              >
                {isRTL ? roleLabel.ar : roleLabel.en}
              </Badge>
              {sig.status === "revoked" && (
                <Badge variant="destructive" className="text-xs">
                  {isRTL ? "ملغى" : "Revoked"}
                </Badge>
              )}
            </div>

            {/* Signature image */}
            {sig.signatureImageUrl && (
              <div className="bg-white dark:bg-slate-950 border rounded-lg p-3 inline-block">
                <img
                  src={sig.signatureImageUrl}
                  alt="Signature"
                  className="h-20 object-contain"
                />
              </div>
            )}

            {/* Timestamp */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span className="font-medium">
                {isRTL ? "وقت التوقيع:" : "Signed at:"}
              </span>
              <span>
                {sig.signedAt
                  ? new Date(sig.signedAt).toLocaleString(
                      isRTL ? "ar-SA" : "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      }
                    )
                  : "—"}
              </span>
            </div>

            {/* Hash */}
            {sig.signatureHash && (
              <div className="text-xs text-muted-foreground font-mono bg-muted/50 rounded px-2 py-1 inline-block">
                SHA-256: {sig.signatureHash.substring(0, 32)}...
              </div>
            )}
          </div>

          {/* Right: QR Code */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div className="bg-white p-2 rounded-lg border shadow-sm">
              <QRCodeSVG
                value={qrData}
                size={100}
                level="M"
                includeMargin={false}
              />
            </div>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <QrCode className="w-3 h-3" />
              {isRTL ? "رمز التحقق" : "Verification QR"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ══════════════════════════════════════════════════════════════
export default function BlacklistCaseDetail() {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [currentLoc] = useLocation();
  const isFinanceContext = currentLoc.includes('/finance/');
  const blacklistBackPath = isFinanceContext ? '/organization/finance/vendors/evaluation/blacklist' : '/organization/logistics/evaluation-performance/blacklist';
  const caseId = Number(id);

  // ── Data query ──
  const caseQuery = trpc.blacklist.getCase.useQuery(
    { caseId },
    { enabled: !!caseId && !isNaN(caseId) }
  );
  const caseData = caseQuery.data;

  // ── Role-based permission queries (must be before any early returns) ──
  const { data: userRoles } = trpc.blacklist.getUserRoles.useQuery();
  const { data: workflowConfig } = trpc.blacklist.getWorkflowConfig.useQuery();

  // ── Workflow mutations ──
  const utils = trpc.useUtils();
  const onSuccess = () => {
    caseQuery.refetch();
    utils.blacklist.getSummary.invalidate();
    utils.blacklist.list.invalidate();
    toast.success(isRTL ? "تم تحديث الحالة بنجاح" : "Status updated successfully");
  };

  const submitMutation = trpc.blacklist.submitRequest.useMutation({ onSuccess });
  const validateMutation = trpc.blacklist.validateRequest.useMutation({ onSuccess });
  const moveToApprovalMutation = trpc.blacklist.moveToApproval.useMutation({ onSuccess });
  const rejectMutation = trpc.blacklist.rejectRequest.useMutation({ onSuccess });
  const revokeMutation = trpc.blacklist.revokeBlacklist.useMutation({ onSuccess });
  const approveMutation = trpc.blacklist.approveRequest.useMutation({ onSuccess });

  // ── Evidence mutations ──
  const uploadEvidenceMutation = trpc.blacklist.uploadEvidence.useMutation({
    onSuccess: () => {
      caseQuery.refetch();
      toast.success(isRTL ? "تم رفع الدليل بنجاح" : "Evidence uploaded successfully");
    },
  });
  const removeEvidenceMutation = trpc.blacklist.removeEvidence.useMutation({
    onSuccess: () => {
      caseQuery.refetch();
      toast.success(isRTL ? "تم حذف الدليل" : "Evidence removed");
    },
  });

  // ── Local state ──
  const [activeTab, setActiveTab] = useState("details");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showRevokeForm, setShowRevokeForm] = useState(false);
  const [showApproveForm, setShowApproveForm] = useState(false);
  const [showSubmitSignature, setShowSubmitSignature] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [revokeReason, setRevokeReason] = useState("");
  const [approveStartDate, setApproveStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [approveExpiryDate, setApproveExpiryDate] = useState("");
  const [approveReviewDate, setApproveReviewDate] = useState("");
  const [approveComments, setApproveComments] = useState("");
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Handlers ──
  const handleSubmitWithSignature = (signatureDataUrl: string) => {
    submitMutation.mutate({ caseId, signatureDataUrl });
    setShowSubmitSignature(false);
  };

  const handleSubmitWithoutSignature = () => {
    submitMutation.mutate({ caseId });
  };

  const handleApproveWithSignature = (signatureDataUrl: string) => {
    approveMutation.mutate({
      caseId,
      signatureDataUrl,
      blacklistStartDate: approveStartDate,
      expiryDate: approveExpiryDate || undefined,
      reviewDate: approveReviewDate || undefined,
      comments: approveComments || undefined,
    });
    setShowApproveForm(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadEvidenceMutation.mutate({
        caseId,
        fileName: file.name,
        fileBase64: base64,
        fileType: file.type,
        description: evidenceDescription || undefined,
      });
      setEvidenceDescription("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsDataURL(file);
  };

  // ── Loading state ──
  if (caseQuery.isLoading) {
    return (
      <div className="p-6" dir={isRTL ? "rtl" : "ltr"}>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-muted-foreground ms-3 text-lg">
            {isRTL ? "جاري تحميل تفاصيل الحالة..." : "Loading case details..."}
          </span>
        </div>
      </div>
    );
  }

  // ── Not found ──
  if (!caseData) {
    return (
      <div className="p-6" dir={isRTL ? "rtl" : "ltr"}>
        <BackButton
          href={blacklistBackPath}
          label={
            isRTL
              ? "العودة إلى إدارة القائمة السوداء"
              : "Back to Blacklist Management"
          }
        />
        <div className="text-center py-24 text-muted-foreground">
          <ShieldBan className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-xl font-medium">
            {isRTL ? "لم يتم العثور على الحالة" : "Case not found"}
          </p>
        </div>
      </div>
    );
  }

  // Permission flags combine status checks with role-based access
  // In Finance context, all actions are disabled (read-only mirror)
  const canSubmit = isFinanceContext ? false : caseData.status === "draft";
  const canValidate = isFinanceContext ? false : caseData.status === "submitted" && (userRoles?.canValidate ?? false);
  const canMoveToApproval = isFinanceContext ? false : caseData.status === "under_validation" && (userRoles?.canValidate ?? false);
  const canApprove = isFinanceContext ? false : caseData.status === "pending_approval" && (userRoles?.canApprove ?? false);
  const canReject = isFinanceContext ? false : ["submitted", "under_validation", "pending_approval"].includes(
    caseData.status
  ) && (userRoles?.canReject ?? false);
  const canRevoke = isFinanceContext ? false : caseData.status === "approved" && (userRoles?.canRevoke ?? false);
  const isEditable = isFinanceContext ? false : !["approved", "rejected", "revoked", "expired"].includes(
    caseData.status
  );

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto" dir={isRTL ? "rtl" : "ltr"}>
      {/* ── Back button ── */}
      <BackButton
        href={blacklistBackPath}
        label={
          isRTL
            ? "العودة إلى إدارة القائمة السوداء"
            : "Back to Blacklist Management"
        }
      />

      {/* ── Case Header Card ── */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            {/* Left: Case info */}
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Shield className="w-6 h-6 text-primary" />
                <h1 className="text-2xl font-bold">{caseData.caseNumber}</h1>
                <StatusBadge
                  status={caseData.status}
                  isRTL={isRTL}
                  size="lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? "المورد" : "Vendor"}
                  </p>
                  <p className="font-semibold">
                    {isRTL
                      ? caseData.vendor?.nameAr || caseData.vendor?.name
                      : caseData.vendor?.name}{" "}
                    <span className="text-muted-foreground font-normal">
                      ({caseData.vendor?.vendorCode})
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? "فئة السبب" : "Reason Category"}
                  </p>
                  <p className="font-semibold">
                    {isRTL
                      ? REASON_LABELS[caseData.reasonCategory]?.ar
                      : REASON_LABELS[caseData.reasonCategory]?.en}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? "تاريخ الإنشاء" : "Created"}
                  </p>
                  <p className="text-sm">
                    {caseData.createdAt
                      ? new Date(caseData.createdAt).toLocaleDateString(
                          isRTL ? "ar-SA" : "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )
                      : "—"}
                  </p>
                </div>
                {caseData.blacklistStartDate && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? "تاريخ بدء الحظر" : "Blacklist Start"}
                    </p>
                    <p className="text-sm font-medium text-red-600">
                      {caseData.blacklistStartDate}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Workflow stepper */}
            <div className="lg:w-[380px] shrink-0">
              <p className="text-xs text-muted-foreground mb-2 font-medium">
                {isRTL ? "مراحل سير العمل" : "Workflow Progress"}
              </p>
              <WorkflowStepper
                currentStatus={caseData.status}
                isRTL={isRTL}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details" className="gap-1.5">
            <FileText className="w-4 h-4" />
            {isRTL ? "التفاصيل" : "Details"}
          </TabsTrigger>
          <TabsTrigger value="evidence" className="gap-1.5">
            <Paperclip className="w-4 h-4" />
            {isRTL ? "الأدلة" : "Evidence"}{" "}
            ({caseData.evidence?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="signatures" className="gap-1.5">
            <Pen className="w-4 h-4" />
            {isRTL ? "التوقيعات" : "Signatures"}{" "}
            ({caseData.signatures?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5">
            <History className="w-4 h-4" />
            {isRTL ? "سجل التدقيق" : "Audit Log"}{" "}
            ({caseData.auditLog?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        {/* ════════════════════════════════════════════════════════ */}
        {/* DETAILS TAB */}
        {/* ════════════════════════════════════════════════════════ */}
        <TabsContent value="details" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Case Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  {isRTL ? "معلومات الحالة" : "Case Information"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InfoRow
                  label={isRTL ? "رقم الحالة" : "Case Number"}
                  value={caseData.caseNumber}
                />
                <InfoRow
                  label={isRTL ? "تاريخ الحادثة" : "Incident Date"}
                  value={caseData.incidentDate || "—"}
                />
                <InfoRow
                  label={isRTL ? "المرجع ذو الصلة" : "Related Reference"}
                  value={caseData.relatedReference || "—"}
                />
                <InfoRow
                  label={isRTL ? "المدة الموصى بها" : "Recommended Duration"}
                  value={
                    caseData.recommendedDuration
                      ? isRTL
                        ? DURATION_LABELS[caseData.recommendedDuration]?.ar ||
                          caseData.recommendedDuration
                        : DURATION_LABELS[caseData.recommendedDuration]?.en ||
                          caseData.recommendedDuration
                      : "—"
                  }
                />
                {caseData.expiryDate && (
                  <InfoRow
                    label={isRTL ? "تاريخ الانتهاء" : "Expiry Date"}
                    value={caseData.expiryDate}
                  />
                )}
                {caseData.reviewDate && (
                  <InfoRow
                    label={isRTL ? "تاريخ المراجعة" : "Review Date"}
                    value={caseData.reviewDate}
                  />
                )}
              </CardContent>
            </Card>

            {/* Justification Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {isRTL ? "التبرير والملاحظات" : "Justification & Notes"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {isRTL ? "التبرير التفصيلي" : "Detailed Justification"}
                  </Label>
                  <div className="bg-muted/50 p-4 rounded-lg text-sm whitespace-pre-wrap mt-1 leading-relaxed">
                    {caseData.detailedJustification}
                  </div>
                </div>

                {caseData.additionalComments && (
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      {isRTL ? "ملاحظات إضافية" : "Additional Comments"}
                    </Label>
                    <div className="bg-muted/50 p-4 rounded-lg text-sm whitespace-pre-wrap mt-1">
                      {caseData.additionalComments}
                    </div>
                  </div>
                )}

                {caseData.rejectionReason && (
                  <Alert variant="destructive">
                    <XCircle className="w-4 h-4" />
                    <AlertTitle>
                      {isRTL ? "سبب الرفض" : "Rejection Reason"}
                    </AlertTitle>
                    <AlertDescription className="whitespace-pre-wrap">
                      {caseData.rejectionReason}
                    </AlertDescription>
                  </Alert>
                )}

                {caseData.revocationReason && (
                  <Alert className="border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20">
                    <RotateCcw className="w-4 h-4 text-emerald-600" />
                    <AlertTitle className="text-emerald-700">
                      {isRTL ? "سبب إلغاء الحظر" : "Revocation Reason"}
                    </AlertTitle>
                    <AlertDescription className="whitespace-pre-wrap text-emerald-700">
                      {caseData.revocationReason}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Workflow Actions ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="w-4 h-4" />
                {isRTL ? "إجراءات سير العمل" : "Workflow Actions"}
              </CardTitle>
              <CardDescription>
                {isRTL
                  ? "اتخذ إجراء لتحريك هذه الحالة في سير العمل"
                  : "Take action to move this case through the workflow"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                {canSubmit && (
                  <>
                    <Button
                      onClick={() => setShowSubmitSignature(true)}
                      disabled={submitMutation.isPending}
                    >
                      {submitMutation.isPending && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      <Send className="w-4 h-4" />
                      {isRTL
                        ? "تقديم مع التوقيع"
                        : "Submit with Signature"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleSubmitWithoutSignature}
                      disabled={submitMutation.isPending}
                    >
                      {submitMutation.isPending && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      <Send className="w-4 h-4" />
                      {isRTL
                        ? "تقديم بدون توقيع"
                        : "Submit without Signature"}
                    </Button>
                  </>
                )}
                {canValidate && (
                  <Button
                    variant="outline"
                    onClick={() => validateMutation.mutate({ caseId })}
                    disabled={validateMutation.isPending}
                  >
                    {validateMutation.isPending && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    <ShieldCheck className="w-4 h-4" />
                    {isRTL ? "تحقق" : "Validate"}
                  </Button>
                )}
                {canMoveToApproval && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      moveToApprovalMutation.mutate({ caseId })
                    }
                    disabled={moveToApprovalMutation.isPending}
                  >
                    {moveToApprovalMutation.isPending && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    <CheckCircle2 className="w-4 h-4" />
                    {isRTL ? "نقل للموافقة" : "Move to Approval"}
                  </Button>
                )}
                {canApprove && (
                  <Button
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => setShowApproveForm(!showApproveForm)}
                  >
                    <ShieldBan className="w-4 h-4" />
                    {isRTL
                      ? "الموافقة والحظر (توقيع المدير)"
                      : "Approve & Blacklist (Manager Sign-off)"}
                  </Button>
                )}
                {canReject && (
                  <Button
                    variant="destructive"
                    onClick={() => setShowRejectForm(!showRejectForm)}
                  >
                    <XCircle className="w-4 h-4" />
                    {isRTL ? "رفض" : "Reject"}
                  </Button>
                )}
                {canRevoke && (
                  <Button
                    variant="outline"
                    className="border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => setShowRevokeForm(!showRevokeForm)}
                  >
                    <RotateCcw className="w-4 h-4" />
                    {isRTL ? "إلغاء الحظر" : "Revoke Blacklist"}
                  </Button>
                )}

                {!canSubmit &&
                  !canValidate &&
                  !canMoveToApproval &&
                  !canApprove &&
                  !canReject &&
                  !canRevoke && (
                    <p className="text-sm text-muted-foreground py-2">
                      {isRTL
                        ? "لا توجد إجراءات متاحة لهذه الحالة"
                        : "No actions available for this status"}
                    </p>
                  )}
              </div>

              {/* ── Submit with Signature Panel ── */}
              {showSubmitSignature && (
                <div className="border rounded-xl p-5 bg-blue-50/50 dark:bg-blue-900/10 space-y-4">
                  <h4 className="font-semibold text-blue-700 flex items-center gap-2">
                    <Pen className="w-4 h-4" />
                    {isRTL
                      ? "توقيع مقدم الطلب"
                      : "Submitter Sign-off"}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {isRTL
                      ? "قم بالتوقيع أدناه لتأكيد تقديم طلب الحظر. سيتم تسجيل التوقيع مع الطابع الزمني ورمز التحقق."
                      : "Sign below to confirm submission of this blacklist request. Your signature will be recorded with a timestamp and verification QR code."}
                  </p>
                  <SignatureCanvas
                    onCapture={handleSubmitWithSignature}
                    isRTL={isRTL}
                    label={
                      isRTL ? "التوقيع الرقمي للمقدم *" : "Submitter Digital Signature *"
                    }
                    isPending={submitMutation.isPending}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowSubmitSignature(false)}
                  >
                    {isRTL ? "إلغاء" : "Cancel"}
                  </Button>
                </div>
              )}

              {/* ── Reject Form ── */}
              {showRejectForm && (
                <div className="border rounded-xl p-5 bg-destructive/5 space-y-4">
                  <h4 className="font-semibold text-destructive flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    {isRTL ? "رفض الطلب" : "Reject Request"}
                  </h4>
                  <div className="space-y-2">
                    <Label>
                      {isRTL ? "سبب الرفض *" : "Rejection Reason *"}
                    </Label>
                    <Textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder={
                        isRTL
                          ? "اكتب سبب الرفض (5 أحرف على الأقل)"
                          : "Provide rejection reason (minimum 5 characters)"
                      }
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => {
                        rejectMutation.mutate({
                          caseId,
                          rejectionReason: rejectReason,
                        });
                        setShowRejectForm(false);
                        setRejectReason("");
                      }}
                      disabled={
                        rejectReason.length < 5 || rejectMutation.isPending
                      }
                    >
                      {rejectMutation.isPending && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      {isRTL ? "تأكيد الرفض" : "Confirm Rejection"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setShowRejectForm(false)}
                    >
                      {isRTL ? "إلغاء" : "Cancel"}
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Revoke Form ── */}
              {showRevokeForm && (
                <div className="border rounded-xl p-5 bg-emerald-50/50 dark:bg-emerald-900/10 space-y-4">
                  <h4 className="font-semibold text-emerald-700 flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" />
                    {isRTL ? "إلغاء الحظر" : "Revoke Blacklist"}
                  </h4>
                  <div className="space-y-2">
                    <Label>
                      {isRTL ? "سبب إلغاء الحظر *" : "Revocation Reason *"}
                    </Label>
                    <Textarea
                      value={revokeReason}
                      onChange={(e) => setRevokeReason(e.target.value)}
                      placeholder={
                        isRTL
                          ? "اكتب سبب إلغاء الحظر (5 أحرف على الأقل)"
                          : "Provide revocation reason (minimum 5 characters)"
                      }
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => {
                        revokeMutation.mutate({
                          caseId,
                          revocationReason: revokeReason,
                        });
                        setShowRevokeForm(false);
                        setRevokeReason("");
                      }}
                      disabled={
                        revokeReason.length < 5 || revokeMutation.isPending
                      }
                    >
                      {revokeMutation.isPending && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      {isRTL ? "تأكيد الإلغاء" : "Confirm Revocation"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setShowRevokeForm(false)}
                    >
                      {isRTL ? "إلغاء" : "Cancel"}
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Approve Form with Manager Signature ── */}
              {showApproveForm && (
                <div className="border rounded-xl p-5 bg-red-50/50 dark:bg-red-900/10 space-y-5">
                  <h4 className="font-semibold text-red-700 flex items-center gap-2">
                    <ShieldBan className="w-4 h-4" />
                    {isRTL
                      ? "الموافقة على الحظر - توقيع المدير"
                      : "Approve Blacklist - Manager Sign-off"}
                  </h4>

                  <p className="text-sm text-muted-foreground">
                    {isRTL
                      ? "بصفتك المدير المعتمد، قم بتحديد تواريخ الحظر وتوقيع الموافقة. سيتم تسجيل توقيعك مع الطابع الزمني ورمز QR للتحقق."
                      : "As the approving manager, set the blacklist dates and sign off on the approval. Your signature will be recorded with a timestamp and verification QR code."}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>
                        {isRTL ? "تاريخ بدء الحظر *" : "Start Date *"}
                      </Label>
                      <Input
                        type="date"
                        value={approveStartDate}
                        onChange={(e) => setApproveStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>
                        {isRTL ? "تاريخ الانتهاء" : "Expiry Date"}
                      </Label>
                      <Input
                        type="date"
                        value={approveExpiryDate}
                        onChange={(e) => setApproveExpiryDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>
                        {isRTL ? "تاريخ المراجعة" : "Review Date"}
                      </Label>
                      <Input
                        type="date"
                        value={approveReviewDate}
                        onChange={(e) => setApproveReviewDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{isRTL ? "ملاحظات" : "Comments"}</Label>
                    <Textarea
                      value={approveComments}
                      onChange={(e) => setApproveComments(e.target.value)}
                      rows={2}
                      placeholder={
                        isRTL ? "ملاحظات إضافية (اختياري)" : "Additional comments (optional)"
                      }
                    />
                  </div>

                  <Separator />

                  <SignatureCanvas
                    onCapture={handleApproveWithSignature}
                    isRTL={isRTL}
                    label={
                      isRTL
                        ? "التوقيع الرقمي للمدير المعتمد *"
                        : "Manager / Approver Digital Signature *"
                    }
                    isPending={approveMutation.isPending}
                  />

                  <Button
                    variant="ghost"
                    onClick={() => setShowApproveForm(false)}
                  >
                    {isRTL ? "إلغاء" : "Cancel"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════ */}
        {/* EVIDENCE TAB */}
        {/* ════════════════════════════════════════════════════════ */}
        <TabsContent value="evidence" className="space-y-6 mt-6">
          {/* Upload form with drag-and-drop */}
          {isEditable && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  {isRTL ? "رفع دليل جديد" : "Upload New Evidence"}
                </CardTitle>
                <CardDescription>
                  {isRTL
                    ? "PDF، صور، مستندات Word، جداول Excel (الحد الأقصى 10 ميجابايت)"
                    : "PDF, images, Word documents, Excel sheets (max 10MB)"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>
                    {isRTL ? "وصف الملف (اختياري)" : "File description (optional)"}
                  </Label>
                  <Input
                    value={evidenceDescription}
                    onChange={(e) => setEvidenceDescription(e.target.value)}
                    placeholder={
                      isRTL ? "وصف الملف المرفق" : "Describe the attached file"
                    }
                  />
                </div>
                {/* Drag-and-drop zone */}
                <div
                  className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer hover:border-primary/50 hover:bg-primary/5 ${
                    uploadEvidenceMutation.isPending
                      ? "opacity-50 pointer-events-none"
                      : "border-border"
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add("border-primary", "bg-primary/5");
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("border-primary", "bg-primary/5");
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("border-primary", "bg-primary/5");
                    const file = e.dataTransfer.files?.[0];
                    if (!file) return;
                    if (file.size > 10 * 1024 * 1024) {
                      toast.error(isRTL ? "حجم الملف يتجاوز 10 ميجابايت" : "File size exceeds 10MB limit");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      const base64 = (reader.result as string).split(",")[1];
                      uploadEvidenceMutation.mutate({
                        caseId,
                        fileName: file.name,
                        fileBase64: base64,
                        fileType: file.type,
                        description: evidenceDescription || undefined,
                      });
                      setEvidenceDescription("");
                    };
                    reader.readAsDataURL(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
                  />
                  {uploadEvidenceMutation.isPending ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-sm font-medium">
                        {isRTL ? "جاري الرفع..." : "Uploading..."}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-muted-foreground" />
                      <p className="text-sm font-medium">
                        {isRTL
                          ? "اسحب وأفلت الملف هنا أو انقر للاختيار"
                          : "Drag and drop a file here, or click to browse"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PDF, JPG, PNG, DOC, DOCX, XLS, XLSX
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Evidence list */}
          {(caseData.evidence?.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-16">
                <div className="text-center text-muted-foreground">
                  <Paperclip className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">
                    {isRTL ? "لا توجد أدلة مرفقة" : "No evidence attached"}
                  </p>
                  <p className="text-sm mt-1">
                    {isRTL
                      ? "قم برفع المستندات الداعمة لهذه الحالة"
                      : "Upload supporting documents for this case"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {caseData.evidence.map((ev: any) => {
                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(ev.fileName) || ev.fileType?.startsWith("image/");
                const isPdf = /\.pdf$/i.test(ev.fileName) || ev.fileType === "application/pdf";
                const fileSize = ev.fileSize ? (ev.fileSize < 1024 * 1024 ? `${(ev.fileSize / 1024).toFixed(1)} KB` : `${(ev.fileSize / (1024 * 1024)).toFixed(1)} MB`) : null;
                return (
                  <Card key={ev.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* File icon or image preview */}
                        {isImage ? (
                          <div className="w-20 h-20 rounded-lg overflow-hidden border bg-muted flex-shrink-0">
                            <img
                              src={ev.fileUrl}
                              alt={ev.fileName}
                              className="w-full h-full object-cover cursor-pointer"
                              onClick={() => window.open(ev.fileUrl, "_blank")}
                            />
                          </div>
                        ) : (
                          <div className={`p-3 rounded-lg flex-shrink-0 ${isPdf ? "bg-red-50 dark:bg-red-900/20" : "bg-muted"}`}>
                            <FileText className={`w-6 h-6 ${isPdf ? "text-red-500" : "text-muted-foreground"}`} />
                          </div>
                        )}
                        {/* File info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{ev.fileName}</p>
                          {ev.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{ev.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            {fileSize && <span>{fileSize}</span>}
                            {fileSize && ev.uploadedAt && <span>·</span>}
                            {ev.uploadedAt && (
                              <span>
                                {new Date(ev.uploadedAt).toLocaleDateString(
                                  isRTL ? "ar-SA" : "en-US",
                                  { year: "numeric", month: "short", day: "numeric" }
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(ev.fileUrl, "_blank")}
                          >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline ms-1">{isRTL ? "تحميل" : "Download"}</span>
                          </Button>
                          {isEditable && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() =>
                                removeEvidenceMutation.mutate({
                                  evidenceId: ev.id,
                                  caseId,
                                })
                              }
                              disabled={removeEvidenceMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ════════════════════════════════════════════════════════ */}
        {/* SIGNATURES TAB */}
        {/* ════════════════════════════════════════════════════════ */}
        <TabsContent value="signatures" className="space-y-6 mt-6">
          {(caseData.signatures?.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-16">
                <div className="text-center text-muted-foreground">
                  <Pen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">
                    {isRTL ? "لا توجد توقيعات" : "No signatures recorded"}
                  </p>
                  <p className="text-sm mt-1">
                    {isRTL
                      ? "ستظهر التوقيعات هنا عند تقديم الطلب أو الموافقة عليه"
                      : "Signatures will appear here when the request is submitted or approved"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Legend */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5" />
                  {isRTL
                    ? "كل توقيع يحتوي على رمز QR للتحقق"
                    : "Each signature includes a verification QR code"}
                </span>
              </div>

              {caseData.signatures.map((sig: any) => (
                <SignatureCard key={sig.id} sig={sig} isRTL={isRTL} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ════════════════════════════════════════════════════════ */}
        {/* AUDIT LOG TAB */}
        {/* ════════════════════════════════════════════════════════ */}
        <TabsContent value="audit" className="space-y-6 mt-6">
          {(caseData.auditLog?.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-16">
                <div className="text-center text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">
                    {isRTL ? "لا يوجد سجل تدقيق" : "No audit log entries"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {caseData.auditLog.map((log: any, idx: number) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="mt-1">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <History className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">
                            {log.userName || "System"}
                          </span>
                          <Badge variant="outline" className="text-xs capitalize">
                            {log.actionType?.replace(/_/g, " ")}
                          </Badge>
                          {log.previousStatus && log.newStatus && (
                            <span className="text-xs text-muted-foreground">
                              {isRTL
                                ? STATUS_CONFIG[log.previousStatus]?.ar ||
                                  log.previousStatus
                                : STATUS_CONFIG[log.previousStatus]?.en ||
                                  log.previousStatus}{" "}
                              →{" "}
                              {isRTL
                                ? STATUS_CONFIG[log.newStatus]?.ar ||
                                  log.newStatus
                                : STATUS_CONFIG[log.newStatus]?.en ||
                                  log.newStatus}
                            </span>
                          )}
                        </div>
                        {log.details && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {log.details}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1.5">
                          {log.createdAt
                            ? new Date(log.createdAt).toLocaleString(
                                isRTL ? "ar-SA" : "en-US",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )
                            : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Info Row helper ──
function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-end">{value || "—"}</span>
    </div>
  );
}
