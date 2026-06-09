/**
 * Goods Receipt Notes (GRN) List Page
 */

import React, { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Download, Eye, Edit, Trash2, Printer, Package } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";
import { Loader2 } from "lucide-react";

const statusColors: Record<string, string> = {
 draft: "bg-gray-500", pending_inspection: "bg-yellow-500", inspected: "bg-blue-500",
 accepted: "bg-green-500", partially_accepted: "bg-orange-500", rejected: "bg-red-500", completed: "bg-emerald-600",
};

export default function GoodsReceiptList() {
 const { t } = useTranslation();
 const { user } = useAuth();
 const { isRTL } = useLanguage();
 const [, navigate] = useLocation();
 const [search, setSearch] = useState("");
 const [statusFilter, setStatusFilter] = useState<string>("all");
 const { currentOrganization } = useOrganization();
 const organizationId = currentOrganization?.id || '';
 const generatePDF = trpc.logistics.generatePDF.useMutation();
 const [generatingPdfId, setGeneratingPdfId] = useState<number | null>(null);

 // Extract prId from URL query parameters
 const prId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('prId') ? parseInt(new URLSearchParams(window.location.search).get('prId')!) : null : null;

 const { data, isLoading, refetch } = trpc.logistics.grn.list.useQuery({
  search: search || undefined,
  status:
    statusFilter !== "all"
      ? (statusFilter as any)
      : undefined,
  limit: 50,
  offset: 0,
});

 const deleteMutation = trpc.logistics.grn.delete.useMutation({
 onSuccess: () => { toast.success(t.logistics.grnDeleted); refetch(); },
 onError: (error) => toast.error(error.message),
 });

 const handleDelete = (id: number) => {
 if (confirm(t.logistics.areYouSureYouWantTo)) deleteMutation.mutate({ id });
 };

 const handleGeneratePdf = async (grn: any) => {
  try {
    setGeneratingPdfId(grn.id);

    const result = await generatePDF.mutateAsync({
      documentType: "grn",
      documentId: Number(grn.id),
      language: isRTL ? "ar" : "en",
    });

    // Validate PDF base64 header
      if (!result?.pdf || !result.pdf.startsWith("JVBER")) {
      toast.error(
        isRTL
          ? "ملف PDF غير صالح"
          : "Invalid PDF generated"
      );

      return;
    }

    // Base64 → Blob
    const binaryString = atob(result.pdf);

    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const blob = new Blob([bytes], {
      type: "application/pdf",
    });

    const url = window.URL.createObjectURL(blob);

    window.open(url, "_blank");

    toast.success(
      isRTL
        ? "تم إنشاء ملف PDF بنجاح"
        : "PDF generated successfully"
    );

  } catch (error: any) {
    console.error("GRN PDF generation error:", error);

    toast.error(
      error?.message ||
      (isRTL
        ? "خطأ في إنشاء PDF"
        : "Error generating PDF")
    );

  } finally {
    setGeneratingPdfId(null);
  }
};

 // Define table columns (will be reversed in RTL)
 const columns = useMemo(() => {
 const cols = [
 { key: "grnNumber", label: t.logistics.grnNumber, align: "start" as const },
 { key: "poNumber", label: t.logistics.poNumber, align: "start" as const },
 { key: "supplier", label: t.logistics.supplier, align: "start" as const },
 { key: "receiptDate", label: t.logistics.receiptDate, align: "start" as const },
 { key: "status", label: t.logistics.status, align: "start" as const },
 { key: "actions", label: t.logistics.actions, align: "center" as const },
 ];
 return cols;
 }, [isRTL]);

 // Render table cell content
 const renderCell = (grn: any, columnKey: string) => {
 switch (columnKey) {
 case "grnNumber":
 return <TableCell className="font-medium">{grn.grnNumber}</TableCell>;
 case "poNumber":
 return <TableCell>{grn.poNumber || "-"}</TableCell>;
 case "supplier":
 return <TableCell>{grn.supplierName}</TableCell>;
 case "receiptDate":
 return <TableCell>{grn.receiptDate ? format(new Date(grn.receiptDate), "yyyy-MM-dd") : "-"}</TableCell>;
 case "status":
 return (
 <TableCell>
 <Badge className={`${statusColors[grn.status || "draft"]} text-white`}>{grn.status}</Badge>
 </TableCell>
 );
 case "actions":
 return (
 <TableCell>
 <div className="flex justify-end gap-1">
 <Button variant="ghost" size="icon" onClick={() => {
 const params = new URLSearchParams();
 if (prId) params.append('prId', prId.toString());
 const queryString = params.toString();
 navigate(`/organization/logistics/goods-receipts/${grn.id}${queryString ? '?' + queryString : ''}`);
 }}>
 <Eye className="h-4 w-4" />
 </Button>
 <Button variant="ghost" size="icon" onClick={() => {
 const params = new URLSearchParams();
 if (prId) params.append('prId', prId.toString());
 const queryString = params.toString();
 navigate(`/organization/logistics/goods-receipts/${grn.id}/edit${queryString ? '?' + queryString : ''}`);
 }}>
 <Edit className="h-4 w-4" />
 </Button>
 <Button
  variant="ghost"
  size="icon"
  onClick={() => handleGeneratePdf(grn)}
  disabled={generatingPdfId === grn.id}
>
  {generatingPdfId === grn.id ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    <Printer className="h-4 w-4" />
  )}
</Button>
 <Button variant="ghost" size="icon" onClick={() => handleDelete(grn.id)}>
 <Trash2 className="h-4 w-4 text-destructive" />
 </Button>
 </div>
 </TableCell>
 );
 default:
 return <TableCell />;
 }
 };

 return (
 <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="border-b bg-card">
 <div className="container py-6">
 {/* Back button to parent */}
 <BackButton href={prId ? `/organization/logistics/procurement-workspace/${prId}` : '/organization/logistics'} label={prId ? t.logistics.backToProcurementWorkspace : t.logistics.backToLogistics} />
 
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold">{t.logistics.goodsReceiptNotes}</h1>
 <p className="text-muted-foreground">{t.logistics.manageGoodsReceiptNotes}</p>
 </div>
 <div className="flex gap-2">
 <Button variant="outline">
 <Download className="h-4 w-4 me-2" />
 {t.logistics.export}
 </Button>
 <Button asChild>
 <Link href="/organization/logistics/grn/new">
 <Plus className="h-4 w-4 me-2" />
 {t.logistics.newGrn}
 </Link>
 </Button>
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
 <Input
 placeholder={t.logistics.search}
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="ps-10"
 />
 </div>
 </div>
 <Select value={statusFilter} onValueChange={setStatusFilter}>
 <SelectTrigger className="w-[180px]">
 <SelectValue placeholder={t.logistics.status} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{t.logistics.allStatus}</SelectItem>
 <SelectItem value="draft">{t.logistics.draft}</SelectItem>
 <SelectItem value="pending_inspection">{t.logistics.pendingInspection}</SelectItem>
 <SelectItem value="accepted">{t.logistics.accepted}</SelectItem>
 <SelectItem value="rejected">{t.logistics.rejected}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </CardContent>
 </Card>
 </div>

 <div className="container pb-6">
 <Card>
 <CardContent className="p-0">
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
 <TableCell colSpan={6} className="text-center py-8">
 {t.logistics.loading}
 </TableCell>
 </TableRow>
 ) : !data?.items?.length ? (
 <TableRow>
 <TableCell colSpan={6} className="text-center py-8">
 <div className="flex flex-col items-center gap-2">
 <Package className="h-12 w-12 text-muted-foreground" />
 <p className="text-muted-foreground">{t.logistics.noGrnsFound}</p>
 <Button asChild size="sm">
 <Link href="/organization/logistics/grn/new">
 <Plus className="h-4 w-4 me-2" />
 {t.logistics.createNewGrn}
 </Link>
 </Button>
 </div>
 </TableCell>
 </TableRow>
 ) : (
 data.items.map((grn) => (
 <TableRow key={grn.id}>
 {columns.map((col) => (
 <React.Fragment key={col.key}>{renderCell(grn, col.key)}</React.Fragment>
 ))}
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </div>
 </CardContent>
 </Card>
 {data && (
 <div className="mt-4 text-sm text-muted-foreground text-center">
 {`Showing ${data.items.length} of ${data.total} records`}
 </div>
 )}
 </div>
 </div>
 );
}
