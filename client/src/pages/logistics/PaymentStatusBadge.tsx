import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle, XCircle } from "lucide-react";
import { useLanguage } from '@/contexts/LanguageContext';

interface PaymentStatusBadgeProps {
 status: "pending_invoice" | "pending_approval" | "pending_payment" | "paid" | "cancelled";
 language?: "en" | "ar";
 showIcon?: boolean;
 size?: "sm" | "md" | "lg";
}

export function PaymentStatusBadge({
 status,
 language = "en",
 showIcon = true,
 size = "md",
}: PaymentStatusBadgeProps) {
 const isRTL = language === "ar";

 const statusConfig = {
 pending_invoice: {
 en: "Pending Invoice",
 ar: "في انتظار الفاتورة",
 icon: Clock,
 className: "bg-gray-100 text-gray-800 border-gray-300",
 },
 pending_approval: {
 en: "Pending Approval",
 ar: "في انتظار الموافقة",
 icon: AlertCircle,
 className: "bg-yellow-100 text-yellow-800 border-yellow-300",
 },
 pending_payment: {
 en: "Pending Payment",
 ar: "في انتظار الدفع",
 icon: Clock,
 className: "bg-blue-100 text-blue-800 border-blue-300",
 },
 paid: {
 en: "Paid",
 ar: "مدفوع",
 icon: CheckCircle2,
 className: "bg-green-100 text-green-800 border-green-300",
 },
 cancelled: {
 en: "Cancelled",
 ar: "ملغي",
 icon: XCircle,
 className: "bg-red-100 text-red-800 border-red-300",
 },
 };

 const config = statusConfig[status];
 const Icon = config.icon;

 const iconSizeMap = {
 sm: "w-3 h-3",
 md: "w-4 h-4",
 lg: "w-5 h-5",
 };

 const paddingMap = {
 sm: "px-2 py-1 text-xs",
 md: "px-3 py-1.5 text-sm",
 lg: "px-4 py-2 text-base",
 };

 return (
 <Badge dir={isRTL ? 'rtl' : 'ltr'}
 variant="outline"
 className={`${config.className} ${paddingMap[size]} flex items-center gap-1.5 w-fit border ${ ''}`}
 >
 {showIcon && <Icon className={iconSizeMap[size]} />}
 <span>{config[language]}</span>
 </Badge>
 );
}
