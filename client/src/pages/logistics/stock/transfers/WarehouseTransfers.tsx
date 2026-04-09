/**
 * Warehouse Transfers - List & manage inter-warehouse transfers
 * Workflow: Draft → Submitted → Dispatched → Received
 */

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus, Search, Send, Truck, PackageCheck, Loader2, ArrowRight, ChevronDown, ChevronUp,
} from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/i18n/useTranslation";
import { BackButton } from "@/components/BackButton";
import { PaginationControls } from "@/components/PaginationControls";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700", submitted: "bg-blue-100 text-blue-700",
  dispatched: "bg-amber-100 text-amber-700", received: "bg-green-100 text-green-700",
};

const STATUS_LABELS: Record<string, { en: string; ar: string }> = {
  draft: { en: "Draft", ar: "مسودة" },
  submitted: { en: "Submitted", ar: "مقدم" },
  dispatched: { en: "Dispatched", ar: "مرسل" },
  received: { en: "Received", ar: "مستلم" },
};

export default function WarehouseTransfers() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const utils = trpc.useUtils();

  const { data: transfers, isLoading } = trpc.logistics.stockMgmt.transfers.list.useQuery({
    search: search || undefined,
    status: statusFilter && statusFilter !== "all" ? statusFilter : undefined,
  });

  // Pagination logic
  const allTransfers = transfers || [];
  const paginatedTransfers = React.useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return allTransfers.slice(startIdx, startIdx + pageSize);
  }, [allTransfers, currentPage, pageSize]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const submitMut = trpc.logistics.stockMgmt.transfers.submit.useMutation({
    onSuccess: () => { utils.logistics.stockMgmt.transfers.list.invalidate(); toast.success(isRTL ? "تم تقديم التحويل" : "Transfer submitted"); },
    onError: (e) => toast.error(e.message),
  });
  const dispatchMut = trpc.logistics.stockMgmt.transfers.dispatch.useMutation({
    onSuccess: () => { utils.logistics.stockMgmt.transfers.list.invalidate(); toast.success(isRTL ? "تم إرسال التحويل" : "Transfer dispatched"); },
    onError: (e) => toast.error(e.message),
  });
  const receiveMut = trpc.logistics.stockMgmt.transfers.receive.useMutation({
    onSuccess: () => { utils.logistics.stockMgmt.transfers.list.invalidate(); toast.success(isRTL ? "تم استلام التحويل" : "Transfer received"); },
    onError: (e) => toast.error(e.message),
  });

  const getStatusLabel = (status: string) => {
    const labels = STATUS_LABELS[status];
    return labels ? (isRTL ? labels.ar : labels.en) : status;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString(isRTL ? "ar-SA" : "en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container py-6">
          <BackButton href="/organization/logistics/stock" label={t.logistics?.backToStockManagement || (isRTL ? "إدارة المخزون" : "Back to Stock Management")} />
          <div className="flex items-center justify-between mt-2">
            <div>
              <h1 className="text-2xl font-bold text-start">{t.logistics?.warehouseTransfers || (isRTL ? "تحويلات المستودعات" : "Warehouse Transfers")}</h1>
              <p className="text-muted-foreground text-start">{t.logistics?.warehouseTransfersDesc || (isRTL ? "مسودة ← مقدم ← مرسل ← مستلم مع تتبع دفتر الأستاذ" : "Draft → Submitted → Dispatched → Received with ledger tracking")}</p>
            </div>
            <Button asChild><Link href="/organization/logistics/stock/transfers/new"><Plus className="h-4 w-4 me-2" />{t.logistics?.newTransfer || (isRTL ? "تحويل جديد" : "New Transfer")}</Link></Button>
          </div>
        </div>
      </div>

      <div className="container py-6 space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={isRTL ? "بحث برقم التحويل..." : "Search transfer number..."} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder={isRTL ? "جميع الحالات" : "All Statuses"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRTL ? "جميع الحالات" : "All Statuses"}</SelectItem>
              <SelectItem value="draft">{isRTL ? "مسودة" : "Draft"}</SelectItem>
              <SelectItem value="submitted">{isRTL ? "مقدم" : "Submitted"}</SelectItem>
              <SelectItem value="dispatched">{isRTL ? "مرسل" : "Dispatched"}</SelectItem>
              <SelectItem value="received">{isRTL ? "مستلم" : "Received"}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-start px-4 py-3 font-medium">{isRTL ? "# التحويل" : "Transfer #"}</th>
                  <th className="text-start px-4 py-3 font-medium">{isRTL ? "المصدر" : "Source"}</th>
                  <th className="text-center px-2 py-3 w-8"></th>
                  <th className="text-start px-4 py-3 font-medium">{isRTL ? "الوجهة" : "Destination"}</th>
                  <th className="text-start px-4 py-3 font-medium">{isRTL ? "الحالة" : "Status"}</th>
                  <th className="text-start px-4 py-3 font-medium">{isRTL ? "طلب بواسطة" : "Requested By"}</th>
                  <th className="text-start px-4 py-3 font-medium">{isRTL ? "التاريخ" : "Date"}</th>
                  <th className="text-center px-4 py-3 font-medium">{isRTL ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
                ) : !allTransfers?.length ? (
                  <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">{isRTL ? "لا توجد تحويلات" : "No transfers found"}</td></tr>
                ) : (
                  paginatedTransfers.map((tr: any) => (
                    <React.Fragment key={tr.id}>
                      <tr className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => setExpandedId(expandedId === tr.id ? null : tr.id)}>
                        <td className="px-4 py-3 font-mono text-xs">
                          <div className="flex items-center gap-1">
                            {expandedId === tr.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            {tr.transferNumber}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium">{tr.sourceWarehouse}</td>
                        <td className="px-2 py-3 text-center"><ArrowRight className="h-4 w-4 text-muted-foreground mx-auto" /></td>
                        <td className="px-4 py-3 font-medium">{tr.destinationWarehouse}</td>
                        <td className="px-4 py-3"><Badge className={`text-xs ${STATUS_COLORS[tr.status] || ""}`}>{getStatusLabel(tr.status)}</Badge></td>
                        <td className="px-4 py-3 text-muted-foreground">{tr.requestedByName || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(tr.createdAt)}</td>
                        <td className="px-4 py-3">
                          <TooltipProvider>
                            <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                              {tr.status === "draft" && (
                                <Tooltip><TooltipTrigger asChild>
                                  <Button size="sm" variant="outline" onClick={() => submitMut.mutate({ transferId: tr.id })} disabled={submitMut.isPending}><Send className="h-3 w-3" /></Button>
                                </TooltipTrigger><TooltipContent>{isRTL ? "تقديم" : "Submit"}</TooltipContent></Tooltip>
                              )}
                              {tr.status === "submitted" && (
                                <Tooltip><TooltipTrigger asChild>
                                  <Button size="sm" variant="default" onClick={() => dispatchMut.mutate({ transferId: tr.id })} disabled={dispatchMut.isPending}><Truck className="h-3 w-3" /></Button>
                                </TooltipTrigger><TooltipContent>{isRTL ? "إرسال" : "Dispatch"}</TooltipContent></Tooltip>
                              )}
                              {tr.status === "dispatched" && (
                                <Tooltip><TooltipTrigger asChild>
                                  <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => receiveMut.mutate({ transferId: tr.id })} disabled={receiveMut.isPending}><PackageCheck className="h-3 w-3" /></Button>
                                </TooltipTrigger><TooltipContent>{isRTL ? "استلام" : "Receive"}</TooltipContent></Tooltip>
                              )}
                            </div>
                          </TooltipProvider>
                        </td>
                      </tr>
                      {expandedId === tr.id && tr.lines?.length > 0 && (
                        <tr>
                          <td colSpan={8} className="bg-muted/20 px-8 py-3">
                            <p className="text-xs font-medium mb-2">{isRTL ? "بنود التحويل:" : "Transfer Lines:"}</p>
                            <table className="w-full text-xs">
                              <thead><tr className="text-muted-foreground">
                                <th className="text-start py-1">{isRTL ? "الصنف" : "Item"}</th>
                                <th className="text-start py-1">{isRTL ? "الدفعة" : "Batch"}</th>
                                <th className="text-end py-1">{isRTL ? "الكمية" : "Quantity"}</th>
                                <th className="text-end py-1">{isRTL ? "سعر الوحدة" : "Unit Cost"}</th>
                                <th className="text-start py-1">{isRTL ? "ملاحظات" : "Notes"}</th>
                              </tr></thead>
                              <tbody>
                                {tr.lines.map((line: any, idx: number) => (
                                  <tr key={idx} className="border-t border-border/50">
                                    <td className="py-1">{line.itemName || `${isRTL ? "صنف" : "Item"} #${line.itemId}`}</td>
                                    <td className="py-1 font-mono">{line.batchNumber || "—"}</td>
                                    <td className="py-1 text-end">{parseFloat(line.quantity || 0).toFixed(2)}</td>
                                    <td className="py-1 text-end">${parseFloat(line.unitCost || 0).toFixed(2)}</td>
                                    <td className="py-1 text-muted-foreground">{line.notes || "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {tr.notes && <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700"><strong>{isRTL ? "ملاحظات" : "Notes"}:</strong> {tr.notes}</div>}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Controls */}
        {allTransfers.length > 0 && (
          <div className="mt-6">
            <PaginationControls
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={allTransfers.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
