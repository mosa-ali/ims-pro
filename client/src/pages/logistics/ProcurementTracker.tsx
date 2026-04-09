/**
 * Procurement Tracker Page
 * End-to-end procurement visibility
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
import { Progress } from "@/components/ui/progress";
import { Search, Download, FileText, ShoppingCart, Package, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export default function ProcurementTracker() {
 const { t } = useTranslation();
 const { user } = useAuth();
 const { isRTL } = useLanguage();
 const [, navigate] = useLocation();
 const [search, setSearch] = useState("");
 const { currentOrganization } = useOrganization();
 const organizationId = currentOrganization?.id || 1;

 const { data, isLoading } = trpc.logistics.purchaseRequests.list.useQuery({ organizationId, search: search || undefined, limit: 50, offset: 0 });

 const getProgress = (pr: any): number => {
 if (pr.status === "draft") return 10;
 if (pr.status === "pending") return 20;
 if (pr.status === "approved") return 40;
 if (pr.status === "po_generated") return 60;
 if (pr.status === "delivered") return 80;
 if (pr.status === "completed") return 100;
 return 0;
 };

 const getStatusIcon = (status: string) => {
 switch (status) {
 case "completed": return <CheckCircle className="h-4 w-4 text-green-500" />;
 case "approved": case "po_generated": return <Clock className="h-4 w-4 text-blue-500" />;
 case "rejected": return <AlertCircle className="h-4 w-4 text-red-500" />;
 default: return <Clock className="h-4 w-4 text-yellow-500" />;
 }
 };

 // Define table columns (will be reversed in RTL)
 const columns = useMemo(() => {
 const cols = [
 { key: "prNumber", label: t.logistics.prNumber, align: "start" as const },
 { key: "project", label: t.logistics.project, align: "start" as const },
 { key: "requester", label: t.logistics.requester, align: "start" as const },
 { key: "amount", label: t.logistics.amount, align: "start" as const },
 { key: "progress", label: t.logistics.progress, align: "start" as const },
 { key: "status", label: t.logistics.status, align: "start" as const },
 { key: "date", label: t.logistics.date, align: "start" as const },
 ];
 return cols;
 }, [isRTL]);

 // Render table cell content
 const renderCell = (pr: any, columnKey: string) => {
 switch (columnKey) {
 case "prNumber":
 return <TableCell className="font-medium">{pr.prNumber}</TableCell>;
 case "project":
 return <TableCell>{isRTL ? pr.projectTitleAr || pr.projectTitle : pr.projectTitle}</TableCell>;
 case "requester":
 return <TableCell>{pr.requesterName}</TableCell>;
 case "amount":
 return <TableCell>{pr.currency} {parseFloat(pr.totalAmount || "0").toLocaleString()}</TableCell>;
 case "progress":
 return (
 <TableCell>
 <div className="w-32">
 <Progress value={getProgress(pr)} className="h-2" />
 <span className="text-xs text-muted-foreground">{getProgress(pr)}%</span>
 </div>
 </TableCell>
 );
 case "status":
 return (
 <TableCell>
 <div className="flex items-center gap-2">
 {getStatusIcon(pr.status)}
 <Badge variant="outline">{pr.status}</Badge>
 </div>
 </TableCell>
 );
 case "date":
 return <TableCell>{pr.createdAt ? format(new Date(pr.createdAt), "yyyy-MM-dd") : "-"}</TableCell>;
 default:
 return <TableCell />;
 }
 };

 return (
 <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="border-b bg-card">
 <div className="container py-6">
 {/* Finance-style back button */}
 <BackButton href="/organization/logistics" label={t.logistics.backToLogistics} />
 
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold">{t.logistics.procurementTracker}</h1>
 <p className="text-muted-foreground">{t.logistics.endtoendProcurementVisibility}</p>
 </div>
 <Button variant="outline">
 <Download className="h-4 w-4 me-2" />
 {t.logistics.export}
 </Button>
 </div>
 </div>
 </div>

 <div className="container py-6">
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center gap-4">
 <FileText className="h-8 w-8 text-blue-500" />
 <div>
 <p className="text-sm text-muted-foreground">{t.logistics.purchaseRequests}</p>
 <p className="text-2xl font-bold">{data?.total || 0}</p>
 </div>
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center gap-4">
 <ShoppingCart className="h-8 w-8 text-green-500" />
 <div>
 <p className="text-sm text-muted-foreground">{t.logistics.purchaseOrders}</p>
 <p className="text-2xl font-bold">{data?.items?.filter((p: any) => p.status === "po_generated" || p.status === "delivered" || p.status === "completed").length || 0}</p>
 </div>
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center gap-4">
 <Package className="h-8 w-8 text-orange-500" />
 <div>
 <p className="text-sm text-muted-foreground">{t.logistics.inDelivery}</p>
 <p className="text-2xl font-bold">{data?.items?.filter((p: any) => p.status === "po_generated").length || 0}</p>
 </div>
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center gap-4">
 <CheckCircle className="h-8 w-8 text-emerald-500" />
 <div>
 <p className="text-sm text-muted-foreground">{t.logistics.completed}</p>
 <p className="text-2xl font-bold">{data?.items?.filter((p: any) => p.status === "completed").length || 0}</p>
 </div>
 </div>
 </CardContent>
 </Card>
 </div>

 <Card className="mb-6">
 <CardContent className="pt-4">
 <div className="relative max-w-md">
 <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
 <Input
 placeholder={t.logistics.search}
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="ps-10"
 />
 </div>
 </CardContent>
 </Card>

 <Card>
 <CardHeader>
 <CardTitle>{t.logistics.procurementTracking}</CardTitle>
 </CardHeader>
 <CardContent>
 <div>
 <Table>
 <TableHeader>
 <TableRow>
 {columns.map((col) => (
 <TableHead key={col.key} className={col.align === "end" ? "text-end" : "text-start"}>
 {col.label}
 </TableHead>
 ))}
 </TableRow>
 </TableHeader>
 <TableBody>
 {isLoading ? (
 <TableRow>
 <TableCell colSpan={7} className="text-center py-8">
 {t.logistics.loading}
 </TableCell>
 </TableRow>
 ) : !data?.items?.length ? (
 <TableRow>
 <TableCell colSpan={7} className="text-center py-8">
 <p className="text-muted-foreground">{t.logistics.noDataFound}</p>
 </TableCell>
 </TableRow>
 ) : (
 data.items.map((pr: any) => (
 <TableRow
 key={pr.id}
 className="cursor-pointer hover:bg-muted/50"
 onClick={() => navigate(`/logistics/purchase-requests/${pr.id}`)}
 >
 {columns.map((col) => (
 <React.Fragment key={col.key}>{renderCell(pr, col.key)}</React.Fragment>
 ))}
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </div>
 </CardContent>
 </Card>
 </div>
 </div>
 );
}
