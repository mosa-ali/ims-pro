/**
 * ============================================================================
 * COST ALLOCATION MANAGEMENT PAGE
 * ============================================================================
 * 
 * PURPOSE:
 * - Manage cost pools (overhead, shared services, administrative costs)
 * - Configure allocation keys (headcount, budget %, direct costs, equal, custom)
 * - Define allocation rules linking pools to keys
 * - Execute allocations for specific periods
 * - View allocation results and history
 * 
 * FEATURES:
 * ✅ Cost Pools CRUD (create, edit, delete with soft delete)
 * ✅ Allocation Keys CRUD
 * ✅ Allocation Rules Configuration
 * ✅ Allocation Periods Management
 * ✅ Cost Pool Transactions (add costs to pools)
 * ✅ Allocation Execution Wizard
 * ✅ Results Dashboard with statistics
 * ✅ Full bilingual support (EN/AR with RTL)
 * 
 * ============================================================================
 */

import { useState, useEffect } from"react";
import { trpc } from"@/lib/trpc";
import { useAuth } from"@/contexts/AuthContext";
import { useOperatingUnit } from"@/contexts/OperatingUnitContext";
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from"@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from"@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from"@/components/ui/dialog";
import { Input } from"@/components/ui/input";
import { Label } from"@/components/ui/label";
import { Textarea } from"@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from"@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from"@/components/ui/tabs";
import { Badge } from"@/components/ui/badge";
import { Switch } from"@/components/ui/switch";
import { toast } from"react-hot-toast";
import { 
 Plus, 
 Edit, 
 Trash2, 
 Play, 
 BarChart3, 
 Layers, 
 Key, 
 FileText, 
 Calendar, 
 DollarSign,
 CheckCircle,
 Clock,
 AlertCircle,
 ArrowLeft,
 ArrowRight,
 RefreshCw,
 Settings,
 Download,
 FileSpreadsheet
} from"lucide-react";
import * as XLSX from 'xlsx';
import { useNavigate } from"@/lib/router-compat";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

// ============================================
// TYPE DEFINITIONS
// ============================================

interface CostPool {
 id: number;
 organizationId: number;
 operatingUnitId?: number;
 poolCode: string;
 poolName: string;
 description?: string;
 poolType?: string;
 glAccountId?: number;
 isActive: boolean;
 createdAt: Date;
}

interface AllocationKey {
 id: number;
 organizationId: number;
 keyCode: string;
 keyName: string;
 keyType?: string;
 description?: string;
 isActive: boolean;
 createdAt: Date;
}

interface AllocationRule {
 rule: {
 id: number;
 organizationId: number;
 costPoolId: number;
 allocationKeyId: number;
 effectiveFrom: Date;
 effectiveTo?: Date;
 isActive: boolean;
 createdAt: Date;
 };
 costPool: CostPool | null;
 allocationKey: AllocationKey | null;
}

interface AllocationPeriod {
 id: number;
 organizationId: number;
 periodCode: string;
 periodName: string;
 periodType?: string;
 startDate: Date;
 endDate: Date;
 status: string;
 executedAt?: Date;
 executedBy?: number;
 createdAt: Date;
}

// ============================================
// TRANSLATIONS
// ============================================

// ============================================
// MAIN COMPONENT
// ============================================

export default function CostAllocationManagement() {
 const { t } = useTranslation();
 const { user } = useAuth();
 const { currentOperatingUnit } = useOperatingUnit();
 const { language, isRTL} = useLanguage();
 const navigate = useNavigate();
 const organizationId = currentOperatingUnit?.organizationId || 0;
 const operatingUnitId = currentOperatingUnit?.id || 0;
 // Using centralized translations via t.costAllocationManagement

 // Tab state
 const [activeTab, setActiveTab] = useState("dashboard");

 // Dialog states
 const [showCostPoolDialog, setShowCostPoolDialog] = useState(false);
 const [showAllocationKeyDialog, setShowAllocationKeyDialog] = useState(false);
 const [showRuleDialog, setShowRuleDialog] = useState(false);
 const [showPeriodDialog, setShowPeriodDialog] = useState(false);
 const [showTransactionDialog, setShowTransactionDialog] = useState(false);
 const [showExecutionDialog, setShowExecutionDialog] = useState(false);
 const [showDeleteDialog, setShowDeleteDialog] = useState(false);

 // Edit states
 const [editingCostPool, setEditingCostPool] = useState<CostPool | null>(null);
 const [editingAllocationKey, setEditingAllocationKey] = useState<AllocationKey | null>(null);
 const [editingRule, setEditingRule] = useState<AllocationRule | null>(null);
 const [editingPeriod, setEditingPeriod] = useState<AllocationPeriod | null>(null);

 // Delete state
 const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: number } | null>(null);

 // Reversal state
 const [showReversalDialog, setShowReversalDialog] = useState(false);
 const [reversalPeriodId, setReversalPeriodId] = useState<number>(0);
 const [reversalReason, setReversalReason] = useState("");
 const [reversalReasonAr, setReversalReasonAr] = useState("");

 // Template state
 const [showTemplateDialog, setShowTemplateDialog] = useState(false);
 const [editingTemplate, setEditingTemplate] = useState<any>(null);
 const [showApplyTemplateDialog, setShowApplyTemplateDialog] = useState(false);
 const [applyTemplateId, setApplyTemplateId] = useState<number>(0);
 const [templateForm, setTemplateForm] = useState({
 templateCode:"",
 templateName:"",
 templateNameAr:"",
 description:"",
 descriptionAr:"",
 periodType:"monthly" as string,
 rules: [] as { costPoolId: number; allocationKeyId: number; priority: number }[],
 });
 const [applyTemplateForm, setApplyTemplateForm] = useState({
 periodCode:"",
 periodName:"",
 startDate:"",
 endDate:"",
 });

 // Budget Reallocation state
 const [showReallocationDialog, setShowReallocationDialog] = useState(false);
 const [editingReallocation, setEditingReallocation] = useState<any>(null);
 const [showRejectDialog, setShowRejectDialog] = useState(false);
 const [rejectReallocationId, setRejectReallocationId] = useState<number>(0);
 const [rejectionReason, setRejectionReason] = useState("");
 const [rejectionReasonAr, setRejectionReasonAr] = useState("");
 const [reallocationForm, setReallocationForm] = useState({
 reallocationCode:"",
 reallocationDate:"",
 description:"",
 descriptionAr:"",
 currency:"USD",
 justification:"",
 justificationAr:"",
 lines: [] as { lineType:"source" |"destination"; projectId: number; budgetItemId?: number; amount: string; description?: string }[],
 });

 // Form states
 const [costPoolForm, setCostPoolForm] = useState({
 poolCode:"",
 poolName:"",
 description:"",
 poolType:"overhead" as string,
 isActive: true,
 });

 const [allocationKeyForm, setAllocationKeyForm] = useState({
 keyCode:"",
 keyName:"",
 keyType:"budget_percentage" as string,
 description:"",
 isActive: true,
 });

 const [ruleForm, setRuleForm] = useState({
 costPoolId: 0,
 allocationKeyId: 0,
 effectiveFrom:"",
 effectiveTo:"",
 isActive: true,
 });

 const [periodForm, setPeriodForm] = useState({
 periodCode:"",
 periodName:"",
 periodType:"monthly" as string,
 startDate:"",
 endDate:"",
 });

 const [transactionForm, setTransactionForm] = useState({
 costPoolId: 0,
 transactionDate:"",
 amount:"",
 description:"",
 sourceModule:"manual" as string,
 });

 const [executionPeriodId, setExecutionPeriodId] = useState<number>(0);
 const [executionStep, setExecutionStep] = useState(1);

 // ============================================
 // QUERIES
 // ============================================

 const { data: dashboardStats, refetch: refetchStats } = trpc.costAllocation.getDashboardStats.useQuery(
 { organizationId },
 { enabled: !!organizationId }
 );

 const { data: costPools = [], refetch: refetchCostPools } = trpc.costAllocation.listCostPools.useQuery(
 { organizationId, operatingUnitId },
 { enabled: !!organizationId }
 );

 const { data: allocationKeys = [], refetch: refetchAllocationKeys } = trpc.costAllocation.listAllocationKeys.useQuery(
 { organizationId },
 { enabled: !!organizationId }
 );

 const { data: allocationRules = [], refetch: refetchRules } = trpc.costAllocation.listAllocationRules.useQuery(
 { organizationId },
 { enabled: !!organizationId }
 );

 const { data: allocationPeriods = [], refetch: refetchPeriods } = trpc.costAllocation.listAllocationPeriods.useQuery(
 { organizationId },
 { enabled: !!organizationId }
 );

 const { data: transactions = [], refetch: refetchTransactions } = trpc.costAllocation.listCostPoolTransactions.useQuery(
 { organizationId },
 { enabled: !!organizationId }
 );

 const { data: allocationResults = [], refetch: refetchResults } = trpc.costAllocation.listAllocationResults.useQuery(
 { organizationId },
 { enabled: !!organizationId }
 );

 const { data: templates = [], refetch: refetchTemplates } = trpc.costAllocation.listTemplates.useQuery(
 { organizationId },
 { enabled: !!organizationId }
 );

 const { data: budgetReallocations = [], refetch: refetchReallocations } = trpc.costAllocation.listBudgetReallocations.useQuery(
 { organizationId },
 { enabled: !!organizationId }
 );

 const { data: projectsList = [] } = trpc.projects.list.useQuery(
 {organizationId, operatingUnitId},
 { enabled: !!organizationId }
 );

 // ============================================
 // MUTATIONS
 // ============================================

 // Cost Pool mutations
 const createCostPoolMutation = trpc.costAllocation.createCostPool.useMutation({
 onSuccess: () => {
 toast.success(t.costAllocationManagement.createSuccess);
 setShowCostPoolDialog(false);
 resetCostPoolForm();
 refetchCostPools();
 refetchStats();
 },
 onError: (error) => toast.error(error.message),
 });

 const updateCostPoolMutation = trpc.costAllocation.updateCostPool.useMutation({
 onSuccess: () => {
 toast.success(t.costAllocationManagement.updateSuccess);
 setShowCostPoolDialog(false);
 setEditingCostPool(null);
 resetCostPoolForm();
 refetchCostPools();
 },
 onError: (error) => toast.error(error.message),
 });

 const deleteCostPoolMutation = trpc.costAllocation.deleteCostPool.useMutation({
 onSuccess: () => {
 toast.success(t.costAllocationManagement.deleteSuccess);
 setShowDeleteDialog(false);
 setDeleteTarget(null);
 refetchCostPools();
 refetchStats();
 },
 onError: (error) => toast.error(error.message),
 });

 // Allocation Key mutations
 const createAllocationKeyMutation = trpc.costAllocation.createAllocationKey.useMutation({
 onSuccess: () => {
 toast.success(t.costAllocationManagement.createSuccess);
 setShowAllocationKeyDialog(false);
 resetAllocationKeyForm();
 refetchAllocationKeys();
 refetchStats();
 },
 onError: (error) => toast.error(error.message),
 });

 const updateAllocationKeyMutation = trpc.costAllocation.updateAllocationKey.useMutation({
 onSuccess: () => {
 toast.success(t.costAllocationManagement.updateSuccess);
 setShowAllocationKeyDialog(false);
 setEditingAllocationKey(null);
 resetAllocationKeyForm();
 refetchAllocationKeys();
 },
 onError: (error) => toast.error(error.message),
 });

 const deleteAllocationKeyMutation = trpc.costAllocation.deleteAllocationKey.useMutation({
 onSuccess: () => {
 toast.success(t.costAllocationManagement.deleteSuccess);
 setShowDeleteDialog(false);
 setDeleteTarget(null);
 refetchAllocationKeys();
 refetchStats();
 },
 onError: (error) => toast.error(error.message),
 });

 // Allocation Rule mutations
 const createRuleMutation = trpc.costAllocation.createAllocationRule.useMutation({
 onSuccess: () => {
 toast.success(t.costAllocationManagement.createSuccess);
 setShowRuleDialog(false);
 resetRuleForm();
 refetchRules();
 refetchStats();
 },
 onError: (error) => toast.error(error.message),
 });

 const updateRuleMutation = trpc.costAllocation.updateAllocationRule.useMutation({
 onSuccess: () => {
 toast.success(t.costAllocationManagement.updateSuccess);
 setShowRuleDialog(false);
 setEditingRule(null);
 resetRuleForm();
 refetchRules();
 },
 onError: (error) => toast.error(error.message),
 });

 const deleteRuleMutation = trpc.costAllocation.deleteAllocationRule.useMutation({
 onSuccess: () => {
 toast.success(t.costAllocationManagement.deleteSuccess);
 setShowDeleteDialog(false);
 setDeleteTarget(null);
 refetchRules();
 refetchStats();
 },
 onError: (error) => toast.error(error.message),
 });

 // Allocation Period mutations
 const createPeriodMutation = trpc.costAllocation.createAllocationPeriod.useMutation({
 onSuccess: () => {
 toast.success(t.costAllocationManagement.createSuccess);
 setShowPeriodDialog(false);
 resetPeriodForm();
 refetchPeriods();
 },
 onError: (error) => toast.error(error.message),
 });

 const updatePeriodMutation = trpc.costAllocation.updateAllocationPeriod.useMutation({
 onSuccess: () => {
 toast.success(t.costAllocationManagement.updateSuccess);
 setShowPeriodDialog(false);
 setEditingPeriod(null);
 resetPeriodForm();
 refetchPeriods();
 },
 onError: (error) => toast.error(error.message),
 });

 const deletePeriodMutation = trpc.costAllocation.deleteAllocationPeriod.useMutation({
 onSuccess: () => {
 toast.success(t.costAllocationManagement.deleteSuccess);
 setShowDeleteDialog(false);
 setDeleteTarget(null);
 refetchPeriods();
 },
 onError: (error) => toast.error(error.message),
 });

 // Transaction mutation
 const createTransactionMutation = trpc.costAllocation.createCostPoolTransaction.useMutation({
 onSuccess: () => {
 toast.success(t.costAllocationManagement.createSuccess);
 setShowTransactionDialog(false);
 resetTransactionForm();
 refetchTransactions();
 },
 onError: (error) => toast.error(error.message),
 });

 // Execution mutations
 const calculateBasesMutation = trpc.costAllocation.calculateAllocationBases.useMutation({
 onSuccess: (data) => {
 toast.success(`${t.costAllocationManagement.basesCalculated} (${data.basesCalculated} bases)`);
 setExecutionStep(3);
 },
 onError: (error) => toast.error(error.message),
 });

 const executeAllocationMutation = trpc.costAllocation.executeAllocation.useMutation({
 onSuccess: (data) => {
 toast.success(`${t.costAllocationManagement.allocationExecuted} (${data.resultsCreated} results)`);
 setShowExecutionDialog(false);
 setExecutionStep(1);
 setExecutionPeriodId(0);
 refetchPeriods();
 refetchResults();
 refetchStats();
 },
 onError: (error) => toast.error(error.message),
 });

 // Reversal mutation
 const reverseAllocationMutation = trpc.costAllocation.reverseAllocation.useMutation({
 onSuccess: () => {
 toast.success(t.costAllocationManagement.reversalSuccess);
 setShowReversalDialog(false);
 setReversalPeriodId(0);
 setReversalReason("");
 setReversalReasonAr("");
 refetchPeriods();
 refetchResults();
 refetchStats();
 },
 onError: (error) => toast.error(error.message),
 });

 // Template mutations
 const createTemplateMutation = trpc.costAllocation.createTemplate.useMutation({
 onSuccess: () => {
 toast.success(t.costAllocationManagement.createSuccess);
 setShowTemplateDialog(false);
 resetTemplateForm();
 refetchTemplates();
 },
 onError: (error) => toast.error(error.message),
 });

 const updateTemplateMutation = trpc.costAllocation.updateTemplate.useMutation({
 onSuccess: () => {
 toast.success(t.costAllocationManagement.updateSuccess);
 setShowTemplateDialog(false);
 setEditingTemplate(null);
 resetTemplateForm();
 refetchTemplates();
 },
 onError: (error) => toast.error(error.message),
 });

 const deleteTemplateMutation = trpc.costAllocation.deleteTemplate.useMutation({
 onSuccess: () => {
 toast.success(t.costAllocationManagement.deleteSuccess);
 setShowDeleteDialog(false);
 setDeleteTarget(null);
 refetchTemplates();
 },
 onError: (error) => toast.error(error.message),
 });

 const applyTemplateMutation = trpc.costAllocation.applyTemplate.useMutation({
 onSuccess: () => {
 toast.success(t.costAllocationManagement.templateApplied);
 setShowApplyTemplateDialog(false);
 setApplyTemplateId(0);
 setApplyTemplateForm({ periodCode:"", periodName:"", startDate:"", endDate:"" });
 refetchPeriods();
 refetchRules();
 },
 onError: (error) => toast.error(error.message),
 });

 // Budget Reallocation mutations
 const createReallocationMutation = trpc.costAllocation.createBudgetReallocation.useMutation({
 onSuccess: () => {
 toast.success(t.costAllocationManagement.createSuccess);
 setShowReallocationDialog(false);
 resetReallocationForm();
 refetchReallocations();
 },
 onError: (error) => toast.error(error.message),
 });

 const submitReallocationMutation = trpc.costAllocation.submitReallocationForApproval.useMutation({
 onSuccess: () => {
 toast.success(t.costAllocationManagement.submitSuccess);
 refetchReallocations();
 },
 onError: (error) => toast.error(error.message),
 });

 const approveReallocationMutation = trpc.costAllocation.approveBudgetReallocation.useMutation({
 onSuccess: () => {
 toast.success(t.costAllocationManagement.approveSuccess);
 refetchReallocations();
 },
 onError: (error) => toast.error(error.message),
 });

 const rejectReallocationMutation = trpc.costAllocation.rejectBudgetReallocation.useMutation({
 onSuccess: () => {
 toast.success(t.costAllocationManagement.rejectSuccess);
 setShowRejectDialog(false);
 setRejectReallocationId(0);
 setRejectionReason("");
 setRejectionReasonAr("");
 refetchReallocations();
 },
 onError: (error) => toast.error(error.message),
 });

 const executeReallocationMutation = trpc.costAllocation.executeBudgetReallocation.useMutation({
 onSuccess: () => {
 toast.success(t.costAllocationManagement.executeSuccess);
 refetchReallocations();
 },
 onError: (error) => toast.error(error.message),
 });

 // ============================================
 // FORM RESET FUNCTIONS
 // ============================================

 const resetCostPoolForm = () => {
 setCostPoolForm({
 poolCode:"",
 poolName:"",
 description:"",
 poolType:"overhead",
 isActive: true,
 });
 };

 const resetAllocationKeyForm = () => {
 setAllocationKeyForm({
 keyCode:"",
 keyName:"",
 keyType:"budget_percentage",
 description:"",
 isActive: true,
 });
 };

 const resetRuleForm = () => {
 setRuleForm({
 costPoolId: 0,
 allocationKeyId: 0,
 effectiveFrom:"",
 effectiveTo:"",
 isActive: true,
 });
 };

 const resetPeriodForm = () => {
 setPeriodForm({
 periodCode:"",
 periodName:"",
 periodType:"monthly",
 startDate:"",
 endDate:"",
 });
 };

 const resetTransactionForm = () => {
 setTransactionForm({
 costPoolId: 0,
 transactionDate:"",
 amount:"",
 description:"",
 sourceModule:"manual",
 });
 };

 const resetTemplateForm = () => {
 setTemplateForm({
 templateCode:"",
 templateName:"",
 templateNameAr:"",
 description:"",
 descriptionAr:"",
 periodType:"monthly",
 rules: [],
 });
 };

 const resetReallocationForm = () => {
 setReallocationForm({
 reallocationCode:"",
 reallocationDate:"",
 description:"",
 descriptionAr:"",
 currency:"USD",
 justification:"",
 justificationAr:"",
 lines: [],
 });
 };

 // ============================================
 // EDIT HANDLERS
 // ============================================

 useEffect(() => {
 if (editingCostPool) {
 setCostPoolForm({
 poolCode: editingCostPool.poolCode,
 poolName: editingCostPool.poolName,
 description: editingCostPool.description ||"",
 poolType: editingCostPool.poolType ||"overhead",
 isActive: editingCostPool.isActive,
 });
 }
 }, [editingCostPool]);

 useEffect(() => {
 if (editingAllocationKey) {
 setAllocationKeyForm({
 keyCode: editingAllocationKey.keyCode,
 keyName: editingAllocationKey.keyName,
 keyType: editingAllocationKey.keyType ||"budget_percentage",
 description: editingAllocationKey.description ||"",
 isActive: editingAllocationKey.isActive,
 });
 }
 }, [editingAllocationKey]);

 useEffect(() => {
 if (editingRule) {
 setRuleForm({
 costPoolId: editingRule.rule.costPoolId,
 allocationKeyId: editingRule.rule.allocationKeyId,
 effectiveFrom: new Date(editingRule.rule.effectiveFrom).toISOString().split("T")[0],
 effectiveTo: editingRule.rule.effectiveTo 
 ? new Date(editingRule.rule.effectiveTo).toISOString().split("T")[0] 
 :"",
 isActive: editingRule.rule.isActive,
 });
 }
 }, [editingRule]);

 useEffect(() => {
 if (editingPeriod) {
 setPeriodForm({
 periodCode: editingPeriod.periodCode,
 periodName: editingPeriod.periodName,
 periodType: editingPeriod.periodType ||"monthly",
 startDate: new Date(editingPeriod.startDate).toISOString().split("T")[0],
 endDate: new Date(editingPeriod.endDate).toISOString().split("T")[0],
 });
 }
 }, [editingPeriod]);

 // ============================================
 // SUBMIT HANDLERS
 // ============================================

 const handleCostPoolSubmit = () => {
 if (editingCostPool) {
 updateCostPoolMutation.mutate({
 id: editingCostPool.id,
 ...costPoolForm,
 });
 } else {
 createCostPoolMutation.mutate({
 organizationId,
 operatingUnitId,
 ...costPoolForm,
 });
 }
 };

 const handleAllocationKeySubmit = () => {
 if (editingAllocationKey) {
 updateAllocationKeyMutation.mutate({
 id: editingAllocationKey.id,
 ...allocationKeyForm,
 });
 } else {
 createAllocationKeyMutation.mutate({
 organizationId,
 ...allocationKeyForm,
 });
 }
 };

 const handleRuleSubmit = () => {
 if (editingRule) {
 updateRuleMutation.mutate({
 id: editingRule.rule.id,
 ...ruleForm,
 });
 } else {
 createRuleMutation.mutate({
 organizationId,
 ...ruleForm,
 });
 }
 };

 const handlePeriodSubmit = () => {
 if (editingPeriod) {
 updatePeriodMutation.mutate({
 id: editingPeriod.id,
 ...periodForm,
 });
 } else {
 createPeriodMutation.mutate({
 organizationId,
 ...periodForm,
 });
 }
 };

 const handleTransactionSubmit = () => {
 createTransactionMutation.mutate({
 organizationId,
 ...transactionForm,
 amount: parseFloat(transactionForm.amount),
 });
 };

 const handleDelete = () => {
 if (!deleteTarget) return;

 switch (deleteTarget.type) {
 case"costPool":
 deleteCostPoolMutation.mutate({ id: deleteTarget.id });
 break;
 case"allocationKey":
 deleteAllocationKeyMutation.mutate({ id: deleteTarget.id });
 break;
 case"rule":
 deleteRuleMutation.mutate({ id: deleteTarget.id });
 break;
 case"period":
 deletePeriodMutation.mutate({ id: deleteTarget.id });
 break;
 }
 };

 // ============================================
 // HELPER FUNCTIONS
 // ============================================

 const getPoolTypeBadge = (type?: string) => {
 const typeMap: Record<string, { label: string; color: string }> = {
 overhead: { label: t.costAllocationManagement.poolTypeOverhead, color:"bg-blue-100 text-blue-700" },
 shared_service: { label: t.costAllocationManagement.poolTypeSharedService, color:"bg-purple-100 text-purple-700" },
 administrative: { label: t.costAllocationManagement.poolTypeAdministrative, color:"bg-orange-100 text-orange-700" },
 facility: { label: t.costAllocationManagement.poolTypeFacility, color:"bg-green-100 text-green-700" },
 other: { label: t.costAllocationManagement.poolTypeOther, color:"bg-gray-100 text-gray-700" },
 };
 const config = typeMap[type ||"other"] || typeMap.other;
 return <Badge className={config.color}>{config.label}</Badge>;
 };

 const getKeyTypeBadge = (type?: string) => {
 const typeMap: Record<string, { label: string; color: string }> = {
 headcount: { label: t.costAllocationManagement.keyTypeHeadcount, color:"bg-blue-100 text-blue-700" },
 budget_percentage: { label: t.costAllocationManagement.keyTypeBudgetPercentage, color:"bg-green-100 text-green-700" },
 direct_costs: { label: t.costAllocationManagement.keyTypeDirectCosts, color:"bg-orange-100 text-orange-700" },
 equal: { label: t.costAllocationManagement.keyTypeEqual, color:"bg-purple-100 text-purple-700" },
 custom: { label: t.costAllocationManagement.keyTypeCustom, color:"bg-yellow-100 text-yellow-700" },
 revenue: { label: t.costAllocationManagement.keyTypeRevenue, color:"bg-teal-100 text-teal-700" },
 };
 const config = typeMap[type ||"custom"] || typeMap.custom;
 return <Badge className={config.color}>{config.label}</Badge>;
 };

 const getStatusBadge = (status: string) => {
 const statusMap: Record<string, { label: string; color: string; icon: any }> = {
 draft: { label: t.costAllocationManagement.statusDraft, color:"bg-gray-100 text-gray-700", icon: Clock },
 in_progress: { label: t.costAllocationManagement.statusInProgress, color:"bg-yellow-100 text-yellow-700", icon: RefreshCw },
 completed: { label: t.costAllocationManagement.statusCompleted, color:"bg-green-100 text-green-700", icon: CheckCircle },
 reversed: { label: t.costAllocationManagement.statusReversed, color:"bg-red-100 text-red-700", icon: AlertCircle },
 };
 const config = statusMap[status] || statusMap.draft;
 const Icon = config.icon;
 return (
 <Badge className={`${config.color} flex items-center gap-1`}>
 <Icon className="w-3 h-3" />
 {config.label}
 </Badge>
 );
 };

 const formatCurrency = (amount: number) => {
 return new Intl.NumberFormat('en-US', {
 style:"currency",
 currency:"USD",
 minimumFractionDigits: 2,
 }).format(amount);
 };

 const formatDate = (date: Date | string) => {
 return new Date(date).toLocaleDateString('en-US');
 };

 // ============================================
 // EXPORT HANDLERS
 // ============================================

 const handleExportToExcel = () => {
 if (allocationResults.length === 0) {
 toast.error(t.costAllocationManagement.noData);
 return;
 }

 const excelData = allocationResults.map((item: any) => ({
 [t.financeModule.period]: item.period?.periodName || '-',
 [t.financeModule.periodCode]: item.period?.periodCode || '-',
 [t.financeModule.costPool]: item.costPool?.poolName || '-',
 [t.financeModule.poolCode]: item.costPool?.poolCode || '-',
 [t.financeModule.project12]: item.project?.projectCode || '-',
 [t.financeModule.projectName]: item.project?.title || '-',
 [t.financeModule.allocationKey]: item.allocationKey?.keyName || '-',
 [t.financeModule.totalPoolAmount]: Number(item.result.totalPoolAmount),
 [t.financeModule.allocation]: Number(item.result.allocationPercentage),
 [t.financeModule.allocatedAmount]: Number(item.result.allocatedAmount),
 }));

 const totalAllocated = allocationResults.reduce(
 (sum: number, item: any) => sum + Number(item.result.allocatedAmount), 0
 );
 const uniquePeriods = new Set(allocationResults.map((item: any) => item.period?.id)).size;
 const uniquePools = new Set(allocationResults.map((item: any) => item.costPool?.id)).size;
 const uniqueProjects = new Set(allocationResults.map((item: any) => item.project?.id)).size;

 const summaryData = [
 { [t.financeModule.metric]: t.financeModule.totalRecords, [t.financeModule.value]: allocationResults.length },
 { [t.financeModule.metric]: t.financeModule.totalAllocatedAmount, [t.financeModule.value]: totalAllocated },
 { [t.financeModule.metric]: t.financeModule.numberOfPeriods, [t.financeModule.value]: uniquePeriods },
 { [t.financeModule.metric]: t.financeModule.numberOfCostPools, [t.financeModule.value]: uniquePools },
 { [t.financeModule.metric]: t.financeModule.numberOfProjects, [t.financeModule.value]: uniqueProjects },
 { [t.financeModule.metric]: t.financeModule.reportDate, [t.financeModule.value]: new Date().toLocaleDateString('en-US') },
 ];

 const wb = XLSX.utils.book_new();
 const summaryWs = XLSX.utils.json_to_sheet(summaryData);
 XLSX.utils.book_append_sheet(wb, summaryWs, t.financeModule.summary);
 const detailsWs = XLSX.utils.json_to_sheet(excelData);
 XLSX.utils.book_append_sheet(wb, detailsWs, t.financeModule.details);

 const dateStr = new Date().toISOString().split('T')[0];
 const filename = `cost_allocation_report_${dateStr}.xlsx`;
 XLSX.writeFile(wb, filename);
 toast.success(t.costAllocationManagement.exportSuccess);
 };

 const handleExportToPDF = () => {
 if (allocationResults.length === 0) {
 toast.error(t.costAllocationManagement.noData);
 return;
 }

 const totalAllocated = allocationResults.reduce(
 (sum: number, item: any) => sum + Number(item.result.allocatedAmount), 0
 );
 const uniqueProjects = new Set(allocationResults.map((item: any) => item.project?.id)).size;

 const htmlContent = `
 <!DOCTYPE html>
 <html dir="${'ltr'}" lang="${'en'}">
 <head>
 <meta charset="UTF-8">
 <title>${t.costAllocationManagement.allocationReport}</title>
 <style>
 body { font-family: Arial, sans-serif; margin: 20px; }
 h1 { color: #1a365d; margin-bottom: 10px; }
 h2 { color: #2d3748; margin-top: 30px; }
 .header { border-bottom: 2px solid #1a365d; padding-bottom: 20px; margin-bottom: 20px; }
 .meta { color: #718096; font-size: 14px; }
 .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
 .summary-card { background: #f7fafc; padding: 15px; border-radius: 8px; text-align: center; }
 .summary-card .value { font-size: 24px; font-weight: bold; color: #1a365d; }
 .summary-card .label { font-size: 12px; color: #718096; margin-top: 5px; }
 table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
 th { background: #1a365d; color: white; padding: 10px; text-align: start; }
 td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
 tr:nth-child(even) { background: #f7fafc; }
 .amount { font-family: monospace; text-align: end; }
 .compliance { margin-top: 40px; padding: 15px; background: #ebf8ff; border-left: 4px solid #3182ce; font-size: 12px; }
 @media print { body { margin: 0; } .no-print { display: none; } }
 </style>
 </head>
 <body>
 <div class="header">
 <h1>${t.costAllocationManagement.allocationReport}</h1>
 <div class="meta">${t.costAllocationManagement.generatedOn}: ${new Date().toLocaleDateString('en-US')}</div>
 </div>
 <h2>${t.costAllocationManagement.summaryStatistics}</h2>
 <div class="summary-grid">
 <div class="summary-card"><div class="value">${allocationResults.length}</div><div class="label">${t.costAllocationManagement.totalRecords}</div></div>
 <div class="summary-card"><div class="value">${formatCurrency(totalAllocated)}</div><div class="label">${t.costAllocationManagement.totalAllocated}</div></div>
 <div class="summary-card"><div class="value">${uniqueProjects}</div><div class="label">${t.financeModule.projects}</div></div>
 </div>
 <h2>${t.costAllocationManagement.resultsTitle}</h2>
 <table>
 <thead><tr>
 <th>${t.costAllocationManagement.period}</th><th>${t.costAllocationManagement.costPool}</th><th>${t.costAllocationManagement.project}</th><th>${t.costAllocationManagement.allocationKey}</th>
 <th>${t.costAllocationManagement.totalPoolAmount}</th><th>${t.costAllocationManagement.allocationPercentage}</th><th>${t.costAllocationManagement.allocatedAmount}</th>
 </tr></thead>
 <tbody>
 ${allocationResults.map((item: any) => `
 <tr>
 <td>${item.period?.periodName || '-'}</td>
 <td>${item.costPool?.poolName || '-'}</td>
 <td>${item.project?.projectCode || '-'}</td>
 <td>${item.allocationKey?.keyName || '-'}</td>
 <td class="amount">${formatCurrency(Number(item.result.totalPoolAmount))}</td>
 <td class="amount">${Number(item.result.allocationPercentage).toFixed(2)}%</td>
 <td class="amount">${formatCurrency(Number(item.result.allocatedAmount))}</td>
 </tr>
 `).join('')}
 </tbody>
 </table>
 <div class="compliance"><strong>${t.financeModule.complianceStatement}</strong><br/>${t.costAllocationManagement.complianceStatement}</div>
 <script>window.onload = function() { window.print(); }</script>
 </body>
 </html>
 `;

 const printWindow = window.open('', '_blank');
 if (printWindow) {
 printWindow.document.write(htmlContent);
 printWindow.document.close();
 toast.success(t.costAllocationManagement.exportSuccess);
 }
 };

 // ============================================
 // RENDER
 // ============================================

 if (!currentOperatingUnit) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="text-center">
 <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
 <p className="text-gray-500">{t.costAllocationManagement.loading}</p>
 </div>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div className="text-start">
 <div className="flex items-center gap-2 mb-2">
 <BackButton onClick={() => navigate("/organization/finance")} label={t.costAllocationManagement.backToFinance} />
 </div>
 <h1 className="text-3xl font-bold text-gray-900">{t.costAllocationManagement.title}</h1>
 <p className="text-base text-gray-600 mt-2">{t.costAllocationManagement.subtitle}</p>
 </div>
 <Button
 onClick={() => {
 setExecutionStep(1);
 setExecutionPeriodId(0);
 setShowExecutionDialog(true);
 }}
 className="flex items-center gap-2"
 >
 <Play className="w-4 h-4" />
 {t.costAllocationManagement.executeAllocation}
 </Button>
 </div>

 {/* Tabs */}
 <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
 <TabsList className={`grid w-full grid-cols-9 ${isRTL ?"direction-rtl" :""}`}>
 <TabsTrigger value="dashboard" className="flex items-center gap-1">
 <BarChart3 className="w-4 h-4" />
 <span className="hidden sm:inline">{t.costAllocationManagement.tabDashboard}</span>
 </TabsTrigger>
 <TabsTrigger value="costPools" className="flex items-center gap-1">
 <Layers className="w-4 h-4" />
 <span className="hidden sm:inline">{t.costAllocationManagement.tabCostPools}</span>
 </TabsTrigger>
 <TabsTrigger value="allocationKeys" className="flex items-center gap-1">
 <Key className="w-4 h-4" />
 <span className="hidden sm:inline">{t.costAllocationManagement.tabAllocationKeys}</span>
 </TabsTrigger>
 <TabsTrigger value="rules" className="flex items-center gap-1">
 <Settings className="w-4 h-4" />
 <span className="hidden sm:inline">{t.costAllocationManagement.tabRules}</span>
 </TabsTrigger>
 <TabsTrigger value="periods" className="flex items-center gap-1">
 <Calendar className="w-4 h-4" />
 <span className="hidden sm:inline">{t.costAllocationManagement.tabPeriods}</span>
 </TabsTrigger>
 <TabsTrigger value="templates" className="flex items-center gap-1">
 <FileText className="w-4 h-4" />
 <span className="hidden sm:inline">{t.costAllocationManagement.tabTemplates}</span>
 </TabsTrigger>
 <TabsTrigger value="transactions" className="flex items-center gap-1">
 <DollarSign className="w-4 h-4" />
 <span className="hidden sm:inline">{t.costAllocationManagement.tabTransactions}</span>
 </TabsTrigger>
 <TabsTrigger value="reallocation" className="flex items-center gap-1">
 <RefreshCw className="w-4 h-4" />
 <span className="hidden sm:inline">{t.costAllocationManagement.tabReallocation}</span>
 </TabsTrigger>
 <TabsTrigger value="results" className="flex items-center gap-1">
 <FileText className="w-4 h-4" />
 <span className="hidden sm:inline">{t.costAllocationManagement.tabResults}</span>
 </TabsTrigger>
 </TabsList>

 {/* Dashboard Tab */}
 <TabsContent value="dashboard" className="space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
 <Card>
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium text-gray-500">{t.costAllocationManagement.totalCostPools}</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold">{dashboardStats?.costPoolsCount || 0}</div>
 </CardContent>
 </Card>
 <Card>
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium text-gray-500">{t.costAllocationManagement.totalAllocationKeys}</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold">{dashboardStats?.allocationKeysCount || 0}</div>
 </CardContent>
 </Card>
 <Card>
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium text-gray-500">{t.costAllocationManagement.activeRules}</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold">{dashboardStats?.activeRulesCount || 0}</div>
 </CardContent>
 </Card>
 <Card>
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium text-gray-500">{t.costAllocationManagement.completedPeriods}</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold">{dashboardStats?.completedPeriodsCount || 0}</div>
 </CardContent>
 </Card>
 <Card>
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium text-gray-500">{t.costAllocationManagement.totalAllocated}</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-green-600">
 {formatCurrency(dashboardStats?.totalAllocatedAmount || 0)}
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Quick Actions */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("costPools")}>
 <CardContent className="pt-6">
 <div className="flex items-center gap-4">
 <div className="p-3 bg-blue-100 rounded-lg">
 <Layers className="w-6 h-6 text-blue-600" />
 </div>
 <div className="text-start">
 <h3 className="font-semibold">{t.costAllocationManagement.costPoolsTitle}</h3>
 <p className="text-sm text-gray-500">{costPools.length} {t.costAllocationManagement.tabCostPools.toLowerCase()}</p>
 </div>
 </div>
 </CardContent>
 </Card>
 <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("allocationKeys")}>
 <CardContent className="pt-6">
 <div className="flex items-center gap-4">
 <div className="p-3 bg-purple-100 rounded-lg">
 <Key className="w-6 h-6 text-purple-600" />
 </div>
 <div className="text-start">
 <h3 className="font-semibold">{t.costAllocationManagement.allocationKeysTitle}</h3>
 <p className="text-sm text-gray-500">{allocationKeys.length} {t.costAllocationManagement.tabAllocationKeys.toLowerCase()}</p>
 </div>
 </div>
 </CardContent>
 </Card>
 <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("results")}>
 <CardContent className="pt-6">
 <div className="flex items-center gap-4">
 <div className="p-3 bg-green-100 rounded-lg">
 <FileText className="w-6 h-6 text-green-600" />
 </div>
 <div className="text-start">
 <h3 className="font-semibold">{t.costAllocationManagement.resultsTitle}</h3>
 <p className="text-sm text-gray-500">{allocationResults.length} {t.costAllocationManagement.tabResults.toLowerCase()}</p>
 </div>
 </div>
 </CardContent>
 </Card>
 </div>
 </TabsContent>

 {/* Cost Pools Tab */}
 <TabsContent value="costPools" className="space-y-4">
 <Card>
 <CardHeader className="flex flex-row items-center justify-between">
 <div className="text-start">
 <CardTitle>{t.costAllocationManagement.costPoolsTitle}</CardTitle>
 <CardDescription>{t.costAllocationManagement.costPoolsDesc}</CardDescription>
 </div>
 <Button
 onClick={() => {
 setEditingCostPool(null);
 resetCostPoolForm();
 setShowCostPoolDialog(true);
 }}
 className="flex items-center gap-2"
 >
 <Plus className="w-4 h-4" />
 {t.costAllocationManagement.addCostPool}
 </Button>
 </CardHeader>
 <CardContent>
 {costPools.length === 0 ? (
 <div className="text-center py-8 text-gray-500">{t.costAllocationManagement.noData}</div>
 ) : (
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="text-start">{t.costAllocationManagement.poolCode}</TableHead>
 <TableHead className="text-start">{t.costAllocationManagement.poolName}</TableHead>
 <TableHead className="text-start">{t.costAllocationManagement.poolType}</TableHead>
 <TableHead className="text-start">{t.costAllocationManagement.description}</TableHead>
 <TableHead className="text-start">{t.costAllocationManagement.isActive}</TableHead>
 <TableHead className="text-center">{t.costAllocationManagement.actions}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {costPools.map((pool: any) => (
 <TableRow key={pool.id}>
 <TableCell className="font-mono">{pool.poolCode}</TableCell>
 <TableCell>{pool.poolName}</TableCell>
 <TableCell>{getPoolTypeBadge(pool.poolType)}</TableCell>
 <TableCell className="max-w-xs truncate">{pool.description ||"-"}</TableCell>
 <TableCell>
 <Badge className={pool.isActive ?"bg-green-100 text-green-700" :"bg-gray-100 text-gray-700"}>
 {pool.isActive ?"✓" :"✗"}
 </Badge>
 </TableCell>
 <TableCell>
 <div className="flex items-center gap-2">
 <Button
 variant="ghost"
 size="sm"
 onClick={() => {
 setEditingCostPool(pool);
 setShowCostPoolDialog(true);
 }}
 >
 <Edit className="w-4 h-4" />
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => {
 setDeleteTarget({ type:"costPool", id: pool.id });
 setShowDeleteDialog(true);
 }}
 >
 <Trash2 className="w-4 h-4 text-red-500" />
 </Button>
 </div>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 )}
 </CardContent>
 </Card>
 </TabsContent>

 {/* Allocation Keys Tab */}
 <TabsContent value="allocationKeys" className="space-y-4">
 <Card>
 <CardHeader className="flex flex-row items-center justify-between">
 <div className="text-start">
 <CardTitle>{t.costAllocationManagement.allocationKeysTitle}</CardTitle>
 <CardDescription>{t.costAllocationManagement.allocationKeysDesc}</CardDescription>
 </div>
 <Button
 onClick={() => {
 setEditingAllocationKey(null);
 resetAllocationKeyForm();
 setShowAllocationKeyDialog(true);
 }}
 className="flex items-center gap-2"
 >
 <Plus className="w-4 h-4" />
 {t.costAllocationManagement.addAllocationKey}
 </Button>
 </CardHeader>
 <CardContent>
 {allocationKeys.length === 0 ? (
 <div className="text-center py-8 text-gray-500">{t.costAllocationManagement.noData}</div>
 ) : (
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="text-start">{t.costAllocationManagement.keyCode}</TableHead>
 <TableHead className="text-start">{t.costAllocationManagement.keyName}</TableHead>
 <TableHead className="text-start">{t.costAllocationManagement.keyType}</TableHead>
 <TableHead className="text-start">{t.costAllocationManagement.description}</TableHead>
 <TableHead className="text-start">{t.costAllocationManagement.isActive}</TableHead>
 <TableHead className="text-center">{t.costAllocationManagement.actions}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {allocationKeys.map((key: any) => (
 <TableRow key={key.id}>
 <TableCell className="font-mono">{key.keyCode}</TableCell>
 <TableCell>{key.keyName}</TableCell>
 <TableCell>{getKeyTypeBadge(key.keyType)}</TableCell>
 <TableCell className="max-w-xs truncate">{key.description ||"-"}</TableCell>
 <TableCell>
 <Badge className={key.isActive ?"bg-green-100 text-green-700" :"bg-gray-100 text-gray-700"}>
 {key.isActive ?"✓" :"✗"}
 </Badge>
 </TableCell>
 <TableCell>
 <div className="flex items-center gap-2">
 <Button
 variant="ghost"
 size="sm"
 onClick={() => {
 setEditingAllocationKey(key);
 setShowAllocationKeyDialog(true);
 }}
 >
 <Edit className="w-4 h-4" />
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => {
 setDeleteTarget({ type:"allocationKey", id: key.id });
 setShowDeleteDialog(true);
 }}
 >
 <Trash2 className="w-4 h-4 text-red-500" />
 </Button>
 </div>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 )}
 </CardContent>
 </Card>
 </TabsContent>

 {/* Allocation Rules Tab */}
 <TabsContent value="rules" className="space-y-4">
 <Card>
 <CardHeader className="flex flex-row items-center justify-between">
 <div className="text-start">
 <CardTitle>{t.costAllocationManagement.rulesTitle}</CardTitle>
 <CardDescription>{t.costAllocationManagement.rulesDesc}</CardDescription>
 </div>
 <Button
 onClick={() => {
 setEditingRule(null);
 resetRuleForm();
 setShowRuleDialog(true);
 }}
 className="flex items-center gap-2"
 >
 <Plus className="w-4 h-4" />
 {t.costAllocationManagement.addRule}
 </Button>
 </CardHeader>
 <CardContent>
 {allocationRules.length === 0 ? (
 <div className="text-center py-8 text-gray-500">{t.costAllocationManagement.noData}</div>
 ) : (
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="text-start">{t.costAllocationManagement.costPool}</TableHead>
 <TableHead className="text-start">{t.costAllocationManagement.allocationKey}</TableHead>
 <TableHead className="text-start">{t.costAllocationManagement.effectiveFrom}</TableHead>
 <TableHead className="text-start">{t.costAllocationManagement.effectiveTo}</TableHead>
 <TableHead className="text-start">{t.costAllocationManagement.isActive}</TableHead>
 <TableHead className="text-center">{t.costAllocationManagement.actions}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {allocationRules.map((item: any) => (
 <TableRow key={item.rule.id}>
 <TableCell>{item.costPool?.poolName ||"-"}</TableCell>
 <TableCell>{item.allocationKey?.keyName ||"-"}</TableCell>
 <TableCell>{formatDate(item.rule.effectiveFrom)}</TableCell>
 <TableCell>{item.rule.effectiveTo ? formatDate(item.rule.effectiveTo) :"-"}</TableCell>
 <TableCell>
 <Badge className={item.rule.isActive ?"bg-green-100 text-green-700" :"bg-gray-100 text-gray-700"}>
 {item.rule.isActive ?"✓" :"✗"}
 </Badge>
 </TableCell>
 <TableCell>
 <div className="flex items-center gap-2">
 <Button
 variant="ghost"
 size="sm"
 onClick={() => {
 setEditingRule(item);
 setShowRuleDialog(true);
 }}
 >
 <Edit className="w-4 h-4" />
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => {
 setDeleteTarget({ type:"rule", id: item.rule.id });
 setShowDeleteDialog(true);
 }}
 >
 <Trash2 className="w-4 h-4 text-red-500" />
 </Button>
 </div>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 )}
 </CardContent>
 </Card>
 </TabsContent>

 {/* Periods Tab */}
 <TabsContent value="periods" className="space-y-4">
 <Card>
 <CardHeader className="flex flex-row items-center justify-between">
 <div className="text-start">
 <CardTitle>{t.costAllocationManagement.periodsTitle}</CardTitle>
 <CardDescription>{t.costAllocationManagement.periodsDesc}</CardDescription>
 </div>
 <Button
 onClick={() => {
 setEditingPeriod(null);
 resetPeriodForm();
 setShowPeriodDialog(true);
 }}
 className="flex items-center gap-2"
 >
 <Plus className="w-4 h-4" />
 {t.costAllocationManagement.addPeriod}
 </Button>
 </CardHeader>
 <CardContent>
 {allocationPeriods.length === 0 ? (
 <div className="text-center py-8 text-gray-500">{t.costAllocationManagement.noData}</div>
 ) : (
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="text-start">{t.costAllocationManagement.periodCode}</TableHead>
 <TableHead className="text-start">{t.costAllocationManagement.periodName}</TableHead>
 <TableHead className="text-start">{t.costAllocationManagement.periodType}</TableHead>
 <TableHead className="text-start">{t.costAllocationManagement.startDate}</TableHead>
 <TableHead className="text-start">{t.costAllocationManagement.endDate}</TableHead>
 <TableHead className="text-start">{t.costAllocationManagement.status}</TableHead>
 <TableHead className="text-center">{t.costAllocationManagement.actions}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {allocationPeriods.map((period: any) => (
 <TableRow key={period.id}>
 <TableCell className="font-mono">{period.periodCode}</TableCell>
 <TableCell>{period.periodName}</TableCell>
 <TableCell>
 <Badge variant="outline">
 {period.periodType ==="monthly" ? t.costAllocationManagement.periodTypeMonthly :
 period.periodType ==="quarterly" ? t.costAllocationManagement.periodTypeQuarterly :
 period.periodType ==="annual" ? t.costAllocationManagement.periodTypeAnnual : t.costAllocationManagement.periodTypeCustom}
 </Badge>
 </TableCell>
 <TableCell>{formatDate(period.startDate)}</TableCell>
 <TableCell>{formatDate(period.endDate)}</TableCell>
 <TableCell>{getStatusBadge(period.status)}</TableCell>
 <TableCell>
 <div className="flex items-center gap-2">
 {period.status ==="draft" && (
 <>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => {
 setEditingPeriod(period);
 setShowPeriodDialog(true);
 }}
 >
 <Edit className="w-4 h-4" />
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => {
 setDeleteTarget({ type:"period", id: period.id });
 setShowDeleteDialog(true);
 }}
 >
 <Trash2 className="w-4 h-4 text-red-500" />
 </Button>
 </>
 )}
 {period.status ==="completed" && (
 <Button
 variant="outline"
 size="sm"
 onClick={() => {
 setReversalPeriodId(period.id);
 setShowReversalDialog(true);
 }}
 className="text-orange-600 border-orange-300 hover:bg-orange-50"
 >
 <RefreshCw className="w-4 h-4 me-1" />
 {t.costAllocationManagement.reverseAllocation}
 </Button>
 )}
 </div>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 )}
 </CardContent>
 </Card>
 </TabsContent>

 {/* Transactions Tab */}
 <TabsContent value="transactions" className="space-y-4">
 <Card>
 <CardHeader className="flex flex-row items-center justify-between">
 <div className="text-start">
 <CardTitle>{t.costAllocationManagement.transactionsTitle}</CardTitle>
 <CardDescription>{t.costAllocationManagement.transactionsDesc}</CardDescription>
 </div>
 <Button
 onClick={() => {
 resetTransactionForm();
 setShowTransactionDialog(true);
 }}
 className="flex items-center gap-2"
 >
 <Plus className="w-4 h-4" />
 {t.costAllocationManagement.addTransaction}
 </Button>
 </CardHeader>
 <CardContent>
 {transactions.length === 0 ? (
 <div className="text-center py-8 text-gray-500">{t.costAllocationManagement.noData}</div>
 ) : (
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="text-start">{t.costAllocationManagement.costPool}</TableHead>
 <TableHead className="text-center">{t.costAllocationManagement.transactionDate}</TableHead>
 <TableHead className="text-start">{t.costAllocationManagement.amount}</TableHead>
 <TableHead className="text-start">{t.costAllocationManagement.description}</TableHead>
 <TableHead className="text-start">{t.costAllocationManagement.sourceModule}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {transactions.map((item: any) => (
 <TableRow key={item.transaction.id}>
 <TableCell>{item.costPool?.poolName ||"-"}</TableCell>
 <TableCell>{formatDate(item.transaction.transactionDate)}</TableCell>
 <TableCell className="font-mono">{formatCurrency(Number(item.transaction.amount))}</TableCell>
 <TableCell className="max-w-xs truncate">{item.transaction.description ||"-"}</TableCell>
 <TableCell>
 <Badge variant="outline">
 {item.transaction.sourceModule ==="manual" ? t.costAllocationManagement.sourceManual :
 item.transaction.sourceModule ==="expense" ? t.costAllocationManagement.sourceExpense :
 item.transaction.sourceModule ==="payment" ? t.costAllocationManagement.sourcePayment :
 item.transaction.sourceModule ==="journal_entry" ? t.costAllocationManagement.sourceJournalEntry : t.costAllocationManagement.sourceImport}
 </Badge>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 )}
 </CardContent>
 </Card>
 </TabsContent>

 {/* Templates Tab */}
 <TabsContent value="templates" className="space-y-4">
 <Card>
 <CardHeader className="flex flex-row items-center justify-between">
 <div className="text-start">
 <CardTitle>{t.costAllocationManagement.templatesTitle}</CardTitle>
 <CardDescription>{t.costAllocationManagement.templatesDesc}</CardDescription>
 </div>
 <Button
 onClick={() => {
 setEditingTemplate(null);
 resetTemplateForm();
 setShowTemplateDialog(true);
 }}
 className="flex items-center gap-2"
 >
 <Plus className="w-4 h-4" />
 {t.costAllocationManagement.addTemplate}
 </Button>
 </CardHeader>
 <CardContent>
 {templates.length === 0 ? (
 <div className="text-center py-8 text-gray-500">{t.costAllocationManagement.noData}</div>
 ) : (
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="text-start">{t.costAllocationManagement.templateCode}</TableHead>
 <TableHead className="text-start">{t.costAllocationManagement.templateName}</TableHead>
 <TableHead className="text-start">{t.costAllocationManagement.periodType}</TableHead>
 <TableHead className="text-start">{t.costAllocationManagement.templateRules}</TableHead>
 <TableHead className="text-start">{t.costAllocationManagement.isActive}</TableHead>
 <TableHead className="text-center">{t.costAllocationManagement.actions}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {templates.map((template: any) => (
 <TableRow key={template.id}>
 <TableCell className="font-mono">{template.templateCode}</TableCell>
 <TableCell>{isRTL && template.templateNameAr ? template.templateNameAr : template.templateName}</TableCell>
 <TableCell>
 <Badge variant="outline">
 {template.periodType ==="monthly" ? t.costAllocationManagement.periodTypeMonthly :
 template.periodType ==="quarterly" ? t.costAllocationManagement.periodTypeQuarterly :
 template.periodType ==="annual" ? t.costAllocationManagement.periodTypeAnnual : t.costAllocationManagement.periodTypeCustom}
 </Badge>
 </TableCell>
 <TableCell>{template.rules?.length || 0} {t.financeModule.rules}</TableCell>
 <TableCell>
 <Badge className={template.isActive ?"bg-green-100 text-green-700" :"bg-gray-100 text-gray-700"}>
 {template.isActive ?"✓" :"✗"}
 </Badge>
 </TableCell>
 <TableCell>
 <div className="flex items-center gap-2">
 <Button
 variant="outline"
 size="sm"
 onClick={() => {
 setApplyTemplateId(template.id);
 setShowApplyTemplateDialog(true);
 }}
 >
 <Play className="w-4 h-4 me-1" />
 {t.costAllocationManagement.applyTemplate}
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => {
 setEditingTemplate(template);
 setTemplateForm({
 templateCode: template.templateCode,
 templateName: template.templateName,
 templateNameAr: template.templateNameAr ||"",
 description: template.description ||"",
 descriptionAr: template.descriptionAr ||"",
 periodType: template.periodType,
 rules: template.rules || [],
 });
 setShowTemplateDialog(true);
 }}
 >
 <Edit className="w-4 h-4" />
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => {
 setDeleteTarget({ type:"template", id: template.id });
 setShowDeleteDialog(true);
 }}
 >
 <Trash2 className="w-4 h-4 text-red-500" />
 </Button>
 </div>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 )}
 </CardContent>
 </Card>
 </TabsContent>

 {/* Budget Reallocation Tab */}
 <TabsContent value="reallocation" className="space-y-4">
 <Card>
 <CardHeader className="flex flex-row items-center justify-between">
 <div className="text-start">
 <CardTitle>{t.costAllocationManagement.reallocationTitle}</CardTitle>
 <CardDescription>{t.costAllocationManagement.reallocationDesc}</CardDescription>
 </div>
 <Button
 onClick={() => {
 setEditingReallocation(null);
 resetReallocationForm();
 setShowReallocationDialog(true);
 }}
 className="flex items-center gap-2"
 >
 <Plus className="w-4 h-4" />
 {t.costAllocationManagement.addReallocation}
 </Button>
 </CardHeader>
 <CardContent>
 {budgetReallocations.length === 0 ? (
 <div className="text-center py-8 text-gray-500">{t.costAllocationManagement.noData}</div>
 ) : (
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="text-start">{t.costAllocationManagement.reallocationCode}</TableHead>
 <TableHead className="text-start">{t.costAllocationManagement.reallocationDate}</TableHead>
 <TableHead className="text-start">{t.costAllocationManagement.totalAmount}</TableHead>
 <TableHead className="text-start">{t.costAllocationManagement.currency}</TableHead>
 <TableHead className="text-start">{t.costAllocationManagement.status}</TableHead>
 <TableHead className="text-center">{t.costAllocationManagement.actions}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {budgetReallocations.map((realloc: any) => (
 <TableRow key={realloc.id}>
 <TableCell className="font-mono">{realloc.reallocationCode}</TableCell>
 <TableCell>{formatDate(realloc.reallocationDate)}</TableCell>
 <TableCell className="font-mono">{formatCurrency(Number(realloc.totalAmount))}</TableCell>
 <TableCell>{realloc.currency}</TableCell>
 <TableCell>
 <Badge className={
 realloc.status ==="draft" ?"bg-gray-100 text-gray-700" :
 realloc.status ==="pending_approval" ?"bg-yellow-100 text-yellow-700" :
 realloc.status ==="approved" ?"bg-blue-100 text-blue-700" :
 realloc.status ==="rejected" ?"bg-red-100 text-red-700" :
 realloc.status ==="executed" ?"bg-green-100 text-green-700" :
"bg-gray-100 text-gray-700"
 }>
 {realloc.status ==="draft" ? t.costAllocationManagement.statusDraft :
 realloc.status ==="pending_approval" ? t.costAllocationManagement.statusPendingApproval :
 realloc.status ==="approved" ? t.costAllocationManagement.statusApproved :
 realloc.status ==="rejected" ? t.costAllocationManagement.statusRejected :
 realloc.status ==="executed" ? t.costAllocationManagement.statusExecuted :
 t.costAllocationManagement.statusCancelled}
 </Badge>
 </TableCell>
 <TableCell>
 <div className="flex items-center gap-2">
 {realloc.status ==="draft" && (
 <>
 <Button
 variant="outline"
 size="sm"
 onClick={() => submitReallocationMutation.mutate({ id: realloc.id })}
 >
 {t.costAllocationManagement.submitForApproval}
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => {
 setDeleteTarget({ type:"reallocation", id: realloc.id });
 setShowDeleteDialog(true);
 }}
 >
 <Trash2 className="w-4 h-4 text-red-500" />
 </Button>
 </>
 )}
 {realloc.status ==="pending_approval" && (
 <>
 <Button
 variant="outline"
 size="sm"
 className="text-green-600 border-green-300"
 onClick={() => approveReallocationMutation.mutate({ id: realloc.id })}
 >
 {t.costAllocationManagement.approve}
 </Button>
 <Button
 variant="outline"
 size="sm"
 className="text-red-600 border-red-300"
 onClick={() => {
 setRejectReallocationId(realloc.id);
 setShowRejectDialog(true);
 }}
 >
 {t.costAllocationManagement.reject}
 </Button>
 </>
 )}
 {realloc.status ==="approved" && (
 <Button
 variant="default"
 size="sm"
 onClick={() => executeReallocationMutation.mutate({ id: realloc.id })}
 >
 <Play className="w-4 h-4 me-1" />
 {t.costAllocationManagement.execute}
 </Button>
 )}
 </div>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 )}
 </CardContent>
 </Card>
 </TabsContent>

 {/* Results Tab */}
 <TabsContent value="results" className="space-y-4">
 <Card>
 <CardHeader className="text-start">
 <div className="flex justify-between items-start">
 <div>
 <CardTitle>{t.costAllocationManagement.resultsTitle}</CardTitle>
 <CardDescription>{t.costAllocationManagement.resultsDesc}</CardDescription>
 </div>
 <div className="flex gap-2">
 <Button
 variant="outline"
 size="sm"
 onClick={handleExportToExcel}
 disabled={allocationResults.length === 0}
 >
 <FileSpreadsheet className="h-4 w-4 me-2" />
 {t.costAllocationManagement.exportToExcel}
 </Button>
 <Button
 variant="outline"
 size="sm"
 onClick={handleExportToPDF}
 disabled={allocationResults.length === 0}
 >
 <Download className="h-4 w-4 me-2" />
 {t.costAllocationManagement.exportToPDF}
 </Button>
 </div>
 </div>
 </CardHeader>
 <CardContent>
 {allocationResults.length === 0 ? (
 <div className="text-center py-8 text-gray-500">{t.costAllocationManagement.noData}</div>
 ) : (
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="text-start">{t.costAllocationManagement.period}</TableHead>
 <TableHead className="text-start">{t.costAllocationManagement.costPool}</TableHead>
 <TableHead className="text-start">{t.costAllocationManagement.project}</TableHead>
 <TableHead className="text-start">{t.costAllocationManagement.allocationKey}</TableHead>
 <TableHead className="text-start">{t.costAllocationManagement.totalPoolAmount}</TableHead>
 <TableHead className="text-start">{t.costAllocationManagement.allocationPercentage}</TableHead>
 <TableHead className="text-start">{t.costAllocationManagement.allocatedAmount}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {allocationResults.map((item: any) => (
 <TableRow key={item.result.id}>
 <TableCell>{item.period?.periodName ||"-"}</TableCell>
 <TableCell>{item.costPool?.poolName ||"-"}</TableCell>
 <TableCell>{item.project?.projectCode ||"-"}</TableCell>
 <TableCell>{item.allocationKey?.keyName ||"-"}</TableCell>
 <TableCell className="font-mono">{formatCurrency(Number(item.result.totalPoolAmount))}</TableCell>
 <TableCell className="font-mono">{Number(item.result.allocationPercentage).toFixed(2)}%</TableCell>
 <TableCell className="font-mono font-semibold text-green-600">
 {formatCurrency(Number(item.result.allocatedAmount))}
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 )}
 </CardContent>
 </Card>
 </TabsContent>
 </Tabs>

 {/* Cost Pool Dialog */}
 <Dialog open={showCostPoolDialog} onOpenChange={setShowCostPoolDialog}>
 <DialogContent className="max-w-md">
 <DialogHeader>
 <DialogTitle>{editingCostPool ? t.costAllocationManagement.editCostPool : t.costAllocationManagement.addCostPool}</DialogTitle>
 </DialogHeader>
 <div className="space-y-4">
 <div>
 <Label>{t.costAllocationManagement.poolCode}</Label>
 <Input
 value={costPoolForm.poolCode}
 onChange={(e) => setCostPoolForm({ ...costPoolForm, poolCode: e.target.value })}
 placeholder="POOL-001"
 />
 </div>
 <div>
 <Label>{t.costAllocationManagement.poolName}</Label>
 <Input
 value={costPoolForm.poolName}
 onChange={(e) => setCostPoolForm({ ...costPoolForm, poolName: e.target.value })}
 />
 </div>
 <div>
 <Label>{t.costAllocationManagement.poolType}</Label>
 <Select
 value={costPoolForm.poolType}
 onValueChange={(value) => setCostPoolForm({ ...costPoolForm, poolType: value })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="overhead">{t.costAllocationManagement.poolTypeOverhead}</SelectItem>
 <SelectItem value="shared_service">{t.costAllocationManagement.poolTypeSharedService}</SelectItem>
 <SelectItem value="administrative">{t.costAllocationManagement.poolTypeAdministrative}</SelectItem>
 <SelectItem value="facility">{t.costAllocationManagement.poolTypeFacility}</SelectItem>
 <SelectItem value="other">{t.costAllocationManagement.poolTypeOther}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div>
 <Label>{t.costAllocationManagement.description}</Label>
 <Textarea
 value={costPoolForm.description}
 onChange={(e) => setCostPoolForm({ ...costPoolForm, description: e.target.value })}
 rows={3}
 />
 </div>
 <div className="flex items-center gap-2">
 <Switch
 checked={costPoolForm.isActive}
 onCheckedChange={(checked) => setCostPoolForm({ ...costPoolForm, isActive: checked })}
 />
 <Label>{t.costAllocationManagement.isActive}</Label>
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowCostPoolDialog(false)}>{t.costAllocationManagement.cancel}</Button>
 <Button onClick={handleCostPoolSubmit}>{t.costAllocationManagement.save}</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Allocation Key Dialog */}
 <Dialog open={showAllocationKeyDialog} onOpenChange={setShowAllocationKeyDialog}>
 <DialogContent className="max-w-md">
 <DialogHeader>
 <DialogTitle>{editingAllocationKey ? t.costAllocationManagement.editAllocationKey : t.costAllocationManagement.addAllocationKey}</DialogTitle>
 </DialogHeader>
 <div className="space-y-4">
 <div>
 <Label>{t.costAllocationManagement.keyCode}</Label>
 <Input
 value={allocationKeyForm.keyCode}
 onChange={(e) => setAllocationKeyForm({ ...allocationKeyForm, keyCode: e.target.value })}
 placeholder="KEY-001"
 />
 </div>
 <div>
 <Label>{t.costAllocationManagement.keyName}</Label>
 <Input
 value={allocationKeyForm.keyName}
 onChange={(e) => setAllocationKeyForm({ ...allocationKeyForm, keyName: e.target.value })}
 />
 </div>
 <div>
 <Label>{t.costAllocationManagement.keyType}</Label>
 <Select
 value={allocationKeyForm.keyType}
 onValueChange={(value) => setAllocationKeyForm({ ...allocationKeyForm, keyType: value })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="headcount">{t.costAllocationManagement.keyTypeHeadcount}</SelectItem>
 <SelectItem value="budget_percentage">{t.costAllocationManagement.keyTypeBudgetPercentage}</SelectItem>
 <SelectItem value="direct_costs">{t.costAllocationManagement.keyTypeDirectCosts}</SelectItem>
 <SelectItem value="equal">{t.costAllocationManagement.keyTypeEqual}</SelectItem>
 <SelectItem value="custom">{t.costAllocationManagement.keyTypeCustom}</SelectItem>
 <SelectItem value="revenue">{t.costAllocationManagement.keyTypeRevenue}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div>
 <Label>{t.costAllocationManagement.description}</Label>
 <Textarea
 value={allocationKeyForm.description}
 onChange={(e) => setAllocationKeyForm({ ...allocationKeyForm, description: e.target.value })}
 rows={3}
 />
 </div>
 <div className="flex items-center gap-2">
 <Switch
 checked={allocationKeyForm.isActive}
 onCheckedChange={(checked) => setAllocationKeyForm({ ...allocationKeyForm, isActive: checked })}
 />
 <Label>{t.costAllocationManagement.isActive}</Label>
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowAllocationKeyDialog(false)}>{t.costAllocationManagement.cancel}</Button>
 <Button onClick={handleAllocationKeySubmit}>{t.costAllocationManagement.save}</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Allocation Rule Dialog */}
 <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
 <DialogContent className="max-w-md">
 <DialogHeader>
 <DialogTitle>{editingRule ? t.costAllocationManagement.editRule : t.costAllocationManagement.addRule}</DialogTitle>
 </DialogHeader>
 <div className="space-y-4">
 <div>
 <Label>{t.costAllocationManagement.costPool}</Label>
 <Select
 value={String(ruleForm.costPoolId)}
 onValueChange={(value) => setRuleForm({ ...ruleForm, costPoolId: Number(value) })}
 >
 <SelectTrigger>
 <SelectValue placeholder={t.costAllocationManagement.selectPeriod} />
 </SelectTrigger>
 <SelectContent>
 {costPools.map((pool: any) => (
 <SelectItem key={pool.id} value={String(pool.id)}>
 {pool.poolName}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div>
 <Label>{t.costAllocationManagement.allocationKey}</Label>
 <Select
 value={String(ruleForm.allocationKeyId)}
 onValueChange={(value) => setRuleForm({ ...ruleForm, allocationKeyId: Number(value) })}
 >
 <SelectTrigger>
 <SelectValue placeholder={t.costAllocationManagement.selectPeriod} />
 </SelectTrigger>
 <SelectContent>
 {allocationKeys.map((key: any) => (
 <SelectItem key={key.id} value={String(key.id)}>
 {key.keyName}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div>
 <Label>{t.costAllocationManagement.effectiveFrom}</Label>
 <Input
 type="date"
 value={ruleForm.effectiveFrom}
 onChange={(e) => setRuleForm({ ...ruleForm, effectiveFrom: e.target.value })}
 />
 </div>
 <div>
 <Label>{t.costAllocationManagement.effectiveTo}</Label>
 <Input
 type="date"
 value={ruleForm.effectiveTo}
 onChange={(e) => setRuleForm({ ...ruleForm, effectiveTo: e.target.value })}
 />
 </div>
 <div className="flex items-center gap-2">
 <Switch
 checked={ruleForm.isActive}
 onCheckedChange={(checked) => setRuleForm({ ...ruleForm, isActive: checked })}
 />
 <Label>{t.costAllocationManagement.isActive}</Label>
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowRuleDialog(false)}>{t.costAllocationManagement.cancel}</Button>
 <Button onClick={handleRuleSubmit}>{t.costAllocationManagement.save}</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Allocation Period Dialog */}
 <Dialog open={showPeriodDialog} onOpenChange={setShowPeriodDialog}>
 <DialogContent className="max-w-md">
 <DialogHeader>
 <DialogTitle>{editingPeriod ? t.costAllocationManagement.editPeriod : t.costAllocationManagement.addPeriod}</DialogTitle>
 </DialogHeader>
 <div className="space-y-4">
 <div>
 <Label>{t.costAllocationManagement.periodCode}</Label>
 <Input
 value={periodForm.periodCode}
 onChange={(e) => setPeriodForm({ ...periodForm, periodCode: e.target.value })}
 placeholder="2026-01"
 />
 </div>
 <div>
 <Label>{t.costAllocationManagement.periodName}</Label>
 <Input
 value={periodForm.periodName}
 onChange={(e) => setPeriodForm({ ...periodForm, periodName: e.target.value })}
 placeholder={t.placeholders.january2026}
 />
 </div>
 <div>
 <Label>{t.costAllocationManagement.periodType}</Label>
 <Select
 value={periodForm.periodType}
 onValueChange={(value) => setPeriodForm({ ...periodForm, periodType: value })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="monthly">{t.costAllocationManagement.periodTypeMonthly}</SelectItem>
 <SelectItem value="quarterly">{t.costAllocationManagement.periodTypeQuarterly}</SelectItem>
 <SelectItem value="annual">{t.costAllocationManagement.periodTypeAnnual}</SelectItem>
 <SelectItem value="custom">{t.costAllocationManagement.periodTypeCustom}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div>
 <Label>{t.costAllocationManagement.startDate}</Label>
 <Input
 type="date"
 value={periodForm.startDate}
 onChange={(e) => setPeriodForm({ ...periodForm, startDate: e.target.value })}
 />
 </div>
 <div>
 <Label>{t.costAllocationManagement.endDate}</Label>
 <Input
 type="date"
 value={periodForm.endDate}
 onChange={(e) => setPeriodForm({ ...periodForm, endDate: e.target.value })}
 />
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowPeriodDialog(false)}>{t.costAllocationManagement.cancel}</Button>
 <Button onClick={handlePeriodSubmit}>{t.costAllocationManagement.save}</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Transaction Dialog */}
 <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
 <DialogContent className="max-w-md">
 <DialogHeader>
 <DialogTitle>{t.costAllocationManagement.addTransaction}</DialogTitle>
 </DialogHeader>
 <div className="space-y-4">
 <div>
 <Label>{t.costAllocationManagement.costPool}</Label>
 <Select
 value={String(transactionForm.costPoolId)}
 onValueChange={(value) => setTransactionForm({ ...transactionForm, costPoolId: Number(value) })}
 >
 <SelectTrigger>
 <SelectValue placeholder={t.costAllocationManagement.selectPeriod} />
 </SelectTrigger>
 <SelectContent>
 {costPools.map((pool: any) => (
 <SelectItem key={pool.id} value={String(pool.id)}>
 {pool.poolName}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div>
 <Label>{t.costAllocationManagement.transactionDate}</Label>
 <Input
 type="date"
 value={transactionForm.transactionDate}
 onChange={(e) => setTransactionForm({ ...transactionForm, transactionDate: e.target.value })}
 />
 </div>
 <div>
 <Label>{t.costAllocationManagement.amount}</Label>
 <Input
 type="number"
 step="0.01"
 value={transactionForm.amount}
 onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
 />
 </div>
 <div>
 <Label>{t.costAllocationManagement.description}</Label>
 <Textarea
 value={transactionForm.description}
 onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
 rows={3}
 />
 </div>
 <div>
 <Label>{t.costAllocationManagement.sourceModule}</Label>
 <Select
 value={transactionForm.sourceModule}
 onValueChange={(value) => setTransactionForm({ ...transactionForm, sourceModule: value })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="manual">{t.costAllocationManagement.sourceManual}</SelectItem>
 <SelectItem value="expense">{t.costAllocationManagement.sourceExpense}</SelectItem>
 <SelectItem value="payment">{t.costAllocationManagement.sourcePayment}</SelectItem>
 <SelectItem value="journal_entry">{t.costAllocationManagement.sourceJournalEntry}</SelectItem>
 <SelectItem value="import">{t.costAllocationManagement.sourceImport}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowTransactionDialog(false)}>{t.costAllocationManagement.cancel}</Button>
 <Button onClick={handleTransactionSubmit}>{t.costAllocationManagement.save}</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Execution Wizard Dialog */}
 <Dialog open={showExecutionDialog} onOpenChange={setShowExecutionDialog}>
 <DialogContent className="max-w-lg">
 <DialogHeader>
 <DialogTitle>{t.costAllocationManagement.executionWizard}</DialogTitle>
 <DialogDescription>
 {executionStep === 1 && t.costAllocationManagement.step1}
 {executionStep === 2 && t.costAllocationManagement.step2}
 {executionStep === 3 && t.costAllocationManagement.step3}
 </DialogDescription>
 </DialogHeader>
 <div className="space-y-4 py-4">
 {/* Step Indicator */}
 <div className="flex items-center justify-center gap-4">
 {[1, 2, 3].map((step) => (
 <div
 key={step}
 className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${ step === executionStep ?"bg-blue-600 text-white" : step < executionStep ?"bg-green-600 text-white" :"bg-gray-200 text-gray-500" }`}
 >
 {step < executionStep ? <CheckCircle className="w-5 h-5" /> : step}
 </div>
 ))}
 </div>

 {/* Step 1: Select Period */}
 {executionStep === 1 && (
 <div>
 <Label>{t.costAllocationManagement.selectPeriod}</Label>
 <Select
 value={String(executionPeriodId)}
 onValueChange={(value) => setExecutionPeriodId(Number(value))}
 >
 <SelectTrigger>
 <SelectValue placeholder={t.costAllocationManagement.selectPeriod} />
 </SelectTrigger>
 <SelectContent>
 {allocationPeriods
 .filter((p: any) => p.status ==="draft")
 .map((period: any) => (
 <SelectItem key={period.id} value={String(period.id)}>
 {period.periodName} ({formatDate(period.startDate)} - {formatDate(period.endDate)})
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 )}

 {/* Step 2: Calculate Bases */}
 {executionStep === 2 && (
 <div className="text-center py-4">
 <p className="text-gray-600 mb-4">
 {'Allocation bases will be calculated for all active projects based on configured allocation keys.'}
 </p>
 <Button
 onClick={() => {
 calculateBasesMutation.mutate({
 organizationId,
 allocationPeriodId: executionPeriodId,
 });
 }}
 disabled={calculateBasesMutation.isPending}
 className="flex items-center gap-2 mx-auto"
 >
 {calculateBasesMutation.isPending ? (
 <RefreshCw className="w-4 h-4 animate-spin" />
 ) : (
 <Play className="w-4 h-4" />
 )}
 {t.costAllocationManagement.calculateBases}
 </Button>
 </div>
 )}

 {/* Step 3: Execute Allocation */}
 {executionStep === 3 && (
 <div className="text-center py-4">
 <p className="text-gray-600 mb-4">
 {'The allocation will be executed and allocation results will be created for each project and cost pool.'}
 </p>
 <Button
 onClick={() => {
 executeAllocationMutation.mutate({
 organizationId,
 allocationPeriodId: executionPeriodId,
 });
 }}
 disabled={executeAllocationMutation.isPending}
 className="flex items-center gap-2 mx-auto"
 >
 {executeAllocationMutation.isPending ? (
 <RefreshCw className="w-4 h-4 animate-spin" />
 ) : (
 <Play className="w-4 h-4" />
 )}
 {t.costAllocationManagement.executeAllocation}
 </Button>
 </div>
 )}
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowExecutionDialog(false)}>{t.costAllocationManagement.cancel}</Button>
 {executionStep === 1 && (
 <Button
 onClick={() => setExecutionStep(2)}
 disabled={!executionPeriodId}
 >
 {t.financeModule.next}
 </Button>
 )}
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Delete Confirmation Dialog */}
 <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
 <DialogContent className="max-w-sm">
 <DialogHeader>
 <DialogTitle>{t.costAllocationManagement.delete}</DialogTitle>
 <DialogDescription>{t.costAllocationManagement.deleteConfirm}</DialogDescription>
 </DialogHeader>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>{t.costAllocationManagement.cancel}</Button>
 <Button variant="destructive" onClick={handleDelete}>{t.costAllocationManagement.confirm}</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Reversal Dialog */}
 <Dialog open={showReversalDialog} onOpenChange={setShowReversalDialog}>
 <DialogContent className="max-w-md">
 <DialogHeader>
 <DialogTitle>{t.costAllocationManagement.reversalDialog}</DialogTitle>
 <DialogDescription>{t.costAllocationManagement.reverseConfirm}</DialogDescription>
 </DialogHeader>
 <div className="space-y-4">
 <div>
 <Label>{t.costAllocationManagement.reversalReason}</Label>
 <Textarea
 value={reversalReason}
 onChange={(e) => setReversalReason(e.target.value)}
 placeholder={t.placeholders.enterReasonForReversal}
 rows={3}
 />
 </div>
 {/* Arabic reversal reason field - shown only in RTL mode */}
 {isRTL && (
 <div>
 <Label>{t.costAllocationManagement.reversalReasonAr}</Label>
 <Textarea
 value={reversalReasonAr}
 onChange={(e) => setReversalReasonAr(e.target.value)}
 placeholder={t.placeholders.أدخلسببالعكس}
 rows={3}
 dir="rtl"
 />
 </div>
 )}
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowReversalDialog(false)}>{t.costAllocationManagement.cancel}</Button>
 <Button
 variant="destructive"
 onClick={() => {
 reverseAllocationMutation.mutate({
 allocationPeriodId: reversalPeriodId,
 reason: reversalReason,
 reasonAr: reversalReasonAr,
 });
 }}
 disabled={reverseAllocationMutation.isPending || !reversalReason}
 >
 {reverseAllocationMutation.isPending ? (
 <RefreshCw className="w-4 h-4 animate-spin me-2" />
 ) : null}
 {t.costAllocationManagement.reverseAllocation}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Template Dialog */}
 <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
 <DialogContent className="max-w-lg">
 <DialogHeader>
 <DialogTitle>{editingTemplate ? t.costAllocationManagement.editTemplate : t.costAllocationManagement.addTemplate}</DialogTitle>
 </DialogHeader>
 <div className="space-y-4 max-h-96 overflow-y-auto">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.costAllocationManagement.templateCode}</Label>
 <Input
 value={templateForm.templateCode}
 onChange={(e) => setTemplateForm({ ...templateForm, templateCode: e.target.value })}
 placeholder="TMPL-001"
 />
 </div>
 <div>
 <Label>{t.costAllocationManagement.periodType}</Label>
 <Select
 value={templateForm.periodType}
 onValueChange={(value) => setTemplateForm({ ...templateForm, periodType: value })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="monthly">{t.costAllocationManagement.periodTypeMonthly}</SelectItem>
 <SelectItem value="quarterly">{t.costAllocationManagement.periodTypeQuarterly}</SelectItem>
 <SelectItem value="annual">{t.costAllocationManagement.periodTypeAnnual}</SelectItem>
 <SelectItem value="custom">{t.costAllocationManagement.periodTypeCustom}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 <div>
 <Label>{t.costAllocationManagement.templateName}</Label>
 <Input
 value={templateForm.templateName}
 onChange={(e) => setTemplateForm({ ...templateForm, templateName: e.target.value })}
 placeholder={t.placeholders.monthlyOverheadAllocation}
 />
 </div>
 {/* Arabic template name - shown only in RTL mode */}
 {isRTL && (
 <div>
 <Label>{t.costAllocationManagement.templateNameAr}</Label>
 <Input
 value={templateForm.templateNameAr}
 onChange={(e) => setTemplateForm({ ...templateForm, templateNameAr: e.target.value })}
 placeholder={t.placeholders.توزيعالتكاليفالعامةالشهري}
 dir="rtl"
 />
 </div>
 )}
 <div>
 <Label>{t.costAllocationManagement.description}</Label>
 <Textarea
 value={templateForm.description}
 onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
 rows={2}
 />
 </div>
 <div>
 <div className="flex justify-between items-center mb-2">
 <Label>{t.costAllocationManagement.templateRules}</Label>
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => setTemplateForm({
 ...templateForm,
 rules: [...templateForm.rules, { costPoolId: 0, allocationKeyId: 0, priority: templateForm.rules.length + 1 }]
 })}
 >
 <Plus className="w-4 h-4 me-1" />
 {t.costAllocationManagement.addRule}
 </Button>
 </div>
 {templateForm.rules.map((rule, index) => (
 <div key={index} className="flex gap-2 mb-2 items-center">
 <Select
 value={String(rule.costPoolId)}
 onValueChange={(value) => {
 const newRules = [...templateForm.rules];
 newRules[index].costPoolId = Number(value);
 setTemplateForm({ ...templateForm, rules: newRules });
 }}
 >
 <SelectTrigger className="flex-1">
 <SelectValue placeholder={t.costAllocationManagement.costPool} />
 </SelectTrigger>
 <SelectContent>
 {costPools.map((pool: any) => (
 <SelectItem key={pool.id} value={String(pool.id)}>{pool.poolName}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 <Select
 value={String(rule.allocationKeyId)}
 onValueChange={(value) => {
 const newRules = [...templateForm.rules];
 newRules[index].allocationKeyId = Number(value);
 setTemplateForm({ ...templateForm, rules: newRules });
 }}
 >
 <SelectTrigger className="flex-1">
 <SelectValue placeholder={t.costAllocationManagement.allocationKey} />
 </SelectTrigger>
 <SelectContent>
 {allocationKeys.map((key: any) => (
 <SelectItem key={key.id} value={String(key.id)}>{key.keyName}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => {
 const newRules = templateForm.rules.filter((_, i) => i !== index);
 setTemplateForm({ ...templateForm, rules: newRules });
 }}
 >
 <Trash2 className="w-4 h-4 text-red-500" />
 </Button>
 </div>
 ))}
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>{t.costAllocationManagement.cancel}</Button>
 <Button
 onClick={() => {
 if (editingTemplate) {
 updateTemplateMutation.mutate({
 id: editingTemplate.id,
 ...templateForm,
 });
 } else {
 createTemplateMutation.mutate({
 organizationId,
 ...templateForm,
 });
 }
 }}
 >
 {t.costAllocationManagement.save}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Apply Template Dialog */}
 <Dialog open={showApplyTemplateDialog} onOpenChange={setShowApplyTemplateDialog}>
 <DialogContent className="max-w-md">
 <DialogHeader>
 <DialogTitle>{t.costAllocationManagement.applyTemplate}</DialogTitle>
 <DialogDescription>{t.costAllocationManagement.applyTemplateDesc}</DialogDescription>
 </DialogHeader>
 <div className="space-y-4">
 <div>
 <Label>{t.costAllocationManagement.periodCode}</Label>
 <Input
 value={applyTemplateForm.periodCode}
 onChange={(e) => setApplyTemplateForm({ ...applyTemplateForm, periodCode: e.target.value })}
 placeholder="2026-01"
 />
 </div>
 <div>
 <Label>{t.costAllocationManagement.periodName}</Label>
 <Input
 value={applyTemplateForm.periodName}
 onChange={(e) => setApplyTemplateForm({ ...applyTemplateForm, periodName: e.target.value })}
 placeholder={t.placeholders.january2026}
 />
 </div>
 <div>
 <Label>{t.costAllocationManagement.startDate}</Label>
 <Input
 type="date"
 value={applyTemplateForm.startDate}
 onChange={(e) => setApplyTemplateForm({ ...applyTemplateForm, startDate: e.target.value })}
 />
 </div>
 <div>
 <Label>{t.costAllocationManagement.endDate}</Label>
 <Input
 type="date"
 value={applyTemplateForm.endDate}
 onChange={(e) => setApplyTemplateForm({ ...applyTemplateForm, endDate: e.target.value })}
 />
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowApplyTemplateDialog(false)}>{t.costAllocationManagement.cancel}</Button>
 <Button
 onClick={() => {
 applyTemplateMutation.mutate({
 templateId: applyTemplateId,
 ...applyTemplateForm,
 });
 }}
 disabled={applyTemplateMutation.isPending || !applyTemplateForm.periodCode || !applyTemplateForm.startDate || !applyTemplateForm.endDate}
 >
 {applyTemplateMutation.isPending ? (
 <RefreshCw className="w-4 h-4 animate-spin me-2" />
 ) : null}
 {t.costAllocationManagement.applyTemplate}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Budget Reallocation Dialog */}
 <Dialog open={showReallocationDialog} onOpenChange={setShowReallocationDialog}>
 <DialogContent className="max-w-2xl">
 <DialogHeader>
 <DialogTitle>{editingReallocation ? t.costAllocationManagement.editReallocation : t.costAllocationManagement.addReallocation}</DialogTitle>
 </DialogHeader>
 <div className="space-y-4 max-h-96 overflow-y-auto">
 <div className="grid grid-cols-3 gap-4">
 <div>
 <Label>{t.costAllocationManagement.reallocationCode}</Label>
 <Input
 value={reallocationForm.reallocationCode}
 onChange={(e) => setReallocationForm({ ...reallocationForm, reallocationCode: e.target.value })}
 placeholder={t.placeholders.realloc001}
 />
 </div>
 <div>
 <Label>{t.costAllocationManagement.reallocationDate}</Label>
 <Input
 type="date"
 value={reallocationForm.reallocationDate}
 onChange={(e) => setReallocationForm({ ...reallocationForm, reallocationDate: e.target.value })}
 />
 </div>
 <div>
 <Label>{t.costAllocationManagement.currency}</Label>
 <Select
 value={reallocationForm.currency}
 onValueChange={(value) => setReallocationForm({ ...reallocationForm, currency: value })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="USD">USD</SelectItem>
 <SelectItem value="EUR">EUR</SelectItem>
 <SelectItem value="GBP">GBP</SelectItem>
 <SelectItem value="SAR">SAR</SelectItem>
 <SelectItem value="AED">AED</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 <div>
 <Label>{t.costAllocationManagement.justification}</Label>
 <Textarea
 value={reallocationForm.justification}
 onChange={(e) => setReallocationForm({ ...reallocationForm, justification: e.target.value })}
 rows={2}
 />
 </div>
 {/* Arabic justification - shown only in RTL mode */}
 {isRTL && (
 <div>
 <Label>{t.costAllocationManagement.justificationAr}</Label>
 <Textarea
 value={reallocationForm.justificationAr}
 onChange={(e) => setReallocationForm({ ...reallocationForm, justificationAr: e.target.value })}
 rows={2}
 dir="rtl"
 />
 </div>
 )}
 <div>
 <div className="flex justify-between items-center mb-2">
 <Label>{t.costAllocationManagement.lines}</Label>
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => setReallocationForm({
 ...reallocationForm,
 lines: [...reallocationForm.lines, { lineType:"source", projectId: 0, amount:"" }]
 })}
 >
 <Plus className="w-4 h-4 me-1" />
 {t.costAllocationManagement.addLine}
 </Button>
 </div>
 {reallocationForm.lines.map((line, index) => (
 <div key={index} className="flex gap-2 mb-2 items-center">
 <Select
 value={line.lineType}
 onValueChange={(value:"source" |"destination") => {
 const newLines = [...reallocationForm.lines];
 newLines[index].lineType = value;
 setReallocationForm({ ...reallocationForm, lines: newLines });
 }}
 >
 <SelectTrigger className="w-32">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="source">{t.costAllocationManagement.source}</SelectItem>
 <SelectItem value="destination">{t.costAllocationManagement.destination}</SelectItem>
 </SelectContent>
 </Select>
 <Select
 value={String(line.projectId)}
 onValueChange={(value) => {
 const newLines = [...reallocationForm.lines];
 newLines[index].projectId = Number(value);
 setReallocationForm({ ...reallocationForm, lines: newLines });
 }}
 >
 <SelectTrigger className="flex-1">
 <SelectValue placeholder={t.costAllocationManagement.project} />
 </SelectTrigger>
 <SelectContent>
 {projectsList.map((project: any) => (
 <SelectItem key={project.id} value={String(project.id)}>
 {project.projectCode} - {project.projectName}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 <Input
 type="number"
 step="0.01"
 value={line.amount}
 onChange={(e) => {
 const newLines = [...reallocationForm.lines];
 newLines[index].amount = e.target.value;
 setReallocationForm({ ...reallocationForm, lines: newLines });
 }}
 placeholder={t.costAllocationManagement.amount}
 className="w-32"
 />
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => {
 const newLines = reallocationForm.lines.filter((_, i) => i !== index);
 setReallocationForm({ ...reallocationForm, lines: newLines });
 }}
 >
 <Trash2 className="w-4 h-4 text-red-500" />
 </Button>
 </div>
 ))}
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowReallocationDialog(false)}>{t.costAllocationManagement.cancel}</Button>
 <Button
 onClick={() => {
 const totalAmount = reallocationForm.lines
 .filter(l => l.lineType ==="source")
 .reduce((sum, l) => sum + parseFloat(l.amount ||"0"), 0);
 createReallocationMutation.mutate({
 organizationId,
 ...reallocationForm,
 totalAmount,
 lines: reallocationForm.lines.map(l => ({
 ...l,
 amount: parseFloat(l.amount ||"0"),
 })),
 });
 }}
 disabled={createReallocationMutation.isPending || reallocationForm.lines.length === 0}
 >
 {t.costAllocationManagement.save}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Rejection Dialog */}
 <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
 <DialogContent className="max-w-md">
 <DialogHeader>
 <DialogTitle>{t.costAllocationManagement.reject}</DialogTitle>
 </DialogHeader>
 <div className="space-y-4">
 <div>
 <Label>{t.costAllocationManagement.rejectionReason}</Label>
 <Textarea
 value={rejectionReason}
 onChange={(e) => setRejectionReason(e.target.value)}
 placeholder={t.placeholders.enterReasonForRejection}
 rows={3}
 />
 </div>
 {/* Arabic rejection reason - shown only in RTL mode */}
 {isRTL && (
 <div>
 <Label>{t.costAllocationManagement.rejectionReasonAr}</Label>
 <Textarea
 value={rejectionReasonAr}
 onChange={(e) => setRejectionReasonAr(e.target.value)}
 placeholder={t.placeholders.أدخلسببالرفض}
 rows={3}
 dir="rtl"
 />
 </div>
 )}
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowRejectDialog(false)}>{t.costAllocationManagement.cancel}</Button>
 <Button
 variant="destructive"
 onClick={() => {
 rejectReallocationMutation.mutate({
 id: rejectReallocationId,
 rejectionReason,
 rejectionReasonAr,
 });
 }}
 disabled={rejectReallocationMutation.isPending || !rejectionReason}
 >
 {t.costAllocationManagement.reject}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
