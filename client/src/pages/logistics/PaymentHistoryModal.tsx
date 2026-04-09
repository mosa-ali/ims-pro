import { useState } from "react";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
 Calendar,
 CreditCard,
 FileText,
 Download,
 User,
 CheckCircle,
 Clock,
 AlertCircle,
} from "lucide-react";
import { useLanguage } from "@/_core/contexts/LanguageContext";

interface Payment {
 id: number;
 paymentDate: Date;
 amount: number;
 method: "bank_transfer" | "check" | "cash" | "letter_of_credit";
 referenceNumber: string;
 status: "pending" | "processed" | "completed" | "cancelled";
 processedBy?: string;
 processedAt?: Date;
 remarks?: string;
 proofDocumentUrl?: string;
}

interface PaymentHistoryModalProps {
 isOpen: boolean;
 onClose: () => void;
 payableId: string;
 payableAmount: number;
 payments: Payment[];
 currency?: string;
}

export function PaymentHistoryModal({
 isOpen,
 onClose,
 payableId,
 payableAmount,
 payments,
 currency = "USD",
}: PaymentHistoryModalProps) {
 const { language } = useLanguage();
 const isArabic = language === "ar";

 const t = {
 en: {
 title: "Payment History",
 payableId: "Payable ID",
 totalAmount: "Total Amount",
 paidAmount: "Paid Amount",
 remainingAmount: "Remaining Amount",
 noPayments: "No payments recorded yet",
 paymentDate: "Payment Date",
 amount: "Amount",
 method: "Payment Method",
 reference: "Reference Number",
 status: "Status",
 processedBy: "Processed By",
 processedAt: "Processed At",
 remarks: "Remarks",
 proof: "Proof Document",
 download: "Download",
 pending: "Pending",
 processed: "Processed",
 completed: "Completed",
 cancelled: "Cancelled",
 bankTransfer: "Bank Transfer",
 check: "Check",
 cash: "Cash",
 letterOfCredit: "Letter of Credit",
 timeline: "Payment Timeline",
 close: "Close",
 },
 ar: {
 title: "سجل الدفعات",
 payableId: "معرف الدفعية",
 totalAmount: "المبلغ الإجمالي",
 paidAmount: "المبلغ المدفوع",
 remainingAmount: "المبلغ المتبقي",
 noPayments: "لم يتم تسجيل أي دفعات حتى الآن",
 paymentDate: "تاريخ الدفع",
 amount: "المبلغ",
 method: "طريقة الدفع",
 reference: "رقم المرجع",
 status: "الحالة",
 processedBy: "معالج بواسطة",
 processedAt: "معالج في",
 remarks: "ملاحظات",
 proof: "وثيقة الإثبات",
 download: "تحميل",
 pending: "قيد الانتظار",
 processed: "معالج",
 completed: "مكتمل",
 cancelled: "ملغى",
 bankTransfer: "تحويل بنكي",
 check: "شيك",
 cash: "نقد",
 letterOfCredit: "خطاب اعتماد",
 timeline: "جدول الدفعات",
 close: "إغلاق",
 },
 };

 const texts = isArabic ? t.ar : t.en;

 const totalPaid = payments
 .filter((p) => p.status === "completed")
 .reduce((sum, p) => sum + p.amount, 0);

 const remainingAmount = payableAmount - totalPaid;

 const getStatusBadge = (status: string) => {
 const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
 pending: { color: "bg-yellow-100 text-yellow-800", icon: <Clock className="w-4 h-4" /> },
 processed: { color: "bg-blue-100 text-blue-800", icon: <CreditCard className="w-4 h-4" /> },
 completed: { color: "bg-green-100 text-green-800", icon: <CheckCircle className="w-4 h-4" /> },
 cancelled: { color: "bg-red-100 text-red-800", icon: <AlertCircle className="w-4 h-4" /> },
 };

 const config = statusConfig[status];
 const statusText = texts[status as keyof typeof texts] || status;

 return (
 <Badge className={`${config.color} flex items-center gap-1`}>
 {config.icon}
 {statusText}
 </Badge>
 );
 };

 const getMethodText = (method: string) => {
 const methodMap: Record<string, string> = {
 bank_transfer: texts.bankTransfer,
 check: texts.check,
 cash: texts.cash,
 letter_of_credit: texts.letterOfCredit,
 };
 return methodMap[method] || method;
 };

 const formatDate = (date: Date) => {
 return new Date(date).toLocaleDateString(isArabic ? "ar-SA" : "en-US", {
 year: "numeric",
 month: "short",
 day: "numeric",
 });
 };

 return (
 <Dialog open={isOpen} onOpenChange={onClose}>
 <DialogContent dir={isArabic ? 'rtl' : 'ltr'} className={`max-w-3xl ${isArabic ? "rtl" : "ltr"}`}>
 <DialogHeader>
 <DialogTitle className="text-2xl font-bold">{texts.title}</DialogTitle>
 </DialogHeader>

 <div className="space-y-6">
 {/* Summary Cards */}
 <div className="grid grid-cols-3 gap-4">
 <Card className="p-4">
 <p className="text-sm text-muted-foreground">{texts.totalAmount}</p>
 <p className="text-2xl font-bold">
 {payableAmount.toFixed(2)} {currency}
 </p>
 </Card>
 <Card className="p-4">
 <p className="text-sm text-muted-foreground">{texts.paidAmount}</p>
 <p className="text-2xl font-bold text-green-600">
 {totalPaid.toFixed(2)} {currency}
 </p>
 </Card>
 <Card className="p-4">
 <p className="text-sm text-muted-foreground">{texts.remainingAmount}</p>
 <p className={`text-2xl font-bold ${remainingAmount > 0 ? "text-orange-600" : "text-green-600"}`}>
 {remainingAmount.toFixed(2)} {currency}
 </p>
 </Card>
 </div>

 {/* Payable ID */}
 <div className="flex items-center gap-2 text-sm">
 <span className="font-semibold">{texts.payableId}:</span>
 <span className="text-muted-foreground">{payableId}</span>
 </div>

 {/* Payment Timeline */}
 {payments.length > 0 ? (
 <div className="space-y-4">
 <h3 className="font-semibold flex items-center gap-2">
 <Calendar className="w-4 h-4" />
 {texts.timeline}
 </h3>

 <div className="space-y-3 max-h-96 overflow-y-auto">
 {payments.map((payment, index) => (
 <Card key={payment.id} className="p-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <p className="text-sm text-muted-foreground">{texts.paymentDate}</p>
 <p className="font-semibold">{formatDate(payment.paymentDate)}</p>
 </div>
 <div>
 <p className="text-sm text-muted-foreground">{texts.amount}</p>
 <p className="font-semibold text-lg">
 {payment.amount.toFixed(2)} {currency}
 </p>
 </div>
 <div>
 <p className="text-sm text-muted-foreground">{texts.method}</p>
 <p className="font-semibold">{getMethodText(payment.method)}</p>
 </div>
 <div>
 <p className="text-sm text-muted-foreground">{texts.reference}</p>
 <p className="font-semibold">{payment.referenceNumber}</p>
 </div>
 <div>
 <p className="text-sm text-muted-foreground">{texts.status}</p>
 {getStatusBadge(payment.status)}
 </div>
 {payment.processedBy && (
 <div>
 <p className="text-sm text-muted-foreground">{texts.processedBy}</p>
 <p className="font-semibold">{payment.processedBy}</p>
 </div>
 )}
 {payment.remarks && (
 <div className="col-span-2">
 <p className="text-sm text-muted-foreground">{texts.remarks}</p>
 <p className="text-sm">{payment.remarks}</p>
 </div>
 )}
 {payment.proofDocumentUrl && (
 <div className="col-span-2">
 <Button
 variant="outline"
 size="sm"
 className="flex items-center gap-2"
 onClick={() => {
 // Download logic will be implemented in Phase 6.4
 window.open(payment.proofDocumentUrl, "_blank");
 }}
 >
 <Download className="w-4 h-4" />
 {texts.download} {texts.proof}
 </Button>
 </div>
 )}
 </div>
 </Card>
 ))}
 </div>
 </div>
 ) : (
 <div className="text-center py-8">
 <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
 <p className="text-muted-foreground">{texts.noPayments}</p>
 </div>
 )}

 {/* Close Button */}
 <div className="flex justify-end gap-2">
 <Button variant="outline" onClick={onClose}>
 {texts.close}
 </Button>
 </div>
 </div>
 </DialogContent>
 </Dialog>
 );
}
