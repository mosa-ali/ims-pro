/**
 * Reconciliation Detail Workspace Page
 * 
 * Full workspace page for viewing a single bank reconciliation.
 * Replaces the modal dialog in TreasuryCashManagement.
 * 
 * Route: /organization/finance/treasury/reconciliation/:id
 * 
 * Features:
 * - Reconciliation header with status badge
 * - KPI cards: Statement Balance, Book Balance, Difference, Transaction Count
 * - Tabs: Summary, Matched Transactions, Unmatched Transactions
 * - Full bilingual support (Arabic/English) with RTL/LTR
 */
import { useMemo } from "react";
import { useParams } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useNavigate } from "@/lib/router-compat";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
 ArrowLeft, ArrowRight, Loader2, DollarSign, Calendar, FileText,
 CheckCircle, XCircle, AlertTriangle, Landmark, Scale, ArrowUpDown,
 Clock, Play, Check, Ban
} from "lucide-react";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

// ============================================================================
// TRANSLATIONS
// ============================================================================
// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function ReconciliationDetail() {
 const { t } = useTranslation();
 const { id } = useParams<{ id: string }>();
 const reconId = parseInt(id || "0", 10);
 const navigate = useNavigate();
 const { language, isRTL } = useLanguage();
 const { currentOrganization } = useOrganization();
 // Fetch reconciliation with summary (includes transactions)
 const { data: summary, isLoading, refetch } = trpc.bankReconciliations.getSummary.useQuery(
 { id: reconId },
 { enabled: reconId > 0 }
 );

 // Fetch basic reconciliation data as fallback
 const { data: recon } = trpc.bankReconciliations.getById.useQuery(
 { id: reconId },
 { enabled: reconId > 0 && !summary }
 );

 // Mutations
 const startMutation = trpc.bankReconciliations.startReconciliation.useMutation({
 onSuccess: () => { toast.success(t.reconciliationDetail.reconciliationStarted); refetch(); },
 });
 const completeMutation = trpc.bankReconciliations.completeReconciliation.useMutation({
 onSuccess: () => { toast.success(t.reconciliationDetail.reconciliationCompleted); refetch(); },
 });
 const approveMutation = trpc.bankReconciliations.approveReconciliation.useMutation({
 onSuccess: () => { toast.success(t.reconciliationDetail.reconciliationApproved); refetch(); },
 });

 const data = summary || recon;

 const formatCurrency = (amount: string | number | null | undefined) => {
 const num = typeof amount === "string" ? parseFloat(amount) : (amount || 0);
 return new Intl.NumberFormat('en-US', {
 style: "currency",
 currency: "USD",
 }).format(num);
 };

 const formatDate = (date: string | Date | null | undefined) => {
 if (!date) return "—";
 return new Date(date).toLocaleDateString('en-US', {
 year: "numeric", month: "short", day: "numeric",
 });
 };

 const getStatusBadge = (status: string) => {
 const statusConfig: Record<string, { color: string }> = {
 draft: { color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400" },
 in_progress: { color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
 completed: { color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
 approved: { color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
 };
 const config = statusConfig[status] || statusConfig.draft;
 return <Badge className={config.color}>{(t as any)[status] || status}</Badge>;
 };

 // Loading state
 if (isLoading) {
 return (
 <div className="container mx-auto py-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="flex items-center justify-center min-h-[400px]">
 <div className="text-center space-y-3">
 <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
 <p className="text-muted-foreground">{t.reconciliationDetail.loading}</p>
 </div>
 </div>
 </div>
 );
 }

 // Not found state
 if (!data) {
 return (
 <div className="container mx-auto py-6">
 <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
 <Scale className="h-16 w-16 text-muted-foreground" />
 <h2 className="text-xl font-semibold">{t.reconciliationDetail.notFound}</h2>
 <p className="text-muted-foreground">{t.reconciliationDetail.notFoundDesc}</p>
 <BackButton onClick={() => navigate("/organization/finance/treasury")} label={t.reconciliationDetail.goBack} />
 </div>
 </div>
 );
 }

 const canStart = data.status === "draft";
 const canComplete = data.status === "in_progress";
 const canApprove = data.status === "completed";

 const differenceNum = parseFloat(data.difference?.toString() || "0");
 const isBalanced = Math.abs(differenceNum) < 0.01;

 return (
 <div className="container mx-auto py-6">
 <div className="space-y-6">
 {/* Back Button & Header */}
 <div>
 <BackButton onClick={() => navigate("/organization/finance/treasury")} label={t.reconciliationDetail.backToTreasury} />
 <div className="flex items-start justify-between">
 <div className="text-start">
 <h1 className="text-2xl font-bold tracking-tight">
 {data.reconciliationNumber}
 </h1>
 <div className="flex items-center gap-3 mt-2 text-muted-foreground flex-wrap">
 <span>{formatDate(data.reconciliationDate)}</span>
 <span>•</span>
 {getStatusBadge(data.status!)}
 {isBalanced ? (
 <>
 <span>•</span>
 <span className="text-green-600 flex items-center gap-1">
 <CheckCircle className="h-3.5 w-3.5" />
 Balanced
 </span>
 </>
 ) : (
 <>
 <span>•</span>
 <span className="text-amber-600 flex items-center gap-1">
 <AlertTriangle className="h-3.5 w-3.5" />
 {formatCurrency(differenceNum)} difference
 </span>
 </>
 )}
 </div>
 </div>
 {/* Action Buttons */}
 <div className="flex items-center gap-2">
 {canStart && (
 <Button onClick={() => startMutation.mutate({ id: data.id })} size="sm" disabled={startMutation.isPending}>
 <Play className="h-4 w-4 me-2" />
 {t.reconciliationDetail.startReconciliation}
 </Button>
 )}
 {canComplete && (
 <Button
 onClick={() => completeMutation.mutate({ id: data.id, reconciledBalance: data.bookBalance?.toString() || "0" })}
 size="sm"
 disabled={completeMutation.isPending}
 >
 <Check className="h-4 w-4 me-2" />
 {t.reconciliationDetail.completeReconciliation}
 </Button>
 )}
 {canApprove && (
 <Button onClick={() => approveMutation.mutate({ id: data.id })} size="sm" disabled={approveMutation.isPending}>
 <CheckCircle className="h-4 w-4 me-2" />
 {t.reconciliationDetail.approveReconciliation}
 </Button>
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
 <Landmark className="w-5 h-5 text-primary" />
 </div>
 <div>
 <p className="text-xs text-muted-foreground">{t.reconciliationDetail.statementBalance}</p>
 <p className="text-xl font-bold text-primary">
 {formatCurrency(data.statementBalance)}
 </p>
 </div>
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-5 pb-4">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-lg bg-blue-500/10">
 <DollarSign className="w-5 h-5 text-blue-500" />
 </div>
 <div>
 <p className="text-xs text-muted-foreground">{t.reconciliationDetail.bookBalance}</p>
 <p className="text-xl font-bold text-blue-600">
 {formatCurrency(data.bookBalance)}
 </p>
 </div>
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-5 pb-4">
 <div className="flex items-center gap-3">
 <div className={`p-2 rounded-lg ${isBalanced ? "bg-green-500/10" : "bg-amber-500/10"}`}>
 <Scale className={`w-5 h-5 ${isBalanced ? "text-green-500" : "text-amber-500"}`} />
 </div>
 <div>
 <p className="text-xs text-muted-foreground">{t.reconciliationDetail.difference}</p>
 <p className={`text-xl font-bold ${isBalanced ? "text-green-600" : "text-amber-600"}`}>
 {formatCurrency(differenceNum)}
 </p>
 </div>
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-5 pb-4">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-lg bg-purple-500/10">
 <ArrowUpDown className="w-5 h-5 text-purple-500" />
 </div>
 <div>
 <p className="text-xs text-muted-foreground">{t.reconciliationDetail.transactionCount}</p>
 <p className="text-xl font-bold">
 {(summary as any)?.transactionCount || 0}
 </p>
 </div>
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Tabs */}
 <Tabs defaultValue="summary">
 <TabsList>
 <TabsTrigger value="summary" className="flex items-center gap-2">
 <FileText className="h-4 w-4" />
 {t.reconciliationDetail.summary}
 </TabsTrigger>
 <TabsTrigger value="matched" className="flex items-center gap-2">
 <CheckCircle className="h-4 w-4" />
 {t.reconciliationDetail.matchedTransactions}
 </TabsTrigger>
 </TabsList>

 {/* Summary Tab */}
 <TabsContent value="summary" className="space-y-6 mt-4">
 <Card>
 <CardHeader>
 <CardTitle className="text-lg">{t.reconciliationDetail.summary}</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.reconciliationDetail.reconciliationNumber}</Label>
 <p className="font-mono font-medium">{data.reconciliationNumber}</p>
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.reconciliationDetail.reconciliationDate}</Label>
 <div className="flex items-center gap-2">
 <Calendar className="h-4 w-4 text-muted-foreground" />
 <p className="font-medium">{formatDate(data.reconciliationDate)}</p>
 </div>
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.reconciliationDetail.statementDate}</Label>
 <p className="font-medium">{formatDate(data.statementDate)}</p>
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.reconciliationDetail.status}</Label>
 <div>{getStatusBadge(data.status!)}</div>
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.reconciliationDetail.statementBalance}</Label>
 <p className="font-medium">{formatCurrency(data.statementBalance)}</p>
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.reconciliationDetail.bookBalance}</Label>
 <p className="font-medium">{formatCurrency(data.bookBalance)}</p>
 </div>
 {data.adjustedBookBalance && (
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.reconciliationDetail.adjustedBookBalance}</Label>
 <p className="font-medium">{formatCurrency(data.adjustedBookBalance)}</p>
 </div>
 )}
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.reconciliationDetail.outstandingDeposits}</Label>
 <p className="font-medium">{formatCurrency(data.outstandingDeposits)}</p>
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.reconciliationDetail.outstandingCheques}</Label>
 <p className="font-medium">{formatCurrency(data.outstandingCheques)}</p>
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.reconciliationDetail.difference}</Label>
 <p className={`font-medium ${isBalanced ? "text-green-600" : "text-amber-600"}`}>
 {formatCurrency(differenceNum)}
 </p>
 </div>
 </div>
 {/* Summary totals from getSummary */}
 {summary && (
 <>
 <Separator className="my-6" />
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.reconciliationDetail.totalCredits}</Label>
 <p className="font-medium text-green-600">{formatCurrency((summary as any).totalCredits)}</p>
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.reconciliationDetail.totalDebits}</Label>
 <p className="font-medium text-red-600">{formatCurrency((summary as any).totalDebits)}</p>
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.reconciliationDetail.netMovement}</Label>
 <p className="font-medium">{formatCurrency((summary as any).netMovement)}</p>
 </div>
 </div>
 </>
 )}
 {data.notes && (
 <>
 <Separator className="my-6" />
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.reconciliationDetail.notes}</Label>
 <p className="text-sm whitespace-pre-wrap">{data.notes}</p>
 </div>
 </>
 )}
 </CardContent>
 </Card>
 </TabsContent>

 {/* Matched Transactions Tab */}
 <TabsContent value="matched" className="space-y-6 mt-4">
 <Card>
 <CardHeader>
 <CardTitle className="text-lg">{t.reconciliationDetail.matchedTransactions}</CardTitle>
 </CardHeader>
 <CardContent>
 {summary && (summary as any).transactions && (summary as any).transactions.length > 0 ? (
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="text-center">{t.reconciliationDetail.transactionDate}</TableHead>
 <TableHead>{t.reconciliationDetail.reference}</TableHead>
 <TableHead>{t.reconciliationDetail.description}</TableHead>
 <TableHead>{t.reconciliationDetail.type}</TableHead>
 <TableHead className="text-end">{t.reconciliationDetail.amount}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {(summary as any).transactions.map((tx: any) => (
 <TableRow key={tx.id}>
 <TableCell>{formatDate(tx.transactionDate)}</TableCell>
 <TableCell className="font-mono">{tx.reference || "—"}</TableCell>
 <TableCell>{tx.description || "—"}</TableCell>
 <TableCell>
 <Badge variant={tx.transactionType === "credit" ? "default" : "outline"}>
 {tx.transactionType === "credit" ? t.reconciliationDetail.credit : t.reconciliationDetail.debit}
 </Badge>
 </TableCell>
 <TableCell className={`text-end font-medium ${tx.transactionType === "credit" ? "text-green-600" : "text-red-600"}`}>
 {formatCurrency(tx.amount)}
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 ) : (
 <div className="text-center py-12 text-muted-foreground">
 <ArrowUpDown className="h-12 w-12 mx-auto mb-3 opacity-30" />
 <p>{t.reconciliationDetail.noTransactions}</p>
 </div>
 )}
 </CardContent>
 </Card>
 </TabsContent>
 </Tabs>
 </div>
 </div>
 );
}
