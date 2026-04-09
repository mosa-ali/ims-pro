/**
 * My PRs — PR Workflow Dashboard List Page
 *
 * Displays all Purchase Requests with:
 * - PR Status Badges (Draft=Gray, Submitted=Yellow, Approved=Green, Rejected=Red)
 * - Procurement Progress bar driven by real backend state
 * - Procurement Type badge (Goods, Services, Works, Consultancy)
 * - Filters by status, category, and search
 * - Read-only view (non-clickable rows, no action buttons)
 * - Full RTL/LTR support
 *
 * Note: Procurement Workspace access is only available via the Purchase Requests page
 */

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
 Tooltip,
 TooltipContent,
 TooltipProvider,
 TooltipTrigger,
} from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import {
 ArrowLeft,
 ArrowRight,
 Search,
 Loader2,
 ExternalLink,
 ChevronLeft,
 ChevronRight,
 FileText,
 AlertTriangle,
} from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

/* ── PR Status Badge ─────────────────────────────────────────────────── */
function PRStatusBadge({ status, t }: { status: string; t: any }) {
 const statusMap: Record<string, { label: string; variant: string; className: string }> = {
 draft: { label: t.myPRs.draft, variant: "secondary", className: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300" },
 submitted: { label: t.myPRs.submitted, variant: "default", className: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300" },
 validated_by_logistic: { label: t.myPRs.submitted, variant: "default", className: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300" },
 validated_by_finance: { label: t.myPRs.submitted, variant: "default", className: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300" },
 approved: { label: t.myPRs.approved, variant: "default", className: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-300" },
 rejected_by_logistic: { label: t.myPRs.rejected, variant: "destructive", className: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300" },
 rejected_by_finance: { label: t.myPRs.rejected, variant: "destructive", className: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300" },
 rejected_by_pm: { label: t.myPRs.rejected, variant: "destructive", className: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300" },
 };
 const s = statusMap[status] || statusMap.draft;
 return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
}

/* ── Procurement Type Badge ──────────────────────────────────────────── */
function CategoryBadge({ category, t }: { category: string; t: any }) {
 const catMap: Record<string, { label: string; className: string }> = {
 goods: { label: t.myPRs.goods, className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300" },
 services: { label: t.myPRs.services, className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300" },
 works: { label: t.myPRs.works, className: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300" },
 consultancy: { label: t.myPRs.consultancy, className: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300" },
 };
 const c = catMap[category] || catMap.goods;
 return <Badge variant="outline" className={c.className}>{c.label}</Badge>;
}

/* ── Procurement Progress Bar ────────────────────────────────────────── */
interface ProcurementStage {
 name: string;
 nameAr: string;
 status: "completed" | "in_progress" | "not_started" | "locked" | "n/a";
 docNumber?: string;
 docStatus?: string;
}

function ProcurementProgressBar({
 stages,
 isRTL,
}: {
 stages: ProcurementStage[];
 isRTL: boolean;
}) {
 const activeStages = stages.filter((s) => s.status !== "n/a");
 const completedCount = activeStages.filter((s) => s.status === "completed").length;
 const totalStages = activeStages.length;
 const progressPercent = totalStages > 0 ? Math.round((completedCount / totalStages) * 100) : 0;

 return (
 <TooltipProvider>
 <div className="w-full">
 {/* Progress bar */}
 <div className="flex items-center gap-1 mb-1">
 {activeStages.map((stage, idx) => (
 <Tooltip key={idx}>
 <TooltipTrigger asChild>
 <div
 className={`h-2 flex-1 rounded-full transition-colors ${ stage.status === "completed" ? "bg-green-500" : stage.status === "in_progress" ? "bg-yellow-500 animate-pulse" : stage.status === "not_started" ? "bg-gray-300 dark:bg-gray-600" : "bg-gray-200 dark:bg-gray-700" }`}
 />
 </TooltipTrigger>
 <TooltipContent side="top" className="max-w-xs">
 <div className="text-xs">
 <p className="font-semibold">{isRTL ? stage.nameAr : stage.name}</p>
 <p className="text-muted-foreground capitalize">{stage.status.replace("_", " ")}</p>
 {stage.docNumber && <p className="text-muted-foreground">{stage.docNumber}</p>}
 </div>
 </TooltipContent>
 </Tooltip>
 ))}
 </div>
 <span className="text-xs text-muted-foreground">{progressPercent}%</span>
 </div>
 </TooltipProvider>
 );
}

/* ── Main Component ──────────────────────────────────────────────────── */
export default function MyPRs() {
 const { t } = useTranslation();
 const { user } = useAuth();
 const { currentOrganization } = useOrganization();
 const [, setLocation] = useLocation();
 const searchString = useSearch();

 // Parse URL query params for initial filter
 const urlParams = useMemo(() => new URLSearchParams(searchString), [searchString]);
 const initialStatus = urlParams.get("status") || "all";

 const { isRTL, direction } = useLanguage();
 const ForwardArrow = isRTL ? ArrowLeft : ArrowRight;


 // Filters
 const [statusFilter, setStatusFilter] = useState(initialStatus);
 const [categoryFilter, setCategoryFilter] = useState("all");
 const [searchQuery, setSearchQuery] = useState("");
 const [page, setPage] = useState(0);
 const pageSize = 20;

 // Update filter when URL changes
 useEffect(() => {
 const s = urlParams.get("status");
 if (s && s !== statusFilter) {
 setStatusFilter(s);
 }
 }, [urlParams]);

 // Fetch PR list with procurement progress from real DB
 const { data, isLoading, error } = trpc.logistics.prWorkflowDashboard.getMyPRs.useQuery(
 {
 status: statusFilter as any,
 category: categoryFilter as any,
 search: searchQuery || undefined,
 limit: pageSize,
 offset: page * pageSize,
 },
 { enabled: !!user }
 );

 // Fetch status counts for summary
 const { data: statusCounts } = trpc.logistics.prWorkflowDashboard.getStatusCounts.useQuery(
 {},
 { enabled: !!user }
 );

 const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

 const formatCurrency = (amount: number, currency: string) => {
 return new Intl.NumberFormat('en-US', {
 style: "currency",
 currency: currency || "USD",
 minimumFractionDigits: 0,
 maximumFractionDigits: 2,
 }).format(amount);
 };

 const formatDate = (date: any) => {
 if (!date) return "-";
 const d = new Date(date);
 return d.toLocaleDateString('en-US', {
 year: "numeric",
 month: "short",
 day: "numeric",
 });
 };

 return (
 <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className="border-b bg-card">
 <div className="container py-4">
 <BackButton href="/organization/logistics" label={t.logistics.backToLogistics} />
 <div className="flex items-center justify-between mt-2">
 <div>
 <h1 className="text-2xl font-bold text-foreground">{t.myPRs.myPrs}</h1>
 <p className="text-sm text-muted-foreground">{t.myPRs.prWorkflowDashboardDesc}</p>
 </div>
 <div className="flex items-center gap-2">
 <Link href="/organization/logistics/stock">
 <Button variant="outline">
 {t.myPRs.stockRequest}
 </Button>
 </Link>
 <Link href="/organization/logistics/purchase-requests/new">
 <Button>
 {t.myPRs.newRequest}
 </Button>
 </Link>
 </div>
 </div>
 </div>
 </div>
 <div className="container py-6">

 {/* Status Summary Cards */}
 <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
 <button
 onClick={() => { setStatusFilter("all"); setPage(0); }}
 className={`rounded-lg p-3 text-start transition-all border ${ statusFilter === "all" ? "border-primary ring-2 ring-primary/20" : "border-border" } bg-card`}
 >
 <p className="text-xs text-muted-foreground">{t.myPRs.allStatuses}</p>
 <p className="text-xl font-bold">{statusCounts?.total || 0}</p>
 </button>
 <button
 onClick={() => { setStatusFilter("draft"); setPage(0); }}
 className={`rounded-lg p-3 text-start transition-all border ${ statusFilter === "draft" ? "border-gray-500 ring-2 ring-gray-300/30" : "border-border" } bg-gray-50 dark:bg-gray-900/30`}
 >
 <div className="flex items-center gap-1.5">
 <span className="w-2 h-2 rounded-full bg-gray-400" />
 <p className="text-xs text-muted-foreground">{t.myPRs.draft}</p>
 </div>
 <p className="text-xl font-bold">{statusCounts?.draft || 0}</p>
 </button>
 <button
 onClick={() => { setStatusFilter("submitted"); setPage(0); }}
 className={`rounded-lg p-3 text-start transition-all border ${ statusFilter === "submitted" ? "border-yellow-500 ring-2 ring-yellow-300/30" : "border-border" } bg-yellow-50 dark:bg-yellow-900/20`}
 >
 <div className="flex items-center gap-1.5">
 <span className="w-2 h-2 rounded-full bg-yellow-500" />
 <p className="text-xs text-muted-foreground">{t.myPRs.submitted}</p>
 </div>
 <p className="text-xl font-bold">{statusCounts?.submitted || 0}</p>
 </button>
 <button
 onClick={() => { setStatusFilter("approved"); setPage(0); }}
 className={`rounded-lg p-3 text-start transition-all border ${ statusFilter === "approved" ? "border-green-500 ring-2 ring-green-300/30" : "border-border" } bg-green-50 dark:bg-green-900/20`}
 >
 <div className="flex items-center gap-1.5">
 <span className="w-2 h-2 rounded-full bg-green-500" />
 <p className="text-xs text-muted-foreground">{t.myPRs.approved}</p>
 </div>
 <p className="text-xl font-bold">{statusCounts?.approved || 0}</p>
 </button>
 <button
 onClick={() => { setStatusFilter("rejected"); setPage(0); }}
 className={`rounded-lg p-3 text-start transition-all border ${ statusFilter === "rejected" ? "border-red-500 ring-2 ring-red-300/30" : "border-border" } bg-red-50 dark:bg-red-900/20`}
 >
 <div className="flex items-center gap-1.5">
 <span className="w-2 h-2 rounded-full bg-red-500" />
 <p className="text-xs text-muted-foreground">{t.myPRs.rejected}</p>
 </div>
 <p className="text-xl font-bold">{statusCounts?.rejected || 0}</p>
 </button>
 </div>

 {/* Filters */}
 <Card className="mb-6">
 <CardContent className="pt-4 pb-4">
 <div className="flex flex-col md:flex-row gap-3">
 <div className="relative flex-1">
 <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
 <Input
 placeholder={t.myPRs.searchPRs}
 value={searchQuery}
 onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
 className="ps-9"
 />
 </div>
 <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(0); }}>
 <SelectTrigger className="w-full md:w-[180px]">
 <SelectValue placeholder={t.myPRs.allTypes} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{t.myPRs.allTypes}</SelectItem>
 <SelectItem value="goods">{t.myPRs.goods}</SelectItem>
 <SelectItem value="services">{t.myPRs.services}</SelectItem>
 <SelectItem value="works">{t.myPRs.works}</SelectItem>
 <SelectItem value="consultancy">{t.myPRs.consultancy}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </CardContent>
 </Card>

 {/* PR List Table */}
 <Card>
 <CardContent className="p-0">
 {isLoading ? (
 <div className="flex items-center justify-center py-16">
 <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
 </div>
 ) : error ? (
 <div className="flex flex-col items-center justify-center py-16 text-destructive">
 <AlertTriangle className="h-8 w-8 mb-2" />
 <p>{t.myPRs.error}</p>
 </div>
 ) : !data?.items?.length ? (
 <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
 <FileText className="h-12 w-12 mb-3 opacity-30" />
 <p className="text-lg font-medium">{t.myPRs.noPRsFound}</p>
 </div>
 ) : (
 <>
 <div style={{ direction: 'ltr' }}>
 <Table style={{ direction: isRTL ? 'rtl' : 'ltr', tableLayout: 'fixed' }} className="w-full">
 <colgroup>
 <col style={{ width: '14%' }} /> {/* PR Number */}
 <col style={{ width: '10%' }} /> {/* Requester */}
 <col style={{ width: '15%' }} /> {/* Project */}
 <col style={{ width: '10%' }} /> {/* Type */}
 <col style={{ width: '10%' }} /> {/* Cost */}
 <col style={{ width: '10%' }} /> {/* Date */}
 <col style={{ width: '9%' }} /> {/* Status */}
 <col style={{ width: '22%' }} /> {/* Progress */}
 </colgroup>
 <TableHeader>
 <TableRow>
 <TableHead className="text-center">{t.myPRs.prNumber}</TableHead>
 <TableHead>{t.myPRs.requesterName}</TableHead>
 <TableHead>{t.myPRs.project}</TableHead>
 <TableHead className="text-center">{t.myPRs.procurementType}</TableHead>
 <TableHead className="text-center">{t.myPRs.totalCost}</TableHead>
 <TableHead className="text-center">{t.myPRs.requestDate}</TableHead>
 <TableHead className="text-center">{t.myPRs.prStatus}</TableHead>
 <TableHead>{t.myPRs.procurementProgress}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {data.items.map((pr: any) => (
 <TableRow
 key={pr.id}
 >
 <TableCell className="text-center font-mono text-[11px] font-medium truncate">
 {pr.prNumber || `PR-${pr.id}`}
 </TableCell>
 <TableCell className="text-xs truncate">{pr.requesterName || "-"}</TableCell>
 <TableCell className="text-xs truncate">
 {pr.projectTitle || "-"}
 </TableCell>
 <TableCell className="text-center">
 <CategoryBadge category={pr.category || "goods"} t={t} />
 </TableCell>
 <TableCell className="text-center text-xs">
 <div className="truncate">{formatCurrency(pr.totalAmount, pr.currency)}</div>
 </TableCell>
 <TableCell className="text-center text-xs truncate">
 {formatDate(pr.prDate || pr.createdAt)}
 </TableCell>
 <TableCell className="text-center">
 <PRStatusBadge status={pr.status || "draft"} t={t} />
 </TableCell>
 <TableCell>
 <ProcurementProgressBar
 stages={pr.procurementStages || []}
 isRTL={isRTL}
 />
 <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
 {isRTL ? pr.currentStageLabelAr : pr.currentStageLabel}
 </p>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>

 {/* Pagination */}
 {totalPages > 1 && (
 <div className="flex items-center justify-between px-4 py-3 border-t">
 <p className="text-sm text-muted-foreground">
 {page * pageSize + 1}–{Math.min((page + 1) * pageSize, data.total)} / {data.total}
 </p>
 <div className="flex items-center gap-2">
 <Button
 variant="outline"
 size="sm"
 disabled={page === 0}
 onClick={() => setPage(page - 1)}
 >
 {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
 </Button>
 <span className="text-sm">
 {page + 1} / {totalPages}
 </span>
 <Button
 variant="outline"
 size="sm"
 disabled={page >= totalPages - 1}
 onClick={() => setPage(page + 1)}
 >
 {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
 </Button>
 </div>
 </div>
 )}
 </>
 )}
 </CardContent>
 </Card>
 </div>
 </div>
 );
}
