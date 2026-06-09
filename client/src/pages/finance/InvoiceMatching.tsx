/**
 * Invoice Matching UI
 * 
 * Automatic 3-way matching system:
 * - Compares Invoice vs PO vs GRN amounts
 * - Detects variances and flags discrepancies
 * - Auto-approves if within 5% tolerance
 * - Requires manual approval if exceeds tolerance
 */

import { useTranslation } from '@/i18n/useTranslation';
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertTriangle, XCircle, Upload } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from '@/contexts/LanguageContext';
import { BackButton } from "@/components/BackButton";

const TOLERANCE_THRESHOLD = 0.05; // 5%

export default function InvoiceMatching() {
  const { t } = useTranslation();
  const { language, isRTL} = useLanguage();
 const { payableId } = useParams<{ payableId: string }>();
 const [, setLocation] = useLocation();

 const [formData, setFormData] = useState({
 invoiceNumber: "",
 invoiceDate: "",
 invoiceAmount: "",
 description: "",
 attachmentUrl: "",
 });

 // Fetch payable details for 3-way matching
 const { data: payable, isLoading: payableLoading } = trpc.prFinance.getPayableById.useQuery(
 { id: parseInt(payableId || "0") },
 { enabled: !!payableId }
 );

 // Fetch PR, PO, GRN data for comparison
 const { data: matchingData, isLoading: matchingLoading } = trpc.prFinance.getMatchingData.useQuery(
 { payableId: parseInt(payableId || "0") },
 { enabled: !!payableId }
 );

 const submitInvoiceMutation = trpc.prFinance.submitInvoice.useMutation({
 onSuccess: (result) => {
 if (result.autoApproved) {
 toast.success("Invoice auto-approved - within tolerance threshold");
 } else {
 toast.success("Invoice submitted for manual approval - variance detected");
 }
 setLocation("/organization/finance/invoices");
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();

 if (!payableId) {
 toast.error("Payable ID is required");
 return;
 }

 submitInvoiceMutation.mutate({
 payableId: parseInt(payableId),
 invoiceNumber: formData.invoiceNumber,
 invoiceDate: new Date(formData.invoiceDate),
 invoiceAmount: formData.invoiceAmount,
 description: formData.description,
 attachmentUrl: formData.attachmentUrl,
 });
 };

 if (payableLoading || matchingLoading) {
 return (
 <div className="container py-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="flex items-center justify-center py-12">
 <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
 </div>
 </div>
 );
 }

 if (!payable || !matchingData) {
 return (
 <div className="container py-6">
 <Alert variant="destructive">
 <XCircle className="w-4 h-4" />
 <AlertDescription>Payable not found or matching data unavailable</AlertDescription>
 </Alert>
 </div>
 );
 }

 // Calculate variance
 const invoiceAmount = parseFloat(formData.invoiceAmount || "0");
 const poAmount = parseFloat(matchingData.poAmount || "0");
 const grnAmount = parseFloat(matchingData.grnAmount || "0");
 const prAmount = parseFloat(matchingData.prAmount || "0");

 const poVariance = invoiceAmount > 0 && poAmount > 0 ? Math.abs((invoiceAmount - poAmount) / poAmount) : 0;
 const grnVariance = invoiceAmount > 0 && grnAmount > 0 ? Math.abs((invoiceAmount - grnAmount) / grnAmount) : 0;
 const prVariance = invoiceAmount > 0 && prAmount > 0 ? Math.abs((invoiceAmount - prAmount) / prAmount) : 0;

 const maxVariance = Math.max(poVariance, grnVariance, prVariance);
 const withinTolerance = maxVariance <= TOLERANCE_THRESHOLD;

 const getVarianceStatus = (variance: number) => {
 if (variance === 0) return { color: "gray", label: "No Data", icon: null };
 if (variance <= TOLERANCE_THRESHOLD) return { color: "green", label: "Within Tolerance", icon: CheckCircle2 };
 return { color: "red", label: "Exceeds Tolerance", icon: AlertTriangle };
 };

 return (
 <div className="container py-6 max-w-5xl">
 {/* Header */}
 <div className="mb-6">
 <BackButton onClick={() => setLocation("/organization/finance/payables")} label={t.common.backToPayables} />
 <h1 className="text-3xl font-bold">Invoice Matching & Submission</h1>
 <p className="text-muted-foreground mt-1">3-Way Matching: Invoice vs PO vs GRN</p>
 </div>

 <div className="grid gap-6 md:grid-cols-2">
 {/* Left Column: Invoice Form */}
 <div>
 <Card>
 <CardHeader>
 <CardTitle>Invoice Details</CardTitle>
 <CardDescription>Enter invoice information for matching</CardDescription>
 </CardHeader>
 <CardContent>
 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <Label htmlFor="invoiceNumber">Invoice Number *</Label>
 <Input
 id="invoiceNumber"
 value={formData.invoiceNumber}
 onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
 placeholder="INV-2026-001"
 required
 />
 </div>

 <div>
 <Label htmlFor="invoiceDate">Invoice Date *</Label>
 <Input
 id="invoiceDate"
 type="date"
 value={formData.invoiceDate}
 onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
 required
 />
 </div>

 <div>
 <Label htmlFor="invoiceAmount">Invoice Amount (USD) *</Label>
 <Input
 id="invoiceAmount"
 type="number"
 step="0.01"
 value={formData.invoiceAmount}
 onChange={(e) => setFormData({ ...formData, invoiceAmount: e.target.value })}
 placeholder="0.00"
 required
 />
 </div>

 <div>
 <Label htmlFor="description">Description</Label>
 <Textarea
 id="description"
 value={formData.description}
 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
 placeholder={t.placeholders.invoiceDescriptionOrNotes}
 rows={3}
 />
 </div>

 <div>
 <Label htmlFor="attachmentUrl">Attachment URL</Label>
 <Input
 id="attachmentUrl"
 value={formData.attachmentUrl}
 onChange={(e) => setFormData({ ...formData, attachmentUrl: e.target.value })}
 placeholder="https://..."
 />
 <p className="text-xs text-muted-foreground mt-1">Upload invoice PDF and paste URL here</p>
 </div>

 <Button type="submit" className="w-full" disabled={submitInvoiceMutation.isPending}>
 {submitInvoiceMutation.isPending ? (
 <>
 <Loader2 className="w-4 h-4 me-2 animate-spin" />
 Submitting...
 </>
 ) : (
 <>
 <Upload className="w-4 h-4 me-2" />
 Submit Invoice
 </>
 )}
 </Button>
 </form>
 </CardContent>
 </Card>
 </div>

 {/* Right Column: 3-Way Matching Analysis */}
 <div className="space-y-4">
 {/* Matching Status */}
 <Card>
 <CardHeader>
 <CardTitle>Matching Status</CardTitle>
 </CardHeader>
 <CardContent>
 {invoiceAmount === 0 ? (
 <Alert>
 <AlertDescription>Enter invoice amount to see matching analysis</AlertDescription>
 </Alert>
 ) : withinTolerance ? (
 <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
 <CheckCircle2 className="w-4 h-4 text-green-600" />
 <AlertDescription className="text-green-800 dark:text-green-200">
 <strong>Auto-Approval Eligible</strong>
 <br />
 All variances are within 5% tolerance threshold
 </AlertDescription>
 </Alert>
 ) : (
 <Alert variant="destructive">
 <AlertTriangle className="w-4 h-4" />
 <AlertDescription>
 <strong>Manual Approval Required</strong>
 <br />
 Variance exceeds 5% tolerance - requires review
 </AlertDescription>
 </Alert>
 )}
 </CardContent>
 </Card>

 {/* Amount Comparison */}
 <Card>
 <CardHeader>
 <CardTitle>Amount Comparison</CardTitle>
 </CardHeader>
 <CardContent className="space-y-3">
 {/* PR Amount */}
 <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
 <div>
 <p className="text-sm font-medium">Purchase Request</p>
 <p className="text-lg font-bold">${prAmount.toLocaleString()}</p>
 </div>
 {invoiceAmount > 0 && (
 <div className="text-end">
 <Badge variant={prVariance <= TOLERANCE_THRESHOLD ? "default" : "destructive"}>
 {(prVariance * 100).toFixed(2)}%
 </Badge>
 <p className="text-xs text-muted-foreground mt-1">
 ${Math.abs(invoiceAmount - prAmount).toLocaleString()}
 </p>
 </div>
 )}
 </div>

 {/* PO Amount */}
 <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
 <div>
 <p className="text-sm font-medium">Purchase Order</p>
 <p className="text-lg font-bold">${poAmount.toLocaleString()}</p>
 </div>
 {invoiceAmount > 0 && (
 <div className="text-end">
 <Badge variant={poVariance <= TOLERANCE_THRESHOLD ? "default" : "destructive"}>
 {(poVariance * 100).toFixed(2)}%
 </Badge>
 <p className="text-xs text-muted-foreground mt-1">
 ${Math.abs(invoiceAmount - poAmount).toLocaleString()}
 </p>
 </div>
 )}
 </div>

 {/* GRN Amount */}
 <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
 <div>
 <p className="text-sm font-medium">Goods Receipt Note</p>
 <p className="text-lg font-bold">${grnAmount.toLocaleString()}</p>
 </div>
 {invoiceAmount > 0 && (
 <div className="text-end">
 <Badge variant={grnVariance <= TOLERANCE_THRESHOLD ? "default" : "destructive"}>
 {(grnVariance * 100).toFixed(2)}%
 </Badge>
 <p className="text-xs text-muted-foreground mt-1">
 ${Math.abs(invoiceAmount - grnAmount).toLocaleString()}
 </p>
 </div>
 )}
 </div>

 {/* Invoice Amount */}
 <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border-2 border-orange-300">
 <div>
 <p className="text-sm font-medium">Invoice Amount</p>
 <p className="text-lg font-bold">${invoiceAmount.toLocaleString()}</p>
 </div>
 <Badge variant="outline">Entered</Badge>
 </div>
 </CardContent>
 </Card>

 {/* Payable Information */}
 <Card>
 <CardHeader>
 <CardTitle>Payable Information</CardTitle>
 </CardHeader>
 <CardContent className="space-y-2 text-sm">
 <div className="flex justify-between">
 <span className="text-muted-foreground">Payable ID:</span>
 <span className="font-medium">{payable.id}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-muted-foreground">Vendor:</span>
 <span className="font-medium">{matchingData.vendorName}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-muted-foreground">PR Number:</span>
 <span className="font-medium">{matchingData.prNumber}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-muted-foreground">PO Number:</span>
 <span className="font-medium">{matchingData.poNumber}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-muted-foreground">Status:</span>
 <Badge>{payable.status}</Badge>
 </div>
 </CardContent>
 </Card>
 </div>
 </div>
 </div>
 );
}
