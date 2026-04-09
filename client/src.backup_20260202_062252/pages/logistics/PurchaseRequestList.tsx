/**
 * Purchase Request List Page
 * Lists all purchase requests with search, filter, and export capabilities
 * Uses OrganizationContext for data isolation (same pattern as Finance and HR modules)
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Download,
  Upload,
  Eye,
  Edit,
  Trash2,
  Printer,
  ArrowLeft,
  ArrowRight,
  FileText,
  Loader2,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "@/hooks/useTranslation";
import { toast } from "sonner";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  draft: "bg-gray-500",
  submitted: "bg-blue-500",
  validated_by_logistic: "bg-yellow-500",
  rejected_by_logistic: "bg-red-400",
  validated_by_finance: "bg-orange-500",
  rejected_by_finance: "bg-red-500",
  approved: "bg-green-500",
  rejected_by_pm: "bg-red-600",
};

const statusLabels: Record<string, { en: string; ar: string }> = {
  draft: { en: "Draft", ar: "مسودة" },
  submitted: { en: "Submitted", ar: "مقدم" },
  validated_by_logistic: { en: "Validated by Logistics", ar: "تم التحقق من اللوجستيات" },
  rejected_by_logistic: { en: "Rejected by Logistics", ar: "مرفوض من اللوجستيات" },
  validated_by_finance: { en: "Validated by Finance", ar: "تم التحقق من المالية" },
  rejected_by_finance: { en: "Rejected by Finance", ar: "مرفوض من المالية" },
  approved: { en: "Approved", ar: "معتمد" },
  rejected_by_pm: { en: "Rejected by PM", ar: "مرفوض من مدير المشروع" },
};

export default function PurchaseRequestList() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { isRTL, t } = useTranslation();
  const [, navigate] = useLocation();
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  // Get organizationId from context (same pattern as Finance and HR modules)
  const organizationId = currentOrganization?.id || 1;

  const { data, isLoading, refetch } = trpc.logistics.purchaseRequests.list.useQuery({
    organizationId,
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    category: categoryFilter !== "all" ? categoryFilter as any : undefined,
    limit: 50,
    offset: 0,
  });

  const deleteMutation = trpc.logistics.purchaseRequests.delete.useMutation({
    onSuccess: () => {
      toast.success(isRTL ? "تم حذف طلب الشراء" : "Purchase request deleted");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleDelete = (id: number) => {
    if (confirm(isRTL ? "هل أنت متأكد من حذف هذا الطلب؟" : "Are you sure you want to delete this request?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleExport = () => {
    toast.info(isRTL ? "جاري التصدير..." : "Exporting...");
  };

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>
      <div className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/organization/logistics">
                  {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {isRTL ? "طلبات الشراء" : "Purchase Requests"}
                </h1>
                <p className="text-muted-foreground">
                  {isRTL ? "إدارة طلبات الشراء" : "Manage purchase requisitions"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 me-2" />
                {isRTL ? "تصدير" : "Export"}
              </Button>
              <Button variant="outline">
                <Upload className="h-4 w-4 me-2" />
                {isRTL ? "استيراد" : "Import"}
              </Button>
              <Button asChild>
                <Link href="/organization/logistics/purchase-requests/new">
                  <Plus className="h-4 w-4 me-2" />
                  {isRTL ? "طلب جديد" : "New Request"}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-4">
        {/* Search and Status Filters */}
        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={isRTL ? "بحث..." : "Search..."}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="ps-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={isRTL ? "الحالة" : "Status"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? "جميع الحالات" : "All Status"}</SelectItem>
                  <SelectItem value="draft">{isRTL ? "مسودة" : "Draft"}</SelectItem>
                  <SelectItem value="submitted">{isRTL ? "مقدم" : "Submitted"}</SelectItem>
                  <SelectItem value="approved">{isRTL ? "معتمد" : "Approved"}</SelectItem>
                  <SelectItem value="rejected">{isRTL ? "مرفوض" : "Rejected"}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={isRTL ? "الفئة" : "Category"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? "جميع الفئات" : "All Categories"}</SelectItem>
                  <SelectItem value="goods">{isRTL ? "سلع" : "Goods"}</SelectItem>
                  <SelectItem value="services">{isRTL ? "خدمات" : "Services"}</SelectItem>
                  <SelectItem value="works">{isRTL ? "أعمال" : "Works"}</SelectItem>
                  <SelectItem value="consultancy">{isRTL ? "استشارات" : "Consultancy"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRTL ? "رقم الطلب" : "PR Number"}</TableHead>
                  <TableHead>{isRTL ? "المشروع" : "Project"}</TableHead>
                  <TableHead>{isRTL ? "الفئة" : "Category"}</TableHead>
                  <TableHead>{isRTL ? "مقدم الطلب" : "Requester"}</TableHead>
                  <TableHead>{isRTL ? "المبلغ" : "Amount"}</TableHead>
                  <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                  <TableHead className="text-end">{isRTL ? "الإجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : data?.items?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      {isRTL ? "لا توجد طلبات شراء" : "No purchase requests found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.items?.map((pr: any) => (
                    <TableRow key={pr.id}>
                      <TableCell className="font-medium">{pr.prNumber}</TableCell>
                      <TableCell>{pr.projectTitle || pr.projectTitleEn || "-"}</TableCell>
                      <TableCell className="capitalize">{pr.category}</TableCell>
                      <TableCell>{pr.requesterName || "-"}</TableCell>
                      <TableCell>
                        {pr.currency} {(pr.totalAmount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[pr.status] || "bg-gray-500"} text-white`}>
                          {isRTL 
                            ? statusLabels[pr.status]?.ar || pr.status 
                            : statusLabels[pr.status]?.en || pr.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {pr.prDate ? format(new Date(pr.prDate), "yyyy-MM-dd") : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/organization/logistics/purchase-requests/${pr.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/organization/logistics/purchase-requests/${pr.id}/edit`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/organization/logistics/purchase-requests/${pr.id}/print`}>
                              <Printer className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(pr.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
