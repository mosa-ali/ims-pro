/**
 * Advance Detail Workspace Page
 * 
 * Full workspace page for viewing a single advance request.
 * New detail page — consolidates advance info, approval workflow,
 * settlement tracking, and version history.
 * 
 * Route: /organization/finance/advances/:id
 * 
 * Features:
 * - Advance header with status badge and approval actions
 * - KPI cards: Requested, Approved, Settled, Outstanding
 * - Tabs: Advance Info, Settlements, Version History
 * - Full bilingual support (Arabic/English) with RTL/LTR
 */
import { useState, useMemo } from "react";
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
 ArrowLeft, ArrowRight, Loader2, DollarSign, Calendar, User,
 FileText, Clock, CheckCircle, XCircle, Send, AlertTriangle,
 Wallet, TrendingUp, Layers, Ban, FolderOpen
} from "lucide-react";
import { EvidencePanel } from "@/components/EvidencePanel";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

// ============================================================================
// TRANSLATIONS
// ============================================================================
// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function AdvanceDetail() {
 const { t } = useTranslation();
 const { id } = useParams<{ id: string }>();
 const advanceId = parseInt(id || "0", 10);
 const navigate = useNavigate();
 const { language, isRTL } = useLanguage();
 const { currentOrganization } = useOrganization();
 const organizationId = currentOrganization?.id || 0;
 // Fetch advance data (includes settlements)
 const { data: advance, isLoading, refetch } = trpc.advances.getById.useQuery(
 { id: advanceId },
 { enabled: advanceId > 0 }
 );

 // Fetch version history
 const { data: versionHistory } = trpc.advances.getVersionHistory.useQuery(
 { id: advanceId },
 { enabled: advanceId > 0 }
 );

 // Mutations
 const submitMutation = trpc.advances.submit.useMutation({
 onSuccess: () => { toast.success(t.advanceDetail.advanceSubmitted); refetch(); },
 });
 const approveMutation = trpc.advances.approve.useMutation({
 onSuccess: () => { toast.success(t.advanceDetail.advanceApproved); refetch(); },
 });
 const rejectMutation = trpc.advances.reject.useMutation({
 onSuccess: () => { toast.success(t.advanceDetail.advanceRejected); refetch(); },
 });

 const formatCurrency = (amount: string | number, currency: string = "USD") => {
 const num = typeof amount === "string" ? parseFloat(amount) : amount;
 return new Intl.NumberFormat('en-US', {
 style: "currency",
 currency,
 }).format(num || 0);
 };

 const formatDate = (date: string | Date | null | undefined) => {
 if (!date) return "—";
 return new Date(date).toLocaleDateString('en-US', {
 year: "numeric", month: "short", day: "numeric",
 });
 };

 const getStatusBadge = (status: string) => {
 const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" }> = {
 DRAFT: { variant: "secondary" },
 PENDING: { variant: "outline" },
 APPROVED: { variant: "default" },
 REJECTED: { variant: "destructive" },
 PARTIALLY_SETTLED: { variant: "outline" },
 FULLY_SETTLED: { variant: "default" },
 CANCELLED: { variant: "secondary" },
 };
 const config = statusConfig[status] || { variant: "secondary" as const };
 return <Badge variant={config.variant}>{(t as any)[status] || status}</Badge>;
 };

 const getSettlementStatusBadge = (status: string) => {
 const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" }> = {
 PENDING: { variant: "outline" },
 APPROVED: { variant: "default" },
 REJECTED: { variant: "destructive" },
 };
 const config = statusConfig[status] || { variant: "secondary" as const };
 return <Badge variant={config.variant}>{(t as any)[status] || status}</Badge>;
 };

 // Loading state
 if (isLoading) {
 return (
 <div className="container mx-auto py-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="flex items-center justify-center min-h-[400px]">
 <div className="text-center space-y-3">
 <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
 <p className="text-muted-foreground">{t.advanceDetail.loading}</p>
 </div>
 </div>
 </div>
 );
 }

 // Not found state
 if (!advance) {
 return (
 <div className="container mx-auto py-6">
 <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
 <Wallet className="h-16 w-16 text-muted-foreground" />
 <h2 className="text-xl font-semibold">{t.advanceDetail.notFound}</h2>
 <p className="text-muted-foreground">{t.advanceDetail.notFoundDesc}</p>
 <BackButton onClick={() => navigate("/organization/finance/advances")} label={t.advanceDetail.goBack} />
 </div>
 </div>
 );
 }

 const canSubmit = advance.status === "DRAFT";
 const canApprove = advance.status === "PENDING";

 const requestedAmt = parseFloat(advance.requestedAmount?.toString() || "0");
 const approvedAmt = parseFloat(advance.approvedAmount?.toString() || "0");
 const settledAmt = parseFloat(advance.settledAmount?.toString() || "0");
 const outstandingAmt = parseFloat(advance.outstandingBalance?.toString() || "0") || (approvedAmt - settledAmt);

 return (
 <div className="container mx-auto py-6">
 <div className="space-y-6">
 {/* Back Button & Header */}
 <div>
 <BackButton onClick={() => navigate("/organization/finance/advances")} label={t.advanceDetail.backToAdvances} />
 <div className="flex items-start justify-between">
 <div className="text-start">
 <h1 className="text-2xl font-bold tracking-tight">
 {isRTL && advance.employeeNameAr ? advance.employeeNameAr : advance.employeeName}
 </h1>
 <div className="flex items-center gap-3 mt-2 text-muted-foreground flex-wrap">
 <span className="font-mono text-sm">{advance.advanceNumber}</span>
 <span>•</span>
 <span>{(t as any)[advance.advanceType] || advance.advanceType}</span>
 <span>•</span>
 {getStatusBadge(advance.status)}
 {advance.department && (
 <>
 <span>•</span>
 <span>{advance.department}</span>
 </>
 )}
 </div>
 </div>
 {/* Action Buttons */}
 <div className="flex items-center gap-2">
 {canSubmit && (
 <Button onClick={() => submitMutation.mutate({ id: advance.id })} size="sm" disabled={submitMutation.isPending}>
 <Send className="h-4 w-4 me-2" />
 {t.advanceDetail.submit}
 </Button>
 )}
 {canApprove && (
 <>
 <Button onClick={() => approveMutation.mutate({ id: advance.id, approvedAmount: requestedAmt })} size="sm" disabled={approveMutation.isPending}>
 <CheckCircle className="h-4 w-4 me-2" />
 {t.advanceDetail.approve}
 </Button>
 <Button onClick={() => rejectMutation.mutate({ id: advance.id, rejectionReason: "Rejected from detail page" })} size="sm" variant="destructive" disabled={rejectMutation.isPending}>
 <XCircle className="h-4 w-4 me-2" />
 {t.advanceDetail.reject}
 </Button>
 </>
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
 <p className="text-xs text-muted-foreground">{t.advanceDetail.requestedAmount}</p>
 <p className="text-xl font-bold text-primary">
 {formatCurrency(requestedAmt, advance.currency)}
 </p>
 </div>
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-5 pb-4">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-lg bg-green-500/10">
 <CheckCircle className="w-5 h-5 text-green-500" />
 </div>
 <div>
 <p className="text-xs text-muted-foreground">{t.advanceDetail.approvedAmount}</p>
 <p className="text-xl font-bold text-green-600">
 {formatCurrency(approvedAmt, advance.currency)}
 </p>
 </div>
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-5 pb-4">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-lg bg-blue-500/10">
 <TrendingUp className="w-5 h-5 text-blue-500" />
 </div>
 <div>
 <p className="text-xs text-muted-foreground">{t.advanceDetail.settledAmount}</p>
 <p className="text-xl font-bold text-blue-600">
 {formatCurrency(settledAmt, advance.currency)}
 </p>
 </div>
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-5 pb-4">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-lg bg-amber-500/10">
 <AlertTriangle className="w-5 h-5 text-amber-500" />
 </div>
 <div>
 <p className="text-xs text-muted-foreground">{t.advanceDetail.outstandingBalance}</p>
 <p className="text-xl font-bold text-amber-600">
 {formatCurrency(outstandingAmt, advance.currency)}
 </p>
 </div>
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Tabs */}
 <Tabs defaultValue="info">
 <TabsList>
 <TabsTrigger value="info" className="flex items-center gap-2">
 <FileText className="h-4 w-4" />
 {t.advanceDetail.advanceInfo}
 </TabsTrigger>
 <TabsTrigger value="settlements" className="flex items-center gap-2">
 <Layers className="h-4 w-4" />
 {t.advanceDetail.settlements}
 </TabsTrigger>
 <TabsTrigger value="evidence" className="flex items-center gap-2">
 <FolderOpen className="h-4 w-4" />
 {t.advanceDetail.evidence}
 </TabsTrigger>
 <TabsTrigger value="versions" className="flex items-center gap-2">
 <Clock className="h-4 w-4" />
 {t.advanceDetail.versionHistory}
 </TabsTrigger>
 </TabsList>

 {/* Advance Information Tab */}
 <TabsContent value="info" className="space-y-6 mt-4">
 <Card>
 <CardHeader>
 <CardTitle className="text-lg">{t.advanceDetail.advanceInfo}</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.advanceDetail.advanceNumber}</Label>
 <p className="font-mono font-medium">{advance.advanceNumber}</p>
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.advanceDetail.employeeName}</Label>
 <div className="flex items-center gap-2">
 <User className="h-4 w-4 text-muted-foreground" />
 <p className="font-medium">{isRTL && advance.employeeNameAr ? advance.employeeNameAr : advance.employeeName}</p>
 </div>
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.advanceDetail.department}</Label>
 <p className="font-medium">{advance.department || "—"}</p>
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.advanceDetail.advanceType}</Label>
 <p className="font-medium">{(t as any)[advance.advanceType] || advance.advanceType}</p>
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.advanceDetail.status}</Label>
 <div>{getStatusBadge(advance.status)}</div>
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.advanceDetail.accountCode}</Label>
 <p className="font-mono font-medium">{advance.accountCode || "—"}</p>
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.advanceDetail.requestDate}</Label>
 <div className="flex items-center gap-2">
 <Calendar className="h-4 w-4 text-muted-foreground" />
 <p className="font-medium">{formatDate(advance.requestDate)}</p>
 </div>
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.advanceDetail.expectedSettlement}</Label>
 <p className="font-medium">{formatDate(advance.expectedSettlementDate)}</p>
 </div>
 {advance.actualSettlementDate && (
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.advanceDetail.actualSettlement}</Label>
 <p className="font-medium">{formatDate(advance.actualSettlementDate)}</p>
 </div>
 )}
 </div>
 {advance.purpose && (
 <>
 <Separator className="my-6" />
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.advanceDetail.purpose}</Label>
 <p className="text-sm whitespace-pre-wrap">
 {isRTL && advance.purposeAr ? advance.purposeAr : advance.purpose}
 </p>
 </div>
 </>
 )}
 {advance.notes && (
 <>
 <Separator className="my-6" />
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.advanceDetail.notes}</Label>
 <p className="text-sm whitespace-pre-wrap">{advance.notes}</p>
 </div>
 </>
 )}
 {advance.rejectionReason && (
 <>
 <Separator className="my-6" />
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider text-destructive">{t.advanceDetail.rejectionReason}</Label>
 <p className="text-sm whitespace-pre-wrap text-destructive">{advance.rejectionReason}</p>
 </div>
 </>
 )}
 </CardContent>
 </Card>
 </TabsContent>

 {/* Settlements Tab */}
 <TabsContent value="settlements" className="space-y-6 mt-4">
 <Card>
 <CardHeader>
 <CardTitle className="text-lg">{t.advanceDetail.settlements}</CardTitle>
 </CardHeader>
 <CardContent>
 {advance.settlements && advance.settlements.length > 0 ? (
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.advanceDetail.settlementNumber}</TableHead>
 <TableHead>{t.advanceDetail.settlementDate}</TableHead>
 <TableHead>{t.advanceDetail.description}</TableHead>
 <TableHead>{t.advanceDetail.expenseCategory}</TableHead>
 <TableHead>{t.advanceDetail.receiptNumber}</TableHead>
 <TableHead>{t.advanceDetail.settlementStatus}</TableHead>
 <TableHead className="text-end">{t.advanceDetail.settlementAmount}</TableHead>
 <TableHead className="text-end">{t.advanceDetail.refundAmount}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {advance.settlements.map((s: any) => (
 <TableRow key={s.id}>
 <TableCell className="font-mono">{s.settlementNumber}</TableCell>
 <TableCell>{formatDate(s.settlementDate)}</TableCell>
 <TableCell>{(isRTL && s.descriptionAr ? s.descriptionAr : s.description) || "—"}</TableCell>
 <TableCell>{s.expenseCategory || "—"}</TableCell>
 <TableCell>{s.receiptNumber || "—"}</TableCell>
 <TableCell>{getSettlementStatusBadge(s.status)}</TableCell>
 <TableCell className="text-end font-medium">
 {formatCurrency(s.settledAmount, s.currency || advance.currency)}
 </TableCell>
 <TableCell className="text-end">
 {s.refundAmount && parseFloat(s.refundAmount) > 0
 ? formatCurrency(s.refundAmount, s.currency || advance.currency)
 : "—"}
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 ) : (
 <div className="text-center py-12 text-muted-foreground">
 <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
 <p>{t.advanceDetail.noSettlements}</p>
 </div>
 )}
 </CardContent>
 </Card>
 </TabsContent>

 {/* Evidence Documents Tab */}
 <TabsContent value="evidence" className="space-y-6 mt-4">
 <EvidencePanel entityType="Advance" entityId={advance.id} />
 </TabsContent>

 {/* Version History Tab */}
 <TabsContent value="versions" className="space-y-6 mt-4">
 <Card>
 <CardHeader>
 <CardTitle className="text-lg">{t.advanceDetail.versionHistory}</CardTitle>
 </CardHeader>
 <CardContent>
 {versionHistory && versionHistory.length > 0 ? (
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.advanceDetail.version}</TableHead>
 <TableHead>{t.advanceDetail.date}</TableHead>
 <TableHead>{t.advanceDetail.requestedAmount}</TableHead>
 <TableHead>{t.advanceDetail.status}</TableHead>
 <TableHead>{t.advanceDetail.reason}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {versionHistory.map((ver: any) => (
 <TableRow key={ver.id}>
 <TableCell className="font-mono">v{ver.version || 1}</TableCell>
 <TableCell>{formatDate(ver.createdAt)}</TableCell>
 <TableCell className="font-medium">
 {formatCurrency(ver.requestedAmount, ver.currency || advance.currency)}
 </TableCell>
 <TableCell>{getStatusBadge(ver.status)}</TableCell>
 <TableCell>{ver.revisionReason || "—"}</TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 ) : (
 <div className="text-center py-12 text-muted-foreground">
 <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
 <p>{t.advanceDetail.noVersionHistory}</p>
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
