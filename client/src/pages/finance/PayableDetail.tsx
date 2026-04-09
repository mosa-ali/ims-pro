import { BackButton } from "@/components/BackButton";
/**
 * Payable Detail Page
 * 
 * Shows comprehensive payable information with:
 * - Full payable details (ID, PR, PO, GRN, vendor, amount, dates)
 * - Status badge and history
 * - Three action buttons for pending_approval: Approve, Reject, Cancel
 * - Confirmation dialogs with optional reason fields
 */

import { useTranslation } from '@/i18n/useTranslation';
import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, AlertCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from '@/contexts/LanguageContext';
import {
 AlertDialog,
 AlertDialogAction,
 AlertDialogCancel,
 AlertDialogContent,
 AlertDialogDescription,
 AlertDialogHeader,
 AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function PayableDetail() {
  const { t } = useTranslation();
  const { language, isRTL} = useLanguage();
 const [, setLocation] = useLocation();
 const [match, params] = useRoute("/organization/finance/payables/:id");
 const payableId = params?.id ? parseInt(params.id) : null;

 const [approvalDialog, setApprovalDialog] = useState<{open: boolean, action?: 'approve' | 'reject' | 'cancel'}>({open: false});
 const [approvalReason, setApprovalReason] = useState("");

 // Fetch payable details
 const { data: payables, isLoading } = trpc.prFinance.getPayablesList.useQuery({});
 const payable = payables?.find(p => p.id === payableId);

 // Mutations
 const statusUpdateMutation = trpc.prFinance.updatePayableStatus.useMutation({
 onSuccess: (data) => {
 toast.success(data.message);
 setApprovalDialog({open: false});
 setApprovalReason("");
 setTimeout(() => setLocation("/organization/finance/payables"), 1000);
 },
 onError: (error) => {
 toast.error(error.message || "Failed to update status");
 },
 });

 const rejectPayableMutation = trpc.prFinance.rejectPayable.useMutation({
 onSuccess: (data) => {
 toast.success(data.message);
 setApprovalDialog({open: false});
 setApprovalReason("");
 setTimeout(() => setLocation("/organization/finance/payables"), 1000);
 },
 onError: (error) => {
 toast.error(error.message || "Failed to reject payable");
 },
 });

 const cancelPayableMutation = trpc.prFinance.cancelPayable.useMutation({
 onSuccess: (data) => {
 toast.success(data.message);
 setApprovalDialog({open: false});
 setApprovalReason("");
 setTimeout(() => setLocation("/organization/finance/payables"), 1000);
 },
 onError: (error) => {
 toast.error(error.message || "Failed to cancel payable");
 },
 });

 const handleApprovalAction = async () => {
 if (!approvalDialog.action || !payable) return;

 try {
 if (approvalDialog.action === 'approve') {
 await statusUpdateMutation.mutateAsync({
 id: payable.id,
 newStatus: "approved"
 });
 } else if (approvalDialog.action === 'reject') {
 await rejectPayableMutation.mutateAsync({
 id: payable.id,
 reason: approvalReason || undefined
 });
 } else if (approvalDialog.action === 'cancel') {
 await cancelPayableMutation.mutateAsync({
 id: payable.id,
 reason: approvalReason || undefined
 });
 }
 } catch (error) {
 console.error("Error processing approval action:", error);
 }
 };

 const openApprovalDialog = (action: 'approve' | 'reject' | 'cancel') => {
 setApprovalDialog({ open: true, action });
 setApprovalReason("");
 };

 const getStatusBadge = (status: string) => {
 const statusConfig: Record<string, {color: string, icon: any}> = {
 "pending_invoice": {color: "bg-orange-100 text-orange-800", icon: AlertCircle},
 "pending_approval": {color: "bg-yellow-100 text-yellow-800", icon: AlertCircle},
 "approved": {color: "bg-green-100 text-green-800", icon: CheckCircle},
 "rejected": {color: "bg-red-100 text-red-800", icon: XCircle},
 "cancelled": {color: "bg-gray-100 text-gray-800", icon: XCircle},
 "paid": {color: "bg-blue-100 text-blue-800", icon: CheckCircle},
 };

 const config = statusConfig[status] || {color: "bg-gray-100 text-gray-800", icon: AlertCircle};
 const Icon = config.icon;

 return (
 <Badge className={`${config.color} gap-1`}>
 <Icon className="w-3 h-3" />
 {status.replace(/_/g, " ").toUpperCase()}
 </Badge>
 );
 };

 if (isLoading) {
 return (
 <div className="flex items-center justify-center min-h-screen" dir={isRTL ? 'rtl' : 'ltr'}>
 <Loader2 className="w-8 h-8 animate-spin text-primary" />
 </div>
 );
 }

 if (!payable) {
 return (
 <div className="container py-8">
 <BackButton onClick={() => setLocation("/organization/finance/payables")} label={t.common.backToPayables} />
 <Card>
 <CardContent className="py-12 text-center">
 <p className="text-muted-foreground">Payable not found</p>
 </CardContent>
 </Card>
 </div>
 );
 }

 return (
 <div className="container py-8">
 <BackButton onClick={() => setLocation("/organization/finance/payables")} label={t.common.backToPayables} />

 <div className="grid gap-6">
 {/* Header */}
 <div className="flex items-start justify-between">
 <div>
 <h1 className="text-3xl font-bold">Payable #{payable.id}</h1>
 <p className="text-muted-foreground mt-1">Manage and review this payable</p>
 </div>
 <div>{getStatusBadge(payable.status)}</div>
 </div>

 {/* Main Details */}
 <Card>
 <CardHeader>
 <CardTitle>Payable Information</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-2 gap-6">
 <div>
 <label className="text-sm font-medium text-muted-foreground">PR Number</label>
 <p className="text-lg font-semibold mt-1">{payable.prNumber || "—"}</p>
 </div>
 <div>
 <label className="text-sm font-medium text-muted-foreground">PO Number</label>
 <p className="text-lg font-semibold mt-1">{payable.poNumber || "—"}</p>
 </div>
 <div>
 <label className="text-sm font-medium text-muted-foreground">GRN Number</label>
 <p className="text-lg font-semibold mt-1">{payable.grnNumber || "—"}</p>
 </div>
 <div>
 <label className="text-sm font-medium text-muted-foreground">Vendor</label>
 <p className="text-lg font-semibold mt-1">{payable.vendorName || "Unknown"}</p>
 </div>
 <div>
 <label className="text-sm font-medium text-muted-foreground">Amount</label>
 <p className="text-lg font-semibold mt-1">${parseFloat(payable.amount || "0").toLocaleString()}</p>
 </div>
 <div>
 <label className="text-sm font-medium text-muted-foreground">Due Date</label>
 <p className="text-lg font-semibold mt-1">
 {payable.dueDate ? new Date(payable.dueDate).toLocaleDateString() : "—"}
 </p>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Action Buttons */}
 {payable.status === "pending_approval" && (
 <Card className="border-blue-200 bg-blue-50">
 <CardHeader>
 <CardTitle className="text-blue-900">Approval Required</CardTitle>
 <CardDescription className="text-blue-700">
 This payable requires your approval. Choose one of the actions below.
 </CardDescription>
 </CardHeader>
 <CardContent>
 <div className="flex gap-3">
 <Button
 size="lg"
 className="bg-green-600 hover:bg-green-700 text-white"
 onClick={() => openApprovalDialog('approve')}
 disabled={statusUpdateMutation.isPending}
 >
 {statusUpdateMutation.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
 Approve
 </Button>
 <Button
 size="lg"
 variant="outline"
 className="text-red-600 hover:text-red-700 border-red-200"
 onClick={() => openApprovalDialog('reject')}
 disabled={rejectPayableMutation.isPending}
 >
 {rejectPayableMutation.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
 Reject
 </Button>
 <Button
 size="lg"
 variant="outline"
 className="text-red-600 hover:text-red-700 border-red-200"
 onClick={() => openApprovalDialog('cancel')}
 disabled={cancelPayableMutation.isPending}
 >
 {cancelPayableMutation.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
 Cancel
 </Button>
 </div>
 </CardContent>
 </Card>
 )}

 {/* Status-specific Info */}
 {payable.status === "pending_invoice" && (
 <Card className="border-orange-200 bg-orange-50">
 <CardContent className="pt-6">
 <p className="text-orange-900">
 This payable is awaiting invoice submission. Please submit the invoice to proceed.
 </p>
 </CardContent>
 </Card>
 )}

 {payable.status === "approved" && (
 <Card className="border-green-200 bg-green-50">
 <CardContent className="pt-6">
 <p className="text-green-900">
 This payable has been approved and is ready for payment processing.
 </p>
 </CardContent>
 </Card>
 )}

 {payable.status === "rejected" && (
 <Card className="border-red-200 bg-red-50">
 <CardContent className="pt-6">
 <p className="text-red-900">
 This payable has been rejected and cannot be processed further.
 </p>
 </CardContent>
 </Card>
 )}

 {payable.status === "cancelled" && (
 <Card className="border-gray-200 bg-gray-50">
 <CardContent className="pt-6">
 <p className="text-gray-900">
 This payable has been cancelled and is no longer active.
 </p>
 </CardContent>
 </Card>
 )}

 {/* Approval History */}
 <ApprovalHistory payableId={payableId} />
 </div>

 {/* Approval Action Dialog */}
 <AlertDialog open={approvalDialog.open} onOpenChange={(open) => setApprovalDialog({...approvalDialog, open})}>
 <AlertDialogContent>
 <AlertDialogHeader>
 <AlertDialogTitle>
 {approvalDialog.action === 'approve' && 'Approve Payable'}
 {approvalDialog.action === 'reject' && 'Reject Payable'}
 {approvalDialog.action === 'cancel' && 'Cancel Payable'}
 </AlertDialogTitle>
 <AlertDialogDescription>
 {approvalDialog.action === 'approve' && 'Are you sure you want to approve this payable?'}
 {approvalDialog.action === 'reject' && 'Are you sure you want to reject this payable? This action cannot be easily undone.'}
 {approvalDialog.action === 'cancel' && 'Are you sure you want to cancel this payable? This action cannot be easily undone.'}
 </AlertDialogDescription>
 </AlertDialogHeader>

 {(approvalDialog.action === 'reject' || approvalDialog.action === 'cancel') && (
 <div className="py-4">
 <label className="text-sm font-medium">Reason (optional)</label>
 <Input
 placeholder={t.placeholders.enterReasonForRejectionCancellation}
 value={approvalReason}
 onChange={(e) => setApprovalReason(e.target.value)}
 className="mt-2"
 />
 </div>
 )}

 <div className="flex justify-end gap-2">
 <AlertDialogCancel>Cancel</AlertDialogCancel>
 <AlertDialogAction
 onClick={handleApprovalAction}
 disabled={statusUpdateMutation.isPending || rejectPayableMutation.isPending || cancelPayableMutation.isPending}
 className={approvalDialog.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
 >
 {(statusUpdateMutation.isPending || rejectPayableMutation.isPending || cancelPayableMutation.isPending) ? (
 <>
 <Loader2 className="w-4 h-4 me-2 animate-spin" />
 Processing...
 </>
 ) : (
 <>
 {approvalDialog.action === 'approve' && 'Approve'}
 {approvalDialog.action === 'reject' && 'Reject'}
 {approvalDialog.action === 'cancel' && 'Cancel'}
 </>
 )}
 </AlertDialogAction>
 </div>
 </AlertDialogContent>
 </AlertDialog>
 </div>
 );
}

/**
 * Approval History Component
 * Displays audit trail of all approval actions on a payable
 */
function ApprovalHistory({ payableId }: { payableId: number | null }) {
 const { data: approvalHistory, isLoading } = trpc.prFinance.getPayableApprovalHistory.useQuery(
 { payableId: payableId || 0 },
 { enabled: !!payableId }
 );

 if (isLoading) {
 return (
 <Card>
 <CardHeader>
 <CardTitle>Approval History</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="flex items-center justify-center py-8">
 <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
 </div>
 </CardContent>
 </Card>
 );
 }

 if (!approvalHistory || approvalHistory.length === 0) {
 return (
 <Card>
 <CardHeader>
 <CardTitle>Approval History</CardTitle>
 </CardHeader>
 <CardContent>
 <p className="text-muted-foreground text-center py-8">No approval actions yet</p>
 </CardContent>
 </Card>
 );
 }

 return (
 <Card>
 <CardHeader>
 <CardTitle>Approval History</CardTitle>
 <CardDescription>Complete audit trail of all approval actions</CardDescription>
 </CardHeader>
 <CardContent>
 <div className="space-y-4">
 {approvalHistory.map((history) => (
 <div key={history.id} className="flex gap-4 pb-4 border-b last:border-b-0">
 <div className="flex-shrink-0 mt-1">
 {history.action === "approved" && (
 <CheckCircle className="w-5 h-5 text-green-600" />
 )}
 {history.action === "rejected" && (
 <XCircle className="w-5 h-5 text-red-600" />
 )}
 {history.action === "cancelled" && (
 <AlertCircle className="w-5 h-5 text-gray-600" />
 )}
 </div>
 <div className="flex-grow">
 <div className="flex items-center justify-between">
 <div>
 <p className="font-medium capitalize">
 {history.action === "approved" && "Approved"}
 {history.action === "rejected" && "Rejected"}
 {history.action === "cancelled" && "Cancelled"}
 </p>
 <p className="text-sm text-muted-foreground">
 by {history.actionByName || history.actionByEmail}
 </p>
 </div>
 <div className="flex items-center gap-1 text-sm text-muted-foreground">
 <Clock className="w-4 h-4" />
 {new Date(history.createdAt).toLocaleString()}
 </div>
 </div>
 {history.reason && (
 <p className="text-sm mt-2 p-2 bg-muted rounded">
 <span className="font-medium">Reason:</span> {history.reason}
 </p>
 )}
 </div>
 </div>
 ))}
 </div>
 </CardContent>
 </Card>
 );
}
