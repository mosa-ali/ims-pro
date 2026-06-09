/**
 * Payment Detail Workspace Page
 * 
 * Full workspace page for viewing a single payment's details.
 * Replaces the modal-based view dialog with a dedicated route.
 * 
 * Route: /organization/finance/payments/:id
 * 
 * Features:
 * - Payment header with status badge and approval workflow actions
 * - Tabs: Payment Info, Payment Lines, Approval History, Version History
 * - Full bilingual support (Arabic/English) with RTL/LTR
 */
import { useState } from "react";
import { useParams } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOperatingUnit } from "@/contexts/OperatingUnitContext";
import { useNavigate } from "@/lib/router-compat";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
 ArrowLeft, ArrowRight, CreditCard, FileText, Loader2,
 DollarSign, Calendar, Building2, User, Clock, CheckCircle,
 XCircle, Send, AlertTriangle, Ban, Play, Check, Layers, FolderOpen
} from "lucide-react";
import { EvidencePanel } from "@/components/EvidencePanel";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

// ============================================================================
// TRANSLATIONS
// ============================================================================
type ApprovalAction = "submit" | "approve" | "reject" | "cancel" | "complete";

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function PaymentDetail() {
 const { t } = useTranslation();
 const { id } = useParams<{ id: string }>();
 const paymentId = parseInt(id || "0", 10);
 const navigate = useNavigate();
 const { language, isRTL } = useLanguage();
 const [activeTab, setActiveTab] = useState("info");
 const [showApprovalDialog, setShowApprovalDialog] = useState(false);
 const [approvalAction, setApprovalAction] = useState<ApprovalAction | null>(null);
 const [approvalNotes, setApprovalNotes] = useState("");
 const [transactionRef, setTransactionRef] = useState("");

 // Fetch payment data
 const { data: payment, isLoading, refetch } = trpc.payments.getById.useQuery(
 { id: paymentId },
 { enabled: paymentId > 0 }
 );

 // Fetch version history
 const { data: versionHistory } = trpc.payments.getVersionHistory.useQuery(
 { id: paymentId },
 { enabled: paymentId > 0 }
 );

 // Mutations
 const submitMutation = trpc.payments.submitForApproval.useMutation({
 onSuccess: () => { toast.success(t.paymentDetail.paymentSubmitted); refetch(); setShowApprovalDialog(false); },
 });
 const approveMutation = trpc.payments.approve.useMutation({
 onSuccess: () => { toast.success(t.paymentDetail.paymentApproved); refetch(); setShowApprovalDialog(false); },
 });
 const rejectMutation = trpc.payments.reject.useMutation({
 onSuccess: () => { toast.success(t.paymentDetail.paymentRejected); refetch(); setShowApprovalDialog(false); },
 });
 const completeMutation = trpc.payments.complete.useMutation({
 onSuccess: () => { toast.success(t.paymentDetail.paymentCompleted); refetch(); setShowApprovalDialog(false); },
 });
 const cancelMutation = trpc.payments.cancel.useMutation({
 onSuccess: () => { toast.success(t.paymentDetail.paymentCancelled); refetch(); setShowApprovalDialog(false); },
 });

 const handleApprovalAction = () => {
 if (!payment || !approvalAction) return;
 switch (approvalAction) {
 case "submit": submitMutation.mutate({ id: payment.id }); break;
 case "approve": approveMutation.mutate({ id: payment.id, approvalNotes: approvalNotes || undefined }); break;
 case "reject": rejectMutation.mutate({ id: payment.id, rejectionReason: approvalNotes }); break;
 case "cancel": cancelMutation.mutate({ id: payment.id, cancellationReason: approvalNotes }); break;
 case "complete": completeMutation.mutate({ id: payment.id, transactionReference: transactionRef || undefined }); break;
 }
 };

 const openApprovalDialog = (action: ApprovalAction) => {
 setApprovalAction(action);
 setApprovalNotes("");
 setTransactionRef("");
 setShowApprovalDialog(true);
 };

 const getStatusBadge = (status: string) => {
 const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
 draft: { variant: "secondary", icon: Clock },
 pending_approval: { variant: "outline", icon: Clock },
 approved: { variant: "default", icon: CheckCircle },
 rejected: { variant: "destructive", icon: XCircle },
 processing: { variant: "outline", icon: Play },
 completed: { variant: "default", icon: Check },
 cancelled: { variant: "secondary", icon: Ban },
 failed: { variant: "destructive", icon: AlertTriangle },
 };
 const config = statusConfig[status] || statusConfig.draft;
 const Icon = config.icon;
 return (
 <Badge variant={config.variant} className="gap-1">
 <Icon className="h-3 w-3" />
 {(t as any)[status] || status}
 </Badge>
 );
 };

 const formatCurrency = (amount: string | number) => {
 const num = typeof amount === "string" ? parseFloat(amount) : amount;
 return new Intl.NumberFormat('en-US', {
 style: "currency",
 currency: "USD",
 }).format(num || 0);
 };

 const formatDate = (date: string | Date) => {
 return new Date(date).toLocaleDateString('en-US', {
 year: "numeric",
 month: "short",
 day: "numeric",
 });
 };

 // Loading state
 if (isLoading) {
 return (
 <div className="container mx-auto py-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="flex items-center justify-center min-h-[400px]">
 <div className="text-center space-y-3">
 <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
 <p className="text-muted-foreground">{t.paymentDetail.loading}</p>
 </div>
 </div>
 </div>
 );
 }

 // Not found state
 if (!payment) {
 return (
 <div className="container mx-auto py-6">
 <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
 <CreditCard className="h-16 w-16 text-muted-foreground" />
 <h2 className="text-xl font-semibold">{t.paymentDetail.notFound}</h2>
 <p className="text-muted-foreground">{t.paymentDetail.notFoundDesc}</p>
 <BackButton onClick={() => navigate("/organization/finance/payments")} label={t.paymentDetail.goBack} />
 </div>
 </div>
 );
 }

 const canSubmit = payment.status === "draft";
 const canApprove = payment.status === "pending_approval";
 const canComplete = payment.status === "approved";
 const canCancel = ["draft", "pending_approval", "approved"].includes(payment.status);

 return (
 <div className="container mx-auto py-6">
 <div className="space-y-6">
 {/* Back Button & Header */}
 <div>
 <BackButton onClick={() => navigate("/organization/finance/payments")} label={t.paymentDetail.backToPayments} />
 <div className="flex items-start justify-between">
 <div className="text-start">
 <h1 className="text-2xl font-bold tracking-tight">
 {isRTL && payment.payeeNameAr ? payment.payeeNameAr : payment.payeeName}
 </h1>
 <div className="flex items-center gap-3 mt-2 text-muted-foreground">
 <span className="font-mono text-sm">{payment.paymentNumber}</span>
 <span>•</span>
 <span>{(t as any)[payment.paymentType] || payment.paymentType}</span>
 <span>•</span>
 <span className="font-semibold text-foreground text-lg">{formatCurrency(payment.totalAmount)}</span>
 <span>•</span>
 {getStatusBadge(payment.status)}
 </div>
 </div>
 {/* Action Buttons */}
 <div className="flex items-center gap-2">
 {canSubmit && (
 <Button onClick={() => openApprovalDialog("submit")} size="sm">
 <Send className="h-4 w-4 me-2" />
 {t.paymentDetail.submit}
 </Button>
 )}
 {canApprove && (
 <>
 <Button onClick={() => openApprovalDialog("approve")} size="sm">
 <CheckCircle className="h-4 w-4 me-2" />
 {t.paymentDetail.approve}
 </Button>
 <Button onClick={() => openApprovalDialog("reject")} size="sm" variant="destructive">
 <XCircle className="h-4 w-4 me-2" />
 {t.paymentDetail.reject}
 </Button>
 </>
 )}
 {canComplete && (
 <Button onClick={() => openApprovalDialog("complete")} size="sm">
 <Check className="h-4 w-4 me-2" />
 {t.paymentDetail.complete}
 </Button>
 )}
 {canCancel && (
 <Button onClick={() => openApprovalDialog("cancel")} size="sm" variant="outline">
 <Ban className="h-4 w-4 me-2" />
 {t.paymentDetail.cancel}
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
 <DollarSign className="w-5 h-5 text-primary" />
 </div>
 <div>
 <p className="text-xs text-muted-foreground">{t.paymentDetail.totalAmount}</p>
 <p className="text-xl font-bold text-primary">{formatCurrency(payment.totalAmount)}</p>
 </div>
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-5 pb-4">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-lg bg-blue-500/10">
 <Calendar className="w-5 h-5 text-blue-500" />
 </div>
 <div>
 <p className="text-xs text-muted-foreground">{t.paymentDetail.paymentDate}</p>
 <p className="text-xl font-bold">{formatDate(payment.paymentDate)}</p>
 </div>
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-5 pb-4">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-lg bg-green-500/10">
 <CreditCard className="w-5 h-5 text-green-500" />
 </div>
 <div>
 <p className="text-xs text-muted-foreground">{t.paymentDetail.paymentMethod}</p>
 <p className="text-lg font-bold">{(t as any)[payment.paymentMethod] || payment.paymentMethod}</p>
 </div>
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-5 pb-4">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-lg bg-amber-500/10">
 <FileText className="w-5 h-5 text-amber-500" />
 </div>
 <div>
 <p className="text-xs text-muted-foreground">{t.paymentDetail.reference}</p>
 <p className="text-lg font-bold">{payment.reference || "—"}</p>
 </div>
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Tabs */}
 <Tabs value={activeTab} onValueChange={setActiveTab}>
 <TabsList>
 <TabsTrigger value="info" className="flex items-center gap-2">
 <FileText className="h-4 w-4" />
 {t.paymentDetail.paymentInfo}
 </TabsTrigger>
 <TabsTrigger value="lines" className="flex items-center gap-2">
 <Layers className="h-4 w-4" />
 {t.paymentDetail.paymentLines}
 </TabsTrigger>
 <TabsTrigger value="evidence" className="flex items-center gap-2">
 <FolderOpen className="h-4 w-4" />
 {t.paymentDetail.evidence}
 </TabsTrigger>
 <TabsTrigger value="versions" className="flex items-center gap-2">
 <Clock className="h-4 w-4" />
 {t.paymentDetail.versionHistory}
 </TabsTrigger>
 </TabsList>

 {/* Payment Information Tab */}
 <TabsContent value="info" className="space-y-6 mt-4">
 <Card>
 <CardHeader>
 <CardTitle className="text-lg">{t.paymentDetail.paymentInfo}</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.paymentDetail.paymentNumber}</Label>
 <p className="font-mono font-medium">{payment.paymentNumber}</p>
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.paymentDetail.payee}</Label>
 <p className="font-medium">{isRTL && payment.payeeNameAr ? payment.payeeNameAr : payment.payeeName}</p>
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.paymentDetail.status}</Label>
 <div>{getStatusBadge(payment.status)}</div>
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.paymentDetail.paymentType}</Label>
 <p className="font-medium">{(t as any)[payment.paymentType] || payment.paymentType}</p>
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.paymentDetail.paymentMethod}</Label>
 <p className="font-medium">{(t as any)[payment.paymentMethod] || payment.paymentMethod}</p>
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.paymentDetail.totalAmount}</Label>
 <p className="font-medium text-lg">{formatCurrency(payment.totalAmount)}</p>
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.paymentDetail.paymentDate}</Label>
 <p className="font-medium">{formatDate(payment.paymentDate)}</p>
 </div>
 {payment.dueDate && (
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.paymentDetail.dueDate}</Label>
 <p className="font-medium">{formatDate(payment.dueDate)}</p>
 </div>
 )}
 {payment.reference && (
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.paymentDetail.reference}</Label>
 <p className="font-medium">{payment.reference}</p>
 </div>
 )}
 </div>
 {payment.description && (
 <>
 <Separator className="my-6" />
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.paymentDetail.description}</Label>
 <p className="text-sm whitespace-pre-wrap">{payment.description}</p>
 </div>
 </>
 )}
 {/* Payee Bank Info */}
 {(payment.payeeBankName || payment.payeeBankAccount || payment.payeeIban) && (
 <>
 <Separator className="my-6" />
 <h4 className="font-semibold mb-4 flex items-center gap-2">
 <Building2 className="h-4 w-4" />
 {t.paymentDetail.payeeBankInfo}
 </h4>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.paymentDetail.payeeBankName}</Label>
 <p className="font-medium">{payment.payeeBankName || "—"}</p>
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.paymentDetail.payeeBankAccount}</Label>
 <p className="font-medium">{payment.payeeBankAccount || "—"}</p>
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.paymentDetail.payeeIban}</Label>
 <p className="font-medium">{payment.payeeIban || "—"}</p>
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.paymentDetail.payeeSwiftCode}</Label>
 <p className="font-medium">{payment.payeeSwiftCode || "—"}</p>
 </div>
 </div>
 </>
 )}
 </CardContent>
 </Card>
 </TabsContent>

 {/* Payment Lines Tab */}
 <TabsContent value="lines" className="space-y-6 mt-4">
 <Card>
 <CardHeader>
 <CardTitle className="text-lg">{t.paymentDetail.paymentLines}</CardTitle>
 </CardHeader>
 <CardContent>
 {payment.lines && payment.lines.length > 0 ? (
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.paymentDetail.lineNumber}</TableHead>
 <TableHead>{t.paymentDetail.lineDescription}</TableHead>
 <TableHead>{t.paymentDetail.lineBudgetCode}</TableHead>
 <TableHead>{t.paymentDetail.lineAccountCode}</TableHead>
 <TableHead className="text-end">{t.paymentDetail.lineAmount}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {payment.lines.map((line: any) => (
 <TableRow key={line.id}>
 <TableCell className="font-mono">{line.lineNumber}</TableCell>
 <TableCell>{line.description || "—"}</TableCell>
 <TableCell className="font-mono">{line.budgetCode || "—"}</TableCell>
 <TableCell className="font-mono">{line.accountCode || "—"}</TableCell>
 <TableCell className="text-end font-medium">{formatCurrency(line.amount)}</TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 ) : (
 <div className="text-center py-12 text-muted-foreground">
 <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
 <p>{t.paymentDetail.noLines}</p>
 </div>
 )}
 </CardContent>
 </Card>
 </TabsContent>

 {/* Evidence Documents Tab */}
 <TabsContent value="evidence" className="space-y-6 mt-4">
 <EvidencePanel entityType="Payment" entityId={payment.id} />
 </TabsContent>

 {/* Version History Tab */}
 <TabsContent value="versions" className="space-y-6 mt-4">
 <Card>
 <CardHeader>
 <CardTitle className="text-lg">{t.paymentDetail.versionHistory}</CardTitle>
 </CardHeader>
 <CardContent>
 {versionHistory && versionHistory.length > 0 ? (
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.paymentDetail.version}</TableHead>
 <TableHead>{t.paymentDetail.date}</TableHead>
 <TableHead>{t.paymentDetail.totalAmount}</TableHead>
 <TableHead>{t.paymentDetail.status}</TableHead>
 <TableHead>{t.paymentDetail.reason}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {versionHistory.map((ver: any) => (
 <TableRow key={ver.id}>
 <TableCell className="font-mono">v{ver.version || 1}</TableCell>
 <TableCell>{formatDate(ver.createdAt)}</TableCell>
 <TableCell className="font-medium">{formatCurrency(ver.totalAmount)}</TableCell>
 <TableCell>{getStatusBadge(ver.status)}</TableCell>
 <TableCell>{ver.revisionReason || "—"}</TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 ) : (
 <div className="text-center py-12 text-muted-foreground">
 <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
 <p>{t.paymentDetail.noVersionHistory}</p>
 </div>
 )}
 </CardContent>
 </Card>
 </TabsContent>
 </Tabs>
 </div>

 {/* Approval Action Dialog */}
 <Dialog open={showApprovalDialog} onOpenChange={(open) => {
 setShowApprovalDialog(open);
 if (!open) { setApprovalAction(null); setApprovalNotes(""); setTransactionRef(""); }
 }}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>
 {approvalAction === "submit" && t.paymentDetail.confirmSubmit}
 {approvalAction === "approve" && t.paymentDetail.confirmApprove}
 {approvalAction === "reject" && t.paymentDetail.confirmReject}
 {approvalAction === "cancel" && t.paymentDetail.confirmCancel}
 {approvalAction === "complete" && t.paymentDetail.confirmComplete}
 </DialogTitle>
 <DialogDescription>
 {approvalAction === "submit" && t.paymentDetail.submitMessage}
 {approvalAction === "approve" && t.paymentDetail.approveMessage}
 {approvalAction === "reject" && t.paymentDetail.rejectMessage}
 {approvalAction === "cancel" && t.paymentDetail.cancelMessage}
 {approvalAction === "complete" && t.paymentDetail.completeMessage}
 </DialogDescription>
 </DialogHeader>
 {(approvalAction === "approve" || approvalAction === "reject" || approvalAction === "cancel") && (
 <div className="space-y-2">
 <Label>
 {approvalAction === "approve" && t.paymentDetail.approvalNotes}
 {approvalAction === "reject" && t.paymentDetail.rejectionReason}
 {approvalAction === "cancel" && t.paymentDetail.cancellationReason}
 {(approvalAction === "reject" || approvalAction === "cancel") && " *"}
 </Label>
 <Textarea
 value={approvalNotes}
 onChange={(e) => setApprovalNotes(e.target.value)}
 rows={3}
 />
 </div>
 )}
 {approvalAction === "complete" && (
 <div className="space-y-2">
 <Label>{t.paymentDetail.transactionReference}</Label>
 <Input
 value={transactionRef}
 onChange={(e) => setTransactionRef(e.target.value)}
 placeholder={t.placeholders.bankTransactionReference}
 />
 </div>
 )}
 <DialogFooter>
 <Button variant="outline" onClick={() => {
 setShowApprovalDialog(false);
 setApprovalAction(null);
 setApprovalNotes("");
 setTransactionRef("");
 }}>
 {t.paymentDetail.cancel}
 </Button>
 <Button
 onClick={handleApprovalAction}
 variant={approvalAction === "reject" || approvalAction === "cancel" ? "destructive" : "default"}
 disabled={
 submitMutation.isPending ||
 approveMutation.isPending ||
 rejectMutation.isPending ||
 cancelMutation.isPending ||
 completeMutation.isPending
 }
 >
 {approvalAction === "submit" && t.paymentDetail.submit}
 {approvalAction === "approve" && t.paymentDetail.approve}
 {approvalAction === "reject" && t.paymentDetail.reject}
 {approvalAction === "cancel" && t.paymentDetail.cancel}
 {approvalAction === "complete" && t.paymentDetail.complete}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
