/**
 * Stock Management Page
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Download, Upload, Eye, Edit, ArrowLeft, ArrowRight, Package, PackagePlus, PackageMinus, RotateCcw } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "@/hooks/useTranslation";

export default function StockManagement() {
  const { user } = useAuth();
  const { isRTL } = useTranslation();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("items");
  // Get organizationId from context (same pattern as Finance and HR modules)
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id || 1;

  const { data: stockItems, isLoading: loadingItems } = trpc.logistics.stock.listItems.useQuery({ organizationId, search: search || undefined, limit: 50, offset: 0 });
  const { data: stockRequests, isLoading: loadingRequests } = trpc.logistics.stock.listRequests.useQuery({ organizationId, limit: 50, offset: 0 });

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>
      <div className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild><Link href="/logistics">{isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}</Link></Button>
              <div><h1 className="text-2xl font-bold">{isRTL ? "إدارة المخزون" : "Stock Management"}</h1><p className="text-muted-foreground">{isRTL ? "إدارة المخزون والطلبات" : "Manage inventory and requests"}</p></div>
            </div>
            <div className="flex gap-2"><Button variant="outline"><Download className="h-4 w-4 me-2" />{isRTL ? "تصدير" : "Export"}</Button><Button variant="outline"><Upload className="h-4 w-4 me-2" />{isRTL ? "استيراد" : "Import"}</Button></div>
          </div>
        </div>
      </div>
      <div className="container py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><Package className="h-8 w-8 text-blue-500" /><div><p className="text-sm text-muted-foreground">{isRTL ? "إجمالي الأصناف" : "Total Items"}</p><p className="text-2xl font-bold">{stockItems?.total || 0}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><PackagePlus className="h-8 w-8 text-green-500" /><div><p className="text-sm text-muted-foreground">{isRTL ? "في المخزون" : "In Stock"}</p><p className="text-2xl font-bold">{stockItems?.items?.filter((i: any) => parseFloat(i.currentQuantity || "0") > 0).length || 0}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><PackageMinus className="h-8 w-8 text-red-500" /><div><p className="text-sm text-muted-foreground">{isRTL ? "منخفض المخزون" : "Low Stock"}</p><p className="text-2xl font-bold">{stockItems?.items?.filter((i: any) => parseFloat(i.currentQuantity || "0") <= parseFloat(i.minimumQuantity || "0")).length || 0}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><RotateCcw className="h-8 w-8 text-yellow-500" /><div><p className="text-sm text-muted-foreground">{isRTL ? "طلبات معلقة" : "Pending Requests"}</p><p className="text-2xl font-bold">{stockRequests?.items?.filter((r: any) => r.status === "pending").length || 0}</p></div></div></CardContent></Card>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4"><TabsTrigger value="items">{isRTL ? "أصناف المخزون" : "Stock Items"}</TabsTrigger><TabsTrigger value="requests">{isRTL ? "طلبات المخزون" : "Stock Requests"}</TabsTrigger><TabsTrigger value="issued">{isRTL ? "المصروفات" : "Issued Items"}</TabsTrigger><TabsTrigger value="returns">{isRTL ? "المرتجعات" : "Returns"}</TabsTrigger></TabsList>
          <TabsContent value="items">
            <Card>
              <CardHeader><div className="flex items-center justify-between"><CardTitle>{isRTL ? "أصناف المخزون" : "Stock Items"}</CardTitle><Button asChild><Link href="/logistics/stock/items/new"><Plus className="h-4 w-4 me-2" />{isRTL ? "صنف جديد" : "New Item"}</Link></Button></div></CardHeader>
              <CardContent>
                <div className="mb-4"><div className="relative max-w-sm"><Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder={isRTL ? "بحث..." : "Search..."} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-10" /></div></div>
                <Table>
                  <TableHeader><TableRow><TableHead>{isRTL ? "الكود" : "Code"}</TableHead><TableHead>{isRTL ? "الاسم" : "Name"}</TableHead><TableHead>{isRTL ? "الفئة" : "Category"}</TableHead><TableHead>{isRTL ? "الكمية" : "Quantity"}</TableHead><TableHead>{isRTL ? "الوحدة" : "Unit"}</TableHead><TableHead>{isRTL ? "الحالة" : "Status"}</TableHead><TableHead className="text-end">{isRTL ? "الإجراءات" : "Actions"}</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {loadingItems ? (<TableRow><TableCell colSpan={7} className="text-center py-8">{isRTL ? "جاري التحميل..." : "Loading..."}</TableCell></TableRow>
                    ) : !stockItems?.items?.length ? (<TableRow><TableCell colSpan={7} className="text-center py-8"><div className="flex flex-col items-center gap-2"><Package className="h-12 w-12 text-muted-foreground" /><p className="text-muted-foreground">{isRTL ? "لا توجد أصناف" : "No items found"}</p></div></TableCell></TableRow>
                    ) : (stockItems.items.map((item: any) => (<TableRow key={item.id}><TableCell className="font-medium">{item.itemCode}</TableCell><TableCell>{isRTL ? item.itemNameAr || item.itemName : item.itemName}</TableCell><TableCell>{item.category}</TableCell><TableCell>{item.currentQuantity}</TableCell><TableCell>{item.unitType}</TableCell><TableCell><Badge className={parseFloat(item.currentQuantity || "0") > parseFloat(item.minimumQuantity || "0") ? "bg-green-500" : "bg-red-500"}>{parseFloat(item.currentQuantity || "0") > parseFloat(item.minimumQuantity || "0") ? (isRTL ? "متوفر" : "In Stock") : (isRTL ? "منخفض" : "Low")}</Badge></TableCell><TableCell><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => navigate(`/logistics/stock/items/${item.id}`)}><Eye className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => navigate(`/logistics/stock/items/${item.id}/edit`)}><Edit className="h-4 w-4" /></Button></div></TableCell></TableRow>)))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="requests"><Card><CardHeader><div className="flex items-center justify-between"><CardTitle>{isRTL ? "طلبات المخزون" : "Stock Requests"}</CardTitle><Button asChild><Link href="/logistics/stock/requests/new"><Plus className="h-4 w-4 me-2" />{isRTL ? "طلب جديد" : "New Request"}</Link></Button></div></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>{isRTL ? "رقم الطلب" : "Request No"}</TableHead><TableHead>{isRTL ? "مقدم الطلب" : "Requester"}</TableHead><TableHead>{isRTL ? "القسم" : "Department"}</TableHead><TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead><TableHead>{isRTL ? "الحالة" : "Status"}</TableHead><TableHead className="text-end">{isRTL ? "الإجراءات" : "Actions"}</TableHead></TableRow></TableHeader><TableBody>{loadingRequests ? (<TableRow><TableCell colSpan={6} className="text-center py-8">{isRTL ? "جاري التحميل..." : "Loading..."}</TableCell></TableRow>) : !stockRequests?.items?.length ? (<TableRow><TableCell colSpan={6} className="text-center py-8"><p className="text-muted-foreground">{isRTL ? "لا توجد طلبات" : "No requests found"}</p></TableCell></TableRow>) : (stockRequests.items.map((req: any) => (<TableRow key={req.id}><TableCell className="font-medium">{req.requestNumber}</TableCell><TableCell>{req.requesterName}</TableCell><TableCell>{req.department}</TableCell><TableCell>{req.requestDate ? new Date(req.requestDate).toLocaleDateString() : "-"}</TableCell><TableCell><Badge className={req.status === "approved" ? "bg-green-500" : req.status === "pending" ? "bg-yellow-500" : "bg-gray-500"}>{req.status}</Badge></TableCell><TableCell><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => navigate(`/logistics/stock/requests/${req.id}`)}><Eye className="h-4 w-4" /></Button></div></TableCell></TableRow>)))}</TableBody></Table></CardContent></Card></TabsContent>
          <TabsContent value="issued"><Card><CardHeader><CardTitle>{isRTL ? "المصروفات" : "Issued Items"}</CardTitle></CardHeader><CardContent><p className="text-muted-foreground text-center py-8">{isRTL ? "قريباً..." : "Coming soon..."}</p></CardContent></Card></TabsContent>
          <TabsContent value="returns"><Card><CardHeader><CardTitle>{isRTL ? "المرتجعات" : "Returns"}</CardTitle></CardHeader><CardContent><p className="text-muted-foreground text-center py-8">{isRTL ? "قريباً..." : "Coming soon..."}</p></CardContent></Card></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
