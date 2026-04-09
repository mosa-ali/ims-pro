import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Search, Truck, MapPin, Clock, CalendarDays, MessageSquare,
  Package, ArrowRight, Eye, Loader2, RefreshCw
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/i18n/useTranslation";
import { BackButton } from "@/components/BackButton";
import { PaginationControls } from "@/components/PaginationControls";
import React, { useState } from "react";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-300",
  submitted: "bg-blue-100 text-blue-700 border-blue-300",
  dispatched: "bg-orange-100 text-orange-700 border-orange-300",
  in_transit: "bg-amber-100 text-amber-700 border-amber-300",
  received: "bg-green-100 text-green-700 border-green-300",
  cancelled: "bg-red-100 text-red-700 border-red-300",
};

export default function TransferTracking() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedTransfer, setSelectedTransfer] = useState<any>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [trackingNote, setTrackingNote] = useState("");
  const [currentLocation, setCurrentLocation] = useState("");
  const [newEta, setNewEta] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const utils = trpc.useUtils();

  const statusLabels: Record<string, string> = {
    draft: isRTL ? "مسودة" : "Draft",
    submitted: isRTL ? "مقدم" : "Submitted",
    dispatched: isRTL ? "تم الإرسال" : "Dispatched",
    in_transit: isRTL ? "قيد النقل" : "In Transit",
    received: isRTL ? "مستلم" : "Received",
    cancelled: isRTL ? "ملغي" : "Cancelled",
  };

  const { data: transfers, isLoading } = trpc.logistics.stockMgmt.transfers.list.useQuery({
    status: statusFilter || undefined,
    search: search || undefined,
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

  const { data: trackingDetail } = trpc.logistics.stockMgmt.transfers.getTracking.useQuery(
    { transferId: selectedTransfer?.id },
    { enabled: !!selectedTransfer?.id }
  );

  const updateTracking = trpc.logistics.stockMgmt.transfers.updateTracking.useMutation({
    onSuccess: () => {
      toast.success(isRTL ? "تم تحديث التتبع بنجاح" : "Tracking updated successfully");
      setShowUpdateDialog(false); setTrackingNote(""); setCurrentLocation(""); setNewEta("");
      utils.logistics.stockMgmt.transfers.list.invalidate();
      utils.logistics.stockMgmt.transfers.getTracking.invalidate({ transferId: selectedTransfer?.id });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const inTransitCount = transfers?.filter((t: any) => t.status === "dispatched" || t.status === "in_transit").length || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <BackButton href="/organization/logistics/stock" label={t.logistics?.stockManagement || "Back to Stock Management"} />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{t.logistics?.transferTracking || "Transfer Tracking"}</h1>
          <p className="text-sm text-muted-foreground">{t.logistics?.transferTrackingDesc || "Monitor in-transit transfers with ETA and location updates"}</p>
        </div>
        <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 px-3 py-1">
          <Truck className="h-4 w-4 me-1" /> {inTransitCount} {isRTL ? "قيد النقل" : "In Transit"}
        </Badge>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={isRTL ? "بحث في التحويلات..." : "Search transfers..."} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder={t.logistics?.status || "All Statuses"} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.logistics?.status || "All Statuses"}</SelectItem>
            <SelectItem value="dispatched">{statusLabels.dispatched}</SelectItem>
            <SelectItem value="in_transit">{statusLabels.in_transit}</SelectItem>
            <SelectItem value="received">{statusLabels.received}</SelectItem>
            <SelectItem value="submitted">{statusLabels.submitted}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-5 w-5" /> {t.logistics?.warehouseTransfers || "Warehouse Transfers"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">{isRTL ? "جاري التحميل..." : "Loading transfers..."}</div>
              ) : !allTransfers || allTransfers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Truck className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p className="text-lg font-medium">{isRTL ? "لا توجد تحويلات" : "No transfers found"}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {paginatedTransfers.map((transfer: any) => {
                    const isSelected = selectedTransfer?.id === transfer.id;
                    const hasEta = transfer.estimatedArrival;
                    const isOverdue = hasEta && new Date(transfer.estimatedArrival) < new Date() && transfer.status !== "received";
                    return (
                      <div key={transfer.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-sm ${isSelected ? "border-primary bg-primary/5 shadow-sm" : "hover:border-muted-foreground/30"}`}
                        onClick={() => setSelectedTransfer(transfer)}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-sm font-medium">{transfer.transferNumber}</span>
                          <Badge variant="outline" className={statusColors[transfer.status] || ""}>{statusLabels[transfer.status] || transfer.status}</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{transfer.sourceWarehouse || (isRTL ? "المصدر" : "Source")}</span>
                          <ArrowRight className={`h-3.5 w-3.5 ${isRTL ? "rotate-180" : ""}`} />
                          <span>{transfer.destinationWarehouse || (isRTL ? "الوجهة" : "Destination")}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                          {hasEta && (
                            <span className={`flex items-center gap-1 ${isOverdue ? "text-red-600 font-medium" : ""}`}>
                              <CalendarDays className="h-3 w-3" />
                              {isRTL ? "الوصول المتوقع:" : "ETA:"} {new Date(transfer.estimatedArrival).toLocaleDateString()}
                              {isOverdue && (isRTL ? " (متأخر)" : " (Overdue)")}
                            </span>
                          )}
                          {transfer.currentLocation && (
                            <span className="flex items-center gap-1"><Truck className="h-3 w-3" />{transfer.currentLocation}</span>
                          )}
                          {transfer.trackingNotesCount > 0 && (
                            <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{transfer.trackingNotesCount} {isRTL ? "تحديثات" : "updates"}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Pagination Controls */}
              {allTransfers.length > 0 && (
                <div className="mt-4">
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
            </CardContent>
          </Card>
        </div>

        <div>
          {selectedTransfer ? (
            <Card className="sticky top-6">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{selectedTransfer.transferNumber}</CardTitle>
                  {(selectedTransfer.status === "dispatched" || selectedTransfer.status === "in_transit") && (
                    <Button size="sm" onClick={() => setShowUpdateDialog(true)}>
                      <RefreshCw className="h-3.5 w-3.5 me-1" /> {isRTL ? "تحديث" : "Update"}
                    </Button>
                  )}
                </div>
                <CardDescription>
                  {selectedTransfer.sourceWarehouse} {isRTL ? "←" : "→"} {selectedTransfer.destinationWarehouse}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t.logistics?.status || "Status"}</span>
                    <Badge variant="outline" className={statusColors[selectedTransfer.status] || ""}>{statusLabels[selectedTransfer.status] || selectedTransfer.status}</Badge>
                  </div>
                  {selectedTransfer.estimatedArrival && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{isRTL ? "الوصول المتوقع" : "ETA"}</span>
                      <span className={`font-medium ${new Date(selectedTransfer.estimatedArrival) < new Date() && selectedTransfer.status !== "received" ? "text-red-600" : ""}`}>
                        {new Date(selectedTransfer.estimatedArrival).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {selectedTransfer.currentLocation && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{isRTL ? "الموقع الحالي" : "Current Location"}</span>
                      <span className="font-medium">{selectedTransfer.currentLocation}</span>
                    </div>
                  )}
                  {selectedTransfer.dispatchedAt && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{isRTL ? "تاريخ الإرسال" : "Dispatched"}</span>
                      <span>{new Date(selectedTransfer.dispatchedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                  {selectedTransfer.receivedAt && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{isRTL ? "تاريخ الاستلام" : "Received"}</span>
                      <span>{new Date(selectedTransfer.receivedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" /> {isRTL ? "سجل التتبع" : "Tracking History"}
                  </h4>
                  {trackingDetail?.trackingNotes && trackingDetail.trackingNotes.length > 0 ? (
                    <div className="space-y-3">
                      {trackingDetail.trackingNotes.map((note: any, idx: number) => (
                        <div key={idx} className={`relative pb-3 ${isRTL ? "pr-6 border-r-2" : "pl-6 border-l-2"} border-muted last:border-transparent`}>
                          <div className={`absolute ${isRTL ? "-right-[5px]" : "-left-[5px]"} top-1 w-2 h-2 rounded-full bg-primary`} />
                          <p className="text-xs text-muted-foreground">
                            {new Date(note.timestamp).toLocaleString()}
                            {note.location && ` · ${note.location}`}
                          </p>
                          <p className="text-sm mt-0.5">{note.note}</p>
                          {note.updatedBy && <p className="text-xs text-muted-foreground mt-0.5">{isRTL ? "بواسطة" : "by"} {note.updatedBy}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">{isRTL ? "لا توجد تحديثات تتبع بعد" : "No tracking updates yet"}</p>
                  )}
                </div>

                {trackingDetail?.lines && trackingDetail.lines.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">{isRTL ? "الأصناف" : "Items"} ({trackingDetail.lines.length})</h4>
                    <div className="space-y-1">
                      {trackingDetail.lines.map((line: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                          <span className="truncate flex-1">{line.itemName || (isRTL ? "صنف" : "Item")}</span>
                          <span className="font-mono text-xs ms-2">{line.quantity} {line.unit || (isRTL ? "قطعة" : "pcs")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Eye className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">{isRTL ? "اختر تحويلاً لعرض تفاصيل التتبع" : "Select a transfer to view tracking details"}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isRTL ? "تحديث تتبع التحويل" : "Update Transfer Tracking"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>{isRTL ? "الموقع الحالي" : "Current Location"}</Label>
              <Input value={currentLocation} onChange={(e) => setCurrentLocation(e.target.value)} placeholder={isRTL ? "مثال: قيد النقل عبر الرياض" : "e.g., In transit via Riyadh"} />
            </div>
            <div>
              <Label>{isRTL ? "الوصول المتوقع المحدث (اختياري)" : "Updated ETA (optional)"}</Label>
              <Input type="date" value={newEta} onChange={(e) => setNewEta(e.target.value)} />
            </div>
            <div>
              <Label>{isRTL ? "ملاحظة التتبع" : "Tracking Note"}</Label>
              <Textarea value={trackingNote} onChange={(e) => setTrackingNote(e.target.value)} placeholder={isRTL ? "وصف الحالة الحالية..." : "Describe the current status..."} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdateDialog(false)}>{t.common?.cancel || "Cancel"}</Button>
            <Button
              onClick={() => updateTracking.mutate({
                transferId: selectedTransfer.id,
                currentLocation: currentLocation || undefined,
                estimatedArrival: newEta ? new Date(newEta).getTime() : undefined,
                note: trackingNote || (isRTL ? "تحديث الحالة" : "Status update"),
              })}
              disabled={updateTracking.isPending}>
              {updateTracking.isPending ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <RefreshCw className="h-4 w-4 me-2" />}
              {isRTL ? "تحديث التتبع" : "Update Tracking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
