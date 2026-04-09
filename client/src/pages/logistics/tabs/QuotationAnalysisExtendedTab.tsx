/**
 * Extended Quotation Analysis (QA) Tab - For PRs $5,001-$25,000
 * Features: Supplier offer matrix, financial scoring + multi-criteria scoring
 * Bilingual EN/AR support with RTL
 */
import { useTranslation } from '@/i18n/useTranslation';
import { useState, useMemo, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Printer, Scale, CheckCircle, Calculator, Award, FileText, TrendingUp } from "lucide-react";
import { formatCurrency } from "@shared/currencyFormatter";

interface QuotationAnalysisExtendedTabProps {
 purchaseRequestId: number;
 prNumber?: string;
 prStatus?: string;
 lineItems?: any[];
 currency?: string;
}

interface VendorScore {
 supplierId: string;
 supplierName: string;
 priceScore: number;
 deliveryScore: number;
 warrantyScore: number;
 technicalScore: number;
 totalScore: number;
 rank: number;
 isWinner: boolean;
}

export default function QuotationAnalysisExtendedTab({
 purchaseRequestId,
 prNumber,
 prStatus,
 lineItems,
 currency = "USD",
}: QuotationAnalysisExtendedTabProps) {
 const { language, isRTL} = useLanguage();
  const { t } = useTranslation();
 const currencyCode = (currency === "USD" ? "USD" : currency) as any;

 const [vendorScores, setVendorScores] = useState<VendorScore[]>([]);
 const [scoresCalculated, setScoresCalculated] = useState(false);
 const [evaluationReport, setEvaluationReport] = useState("");

 // Load QA data
 const { data: qa, isLoading, refetch } = trpc.logistics.quotationAnalysis.getByPurchaseRequestId.useQuery(
 { purchaseRequestId },
 { enabled: !!purchaseRequestId }
 );

 // Initialize evaluationReport from QA data
 useEffect(() => {
 if (qa?.evaluationReport) {
 setEvaluationReport(qa.evaluationReport);
 }
 }, [qa?.id]);

 // Auto-load saved scores when QA form opens (Issue 2 fix)
 useEffect(() => {
 if (!qa?.suppliers || qa.suppliers.length === 0) return;

 // Check if any supplier has scores saved (priceScore exists means scores were calculated)
 const hasScores = qa.suppliers.some((s: any) => s.priceScore !== null && s.priceScore !== undefined);

 if (hasScores) {
 // Load saved scores and display them automatically
 const scoredSuppliers = qa.suppliers
 .filter((s: any) => s.priceScore !== null)
 .sort((a: any, b: any) => (b.weightedTotalScore || 0) - (a.weightedTotalScore || 0))
 .map((supplier: any, index: number) => ({
 supplierId: supplier.supplierId,
 supplierName: supplier.supplierName,
 priceScore: supplier.priceScore,
 deliveryScore: supplier.deliveryScore,
 warrantyScore: supplier.warrantyScore,
 technicalScore: supplier.technicalCriterionScore,
 totalScore: supplier.weightedTotalScore,
 rank: index + 1,
 isWinner: supplier.supplierId === qa.selectedSupplierId, // Use saved winner selection
 }));

 setVendorScores(scoredSuppliers);
 setScoresCalculated(true);
 }
 }, [qa?.suppliers, qa?.selectedSupplierId]);

 // Create QA mutation
 const createQAMutation = trpc.logistics.quotationAnalysis.autoCreate.useMutation({
 onSuccess: () => {
 toast.success(t.quotationAnalysisExtendedTab.qaCreated);
 refetch();
 },
 onError: (error: any) => {
 toast.error(error.message || t.quotationAnalysisExtendedTab.error);
 },
 });

 // Load suppliers from RFQ mutation
 const loadFromRFQMutation = trpc.logistics.quotationAnalysis.autoLoadRFQSuppliers.useMutation({
 onSuccess: () => {
 toast.success(t.quotationAnalysisExtendedTab.suppliersLoaded);
 refetch();
 },
 onError: (error: any) => {
 toast.error(error.message || "Failed to load suppliers");
 },
 });

 // Select winner mutation
 const selectWinnerMutation = trpc.logistics.quotationAnalysis.selectWinner.useMutation({
 onMutate: (variables) => {
 // Optimistically update vendorScores to show winner badge immediately
 setVendorScores((prevScores) =>
 prevScores.map((vendor) => ({
 ...vendor,
 isWinner: vendor.supplierId === variables.supplierId,
 }))
 );
 },
 onSuccess: () => {
 toast.success("Winner selected successfully");
 refetch();
 },
 onError: (error: any) => {
 toast.error(error.message || "Failed to select winner");
 refetch();
 },
 });

 // Calculate multi-criteria scores mutation
 const calculateScoresMutation = trpc.logistics.quotationAnalysis.calculateMultiCriteriaScores.useMutation({
 onSuccess: (scoredSuppliers) => {
 // Backend returns array of scored suppliers directly (already sorted by weightedTotalScore)
 // DO NOT auto-assign winner - user must manually select (Issue 3 fix)
 const vendorScoresWithRank = scoredSuppliers.map((supplier: any, index: number) => ({
 supplierId: supplier.supplierId,
 supplierName: supplier.supplierName,
 priceScore: supplier.priceScore,
 deliveryScore: supplier.deliveryScore,
 warrantyScore: supplier.warrantyScore,
 technicalScore: supplier.technicalCriterionScore,
 totalScore: supplier.weightedTotalScore,
 rank: index + 1,
 isWinner: supplier.supplierId === qa?.selectedSupplierId, // Use saved winner selection
 }));

 setVendorScores(vendorScoresWithRank);
 setScoresCalculated(true);
 toast.success(t.quotationAnalysisExtendedTab.scoresCalculated);
 },
 onError: (error: any) => {
 toast.error(error.message || t.quotationAnalysisExtendedTab.error);
 },
 });

 // Approve QA mutation
 const approveMutation = trpc.logistics.quotationAnalysis.approve.useMutation({
 onSuccess: () => {
 toast.success(t.quotationAnalysisExtendedTab.qaApproved);
 refetch();
 },
 onError: (error: any) => {
 toast.error(error.message || t.quotationAnalysisExtendedTab.error);
 },
 });

 const handleCreateQA = () => {
 createQAMutation.mutate({ purchaseRequestId });
 };

 const handleApprove = () => {
 if (!qa?.id) return;
 approveMutation.mutate({
 quotationAnalysisId: qa.id,
 evaluationReport: evaluationReport || undefined,
 });
 };

 const handleCalculateScores = () => {
 if (!qa?.id) return;
 calculateScoresMutation.mutate({ qaId: qa.id });
 };

 if (isLoading) {
 return (
 <div className="flex items-center justify-center py-12" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
 </div>
 );
 }

 // No QA exists - show create button
 if (!qa) {
 return (
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-xl font-bold">{t.quotationAnalysisExtendedTab.title}</h3>
 <p className="text-sm text-muted-foreground">{t.quotationAnalysisExtendedTab.subtitle}</p>
 </div>
 </div>
 <Card>
 <CardContent className="flex flex-col items-center justify-center py-16">
 <Scale className="h-16 w-16 text-gray-300 mb-4" />
 <h4 className="text-lg font-semibold text-gray-600 mb-2">{t.quotationAnalysisExtendedTab.noQA}</h4>
 <p className="text-sm text-muted-foreground mb-6">{t.quotationAnalysisExtendedTab.noQADesc}</p>
 <Button onClick={handleCreateQA} disabled={createQAMutation.isPending} className="gap-2">
 <Plus className="h-4 w-4" />
 {t.quotationAnalysisExtendedTab.createQA}
 </Button>
 </CardContent>
 </Card>
 </div>
 );
 }

 // QA exists - show full form
 const qaSuppliers = qa.suppliers || [];
 const qaLineItems = qa.purchaseRequest?.lineItems || lineItems || [];
 const prTotalUSD = qa.purchaseRequest?.prTotalUsd || qa.purchaseRequest?.prTotalUSD || "0";

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-xl font-bold">{t.quotationAnalysisExtendedTab.title}</h3>
 <p className="text-sm text-muted-foreground">{t.quotationAnalysisExtendedTab.subtitle}</p>
 </div>
 <div className="flex items-center gap-3">
 <Badge variant={qa.status === "approved" ? "default" : "secondary"}>
 {qa.status === "approved" ? t.quotationAnalysisExtendedTab.approved : qa.status === "submitted" ? t.quotationAnalysisExtendedTab.submitted : t.quotationAnalysisExtendedTab.draft}
 </Badge>
 <Button 
 variant="outline" 
 size="sm" 
 className="gap-2"
 onClick={() => {
 if (qa?.id) {
 window.open(`/organization/logistics/quotation-analysis-extended/${qa.id}/print`, '_blank');
 }
 }}
 >
 <Printer className="h-4 w-4" />
 {t.quotationAnalysisExtendedTab.print}
 </Button>
 </div>
 </div>

 {/* QA Info Card */}
 <Card>
 <CardContent className="py-4">
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <div>
 <label className="text-xs font-medium text-gray-500">{t.quotationAnalysisExtendedTab.qaNumber}</label>
 <div className="font-bold text-gray-900">{qa.qaNumber || `QA-${qa.id}`}</div>
 </div>
 <div>
 <label className="text-xs font-medium text-gray-500">{t.quotationAnalysisExtendedTab.status}</label>
 <div><Badge variant={qa.status === "approved" ? "default" : "secondary"}>{qa.status}</Badge></div>
 </div>
 <div>
 <label className="text-xs font-medium text-gray-500">{t.quotationAnalysisExtendedTab.suppliers}</label>
 <div className="font-bold">{qaSuppliers.length}</div>
 </div>
 <div>
 <label className="text-xs font-medium text-gray-500">{t.quotationAnalysisExtendedTab.total}</label>
 <div className="font-bold text-lg">{formatCurrency(Number(prTotalUSD), currencyCode)}</div>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Suppliers Section */}
 <Card>
 <CardHeader className="pb-3">
 <CardTitle className="text-lg">{t.quotationAnalysisExtendedTab.suppliers}</CardTitle>
 </CardHeader>
 <CardContent>
 {qaSuppliers.length === 0 ? (
 <div className="text-center py-8 text-gray-500">
 <p>{t.quotationAnalysisExtendedTab.minSuppliers}</p>
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
 <Award className="h-3 w-3 me-1" />{t.quotationAnalysisExtendedTab.winner}
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
 <CardTitle className="text-lg">{t.quotationAnalysisExtendedTab.offerMatrix}</CardTitle>
 <p className="text-sm text-muted-foreground">Supplier quotes loaded automatically from RFQ</p>
 </CardHeader>
 <CardContent>
 <div className="overflow-x-auto">
 <table className="w-full border-collapse">
 <thead>
 <tr className="bg-gray-50 border-b-2 border-gray-200">
 <th className="px-3 py-2 text-start text-xs font-bold text-gray-600">#</th>
 <th className="px-3 py-2 text-start text-xs font-bold text-gray-600">{t.quotationAnalysisExtendedTab.description}</th>
 <th className="px-3 py-2 text-center text-xs font-bold text-gray-600">{t.quotationAnalysisExtendedTab.qty}</th>
 <th className="px-3 py-2 text-center text-xs font-bold text-gray-600">{t.quotationAnalysisExtendedTab.unit}</th>
 <th className="px-3 py-2 text-end text-xs font-bold text-gray-600">{t.quotationAnalysisExtendedTab.prUnitPrice}</th>
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
 <td colSpan={5} className="px-3 py-3 text-sm text-end">{t.quotationAnalysisExtendedTab.total}:</td>
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
 </CardContent>
 </Card>
 )}

 {/* Multi-Criteria Scoring Section */}
 {qaSuppliers.length >= 2 && (
 <>
 {/* Scoring Weights */}
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <TrendingUp className="h-5 w-5" />
 {t.quotationAnalysisExtendedTab.multiCriteria}
 </CardTitle>
 <p className="text-sm text-muted-foreground">{t.quotationAnalysisExtendedTab.multiCriteriaDesc}</p>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <div className="space-y-2">
 <div className="text-sm font-semibold">{isRTL ? 'السعر' : 'Price'}</div>
 <div className="text-2xl font-bold text-blue-600">60%</div>
 <div className="text-xs text-muted-foreground">Total quoted amount</div>
 </div>
 <div className="space-y-2">
 <div className="text-sm font-semibold">{isRTL ? 'التسليم' : 'Delivery'}</div>
 <div className="text-2xl font-bold text-green-600">20%</div>
 <div className="text-xs text-muted-foreground">Delivery days</div>
 </div>
 <div className="space-y-2">
 <div className="text-sm font-semibold">{isRTL ? 'الضمان' : 'Warranty'}</div>
 <div className="text-2xl font-bold text-purple-600">10%</div>
 <div className="text-xs text-muted-foreground">Warranty months</div>
 </div>
 <div className="space-y-2">
 <div className="text-sm font-semibold">{isRTL ? 'فني' : 'Technical'}</div>
 <div className="text-2xl font-bold text-orange-600">10%</div>
 <div className="text-xs text-muted-foreground">Experience (3+ years)</div>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Vendors Evaluation Table */}
 <Card>
 <CardHeader>
 <div className="flex items-center justify-between">
 <div>
 <CardTitle>{t.quotationAnalysisExtendedTab.vendorsEvaluation}</CardTitle>
 <p className="text-sm text-muted-foreground">{t.quotationAnalysisExtendedTab.vendorsEvaluationDesc}</p>
 </div>
 <div className="flex gap-2">
 {qaSuppliers.length === 0 && (
 <Button
 onClick={() => loadFromRFQMutation.mutate({ quotationAnalysisId: qa?.id || "" })}
 disabled={loadFromRFQMutation.isPending}
 variant="outline"
 className="gap-2"
 >
 {loadFromRFQMutation.isPending ? (
 <>
 <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-current" />
 Loading...
 </>
 ) : (
 <>
 <Plus className="h-4 w-4" />
 Load Suppliers from RFQ
 </>
 )}
 </Button>
 )}
 <Button
 onClick={handleCalculateScores}
 disabled={calculateScoresMutation.isPending || !qaSuppliers.length}
 className="gap-2"
 >
 {calculateScoresMutation.isPending ? (
 <>
 <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-current" />
 Calculating...
 </>
 ) : (
 <>
 <Award className="h-4 w-4" />
 {t.quotationAnalysisExtendedTab.calculateScores}
 </>
 )}
 </Button>
 </div>
 </div>
 </CardHeader>
 <CardContent>
 {!scoresCalculated ? (
 <div className="flex items-center justify-center py-8 text-muted-foreground">
 Click "Calculate Scores" to evaluate suppliers
 </div>
 ) : vendorScores.length === 0 ? (
 <div className="flex items-center justify-center py-8 text-muted-foreground">
 No suppliers to evaluate
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full border-collapse">
 <thead>
 <tr className="bg-gray-50 border-b-2 border-gray-200">
 <th className="px-4 py-2 text-start text-xs font-bold text-gray-600">{isRTL ? 'الترتيب' : 'Rank'}</th>
 <th className="px-4 py-2 text-start text-xs font-bold text-gray-600">{isRTL ? 'المورد' : 'Supplier'}</th>
 <th className="px-4 py-2 text-end text-xs font-bold text-gray-600">{t.quotationAnalysisExtendedTab.priceScore}</th>
 <th className="px-4 py-2 text-end text-xs font-bold text-gray-600">{t.quotationAnalysisExtendedTab.deliveryScore}</th>
 <th className="px-4 py-2 text-end text-xs font-bold text-gray-600">{t.quotationAnalysisExtendedTab.warrantyScore}</th>
 <th className="px-4 py-2 text-end text-xs font-bold text-gray-600">{t.quotationAnalysisExtendedTab.technicalScore}</th>
 <th className="px-4 py-2 text-end text-xs font-bold text-gray-600">{isRTL ? 'الدرجة الكلية' : 'Total Score'}</th>
 <th className="px-4 py-2 text-center text-xs font-bold text-gray-600">{t.quotationAnalysisExtendedTab.status}</th>
 </tr>
 </thead>
 <tbody>
 {vendorScores.map((vendor) => (
 <tr
 key={vendor.supplierId}
 onClick={() => {
 if (!qa?.id) return;
 selectWinnerMutation.mutate({
 quotationAnalysisId: qa.id,
 supplierId: vendor.supplierId,
 });
 }}
 className={`border-b border-gray-100 cursor-pointer transition-colors ${ vendor.isWinner ? "bg-green-50" : "hover:bg-gray-50" }`}
 >
 <td className="px-4 py-3 text-sm font-bold">#{vendor.rank}</td>
 <td className="px-4 py-3 text-sm font-medium">
 {vendor.supplierName}
 {vendor.isWinner && <Award className="inline h-4 w-4 text-green-600 ms-2" />}
 </td>
 <td className="px-4 py-3 text-sm text-end">
 <div className="font-semibold">{typeof vendor.priceScore === 'number' ? vendor.priceScore.toFixed(1) : "-"}</div>
 <div className="text-xs text-muted-foreground">
 {typeof vendor.priceScore === 'number' ? `${(vendor.priceScore * 0.6).toFixed(1)}` : "-"}
 </div>
 </td>
 <td className="px-4 py-3 text-sm text-end">
 <div className="font-semibold">{typeof vendor.deliveryScore === 'number' ? vendor.deliveryScore.toFixed(1) : "-"}</div>
 <div className="text-xs text-muted-foreground">
 {typeof vendor.deliveryScore === 'number' ? `${(vendor.deliveryScore * 0.2).toFixed(1)}` : "-"}
 </div>
 </td>
 <td className="px-4 py-3 text-sm text-end">
 <div className="font-semibold">{typeof vendor.warrantyScore === 'number' ? vendor.warrantyScore.toFixed(1) : "-"}</div>
 <div className="text-xs text-muted-foreground">
 {typeof vendor.warrantyScore === 'number' ? `${(vendor.warrantyScore * 0.1).toFixed(1)}` : "-"}
 </div>
 </td>
 <td className="px-4 py-3 text-sm text-end">
 <div className="font-semibold">{typeof vendor.technicalScore === 'number' ? vendor.technicalScore.toFixed(1) : "-"}</div>
 <div className="text-xs text-muted-foreground">
 {typeof vendor.technicalScore === 'number' ? `${(vendor.technicalScore * 0.1).toFixed(1)}` : "-"}
 </div>
 </td>
 <td className="px-4 py-3 text-sm text-end">
 <div className="text-lg font-bold text-primary">
 {typeof vendor.totalScore === 'number' ? vendor.totalScore.toFixed(1) : "-"}
 </div>
 </td>
 <td className="px-4 py-3 text-center">
 {vendor.isWinner && (
 <Badge className="bg-green-600 hover:bg-green-700 gap-1">
 <Award className="h-3 w-3" />
 Winner
 </Badge>
 )}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </CardContent>
 </Card>

 {/* Evaluation Report Section */}
 {scoresCalculated && vendorScores.length > 0 && (
 <Card>
 <CardHeader className="pb-3">
 <CardTitle className="text-lg flex items-center gap-2">
 <FileText className="h-5 w-5 text-blue-500" />
 {t.quotationAnalysisExtendedTab.evaluationReport}
 </CardTitle>
 <p className="text-sm text-muted-foreground">{t.quotationAnalysisExtendedTab.evaluationReportDesc}</p>
 </CardHeader>
 <CardContent>
 <div className="space-y-3">
 {vendorScores.some((v) => v.isWinner) && (
 <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
 <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
 {t.quotationAnalysisExtendedTab.selection}: {vendorScores.find((v) => v.isWinner)?.supplierName}
 </p>
 </div>
 )}
 <Textarea
 value={evaluationReport}
 onChange={(e) => setEvaluationReport(e.target.value)}
 placeholder={
 vendorScores.some((v) => v.isWinner)
 ? `The supplier ${vendorScores.find((v) => v.isWinner)?.supplierName} was selected for the following reasons...`
 : "Winner will be automatically determined after calculating scores"
 }
 rows={5}
 className="resize-none"
 disabled={qa?.status === "approved" || !vendorScores.some((v) => v.isWinner)}
 />
 </div>
 </CardContent>
 </Card>
 )}

 {/* Action Buttons */}
 {scoresCalculated && vendorScores.some((v) => v.isWinner) && qa?.status !== "approved" && (
 <div className="flex justify-end gap-3 pt-4 border-t">
 <Button
 onClick={handleApprove}
 disabled={approveMutation.isPending}
 className="gap-2 bg-green-600 hover:bg-green-700"
 >
 <CheckCircle className="h-4 w-4" />
 {t.quotationAnalysisExtendedTab.approve}
 </Button>
 </div>
 )}
 </>
 )}
 </div>
 );
}
