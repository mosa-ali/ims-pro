/**
 * Bid Analysis (BA/CBA) Tab - Full Implementation
 * For PRs > $25,000 only (Tender process)
 * Features: Tender Information Tab, bidder tracking, 70% technical threshold, financial scoring
 * ✅ Auto-populates bidder prices from Supplier Quotation Entry data
 * ✅ Line-item level comparison across bidders
 * ✅ Quotation discrepancy alerts
 * Bilingual EN/AR support with RTL
 */
import { useTranslation } from '@/i18n/useTranslation';
import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Plus, Printer, Scale, CheckCircle, Calculator, Award, AlertTriangle,
  Megaphone, Users, FileText, Lock, RefreshCw, FileSpreadsheet, ArrowDownToLine,
  ChevronDown, ChevronUp, TriangleAlert, Table2
} from "lucide-react";

interface BidAnalysisTabProps { purchaseRequestId: number; prNumber?: string; prStatus?: string; currency?: string; }

export default function BidAnalysisTab({ purchaseRequestId, prNumber, currency = "USD" }: BidAnalysisTabProps) {
 const { language, isRTL} = useLanguage();
  const { t } = useTranslation();

 const [addBidderOpen, setAddBidderOpen] = useState(false);
 const [bidderForm, setBidderForm] = useState({ name: "", contactPerson: "", phone: "", email: "", totalBidAmount: "", submissionDate: "", bidReference: "" });
 const [tenderForm, setTenderForm] = useState({
 announcementReference: "",
 announcementChannel: "" as "" | "website" | "newspaper" | "donor_portal" | "other",
 announcementStartDate: "",
 announcementEndDate: "",
 announcementLink: "",
 });
 const [technicalScores, setTechnicalScores] = useState<Record<number, string>>({});
 const [justification, setJustification] = useState("");
 const [activeSubTab, setActiveSubTab] = useState("tender-info");
 const [lineComparisonOpen, setLineComparisonOpen] = useState(false);

 const { data: ba, isLoading, refetch } = trpc.logistics.bidAnalysis.getByPurchaseRequestId.useQuery(
 { purchaseRequestId }, { enabled: !!purchaseRequestId, retry: false }
 );

 // ✅ Fetch supplier quotation totals per bidder
 const stablePrId = useMemo(() => purchaseRequestId, [purchaseRequestId]);
 const { data: quotationTotals, refetch: refetchQuotations } = trpc.logistics.bidAnalysis.getQuotationTotals.useQuery(
   { purchaseRequestId: stablePrId },
   { enabled: !!stablePrId && !!ba }
 );

 // ✅ Fetch line-item level comparison data
 const { data: lineComparison } = trpc.logistics.bidAnalysis.getQuotationLineComparison.useQuery(
   { purchaseRequestId: stablePrId },
   { enabled: !!stablePrId && !!ba && lineComparisonOpen }
 );

 const autoCreateMutation = trpc.logistics.bidAnalysis.autoCreate.useMutation({
 onSuccess: () => { toast.success(t.bidAnalysisTab.baCreated); refetch(); },
 onError: (e: any) => toast.error(`${t.bidAnalysisTab.error}: ${e.message}`),
 });
 const updateTenderMutation = trpc.logistics.bidAnalysis.updateTenderInformation.useMutation({
 onSuccess: () => { toast.success(t.bidAnalysisTab.tenderInfoSaved); refetch(); },
 onError: (e: any) => toast.error(`${t.bidAnalysisTab.error}: ${e.message}`),
 });
 const addBidderMutation = trpc.logistics.bidAnalysis.addBidder.useMutation({
 onSuccess: (result: any) => {
   if (result?.autoSyncedFromQuotation) {
     toast.success(t.bidAnalysisTab.bidderAddedAutoSynced);
   } else {
     toast.success(t.bidAnalysisTab.bidderAdded);
   }
   setAddBidderOpen(false);
   setBidderForm({ name: "", contactPerson: "", phone: "", email: "", totalBidAmount: "", submissionDate: "", bidReference: "" });
   refetch();
   refetchQuotations();
 },
 onError: (e: any) => toast.error(`${t.bidAnalysisTab.error}: ${e.message}`),
 });
 const updateTechnicalMutation = trpc.logistics.bidAnalysis.updateBidderTechnicalScore.useMutation({
 onSuccess: () => { toast.success(t.bidAnalysisTab.technicalUpdated); refetch(); },
 onError: (e: any) => toast.error(`${t.bidAnalysisTab.error}: ${e.message}`),
 });
 const calculateFinancialMutation = trpc.logistics.bidAnalysis.calculateFinancialScores.useMutation({
 onSuccess: () => { toast.success(t.bidAnalysisTab.financialCalculated); refetch(); },
 onError: (e: any) => toast.error(`${t.bidAnalysisTab.error}: ${e.message}`),
 });
 const selectBidderMutation = trpc.logistics.bidAnalysis.selectBidder.useMutation({
 onSuccess: () => { toast.success(t.bidAnalysisTab.bidderSelected); refetch(); },
 onError: (e: any) => toast.error(`${t.bidAnalysisTab.error}: ${e.message}`),
 });
 const approveMutation = trpc.logistics.bidAnalysis.approve.useMutation({
 onSuccess: () => { toast.success(t.bidAnalysisTab.baApproved); refetch(); },
 onError: (e: any) => toast.error(`${t.bidAnalysisTab.error}: ${e.message}`),
 });

 // PCE: Fetch Supplier Offer Matrix (bid_analysis_line_items)
 const stableBAId = useMemo(() => ba?.id ?? 0, [ba?.id]);
 const { data: supplierOfferMatrix, refetch: refetchMatrix } = trpc.logistics.bidAnalysis.getSupplierOfferMatrix.useQuery(
   { bidAnalysisId: stableBAId },
   { enabled: !!ba?.id }
 );

 // PCE: Lowest price per line item in the Supplier Offer Matrix
 const matrixLowestByLine = useMemo(() => {
   if (!supplierOfferMatrix?.matrixRows) return {} as Record<number, number>;
   const result: Record<number, number> = {};
   for (const row of supplierOfferMatrix.matrixRows) {
     let lowest = Infinity;
     for (const bp of row.bidderPrices) {
       if (bp.unitPrice !== null && bp.unitPrice > 0 && bp.unitPrice < lowest) {
         lowest = bp.unitPrice;
       }
     }
     if (lowest < Infinity) result[row.prLineItemId] = lowest;
   }
   return result;
 }, [supplierOfferMatrix]);

 // PCE: Backfill bid_analysis_line_items from existing supplier_quotation_lines
 const backfillMutation = trpc.logistics.bidAnalysis.backfillLineItems.useMutation({
   onSuccess: (result) => {
     toast.success(
       `${(t.bidAnalysisTab as any).backfillSuccess}: ${result.totalRowsCreated} ${(t.bidAnalysisTab as any).backfillRows} ${result.biddersProcessed} ${(t.bidAnalysisTab as any).backfillBidders}`
     );
     refetchMatrix();
   },
   onError: (e: any) => toast.error(`${t.bidAnalysisTab.error}: ${e.message}`),
 });

 // ✅ Sync from quotations mutation
 const syncFromQuotationsMutation = trpc.logistics.bidAnalysis.syncFromQuotations.useMutation({
   onSuccess: (result) => {
     toast.success(
       `${t.bidAnalysisTab.quotationsSynced}: ${result.syncedCount}/${result.totalBidders} ${t.bidAnalysisTab.biddersUpdated}`
     );
     refetch();
     refetchQuotations();
   },
   onError: (e: any) => toast.error(`${t.bidAnalysisTab.error}: ${e.message}`),
 });

 if (isLoading) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

 if (!ba) {
 return (
 <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
 <div><h3 className="text-xl font-bold">{t.bidAnalysisTab.title}</h3><p className="text-sm text-muted-foreground">{t.bidAnalysisTab.subtitle}</p></div>
 <Card><CardContent className="flex flex-col items-center justify-center py-16">
 <Scale className="h-16 w-16 text-gray-300 mb-4" />
 <h4 className="text-lg font-semibold text-gray-600 mb-2">{t.bidAnalysisTab.noBA}</h4>
 <p className="text-sm text-muted-foreground mb-6">{t.bidAnalysisTab.noBADesc}</p>
 <Button onClick={() => autoCreateMutation.mutate({ purchaseRequestId })} disabled={autoCreateMutation.isPending} className="gap-2">
 <Plus className="h-4 w-4" />{t.bidAnalysisTab.createBA}
 </Button>
 </CardContent></Card>
 </div>
 );
 }

 const baBidders = ba.bidders || [];
 const isAnnouncementClosed = ba.announcementEndDate ? new Date(ba.announcementEndDate) < new Date() : true;

 // ✅ Check how many bidders have quotation data
 const biddersWithQuotations = baBidders.filter(
   (b: any) => quotationTotals && quotationTotals[b.id]
 ).length;
 const hasQuotationData = biddersWithQuotations > 0;

 // ✅ Check for discrepancies between bid amounts and quotation totals
 const discrepancies = useMemo(() => {
   if (!quotationTotals) return [];
   return baBidders
     .filter((b: any) => {
       const quotation = quotationTotals[b.id];
       if (!quotation) return false;
       const bidAmount = Number(b.totalBidAmount || 0);
       const quotationAmount = parseFloat(quotation.totalAmount);
       // Discrepancy if difference > $0.01
       return quotationAmount > 0 && Math.abs(bidAmount - quotationAmount) > 0.01;
     })
     .map((b: any) => ({
       bidderId: b.id,
       bidderName: b.bidderName,
       bidAmount: Number(b.totalBidAmount || 0),
       quotationAmount: parseFloat(quotationTotals[b.id].totalAmount),
     }));
 }, [baBidders, quotationTotals]);

 const hasDiscrepancies = discrepancies.length > 0;

 // ✅ Line-item comparison: find the lowest price per line item
 const lowestPriceByLine = useMemo(() => {
   if (!lineComparison?.lineItems) return {};
   const result: Record<number, number> = {};
   for (const item of lineComparison.lineItems) {
     let lowest = Infinity;
     for (const bidderId of Object.keys(item.bidders)) {
       const price = parseFloat(item.bidders[Number(bidderId)].unitPrice);
       if (price > 0 && price < lowest) lowest = price;
     }
     if (lowest < Infinity) result[item.prLineItemId] = lowest;
   }
   return result;
 }, [lineComparison]);

 const handleSaveTenderInfo = () => {
 if (!ba?.id) return;
 if (!tenderForm.announcementStartDate && !ba.announcementStartDate) {
 toast.error("Start date is required");
 return;
 }
 if (!tenderForm.announcementEndDate && !ba.announcementEndDate) {
 toast.error("End date is required");
 return;
 }
 const channel = (tenderForm.announcementChannel || ba.announcementChannel || "website") as "website" | "newspaper" | "donor_portal" | "other";
 updateTenderMutation.mutate({
 bidAnalysisId: ba.id,
 announcementStartDate: new Date(tenderForm.announcementStartDate || (ba.announcementStartDate ? new Date(ba.announcementStartDate).toISOString().split("T")[0] : "")),
 announcementEndDate: new Date(tenderForm.announcementEndDate || (ba.announcementEndDate ? new Date(ba.announcementEndDate).toISOString().split("T")[0] : "")),
 announcementChannel: channel,
 announcementLink: tenderForm.announcementLink || ba.announcementLink || undefined,
 announcementReference: tenderForm.announcementReference || ba.announcementReference || undefined,
 });
 };

 const handleAddBidder = () => {
 if (!ba?.id) return;
 addBidderMutation.mutate({
 bidAnalysisId: ba.id,
 bidderName: bidderForm.name,
 submissionDate: bidderForm.submissionDate ? new Date(bidderForm.submissionDate) : new Date(),
 totalBidAmount: parseFloat(bidderForm.totalBidAmount) || 0,
 bidReference: bidderForm.bidReference || undefined,
 });
 };

 const handleSyncFromQuotations = () => {
   if (!ba?.id) return;
   syncFromQuotationsMutation.mutate({ bidAnalysisId: ba.id });
 };

 return (
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <div><h3 className="text-xl font-bold">{t.bidAnalysisTab.title}</h3><p className="text-sm text-muted-foreground">{t.bidAnalysisTab.subtitle}</p></div>
 <div className="flex items-center gap-3">
 <Badge variant={ba.status === "awarded" ? "default" : "secondary"}>
 {ba.status === "awarded" ? t.bidAnalysisTab.approved : ba.status === "draft" ? t.bidAnalysisTab.draft : ba.status}
 </Badge>
 <Button variant="outline" size="sm" onClick={() => ba && window.open(`/organization/logistics/bid-analysis/${ba.id}/print`, '_blank')} className="gap-2"><Printer className="h-4 w-4" />{t.bidAnalysisTab.print}</Button>
 <Button variant="outline" size="sm" onClick={() => ba && window.open(`/organization/logistics/bid-evaluation-checklist/${ba.id}/print`, '_blank')} className="gap-2"><FileText className="h-4 w-4" />{t.bidAnalysisTab.printChecklist}</Button>
 </div>
 </div>

 <Card><CardContent className="py-4">
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <div><label className="text-xs font-medium text-gray-500">{t.bidAnalysisTab.baNumber}</label><div className="font-bold">{ba.cbaNumber || `BA-${ba.id}`}</div></div>
 <div><label className="text-xs font-medium text-gray-500">{t.bidAnalysisTab.status}</label><div><Badge variant={ba.status === "awarded" ? "default" : "secondary"}>{ba.status}</Badge></div></div>
 <div><label className="text-xs font-medium text-gray-500">{t.bidAnalysisTab.bidders}</label><div className="font-bold">{baBidders.length}</div></div>
 <div><label className="text-xs font-medium text-gray-500">{t.bidAnalysisTab.technicalThreshold}</label><div className="font-bold text-orange-600">70%</div></div>
 </div>
 </CardContent></Card>

 {/* ✅ Quotation Data Sync Banner */}
 {hasQuotationData && ba.status !== "awarded" && (
   <Card className="border-blue-200 bg-blue-50/50">
     <CardContent className="py-3">
       <div className="flex items-center justify-between">
         <div className="flex items-center gap-3">
           <FileSpreadsheet className="h-5 w-5 text-blue-600" />
           <div>
             <p className="text-sm font-medium text-blue-900">
               {t.bidAnalysisTab.quotationDataAvailable}
             </p>
             <p className="text-xs text-blue-600">
               {biddersWithQuotations} / {baBidders.length} {t.bidAnalysisTab.biddersHaveQuotations}
             </p>
           </div>
         </div>
         <Button
           size="sm"
           variant="outline"
           className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-100"
           onClick={handleSyncFromQuotations}
           disabled={syncFromQuotationsMutation.isPending}
         >
           {syncFromQuotationsMutation.isPending ? (
             <RefreshCw className="h-4 w-4 animate-spin" />
           ) : (
             <ArrowDownToLine className="h-4 w-4" />
           )}
           {t.bidAnalysisTab.syncFromQuotations}
         </Button>
       </div>
     </CardContent>
   </Card>
 )}

 {/* ✅ Discrepancy Alert Banner */}
 {hasDiscrepancies && ba.status !== "awarded" && (
   <Card className="border-amber-200 bg-amber-50/50">
     <CardContent className="py-3">
       <div className="flex items-start gap-3">
         <TriangleAlert className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
         <div className="flex-1">
           <p className="text-sm font-medium text-amber-900">
             {t.bidAnalysisTab.discrepancyAlert}
           </p>
           <p className="text-xs text-amber-700 mt-1">
             {t.bidAnalysisTab.discrepancyAlertDesc}
           </p>
           <div className="mt-2 space-y-1">
             {discrepancies.map((d) => (
               <div key={d.bidderId} className="flex items-center gap-2 text-xs">
                 <TriangleAlert className="h-3 w-3 text-amber-500" />
                 <span className="font-medium">{d.bidderName}:</span>
                 <span className="text-amber-800">
                   {t.bidAnalysisTab.currentBid}: {currency} {d.bidAmount.toLocaleString()}
                 </span>
                 <span className="text-muted-foreground">→</span>
                 <span className="text-blue-700">
                   {t.bidAnalysisTab.quotationTotal}: {currency} {d.quotationAmount.toLocaleString()}
                 </span>
                 <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-300 text-amber-700">
                   {d.quotationAmount > d.bidAmount ? "+" : ""}{((d.quotationAmount - d.bidAmount) / d.bidAmount * 100).toFixed(1)}%
                 </Badge>
               </div>
             ))}
           </div>
           <div className="mt-2">
             <Button
               size="sm"
               variant="outline"
               className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-100"
               onClick={handleSyncFromQuotations}
               disabled={syncFromQuotationsMutation.isPending}
             >
               <RefreshCw className="h-3.5 w-3.5" />
               {t.bidAnalysisTab.resyncToFix}
             </Button>
           </div>
         </div>
       </div>
     </CardContent>
   </Card>
 )}

 <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
 <TabsList className="grid w-full grid-cols-6">
 <TabsTrigger value="tender-info" className="gap-1 text-xs"><Megaphone className="h-3.5 w-3.5" />{t.bidAnalysisTab.tenderInfo}</TabsTrigger>
 <TabsTrigger value="bidders" className="gap-1 text-xs"><Users className="h-3.5 w-3.5" />{t.bidAnalysisTab.bidders}</TabsTrigger>
 <TabsTrigger value="offer-matrix" className="gap-1 text-xs">
   <Table2 className="h-3.5 w-3.5" />{(t.bidAnalysisTab as any).supplierOfferMatrix || 'Offer Matrix'}
   {supplierOfferMatrix?.hasData && (
     <span className="ms-1 inline-flex items-center justify-center rounded-full bg-green-500 text-white text-[9px] w-4 h-4">✓</span>
   )}
 </TabsTrigger>
 <TabsTrigger value="line-comparison" className="gap-1 text-xs">
   <Table2 className="h-3.5 w-3.5" />{t.bidAnalysisTab.lineComparison}
 </TabsTrigger>
 <TabsTrigger value="evaluation" className="gap-1 text-xs"><Scale className="h-3.5 w-3.5" />{t.bidAnalysisTab.evaluation}</TabsTrigger>
 <TabsTrigger value="results" className="gap-1 text-xs"><Award className="h-3.5 w-3.5" />{t.bidAnalysisTab.results}</TabsTrigger>
 </TabsList>

 {/* Tender Information */}
 <TabsContent value="tender-info">
 <Card><CardHeader><CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5" />{t.bidAnalysisTab.tenderInfo}</CardTitle></CardHeader>
 <CardContent className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.bidAnalysisTab.announcementRef}</Label>
 <Input
 value={tenderForm.announcementReference || ba.announcementReference || ""}
 onChange={(e) => setTenderForm(p => ({ ...p, announcementReference: e.target.value }))}
 disabled={ba.status === "awarded"}
 />
 </div>
 <div>
 <Label>{t.bidAnalysisTab.announcementChannel}</Label>
 <Select
 value={tenderForm.announcementChannel || ba.announcementChannel || ""}
 onValueChange={(v) => setTenderForm(p => ({ ...p, announcementChannel: v as any }))}
 disabled={ba.status === "awarded"}
 >
 <SelectTrigger><SelectValue placeholder={t.placeholders.selectChannel} /></SelectTrigger>
 <SelectContent>
 <SelectItem value="website">{t.bidAnalysisTab.channelWebsite}</SelectItem>
 <SelectItem value="newspaper">{t.bidAnalysisTab.channelNewspaper}</SelectItem>
 <SelectItem value="donor_portal">{t.bidAnalysisTab.channelDonorPortal}</SelectItem>
 <SelectItem value="other">{t.bidAnalysisTab.channelOther}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.bidAnalysisTab.announcementStartDate}</Label>
 <Input
 type="date"
 value={tenderForm.announcementStartDate || (ba.announcementStartDate ? new Date(ba.announcementStartDate).toISOString().split("T")[0] : "")}
 onChange={(e) => setTenderForm(p => ({ ...p, announcementStartDate: e.target.value }))}
 disabled={ba.status === "awarded"}
 />
 </div>
 <div>
 <Label>{t.bidAnalysisTab.announcementEndDate}</Label>
 <Input
 type="date"
 value={tenderForm.announcementEndDate || (ba.announcementEndDate ? new Date(ba.announcementEndDate).toISOString().split("T")[0] : "")}
 onChange={(e) => setTenderForm(p => ({ ...p, announcementEndDate: e.target.value }))}
 disabled={ba.status === "awarded"}
 />
 </div>
 </div>
 <div>
 <Label>{t.bidAnalysisTab.announcementLink}</Label>
 <Input
 value={tenderForm.announcementLink || ba.announcementLink || ""}
 onChange={(e) => setTenderForm(p => ({ ...p, announcementLink: e.target.value }))}
 disabled={ba.status === "awarded"}
 placeholder="https://..."
 />
 </div>
 {ba.status !== "awarded" && (
 <div className="flex justify-end">
 <Button onClick={handleSaveTenderInfo} disabled={updateTenderMutation.isPending} className="gap-2">
 <FileText className="h-4 w-4" />{t.bidAnalysisTab.saveTenderInfo}
 </Button>
 </div>
 )}
 </CardContent>
 </Card>
 </TabsContent>

 {/* Bidders */}
 <TabsContent value="bidders">
 <Card><CardHeader>
 <div className="flex items-center justify-between">
 <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />{t.bidAnalysisTab.bidders}</CardTitle>
 <div className="flex items-center gap-2">
 {/* ✅ Sync from Quotations button in Bidders tab */}
 {hasQuotationData && ba.status !== "awarded" && (
   <TooltipProvider>
     <Tooltip>
       <TooltipTrigger asChild>
         <Button
           size="sm"
           variant="outline"
           className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-100"
           onClick={handleSyncFromQuotations}
           disabled={syncFromQuotationsMutation.isPending}
         >
           {syncFromQuotationsMutation.isPending ? (
             <RefreshCw className="h-4 w-4 animate-spin" />
           ) : (
             <ArrowDownToLine className="h-4 w-4" />
           )}
           {t.bidAnalysisTab.syncPrices}
         </Button>
       </TooltipTrigger>
       <TooltipContent>
         <p>{t.bidAnalysisTab.syncPricesTooltip}</p>
       </TooltipContent>
     </Tooltip>
   </TooltipProvider>
 )}
 {ba.status !== "awarded" && (
 <Dialog open={addBidderOpen} onOpenChange={setAddBidderOpen}>
 <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="h-4 w-4" />{t.bidAnalysisTab.addBidder}</Button></DialogTrigger>
 <DialogContent>
 <DialogHeader><DialogTitle>{t.bidAnalysisTab.addBidder}</DialogTitle></DialogHeader>
 <div className="space-y-4">
 <div><Label>{t.bidAnalysisTab.bidderName} *</Label><Input value={bidderForm.name} onChange={(e) => setBidderForm(p => ({ ...p, name: e.target.value }))} /></div>
 <div className="grid grid-cols-2 gap-4">
 <div><Label>{t.bidAnalysisTab.totalBidAmount} ({currency}) *</Label><Input type="number" step="0.01" value={bidderForm.totalBidAmount} onChange={(e) => setBidderForm(p => ({ ...p, totalBidAmount: e.target.value }))} /></div>
 <div><Label>{t.bidAnalysisTab.submissionDate}</Label><Input type="date" value={bidderForm.submissionDate} onChange={(e) => setBidderForm(p => ({ ...p, submissionDate: e.target.value }))} /></div>
 </div>
 <div><Label>{t.bidAnalysisTab.bidReference}</Label><Input value={bidderForm.bidReference} onChange={(e) => setBidderForm(p => ({ ...p, bidReference: e.target.value }))} /></div>
 <p className="text-xs text-muted-foreground">{t.bidAnalysisTab.autoSyncHint}</p>
 <div className="flex justify-end gap-2">
 <Button variant="outline" onClick={() => setAddBidderOpen(false)}>{t.bidAnalysisTab.cancel}</Button>
 <Button onClick={handleAddBidder} disabled={!bidderForm.name || !bidderForm.totalBidAmount || addBidderMutation.isPending}>{t.bidAnalysisTab.add}</Button>
 </div>
 </div>
 </DialogContent>
 </Dialog>
 )}
 </div>
 </div>
 </CardHeader>
 <CardContent>
 {baBidders.length === 0 ? (
 <div className="text-center py-8 text-gray-500"><Users className="h-12 w-12 mx-auto mb-3 text-gray-300" /><p>{t.bidAnalysisTab.minBidders}</p></div>
 ) : (
 <div className="overflow-x-auto"><table className="w-full border-collapse">
 <thead><tr className="bg-gray-50 border-b-2 border-gray-200">
 <th className="px-4 py-2 text-start text-xs font-bold text-gray-600">#</th>
 <th className="px-4 py-2 text-start text-xs font-bold text-gray-600">{t.bidAnalysisTab.bidderName}</th>
 <th className="px-4 py-2 text-end text-xs font-bold text-gray-600">{t.bidAnalysisTab.totalBidAmount}</th>
 {/* ✅ Quotation source column */}
 <th className="px-4 py-2 text-center text-xs font-bold text-gray-600">{t.bidAnalysisTab.quotationSource}</th>
 <th className="px-4 py-2 text-center text-xs font-bold text-gray-600">{t.bidAnalysisTab.submissionDate}</th>
 <th className="px-4 py-2 text-center text-xs font-bold text-gray-600">{t.bidAnalysisTab.status}</th>
 </tr></thead>
 <tbody>{baBidders.map((b: any, idx: number) => {
 const techScore = parseFloat(b.technicalScore || "0");
 const quotation = quotationTotals?.[b.id];
 const quotationAmount = quotation ? parseFloat(quotation.totalAmount) : 0;
 const bidAmount = Number(b.totalBidAmount || 0);
 const isFromQuotation = quotation && quotationAmount > 0 && Math.abs(bidAmount - quotationAmount) < 0.01;
 const hasDiscrepancy = quotation && quotationAmount > 0 && Math.abs(bidAmount - quotationAmount) > 0.01;
 return (
 <tr key={b.id} className={`border-b border-gray-100 ${b.isSelected ? "bg-green-50" : hasDiscrepancy ? "bg-amber-50/50" : "hover:bg-gray-50"}`}>
 <td className="px-4 py-3 text-sm font-bold">{idx + 1}</td>
 <td className="px-4 py-3 text-sm font-medium">{b.bidderName}</td>
 <td className="px-4 py-3 text-sm text-end font-medium">
   <div className="flex items-center justify-end gap-1">
     {currency} {bidAmount.toLocaleString()}
     {isFromQuotation && (
       <Badge variant="outline" className="text-[10px] px-1 py-0 border-blue-300 text-blue-600">
         <FileSpreadsheet className="h-3 w-3 me-0.5" />SQ
       </Badge>
     )}
     {/* ✅ Discrepancy warning badge */}
     {hasDiscrepancy && (
       <TooltipProvider>
         <Tooltip>
           <TooltipTrigger>
             <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-400 text-amber-700 bg-amber-50">
               <TriangleAlert className="h-3 w-3 me-0.5" />
               {t.bidAnalysisTab.mismatch}
             </Badge>
           </TooltipTrigger>
           <TooltipContent>
             <div className="text-xs space-y-1">
               <p className="font-medium">{t.bidAnalysisTab.discrepancyDetail}</p>
               <p>{t.bidAnalysisTab.currentBid}: {currency} {bidAmount.toLocaleString()}</p>
               <p>{t.bidAnalysisTab.quotationTotal}: {currency} {quotationAmount.toLocaleString()}</p>
               <p className="text-amber-600">{t.bidAnalysisTab.differenceLabel}: {currency} {Math.abs(bidAmount - quotationAmount).toLocaleString()}</p>
             </div>
           </TooltipContent>
         </Tooltip>
       </TooltipProvider>
     )}
   </div>
 </td>
 {/* ✅ Quotation source indicator */}
 <td className="px-4 py-3 text-center">
   {quotation ? (
     <TooltipProvider>
       <Tooltip>
         <TooltipTrigger>
           <Badge variant="outline" className="border-blue-300 text-blue-600 text-xs">
             <FileSpreadsheet className="h-3 w-3 me-1" />
             {currency} {quotationAmount.toLocaleString()}
           </Badge>
         </TooltipTrigger>
         <TooltipContent>
           <div className="text-xs space-y-1">
             <p className="font-medium">{t.bidAnalysisTab.quotationRef}: {quotation.quotationReference || '-'}</p>
             <p>{t.bidAnalysisTab.quotationLines}: {quotation.lineCount}</p>
             <p>{t.bidAnalysisTab.quotationStatus}: {quotation.status}</p>
           </div>
         </TooltipContent>
       </Tooltip>
     </TooltipProvider>
   ) : (
     <span className="text-xs text-gray-400">-</span>
   )}
 </td>
 <td className="px-4 py-3 text-sm text-center">{b.submissionDate ? new Date(b.submissionDate).toLocaleDateString() : "-"}</td>
 <td className="px-4 py-3 text-center">
 {b.isSelected ? <Badge className="bg-green-100 text-green-700"><Award className="h-3 w-3 me-1" />{t.bidAnalysisTab.winner}</Badge>
 : techScore >= 70 ? <Badge className="bg-blue-100 text-blue-700">{t.bidAnalysisTab.passedTechnical}</Badge>
 : b.technicalScore != null && techScore > 0 ? <Badge className="bg-red-100 text-red-700">{t.bidAnalysisTab.failedTechnical}</Badge>
 : <Badge variant="secondary">{t.bidAnalysisTab.draft}</Badge>}
 </td>
 </tr>
 );
 })}</tbody>
 </table></div>
 )}
 </CardContent>
 </Card>
 </TabsContent>

 {/* PCE: Supplier Offer Matrix Tab - uses bid_analysis_line_items */}
 <TabsContent value="offer-matrix">
   <Card>
     <CardHeader>
       <div className="flex items-center justify-between">
         <div>
           <CardTitle className="flex items-center gap-2">
             <Table2 className="h-5 w-5" />
             {(t.bidAnalysisTab as any).supplierOfferMatrix || 'Supplier Offer Matrix (PCE)'}
           </CardTitle>
           <p className="text-sm text-muted-foreground mt-1">
             {(t.bidAnalysisTab as any).supplierOfferMatrixDesc || 'Per-item prices from Supplier Quotation Entry'}
           </p>
         </div>
         <TooltipProvider>
           <Tooltip>
             <TooltipTrigger asChild>
               <Button
                 size="sm"
                 variant="outline"
                 className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-100"
                 onClick={() => ba?.id && backfillMutation.mutate({ bidAnalysisId: ba.id })}
                 disabled={backfillMutation.isPending}
               >
                 {backfillMutation.isPending ? (
                   <RefreshCw className="h-4 w-4 animate-spin" />
                 ) : (
                   <ArrowDownToLine className="h-4 w-4" />
                 )}
                 {(t.bidAnalysisTab as any).backfillMatrix || 'Backfill from Quotations'}
               </Button>
             </TooltipTrigger>
             <TooltipContent>
               <p className="text-xs max-w-xs">{(t.bidAnalysisTab as any).backfillMatrixTooltip || 'Sync line items from existing supplier quotations'}</p>
             </TooltipContent>
           </Tooltip>
         </TooltipProvider>
       </div>
     </CardHeader>
     <CardContent>
       {!supplierOfferMatrix?.hasData ? (
         <div className="text-center py-12 text-gray-500">
           <Table2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
           <p className="font-medium">{(t.bidAnalysisTab as any).noMatrixData || 'No supplier offer data available'}</p>
           <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
             {(t.bidAnalysisTab as any).noMatrixDataDesc || 'Suppliers must submit quotations via Supplier Quotation Entry, or use Backfill to sync existing data.'}
           </p>
         </div>
       ) : (
         <div className="overflow-x-auto">
           <table className="w-full border-collapse text-sm">
             <thead>
               <tr className="bg-gray-50 border-b-2 border-gray-200">
                 <th className="px-3 py-2 text-start text-xs font-bold text-gray-600 sticky start-0 bg-gray-50 z-10">#</th>
                 <th className="px-3 py-2 text-start text-xs font-bold text-gray-600 min-w-[200px] sticky start-8 bg-gray-50 z-10">{t.bidAnalysisTab.itemDescription}</th>
                 <th className="px-3 py-2 text-center text-xs font-bold text-gray-600 w-20">{t.bidAnalysisTab.qty}</th>
                 <th className="px-3 py-2 text-center text-xs font-bold text-gray-600 w-20">{t.bidAnalysisTab.unit}</th>
                 <th className="px-3 py-2 text-center text-xs font-bold text-orange-600 w-28 bg-orange-50/30">{(t.bidAnalysisTab as any).estimatedUnitCost || 'PR Est.'}</th>
                 {/* Dynamic bidder columns */}
                 {supplierOfferMatrix.bidders.map((bidder) => (
                   <th key={bidder.id} className={`px-3 py-2 text-center text-xs font-bold min-w-[140px] ${
                     bidder.isSelected ? 'text-green-700 bg-green-50/50' : 'text-blue-700 bg-blue-50/30'
                   }`}>
                     <div className="flex flex-col items-center gap-0.5">
                       <span className="flex items-center gap-1">
                         {bidder.isSelected && <Award className="h-3 w-3 text-green-600" />}
                         {bidder.name}
                       </span>
                       <span className="text-[10px] font-normal opacity-70">{t.bidAnalysisTab.unitPriceHeader}</span>
                     </div>
                   </th>
                 ))}
               </tr>
             </thead>
             <tbody>
               {supplierOfferMatrix.matrixRows.map((row, idx) => (
                 <tr key={row.prLineItemId} className="border-b border-gray-100 hover:bg-gray-50">
                   <td className="px-3 py-2 font-medium text-muted-foreground sticky start-0 bg-white z-10">{idx + 1}</td>
                   <td className="px-3 py-2 font-medium sticky start-8 bg-white z-10">{row.description}</td>
                   <td className="px-3 py-2 text-center">{row.quantity.toLocaleString()}</td>
                   <td className="px-3 py-2 text-center text-muted-foreground">{row.unit}</td>
                   <td className="px-3 py-2 text-center text-orange-700 font-medium bg-orange-50/20">
                     {row.estimatedUnitCost > 0 ? row.estimatedUnitCost.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                   </td>
                   {row.bidderPrices.map((bp) => {
                     const unitPrice = bp.unitPrice ?? 0;
                     const isLowest = unitPrice > 0 && matrixLowestByLine[row.prLineItemId] === unitPrice;
                     return (
                       <td key={bp.bidderId} className={`px-3 py-2 text-center ${
                         isLowest ? 'bg-green-50' : bp.unitPrice === null ? 'bg-gray-50/50' : ''
                       }`}>
                         {bp.unitPrice !== null ? (
                           <TooltipProvider>
                             <Tooltip>
                               <TooltipTrigger>
                                 <div className="flex flex-col items-center">
                                   <span className={`font-medium tabular-nums ${
                                     isLowest ? 'text-green-700 font-bold' : ''
                                   }`}>
                                     {unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                   </span>
                                   {isLowest && (
                                     <Badge variant="outline" className="text-[9px] px-1 py-0 mt-0.5 border-green-300 text-green-600">
                                       {(t.bidAnalysisTab as any).lowestBidder || 'Lowest'}
                                     </Badge>
                                   )}
                                 </div>
                               </TooltipTrigger>
                               <TooltipContent>
                                 <div className="text-xs">
                                   <p>{t.bidAnalysisTab.lineTotal}: {currency} {(bp.lineTotal ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                 </div>
                               </TooltipContent>
                             </Tooltip>
                           </TooltipProvider>
                         ) : (
                           <span className="text-gray-300">-</span>
                         )}
                       </td>
                     );
                   })}
                 </tr>
               ))}
               {/* Grand Total Row */}
               <tr className="bg-primary/5 border-t-2 border-primary/20 font-bold">
                 <td colSpan={5} className="px-3 py-2 text-end sticky start-0 bg-primary/5 z-10">
                   {t.bidAnalysisTab.grandTotal}
                 </td>
                 {supplierOfferMatrix.bidderTotals.map((bt) => (
                   <td key={bt.bidderId} className="px-3 py-2 text-center tabular-nums">
                     {bt.total > 0 ? `${currency} ${bt.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                   </td>
                 ))}
               </tr>
             </tbody>
           </table>
         </div>
       )}
     </CardContent>
   </Card>
 </TabsContent>

 {/* ✅ Line-Item Comparison Tab */}
 <TabsContent value="line-comparison" onFocusCapture={() => setLineComparisonOpen(true)}>
   {(() => { if (!lineComparisonOpen) setLineComparisonOpen(true); return null; })()}
   <Card>
     <CardHeader>
       <div className="flex items-center justify-between">
         <div>
           <CardTitle className="flex items-center gap-2">
             <Table2 className="h-5 w-5" />
             {t.bidAnalysisTab.lineComparison}
           </CardTitle>
           <p className="text-sm text-muted-foreground mt-1">
             {t.bidAnalysisTab.lineComparisonDesc}
           </p>
         </div>
         {hasQuotationData && ba.status !== "awarded" && (
           <Button
             size="sm"
             variant="outline"
             className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-100"
             onClick={handleSyncFromQuotations}
             disabled={syncFromQuotationsMutation.isPending}
           >
             <ArrowDownToLine className="h-4 w-4" />
             {t.bidAnalysisTab.syncPrices}
           </Button>
         )}
       </div>
     </CardHeader>
     <CardContent>
       {!lineComparison || lineComparison.lineItems.length === 0 ? (
         <div className="text-center py-12 text-gray-500">
           <Table2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
           <p className="font-medium">{t.bidAnalysisTab.noLineData}</p>
           <p className="text-sm text-muted-foreground mt-1">{t.bidAnalysisTab.noLineDataDesc}</p>
         </div>
       ) : (
         <div className="overflow-x-auto">
           <table className="w-full border-collapse text-sm">
             <thead>
               <tr className="bg-gray-50 border-b-2 border-gray-200">
                 <th className="px-3 py-2 text-start text-xs font-bold text-gray-600 sticky start-0 bg-gray-50 z-10">#</th>
                 <th className="px-3 py-2 text-start text-xs font-bold text-gray-600 min-w-[200px] sticky start-8 bg-gray-50 z-10">{t.bidAnalysisTab.itemDescription}</th>
                 <th className="px-3 py-2 text-center text-xs font-bold text-gray-600 w-20">{t.bidAnalysisTab.qty}</th>
                 <th className="px-3 py-2 text-center text-xs font-bold text-gray-600 w-20">{t.bidAnalysisTab.unit}</th>
                 {/* Dynamic bidder columns */}
                 {Object.entries(lineComparison.bidderMap).map(([bidderId, bidderName]) => (
                   <th key={bidderId} className="px-3 py-2 text-center text-xs font-bold text-blue-700 min-w-[140px] bg-blue-50/30">
                     <div className="flex flex-col items-center gap-0.5">
                       <span>{bidderName}</span>
                       <span className="text-[10px] font-normal text-blue-500">{t.bidAnalysisTab.unitPriceHeader}</span>
                     </div>
                   </th>
                 ))}
               </tr>
             </thead>
             <tbody>
               {lineComparison.lineItems.map((item: any, idx: number) => (
                 <tr key={item.prLineItemId} className="border-b border-gray-100 hover:bg-gray-50">
                   <td className="px-3 py-2 font-medium text-muted-foreground sticky start-0 bg-white z-10">{idx + 1}</td>
                   <td className="px-3 py-2 font-medium sticky start-8 bg-white z-10">{item.itemDescription}</td>
                   <td className="px-3 py-2 text-center">{parseFloat(item.quantity).toLocaleString()}</td>
                   <td className="px-3 py-2 text-center text-muted-foreground">{item.unit}</td>
                   {Object.keys(lineComparison.bidderMap).map((bidderId) => {
                     const bidderData = item.bidders[Number(bidderId)];
                     const unitPrice = bidderData ? parseFloat(bidderData.unitPrice) : 0;
                     const lineTotal = bidderData ? parseFloat(bidderData.lineTotal) : 0;
                     const isLowest = unitPrice > 0 && lowestPriceByLine[item.prLineItemId] === unitPrice;
                     return (
                       <td key={bidderId} className={`px-3 py-2 text-center ${isLowest ? "bg-green-50" : ""}`}>
                         {bidderData ? (
                           <TooltipProvider>
                             <Tooltip>
                               <TooltipTrigger>
                                 <div className="flex flex-col items-center">
                                   <span className={`font-medium tabular-nums ${isLowest ? "text-green-700" : ""}`}>
                                     {unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                   </span>
                                   {isLowest && (
                                     <Badge variant="outline" className="text-[9px] px-1 py-0 mt-0.5 border-green-300 text-green-600">
                                       {t.bidAnalysisTab.lowestPrice}
                                     </Badge>
                                   )}
                                 </div>
                               </TooltipTrigger>
                               <TooltipContent>
                                 <div className="text-xs">
                                   <p>{t.bidAnalysisTab.lineTotal}: {currency} {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                 </div>
                               </TooltipContent>
                             </Tooltip>
                           </TooltipProvider>
                         ) : (
                           <span className="text-gray-300">-</span>
                         )}
                       </td>
                     );
                   })}
                 </tr>
               ))}
               {/* Grand Total Row */}
               <tr className="bg-primary/5 border-t-2 border-primary/20 font-bold">
                 <td colSpan={4} className="px-3 py-2 text-end sticky start-0 bg-primary/5 z-10">
                   {t.bidAnalysisTab.grandTotal}
                 </td>
                 {Object.keys(lineComparison.bidderMap).map((bidderId) => {
                   const total = lineComparison.lineItems.reduce((sum: number, item: any) => {
                     const bidderData = item.bidders[Number(bidderId)];
                     return sum + (bidderData ? parseFloat(bidderData.lineTotal) : 0);
                   }, 0);
                   return (
                     <td key={bidderId} className="px-3 py-2 text-center tabular-nums">
                       {currency} {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                     </td>
                   );
                 })}
               </tr>
             </tbody>
           </table>
         </div>
       )}
     </CardContent>
   </Card>
 </TabsContent>

 {/* Evaluation */}
 <TabsContent value="evaluation">
 {!isAnnouncementClosed ? (
 <Card><CardContent className="flex flex-col items-center justify-center py-16">
 <Lock className="h-16 w-16 text-yellow-400 mb-4" />
 <h4 className="text-lg font-semibold text-gray-600 mb-2">{t.bidAnalysisTab.technicalThreshold}</h4>
 <p className="text-sm text-muted-foreground text-center max-w-md">{t.bidAnalysisTab.tenderLocked}</p>
 {ba.announcementEndDate && <p className="text-sm text-gray-500 mt-2">Closes: {new Date(ba.announcementEndDate).toLocaleDateString()}</p>}
 </CardContent></Card>
 ) : (
 <Card><CardHeader>
 <div className="flex items-center justify-between">
 <div><CardTitle className="flex items-center gap-2"><Scale className="h-5 w-5" />{t.bidAnalysisTab.evaluation}</CardTitle><p className="text-sm text-muted-foreground mt-1">{t.bidAnalysisTab.technicalThresholdDesc}</p></div>
 <div className="flex items-center gap-2">
 {/* ✅ Sync prices before calculating financial scores */}
 {hasQuotationData && ba.status !== "awarded" && (
   <Button
     size="sm"
     variant="outline"
     className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-100"
     onClick={handleSyncFromQuotations}
     disabled={syncFromQuotationsMutation.isPending}
   >
     {syncFromQuotationsMutation.isPending ? (
       <RefreshCw className="h-4 w-4 animate-spin" />
     ) : (
       <ArrowDownToLine className="h-4 w-4" />
     )}
     {t.bidAnalysisTab.syncPrices}
   </Button>
 )}
 {ba.status !== "awarded" && (
 <Button size="sm" onClick={() => { if (!ba?.id) return; calculateFinancialMutation.mutate({ bidAnalysisId: ba.id }); }} disabled={calculateFinancialMutation.isPending} className="gap-2">
 <Calculator className="h-4 w-4" />{t.bidAnalysisTab.calculateFinancial}
 </Button>
 )}
 </div>
 </div>
 </CardHeader>
 <CardContent><div className="overflow-x-auto"><table className="w-full border-collapse">
 <thead><tr className="bg-gray-50 border-b-2 border-gray-200">
 <th className="px-3 py-2 text-start text-xs font-bold text-gray-600">#</th>
 <th className="px-3 py-2 text-start text-xs font-bold text-gray-600">{t.bidAnalysisTab.bidderName}</th>
 <th className="px-3 py-2 text-end text-xs font-bold text-gray-600">{t.bidAnalysisTab.totalBidAmount}</th>
 <th className="px-3 py-2 text-center text-xs font-bold text-gray-600">{t.bidAnalysisTab.technicalScore}</th>
 <th className="px-3 py-2 text-center text-xs font-bold text-gray-600">{t.bidAnalysisTab.financialScore}</th>
 <th className="px-3 py-2 text-center text-xs font-bold text-gray-600">{t.bidAnalysisTab.combinedScore}</th>
 </tr></thead>
 <tbody>{baBidders.map((b: any, idx: number) => {
 const techScore = parseFloat(b.technicalScore || "0");
 const finScore = parseFloat(b.financialScore || "0");
 const combScore = parseFloat(b.combinedScore || "0");
 const techPassed = techScore >= 70;
 const quotation = quotationTotals?.[b.id];
 const quotationAmount = quotation ? parseFloat(quotation.totalAmount) : 0;
 const bidAmount = Number(b.totalBidAmount || 0);
 const isFromQuotation = quotation && quotationAmount > 0 && Math.abs(bidAmount - quotationAmount) < 0.01;
 const hasDiscrepancy = quotation && quotationAmount > 0 && Math.abs(bidAmount - quotationAmount) > 0.01;
 return (
 <tr key={b.id} className={`border-b border-gray-100 ${!techPassed && techScore > 0 ? "bg-red-50 opacity-60" : hasDiscrepancy ? "bg-amber-50/50" : "hover:bg-gray-50"}`}>
 <td className="px-3 py-3 text-sm font-bold">{idx + 1}</td>
 <td className="px-3 py-3 text-sm font-medium">{b.bidderName}</td>
 <td className="px-3 py-3 text-sm text-end">
   <div className="flex items-center justify-end gap-1">
     {currency} {bidAmount.toLocaleString()}
     {isFromQuotation && (
       <Badge variant="outline" className="text-[10px] px-1 py-0 border-blue-300 text-blue-600">SQ</Badge>
     )}
     {hasDiscrepancy && (
       <TooltipProvider>
         <Tooltip>
           <TooltipTrigger>
             <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-400 text-amber-700 bg-amber-50">
               <TriangleAlert className="h-3 w-3" />
             </Badge>
           </TooltipTrigger>
           <TooltipContent>
             <p className="text-xs">{t.bidAnalysisTab.quotationTotal}: {currency} {quotationAmount.toLocaleString()}</p>
           </TooltipContent>
         </Tooltip>
       </TooltipProvider>
     )}
   </div>
 </td>
 <td className="px-3 py-3 text-center">
 {ba.status !== "awarded" ? (
 <div className="flex items-center gap-1 justify-center">
 <Input
 type="number" min="0" max="100" step="0.1"
 className="h-8 w-20 text-center text-sm"
 defaultValue={techScore > 0 ? techScore : ""}
 onChange={(e) => setTechnicalScores(p => ({ ...p, [b.id]: e.target.value }))}
 />
 <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => {
 updateTechnicalMutation.mutate({
 bidderId: b.id,
 technicalScore: parseFloat(technicalScores[b.id] || String(techScore || 0)),
 });
 }} disabled={updateTechnicalMutation.isPending}>
 <CheckCircle className="h-4 w-4" />
 </Button>
 </div>
 ) : (
 <span className={`font-bold ${techPassed ? "text-green-600" : "text-red-600"}`}>{techScore > 0 ? `${techScore.toFixed(1)}%` : "-"}</span>
 )}
 </td>
 <td className="px-3 py-3 text-center font-medium">{finScore > 0 ? finScore.toFixed(1) : "-"}</td>
 <td className="px-3 py-3 text-center font-bold text-lg">{combScore > 0 ? combScore.toFixed(1) : "-"}</td>
 </tr>
 );
 })}</tbody>
 </table></div></CardContent>
 </Card>
 )}
 </TabsContent>

 {/* Results */}
 <TabsContent value="results">
 <Card><CardHeader><CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" />{t.bidAnalysisTab.results}</CardTitle></CardHeader>
 <CardContent className="space-y-6">
 <div className="overflow-x-auto"><table className="w-full border-collapse">
 <thead><tr className="bg-gray-50 border-b-2 border-gray-200">
 <th className="px-3 py-2 text-start text-xs font-bold text-gray-600">{t.bidAnalysisTab.rank}</th>
 <th className="px-3 py-2 text-start text-xs font-bold text-gray-600">{t.bidAnalysisTab.bidderName}</th>
 <th className="px-3 py-2 text-end text-xs font-bold text-gray-600">{t.bidAnalysisTab.totalBidAmount}</th>
 <th className="px-3 py-2 text-center text-xs font-bold text-gray-600">{t.bidAnalysisTab.combinedScore}</th>
 <th className="px-3 py-2 text-center text-xs font-bold text-gray-600">{t.bidAnalysisTab.status}</th>
 {ba.status !== "awarded" && <th className="px-3 py-2 text-center text-xs font-bold text-gray-600"></th>}
 </tr></thead>
 <tbody>{[...baBidders]
 .filter((b: any) => {
 const ts = parseFloat(b.technicalScore || "0");
 return ts === 0 || ts >= 70;
 })
 .sort((a: any, b: any) => parseFloat(b.combinedScore || "0") - parseFloat(a.combinedScore || "0"))
 .map((b: any, idx: number) => {
 const combScore = parseFloat(b.combinedScore || "0");
 return (
 <tr key={b.id} className={`border-b border-gray-100 ${b.isSelected ? "bg-green-50" : "hover:bg-gray-50"}`}>
 <td className="px-3 py-3 text-sm font-bold">#{idx + 1}</td>
 <td className="px-3 py-3 text-sm font-medium">{b.bidderName}</td>
 <td className="px-3 py-3 text-sm text-end">{currency} {Number(b.totalBidAmount || 0).toLocaleString()}</td>
 <td className="px-3 py-3 text-center font-bold">{combScore > 0 ? combScore.toFixed(1) : "-"}</td>
 <td className="px-3 py-3 text-center">
 {b.isSelected ? <Badge className="bg-green-100 text-green-700"><Award className="h-3 w-3 me-1" />{t.bidAnalysisTab.winner}</Badge> : <Badge variant="outline">#{idx + 1}</Badge>}
 </td>
 {ba.status !== "awarded" && (
 <td className="px-3 py-3 text-center">
 {!b.isSelected && combScore > 0 && (
 <Button size="sm" variant="outline" onClick={() => {
 if (!ba?.id) return;
 selectBidderMutation.mutate({ bidAnalysisId: ba.id, bidderId: b.id, justification: justification || undefined });
 }} disabled={selectBidderMutation.isPending}>
 <CheckCircle className="h-4 w-4 me-1" />{t.bidAnalysisTab.selectBidder}
 </Button>
 )}
 </td>
 )}
 </tr>
 );
 })}</tbody>
 </table></div>

 {ba.status !== "awarded" && (
 <div className="space-y-2">
 <Label className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-yellow-500" />{t.bidAnalysisTab.justification}</Label>
 <p className="text-xs text-muted-foreground">{t.bidAnalysisTab.justificationRequired}</p>
 <Textarea value={justification} onChange={(e) => setJustification(e.target.value)} rows={3} />
 </div>
 )}

 {ba.status !== "awarded" && baBidders.some((b: any) => b.isSelected) && (
 <div className="flex justify-end">
 <Button onClick={() => { if (!ba?.id) return; approveMutation.mutate({ bidAnalysisId: ba.id }); }} disabled={approveMutation.isPending} className="gap-2 bg-green-600 hover:bg-green-700">
 <CheckCircle className="h-4 w-4" />{t.bidAnalysisTab.approve}
 </Button>
 </div>
 )}
 </CardContent>
 </Card>
 </TabsContent>
 </Tabs>
 </div>
 );
}
