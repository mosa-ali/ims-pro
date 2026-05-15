/**
 * Purchase Request List Page
 * Lists all purchase requests with search, filter, and export capabilities
 * Uses OrganizationContext for data isolation (same pattern as Finance and HR modules)
 */

import { useState, useMemo } from "react";
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
 Upload,
 Eye,
 Edit,
 Trash2,
 Printer,
 FileText,
 Loader2,
 FolderOpen,
 ChevronDown,
 RefreshCw,
} from "lucide-react";
import { UnifiedExportButton } from "@/components/exports/UnifiedExportButton";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

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

// Procurement stage colors
const stageColors: Record<string, string> = {
 all: "bg-gray-500",
 pr: "bg-green-500",
 rfq_qa: "bg-blue-500",
 tender_ba: "bg-blue-600",
 po: "bg-purple-500",
 grn_sac: "bg-teal-500",
 payable: "bg-orange-500",
 payment: "bg-indigo-500",
};

// Helper function to determine current procurement stage from stages array
function getCurrentProcurementStage(stages: any[]): string {
 if (!stages || stages.length === 0) return "pr";
 
 // Find the last completed or in_progress stage
 let currentStage = "pr";
 for (const stage of stages) {
 const stageName = stage.name.toLowerCase();
 if (stage.status === "completed" || stage.status === "in_progress") {
 if (stageName.includes("pr")) currentStage = "pr";
 else if (stageName.includes("rfq") || stageName.includes("qa")) currentStage = "rfq_qa";
 else if (stageName.includes("tender") || stageName.includes("ba")) currentStage = "tender_ba";
 else if (stageName.includes("po") || stageName.includes("contract")) currentStage = "po";
 else if (stageName.includes("grn") || stageName.includes("sac") || stageName.includes("milestone")) currentStage = "grn_sac";
 else if (stageName.includes("payable")) currentStage = "payable";
 else if (stageName.includes("payment")) currentStage = "payment";
 }
 }
 return currentStage;
}

export default function PurchaseRequestList() {
 const { t } = useTranslation();
 const { currentOrganization } = useOrganization();
 const { isRTL } = useLanguage();
 const [, navigate] = useLocation();
 
 const [search, setSearch] = useState("");
 const [statusFilter, setStatusFilter] = useState<string>("all");
 const [categoryFilter, setCategoryFilter] = useState<string>("all");
 const [stageFilter, setStageFilter] = useState<string>("all");
 const [generatingPdfId, setGeneratingPdfId] = useState<number | null>(null);
 
 // Use getMyPRs endpoint to get procurement progress data
 const { data, isLoading, refetch } = trpc.logistics.prWorkflowDashboard.getMyPRs.useQuery({
 search: search || undefined,
 status: statusFilter !== "all" ? statusFilter as any : "all",
 category: categoryFilter !== "all" ? categoryFilter as any : "all",
 limit: 100,
 offset: 0,
 });
 
 // Destructure items from paginated response
 const allItems = data?.items || [];

 // Client-side filtering by procurement stage
 const items = useMemo(() => {
 if (stageFilter === "all") return allItems;
 return allItems.filter((pr: any) => {
 const currentStage = getCurrentProcurementStage(pr.procurementStages);
 return currentStage === stageFilter;
 });
 }, [allItems, stageFilter]);

 // Calculate stage counts for badges
 const stageCounts = useMemo(() => {
 const counts: Record<string, number> = {
 all: allItems.length,
 pr: 0,
 rfq_qa: 0,
 tender_ba: 0,
 po: 0,
 grn_sac: 0,
 payable: 0,
 payment: 0,
 };
 
 allItems.forEach((pr: any) => {
 const stage = getCurrentProcurementStage(pr.procurementStages);
 counts[stage] = (counts[stage] || 0) + 1;
 });
 
 return counts;
 }, [allItems]);

 const deleteMutation = trpc.logistics.purchaseRequests.delete.useMutation({
 onSuccess: () => {
 toast.success(t.logistics.purchaseRequestDeleted);
 refetch();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const handleDelete = (id: number) => {
 if (confirm(t.logistics.areYouSureYouWantTo6)) {
 deleteMutation.mutate({ id });
 }
 };

 const importMutation = trpc.logistics.purchaseRequestExportImport.importFromExcel.useMutation({
 onSuccess: (result) => {
 if (result.success) {
 const count = result.importedPRIds?.length || 0;
 toast.success(`Successfully imported ${count} purchase requests with line items`);
 } else {
 toast.warning(`Import completed with some issues`);
 }
 refetch();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const generatePDF = trpc.logistics.generatePDF.useMutation();
 const exportTemplateMutation = trpc.logistics.purchaseRequests.exportTemplate.useMutation();
 const utils = trpc.useUtils(); 

 const handleExportTemplate = async () => {
 try {
 toast.info(t.logistics.exportingTemplate);
 const result = await exportTemplateMutation.mutateAsync();
 
 // Convert base64 to blob and download
 const binaryString = atob(result.data);
 const bytes = new Uint8Array(binaryString.length);
 for (let i = 0; i < binaryString.length; i++) {
 bytes[i] = binaryString.charCodeAt(i);
 }
 const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
 const url = URL.createObjectURL(blob);
 const a = document.createElement("a");
 a.href = url;
 a.download = result.filename;
 a.click();
 URL.revokeObjectURL(url);
 
 toast.success(t.logistics.templateExported);
 } catch (error: any) {
 console.error("Template export error:", error);
 toast.error(error.message || (t.logistics.templateExportFailed));
 }
 };

 const handleExportData = async () => {
 try {
 if (!items || items.length === 0) {
 toast.error(t.logistics.noDataToExport);
 return;
 }

 toast.info("Exporting purchase requests with line items...");

 const result =
  await utils.logistics.purchaseRequests.exportData.fetch();

 // Base64 → Blob
 const binaryString = atob(result.data);
 const bytes = new Uint8Array(binaryString.length);

 for (let i = 0; i < binaryString.length; i++) {
 bytes[i] = binaryString.charCodeAt(i);
 }

 const blob = new Blob(
 [bytes],
 {
 type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
 }
 );

 const url = URL.createObjectURL(blob);

 const a = document.createElement("a");
 a.href = url;
 a.download = result.filename;
 a.click();
 setTimeout(() => {
  URL.revokeObjectURL(url);
}, 1000);
 URL.revokeObjectURL(url);

 toast.success(
  "Purchase requests exported successfully"
);
 } catch (error: any) {
 console.error("Export error:", error);
 toast.error(error.message || (t.logistics.exportFailed));
 }
 }

 const handleImport = () => {
  const input = document.createElement("input");

  input.type = "file";
  input.accept = ".xlsx,.xls";

  input.onchange = async (e: any) => {
    const file = e.target?.files?.[0];

    if (!file) return;

    // File type validation
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];

    if (!allowed.includes(file.type)) {
      toast.error(
        isRTL
          ? "ملف Excel غير صالح"
          : "Invalid Excel file"
      );

      return;
    }

    // File size validation (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error(
        isRTL
          ? "حجم الملف يتجاوز 10MB"
          : "File exceeds 10MB limit"
      );

      return;
    }

    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const base64 = event.target?.result as string;

        const base64Data = base64.split(",")[1];

        toast.info(
          isRTL
            ? "جاري استيراد البيانات..."
            : "Importing purchase requests..."
        );

        await importMutation.mutateAsync({
          fileData: base64Data,
        });

      } catch (error: any) {
        console.error("Import error:", error);

        toast.error(
          error.message ||
          (isRTL
            ? "فشل استيراد الملف"
            : "Import failed")
        );
      }
    };

    reader.readAsDataURL(file);
  };

  input.click();
};

 const handleGeneratePdf = async (pr: any) => {
  try {
    setGeneratingPdfId(pr.id);

    const result = await generatePDF.mutateAsync({
      documentType: "purchaseRequest",
      documentId: Number(pr.id),
      language: isRTL ? "ar" : "en",
    });

    if (!result?.pdf || !result.pdf.startsWith("JVBER")) {
      toast.error(
        isRTL
          ? "ملف PDF غير صالح"
          : "Invalid PDF generated"
      );

      return;
    }

    // Convert base64 → Blob
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
    console.error("PDF generation error:", error);

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

 return (
 <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className="border-b bg-card">
 <div className="container py-4">
 <BackButton href="/organization/logistics" label={t.logistics.backToLogistics} />
 
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-foreground">
 {t.logistics.purchaseRequests}
 </h1>
 <p className="text-muted-foreground">
 {t.logistics.managePurchaseRequisitions}
 </p>
 </div>
 <div className="flex gap-2">
 <Button
 variant="outline"
 size="icon"
 onClick={() => {
 refetch();
 toast.success(t.logistics.dataRefreshed);
 }}
 disabled={isLoading}
 >
 <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
 </Button>
 <UnifiedExportButton
 hasData={items.length > 0}
 onExportData={handleExportData}
 onExportTemplate={handleExportTemplate}
 moduleName={t.logistics.purchaseRequests}
 showModal={true}
 />
 <Button variant="outline" onClick={handleImport}>
 <Upload className="h-4 w-4 me-2" />
 {t.logistics.import}
 </Button>
 <Button asChild>
 <Link href="/organization/logistics/purchase-requests/new">
 <Plus className="h-4 w-4 me-2" />
 {t.logistics.newRequest}
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
 <div className="flex flex-wrap gap-4 mb-4">
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
 <SelectItem value="submitted">{t.logistics.submitted}</SelectItem>
 <SelectItem value="approved">{t.logistics.approved7}</SelectItem>
 <SelectItem value="rejected">{t.logistics.rejected}</SelectItem>
 </SelectContent>
 </Select>
 <Select value={categoryFilter} onValueChange={setCategoryFilter}>
 <SelectTrigger className="w-[180px]">
 <SelectValue placeholder={t.logistics.category} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{t.logistics.allCategories}</SelectItem>
 <SelectItem value="goods">{t.logistics.goods}</SelectItem>
 <SelectItem value="services">{t.logistics.services}</SelectItem>
 <SelectItem value="works">{t.logistics.works}</SelectItem>
 </SelectContent>
 </Select>
 </div>

 {/* Procurement Stage Filter Badges */}
 <div className="flex flex-wrap gap-2">
 <Badge
 variant={stageFilter === "all" ? "default" : "outline"}
 className={`cursor-pointer ${stageFilter === "all" ? stageColors.all : ""}`}
 onClick={() => setStageFilter("all")}
 >
 {t.logistics.allStages} ({stageCounts.all})
 </Badge>
 <Badge
 variant={stageFilter === "pr" ? "default" : "outline"}
 className={`cursor-pointer ${stageFilter === "pr" ? stageColors.pr : ""}`}
 onClick={() => setStageFilter("pr")}
 >
 {t.logistics.pr} ({stageCounts.pr})
 </Badge>
 <Badge
 variant={stageFilter === "rfq_qa" ? "default" : "outline"}
 className={`cursor-pointer ${stageFilter === "rfq_qa" ? stageColors.rfq_qa : ""}`}
 onClick={() => setStageFilter("rfq_qa")}
 >
 {t.logistics.rfqqa} ({stageCounts.rfq_qa})
 </Badge>
 <Badge
 variant={stageFilter === "po" ? "default" : "outline"}
 className={`cursor-pointer ${stageFilter === "po" ? stageColors.po : ""}`}
 onClick={() => setStageFilter("po")}
 >
 {t.logistics.po} ({stageCounts.po})
 </Badge>
 <Badge
 variant={stageFilter === "grn_sac" ? "default" : "outline"}
 className={`cursor-pointer ${stageFilter === "grn_sac" ? stageColors.grn_sac : ""}`}
 onClick={() => setStageFilter("grn_sac")}
 >
 {t.logistics.grnsac} ({stageCounts.grn_sac})
 </Badge>
 <Badge
 variant={stageFilter === "payable" ? "default" : "outline"}
 className={`cursor-pointer ${stageFilter === "payable" ? stageColors.payable : ""}`}
 onClick={() => setStageFilter("payable")}
 >
 {t.logistics.payable} ({stageCounts.payable})
 </Badge>
 <Badge
 variant={stageFilter === "payment" ? "default" : "outline"}
 className={`cursor-pointer ${stageFilter === "payment" ? stageColors.payment : ""}`}
 onClick={() => setStageFilter("payment")}
 >
 {t.logistics.payment} ({stageCounts.payment})
 </Badge>
 </div>
 </CardContent>
 </Card>

 {/* Data Table */}
 <Card>
 <CardContent className="p-0">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.logistics.prNumber}</TableHead>
 <TableHead>{t.logistics.project}</TableHead>
 <TableHead>{t.logistics.category}</TableHead>
 <TableHead>{t.logistics.requester}</TableHead>
 <TableHead>{t.logistics.amount}</TableHead>
 <TableHead>{t.logistics.status}</TableHead>
 <TableHead>{t.logistics.date}</TableHead>
 <TableHead className="text-center">{t.logistics.actions}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {isLoading ? (
 <TableRow>
 <TableCell colSpan={8} className="text-center py-8">
 <Loader2 className="h-6 w-6 animate-spin mx-auto" />
 </TableCell>
 </TableRow>
 ) : items.length === 0 ? (
 <TableRow>
 <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
 <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
 {t.logistics.noPurchaseRequestsFound}
 </TableCell>
 </TableRow>
 ) : (
 items.map((pr: any) => (
 <TableRow key={pr.id}>
 <TableCell className="font-medium">{pr.prNumber}</TableCell>
 <TableCell>{pr.projectTitle || "-"}</TableCell>
 <TableCell>
 <Badge variant="outline">
 {pr.category === 'services' ? 'Services' : pr.category.charAt(0).toUpperCase() + pr.category.slice(1)}
 </Badge>
 {pr.category === 'services' && (pr as any).serviceType && (
 <span className="text-xs text-muted-foreground block mt-0.5">
 {((pr as any).serviceType === 'it_services' ? 'IT Services' : (pr as any).serviceType === 'other' ? (pr as any).serviceTypeOther || 'Other' : (pr as any).serviceType?.charAt(0).toUpperCase() + (pr as any).serviceType?.slice(1)) || ''}
 </span>
 )}
 </TableCell>
 <TableCell>{pr.requesterName || "-"}</TableCell>
 <TableCell>
 USD {pr.totalAmount?.toLocaleString() || "0"}
 </TableCell>
 <TableCell>
 <Badge className={statusColors[pr.status] || "bg-gray-500"}>
 {isRTL ? statusLabels[pr.status]?.ar : statusLabels[pr.status]?.en}
 </Badge>
 </TableCell>
 <TableCell>
 {pr.prDate ? format(new Date(pr.prDate), "yyyy-MM-dd") : "-"}
 </TableCell>
 <TableCell>
 <div className="flex items-center justify-center gap-2">
 <Button
 variant="ghost"
 size="icon"
 asChild
 >
 <Link href={`/organization/logistics/purchase-requests/${pr.id}`}>
 <Eye className="h-4 w-4" />
 </Link>
 </Button>
 <Button
 variant="ghost"
 size="icon"
 asChild
 >
 <Link href={`/organization/logistics/procurement-workspace/${pr.id}`}>
 <FolderOpen className="h-4 w-4" />
 </Link>
 </Button>
 <Button
  variant="ghost"
  size="icon"
  onClick={() => handleGeneratePdf(pr)}
  disabled={generatingPdfId === pr.id}
>
  {generatingPdfId === pr.id ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    <Printer className="h-4 w-4" />
  )}
</Button>
 <Button
 variant="ghost"
 size="icon"
 asChild
 >
 <Link href={`/organization/logistics/purchase-requests/${pr.id}/edit`}>
 <Edit className="h-4 w-4" />
 </Link>
 </Button>
 <Button
 variant="ghost"
 size="icon"
 onClick={() => handleDelete(pr.id)}
 >
 <Trash2 className="h-4 w-4 text-destructive" />
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
