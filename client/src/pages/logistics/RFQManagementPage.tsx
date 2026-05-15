/**
 * RFQ Management Page - FINAL VERSION
 * 
 * Manages vendor invitations and quotation submissions for a Purchase Request
 * Part of the PR Workspace - RFQ Stage
 * 
 * ✅ UPDATED: Uses proper translation pattern with t.rFQManagementPage
 * Same approach as BidOpeningMinutes.tsx
 */

import { useTranslation } from '@/i18n/useTranslation';
import { useState } from "react";
import { useParams, useNavigate } from "@/lib/router-compat";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BackButton } from "@/components/BackButton";
import {
  Plus,
  Mail,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  ExternalLink,
  Edit,
  Download,
  Trash2,
  Loader2,
  Printer,
} from "lucide-react";

export default function RFQManagementPage() {
 const { id: prId } = useParams();
 const navigate = useNavigate();
 const { language, isRTL} = useLanguage();
 const { t } = useTranslation();

 // ✅ NEW: Use translation object pattern (same as BidOpeningMinutes.tsx)
 const localT = {
   // Header & Navigation
   backToWorkspace: t.logistics.backToWorkspace,
   
   // Page title
   rfqManagement: (t as any).rFQManagementPage?.rfqManagement || "RFQ Management",
   
   // Vendor invitation
   inviteVendor: (t as any).rFQManagementPage?.inviteVendor || "Invite Vendor",
   selectVendor: (t as any).rFQManagementPage?.selectVendor || "Select Vendor",
   addNewSupplier: (t as any).rFQManagementPage?.addNewSupplier || "Add New Supplier",
   noSuppliersFound: (t as any).rFQManagementPage?.noSuppliersFound || "No Suppliers Found",
   invitationMethod: (t as any).rFQManagementPage?.invitationMethod || "Invitation Method",
   email: (t as any).rFQManagementPage?.email || "Email",
   portal: (t as any).rFQManagementPage?.portal || "Portal",
   handDelivery: (t as any).rFQManagementPage?.handDelivery || "Hand Delivery",
   mail: (t as any).rFQManagementPage?.mail || "Mail",
   notes: (t as any).rFQManagementPage?.notes || "Notes",
   invite: (t as any).rFQManagementPage?.invite || "Invite",
   
   // Quotation submission
   submitQuotation: (t as any).rFQManagementPage?.submitQuotation || "Submit Quotation",
   quotationDetails: (t as any).rFQManagementPage?.quotationDetails || "Quotation Details",
   selectRfqVendor: (t as any).rFQManagementPage?.selectRfqVendor || "Select Vendor",
   quotedAmount: (t as any).rFQManagementPage?.quotedAmount || "Quoted Amount",
   currency: (t as any).rFQManagementPage?.currency || "Currency",
   deliveryDays: (t as any).rFQManagementPage?.deliveryDays || "Delivery Days",
   warrantyMonths: (t as any).rFQManagementPage?.warrantyMonths || "Warranty Months",
   yearsOfExperience: (t as any).rFQManagementPage?.yearsOfExperience || "Years of Experience",
   supplierQuoteNumber: (t as any).rFQManagementPage?.supplierQuoteNumber || "Supplier Quote Number",
   quotationDocument: (t as any).rFQManagementPage?.quotationDocument || "Quotation Document",
   attachment: (t as any).rFQManagementPage?.attachment || "Attachment",
   uploadFile: (t as any).rFQManagementPage?.uploadFile || "Upload File",
   viewDocument: (t as any).rFQManagementPage?.viewDocument || "View Document",
   uploaded: (t as any).rFQManagementPage?.uploaded || "Uploaded",
   fileUploadedSuccessfully: (t as any).rFQManagementPage?.fileUploadedSuccessfully || "File uploaded successfully",
   fileUploadFailed: (t as any).rFQManagementPage?.fileUploadFailed || "File upload failed",
   uploadingFile: (t as any).rFQManagementPage?.uploadingFile || "Uploading file...",
   
   // Line items table
   lineItems: (t as any).rFQManagementPage?.lineItems || "Line Items",
   description: (t as any).rFQManagementPage?.description || "Description",
   quantity: (t as any).rFQManagementPage?.quantity || "Quantity",
   unit: (t as any).rFQManagementPage?.unit || "Unit",
   unitPrice: (t as any).rFQManagementPage?.unitPrice || "Unit Price",
   total: (t as any).rFQManagementPage?.total || "Total",
   grandTotal: (t as any).rFQManagementPage?.grandTotal || "Grand Total",
   itemNotes: (t as any).rFQManagementPage?.itemNotes || "Item Notes",
   
   // Status labels
   pending: (t as any).rFQManagementPage?.pending || "Pending",
   submitted: (t as any).rFQManagementPage?.submitted || "Submitted",
   late: (t as any).rFQManagementPage?.late || "Late",
   withdrawn: (t as any).rFQManagementPage?.withdrawn || "Withdrawn",
   
   // RFQ vendor table
   rfqNumber: (t as any).rFQManagementPage?.rfqNumber || "RFQ Number",
   vendorName: (t as any).rFQManagementPage?.vendorName || "Vendor Name",
   invitationDate: (t as any).rFQManagementPage?.invitationDate || "Invitation Date",
   submissionDeadline: (t as any).rFQManagementPage?.submissionDeadline || "Submission Deadline",
   quotationStatus: (t as any).rFQManagementPage?.quotationStatus || "Quotation Status",
   actions: (t as any).rFQManagementPage?.actions || "Actions",
   
   // Action buttons
   edit: t.common?.edit || "Edit",
   download: t.common?.download || "Download",
   delete: t.common?.delete || "Delete",
   downloadRFQPDF: (t as any).rFQManagementPage?.downloadRFQPDF || "Download PDF",
   
   // Messages
   invitationSent: (t as any).rFQManagementPage?.invitationSent || "Invitation sent successfully",
   quotationRecorded: (t as any).rFQManagementPage?.quotationRecorded || "Quotation recorded successfully",
   vendorInvitationDeleted: (t as any).rFQManagementPage?.vendorInvitationDeleted || "Vendor invitation deleted successfully",
   error: t.common?.error || "Error",
   rfqPdfDownloadedSuccessfully: (t as any).rFQManagementPage?.rfqPdfDownloadedSuccessfully || "RFQ PDF downloaded successfully",
   failedToGenerateRfqPdf: (t as any).rFQManagementPage?.failedToGenerateRfqPdf || "Failed to generate RFQ PDF",
   noHtmlContentReceived: (t as any).rFQManagementPage?.noHtmlContentReceived || "No HTML content received from server",
   unknownError: (t as any).rFQManagementPage?.unknownError || "Unknown error",
   
   // Summary section
   summary: (t as any).rFQManagementPage?.summary || "Summary",
   totalVendorsInvited: (t as any).rFQManagementPage?.totalVendorsInvited || "Total Vendors Invited",
   quotationsReceived: (t as any).rFQManagementPage?.quotationsReceived || "Quotations Received",
   quotationsPending: (t as any).rFQManagementPage?.quotationsPending || "Quotations Pending",
   
   // Common
   cancel: t.common?.cancel || "Cancel",
   submit: t.common?.submit || "Submit",
 };

 const purchaseRequestId = parseInt(prId || "0");

 const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
 const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
 const [invitationMethod, setInvitationMethod] = useState<string>("email");
 const [invitationNotes, setInvitationNotes] = useState("");

 const [quotationDialogOpen, setQuotationDialogOpen] = useState(false);
 const [selectedRfqVendorId, setSelectedRfqVendorId] = useState<number>(0);
 const [quotedAmount, setQuotedAmount] = useState("");
 const [currency, setCurrency] = useState("USD");
 const [deliveryDays, setDeliveryDays] = useState("");
 const [warrantyMonths, setWarrantyMonths] = useState("");
 const [yearsOfExperience, setYearsOfExperience] = useState("");
 const [supplierQuoteNumber, setSupplierQuoteNumber] = useState("");
 const [quotationNotes, setQuotationNotes] = useState("");
 const [quotationAttachment, setQuotationAttachment] = useState("");
 const [lineItemPrices, setLineItemPrices] = useState<Record<number, { unitPrice: string; itemNotes: string }>>({});

 const utils = trpc.useUtils();
 const generatePDF = trpc.logistics.generatePDF.useMutation();
 const [generatingPdfId, setGeneratingPdfId] = useState<number | null>(null);

 // Fetch RFQ vendors
 const { data: rfqVendors, refetch } = trpc.logistics.rfq.listByPR.useQuery(
 { purchaseRequestId },
 { enabled: !!purchaseRequestId }
 );

 // Fetch RFQ summary
 const { data: summary } = trpc.logistics.rfq.getSummary.useQuery(
 { purchaseRequestId },
 { enabled: !!purchaseRequestId }
 );

 // Fetch vendors for invitation from Logistics Vendors Management module
 const { data: vendorsData } = trpc.logistics.vendors.list.useQuery({
 isActive: true, // Only show active vendors
 });
 const vendors = vendorsData?.vendors || [];

 // Fetch PR line items for quotation form
 const { data: prLineItems } = trpc.logistics.rfq.getPRLineItems.useQuery(
 { purchaseRequestId },
 { enabled: !!purchaseRequestId && quotationDialogOpen }
 );

 // Invite vendor mutation
 const inviteVendor = trpc.logistics.rfq.inviteVendor.useMutation({
 onSuccess: () => {
 toast.success(localT.invitationSent);
 setInviteDialogOpen(false);
 setSelectedSupplierId("");
 setInvitationNotes("");
 refetch();
 utils.logistics.rfq.getSummary.invalidate({ purchaseRequestId });
 },
 onError: (error) => {
 toast.error(`${localT.error}: ${error.message}`);
 },
 });

 // Submit quotation mutation
 const submitQuotation = trpc.logistics.rfq.submitQuotation.useMutation({
 onSuccess: () => {
 toast.success(localT.quotationRecorded);
 setQuotationDialogOpen(false);
 resetQuotationForm();
 refetch();
 utils.logistics.rfq.getSummary.invalidate({ purchaseRequestId });
 },
 onError: (error) => {
 toast.error(`${localT.error}: ${error.message}`);
 },
 });

 // Delete vendor invitation mutation
 const deleteVendorInvitation = trpc.logistics.rfq.deleteVendorInvitation.useMutation({
 onSuccess: () => {
 toast.success(localT.vendorInvitationDeleted);
 refetch();
 utils.logistics.rfq.getSummary.invalidate({ purchaseRequestId });
 },
 onError: (error) => {
 toast.error(`${localT.error}: ${error.message}`);
 },
 });

 const handleInviteVendor = () => {
 if (!selectedSupplierId) return;

 inviteVendor.mutate({
 purchaseRequestId,
 supplierId: parseInt(selectedSupplierId),
 invitationMethod: invitationMethod as any,
 notes: invitationNotes || undefined,
 });
 };

 const handleSubmitQuotation = () => {
 if (!selectedRfqVendorId || !prLineItems || prLineItems.length === 0) return;

 // Build line items array from prices
 const lineItems = prLineItems.map((item) => {
 const price = lineItemPrices[item.id];
 const unitPrice = parseFloat(price?.unitPrice || "0");
 const quantity = parseFloat(item.quantity?.toString() || "0");
 return {
 prLineItemId: item.id,
 quotedUnitPrice: unitPrice,
 quotedTotalPrice: unitPrice * quantity,
 itemNotes: price?.itemNotes || undefined,
 };
 });

 // Calculate grand total
 const grandTotal = lineItems.reduce((sum, item) => sum + item.quotedTotalPrice, 0);

 submitQuotation.mutate({
 rfqVendorId: selectedRfqVendorId,
 quotedAmount: grandTotal,
 currency,
 deliveryDays: deliveryDays ? parseInt(deliveryDays) : undefined,
 warrantyMonths: warrantyMonths ? parseInt(warrantyMonths) : undefined,
 yearsOfExperience: yearsOfExperience ? parseInt(yearsOfExperience) : undefined,
 supplierQuoteNumber: supplierQuoteNumber || undefined,
 quotationAttachment: quotationAttachment || undefined,
 notes: quotationNotes || undefined,
 lineItems,
 });
 };

 const resetQuotationForm = () => {
 setSelectedRfqVendorId(0);
 setQuotedAmount("");
 setCurrency("USD");
 setDeliveryDays("");
 setWarrantyMonths("");
 setYearsOfExperience("");
 setSupplierQuoteNumber("");
 setQuotationNotes("");
 setQuotationAttachment("");
 setLineItemPrices({});
 };

 const handleGenerateRFQPdf = async (rfqVendor: any) => {
  try {
    setGeneratingPdfId(rfqVendor.id);

    const result = await generatePDF.mutateAsync({
      documentType: "rfq",
      documentId: Number(rfqVendor.id),
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

    toast.success(
      isRTL
        ? "تم إنشاء ملف PDF بنجاح"
        : "PDF generated successfully"
    );

  } catch (error: any) {
    console.error("RFQ PDF generation error:", error);

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

 const openQuotationDialog = async (rfqVendorId: number) => {
 setSelectedRfqVendorId(rfqVendorId);
 
 // Check if this is an update (quotation already exists)
 try {
 const existingData = await utils.client.logistics.rfq.getQuotationDetails.query({ rfqVendorId });
 
 if (existingData && existingData.quotation) {
 // Pre-populate form with existing data
 const { quotation, lineItems } = existingData;
 
 setCurrency(quotation.currency || "USD");
 setDeliveryDays(quotation.deliveryDays?.toString() || "");
 setWarrantyMonths(quotation.warrantyMonths?.toString() || "");
 setYearsOfExperience(quotation.yearsOfExperience?.toString() || "");
 setSupplierQuoteNumber(quotation.supplierQuoteNumber || "");
 setQuotationNotes(quotation.notes || "");
 setQuotationAttachment(quotation.quotationAttachment || "");
 
 // Pre-populate line-item prices
 const pricesMap: Record<number, { unitPrice: string; itemNotes: string }> = {};
 lineItems.forEach((item) => {
 pricesMap[item.prLineItemId] = {
 unitPrice: item.quotedUnitPrice || "",
 itemNotes: item.itemNotes || "",
 };
 });
 setLineItemPrices(pricesMap);
 }
 } catch (error) {
 // If no existing quotation found, continue with empty form (create mode)
 console.log("No existing quotation, creating new");
 }
 
 setQuotationDialogOpen(true);
 };

 const getStatusBadge = (submissionStatus: string) => {
 const statusMap = {
 pending: { icon: Clock, variant: "secondary" as const, label: localT.pending },
 submitted: { icon: CheckCircle, variant: "default" as const, label: localT.submitted },
 late: { icon: XCircle, variant: "destructive" as const, label: localT.late },
 withdrawn: { icon: XCircle, variant: "secondary" as const, label: localT.withdrawn },
 };
 const config = statusMap[submissionStatus as keyof typeof statusMap] || statusMap.pending;
 const Icon = config.icon;
 return (
 <Badge variant={config.variant} className="gap-1">
 <Icon className="h-3 w-3" />
 {config.label}
 </Badge>
 );
 };

 return (
 <div className="container mx-auto py-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Back Button - Finance Style (separate row) */}
 <div>
 <BackButton onClick={() => navigate(`/organization/logistics/procurement-workspace/${prId}`)} label={localT.backToWorkspace} />
 </div>

 {/* Header */}
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-3xl font-bold">{localT.rfqManagement}</h1>
 </div>
 <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
 <DialogTrigger asChild>
 <Button className="gap-2">
 <Plus className="h-4 w-4" />
 {localT.inviteVendor}
 </Button>
 </DialogTrigger>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>{localT.inviteVendor}</DialogTitle>
 </DialogHeader>
 <div className="space-y-4">
 <div>
 <div className="flex items-center justify-between mb-2">
 <Label>{localT.selectVendor}</Label>
 <Button
 variant="link"
 size="sm"
 className="gap-1 h-auto p-0"
 onClick={() => {
 window.open('/organization/logistics/suppliers', '_blank');
 }}
 >
 <Plus className="h-3 w-3" />
 {localT.addNewSupplier}
 <ExternalLink className="h-3 w-3" />
 </Button>
 </div>
 <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
 <SelectTrigger>
 <SelectValue placeholder={vendors && vendors.length === 0 ? localT.noSuppliersFound : localT.selectVendor} />
 </SelectTrigger>
 <SelectContent>
 {vendors && vendors.length > 0 ? (
 vendors.map((vendor) => (
 <SelectItem key={vendor.id} value={vendor.id.toString()}>
 {vendor.name} {vendor.vendorCode ? `(${vendor.vendorCode})` : ''}
 </SelectItem>
 ))
 ) : (
 <div className="p-4 text-sm text-muted-foreground text-center">
 {localT.noSuppliersFound}
 </div>
 )}
 </SelectContent>
 </Select>
 </div>
 <div>
 <Label>{localT.invitationMethod}</Label>
 <Select value={invitationMethod} onValueChange={setInvitationMethod}>
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="email">{localT.email}</SelectItem>
 <SelectItem value="portal">{localT.portal}</SelectItem>
 <SelectItem value="hand_delivery">{localT.handDelivery}</SelectItem>
 <SelectItem value="mail">{localT.mail}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div>
 <Label>{localT.notes}</Label>
 <Textarea
 value={invitationNotes}
 onChange={(e) => setInvitationNotes(e.target.value)}
 rows={3}
 />
 </div>
 <div className="flex gap-2 justify-end">
 <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
 {localT.cancel}
 </Button>
 <Button onClick={handleInviteVendor} disabled={!selectedSupplierId}>
 {localT.invite}
 </Button>
 </div>
 </div>
 </DialogContent>
 </Dialog>
 </div>

 {/* Summary Cards */}
 {summary && (
 <div className="grid grid-cols-3 gap-4">
 <Card className="p-4">
 <div className="text-sm text-muted-foreground">{localT.totalVendorsInvited}</div>
 <div className="text-2xl font-bold">{summary.totalVendorsInvited || 0}</div>
 </Card>
 <Card className="p-4">
 <div className="text-sm text-muted-foreground">{localT.quotationsReceived}</div>
 <div className="text-2xl font-bold">{summary.quotationsReceived || 0}</div>
 </Card>
 <Card className="p-4">
 <div className="text-sm text-muted-foreground">{localT.quotationsPending}</div>
 <div className="text-2xl font-bold">{summary.quotationsPending || 0}</div>
 </Card>
 </div>
 )}

 {/* RFQ Vendors Table */}
 <Card>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="border-b bg-muted/50">
 <th className="text-left p-4 font-semibold">{localT.rfqNumber}</th>
 <th className="text-left p-4 font-semibold">{localT.vendorName}</th>
 <th className="text-left p-4 font-semibold">{localT.invitationDate}</th>
 <th className="text-left p-4 font-semibold">{localT.submissionDeadline}</th>
 <th className="text-left p-4 font-semibold">{localT.quotationStatus}</th>
 <th className="text-center p-4 font-semibold">{localT.actions}</th>
 </tr>
 </thead>
 <tbody>
 {rfqVendors && rfqVendors.length > 0 ? (
 rfqVendors.map((vendor) => (
 <tr key={vendor.id} className="border-b hover:bg-muted/50">
 <td className="p-4">{vendor.rfqNumber}</td>
 <td className="p-4">{vendor.vendorName}</td>
 <td className="p-4">{vendor.invitationDate ? new Date(vendor.invitationDate).toLocaleDateString() : '-'}</td>
 <td className="p-4">{vendor.submissionDeadline ? new Date(vendor.submissionDeadline).toLocaleDateString() : '-'}</td>
 <td className="p-4">{getStatusBadge(vendor.submissionStatus)}</td>
 <td className="p-4 text-center">
 <div className="flex gap-2 justify-center">
 <Button
 size="sm"
 variant="outline"
 onClick={() => openQuotationDialog(vendor.id)}
 className="gap-1"
 >
 <Edit className="h-3 w-3" />
 {localT.edit}
 </Button>
 <button
  onClick={() => handleGenerateRFQPdf(vendor)}
  disabled={generatingPdfId === vendor.id}
  className="p-1.5 hover:bg-green-100 rounded-md transition-colors"
  title={isRTL ? "طباعة RFQ" : "Print RFQ"}
>
  {generatingPdfId === vendor.id ? (
    <Loader2 className="h-4 w-4 text-green-600 animate-spin" />
  ) : (
    <Printer className="h-4 w-4 text-green-600" />
  )}
</button>
 <Button
 size="sm"
 variant="destructive"
 onClick={() => {
 if (confirm(language === 'ar' ? 'هل تريد حذف هذه الدعوة؟' : 'Are you sure you want to delete this invitation?')) {
 deleteVendorInvitation.mutate({ rfqVendorId: vendor.id });
 }
 }}
 className="gap-1"
 >
 <Trash2 className="h-3 w-3" />
 {localT.delete}
 </Button>
 </div>
 </td>
 </tr>
 ))
 ) : (
 <tr>
 <td colSpan={6} className="p-4 text-center text-muted-foreground">
 {language === 'ar' ? 'لا توجد دعوات موردين بعد' : 'No vendor invitations yet'}
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </Card>

 {/* Quotation Submission Dialog */}
 <Dialog open={quotationDialogOpen} onOpenChange={setQuotationDialogOpen}>
 <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>{localT.submitQuotation}</DialogTitle>
 </DialogHeader>
 <div className="space-y-4">
 {/* Line Items Table */}
 {prLineItems && prLineItems.length > 0 && (
 <div>
 <h3 className="font-semibold mb-2">{localT.lineItems}</h3>
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b bg-muted/50">
 <th className="text-left p-2">{localT.description}</th>
 <th className="text-center p-2">{localT.quantity}</th>
 <th className="text-center p-2">{localT.unit}</th>
 <th className="text-center p-2">{localT.unitPrice}</th>
 <th className="text-center p-2">{localT.total}</th>
 <th className="text-center p-2">{localT.itemNotes}</th>
 </tr>
 </thead>
 <tbody>
 {prLineItems.map((item) => {
 const unitPrice = parseFloat(lineItemPrices[item.id]?.unitPrice || "0");
 const quantity = parseFloat(item.quantity?.toString() || "0");
 const lineTotal = unitPrice * quantity;
 return (
 <tr key={item.id} className="border-b">
 <td className="p-2">{item.description}</td>
 <td className="text-center p-2">{item.quantity}</td>
 <td className="text-center p-2">{item.unit}</td>
 <td className="p-2">
 <Input
 type="number"
 step="0.01"
 placeholder="0.00"
 value={lineItemPrices[item.id]?.unitPrice || ""}
 onChange={(e) => {
 setLineItemPrices((prev) => ({
 ...prev,
 [item.id]: {
 ...prev[item.id],
 unitPrice: e.target.value,
 },
 }));
 }}
 className="text-center"
 />
 </td>
 <td className="text-center p-2 text-sm font-semibold">
 {lineTotal.toFixed(2)}
 </td>
 <td className="p-2">
 <Input
 type="text"
 placeholder={localT.itemNotes}
 value={lineItemPrices[item.id]?.itemNotes || ""}
 onChange={(e) => {
 setLineItemPrices((prev) => ({
 ...prev,
 [item.id]: {
 ...prev[item.id],
 itemNotes: e.target.value,
 },
 }));
 }}
 className="text-center"
 />
 </td>
 </tr>
 );
 })}
 <tr className="border-t bg-muted/50">
 <td colSpan={4} className="text-end p-2 text-sm font-semibold">{localT.grandTotal}:</td>
 <td className="text-center p-2 text-sm font-bold">
 {prLineItems
 .reduce((sum, item) => {
 const unitPrice = parseFloat(lineItemPrices[item.id]?.unitPrice || "0");
 const quantity = parseFloat(item.quantity?.toString() || "0");
 return sum + unitPrice * quantity;
 }, 0)
 .toFixed(2)}
 </td>
 </tr>
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* Additional Fields */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{localT.currency}</Label>
 <Select value={currency} onValueChange={setCurrency}>
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="USD">USD</SelectItem>
 <SelectItem value="EUR">EUR</SelectItem>
 <SelectItem value="GBP">GBP</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div>
 <Label>{localT.deliveryDays}</Label>
 <Input
 type="number"
 value={deliveryDays}
 onChange={(e) => setDeliveryDays(e.target.value)}
 placeholder="30"
 />
 </div>
 <div>
 <Label>{localT.warrantyMonths}</Label>
 <Input
 type="number"
 value={warrantyMonths}
 onChange={(e) => setWarrantyMonths(e.target.value)}
 placeholder="12"
 />
 </div>
 <div>
 <Label>{localT.yearsOfExperience}</Label>
 <Input
 type="number"
 value={yearsOfExperience}
 onChange={(e) => setYearsOfExperience(e.target.value)}
 placeholder="3"
 />
 </div>
 <div>
 <Label>{localT.supplierQuoteNumber}</Label>
 <Input
 type="text"
 value={supplierQuoteNumber}
 onChange={(e) => setSupplierQuoteNumber(e.target.value)}
 placeholder={t.placeholders.eGSq2026001}
 />
 </div>
 <div>
 <Label>{localT.quotationDocument}</Label>
 <div className="space-y-2">
 <Input
 type="file"
 accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
 onChange={async (e) => {
 const file = e.target.files?.[0];
 if (!file) return;

 try {
 toast.info(localT.uploadingFile);
 
 // Read file as ArrayBuffer
 const fileBuffer = await file.arrayBuffer();
 
 // Upload to S3 via backend endpoint
 const response = await fetch("/api/upload", {
 method: "POST",
 headers: {
 "Content-Type": "application/octet-stream",
 "X-Filename": file.name,
 },
 body: fileBuffer,
 });
 
 if (response.ok) {
 const data = await response.json();
 setQuotationAttachment(data.url);
 toast.success(localT.fileUploadedSuccessfully);
 } else {
 toast.error(localT.fileUploadFailed);
 }
 } catch (error) {
 console.error("Upload error:", error);
 toast.error(localT.fileUploadFailed);
 }
 }}
 />
 {quotationAttachment && (
 <div className="flex items-center gap-2 text-sm">
 <span className="text-muted-foreground">{localT.uploaded}:</span>
 <a
 href={quotationAttachment}
 target="_blank"
 rel="noopener noreferrer"
 className="text-primary hover:underline"
 >
 {localT.viewDocument}
 </a>
 </div>
 )}
 </div>
 </div>
 </div>

 <div>
 <Label>{localT.notes}</Label>
 <Textarea
 value={quotationNotes}
 onChange={(e) => setQuotationNotes(e.target.value)}
 rows={3}
 placeholder={t.placeholders.additionalNotesAboutThisQuotation}
 />
 </div>

 <div className="flex gap-2 justify-end">
 <Button variant="outline" onClick={() => setQuotationDialogOpen(false)}>
 {localT.cancel}
 </Button>
 <Button
 onClick={handleSubmitQuotation}
 disabled={!prLineItems || prLineItems.length === 0}
 >
 {localT.submit}
 </Button>
 </div>
 </div>
 </DialogContent>
 </Dialog>
 </div>
 );
}
