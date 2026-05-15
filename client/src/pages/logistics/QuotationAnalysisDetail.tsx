import { useTranslation } from '@/i18n/useTranslation';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Printer, Plus, Trash2, Check, TrendingDown, Zap, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import MdEditor from "react-markdown-editor-lite";
import "react-markdown-editor-lite/lib/index.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import QuotationAnalysisExtendedTab from "./tabs/QuotationAnalysisExtendedTab";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { BackButton } from "@/components/BackButton";

/**
 * Quotation Analysis (QA) Form - Per Specification
 * 
 * RULES:
 * - QA auto-created when PR approved and cost ≤ $25,000
 * - Suppliers ONLY from RFQ (no manual entry)
 * - Supplier offer matrix with unit prices per item
 * - Technical + Financial scoring
 * - Auto-calculated ranking with highlighting
 * - Comparison view with best price/delivery/warranty highlighting
 * - Auto-generates PO when approved
 */
export default function QuotationAnalysisDetail() {
  const { t } = useTranslation();
 const { id } = useParams();
 const [, setLocation] = useLocation();
 const qaId = parseInt(id!);
 const { language, isRTL} = useLanguage();

 // State
 const [autoLoadAttempted, setAutoLoadAttempted] = useState(false);
 const [editingSupplierPrices, setEditingSupplierPrices] = useState<Record<number, Record<number, string>>>({});
 const [selectedSupplierForApproval, setSelectedSupplierForApproval] = useState<number | null>(null);
 const [approvalJustification, setApprovalJustification] = useState("");
 const [showApprovalDialog, setShowApprovalDialog] = useState(false);
 const [showTechnicalScoreDialog, setShowTechnicalScoreDialog] = useState(false);
 const [technicalScoreInput, setTechnicalScoreInput] = useState<Record<number, string>>({});
 const [evaluationReport, setEvaluationReport] = useState("");

 // Fetch QA data
 const { data: qa, isLoading, refetch } = trpc.logistics.quotationAnalysis.getById.useQuery({ id: qaId });
 
 // Initialize evaluation report from QA data
 useEffect(() => {
 if (qa?.evaluationReport) {
 setEvaluationReport(qa.evaluationReport);
 }
 }, [qa?.evaluationReport]);
 
 // Fetch PR for line items and details
 const { data: pr } = trpc.logistics.prWorkspace.getById.useQuery(
 { id: qa?.purchaseRequestId || 0 },
 { enabled: !!qa?.purchaseRequestId }
 );

 // Mutations
 const autoLoadSuppliers = trpc.logistics.quotationAnalysis.autoLoadRFQSuppliers.useMutation({
 onSuccess: (result) => {
 if (result.suppliersAdded > 0) {
 toast.success(`Auto-loaded ${result.suppliersAdded} supplier(s) from RFQ`);
 refetch();
 }
 },
 onError: (error) => {
 toast.error(`Auto-load failed: ${error.message}`);
 },
 });

 const updateOffer = trpc.logistics.quotationAnalysis.updateSupplierOffer.useMutation({
 onSuccess: () => {
 toast.success("Quotation updated successfully");
 setEditingSupplierPrices({});
 refetch();
 },
 onError: (error) => toast.error(`Failed: ${error.message}`),
 });

 const calculateScores = trpc.logistics.quotationAnalysis.calculateScores.useMutation({
 onSuccess: (result) => {
 const mode = result.scoringMode === "cost-only" ? "Cost-Only" : "Multi-Criteria";
 toast.success(`Scores calculated (${mode} mode)`);
 refetch();
 },
 onError: (error) => toast.error(`Failed: ${error.message}`),
 });

 const selectSupplier = trpc.logistics.quotationAnalysis.selectSupplier.useMutation({
 onSuccess: () => {
 toast.success("Supplier selected successfully");
 setShowApprovalDialog(false);
 refetch();
 },
 onError: (error) => toast.error(`Failed: ${error.message}`),
 });

 const updateEvaluationReportMutation = trpc.logistics.quotationAnalysis.updateEvaluationReport.useMutation({
 onSuccess: () => {
 toast.success("Evaluation report updated");
 refetch();
 },
 onError: (error) => toast.error(`Failed: ${error.message}`),
 });

 const createPOFromQA = trpc.logistics.po.createFromQA.useMutation({
 onSuccess: (result) => {
 toast.success(`PO created: ${result.poNumber}`);
 refetch();
 },
 onError: (error) => toast.error(`PO creation failed: ${error.message}`),
 });

 const approveQA = trpc.logistics.quotationAnalysis.approve.useMutation({
 onSuccess: () => {
 toast.success("QA approved - PO will be auto-created");
 refetch();
 },
 onError: (error) => toast.error(`Failed: ${error.message}`),
 });

 // Auto-load suppliers on mount
 useEffect(() => {
 if (qa && !autoLoadAttempted && qa.status === "draft" && (!qa.suppliers || qa.suppliers.length === 0)) {
 setAutoLoadAttempted(true);
 autoLoadSuppliers.mutate({ quotationAnalysisId: qaId });
 }
 }, [qa?.id, autoLoadAttempted]);

 if (isLoading) {
 return (
 <div className="container py-8">
 <div className="animate-pulse space-y-4">
 <div className="h-8 bg-gray-200 rounded w-1/3"></div>
 <div className="h-64 bg-gray-200 rounded"></div>
 </div>
 </div>
 );
 }

 if (!qa) {
 return (
 <div className="container py-8">
 <div className="text-center text-muted-foreground">{isRTL ? 'لم يتم العثور على تحليل العروض' : 'Quotation Analysis not found'}</div>
 </div>
 );
 }

 const suppliers = qa.suppliers || [];
 const lineItems = pr?.lineItems || [];
 const selectedSupplier = suppliers.find((s: any) => s.id === qa.selectedSupplierId);

 // Calculate supplier totals
 const calculateSupplierTotal = (supplier: any) => {
 if (!supplier.lineOffers) return 0;
 return supplier.lineOffers.reduce((sum: number, item: any) => {
 const totalPrice = parseFloat(item.totalPrice || "0");
 return sum + totalPrice;
 }, 0);
 };

 // Find best price, delivery, warranty
 const bestPrice = suppliers.length > 0 
 ? Math.min(...suppliers.map(calculateSupplierTotal))
 : 0;

 const bestDelivery = suppliers.length > 0
 ? Math.min(...suppliers.map((s: any) => s.deliveryDays || 999))
 : 0;

 const bestWarranty = suppliers.length > 0
 ? Math.max(...suppliers.map((s: any) => s.warrantyMonths || 0))
 : 0;

 const getStatusBadge = (status: string) => {
 const variants: Record<string, any> = {
 draft: { variant: "secondary", label: "Draft" },
 submitted: { variant: "default", label: "Submitted" },
 approved: { variant: "default", label: "Approved" },
 };
 const config = variants[status] || variants.draft;
 return <Badge variant={config.variant}>{config.label}</Badge>;
 };

 const handleUpdatePrices = (supplierId: number) => {
 const lineItems = editingSupplierPrices[supplierId];
 if (!lineItems) return;

 updateOffer.mutate({
 qaId,
 supplierId,
 lineItems: Object.entries(lineItems).map(([itemId, unitPrice]) => ({
 lineItemId: parseInt(itemId),
 unitPrice: parseFloat(unitPrice as string),
 })),
 deliveryDays: suppliers.find(s => s.id === supplierId)?.deliveryDays || 0,
 paymentTerms: suppliers.find(s => s.id === supplierId)?.paymentTerms || "",
 notes: suppliers.find(s => s.id === supplierId)?.notes || "",
 });
 };

 const handleCalculateScores = () => {
 calculateScores.mutate({ quotationAnalysisId: qaId });
 };

 const handleSelectSupplier = () => {
 if (!selectedSupplierForApproval) {
 toast.error("Please select a supplier");
 return;
 }
 selectSupplier.mutate({
 qaId,
 supplierId: selectedSupplierForApproval,
 justification: approvalJustification,
 });
 };

 const handleApprove = () => {
 if (!qa.selectedSupplierId) {
 toast.error("Please select a supplier first");
 return;
 }
 approveQA.mutate({ qaId });
 };

 return (
 <div className="container py-8" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-4">
 <BackButton onClick={() => setLocation("/organization/logistics/purchase-requests")} iconOnly />
 <div>
 <h1 className="text-3xl font-bold">{qa.qaNumber}</h1>
 <p className="text-muted-foreground">PR: {qa.purchaseRequestId}</p>
 </div>
 {getStatusBadge(qa.status)}
 </div>
 <div className="flex gap-2">
 <Button variant="outline" size="icon" onClick={() => window.open(`/organization/logistics/quotation-analysis/${qa.id}/print`, '_blank')}>
 <Printer className="h-4 w-4" />
 </Button>
 </div>
 </div>

 {/* Document Information */}
 <Card className="p-6 mb-6">
 <h2 className="text-xl font-semibold mb-4">{isRTL ? 'معلومات الوثيقة' : 'Document Information'}</h2>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
 <div>
 <span className="text-muted-foreground">QA Number</span>
 <p className="font-medium">{qa.qaNumber}</p>
 </div>
 <div>
 <span className="text-muted-foreground">PR Number</span>
 <p className="font-medium">{pr?.prNumber || "-"}</p>
 </div>
 <div>
 <span className="text-muted-foreground">{isRTL ? 'نوع العملية' : 'Process Type'}</span>
 <p className="font-medium">{qa.processType || "Multiple Quotations"}</p>
 </div>
 <div>
 <span className="text-muted-foreground">Total PR Amount</span>
 <p className="font-medium">${parseFloat(String(pr?.prTotalUsd || pr?.prTotalUsd || pr?.totalAmount || '0')).toFixed(2)}</p>
 </div>
 </div>
 </Card>

 {/* Line Items (Read-Only) */}
 <Card className="p-6 mb-6">
 <h2 className="text-xl font-semibold mb-4">{isRTL ? 'البنود (من طلب الشراء - للقراءة فقط)' : 'Line Items (from PR - Read Only)'}</h2>
 <div className="overflow-x-auto">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>#</TableHead>
 <TableHead>{isRTL ? 'الوصف' : 'Description'}</TableHead>
 <TableHead>Specification</TableHead>
 <TableHead className="text-end">Qty</TableHead>
 <TableHead>{isRTL ? 'الوحدة' : 'Unit'}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {lineItems.map((item: any, idx: number) => (
 <TableRow key={idx}>
 <TableCell>{item.lineNumber}</TableCell>
 <TableCell>{item.description}</TableCell>
 <TableCell className="text-sm text-muted-foreground">{item.specification || "-"}</TableCell>
 <TableCell className="text-end">{item.quantity}</TableCell>
 <TableCell>{item.unit}</TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>
 </Card>

 {/* Supplier Offer Matrix */}
 <Card className="p-6 mb-6">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-xl font-semibold">{isRTL ? 'مصفوفة عروض الموردين' : 'Supplier Offer Matrix'}</h2>
 {qa.status === "draft" && suppliers.length > 0 && (
 <div className="flex gap-2">
 <Button onClick={() => setShowTechnicalScoreDialog(true)} variant="outline" size="sm">
 Set Technical Scores
 </Button>
 <Button onClick={handleCalculateScores} variant="outline" size="sm">
 Calculate Scores
 </Button>
 </div>
 )}
 </div>
 
 {/* Empty State - Create QA Form Button */}
 {suppliers.length === 0 && qa.status === "draft" && (
 <div className="flex flex-col items-center justify-center py-12 text-center">
 <div className="mb-4">
 <Plus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
 <h3 className="text-lg font-semibold mb-2">{isRTL ? 'إنشاء نموذج تحليل العروض' : 'Create Quotation Analysis Form'}</h3>
 <p className="text-muted-foreground mb-6">Add suppliers from RFQ or manually to begin the quotation analysis</p>
 </div>
 <div className="flex gap-3">
 <Button 
 onClick={() => autoLoadSuppliers.mutate({ quotationAnalysisId: qaId })}
 disabled={autoLoadSuppliers.isPending}
 className="gap-2"
 >
 <Plus className="h-4 w-4" />
 {autoLoadSuppliers.isPending ? "Loading..." : "Load from RFQ"}
 </Button>
 </div>
 </div>
 )}
 
 {suppliers.length > 0 && (
 <Tabs defaultValue="overview" className="w-full">
 <TabsList>
 <TabsTrigger value="overview">{isRTL ? 'نظرة عامة' : 'Overview'}</TabsTrigger>
 <TabsTrigger value="lineItems">{isRTL ? 'البنود' : 'Line Items'}</TabsTrigger>
 <TabsTrigger value="scores">Scoring</TabsTrigger>
 {pr && parseFloat(String(pr?.prTotalUsd || '0')) > 5000 && parseFloat(String(pr?.prTotalUsd || '0')) <= 25000 && (
 <TabsTrigger value="extended">Multi-Criteria Scoring</TabsTrigger>
 )}
 </TabsList>

 {/* Overview Tab */}
 <TabsContent value="overview" className="mt-4">
 <div className="overflow-x-auto">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{isRTL ? 'المورد' : 'Supplier'}</TableHead>
 <TableHead className="text-end">{isRTL ? 'المبلغ الإجمالي' : 'Total Amount'}</TableHead>
 <TableHead className="text-end">{isRTL ? 'أيام التسليم' : 'Delivery Days'}</TableHead>
 <TableHead className="text-end">Warranty (Months)</TableHead>
 <TableHead className="text-end">{isRTL ? 'الدرجة الفنية' : 'Technical Score'}</TableHead>
 <TableHead className="text-end">{isRTL ? 'الدرجة المالية' : 'Financial Score'}</TableHead>
 <TableHead className="text-end">{isRTL ? 'الدرجة الكلية' : 'Total Score'}</TableHead>
 <TableHead>{isRTL ? 'الترتيب' : 'Rank'}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {suppliers.map((supplier: any, idx: number) => {
 const total = calculateSupplierTotal(supplier);
 const isBestPrice = total === bestPrice;
 const isBestDelivery = supplier.deliveryDays === bestDelivery;
 const isBestWarranty = supplier.warrantyMonths === bestWarranty;
 const technicalScores = suppliers.map(s => parseFloat(s.technicalScore || "0")).filter(t => t > 0);
 const bestTechnical = technicalScores.length > 0 ? Math.max(...technicalScores) : 0;
 const isBestTechnical = supplier.technicalScore && parseFloat(supplier.technicalScore) === bestTechnical && bestTechnical > 0;
 
 return (
 <TableRow 
 key={idx}
 className={qa.selectedSupplierId === supplier.id ? "bg-blue-50" : ""}
 >
 <TableCell className="font-medium">{supplier.supplierName}</TableCell>
 <TableCell className={`text-end font-medium ${isBestPrice ? "bg-green-100 text-green-900" : ""}`}>
 ${total.toFixed(2)}
 {isBestPrice && <span className="ms-2">✓</span>}
 </TableCell>
 <TableCell className={`text-end ${isBestDelivery ? "bg-blue-100 text-blue-900" : ""}`}>
 {supplier.deliveryDays}
 {isBestDelivery && <span className="ms-2">✓</span>}
 </TableCell>
 <TableCell className={`text-end ${isBestWarranty ? "bg-yellow-100 text-yellow-900" : ""}`}>
 {supplier.warrantyMonths || 0}
 {isBestWarranty && <span className="ms-2">✓</span>}
 </TableCell>
 <TableCell className={`text-end ${isBestTechnical ? "bg-purple-100 text-purple-900" : ""}`}>
 {supplier.technicalScore?.toFixed(2) || "-"}
 {isBestTechnical && <span className="ms-2">✓</span>}
 </TableCell>
 <TableCell className="text-end">{supplier.financialScore?.toFixed(2) || "-"}</TableCell>
 <TableCell className="text-end font-semibold">{supplier.totalScore?.toFixed(2) || "-"}</TableCell>
 <TableCell className="text-center">{supplier.rank || "-"}</TableCell>
 </TableRow>
 );
 })}
 </TableBody>
 </Table>
 </div>

 {/* Recommendation Cards */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
 <Card className="p-4 border-green-200 bg-green-50">
 <div className="flex items-center gap-2 mb-2">
 <TrendingDown className="h-5 w-5 text-green-600" />
 <h3 className="font-semibold text-green-900">{isRTL ? 'أفضل سعر' : 'Best Price'}</h3>
 </div>
 <p className="text-sm text-green-800">
 {suppliers.find(s => calculateSupplierTotal(s) === bestPrice)?.supplierName || "-"}
 </p>
 <p className="text-lg font-bold text-green-900">${bestPrice.toFixed(2)}</p>
 </Card>

 <Card className="p-4 border-blue-200 bg-blue-50">
 <div className="flex items-center gap-2 mb-2">
 <Clock className="h-5 w-5 text-blue-600" />
 <h3 className="font-semibold text-blue-900">{isRTL ? 'أسرع تسليم' : 'Fastest Delivery'}</h3>
 </div>
 <p className="text-sm text-blue-800">
 {suppliers.find(s => s.deliveryDays === bestDelivery)?.supplierName || "-"}
 </p>
 <p className="text-lg font-bold text-blue-900">{bestDelivery} days</p>
 </Card>

 <Card className="p-4 border-yellow-200 bg-yellow-50">
 <div className="flex items-center gap-2 mb-2">
 <Zap className="h-5 w-5 text-yellow-600" />
 <h3 className="font-semibold text-yellow-900">{isRTL ? 'أفضل ضمان' : 'Best Warranty'}</h3>
 </div>
 <p className="text-sm text-yellow-800">
 {suppliers.find(s => s.warrantyMonths === bestWarranty)?.supplierName || "-"}
 </p>
 <p className="text-lg font-bold text-yellow-900">{bestWarranty} months</p>
 </Card>
 </div>
 </TabsContent>

 {/* Line Items Tab */}
 <TabsContent value="lineItems" className="mt-4 space-y-6">
 {suppliers.map((supplier: any) => (
 <Card key={supplier.id} className="p-4">
 <h3 className="font-semibold mb-4">{supplier.supplierName}</h3>
 <div className="overflow-x-auto">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{isRTL ? 'البند' : 'Item'}</TableHead>
 <TableHead className="text-end">Qty</TableHead>
 <TableHead className="text-end">{isRTL ? 'سعر الوحدة' : 'Unit Price'}</TableHead>
 <TableHead className="text-end">{isRTL ? 'إجمالي البند' : 'Item Total'}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {lineItems.map((item: any) => {
 const supplierItem = supplier.lineOffers?.find((si: any) => si.lineItemId === item.id);
 const unitPrice = supplierItem?.unitPrice || 0;
 const itemTotal = item.quantity * unitPrice;
 
 return (
 <TableRow key={item.id}>
 <TableCell>{item.description}</TableCell>
 <TableCell className="text-end">{item.quantity}</TableCell>
 <TableCell className="text-end">
 {qa.status === "draft" ? (
 <Input
 type="number"
 value={editingSupplierPrices[supplier.id]?.[item.id] || unitPrice}
 onChange={(e) => {
 setEditingSupplierPrices(prev => ({
 ...prev,
 [supplier.id]: {
 ...prev[supplier.id],
 [item.id]: e.target.value,
 }
 }));
 }}
 className="w-24 text-end"
 placeholder="0.00"
 />
 ) : (
 `$${unitPrice.toFixed(2)}`
 )}
 </TableCell>
 <TableCell className="text-end font-medium">${itemTotal.toFixed(2)}</TableCell>
 </TableRow>
 );
 })}
 <TableRow className="font-bold bg-gray-50">
 <TableCell colSpan={3}>{isRTL ? 'المجموع الفرعي للمورد' : 'Supplier Subtotal'}</TableCell>
 <TableCell className="text-end">${calculateSupplierTotal(supplier).toFixed(2)}</TableCell>
 </TableRow>
 </TableBody>
 </Table>
 </div>
 {qa.status === "draft" && (
 <Button 
 onClick={() => handleUpdatePrices(supplier.id)} 
 size="sm" 
 className="mt-4"
 >
 Save Prices
 </Button>
 )}
 </Card>
 ))}
 </TabsContent>

 {/* Scoring Tab */}
 <TabsContent value="scores" className="mt-4">
 <div className="space-y-4">
 {/* Scoring Mode Indicator */}
 <Card className="p-4 bg-blue-50 border-blue-200">
 <h3 className="font-semibold text-blue-900 mb-2">{isRTL ? 'وضع التقييم' : 'Scoring Mode'}</h3>
 <p className="text-sm text-blue-800">
 {parseFloat(String(pr?.prTotalUsd || pr?.totalAmount || '0')) <= 5000 ? (
 <>
 <strong>Cost-Only Scoring</strong> (PR ≤ $5,000)<br />
 Lowest bidder receives 100 points, others proportional.
 </>
 ) : (
 <>
 <strong>Multi-Criteria Scoring</strong> (PR $5,000-$25,000)<br />
 Price: 60% | Delivery: 20% | Warranty: 10% | Technical: 10%
 </>
 )}
 </p>
 </Card>

 {/* Criteria Breakdown (Multi-Criteria Only) */}
 {parseFloat(String(pr?.prTotalUsd || pr?.totalAmount || '0')) > 5000 && (
 <div className="text-sm text-muted-foreground space-y-1">
 <p><strong>{isRTL ? 'درجة السعر (60%):' : 'Price Score (60%):'}</strong> Lowest price gets 60 points, others proportional</p>
 <p><strong>{isRTL ? 'درجة التسليم (20%):' : 'Delivery Score (20%):'}</strong> Fastest delivery gets 20 points, others proportional</p>
 <p><strong>{isRTL ? 'درجة الضمان (10%):' : 'Warranty Score (10%):'}</strong> Longest warranty gets 10 points, others proportional</p>
 <p><strong>{isRTL ? 'درجة التقنية (10%):' : 'Technical Score (10%):'}</strong> Rating (1-5 scale) normalized to 0-10 points</p>
 </div>
 )}
 <div className="overflow-x-auto">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{isRTL ? 'المورد' : 'Supplier'}</TableHead>
 <TableHead className="text-end">{isRTL ? 'فني' : 'Technical'}</TableHead>
 <TableHead className="text-end">{isRTL ? 'مالي' : 'Financial'}</TableHead>
 <TableHead className="text-end">{isRTL ? 'الإجمالي' : 'Total'}</TableHead>
 <TableHead className="text-center">{isRTL ? 'الترتيب' : 'Rank'}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {suppliers
 .sort((a: any, b: any) => (b.totalScore || 0) - (a.totalScore || 0))
 .map((supplier: any, idx: number) => (
 <TableRow key={supplier.id}>
 <TableCell className="font-medium">{supplier.supplierName}</TableCell>
 <TableCell className="text-end">{supplier.technicalScore?.toFixed(2) || "-"}</TableCell>
 <TableCell className="text-end">{supplier.financialScore?.toFixed(2) || "-"}</TableCell>
 <TableCell className="text-end font-bold">{supplier.totalScore?.toFixed(2) || "-"}</TableCell>
 <TableCell className="text-center">
 {idx === 0 && supplier.totalScore ? (
 <Badge className="bg-green-600">1st</Badge>
 ) : idx === 1 && supplier.totalScore ? (
 <Badge className="bg-blue-600">2nd</Badge>
 ) : idx === 2 && supplier.totalScore ? (
 <Badge className="bg-yellow-600">3rd</Badge>
 ) : (
 "-"
 )}
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>
 </div>
 </TabsContent>

 {/* Extended QA Form Tab (for PRs $5,001-$25,000) */}
 {pr && parseFloat(String(pr?.prTotalUsd || '0')) > 5000 && parseFloat(String(pr?.prTotalUsd || '0')) <= 25000 && (
 <TabsContent value="extended" className="mt-4">
 <QuotationAnalysisExtendedTab
 qaId={qaId.toString()}
 purchaseRequestId={qa.purchaseRequestId.toString()}
 rfqId={qa.rfqId?.toString() || ""}
 />
 </TabsContent>
 )}
 </Tabs>
 )}
 </Card>

 {/* Evaluation Report Section */}
 <Card className="p-6 mb-6">
 <h2 className="text-xl font-semibold mb-4">{isRTL ? 'تقرير التقييم' : 'Evaluation Report'}</h2>
 <p className="text-sm text-muted-foreground mb-4">
 Selection process description, conclusions and recommendation
 </p>
 <div className="border rounded-md overflow-hidden">
 <MdEditor
 value={evaluationReport}
 style={{ height: "300px" }}
 renderHTML={(text) => (
 <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
 )}
 onChange={({ text }) => {
 setEvaluationReport(text);
 // Debounced auto-save
 if (text !== qa.evaluationReport) {
 updateEvaluationReportMutation.mutate({ qaId, evaluationReport: text });
 }
 }}
 placeholder={selectedSupplier ? `The supplier ${selectedSupplier.supplierName} was selected for the following reasons...` : "Evaluation report will be filled after supplier selection..."}
 config={{
 view: { menu: true, md: true, html: true },
 canView: { menu: true, md: true, html: true, fullScreen: false, hideMenu: false },
 }}
 />
 </div>
 </Card>

 {/* Supplier Selection */}
 {qa.status === "draft" && suppliers.length > 0 && (
 <Card className="p-6 mb-6">
 <h2 className="text-xl font-semibold mb-4">{isRTL ? 'اختيار المورد' : 'Select Supplier'}</h2>
 <div className="space-y-4">
 {suppliers.map((supplier: any) => (
 <div 
 key={supplier.id}
 className={`p-4 border-2 rounded-lg cursor-pointer transition ${ selectedSupplierForApproval === supplier.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300" }`}
 onClick={() => setSelectedSupplierForApproval(supplier.id)}
 >
 <div className="flex items-center justify-between">
 <div>
 <p className="font-semibold">{supplier.supplierName}</p>
 <p className="text-sm text-muted-foreground">
 Total: ${calculateSupplierTotal(supplier).toFixed(2)} | 
 Delivery: {supplier.deliveryDays} days | 
 Warranty: {supplier.warrantyMonths} months
 </p>
 </div>
 {selectedSupplierForApproval === supplier.id && (
 <Check className="h-5 w-5 text-blue-600" />
 )}
 </div>
 </div>
 ))}
 </div>
 
 <div className="mt-6 space-y-4">
 <div>
 <Label>Justification for Selection</Label>
 <Textarea
 value={approvalJustification}
 onChange={(e) => setApprovalJustification(e.target.value)}
 placeholder={t.placeholders.explainWhyThisSupplierWasSelected}
 className="mt-2"
 />
 </div>
 <Button 
 onClick={handleSelectSupplier}
 disabled={!selectedSupplierForApproval}
 >
 Confirm Selection
 </Button>
 </div>
 </Card>
 )}

 {/* Selected Supplier Display */}
 {qa.selectedSupplierId && selectedSupplier && (
 <Card className="p-6 mb-6 border-green-200 bg-green-50">
 <h2 className="text-xl font-semibold mb-4 text-green-900">{isRTL ? 'المورد المختار' : 'Selected Supplier'}</h2>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <div>
 <span className="text-sm text-green-700">{isRTL ? 'المورد' : 'Supplier'}</span>
 <p className="font-semibold text-green-900">{selectedSupplier.supplierName}</p>
 </div>
 <div>
 <span className="text-sm text-green-700">{isRTL ? 'المبلغ الإجمالي' : 'Total Amount'}</span>
 <p className="font-semibold text-green-900">${calculateSupplierTotal(selectedSupplier).toFixed(2)}</p>
 </div>
 <div>
 <span className="text-sm text-green-700">{isRTL ? 'أيام التسليم' : 'Delivery Days'}</span>
 <p className="font-semibold text-green-900">{selectedSupplier.deliveryDays}</p>
 </div>
 <div>
 <span className="text-sm text-green-700">{isRTL ? 'الضمان' : 'Warranty'}</span>
 <p className="font-semibold text-green-900">{selectedSupplier.warrantyMonths} months</p>
 </div>
 </div>
 </Card>
 )}

 {/* Actions */}
 <div className="flex gap-4 justify-end">
 {qa.status === "draft" && qa.selectedSupplierId && (
 <Button 
 onClick={handleApprove}
 className="bg-green-600 hover:bg-green-700"
 >
 Approve QA & Create PO
 </Button>
 )}
 {qa.status === "approved" && (
 <Badge className="bg-green-600">Approved - PO Created</Badge>
 )}
 </div>

 {/* Technical Score Dialog */}
 <Dialog open={showTechnicalScoreDialog} onOpenChange={setShowTechnicalScoreDialog}>
 <DialogContent className="max-w-2xl">
 <DialogHeader>
 <DialogTitle>{isRTL ? 'تعيين درجات الامتثال الفني' : 'Set Technical Compliance Scores'}</DialogTitle>
 </DialogHeader>
 <div className="space-y-4">
 <p className="text-sm text-muted-foreground">
 Rate each supplier's technical compliance on a scale of 1-5 (1 = Poor, 5 = Excellent)
 </p>
 {suppliers.map((supplier: any) => (
 <div key={supplier.id} className="space-y-2">
 <Label>{supplier.supplierName}</Label>
 <div className="flex items-center gap-4">
 <Input
 type="number"
 min="1"
 max="5"
 step="0.1"
 value={technicalScoreInput[supplier.id] || supplier.technicalScore || ""}
 onChange={(e) => setTechnicalScoreInput(prev => ({
 ...prev,
 [supplier.id]: e.target.value
 }))}
 className="w-32"
 placeholder="1-5"
 />
 <span className="text-sm text-muted-foreground">
 Current: {supplier.technicalScore?.toFixed(2) || "Not set"}
 </span>
 </div>
 </div>
 ))}
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowTechnicalScoreDialog(false)}>
 Cancel
 </Button>
 <Button onClick={() => {
 // Save technical scores for all suppliers
 suppliers.forEach((supplier: any) => {
 const score = technicalScoreInput[supplier.id];
 if (score) {
 updateOffer.mutate({
 supplierId: supplier.id,
 lineItemPrices: supplier.lineOffers?.map((item: any) => ({
 lineItemId: item.lineItemId,
 unitPrice: parseFloat(item.unitPrice || "0"),
 })) || [],
 technicalScore: parseFloat(score),
 });
 }
 });
 setShowTechnicalScoreDialog(false);
 setTechnicalScoreInput({});
 }}>
 Save Scores
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
