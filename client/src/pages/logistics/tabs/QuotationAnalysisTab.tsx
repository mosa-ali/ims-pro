/**
 * Quotation Analysis (QA) Tab - Full Implementation
 * For PRs ≤ $25,000 only
 * Features: Supplier offer matrix, financial scoring, selection with justification
 * Bilingual EN/AR support with RTL
 */
import { useTranslation } from '@/i18n/useTranslation';
import { useState, useMemo, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Printer, Scale, CheckCircle, Trash2, Calculator, Award, FileText, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@shared/currencyFormatter";

interface QuotationAnalysisTabProps {
 purchaseRequestId: number;
 prNumber?: string;
 prStatus?: string;
 lineItems?: any[];
 currency?: string;
}

export default function QuotationAnalysisTab({ purchaseRequestId, prNumber, prStatus, lineItems, currency = "USD" }: QuotationAnalysisTabProps) {
 const { language, isRTL} = useLanguage();
  const { t } = useTranslation();
 const currencyCode = (currency === "USD" ? "USD" : currency) as any;

 const [addSupplierOpen, setAddSupplierOpen] = useState(false);
 const [supplierForm, setSupplierForm] = useState({ name: "" });
 const [offerPrices, setOfferPrices] = useState<Record<string, Record<string, string>>>({});
 const [evaluationReport, setEvaluationReport] = useState("");

 // Fetch QA data
 const { data: qa, isLoading, refetch } = trpc.logistics.quotationAnalysis.getByPurchaseRequestId.useQuery(
 { purchaseRequestId },
 { enabled: !!purchaseRequestId }
 );

 // Initialize evaluationReport state with existing QA data
 useEffect(() => {
 if (qa?.evaluationReport) {
 setEvaluationReport(qa.evaluationReport);
 }
 }, [qa?.id]);

 // Mutations
 const autoCreateMutation = trpc.logistics.quotationAnalysis.autoCreate.useMutation({
 onSuccess: () => { toast.success(t.quotationAnalysisTab.qaCreated); refetch(); },
 onError: (e: any) => toast.error(`${t.quotationAnalysisTab.error}: ${e.message}`),
 });

 const addSupplierMutation = trpc.logistics.quotationAnalysis.addSupplier.useMutation({
 onSuccess: () => { toast.success(t.quotationAnalysisTab.supplierAdded); setAddSupplierOpen(false); setSupplierForm({ name: "", contactPerson: "", phone: "", email: "" }); refetch(); },
 onError: (e: any) => toast.error(`${t.quotationAnalysisTab.error}: ${e.message}`),
 });

 const updateOfferMutation = trpc.logistics.quotationAnalysis.updateSupplierOffer.useMutation({
 onSuccess: () => { toast.success(t.quotationAnalysisTab.offersSaved); refetch(); },
 onError: (e: any) => toast.error(`${t.quotationAnalysisTab.error}: ${e.message}`),
 });

 const calculateScoresMutation = trpc.logistics.quotationAnalysis.calculateScores.useMutation({
 onSuccess: () => { toast.success(t.quotationAnalysisTab.scoresCalculated); refetch(); },
 onError: (e: any) => toast.error(`${t.quotationAnalysisTab.error}: ${e.message}`),
 });

 const selectSupplierMutation = trpc.logistics.quotationAnalysis.selectSupplier.useMutation({
 onSuccess: () => { toast.success(t.quotationAnalysisTab.supplierSelected); refetch(); },
 onError: (e: any) => toast.error(`${t.quotationAnalysisTab.error}: ${e.message}`),
 });

 const approveMutation = trpc.logistics.quotationAnalysis.approve.useMutation({
 onSuccess: () => { toast.success(t.quotationAnalysisTab.qaApproved); refetch(); },
 });

 const recreateMutation = trpc.logistics.quotationAnalysis.recreateQA.useMutation({
 onSuccess: (data) => {
 toast.success("New QA created successfully");
 refetch();
 },
 onError: (error) => {
 toast.error(`Error: ${error.message}`);
 },
 });

 const handleCreateQA = () => {
 autoCreateMutation.mutate({ purchaseRequestId });
 };

 const handleAddSupplier = () => {
 if (!qa?.id) return;
 addSupplierMutation.mutate({
 quotationAnalysisId: qa.id,
 supplierName: supplierForm.name,
 });
 };

 // Backend expects: { supplierId, lineItemPrices: [{ lineItemId, unitPrice }] }
 const handleSaveOffers = (supplierId: number) => {
 if (!qa?.id) return;
 const supplierOffers = offerPrices[supplierId.toString()] || {};
 const lineItemPrices = Object.entries(supplierOffers)
 .filter(([_, v]) => v && parseFloat(v) > 0)
 .map(([lineItemId, unitPrice]) => ({
 lineItemId: parseInt(lineItemId),
 unitPrice: parseFloat(unitPrice) || 0,
 }));
 if (lineItemPrices.length === 0) return;

 updateOfferMutation.mutate({
 supplierId,
 lineItemPrices,
 });
 };

 const handleCalculateScores = () => {
 if (!qa?.id) return;
 calculateScoresMutation.mutate({ quotationAnalysisId: qa.id });
 };

 const handleSelectSupplier = (supplierId: number) => {
 if (!qa?.id) return;
 selectSupplierMutation.mutate({
 quotationAnalysisId: qa.id,
 supplierId,
 justification: evaluationReport || undefined,
 });
 };

 const handleApprove = () => {
 if (!qa.id) return;
 approveMutation.mutate({ quotationAnalysisId: qa.id, evaluationReport: evaluationReport || undefined });
 };

 const handleRecreateQA = () => {
 if (!qa.id) return;
 if (window.confirm("This will delete the current QA and create a new one with the latest RFQ suppliers. Continue?")) {
 recreateMutation.mutate({ quotationAnalysisId: qa.id });
 }
 };

 const handlePrint = () => {
 if (qa) {
 window.open(`/organization/logistics/quotation-analysis/${qa.id}/print`, '_blank');
 }
 };

 if (isLoading) {
 return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
 }

 // No QA exists - show create button
 if (!qa) {
 return (
 <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-xl font-bold">{t.quotationAnalysisTab.title}</h3>
 <p className="text-sm text-muted-foreground">{t.quotationAnalysisTab.subtitle}</p>
 </div>
 </div>
 <Card>
 <CardContent className="flex flex-col items-center justify-center py-16">
 <Scale className="h-16 w-16 text-gray-300 mb-4" />
 <h4 className="text-lg font-semibold text-gray-600 mb-2">{t.quotationAnalysisTab.noQA}</h4>
 <p className="text-sm text-muted-foreground mb-6">{t.quotationAnalysisTab.noQADesc}</p>
 <Button onClick={handleCreateQA} disabled={autoCreateMutation.isPending} className="gap-2">
 <Plus className="h-4 w-4" />
 {t.quotationAnalysisTab.createQA}
 </Button>
 </CardContent>
 </Card>
 </div>
 );
 }

 // Data from backend: qa.purchaseRequest.lineItems, qa.suppliers[].lineOffers, qa.suppliers[].totalAmount
 const qaSuppliers = qa.suppliers || [];
 const qaLineItems = qa.purchaseRequest?.lineItems || lineItems || [];
 const prTotalUSD = qa.purchaseRequest?.prTotalUsd || qa.purchaseRequest?.prTotalUSD || "0";

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-xl font-bold">{t.quotationAnalysisTab.title}</h3>
 <p className="text-sm text-muted-foreground">{t.quotationAnalysisTab.subtitle}</p>
 </div>
 <div className="flex items-center gap-3">
 <Badge variant={qa.status === "approved" ? "default" : "secondary"}>
 {qa.status === "approved" ? t.quotationAnalysisTab.approved : qa.status === "submitted" ? t.quotationAnalysisTab.submitted : t.quotationAnalysisTab.draft}
 </Badge>
 <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
 <Printer className="h-4 w-4" />
 {t.quotationAnalysisTab.print}
 </Button>
 </div>
 </div>

 {/* QA Info Card */}
 <Card>
 <CardContent className="py-4">
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <div>
 <label className="text-xs font-medium text-gray-500">{t.quotationAnalysisTab.qaNumber}</label>
 <div className="font-bold text-gray-900">{qa.qaNumber || `QA-${qa.id}`}</div>
 </div>
 <div>
 <label className="text-xs font-medium text-gray-500">{t.quotationAnalysisTab.status}</label>
 <div><Badge variant={qa.status === "approved" ? "default" : "secondary"}>{qa.status}</Badge></div>
 </div>
 <div>
 <label className="text-xs font-medium text-gray-500">{t.quotationAnalysisTab.suppliers}</label>
 <div className="font-bold">{qaSuppliers.length}</div>
 </div>
 <div>
 <label className="text-xs font-medium text-gray-500">{t.quotationAnalysisTab.total}</label>
 <div className="font-bold text-lg">{formatCurrency(Number(prTotalUSD), currencyCode)}</div>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Suppliers Section */}
 <Card>
 <CardHeader className="pb-3">
 <div className="flex items-center justify-between">
 <CardTitle className="text-lg">{t.quotationAnalysisTab.suppliers}</CardTitle>
 {/* Suppliers are automatically loaded from RFQ */}
 </div>
 </CardHeader>
 <CardContent>
 {qaSuppliers.length === 0 ? (
 <div className="text-center py-8 text-gray-500">
 <p>{t.quotationAnalysisTab.minSuppliers}</p>
 </div>
 ) : (
 <div className="space-y-2">
 {qaSuppliers.map((s: any, idx: number) => (
 <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
 {idx + 1}
 </div>
 <div>
 <div className="font-medium">{s.supplierName}</div>
 <div className="text-xs text-gray-500">{s.quoteReference || ""}</div>
 </div>
 </div>
 <div className="flex items-center gap-2">
 {s.isSelected && (
 <Badge className="bg-green-100 text-green-700 border-green-200">
 <Award className="h-3 w-3 me-1" />{t.quotationAnalysisTab.winner}
 </Badge>
 )}
 {s.financialScore != null && parseFloat(s.financialScore) > 0 && (
 <Badge variant="outline">{parseFloat(s.financialScore).toFixed(1)} pts</Badge>
 )}
 {s.totalAmount != null && parseFloat(s.totalAmount) > 0 && (
 <Badge variant="secondary">{formatCurrency(Number(s.totalAmount), currencyCode)}</Badge>
 )}
 </div>
 </div>
 ))}
 </div>
 )}
 </CardContent>
 </Card>

 {/* Offer Matrix */}
 {qaSuppliers.length > 0 && qaLineItems.length > 0 && (
 <Card>
 <CardHeader className="pb-3">
 <CardTitle className="text-lg">{t.quotationAnalysisTab.offerMatrix}</CardTitle>
 <p className="text-sm text-muted-foreground">Supplier quotes loaded automatically from RFQ</p>
 </CardHeader>
 <CardContent>
 <div className="overflow-x-auto">
 <table className="w-full border-collapse">
 <thead>
 <tr className="bg-gray-50 border-b-2 border-gray-200">
 <th className="px-3 py-2 text-start text-xs font-bold text-gray-600">#</th>
 <th className="px-3 py-2 text-start text-xs font-bold text-gray-600">{t.quotationAnalysisTab.description}</th>
 <th className="px-3 py-2 text-center text-xs font-bold text-gray-600">{t.quotationAnalysisTab.qty}</th>
 <th className="px-3 py-2 text-center text-xs font-bold text-gray-600">{t.quotationAnalysisTab.unit}</th>
 <th className="px-3 py-2 text-end text-xs font-bold text-gray-600">{t.quotationAnalysisTab.prUnitPrice}</th>
 {qaSuppliers.map((s: any) => (
 <th key={s.id} className="px-3 py-2 text-end text-xs font-bold text-blue-700 min-w-[120px]">
 {s.supplierName}
 </th>
 ))}
 </tr>
 </thead>
 <tbody>
 {qaLineItems.map((item: any, idx: number) => (
 <tr key={item.id || idx} className="border-b border-gray-100 hover:bg-gray-50">
 <td className="px-3 py-2 text-sm">{item.lineNumber || idx + 1}</td>
 <td className="px-3 py-2 text-sm font-medium">{item.description}</td>
 <td className="px-3 py-2 text-sm text-center">{item.quantity}</td>
 <td className="px-3 py-2 text-sm text-center">{item.unit}</td>
 <td className="px-3 py-2 text-sm text-end text-gray-500">{formatCurrency(Number(item.unitPrice || 0), currencyCode)}</td>
 {qaSuppliers.map((s: any) => {
 const existingOffer = s.lineOffers?.find((o: any) => o.lineItemId === item.id);
 return (
 <td key={s.id} className="px-3 py-2 text-center">
 <div className="text-sm font-medium">
 {existingOffer ? formatCurrency(Number(existingOffer.unitPrice), currencyCode) : formatCurrency(0, currencyCode)}
 </div>
 </td>
 );
 })}
 </tr>
 ))}
 {/* Totals Row */}
 <tr className="bg-gray-50 border-t-2 border-gray-300 font-bold">
 <td colSpan={5} className="px-3 py-3 text-sm text-end">{t.quotationAnalysisTab.total}:</td>
 {qaSuppliers.map((s: any) => (
 <td key={s.id} className="px-3 py-3 text-sm text-center text-blue-700">
 {s.totalAmount != null && parseFloat(s.totalAmount) > 0
 ? formatCurrency(Number(s.totalAmount), currencyCode)
 : "-"}
 </td>
 ))}
 </tr>
 </tbody>
 </table>
 </div>
 {/* Offers are automatically loaded from RFQ - read-only */}
 </CardContent>
 </Card>
 )}

 {/* Financial Scoring */}
 {qaSuppliers.length >= 2 && (
 <Card>
 <CardHeader className="pb-3">
 <div className="flex items-center justify-between">
 <div>
 <CardTitle className="text-lg">{t.quotationAnalysisTab.scoring}</CardTitle>
 <p className="text-sm text-muted-foreground">{t.quotationAnalysisTab.scoringDesc}</p>
 </div>
 {qa.status !== "approved" && (
 <Button size="sm" onClick={handleCalculateScores} disabled={calculateScoresMutation.isPending} className="gap-2">
 <Calculator className="h-4 w-4" />
 {t.quotationAnalysisTab.calculateScores}
 </Button>
 )}
 </div>
 </CardHeader>
 <CardContent>
 <div className="overflow-x-auto">
 <table className="w-full border-collapse">
 <thead>
 <tr className="bg-gray-50 border-b-2 border-gray-200">
 <th className="px-4 py-2 text-start text-xs font-bold text-gray-600">{t.quotationAnalysisTab.rank}</th>
 <th className="px-4 py-2 text-start text-xs font-bold text-gray-600">{t.quotationAnalysisTab.supplierName}</th>
 <th className="px-4 py-2 text-end text-xs font-bold text-gray-600">{t.quotationAnalysisTab.totalOffer}</th>
 <th className="px-4 py-2 text-end text-xs font-bold text-gray-600">{t.quotationAnalysisTab.financialScore}</th>
 <th className="px-4 py-2 text-center text-xs font-bold text-gray-600">{t.quotationAnalysisTab.status}</th>
 {qa.status !== "approved" && (
 <th className="px-4 py-2 text-center text-xs font-bold text-gray-600"></th>
 )}
 </tr>
 </thead>
 <tbody>
 {[...qaSuppliers]
 .sort((a: any, b: any) => {
 const scoreA = parseFloat(a.financialScore || "0");
 const scoreB = parseFloat(b.financialScore || "0");
 return scoreB - scoreA; // Higher score first
 })
 .map((s: any, idx: number) => (
 <tr key={s.id} className={`border-b border-gray-100 ${s.isSelected ? "bg-green-50" : "hover:bg-gray-50"}`}>
 <td className="px-4 py-3 text-sm font-bold">
 {parseFloat(s.financialScore || "0") > 0 ? `#${idx + 1}` : "-"}
 </td>
 <td className="px-4 py-3 text-sm font-medium">
 {s.supplierName}
 {s.isSelected && <Award className="inline h-4 w-4 text-green-600 ms-2" />}
 </td>
 <td className="px-4 py-3 text-sm text-end font-medium">
 {s.totalAmount != null && parseFloat(s.totalAmount) > 0
 ? formatCurrency(Number(s.totalAmount), currencyCode)
 : "-"}
 </td>
 <td className="px-4 py-3 text-sm text-end">
 {s.financialScore != null && parseFloat(s.financialScore) > 0 ? (
 <span className={`font-bold ${parseFloat(s.financialScore) >= 80 ? "text-green-600" : parseFloat(s.financialScore) >= 50 ? "text-yellow-600" : "text-red-600"}`}>
 {parseFloat(s.financialScore).toFixed(1)}
 </span>
 ) : "-"}
 </td>
 <td className="px-4 py-3 text-center">
 {s.isSelected ? (
 <Badge className="bg-green-100 text-green-700">{t.quotationAnalysisTab.winner}</Badge>
 ) : (
 <Badge variant="outline">{parseFloat(s.financialScore || "0") > 0 ? `#${idx + 1}` : "-"}</Badge>
 )}
 </td>
 {qa.status !== "approved" && (
 <td className="px-4 py-3 text-center">
 {!s.isSelected && parseFloat(s.financialScore || "0") > 0 && (
 <Button size="sm" variant="outline" onClick={() => handleSelectSupplier(s.id)} disabled={selectSupplierMutation.isPending}>
 <CheckCircle className="h-4 w-4 me-1" />
 {t.quotationAnalysisTab.selectSupplier}
 </Button>
 )}
 </td>
 )}
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </CardContent>
 </Card>
 )}

 {/* Evaluation Report Section - Editable */}
 {qaSuppliers.length > 0 && (
 <Card>
 <CardHeader className="pb-3">
 <CardTitle className="text-lg flex items-center gap-2">
 <FileText className="h-5 w-5 text-blue-500" />
 {t.quotationAnalysisTab.evaluationReport}
 </CardTitle>
 <p className="text-sm text-muted-foreground">{t.quotationAnalysisTab.evaluationReportDesc}</p>
 </CardHeader>
 <CardContent>
 <div className="space-y-3">
 {qaSuppliers.some((s: any) => s.isSelected) && (
 <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
 <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
 {t.quotationAnalysisTab.selection}: {qaSuppliers.find((s: any) => s.isSelected)?.supplierName}
 </p>
 </div>
 )}
 <Textarea
 value={evaluationReport}
 onChange={(e) => setEvaluationReport(e.target.value)}
 placeholder={qaSuppliers.some((s: any) => s.isSelected) ? `The supplier ${qaSuppliers.find((s: any) => s.isSelected)?.supplierName} was selected for the following reasons...` : "Select a supplier first to add evaluation report"}
 rows={5}
 className="resize-none"
 disabled={qa.status === "approved" || !qaSuppliers.some((s: any) => s.isSelected)}
 />
 </div>
 </CardContent>
 </Card>
 )}

 {/* Action Buttons */}
 <div className="flex justify-end gap-3 pt-4 border-t">
 {qa.status !== "approved" && qaSuppliers.some((s: any) => s.isSelected) && (
 <Button onClick={handleApprove} disabled={approveMutation.isPending} className="gap-2 bg-green-600 hover:bg-green-700">
 <CheckCircle className="h-4 w-4" />
 {t.quotationAnalysisTab.approve}
 </Button>
 )}
 </div>
 </div>
 );
}
