/**
 * Purchase Request Form Page
 * Create and edit purchase requests with line items
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOperatingUnit } from "@/contexts/OperatingUnitContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Save, Send, AlertTriangle, CheckCircle, XCircle, Clock, Loader2, Pen } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { BudgetInformationSection } from "./BudgetInformationSection";
import { getBudgetExceededMessage } from "./budgetValidationHelper";
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";
import SignatureCapture from "@/components/SignatureCapture";

interface LineItem {
 id?: number;
 budgetLine: string;
 description: string;
 descriptionAr: string;
 specifications: string;
 quantity: string;
 unit: string;
 unitPrice: string;
 recurrence: string;
}

export default function PurchaseRequestForm() {
 const { t } = useTranslation();
 const { user } = useAuth();
 const { isRTL } = useLanguage();
 const [, navigate] = useLocation();
 const params = useParams<{ id: string }>();
 const isEdit = !!params.id;

 // Get organizationId and operatingUnitId from context (same pattern as Finance and HR modules)
 const { currentOrganization } = useOrganization();
 const { currentOperatingUnit, isLoading: ouLoading } = useOperatingUnit();

 const organizationId = currentOrganization?.id;
 const operatingUnitId = currentOperatingUnit?.id || 1;

 // Load unit types from master list
 const { data: unitTypesData, isLoading: unitTypesLoading } = trpc.masterData.unitTypes.getAll.useQuery({});
 
 // Scope readiness gating - do not execute scoped queries until scope is fully initialized
 const activeScopeReady = !!currentOrganization && !!currentOperatingUnit && !ouLoading;

 const [formData, setFormData] = useState({
 prNumber: "",
 category: "goods" as "goods" | "services" | "works",
 serviceType: "" as string,
 serviceTypeOther: "" as string,
 projectId: undefined as number | undefined,
 projectTitle: "",
 donorId: undefined as number | undefined,
 donorName: "",
 budgetCode: "",
 budgetTitle: "",
 budgetId: undefined as number | undefined,
 budgetLineId: undefined as number | undefined,
 exchangeRate: undefined as number | undefined,
 exchangeTo: "USD" as string,
 total: "0" as string,
 subBudgetLine: "",
 activityName: "",
 totalBudgetLine: "",
 currency: "USD",
 department: "",
 requesterName: user?.name || "",
 requesterEmail: user?.email || "",
 neededByDate: "",
 urgency: "normal" as "low" | "normal" | "high" | "critical",
 deliveryLocation: "",
 deliveryLocationAr: "",
 justification: "",
 justificationAr: "",
 status: "draft" as string,
 });

 const [budgetWarning, setBudgetWarning] = useState<string | null>(null);
 const [showSubmitDialog, setShowSubmitDialog] = useState(false);
 const [showRejectDialog, setShowRejectDialog] = useState(false);
 const [logisticsEmail, setLogisticsEmail] = useState("");
 const [financeEmail, setFinanceEmail] = useState("");
 const [pmEmail, setPmEmail] = useState("");
 const [rejectionReason, setRejectionReason] = useState("");
 const [selectedBudgetId, setSelectedBudgetId] = useState<number | undefined>(undefined);

 // Digital Signature Dialog states
 const [showLogisticSignatureDialog, setShowLogisticSignatureDialog] = useState(false);
 const [showFinanceSignatureDialog, setShowFinanceSignatureDialog] = useState(false);
 const [showPMSignatureDialog, setShowPMSignatureDialog] = useState(false);

 const [lineItems, setLineItems] = useState<LineItem[]>([
 { budgetLine: "", description: "", descriptionAr: "", specifications: "", quantity: "1", unit: "", unitPrice: "0" },
 ]);

 // Initialize line items with first unit type once data loads
 useEffect(() => {
 if (unitTypesData && unitTypesData.length > 0 && lineItems[0].unit === "") {
 setLineItems([{ budgetLine: "", description: "", descriptionAr: "", specifications: "", quantity: "1", unit: unitTypesData[0].name, unitPrice: "0" }]);
 }
 }, [unitTypesData]);

 // Load projects for dropdown
 const { data: projects } = trpc.projects.list.useQuery({
 limit: 1000,
 offset: 0,
 });

 // Load budgets for selected project
 // Scope headers are automatically injected by tRPC client, so no client-side scope gating needed
 const { data: budgets, isLoading: budgetsLoading, error: budgetsError } = trpc.budgets.list.useQuery(
 { projectId: formData.projectId },
 );

 const trpcUtils = trpc.useUtils();
 useEffect(() => {
 if (formData.projectId) {
 trpcUtils.budgets.list.invalidate();
 }
 }, [formData.projectId, trpcUtils]);


 // Auto-load currency from selected budget
 useEffect(() => {
 if (selectedBudgetId && budgets) {
 const selectedBudget = budgets.find(b => b.id === selectedBudgetId);
 if (selectedBudget) {
 // In edit mode, preserve the exchangeRate from the PR data
 // Only set exchangeRate from budget if in create mode
 const shouldSetExchangeRate = !isEdit || !formData.exchangeRate;
 
 setFormData(prev => {
 const updated = {
 ...prev,
 currency: selectedBudget.currency || 'USD',
 };
 if (shouldSetExchangeRate) {
 updated.exchangeRate = selectedBudget.exchangeRate ? parseFloat(selectedBudget.exchangeRate) : 1;
 }
 return updated;
 });
 }
 }
 }, [selectedBudgetId, budgets, isEdit]);

 // Auto-calculate total when totalBudgetLine or exchangeRate changes
 useEffect(() => {
 if (formData.totalBudgetLine && formData.exchangeRate) {
 const totalBudgetLineNum = parseFloat(String(formData.totalBudgetLine)) || 0;
 const exchangeRateNum = parseFloat(String(formData.exchangeRate)) || 1;
 const calculatedTotal = (totalBudgetLineNum * exchangeRateNum).toFixed(2);
 setFormData(prev => ({
 ...prev,
 total: calculatedTotal,
 }));
 }
 }, [formData.totalBudgetLine, formData.exchangeRate, formData.currency, formData.exchangeTo]);

 // Load budget details for displaying utilization
 const { data: selectedBudgetDetails } = trpc.budgets.getById.useQuery(
 { budgetId: selectedBudgetId || 0 },
 { enabled: !!selectedBudgetId }
 );

 // Load budget lines for selected budget
 const { data: budgetLinesData } = trpc.budgetLines.list.useQuery(
 { budgetId: selectedBudgetId || 0 },
 { enabled: !!selectedBudgetId }
 );

 // Calculate remaining budget for selected budget line
 // Use correct schema field names: totalAmount (allocation), actualSpent (spending), availableBalance (pre-calculated)
 const selectedBudgetLine = budgetLinesData?.find(bl => bl.id === formData.budgetLineId);
 const remainingBudget = selectedBudgetLine ? (selectedBudgetLine.availableBalance || 0) : 0;
 const budgetUtilizationPercent = selectedBudgetLine ? ((selectedBudgetLine.actualSpent || 0) / (selectedBudgetLine.totalAmount || 1)) * 100 : 0;

 const { data: existingPR } = trpc.logistics.purchaseRequests.getById.useQuery(
 { id: parseInt(params.id || "0") },
 { 
 enabled: isEdit && !!organizationId,
 // Force refetch when organization changes to prevent stale cached data
 refetchOnMount: true,
 staleTime: 0,
 }
 );

 useEffect(() => {
 if (existingPR && organizationId) {
 const pr = existingPR as any;
 setFormData({
 prNumber: pr.prNumber || "",
 category: (pr.category === 'consultancy' ? 'services' : pr.category) as any || "goods",
 serviceType: pr.serviceType || (pr.category === 'consultancy' ? 'consultancy' : '') || "",
 serviceTypeOther: pr.serviceTypeOther || "",
 projectId: pr.projectId || undefined,
 projectTitle: pr.projectTitle || "",
 donorId: pr.donorId || undefined,
 donorName: pr.donorName || "",
 budgetCode: pr.budgetCode || "",
 budgetTitle: pr.budgetTitle || "",
 budgetId: pr.budgetId || undefined,
 budgetLineId: pr.budgetLineId || undefined,
 exchangeRate: pr.exchangeRate ? parseFloat(String(pr.exchangeRate)) : undefined,
 exchangeTo: pr.exchangeTo || "USD",
 total: pr.total || "0",
 subBudgetLine: pr.subBudgetLine || "",
 activityName: pr.activityName || "",
 totalBudgetLine: pr.totalBudgetLine ? String(pr.totalBudgetLine) : "",
 currency: pr.currency || "USD",
 department: pr.department || "",
 requesterName: pr.requesterName || "",
 requesterEmail: pr.requesterEmail || "",
 neededByDate: pr.neededBy ? new Date(pr.neededBy).toISOString().split("T")[0] : "",
 urgency: pr.urgency as any || "normal",
 deliveryLocation: pr.deliveryLocation || "",
 deliveryLocationAr: pr.deliveryLocationAr || "",
 justification: pr.justification || "",
 justificationAr: pr.justificationAr || "",
 status: pr.status || "draft",
 });
 if (pr.lineItems?.length) {
 setLineItems(pr.lineItems.map((item: any) => ({
 id: item.id,
 budgetLine: item.budgetLine || "",
 description: item.description || "",
 descriptionAr: item.descriptionAr || "",
 specifications: item.specifications || "",
 quantity: item.quantity || "1",
 unit: item.unit || "Piece",
 unitPrice: item.unitPrice || "0",
 recurrence: item.recurrence || "",
 })));
 }
 // Set selectedBudgetId from existingPR if available
 if (pr.budgetId) {
 setSelectedBudgetId(pr.budgetId);
 }
 }
 }, [existingPR]);

 const createMutation = trpc.logistics.purchaseRequests.create.useMutation({
 onSuccess: () => {
 toast.success(t.logistics.purchaseRequestCreated);
 navigate("/organization/logistics/purchase-requests");
 },
 onError: (error) => toast.error(error.message),
 });

 const updateMutation = trpc.logistics.purchaseRequests.update.useMutation({
 onSuccess: () => {
 toast.success(t.logistics.purchaseRequestUpdated);
 // Invalidate PR list cache to force refresh
 trpcUtils.logistics.purchaseRequests.list.invalidate();
 navigate("/organization/logistics/purchase-requests");
 },
 onError: (error) => toast.error(error.message),
 });

 const submitMutation = trpc.logistics.purchaseRequests.submit.useMutation();
 const validateLogisticsMutation = trpc.logistics.purchaseRequests.validateByLogistics.useMutation();
 const validateFinanceMutation = trpc.logistics.purchaseRequests.validateByFinance.useMutation();
 const approvePMMutation = trpc.logistics.purchaseRequests.approveByPM.useMutation();
 const rejectMutation = trpc.logistics.purchaseRequests.reject.useMutation();
 const validateBudgetMutation = trpc.logistics.purchaseRequests.validateBudget.useMutation();

 // DO NOT auto-select first budget - let user explicitly select
 // This ensures Budget Lines and Currency only appear after user selection
 // Previously this caused hardcoded data to appear without user interaction

 // Budget validation effect - check if line items total exceeds budget limit
 useEffect(() => {
 const totalAmount = calculateTotal();
 
 // No budget line selected or no total - clear warning
 if (!formData.budgetLineId || totalAmount <= 0 || remainingBudget <= 0) {
 setBudgetWarning(null);
 return;
 }
 
 // Budget validation logic:
 // - remainingBudget is in the budget's native currency (formData.currency)
 // - totalAmount (line items total) is also in the budget's native currency
 // - If currency is USD, compare directly: totalAmount vs remainingBudget
 // - If currency is non-USD (e.g. EUR), the remaining budget is in that currency
 // and line items are also in that currency, so compare directly
 // BUT the "Total" field shows the converted amount in exchangeTo currency
 // The actual comparison should be: totalAmount (native) vs remainingBudget (native)
 
 // For USD budgets: line items total should not exceed remaining budget
 // For non-USD budgets: line items total should not exceed remaining budget (total field in native currency)
 if (formData.currency === 'USD' || formData.currency === formData.exchangeTo) {
 if (totalAmount > remainingBudget) {
 const warning = getBudgetExceededMessage(isRTL, formData.exchangeTo, totalAmount, remainingBudget);
 setBudgetWarning(warning);
 } else {
 setBudgetWarning(null);
 }
 } else {
 const exchangeRate = parseFloat(String(formData.exchangeRate || 1));
 const remainingInExchangeCurrency = remainingBudget * exchangeRate;
 if (totalAmount > remainingInExchangeCurrency) {
 const warning = getBudgetExceededMessage(isRTL, formData.exchangeTo, totalAmount, remainingInExchangeCurrency);
 setBudgetWarning(warning);
 } else {
 setBudgetWarning(null);
 }
 }
 }, [lineItems, formData.projectId, formData.budgetLineId, formData.currency, formData.exchangeRate, formData.exchangeTo, remainingBudget, isRTL]);

 // Determine if we're in view mode (URL doesn't contain /edit)
 const [location] = useLocation();
 const isViewMode = !location.includes("/edit") && !location.includes("/new");
 
 // Determine if fields should be locked (either in view mode OR status is not draft)
 const isLocked = isViewMode || (formData.status !== "draft" && formData.status !== "");

 // Approval workflow handlers
 const handleSubmitForApproval = async () => {
 if (!logisticsEmail) {
 toast.error(t.logistics.pleaseEnterLogisticsEmail);
 return;
 }
 try {
 let prId = params.id ? parseInt(params.id) : null;
 if (!prId) {
 const created = await createMutation.mutateAsync({
 category: formData.category,
 serviceType: formData.category === 'services' ? formData.serviceType : undefined,
 serviceTypeOther: formData.category === 'services' && formData.serviceType === 'other' ? formData.serviceTypeOther : undefined,
 projectId: formData.projectId,
 projectTitle: formData.projectTitle,
 donorId: formData.donorId,
 donorName: formData.donorName,
 budgetId: formData.budgetId,
 budgetCode: formData.budgetCode,
 budgetTitle: formData.budgetTitle,
 budgetLineId: formData.budgetLineId,
 subBudgetLine: formData.subBudgetLine,
 activityName: formData.activityName,
 totalBudgetLine: formData.totalBudgetLine ? String(parseFloat(formData.totalBudgetLine)) : undefined,
 exchangeRate: formData.exchangeRate ? String(formData.exchangeRate) : undefined,
 exchangeTo: formData.exchangeTo,
 total: formData.total ? String(parseFloat(formData.total)) : '0',
 currency: formData.currency,
 department: formData.department,
 requesterName: formData.requesterName,
 requesterEmail: formData.requesterEmail,
 urgency: formData.urgency,
 neededByDate: formData.neededByDate ? new Date(formData.neededByDate) : undefined,
 deliveryLocation: formData.deliveryLocation,
 justification: formData.justification,
 procurementLadder: "three_quotations" as const,
 lineItems: lineItems.map((item, index) => ({
 lineNumber: index + 1,
 budgetLine: item.budgetLine,
 description: item.description,
 descriptionAr: item.descriptionAr,
 specifications: item.specifications,
 quantity: item.quantity,
 unit: item.unit,
 unitPrice: item.unitPrice,
 totalPrice: (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0),
 })),
 });
 prId = created.id;
 }
 await submitMutation.mutateAsync({ id: prId!, logisticsEmail });
 toast.success(t.logistics.prSubmittedLogisticsTeamNotified);
 setShowSubmitDialog(false);
 navigate("/organization/logistics/purchase-requests");
 } catch (error: any) {
 toast.error(error.message || (t.logistics.failedToSubmitPr));
 }
 };

 // Signature approval handlers
 const handleLogisticSignatureApproval = async (data: {
 signerName: string;
 signerTitle: string;
 signatureDataUrl: string;
 }) => {
 try {
 await validateLogisticsMutation.mutateAsync({
 id: parseInt(params.id!),
 financeEmail,
 signerName: data.signerName,
 signerTitle: data.signerTitle,
 signatureDataUrl: data.signatureDataUrl,
 });
 toast.success(t.logistics.validatedByLogistics);
 setShowLogisticSignatureDialog(false);
 refetchPR();
 } catch (error: any) {
 toast.error(error.message);
 }
 };

 const handleFinanceSignatureApproval = async (data: {
 signerName: string;
 signerTitle: string;
 signatureDataUrl: string;
 }) => {
 try {
 await validateFinanceMutation.mutateAsync({
 id: parseInt(params.id!),
 pmEmail,
 signerName: data.signerName,
 signerTitle: data.signerTitle,
 signatureDataUrl: data.signatureDataUrl,
 });
 toast.success(t.logistics.validatedByFinance);
 setShowFinanceSignatureDialog(false);
 refetchPR();
 } catch (error: any) {
 toast.error(error.message);
 }
 };

 const handlePMSignatureApproval = async (data: {
 signerName: string;
 signerTitle: string;
 signatureDataUrl: string;
 }) => {
 try {
 await approvePMMutation.mutateAsync({
 id: parseInt(params.id!),
 signerName: data.signerName,
 signerTitle: data.signerTitle,
 signatureDataUrl: data.signatureDataUrl,
 });
 toast.success(t.logistics.prApproved);
 setShowPMSignatureDialog(false);
 navigate("/organization/logistics/purchase-requests");
 } catch (error: any) {
 toast.error(error.message);
 }
 };

 // Refetch PR data after signature
 const refetchPR = () => {
 trpcUtils.logistics.purchaseRequests.getById.invalidate();
 };

 const handleValidateFinance = async () => {
 if (!pmEmail) {
 toast.error(t.logistics.pleaseEnterPmEmail);
 return;
 }
 try {
 await validateFinanceMutation.mutateAsync({ id: parseInt(params.id!), pmEmail });
 toast.success(t.logistics.validatedByFinance);
 navigate("/organization/logistics/purchase-requests");
 } catch (error: any) {
 toast.error(error.message);
 }
 };

 const handleApprovePM = async () => {
 try {
 await approvePMMutation.mutateAsync({ id: parseInt(params.id!) });
 toast.success(t.logistics.prApproved);
 navigate("/organization/logistics/purchase-requests");
 } catch (error: any) {
 toast.error(error.message);
 }
 };

 const handleReject = async () => {
 if (!rejectionReason || rejectionReason.length < 10) {
 toast.error(t.logistics.pleaseEnterRejectionReasonAtLeast);
 return;
 }
 try {
 let rejectedBy: "logistic" | "finance" | "pm" = "logistic";
 if (formData.status === "validated_by_logistic") rejectedBy = "finance";
 else if (formData.status === "validated_by_finance") rejectedBy = "pm";
 await rejectMutation.mutateAsync({ id: parseInt(params.id!), rejectedBy, reason: rejectionReason });
 toast.success(t.logistics.prRejected);
 setShowRejectDialog(false);
 navigate("/organization/logistics/purchase-requests");
 } catch (error: any) {
 toast.error(error.message);
 }
 };

 const addLineItem = () => {
 const defaultUnit = unitTypesData && unitTypesData.length > 0 ? unitTypesData[0].name : "";
 if (defaultUnit) {
 setLineItems([...lineItems, { budgetLine: "", description: "", descriptionAr: "", specifications: "", quantity: "1", unit: defaultUnit, unitPrice: "0", recurrence: "" }]);
 } else {
 toast.error(t.logistics.unitTypesNotLoadedYet);
 }
 };

 const removeLineItem = (index: number) => {
 if (lineItems.length > 1) {
 setLineItems(lineItems.filter((_, i) => i !== index));
 }
 };

 const updateLineItem = (index: number, field: keyof LineItem, value: string) => {
 const updated = [...lineItems];
 updated[index] = { ...updated[index], [field]: value };
 setLineItems(updated);
 };

 const calculateTotal = () => {
 return lineItems.reduce((sum, item) => {
 const qty = parseFloat(item.quantity) || 0;
 const price = parseFloat(item.unitPrice) || 0;
 const recurrence = parseFloat(item.recurrence) || 1;
 return sum + qty * price * recurrence;
 }, 0);
 };

 const handleSubmit = (status: "draft" | "submitted") => {
 console.log("[PurchaseRequestForm] Submitting with formData.exchangeRate:", formData.exchangeRate);
 const payload = {
 category: formData.category,
 serviceType: formData.category === 'services' ? formData.serviceType : undefined,
 serviceTypeOther: formData.category === 'services' && formData.serviceType === 'other' ? formData.serviceTypeOther : undefined,
 projectId: formData.projectId,
 projectTitle: formData.projectTitle,
 donorId: formData.donorId,
 donorName: formData.donorName,
 budgetId: formData.budgetId,
 budgetCode: formData.budgetCode,
 budgetTitle: formData.budgetTitle,
 budgetLineId: formData.budgetLineId,
 subBudgetLine: formData.subBudgetLine,
 activityName: formData.activityName,
 totalBudgetLine: formData.totalBudgetLine ? String(parseFloat(formData.totalBudgetLine)) : undefined,
 exchangeRate: formData.exchangeRate ? String(formData.exchangeRate) : undefined,
 exchangeTo: formData.exchangeTo,
 total: formData.total ? String(parseFloat(formData.total)) : '0',
 currency: formData.currency,
 department: formData.department,
 requesterName: formData.requesterName,
 requesterEmail: formData.requesterEmail,
 urgency: formData.urgency,
 neededByDate: formData.neededByDate ? new Date(formData.neededByDate) : undefined,
 deliveryLocation: formData.deliveryLocation,
 justification: formData.justification,
 procurementLadder: "three_quotations" as const,
 lineItems: lineItems.map((item, index) => ({
 lineNumber: index + 1,
 budgetLine: item.budgetLine,
 description: item.description,
 descriptionAr: item.descriptionAr,
 specifications: item.specifications,
 quantity: item.quantity,
 unit: item.unit,
 unitPrice: item.unitPrice,
 recurrence: item.recurrence,
 totalPrice: (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0) * (parseFloat(item.recurrence) || 1),
 })),
 };

 console.log("[PurchaseRequestForm] Payload being sent:", payload);
 if (isEdit) {
 updateMutation.mutate({ id: parseInt(params.id!), ...payload });
 } else {
 createMutation.mutate(payload);
 }
 };

 // Show loading state while scope is being initialized
 if (!activeScopeReady) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="text-center">
 <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
 <p className="text-muted-foreground">{t.logistics.initializingScope}</p>
 </div>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-background">
 <div className="border-b bg-card">
 <div className="container py-6">
 {/* Finance-style back button */}
 <BackButton href="/organization/logistics/purchase-requests" label={t.logistics.backToPurchaseRequests} />
 
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-foreground">
 {isEdit ? (t.logistics.editPurchaseRequest) : (t.logistics.newPurchaseRequest)}
 </h1>
 {formData.status && formData.status !== "draft" && (
 <Badge className="mt-2">
 {formData.status === "submitted" && (t.logistics.submitted)}
 {formData.status === "validated_by_logistic" && (t.logistics.logisticsValidated)}
 {formData.status === "validated_by_finance" && (t.logistics.financeValidated)}
 {formData.status === "approved" && (t.logistics.approved)}
 {formData.status.startsWith("rejected") && (t.logistics.rejected)}
 </Badge>
 )}
 </div>
 <div className="flex gap-2">
 {formData.status === "draft" && (
 <>
 <Button variant="outline" onClick={() => handleSubmit("draft")} disabled={createMutation.isPending || updateMutation.isPending || isLocked || !!budgetWarning}>
 <Save className="h-4 w-4 me-2" />
 {t.logistics.saveDraft}
 </Button>
 <Button onClick={() => setShowSubmitDialog(true)} disabled={createMutation.isPending || updateMutation.isPending || !!budgetWarning}>
 <Send className="h-4 w-4 me-2" />
 {t.logistics.submitForApproval}
 </Button>
 </>
 )}
 {formData.status === "submitted" && (
 <>
 <Button variant="destructive" onClick={() => setShowRejectDialog(true)}>
 <XCircle className="h-4 w-4 me-2" />
 {t.logistics.reject}
 </Button>
 <Button onClick={() => setShowLogisticSignatureDialog(true)}>
 <Pen className="h-4 w-4 me-2" />
 {t.logistics.signAndValidateLogistics}
 </Button>
 </>
 )}
 {formData.status === "validated_by_logistic" && (
 <>
 <Button variant="destructive" onClick={() => setShowRejectDialog(true)}>
 <XCircle className="h-4 w-4 me-2" />
 {t.logistics.reject}
 </Button>
 <Button onClick={() => setShowFinanceSignatureDialog(true)}>
 <Pen className="h-4 w-4 me-2" />
 {t.logistics.signAndValidateFinance}
 </Button>
 </>
 )}
 {formData.status === "validated_by_finance" && (
 <>
 <Button variant="destructive" onClick={() => setShowRejectDialog(true)}>
 <XCircle className="h-4 w-4 me-2" />
 {t.logistics.reject}
 </Button>
 <Button onClick={() => setShowPMSignatureDialog(true)}>
 <Pen className="h-4 w-4 me-2" />
 {t.logistics.signAndApprovePm}
 </Button>
 </>
 )}
 </div>
 </div>
 </div>
 </div>

 <div className="container py-6 space-y-6">

 <Card>
 <CardHeader><CardTitle>{t.logistics.basicInformation}</CardTitle></CardHeader>
 <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 <div><Label>{t.logistics.prNumber}</Label><Input value={formData.prNumber || (t.logistics.autogenerated)} readOnly disabled className="bg-muted" /></div>
 <div><Label>{t.logistics.category}</Label>
 <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v as any })} disabled={isLocked}>
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="goods">{t.logistics.goods}</SelectItem>
 <SelectItem value="services">{t.logistics.services}</SelectItem>
 <SelectItem value="works">{t.logistics.works}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 {formData.category === "services" && (
 <div><Label>{t.logistics.serviceType || "Service Type"}</Label>
 <Select value={formData.serviceType || ""} onValueChange={(v) => setFormData({ ...formData, serviceType: v, serviceTypeOther: v === "other" ? formData.serviceTypeOther : "" })} disabled={isLocked}>
 <SelectTrigger><SelectValue placeholder="Select service type..." /></SelectTrigger>
 <SelectContent>
 <SelectItem value="consultancy">{t.logistics.consultancy || "Consultancy"}</SelectItem>
 <SelectItem value="maintenance">{t.logistics.maintenance || "Maintenance"}</SelectItem>
 <SelectItem value="training">{t.logistics.training || "Training"}</SelectItem>
 <SelectItem value="cleaning">{t.logistics.cleaning || "Cleaning"}</SelectItem>
 <SelectItem value="security">{t.logistics.security || "Security"}</SelectItem>
 <SelectItem value="transportation">{t.logistics.transportation || "Transportation"}</SelectItem>
 <SelectItem value="catering">{t.logistics.catering || "Catering"}</SelectItem>
 <SelectItem value="it_services">{t.logistics.itServices || "IT Services"}</SelectItem>
 <SelectItem value="audit">{t.logistics.audit || "Audit"}</SelectItem>
 <SelectItem value="legal">{t.logistics.legal || "Legal"}</SelectItem>
 <SelectItem value="other">{t.logistics.other || "Other"}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 )}
 {formData.category === "services" && formData.serviceType === "other" && (
 <div><Label>{t.logistics.serviceTypeOther || "Specify Service Type"}</Label>
 <Input value={formData.serviceTypeOther} onChange={(e) => setFormData({ ...formData, serviceTypeOther: e.target.value })} placeholder="Enter service type..." disabled={isLocked} />
 </div>
 )}
 <div><Label>{t.logistics.urgency}</Label>
 <Select value={formData.urgency} onValueChange={(v) => setFormData({ ...formData, urgency: v as any })} disabled={isLocked}>
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="low">{t.logistics.low}</SelectItem>
 <SelectItem value="normal">{t.logistics.normal}</SelectItem>
 <SelectItem value="high">{t.logistics.high}</SelectItem>
 <SelectItem value="critical">{t.logistics.critical}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div>
 <Label>{t.logistics.projectTitle}</Label>
 <select
 value={String(formData.projectId || '')}
 onChange={(e) => {
 const val = e.target.value;
 if (val) {
 const selectedProject = projects?.find(p => p.id === parseInt(val));
 if (selectedProject) {
 setFormData(prev => ({ 
 ...prev, 
 projectId: selectedProject.id,
 projectTitle: selectedProject.title || selectedProject.titleEn || "",
 donorId: selectedProject.donorId || undefined,
 donorName: selectedProject.donor || "",
 budgetCode: selectedProject.budgetCode || "",
 subBudgetLine: selectedProject.subBudgetLine || ""
 }));
 }
 } else {
 setFormData(prev => ({ 
 ...prev, 
 projectId: undefined,
 projectTitle: "",
 donorId: undefined,
 donorName: "",
 budgetCode: "",
 subBudgetLine: ""
 }));
 }
 }}
 className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
 >
 <option value="">{t.logistics.selectProject}</option>
 {/* Show selected project even if not in projects array (for edit mode) */}
 {formData.projectId && !projects?.find(p => p.id === formData.projectId) && (
 <option key={formData.projectId} value={String(formData.projectId)}>
 {formData.projectTitle}
 </option>
 )}
 {projects?.map(project => (
 <option key={project.id} value={String(project.id)}>
 {project.title || project.titleEn}
 </option>
 ))}
 </select>
 </div>
 <div>
 <Label>{t.logistics.donor}</Label>
 <Input value={formData.donorName} readOnly className="bg-muted" />
 </div>
 <div>
 <Label>{t.logistics.budget}</Label>
 <select
 value={String(selectedBudgetId || '')}
 onChange={(e) => {
 const budgetId = parseInt(e.target.value);
 setSelectedBudgetId(budgetId);
 // Auto-load budget currency and exchange rate
 const selectedBudget = budgets?.find(b => b.id === budgetId);
 if (selectedBudget) {
 setFormData(prev => ({
 ...prev,
 budgetId: budgetId,
 budgetLineId: undefined,
 currency: selectedBudget.currency || 'USD',
 // Only set exchangeRate if it's not already set (new PR mode)
 exchangeRate: prev.exchangeRate !== undefined ? prev.exchangeRate : (selectedBudget.exchangeRate ? parseFloat(selectedBudget.exchangeRate) : 1),
 }));
 }
 }}
 disabled={!formData.projectId || isLocked}
 className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 <option value="">{t.logistics.selectBudget}</option>
 {selectedBudgetId && !budgets?.find(b => b.id === selectedBudgetId) && (
 <option key={selectedBudgetId} value={String(selectedBudgetId)}>
 {formData.budgetTitle || formData.budgetCode || `Budget ${selectedBudgetId}`}
 </option>
 )}
 {budgets && budgets.length > 0 ? (
 budgets.map(budget => (
 <option key={budget.id} value={String(budget.id)}>
 {budget.budgetTitle || budget.budgetTitleAr || budget.budgetCode || `Budget ${budget.id}`}
 </option>
 ))
 ) : (
 <option disabled>{t.logistics.noBudgetsAvailable}</option>
 )}
 </select>
 </div>
 </CardContent>
 </Card>

 <Card>
 <CardHeader><CardTitle>{t.logistics.budgetInformation}</CardTitle></CardHeader>
 <CardContent>
 <BudgetInformationSection
 isRTL={isRTL}
 formData={formData}
 setFormData={setFormData}
 selectedBudgetId={selectedBudgetId}
 selectedBudgetLine={selectedBudgetLine}
 budgetLinesData={budgetLinesData || []}
 remainingBudget={remainingBudget}
 budgetUtilizationPercent={budgetUtilizationPercent}
 isLocked={isLocked}
 />
 </CardContent>
 </Card>

 <Card>
 <CardHeader><CardTitle>{t.logistics.requesterInformation}</CardTitle></CardHeader>
 <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
 <div><Label>{t.logistics.requesterName}</Label><Input value={formData.requesterName} onChange={(e) => setFormData({ ...formData, requesterName: e.target.value })} disabled={isLocked} /></div>
 <div><Label>{t.logistics.email}</Label><Input type="email" value={formData.requesterEmail} onChange={(e) => setFormData({ ...formData, requesterEmail: e.target.value })} disabled={isLocked} /></div>
 <div><Label>{t.logistics.department}</Label><Input value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} disabled={isLocked} /></div>
 <div><Label>{t.logistics.neededByDate}</Label><Input type="date" value={formData.neededByDate} onChange={(e) => setFormData({ ...formData, neededByDate: e.target.value })} disabled={isLocked} /></div>
 </CardContent>
 </Card>

 <Card>
 <CardHeader>
 <div className="flex items-center justify-between">
 <CardTitle>{t.logistics.lineItems}</CardTitle>
 <Button variant="outline" size="sm" onClick={addLineItem} disabled={isLocked}><Plus className="h-4 w-4 me-2" />{t.logistics.addItem}</Button>
 </div>
 </CardHeader>
 <CardContent>
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="w-[50px]">#</TableHead>
 <TableHead>{t.logistics.description}</TableHead>
 <TableHead className="w-[100px]">{t.logistics.qty}</TableHead>
 <TableHead className="w-[100px]">{t.logistics.unit}</TableHead>
 <TableHead className="w-[120px]">{t.logistics.unitPrice}</TableHead>
 <TableHead className="w-[120px]">{t.logistics.recurrence}</TableHead>
 <TableHead className="w-[120px]">{t.logistics.total}</TableHead>
 <TableHead className="w-[50px]"></TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {lineItems.map((item, index) => (
 <TableRow key={index}>
 <TableCell>{index + 1}</TableCell>
 <TableCell><Input value={item.description} onChange={(e) => updateLineItem(index, "description", e.target.value)} placeholder={t.logistics.itemDescription} disabled={isLocked} /></TableCell>
 <TableCell><Input type="number" min="1" value={item.quantity} onChange={(e) => updateLineItem(index, "quantity", e.target.value)} disabled={isLocked} /></TableCell>
 <TableCell>
 <Select value={item.unit} onValueChange={(v) => updateLineItem(index, "unit", v)} disabled={isLocked || unitTypesLoading}>
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 {unitTypesData && unitTypesData.length > 0 ? (
 unitTypesData.map((unitType) => (
 <SelectItem key={unitType.id} value={unitType.name}>
 {isRTL ? unitType.nameAr || unitType.name : unitType.name}
 </SelectItem>
 ))
 ) : null}
 </SelectContent>
 </Select>
 </TableCell>
 <TableCell><Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateLineItem(index, "unitPrice", e.target.value)} disabled={isLocked} /></TableCell>
 <TableCell><Input type="number" min="1" max="100" value={item.recurrence} onChange={(e) => updateLineItem(index, "recurrence", e.target.value)} disabled={isLocked} /></TableCell>
 <TableCell className="font-medium">{((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0) * (parseFloat(item.recurrence) || 1)).toFixed(2)}</TableCell>
 <TableCell><Button variant="ghost" size="icon" onClick={() => removeLineItem(index)} disabled={lineItems.length === 1 || isLocked}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 <div className="mt-4 flex flex-col items-end gap-1">
 <div className="text-lg font-bold">
 {t.logistics.total4} {formData.exchangeTo} {calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}
 </div>
 </div>
 
 {/* Budget Error Alert - Below Line Items Total - Blocks save/submit */}
 {budgetWarning && !isViewMode && (
 <Alert variant="destructive" className="mt-4 border-2 border-destructive bg-destructive/10">
 <AlertTriangle className="h-5 w-5" />
 <AlertTitle className="text-base font-semibold">{t.logistics.budgetExceeded}</AlertTitle>
 <AlertDescription className="text-sm">{budgetWarning}</AlertDescription>
 </Alert>
 )}
 </CardContent>
 </Card>

 <Card>
 <CardHeader><CardTitle>{t.logistics.justification}</CardTitle></CardHeader>
 <CardContent>
 <div><Label>{t.logistics.justification5}</Label><Textarea rows={4} value={formData.justification} onChange={(e) => setFormData({ ...formData, justification: e.target.value })} disabled={isLocked} /></div>
 </CardContent>
 </Card>
 </div>

 {/* Submit Dialog */}
 <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>{t.logistics.submitPurchaseRequest}</DialogTitle>
 <DialogDescription>
 {t.logistics.anEmailNotificationWillBeSent}
 </DialogDescription>
 </DialogHeader>
 <div className="space-y-4">
 <div>
 <Label>{t.logistics.logisticsEmail}</Label>
 <Input
 type="email"
 value={logisticsEmail}
 onChange={(e) => setLogisticsEmail(e.target.value)}
 placeholder={t.placeholders.logisticsOrganizationOrg}
 />
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
 {t.logistics.cancel}
 </Button>
 <Button onClick={handleSubmitForApproval} disabled={submitMutation.isPending}>
 {submitMutation.isPending ? (t.logistics.submitting) : (t.logistics.submit)}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Reject Dialog */}
 <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>{t.logistics.rejectPurchaseRequest}</DialogTitle>
 <DialogDescription>
 {t.logistics.pleaseEnterTheReasonForRejection}
 </DialogDescription>
 </DialogHeader>
 <div className="space-y-4">
 <div>
 <Label>{t.logistics.rejectionReason}</Label>
 <Textarea
 rows={4}
 value={rejectionReason}
 onChange={(e) => setRejectionReason(e.target.value)}
 placeholder={t.logistics.enterRejectionReason}
 />
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
 {t.logistics.cancel}
 </Button>
 <Button variant="destructive" onClick={handleReject} disabled={rejectMutation.isPending}>
 {rejectMutation.isPending ? (t.logistics.rejecting) : (t.logistics.reject)}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Logistic Officer Signature Dialog */}
 <SignatureCapture
 open={showLogisticSignatureDialog}
 onClose={() => setShowLogisticSignatureDialog(false)}
 onSave={handleLogisticSignatureApproval}
 defaultName={user?.name || ""}
 defaultTitle={isRTL ? "مسؤول اللوجستيات" : "Logistics Officer"}
 isRTL={isRTL}
 saving={validateLogisticsMutation.isPending}
 labels={{
 title: isRTL ? 'التوقيع الرقمي - التحقق من اللوجستيات' : 'Digital Signature - Logistics Validation',
 description: isRTL ? 'ارسم توقيعك للتحقق من طلب الشراء. سيتم إنشاء رمز تحقق QR تلقائياً.' : 'Draw your signature to validate this purchase request. A QR verification code will be generated automatically.',
 nameLabel: isRTL ? 'اسم الموقّع' : 'Signer Name',
 titleLabel: isRTL ? 'المسمى الوظيفي' : 'Title / Role',
 namePlaceholder: isRTL ? 'أدخل اسمك الكامل' : 'Enter your full name',
 titlePlaceholder: isRTL ? 'مسؤول اللوجستيات' : 'Logistics Officer',
 drawSignature: isRTL ? 'ارسم توقيعك أدناه' : 'Draw your signature below',
 clearSignature: isRTL ? 'مسح' : 'Clear',
 saveSignature: isRTL ? 'توقيع والتحقق من اللوجستيات' : 'Sign & Validate Logistics',
 cancel: isRTL ? 'إلغاء' : 'Cancel',
 signatureRequired: isRTL ? 'يرجى رسم التوقيع' : 'Please draw your signature',
 nameRequired: isRTL ? 'يرجى إدخال الاسم' : 'Please enter your name',
 }}
 />

 {/* Finance Officer Signature Dialog */}
 <SignatureCapture
 open={showFinanceSignatureDialog}
 onClose={() => setShowFinanceSignatureDialog(false)}
 onSave={handleFinanceSignatureApproval}
 defaultName={user?.name || ""}
 defaultTitle={isRTL ? "مسؤول المالية" : "Finance Officer"}
 isRTL={isRTL}
 saving={validateFinanceMutation.isPending}
 labels={{
 title: isRTL ? 'التوقيع الرقمي - التحقق من المالية' : 'Digital Signature - Finance Validation',
 description: isRTL ? 'ارسم توقيعك للتحقق من طلب الشراء. سيتم إنشاء رمز تحقق QR تلقائياً.' : 'Draw your signature to validate this purchase request. A QR verification code will be generated automatically.',
 nameLabel: isRTL ? 'اسم الموقّع' : 'Signer Name',
 titleLabel: isRTL ? 'المسمى الوظيفي' : 'Title / Role',
 namePlaceholder: isRTL ? 'أدخل اسمك الكامل' : 'Enter your full name',
 titlePlaceholder: isRTL ? 'مسؤول المالية' : 'Finance Officer',
 drawSignature: isRTL ? 'ارسم توقيعك أدناه' : 'Draw your signature below',
 clearSignature: isRTL ? 'مسح' : 'Clear',
 saveSignature: isRTL ? 'توقيع والتحقق من المالية' : 'Sign & Validate Finance',
 cancel: isRTL ? 'إلغاء' : 'Cancel',
 signatureRequired: isRTL ? 'يرجى رسم التوقيع' : 'Please draw your signature',
 nameRequired: isRTL ? 'يرجى إدخال الاسم' : 'Please enter your name',
 }}
 />

 {/* Office Manager (PM) Signature Dialog */}
 <SignatureCapture
 open={showPMSignatureDialog}
 onClose={() => setShowPMSignatureDialog(false)}
 onSave={handlePMSignatureApproval}
 defaultName={user?.name || ""}
 defaultTitle={isRTL ? "مدير المكتب" : "Office Manager"}
 isRTL={isRTL}
 saving={approvePMMutation.isPending}
 labels={{
 title: isRTL ? 'التوقيع الرقمي - اعتماد المدير' : 'Digital Signature - Manager Approval',
 description: isRTL ? 'ارسم توقيعك لاعتماد طلب الشراء. سيتم إنشاء رمز تحقق QR تلقائياً.' : 'Draw your signature to approve this purchase request. A QR verification code will be generated automatically.',
 nameLabel: isRTL ? 'اسم الموقّع' : 'Signer Name',
 titleLabel: isRTL ? 'المسمى الوظيفي' : 'Title / Role',
 namePlaceholder: isRTL ? 'أدخل اسمك الكامل' : 'Enter your full name',
 titlePlaceholder: isRTL ? 'مدير المكتب' : 'Office Manager',
 drawSignature: isRTL ? 'ارسم توقيعك أدناه' : 'Draw your signature below',
 clearSignature: isRTL ? 'مسح' : 'Clear',
 saveSignature: isRTL ? 'توقيع واعتماد طلب الشراء' : 'Sign & Approve Purchase Request',
 cancel: isRTL ? 'إلغاء' : 'Cancel',
 signatureRequired: isRTL ? 'يرجى رسم التوقيع' : 'Please draw your signature',
 nameRequired: isRTL ? 'يرجى إدخال الاسم' : 'Please enter your name',
 }}
 />
 </div>
 );
}
