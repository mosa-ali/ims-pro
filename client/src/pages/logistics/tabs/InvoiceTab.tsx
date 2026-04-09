/**
 * Invoice Tab - Embedded in ProcurementWorkspace
 * Manages Type 2 consultancy invoices linked to SACs
 * Features: Create invoice, approval workflow, GL posting trigger
 * Bilingual EN/AR support
 */
import { useTranslation } from '@/i18n/useTranslation';
import { useState, useMemo, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Plus, CheckCircle, XCircle, Clock, Loader2, Send, Receipt, BookOpen, Upload, X, Paperclip, ExternalLink
} from "lucide-react";

interface InvoiceTabProps {
  purchaseRequestId: number;
  prNumber?: string;
}

export default function InvoiceTab({ purchaseRequestId }: InvoiceTabProps) {
  const t = useTranslation();
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  // Fetch contract for this PR (invoices require an approved contract)
  const { data: contract } = trpc.procurementPhaseA.contracts.getByPR.useQuery(
    { purchaseRequestId },
    { enabled: purchaseRequestId > 0 }
  );

  const contractId = contract?.id || 0;
  const contractApproved = contract && (contract.status === "approved" || contract.status === "active");

  // Check if invoices can be created (requires approved SAC coverage)
  const { data: canCreateData } = trpc.procurementPhaseA.type2Invoice.canCreate.useQuery(
    { contractId },
    { enabled: !!contractId && !!contractApproved }
  );

  // Fetch invoices for this contract
  const { data: invoices, isLoading: invoicesLoading, refetch: refetchInvoices } =
    trpc.procurementPhaseA.type2Invoice.listByContract.useQuery(
      { contractId },
      { enabled: !!contractId }
    );

  // Fetch SACs for linking
  const { data: sacs } = trpc.procurementPhaseA.sac.listByPR.useQuery(
    { purchaseRequestId },
    { enabled: purchaseRequestId > 0 }
  );

  // Fetch GL posting events for this PR (all events, not just pending)
  const { data: glEvents, refetch: refetchGLEvents } =
    trpc.procurementPhaseA.glPosting.getAuditTrail.useQuery(
      { purchaseRequestId },
      { enabled: purchaseRequestId > 0 }
    );

  // Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showGLDialog, setShowGLDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Create form state
  const [vendorInvoiceNumber, setVendorInvoiceNumber] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [linkedSacId, setLinkedSacId] = useState("");
  const [invoiceDocUrl, setInvoiceDocUrl] = useState("");
  const [supplierFile, setSupplierFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadDocument = trpc.procurementPhaseA.type2Invoice.uploadDocument.useMutation();

  // GL posting form state
  const [glDescription, setGLDescription] = useState("");
  const [glAccount, setGLAccount] = useState("");
  const [glAmount, setGLAmount] = useState("");
  const [glFiscalPeriod, setGLFiscalPeriod] = useState("");
  const [glEntityType, setGLEntityType] = useState<string>("invoice");
  const [glEntityId, setGLEntityId] = useState<number>(0);
  const [glEventType, setGLEventType] = useState<string>("payment");

  // Mutations
  const createInvoice = trpc.procurementPhaseA.type2Invoice.create.useMutation({
    onSuccess: () => {
      toast.success(t.procurement.invoiceCreated || "Invoice created successfully");
      setShowCreateDialog(false);
      resetCreateForm();
      refetchInvoices();
    },
    onError: (err) => toast.error(err.message),
  });

  const approveInvoice = trpc.procurementPhaseA.type2Invoice.approve.useMutation({
    onSuccess: (data) => {
      toast.success(
        data.status === "approved"
          ? (t.procurement.invoiceApproved || "Invoice approved")
          : (t.procurement.invoiceRejected || "Invoice rejected")
      );
      setShowApprovalDialog(false);
      setRejectionReason("");
      refetchInvoices();
    },
    onError: (err) => toast.error(err.message),
  });

  const createGLPosting = trpc.procurementPhaseA.glPosting.create.useMutation({
    onSuccess: () => {
      toast.success(t.procurement.glPostingCreated || "GL posting event recorded");
      setShowGLDialog(false);
      resetGLForm();
      refetchGLEvents();
    },
    onError: (err) => toast.error(err.message),
  });

  const resetCreateForm = () => {
    setVendorInvoiceNumber("");
    setInvoiceAmount("");
    setInvoiceDate("");
    setLinkedSacId("");
    setInvoiceDocUrl("");
    setSupplierFile(null);
  };

  const handleFileSelect = async (file: File) => {
    const maxSize = 10 * 1024 * 1024;
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
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await uploadDocument.mutateAsync({
        fileName: file.name,
        fileData: base64,
        mimeType: file.type,
        contractId,
      });
      setInvoiceDocUrl(result.url);
      toast.success("File uploaded");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
      setSupplierFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const resetGLForm = () => {
    setGLDescription("");
    setGLAccount("");
    setGLAmount("");
    setGLFiscalPeriod("");
    setGLEntityType("invoice");
    setGLEntityId(0);
    setGLEventType("payment");
  };

  const handleCreate = () => {
    if (!vendorInvoiceNumber.trim() || !invoiceAmount || !invoiceDate) {
      toast.error("Please fill all required fields");
      return;
    }
    const amt = parseFloat(invoiceAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Invalid amount");
      return;
    }
    createInvoice.mutate({
      purchaseRequestId,
      contractId,
      vendorId: contract?.vendorId || 0,
      vendorInvoiceNumber: vendorInvoiceNumber.trim(),
      invoiceAmount: amt,
      currency: contract?.currency || "USD",
      invoiceDate: new Date(invoiceDate),
      sacId: linkedSacId && linkedSacId !== "none" ? parseInt(linkedSacId, 10) : undefined,
      invoiceDocumentUrl: invoiceDocUrl || undefined,
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

  const handleGLPosting = () => {
    if (!glAccount.trim() || !glAmount || !glFiscalPeriod.trim() || !glEntityId) {
      toast.error("Please fill all required fields");
      return;
    }
    createGLPosting.mutate({
      purchaseRequestId,
      entityType: glEntityType as any,
      entityId: glEntityId,
      eventType: glEventType as any,
      glAccount: glAccount.trim(),
      amount: glAmount,
      currency: contract?.currency || "USD",
      fiscalPeriod: glFiscalPeriod.trim(),
      description: glDescription || undefined,
    });
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700",
      approved: "bg-green-100 text-green-700",
      paid: "bg-purple-100 text-purple-700",
      rejected: "bg-red-100 text-red-700",
    };
    return <Badge className={colors[status] || "bg-gray-100"}>{status.replace("_", " ")}</Badge>;
  };

  const approvedSacs = useMemo(() => (sacs || []).filter((s: any) => s.status === "approved"), [sacs]);
  const invoiceCurrency = contract?.currency || "USD";

  if (invoicesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Invoice Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{t.procurement.invoiceTitle}</CardTitle>
              <CardDescription>
                {(invoices || []).length} {isRTL ? "فواتير" : "invoices"}
                {canCreateData?.data && (
                  <span className="ms-2 text-xs">
                    ({isRTL ? "متبقي" : "Remaining"}: {invoiceCurrency} {Number(canCreateData.data.remainingToInvoice || 0).toLocaleString()})
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {canCreateData?.allowed && (
                <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-1">
                  <Plus className="w-4 h-4" /> {t.procurement.createInvoice}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => { resetGLForm(); setShowGLDialog(true); }} className="gap-1">
                <BookOpen className="w-4 h-4" /> {t.procurement.glPosting || "GL Posting"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!contractApproved && (
            <div className="text-center py-6 text-yellow-600 bg-yellow-50 rounded-lg mb-4">
              <Clock className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
              <p className="text-sm">{t.procurement.guardContractNotApproved}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice List */}
      {(invoices || []).length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-gray-500">
              <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium">{t.procurement.invoiceNotCreated}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(invoices || []).map((inv: any) => (
            <Card key={inv.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{inv.invoiceNumber || inv.vendorInvoiceNumber}</p>
                      <p className="text-xs text-gray-500">
                        {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : ""}
                        {inv.vendorInvoiceNumber && ` — Vendor: ${inv.vendorInvoiceNumber}`}
                      </p>
                      {inv.invoiceDocumentUrl && (
                        <a
                          href={inv.invoiceDocumentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs mt-0.5"
                        >
                          <Paperclip className="w-3 h-3" />
                          <span>{isRTL ? 'عرض المرفق' : 'View Attachment'}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold">{inv.currency || invoiceCurrency} {Number(inv.invoiceAmount || 0).toLocaleString()}</span>
                    {statusBadge(inv.approvalStatus || "pending")}
                    <div className="flex gap-1">
                      {inv.approvalStatus === "pending" && (
                        <>
                          <Button size="sm" className="gap-1 h-7 text-xs bg-green-600 hover:bg-green-700"
                            onClick={() => { setSelectedInvoiceId(inv.id); setApprovalAction("approve"); setShowApprovalDialog(true); }}>
                            <CheckCircle className="w-3 h-3" /> {t.procurement.approve}
                          </Button>
                          <Button size="sm" variant="destructive" className="gap-1 h-7 text-xs"
                            onClick={() => { setSelectedInvoiceId(inv.id); setApprovalAction("reject"); setShowApprovalDialog(true); }}>
                            <XCircle className="w-3 h-3" /> {t.procurement.reject}
                          </Button>
                        </>
                      )}
                      {inv.approvalStatus === "approved" && (
                        <Button size="sm" variant="outline" className="gap-1 h-7 text-xs"
                          onClick={() => {
                            setGLEntityType("invoice");
                            setGLEntityId(inv.id);
                            setGLAmount(String(inv.invoiceAmount || ""));
                            setGLEventType("payment");
                            setShowGLDialog(true);
                          }}>
                          <BookOpen className="w-3 h-3" /> {t.procurement.glPost || "GL Post"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* GL Posting Events */}
      {(glEvents || []).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t.procurement.glPostingEvents || "GL Posting Events"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(glEvents || []).map((ev: any) => (
                <div key={ev.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="font-medium">{ev.description || ev.eventType}</p>
                      <p className="text-xs text-gray-500">
                        {ev.entityType} #{ev.entityId} | {t.procurement.glAccount || "Account"}: {ev.glAccount} | {ev.fiscalPeriod}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{ev.currency} {Number(ev.amount || 0).toLocaleString()}</span>
                    <Badge className={ev.postingStatus === "posted" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>
                      {ev.postingStatus}
                    </Badge>
                    <span className="text-xs text-gray-400">{ev.createdAt ? new Date(ev.createdAt).toLocaleDateString() : ""}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Invoice Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.procurement.createInvoice}</DialogTitle>
            <DialogDescription>{t.procurement.createInvoiceDesc || "Create a new consultancy invoice linked to this contract"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.procurement.vendorInvoiceNumber || "Vendor Invoice Number"} *</Label>
              <Input value={vendorInvoiceNumber} onChange={(e) => setVendorInvoiceNumber(e.target.value)} placeholder="VINV-2026-001" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.procurement.invoiceAmount} *</Label>
                <Input type="number" step="0.01" value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t.procurement.invoiceDate} *</Label>
                <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
              </div>
            </div>
            {approvedSacs.length > 0 && (
              <div className="space-y-2">
                <Label>{t.procurement.linkToSac || "Link to SAC"}</Label>
                <Select value={linkedSacId} onValueChange={setLinkedSacId}>
                  <SelectTrigger><SelectValue placeholder={t.procurement.selectSac || "Select SAC"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t.procurement.noSac || "None"}</SelectItem>
                    {approvedSacs.map((s: any) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.sacNumber || `SAC #${s.id}`} — {invoiceCurrency} {Number(s.approvedAmount || 0).toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* Supplier Invoice Upload */}
            <div className="space-y-2">
              <Label>{t.procurement.supplierInvoice || "Supplier Invoice"}</Label>
              {supplierFile ? (
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <Paperclip className="w-4 h-4 text-green-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-800 truncate">{supplierFile.name}</p>
                    <p className="text-xs text-green-600">
                      {isUploading ? "Uploading..." : `${(supplierFile.size / 1024).toFixed(0)} KB — Uploaded`}
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
                      onClick={() => { setSupplierFile(null); setInvoiceDocUrl(""); }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-5 text-center cursor-pointer hover:border-primary hover:bg-gray-50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                >
                  <Upload className="w-7 h-7 mx-auto text-gray-400 mb-1" />
                  <p className="text-sm text-gray-600">Drag & drop or click to browse</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG (max 10MB)</p>
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
                  e.target.value = "";
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>{t.procurement.cancel}</Button>
            <Button onClick={handleCreate} disabled={createInvoice.isPending || isUploading} className="gap-2">
              {createInvoice.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {t.procurement.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GL Posting Dialog */}
      <Dialog open={showGLDialog} onOpenChange={setShowGLDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.procurement.recordGlPosting || "Record GL Posting Event"}</DialogTitle>
            <DialogDescription>{t.procurement.recordGlPostingDesc || "Create a general ledger posting entry for this procurement"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.procurement.entityType || "Entity Type"} *</Label>
                <Select value={glEntityType} onValueChange={setGLEntityType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contract">{isRTL ? 'العقد' : 'Contract'}</SelectItem>
                    <SelectItem value="sac">SAC</SelectItem>
                    <SelectItem value="invoice">{isRTL ? 'الفاتورة' : 'Invoice'}</SelectItem>
                    <SelectItem value="payment">{isRTL ? 'الدفع' : 'Payment'}</SelectItem>
                    <SelectItem value="retention">Retention</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t.procurement.eventType || "Event Type"} *</Label>
                <Select value={glEventType} onValueChange={setGLEventType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approval">{isRTL ? 'الموافقة' : 'Approval'}</SelectItem>
                    <SelectItem value="rejection">Rejection</SelectItem>
                    <SelectItem value="payment">{isRTL ? 'الدفع' : 'Payment'}</SelectItem>
                    <SelectItem value="retention_hold">{isRTL ? 'حجز الضمان' : 'Retention Hold'}</SelectItem>
                    <SelectItem value="retention_release">{isRTL ? 'إفراج الضمان' : 'Retention Release'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.procurement.entityId || "Entity ID"} *</Label>
              <Input type="number" value={glEntityId || ""} onChange={(e) => setGLEntityId(parseInt(e.target.value) || 0)} placeholder="ID of the entity" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.procurement.glAccount || "GL Account"} *</Label>
                <Input value={glAccount} onChange={(e) => setGLAccount(e.target.value)} placeholder="5200" />
              </div>
              <div className="space-y-2">
                <Label>{t.procurement.fiscalPeriod || "Fiscal Period"} *</Label>
                <Input value={glFiscalPeriod} onChange={(e) => setGLFiscalPeriod(e.target.value)} placeholder="2026-Q1" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.procurement.amount || "Amount"} *</Label>
              <Input type="number" step="0.01" value={glAmount} onChange={(e) => setGLAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t.procurement.description || "Description"}</Label>
              <Input value={glDescription} onChange={(e) => setGLDescription(e.target.value)} placeholder="Payment for consultancy services" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGLDialog(false)}>{t.procurement.cancel}</Button>
            <Button onClick={handleGLPosting} disabled={createGLPosting.isPending} className="gap-2">
              {createGLPosting.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {t.procurement.recordGlEvent || "Record GL Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === "approve" ? (t.procurement.approveInvoice || "Approve Invoice") : (t.procurement.rejectInvoice || "Reject Invoice")}
            </DialogTitle>
            <DialogDescription>
              {approvalAction === "approve"
                ? (t.procurement.approveInvoiceDesc || "Confirm approval of this invoice")
                : (t.procurement.rejectInvoiceDesc || "Provide a reason for rejecting this invoice")}
            </DialogDescription>
          </DialogHeader>
          {approvalAction === "reject" && (
            <div className="space-y-2">
              <Label>{t.procurement.rejectionReason}</Label>
              <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t.procurement.rejectionReasonPlaceholder} rows={3} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>{t.procurement.cancel}</Button>
            <Button
              onClick={handleApproval}
              disabled={approveInvoice.isPending}
              className={approvalAction === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
              variant={approvalAction === "reject" ? "destructive" : "default"}
            >
              {approveInvoice.isPending && <Loader2 className="w-4 h-4 animate-spin me-2" />}
              {approvalAction === "approve" ? t.procurement.confirmApprove : t.procurement.confirmReject}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
