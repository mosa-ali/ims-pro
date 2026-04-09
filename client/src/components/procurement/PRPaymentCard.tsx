/**
 * PR Payment Card Component
 * 
 * Displays payables for a specific Purchase Request
 * Shows KPI cards and payables table filtered by PR
 * Integrated into PR Workspace → Payment tab
 * Allows recording payment for approved payables
 */

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Loader2, DollarSign, Clock, AlertCircle, CheckCircle, FileText, Trash2, CreditCard, Banknote } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOperatingUnit } from "@/contexts/OperatingUnitContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PRPaymentCardProps {
  prId?: string;
}

export function PRPaymentCard({ prId }: PRPaymentCardProps) {
  const { language, isRTL } = useLanguage();
  const { currentOrganizationId } = useOrganization();
  const { currentOperatingUnitId } = useOperatingUnit();

  const [selectedPayables, setSelectedPayables] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentPayable, setPaymentPayable] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("bank_transfer");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentRemarks, setPaymentRemarks] = useState("");
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  // Fetch all payables
  const { data: payables, isLoading, refetch } = trpc.prFinance.getPayablesList.useQuery({
    status: undefined,
    vendorSearch: undefined,
    dateFrom: undefined,
    dateTo: undefined,
  });

  // Bulk delete mutation
  const bulkDeleteMutation = trpc.prFinance.bulkDeletePayables.useMutation({
    onSuccess: () => {
      toast.success(`${selectedPayables.size} payable(s) deleted successfully`);
      setSelectedPayables(new Set());
      setBulkDeleteDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete payables");
    },
  });

  // Record payment mutation
  const recordPaymentMutation = trpc.prFinance.recordPayment.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message || "Payment recorded successfully");
        setPaymentDialogOpen(false);
        resetPaymentForm();
        refetch();
      } else {
        toast.error(result.message || "Failed to record payment");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to record payment");
    },
  });

  // Filter payables by PR ID
  const prPayables = useMemo(() => {
    if (!payables || !prId) return [];
    return payables.filter(p => p.prNumber === prId);
  }, [payables, prId]);

  // Get deletable payables (only pending_invoice status)
  const deletablePayables = useMemo(() => {
    return prPayables.filter(p => p.status === "pending_invoice");
  }, [prPayables]);

  // Handle checkbox changes
  const handleSelectPayable = (payableId: string) => {
    const newSelected = new Set(selectedPayables);
    if (newSelected.has(payableId)) {
      newSelected.delete(payableId);
    } else {
      newSelected.add(payableId);
    }
    setSelectedPayables(newSelected);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedPayables.size === deletablePayables.length) {
      setSelectedPayables(new Set());
    } else {
      setSelectedPayables(new Set(deletablePayables.map(p => p.id)));
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      await bulkDeleteMutation.mutateAsync({
        payableIds: Array.from(selectedPayables),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Open payment dialog
  const openPaymentDialog = (payable: any) => {
    setPaymentPayable(payable);
    setPaymentMethod("bank_transfer");
    setPaymentRef("");
    setPaymentRemarks("");
    setPaymentDialogOpen(true);
  };

  // Reset payment form
  const resetPaymentForm = () => {
    setPaymentPayable(null);
    setPaymentMethod("bank_transfer");
    setPaymentRef("");
    setPaymentRemarks("");
  };

  // Handle record payment
  const handleRecordPayment = async () => {
    if (!paymentPayable || !paymentRef.trim()) {
      toast.error(isRTL ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill all required fields");
      return;
    }

    if (!currentOrganizationId) {
      toast.error("Organization context not available");
      return;
    }

    setIsRecordingPayment(true);
    try {
      await recordPaymentMutation.mutateAsync({
        payableId: typeof paymentPayable.id === 'string' ? parseInt(paymentPayable.id) : paymentPayable.id,
        paymentDate: new Date(),
        paymentMethod: paymentMethod as "bank_transfer" | "check" | "cash" | "letter_of_credit",
        referenceNumber: paymentRef.trim(),
        amount: parseFloat(paymentPayable.amount || "0"),
        remarks: paymentRemarks.trim() || undefined,
        organizationId: currentOrganizationId,
        operatingUnitId: currentOperatingUnitId ? Number(currentOperatingUnitId) : undefined,
      });
    } finally {
      setIsRecordingPayment(false);
    }
  };

  // Calculate total amount for selected payables
  const selectedTotal = useMemo(() => {
    return Array.from(selectedPayables).reduce((sum, id) => {
      const payable = prPayables.find(p => p.id === id);
      return sum + (payable ? parseFloat(payable.amount || "0") : 0);
    }, 0);
  }, [selectedPayables, prPayables]);

  // Calculate statistics
  const stats = useMemo(() => {
    return {
      total: prPayables.length,
      totalAmount: prPayables.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0),
      pendingInvoice: prPayables.filter(p => p.status === "pending_invoice").length,
      pendingApproval: prPayables.filter(p => p.status === "pending_approval").length,
      approved: prPayables.filter(p => p.status === "approved").length,
      paid: prPayables.filter(p => p.status === "paid").length,
    };
  }, [prPayables]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_invoice":
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />{isRTL ? 'بانتظار الفاتورة' : 'Pending Invoice'}</Badge>;
      case "pending_approval":
        return <Badge variant="outline" className="gap-1"><AlertCircle className="w-3 h-3" />{isRTL ? 'بانتظار الموافقة' : 'Pending Approval'}</Badge>;
      case "approved":
        return <Badge variant="default" className="gap-1 bg-blue-600"><CheckCircle className="w-3 h-3" />{isRTL ? 'معتمد' : 'Approved'}</Badge>;
      case "paid":
        return <Badge className="gap-1 bg-green-600"><CheckCircle className="w-3 h-3" />{isRTL ? 'مدفوع' : 'Paid'}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Get action button for each payable based on status
  const getActionButton = (payable: any) => {
    switch (payable.status) {
      case "pending_invoice":
        return (
          <Button size="sm" variant="outline" className="gap-1" onClick={() => toast.info(isRTL ? "يرجى إنشاء فاتورة أولاً" : "Please create an invoice first")}>
            <FileText className="w-3 h-3" />
            {isRTL ? 'بانتظار الفاتورة' : 'Awaiting Invoice'}
          </Button>
        );
      case "pending_approval":
        return (
          <span className="text-xs text-yellow-600 font-medium">{isRTL ? 'بانتظار الموافقة' : 'Awaiting Approval'}</span>
        );
      case "approved":
        return (
          <Button size="sm" className="gap-1 bg-blue-600 hover:bg-blue-700" onClick={() => openPaymentDialog(payable)}>
            <CreditCard className="w-3 h-3" />
            {isRTL ? 'تسجيل دفعة' : 'Record Payment'}
          </Button>
        );
      case "paid":
        return (
          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            {isRTL ? 'مدفوع' : 'Paid'}
          </span>
        );
      default:
        return <span className="text-xs text-muted-foreground">—</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{isRTL ? 'إجمالي المستحقات' : 'Total Payables'}</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{stats.total} {isRTL ? 'مستحق' : 'payable(s)'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{isRTL ? 'بانتظار الفاتورة' : 'Pending Invoice'}</CardTitle>
            <Clock className="w-4 h-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pendingInvoice}</div>
            <p className="text-xs text-muted-foreground">{isRTL ? 'بانتظار الفاتورة' : 'Awaiting invoice'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{isRTL ? 'بانتظار الموافقة' : 'Pending Approval'}</CardTitle>
            <AlertCircle className="w-4 h-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingApproval}</div>
            <p className="text-xs text-muted-foreground">{isRTL ? 'يحتاج مراجعة' : 'Requires review'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{isRTL ? 'معتمد' : 'Approved'}</CardTitle>
            <CheckCircle className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">{isRTL ? 'جاهز للدفع' : 'Ready for payment'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{isRTL ? 'مدفوع' : 'Paid'}</CardTitle>
            <DollarSign className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
            <p className="text-xs text-muted-foreground">{isRTL ? 'مكتمل' : 'Completed'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Payables Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{isRTL ? 'المستحقات لهذا الطلب' : 'Payables for this PR'}</CardTitle>
              <CardDescription>
                {stats.total} {isRTL ? 'مستحق' : `payable${stats.total !== 1 ? "s" : ""}`} {isRTL ? 'تم العثور عليها' : 'found'}
              </CardDescription>
            </div>
            {selectedPayables.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                className="gap-2"
                onClick={() => setBulkDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4" />
                {isRTL ? `حذف ${selectedPayables.size}` : `Delete ${selectedPayables.size}`}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {prPayables.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedPayables.size === deletablePayables.length && deletablePayables.length > 0}
                      onCheckedChange={handleSelectAll}
                      disabled={deletablePayables.length === 0}
                    />
                  </TableHead>
                  <TableHead>{isRTL ? 'رقم المستحق' : 'Payable ID'}</TableHead>
                  <TableHead>{isRTL ? 'رقم أمر الشراء' : 'PO Number'}</TableHead>
                  <TableHead>{isRTL ? 'رقم GRN' : 'GRN Number'}</TableHead>
                  <TableHead>{isRTL ? 'المورد' : 'Vendor'}</TableHead>
                  <TableHead className="text-end">{isRTL ? 'المبلغ' : 'Amount'}</TableHead>
                  <TableHead>{isRTL ? 'تاريخ الاستحقاق' : 'Due Date'}</TableHead>
                  <TableHead>{isRTL ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead className="text-center">{isRTL ? 'الإجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prPayables.map((payable) => (
                  <TableRow key={payable.id}>
                    <TableCell>
                      {payable.status === "pending_invoice" && (
                        <Checkbox
                          checked={selectedPayables.has(payable.id)}
                          onCheckedChange={() => handleSelectPayable(payable.id)}
                        />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">#{payable.id}</TableCell>
                    <TableCell>{payable.poNumber || "—"}</TableCell>
                    <TableCell>{payable.grnNumber || "—"}</TableCell>
                    <TableCell>{payable.vendorName || "Unknown"}</TableCell>
                    <TableCell className="text-end font-semibold">
                      ${parseFloat(payable.amount || "0").toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {payable.dueDate ? new Date(payable.dueDate).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>{getStatusBadge(payable.status)}</TableCell>
                    <TableCell className="text-center">
                      {getActionButton(payable)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {isRTL ? 'لا توجد مستحقات لهذا الطلب بعد.' : 'No payables for this Purchase Request yet.'}
              <p className="text-sm mt-2">
                {isRTL ? 'سيتم إنشاء المستحقات عند إنشاء الفاتورة.' : 'Payables will be created when invoices are created.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Record Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={(open) => { if (!open) { setPaymentDialogOpen(false); resetPaymentForm(); } }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-blue-600" />
              {isRTL ? 'تسجيل دفعة' : 'Record Payment'}
            </DialogTitle>
            <DialogDescription>
              {isRTL ? 'سجل دفعة لهذا المستحق المعتمد' : 'Record a payment for this approved payable'}
            </DialogDescription>
          </DialogHeader>

          {paymentPayable && (
            <div className="space-y-4">
              {/* Payable Summary */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{isRTL ? 'المورد' : 'Vendor'}</span>
                  <span className="font-medium">{paymentPayable.vendorName || "Unknown"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{isRTL ? 'رقم المستحق' : 'Payable #'}</span>
                  <span className="font-medium">#{paymentPayable.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{isRTL ? 'المبلغ' : 'Amount'}</span>
                  <span className="text-lg font-bold text-blue-600">
                    ${parseFloat(paymentPayable.amount || "0").toLocaleString()} {paymentPayable.currency || "USD"}
                  </span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label>{isRTL ? 'طريقة الدفع' : 'Payment Method'} *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">{isRTL ? 'تحويل بنكي' : 'Bank Transfer'}</SelectItem>
                    <SelectItem value="check">{isRTL ? 'شيك' : 'Cheque'}</SelectItem>
                    <SelectItem value="cash">{isRTL ? 'نقدي' : 'Cash'}</SelectItem>
                    <SelectItem value="letter_of_credit">{isRTL ? 'خطاب اعتماد' : 'Letter of Credit'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reference Number */}
              <div className="space-y-2">
                <Label>{isRTL ? 'رقم المرجع' : 'Reference Number'} *</Label>
                <Input
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder={isRTL ? 'مثال: TRX-2026-001' : 'e.g., TRX-2026-001'}
                />
              </div>

              {/* Remarks */}
              <div className="space-y-2">
                <Label>{isRTL ? 'ملاحظات' : 'Remarks'}</Label>
                <Textarea
                  value={paymentRemarks}
                  onChange={(e) => setPaymentRemarks(e.target.value)}
                  placeholder={isRTL ? 'ملاحظات اختيارية...' : 'Optional remarks...'}
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setPaymentDialogOpen(false); resetPaymentForm(); }} disabled={isRecordingPayment}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              onClick={handleRecordPayment}
              disabled={isRecordingPayment || !paymentRef.trim()}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {isRecordingPayment ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isRTL ? 'جاري التسجيل...' : 'Recording...'}
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  {isRTL ? 'تسجيل الدفعة' : 'Record Payment'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isRTL ? `حذف ${selectedPayables.size} مستحق(ات)؟` : `Delete ${selectedPayables.size} Payable(s)?`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-900 font-medium">{isRTL ? 'لا يمكن التراجع عن هذا الإجراء.' : 'This action cannot be undone.'}</p>
              <p className="text-sm text-red-700 mt-2">
                {isRTL
                  ? `أنت على وشك حذف ${selectedPayables.size} مستحق(ات) بإجمالي $${selectedTotal.toLocaleString()}.`
                  : `You are about to delete ${selectedPayables.size} payable(s) with a total amount of $${selectedTotal.toLocaleString()}.`
                }
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                {isRTL
                  ? 'يمكن حذف المستحقات ذات حالة "بانتظار الفاتورة" فقط. المستحقات المعتمدة والمدفوعة محمية.'
                  : 'Only payables with "Pending Invoice" status can be deleted. Approved and paid payables are protected.'
                }
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)} disabled={isDeleting}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isRTL ? 'جاري الحذف...' : 'Deleting...'}
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  {isRTL ? `حذف ${selectedPayables.size} مستحق(ات)` : `Delete ${selectedPayables.size} Payable(s)`}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
