/**
 * Procurement Tracker Page
 * End-to-end procurement visibility
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Search, Download, ArrowLeft, ArrowRight, FileText, ShoppingCart, Package, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "@/hooks/useTranslation";
import { format } from "date-fns";

export default function ProcurementTracker() {
  const { user } = useAuth();
  const { isRTL } = useTranslation();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  // Get organizationId from context (same pattern as Finance and HR modules)
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

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>
      <div className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild><Link href="/logistics">{isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}</Link></Button>
              <div><h1 className="text-2xl font-bold">{isRTL ? "متتبع المشتريات" : "Procurement Tracker"}</h1><p className="text-muted-foreground">{isRTL ? "رؤية شاملة لعمليات الشراء" : "End-to-end procurement visibility"}</p></div>
            </div>
            <Button variant="outline"><Download className="h-4 w-4 me-2" />{isRTL ? "تصدير" : "Export"}</Button>
          </div>
        </div>
      </div>
      <div className="container py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><FileText className="h-8 w-8 text-blue-500" /><div><p className="text-sm text-muted-foreground">{isRTL ? "طلبات الشراء" : "Purchase Requests"}</p><p className="text-2xl font-bold">{data?.total || 0}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><ShoppingCart className="h-8 w-8 text-green-500" /><div><p className="text-sm text-muted-foreground">{isRTL ? "أوامر الشراء" : "Purchase Orders"}</p><p className="text-2xl font-bold">{data?.items?.filter((p: any) => p.status === "po_generated" || p.status === "delivered" || p.status === "completed").length || 0}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><Package className="h-8 w-8 text-orange-500" /><div><p className="text-sm text-muted-foreground">{isRTL ? "قيد التسليم" : "In Delivery"}</p><p className="text-2xl font-bold">{data?.items?.filter((p: any) => p.status === "po_generated").length || 0}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><CheckCircle className="h-8 w-8 text-emerald-500" /><div><p className="text-sm text-muted-foreground">{isRTL ? "مكتمل" : "Completed"}</p><p className="text-2xl font-bold">{data?.items?.filter((p: any) => p.status === "completed").length || 0}</p></div></div></CardContent></Card>
        </div>
        <Card className="mb-6"><CardContent className="pt-4"><div className="relative max-w-md"><Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder={isRTL ? "بحث..." : "Search..."} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-10" /></div></CardContent></Card>
        <Card>
          <CardHeader><CardTitle>{isRTL ? "تتبع المشتريات" : "Procurement Tracking"}</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>{isRTL ? "رقم الطلب" : "PR Number"}</TableHead><TableHead>{isRTL ? "المشروع" : "Project"}</TableHead><TableHead>{isRTL ? "مقدم الطلب" : "Requester"}</TableHead><TableHead>{isRTL ? "المبلغ" : "Amount"}</TableHead><TableHead>{isRTL ? "التقدم" : "Progress"}</TableHead><TableHead>{isRTL ? "الحالة" : "Status"}</TableHead><TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead></TableRow></TableHeader>
              <TableBody>
                {isLoading ? (<TableRow><TableCell colSpan={7} className="text-center py-8">{isRTL ? "جاري التحميل..." : "Loading..."}</TableCell></TableRow>
                ) : !data?.items?.length ? (<TableRow><TableCell colSpan={7} className="text-center py-8"><p className="text-muted-foreground">{isRTL ? "لا توجد بيانات" : "No data found"}</p></TableCell></TableRow>
                ) : (data.items.map((pr: any) => (<TableRow key={pr.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/logistics/purchase-requests/${pr.id}`)}><TableCell className="font-medium">{pr.prNumber}</TableCell><TableCell>{isRTL ? pr.projectTitleAr || pr.projectTitle : pr.projectTitle}</TableCell><TableCell>{pr.requesterName}</TableCell><TableCell>{pr.currency} {parseFloat(pr.totalAmount || "0").toLocaleString()}</TableCell><TableCell><div className="w-32"><Progress value={getProgress(pr)} className="h-2" /><span className="text-xs text-muted-foreground">{getProgress(pr)}%</span></div></TableCell><TableCell><div className="flex items-center gap-2">{getStatusIcon(pr.status)}<Badge variant="outline">{pr.status}</Badge></div></TableCell><TableCell>{pr.createdAt ? format(new Date(pr.createdAt), "yyyy-MM-dd") : "-"}</TableCell></TableRow>)))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
