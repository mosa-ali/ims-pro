/**
 * Budget Detail Workspace Page
 * 
 * Full workspace page for viewing/editing a single budget.
 * Replaces the modal-based BudgetDetailDialog with a dedicated route.
 * 
 * Route: /organization/finance/budgets/:id
 * 
 * Features:
 * - KPI summary cards (Total Budget, Actual Spent, Remaining, Utilization)
 * - 4 tabs: Budget Lines, Monthly Allocations, Variance Analysis, Version History
 * - Add/Delete budget lines (when status is draft)
 * - Monthly allocation grid with auto-distribute
 * - Variance analysis with line-level and monthly views
 * - Full bilingual support (Arabic/English) with RTL/LTR
 */
import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOperatingUnit } from "@/contexts/OperatingUnitContext";
import { useNavigate } from "@/lib/router-compat";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
 ArrowLeft, ArrowRight, Plus, Trash2,
 Clock, CheckCircle, XCircle, Send, FileText, Edit,
 AlertTriangle, Calendar, Loader2, Sparkles,
 DollarSign, TrendingUp, PieChart, BarChart3, FolderOpen
} from "lucide-react";
import { EvidencePanel } from "@/components/EvidencePanel";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

// ============================================================================
// SHARED HELPERS
// ============================================================================

function extractNumericId(id: string | number | undefined): number | undefined {
 if (id === undefined || id === null) return undefined;
 if (typeof id === 'number') return id;
 const match = id.toString().match(/\d+/);
 return match ? parseInt(match[0], 10) : undefined;
}

function formatCurrency(amount: number | string, currency: string = "USD"): string {
 const num = typeof amount === "string" ? parseFloat(amount) : amount;
 return new Intl.NumberFormat("en-US", {
 style: "currency",
 currency,
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 }).format(num || 0);
}

function formatDate(date: string | Date | null): string {
 if (!date) return "-";
 const d = new Date(date);
 return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const STATUS_CONFIG: Record<string, { color: string; icon: any; labelEn: string; labelAr: string }> = {
 draft: { color: "bg-gray-100 text-gray-800 border-gray-300", icon: Clock, labelEn: "Draft", labelAr: "مسودة" },
 submitted: { color: "bg-blue-100 text-blue-800 border-blue-300", icon: Send, labelEn: "Submitted", labelAr: "مقدم" },
 approved: { color: "bg-green-100 text-green-800 border-green-300", icon: CheckCircle, labelEn: "Approved", labelAr: "معتمد" },
 rejected: { color: "bg-red-100 text-red-800 border-red-300", icon: XCircle, labelEn: "Rejected", labelAr: "مرفوض" },
 revised: { color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: Edit, labelEn: "Revised", labelAr: "معدل" },
 closed: { color: "bg-purple-100 text-purple-800 border-purple-300", icon: FileText, labelEn: "Closed", labelAr: "مغلق" },
};

function renderStatusBadge(status: string, isRTL: boolean) {
 const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
 const Icon = config.icon;
 return (
 <Badge variant="outline" className={`${config.color} border`}>
 <Icon className="h-3 w-3 me-1" />
 {isRTL ? config.labelAr : config.labelEn}
 </Badge>
 );
}

// ============================================================================
// MAIN BUDGET DETAIL PAGE
// ============================================================================

export default function BudgetDetail() {
 const { t } = useTranslation();
 const { id } = useParams<{ id: string }>();
 const budgetId = parseInt(id || "0", 10);
 const navigate = useNavigate();
 const { language, isRTL} = useLanguage();
 const { currentOrganizationId } = useOrganization();
 const { currentOperatingUnitId } = useOperatingUnit();

 const orgId = extractNumericId(currentOrganizationId) || 0;
 const opUnitId = extractNumericId(currentOperatingUnitId);

 const [activeTab, setActiveTab] = useState("lines");
 const [showAddLineDialog, setShowAddLineDialog] = useState(false);

 // Translations
 const labels = {
 backToBudgets: t.financeModule.backToBudgets,
 totalBudget: t.financeModule.totalBudget11,
 actualSpent: t.financeModule.actualSpent,
 remaining: t.financeModule.remaining,
 utilization: t.financeModule.utilization,
 budgetLines: t.financeModule.budgetLines,
 monthlyAllocations: t.financeModule.monthlyAllocations,
 varianceAnalysis: t.financeModule.varianceAnalysis,
 evidence: t.financeModule.evidenceDocuments,
 versionHistory: t.financeModule.versionHistory,
 addLine: t.financeModule.addLine,
 description: t.financeModule.description,
 unitCost: t.financeModule.unitCost,
 qty: t.financeModule.qty,
 duration: t.financeModule.duration,
 total: t.financeModule.total,
 actions: t.financeModule.actions,
 noLines: t.financeModule.noLinesInThisBudget,
 month: t.financeModule.mo,
 budgetNotFound: t.financeModule.budgetNotFound,
 loading: t.financeModule.loading,
 originalVersion: t.financeModule.originalVersion,
 revision: t.financeModule.revision,
 created: t.financeModule.created,
 fiscalYear: t.financeModule.fiscalYear,
 period: t.financeModule.period,
 currency: t.financeModule.currency,
 project: t.financeModule.project12,
 };

 // Fetch budget details
 const { data: budget, isLoading, refetch } = trpc.budgets.getById.useQuery(
 { budgetId, organizationId: orgId, operatingUnitId: opUnitId },
 { enabled: budgetId > 0 && orgId > 0 }
 );

 // Fetch budget lines
 const { data: budgetLines = [], refetch: refetchLines } = trpc.budgetLines.list.useQuery(
 { budgetId },
 { enabled: budgetId > 0 }
 );

 // Fetch budget categories
 const { data: budgetCategories = [] } = trpc.financeSettings.listBudgetCategories.useQuery(
 { organizationId: orgId },
 { enabled: orgId > 0 }
 );

 // Delete line mutation
 const deleteLineMutation = trpc.budgetLines.delete.useMutation({
 onSuccess: () => {
 toast.success(t.financeModule.lineDeletedSuccessfully);
 refetchLines();
 refetch();
 },
 onError: (error) => {
 toast.error(`${t.financeModule.failedToDelete}: ${error.message}`);
 },
 });

 // Add line mutation
 const addLineMutation = trpc.budgetLines.create.useMutation({
 onSuccess: () => {
 toast.success(t.financeModule.lineAddedSuccessfully);
 refetchLines();
 refetch();
 },
 onError: (error) => {
 toast.error(`${t.financeModule.failedToAdd}: ${error.message}`);
 },
 });

 // Loading state
 if (isLoading) {
 return (
 <div className="flex items-center justify-center min-h-[60vh]" dir={isRTL ? 'rtl' : 'ltr'}>
 <Loader2 className="w-8 h-8 animate-spin text-primary" />
 </div>
 );
 }

 // Not found state
 if (!budget) {
 return (
 <div className="container mx-auto py-6">
 <div className="flex flex-col items-center justify-center min-h-[40vh]">
 <p className="text-lg text-muted-foreground mb-4">{labels.budgetNotFound}</p>
 <Button onClick={() => navigate('/organization/finance/budgets')}>
 {labels.backToBudgets}
 </Button>
 </div>
 </div>
 );
 }

 const canEdit = budget.status === "draft";
 const totalApproved = parseFloat(budget.totalApprovedAmount || "0");
 const totalActual = parseFloat(budget.totalActualAmount || "0");
 const remaining = totalApproved - totalActual;
 const utilizationPct = totalApproved > 0 ? ((totalActual / totalApproved) * 100) : 0;

 return (
 <div className="container mx-auto py-6">
 <div className="space-y-6">
 {/* Back Button & Header */}
 <div>
 <BackButton onClick={() => navigate('/organization/finance/budgets')} label={labels.backToBudgets} />

 <div className="flex items-start justify-between">
 <div className="text-start">
 <h1 className="text-2xl font-bold tracking-tight">
 {isRTL && budget.budgetTitleAr ? budget.budgetTitleAr : budget.budgetTitle || budget.budgetCode}
 </h1>
 <div className="flex items-center gap-3 mt-2 text-muted-foreground">
 <span className="font-mono text-sm">{budget.budgetCode}</span>
 <span>•</span>
 <span>{labels.fiscalYear}: {budget.fiscalYear}</span>
 <span>•</span>
 <span>{labels.currency}: {budget.currency}</span>
 <span>•</span>
 {renderStatusBadge(budget.status, isRTL)}
 <Badge variant="secondary" className="ms-2">v{budget.versionNumber}</Badge>
 </div>
 {budget.periodStart && budget.periodEnd && (
 <p className="text-sm text-muted-foreground mt-1">
 {labels.period}: {formatDate(budget.periodStart)} — {formatDate(budget.periodEnd)}
 </p>
 )}
 </div>
 </div>
 </div>

 {/* KPI Summary Cards */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 <Card>
 <CardContent className="pt-5 pb-4">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-lg bg-primary/10">
 <DollarSign className="w-5 h-5 text-primary" />
 </div>
 <div>
 <p className="text-xs text-muted-foreground">{labels.totalBudget}</p>
 <p className="text-xl font-bold text-primary">
 {formatCurrency(totalApproved, budget.currency)}
 </p>
 </div>
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-5 pb-4">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-lg bg-blue-100">
 <TrendingUp className="w-5 h-5 text-blue-600" />
 </div>
 <div>
 <p className="text-xs text-muted-foreground">{labels.actualSpent}</p>
 <p className="text-xl font-bold text-blue-600">
 {formatCurrency(totalActual, budget.currency)}
 </p>
 </div>
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-5 pb-4">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-lg bg-green-100">
 <PieChart className="w-5 h-5 text-green-600" />
 </div>
 <div>
 <p className="text-xs text-muted-foreground">{labels.remaining}</p>
 <p className={`text-xl font-bold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
 {formatCurrency(remaining, budget.currency)}
 </p>
 </div>
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-5 pb-4">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-lg bg-amber-100">
 <BarChart3 className="w-5 h-5 text-amber-600" />
 </div>
 <div>
 <p className="text-xs text-muted-foreground">{labels.utilization}</p>
 <p className="text-xl font-bold">{utilizationPct.toFixed(1)}%</p>
 <div className="w-24 h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
 <div
 className={`h-full rounded-full ${ utilizationPct > 100 ? 'bg-red-500' : utilizationPct > 90 ? 'bg-amber-500' : 'bg-green-500' }`}
 style={{ width: `${Math.min(utilizationPct, 100)}%` }}
 />
 </div>
 </div>
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Tabs */}
 <Tabs value={activeTab} onValueChange={setActiveTab}>
 <TabsList className="grid w-full grid-cols-5">
 <TabsTrigger value="lines">{labels.budgetLines}</TabsTrigger>
 <TabsTrigger value="allocations">{labels.monthlyAllocations}</TabsTrigger>
 <TabsTrigger value="variance">{labels.varianceAnalysis}</TabsTrigger>
 <TabsTrigger value="evidence">{labels.evidence}</TabsTrigger>
 <TabsTrigger value="history">{labels.versionHistory}</TabsTrigger>
 </TabsList>

 {/* Budget Lines Tab */}
 <TabsContent value="lines" className="mt-4">
 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center justify-between mb-4">
 <h3 className="font-semibold text-lg">{labels.budgetLines} ({budgetLines.length})</h3>
 {canEdit && (
 <Button size="sm" onClick={() => setShowAddLineDialog(true)}>
 <Plus className="w-4 h-4 me-2" />
 {labels.addLine}
 </Button>
 )}
 </div>
 {budgetLines.length === 0 ? (
 <div className="text-center py-12 text-muted-foreground">
 <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
 <p>{labels.noLines}</p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="text-start w-12">#</TableHead>
 <TableHead className="text-start max-w-xs">{labels.description}</TableHead>
 <TableHead className="text-start whitespace-nowrap">{labels.unitCost}</TableHead>
 <TableHead className="text-start whitespace-nowrap">{labels.qty}</TableHead>
 <TableHead className="text-start whitespace-nowrap">{labels.duration}</TableHead>
 <TableHead className="text-start whitespace-nowrap">{labels.total}</TableHead>
 {canEdit && <TableHead className="text-center whitespace-nowrap">{labels.actions}</TableHead>}
 </TableRow>
 </TableHeader>
 <TableBody>
 {budgetLines.map((line: any, index: number) => (
 <TableRow key={line.id}>
 <TableCell className="font-mono">{line.lineNumber || index + 1}</TableCell>
 <TableCell className="text-start max-w-xs">
 <div className="break-words whitespace-normal">
 <p className="font-medium break-words">
 {isRTL && line.descriptionAr ? line.descriptionAr : line.description}
 </p>
 <p className="text-xs text-muted-foreground break-words">{line.lineCode}</p>
 </div>
 </TableCell>
 <TableCell className="font-mono">
 {formatCurrency(line.unitCost || 0, budget.currency)}
 </TableCell>
 <TableCell>{line.quantity}</TableCell>
 <TableCell>{line.durationMonths} {labels.month}</TableCell>
 <TableCell className="font-mono font-semibold">
 {formatCurrency(line.totalAmount || 0, budget.currency)}
 </TableCell>
 {canEdit && (
 <TableCell className="text-end">
 <Button
 variant="ghost"
 size="icon"
 onClick={() => {
 if (confirm(t.financeModule.areYouSureYouWantTo13)) {
 deleteLineMutation.mutate({ lineId: line.id, organizationId: orgId });
 }
 }}
 >
 <Trash2 className="w-4 h-4 text-destructive" />
 </Button>
 </TableCell>
 )}
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>
 )}
 </CardContent>
 </Card>
 </TabsContent>

 {/* Monthly Allocations Tab */}
 <TabsContent value="allocations" className="mt-4">
 <Card>
 <CardContent className="pt-6">
 <MonthlyAllocationGrid
 budgetId={budgetId}
 budgetLines={budgetLines}
 fiscalYear={budget.fiscalYear}
 currency={budget.currency}
 isRTL={isRTL}
 canEdit={canEdit}
 onRefresh={() => { refetch(); refetchLines(); }}
 />
 </CardContent>
 </Card>
 </TabsContent>

 {/* Variance Analysis Tab */}
 <TabsContent value="variance" className="mt-4">
 <Card>
 <CardContent className="pt-6">
 <VarianceAnalysisTab
 budgetId={budgetId}
 organizationId={orgId}
 fiscalYear={budget.fiscalYear}
 currency={budget.currency}
 isRTL={isRTL}
 />
 </CardContent>
 </Card>
 </TabsContent>

 {/* Evidence Documents Tab */}
 <TabsContent value="evidence" className="mt-4">
 <EvidencePanel entityType="Budget" entityId={budget.id} />
 </TabsContent>

 {/* Version History Tab */}
 <TabsContent value="history" className="mt-4">
 <Card>
 <CardContent className="pt-6">
 <div className="space-y-4">
 <div className="flex items-center gap-4 p-4 border rounded-lg">
 <Badge variant="secondary">v{budget.versionNumber}</Badge>
 <div className="flex-1 text-start">
 <p className="font-medium">
 {budget.versionNumber === 1 ? labels.originalVersion : labels.revision}
 </p>
 <p className="text-sm text-muted-foreground">
 {labels.created}: {formatDate(budget.createdAt)}
 </p>
 {budget.revisionNotes && (
 <p className="text-sm mt-1">{budget.revisionNotes}</p>
 )}
 </div>
 {renderStatusBadge(budget.status, isRTL)}
 </div>
 </div>
 </CardContent>
 </Card>
 </TabsContent>
 </Tabs>

 {/* Add Line Dialog */}
 {showAddLineDialog && budget && (
 <AddBudgetLineDialog
 open={showAddLineDialog}
 onOpenChange={setShowAddLineDialog}
 budgetId={budgetId}
 projectId={budget.projectId}
 organizationId={orgId}
 operatingUnitId={opUnitId}
 currency={budget.currency}
 isRTL={isRTL}
 budgetCategories={budgetCategories}
 onSuccess={() => {
 refetchLines();
 refetch();
 setShowAddLineDialog(false);
 }}
 />
 )}
 </div>
 </div>
 );
}

// ============================================================================
// ADD BUDGET LINE DIALOG COMPONENT
// ============================================================================

interface AddBudgetLineDialogProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 budgetId: number;
 projectId: number;
 organizationId: number;
 operatingUnitId?: number;
 currency: string;
 isRTL: boolean;
 budgetCategories: any[];
 onSuccess: () => void;
}

function AddBudgetLineDialog({
 open,
 onOpenChange,
 budgetId,
 projectId,
 organizationId,
 operatingUnitId,
 currency,
 isRTL,
 budgetCategories,
 onSuccess,
}: AddBudgetLineDialogProps) {
  const { t } = useTranslation();
 const [formData, setFormData] = useState({
 lineCode: "",
 description: "",
 descriptionAr: "",
 categoryId: "",
 unitType: "item" as "staff" | "item" | "service" | "lump_sum",
 unitCost: 0,
 quantity: 1,
 durationMonths: 1,
 donorEligibilityPercentage: 100,
 justification: "",
 notes: "",
 });

 const createLineMutation = trpc.budgetLines.create.useMutation({
 onSuccess: () => {
 toast.success(t.financeModule.lineAddedSuccessfully);
 onSuccess();
 setFormData({
 lineCode: "",
 description: "",
 descriptionAr: "",
 categoryId: "",
 unitType: "item",
 unitCost: 0,
 quantity: 1,
 durationMonths: 1,
 donorEligibilityPercentage: 100,
 justification: "",
 notes: "",
 });
 },
 onError: (error) => {
 toast.error(`${t.financeModule.failedToAdd}: ${error.message}`);
 },
 });

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!formData.lineCode || !formData.description) {
 toast.error(t.financeModule.pleaseFillAllRequiredFields);
 return;
 }
 createLineMutation.mutate({
 budgetId,
 projectId,
 organizationId,
 operatingUnitId,
 lineCode: formData.lineCode,
 description: formData.description,
 descriptionAr: formData.descriptionAr || undefined,
 categoryId: formData.categoryId ? parseInt(formData.categoryId) : undefined,
 unitType: formData.unitType,
 unitCost: formData.unitCost,
 quantity: formData.quantity,
 durationMonths: formData.durationMonths,
 donorEligibilityPercentage: formData.donorEligibilityPercentage,
 justification: formData.justification || undefined,
 notes: formData.notes || undefined,
 });
 };

 const calculatedTotal = formData.unitCost * formData.quantity * formData.durationMonths;
 const donorEligibleAmount = (calculatedTotal * formData.donorEligibilityPercentage) / 100;

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="max-w-2xl">
 <DialogHeader>
 <DialogTitle>{t.financeModule.addBudgetLine}</DialogTitle>
 <DialogDescription>
 {'Add a new line to the budget with auto-calculation'}
 </DialogDescription>
 </DialogHeader>
 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.financeModule.lineCode} *</Label>
 <Input
 value={formData.lineCode}
 onChange={(e) => setFormData({ ...formData, lineCode: e.target.value })}
 placeholder={t.placeholders.eG111}
 />
 </div>
 <div>
 <Label>{t.financeModule.category}</Label>
 <Select
 value={formData.categoryId}
 onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
 >
 <SelectTrigger>
 <SelectValue placeholder={t.financeModule.selectCategory14} />
 </SelectTrigger>
 <SelectContent>
 {budgetCategories.map((cat: any) => (
 <SelectItem key={cat.id} value={cat.id.toString()}>
 {cat.code} - {isRTL && cat.nameAr ? cat.nameAr : cat.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>
 <div>
 <Label>{t.financeModule.description} *</Label>
 <Input
 value={formData.description}
 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
 placeholder={t.placeholders.eGProjectManagerSalary}
 />
 </div>
 {/* Cost Calculation Section */}
 <Card className="bg-muted/50">
 <CardContent className="pt-4">
 <h4 className="font-semibold mb-4">
 {t.financeModule.costCalculation}
 </h4>
 <div className="grid grid-cols-4 gap-4">
 <div>
 <Label>{t.financeModule.unitType}</Label>
 <Select
 value={formData.unitType}
 onValueChange={(value: any) => setFormData({ ...formData, unitType: value })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="staff">{t.financeModule.staff}</SelectItem>
 <SelectItem value="item">{t.financeModule.item}</SelectItem>
 <SelectItem value="service">{t.financeModule.service}</SelectItem>
 <SelectItem value="lump_sum">{t.financeModule.lumpSum}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div>
 <Label>{t.financeModule.unitCost}</Label>
 <Input
 type="number"
 step="0.01"
 min="0"
 value={formData.unitCost}
 onChange={(e) => setFormData({ ...formData, unitCost: parseFloat(e.target.value) || 0 })}
 />
 </div>
 <div>
 <Label>{t.financeModule.quantity}</Label>
 <Input
 type="number"
 step="0.01"
 min="0"
 value={formData.quantity}
 onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 1 })}
 />
 </div>
 <div>
 <Label>{t.financeModule.durationMonths}</Label>
 <Input
 type="number"
 min="1"
 max="60"
 value={formData.durationMonths}
 onChange={(e) => setFormData({ ...formData, durationMonths: parseInt(e.target.value) || 1 })}
 />
 </div>
 </div>
 <div className="mt-4 p-3 bg-background rounded-lg border">
 <div className="flex items-center justify-between">
 <span className="text-sm text-muted-foreground">
 {formData.unitCost.toLocaleString()} × {formData.quantity} × {formData.durationMonths} =
 </span>
 <span className="text-xl font-bold text-primary">
 {formatCurrency(calculatedTotal, currency)}
 </span>
 </div>
 </div>
 </CardContent>
 </Card>
 {/* Donor Eligibility */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.financeModule.donorEligibility}</Label>
 <Input
 type="number"
 min="0"
 max="100"
 value={formData.donorEligibilityPercentage}
 onChange={(e) => setFormData({ ...formData, donorEligibilityPercentage: parseFloat(e.target.value) || 100 })}
 />
 </div>
 <div>
 <Label>{t.financeModule.donorEligibleAmount}</Label>
 <Input
 value={formatCurrency(donorEligibleAmount, currency)}
 disabled
 className="bg-muted"
 />
 </div>
 </div>
 {/* Justification */}
 <div>
 <Label>{t.financeModule.justification}</Label>
 <Textarea
 value={formData.justification}
 onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
 placeholder={t.financeModule.reasonForIncludingThisLine}
 rows={2}
 className="text-start"
 />
 </div>
 <DialogFooter>
 <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
 {t.financeModule.cancel}
 </Button>
 <Button type="submit" disabled={createLineMutation.isPending}>
 {createLineMutation.isPending ? (
 <Loader2 className="w-4 h-4 animate-spin me-2" />
 ) : (
 <Plus className="w-4 h-4 me-2" />
 )}
 {t.financeModule.addLine15}
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>
 );
}

// ============================================================================
// MONTHLY ALLOCATION GRID COMPONENT
// ============================================================================

interface MonthlyAllocationGridProps {
 budgetId: number;
 budgetLines: any[];
 fiscalYear: string;
 currency: string;
 isRTL: boolean;
 canEdit: boolean;
 onRefresh: () => void;
}

function MonthlyAllocationGrid({
 budgetId,
 budgetLines,
 fiscalYear,
 currency,
 isRTL,
 canEdit,
 onRefresh,
}: MonthlyAllocationGridProps) {
  const { t } = useTranslation();
 const [editingCell, setEditingCell] = useState<{ lineId: number; month: number } | null>(null);
 const [editValue, setEditValue] = useState<string>("");

 const months = isRTL
 ? ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]
 : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

 const { data: allocations = [], refetch: refetchAllocations } = trpc.budgetMonthlyAllocations.listByBudget.useQuery(
 { budgetId },
 { enabled: budgetId > 0 }
 );

 const bulkUpsertMutation = trpc.budgetMonthlyAllocations.bulkUpsert.useMutation({
 onSuccess: () => {
 toast.success(t.financeModule.monthlyAllocationsSaved);
 refetchAllocations();
 onRefresh();
 },
 onError: (error) => {
 toast.error(`${t.financeModule.failedToSave}: ${error.message}`);
 },
 });

 const autoDistributeMutation = trpc.budgetMonthlyAllocations.autoDistribute.useMutation({
 onSuccess: (result) => {
 toast.success(
 `Distributed ${formatCurrency(result.monthlyAmount, currency)} across ${result.monthCount} months`
 );
 refetchAllocations();
 onRefresh();
 },
 onError: (error) => {
 toast.error(`${t.financeModule.failedToDistribute}: ${error.message}`);
 },
 });

 const getAllocation = (lineId: number, monthNumber: number): number => {
 const alloc = allocations.find(
 (a: any) => a.budgetLineId === lineId && a.monthNumber === monthNumber
 );
 return alloc ? parseFloat(alloc.plannedAmount || "0") : 0;
 };

 const getLineTotal = (lineId: number): number => {
 return Array.from({ length: 12 }, (_, i) => getAllocation(lineId, i + 1))
 .reduce((sum, val) => sum + val, 0);
 };

 const getMonthTotal = (monthNumber: number): number => {
 return budgetLines.reduce((sum, line) => sum + getAllocation(line.id, monthNumber), 0);
 };

 const getQuarterTotal = (quarter: number): number => {
 const startMonth = (quarter - 1) * 3 + 1;
 return [startMonth, startMonth + 1, startMonth + 2]
 .reduce((sum, month) => sum + getMonthTotal(month), 0);
 };

 const getGrandTotal = (): number => {
 return Array.from({ length: 12 }, (_, i) => getMonthTotal(i + 1))
 .reduce((sum, val) => sum + val, 0);
 };

 const handleCellClick = (lineId: number, month: number) => {
 if (!canEdit) return;
 setEditingCell({ lineId, month });
 setEditValue(getAllocation(lineId, month).toString());
 };

 const handleCellSave = () => {
 if (!editingCell) return;
 const value = parseFloat(editValue) || 0;
 bulkUpsertMutation.mutate({
 budgetId,
 allocations: [{
 budgetLineId: editingCell.lineId,
 monthNumber: editingCell.month,
 fiscalYear,
 plannedAmount: value,
 }],
 });
 setEditingCell(null);
 setEditValue("");
 };

 const handleAutoDistribute = (lineId: number) => {
 autoDistributeMutation.mutate({
 budgetLineId: lineId,
 budgetId,
 fiscalYear,
 startMonth: 1,
 endMonth: 12,
 });
 };

 if (budgetLines.length === 0) {
 return (
 <div className="text-center py-8 text-muted-foreground">
 <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
 <p>{t.financeModule.addBudgetLinesFirstToDistribute}</p>
 </div>
 );
 }

 return (
 <div className="space-y-4">
 {/* Quarter Summary Cards */}
 <div className="grid grid-cols-5 gap-4">
 {[1, 2, 3, 4].map((quarter) => (
 <Card key={quarter}>
 <CardContent className="pt-4">
 <p className="text-xs text-muted-foreground">
 {`Q${quarter}`}
 </p>
 <p className="text-lg font-bold">
 {formatCurrency(getQuarterTotal(quarter), currency)}
 </p>
 </CardContent>
 </Card>
 ))}
 <Card className="bg-primary/5">
 <CardContent className="pt-4">
 <p className="text-xs text-muted-foreground">
 {t.financeModule.annualTotal}
 </p>
 <p className="text-lg font-bold text-primary">
 {formatCurrency(getGrandTotal(), currency)}
 </p>
 </CardContent>
 </Card>
 </div>

 {/* Allocation Grid */}
 <div className="overflow-x-auto border rounded-lg">
 <Table>
 <TableHeader>
 <TableRow className="bg-muted/50">
 <TableHead className="sticky start-0 bg-muted/50 min-w-[200px] text-start">
 {t.financeModule.budgetLine}
 </TableHead>
 {months.map((month, i) => (
 <TableHead key={i} className="text-center min-w-[80px]">
 {month}
 </TableHead>
 ))}
 <TableHead className="text-center min-w-[100px] bg-muted/30">
 {t.financeModule.total}
 </TableHead>
 {canEdit && (
 <TableHead className="text-center min-w-[80px]">
 {t.financeModule.actions16}
 </TableHead>
 )}
 </TableRow>
 </TableHeader>
 <TableBody>
 {budgetLines.map((line: any) => {
 const lineTotal = getLineTotal(line.id);
 const budgetedAmount = parseFloat(line.totalAmount || "0");
 const variance = budgetedAmount - lineTotal;

 return (
 <TableRow key={line.id} className="hover:bg-muted/30">
 <TableCell className="sticky start-0 bg-background font-medium text-start">
 <div>
 <p className="text-sm">
 {isRTL && line.descriptionAr ? line.descriptionAr : line.description}
 </p>
 <p className="text-xs text-muted-foreground">
 {t.financeModule.budget}: {formatCurrency(budgetedAmount, currency)}
 {variance !== 0 && (
 <span className={variance > 0 ? "text-amber-600 ms-2" : "text-green-600 ms-2"}>
 ({variance > 0 ? "+" : ""}{formatCurrency(variance, currency)} {t.financeModule.remaining17})
 </span>
 )}
 </p>
 </div>
 </TableCell>
 {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
 const value = getAllocation(line.id, month);
 const isEditing = editingCell?.lineId === line.id && editingCell?.month === month;

 return (
 <TableCell
 key={month}
 className={`text-center p-1 ${canEdit ? 'cursor-pointer hover:bg-primary/10' : ''}`}
 onClick={() => handleCellClick(line.id, month)}
 >
 {isEditing ? (
 <Input
 type="number"
 value={editValue}
 onChange={(e) => setEditValue(e.target.value)}
 onBlur={handleCellSave}
 onKeyDown={(e) => {
 if (e.key === "Enter") handleCellSave();
 if (e.key === "Escape") {
 setEditingCell(null);
 setEditValue("");
 }
 }}
 className="h-8 w-20 text-center text-sm"
 autoFocus
 />
 ) : (
 <span className={`text-sm ${value > 0 ? 'font-medium' : 'text-muted-foreground'}`}>
 {value > 0 ? value.toLocaleString() : "-"}
 </span>
 )}
 </TableCell>
 );
 })}
 <TableCell className="text-center font-semibold bg-muted/30">
 {formatCurrency(lineTotal, currency)}
 </TableCell>
 {canEdit && (
 <TableCell className="text-center">
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleAutoDistribute(line.id)}
 disabled={autoDistributeMutation.isPending}
 title={t.financeModule.autodistribute}
 >
 <Sparkles className="w-4 h-4" />
 </Button>
 </TableCell>
 )}
 </TableRow>
 );
 })}

 {/* Monthly Totals Row */}
 <TableRow className="bg-muted/50 font-semibold">
 <TableCell className="sticky start-0 bg-muted/50 text-start">
 {t.financeModule.monthlyTotal}
 </TableCell>
 {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
 <TableCell key={month} className="text-center">
 {formatCurrency(getMonthTotal(month), currency)}
 </TableCell>
 ))}
 <TableCell className="text-center bg-primary/10 text-primary">
 {formatCurrency(getGrandTotal(), currency)}
 </TableCell>
 {canEdit && <TableCell />}
 </TableRow>
 </TableBody>
 </Table>
 </div>

 {/* Legend */}
 <div className="flex items-center gap-4 text-sm text-muted-foreground">
 <span>{t.financeModule.clickAnyCellToEdit}</span>
 <span>•</span>
 <span>{t.financeModule.useAutodistributeToEvenlySpreadThe}</span>
 </div>
 </div>
 );
}

// ============================================================================
// VARIANCE ANALYSIS TAB COMPONENT
// ============================================================================

interface VarianceAnalysisTabProps {
 budgetId: number;
 organizationId: number;
 fiscalYear: string;
 currency: string;
 isRTL: boolean;
}

function VarianceAnalysisTab({
 budgetId,
 organizationId,
 fiscalYear,
 currency,
 isRTL,
}: VarianceAnalysisTabProps) {
  const { t } = useTranslation();
 const [viewMode, setViewMode] = useState<"lines" | "monthly">("lines");

 const { data: utilization, isLoading: utilizationLoading } = trpc.budgetExpenditure.getBudgetUtilization.useQuery(
 { budgetId, organizationId },
 { enabled: budgetId > 0 }
 );

 const { data: lineVariance, isLoading: lineVarianceLoading } = trpc.budgetExpenditure.getLineVarianceAnalysis.useQuery(
 { budgetId, organizationId },
 { enabled: budgetId > 0 && viewMode === "lines" }
 );

 const { data: monthlyVariance, isLoading: monthlyVarianceLoading } = trpc.budgetExpenditure.getMonthlyVarianceAnalysis.useQuery(
 { budgetId, organizationId, fiscalYear },
 { enabled: budgetId > 0 && viewMode === "monthly" }
 );

 const { data: alerts } = trpc.budgetExpenditure.getVarianceAlerts.useQuery(
 { budgetId, organizationId, thresholdPercent: 90 },
 { enabled: budgetId > 0 }
 );

 const isLoading = utilizationLoading || (viewMode === "lines" ? lineVarianceLoading : monthlyVarianceLoading);

 const getStatusColor = (status: string) => {
 switch (status) {
 case "over_budget": return "text-red-600 bg-red-50";
 case "warning": return "text-amber-600 bg-amber-50";
 default: return "text-green-600 bg-green-50";
 }
 };

 const getProgressColor = (rate: number) => {
 if (rate > 100) return "bg-red-500";
 if (rate > 90) return "bg-amber-500";
 return "bg-green-500";
 };

 if (isLoading) {
 return (
 <div className="flex items-center justify-center py-12">
 <Loader2 className="w-8 h-8 animate-spin text-primary" />
 </div>
 );
 }

 return (
 <div className="space-y-6">
 {/* Alerts Banner */}
 {alerts && alerts.alertCount > 0 && (
 <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
 <div className="flex items-center gap-3">
 <AlertTriangle className="w-5 h-5 text-amber-600" />
 <div className="text-start">
 <p className="font-medium text-amber-800">
 {`${alerts.alertCount} lines exceeded warning threshold`}
 </p>
 <p className="text-sm text-amber-700">
 {'Some budget lines have exceeded 90% of allocated amount'}
 </p>
 </div>
 </div>
 </div>
 )}

 {/* Utilization Summary */}
 {utilization && (
 <div className="grid grid-cols-3 gap-4">
 <Card>
 <CardContent className="pt-4">
 <p className="text-xs text-muted-foreground">{t.financeModule.totalBudget11}</p>
 <p className="text-lg font-bold">{formatCurrency(utilization.totalBudget, currency)}</p>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-4">
 <p className="text-xs text-muted-foreground">{t.financeModule.totalExpenditure}</p>
 <p className="text-lg font-bold">{formatCurrency(utilization.totalExpenditure, currency)}</p>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-4">
 <p className="text-xs text-muted-foreground">{t.financeModule.utilizationRate18}</p>
 <p className="text-lg font-bold">{utilization.utilizationRate?.toFixed(1) || '0.0'}%</p>
 </CardContent>
 </Card>
 </div>
 )}

 {/* View Mode Toggle */}
 <div className="flex gap-2">
 <Button
 variant={viewMode === "lines" ? "default" : "outline"}
 size="sm"
 onClick={() => setViewMode("lines")}
 >
 {t.financeModule.byLines}
 </Button>
 <Button
 variant={viewMode === "monthly" ? "default" : "outline"}
 size="sm"
 onClick={() => setViewMode("monthly")}
 >
 {t.financeModule.byMonth}
 </Button>
 </div>

 {/* Line-level Variance */}
 {viewMode === "lines" && lineVariance && (
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="text-start">{t.financeModule.line}</TableHead>
 <TableHead className="text-end">{t.financeModule.budgeted}</TableHead>
 <TableHead className="text-end">{t.financeModule.actual}</TableHead>
 <TableHead className="text-end">{t.financeModule.variance}</TableHead>
 <TableHead className="text-center">{t.financeModule.utilization19}</TableHead>
 <TableHead className="text-center">{t.financeModule.status}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {lineVariance.lines?.map((line: any) => (
 <TableRow key={line.lineId}>
 <TableCell className="text-start">
 <div>
 <p className="font-medium">{isRTL && line.descriptionAr ? line.descriptionAr : line.description}</p>
 <p className="text-xs text-muted-foreground">{line.lineCode}</p>
 </div>
 </TableCell>
 <TableCell className="font-mono text-end">
 {formatCurrency(line.budgeted, currency)}
 </TableCell>
 <TableCell className="font-mono text-end">
 {formatCurrency(line.actual, currency)}
 </TableCell>
 <TableCell className={`font-mono text-end ${line.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
 {line.variance >= 0 ? '+' : ''}{formatCurrency(line.variance, currency)}
 </TableCell>
 <TableCell className="text-center">
 <div className="flex items-center gap-2 justify-center">
 <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
 <div
 className={`h-full ${getProgressColor(line.utilizationRate)}`}
 style={{ width: `${Math.min(line.utilizationRate, 100)}%` }}
 />
 </div>
 <span className="text-xs font-mono">{line.utilizationRate.toFixed(0)}%</span>
 </div>
 </TableCell>
 <TableCell className="text-center">
 <Badge variant="outline" className={getStatusColor(line.status)}>
 {line.status === "over_budget"
 ? (t.financeModule.over)
 : line.status === "warning"
 ? (t.financeModule.warning)
 : (t.financeModule.ok)}
 </Badge>
 </TableCell>
 </TableRow>
 ))}
 {/* Totals Row */}
 {lineVariance.totals && (
 <TableRow className="bg-muted/50 font-semibold">
 <TableCell className="text-start">{t.financeModule.total20}</TableCell>
 <TableCell className="font-mono text-end">
 {formatCurrency(lineVariance.totals.budgeted, currency)}
 </TableCell>
 <TableCell className="font-mono text-end">
 {formatCurrency(lineVariance.totals.actual, currency)}
 </TableCell>
 <TableCell className={`font-mono text-end ${lineVariance.totals.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
 {lineVariance.totals.variance >= 0 ? '+' : ''}{formatCurrency(lineVariance.totals.variance, currency)}
 </TableCell>
 <TableCell className="text-center">
 <span className="font-mono">{lineVariance.totals.utilizationRate.toFixed(1)}%</span>
 </TableCell>
 <TableCell />
 </TableRow>
 )}
 </TableBody>
 </Table>
 )}

 {/* Monthly Variance */}
 {viewMode === "monthly" && monthlyVariance && (
 <div className="space-y-4">
 {/* Quarterly Summary */}
 <div className="grid grid-cols-4 gap-4">
 {monthlyVariance.quarterly?.map((q: any) => (
 <Card key={q.quarter}>
 <CardContent className="pt-4">
 <p className="text-xs text-muted-foreground">
 {`Q${q.quarter}`}
 </p>
 <div className="space-y-1">
 <div className="flex justify-between text-sm">
 <span className="text-muted-foreground">{t.financeModule.planned}</span>
 <span className="font-mono">{formatCurrency(q.planned, currency)}</span>
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-muted-foreground">{t.financeModule.actual21}</span>
 <span className="font-mono">{formatCurrency(q.actual, currency)}</span>
 </div>
 <div className={`flex justify-between text-sm font-medium ${q.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
 <span>{t.financeModule.variance22}</span>
 <span className="font-mono">{q.variance >= 0 ? '+' : ''}{formatCurrency(q.variance, currency)}</span>
 </div>
 </div>
 </CardContent>
 </Card>
 ))}
 </div>

 {/* Monthly Table */}
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="text-start">{t.financeModule.month}</TableHead>
 <TableHead className="text-end">{t.financeModule.planned23}</TableHead>
 <TableHead className="text-end">{t.financeModule.actual}</TableHead>
 <TableHead className="text-end">{t.financeModule.variance}</TableHead>
 <TableHead className="text-center">{t.financeModule.utilization19}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {monthlyVariance.monthly?.map((m: any) => {
 const monthNames = isRTL
 ? ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]
 : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

 return (
 <TableRow key={m.month}>
 <TableCell className="text-start">{monthNames[m.month - 1]}</TableCell>
 <TableCell className="font-mono text-end">{formatCurrency(m.planned, currency)}</TableCell>
 <TableCell className="font-mono text-end">{formatCurrency(m.actual, currency)}</TableCell>
 <TableCell className={`font-mono text-end ${m.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
 {m.variance >= 0 ? '+' : ''}{formatCurrency(m.variance, currency)}
 </TableCell>
 <TableCell className="text-center">
 <div className="flex items-center gap-2 justify-center">
 <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
 <div
 className={`h-full ${getProgressColor(m.utilizationRate)}`}
 style={{ width: `${Math.min(m.utilizationRate, 100)}%` }}
 />
 </div>
 <span className="text-xs font-mono">{m.utilizationRate.toFixed(0)}%</span>
 </div>
 </TableCell>
 </TableRow>
 );
 })}
 {/* Annual Totals */}
 {monthlyVariance.annual && (
 <TableRow className="bg-muted/50 font-semibold">
 <TableCell className="text-start">{t.financeModule.annualTotal}</TableCell>
 <TableCell className="font-mono text-end">{formatCurrency(monthlyVariance.annual.planned, currency)}</TableCell>
 <TableCell className="font-mono text-end">{formatCurrency(monthlyVariance.annual.actual, currency)}</TableCell>
 <TableCell className={`font-mono text-end ${monthlyVariance.annual.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
 {monthlyVariance.annual.variance >= 0 ? '+' : ''}{formatCurrency(monthlyVariance.annual.variance, currency)}
 </TableCell>
 <TableCell className="text-center">
 <span className="font-mono">{monthlyVariance.annual.utilizationRate.toFixed(1)}%</span>
 </TableCell>
 </TableRow>
 )}
 </TableBody>
 </Table>
 </div>
 )}
 </div>
 );
}