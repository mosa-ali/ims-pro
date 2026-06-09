/**
 * Finance Budgets Page - Donor-Compliant Budget Management
 * 
 * Features:
 * - Mandatory project selection before viewing/creating budgets
 * - Budget header management with approval workflow
 * - Budget lines with hierarchical categories
 * - Version control and revision history
 * - Monthly allocation tracking
 * - Full bilingual support (Arabic/English) with RTL/LTR
 * 
 * Workflow: Draft → Submitted → Approved → Revised → Closed
 */
import { useState, useEffect, useMemo } from"react";
import { useLanguage } from"@/contexts/LanguageContext";
import { useOrganization } from"@/contexts/OrganizationContext";
import { useOperatingUnit } from"@/contexts/OperatingUnitContext";
import { useNavigate } from"@/lib/router-compat";
import { trpc } from"@/lib/trpc";
import { GLOBAL_CURRENCIES } from"@shared/const";
import { Button } from"@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from"@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from"@/components/ui/dialog";
import { Input } from"@/components/ui/input";
import { Label } from"@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select";
import { Textarea } from"@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from"@/components/ui/table";
import { Badge } from"@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from"@/components/ui/tabs";
import { toast } from"sonner";
import { 
 ArrowLeft, ArrowRight, Plus, Edit, Trash2, Download, Upload, 
 Clock, CheckCircle, XCircle, Send, FileText, History, 
 AlertTriangle, Filter, Search, Eye, Copy, DollarSign,
 Calendar, Building2, FolderOpen, ChevronRight, MoreHorizontal,
 RefreshCw, Loader2, Sparkles
} from"lucide-react";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuSeparator,
 DropdownMenuTrigger,
} from"@/components/ui/dropdown-menu";
import {
 AlertDialog,
 AlertDialogAction,
 AlertDialogCancel,
 AlertDialogContent,
 AlertDialogDescription,
 AlertDialogFooter,
 AlertDialogHeader,
 AlertDialogTitle,
} from"@/components/ui/alert-dialog";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

// Budget status configuration
const STATUS_CONFIG = {
 draft: { 
 color:"bg-gray-100 text-gray-800 border-gray-300", 
 icon: Clock, 
 labelEn:"Draft", 
 labelAr:"مسودة" 
 },
 submitted: { 
 color:"bg-blue-100 text-blue-800 border-blue-300", 
 icon: Send, 
 labelEn:"Submitted", 
 labelAr:"مقدم" 
 },
 approved: { 
 color:"bg-green-100 text-green-800 border-green-300", 
 icon: CheckCircle, 
 labelEn:"Approved", 
 labelAr:"معتمد" 
 },
 rejected: { 
 color:"bg-red-100 text-red-800 border-red-300", 
 icon: XCircle, 
 labelEn:"Rejected", 
 labelAr:"مرفوض" 
 },
 revised: { 
 color:"bg-yellow-100 text-yellow-800 border-yellow-300", 
 icon: Edit, 
 labelEn:"Revised", 
 labelAr:"معدل" 
 },
 closed: { 
 color:"bg-purple-100 text-purple-800 border-purple-300", 
 icon: FileText, 
 labelEn:"Closed", 
 labelAr:"مغلق" 
 },
};

// Currency options - using global currency list
const CURRENCIES = GLOBAL_CURRENCIES.map(curr => ({
 value: curr.code,
 label: `${curr.code} - ${curr.name}`,
 labelAr: curr.name // TODO: Add Arabic translations for all currencies
}));

// Currency name lookup helper
function getCurrencyLabel(code: string, isRTL: boolean): string {
 const currency = GLOBAL_CURRENCIES.find(c => c.code === code);
 return currency ? `${code} - ${currency.name}` : code;
}

// Helper to extract numeric ID from prefixed string IDs
function extractNumericId(id: string | number | undefined): number | undefined {
 if (id === undefined || id === null) return undefined;
 if (typeof id === 'number') return id;
 const match = id.toString().match(/\d+/);
 return match ? parseInt(match[0], 10) : undefined;
}

// Format currency
function formatCurrency(amount: number | string, currency: string ="USD"): string {
 const num = typeof amount ==="string" ? parseFloat(amount) : amount;
 return new Intl.NumberFormat("en-US", {
 style:"currency",
 currency,
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 }).format(num || 0);
}

// Format date
function formatDate(date: string | Date | null): string {
 if (!date) return"-";
 const d = new Date(date);
 return d.toLocaleDateString("en-US", { year:"numeric", month:"short", day:"numeric" });
}

export default function FinanceBudgets() {
const { language, isRTL} = useLanguage();
 const { t } = useTranslation();
 const { currentOrganizationId } = useOrganization();
 const { currentOperatingUnitId } = useOperatingUnit();
 const navigate = useNavigate();
 
 const orgId = extractNumericId(currentOrganizationId) || 0;
 const opUnitId = extractNumericId(currentOperatingUnitId);

 // State
 const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
 const [selectedGrantId, setSelectedGrantId] = useState<number | null>(null);
 const [statusFilter, setStatusFilter] = useState<string>("all");
 const [fiscalYearFilter, setFiscalYearFilter] = useState<string>("all");
 const [searchQuery, setSearchQuery] = useState("");
 const [showCreateDialog, setShowCreateDialog] = useState(false);
 const [showBudgetDetail, setShowBudgetDetail] = useState(false);
 const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null);
 const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
 const [budgetToDelete, setBudgetToDelete] = useState<number | null>(null);
 const [showRejectDialog, setShowRejectDialog] = useState(false);
 const [budgetToReject, setBudgetToReject] = useState<number | null>(null);
 const [rejectionReason, setRejectionReason] = useState("");
 const [showRevisionDialog, setShowRevisionDialog] = useState(false);
 const [budgetToRevise, setBudgetToRevise] = useState<number | null>(null);
 const [revisionNotes, setRevisionNotes] = useState("");
 const [showExportDialog, setShowExportDialog] = useState(false);
 const [exportBudgetId, setExportBudgetId] = useState<number | null>(null);
 const [exportFormat, setExportFormat] = useState<string>("EU");
 const [showUpdateDialog, setShowUpdateDialog] = useState(false);
 const [selectedBudgetForUpdate, setSelectedBudgetForUpdate] = useState<any>(null);
 const [updateFormData, setUpdateFormData] = useState({ currency: "", exchangeRate: "", notes: "", notesAr: "" });

 // Translations
 const pageT = {
 title: t.financeModule.budgets,
 subtitle: t.financeModule.budgetsSubtitle,
 backToFinance: t.financeModule.backToFinance,
 selectProject: t.financeModule.selectProject,
 selectProjectFirst: t.financeModule.pleaseSelectAProjectFirstTo,
 allProjects: t.financeModule.allProjects,
 newBudget: t.financeModule.newBudget,
 budgetCode: t.financeModule.budgetCode,
 budgetTitle: t.financeModule.budgetTitle,
 fiscalYear: t.financeModule.fiscalYear,
 period: t.financeModule.period,
 totalBudget: t.financeModule.totalBudget11,
 status: t.financeModule.status,
 version: t.financeModule.version,
 actions: t.financeModule.actions,
 noBudgets: t.financeModule.noBudgetsFound,
 noBudgetsDesc: isRTL 
 ?"لم يتم إنشاء أي ميزانيات لهذا المشروع بعد. انقر على 'ميزانية جديدة' للبدء." 
 :"No budgets have been created for this project yet. Click 'New Budget' to get started.",
 createBudget: t.financeModule.createBudget,
 editBudget: t.financeModule.editBudget,
 deleteBudget: t.financeModule.deleteBudget,
 viewDetails: t.financeModule.viewDetails,
 submitForApproval: t.financeModule.submitForApproval,
 approve: t.financeModule.approve,
 reject: t.financeModule.reject,
 createRevision: t.financeModule.createRevision,
 close: t.financeModule.close,
 project: t.financeModule.project12,
 grant: t.financeModule.grant,
 currency: t.financeModule.currency,
 periodStart: t.financeModule.periodStart,
 periodEnd: t.financeModule.periodEnd,
 notes: t.financeModule.notes,
 cancel: t.financeModule.cancel,
 save: t.financeModule.save,
 loading: t.financeModule.loading,
 confirmDelete: t.financeModule.confirmDelete,
 confirmDeleteMsg: 'Are you sure you want to delete this budget? This action cannot be undone.',
 rejectionReason: t.financeModule.rejectionReason,
 revisionNotes: t.financeModule.revisionNotes,
 filterByStatus: t.financeModule.filterByStatus,
 filterByYear: t.financeModule.filterByYear,
 allStatuses: t.financeModule.allStatuses,
 allYears: t.financeModule.allYears,
 search: t.financeModule.search,
 import: t.financeModule.import,
 export: t.financeModule.export,
 actualSpent: t.financeModule.actualSpent,
 remaining: t.financeModule.remaining,
 utilization: t.financeModule.utilization,
 createdAt: t.financeModule.createdAt,
 updatedAt: t.financeModule.lastUpdated,
 submittedAt: t.financeModule.submittedAt,
 approvedAt: t.financeModule.approvedAt,
 budgetLines: t.financeModule.budgetLines,
 monthlyAllocations: t.financeModule.monthlyAllocations,
 versionHistory: t.financeModule.versionHistory,
 };

 // Fetch projects for dropdown (filtered by organization and operating unit)
 const { data: projects = [], isLoading: projectsLoading } = trpc.projects.list.useQuery(
 {},
 { enabled: orgId > 0 }
 );

 // Fetch grants for dropdown (filtered by selected project)
 const { data: grants = [] } = trpc.grants.list.useQuery(
 {projectId: selectedProjectId || undefined},
 { enabled: !!selectedProjectId }
 );

 // Fetch budgets
 const { data: budgets = [], isLoading: budgetsLoading, refetch: refetchBudgets } = trpc.budgets.list.useQuery(
 {
 organizationId: orgId,
 operatingUnitId: opUnitId,
 projectId: selectedProjectId || undefined,
 grantId: selectedGrantId || undefined,
 status: statusFilter !=="all" ? statusFilter as any : undefined,
 fiscalYear: fiscalYearFilter !=="all" ? fiscalYearFilter : undefined,
 },
 { enabled: orgId > 0 }
 );

 // Fetch budget categories
 const { data: budgetCategories = [] } = trpc.financeSettings.listBudgetCategories.useQuery(
 { organizationId: orgId },
 { enabled: orgId > 0 }
 );

 // Mutations
 const createBudgetMutation = trpc.budgets.create.useMutation({
 onSuccess: () => {
 toast.success(t.financeModule.budgetCreatedSuccessfully);
 refetchBudgets();
 setShowCreateDialog(false);
 },
 onError: (error) => {
 toast.error(`${t.financeModule.failedToCreate}: ${error.message}`);
 },
 });

 const updateBudgetMutation = trpc.budgets.update.useMutation({
 onSuccess: () => {
 toast.success(t.financeModule.budgetUpdatedSuccessfully);
 refetchBudgets();
 setShowUpdateDialog(false);
 setSelectedBudgetForUpdate(null);
 setUpdateFormData({ currency: "", exchangeRate: "", notes: "", notesAr: "" });
 },
 onError: (error) => {
 toast.error(`${t.financeModule.failedToUpdate}: ${error.message}`);
 },
 });

 const deleteBudgetMutation = trpc.budgets.delete.useMutation({
 onSuccess: () => {
 toast.success(t.financeModule.budgetDeletedSuccessfully);
 refetchBudgets();
 setShowDeleteConfirm(false);
 setBudgetToDelete(null);
 },
 onError: (error) => {
 toast.error(`${t.financeModule.failedToDelete}: ${error.message}`);
 },
 });

 const submitForApprovalMutation = trpc.budgets.submitForApproval.useMutation({
 onSuccess: () => {
 toast.success(t.financeModule.budgetSubmittedForApproval);
 refetchBudgets();
 },
 onError: (error) => {
 toast.error(`${t.financeModule.failedToSubmit}: ${error.message}`);
 },
 });

 const approveBudgetMutation = trpc.budgets.approve.useMutation({
 onSuccess: () => {
 toast.success(t.financeModule.budgetApproved);
 refetchBudgets();
 },
 onError: (error) => {
 toast.error(`${t.financeModule.failedToApprove}: ${error.message}`);
 },
 });

 const rejectBudgetMutation = trpc.budgets.reject.useMutation({
 onSuccess: () => {
 toast.success(t.financeModule.budgetRejected);
 refetchBudgets();
 setShowRejectDialog(false);
 setBudgetToReject(null);
 setRejectionReason("");
 },
 onError: (error) => {
 toast.error(`${t.financeModule.failedToReject}: ${error.message}`);
 },
 });

 const createRevisionMutation = trpc.budgets.createRevision.useMutation({
 onSuccess: (result) => {
 toast.success(`Revision v${result.versionNumber} created`);
 refetchBudgets();
 setShowRevisionDialog(false);
 setBudgetToRevise(null);
 setRevisionNotes("");
 },
 onError: (error) => {
 toast.error(`${t.financeModule.failedToCreateRevision}: ${error.message}`);
 },
 });

 // Filter budgets by search query
 const filteredBudgets = useMemo(() => {
 if (!searchQuery.trim()) return budgets;
 const query = searchQuery.toLowerCase();
 return budgets.filter((budget: any) =>
 budget.budgetCode?.toLowerCase().includes(query) ||
 budget.budgetTitle?.toLowerCase().includes(query) ||
 budget.budgetTitleAr?.includes(searchQuery) ||
 budget.fiscalYear?.toLowerCase().includes(query)
 );
 }, [budgets, searchQuery]);

 // Get unique fiscal years for filter
 const fiscalYears = useMemo(() => {
 const years = new Set(budgets.map((b: any) => b.fiscalYear).filter(Boolean));
 return Array.from(years).sort().reverse();
 }, [budgets]);

 // Get project name by ID
 const getProjectName = (projectId: number) => {
 const project = projects.find((p: any) => p.id === projectId);
 if (!project) return"-";
 return isRTL && project.titleAr ? project.titleAr : project.title || project.titleEn;
 };

 // Get grant name by ID
 const getGrantName = (grantId: number | null) => {
 if (!grantId) return"-";
 const grant = grants.find((g: any) => g.id === grantId);
 if (!grant) return"-";
 return isRTL && grant.titleAr ? grant.titleAr : grant.title;
 };

 // Render status badge
 const renderStatusBadge = (status: string) => {
 const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft;
 const Icon = config.icon;
 const label = isRTL ? config.labelAr : config.labelEn;
 return (
 <Badge variant="outline" className={`${config.color} border`}>
 <Icon className="h-3 w-3 me-1" />
 {label}
 </Badge>
 );
 };

 // Handle budget actions
 const handleSubmitForApproval = (budgetId: number) => {
 submitForApprovalMutation.mutate({ budgetId, organizationId: orgId });
 };

 const handleApprove = (budgetId: number) => {
 approveBudgetMutation.mutate({ budgetId, organizationId: orgId });
 };

 const handleReject = () => {
 if (!budgetToReject || !rejectionReason.trim()) {
 toast.error(t.financeModule.pleaseEnterRejectionReason);
 return;
 }
 rejectBudgetMutation.mutate({
 budgetId: budgetToReject,
 organizationId: orgId,
 rejectionReason,
 });
 };

 const handleCreateRevision = () => {
 if (!budgetToRevise || !revisionNotes.trim()) {
 toast.error(t.financeModule.pleaseEnterRevisionNotes);
 return;
 }
 createRevisionMutation.mutate({
 budgetId: budgetToRevise,
 organizationId: orgId,
 revisionNotes,
 });
 };

 const handleDelete = () => {
 if (!budgetToDelete) return;
 deleteBudgetMutation.mutate({ budgetId: budgetToDelete, organizationId: orgId });
 };

 return (
 <div className="container mx-auto py-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="space-y-6">
 {/* Page Header */}
 <div className="flex items-center justify-between">
 <div className="text-start">
 <BackButton onClick={() => navigate('/organization/finance')} label={pageT.backToFinance} />
 <h1 className="text-3xl font-bold tracking-tight">{pageT.title}</h1>
 <p className="text-muted-foreground mt-2">{pageT.subtitle}</p>
 </div>
 
 {/* Action Buttons */}
 <div className="flex gap-2">
 <Button 
 variant="outline" 
 className="gap-2"
 onClick={() => toast.info(t.financeModule.importFeatureComingSoon)}
 >
 <Upload className="w-4 h-4" />
 {pageT.import}
 </Button>
 <Button 
 variant="outline" 
 className="gap-2"
 onClick={() => {
 if (filteredBudgets.length > 0) {
 setExportBudgetId(filteredBudgets[0].id);
 setShowExportDialog(true);
 } else {
 toast.info(t.financeModule.noBudgetsToExport);
 }
 }}
 disabled={!selectedProjectId}
 >
 <Download className="w-4 h-4" />
 {pageT.export}
 </Button>
 <Button 
 onClick={() => setShowCreateDialog(true)}
 disabled={!selectedProjectId}
 className="gap-2"
 >
 <Plus className="w-4 h-4" />
 {pageT.newBudget}
 </Button>
 </div>
 </div>

 {/* Filters Section */}
 <Card>
 <CardContent className="pt-6">
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-start">
 {/* Project Filter (MANDATORY) */}
 <div className="lg:col-span-2">
 <Label className="mb-2 block">{pageT.project} *</Label>
 <Select
 value={selectedProjectId?.toString() ||""}
 onValueChange={(value) => {
 setSelectedProjectId(value ? parseInt(value) : null);
 setSelectedGrantId(null); // Reset grant when project changes
 }}
 >
 <SelectTrigger>
 <SelectValue placeholder={pageT.selectProject} />
 </SelectTrigger>
 <SelectContent>
 {projects.map((project: any) => (
 <SelectItem key={project.id} value={project.id.toString()}>
 {isRTL && project.titleAr ? project.titleAr : project.title || project.titleEn}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* Grant Filter (Optional) */}
 <div>
 <Label className="mb-2 block">{pageT.grant}</Label>
 <Select
 value={selectedGrantId?.toString() ||"all"}
 onValueChange={(value) => setSelectedGrantId(value !=="all" ? parseInt(value) : null)}
 disabled={!selectedProjectId}
 >
 <SelectTrigger>
 <SelectValue placeholder={t.financeModule.allGrants} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{t.financeModule.allGrants}</SelectItem>
 {grants.map((grant: any) => (
 <SelectItem key={grant.id} value={grant.id.toString()}>
 {isRTL && grant.titleAr ? grant.titleAr : grant.title}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* Status Filter */}
 <div>
 <Label className="mb-2 block">{pageT.filterByStatus}</Label>
 <Select value={statusFilter} onValueChange={setStatusFilter}>
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{pageT.allStatuses}</SelectItem>
 {Object.entries(STATUS_CONFIG).map(([key, config]) => (
 <SelectItem key={key} value={key}>
 {isRTL ? config.labelAr : config.labelEn}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* Fiscal Year Filter */}
 <div>
 <Label className="mb-2 block">{pageT.filterByYear}</Label>
 <Select value={fiscalYearFilter} onValueChange={setFiscalYearFilter}>
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{pageT.allYears}</SelectItem>
 {fiscalYears.map((year) => (
 <SelectItem key={year} value={year}>
 {year}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>

 {/* Search */}
 <div className="mt-4">
 <div className="relative">
 <Search className="absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground start-3" />
 <Input
 placeholder={pageT.search}
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="ps-10"
 />
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Project Selection Required Message */}
 {!selectedProjectId && (
 <Card className="border-dashed">
 <CardContent className="py-12 text-center">
 <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
 <h3 className="text-lg font-semibold mb-2">
 {pageT.selectProject}
 </h3>
 <p className="text-muted-foreground">
 {pageT.selectProjectFirst}
 </p>
 </CardContent>
 </Card>
 )}

 {/* Budgets Table */}
 {selectedProjectId && (
 <Card>
 <CardHeader>
 <div className="flex items-center justify-between">
 <div className="text-start">
 <CardTitle>{pageT.title}</CardTitle>
 <CardDescription>
 {getProjectName(selectedProjectId)}
 </CardDescription>
 </div>
 <Button 
 variant="outline" 
 size="sm" 
 onClick={() => refetchBudgets()}
 disabled={budgetsLoading}
 >
 <RefreshCw className={`w-4 h-4 ${budgetsLoading ? 'animate-spin' : ''}`} />
 </Button>
 </div>
 </CardHeader>
 <CardContent>
 {budgetsLoading ? (
 <div className="flex items-center justify-center py-12">
 <Loader2 className="w-8 h-8 animate-spin text-primary" />
 </div>
 ) : filteredBudgets.length === 0 ? (
 <div className="text-center py-12">
 <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
 <h3 className="text-lg font-semibold mb-2">{pageT.noBudgets}</h3>
 <p className="text-muted-foreground mb-4">{pageT.noBudgetsDesc}</p>
 <Button onClick={() => setShowCreateDialog(true)}>
 <Plus className="w-4 h-4 me-2" />
 {pageT.newBudget}
 </Button>
 </div>
 ) : (
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="text-start">{pageT.budgetCode}</TableHead>
 <TableHead className="text-start">{pageT.budgetTitle}</TableHead>
 <TableHead className="text-start">{pageT.fiscalYear}</TableHead>
 <TableHead className="text-start">{pageT.period}</TableHead>
 <TableHead className="text-start">{pageT.totalBudget}</TableHead>
 <TableHead className="text-start">{pageT.status}</TableHead>
 <TableHead className="text-start">{pageT.version}</TableHead>
 <TableHead className="text-center">{pageT.actions}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {filteredBudgets.map((budget: any) => (
 <TableRow key={budget.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/organization/finance/budgets/${budget.id}`)}>
 <TableCell className="font-mono text-start">
 {budget.budgetCode}
 </TableCell>
 <TableCell className="text-start">
 {isRTL && budget.budgetTitleAr ? budget.budgetTitleAr : budget.budgetTitle ||"-"}
 </TableCell>
 <TableCell className="text-start">
 {budget.fiscalYear}
 </TableCell>
 <TableCell className="text-start">
 <span className="text-sm">
 {formatDate(budget.periodStart)} - {formatDate(budget.periodEnd)}
 </span>
 </TableCell>
 <TableCell className="font-mono text-start">
 {formatCurrency(budget.totalApprovedAmount || 0, budget.currency)}
 </TableCell>
 <TableCell className="text-start">
 {renderStatusBadge(budget.status)}
 </TableCell>
 <TableCell className="text-start">
 <Badge variant="secondary">v{budget.versionNumber}</Badge>
 </TableCell>
 <TableCell className="text-end">
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
 <MoreHorizontal className="w-4 h-4" />
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align={'end'}>
 <DropdownMenuItem onClick={() => {
 navigate(`/organization/finance/budgets/${budget.id}`);
 }}>
 <Eye className="w-4 h-4 me-2" />
 {pageT.viewDetails}
 </DropdownMenuItem>
 
 {budget.status ==="draft" && (
 <>
 <DropdownMenuItem onClick={(e) => {
 e.stopPropagation();
 setSelectedBudgetForUpdate(budget);
 setShowUpdateDialog(true);
 }}>
 <Edit className="w-4 h-4 me-2" />
 {t.financeModule.update}
 </DropdownMenuItem>
 <DropdownMenuItem onClick={() => handleSubmitForApproval(budget.id)}>
 <Send className="w-4 h-4 me-2" />
 {pageT.submitForApproval}
 </DropdownMenuItem>
 <DropdownMenuSeparator />
 <DropdownMenuItem 
 onClick={() => {
 setBudgetToDelete(budget.id);
 setShowDeleteConfirm(true);
 }}
 className="text-destructive"
 >
 <Trash2 className="w-4 h-4 me-2" />
 {pageT.deleteBudget}
 </DropdownMenuItem>
 </>
 )}
 
 {budget.status ==="submitted" && (
 <>
 <DropdownMenuItem onClick={() => handleApprove(budget.id)}>
 <CheckCircle className="w-4 h-4 me-2" />
 {pageT.approve}
 </DropdownMenuItem>
 <DropdownMenuItem onClick={() => {
 setBudgetToReject(budget.id);
 setShowRejectDialog(true);
 }}>
 <XCircle className="w-4 h-4 me-2" />
 {pageT.reject}
 </DropdownMenuItem>
 </>
 )}
 
 {budget.status ==="approved" && (
 <DropdownMenuItem onClick={() => {
 setBudgetToRevise(budget.id);
 setShowRevisionDialog(true);
 }}>
 <Copy className="w-4 h-4 me-2" />
 {pageT.createRevision}
 </DropdownMenuItem>
 )}
 </DropdownMenuContent>
 </DropdownMenu>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 )}
 </CardContent>
 </Card>
 )}

 {/* Create Budget Dialog */}
 <CreateBudgetDialog
 open={showCreateDialog}
 onOpenChange={setShowCreateDialog}
 projectId={selectedProjectId}
 grants={grants}
 organizationId={orgId}
 operatingUnitId={opUnitId}
 isRTL={isRTL}
 pageT={pageT}
 onSuccess={() => {
 refetchBudgets();
 setShowCreateDialog(false);
 }}
 />

 {/* Budget Detail - now uses dedicated route /organization/finance/budgets/:id */}

 {/* Update Budget Dialog - Full Form */}
 <UpdateBudgetDialog
 open={showUpdateDialog}
 onOpenChange={setShowUpdateDialog}
 budget={selectedBudgetForUpdate}
 projectId={selectedProjectId}
 grants={grants}
 organizationId={orgId}
 operatingUnitId={opUnitId}
 isRTL={isRTL}
 pageT={pageT}
 onSuccess={() => {
 refetchBudgets();
 setShowUpdateDialog(false);
 }}
 />

 {/* Delete Confirmation Dialog */}
 <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
 <AlertDialogContent>
 <AlertDialogHeader>
 <AlertDialogTitle>{pageT.confirmDelete}</AlertDialogTitle>
 <AlertDialogDescription>{pageT.confirmDeleteMsg}</AlertDialogDescription>
 </AlertDialogHeader>
 <AlertDialogFooter>
 <AlertDialogCancel>{pageT.cancel}</AlertDialogCancel>
 <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
 {pageT.deleteBudget}
 </AlertDialogAction>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>

 {/* Reject Dialog */}
 <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>{pageT.reject}</DialogTitle>
 <DialogDescription>
 {t.financeModule.pleaseEnterTheReasonForRejecting}
 </DialogDescription>
 </DialogHeader>
 <div className="space-y-4">
 <div>
 <Label>{pageT.rejectionReason} *</Label>
 <Textarea
 value={rejectionReason}
 onChange={(e) => setRejectionReason(e.target.value)}
 placeholder={t.financeModule.enterRejectionReason}
 rows={4}
 className="text-start"
 />
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
 {pageT.cancel}
 </Button>
 <Button variant="destructive" onClick={handleReject}>
 {pageT.reject}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Revision Dialog */}
 <Dialog open={showRevisionDialog} onOpenChange={setShowRevisionDialog}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>{pageT.createRevision}</DialogTitle>
 <DialogDescription>
 {'A new version of this budget will be created with all lines'}
 </DialogDescription>
 </DialogHeader>
 <div className="space-y-4">
 <div>
 <Label>{pageT.revisionNotes} *</Label>
 <Textarea
 value={revisionNotes}
 onChange={(e) => setRevisionNotes(e.target.value)}
 placeholder={t.financeModule.enterRevisionReason}
 rows={4}
 className="text-start"
 />
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowRevisionDialog(false)}>
 {pageT.cancel}
 </Button>
 <Button onClick={handleCreateRevision}>
 {pageT.createRevision}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Export Dialog */}
 <DonorExportDialog
 open={showExportDialog}
 onOpenChange={setShowExportDialog}
 budgetId={exportBudgetId}
 budgets={filteredBudgets}
 organizationId={orgId}
 isRTL={isRTL}
 />
 </div>
 </div>
 );
}

// ============================================================================
// CREATE BUDGET DIALOG COMPONENT
// ============================================================================
interface CreateBudgetDialogProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 projectId: number | null;
 grants: any[];
 organizationId: number;
 operatingUnitId?: number;
 isRTL: boolean;
 pageT: Record<string, string>;
 onSuccess: () => void;
}

function CreateBudgetDialog({
 open,
 onOpenChange,
 projectId,
 grants,
 organizationId,
 operatingUnitId,
 isRTL,
 pageT,
 onSuccess,
}: CreateBudgetDialogProps) {
  const { t } = useTranslation();
 const [formData, setFormData] = useState({
 grantId:"",
 budgetTitle:"",
 budgetTitleAr:"",
 fiscalYear: new Date().getFullYear().toString(),
 currency:"USD",
 periodStart:"",
 periodEnd:"",
 notes:"",
 notesAr:"",
 });

 const createMutation = trpc.budgets.create.useMutation({
 onSuccess: () => {
 toast.success(t.financeModule.budgetCreatedSuccessfully);
 onSuccess();
 // Reset form
 setFormData({
 grantId:"",
 budgetTitle:"",
 budgetTitleAr:"",
 fiscalYear: new Date().getFullYear().toString(),
 currency:"USD",
 periodStart:"",
 periodEnd:"",
 notes:"",
 notesAr:"",
 });
 },
 onError: (error) => {
 toast.error(`${t.financeModule.failedToCreate}: ${error.message}`);
 },
 });

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 
 if (!projectId) {
 toast.error(t.financeModule.pleaseSelectAProject);
 return;
 }

 if (!formData.fiscalYear || !formData.periodStart || !formData.periodEnd) {
 toast.error(t.financeModule.pleaseFillAllRequiredFields);
 return;
 }

 createMutation.mutate({
 projectId,
 grantId: formData.grantId ? parseInt(formData.grantId) : undefined,
 organizationId,
 operatingUnitId,
 budgetTitle: formData.budgetTitle || undefined,
 budgetTitleAr: formData.budgetTitleAr || undefined,
 fiscalYear: formData.fiscalYear,
 currency: formData.currency,
 periodStart: formData.periodStart,
 periodEnd: formData.periodEnd,
 notes: formData.notes || undefined,
 notesAr: formData.notesAr || undefined,
 });
 };

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="max-w-2xl">
 <DialogHeader>
 <DialogTitle>{pageT.createBudget}</DialogTitle>
 <DialogDescription>
 {'Create a new donor-compliant budget'}
 </DialogDescription>
 </DialogHeader>
 
 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 {/* Grant Selection */}
 <div>
 <Label>{pageT.grant}</Label>
 <Select
 value={formData.grantId}
 onValueChange={(value) => setFormData({ ...formData, grantId: value })}
 >
 <SelectTrigger>
 <SelectValue placeholder={t.financeModule.selectGrantOptional} />
 </SelectTrigger>
 <SelectContent>
 {grants.map((grant: any) => (
 <SelectItem key={grant.id} value={grant.id.toString()}>
 {isRTL && grant.titleAr ? grant.titleAr : grant.title}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* Fiscal Year */}
 <div>
 <Label>{pageT.fiscalYear} *</Label>
 <Select
 value={formData.fiscalYear}
 onValueChange={(value) => setFormData({ ...formData, fiscalYear: value })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {[...Array(5)].map((_, i) => {
 const year = new Date().getFullYear() - 2 + i;
 return (
 <SelectItem key={year} value={year.toString()}>
 {year}
 </SelectItem>
 );
 })}
 </SelectContent>
 </Select>
 </div>
 </div>

 <div>
 {/* Budget Title */}
 <Label>{pageT.budgetTitle}</Label>
 <Input
 value={formData.budgetTitle}
 onChange={(e) => setFormData({ ...formData, budgetTitle: e.target.value })}
 placeholder={t.placeholders.eGAnnualOperatingBudget2024}
 />
 </div>

 <div className="grid grid-cols-3 gap-4">
 {/* Currency */}
 <div>
 <Label>{pageT.currency}</Label>
 <Select
 value={formData.currency}
 onValueChange={(value) => setFormData({ ...formData, currency: value })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {CURRENCIES.map((curr) => (
 <SelectItem key={curr.value} value={curr.value}>
 {isRTL ? curr.labelAr : curr.label}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* Period Start */}
 <div>
 <Label>{pageT.periodStart} *</Label>
 <Input
 type="date"
 value={formData.periodStart}
 onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
 />
 </div>

 {/* Period End */}
 <div>
 <Label>{pageT.periodEnd} *</Label>
 <Input
 type="date"
 value={formData.periodEnd}
 onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
 />
 </div>
 </div>

 {/* Notes */}
 <div>
 <Label>{pageT.notes}</Label>
 <Textarea
 value={formData.notes}
 onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
 placeholder={t.financeModule.additionalNotes25}
 rows={3}
 className="text-start"
 />
 </div>

 <DialogFooter>
 <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
 {pageT.cancel}
 </Button>
 <Button type="submit" disabled={createMutation.isPending}>
 {createMutation.isPending ? (
 <Loader2 className="w-4 h-4 animate-spin me-2" />
 ) : (
 <Plus className="w-4 h-4 me-2" />
 )}
 {pageT.createBudget}
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>
 );
}

// ============================================================================
// BUDGET DETAIL DIALOG COMPONENT
// ============================================================================
interface BudgetDetailDialogProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 budgetId: number;
 organizationId: number;
 operatingUnitId?: number;
 isRTL: boolean;
 pageT: Record<string, string>;
 budgetCategories: any[];
 onRefresh: () => void;
}

function BudgetDetailDialog({
 open,
 onOpenChange,
 budgetId,
 organizationId,
 operatingUnitId,
 isRTL,
 pageT,
 budgetCategories,
 onRefresh,
}: BudgetDetailDialogProps) {
  const { t } = useTranslation();
 const [activeTab, setActiveTab] = useState("lines");
 const [showAddLineDialog, setShowAddLineDialog] = useState(false);

 // Fetch budget details with lines
 const { data: budgetData, isLoading, refetch } = trpc.budgets.getById.useQuery(
 { budgetId, organizationId, operatingUnitId },
 { enabled: open && budgetId > 0 }
 );

 // Fetch budget lines
 const { data: budgetLines = [], refetch: refetchLines } = trpc.budgetLines.list.useQuery(
 { budgetId },
 { enabled: open && budgetId > 0 }
 );

 // Delete line mutation
 const deleteLineMutation = trpc.budgetLines.delete.useMutation({
 onSuccess: () => {
 toast.success(t.financeModule.lineDeletedSuccessfully);
 refetchLines();
 refetch();
 onRefresh();
 },
 onError: (error) => {
 toast.error(`${t.financeModule.failedToDelete}: ${error.message}`);
 },
 });

 if (isLoading) {
 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="max-w-4xl">
 <div className="flex items-center justify-center py-12">
 <Loader2 className="w-8 h-8 animate-spin text-primary" />
 </div>
 </DialogContent>
 </Dialog>
 );
 }

 if (!budgetData) return null;

 const budget = budgetData;
 const canEdit = budget.status ==="draft";

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <div className="flex items-center justify-between">
 <div className="text-start">
 <DialogTitle className="text-xl">
 {isRTL && budget.budgetTitleAr ? budget.budgetTitleAr : budget.budgetTitle || budget.budgetCode}
 </DialogTitle>
 <DialogDescription className="flex items-center gap-2 mt-1">
 <span className="font-mono">{budget.budgetCode}</span>
 <span>•</span>
 <span>{budget.fiscalYear}</span>
 <span>•</span>
 {renderStatusBadge(budget.status)}
 </DialogDescription>
 </div>
 <Badge variant="secondary" className="text-lg px-3 py-1">
 v{budget.versionNumber}
 </Badge>
 </div>
 </DialogHeader>

 {/* Summary Cards */}
 <div className="grid grid-cols-4 gap-4 my-4">
 <Card>
 <CardContent className="pt-4">
 <p className="text-xs text-muted-foreground">{pageT.totalBudget}</p>
 <p className="text-xl font-bold text-primary">
 {formatCurrency(budget.totalApprovedAmount || 0, budget.currency)}
 </p>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-4">
 <p className="text-xs text-muted-foreground">{pageT.actualSpent}</p>
 <p className="text-xl font-bold text-blue-600">
 {formatCurrency(budget.totalActualAmount || 0, budget.currency)}
 </p>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-4">
 <p className="text-xs text-muted-foreground">{pageT.remaining}</p>
 <p className="text-xl font-bold text-green-600">
 {formatCurrency(
 (parseFloat(budget.totalApprovedAmount ||"0") - parseFloat(budget.totalActualAmount ||"0")),
 budget.currency
 )}
 </p>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-4">
 <p className="text-xs text-muted-foreground">{pageT.utilization}</p>
 <p className="text-xl font-bold">
 {budget.totalApprovedAmount && parseFloat(budget.totalApprovedAmount) > 0
 ? ((parseFloat(budget.totalActualAmount ||"0") / parseFloat(budget.totalApprovedAmount)) * 100).toFixed(1)
 : 0}%
 </p>
 </CardContent>
 </Card>
 </div>

 {/* Tabs */}
 <Tabs value={activeTab} onValueChange={setActiveTab}>
 <TabsList className="grid w-full grid-cols-4">
 <TabsTrigger value="lines">{pageT.budgetLines}</TabsTrigger>
 <TabsTrigger value="allocations">{pageT.monthlyAllocations}</TabsTrigger>
 <TabsTrigger value="variance">{t.financeModule.varianceAnalysis}</TabsTrigger>
 <TabsTrigger value="history">{pageT.versionHistory}</TabsTrigger>
 </TabsList>

 {/* Budget Lines Tab */}
 <TabsContent value="lines" className="mt-4">
 <div className="flex items-center justify-between mb-4">
 <h3 className="font-semibold">{pageT.budgetLines} ({budgetLines.length})</h3>
 {canEdit && (
 <Button size="sm" onClick={() => setShowAddLineDialog(true)}>
 <Plus className="w-4 h-4 me-2" />
 {t.financeModule.addLine}
 </Button>
 )}
 </div>

 {budgetLines.length === 0 ? (
 <div className="text-center py-8 text-muted-foreground">
 {t.financeModule.noLinesInThisBudget}
 </div>
 ) : (
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="text-start">#</TableHead>
 <TableHead className="text-start">
 {t.financeModule.description}
 </TableHead>
 <TableHead className="text-start">
 {t.financeModule.unitCost}
 </TableHead>
 <TableHead className="text-start">
 {t.financeModule.qty}
 </TableHead>
 <TableHead className="text-start">
 {t.financeModule.duration}
 </TableHead>
 <TableHead className="text-start">
 {t.financeModule.total}
 </TableHead>
 {canEdit && (
 <TableHead className="text-center">
 {pageT.actions}
 </TableHead>
 )}
 </TableRow>
 </TableHeader>
 <TableBody>
 {budgetLines.map((line: any, index: number) => (
 <TableRow key={line.id}>
 <TableCell className="font-mono">{line.lineNumber || index + 1}</TableCell>
 <TableCell className="text-start">
 <div>
 <p className="font-medium">
 {isRTL && line.descriptionAr ? line.descriptionAr : line.description}
 </p>
 <p className="text-xs text-muted-foreground">{line.lineCode}</p>
 </div>
 </TableCell>
 <TableCell className="font-mono">
 {formatCurrency(line.unitCost || 0, budget.currency)}
 </TableCell>
 <TableCell>{line.quantity}</TableCell>
 <TableCell>{line.durationMonths} {t.financeModule.mo}</TableCell>
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
 deleteLineMutation.mutate({ lineId: line.id, organizationId });
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
 )}
 </TabsContent>

 {/* Monthly Allocations Tab */}
 <TabsContent value="allocations" className="mt-4">
 <MonthlyAllocationGrid
 budgetId={budgetId}
 budgetLines={budgetLines}
 fiscalYear={budget.fiscalYear}
 currency={budget.currency}
 isRTL={isRTL}
 canEdit={canEdit}
 onRefresh={() => { refetch(); refetchLines(); }}
 />
 </TabsContent>

 {/* Variance Analysis Tab */}
 <TabsContent value="variance" className="mt-4">
 <VarianceAnalysisTab
 budgetId={budgetId}
 organizationId={organizationId}
 fiscalYear={budget.fiscalYear}
 currency={budget.currency}
 isRTL={isRTL}
 />
 </TabsContent>

 {/* Version History Tab */}
 <TabsContent value="history" className="mt-4">
 <div className="space-y-4">
 <div className="flex items-center gap-4 p-4 border rounded-lg">
 <Badge variant="secondary">v{budget.versionNumber}</Badge>
 <div className="flex-1 text-start">
 <p className="font-medium">
 {budget.versionNumber === 1 
 ? (t.financeModule.originalVersion)
 : (t.financeModule.revision)}
 </p>
 <p className="text-sm text-muted-foreground">
 {t.financeModule.created}: {formatDate(budget.createdAt)}
 </p>
 {budget.revisionNotes && (
 <p className="text-sm mt-1">{budget.revisionNotes}</p>
 )}
 </div>
 {renderStatusBadge(budget.status)}
 </div>
 </div>
 </TabsContent>
 </Tabs>

 {/* Add Line Dialog */}
 {showAddLineDialog && (
 <AddBudgetLineDialog
 open={showAddLineDialog}
 onOpenChange={setShowAddLineDialog}
 budgetId={budgetId}
 projectId={budget.projectId}
 organizationId={organizationId}
 operatingUnitId={operatingUnitId}
 currency={budget.currency}
 isRTL={isRTL}
 budgetCategories={budgetCategories}
 onSuccess={() => {
 refetchLines();
 refetch();
 onRefresh();
 setShowAddLineDialog(false);
 }}
 />
 )}
 </DialogContent>
 </Dialog>
 );
}

// Helper function for rendering status badge (used in BudgetDetailDialog)
function renderStatusBadge(status: string) {
  const { language, isRTL} = useLanguage();
 const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft;
 const Icon = config.icon;
 return (
 <Badge variant="outline" className={`${config.color} border`}>
 <Icon className="h-3 w-3 me-1" />
 {config.labelEn}
 </Badge>
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
 lineCode:"",
 description:"",
 descriptionAr:"",
 categoryId:"",
 unitType:"item" as"staff" |"item" |"service" |"lump_sum",
 unitCost: 0,
 quantity: 1,
 durationMonths: 1,
 donorEligibilityPercentage: 100,
 justification:"",
 notes:"",
 });

 const createLineMutation = trpc.budgetLines.create.useMutation({
 onSuccess: () => {
 toast.success(t.financeModule.lineAddedSuccessfully);
 onSuccess();
 // Reset form
 setFormData({
 lineCode:"",
 description:"",
 descriptionAr:"",
 categoryId:"",
 unitType:"item",
 unitCost: 0,
 quantity: 1,
 durationMonths: 1,
 donorEligibilityPercentage: 100,
 justification:"",
 notes:"",
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

 // Calculate total
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
 {/* Line Code */}
 <div>
 <Label>{t.financeModule.lineCode} *</Label>
 <Input
 value={formData.lineCode}
 onChange={(e) => setFormData({ ...formData, lineCode: e.target.value })}
 placeholder={t.placeholders.eG111}
 />
 </div>

 {/* Category */}
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
 {/* Description */}
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
 {/* Unit Type */}
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

 {/* Unit Cost */}
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

 {/* Quantity */}
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

 {/* Duration */}
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

 {/* Calculation Result */}
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
 const [selectedLineId, setSelectedLineId] = useState<number | null>(null);
 const [editingCell, setEditingCell] = useState<{ lineId: number; month: number } | null>(null);
 const [editValue, setEditValue] = useState<string>("");

 // Month names
 const months = isRTL
 ? ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"]
 : ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

 // Fetch allocations for all lines in this budget
 const { data: allocations = [], refetch: refetchAllocations } = trpc.budgetMonthlyAllocations.listByBudget.useQuery(
 { budgetId },
 { enabled: budgetId > 0 }
 );

 // Fetch quarterly summary
 const { data: quarterlySummary = [] } = trpc.budgetMonthlyAllocations.getQuarterlySummary.useQuery(
 { budgetId },
 { enabled: budgetId > 0 }
 );

 // Bulk upsert mutation
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

 // Auto-distribute mutation
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

 // Get allocation for a specific line and month
 const getAllocation = (lineId: number, monthNumber: number): number => {
 const alloc = allocations.find(
 (a: any) => a.budgetLineId === lineId && a.monthNumber === monthNumber
 );
 return alloc ? parseFloat(alloc.plannedAmount ||"0") : 0;
 };

 // Calculate row total (all 12 months for a line)
 const getLineTotal = (lineId: number): number => {
 return Array.from({ length: 12 }, (_, i) => getAllocation(lineId, i + 1))
 .reduce((sum, val) => sum + val, 0);
 };

 // Calculate column total (all lines for a month)
 const getMonthTotal = (monthNumber: number): number => {
 return budgetLines.reduce((sum, line) => sum + getAllocation(line.id, monthNumber), 0);
 };

 // Calculate quarterly totals
 const getQuarterTotal = (quarter: number): number => {
 const startMonth = (quarter - 1) * 3 + 1;
 return [startMonth, startMonth + 1, startMonth + 2]
 .reduce((sum, month) => sum + getMonthTotal(month), 0);
 };

 // Calculate grand total
 const getGrandTotal = (): number => {
 return budgetLines.reduce((sum, line) => sum + getLineTotal(line.id), 0);
 };

 // Handle cell edit
 const handleCellClick = (lineId: number, month: number) => {
 if (!canEdit) return;
 setEditingCell({ lineId, month });
 setEditValue(getAllocation(lineId, month).toString());
 };

 // Handle cell save
 const handleCellSave = () => {
 if (!editingCell) return;
 
 const value = parseFloat(editValue) || 0;
 const { lineId, month } = editingCell;
 
 // Build allocations array for the line
 const lineAllocations = Array.from({ length: 12 }, (_, i) => ({
 monthNumber: i + 1,
 plannedAmount: i + 1 === month ? value : getAllocation(lineId, i + 1),
 forecastAmount: i + 1 === month ? value : getAllocation(lineId, i + 1),
 actualAmount: 0,
 }));

 bulkUpsertMutation.mutate({
 budgetLineId: lineId,
 budgetId,
 fiscalYear,
 allocations: lineAllocations,
 });

 setEditingCell(null);
 setEditValue("");
 };

 // Handle auto-distribute for a line
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
 {/* Summary Cards */}
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
 const budgetedAmount = parseFloat(line.totalAmount ||"0");
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
 <span className={variance > 0 ?"text-amber-600 ms-2" :"text-green-600 ms-2"}>
 ({variance > 0 ?"+" :""}{formatCurrency(variance, currency)} {t.financeModule.remaining17})
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
 if (e.key ==="Enter") handleCellSave();
 if (e.key ==="Escape") {
 setEditingCell(null);
 setEditValue("");
 }
 }}
 className="h-8 w-20 text-center text-sm"
 autoFocus
 />
 ) : (
 <span className={`text-sm ${value > 0 ? 'font-medium' : 'text-muted-foreground'}`}>
 {value > 0 ? value.toLocaleString() :"-"}
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
// DONOR EXPORT DIALOG COMPONENT
// ============================================================================
interface DonorExportDialogProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 budgetId: number | null;
 budgets: any[];
 organizationId: number;
 isRTL: boolean;
}

function DonorExportDialog({
 open,
 onOpenChange,
 budgetId,
 budgets,
 organizationId,
 isRTL,
}: DonorExportDialogProps) {
  const { t } = useTranslation();
 const [selectedBudgetId, setSelectedBudgetId] = useState<number>(budgetId || 0);
 const [selectedFormat, setSelectedFormat] = useState<string>("EU");
 const [includeMonthly, setIncludeMonthly] = useState(false);

 // Update selected budget when prop changes
 useEffect(() => {
 if (budgetId) setSelectedBudgetId(budgetId);
 }, [budgetId]);

 // Fetch donor formats
 const { data: donorFormats = [] } = trpc.donorBudgetExport.getDonorFormats.useQuery();

 // Fetch export data
 const { data: exportData, isLoading, refetch } = trpc.donorBudgetExport.exportBudget.useQuery(
 {
 budgetId: selectedBudgetId,
 organizationId,
 donorFormat: selectedFormat as any,
 includeMonthlyBreakdown: includeMonthly,
 },
 { enabled: open && selectedBudgetId > 0 }
 );

 // Handle Excel download
 const handleExcelDownload = () => {
 if (!exportData) return;

 // Create CSV content
 const headers = ["Category Code","Category Name","Line Count","Total Amount","Donor Eligible Amount"];
 const rows = exportData.categories.map((cat: any) => [
 cat.categoryCode,
 cat.categoryName,
 cat.lineCount,
 cat.totalAmount.toFixed(2),
 cat.donorEligibleAmount.toFixed(2),
 ]);

 // Add totals row
 rows.push([
"",
"TOTAL",
"",
 exportData.totals.grandTotal.toFixed(2),
 exportData.totals.donorEligibleTotal.toFixed(2),
 ]);

 const csvContent = [
 headers.join(","),
 ...rows.map((row: any[]) => row.join(",")),
 ].join("\n");

 // Download
 const blob = new Blob([csvContent], { type:"text/csv;charset=utf-8;" });
 const url = URL.createObjectURL(blob);
 const link = document.createElement("a");
 link.href = url;
 link.download = `Budget_${exportData.budget.budgetCode}_${selectedFormat}_Export.csv`;
 link.click();
 URL.revokeObjectURL(url);

 toast.success(t.financeModule.budgetExportedSuccessfully);
 };

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>
 {t.financeModule.exportBudgetInDonorFormat}
 </DialogTitle>
 <DialogDescription>
 {'Select budget and donor format to export data'}
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-4">
 {/* Budget Selection */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.financeModule.budget}</Label>
 <Select
 value={selectedBudgetId.toString()}
 onValueChange={(value) => setSelectedBudgetId(parseInt(value))}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {budgets.map((budget: any) => (
 <SelectItem key={budget.id} value={budget.id.toString()}>
 {budget.budgetCode} - {isRTL && budget.budgetTitleAr ? budget.budgetTitleAr : budget.budgetTitle || budget.fiscalYear}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div>
 <Label>{t.financeModule.donorFormat}</Label>
 <Select
 value={selectedFormat}
 onValueChange={setSelectedFormat}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {donorFormats.map((format: any) => (
 <SelectItem key={format.code} value={format.code}>
 {isRTL ? format.nameAr : format.name} ({format.categoryCount} {t.financeModule.categories26})
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>

 {/* Include Monthly Breakdown */}
 <div className="flex items-center gap-2">
 <input
 type="checkbox"
 id="includeMonthly"
 checked={includeMonthly}
 onChange={(e) => setIncludeMonthly(e.target.checked)}
 className="rounded border-gray-300"
 />
 <Label htmlFor="includeMonthly">
 {t.financeModule.includeMonthlyBreakdown}
 </Label>
 </div>

 {/* Export Preview */}
 {isLoading ? (
 <div className="flex items-center justify-center py-8">
 <Loader2 className="w-8 h-8 animate-spin text-primary" />
 </div>
 ) : exportData ? (
 <div className="space-y-4">
 {/* Budget Info */}
 <Card>
 <CardContent className="pt-4">
 <div className="grid grid-cols-4 gap-4 text-sm">
 <div>
 <p className="text-muted-foreground">{t.financeModule.budgetCode}</p>
 <p className="font-mono font-medium">{exportData.budget.budgetCode}</p>
 </div>
 <div>
 <p className="text-muted-foreground">{t.financeModule.fiscalYear}</p>
 <p className="font-medium">{exportData.budget.fiscalYear}</p>
 </div>
 <div>
 <p className="text-muted-foreground">{t.financeModule.currency}</p>
 <p className="font-medium">{exportData.budget.currency}</p>
 </div>
 <div>
 <p className="text-muted-foreground">{t.financeModule.donorFormat}</p>
 <p className="font-medium">{isRTL ? exportData.donorFormat.nameAr : exportData.donorFormat.name}</p>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Categories Table */}
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="text-start">{t.financeModule.code}</TableHead>
 <TableHead className="text-start">{t.financeModule.category}</TableHead>
 <TableHead className="text-center">{t.financeModule.lines}</TableHead>
 <TableHead className="text-end">{t.financeModule.totalAmount}</TableHead>
 <TableHead className="text-end">{t.financeModule.eligibleAmount}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {exportData.categories.map((cat: any) => (
 <TableRow key={cat.categoryCode}>
 <TableCell className="font-mono">{cat.categoryCode}</TableCell>
 <TableCell>{isRTL ? cat.categoryNameAr : cat.categoryName}</TableCell>
 <TableCell className="text-center">{cat.lineCount}</TableCell>
 <TableCell className="font-mono text-end">
 {formatCurrency(cat.totalAmount, exportData.budget.currency)}
 </TableCell>
 <TableCell className="font-mono text-end">
 {formatCurrency(cat.donorEligibleAmount, exportData.budget.currency)}
 </TableCell>
 </TableRow>
 ))}
 {/* Totals Row */}
 <TableRow className="bg-muted/50 font-semibold">
 <TableCell colSpan={2}>{t.financeModule.total20}</TableCell>
 <TableCell />
 <TableCell className="font-mono text-end">
 {formatCurrency(exportData.totals.grandTotal, exportData.budget.currency)}
 </TableCell>
 <TableCell className="font-mono text-end">
 {formatCurrency(exportData.totals.donorEligibleTotal, exportData.budget.currency)}
 </TableCell>
 </TableRow>
 </TableBody>
 </Table>
 </div>
 ) : null}
 </div>

 <DialogFooter>
 <Button variant="outline" onClick={() => onOpenChange(false)}>
 {t.financeModule.cancel}
 </Button>
 <Button onClick={handleExcelDownload} disabled={!exportData}>
 <Download className="w-4 h-4 me-2" />
 {t.financeModule.exportCsv}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
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
 const [viewMode, setViewMode] = useState<"lines" |"monthly">("lines");

 // Fetch budget utilization summary
 const { data: utilization, isLoading: utilizationLoading } = trpc.budgetExpenditure.getBudgetUtilization.useQuery(
 { budgetId, organizationId },
 { enabled: budgetId > 0 }
 );

 // Fetch line-level variance
 const { data: lineVariance, isLoading: lineVarianceLoading } = trpc.budgetExpenditure.getLineVarianceAnalysis.useQuery(
 { budgetId, organizationId },
 { enabled: budgetId > 0 && viewMode ==="lines" }
 );

 // Fetch monthly variance
 const { data: monthlyVariance, isLoading: monthlyVarianceLoading } = trpc.budgetExpenditure.getMonthlyVarianceAnalysis.useQuery(
 { budgetId, organizationId, fiscalYear },
 { enabled: budgetId > 0 && viewMode ==="monthly" }
 );

 // Fetch variance alerts
 const { data: alerts } = trpc.budgetExpenditure.getVarianceAlerts.useQuery(
 { budgetId, organizationId, thresholdPercent: 90 },
 { enabled: budgetId > 0 }
 );

 const isLoading = utilizationLoading || (viewMode ==="lines" ? lineVarianceLoading : monthlyVarianceLoading);

 // Get status color
 const getStatusColor = (status: string) => {
 switch (status) {
 case"over_budget":
 return"text-red-600 bg-red-50";
 case"warning":
 return"text-amber-600 bg-amber-50";
 default:
 return"text-green-600 bg-green-50";
 }
 };

 // Get progress bar color
 const getProgressColor = (rate: number) => {
 if (rate > 100) return"bg-red-500";
 if (rate > 90) return"bg-amber-500";
 return"bg-green-500";
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
 {`${alerts.alertCount} Budget Alert${alerts.alertCount > 1 ? 's' : ''}`}
 </p>
 <p className="text-sm text-amber-700">
 {alerts.criticalCount > 0 && (
 <span className="text-red-600 font-medium">
 {alerts.criticalCount} {t.financeModule.overBudget27}
 </span>
 )}
 {alerts.criticalCount > 0 && alerts.warningCount > 0 &&" •"}
 {alerts.warningCount > 0 && (
 <span className="text-amber-600">
 {alerts.warningCount} {t.financeModule.warning28}
 </span>
 )}
 </p>
 </div>
 </div>
 </div>
 )}

 {/* Summary Cards */}
 {utilization && (
 <div className="grid grid-cols-4 gap-4">
 <Card>
 <CardContent className="pt-4">
 <p className="text-xs text-muted-foreground">
 {t.financeModule.totalBudget11}
 </p>
 <p className="text-xl font-bold">
 {formatCurrency(utilization.totalBudgeted, currency)}
 </p>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-4">
 <p className="text-xs text-muted-foreground">
 {t.financeModule.actualSpent29}
 </p>
 <p className="text-xl font-bold text-blue-600">
 {formatCurrency(utilization.totalExpenses, currency)}
 </p>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-4">
 <p className="text-xs text-muted-foreground">
 {t.financeModule.variance}
 </p>
 <p className={`text-xl font-bold ${utilization.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
 {utilization.variance >= 0 ? '+' : ''}{formatCurrency(utilization.variance, currency)}
 </p>
 </CardContent>
 </Card>
 <Card className={getStatusColor(utilization.status)}>
 <CardContent className="pt-4">
 <p className="text-xs opacity-70">
 {t.financeModule.utilizationRate18}
 </p>
 <p className="text-xl font-bold">
 {utilization.utilizationRate.toFixed(1)}%
 </p>
 <div className="mt-2 h-2 bg-white/50 rounded-full overflow-hidden">
 <div 
 className={`h-full ${getProgressColor(utilization.utilizationRate)}`}
 style={{ width: `${Math.min(utilization.utilizationRate, 100)}%` }}
 />
 </div>
 </CardContent>
 </Card>
 </div>
 )}

 {/* View Toggle */}
 <div className="flex gap-2">
 <Button
 variant={viewMode ==="lines" ?"default" :"outline"}
 size="sm"
 onClick={() => setViewMode("lines")}
 >
 {t.financeModule.byLine}
 </Button>
 <Button
 variant={viewMode ==="monthly" ?"default" :"outline"}
 size="sm"
 onClick={() => setViewMode("monthly")}
 >
 {t.financeModule.byMonth30}
 </Button>
 </div>

 {/* Line-Level Variance */}
 {viewMode ==="lines" && lineVariance && (
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="text-start">
 {t.financeModule.line}
 </TableHead>
 <TableHead className="text-end">
 {t.financeModule.budget}
 </TableHead>
 <TableHead className="text-end">
 {t.financeModule.actual}
 </TableHead>
 <TableHead className="text-end">
 {t.financeModule.variance}
 </TableHead>
 <TableHead className="text-center">
 {t.financeModule.utilization19}
 </TableHead>
 <TableHead className="text-center">
 {t.financeModule.status}
 </TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {lineVariance.lines.map((line: any) => (
 <TableRow key={line.lineId}>
 <TableCell className="text-start">
 <div>
 <p className="font-medium">
 {isRTL && line.descriptionAr ? line.descriptionAr : line.description}
 </p>
 <p className="text-xs text-muted-foreground font-mono">{line.lineCode}</p>
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
 {line.status ==="over_budget" 
 ? (t.financeModule.over) 
 : line.status ==="warning" 
 ? (t.financeModule.warning)
 : (t.financeModule.ok)}
 </Badge>
 </TableCell>
 </TableRow>
 ))}
 {/* Totals Row */}
 <TableRow className="bg-muted/50 font-semibold">
 <TableCell className="text-start">
 {t.financeModule.total20}
 </TableCell>
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
 </TableBody>
 </Table>
 )}

 {/* Monthly Variance */}
 {viewMode ==="monthly" && monthlyVariance && (
 <div className="space-y-4">
 {/* Quarterly Summary */}
 <div className="grid grid-cols-4 gap-4">
 {monthlyVariance.quarterly.map((q: any) => (
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
 <TableHead className="text-start">
 {t.financeModule.month}
 </TableHead>
 <TableHead className="text-end">
 {t.financeModule.planned23}
 </TableHead>
 <TableHead className="text-end">
 {t.financeModule.actual}
 </TableHead>
 <TableHead className="text-end">
 {t.financeModule.variance}
 </TableHead>
 <TableHead className="text-center">
 {t.financeModule.utilization19}
 </TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {monthlyVariance.monthly.map((m: any) => {
 const monthNames = isRTL
 ? ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"]
 : ["January","February","March","April","May","June","July","August","September","October","November","December"];
 
 return (
 <TableRow key={m.month}>
 <TableCell className="text-start">
 {monthNames[m.month - 1]}
 </TableCell>
 <TableCell className="font-mono text-end">
 {formatCurrency(m.planned, currency)}
 </TableCell>
 <TableCell className="font-mono text-end">
 {formatCurrency(m.actual, currency)}
 </TableCell>
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
 <TableRow className="bg-muted/50 font-semibold">
 <TableCell className="text-start">
 {t.financeModule.annualTotal}
 </TableCell>
 <TableCell className="font-mono text-end">
 {formatCurrency(monthlyVariance.annual.planned, currency)}
 </TableCell>
 <TableCell className="font-mono text-end">
 {formatCurrency(monthlyVariance.annual.actual, currency)}
 </TableCell>
 <TableCell className={`font-mono text-end ${monthlyVariance.annual.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
 {monthlyVariance.annual.variance >= 0 ? '+' : ''}{formatCurrency(monthlyVariance.annual.variance, currency)}
 </TableCell>
 <TableCell className="text-center">
 <span className="font-mono">{monthlyVariance.annual.utilizationRate.toFixed(1)}%</span>
 </TableCell>
 </TableRow>
 </TableBody>
 </Table>
 </div>
 )}
 </div>
 );
}


/**
 * UpdateBudgetDialog Component
 * Full budget edit form with all fields (same as Create Budget)
 * Grant field is non-editable showing project name
 */
interface UpdateBudgetDialogProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 budget: any;
 projectId: number;
 grants: any[];
 organizationId: number;
 operatingUnitId: number;
 isRTL: boolean;
 pageT: any;
 onSuccess: () => void;
}

function UpdateBudgetDialog({
 open,
 onOpenChange,
 budget,
 projectId,
 grants,
 organizationId,
 operatingUnitId,
 isRTL,
 pageT,
 onSuccess,
}: UpdateBudgetDialogProps) {
  const { t } = useTranslation();
 const [formData, setFormData] = useState({
 grantId: budget?.grantId?.toString() || "",
 budgetTitle: budget?.budgetTitle || "",
 budgetTitleAr: budget?.budgetTitleAr || "",
 fiscalYear: budget?.fiscalYear?.toString() || new Date().getFullYear().toString(),
 currency: budget?.currency || "USD",
 periodStart: budget?.periodStart || "",
 periodEnd: budget?.periodEnd || "",
 notes: budget?.notes || "",
 notesAr: budget?.notesAr || "",
 });

 // Update form data when budget data changes
 useEffect(() => {
 if (budget) {
 setFormData({
 grantId: budget.grantId?.toString() || "",
 budgetTitle: budget.budgetTitle || "",
 budgetTitleAr: budget.budgetTitleAr || "",
 fiscalYear: budget.fiscalYear?.toString() || new Date().getFullYear().toString(),
 currency: budget.currency || "USD",
 periodStart: budget.periodStart || "",
 periodEnd: budget.periodEnd || "",
 notes: budget.notes || "",
 notesAr: budget.notesAr || "",
 });
 }
 }, [budget]);

 // Fetch project details to show non-editable grant field
 const { data: projectData } = trpc.projects.getById.useQuery(
 { projectId, organizationId, operatingUnitId },
 { enabled: !!projectId }
 );

 const utils = trpc.useUtils();
 const updateMutation = trpc.budgets.update.useMutation({
 onSuccess: (data) => {
 toast.success(t.financeModule.budgetUpdatedSuccessfully);
 // Invalidate both the budget list and the specific budget detail query
 utils.budgets.list.invalidate();
 utils.budgets.getById.invalidate({ budgetId: budget?.id || 0, organizationId, operatingUnitId });
 onSuccess();
 },
 onError: (error) => {
 toast.error(`${t.financeModule.failedToUpdate}: ${error.message}`);
 },
 });

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 
 if (!budget?.id) {
 toast.error(t.financeModule.budgetIdIsMissing);
 return;
 }

 if (!formData.fiscalYear || !formData.periodStart || !formData.periodEnd) {
 toast.error(t.financeModule.pleaseFillAllRequiredFields);
 return;
 }

 updateMutation.mutate({
 budgetId: budget.id,
 budgetTitle: formData.budgetTitle || undefined,
 budgetTitleAr: formData.budgetTitleAr || undefined,
 fiscalYear: formData.fiscalYear,
 currency: formData.currency,
 periodStart: formData.periodStart,
 periodEnd: formData.periodEnd,
 notes: formData.notes || undefined,
 notesAr: formData.notesAr || undefined,
 });
 };

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="max-w-2xl">
 <DialogHeader>
 <DialogTitle>{pageT.update || (t.financeModule.updateBudget)}</DialogTitle>
 <DialogDescription>
 {'Update complete budget details'}
 </DialogDescription>
 </DialogHeader>
 
 {budget && (
 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 {/* Grant - Non-editable showing project name */}
 <div>
 <Label>{pageT.grant}</Label>
 <Input
 value={projectData?.name || projectData?.nameAr || `Project ${projectId}`}
 readOnly
 className="bg-muted"
 />
 </div>

 {/* Fiscal Year */}
 <div>
 <Label>{pageT.fiscalYear} *</Label>
 <Select
 value={formData.fiscalYear}
 onValueChange={(value) => setFormData({ ...formData, fiscalYear: value })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {[...Array(5)].map((_, i) => {
 const year = new Date().getFullYear() - 2 + i;
 return (
 <SelectItem key={year} value={year.toString()}>
 {year}
 </SelectItem>
 );
 })}
 </SelectContent>
 </Select>
 </div>
 </div>

 <div>
 {/* Budget Title */}
 <Label>{pageT.budgetTitle}</Label>
 <Input
 value={formData.budgetTitle}
 onChange={(e) => setFormData({ ...formData, budgetTitle: e.target.value })}
 placeholder={t.placeholders.eGAnnualOperatingBudget2024}
 />
 </div>

 <div className="grid grid-cols-3 gap-4">
 {/* Currency - Using global currency list */}
 <div>
 <Label>{pageT.currency}</Label>
 <Select
 value={formData.currency}
 onValueChange={(value) => setFormData({ ...formData, currency: value })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {GLOBAL_CURRENCIES.map((curr) => (
 <SelectItem key={curr.code} value={curr.code}>
 {curr.code} - {curr.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* Period Start */}
 <div>
 <Label>{pageT.periodStart} *</Label>
 <Input
 type="date"
 value={formData.periodStart}
 onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
 />
 </div>

 {/* Period End */}
 <div>
 <Label>{pageT.periodEnd} *</Label>
 <Input
 type="date"
 value={formData.periodEnd}
 onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
 />
 </div>
 </div>

 {/* Notes */}
 <div>
 <Label>{pageT.notes}</Label>
 <Textarea
 value={formData.notes}
 onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
 placeholder={t.financeModule.additionalNotes25}
 rows={3}
 className="text-start"
 />
 </div>

 <DialogFooter>
 <Button variant="outline" onClick={() => onOpenChange(false)}>{pageT.cancel}</Button>
 <Button type="submit" disabled={updateMutation.isPending}>
 {updateMutation.isPending ? (
 <>
 <Loader2 className="h-4 w-4 animate-spin me-2" />
 {pageT.updating || (t.financeModule.updating)}
 </>
 ) : (
 pageT.update || (t.financeModule.update)
 )}
 </Button>
 </DialogFooter>
 </form>
 )}
 </DialogContent>
 </Dialog>
 );
}
