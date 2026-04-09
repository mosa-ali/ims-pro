/**
 * Type 2 Invoice Management Page - Consultancy Procurement
 * Handles: Create, List, Approve/Reject invoices
 * Flow: SAC Approved → Create Invoice → Approve → Payment
 * Validates: Invoice amount cannot exceed total approved SAC amounts
 *
 * Uses inline translations pattern per IMSInlineTranslationsGuideline.md
 */
import { useState, useMemo, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  FileText,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  Loader2,
  Upload,
  X,
  Paperclip,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "@/components/BackButton";

// ============================================================================
// BILINGUAL TRANSLATIONS
// ============================================================================
const translations = {
  en: {
    // Page
    pageTitle: "Invoices",
    back: "Back",
    contractRequired: "Contract Required",
    noContractForInvoice: "No contract found. Create a contract first.",

    // Summary
    approvedSacTotal: "Approved SAC Total",
    totalInvoiced: "Total Invoiced",
    remainingToInvoice: "Remaining to Invoice",
    contractValue: "Contract Value",

    // Invoice List
    invoiceList: "Invoice List",
    invoices: "invoices",
    noInvoices: "No invoices yet",
    createFirstInvoice: "Create an invoice after SAC approval",

    // Table Headers
    invoiceNumber: "Invoice #",
    vendorInvoiceNumber: "Vendor Invoice #",
    amount: "Amount",
    invoiceDate: "Date",
    approvalStatus: "Approval",
    paymentStatus: "Payment",
    actions: "Actions",

    // Approval Status Labels
    statusPending: "Pending",
    statusApproved: "Approved",
    statusRejected: "Rejected",

    // Payment Status Labels
    paymentUnpaid: "Unpaid",
    paymentScheduled: "Payment Scheduled",
    paymentPaid: "Paid",

    // Actions
    createInvoice: "Create Invoice",
    approve: "Approve",
    reject: "Reject",
    cancel: "Cancel",
    create: "Create",
    confirmApprove: "Confirm Approve",
    confirmReject: "Confirm Reject",

    // Create Dialog
    createInvoiceDesc: "Create an invoice against approved SAC amounts",
    vendor: "Vendor",
    vendorInvoicePlaceholder: "e.g., VND-INV-001",
    invoiceAmount: "Invoice Amount",
    maxInvoiceable: "Max invoiceable",
    supplierInvoice: "Supplier Invoice",
    attachment: "Attachment",
    viewAttachment: "View Attachment",
    noAttachment: "No file",
    uploadSupplierInvoice: "Upload Supplier Invoice",
    dragDropFile: "Drag & drop file here or click to browse",
    supportedFormats: "PDF, JPG, PNG (max 10MB)",
    uploading: "Uploading...",
    fileUploaded: "File uploaded",
    removeFile: "Remove",

    // Approval Dialog
    approveInvoice: "Approve Invoice",
    rejectInvoice: "Reject Invoice",
    approveInvoiceDesc: "Confirm approval of this invoice",
    rejectInvoiceDesc: "Provide a reason for rejecting this invoice",
    rejectionReason: "Rejection Reason",
    rejectionReasonPlaceholder: "Explain why this invoice is being rejected...",

    // Messages
    invoiceCreated: "Invoice created successfully",
    invoiceApproved: "Invoice approved",
    invoiceRejected: "Invoice rejected",
    fillAllRequired: "Please fill all required fields",

    // Guard Reasons
    guardContractNotFound: "Contract not found",
    guardContractNotApproved: "Contract must be approved first",
    guardNoApprovedSac: "No approved SAC found. At least one SAC must be approved before creating invoices.",
    guardAllSacInvoiced: "All approved SAC amounts have been fully invoiced",
    guardInvoiceExceedsSacCoverage: "Invoice amount exceeds remaining SAC coverage",
    guardPrNotFound: "Purchase request not found",
    guardNotConsultancyPr: "This is not a consultancy purchase request",
    guardCbaNotFound: "Comparative bid analysis not found",
    guardCbaNotAwarded: "The CBA must be awarded before proceeding",
    guardNoWinnerSelected: "No winner has been selected in the CBA",
    guardContractAlreadyExists: "A contract already exists for this purchase request",
  },
  ar: {
    // Page
    pageTitle: "الفواتير",
    back: "رجوع",
    contractRequired: "العقد مطلوب",
    noContractForInvoice: "لا يوجد عقد. يرجى إنشاء عقد أولاً.",

    // Summary
    approvedSacTotal: "إجمالي شهادات القبول المعتمدة",
    totalInvoiced: "إجمالي المفوتر",
    remainingToInvoice: "المتبقي للفوترة",
    contractValue: "قيمة العقد",

    // Invoice List
    invoiceList: "قائمة الفواتير",
    invoices: "فواتير",
    noInvoices: "لا توجد فواتير بعد",
    createFirstInvoice: "أنشئ فاتورة بعد اعتماد شهادة القبول",

    // Table Headers
    invoiceNumber: "رقم الفاتورة",
    vendorInvoiceNumber: "رقم فاتورة المورد",
    amount: "المبلغ",
    invoiceDate: "التاريخ",
    approvalStatus: "الاعتماد",
    paymentStatus: "الدفع",
    actions: "الإجراءات",

    // Approval Status Labels
    statusPending: "قيد الانتظار",
    statusApproved: "معتمد",
    statusRejected: "مرفوض",

    // Payment Status Labels
    paymentUnpaid: "غير مدفوع",
    paymentScheduled: "الدفع مجدول",
    paymentPaid: "مدفوع",

    // Actions
    createInvoice: "إنشاء فاتورة",
    approve: "موافقة",
    reject: "رفض",
    cancel: "إلغاء",
    create: "إنشاء",
    confirmApprove: "تأكيد الموافقة",
    confirmReject: "تأكيد الرفض",

    // Create Dialog
    createInvoiceDesc: "إنشاء فاتورة مقابل مبالغ شهادات القبول المعتمدة",
    vendor: "المورد",
    vendorInvoicePlaceholder: "مثال: VND-INV-001",
    invoiceAmount: "مبلغ الفاتورة",
    maxInvoiceable: "الحد الأقصى للفوترة",
    supplierInvoice: "فاتورة المورد",
    attachment: "المرفق",
    viewAttachment: "عرض المرفق",
    noAttachment: "لا يوجد ملف",
    uploadSupplierInvoice: "رفع فاتورة المورد",
    dragDropFile: "اسحب وأفلت الملف هنا أو انقر للتصفح",
    supportedFormats: "PDF، JPG، PNG (حد أقصى 10 ميجابايت)",
    uploading: "جاري الرفع...",
    fileUploaded: "تم رفع الملف",
    removeFile: "إزالة",

    // Approval Dialog
    approveInvoice: "اعتماد الفاتورة",
    rejectInvoice: "رفض الفاتورة",
    approveInvoiceDesc: "تأكيد اعتماد هذه الفاتورة",
    rejectInvoiceDesc: "يرجى تقديم سبب رفض هذه الفاتورة",
    rejectionReason: "سبب الرفض",
    rejectionReasonPlaceholder: "اشرح سبب رفض هذه الفاتورة...",

    // Messages
    invoiceCreated: "تم إنشاء الفاتورة بنجاح",
    invoiceApproved: "تم اعتماد الفاتورة",
    invoiceRejected: "تم رفض الفاتورة",
    fillAllRequired: "يرجى ملء جميع الحقول المطلوبة",

    // Guard Reasons
    guardContractNotFound: "العقد غير موجود",
    guardContractNotApproved: "يجب الموافقة على العقد أولاً",
    guardNoApprovedSac: "لا توجد شهادة قبول معتمدة. يجب اعتماد شهادة قبول واحدة على الأقل قبل إنشاء الفواتير.",
    guardAllSacInvoiced: "تم فوترة جميع مبالغ شهادات القبول المعتمدة بالكامل",
    guardInvoiceExceedsSacCoverage: "مبلغ الفاتورة يتجاوز تغطية شهادات القبول المتبقية",
    guardPrNotFound: "طلب الشراء غير موجود",
    guardNotConsultancyPr: "هذا ليس طلب شراء استشاري",
    guardCbaNotFound: "تحليل العروض المقارن غير موجود",
    guardCbaNotAwarded: "يجب ترسية تحليل العروض المقارن قبل المتابعة",
    guardNoWinnerSelected: "لم يتم اختيار فائز في تحليل العروض المقارن",
    guardContractAlreadyExists: "يوجد عقد بالفعل لطلب الشراء هذا",
  },
};

// Approval status options with bilingual labels
const approvalStatusOptions = [
  { value: "pending", labelEn: "Pending", labelAr: "قيد الانتظار" },
  { value: "approved", labelEn: "Approved", labelAr: "معتمد" },
  { value: "rejected", labelEn: "Rejected", labelAr: "مرفوض" },
];

// Payment status options with bilingual labels
const paymentStatusOptions = [
  { value: "unpaid", labelEn: "Unpaid", labelAr: "غير مدفوع" },
  { value: "payment_scheduled", labelEn: "Payment Scheduled", labelAr: "الدفع مجدول" },
  { value: "paid", labelEn: "Paid", labelAr: "مدفوع" },
];

/**
 * Maps backend guard reason keys to translated strings
 */
function translateGuardReason(reason: string | undefined, t: typeof translations.en): string {  if (!reason) return "";
  const reasonMap: Record<string, string> = {
    CONTRACT_NOT_FOUND: t.guardContractNotFound,
    CONTRACT_NOT_APPROVED: t.guardContractNotApproved,
    NO_APPROVED_SAC: t.guardNoApprovedSac,
    ALL_SAC_INVOICED: t.guardAllSacInvoiced,
    INVOICE_EXCEEDS_SAC_COVERAGE: t.guardInvoiceExceedsSacCoverage,
    PR_NOT_FOUND: t.guardPrNotFound,
    NOT_CONSULTANCY_PR: t.guardNotConsultancyPr,
    CBA_NOT_FOUND: t.guardCbaNotFound,
    CBA_NOT_AWARDED: t.guardCbaNotAwarded,
    NO_WINNER_SELECTED: t.guardNoWinnerSelected,
    CONTRACT_ALREADY_EXISTS: t.guardContractAlreadyExists,
  };
  return reasonMap[reason] || reason;
}

export default function Type2InvoiceManagement() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { language, isRTL } = useLanguage();
  const { user } = useAuth();
  const t = translations[language as keyof typeof translations] || translations.en;
  const prId = parseInt(id!, 10);

  // Helper: get translated approval status label
  const getApprovalStatusLabel = (status: string) => {
    const option = approvalStatusOptions.find((o) => o.value === status);
    return isRTL ? option?.labelAr || status : option?.labelEn || status;
  };

  // Helper: get translated payment status label
  const getPaymentStatusLabel = (status: string) => {
    const option = paymentStatusOptions.find((o) => o.value === status);
    return isRTL ? option?.labelAr || status : option?.labelEn || status;
  };

  // Fetch PR data
  const { data: pr, isLoading: prLoading } = trpc.logistics.prWorkspace.getById.useQuery(
    { id: prId },
    { enabled: !!id && prId > 0 }
  );

  // Fetch contract for this PR
  const { data: contract, isLoading: contractLoading } =
    trpc.procurementPhaseA.contracts.getByPR.useQuery(
      { purchaseRequestId: prId },
      { enabled: !!id && prId > 0 }
    );

  // Check if invoice can be created
  const { data: canCreate } = trpc.procurementPhaseA.type2Invoice.canCreate.useQuery(
    { contractId: contract?.id || 0 },
    { enabled: !!contract?.id }
  );

  // Fetch invoice list
  const { data: invoiceList, isLoading: invoiceListLoading, refetch: refetchInvoices } =
    trpc.procurementPhaseA.type2Invoice.listByContract.useQuery(
      { contractId: contract?.id || 0 },
      { enabled: !!contract?.id }
    );

  // Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve");
  const [rejectionReason, setRejectionReason] = useState("");

  // Create form state
  const [vendorInvoiceNumber, setVendorInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [supplierFile, setSupplierFile] = useState<File | null>(null);
  const [supplierFileUrl, setSupplierFileUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadDocument = trpc.procurementPhaseA.type2Invoice.uploadDocument.useMutation();

  // Mutations
  const createInvoice = trpc.procurementPhaseA.type2Invoice.create.useMutation({
    onSuccess: () => {
      toast.success(t.invoiceCreated);
      setShowCreateDialog(false);
      resetForm();
      refetchInvoices();
    },
    onError: (err) => toast.error(err.message),
  });

  const approveInvoice = trpc.procurementPhaseA.type2Invoice.approve.useMutation({
    onSuccess: (data) => {
      toast.success(data.status === "approved" ? t.invoiceApproved : t.invoiceRejected);
      setShowApprovalDialog(false);
      setRejectionReason("");
      refetchInvoices();
    },
    onError: (err) => toast.error(err.message),
  });

  const resetForm = () => {
    setVendorInvoiceNumber("");
    setInvoiceDate(new Date().toISOString().split("T")[0]);
    setInvoiceAmount("");
    setSupplierFile(null);
    setSupplierFileUrl("");
  };

  const handleFileSelect = async (file: File) => {
    if (!contract) return;
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error("File too large. Maximum 10MB.");
      return;
    }
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(file.type)) {
      toast.error("Unsupported file type. Use PDF, JPG, or PNG.");
      return;
    }
    setSupplierFile(file);
    setIsUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]); // strip data:...;base64,
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await uploadDocument.mutateAsync({
        fileName: file.name,
        fileData: base64,
        mimeType: file.type,
        contractId: contract.id,
      });
      setSupplierFileUrl(result.url);
      toast.success(t.fileUploaded);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
      setSupplierFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  // Handlers
  const handleCreate = () => {
    if (!contract) return;
    if (!vendorInvoiceNumber.trim() || !invoiceAmount || !invoiceDate) {
      toast.error(t.fillAllRequired);
      return;
    }
    createInvoice.mutate({
      purchaseRequestId: prId,
      contractId: contract.id,
      vendorId: contract.vendorId,
      vendorInvoiceNumber: vendorInvoiceNumber.trim(),
      invoiceDate: new Date(invoiceDate),
      invoiceAmount: parseFloat(invoiceAmount),
      currency: contract.currency || "USD",
      invoiceDocumentUrl: supplierFileUrl || undefined,
    });
  };

  const handleApproval = () => {
    if (!selectedInvoiceId) return;
    approveInvoice.mutate({
      id: selectedInvoiceId,
      approve: approvalAction === "approve",
      rejectionReason: approvalAction === "reject" ? rejectionReason : undefined,
    });
  };

  // Computed
  const totalInvoiced = useMemo(() => {
    if (!invoiceList) return 0;
    return invoiceList
      .filter((inv: any) => inv.approvalStatus !== "rejected")
      .reduce((sum: number, inv: any) => sum + parseFloat(inv.invoiceAmount || "0"), 0);
  }, [invoiceList]);

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };

  const paymentStatusColor: Record<string, string> = {
    unpaid: "bg-gray-100 text-gray-700",
    payment_scheduled: "bg-blue-100 text-blue-700",
    paid: "bg-green-100 text-green-700",
  };

  // Loading
  if (prLoading || contractLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6" dir={isRTL ? "rtl" : "ltr"}>
        <div className="bg-white rounded-lg border p-12 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t.contractRequired}
          </h2>
          <p className="text-gray-600 mb-6">
            {t.noContractForInvoice}
          </p>
          <Button onClick={() => setLocation(`/organization/logistics/procurement-workspace/${prId}`)}>
            {t.back}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <BackButton onClick={() => setLocation(`/organization/logistics/procurement-workspace/${prId}`)} label={t.back} />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-indigo-50">
                <FileText className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {t.pageTitle}
                </h1>
                <p className="text-sm text-gray-500">
                  {contract.contractNumber} — {pr?.prNumber}
                </p>
              </div>
            </div>
            {canCreate?.allowed && (
              <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                {t.createInvoice}
              </Button>
            )}
          </div>
        </div>

        {/* SAC Coverage Summary */}
        {canCreate?.data && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t.approvedSacTotal}</p>
                  <p className="text-lg font-bold text-green-600">
                    <span dir="ltr">{canCreate.data.currency} {Number(canCreate.data.totalApprovedSAC).toLocaleString()}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t.totalInvoiced}</p>
                  <p className="text-lg font-bold text-blue-600">
                    <span dir="ltr">{canCreate.data.currency} {Number(canCreate.data.totalInvoiced).toLocaleString()}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t.remainingToInvoice}</p>
                  <p className="text-lg font-bold text-orange-600">
                    <span dir="ltr">{canCreate.data.currency} {Number(canCreate.data.remainingToInvoice).toLocaleString()}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t.contractValue}</p>
                  <p className="text-lg font-bold">
                    <span dir="ltr">{canCreate.data.currency} {Number(canCreate.data.contractValue).toLocaleString()}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cannot create alert */}
        {canCreate && !canCreate.allowed && (
          <Alert className="mb-6 border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-700">
              {translateGuardReason(canCreate.reason, t)}
            </AlertDescription>
          </Alert>
        )}

        {/* Invoice List */}
        <Card>
          <CardHeader>
            <CardTitle>{t.invoiceList}</CardTitle>
            <CardDescription>
              {invoiceList?.length || 0} {t.invoices}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invoiceListLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : !invoiceList || invoiceList.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">{t.noInvoices}</p>
                <p className="text-sm mb-4">{t.createFirstInvoice}</p>
                {canCreate?.allowed && (
                  <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    {t.createInvoice}
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.invoiceNumber}</TableHead>
                    <TableHead>{t.vendorInvoiceNumber}</TableHead>
                    <TableHead className="text-end">{t.amount}</TableHead>
                    <TableHead>{t.invoiceDate}</TableHead>
                    <TableHead className="text-center">{t.approvalStatus}</TableHead>
                    <TableHead className="text-center">{t.paymentStatus}</TableHead>
                    <TableHead className="text-center">{t.attachment}</TableHead>
                    <TableHead className="text-center">{t.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoiceList.map((inv: any) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm">{inv.invoiceNumber}</TableCell>
                      <TableCell>{inv.vendorInvoiceNumber}</TableCell>
                      <TableCell className="text-end font-medium">
                        <span dir="ltr">{inv.currency || contract.currency} {Number(inv.invoiceAmount || 0).toLocaleString()}</span>
                      </TableCell>
                      <TableCell>
                        {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={statusColor[inv.approvalStatus] || statusColor.pending}>
                          {getApprovalStatusLabel(inv.approvalStatus || "pending")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={paymentStatusColor[inv.paymentStatus] || paymentStatusColor.unpaid}>
                          {getPaymentStatusLabel(inv.paymentStatus || "unpaid")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {inv.invoiceDocumentUrl ? (
                          <a
                            href={inv.invoiceDocumentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                            title={t.viewAttachment}
                          >
                            <Paperclip className="w-4 h-4" />
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {inv.approvalStatus === "pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedInvoiceId(inv.id);
                                  setApprovalAction("approve");
                                  setShowApprovalDialog(true);
                                }}
                                title={t.approve}
                              >
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedInvoiceId(inv.id);
                                  setApprovalAction("reject");
                                  setShowApprovalDialog(true);
                                }}
                                title={t.reject}
                              >
                                <XCircle className="w-4 h-4 text-red-500" />
                              </Button>
                            </>
                          )}
                          {inv.approvalStatus === "approved" && (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          )}
                          {inv.approvalStatus === "rejected" && (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create Invoice Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                {t.createInvoice}
              </DialogTitle>
              <DialogDescription>
                {t.createInvoiceDesc}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Vendor Info (read-only) */}
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="text-gray-500">{t.vendor}</p>
                <p className="font-medium">{contract.vendorName}</p>
              </div>

              {/* Vendor Invoice Number */}
              <div className="space-y-2">
                <Label>{t.vendorInvoiceNumber} *</Label>
                <Input
                  value={vendorInvoiceNumber}
                  onChange={(e) => setVendorInvoiceNumber(e.target.value)}
                  placeholder={t.vendorInvoicePlaceholder}
                />
              </div>

              {/* Invoice Amount */}
              <div className="space-y-2">
                <Label>{t.invoiceAmount} *</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    step="0.01"
                    value={invoiceAmount}
                    onChange={(e) => setInvoiceAmount(e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium text-gray-500 w-12">{contract.currency}</span>
                </div>
                {canCreate?.data && (
                  <p className="text-xs text-gray-500">
                    {t.maxInvoiceable}: <span dir="ltr">{contract.currency} {Number(canCreate.data.remainingToInvoice).toLocaleString()}</span>
                  </p>
                )}
              </div>

              {/* Invoice Date */}
              <div className="space-y-2">
                <Label>{t.invoiceDate} *</Label>
                <Input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>

              {/* Supplier Invoice Upload */}
              <div className="space-y-2">
                <Label>{t.supplierInvoice}</Label>
                {supplierFile ? (
                  <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <Paperclip className="w-4 h-4 text-green-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-green-800 truncate">{supplierFile.name}</p>
                      <p className="text-xs text-green-600">
                        {isUploading ? t.uploading : `${(supplierFile.size / 1024).toFixed(0)} KB — ${t.fileUploaded}`}
                      </p>
                    </div>
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-green-700 hover:text-red-600 hover:bg-red-50"
                        onClick={() => { setSupplierFile(null); setSupplierFileUrl(""); }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-gray-50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                  >
                    <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">{t.dragDropFile}</p>
                    <p className="text-xs text-gray-400 mt-1">{t.supportedFormats}</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                    e.target.value = ""; // reset for re-select
                  }}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }}>
                {t.cancel}
              </Button>
              <Button onClick={handleCreate} disabled={createInvoice.isPending || isUploading} className="gap-2">
                {createInvoice.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                {t.create}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Approval Dialog */}
        <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {approvalAction === "approve" ? t.approveInvoice : t.rejectInvoice}
              </DialogTitle>
              <DialogDescription>
                {approvalAction === "approve" ? t.approveInvoiceDesc : t.rejectInvoiceDesc}
              </DialogDescription>
            </DialogHeader>

            {approvalAction === "reject" && (
              <div className="space-y-2">
                <Label>{t.rejectionReason}</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder={t.rejectionReasonPlaceholder}
                  rows={3}
                />
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
                {t.cancel}
              </Button>
              <Button
                onClick={handleApproval}
                disabled={approveInvoice.isPending}
                className={approvalAction === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
                variant={approvalAction === "reject" ? "destructive" : "default"}
              >
                {approveInvoice.isPending && <Loader2 className="w-4 h-4 animate-spin me-2" />}
                {approvalAction === "approve" ? t.confirmApprove : t.confirmReject}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
