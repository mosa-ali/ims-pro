/**
 * Returns List Page
 * Displays all returned items records with filtering and search
 */

import React, { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Download, Eye, Edit, RotateCcw } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";
import { PaginationControls } from "@/components/PaginationControls";

export default function ReturnsList() {
 const { t } = useTranslation();
 const { user } = useAuth();
 const { isRTL, language } = useLanguage();
 const [, navigate] = useLocation();
 const [search, setSearch] = useState("");
 const [statusFilter, setStatusFilter] = useState<string>("all");
 const [currentPage, setCurrentPage] = useState(1);
 const [pageSize, setPageSize] = useState(10);
 const { currentOrganization } = useOrganization();

 const { data: returns, isLoading } = trpc.logistics.returnedItems.list.useQuery({
 search: search || undefined,
 status: statusFilter !== "all" ? (statusFilter as any) : undefined,
 limit: 100,
 offset: 0,
 });

 const statusColors: Record<string, string> = {
 draft: "bg-gray-500",
 submitted: "bg-blue-500",
 inspected: "bg-yellow-500",
 accepted: "bg-green-500",
 rejected: "bg-red-500",
 };

 const statusLabels: Record<string, { en: string; ar: string }> = {
 draft: { en: "Draft", ar: "مسودة" },
 submitted: { en: "Submitted", ar: "مقدم" },
 inspected: { en: "Inspected", ar: "تم الفحص" },
 accepted: { en: "Accepted", ar: "مقبول" },
 rejected: { en: "Rejected", ar: "مرفوض" },
 };

 // Define table columns
 const columns = useMemo(() => {
 const cols = [
 { key: "returnNumber", label: t.logistics.returnNumber, align: "start" as const },
 { key: "returnDate", label: t.logistics.date, align: "start" as const },
 { key: "returnedBy", label: t.logistics.returnedBy, align: "start" as const },
 { key: "department", label: t.logistics.department, align: "start" as const },
 { key: "status", label: t.logistics.status, align: "start" as const },
 { key: "actions", label: t.logistics.actions, align: "center" as const },
 ];
 return cols;
 }, [isRTL]);

 // Paginate items
 const paginatedItems = useMemo(() => {
 const startIdx = (currentPage - 1) * pageSize;
 const items = returns?.items || [];
 return items.slice(startIdx, startIdx + pageSize);
 }, [returns?.items, currentPage, pageSize]);

 // Reset to page 1 when filters change
 React.useEffect(() => {
 setCurrentPage(1);
 }, [search, statusFilter]);

 const renderCell = (item: any, columnKey: string) => {
 switch (columnKey) {
 case "returnNumber":
 return <TableCell className="font-medium">{item.returnNumber}</TableCell>;
 case "returnDate":
 return <TableCell>{item.returnDate ? new Date(item.returnDate).toLocaleDateString() : "-"}</TableCell>;
 case "returnedBy":
 return <TableCell>{item.returnedBy}</TableCell>;
 case "department":
 return <TableCell>{item.department || "-"}</TableCell>;
 case "status":
 return (
 <TableCell>
 <Badge className={`${statusColors[item.status]} text-white`}>
 {isRTL ? statusLabels[item.status]?.ar : statusLabels[item.status]?.en}
 </Badge>
 </TableCell>
 );
 case "actions":
 return (
 <TableCell>
 <div className="flex justify-end gap-1">
 <Button variant="ghost" size="icon" onClick={() => navigate(`/organization/logistics/stock/returns/${item.id}`)}>
 <Eye className="h-4 w-4" />
 </Button>
 {(item.status === "draft" || item.status === "submitted") && (
 <Button variant="ghost" size="icon" onClick={() => navigate(`/organization/logistics/stock/returns/${item.id}/edit`)}>
 <Edit className="h-4 w-4" />
 </Button>
 )}
 {(item.status === "inspected" || item.status === "accepted") && (
 <Button 
 variant="ghost" 
 size="icon" 
 onClick={() => {
 const lang = language === 'ar' ? 'ar' : 'en';
 window.open(`/api/logistics/returns/${item.id}/pdf?lang=${lang}`, '_blank');
 }}
 title={t.logistics.exportPdf}
 >
 <Download className="h-4 w-4" />
 </Button>
 )}
 </div>
 </TableCell>
 );
 default:
 return <TableCell />;
 }
 };

 return (
 <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className="border-b bg-card">
 <div className="container py-6">
 {/* Back button */}
 <BackButton href="/organization/logistics/stock" label={t.logistics.backToStockManagement} />
 
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold">{t.logistics.returns}</h1>
 <p className="text-muted-foreground">{t.logistics.manageStockReturns}</p>
 </div>
 <div className="flex gap-2">
 <Button variant="outline">
 <Download className="h-4 w-4 me-2" />
 {t.logistics.export}
 </Button>
 <Button asChild>
 <Link href="/organization/logistics/stock/returns/new">
 <Plus className="h-4 w-4 me-2" />
 {t.logistics.newReturn}
 </Link>
 </Button>
 </div>
 </div>
 </div>
 </div>

 {/* Content */}
 <div className="container py-6">
 <Card>
 <CardHeader>
 <CardTitle>{t.logistics.returnRecords}</CardTitle>
 </CardHeader>
 <CardContent>
 {/* Filters */}
 <div className="flex flex-col md:flex-row gap-4 mb-6">
 <div className="relative flex-1">
 <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
 <Input
 placeholder={t.logistics.searchByReturnNumberOrReturner}
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
 <SelectItem value="inspected">{t.logistics.inspected}</SelectItem>
 <SelectItem value="accepted">{t.logistics.accepted}</SelectItem>
 <SelectItem value="rejected">{t.logistics.rejected}</SelectItem>
 </SelectContent>
 </Select>
 </div>

 {/* Table */}
 <div>
 <Table>
 <TableHeader>
 <TableRow>
 {columns.map((col) => (
 <TableHead key={col.key} className={col.align === "center" ? "text-center" : "text-start"}>
 {col.label}
 </TableHead>
 ))}
 </TableRow>
 </TableHeader>
 <TableBody>
 {isLoading ? (
 <TableRow>
 <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
 {t.logistics.loading}
 </TableCell>
 </TableRow>
 ) : paginatedItems && paginatedItems.length > 0 ? (
 paginatedItems.map((item: any) => (
 <TableRow key={item.id}>
 {columns.map((col) => (
 <React.Fragment key={col.key}>{renderCell(item, col.key)}</React.Fragment>
 ))}
 </TableRow>
 ))
 ) : (
 <TableRow>
 <TableCell colSpan={columns.length} className="text-center py-8">
 <div className="flex flex-col items-center gap-2">
 <RotateCcw className="h-12 w-12 text-muted-foreground/50" />
 <p className="text-muted-foreground">{t.logistics.noRecordsFound}</p>
 <Button asChild variant="outline" size="sm">
 <Link href="/organization/logistics/stock/returns/new">
 <Plus className="h-4 w-4 me-2" />
 {t.logistics.createFirstReturn}
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
 {returns?.items && returns.items.length > 0 && (
 <div className="mt-6">
 <PaginationControls
 currentPage={currentPage}
 pageSize={pageSize}
 totalItems={returns.items.length}
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
