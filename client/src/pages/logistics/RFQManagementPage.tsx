/**
 * RFQ Management Page
 * 
 * Manages vendor invitations and quotation submissions for a Purchase Request
 * Part of the PR Workspace - RFQ Stage
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
import { Plus, Mail, FileText, CheckCircle, Clock, XCircle, ExternalLink, Edit, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "@/components/BackButton";

export default function RFQManagementPage() {
 const { id: prId } = useParams();
 const navigate = useNavigate();
 const { language, isRTL} = useLanguage();
  const { t } = useTranslation();


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
 toast.success(t.rFQManagementPage.invitationSent);
 setInviteDialogOpen(false);
 setSelectedSupplierId("");
 setInvitationNotes("");
 refetch();
 utils.logistics.rfq.getSummary.invalidate({ purchaseRequestId });
 },
 onError: (error) => {
 toast.error(`${t.rFQManagementPage.error}: ${error.message}`);
 },
 });

 // Submit quotation mutation
 const submitQuotation = trpc.logistics.rfq.submitQuotation.useMutation({
 onSuccess: () => {
 toast.success(t.rFQManagementPage.quotationRecorded);
 setQuotationDialogOpen(false);
 resetQuotationForm();
 refetch();
 utils.logistics.rfq.getSummary.invalidate({ purchaseRequestId });
 },
 onError: (error) => {
 toast.error(`${t.rFQManagementPage.error}: ${error.message}`);
 },
 });

 // Delete vendor invitation mutation
 const deleteVendorInvitation = trpc.logistics.rfq.deleteVendorInvitation.useMutation({
 onSuccess: () => {
 toast.success("Vendor invitation deleted successfully");
 refetch();
 utils.logistics.rfq.getSummary.invalidate({ purchaseRequestId });
 },
 onError: (error) => {
 toast.error(`${t.rFQManagementPage.error}: ${error.message}`);
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

 // Handle RFQ PDF download
 const handleDownloadRFQPDF = async (rfqVendorId: number) => {
 console.log("handleDownloadRFQPDF called with rfqVendorId:", rfqVendorId);
 try {
 console.log("Calling generatePDF query...");
 const result = await utils.client.logistics.rfq.generatePDF.query({ rfqVendorId, language: language === 'ar' ? 'ar' : 'en' });
 console.log("generatePDF result:", result);
 
 if (!result?.html) {
 throw new Error("No HTML content received from server");
 }
 
 // Create a blob from the HTML and trigger download
 const blob = new Blob([result.html], { type: 'text/html' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `RFQ-${rfqVendorId}-${Date.now()}.html`;
 document.body.appendChild(a);
 a.click();
 document.body.removeChild(a);
 URL.revokeObjectURL(url);
 
 console.log("RFQ PDF downloaded successfully");
 alert("RFQ PDF downloaded successfully. You can convert the HTML file to PDF using a browser or PDF converter.");
 } catch (error) {
 console.error("Failed to generate RFQ PDF:", error);
 alert(`Failed to generate RFQ PDF: ${error instanceof Error ? error.message : "Unknown error"}`);
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
 pending: { icon: Clock, variant: "secondary" as const, label: t.rFQManagementPage.pending },
 submitted: { icon: CheckCircle, variant: "default" as const, label: t.rFQManagementPage.submitted },
 late: { icon: XCircle, variant: "destructive" as const, label: "Late" },
 withdrawn: { icon: XCircle, variant: "secondary" as const, label: "Withdrawn" },
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
 <BackButton onClick={() => navigate(`/organization/logistics/procurement-workspace/${prId}`)} label={t.rFQManagementPage.backToWorkspace} />
 </div>

 {/* Header */}
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-3xl font-bold">{t.rFQManagementPage.rfqManagement}</h1>
 </div>
 <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
 <DialogTrigger asChild>
 <Button className="gap-2">
 <Plus className="h-4 w-4" />
 {t.rFQManagementPage.inviteVendor}
 </Button>
 </DialogTrigger>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>{t.rFQManagementPage.inviteVendor}</DialogTitle>
 </DialogHeader>
 <div className="space-y-4">
 <div>
 <div className="flex items-center justify-between mb-2">
 <Label>{t.rFQManagementPage.selectVendor}</Label>
 <Button
 variant="link"
 size="sm"
 className="gap-1 h-auto p-0"
 onClick={() => {
 window.open('/organization/logistics/suppliers', '_blank');
 }}
 >
 <Plus className="h-3 w-3" />
 {t.rFQManagementPage.addNewSupplier}
 <ExternalLink className="h-3 w-3" />
 </Button>
 </div>
 <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
 <SelectTrigger>
 <SelectValue placeholder={vendors && vendors.length === 0 ? t.rFQManagementPage.noSuppliersFound : t.rFQManagementPage.selectVendor} />
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
 {t.rFQManagementPage.noSuppliersFound}
 </div>
 )}
 </SelectContent>
 </Select>
 </div>
 <div>
 <Label>{t.rFQManagementPage.invitationMethod}</Label>
 <Select value={invitationMethod} onValueChange={setInvitationMethod}>
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="email">{t.rFQManagementPage.email}</SelectItem>
 <SelectItem value="portal">{t.rFQManagementPage.portal}</SelectItem>
 <SelectItem value="hand_delivery">{t.rFQManagementPage.handDelivery}</SelectItem>
 <SelectItem value="mail">{t.rFQManagementPage.mail}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div>
 <Label>{t.rFQManagementPage.notes}</Label>
 <Textarea
 value={invitationNotes}
 onChange={(e) => setInvitationNotes(e.target.value)}
 rows={3}
 />
 </div>
 <div className="flex gap-2 justify-end">
 <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
 {t.rFQManagementPage.cancel}
 </Button>
 <Button onClick={handleInviteVendor} disabled={!selectedSupplierId}>
 {t.rFQManagementPage.invite}
 </Button>
 </div>
 </div>
 </DialogContent>
 </Dialog>
 </div>

 {/* Summary Cards */}
 {summary && (
 <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
 <Card className="p-4">
 <div className="text-sm text-muted-foreground">{t.rFQManagementPage.totalInvited}</div>
 <div className="text-2xl font-bold">{summary.totalInvited}</div>
 </Card>
 <Card className="p-4">
 <div className="text-sm text-muted-foreground">{t.rFQManagementPage.submitted}</div>
 <div className="text-2xl font-bold text-green-600">{summary.submitted}</div>
 </Card>
 <Card className="p-4">
 <div className="text-sm text-muted-foreground">{t.rFQManagementPage.pending}</div>
 <div className="text-2xl font-bold text-orange-600">{summary.pending}</div>
 </Card>
 <Card className="p-4">
 <div className="text-sm text-muted-foreground">{t.rFQManagementPage.declined}</div>
 <div className="text-2xl font-bold text-red-600">{summary.declined}</div>
 </Card>
 <Card className="p-4">
 <div className="text-sm text-muted-foreground">{t.rFQManagementPage.noResponse}</div>
 <div className="text-2xl font-bold text-gray-600">{summary.noResponse}</div>
 </Card>
 <Card className="p-4">
 <div className="text-sm text-muted-foreground">{t.rFQManagementPage.lowestQuote}</div>
 <div className="text-2xl font-bold text-blue-600">
 {summary.lowestQuote !== Infinity && summary.lowestQuote !== null && !isNaN(summary.lowestQuote) ? `$${summary.lowestQuote.toLocaleString()}` : "-"}
 </div>
 </Card>
 </div>
 )}

 {/* Vendor Invitations Table */}
 <Card>
 <div className="p-6">
 <h2 className="text-xl font-semibold mb-4">{t.rFQManagementPage.vendorInvitations}</h2>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="border-b">
 <th className="text-start py-2">{t.rFQManagementPage.vendor}</th>
 <th className="text-start py-2">{t.rFQManagementPage.rfqNumber}</th>
 <th className="text-start py-2">{t.rFQManagementPage.invitationDate}</th>
 <th className="text-start py-2">{t.rFQManagementPage.invitationMethod}</th>
 <th className="text-end py-2">{t.rFQManagementPage.quotedAmount}</th>
 <th className="text-center py-2">{t.rFQManagementPage.deliveryDays}</th>
 <th className="text-center py-2">{t.rFQManagementPage.warrantyMonths}</th>
 <th className="text-center py-2">{t.rFQManagementPage.status}</th>
 <th className="text-center py-2">{t.rFQManagementPage.actions}</th>
 </tr>
 </thead>
 <tbody>
 {rfqVendors?.map((vendor) => (
 <tr key={vendor.id} className="border-b">
 <td className="py-2">Vendor #{vendor.supplierId}</td>
 <td className="py-2 font-mono text-sm">{vendor.rfqNumber || "-"}</td>
 <td className="py-2">
 {vendor.invitationSentDate
 ? new Date(vendor.invitationSentDate).toLocaleDateString()
 : "-"}
 </td>
 <td className="py-2">{vendor.invitationMethod}</td>
 <td className="text-end py-2">
 {vendor.quotedAmount && !isNaN(parseFloat(vendor.quotedAmount))
 ? `${vendor.currency || "USD"} ${parseFloat(vendor.quotedAmount).toLocaleString()}`
 : "-"}
 </td>
 <td className="text-center py-2">{vendor.deliveryDays || "-"}</td>
 <td className="text-center py-2">{vendor.warrantyMonths || "-"}</td>
 <td className="text-center py-2">{getStatusBadge(vendor.submissionStatus)}</td>
 <td className="text-center py-2">
 <div className="flex gap-3 justify-center items-center">
 {/* Edit/Update Icon */}
 <button
 onClick={() => openQuotationDialog(vendor.id)}
 className="p-1.5 hover:bg-blue-100 rounded-md transition-colors"
 title={t.rFQManagementPage.update}
 >
 <Edit className="h-4 w-4 text-blue-600" />
 </button>
 {/* Download Icon */}
 <button
 onClick={() => handleDownloadRFQPDF(vendor.id)}
 className="p-1.5 hover:bg-green-100 rounded-md transition-colors"
 title={t.rFQManagementPage.downloadRFQ}
 >
 <Download className="h-4 w-4 text-green-600" />
 </button>
 {/* Delete Icon */}
 <button
 onClick={() => {
 if (confirm("Are you sure you want to delete this vendor invitation?")) {
 deleteVendorInvitation.mutate({ rfqVendorId: vendor.id });
 }
 }}
 className="p-1.5 hover:bg-red-100 rounded-md transition-colors"
 title="Delete"
 >
 <Trash2 className="h-4 w-4 text-red-600" />
 </button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </Card>

 {/* Record Quotation Dialog */}
 <Dialog open={quotationDialogOpen} onOpenChange={setQuotationDialogOpen}>
 <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>{t.rFQManagementPage.recordQuotation}</DialogTitle>
 </DialogHeader>
 <div className="space-y-6">
 {/* Line Items Table */}
 {prLineItems && prLineItems.length > 0 && (
 <div>
 <h3 className="text-sm font-semibold mb-2">Items</h3>
 <div className="border rounded-lg overflow-hidden">
 <table className="w-full">
 <thead className="bg-muted">
 <tr>
 <th className="text-start p-2 text-sm">#</th>
 <th className="text-start p-2 text-sm">{isRTL ? 'البند' : 'Item'}</th>
 <th className="text-start p-2 text-sm">{isRTL ? 'المواصفات' : 'Specifications'}</th>
 <th className="text-center p-2 text-sm">{isRTL ? 'الكمية' : 'Qty'}</th>
 <th className="text-center p-2 text-sm">{isRTL ? 'الوحدة' : 'Unit'}</th>
 <th className="text-center p-2 text-sm">{isRTL ? `سعر الوحدة (${currency})` : `Unit Price (${currency})`}</th>
 <th className="text-center p-2 text-sm">{isRTL ? `الإجمالي (${currency})` : `Total (${currency})`}</th>
 </tr>
 </thead>
 <tbody>
 {prLineItems.map((item, index) => {
 const unitPrice = parseFloat(lineItemPrices[item.id]?.unitPrice || "0");
 const quantity = parseFloat(item.quantity?.toString() || "0");
 const lineTotal = unitPrice * quantity;
 return (
 <tr key={item.id} className="border-t">
 <td className="p-2 text-sm">{index + 1}</td>
 <td className="p-2 text-sm">{item.description}</td>
 <td className="p-2 text-sm text-muted-foreground">{item.specifications || "-"}</td>
 <td className="text-center p-2 text-sm">{item.quantity}</td>
 <td className="text-center p-2 text-sm">{item.unit}</td>
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
 </tr>
 );
 })}
 <tr className="border-t bg-muted/50">
 <td colSpan={6} className="text-end p-2 text-sm font-semibold">{isRTL ? 'المجموع الكلي:' : 'Grand Total:'}</td>
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
 <Label>{t.rFQManagementPage.currency}</Label>
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
 <Label>{t.rFQManagementPage.deliveryDays}</Label>
 <Input
 type="number"
 value={deliveryDays}
 onChange={(e) => setDeliveryDays(e.target.value)}
 placeholder="30"
 />
 </div>
 <div>
 <Label>{t.rFQManagementPage.warrantyMonths}</Label>
 <Input
 type="number"
 value={warrantyMonths}
 onChange={(e) => setWarrantyMonths(e.target.value)}
 placeholder="12"
 />
 </div>
 <div>
 <Label>{t.rFQManagementPage.yearsOfExperience}</Label>
 <Input
 type="number"
 value={yearsOfExperience}
 onChange={(e) => setYearsOfExperience(e.target.value)}
 placeholder="3"
 />
 </div>
 <div>
 <Label>{isRTL ? 'رقم عرض المورد' : 'Supplier Quote Number'}</Label>
 <Input
 type="text"
 value={supplierQuoteNumber}
 onChange={(e) => setSupplierQuoteNumber(e.target.value)}
 placeholder={t.placeholders.eGSq2026001}
 />
 </div>
 <div>
 <Label>{isRTL ? 'وثيقة العرض' : 'Quotation Document'}</Label>
 <div className="space-y-2">
 <Input
 type="file"
 accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
 onChange={async (e) => {
 const file = e.target.files?.[0];
 if (!file) return;

 try {
 toast.info("Uploading file...");
 
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
 toast.success("File uploaded successfully");
 } else {
 toast.error("File upload failed");
 }
 } catch (error) {
 console.error("Upload error:", error);
 toast.error("File upload failed");
 }
 }}
 />
 {quotationAttachment && (
 <div className="flex items-center gap-2 text-sm">
 <span className="text-muted-foreground">Uploaded:</span>
 <a
 href={quotationAttachment}
 target="_blank"
 rel="noopener noreferrer"
 className="text-primary hover:underline"
 >
 View Document
 </a>
 </div>
 )}
 </div>
 </div>
 </div>

 <div>
 <Label>{t.rFQManagementPage.notes}</Label>
 <Textarea
 value={quotationNotes}
 onChange={(e) => setQuotationNotes(e.target.value)}
 rows={3}
 placeholder={t.placeholders.additionalNotesAboutThisQuotation}
 />
 </div>

 <div className="flex gap-2 justify-end">
 <Button variant="outline" onClick={() => setQuotationDialogOpen(false)}>
 {t.rFQManagementPage.cancel}
 </Button>
 <Button
 onClick={handleSubmitQuotation}
 disabled={!prLineItems || prLineItems.length === 0}
 >
 {t.rFQManagementPage.submit}
 </Button>
 </div>
 </div>
 </DialogContent>
 </Dialog>
 </div>
 );
}
