/**
 * Stock Adjustments - List & Manage adjustments with approval workflow
 * Types: write_off, physical_count, damage, correction, donation, other
 * Workflow: Draft → Pending Approval → Approved/Rejected
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Search, Check, X, Send, Loader2, ChevronDown, ChevronUp,
} from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/i18n/useTranslation";
import { BackButton } from "@/components/BackButton";
import { toast } from "sonner";
import { PaginationControls } from "@/components/PaginationControls";
import { useMemo } from "react";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  pending_approval: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-gray-200 text-gray-500",
};

export default function StockAdjustments() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [rejectDialogId, setRejectDialogId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const utils = trpc.useUtils();

  const TYPE_LABELS: Record<string, string> = {
    write_off: isRTL ? "شطب" : "Write-Off",
    physical_count: t.logistics?.physicalCount || "Physical Count",
    damage: isRTL ? "تلف" : "Damage",
    correction: isRTL ? "تصحيح" : "Correction",
    donation: isRTL ? "تبرع" : "Donation",
    other: isRTL ? "أخرى" : "Other",
  };

  const { data: adjustments, isLoading } =
    trpc.logistics.stockMgmt.adjustments.list.useQuery({
      search: search || undefined,
      status: statusFilter && statusFilter !== "all" ? statusFilter : undefined,
      type: typeFilter && typeFilter !== "all" ? typeFilter : undefined,
    });

  const submitMutation = trpc.logistics.stockMgmt.adjustments.submit.useMutation({
    onSuccess: () => { utils.logistics.stockMgmt.adjustments.list.invalidate(); toast.success(isRTL ? "تم تقديم التسوية للموافقة" : "Adjustment submitted for approval"); },
    onError: (err) => toast.error(err.message),
  });
  const approveMutation = trpc.logistics.stockMgmt.adjustments.approve.useMutation({
    onSuccess: () => { utils.logistics.stockMgmt.adjustments.list.invalidate(); toast.success(isRTL ? "تمت الموافقة على التسوية" : "Adjustment approved"); },
    onError: (err) => toast.error(err.message),
  });
  const rejectMutation = trpc.logistics.stockMgmt.adjustments.reject.useMutation({
    onSuccess: () => { utils.logistics.stockMgmt.adjustments.list.invalidate(); setRejectDialogId(null); setRejectReason(""); toast.success(isRTL ? "تم رفض التسوية" : "Adjustment rejected"); },
    onError: (err) => toast.error(err.message),
  });

  // Paginate items
  const paginatedAdjustments = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    const items = adjustments || [];
    return items.slice(startIdx, startIdx + pageSize);
  }, [adjustments, currentPage, pageSize]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, typeFilter]);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container py-6">
          <BackButton href="/organization/logistics/stock" label={t.logistics?.stockManagement || "Back to Stock Management"} />
          <div className="flex items-center justify-between mt-2">
            <div>
              <h1 className="text-2xl font-bold text-start">{t.logistics?.stockAdjustments || "Stock Adjustments"}</h1>
              <p className="text-muted-foreground text-start">{t.logistics?.stockAdjustmentsDesc || "Manual corrections with approval workflow and mandatory ledger entries"}</p>
            </div>
            <Button asChild>
              <Link href="/organization/logistics/stock/adjustments/new">
                <Plus className="h-4 w-4 me-2" />{t.logistics?.newAdjustment || "New Adjustment"}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-6 space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t.logistics?.search || "Search adjustment number..."} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder={t.logistics?.status || "All Statuses"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.logistics?.status || "All Statuses"}</SelectItem>
              <SelectItem value="draft">{t.logistics?.saveAsDraft || "Draft"}</SelectItem>
              <SelectItem value="pending_approval">{isRTL ? "بانتظار الموافقة" : "Pending Approval"}</SelectItem>
              <SelectItem value="approved">{t.logistics?.approved || "Approved"}</SelectItem>
              <SelectItem value="rejected">{isRTL ? "مرفوض" : "Rejected"}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder={isRTL ? "جميع الأنواع" : "All Types"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRTL ? "جميع الأنواع" : "All Types"}</SelectItem>
              {Object.entries(TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-start px-4 py-3 font-medium">{isRTL ? "# التسوية" : "Adjustment #"}</th>
                  <th className="text-start px-4 py-3 font-medium">{isRTL ? "النوع" : "Type"}</th>
                  <th className="text-start px-4 py-3 font-medium">{t.logistics?.warehouse || "Warehouse"}</th>
                  <th className="text-start px-4 py-3 font-medium">{isRTL ? "السبب" : "Reason"}</th>
                  <th className="text-start px-4 py-3 font-medium">{t.logistics?.status || "Status"}</th>
                  <th className="text-start px-4 py-3 font-medium">{isRTL ? "أنشأ بواسطة" : "Created By"}</th>
                  <th className="text-start px-4 py-3 font-medium">{isRTL ? "التاريخ" : "Date"}</th>
                  <th className="text-center px-4 py-3 font-medium">{t.logistics?.actions || "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
                ) : !paginatedAdjustments?.length ? (
                  <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">{isRTL ? "لا توجد تسويات" : "No adjustments found"}</td></tr>
                ) : (
                  paginatedAdjustments.map((adj: any) => (
                    <React.Fragment key={adj.id}>
                      <tr className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => setExpandedId(expandedId === adj.id ? null : adj.id)}>
                        <td className="px-4 py-3 font-mono text-xs">
                          <div className="flex items-center gap-1">
                            {expandedId === adj.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            {adj.adjustmentNumber}
                          </div>
                        </td>
                        <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{TYPE_LABELS[adj.type] || adj.type}</Badge></td>
                        <td className="px-4 py-3 text-muted-foreground">{adj.warehouse || "—"}</td>
                        <td className="px-4 py-3 max-w-[200px] truncate">{adj.reason || "—"}</td>
                        <td className="px-4 py-3"><Badge className={`text-xs ${STATUS_COLORS[adj.status] || ""}`}>{adj.status?.replace(/_/g, " ")}</Badge></td>
                        <td className="px-4 py-3 text-muted-foreground">{adj.createdByName || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{adj.createdAt ? new Date(adj.createdAt).toLocaleDateString() : "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {adj.status === "draft" && (
                              <Button size="sm" variant="outline" onClick={() => submitMutation.mutate({ adjustmentId: adj.id })} disabled={submitMutation.isPending}>
                                <Send className="h-3 w-3 me-1" />{t.logistics?.submit || "Submit"}
                              </Button>
                            )}
                            {adj.status === "pending_approval" && (
                              <>
                                <Button size="sm" variant="default" onClick={() => approveMutation.mutate({ adjustmentId: adj.id })} disabled={approveMutation.isPending}>
                                  <Check className="h-3 w-3 me-1" />{t.logistics?.approved || "Approve"}
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => setRejectDialogId(adj.id)}>
                                  <X className="h-3 w-3 me-1" />{isRTL ? "رفض" : "Reject"}
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedId === adj.id && adj.lines?.length > 0 && (
                        <tr>
                          <td colSpan={8} className="bg-muted/20 px-8 py-3">
                            <p className="text-xs font-medium mb-2">{isRTL ? "بنود التسوية:" : "Adjustment Lines:"}</p>
                            <table className="w-full text-xs">
                              <thead><tr className="text-muted-foreground">
                                <th className="text-start py-1">{t.logistics?.stockItem || "Item"}</th>
                                <th className="text-start py-1">{isRTL ? "الدفعة" : "Batch"}</th>
                                <th className="text-end py-1">{isRTL ? "الكمية قبل" : "Qty Before"}</th>
                                <th className="text-end py-1">{isRTL ? "التعديل" : "Adjusted"}</th>
                                <th className="text-end py-1">{isRTL ? "الكمية بعد" : "Qty After"}</th>
                                <th className="text-end py-1">{t.logistics?.unitPrice || "Unit Cost"}</th>
                                <th className="text-start py-1">{t.logistics?.remarks || "Notes"}</th>
                              </tr></thead>
                              <tbody>
                                {adj.lines.map((line: any, idx: number) => (
                                  <tr key={idx} className="border-t border-border/50">
                                    <td className="py-1">{line.itemName || `Item #${line.itemId}`}</td>
                                    <td className="py-1 font-mono">{line.batchNumber || "—"}</td>
                                    <td className="py-1 text-end">{parseFloat(line.qtyBefore || 0).toFixed(2)}</td>
                                    <td className={`py-1 text-end font-medium ${parseFloat(line.qtyAdjusted) < 0 ? "text-red-600" : "text-green-600"}`}>
                                      {parseFloat(line.qtyAdjusted) > 0 ? "+" : ""}{parseFloat(line.qtyAdjusted).toFixed(2)}
                                    </td>
                                    <td className="py-1 text-end">{parseFloat(line.qtyAfter || 0).toFixed(2)}</td>
                                    <td className="py-1 text-end">${parseFloat(line.unitCost || 0).toFixed(2)}</td>
                                    <td className="py-1 text-muted-foreground">{line.notes || "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {adj.rejectionReason && (
                              <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
                                <strong>{isRTL ? "سبب الرفض:" : "Rejection Reason:"}</strong> {adj.rejectionReason}
                              </div>
                            )}
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
        {adjustments && adjustments.length > 0 && (
          <div className="mt-6 flex justify-center">
            <PaginationControls
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={adjustments.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </div>

      <Dialog open={rejectDialogId !== null} onOpenChange={() => { setRejectDialogId(null); setRejectReason(""); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isRTL ? "رفض التسوية" : "Reject Adjustment"}</DialogTitle></DialogHeader>
          <Textarea placeholder={isRTL ? "سبب الرفض..." : "Reason for rejection..."} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDialogId(null); setRejectReason(""); }}>{t.common?.cancel || "Cancel"}</Button>
            <Button variant="destructive" disabled={!rejectReason.trim() || rejectMutation.isPending}
              onClick={() => { if (rejectDialogId) rejectMutation.mutate({ adjustmentId: rejectDialogId, reason: rejectReason }); }}>
              {rejectMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}{isRTL ? "رفض" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
