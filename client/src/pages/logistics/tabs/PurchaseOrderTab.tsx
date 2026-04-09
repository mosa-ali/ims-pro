/**
 * Purchase Order Tab - Manage POs linked to a PR
 * Embedded within ProcurementWorkspace (inline tab, like GRN)
 * Handles PO generation internally with QA/BA source detection
 * Bilingual EN/AR support
 */
import { useTranslation } from '@/i18n/useTranslation';
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Printer, ShoppingCart, Eye, Trash2, Loader2, RefreshCw } from "lucide-react";
import { useNavigate } from "@/lib/router-compat";
import { toast } from "sonner";
import { format } from "date-fns";
import { useState } from "react";

interface PurchaseOrderTabProps {
  purchaseRequestId: number;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-500",
  issued: "bg-blue-500",
  acknowledged: "bg-yellow-500",
  partially_delivered: "bg-orange-500",
  delivered: "bg-green-500",
  completed: "bg-emerald-600",
  cancelled: "bg-red-500",
};

export default function PurchaseOrderTab({ purchaseRequestId }: PurchaseOrderTabProps) {
  const { isRTL } = useLanguage();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showDialog, setShowDialog] = useState(false);
  const [poForm, setPOForm] = useState({ deliveryDate: "", deliveryLocation: "", paymentTerms: "", notes: "" });

  // Fetch PO list
  const { data: poList, isLoading, refetch } = trpc.logistics.po.listByPR.useQuery(
    { purchaseRequestId },
    { enabled: !!purchaseRequestId }
  );

  // Fetch PR data to determine if single-quotation (Goods/Works ≤ $1,000)
  const { data: prData } = trpc.logistics.prWorkspace.getById.useQuery(
    { id: purchaseRequestId },
    { enabled: !!purchaseRequestId }
  );

  // Fetch RFQ data for single-quotation unlock
  const { data: rfqData } = trpc.logistics.rfq.getByPR.useQuery(
    { purchaseRequestId },
    { enabled: !!purchaseRequestId }
  );

  // Fetch QA and BA data to determine source for PO generation
  const { data: qaData } = trpc.logistics.quotationAnalysis.getByPurchaseRequestId.useQuery(
    { purchaseRequestId },
    { enabled: !!purchaseRequestId }
  );
  const { data: baData } = trpc.logistics.bidAnalysis.getByPurchaseRequestId.useQuery(
    { purchaseRequestId },
    { enabled: !!purchaseRequestId }
  );

  const qaApproved = (qaData as any)?.status === "approved";
  const baAwarded = (baData as any)?.status === "awarded";

  // Single-quotation unlock: Goods/Works PRs ≤ $1,000 unlock PO when RFQ is received (no QA needed)
  const totalUSD = parseFloat(String((prData as any)?.prTotalUSD || (prData as any)?.prTotalUsd || (prData as any)?.totalAmount || '0'));
  const isGoodsOrWorks = (prData as any)?.category !== 'services';
  const isSingleQuotation = totalUSD <= 1000 && isGoodsOrWorks;
  const rfqReceived = (rfqData as any)?.status === 'received' && ((rfqData as any)?.suppliers?.length ?? 0) > 0;
  const singleQuotationReady = isSingleQuotation && rfqReceived;

  // First supplier from RFQ for single-quotation PO creation
  const firstRFQSupplierId = (rfqData as any)?.suppliers?.[0]?.supplierId;

  const canGenerate = qaApproved || baAwarded || singleQuotationReady;

  // Mutations for PO generation
  const generateFromQA = trpc.logistics.po.createFromQA.useMutation({
    onSuccess: (data) => {
      toast.success(`PO ${data.poNumber} ${isRTL ? 'تم إنشاؤه بنجاح' : 'created successfully'}`);
      setShowDialog(false);
      setPOForm({ deliveryDate: "", deliveryLocation: "", paymentTerms: "", notes: "" });
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const generateFromBA = trpc.logistics.po.createFromBA.useMutation({
    onSuccess: (data) => {
      toast.success(`PO ${data.poNumber} ${isRTL ? 'تم إنشاؤه بنجاح' : 'created successfully'}`);
      setShowDialog(false);
      setPOForm({ deliveryDate: "", deliveryLocation: "", paymentTerms: "", notes: "" });
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const generateFromPR = trpc.logistics.po.createFromPR.useMutation({
    onSuccess: (data) => {
      toast.success(`PO ${data.poNumber} ${isRTL ? 'تم إنشاؤه بنجاح' : 'created successfully'}`);
      setShowDialog(false);
      setPOForm({ deliveryDate: "", deliveryLocation: "", paymentTerms: "", notes: "" });
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const isGenerating = generateFromQA.isPending || generateFromBA.isPending || generateFromPR.isPending;

  const handleGenerate = () => {
    if (!poForm.deliveryDate || !poForm.deliveryLocation) {
      toast.error(isRTL ? "تاريخ وموقع التسليم مطلوبان" : "Delivery date and location are required");
      return;
    }
    if (qaApproved && (qaData as any)?.id) {
      generateFromQA.mutate({
        quotationAnalysisId: (qaData as any).id,
        deliveryDate: poForm.deliveryDate || undefined,
        deliveryLocation: poForm.deliveryLocation || undefined,
        paymentTerms: poForm.paymentTerms || undefined,
        notes: poForm.notes || undefined,
      });
    } else if (baAwarded && (baData as any)?.id) {
      generateFromBA.mutate({
        purchaseRequestId,
        bidAnalysisId: (baData as any).id,
        deliveryDate: poForm.deliveryDate,
        deliveryLocation: poForm.deliveryLocation,
        paymentTerms: poForm.paymentTerms || undefined,
        notes: poForm.notes || undefined,
      });
    } else if (singleQuotationReady && firstRFQSupplierId) {
      // Single-quotation path: Goods/Works ≤ $1,000 with received RFQ
      generateFromPR.mutate({
        purchaseRequestId,
        supplierId: firstRFQSupplierId,
        deliveryDate: new Date(poForm.deliveryDate),
        deliveryLocation: poForm.deliveryLocation,
        paymentTerms: poForm.paymentTerms || undefined,
        notes: poForm.notes || undefined,
      });
    } else {
      toast.error(isRTL ? "لا يوجد مصدر معتمد لإنشاء أمر الشراء" : "No approved source found for PO generation");
    }
  };

  const deleteMutation = trpc.logistics.po.delete.useMutation({
    onSuccess: () => {
      toast.success(t.purchaseOrderTab?.success || "Purchase order deleted");
      refetch();
    },
    onError: (error: any) => toast.error(error.message),
  });

  const handleDelete = (id: number) => {
    if (confirm(t.logistics?.areYouSureYouWantTo1 || "Are you sure you want to delete this purchase order?")) {
      deleteMutation.mutate({ id });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const items = poList || [];

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t.purchaseOrderTab?.title || "Purchase Orders"}</h3>
          <p className="text-sm text-muted-foreground">
            {t.purchaseOrderTab?.subtitle || "Manage purchase orders linked to this PR"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            title={isRTL ? 'تحديث' : 'Refresh'}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {canGenerate && (
            <Button className="gap-2" onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4" />
              {isRTL ? 'إنشاء أمر شراء' : 'Generate PO'}
            </Button>
          )}
        </div>
      </div>

      {/* Not ready state */}
      {!canGenerate && items.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="h-12 w-12 text-yellow-400 mb-4" />
            <h4 className="text-lg font-medium text-gray-600">
              {isRTL ? 'أمر الشراء مقفل' : 'PO Generation Locked'}
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              {isSingleQuotation
                ? (isRTL ? 'يجب استلام عرض الأسعار أولاً' : 'RFQ must be received first')
                : (isRTL ? 'يجب اعتماد تحليل العروض أولاً' : 'Quotation/Bid Analysis must be approved first')
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty state with generate button */}
      {canGenerate && items.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="h-12 w-12 text-gray-400 mb-4" />
            <h4 className="text-lg font-medium text-gray-600">
              {t.purchaseOrderTab?.noPO || "No purchase orders created yet"}
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              {t.purchaseOrderTab?.createFirst || "Create a purchase order from the approved PR"}
            </p>
            <Button className="gap-2 mt-4" onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4" />
              {isRTL ? 'إنشاء أمر شراء' : 'Generate PO'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* PO List */}
      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((po: any) => (
            <Card key={po.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">{po.poNumber || `PO-${po.id}`}</div>
                      <div className="text-sm text-muted-foreground">
                        {po.supplierName || t.purchaseOrderTab?.supplier || "Supplier"}
                      </div>
                      <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                        {po.totalAmount && (
                          <span className="font-medium text-foreground">
                            {po.currency || "USD"} {parseFloat(po.totalAmount).toLocaleString()}
                          </span>
                        )}
                        {po.issueDate && (
                          <span>{isRTL ? 'تاريخ الإصدار' : 'Issued'}: {format(new Date(po.issueDate), "yyyy-MM-dd")}</span>
                        )}
                        {po.deliveryDate && (
                          <span>{isRTL ? 'تاريخ التسليم' : 'Delivery'}: {format(new Date(po.deliveryDate), "yyyy-MM-dd")}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${statusColors[po.status || "draft"]} text-white`}>
                      {po.status || "draft"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/organization/logistics/purchase-orders/${po.id}`)}
                      title={isRTL ? 'عرض' : 'View'}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/organization/logistics/purchase-orders/${po.id}/print`)}
                      title={isRTL ? 'طباعة' : 'Print'}
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                    {(po.status === "draft") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(po.id)}
                        title={isRTL ? 'حذف' : 'Delete'}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Generate PO Dialog (embedded, like GRN handles creation internally) */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              {isRTL ? 'إنشاء أمر شراء' : 'Create New Purchase Order'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>{isRTL ? 'المصدر:' : 'Source:'}</strong>{' '}
                {singleQuotationReady
                  ? (isRTL ? 'طلب عروض أسعار (RFQ) - عرض وحيد' : 'Single Quotation (RFQ)')
                  : qaApproved ? (isRTL ? 'تحليل العروض (QA)' : 'Quotation Analysis')
                  : (isRTL ? 'تحليل المناقصة (BA)' : 'Bid Analysis')
                }
              </p>
              <p className="text-sm text-blue-700 mt-1">
                {singleQuotationReady
                  ? (isRTL ? 'سيتم إنشاء أمر الشراء من المورد المدرج في طلب العروض' : 'PO will be generated from the supplier in the received RFQ.')
                  : isRTL
                    ? `سيتم إنشاء أمر الشراء تلقائياً من ${qaApproved ? 'المورد المختار في تحليل العروض' : 'المناقص الفائز في تحليل المناقصة'}`
                    : `PO will be auto-generated from the selected ${qaApproved ? 'supplier in the QA' : 'bidder in the BA'} evaluation.`
                }
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="po-delivery-date">{isRTL ? 'تاريخ التسليم *' : 'Delivery Date *'}</Label>
              <Input
                id="po-delivery-date"
                type="date"
                value={poForm.deliveryDate}
                onChange={(e) => setPOForm({ ...poForm, deliveryDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="po-delivery-location">{isRTL ? 'موقع التسليم *' : 'Delivery Location *'}</Label>
              <Input
                id="po-delivery-location"
                placeholder={isRTL ? 'مثال: المكتب الرئيسي، المستودع، عدن' : 'e.g. Main Office, Warehouse, Aden'}
                value={poForm.deliveryLocation}
                onChange={(e) => setPOForm({ ...poForm, deliveryLocation: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="po-payment-terms">{isRTL ? 'شروط الدفع' : 'Payment Terms'}</Label>
              <Input
                id="po-payment-terms"
                placeholder={isRTL ? 'مثال: 30 يوم بعد التسليم' : 'e.g. Net 30 days after delivery'}
                value={poForm.paymentTerms}
                onChange={(e) => setPOForm({ ...poForm, paymentTerms: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="po-notes">{isRTL ? 'ملاحظات' : 'Notes'}</Label>
              <Input
                id="po-notes"
                placeholder={isRTL ? 'ملاحظات إضافية لأمر الشراء' : 'Additional notes for the PO'}
                value={poForm.notes}
                onChange={(e) => setPOForm({ ...poForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleGenerate} disabled={isGenerating} className="gap-2">
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {isGenerating
                ? (isRTL ? 'جاري الإنشاء...' : 'Generating...')
                : (isRTL ? 'إنشاء أمر شراء' : 'Create Purchase Order')
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
