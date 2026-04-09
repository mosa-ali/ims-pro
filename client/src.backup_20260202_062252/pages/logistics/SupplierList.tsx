/**
 * Supplier List Page
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
import { Plus, Search, Download, Upload, Eye, Edit, Trash2, ArrowLeft, ArrowRight, Users } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "@/hooks/useTranslation";
import { toast } from "sonner";

const statusColors: Record<string, string> = { active: "bg-green-500", inactive: "bg-gray-500", suspended: "bg-red-500", pending: "bg-yellow-500" };

export default function SupplierList() {
  const { user } = useAuth();
  const { isRTL } = useTranslation();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Get organizationId from context (same pattern as Finance and HR modules)
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id || 1;

  const { data, isLoading, refetch } = trpc.logistics.suppliers.list.useQuery({
    organizationId,
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    limit: 50,
    offset: 0,
  });

  const deleteMutation = trpc.logistics.suppliers.delete.useMutation({
    onSuccess: () => { toast.success(isRTL ? "تم حذف المورد" : "Supplier deleted"); refetch(); },
    onError: (error) => toast.error(error.message),
  });

  const handleDelete = (id: number) => {
    if (confirm(isRTL ? "هل أنت متأكد من حذف هذا المورد؟" : "Are you sure you want to delete this supplier?")) {
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
                <h1 className="text-2xl font-bold text-foreground">{isRTL ? "الموردون" : "Suppliers"}</h1>
                <p className="text-muted-foreground">{isRTL ? "إدارة سجل الموردين" : "Manage supplier registry"}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline"><Download className="h-4 w-4 me-2" />{isRTL ? "تصدير" : "Export"}</Button>
              <Button variant="outline"><Upload className="h-4 w-4 me-2" />{isRTL ? "استيراد" : "Import"}</Button>
              <Button asChild><Link href="/logistics/suppliers/new"><Plus className="h-4 w-4 me-2" />{isRTL ? "مورد جديد" : "New Supplier"}</Link></Button>
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
                  <SelectItem value="active">{isRTL ? "نشط" : "Active"}</SelectItem>
                  <SelectItem value="inactive">{isRTL ? "غير نشط" : "Inactive"}</SelectItem>
                  <SelectItem value="suspended">{isRTL ? "معلق" : "Suspended"}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder={isRTL ? "الفئة" : "Category"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? "جميع الفئات" : "All Categories"}</SelectItem>
                  <SelectItem value="goods">{isRTL ? "سلع" : "Goods"}</SelectItem>
                  <SelectItem value="services">{isRTL ? "خدمات" : "Services"}</SelectItem>
                  <SelectItem value="works">{isRTL ? "أعمال" : "Works"}</SelectItem>
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
                  <TableHead>{isRTL ? "رمز المورد" : "Supplier Code"}</TableHead>
                  <TableHead>{isRTL ? "الاسم" : "Name"}</TableHead>
                  <TableHead>{isRTL ? "الفئة" : "Category"}</TableHead>
                  <TableHead>{isRTL ? "البريد الإلكتروني" : "Email"}</TableHead>
                  <TableHead>{isRTL ? "الهاتف" : "Phone"}</TableHead>
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
                        <Users className="h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">{isRTL ? "لا يوجد موردون" : "No suppliers found"}</p>
                        <Button asChild size="sm"><Link href="/logistics/suppliers/new"><Plus className="h-4 w-4 me-2" />{isRTL ? "إضافة مورد" : "Add Supplier"}</Link></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">{supplier.supplierCode}</TableCell>
                      <TableCell>{isRTL ? supplier.legalNameAr || supplier.legalName : supplier.legalName}</TableCell>
                      <TableCell className="capitalize">{supplier.tradeName || '-'}</TableCell>
                      <TableCell>{supplier.email}</TableCell>
                      <TableCell>{supplier.phone}</TableCell>
                      <TableCell><Badge className={`${statusColors[supplier.status || "active"]} text-white`}>{supplier.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/logistics/suppliers/${supplier.id}`)}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/logistics/suppliers/${supplier.id}/edit`)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(supplier.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
