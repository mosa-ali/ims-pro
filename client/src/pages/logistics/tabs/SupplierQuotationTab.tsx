/**
 * Supplier Quotation Entry Tab — Goods PRs > $25,000
 * Auto-loads one quotation row per bidder from Tender Information.
 * Logistics officer edits each supplier row and adds offer details.
 * No dropdown supplier selector — bidders are auto-populated.
 * Bilingual EN/AR with full RTL support.
 */
import { useTranslation } from "@/i18n/useTranslation";
import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Plus,
  FileText,
  Trash2,
  Edit,
  Eye,
  Upload,
  Paperclip,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileCheck,
  RefreshCw,
  Users,
} from "lucide-react";

interface SupplierQuotationTabProps {
  purchaseRequestId: number;
  prNumber: string;
}

interface LineForm {
  prLineItemId: number;
  itemDescriptionSnapshot: string;
  specificationsSnapshot: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export default function SupplierQuotationTab({
  purchaseRequestId,
  prNumber,
}: SupplierQuotationTabProps) {
  const { language, isRTL } = useLanguage();
  const { t } = useTranslation();
  const sq = t.supplierQuotationTab;

  // ── Data Queries ──
  const { data: prData } = trpc.logistics.purchaseRequests.getById.useQuery(
    { id: purchaseRequestId },
    { enabled: !!purchaseRequestId }
  );

  const {
    data: quotations,
    isLoading,
    refetch,
  } = trpc.logistics.supplierQuotation.listByPR.useQuery(
    { purchaseRequestId },
    { enabled: !!purchaseRequestId }
  );

  // Fetch bidders from bid analysis (for display info)
  const { data: baData } = trpc.logistics.bidAnalysis.getByPurchaseRequestId.useQuery(
    { purchaseRequestId },
    { enabled: !!purchaseRequestId }
  );

  // ── State ──
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedQuotationId, setSelectedQuotationId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [pendingOpenMode, setPendingOpenMode] = useState<"view" | "edit" | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Fetch full quotation by ID (for edit/view — includes lines)
  const { data: fullQuotation } = trpc.logistics.supplierQuotation.getById.useQuery(
    { id: selectedQuotationId! },
    { enabled: !!selectedQuotationId && !!pendingOpenMode }
  );

  // Derive the PR's global currency (exchangeTo field) as the locked currency
  const prCurrency = useMemo(() => (prData as any)?.exchangeTo || 'USD', [prData]);

  // Form state (for the edit/view dialog — one supplier at a time)
  const [currentBidderName, setCurrentBidderName] = useState("");
  const [quotationRef, setQuotationRef] = useState("");
  const [quotationDate, setQuotationDate] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineForm[]>([]);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  // ── Mutations ──
  const initializeMutation = trpc.logistics.supplierQuotation.initializeForBidders.useMutation({
    onSuccess: (data) => {
      if (data.created > 0) {
        toast.success(
          isRTL
            ? `تم إنشاء ${data.created} عرض أسعار تلقائياً من قائمة مقدمي العطاءات`
            : `Auto-created ${data.created} quotation(s) from bidders list`
        );
      }
      if (data.skipped > 0) {
        toast.info(
          isRTL
            ? `تم تخطي ${data.skipped} مقدم عطاء (عرض أسعار موجود بالفعل)`
            : `Skipped ${data.skipped} bidder(s) (quotation already exists)`
        );
      }
      refetch();
      setHasInitialized(true);
    },
    onError: (e: any) => {
      // Don't show error if it's just "no bidders" - that's expected for non-tender PRs
      if (!e.message?.includes("No bidders") && !e.message?.includes("No Bid Analysis")) {
        toast.error(`${sq.error}: ${e.message}`);
      }
      setHasInitialized(true);
    },
  });

  const updateMutation = trpc.logistics.supplierQuotation.update.useMutation({
    onSuccess: () => {
      toast.success(sq.quotationUpdated);
      setDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (e: any) => toast.error(`${sq.error}: ${e.message}`),
  });

  const deleteMutation = trpc.logistics.supplierQuotation.delete.useMutation({
    onSuccess: () => {
      toast.success(sq.quotationDeleted);
      setDeleteDialogOpen(false);
      setSelectedQuotationId(null);
      refetch();
    },
    onError: (e: any) => toast.error(`${sq.error}: ${e.message}`),
  });

  const uploadMutation = trpc.logistics.supplierQuotation.uploadAttachment.useMutation({
    onSuccess: () => {
      toast.success(sq.attachmentUploaded);
      refetch();
    },
    onError: (e: any) => toast.error(`${sq.error}: ${e.message}`),
  });

  // ── Auto-initialize quotations for bidders ──
  const bidders = useMemo(() => {
    return (baData as any)?.bidders || [];
  }, [baData]);

  // Auto-initialize when tab loads and bidders exist but no quotations yet
  useEffect(() => {
    if (
      !hasInitialized &&
      !isLoading &&
      bidders.length > 0 &&
      quotations !== undefined &&
      quotations.length === 0 &&
      !initializeMutation.isPending
    ) {
      initializeMutation.mutate({ purchaseRequestId });
    } else if (!isLoading && quotations !== undefined) {
      setHasInitialized(true);
    }
  }, [isLoading, bidders.length, quotations, hasInitialized]);

  // ── PR line items ──
  const prLineItems = useMemo(() => {
    return (prData as any)?.lineItems || [];
  }, [prData]);

  // ── Helpers ──
  const resetForm = () => {
    setCurrentBidderName("");
    setQuotationRef("");
    setQuotationDate("");
    setCurrency(prCurrency);
    setNotes("");
    setLines([]);
    setAttachmentFile(null);
    setViewMode(false);
    setEditMode(false);
    setSelectedQuotationId(null);
    setPendingOpenMode(null);
  };

  const grandTotal = useMemo(() => {
    return lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  }, [lines]);

  const handleOpenView = (quotation: any) => {
    resetForm();
    setCurrentBidderName(quotation.vendorName || quotation.bidderName || "-");
    setViewMode(true);
    setEditMode(false);
    setSelectedQuotationId(quotation.id);
    setPendingOpenMode("view");
  };

  const handleOpenEdit = (quotation: any) => {
    resetForm();
    setCurrentBidderName(quotation.vendorName || quotation.bidderName || "-");
    setViewMode(false);
    setEditMode(true);
    setSelectedQuotationId(quotation.id);
    setPendingOpenMode("edit");
  };

  const populateForm = (quotation: any) => {
    setQuotationRef(quotation.quotationReference || "");
    setQuotationDate(quotation.quotationDate ? quotation.quotationDate.split("T")[0] : "");
    // Always use the PR's global currency (exchangeTo) — not the stored quotation currency
    setCurrency(prCurrency);
    setNotes(quotation.notes || "");
    if (quotation.lines?.length > 0) {
      setLines(
        quotation.lines.map((l: any) => ({
          prLineItemId: l.prLineItemId,
          itemDescriptionSnapshot: l.itemDescriptionSnapshot,
          specificationsSnapshot: l.specificationsSnapshot || "",
          quantity: parseFloat(l.quantity || "0"),
          unit: l.unit || "Piece",
          unitPrice: parseFloat(l.unitPrice || "0"),
        }))
      );
    } else if (prLineItems.length > 0) {
      // Fallback: load from PR line items
      setLines(
        prLineItems.map((item: any) => ({
          prLineItemId: item.id,
          itemDescriptionSnapshot: isRTL && item.descriptionAr ? item.descriptionAr : item.description,
          specificationsSnapshot: isRTL && item.specificationsAr ? item.specificationsAr : (item.specifications || ""),
          quantity: parseFloat(item.quantity || "0"),
          unit: item.unit || "Piece",
          unitPrice: 0,
        }))
      );
    }
  };

  // Open dialog once full quotation data is available
  useEffect(() => {
    if (fullQuotation && pendingOpenMode) {
      populateForm(fullQuotation);
      setDialogOpen(true);
      setPendingOpenMode(null);
    }
  }, [fullQuotation, pendingOpenMode]);

  const handleSave = (status: "draft" | "submitted") => {
    if (!selectedQuotationId) return;
    updateMutation.mutate({
      id: selectedQuotationId,
      quotationReference: quotationRef || undefined,
      quotationDate: quotationDate || undefined,
      currency,
      notes: notes || undefined,
      status,
      lines: lines.map((l) => ({
        prLineItemId: l.prLineItemId,
        itemDescriptionSnapshot: l.itemDescriptionSnapshot,
        specificationsSnapshot: l.specificationsSnapshot || undefined,
        quantity: l.quantity,
        unit: l.unit || undefined,
        unitPrice: l.unitPrice,
      })),
    });
  };

  const updateLinePrice = (index: number, price: number) => {
    setLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, unitPrice: price } : l))
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; icon: any; label: string }> = {
      draft: { variant: "secondary", icon: Clock, label: sq.statusDraft },
      submitted: { variant: "default", icon: CheckCircle2, label: sq.statusSubmitted },
      under_review: { variant: "outline", icon: Eye, label: sq.statusUnderReview },
      accepted: { variant: "default", icon: CheckCircle2, label: sq.statusAccepted },
      rejected: { variant: "destructive", icon: AlertCircle, label: sq.statusRejected },
    };
    const v = variants[status] || variants.draft;
    const Icon = v.icon;
    return (
      <Badge variant={v.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {v.label}
      </Badge>
    );
  };

  // ── Loading ──
  if (isLoading || initializeMutation.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        {initializeMutation.isPending && (
          <p className="text-center text-sm text-muted-foreground animate-pulse">
            {isRTL ? "جارٍ تحميل عروض الأسعار من قائمة مقدمي العطاءات..." : "Auto-loading quotations from bidders list..."}
          </p>
        )}
      </div>
    );
  }

  const quotationList = quotations || [];

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-primary" />
                {isRTL ? sq.titleAr : sq.title}
              </CardTitle>
              <CardDescription className="mt-1">
                {isRTL
                  ? "يتم تحميل الموردين تلقائياً من قائمة مقدمي العطاءات في معلومات المناقصة"
                  : "Suppliers are auto-loaded from the Bidders List in Tender Information"}
              </CardDescription>
              <p className="text-xs text-muted-foreground mt-1">
                {sq.prNumber}: {prNumber}
                {bidders.length > 0 && (
                  <span className="ms-2">
                    • <Users className="inline h-3 w-3" /> {bidders.length} {isRTL ? "مقدم عطاء" : "bidder(s)"}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Refresh / Re-initialize button */}
              {bidders.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    initializeMutation.mutate({ purchaseRequestId });
                  }}
                  disabled={initializeMutation.isPending}
                  className="gap-1"
                >
                  <RefreshCw className={`h-4 w-4 ${initializeMutation.isPending ? "animate-spin" : ""}`} />
                  {isRTL ? "مزامنة مقدمي العطاءات" : "Sync Bidders"}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Quotation List — One row per bidder/supplier */}
      {quotationList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">{sq.noQuotations}</h3>
            <p className="text-muted-foreground mt-2">
              {bidders.length === 0
                ? (isRTL ? "يرجى إضافة مقدمي العطاءات في صفحة معلومات المناقصة أولاً" : "Please add bidders in Tender Information first")
                : sq.noQuotationsDesc}
            </p>
            {bidders.length > 0 && (
              <Button
                className="mt-4 gap-2"
                onClick={() => initializeMutation.mutate({ purchaseRequestId })}
                disabled={initializeMutation.isPending}
              >
                <Users className="h-4 w-4" />
                {isRTL ? "تحميل عروض الأسعار من مقدمي العطاءات" : "Load Quotations from Bidders"}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{sq.quotationList} ({quotationList.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{sq.vendor}</TableHead>
                  <TableHead>{sq.quotationRef}</TableHead>
                  <TableHead>{sq.quotationDate}</TableHead>
                  <TableHead>{sq.grandTotal}</TableHead>
                  <TableHead>{sq.status}</TableHead>
                  <TableHead>{sq.attachment}</TableHead>
                  <TableHead className="text-center">{t.common.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotationList.map((q: any, idx: number) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium">{idx + 1}</TableCell>
                    <TableCell>
                      {q.vendorName || q.bidderName || "-"}
                      {q.vendorCode && (
                        <span className="text-xs text-muted-foreground ms-1">
                          ({q.vendorCode})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{q.quotationReference || "-"}</TableCell>
                    <TableCell>
                      {q.quotationDate
                        ? new Date(q.quotationDate).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {q.currency || "USD"}{" "}
                      {parseFloat(q.totalAmount || "0").toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell>{getStatusBadge(q.status)}</TableCell>
                    <TableCell>
                      {q.attachmentUrl ? (
                        <a
                          href={q.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline text-sm"
                        >
                          <Paperclip className="h-3 w-3" />
                          {q.attachmentName || "View"}
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenView(q)}
                          title={sq.viewQuotation}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {q.status === "draft" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(q)}
                              title={sq.editQuotation}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedQuotationId(q.id);
                                setDeleteDialogOpen(true);
                              }}
                              title={sq.deleteQuotation}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {!q.attachmentUrl && (
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setAttachmentFile(file);
                                  const reader = new FileReader();
                                  reader.onload = () => {
                                    const base64 = (reader.result as string).split(",")[1];
                                    uploadMutation.mutate({
                                      id: q.id,
                                      fileName: file.name,
                                      fileData: base64,
                                      mimeType: file.type,
                                    });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            <Button variant="ghost" size="icon" asChild title={sq.uploadAttachment}>
                              <span>
                                <Upload className="h-4 w-4" />
                              </span>
                            </Button>
                          </label>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          Edit/View Dialog — Per-Supplier Quotation Details
          ═══════════════════════════════════════════════════════════════════ */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { resetForm(); } setDialogOpen(open); }}>
        <DialogContent
          className="sm:max-w-6xl w-[95vw] max-h-[92vh] overflow-y-auto"
          dir={isRTL ? "rtl" : "ltr"}
        >
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-xl flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              {viewMode ? sq.viewQuotation : sq.editQuotation}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {sq.prNumber}: <span className="font-medium text-foreground">{prNumber}</span>
              {" • "}
              {sq.vendor}: <span className="font-medium text-foreground">{currentBidderName}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* ── Row 1: Supplier Name (read-only) + Quotation Reference ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Supplier Name — auto-loaded, read-only */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">{sq.vendor}</Label>
                <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-muted/30">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{currentBidderName}</span>
                  <Badge variant="outline" className="text-xs ms-auto">
                    {isRTL ? "من قائمة المناقصة" : "From Tender"}
                  </Badge>
                </div>
              </div>

              {/* Quotation Reference */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">{sq.quotationRef}</Label>
                <Input
                  value={quotationRef}
                  onChange={(e) => setQuotationRef(e.target.value)}
                  placeholder="QT-2026-001"
                  disabled={viewMode}
                  className="w-full"
                />
              </div>
            </div>

            {/* ── Row 2: Date + Currency + Attachment ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">{sq.quotationDate}</Label>
                <Input
                  type="date"
                  value={quotationDate}
                  onChange={(e) => setQuotationDate(e.target.value)}
                  disabled={viewMode}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  {sq.currency}
                  <span className="ms-1 text-xs font-normal text-muted-foreground">
                    ({isRTL ? 'من عملة الطلب' : 'from PR'})
                  </span>
                </Label>
                {/* Currency is locked to the PR's global currency (exchangeTo field) */}
                <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-muted/50 text-sm font-medium">
                  <span className="text-foreground">{prCurrency}</span>
                  <span className="text-xs text-muted-foreground ms-auto">
                    {isRTL ? 'مقفل' : 'Locked'}
                  </span>
                </div>
              </div>

              {/* Attachment Upload (in edit mode) */}
              {!viewMode ? (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">{sq.supplierOffer}</Label>
                  <label className="cursor-pointer block">
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                      onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                    />
                    <div className="flex items-center gap-2 border rounded-md px-3 py-2 hover:bg-accent/50 transition-colors">
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground truncate">
                        {attachmentFile ? attachmentFile.name : sq.uploadAttachment}
                      </span>
                    </div>
                  </label>
                </div>
              ) : (
                <div />
              )}
            </div>

            {/* ── Notes ── */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">{sq.notes}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                disabled={viewMode}
                className="resize-none"
              />
            </div>

            {/* ── Item Lines Table ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm font-semibold">
                  {sq.itemLines}
                  <Badge variant="outline" className="text-xs font-normal">
                    {sq.autoLoaded}
                  </Badge>
                </Label>
                <span className="text-xs text-muted-foreground">
                  {lines.length} {lines.length === 1 ? "item" : "items"}
                </span>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-14 text-center">{sq.itemNo}</TableHead>
                        <TableHead className="min-w-[220px]">{sq.item}</TableHead>
                        <TableHead className="min-w-[140px]">{sq.specifications}</TableHead>
                        <TableHead className="w-24 text-center">{sq.qty}</TableHead>
                        <TableHead className="w-24 text-center">{sq.unit}</TableHead>
                        <TableHead className="w-40">{sq.unitPrice}</TableHead>
                        <TableHead className="w-36 text-end">{sq.lineTotal}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((line, idx) => (
                        <TableRow key={idx} className="hover:bg-muted/20">
                          <TableCell className="font-medium text-center text-muted-foreground">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {line.itemDescriptionSnapshot}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {line.specificationsSnapshot || "-"}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {line.quantity}
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {line.unit}
                          </TableCell>
                          <TableCell>
                            {viewMode ? (
                              <span className="font-medium">
                                {line.unitPrice.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            ) : (
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={line.unitPrice || ""}
                                onChange={(e) =>
                                  updateLinePrice(idx, parseFloat(e.target.value) || 0)
                                }
                                placeholder={sq.enterUnitPrice}
                                className="w-full"
                              />
                            )}
                          </TableCell>
                          <TableCell className="text-end font-medium tabular-nums">
                            {(line.quantity * line.unitPrice).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Grand Total Row */}
                      <TableRow className="bg-primary/5 border-t-2 border-primary/20">
                        <TableCell colSpan={6} className="text-end font-bold text-base">
                          {sq.grandTotal}
                        </TableCell>
                        <TableCell className="text-end font-bold text-base tabular-nums">
                          <span className="text-primary">
                            {currency}{" "}
                            {grandTotal.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          {!viewMode && (
            <DialogFooter className="gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>
                {sq.cancel}
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleSave("draft")}
                disabled={updateMutation.isPending}
              >
                {sq.saveDraft}
              </Button>
              <Button
                onClick={() => handleSave("submitted")}
                disabled={updateMutation.isPending}
              >
                {sq.submit}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{sq.confirmDelete}</DialogTitle>
            <DialogDescription>{sq.confirmDeleteMsg}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {sq.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedQuotationId) {
                  deleteMutation.mutate({ id: selectedQuotationId });
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {sq.deleteQuotation}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
