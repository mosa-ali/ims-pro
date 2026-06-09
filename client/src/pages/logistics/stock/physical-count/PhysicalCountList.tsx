import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocation } from "wouter";
import { Plus, Search, Eye, ClipboardCheck, Package, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/i18n/useTranslation";
import { BackButton } from "@/components/BackButton";
import { PaginationControls } from "@/components/PaginationControls";
import React from "react";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-300",
  in_progress: "bg-blue-100 text-blue-700 border-blue-300",
  reviewed: "bg-orange-100 text-orange-700 border-orange-300",
  adjustments_generated: "bg-purple-100 text-purple-700 border-purple-300",
  completed: "bg-green-100 text-green-700 border-green-300",
  cancelled: "bg-red-100 text-red-700 border-red-300",
};

export default function PhysicalCountList() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const statusLabels: Record<string, string> = {
    draft: isRTL ? "مسودة" : "Draft",
    in_progress: isRTL ? "قيد التنفيذ" : "In Progress",
    reviewed: isRTL ? "تمت المراجعة" : "Reviewed",
    adjustments_generated: isRTL ? "تم إنشاء التسويات" : "Adj. Generated",
    completed: isRTL ? "مكتمل" : "Completed",
    cancelled: isRTL ? "ملغي" : "Cancelled",
  };

  const { data: sessions, isLoading } = trpc.logistics.stockMgmt.physicalCount.list.useQuery({
    status: statusFilter || undefined,
    search: search || undefined,
  });

  // Pagination logic
  const allSessions = sessions || [];
  const paginatedSessions = React.useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return allSessions.slice(startIdx, startIdx + pageSize);
  }, [allSessions, currentPage, pageSize]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <BackButton href="/organization/logistics/stock" label={t.logistics?.stockManagement || "Back to Stock Management"} />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{t.logistics?.physicalCount || "Physical Count Reconciliation"}</h1>
          <p className="text-sm text-muted-foreground">{t.logistics?.physicalCountDesc || "Upload count sheets, compare with system quantities, generate adjustments"}</p>
        </div>
        <Button onClick={() => setLocation("/organization/logistics/stock/physical-count/new")}>
          <Plus className="h-4 w-4 me-2" /> {isRTL ? "جلسة جرد جديدة" : "New Count Session"}
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={isRTL ? "بحث في الجلسات..." : "Search sessions..."} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder={isRTL ? "جميع الحالات" : "All Statuses"} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isRTL ? "جميع الحالات" : "All Statuses"}</SelectItem>
            <SelectItem value="draft">{statusLabels.draft}</SelectItem>
            <SelectItem value="in_progress">{statusLabels.in_progress}</SelectItem>
            <SelectItem value="reviewed">{statusLabels.reviewed}</SelectItem>
            <SelectItem value="adjustments_generated">{statusLabels.adjustments_generated}</SelectItem>
            <SelectItem value="completed">{statusLabels.completed}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" /> {isRTL ? "جلسات الجرد" : "Count Sessions"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">{isRTL ? "جاري التحميل..." : "Loading sessions..."}</div>
          ) : !allSessions || allSessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium">{isRTL ? "لا توجد جلسات جرد بعد" : "No count sessions yet"}</p>
              <p className="text-sm mt-1">{isRTL ? "أنشئ جلسة جديدة لبدء الجرد الفعلي" : "Create a new session to start a physical count"}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground" style={{ textAlign: isRTL ? "right" : "left" }}>
                    <th className="py-3 px-3 font-medium">{isRTL ? "رقم الجلسة" : "Session #"}</th>
                    <th className="py-3 px-3 font-medium">{t.logistics?.warehouse || "Warehouse"}</th>
                    <th className="py-3 px-3 font-medium">{isRTL ? "تاريخ الجرد" : "Count Date"}</th>
                    <th className="py-3 px-3 font-medium">{isRTL ? "بواسطة" : "Counted By"}</th>
                    <th className="py-3 px-3 font-medium text-center">{isRTL ? "الأصناف" : "Items"}</th>
                    <th className="py-3 px-3 font-medium text-center">{isRTL ? "الفروقات" : "Discrepancies"}</th>
                    <th className="py-3 px-3 font-medium text-center">{t.logistics?.status || "Status"}</th>
                    <th className="py-3 px-3 font-medium text-center">{t.common?.actions || "Actions"}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSessions.map((session: any) => (
                    <tr key={session.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-3 font-mono text-xs">{session.sessionNumber}</td>
                      <td className="py-3 px-3">{session.warehouse || "—"}</td>
                      <td className="py-3 px-3">{session.countDate ? new Date(session.countDate).toLocaleDateString() : "—"}</td>
                      <td className="py-3 px-3">{session.countedBy || "—"}</td>
                      <td className="py-3 px-3 text-center">{session.totalItems || 0}</td>
                      <td className="py-3 px-3 text-center">
                        {(session.discrepancyCount || 0) > 0 ? (
                          <span className="flex items-center justify-center gap-1 text-amber-600">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {session.discrepancyCount}
                            {session.surplusCount > 0 && <span className="text-green-600 text-xs ms-1">+{session.surplusCount}</span>}
                            {session.shortageCount > 0 && <span className="text-red-600 text-xs ms-1">-{session.shortageCount}</span>}
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge variant="outline" className={statusColors[session.status] || ""}>{statusLabels[session.status] || session.status}</Badge>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLocation(`/organization/logistics/stock/physical-count/${session.id}`)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{isRTL ? "عرض التفاصيل" : "View Details"}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {allSessions.length > 0 && (
        <div>
          <PaginationControls
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={allSessions.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        </div>
      )}
    </div>
  );
}
