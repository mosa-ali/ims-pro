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
import SignaturePad from "@/components/SignaturePad";
import {
  Plus,
  Trash2,
  Save,
  Send,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Pen,
  Image as ImageIcon,
  ClipboardPaste,
  Download,
  FileText
} from "lucide-react";

const SignatureInput = ({
  signature,
  setSignature,
  isRTL,
}: {
  signature: string | null;
  setSignature: (value: string | null) => void;
  isRTL: boolean;
}) => {
  const [mode, setMode] = useState<"draw" | "paste">("draw");

  const handlePaste = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
  toast.error(
    isRTL
      ? "المتصفح لا يدعم لصق الصور"
      : "Clipboard image paste is not supported in this browser"
  );
  return;
}
const clipboardItems = await navigator.clipboard.read();

      for (const item of clipboardItems) {
        const imageType = item.types.find((type) =>
          type.startsWith("image/")
        );

        if (!imageType) continue;

        const blob = await item.getType(imageType);

        const reader = new FileReader();

        reader.onloadend = () => {
          setSignature(reader.result as string);

          toast.success(
            isRTL
              ? "تم لصق التوقيع بنجاح"
              : "Signature pasted successfully"
          );
        };

        reader.readAsDataURL(blob);
        return;
      }

      toast.error(
        isRTL
          ? "لا توجد صورة في الحافظة"
          : "No image found in clipboard"
      );
    } catch (error) {
      console.error(error);

      toast.error(
        isRTL
          ? "المتصفح لا يدعم لصق الصور"
          : "Browser does not support image paste"
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === "draw" ? "default" : "outline"}
          onClick={() => {
            setMode("draw");
            setSignature(null);
          }}
        >
          ✍️ {isRTL ? "رسم التوقيع" : "Draw"}
        </Button>

        <Button
          type="button"
          variant={mode === "paste" ? "default" : "outline"}
          onClick={() => {
          setMode("paste");
          setSignature(null);
        }}
        >
          <ClipboardPaste className="w-4 h-4 mr-2" />
          {isRTL ? "لصق التوقيع" : "Paste"}
        </Button>
      </div>

      {/* Draw mode */}
      {mode === "draw" && (
        <SignaturePad
          onSignatureChange={setSignature}
          labels={{
            clear: isRTL ? "مسح" : "Clear",
            undo: isRTL ? "تراجع" : "Undo",
            signHere: isRTL ? "وقّع هنا" : "Sign here",
          }}
        />
      )}

      {/* Paste mode */}
      {mode === "paste" && (
        <div className="border rounded-lg p-6 text-center bg-muted/20">
          <ImageIcon className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />

          <p className="text-sm mb-3">
            {isRTL
              ? "انسخ صورة التوقيع ثم اضغط لصق"
              : "Copy signature image then click paste"}
          </p>

          <Button
            type="button"
            variant="outline"
            onClick={handlePaste}
          >
            {isRTL ? "لصق الآن" : "Paste Now"}
          </Button>
        </div>
      )}

      {/* Preview */}
      {signature && (
        <div className="border rounded-lg p-4">
          <p className="text-sm font-medium mb-2">
            {isRTL ? "معاينة التوقيع" : "Preview"}
          </p>

          <img
            src={signature}
            alt="Signature Preview"
            className="h-24 object-contain mx-auto"
          />

          <div className="text-center mt-3">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setSignature(null)}
            >
              {isRTL ? "إزالة" : "Remove"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Translation Keys Used (from translations.ts via t.logistics namespace):
 * 
 * Core Labels:
 * - t.logistics.newPurchaseRequest: 'New Purchase Request'
 * - t.logistics.editPurchaseRequest: 'Edit Purchase Request'
 * - t.logistics.backToPurchaseRequests: 'Back to Purchase Requests'
 * - t.logistics.basicInformation: 'Basic Information'
 * - t.logistics.budgetInformation: 'Budget Information'
 * - t.logistics.requesterInformation: 'Requester Information'
 * - t.logistics.lineItems: 'Line Items'
 * - t.logistics.justification: 'Justification'
 * - t.logistics.saveDraft: 'Save Draft'
 * - t.logistics.submitForApproval: 'Submit for Approval'
 * 
 * Status & Workflow:
 * - t.logistics.submitted: 'Submitted'
 * - t.logistics.logisticsValidated: 'Logistics Validated'
 * - t.logistics.financeValidated: 'Finance Validated'
 * - t.logistics.approved: 'Approved'
 * - t.logistics.rejected: 'Rejected'
 * - t.logistics.validatedByLogistics: 'Validated by Logistics'
 * - t.logistics.validatedByFinance: 'Validated by Finance'
 * - t.logistics.prApproved: 'Purchase Request Approved'
 * - t.logistics.prRejected: 'Purchase Request Rejected'
 * 
 * Approval Signatures (Embedded Footer):
 * - t.logistics.approvalWorkflowSignatures: 'Approval Workflow Signatures' (hardcoded EN/AR in component)
 * - t.logistics.logisticsValidationSignature: 'Logistics Validation Signature'
 * - t.logistics.financeValidationSignature: 'Finance Validation Signature'
 * - t.logistics.managerApprovalSignature: 'Manager Approval Signature'
 * - t.logistics.logisticsValidated: 'Logistics Validated'
 * - t.logistics.financeValidated: 'Finance Validated'
 * - t.logistics.approvedByManager: 'Approved by Manager'
 * 
 * Form Fields:
 * - t.logistics.prNumber: 'PR Number'
 * - t.logistics.category: 'Category'
 * - t.logistics.urgency: 'Urgency'
 * - t.logistics.projectTitle: 'Project Title'
 * - t.logistics.donor: 'Donor'
 * - t.logistics.budget: 'Budget'
 * - t.logistics.requesterName: 'Requester Name'
 * - t.logistics.email: 'Email'
 * - t.logistics.department: 'Department'
 * - t.logistics.neededByDate: 'Needed By Date'
 * - t.logistics.deliveryLocation: 'Delivery Location'
 * - t.logistics.addItem: 'Add Item'
 * - t.logistics.description: 'Description'
 * - t.logistics.qty: 'Quantity'
 * - t.logistics.unit: 'Unit'
 * - t.logistics.unitPrice: 'Unit Price'
 * - t.logistics.recurrence: 'Recurrence'
 * - t.logistics.total: 'Total'
 * 
 * Dialogs & Actions:
 * - t.logistics.submitPurchaseRequest: 'Submit Purchase Request'
 * - t.logistics.anEmailNotificationWillBeSent: 'An email notification will be sent'
 * - t.logistics.logisticsEmail: 'Logistics Email'
 * - t.logistics.pleaseEnterLogisticsEmail: 'Please enter logistics email'
 * - t.logistics.rejectPurchaseRequest: 'Reject Purchase Request'
 * - t.logistics.pleaseEnterTheReasonForRejection: 'Please enter the reason for rejection'
 * - t.logistics.rejectionReason: 'Rejection Reason'
 * - t.logistics.enterRejectionReason: 'Enter rejection reason'
 * - t.logistics.cancel: 'Cancel'
 * - t.logistics.submit: 'Submit'
 * - t.logistics.reject: 'Reject'
 * - t.logistics.submitting: 'Submitting...'
 * - t.logistics.rejecting: 'Rejecting...'
 * 
 * Errors & Validation:
 * - t.logistics.budgetExceeded: 'Budget Exceeded'
 * - t.logistics.pleaseEnterRejectionReasonAtLeast: 'Please enter rejection reason (at least 10 characters)'
 * - t.logistics.purchaseRequestCreated: 'Purchase Request Created'
 * - t.logistics.purchaseRequestUpdated: 'Purchase Request Updated'
 * - t.logistics.failedToSubmitPr: 'Failed to Submit PR'
 * - t.logistics.initializingScope: 'Initializing Scope...'
 * - t.logistics.unitTypesNotLoadedYet: 'Unit types not loaded yet'
 * - t.logistics.noBudgetsAvailable: 'No budgets available'
 * - t.logistics.selectBudget: 'Select Budget'
 * - t.logistics.autogenerated: 'Auto-generated'
 * - t.logistics.selectProject: 'Select Project'
 * - t.logistics.selectBudgetLine: 'Select Budget Line'
 * 
 * Currency & Exchange:
 * - t.logistics.currency: 'Currency'
 * - t.logistics.exchangeRate: 'Exchange Rate'
 * - t.logistics.exchangeTo: 'Exchange To'
 * - t.logistics.totalBudgetLine: 'Total Budget Line'
 * - t.logistics.total4: 'Total' (for display)
 * 
 * Service Types (when category = 'services'):
 * - t.logistics.serviceType: 'Service Type'
 * - t.logistics.consultancy: 'Consultancy'
 * - t.logistics.maintenance: 'Maintenance'
 * - t.logistics.training: 'Training'
 * - t.logistics.cleaning: 'Cleaning'
 * - t.logistics.security: 'Security'
 * - t.logistics.transportation: 'Transportation'
 * - t.logistics.catering: 'Catering'
 * - t.logistics.itServices: 'IT Services'
 * - t.logistics.audit: 'Audit'
 * - t.logistics.legal: 'Legal'
 * - t.logistics.other: 'Other'
 * 
 * Bilingual Support: All keys support EN/AR via useTranslation() hook
 * Access via: const { t } = useTranslation();
 */

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
  const brandingQuery = trpc.settings.branding.get.useQuery();
  const branding = brandingQuery.data;
 const { currentOperatingUnit, isLoading: ouLoading } = useOperatingUnit();

 const organizationId = currentOrganization?.id;
 const operatingUnitId = currentOperatingUnit?.id || 1;

 // Load unit types from master list
 const { data: unitTypesData, isLoading: unitTypesLoading } = trpc.masterData.unitTypes.getAll.useQuery({});
 
 const [logisticsSignature, setLogisticsSignature] = useState<string | null>(null);
 const [financeSignature, setFinanceSignature] = useState<string | null>(null);
 const [pmSignature, setPMSignature] = useState<string | null>(null);

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
 const [showRejectDialog, setShowRejectDialog] = useState(false);
 const [rejectionReason, setRejectionReason] = useState("");
 const [selectedBudgetId, setSelectedBudgetId] = useState<number | undefined>(undefined);

 // ✅ MODAL SIGNATURE STATE VARIABLES
 const [logisticsSignatureOpen, setLogisticsSignatureOpen] = useState(false);
 const [financeSignatureOpen, setFinanceSignatureOpen] = useState(false);
 const [pmSignatureOpen, setPMSignatureOpen] = useState(false);

 const [lineItems, setLineItems] = useState<LineItem[]>([
 { budgetLine: "", description: "", descriptionAr: "", specifications: "", quantity: "1", unit: "", unitPrice: "0", recurrence: "" },
 ]);

 // Initialize line items with first unit type once data loads
 useEffect(() => {
 if (unitTypesData && unitTypesData.length > 0 && lineItems[0].unit === "") {
 setLineItems([{ budgetLine: "", description: "", descriptionAr: "", specifications: "", quantity: "1", unit: unitTypesData[0].name, unitPrice: "0", recurrence: "" }]);
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

// Load currencies for exchange dropdown
const { data: currencies, isLoading: currenciesLoading } =
  trpc.finance.currencies.list.useQuery(
    {
      limit: 300,
      offset: 0,
      isActive: true,
    },
    {
      enabled: !!organizationId,
    }
  );
  
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
category: pr.category ?? "goods",
serviceType: pr.serviceType ?? "",
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
 const approvePMMutation = trpc.logistics.purchaseRequests.validateByPM.useMutation();
 const rejectMutation = trpc.logistics.purchaseRequests.reject.useMutation();
 const validateBudgetMutation = trpc.logistics.purchaseRequests.validateBudget.useMutation();

 // DO NOT auto-select first budget - let user explicitly select
 // This ensures Budget Lines and Currency only appear after user selection
 // Previously this caused hardcoded data to appear without user interaction

 // Budget validation effect - check if line items total exceeds budget limit
 useEffect(() => {
 const totalAmount = calculateTotal();
 
 // No budget line selected or no total - clear warning
 if (!formData.budgetLineId || totalAmount <= 0) {
 setBudgetWarning(null);
 return;
 }
 
 // CRITICAL: Check if budget line is already overspent or zero
 // Remaining budget must be > 0 to allow PR submission
 if (remainingBudget <= 0) {
 setBudgetWarning(
 `This budget line is fully utilized or overspent. Remaining balance: ${formData.currency} ${remainingBudget.toFixed(2)}`
 );
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
 
 // FIX: Org Admin Approval Visibility
 // Add Org Admin role detection for approval workflow testing
 const systemRole = user?.role || "";
const orgRole = (user as any)?.organizationRole || "";
const rbacRole = (user as any)?.rbacRole || "";

// Normalize
const roleText = `
  ${systemRole}
  ${orgRole}
  ${rbacRole}
`.toLowerCase();

const isLogisticsUser =
  roleText.includes("logistic manager") ||
  roleText.includes("logistics manager") ||
  roleText.includes("logistics officer") ||
  roleText.includes("logistic officer");

const isFinanceUser =
  roleText.includes("finance manager") ||
  roleText.includes("finance officer") ||
  roleText.includes("finance coordinator");

const isPMUser =
  roleText.includes("project manager") ||
  roleText.includes("program manager") ||
  roleText.includes("project officer") ||
  roleText.includes("office manager");

const isOrgAdmin =
  systemRole === "organization_admin" ||
  systemRole === "platform_super_admin" ||
  systemRole === "platform_admin";

const canViewLogisticsApproval =
  (
    formData.status === "submitted" ||
    !!existingPR?.logisticsSignatureDataUrl
  ) &&
  (isLogisticsUser || isOrgAdmin);

const canViewFinanceApproval =
  (
    formData.status === "validated_by_logistic" ||
    !!existingPR?.financeSignatureDataUrl
  ) &&
  (isFinanceUser || isOrgAdmin);

const canViewPMApproval =
  (
    formData.status === "validated_by_finance" ||
    !!existingPR?.pmSignatureDataUrl
  ) &&
  (isPMUser || isOrgAdmin);
 
 // CRITICAL FIX #14: Signature Locking - Determine which signatures are locked
 // Logistics signature: Locked after logistics validation
 const isLogisticsLocked = formData.status && formData.status !== "draft" && formData.status !== "submitted";
 
 // Finance signature: Locked after finance validation
 const isFinanceLocked = formData.status && formData.status !== "validated_by_logistic";
 
 // PM signature: Locked after approval
 const isPMLocked = formData.status && formData.status !== "validated_by_finance";
 
 // Determine if fields should be locked
 // Editable: draft, submitted
 // Locked: validated_by_logistic, validated_by_finance, approved
 const isLocked =
   isViewMode ||
   formData.status === "validated_by_logistic" ||
   formData.status === "validated_by_finance" ||
   formData.status === "approved";

 // Auto-detect approver emails based on user role
 // When logistics signs, auto-populate finance email from Finance Manager role
 // When finance signs, auto-populate PM email from Project Manager/Office Manager/Program Manager role
 // Note: Project Manager, Office Manager, and Program Manager are treated as equivalent roles
 // Auto-detect Finance Manager email from organization settings
 // This would be fetched from the backend based on the Finance Manager role
 // For now, we'll keep the manual entry but add a note
 // Auto-detect PM email from organization settings
 // Checks for: Project Manager, Office Manager, or Program Manager role
 // These roles are treated as equivalent for PM approval
 // Approval workflow handlers
 const handleSubmitForApproval = async () => {
 // Backend will auto-resolve logistics approver based on org/OU/role
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
 // Backend auto-resolves logistics approver and sends notification
 await submitMutation.mutateAsync({ id: prId! });
 toast.success(t.logistics.prSubmittedLogisticsTeamNotified);
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
 // Auto-populate finance email based on role
 // Priority: manually entered financeEmail > current user email
 
 await validateLogisticsMutation.mutateAsync({
 id: parseInt(params.id!),
 signerName: data.signerName,
 signerTitle: data.signerTitle,
 signatureDataUrl: data.signatureDataUrl,
 });
 toast.success(t.logistics.validatedByLogistics);
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
 // Auto-populate PM email based on role
 // Treats Project Manager, Office Manager, and Program Manager as equivalent roles
 // Priority: manually entered pmEmail > current user email
 
 await validateFinanceMutation.mutateAsync({
 id: parseInt(params.id!),
 signerName: data.signerName,
 signerTitle: data.signerTitle,
 signatureDataUrl: data.signatureDataUrl,
 });
 toast.success(t.logistics.validatedByFinance);
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
 navigate("/organization/logistics/purchase-requests");
 } catch (error: any) {
 toast.error(error.message);
 }
 };

 // Refetch PR data after signature
 const refetchPR = () => {
 trpcUtils.logistics.purchaseRequests.getById.invalidate();
 };
 const handleRejectPR = async () => { if (!rejectionReason || rejectionReason.length < 10) {
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
 // CRITICAL: Validate exchangeTo for non-USD budgets
 if (formData.currency && formData.currency !== "USD" && !formData.exchangeTo) {
 toast.error("Exchange rate currency is required for non-USD budgets");
 return;
 }
 
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
 <Button variant="outline" onClick={() => handleSubmit("draft")} disabled={createMutation.isPending || updateMutation.isPending || isLocked || !!budgetWarning || remainingBudget < 0}>
 <Save className="h-4 w-4 me-2" />
 {t.logistics.saveDraft}
 </Button>
 <Button onClick={handleSubmitForApproval} disabled={createMutation.isPending || updateMutation.isPending || submitMutation.isPending || !!budgetWarning || remainingBudget < 0}>
 <Send className="h-4 w-4 me-2" />
 {t.logistics.submitForApproval}
 </Button>
 </>
 )}
 {formData.status === "submitted" && (
 <>
 <Button variant="outline" onClick={() => handleSubmit("submitted")} disabled={createMutation.isPending || updateMutation.isPending || isLocked || !!budgetWarning || remainingBudget < 0}>
 <Save className="h-4 w-4 me-2" />
 {isRTL ? 'حفظ التغييرات' : 'Save Changes'}
 </Button>
 </>
 )}
 {formData.status === "validated_by_logistic" && (
 <>
 <Button variant="destructive" onClick={() => setShowRejectDialog(true)}>
 <XCircle className="h-4 w-4 me-2" />
 {t.logistics.reject}
 </Button>
 </>
 )}
 {formData.status === "validated_by_finance" && (
 <>
 <Button variant="destructive" onClick={() => setShowRejectDialog(true)}>
 <XCircle className="h-4 w-4 me-2" />
 {t.logistics.reject}
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
 currency: selectedBudget.currency || "USD",

exchangeTo:
  selectedBudget.currency === "USD"
    ? "USD"
    : prev.exchangeTo || "",

exchangeRate:
  selectedBudget.currency === "USD"
    ? 1
    : (
        selectedBudget.exchangeRate
          ? parseFloat(selectedBudget.exchangeRate)
          : undefined
      ),
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
 selectedBudgetId={selectedBudgetId ?? null}
 selectedBudgetLine={selectedBudgetLine}
 budgetLinesData={budgetLinesData || []}
remainingBudget={Number(remainingBudget || 0)}
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

 {/* Approval Workflow Signatures Section */}
 <Card>
 <CardHeader>
 <CardTitle>{isRTL ? 'توقيعات سير العمل' : 'Approval Workflow Signatures'}</CardTitle>
 </CardHeader>
 <CardContent className="space-y-6">
 {/* Logistics Signature Section - Show when submitted */}
{canViewLogisticsApproval && (
  <div className="border-l-4 border-blue-500 pl-4">
    <h3 className="text-sm font-semibold mb-4">
      {isRTL
        ? "توقيع التحقق من اللوجستيات"
        : "Logistics Validation Signature"}
    </h3>

    {!existingPR?.logisticsSignatureDataUrl ? (
      <div className="flex gap-2">
        <Button
          onClick={() => setLogisticsSignatureOpen(true)}
          className="gap-2"
          disabled={validateLogisticsMutation.isPending}
        >
          {validateLogisticsMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : null}
          {isRTL ? "التحقق والتوقيع" : "Validate & Sign"}
        </Button>
      </div>
    ) : (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />

          <div className="flex-1">
            <p className="font-semibold text-green-900">
              {isRTL
                ? "تم التحقق من اللوجستيات"
                : "Logistics Validated"}
            </p>

            <p className="text-sm text-green-700 mt-1">
              {isRTL ? "الموقّع: " : "Signed by: "}
              {existingPR?.logisticsSignerName}
            </p>

            <p className="text-sm text-green-700">
              {isRTL ? "المسمى: " : "Title: "}
              {existingPR?.logisticsSignerTitle}
            </p>

            {existingPR?.logValidatedOn && (
              <p className="text-sm text-green-700">
                {isRTL ? "التاريخ: " : "Date: "}
                {new Date(existingPR.logValidatedOn).toLocaleString()}
              </p>
            )}

            {existingPR?.logisticsSignatureDataUrl && (
              <img
                src={existingPR.logisticsSignatureDataUrl}
                alt="Signature"
                className="mt-3 h-16 border border-green-300 rounded"
              />
            )}
          </div>
        </div>
      </div>
    )}
  </div>
)}

 {/* Finance Signature Section - Show when validated by logistics */}
 {canViewFinanceApproval && (
  <div className="border-l-4 border-green-500 pl-4">
 <h3 className="text-sm font-semibold mb-4">{isRTL ? 'توقيع التحقق من المالية' : 'Finance Validation Signature'}</h3>
 {!existingPR?.financeSignatureDataUrl ? (
 <div className="flex gap-2">
   <Button
     onClick={() => setFinanceSignatureOpen(true)}
     className="gap-2"
     disabled={validateFinanceMutation.isPending}
   >
     {validateFinanceMutation.isPending ? (
       <Loader2 className="w-4 h-4 animate-spin" />
     ) : null}
     {isRTL ? "التحقق والتوقيع" : "Validate & Sign"}
   </Button>
 </div>
 ) : (
 <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
 <div className="flex items-start gap-3">
 <CheckCircle className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
 <div className="flex-1">
 <p className="font-semibold text-purple-900">{isRTL ? 'تم التحقق من المالية' : 'Finance Validated'}</p>
 <p className="text-sm text-purple-700 mt-1">{isRTL ? 'الموقّع: ' : 'Signed by: '}{existingPR?.financeSignerName}</p>
 <p className="text-sm text-purple-700">{isRTL ? 'المسمى: ' : 'Title: '}{existingPR?.financeSignerTitle}</p>
 {existingPR?.finValidatedOn && (
 <p className="text-sm text-purple-700">{isRTL ? 'التاريخ: ' : 'Date: '}{new Date(existingPR.finValidatedOn).toLocaleString()}</p>
 )}
 {existingPR?.financeSignatureDataUrl && (
 <img src={existingPR.financeSignatureDataUrl} alt="Signature" className="mt-3 h-16 border border-purple-300 rounded" />
 )}
 </div>
 </div>
 </div>
 )}
 </div>
 )}

{/* PM Signature Section - Show when validated by finance */}{canViewPMApproval && (
  <div className="border-l-4 border-purple-500 pl-4">
    <h3 className="text-sm font-semibold mb-4">
      {isRTL ? "توقيع اعتماد المدير" : "Manager Approval Signature"}
    </h3>

    {!existingPR?.pmSignatureDataUrl ? (
      <div className="flex gap-2">
        <Button
          onClick={() => setPMSignatureOpen(true)}
          className="gap-2"
          disabled={approvePMMutation.isPending}
        >
          {approvePMMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : null}
          {isRTL ? "التحقق والتوقيع" : "Validate & Sign"}
        </Button>
      </div>
    ) : (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-amber-600 mt-1 flex-shrink-0" />

          <div className="flex-1">
            <p className="font-semibold text-amber-900">
              {isRTL
                ? "تم الاعتماد من قبل المدير"
                : "Approved by Manager"}
            </p>

            <p className="text-sm text-amber-700 mt-1">
              {isRTL ? "الموقّع: " : "Signed by: "}
              {existingPR?.pmSignerName}
            </p>

            <p className="text-sm text-amber-700">
              {isRTL ? "المسمى: " : "Title: "}
              {existingPR?.pmSignerTitle}
            </p>

            {existingPR?.approvedOn && (
              <p className="text-sm text-amber-700">
                {isRTL ? "التاريخ: " : "Date: "}
                {new Date(existingPR.approvedOn).toLocaleString()}
              </p>
            )}

            {existingPR?.pmSignatureDataUrl && (
              <img
                src={existingPR.pmSignatureDataUrl}
                alt="Signature"
                className="mt-3 h-16 border border-amber-300 rounded"
              />
            )}
          </div>
        </div>
      </div>
    )}
  </div>
)}

 {/* Approved Status - Show all signatures as read-only history */}
 {formData.status === "approved" && (
 <div className="space-y-4">
 {/* Logistics Signature - Read-only */}
 {existingPR?.logisticsSignatureDataUrl && (
 <div className="border-l-4 border-green-500 pl-4">
 <h3 className="text-sm font-semibold mb-3">{isRTL ? 'توقيع التحقق من اللوجستيات' : 'Logistics Validation Signature'}</h3>
 <div className="bg-green-50 border border-green-200 rounded-lg p-4">
 <div className="flex items-start gap-3">
 <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
 <div className="flex-1">
 <p className="font-semibold text-green-900">{isRTL ? 'تم التحقق من اللوجستيات' : 'Logistics Validated'}</p>
 <p className="text-sm text-green-700 mt-1">{isRTL ? 'الموقّع: ' : 'Signed by: '}{existingPR?.logisticsSignerName}</p>
 <p className="text-sm text-green-700">{isRTL ? 'المسمى: ' : 'Title: '}{existingPR?.logisticsSignerTitle}</p>
 {existingPR?.logValidatedOn && (
 <p className="text-sm text-green-700">{isRTL ? 'التاريخ: ' : 'Date: '}{new Date(existingPR.logValidatedOn).toLocaleString()}</p>
 )}
 <img src={existingPR.logisticsSignatureDataUrl} alt="Signature" className="mt-3 h-16 border border-green-300 rounded" />
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Finance Signature - Read-only */}
 {existingPR?.financeSignatureDataUrl && (
 <div className="border-l-4 border-purple-500 pl-4">
 <h3 className="text-sm font-semibold mb-3">{isRTL ? 'توقيع التحقق من المالية' : 'Finance Validation Signature'}</h3>
 <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
 <div className="flex items-start gap-3">
 <CheckCircle className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
 <div className="flex-1">
 <p className="font-semibold text-purple-900">{isRTL ? 'تم التحقق من المالية' : 'Finance Validated'}</p>
 <p className="text-sm text-purple-700 mt-1">{isRTL ? 'الموقّع: ' : 'Signed by: '}{existingPR?.financeSignerName}</p>
 <p className="text-sm text-purple-700">{isRTL ? 'المسمى: ' : 'Title: '}{existingPR?.financeSignerTitle}</p>
 {existingPR?.finValidatedOn && (
 <p className="text-sm text-purple-700">{isRTL ? 'التاريخ: ' : 'Date: '}{new Date(existingPR.finValidatedOn).toLocaleString()}</p>
 )}
 <img src={existingPR.financeSignatureDataUrl} alt="Signature" className="mt-3 h-16 border border-purple-300 rounded" />
 </div>
 </div>
 </div>
 </div>
 )}

 {/* PM Signature - Read-only */}
 {existingPR?.pmSignatureDataUrl && (
 <div className="border-l-4 border-amber-500 pl-4">
 <h3 className="text-sm font-semibold mb-3">{isRTL ? 'توقيع اعتماد المدير' : 'Manager Approval Signature'}</h3>
 <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
 <div className="flex items-start gap-3">
 <CheckCircle className="w-5 h-5 text-amber-600 mt-1 flex-shrink-0" />
 <div className="flex-1">
 <p className="font-semibold text-amber-900">{isRTL ? 'تم الاعتماد من قبل المدير' : 'Approved by Manager'}</p>
 <p className="text-sm text-amber-700 mt-1">{isRTL ? 'الموقّع: ' : 'Signed by: '}{existingPR?.pmSignerName}</p>
 <p className="text-sm text-amber-700">{isRTL ? 'المسمى: ' : 'Title: '}{existingPR?.pmSignerTitle}</p>
 {existingPR?.approvedOn && (
 <p className="text-sm text-amber-700">{isRTL ? 'التاريخ: ' : 'Date: '}{new Date(existingPR.approvedOn).toLocaleString()}</p>
 )}
 <img src={existingPR.pmSignatureDataUrl} alt="Signature" className="mt-3 h-16 border border-amber-300 rounded" />
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 )}
 </CardContent>
</Card>

{/* ============================= */}
{/* Signature Dialogs */}
{/* ============================= */}

{/* Logistics Signature Modal */}
<Dialog
  open={logisticsSignatureOpen}
  onOpenChange={setLogisticsSignatureOpen}
>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>
        {isRTL
          ? "التحقق من اللوجستيات والتوقيع"
          : "Logistics Validation & Signature"}
      </DialogTitle>
    </DialogHeader>

    <div className="space-y-4">
      <div>
        <Label>{isRTL ? "اسم الموقّع" : "Signer Name"}</Label>
        <Input value={user?.name || ""} disabled />
      </div>

      <div>
        <Label>{isRTL ? "المسمى الوظيفي" : "Title / Role"}</Label>
        <Input
          value={isRTL ? "مسؤول اللوجستيات" : "Logistics Officer"}
          disabled
        />
      </div>

      <SignatureInput
        signature={logisticsSignature}
        setSignature={setLogisticsSignature}
        isRTL={isRTL}
      />

      <div className="flex justify-end">
        <Button
          disabled={
            !logisticsSignature ||
            validateLogisticsMutation.isPending
          }
          onClick={async () => {
            await handleLogisticSignatureApproval({
              signerName: user?.name || "",
              signerTitle: isRTL
                ? "مسؤول اللوجستيات"
                : "Logistics Officer",
              signatureDataUrl: logisticsSignature!,
            });

            setLogisticsSignatureOpen(false);
            setLogisticsSignature(null);
          }}
        >
          {validateLogisticsMutation.isPending
            ? (isRTL ? "جاري الحفظ..." : "Saving...")
            : (isRTL ? "التحقق والتوقيع" : "Validate & Sign")}
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>

{/* Finance Signature Modal */}
<Dialog
  open={financeSignatureOpen}
  onOpenChange={setFinanceSignatureOpen}
>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>
        {isRTL
          ? "التحقق المالي والتوقيع"
          : "Finance Validation & Signature"}
      </DialogTitle>
    </DialogHeader>

    <div className="space-y-4">
      <div>
        <Label>{isRTL ? "اسم الموقّع" : "Signer Name"}</Label>
        <Input value={user?.name || ""} disabled />
      </div>

      <div>
        <Label>{isRTL ? "المسمى الوظيفي" : "Title / Role"}</Label>
        <Input
          value={isRTL ? "مسؤول المالية" : "Finance Officer"}
          disabled
        />
      </div>

      <SignatureInput
        signature={financeSignature}
        setSignature={setFinanceSignature}
        isRTL={isRTL}
      />

      <div className="flex justify-end">
        <Button
          disabled={
            !financeSignature ||
            validateFinanceMutation.isPending
          }
          onClick={async () => {
            await handleFinanceSignatureApproval({
              signerName: user?.name || "",
              signerTitle: isRTL
                ? "مسؤول المالية"
                : "Finance Officer",
              signatureDataUrl: financeSignature!,
            });

            setFinanceSignatureOpen(false);
            setFinanceSignature(null);
          }}
        >
          {validateFinanceMutation.isPending
            ? (isRTL ? "جاري الحفظ..." : "Saving...")
            : (isRTL ? "التحقق والتوقيع" : "Validate & Sign")}
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>

{/* PM Signature Modal */}
<Dialog
  open={pmSignatureOpen}
  onOpenChange={setPMSignatureOpen}
>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>
        {isRTL
          ? "الاعتماد النهائي والتوقيع"
          : "Final Approval & Signature"}
      </DialogTitle>
    </DialogHeader>

    <div className="space-y-4">
      <div>
        <Label>{isRTL ? "اسم الموقّع" : "Signer Name"}</Label>
        <Input value={user?.name || ""} disabled />
      </div>

      <div>
        <Label>{isRTL ? "المسمى الوظيفي" : "Title / Role"}</Label>
        <Input
          value={isRTL ? "مدير المشروع" : "Project Manager"}
          disabled
        />
      </div>

      <SignatureInput
        signature={pmSignature}
        setSignature={setPMSignature}
        isRTL={isRTL}
      />

      <div className="flex justify-end">
        <Button
          disabled={
            !pmSignature ||
            approvePMMutation.isPending
          }
          onClick={async () => {
            await handlePMSignatureApproval({
              signerName: user?.name || "",
              signerTitle: isRTL
                ? "مدير المشروع"
                : "Project Manager",
              signatureDataUrl: pmSignature!,
            });

            setPMSignatureOpen(false);
            setPMSignature(null);
          }}
        >
          {approvePMMutation.isPending
            ? (isRTL ? "جاري الحفظ..." : "Saving...")
            : (isRTL ? "اعتماد وتوقيع" : "Approve & Sign")}
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>
    </div>
  </div>
  );
}