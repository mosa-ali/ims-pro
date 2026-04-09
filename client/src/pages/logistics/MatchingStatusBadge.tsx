import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, XCircle, Clock } from "lucide-react";

interface MatchingStatusBadgeProps {
  status: "matched" | "variance_detected" | "unmatched" | "pending";
  language?: "en" | "ar";
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

export function MatchingStatusBadge({
  status,
  language = "en",
  showIcon = true,
  size = "md",
}: MatchingStatusBadgeProps) {
  const statusConfig = {
    matched: {
      en: "Matched",
      ar: "متطابقة",
      icon: CheckCircle2,
      className: "bg-green-100 text-green-800 border-green-300",
    },
    variance_detected: {
      en: "Variance Detected",
      ar: "اكتشاف تباين",
      icon: AlertCircle,
      className: "bg-yellow-100 text-yellow-800 border-yellow-300",
    },
    unmatched: {
      en: "Unmatched",
      ar: "غير متطابقة",
      icon: XCircle,
      className: "bg-red-100 text-red-800 border-red-300",
    },
    pending: {
      en: "Pending",
      ar: "قيد الانتظار",
      icon: Clock,
      className: "bg-gray-100 text-gray-800 border-gray-300",
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
    <Badge
      variant="outline"
      className={`${config.className} ${paddingMap[size]} flex items-center gap-1.5 w-fit border`}
    >
      {showIcon && <Icon className={iconSizeMap[size]} />}
      <span>{config[language]}</span>
    </Badge>
  );
}

/**
 * Matching Details Modal Component
 * Supports both Goods (PR/PO/GRN) and Services (Contract/SAC/Invoice) matching
 */
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface MatchingDiscrepancy {
  type: string;
  lineNumber?: number;
  description?: string;
  poQuantity?: number;
  grnQuantity?: number;
  invoiceQuantity?: number;
  poAmount?: number;
  invoiceAmount?: number;
  message: string;
}

interface MatchingDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: "matched" | "variance_detected" | "unmatched" | "pending";
  discrepancies?: MatchingDiscrepancy[] | string[];
  // Common fields
  payableAmount?: number;
  varianceAmount?: number;
  variancePercentage?: number;
  language?: "en" | "ar";
  // Matching type
  matchingType?: "goods" | "services";
  // Goods-specific fields
  prAmount?: number;
  poAmount?: number;
  grnAmount?: number;
  // Services-specific fields
  contractNumber?: string;
  contractAmount?: number;
  sacNumber?: string;
  sacAmount?: number;
  invoiceNumber?: string;
  invoiceAmount?: number;
  hasInvoice?: boolean;
  cumulativeSacPayables?: number;
}

export function MatchingDetailsModal({
  open,
  onOpenChange,
  status,
  discrepancies = [],
  payableAmount = 0,
  varianceAmount = 0,
  variancePercentage = 0,
  language = "en",
  matchingType = "goods",
  // Goods fields
  prAmount = 0,
  poAmount = 0,
  grnAmount = 0,
  // Services fields
  contractNumber = "N/A",
  contractAmount = 0,
  sacNumber = "N/A",
  sacAmount = 0,
  invoiceNumber = "N/A",
  invoiceAmount = 0,
  hasInvoice = false,
  cumulativeSacPayables = 0,
}: MatchingDetailsModalProps) {
  const { t } = useTranslation();
  const isRTL = language === "ar";

  const getDiscrepancyTypeLabel = (type: string): string => {
    const typeMap: Record<string, string> = {
      quantity_mismatch: t.matchingStatusBadge.quantityMismatch,
      amount_mismatch: t.matchingStatusBadge.amountMismatch,
      missing_item: t.matchingStatusBadge.missingItem,
      extra_item: t.matchingStatusBadge.extraItem,
    };
    return typeMap[type] || type;
  };

  // Normalize discrepancies to MatchingDiscrepancy format
  const normalizedDiscrepancies: MatchingDiscrepancy[] = discrepancies.map((disc, idx) => {
    if (typeof disc === 'string') {
      return { type: 'amount_mismatch', message: disc, lineNumber: idx + 1 };
    }
    return disc;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={isRTL ? 'rtl' : 'ltr'} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {matchingType === 'services'
              ? t.matchingStatusBadge.servicesTitle
              : t.matchingStatusBadge.goodsTitle}
          </DialogTitle>
          <DialogDescription>
            {matchingType === 'services'
              ? t.matchingStatusBadge.servicesDescription
              : t.matchingStatusBadge.goodsDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <MatchingStatusBadge status={status} language={language} size="md" />
          </div>

          {/* Amounts Summary */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">{t.matchingStatusBadge.amounts}</h3>

            {matchingType === 'services' ? (
              /* ═══════════════════════════════════════════════════════════════
                 SERVICES MATCHING: Contract / SAC / Invoice
                 ═══════════════════════════════════════════════════════════════ */
              <div className="space-y-4">
                {/* Contract → SAC → Invoice flow */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t.matchingStatusBadge.contractAmount}</p>
                    <p className="font-mono text-sm">${contractAmount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground/70">{contractNumber}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t.matchingStatusBadge.sacAmount}</p>
                    <p className="font-mono text-sm">${sacAmount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground/70">{sacNumber}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t.matchingStatusBadge.invoiceAmountLabel}</p>
                    {hasInvoice ? (
                      <>
                        <p className="font-mono text-sm">${invoiceAmount.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground/70">{invoiceNumber}</p>
                      </>
                    ) : (
                      <p className="text-xs text-amber-600 italic">{t.matchingStatusBadge.noInvoiceYet}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t.matchingStatusBadge.payable}</p>
                    <p className="font-mono text-sm">${payableAmount.toFixed(2)}</p>
                  </div>
                </div>

                {/* Cumulative SAC payables vs Contract */}
                <div className="border-t pt-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">{t.matchingStatusBadge.cumulativeSacPayables}</p>
                      <p className={`font-mono text-sm ${cumulativeSacPayables > contractAmount ? "text-red-600 font-bold" : ""}`}>
                        ${cumulativeSacPayables.toFixed(2)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">{t.matchingStatusBadge.variance}</p>
                      <p className={`font-mono text-sm ${Math.abs(varianceAmount) > 0.01 ? "text-red-600" : "text-green-600"}`}>
                        ${Math.abs(varianceAmount).toFixed(2)} ({variancePercentage?.toFixed(2) || "0.00"}%)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ═══════════════════════════════════════════════════════════════
                 GOODS/WORKS MATCHING: PR / PO / GRN
                 ═══════════════════════════════════════════════════════════════ */
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t.matchingStatusBadge.pr}</p>
                  <p className="font-mono text-sm">${prAmount.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t.matchingStatusBadge.po}</p>
                  <p className="font-mono text-sm">${poAmount.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t.matchingStatusBadge.grn}</p>
                  <p className="font-mono text-sm">${grnAmount.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t.matchingStatusBadge.payable}</p>
                  <p className="font-mono text-sm">${payableAmount.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t.matchingStatusBadge.variance}</p>
                  <p className={`font-mono text-sm ${Math.abs(varianceAmount) > 0.01 ? "text-red-600" : "text-green-600"}`}>
                    ${Math.abs(varianceAmount).toFixed(2)} ({variancePercentage?.toFixed(2) || "0.00"}%)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Discrepancies Table */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">{t.matchingStatusBadge.discrepancies}</h3>
            {normalizedDiscrepancies.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.matchingStatusBadge.noDiscrepancies}</p>
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">{t.matchingStatusBadge.lineNumber}</TableHead>
                      <TableHead className="text-xs">{t.matchingStatusBadge.type}</TableHead>
                      <TableHead className="text-xs">{t.matchingStatusBadge.message}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {normalizedDiscrepancies.map((disc, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs">{disc.lineNumber || "-"}</TableCell>
                        <TableCell className="text-xs">
                          {getDiscrepancyTypeLabel(disc.type)}
                        </TableCell>
                        <TableCell className="text-xs">{disc.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
