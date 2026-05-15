/**
 * Procurement Workspace - Cards Grid Dashboard
 * PR-centric workspace with all procurement documents visible as cards
 * Organized into: Primary Flow, Execution, Finance & Control
 * Threshold governance: RFQ for <25K, Tender/CBA for >25K
 * 
 * ADAPTED FROM FIGMA DESIGN - Using tRPC backend instead of localStorage services
 */
import { useState, lazy, Suspense, useEffect } from "react";
import { useParams } from "wouter";
import { useNavigate } from "@/lib/router-compat";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
 ArrowLeft,
 ArrowRight,
 FileText,
 Scale,
 BarChart3,
 ClipboardCheck,
 ShoppingCart,
 Package,
 Truck,
 CreditCard,
 FolderOpen,
 History,
 Clock,
 AlertCircle,
 Printer,
 Megaphone,
 Download,
 Upload,
 RefreshCw,
 Lock,
 FileCheck,
 ScrollText,
} from "lucide-react";

import { PRFinancialStatusWidget } from "@/components/PRFinancialStatusWidget";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";
import { DocumentControl } from "@/components/DocumentControl";

const QuotationAnalysisTab = lazy(() => import("./tabs/QuotationAnalysisTab"));
const QuotationAnalysisExtendedTab = lazy(() => import("./tabs/QuotationAnalysisExtendedTab"));
const BidAnalysisTab = lazy(() => import("./tabs/BidAnalysisTab"));
const BidOpeningMinutesTab = lazy(() => import("./tabs/BidOpeningMinutesTab"));
const PurchaseOrderTab = lazy(() => import("./tabs/PurchaseOrderTab"));
const GoodsReceiptTab = lazy(() => import("./tabs/GoodsReceiptTab"));
const DeliveryNoteTab = lazy(() => import("./tabs/DeliveryNoteTab"));
const TenderInformationTab = lazy(() => import("./tabs/TenderInformationTab"));
const BidEvaluationCriteriaTab = lazy(() => import("./tabs/BidEvaluationCriteriaTab"));
const ContractTab = lazy(() => import("./tabs/ContractTab"));
const ContractManagementTab = lazy(() => import("./tabs/ContractManagementTab"));
const SACTab = lazy(() => import("./tabs/SACTab"));
const SupplierQuotationTab = lazy(() => import("./tabs/SupplierQuotationTab"));

/* ── Threshold Governance ─────────────────────────────────────────────── */
type ProcessType = "direct_purchase" | "single_quotation" | "multiple_quotations" | "formal_tender";

interface ProcessInfo {
 processType: ProcessType;
 label: string;
 labelAr: string;
 minimumSuppliers: number;
 requiresCBA: boolean;
 requiresRFQ: boolean;
 requiresTender: boolean;
}

function determineProcessType(totalUSD: number): ProcessInfo {
 if (totalUSD <= 1000) {
 return { processType: "single_quotation", label: "Process: Single Quotation", labelAr: "العملية: عرض سعر واحد", minimumSuppliers: 1, requiresCBA: false, requiresRFQ: true, requiresTender: false };
 } else if (totalUSD <= 5000) {
 return { processType: "multiple_quotations", label: "Process: Minimum 2 Quotations", labelAr: "العملية: الحد الأدنى عرضين", minimumSuppliers: 2, requiresCBA: false, requiresRFQ: true, requiresTender: false };
 } else if (totalUSD <= 25000) {
 return { processType: "multiple_quotations", label: "Process: Minimum 3 Quotations", labelAr: "العملية: الحد الأدنى ثلاثة عروض", minimumSuppliers: 3, requiresCBA: false, requiresRFQ: true, requiresTender: false };
 } else {
 return { processType: "formal_tender", label: "Process: Tender Process", labelAr: "العملية: عملية المناقصة", minimumSuppliers: 5, requiresCBA: true, requiresRFQ: false, requiresTender: true };
 }
}

/* ── Types ────────────────────────────────────────────────────────────── */
type WorkspaceTab = "pr" | "rfq" | "tender-info" | "eval-criteria" | "cba" | "bom" | "analysis" | "po" | "grn" | "delivery" | "payment" | "documents" | "audit" | "contract" | "sac" | "supplier-quotation";

interface WCard {
 id: WorkspaceTab;
 title: string;
 icon: React.ElementType;
 docNum?: string;
 status?: string;
 color: "green" | "blue" | "yellow" | "purple" | "gray" | "red";
 meta?: { label: string; value: string }[];
 description?: string; // Tooltip/help text explaining the process step
 enabled: boolean;
 section: "primary" | "execution" | "finance" | "document_control";
}


/* ── Status Badge ─────────────────────────────────────────────────────── */
function SBadge({ s, c }: { s: string; c: string }) {
 const m: Record<string, string> = {
 green: "bg-green-100 text-green-700 border-green-200",
 blue: "bg-blue-100 text-blue-700 border-blue-200",
 yellow: "bg-yellow-100 text-yellow-700 border-yellow-200",
 purple: "bg-purple-100 text-purple-700 border-purple-200",
 gray: "bg-gray-100 text-gray-600 border-gray-200",
 red: "bg-red-100 text-red-700 border-red-200",
 };
 return <span className={`px-2 py-0.5 text-xs font-medium rounded-full border whitespace-nowrap ${m[c] || m.gray}`}>{s}</span>;
}

/* ── Workspace Card ───────────────────────────────────────────────────── */
function WCardUI({ card, onClick, lockReason, isRTL }: { card: WCard; onClick: () => void; lockReason?: string; isRTL?: boolean }) {
 const Icon = card.icon;
 const [showTooltip, setShowTooltip] = useState(false);
 
 return (
 <div className="relative" dir={isRTL ? 'rtl' : 'ltr'}>
 <button
 onClick={onClick}
 onMouseEnter={() => setShowTooltip(true)}
 onMouseLeave={() => setShowTooltip(false)}
 disabled={!card.enabled}
 className={`${'text-start'} w-full p-5 rounded-lg border-2 transition-all h-[200px] flex flex-col ${card.enabled ? "hover:border-blue-400 hover:shadow-md cursor-pointer bg-white" : "opacity-50 cursor-not-allowed bg-gray-50"}`}
 >
 <div className="flex items-start justify-between mb-3">
 <div className="flex items-center gap-3">
 <div className={`p-2 rounded-lg ${card.enabled ? "bg-blue-50" : "bg-gray-100"}`}>
 <Icon className={`w-5 h-5 ${card.enabled ? "text-blue-600" : "text-gray-400"}`} />
 </div>
 {!card.enabled && lockReason && (
 <div className="p-1.5 rounded-lg bg-red-50">
 <Lock className="w-4 h-4 text-red-500" />
 </div>
 )}
 <div>
 <div className={`font-bold text-gray-900 text-sm ${'text-left'}`}>{card.title}</div>
 {card.docNum && <div className={`text-xs text-gray-500 mt-0.5 ${'text-left'}`}>{card.docNum}</div>}
 </div>
 </div>
 {card.status && <SBadge s={card.status} c={card.color} />}
 </div>
 {card.meta && card.meta.length > 0 && (
 <div className="space-y-1 mt-3 pt-3 border-t border-gray-100">
 {card.meta.map((m, i) => (
 <div key={i} className="flex justify-between text-xs">
 <span className={`text-gray-500 ${'text-left'}`}>{m.label}:</span>
 <span className={`text-gray-900 font-medium ${'text-right'}`}>{m.value}</span>
 </div>
 ))}
 </div>
 )}
 </button>
 {/* Tooltip */}
 {showTooltip && (card.description || lockReason) && (
 <div className={`absolute z-50 w-80 p-3 mt-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg ${'text-left'}`}>
 <div className="font-semibold mb-1">{card.title}</div>
 {lockReason && !card.enabled ? (
 <div className="text-yellow-300 flex items-center gap-2">
 <Lock className="w-4 h-4" />
 <span>{lockReason}</span>
 </div>
 ) : (
 <div className="text-gray-300">{card.description}</div>
 )}
 <div className="absolute -top-2 start-6 w-0 h-0 border-s-8 border-l-transparent border-e-8 border-r-transparent border-b-8 border-b-gray-900"></div>
 </div>
 )}
 </div>
 );
}

/* ── Main Component ───────────────────────────────────────────────────── */
export default function ProcurementWorkspace() {
 const { prId } = useParams<{ prId: string }>();
 const navigate = useNavigate();
 const { currentOrganizationId } = useOrganization();
 const { language, isRTL} = useLanguage();
 const { t } = useTranslation();

 const [activeTab, setActiveTab] = useState<WorkspaceTab | null>(null);
 const [financialRefreshTrigger, setFinancialRefreshTrigger] = useState(0);

 // Fetch PR data
 const numericPrId = prId ? parseInt(prId, 10) : 0;
 const { data: pr, isLoading, refetch, isRefetching } = trpc.logistics.prWorkspace.getById.useQuery(
 { id: numericPrId },
 { enabled: !!prId && numericPrId > 0 }
 );
 
 // Debug: Check what pr data contains
 useEffect(() => {
 if (pr) {
 console.log('[ProcurementWorkspace] PR data:', pr);
 console.log('[ProcurementWorkspace] totalAmount:', pr.totalAmount);
 console.log('[ProcurementWorkspace] prTotalUSD:', pr.prTotalUsd);
 }
 }, [pr]);

 // Fetch related documents
 const { data: rfqData, refetch: refetchRFQ } = trpc.logistics.rfq.getByPR.useQuery({ purchaseRequestId: numericPrId }, { enabled: !!prId && numericPrId > 0 });

 // Debug: Check RFQ data structure
 useEffect(() => {
 if (rfqData) {
 console.log('[ProcurementWorkspace] RFQ data:', rfqData);
 console.log('[ProcurementWorkspace] RFQ status:', rfqData.status);
 console.log('[ProcurementWorkspace] RFQ suppliers:', rfqData.suppliers);
 console.log('[ProcurementWorkspace] Suppliers length:', rfqData.suppliers?.length);
 }
 }, [rfqData]);
 
 // Auto-refetch RFQ data when status changes
 useEffect(() => {
 if (rfqData?.status === "received" || rfqData?.status === "sent") {
 // RFQ has been updated, no need to refetch
 return;
 }
 // Refetch every 5 seconds if RFQ is in draft status
 if (rfqData?.status === "draft") {
 const interval = setInterval(() => {
 refetchRFQ();
 }, 5000);
 return () => clearInterval(interval);
 }
 }, [rfqData?.status, refetchRFQ]);
 const { data: poList, refetch: refetchPO } = trpc.logistics.po.listByPR.useQuery({ purchaseRequestId: numericPrId }, { enabled: !!prId && numericPrId > 0 });
 
 // Get the first PO for status checks (backward compatibility)
 const poData = poList && poList.length > 0 ? poList[0] : null;
 
 // Debug: Check PO data structure
 useEffect(() => {
 if (poList) {
 console.log('[ProcurementWorkspace] PO list:', poList);
 console.log('[ProcurementWorkspace] PO count:', poList.length);
 }
 }, [poList]);
 const { data: grnList, refetch: refetchGRN } = trpc.logistics.procurementGrn.getByPR.useQuery({ purchaseRequestId: numericPrId }, { enabled: !!prId && numericPrId > 0 });

 // Fetch payables for current PR
 const { data: payableData, refetch: refetchPayables } = trpc.prFinance.getPayableByPR.useQuery(
 { purchaseRequestId: numericPrId },
 { enabled: !!prId && numericPrId > 0 }
 );

 // Fetch all payables to calculate KPIs for this PR
 const { data: allPayables, refetch: refetchAllPayables } = trpc.prFinance.getPayablesList.useQuery(
 { status: undefined, vendorSearch: undefined, dateFrom: undefined, dateTo: undefined },
 { enabled: !!prId && numericPrId > 0 }
 );

 // Calculate payables KPIs for current PR
 const payablesForPR = allPayables?.filter(p => p.prNumber === pr?.prNumber) || [];
 const payablesKPIs = {
 total: payablesForPR.length,
 totalAmount: payablesForPR.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0),
 pendingInvoice: payablesForPR.filter(p => p.status === "pending_invoice").length,
 pendingApproval: payablesForPR.filter(p => p.status === "pending_approval").length,
 approved: payablesForPR.filter(p => p.status === "approved").length,
 paid: payablesForPR.filter(p => p.status === "paid").length,
 };

 // Fetch QA/BA status for PO generation
 const { data: qaData, refetch: refetchQA } = trpc.logistics.quotationAnalysis.getByPurchaseRequestId.useQuery(
 { purchaseRequestId: numericPrId },
 { enabled: !!prId && numericPrId > 0 }
 );
 const { data: baData, refetch: refetchBA } = trpc.logistics.bidAnalysis.getByPurchaseRequestId.useQuery(
 { purchaseRequestId: numericPrId },
 { enabled: !!prId && numericPrId > 0 }
 );

 // Fetch BOM data to check approval status
 const { data: bomData, refetch: refetchBOM } = trpc.procurementPhaseA.bidOpeningMinutes.getByPurchaseRequestId.useQuery(
 { purchaseRequestId: numericPrId },
 { enabled: !!prId && numericPrId > 0 }
 );

 // Fetch Supplier Quotation data (for Goods > $25K)
 const { data: sqData, refetch: refetchSQ } = trpc.logistics.supplierQuotation.listByPR.useQuery(
 { purchaseRequestId: numericPrId },
 { enabled: !!prId && numericPrId > 0 }
 );

 // ── Contract Chain Workflow: Fetch Contract & SAC data ──
 // Services AND Works categories use Contract → SAC → Payment
 // Goods >= $25K (Tender) also requires Contract Management before PO
 const isServices = pr?.category === 'services';
 const isWorks = pr?.category === 'works';
 const prTotalUSD = parseFloat(String(pr?.prTotalUsd || pr?.prTotalUsd || pr?.totalAmount || '0'));
 const isGoodsContractRequired = pr?.category === 'goods' && prTotalUSD >= 25000;
 const isContractChain = isServices || isWorks; // Services/Works: full contract chain (Contract → SAC → Payment)
 const needsContract = isContractChain || isGoodsContractRequired; // Any category that needs contract data
 const { data: contractData, refetch: refetchContract } = trpc.procurementPhaseA.contracts.getByPR.useQuery(
 { purchaseRequestId: numericPrId },
 { enabled: !!prId && numericPrId > 0 && needsContract }
 );
 const { data: sacList, refetch: refetchSAC } = trpc.procurementPhaseA.sac.listByPR.useQuery(
 { purchaseRequestId: numericPrId },
 { enabled: !!prId && numericPrId > 0 && needsContract }
 );

 const canGeneratePO = !poData && (
 (qaData as any)?.status === "approved" ||
 (baData as any)?.status === "awarded"
 );
 const qaApproved = (qaData as any)?.status === "approved";
 const baAwarded = (baData as any)?.status === "awarded";

 // Import/Export mutations
 const exportPRMutation = trpc.logistics.prWorkspace.export.useMutation({
 onSuccess: (data) => {
 // Download as JSON file
 const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
 const url = URL.createObjectURL(blob);
 const a = document.createElement("a");
 a.href = url;
 a.download = `PR-${pr?.prNumber || prId}-export.json`;
 a.click();
 URL.revokeObjectURL(url);
 toast.success(t.procurement.exportSuccess);
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const importPRMutation = trpc.logistics.prWorkspace.import.useMutation({
 onSuccess: () => {
 toast.success(t.procurement.importSuccess);
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const handleExportPR = () => {
 if (!prId || !numericPrId) return;
 exportPRMutation.mutate({ prId: numericPrId });
 };

 const handleImportPR = () => {
 const input = document.createElement("input");
 input.type = "file";
 input.accept = ".json";
 input.onchange = async (e) => {
 const file = (e.target as HTMLInputElement).files?.[0];
 if (!file) return;
 
 const text = await file.text();
 const data = JSON.parse(text);
 importPRMutation.mutate(data);
 };
 input.click();
 };

 const handleImportEmptyTemplate = () => {
 // Download empty PR template
 const template = {
 prNumber: "PR-[AUTO]",
 requestDate: new Date().toISOString().split("T")[0],
 projectId: "",
 donorName: "",
 departmentId: "",
 requestedBy: "",
 urgency: "normal",
 currency: "USD",
 exchangeRate: 1,
 budgetLine: "",
 justification: "",
 deliveryLocation: "",
 neededBy: "",
 items: [
 {
 itemNumber: 1,
 description: "",
 specifications: "",
 quantity: 0,
 unit: "",
 estimatedUnitCost: 0,
 estimatedTotalCost: 0,
 },
 ],
 };
 
 const blob = new Blob([JSON.stringify(template, null, 2)], { type: "application/json" });
 const url = URL.createObjectURL(blob);
 const a = document.createElement("a");
 a.href = url;
 a.download = "PR-Empty-Template.json";
 a.click();
 URL.revokeObjectURL(url);
 toast.success("Empty template downloaded");
 };

 if (isLoading) {
 return (
 <div className="p-6 space-y-4">
 <Skeleton className="h-10 w-64" />
 <Skeleton className="h-64 w-full" />
 </div>
 );
 }

 if (!pr) {
 return (
 <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
 <div className="bg-white rounded-lg border border-gray-200 p-12 max-w-md text-center">
 <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
 <h2 className="text-2xl font-bold text-gray-900 mb-2">{t.procurement.notFound}</h2>
 <p className="text-gray-600 mb-6">{t.procurement.notFoundDesc}</p>
 <Button onClick={() => navigate("/organization/logistics/purchase-requests")}>{t.procurement.backToList}</Button>
 </div>
 </div>
 );
 }

 // Determine process type
 const processInfo = determineProcessType(parseFloat(String(pr.prTotalUsd || pr.prTotalUsd || pr.totalAmount || '0')));

 // ============================================================================
 // WORKFLOW VALIDATION (Tender Governance Rules)
 // ============================================================================
 const now = new Date();
 const announcementEndDate = baData?.announcementEndDate ? new Date(baData.announcementEndDate) : null;
 const announcementClosed = announcementEndDate ? now >= announcementEndDate : false;
 const bomCompleted = baData?.bomCompleted || bomData?.status === 'approved' || false;
 const bomApproved = bomData?.status === 'approved'; // Check if BOM is approved
 const bidderCount = baData?.numberOfBidders || 0;
 const minimumBiddersReached = bidderCount >= 5; // Governance: minimum 5 bidders for tenders >$25K

 // Validation messages
 let bomValidationMessage = "";
 let cbaValidationMessage = "";

 // BOM can be accessed after announcement end date (regardless of bidder count)
 if (!announcementClosed) {
 bomValidationMessage = `${t.procurement.cbaAnnouncementMustClose} (closes ${announcementEndDate?.toLocaleDateString() || 'N/A'})`;
 }

 // Determine if Bid Evaluation is completed (status = financial_evaluation or awarded)
 const evalCompleted = (baData as any)?.status === 'financial_evaluation' || (baData as any)?.status === 'awarded';

 // CBA requires: announcement closed + BOM completed + Bid Evaluation completed
 // Flow: BOM Completed → Bid Evaluation opens → Bid Evaluation Completed → CBA opens
 if (!announcementClosed) {
 cbaValidationMessage = `${t.procurement.cbaAnnouncementMustClose} (closes ${announcementEndDate?.toLocaleDateString() || 'N/A'})`;
 } else if (!bomCompleted) {
 cbaValidationMessage = t.procurement.cbaBomMustBeCompleted;
 } else if (!evalCompleted) {
 cbaValidationMessage = t.procurement.cbaEvalMustBeCompleted;
 }

 // ── Supplier Quotation state (Goods > $25K) ──
 const isGoodsAbove25K = pr?.category === 'goods' && parseFloat(String(pr?.prTotalUsd || pr?.prTotalUsd || pr?.totalAmount || '0')) > 25000;
 const sqCount = sqData?.length || 0;
 const sqHasQuotations = sqCount > 0;
 const sqCompleted = sqCount >= 3; // At least 3 quotations for formal tender

 // Supplier Quotation validation for Bid Evaluation
 // Bid Evaluation requires at least 1 supplier quotation when SQ card is active
 let sqValidationMessage = "";
 if (isGoodsAbove25K && !sqHasQuotations && bomApproved) {
 sqValidationMessage = t.procurement.sqRequiredForEval || "At least one supplier quotation is required before Bid Evaluation";
 }

 // ── Contract & workflow state ──
 const contractExists = !!contractData;
 const contractApproved = contractData?.status === 'approved' || contractData?.status === 'active';
 const sacApprovedCount = (sacList || []).filter((s: any) => s.status === 'approved').length;
 const hasSacApproved = sacApprovedCount > 0;

 // For Services ≤ $1,000 (single quotation): Contract enabled when RFQ has received quotes (no QA needed)
 // For Services > $1,000 to $25,000: Contract enabled when QA is approved
 // For Services > $25,000: Contract enabled when CBA is awarded
 const totalUSD = parseFloat(String(pr?.prTotalUsd || pr?.prTotalUsd || pr?.totalAmount || '0'));
 const isSingleQuotation = totalUSD <= 1000;
 const rfqReceived = rfqData?.status === 'received' && rfqData?.suppliers?.length > 0;
 // For Goods PRs ≤ $1,000 (single quotation): PO unlocks when RFQ is received (no QA needed)
 // Works PRs NEVER use PO chain - they always use Contract chain
 const isGoodsSingleQuotation = pr?.category === 'goods' && isSingleQuotation;
 // For Goods >= $25K: PO requires approved contract first
 const canGeneratePOFinal = isGoodsContractRequired
 ? (!poData && contractApproved) // Goods >= $25K: PO blocked until contract approved
 : (canGeneratePO || (!poData && isGoodsSingleQuotation && rfqReceived));
 // Contract chain (Services & Works): Contract enabled when CBA awarded / QA approved / single quotation RFQ received
 const servicesContractReady = isContractChain && (baAwarded || qaApproved || (isSingleQuotation && rfqReceived) || contractExists);
 // Goods >= $25K: Contract enabled when CBA is awarded
 const goodsContractReady = isGoodsContractRequired && (baAwarded || contractExists);

 // Build cards
 const cards: WCard[] = [
 // PRIMARY FLOW
 {
 id: "pr",
 title: t.procurement.prDetails,
 icon: FileText,
 docNum: pr.prNumber,
 status: pr.status === "approved" ? t.procurement.approved : pr.status,
 color: pr.status === "approved" ? "green" : "blue",
 meta: [
 { label: t.procurement.reqDate, value: new Date(pr.prDate).toLocaleDateString() },
 { label: t.procurement.totalCost, value: `${pr.exchangeTo || pr.currency || 'USD'} ${Number(pr.prTotalUsd || pr.prTotalUsd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
 ],
 enabled: true,
 section: "primary",
 },
 // RFQ (only for <25K)
 ...(processInfo.requiresRFQ
 ? [
 {
 id: "rfq" as WorkspaceTab,
 title: t.procurement.rfq,
 icon: FileText,
 docNum: rfqData?.rfqNumber || t.procurement.notCreated,
 status: rfqData?.status || t.procurement.notCreated,
 color: (rfqData?.status === "sent" || rfqData?.status === "received" ? "green" : rfqData?.status === "draft" ? "blue" : rfqData?.status === "received" ? "green" : "gray") as WCard["color"],
 meta: rfqData
 ? [
 { label: t.procurement.reqDate, value: new Date(rfqData.issueDate).toLocaleDateString() },
 { label: t.procurement.cardLabelStatus, value: rfqData.status.charAt(0).toUpperCase() + rfqData.status.slice(1) },
 ]
 : [],
 enabled: pr.status === "approved",
 section: "primary" as const,
 },
 ]
 : []),
 // Tender Info (only for >25K)
 ...(processInfo.requiresTender
 ? [
 {
 id: "tender-info" as WorkspaceTab,
 title: t.procurement.tenderInfo,
 icon: Megaphone,
 status: t.procurement.active,
 color: "blue" as WCard["color"],
 meta: [{ label: t.procurement.cardLabelType, value: t.procurement.tenderInfo }],
 description: "Publish tender announcement with start/end dates, register bidders (minimum 5 required), and print bid receipt acknowledgements for each bidder.",
 enabled: true,
 section: "primary" as const,
 },
 {
 id: "bom" as WorkspaceTab,
 title: t.procurement.bidOpeningMinutes,
 icon: ClipboardCheck,
 status: announcementClosed ? (bomApproved ? t.procurement.completed : bomCompleted ? t.procurement.completed : t.procurement.statusRequired) : t.procurement.locked,
 color: announcementClosed ? ((bomApproved || bomCompleted) ? "green" : "yellow") : "gray" as WCard["color"],
 meta: announcementClosed
 ? ((bomApproved || bomCompleted) ? [{ label: t.procurement.cardLabelStatus, value: t.procurement.completed }] : [{ label: t.procurement.cardLabelType, value: t.procurement.bidOpeningMinutes }])
 : [{ label: t.procurement.cardLabelInfo, value: bomValidationMessage }],
 description: "Record the bid opening ceremony details: meeting date/time/location, committee members present, and list of bids received (no prices disclosed at this stage).",
 enabled: announcementClosed,
 section: "primary" as const,
 },
 // Supplier Quotation Entry card (only for Goods > $25K)
 ...(isGoodsAbove25K ? [{
 id: "supplier-quotation" as WorkspaceTab,
 title: t.supplierQuotationTab.title,
 icon: FileCheck,
 status: sqCompleted
 ? t.supplierQuotationTab.completed
 : sqHasQuotations ? t.supplierQuotationTab.inProgress : bomApproved ? t.procurement.active : t.procurement.locked,
 color: (sqCompleted
 ? "green"
 : sqHasQuotations ? "blue" : bomApproved ? "yellow" : "gray") as WCard["color"],
 meta: sqCompleted
 ? [{ label: t.procurement.cardLabelStatus, value: `${sqCount} ${t.supplierQuotationTab.quotationCount}` }]
 : sqHasQuotations
 ? [{ label: t.supplierQuotationTab.totalSuppliers, value: `${sqCount} ${t.supplierQuotationTab.quotationCount}` }]
 : bomApproved
 ? [{ label: t.procurement.cardLabelType, value: t.supplierQuotationTab.recordQuotation }]
 : [{ label: t.procurement.cardLabelInfo, value: t.supplierQuotationTab.bomRequiredFirst }],
 description: t.supplierQuotationTab.cardDescription,
 enabled: bomApproved,
 section: "primary" as const,
 }] : []),
 {
 id: "eval-criteria" as WorkspaceTab,
 title: t.procurement.evalCriteria,
 icon: ClipboardCheck,
 status: evalCompleted
 ? t.procurement.completed
 : (isGoodsAbove25K ? (announcementClosed && bomApproved && sqHasQuotations) : (announcementClosed && bomApproved)) ? t.procurement.active : t.procurement.locked,
 color: evalCompleted
 ? "green" as WCard["color"]
 : (isGoodsAbove25K ? (announcementClosed && bomApproved && sqHasQuotations) : (announcementClosed && bomApproved)) ? "blue" : "gray" as WCard["color"],
 meta: evalCompleted
 ? [{ label: t.procurement.cardLabelStatus, value: t.procurement.finalized }]
 : (isGoodsAbove25K ? (announcementClosed && bomApproved && sqHasQuotations) : (announcementClosed && bomApproved))
 ? [{ label: t.procurement.cardLabelType, value: t.procurement.evalCriteria }]
 : isGoodsAbove25K && announcementClosed && bomApproved && !sqHasQuotations
 ? [{ label: t.procurement.cardLabelInfo, value: t.supplierQuotationTab.quotationRequired }]
 : announcementClosed && bomCompleted && !bomApproved
 ? [{ label: t.procurement.cardLabelInfo, value: t.procurement.bomMustBeApprovedFirst }]
 : announcementClosed
 ? [{ label: t.procurement.cardLabelInfo, value: t.procurement.bomMustBeCompletedFirst }]
 : [{ label: t.procurement.cardLabelInfo, value: bomValidationMessage }],
 description: "Score each bidder's technical proposal across 5 evaluation sections (Legal, Experience, Capacity, Samples, References). Maximum 50 points. Bidders must score ≥70% (35/50) to qualify for financial evaluation.",
 enabled: isGoodsAbove25K ? (announcementClosed && bomApproved && sqHasQuotations) : (announcementClosed && bomApproved),
 section: "primary" as const,
 },
 {
 id: "cba" as WorkspaceTab,
	 title: t.procurement.cba,
	 icon: BarChart3,
	 status: cbaValidationMessage ? t.procurement.locked : ((baData as any)?.status === 'awarded' ? t.procurement.finalized : t.procurement.active),
	 color: cbaValidationMessage ? "gray" : ((baData as any)?.status === 'awarded' ? "green" : "blue") as WCard["color"],
	 meta: cbaValidationMessage
	 ? [{ label: t.procurement.cardLabelInfo, value: cbaValidationMessage }]
	 : (baData as any)?.status === 'awarded'
	 ? [{ label: t.procurement.cardLabelStatus, value: t.procurement.cbaFinalizedAwarded }, { label: t.procurement.cardLabelPo, value: t.procurement.poUnlocked }]
	 : [{ label: t.procurement.cardLabelType, value: t.procurement.officialCbaDocument }],
	 description: "Complete financial evaluation (50 points based on lowest bid), combine with technical scores (50 points) for final ranking (100 points total), and select winning bidder with justification.",
	 enabled: !cbaValidationMessage,
	 section: "primary" as const,
	 },
 ]
 : [
 // QA card only shown when process requires multiple quotations (>$1,000)
 // Single Quotation (≤$1,000) skips QA — goes directly from RFQ to Contract
 ...(!isSingleQuotation ? [{
 id: "analysis" as WorkspaceTab,
 title: t.procurement.analysis,
 icon: BarChart3,
 status: rfqData && rfqData.status === "received" && rfqData.suppliers && rfqData.suppliers.length > 0 ? t.procurement.active : t.procurement.locked,
 color: (rfqData && rfqData.status === "received" && rfqData.suppliers && rfqData.suppliers.length > 0 ? "blue" : "gray") as WCard["color"],
 meta: rfqData && rfqData.status === "received" && rfqData.suppliers && rfqData.suppliers.length > 0
 ? [{ label: t.procurement.cardLabelType, value: t.procurement.quotationAnalysisType }]
 : [{ label: t.procurement.cardLabelInfo, value: t.procurement.rfqWithQuotationsRequired }],
 enabled: rfqData && rfqData.status === "received" && rfqData.suppliers && rfqData.suppliers.length > 0,
 section: "primary" as const,
 }] : []),
 ]),
 // EXECUTION
 // Services: Contract → SAC → Payment
 // Works: Contract → SAC (Works Acceptance) → Payment
 // Goods >= $25K (Tender): Contract → PO → GRN → DN → SAC → Payment
 // Goods < $25K: PO → GRN → Delivery Notes → Payment
 ...(isContractChain ? [
 // Services/Works: CONTRACT card
 {
 id: "contract" as WorkspaceTab,
 title: t.procurement.contract,
 icon: ScrollText,
 docNum: contractData?.contractNumber || t.procurement.contractNotCreated,
 status: contractData ? (contractData.status === 'approved' || contractData.status === 'active' ? t.procurement.contractApproved : t.procurement.contractDraft) : t.procurement.contractNotCreated,
 color: (contractData?.status === 'approved' || contractData?.status === 'active' ? 'green' : contractData ? 'blue' : 'gray') as WCard['color'],
 meta: contractData
 ? [
 { label: t.procurement.contractVendor, value: (contractData as any).vendorName || '' },
 { label: t.procurement.contractValue, value: `${(contractData as any).currency || 'USD'} ${Number((contractData as any).contractValue || 0).toLocaleString()}` },
 ]
 : servicesContractReady
 ? [{ label: t.procurement.cardLabelInfo, value: t.procurement.createContract }]
 : [{ label: t.procurement.cardLabelInfo, value: isSingleQuotation ? 'RFQ must have received quotes first' : 'QA or CBA must be completed first' }],
 description: isWorks
 ? 'Create and manage the works contract with the awarded contractor. Contract must be approved before Works Acceptance Certificate (SAC) can be created.'
 : 'Create and manage the services contract with the awarded vendor. Contract must be approved before SAC can be created.',
 enabled: servicesContractReady,
 section: 'execution' as const,
 },
 // SAC card
 {
 id: "sac" as WorkspaceTab,
 title: isWorks ? (language === 'ar' ? 'شهادة قبول الأعمال' : 'Works Acceptance Certificate') : t.procurement.sacTitle,
 icon: FileCheck,
 docNum: sacList && sacList.length > 0 ? `${sacList.length} ${t.procurement.sacCount}` : t.procurement.sacNotCreated,
 status: sacList && sacList.length > 0 ? (hasSacApproved ? t.procurement.sacApproved : t.procurement.sacPending) : t.procurement.sacNotCreated,
 color: (hasSacApproved ? 'green' : sacList && sacList.length > 0 ? 'yellow' : 'gray') as WCard['color'],
 meta: contractApproved
 ? sacList && sacList.length > 0
 ? [
 { label: t.procurement.sacCount, value: `${sacList.length}` },
 { label: t.procurement.sacApproved, value: `${sacApprovedCount}` },
 ]
 : [{ label: t.procurement.cardLabelInfo, value: t.procurement.createSac }]
 : [{ label: t.procurement.cardLabelInfo, value: isWorks ? (language === 'ar' ? 'يجب اعتماد العقد قبل إنشاء شهادة قبول الأعمال' : 'Contract must be approved before creating Works Acceptance Certificate') : t.procurement.sacRequiresContract }],
 description: isWorks
 ? 'Works Acceptance Certificates confirm completion of construction/works milestones. Approved SAC triggers payable creation directly (no separate invoice needed).'
 : 'Service Acceptance Certificates confirm delivery of service milestones. At least one approved SAC is required before invoice creation.',
 enabled: contractApproved,
 section: 'execution' as const,
 },
 ] : isGoodsContractRequired ? [
 // Goods >= $25K (Tender): Contract → PO → GRN → DN → SAC → Payment
 // 1️⃣ CONTRACT card
 {
 id: "contract" as WorkspaceTab,
 title: t.procurement.contract,
 icon: ScrollText,
 docNum: contractData?.contractNumber || t.procurement.contractNotCreated,
 status: contractData ? (contractData.status === 'approved' || contractData.status === 'active' ? t.procurement.contractApproved : t.procurement.contractDraft) : t.procurement.contractNotCreated,
 color: (contractData?.status === 'approved' || contractData?.status === 'active' ? 'green' : contractData ? 'blue' : 'gray') as WCard['color'],
 meta: contractData
 ? [
 { label: t.procurement.contractVendor, value: (contractData as any).vendorName || '' },
 { label: t.procurement.contractValue, value: `${(contractData as any).currency || 'USD'} ${Number((contractData as any).contractValue || 0).toLocaleString()}` },
 ]
 : goodsContractReady
 ? [{ label: t.procurement.cardLabelInfo, value: t.procurement.createContract }]
 : [{ label: t.procurement.cardLabelInfo, value: language === 'ar' ? 'يجب ترسية التحليل التنافسي قبل إنشاء العقد' : 'CBA must be awarded before creating a Contract' }],
 description: 'Create and manage the goods contract with the awarded vendor. Contract must be approved before Purchase Order (PO) can be created.',
 enabled: goodsContractReady,
 section: 'execution' as const,
 },
 // 2️⃣ PO card (depends on contract approval)
 {
 id: "po" as WorkspaceTab,
 title: t.procurement.po,
 icon: ShoppingCart,
 docNum: poList && poList.length > 0 ? `${poList.length} ${t.procurement.poCount}` : (canGeneratePOFinal ? t.procurement.readyToGenerate : t.procurement.notCreated),
 status: poList && poList.length > 0
 ? (poData?.status || t.procurement.active)
 : canGeneratePOFinal
 ? t.procurement.statusReady
 : t.procurement.locked,
 color: (poList && poList.length > 0
 ? (poData?.status === "issued" ? "green" : "blue")
 : canGeneratePOFinal ? "yellow" : "gray") as WCard["color"],
 meta: poList && poList.length > 0
 ? [
 { label: t.procurement.cardLabelCount, value: `${poList.length} ${t.procurement.poCount}` },
 { label: t.procurement.cardLabelLatest, value: poData?.poNumber || "" },
 ]
 : canGeneratePOFinal
 ? [{ label: t.procurement.cardLabelSource, value: language === 'ar' ? 'من العقد المعتمد' : 'From approved Contract' }]
 : [{ label: t.procurement.cardLabelInfo, value: language === 'ar' ? 'يجب اعتماد العقد قبل إنشاء أمر الشراء' : 'Contract must be approved before creating Purchase Order' }],
 description: 'Create Purchase Order after contract approval. PO value must not exceed remaining contract value.',
 enabled: (poList && poList.length > 0) || canGeneratePOFinal,
 section: "execution" as const,
 },
 // 3️⃣ GRN card (Goods Receipt Note - warehouse verification)
 {
 id: "grn" as WorkspaceTab,
 title: t.procurement.grn,
 icon: Package,
 docNum: grnList && grnList.length > 0 ? `${grnList.length} ${t.procurement.grnCount}` : t.procurement.notCreated,
 status: grnList && grnList.length > 0 ? t.procurement.active : (poData?.status === "acknowledged" ? t.procurement.statusReady : t.procurement.notCreated),
 color: (grnList && grnList.length > 0 ? "blue" : poData?.status === "acknowledged" ? "yellow" : "gray") as WCard["color"],
 meta: poData?.status === "acknowledged"
 ? [{ label: t.procurement.cardLabelInfo, value: grnList && grnList.length > 0 ? `${grnList.length} ${t.procurement.grnCreated}` : (language === 'ar' ? 'التحقق من الكمية والحالة في المستودع' : 'Verify quantity and condition at warehouse') }]
 : [{ label: t.procurement.cardLabelInfo, value: t.procurement.poAcknowledgedRequired }],
 description: 'Goods Receipt Note verifies quantity and condition of delivered goods at the warehouse.',
 enabled: poData?.status === "acknowledged" || (grnList && grnList.length > 0),
 section: "execution" as const,
 },
 // 4️⃣ DN card (Delivery Note - supplier delivery confirmation)
 {
 id: "dn" as WorkspaceTab,
 title: t.procurement.deliveryNotes,
 icon: Truck,
 docNum: t.procurement.notCreated,
 status: poData?.status === "acknowledged" ? t.procurement.active : t.procurement.notCreated,
 color: (poData?.status === "acknowledged" ? "blue" : "gray") as WCard["color"],
 meta: poData?.status === "acknowledged"
 ? [{ label: t.procurement.cardLabelInfo, value: language === 'ar' ? 'تأكيد تسليم المورد' : 'Supplier delivery confirmation' }]
 : [{ label: t.procurement.cardLabelInfo, value: t.procurement.poAcknowledgedRequired }],
 description: 'Delivery Note confirms supplier delivery of goods after warehouse receipt (GRN).',
 enabled: poData?.status === "acknowledged",
 section: "execution" as const,
 },
 // 5️⃣ SAC card (Goods Acceptance Certificate - operational acceptance after GRN)
 {
 id: "sac" as WorkspaceTab,
 title: language === 'ar' ? 'شهادة قبول البضائع' : 'Goods Acceptance Certificate',
 icon: FileCheck,
 docNum: sacList && sacList.length > 0 ? `${sacList.length} ${t.procurement.sacCount}` : t.procurement.sacNotCreated,
 status: sacList && sacList.length > 0 ? (hasSacApproved ? t.procurement.sacApproved : t.procurement.sacPending) : (grnList && grnList.length > 0 ? t.procurement.active : t.procurement.sacNotCreated),
 color: (hasSacApproved ? 'green' : sacList && sacList.length > 0 ? 'yellow' : grnList && grnList.length > 0 ? 'blue' : 'gray') as WCard['color'],
 meta: (grnList && grnList.length > 0)
 ? sacList && sacList.length > 0
 ? [
 { label: t.procurement.sacCount, value: `${sacList.length}` },
 { label: t.procurement.sacApproved, value: `${sacApprovedCount}` },
 ]
 : [{ label: t.procurement.cardLabelInfo, value: language === 'ar' ? 'إنشاء شهادة قبول البضائع' : 'Create Goods Acceptance Certificate' }]
 : [{ label: t.procurement.cardLabelInfo, value: language === 'ar' ? 'يجب إنشاء إشعار استلام البضائع أولاً' : 'Goods Receipt Note (GRN) must be created first' }],
 description: 'Goods Acceptance Certificate confirms final acceptance of delivered goods after GRN validation. SAC financial fields are sourced from Contract, Payment Schedule, Penalties, and Retention.',
 enabled: grnList && grnList.length > 0,
 section: 'execution' as const,
 },
 ] : [
 // Goods < $25K: PO → GRN → Delivery Notes
 {
 id: "po" as WorkspaceTab,
 title: t.procurement.po,
 icon: ShoppingCart,
 docNum: poList && poList.length > 0 ? `${poList.length} ${t.procurement.poCount}` : (canGeneratePOFinal ? t.procurement.readyToGenerate : t.procurement.notCreated),
 status: poList && poList.length > 0
 ? (poData?.status || t.procurement.active)
 : canGeneratePOFinal
 ? t.procurement.statusReady
 : t.procurement.locked,
 color: (poList && poList.length > 0
 ? (poData?.status === "issued" ? "green" : "blue")
 : canGeneratePOFinal ? "yellow" : "gray") as WCard["color"],
 meta: poList && poList.length > 0
 ? [
 { label: t.procurement.cardLabelCount, value: `${poList.length} ${t.procurement.poCount}` },
 { label: t.procurement.cardLabelLatest, value: poData?.poNumber || "" },
 ]
 : canGeneratePOFinal
 ? [{ label: t.procurement.cardLabelSource, value: qaApproved ? t.procurement.fromQa : (isGoodsSingleQuotation && rfqReceived ? (language === 'ar' ? 'من عرض السعر المستلم' : 'From received RFQ') : t.procurement.fromBa) }]
 : [{ label: t.procurement.cardLabelInfo, value: isGoodsSingleQuotation ? (language === 'ar' ? 'يجب استلام عرض السعر أولاً' : 'RFQ must be received first') : (language === 'ar' ? 'يجب اعتماد تحليل العروض أولاً' : 'QA must be approved first') }],
 enabled: (poList && poList.length > 0) || canGeneratePOFinal,
 section: "execution" as const,
 },
 {
 id: "grn" as WorkspaceTab,
 title: t.procurement.grn,
 icon: Package,
 docNum: grnList && grnList.length > 0 ? `${grnList.length} ${t.procurement.grnCount}` : t.procurement.notCreated,
 status: grnList && grnList.length > 0 ? t.procurement.active : (poData?.status === "acknowledged" ? t.procurement.statusReady : t.procurement.notCreated),
 color: (grnList && grnList.length > 0 ? "blue" : poData?.status === "acknowledged" ? "yellow" : "gray") as WCard["color"],
 meta: poData?.status === "acknowledged"
 ? [{ label: t.procurement.cardLabelInfo, value: grnList && grnList.length > 0 ? `${grnList.length} ${t.procurement.grnCreated}` : t.procurement.readyToRecordGoodsReceipt }]
 : [{ label: t.procurement.cardLabelInfo, value: t.procurement.poAcknowledgedRequired }],
 enabled: poData?.status === "acknowledged" || (grnList && grnList.length > 0),
 section: "execution" as const,
 },
 {
 id: "dn" as WorkspaceTab,
 title: t.procurement.deliveryNotes,
 icon: Package,
 docNum: t.procurement.notCreated,
 status: poData?.status === "acknowledged" ? t.procurement.active : t.procurement.notCreated,
 color: (poData?.status === "acknowledged" ? "blue" : "gray") as WCard["color"],
 meta: poData?.status === "acknowledged"
 ? [{ label: t.procurement.cardLabelInfo, value: t.procurement.autoCreatedWhenGrnAccepted }]
 : [{ label: t.procurement.cardLabelInfo, value: t.procurement.grnAcceptedRequired }],
 enabled: poData?.status === "acknowledged",
 section: "execution" as const,
 },
 ]),
 // PAYMENT card (moved to execution section - unified for all categories)
 {
 id: "payment",
 title: t.procurement.payment,
 icon: CreditCard,
 docNum: payablesKPIs.total > 0 ? `${payablesKPIs.total} ${t.procurement.payableCount}` : t.procurement.notCreated,
 status: payablesKPIs.total > 0 ? (payablesKPIs.paid === payablesKPIs.total ? t.procurement.statusPaid : t.procurement.statusPending) : t.procurement.notCreated,
 color: (payablesKPIs.total > 0 ? (payablesKPIs.paid === payablesKPIs.total ? "green" : "yellow") : (
 ((isContractChain || isGoodsContractRequired) ? hasSacApproved : (grnList && grnList.length > 0)) ? "blue" : "gray"
 )) as WCard["color"],
 meta: payablesKPIs.total > 0
 ? [
 { label: t.procurement.payableTotal, value: `$${payablesKPIs.totalAmount.toLocaleString()}` },
 { label: t.procurement.payablePending, value: `${payablesKPIs.pendingInvoice + payablesKPIs.pendingApproval}` },
 { label: t.procurement.payableApproved, value: `${payablesKPIs.approved}` },
 { label: t.procurement.payablePaid, value: `${payablesKPIs.paid}` },
 ]
 : ((isContractChain || isGoodsContractRequired)
 ? (hasSacApproved
 ? [{ label: t.procurement.cardLabelInfo, value: language === 'ar' ? 'انقر لإنشاء دفعة' : 'Click to create payment' }]
 : [{ label: t.procurement.cardLabelInfo, value: isWorks ? (language === 'ar' ? 'يلزم اعتماد شهادة قبول أعمال واحدة على الأقل قبل الدفع' : 'At least one approved Works Acceptance Certificate is required before payment') : (isGoodsContractRequired ? (language === 'ar' ? 'يلزم اعتماد شهادة قبول البضائع قبل الدفع' : 'Goods Acceptance Certificate must be approved before payment') : t.procurement.paymentRequiresSac) }])
 : ((grnList && grnList.length > 0)
 ? [{ label: t.procurement.cardLabelInfo, value: language === 'ar' ? 'انقر لإنشاء دفعة' : 'Click to create payment' }]
 : [{ label: t.procurement.cardLabelInfo, value: t.procurement.grnAcceptedRequired }])),
 enabled: (isContractChain || isGoodsContractRequired) ? hasSacApproved : (grnList && grnList.length > 0),
 section: "execution",
 },
 // DOCUMENT CONTROL
 {
 id: "documents",
 title: t.procurement.documents,
 icon: FolderOpen,
 status: t.procurement.active,
 color: "blue",
 enabled: true,
 section: "document_control",
 },
 {
 id: "audit",
 title: t.procurement.audit,
 icon: History,
 status: t.procurement.active,
 color: "blue",
 enabled: true,
 section: "document_control",
 },
 ];

 const primaryCards = cards.filter((c) => c.section === "primary");
 const execCards = cards.filter((c) => c.section === "execution");
 const docControlCards = cards.filter((c) => c.section === "document_control");

 // If a tab is active, show tab content
 if (activeTab) {
 return (
 <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="max-w-7xl mx-auto p-6">
 {/* Back button - hidden for contract tab which has its own navigation */}
 {activeTab !== "contract" && (
 <div className="mb-4">
 <BackButton onClick={() => setActiveTab(null)} label={t.procurement.backDash} />
 </div>
 )}

 {/* Tab content */}
 <Suspense fallback={<Skeleton className="h-96 w-full" />}>
 {activeTab === "pr" && <PRDetailsTab pr={pr} t={t} isRTL={isRTL} />}
 {activeTab === "rfq" && <div className="bg-white rounded-lg border p-6">{t.procurement.comingSoon}</div>}
 {activeTab === "tender-info" && <TenderInformationTab purchaseRequestId={numericPrId} prNumber={pr?.prNumber} />}
 {activeTab === "eval-criteria" && <BidEvaluationCriteriaTab purchaseRequestId={numericPrId} prNumber={pr?.prNumber} />}
 {activeTab === "analysis" && (
 pr && parseFloat(pr.prTotalUsd || pr.prTotalUsd || "0") > 5000 && parseFloat(pr.prTotalUsd || pr.prTotalUsd || "0") <= 25000 ? (
 <QuotationAnalysisExtendedTab 
 qaId={qaData?.id || ""} 
 purchaseRequestId={numericPrId} 
 rfqId={rfqData?.id || ""}
 />
 ) : (
 <QuotationAnalysisTab purchaseRequestId={numericPrId} prNumber={pr?.prNumber} />
 )
 )}
 {activeTab === "cba" && <BidAnalysisTab purchaseRequestId={numericPrId} prNumber={pr?.prNumber} />}
 {activeTab === "bom" && <BidOpeningMinutesTab purchaseRequestId={numericPrId} prNumber={pr?.prNumber} />}
 {activeTab === "supplier-quotation" && <SupplierQuotationTab purchaseRequestId={numericPrId} prNumber={pr?.prNumber || ""} />}
 {activeTab === "po" && <PurchaseOrderTab purchaseRequestId={numericPrId} />}
 {activeTab === "grn" && <GoodsReceiptTab purchaseRequestId={numericPrId} prNumber={pr?.prNumber || ""} prStatus={pr?.status || ""} />}
 {activeTab === "dn" && <DeliveryNoteTab purchaseRequestId={numericPrId} />}
 {activeTab === "contract" && <ContractManagementTab purchaseRequestId={numericPrId} prNumber={pr?.prNumber} onBack={() => setActiveTab(null)} />}
 {activeTab === "sac" && <SACTab purchaseRequestId={numericPrId} prNumber={pr?.prNumber} />}
 {activeTab === "documents" && (
   <div className="bg-white rounded-lg border p-6">
     <DocumentControl
       prId={numericPrId}
       prNumber={pr?.prNumber || ""}
       paymentStatus={pr?.paymentStatus}
       onDocumentsGenerated={() => refetch()}
     />
   </div>
 )}
 {activeTab === "audit" && <div className="bg-white rounded-lg border p-6">{t.procurement.comingSoon}</div>}
 </Suspense>
 </div>
 </div>
 );
 }

 // Cards Grid Dashboard
 return (
 <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="max-w-7xl mx-auto p-6">
 {/* Header */}
 <div className="mb-6">
 <BackButton onClick={() => navigate("/organization/logistics/purchase-requests")} label={t.procurement.back} />
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-3xl font-bold text-gray-900">{t.procurement.title}</h1>
 <p className="text-gray-600 mt-1">{t.procurement.intro}</p>
 </div>
 <div className="flex gap-2">
 <Button
 variant="outline"
 size="icon"
onClick={() => {
						refetch();
						refetchRFQ();
						refetchQA();
						refetchBA();
						refetchSQ();
						refetchPO();
						refetchGRN();
						refetchBOM();
						refetchPayables();
						refetchAllPayables();
						setFinancialRefreshTrigger(prev => prev + 1);
						if (needsContract) {
							refetchContract();
							refetchSAC();
						}
							toast.success(t.logistics.dataRefreshed);
 }}
 className="shrink-0"
 title={t.logistics.refreshData}
 >
 <RefreshCw className={`w-4 h-4 ${isLoading || isRefetching ? "animate-spin" : ""}`} />
 </Button>
 <Button variant="outline" onClick={handleImportEmptyTemplate} className="gap-2">
 <Download className="w-4 h-4" />
 {t.procurement.importEmpty}
 </Button>
 <Button variant="outline" onClick={handleImportPR} className="gap-2">
 <Upload className="w-4 h-4" />
 {t.procurement.importWithData}
 </Button>
 <Button variant="outline" onClick={handleExportPR} className="gap-2">
 <Download className="w-4 h-4" />
 {t.procurement.exportPR}
 </Button>
 <Button variant="outline" onClick={() => navigate(`/organization/logistics/purchase-requests/${prId}/print`)} className="gap-2">
 <Printer className="w-4 h-4" />
 {t.procurement.print}
 </Button>
 </div>
 </div>
 </div>

 {/* Process Type Badge */}
 <div className="mb-6 flex gap-3">
 <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
 <Scale className="w-5 h-5 text-blue-600" />
 <span className="font-bold text-blue-900">{t.procurement.process}:</span>
 <span className="text-blue-700">{language === "ar" ? processInfo.labelAr : processInfo.label}</span>
 </div>
 {isContractChain && (
 <div className={`inline-flex items-center gap-2 px-4 py-2 ${isWorks ? 'bg-orange-50 border-orange-200' : 'bg-purple-50 border-purple-200'} border rounded-lg`}>
 <ScrollText className={`w-5 h-5 ${isWorks ? 'text-orange-600' : 'text-purple-600'}`} />
 <span className={`font-bold ${isWorks ? 'text-orange-900' : 'text-purple-900'}`}>
 {isWorks
 ? (language === 'ar' ? 'أعمال' : 'Works')
 : (language === 'ar' ? 'الخدمات' : 'Services')}:
 </span>
 <span className={isWorks ? 'text-orange-700' : 'text-purple-700'}>
 {isWorks
 ? (language === 'ar' ? 'العقد → شهادة قبول الأعمال → الدفع' : 'Contract → Works Acceptance (SAC) → Payment')
 : (language === 'ar' ? 'العقد → شهادة قبول الخدمة → الدفع' : 'Contract → SAC → Payment')}
 </span>
 </div>
 )}
 {isGoodsContractRequired && (
 <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
 <ScrollText className="w-5 h-5 text-emerald-600" />
 <span className="font-bold text-emerald-900">
 {language === 'ar' ? 'بضائع (مناقصة)' : 'Goods (Tender)'}:
 </span>
 <span className="text-emerald-700">
 {language === 'ar' ? 'العقد → أمر الشراء → محضر استلام → إشعار التسليم → شهادة قبول → الدفع' : 'Contract → PO → GRN → DN → SAC → Payment'}
 </span>
 </div>
 )
 }
 </div>

 {/* Contract Expiry Warning Banner */}
 {needsContract && contractData && contractData.endDate && (() => {
 const endDate = new Date(contractData.endDate);
 const now = new Date();
 const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
 const isExpired = daysUntilExpiry < 0;
 const isNearExpiry = daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
 if (!isExpired && !isNearExpiry) return null;
 return (
 <div className={`mb-4 p-4 rounded-lg border flex items-start gap-3 ${
 isExpired
 ? 'bg-red-50 border-red-200 text-red-800'
 : 'bg-amber-50 border-amber-200 text-amber-800'
 }`}>
 <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isExpired ? 'text-red-600' : 'text-amber-600'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
 <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
 <line x1="12" y1="9" x2="12" y2="13"/>
 <line x1="12" y1="17" x2="12.01" y2="17"/>
 </svg>
 <div>
 <p className="font-semibold">
 {isExpired
 ? (language === 'ar' ? '\u26A0\uFE0F \u0627\u0644\u0639\u0642\u062F \u0645\u0646\u062A\u0647\u064A \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0629' : '\u26A0\uFE0F Contract Expired')
 : (language === 'ar' ? '\u26A0\uFE0F \u0627\u0644\u0639\u0642\u062F \u0642\u0631\u064A\u0628 \u0645\u0646 \u0627\u0644\u0627\u0646\u062A\u0647\u0627\u0621' : '\u26A0\uFE0F Contract Nearing Expiry')}
 </p>
 <p className="text-sm mt-1">
 {isExpired
 ? (language === 'ar'
 ? `\u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u0639\u0642\u062F \u0641\u064A ${endDate.toLocaleDateString()}. \u064A\u0631\u062C\u0649 \u062A\u062C\u062F\u064A\u062F \u0623\u0648 \u062A\u0645\u062F\u064A\u062F \u0627\u0644\u0639\u0642\u062F \u0642\u0628\u0644 \u0625\u0646\u0634\u0627\u0621 \u0623\u0648\u0627\u0645\u0631 \u0634\u0631\u0627\u0621 \u062C\u062F\u064A\u062F\u0629.`
 : `Contract expired on ${endDate.toLocaleDateString()}. Please renew or extend the contract before creating new Purchase Orders.`)
 : (language === 'ar'
 ? `\u064A\u0646\u062A\u0647\u064A \u0627\u0644\u0639\u0642\u062F \u0641\u064A ${endDate.toLocaleDateString()} (${daysUntilExpiry} \u064A\u0648\u0645 \u0645\u062A\u0628\u0642\u064A). \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u062E\u0637\u064A\u0637 \u0644\u0644\u062A\u062C\u062F\u064A\u062F \u0623\u0648 \u0627\u0644\u062A\u0645\u062F\u064A\u062F.`
 : `Contract expires on ${endDate.toLocaleDateString()} (${daysUntilExpiry} days remaining). Please plan for renewal or extension.`)}
 </p>
 </div>
 </div>
 );
 })()}

 {/* Financial Status Widget */}<div className="mb-6">
  <PRFinancialStatusWidget purchaseRequestId={numericPrId} refreshTrigger={financialRefreshTrigger} />
 </div>

 {/* Cards Grid */}
 <div className="space-y-8">
 {/* Primary Flow */}
 <div>
 <h2 className="text-lg font-bold text-gray-900 mb-4">{t.procurement.secPrimary}</h2>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {primaryCards.map((card) => (
 <WCardUI 
 key={card.id} 
 card={card}
 isRTL={isRTL}
 lockReason={card.id === "rfq" && pr.status !== "approved" ? t.procurement.rfqApprovedRequired : undefined}
 onClick={() => {
 if (!card.enabled) {
 // Show validation message for locked cards
 if (card.id === "rfq" && pr.status !== "approved") {
 toast.error(t.procurement.rfqApprovedRequired);
 } else if (card.id === "bom" && bomValidationMessage) {
 toast.error(bomValidationMessage);
 } else if (card.id === "eval-criteria" && !bomCompleted) {
 toast.error(t.procurement.cbaBomMustBeCompleted);
 } else if (card.id === "eval-criteria" && bomCompleted && !bomApproved) {
 toast.error(t.procurement.bomMustBeApprovedFirst);
 } else if (card.id === "cba" && cbaValidationMessage) {
 toast.error(cbaValidationMessage);
 } else if (card.id === "supplier-quotation" && !bomApproved) {
 toast.error(t.supplierQuotationTab.bomRequiredFirst);
 } else if (card.id === "eval-criteria" && isGoodsAbove25K && !sqHasQuotations) {
 toast.error(t.supplierQuotationTab.quotationRequired);
 } else if (card.id === "po" && !canGeneratePOFinal) {
 toast.error(isGoodsAbove25K
 ? (language === 'ar' ? 'يجب ترسية التحليل التنافسي (CBA) قبل إنشاء أمر الشراء' : 'CBA must be awarded before generating a Purchase Order')
 : isGoodsSingleQuotation
 ? (language === 'ar' ? 'يجب استلام عرض السعر قبل إنشاء أمر الشراء' : 'RFQ must be received before generating a Purchase Order')
 : (language === 'ar' ? 'يجب اعتماد تحليل العروض قبل إنشاء أمر الشراء' : 'Quotation Analysis must be approved before generating a Purchase Order'));
 }
 return;
 }
 // Navigate to detail pages
 if (card.id === "contract") {
 setActiveTab("contract");
 return;
 } else if (card.id === "sac") {
 navigate(`/organization/logistics/procurement-workspace/sac/${numericPrId}`);
 return;
 } else if (card.id === "rfq") {
 // Navigate to RFQ page (will auto-create if doesn't exist)
 navigate(`/organization/logistics/rfq/${numericPrId}`);
 return;
 } else if (card.id === "qa" && qaData) {
 navigate(`/organization/logistics/quotation-analysis/${qaData.id}`);
 } else if (card.id === "tender-info") {
 // Navigate to Tender Information using PR ID (BA will be auto-created if needed)
 navigate(`/organization/logistics/procurement-workspace/tender-information/${numericPrId}`);
 } else if (card.id === "eval-criteria" && baData) {
 navigate(`/organization/logistics/procurement-workspace/bid-evaluation-checklist/${(baData as any).id}`);
 } else if (card.id === "bom") {
 navigate(`/organization/logistics/procurement-workspace/bid-opening-minutes/${numericPrId}`);
 } else if (card.id === "supplier-quotation") {
 setActiveTab(card.id);
 return;
 } else if (card.id === "cba" && baData) {
 navigate(`/organization/logistics/procurement-workspace/competitive-bid-analysis/${(baData as any).id}`);
 } else if (card.id === "pr") {
 setActiveTab(card.id); // Keep PR details inline
 } else {
 setActiveTab(card.id);
 }
 }} />
 ))}
 </div>
 </div>

 {/* Procurement Execution & Financial Payment */}
 <div>
 <h2 className="text-lg font-bold text-gray-900 mb-4">{t.procurement.secExec}</h2>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {execCards.map((card) => {
 if (card.id === "payment") {
 return (
 <WCardUI
 key={card.id}
 card={card}
 isRTL={isRTL}
 onClick={() => {
 if (card.enabled) {
 navigate(`/organization/logistics/payables?prId=${pr?.prNumber}&prDbId=${pr?.id}`);
 }
 }}
 />
 );
 }
 return (
 <WCardUI key={card.id} card={card} isRTL={isRTL} onClick={() => {
 if (!card.enabled) {
 // Show lock reason for disabled cards
 if (card.id === 'contract') {
 toast.error(language === 'ar' ? 'يجب ترسية التحليل التنافسي قبل إنشاء العقد' : 'CBA must be finalized (awarded) before creating a Contract');
 } else if (card.id === 'sac') {
 toast.error(isGoodsContractRequired
 ? (language === 'ar' ? 'يجب إنشاء إشعار استلام البضائع أولاً قبل إنشاء شهادة قبول البضائع' : 'Goods Receipt Note (GRN) must be created before creating Goods Acceptance Certificate')
 : (language === 'ar' ? 'يجب اعتماد العقد قبل إنشاء شهادة القبول' : 'Contract must be approved before creating Acceptance Certificate'));
 } else if (card.id === 'po' && isGoodsContractRequired) {
 toast.error(language === 'ar' ? 'يجب اعتماد العقد قبل إنشاء أمر الشراء' : 'Contract must be approved before creating Purchase Order');
 }
 return;
 }
 if (card.id === "po") {
 // Show PO tab inline (like BOM, GRN, etc.)
 setActiveTab(card.id);
 } else if (card.id === 'contract') {
 setActiveTab('contract');
 } else if (card.id === 'sac') {
 navigate(`/organization/logistics/procurement-workspace/sac/${numericPrId}`);
 } else {
 setActiveTab(card.id);
 }
 }} />
 );
 })}
 </div>
 </div>

 {/* Document Control */}
 <div>
 <h2 className="text-lg font-bold text-gray-900 mb-4">{t.procurement.secDocControl}</h2>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {docControlCards.map((card) => (
 <WCardUI key={card.id} card={card} isRTL={isRTL} onClick={() => card.enabled && setActiveTab(card.id)} />
 ))}
 </div>
 </div>
 </div>
 </div>

 </div>
 );
}

/* ── PR Details Tab ───────────────────────────────────────────────────── */
function PRDetailsTab({ pr, t, isRTL }: { pr: any; t: any; isRTL?: boolean }) {
 return (
 <div className="bg-white rounded-lg border border-gray-200 p-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-2xl font-bold text-gray-900">{pr.prNumber}</h2>
 <SBadge s={pr.status} c={pr.status === "approved" ? "green" : "blue"} />
 </div>

 {/* Header Info */}
 <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-gray-200">
 <div>
 <label className="block text-sm font-medium text-gray-500 mb-1">{t.procurement.reqDate}</label>
 <div className="text-gray-900 font-medium">{new Date(pr.prDate).toLocaleDateString()}</div>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-500 mb-1">{t.procurement.requester}</label>
 <div className="text-gray-900 font-medium">{pr.requesterName}</div>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-500 mb-1">{t.procurement.project}</label>
 <div className="text-gray-900 font-medium">{pr.projectTitle}</div>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-500 mb-1">{t.procurement.donor}</label>
 <div className="text-gray-900 font-medium">{pr.donorName}</div>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-500 mb-1">{t.procurement.totalCost}</label>
 <div className="text-gray-900 font-bold text-lg">
 {pr.exchangeTo || pr.currency || 'USD'} {Number(pr.prTotalUSD || pr.prTotalUsd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
 </div>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-500 mb-1">{t.procurement.urgency}</label>
 <div className="text-gray-900 font-medium">{pr.urgency}</div>
 </div>
 </div>

 {/* Items */}
 <div>
 <h3 className="text-lg font-bold text-gray-900 mb-4">{t.procurement.items}</h3>
 <div className="border border-gray-200 rounded-lg overflow-hidden">
 <table className="w-full">
 <thead className="bg-gray-50">
 <tr>
 <th className="px-4 py-3 text-start text-xs font-medium text-gray-500">#</th>
 <th className="px-4 py-3 text-start text-xs font-medium text-gray-500">{t.procurement.item}</th>
 <th className="px-4 py-3 text-start text-xs font-medium text-gray-500">{t.procurement.specs}</th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 ${'text-end'}`}>{t.procurement.qty}</th>
 <th className="px-4 py-3 text-start text-xs font-medium text-gray-500">{t.procurement.unit}</th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 ${'text-end'}`}>{t.procurement.unitPrice}</th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 ${'text-end'}`}>{t.procurement.total}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {pr.lineItems && pr.lineItems.length > 0 ? (
 pr.lineItems.map((item: any, idx: number) => (
 <tr key={item.id}>
 <td className="px-4 py-3 text-sm text-gray-900">{item.lineNumber || idx + 1}</td>
 <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
 <td className="px-4 py-3 text-sm text-gray-600 text-xs">{item.specifications}</td>
 <td className="px-4 py-3 text-sm text-gray-900 text-end">{item.quantity}</td>
 <td className="px-4 py-3 text-sm text-gray-900">{item.unit}</td>
 <td className="px-4 py-3 text-sm text-gray-900 text-end">
 {pr.exchangeTo || pr.currency || 'USD'} {Number(item.unitPrice || 0).toLocaleString()}
 </td>
 <td className="px-4 py-3 text-sm text-gray-900 text-end font-medium">
 {pr.exchangeTo || pr.currency || 'USD'} {Number(item.totalPrice || 0).toLocaleString()}
 </td>
 </tr>
 ))
 ) : (
 <tr>
 <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
 {t.procurement.noItems}
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>

 {/* Additional Info */}
 <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-500 mb-1">{t.procurement.justification}</label>
 <div className="text-gray-900">{pr.justification}</div>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-500 mb-1">{t.procurement.delivLoc}</label>
 <div className="text-gray-900">{pr.deliveryLocation}</div>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-500 mb-1">{t.procurement.neededBy}</label>
 <div className="text-gray-900">{pr.neededBy ? new Date(pr.neededBy).toLocaleDateString() : "N/A"}</div>
 </div>
 </div>
 </div>
 );
}
