/**
 * Issued Items List Page
 * Displays all stock issued records with filtering and search
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
import { Plus, Search, Download, Eye, Edit, FileText } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";
import { PaginationControls } from "@/components/PaginationControls";

export default function IssuedItemsList() {
 const { t } = useTranslation();
 const { user } = useAuth();
 const { isRTL, language } = useLanguage();
 const [, navigate] = useLocation();
 const [search, setSearch] = useState("");
 const [statusFilter, setStatusFilter] = useState<string>("all");
 const [currentPage, setCurrentPage] = useState(1);
 const [pageSize, setPageSize] = useState(10);
 const { currentOrganization } = useOrganization();
 const organizationId = currentOrganization?.id || 1;

 const { data: issuedItems, isLoading } = trpc.logistics.stockIssued.list.useQuery({
 search: search || undefined,
 status: statusFilter !== "all" ? (statusFilter as any) : undefined,
 limit: 100,
 offset: 0,
 });

 const statusColors: Record<string, string> = {
 draft: "bg-gray-500",
 issued: "bg-blue-500",
 acknowledged: "bg-green-500",
 cancelled: "bg-red-500",
 };

 const statusLabels: Record<string, { en: string; ar: string }> = {
 draft: { en: "Draft", ar: "مسودة" },
 issued: { en: "Issued", ar: "صادر" },
 acknowledged: { en: "Acknowledged", ar: "مستلم" },
 cancelled: { en: "Cancelled", ar: "ملغي" },
 };

 // Define table columns
 const columns = useMemo(() => {
 const cols = [
 { key: "issueNumber", label: t.logistics.issueNumber, align: "start" as const },
 { key: "issueDate", label: t.logistics.date, align: "start" as const },
 { key: "issuedTo", label: t.logistics.issuedTo, align: "start" as const },
 { key: "department", label: t.logistics.department, align: "start" as const },
 { key: "status", label: t.logistics.status, align: "start" as const },
 { key: "actions", label: t.logistics.actions, align: "center" as const },
 ];
 return cols;
 }, [isRTL]);

 // Paginate items
 const paginatedItems = useMemo(() => {
 const startIdx = (currentPage - 1) * pageSize;
 const items = issuedItems?.items || [];
 return items.slice(startIdx, startIdx + pageSize);
 }, [issuedItems?.items, currentPage, pageSize]);

 // Reset to page 1 when filters change
 React.useEffect(() => {
 setCurrentPage(1);
 }, [search, statusFilter]);

 const renderCell = (item: any, columnKey: string) => {
 switch (columnKey) {
 case "issueNumber":
 return <TableCell className="font-medium">{item.issueNumber}</TableCell>;
 case "issueDate":
 return <TableCell>{item.issueDate ? new Date(item.issueDate).toLocaleDateString() : "-"}</TableCell>;
 case "issuedTo":
 return <TableCell>{item.issuedTo}</TableCell>;
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
 <Button variant="ghost" size="icon" onClick={() => navigate(`/organization/logistics/stock/issued/${item.id}`)}>
 <Eye className="h-4 w-4" />
 </Button>
 {item.status === "draft" && (
 <Button variant="ghost" size="icon" onClick={() => navigate(`/organization/logistics/stock/issued/${item.id}/edit`)}>
 <Edit className="h-4 w-4" />
 </Button>
 )}
 {(item.status === "issued" || item.status === "acknowledged") && (
 <Button 
 variant="ghost" 
 size="icon" 
 onClick={() => {
 const lang = language === 'ar' ? 'ar' : 'en';
 window.open(`/api/logistics/issued/${item.id}/pdf?lang=${lang}`, '_blank');
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
 <h1 className="text-2xl font-bold">{t.logistics.issuedItems}</h1>
 <p className="text-muted-foreground">{t.logistics.manageStockIssuedRecords}</p>
 </div>
 <div className="flex gap-2">
 <Button variant="outline">
 <Download className="h-4 w-4 me-2" />
 {t.logistics.export}
 </Button>
 <Button asChild>
 <Link href="/organization/logistics/stock/issued/new">
 <Plus className="h-4 w-4 me-2" />
 {t.logistics.newIssue}
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
 <CardTitle>{t.logistics.issuedRecords}</CardTitle>
 </CardHeader>
 <CardContent>
 {/* Filters */}
 <div className="flex flex-col md:flex-row gap-4 mb-6">
 <div className="relative flex-1">
 <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
 <Input
 placeholder={t.logistics.searchByIssueNumberOrRecipient}
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
 <SelectItem value="issued">{t.logistics.issued}</SelectItem>
 <SelectItem value="acknowledged">{t.logistics.acknowledged}</SelectItem>
 <SelectItem value="cancelled">{t.logistics.cancelled}</SelectItem>
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
 <FileText className="h-12 w-12 text-muted-foreground/50" />
 <p className="text-muted-foreground">{t.logistics.noRecordsFound}</p>
 <Button asChild variant="outline" size="sm">
 <Link href="/organization/logistics/stock/issued/new">
 <Plus className="h-4 w-4 me-2" />
 {t.logistics.createFirstIssue}
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
 {issuedItems?.items && issuedItems.items.length > 0 && (
 <div className="mt-6">
 <PaginationControls
 currentPage={currentPage}
 pageSize={pageSize}
 totalItems={issuedItems.items.length}
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
