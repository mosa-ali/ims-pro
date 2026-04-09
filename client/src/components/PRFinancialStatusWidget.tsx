/**
 * PR Financial Status Widget
 * 
 * Displays real-time financial tracking for a Purchase Request showing:
 * - Budget Reservation
 * - Encumbrance
 * - Payable
 * - Invoice Status
 * - Payment Timeline
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";

interface PRFinancialStatusWidgetProps {
 purchaseRequestId: number;
 refreshTrigger?: number;
}

const translations = {
 en: {
  financialStatus: 'Financial Status',
  noData: 'No financial data available',
  budgetReservation: 'Budget Reservation',
  budgetLine: 'Budget Line',
  encumbrance: 'Encumbrance',
  po: 'PO',
  liquidated: 'Liquidated',
  accountsPayable: 'Accounts Payable',
  vendor: 'Vendor',
  paid: 'Paid',
  invoice: 'Invoice',
  invoiceNum: 'Invoice #',
  matching: 'Matching',
  expectedPayment: 'Expected Payment',
  // Status translations
  statusActive: 'ACTIVE',
  statusApproved: 'APPROVED',
  statusPaid: 'PAID',
  statusLiquidated: 'LIQUIDATED',
  statusPending: 'PENDING',
  statusPendingGrn: 'PENDING GRN',
  statusPendingInvoice: 'PENDING INVOICE',
  statusCancelled: 'CANCELLED',
  statusRejected: 'REJECTED',
 },
 ar: {
  financialStatus: 'الحالة المالية',
  noData: 'لا تتوفر بيانات مالية',
  budgetReservation: 'حجز الميزانية',
  budgetLine: 'بند الميزانية',
  encumbrance: 'الالتزام',
  po: 'أمر الشراء',
  liquidated: 'تمت التصفية',
  accountsPayable: 'الذمم الدائنة',
  vendor: 'المورد',
  paid: 'مدفوع',
  invoice: 'الفاتورة',
  invoiceNum: 'رقم الفاتورة',
  matching: 'المطابقة',
  expectedPayment: 'الدفع المتوقع',
  // Status translations
  statusActive: 'نشط',
  statusApproved: 'معتمد',
  statusPaid: 'مدفوع',
  statusLiquidated: 'تمت التصفية',
  statusPending: 'قيد الانتظار',
  statusPendingGrn: 'بانتظار استلام البضائع',
  statusPendingInvoice: 'بانتظار الفاتورة',
  statusCancelled: 'ملغي',
  statusRejected: 'مرفوض',
 }
};

export function PRFinancialStatusWidget({ purchaseRequestId, refreshTrigger }: PRFinancialStatusWidgetProps) { const { language } = useLanguage();
 const t = translations[language as 'en' | 'ar'] || translations.en;
 const { data: financialStatus, isLoading, refetch: refetchFinancial } = trpc.prFinance.getFinancialStatus.useQuery({
  purchaseRequestId,
 });

 // Refetch when refreshTrigger changes (triggered by parent refresh button)
 React.useEffect(() => {
  if (refreshTrigger && refreshTrigger > 0) {
   refetchFinancial();
  }
 }, [refreshTrigger, refetchFinancial]);

 if (isLoading) {
  return (
   <Card>
    <CardHeader>
     <CardTitle>{t.financialStatus}</CardTitle>
    </CardHeader>
    <CardContent className="flex items-center justify-center py-8">
     <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </CardContent>
   </Card>
  );
 }

 if (!financialStatus) {
  return (
   <Card>
    <CardHeader>
     <CardTitle>{t.financialStatus}</CardTitle>
    </CardHeader>
    <CardContent>
     <p className="text-sm text-muted-foreground">{t.noData}</p>
    </CardContent>
   </Card>
  );
 }

 const getStatusIcon = (status: string | null | undefined) => {
  switch (status) {
   case "active":
   case "approved":
   case "paid":
   case "liquidated":
    return <CheckCircle2 className="w-4 h-4 text-green-600" />;
   case "pending":
   case "pending_grn":
   case "pending_invoice":
    return <Clock className="w-4 h-4 text-yellow-600" />;
   case "cancelled":
   case "rejected":
    return <XCircle className="w-4 h-4 text-red-600" />;
   default:
    return <AlertCircle className="w-4 h-4 text-gray-600" />;
  }
 };

 const getStatusLabel = (status: string | null | undefined): string => {
  if (!status) return '—';
  const statusMap: Record<string, string> = {
   active: t.statusActive,
   approved: t.statusApproved,
   paid: t.statusPaid,
   fully_paid: t.statusPaid,
   liquidated: t.statusLiquidated,
   pending: t.statusPending,
   pending_grn: t.statusPendingGrn,
   pending_invoice: t.statusPendingInvoice,
   cancelled: t.statusCancelled,
   rejected: t.statusRejected,
  };
  return statusMap[status] || status.replace(/_/g, " ").toUpperCase();
 };

 const getStatusBadge = (status: string | null | undefined) => {
  if (!status) return <Badge variant="secondary">—</Badge>;
  const variant = 
   status === "active" || status === "approved" || status === "paid" || status === "liquidated"
    ? "default"
    : status === "pending" || status === "pending_grn" || status === "pending_invoice"
    ? "secondary"
    : "destructive";

  return <Badge variant={variant}>{getStatusLabel(status)}</Badge>;
 };

 return (
  <Card>
   <CardHeader>
    <CardTitle>{t.financialStatus}</CardTitle>
   </CardHeader>
   <CardContent className="space-y-4">
    {/* Budget Reservation */}
    {financialStatus.reservation && (
     <div className="flex items-start justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
      <div className="flex-1">
       <div className="flex items-center gap-2 mb-1">
        {getStatusIcon(financialStatus.reservation.status)}
        <span className="font-medium text-sm">{t.budgetReservation}</span>
       </div>
       <p className="text-xs text-muted-foreground">
        {t.budgetLine}: {financialStatus.reservation.budgetLineId}
       </p>
       <p className="text-lg font-semibold mt-1">
        ${parseFloat(financialStatus.reservation.reservedAmount || "0").toLocaleString()}
       </p>
      </div>
      <div>{getStatusBadge(financialStatus.reservation.status)}</div>
     </div>
    )}

    {/* Encumbrance */}
    {financialStatus.encumbrance && (
     <div className="flex items-start justify-between p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
      <div className="flex-1">
       <div className="flex items-center gap-2 mb-1">
        {getStatusIcon(financialStatus.encumbrance.status)}
        <span className="font-medium text-sm">{t.encumbrance}</span>
       </div>
       <p className="text-xs text-muted-foreground">
        {t.po}: {financialStatus.encumbrance.purchaseOrderId}
       </p>
       <p className="text-lg font-semibold mt-1">
        ${parseFloat(financialStatus.encumbrance.encumberedAmount || "0").toLocaleString()}
       </p>
       {financialStatus.encumbrance.liquidatedAmount && (
        <p className="text-xs text-green-600 mt-1">
         {t.liquidated}: ${parseFloat(financialStatus.encumbrance.liquidatedAmount).toLocaleString()}
        </p>
       )}
      </div>
      <div>{getStatusBadge(financialStatus.encumbrance.status)}</div>
     </div>
    )}

    {/* Payable */}
    {financialStatus.payable && (
     <div className="flex items-start justify-between p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
      <div className="flex-1">
       <div className="flex items-center gap-2 mb-1">
        {getStatusIcon(financialStatus.payable.status)}
        <span className="font-medium text-sm">{t.accountsPayable}</span>
       </div>
       <p className="text-xs text-muted-foreground">
        {t.vendor}: {financialStatus.payable.vendorId}
       </p>
       <p className="text-lg font-semibold mt-1">
        ${parseFloat(financialStatus.payable.totalAmount || "0").toLocaleString()}
       </p>
       {financialStatus.payable.paidAmount && (
        <p className="text-xs text-green-600 mt-1">
         {t.paid}: ${parseFloat(financialStatus.payable.paidAmount).toLocaleString()}
        </p>
       )}
      </div>
      <div>{getStatusBadge(financialStatus.payable.status)}</div>
     </div>
    )}

    {/* Invoice */}
    {financialStatus.invoice && (
     <div className="flex items-start justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
      <div className="flex-1">
       <div className="flex items-center gap-2 mb-1">
        {getStatusIcon(financialStatus.invoice.status)}
        <span className="font-medium text-sm">{t.invoice}</span>
       </div>
       <p className="text-xs text-muted-foreground">
        {t.invoiceNum}: {financialStatus.invoice.invoiceNumber}
       </p>
       <p className="text-lg font-semibold mt-1">
        ${parseFloat(financialStatus.invoice.invoiceAmount || "0").toLocaleString()}
       </p>
       {financialStatus.invoice.matchingStatus && (
        <p className="text-xs mt-1">
         {t.matching}: {financialStatus.invoice.matchingStatus}
        </p>
       )}
      </div>
      <div>{getStatusBadge(financialStatus.invoice.status)}</div>
     </div>
    )}

    {/* Payment Timeline */}
    {financialStatus.payable?.expectedPaymentDate && (
     <div className="pt-3 border-t">
      <p className="text-xs text-muted-foreground mb-1">{t.expectedPayment}</p>
      <p className="text-sm font-medium">
       {new Date(financialStatus.payable.expectedPaymentDate).toLocaleDateString()}
      </p>
     </div>
    )}
   </CardContent>
  </Card>
 );
}
