/**
 * Stock Requests List Page
 * Follows the same design pattern as Returns/Issued Items:
 * Header (back link + title + description + action buttons) → Content Card (section title + search/filter + table + empty state)
 *
 * Data source: Real stock_requests table (zero hardcoded/mock data)
 */

import React, { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Download, Eye, Edit, Trash2, ClipboardList } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";
import { PaginationControls } from "@/components/PaginationControls";

export default function StockRequestsList() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { isRTL } = useLanguage();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: requestsData, isLoading } = trpc.logistics.stock.listRequests.useQuery({});
  const requests = requestsData?.items ?? [];
  const utils = trpc.useUtils();

  const statusColors: Record<string, string> = {
    draft: "bg-gray-500",
    submitted: "bg-blue-500",
    approved: "bg-green-500",
    rejected: "bg-red-500",
    partially_issued: "bg-yellow-500",
    issued: "bg-emerald-500",
    cancelled: "bg-slate-500",
  };

  const statusLabels: Record<string, { en: string; ar: string }> = {
    draft: { en: "Draft", ar: "مسودة" },
    submitted: { en: "Submitted", ar: "مقدم" },
    approved: { en: "Approved", ar: "موافق عليه" },
    rejected: { en: "Rejected", ar: "مرفوض" },
    partially_issued: { en: "Partially Issued", ar: "صادر جزئياً" },
    issued: { en: "Issued", ar: "صادر" },
    cancelled: { en: "Cancelled", ar: "ملغي" },
  };

  // Status summary counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { draft: 0, submitted: 0, approved: 0, rejected: 0 };
    requests.forEach((req: any) => {
      if (counts[req.status] !== undefined) counts[req.status]++;
    });
    return counts;
  }, [requests]);

  // Filter requests using real column names from stock_requests table
  const filteredRequests = useMemo(() => {
    return requests.filter((req: any) => {
      const matchesSearch = !search ||
        req.requestNumber?.toLowerCase().includes(search.toLowerCase()) ||
        req.requesterName?.toLowerCase().includes(search.toLowerCase()) ||
        req.requesterDepartment?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || req.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [requests, search, statusFilter]);

  // Paginate filtered requests
  const paginatedRequests = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredRequests.slice(startIdx, startIdx + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <BackButton href="/organization/logistics/stock" label={t.logistics.backToStockManagement} />

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{t.logistics.stockRequests}</h1>
              <p className="text-muted-foreground">{t.logistics.stockRequestsDesc || "Track stock requisitions and approval workflow"}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Download className="h-4 w-4 me-2" />
                {t.logistics.export}
              </Button>
              <Button asChild>
                <Link href="/organization/logistics/stock/requests/new">
                  <Plus className="h-4 w-4 me-2" />
                  {t.logistics.newRequest23}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-6">
        {/* Status summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className={statusFilter === "all" ? "border-primary" : "cursor-pointer hover:border-primary/50"} onClick={() => setStatusFilter("all")}>
            <CardContent className="pt-4 pb-3">
              <p className="text-sm text-muted-foreground">{t.logistics.allStatuses}</p>
              <p className="text-2xl font-bold">{requests.length}</p>
            </CardContent>
          </Card>
          <Card className={statusFilter === "draft" ? "border-primary" : "cursor-pointer hover:border-primary/50"} onClick={() => setStatusFilter("draft")}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-500" />
                <p className="text-sm text-muted-foreground">{isRTL ? "مسودة" : "Draft"}</p>
              </div>
              <p className="text-2xl font-bold">{statusCounts.draft}</p>
            </CardContent>
          </Card>
          <Card className={statusFilter === "submitted" ? "border-primary" : "cursor-pointer hover:border-primary/50"} onClick={() => setStatusFilter("submitted")}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <p className="text-sm text-muted-foreground">{isRTL ? "مقدم" : "Submitted"}</p>
              </div>
              <p className="text-2xl font-bold">{statusCounts.submitted}</p>
            </CardContent>
          </Card>
          <Card className={statusFilter === "approved" ? "border-primary" : "cursor-pointer hover:border-primary/50"} onClick={() => setStatusFilter("approved")}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <p className="text-sm text-muted-foreground">{isRTL ? "موافق عليه" : "Approved"}</p>
              </div>
              <p className="text-2xl font-bold">{statusCounts.approved}</p>
            </CardContent>
          </Card>
          <Card className={statusFilter === "rejected" ? "border-primary" : "cursor-pointer hover:border-primary/50"} onClick={() => setStatusFilter("rejected")}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <p className="text-sm text-muted-foreground">{isRTL ? "مرفوض" : "Rejected"}</p>
              </div>
              <p className="text-2xl font-bold">{statusCounts.rejected}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t.logistics.stockRequestRecords || "Request Records"}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t.logistics.searchByRequestNumberOrRequester || "Search by request number or requester..."}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ps-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder={t.logistics.allStatuses} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.logistics.allStatuses}</SelectItem>
                  <SelectItem value="draft">{t.logistics.draft}</SelectItem>
                  <SelectItem value="submitted">{t.logistics.submitted}</SelectItem>
                  <SelectItem value="approved">{t.logistics.approved}</SelectItem>
                  <SelectItem value="rejected">{t.logistics.rejected}</SelectItem>
                  <SelectItem value="partially_issued">{isRTL ? "صادر جزئياً" : "Partially Issued"}</SelectItem>
                  <SelectItem value="issued">{isRTL ? "صادر" : "Issued"}</SelectItem>
                  <SelectItem value="cancelled">{isRTL ? "ملغي" : "Cancelled"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">{t.logistics.requestNumber}</TableHead>
                    <TableHead className="text-start">{t.logistics.requestDate}</TableHead>
                    <TableHead className="text-start">{t.logistics.requestedBy}</TableHead>
                    <TableHead className="text-start">{t.logistics.department}</TableHead>
                    <TableHead className="text-start">{isRTL ? "مطلوب بحلول" : "Needed By"}</TableHead>
                    <TableHead className="text-start">{t.logistics.status}</TableHead>
                    <TableHead className="text-center">{t.logistics.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {t.logistics.loading}
                      </TableCell>
                    </TableRow>
                  ) : paginatedRequests.length > 0 ? (
                    paginatedRequests.map((item: any) => (
                      <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/organization/logistics/stock/requests/${item.id}`)}>
                        <TableCell className="font-mono text-sm">{item.requestNumber}</TableCell>
                        <TableCell>{item.requestDate ? new Date(item.requestDate).toLocaleDateString() : "-"}</TableCell>
                        <TableCell className="font-medium">{item.requesterName || "-"}</TableCell>
                        <TableCell>{item.requesterDepartment || "-"}</TableCell>
                        <TableCell>{item.neededByDate ? new Date(item.neededByDate).toLocaleDateString() : "-"}</TableCell>
                        <TableCell>
                          <Badge className={`${statusColors[item.status] || "bg-gray-500"} text-white`}>
                            {isRTL ? statusLabels[item.status]?.ar : statusLabels[item.status]?.en || item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/organization/logistics/stock/requests/${item.id}`)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {item.status === "draft" && (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => navigate(`/organization/logistics/stock/requests/${item.id}/edit`)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <ClipboardList className="h-12 w-12 text-muted-foreground/50" />
                          <p className="text-muted-foreground">{t.logistics.noRecordsFound}</p>
                          <p className="text-sm text-muted-foreground">
                            {isRTL ? "أنشئ طلب مخزون لطلب مواد من المستودع" : "Create a stock request to requisition items from the warehouse"}
                          </p>
                          <Button asChild variant="outline" size="sm">
                            <Link href="/organization/logistics/stock/requests/new">
                              <Plus className="h-4 w-4 me-2" />
                              {t.logistics.createFirstRequest || "Create First Request"}
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            {filteredRequests.length > 0 && (
              <div className="mt-6">
                <PaginationControls
                  currentPage={currentPage}
                  pageSize={pageSize}
                  totalItems={filteredRequests.length}
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
    </div>
  );
}
