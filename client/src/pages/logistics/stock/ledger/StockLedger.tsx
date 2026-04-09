/**
 * Stock Ledger Page
 * Audit-proof transaction log showing all stock movements:
 * GRN_IN, ISSUE_OUT, RETURN_IN, TRANSFER_OUT, TRANSFER_IN, ADJUSTMENT_IN, ADJUSTMENT_OUT, LOSS
 */

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, BookOpen, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/i18n/useTranslation";
import { BackButton } from "@/components/BackButton";
import { PaginationControls } from "@/components/PaginationControls";

export default function StockLedger() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [movementFilter, setMovementFilter] = useState<string>("all");

  const { data, isLoading } = trpc.logistics.stockMgmt.ledger.list.useQuery({
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
  });

  const movementTypeConfig: Record<string, { label: string; color: string; direction: "in" | "out" }> = {
    GRN_IN: { label: isRTL ? "استلام بضاعة" : "GRN Post", color: "bg-green-100 text-green-800 border-green-200", direction: "in" },
    ISSUE_OUT: { label: isRTL ? "إصدار" : "Issue", color: "bg-orange-100 text-orange-800 border-orange-200", direction: "out" },
    RETURN_IN: { label: isRTL ? "مرتجع" : "Return", color: "bg-blue-100 text-blue-800 border-blue-200", direction: "in" },
    TRANSFER_OUT: { label: isRTL ? "تحويل صادر" : "Transfer Out", color: "bg-purple-100 text-purple-800 border-purple-200", direction: "out" },
    TRANSFER_IN: { label: isRTL ? "تحويل وارد" : "Transfer In", color: "bg-indigo-100 text-indigo-800 border-indigo-200", direction: "in" },
    ADJUSTMENT_IN: { label: isRTL ? "تسوية (+)" : "Adjust (+)", color: "bg-teal-100 text-teal-800 border-teal-200", direction: "in" },
    ADJUSTMENT_OUT: { label: isRTL ? "تسوية (-)" : "Adjust (-)", color: "bg-amber-100 text-amber-800 border-amber-200", direction: "out" },
    LOSS: { label: isRTL ? "فقدان" : "Loss", color: "bg-red-100 text-red-800 border-red-200", direction: "out" },
  };

  const items = data?.items || [];
  const total = data?.total || 0;

  const filteredItems = movementFilter === "all"
    ? items
    : items.filter((item: any) => item.movementType === movementFilter);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString(isRTL ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <BackButton href="/organization/logistics/stock" label={t.logistics?.backToStockManagement || (isRTL ? "إدارة المخزون" : "Back to Stock Management")} />
          <div className="flex items-center gap-3 mt-2">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <BookOpen className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-start">{t.logistics?.stockLedger || (isRTL ? "سجل المخزون" : "Stock Ledger")}</h1>
              <p className="text-muted-foreground text-start">
                {t.logistics?.stockLedgerDesc || (isRTL ? "سجل معاملات: استلام، إصدار، مرتجع، تحويل، تعديل" : "Audit-proof transaction log for all stock movements")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-6">
        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <Select value={movementFilter} onValueChange={setMovementFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={isRTL ? "جميع أنواع الحركة" : "All Movement Types"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRTL ? "جميع أنواع الحركة" : "All Movement Types"}</SelectItem>
              <SelectItem value="GRN_IN">{isRTL ? "استلام بضاعة" : "GRN Post"}</SelectItem>
              <SelectItem value="ISSUE_OUT">{isRTL ? "إصدار" : "Issue"}</SelectItem>
              <SelectItem value="RETURN_IN">{isRTL ? "مرتجع" : "Return"}</SelectItem>
              <SelectItem value="TRANSFER_OUT">{isRTL ? "تحويل صادر" : "Transfer Out"}</SelectItem>
              <SelectItem value="TRANSFER_IN">{isRTL ? "تحويل وارد" : "Transfer In"}</SelectItem>
              <SelectItem value="ADJUSTMENT_IN">{isRTL ? "تسوية (+)" : "Adjustment (+)"}</SelectItem>
              <SelectItem value="ADJUSTMENT_OUT">{isRTL ? "تسوية (-)" : "Adjustment (-)"}</SelectItem>
              <SelectItem value="LOSS">{isRTL ? "فقدان" : "Loss"}</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {isRTL ? `${total} إجمالي السجلات` : `${total} total entries`}
          </span>
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[140px]">{isRTL ? "التاريخ" : "Date"}</TableHead>
                  <TableHead className="w-[120px]">{isRTL ? "الحركة" : "Movement"}</TableHead>
                  <TableHead className="w-[100px]">{isRTL ? "نوع المرجع" : "Ref Type"}</TableHead>
                  <TableHead className="w-[120px]">{isRTL ? "رقم المرجع" : "Ref #"}</TableHead>
                  <TableHead>{isRTL ? "الصنف" : "Item"}</TableHead>
                  <TableHead className="w-[120px]">{isRTL ? "الدفعة" : "Batch"}</TableHead>
                  <TableHead className="w-[80px] text-center">{isRTL ? "الكمية" : "Qty"}</TableHead>
                  <TableHead className="w-[100px] text-end">{isRTL ? "سعر الوحدة" : "Unit Cost"}</TableHead>
                  <TableHead className="w-[100px] text-end">{isRTL ? "القيمة الإجمالية" : "Total Value"}</TableHead>
                  <TableHead>{t.logistics?.warehouse || (isRTL ? "المستودع" : "Warehouse")}</TableHead>
                  <TableHead>{isRTL ? "ملاحظات" : "Notes"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                      {isRTL ? "لا توجد سجلات" : "No ledger entries found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((entry: any) => {
                    const config = movementTypeConfig[entry.movementType] || {
                      label: entry.movementType,
                      color: "bg-gray-100 text-gray-800",
                      direction: "out",
                    };
                    const qtyChange = parseFloat(entry.qtyChange || "0");
                    const isPositive = qtyChange > 0;

                    return (
                      <TableRow key={entry.id} className="hover:bg-muted/30">
                        <TableCell className="text-xs">
                          {formatDate(entry.transactionDate)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${config.color} text-xs`}>
                            {isPositive ? (
                              <ArrowUpCircle className="h-3 w-3 me-1 text-green-600" />
                            ) : (
                              <ArrowDownCircle className="h-3 w-3 me-1 text-red-600" />
                            )}
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {entry.referenceType}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {entry.referenceNumber || "—"}
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium text-sm">{entry.itemName || "—"}</span>
                            <span className="text-xs text-muted-foreground ms-2">{entry.itemCode}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {entry.batchNumber || "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-semibold ${isPositive ? "text-green-700" : "text-red-700"}`}>
                            {isPositive ? "+" : ""}{qtyChange}
                          </span>
                          <span className="text-xs text-muted-foreground ms-1">{entry.unit}</span>
                        </TableCell>
                        <TableCell className="text-end text-xs">
                          ${parseFloat(entry.unitCost || "0").toFixed(2)}
                        </TableCell>
                        <TableCell className="text-end text-xs font-medium">
                          ${parseFloat(entry.totalValue || "0").toFixed(2)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {entry.warehouseName || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {entry.notes || "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {total > 0 && (
            <div className="px-4 py-3 border-t border-border">
              <PaginationControls
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={total}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
