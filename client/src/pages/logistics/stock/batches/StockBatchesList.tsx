/**
 * Stock Batches List Page
 * View all batches with available qty, expiry dates, warehouse locations.
 * Batches are created from GRN acceptance.
 */

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Layers, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/i18n/useTranslation";
import { BackButton } from "@/components/BackButton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const PAGE_SIZE = 50;

export default function StockBatchesList() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const statusConfig: Record<string, { label: string; color: string }> = {
    available: { label: isRTL ? "متاح" : "Available", color: "bg-green-100 text-green-800 border-green-200" },
    reserved: { label: isRTL ? "محجوز" : "Reserved", color: "bg-blue-100 text-blue-800 border-blue-200" },
    depleted: { label: isRTL ? "مستنفد" : "Depleted", color: "bg-gray-100 text-gray-800 border-gray-200" },
    expired: { label: isRTL ? "منتهي الصلاحية" : "Expired", color: "bg-red-100 text-red-800 border-red-200" },
    quarantined: { label: isRTL ? "محجور" : "Quarantined", color: "bg-amber-100 text-amber-800 border-amber-200" },
  };

  const { data, isLoading } = trpc.logistics.stockMgmt.batches.listAll.useQuery({
    status: statusFilter !== "all" ? (statusFilter as any) : undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString(isRTL ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isNearExpiry = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const now = new Date();
    const expiry = new Date(expiryDate);
    const thirtyDaysLater = new Date(now);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    return expiry > now && expiry <= thirtyDaysLater;
  };

  const isExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) <= new Date();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <BackButton href="/organization/logistics/stock" label={t.logistics?.backToStockManagement || (isRTL ? "إدارة المخزون" : "Back to Stock Management")} />
          <div className="flex items-center gap-3 mt-2">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Layers className="h-6 w-6 text-teal-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-start">{t.logistics?.stockBatches || (isRTL ? "دفعات المخزون" : "Stock Batches")}</h1>
              <p className="text-muted-foreground text-start">
                {t.logistics?.stockBatchesDesc || (isRTL ? "عرض جميع الدفعات مع الكميات المتاحة وتواريخ الانتهاء ومواقع المستودعات" : "All batches with available quantity, expiry dates, and warehouse locations")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-6">
        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={isRTL ? "جميع الحالات" : "All Statuses"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRTL ? "جميع الحالات" : "All Statuses"}</SelectItem>
              <SelectItem value="available">{isRTL ? "متاح" : "Available"}</SelectItem>
              <SelectItem value="reserved">{isRTL ? "محجوز" : "Reserved"}</SelectItem>
              <SelectItem value="depleted">{isRTL ? "مستنفد" : "Depleted"}</SelectItem>
              <SelectItem value="expired">{isRTL ? "منتهي الصلاحية" : "Expired"}</SelectItem>
              <SelectItem value="quarantined">{isRTL ? "محجور" : "Quarantined"}</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {isRTL ? `${total} إجمالي الدفعات` : `${total} total batches`}
          </span>
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[120px]">{isRTL ? "رقم الدفعة" : "Batch #"}</TableHead>
                  <TableHead>{isRTL ? "الصنف" : "Item"}</TableHead>
                  <TableHead className="w-[100px]">{isRTL ? "الفئة" : "Category"}</TableHead>
                  <TableHead className="w-[100px] text-center">{isRTL ? "مقبول" : "Accepted"}</TableHead>
                  <TableHead className="w-[100px] text-center">{isRTL ? "صادر" : "Issued"}</TableHead>
                  <TableHead className="w-[100px] text-center font-semibold">{isRTL ? "متاح" : "Available"}</TableHead>
                  <TableHead className="w-[100px] text-center">{isRTL ? "محجوز" : "Reserved"}</TableHead>
                  <TableHead className="w-[100px] text-end">{isRTL ? "سعر الوحدة" : "Unit Cost"}</TableHead>
                  <TableHead className="w-[110px]">{isRTL ? "تاريخ الانتهاء" : "Expiry Date"}</TableHead>
                  <TableHead className="w-[100px]">{isRTL ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{t.logistics?.warehouse || (isRTL ? "المستودع" : "Warehouse")}</TableHead>
                  <TableHead className="w-[100px]">{isRTL ? "تاريخ الاستلام" : "Received"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-12 text-muted-foreground">
                      {isRTL ? "لا توجد دفعات" : "No batches found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((batch: any) => {
                    const config = statusConfig[batch.batchStatus] || statusConfig.available;
                    const nearExp = isNearExpiry(batch.expiryDate);
                    const exp = isExpired(batch.expiryDate);

                    return (
                      <TableRow key={batch.id} className={`hover:bg-muted/30 ${exp ? "bg-red-50/50" : nearExp ? "bg-amber-50/50" : ""}`}>
                        <TableCell className="font-mono text-xs font-medium">
                          {batch.batchNumber}
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium text-sm">{batch.itemName || "—"}</span>
                            <span className="text-xs text-muted-foreground ms-2">{batch.itemCode}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {batch.category || "—"}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {parseFloat(batch.acceptedQty || "0")}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {parseFloat(batch.issuedQty || "0")}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-bold text-sm ${batch.availableQty > 0 ? "text-green-700" : "text-gray-400"}`}>
                            {batch.availableQty}
                          </span>
                          <span className="text-xs text-muted-foreground ms-1">{batch.unitType}</span>
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {parseFloat(batch.reservedQty || "0")}
                        </TableCell>
                        <TableCell className="text-end text-xs">
                          ${parseFloat(batch.unitCost || "0").toFixed(2)}
                        </TableCell>
                        <TableCell className="text-xs">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className={`inline-flex items-center gap-1 ${exp ? "text-red-600 font-semibold" : nearExp ? "text-amber-600 font-medium" : ""}`}>
                                  {exp && <AlertTriangle className="h-3 w-3" />}
                                  {nearExp && !exp && <Clock className="h-3 w-3" />}
                                  {formatDate(batch.expiryDate)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {exp ? (isRTL ? "منتهي الصلاحية" : "Expired") : nearExp ? (isRTL ? "ينتهي خلال 30 يوم" : "Expires within 30 days") : (isRTL ? "تاريخ الانتهاء" : "Expiry date")}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${config.color} text-xs`}>
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {batch.warehouseName || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(batch.receivedDate)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-sm text-muted-foreground">
                {isRTL ? `صفحة ${page + 1} من ${totalPages} (${total} دفعة)` : `Page ${page + 1} of ${totalPages} (${total} batches)`}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => setPage(0)} disabled={page === 0}>
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}>
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
