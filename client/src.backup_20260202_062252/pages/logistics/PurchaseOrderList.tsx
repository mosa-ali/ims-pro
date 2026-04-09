/**
 * Purchase Order List Page
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Download, Eye, Edit, Trash2, Printer, ArrowLeft, ArrowRight, ShoppingCart } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "@/hooks/useTranslation";
import { toast } from "sonner";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  draft: "bg-gray-500", issued: "bg-blue-500", acknowledged: "bg-yellow-500", partially_delivered: "bg-orange-500",
  delivered: "bg-green-500", completed: "bg-emerald-600", cancelled: "bg-red-500",
};

export default function PurchaseOrderList() {
  const { user } = useAuth();
  const { isRTL } = useTranslation();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Get organizationId from context (same pattern as Finance and HR modules)
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id || 1;

  const { data, isLoading, refetch } = trpc.logistics.purchaseOrders.list.useQuery({
    organizationId, search: search || undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined, limit: 50, offset: 0,
  });

  const deleteMutation = trpc.logistics.purchaseOrders.delete.useMutation({
    onSuccess: () => { toast.success(isRTL ? "تم حذف أمر الشراء" : "Purchase order deleted"); refetch(); },
    onError: (error) => toast.error(error.message),
  });

  const handleDelete = (id: number) => {
    if (confirm(isRTL ? "هل أنت متأكد من حذف هذا الأمر؟" : "Are you sure you want to delete this order?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>
      <div className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild><Link href="/logistics">{isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}</Link></Button>
              <div>
                <h1 className="text-2xl font-bold">{isRTL ? "أوامر الشراء" : "Purchase Orders"}</h1>
                <p className="text-muted-foreground">{isRTL ? "إدارة أوامر الشراء" : "Manage purchase orders"}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline"><Download className="h-4 w-4 me-2" />{isRTL ? "تصدير" : "Export"}</Button>
              <Button asChild><Link href="/logistics/purchase-orders/new"><Plus className="h-4 w-4 me-2" />{isRTL ? "أمر جديد" : "New Order"}</Link></Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder={isRTL ? "بحث..." : "Search..."} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-10" />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder={isRTL ? "الحالة" : "Status"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? "جميع الحالات" : "All Status"}</SelectItem>
                  <SelectItem value="draft">{isRTL ? "مسودة" : "Draft"}</SelectItem>
                  <SelectItem value="issued">{isRTL ? "صادر" : "Issued"}</SelectItem>
                  <SelectItem value="delivered">{isRTL ? "تم التسليم" : "Delivered"}</SelectItem>
                  <SelectItem value="completed">{isRTL ? "مكتمل" : "Completed"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="container pb-6">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRTL ? "رقم الأمر" : "PO Number"}</TableHead>
                  <TableHead>{isRTL ? "المورد" : "Supplier"}</TableHead>
                  <TableHead>{isRTL ? "المبلغ" : "Amount"}</TableHead>
                  <TableHead>{isRTL ? "تاريخ الإصدار" : "Issue Date"}</TableHead>
                  <TableHead>{isRTL ? "تاريخ التسليم" : "Delivery Date"}</TableHead>
                  <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                  <TableHead className="text-end">{isRTL ? "الإجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8">{isRTL ? "جاري التحميل..." : "Loading..."}</TableCell></TableRow>
                ) : !data?.items?.length ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <ShoppingCart className="h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">{isRTL ? "لا توجد أوامر شراء" : "No purchase orders found"}</p>
                        <Button asChild size="sm"><Link href="/logistics/purchase-orders/new"><Plus className="h-4 w-4 me-2" />{isRTL ? "إنشاء أمر جديد" : "Create New Order"}</Link></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-medium">{po.poNumber}</TableCell>
                      <TableCell>{po.supplierName}</TableCell>
                      <TableCell>{po.currency || "USD"} {parseFloat(po.totalAmount || "0").toLocaleString()}</TableCell>
                      <TableCell>{po.issueDate ? format(new Date(po.issueDate), "yyyy-MM-dd") : "-"}</TableCell>
                      <TableCell>{po.deliveryDate ? format(new Date(po.deliveryDate), "yyyy-MM-dd") : "-"}</TableCell>
                      <TableCell><Badge className={`${statusColors[po.status || "draft"]} text-white`}>{po.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/logistics/purchase-orders/${po.id}`)}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/logistics/purchase-orders/${po.id}/edit`)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/logistics/purchase-orders/${po.id}/print`)}><Printer className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(po.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        {data && <div className="mt-4 text-sm text-muted-foreground text-center">{isRTL ? `عرض ${data.items.length} من ${data.total} سجل` : `Showing ${data.items.length} of ${data.total} records`}</div>}
      </div>
    </div>
  );
}
