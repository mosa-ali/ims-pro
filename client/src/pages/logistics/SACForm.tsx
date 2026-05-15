/**
 * SAC Form Page — Create / Edit / View (read-only)
 *
 * Sections per SAC Design Standard:
 *   1) Header Summary (read-only contract/PR info)
 *   2) Deliverables table (auto-loaded from contract milestones)
 *   3) Acceptance Statement + verification checkboxes
 *   4) Financial Acceptance
 *   5) Digital Signature (inline — no separate approval step)
 *   6) Verification QR Code (after signing)
 *
 * Workflow: Draft → Signed (complete). No "Submit for Approval" step.
 * The project officer / activity supervisor creates, fills, signs inline.
 * After signing, logistics can proceed to invoice.
 *
 * Uses inline translations pattern per IMSInlineTranslationsGuideline.md
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import SignaturePad from "@/components/SignaturePad";
import {
  ArrowLeft,
  FileCheck,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  Printer,
  ShieldCheck,
  ClipboardCheck,
  DollarSign,
  PenTool,
  QrCode,
} from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { BackButton } from "@/components/BackButton";

// ============================================================================
// BILINGUAL TRANSLATIONS
// ============================================================================
const translations = {
  en: {
    // Navigation
    back: "Back",
    backToList: "Back to SAC List",

    // Page Modes
    createTitle: "Create Service Acceptance Certificate",
    editTitle: "Edit Service Acceptance Certificate",
    viewTitle: "Service Acceptance Certificate",

    // Header Summary
    headerSummary: "Summary",
    prNumber: "PR Number",
    contractNumber: "Contract Number",
    vendor: "Vendor",
    project: "Project",
    currency: "Currency",
    contractValue: "Contract Value",
    contractStartDate: "Contract Start Date",
    contractEndDate: "Contract End Date",
    totalApprovedSac: "Total Approved SAC",
    remainingCapacity: "Remaining Capacity",
    sacNumber: "SAC Number",
    sacStatus: "Status",

    // Status
    statusDraft: "Draft",
    statusSigned: "Signed",
    statusRejected: "Rejected",

    // Section 2: Deliverables
    deliverablesSection: "Contract Deliverables",
    deliverablesDesc: "Review deliverables from the contract and mark their completion status",
    deliverableTitle: "Deliverable",
    deliverableDesc: "Description",
    plannedAmount: "Planned Amount",
    dueDate: "Due Date",
    completionStatus: "Status",
    notes: "Notes",
    noDeliverables: "No deliverables found in the contract",
    statusCompleted: "Completed",
    statusAchieved: "Achieved",
    statusReceived: "Received",
    statusPending: "Pending",
    statusInProgress: "In Progress",
    statusPartialCompleted: "Partial Completed",
    completionPercent: "Completion %",
    remainingWork: "Remarks / Pending Work",
    remainingWorkPlaceholder: "Describe pending work and remarks...",
    notesPlaceholder: "Optional notes...",

    // Section 3: Acceptance Statement
    acceptanceSection: "Acceptance Confirmation",
    acceptanceDesc: "Confirm that activities/services were implemented according to the agreed terms",
    acceptanceText: "Acceptance Statement",
    acceptancePlaceholder: "I confirm the activities/services were implemented according to the BoQs, signed contract, and agreed deliverables. The outputs were completed/received as described.",
    verifiedBoqs: "Verified against BoQs",
    verifiedContractTerms: "Verified against Contract Terms",
    verifiedDeliverablesReceived: "Verified deliverables received",
    preparedBy: "Prepared By",
    preparedByRole: "Role / Title",
    preparedByRolePlaceholder: "e.g. Project Manager",
    dateOfPreparation: "Date of Preparation",

    // Section 4: Financial Acceptance
    financialSection: "Financial Acceptance",
    financialDesc: "Specify the approved payment amount for this certificate",
    approvedAmount: "SAC Approved Amount",
    remainingAfterSac: "Remaining after this SAC",
    acceptanceDate: "Acceptance Date",

    // Section 5: Digital Signature (inline)
    signatureSection: "Digital Signature",
    signatureDesc: "Sign this certificate to complete it. After signing, logistics can proceed to invoice.",
    signatureRequired: "Digital Signature (required to complete)",
    signHere: "Sign here",
    clearSignature: "Clear",
    undoSignature: "Undo",
    signatureNote: "By signing, you confirm that all information above is accurate and complete.",

    // Section 6: QR Code (after signing)
    qrSection: "Verification",
    qrDesc: "Scan the QR code to verify this certificate",
    signedBy: "Signed By",
    signedAt: "Signed At",
    signatureHash: "Signature Hash",
    verified: "Verified",

    // Actions
    save: "Save Draft",
    saving: "Saving...",
    saveAndSign: "Save & Sign",
    signing: "Signing...",
    printPdf: "Print / Export PDF",
    printing: "Generating PDF...",

    // Validation
    fillAcceptanceText: "Please fill the acceptance statement",
    checkAllVerifications: "Please check all verification boxes",
    enterApprovedAmount: "Please enter the approved amount",
    markAtLeastOneDeliverable: "Please mark at least one deliverable as completed/achieved/received",
    signatureRequiredMsg: "Please provide your digital signature to complete",
    amountExceedsRemaining: "Amount exceeds remaining contract capacity",
    savedSuccessfully: "SAC saved successfully",
    signedSuccessfully: "SAC signed and completed successfully",
    fillAllRequired: "Please fill all required fields",

    // Watermark
    notFinal: "NOT FINAL",
  },
  ar: {
    // Navigation
    back: "رجوع",
    backToList: "العودة لقائمة شهادات القبول",

    // Page Modes
    createTitle: "إنشاء شهادة قبول خدمة",
    editTitle: "تعديل شهادة قبول خدمة",
    viewTitle: "شهادة قبول خدمة",

    // Header Summary
    headerSummary: "الملخص",
    prNumber: "رقم طلب الشراء",
    contractNumber: "رقم العقد",
    vendor: "المورد",
    project: "المشروع",
    currency: "العملة",
    contractValue: "قيمة العقد",
    contractStartDate: "تاريخ بداية العقد",
    contractEndDate: "تاريخ نهاية العقد",
    totalApprovedSac: "إجمالي شهادات القبول المعتمدة",
    remainingCapacity: "المتبقي",
    sacNumber: "رقم الشهادة",
    sacStatus: "الحالة",

    // Status
    statusDraft: "مسودة",
    statusSigned: "موقّع",
    statusRejected: "مرفوض",

    // Section 2: Deliverables
    deliverablesSection: "مخرجات العقد",
    deliverablesDesc: "مراجعة مخرجات العقد وتحديد حالة الإنجاز",
    deliverableTitle: "المخرج",
    deliverableDesc: "الوصف",
    plannedAmount: "المبلغ المخطط",
    dueDate: "تاريخ الاستحقاق",
    completionStatus: "الحالة",
    notes: "ملاحظات",
    noDeliverables: "لا توجد مخرجات في العقد",
    statusCompleted: "مكتمل",
    statusAchieved: "محقق",
    statusReceived: "مستلم",
    statusPending: "معلق",
    statusInProgress: "قيد التنفيذ",
    statusPartialCompleted: "مكتمل جزئياً",
    completionPercent: "نسبة الإنجاز %",
    remainingWork: "ملاحظات / الأعمال المتبقية",
    remainingWorkPlaceholder: "وصف الأعمال المتبقية والملاحظات...",
    notesPlaceholder: "ملاحظات اختيارية...",

    // Section 3: Acceptance Statement
    acceptanceSection: "تأكيد القبول",
    acceptanceDesc: "تأكيد أن الأنشطة/الخدمات تم تنفيذها وفقاً للشروط المتفق عليها",
    acceptanceText: "بيان القبول",
    acceptancePlaceholder: "أؤكد أن الأنشطة/الخدمات تم تنفيذها وفقاً لجداول الكميات والعقد الموقع والمخرجات المتفق عليها. تم إنجاز/استلام المخرجات كما هو موصوف.",
    verifiedBoqs: "تم التحقق من جداول الكميات",
    verifiedContractTerms: "تم التحقق من شروط العقد",
    verifiedDeliverablesReceived: "تم التحقق من استلام المخرجات",
    preparedBy: "أعدّه",
    preparedByRole: "المسمى الوظيفي",
    preparedByRolePlaceholder: "مثال: مدير المشروع",
    dateOfPreparation: "تاريخ الإعداد",

    // Section 4: Financial Acceptance
    financialSection: "القبول المالي",
    financialDesc: "تحديد مبلغ الدفع المعتمد لهذه الشهادة",
    approvedAmount: "المبلغ المعتمد للشهادة",
    remainingAfterSac: "المتبقي بعد هذه الشهادة",
    acceptanceDate: "تاريخ القبول",

    // Section 5: Digital Signature (inline)
    signatureSection: "التوقيع الرقمي",
    signatureDesc: "وقّع هذه الشهادة لإتمامها. بعد التوقيع، يمكن للوجستيات المتابعة إلى الفاتورة.",
    signatureRequired: "التوقيع الرقمي (مطلوب للإتمام)",
    signHere: "وقّع هنا",
    clearSignature: "مسح",
    undoSignature: "تراجع",
    signatureNote: "بالتوقيع، تؤكد أن جميع المعلومات أعلاه دقيقة وكاملة.",

    // Section 6: QR Code (after signing)
    qrSection: "التحقق",
    qrDesc: "امسح رمز QR للتحقق من هذه الشهادة",
    signedBy: "وقّعه",
    signedAt: "تاريخ التوقيع",
    signatureHash: "بصمة التوقيع",
    verified: "تم التحقق",

    // Actions
    save: "حفظ المسودة",
    saving: "جاري الحفظ...",
    saveAndSign: "حفظ وتوقيع",
    signing: "جاري التوقيع...",
    printPdf: "طباعة / تصدير PDF",
    printing: "جاري إنشاء PDF...",

    // Validation
    fillAcceptanceText: "يرجى ملء بيان القبول",
    checkAllVerifications: "يرجى تحديد جميع خانات التحقق",
    enterApprovedAmount: "يرجى إدخال المبلغ المعتمد",
    markAtLeastOneDeliverable: "يرجى تحديد مخرج واحد على الأقل كمكتمل/محقق/مستلم",
    signatureRequiredMsg: "يرجى تقديم توقيعك الرقمي للإتمام",
    amountExceedsRemaining: "المبلغ يتجاوز المتبقي من قيمة العقد",
    savedSuccessfully: "تم حفظ شهادة القبول بنجاح",
    signedSuccessfully: "تم توقيع وإتمام شهادة القبول بنجاح",
    fillAllRequired: "يرجى ملء جميع الحقول المطلوبة",

    // Watermark
    notFinal: "غير نهائي",
  },
};

const deliverableStatusOptions = [
  { value: "pending", labelEn: "Pending", labelAr: "معلق" },
  { value: "in_progress", labelEn: "In Progress", labelAr: "قيد التنفيذ" },
  { value: "completed", labelEn: "Completed", labelAr: "مكتمل" },
  { value: "achieved", labelEn: "Achieved", labelAr: "محقق" },
  { value: "received", labelEn: "Received", labelAr: "مستلم" },
  { value: "partial_completed", labelEn: "Partial Completed", labelAr: "مكتمل جزئياً" },
];

const sacStatusOptions = [
  { value: "draft", labelEn: "Draft", labelAr: "مسودة" },
  { value: "approved", labelEn: "Signed", labelAr: "موقّع" },
  { value: "rejected", labelEn: "Rejected", labelAr: "مرفوض" },
];

interface DeliverableRow {
  milestoneId: number;
  title: string;
  description?: string;
  amount?: string;
  dueDate?: string;
  status: string;
  notes: string;
  completionPercent?: number;
  remainingWork?: string;
}

export default function SACForm() {  const params = useParams<{ sacId: string }>();
  const searchString = useSearch();
  const searchParams = useMemo(() => new URLSearchParams(searchString), [searchString]);
  const [, setLocation] = useLocation();
  const { language, isRTL } = useLanguage();
  const { user } = useAuth();
  const t = translations[language as keyof typeof translations] || translations.en;
  const [generatingPdfId, setGeneratingPdfId] = useState<number | null>(null);
  const generatePDF = trpc.logistics.generatePDF.useMutation();
  
  const sacId = params.sacId;
  const isNew = sacId === "new";
  const contractIdParam = searchParams.get("contractId");
  const prIdParam = searchParams.get("prId");
  const modeParam = searchParams.get("mode"); // "view" for read-only

  // Determine mode — draft SACs should always be editable
  const [mode, setMode] = useState<"create" | "edit" | "view">(
    isNew ? "create" : modeParam === "view" ? "view" : "edit"
  );
  const readOnly = mode === "view";

  // Form state
  const [acceptanceText, setAcceptanceText] = useState("");
  const [verifiedBoqs, setVerifiedBoqs] = useState(false);
  const [verifiedContractTerms, setVerifiedContractTerms] = useState(false);
  const [verifiedDeliverablesReceived, setVerifiedDeliverablesReceived] = useState(false);
  const [preparedByName, setPreparedByName] = useState("");
  const [preparedByRole, setPreparedByRole] = useState("");
  const [approvedAmount, setApprovedAmount] = useState("");
  const [acceptanceDate, setAcceptanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [deliverableRows, setDeliverableRows] = useState<DeliverableRow[]>([]);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  // Fetch existing SAC data (for edit/view)
  const existingSacId = !isNew ? parseInt(sacId!, 10) : undefined;
  const { data: sacData, isLoading: sacLoading } = trpc.procurementPhaseA.sac.getById.useQuery(
    { id: existingSacId! },
    { enabled: !!existingSacId && existingSacId > 0 }
  );

  // Determine contractId
  const contractId = sacData?.contractId || (contractIdParam ? parseInt(contractIdParam, 10) : 0);

  // Fetch contract header info
  const { data: headerData, isLoading: headerLoading } =
    trpc.procurementPhaseA.sac.getContractHeader.useQuery(
      { contractId },
      { enabled: contractId > 0 }
    );

  // Fetch contract deliverables (milestones)
  const { data: milestones } = trpc.procurementPhaseA.sac.getContractDeliverables.useQuery(
    { contractId },
    { enabled: contractId > 0 }
  );

  // Populate form from existing SAC
  useEffect(() => {
    if (sacData && !isNew) {
      setAcceptanceText(sacData.acceptanceText || "");
      setVerifiedBoqs(!!sacData.verifiedBoqs);
      setVerifiedContractTerms(!!sacData.verifiedContractTerms);
      setVerifiedDeliverablesReceived(!!sacData.verifiedDeliverablesReceived);
      setPreparedByName(sacData.preparedByName || sacData.creatorName || "");
      setPreparedByRole(sacData.preparedByRole || "");
      setApprovedAmount(sacData.approvedAmount || "");
      setAcceptanceDate(
        sacData.acceptanceDate
          ? new Date(sacData.acceptanceDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0]
      );

      // Set mode based on status — anything other than draft is read-only
      if (sacData.status !== "draft") {
        setMode("view");
      } else if (modeParam === "view") {
        // Draft SACs opened in view mode — keep view but allow switching to edit
        setMode("view");
      }
    }
  }, [sacData, isNew]);

  // Set default preparedByName for new SACs
  useEffect(() => {
    if (isNew && user?.name && !preparedByName) {
      setPreparedByName(user.name);
    }
  }, [isNew, user?.name]);

  // Initialize deliverable rows from milestones
  useEffect(() => {
    if (!milestones || milestones.length === 0) return;

    // If editing, merge with saved statuses
    const savedStatuses: DeliverableRow[] = sacData?.deliverableStatuses || [];

    const rows: DeliverableRow[] = milestones.map((m: any) => {
      const saved = savedStatuses.find((s: any) => s.milestoneId === m.id);
      return {
        milestoneId: m.id,
        title: m.title || "",
        description: m.description || "",
        amount: m.amount || "",
        dueDate: m.dueDate || "",
        status: saved?.status || "pending",
        notes: saved?.notes || "",
        completionPercent: saved?.completionPercent ?? undefined,
        remainingWork: saved?.remainingWork || "",
      };
    });
    setDeliverableRows(rows);
  }, [milestones, sacData?.deliverableStatuses]);

  // Helpers
  const getStatusLabel = (status: string) => {
    const opt = sacStatusOptions.find((o) => o.value === status);
    return isRTL ? opt?.labelAr || status : opt?.labelEn || status;
  };

  const getDeliverableStatusLabel = (status: string) => {
    const opt = deliverableStatusOptions.find((o) => o.value === status);
    return isRTL ? opt?.labelAr || status : opt?.labelEn || status;
  };

  const statusBadgeColor: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };

  // Mutations
  const utils = trpc.useUtils();

  const createSAC = trpc.procurementPhaseA.sac.create.useMutation({
    onSuccess: (data) => {
      toast.success(t.savedSuccessfully);
      // Navigate to edit mode of the newly created SAC
      setLocation(
        `/organization/logistics/procurement-workspace/sac-form/${data.id}?contractId=${contractId}&prId=${prIdParam || ""}`
      );
    },
    onError: (err) => toast.error(err.message),
  });

  const updateSAC = trpc.procurementPhaseA.sac.update.useMutation({
    onSuccess: () => {
      toast.success(t.savedSuccessfully);
      utils.procurementPhaseA.sac.getById.invalidate({ id: existingSacId! });
    },
    onError: (err) => toast.error(err.message),
  });

  const signAndCompleteSAC = trpc.procurementPhaseA.sac.signAndComplete.useMutation({
    onSuccess: () => {
      toast.success(t.signedSuccessfully);
      utils.procurementPhaseA.sac.getById.invalidate({ id: existingSacId! });
      setMode("view");
    },
    onError: (err) => toast.error(err.message),
  });

  // Build deliverables summary text from rows
  const buildDeliverablesText = () => {
    return deliverableRows
      .filter((r) => ["completed", "achieved", "received", "partial_completed"].includes(r.status))
      .map((r) => {
        let text = r.title;
        if (r.status === "partial_completed" && r.completionPercent != null) {
          text += ` (${r.completionPercent}%)`;
        }
        if (r.notes) text += ` - ${r.notes}`;
        return text;
      })
      .join("; ");
  };

  // Build deliverable statuses for API
  const buildDeliverableStatuses = () => {
    return deliverableRows.map((r) => ({
      milestoneId: r.milestoneId,
      title: r.title,
      status: r.status as any,
      notes: r.notes || undefined,
      completionPercent: r.status === "partial_completed" ? (r.completionPercent ?? 0) : undefined,
      remainingWork: r.status === "partial_completed" ? (r.remainingWork || undefined) : undefined,
    }));
  };

  // Handlers
  const handleSave = () => {
    if (!approvedAmount || parseFloat(approvedAmount) <= 0) {
      toast.error(t.enterApprovedAmount);
      return;
    }

    const deliverableStatuses = buildDeliverableStatuses();
    const deliverables = buildDeliverablesText() || deliverableRows.map((r) => r.title).join("; ");

    if (isNew) {
      createSAC.mutate({
        contractId,
        deliverables,
        approvedAmount,
        currency: headerData?.currency || "USD",
        acceptanceDate: new Date(acceptanceDate),
        acceptanceText: acceptanceText || undefined,
        verifiedBoqs,
        verifiedContractTerms,
        verifiedDeliverablesReceived,
        preparedByName: preparedByName || undefined,
        preparedByRole: preparedByRole || undefined,
        deliverableStatuses,
      });
    } else {
      updateSAC.mutate({
        id: existingSacId!,
        deliverables,
        approvedAmount,
        acceptanceDate: new Date(acceptanceDate),
        acceptanceText: acceptanceText || undefined,
        verifiedBoqs,
        verifiedContractTerms,
        verifiedDeliverablesReceived,
        preparedByName: preparedByName || undefined,
        preparedByRole: preparedByRole || undefined,
        deliverableStatuses,
      });
    }
  };

  const handleSignAndComplete = () => {
    // Full validation before signing
    if (!acceptanceText.trim()) {
      toast.error(t.fillAcceptanceText);
      return;
    }
    if (!verifiedBoqs || !verifiedContractTerms || !verifiedDeliverablesReceived) {
      toast.error(t.checkAllVerifications);
      return;
    }
    if (!approvedAmount || parseFloat(approvedAmount) <= 0) {
      toast.error(t.enterApprovedAmount);
      return;
    }
    const hasCompleted = deliverableRows.some((r) =>
      ["completed", "achieved", "received", "partial_completed"].includes(r.status)
    );
    if (!hasCompleted) {
      toast.error(t.markAtLeastOneDeliverable);
      return;
    }
    if (!signatureDataUrl) {
      toast.error(t.signatureRequiredMsg);
      return;
    }

    const deliverableStatuses = buildDeliverableStatuses();
    const deliverables = buildDeliverablesText() || deliverableRows.map((r) => r.title).join("; ");

    // For new SACs, create first then sign
    if (isNew) {
      createSAC.mutate({
        contractId,
        deliverables,
        approvedAmount,
        currency: headerData?.currency || "USD",
        acceptanceDate: new Date(acceptanceDate),
        acceptanceText: acceptanceText || undefined,
        verifiedBoqs,
        verifiedContractTerms,
        verifiedDeliverablesReceived,
        preparedByName: preparedByName || undefined,
        preparedByRole: preparedByRole || undefined,
        deliverableStatuses,
      }, {
        onSuccess: (data) => {
          // Now sign the newly created SAC
          signAndCompleteSAC.mutate({
            id: data.id,
            signatureDataUrl: signatureDataUrl!,
            acceptanceText,
            verifiedBoqs,
            verifiedContractTerms,
            verifiedDeliverablesReceived,
            preparedByName: preparedByName || undefined,
            preparedByRole: preparedByRole || undefined,
            deliverableStatuses,
            approvedAmount,
            acceptanceDate: new Date(acceptanceDate),
          }, {
            onSuccess: () => {
              toast.success(t.signedSuccessfully);
              // Navigate to the signed SAC in view mode
              setLocation(
                `/organization/logistics/procurement-workspace/sac-form/${data.id}?contractId=${contractId}&prId=${prIdParam || ""}&mode=view`
              );
            },
          });
        },
      });
      return;
    }

    // For existing draft SACs — save form data + sign in one call
    signAndCompleteSAC.mutate({
      id: existingSacId!,
      signatureDataUrl,
      acceptanceText,
      verifiedBoqs,
      verifiedContractTerms,
      verifiedDeliverablesReceived,
      preparedByName: preparedByName || undefined,
      preparedByRole: preparedByRole || undefined,
      deliverableStatuses,
      approvedAmount,
      acceptanceDate: new Date(acceptanceDate),
    });
  };

  const handlePrintPdf = async () => {
    if (!existingSacId) return;

    try {
      setGeneratingPdfId(existingSacId);

      const result = await generatePDF.mutateAsync({
        documentType: "sac",
        documentId: Number(existingSacId),
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

      // Convert Base64 → Blob
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

  // Update deliverable row
  const updateDeliverableRow = (index: number, field: keyof DeliverableRow, value: string | number | undefined) => {
    setDeliverableRows((prev) => {
      const updated = [...prev];
      const newRow = { ...updated[index], [field]: value };
      // If status changed away from partial_completed, clear conditional fields
      if (field === "status" && value !== "partial_completed") {
        newRow.completionPercent = undefined;
        newRow.remainingWork = "";
      }
      updated[index] = newRow;
      return updated;
    });
  };

  // Computed
  const remaining = useMemo(() => {
    if (!headerData) return 0;
    const amt = parseFloat(approvedAmount || "0");
    return headerData.remainingCapacity - amt;
  }, [headerData, approvedAmount]);

  const isSaving = createSAC.isPending || updateSAC.isPending;
  const isSigning = signAndCompleteSAC.isPending;
  const currentStatus = sacData?.status || "draft";
  const isEditable = mode !== "view" && currentStatus === "draft";
  const isSigned = currentStatus === "approved";

  // Back URL
  const backUrl = prIdParam
    ? `/organization/logistics/procurement-workspace/sac/${prIdParam}`
    : `/organization/logistics/procurement-workspace`;

  // Loading
  if (sacLoading || headerLoading) {
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? "rtl" : "ltr"}>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <BackButton onClick={() => setLocation(backUrl)} label={t.backToList} />

          {/* Print/PDF button (always available for existing SACs) */}
          {!isNew && (
            <Button
              variant="outline"
              onClick={handlePrintPdf}
              className="gap-2"
              disabled={generatingPdfId === existingSacId}
            >
              {generatingPdfId === existingSacId ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}

              {generatingPdfId === existingSacId
                ? t.printing
                : t.printPdf}
            </Button>
          )}
        </div>

        {/* Page Title */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-teal-50">
            <FileCheck className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {mode === "create" ? t.createTitle : mode === "edit" ? t.editTitle : t.viewTitle}
            </h1>
            {sacData?.sacNumber && (
              <p className="text-sm text-gray-500 font-mono">{sacData.sacNumber}</p>
            )}
          </div>
          {sacData && (
            <Badge className={`ms-auto ${statusBadgeColor[currentStatus] || statusBadgeColor.draft}`}>
              {getStatusLabel(currentStatus)}
            </Badge>
          )}
        </div>

        {/* ================================================================
            SECTION 1: Header Summary (read-only)
            ================================================================ */}
        {headerData && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4" />
                {t.headerSummary}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">{t.prNumber}</p>
                  <p className="font-medium font-mono" dir="ltr">{headerData.prNumber || "\u2014"}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">{t.contractNumber}</p>
                  <p className="font-medium font-mono" dir="ltr">{headerData.contractNumber || "\u2014"}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">{t.vendor}</p>
                  <p className="font-medium">{headerData.vendorName || "\u2014"}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">{t.project}</p>
                  <p className="font-medium">{headerData.projectTitle || "\u2014"}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">{t.contractStartDate}</p>
                  <p className="font-medium" dir="ltr">
                    {headerData.startDate
                      ? new Date(headerData.startDate).toLocaleDateString(undefined, { timeZone: 'UTC' })
                      : "\u2014"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">{t.contractEndDate}</p>
                  <p className="font-medium" dir="ltr">
                    {headerData.endDate
                      ? new Date(headerData.endDate).toLocaleDateString(undefined, { timeZone: 'UTC' })
                      : "\u2014"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">{t.contractValue}</p>
                  <p className="font-bold" dir="ltr">
                    {headerData.currency} {parseFloat(headerData.contractValue || "0").toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">{t.totalApprovedSac}</p>
                  <p className="font-bold text-green-600" dir="ltr">
                    {headerData.currency} {headerData.totalApprovedSAC.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">{t.remainingCapacity}</p>
                  <p className={`font-bold ${headerData.remainingCapacity > 0 ? "text-blue-600" : "text-red-600"}`} dir="ltr">
                    {headerData.currency} {headerData.remainingCapacity.toLocaleString()}
                  </p>
                </div>
                {sacData && (
                  <div>
                    <p className="text-gray-500 mb-1">{t.sacNumber}</p>
                    <p className="font-medium font-mono" dir="ltr">{sacData.sacNumber}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ================================================================
            SECTION 2: Deliverables (auto-loaded from contract)
            ================================================================ */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {t.deliverablesSection}
            </CardTitle>
            <p className="text-sm text-gray-500">{t.deliverablesDesc}</p>
          </CardHeader>
          <CardContent>
            {deliverableRows.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <AlertCircle className="w-10 h-10 mx-auto mb-2" />
                <p>{t.noDeliverables}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {(() => {
                  const hasAnyPartial = deliverableRows.some((r) => r.status === "partial_completed");
                  return (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10 text-center">#</TableHead>
                          <TableHead className="min-w-[200px]">{t.deliverableTitle}</TableHead>
                          <TableHead className="min-w-[120px] text-end">{t.plannedAmount}</TableHead>
                          <TableHead className="min-w-[100px]">{t.dueDate}</TableHead>
                          <TableHead className="min-w-[140px]">{t.completionStatus}</TableHead>
                          {hasAnyPartial && (
                            <TableHead className="min-w-[90px] text-center">{t.completionPercent}</TableHead>
                          )}
                          {hasAnyPartial && (
                            <TableHead className="min-w-[280px]">{t.remainingWork}</TableHead>
                          )}
                          {!hasAnyPartial && (
                            <TableHead className="min-w-[160px]">{t.notes}</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deliverableRows.map((row, idx) => (
                          <TableRow key={row.milestoneId} className="align-top">
                            <TableCell className="text-gray-500 text-center">{idx + 1}</TableCell>
                            <TableCell>
                              <div className="whitespace-normal break-words">
                                <p className="font-medium text-sm">{row.title}</p>
                                {row.description && (
                                  <p className="text-xs text-gray-400 mt-0.5">{row.description}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-end font-mono" dir="ltr">
                              {row.amount
                                ? `${headerData?.currency || "USD"} ${parseFloat(row.amount).toLocaleString()}`
                                : "\u2014"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {row.dueDate
                                ? new Date(row.dueDate).toLocaleDateString(undefined, { timeZone: 'UTC' })
                                : "\u2014"}
                            </TableCell>
                            <TableCell>
                              {isEditable ? (
                                <Select
                                  value={row.status}
                                  onValueChange={(val) => updateDeliverableRow(idx, "status", val)}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {deliverableStatusOptions.map((opt) => (
                                      <SelectItem key={opt.value} value={opt.value}>
                                        {isRTL ? opt.labelAr : opt.labelEn}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className={
                                    ["completed", "achieved", "received"].includes(row.status)
                                      ? "border-green-300 text-green-700 bg-green-50"
                                      : row.status === "partial_completed"
                                      ? "border-orange-300 text-orange-700 bg-orange-50"
                                      : row.status === "in_progress"
                                      ? "border-blue-300 text-blue-700 bg-blue-50"
                                      : "border-gray-300 text-gray-600"
                                  }
                                >
                                  {getDeliverableStatusLabel(row.status)}
                                </Badge>
                              )}
                            </TableCell>
                            {/* Completion % column - only shown when any row is partial_completed */}
                            {hasAnyPartial && (
                              <TableCell className="text-center">
                                {row.status === "partial_completed" ? (
                                  isEditable ? (
                                    <Input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="1"
                                      className="h-8 text-xs w-20 mx-auto"
                                      value={row.completionPercent ?? ""}
                                      onChange={(e) => {
                                        const val = e.target.value === "" ? undefined : Math.min(100, Math.max(0, parseInt(e.target.value)));
                                        updateDeliverableRow(idx, "completionPercent", val as any);
                                      }}
                                      placeholder="0-100"
                                      dir="ltr"
                                    />
                                  ) : (
                                    <span className="text-sm font-medium" dir="ltr">
                                      {row.completionPercent != null ? `${row.completionPercent}%` : "\u2014"}
                                    </span>
                                  )
                                ) : (
                                  <span className="text-gray-300">\u2014</span>
                                )}
                              </TableCell>
                            )}
                            {/* Remarks / Pending Work column - only shown when any row is partial_completed */}
                            {hasAnyPartial && (
                              <TableCell>
                                {row.status === "partial_completed" ? (
                                  isEditable ? (
                                    <Textarea
                                      className="text-xs min-h-[60px] resize-y whitespace-normal break-words"
                                      value={row.remainingWork || ""}
                                      onChange={(e) => updateDeliverableRow(idx, "remainingWork", e.target.value)}
                                      placeholder={t.remainingWorkPlaceholder}
                                      rows={3}
                                    />
                                  ) : (
                                    <p className="text-sm text-gray-600 whitespace-normal break-words">
                                      {row.remainingWork || "\u2014"}
                                    </p>
                                  )
                                ) : (
                                  <span className="text-gray-300">\u2014</span>
                                )}
                              </TableCell>
                            )}
                            {/* Notes column - hidden when partial completed columns are shown */}
                            {!hasAnyPartial && (
                              <TableCell>
                                {isEditable ? (
                                  <Textarea
                                    className="text-xs min-h-[60px] resize-y whitespace-normal break-words"
                                    value={row.notes}
                                    onChange={(e) => updateDeliverableRow(idx, "notes", e.target.value)}
                                    placeholder={t.notesPlaceholder}
                                    rows={2}
                                  />
                                ) : (
                                  <p className="text-sm text-gray-600 whitespace-normal break-words">{row.notes || "\u2014"}</p>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ================================================================
            SECTION 3: Acceptance Statement
            ================================================================ */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              {t.acceptanceSection}
            </CardTitle>
            <p className="text-sm text-gray-500">{t.acceptanceDesc}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Acceptance Text */}
            <div className="space-y-2">
              <Label>{t.acceptanceText} *</Label>
              {isEditable ? (
                <Textarea
                  value={acceptanceText}
                  onChange={(e) => setAcceptanceText(e.target.value)}
                  placeholder={t.acceptancePlaceholder}
                  rows={4}
                  className="resize-none"
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-md border text-sm min-h-[80px]">
                  {acceptanceText || "\u2014"}
                </div>
              )}
            </div>

            {/* Verification Checkboxes */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="verifiedBoqs"
                  checked={verifiedBoqs}
                  onCheckedChange={(v) => !readOnly && setVerifiedBoqs(!!v)}
                  disabled={readOnly}
                />
                <Label htmlFor="verifiedBoqs" className="cursor-pointer text-sm">
                  {t.verifiedBoqs}
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="verifiedContractTerms"
                  checked={verifiedContractTerms}
                  onCheckedChange={(v) => !readOnly && setVerifiedContractTerms(!!v)}
                  disabled={readOnly}
                />
                <Label htmlFor="verifiedContractTerms" className="cursor-pointer text-sm">
                  {t.verifiedContractTerms}
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="verifiedDeliverablesReceived"
                  checked={verifiedDeliverablesReceived}
                  onCheckedChange={(v) => !readOnly && setVerifiedDeliverablesReceived(!!v)}
                  disabled={readOnly}
                />
                <Label htmlFor="verifiedDeliverablesReceived" className="cursor-pointer text-sm">
                  {t.verifiedDeliverablesReceived}
                </Label>
              </div>
            </div>

            <Separator />

            {/* Prepared By */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t.preparedBy}</Label>
                {isEditable ? (
                  <Input
                    value={preparedByName}
                    onChange={(e) => setPreparedByName(e.target.value)}
                    placeholder={isRTL ? 'أدخل اسم المعدّ' : 'Enter preparer name'}
                  />
                ) : (
                  <Input value={preparedByName || '\u2014'} disabled className="bg-gray-50" />
                )}
              </div>
              <div className="space-y-2">
                <Label>{t.preparedByRole}</Label>
                {isEditable ? (
                  <Input
                    value={preparedByRole}
                    onChange={(e) => setPreparedByRole(e.target.value)}
                    placeholder={t.preparedByRolePlaceholder}
                  />
                ) : (
                  <Input value={preparedByRole || "\u2014"} disabled className="bg-gray-50" />
                )}
              </div>
              <div className="space-y-2">
                <Label>{t.dateOfPreparation}</Label>
                <Input
                  value={sacData?.createdAt ? new Date(sacData.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}
                  disabled
                  className="bg-gray-50"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ================================================================
            SECTION 4: Financial Acceptance
            ================================================================ */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              {t.financialSection}
            </CardTitle>
            <p className="text-sm text-gray-500">{t.financialDesc}</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t.approvedAmount} *</Label>
                {isEditable ? (
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={approvedAmount}
                      onChange={(e) => setApprovedAmount(e.target.value)}
                      className="flex-1"
                      dir="ltr"
                    />
                    <span className="text-sm font-medium text-gray-500 w-12">
                      {headerData?.currency || "USD"}
                    </span>
                  </div>
                ) : (
                  <Input
                    value={`${headerData?.currency || "USD"} ${parseFloat(approvedAmount || "0").toLocaleString()}`}
                    disabled
                    className="bg-gray-50"
                    dir="ltr"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>{t.remainingAfterSac}</Label>
                <Input
                  value={`${headerData?.currency || "USD"} ${remaining.toLocaleString()}`}
                  disabled
                  className={`bg-gray-50 ${remaining < 0 ? "text-red-600 font-bold" : ""}`}
                  dir="ltr"
                />
                {remaining < 0 && (
                  <p className="text-xs text-red-500">{t.amountExceedsRemaining}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t.acceptanceDate} *</Label>
                {isEditable ? (
                  <Input
                    type="date"
                    value={acceptanceDate}
                    onChange={(e) => setAcceptanceDate(e.target.value)}
                    dir="ltr"
                  />
                ) : (
                  <Input
                    value={acceptanceDate ? new Date(acceptanceDate).toLocaleDateString() : "\u2014"}
                    disabled
                    className="bg-gray-50"
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ================================================================
            SECTION 5: Digital Signature (inline — visible for draft/new SACs)
            ================================================================ */}
        {isEditable && (
          <Card className="border-teal-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <PenTool className="w-4 h-4 text-teal-600" />
                {t.signatureSection}
              </CardTitle>
              <p className="text-sm text-gray-500">{t.signatureDesc}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-sm">
                  {t.signatureNote}
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>{t.signatureRequired} *</Label>
                <SignaturePad
                  onSignatureChange={setSignatureDataUrl}
                  labels={{
                    clear: t.clearSignature,
                    undo: t.undoSignature,
                    signHere: t.signHere,
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ================================================================
            SECTION 5b: Signed Signature Display (after signing — read-only)
            ================================================================ */}
        {isSigned && sacData?.signatureImageUrl && (
          <Card className="border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <PenTool className="w-4 h-4 text-green-600" />
                {t.signatureSection}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-gray-500">{t.signedBy}</Label>
                  <p className="font-medium">{sacData.signerName || "\u2014"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-500">{t.signedAt}</Label>
                  <p className="font-medium">
                    {sacData.signedAt ? new Date(sacData.signedAt).toLocaleString() : "\u2014"}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-500">{t.signatureHash}</Label>
                  <p className="font-mono text-xs text-gray-500 break-all">
                    {sacData.signatureHash ? sacData.signatureHash.substring(0, 16) + "..." : "\u2014"}
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-gray-500 mb-2 block">{isRTL ? "التوقيع" : "Signature"}</Label>
                <div className="border rounded-lg p-4 bg-white inline-block">
                  <img
                    src={sacData.signatureImageUrl}
                    alt="Signature"
                    className="max-h-[120px] max-w-[400px]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ================================================================
            SECTION 6: Verification QR Code (after signing)
            ================================================================ */}
        {isSigned && sacData?.signatureHash && (
          <Card className="border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <QrCode className="w-4 h-4 text-green-600" />
                {t.qrSection}
              </CardTitle>
              <p className="text-sm text-gray-500">{t.qrDesc}</p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="border rounded-lg p-3 bg-white">
                  {sacData.verificationCode ? (
                    <QRCodeSVG
                      value={`${window.location.origin}/verify/${sacData.verificationCode}`}
                      size={120}
                      level="M"
                    />
                  ) : (
                    <div className="w-[120px] h-[120px] bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <QrCode className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-green-500" />
                    <span className="font-medium text-green-700">{t.verified}</span>
                  </div>
                  <p>
                    <span className="text-gray-500">{t.signedBy}:</span>{" "}
                    <span className="font-medium">{sacData.signerName || "\u2014"}</span>
                  </p>
                  <p>
                    <span className="text-gray-500">{t.signedAt}:</span>{" "}
                    <span className="font-medium">
                      {sacData.signedAt ? new Date(sacData.signedAt).toLocaleString() : "\u2014"}
                    </span>
                  </p>
                  <p>
                    <span className="text-gray-500">{t.sacNumber}:</span>{" "}
                    <span className="font-mono">{sacData.sacNumber}</span>
                  </p>
                  {sacData.verificationCode && (
                    <p>
                      <span className="text-gray-500">{isRTL ? 'رمز التحقق' : 'Verification Code'}:</span>{" "}
                      <span className="font-mono text-xs">{sacData.verificationCode}</span>
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ================================================================
            ACTION BUTTONS
            ================================================================ */}
        <div className="flex items-center gap-3 pb-8">
          {/* Edit & Sign button for draft SACs viewed in read-only mode */}
          {readOnly && currentStatus === "draft" && !isNew && (
            <Button
              onClick={() => setMode("edit")}
              className="gap-2 bg-teal-600 hover:bg-teal-700 text-white"
            >
              <PenTool className="w-4 h-4" />
              {isRTL ? "تعديل وتوقيع" : "Edit & Sign"}
            </Button>
          )}

          {/* Save Draft (editable only) */}
          {isEditable && (
            <Button onClick={handleSave} disabled={isSaving || isSigning} variant="outline" className="gap-2">
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSaving ? t.saving : t.save}
            </Button>
          )}

          {/* Save & Sign (draft SACs — both new and existing) */}
          {isEditable && (
            <Button
              onClick={handleSignAndComplete}
              disabled={isSigning || isSaving || !signatureDataUrl}
              className="gap-2 bg-teal-600 hover:bg-teal-700 text-white"
            >
              {isSigning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {isSigning ? t.signing : t.saveAndSign}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
