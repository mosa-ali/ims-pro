import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Printer,
  FileText,
  Edit,
  Save,
  X,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

/**
 * Purchase Order Detail Page
 * Full-featured management page with CRUD operations and workflow
 */
export default function PurchaseOrderDetail() {
 const { t } = useTranslation();
 const { id } = useParams<{ id: string }>();
 const [, setLocation] = useLocation();
 const { isRTL } = useLanguage();
 
 // Extract qaId and prId from URL query parameters for navigation context
 const qaId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('qaId') ? parseInt(new URLSearchParams(window.location.search).get('qaId')!) : null : null;
 const prId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('prId') ? parseInt(new URLSearchParams(window.location.search).get('prId')!) : null : null;
 
 // Debug: Verify component is rendering
 if (typeof window !== 'undefined') {
 console.log('[PurchaseOrderDetail] Component rendering with ID:', id);
 console.log('[PurchaseOrderDetail] Navigation context - qaId:', qaId, 'prId:', prId);
 }
 const [isEditing, setIsEditing] = useState(false);

 const poId = parseInt(id!);

 // Fetch PO data
 const { data: po, isLoading, refetch } = trpc.logistics.po.getById.useQuery({ id: poId });

 // Fetch PR data for context
 const { data: pr } = trpc.logistics.prWorkspace.getById.useQuery(
 { id: po?.purchaseRequestId || 0 },
 { enabled: !!po?.purchaseRequestId }
 );

 // Fetch line items
 const { data: lineItems = [] } = trpc.logistics.po.getLineItems.useQuery(
 { purchaseOrderId: poId }
 // Note: Removed enabled condition to ensure query always executes
 );
 
 // Debug logging
 useEffect(() => {
 console.log('[PurchaseOrderDetail] PO loaded:', po?.id);
 console.log('[PurchaseOrderDetail] Line items:', lineItems);
 }, [po, lineItems]);

 // Mutations
 const generatePDF = trpc.logistics.generatePDF.useMutation();
 const updatePO = trpc.logistics.po.update.useMutation({
 onSuccess: () => {
 toast.success("Purchase Order updated successfully");
 setIsEditing(false);
 refetch();
 },
 onError: (error) => {
 toast.error(`Failed to update: ${error.message}`);
 },
 });

 const [generatingPdfId, setGeneratingPdfId] = useState<number | null>(null);
 const approvePO = trpc.logistics.po.approvePO.useMutation({
 onSuccess: () => {
 toast.success("PO approved successfully");
 refetch();
 },
 onError: (error) => {
 toast.error(`Failed to approve: ${error.message}`);
 },
 });

 const sendToVendor = trpc.logistics.po.sendToVendor.useMutation({
 onSuccess: () => {
 toast.success("PO sent to vendor successfully");
 refetch();
 },
 onError: (error) => {
 toast.error(`Failed to send: ${error.message}`);
 },
 });

 const rejectPO = trpc.logistics.po.rejectPO.useMutation({
 onSuccess: () => {
 toast.success("PO rejected successfully");
 refetch();
 },
 onError: (error) => {
 toast.error(`Failed to reject: ${error.message}`);
 },
 });

 const [formData, setFormData] = useState({
 poDate: "",
 deliveryDate: "",
 deliveryLocation: "",
 paymentTerms: "",
 termsAndConditions: "",
 notes: "",
 });

 // Initialize form when PO data loads
 useEffect(() => {
 if (po && !isEditing) {
 setFormData({
 poDate: po.poDate ? new Date(po.poDate).toISOString().split("T")[0] : "",
 deliveryDate: po.deliveryDate ? new Date(po.deliveryDate).toISOString().split("T")[0] : "",
 deliveryLocation: po.deliveryLocation || "",
 paymentTerms: po.paymentTerms || "",
 termsAndConditions: po.termsAndConditions || "",
 notes: po.notes || "",
 });
 }
 }, [po, isEditing]);

 const handleSave = () => {
 updatePO.mutate({
 id: poId,
 ...formData,
 });
 };

 const handleApprove = () => {
 approvePO.mutate({ id: poId });
 };

 const handleSendToVendor = () => {
 sendToVendor.mutate({ id: poId });
 };

 const handleReject = () => {
 const reason = prompt("Please enter rejection reason:");
 if (reason) {
 rejectPO.mutate({ id: poId, reason });
 }
 };

 const handleGeneratePdf = async () => {
  try {
    setGeneratingPdfId(Number(poId));

    const result = await generatePDF.mutateAsync({
      documentType: "purchaseOrder",
      documentId: Number(poId),
      language: isRTL ? "ar" : "en",
    });

    // Validate PDF base64 header
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
    console.error("PO PDF generation error:", error);

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

 if (isLoading) {
 return (
 <div className="container py-8" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="animate-pulse space-y-4">
 <div className="h-8 bg-gray-200 rounded w-1/3"></div>
 <div className="h-64 bg-gray-200 rounded"></div>
 </div>
 </div>
 );
 }

 if (!po) {
 return (
 <div className="container py-8">
 <Card className="p-8 text-center">
 <p className="text-muted-foreground">{isRTL ? 'لم يتم العثور على أمر الشراء' : 'Purchase Order not found'}</p>
 <Button asChild className="mt-4">
 <Link href="/organization/logistics/purchase-orders">
 Back to Purchase Orders
 </Link>
 </Button>
 </Card>
 </div>
 );
 }

 const getStatusColor = (status: string) => {
 switch (status) {
 case "draft":
 return "bg-gray-500";
 case "sent":
 return "bg-blue-500";
 case "acknowledged":
 return "bg-indigo-500";
 case "partially_delivered":
 return "bg-yellow-500";
 case "delivered":
 return "bg-green-500";
 case "completed":
 return "bg-emerald-600";
 case "cancelled":
 return "bg-red-500";
 default:
 return "bg-gray-500";
 }
 };

 // Build back navigation URL based on context
 // Determine back navigation URL and label
 const backUrl = (() => {
 if (qaId && prId) {
 return `/organization/logistics/purchase-orders?qaId=${qaId}&prId=${prId}`;
 } else if (prId) {
 return `/organization/logistics/procurement-workspace/${prId}`;
 } else if (po?.purchaseRequestId) {
 return `/organization/logistics/procurement-workspace/${po.purchaseRequestId}`;
 } else {
 return `/organization/logistics/purchase-orders`;
 }
 })();

 const backLabel = (prId || po?.purchaseRequestId)
 ? (isRTL ? 'العودة إلى مساحة عمل المشتريات' : 'Back to Procurement Workspace')
 : t.logistics.backToPurchaseOrders;

 console.log('[PurchaseOrderDetail] Back URL:', backUrl, '| prId:', prId, '| po.purchaseRequestId:', po?.purchaseRequestId);

 return (
 <div className="container py-8 space-y-6">
 {/* Header */}
 <div className="mb-6">
 <BackButton href={backUrl} label={backLabel} />
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-3xl font-bold">{isRTL ? 'أمر الشراء' : 'Purchase Order'}</h1>
 <p className="text-muted-foreground">
 {po.poNumber} • PR: {pr?.prNumber}
 </p>
 </div>
 <div className="flex items-center gap-2">
 <Badge className={getStatusColor(po.status)}>
 {po.status.replace(/_/g, " ").toUpperCase()}
 </Badge>

 {!isEditing && (
 <>
 <Button
  variant="outline"
  size="sm"
  onClick={handleGeneratePdf}
  disabled={generatingPdfId === po.id}
>
  {generatingPdfId === po.id ? (
    <Loader2 className="h-4 w-4 me-2 animate-spin" />
  ) : (
    <Printer className="h-4 w-4 me-2" />
  )}

  {generatingPdfId === po.id
    ? (isRTL ? "جاري الطباعة..." : "Printing...")
    : (isRTL ? "طباعة PO" : "Print PO")}
</Button>
 <Button variant="outline" size="sm" asChild>
 <Link href={`/organization/logistics/procurement-package/${po.purchaseRequestId}/print`}>
 <FileText className="h-4 w-4 me-2" />
 Print All
 </Link>
 </Button>
 <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
 <Edit className="h-4 w-4 me-2" />
 Edit
 </Button>
 </>
 )}

 {isEditing && (
 <>
 <Button
 variant="outline"
 size="sm"
 onClick={() => {
 setIsEditing(false);
 }}
 >
 <X className="h-4 w-4 me-2" />
 Cancel
 </Button>
 <Button size="sm" onClick={handleSave} disabled={updatePO.isPending}>
 <Save className="h-4 w-4 me-2" />
 Save Changes
 </Button>
 </>
 )}
 </div>
 </div>
 </div>

 {/* Main Content */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Left Column - PO Details */}
 <div className="lg:col-span-2 space-y-6">
 <Card className="p-6">
 <h2 className="text-xl font-semibold mb-4">{isRTL ? 'تفاصيل الطلب' : 'Order Details'}</h2>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>PO Number</Label>
 <p className="text-sm mt-1 font-medium">{po.poNumber}</p>
 </div>

 <div className="col-span-2">
 <Label>{isRTL ? 'معلومات المورد' : 'Vendor Information'}</Label>
 {po.vendorData ? (
 <div className="text-sm mt-2 space-y-1 bg-slate-50 p-3 rounded border border-slate-200">
 <p><strong>{po.vendorData.vendorName}</strong> ({po.vendorData.vendorCode})</p>
 <p className="text-slate-600">Contact: {po.vendorData.contactPerson || "-"}</p>
 <p className="text-slate-600">Email: {po.vendorData.email || "-"}</p>
 <p className="text-slate-600">Phone: {po.vendorData.phone || "-"}</p>
 <p className="text-slate-600 text-xs">Address: {po.vendorData.address || "-"}</p>
 </div>
 ) : (
 <p className="text-sm mt-1 text-slate-500">-</p>
 )}
 </div>

 <div>
 <Label>PO Date</Label>
 {isEditing ? (
 <Input
 type="date"
 value={formData.poDate}
 onChange={(e) => setFormData({ ...formData, poDate: e.target.value })}
 />
 ) : (
 <p className="text-sm mt-1">
 {po.poDate ? new Date(po.poDate).toLocaleDateString() : "-"}
 </p>
 )}
 </div>

 <div>
 <Label>{isRTL ? 'تاريخ التسليم' : 'Delivery Date'}</Label>
 {isEditing ? (
 <Input
 type="date"
 value={formData.deliveryDate}
 onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
 />
 ) : (
 <p className="text-sm mt-1">
 {po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString() : "-"}
 </p>
 )}
 </div>

 <div className="col-span-2">
 <Label>{isRTL ? 'موقع التسليم' : 'Delivery Location'}</Label>
 {isEditing ? (
 <Input
 value={formData.deliveryLocation}
 onChange={(e) => setFormData({ ...formData, deliveryLocation: e.target.value })}
 />
 ) : (
 <p className="text-sm mt-1">{po.deliveryLocation || "-"}</p>
 )}
 </div>

 <div className="col-span-2">
 <Label>{isRTL ? 'شروط الدفع' : 'Payment Terms'}</Label>
 {isEditing ? (
 <Input
 value={formData.paymentTerms}
 onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
 placeholder={t.placeholders.eGNet30Days}
 />
 ) : (
 <p className="text-sm mt-1">{po.paymentTerms || "-"}</p>
 )}
 </div>

 <div className="col-span-2">
 <Label>Terms and Conditions</Label>
 {isEditing ? (
 <Textarea
 value={formData.termsAndConditions}
 onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
 rows={3}
 />
 ) : (
 <p className="text-sm mt-1 whitespace-pre-wrap">{po.termsAndConditions || "-"}</p>
 )}
 </div>

 <div className="col-span-2">
 <Label>{isRTL ? 'ملاحظات' : 'Notes'}</Label>
 {isEditing ? (
 <Textarea
 value={formData.notes}
 onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
 rows={3}
 />
 ) : (
 <p className="text-sm mt-1 whitespace-pre-wrap">{po.notes || "-"}</p>
 )}
 </div>
 </div>
 </Card>

 {/* Line Items */}
 <Card className="p-6">
 <h2 className="text-xl font-semibold mb-4">{isRTL ? 'البنود' : 'Line Items'}</h2>

 {lineItems.length > 0 ? (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="bg-gray-50 border-b">
 <tr>
 <th className="px-4 py-2 text-start">#</th>
 <th className="px-4 py-2 text-start">{isRTL ? 'الوصف' : 'Description'}</th>
 <th className="px-4 py-2 text-end">{isRTL ? 'الكمية' : 'Quantity'}</th>
 <th className="px-4 py-2 text-center">{isRTL ? 'الوحدة' : 'Unit'}</th>
 <th className="px-4 py-2 text-end">{isRTL ? 'سعر الوحدة' : 'Unit Price'}</th>
 <th className="px-4 py-2 text-end">{isRTL ? 'الإجمالي' : 'Total'}</th>
 </tr>
 </thead>
 <tbody>
 {lineItems.map((item: any, idx: number) => (
 <tr key={item.id} className="border-b">
 <td className="px-4 py-2">{item.lineNumber}</td>
 <td className="px-4 py-2">{item.description}</td>
 <td className="px-4 py-2 text-end">{parseFloat(String(item.quantity || 0)).toFixed(2)}</td>
 <td className="px-4 py-2 text-center">{item.unit}</td>
 <td className="px-4 py-2 text-end">
 {po.currency} {parseFloat(String(item.unitPrice || 0)).toFixed(2)}
 </td>
 <td className="px-4 py-2 text-end">
 {po.currency} {parseFloat(String(item.totalPrice || 0)).toFixed(2)}
 </td>
 </tr>
 ))}
 <tr className="font-bold bg-gray-50">
 <td colSpan={5} className="px-4 py-2 text-end">
 Grand Total:
 </td>
 <td className="px-4 py-2 text-end">
 {po.currency} {po.totalAmount ? parseFloat(String(po.totalAmount)).toFixed(2) : '0.00'}
 </td>
 </tr>
 </tbody>
 </table>
 </div>
 ) : (
 <div className="text-sm text-muted-foreground">
 No line items found. Line items are auto-copied from QA/BA.
 </div>
 )}
 </Card>
 </div>

 {/* Right Column - Workflow Actions */}
 <div className="space-y-6">
 <Card className="p-6">
 <h2 className="text-lg font-semibold mb-4">{isRTL ? 'إجراءات سير العمل' : 'Workflow Actions'}</h2>

 <div className="space-y-3">
 {po.status === "draft" && (
 <>
 <Button
 className="w-full bg-blue-600 hover:bg-blue-700"
 onClick={handleApprove}
 disabled={approvePO.isPending}
 >
 {approvePO.isPending ? "Approving..." : "Approve PO"}
 </Button>
 <Button
 className="w-full"
 variant="destructive"
 onClick={handleReject}
 disabled={rejectPO.isPending}
 >
 {rejectPO.isPending ? "Rejecting..." : "Reject PO"}
 </Button>
 </>
 )}

 {po.status === "sent" && (
 <div className="text-sm text-blue-600 font-medium text-center py-2">
 📧 PO Sent to Vendor - Awaiting Acknowledgment
 </div>
 )}

 {po.status === "acknowledged" && (
 <div className="text-sm text-green-600 font-medium text-center py-2">
 ✓ PO Approved - Ready for Goods Receipt
 </div>
 )}

 {po.status === "cancelled" && (
 <div className="text-sm text-red-600 font-medium text-center py-2">
 ✗ PO Cancelled
 </div>
 )}
 </div>
 </Card>

 <Card className="p-6">
 <h2 className="text-lg font-semibold mb-4">{isRTL ? 'الملخص المالي' : 'Financial Summary'}</h2>
 <div className="space-y-2 text-sm">
 <div className="flex justify-between">
 <span className="text-muted-foreground">Subtotal:</span>
 <span className="font-medium">
 {po.currency} {parseFloat(String(po.subtotal || "0")).toFixed(2)}
 </span>
 </div>
 <div className="flex justify-between">
 <span className="text-muted-foreground">Tax:</span>
 <span className="font-medium">
 {po.currency} {parseFloat(String(po.taxAmount || "0")).toFixed(2)}
 </span>
 </div>
 <div className="flex justify-between pt-2 border-t font-bold">
 <span>Total:</span>
 <span>
 {po.currency} {parseFloat(String(po.totalAmount || "0")).toFixed(2)}
 </span>
 </div>
 </div>
 </Card>

 <Card className="p-6">
 <h2 className="text-lg font-semibold mb-4">{isRTL ? 'الوثائق ذات الصلة' : 'Related Documents'}</h2>
 <div className="space-y-2 text-sm">
 <Link
 href={`/organization/logistics/purchase-requests/${po.purchaseRequestId}`}
 className="block text-blue-600 hover:underline"
 >
 → Purchase Request
 </Link>
 {po.quotationAnalysisId && (
 <Link
 href={`/organization/logistics/quotation-analysis/${po.quotationAnalysisId}`}
 className="block text-blue-600 hover:underline"
 >
 → Quotation Analysis
 </Link>
 )}
 </div>
 </Card>
 </div>
 </div>
 </div>
 );
}
